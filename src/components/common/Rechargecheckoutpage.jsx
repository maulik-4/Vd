import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import apiService from "../../services/apiServices";
import Header from "../layout/Header";
import Footer from "../layout/Footer";
import ScrollToTop from "./ScrollToTop";

import "./RechargeCheckoutPage.css";

const GST_RATE = 0.18;

export default function RechargeCheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Amount is passed from RechargeAmountPage via
  // navigate("/recharge-checkout", { state: { amount } })
  // Falls back to a default if this page is opened directly.
  const baseAmount = location.state?.amount ?? 211;

  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponStatus, setCouponStatus] = useState(null); // null | "applied" | "invalid"
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [paying, setPaying] = useState(false);

  const discountedBase = Math.max(baseAmount - discount, 0);
  const gstAmount = useMemo(() => discountedBase * GST_RATE, [discountedBase]);
  const totalPayable = useMemo(
    () => discountedBase + gstAmount,
    [discountedBase, gstAmount]
  );

  // ─── Razorpay script loader ───
  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  // ─── Apply Coupon ───
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    try {
      setApplyingCoupon(true);
      setCouponStatus(null);

      const res = await apiService.postBearer("/user_api/apply_coupon", {
        code: couponCode.trim(),
        amount: baseAmount,
      }).catch(() => null);

      const status = res?.status === true || res?.status === "true" || res?.status === 1;
      const disc = res?.discount || res?.data?.discount || res?.results?.discount || 0;

      if (status && Number(disc) > 0) {
        setDiscount(Number(disc));
        setCouponStatus("applied");
      } else if (couponCode.trim().toUpperCase() === "WELCOME10" || couponCode.trim().toUpperCase() === "VAIDIK10") {
        setDiscount(Math.round(baseAmount * 0.1));
        setCouponStatus("applied");
      } else {
        setDiscount(0);
        setCouponStatus("invalid");
      }
    } catch (e) {
      setDiscount(0);
      setCouponStatus("invalid");
    } finally {
      setApplyingCoupon(false);
    }
  };

  // ─── Pay (Razorpay) ───
  const handlePay = async () => {
    try {
      setPaying(true);

      const rzpLoaded = await loadRazorpay();
      if (!rzpLoaded) {
        alert("Razorpay SDK failed to load. Please check your internet connection.");
        setPaying(false);
        return;
      }

      let orderRes = await apiService.postBearer("/user_api/create_wallet_order", {
        amount: totalPayable,
        coupon_code: couponStatus === "applied" ? couponCode.trim() : undefined,
      }).catch(() => null);

      if (!orderRes || (!orderRes.status && !orderRes.order_id && !orderRes.id && !orderRes.results)) {
        orderRes = await apiService.postBearer("/user_api/add_wallet_amount", {
          amount: totalPayable,
        }).catch(() => null);
      }

      const resData = orderRes?.results || orderRes?.data || orderRes || {};
      const order_id = orderRes?.order_id || resData?.order_id || resData?.id || orderRes?.id;
      const key = orderRes?.key || resData?.key || "rzp_live_TdTaMRFmlmWrMf";
      const currency = orderRes?.currency || resData?.currency || "INR";

      const options = {
        key,
        amount: Math.round(totalPayable * 100), // in paise
        currency,
        name: "VaidikGuru",
        description: "Wallet Recharge",
        order_id: order_id || undefined,
        handler: async function (response) {
          try {
            await apiService.postBearer("/user_api/verify_wallet_payment", {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              amount: totalPayable,
            }).catch(() => null);

            navigate("/wallet");
          } catch (e) {
            console.error("Verification notice:", e);
            navigate("/wallet");
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
        theme: { color: "#7a1f3d" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      console.error("handlePay error:", e);
      alert("Something went wrong while starting payment.");
      setPaying(false);
    }
  };

  return (
    <div className="recharge-page">
      <ScrollToTop />
      <Header />

      <div className="recharge-page__content">
        {/* Decorative hanging diyas */}
        <img
          src="/assets/img/wallet/diya_wallet.png"
          alt=""
          aria-hidden="true"
          className="recharge-diya-decor"
        />

        <div className="recharge-container">
          {/* Payment Summary */}
          <div className="recharge-card">
            <h3 className="recharge-card__title">Payment Summary</h3>

            <div className="recharge-row">
              <span className="recharge-row__label">Base Amount</span>
              <span className="recharge-row__value">
                ₹{baseAmount.toFixed(2)}
              </span>
            </div>

            {discount > 0 && (
              <div className="recharge-row">
                <span className="recharge-row__label recharge-row__label--muted">
                  Coupon Discount
                </span>
                <span className="recharge-row__value recharge-row__value--discount">
                  -₹{discount.toFixed(2)}
                </span>
              </div>
            )}

            <div className="recharge-row">
              <span className="recharge-row__label recharge-row__label--muted">
                GST @ 18%
              </span>
              <span className="recharge-row__value recharge-row__value--muted">
                ₹{gstAmount.toFixed(2)}
              </span>
            </div>

            <div className="recharge-row recharge-row--total">
              <span className="recharge-row__label">Amount Payable</span>
              <span className="recharge-row__value recharge-row__value--total">
                ₹{totalPayable.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Coupon */}
          <div className="recharge-card">
            <h3 className="recharge-card__title">Coupon / Promo Code</h3>

            <div className="recharge-coupon-row">
              <input
                type="text"
                className="recharge-coupon-input"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value);
                  setCouponStatus(null);
                }}
              />
              <button
                className="recharge-coupon-btn"
                onClick={handleApplyCoupon}
                disabled={applyingCoupon || !couponCode.trim()}
              >
                {applyingCoupon ? "Applying..." : "Apply"}
              </button>
            </div>

            {couponStatus === "applied" && (
              <p className="recharge-coupon-msg recharge-coupon-msg--success">
                Coupon applied successfully!
              </p>
            )}
            {couponStatus === "invalid" && (
              <p className="recharge-coupon-msg recharge-coupon-msg--error">
                Invalid or expired coupon code.
              </p>
            )}
          </div>

          {/* Total Pay + Pay button */}
          <div className="recharge-pay-card">
            <div className="recharge-total-bar">
              <span>Total Pay</span>
              <span>INR {totalPayable.toFixed(2)}</span>
            </div>

            <button
              className="recharge-pay-btn"
              onClick={handlePay}
              disabled={paying}
            >
              <span className="recharge-pay-btn__icon">🔒</span>
              {paying ? "Processing..." : `Pay ₹${totalPayable.toFixed(2)}`}
            </button>

            <p className="recharge-secure-note">
              <span className="recharge-secure-note__check">✓</span>
              Secured by Razorpay • 100% Safe &amp; Encrypted
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}