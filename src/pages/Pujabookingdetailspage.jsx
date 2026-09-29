import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import apiService from "../services/apiServices";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import ScrollToTop from "../components/common/ScrollToTop";
import "./PujaBookingDetailsPage.css";

const FAQS = [
  {
    q: "What should I do during the puja?",
    a: "Stay in a calm and clean state of mind. You may chant along, light a diya at your home, and keep your phone handy to watch the live stream or recording.",
  },
  {
    q: "How do I change the puja participants or address details?",
    a: "Reach out to our support team via WhatsApp or email at least 24 hours before the scheduled date to update participant or delivery details.",
  },
  {
    q: "When will I get the video with my name & gotra?",
    a: "Your personalized sankalp video is usually ready within 24-48 hours after the puja is conducted, and a notification will be sent once it's available.",
  },
  {
    q: "When will I get teerth prasad?",
    a: "If you opted for home delivery, your prasad / Aashirwad box typically arrives within 8-10 working days after the puja is completed.",
  },
];

/* ───────────────────────── helpers ───────────────────────── */

// The details API may send the booking as an object, an array, or nested one
// level deeper. Always return a single booking object (or null).
const pickBooking = (res) => {
  if (!res || typeof res !== "object") return null;
  let d =
    res.results ?? res.data ?? res.booking ?? res.result ?? res.record ??
    res.bookPooja ?? res.pujaBooking ?? null;
  if (Array.isArray(d)) d = d[0] || null;
  if (d && typeof d === "object" && !d._id) {
    let inner = d.booking ?? d.bookPooja ?? d.pujaBooking ?? d.data ?? null;
    if (Array.isArray(inner)) inner = inner[0] || null;
    if (inner && typeof inner === "object") d = inner;
  }
  return d && typeof d === "object" && !Array.isArray(d) ? d : null;
};

// Some backends split one booking into pieces, e.g.
//   { results: { bookingDetails: {...}, paymentDetails: {...}, pujaDetails: {...} } }
// Flatten everything into ONE object so fields like payment_mode / puja_amount
// are found wherever they live. Keys closer to the top win.
const WRAPPER_KEYS = ["results", "data", "result", "record", "booking", "bookings", "bookPooja", "pujaBooking"];
const flattenBooking = (root) => {
  const out = {};
  const walk = (obj, depth) => {
    if (!obj || typeof obj !== "object" || depth > 4) return;
    if (Array.isArray(obj)) {
      if (obj.length && obj[0] && typeof obj[0] === "object" && !Array.isArray(obj[0])) walk(obj[0], depth + 1);
      return;
    }
    const entries = Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== "");
    // 1st pass: this level's own values
    entries.forEach(([k, v]) => {
      if (WRAPPER_KEYS.includes(k)) return;
      if (k === "status" || k === "message") return; // API envelope, not booking data
      if (!(k in out)) out[k] = v;
    });
    // 2nd pass: go deeper (wrappers first, then any other nested object)
    entries.forEach(([k, v]) => { if (WRAPPER_KEYS.includes(k)) walk(v, depth + 1); });
    entries.forEach(([k, v]) => {
      if (!WRAPPER_KEYS.includes(k) && v && typeof v === "object" && !Array.isArray(v)) walk(v, depth + 1);
    });
  };
  walk(root, 0);
  return Object.keys(out).length ? out : null;
};

// Merge API data over what we already have, but never overwrite a real value
// with an empty one, and never replace a populated object (e.g. puja_id with
// title/image) with a bare id string.
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
  !!b && !!b.payment_mode && (b.puja_amount !== undefined || b.total_amount !== undefined || b.amount !== undefined);

const toDate = (raw) => {
  if (!raw) return null;
  const d = new Date(String(raw).replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
};

const fmtDate = (raw, withDay = true) => {
  const d = toDate(raw);
  if (!d) return null;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withDay ? { weekday: "long" } : {}),
  });
};

const fmtDateTime = (raw) => {
  const d = toDate(raw);
  if (!d) return null;
  return d.toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
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

// Addon arrays can hold objects or plain ids — normalise to { name, price, qty }.
const normaliseAddons = (arr) =>
  (Array.isArray(arr) ? arr : []).map((a, i) => {
    if (a && typeof a === "object") {
      const src = a.addon_id && typeof a.addon_id === "object" ? { ...a.addon_id, ...a } : a;
      return {
        name: src.title || src.name || src.addon_name || src.item_name || `Addon ${i + 1}`,
        price: num(src.price, src.amount, src.addon_price, src.addon_id?.price),
        qty: num(src.qty, src.quantity) || 1,
      };
    }
    return { name: `Addon ${i + 1}`, price: null, qty: 1 };
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

const PujaBookingDetailsPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!location.state?.booking);
  const [openFaq, setOpenFaq] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchBooking = async () => {
      let bData = location.state?.booking || null;

      // 1) Details API
      try {
        const res = await apiService.getBearer(`/puja/pujabookingdetails/${id}`);
        console.info("[PujaDetails] pujabookingdetails response:", res);
        bData = mergeBooking(bData, pickBooking(res));
        bData = mergeBooking(bData, flattenBooking(res)); // fields hidden in nested objects
      } catch (err) {
        console.warn("[PujaDetails] details API failed:", err?.response?.status, err?.message);
      }

      // 2) Still missing the basics? Find it in the user's booking list.
      if (!hasCoreFields(bData)) {
        try {
          let res = await apiService.postBearer("/puja/mypujabookings", {}).catch(() => null);
          if (!res || (!res.status && !res.results && !res.data)) {
            res = await apiService.getBearer("/puja/mypujabookings").catch(() => null);
          }
          const raw = res?.results || res?.bookPooja || res?.data || res?.result || res?.record || res?.bookings || [];
          const list = Array.isArray(raw) ? raw : [];
          const found = list.find(
            (b) => String(b._id) === String(id) || String(b.puja_booking_id) === String(id)
          );
          bData = mergeBooking(bData, found);
          bData = mergeBooking(bData, flattenBooking(found));
        } catch (err) {
          console.warn("[PujaDetails] booking list fallback failed:", err?.message);
        }
      }

      // 3) Confirm payment status for wallet / pending bookings
      if (bData) {
        const isWallet = bData.payment_mode?.toLowerCase() === "wallet";
        if (isWallet || !bData.payment_status || bData.payment_status?.toLowerCase() === "pending") {
          try {
            const statusRes = await apiService.getBearer(`/puja/puja_payment_status/${bData._id || id}`);
            if (statusRes?.payment_status === "Success" || statusRes?.status === true || isWallet) {
              bData = { ...bData, payment_status: "Success" };
            }
          } catch {
            if (isWallet) bData = { ...bData, payment_status: "Success" };
          }
        }
      }

      console.info("[PujaDetails] final booking used on page:", bData);
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

  if (loading) {
    return (
      <div className="main-wrapper bg-light">
        <ScrollToTop />
        <Header />
        <div className="pbd-loading">
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
        <div className="pbd-notfound">
          <h3>Booking Not Found</h3>
          <p>We couldn't find this booking. It may have been removed.</p>
          <button className="puja-view-btn" onClick={() => navigate("/my-puja-booking")}>
            Back to My Bookings
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  /* ───────── derived values (every field has fallbacks) ───────── */
  const b = booking;
  const pujaObj = b.puja_id && typeof b.puja_id === "object" ? b.puja_id : {};
  const pkgObj =
    (b.package_id && typeof b.package_id === "object" && b.package_id) ||
    (b.package && typeof b.package === "object" && b.package) || {};

  const bookingId = b.puja_booking_id || b.booking_id || b.order_id || b._id || id;
  const pujaTitle = pujaObj.title || b.puja_name || b.puja_title || b.title || "Puja";
  const pujaType = b.puja_type || pkgObj.type || "";
  const packageName = pkgObj.package_name || pkgObj.title || pkgObj.name || b.package_name || "";
  const templeName = pujaObj.temple_name || pujaObj.location || b.temple_name || "";
  const pujaImage = pujaObj.pujaImage || pujaObj.image || pujaObj.banner || b.puja_image || "";

  const pujaDateRaw = b.puja_date || pujaObj.puja_date || pujaObj.date || b.date;
  const pujaDateStr = fmtDate(pujaDateRaw) || "Date to be announced";
  const bookedOnStr = fmtDateTime(b.createdAt || b.created_at);

  const addons = normaliseAddons(b.addons_selected);
  const homeAddons = normaliseAddons(b.home_addons_selected);
  const allAddons = [...addons, ...homeAddons];

  const pujaAmount = num(b.puja_amount, pkgObj.price, pkgObj.package_price, b.package_price);
  const addonsTotal =
    num(b.addons_amount, b.addon_amount) ??
    (allAddons.some((a) => a.price !== null)
      ? allAddons.reduce((s, a) => s + (a.price || 0) * (a.qty || 1), 0)
      : null);
  const deliveryCharge = num(b.delivery_charge, b.shipping_charge);
  const discount = num(b.discount, b.coupon_discount);
  const totalAmount =
    num(b.total_amount, b.grand_total, b.final_amount, b.amount) ??
    (pujaAmount !== null ? pujaAmount + (addonsTotal || 0) + (deliveryCharge || 0) - (discount || 0) : null);

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
  const members = Array.isArray(user.members) ? user.members
    : Array.isArray(b.members) ? b.members
    : Array.isArray(b.participants) ? b.participants : [];

  const addr = b.deliveryAddress || {};
  const addressLine = [addr.houseNumber, addr.area, addr.landmark, addr.city, addr.state, addr.pincode]
    .filter(Boolean).join(", ");

  const handleDownloadInvoice = async () => {
    if (downloading) return;
    setDownloading(true);
    {
      printInvoice({
        title: `${pujaTitle}${pujaType ? ` — ${cap(pujaType)} Puja` : ""}`,
        invoiceNo: bookingId,
        rows: [
          ["Booking ID", `#${bookingId}`],
          ["Package", packageName],
          ["Temple", templeName],
          ["Puja Date", fmtDate(pujaDateRaw)],
          ["Booked On", bookedOnStr],
          ["Devotee", user.name],
          ["WhatsApp", user.whatsappNumber],
          ["Gotra", user.gotra],
          ["Payment Mode", cap(paymentMode)],
          ["Payment Status", displayStatus],
          ["Payment Ref", paymentRef],
        ],
        items: [
          { name: pujaTitle, qty: 1, price: pujaAmount },
          ...allAddons,
          ...(deliveryCharge ? [{ name: "Delivery Charge", qty: 1, price: deliveryCharge }] : []),
          ...(discount ? [{ name: "Discount", qty: 1, price: -discount }] : []),
        ],
        total: totalAmount,
      });
    }
    setDownloading(false);
  };

  // Simple key/value row used by the "Booking Details" and "Payment" cards
  const Row = ({ label, value, strong }) =>
    value || value === 0 ? (
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "9px 0", borderBottom: "1px dashed #f0e6d8", fontSize: 13.5 }}>
        <span style={{ color: "#9a8f88", fontWeight: 600 }}>{label}</span>
        <span style={{ color: "#1f1320", fontWeight: strong ? 900 : 700, textAlign: "right", wordBreak: "break-word" }}>{value}</span>
      </div>
    ) : null;

  return (
    <div className="main-wrapper bg-light">
      <ScrollToTop />
      <Header />

      <div className="container pbd-wrap">
        <button className="pbd-back" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left"></i> Booking ID #{bookingId}
        </button>

        <div className="row g-4">
          {/* ---------------- MAIN COLUMN ---------------- */}
          <div className="col-lg-8">
            {/* Video CTA banner */}
            <div className="pbd-video-banner">
              <div className="pbd-video-banner-overlay" />
              <h4>Watch Your Puja Live</h4>
              <p>
                {isSuccess
                  ? "Watch your puja live and hear Panditji recite your name & gotra."
                  : isPending
                    ? "Your puja is scheduled. Join the live stream when the ritual begins."
                    : "Live stream is not available for this booking."}
              </p>
              <button
                className="pbd-watch-btn"
                onClick={() => navigate(`/puja-live/${b._id || id}`, { state: { booking: b } })}
                disabled={statusClass === "failed"}
              >
                Watch Your Puja Live <i className="fas fa-play-circle"></i>
              </button>
            </div>

            {/* Puja & participant details */}
            <div className="pbd-card">
              <h5 className="pbd-card-title">Puja and Participant's Details</h5>

              <div className="pbd-puja-row">
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  {pujaImage && (
                    <img
                      src={pujaImage}
                      alt={pujaTitle}
                      style={{ width: 72, height: 72, borderRadius: 12, objectFit: "cover", flexShrink: 0 }}
                    />
                  )}
                  <div>
                    <h6 className="pbd-puja-name">{pujaTitle}</h6>
                    <span className="pbd-puja-type">
                      {[pujaType && `${cap(pujaType)} Puja`, packageName].filter(Boolean).join(" • ") || "Puja Booking"}
                    </span>
                    <div className="pbd-puja-price">{rupee(totalAmount ?? pujaAmount)}</div>
                  </div>
                </div>
                <div className={`puja-status ${statusClass}`}>{displayStatus}</div>
              </div>

              <div className="pbd-meta-list">
                <div className="pbd-meta-item">
                  <i className="fas fa-calendar-alt"></i> {pujaDateStr}
                </div>
                {(templeName || b.astrologer_name) && (
                  <div className="pbd-meta-item">
                    <i className="fas fa-place-of-worship"></i>
                    {[templeName, b.astrologer_name && `Conducted by ${b.astrologer_name}`].filter(Boolean).join(" • ")}
                  </div>
                )}
                {addr.city && (
                  <div className="pbd-meta-item">
                    <i className="fas fa-map-marker-alt"></i> {addr.city}{addr.state ? `, ${addr.state}` : ""}
                  </div>
                )}
                <div className="pbd-meta-item">
                  <i className="fas fa-wallet"></i> Paid via {cap(paymentMode)}
                </div>
                <div className="pbd-meta-item">
                  <i className="fas fa-gift"></i> {allAddons.length} Addon{allAddons.length !== 1 ? "s" : ""} Selected
                </div>
              </div>

              {(user.name || user.whatsappNumber) && (
                <div className="pbd-participant">
                  <div>
                    <strong>{user.name || "Devotee"}</strong>
                    <span>
                      {[user.whatsappNumber, user.gotra && `${user.gotra} Gotra`].filter(Boolean).join(" • ")}
                    </span>
                  </div>
                  <i className="fas fa-user"></i>
                </div>
              )}

              {members.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#7B1F3A", marginBottom: 8 }}>
                    Other Participants
                  </div>
                  {members.map((m, i) => (
                    <div key={i} className="pbd-meta-item" style={{ marginBottom: 6 }}>
                      <i className="fas fa-user-friends"></i>
                      {typeof m === "string" ? m : [m.name, m.gotra && `${m.gotra} Gotra`, m.relation].filter(Boolean).join(" • ")}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Booking details — everything the API sends */}
            <div className="pbd-card">
              <h5 className="pbd-card-title">Booking Details</h5>
              <Row label="Booking ID" value={`#${bookingId}`} />
              <Row label="Puja" value={pujaTitle} />
              <Row label="Puja Type" value={pujaType && `${cap(pujaType)} Puja`} />
              <Row label="Package" value={packageName} />
              <Row label="Temple" value={templeName} />
              <Row label="Puja Date" value={fmtDate(pujaDateRaw)} />
              <Row label="Booked On" value={bookedOnStr} />
              <Row label="Devotee Name" value={user.name} />
              <Row label="WhatsApp" value={user.whatsappNumber} />
              <Row label="Gotra" value={user.gotra} />
              <Row label="Home Delivery" value={b.is_home_delivery_required ? "Yes" : "No"} />
            </div>

            {/* Addons */}
            {allAddons.length > 0 && (
              <div className="pbd-card">
                <h5 className="pbd-card-title">Addons Selected</h5>
                {allAddons.map((a, i) => (
                  <Row
                    key={i}
                    label={`${a.name}${a.qty > 1 ? ` × ${a.qty}` : ""}`}
                    value={a.price !== null ? rupee(a.price * (a.qty || 1)) : "Included"}
                  />
                ))}
              </div>
            )}

            {/* Payment summary */}
            <div className="pbd-card">
              <h5 className="pbd-card-title">Payment Summary</h5>
              <Row label="Puja Amount" value={pujaAmount !== null ? rupee(pujaAmount) : null} />
              <Row label="Addons" value={addonsTotal ? rupee(addonsTotal) : null} />
              <Row label="Delivery Charge" value={deliveryCharge ? rupee(deliveryCharge) : null} />
              <Row label="Discount" value={discount ? `- ${rupee(discount)}` : null} />
              <Row label="Total Paid" value={rupee(totalAmount)} strong />
              <Row label="Payment Mode" value={cap(paymentMode)} />
              <Row label="Payment Status" value={displayStatus} />
              <Row label="Order Ref" value={orderRef} />
              <Row label="Payment Ref" value={paymentRef} />
            </div>

            {/* Puja video & updates timeline */}
            <div className="pbd-card">
              <h5 className="pbd-card-title">Puja Video &amp; Updates</h5>

              <div className="pbd-timeline">
                <div className={`pbd-tl-item ${isSuccess ? "done" : ""}`}>
                  <span className="pbd-tl-dot"><i className="fas fa-check"></i></span>
                  <p>
                    {bookedOnStr ? `Booking confirmed on ${bookedOnStr}.` : "Booking confirmed."}
                  </p>
                </div>
                <div className={`pbd-tl-item ${isSuccess ? "done" : ""}`}>
                  <span className="pbd-tl-dot"><i className="fas fa-check"></i></span>
                  <p>Payment {displayStatus.toLowerCase()} via {cap(paymentMode)}.</p>
                </div>
                <div className={`pbd-tl-item ${isSuccess ? "done" : "pending"}`}>
                  <span className="pbd-tl-dot">
                    <i className={`fas ${isSuccess ? "fa-check" : "fa-clock"}`}></i>
                  </span>
                  <p>
                    {fmtDate(pujaDateRaw)
                      ? `Your Puja is scheduled for ${fmtDate(pujaDateRaw)}.`
                      : "Your Puja date will be shared soon."}
                  </p>
                </div>
                <div className={`pbd-tl-item ${isSuccess ? "done" : "pending"}`}>
                  <span className="pbd-tl-dot">
                    <i className={`fas ${isSuccess ? "fa-check" : "fa-clock"}`}></i>
                  </span>
                  <p>
                    {isSuccess
                      ? "Your personalized name & gotra sankalp video will appear here after the puja."
                      : "Your personalized sankalp video will appear here after completion."}
                  </p>
                </div>
              </div>

              {isSuccess && pujaImage && (
                <div className="pbd-gallery">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="pbd-gallery-item">
                      <img src={pujaImage} alt="Puja glimpse" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Delivery tracking */}
            {b.is_home_delivery_required && (
              <div className="pbd-card">
                <h5 className="pbd-card-title">Track Your Delivery</h5>
                <div className="pbd-delivery-item">
                  <div className="pbd-delivery-icon">
                    <i className="fas fa-box-open"></i>
                  </div>
                  <div className="pbd-delivery-info">
                    <strong>Aashirwad Box</strong>
                    <span>{addressLine || "Address not provided"}</span>
                  </div>
                  <span className="pbd-delivery-status">{isSuccess ? "Dispatched" : "Pending"}</span>
                </div>
              </div>
            )}

            <button className="pbd-invoice-btn" onClick={handleDownloadInvoice}>
              <i className={`fas ${downloading ? "fa-spinner fa-spin" : "fa-file-invoice"}`}></i>
              {downloading ? " Preparing Invoice…" : " Download Invoice"}
            </button>
          </div>

          {/* ---------------- SIDEBAR ---------------- */}
          <div className="col-lg-4">
            <div className="pbd-card pbd-faq-card">
              <h5 className="pbd-card-title">Frequently Asked Questions</h5>
              {FAQS.map((faq, idx) => (
                <div key={idx} className="pbd-faq-item">
                  <button className="pbd-faq-question" onClick={() => setOpenFaq(openFaq === idx ? null : idx)}>
                    {faq.q}
                    <i className={`fas fa-chevron-${openFaq === idx ? "up" : "down"}`}></i>
                  </button>
                  {openFaq === idx && <p className="pbd-faq-answer">{faq.a}</p>}
                </div>
              ))}
            </div>

            <div className="pbd-card pbd-help-card">
              <h5 className="pbd-card-title">Help &amp; Support</h5>

              <div className="pbd-help-row">
                <i className="fas fa-phone-alt"></i>
                <div>
                  <a href="tel:+918881110520" style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}>
                    <strong>+91 8881110520</strong>
                  </a>
                  <span>You can call us from 10:30 AM - 7:30 PM</span>
                </div>
              </div>

              <div className="pbd-help-actions">
                <a
                  href="mailto:support@vaidikguru.com"
                  className="pbd-help-btn"
                  style={{ textDecoration: "none", cursor: "pointer" }}
                >
                  <i className="fas fa-envelope"></i>
                  <span>Email us</span>
                </a>
                <a
                  href="https://wa.me/918881110520"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pbd-help-btn whatsapp"
                  style={{ textDecoration: "none", cursor: "pointer" }}
                >
                  <i className="fab fa-whatsapp"></i>
                  <span>WhatsApp us</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PujaBookingDetailsPage;