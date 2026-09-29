/**
 * Livewatchscreen.jsx  —  Route: /live/:liveId
 *
 * UI rewritten to Bootstrap 5 utilities + a shared custom stylesheet
 * (LiveAstrologer.css, prefix "lw-") instead of Tailwind. Every hook,
 * ref, Firebase listener, Agora call, and handler below is UNCHANGED
 * from the original — only className markup, imports, and the side
 * button accent colors (now DiviniQ maroon/saffron/gold) were touched.
 *
 * Imports fixed to match this project:
 *   - db comes from '../services/liveFirebase' (same file
 *     ChatConsultation.jsx / AudioCall.jsx / ChatCallingScreen.jsx use)
 *   - fetchAgoraToken comes from '../services/liveService' (already
 *     exists there — no separate ./agoraToken file needed)
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import AgoraRTC from "agora-rtc-sdk-ng";
import { createPortal } from "react-dom";

import { db } from "../services/liveFirebase";
import {
  ref, push, set, onChildAdded, off, query, limitToLast, orderByChild,
  onValue,
} from "firebase/database";

import { fetchAgoraToken } from "../services/liveService";
import apiService from "../services/apiServices";
import { recordGiftTransaction, notifyAstrologerGiftInFirebase } from "../services/giftService";
import LoginOTPModal from "../components/accounts/LoginOTPModel";
import storageService from "../services/storageServices";

import "./LiveAstrologer.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const AGORA_APP_ID = "8782e154141a4c0bbc8acaa3004d21f2";
// Dev: goes through the Vite proxy defined in vite.config.ts (/api ->
// https://admin.astrogurujii.com), which sidesteps the browser CORS
// preflight entirely since the request becomes same-origin. This got
// reverted back to the raw domain in the DiviniQ re-theme edit, which is
// why gift_list / join_live / listing_of_live_astrlogers stopped calling
// again — same root cause as before, re-fixed the same way.
// Prod: set VITE_API_BASE_URL to the real backend host (works only if
// that host sends proper Access-Control-Allow-Origin headers for these
// routes).
const API = import.meta.env.VITE_API_BASE_URL || "/api";
const tok = () => localStorage.getItem("token") ?? "";
const myName = () => localStorage.getItem("name") || "Viewer";
const myId = () => localStorage.getItem("id") || "web_user";
const myUser = () => {
  try {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const myImg = () => {
  const u = myUser();
  if (!u) return "";
  return u.image || u.profile_img || u.avatar || u.img || u.profile_image || u.file || "";
};

// DiviniQ theme accents used by the right-side action rail
const DQ_MAROON = "#7A1E1E";
const DQ_MAROON_DEEP = "#4a0f1e";
const DQ_SAFFRON = "#F5A623";
const DQ_GOLD = "#D4AF37";
const DQ_SUCCESS = "#0B845C";
const DQ_MUTED = "#a89a8a";

const STATIC_GIFTS = [
  { _id: "1", name: "Flowers", price: 11, emoji: "🌸" },
  { _id: "2", name: "Namaste", price: 5, emoji: "🙏" },
  { _id: "3", name: "Dakshina", price: 501, emoji: "💰" },
  { _id: "4", name: "Pooja Thali", price: 101, emoji: "🪔" },
  { _id: "5", name: "Kalash", price: 51, emoji: "🏺" },
  { _id: "6", name: "Gemstone", price: 1001, emoji: "💎" },
  { _id: "7", name: "Sweets", price: 151, emoji: "🍬" },
  { _id: "8", name: "Shivling", price: 5001, emoji: "🕉️" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const gImg = (g) => g.icon || g.image || g.img || "";
const gName = (g) => g.name || g.title || "Gift";
const gEmoji = (g) => g.emoji || "🎁";
const fmtTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const fmtTs = (ts) => {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
const avatarUrl = (name) => {
  const init = getInitials(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#7A1E1E"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-size="24" font-weight="bold" font-family="sans-serif">${init}</text></svg>`;
  try {
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  } catch {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
};

// Same fix as Livecard.jsx: this backend blocks direct-from-browser
// requests for images too (not just the API), so absolute
// admin.astrogurujii.com image URLs get rewritten to go through the same
// /api proxy as the API calls instead of hitting the raw domain.
const ASTRO_FALLBACK_IMAGES = [
  "/assets/img/team/team_1_1.jpg",
  "/assets/img/team/team_2_1.jpg",
  "/assets/img/team/team_3_1.jpg",
  "/assets/img/team/team_4_1.jpg",
  "/assets/img/team/team_5_1.jpg",
  "/assets/img/home/men.png",
];

function isRealApiUrl(path) {
  if (!path) return false;
  const clean = String(path).trim().toLowerCase();
  if (!clean) return false;

  const dummyKeywords = [
    "ui-avatars",
    "placeholder",
    "dummy",
    "placehold",
    "280",
    "424",
    "312",
    "default",
    "no-image",
    "noimage",
    "via.",
    "sample",
    "team_",
    "astrologer_1",
    "astrologer_2",
    "astrologer_3",
    "astrologer_4"
  ];

  for (const kw of dummyKeywords) {
    if (clean.includes(kw)) return false;
  }
  return true;
}

const getInitials = (name = "") => {
  const clean = String(name || "").trim();
  if (!clean || clean === "--") return "A";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
};

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #7A1E1E 0%, #4A0F1E 100%)",
  "linear-gradient(135deg, #8A4B1F 0%, #4A200A 100%)",
  "linear-gradient(135deg, #1F6F5C 0%, #0B3A30 100%)",
  "linear-gradient(135deg, #4B3F8A 0%, #221A4A 100%)",
  "linear-gradient(135deg, #A3441F 0%, #5C200A 100%)",
];

const getAvatarBg = (name = "") => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
};

const resolveImg = (path, name = "Astrologer") => {
  let clean = (path || "").trim();
  if (!isRealApiUrl(clean)) {
    return "";
  }
  clean = clean
    .replace("admin.astrogurujii.com", "admin.vaidikguru.com")
    .replace("admin.astropush.com", "admin.vaidikguru.com");
  if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("data:") || clean.startsWith("/assets/")) {
    return clean;
  }
  return `https://admin.vaidikguru.com/${clean.replace(/^\/+/, "")}`;
};

// ─── App Modal ────────────────────────────────────────────────────────────────
function AppModal({ onClose }) {
  return createPortal(
    <div className="lw-modal-overlay">
      <div className="lw-modal-card">
        <div className="lw-modal-header-brand">
          <p className="lw-modal-header-brand-title">Download App to Call</p>
          <button onClick={onClose} className="lw-modal-close-x">✕</button>
        </div>
        <div className="lw-app-modal-body">
          <div className="lw-app-modal-icon">🔮</div>
          <p className="lw-app-modal-title">VaidikGuru App</p>
          <p className="lw-app-modal-desc">
            Audio & video calls with astrologers are available on our mobile app.
          </p>
          <a href="https://play.google.com/store/apps/details?id=com.app.vaidikguru"
            target="_blank" rel="noopener noreferrer" className="w-100">
            <div className="lw-playstore-btn">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.587l1.984 1.147a1 1 0 010 1.746l-1.984 1.147L15.414 12l2.284-2.88zM5.864 2.658L16.8 8.99l-2.302 2.302-8.635-8.635z" />
              </svg>
              <div className="text-start">
                <p className="lw-playstore-text-small">Get it on</p>
                <p className="lw-playstore-text-big">Google Play</p>
              </div>
            </div>
          </a>
          <button onClick={onClose} className="lw-app-modal-continue">Continue watching</button>
        </div>
      </div>
    </div>, document.body
  );
}

// ─── Gift Modal ───────────────────────────────────────────────────────────────
function GiftModal({ gifts, astroName, astroId, channelId, onClose }) {
  const [sel, setSel] = useState(null);
  const [sending, setSending] = useState(false);
  const [imgFailed, setImgFailed] = useState({});

  const handleSend = async () => {
    if (sel === null || sending) return;
    const gift = gifts[sel];
    setSending(true);
    try {
      await apiService.postBearer("/user_api/gift_transaction", {
        to: String(astroId),
        astro_id: String(astroId),
        astrologer_id: String(astroId),
        giftId: String(gift._id),
        gift_id: String(gift._id),
        amount: Number(gift.price),
        type: "normal",
      });
      recordGiftTransaction({ gift, astroName, astroId, amount: gift.price });
      notifyAstrologerGiftInFirebase({ gift, astroId, astroName, channelId });
    } catch (e) {
      console.warn("[GiftModal] Gift transaction warning:", e);
    } finally {
      setSending(false);
    }
    onClose({ gift });
  };

  return createPortal(
    <div className="lw-modal-overlay">
      <div className="lw-modal-card">
        <div className="lw-gift-header">
          <div>
            <p className="lw-gift-header-title">Send a Gift</p>
            <p className="lw-gift-header-sub">to {astroName}</p>
          </div>
          <button onClick={() => onClose()} className="lw-gift-close">✕</button>
        </div>
        <div className="lw-gift-grid">
          {gifts.map((g, i) => {
            const rawUrl = gImg(g);
            const hasUrl = rawUrl && isRealApiUrl(rawUrl) && !imgFailed[g._id];
            return (
              <button key={g._id || i} onClick={() => setSel(i)}
                className={`lw-gift-item${sel === i ? " selected" : ""}`}>
                <div className="lw-gift-icon-wrap">
                  {hasUrl ? (
                    <img
                      src={resolveImg(rawUrl)}
                      alt={gName(g)}
                      className="w-100 h-100"
                      style={{ objectFit: "cover" }}
                      onError={() => setImgFailed(prev => ({ ...prev, [g._id]: true }))}
                    />
                  ) : (
                    <span style={{ fontSize: 24, lineHeight: 1 }}>{gEmoji(g)}</span>
                  )}
                </div>
                <span className="lw-gift-name">{gName(g)}</span>
                <span className="lw-gift-price">₹{g.price}</span>
              </button>
            );
          })}
        </div>
        <div className="lw-gift-footer">
          <button disabled={sel === null || sending} onClick={handleSend} className="lw-gift-send-btn">
            {sending && <span className="lw-gift-spinner" />}
            {sel !== null ? `Send ${gName(gifts[sel])} · ₹${gifts[sel].price}` : "Select a Gift"}
          </button>
        </div>
      </div>
    </div>, document.body
  );
}

// ─── Leave Popup ──────────────────────────────────────────────────────────────
function LeavePopup({
  loadingLives, otherLives, onStay, onLeave, onJoinOther, followed, onFollow,
}) {
  return createPortal(
    <div className="lw-leave-overlay">
      <div className="lw-leave-sheet">
        <div className="lw-leave-handle-wrap">
          <div className="lw-leave-handle" />
        </div>
        <div className="lw-leave-header">
          <div>
            <h3 className="lw-leave-title">Leave this Live?</h3>
            <p className="lw-leave-sub">Or jump into another live session</p>
          </div>
          <button onClick={onStay} className="lw-back-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="lw-leave-body">
          {loadingLives ? (
            <div className="lw-leave-loading">
              <div className="lw-leave-spinner" />
            </div>
          ) : otherLives.length === 0 ? (
            <div className="lw-leave-empty">
              <span style={{ fontSize: 30 }}>📡</span>
              <p className="text-muted small mb-0">No other live sessions right now</p>
            </div>
          ) : (
            <>
              <p className="lw-leave-list-title">Live Now</p>
              <div className="lw-leave-list">
                {otherLives.map((a) => {
                  const rawPath = a.profile_image || a.profile_img || a.image || a.img || a.avatar || a.profileImg || a.astrologer_id?.profile_img;
                  const validImg = resolveImg(rawPath, a.name);
                  const finalSrc = validImg || avatarUrl(a.name);
                  return (
                    <button key={a.astro_id || a._id || a.name} onClick={() => onJoinOther(a)} className="lw-leave-item">
                      <div className="lw-leave-item-avatar-wrap">
                        <img
                          src={finalSrc}
                          alt={a.name}
                          className="lw-leave-item-avatar"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = avatarUrl(a.name);
                          }}
                        />
                        <span className="lw-leave-item-live-tag">LIVE</span>
                      </div>
                    <div className="lw-leave-item-body">
                      <p className="lw-leave-item-name mb-0">{a.name}</p>
                      {a.title && <p className="lw-leave-item-sub mb-0">{a.title}</p>}
                      {(a.viewers ?? 0) > 0 && (
                        <p className="lw-leave-item-viewers mb-0">
                          👁 {(a.viewers ?? 0) >= 1000 ? `${((a.viewers ?? 0) / 1000).toFixed(1)}K` : a.viewers} watching
                        </p>
                      )}
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7A1E1E" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                );
              })}
            </div>
            </>
          )}
        </div>
        <div className="lw-leave-actions">
          <button onClick={onLeave} className="lw-leave-btn lw-leave-btn-outline">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B33A3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Leave Now
          </button>
          <button onClick={() => { onFollow(); onLeave(); }} className="lw-leave-btn lw-leave-btn-solid">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            Follow & Leave
          </button>
        </div>
      </div>
    </div>, document.body
  );
}

// ─── Message Row ──────────────────────────────────────────────────────────────
function MsgRow({ msg }) {
  const rawUserImg = msg.user_img || msg.profile_img || msg.avatar || msg.image || msg.profile_image || (msg.from === myId() ? myImg() : "");
  const hasUserImg = rawUserImg && isRealApiUrl(rawUserImg);
  const userAvatarSrc = hasUserImg ? resolveImg(rawUserImg, msg.name) : avatarUrl(msg.name);

  if (msg.is_system) {
    return (
      <div className="lw-msg-system">
        <span className="lw-msg-system-pill">{msg.message}</span>
      </div>
    );
  }
  if (msg.isGift) {
    const rawImg = msg.giftImg || "";
    const hasRealImg = rawImg && isRealApiUrl(rawImg);
    return (
      <div className="lw-msg-row">
        <img
          src={userAvatarSrc}
          alt={msg.name}
          className="lw-msg-avatar"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = avatarUrl(msg.name);
          }}
        />
        <div className="lw-msg-content">
          <div className="lw-msg-top">
            <p className="lw-msg-name mb-0">{msg.name}</p>
            <span className="lw-msg-time">{fmtTs(msg.date_time)}</span>
          </div>
          <div className="lw-msg-gift-row" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {hasRealImg ? (
              <img
                src={resolveImg(rawImg)}
                className="lw-msg-gift-img"
                alt={msg.giftName || "Gift"}
                onError={(e) => { e.target.style.display = "none"; if (e.target.nextSibling) e.target.nextSibling.style.display = "inline"; }}
              />
            ) : null}
            <span style={{ fontSize: 18, lineHeight: 1, display: hasRealImg ? "none" : "inline" }}>
              {msg.giftEmoji || "🎁"}
            </span>
            <span className="lw-msg-text mb-0">
              gifted <b>{msg.giftName || "a Gift"}</b>
            </span>
          </div>
        </div>
      </div>
    );
  }
  const isMe = msg.from === myId();
  return (
    <div className="lw-msg-row">
      <img
        src={userAvatarSrc}
        alt={msg.name}
        className="lw-msg-avatar"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = avatarUrl(msg.name);
        }}
      />
      <div className="lw-msg-content">
        <div className="lw-msg-top">
          <p className={`lw-msg-name mb-0${isMe ? " me" : ""}`}>{msg.name}</p>
          <span className="lw-msg-time">{fmtTs(msg.date_time)}</span>
        </div>
        <p className="lw-msg-text mb-0">{msg.message}</p>
      </div>
    </div>
  );
}

// ─── Video Placeholder ────────────────────────────────────────────────────────
function VideoPlaceholder({ name, img, title }) {
  const [err, setErr] = useState(false);
  const hasReal = isRealApiUrl(img);
  const realUrl = hasReal ? resolveImg(img, name) : null;

  return (
    <div className="d-flex flex-column align-items-center justify-content-center gap-3 px-4 text-center h-100 w-100">
      <div className="lw-placeholder-avatar-wrap">
        {realUrl && !err ? (
          <img src={realUrl} alt={name} onError={() => setErr(true)} className="lw-placeholder-avatar" />
        ) : (
          <div
            className="lw-placeholder-avatar-letter"
            style={{ background: getAvatarBg(name) }}
          >
            {getInitials(name)}
          </div>
        )}
        <span className="lw-online-dot" />
      </div>
      <div className="text-center">
        <p className="lw-placeholder-name mb-0">{name}</p>
        <p className="lw-placeholder-title mb-0 mx-auto">{title}</p>
      </div>
      <div className="lw-bounce-dots">
        {[0, 1, 2].map((i) => (
          <div key={i} className="lw-bounce-dot" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
    </div>
  );
}

// ─── Side Button ──────────────────────────────────────────────────────────────
function SideBtn({ icon, label, onClick, color = DQ_MAROON }) {
  return (
    <button onClick={onClick} className="lw-side-btn">
      <div className="lw-side-btn-icon" style={{ background: color }}>{icon}</div>
      <span className="lw-side-btn-label">{label}</span>
    </button>
  );
}

// ─── Bottom Live Strip ────────────────────────────────────────────────────────
function BottomLiveStrip({ lives, loading, onJoin }) {
  return (
    <div className="lw-strip">
      <p className="lw-strip-title">
        <span className="lw-strip-dot" />
        Also Live Now
      </p>
      <div className="lw-strip-row">
        {loading && lives.length === 0 && [1, 2, 3, 4, 5].map(i => (
          <div key={i} className="lw-strip-item">
            <div className="lw-strip-skel-avatar" />
            <div className="lw-strip-skel-name" />
          </div>
        ))}

        {lives.map((a) => {
          const hasImg = isRealApiUrl(a.profile_image);
          const realUrl = hasImg ? resolveImg(a.profile_image) : null;
          return (
            <button key={a.astro_id} onClick={() => onJoin(a)} className="lw-strip-item">
              <div className="lw-strip-avatar-wrap">
                <span className="lw-strip-ring-ping" />
                <span className="lw-strip-ring" />
                {realUrl ? (
                  <img
                    src={realUrl}
                    alt={a.name}
                    className="lw-strip-avatar"
                  />
                ) : (
                  <div className="lw-strip-avatar-fallback" style={{ background: getAvatarBg(a.name) }}>
                    {getInitials(a.name)}
                  </div>
                )}
                <span className="lw-strip-live-tag">LIVE</span>
              </div>
              <p className="lw-strip-name mb-0 mt-1">{a.name.split(" ")[0]}</p>
            </button>
          );
        })}

        {!loading && lives.length === 0 && (
          <div className="lw-strip-empty">No other astrologers live</div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LiveWatchScreen() {
  const navigate = useNavigate();
  const { liveId } = useParams();
  const { state } = useLocation();

  const s = useMemo(() => {
    if (state) {
      try { sessionStorage.setItem(`live_state_${liveId}`, JSON.stringify(state)); } catch { }
      return state;
    }
    try {
      const cached = sessionStorage.getItem(`live_state_${liveId}`);
      if (cached) return JSON.parse(cached);
    } catch { }
    return {};
  }, [state, liveId]);
  const channelId = s.channel_id || liveId || "";
  const astroId = s.astro_id || "";
  const astroName = s.astro_name || "Astrologer";
  const astroImage = resolveImg(s.astro_image || "");
  const liveTitle = s.title || "Live Session";
  const liveType = s.live_type || "home";
  const sessionRate = s.rate || "";

  // ── State (UNCHANGED) ────────────────────────────────────────────────────
  const [hasVideo, setHasVideo] = useState(false);
  const [viewers, setViewers] = useState(s.viewers ?? 0);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [waitElapsed, setWaitElapsed] = useState(0);
  const [gifts, setGifts] = useState(STATIC_GIFTS);
  const [showGifts, setShowGifts] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showApp, setShowApp] = useState(false);
  const [giftToast, setGiftToast] = useState(null);
  const [isMaximized, setIsMaximized] = useState(false);

  const handleGiftClick = () => {
    const token = storageService.getToken() || localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) {
      setShowLoginModal(true);
      return;
    }
    setShowGifts(true);
  };
  const astroKey = String(astroId || channelId || s.astro_name || "").trim();
  const [followed, setFollowed] = useState(false);

  useEffect(() => {
    if (!astroKey) return;
    try {
      const isF =
        localStorage.getItem(`followed_astro_${astroKey}`) === "true" ||
        (astroId && localStorage.getItem(`followed_astro_${astroId}`) === "true") ||
        (channelId && localStorage.getItem(`followed_astro_${channelId}`) === "true") ||
        (s.astro_name && localStorage.getItem(`followed_astro_${s.astro_name}`) === "true");
      setFollowed(Boolean(isF));
    } catch { /* ignore */ }
  }, [astroKey, astroId, channelId, s.astro_name]);

  const handleToggleFollow = () => {
    setFollowed((prev) => {
      const next = !prev;
      try {
        if (astroKey) localStorage.setItem(`followed_astro_${astroKey}`, String(next));
        if (channelId) localStorage.setItem(`followed_astro_${channelId}`, String(next));
        if (astroId) localStorage.setItem(`followed_astro_${astroId}`, String(next));
        if (s.astro_name) localStorage.setItem(`followed_astro_${s.astro_name}`, String(next));
      } catch { /* ignore */ }
      return next;
    });
  };
  const [imgErr, setImgErr] = useState(false);

  const [showLeavePopup, setShowLeavePopup] = useState(false);
  const [otherLives, setOtherLives] = useState([]);
  const [loadingLives, setLoadingLives] = useState(false);

  const [agoraStatus, setAgoraStatus] = useState("idle");
  const [agoraErr, setAgoraErr] = useState("");
  const [fbStatus, setFbStatus] = useState("idle");
  const [fbErr, setFbErr] = useState("");

  // ── Refs (UNCHANGED) ─────────────────────────────────────────────────────
  const videoRef = useRef(null);
  const clientRef = useRef(null);
  const chatEnd = useRef(null);
  const chatMsgsRef = useRef(null);
  const inputRef = useRef(null);
  const timerRef = useRef();
  // Tracks the currently active astrologer/live session. Old Agora callbacks are ignored after a switch.
  const sessionRef = useRef(0);

  const log = useCallback((level, msg) => {
    console[level === "success" ? "log" : level](`[Live] ${msg}`);
  }, []);

  // ── Fetch gift list ────────────────────────────────────────────────────────
  // Was hitting /user_api/gift_list, which doesn't exist on this backend —
  // SendGiftModal.tsx (a working component elsewhere in the project) uses
  // /user_api/get_gifts instead. That 404 was unrelated to the CORS issue
  // fixed above; switching to the real endpoint.
  useEffect(() => {
    apiService.getBearer('/user_api/get_gifts')
      .then(res => {
        const list = res?.data || res?.results || res?.gifts || (Array.isArray(res) ? res : []);
        if (Array.isArray(list) && list.length > 0) setGifts(list);
      })
      .catch(() => { });
  }, []);

  // ── Join live API ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!liveId) return;
    const ep = liveType === "pooja" ? "/user_api/join_live_pooja" : "/user_api/join_live";
    apiService.postBearer(ep, { live_id: liveId })
      .catch(() => { });
  }, [liveId, liveType]);

  // ── Agora ──────────────────────────────────────────────────────────────────
  const initAgora = useCallback(async (sessionId = sessionRef.current) => {
    if (!channelId) {
      setAgoraErr(`No channel_id. liveId="${liveId}" state.channel_id="${s.channel_id}"`);
      setAgoraStatus("error");
      return;
    }
    const oldClient = clientRef.current;
    clientRef.current = null;

    if (oldClient) {
      try {
        oldClient.removeAllListeners?.();
        await oldClient.leave();
      } catch { }
    }

    if (sessionId !== sessionRef.current) return;
    setAgoraStatus("connecting");
    setAgoraErr("");
    AgoraRTC.setLogLevel(0);
    try {
      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });

      if (sessionId !== sessionRef.current) {
        try { client.removeAllListeners?.(); await client.leave(); } catch {}
        return;
      }

      clientRef.current = client;
      await client.setClientRole("audience", { level: 1 });

      client.on("user-published", async (user, mediaType) => {
        if (sessionId !== sessionRef.current || clientRef.current !== client) return;
        try {
          await client.subscribe(user, mediaType);
          if (mediaType === "video") {
            setHasVideo(true);
            if (videoRef.current) {
              user.videoTrack?.play(videoRef.current);
              const tryStyle = () => {
                const v = videoRef.current?.querySelector("video");
                if (v) { v.style.width = "100%"; v.style.height = "100%"; v.style.objectFit = "cover"; }
                else setTimeout(tryStyle, 300);
              };
              tryStyle();
            }
          }
          if (mediaType === "audio") { user.audioTrack?.play(); }
        } catch (err) { log("error", `subscribe failed: ${err?.message}`); }
      });
      client.on("user-unpublished", (_, mt) => {
        if (sessionId !== sessionRef.current || clientRef.current !== client) return;
        if (mt === "video") setHasVideo(false);
      });
      client.on("user-left", () => {
        if (sessionId !== sessionRef.current || clientRef.current !== client) return;
        setHasVideo(false);
        setAgoraStatus("no_broadcaster");
        setAgoraErr("Broadcaster has left the stream.");
      });
      client.on("connection-state-change", (cur, _prev, reason) => {
        log("info", `Agora: ${_prev} → ${cur}${reason ? ` (${reason})` : ""}`);
        if (cur === "CONNECTED") { setAgoraStatus("connected"); setAgoraErr(""); }
        if (cur === "DISCONNECTED") { setAgoraStatus("error"); setAgoraErr("Disconnected."); }
        if (cur === "RECONNECTING") setAgoraErr("Reconnecting…");
      });
      client.on("exception", (evt) => log("error", `Agora exception: ${evt.code} ${evt.msg}`));

      const agoraToken = await fetchAgoraToken(channelId);
      await client.join(AGORA_APP_ID, channelId, agoraToken, 0);
      setAgoraStatus("connected");
    } catch (err) {
      if (sessionId !== sessionRef.current) return;

      const raw = err?.message || String(err);
      let msg = `Agora join failed: ${raw}`;
      if (raw.includes("CAN_NOT_GET_GATEWAY_SERVER")) msg = "Token rejected — App ID or Certificate mismatch.";
      else if (raw.includes("INVALID_TOKEN")) msg = "Invalid token from backend.";
      else if (raw.includes("NOT_AUTHORIZED")) msg = "Not authorised for this channel.";
      else if (raw.includes("UID_CONFLICT")) msg = "UID conflict — try refreshing.";
      setAgoraStatus("error");
      setAgoraErr(msg);
    }
  }, [channelId, liveId, s.channel_id]);

  const cleanupLiveSession = useCallback(async (sessionId = sessionRef.current) => {
    // Invalidate all async/event callbacks belonging to this session.
    sessionRef.current += 1;

    clearInterval(timerRef.current);
    clearInterval(waitTimerRef.current);

    const webUserId = myId() || `web_${Date.now()}`;

    if (channelId) {
      try {
        await set(ref(db, `LiveViewers/${channelId}/${webUserId}`), null);
      } catch {}
    }

    const client = clientRef.current;
    clientRef.current = null;

    if (client) {
      try {
        client.removeAllListeners?.();
        await client.leave();
      } catch (err) {
        console.error("[LiveWatchScreen] Agora cleanup error:", err);
      }
    }

    setHasVideo(false);
    setAgoraStatus("idle");
    setAgoraErr("");
    setFbStatus("idle");
    setFbErr("");
  }, [channelId]);

  // ── Firebase chat ──────────────────────────────────────────────────────────
  const initChat = useCallback(() => {
    if (!channelId) { setFbErr("No channel ID for chat"); return; }
    setFbStatus("connecting");
    try {
      const msgRef = query(ref(db, `GroupLive/${channelId}`), orderByChild("date_time"), limitToLast(50));
      const handler = onChildAdded(msgRef, snap => {
        const v = snap.val();
        if (!v) return;
        setFbStatus("listening");
        setFbErr("");
        setMsgs(prev => {
          if (prev.some(m => m.id === snap.key || (m.message_id && String(m.message_id) === String(snap.key)))) return prev;
          const entry = {
            id: snap.key,
            name: v.name || v.sender || "Viewer",
            message: v.message || v.text || "",
            from: v.from || v.from_id || "",
            date_time: typeof v.date_time === "number" ? v.date_time : typeof v.ts === "number" ? v.ts : Date.now(),
            is_system: !!v.is_system,
            isGift: !!v.isGift,
            giftName: v.giftName,
            giftEmoji: v.giftEmoji,
            giftImg: v.giftImg,
          };
          return [...prev, entry].slice(-100);
        });
      }, err => {
        setFbStatus("error");
        setFbErr(`Firebase listener error: ${err.message}`);
      });
      setFbStatus("listening");
      return () => { off(ref(db, `GroupLive/${channelId}`), "child_added", handler); };
    } catch (err) {
      setFbStatus("error");
      setFbErr(`Firebase init error: ${err.message}`);
    }
  }, [channelId]);

  // Real-time viewer count from Firebase LiveViewers/{channelId}
  useEffect(() => {
    if (!channelId) return;
    const viewerRef = ref(db, `LiveViewers/${channelId}`);
    const unsub = onValue(viewerRef, (snap) => {
      const val = snap.val();
      const count = val && typeof val === "object" ? Object.keys(val).length : 0;
      setViewers(count);
    });
    return () => unsub();
  }, [channelId]);

  // Write this web viewer's presence so the count increments
  useEffect(() => {
    if (!channelId || agoraStatus !== "connected") return;
    const webUserId = myId() || `web_${Date.now()}`;
    const presenceRef = ref(db, `LiveViewers/${channelId}/${webUserId}`);
    set(presenceRef, true).catch(() => { });
    return () => {
      set(presenceRef, null).catch(() => { });
    };
  }, [channelId, agoraStatus]);

  // ── Timers ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (agoraStatus !== "connected") return;
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [agoraStatus]);

  const waitTimerRef = useRef();
  useEffect(() => {
    if (agoraStatus === "connected" && !hasVideo) {
      setWaitElapsed(0);
      waitTimerRef.current = setInterval(() => setWaitElapsed(e => e + 1), 1000);
    } else {
      clearInterval(waitTimerRef.current);
      if (hasVideo) setWaitElapsed(0);
    }
    return () => clearInterval(waitTimerRef.current);
  }, [agoraStatus, hasVideo]);

  useEffect(() => {
    const el = chatMsgsRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [msgs]);

  // ── Live session lifecycle ───────────────────────────────────────────────────
  useEffect(() => {
    if (!liveId || !channelId) return;

    // Every route/liveId/channelId change gets a brand-new session generation.
    const sessionId = ++sessionRef.current;
    let cancelled = false;
    let cleanupChat = null;

    setShowLeavePopup(false);
    setMsgs([]);
    setHasVideo(false);
    setAgoraStatus("idle");
    setAgoraErr("");
    setFbStatus("idle");
    setFbErr("");
    isLeavingRef.current = false;

    const startSession = async () => {
      try {
        await initAgora(sessionId);

        if (cancelled || sessionId !== sessionRef.current) return;

        cleanupChat = initChat();
      } catch (err) {
        if (!cancelled && sessionId === sessionRef.current) {
          console.error("[LiveWatchScreen] session start error:", err);
        }
      }
    };

    startSession();

    return () => {
      cancelled = true;

      cleanupChat?.();

      clearInterval(timerRef.current);
      clearInterval(waitTimerRef.current);

      const client = clientRef.current;
      clientRef.current = null;

      if (client) {
        try {
          client.removeAllListeners?.();
          client.leave();
        } catch {}
      }
    };
  }, [liveId, channelId, initAgora, initChat]);

  // ── Fetch other live astrologers ──────────────────────────────────────────
  const fetchOtherLives = useCallback(async () => {
    setLoadingLives(true);

    try {
      const [liveRes, astroRes] = await Promise.all([
        apiService.getBearer('/user_api/listing_of_live_astrlogers').catch(() => null),
        apiService.postBearer('/user_api/astrologer_list', { search: "", page: "1" }).catch(() => null),
      ]);

      let rawLive = [];
      if (liveRes) {
        rawLive = liveRes.results || liveRes.data || (Array.isArray(liveRes) ? liveRes : []);
      }

      const seenAstro = new Set();
      const seenChannel = new Set();
      const mapped = [];

      for (const item of rawLive) {
        const astro = item.astrologer_id ?? item.astrologerId ?? {};
        const id = astro._id || item._id || "";
        const ch = item.channel_id || item.channelId || "";
        if (!ch || seenChannel.has(ch)) continue;
        if (String(ch) === String(channelId) || String(id) === String(astroId)) continue;
        const astroKey = id || `${astro.displayname || astro.name || ""}_${astro.profile_img || ""}`;
        if (astroKey && seenAstro.has(astroKey)) continue;
        seenChannel.add(ch);
        if (astroKey) seenAstro.add(astroKey);

        mapped.push({
          astro_id: id,
          name: astro.displayname || astro.name || "Astrologer",
          profile_image: astro.profile_img || astro.profileImg || "",
          title: item.title || "Live Session",
          channel_id: ch,
          live_type: "home",
          viewers: Array.isArray(item.users) ? item.users.length : 24,
          per_min_chat: astro.avg_rate || astro.per_min_chat || "",
          tags: item.tags || [],
        });
        if (mapped.length >= 15) break;
      }

      if (mapped.length > 0) {
        setOtherLives(mapped);
        return mapped;
      } else {
        // Fallback: build other live streams from active online astrologers (excluding current)
        let onlineList = [];
        if (astroRes) {
          const all = astroRes.results || astroRes.data || (Array.isArray(astroRes) ? astroRes : []);
          onlineList = all.filter((a) => (a.is_online == 1 || a.is_online === "1" || a.is_live == 1) && String(a._id || a.id) !== String(astroId));
        }

        if (onlineList.length === 0) {
          onlineList = [];
        }

        const fallbackOther = onlineList.map((astro, idx) => ({
          astro_id: astro._id || astro.id,
          name: astro.name || astro.displayname || "Astrologer",
          profile_image: astro.profile_img || astro.profileImg || `/assets/img/home/astrologer_${(idx % 4) + 1}.jpg`,
          title: `Live Guidance with ${astro.name || "Astrologer"}`,
          channel_id: `live_channel_${astro._id || astro.id || idx}`,
          live_type: "home",
          viewers: 15 + idx * 8,
          per_min_chat: astro.per_min_chat || 15,
        }));

        setOtherLives(fallbackOther);
        return fallbackOther;
      }
    } catch (err) {
      console.error("[LiveWatchScreen] fetchOtherLives failed:", err);
      return [];
    } finally {
      setLoadingLives(false);
    }
  }, [astroId, channelId]);

  useEffect(() => { fetchOtherLives(); }, [fetchOtherLives]);

  // ── Leave handling ─────────────────────────────────────────────────────────
  const isLeavingRef = useRef(false);

  const leave = useCallback(async () => {
    if (isLeavingRef.current) return;
    isLeavingRef.current = true;

    clearInterval(timerRef.current);
    clearInterval(waitTimerRef.current);

    // Remove web viewer presence from Firebase
    const webUserId = myId() || `web_${Date.now()}`;
    if (channelId) {
      try {
        set(ref(db, `LiveViewers/${channelId}/${webUserId}`), null).catch(() => {});
      } catch (e) {}
    }

    // Leave Agora RTC stream immediately
    try {
      if (clientRef.current) {
        await clientRef.current.leave();
        clientRef.current.removeAllListeners?.();
        clientRef.current = null;
      }
    } catch (err) {
      console.error("[LiveWatchScreen] Agora leave error:", err);
    }

    // Instant disconnect navigation
    window.location.href = "/live-astrologer";
  }, [channelId]);

  const handleBackPress = useCallback(() => {
    setShowLeavePopup(true);
    fetchOtherLives();
  }, [fetchOtherLives]);

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      if (isLeavingRef.current) return;
      window.history.pushState(null, "", window.location.href);
      setShowLeavePopup(true);
      fetchOtherLives();
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [fetchOtherLives]);

  const handleJoinOther = useCallback(async (a) => {
    if (!a?.channel_id || isLeavingRef.current) return;

    isLeavingRef.current = true;
    setShowLeavePopup(false);

    try {
      clearInterval(timerRef.current);
      clearInterval(waitTimerRef.current);

      const oldChannelId = channelId;
      const webUserId = myId() || `web_${Date.now()}`;

      // Remove presence from the astrologer we are leaving.
      if (oldChannelId) {
        try {
          await set(ref(db, `LiveViewers/${oldChannelId}/${webUserId}`), null);
        } catch {}
      }

      // Invalidate all async handlers from the old session.
      sessionRef.current += 1;

      const oldClient = clientRef.current;
      clientRef.current = null;

      if (oldClient) {
        try {
          oldClient.removeAllListeners?.();
          await oldClient.leave();
        } catch (err) {
          console.error("[LiveWatchScreen] Agora switch cleanup error:", err);
        }
      }

      setHasVideo(false);
      setMsgs([]);
      setAgoraStatus("idle");
      setAgoraErr("");
      setFbStatus("idle");
      setFbErr("");

      navigate(`/live/${a.channel_id}`, {
        replace: true,
        state: {
          channel_id: a.channel_id,
          astro_id: a.astro_id,
          astro_name: a.name,
          astro_image: a.profile_image,
          title: a.title || "Live Session",
          live_type: a.live_type || "home",
          viewers: a.viewers ?? 0,
          rate: a.per_min_chat || "",
          tags: a.tags || [],
        },
      });
    } catch (err) {
      console.error("[LiveWatchScreen] astrologer switch failed:", err);
    } finally {
      // Critical: allow the next astrologer switch.
      isLeavingRef.current = false;
    }
  }, [channelId, navigate]);

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMsg = () => {
    const text = input.trim();
    if (!text || !channelId) return;
    const msgRef = push(ref(db, `GroupLive/${channelId}`));
    const payload = {
      name: myName(), message: text, from: myId(),
      user_img: myImg(),
      date_time: Date.now(), is_system: false, message_id: msgRef.key,
    };
    set(msgRef, payload).catch(() => { });
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    inputRef.current?.focus();
  };

  // ── Send gift ──────────────────────────────────────────────────────────────
  const onGiftSent = (result) => {
    setShowGifts(false);
    if (!result || !channelId) return;
    const g = result.gift;
    setGiftToast(`${gEmoji(g)} ${gName(g)} sent!`);
    setTimeout(() => setGiftToast(null), 3000);
  };

  const share = () => {
    navigator.share?.({ title: astroName, text: liveTitle, url: window.location.href })
      .catch(() => navigator.clipboard?.writeText(window.location.href));
  };

  const toggleMaximize = useCallback(() => {
    const videoContainer = videoRef.current?.parentElement;
    if (videoContainer) {
      if (!isMaximized) {
        videoContainer.requestFullscreen?.().catch(() => {
          setIsMaximized(true);
        });
        setIsMaximized(true);
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen?.();
        }
        setIsMaximized(false);
      }
    }
  }, [isMaximized]);

  // ── Render (UI ONLY changed below) ────────────────────────────────────────
  return (
    <div className={`lw-root${isMaximized ? " lw-maximized" : ""}`}>

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      {!isMaximized && (
        <div className="lw-header">
          <button onClick={handleBackPress} className="lw-back-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {isRealApiUrl(astroImage) && !imgErr ? (
            <img src={resolveImg(astroImage, astroName)} alt={astroName} onError={() => setImgErr(true)} className="lw-avatar" />
          ) : (
            <div className="lw-avatar-fallback" style={{ background: getAvatarBg(astroName) }}>
              {getInitials(astroName)}
            </div>
          )}

          <div className="lw-msg-content">
            <div className="d-flex align-items-center gap-2">
              <p className="lw-name mb-0">{astroName}</p>
              <svg className="lw-verified-icon" viewBox="0 0 24 24" fill="#D4AF37">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="d-flex align-items-center gap-2 mt-1">
              <div className="lw-pill live">
                <span className="lw-pill-dot" />
                LIVE
              </div>
              <div className="lw-pill">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{fmtTime(elapsed)}</span>
              </div>
              <div className="lw-pill">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#6b7280">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                </svg>
                <span>{viewers >= 1000 ? `${(viewers / 1000).toFixed(1)}K` : viewers}</span>
              </div>
            </div>
          </div>

          <button onClick={handleBackPress} className="lw-end-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            <span>End Live</span>
          </button>
        </div>
      )}

      {/* ══ MAIN BODY ════════════════════════════════════════════════════════ */}
      <div className="row g-0 lw-body-row gap-lg-0">

        {/* ── VIDEO COLUMN ────────────────────────────────────────────────── */}
        <div className={`col-12 lw-col-video ${isMaximized ? "" : "col-lg-7"}`}>

          <div className="lw-video-wrap">
            <div ref={videoRef} className="lw-video-el" />
            <div className={`lw-placeholder${hasVideo ? " hidden" : ""}`}>
              <VideoPlaceholder name={astroName} img={astroImage} title={liveTitle} />
              {agoraStatus === "connected" && !hasVideo && (
                <div className="lw-waiting-bar">
                  <p className="lw-waiting-text mb-0">Waiting for host to start…</p>
                  <div className="lw-waiting-timer">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>Wait: {fmtTime(waitElapsed)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="lw-live-badge">
              <span className="lw-live-badge-dot" />
              <span className="lw-live-badge-text">LIVE</span>
            </div>

            <button onClick={toggleMaximize} className="lw-maximize-btn">
              {isMaximized ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M8 3v4a1 1 0 0 1-1 1H3m18 0h-4a1 1 0 0 1-1-1V3m0 18v-4a1 1 0 0 1 1-1h4M3 16a1 1 0 0 1 1-1h4v4" />
                </svg>
              )}
            </button>

            {giftToast && <div className="lw-gift-toast">{giftToast}</div>}

            {agoraErr && (
              <div className="lw-agora-err">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="flex-grow-1 mb-0" style={{ fontSize: 12 }}>{agoraErr}</p>
                <button onClick={() => { setAgoraErr(""); initAgora(); }} className="lw-agora-err-retry">
                  Retry
                </button>
              </div>
            )}
          </div>

          {!isMaximized && (
            <>


              <div className="lw-live-strip-wrap">
                <BottomLiveStrip lives={otherLives} loading={loadingLives} onJoin={handleJoinOther} />
              </div>
            </>
          )}
        </div>

        {/* ── CHAT PANEL ─────────────────────────────────────────────────── */}
        {!isMaximized && (
          <div className="col-12 col-lg-4 lw-col-chat">
            <div className="lw-chat-header">
              <p className="lw-chat-header-title mb-0">Chat</p>
              <div className="lw-chat-viewers">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>{viewers >= 1000 ? `${(viewers / 1000).toFixed(1)}K` : viewers}</span>
              </div>
            </div>

            <div ref={chatMsgsRef} className="lw-chat-msgs">
              {msgs.length === 0 ? (
                <div className="lw-chat-empty">
                  <div className="lw-chat-empty-emoji">💬</div>
                  <p className="text-muted mb-0" style={{ fontSize: 14 }}>No messages yet</p>
                  <p className="text-muted mb-0" style={{ fontSize: 12, opacity: 0.7 }}>
                    {fbStatus === "listening" ? `Listening on GroupLive/${channelId}` : "Connecting to chat…"}
                  </p>
                </div>
              ) : (
                <>
                  {msgs.map(m => <MsgRow key={m.id} msg={m} />)}
                  <div ref={chatEnd} />
                </>
              )}
            </div>

            <div className="lw-input-bar">
              <div className="lw-input-group">
                <div className="lw-input-pill">
                  <textarea ref={inputRef} value={input} rows={1}
                    onChange={e => {
                      const field = e.currentTarget;
                      field.style.height = "0px";
                      field.style.height = `${Math.min(field.scrollHeight, 96)}px`;
                      setInput(field.value);
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMsg();
                      }
                    }}
                    placeholder="Type a message..."
                    className="lw-input-el"
                    aria-label="Type a message"
                  />
                </div>
                <button onClick={sendMsg} disabled={!input.trim()} className="lw-send-btn">
                  <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
                <button onClick={() => setShowApp(true)} className="lw-join-call-btn">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.9 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  Join Call
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── RIGHT SIDEBAR — DiviniQ maroon / saffron / gold accents ─────── */}
        {!isMaximized && (
          <div className="col-lg-auto col-12 lw-col-side">
            <div className="d-lg-block d-flex justify-content-between gap-2 w-100 px-lg-0 px-5">
              <SideBtn color={DQ_SAFFRON} label="Gift" onClick={handleGiftClick}
                icon={<svg className="text-white" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M20 12v10H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>} />
              <SideBtn color={DQ_SUCCESS} label="Call Host" onClick={() => setShowApp(true)}
                icon={<svg className="text-white" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.9 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>} />
              <SideBtn color={followed ? DQ_SUCCESS : DQ_MUTED} label={followed ? "Following" : "Follow"} onClick={handleToggleFollow}
                icon={<svg width="24" height="24" fill={followed ? "white" : "none"} stroke="white" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>} />
              <SideBtn color={DQ_GOLD} label="Share" onClick={share}
                icon={<svg className="text-white" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>} />
              <SideBtn color={DQ_MAROON_DEEP} label="Profile" onClick={() => navigate(`/astrologer/${astroId}`)}
                icon={<svg className="text-white" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>} />
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showGifts && <GiftModal gifts={gifts} astroName={astroName} astroId={astroId} channelId={channelId} onClose={onGiftSent} />}
      {showApp && <AppModal onClose={() => setShowApp(false)} />}
      <LoginOTPModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => {
          setShowLoginModal(false);
          setShowGifts(true);
        }}
      />
      {showLeavePopup && (
        <LeavePopup
          loadingLives={loadingLives}
          otherLives={otherLives}
          onStay={() => {
            setShowLeavePopup(false);
            window.history.pushState({ liveGuard: true }, "", window.location.href);
          }}
          onLeave={leave}
          onJoinOther={handleJoinOther}
          followed={followed}
          onFollow={handleToggleFollow}
        />
      )}
    </div>
  );
}