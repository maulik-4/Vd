import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import SideMenu from '../components/layout/SideMenu';
import MobileMenu from '../components/layout/MobileMenu';
import PopupSearch from '../components/layout/PopupSearch';
import ScrollTop from '../components/common/ScrollTop';
import apiService from '../services/apiServices';
import NewAppDownloadModal from '../components/common/NewAppDownloadModel';
import LoginOTPModal from '../components/accounts/LoginOTPModel';
import storageService from '../services/storageServices';
import { getAstroPrice, getAstroRating, getAstroReviewCount, getAstroChatPrice, getAstroCallPrice, getAstroRole, getAstroStatus, getWaitLabel } from '../services/astroHelpers';
import { useSEO } from '../hooks/seoHook';
import { SEO } from '../config/seoConfig';
import './AstrologerList.css';
import MobileBottomNav from '../components/layout/MobileNavbar';

const CONSULTATION_API = "/user_api/add_contact_us";

/* helpers */
const COLORS = ['#7c3aed','#059669','#dc2626','#d97706','#2563eb','#db2777'];
const initials = (n='') => n.trim().split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
const avColor  = (n='') => COLORS[(n.charCodeAt(0)||0) % COLORS.length];
// API still returns some image URLs hosted on the old domain — rewrite to the current one.
const fixImgHost = (url) =>
  typeof url === 'string' ? url.replace('admin.astrogurujii.com', 'admin.vaidikguru.com') : url;

/* per-minute rates straight from astrologer_list — offer price wins when set */
const rate = (base, offer) => {
  const o = Number(offer);
  if (offer !== '' && offer !== null && offer !== undefined && !Number.isNaN(o) && o > 0) return o;
  const b = Number(base);
  return Number.isNaN(b) || b <= 0 ? null : b;
};
const getVideoPrice = (a) => rate(a?.per_min_video_call, a?.per_min_video_call_offer);
const getVoicePrice = (a) => rate(a?.per_min_voice_call, a?.per_min_voice_call_offer);
const getChatPrice  = (a) => rate(a?.per_min_chat,       a?.per_min_chat_offer);
const isOn = (v) => String(v || '').toLowerCase() === 'on';

const getName = (entry) => {
  if (!entry) return "";
  if (typeof entry === "string") return entry.trim();
  return (
    entry.name ??
    entry.title ??
    entry.category_name ??
    entry.cat_name ??
    entry.language_name ??
    entry.lang_name ??
    ""
  );
};

const extractList = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") return val.split(",").map((s) => s.trim()).filter(Boolean);
  return [val];
};

const DEFAULT_FILTERS = {
  search: '',
  experience: 'all',
  payBucket: '',
  maxPrice: 50,
  sortBy: 'relevant',
  specs: [],
  language: '',
};

const getFollowKey = (astro) => {
  const id = astro?.id || astro?._id || astro?.astro_id || astro?.name || '';
  return id ? `followed_astro_${String(id)}` : null;
};

const isFollowed = (astro) => {
  const key = getFollowKey(astro);
  if (!key) return false;
  try {
    return localStorage.getItem(key) === 'true';
  } catch (_) {
    return false;
  }
};

/* Custom Radio */
const RadioOpt = ({ label, checked, onChange }) => (
  <div className="al-opt" onClick={onChange}>
    <span className={`al-opt-circle${checked?' on':''}`} />
    <span>{label}</span>
  </div>
);

/* Custom Checkbox */
const CheckOpt = ({ label, checked, onChange }) => (
  <div className="al-opt" onClick={onChange}>
    <span className={`al-chk-box${checked?' on':''}`} />
    <span>{label}</span>
  </div>
);

/* Skeleton Card */
const SkeletonCard = () => (
  <div className="al-card">
    <div style={{display:'flex',justifyContent:'center',marginTop:22,marginBottom:10}}>
      <div className="al-sk rounded-circle" style={{width:82,height:82}} />
    </div>
    <div className="al-sk mx-auto mb-2" style={{height:13,width:'58%'}} />
    <div className="al-sk mx-auto mb-3" style={{height:11,width:'38%'}} />
    <div className="d-flex justify-content-center gap-1 mb-3">
      {[46,42,46].map((w,i)=><div key={i} className="al-sk" style={{height:20,width:w,borderRadius:20}} />)}
    </div>
    <div className="al-sk mb-3" style={{height:1}} />
    <div className="d-flex justify-content-between mb-3 px-1">
      <div className="al-sk" style={{height:18,width:58}} />
      <div className="al-sk" style={{height:16,width:52}} />
    </div>
    <div className="al-sk" style={{height:36,borderRadius:9}} />
  </div>
);

/* Astrologer Card */
const AstrologerCard = ({ astro, onChat, onNotify, onFollow }) => {
  const [liked,  setLiked]  = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const [notified, setNotified] = useState(false);
  const [isFollowing, setIsFollowing] = useState(() => isFollowed(astro));
  const isBoosted = (value) => value === true || value === 1 || value === '1' || value === 'true';
  const boostChat = isBoosted(astro.is_boost_chat);
  const boostCall = isBoosted(astro.is_boost_call);
  const boostVideo = isBoosted(astro.is_boost_video);
  const emergencyChat = isBoosted(astro.is_emergency_chat);
  const emergencyCall = isBoosted(astro.is_emergency_call);
  const canChat = isOn(astro.is_chat_online) || emergencyChat;
  const canCall = isOn(astro.is_voice_online) || emergencyCall;
  const canVideo = isOn(astro.is_video_online);
  const cats = (Array.isArray(astro.category) ? astro.category : []).slice(0, 3).map(c => typeof c === 'object' ? (c.name || c.category_name || c.title) : c).filter(Boolean);
  const role = getAstroRole(astro);
  const { isBusy, isOnline } = getAstroStatus(astro);
  const dotCls = isBusy ? 'db' : isOnline ? 'dn' : 'do';
  const waitLabel = getWaitLabel(astro);

  useEffect(() => {
    setIsFollowing(isFollowed(astro));
  }, [astro]);

  const handleNotifyClick = (e) => {
    e.stopPropagation();
    const token = storageService.getToken() || localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      if (onNotify) onNotify(astro, !notified);
      return;
    }
    const nextState = !notified;
    setNotified(nextState);
    if (onNotify) {
      onNotify(astro, nextState);
    }
  };

  const handleFollowClick = async (e) => {
    e.stopPropagation();
    const token = storageService.getToken() || localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      if (onFollow) onFollow(astro, null, true);
      return;
    }
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    const key = getFollowKey(astro);
    if (key) {
      try { localStorage.setItem(key, String(nextState)); } catch (_) {}
    }
    const astroId = String(astro?.id || astro?._id || '');
    if (astroId) {
      try {
        await apiService.postBearer('/user_api/follow_astro', { astro_id: astroId });
      } catch (err) {
        console.error('[Follow] API error:', err);
      }
    }
    if (onFollow) onFollow(astro, nextState, false);
  };

  return (
    <motion.div className="al-card"
      initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:.28}}
      style={{cursor:'pointer'}}
      onClick={()=>onChat(astro, 'view')}>
      <span className="al-exp">{astro.experience||'5'}+ Yrs Exp</span>
      <div className="al-top-actions">
        <div className="al-follow-row">
          <button
            className={`al-follow-btn${isFollowing ? ' on' : ''}`}
            onClick={handleFollowClick}
            type="button"
            aria-label={isFollowing ? `Unfollow ${astro.name}` : `Follow ${astro.name}`}
          >
            <i className={isFollowing ? 'fas fa-check' : 'fas fa-user-plus'} />
            <span>{isFollowing ? 'Following' : 'Follow'}</span>
          </button>
        </div>
        <button
          className={`al-heart${liked?' on':''}`}
          onClick={(e)=>{e.stopPropagation();setLiked(!liked)}}
          type="button"
          aria-label="Add to favorites"
        >
          <i className={liked?'fas fa-heart':'far fa-heart'} />
        </button>
      </div>

      <div className="al-av-wrap">
        <div className="al-av-clip">
          {astro.profile_img && !imgErr
  ? <img src={fixImgHost(astro.profile_img)} alt={astro.name} onError={()=>setImgErr(true)} />
            : <div className="al-av-init" style={{background:`linear-gradient(135deg,${avColor(astro.name)},${avColor(astro.name)}bb)`}}>
                {initials(astro.name)}
              </div>
          }
        </div>
        <span className={`al-dot ${dotCls}`} />
      </div>

      <div className="al-cname">{astro.name}</div>
      {role ? <div className="al-crole">{role}</div> : null}
      <div className="al-tags">
        {cats.map((c,i)=><span key={i} className="al-tag">{c}</span>)}
      </div>
      <div className="al-stats">
        <div className="al-rat">
          <i className="fas fa-star" />
          <span>{Number(getAstroRating(astro)).toFixed(1)}</span>
          <span className="al-rev">({getAstroReviewCount(astro)})</span>
        </div>
        {getChatPrice(astro) !== null ? (
          <div className="al-price">₹{getChatPrice(astro)}/min</div>
        ) : null}
      </div>

      {/* per-minute rates: chat / voice / video */}
      <div className="al-rates">
        {[
          { ic: 'fas fa-comment-dots', lbl: 'Chat',  amt: getChatPrice(astro),  on: canChat },
          { ic: 'fas fa-phone',        lbl: 'Call',  amt: getVoicePrice(astro), on: canCall },
          { ic: 'fas fa-video',        lbl: 'Video', amt: getVideoPrice(astro), on: isOn(astro.is_video_online) },
        ].map((r) => (
          <div key={r.lbl} className={`al-rate${r.on && r.amt !== null ? '' : ' off'}`}>
            <i className={r.ic} />
            <b>{r.amt !== null ? `₹${r.amt}` : '—'}</b>
            <span>{r.lbl}/min</span>
          </div>
        ))}
      </div>
      <div className="al-actions">
        {isBusy ? (
          <div className="al-wait-row">
            {/* Busy: chat and call both show the queue wait. Tapping either
                registers the notify-me request rather than starting a session. */}
            <button className={`al-wait-btn${notified ? ' on' : ''}`} onClick={handleNotifyClick} title={`Busy · ${waitLabel}`}>
              <i className={notified ? 'fas fa-check-circle' : 'fas fa-comment-dots'} />
              <span>{notified ? 'Notified' : waitLabel}</span>
            </button>
            <button className={`al-wait-call${notified ? ' on' : ''}`} onClick={handleNotifyClick} title={`Busy · Call · ${waitLabel}`}>
              <i className={notified ? 'fas fa-check-circle' : 'fas fa-phone'} />
            </button>
          </div>
        ) : isOnline || canChat || canCall ? (
          <>
            {canChat && <button className="al-chat" onClick={(e)=>{ e.stopPropagation(); onChat(astro, 'chat'); }}>
              {boostChat && <i className="fas fa-fire al-boost-fire" aria-label="Boosted chat" />}
              {emergencyChat && !isOn(astro.is_chat_online) ? 'Emergency Chat' : 'Chat Now'}
            </button>}
            {canCall && <button className="al-call" onClick={(e)=>{ e.stopPropagation(); onChat(astro, 'call'); }} title={`Call (₹${getAstroCallPrice(astro)}/min)`}>
              <i className="fas fa-phone" />
              {boostCall && <i className="fas fa-fire al-boost-fire" aria-label="Boosted call" />}
            </button>}
            {canVideo && <a
              href="https://play.google.com/store/apps/details?id=com.app.vaidikguru"
              target="_blank"
              rel="noopener noreferrer"
              className="al-video"
              onClick={(e)=>{ e.stopPropagation(); }}
              title={`Video Call${getVideoPrice(astro) !== null ? ` (₹${getVideoPrice(astro)}/min)` : ''} - Download App`}
            >
              <i className="fas fa-video" />
              {boostVideo && <i className="fas fa-fire al-boost-fire" aria-label="Boosted video call" />}
            </a>}
          </>
        ) : (
          <button className="al-notify-btn disabled" style={{ opacity: 0.65, cursor: 'not-allowed', background: '#9ca3af' }} onClick={(e) => e.stopPropagation()}>
            <i className="fas fa-moon" />
            <span>Offline</span>
          </button>
        )}
      </div>
    </motion.div>
  );
};

/* ── Personalized Recommendation Modal — posts to /new_consultation_add ── */
const RecommendationModal = ({ isOpen, onClose }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { ok: true|false, msg }

  useEffect(() => {
    if (isOpen) {
      try {
        const u = storageService.getUser() || JSON.parse(localStorage.getItem('user') || 'null');
        if (u) {
          if (u.name) setName(u.name);
          if (u.number || u.phone) setPhone(u.number || u.phone);
        }
      } catch (err) {
        console.error("Failed to load user for recommendation modal:", err);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const reset = () => {
    setName(""); setPhone(""); setMessage(""); setResult(null); setSubmitting(false);
  };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setResult({ ok: false, msg: "Please enter your name and phone number." });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        number: phone.trim(),
        mobile: phone.trim(),
        subject: "Free Astrologer Recommendation",
        message: message.trim() || "Request for astrologer recommendation",
        service: "consultation",
      };
      let res = await apiService.post(CONSULTATION_API, payload).catch(() => null);
      if (!res || !res.status) {
        res = await apiService.post("https://admin.vaidikguru.com/user_api/add_contact_us", payload).catch(() => null);
      }
      if (!res || !res.status) {
        res = await apiService.post("/user_api/new_consultation_add", payload).catch(() => null);
      }
      if (res?.status) {
        setResult({ ok: true, msg: "Thanks! Our team will reach out to you shortly." });
      } else {
        setResult({ ok: false, msg: res?.message || "Something went wrong. Please try again." });
      }
    } catch (err) {
      console.error("consultation submit error:", err);
      setResult({ ok: false, msg: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 18, width: "100%", maxWidth: 420,
          padding: "26px 24px", boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <h5 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#111827" }}>
            Get a Free Recommendation
          </h5>
          <button
            onClick={handleClose}
            style={{
              width: 28, height: 28, borderRadius: "50%", border: "1.5px solid #e5e7eb",
              background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <i className="fas fa-times" />
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: "#6b7280", margin: "0 0 18px" }}>
          Tell us what you're looking for and our team will match you with the right astrologer.
        </p>

        {result?.ok ? (
          <div style={{ textAlign: "center", padding: "18px 0" }}>
            <i className="fas fa-check-circle" style={{ fontSize: 34, color: "#059669", marginBottom: 10, display: "block" }} />
            <p style={{ fontSize: 13.5, color: "#111827", fontWeight: 600, margin: 0 }}>{result.msg}</p>
            <button
              onClick={handleClose}
              className="al-rec-btn"
              style={{ marginTop: 18 }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              className="rec-modal-input"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="tel"
              className="rec-modal-input"
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <textarea
              className="rec-modal-input"
              placeholder="What are you looking for? (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
            {result?.ok === false && (
              <p style={{ color: "#dc2626", fontSize: 12, marginBottom: 10 }}>{result.msg}</p>
            )}
            <button
              type="submit"
              className="al-rec-btn"
              disabled={submitting}
              style={{ opacity: submitting ? 0.7 : 1, cursor: submitting ? "not-allowed" : "pointer" }}
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

/* Recommend Card */
const RecommendCard = ({ onOpen }) => (
  <div className="al-rec">
    <div className="al-rec-ico"><i className="fas fa-magic" /></div>
    <div className="al-rec-t">Can't find the right match?</div>
    <p className="al-rec-s">Let us help you connect with the best-suited astrologer</p>
    <button className="al-rec-btn" onClick={onOpen}>Get Free Recommendation</button>
    <div style={{fontSize:11,color:'#9ca3af',marginBottom:8}}>Trusted by 50K+ users</div>
    <div>
      {['#7c3aed','#059669','#dc2626','#d97706','#2563eb'].map((c,i)=>(
        <span key={i} className="al-rec-av" style={{background:c}}>{['A','M','R','S','V'][i]}</span>
      ))}
    </div>
  </div>
);

/* Sidebar Content */
const SidebarContent = ({ filters, setFilters, onApply, specOptions = [], languageOptions = [] }) => {
  const set    = (k,v) => setFilters(f=>({...f,[k]:v}));
  const toggle = (s)   => setFilters(f=>({...f, specs: f.specs.includes(s)?f.specs.filter(x=>x!==s):[...f.specs,s]}));
  const reset  = ()    => setFilters(DEFAULT_FILTERS);

  const maxPriceVal = filters.maxPrice ?? 50;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <span className="al-sb-title">Filters</span>
        <button className="al-sb-reset" onClick={reset}>Reset</button>
      </div>

      <div className="mb-2">
        <div className="al-fh">Search Astrologer</div>
        <input
          type="text"
          className="al-lang"
          placeholder="Search by name..."
          value={filters.search || ''}
          onChange={e=>set('search',e.target.value)}
          style={{background:'#fff'}}
        />
      </div>

      <div className="al-div" />

      <div className="al-fh">Experience</div>
      {[
        ['all','All Experience'],
        ['0-2','0 – 2 Years'],
        ['3-5','3 – 5 Years'],
        ['5-10','5 – 10 Years'],
        ['10+','10+ Years']
      ].map(([v,l])=>(
        <RadioOpt key={v} label={l} checked={filters.experience===v} onChange={()=>set('experience',v)} />
      ))}

      <div className="al-div" />

      <div className="al-fh">Payment Range</div>
      <input type="range" className="al-range-input" min={0} max={50} value={maxPriceVal}
        onChange={e=>set('maxPrice',+e.target.value)}
        style={{background:`linear-gradient(to right,#7c3aed ${maxPriceVal*2}%,#e5e7eb ${maxPriceVal*2}%)`}}
      />
      <div className="al-range-ends"><span>₹0</span><span>₹{maxPriceVal}{maxPriceVal>=50?'+':''}/min</span></div>
      <div className="al-buckets">
        {[
          ['₹0-₹10','0-10'],
          ['₹10-₹20','10-20'],
          ['₹20+','20+']
        ].map(([l,v])=>(
          <button key={v} className={`al-bucket${filters.payBucket===v?' on':''}`}
            onClick={()=>set('payBucket',filters.payBucket===v?'':v)}>{l}</button>
        ))}
      </div>

      <div className="al-div" />

      <div className="al-fh">Sort By</div>
      {[
        ['relevant','Most Relevant'],
        ['exp_high','Experience: High to Low'],
        ['exp_low','Experience: Low to High'],
        ['price_low','Payment: Low to High'],
        ['price_high','Payment: High to Low'],
        ['highest_rated','Highest Rated']
      ].map(([v,l])=>(
        <RadioOpt key={v} label={l} checked={filters.sortBy===v} onChange={()=>set('sortBy',v)} />
      ))}

      {specOptions.length > 0 && (
        <>
          <div className="al-div" />
          <div className="al-fh">Specialization</div>
          {specOptions.map(s=>(
            <CheckOpt key={s} label={s} checked={filters.specs.includes(s)} onChange={()=>toggle(s)} />
          ))}
        </>
      )}

      {languageOptions.length > 0 && (
        <>
          <div className="al-div" />
          <div className="al-fh">Language</div>
          <select className="al-lang" value={filters.language || ''} onChange={e=>set('language',e.target.value)}>
            <option value="">Select Language</option>
            {languageOptions.map(l=><option key={l} value={l}>{l}</option>)}
          </select>
        </>
      )}

      <button className="al-apply" onClick={onApply}>
        <i className="fas fa-filter" /> Apply Filters
      </button>
    </>
  );
};

/* ═══════════════════════════ MAIN PAGE ═══════════════════════════ */
const AstrologerList = () => {
  useSEO(SEO.astrology);
  const navigate = useNavigate();
  const [astrologers,   setAstrologers]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(false);
  const [selectedAstro, setSelectedAstro] = useState(null);
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [page,          setPage]          = useState(1);
  const PAGE_SIZE = 9;
  const [maxKnownPage, setMaxKnownPage] = useState(1);
  const [hasNextPage,  setHasNextPage]  = useState(false);
  const lastSeenIdsRef = React.useRef(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  // Nav menus
  const [showSideMenu,   setShowSideMenu]   = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearch,     setShowSearch]     = useState(false);
  const [showRecModal,   setShowRecModal]   = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingAction,  setPendingAction]  = useState(null);
  const [toastMsg,       setToastMsg]       = useState(null);

  const handleOpenRecommendation = useCallback(() => {
    const token = storageService.getToken() || localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      setPendingAction('recommendation');
      setShowLoginModal(true);
    } else {
      setShowRecModal(true);
    }
  }, []);

  const handleNotify = useCallback(async (astro, isNotified) => {
    const token = storageService.getToken() || localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      setShowLoginModal(true);
      return;
    }
    const astroId = String(astro?.id || astro?._id || '');
    if (astroId) {
      try {
        await apiService.postBearer('/user_api/notifyme', { astro_id: astroId });
      } catch (err) {
        console.error('[NotifyMe] API error:', err);
      }
    }
    if (isNotified) {
      setToastMsg(`🔔 We will notify you as soon as ${astro.name} is available!`);
    } else {
      setToastMsg(`Notification turned off for ${astro.name}.`);
    }
    setTimeout(() => setToastMsg(null), 3500);
  }, []);

  const fetchAstrologers = useCallback(async (p=1) => {
    setLoading(true); setError(false);
    try {
      const payload = { page: String(p) };
      if (filters.search) payload.search = filters.search;
      if (filters.specs && filters.specs.length > 0) payload.cat_id = filters.specs.join(',');
      if (filters.language) payload.language_id = filters.language;
      if (filters.sortBy) payload.sort_val = filters.sortBy;

      let res = await apiService.postBearer('/user_api/astrologer_list', payload).catch(() => null);
      if (!res || (!res.results && !res.record && !res.data && !Array.isArray(res))) {
        res = await apiService.post('/user_api/astrologer_list', payload).catch(() => null);
      }

      const list = Array.isArray(res?.results)
        ? res.results
        : Array.isArray(res?.record)
        ? res.record
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : null;

      if (list && list.length > 0) {
        const idsStr = list.map(r => r.id || r._id).join(',');
        const isDuplicate = p > 1 && idsStr === lastSeenIdsRef.current;

        if (isDuplicate) {
          const realLastPage = Math.max(1, p - 1);
          setMaxKnownPage(realLastPage);
          setHasNextPage(false);
          if (page !== realLastPage) setPage(realLastPage);
        } else {
          setAstrologers(list);
          lastSeenIdsRef.current = idsStr;
          setMaxKnownPage(prev => Math.max(prev, p));
          const full = list.length >= PAGE_SIZE;
          setHasNextPage(full);
        }
      } else {
        setAstrologers([]);
        setHasNextPage(false);
      }
    } catch (err) {
      console.error('[AstrologerList] Error fetching astrologers:', err);
      setAstrologers([]);
      setHasNextPage(false);
    }
    finally { setLoading(false); }
  }, [filters.specs, filters.sortBy, filters.language, filters.search, page]);

  // Silent background status update polling (every 10s)
  const pollAstrologers = useCallback(async () => {
    if (document.visibilityState === 'hidden') return;
    try {
      const payload = {
        search: filters.search || '',
        page: String(page),
        is_chat: 'on',
        is_voice_call: 'on',
        is_video_call: 'on',
        cat_id: filters.specs.join(','),
        language_id: filters.language || '',
        sort_val: filters.sortBy,
      };
      let res = await apiService.postBearer('/user_api/astrologer_list', payload);
      const list = Array.isArray(res?.results) ? res.results : Array.isArray(res?.record) ? res.record : Array.isArray(res?.data) ? res.data : null;
      if (list && list.length > 0) {
        setAstrologers(prev => {
          const map = new Map(list.map(item => [String(item.id || item._id), item]));
          return prev.map(item => {
            const key = String(item.id || item._id);
            const fresh = map.get(key);
            if (!fresh) return item;
            return {
              ...item,
              is_busy: fresh.is_busy,
              is_online: fresh.is_online,
              is_chat_online: fresh.is_chat_online,
              is_call_online: fresh.is_call_online,
              is_video_online: fresh.is_video_online,
              is_chat: fresh.is_chat,
              is_call: fresh.is_call,
              watting_time: fresh.watting_time
            };
          });
        });
      }
    } catch (_) {}
  }, [filters.specs, filters.sortBy, filters.language, filters.search, page]);

  useEffect(() => {
    fetchAstrologers(page);
    const interval = setInterval(pollAstrologers, 10000);
    return () => clearInterval(interval);
  }, [fetchAstrologers, pollAstrologers, page]);

  const goPage     = p => { setPage(p); window.scrollTo({top:0,behavior:'smooth'}); };
  const handleApply = () => { setPage(1); fetchAstrologers(1); setDrawerOpen(false); };
  const resetFilters = () => { setFilters(DEFAULT_FILTERS); setPage(1); };

  const specOptions = useMemo(() => {
    const set = new Set();
    astrologers.forEach((item) => {
      const catList = extractList(item.category || item.categories);
      catList.forEach((c) => {
        const name = getName(c);
        if (name) set.add(name);
      });
    });
    const defaults = ['Vedic', 'Tarot', 'Numerology', 'Vastu', 'Palmistry', 'Career', 'Marriage', 'Health', 'Finance', 'Kids', 'Business'];
    defaults.forEach((d) => set.add(d));
    return [...set];
  }, [astrologers]);

  const languageOptions = useMemo(() => {
    const set = new Set();
    astrologers.forEach((item) => {
      const langList = extractList(item.language || item.languages);
      langList.forEach((l) => {
        const name = getName(l);
        if (name) set.add(name);
      });
    });
    const defaults = ['Hindi', 'English', 'Punjabi', 'Marathi', 'Bengali', 'Gujarati', 'Tamil', 'Telugu'];
    defaults.forEach((d) => set.add(d));
    return [...set];
  }, [astrologers]);

  const filteredAstrologers = useMemo(() => {
    let list = [...astrologers];

    // 1. Search filter
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter((item) => {
        const name = (item.name || '').toLowerCase();
        const cats = extractList(item.category || item.categories).map(getName).join(' ').toLowerCase();
        return name.includes(q) || cats.includes(q);
      });
    }

    // 2. Experience filter
    if (filters.experience && filters.experience !== 'all') {
      list = list.filter((item) => {
        const exp = Number(item.experience) || 0;
        if (filters.experience === '0-2') return exp >= 0 && exp <= 2;
        if (filters.experience === '3-5') return exp >= 3 && exp <= 5;
        if (filters.experience === '5-10') return exp >= 5 && exp <= 10;
        if (filters.experience === '10+') return exp >= 10;
        return true;
      });
    }

    // 3. Payment Bucket filter
    if (filters.payBucket) {
      list = list.filter((item) => {
        const p = getAstroPrice(item);
        if (filters.payBucket === '0-10') return p >= 0 && p <= 10;
        if (filters.payBucket === '10-20') return p > 10 && p <= 20;
        if (filters.payBucket === '20+') return p > 20;
        return true;
      });
    }

    // 4. Max price slider filter
    if (filters.maxPrice !== undefined && filters.maxPrice < 50) {
      list = list.filter((item) => {
        const p = getAstroPrice(item);
        return p <= filters.maxPrice;
      });
    }

    // 5. Specialization filter
    if (filters.specs && filters.specs.length > 0) {
      list = list.filter((item) => {
        const cats = extractList(item.category || item.categories).map(getName);
        if (cats.length === 0) return true;
        return cats.some((c) => filters.specs.includes(c));
      });
    }

    // 6. Language filter
    if (filters.language) {
      list = list.filter((item) => {
        const langs = extractList(item.language || item.languages).map(getName);
        if (langs.length === 0) return true;
        return langs.includes(filters.language);
      });
    }

    // 7. Sorting
    if (filters.sortBy === 'exp_high') {
      list.sort((a, b) => (Number(b.experience) || 0) - (Number(a.experience) || 0));
    } else if (filters.sortBy === 'exp_low') {
      list.sort((a, b) => (Number(a.experience) || 0) - (Number(b.experience) || 0));
    } else if (filters.sortBy === 'price_low') {
      list.sort((a, b) => getAstroPrice(a) - getAstroPrice(b));
    } else if (filters.sortBy === 'price_high') {
      list.sort((a, b) => getAstroPrice(b) - getAstroPrice(a));
    } else if (filters.sortBy === 'highest_rated') {
      list.sort((a, b) => getAstroRating(b) - getAstroRating(a));
    }

    return list;
  }, [astrologers, filters]);

  const getPageWindow = (current, total, size = 5) => {
    if (total <= size) return Array.from({ length: total }, (_, i) => i + 1);
    let start = Math.max(1, current - Math.floor(size / 2));
    let end = start + size - 1;
    if (end > total) {
      end = total;
      start = end - size + 1;
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const pages = getPageWindow(page, maxKnownPage);
  const isLastKnownPage = page >= maxKnownPage && !hasNextPage;
  const isSinglePage = maxKnownPage <= 1 && !hasNextPage;

  return (
    <div className="main-wrapper" style={{paddingTop:0,marginTop:0}}>
      <SideMenu   isOpen={showSideMenu}   onClose={()=>setShowSideMenu(false)} />
      <PopupSearch isOpen={showSearch}    onClose={()=>setShowSearch(false)} />
      <MobileMenu isOpen={showMobileMenu} onClose={()=>setShowMobileMenu(false)} />
      <Header
        onMenuToggle={()=>setShowMobileMenu(true)}
        onSideMenuToggle={()=>setShowSideMenu(true)}
        onSearchToggle={()=>setShowSearch(true)}
      />

      {/* ══ HERO ══ */}
      <div className="al-hero-outer">
        <div className="container">
          <img
            src="/assets/img/bg/astroguruji.webp"
            alt="Consult India's Verified Vedic Masters"
            className="al-hero-img"
          />
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div className="al-body">
        <div className="container">

          {/* Mobile top bar */}
          <div className="al-mob-top">
            <button className="al-filter-mob-btn" onClick={()=>setDrawerOpen(true)}>
              <i className="fas fa-sliders-h" /> Filters
            </button>
            <select className="al-sort-sel" value={filters.sortBy} onChange={e=>setFilters(f=>({...f,sortBy:e.target.value}))}>
              <option value="relevant">Relevance</option>
              <option value="exp_high">Exp: High–Low</option>
              <option value="exp_low">Exp: Low–High</option>
              <option value="price_low">Price: Low–High</option>
              <option value="price_high">Price: High–Low</option>
              <option value="highest_rated">Highest Rated</option>
            </select>
          </div>

          {/* Mobile Drawer */}
          <div className="al-drawer-wrap">
            <div className={`al-drawer-overlay${drawerOpen?' show':''}`} onClick={()=>setDrawerOpen(false)} />
            <div className={`al-drawer${drawerOpen?' open':''}`}>
              <SidebarContent filters={filters} setFilters={setFilters} onApply={handleApply} specOptions={specOptions} languageOptions={languageOptions} />
            </div>
          </div>

          <div className="row g-4">
            {/* Sidebar */}
            <div className="col-md-3 al-sidebar-desktop">
              <div className="al-sidebar-box">
                <SidebarContent filters={filters} setFilters={setFilters} onApply={handleApply} specOptions={specOptions} languageOptions={languageOptions} />
              </div>
            </div>

            {/* Main */}
            <div className="col-md-9 col-12">

              {/* Trust strip — 3 items in the content area */}
              <div className="al-trust-strip">
                {[
                  {ic:'fas fa-shield-alt',cls:'cg',lbl:'100% Verified',    sub:'All astrologers are verified'},
                  {ic:'fas fa-lock',      cls:'cp',lbl:'Secure & Private',  sub:'Your privacy is our priority'},
                  {ic:'fas fa-smile',     cls:'ce',lbl:'Satisfaction',       sub:'98% happy customers'},
                ].map(t=>(
                  <div key={t.lbl} className="al-trust-item">
                    <div className={`al-ti-icon ${t.cls}`}><i className={t.ic} /></div>
                    <div>
                      <div className="al-ti-lbl">{t.lbl}</div>
                      <div className="al-ti-sub">{t.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Header row */}
              <div className="al-mhdr">
                <div className="al-mhdr-left">
                  <h2>Find Your Perfect Guide</h2>
                  <p>Connect with experienced Vedic astrologers for accurate guidance and solutions.</p>
                </div>
                <div className="al-mhdr-right">
                  {!loading && <span className="al-showing">Showing {filteredAstrologers.length === 0 ? 0 : 1}–{filteredAstrologers.length} of {astrologers.length}+ astrologers</span>}
                  <select className="al-sort-sel" value={filters.sortBy} onChange={e=>setFilters(f=>({...f,sortBy:e.target.value}))}>
                    <option value="relevant">Relevance</option>
                    <option value="exp_high">Experience: High to Low</option>
                    <option value="exp_low">Experience: Low to High</option>
                    <option value="price_low">Payment: Low to High</option>
                    <option value="price_high">Payment: High to Low</option>
                    <option value="highest_rated">Highest Rated</option>
                  </select>
                </div>
              </div>

              {/* Error */}
              {error && !loading && (
                <div className="text-center py-5">
                  <i className="fas fa-exclamation-circle fa-3x d-block mb-3" style={{color:'#d1d5db'}} />
                  <p className="fw-bold text-dark mb-1">Unable to load astrologers</p>
                  <p className="small text-muted mb-3">Please check your connection and try again.</p>
                  <button className="al-chat" style={{width:'auto',display:'inline-block',borderRadius:9,padding:'10px 28px'}}
                    onClick={()=>fetchAstrologers(page)}>Retry</button>
                </div>
              )}

              {/* Grid or Empty Filter state */}
              {!error && (
                !loading && filteredAstrologers.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="fas fa-filter fa-3x d-block mb-3" style={{color:'#d1d5db'}} />
                    <p className="fw-bold text-dark mb-1">No astrologers match these filters</p>
                    <p className="small text-muted mb-3">Try adjusting or resetting your filters.</p>
                    <button className="al-chat" style={{width:'auto',display:'inline-block',borderRadius:9,padding:'10px 28px'}}
                      onClick={resetFilters}>Reset Filters</button>
                  </div>
                ) : (
                  <div className="row g-3">
                    {loading
                      ? Array.from({length:9}).map((_,i)=>(
                          <div key={i} className="col-6 col-md-4"><SkeletonCard /></div>
                        ))
                      : <>
                          {filteredAstrologers.map((a,i)=>(
                            <div key={a.id||i} className="col-6 col-md-4">
                              <AstrologerCard astro={a} onNotify={handleNotify} onFollow={(astro, next, needLogin) => {
                                if (needLogin) {
                                  setShowLoginModal(true);
                                  return;
                                }
                                setToastMsg(next ? `You are now following ${astro.name}.` : `You unfollowed ${astro.name}.`);
                                setTimeout(() => setToastMsg(null), 2500);
                              }} onChat={(astro, type) => {
                                const token = storageService.getToken() || localStorage.getItem('token') || sessionStorage.getItem('token');
                                if (!token && (type === 'chat' || type === 'call' || type === 'video')) {
                                  setShowLoginModal(true);
                                  return;
                                }
                                if (type === 'video') {
                                  window.open("https://play.google.com/store/apps/details?id=com.app.vaidikguru", "_blank", "noopener,noreferrer");
                                } else if (type === 'call') {
                                  navigate(`/astrologer/${astro.id || astro._id}?action=call`);
                                } else if (type === 'chat') {
                                  navigate(`/astrologer/${astro.id || astro._id}?action=chat`);
                                } else {
                                  navigate(`/astrologer/${astro.id || astro._id}`);
                                }
                              }} />
                            </div>
                          ))}
                          <div className="col-6 col-md-4">
                            <RecommendCard onOpen={handleOpenRecommendation} />
                          </div>
                        </>
                    }
                  </div>
                )
              )}

              {/* Pagination */}
              {!loading && !error && astrologers.length > 0 && !isSinglePage && (
                <div className="al-pg">
                  <button className="al-pg-btn" disabled={page===1} onClick={()=>goPage(page-1)}>
                    <i className="fas fa-chevron-left" style={{fontSize:11}} />
                  </button>

                  {pages[0] > 1 && (
                    <>
                      <button className="al-pg-btn" onClick={()=>goPage(1)}>1</button>
                      {pages[0] > 2 && <span className="al-pg-dots">…</span>}
                    </>
                  )}

                  {pages.map(p=>(
                    <button key={p} className={`al-pg-btn${page===p?' cur':''}`} onClick={()=>goPage(p)}>{p}</button>
                  ))}

                  <button className="al-pg-btn" disabled={isLastKnownPage} onClick={()=>goPage(page+1)}>
                    <i className="fas fa-chevron-right" style={{fontSize:11}} />
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      <NewAppDownloadModal
        isOpen={!!selectedAstro}
        onClose={()=>setSelectedAstro(null)}
        title={selectedAstro?`Consult ${selectedAstro.name}`:'Consult a Master'}
        subtitle={selectedAstro
          ?`Speak with ${selectedAstro.name} for clarity on ${selectedAstro.category?.[0]?.name||'Life'}.`
          :'Join thousands who found clarity.'}
      />

      <LoginOTPModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          setPendingAction(null);
        }}
        onSuccess={() => {
          setShowLoginModal(false);
          if (pendingAction === 'recommendation') {
            setPendingAction(null);
            setShowRecModal(true);
          } else {
            window.location.reload();
          }
        }}
      />

      <RecommendationModal isOpen={showRecModal} onClose={() => setShowRecModal(false)} />

      {toastMsg && (
        <div className="al-toast">
          <i className="fas fa-bell" style={{ color: '#f59e0b' }} />
          <span>{toastMsg}</span>
        </div>
      )}

      <Footer />
      <ScrollTop />
      <MobileBottomNav/>
    </div>
  );
};

export default AstrologerList;