import React, { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import MobileMenu from '../components/layout/MobileMenu';
import PopupSearch from '../components/layout/PopupSearch';
import SideMenu from '../components/layout/SideMenu';
import ScrollTop from '../components/common/ScrollTop';
import { motion } from 'framer-motion';
import apiService from '../services/apiServices';
import { useSEO } from '../hooks/seoHook';
import { SEO } from '../config/seoConfig';

const CancellationAndRefund = () => {
    useSEO(SEO.cancellationAndRefund);
    const [showSideMenu, setShowSideMenu] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [content, setContent] = useState("");
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);

    // Splits the raw HTML (headings + paragraphs/lists) into individual
    // section objects so each one can be rendered as its own card.
    const parseSectionsFromHtml = (htmlString) => {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, "text/html");
            const nodes = Array.from(doc.body.childNodes);
            const result = [];
            let current = null;

            nodes.forEach((node) => {
                const isHeading =
                    node.nodeType === 1 && /^H[1-4]$/.test(node.tagName);

                if (isHeading) {
                    current = { title: node.textContent.trim(), html: "" };
                    result.push(current);
                } else {
                    if (!current) {
                        current = { title: "", html: "" };
                        result.push(current);
                    }
                    if (node.nodeType === 1) {
                        current.html += node.outerHTML;
                    } else if (node.nodeType === 3 && node.textContent.trim()) {
                        current.html += `<p>${node.textContent.trim()}</p>`;
                    }
                }
            });

            return result.filter((s) => s.title || s.html.trim());
        } catch (e) {
            console.error("Error parsing policy content:", e);
            return [];
        }
    };

    useEffect(() => {
        const fetchPolicy = async () => {
            try {
                const res = await apiService.get('/links/cancleandrefund');
                let html = typeof res === 'string' ? res : (res?.content || res?.data || '');
                // Backend content still references the old brand name — swap
                // it for display only (case-insensitive, keeps punctuation/spacing intact).
                html = html.replace(/Astrogurujii/gi, "VaidikGuru");
                setContent(html);
                setSections(parseSectionsFromHtml(html));
            } catch (error) {
                console.error("Error fetching policy:", error);
                const fallback = "<p class='text-center'>Policy content is temporarily unavailable. Please contact support.</p>";
                setContent(fallback);
                setSections([{ title: "", html: fallback }]);
            } finally {
                setLoading(false);
            }
        };
        fetchPolicy();
    }, []);

    return (
        <div className="cr-root">
            <SideMenu isOpen={showSideMenu} onClose={() => setShowSideMenu(false)} />
            <PopupSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
            <MobileMenu isOpen={showMobileMenu} onClose={() => setShowMobileMenu(false)} />
            <ScrollTop />
            <Header
                onMenuToggle={() => setShowMobileMenu(true)}
                onSideMenuToggle={() => setShowSideMenu(true)}
                onSearchToggle={() => setShowSearch(true)}
            />

            {/* ── HERO ── */}
            <section
                style={{
                    padding: "40px 0",
                    background: "#fff",
                }}
            >
                <div
                    className="container"
                    style={{
                        maxWidth: "1400px",
                    }}
                >
                    <div
                        style={{
                            position: "relative",
                            minHeight: "230px",
                            backgroundImage: 'url("/assets/img/images/profile-hero-banner.jpeg")',
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            borderRadius: "28px",
                            overflow: "hidden",
                            boxShadow: "0 18px 45px rgba(58,12,27,.18)",
                        }}
                    >
                        {/* Dark Overlay */}
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                background:
                                    "linear-gradient(90deg, rgba(52,10,22,.85) 0%, rgba(70,12,30,.68) 45%, rgba(0,0,0,.18) 100%)",
                            }}
                        />

                        {/* Left Glow */}
                        <div
                            style={{
                                position: "absolute",
                                width: "360px",
                                height: "360px",
                                background: "rgba(240,169,59,.12)",
                                filter: "blur(120px)",
                                borderRadius: "50%",
                                top: "-120px",
                                left: "-120px",
                            }}
                        />

                        {/* Right Glow */}
                        <div
                            style={{
                                position: "absolute",
                                width: "300px",
                                height: "300px",
                                background: "rgba(240,169,59,.08)",
                                filter: "blur(100px)",
                                borderRadius: "50%",
                                bottom: "-120px",
                                right: "-120px",
                            }}
                        />

                        {/* Content */}
                        <div
                            style={{
                                position: "relative",
                                zIndex: 2,
                                minHeight: "230px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                textAlign: "center",
                                padding: "28px",
                            }}
                        >
                            <motion.div
                                initial={{ opacity: 0, y: 40 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                <span
                                    style={{
                                        color: "#F6B63F",
                                        fontSize: "14px",
                                        fontWeight: 700,
                                        letterSpacing: "3px",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    LEGAL INFORMATION
                                </span>

                                <h1
                                    style={{
                                        color: "#fff",
                                        fontSize: "38px",
                                        fontWeight: 800,
                                        marginTop: "12px",
                                        lineHeight: 1.15,
                                    }}
                                >
                                    Cancellation &{" "}
                                    <span style={{ color: "#F6B63F" }}>
                                        Refund
                                    </span>
                                </h1>

                                <p
                                    style={{
                                        color: "rgba(255,255,255,.88)",
                                        maxWidth: "640px",
                                        margin: "14px auto 0",
                                        fontSize: "17px",
                                        lineHeight: "1.6",
                                    }}
                                >
                                    We keep every cancellation and refund simple, transparent,
                                    and fair for every devotee.
                                </p>

                                <div
                                    style={{
                                        width: "140px",
                                        height: "4px",
                                        background: "#F6B63F",
                                        borderRadius: "50px",
                                        margin: "18px auto 0",
                                    }}
                                />
                            </motion.div>
                        </div>

                        {/* Golden Border */}
                        <div
                            style={{
                                position: "absolute",
                                inset: "12px",
                                border: "1px solid rgba(246,182,63,.45)",
                                borderRadius: "20px",
                                pointerEvents: "none",
                            }}
                        />
                    </div>
                </div>
            </section>

            {/* ── MAIN CONTENT ── */}
            <section className="cr-section">
                <div className="cr-container">
                    <div className="cr-layout">

                        {/* Info row — Response Time / Refund Security / Jurisdiction / Support, single scrollable line */}
                        <div className="cr-infobar">
                            <div className="cr-infobar__card">
                                <div className="cr-infobar__icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="cr-infobar__label">Response Time</p>
                                    <p className="cr-infobar__value">Within 24 Hours</p>
                                </div>
                            </div>

                            <div className="cr-infobar__card">
                                <div className="cr-infobar__icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="cr-infobar__label">Refund Security</p>
                                    <p className="cr-infobar__value">Fully Protected</p>
                                </div>
                            </div>

                            <div className="cr-infobar__card">
                                <div className="cr-infobar__icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 22s8-5 8-10V5l-8-3-8 3v7c0 5 8 10 8 10z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="cr-infobar__label">Jurisdiction</p>
                                    <p className="cr-infobar__value">Republic of India</p>
                                </div>
                            </div>

                            <div className="cr-infobar__card">
                                <div className="cr-infobar__icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3-8.7A2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .3 2 .6 3a2 2 0 01-.5 2.1L8 10a16 16 0 006 6z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="cr-infobar__label">Support</p>
                                    <p className="cr-infobar__value">support@vaidikguru.com</p>
                                </div>
                            </div>
                        </div>

                        {/* Main */}
                        <main className="cr-main">
                            {loading ? (
                                <div className="cr-card">
                                    <div className="cr-loader">
                                        <div className="cr-loader__ring">
                                            <div /><div /><div /><div />
                                        </div>
                                        <p className="cr-loader__text">Loading Policy Details…</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="cr-content-grid d-block">
                                    {sections.map((section, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 24 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.5, delay: 0.06 * i, ease: "easeOut" }}
                                            className="cr-section-card"
                                        >
                                            {section.title && (
                                                <h3 className="cr-section-card__title">{section.title}</h3>
                                            )}
                                            <div
                                                className="cr-section-card__body"
                                                dangerouslySetInnerHTML={{ __html: section.html }}
                                            />
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {/* Refund Process Assistance Box */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: .5, delay: .25 }}
                                whileHover={{ y: -3 }}
                                className="cr-assist"
                            >
                                <div className="cr-assist__left">
                                    <div className="cr-assist__icon">
                                        <i className="fas fa-hand-holding-usd" />
                                    </div>
                                    <div>
                                        <h6 className="cr-assist__title">Need assistance with a refund?</h6>
                                        <p className="cr-assist__sub">Our support team typically responds within 24 hours.</p>
                                    </div>
                                </div>
                                <a href="mailto:support@vaidikguru.com" className="cr-contact-btn">
                                    Contact Support
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                                    </svg>
                                </a>
                            </motion.div>

                            {/* Bottom strip */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: .5, delay: .3 }}
                                className="cr-strip"
                            >
                                <div className="cr-strip__contact">
                                    <div className="cr-strip__avatar">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 7l10 6 10-6" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="cr-strip__label">Questions about this policy?</p>
                                        <a className="cr-strip__email" href="mailto:support@vaidikguru.com">support@vaidikguru.com</a>
                                    </div>
                                </div>
                                <button className="cr-print-btn cr-print-btn--sm" onClick={() => window.print()}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
                                    </svg>
                                    Print
                                </button>
                            </motion.div>
                        </main>

                    </div>
                </div>
            </section>

            <Footer />

            <style>{`
        :root {
          --cr-gold:        #f0a93b;
          --cr-gold-d:      #c9882a;
          --cr-pink:        #c2185b;
          --cr-maroon:      #3a1330;
          --cr-maroon-deep: #2b0f23;
          --cr-bg:          #faf9f7;
          --cr-card:        #ffffff;
          --cr-ink:         #1a1118;
          --cr-muted:       #6b6070;
          --cr-line:        #ede8eb;
          --cr-radius:      18px;
        }

        /* ── Base ── */
        .cr-root { background:var(--cr-bg); font-family:'Poppins',sans-serif; color:var(--cr-ink); }
        .cr-container { max-width:1180px; margin:0 auto; padding:0 24px; }

        /* ── Section / Layout ── */
        .cr-section { padding:56px 0 80px; }
        .cr-layout { display:flex; flex-direction:column; gap:26px; }

        /* ── Info row (Response Time / Refund Security / Jurisdiction / Support) — single scrollable line ── */
        .cr-infobar {
          display:flex;
          flex-direction:row;
          gap:12px;
          width:100%;
          overflow-x:auto;
          -webkit-overflow-scrolling:touch;
          scrollbar-width:thin;
          padding-bottom:4px;
        }
        .cr-infobar::-webkit-scrollbar { height:5px; }
        .cr-infobar::-webkit-scrollbar-thumb { background:rgba(201,136,42,0.3); border-radius:10px; }
        .cr-infobar::-webkit-scrollbar-track { background:transparent; }

        .cr-infobar__card {
          background:var(--cr-card); border:1px solid var(--cr-line);
          border-radius:14px; padding:13px 15px;
          display:flex; align-items:center; gap:11px;
          flex:1 1 210px; min-width:210px;
          box-shadow:0 2px 8px rgba(60,20,40,.04);
          transition:transform .25s ease, box-shadow .25s ease, border-color .25s ease;
        }
        .cr-infobar__card:hover {
          transform:translateY(-4px);
          box-shadow:0 10px 26px rgba(60,20,40,.12);
          border-color:rgba(201,136,42,.35);
        }
        .cr-infobar__icon {
          width:38px; height:38px; border-radius:10px; background:#fdeef0;
          display:flex; align-items:center; justify-content:center;
          flex-shrink:0; color:var(--cr-pink);
          transition:transform .25s ease, background .25s ease;
        }
        .cr-infobar__icon svg { width:18px; height:18px; }
        .cr-infobar__card:hover .cr-infobar__icon {
          transform:scale(1.1) rotate(-6deg);
          background:#fbdfe6;
        }
        .cr-infobar__label { font-size:10.5px; color:var(--cr-muted); font-weight:500; margin:0 0 2px; white-space:nowrap; }
        .cr-infobar__value { font-size:12.5px; font-weight:600; color:var(--cr-ink); margin:0; white-space:nowrap; }

        /* ── Print btn ── */
        .cr-print-btn {
          display:flex; align-items:center; justify-content:center; gap:8px;
          background:linear-gradient(135deg,var(--cr-gold),var(--cr-gold-d));
          border:none; color:#fff; font-family:'Poppins',sans-serif;
          font-size:13.5px; font-weight:600;
          padding:12px 18px; border-radius:12px;
          cursor:pointer; transition:transform .2s ease,box-shadow .2s ease, filter .2s ease;
        }
        .cr-print-btn:hover { transform:translateY(-2px); box-shadow:0 6px 18px rgba(201,136,42,.35); filter:brightness(1.05); }
        .cr-print-btn:active { transform:translateY(0); }
        .cr-print-btn--sm { border-radius:10px; width:auto; flex-shrink:0; padding:11px 20px; }

        /* ── Main ── */
        .cr-main { display:flex; flex-direction:column; gap:18px; }
        .cr-card {
          background:var(--cr-card); border:1px solid var(--cr-line);
          border-radius:var(--cr-radius); padding:46px 50px;
          box-shadow:0 4px 22px rgba(60,20,40,.06);
        }

        /* ── Content shown as individual section cards, 2 per row ── */
        .cr-content-grid {
          display:grid;
          grid-template-columns:repeat(2, 1fr);
          gap:20px;
        }
        .cr-section-card {
          background:var(--cr-card); border:1px solid var(--cr-line);
          border-radius:var(--cr-radius); padding:26px 28px;
          box-shadow:0 4px 18px rgba(60,20,40,.05);
          transition:transform .25s ease, box-shadow .25s ease, border-color .25s ease;
        }
        .cr-section-card:hover {
          transform:translateY(-5px);
          box-shadow:0 14px 32px rgba(60,20,40,.13);
          border-color:rgba(201,136,42,.4);
        }
        .cr-section-card__title {
          color:var(--cr-maroon); font-weight:700; font-size:17.5px;
          line-height:1.3; margin:0 0 13px; padding-bottom:11px;
          border-bottom:2px solid var(--cr-line);
          transition:border-color .25s ease, color .25s ease;
        }
        .cr-section-card:hover .cr-section-card__title {
          border-bottom-color:var(--cr-gold);
          color:var(--cr-gold-d);
        }
        .cr-section-card__body { font-size:14.5px; line-height:1.8; color:#3d343b; }
        .cr-section-card__body h1,.cr-section-card__body h2,
        .cr-section-card__body h3,.cr-section-card__body h4 {
          color:var(--cr-maroon); font-weight:700; font-size:16px; margin:13px 0 8px;
        }
        .cr-section-card__body p { margin:0 0 13px; color:var(--cr-ink); }
        .cr-section-card__body p:last-child { margin-bottom:0; color:var(--cr-muted); font-size:13.5px; }
        .cr-section-card__body ul,.cr-section-card__body ol { padding-left:20px; margin:0 0 13px; }
        .cr-section-card__body li { margin-bottom:6px; }
        .cr-section-card__body a {
          color:var(--cr-gold-d); text-decoration:underline; text-underline-offset:2px;
          transition:color .2s ease;
        }
        .cr-section-card__body a:hover { color:var(--cr-maroon); }
        .cr-section-card__body strong { color:var(--cr-ink); font-weight:600; }

        /* ── Loader ── */
        .cr-loader { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:80px 0; gap:20px; }
        .cr-loader__ring { position:relative; width:48px; height:48px; }
        .cr-loader__ring div {
          box-sizing:border-box; position:absolute; inset:0;
          border:4px solid transparent; border-top-color:var(--cr-gold);
          border-radius:50%; animation:cr-spin 1s cubic-bezier(.5,0,.5,1) infinite;
        }
        .cr-loader__ring div:nth-child(1){animation-delay:-.45s}
        .cr-loader__ring div:nth-child(2){animation-delay:-.3s}
        .cr-loader__ring div:nth-child(3){animation-delay:-.15s}
        @keyframes cr-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        .cr-loader__text { color:var(--cr-muted); font-size:14px; margin:0; }

        /* ── Assist Box ── */
        .cr-assist {
          display:flex; align-items:center; justify-content:space-between;
          flex-wrap:wrap; gap:20px;
          background:linear-gradient(135deg,#fff7ed,#fdf3ee);
          border:1px solid rgba(240,169,59,.25); border-left:4px solid var(--cr-gold);
          border-radius:16px; padding:24px 28px;
          box-shadow:0 4px 16px rgba(201,136,42,.08);
          transition:transform .2s ease, box-shadow .2s ease;
        }
        .cr-assist:hover { transform:translateY(-3px); box-shadow:0 10px 28px rgba(201,136,42,.12); }
        .cr-assist__left { display:flex; align-items:center; gap:18px; }
        .cr-assist__icon {
          width:54px; height:54px; border-radius:50%;
          background:#fff; display:flex; align-items:center; justify-content:center;
          font-size:22px; color:var(--cr-gold-d);
          box-shadow:0 6px 18px rgba(60,20,40,.10); flex-shrink:0;
          transition:transform .25s ease;
        }
        .cr-assist:hover .cr-assist__icon { transform:scale(1.08) rotate(-4deg); }
        .cr-assist__title { font-size:15.5px; font-weight:700; color:var(--cr-maroon); margin:0 0 5px; }
        .cr-assist__sub   { font-size:13px; color:var(--cr-muted); margin:0; }

        .cr-contact-btn {
          display:inline-flex; align-items:center; gap:8px;
          background:linear-gradient(135deg,var(--cr-gold),var(--cr-gold-d));
          color:#fff; font-size:13.5px; font-weight:600;
          padding:12px 22px; border-radius:50px; text-decoration:none;
          white-space:nowrap; transition:transform .2s ease, box-shadow .2s ease;
        }
        .cr-contact-btn:hover { transform:translateY(-2px); box-shadow:0 6px 18px rgba(201,136,42,.38); color:#fff; }

        /* ── Strip ── */
        .cr-strip {
          display:flex; align-items:center; justify-content:space-between;
          flex-wrap:wrap; gap:14px;
          background:var(--cr-card); border:1px solid var(--cr-line);
          border-radius:16px; padding:18px 26px;
          box-shadow:0 2px 10px rgba(60,20,40,.04);
          transition:box-shadow .25s ease;
        }
        .cr-strip:hover { box-shadow:0 8px 22px rgba(60,20,40,.09); }
        .cr-strip__contact { display:flex; align-items:center; gap:14px; }
        .cr-strip__avatar {
          width:42px; height:42px; border-radius:11px;
          background:#fdeef0; display:flex; align-items:center; justify-content:center;
          color:var(--cr-pink); flex-shrink:0;
          transition:transform .25s ease;
        }
        .cr-strip:hover .cr-strip__avatar { transform:scale(1.08); }
        .cr-strip__label  { font-size:11.5px; color:var(--cr-muted); margin:0 0 3px; }
        .cr-strip__email  { font-size:14px; font-weight:600; color:var(--cr-maroon); text-decoration:none; transition:color .2s ease; }
        .cr-strip__email:hover { color:var(--cr-gold-d); }

        /* ── Responsive ── */
        @media(max-width:860px){
          .cr-card { padding:26px 20px; }
          .cr-content-grid { grid-template-columns:1fr; }
        }
        @media(max-width:640px){
          .cr-infobar__card { min-width:190px; padding:11px 13px; }
          .cr-infobar__icon { width:32px; height:32px; }
          .cr-infobar__icon svg { width:15px; height:15px; }
          .cr-infobar__label { font-size:9.5px; }
          .cr-infobar__value { font-size:11px; }
        }
        @media(max-width:520px){
          .cr-strip,.cr-assist { flex-direction:column; align-items:flex-start; }
          .cr-section-card { padding:20px 18px; }
        }
        @media print{
          .cr-infobar,.cr-strip,.cr-print-btn,.cr-assist { display:none!important; }
          .cr-content-grid { grid-template-columns:1fr; gap:10px; }
          .cr-section-card { box-shadow:none; border:none; padding:0 0 14px; }
          .cr-section-card__body { font-size:13.5px; }
        }
      `}</style>
        </div>
    );
};

export default CancellationAndRefund;