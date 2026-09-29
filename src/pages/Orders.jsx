// src/pages/Orders.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import SideMenu from '../components/layout/SideMenu';
import PopupSearch from '../components/layout/PopupSearch';
import MobileMenu from '../components/layout/MobileMenu';
import apiService from '../services/apiServices';
import storageService from '../services/storageServices';
import { mergeGiftTransactions } from '../services/giftService';
import './Orders.css';

// ---------- date helpers (unchanged) ----------
const formatDateString = (date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const formatTimeString = (date) => {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

const parseAnyDate = (raw) => {
    const rawDate = String(raw || '').trim();
    if (!rawDate) return new Date();
    let dateObj = new Date(rawDate.replace(' ', 'T'));
    if (isNaN(dateObj.getTime())) {
        const m = rawDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{1,2}):(\d{1,2})$/);
        if (m) {
            const [, y, mo, d, h, mi, s] = m;
            dateObj = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
        }
    }
    return isNaN(dateObj.getTime()) ? new Date() : dateObj;
};

// Pull the array out of whatever wrapper the backend used.
const extractList = (res, extraKeys = []) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    const keys = [...extraKeys, 'results', 'data', 'result', 'record', 'records', 'bookings', 'list', 'transactions'];
    for (const k of keys) {
        const v = res[k];
        if (Array.isArray(v)) return v;
        if (v && Array.isArray(v.data)) return v.data;
    }
    // Last resort: first array of objects anywhere in the response (2 levels deep).
    const findArr = (obj, depth) => {
        if (!obj || typeof obj !== 'object' || depth > 2) return null;
        for (const v of Object.values(obj)) {
            if (Array.isArray(v) && v.length && typeof v[0] === 'object') return v;
        }
        for (const v of Object.values(obj)) {
            const found = !Array.isArray(v) && findArr(v, depth + 1);
            if (found) return found;
        }
        return null;
    };
    return findArr(res, 0) || [];
};

// Try the preferred method, then the other one. Stop as soon as the server
// answers successfully (even with an empty list) so we don't fire extra
// failing requests. Every failure is logged with its HTTP status so the
// real cause is visible in the console.
// (apiService already uses baseURL https://admin.vaidikguru.com, so there
// is no need for a separate absolute-URL retry.)
const fetchWithFallback = async (path, { method = 'post', extraKeys = [] } = {}) => {
    const other = method === 'post' ? 'get' : 'post';
    const statuses = [];

    for (const m of [method, other]) {
        try {
            const res = m === 'get'
                ? await apiService.getBearer(path)
                : await apiService.postBearer(path, {});
            const list = extractList(res, extraKeys);
            if (list.length === 0) {
                console.info(`[Orders] ${m.toUpperCase()} ${path} → OK but no list found`, res);
            }
            return { list, authError: false };
        } catch (err) {
            const status = err?.response?.status;
            statuses.push(status);
            console.warn(
                `[Orders] ${m.toUpperCase()} ${path} failed → status ${status ?? 'network/CORS'}`,
                err?.response?.data || err?.message
            );
        }
    }
    const authError = statuses.length > 0 && statuses.every(s => s === 401 || s === 403);
    return { list: [], authError };
};

// Map one row from the /user_api/transaction response into the shape the
// page renders (id, name, duration, type, date/time, status, price, category).
const mapApiTransaction = (t) => {
    const validDate = parseAnyDate(t.transaction_date || t.created_at || t.date || t.createdAt);

    const minutesFloat = parseFloat(t.time || t.duration || t.call_duration || t.minutes);
    const durationSec = !isNaN(minutesFloat) && minutesFloat > 0 ? Math.round(minutesFloat * 60) : 0;
    const duration = durationSec > 0
        ? `${Math.floor(durationSec / 60)}m ${String(durationSec % 60).padStart(2, '0')}s`
        : '-';

    const rawType = (t.call_type || t.type || t.category || t.transaction_type || '').toLowerCase();
    const desc = (t.description || t.title || t.message || '').toLowerCase();
    const amountType = (t.amount_type || '').toLowerCase();
    const astroName = (t.astro_name || t.astrologer_name || t.name || '').trim();
    const giftName = (t.gift_title || t.gift_name || t.gift || '').trim();

    // Gift check FIRST, on strong signals only — so a gift whose description
    // happens to mention "chat"/"call" never lands in the wrong tab.
    const isGift =
        t.is_gift_api ||
        rawType.includes('gift') ||
        String(t.transaction_type || '').toLowerCase().includes('gift') ||
        !!(t.gift_id || t.giftId || t.gift_title || t.gift_name);

    let category;
    if (isGift) {
        category = 'Gift';
    } else if (rawType.includes('video') || desc.includes('video')) {
        category = 'Video';
    } else if (rawType.includes('chat') || desc.includes('chat')) {
        category = 'Chat';
    } else if (rawType.includes('audio') || rawType.includes('call') || desc.includes('call') || desc.includes('audio')) {
        category = 'Call';
    } else if (
        rawType.includes('gift') ||
        desc.includes('gift') ||
        t.gift_id || t.giftId || giftName ||
        (rawType === 'normal' && (astroName || t.to || t.astrologer_id || desc.includes('gift')))
    ) {
        category = 'Gift';
    } else if (
        rawType.includes('puja') ||
        rawType.includes('pooja') ||
        rawType.includes('chadhava') ||
        desc.includes('puja') ||
        desc.includes('pooja') ||
        desc.includes('chadhava') ||
        desc.includes('sankalp')
    ) {
        category = (rawType.includes('chadhava') || desc.includes('chadhava') || desc.includes('chadava'))
            ? 'Chadhava' : 'Puja';
    } else {
        category = 'Wallet';
    }

    let typeLabel;
    if (category === 'Video') typeLabel = 'Video Call';
    else if (category === 'Chat') typeLabel = 'Chat Consultation';
    else if (category === 'Call') typeLabel = 'Audio Call';
    else if (category === 'Gift') typeLabel = `${giftName ? `Gift: ${giftName}` : (t.description || 'Gift Sent to Astrologer')} • Paid from Wallet`;
    else if (category === 'Puja') typeLabel = t.puja_name || t.description || 'Puja Booking';
    else if (category === 'Chadhava') typeLabel = t.description || 'Chadhava Offering';
    else typeLabel = t.description || t.type || 'Wallet Transaction';

    const amount = Number(t.amount || t.price || t.total_amount) || 0;
    const price = amountType === 'credit' ? amount : -amount;

    const daysAgo = Math.floor((Date.now() - validDate.getTime()) / (1000 * 60 * 60 * 24));

    const titleName = (astroName || t.puja_name || '').trim() ||
        (category === 'Wallet' ? (t.description || 'Wallet Recharge') :
         category === 'Gift' ? (giftName ? `Gift: ${giftName}` : (astroName ? `Gift to ${astroName}` : 'Gift to Astrologer')) :
         category === 'Puja' ? (t.description || 'Puja Booking') :
         category === 'Chadhava' ? (t.description || 'Chadhava Offering') : 'VaidikGuru Service');

    return {
        uid: t.id || t.order_id || t.transaction_id || Math.random().toString(),
        id: t.order_id || t.id || t.transaction_id || 'N/A',
        name: titleName,
        verified: category !== 'Wallet',
        duration,
        type: typeLabel,
        date: formatDateString(validDate),
        time: formatTimeString(validDate),
        dateObj: validDate,
        daysAgo,
        status: t.status ? (String(t.status).charAt(0).toUpperCase() + String(t.status).slice(1)) : 'Completed',
        price,
        category,
        durationSec
    };
};

// Map a Puja / Chadhava booking (from /puja/mypujabookings or /puja/mychdhavabookings)
// into the same row shape. These show under the "Puja" / "Chadhava" tabs.
const mapBooking = (b, kind) => {
    const validDate = parseAnyDate(b.createdAt || b.created_at || b.puja_date || b.booking_date);
    const daysAgo = Math.floor((Date.now() - validDate.getTime()) / (1000 * 60 * 60 * 24));

    const payStatus = String(b.payment_status || b.status || '').toLowerCase();
    const payMode = String(b.payment_mode || '').toLowerCase();
    let status;
    if (['success', 'paid', 'completed', 'confirmed'].includes(payStatus) || payMode === 'wallet') status = 'Completed';
    else if (payStatus === 'failed') status = 'Failed';
    else status = 'Pending';

    const amount = Number(
        b.total_amount ?? b.grand_total ?? b.final_amount ?? b.amount ??
        (kind === 'puja' ? b.puja_amount : b.chadhava_amount) ?? 0
    ) || 0;

    const isPuja = kind === 'puja';
    const title = isPuja
        ? (b.puja_id?.title || b.puja_name || b.puja_title || (b.puja_type ? `${b.puja_type} Puja` : 'Puja Booking'))
        : (b.chadhava_id?.title || b.chadhava_name || b.chadhava_title || b.puja_id?.title || 'Chadhava Offering');

    const bookingId = isPuja
        ? (b.puja_booking_id || b.booking_id || b._id)
        : (b.chadhava_booking_id || b.booking_id || b._id);

    return {
        uid: `${kind}_${b._id || bookingId || Math.random().toString()}`,
        id: bookingId || 'N/A',
        name: title,
        verified: true,
        duration: '-',
        type: isPuja ? `Puja Booking${b.payment_mode ? ` • Paid via ${b.payment_mode}` : ''}` : `Chadhava Offering${b.payment_mode ? ` • Paid via ${b.payment_mode}` : ''}`,
        date: formatDateString(validDate),
        time: formatTimeString(validDate),
        dateObj: validDate,
        daysAgo,
        status,
        price: -amount,
        category: isPuja ? 'Puja' : 'Chadhava',
        bookingKind: kind,
        raw: b,
    };
};

const OrdersPage = () => {
    const navigate = useNavigate();

    // Layout states
    const [showSideMenu, setShowSideMenu] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showSearch, setShowSearch] = useState(false);

    // Filters & Pagination states
    const [activeCategory, setActiveCategory] = useState('Call');
    const [dateFilter, setDateFilter] = useState('All Time');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // Call simulation feedback
    const [notification, setNotification] = useState(null);

    // Live transaction data
    const [apiTransactions, setApiTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    const dropdownRef = useRef(null);
    const itemsPerPage = 4;

    // Fetch ALL order history in parallel:
    //   - /user_api/transaction       → Call / Chat / Video / Wallet (+ some puja debits)
    //   - /user_api/gift_transaction  → Gift
    //   - /puja/mypujabookings        → Puja tab
    //   - /puja/mychdhavabookings     → Chadhava tab
    // Each history source is kept separately and shown AS SOON AS it arrives,
    // so a slow/failing puja or gift API never blocks Call/Chat/Video/Wallet.
    const [txList, setTxList] = useState([]);         // /user_api/transaction
    const [giftApiList, setGiftApiList] = useState([]); // /user_api/gift_transaction
    const [bookingRows, setBookingRows] = useState([]); // puja + chadhava
    const [walletBalance, setWalletBalance] = useState(null); // from /user_api/get_profile

    const fetchTransactions = () => {
        setIsLoading(true);
        setLoadError(null);

        // Token may live in localStorage, cookie or sessionStorage (storageService
        // keeps all three). apiService only reads localStorage, so copy it there
        // first — otherwise the request goes out without the Authorization header.
        const token = storageService.getToken();
        if (token && !localStorage.getItem('token')) {
            localStorage.setItem('token', token);
        }

        // 1) Main list — Call / Chat / Video / Wallet. Same call the page used
        //    before (POST with empty body). Controls the loader.
        apiService.postBearer('/user_api/transaction', {})
            .then((res) => {
                const list = extractList(res);
                console.info(`[Orders] /user_api/transaction → ${list.length} rows`);
                setTxList(list);
            })
            .catch((err) => {
                console.warn('[Orders] /user_api/transaction failed → status',
                    err?.response?.status ?? 'network/CORS', err?.response?.data || err?.message);
                setLoadError('Could not load your transactions. Please try again.');
            })
            .finally(() => setIsLoading(false));

        // 2) Gifts — GET ONLY. (POST /user_api/gift_transaction is the SEND-gift
        //    API, so it must never be used as a history fallback.)
        apiService.getBearer('/user_api/gift_transaction')
            .then((res) => {
                const list = extractList(res, ['gifts', 'gift_transactions', 'giftTransactions', 'history']);
                console.info(`[Orders] GET /user_api/gift_transaction → ${list.length} rows`, res);
                setGiftApiList(list.map((g, idx) => ({
                    ...g,
                    id: g.id || g._id || g.order_id || g.transaction_id || `gift_api_${idx}_${g.gift_id || ''}`,
                    is_gift_api: true,
                    category: 'Gift',
                    type: 'gift',
                    transaction_type: 'gift',
                    // common field names for gift title / astrologer
                    gift_title: g.gift_title || g.gift_name || g.title || g.giftId?.title || g.gift_id?.title || g.gift?.title || '',
                    astro_name: g.astro_name || g.astrologer_name || g.to_name || g.to?.name || g.astrologer_id?.name || g.astrologer?.name || '',
                    amount: g.amount ?? g.price ?? g.gift_price ?? g.giftId?.price ?? g.gift_id?.price ?? 0,
                    amount_type: g.amount_type || 'debit',
                    transaction_date: g.transaction_date || g.created_at || g.createdAt || g.date,
                })));
            })
            .catch((err) => {
                console.warn('[Orders] GET /user_api/gift_transaction failed → status',
                    err?.response?.status ?? 'network/CORS', err?.response?.data || err?.message);
            });

        // 4) Current wallet balance (shown on the Wallet / Gift / Puja / Chadhava tabs)
        apiService.getBearer('/user_api/get_profile')
            .then((res) => {
                const r = res?.results || res?.data || {};
                const raw = r.wallet ?? r.wallet_amount ?? r.wallet_balance ?? r.balance
                    ?? res?.results_web?.wallet ?? res?.wallet ?? null;
                const n = Number(raw);
                if (raw !== null && !Number.isNaN(n)) setWalletBalance(n);
            })
            .catch(() => {});

        // 3) Puja + Chadhava bookings — their own tabs
        Promise.all([
            fetchWithFallback('/puja/mypujabookings', { method: 'post', extraKeys: ['bookPooja'] }),
            fetchWithFallback('/puja/mychdhavabookings', { method: 'post', extraKeys: ['chadhavaBookings', 'bookPooja'] }),
        ]).then(([puja, chadhava]) => setBookingRows([
            ...puja.list.map(b => mapBooking(b, 'puja')),
            ...chadhava.list.map(b => mapBooking(b, 'chadhava')),
        ]));
    };

    // Combine all sources whenever any of them changes.
    useEffect(() => {
        let mapped = mergeGiftTransactions([...txList, ...giftApiList]).map(mapApiTransaction);
        // Booking APIs are the source of truth for Puja / Chadhava — drop the
        // wallet-debit copies of the same booking so nothing shows twice.
        if (bookingRows.some(r => r.category === 'Puja')) {
            mapped = mapped.filter(item => item.category !== 'Puja');
        }
        if (bookingRows.some(r => r.category === 'Chadhava')) {
            mapped = mapped.filter(item => item.category !== 'Chadhava');
        }
        setApiTransactions([...mapped, ...bookingRows].sort((a, b) => b.dateObj - a.dateObj));
    }, [txList, giftApiList, bookingRows]);

    // If the current tab is empty once data arrives, jump to the first tab that has data.
    useEffect(() => {
        if (apiTransactions.length === 0) return;
        if (apiTransactions.some(item => item.category === activeCategory)) return;
        const firstWithData = ['Call', 'Chat', 'Video', 'Puja', 'Chadhava', 'Gift'].find(catKey =>
            apiTransactions.some(item => item.category === catKey)
        );
        if (firstWithData) setActiveCategory(firstWithData);
        // only on data change, not when the user clicks a tab
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiTransactions]);

    useEffect(() => {
        fetchTransactions();

        const handleGiftAdded = () => {
            fetchTransactions();
        };

        window.addEventListener('giftTransactionAdded', handleGiftAdded);
        return () => {
            window.removeEventListener('giftTransactionAdded', handleGiftAdded);
        };
    }, []);

    // All data now comes straight from the API — no mock/hardcoded rows.
    const allData = apiTransactions;

    // Close date dropdown clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeCategory, dateFilter]);

    // Handle toast notification auto-hide
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Categories definition
    const categories = [
        { key: 'Call', label: 'Call', icon: 'fas fa-phone-alt' },
        { key: 'Chat', label: 'Chat', icon: 'fas fa-comment-alt' },
        { key: 'Video', label: 'Video', icon: 'fas fa-video' },
        { key: 'Puja', label: 'Puja', icon: 'fas fa-om' },
        { key: 'Chadhava', label: 'Chadhava', icon: 'fas fa-hands' },
        { key: 'Gift', label: 'Gift', icon: 'fas fa-gift' }
    ];

    // Filter transaction logic
    const getFilteredTransactions = () => {
        const items = allData.filter(item => item.category === activeCategory);

        return items.filter(item => {
            if (dateFilter === 'Last 7 Days') {
                return item.daysAgo <= 7;
            } else if (dateFilter === 'Last 30 Days') {
                return item.daysAgo <= 30;
            } else if (dateFilter === 'This Month') {
                const today = new Date();
                return item.dateObj.getMonth() === today.getMonth() && item.dateObj.getFullYear() === today.getFullYear();
            }
            return true; // All Time
        });
    };

    const filteredList = getFilteredTransactions();

    // Stats calculations
    const calculateStats = () => {
        const totalOrders = filteredList.length;

        const totalSpent = filteredList.reduce((sum, item) => {
            if (item.price < 0) {
                return sum + Math.abs(item.price);
            }
            return sum;
        }, 0);

        const completedCount = filteredList.filter(item => item.status === 'Completed' || item.status === 'Confirmed').length;
        const completionRate = totalOrders > 0 ? Math.round((completedCount / totalOrders) * 100) : 0;

        const totalSec = filteredList.reduce((sum, item) => sum + (item.durationSec || 0), 0);
        const totalMinutes = Math.round(totalSec / 60);

        const hrs = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        const durationString = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

        return {
            totalOrders,
            totalSpent,
            completedCount,
            completionRate,
            durationString
        };
    };

    const stats = calculateStats();
    const showDuration = ['Call', 'Chat', 'Video'].includes(activeCategory);

    // Pagination slice
    const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filteredList.slice(startIndex, startIndex + itemsPerPage);

    // Call/Chat again handler
    const handleAction = (item) => {
        // Puja / Chadhava bookings open their own details page
        if (item.bookingKind === 'puja' && item.raw?._id) {
            navigate(`/my-puja-booking/${item.raw._id}`, { state: { booking: item.raw } });
            return;
        }
        if (item.bookingKind === 'chadhava' && item.raw?._id) {
            navigate(`/my-chadhava-booking/${item.raw._id}`, { state: { booking: item.raw } });
            return;
        }

        if (activeCategory === 'Call') {
            setNotification({
                type: 'Call',
                message: `Initiating Call back to ${item.name}... Please wait.`
            });
            setTimeout(() => {
                navigate(`/astrologer`);
            }, 2500);
        } else if (activeCategory === 'Chat') {
            setNotification({
                type: 'Chat',
                message: `Opening chat box with ${item.name}...`
            });
            setTimeout(() => {
                navigate(`/astrologer`);
            }, 2000);
        } else if (activeCategory === 'Wallet') {
            navigate('/recharge-now');
        } else {
            navigate('/astrologer');
        }
    };

    // Helper for category-specific circular icon
    const getCategoryIcon = (category) => {
        switch (category) {
            case 'Call': return 'fas fa-phone-alt';
            case 'Chat': return 'fas fa-comment-alt';
            case 'Video': return 'fas fa-video';
            case 'Wallet': return 'fas fa-wallet';
            case 'Puja': return 'fas fa-om';
            case 'Chadhava': return 'fas fa-hands';
            case 'Gift': return 'fas fa-gift';
            default: return 'fas fa-receipt';
        }
    };

    // Helper for action button label
    const getActionBtnLabel = (category, item) => {
        if (item?.bookingKind) return 'View Details';
        switch (category) {
            case 'Call': return 'Call Again';
            case 'Chat': return 'Chat Again';
            case 'Video': return 'Video Again';
            case 'Wallet': return 'Recharge';
            case 'Puja': return 'Book Again';
            case 'Chadhava': return 'Offer Again';
            case 'Gift': return 'Send Gift';
            default: return 'View';
        }
    };

    return (
        <div className="dq-page orders-page">
            {/* Sidemenu */}
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

            {/* Toast Notification Simulation */}
            {notification && (
                <div style={{
                    position: 'fixed',
                    bottom: '30px',
                    right: '30px',
                    zIndex: 9999,
                    backgroundColor: '#7a0c0c',
                    color: '#ffffff',
                    padding: '16px 24px',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(122, 12, 12, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    animation: 'slideUp 0.3s ease-out',
                    border: '1px solid #f9ebe3'
                }}>
                    <i className="fas fa-spinner fa-spin" style={{ color: '#fff' }}></i>
                    <span style={{ fontWeight: '500', fontSize: '14px' }}>{notification.message}</span>
                </div>
            )}

            <div className="orders-container">
                {/* Breadcrumbs */}
                <div className="orders-breadcrumbs">
                    <Link to="/">Home</Link>
                    <span>&gt;</span>
                    <span className="active-crumb">Orders</span>
                </div>

                {/* Page Header Card */}
                <div className="orders-header">
                    <div className="orders-header-left">
                        <h1>Orders & Transactions</h1>
                        <p>View all your activities, purchases, and wallet usage.</p>
                    </div>

                    {/* Wallet balance — shown in the header, in front of the banner image */}
                    <div
                        onClick={() => navigate('/recharge-now')}
                        title="Recharge wallet"
                        style={{
                            position: 'relative',
                            zIndex: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            background: '#ffffff',
                            border: '1px solid #f3dcd0',
                            borderRadius: '16px',
                            padding: '14px 20px',
                            boxShadow: '0 8px 24px rgba(122, 12, 12, 0.08)',
                            cursor: 'pointer',
                            marginLeft: 'auto',
                            marginRight: '24px',
                            flexShrink: 0,
                        }}
                    >
                        <div style={{
                            width: '46px', height: '46px', borderRadius: '50%',
                            background: '#fdecea', color: '#7a0c0c',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                        }}>
                            <i className="fas fa-wallet"></i>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                            <span style={{ fontSize: '13px', color: '#777' }}>Wallet Balance</span>
                            <span style={{ fontSize: '22px', fontWeight: 700, color: '#2b2b2b' }}>
                                {walletBalance === null ? '—' : `₹ ${walletBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
                            </span>
                            <span style={{ fontSize: '12px', color: '#7a0c0c', fontWeight: 600 }}>
                                <i className="fas fa-plus-circle"></i> Recharge
                            </span>
                        </div>
                    </div>
                    <div className="orders-header-right">
                        <img
                            src="/assets/img/images/profile-hero-banner.png"
                            alt="Temples Background"
                            className="orders-header-bg-img"
                        />
                    </div>
                </div>

                {/* Filters & Control Bar */}
                <div className="orders-controls-bar">
                    <div className="orders-category-filters">
                        {categories.map((cat) => (
                            <button
                                key={cat.key}
                                className={`filter-btn ${activeCategory === cat.key ? 'active' : ''}`}
                                onClick={() => setActiveCategory(cat.key)}
                            >
                                <i className={cat.icon}></i>
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    <div className="orders-date-selector" ref={dropdownRef}>
                        <button
                            className="date-dropdown-btn"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <i className="far fa-calendar-alt"></i>
                            <span>{dateFilter}</span>
                            <i className="fas fa-chevron-down"></i>
                        </button>

                        {isDropdownOpen && (
                            <div className="date-dropdown-menu">
                                {['All Time', 'Last 7 Days', 'Last 30 Days', 'This Month'].map((option) => (
                                    <div
                                        key={option}
                                        className={`date-dropdown-item ${dateFilter === option ? 'active' : ''}`}
                                        onClick={() => {
                                            setDateFilter(option);
                                            setIsDropdownOpen(false);
                                        }}
                                    >
                                        {option}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats Grid */}
                <div
                    className="orders-stats-grid"
                    style={showDuration ? undefined : { gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
                >
                    <div className="stat-card stat-orders">
                        <div className="stat-icon-wrapper">
                            <i className="fas fa-shopping-bag"></i>
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">
                                {activeCategory === 'Wallet' ? 'Total Transactions' : 'Total Orders'}
                            </span>
                            <span className="stat-value">{stats.totalOrders}</span>
                            <span className="stat-sub">{dateFilter}</span>
                        </div>
                    </div>

                    <div className="stat-card stat-spent">
                        <div className="stat-icon-wrapper">
                            <i className="fas fa-rupee-sign"></i>
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">
                                {activeCategory === 'Gift' ? 'Total Gift Amount'
                                    : activeCategory === 'Puja' ? 'Total Puja Amount'
                                    : activeCategory === 'Chadhava' ? 'Total Chadhava Amount'
                                    : 'Total Spent'}
                            </span>
                            <span className="stat-value">₹ {stats.totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                            <span className="stat-sub">{dateFilter}</span>
                        </div>
                    </div>

                    <div className="stat-card stat-completed">
                        <div className="stat-icon-wrapper">
                            <i className="fas fa-clipboard-check"></i>
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">Completed</span>
                            <span className="stat-value">{stats.completedCount}</span>
                            <span className="stat-sub">{stats.completionRate}% of Total</span>
                        </div>
                    </div>

                    {/* Duration only makes sense for Call / Chat / Video */}
                    {showDuration && (
                        <div className="stat-card stat-duration">
                            <div className="stat-icon-wrapper">
                                <i className="fas fa-clock"></i>
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">Total Duration</span>
                                <span className="stat-value">{stats.durationString}</span>
                                <span className="stat-sub">Across all orders</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Transactions List */}
                <div className="orders-list-card">
                    {isLoading ? (
                        <div className="orders-empty-state">
                            <i className="fas fa-spinner fa-spin"></i>
                            <h3>Loading transactions...</h3>
                            <p>Fetching your latest activity.</p>
                        </div>
                    ) : loadError ? (
                        <div className="orders-empty-state">
                            <i className="fas fa-exclamation-circle"></i>
                            <h3>Something went wrong</h3>
                            <p>{loadError}</p>
                        </div>
                    ) : paginatedItems.length === 0 ? (
                        <div className="orders-empty-state">
                            <i className="fas fa-receipt"></i>
                            <h3>No orders yet</h3>
                            <p>Try changing the date filter or category.</p>
                        </div>
                    ) : (
                        paginatedItems.map((item) => (
                            <div key={item.uid || item.id} className="order-item-row">
                                <div className="order-item-left">
                                    <div className="order-category-icon">
                                        <i className={getCategoryIcon(activeCategory)}></i>
                                    </div>
                                    <div className="order-details">
                                        <div className="order-meta">
                                            <span>Order ID: #{item.id}</span>
                                            {item.duration && item.duration !== '-' && (
                                                <>
                                                    <span>•</span>
                                                    <span>{item.duration}</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="order-name-container">
                                            <h3 className="order-title">{item.name}</h3>
                                            {item.verified && (
                                                <i className="fas fa-check-circle verified-icon"></i>
                                            )}
                                        </div>
                                        <p className="order-subtitle">{item.type}</p>
                                    </div>
                                </div>

                                <div className="order-date-col">
                                    <i className="far fa-calendar-alt"></i>
                                    <div className="order-datetime">
                                        <span>{item.date}</span>
                                        <span className="order-time">{item.time}</span>
                                    </div>
                                </div>

                                <div className="order-status-col">
                                    <span className={`status-badge ${item.status.toLowerCase()}`}>
                                        {item.status}
                                    </span>
                                </div>

                                <div className="order-right-col">
                                    <span className={`order-price ${item.price < 0 ? 'negative' : item.price > 0 ? 'positive' : ''}`}>
                                        {item.price < 0 ? `- ₹${Math.abs(item.price).toFixed(2).replace(/\.00$/, '')}` : item.price > 0 ? `+ ₹${item.price.toFixed(2).replace(/\.00$/, '')}` : '₹0'}
                                    </span>
                                    {(item.status !== 'Failed' || item.bookingKind) && (
                                        <button
                                            className="order-action-btn"
                                            onClick={() => handleAction(item)}
                                        >
                                            {activeCategory === 'Call' && <i className="fas fa-phone-alt"></i>}
                                            {activeCategory === 'Chat' && <i className="fas fa-comment-alt"></i>}
                                            {activeCategory === 'Gift' && <i className="fas fa-gift"></i>}
                                            {getActionBtnLabel(activeCategory, item)}
                                        </button>
                                    )}
                                    <i className="fas fa-chevron-right chevron-arrow" onClick={() => handleAction(item)}></i>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination bar */}
                {filteredList.length > 0 && (
                    <div className="orders-pagination-bar">
                        <div className="pagination-info">
                            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredList.length)} of {filteredList.length} orders
                        </div>
                        <div className="pagination-controls">
                            <button
                                className="page-btn"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                <i className="fas fa-chevron-left"></i>
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    className={`page-btn ${currentPage === page ? 'active' : ''}`}
                                    onClick={() => setCurrentPage(page)}
                                >
                                    {page}
                                </button>
                            ))}

                            <button
                                className="page-btn"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                            >
                                <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <Footer />
        </div>
    );
};

export default OrdersPage;