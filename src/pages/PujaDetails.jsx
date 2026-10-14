import React, { useState, useEffect, useRef } from "react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import SideMenu from "../components/layout/SideMenu";
import MobileMenu from "../components/layout/MobileMenu";
import PopupSearch from "../components/layout/PopupSearch";
import ScrollTop from "../components/common/ScrollTop";
import "./Pujadetails.css";
import PujaService from "../services/pujaServices";
import { Link, useParams } from "react-router-dom";
import PujaUserDetailsModal from "./pujaUserDetailsModel";
import LoginOTPModal from "../components/accounts/LoginOTPModel";
import { useStorage } from "../context/StorageContext";
import { useSEO } from "../hooks/seoHook";

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
  if (img.dataset.fallback === "done") return;
  img.dataset.fallback = "done";
  img.src = fallbackSrc;
};

const ExpandableText = ({ text = "", maxChars = 300, className = "", clampLines = null }) => {
  const [expanded, setExpanded] = useState(false);

  // clampLines mode: renders the full text but lets CSS visually truncate
  // it to N lines (only wired up on mobile via .pd-clamp-text media query
  // rules) instead of guessing a character count. This adapts correctly
  // to whatever width the card actually renders at.
  if (clampLines) {
    return (
      <span className={className}>
        <span className={`pd-clamp-text${expanded ? " pd-clamp-expanded" : ""}`}>
          {text}
        </span>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="pd-clamp-toggle-btn"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#d4a057",
            fontWeight: 600,
            fontSize: "0.92em",
            padding: 0,
            textDecoration: "underline",
            textUnderlineOffset: 2,
            whiteSpace: "nowrap",
            display: "block",
            marginTop: 2,
          }}
        >
          {expanded ? "Show Less ▲" : "Read More ▼"}
        </button>
      </span>
    );
  }

  const needsTruncation = text.length > maxChars;
  const displayed = expanded || !needsTruncation ? text : text.slice(0, maxChars) + "…";

  return (
    <span className={className}>
      {displayed}
      {needsTruncation && (
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#d4a057",
            fontWeight: 600,
            fontSize: "0.92em",
            marginLeft: 6,
            padding: 0,
            textDecoration: "underline",
            textUnderlineOffset: 2,
            whiteSpace: "nowrap",
          }}
        >
          {expanded ? "Show Less ▲" : "Read More ▼"}
        </button>
      )}
    </span>
  );
};
// ✅ REPLACE WITH THIS (calculates from actual target date):
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
    setT(calc()); // recalc immediately when targetDate becomes available
    const tick = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate]);
  return t;
};

const pad = (n, len = 2) => String(n).padStart(len, "0");

const BENEFITS = [
  {
    icon: "fas fa-shield-alt",
    title: "Protection from Hidden Obstacles",
    sub: "Tarak & Planetary Relief",
    text: "The Dus Mahavidyas are supreme forces of divine Shakti. Their combined blessings remove unseen Tantric and astrological obstacles, afflictions, negative energies that silently block progress.",
  },
  {
    icon: "fas fa-lightbulb",
    title: "Clarity, Courage & Right Decisions",
    sub: "Strengthening Inner Power",
    text: "Blessings of Maa Bagalamukhi, Chhinnamasta, and Dhoomavati awaken inner strength, clarity, and confidence — empowering you to take correct and timely decisions.",
  },
  {
    icon: "fas fa-coins",
    title: "Lakshmi Kripa & Prosperity Flow",
    sub: "Growth, Abundance & Stability",
    text: "When offered during auspicious periods like Diwali, this tithi Chadhava opens the channels of Goddess Lakshmi grace. It attracts success, wealth, opportunities, increased income, and steady financial flow.",
  },
];

const INCLUDED = [
  { icon: "fas fa-om", text: "Vedic Rituals by Expert Pandits" },
  { icon: "fas fa-om", text: "Sankalp in Your Name & Gotra" },
  { icon: "fas fa-om", text: "Mantra Chanting & Havan" },
  { icon: "fas fa-om", text: "Puja Photos & Live Updates" },
  { icon: "fas fa-om", text: "Prasad Delivered to Your Home" },
];

const HOW_STEPS = [
  { num: "01", icon: "fas fa-hand-pointer", title: "Select Your Puja", desc: "Choose a sacred puja or chadhava aligned with your intention." },
  { num: "02", icon: "fas fa-gift", title: "Add Divine Offering", desc: "Give Seva, Deep Daan, Vastr Seva, and more." },
  { num: "03", icon: "fas fa-user-edit", title: "Provide Sankalp", desc: "Enter your Name & Gotra to personalise the puja Sankalp." },
  { num: "04", icon: "fas fa-video", title: "Live Puja & Updates", desc: "Pandits perform dedicatedly. Get real-time updates." },
  { num: "05", icon: "fas fa-box-open", title: "Receive Blessings", desc: "Get puja video in 3 days & prasad delivered in 6-10 days." },
];

const REVIEWS = [
  {
    name: "Rakesh Sharma",
    loc: "Delhi, India",
    av: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&crop=face",
    stars: 5,
    date: "17 Feb 2025",
    text: "The puja was performed with great devotion. I received the video and prasad on time. Truly a divine experience.",
  },
  {
    name: "Anita Verma",
    loc: "Mumbai, India",
    av: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop&crop=face",
    stars: 5,
    date: "3 Feb 2025",
    text: "Very peaceful experience. The pandit ji looked over our names clearly during sankalp. Felt blessed.",
  },
  {
    name: "Suresh Patel",
    loc: "Ahmedabad, India",
    av: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face",
    stars: 5,
    date: "21 Jan 2025",
    text: "Excellent service! The live puja updates were amazing. I could feel the divine energy even from home.",
  },
  {
    name: "Priya Singh",
    loc: "Jaipur, India",
    av: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face",
    stars: 5,
    date: "10 Jan 2025",
    text: "VaidikGuru made it so easy to book and participate in the puja. The prasad delivery was prompt and beautifully packed.",
  },
];

const FAQS = [
  { q: "What is the significance of this puja?", a: "This puja invokes divine blessings for protection, prosperity, and spiritual growth. It is performed by expert Pandits with full Vedic rituals." },
  { q: "When will I receive the prasad?", a: "Prasad is typically delivered within 6-10 working days after the puja is performed." },
  { q: "How will I receive the puja updates?", a: "You will receive live photos and videos directly on your registered mobile number via WhatsApp." },
  { q: "Can I add multiple names in the sankalp?", a: "Yes, you can include multiple names and gotras in the sankalp. Please mention them during booking." },
  { q: "How long does the puja take?", a: "The puja typically takes 2-4 hours depending on the rituals involved." },
  { q: "Is the payment secure?", a: "Yes, 100%. We use secure payment gateways including UPI, Visa, Mastercard, and RuPay." },
];

const FaqItem = ({ num, q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="pd-faq-item" onClick={() => setOpen((o) => !o)}>
      <div className="pd-faq-q">
        <span className="pd-faq-num">{pad(num)}</span>
        <span className="pd-faq-text">{q}</span>
        <div className="pd-faq-toggle">
          <i className={`fas fa-${open ? "minus" : "plus"}`} />
        </div>
      </div>
      {open && <div className="pd-faq-ans">{a}</div>}
    </div>
  );
};
const ReviewsSection = ({ reviews = [] }) => {
  const allReviews = reviews.length > 0
    ? reviews.map(r => ({
      name: r.name || "Devotee",
      loc: "India",
      av: r.photo || AVATAR_PLACEHOLDER,
      stars: 5,
      date: "",
      text: r.review || "",
      reviewType: r.reviewType || "text",
      videoUrl: r.videoUrl || r.review || "",
    }))
    : REVIEWS;

  const [current, setCurrent] = useState(0);
  const perPage = 2;
  const total = Math.max(allReviews.length - perPage + 1, 1);

  useEffect(() => {
    const t = setInterval(
      () => setCurrent((c) => (c + 1) % total),
      4000
    );
    return () => clearInterval(t);
  }, [total]);

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);
  const visible = allReviews.slice(current, current + perPage);
  return (
    <div className="pd-reviews-wrap">
      <div className="pd-sec-eyebrow">
        <span className="pd-eyebrow-line" />
        <i className="fas fa-om" /> Devotee Experiences & Reviews{" "}
        <i className="fas fa-om" />
        <span className="pd-eyebrow-line" />
      </div>
      <div className="pd-rev-slider">
        <button className="pd-rev-arr left" onClick={prev}>
          <i className="fas fa-chevron-left" />
        </button>
        <div className="pd-rev-grid">
          {visible.map((r, i) => (
            <div key={`${current}-${i}`} className="pd-rev-card">
              {r.reviewType === "video" && r.videoUrl ? (
                <div style={{ marginBottom: 10 }}>
                  <iframe
                    width="100%"
                    height="160"
                    src={r.videoUrl.replace("youtu.be/", "www.youtube.com/embed/").replace(/\?.*/, "")}
                    frameBorder="0"
                    allowFullScreen
                    style={{ borderRadius: 8 }}
                  />
                </div>
              ) : null}
              <div className="pd-rev-user">
                <img
                  className="pd-rev-av"
                  src={r.av}
                  alt={r.name}
                  onError={handleImgError(AVATAR_PLACEHOLDER)}
                />
                <div>
                  <div className="pd-rev-name">{r.name}</div>
                  <div className="pd-rev-loc">{r.loc}</div>
                </div>
              </div>
              <div className="pd-rev-stars">
                {[1, 2, 3, 4, 5].map((s) => (
                  <i
                    key={s}
                    className={`fa${s <= r.stars ? "s" : "r"} fa-star`}
                  />
                ))}
              </div>
              <p className="pd-rev-text">{r.text}</p>
              <div className="pd-rev-footer">
                <span className="pd-rev-date">{r.date}</span>
                <span className="pd-rev-verified">
                  <i className="fas fa-check-circle" /> Verified Devotee
                </span>
              </div>
            </div>
          ))}
        </div>
        <button className="pd-rev-arr right" onClick={next}>
          <i className="fas fa-chevron-right" />
        </button>
      </div>
      <div className="pd-rev-dots">
        {Array.from({ length: Math.max(total, 1) }).map((_, i) => (

          <div
            key={i}
            className={`pd-rev-dot${i === current ? " active" : ""}`}
            onClick={() => setCurrent(i)}
          />
        ))}
      </div>
    </div>
  );
};

const DEFAULT_PACKAGES = [
  {
    _id: "pkg_ind",
    packageName: "Individual Puja Package",
    packagePrice: 1100,
    packageType: "Individual",
    packageDescription: [
      "Puja for 1 Person",
      "Special Sankalp with your Name & Gotra",
      "Vedic Pandit Chanting & Havan",
      "Prasad Delivery to your address"
    ]
  },
  {
    _id: "pkg_prt",
    packageName: "Partner / Couple Package",
    packagePrice: 2100,
    packageType: "Partner",
    packageDescription: [
      "Puja for Couple",
      "Combined Sankalp for Husband & Wife",
      "Vedic Pandit Chanting & Havan",
      "Prasad Delivery to your address"
    ]
  },
  {
    _id: "pkg_fam",
    packageName: "Family Puja Package",
    packagePrice: 3100,
    packageType: "Family",
    packageDescription: [
      "Puja for up to 4 Family Members",
      "Family Sankalp with all Names & Gotra",
      "Special Archana & Flowers Seva",
      "Divine Prasad Box Delivered"
    ]
  },
  {
    _id: "pkg_mah",
    packageName: "Maha Samprokshanam Package",
    packagePrice: 5100,
    packageType: "Maha Puja",
    packageDescription: [
      "Special Grand Puja & Complete Havan",
      "Dedicated Pandit for Special Sankalp",
      "VIP Live Updates & Ritual Video",
      "Special Premium Prasad Box Delivered"
    ]
  }
];

const PujaDetails = () => {
  const { name, id } = useParams();
  const { isLoggedIn } = useStorage();

  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [pujaDetails, setPujaDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [aboutPujaExpanded, setAboutPujaExpanded] = useState(false);
  const timer = useCountdown(pujaDetails?.pujaDatetime || pujaDetails?.pujaDate);

  useSEO({
    title: pujaDetails?.pujaName ? `${pujaDetails.pujaName} - Online Booking & Sankalp` : "Online Puja Booking & Sankalp",
    description: pujaDetails?.aboutPuja
      ? (typeof pujaDetails.aboutPuja === 'string' ? pujaDetails.aboutPuja.replace(/<[^>]*>/g, '').slice(0, 160) : 'Book authentic Vedic Puja online with live sankalp and prasad delivery.')
      : "Book authentic Vedic Puja online with live sankalp and prasad delivery at ancient temples through VaidikGuru.",
    keywords: `${pujaDetails?.pujaName || 'puja'}, online puja booking, vedic puja, temple rituals, VaidikGuru`,
    canonical: name ? `/puja/${name}/${id}` : `/puja/${id}`,
    ogImage: pujaDetails?.pujaImage || undefined,
  });

  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedPackageData, setSelectedPackageData] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingPackageType, setPendingPackageType] = useState(null);

  // Which package card is highlighted/selected in the "Choose Your Puja
  // Package" grid. On mobile this also controls whether the card shows
  // its full-width "Select Package" button (tap-to-reveal, like a radio list).
  const [selectedPkgId, setSelectedPkgId] = useState(null);

  const [packagesSectionVisible, setPackagesSectionVisible] = useState(false);

  // Mobile hero carousel — tracks active slide so the dot indicators
  // stay in sync while the user swipes through pujaGalleryImages, and
  // auto-advances on a timer (paused while the user is actively
  // touching/dragging so it never fights a manual swipe).
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
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  useEffect(() => {
    fetchPujaDetails();
  }, [id]);

  // Gallery images for the mobile hero carousel.
  const pujaGalleryImages = React.useMemo(() => {
    return pujaDetails?.bannerImages?.length ? pujaDetails.bannerImages :
      pujaDetails?.images?.length ? pujaDetails.images :
        pujaDetails?.gallery?.length ? pujaDetails.gallery :
          pujaDetails?.pujaImage ? [pujaDetails.pujaImage] :
            [IMAGE_PLACEHOLDER];
  }, [pujaDetails]);

  useEffect(() => {
    if (pujaGalleryImages.length <= 1) return undefined;
    const t = setInterval(() => {
      if (heroUserInteractingRef.current) return;
      const el = heroMobileRef.current;
      if (!el) return;
      const nextIdx = (Math.round(el.scrollLeft / el.clientWidth) + 1) % pujaGalleryImages.length;
      scrollHeroMobileTo(nextIdx);
    }, 4000);
    return () => clearInterval(t);
  }, [pujaGalleryImages.length]);

  const isDeletedOrInactive = (item) => {
    if (!item) return true;
    if (item.isDeleted === true || item.is_deleted === 1 || item.is_deleted === true || item.deleted === true) return true;
    if (item.status === 0 || item.status === false || item.status === "inactive" || item.status === "0") return true;
    if (item.isActive === false || item.is_active === 0 || item.is_active === false || item.is_active === "0") return true;
    return false;
  };

  const fetchPujaDetails = async () => {
    try {
      setLoading(true);
      setError(false);
      const response = await PujaService.getPujaListById(id);
      const data = response?.data || response?.result;
      if (response?.status && data && !isDeletedOrInactive(data)) {
        setPujaDetails({
          ...data,
          packages: Array.isArray(data.packages) && data.packages.length > 0 ? data.packages : DEFAULT_PACKAGES
        });
      } else {
        setPujaDetails(null);
        setError(true);
      }
    } catch (error) {
      console.log("Puja details fetch error:", error);
      setPujaDetails(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Default-select the first package once data arrives
  useEffect(() => {
    if (pujaDetails?.packages?.length && !selectedPkgId) {
      setSelectedPkgId(pujaDetails.packages[0]._id);
    }
  }, [pujaDetails]);

  useEffect(() => {
    if (!pujaDetails) return undefined;
    const el = document.getElementById("pd-packages-section");
    if (!el) return undefined;

    // IntersectionObserver reliably reports "is any part of the packages
    // section currently on screen" — used to hide the sticky mobile
    // "Select Puja Package" bar exactly while the user is already looking
    // at the real package cards (and their own per-card selection), and
    // show it again everywhere else on the page.
    const observer = new IntersectionObserver(
      ([entry]) => setPackagesSectionVisible(entry.isIntersecting),
      { threshold: 0 } // fires as soon as even 1px of the section is visible
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, [pujaDetails]);

  const handleSelectPackage = (pkgOrType) => {
    if (!isLoggedIn) {
      setPendingPackageType(pkgOrType);
      setShowLoginModal(true);
      return;
    }
    proceedSelectPackage(pkgOrType);
  };

  const proceedSelectPackage = (pkgOrType) => {
    let chosenPkg = (typeof pkgOrType === "object" && pkgOrType) ? pkgOrType : null;

    if (!chosenPkg) {
      const isFamily = pkgOrType === "family";
      chosenPkg = isFamily
        ? pujaDetails?.packages?.find(p =>
          p.packageType?.toLowerCase() === "family"
        ) || pujaDetails?.packages?.[pujaDetails.packages.length - 1]
        : pujaDetails?.packages?.find(p =>
          p.packageType?.toLowerCase() === "individual"
        ) || pujaDetails?.packages?.[0];
    }

    const selectedPackage = {
      _id: chosenPkg?._id || "",
      packageName: chosenPkg?.packageName || "",
      packagePrice: Number(chosenPkg?.packagePrice || 0),
      packageType: chosenPkg?.packageType || "",
      packageDescription: chosenPkg?.packageDescription || [],
    };

    const pujaData = {
      _id: pujaDetails?._id,
      title: pujaDetails?.title || "",
      mandirName: pujaDetails?.mandirName || "",
      purposeOfPooja: pujaDetails?.purposeOfPooja || "",
      aboutPuja: pujaDetails?.aboutPuja || "",
      pujaImage: pujaDetails?.pujaImage || "",
      pujaDatetime: pujaDetails?.pujaDatetime || pujaDetails?.pujaDate || null,
      pujaDate: pujaDetails?.pujaDate || "",
      duration: pujaDetails?.duration || "45–60 Min",
      pujaType: chosenPkg?.packageType || "Vedic Ritual",
      addons: pujaDetails?.addons || [],
      homeDeliveryAddons: pujaDetails?.homeDeliveryAddons || [],
      packages: pujaDetails?.packages || [],
      faq: pujaDetails?.faq || [],
      reviews: pujaDetails?.reviews || [],
    };

    setSelectedPackageData({ pujaData, selectedPackage });
    setShowUserModal(true);
  };

  const handleModalClose = () => {
    setShowUserModal(false);
  };

  const getShareData = () => {
    const url = window.location.href;
    const title = pujaDetails?.title || "Sacred Puja";
    const text = `Join me in this sacred puja "${title}" on VaidikGuru 🙏`;
    return { url, title, text };
  };

  const handleWhatsAppShare = () => {
    const { url, text } = getShareData();
    const waUrl = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleNativeShare = async () => {
    const { url, title, text } = getShareData();
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert("Link copied to clipboard!");
      } catch (err) {
        console.log(err);
      }
    }
  };

  useEffect(() => {
    if (isLoggedIn && pendingPackageType) {
      setShowLoginModal(false);
      proceedSelectPackage(pendingPackageType);
      setPendingPackageType(null);
    }
  }, [isLoggedIn, pendingPackageType])
  if (loading) {
    return (
      <div
        style={{
          minHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
        }}
      >
        <style>{`
          @keyframes pd-spin {
            to { transform: rotate(360deg); }
          }
          @keyframes pd-pulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
        `}</style>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            border: "4px solid #f0e0c0",
            borderTopColor: "#7B1F3A",
            animation: "pd-spin 0.9s linear infinite",
          }}
        />
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#7B1F3A",
            letterSpacing: 0.3,
            animation: "pd-pulse 1.4s ease-in-out infinite",
          }}
        >
          <i className="fas fa-om" style={{ marginRight: 8, color: "#c8952a" }} />
          Loading Puja Details...
        </div>
      </div>
    );
  }

  if (error || !pujaDetails) {
    return (
      <div className="pd-page">
        <ScrollTop />
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
        <div style={{ textAlign: "center", padding: "120px 20px" }}>
          <i
            className="fas fa-om fa-3x d-block mb-3"
            style={{ color: "#d1d5db" }}
          />
          <h3 style={{ color: "#7B1F3A", fontWeight: 700 }}>Puja Not Found</h3>
          <p style={{ color: "#666", maxWidth: 450, margin: "10px auto 20px" }}>
            This puja is currently unavailable or has been removed.
          </p>
          <Link to="/puja" className="th-btn rounded-pill d-inline-block" style={{ padding: "12px 28px" }}>
            Browse All Pujas
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="pd-page">
      <ScrollTop />
      <SideMenu isOpen={showSideMenu} onClose={() => setShowSideMenu(false)} />
      <PopupSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
      <MobileMenu
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
      />

      <PujaUserDetailsModal
        isOpen={showUserModal}
        onClose={handleModalClose}
        cart={selectedPackageData?.selectedPackage}
        page="puja"
        puja={selectedPackageData?.pujaData}
        selectedPackage={selectedPackageData?.selectedPackage}
      />

      <LoginOTPModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          setPendingPackageType(null);
        }}
      />

      <Header
        onMenuToggle={() => setShowMobileMenu(true)}
        onSideMenuToggle={() => setShowSideMenu(true)}
        onSearchToggle={() => setShowSearch(true)}
      />

      <style>{`
        .pd-mobile-proceed-wrap { display: none; }
        @media (max-width: 767px) {
          .pd-mobile-proceed-wrap {
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
          .pd-mobile-proceed-btn {
            width: 100%;
            background: linear-gradient(135deg, #7B1F3A, #5a1329);
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
        }

        /* Radio circle: hidden on desktop, shown only on mobile */
        .pd-pkg-radio {
          display: none;
        }

        @media (max-width: 767px) {
          /* Grid becomes a single vertical stack of horizontal cards */
          .pd-pkg-scroll-grid {
            display: flex !important;
            flex-direction: column !important;
            overflow: visible !important;
          }

          /* Card: image left, content right */
          .pd-pkg-card-inner {
            flex-direction: row !important;
            align-items: flex-start !important;
            padding: 12px !important;
            text-align: left !important;
            position: relative;
            border-radius: 12px !important;
          }

          .pd-pkg-card-inner.pd-pkg-active {
            border: 2px solid #7B1F3A !important;
            background: linear-gradient(100deg, #f7e9ee 0%, #ffffff 55%) !important;
            box-shadow: 0 4px 14px rgba(123,31,58,0.15);
          }

          /* Bigger thumbnail — card height stays put because padding
             and gaps were trimmed to compensate */
          .pd-pkg-card-image {
            width: 100px !important;
            height: 100px !important;
            aspect-ratio: unset !important;
            flex-shrink: 0 !important;
            border-radius: 10px !important;
            margin-bottom: 0 !important;
            margin-right: 10px !important;
          }

          .pd-pkg-card-content {
            align-items: flex-start !important;
            text-align: left !important;
            width: auto !important;
            flex: 1;
            min-width: 0;
          }

          /* Hide the icon circle + description list on mobile — keeps the
             card compact like the horizontal reference layout */
          .pd-pkg-icon-circle,
          .pd-pkg-desc-list-wrap {
            display: none !important;
          }

          .pd-pkg-card-content > div {
            margin-bottom: 4px !important;
            padding: 0 !important;
          }

          /* Radio circle, top-right of the card */
          .pd-pkg-radio {
            display: flex !important;
            position: absolute;
            top: 14px;
            right: 14px;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            border: 2px solid #d9d9d9;
            background: #fff;
            align-items: center;
            justify-content: center;
            z-index: 2;
          }

          .pd-pkg-active .pd-pkg-radio {
            border-color: #7B1F3A;
            background: #7B1F3A;
          }

          // /* Select button hidden until the card is chosen */
          // .pd-pkg-select-btn {
          //   display: none !important;
          // }

          // .pd-pkg-active .pd-pkg-select-btn {
          //   display: flex !important;
          //   margin-top: 10px !important;
          // }
        }

        /* ── Hover effect: every card gets its own accent color ──
           Works on both desktop and mobile (mouse/trackpad only —
           touch devices simply won't trigger :hover, which is fine). */
        .pd-pkg-card-inner {
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease !important;
        }

        .pd-pkg-card-inner:hover {
          transform: translateY(-4px);
        }

        .pd-pkg-scroll-grid .pd-pkg-card-inner:nth-child(4n+1):hover {
          border-color: #7B1F3A !important;
          box-shadow: 0 10px 24px rgba(123, 31, 58, 0.25) !important;
        }

        .pd-pkg-scroll-grid .pd-pkg-card-inner:nth-child(4n+2):hover {
          border-color: #F5A623 !important;
          box-shadow: 0 10px 24px rgba(245, 166, 35, 0.25) !important;
        }

        .pd-pkg-scroll-grid .pd-pkg-card-inner:nth-child(4n+3):hover {
          border-color: #2E8B87 !important;
          box-shadow: 0 10px 24px rgba(46, 139, 135, 0.25) !important;
        }

        .pd-pkg-scroll-grid .pd-pkg-card-inner:nth-child(4n+4):hover {
          border-color: #5B3FA0 !important;
          box-shadow: 0 10px 24px rgba(91, 63, 160, 0.25) !important;
        }

        /* ── Benefit cards: clamp description to 3 lines on mobile only ── */
        @media (max-width: 767px) {
          .pd-benefit-text .pd-clamp-text {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .pd-benefit-text .pd-clamp-expanded {
            display: block !important;
            -webkit-line-clamp: unset !important;
            overflow: visible !important;
          }
        }
      `}</style>

      {/* ── BREADCRUMB ── */}
      <div className="pd-bc">
        <div className="pd-bc-inner">
          <Link to="/">Home</Link>
          <i className="fas fa-angle-right" />
          <Link to="/puja">Puja</Link>
        </div>
      </div>

      {/* ══ MOBILE HERO CAROUSEL ══
          Only visible on mobile (see CSS). Full-width swipeable images
          with dot indicators, sitting above the hero banner. Desktop
          keeps using pd-hero-bg as before. */}
      <div className="pd-hero-mobile-carousel">
        <div
          className="pd-hero-mobile-track"
          ref={heroMobileRef}
          onScroll={handleHeroMobileScroll}
          onTouchStart={() => { heroUserInteractingRef.current = true; }}
          onTouchEnd={() => {
            setTimeout(() => { heroUserInteractingRef.current = false; }, 3000);
          }}
        >
          {pujaGalleryImages.map((src, i) => (
            <img
              key={i}
              className="pd-hero-mobile-slide"
              src={src}
              alt={`${pujaDetails?.title || "Puja"} ${i + 1}`}
              onError={handleImgError(IMAGE_PLACEHOLDER)}
            />
          ))}
        </div>
        {pujaGalleryImages.length > 1 && (
          <div className="pd-hero-mobile-dots">
            {pujaGalleryImages.map((_, i) => (
              <div
                key={i}
                className={`pd-hero-mobile-dot${i === heroMobileIdx ? " active" : ""}`}
                onClick={() => scrollHeroMobileTo(i)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ══ HERO ══ */}
      <div className="pd-hero">
        <div className="pd-hero-bg" />
        <div className="pd-hero-overlay" />
        <div className="pd-hero-body">
          <div className="pd-avail-badge">
            <i className="fas fa-exclamation-triangle" /> Limited Availability –
            Final Day to Participate
          </div>
          <div className="pd-featured-lbl">FEATURED PUJA</div>
          <h1 className="pd-hero-title">{pujaDetails?.title}</h1>

          <p
            className="pd-hero-desc"
            style={
              !aboutPujaExpanded
                ? {
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    marginBottom: 6,
                  }
                : { marginBottom: 6 }
            }
          >
            {pujaDetails?.aboutPuja}
          </p>
          {pujaDetails?.aboutPuja && pujaDetails.aboutPuja.length > 140 && (
            <button
              type="button"
              onClick={() => setAboutPujaExpanded((prev) => !prev)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#f5d88a",
                fontWeight: 600,
                fontSize: "12.5px",
                padding: 0,
                marginBottom: 14,
                textDecoration: "underline",
                textUnderlineOffset: 2,
                display: "inline-block",
                textAlign: "left",
              }}
            >
              {aboutPujaExpanded ? "Show Less ▲" : "Read More ▼"}
            </button>
          )}

          <div className="pd-hero-tags">
            <span className="pd-hero-tag">
              <i className="fas fa-map-marker-alt" /> {pujaDetails?.mandirName}
            </span>
            <span className="pd-hero-tag">
              <i className="fas fa-calendar-alt" />{" "}
              {pujaDetails?.pujaDate
                ? (() => {
                  const d = new Date(pujaDetails.pujaDate);
                  return isNaN(d.getTime())
                    ? pujaDetails.pujaDate
                    : d.toLocaleString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    });
                })()
                : ""}
            </span>
          </div>
          <p className="pd-devotee-note">
            <i className="fas fa-exclamation-circle" /> Over{" "}
            <strong>3,00,000+ devotees</strong> have participated in pujas
            conducted by VaidikGuru.
          </p>
          <div className="pd-hero-trust">
            {[
              { icon: "fas fa-gopuram", title: "Temple Certified", sub: "Authentic & Verified" },
              { icon: "fas fa-user-graduate", title: "Expert Pandits", sub: "Vedic & Experienced" },
              { icon: "fas fa-lock", title: "100% Secure", sub: "Payments" },
              { icon: "fas fa-box", title: "Prasad Delivery", sub: "To Your Home" },
            ].map((t, i) => (
              <div key={i} className="pd-hero-trust-item">
                <div className="pd-hero-trust-ico">
                  <i className={t.icon} />
                </div>
                <div className="pd-hero-trust-title">{t.title}</div>
                <div className="pd-hero-trust-sub">{t.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── BOOKING CARD ── */}
        <div className="pd-booking-card">
          <div className="pd-bc-badge">
            <i className="fas fa-fire" /> Featured Offering
          </div>
          <div className="pd-bc-price-row">
            <div className="pd-bc-price">
              <span className="pd-bc-price-sym">₹</span>
              {pujaDetails?.packages?.[0]?.packagePrice || 0}
            </div>
            <div className="pd-bc-per">per person</div>
          </div>
          <div className="pd-bc-checks">
            {[pujaDetails?.purposeOfPooja, pujaDetails?.mandirName, pujaDetails?.packages?.[0]?.packageType].map((item, i) => (
              <div key={i} className="pd-bc-check">
                <i className="fas fa-check-circle" />
                <span>
                  {i === 0 && item && item.length > 80 ? (
                    <ExpandableText text={item} maxChars={80} />
                  ) : (
                    item
                  )}
                </span>
              </div>
            ))}
            <div className="pd-bc-check pd-bc-check--devotee">
              <i className="fas fa-check-circle" />
              <span>
                Over <strong>3,00,000+ devotees</strong> have participated in
                pujas conducted by VaidikGuru.
              </span>
            </div>
          </div>
          <button
            className="pd-bc-btn"
            onClick={() => {
              document.getElementById("pd-packages-section")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
          >
            Select Puja Package
          </button>
          <div className="pd-bc-secure mb-5"  >
            <span className="pd-bc-secure-lbl">Secure Payments</span>
            <div className="pd-bc-pay-icons">
              <img src="/assets/img/about/upi.png" alt="UPI" className="pd-pay-img"
                onError={(e) => { e.target.style.display = "none"; }} />
              <img src="/assets/img/about/visa.png" alt="Visa" className="pd-pay-img"
                onError={(e) => { e.target.style.display = "none"; }} />
              <img src="/assets/img/about/mastercard.png" alt="Mastercard" className="pd-pay-img pd-pay-img--mc"
                onError={(e) => { e.target.style.display = "none"; }} />
              <img src="/assets/img/about/rupay.png" alt="RuPay" className="pd-pay-img"
                onError={(e) => { e.target.style.display = "none"; }} />
            </div>
          </div>
        </div>
      </div>

      {/* ══ COUNTDOWN ══ */}
      <div
        className="pd-countdown"
        style={{ backgroundImage: "url('/assets/img/about/ABUTBG2.png')" }}
      >
        <div className="pd-cd-overlay" />
        <img
          src="/assets/img/about/diya.png"
          alt=""
          className="pd-cd-diya"
          onError={(e) => (e.target.style.display = "none")}
        />
        <div className="pd-cd-center">
          <div className="pd-cd-title">
            <span className="pd-cd-title-line" />
            <i className="fas fa-om" /> Booking Ends In <i className="fas fa-om" />
            <span className="pd-cd-title-line" />
          </div>
          <div className="pd-cd-timer">
            {[

              { val: timer.d, len: 3, lbl: "Days" },
              { val: timer.h, len: 2, lbl: "Hours" },
              { val: timer.m, len: 2, lbl: "Minutes" },
              { val: timer.s, len: 2, lbl: "Seconds" },
            ].map((t, i) => (
              <React.Fragment key={t.lbl}>
                {i > 0 && <span className="pd-cd-sep">›</span>}
                <div className="pd-cd-box">
                  <div className="pd-cd-num">{pad(t.val, t.len)}</div>
                  <div className="pd-cd-lbl">{t.lbl}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="pd-cd-right">

          <a href="#"
            className="pd-cd-share"
            onClick={(e) => {
              e.preventDefault();
              handleNativeShare();
            }}
          >
            <i className="fas fa-share-alt" /> Share with your loved ones
          </a>

          <a href="#"
            className="pd-cd-share whatsapp"
            onClick={(e) => {
              e.preventDefault();
              handleWhatsAppShare();
            }}
          >
            <i className="fab fa-whatsapp" /> Share on WhatsApp
          </a>
        </div>
      </div>

      {/* ══ BENEFITS ══ */}
      <div className="pd-section">
        <div className="pd-sec-eyebrow">
          <span className="pd-eyebrow-line" />
          <i className="fas fa-om" /> Sacred Outcomes <i className="fas fa-om" />
          <span className="pd-eyebrow-line" />
        </div>
        <h2 className="pd-sec-title">Benefits of This Puja & Offering</h2>
        <p className="pd-sec-sub">
          Each offering is performed with a sacred Sankalp, invoking divine
          energies that bring balance, protection, and prosperity into your life.
        </p>
        <div className="pd-benefits-grid">
          {BENEFITS.map((b, i) => (
            <div key={i} className="pd-benefit-card">
              <div className="pd-benefit-ico">
                <i className={b.icon} />
              </div>
              <div className="pd-benefit-title">{b.title}</div>
              <div className="pd-benefit-sub">{b.sub}</div>
              <p className="pd-benefit-text">
                <ExpandableText text={b.text} clampLines={3} />
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ══ INCLUDED + HOW ══ */}
      <div className="container px-md-0 px-4">
        {/* <div className="pd-inc-how-wrap"> */}
        <div className="row border mb-4 py-3 rounded-4 justify-content-center text-center">
          {/* <div className="pd-inc-card"> */}
          <div className="col-lg-6 mb-5">
            <div className="pd-sub-title">
              <i className="fas fa-list-check" /> What's Included in This Puja?
            </div>
            <div className="pd-inc-card-inner">
              <div className="pd-inc-list">
                {INCLUDED.map((item, i) => (
                  <div key={i} className="pd-inc-item">
                    <i className={item.icon} /> {item.text}
                  </div>
                ))}
              </div>
              <img
                src="/assets/img/about/kalash-icon2.png"
                alt="Kalash"
                className="pd-inc-kalash"
                onError={(e) => (e.target.style.display = "none")}
              />
            </div>
          </div>
          {/* <div className="pd-how-card"> */}
          <div className="col-lg-6 mb-4">
            <div className="pd-sub-title">
              <i className="fas fa-route" /> How Your Puja Happens at VaidikGuru
            </div>
            <div className="pd-how-steps justify-content-between">
              {HOW_STEPS.map((s, i) => (
                <div key={i} className="pd-how-step">
                  <div className="pd-step-num">{s.num}</div>
                  <div className="pd-step-ico-wrap">
                    <i className={s.icon} />
                  </div>
                  <div className="pd-step-title">{s.title}</div>
                  <div className="pd-step-desc">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ PACKAGES ══ */}
      <div className="pd-packages-wrap" id="pd-packages-section">
        <div className="pd-pkg-eyebrow">
          <span className="pd-eyebrow-line" />
          <i className="fas fa-om" /> Choose Your Puja Package{" "}
          <i className="fas fa-om" />
          <span className="pd-eyebrow-line" />
        </div>
        <div className="pd-pkg-scroll-grid" style={{
          gap: "16px",
          width: "100%",
          padding: "0 0 24px"
        }}>
          {(pujaDetails?.packages || []).map((pkg, i) => {
            const pkgImgs = [
              "/assets/img/about/devotee-woman (3).png",
              "/assets/img/about/partner.png",
              "/assets/img/about/familychadawa.png",
              "/assets/img/about/familyflower.png",
            ];
            const iconMap = ["fa-user", "fa-user-friends", "fa-users", "fa-home"];
            const btnStyles = [
              { background: "#7B1F3A", color: "#fff", border: "none" },
              { background: "#F5A623", color: "#fff", border: "none" },
              { background: "#fff", color: "#7B1F3A", border: "2px solid #7B1F3A" },
              { background: "#7B1F3A", color: "#fff", border: "none" },
            ];
            const isActive = selectedPkgId === pkg._id;
            return (
              <div
                key={pkg._id || i}
                className={`pd-pkg-card-inner${isActive ? " pd-pkg-active" : ""}`}
                onClick={() => {
                  setSelectedPkgId(pkg._id);
                  handleSelectPackage(pkg);
                }}
                style={{
                  background: "#fff",
                  borderRadius: "20px",
                  border: "1.5px solid #f0e6d3",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "0 0 14px",
                  minWidth: 0,
                  position: "relative",
                  cursor: "pointer",
                }}>
                {/* RADIO CIRCLE — hidden on desktop, shown on mobile via CSS */}
                <div className="pd-pkg-radio">
                  {isActive && (
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {/* IMAGE */}
                <div className="pd-pkg-card-image" style={{
                  width: "100%",
                  aspectRatio: "5/3",
                  overflow: "hidden",
                  marginBottom: 8,
                  background: "#fdf8f2",
                }}>
                  <img
                    src={pkgImgs[i] || pkgImgs[0]}
                    alt={pkg.packageName}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={handleImgError(IMAGE_PLACEHOLDER)}
                  />
                </div>

                <div className="pd-pkg-card-content" style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: "100%",
                }}>
                  {/* TOP ICON CIRCLE — hidden on mobile via CSS */}
                  <div className="pd-pkg-icon-circle" style={{
                    width: 54,
                    height: 54,
                    borderRadius: "50%",
                    background: "#fdf3e7",
                    border: "1.5px solid #f0e6d3",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 6,
                    marginTop: 10,
                    flexShrink: 0,
                  }}>
                    <i className={`fas ${iconMap[i] || "fa-user"}`} style={{ color: "#c8952a", fontSize: 22 }} />
                  </div>

                  {/* PACKAGE NAME */}
                  <div style={{
                    fontWeight: 700,
                    fontSize: "clamp(13px, 1.4vw, 17px)",
                    color: "#3d1a1a",
                    textAlign: "center",
                    padding: "0 12px",
                    lineHeight: 1.25,
                    marginBottom: 8,
                    wordBreak: "break-word",
                  }}>
                    {pkg.packageName}
                  </div>

                  {/* TYPE BADGE */}
                  <div style={{
                    background: "#fdf3e7",
                    border: "1px solid #f0e6d3",
                    borderRadius: 20,
                    padding: "3px 14px",
                    fontSize: 11,
                    color: "#c8952a",
                    fontWeight: 600,
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}>
                    <span style={{ color: "#c8952a", fontSize: 8 }}>◆</span>
                    {pkg.packageType}
                    <span style={{ color: "#c8952a", fontSize: 8 }}>◆</span>
                  </div>

                  {/* PRICE */}
                  <div style={{
                    fontSize: "clamp(18px, 1.8vw, 26px)",
                    fontWeight: 800,
                    color: "#7B1F3A",
                    marginBottom: 2,
                  }}>
                    ₹{pkg.packagePrice}
                  </div>

                  {/* DIVIDER LINE */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 14,
                  }}>
                  </div>

                  {/* CTA BUTTON */}
                  <button
                    className="pd-pkg-select-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPackage(pkg);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.opacity = "0.88";
                      e.currentTarget.style.boxShadow = "0 6px 18px rgba(123,31,58,0.28)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.opacity = "1";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    style={{
                      ...btnStyles[i] || btnStyles[0],
                      borderRadius: 50,
                      padding: "8px 16px",
                      fontSize: "clamp(10px, 1vw, 13px)",
                      fontWeight: 700,
                      cursor: "pointer",
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      marginBottom: 12,
                      transition: "transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease",
                    }}
                  >
                    Select Package
                    <span style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <i className="fas fa-chevron-right" style={{ fontSize: 9 }} />
                    </span>
                  </button>

                  {/* DIVIDER LINE */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 14,
                  }}>
                  </div>

                  {/* DESCRIPTION if any — hidden on mobile via CSS */}
                  {pkg.packageDescription?.length > 0 && (
                    <ul className="pd-pkg-desc-list-wrap" style={{ textAlign: "left", paddingLeft: 16, marginBottom: 12, fontSize: 11, color: "#888", width: "90%" }}>
                      {pkg.packageDescription.map((d, di) => (
                        <li
                          key={di}
                          style={{
                            marginBottom: 3,
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            maxHeight: "4.2em",
                            lineHeight: "1.4em",
                          }}
                        >
                          ✔ {d}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="pd-trust-strip">
          {[
            { icon: "fas fa-lock", t: "100% Secure Payments" },
            { icon: "fas fa-check-circle", t: "Instant Booking Confirmation" },
            { icon: "fas fa-users", t: "Trusted by 50 Lakh+ Devotees" },
            { icon: "fas fa-box-open", t: "Prasad Delivery Guaranteed" },
          ].map((ts, i) => (
            <div key={i} className="pd-ts-item">
              <i className={ts.icon} /> {ts.t}
            </div>
          ))}
        </div>
      </div>

      {/* ══ REVIEWS ══ */}
      <ReviewsSection reviews={pujaDetails?.reviews || []} />

      {/* ══ STATS BANNER ══ */}
      <div
        className="pd-stats-banner"
        style={{ backgroundImage: "url('/assets/img/about/bg3.png')" }}
      >
        {[
          { num: "3,00,000+", lbl: "Pujas Performed" },
          { num: "108+", lbl: "Temples Pan India" },
          { num: "4.9", lbl: "Average Rating", star: true },
          { num: "99%", lbl: "Devotee Satisfaction" },
        ].map((s, i) => (
          <div key={i} className="pd-stat-cell">
            <div className="pd-stat-num">
              {s.star && <span className="pd-stat-star">★ </span>}
              {s.num}
            </div>
            <div className="pd-stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ══ FAQ ══ */}
      <div className="pd-faq-wrap">
        <div className="pd-sec-eyebrow">
          <span className="pd-eyebrow-line" />
          <i className="fas fa-om" /> Frequently Asked Questions{" "}
          <i className="fas fa-om" />
          <span className="pd-eyebrow-line" />
        </div>
        <div className="pd-faq-grid">
          {(pujaDetails?.faq || FAQS).map((f, i) => (
            <FaqItem
              key={i}
              num={i + 1}
              q={f.question || f.q}
              a={f.answer || f.a}
            />
          ))}
        </div>
      </div>

      {/* ══ CTA BANNER ══ */}
      <div
        className="pd-cta-banner"
        style={{ backgroundImage: "url('/assets/img/about/last_bg.png')" }}
      >
        <div className="pd-cta-text m-auto text-center">
          <div className="pd-cta-title m-0">
            Perform this sacred puja and invite
          </div>
          <div className="pd-cta-sub m-0">Divine blessings into your life.</div>
        </div>
        <button
          className="pd-bc-btn-botom"
          onClick={() => {
            document.getElementById("pd-packages-section")?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }}
        >
          Select Puja Package
        </button>
      </div>

      <Footer />

      {!packagesSectionVisible && (
        <div className="pd-mobile-proceed-wrap">
          <button
            type="button"
            className="pd-mobile-proceed-btn"
            onClick={() => {
              document.getElementById("pd-packages-section")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
          >
            Select Puja Package <i className="fas fa-arrow-right" />
          </button>
        </div>
      )}
    </div>
  );
};

const PackageDescList = ({ items = [], initialShow = 3 }) => {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, initialShow);
  const remaining = items.length - initialShow;

  return (
    <ul className="pd-pkg-desc-list">
      {visible.map((item, i) => (
        <li key={i} className="pd-pkg-desc-item">
          <i className="fas fa-check-circle" style={{ color: "#c8952a", marginRight: 6 }} />
          {typeof item === "string" ? item : item?.text || item?.name || JSON.stringify(item)}
        </li>
      ))}
      {items.length > initialShow && (
        <li>
          <button
            onClick={() => setShowAll((s) => !s)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#c8952a",
              fontWeight: 600,
              fontSize: "0.88em",
              padding: "4px 0 0 0",
              textDecoration: "underline",
              textUnderlineOffset: 2,
            }}
          >
            {showAll
              ? "Show Less ▲"
              : `+ ${remaining} more benefit${remaining !== 1 ? "s" : ""} ▼`}
          </button>
        </li>
      )}
    </ul>
  );
};

export default PujaDetails;