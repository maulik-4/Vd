import { useEffect, useRef, useState } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../services/liveFirebase';
import { useChat } from '../context/ChatContext';
import { useAudioCall } from '../context/AudioCallContext';
import { agoraManager } from '../services/Agoramanager.';
import apiService from '../services/apiServices';
import { lastCallList, fetchAgoraToken, getWalletBalance } from '../services/liveService';
// import NewAppDownloadModal from '../components/common/NewAppDownloadModel'; // adjust this path if it lives elsewhere in your project

// Broadened to match the same "still active" values used elsewhere in this
// codebase (ChatCallingScreen's ACCEPTED_VALUES), on top of the exact
// "accept_astro" string your backend actually returns.
const ACCEPTED_STATUSES = ['accept_astro', 'accepted', 'ongoing', 'active', 'accept', 'start', 'connected'];

// FIX: previously used `data2.difference ? X : 300` — a truthy check, which
// treats a perfectly valid 0 (call just started a second ago) the same as
// "no data at all", silently replacing real data with a meaningless
// hardcoded 300 (which is exactly the "always starts at 5:00" bug). This
// checks for a genuinely valid, finite, non-negative number instead, and
// falls back to computing elapsed time from start_time (a plain date
// string the backend always sets) rather than a fake guess.
function resolveElapsedSeconds(data2) {
  const diff = Number(data2?.difference);
  if (Number.isFinite(diff) && diff >= 0) return diff;

  if (data2?.start_time) {
    const startMs = new Date(data2.start_time).getTime();
    if (Number.isFinite(startMs)) {
      return Math.max(Math.floor((Date.now() - startMs) / 1000), 0);
    }
  }
  return 0; // genuinely unknown — 0 is at least honest, not a fake 5:00
}

// Reads CallSession/{channelId}'s max_minutes/last_tick_at/started_at — the
// exact same fields ChatContext's own countdown correction already uses —
// so restored chat and restored audio both derive their remaining time from
// one shared, server-authoritative source instead of separate guesses.
function readCallSessionRemaining(channelId, rate, wallet) {
  return new Promise((resolve) => {
    try {
      const sessionRef = ref(db, `CallSession/${channelId}`);
      onValue(sessionRef, (snap) => {
        off(sessionRef);
        const d = snap.val();
        if (!d) { resolve(null); return; }
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
          resolve(null);
        }
      }, { onlyOnce: true });
    } catch {
      resolve(null);
    }
  });
}

/**
 * RestoreOngoingSession
 *
 * Mount ONCE at the app root — right next to <ActiveCallBar /> and
 * <ActiveChatBar /> in App.jsx. On first load (including a hard page
 * refresh), checks /last_call_list for a session that's still active
 * server-side and re-attaches to it, bringing the floating bars back to
 * life. JS equivalent of Dart's OngoingChatProvider.restoreOngoingChat()
 * and the reference project's useLastCallStatus hook.
 *
 * CHAT: restored via ChatContext.startChatTimer() — unchanged, was already
 * fully supported since no token is involved.
 *
 * AUDIO: NOW fully restorable. Your backend added a real /agora_token
 * endpoint, so this fetches a fresh token for the existing channel_id and
 * hands it to agoraManager directly — the same module-level singleton
 * AudioCall.jsx uses — so the call is genuinely reconnected in the
 * background. AudioCallContext is populated and immediately minimized
 * (ActiveCallBar shows), since the user isn't sitting on /consultation/
 * call/:id at the moment of restore. Opening that page later, agoraManager
 * is already connected to the right channel, so AudioCall.jsx's own
 * "already connected" check skips straight to syncing UI instead of
 * rejoining.
 *
 * VIDEO: this app doesn't support video calls on web — shows a "continue
 * in the app" prompt instead.
 */
const RestoreOngoingSession = () => {
  const chatCtx = useChat();
  const audioCtx = useAudioCall();
  const chatCtxRef = useRef(chatCtx);
  const audioCtxRef = useRef(audioCtx);
  useEffect(() => { chatCtxRef.current = chatCtx; }, [chatCtx]);
  useEffect(() => { audioCtxRef.current = audioCtx; }, [audioCtx]);

  const triedRef = useRef(false);
  const [showAppDownload, setShowAppDownload] = useState(false);

  useEffect(() => {
    if (triedRef.current) return;
    triedRef.current = true;

    (async () => {
      try {
        const { result, data2 } = await lastCallList();
        console.log('[RestoreOngoingSession] last_call_list:', { result, data2 });
        if (!result || !data2) return;

        const status = String(data2.status || '').toLowerCase();
        const callType = String(data2.call_type || '').toLowerCase();
        const channelId = String(data2.channel_id || '');

        const isAudio = !callType || callType.includes('audio') || callType.includes('call') || callType.includes('voice');
        const isChat = callType.includes('chat');
        const isAccepted = ACCEPTED_STATUSES.includes(status) || status.includes('accept') || status.includes('ongoi') || status.includes('activ');

        // Also skip any call that already has a terminal status — the backend
        // may return the just-ended call for a few seconds before it clears.
        const TERMINAL_STATUSES = ['end_user', 'end_astro', 'disconnect_user', 'reject_astro', 'rejected', 'ended', 'end'];
        const isTerminal = TERMINAL_STATUSES.includes(status);

        if (!channelId || !isAccepted || isTerminal) {
          console.log('[RestoreOngoingSession] no active session to restore, status:', status);
          return;
        }

        const path = window.location.pathname;
        if (isAudio && path.startsWith('/consultation/call/')) {
          console.log('[RestoreOngoingSession] already on the audio call page — letting it self-recover.');
          return;
        }
        if (isChat && path.startsWith('/consultation/chat/')) {
          console.log('[RestoreOngoingSession] already on the chat page — letting it self-recover.');
          return;
        }

        const rate = String(data2.call_rate || '5');
        let wallet = String(data2.total_amount || '0');
        try {
          const w = await getWalletBalance();
          if (w > 0) wallet = String(w);
        } catch (err) {
          console.error('[RestoreOngoingSession] failed to fetch real wallet balance:', err);
        }

        const fallbackSeconds = resolveElapsedSeconds(data2);

        if (isChat) {
          if (chatCtxRef.current.chatActive) {
            console.log('[RestoreOngoingSession] chat already active in this session, skipping');
            return;
          }
          const info = {
            gid: channelId,
            fbchannelID: data2.fb_channel_id || channelId,
            astrologer_id: data2.astro_id,
            astroName: data2.astro_name || 'Astrologer',
            astrologerImage: data2.astro_profile_img || '',
            rate,
            wallet,
          };
          const accurate = await readCallSessionRemaining(channelId, rate, wallet);
          console.log('[RestoreOngoingSession] restoring chat, seconds:', accurate ?? fallbackSeconds);
          chatCtxRef.current.startChatTimer(info, accurate ?? fallbackSeconds);

        } else if (isAudio) {
          if (audioCtxRef.current.callInfo?.channelId === channelId) {
            console.log('[RestoreOngoingSession] audio already active in this session, skipping');
            return;
          }

          const info = {
            channelId,
            astrologerId: data2.astro_id,
            astroName: data2.astro_name || 'Astrologer',
            astroImage: data2.astro_profile_img || '',
            rate,
            wallet,
          };

          console.log('[RestoreOngoingSession] restoring audio call, fetching fresh token...');
          const token = await fetchAgoraToken(channelId);
          if (!token) {
            console.warn('[RestoreOngoingSession] could not get an Agora token — audio call not restored.');
            return;
          }

          audioCtxRef.current.startCall(info);
          audioCtxRef.current.minimize(); // show as floating bar — not the full page
          audioCtxRef.current.setElapsedSeconds(fallbackSeconds); // best-known elapsed, corrected once connected

          agoraManager.setListeners({
            onAudioStarted: () => {
              audioCtxRef.current.setCallStatus('connected');
            },
            onUserLeft: () => {
              audioCtxRef.current.endCall();
            },
            onError: (msg) => {
              console.error('[RestoreOngoingSession] agoraManager error while restoring:', msg);
            },
          });
          agoraManager.join(channelId, token);

        } else if (callType === 'video') {
          setShowAppDownload(true);
        }
      } catch (err) {
        console.error('[RestoreOngoingSession] failed:', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
<></>
    // <div></div>
    // <NewAppDownloadModal
    //   isOpen={showAppDownload}
    //   onClose={() => setShowAppDownload(false)}
    //   title="Continue your video consultation"
    //   subtitle="Video calls are available in the DivinIQ app — download it to rejoin your session."
    // />
  );
};

export default RestoreOngoingSession;