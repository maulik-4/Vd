import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import apiService from "../services/apiServices";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import ScrollToTop from "../components/common/ScrollToTop";
import { useSEO } from "../hooks/seoHook";
import { SEO } from "../config/seoConfig";
import "./PujaLiveViewPage.css";

// Ritual sequence shown in the timeline card. This is a UI-only simulation —
// wire it to real backend step updates (e.g. booking.currentStep) when your
// admin panel starts pushing them; see the TODO further down.
const RITUAL_STEPS = [
  "Sankalp & Ganesh Vandana",
  "Shodashopachara Puja",
  "Havan & Ahuti",
  "Aarti",
  "Prasad distribution notice",
];

// TEMP: remove once you're done testing the UI — see PujaLiveViewPage.md notes.
const MOCK_BOOKING = {
  _id: "demo123",
  puja_booking_id: "PJ-2026-04531",
  puja_type: "Ganesh Puja",
  puja_id: { title: "Ganesh Puja" },
  mandirName: "Somnath Temple, Gujarat",
  astrologer_name: "Pandit Raghunath Joshi",
  puja_date: "2026-07-21",
  userDetails: { name: "Priya Sharma", gotra: "Kashyap" },
};

const PujaLiveViewPage = () => {
  const { id } = useParams();
  useSEO({
    ...SEO.pujaLive,
    canonical: id ? `/puja-live/${id}` : '/darshan',
  });
  const location = useLocation();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!location.state?.booking);

  const [elapsed, setElapsed] = useState(0);
  const [viewers, setViewers] = useState(142);
  const [currentStep, setCurrentStep] = useState(1);
  const [messages, setMessages] = useState([
    { who: "Anjali M.", text: "Jai Ganesh! Sending love from London 🙏", when: "2m ago" },
    { who: "Ramesh Sharma", text: "Beautiful aarti. Proud of you!", when: "5m ago" },
  ]);
  const [msgInput, setMsgInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const feedRef = useRef(null);
  const heroRef = useRef(null);

  // ── Fetch booking (same pattern as PujaBookingDetailsPage) ────────────────
  // NOTE: postBearer sends the *logged-in device's* token. This page is meant
  // to be shared with people who did NOT make the booking and may not be
  // logged in at all, so this fetch will fail for them. Before shipping,
  // ask the backend team for a public, token-free endpoint such as
  // GET /puja/public-live/:id that returns only what's safe to show a viewer
  // (title, temple, priest, devotee first name, status) — do not expose the
  // full booking object (address, phone, payment info) on a public link.
  useEffect(() => {
    if (booking) return;

    // TEMP: remove this block once you're done testing the UI
    const params = new URLSearchParams(location.search);
    if (params.get("demo") === "true") {
      setBooking(MOCK_BOOKING);
      setLoading(false);
      return;
    }

    const fetchBooking = async () => {
      try {
        const res = await apiService.postBearer("/puja/mypujabookings", {});
        if (res && res.status) {
          const list = res.results || res.bookPooja || res.data || res.result || [];
          const match = list.find((b) => b._id === id);
          setBooking(match || null);
        }
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Elapsed live timer ─────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Gentle viewer count drift (demo only — replace with a real presence
  //     count from your video/chat backend if you have one) ───────────────
  //     Still used by the "Watching Live" figure in the stats bar below.
  useEffect(() => {
    const t = setInterval(() => {
      setViewers((v) => Math.max(90, v + Math.floor(Math.random() * 5) - 2));
    }, 4000);
    return () => clearInterval(t);
  }, []);

  // ── Ritual step auto-advance (demo simulation) ────────────────────────
  // TODO(diviniq): replace this timer with real step updates, e.g. poll
  // GET /puja/live-status/:id every 15-30s and setCurrentStep(res.step).
  useEffect(() => {
    const t = setInterval(() => {
      setCurrentStep((i) => Math.min(i + 1, RITUAL_STEPS.length - 1));
    }, 45000);
    return () => clearInterval(t);
  }, []);

  // ── Fullscreen toggle for the live video area ─────────────────────────
  // Tries the real browser Fullscreen API first (best experience — true OS
  // fullscreen). But that API can silently fail or be blocked depending on
  // permissions, or if this page is being previewed inside an embedded /
  // sandboxed iframe (some in-editor browser previews block it entirely).
  // So regardless of whether the native API succeeds, we also toggle a CSS
  // class that makes the hero cover the full viewport itself — meaning the
  // button always visibly works, even where requestFullscreen is blocked.
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    // Prevent background scroll while the CSS-fallback fullscreen is active.
    document.body.style.overflow = isFullscreen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isFullscreen]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  const toggleFullscreen = async () => {
    const el = heroRef.current;
    const goingFullscreen = !isFullscreen;
    setIsFullscreen(goingFullscreen);

    if (!el) return;
    try {
      if (goingFullscreen) {
        const request =
          el.requestFullscreen ||
          el.webkitRequestFullscreen ||
          el.mozRequestFullScreen ||
          el.msRequestFullscreen;
        if (request) await request.call(el);
      } else if (document.fullscreenElement) {
        const exit =
          document.exitFullscreen ||
          document.webkitExitFullscreen ||
          document.mozCancelFullScreen ||
          document.msExitFullscreen;
        if (exit) await exit.call(document);
      }
    } catch (err) {
      // Native API blocked/unsupported — that's fine, the CSS fallback
      // above already covers the viewport, so playback still looks and
      // behaves like fullscreen.
      console.warn("Native fullscreen unavailable, using CSS fallback:", err);
    }
  };

  const formatElapsed = (s) => {
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${m}:${sec}`;
  };

  const shareUrl = `${window.location.origin}/puja-live/${id}`;

  const copyLink = async () => {
    const markCopied = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    };

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        markCopied();
        return;
      }
    } catch (err) {
      // Clipboard API blocked (permissions/insecure context) — fall through
      // to the manual fallback below instead of doing nothing.
      console.warn("Clipboard API failed, using fallback:", err);
    }

    // Fallback: create a temporary, invisible textarea, select its text,
    // and use the older execCommand copy path. Works in non-secure
    // contexts and older/embedded browsers where navigator.clipboard
    // is missing or blocked.
    try {
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      markCopied();
    } catch (err) {
      console.error("Copy link failed:", err);
    }
  };

  const sendBlessing = () => {
    const text = msgInput.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { who: "You", text, when: "just now" }]);
    setMsgInput("");
    // TODO(diviniq): this only lives in the current browser tab. To make it
    // real-time across every viewer, write to the Firebase project you
    // already wired up in src/services/Liveconfig.js — e.g. push to
    // `PujaLive/{id}/blessings` and subscribe with onValue() here instead
    // of using local state.
  };

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages]);

  if (loading) {
    return (
      <div className="main-wrapper bg-light">
        <ScrollToTop />
        <Header />
        <div className="plv-loading">
          <div className="spinner-border text-theme" role="status"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="main-wrapper bg-light">
        <ScrollToTop />
        <Header />
        <div className="plv-notfound">
          <h3>This live pooja isn't available</h3>
          <p>The link may be incorrect, or the booking may have been removed.</p>
          <button className="plv-back-btn" onClick={() => navigate("/my_puja_booking")}>
            Back to My Bookings
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const title = booking.puja_id?.title || booking.puja_type || "Puja";
  const temple = booking.mandirName || booking.puja_id?.mandirName || "Temple";
  const priest = booking.astrologer_name || "Our verified pandit";
  const devoteeName = booking.userDetails?.name || "the devotee's family";

  return (
    <div className="main-wrapper bg-light">
      <ScrollToTop />
      <Header />

      <div className="container plv-wrap">

        {/* ---------- Two-column layout: video on the left, activity cards
            stacked in a sidebar on the right (matches reference design) ---------- */}
        <div className="plv-grid">
          <div className="plv-main">
            <div className={`plv-hero${isFullscreen ? " plv-fullscreen-active" : ""}`} ref={heroRef}>
              <div className="plv-video-scene">
                {/* Replace this whole block with a real <video> tag or your
                    streaming provider's embed (HLS/RTMP/YouTube Live) once
                    booking.liveStreamUrl (or similar) is available from the API. */}
                <div className="plv-arch"></div>
                <div className="plv-diyas">
                  <div className="plv-diya"><div className="plv-flame"></div><div className="plv-base"></div></div>
                  <div className="plv-diya"><div className="plv-flame"></div><div className="plv-base"></div></div>
                  <div className="plv-diya"><div className="plv-flame"></div><div className="plv-base"></div></div>
                </div>
              </div>

              <div className="plv-hero-topleft">
                <div className="plv-live-badge">
                  <span className="plv-live-dot"></span>
                  <span>Live · {formatElapsed(elapsed)}</span>
                </div>
                <div className="plv-id">
                  <i className="fas fa-gopuram"></i>
                  <span className="plv-id-label">Pooja ID</span>
                  <span className="plv-id-value">{booking.puja_booking_id || id}</span>
                </div>
              </div>

              {/* Icon cluster: mute (visual-only until a real player exists)
                  and fullscreen (fully wired). */}
              <div className="plv-hero-controls">
                <button className="plv-icon-btn" aria-label="Mute">
                  <i className="fas fa-volume-high"></i>
                </button>
                <button
                  className="plv-icon-btn"
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? "Exit fullscreen" : "Watch fullscreen"}
                >
                  <i className={`fas ${isFullscreen ? "fa-compress" : "fa-expand"}`}></i>
                </button>
              </div>

              <div className="plv-hero-caption">
                <div className="plv-eyebrow">Streaming now · {temple}</div>
                <h1>{title} for {devoteeName}</h1>
                <div className="plv-sub">Performed by {priest}</div>
                <div className="plv-hero-diyas">
                  <i className="fas fa-fire"></i>
                  <i className="fas fa-fire"></i>
                  <i className="fas fa-fire"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="plv-side">
            <div className="plv-card">
              <h2><i className="fas fa-list-check"></i> Ritual Sequence</h2>
              <ol className="plv-timeline">
                {RITUAL_STEPS.map((step, i) => (
                  <li
                    key={step}
                    className={i < currentStep ? "done" : i === currentStep ? "current" : ""}
                    data-n={i < currentStep ? "✓" : i + 1}
                  >
                    {i === currentStep ? <strong>{step} — in progress</strong> : step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="plv-card plv-blessings">
              <h2><i className="fas fa-hands-praying"></i> Send Blessings</h2>
              <div className="plv-feed" ref={feedRef}>
                {messages.map((m, i) => (
                  <div className="plv-msg" key={i}>
                    <span className="who">{m.who}</span>{m.text}
                    <span className="when">{m.when}</span>
                  </div>
                ))}
              </div>
              <div className="plv-compose">
                <input
                  type="text"
                  maxLength={140}
                  placeholder="Write a blessing for the family…"
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendBlessing()}
                />
                <button onClick={sendBlessing}>Send</button>
              </div>
            </div>

            <div className="plv-card plv-share">
              <h2><i className="fas fa-share-nodes"></i> Share This Pooja</h2>
              <div className="plv-share-row">
                <div className="plv-link-box">
                  <span>{shareUrl}</span>
                  <button
                    onClick={copyLink}
                    className={copied ? "plv-copied" : ""}
                  >
                    <i className={`fas ${copied ? "fa-check" : "fa-copy"}`}></i>
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <a
                  className="plv-whatsapp"
                  href={`https://wa.me/?text=${encodeURIComponent(`Join us live for the ${title} — ${shareUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="fab fa-whatsapp"></i> Share on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- Stats bar: reuses the live `viewers` count; the other
            figures are decorative placeholders — swap for real aggregate
            data once the backend exposes it. ---------- */}
        <div className="plv-stats">
          <div className="plv-stat">
            <i className="fas fa-users"></i>
            <span className="plv-stat-num">{viewers}</span>
            <span className="plv-stat-label">Watching Live</span>
          </div>
          <div className="plv-stats-divider"></div>
          <div className="plv-stat">
            <i className="fas fa-fire"></i>
            <span className="plv-stat-num">3.2K</span>
            <span className="plv-stat-label">Blessings Sent</span>
          </div>
          <div className="plv-stats-divider"></div>
          <div className="plv-stat">
            <i className="fas fa-heart"></i>
            <span className="plv-stat-num">8.9K</span>
            <span className="plv-stat-label">Total Devotees</span>
          </div>
          <div className="plv-stats-divider"></div>
          <div className="plv-stat">
            <i className="fas fa-om"></i>
            <span className="plv-stat-num">100%</span>
            <span className="plv-stat-label">Sacred &amp; Secure</span>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PujaLiveViewPage;