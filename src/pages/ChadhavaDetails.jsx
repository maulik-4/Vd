import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import ChadhavaService from '../services/chadhavaServices';
import apiService from '../services/apiServices';
import './ChadhavaDetail.css';
import Header from '../components/layout/Header';
import LoginOTPModal from '../components/accounts/LoginOTPModel';
import { useStorage } from '../context/StorageContext';
import Footer from "../components/layout/Footer";
import SideMenu from '../components/layout/SideMenu';
import PopupSearch from '../components/layout/PopupSearch';
import MobileMenu from '../components/layout/MobileMenu';
import { useSEO } from '../hooks/seoHook';


const useCountdown = (targetDate) => {
  const calc = () => {
    if (!targetDate) return { d: 0, h: 0, m: 0, s: 0 };
    const diff = Math.max(0, new Date(targetDate).getTime() - Date.now());
    return {
      d: Math.floor(diff / (1000 * 60 * 60 * 24)),
      h: Math.floor((diff / (1000 * 60 * 60)) % 24),
      m: Math.floor((diff / (1000 * 60)) % 60),
      s: Math.floor((diff / 1000) % 60),
    };
  };
  const [t, setT] = useState(calc());
  useEffect(() => {
    const tick = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate]);
  return t;
};

const pad = n => String(n).padStart(2, '0');

const IMAGE_PLACEHOLDER =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260">
      <rect width="400" height="260" fill="#f5ede0"/>
      <text x="50%" y="52%" font-size="120" text-anchor="middle" dominant-baseline="middle" fill="#c9962f" font-family="serif">ॐ</text>
    </svg>
  `);

const AVATAR_PLACEHOLDER =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
      <rect width="80" height="80" fill="#f5ede0"/>
      <circle cx="40" cy="32" r="14" fill="#c9962f"/>
      <path d="M14 70c0-16 12-24 26-24s26 8 26 24" fill="#c9962f"/>
    </svg>
  `);

const handleImgError = (fallbackSrc) => (e) => {
  const img = e.currentTarget;
  if (img.dataset.fallback === 'done') return;
  img.dataset.fallback = 'done';
  img.src = fallbackSrc;
};

const clampStyle = (expanded) =>
  !expanded
    ? {
      display: '-webkit-box',
      WebkitLineClamp: 3,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
    }
    : undefined;

const FaqItem = ({ num, q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="cd-faq-item" onClick={() => setOpen(o => !o)}>
      <div className="cd-faq-q">
        <span className="cd-faq-num">{pad(num)}</span>
        <span className="cd-faq-text">{q}</span>
        <div className="cd-faq-icon"><i className={`fas fa-${open ? 'minus' : 'plus'}`} /></div>
      </div>
      {open && <div className="cd-faq-ans">{a}</div>}
    </div>
  );
};

const ViewAllReviewsPopup = ({ reviews, onClose }) => (
  <div
    style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}
    onClick={onClose}
  >
    <div
      style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 640,
        maxHeight: '82vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 22px', borderBottom: '1px solid #f0e8e0',
      }}>
        <h5 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#7b1a3a' }}>All Devotee Reviews</h5>
        <button
          onClick={onClose}
          style={{
            width: 30, height: 30, borderRadius: '50%', border: '1.5px solid #e5e7eb',
            background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <i className="fas fa-times" />
        </button>
      </div>
      <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0, flex: 1 }}>
        {reviews.map((r, i) => (
          <div key={i} className="cd-rev-card" style={{ width: '100%', flexShrink: 0 }}>
            <div className="cd-rev-card-body" style={{ overflow: 'visible' }}>
              <div className="cd-rev-stars">
                {[1, 2, 3, 4, 5].map(s => <i key={s} className={`fa${s <= Math.floor(r.rating) ? 's' : 'r'} fa-star`} />)}
                <span>{r.rating}</span>
              </div>
              <div className="cd-rev-text">{r.text}</div>
              <div className="cd-rev-user">
                <img className="cd-rev-av" src={r.avatar} alt={r.name} onError={handleImgError(AVATAR_PLACEHOLDER)} />
                <div>
                  <div className="cd-rev-name">{r.name}</div>
                  <div className="cd-rev-loc">{r.city}</div>
                </div>
              </div>
            </div>
            <img className="cd-rev-img" src={r.img} alt="Prasad" onError={handleImgError(IMAGE_PLACEHOLDER)} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const GalleryPopup = ({ images, onClose }) => (
  <div
    style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}
    onClick={onClose}
  >
    <div
      style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 780,
        maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 22px', borderBottom: '1px solid #f0e8e0',
      }}>
        <h5 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#7b1a3a' }}>
          Gallery ({images.length} Photo{images.length > 1 ? 's' : ''})
        </h5>
        <button
          onClick={onClose}
          style={{
            width: 30, height: 30, borderRadius: '50%', border: '1.5px solid #e5e7eb',
            background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <i className="fas fa-times" />
        </button>
      </div>
      <div style={{
        padding: 20, overflowY: 'auto',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14,
      }}>
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`Gallery ${i + 1}`}
            onError={handleImgError(IMAGE_PLACEHOLDER)}
            style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 10, background: '#f5ede0' }}
          />
        ))}
      </div>
    </div>
  </div>
);

const DEFAULT_INC = [
  { icon: 'fas fa-user-edit', name: 'Sankalp', sub: 'In your name' },
  { icon: 'fas fa-fire', name: 'Vedic Rituals', sub: 'By Expert Pandits' },
  { icon: 'fas fa-music', name: 'Mantra Chanting', sub: 'For Divine Blessings' },
  { icon: 'fas fa-box', name: 'Prasad', sub: 'Blessed & Pure' },
  { icon: 'fas fa-video', name: 'Photos & Videos', sub: 'Live Updates' },
];

const DEFAULT_HOW = [
  { num: '01', label: 'Choose Your Chadhava' },
  { num: '02', label: 'Make Secure Payment' },
  { num: '03', label: 'Puja Performed By Pandits' },
  { num: '04', label: 'Receive Prasad & Updates' },
];

const DEFAULT_FAQS = [
  { q: 'How do I begin the process of purchasing a Chadhava?', a: 'Simply select your desired Chadhava, fill in your Sankalp details, and complete the secure payment. Our team will handle the rest.' },
  { q: 'What are closing costs and who typically pays them?', a: 'The price shown includes all ritual costs. There are no hidden charges. Prasad delivery has a nominal fee.' },
  { q: 'What should I look for when selecting a Chadhava?', a: 'Consider the deity, the significance of the day, and your personal intention. Our experts are available to guide you.' },
  { q: 'How can I negotiate effectively when buying property?', a: 'For Chadhava queries, please contact our support team via WhatsApp or call center.' },
  { q: 'How can I determine the right Chadhava for me?', a: 'Share your birth details and current challenges with our astrologers. They will recommend the most beneficial Chadhava.' },
  { q: 'Is a home inspection really necessary?', a: 'All our pandits are verified and experienced. You will receive real-time video updates during the ritual.' },
];

const DEFAULT_REVIEWS = [
  {
    rating: 5,
    text: 'The entire ritual felt so authentic and heartfelt. I received the prasad within a week, and the video updates during the puja gave me real peace of mind.',
    name: 'Priya Sharma',
    city: 'Delhi',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face',
    img: 'https://images.unsplash.com/photo-1605021206688-bcc23d68e8b9?w=300&h=340&fit=crop',
  },
  {
    rating: 5,
    text: 'Booked this Chadhava for my parents\' wellbeing. The pandit ji was very thorough, and the WhatsApp updates made us feel connected to the temple.',
    name: 'Rohit Verma',
    city: 'Mumbai',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&crop=face',
    img: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=300&h=340&fit=crop',
  },
  {
    rating: 4,
    text: 'Smooth booking process and genuine service. The prasad packaging was beautiful and everything arrived exactly as promised.',
    name: 'Anjali Nair',
    city: 'Bengaluru',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop&crop=face',
    img: 'https://images.unsplash.com/photo-1600424563132-e35199c9a4d1?w=300&h=340&fit=crop',
  },
  {
    rating: 5,
    text: 'Second time booking a Chadhava through VaidikGuru. Reliable, respectful of tradition, and the customer support answered all my questions promptly.',
    name: 'Karthik Reddy',
    city: 'Hyderabad',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face',
    img: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=300&h=340&fit=crop',
  },
];

const ChadhavaDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, setActiveChadhavaId } = useStorage();

  const [chadhava, setChadhava] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useSEO({
    title: chadhava?.chadhavaName ? `${chadhava.chadhavaName} - Sacred Offerings` : "Sacred Chadhava Booking",
    description: chadhava?.aboutChadhava
      ? (typeof chadhava.aboutChadhava === 'string' ? chadhava.aboutChadhava.replace(/<[^>]*>/g, '').slice(0, 160) : 'Offer sacred Chadhava at revered temples online with VaidikGuru.')
      : "Offer sacred Chadhava at revered temples online with authentic rituals, sankalp, and blessings through VaidikGuru.",
    keywords: `${chadhava?.chadhavaName || 'chadhava'}, temple chadhava, online offering, VaidikGuru`,
    canonical: `/chadhava/${id}`,
    ogImage: chadhava?.chadhavaImage || undefined,
  });

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const [revDot, setRevDot] = useState(0);
  const [simIdx, setSimIdx] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  const [addonQtys, setAddonQtys] = useState({});
  const [prasadQtys, setPrasadQtys] = useState({});
  const [cartSyncing, setCartSyncing] = useState(false);

  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const [addonsSectionVisible, setAddonsSectionVisible] = useState(false);

  const SIM_VISIBLE = 4;

  const addonsRowRef = useRef(null);
  const prasadRowRef = useRef(null);
  const scrollRow = (ref, dir) => {
    ref.current?.scrollBy({ left: dir * 240, behavior: 'smooth' });
  };

  const heroMobileRef = useRef(null);
  const [heroMobileIdx, setHeroMobileIdx] = useState(0);
  const heroUserInteractingRef = useRef(false);
  const handleHeroMobileScroll = () => {
    const el = heroMobileRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setHeroMobileIdx(idx);
  };
  const scrollHeroMobileTo = (i) => {
    const el = heroMobileRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  useEffect(() => {
    const attachDragScroll = (el) => {
      if (!el) return () => { };
      let isDown = false;
      let startX = 0;
      let startScrollLeft = 0;
      let moved = false;

      const onPointerDown = (e) => {
        isDown = true;
        moved = false;
        startX = e.clientX;
        startScrollLeft = el.scrollLeft;
        el.classList.add('cd-dragging');
      };
      const onPointerMove = (e) => {
        if (!isDown) return;
        const dx = e.clientX - startX;
        if (Math.abs(dx) > 4) moved = true;
        el.scrollLeft = startScrollLeft - dx;
      };
      const endDrag = () => {
        isDown = false;
        el.classList.remove('cd-dragging');
      };
      const onClickCapture = (e) => {
        if (moved) {
          e.preventDefault();
          e.stopPropagation();
        }
      };

      el.addEventListener('pointerdown', onPointerDown);
      el.addEventListener('pointermove', onPointerMove);
      el.addEventListener('pointerup', endDrag);
      el.addEventListener('pointerleave', endDrag);
      el.addEventListener('click', onClickCapture, true);

      return () => {
        el.removeEventListener('pointerdown', onPointerDown);
        el.removeEventListener('pointermove', onPointerMove);
        el.removeEventListener('pointerup', endDrag);
        el.removeEventListener('pointerleave', endDrag);
        el.removeEventListener('click', onClickCapture, true);
      };
    };

    const cleanupAddons = attachDragScroll(addonsRowRef.current);
    const cleanupPrasad = attachDragScroll(prasadRowRef.current);
    return () => {
      cleanupAddons();
      cleanupPrasad();
    };
  }, [chadhava]);

  useEffect(() => {
    let isMounted = true;
    const fetchChadhava = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await ChadhavaService.getChadhavaListById(id);
        if (!isMounted) return;
        if (res?.status) {
          const record = res.chadhava || (Array.isArray(res.data) ? res.data[0] : res.data) || res.result || res;
          setChadhava(record || null);
          if (record?._id) {
            setActiveChadhavaId(record._id);
          }
          if (!record) setError(true);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Chadhava details fetch error:', err);
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    if (id) fetchChadhava();
    return () => { isMounted = false; };
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    const fetchCart = async () => {
      try {
        const res = await apiService.postBearer('https://admin.vaidikguru.com/puja/getChadhavaCart', {});
        if (!isMounted) return;
        if (res?.status && Array.isArray(res.data) && res.data.length > 0) {
          const rawData = res.data[0];
          const rawChadhavaId = rawData.chadhava_id?._id || rawData.chadhava_id;
          if (String(rawChadhavaId) === String(chadhava?._id)) {
            const aQ = {};
            (rawData.addons_selected || []).forEach(sel => {
              const aId = typeof sel.addon_id === 'object' ? (sel.addon_id?._id || sel.addon_id?.id) : sel.addon_id;
              if (aId && String(aId) !== '[object Object]') aQ[String(aId)] = sel.qty || 1;
            });
            setAddonQtys(aQ);

            const pQ = {};
            (rawData.prasad_selected || []).forEach(sel => {
              const pId = typeof sel.prasad_id === 'object' ? (sel.prasad_id?._id || sel.prasad_id?.id) : sel.prasad_id;
              if (pId && String(pId) !== '[object Object]') pQ[String(pId)] = sel.qty || 1;
            });
            setPrasadQtys(pQ);
          }
        }
      } catch (err) {
        console.error('Cart fetch error:', err);
      }
    };
    if (chadhava?._id && isLoggedIn) fetchCart();
    return () => { isMounted = false; };
  }, [chadhava?._id, isLoggedIn]);

  const timer = useCountdown(chadhava?.offerEndsAt);

  const galleryImages = useMemo(() => {
    const raw = [
      chadhava?.chadhavaImage,
      ...(chadhava?.bannerImages || []),
      ...(chadhava?.galleryImages || []),
      ...(chadhava?.gallery || []),
      ...(chadhava?.images || []),
      ...(chadhava?.photos || []),
    ].filter(Boolean);
    return raw.length
      ? [...new Set(raw)]
      : [IMAGE_PLACEHOLDER, IMAGE_PLACEHOLDER, IMAGE_PLACEHOLDER, IMAGE_PLACEHOLDER];
  }, [chadhava]);

  useEffect(() => {
    if (galleryImages.length <= 1) return undefined;
    const t = setInterval(() => {
      if (heroUserInteractingRef.current) return;
      const el = heroMobileRef.current;
      if (!el) return;
      const nextIdx = (Math.round(el.scrollLeft / el.clientWidth) + 1) % galleryImages.length;
      scrollHeroMobileTo(nextIdx);
    }, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryImages.length]);

  useEffect(() => {
    if (!chadhava) return undefined;
    const el = document.getElementById('addons-section');
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setAddonsSectionVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, [chadhava]);

  const handleProceed = async () => {
    if (!chadhava?._id) return;
    setActiveChadhavaId(chadhava._id);
    const cleanAddons = Object.entries(addonQtys)
      .filter(([addon_id, qty]) => qty > 0 && addon_id !== '[object Object]')
      .map(([addon_id, qty]) => ({ addon_id, qty }));
    const cleanPrasad = Object.entries(prasadQtys)
      .filter(([prasad_id, qty]) => qty > 0 && prasad_id !== '[object Object]')
      .map(([prasad_id, qty]) => ({ prasad_id, qty }));

    try {
      const payload = {
        chadhava_id: chadhava._id,
        addons_selected: cleanAddons,
        prasad_selected: cleanPrasad,
      };
      await apiService.postBearer('https://admin.vaidikguru.com/puja/ChadhavaaddToCart', payload);
    } catch (err) {
      console.error('Add to cart error during proceed:', err);
    }
    navigate('/chadhava_review_booking', {
      state: {
        chadhavaId: chadhava._id,
        chadhava: chadhava,
        addonIds: cleanAddons.map(a => a.addon_id),
        prasadIds: cleanPrasad.map(p => p.prasad_id),
        addonQtys,
        prasadQtys,
      },
    });
  };

  const syncCart = async (nextAddonQtys, nextPrasadQtys) => {
    if (!chadhava?._id) return;
    setCartSyncing(true);
    try {
      const payload = {
        chadhava_id: chadhava._id,
        addons_selected: Object.entries(nextAddonQtys)
          .filter(([, qty]) => qty > 0)
          .map(([addon_id, qty]) => ({ addon_id, qty })),
        prasad_selected: Object.entries(nextPrasadQtys)
          .filter(([, qty]) => qty > 0)
          .map(([prasad_id, qty]) => ({ prasad_id, qty })),
      };
      await apiService.postBearer('https://admin.vaidikguru.com/puja/ChadhavaaddToCart', payload);
    } catch (err) {
      console.error('Add to cart error:', err);
    } finally {
      setCartSyncing(false);
    }
  };

  const changeAddonQty = (addonId, delta) => {
    setAddonQtys((prev) => {
      const current = prev[addonId] || 0;
      const next = Math.max(0, current + delta);
      const updated = { ...prev };
      if (next === 0) {
        delete updated[addonId];
      } else {
        updated[addonId] = next;
      }
      syncCart(updated, prasadQtys);
      return updated;
    });
  };

  const changePrasadQty = (prasadId, delta) => {
    setPrasadQtys((prev) => {
      const current = prev[prasadId] || 0;
      const next = Math.max(0, current + delta);
      const updated = { ...prev };
      if (next === 0) {
        delete updated[prasadId];
      } else {
        updated[prasadId] = next;
      }
      syncCart(addonQtys, updated);
      return updated;
    });
  };

  const handleAddonAddClick = (addonId) => {
    if (!isLoggedIn) {
      setPendingAction({ type: 'addon', id: addonId });
      setShowLoginModal(true);
      return;
    }
    changeAddonQty(addonId, 1);
  };

  const handlePrasadAddClick = (prasadId) => {
    if (!isLoggedIn) {
      setPendingAction({ type: 'prasad', id: prasadId });
      setShowLoginModal(true);
      return;
    }
    changePrasadQty(prasadId, 1);
  };

  useEffect(() => {
    if (isLoggedIn && showLoginModal && pendingAction) {
      setShowLoginModal(false);
      if (pendingAction.type === 'addon') {
        changeAddonQty(pendingAction.id, 1);
      } else if (pendingAction.type === 'prasad') {
        changePrasadQty(pendingAction.id, 1);
      }
      setPendingAction(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

   if (loading) {
    return (
      <div className="pd-page">
        <SideMenu isOpen={showSideMenu} onClose={() => setShowSideMenu(false)} />
        <PopupSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
        <MobileMenu isOpen={showMobileMenu} onClose={() => setShowMobileMenu(false)} />
        <Header
          onMenuToggle={() => setShowMobileMenu(true)}
          onSideMenuToggle={() => setShowSideMenu(true)}
          onSearchToggle={() => setShowSearch(true)}
        />
        <div style={{ textAlign: 'center', padding: '120px 20px' }}>
          <div className="spinner-border text-theme" role="status"></div>
        </div>
      </div>
    );
  }

 if (error || !chadhava) {
    return (
      <div className="pd-page">
        <SideMenu isOpen={showSideMenu} onClose={() => setShowSideMenu(false)} />
        <PopupSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
        <MobileMenu isOpen={showMobileMenu} onClose={() => setShowMobileMenu(false)} />
        <Header
          onMenuToggle={() => setShowMobileMenu(true)}
          onSideMenuToggle={() => setShowSideMenu(true)}
          onSearchToggle={() => setShowSearch(true)}
        />        <div style={{ textAlign: 'center', padding: '120px 20px' }}>
          <h3>Chadhava Not Found</h3>
          <p>We couldn't load this offering. It may have been removed.</p>
          <Link to="/chadhava" className="th-btn rounded-pill mt-3 d-inline-block">
            Browse All Chadhava
          </Link>
        </div>
      </div>
    );
  }

  const title = chadhava.title || 'Chadhava Offering';
  const rating = chadhava.rating || 4.9;
  const reviewsCount = chadhava.reviewsCount || chadhava.reviews?.length || 0;
  const devoteesCount = chadhava.devoteesCount || '50K+';
  const price = chadhava.price ?? 0;
  const priceDesc = chadhava.description || chadhava.short_description || '';
  const templeName = chadhava.templeName || 'Verified Temple';
  const seatsLeft = chadhava.seatsLeft;

  const features = chadhava.features?.length ? chadhava.features : [
    { icon: 'fas fa-gopuram', label: templeName },
    { icon: 'fas fa-om', label: 'Sacred Deity Blessings' },
    { icon: 'fas fa-user-graduate', label: 'Expert Pandits' },
    { icon: 'fas fa-box-open', label: 'Holy Prasad' },
  ];

const ADDONS = chadhava.addons?.length
    ? chadhava.addons.map((a) => ({
      id: a._id || a.id,
      name: a.pname || a.name,
      sub: a.pdesc || a.subtitle || a.description || '',
      price: a.pamount ? `₹${a.pamount}` : (a.price ? `₹${a.price}` : ''),
      rawPrice: a.pamount || a.price || 0,
      img: a.pimage || a.image,
    }))
    : [];

  const PRASAD = chadhava.prasad?.length
    ? chadhava.prasad.map((p) => ({
      id: p._id || p.id,
      name: p.name,
      sub: p.subtitle || p.description || '',
      price: p.amount ? `₹${p.amount}` : (p.price ? `₹${p.price}` : ''),
      rawPrice: p.amount || p.price || 0,
      img: p.image,
    }))
    : [];

  const addonsTotal = ADDONS.reduce((sum, a) => sum + (addonQtys[a.id] || 0) * a.rawPrice, 0);
  const prasadTotal = PRASAD.reduce((sum, p) => sum + (prasadQtys[p.id] || 0) * p.rawPrice, 0);
  const totalItemsCount =
    Object.values(addonQtys).reduce((s, q) => s + q, 0) +
    Object.values(prasadQtys).reduce((s, q) => s + q, 0);
  const cartTotalAmount = price + addonsTotal + prasadTotal;

  const INC = chadhava.included?.length
    ? chadhava.included.map((i) => ({ icon: i.icon || 'fas fa-check', name: i.name, sub: i.subtitle || '' }))
    : DEFAULT_INC;

  const HOW = chadhava.howItWorks?.length
    ? chadhava.howItWorks.map((h, i) => ({ num: pad(i + 1), label: h.label || h }))
    : DEFAULT_HOW;

  const aboutTitle = chadhava.aboutTitle || `About ${title}`;
  const aboutText = chadhava.aboutText || chadhava.description || '';
  const ABOUT_ITEMS = chadhava.aboutPoints?.length ? chadhava.aboutPoints : [
    'It removes financial obstacles and debt',
    'Brings harmony, peace & family happiness',
    'Blessings for career growth & success',
    'Protection from Shani Dosha & bad karma',
  ];

  const FAQS = (chadhava.faq?.length || chadhava.faqs?.length)
    ? (chadhava.faq || chadhava.faqs).map((f) => ({ q: f.question || f.q, a: f.answer || f.a }))
    : DEFAULT_FAQS;

  const REVIEWS = chadhava.reviews?.length
    ? chadhava.reviews.map((r) => ({
      rating: r.rating || 5,
      text: r.text || r.comment || '',
      name: r.name || r.userName || 'Devotee',
      city: r.city || '',
      avatar: r.avatar || AVATAR_PLACEHOLDER,
      img: r.image || IMAGE_PLACEHOLDER,
    }))
    : DEFAULT_REVIEWS;

  const slugify = (text) =>
    (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

  const SIMILAR = chadhava.similar?.length
    ? chadhava.similar.map((s) => ({
      name: s.title || s.name,
      price: s.price ? `₹${s.price}` : '',
      rating: s.rating || 4.8,
      img: s.chadhavaImage || s.image || IMAGE_PLACEHOLDER,
      id: s._id || s.id,
    }))
    : [];

  const simMax = Math.max(0, SIMILAR.length - SIM_VISIBLE);

return (
    <div className="pd-page" style={{ paddingBottom: totalItemsCount > 0 ? '100px' : undefined }}>
      <SideMenu isOpen={showSideMenu} onClose={() => setShowSideMenu(false)} />
      <PopupSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
      <MobileMenu isOpen={showMobileMenu} onClose={() => setShowMobileMenu(false)} />
      <Header
        onMenuToggle={() => setShowMobileMenu(true)}
        onSideMenuToggle={() => setShowSideMenu(true)}
        onSearchToggle={() => setShowSearch(true)}
      />
      <LoginOTPModal
        isOpen={showLoginModal}
        onClose={() => { setShowLoginModal(false); setPendingAction(null); }}
      />

      <style>{`
        .cd-mobile-proceed-wrap { display: none; }
        @media (max-width: 767px) {
          .cd-mobile-proceed-wrap {
            display: block;
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 998;
            padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
            background: #fff;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
          }
          .cd-mobile-proceed-btn {
            width: 100%;
            background: linear-gradient(135deg, #7B1C38, #5a1329);
            color: #fff;
            border: none;
            border-radius: 999px;
            padding: 14px;
            font-weight: 700;
            font-size: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            cursor: pointer;
          }
          .cd-addon-sub {
            display: -webkit-box !important;
            -webkit-line-clamp: 3 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .cd-rev-card {
            display: flex !important;
            flex-direction: row !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .cd-rev-card-body {
            flex: 1 1 auto !important;
            min-width: 0 !important;
          }
          .cd-rev-img {
            width: 100px !important;
            height: 130px !important;
            flex-shrink: 0 !important;
            object-fit: cover !important;
            border-radius: 12px !important;
          }
        }
      `}</style>

      <div className="cd-bc">
        <Link to="/">Home</Link>&nbsp;›&nbsp;
        <Link to="/chadhava">Chadhava</Link>
      </div>

      <div className="cd-hero-mobile-carousel">
        <div
          className="cd-hero-mobile-track"
          ref={heroMobileRef}
          onScroll={handleHeroMobileScroll}
          onTouchStart={() => { heroUserInteractingRef.current = true; }}
          onTouchEnd={() => {
            setTimeout(() => { heroUserInteractingRef.current = false; }, 3000);
          }}
        >
          {galleryImages.map((src, i) => (
            <img
              key={i}
              className="cd-hero-mobile-slide"
              src={src}
              alt={`${title} ${i + 1}`}
              onError={handleImgError(IMAGE_PLACEHOLDER)}
            />
          ))}
        </div>
        {galleryImages.length > 1 && (
          <div className="cd-hero-mobile-dots">
            {galleryImages.map((_, i) => (
              <div
                key={i}
                className={`cd-hero-mobile-dot${i === heroMobileIdx ? ' active' : ''}`}
                onClick={() => scrollHeroMobileTo(i)}
              />
            ))}
          </div>
        )}
      </div>

      <div
        className="cd-hero"
        style={{
          backgroundImage: `url("${encodeURI(galleryImages[0])}")`,
          backgroundColor: '#f5ede0',
        }}
      >
        <div className="cd-hero-left" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="cd-hero-bg-overlay" />

          <div className="cd-hero-body">
            <div className="cd-auspicious"><i className="fas fa-crown" /> Most Auspicious – Limited Day</div>
            <h1 className="cd-hero-h1">{title}</h1>
            <div className="cd-hero-meta">
              <div className="cd-meta-item">
                {[1, 2, 3, 4, 5].map(s => (
                  <i key={s} className={`fa${s <= Math.round(rating) ? 's' : 'r'} fa-star`} />
                ))}
                &nbsp;{rating} ({(reviewsCount || 0).toLocaleString?.() || reviewsCount} Reviews)
              </div>
              <span className="cd-meta-sep">|</span>
              <div className="cd-meta-item"><i className="fas fa-users" /> {devoteesCount} Devotees</div>
              <span className="cd-meta-sep">|</span>
              <div className="cd-meta-item"><i className="fas fa-gopuram" /> Temple Certified</div>
            </div>
            <div className="cd-features">
              {features.map((f, i) => (
                <div key={i} className="cd-feat"><i className={f.icon} /> {f.label}</div>
              ))}
            </div>
            <div className="cd-gallery">
              {galleryImages.slice(0, 4).map((src, i) => (
                <img key={i} className="cd-gal-img" src={src} alt={`Gallery ${i + 1}`}
                  onError={handleImgError(IMAGE_PLACEHOLDER)} />
              ))}
              <div className="cd-gal-more" onClick={() => setShowGallery(true)} style={{ cursor: 'pointer' }}>
                <span className="gm-num">View</span><br />
                <span className="gm-num">{chadhava.galleryCount || `${galleryImages.length}+`}</span><br />
                <span className="gm-lbl">Photos</span>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            minHeight: '1px',
          }}
        >
          <img
            src="/assets/img/images/leftpannel.png"
            alt={title}
            onError={handleImgError(IMAGE_PLACEHOLDER)}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
              border: 'none',
              outline: 'none',
              borderRadius: '14px',
            }}
          />
        </div>
      </div>



      <div className="cd-trust">
        {[
          { icon: 'fas fa-gopuram', title: 'Temple Certified', sub: 'Authentic rituals from verified temples' },
          { icon: 'fas fa-user-check', title: 'Pandit Verified', sub: 'Experienced & background verified' },
          { icon: 'fas fa-box-open', title: 'Prasad Delivery', sub: 'Purified prasad delivered to your home' },
          { icon: 'fas fa-video', title: 'Live Updates', sub: 'Ritual updates & photos on WhatsApp & Email' },
        ].map((t, i) => (
          <div key={i} className="cd-trust-item">
            <div className="cd-trust-ico"><i className={t.icon} /></div>
            <div><div className="cd-trust-title">{t.title}</div><div className="cd-trust-sub">{t.sub}</div></div>
          </div>
        ))}
      </div>

      <div id="addons-section">
        {ADDONS.length > 0 && (
          <div className="cd-addons">
            <div className="cd-addons-head">
              <div className="cd-addons-title">✨ Choose an Offering</div>
            </div>
            <div className="cd-addons-scroll">
              <button className="cd-addons-arr left" onClick={() => scrollRow(addonsRowRef, -1)}><i className="fas fa-chevron-left" /></button>
              <div className="cd-addons-row" ref={addonsRowRef}>
                {ADDONS.map((a, i) => {
                  const qty = addonQtys[a.id] || 0;
                  return (
                    <div key={a.id || i} className="cd-addon-card">
                      <img className="cd-addon-img" src={a.img} alt={a.name}
                        onError={handleImgError(IMAGE_PLACEHOLDER)} />
                      <div className="cd-addon-body">
                        <div className="cd-addon-name">{a.name}</div>
                        <div className="cd-addon-sub">{a.sub}</div>
                        <div className="cd-addon-price">{a.price}</div>
                        {qty === 0 ? (
                          <button
                            type="button"
                            className="cd-add-btn"
                            onClick={() => handleAddonAddClick(a.id)}
                          >
                            <i className="fas fa-plus" /> Add
                          </button>
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: '#0b845c',
                              borderRadius: '20px',
                              padding: '4px 8px',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => changeAddonQty(a.id, -1)}
                              style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 700, fontSize: '16px', width: '22px', cursor: 'pointer' }}
                            >
                              −
                            </button>
                            <span style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>{qty}</span>
                            <button
                              type="button"
                              onClick={() => changeAddonQty(a.id, 1)}
                              style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 700, fontSize: '16px', width: '22px', cursor: 'pointer' }}
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button className="cd-addons-arr right" onClick={() => scrollRow(addonsRowRef, 1)}><i className="fas fa-chevron-right" /></button>
            </div>
          </div>
        )}

        {PRASAD.length > 0 && (
          <div className="cd-addons">
            <div className="cd-addons-head">
              <div className="cd-addons-title">🙏 Add Blessed Prasad</div>
            </div>
            <div className="cd-addons-scroll">
              <button className="cd-addons-arr left" onClick={() => scrollRow(prasadRowRef, -1)}><i className="fas fa-chevron-left" /></button>
              <div className="cd-addons-row" ref={prasadRowRef}>
                {PRASAD.map((p, i) => {
                  const qty = prasadQtys[p.id] || 0;
                  return (
                    <div key={p.id || i} className="cd-addon-card">
                      <img className="cd-addon-img" src={p.img} alt={p.name}
                        onError={handleImgError(IMAGE_PLACEHOLDER)} />
                      <div className="cd-addon-body">
                        <div className="cd-addon-name">{p.name}</div>
                        <div className="cd-addon-sub">{p.sub}</div>
                        <div className="cd-addon-price">{p.price}</div>
                        {qty === 0 ? (
                          <button
                            type="button"
                            className="cd-add-btn"
                            onClick={() => handlePrasadAddClick(p.id)}
                          >
                            <i className="fas fa-plus" /> Add
                          </button>
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: '#0b845c',
                              borderRadius: '20px',
                              padding: '4px 8px',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => changePrasadQty(p.id, -1)}
                              style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 700, fontSize: '16px', width: '22px', cursor: 'pointer' }}
                            >
                              −
                            </button>
                            <span style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>{qty}</span>
                            <button
                              type="button"
                              onClick={() => changePrasadQty(p.id, 1)}
                              style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 700, fontSize: '16px', width: '22px', cursor: 'pointer' }}
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button className="cd-addons-arr right" onClick={() => scrollRow(prasadRowRef, 1)}><i className="fas fa-chevron-right" /></button>
            </div>
          </div>
        )}
      </div>

      <div className="cd-inc-how">
        <div className="cd-inc-sec">
          <div className="cd-isec-title"><i className="fas fa-list-check" /> What's Included in Chadhava</div>
          <div className="cd-inc-row">
            {INC.map((item, i) => (
              <div key={i} className="cd-inc-item">
                <div className="cd-inc-ico"><i className={item.icon} /></div>
                <div className="cd-inc-name">{item.name}</div>
                <div className="cd-inc-sub">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="cd-how-sec">
          <div className="cd-isec-title"><i className="fas fa-route" /> ✦ How It Works?</div>
          <div className="cd-how-steps">
            {HOW.map((s, i) => (
              <div key={i} className="cd-how-step">
                <div className="cd-step-circle">{s.num}</div>
                <div className="cd-step-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="cd-about-video">
        <div className="cd-about-wrap">
          <div className="cd-about-title">{aboutTitle}</div>
          <div className="cd-about-text" style={clampStyle(false)}>
            {aboutText}
          </div>
          <div className="cd-about-list">
            {ABOUT_ITEMS.map((item, i) => (
              <div key={i} className="cd-about-item"><i className="fas fa-om" />{item}</div>
            ))}
          </div>
          <span className="cd-about-om">ॐ</span>
        </div>
        {chadhava.videoThumbnail && (
          <div>
            <div className="cd-video-title">Watch Ritual Preview</div>
            <div className="cd-video-wrap">
              <img className="cd-video-thumb"
                src={chadhava.videoThumbnail} alt="Ritual Preview"
                onError={handleImgError(IMAGE_PLACEHOLDER)} />
              <div className="cd-video-play"><i className="fas fa-play" /></div>
              {chadhava.videoDuration && <div className="cd-video-dur">⏱ {chadhava.videoDuration}</div>}
            </div>
          </div>
        )}
      </div>

      <div className="cd-reviews-sec">
        <div className="cd-rev-head">
          <div className="cd-rev-htitle"><i className="fas fa-star" /> Devotee Experiences</div>
          <a href="#"
            style={{ fontSize: 12.5, color: '#7b1a3a', fontWeight: 600 }}
            onClick={(e) => { e.preventDefault(); setShowAllReviews(true); }}
          >
            View All Reviews
          </a>
        </div>
        <div className="cd-rev-hsub">See what our devotees have to say</div>

        <div className="cd-rev-layout">
          <div className="cd-rev-left">
            <div className="cd-rev-slider">
              <div className="cd-rev-track" style={{ transform: `translateX(-${revDot * 100}%)` }}>
                {REVIEWS.map((r, i) => (
                  <div key={i} className="cd-rev-slide">
                    <div className="cd-rev-card">
                      <div className="cd-rev-card-body">
                        <div className="cd-rev-stars">
                          {[1, 2, 3, 4, 5].map(s => <i key={s} className={`fa${s <= Math.floor(r.rating) ? 's' : 'r'} fa-star`} />)}
                          <span>{r.rating}</span>
                        </div>
                        <div className="cd-rev-text">{r.text}</div>
                        <div className="cd-rev-user">
                          <img className="cd-rev-av" src={r.avatar} alt={r.name}
                            onError={handleImgError(AVATAR_PLACEHOLDER)} />
                          <div>
                            <div className="cd-rev-name">{r.name}</div>
                            <div className="cd-rev-loc">{r.city}</div>
                          </div>
                        </div>
                      </div>
                      <img className="cd-rev-img" src={r.img} alt="Prasad"
                        onError={handleImgError(IMAGE_PLACEHOLDER)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="cd-rev-dots">
              {REVIEWS.map((_, d) => (
                <div key={d} className={`cd-rev-dot${revDot === d ? ' active' : ''}`} onClick={() => setRevDot(d)} />
              ))}
            </div>
          </div>

          <div className="cd-rev-right">
            <div className="cd-stats-row">
              {[
                { icon: 'fas fa-users', num: chadhava.stats?.devotees || '50,000+', lbl: 'Devotees Served' },
                { icon: 'fas fa-star', num: rating, lbl: 'Average Rating', star: true },
                { icon: 'fas fa-gopuram', num: chadhava.stats?.temples || '108+', lbl: 'Temples' },
                { icon: 'fas fa-shield-alt', num: chadhava.stats?.satisfaction || '99%', lbl: 'Satisfaction Rate' },
              ].map((s, i) => (
                <div key={i} className="cd-stat-cell">
                  <i className={`${s.icon} cd-stat-ico`} />
                  <div className="cd-stat-num">{s.star && <span className="cd-stat-star">★</span>}{s.num}</div>
                  <div className="cd-stat-lbl">{s.lbl}</div>
                </div>
              ))}
            </div>
            <div className="cd-trusted-bar">Trusted by thousands of devotees across India &amp; worldwide</div>
          </div>
        </div>
      </div>

      {SIMILAR.length > 0 && (
        <div className="cd-similar">
          <div className="cd-sec-label">
            <i className="fas fa-om" /> You May Also Like <i className="fas fa-om" />
          </div>
          <button className="cd-sim-arr left"
            onClick={() => setSimIdx(i => Math.max(0, i - 1))}
            disabled={simIdx === 0}
            style={{ opacity: simIdx === 0 ? 0.35 : 1 }}>
            <i className="fas fa-chevron-left" />
          </button>
          <button className="cd-sim-arr right"
            onClick={() => setSimIdx(i => Math.min(simMax, i + 1))}
            disabled={simIdx >= simMax}
            style={{ opacity: simIdx >= simMax ? 0.35 : 1 }}>
            <i className="fas fa-chevron-right" />
          </button>
          <div className="cd-sim-scroll">
            <div className="cd-sim-track" style={{ transform: `translateX(calc(-${simIdx * 25}% - ${simIdx * 14}px))` }}>
              {SIMILAR.map((s, i) => (
                <Link key={i} to={s.id ? `/chadhava/${slugify(s.name)}/${s.id}` : '#'} className="cd-sim-card">
                  <img className="cd-sim-img" src={s.img} alt={s.name}
                    onError={handleImgError(IMAGE_PLACEHOLDER)} />
                  <div className="cd-sim-info">
                    <div className="cd-sim-name">{s.name}</div>
                    <div className="cd-sim-price">{s.price}</div>
                    <div className="cd-sim-stars">
                      {[1, 2, 3, 4, 5].map(st => <i key={st} className={`fa${st <= Math.floor(s.rating) ? 's' : 'r'} fa-star`} />)}
                      <span>{s.rating}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="cd-faq">
        <div className="cd-sec-label">
          <i className="fas fa-om" /> Frequently Asked Questions <i className="fas fa-om" />
        </div>
        <div className="cd-faq-grid">
          {FAQS.map((f, i) => <FaqItem key={i} num={i + 1} q={f.q} a={f.a} />)}
        </div>
      </div>

      <div className="cd-cta">
        <img className="cd-cta-diya left" src="/assets/img/puja/diya.png" alt="" onError={e => e.target.style.display = 'none'} />
        <img className="cd-cta-diya right" src="/assets/img/puja/diya.png" alt="" onError={e => e.target.style.display = 'none'} />
        <div className="cd-cta-text">
          <div className="t1">Perform this auspicious Chadhava and seek divine blessings</div>
          <div className="t2">for you &amp; your family.</div>
        </div>
        <Link
          to="#"
          className="cd-cta-btn"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('addons-section')?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
          }}
        >
          Reserve Your Offering Now <i className="fas fa-arrow-right" />
        </Link>
      </div>

      {showAllReviews && (
        <ViewAllReviewsPopup reviews={REVIEWS} onClose={() => setShowAllReviews(false)} />
      )}

      {showGallery && (
        <GalleryPopup images={galleryImages} onClose={() => setShowGallery(false)} />
      )}

      <Footer />

      {totalItemsCount === 0 && !addonsSectionVisible && (
        <div className="cd-mobile-proceed-wrap">
          <button
            type="button"
            className="cd-mobile-proceed-btn"
            onClick={() => {
              document.getElementById('addons-section')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              });
            }}
          >
            Select Chadhava Package <i className="fas fa-arrow-right" />
          </button>
        </div>
      )}

      {totalItemsCount > 0 && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: '20px',
            zIndex: 999,
            width: 'min(92%, 480px)',
            background: 'linear-gradient(135deg, #0b845c, #0a6e4c)',
            borderRadius: '18px',
            boxShadow: '0 10px 30px rgba(11,132,92,0.35)',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ color: '#fff', minWidth: 0 }}>
            <div style={{ fontSize: '11px', opacity: 0.9, fontWeight: 600, letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fas fa-hands-praying" />
              {totalItemsCount} Add-on{totalItemsCount > 1 ? 's' : ''} Selected
              {cartSyncing && <span style={{ opacity: 0.75 }}>· Syncing…</span>}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px' }}>
              ₹{cartTotalAmount.toLocaleString('en-IN')}
            </div>
          </div>
          <button
            type="button"
            onClick={handleProceed}
            style={{
              background: '#fff',
              color: '#0b845c',
              fontWeight: 700,
              fontSize: '14px',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '999px',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
              cursor: 'pointer',
            }}
          >
            Proceed <i className="fas fa-arrow-right" />
          </button>
        </div>
      )}

    </div>
  );
};

export default ChadhavaDetails;