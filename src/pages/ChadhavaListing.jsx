import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import SideMenu from '../components/layout/SideMenu';
import MobileMenu from '../components/layout/MobileMenu';
import PopupSearch from '../components/layout/PopupSearch';
import ScrollTop from '../components/common/ScrollTop';
import ChadhavaService from '../services/chadhavaServices';
import apiService from '../services/apiServices';
import storageService from '../services/storageServices';
import LoginOTPModal from '../components/accounts/LoginOTPModel';
import { useSEO } from '../hooks/seoHook';
import { SEO } from '../config/seoConfig';
import './ChadhavaListing.css';
import MobileBottomNav from '../components/layout/MobileNavbar';

// NOTE: verify this exact path against your backend router mount point —
// the handler is `router.post("/new_consultation_add", ...)`, normally
// mounted under a prefix. Follows the same pattern as other endpoints in
// this codebase (https://admin.vaidikguru.com/user_api/..., /puja/..., etc).
// Adjust the prefix below if your backend mounts it differently.
const CONSULTATION_API = "/user_api/add_contact_us";

/* ── helpers ── */
const BADGE_MAP = [
  { label: 'Most Popular', cls: 'popular', icon: 'fas fa-fire' },
  { label: 'New', cls: 'new', icon: 'fas fa-bolt' },
  { label: 'Bestseller', cls: 'best', icon: 'fas fa-star' },
  { label: 'Limited', cls: 'limited', icon: 'fas fa-clock' },
];
const getBadge = (i) => BADGE_MAP[i % BADGE_MAP.length];

/* ── Custom Radio ── */
const RadioOpt = ({ label, count, checked, onChange }) => (
  <div className="ch-opt" onClick={onChange}>
    <span className={`ch-opt-circle${checked ? ' on' : ''}`} />
    <span>{label}</span>
    {count !== undefined && <span className="ch-opt-count">({count})</span>}
  </div>
);

/* ── Skeleton Card ── */
const SkeletonCard = () => (
  <div className="ch-card">
    <div className="ch-sk" style={{ height: 190, borderRadius: '14px 14px 0 0' }} />
    <div style={{ padding: 14 }}>
      <div className="ch-sk mb-2" style={{ height: 14, width: '75%' }} />
      <div className="ch-sk mb-2" style={{ height: 12, width: '50%' }} />
      <div className="ch-sk mb-1" style={{ height: 11, width: '90%' }} />
      <div className="ch-sk mb-3" style={{ height: 11, width: '70%' }} />
      <div className="ch-sk" style={{ height: 1, marginBottom: 10 }} />
      <div className="d-flex justify-content-between">
        <div className="ch-sk" style={{ height: 18, width: 70 }} />
        <div className="ch-sk" style={{ height: 18, width: 90 }} />
      </div>
    </div>
  </div>
);

const fixImgHost = (url) => {
  if (!url) return "";
  let clean = typeof url === "string" ? url.replace("admin.astrogurujii.com", "admin.vaidikguru.com") : url;
  if (typeof clean === "string" && clean.startsWith("/")) {
    clean = `https://admin.vaidikguru.com${clean}`;
  }
  return clean;
};

/* ── Chadhava Card ── */
const ChadhavaCard = ({ item, index, onView }) => {
  const [liked, setLiked] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const { label, cls, icon } = getBadge(index);

  const title = item.title || item.name || item.chadhavaName || "Sacred Chadhava";
  const imgSrc = fixImgHost(item.chadhavaImage || item.image || item.webImage || item.mobileImage || item.pimage);
  const temple = item.templeName || item.mandirName || item.temple || "";
  const price = Number(item.price || item.packagePrice || item.chadhavaPrice || 0);

  return (
    <motion.div className="ch-card"
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .28, delay: Math.min(index * .04, .32) }}
      onClick={() => onView(item)}>

      {/* Badge */}
      <div className="ch-badge-wrap">
        <span className={`ch-badge ${cls}`}><i className={icon} />{label}</span>
      </div>

      {/* Heart */}
      <button className={`ch-heart${liked ? ' on' : ''}`}
        onClick={e => { e.stopPropagation(); setLiked(!liked) }}>
        <i className={liked ? 'fas fa-heart' : 'far fa-heart'} />
      </button>

      {/* Image */}
      <div className="ch-img-wrap">
        {imgSrc && !imgErr ? (
          <img src={imgSrc} alt={title} onError={() => setImgErr(true)} />
        ) : (
          <div className="ch-img-placeholder"><i className="fas fa-om" /></div>
        )}
      </div>

      {/* Body */}
      <div className="ch-card-body">
        <div className="ch-card-name">{title}</div>
        {temple && (
          <div className="ch-card-loc">
            <i className="fas fa-gopuram" />
            {temple}
          </div>
        )}
        <div className="ch-card-desc">
          {item.description || item.short_description || 'Experience divine blessings through this sacred offering.'}
        </div>
      </div>

      {/* Footer */}
      <div className="ch-card-footer">
        <div>
          <span className="ch-price-from">Starting from</span>
          <div className="ch-price">{price > 0 ? `₹${price.toLocaleString('en-IN')}` : 'Free'}</div>
        </div>
        <button className="ch-details-btn" onClick={e => { e.stopPropagation(); onView(item) }}>
          Details View <i className="fas fa-arrow-right" />
        </button>
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
        subject: "Personalized Chadhava Recommendation",
        message: message.trim() || "Request for personalized chadhava recommendation",
        service: "chadhava",
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
            Get a Personalized Recommendation
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
          Tell us what you're looking for and our team will suggest the right Chadhava offering for you.
        </p>

        {result?.ok ? (
          <div style={{ textAlign: "center", padding: "18px 0" }}>
            <i className="fas fa-check-circle" style={{ fontSize: 34, color: "#059669", marginBottom: 10, display: "block" }} />
            <p style={{ fontSize: 13.5, color: "#111827", fontWeight: 600, margin: 0 }}>{result.msg}</p>
            <button
              onClick={handleClose}
              className="ch-rec-btn"
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
              className="ch-rec-btn"
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

/* ── Recommend Card ── */
const RecommendCard = ({ onOpen }) => (
  <div className="ch-rec">
    <div className="ch-rec-ico"><i className="fas fa-hands-praying" /></div>
    <div className="ch-rec-t">Can't find the right offering?</div>
    <p className="ch-rec-s">Tell us your requirements and our team will help you.</p>
    <button className="ch-rec-btn" onClick={onOpen}>Get Personalized Recommendation</button>
    <div className="ch-rec-trust">Trusted by 50K+ Devotees</div>
    <div>
      {['#c0392b', '#e67e22', '#27ae60', '#2980b9', '#8e44ad'].map((c, i) => (
        <span key={i} className="ch-rec-av" style={{ background: c }}>{['A', 'M', 'R', 'S', 'V'][i]}</span>
      ))}
    </div>
  </div>
);

/* ── Sidebar ── */
const SidebarContent = ({ filters, setFilters, onApply, searchVal, setSearchVal, allItems = [] }) => {
  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const reset = () => { setFilters({ category: 'all', priceBucket: '', maxPrice: 10000, sortBy: 'popular', temple: '', occasion: '', search: '' }); setSearchVal(''); };

  const handleApplyClick = () => {
    setFilters(f => ({ ...f, search: searchVal }));
    onApply();
  };

  const templesFromData = Array.from(
    new Set(allItems.map((i) => i.templeName).filter(Boolean))
  );
  const templeOptions = templesFromData.length
    ? templesFromData
    : ['Ujjain Mahakaleshwar', 'Kashi Vishwanath', 'Tirupati Balaji', 'Gaya Vishnupad', 'Moksha Dham, Haridwar'];

  const getCatCount = (cat) => {
    if (!allItems.length) return 0;
    if (cat === "all") return allItems.length;
    return allItems.filter((i) => {
      const text = `${i.title || ""} ${i.category || ""} ${i.description || ""}`.toLowerCase();
      if (cat === "saree") return /saree|sari/i.test(text);
      if (cat === "vastra") return /vastra|cloth|poshak|dress/i.test(text);
      if (cat === "chola") return /chola|shringar|sindoor/i.test(text);
      if (cat === "pushpa") return /pushpa|phool|flower|garland|mala/i.test(text);
      if (cat === "other") {
        return !/saree|sari|vastra|cloth|poshak|dress|chola|shringar|sindoor|pushpa|phool|flower|garland|mala/i.test(text);
      }
      return text.includes(cat);
    }).length;
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <span className="ch-sb-title">Filters</span>
        <button className="ch-sb-reset" onClick={reset}>Reset All</button>
      </div>

      {/* Search in sidebar */}
      <div className="ch-sb-search">
        <input
          type="text"
          className="ch-sb-search-input"
          placeholder="Search offerings..."
          value={searchVal}
          onChange={e => {
            setSearchVal(e.target.value);
            setFilters(f => ({ ...f, search: e.target.value }));
          }}
          onKeyDown={e => e.key === 'Enter' && handleApplyClick()}
        />
        <button className="ch-sb-search-btn" onClick={handleApplyClick}>
          <i className="fas fa-search" />
        </button>
      </div>

      <div className="ch-div" />

      <div className="ch-fh">Category</div>
      {[
        { v: 'all', l: 'All Chadhavas', c: getCatCount('all') }, { v: 'saree', l: 'Saree Chadava', c: getCatCount('saree') },
        { v: 'vastra', l: 'Vastra Chadava', c: getCatCount('vastra') }, { v: 'chola', l: 'Chola Chadava', c: getCatCount('chola') },
        { v: 'pushpa', l: 'Pushpa Chadava', c: getCatCount('pushpa') }, { v: 'other', l: 'Other Chadavas', c: getCatCount('other') },
      ].map(({ v, l, c }) => (
        <RadioOpt key={v} label={l} count={c} checked={filters.category === v} onChange={() => set('category', v)} />
      ))}

      <div className="ch-div" />

      <div className="ch-fh">Price Range</div>
      <input type="range" className="ch-range-input" min={0} max={10000} step={100} value={filters.maxPrice || 10000}
        onChange={e => set('maxPrice', +e.target.value)}
        style={{ background: `linear-gradient(to right,#c0392b ${(filters.maxPrice || 10000) / 100}%,#e5e7eb ${(filters.maxPrice || 10000) / 100}%)` }}
      />
      <div className="ch-range-ends"><span>₹0</span><span>₹{(filters.maxPrice || 10000).toLocaleString('en-IN')}{filters.maxPrice >= 10000 ? '+' : ''}</span></div>
      <div className="ch-buckets">
        {[['₹0-₹499', '0-499'], ['₹500-₹1499', '500-1499'], ['₹1500-₹4999', '1500-4999'], ['₹5000+', '5000+']].map(([l, v]) => (
          <button key={v} className={`ch-bucket${filters.priceBucket === v ? ' on' : ''}`}
            onClick={() => set('priceBucket', filters.priceBucket === v ? '' : v)}>{l}</button>
        ))}
      </div>

      <div className="ch-div" />

      <div className="ch-fh">Sort By</div>
      {[['popular', 'Most Popular'], ['price_low', 'Price: Low to High'], ['price_high', 'Price: High to Low'], ['recent', 'Recently Added'], ['az', 'A - Z']].map(([v, l]) => (
        <RadioOpt key={v} label={l} checked={filters.sortBy === v} onChange={() => set('sortBy', v)} />
      ))}

      <div className="ch-div" />

      <div className="ch-fh">Temple</div>
      <select className="ch-sel" value={filters.temple} onChange={e => set('temple', e.target.value)}>
        <option value="">All Temples</option>
        {templeOptions.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      <div className="ch-div" />

      <div className="ch-fh">Occasion</div>
      <select className="ch-sel" value={filters.occasion} onChange={e => set('occasion', e.target.value)}>
        <option value="">All Occasions</option>
        {['Ekadashi', 'Somvar', 'Purnima', 'Amavasya', 'Navratri', 'Mahashivratri'].map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>

      <button className="ch-apply" onClick={handleApplyClick}>
        <i className="fas fa-filter" /> Apply Filters
      </button>
    </>
  );
};

/* ═══════════════════════ MAIN PAGE ═══════════════════════ */
const ChadhavaListing = () => {
  useSEO(SEO.chadhava);
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchVal, setSearchVal] = useState('');
  const [filters, setFilters] = useState({ category: 'all', priceBucket: '', maxPrice: 10000, sortBy: 'popular', temple: '', occasion: '', search: '' });

  const [showSearch, setShowSearch] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showRecModal, setShowRecModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const handleOpenRecommendation = useCallback(() => {
    const token = storageService.getToken() || localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      setPendingAction('recommendation');
      setShowLoginModal(true);
    } else {
      setShowRecModal(true);
    }
  }, []);

  const PAGE_SIZE = 9;
  const [allItems, setAllItems] = useState([]); // full list from the API, unsliced

  const fetchItems = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const res = await ChadhavaService.getChadhavaList(null);
      let list = [];
      if (res?.status) {
        let raw = res.data || res.results || res.result || res.chadhava || res.recordList || [];
        if (Array.isArray(raw)) {
          list = raw.flatMap((group) => {
            if (group && Array.isArray(group.result)) return group.result;
            if (group && typeof group === 'object') return [group];
            return [];
          }).filter(item => item && (item.title || item.name) && item.type !== 'App');
        }
      } else if (Array.isArray(res)) {
        list = res.filter(item => item && (item.title || item.name) && item.type !== 'App');
      }

      if (list && list.length > 0) {
        setAllItems(list);
      } else {
        setError(true);
      }
    } catch (e) { console.error("Chadhava fetchItems error:", e); setError(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Client-side filtering, sorting, and pagination
  useEffect(() => {
    if (!allItems.length) {
      setItems([]);
      setTotalPages(1);
      return;
    }

    let list = [...allItems];

    // 1. Search Filter
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (i) =>
          (i.title || "").toLowerCase().includes(q) ||
          (i.templeName || "").toLowerCase().includes(q) ||
          (i.description || "").toLowerCase().includes(q)
      );
    }

    // 2. Category Filter
    if (filters.category && filters.category !== "all") {
      const cat = filters.category.toLowerCase();
      list = list.filter((i) => {
        const text = `${i.title || ""} ${i.category || ""} ${i.description || ""}`.toLowerCase();
        if (cat === "saree") return /saree|sari/i.test(text);
        if (cat === "vastra") return /vastra|cloth|poshak|dress/i.test(text);
        if (cat === "chola") return /chola|shringar|sindoor/i.test(text);
        if (cat === "pushpa") return /pushpa|phool|flower|garland|mala/i.test(text);
        if (cat === "other") {
          return !/saree|sari|vastra|cloth|poshak|dress|chola|shringar|sindoor|pushpa|phool|flower|garland|mala/i.test(text);
        }
        return text.includes(cat);
      });
    }

    // 3. Price Bucket Filter
    if (filters.priceBucket) {
      const [min, max] = filters.priceBucket.split("-").map(Number);
      list = list.filter((i) => {
        const p = Number(i.price || 0);
        if (filters.priceBucket === "5000+") return p >= 5000;
        return p >= min && p <= max;
      });
    }

    // 4. Price Range Slider Filter
    if (filters.maxPrice && filters.maxPrice < 10000) {
      list = list.filter((i) => Number(i.price || 0) <= filters.maxPrice);
    }

    // 5. Temple Filter
    if (filters.temple) {
      list = list.filter((i) =>
        (i.templeName || "").toLowerCase().includes(filters.temple.toLowerCase())
      );
    }

    // 6. Occasion Filter
    if (filters.occasion) {
      list = list.filter((i) =>
        (i.occasion || i.description || i.title || "").toLowerCase().includes(filters.occasion.toLowerCase())
      );
    }

    // 7. Sort By Filter
    if (filters.sortBy === "price_low") {
      list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (filters.sortBy === "price_high") {
      list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (filters.sortBy === "recent") {
      list.sort((a, b) => {
        const da = new Date(a.createdAt || 0).getTime();
        const db = new Date(b.createdAt || 0).getTime();
        return db - da;
      });
    } else if (filters.sortBy === "az") {
      list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    }

    const total = Math.ceil(list.length / PAGE_SIZE) || 1;
    setTotalPages(total);
    const start = (page - 1) * PAGE_SIZE;
    setItems(list.slice(start, start + PAGE_SIZE));
  }, [allItems, filters, page]);

  const handleSearch = () => { setFilters(f => ({ ...f, search: searchVal })); setPage(1); };
  const handleApply = () => { setPage(1); fetchItems(); setDrawerOpen(false); };
  const handleView = (item) => navigate(`/chadhava/${item._id || item.id}`);
  const goPage = (p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1);
  const isSinglePage = totalPages <= 1;

  return (
    <div className="main-wrapper" style={{ paddingTop: 0, marginTop: 0 }}>

      <SideMenu isOpen={showSideMenu} onClose={() => setShowSideMenu(false)} />
      <PopupSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
      <MobileMenu isOpen={showMobileMenu} onClose={() => setShowMobileMenu(false)} />

      <Header
        onMenuToggle={() => setShowMobileMenu(true)}
        onSideMenuToggle={() => setShowSideMenu(true)}
        onSearchToggle={() => setShowSearch(true)}
      />

      {/* ══ HERO ══ */}
      <div className="ch-hero-outer">
        <div className="container">
          <div className="ch-hero">
            <img src="/assets/img/bg/chadawa.webp" alt="Explore Holy Chadavas - Sacred Offerings" className="ch-hero-img" />

          </div>


        </div>
      </div>

      {/* ══ BODY ══ */}
      <div className="ch-body">
        <div className="container">

          {/* Mobile top bar */}
          <div className="ch-mob-top">
            <button className="ch-filter-mob-btn" onClick={() => setDrawerOpen(true)}>
              <i className="fas fa-sliders-h" /> Filters
            </button>
            <select className="ch-sort-sel" value={filters.sortBy} onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value }))}>
              <option value="popular">Most Popular</option>
              <option value="price_low">Price: Low–High</option>
              <option value="price_high">Price: High–Low</option>
              <option value="recent">Recently Added</option>
              <option value="az">A – Z</option>
            </select>
          </div>

          {/* Drawer */}
          <div className="ch-drawer-wrap">
            <div className={`ch-drawer-overlay${drawerOpen ? ' show' : ''}`} onClick={() => setDrawerOpen(false)} />
            <div className={`ch-drawer${drawerOpen ? ' open' : ''}`}>
              <SidebarContent filters={filters} setFilters={setFilters} onApply={handleApply} searchVal={searchVal} setSearchVal={setSearchVal} allItems={allItems} />
            </div>
          </div>

          <div className="row g-4">
            {/* Sidebar */}
            <div className="col-md-3 ch-sidebar-desktop">
              <div className="ch-sidebar-box">
                <SidebarContent filters={filters} setFilters={setFilters} onApply={handleApply} searchVal={searchVal} setSearchVal={setSearchVal} allItems={allItems} />
              </div>
            </div>

            {/* Main */}
            <div className="col-md-9 col-12">

              {/* Header row */}
              <div className="ch-mhdr">
                <div className="ch-mhdr-left">
                  <h2>Sacred Chadhavas</h2>
                  <p>Choose from our wide range of holy offerings and feel the divine blessings.</p>
                </div>
                <div className="ch-mhdr-right">
                  {!loading && (
                    <span className="ch-showing">
                      Showing {allItems.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, allItems.length)} of {allItems.length} offerings
                    </span>
                  )}
                  <select className="ch-sort-sel" value={filters.sortBy} onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value }))}>
                    <option value="popular">Top Rated</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="recent">Recently Added</option>
                    <option value="az">A – Z</option>
                  </select>
                </div>
              </div>

              {/* Error */}
              {error && !loading && (
                <div className="text-center py-5">
                  <i className="fas fa-exclamation-circle fa-3x d-block mb-3" style={{ color: '#d1d5db' }} />
                  <p className="fw-bold text-dark mb-1">Chadhava not found</p>
                  <p className="small text-muted mb-3">Please check your connection and try again.</p>
                  <button className="ch-apply" style={{ width: 'auto', display: 'inline-flex', padding: '10px 28px', borderRadius: 9 }}
                    onClick={fetchItems}>Retry</button>
                </div>
              )}

              {/* Grid */}
              {!error && (
                <div className="row g-3">
                  {loading
                    ? Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="col-12 col-md-4"><SkeletonCard /></div>
                    ))
                    : <>
                      {items.map((item, i) => (
                        <div key={item._id || i} className="col-12 col-md-4">
                          <ChadhavaCard item={item} index={i} onView={handleView} />
                        </div>
                      ))}
                      <div className="col-12 col-md-4"><RecommendCard onOpen={handleOpenRecommendation} /></div>
                    </>
                  }
                </div>
              )}

              {/* Pagination */}
              {!loading && !error && items.length > 0 && !isSinglePage && (
                <div className="ch-pg">
                  <button className="ch-pg-btn" disabled={page === 1} onClick={() => goPage(page - 1)}>
                    <i className="fas fa-chevron-left" style={{ fontSize: 11 }} />
                  </button>
                  {pages.map(p => (
                    <button key={p} className={`ch-pg-btn${page === p ? ' cur' : ''}`} onClick={() => goPage(p)}>{p}</button>
                  ))}
                  {totalPages > 5 && <><span className="ch-pg-dots">…</span><button className="ch-pg-btn" onClick={() => goPage(totalPages)}>{totalPages}</button></>}
                  <button className="ch-pg-btn" disabled={page === totalPages} onClick={() => goPage(page + 1)}>
                    <i className="fas fa-chevron-right" style={{ fontSize: 11 }} />
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      <Footer />
      <ScrollTop />
      <MobileBottomNav />

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
    </div>
  );
};

export default ChadhavaListing;