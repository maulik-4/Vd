import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import apiService from "../services/apiServices";
import storageService from "../services/storageServices";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import ScrollToTop from "../components/common/ScrollToTop";
import OrderConfirmationModal from "../components/common/pujaCnfirmDetailsModel";
import { useStorage } from "../context/StorageContext";
import SideMenu from "../components/layout/SideMenu";
import PopupSearch from "../components/layout/PopupSearch";
import MobileMenu from "../components/layout/MobileMenu";

/* ── Razorpay loader ── */
const loadRazorpay = () =>
	new Promise((resolve) => {
		if (window.Razorpay) { resolve(true); return; }
		const script = document.createElement("script");
		script.src = "https://checkout.razorpay.com/v1/checkout.js";
		script.onload = () => resolve(true);
		script.onerror = () => resolve(false);
		document.body.appendChild(script);
	});

/* ── Cart helpers ──
   getPujaCart / pujaaddToCart sometimes return the cart as an ARRAY (or nested
   under results). Earlier code only read res.data._id, so cart_id was never
   sent and /puja/bookpuja answered "Cart empty". Always pick one real cart. */
const pickCart = (res, pujaId) => {
	if (!res) return null;
	let d = res.data ?? res.results ?? res.cart ?? res.result ?? null;
	if (Array.isArray(d)) {
		if (!d.length) return null;
		const match = pujaId
			? d.filter((c) => String(c?.puja_id?._id || c?.puja_id || c?.pujaDetails?._id || c?.pujaDetails?.puja_id || "") === String(pujaId))
			: [];
		d = (match.length ? match : d)[(match.length ? match : d).length - 1];
	}
	if (!d || typeof d !== "object") return null;
	return (d._id || d.id || d.puja_id || d.package_id || d.package) ? d : null;
};
const cartIdOf = (c) => {
	const id = c?._id || c?.id || c?.cart_id;
	return id && !String(id).startsWith("temp_cart_") ? String(id) : undefined;
};
// Real backend ids are 24-char Mongo ObjectIds. PujaDetails falls back to
// DEFAULT_PACKAGES ("pkg_ind", "pkg_fam"…) when the puja API sends no packages;
// the backend can't put those in a cart → "Cart empty".
const isObjectId = (v) => /^[a-f0-9]{24}$/i.test(String(v || ""));

// Find the REAL package id for the package the user picked, using the live puja data.
const resolveRealPackageId = async (pujaId, pkg) => {
	if (isObjectId(pkg?._id || pkg?.id)) return String(pkg._id || pkg.id);
	if (!pujaId) return pkg?._id || pkg?.id;
	try {
		const res = await apiService.postBearer("/puja/pujabyinstaid", { instaId: pujaId });
		const d = res?.data || res?.results || {};
		const list = d.packages || d.pujaPackages || d.package || [];
		const pkgs = Array.isArray(list) ? list : [];
		const norm = (x) => String(x || "").toLowerCase().trim();
		const match =
			pkgs.find((p) => norm(p.packageType) && norm(p.packageType) === norm(pkg?.packageType)) ||
			pkgs.find((p) => norm(p.packageName) === norm(pkg?.packageName)) ||
			pkgs.find((p) => Number(p.packagePrice) === Number(pkg?.packagePrice)) ||
			pkgs[0];
		const realId = match?._id || match?.id;
		console.log("[PujaReviewForm] package id resolved:", pkg?._id, "→", realId, match);
		return realId || pkg?._id || pkg?.id;
	} catch (e) {
		console.warn("[PujaReviewForm] could not resolve real package id:", e?.message);
		return pkg?._id || pkg?.id;
	}
};

// Reads the wallet balance the same way the Wallet page does:
// results_web → results → data → root. Returns null when it can't be read.
const readWallet = (res) => {
	if (!res) return null;
	const pick = (o) => {
		if (!o || typeof o !== "object") return undefined;
		const t = Array.isArray(o) ? o[0] : o;
		return t?.wallet ?? t?.wallet_amount ?? t?.wallet_balance ?? t?.balance;
	};
	const raw = pick(res.results_web) ?? pick(res.results) ?? pick(res.data) ?? pick(res.user) ?? pick(res);
	if (raw === undefined || raw === null || raw === "") return null;
	const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
	return Number.isNaN(n) ? null : n;
};

// Always fetch a FRESH balance (with the auth token in place).
const fetchWalletBalance = async () => {
	// apiService only reads localStorage; storageService may keep the token in a cookie.
	try {
		const t = storageService.getToken?.();
		if (t && !localStorage.getItem("token")) localStorage.setItem("token", t);
	} catch (_) {}
	try {
		const res = await apiService.getBearer("/user_api/get_profile");
		const bal = readWallet(res);
		console.log("[PujaReviewForm] wallet balance from get_profile:", bal, res);
		return bal;
	} catch (e) {
		console.error("Wallet fetch error", e?.response?.status, e?.message);
		return null;
	}
};

const isCartEmptyMsg = (res) => {
	if (!res) return false;
	const msg = String(res.message || res.msg || res.error || res.data?.message || res.results?.message || "").toLowerCase();
	return msg.includes("cart empty") || msg.includes("empty cart") || msg.includes("cart is empty") || msg.includes("cart not found");
};

/* ══════════════════════════════════════════════
   STATUS MODAL
══════════════════════════════════════════════ */
const StatusModal = ({ status, onClose }) => {
	if (!status) return null;

	const config = {
		pending: {
			title: "Confirming Sankalp",
			desc: "Connecting with the temple server\nand registering your names...",
			btn: null,
			accentColor: "#f59e0b",
			iconRing: "#fde68a",
		},
		success: {
			title: "Offering Accepted!",
			desc: "Your Sankalp has been registered\nsuccessfully. You can track the\nstatus in My Bookings.",
			btn: "View Bookings",
			accentColor: "#0b845c",
			iconRing: "#a7f3d0",
		},
		failed: {
			title: "Booking Failed",
			desc: "Something went wrong while\ncommunicating with the temple.\nPlease try again.",
			btn: "Go Back & Retry",
			accentColor: "#7B1F3A",
			iconRing: "#f9c5d5",
		},
	};

	const c = config[status];

	return (
		<AnimatePresence>
			<div
				style={{
					position: "fixed", inset: 0,
					background: "rgba(30,10,40,0.55)",
					zIndex: 11000,
					display: "flex", alignItems: "center", justifyContent: "center",
					padding: 20,
				}}
				onClick={status !== "pending" ? onClose : undefined}
			>
				<motion.div
					initial={{ scale: 0.88, opacity: 0, y: 20 }}
					animate={{ scale: 1, opacity: 1, y: 0 }}
					exit={{ scale: 0.88, opacity: 0, y: 20 }}
					transition={{ type: "spring", damping: 22, stiffness: 280 }}
					onClick={(e) => e.stopPropagation()}
					style={{
						width: "100%", maxWidth: 400,
						borderRadius: 28,
						background: "linear-gradient(160deg, #fff8f2 0%, #fff3ec 50%, #ffeee4 100%)",
						boxShadow: "0 24px 64px rgba(80,20,40,0.22)",
						position: "relative",
						overflow: "hidden",
						padding: "40px 32px 36px",
						textAlign: "center",
					}}
				>
					{/* ── Temple watermark left ── */}
					<svg style={{ position: "absolute", left: -10, top: 20, width: 130, opacity: 0.12, pointerEvents: "none" }} viewBox="0 0 120 180" fill="none">
						<path d="M60 10 L60 170 M40 170 L80 170 M50 40 L70 40 M45 60 Q60 30 75 60 M35 80 Q60 45 85 80 M30 100 Q60 60 90 100 M25 120 Q60 75 95 120 M20 140 Q60 90 100 140 M15 160 Q60 110 105 160" stroke="#9B1C1C" strokeWidth="1.2" strokeLinecap="round" />
						<path d="M60 10 L55 25 L65 25 Z" fill="#9B1C1C" opacity="0.6" />
						<rect x="55" y="25" width="10" height="8" fill="#9B1C1C" opacity="0.4" />
					</svg>

					{/* ── Temple watermark right ── */}
					<svg style={{ position: "absolute", right: -10, top: 20, width: 130, opacity: 0.12, pointerEvents: "none", transform: "scaleX(-1)" }} viewBox="0 0 120 180" fill="none">
						<path d="M60 10 L60 170 M40 170 L80 170 M50 40 L70 40 M45 60 Q60 30 75 60 M35 80 Q60 45 85 80 M30 100 Q60 60 90 100 M25 120 Q60 75 95 120 M20 140 Q60 90 100 140 M15 160 Q60 110 105 160" stroke="#9B1C1C" strokeWidth="1.2" strokeLinecap="round" />
						<path d="M60 10 L55 25 L65 25 Z" fill="#9B1C1C" opacity="0.6" />
						<rect x="55" y="25" width="10" height="8" fill="#9B1C1C" opacity="0.4" />
					</svg>

					{/* ── Sand dune bottom decoration ── */}
					<svg style={{ position: "absolute", bottom: 0, left: 0, right: 0, width: "100%", pointerEvents: "none" }} viewBox="0 0 400 70" preserveAspectRatio="none">
						<path d="M0 70 Q100 30 200 50 Q300 70 400 40 L400 70 Z" fill="#f5c4a0" opacity="0.25" />
						<path d="M0 70 Q80 45 180 60 Q280 75 400 55 L400 70 Z" fill="#f0b48a" opacity="0.2" />
					</svg>

					{/* ── Om symbol bottom-left ── */}
					<div style={{ position: "absolute", left: 20, bottom: 18, fontSize: 32, color: "#d4956a", opacity: 0.45, fontFamily: "serif", lineHeight: 1 }}>ॐ</div>

					{/* ── Diya bottom-right ── */}
					<svg style={{ position: "absolute", right: 16, bottom: 10, width: 56, opacity: 0.9, pointerEvents: "none" }} viewBox="0 0 60 60">
						<ellipse cx="30" cy="14" rx="4" ry="7" fill="#f97316" opacity="0.9" />
						<ellipse cx="30" cy="16" rx="2.5" ry="4" fill="#fbbf24" />
						<rect x="29" y="20" width="2" height="6" fill="#78350f" rx="1" />
						<path d="M14 32 Q18 26 30 26 Q42 26 46 32 Q50 40 30 44 Q10 40 14 32Z" fill="#f59e0b" />
						<path d="M16 32 Q20 28 30 28 Q40 28 44 32 Q47 38 30 42 Q13 38 16 32Z" fill="#fcd34d" />
						<ellipse cx="30" cy="30" rx="10" ry="4" fill="#92400e" opacity="0.3" />
						<ellipse cx="22" cy="46" rx="3" ry="1.5" fill="#fca5a5" opacity="0.7" transform="rotate(-20 22 46)" />
						<ellipse cx="28" cy="48" rx="2.5" ry="1.2" fill="#f9a8d4" opacity="0.7" />
						<ellipse cx="35" cy="47" rx="3" ry="1.5" fill="#fca5a5" opacity="0.6" transform="rotate(15 35 47)" />
					</svg>

					{/* ── Sparkle dots ── */}
					{status === "failed" && <>
						<div style={{ position: "absolute", top: 28, left: "38%", width: 6, height: 6, borderRadius: "50%", background: "#f9c5d5" }} />
						<div style={{ position: "absolute", top: 44, right: "22%", color: "#f5a623", fontSize: 14, lineHeight: 1 }}>✦</div>
						<div style={{ position: "absolute", top: 20, right: "32%", width: 5, height: 5, borderRadius: "50%", background: "#f87171", opacity: 0.6 }} />
						<div style={{ position: "absolute", top: 60, left: "20%", color: "#f5a623", fontSize: 10, lineHeight: 1 }}>✦</div>
					</>}

					{/* ── Icon ── */}
					<div style={{ position: "relative", marginBottom: 24, display: "flex", justifyContent: "center" }}>
						<div style={{ width: 90, height: 90, borderRadius: "50%", background: c.iconRing, display: "flex", alignItems: "center", justifyContent: "center" }}>
							<div style={{ width: 70, height: 70, borderRadius: "50%", background: c.accentColor, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 8px 24px ${c.accentColor}55` }}>
								{status === "pending" && <i className="fas fa-spinner fa-spin" style={{ fontSize: 30, color: "#fff" }} />}
								{status === "success" && <i className="fas fa-check" style={{ fontSize: 30, color: "#fff" }} />}
								{status === "failed" && (
									<svg width="34" height="34" viewBox="0 0 34 34" fill="none">
										<path d="M8 8 L26 26 M26 8 L8 26" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
									</svg>
								)}
							</div>
						</div>
					</div>

					{/* ── Title ── */}
					<div style={{ fontSize: 26, fontWeight: 800, color: "#3d1520", marginBottom: 14, lineHeight: 1.2, letterSpacing: "-0.3px" }}>
						{c.title}
					</div>

					{/* ── Golden divider with flower ── */}
					<div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 auto 16px", maxWidth: 220 }}>
						<div style={{ flex: 1, height: 1.5, background: "linear-gradient(to right, transparent, #f5a623)" }} />
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							<circle cx="8" cy="8" r="2" fill="#f5a623" />
							<path d="M8 1 Q10 4 8 6 Q6 4 8 1Z" fill="#f5a623" opacity="0.7" />
							<path d="M8 10 Q10 12 8 15 Q6 12 8 10Z" fill="#f5a623" opacity="0.7" />
							<path d="M1 8 Q4 10 6 8 Q4 6 1 8Z" fill="#f5a623" opacity="0.7" />
							<path d="M10 8 Q12 10 15 8 Q12 6 10 8Z" fill="#f5a623" opacity="0.7" />
						</svg>
						<div style={{ flex: 1, height: 1.5, background: "linear-gradient(to left, transparent, #f5a623)" }} />
					</div>

					{/* ── Description ── */}
					<p style={{ fontSize: 15, color: "#4b2030", lineHeight: 1.75, margin: "0 0 28px", whiteSpace: "pre-line" }}>
						{c.desc}
					</p>

					{/* ── Button ── */}
					{c.btn && (
						<button
							onClick={onClose}
							style={{
								width: "100%", padding: "15px 24px",
								background: "linear-gradient(135deg, #9B1C3A 0%, #7B1428 100%)",
								border: "none", borderRadius: 50,
								color: "#fff", fontSize: 16, fontWeight: 700,
								cursor: "pointer", letterSpacing: 0.2,
								display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
								boxShadow: "0 6px 20px rgba(123,20,40,0.4)",
								transition: "opacity 0.15s",
							}}
							onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
							onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
						>
							{status === "failed" && (
								<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
									<path d="M3 10 A7 7 0 1 0 10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
									<path d="M3 5 L3 10 L8 10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							)}
							{status === "success" && <i className="fas fa-calendar-check" style={{ fontSize: 16 }} />}
							{c.btn}
						</button>
					)}
				</motion.div>
			</div>
		</AnimatePresence>
	);
};

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
const PujaFillForm = () => {
	const { state } = useLocation();
	const navigate = useNavigate();
	const { devoteeDetails, refreshProfile } = useStorage();
	const pujaMasterData = state?.pujaData || (() => {
		try { return JSON.parse(sessionStorage.getItem("activePujaData") || "null"); } catch { return null; }
	})();
	const selectedPackage = state?.selectedPackage || (() => {
		try { return JSON.parse(sessionStorage.getItem("activeSelectedPackage") || "null"); } catch { return null; }
	})();
	const stateTempleAddonsQty = state?.templeAddonsQty !== undefined
		? state.templeAddonsQty
		: (() => {
			try { return JSON.parse(sessionStorage.getItem("activeTempleAddonsQty") || "undefined"); } catch { return undefined; }
		})();
	const stateHomeAddonsQty = state?.homeAddonsQty !== undefined
		? state.homeAddonsQty
		: (() => {
			try { return JSON.parse(sessionStorage.getItem("activeHomeAddonsQty") || "undefined"); } catch { return undefined; }
		})();

	useEffect(() => {
		if (state?.pujaData) {
			try { sessionStorage.setItem("activePujaData", JSON.stringify(state.pujaData)); } catch (_) {}
		}
		if (state?.selectedPackage) {
			try { sessionStorage.setItem("activeSelectedPackage", JSON.stringify(state.selectedPackage)); } catch (_) {}
		}
		if (state?.templeAddonsQty) {
			try { sessionStorage.setItem("activeTempleAddonsQty", JSON.stringify(state.templeAddonsQty)); } catch (_) {}
		}
		if (state?.homeAddonsQty) {
			try { sessionStorage.setItem("activeHomeAddonsQty", JSON.stringify(state.homeAddonsQty)); } catch (_) {}
		}
	}, [state]);

	const [cart, setCart] = useState(null);
	const [cartError, setCartError] = useState(false);
	const [pujaAddons, setPujaAddons] = useState([]);
	const [pujaHomeAddons, setPujaHomeAddons] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
	const [bookingStatus, setBookingStatus] = useState(null);
	const [walletBalance, setWalletBalance] = useState(0);
	const [aashirwadOption, setAashirwadOption] = useState("Yes");
	const [showSideMenu, setShowSideMenu] = useState(false);
	const [showMobileMenu, setShowMobileMenu] = useState(false);
	const [showSearch, setShowSearch] = useState(false);
	const [formData, setFormData] = useState({
		whatsapp: "",
		participantName: "",
		gotra: "",
		isGotraKnown: true,
		wantsAashirwad: "Yes",
		address: { pincode: "", city: "", state: "", houseNo: "", area: "", landmark: "" },
	});

	const submittingRef = useRef(false); // stops a double tap from booking (and charging the wallet) twice
	const pollIntervalRef = useRef(null);
	const stopPolling = () => { if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; } };
	useEffect(() => () => stopPolling(), []);

	useEffect(() => {
		const fetchCart = async () => {
			let validServerCart = null;
			try {
				const res = await apiService.postBearer('/puja/getPujaCart', {});
				if (res?.status) {
					validServerCart = pickCart(res, pujaMasterData?._id || pujaMasterData?.id);
				}
			} catch (e) {
				console.error('Cart fetch error', e);
			}

			if (validServerCart) {
				setCart(validServerCart);
				setCartError(false);
				return;
			}

			const pData = pujaMasterData;
			const pPkg = selectedPackage;

			if (pData && pPkg) {
				try {
					const tAddons = stateTempleAddonsQty ? Object.entries(stateTempleAddonsQty).filter(([_, q]) => q > 0).map(([addon_id, qty]) => ({ addon_id, qty })) : [];
					const hAddons = stateHomeAddonsQty ? Object.entries(stateHomeAddonsQty).filter(([_, q]) => q > 0).map(([addon_id, qty]) => ({ addon_id, qty })) : [];

					const payload = {
						puja_id: pData._id || pData.id,
						package_id: pPkg._id || pPkg.id,
						addons_selected: tAddons,
						home_addons_selected: hAddons,
						is_home_delivery_required: hAddons.length > 0,
						userDetails: { name: devoteeDetails?.name || "Devotee" },
					};
					const addRes = await apiService.postBearer("/puja/pujaaddToCart", payload);
					const addedCart = addRes?.status ? pickCart(addRes, payload.puja_id) : null;
					if (addedCart) {
						setCart(addedCart);
						setCartError(false);
						return;
					}
				} catch (err) {
					console.error("Auto sync cart error:", err);
				}

				setCart({
					_id: "temp_cart_" + (pData._id || "1"),
					puja_id: pData._id || pData.id,
					pujaDetails: pData,
					package: pPkg,
					base_total: Number(pPkg.packagePrice || 0),
					grand_total: Number(pPkg.packagePrice || 0),
					addons_selected: [],
					home_addons_selected: []
				});
				setCartError(false);
			} else {
				setCartError(true);
			}
		};

		const fetchWallet = async () => {
			const bal = await fetchWalletBalance();
			if (bal !== null) setWalletBalance(bal);
		};

		const fetchPujaAddons = async () => {
			const pujaId = pujaMasterData?._id || state?.pujaData?._id;
			if (!pujaId) return;
			try {
				const res = await apiService.postBearer(
					'/puja/pujabyinstaid',
					{ instaId: pujaId }
				);
				if (res?.status && res?.data) {
					setPujaAddons(res.data.addons || []);
					setPujaHomeAddons(res.data.homeDeliveryAddons || []);
				}
			} catch (e) {
				console.error('Puja addons fetch error', e);
			}
		};

		fetchCart();
		fetchWallet();
		fetchPujaAddons();

		if (devoteeDetails?.whatsapp) {
			setFormData(prev => ({
				...prev,
				whatsapp: devoteeDetails.whatsapp,
				participantName: devoteeDetails.name || '',
			}));
		}
	}, [devoteeDetails]);
// Use fresh API-fetched addons, fallback to pujaMasterData
	const addonSource = pujaAddons.length > 0 ? pujaAddons : (pujaMasterData?.addons || []);
	const homeAddonSource = pujaHomeAddons.length > 0 ? pujaHomeAddons : (pujaMasterData?.homeDeliveryAddons || []);



	const rawTempleSelected = stateTempleAddonsQty !== undefined
		? Object.entries(stateTempleAddonsQty).filter(([_, qty]) => qty > 0).map(([addon_id, qty]) => ({ addon_id, qty }))
		: (cart?.addons_selected || []);

	const rawHomeSelected = stateHomeAddonsQty !== undefined
		? Object.entries(stateHomeAddonsQty).filter(([_, qty]) => qty > 0).map(([addon_id, qty]) => ({ addon_id, qty }))
		: (cart?.home_addons_selected || []);

	const templeAddons = rawTempleSelected.map((item) => {
		const addonIdStr = typeof item.addon_id === "object" ? item.addon_id?._id : item.addon_id;
		const details = addonSource.find((a) => String(a._id || a.id) === String(addonIdStr));
		const price = Number(
			item.pamount || item.price || item.amount ||
			(typeof item.addon_id === "object" ? (item.addon_id?.pamount || item.addon_id?.price) : 0) ||
			details?.pamount || details?.price ||
			(cart?.addons_total && rawTempleSelected.length === 1 ? (cart.addons_total / (item.qty || 1)) : 0)
		);
		return {
			...item,
			pname: item.pname || item.addon_id?.pname || details?.pname || "Temple Addon",
			pimage: item.pimage || item.addon_id?.pimage || details?.pimage || "",
			pamount: price,
			lineTotal: price * (item.qty || 1),
		};
	});

	const homeAddons = rawHomeSelected.map((item) => {
		const addonIdStr = typeof item.addon_id === "object" ? item.addon_id?._id : item.addon_id;
		const details = homeAddonSource.find((h) => String(h._id || h.id) === String(addonIdStr));
		const price = Number(
			item.pamount || item.price || item.amount ||
			(typeof item.addon_id === "object" ? (item.addon_id?.pamount || item.addon_id?.price) : 0) ||
			details?.pamount || details?.price ||
			(cart?.home_addons_total && rawHomeSelected.length === 1 ? (cart.home_addons_total / (item.qty || 1)) : 0)
		);
		return {
			...item,
			pname: item.pname || item.addon_id?.pname || details?.pname || "Home Prasad",
			pimage: item.pimage || item.addon_id?.pimage || details?.pimage || "",
			pamount: price,
			lineTotal: price * (item.qty || 1),
		};
	});
	const handleInputChange = (e) => { const { name, value } = e.target; setFormData((prev) => ({ ...prev, [name]: value })); };
	const handleAddressChange = (e) => { const { name, value } = e.target; setFormData((prev) => ({ ...prev, address: { ...prev.address, [name]: value } })); };

	const handleProceed = async (e) => {
		if (e && e.preventDefault) e.preventDefault();
		setIsLoading(true);
		try {
			const pujaId = pujaMasterData?._id || pujaMasterData?.id || state?.pujaData?._id || cart?.pujaDetails?.puja_id;
			const packageId = selectedPackage?._id || selectedPackage?.id || cart?.package?.package_id;

			const hasFullAddress = Boolean(
				formData.address?.pincode &&
				formData.address?.houseNo
			);

			const isHomeDelivery = formData.wantsAashirwad === "Yes" && (rawHomeSelected.length > 0 || hasFullAddress);

			const payload = {
				puja_id: pujaId,
				package_id: packageId,
				addons_selected: rawTempleSelected,
				home_addons_selected: rawHomeSelected,
				is_home_delivery_required: isHomeDelivery,
				userDetails: {
					name: formData.participantName || devoteeDetails?.name || "Devotee",
					whatsappNumber: formData.whatsapp || devoteeDetails?.whatsapp || "",
					gotra: formData.isGotraKnown && formData.gotra ? formData.gotra : "Kashyap (Generic)",
				},
				...(isHomeDelivery && hasFullAddress ? { deliveryAddress: {
						pincode: formData.address.pincode,
						city: formData.address.city || "",
						state: formData.address.state || "",
						houseNumber: formData.address.houseNo || "",
						area: formData.address.area || "",
						landmark: formData.address.landmark || "",
				} } : {}),
			};

			console.log("[PujaReviewForm] Submitting cart payload:", payload);
			const res = await apiService.postBearer("/puja/pujaaddToCart", payload);
			console.log("[PujaReviewForm] Cart API Response:", res);
			const updatedCart = res?.status ? pickCart(res, pujaId) : null;
			if (updatedCart) setCart(updatedCart);
			const freshBal = await fetchWalletBalance();
			if (freshBal !== null) setWalletBalance(freshBal);
			setIsConfirmModalOpen(true);
		} catch (error) {
			console.error("[PujaReviewForm] Cart update error:", error);
			setIsConfirmModalOpen(true);
		} finally {
			setIsLoading(false);
		}
	};

	const handleFinalSubmit = async (paymentMode) => {
		if (submittingRef.current) return;
		submittingRef.current = true;
		const releaseSubmit = () => { submittingRef.current = false; };
		setIsConfirmModalOpen(false);
		setIsLoading(true);
		const submitStartedAt = Date.now();
		try {
			const pujaId = pujaMasterData?._id || pujaMasterData?.id || state?.pujaData?._id || cart?.pujaDetails?.puja_id || cart?.pujaDetails?._id || cart?.puja_id;
			let packageId = selectedPackage?._id || selectedPackage?.id || cart?.package?.package_id || cart?.package_id || cart?.package?._id;
			// Package chosen but its id is a placeholder → swap for the real one
			// so the server can build the cart and the puja actually gets booked.
			if (!isObjectId(packageId)) {
				const cartPkgId = cart?.package?.package_id || cart?.package_id || cart?.package?._id;
				packageId = isObjectId(cartPkgId)
					? cartPkgId
					: await resolveRealPackageId(pujaId, selectedPackage || cart?.package);
			}
			if (!pujaId || !packageId) {
				setIsLoading(false);
				releaseSubmit();
				alert("Please select a puja package again and retry.");
				return;
			}

			const hasFullAddress = Boolean(
				formData.address?.pincode &&
				formData.address?.houseNo
			);
			const isHomeDelivery = formData.wantsAashirwad === "Yes" && (rawHomeSelected.length > 0 || hasFullAddress);

			// Re-sync cart on server to ensure server session is fresh
			let currentCartId = cart?._id || cart?.id;
			if (!currentCartId || String(currentCartId).startsWith("temp_cart_")) {
				currentCartId = undefined;
			}
			try {
				const syncPayload = {
					puja_id: pujaId,
					package_id: packageId,
					addons_selected: rawTempleSelected,
					home_addons_selected: rawHomeSelected,
					is_home_delivery_required: isHomeDelivery,
					userDetails: {
						name: formData.participantName || devoteeDetails?.name || "Devotee",
						whatsappNumber: formData.whatsapp || devoteeDetails?.whatsapp || "",
						gotra: formData.isGotraKnown && formData.gotra ? formData.gotra : "Kashyap (Generic)",
					},
					...(isHomeDelivery && hasFullAddress ? { deliveryAddress: {
							pincode: formData.address.pincode,
							city: formData.address.city || "",
							state: formData.address.state || "",
							houseNumber: formData.address.houseNo || "",
							area: formData.address.area || "",
							landmark: formData.address.landmark || "",
					} } : {}),
				};
				const syncRes = await apiService.postBearer("/puja/pujaaddToCart", syncPayload).catch(() => null);
				const syncedCart = syncRes?.status ? pickCart(syncRes, pujaId) : null;
				if (syncedCart) {
					setCart(syncedCart);
					currentCartId = cartIdOf(syncedCart) || currentCartId;
				}
				// Confirm the server really has the cart (and get its real id) before paying.
				if (!currentCartId) {
					const check = await apiService.postBearer("/puja/getPujaCart", {}).catch(() => null);
					const serverCart = check?.status ? pickCart(check, pujaId) : null;
					if (serverCart) {
						setCart(serverCart);
						currentCartId = cartIdOf(serverCart);
					}
				}
				// Verify the server cart really holds this puja. If not, add it again with
				// the exact minimal payload the Review page uses (that one works).
				const verify = await apiService.postBearer("/puja/getPujaCart", {}).catch(() => null);
				console.log("[PujaReviewForm] getPujaCart before booking:", verify);
				let verified = verify?.status ? pickCart(verify, pujaId) : null;
				if (!verified) {
					const minimalAdd = await apiService.postBearer("/puja/pujaaddToCart", {
						puja_id: pujaId,
						package_id: packageId,
						addons_selected: rawTempleSelected,
						home_addons_selected: rawHomeSelected,
						is_home_delivery_required: rawHomeSelected.length > 0,
						userDetails: { name: formData.participantName || devoteeDetails?.name || "Devotee" },
					}).catch((e) => e?.response?.data || null);
					console.log("[PujaReviewForm] minimal pujaaddToCart:", minimalAdd);
					verified = minimalAdd?.status ? pickCart(minimalAdd, pujaId) : null;
					if (!verified) {
						const again = await apiService.postBearer("/puja/getPujaCart", {}).catch(() => null);
						verified = again?.status ? pickCart(again, pujaId) : null;
					}
				}
				if (verified) {
					setCart(verified);
					currentCartId = cartIdOf(verified) || currentCartId;
				}
				console.log("[PujaReviewForm] cart_id used for booking:", currentCartId || "(none)");
			} catch (err) {
				console.warn("[PujaReviewForm] Cart pre-sync notice:", err);
			}

			const pkgPrice = Number(selectedPackage?.packagePrice ?? cart?.base_total ?? cart?.package?.packagePrice ?? 0);
			const addonsTotal = Number(cart?.addons_total || 0);
			const homeAddonsTotal = Number(cart?.home_addons_total || 0);
			const calcTotal = Number(cart?.grand_total ? (cart.grand_total + 10) : (pkgPrice + addonsTotal + homeAddonsTotal + 10 - Number(cart?.discount || 0)));

			// Pre-check for wallet payment
			let currentBalance = walletBalance;
			if (paymentMode === "wallet") {
				const freshBal = await fetchWalletBalance();
				if (freshBal !== null) { currentBalance = freshBal; setWalletBalance(freshBal); }
			}
			if (paymentMode === "wallet" && currentBalance < calcTotal) {
				setIsLoading(false);
				releaseSubmit();
				alert(`Insufficient wallet balance!\nYour wallet balance is ₹${currentBalance}, but the total payable amount is ₹${calcTotal}.\n\nPlease select Online Payment (UPI / Card) or recharge your wallet.`);
				return;
			}

			const bookPayload = {
				payment_mode: paymentMode,
				...(currentCartId ? { cart_id: currentCartId } : {}),
				puja_id: pujaId,
				package_id: packageId,
				userDetails: {
					name: formData.participantName || devoteeDetails?.name || "Devotee",
					whatsapp: formData.whatsapp || devoteeDetails?.whatsapp || "",
					whatsappNumber: formData.whatsapp || devoteeDetails?.whatsapp || "",
					gotra: formData.isGotraKnown && formData.gotra ? formData.gotra : "Kashyap (Generic)",
				},
				...(isHomeDelivery && hasFullAddress ? { deliveryAddress: {
						pincode: formData.address.pincode,
						city: formData.address.city || "",
						state: formData.address.state || "",
						houseNumber: formData.address.houseNo || "",
						area: formData.address.area || "",
						landmark: formData.address.landmark || "",
				} } : {}),
			};

			let response = await apiService.postBearer("/puja/bookpuja", bookPayload).catch((e) => e?.response?.data || null);

			// Did a booking for this puja get created since the user pressed Pay?
			// Used when the server says "Cart empty" or the reply was lost — the
			// booking (and wallet deduction) may already have gone through.
			const findJustCreatedBooking = async () => {
				let res = await apiService.postBearer("/puja/mypujabookings", {}).catch(() => null);
				if (!res || (!res.status && !res.results && !res.data)) {
					res = await apiService.getBearer("/puja/mypujabookings").catch(() => null);
				}
				const raw = res?.results || res?.bookPooja || res?.data || res?.result || res?.bookings || [];
				const list = Array.isArray(raw) ? raw : [];
				return list.find((b) => {
					const bPuja = String(b?.puja_id?._id || b?.puja_id || "");
					const created = new Date(b?.createdAt || b?.created_at || 0).getTime();
					return (!pujaId || bPuja === String(pujaId)) && created >= submitStartedAt - 60 * 1000;
				}) || null;
			};

			if (!response || isCartEmptyMsg(response)) {
				// 1) Maybe it already booked (double tap / lost reply) — never book twice.
				const existing = await findJustCreatedBooking();
				if (existing) {
					console.log("[PujaReviewForm] Booking already created — not booking again:", existing._id);
					response = { status: true, booking: existing, booking_id: existing._id };
				} else if (isCartEmptyMsg(response)) {
					// 2) Genuine empty cart: rebuild it once, then retry with the fresh cart id.
					console.log("[PujaReviewForm] Backend reported Cart empty. Re-adding to cart and retrying once...");
					const forceCartRes = await apiService.postBearer("/puja/pujaaddToCart", {
						puja_id: pujaId,
						package_id: packageId,
						addons_selected: rawTempleSelected,
						home_addons_selected: rawHomeSelected,
						is_home_delivery_required: isHomeDelivery,
						userDetails: bookPayload.userDetails,
						...(bookPayload.deliveryAddress ? { deliveryAddress: bookPayload.deliveryAddress } : {}),
					}).catch(() => null);
					let freshCart = forceCartRes?.status ? pickCart(forceCartRes, pujaId) : null;
					if (!cartIdOf(freshCart)) {
						const check = await apiService.postBearer("/puja/getPujaCart", {}).catch(() => null);
						freshCart = (check?.status ? pickCart(check, pujaId) : null) || freshCart;
					}
					const newCartId = cartIdOf(freshCart);
					response = await apiService.postBearer("/puja/bookpuja", {
						...bookPayload,
						...(newCartId ? { cart_id: newCartId } : {}),
					}).catch((e) => e?.response?.data || null);

					if (!response || isCartEmptyMsg(response)) {
						const late = await findJustCreatedBooking();
						if (late) response = { status: true, booking: late, booking_id: late._id };
					}
				}
			}

			console.log("[PujaReviewForm] Book Puja API Response:", response);

			const isSuccess = Boolean(
				response?.status === true ||
				response?.status === "true" ||
				response?.status === "success" ||
				response?.status === 200 ||
				response?.status === 1 ||
				response?.success === true ||
				!!response?.orderId ||
				!!response?.order_id ||
				!!response?.id ||
				!!response?.booking?._id ||
				!!response?.booking_id ||
				!!response?.data?._id ||
				!!response?.results?._id
			);

			if (paymentMode === "razorpay") {
				setIsLoading(false);
				const razorpayLoaded = await loadRazorpay();
				if (!razorpayLoaded) { releaseSubmit(); alert("Razorpay SDK failed to load. Please try again."); return; }

				const orderId = response?.orderId || response?.order_id || response?.id || response?.data?.orderId || response?.data?.order_id || response?.results?.orderId;
				const rzpAmount = response?.amount || response?.data?.amount || response?.results?.amount || Math.round(calcTotal * 100);

				let isPaymentDone = false;
				const redirectTarget = window.location.origin + "/my_puja_booking";
				const options = {
					key: response?.key || response?.results?.key || "rzp_live_TdTaMRFmlmWrMf",
					amount: rzpAmount,
					currency: "INR",
					name: "Vaidik Guru",
					description: "Puja Booking Payment",
					...(orderId ? { order_id: orderId } : {}),
					callback_url: redirectTarget,
					redirect: false,
					handler: async function (rzpResp) {
						console.log("[PujaReviewForm] Razorpay Success Handler:", rzpResp);
						isPaymentDone = true;
						try {
							if (rzpResp?.razorpay_payment_id) {
								await apiService.postBearer("/puja/verify_puja_payment", {
									razorpay_payment_id: rzpResp.razorpay_payment_id,
									razorpay_order_id: rzpResp.razorpay_order_id,
									razorpay_signature: rzpResp.razorpay_signature,
									puja_id: pujaId,
									package_id: packageId,
								}).catch(() => null);
							}
						} catch (e) {
							console.error("Verification notice:", e);
						}
						try { refreshProfile?.(); } catch (err) { console.error(err); }
						window.location.replace(redirectTarget);
					},
					prefill: { name: formData.participantName, contact: formData.whatsapp },
					theme: { color: "#FCD417" },
					modal: {
						ondismiss: function () {
							if (isPaymentDone) {
								window.location.replace(redirectTarget);
							} else {
								releaseSubmit();
							}
						}
					}
				};

				const rzp = new window.Razorpay(options);
				rzp.open();
				return;
			} else {
				if (isSuccess) {
					// Direct redirect for Wallet payment mode
					const bookingId = response?.booking?._id || response?.booking_id || response?.data?._id || response?.results?._id || response?.orderId || response?.order_id || response?.id;
					if (bookingId) {
						try {
							await apiService.getBearer(`/puja/puja_payment_status/${bookingId}`).catch(() => null);
							await apiService.getBearer(`/puja/payment_status/${bookingId}`).catch(() => null);
						} catch (err) {
							console.error("Wallet puja payment status update error:", err);
						}
					}
					try { refreshProfile?.(); } catch (err) { console.error(err); }
					window.location.replace(window.location.origin + "/my_puja_booking");
				} else {
					setIsLoading(false);
					releaseSubmit();
					const errMsg = isCartEmptyMsg(response)
						? "Your booking could not be completed because the cart was empty. No money was taken from your wallet — please go back to the puja page, select the package again and try once more."
						: response?.message || response?.msg || response?.error || response?.data?.message || response?.results?.message || (typeof response === "string" ? response : "Booking failed. Please check your wallet balance or try again.");
					alert(errMsg);
				}
			}
		} catch (e) {
			setIsLoading(false);
			releaseSubmit();
			console.error("[PujaReviewForm] Booking Error:", e);
			alert("Something went wrong while booking. Please try again.");
		}
	};

	const handleStatusClose = () => {
		setBookingStatus(null);
		window.location.href = "/my_puja_booking";
	};

	if (!cart && !cartError) {
		return (
			<div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: 16 }}>
				<div style={{ width: 48, height: 48, border: "4px solid #f3f4f6", borderTopColor: "#9B1C1C", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
				<p style={{ color: "#6b7280", fontSize: 15 }}>Loading Sacred Form...</p>
				<style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
			</div>
		);
	}

	// Cart is null but no error means empty cart — redirect
	if (cart === null && cartError) {
		return (
			<div className="main-wrapper bg-light">
				<SideMenu isOpen={showSideMenu} onClose={() => setShowSideMenu(false)} />
				<PopupSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
				<MobileMenu isOpen={showMobileMenu} onClose={() => setShowMobileMenu(false)} />
				<Header
					onMenuToggle={() => setShowMobileMenu(true)}
					onSideMenuToggle={() => setShowSideMenu(true)}
					onSearchToggle={() => setShowSearch(true)}
				/>
				<div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16, textAlign: "center", padding: 24 }}>
					<i className="fas fa-shopping-cart" style={{ fontSize: 48, color: "#d1d5db" }} />
					<h4 style={{ color: "#111827" }}>Your cart is empty</h4>
					<p style={{ color: "#6b7280", maxWidth: 320 }}>Please go back and select a puja package to continue.</p>
					<button onClick={() => navigate("/puja")} style={{ padding: "12px 32px", background: "#9B1C1C", color: "#fff", border: "none", borderRadius: 50, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
						Browse Pujas
					</button>
				</div>
				<Footer />
			</div>
		);
	}

	if (cartError) {
		return (
			<div className="main-wrapper bg-light">
				<SideMenu isOpen={showSideMenu} onClose={() => setShowSideMenu(false)} />
				<PopupSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
				<MobileMenu isOpen={showMobileMenu} onClose={() => setShowMobileMenu(false)} />
				<Header
					onMenuToggle={() => setShowMobileMenu(true)}
					onSideMenuToggle={() => setShowSideMenu(true)}
					onSearchToggle={() => setShowSearch(true)}
				/>
				<div style={{
					display: "flex", flexDirection: "column",
					alignItems: "center", justifyContent: "center",
					minHeight: "60vh", gap: 16, textAlign: "center", padding: 24
				}}>
					<i className="fas fa-exclamation-circle" style={{ fontSize: 48, color: "#f59e0b" }} />
					<h4 style={{ color: "#111827" }}>Unable to load your booking</h4>
					<p style={{ color: "#6b7280", maxWidth: 320 }}>
						Please make sure you are logged in and have selected a puja package.
					</p>
					<button
						onClick={() => window.location.href = "/puja"}
						style={{
							padding: "12px 32px", background: "#9B1C1C",
							color: "#fff", border: "none", borderRadius: 50,
							fontWeight: 700, cursor: "pointer", fontSize: 14
						}}
					>
						Browse Pujas
					</button>
				</div>
				<Footer />
			</div>
		);
	}

	return (
		<>
			<style>{`
        .pff-root { font-family: 'Inter', sans-serif; background: #f8f7f4; min-height: 100vh; }

        /* ── HERO BANNER ── */
        .pff-hero {
          background: linear-gradient(135deg, #0f0520 0%, #1a0535 40%, #2d0a4e 70%, #1a0535 100%);
          padding: 60px 0 50px;
          position: relative;
          overflow: hidden;
          text-align: center;
        }
        .pff-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background: url('/assets/img/pooja_fill/banner.png') center center/cover no-repeat;
        }
        .pff-hero-inner { position: relative; z-index: 2; }
        .pff-hero-deco {
          display: flex; align-items: center; justify-content: center; gap: 12px;
          margin-bottom: 12px;
        }
        .pff-hero-deco-line { width: 60px; height: 1px; background: rgba(255,180,50,0.5); }
        .pff-hero-deco-icon { color: #f5a623; font-size: 18px; }
        .pff-hero h1 { font-size: 42px; font-weight: 800; color: #fff; margin: 0 0 10px; letter-spacing: -0.5px; }
        .pff-hero h1 span { color: #f5a623; }
        .pff-hero-sub { color: rgba(255,255,255,0.7); font-size: 16px; margin: 0; }
        .pff-hero-img-left, .pff-hero-img-right {
          position: absolute; top: 50%; transform: translateY(-50%);
          width: 160px; opacity: 0.85;
        }
        .pff-hero-img-left { left: 40px; }
        .pff-hero-img-right { right: 40px; }

        /* ── LAYOUT ── */
        .pff-body { max-width: 1200px; margin: 0 auto; padding: 36px 20px 60px; display: grid; grid-template-columns: 1fr 380px; gap: 28px; }
        @media(max-width:900px){ .pff-body{ grid-template-columns:1fr; } }

        /* ── CARDS ── */
        .pff-card {
          background: #fff; border-radius: 20px;
          padding: 28px 24px 28px 24px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.06);
          margin-bottom: 20px;
          position: relative;
          overflow: visible;
        }
        .pff-card-header { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
        .pff-card-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: #fef3f2; display: flex; align-items: center; justify-content: center;
          color: #9B1C1C; font-size: 20px; flex-shrink: 0;
        }
        .pff-card-title { font-size: 18px; font-weight: 700; color: #9B1C1C; margin: 0; }
        .pff-card-sub { font-size: 13px; color: #9ca3af; margin: 2px 0 0; }
        .pff-card-watermark {
          position: absolute; right: 0px; top: 50%; transform: translateY(-50%);
          width: 130px; pointer-events: none;
        }

        /* ── FORM FIELDS ── */
        .pff-label { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 8px; display: block; }
        .pff-label span { color: #ef4444; }
        .pff-input-wrap { position: relative; }
        .pff-input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 16px; }
        .pff-input {
          width: 100%; padding: 13px 16px 13px 42px;
          border: 1.5px solid #e5e7eb; border-radius: 10px;
          font-size: 15px; color: #111827; background: #fff;
          outline: none; transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .pff-input:focus { border-color: #9B1C1C; }
        .pff-input::placeholder { color: #d1d5db; }

        /* phone row */
        .pff-phone-row { display: flex; gap: 12px; align-items: stretch; }
        .pff-phone-code {
          position: relative;
          display: flex; align-items: center;
          padding: 0 14px; border: 1.5px solid #e5e7eb; border-radius: 10px;
          font-size: 15px; font-weight: 700; color: #1a1a2e; white-space: nowrap;
          background: #fff; flex-shrink: 0;
          min-width: 92px;
        }
        .pff-phone-code select {
          appearance: none; -webkit-appearance: none; -moz-appearance: none;
          border: none; outline: none; font-size: 15px; font-weight: 700;
          color: #1a1a2e; cursor: pointer; background: transparent;
          width: 100%; padding: 13px 20px 13px 0;
        }
        .pff-phone-code-arrow {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          font-size: 10px; color: #9ca3af; pointer-events: none;
        }
        .pff-phone-input {
          flex: 1; padding: 13px 42px 13px 16px;
          border: 1.5px solid #e5e7eb; border-radius: 10px;
          font-size: 15px; color: #111827; outline: none;
          transition: border-color 0.2s; box-sizing: border-box;
          position: relative;
        }
        .pff-phone-input:focus { border-color: #9B1C1C; }
        .pff-phone-verified { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); color: #16a34a; font-size: 20px; }
        .pff-phone-wrap { position: relative; flex: 1; }

        /* ── WhatsApp card layout ── */
        .pff-wa-card { position: relative; }
        .pff-wa-top {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 12px; margin-bottom: 20px;
        }
        .pff-wa-illustration {
          width: 90px; height: 80px; object-fit: contain; flex-shrink: 0;
        }
        .pff-wa-dot {
          position: absolute; left: 50%; bottom: -8px; transform: translateX(-50%);
          width: 14px; height: 14px; border-radius: 50%; background: #f5a623;
        }
        @media (max-width: 480px) {
          .pff-wa-illustration { display: none; }
        }

        /* checkbox */
        .pff-check-row { display: flex; align-items: center; gap: 8px; margin-top: 14px; cursor: pointer; }
        .pff-check-box {
          width: 18px; height: 18px; border: 2px solid #d1d5db; border-radius: 4px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; background: #fff; cursor: pointer;
        }
        .pff-check-box.checked { background: #9B1C1C; border-color: #9B1C1C; }
        .pff-check-label { font-size: 13px; color: #6b7280; }

        /* ── AASHIRWAD OPTIONS (new smaller design) ── */
        .pff-aashirwad-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }

        .pff-aashirwad-opt {
          border: 2px solid #e5e7eb; border-radius: 14px;
          cursor: pointer; background: #fff;
          overflow: hidden; transition: border-color 0.2s, box-shadow 0.2s;
          position: relative;
        }
        .pff-aashirwad-opt.active { border-color: #d4a04a; box-shadow: 0 0 0 1px #d4a04a22; }
        .pff-aashirwad-opt:hover { border-color: #c5a068; }

        .pff-recommended-badge {
          position: absolute; top: 0; right: 0;
          background: #d4a04a; color: #fff;
          font-size: 9px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase;
          padding: 5px 14px 5px 10px;
          clip-path: polygon(0 0, 100% 0, 100% 100%, 10px 100%);
          border-radius: 0 13px 0 0;
        }

        .pff-aashirwad-radio-row { padding: 10px 12px 0; display: flex; align-items: center; }
        .pff-aashirwad-radio {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid #d1d5db;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; background: #fff;
        }
        .pff-aashirwad-radio.active { border-color: #7B1C38; }
        .pff-aashirwad-radio.active::after { content:''; width:8px; height:8px; border-radius:50%; background:#7B1C38; }

        .pff-aashirwad-img-area {
          width: 100%; height: 130px;
          display: flex; align-items: center; justify-content: center;
          background: #fdf5ef; overflow: hidden;
        }
        .pff-aashirwad-img-area img { width: 100%; height: 100%; object-fit: cover; }
        .pff-aashirwad-img-area.gray-bg { background: #fafafa; }

        .pff-aashirwad-label-area { padding: 10px 12px 4px; text-align: center; }
        .pff-aashirwad-deco { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 2px; }
        .pff-aashirwad-deco-line { height: 1px; width: 22px; background: #e2b96a; }
        .pff-aashirwad-name { font-size: 18px; font-weight: 800; color: #2d1010; margin: 0 0 1px; }
        .pff-aashirwad-desc { font-size: 12px; color: #9ca3af; margin: 0 0 10px; }
        .pff-aashirwad-desc.maroon { color: #7B1C38; }

        .pff-aashirwad-btn {
          margin: 0 12px 12px;
          padding: 10px 14px;
          border-radius: 9px;
          width: calc(100% - 24px);
          display: flex; align-items: center; justify-content: center; gap: 6px;
          font-size: 13px; font-weight: 700; cursor: pointer;
          transition: opacity 0.15s; border: none;
          box-sizing: border-box;
        }
        .pff-aashirwad-btn.primary { background: #7B1C38; color: #fff; }
        .pff-aashirwad-btn.outline { background: #fff; color: #7B1C38; border: 1.5px solid #7B1C38; }
        .pff-aashirwad-btn:hover { opacity: 0.88; }

        .pff-aashirwad-footer {
          display: flex; align-items: center; justify-content: center; gap: 16px;
          padding-top: 14px; margin-top: 2px;
          border-top: 1px solid #f3e8e0;
          font-size: 12px; color: #9B4A2A; font-weight: 600;
        }
        .pff-aashirwad-footer-item { display: flex; align-items: center; gap: 5px; }
        .pff-aashirwad-footer-sep { width: 1px; height: 16px; background: #e5d5c8; }

        /* address inside aashirwad card */
        .pff-aashirwad-address-box {
          margin-top: 18px;
          padding: 18px;
          background: #fff9f5;
          border-radius: 12px;
          border: 1.5px solid #f0d9c8;
        }
        .pff-aashirwad-address-header {
          display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
        }
        .pff-aashirwad-address-icon {
          width: 30px; height: 30px; border-radius: 8px;
          background: #fef3f2; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }

        /* ── SUBMIT BUTTON ── */
        .pff-submit-btn {
          width: 100%; padding: 18px;
          background: linear-gradient(135deg, #f5a623 0%, #e8920d 100%);
          color: #fff; border: none; border-radius: 14px;
          font-size: 17px; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: opacity 0.2s; box-shadow: 0 4px 16px rgba(245,166,35,0.35);
          letter-spacing: 0.2px;
        }
        .pff-submit-btn:hover { opacity: 0.92; }
        .pff-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .pff-secure-note { text-align: center; margin-top: 12px; font-size: 13px; color: #6b7280; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .pff-secure-note i { color: #9B1C1C; }

        /* ── TRUST STRIP ── */
        .pff-trust-strip { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-top: 28px; }
        @media(max-width:600px){ .pff-trust-strip{ grid-template-columns:repeat(2,1fr); } }
        .pff-trust-item { text-align: center; }
        .pff-trust-icon { width: 40px; height: 40px; margin: 0 auto 8px; }
        .pff-trust-icon img { width: 100%; height: 100%; object-fit: contain; }
        .pff-trust-name { font-size: 12px; font-weight: 700; color: #9B1C1C; }
        .pff-trust-sub { font-size: 11px; color: #9ca3af; }

        /* ── RIGHT SIDEBAR ── */
        .pff-sidebar { position: sticky; top: 100px; }
        .pff-summary-card {
          background: #fff; border-radius: 20px; overflow: hidden;
          box-shadow: 0 2px 16px rgba(0,0,0,0.07); margin-bottom: 16px;
        }
        .pff-summary-header {
          background: #fff; padding: 20px 24px 16px;
          display: flex; align-items: center; gap: 10px;
          border-bottom: 1px solid #f3f4f6;
        }
        .pff-summary-header-icon { color: #9B1C1C; font-size: 18px; }
        .pff-summary-header-title { font-size: 16px; font-weight: 700; color: #111827; }
        .pff-summary-body { padding: 20px 24px; }
        .pff-pkg-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #f3f4f6; }
        .pff-pkg-label { font-size: 12px; color: #9ca3af; margin-bottom: 3px; }
        .pff-pkg-name { font-size: 15px; font-weight: 700; color: #111827; }
        .pff-pkg-price { font-size: 20px; font-weight: 800; color: #f5a623; }
        .pff-addon-section-label { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
        .pff-addon-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #f9fafb; border-radius: 12px; margin-bottom: 8px; }
        .pff-addon-img { width: 40px; height: 40px; border-radius: 10px; object-fit: cover; }
        .pff-addon-name { font-size: 13px; font-weight: 600; color: #111827; }
        .pff-addon-qty { font-size: 12px; color: #9ca3af; }
        .pff-addon-price { margin-left: auto; font-size: 13px; font-weight: 700; color: #374151; }
        .pff-addon-row.home { border-left: 3px solid #f5a623; }
        .pff-billing-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .pff-billing-label { font-size: 13px; color: #6b7280; }
        .pff-billing-val { font-size: 13px; color: #374151; font-weight: 500; }
        .pff-divider-dashed { border: none; border-top: 2px dashed #f3f4f6; margin: 12px 0; }
        .pff-total-row { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
        .pff-total-label { font-size: 16px; font-weight: 700; color: #111827; }
        .pff-total-val { font-size: 24px; font-weight: 800; color: #f5a623; }
        .pff-secure-banner { background: #fffbeb; border-radius: 10px; padding: 10px 14px; display: flex; align-items: center; gap: 8px; margin-top: 14px; }
        .pff-secure-banner i { color: #f5a623; font-size: 14px; }
        .pff-secure-banner span { font-size: 13px; color: #92400e; font-weight: 500; }
        .pff-sidebar-trust { padding: 18px 24px; border-top: 1px solid #f3f4f6; display: flex; flex-direction: column; gap: 14px; }
        .pff-sidebar-trust-item { display: flex; align-items: center; gap: 12px; }
        .pff-sidebar-trust-icon { width: 36px; height: 36px; border-radius: 10px; background: #f9fafb; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #9B1C1C; font-size: 16px; }
        .pff-sidebar-trust-name { font-size: 13px; font-weight: 700; color: #111827; }
        .pff-sidebar-trust-sub { font-size: 12px; color: #9ca3af; }
        .pff-devotion-banner {
          border-radius: 16px; overflow: hidden; position: relative;
          height: 189px; margin-top: 30px;
        }
        .pff-devotion-banner img { width: 100%; height: 100%; object-fit: cover; }
        .pff-devotion-banner-overlay {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          flex-direction: column; padding: 16px; text-align: center;
        }
        .pff-devotion-text { font-size: 14px; color: #fff; line-height: 1.5; font-weight: 500; }
        .pff-devotion-text strong { color: #f5a623; }
      .pff-addr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .pff-addr-grid .full { grid-column: 1 / -1; }
        @media(max-width:500px){ .pff-addr-grid{ grid-template-columns:1fr; } }

        /* =========================================================
           RESPONSIVE ENHANCEMENTS (added only — no existing rule
           or JSX changed, purely additive media queries)
           ========================================================= */

        /* ── Hero ── */
        @media (max-width: 992px) {
          .pff-hero { padding: 48px 0 40px; }
          .pff-hero h1 { font-size: 32px; }
          .pff-hero-sub { font-size: 14px; }
          .pff-hero-img-left, .pff-hero-img-right { width: 100px; opacity: 0.5; }
          .pff-hero-img-left { left: 12px; }
          .pff-hero-img-right { right: 12px; }
        }
        @media (max-width: 600px) {
          .pff-hero { padding: 36px 0 30px; }
          .pff-hero h1 { font-size: 26px; }
          .pff-hero-sub { font-size: 13px; padding: 0 16px; }
          .pff-hero-img-left, .pff-hero-img-right { display: none; }
        }

        /* ── Body layout / cards ── */
        @media (max-width: 992px) {
          .pff-body { padding: 28px 16px 48px; gap: 20px; }
          .pff-card { padding: 22px 18px !important; }
          .pff-card-watermark { width: 90px !important; opacity: 0.6; }
          .pff-card-title { font-size: 16px; }
          .pff-card-sub { font-size: 12px; }
          .pff-sidebar { position: static; top: auto; }
        }
        @media (max-width: 600px) {
          .pff-body { padding: 20px 12px 40px; }
          .pff-card { padding: 18px 14px !important; }
          .pff-card-header { gap: 10px; }
          .pff-card-icon { width: 38px; height: 38px; font-size: 16px; }
          .pff-card-watermark { display: none !important; }
        }

      /* ── Phone row ── */
        @media (max-width: 480px) {
          .pff-phone-row { flex-wrap: nowrap; gap: 8px; }
          .pff-phone-code { padding: 10px 8px; font-size: 13px; }
          .pff-phone-code select { font-size: 13px; }
          .pff-phone-wrap { padding: 0 !important; }
          .pff-phone-input { padding: 12px 44px 12px 12px !important; font-size: 14px; }
          .pff-phone-verified { right: 12px; }
        }
        /* ── Aashirwad grid ── */
        @media (max-width: 640px) {
          .pff-aashirwad-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
        }
        @media (max-width: 600px) {
          .pff-aashirwad-img-area { height: 110px; }
          .pff-aashirwad-name { font-size: 16px; }
          .pff-aashirwad-btn { font-size: 12px; padding: 9px 12px; }
          .pff-aashirwad-footer { flex-direction: column; gap: 8px; }
          .pff-aashirwad-footer-sep { display: none; }
        }

        /* ── Address box ── */
        @media (max-width: 600px) {
          .pff-aashirwad-address-box { padding: 14px; }
        }

        /* ── Submit button ── */
        @media (max-width: 600px) {
          .pff-submit-btn { padding: 15px; font-size: 15px; }
        }
        @media (max-width: 640px) {
          .pff-submit-wrap {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            background: #fff;
            padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
            box-shadow: 0 -6px 20px rgba(0,0,0,0.1);
            z-index: 999;
          }
          .pff-submit-wrap .pff-secure-note { display: none; }
          .pff-body { padding-bottom: 90px; }
        }
   
       /* ── Trust strip ── */
        @media (max-width: 420px) {
          .pff-trust-strip { gap: 14px; }
          .pff-trust-icon { width: 34px; height: 34px; }
          .pff-trust-name { font-size: 11.5px; }
          .pff-trust-sub { font-size: 10.5px; }
        }

        /* ── Sidebar summary ── */
        @media (max-width: 600px) {
          .pff-summary-header { padding: 16px 18px 12px; }
          .pff-summary-body { padding: 16px 18px; }
          .pff-pkg-price, .pff-total-val { font-size: 18px; }
          .pff-sidebar-trust { padding: 14px 18px; }
        }

        /* ── Devotion banner ── */
        @media (max-width: 600px) {
          .pff-devotion-banner { height: 150px; margin-top: 20px; }
          .pff-devotion-text { font-size: 13px; }
        }
      `}</style>

				<div className="pff-root">
				<ScrollToTop />
				<SideMenu isOpen={showSideMenu} onClose={() => setShowSideMenu(false)} />
				<PopupSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
				<MobileMenu isOpen={showMobileMenu} onClose={() => setShowMobileMenu(false)} />
				<Header
					onMenuToggle={() => setShowMobileMenu(true)}
					onSideMenuToggle={() => setShowSideMenu(true)}
					onSearchToggle={() => setShowSearch(true)}
				/>

				{/* ══ HERO BANNER ══ */}
				<div className="pff-hero">
					<img
						className="pff-hero-img-left"
						src="https://images.unsplash.com/photo-1601933513839-04e30d94e55e?w=300&q=80"
						alt=""
						style={{ borderRadius: 12 }}
					/>
					<div className="pff-hero-inner">
						<div className="pff-hero-deco">
							<span className="pff-hero-deco-line" />
							<i className="fas fa-om pff-hero-deco-icon" />
							<span className="pff-hero-deco-line" />
						</div>
						<h1>Sankalp &amp; <span>Address</span></h1>
						<p className="pff-hero-sub">Enter your details for a meaningful puja experience</p>
					</div>
				</div>

				{/* ══ BODY ══ */}
				<div className="pff-body">

					{/* ── LEFT COLUMN ── */}
					<div>
						<form onSubmit={handleProceed}>

							{/* ── WHATSAPP CONTACT ── */}
							<div className="pff-card pff-wa-card" style={{ padding: "24px", overflow: "visible" }}>
								<div className="pff-wa-top">
									<div className="pff-card-header" style={{ marginBottom: 0 }}>
										<div className="pff-card-icon"><i className="fab fa-whatsapp" /></div>
										<div>
											<div className="pff-card-title">WhatsApp Contact</div>
											<div className="pff-card-sub">All updates will be sent on WhatsApp</div>
										</div>
									</div>
									<img
										className="pff-wa-illustration"
										src="/assets/img/pooja_fill/whatsappimage.png"
										alt=""
										onError={(e) => { e.target.style.display = "none"; }}
									/>
								</div>

								<div className="pff-phone-row">
									<div className="pff-phone-code">
										<select
											defaultValue="+91"
											aria-label="Country code"
										>
											<option>+91</option>
										</select>
										<i className="fas fa-chevron-down pff-phone-code-arrow" />
									</div>
									<div className="pff-phone-wrap">
										<input
											type="tel"
											name="whatsapp"
											required
											className="pff-phone-input"
											placeholder="Enter WhatsApp number"
											value={formData.whatsapp}
											onChange={handleInputChange}
										/>
										{formData.whatsapp?.length === 10 && (
											<i className="fas fa-check-circle pff-phone-verified" />
										)}
									</div>
								</div>

								<div className="pff-wa-dot" />
							</div>

							{/* ── PARTICIPANT DETAILS ── */}
							<div className="pff-card" style={{ paddingRight: 130 }}>
								<div className="pff-card-header">
									<div className="pff-card-icon"><i className="fas fa-user" /></div>
									<div>
										<div className="pff-card-title">Participant Details</div>
										<div className="pff-card-sub">Enter devotee details for the sankalp</div>
									</div>
								</div>
								<img
									className="pff-card-watermark"
									src="/assets/img/pooja_fill/hand.png"
									alt=""
									style={{ width: 160 }}
									onError={(e) => { e.target.style.display = "none"; }}
								/>

								<div style={{ marginBottom: 18 }}>
									<label className="pff-label">Full Name <span>*</span></label>
									<div className="pff-input-wrap">
										<i className="fas fa-user pff-input-icon" />
										<input
											type="text"
											name="participantName"
											required
											className="pff-input"
											placeholder="Enter your full name"
											value={formData.participantName}
											onChange={handleInputChange}
										/>
									</div>
								</div>

								<div>
									<label className="pff-label">Gotra <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Optional)</span></label>
									<div className="pff-input-wrap">
										<i className="fas fa-om pff-input-icon" style={{ fontSize: 14 }} />
										<input
											type="text"
											name="gotra"
											disabled={!formData.isGotraKnown}
											className="pff-input"
											placeholder={formData.isGotraKnown ? "Enter Gotra" : "Kashyap (Generic)"}
											value={formData.gotra}
											onChange={handleInputChange}
										/>
									</div>
								</div>

								<div
									className="pff-check-row"
									onClick={() => setFormData((p) => ({ ...p, isGotraKnown: !p.isGotraKnown }))}
								>
									<div className={`pff-check-box ${!formData.isGotraKnown ? "checked" : ""}`}>
										{!formData.isGotraKnown && <i className="fas fa-check" style={{ fontSize: 10, color: '#fff' }} />}
									</div>
									<span className="pff-check-label">I do not know my gotra</span>
								</div>
							</div>

							{/* ── AASHIRWAD BOX ── */}
							<div className="pff-card" style={{ padding: "28px 24px", overflow: "visible" }}>
								<div className="pff-card-header">
									<div className="pff-card-icon"><i className="fas fa-gift" /></div>
									<div>
										<div className="pff-card-title">Receive Aashirwad Box?</div>
										<div className="pff-card-sub">Get prasad, holy items and blessings at your address</div>
									</div>
								</div>

								<div className="pff-aashirwad-grid">
									{/* YES option */}
									<div
										className={`pff-aashirwad-opt ${formData.wantsAashirwad === "Yes" ? "active" : ""}`}
										onClick={() => setFormData((p) => ({ ...p, wantsAashirwad: "Yes" }))}
									>
										<div className="pff-recommended-badge">Recommended</div>
										<div className="pff-aashirwad-radio-row">
											<div className={`pff-aashirwad-radio ${formData.wantsAashirwad === "Yes" ? "active" : ""}`} />
										</div>
										<div className="pff-aashirwad-img-area">
											<img src="/assets/img/pooja_fill/gift.png" alt="Aashirwad Box" />
										</div>
										<div className="pff-aashirwad-label-area">
											<div className="pff-aashirwad-deco">
												<div className="pff-aashirwad-deco-line" />
												<span style={{ fontSize: 9, color: "#e2b96a" }}>✦</span>
												<div className="pff-aashirwad-deco-line" />
											</div>
											<div className="pff-aashirwad-name">Yes</div>
											<div className="pff-aashirwad-desc maroon">Deliver Aashirwad Box</div>
										</div>
										<button
											type="button"
											className="pff-aashirwad-btn primary"
											onClick={(e) => { e.stopPropagation(); setFormData((p) => ({ ...p, wantsAashirwad: "Yes" })); }}
										>
											<i className="fas fa-truck" style={{ fontSize: 12 }} />
											Yes, Deliver Aashirwad Box
											<i className="fas fa-arrow-right" style={{ fontSize: 11 }} />
										</button>
									</div>

									{/* NO option */}
									<div
										className={`pff-aashirwad-opt ${formData.wantsAashirwad === "No" ? "active" : ""}`}
										onClick={() => setFormData((p) => ({ ...p, wantsAashirwad: "No" }))}
									>
										<div className="pff-aashirwad-radio-row">
											<div className={`pff-aashirwad-radio ${formData.wantsAashirwad === "No" ? "active" : ""}`} />
										</div>
										<div className="pff-aashirwad-img-area gray-bg">
											<img src="/assets/img/pooja_fill/giftpack.png" alt="No Box" />
										</div>
										<div className="pff-aashirwad-label-area">
											<div className="pff-aashirwad-deco">
												<div className="pff-aashirwad-deco-line" />
												<div style={{ width: 22, height: 22, borderRadius: "50%", background: "#7B1C38", display: "flex", alignItems: "center", justifyContent: "center" }}>
													<i className="fas fa-hand-paper" style={{ fontSize: 10, color: "#fff" }} />
												</div>
												<div className="pff-aashirwad-deco-line" />
											</div>
											<div className="pff-aashirwad-name">No</div>
											<div className="pff-aashirwad-desc">I don't want Aashirwad Box</div>
										</div>
										<button
											type="button"
											className="pff-aashirwad-btn outline"
											onClick={(e) => { e.stopPropagation(); setFormData((p) => ({ ...p, wantsAashirwad: "No" })); }}
										>
											No, Skip Aashirwad Box
											<i className="fas fa-arrow-right" style={{ fontSize: 11 }} />
										</button>
									</div>
								</div>

								{/* Footer trust strip */}
								<div className="pff-aashirwad-footer">
									<div className="pff-aashirwad-footer-item">
										<i className="fas fa-shield-alt" style={{ fontSize: 13 }} />
										100% Secure Packaging
									</div>
									<div className="pff-aashirwad-footer-sep" />
									<div className="pff-aashirwad-footer-item">
										Delivered with Devotion
										<i className="fas fa-heart" style={{ fontSize: 12 }} />
									</div>
								</div>

								{/* ── ADDRESS FORM — slides open when Yes ── */}
								<AnimatePresence>
									{formData.wantsAashirwad === "Yes" && (
										<motion.div
											initial={{ height: 0, opacity: 0 }}
											animate={{ height: "auto", opacity: 1 }}
											exit={{ height: 0, opacity: 0 }}
											transition={{ duration: 0.3, ease: "easeInOut" }}
											style={{ overflow: "hidden" }}
										>
											<div className="pff-aashirwad-address-box">
												<div className="pff-aashirwad-address-header">
													<div className="pff-aashirwad-address-icon">
														<i className="fas fa-map-marker-alt" style={{ color: "#9B1C1C", fontSize: 13 }} />
													</div>
													<div>
														<div style={{ fontSize: 14, fontWeight: 700, color: "#9B1C1C" }}>Delivery Address</div>
														<div style={{ fontSize: 12, color: "#9ca3af" }}>Where should we send your Aashirwad Box?</div>
													</div>
												</div>
												<div className="pff-addr-grid">
													{[
														{ name: "pincode", placeholder: "Pincode", icon: "fas fa-map-pin" },
														{ name: "city", placeholder: "City", icon: "fas fa-city" },
														{ name: "state", placeholder: "State", icon: "fas fa-map", full: true },
														{ name: "houseNo", placeholder: "House / Flat No.", icon: "fas fa-home", full: true },
														{ name: "area", placeholder: "Area / Colony", icon: "fas fa-map-marker-alt", full: true },
														{ name: "landmark", placeholder: "Landmark (optional)", icon: "fas fa-landmark", full: true, req: false },
													].map(({ name, placeholder, icon, full, req = true }) => (
														<div key={name} className={full ? "full" : ""}>
															<div className="pff-input-wrap">
																<i className={`${icon} pff-input-icon`} style={{ fontSize: 13 }} />
																<input
																	type="text"
																	name={name}
																	required={req}
																	className="pff-input"
																	placeholder={placeholder}
																	value={formData.address[name]}
																	onChange={handleAddressChange}
																/>
															</div>
														</div>
													))}
												</div>
											</div>
										</motion.div>
									)}
								</AnimatePresence>
							</div>

							{/* ── SUBMIT ── */}
							<div className="pff-submit-wrap">
								<button type="submit" disabled={isLoading} className="pff-submit-btn">
									<i className="fas fa-lock" style={{ fontSize: 16 }} />
									{isLoading ? "Updating Sankalp..." : "Confirm & Proceed To Payment"}
									{!isLoading && <i className="fas fa-arrow-right" style={{ fontSize: 14 }} />}
								</button>
								<div className="pff-secure-note">
									<i className="fas fa-shield-alt" />
									100% Secure &amp; Safe Payments
								</div>
							</div>
						</form>
					</div>

					{/* ── RIGHT SIDEBAR ── */}
					<div className="pff-sidebar">
						<div className="pff-summary-card">
							<div className="pff-summary-header">
								<i className="fas fa-receipt pff-summary-header-icon" />
								<span className="pff-summary-header-title">Booking Summary</span>
							</div>

							<div className="pff-summary-body">
								<div className="pff-pkg-row">
									<div>
										<div className="pff-pkg-label">Selected Package</div>
										<div className="pff-pkg-name">{selectedPackage?.packageName || cart.package?.packageName || "Individual"}</div>
									</div>
									<div className="pff-pkg-price">₹{selectedPackage?.packagePrice ?? cart.package?.packagePrice ?? cart.base_total ?? 0}</div>
								</div>

								{homeAddons.length > 0 && (
									<div style={{ marginBottom: 14 }}>
										<div className="pff-addon-section-label">Home Delivery</div>
										{homeAddons.map((item, i) => (
											<div key={i} className="pff-addon-row home">
												{item.pimage
													? <img src={item.pimage} className="pff-addon-img" alt="" />
													: <div className="pff-addon-img" style={{ background: '#fef3f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-box" style={{ color: '#9B1C1C', fontSize: 16 }} /></div>
												}
												<div>
													<div className="pff-addon-name">{item.pname}</div>
													<div className="pff-addon-qty">Qty: {item.qty}</div>
												</div>
												<div className="pff-addon-price">₹{item.lineTotal || item.pamount || 0}</div>
											</div>
										))}
									</div>
								)}

								{templeAddons.length > 0 && (
									<div style={{ marginBottom: 14 }}>
										<div className="pff-addon-section-label">Ritual Add-ons</div>
										{templeAddons.map((item, i) => (
											<div key={i} className="pff-addon-row">
												{item.pimage
													? <img src={item.pimage} className="pff-addon-img" alt="" />
													: <div className="pff-addon-img" style={{ background: '#fef3f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-om" style={{ color: '#9B1C1C', fontSize: 16 }} /></div>
												}
												<div>
													<div className="pff-addon-name">{item.pname}</div>
													<div className="pff-addon-qty">Qty: {item.qty}</div>
												</div>
												<div className="pff-addon-price">₹{item.lineTotal || item.pamount || 0}</div>
											</div>
										))}
									</div>
								)}

								<hr className="pff-divider-dashed" />
								<div className="pff-billing-row">
									<span className="pff-billing-label">Addons Total</span>
									<span className="pff-billing-val">₹{stateTempleAddonsQty !== undefined ? templeAddons.reduce((s, a) => s + (a.lineTotal || 0), 0) : (cart?.addons_total ?? templeAddons.reduce((s, a) => s + (a.lineTotal || 0), 0))}</span>
								</div>
								<div className="pff-billing-row">
									<span className="pff-billing-label">Home Delivery</span>
									<span className="pff-billing-val">₹{stateHomeAddonsQty !== undefined ? homeAddons.reduce((s, a) => s + (a.lineTotal || 0), 0) : (cart?.home_addons_total ?? homeAddons.reduce((s, a) => s + (a.lineTotal || 0), 0))}</span>
								</div>
								<div className="pff-billing-row">
									<span className="pff-billing-label">Platform Fee</span>
									<span className="pff-billing-val">₹10</span>
								</div>
								<hr className="pff-divider-dashed" />
								<div className="pff-total-row">
									<span className="pff-total-label">Total Payable</span>
									<span className="pff-total-val">₹{(Number(selectedPackage?.packagePrice ?? cart?.package?.packagePrice ?? cart?.base_total ?? 0) + (stateTempleAddonsQty !== undefined ? templeAddons.reduce((s, a) => s + (a.lineTotal || 0), 0) : Number(cart?.addons_total ?? templeAddons.reduce((s, a) => s + (a.lineTotal || 0), 0))) + (stateHomeAddonsQty !== undefined ? homeAddons.reduce((s, a) => s + (a.lineTotal || 0), 0) : Number(cart?.home_addons_total ?? homeAddons.reduce((s, a) => s + (a.lineTotal || 0), 0))) + 10 - Number(cart?.discount || 0))}</span>
								</div>

								<button
									type="button"
									onClick={handleProceed}
									disabled={isLoading}
									style={{
										width: "100%",
										background: "linear-gradient(135deg, #f39c12 0%, #e67e22 100%)",
										color: "#ffffff",
										border: "none",
										borderRadius: "14px",
										padding: "16px 20px",
										fontSize: "16px",
										fontWeight: "700",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										gap: "10px",
										cursor: isLoading ? "not-allowed" : "pointer",
										boxShadow: "0 8px 24px rgba(230, 126, 34, 0.35)",
										marginTop: "20px",
										marginBottom: "14px",
										transition: "all 0.2s ease",
									}}
								>
									<i className="fas fa-lock" style={{ fontSize: 16 }} />
									<span>{isLoading ? "Updating Sankalp..." : "Confirm & Proceed To Payment"}</span>
									{!isLoading && <i className="fas fa-arrow-right" style={{ fontSize: 14 }} />}
								</button>

								<div className="pff-secure-banner">
									<i className="fas fa-lock" />
									<span>Your payment is secure with us</span>
								</div>
							</div>

							<div className="pff-sidebar-trust">
								{[
									{ icon: "fas fa-shield-alt", name: "Secure Payments", sub: "100% secure & trusted" },
									{ icon: "fas fa-check-circle", name: "Instant Confirmation", sub: "Booking confirmed instantly" },
									{ icon: "fas fa-headset", name: "Dedicated Support", sub: "We're here to help you 24x7" },
								].map((t, i) => (
									<div key={i} className="pff-sidebar-trust-item">
										<div className="pff-sidebar-trust-icon"><i className={t.icon} /></div>
										<div>
											<div className="pff-sidebar-trust-name">{t.name}</div>
											<div className="pff-sidebar-trust-sub">{t.sub}</div>
										</div>
									</div>
								))}
							</div>
						</div>

						<div className="pff-devotion-banner">
							<img src="/assets/img/pooja_fill/pff-devotion.png" alt="Puja" />
							<div className="pff-devotion-banner-overlay">
								<div className="pff-devotion-text">
									Every Puja is performed<br />
									with <strong>devotion &amp;</strong><br />
									<strong>authentic rituals</strong>
								</div>
							</div>
						</div>

						{/* ── SANKALP ASSURANCE CARD ── */}
						<div className="pff-summary-card" style={{ marginTop: 20, padding: "20px 24px" }}>
							<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
								<div style={{ width: 34, height: 34, borderRadius: 10, background: "#fef3f2", display: "flex", alignItems: "center", justifyContent: "center", color: "#9B1C1C", fontSize: 16 }}>
									<i className="fas fa-hands-praying" />
								</div>
								<div>
									<div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>How Sankalp Works</div>
									<div style={{ fontSize: 11, color: "#9ca3af" }}>Vedic ritual process &amp; assurance</div>
								</div>
							</div>

							<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
								<div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
									<div style={{ width: 22, height: 22, borderRadius: "50%", background: "#9B1C1C", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>1</div>
									<div style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.4 }}>
										<strong>Name &amp; Gotra Recitation:</strong> Dedicated Pandits recite your name &amp; gotra during the sacred Mahapuja.
									</div>
								</div>
								<div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
									<div style={{ width: 22, height: 22, borderRadius: "50%", background: "#9B1C1C", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>2</div>
									<div style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.4 }}>
										<strong>Live Video Recording:</strong> HD video proof of your Sankalp will be sent via WhatsApp.
									</div>
								</div>
								<div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
									<div style={{ width: 22, height: 22, borderRadius: "50%", background: "#9B1C1C", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>3</div>
									<div style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.4 }}>
										<strong>Holy Prasad Dispatch:</strong> Blessed Kumkum, Akshat &amp; Mahaprasad packed safely &amp; shipped home.
									</div>
								</div>
							</div>
						</div>

						{/* ── NEED HELP / SUPPORT CARD ── */}
						<div className="pff-summary-card" style={{ marginTop: 16, padding: "18px 20px", background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", border: "1px solid #fde68a" }}>
							<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
								<div style={{ width: 40, height: 40, borderRadius: "50%", background: "#f5a623", color: "#fff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
									<i className="fas fa-headset" />
								</div>
								<div>
									<div style={{ fontSize: 14, fontWeight: 700, color: "#78350f" }}>Questions about Sankalp?</div>
									<div style={{ fontSize: 12, color: "#92400e" }}>Call or WhatsApp support anytime for guidance</div>
								</div>
							</div>
							<div style={{ marginTop: 12, display: "flex", gap: 10 }}>
								<a
									href="https://wa.me/918881110520"
									target="_blank"
									rel="noreferrer"
									style={{ flex: 1, padding: "8px 12px", background: "#25d366", color: "#fff", borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
								>
									<i className="fab fa-whatsapp" style={{ fontSize: 14 }} /> WhatsApp Us
								</a>
								<a
									href="tel:+918881110520"
									style={{ flex: 1, padding: "8px 12px", background: "#9B1C1C", color: "#fff", borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
								>
									<i className="fas fa-phone-alt" style={{ fontSize: 12 }} /> Call Support
								</a>
							</div>
						</div>
					</div>

				</div>{/* /pff-body */}

				{/* ── TRUST STRIP ── */}
				<div className="pff-trust-strip">
					{[
						{ img: "/assets/img/pooja_fill/templefill.png", name: "Temple Verified", sub: "Authentic & Trusted" },
						{ img: "/assets/img/pooja_fill/leaf.png", name: "Pure & Authentic", sub: "Vedic Rituals" },
						{ img: "/assets/img/pooja_fill/peopleicon.png", name: "Thousands of Devotees", sub: "Trust DivinIQ" },
						{ img: "/assets/img/pooja_fill/car.png", name: "On-Time Delivery", sub: "Safe & Reliable" },
					].map((t, i) => (
						<div key={i} className="pff-trust-item">
							<div className="pff-trust-icon">
								<img src={t.img} alt={t.name} style={{ borderRadius: 10 }} />
							</div>
							<div className="pff-trust-name">{t.name}</div>
							<div className="pff-trust-sub">{t.sub}</div>
						</div>
					))}
				</div>

				<Footer />

				<OrderConfirmationModal
					isOpen={isConfirmModalOpen}
					onClose={() => setIsConfirmModalOpen(false)}
					formData={formData}				
					walletBalance={walletBalance}
					cart={cart}
					selectedPackage={selectedPackage}
					onConfirm={handleFinalSubmit}
				/>
				<StatusModal status={bookingStatus} onClose={handleStatusClose} />
			</div>
		</>
	);
};

export default PujaFillForm;