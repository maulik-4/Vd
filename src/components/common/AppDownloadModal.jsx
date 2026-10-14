import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./AppDownloadModal.css";

const AppDownloadModal = ({ isOpen, onClose, bookingId }) => {
  if (!isOpen) return null;

  const handleDownload = (store) => {
    // Replace with your actual store links
    const links = {
      android: "https://play.google.com/store/apps/details?id=com.app.vaidikguru",
      ios: "https://play.google.com/store/apps/details?id=com.app.vaidikguru"
    };
    window.open(links[store], "_blank");
  };

  return (
    <AnimatePresence>
      <div className="dvm-overlay" onClick={onClose}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 24, stiffness: 280 }}
          className="dvm-card"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button className="dvm-close" onClick={onClose} aria-label="Close">
            <i className="fas fa-times"></i>
          </button>

          {/* Top Visual Section */}
          <div className="dvm-header">
            <div className="dvm-header-overlay" />
            <h4 className="dvm-title">
              Experience the
              <span>Divine Live</span>
            </h4>
            <p className="dvm-subtitle">
              Watch your personalized ritual in real-time or download the
              high-quality recording.
            </p>
            <div className="dvm-curve" />
          </div>

          <div className="dvm-om-badge">
            <i className="fas fa-om"></i>
          </div>

          <div className="dvm-body">
            {/* Feature row */}
            <div className="dvm-features">
              <div className="dvm-feature">
                <div className="dvm-feature-icon">
                  <i className="fas fa-satellite-dish"></i>
                </div>
                <div className="dvm-feature-text">
                  <span className="dvm-feature-title">Live Watching</span>
                  <span className="dvm-feature-sub">Available</span>
                </div>
              </div>
              <div className="dvm-feature-divider" />
              <div className="dvm-feature">
                <div className="dvm-feature-icon">
                  <i className="fas fa-download"></i>
                </div>
                <div className="dvm-feature-text">
                  <span className="dvm-feature-title">Download HD Puja Video</span>
                  <span className="dvm-feature-sub">After Completion</span>
                </div>
              </div>
            </div>

            {/* Section label */}
            <div className="dvm-section-label">
              <span className="dvm-line" />
              <i className="fas fa-spa"></i>
              Download <strong>VaidikGuru</strong> App To Access
              <i className="fas fa-spa"></i>
              <span className="dvm-line" />
            </div>

            {/* Store buttons */}
            <div className="dvm-store-buttons">
              <button className="dvm-store-btn dvm-store-btn-google" onClick={() => handleDownload('android')}>
                <i className="fab fa-google-play"></i>
                <span className="dvm-store-text">
                  <small>GET IT ON</small>
                  <strong>Google Play Store</strong>
                </span>
                <span className="dvm-store-arrow">
                  <i className="fas fa-chevron-right"></i>
                </span>
              </button>

              <button className="dvm-store-btn dvm-store-btn-apple" onClick={() => handleDownload('ios')}>
                <i className="fab fa-apple"></i>
                <span className="dvm-store-text">
                  <small>DOWNLOAD ON THE</small>
                  <strong>Apple App Store</strong>
                </span>
                <span className="dvm-store-arrow">
                  <i className="fas fa-chevron-right"></i>
                </span>
              </button>
            </div>

            <button className="dvm-maybe-later" onClick={onClose}>
              <span className="dvm-line" />
              <i className="fas fa-spa"></i>
              Maybe Later
              <i className="fas fa-spa"></i>
              <span className="dvm-line" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AppDownloadModal;