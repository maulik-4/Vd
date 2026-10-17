import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getAstroPrice, getAstroRating } from '../../services/astroHelpers';
import './WalletConnectModal.css';

/* helpers */
const initials = n => (n||'').trim().split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
const COLORS   = ['#7c3aed','#059669','#dc2626','#d97706','#2563eb'];
const avColor  = n => COLORS[((n||'').charCodeAt(0)||65) % COLORS.length];

// API still returns some image URLs hosted on the old domain — rewrite to the current one.
const fixImgHost = (url) =>
  typeof url === 'string' ? url.replace('admin.astrogurujii.com', 'admin.vaidikguru.com') : url;

/* per-minute rate straight from the API — offer price wins when it's set */
const rate = (base, offer) => {
  const o = Number(offer);
  if (offer !== '' && offer !== null && offer !== undefined && !Number.isNaN(o) && o > 0) return o;
  const b = Number(base);
  return Number.isNaN(b) || b <= 0 ? null : b;
};

/* everything the modal shows keys off the mode the user pressed */
const MODES = {
  chat:  { label: 'Chat',       icon: 'fas fa-comment-dots', cta: 'Connect Now' },
  call:  { label: 'Voice Call', icon: 'fas fa-phone',        cta: 'Call Now' },
  // video: { label: 'Video Call', icon: 'fas fa-video',        cta: 'Start Video Call' },
};

/**
 * WalletConnectModal
 * Props:
 *  - isOpen        boolean
 *  - onClose       fn
 *  - astrologer    { name, profile_img, per_min_chat, per_min_voice_call, avg_rate, category[], is_online }
 *  - walletBalance number  (rupees in user wallet)
 *  - mode          'chat' | 'call'  (default 'chat')
 *  - onConnect     fn  (called when user clicks Connect Now)
 *  - onRecharge    fn  (optional — overrides default navigate to /wallet)
 */
const WalletConnectModal = ({
  isOpen, onClose, astrologer = {}, walletBalance = 0,
  mode = 'chat', onConnect, onRecharge, walletLoading = false,
}) => {
  const navigate = useNavigate();

  const m = MODES[mode] || MODES.chat;

  // per_min_chat / per_min_voice_call — picked by mode, falling back to the
  // chat rate (then getAstroPrice) if the API omits the one we asked for.
  const perMin = useMemo(() => {
    const byMode = mode === 'call'
      ? rate(astrologer.per_min_voice_call, astrologer.per_min_voice_call_offer)
      : rate(astrologer.per_min_chat, astrologer.per_min_chat_offer);
    return byMode ?? rate(astrologer.per_min_chat, astrologer.per_min_chat_offer) ?? Number(getAstroPrice(astrologer)) ?? 0;
  }, [astrologer, mode]);

  // Max minutes user can afford with current balance
  const maxMinutes = useMemo(
    () => (perMin > 0 ? Math.floor(walletBalance / perMin) : 0),
    [walletBalance, perMin]
  );
  // Insufficient if less than 5 minutes
  const insufficient = maxMinutes < 5;
  const cats = astrologer.category?.map(c => c.name) || [];
  const isOnline = astrologer.is_online == 1;

  const handleConnect  = () => { onConnect ? onConnect(mode) : null; };
  const handleRecharge = () => { onRecharge ? onRecharge() : navigate('/wallet'); };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="wc-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}>
          <motion.div className="wc-box"
            initial={{ opacity: 0, scale: .92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: .92, y: 10 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            onClick={e => e.stopPropagation()}>

            {/* Close */}
            <button className="wc-close" onClick={onClose}><i className="fas fa-times" /></button>

            {/* Header — astrologer profile */}
            <div className="wc-head">
              <div className="wc-av-wrap">
                <div className="wc-av-clip">
                  {astrologer.profile_img
                    ? <img src={fixImgHost(astrologer.profile_img)} alt={astrologer.name}
                        onError={e => { e.target.style.display = 'none'; }} />
                    : <div className="wc-av-init"
                        style={{ background:`linear-gradient(135deg,${avColor(astrologer.name)},${avColor(astrologer.name)}99)` }}>
                        {initials(astrologer.name)}
                      </div>
                  }
                </div>
                <span className={`wc-av-dot ${isOnline ? 'on' : 'off'}`} />
              </div>
              <div className="wc-head-info">
                <div className="wc-name">{astrologer.name || 'Astrologer'}</div>
                <div className="wc-rating">
                  <i className="fas fa-star" />
                  <span>{parseFloat(getAstroRating(astrologer)).toFixed(1)}</span>
                  <span className="wc-cats">{cats.slice(0, 2).join(' • ') || 'Vedic Astrology'}</span>
                </div>
                <div className="wc-rate">
                  <i className={m.icon} />
                  ₹{perMin}/min · {m.label}
                </div>
              </div>
            </div>

            {/* Wallet balance card */}
            <div className="wc-wallet">
              <div className="wc-wallet-row">
                <div className="wc-wallet-left">
                  <div className="wc-wallet-ico"><i className="fas fa-wallet" /></div>
                  <div>
                    <div className="wc-wallet-lbl">Wallet Balance</div>
                    <div className="wc-wallet-amt" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      ₹{Number(walletBalance).toLocaleString('en-IN')}
                      {walletLoading && (
                        <span style={{
                          display: 'inline-block', width: 12, height: 12,
                          border: '2px solid #e5e7eb', borderTop: '2px solid #7c1d40',
                          borderRadius: '50%', animation: 'wc-spin 0.7s linear infinite',
                          flexShrink: 0,
                        }} />
                      )}
                    </div>
                  </div>
                </div>
                <button className="wc-add-btn" onClick={handleRecharge}>
                  <i className="fas fa-plus" /> Add
                </button>
              </div>

              {/* Max duration meter */}
              <div className="wc-duration">
                <div className="wc-duration-head">
                  <span><i className="far fa-clock" /> Max Duration</span>
                  <span className={`wc-duration-val${insufficient ? ' low' : ''}`}>
                    {maxMinutes} min
                  </span>
                </div>
                <div className="wc-bar">
                  <div className={`wc-bar-fill${insufficient ? ' low' : ''}`}
                    style={{ width: `${Math.min((maxMinutes / 30) * 100, 100)}%` }} />
                </div>
                <div className="wc-duration-note">
                  {insufficient
                    ? <span className="wc-warn"><i className="fas fa-exclamation-circle" /> Minimum 5 minutes balance required to connect.</span>
                    : <span className="wc-ok"><i className="fas fa-check-circle" /> You have enough balance to connect.</span>
                  }
                </div>
              </div>
            </div>

            {/* Action button */}
            {insufficient ? (
              <button className="wc-btn wc-btn-recharge" onClick={handleRecharge}>
                <i className="fas fa-bolt" /> Recharge Now
              </button>
            ) : (
              <button className="wc-btn wc-btn-connect" onClick={handleConnect}>
                <i className={m.icon} /> {m.cta}
              </button>
            )}

            {/* Footer note */}
            <div className="wc-foot">
              <i className="fas fa-shield-alt" /> Secure & private session · Pay per minute
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WalletConnectModal;