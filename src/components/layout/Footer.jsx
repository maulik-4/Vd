import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiService from '../../services/apiServices';

const Footer = () => {
    // Newsletter state
    const [newsletterEmail, setNewsletterEmail] = useState('');
    const [newsletterLoading, setNewsletterLoading] = useState(false);
    const [newsletterStatus, setNewsletterStatus] = useState(null);

    // Auto-dismiss newsletter status message after 4 seconds
    useEffect(() => {
        if (newsletterStatus) {
            const timer = setTimeout(() => {
                setNewsletterStatus(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [newsletterStatus]);

    const handleNewsletterSubmit = async (e) => {
        e.preventDefault();
        const trimmedEmail = (newsletterEmail || '').trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!trimmedEmail) {
            setNewsletterStatus({ type: 'error', message: 'Please enter your email.' });
            return;
        }
        if (!emailRegex.test(trimmedEmail)) {
            setNewsletterStatus({ type: 'error', message: 'Please enter a valid email address.' });
            return;
        }

        setNewsletterLoading(true);
        setNewsletterStatus(null);

        try {
            let userName = '';
            try {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                userName = user.name || user.user_name || localStorage.getItem('user_name') || '';
            } catch (_) {}

            const payload = {
                email: trimmedEmail,
                name: userName,
                source: 'website',
            };

            const res = await apiService.postBearer('/user_api/newsletter_subscribe', payload);

            if (res && res.status) {
                setNewsletterStatus({
                    type: 'success',
                    message: res.message || 'Subscribed successfully! Welcome to VaidikGuru.',
                });
                setNewsletterEmail('');
            } else {
                setNewsletterStatus({
                    type: 'error',
                    message: res?.message || 'Unable to subscribe. Please try again.',
                });
            }
        } catch (err) {
            console.error('Newsletter subscribe error:', err);
            const errMsg = err?.response?.data?.message || 'Something went wrong. Please try again.';
            setNewsletterStatus({ type: 'error', message: errMsg });
        } finally {
            setNewsletterLoading(false);
        }
    };

    // Generate star coordinates for a unique starfield every load
    const starField = useMemo(() => Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        size: `${Math.random() * 2.5}px`,
        duration: `${3 + Math.random() * 4}s`
    })), []);

    const columns = [
        {
            title: "// Services",
            items: [
                { label: "Puja", url: "/puja" },
                { label: "Chadhava", url: "/chadhava" },
                { label: "Panchang", url: "/panchang" },
                { label: "Horoscope", url: "/horoscope" },
                { label: "Astrology Tools", url: "/astrology_calculator_hub" },

            ]
        },
        {
            title: "// Support",
            items: [
                { label: "Help Center", url: "/help" },
                { label: "Consult with Astrologer", url: "/astrologer" },
                { label: "Register as Astrologer", url: "/astrologer_registration" },
                { label: "Refund Policy", url: "/cancellation_refund_policy" }
            ]
        },
        {
            title: "// Company",
            items: [
                { label: "About Us", url: "/about_us" },
                { label: "Careers", url: "/careers" },
                { label: "Security", url: "/security" },
                { label: "Contact Us", url: "/contact_us" },
                { label: "Our Blog", url: "/blog" }


            ]
        }
    ];
    return (
        <footer className="footer-diviniq-final" style={{ background: "linear-gradient(135deg, #6E2A22, #2A0C10)" }}>
            {/* Twinkling Background Layer */}
            {starField.map(star => (
                <div key={star.id} className="footer-star" style={{
                    top: star.top, left: star.left, width: star.size, height: star.size,
                    '--d': star.duration
                }} />
            ))}

            <div className="container-fluid p-0 position-relative z-index-1">

                {/* --- 1. Top Section: Branding & App --- */}
                <div className="row align-items-center mb-5 pb-5  border-white-10">
                    <div className="col-lg-6 mb-4 mb-lg-0">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                        >
                            <div
                                className="d-inline-block p-3 rounded-12 mb-4"
                            >
                                <img
                                    src="/assets/img/logo1234.jpeg"
                                    width="200"
                                    style={{ borderRadius: "15px" }}
                                    alt="Vaidik Guru"
                                />
                            </div>

                            <h2 className="text-white fw-bold h3 mb-2">
                                Uncover a new approach to divinity
                            </h2>

                            <p className="text-white-50 small pe-lg-5 mb-0">
                                Join our global community and align your life with celestial wisdom.
                            </p>
                        </motion.div>
                    </div>
                    <div className="col-lg-6">
                        <div className="d-md-flex flex-wrap justify-content-lg-end gap-3">
                            <a href="https://play.google.com/store/apps/details?id=com.app.vaidikguru" target="_blank" rel="noreferrer" className="app-btn-elite">
                                <i className="fab fa-apple fs-4"></i>
                                <div className="text-start">
                                    <small className="d-block opacity-50" style={{ fontSize: '9px' }}>DOWNLOAD ON THE</small>
                                    <span className="fw-bold">App Store</span>
                                </div>
                            </a>
                            <a href="https://play.google.com/store/apps/details?id=com.app.vaidikguru" target="_blank" rel="noreferrer" className="app-btn-elite my-2 my-md-0">
                                <i className="fab fa-google-play fs-4 text-warning"></i>
                                <div className="text-start">
                                    <small className="d-block opacity-50" style={{ fontSize: '9px' }}>GET IT ON</small>
                                    <span className="fw-bold">Google Play</span>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>

                {/* --- 2. 4-Column Link Grid --- */}
                <div className="row justify-content-between g-4">
                    {columns.map((col, idx) => (
                        <div key={idx} className="col-6 col-md-4 col-xl-auto">
                            <h4 className="footer-title-modern">{col.title}</h4>
                            <div className="nav flex-column">
                                {col.items.map((link, i) => (
                                    <Link
                                        key={i}
                                        to={link.url}
                                        onClick={() => {
                                            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                                            document.documentElement.scrollTop = 0;
                                            document.body.scrollTop = 0;
                                        }}
                                        className="footer-link-modern"
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Newsletter as 4th Column */}
                    <div className="col-lg-3">
                        <h4 className="footer-title-modern">// Newsletter</h4>
                        <p className="small text-white-50 mb-3">Never miss an update. Get cosmic insights monthly.</p>
                        
                        <form onSubmit={handleNewsletterSubmit}>
                            <div className="d-flex bg-white-10 rounded-pill p-1 position-relative" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <input
                                    type="email"
                                    value={newsletterEmail}
                                    onChange={(e) => {
                                        setNewsletterEmail(e.target.value);
                                        if (newsletterStatus) setNewsletterStatus(null);
                                    }}
                                    placeholder="example@gmail.com"
                                    className="form-control border-0 bg-transparent text-white px-3"
                                    disabled={newsletterLoading}
                                    style={{ outline: 'none', boxShadow: 'none' }}
                                />
                                <button
                                    type="submit"
                                    disabled={newsletterLoading}
                                    className="th-btn style3 py-2 px-4 rounded-pill"
                                    style={{ whiteSpace: 'nowrap', opacity: newsletterLoading ? 0.7 : 1 }}
                                >
                                    {newsletterLoading ? 'Joining...' : 'Join'}
                                </button>
                            </div>

                            {newsletterStatus && (
                                <div
                                    className="mt-2 small px-2 py-1 rounded"
                                    style={{
                                        color: newsletterStatus.type === 'success' ? '#86efac' : '#fca5a5',
                                        fontSize: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <i className={`fas ${newsletterStatus.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                                    <span>{newsletterStatus.message}</span>
                                </div>
                            )}
                        </form>
                    </div>
                </div>

                {/* --- 3. Bottom Bar --- */}
                <div className="mt-100 pt-40  border-white-10 d-flex flex-wrap justify-content-between align-items-center">
                    <p className="small text-white-50 opacity-30 mb-0">© 2025 VaidikGuru</p>
                    <div className="d-flex gap-4 mt-3 mt-md-0">
                        <Link
                            to="/privacy_policy"
                            onClick={() => {
                                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                                document.documentElement.scrollTop = 0;
                                document.body.scrollTop = 0;
                            }}
                            className="small text-white-50 text-decoration-none hover-white"
                        >
                            Privacy Policy
                        </Link>
                        <Link
                            to="/terms_of_use"
                            onClick={() => {
                                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                                document.documentElement.scrollTop = 0;
                                document.body.scrollTop = 0;
                            }}
                            className="small text-white-50 text-decoration-none hover-white"
                        >
                            Terms of Service
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;