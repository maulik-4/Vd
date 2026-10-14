import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NewAppDownloadModal = ({ isOpen, onClose, title, subtitle, logo = "assets/img/logo123.svg" }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="diviniq-overlay"
                    onClick={onClose}
                    style={{ zIndex: 9999 }}
                >
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0, rotateX: -10 }}
                        animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="diviniq-modal-box"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-left">
                            <img src={logo} width="130" className="mx-auto mb-4" alt="DivinIQ" />
                            <h3 className="h4 text-white">{title}</h3>
                            <p className="small opacity-60">{subtitle}</p>
                        </div>

                        <div className="modal-right">
                            <button className="btn-close position-absolute top-0 end-0 m-4" onClick={onClose}></button>
                            <h4 className="fw-bold mb-4">Scan QR to Download</h4>
                            
                            <div className="qr-premium-wrap shadow-sm mb-4">
                                <img src="assets/img/app_qr.svg" width="180" alt="QR" />
                            </div>

                            <div className="d-flex justify-content-center gap-3">
                                <a href="https://play.google.com/store/apps/details?id=com.app.vaidikguru" target="_blank" rel="noreferrer" className="app-btn-elite bg-transparent border rounded p-2 d-flex align-items-center gap-2 text-decoration-none text-dark">
                                    <i className="fab fa-apple fs-4"></i> 
                                    <div className="text-start">
                                        <small className="d-block opacity-50" style={{fontSize: '9px'}}>Available on</small>
                                        <span className="fw-bold" style={{fontSize: '12px'}}>App Store</span>
                                    </div>
                                </a>
                                <a href="https://play.google.com/store/apps/details?id=com.app.vaidikguru" target="_blank" rel="noreferrer" className="app-btn-elite bg-transparent border rounded p-2 d-flex align-items-center gap-2 text-decoration-none text-dark">
                                    <i className="fab fa-google-play fs-4 text-warning"></i> 
                                    <div className="text-start">
                                        <small className="d-block opacity-50" style={{fontSize: '9px'}}>Get it on</small>
                                        <span className="fw-bold" style={{fontSize: '12px'}}>Google Play</span>
                                    </div>
                                </a>
                            </div>
                            <p className="xsmall text-muted mt-4">Safe • Private • Secure</p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default NewAppDownloadModal;