import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

// Formats a 10-digit number as "+91 73111 04573"; falls back to the raw value if it isn't a clean 10-digit number
const formatWhatsApp = (num) => {
  if (!num) return "—";
  const digits = String(num).replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return num;
};

const OrderConfirmationModal = ({ isOpen, onClose, formData, cart, onConfirm, walletBalance = 0, selectedPackage }) => {
  const [paymentMode, setPaymentMode] = useState("razorpay");

  if (!isOpen) return null;

  const pkgPrice = Number(selectedPackage?.packagePrice ?? cart?.base_total ?? cart?.package?.packagePrice ?? 0);
  const addonsTotal = Number(cart?.addons_total || 0);
  const homeAddonsTotal = Number(cart?.home_addons_total || 0);
  const totalAmount = pkgPrice + addonsTotal + homeAddonsTotal + 10 - Number(cart?.discount || 0);

  return (
    <AnimatePresence>
      <>
        <style>{`
          .ocm-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.55);
            z-index: 10000;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            padding: 0;
          }
          @media(min-width: 600px){
            .ocm-overlay { align-items: center; padding: 20px; }
          }

          .ocm-card {
            background: #fff;
            border-radius: 32px 32px 0 0;
            width: 100%;
            max-width: 440px;
            overflow: hidden;
            padding: 0 0 6px;
            position: relative;
            box-shadow: 0 -8px 40px rgba(0,0,0,0.18);
          }
          @media(min-width: 600px){
            .ocm-card { border-radius: 32px; box-shadow: 0 20px 60px rgba(0,0,0,0.22); }
          }

          /* drag handle */
          .ocm-handle {
            width: 36px; height: 4px;
            background: #e5e7eb;
            border-radius: 99px;
            margin: 6px auto 0;
          }

          /* close button */
          .ocm-close {
            position: absolute;
            top: 10px; right: 12px;
            width: 28px; height: 28px;
            border-radius: 50%;
            border: 1.5px solid #e5e7eb;
            background: #fff;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer;
            font-size: 13px; color: #6b7280;
            transition: background 0.15s;
          }
          .ocm-close:hover { background: #f3f4f6; }

          /* header */
          .ocm-header {
            padding: 4px 18px 0;
            display: flex; align-items: center; gap: 8px;
          }
          .ocm-header-img {
            width: 30px; height: 30px; object-fit: contain; flex-shrink: 0;
          }
          .ocm-header-title {
            font-size: 14.5px; font-weight: 800;
            color: #7B1F3A; margin: 0 0 1px;
            line-height: 1.2;
          }
          .ocm-header-sub {
            font-size: 10px; color: #9ca3af; margin: 0;
          }
          .ocm-divider-wrap {
            display: flex; align-items: center; gap: 8px;
            padding: 2px 18px 0;
          }
          .ocm-divider-line { flex: 1; height: 1px; background: #f5a623; opacity: 0.4; }
          .ocm-divider-icon { color: #f5a623; font-size: 12px; }

          /* details card */
          .ocm-details {
            margin: 6px 14px 0;
            background: #fdf8f2;
            border-radius: 14px;
            padding: 8px 10px;
            position: relative;
            overflow: hidden;
          }
          .ocm-details-watermark {
            position: absolute;
            right: -10px; bottom: -10px;
            width: 70px; opacity: 0.06;
            pointer-events: none;
          }
          .ocm-details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
          }
          .ocm-detail-item {
            display: flex; align-items: flex-start; gap: 8px;
          }
          .ocm-detail-icon {
            width: 22px; height: 22px; border-radius: 50%;
            background: #fde8ef;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
            color: #7B1F3A; font-size: 10px;
          }
          .ocm-detail-icon--whatsapp {
            background: #e6f9ee;
            color: #16a34a;
          }
          .ocm-detail-label {
            font-size: 9px; font-weight: 800;
            color: #f5a623; letter-spacing: 0.4px;
            text-transform: uppercase; margin-bottom: 1px;
          }
          .ocm-detail-value {
            font-size: 12.5px; font-weight: 700; color: #111827;
            display: flex; align-items: center; gap: 5px;
          }
          .ocm-detail-value--nowrap {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .ocm-no-badge {
            width: 15px; height: 15px; border-radius: 50%;
            background: #f5a623;
            display: flex; align-items: center; justify-content: center;
            color: #fff; font-size: 9px; font-weight: 700;
          }
          .ocm-address {
            margin-top: 6px;
            padding-top: 6px;
            border-top: 1px solid #f0e8d8;
            font-size: 11px; color: #6b7280;
          }

          /* payment section */
          .ocm-payment {
            margin: 5px 14px 0;
            background: #fff;
            border: 1.5px solid #f3f4f6;
            border-radius: 14px;
            padding: 6px 12px;
          }
          .ocm-payment-title {
            display: flex; align-items: center; gap: 6px;
            font-size: 9.5px; font-weight: 800;
            color: #f5a623; letter-spacing: 0.5px;
            text-transform: uppercase; margin-bottom: 4px;
          }
          .ocm-payment-title i { font-size: 13px; }

          .ocm-pay-opt {
            display: flex; align-items: center; gap: 10px;
            padding: 4px 0;
            cursor: pointer;
          }
          .ocm-pay-opt + .ocm-pay-opt {
            border-top: 1px solid #f3f4f6;
          }
          .ocm-radio {
            width: 17px; height: 17px; border-radius: 50%;
            border: 2px solid #d1d5db;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; transition: border-color 0.15s;
          }
          .ocm-radio.active { border-color: #7B1F3A; }
          .ocm-radio.active::after {
            content: '';
            width: 8px; height: 8px;
            border-radius: 50%; background: #7B1F3A;
          }
          .ocm-pay-logo {
            width: 28px; height: 28px; border-radius: 50%;
            background: #fdf8f2;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; overflow: hidden;
          }
          .ocm-pay-logo img { width: 19px; object-fit: contain; }
          .ocm-pay-logo i { font-size: 14px; color: #f5a623; }
          .ocm-pay-name {
            font-size: 12.5px; font-weight: 700; color: #7B1F3A;
          }
          .ocm-pay-sub {
            font-size: 10.5px; color: #9ca3af; margin-top: 1px;
          }
          .ocm-wallet-bal {
            font-size: 11.5px; font-weight: 700; color: #f5a623; margin-left: 4px;
          }

          /* amount row */
          .ocm-amount-row {
            margin: 5px 14px 0;
            display: flex; align-items: center; gap: 10px;
            padding: 5px 0;
            border-top: 1px solid #f3f4f6;
            border-bottom: 1px solid #f3f4f6;
          }
          .ocm-amount-icon {
            width: 24px; height: 24px; border-radius: 50%;
            background: #fdf8f2;
            display: flex; align-items: center; justify-content: center;
            color: #f5a623; font-size: 12px; flex-shrink: 0;
          }
          .ocm-amount-label {
            font-size: 12px; font-weight: 700; color: #111827; flex: 1;
          }
          .ocm-amount-val {
            font-size: 17px; font-weight: 900; color: #f5a623;
          }

          /* action buttons */
          .ocm-actions {
            margin: 6px 14px 0;
            display: grid; grid-template-columns: 1fr 1.6fr; gap: 8px;
          }
          .ocm-btn-edit {
            padding: 7px;
            border: 2px solid #7B1F3A;
            border-radius: 50px;
            background: #fff;
            color: #7B1F3A;
            font-size: 12px; font-weight: 700;
            cursor: pointer;
            display: flex; align-items: center; justify-content: center; gap: 5px;
            transition: background 0.15s;
          }
          .ocm-btn-edit:hover { background: #fdf0f4; }
          .ocm-btn-pay {
            padding: 7px;
            border: none;
            border-radius: 50px;
            background: #f5a623;
            color: #fff;
            font-size: 12px; font-weight: 700;
            cursor: pointer;
            display: flex; align-items: center; justify-content: center; gap: 7px;
            transition: opacity 0.15s;
            box-shadow: 0 4px 14px rgba(245,166,35,0.35);
          }
          .ocm-btn-pay:hover { opacity: 0.9; }

          /* secure note */
          .ocm-secure {
            text-align: center; margin-top: 4px;
            font-size: 10px; color: #6b7280;
            display: flex; align-items: center; justify-content: center; gap: 5px;
          }
          .ocm-secure i { color: #16a34a; font-size: 12px; }
        `}</style>

        <div className="ocm-overlay" onClick={onClose}>
          <motion.div
            className="ocm-card"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="ocm-handle" />

            {/* Close button */}
            <button className="ocm-close" onClick={onClose}>✕</button>

            {/* Header */}
            <div className="ocm-header">
              <img
                className="ocm-header-img"
                src="/assets/img/pooja_fill/kalashfill.png"
                alt="Kalash"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div>
                <div className="ocm-header-title">Please confirm your details</div>
                <div className="ocm-header-sub">Final verification before sacred booking</div>
              </div>
            </div>

            {/* Decorative divider */}
            <div className="ocm-divider-wrap">
              <div className="ocm-divider-line" />
              <i className="fas fa-snowflake ocm-divider-icon" />
              <div className="ocm-divider-line" />
            </div>

            {/* Details card */}
            <div className="ocm-details">
              <div className="ocm-details-grid">
                {/* Devotee Name */}
                <div className="ocm-detail-item">
                  <div className="ocm-detail-icon">
                    <i className="fas fa-user" />
                  </div>
                  <div>
                    <div className="ocm-detail-label">Devotee Name</div>
                    <div className="ocm-detail-value">
                      {formData?.participantName || "—"}
                    </div>
                  </div>
                </div>

                {/* Gotra */}
                <div className="ocm-detail-item">
                  <div className="ocm-detail-icon">
                    <i className="fas fa-om" style={{fontSize:11}} />
                  </div>
                  <div>
                    <div className="ocm-detail-label">Gotra</div>
                    <div className="ocm-detail-value">
                      {formData?.isGotraKnown && formData?.gotra
                        ? formData.gotra
                        : "Not Provided"}
                    </div>
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="ocm-detail-item">
                  <div className="ocm-detail-icon ocm-detail-icon--whatsapp">
                    <i className="fab fa-whatsapp" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="ocm-detail-label">WhatsApp</div>
                    <div className="ocm-detail-value ocm-detail-value--nowrap">
                      {formatWhatsApp(formData?.whatsapp)}
                    </div>
                  </div>
                </div>

                {/* Aashirwad Box */}
                <div className="ocm-detail-item">
                  <div className="ocm-detail-icon">
                    <i className="fas fa-gift" />
                  </div>
                  <div>
                    <div className="ocm-detail-label">Aashirwad Box</div>
                    <div className="ocm-detail-value">
                      {formData?.wantsAashirwad || "No"}
                      {formData?.wantsAashirwad === "No" && (
                        <span className="ocm-no-badge">✕</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Address if Yes */}
              {formData?.wantsAashirwad === "Yes" && formData?.address && (
                <div className="ocm-address">
                  📍 {[
                    formData.address.houseNo,
                    formData.address.area,
                    formData.address.city,
                    formData.address.pincode,
                  ].filter(Boolean).join(", ")}
                </div>
              )}

              {/* Watermark Om */}
              <img
                className="ocm-details-watermark"
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Om_symbol.svg/200px-Om_symbol.svg.png"
                alt=""
              />
            </div>

            {/* Payment Mode */}
            <div className="ocm-payment">
              <div className="ocm-payment-title">
                <i className="fas fa-credit-card" />
                Select Payment Mode
              </div>

              {/* Razorpay / UPI */}
              <div
                className="ocm-pay-opt"
                onClick={() => setPaymentMode("razorpay")}
              >
                <div className={`ocm-radio ${paymentMode === "razorpay" ? "active" : ""}`} />
                <div className="ocm-pay-logo">
                  <img
                    src="https://razorpay.com/assets/razorpay-logo-white-bg.svg"
                    alt="UPI"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.parentNode.innerHTML = '<span style="font-size:11px;font-weight:800;color:#072654">UPI</span>';
                    }}
                  />
                </div>
                <div>
                  <div className="ocm-pay-name">Online Payment (UPI / Card)</div>
                  <div className="ocm-pay-sub">Pay securely using UPI, Debit/Credit Card</div>
                </div>
              </div>

              {/* Wallet */}
              <div
                className="ocm-pay-opt"
                onClick={() => setPaymentMode("wallet")}
              >
                <div className={`ocm-radio ${paymentMode === "wallet" ? "active" : ""}`} />
                <div className="ocm-pay-logo">
                  <i className="fas fa-wallet" />
                </div>
                <div>
                  <div className="ocm-pay-name">
                    VaidikGuru Wallet
                    <span className="ocm-wallet-bal" style={{ color: walletBalance < totalAmount ? "#ef4444" : "#f5a623" }}>
                      ₹{walletBalance} {walletBalance < totalAmount ? "(Low Balance)" : ""}
                    </span>
                  </div>
                  <div className="ocm-pay-sub">
                    {walletBalance < totalAmount
                      ? "Insufficient balance for this booking"
                      : "Use your VaidikGuru wallet balance"}
                  </div>
                </div>
              </div>
            </div>

            {/* Amount row */}
            <div className="ocm-amount-row">
              <div className="ocm-amount-icon">
                <i className="fas fa-wallet" />
              </div>
              <div className="ocm-amount-label">Amount to Pay</div>
              <div className="ocm-amount-val">₹{totalAmount}</div>
            </div>

            {/* Action buttons */}
            <div className="ocm-actions">
              <button className="ocm-btn-edit" onClick={onClose}>
                <i className="fas fa-pen" style={{fontSize:11}} />
                Edit Info
              </button>
              <button
                className="ocm-btn-pay"
                onClick={() => {
                  if (paymentMode === "wallet" && walletBalance < totalAmount) {
                    alert(`Insufficient wallet balance!\nYour wallet balance is ₹${walletBalance}, but the total payable amount is ₹${totalAmount}.\n\nPlease select Online Payment (UPI / Card) or recharge your wallet.`);
                    return;
                  }
                  onConfirm(paymentMode);
                }}
              >
                <i className="fas fa-lock" style={{fontSize:12}} />
                Submit & Pay
              </button>
            </div>

            {/* Secure note */}
            <div className="ocm-secure">
              <i className="fas fa-shield-alt" />
              100% Secure Payments
            </div>
          </motion.div>
        </div>
      </>
    </AnimatePresence>
  );
};

export default OrderConfirmationModal;