import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import apiService from "../../services/apiServices";
import storageService from "../../services/storageServices";
import { mergeGiftTransactions } from "../../services/giftService";
import { useStorage } from "../../context/StorageContext";
import Header from "../layout/Header";
import Footer from "../layout/Footer";
import ScrollToTop from "./ScrollToTop";

import "./Walletpage.css";

const formatMoney = (val) => {
    const num = Number(val) || 0;
    if (Number.isInteger(num)) {
        return num.toLocaleString('en-IN');
    }
    const rounded = Math.round(num * 100) / 100;
    return Number.isInteger(rounded) ? rounded.toLocaleString('en-IN') : rounded.toFixed(2);
};

// Simple inline transaction row — replace with a shared component later if you have one
function TransactionItem({ data }) {
    const isCredit = data.type === "credit";
    return (
        <div className="wallet-transaction-item">
            <div className="wallet-transaction-item__left">
                <span
                    className={`wallet-transaction-item__badge ${isCredit ? "wallet-transaction-item__badge--credit" : "wallet-transaction-item__badge--debit"
                        }`}
                >
                    {isCredit ? "↓" : "↑"}
                </span>
                <div>
                    <p className="wallet-transaction-item__message">{data.message}</p>
                    <p className="wallet-transaction-item__date">{data.date}</p>
                </div>
            </div>
            <p
                className={`wallet-transaction-item__amount ${isCredit ? "wallet-transaction-item__amount--credit" : "wallet-transaction-item__amount--debit"
                    }`}
            >
                {isCredit ? "+" : "-"}₹{formatMoney(data.amount)}
            </p>
        </div>
    );
}

// Extract list from various API response shapes
const extractList = (res, extraKeys = []) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    const keys = [
        ...extraKeys,
        'results_web', 'results', 'data', 'result', 'record', 'records',
        'bookings', 'list', 'transactions', 'history', 'recharges', 'payments',
        'wallet_history', 'recharge_history'
    ];
    for (const k of keys) {
        const v = res[k];
        if (Array.isArray(v)) return v;
        if (v && Array.isArray(v.data)) return v.data;
    }
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

/* ── Wallet credit detection ──
   Detects both Admin credits and Razorpay recharges regardless of format variations. */
const RECHARGE_KEYWORDS = [
    'admin', 'bank', 'recharge', 'wallet', 'topup', 'top_up', 'razorpay', 
    'online', 'payment', 'upi', 'card', 'netbanking', 'credit', 'add_money', 
    'deposit', 'cashback', 'bonus', 'refund', 'user_recharge', 'razorpay_recharge', 
    'razor_pay', 'razorpay_payment', 'online_recharge', 'gateway', 'pg', 'self', 
    'user', 'added', 'pay_in', 'payin', 'rzp'
];

const isWalletCredit = (t) => {
    if (!t || typeof t !== 'object') return false;

    const amountType = String(
        t.amount_type || t.transaction_type || t.type_amount || t.payment_type || t.tx_type || ''
    ).toLowerCase().trim();

    const type = String(
        t.type || t.category || t.payment_mode || t.payment_method || t.mode || t.trx_type || t.wallet_type || t.source || t.call_type || ''
    ).toLowerCase().trim();

    const desc = String(
        t.description || t.title || t.message || t.remark || t.note || t.details || ''
    ).toLowerCase().trim();

    // Check if explicitly debit without any razorpay/recharge indicators
    const isExplicitDebit = ['debit', 'dr', 'minus', 'deduction', 'spent', 'withdraw'].includes(amountType) &&
        !type.includes('razorpay') && !desc.includes('razorpay') && !t.razorpay_payment_id && !t.razorpay_order_id;

    if (isExplicitDebit) return false;

    const isCreditAmountType = ['credit', 'cr', 'add', 'plus', 'addition', 'topup', 'recharge'].includes(amountType);
    const isRechargeType = RECHARGE_KEYWORDS.some(kw => type.includes(kw));
    const hasRazorpayId = !!(
        t.razorpay_payment_id || 
        t.payment_id || 
        t.razorpay_order_id || 
        t.payment_id_rzp || 
        t.rzp_payment_id || 
        t.razorpay_id ||
        (t.order_id && String(t.order_id).toLowerCase().includes('rzp'))
    );
    const matchesDesc = /recharge|top ?up|add(ed)? money|razorpay|wallet (credit|topup|load)|money added|cashback|refund|credit|payment receive|online/i.test(desc);
    const isRechargeApi = t.is_recharge_api === true;

    return isCreditAmountType || isRechargeType || hasRazorpayId || matchesDesc || isRechargeApi;
};



const mapWalletTransaction = (t) => {
    const rawType = String(t.type || t.category || t.payment_mode || t.payment_method || '').toLowerCase();
    const desc = String(t.description || t.title || t.message || t.remark || '').trim();
    const astroName = String(t.astro_name || t.astrologer_name || '').trim();
    const pujaName = String(t.puja_name || '').trim();

    const isCredit = t.is_recharge_api || isWalletCredit(t);
    const via = String(t.payment_mode || t.payment_method || t.type || '').toLowerCase();
    const isRazorpay = via.includes('razorpay') || ['online', 'upi', 'card', 'payment', 'netbanking'].includes(via) ||
        !!(t.razorpay_payment_id || t.razorpay_order_id) || desc.toLowerCase().includes('razorpay');
    const isAdmin = rawType === 'admin' || via === 'admin' || t.by === 'admin' || desc.toLowerCase().includes('admin');

    let message = desc;
    if (isCredit && (!message || /^(razorpay|online|payment|upi|credit|recharge|wallet|admin|topup)$/i.test(message))) {
        message = isAdmin ? 'Added by VaidikGuru'
            : isRazorpay ? 'Wallet Recharge • Razorpay'
            : 'Wallet Recharge';
    }
    if (!message) {
        if (rawType.includes('gift') || desc.toLowerCase().includes('gift')) {
            message = astroName ? `Gift sent to ${astroName}` : 'Gift Transaction';
        } else if (rawType.includes('puja') || rawType.includes('pooja') || rawType.includes('chadhava') || desc.toLowerCase().includes('puja') || desc.toLowerCase().includes('chadhava')) {
            message = pujaName ? `Puja Booking: ${pujaName}` : 'Puja / Sacred Offering Booking';
        } else if (rawType.includes('chat')) {
            message = astroName ? `Chat Consultation with ${astroName}` : 'Chat Consultation';
        } else if (rawType.includes('audio') || rawType.includes('call')) {
            message = astroName ? `Call Consultation with ${astroName}` : 'Audio Call Consultation';
        } else if (rawType.includes('video')) {
            message = astroName ? `Video Consultation with ${astroName}` : 'Video Call Consultation';
        } else {
            message = isCredit ? (isRazorpay ? "Wallet Recharge • Razorpay" : "Wallet Recharge") : "Wallet Transaction";
        }
    }

    const rawDate = String(t.transaction_date || t.created_at || t.createdAt || t.date || '').trim();
    let dateStr = "Recent";
    if (rawDate) {
        const isoish = rawDate.replace(' ', 'T');
        const d = new Date(isoish);
        if (!isNaN(d.getTime())) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const dateFormatted = `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
            let hours = d.getHours();
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            const timeFormatted = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
            dateStr = `${dateFormatted}, ${timeFormatted}`;
        } else {
            dateStr = rawDate;
        }
    }

    return {
        id: t.id || t._id || t.razorpay_payment_id || t.order_id || t.transaction_id || Math.random().toString(),
        type: isCredit ? "credit" : "debit",
        amount: Math.abs(Number(t.amount ?? t.recharge_amount ?? t.paid_amount ?? t.total_amount) || 0),
        sortTime: (() => { const d = new Date(rawDate.replace(' ', 'T')); return isNaN(d.getTime()) ? 0 : d.getTime(); })(),
        message: message,
        date: dateStr,
    };
};

// Helper to safely extract wallet balance from API response or storage user object
const extractWalletAmount = (res, userObj) => {
    if (res && (res.status === true || res.status === 'true' || res.status === 1)) {
        const data = res.results_web || res.results || res.record || res.data || res;
        const targetObj = Array.isArray(data) ? data[0] : data;
        const val = targetObj?.wallet ?? targetObj?.wallet_amount ?? targetObj?.wallet_balance ?? targetObj?.balance ?? res.wallet ?? res.wallet_amount;
        if (val !== undefined && val !== null) {
            return Number(val) || 0;
        }
    }
    if (userObj) {
        const val = userObj.wallet ?? userObj.wallet_amount ?? userObj.wallet_balance ?? userObj.balance;
        if (val !== undefined && val !== null) {
            return Number(val) || 0;
        }
    }
    return 0;
};

export default function WalletPage() {
    const [loading, setLoading] = useState(true);
    const [wallet, setWallet] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { user, refreshProfile } = useStorage() || {};

    // ─── Fetch Wallet + Logs ───
    const getWalletData = async () => {
        try {
            setLoading(true);
            setError(null);

            // apiService reads token from localStorage; ensure token exists
            try {
                const tk = storageService.getToken?.();
                if (tk && !localStorage.getItem('token')) localStorage.setItem('token', tk);
            } catch (_) { }

            let profileRes = await apiService.getBearer("/user_api/get_profile").catch(() => null);
            let txnRes = await apiService.postBearer("/user_api/transaction", {}).catch(() => null);
            if (!txnRes) {
                txnRes = await apiService.getBearer("/user_api/transaction").catch(() => null);
            }

            const bal = extractWalletAmount(profileRes, user);
            setWallet(bal);

            let apiList = extractList(txnRes);
            const merged = mergeGiftTransactions(apiList);

            // Show wallet top-ups: Razorpay recharges, admin credits, refunds, cashback.
            const fromTxn = merged.filter((t) => {
                const type = String(t.type || t.category || '').toLowerCase();
                if (type.includes('gift')) return false;
                return isWalletCredit(t);
            });

            console.info(`[Wallet] recharge rows: ${fromTxn.length} from /transaction`);
            const rows = fromTxn.map(mapWalletTransaction).sort((a, b) => b.sortTime - a.sortTime);
            setTransactions(rows);
        } catch (e) {
            console.error("Wallet data fetch error:", e);
            setError("Unable to load your wallet balance right now.");
        } finally { 
            setLoading(false);
        }
    };

    useEffect(() => {
        if (refreshProfile) refreshProfile();
        getWalletData();
    }, []);

    return (
        <div className="wallet-page">
            <ScrollToTop />
            <Header />

            <div className="wallet-page__content">
                {/* Page header / breadcrumb */}
                <div className="wallet-header">
                    {/* Decorative hanging diya — scoped to header only */}
                    <div className="wallet-diya-hang">
                        <div className="wallet-diya-string"></div>

                        <img
                            src="/assets/img/wallet/diya_wallet.png"
                            alt=""
                            aria-hidden="true"
                            className="wallet-diya-decor"
                        />
                    </div>

                    <div className="wallet-container wallet-header__inner">
                        <p className="wallet-breadcrumb">
                            <span onClick={() => navigate("/")}>Home</span>
                            <span className="wallet-breadcrumb__sep">›</span>
                            <span className="wallet-breadcrumb__current">Wallet</span>
                        </p>
                        <h1 className="wallet-title">
                            Vaidik<span className="wallet-title__accent">Guru</span> Wallet
                        </h1>
                        <p className="wallet-subtitle">
                            Manage your wallet balance and transactions.
                        </p>
                    </div>
                </div>

                <div className="wallet-container wallet-body">
                    {/* Wallet Balance Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="wallet-balance-card"
                    >
                        {/* Fixed-width crop of the banner art — only ever shows the
                right-side mandala pattern, never the icon on its left edge,
                no matter how wide the card is */}
                        <img
                            src="/assets/img/wallet/walletbanner.png"
                            alt=""
                            aria-hidden="true"
                            className="wallet-balance-card__pattern"
                        />

                        <div className="wallet-balance-card__row">
                            {/* Wallet icon drawn as SVG — reliably positioned, doesn't
                  depend on where the icon happens to fall inside the
                  background image at different screen widths */}
                            <div className="wallet-icon-badge">
                                <svg viewBox="0 0 100 100" width="100%" height="100%">
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="46"
                                        fill="none"
                                        stroke="#f4c15d"
                                        strokeWidth="1.5"
                                    />
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        fill="none"
                                        stroke="#f4c15d"
                                        strokeWidth="1"
                                        strokeDasharray="2 3"
                                    />
                                    <rect
                                        x="24"
                                        y="42"
                                        width="46"
                                        height="32"
                                        rx="6"
                                        fill="#f4c15d"
                                    />
                                    <rect
                                        x="24"
                                        y="42"
                                        width="46"
                                        height="32"
                                        rx="6"
                                        fill="none"
                                        stroke="#7a1f3d"
                                        strokeWidth="1.5"
                                        strokeDasharray="3 2"
                                    />
                                    <rect
                                        x="56"
                                        y="54"
                                        width="12"
                                        height="9"
                                        rx="2"
                                        fill="#7a1f3d"
                                    />
                                    <circle cx="60" cy="58" r="1.5" fill="#f4c15d" />
                                    <circle
                                        cx="50"
                                        cy="34"
                                        r="14"
                                        fill="#f4c15d"
                                        stroke="#7a1f3d"
                                        strokeWidth="1.5"
                                    />
                                    <text
                                        x="50"
                                        y="39"
                                        textAnchor="middle"
                                        fontSize="15"
                                        fontWeight="700"
                                        fill="#7a1f3d"
                                    >
                                        ₹
                                    </text>
                                </svg>
                            </div>

                            <div className="wallet-balance-card__text">
                                <p className="wallet-balance-label">Available Balance</p>
                                <h2 className="wallet-balance-amount">
                                    {loading ? (
                                        <span className="wallet-balance-loading">Loading...</span>
                                    ) : (
                                        <>₹ {formatMoney(wallet)}</>
                                    )}
                                </h2>
                                {error && (
                                    <p className="wallet-balance-error">{error}</p>
                                )}

                                <button
                                    className="wallet-recharge-btn"
                                    onClick={() => navigate("/recharge-now")}
                                >
                                    <span>✦</span> Recharge Now <span>→</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Transactions */}
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
                        className="wallet-transactions-card"
                    >
                        <h3 className="wallet-transactions-title">Recent Transactions</h3>

                        {loading ? (
                            <p className="wallet-transactions-empty">Loading...</p>
                        ) : transactions.length === 0 ? (
                            <p className="wallet-transactions-empty">No transactions yet</p>
                        ) : (
                            <div className="wallet-transactions-list">
                                {transactions.map((t) => (
                                    <TransactionItem key={t.id} data={t} />
                                ))}
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>

            <Footer />
        </div>
    );
}