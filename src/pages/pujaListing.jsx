import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import SideMenu from "../components/layout/SideMenu";
import MobileMenu from "../components/layout/MobileMenu";
import PopupSearch from "../components/layout/PopupSearch";
import ScrollTop from "../components/common/ScrollTop";
import PujaService from "../services/pujaServices";
import apiService from "../services/apiServices";
import storageService from "../services/storageServices";
import LoginOTPModal from "../components/accounts/LoginOTPModel";
import { useSEO } from "../hooks/seoHook";
import { SEO } from "../config/seoConfig";
import "./PujaListing.css";
import MobileBottomNav from "../components/layout/MobileNavbar";
import Canonical from "../components/common/canonical";

// NOTE: verify this exact path against your backend router mount point —
// the route handler you shared is `router.post("/new_consultation_add", ...)`,
// which is normally mounted under a prefix (e.g. /user_api). This follows
// the same pattern as every other endpoint in this codebase
// (https://admin.vaidikguru.com/user_api/..., /puja/..., etc). Adjust the
// prefix below if your backend mounts it differently.
const CONSULTATION_API = "/user_api/add_contact_us";

/* ── helpers ── */
const BADGE_MAP = [
  { label: "Most Popular", cls: "popular", icon: "fas fa-fire" },
  { label: "Bestseller", cls: "best", icon: "fas fa-star" },
  { label: "New", cls: "new", icon: "fas fa-bolt" },
  { label: "Trending", cls: "trending", icon: "fas fa-chart-line" },
];
const getBadge = (i) => BADGE_MAP[i % BADGE_MAP.length];

/* ── Custom Radio ── */
const RadioOpt = ({ label, count, checked, onChange }) => (
  <div className="pj-opt" onClick={onChange}>
    <span className={`pj-opt-circle${checked ? " on" : ""}`} />
    <span>{label}</span>
    {count !== undefined && (
      <span className="pj-opt-count">({count})</span>
    )}
  </div>
);

/* ── Skeleton Card ── */
const SkeletonCard = () => (
  <div className="pj-card">
    <div className="pj-sk" style={{ height: 130, borderRadius: "16px 16px 0 0" }} />
    <div style={{ padding: "12px 14px" }}>
      <div className="pj-sk mb-2" style={{ height: 13, width: "80%" }} />
      <div className="pj-sk mb-2" style={{ height: 10, width: "45%" }} />
      <div className="pj-sk mb-1" style={{ height: 10, width: "90%" }} />
      <div className="pj-sk" style={{ height: 1, marginBottom: 8 }} />
      <div className="d-flex justify-content-between">
        <div className="pj-sk" style={{ height: 16, width: 60 }} />
        <div className="pj-sk" style={{ height: 16, width: 80 }} />
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

/* ── Puja Card ── */
const PujaCard = ({ item, index, onView }) => {
  const [liked, setLiked] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const { label, cls, icon } = getBadge(index);

  const minPrice = item.packages?.length
    ? Math.min(...item.packages.map((p) => Number(p.packagePrice || 0)))
    : item.price || 0;

  const title = item.title || item.name || "Sacred Pooja";
  const image = fixImgHost(item.pujaImage || item.image || item.img || "");

  // Combine purpose + temple into a single condensed line to save vertical space
  const metaLine = [item.purposeOfPooja || item.purpose, item.mandirName || item.mandir]
    .filter(Boolean)
    .join(" • ");

  return (
    <>
    <motion.div
      className="pj-card"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.32) }}
      onClick={() => onView(item)}
    >
      <div className="pj-badge-wrap">
        <span className={`pj-badge ${cls}`}>
          <i className={icon} />
          {label}
        </span>
      </div>

      <button
        className={`pj-heart${liked ? " on" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          setLiked(!liked);
        }}
      >
        <i className={liked ? "fas fa-heart" : "far fa-heart"} />
      </button>

      <div className="pj-img-wrap">
        {!imgErr && image ? (
          <img
            src={image}
            alt={title}
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="pj-img-placeholder">
            <i className="fas fa-om" />
          </div>
        )}
      </div>

      <div className="pj-card-body">
        <div className="pj-card-name">{title}</div>
        {metaLine && (
          <div className="pj-card-purpose">
            <i className="fas fa-map-marker-alt" />
            {metaLine}
          </div>
        )}
      </div>

      <div className="pj-card-footer">
        <div>
          <span className="pj-price-from">Starting from</span>
          <div className="pj-price">
            {minPrice > 0
              ? `₹${minPrice.toLocaleString("en-IN")}`
              : "Free"}
          </div>
        </div>
        <button
          className="pj-details-btn"
          onClick={(e) => {
            e.stopPropagation();
            onView(item);
          }}
        >
          View <i className="fas fa-arrow-right" />
        </button>
      </div>
    </motion.div>
    </>
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
        subject: "Personalized Pooja Recommendation",
        message: message.trim() || "Request for personalized pooja recommendation",
        service: "puja",
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
          Tell us what you're looking for and our team will suggest the right pooja for you.
        </p>

        {result?.ok ? (
          <div style={{ textAlign: "center", padding: "18px 0" }}>
            <i className="fas fa-check-circle" style={{ fontSize: 34, color: "#059669", marginBottom: 10, display: "block" }} />
            <p style={{ fontSize: 13.5, color: "#111827", fontWeight: 600, margin: 0 }}>{result.msg}</p>
            <button
              onClick={handleClose}
              className="pj-rec-btn"
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
              className="pj-rec-btn"
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
  <div className="pj-rec">
    <div className="pj-rec-ico">
      <i className="fas fa-fire-flame-curved" />
    </div>
    <div className="pj-rec-t">Can't find the right pooja?</div>
    <p className="pj-rec-s">
      Share your requirement and our team will help you find the best pooja for
      you.
    </p>
    <button className="pj-rec-btn" onClick={onOpen}>Get Personalized Recommendation</button>
    <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>
      Trusted by 50K+ Devotees
    </div>
    <div>
      {["#c0392b", "#e67e22", "#27ae60", "#2980b9", "#8e44ad"].map((c, i) => (
        <span key={i} className="pj-rec-av" style={{ background: c }}>
          {["A", "M", "R", "S", "V"][i]}
        </span>
      ))}
    </div>
  </div>
  
);

/* ── Sidebar ── */
const SidebarContent = ({
  filters,
  setFilters,
  onApply,
  searchVal,
  setSearchVal,
  allItems = [],
}) => {
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const reset = () => {
    setFilters({
      category: "all",
      priceBucket: "",
      maxPrice: 25000,
      duration: "all",
      sortBy: "popular",
      temple: "",
      search: "",
    });
    setSearchVal("");
  };

  const handleApplyClick = () => {
    setFilters((f) => ({ ...f, search: searchVal }));
    onApply();
  };

  // Dynamic temple list from data
  const templesFromData = Array.from(
    new Set(allItems.map((i) => i.mandirName).filter(Boolean))
  );
  const templeOptions = templesFromData.length
    ? templesFromData
    : [
        "Kashi Vishwanath",
        "Tirupati Balaji",
        "Mahalakshmi Temple",
        "Gaya Ji, Bihar",
        "Meenakshi Temple, Madurai",
      ];

  // Dynamic Category Counts
  const getCatCount = (cat) => {
    if (!allItems.length) return 0;
    if (cat === "all") return allItems.length;
    return allItems.filter((i) => {
      const text = `${i.title || ""} ${i.purposeOfPooja || ""} ${i.category || ""}`.toLowerCase();
      if (cat === "health") return /health|heal|rog|swasthya|cure|illness|bimar/i.test(text);
      if (cat === "wealth") return /wealth|prosper|laxmi|lakshmi|kuber|dhan|money|business|samriddhi/i.test(text);
      if (cat === "protection") return /protect|relief|shanti|dosha|dosh|rahu|ketu|shani|kavach|suraksha|nazar|bada/i.test(text);
      if (cat === "marriage") return /marriag|love|vivah|relationship|patni|pati|manglik|var|vivaha|shadi/i.test(text);
      if (cat === "pitru") return /pitru|pitar|tarpan|shradh|gaya|ancestor/i.test(text);
      if (cat === "other") {
        return !/health|heal|rog|swasthya|wealth|prosper|laxmi|lakshmi|kuber|dhan|protect|relief|shanti|dosha|dosh|marriag|love|vivah|pitru|pitar/i.test(text);
      }
      return text.includes(cat);
    }).length;
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <span className="pj-sb-title">Filters</span>
        <button className="pj-sb-reset" onClick={reset}>
          Reset All
        </button>
      </div>

      <div className="pj-sb-search">
        <input
          type="text"
          className="pj-sb-search-input"
          placeholder="Search poojas..."
          value={searchVal}
          onChange={(e) => {
            setSearchVal(e.target.value);
            setFilters((f) => ({ ...f, search: e.target.value }));
          }}
          onKeyDown={(e) => e.key === "Enter" && handleApplyClick()}
        />
        <button className="pj-sb-search-btn" onClick={handleApplyClick}>
          <i className="fas fa-search" />
        </button>
      </div>

      <div className="pj-div" />

      <div className="pj-fh">Category</div>
      {[
        { v: "all", l: "All Poojas", c: getCatCount("all") },
        { v: "health", l: "Health & Healing", c: getCatCount("health") },
        { v: "wealth", l: "Wealth & Prosperity", c: getCatCount("wealth") },
        { v: "protection", l: "Protection & Relief", c: getCatCount("protection") },
        { v: "marriage", l: "Marriage & Love", c: getCatCount("marriage") },
        { v: "pitru", l: "Pitru Dosha", c: getCatCount("pitru") },
        { v: "other", l: "Other Poojas", c: getCatCount("other") },
      ].map(({ v, l, c }) => (
        <RadioOpt
          key={v}
          label={l}
          count={c}
          checked={filters.category === v}
          onChange={() => set("category", v)}
        />
      ))}

      <div className="pj-div" />

      <div className="pj-fh">Price Range</div>
      <input
        type="range"
        className="pj-range-input"
        min={0}
        max={25000}
        step={100}
        value={filters.maxPrice || 25000}
        onChange={(e) => set("maxPrice", +e.target.value)}
        style={{
          background: `linear-gradient(to right,#c0392b ${(filters.maxPrice || 25000) / 250}%,#e5e7eb ${(filters.maxPrice || 25000) / 250}%)`,
        }}
      />
      <div className="pj-range-ends">
        <span>₹0</span>
        <span>₹{(filters.maxPrice || 25000).toLocaleString("en-IN")}{filters.maxPrice >= 25000 ? '+' : ''}</span>
      </div>
      <div className="pj-buckets">
        {[
          ["₹0-₹499", "0-499"],
          ["₹500-₹1499", "500-1499"],
          ["₹1500-₹4999", "1500-4999"],
          ["₹5000+", "5000+"],
        ].map(([l, v]) => (
          <button
            key={v}
            className={`pj-bucket${filters.priceBucket === v ? " on" : ""}`}
            onClick={() =>
              set("priceBucket", filters.priceBucket === v ? "" : v)
            }
          >
            {l}
          </button>
        ))}
      </div>

      <div className="pj-div" />

      <div className="pj-fh">Duration</div>
      {[
        ["all", "All Durations"],
        ["1-2", "1 - 2 Hours"],
        ["2-4", "2 - 4 Hours"],
        ["4-8", "4 - 8 Hours"],
        ["1d", "1+ Days"],
      ].map(([v, l]) => (
        <RadioOpt
          key={v}
          label={l}
          checked={filters.duration === v}
          onChange={() => set("duration", v)}
        />
      ))}

      <div className="pj-div" />

      <div className="pj-fh">Temple</div>
      <select
        className="pj-sel"
        value={filters.temple}
        onChange={(e) => set("temple", e.target.value)}
      >
        <option value="">All Temples</option>
        {templeOptions.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      <div className="pj-div" />

      <div className="pj-fh">Sort By</div>
      {[
        ["popular", "Most Popular"],
        ["price_low", "Price: Low to High"],
        ["price_high", "Price: High to Low"],
        ["recent", "Recently Added"],
        ["az", "A - Z"],
      ].map(([v, l]) => (
        <RadioOpt
          key={v}
          label={l}
          checked={filters.sortBy === v}
          onChange={() => set("sortBy", v)}
        />
      ))}

      <button className="pj-apply" onClick={handleApplyClick}>
        <i className="fas fa-filter" /> Apply Filters
      </button>
    </>
  );
};

/* ═══════════════════════ MAIN PAGE ═══════════════════════ */
const PujaListing = () => {
  useSEO(SEO.puja);
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchVal, setSearchVal] = useState("");
  const [filters, setFilters] = useState({
    category: "all",
    priceBucket: "",
    maxPrice: 25000,
    duration: "all",
    sortBy: "popular",
    temple: "",
    search: "",
  });
  const ITEMS_PER_PAGE = 9;

  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
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

  /* ── Fetch ── */
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await PujaService.getPujaList(null);
      let list = [];
      if (res?.status) {
        let raw = res.data || res.results || res.result || res.recordList || [];
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
    } catch (e) {
      console.error("fetchItems error:", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  /* ── Filter + sort + paginate ── */
  useEffect(() => {
    if (!allItems.length) return;

    let list = [...allItems];

    // 1. Search Filter
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (i) =>
          (i.title || "").toLowerCase().includes(q) ||
          (i.mandirName || "").toLowerCase().includes(q) ||
          (i.purposeOfPooja || "").toLowerCase().includes(q) ||
          (i.description || "").toLowerCase().includes(q)
      );
    }

    // 2. Category Filter
    if (filters.category && filters.category !== "all") {
      const cat = filters.category.toLowerCase();
      list = list.filter((i) => {
        const text = `${i.title || ""} ${i.purposeOfPooja || ""} ${i.category || ""}`.toLowerCase();
        if (cat === "health") return /health|heal|rog|swasthya|cure|illness|bimar/i.test(text);
        if (cat === "wealth") return /wealth|prosper|laxmi|lakshmi|kuber|dhan|money|business|samriddhi/i.test(text);
        if (cat === "protection") return /protect|relief|shanti|dosha|dosh|rahu|ketu|shani|kavach|suraksha|nazar|bada/i.test(text);
        if (cat === "marriage") return /marriag|love|vivah|relationship|patni|pati|manglik|var|vivaha|shadi/i.test(text);
        if (cat === "pitru") return /pitru|pitar|tarpan|shradh|gaya|ancestor/i.test(text);
        if (cat === "other") {
          return !/health|heal|rog|swasthya|wealth|prosper|laxmi|lakshmi|kuber|dhan|protect|relief|shanti|dosha|dosh|marriag|love|vivah|pitru|pitar/i.test(text);
        }
        return text.includes(cat);
      });
    }

    // 3. Temple Filter
    if (filters.temple) {
      list = list.filter((i) =>
        (i.mandirName || "").toLowerCase().includes(filters.temple.toLowerCase())
      );
    }

    // 4. Price Bucket Filter
    if (filters.priceBucket) {
      const [min, max] = filters.priceBucket.split("-").map(Number);
      list = list.filter((i) => {
        const p = i.packages?.length
          ? Math.min(...i.packages.map((pkg) => Number(pkg.packagePrice || 0)))
          : Number(i.price || 0);
        if (filters.priceBucket === "5000+") return p >= 5000;
        return p >= min && p <= max;
      });
    }

    // 5. Price Range Slider Filter
    if (filters.maxPrice && filters.maxPrice < 25000) {
      list = list.filter((i) => {
        const p = i.packages?.length
          ? Math.min(...i.packages.map((pkg) => Number(pkg.packagePrice || 0)))
          : Number(i.price || 0);
        return p <= filters.maxPrice;
      });
    }

    // 6. Duration Filter
    if (filters.duration && filters.duration !== "all") {
      list = list.filter((i) => {
        const d = (i.duration || i.pujaDuration || "").toLowerCase();
        if (filters.duration === "1-2") return d.includes("1") || d.includes("2") || d.includes("hour");
        if (filters.duration === "2-4") return d.includes("2") || d.includes("3") || d.includes("4");
        if (filters.duration === "4-8") return d.includes("4") || d.includes("5") || d.includes("6") || d.includes("7") || d.includes("8");
        if (filters.duration === "1d") return d.includes("day") || d.includes("1d") || d.includes("24");
        return true;
      });
    }

    // 7. Sort By Filter
    if (filters.sortBy === "price_low") {
      list.sort((a, b) => {
        const pa = a.packages?.length
          ? Math.min(...a.packages.map((p) => Number(p.packagePrice || 0)))
          : Number(a.price || 0);
        const pb = b.packages?.length
          ? Math.min(...b.packages.map((p) => Number(p.packagePrice || 0)))
          : Number(b.price || 0);
        return pa - pb;
      });
    } else if (filters.sortBy === "price_high") {
      list.sort((a, b) => {
        const pa = a.packages?.length
          ? Math.min(...a.packages.map((p) => Number(p.packagePrice || 0)))
          : Number(a.price || 0);
        const pb = b.packages?.length
          ? Math.min(...b.packages.map((p) => Number(p.packagePrice || 0)))
          : Number(b.price || 0);
        return pb - pa;
      });
    } else if (filters.sortBy === "recent") {
      list.sort((a, b) => {
        const da = new Date(a.createdAt || a.pujaDatetime || 0).getTime();
        const db = new Date(b.createdAt || b.pujaDatetime || 0).getTime();
        return db - da;
      });
    } else if (filters.sortBy === "az") {
      list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    }

    const total = Math.ceil(list.length / ITEMS_PER_PAGE) || 1;
    setTotalPages(total);
    const start = (page - 1) * ITEMS_PER_PAGE;
    setItems(list.slice(start, start + ITEMS_PER_PAGE));
  }, [allItems, filters, page]);

  /* ─────────────────────────────────────────────────
     FIX: Navigate to PujaDetails with name slug + id
     Route must be: /puja/:name/:id
  ───────────────────────────────────────────────── */
  const handleView = (item) => {
    // Build a URL-safe slug from the puja title
    const slug = (item.title || "puja")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const id = item._id || item.instaId;
    navigate(`/puja/${slug}/${id}`);
  };

  const handleApply = () => {
    setPage(1);
    setDrawerOpen(false);
  };
  const goPage = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const pages = Array.from(
    { length: Math.min(totalPages, 5) },
    (_, i) => i + 1
  );

  return (
    <><Canonical />
    <div className="main-wrapper" style={{ paddingTop: 0, marginTop: 0 }}>
      
      <SideMenu isOpen={showSideMenu} onClose={() => setShowSideMenu(false)} />
      <PopupSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
      <MobileMenu
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
      />
      
      <Header
        onMenuToggle={() => setShowMobileMenu(true)}
        onSideMenuToggle={() => setShowSideMenu(true)}
        onSearchToggle={() => setShowSearch(true)}
      />

      {/* ══ HERO ══ */}
      <div className="pj-hero-outer">
        <div className="container">
          <div className="pj-hero">
            <img
              src="/assets/img/bg/pooja.webp"
              alt="Explore Sacred Poojas"
              className="pj-hero-img"
            />
          </div>
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div className="pj-body">
        <div className="container">
          {/* Mobile top bar */}
          <div className="pj-mob-top">
            <button
              className="pj-filter-mob-btn"
              onClick={() => setDrawerOpen(true)}
            >
              <i className="fas fa-sliders-h" /> Filters
            </button>
            <select
              className="pj-sort-sel"
              value={filters.sortBy}
              onChange={(e) =>
                setFilters((f) => ({ ...f, sortBy: e.target.value }))
              }
            >
              <option value="popular">Most Popular</option>
              <option value="price_low">Price: Low–High</option>
              <option value="price_high">Price: High–Low</option>
              <option value="recent">Recently Added</option>
              <option value="az">A – Z</option>
            </select>
          </div>

          {/* Drawer */}
          <div className="pj-drawer-wrap">
            <div
              className={`pj-drawer-overlay${drawerOpen ? " show" : ""}`}
              onClick={() => setDrawerOpen(false)}
            />
            <div className={`pj-drawer${drawerOpen ? " open" : ""}`}>
              <SidebarContent
                filters={filters}
                setFilters={setFilters}
                onApply={handleApply}
                searchVal={searchVal}
                setSearchVal={setSearchVal}
              />
            </div>
          </div>

          <div className="row g-4">
            {/* Sidebar */}
            <div className="col-md-3 pj-sidebar-desktop">
              <div className="pj-sidebar-box">
                <SidebarContent
                  filters={filters}
                  setFilters={setFilters}
                  onApply={handleApply}
                  searchVal={searchVal}
                  setSearchVal={setSearchVal}
                  allItems={allItems}
                />
              </div>
            </div>

            {/* Main */}
            <div className="col-md-9 col-12">
              <div className="pj-mhdr">
                <div className="pj-mhdr-left">
                  <h2>Sacred Poojas</h2>
                  <p>
                    Choose from our wide range of powerful Poojas for every
                    purpose and need.
                  </p>
                </div>
                <div className="pj-mhdr-right">
                  {!loading && (
                    <span className="pj-showing">
                      Showing{" "}
                      {items.length > 0
                        ? `${(page - 1) * 9 + 1}–${Math.min(
                            page * 9,
                            allItems.length
                          )}`
                        : "0"}{" "}
                      of {allItems.length} poojas
                    </span>
                  )}
                  <select
                    className="pj-sort-sel"
                    value={filters.sortBy}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, sortBy: e.target.value }))
                    }
                  >
                    <option value="popular">Top Rated</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="recent">Recently Added</option>
                    <option value="az">A – Z</option>
                  </select>
                </div>
              </div>

              {error && !loading && (
                <div className="text-center py-5">
                  <i
                    className="fas fa-exclamation-circle fa-3x d-block mb-3"
                    style={{ color: "#d1d5db" }}
                  />
                  <p className="fw-bold text-dark mb-1">
                    Poojas not found
                  </p>
                  <p className="small text-muted mb-3">
                    Please check your connection and try again.
                  </p>
                  <button
                    className="pj-apply"
                    style={{
                      width: "auto",
                      display: "inline-flex",
                      padding: "10px 28px",
                      borderRadius: 9,
                    }}
                    onClick={fetchItems}
                  >
                    Retry
                  </button>
                </div>
              )}

              {!error && (
                <div className="row g-3">
                  {loading
                    ? Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="col-12 col-md-4">
                          <SkeletonCard />
                        </div>
                      ))
                    : items.map((item, i) => (
                        <div key={item._id || i} className="col-12 col-md-4">
                          <PujaCard
                            item={item}
                            index={i}
                            onView={handleView}
                          />
                        </div>
                      ))}
                  {!loading && <div className="col-12 col-md-4"><RecommendCard onOpen={handleOpenRecommendation} /></div>}
                </div>
              )}

              {!loading && !error && items.length > 0 && totalPages > 1 && (
                <div className="pj-pg">
                  <button
                    className="pj-pg-btn"
                    disabled={page === 1}
                    onClick={() => goPage(page - 1)}
                  >
                    <i className="fas fa-chevron-left" style={{ fontSize: 11 }} />
                  </button>
                  {pages.map((p) => (
                    <button
                      key={p}
                      className={`pj-pg-btn${page === p ? " cur" : ""}`}
                      onClick={() => goPage(p)}
                    >
                      {p}
                    </button>
                  ))}
                  {totalPages > 5 && (
                    <>
                      <span className="pj-pg-dots">…</span>
                      <button
                        className="pj-pg-btn"
                        onClick={() => goPage(totalPages)}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                  <button
                    className="pj-pg-btn"
                    disabled={page === totalPages}
                    onClick={() => goPage(page + 1)}
                  >
                    <i
                      className="fas fa-chevron-right"
                      style={{ fontSize: 11 }}
                    />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <ScrollTop />
      <MobileBottomNav/>

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

      {/* ── Card overrides: shorter cards + hover effects + mobile polish ── */}
   
    </div>
    </>
  );
};

export default PujaListing;