import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import SideMenu from '../components/layout/SideMenu';
import MobileMenu from '../components/layout/MobileMenu';
import PopupSearch from '../components/layout/PopupSearch';
import ScrollTop from '../components/common/ScrollTop';
import LoginModal from '../components/common/LoginModal';
import AuthService from '../services/authServices';
import apiService from '../services/apiServices';
import { useSEO } from '../hooks/seoHook';
import './BlogDetail.css';

// Mapping table of backend category IDs to clean frontend names
const CATEGORY_MAP = {
  "6669d5ee42b88fb18fe2bd3d": "Puja Vidhi",
  "6901c0ab5e407e30dda43d06": "Astrology",
  "6901c0e15e407e30dda43d0b": "Astrology",
  "6901c1135e407e30dda43d10": "Astrology",
  "6901c1425e407e30dda43d15": "Astrology",
  "6901c1715e407e30dda43d1a": "Astrology",
  "6901c1be5e407e30dda43d1f": "Vastu Tips",
  "6901c2295e407e30dda43d29": "Spirituality",
  "6901c2455e407e30dda43d2e": "Festival"
};

// Popular Topic Tags
const POPULAR_TOPICS = [
  "Astrology", "Festival", "Puja", "Mantra",
  "Spirituality", "Rudraksha", "Vedic Astrology", "Planetary Effects"
];

// Stats config matching home section
const STATS = [
  { icon: '/assets/img/home/men.png', value: '50K+', label: 'Happy Devotees' },
  { icon: '/assets/img/home/deep.png', value: '1000+', label: 'Verified Pandits' },
  { icon: '/assets/img/home/deep.png', value: '500+', label: 'Sacred Temples' },
  { icon: '/assets/img/home/gifthome.png', value: '1L+', label: 'Pujas Performed' },
];

// API still returns some image URLs hosted on legacy domains — rewrite to the current active backend.
const fixImgHost = (url) => {
  if (!url || typeof url !== 'string') return '';
  let clean = url
    .replace('admin.astrogurujii.com', 'admin.vaidikguru.com')
    .replace('admin.astropush.com', 'admin.vaidikguru.com');
  if (clean.startsWith('/')) {
    clean = `https://admin.vaidikguru.com${clean}`;
  }
  return clean;
};

// Vector SVG icons for Navadurga (9 Days Grid)
const SVGIcons = {
  diya: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9973f" strokeWidth="2">
      <path d="M12 2C12 2 9 6 9 9C9 10.6569 10.3431 12 12 12C13.6569 12 15 10.6569 15 9C15 6 12 2 12 2Z" fill="#c9973f" />
      <path d="M2 14C2 18.4183 6.47715 22 12 22C17.5228 22 22 18.4183 22 14" />
      <path d="M5 14H19" />
    </svg>
  ),
  lotus: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9973f" strokeWidth="2">
      <path d="M12 22C12 22 12 18 12 16M12 16C14 16 17 18 18 19M12 16C10 16 7 18 6 19" />
      <path d="M12 4C14 7 19 9 19 13C19 17 16 19 12 19C8 19 5 17 5 13C5 9 10 4 12 4Z" />
      <path d="M12 8C13 10 16 11 16 13M12 8C11 10 8 11 8 13" />
    </svg>
  ),
  meditate: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9973f" strokeWidth="2">
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7C9.5 7 8 8.5 8 10V14C8 14.5 8.5 15 9 15H15C15.5 15 16 14.5 16 14V10C16 8.5 14.5 7 12 7Z" />
      <path d="M6 18C7 16 9 15 12 15C15 15 17 16 18 18M6 21H18" />
    </svg>
  ),
  sword: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9973f" strokeWidth="2">
      <path d="M14.5 17.5L3 6M18 12.5L11.5 6M6.5 15.5L8.5 17.5M9.5 20.5L12 18" />
      <path d="M19.5 4.5L14.5 9.5" />
      <circle cx="21" cy="3" r="1" />
    </svg>
  ),
  shield: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9973f" strokeWidth="2">
      <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" />
      <path d="M12 6V18" />
      <path d="M8 12H16" />
    </svg>
  ),
  sun: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9973f" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2V4M12 20V22M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M2 12H4M20 12H22M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" />
    </svg>
  ),
  sparkle: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9973f" strokeWidth="2">
      <path d="M12 3V9M12 15V21M3 12H9M15 12H21M5.5 5.5L8.5 8.5M15.5 15.5L18.5 18.5M5.5 19.5L8.5 16.5M15.5 8.5L18.5 5.5" />
    </svg>
  ),
  bell: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9973f" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  crown: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9973f" strokeWidth="2">
      <path d="M2 4L5 12H19L22 4L17 8L12 2L7 8L2 4Z" />
      <path d="M5 16H19V19C19 20 18 21 17 21H7C6 21 5 20 5 19V16Z" />
    </svg>
  )
};

// Helper function to strip HTML tags
const stripHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\r?\n|\r/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Helper to estimate read time
const estimateReadTime = (text) => {
  const words = text.split(/\s+/).length;
  const minutes = Math.ceil(words / 180);
  return `${Math.max(3, minutes)} min read`;
};

const BlogDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Navigation / Overlay States
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // API states
  const [blogs, setBlogs] = useState([]);
  const [currentBlog, setCurrentBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Dynamic SEO for individual blog
  useSEO({
    title: currentBlog?.title ? currentBlog.title : 'Vedic Wisdom & Insights | Blog',
    description: currentBlog?.description
      ? stripHtml(currentBlog.description).slice(0, 160)
      : 'Explore sacred insights, Vedic astrology wisdom, and spiritual rituals on VaidikGuru.',
    keywords: `${currentBlog?.title || 'blog'}, vedic astrology, spiritual guidance, VaidikGuru`,
    canonical: `/blog/${id}`,
    ogImage: currentBlog?.image ? fixImgHost(currentBlog.image) : undefined,
  });

  // Thumbs feedback state (helpful)
  const [feedback, setFeedback] = useState(null); // 'yes' or 'no' or null

  // Fetch blogs from api
  useEffect(() => {
    const fetchBlogs = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await AuthService.getHomeData();
        const list = res?.blog || res?.blogs || res?.data || [];
        if (list && list.length > 0) {
          setBlogs(list);
          const found = list.find(b => (b._id === id || b.id === id));
          if (found) {
            setCurrentBlog(found);
          } else {
            setError(true);
          }
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Failed to load blogs:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, [id]);

  // If blog ID changes, update current blog
  useEffect(() => {
    if (blogs.length > 0) {
      const found = blogs.find(b => (b._id === id || b.id === id));
      if (found) {
        setCurrentBlog(found);
        window.scrollTo(0, 0);
        setFeedback(null); // reset feedback
      }
    }
  }, [id, blogs]);

  // Share handler
  const handleShare = (platform) => {
    const url = window.location.href;
    const title = currentBlog ? (currentBlog.title || currentBlog.name || 'DiviniQ Blog') : 'DiviniQ Blog';
    let shareUrl = '';

    if (platform === 'facebook') {
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    } else if (platform === 'twitter') {
      shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
    } else if (platform === 'whatsapp') {
      shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + url)}`;
    } else if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
      return;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  // Find index for pagination
  const blogIndex = blogs.findIndex(b => (b._id === id || b.id === id));
  const prevBlog = blogIndex > 0 ? blogs[blogIndex - 1] : null;
  const nextBlog = blogIndex < blogs.length - 1 && blogIndex !== -1 ? blogs[blogIndex + 1] : null;

  // Filter sidebar other blogs (excluding current, take up to 5)
  const otherBlogs = blogs.filter(b => (b._id !== id && b.id !== id)).slice(0, 5);

  const cleanDescription = currentBlog ? stripHtml(currentBlog.description || currentBlog.content || currentBlog.details) : '';
  const readTimeStr = estimateReadTime(cleanDescription);
  const catId = currentBlog ? (currentBlog.category_id || currentBlog.category) : null;
  const categoryName = currentBlog ? (CATEGORY_MAP[catId] || (typeof catId === 'string' && catId.length < 20 ? catId : 'Spirituality')) : 'Spirituality';

  // Check if this is the Navratri Blog to render custom beautiful Vedic structure
  const blogTitleStr = currentBlog ? (currentBlog.title || currentBlog.name || '').toLowerCase() : '';
  const isNavratriBlog = currentBlog && (currentBlog._id === '67dd49c94fadb43e651862ff' || blogTitleStr.includes('navratri'));

  return (
    <div className="bd-page">
      {/* Sidebar Overlay */}
      <SideMenu isOpen={showSideMenu} onClose={() => setShowSideMenu(false)} />

      {/* Popup Search */}
      <PopupSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />

      {/* Mobile Menu */}
      <MobileMenu isOpen={showMobileMenu} onClose={() => setShowMobileMenu(false)} />

      {/* Header */}
      <Header
        onMenuToggle={() => setShowMobileMenu(true)}
        onSideMenuToggle={() => setShowSideMenu(true)}
        onSearchToggle={() => setShowSearch(true)}
        onLoginClick={() => setShowLoginModal(true)}
      />

      {/* Breadcrumbs */}
      <div className="bd-breadcrumb-container">
        <div className="bd-breadcrumb">
          <Link to="/">Home</Link> &gt; <Link to="/blog">Blog</Link> &gt; <span>{currentBlog?.title || 'Loading...'}</span>
        </div>
      </div>

      <div className="bd-container">
        {loading ? (
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '100px 0' }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '3px solid #fbeee0',
              borderTop: '3px solid #6d1230',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p style={{ marginTop: '20px', color: '#7a6f6f', fontWeight: 600 }}>Invoking celestial insights...</p>
          </div>
        ) : error || !currentBlog ? (
          <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '80px 20px' }}>
            <h3>Celestial wisdom not found</h3>
            <p>We could not retrieve this article. Please check the URL or return to the blog page.</p>
            <Link to="/blog" style={{
              display: 'inline-block',
              marginTop: '15px',
              padding: '10px 20px',
              backgroundColor: '#6d1230',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '6px'
            }}>Back to Blogs</Link>
          </div>
        ) : (
          <>
            {/* Left Area - Content */}
            <div className="bd-content-area">
              <div className="bd-featured-image-wrapper">
                <img
                  className="bd-featured-image"
                  src={fixImgHost(currentBlog.img || currentBlog.image || currentBlog.blog_image || currentBlog.webImage || currentBlog.mobileImage)}
                  alt={currentBlog.title || currentBlog.name || 'Blog Post'}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1200';
                  }}
                />
              </div>

              <span className="bd-tag-badge">{categoryName}</span>
              <h1 className="bd-title">{currentBlog.title || currentBlog.name || 'Sacred Insights'}</h1>

              {/* Meta & Share bar */}
              <div className="bd-meta-share-row">
                <div className="bd-meta-info">
                  <i className="far fa-calendar-alt"></i> {apiService.formatDate(currentBlog.Created_date || currentBlog.createdAt || currentBlog.created_at || currentBlog.date)}
                  <span className="divider">•</span>
                  <i className="far fa-clock"></i> {readTimeStr}
                </div>
                <div className="bd-share-container">
                  <span className="bd-share-label">Share:</span>
                  <div className="bd-share-icons">
                    <button className="bd-share-btn" onClick={() => handleShare('facebook')} title="Facebook">
                      <i className="fab fa-facebook-f"></i>
                    </button>
                    <button className="bd-share-btn" onClick={() => handleShare('twitter')} title="Twitter">
                      <i className="fab fa-twitter"></i>
                    </button>
                    <button className="bd-share-btn" onClick={() => handleShare('whatsapp')} title="WhatsApp">
                      <i className="fab fa-whatsapp"></i>
                    </button>
                    <button className="bd-share-btn" onClick={() => handleShare('copy')} title="Copy Link">
                      <i className="fas fa-link"></i>
                    </button>
                  </div>
                </div>
              </div>

              {/* Blog body */}
              <div className="bd-body-content">
                {isNavratriBlog ? (
                  /* Custom Premium Structured Layout for Navratri matching the Mockup */
                  <>
                    <p>
                      Navratri, meaning &quot;nine nights&quot; in Sanskrit, is one of the most significant festivals in Hinduism.
                      It is a celebration of the divine feminine energy and the victory of good over evil. Observed four times
                      a year, the most widely celebrated Navratri is Chaitra Navratri and Shardiya Navratri.
                    </p>

                    <h2>The Significance of Navratri</h2>
                    <p>
                      Navratri is dedicated to Goddess Durga and her nine forms, known as Navadurga. Each day of Navratri
                      is dedicated to a different form of the goddess, symbolizing various aspects of life. Worshipping
                      these forms is believed to bring strength, prosperity, and happiness.
                    </p>

                    {/* 9 Days Grid */}
                    <div className="bd-navratri-grid">
                      <div className="bd-navratri-card">
                        <div className="bd-navratri-icon">{SVGIcons.diya}</div>
                        <div className="bd-navratri-info">
                          <span className="bd-navratri-day">Day 1</span>
                          <span className="bd-navratri-name">Shailaputri</span>
                          <span className="bd-navratri-desc">Goddess of Strength</span>
                        </div>
                      </div>

                      <div className="bd-navratri-card">
                        <div className="bd-navratri-icon">{SVGIcons.lotus}</div>
                        <div className="bd-navratri-info">
                          <span className="bd-navratri-day">Day 2</span>
                          <span className="bd-navratri-name">Brahmacharini</span>
                          <span className="bd-navratri-desc">Goddess of Devotion</span>
                        </div>
                      </div>

                      <div className="bd-navratri-card">
                        <div className="bd-navratri-icon">{SVGIcons.bell}</div>
                        <div className="bd-navratri-info">
                          <span className="bd-navratri-day">Day 3</span>
                          <span className="bd-navratri-name">Chandraghanta</span>
                          <span className="bd-navratri-desc">Goddess of Courage</span>
                        </div>
                      </div>

                      <div className="bd-navratri-card">
                        <div className="bd-navratri-icon">{SVGIcons.sparkle}</div>
                        <div className="bd-navratri-info">
                          <span className="bd-navratri-day">Day 4</span>
                          <span className="bd-navratri-name">Kushmanda</span>
                          <span className="bd-navratri-desc">Goddess of Creation</span>
                        </div>
                      </div>

                      <div className="bd-navratri-card">
                        <div className="bd-navratri-icon">{SVGIcons.meditate}</div>
                        <div className="bd-navratri-info">
                          <span className="bd-navratri-day">Day 5</span>
                          <span className="bd-navratri-name">Skandamata</span>
                          <span className="bd-navratri-desc">Goddess of Motherhood</span>
                        </div>
                      </div>

                      <div className="bd-navratri-card">
                        <div className="bd-navratri-icon">{SVGIcons.sword}</div>
                        <div className="bd-navratri-info">
                          <span className="bd-navratri-day">Day 6</span>
                          <span className="bd-navratri-name">Katyayani</span>
                          <span className="bd-navratri-desc">Goddess of Power</span>
                        </div>
                      </div>

                      <div className="bd-navratri-card">
                        <div className="bd-navratri-icon">{SVGIcons.shield}</div>
                        <div className="bd-navratri-info">
                          <span className="bd-navratri-day">Day 7</span>
                          <span className="bd-navratri-name">Kalaratri</span>
                          <span className="bd-navratri-desc">Goddess of Protection</span>
                        </div>
                      </div>

                      <div className="bd-navratri-card">
                        <div className="bd-navratri-icon">{SVGIcons.sun}</div>
                        <div className="bd-navratri-info">
                          <span className="bd-navratri-day">Day 8</span>
                          <span className="bd-navratri-name">Mahagauri</span>
                          <span className="bd-navratri-desc">Goddess of Purity</span>
                        </div>
                      </div>

                      <div className="bd-navratri-card">
                        <div className="bd-navratri-icon">{SVGIcons.crown}</div>
                        <div className="bd-navratri-info">
                          <span className="bd-navratri-day">Day 9</span>
                          <span className="bd-navratri-name">Siddhidatri</span>
                          <span className="bd-navratri-desc">Goddess of Wisdom</span>
                        </div>
                      </div>
                    </div>

                    <h2>Rituals and Traditions</h2>
                    <p>
                      During Navratri, devotees fast, pray, and perform rituals to honor the goddess. Many people
                      observe a strict fast, consuming only satvik (pure) food. Devotional songs, garba, and
                      dandiya nights add color and energy to the celebrations.
                    </p>

                    <ul className="bd-rituals-list">
                      <li>Fasting and prayer for spiritual growth</li>
                      <li>Decorating the home and setting up a kalash</li>
                      <li>Chanting mantras and reading scriptures</li>
                      <li>Participating in Garba and Dandiya Raas</li>
                      <li>Offering bhog and performing aarti</li>
                    </ul>

                    <h2>Spiritual Benefits of Navratri</h2>
                    <p>Navratri is not just a festival; it is a journey of self-purification and inner awakening. It helps in:</p>

                    {/* Benefits Row */}
                    <div className="bd-benefits-row">
                      <div className="bd-benefit-box">
                        <div className="bd-benefit-icon-wrapper">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707-.707" />
                          </svg>
                        </div>
                        <span className="bd-benefit-text">Removing negativity and mental stress</span>
                      </div>

                      <div className="bd-benefit-box">
                        <div className="bd-benefit-icon-wrapper">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z" />
                            <path d="M18 10a6 6 0 0 1-12 0v5a6 6 0 0 0 12 0v-5z" />
                            <path d="M12 17v4M8 21h8" />
                          </svg>
                        </div>
                        <span className="bd-benefit-text">Enhancing devotion and concentration</span>
                      </div>

                      <div className="bd-benefit-box">
                        <div className="bd-benefit-icon-wrapper">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 3a9 9 0 0 0 0 18M12 3v18M12 3c-3 0-5 4-5 9s2 9 5 9M12 3c3 0 5 4 5 9s-2 9-5 9" />
                          </svg>
                        </div>
                        <span className="bd-benefit-text">Inviting positivity, peace and prosperity</span>
                      </div>
                    </div>

                    <p>May this Navratri bring happiness, health, and harmony to your life. Jai Mata Di! 🙏</p>
                  </>
                ) : (
                  /* Standard Dynamic HTML Rendering for other blogs */
                  <div dangerouslySetInnerHTML={{ __html: currentBlog.description || currentBlog.content || currentBlog.details || "" }} />
                )}
              </div>

              {/* Was this article helpful card */}
              <div className="bd-feedback-card">
                <h4 className="bd-feedback-title">Was this article helpful?</h4>
                <div className="bd-feedback-buttons">
                  <button
                    className={`bd-feedback-btn ${feedback === 'yes' ? 'active' : ''}`}
                    onClick={() => setFeedback('yes')}
                  >
                    <i className="far fa-thumbs-up"></i> Yes
                  </button>
                  <button
                    className={`bd-feedback-btn ${feedback === 'no' ? 'active' : ''}`}
                    onClick={() => setFeedback('no')}
                  >
                    <i className="far fa-thumbs-down"></i> No
                  </button>
                </div>
              </div>

              {/* Pagination controls */}
              <div className="bd-pagination-row">
                {prevBlog ? (
                  <Link to={`/blog/${prevBlog._id}`} className="bd-pagination-btn">
                    <i className="fas fa-chevron-left"></i> Previous Article
                  </Link>
                ) : (
                  <span className="bd-pagination-btn disabled">
                    <i className="fas fa-chevron-left"></i> Previous Article
                  </span>
                )}

                {nextBlog ? (
                  <Link to={`/blog/${nextBlog._id}`} className="bd-pagination-btn">
                    Next Article <i className="fas fa-chevron-right"></i>
                  </Link>
                ) : (
                  <span className="bd-pagination-btn disabled">
                    Next Article <i className="fas fa-chevron-right"></i>
                  </span>
                )}
              </div>
            </div>

            {/* Right Area - Sidebar Widgets */}
            <div className="bd-sidebar">
              {/* Widget: Other Blogs */}
              {otherBlogs.length > 0 && (
                <div className="bd-widget">
                  <h4 className="bd-widget-title">Other Blogs</h4>
                  <div className="bd-other-blogs-list">
                    {otherBlogs.map((b) => (
                      <Link to={`/blog/${b._id}`} className="bd-other-blog-item" key={b._id}>
                        <img
                          src={fixImgHost(b.img || b.image)}
                          alt={b.title}
                          className="bd-other-blog-img"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=300';
                          }}
                        />
                        <div className="bd-other-blog-content">
                          <span className="bd-other-blog-title">{b.title}</span>
                          <span className="bd-other-blog-date">
                            {apiService.formatDate(b.Created_date)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Widget: Popular Topics */}
              <div className="bd-widget">
                <h4 className="bd-widget-title">Popular Topics</h4>
                <div className="bd-tags-grid">
                  {POPULAR_TOPICS.map((tag) => (
                    <Link to="/blog" className="bd-tag-item" key={tag}>
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Widget: Stats Vertical Card */}
              <div className="bd-stats-card">
                {STATS.map((s, idx) => (
                  <div className="bd-stat-item" key={idx}>
                    <div className="bd-stat-icon-wrap">
                      <img src={s.icon} alt={s.label} />
                    </div>
                    <span className="bd-stat-value">{s.value}</span>
                    <span className="bd-stat-label">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Need Guidance Banner */}
      <div className="bd-guidance-banner">
        <div className="bd-guidance-card">
          <div className="bd-guidance-left">
            <div className="bd-guidance-icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="bd-guidance-text">
              <h3>Need Personal Guidance?</h3>
              <p>Connect with an expert astrologer instantly</p>
            </div>
          </div>
          <div className="bd-guidance-right">
            <Link to="/astrologer" className="bd-guidance-btn bd-guidance-btn-chat">
              <i className="far fa-comment-alt"></i> Chat Now
            </Link>
            <Link to="/astrologer" className="bd-guidance-btn bd-guidance-btn-call">
              <i className="fas fa-phone-alt"></i> Call Now
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />

      {/* Scroll Top Button */}
      <ScrollTop />

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
};

export default BlogDetail;
