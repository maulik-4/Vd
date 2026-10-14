import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import SideMenu from '../components/layout/SideMenu';
import MobileMenu from '../components/layout/MobileMenu';
import PopupSearch from '../components/layout/PopupSearch';
import AuthService from '../services/authServices';
import apiService from '../services/apiServices';
import { useSEO } from '../hooks/seoHook';
import { SEO } from '../config/seoConfig';
import './BlogList.css';

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

// Helper function to strip HTML tags from blog descriptions for card previews
const stripHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')  // Replace HTML space entities
    .replace(/\r?\n|\r/g, ' ') // Clean up line breaks
    .replace(/\s+/g, ' ')     // Collapse multiple spaces
    .trim();
};

// Helper to estimate read time from description content length
const estimateReadTime = (text) => {
  const words = text.split(/\s+/).length;
  const minutes = Math.ceil(words / 180); // Average reading speed is ~180-200 WPM
  return `${Math.max(3, minutes)} min read`;
};

// Helper to fix old image domain URLs
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

const ITEMS_PER_PAGE = 9;

const BlogList = () => {
  useSEO(SEO.blog);
  const navigate = useNavigate();

  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // API States
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filter and Sorting State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [sortBy, setSortBy] = useState('Latest');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch blogs from API on mount
  useEffect(() => {
    const fetchBlogs = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await AuthService.getHomeData();
        const list = res?.blog || res?.blogs || res?.data || [];
        if (list && list.length > 0) {
          setBlogs(list);
        } else if (res) {
          setBlogs(list);
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
  }, []);

  // Compute category list dynamically from active blogs
  const categoriesList = useMemo(() => {
    const uniqueCategories = new Set();
    blogs.forEach((blog) => {
      const catId = blog.category_id || blog.category;
      const catName = CATEGORY_MAP[catId] || (typeof catId === 'string' && catId.length < 20 ? catId : 'Astrology');
      uniqueCategories.add(catName);
    });
    return ['All Categories', ...Array.from(uniqueCategories)];
  }, [blogs]);

  // Reset Filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All Categories');
    setSortBy('Latest');
    setCurrentPage(1);
  };

  // Filtered & Sorted Blogs
  const filteredBlogs = useMemo(() => {
    let result = [...blogs];

    // Search filter (handles title and plain-text description)
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter((blog) => {
        const title = (blog.title || blog.name || '').toLowerCase();
        const desc = stripHtml(blog.description || blog.content || blog.details).toLowerCase();
        return title.includes(term) || desc.includes(term);
      });
    }

    // Category filter using ID map
    if (selectedCategory !== 'All Categories') {
      result = result.filter((blog) => {
        const catId = blog.category_id || blog.category;
        const catName = CATEGORY_MAP[catId] || (typeof catId === 'string' && catId.length < 20 ? catId : 'Astrology');
        return catName === selectedCategory;
      });
    }

    // Date Sorting
    result.sort((a, b) => {
      const dateA = new Date(a.Created_date || a.createdAt || a.created_at || a.date || 0);
      const dateB = new Date(b.Created_date || b.createdAt || b.created_at || b.date || 0);
      if (sortBy === 'Latest') {
        return dateB - dateA;
      } else if (sortBy === 'Oldest') {
        return dateA - dateB;
      }
      return 0;
    });

    return result;
  }, [blogs, searchTerm, selectedCategory, sortBy]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredBlogs.length / ITEMS_PER_PAGE) || 1;
  const paginatedBlogs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBlogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredBlogs, currentPage]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 300, behavior: 'smooth' });
    }
  };

  const [newsEmail, setNewsEmail] = useState('');
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsMessage, setNewsMessage] = useState(null);

  // Auto-dismiss newsletter message after 4 seconds
  useEffect(() => {
    if (newsMessage) {
      const timer = setTimeout(() => {
        setNewsMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [newsMessage]);

  const handleSubscribeSubmit = async (e) => {
    e.preventDefault();
    const email = (newsEmail || '').trim().toLowerCase();
    if (!email) return;

    setNewsLoading(true);
    setNewsMessage(null);
    try {
      const res = await apiService.postBearer('/user_api/newsletter_subscribe', {
        email,
        name: '',
        source: 'website'
      });
      if (res && res.status) {
        setNewsMessage({ type: 'success', text: res.message || 'Subscribed successfully!' });
        setNewsEmail('');
      } else {
        setNewsMessage({ type: 'error', text: res?.message || 'Unable to subscribe. Try again.' });
      }
    } catch (err) {
      setNewsMessage({ type: 'error', text: err?.response?.data?.message || 'Something went wrong.' });
    } finally {
      setNewsLoading(false);
    }
  };

  return (
    <div className="bl-page">
      {/* Side Menu */}
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
      />

      {/* Hero Banner Section */}
      <div className="bl-hero">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-7 bl-hero-content">
              <div className="bl-breadcrumb">
                <Link to="/">Home</Link> &gt; <span>Blog</span>
              </div>
              <h1 className="bl-hero-title">All Blogs</h1>
              <div className="bl-title-divider">
                <span className="bl-title-ornament">✦ ❖ ✦</span>
              </div>
              <p className="bl-hero-subtitle">
                Explore insights on spirituality, rituals, astrology, and devotion.
                Read. Learn. Get Inspired.
              </p>
            </div>
            <div className="col-lg-5 d-none d-lg-block"></div>
          </div>
        </div>
      </div>

      {/* Filters and Search Strip */}
      <div className="bl-filters-container">
        <div className="bl-filters-strip">
          <div className="bl-filter-grid">
            {/* Search Input */}
            <div className="bl-search-wrap">
              <input
                type="text"
                placeholder="Search blogs..."
                className="bl-search-input"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <span className="bl-search-icon">
                <i className="fas fa-search"></i>
              </span>
            </div>

            {/* Category Dropdown */}
            <select
              className="bl-select"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
            >
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              className="bl-select"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="Latest">Latest</option>
              <option value="Oldest">Oldest</option>
            </select>

            {/* Clear Filters Button */}
            <button className="bl-clear-btn" onClick={handleClearFilters}>
              <i className="fas fa-filter"></i> Clear Filter
            </button>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="bl-main-section">
        <div className="container">
          {loading ? (
            /* Loading State */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0' }}>
              <div style={{
                width: '50px',
                height: '50px',
                border: '3px solid #fbeee0',
                borderTop: '3px solid var(--bl-maroon)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{ marginTop: '20px', color: 'var(--bl-text-muted)', fontWeight: 600 }}>Loading Celestial Wisdom...</p>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : error ? (
            /* Error State */
            <div className="bl-empty-state">
              <i className="fas fa-exclamation-triangle" style={{ color: '#d9534f' }}></i>
              <h3>Failed to Load Blogs</h3>
              <p>Something went wrong while connecting to the celestial wisdom server. Please try again later.</p>
            </div>
          ) : paginatedBlogs.length > 0 ? (
            <>
              {/* Blogs Card Grid */}
              <div className="bl-grid">
                {paginatedBlogs.map((blog) => {
                  const plainTextDescription = stripHtml(blog.description || blog.content || blog.details);
                  const catId = blog.category_id || blog.category;
                  const blogCategory = CATEGORY_MAP[catId] || (typeof catId === 'string' && catId.length < 20 ? catId : 'Astrology');
                  const imgUrl = fixImgHost(blog.img || blog.image || blog.blog_image || blog.webImage || blog.mobileImage);
                  const blogTitle = blog.title || blog.name || blog.blog_title || "Sacred Insights";
                  const blogDate = blog.Created_date || blog.createdAt || blog.created_at || blog.date;
                  return (
                    <div
                      className="bl-card"
                      key={blog._id || blog.id}
                      onClick={() => navigate(`/blog/${blog._id || blog.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="bl-card-img-wrap">
                        <span className="bl-card-badge">{blogCategory}</span>
                        <img
                          src={imgUrl}
                          alt={blogTitle}
                          className="bl-card-img"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1545128485-c400e7702796?auto=format&fit=crop&q=80&w=600';
                          }}
                        />
                      </div>
                      <div className="bl-card-body">
                        <h3 className="bl-card-title">{blogTitle}</h3>
                        <p className="bl-card-desc">{plainTextDescription}</p>
                        <div className="bl-card-footer">
                          <span className="bl-card-meta">
                            {apiService.formatDate(blogDate)} &bull; {estimateReadTime(plainTextDescription)}
                          </span>
                          <Link
                            to={`/blog/${blog._id || blog.id}`}
                            className="bl-card-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Read More <span>&rarr;</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="bl-pagination">
                  <button
                    className="bl-page-btn"
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    &larr;
                  </button>
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      className={`bl-page-btn ${currentPage === idx + 1 ? 'active' : ''}`}
                      onClick={() => handlePageChange(idx + 1)}
                    >
                      {idx + 1}
                    </button>
                  ))}
                  <button
                    className="bl-page-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    &rarr;
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bl-empty-state">
              <i className="fas fa-folder-open"></i>
              <h3>No Blogs Found</h3>
              <p>We couldn't find any blogs matching your search filters. Try clearing them.</p>
              <button
                className="bl-clear-btn"
                style={{ margin: '15px auto 0' }}
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Newsletter Subscribe Banner */}
          <div className="bl-newsletter-container">
            <div className="bl-newsletter-card">
              <div className="bl-news-left">
                <div className="bl-news-icon-box">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6ZM20 6L12 11L4 6H20ZM20 18H4V8L12 13L20 8V18Z" />
                  </svg>
                </div>
                <div className="bl-news-text">
                  <h3>Subscribe to Our Newsletter</h3>
                  <p>Get spiritual insights, festival updates, and exclusive offers straight to your inbox.</p>
                </div>
              </div>
              <div className="bl-news-right">
                <form className="bl-news-form" onSubmit={handleSubscribeSubmit}>
                  <input
                    type="email"
                    value={newsEmail}
                    onChange={(e) => {
                      setNewsEmail(e.target.value);
                      if (newsMessage) setNewsMessage(null);
                    }}
                    placeholder="Enter your email"
                    className="bl-news-input"
                    style={{ color: '#1a1a1a', backgroundColor: '#ffffff' }}
                    disabled={newsLoading}
                    required
                  />
                  <button type="submit" disabled={newsLoading} className="bl-news-submit">
                    {newsLoading ? 'Subscribing...' : 'Subscribe'}
                  </button>
                </form>
                {newsMessage && (
                  <div
                    style={{
                      marginTop: '8px',
                      fontSize: '13px',
                      color: newsMessage.type === 'success' ? '#15803d' : '#b91c1c',
                      fontWeight: 500,
                    }}
                  >
                    {newsMessage.type === 'success' ? '✓ ' : '⚠ '}
                    {newsMessage.text}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default BlogList;