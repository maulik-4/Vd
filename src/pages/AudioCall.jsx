import EndCallFlow from './EndCallFlow';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../services/liveFirebase';
import { useAudioCall } from '../context/AudioCallContext';
import { agoraManager } from '../services/Agoramanager.';
import apiService from '../services/apiServices';
import {
  fetchAgoraToken,
  callStatusUpdate,
  callInitiateStatus,
  addRating,
  lastCallList,
  getWalletBalance,
} from '../services/liveService';
import './AudioCall.css';

const STATUS_POLL_MS = 2000;
const ACCEPTED_STATUSES = ['accept_astro', 'accepted', 'ongoing', 'active', 'accept', 'start', 'initiated', 'connected', 'busy'];
// Narrower than ACCEPTED_STATUSES: 'initiated'/'busy' mean ringing, not answered,
// so they must NOT flip the UI to connected or start billing the timer.
const CONNECTED_STATUSES = ['accept_astro', 'accepted', 'accept', 'ongoing', 'active', 'start', 'connected'];

const initials = (n) => (n || '').trim().split(' ').slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
const COLORS = ['#7c3aed', '#059669', '#dc2626', '#d97706', '#2563eb'];
const avColor = (n) => COLORS[((n || '').charCodeAt(0) || 65) % COLORS.length];
const fmt = (s) => {
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
};
const fmtShort = (s) => {
  if (s >= 3600) {
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${h}:${m}:${sec}`;
  }
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${m}:${sec}`;
};

// Real star distribution from the profile's review list (astrologer_profile
// returns `rating` as an array of review objects).
const buildDist = (reviews = []) => {
  const counts = [0, 0, 0, 0, 0]; // index 0 = 1 star
  reviews.forEach((r) => {
    const n = Math.round(Number(r?.rating) || 0);
    if (n >= 1 && n <= 5) counts[n - 1] += 1;
  });
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) return null;
  return [5, 4, 3, 2, 1].map((star) => ({
    lbl: `${star} Star${star > 1 ? 's' : ''}`,
    pct: Math.round((counts[star - 1] / total) * 100),
    color: star >= 4 ? '#f5a623' : star === 3 ? '#f5c842' : '#ddd',
  }));
};

const BARS = [
  { lbl: '5 Stars', pct: 82, color: '#f5a623' },
  { lbl: '4 Stars', pct: 13, color: '#f5a623' },
  { lbl: '3 Stars', pct: 3, color: '#f5c842' },
  { lbl: '2 Stars', pct: 1, color: '#ddd' },
  { lbl: '1 Star', pct: 1, color: '#ddd' },
];

const TRUST_POINTS = [
  { icon: 'fas fa-shield-alt', title: '100% Private & Secure', sub: 'Your conversation stays fully confidential' },
  { icon: 'fas fa-user-check', title: 'Verified Astrologers', sub: 'Every expert is background-checked' },
  { icon: 'fas fa-star', title: 'Trusted by Lakhs', sub: 'Rated 4.8+ across thousands of reviews' },
  { icon: 'fas fa-headset', title: '24x7 Support', sub: 'We\u2019re here whenever you need us' },
];

const fixImgHost = (url) => {
  if (!url || typeof url !== 'string') return '';
  let cleaned = url.replace('admin.astrogurujii.com', 'admin.vaidikguru.com');
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://admin.vaidikguru.com${cleaned.startsWith('/') ? '' : '/'}${cleaned}`;
  }
  return cleaned;
};

const extractStatus = (res) => {
  if (!res) return null;
  if (typeof res.results === 'object' && res.results?.status) return String(res.results.status);
  if (typeof res.data === 'object' && res.data?.status) return String(res.data.status);
  if (typeof res.result === 'object' && res.result?.status) return String(res.result.status);
  if (typeof res.status === 'string') return res.status;
  return null;
};

function resolveElapsedSeconds(data2) {
  if (data2?.start_time || data2?.accept_time || data2?.start_at) {
    const startTimeStr = data2.start_time || data2.accept_time || data2.start_at;
    const startMs = new Date(startTimeStr).getTime();
    if (Number.isFinite(startMs) && startMs > 0) {
      return Math.max(Math.floor((Date.now() - startMs) / 1000), 0);
    }
  }
  const diff = Number(data2?.difference);
  if (Number.isFinite(diff) && diff >= 0) return diff;
  return 0;
}

function readCallSessionRemaining(channelId, rate, wallet) {
  return new Promise((resolve) => {
    try {
      const sessionRef = ref(db, `CallSession/${channelId}`);
      onValue(sessionRef, (snap) => {
        off(sessionRef);
        const d = snap.val();
        if (!d) { resolve(0); return; }
        const maxMinutes = d.max_minutes;
        const lastTick = d.last_tick_at;
        const startedAt = d.started_at;
        if (maxMinutes != null) {
          let secs = Math.max(Math.floor(Number(maxMinutes) * 60), 0);
          if (lastTick) secs = Math.max(secs - Math.floor((Date.now() - Number(lastTick)) / 1000), 0);
          resolve(secs);
        } else if (startedAt) {
          const maxSec = Math.floor((parseFloat(wallet) / (parseFloat(rate) || 1)) * 60);
          resolve(Math.max(maxSec - Math.floor((Date.now() - Number(startedAt)) / 1000), 0));
        } else {
          resolve(0);
        }
      }, { onlyOnce: true });
    } catch {
      resolve(0);
    }
  });
}

const AudioCall = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const ctx = useAudioCall();

  const st = location.state || {};

  const [session, setSession] = useState(null);
  const [resolving, setResolving] = useState(true);
  const [resolveErr, setResolveErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    const reloaded = location.key === 'default';
    console.log('[AudioCall] resolving session — reloaded:', reloaded, 'ctx.callInfo:', ctx.callInfo, 'st:', st);

    (async () => {
      // 1. Existing context session — only resume if still genuinely active and matches this call.
      // callStatus 'idle' or 'ended' means the call is over; ignore stale ctx.callInfo
      // so a 2nd fresh call (with new st.channelId) isn't swallowed by the old one.
      const incomingChannelId = st.channelId || st.gid;
      if (ctx.callInfo?.channelId && ctx.callStatus !== 'idle' && ctx.callStatus !== 'ended' && (!incomingChannelId || incomingChannelId === ctx.callInfo.channelId)) {
        let resumeWallet = ctx.callInfo.wallet;
        if (!resumeWallet || parseFloat(resumeWallet) <= 0) {
          try {
            const w = await getWalletBalance();
            if (w > 0) resumeWallet = String(w);
          } catch (err) {
            console.error('[AudioCall] failed to fetch wallet on resume:', err);
          }
        }
        if (!cancelled) {
          const sObj = {
            channelId: ctx.callInfo.channelId,
            astrologerId: ctx.callInfo.astrologerId,
            astroName: ctx.callInfo.astroName,
            astrologerImage: fixImgHost(ctx.callInfo.astroImage),
            rate: ctx.callInfo.rate,
            wallet: resumeWallet,
            initialElapsed: ctx.elapsedSeconds || 0,
          };
          try { sessionStorage.setItem('activeAudioCall', JSON.stringify({ ...sObj, startedAt: Date.now() - ((ctx.elapsedSeconds || 0) * 1000) })); } catch (_) { }
          setSession(sObj);
          setResolving(false);
        }
        return;
      }

      // 2. Fresh navigation from ChatCallingScreen (in-app navigation, NOT a hard reload)
      if (!reloaded && incomingChannelId) {
        let savedCall = null;
        try { savedCall = JSON.parse(sessionStorage.getItem('activeAudioCall') || 'null'); } catch (_) { }
        const isSameChannel = savedCall && savedCall.channelId === incomingChannelId;
        const calcElapsed = (isSameChannel && savedCall?.startedAt) ? Math.max(Math.floor((Date.now() - savedCall.startedAt) / 1000), 0) : 0;

        if (!cancelled) {
          const sObj = {
            channelId: incomingChannelId,
            astrologerId: st.astrologer_id || id,
            astroName: st.astroName || st.name || 'Astrologer',
            astrologerImage: fixImgHost(st.astrologerImage || st.profile_img || ''),
            rate: st.rate || 15,
            wallet: st.wallet || '210',
            initialElapsed: calcElapsed,
          };
          try { sessionStorage.setItem('activeAudioCall', JSON.stringify({ ...sObj, startedAt: isSameChannel ? savedCall.startedAt : Date.now() })); } catch (_) { }
          setSession(sObj);
          setResolving(false);
        }
        return;
      }

      // 3. FAST refresh recovery — read this tab's saved session synchronously and
      // rejoin immediately on hard page refresh.
      let fastSaved = null;
      try { fastSaved = JSON.parse(sessionStorage.getItem('activeAudioCall') || 'null'); } catch (_) { }
      if (reloaded && fastSaved?.channelId && fastSaved.channelId !== id) {
        if (!cancelled) {
          const calcElapsed = fastSaved.startedAt
            ? Math.max(Math.floor((Date.now() - fastSaved.startedAt) / 1000), 0)
            : (fastSaved.initialElapsed || 0);
          setSession({
            ...fastSaved,
            astrologerImage: fixImgHost(fastSaved.astrologerImage),
            initialElapsed: calcElapsed,
          });
          setResolving(false);
        }
        // Wallet refresh happens in the background — never block the rejoin on it.
        getWalletBalance()
          .then((w) => { if (!cancelled && w > 0) setSession((prev) => (prev ? { ...prev, wallet: String(w) } : prev)); })
          .catch(() => { });
        return;
      }

      // 4. Backend recovery — ask lastCallList only when this tab has nothing saved
      try {
        const { result, data2 } = await lastCallList();
        console.log('[AudioCall] refresh recovery lastCallList response:', { result, data2 });
        const callType = String(data2?.call_type || '').toLowerCase();
        const status = String(data2?.status || '').toLowerCase();

        const isAudioType = !callType || callType.includes('audio') || callType.includes('call') || callType.includes('voice');
        const isAcceptedStatus = ACCEPTED_STATUSES.includes(status) || status.includes('accept') || status.includes('ongoi') || status.includes('activ');
        const matchesThisAstrologer = !id || String(data2?.astro_id || '') === String(id) || String(data2?.channel_id || '') === String(id) || String(data2?.fb_channel_id || '') === String(id);

        const realChannelId = data2?.channel_id || data2?.fb_channel_id || data2?.channelId || data2?.channel;

        if (result && data2 && realChannelId && isAudioType && isAcceptedStatus && matchesThisAstrologer) {
          let realWallet = data2.total_amount || '0';
          try {
            const w = await getWalletBalance();
            if (w > 0) realWallet = String(w);
          } catch (err) {
            console.error('[AudioCall] failed to fetch real wallet balance:', err);
          }

          if (!cancelled) {
            const elSec = resolveElapsedSeconds(data2);
            const sObj = {
              channelId: realChannelId,
              astrologerId: data2.astro_id || id,
              astroName: data2.astro_name || 'Astrologer',
              astrologerImage: fixImgHost(data2.astro_profile_img || data2.image || ''),
              rate: data2.call_rate || 15,
              wallet: realWallet,
              initialElapsed: elSec,
            };
            try { sessionStorage.setItem('activeAudioCall', JSON.stringify({ ...sObj, startedAt: Date.now() - (elSec * 1000) })); } catch (_) { }
            setSession(sObj);
            setResolving(false);
          }
          return;
        }
      } catch (err) {
        console.error('[AudioCall] refresh recovery backend query failed:', err);
      }

      // 4. Saved sessionStorage fallback — ONLY use if savedCall has a real channelId distinct from id (astrologer_id)
      let savedCall = null;
      try {
        savedCall = JSON.parse(sessionStorage.getItem('activeAudioCall') || 'null');
      } catch (_) { }

      if (savedCall && savedCall.channelId && savedCall.channelId !== id) {
        if (!cancelled) {
          const calcElapsed = savedCall.startedAt ? Math.max(Math.floor((Date.now() - savedCall.startedAt) / 1000), 0) : (savedCall.initialElapsed || 0);
          setSession({
            ...savedCall,
            astrologerImage: fixImgHost(savedCall.astrologerImage),
            initialElapsed: calcElapsed
          });
          setResolving(false);
        }
        return;
      }

      if (!cancelled) {
        setResolveErr('This call session is no longer active.');
        setResolving(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const channelId = session?.channelId || '';
  const astrologer_id = String(session?.astrologerId || id || '');
  const name = session?.astroName || 'Astrologer';
  const pImg = fixImgHost(session?.astrologerImage || session?.profile_img || session?.astroImage || '');
  const price = session?.rate || 15;
  const wallet = session?.wallet || '210';
  const initialElapsed = session?.initialElapsed || 0;

  useEffect(() => {
    if (!astrologer_id) return;
    let cancelled = false;
    apiService.postBearer('/user_api/astrologer_profile', { astrologer_id: String(astrologer_id), id: String(astrologer_id) })
      .then((res) => {
        if (cancelled) return;
        // astrologer_profile returns `results` as an ARRAY. Reading it as an object
        // made every field below undefined — which is why the name, photo, rating
        // and skills never came from the API on this screen.
        const raw = res?.results ?? res?.record ?? res?.data ?? res?.result;
        const list = Array.isArray(raw) ? raw : (raw ? [raw] : []);
        const astro = list.find((a) => String(a?.id) === String(astrologer_id) || String(a?._id) === String(astrologer_id)) || list[0];
        if (!astro) return;

        const fetchedImg = astro.profile_img || astro.image || astro.astrologer_profile_img;
        const fetchedName = astro.name || astro.astro_name;
        const reviewArr = Array.isArray(astro.rating) ? astro.rating : [];

        setSession((prev) => prev ? ({
          ...prev,
          astroName: prev.astroName && prev.astroName !== 'Astrologer' ? prev.astroName : (fetchedName || 'Astrologer'),
          astrologerImage: fixImgHost(fetchedImg || prev.astrologerImage || ''),
          meta: {
            rating: Number(astro.avg_rate ?? 0),
            reviews: reviewArr.length || Number(astro.total_review ?? (typeof astro.rating === 'number' ? astro.rating : 0)),
            experience: astro.experience ?? '',
            cats: (Array.isArray(astro.category) ? astro.category : [])
              .map((c) => (typeof c === 'object' ? (c.name || c.category_name || c.title) : c)).filter(Boolean),
            langs: (Array.isArray(astro.language) ? astro.language : [])
              .map((l) => (typeof l === 'object' ? (l.name || l.title) : l)).filter(Boolean),
            dist: buildDist(reviewArr),
          },
        }) : prev);
      })
      .catch(() => { });
    return () => { cancelled = true; };
  }, [astrologer_id]);

  const [imgErr, setImgErr] = useState(false);
  const [secs, setSecs] = useState(0);
  const [muted, setMuted] = useState(false);
  const [spk, setSpk] = useState(true);
  const [onHold, setOnHold] = useState(false);
  const [err, setErr] = useState('');
  const [showRating, setShowRating] = useState(false);

  // Remaining Balance / Time Remaining are derived directly from the
  // elapsed timer, which IS ticking correctly, so they move together and
  // stay internally consistent even without server-side billing ticks.
  const rateNum = parseFloat(price) || 0;
  const initialWalletNum = parseFloat(wallet) || 0;
  const consumed = rateNum > 0 ? (secs / 60) * rateNum : 0;
  const remainingBalance = Math.max(initialWalletNum - consumed, 0);
  const timeLeftSecs = rateNum > 0 ? Math.max(Math.floor((remainingBalance / rateNum) * 60), 0) : 0;

  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const endingRef = useRef(false);
  const navRef = useRef(navigate);
  // Grace window: right after a (re)join, ignore poll/onUserLeft "bad"
  // statuses for a few seconds so a stale/racing backend record doesn't
  // immediately end a call that is actually still active (this is what was
  // causing the rating popup to appear right after a page refresh).
  const joinGraceUntilRef = useRef(0);
  const badStatusCountRef = useRef(0);
  // Guards against a second "connected" signal restarting the timer at 0
  // (onAudioStarted can fire again on unmute / track republish).
  const connectedRef = useRef(false);
  const secsRef = useRef(0);
  useEffect(() => { navRef.current = navigate; }, [navigate]);

  useEffect(() => { secsRef.current = secs; }, [secs]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);
  const stopStatusPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startElapsedTimer = useCallback((from = 0) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setSecs(from);
    ctx.setElapsedSeconds(from);
    timerRef.current = setInterval(() => {
      setSecs((p) => { const n = p + 1; ctx.setElapsedSeconds(n); return n; });
    }, 1000);
  }, [ctx]);

  // Single entry point for "the call is live" — safe to call from any signal
  // (remote user joined, remote audio started, backend says accepted).
  const markConnected = useCallback((fromSecs = null) => {
    if (connectedRef.current) return;
    connectedRef.current = true;
    ctx.setCallStatus('connected');
    setErr('');
    startElapsedTimer(fromSecs != null ? fromSecs : (ctx.elapsedSeconds || initialElapsed || 0));
  }, [ctx, startElapsedTimer, initialElapsed]);

  const handleEnd = useCallback(async (status = null, { remote = false } = {}) => {
    if (endingRef.current) return;
    endingRef.current = true;

    try { sessionStorage.removeItem('activeAudioCall'); } catch (_) { }

    stopTimer();
    stopStatusPoll();

    ctx.setCallStatus('ended');

    const resolvedStatus = status || (ctx.callStatus === 'connected' ? 'end_user' : 'disconnect_user');
    try { await callStatusUpdate(channelId, resolvedStatus); } catch { /* silent */ }

    await agoraManager.leave();
    setShowRating(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, stopTimer, stopStatusPoll]);

  const handleMinimize = useCallback(() => {
    stopStatusPoll();
    agoraManager.clearListeners();
    ctx.minimize();
    navRef.current(`/astrologer/${astrologer_id}`, { replace: true });
  }, [ctx, stopStatusPoll, astrologer_id]);

  // Write the exact start instant as the page goes away, so a refresh resumes the
  // timer where it left off instead of at 0. pagehide fires on reload, tab close
  // and bfcache navigation; beforeunload is unreliable on mobile Safari.
  // Write the exact start instant and cached token as the page goes away, so a refresh resumes the
  // timer where it left off instead of at 0 and re-joins Agora instantly.
  useEffect(() => {
    if (!channelId) return;
    const persist = () => {
      if (endingRef.current || ctx.callStatus === 'ended' || ctx.callStatus === 'idle') {
        try { sessionStorage.removeItem('activeAudioCall'); } catch (_) { }
        return;
      }
      try {
        let existing = {};
        try { existing = JSON.parse(sessionStorage.getItem('activeAudioCall') || '{}'); } catch (_) { }
        sessionStorage.setItem('activeAudioCall', JSON.stringify({
          ...existing,
          channelId,
          astrologerId: astrologer_id,
          astroName: name,
          astrologerImage: pImg,
          rate: price,
          wallet,
          startedAt: Date.now() - ((secsRef.current || 0) * 1000),
        }));
      } catch (_) { }
    };

    const handleBeforeUnload = (e) => {
      if (endingRef.current || ctx.callStatus !== 'connected') return;
      e.preventDefault();
      e.returnValue = 'Audio Call in progress. Are you sure you want to reload?';
      return e.returnValue;
    };

    window.addEventListener('pagehide', persist);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('pagehide', persist);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (!endingRef.current && ctx.callStatus === 'connected') {
        persist();
      } else {
        try { sessionStorage.removeItem('activeAudioCall'); } catch (_) { }
        if (endingRef.current) {
          ctx.endCall();
        }
      }
    };
  }, [channelId, astrologer_id, name, pImg, price, wallet, ctx.callStatus]);

  // Browser / Android back must minimize the call — otherwise it pops back to
  // the "Connecting…" screen still in history, which restarts the call flow.
  // A sentinel entry is pushed so the first back press lands here, not there.
  useEffect(() => {
    if (!channelId) return;
    window.history.pushState({ acCallGuard: true }, '');
    const onPop = () => {
      if (endingRef.current || showRating) return; // call is ending / rating open — let it through
      handleMinimize();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [channelId, handleMinimize, showRating]);

  const startStatusPoll = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        if (!channelId || channelId === astrologer_id || channelId === id) {
          console.warn('[AudioCall] skipping status poll — channelId is missing or invalid:', channelId);
          return;
        }

        const res = await callInitiateStatus(channelId);
        const s = extractStatus(res);
        const sl = String(s || '').toLowerCase();
        const isBad = sl === 'reject_astro' || sl === 'disconnect_user' || sl === 'end_astro' || sl === 'end_user';

        // Astrologer has answered — leave "Connecting…" and start the timer even
        // if Agora hasn't fired onAudioStarted yet (it waits for a published track).
        if (!isBad && (CONNECTED_STATUSES.includes(sl) || sl.includes('accept') || sl.includes('ongoi') || sl.includes('activ'))) {
          markConnected();
        }

        // Backend needs a moment to settle right after a (re)join — don't act on
        // an end/reject read inside that window.
        if (Date.now() < joinGraceUntilRef.current) return;

        if (isBad) {
          badStatusCountRef.current += 1;
          // Require 2 consecutive bad polls before acting — filters out a
          // single flaky/stale response.
          if (badStatusCountRef.current < 2) return;
          if (s === 'reject_astro' || s === 'disconnect_user') {
            handleEnd('disconnect_user', { remote: true });
          } else {
            handleEnd('end_user', { remote: true });
          }
        } else {
          badStatusCountRef.current = 0;
        }
      } catch (err) {
        console.error('[AudioCall] status poll error:', err);
      }
    }, STATUS_POLL_MS);
  }, [channelId, astrologer_id, id, handleEnd, markConnected]);

  /* ── join/attach, once session resolution finishes ── */
  useEffect(() => {
    if (!channelId) return; // still resolving, or resolution failed

    if (ctx.callInfo?.channelId !== channelId) {
      ctx.startCall({
        channelId,
        astrologerId: astrologer_id,
        astroName: name,
        astroImage: pImg,
        rate: String(price),
        wallet: String(wallet),
      });
    }
    ctx.maximize();

    agoraManager.setListeners({
      // Remote participant in the channel = the astrologer picked up. Don't wait
      // for them to publish audio before showing the call as live.
      onUserJoined: () => { markConnected(); },
      onAudioStarted: () => { markConnected(); },
      onUserLeft: async () => {
        try {
          if (!channelId) return;
          if (Date.now() < joinGraceUntilRef.current) {
            console.log('[AudioCall] ignoring onUserLeft during join grace window');
            return;
          }
          const res = await callInitiateStatus(channelId);
          const s = extractStatus(res);
          if (s === 'end_astro' || s === 'disconnect_user' || s === 'end_user' || s === 'reject_astro') {
            handleEnd('end_astro', { remote: true });
          } else {
            console.log('[AudioCall] ignoring transient user-left event from Agora engine, call active:', s);
          }
        } catch (_) {
          /* ignore transient error on refresh */
        }
      },
      onError: (msg) => setErr(msg),
    });

    if (agoraManager.isConnected && agoraManager.channelId === channelId) {
      // Same-session resume (minimized bar reopened, no refresh happened)
      joinGraceUntilRef.current = Date.now() + 4000;
      markConnected(ctx.elapsedSeconds || initialElapsed);
    } else {
      // Fresh join or refresh-recovery rejoin — give the backend longer to settle
      joinGraceUntilRef.current = Date.now() + 7000;

      // Fast rejoin: use cached Agora token if available in sessionStorage for immediate <500ms join
      const cachedToken = session?.token || (() => {
        try {
          const s = JSON.parse(sessionStorage.getItem('activeAudioCall') || '{}');
          return (s.channelId === channelId && s.token) ? s.token : null;
        } catch (_) { return null; }
      })();

      if (cachedToken) {
        console.log('[AudioCall] Joining Agora instantly with cached token for fast refresh recovery');
        agoraManager.join(channelId, cachedToken);
      }

      fetchAgoraToken(channelId).then((token) => {
        if (!token && !cachedToken) { setErr('Could not get an Agora token for this call.'); return; }
        if (token) {
          try {
            const currentObj = JSON.parse(sessionStorage.getItem('activeAudioCall') || '{}');
            sessionStorage.setItem('activeAudioCall', JSON.stringify({ ...currentObj, token }));
          } catch (_) { }
          if (!cachedToken) {
            agoraManager.join(channelId, token);
          }
        }
      });
    }

    startStatusPoll();

    return () => {
      stopTimer();
      stopStatusPoll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    ctx.setIsMuted(next);
    agoraManager.setMuted(next);
  };
  const handleSubmitCallRating = async (payload) => {
    try {
      await addRating(channelId, payload?.rating || 5, payload?.review || '');
    } catch (err) {
      console.error('[AudioCall] add_rating failed:', err?.response?.data || err.message);
    }
  };
  const toggleSpeaker = () => {
    const next = !spk;
    setSpk(next);
    ctx.setIsSpeakerOn(next);
    agoraManager.setSpeaker(next);
  };
  const toggleHold = () => {
    const next = !onHold;
    setOnHold(next);
    agoraManager.setHold(next);
  };

  const finishRating = () => {
    ctx.endCall();
    setShowRating(false);
    const dest = astrologer_id ? `/astrologer/${astrologer_id}` : '/';
    navRef.current(dest, { replace: true });
  };

  const meta = session?.meta || {};
  const cats = Array.isArray(meta.cats) ? meta.cats : [];
  const lang = meta.langs?.length ? meta.langs.join(', ') : '—';
  const rating = Number(meta.rating || 0);
  const reviews = Number(meta.reviews || 0).toLocaleString('en-IN');
  const exp = meta.experience || '';
  const bars = meta.dist || null; // null until the profile's reviews load

  const callState = ctx.callStatus === 'connected' ? 'connected' : ctx.callStatus === 'ended' ? 'ended' : 'connecting';

  if (resolving) {
    return (
      <div className="ac-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Reconnecting your call…</div>
        </div>
      </div>
    );
  }

  if (!channelId) {
    return (
      <div className="ac-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', background: '#fff', borderRadius: 16, padding: 28, maxWidth: 360 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', marginBottom: 6 }}>Call not available</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>{resolveErr || 'This call session is no longer active.'}</div>
          <button
            onClick={() => navRef.current(`/astrologer/${id}`, { replace: true })}
            style={{ padding: '10px 20px', borderRadius: 30, border: 'none', background: '#7b1a3a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
          >
            Back to Astrologer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ac-page">
      <div className="ac-main">

        {/* ══ LEFT ══ */}
        <div className="ac-left">
          <motion.div className="ac-lcard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            <div className="ac-lcard-title"><i className="fas fa-calendar-check" /> Consultation Details</div>
            {[
              { lbl: 'Topic', val: 'Consultation' },
              { lbl: 'Astrologer', val: name, icon: true },
              { lbl: 'Experience', val: exp ? `${exp}+ Years` : '—' },
              { lbl: 'Language', val: lang },
              { lbl: 'Call Type', val: 'Audio Call' },
              { lbl: 'Rate', val: `₹${price} / min` },
              { lbl: 'Remaining Balance', val: `₹${Math.round(remainingBalance)}` },
            ].map((r) => (
              <div key={r.lbl} className="ac-drow">
                <div className="ac-dlbl">{r.lbl}</div>
                <div className="ac-dval">{r.val}{r.icon && <i className="fas fa-check-circle" />}</div>
              </div>
            ))}
          </motion.div>

          <motion.div className="ac-lcard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.07 }}>
            <div className="ac-rtitle"><i className="fas fa-star" /> Astrologer Rating</div>
            <div className="ac-rscore"><i className="fas fa-star" /><span>{rating > 0 ? `${rating.toFixed(1)} (${reviews} Reviews)` : 'No ratings yet'}</span></div>
            {(bars || []).map((b) => (
              <div key={b.lbl} className="ac-brow">
                <span className="ac-blbl">{b.lbl}</span>
                <div className="ac-btrack"><div className="ac-bfill" style={{ width: `${b.pct}%`, background: b.color }} /></div>
                <span className="ac-bpct">{b.pct}%</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ══ CENTER ══ */}
        <div className="ac-center">
          <motion.div className="ac-callcard" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.26 }}>
            <div className="ac-enc">
              <i className="fas fa-lock" />
              <div>
                <div className="ac-enc-t">End-to-end Encrypted</div>
                <div className="ac-enc-s">Your privacy is 100% protected</div>
              </div>
            </div>
            <button className="ac-infobtn" onClick={handleMinimize}><i className="fas fa-arrow-left" /> Back</button>

            <div className="ac-calltop">
              <div className="ac-calllbl">
                {callState === 'connected' ? (onHold ? 'On Hold' : 'Audio Call') : callState === 'ended' ? 'Call Ended' : 'Connecting…'}
                <div className="ac-wave">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="ac-wb" />)}</div>
              </div>
              <div className="ac-timer">{fmt(secs)}</div>
            </div>

            {err && <div style={{ color: '#dc2626', fontSize: 12, textAlign: 'center', marginBottom: 8 }}>{err}</div>}

            {callState === 'connected' && (
              <div style={{ textAlign: 'center', fontSize: 12, color: timeLeftSecs < 60 ? '#dc2626' : '#9ca3af', marginBottom: 8 }}>
                Time remaining: {fmtShort(timeLeftSecs)}
              </div>
            )}

            <div className="ac-avwrap">
              <div className="ac-av">
                {pImg && !imgErr
                  ? <img src={pImg} alt={name} onError={() => setImgErr(true)} />
                  : <div className="ac-avinit" style={{ background: `linear-gradient(135deg,${avColor(name)},${avColor(name)}99)` }}>{initials(name)}</div>}
              </div>
              <div className="ac-avbadge"><i className="fas fa-check" /></div>
            </div>

            <div className="ac-namerow">
              <span className="ac-name">{name}</span>
              <span className="ac-pill"><i className="fas fa-check-circle" /> Verified Expert</span>
            </div>
            {rating > 0 && (
              <div className="ac-ratingrow"><i className="fas fa-star" /><span>{rating.toFixed(1)} ({reviews} Reviews)</span></div>
            )}

            <div className="ac-skills">
              {cats.map((c, i) => <span key={i} className="ac-spill"><i className="fas fa-om" /> {c}</span>)}
            </div>

            <div className="ac-ctrls">
              <button className="ac-cb" onClick={toggleSpeaker}>
                <div className="ac-cico"><i className={`fas ${spk ? 'fa-volume-up' : 'fa-volume-mute'}`} style={{ color: spk ? '#333' : '#d32f2f' }} /></div>
                <span className="ac-clbl">Speaker</span>
              </button>
              <button className="ac-cb" onClick={toggleMute}>
                <div className="ac-cico"><i className="fas fa-microphone-slash" style={{ color: muted ? '#d32f2f' : '#333' }} /></div>
                <span className="ac-clbl">{muted ? 'Unmute' : 'Mute'}</span>
              </button>
              <button className="ac-cb" onClick={toggleHold}>
                <div className="ac-cico"><i className="fas fa-pause" style={{ color: onHold ? '#d32f2f' : '#333' }} /></div>
                <span className="ac-clbl">{onHold ? 'Resume' : 'Hold'}</span>
              </button>
              <button className="ac-cb end" onClick={() => handleEnd()}>
                <div className="ac-cico"><i className="fas fa-phone-slash" /></div>
                <span className="ac-clbl">End Call</span>
              </button>
              <button className="ac-cb" onClick={handleMinimize}>
                <div className="ac-cico"><i className="fas fa-compress" /></div>
                <span className="ac-clbl">Minimize</span>
              </button>
            </div>
          </motion.div>

          <motion.div className="ac-actions" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.12 }}>
            {[
              { icon: 'fas fa-share-alt', lbl: 'Share Details', sub: 'Share your birth details or documents' },
              { icon: 'fas fa-sticky-note', lbl: 'Notes', sub: 'Take notes during your consultation' },
              { icon: 'fas fa-record-vinyl', lbl: 'Record Call', sub: 'Record this call for your reference' },
            ].map((a) => (
              <div key={a.lbl} className="ac-act" onClick={a.onClick} style={a.onClick ? { cursor: 'pointer' } : undefined}>
                <div className="ac-aico"><i className={a.icon} /></div>
                <span className="ac-albl">{a.lbl}</span>
                <span className="ac-asub">{a.sub}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ══ RIGHT ══ */}
        <div className="ac-right">
          <motion.div className="ac-sum" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.1 }}>
            <div className="ac-sumtitle"><i className="fas fa-calendar-check" /> Consultation Summary</div>
            {[
              { lbl: 'Call Type', val: 'Audio Call' },
              { lbl: 'Rate', val: `₹${price} / min` },
              { lbl: 'Duration', val: fmt(secs) },
              { lbl: 'Time Remaining', val: fmtShort(timeLeftSecs) },
            ].map((r) => (
              <div key={r.lbl} className="ac-srow"><div className="ac-slbl">{r.lbl}</div><div className="ac-sval">{r.val}</div></div>
            ))}
            <div className="ac-srow"><div className="ac-slbl">Remaining Balance</div><div className="ac-sval big">₹{Math.round(remainingBalance)}</div></div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.2 }}
            style={{ background: '#7b1a3a', borderRadius: 12, padding: '14px 13px', boxShadow: '0 2px 8px rgba(123,26,58,0.3)' }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700,
              color: '#fff', paddingBottom: 7, marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.15)',
            }}>
              <i className="fas fa-om" style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }} /> Why Trust Vaidik Guru
            </div>
            {TRUST_POINTS.map((t) => (
              <div key={t.title} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <i className={t.icon} style={{ fontSize: 12, color: '#fff' }} />
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4, marginTop: 1 }}>{t.sub}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

      </div>

      {/* rating dialog */}
      {showRating && (
        <EndCallFlow
          onSubmitRating={handleSubmitCallRating}
          onFinish={finishRating}
        />
      )}

    </div>
  );
};

export default AudioCall;