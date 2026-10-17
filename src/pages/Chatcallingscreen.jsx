import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../services/liveFirebase';
import {
  callInitiate,
  callInitiateStatus,
  callStatusUpdate,
  buildKundliString,
  generateChannelId,
} from '../services/liveService';

/**
 * ChatCallingScreen
 *
 * Step 2 of the handshake. Receives astrologer + intake details via router
 * state, fires call_initiate, then watches for acceptance through TWO
 * channels at once:
 *   1) REST polling of call_initiate_status every 400ms (original path)
 *   2) A Firebase listener on CallSession/{channelId} (same node
 *      ChatContext already reads for billing), in case the backend
 *      flips status there before/instead of the REST endpoint.
 * Whichever one sees acceptance first wins — both funnel into the same
 * handleAccepted() so we never double-navigate.
 *
 * Every OTHER exit path — Cancel button, 60s auto-timeout, and a
 * reject_astro response — now funnels into goToAstrologerDetails(), so
 * they all land back on /astrologer/:id consistently.
 *
 * Route: /consultation/calling/:id   (state carries everything below)
 */

const RING_TIMEOUT = 60; // seconds to wait before auto-cancel

// API still returns some image URLs hosted on the old domain — rewrite to the current one.
const fixImgHost = (url) =>
  typeof url === 'string' ? url.replace('admin.astrogurujii.com', 'admin.vaidikguru.com') : url;

// Literal Firebase path — see ChatContext.jsx / ChatConsultation.jsx for why
// this bypasses the Liveconfig helper and matches the known-working reference.
const sessionPath = (channelId) => `CallSession/${channelId}`;

// Pulls a status string out of whatever shape the API/Firebase happens
// to use. Broadened on purpose — if the exact field name was the bug,
// this covers the common variants instead of guessing one and failing
// silently again.
const extractStatus = (res) =>
  res?.results?.status ??
  res?.status ??
  res?.data?.status ??
  res?.result?.status ??
  null;

// Treat any of these as "the astrologer accepted" — some backends use
// 'accept_astro', others 'accepted', 'ongoing', etc.
const ACCEPTED_VALUES = ['accept_astro', 'accepted', 'ongoing', 'active'];
const REJECTED_VALUES = ['reject_astro', 'rejected'];
const ENDED_VALUES = ['end_user', 'disconnect_user', 'end_astro'];

const ChatCallingScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const s = location.state || {};
  const callType = s.callType === 'call' ? 'audio' : s.callType || 'chat'; // 'chat' | 'audio'
  const astrologerId = String(s.astrologer_id || id || '');
  const astroName = s.name || s.astroName || 'Astrologer';
  const astrologerImage = fixImgHost(s.profile_img || s.astrologerImage || '');
  const rate = String(s.rate || '5');
  const wallet = String(s.wallet || '0');
  const intake = s.intake || {}; // { name, gender, dob, tob, place }

  const [status, setStatus] = useState('connecting'); // connecting | accepted | rejected
  const [statusMessage, setStatusMessage] = useState(''); // optional backend-provided message (e.g. "Astrologer is busy")
  const [countdown, setCountdown] = useState(RING_TIMEOUT);
  const initiatedRef = useRef(false);
  // channelIdRef holds the *client-generated* id we send as fb_channel_id.
  // Once callInitiate responds, we swap this ref to the *server-returned*
  // channel_id, since that's the id callInitiateStatus/callStatusUpdate
  // actually require.
  const channelIdRef = useRef(s.channelId || generateChannelId());
  const pollRef = useRef(null);
  const countdownRef = useRef(null);
  const firebaseUnsubRef = useRef(null);
  const doneRef = useRef(false);
  const navRef = useRef(navigate);
  const agoraTokenRef = useRef('');
  useEffect(() => { navRef.current = navigate; }, [navigate]);

  // ── Single source of truth for "go back to astrologer details" ──
  // Cancel, timeout (which calls cancel()), reject_astro, and a
  // call_initiate-level rejection all route through here now, so there's
  // exactly one place that decides where "back" means.
  const goToAstrologerDetails = useCallback(() => {
    navRef.current(`/astrologer/${astrologerId}`, { replace: true });
  }, [astrologerId]);

  const stopAll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    if (firebaseUnsubRef.current) { firebaseUnsubRef.current(); firebaseUnsubRef.current = null; }
  }, []);

  // FIX: previously this only navigated to astrologer details when the
  // disconnect_user API call succeeded (res?.status === true) — if it
  // failed or timed out, it fell back to navigate(-1), which could land
  // anywhere depending on browser history. Cancel (manual click OR
  // auto-timeout, since the countdown calls cancel() too) should ALWAYS
  // return to astrologer details, regardless of the API outcome.
  const cancel = useCallback(async (silent = false) => {
    if (doneRef.current) return;
    doneRef.current = true;
    stopAll();
    try {
      const res = await callStatusUpdate(channelIdRef.current, 'disconnect_user');
      console.log('[cancel] status update res:', res);
    } catch (err) {
      console.error('[ChatCallingScreen] cancel() failed:', err);
    }
    if (!silent) goToAstrologerDetails();
  }, [stopAll, goToAstrologerDetails]);

  // Shared "accepted" handler — called from either the REST poll or the
  // Firebase fallback listener, whichever notices first.
  const handleAccepted = useCallback((channelId) => {
    if (doneRef.current) return;
    doneRef.current = true;
    stopAll();
    setStatus('accepted');
    const sessionState = {
      gid: channelId, fbchannelID: channelId, channelId,
      astrologer_id: astrologerId, astroName, astrologerImage, rate, wallet,
      agoraToken: agoraTokenRef.current, // ← add this
      name: intake.name || '', gender: intake.gender || '',
      dob: intake.dob || '', tob: intake.tob || '',
      place: intake.place || intake.birthPlace || '',
    };
    const path = callType === 'audio'
      ? `/consultation/call/${astrologerId}`
      : `/consultation/chat/${astrologerId}`;
    setTimeout(() => navRef.current(path, { replace: true, state: sessionState }), 600);
  }, [stopAll, astrologerId, astroName, astrologerImage, rate, wallet, intake, callType]);

  // FIX: previously navigate(-1) — a reject_astro response now lands on
  // astrologer details too, same as Cancel/timeout.
  const handleRejected = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    stopAll();
    setStatus('rejected');
    setTimeout(() => goToAstrologerDetails(), 1600);
  }, [stopAll, goToAstrologerDetails]);

  const handleEnded = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    stopAll();
    navRef.current('/', { replace: true });
  }, [stopAll]);

  // Initiate + poll + Firebase fallback
  useEffect(() => {
    const fbChannelId = channelIdRef.current; // client-generated, sent as fb_channel_id

    const [yearStr, monthStr, dayStr] = (intake.dob || "").split("-");
    const [hhStr, mmStr] = (intake.tob || "").split(":");

    const kundli = buildKundliString({
      name: intake.name || "",
      gender: intake.gender || "Male",
      yy: yearStr,
      mm: monthStr,
      dd: dayStr,
      hh_time: hhStr,
      mm_time: mmStr,
      latitude: intake.latitude || "0",
      longitude: intake.longitude || "0",
      place: intake.place || intake.birthPlace || "",
    });

    let cancelled = false;

    // Countdown starts immediately regardless of initiate/poll timing
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { cancel(); return 0; }
        return prev - 1;
      });
    }, 1000);

    function startPolling(channelId) {
      console.log('[poll] calling status for channel:', channelId);
      pollRef.current = setInterval(async () => {
        try {
          const res = await callInitiateStatus(channelId);
          console.log('[poll] response:', res);
          const st = extractStatus(res);
          if (st == null) {
            // Nothing recognizable in the response — log it once in a
            // while so it's visible in devtools instead of vanishing.
            console.warn('[ChatCallingScreen] poll: no status field in response', res);
            return;
          }
          if (ACCEPTED_VALUES.includes(st)) {
            handleAccepted(channelId);
          } else if (REJECTED_VALUES.includes(st)) {
            handleRejected();
          } else if (ENDED_VALUES.includes(st)) {
            handleEnded();
          }
        } catch (err) {
          // Was previously silent — logging so a real backend/auth error
          // doesn't look identical to "still waiting".
          console.error('[ChatCallingScreen] poll error:', err);
        }
      }, 400);
    }

    function startFirebaseFallback(channelId) {
      try {
        const sessionRef = ref(db, sessionPath(channelId));
        onValue(sessionRef, (snapshot) => {
          const data = snapshot.val();
          if (!data) return;
          const st = String(data.status ?? '');
          if (ACCEPTED_VALUES.includes(st)) {
            handleAccepted(channelId);
          } else if (REJECTED_VALUES.includes(st)) {
            handleRejected();
          } else if (ENDED_VALUES.includes(st)) {
            handleEnded();
          }
        });
        firebaseUnsubRef.current = () => off(sessionRef, 'value');
      } catch (err) {
        console.error('[ChatCallingScreen] Firebase fallback listener failed to attach:', err);
      }
    }

    (async () => {
      if (initiatedRef.current) return; // block second StrictMode call
      initiatedRef.current = true;
      let serverChannelId = fbChannelId; // fallback in case initiate fails or doesn't return one
      try {
        const res = await callInitiate({
          astrologer_id: astrologerId,
          call_type: callType, // 'chat' | 'audio'
          fb_channel_id: fbChannelId,
          kundli: "1",
        });

        // Previously this only read res.channel_id and ignored res.status
        // entirely — so even when the backend responded with status:
        // false (e.g. astrologer busy/unavailable), the call would still
        // start ringing/polling. We stop immediately in that case and
        // never start a call that was never actually created.
        if (res?.status === false) {
          console.warn('[ChatCallingScreen] call_initiate rejected — not starting call:', res?.message);
          if (!cancelled && !doneRef.current) {
            doneRef.current = true;
            stopAll();
            setStatus('rejected');
            setStatusMessage(res?.message || '');
            // FIX: previously navigate(-1) — now goes to astrologer details.
            setTimeout(() => goToAstrologerDetails(), 1600);
          }
          return; // never reaches startPolling/startFirebaseFallback
        }

        if (res?.channel_id) {
          serverChannelId = res.channel_id;
          channelIdRef.current = serverChannelId;
        }
        agoraTokenRef.current = res?.fb_channel_id || ''; 
      } catch (err) {
        // Even if initiate errors, we still poll — backend may have created it.
        console.error('[ChatCallingScreen] callInitiate failed:', err);
      }
      console.log('[ChatCallingScreen] about to startPolling', serverChannelId);
      startPolling(serverChannelId);
      startFirebaseFallback(serverChannelId);
    })();

    // NOTE: deliberately no history.pushState here. It used to push a duplicate
    // entry for this same URL, so the later navigate(..., { replace: true })
    // into the call screen replaced only that duplicate and left the original
    // "calling" entry underneath — browser Back from a live call then landed
    // back here and re-fired callInitiate. The popstate listener below still
    // cancels a pending call if the user backs out while it's ringing.
    const onPop = () => { cancel(); };
    window.addEventListener('popstate', onPop);

    return () => {
      cancelled = true;
      stopAll();
      window.removeEventListener('popstate', onPop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusLabel =
    status === 'accepted' ? 'Connected!' :
    status === 'rejected' ? (statusMessage || 'Astrologer is not available right now') :
    'Connecting you with the astrologer…';

  const statusColor =
    status === 'accepted' ? '#16a34a' :
    status === 'rejected' ? '#dc2626' : '#7b1a3a';

  const initials = (astroName || 'A').trim().split(' ').slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();

  return (
    <div className="cc-calling-page" style={styles.page}>
      <div style={styles.card}>
        <div style={styles.ringWrap}>
          <span style={{ ...styles.ring, animationDelay: '0s' }} />
          <span style={{ ...styles.ring, animationDelay: '0.6s' }} />
          <div style={styles.avatar}>
            {astrologerImage
              ? <img src={astrologerImage} alt={astroName} style={styles.avatarImg}
                     onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              : <span style={styles.avatarInit}>{initials}</span>}
          </div>
        </div>

        <div style={styles.name}>{astroName}</div>
        <div style={{ ...styles.status, color: statusColor }}>{statusLabel}</div>

        <div style={styles.dots}>
          <span style={{ ...styles.dot, animationDelay: '0s' }} />
          <span style={{ ...styles.dot, animationDelay: '0.2s' }} />
          <span style={{ ...styles.dot, animationDelay: '0.4s' }} />
        </div>

        <div style={styles.meta}>
          <span><i className="fas fa-bolt" /> ₹{rate}/min</span>
          <span><i className={`fas ${callType === 'audio' ? 'fa-phone' : 'fa-comment-dots'}`} /> {callType === 'audio' ? 'Audio Call' : 'Chat'}</span>
        </div>

        {status === 'connecting' && (
          <div style={styles.timeout}>Auto-cancel in {countdown}s</div>
        )}

        <button style={styles.cancelBtn} onClick={() => cancel()}>
          <i className="fas fa-times" /> Cancel
        </button>

        <div style={styles.secure}>
          <i className="fas fa-lock" /> Your details are private &amp; secure
        </div>
      </div>

      <style>{keyframes}</style>
    </div>
  );
};


/* ── inline styles (self-contained; matches DivinIq maroon theme) ── */
const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg,#fff5f7,#fdeef2)', padding: 20 },
  card: { background: '#fff', borderRadius: 24, padding: '40px 28px', width: 'min(420px,92vw)', textAlign: 'center', boxShadow: '0 20px 60px rgba(123,26,58,0.18)' },
  ringWrap: { position: 'relative', width: 140, height: 140, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid #7b1a3a', opacity: 0.35, animation: 'ccPing 1.8s ease-out infinite' },
  avatar: { width: 108, height: 108, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#7b1a3a,#a83a5b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 34, fontWeight: 700 },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarInit: { color: '#fff' },
  name: { fontSize: 20, fontWeight: 700, color: '#1f2937' },
  status: { fontSize: 14, fontWeight: 600, marginTop: 6 },
  dots: { display: 'flex', gap: 6, justifyContent: 'center', margin: '16px 0' },
  dot: { width: 8, height: 8, borderRadius: '50%', background: '#7b1a3a', animation: 'ccBounce 1s infinite' },
  meta: { display: 'flex', gap: 18, justifyContent: 'center', fontSize: 13, color: '#6b7280', marginBottom: 14 },
  timeout: { fontSize: 12, color: '#9ca3af', marginBottom: 16 },
  cancelBtn: { background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 30, padding: '11px 26px', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  secure: { marginTop: 18, fontSize: 11, color: '#9ca3af' },
};

const keyframes = `
@keyframes ccPing { 0% { transform: scale(0.8); opacity: 0.5; } 100% { transform: scale(1.4); opacity: 0; } }
@keyframes ccBounce { 0%,100% { transform: translateY(0); opacity: 0.5; } 50% { transform: translateY(-6px); opacity: 1; } }
`;

export default ChatCallingScreen;