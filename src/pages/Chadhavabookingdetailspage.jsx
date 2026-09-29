import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import apiService from "../services/apiServices";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import ScrollToTop from "../components/common/ScrollToTop";
import AppDownloadModal from "../components/common/AppDownloadModal";
import SideMenu from "../components/layout/SideMenu";
import PopupSearch from "../components/layout/PopupSearch";
import MobileMenu from "../components/layout/MobileMenu";
import "./ChadhavaBookingDetailsPage.css";

const FAQS = [
  {
    q: "How can I update my delivery address after booking?",
    a: "Reach out to our support team via WhatsApp or email at least 24 hours before the scheduled date to update devotee or delivery details.",
  },
  {
    q: "When will I get the video with my name & gotra?",
    a: "Your personalized sankalp video is usually ready within 24-48 hours after the Chadhava ritual is performed, and a notification will be sent once it's available.",
  },
  {
    q: "When will I get my prasad?",
    a: "If you opted for home delivery, your blessed prasad typically arrives within 8-10 working days after the offering is completed.",
  },
  {
    q: "Can I add more prasad or add-ons after booking?",
    a: "Yes, reach out to our support team with your booking ID and they'll help you add extra prasad or add-ons where possible before the ritual date.",
  },
];

/* ───────────────────────── helpers ───────────────────────── */

// The details API may send the booking as an object, an array, or nested one
// level deeper. Always return a single booking object (or null).
const pickBooking = (res) => {
  if (!res || typeof res !== "object") return null;
  let d =
    res.results ?? res.data ?? res.booking ?? res.result ?? res.record ??
    res.chadhavaBooking ?? res.bookPooja ?? null;
  if (Array.isArray(d)) d = d[0] || null;
  if (d && typeof d === "object" && !d._id) {
    let inner = d.booking ?? d.chadhavaBooking ?? d.bookPooja ?? d.data ?? null;
    if (Array.isArray(inner)) inner = inner[0] || null;
    if (inner && typeof inner === "object") d = inner;
  }
  return d && typeof d === "object" && !Array.isArray(d) ? d : null;
};

// Some backends split one booking into pieces (bookingDetails / paymentDetails …).
// Flatten everything into ONE object so fields are found wherever they live.
const WRAPPER_KEYS = ["results", "data", "result", "record", "booking", "bookings", "chadhavaBooking", "chadhavaBookings", "bookPooja"];
const flattenBooking = (root) => {
  const out = {};
  const walk = (obj, depth) => {
    if (!obj || typeof obj !== "object" || depth > 4) return;
    if (Array.isArray(obj)) {
      if (obj.length && obj[0] && typeof obj[0] === "object" && !Array.isArray(obj[0])) walk(obj[0], depth + 1);
      return;
    }
    const entries = Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== "");
    entries.forEach(([k, v]) => {
      if (WRAPPER_KEYS.includes(k) || k === "status" || k === "message") return;
      if (!(k in out)) out[k] = v;
    });
    entries.forEach(([k, v]) => { if (WRAPPER_KEYS.includes(k)) walk(v, depth + 1); });
    entries.forEach(([k, v]) => {
      if (!WRAPPER_KEYS.includes(k) && v && typeof v === "object" && !Array.isArray(v)) walk(v, depth + 1);
    });
  };
  walk(root, 0);
  return Object.keys(out).length ? out : null;
};

// Merge API data over what we already have without wiping real values.
const mergeBooking = (base, extra) => {
  if (!extra) return base;
  if (!base) return extra;
  const out = { ...base };
  Object.keys(extra).forEach((k) => {
    const v = extra[k];
    if (v === undefined || v === null || v === "") return;
    if (typeof out[k] === "object" && out[k] !== null && typeof v !== "object") return;
    out[k] = v;
  });
  return out;
};

const hasCoreFields = (b) =>
  !!b && !!b.payment_mode &&
  (b.chadhava_amount !== undefined || b.total_amount !== undefined || b.grand_total !== undefined || b.amount !== undefined);

const toDate = (raw) => {
  if (!raw) return null;
  const d = new Date(String(raw).replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
};
const fmtDate = (raw) => {
  const d = toDate(raw);
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", weekday: "long" }) : null;
};
const fmtDateTime = (raw) => {
  const d = toDate(raw);
  return d ? d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : null;
};
const num = (...vals) => {
  for (const v of vals) {
    const n = Number(v);
    if (v !== undefined && v !== null && v !== "" && !Number.isNaN(n)) return n;
  }
  return null;
};
const rupee = (n) =>
  n === null ? "—" : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : "");

// Addon / prasad arrays can hold objects or plain ids — normalise to { name, price, qty }.
const normaliseItems = (arr, label) =>
  (Array.isArray(arr) ? arr : []).map((a, i) => {
    if (a && typeof a === "object") {
      const ref =
        (a.addon_id && typeof a.addon_id === "object" && a.addon_id) ||
        (a.prasad_id && typeof a.prasad_id === "object" && a.prasad_id) || {};
      return {
        name: a.pname || a.name || a.title || ref.pname || ref.name || ref.title || `${label} ${i + 1}`,
        price: num(a.pamount, a.price, a.amount, ref.pamount, ref.price, ref.amount),
        qty: num(a.qty, a.quantity) || 1,
      };
    }
    return { name: `${label} ${i + 1}`, price: null, qty: 1 };
  });

/* ───────── invoice ─────────
   Builds the invoice from the booking data on the page (with the VaidikGuru
   logo) and opens the browser print dialog. From there the user can print
   it, or choose "Save as PDF" to download it. */
// Printable invoice built from page data. Uses a hidden iframe so
// no popup blocker gets in the way; the browser print dialog lets the user
// choose "Save as PDF".
const LOGO_URL = `${window.location.origin}/assets/img/logo1234.jpeg`; // same logo as Header/Footer

const printInvoice = ({ title, invoiceNo, rows, items, total }) => {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(invoiceNo)}</title>
<style>
 body{font-family:Arial,Helvetica,sans-serif;color:#1f1320;margin:32px}
 .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #7B1F3A;padding-bottom:14px;margin-bottom:20px}
 h1{margin:0;color:#7B1F3A;font-size:26px} .muted{color:#777;font-size:12px}
 .brand{display:flex;align-items:center;gap:12px} .brand img{height:70px;width:auto;max-width:260px;object-fit:contain;display:block}
 @media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
 table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
 td,th{padding:8px 6px;border-bottom:1px solid #eee;text-align:left} th{background:#fdf8f2}
 .r{text-align:right} .total td{font-weight:bold;font-size:15px;border-top:2px solid #7B1F3A}
 .foot{margin-top:30px;font-size:11px;color:#888;text-align:center}
</style></head><body>
<div class="top"><div class="brand"><img id="inv-logo" src="${LOGO_URL}" alt="VaidikGuru" onerror="this.style.display='none'"/></div>
<div class="r"><b>INVOICE</b><div class="muted">#${esc(invoiceNo)}</div><div class="muted">${esc(new Date().toLocaleDateString("en-IN"))}</div></div></div>
<h3 style="margin:0 0 6px">${esc(title)}</h3>
<table>${rows.filter(([, v]) => v).map(([k, v]) => `<tr><td class="muted">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table>
<table><tr><th>Item</th><th class="r">Qty</th><th class="r">Amount</th></tr>
${items.map((i) => `<tr><td>${esc(i.name)}</td><td class="r">${esc(i.qty || 1)}</td><td class="r">${i.price == null ? "Included" : "₹" + esc(Number(i.price * (i.qty || 1)).toLocaleString("en-IN"))}</td></tr>`).join("")}
<tr class="total"><td colspan="2">Total Paid</td><td class="r">${total == null ? "—" : "₹" + esc(Number(total).toLocaleString("en-IN"))}</td></tr></table>
<div class="foot">support@vaidikguru.com · +91 8881110520<br/>This is a computer-generated invoice.</div></body></html>`;
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  // Wait for the logo to load before printing, so it appears in the PDF.
  let printed = false;
  const doPrint = () => {
    if (printed) return;
    printed = true;
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => iframe.remove(), 2000);
  };
  const logo = doc.getElementById("inv-logo");
  if (logo && !logo.complete) {
    logo.addEventListener("load", () => setTimeout(doPrint, 100));
    logo.addEventListener("error", doPrint);
    setTimeout(doPrint, 2500); // safety net
  } else {
    setTimeout(doPrint, 300);
  }
};

/* ───────────────────────── page ───────────────────────── */

const ChadhavaBookingDetailsPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!location.state?.booking);
  const [openFaq, setOpenFaq] = useState(null);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchBooking = async () => {
      let bData = location.state?.booking || null;

      // 1) Details API
      try {
        const res = await apiService.getBearer(`/puja/chadhavabookingdetails/${id}`);
        console.info("[ChadhavaDetails] chadhavabookingdetails response:", res);
        bData = mergeBooking(bData, pickBooking(res));
        bData = mergeBooking(bData, flattenBooking(res));
      } catch (err) {
        console.warn("[ChadhavaDetails] details API failed:", err?.response?.status, err?.message);
      }

      // 2) Still missing the basics? Find it in the user's chadhava list.
      if (!hasCoreFields(bData)) {
        try {
          let res = await apiService.postBearer("/puja/mychdhavabookings", {}).catch(() => null);
          if (!res || (!res.status && !res.results && !res.data)) {
            res = await apiService.getBearer("/puja/mychdhavabookings").catch(() => null);
          }
          const raw = res?.results || res?.bookPooja || res?.data || res?.result || res?.chadhavaBookings || res?.record || [];
          const list = Array.isArray(raw) ? raw : [];
          const found = list.find(
            (b) => String(b._id) === String(id) || String(b.chadhava_booking_id) === String(id)
          );
          bData = mergeBooking(bData, found);
          bData = mergeBooking(bData, flattenBooking(found));
        } catch (err) {
          console.warn("[ChadhavaDetails] booking list fallback failed:", err?.message);
        }
      }

      // 3) Confirm payment status for wallet / pending bookings
      if (bData) {
        const isWallet = bData.payment_mode?.toLowerCase() === "wallet";
        if (isWallet || !bData.payment_status || bData.payment_status?.toLowerCase() === "pending") {
          try {
            const statusRes = await apiService.getBearer(`/puja/chadhava_payment_status/${bData._id || id}`);
            if (statusRes?.payment_status === "Success" || statusRes?.status === true || isWallet) {
              bData = { ...bData, payment_status: "Success" };
            }
          } catch {
            if (isWallet) bData = { ...bData, payment_status: "Success" };
          }
        }
      }

      console.info("[ChadhavaDetails] final booking used on page:", bData);
      if (!cancelled) {
        setBooking(bData);
        setLoading(false);
      }
    };

    fetchBooking();
    return () => { cancelled = true; };
  }, [id, location.state]);

  const getStatusClass = (status, mode) => {
    const s = status?.toLowerCase();
    const m = mode?.toLowerCase();
    if (s === "success" || s === "paid" || s === "completed" || m === "wallet") return "success";
    if (s === "pending") return "pending";
    if (s === "failed") return "failed";
    return "default";
  };

  const layoutTop = (
    <>
      <ScrollToTop />
      <SideMenu isOpen={showSideMenu} onClose={() => setShowSideMenu(false)} />
      <PopupSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
      <MobileMenu isOpen={showMobileMenu} onClose={() => setShowMobileMenu(false)} />
      <Header
        onMenuToggle={() => setShowMobileMenu(true)}
        onSideMenuToggle={() => setShowSideMenu(true)}
        onSearchToggle={() => setShowSearch(true)}
      />
    </>
  );

  if (loading) {
    return (
      <div className="main-wrapper bg-light">
        {layoutTop}
        <div className="cbd-loading">
          <div className="spinner-border text-theme" role="status"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="main-wrapper bg-light">
        {layoutTop}
        <div className="cbd-notfound">
          <h3>Booking Not Found</h3>
          <p>We couldn't find this booking. It may have been removed.</p>
          <button className="cbd-primary-btn" onClick={() => navigate("/my-chadhava-booking")}>
            Back to My Bookings
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  /* ───────── derived values (every field has fallbacks) ───────── */
  const b = booking;
  const chObj = b.chadhava_id && typeof b.chadhava_id === "object" ? b.chadhava_id : {};

  const bookingId = b.chadhava_booking_id || b.booking_id || b.order_id || b._id || id;
  const chTitle = chObj.title || b.chadhava_name || b.chadhava_title || b.title || "Chadhava";
  const templeName = chObj.mandirName || chObj.temple_name || chObj.location || b.mandirName || b.temple_name || "";
  const chImage = chObj.chadhavaImage || chObj.image || chObj.banner || b.chadhava_image || "";

  const offerDateRaw = b.chadhava_date || chObj.chadhava_date || chObj.date || b.puja_date || null;
  const bookedOnRaw = b.createdAt || b.created_at;
  const offerDateStr = fmtDate(offerDateRaw);
  const bookedOnStr = fmtDateTime(bookedOnRaw);

  const addons = normaliseItems(b.addons_selected, "Addon");
  const prasads = normaliseItems(b.prasad_selected, "Prasad");

  const chAmount = num(b.chadhava_amount, b.total_chadhava_amount, chObj.price, chObj.chadhavaPrice);
  const itemsTotal = (list) =>
    list.some((a) => a.price !== null) ? list.reduce((s, a) => s + (a.price || 0) * (a.qty || 1), 0) : null;
  const addonsTotal = num(b.addons_amount, b.addon_amount) ?? itemsTotal(addons);
  const prasadTotal = num(b.prasad_amount) ?? itemsTotal(prasads);
  const deliveryCharge = num(b.delivery_charge, b.shipping_charge);
  const discount = num(b.discount, b.coupon_discount);
  const totalAmount =
    num(b.grand_total, b.total_amount, b.final_amount, b.amount) ??
    (chAmount !== null
      ? chAmount + (addonsTotal || 0) + (prasadTotal || 0) + (deliveryCharge || 0) - (discount || 0)
      : null);

  const paymentMode = b.payment_mode || "—";
  const isWalletPayment = b.payment_mode?.toLowerCase() === "wallet";
  const ps = b.payment_status?.toLowerCase();
  const displayStatus =
    isWalletPayment || ps === "success" || ps === "paid" ? "Success" : cap(b.payment_status) || "Pending";
  const statusClass = getStatusClass(displayStatus, b.payment_mode);
  const isSuccess = statusClass === "success";
  const isPending = statusClass === "pending";

  const paymentRef = b.razorpay_payment_id || b.payment_id || b.transaction_id || "";
  const orderRef = b.razorpay_order_id || b.orderId || (b.order_id !== bookingId ? b.order_id : "") || "";

  const user = b.userDetails || {};
  const addr = b.deliveryAddress || {};
  const addressLine = [addr.houseNumber, addr.area, addr.landmark, addr.city, addr.state, addr.pincode]
    .filter(Boolean).join(", ");

  const handleDownloadInvoice = async () => {
    if (downloading) return;
    setDownloading(true);
    {
      printInvoice({
        title: `${chTitle} — Chadhava Offering`,
        invoiceNo: bookingId,
        rows: [
          ["Booking ID", `#${bookingId}`],
          ["Temple", templeName],
          ["Booked On", bookedOnStr],
          ["Offering Date", offerDateStr],
          ["Devotee", user.name],
          ["WhatsApp", user.whatsappNumber],
          ["Payment Mode", cap(paymentMode)],
          ["Payment Status", displayStatus],
          ["Payment Ref", paymentRef],
        ],
        items: [
          { name: chTitle, qty: 1, price: chAmount },
          ...addons,
          ...prasads,
          ...(deliveryCharge ? [{ name: "Delivery Charge", qty: 1, price: deliveryCharge }] : []),
          ...(discount ? [{ name: "Discount", qty: 1, price: -discount }] : []),
        ],
        total: totalAmount,
      });
    }
    setDownloading(false);
  };

  const Row = ({ label, value, strong }) =>
    value || value === 0 ? (
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "9px 0", borderBottom: "1px dashed #f0e6d8", fontSize: 13.5 }}>
        <span style={{ color: "#9a8f88", fontWeight: 600 }}>{label}</span>
        <span style={{ color: "#1f1320", fontWeight: strong ? 900 : 700, textAlign: "right", wordBreak: "break-word" }}>{value}</span>
      </div>
    ) : null;

  return (
    <div className="main-wrapper bg-light">
      {layoutTop}

      <div className="container cbd-wrap">
        <button className="cbd-back" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left"></i> Booking ID #{bookingId}
        </button>

        <div className="row g-4">
          {/* ---------------- MAIN COLUMN ---------------- */}
          <div className="col-lg-8">
            {/* Ritual live banner */}
            <div className="cbd-video-banner">
              <img
                className="cbd-video-thumb"
                src="/assets/img/pooja_fill/pff-devotion.png"
                alt="Ritual video thumbnail"
                onError={(e) => { e.target.style.display = "none"; }}
              />
              <div className="cbd-video-banner-overlay" />

              <button
                type="button"
                className="cbd-video-play-btn"
                onClick={() => setIsAppModalOpen(true)}
                disabled={!isSuccess}
                aria-label="Play ritual video"
              >
                <i className="fas fa-play"></i>
              </button>

              <div className="cbd-video-banner-content">
                <h4>Watch Your Chadhava Ritual</h4>
                <p>
                  {isSuccess
                    ? "Panditji has performed your sankalp with full devotion. Watch the video to see your offering."
                    : isPending
                      ? "Your Chadhava is scheduled. The ritual video will be available once it's completed."
                      : "Video status unavailable for this booking."}
                </p>
                <button
                  className="cbd-watch-btn"
                  onClick={() => setIsAppModalOpen(true)}
                  disabled={!isSuccess}
                >
                  Watch Your Ritual Video <i className="fas fa-play-circle"></i>
                </button>
              </div>
            </div>

            {/* Offering & devotee details */}
            <div className="cbd-card">
              <h5 className="cbd-card-title">Offering and Devotee's Details</h5>

              <div className="cbd-offering-row">
                <div className="cbd-offering-img">
                  {chImage ? <img src={chImage} alt={chTitle} /> : <i className="fas fa-om"></i>}
                </div>
                <div className="cbd-offering-info">
                  <h6 className="cbd-offering-name">{chTitle}</h6>
                  {templeName && (
                    <div style={{ fontSize: 12, color: "#9a8f88", fontWeight: 600, marginBottom: 4 }}>{templeName}</div>
                  )}
                  <div className="cbd-offering-price">{rupee(totalAmount ?? chAmount)}</div>
                </div>
                <div className={`cbd-status ${statusClass}`}>{displayStatus}</div>
              </div>

              <div className="cbd-meta-list">
                <div className="cbd-meta-item">
                  <i className="fas fa-calendar-alt"></i>
                  {offerDateStr ? `Offering on ${offerDateStr}` : bookedOnStr ? `Booked on ${bookedOnStr}` : "Date to be announced"}
                </div>
                {addr.city && (
                  <div className="cbd-meta-item">
                    <i className="fas fa-map-marker-alt"></i> {addr.city}{addr.state ? `, ${addr.state}` : ""}
                  </div>
                )}
                <div className="cbd-meta-item">
                  <i className="fas fa-wallet"></i> Paid via {cap(paymentMode)}
                </div>
                <div className="cbd-meta-item">
                  <i className="fas fa-gift"></i> {addons.length} Addon{addons.length !== 1 ? "s" : ""} • {prasads.length} Prasad
                </div>
              </div>

              {(user.name || user.whatsappNumber) && (
                <div className="cbd-participant">
                  <div>
                    <strong>{user.name || "Devotee"}</strong>
                    <span>
                      {[user.whatsappNumber, user.gotra && `${user.gotra} Gotra`].filter(Boolean).join(" • ") || "Sankalp Devotee"}
                    </span>
                  </div>
                  <i className="fas fa-user"></i>
                </div>
              )}
            </div>

            {/* Booking details */}
            <div className="cbd-card">
              <h5 className="cbd-card-title">Booking Details</h5>
              <Row label="Booking ID" value={`#${bookingId}`} />
              <Row label="Chadhava" value={chTitle} />
              <Row label="Temple" value={templeName} />
              <Row label="Offering Date" value={offerDateStr} />
              <Row label="Booked On" value={bookedOnStr} />
              <Row label="Devotee Name" value={user.name} />
              <Row label="WhatsApp" value={user.whatsappNumber} />
              <Row label="Gotra" value={user.gotra} />
              <Row label="Prasad Delivery" value={b.is_home_delivery_required ? "Yes" : "No"} />
            </div>

            {/* Addons & prasad */}
            {(addons.length > 0 || prasads.length > 0) && (
              <div className="cbd-card">
                <h5 className="cbd-card-title">Addons &amp; Prasad Selected</h5>
                {addons.map((a, i) => (
                  <Row key={`a${i}`} label={`${a.name}${a.qty > 1 ? ` × ${a.qty}` : ""}`}
                    value={a.price !== null ? rupee(a.price * (a.qty || 1)) : "Included"} />
                ))}
                {prasads.map((a, i) => (
                  <Row key={`p${i}`} label={`🪔 ${a.name}${a.qty > 1 ? ` × ${a.qty}` : ""}`}
                    value={a.price !== null ? rupee(a.price * (a.qty || 1)) : "Included"} />
                ))}
              </div>
            )}

            {/* Payment summary */}
            <div className="cbd-card">
              <h5 className="cbd-card-title">Payment Summary</h5>
              <Row label="Chadhava Amount" value={chAmount !== null ? rupee(chAmount) : null} />
              <Row label="Addons" value={addonsTotal ? rupee(addonsTotal) : null} />
              <Row label="Prasad" value={prasadTotal ? rupee(prasadTotal) : null} />
              <Row label="Delivery Charge" value={deliveryCharge ? rupee(deliveryCharge) : null} />
              <Row label="Discount" value={discount ? `- ${rupee(discount)}` : null} />
              <Row label="Total Paid" value={rupee(totalAmount)} strong />
              <Row label="Payment Mode" value={cap(paymentMode)} />
              <Row label="Payment Status" value={displayStatus} />
              <Row label="Order Ref" value={orderRef} />
              <Row label="Payment Ref" value={paymentRef} />
            </div>

            {/* Updates timeline */}
            <div className="cbd-card">
              <h5 className="cbd-card-title">Ritual Video &amp; Updates</h5>
              <div className="cbd-timeline">
                <div className={`cbd-tl-item ${isSuccess ? "done" : ""}`}>
                  <span className="cbd-tl-dot"><i className="fas fa-check"></i></span>
                  <p>{bookedOnStr ? `Booking confirmed on ${bookedOnStr}.` : "Booking confirmed."}</p>
                </div>
                <div className={`cbd-tl-item ${isSuccess ? "done" : ""}`}>
                  <span className="cbd-tl-dot"><i className="fas fa-check"></i></span>
                  <p>Payment {displayStatus.toLowerCase()} via {cap(paymentMode)}.</p>
                </div>
                <div className={`cbd-tl-item ${isSuccess ? "done" : "pending"}`}>
                  <span className="cbd-tl-dot">
                    <i className={`fas ${isSuccess ? "fa-check" : "fa-clock"}`}></i>
                  </span>
                  <p>
                    {offerDateStr
                      ? `Your Chadhava is scheduled for ${offerDateStr}.`
                      : "Your Chadhava date will be shared soon."}
                  </p>
                </div>
                <div className={`cbd-tl-item ${isSuccess ? "done" : "pending"}`}>
                  <span className="cbd-tl-dot">
                    <i className={`fas ${isSuccess ? "fa-check" : "fa-clock"}`}></i>
                  </span>
                  <p>Your personalized name &amp; gotra sankalp video will appear here after the ritual.</p>
                </div>
              </div>

              {isSuccess && chImage && (
                <div className="cbd-gallery">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="cbd-gallery-item">
                      <img src={chImage} alt="Chadhava glimpse" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prasad delivery tracking */}
            {b.is_home_delivery_required && (
              <div className="cbd-card">
                <h5 className="cbd-card-title">Track Your Prasad</h5>
                <div className="cbd-delivery-item">
                  <div className="cbd-delivery-icon">
                    <i className="fas fa-box-open"></i>
                  </div>
                  <div className="cbd-delivery-info">
                    <strong>Blessed Prasad Box</strong>
                    <span>{addressLine || "Address not provided"}</span>
                  </div>
                  <span className="cbd-delivery-status">{isSuccess ? "Dispatched" : "Pending"}</span>
                </div>
              </div>
            )}

            <button className="cbd-invoice-btn" onClick={handleDownloadInvoice}>
              <i className={`fas ${downloading ? "fa-spinner fa-spin" : "fa-file-invoice"}`}></i>
              {downloading ? " Preparing Invoice…" : " Download Invoice"}
            </button>
          </div>

          {/* ---------------- SIDEBAR ---------------- */}
          <div className="col-lg-4">
            <div className="cbd-card cbd-faq-card">
              <h5 className="cbd-card-title">Frequently Asked Questions</h5>
              {FAQS.map((faq, idx) => (
                <div key={idx} className="cbd-faq-item">
                  <button className="cbd-faq-question" onClick={() => setOpenFaq(openFaq === idx ? null : idx)}>
                    {faq.q}
                    <i className={`fas fa-chevron-${openFaq === idx ? "up" : "down"}`}></i>
                  </button>
                  {openFaq === idx && <p className="cbd-faq-answer">{faq.a}</p>}
                </div>
              ))}
            </div>

            <div className="cbd-card cbd-help-card">
              <h5 className="cbd-card-title">Help &amp; Support</h5>

              <div className="cbd-help-row">
                <i className="fas fa-phone-alt"></i>
                <div>
                  <a href="tel:+918881110520" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                    <strong>+91 8881110520</strong>
                  </a>
                  <span>You can call us from 10:30 AM - 7:30 PM</span>
                </div>
              </div>

              <div className="cbd-help-actions">
                <a href="mailto:support@vaidikguru.com" className="cbd-help-btn" style={{ textDecoration: "none" }}>
                  <i className="fas fa-envelope"></i>
                  Email us
                </a>
                <a
                  href="https://wa.me/918881110520"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cbd-help-btn whatsapp"
                  style={{ textDecoration: "none" }}
                >
                  <i className="fab fa-whatsapp"></i>
                  WhatsApp us
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AppDownloadModal
        isOpen={isAppModalOpen}
        onClose={() => setIsAppModalOpen(false)}
        bookingId={b._id || id}
      />

      <Footer />
    </div>
  );
};

export default ChadhavaBookingDetailsPage;