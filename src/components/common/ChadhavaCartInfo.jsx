import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from 'framer-motion';
import UserDetailsModal from "./ChadhavaUserDetailsModel";
import ScrollToTop from "./ScrollToTop";
import Footer from "../layout/Footer";
import SideMenu from "../layout/SideMenu";
import PopupSearch from "../layout/PopupSearch";
import MobileMenu from "../layout/MobileMenu";
import Header from "../layout/Header";
import apiService from "../../services/apiServices";
import ChadhavaService from "../../services/chadhavaServices";
import { useStorage } from '../../context/StorageContext';
import "../sections/Chadhavacartpage.css";

/* ══════════════════════════════════════
   IMAGE FALLBACK — Om placeholder
   Inline SVG data URI, never touches the network so it can never
   itself fail to load or trigger a retry loop.
══════════════════════════════════════ */
const IMAGE_PLACEHOLDER =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#f5ede0"/>
      <text x="50%" y="52%" font-size="70" text-anchor="middle" dominant-baseline="middle" fill="#c9962f" font-family="serif">ॐ</text>
    </svg>
  `);

// Swaps to the Om placeholder exactly once — the dataset flag rules out
// any possibility of a retry loop even if this somehow fires more than once.
const handleImgError = (e) => {
  const img = e.currentTarget;
  if (img.dataset.fallback === "done") return;
  img.dataset.fallback = "done";
  img.style.visibility = "visible";
  img.src = IMAGE_PLACEHOLDER;
};

const ChadhavaCartPage = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const [paymentMode, setPaymentMode] = useState("razorpay");
	const [errorMessage, seterrorMessage] = useState("");
	const {
		devoteeDetails: contextDevoteeDetails,
		setDevoteeDetails,
		activeChadhavaId: contextActiveChadhavaId,
		setActiveChadhavaId,
	} = useStorage();

	// --- States ---
	const [showSideMenu, setShowSideMenu] = useState(false);
	const [showMobileMenu, setShowMobileMenu] = useState(false);
	const [showSearch, setShowSearch] = useState(false);

	const [cartResponse, setCartResponse] = useState(null);
	const [loading, setLoading] = useState(true);
	const [mergedCart, setMergedCart] = useState([]);
	const [walletBalance, setWalletBalance] = useState(0);
	const [userDetails, setUserDetails] = useState(
		contextDevoteeDetails || { name: '', whatsapp: '' }
	);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [bookingStatus, setBookingStatus] = useState(null);

	// --- Coupon States ---
	const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
	const [couponCode, setCouponCode] = useState('');
	const [appliedDiscount, setAppliedDiscount] = useState(0);
	const [couponError, setCouponError] = useState('');

	const fetchCartFromServer = useCallback(async () => {
		try {
			const targetId = location.state?.chadhavaId || contextActiveChadhavaId || sessionStorage.getItem('activeChadhavaId');
			const response = await apiService.postBearer('/puja/getChadhavaCart', {});
			
			let rawData = null;
			if (response && response.status === true && Array.isArray(response.data) && response.data.length > 0) {
				if (targetId) {
					rawData = response.data.find(item => {
						const itemChadhavaId = item.chadhava_id?._id || item.chadhava_id || item._id;
						return String(itemChadhavaId) === String(targetId);
					});
				}
				// If targetId was given but not found in existing backend cart array, OR if no targetId was given
				if (!rawData) {
					const lastItem = response.data[response.data.length - 1];
					if (!targetId || String(lastItem.chadhava_id?._id || lastItem.chadhava_id) === String(targetId)) {
						rawData = lastItem;
					}
				}
			}

			// If targetId exists but backend cart array didn't have it, attempt to add targetId to cart and fetch item details
			if (!rawData && targetId) {
				try {
					await apiService.postBearer('/puja/ChadhavaaddToCart', {
						chadhava_id: targetId,
						addons_selected: [],
						prasad_selected: [],
					});
					const retryRes = await apiService.postBearer('/puja/getChadhavaCart', {});
					if (retryRes && retryRes.status === true && Array.isArray(retryRes.data) && retryRes.data.length > 0) {
						rawData = retryRes.data.find(item => {
							const itemChadhavaId = item.chadhava_id?._id || item.chadhava_id || item._id;
							return String(itemChadhavaId) === String(targetId);
						}) || retryRes.data[retryRes.data.length - 1];
					}
				} catch (e) {
					console.error('Failed to sync target Chadhava to cart:', e);
				}

				// If still not in cart array, fetch single Chadhava details directly from ChadhavaService
				if (!rawData) {
					try {
						const singleRes = await ChadhavaService.getChadhavaListById(targetId);
						if (singleRes && singleRes.status) {
							const record = singleRes.chadhava || (Array.isArray(singleRes.data) ? singleRes.data[0] : singleRes.data) || singleRes.result;
							if (record) {
								rawData = {
									chadhava_id: record,
									addons_selected: [],
									prasad_selected: [],
									total_chadhava_amount: Number(record.price || record.chadhavaPrice || 0),
									grand_total: Number(record.price || record.chadhavaPrice || 0),
								};
							}
						}
					} catch (e) {
						console.error('Failed to fetch single Chadhava details:', e);
					}
				}
			}

			if (!rawData && response && response.status === true && Array.isArray(response.data) && response.data.length > 0) {
				rawData = response.data[response.data.length - 1];
			}

			if (rawData) {
				let fullChadhava = typeof rawData.chadhava_id === 'object' ? rawData.chadhava_id : null;
				const cId = fullChadhava?._id || rawData.chadhava_id || targetId;

				if (cId) {
					try {
						const singleRes = await ChadhavaService.getChadhavaListById(cId);
						if (singleRes && singleRes.status) {
							const record = singleRes.chadhava || (Array.isArray(singleRes.data) ? singleRes.data[0] : singleRes.data) || singleRes.result;
							if (record) {
								fullChadhava = { ...record, ...fullChadhava };
							}
						}
					} catch (e) {
						console.error('Failed to fetch master Chadhava details:', e);
					}
				}

				if (fullChadhava) {
					rawData = { ...rawData, chadhava_id: fullChadhava };
				}
				setCartResponse(rawData);

				const masterAddons = rawData.chadhava_id?.addons || [];
				const masterPrasad = rawData.chadhava_id?.prasad || [];

				let addons = (rawData.addons_selected || []).map(sel => {
					const addonObj = typeof sel.addon_id === 'object' ? sel.addon_id : null;
					const selId = addonObj?._id || addonObj?.id || (typeof sel.addon_id === 'string' ? sel.addon_id : null) || sel._id || sel.id;
					const d = masterAddons.find(m => String(m._id || m.id) === String(selId)) || addonObj || {};
					const price = Number(
						d?.pamount ?? d?.price ?? d?.amount ??
						addonObj?.pamount ?? addonObj?.price ?? addonObj?.amount ??
						sel.price ?? sel.pamount ?? sel.amount ?? 0
					);
					return {
						...sel,
						addon_id: selId,
						type: 'addon',
						name: d?.pname || d?.name || d?.title || sel.name || 'Addon',
						image: d?.pimage || d?.image || sel.image,
						price: price,
						qty: Number(sel.qty || sel.quantity || 1),
					};
				});

				let prasads = (rawData.prasad_selected || []).map(sel => {
					const prasadObj = typeof sel.prasad_id === 'object' ? sel.prasad_id : null;
					const selId = prasadObj?._id || prasadObj?.id || (typeof sel.prasad_id === 'string' ? sel.prasad_id : null) || sel._id || sel.id;
					const d = masterPrasad.find(m => String(m._id || m.id) === String(selId)) || prasadObj || {};
					const price = Number(
						d?.amount ?? d?.price ?? d?.pamount ??
						prasadObj?.amount ?? prasadObj?.price ?? prasadObj?.pamount ??
						sel.price ?? sel.amount ?? sel.pamount ?? 0
					);
					return {
						...sel,
						prasad_id: selId,
						type: 'prasad',
						name: d?.name || d?.title || sel.name || 'Prasad',
						image: d?.image || sel.image,
						price: price,
						qty: Number(sel.qty || sel.quantity || 1),
					};
				});

				const allMasterAddons = [...masterAddons, ...(location.state?.chadhava?.addons || [])];
				const allMasterPrasad = [...masterPrasad, ...(location.state?.chadhava?.prasad || [])];

				// Fallback to location.state if API returned empty addons/prasads
				if (addons.length === 0 && location.state?.addonQtys && Object.keys(location.state.addonQtys).length > 0) {
					Object.entries(location.state.addonQtys).forEach(([aId, qty]) => {
						if (qty > 0 && aId !== '[object Object]') {
							const d = allMasterAddons.find(m => String(m._id || m.id) === String(aId));
							if (d) {
								addons.push({
									addon_id: aId,
									type: 'addon',
									name: d.pname || d.name || 'Addon',
									image: d.pimage || d.image,
									price: Number(d.pamount ?? d.price ?? d.amount ?? 0),
									qty: Number(qty),
								});
							}
						}
					});
				}

				if (prasads.length === 0 && location.state?.prasadQtys && Object.keys(location.state.prasadQtys).length > 0) {
					Object.entries(location.state.prasadQtys).forEach(([pId, qty]) => {
						if (qty > 0 && pId !== '[object Object]') {
							const d = allMasterPrasad.find(m => String(m._id || m.id) === String(pId));
							if (d) {
								prasads.push({
									prasad_id: pId,
									type: 'prasad',
									name: d.name || 'Prasad',
									image: d.image,
									price: Number(d.amount ?? d.price ?? d.pamount ?? 0),
									qty: Number(qty),
								});
							}
						}
					});
				}

				setMergedCart([...addons, ...prasads]);
				if (rawData.chadhava_id?._id) {
					setActiveChadhavaId(rawData.chadhava_id._id);
				}
			} else {
				setCartResponse(null);
				setMergedCart([]);
			}
		} catch (error) {
			console.error('Cart fetch error:', error);
		} finally {
			setLoading(false);
		}
	}, [location.state, contextActiveChadhavaId, setActiveChadhavaId]);
	const fetchWalletBalance = useCallback(async () => {
		try {
			const res = await apiService.getBearer('/user_api/get_profile');
			if (res?.status && res?.results) {
				setWalletBalance(Number(res.results.wallet || 0));
			}
		} catch (error) {
			console.error('Wallet balance fetch error:', error);
		}
	}, []);

	const loadRazorpay = () => {
		return new Promise((resolve) => {
			const script = document.createElement("script");
			script.src = "https://checkout.razorpay.com/v1/checkout.js";
			script.onload = () => resolve(true);
			script.onerror = () => resolve(false);
			document.body.appendChild(script);
		});
	};

	useEffect(() => {
		fetchCartFromServer();
		fetchWalletBalance();
		if (contextDevoteeDetails?.name) setUserDetails(contextDevoteeDetails);
	}, [fetchCartFromServer, fetchWalletBalance]);

	const handleQtyChange = async (item, delta) => {
		const newQty = (item.qty || 0) + delta;
		if (newQty < 0) return;
		const tempCart = mergedCart
			.map(i => {
				const isTarget =
					i.type === 'addon'
						? i.addon_id === item.addon_id
						: i.prasad_id === item.prasad_id;
				return isTarget ? { ...i, qty: newQty } : i;
			})
			.filter(i => i.qty > 0);
		setMergedCart(tempCart);
		const activeId = cartResponse?.chadhava_id?._id || location.state?.chadhavaId || contextActiveChadhavaId;
		try {
			const payload = {
				chadhava_id: activeId,
				addons_selected: tempCart
					.filter(i => i.type === 'addon')
					.map(i => ({ addon_id: i.addon_id, qty: i.qty })),
				prasad_selected: tempCart
					.filter(i => i.type === 'prasad')
					.map(i => ({ prasad_id: i.prasad_id, qty: i.qty })),
			};
			const res = await apiService.postBearer(
				'/puja/ChadhavaaddToCart',
				payload
			);
			if (res && res.status) fetchCartFromServer();
		} catch (e) {
			fetchCartFromServer();
		}
	};

	const handlePayNow = async () => {
		const nameToUse = userDetails?.name || contextDevoteeDetails?.name || 'Devotee';
		const whatsappToUse = userDetails?.whatsapp || contextDevoteeDetails?.whatsapp || '';
		const activeId = cartResponse?.chadhava_id?._id || location.state?.chadhavaId || contextActiveChadhavaId;

		if (paymentMode === 'wallet' && walletBalance < totalAmount) {
			alert(`Insufficient wallet balance!\nYour wallet balance is ₹${walletBalance}, but total payable is ₹${totalAmount}.\n\nPlease select Online Payment (UPI / Card) or recharge your wallet.`);
			return;
		}

		try {
			const payload = {
				chadhava_id: activeId,
				addons_selected: mergedCart
					.filter(i => i.type === 'addon')
					.map(i => ({ addon_id: i.addon_id, qty: i.qty })),
				prasad_selected: mergedCart
					.filter(i => i.type === 'prasad')
					.map(i => ({ prasad_id: i.prasad_id, qty: i.qty })),
				payment_mode: paymentMode,
				userDetails: { name: nameToUse, whatsapp: whatsappToUse },
			};
			const res = await apiService.postBearer(
				'/puja/createChadhavaBooking',
				payload
			);
			const isSuccess = res?.status === true || res?.status === "success" || res?.status === 200 || res?.success === true || !!res?.orderId || !!res?.order_id || !!res?.booking?._id || !!res?.results?._id;
			if (isSuccess) {
				if (paymentMode === 'razorpay') {
					const razorpayLoaded = await loadRazorpay();
					if (!razorpayLoaded) {
						alert("Razorpay SDK failed to load");
						return;
					}
					const orderId = res.orderId || res.order_id || res.id;
					let isPaymentDone = false;
					const redirectTarget = window.location.origin + '/my_chadhava_booking';
					const options = {
						key: res?.key || res?.results?.key || "rzp_live_TdTaMRFmlmWrMf",
						amount: res.amount,
						currency: "INR",
						name: "vaidikguru",
						description: "Puja Booking Payment",
						order_id: orderId,
						callback_url: redirectTarget,
						redirect: false,
						handler: function () {
							isPaymentDone = true;
							try { fetchWalletBalance(); } catch (err) { console.error(err); }
							window.location.replace(redirectTarget);
						},
						prefill: {
							name: nameToUse,
							contact: whatsappToUse,
						},
						theme: {
							color: "#7B1F3A",
						},
						modal: {
							ondismiss: function () {
								if (isPaymentDone) {
									window.location.replace(redirectTarget);
								}
							}
						}
					};

					const rzp = new window.Razorpay(options);
					rzp.open();
					return;
				}
				// For other payment modes (e.g. Wallet), update payment status via API and redirect
				else {
					const bookingId = res.orderId || res.order_id || res.id || res.chadhava_booking_id || res.booking?._id || res.results?._id;
					if (bookingId) {
						try {
							await apiService.getBearer(`/puja/chadhava_payment_status/${bookingId}`);
						} catch (err) {
							console.error("Failed to update wallet payment status:", err);
						}
					}
					try { fetchWalletBalance(); } catch (err) { console.error(err); }
					window.location.replace('/my_chadhava_booking');
				}
			} else {
				alert(res?.message || "Chadhava booking failed. Please try again.");
			}
		} catch (e) {
			alert("Something went wrong while processing offering.");
		}
	};
	const verifyPayment = async (paymentResponse) => {
		try {
			const data = await apiService.getBearer(`/puja/chadhava_payment_status/${paymentResponse}`);

			if (data?.payment_status === "Success") {
				setBookingStatus(null);
				window.location.href = '/my_chadhava_booking';
			}

			if (data?.payment_status === "Failed") {
				setBookingStatus('failed');
			}
			return data?.payment_status;
		} catch (e) {
			return null;
		}
	};


	const applyCoupon = () => {
		if (!couponCode || !couponCode.trim()) {
			setCouponError('Please enter a coupon code.');
			return;
		}
		if (couponCode.trim().toUpperCase() === 'FIRST100') {
			setAppliedDiscount(100);
			setCouponError('');
			setIsCouponModalOpen(false);
		} else {
			setCouponError('Invalid Coupon Code');
		}
	};

	const closeStatusModal = () => {
		setBookingStatus(null);
		window.location.href = '/my_chadhava_booking';
	};

	// --- Sub-Components ---
	const StatusModal = ({ status, onClose, desc = "Unable to process payment. Please try again." }) => {
		if (!status) return null;
		const config = {
			pending: {
				icon: 'fas fa-fire',
				title: 'Confirming Sankalp',
				desc: 'Connecting with the temple server...',
				color: '#F5A623',
				ring: true,
			},
			success: {
				icon: 'fas fa-check',
				title: 'Offering Booked Successfully!',
				desc: 'Your Sankalp has been registered successfully. May you be blessed. 🙏',
				color: '#0b845c',
				btn: 'Done',
			},
			failed: {
				icon: 'fas fa-times',
				title: 'Transaction Failed',
				desc: desc,
				color: '#B33A3A',
				btn: 'Retry',
			},
		};
		const current = config[status];

		return (
			<div className="diviniq-modal-overlay">
				<motion.div
					initial={{ y: 50, opacity: 0, scale: 0.95 }}
					animate={{ y: 0, opacity: 1, scale: 1 }}
					transition={{ duration: 0.35, ease: 'easeOut' }}
					className="diviniq-modal-card text-center"
				>
					{/* Hanging diyas — decorative, success state only */}
					{(status === 'success' || status === 'failed' || status === 'pending') && (
						<div className="diviniq-hang-diyas">
							<img src="/assets/img/chadawa_detail/diya_chadhawa.png" alt="" className="diviniq-diya diviniq-diya-1" />
							<img src="/assets/img/chadawa_detail/diya_chadhawa.png" alt="" className="diviniq-diya diviniq-diya-2" />
						</div>
					)}

					{/* Close button */}
					<button className="diviniq-close-btn" onClick={onClose} aria-label="Close">
						<i className="fas fa-times"></i>
					</button>

					{/* Badge with mandala ring */}
					<div className="diviniq-badge-wrap">
						<div className="diviniq-mandala" />
						<div
							className="diviniq-icon-wrap"
							style={{ borderColor: current.color, color: current.color }}
						>
							{current.ring && (
								<motion.div
									className="diviniq-icon-ring"
									animate={{ rotate: 360 }}
									transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
								/>
							)}
							<i className={current.icon} style={{ fontSize: '30px' }}></i>
						</div>
					</div>

					<h3 className="diviniq-title">{current.title}</h3>

					<div className="diviniq-lotus-divider">
						<span className="line" />
						<i className="fas fa-spa"></i>
						<span className="line" />
					</div>

					<p className="diviniq-desc">{current.desc}</p>

					{(status === 'success' || status === 'failed' || status === 'pending') && (
						<img
							src="/assets/img/chadawa_detail/kalashchadawa.png"
							alt="Kalash offering"
							className="diviniq-kalash-img"
							onError={(e) => { e.target.style.display = 'none'; }}
						/>
					)}

					{current.btn && (
						<button
							className="diviniq-btn"
							style={{ background: current.color }}
							onClick={onClose}
						>
							<span className="diviniq-btn-dots">
								<i className="fas fa-gem"></i>
							</span>
							{current.btn}
							<span className="diviniq-btn-dots">
								<i className="fas fa-gem"></i>
							</span>
						</button>
					)}
				</motion.div>
			</div>
		);
	};

	const EmptyCartView = () => (
		<div className="cc-empty">
			<div className="cc-empty-hang-diyas">
				<img src="/assets/img/chadawa_detail/diya_chadhawa.png" alt="" className="diviniq-diya diviniq-diya-1" />
				<img src="/assets/img/chadawa_detail/diya_chadhawa.png" alt="" className="diviniq-diya diviniq-diya-2" />
			</div>

			<div className="cc-empty-art">
				<div className="diviniq-mandala" />
				<img
					src="/assets/img/chadawa_detail/kalashchadawa-removebg-preview.png"
					alt="Empty offering bowl"
					onError={(e) => { e.target.style.display = 'none'; }}
				/>
			</div>

			<h2>Your Offering Bowl is Empty</h2>

			<div className="diviniq-lotus-divider">
				<span className="line" />
				<i className="fas fa-spa"></i>
				<span className="line" />
			</div>

			<p>Add sacred sevas and prasad to begin your spiritual journey.</p>

			<Link to="/chadhava" className="cc-empty-btn">
				<span className="diviniq-btn-dots"><i className="fas fa-gem"></i></span>
				Explore Offerings
				<i className="fas fa-arrow-right ms-1"></i>
			</Link>
		</div>
	);

	const formatINR = (n) => (Number(n) || 0).toLocaleString('en-IN');

	const mainChadhavaPrice = Number(
		cartResponse?.chadhava_id?.price ??
		cartResponse?.chadhava_id?.offer_price ??
		cartResponse?.chadhava_id?.chadhavaPrice ??
		cartResponse?.chadhava_id?.amount ??
		cartResponse?.chadhava_id?.chadhava_price ??
		cartResponse?.chadhava_id?.pamount ??
		(cartResponse?.total_chadhava_amount > 0 ? cartResponse?.total_chadhava_amount : null) ??
		(cartResponse?.chadhava_amount > 0 ? cartResponse?.chadhava_amount : null) ??
		0
	);

	const itemsCalculatedSum = mergedCart.reduce((sum, item) => {
		const itemPrice = Number(item.price) || 0;
		const itemQty = Number(item.qty) || 1;
		return sum + (itemPrice * itemQty);
	}, 0);

	const calculatedTotal = mainChadhavaPrice + itemsCalculatedSum;

	const subtotal = calculatedTotal > 0
		? calculatedTotal
		: Number(cartResponse?.grand_total || cartResponse?.total_amount || 0);

	const platformFee = Number(cartResponse?.platform_fee ?? cartResponse?.platformFee ?? 10);
	const totalAmount = Math.max(0, subtotal - appliedDiscount + platformFee);

	return (
			<div className="main-wrapper bg-white">
			<ScrollToTop />
			<SideMenu isOpen={showSideMenu} onClose={() => setShowSideMenu(false)} />
			<PopupSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
			<MobileMenu isOpen={showMobileMenu} onClose={() => setShowMobileMenu(false)} />
			<Header
				onMenuToggle={() => setShowMobileMenu(true)}
				onSideMenuToggle={() => setShowSideMenu(true)}
				onSearchToggle={() => setShowSearch(true)}
			/>

			{/* ── HERO ── */}
			<div className="cc-hero">
				<div className="cc-hero-overlay" />
				<h2 className="cc-hero-title">
					Sacred <span>Checkout</span>
				</h2>
				<div className="cc-hero-divider">
					<span className="line" />
					<i className="fas fa-asterisk" />
					<span className="line" />
				</div>
				<p className="cc-hero-sub">
					Review your offerings and complete your divine journey
				</p>
				<div className="cc-hero-wave" />
			</div>

			<div className="container cc-body">
				{loading ? (
					<div className="text-center py-5 my-5">
						<div className="spinner-border text-warning" role="status" style={{ width: '3rem', height: '3rem', color: '#ff6b00' }}>
							<span className="visually-hidden">Loading...</span>
						</div>
						<h5 className="mt-3 text-muted fw-semibold">Loading your sacred offerings...</h5>
					</div>
				) : !cartResponse ? (
					<EmptyCartView />
				) : (
					<>
						<div className="row g-4">
							<div className="col-lg-8">
								{/* Devotee Info */}
								<div className="cc-devotee-card">
									<div className="cc-devotee-icon">
										<i className="fas fa-user"></i>
									</div>
									<div className="cc-devotee-info">
										<span>Devotee Details</span>
										<h5>{userDetails.name}</h5>
									</div>
									<button
										className="cc-change-btn"
										onClick={() => setIsEditModalOpen(true)}
									>
										Change
									</button>
								</div>

								{/* Offerings List */}
								<div className="cc-section-title">
									<i className="fas fa-spa"></i> Your Offerings
								</div>

								<div className="cc-offering-card">
									<img
										src={cartResponse.chadhava_id?.chadhavaImage || cartResponse.chadhava_id?.image}
										alt=""
										onError={handleImgError}
									/>
									<div className="cc-offering-info">
										<h6>{cartResponse.chadhava_id?.title || cartResponse.chadhava_id?.name || "Chadhava Offering"}</h6>
									</div>
									<div className="cc-offering-price">
										₹{formatINR(mainChadhavaPrice)}
									</div>
								</div>

								{mergedCart.map((item, idx) => (
									<div key={idx} className="cc-item-card">
										<img
											src={item.image}
											alt=""
											onError={handleImgError}
										/>
										<div className="cc-item-info">
											<h6>{item.name}</h6>
											<div className="cc-item-meta">
												<span className="cc-item-price">₹{formatINR(item.price)}</span>
												<span className="cc-item-type">| {item.type?.toUpperCase()}</span>
											</div>
										</div>
										<div className="cc-qty-stepper">
											<button onClick={() => handleQtyChange(item, -1)}>−</button>
											<span>{item.qty}</span>
											<button onClick={() => handleQtyChange(item, 1)}>+</button>
										</div>
									</div>
								))}

								{/* Coupon Trigger */}
								<div className="cc-coupon-row" onClick={() => setIsCouponModalOpen(true)}>
									<div className="cc-coupon-left">
										<div className="cc-coupon-icon">
											<i className="fas fa-tag"></i>
										</div>
										<div>
											<h6>
												{appliedDiscount > 0
													? `Code FIRST100 Applied`
													: 'Apply Coupon Code'}
											</h6>
											<p>Save more on your sacred offerings</p>
										</div>
									</div>
									<i className="fas fa-chevron-right"></i>
								</div>
							</div>

							<div className="col-lg-4">
								<div className="cc-summary-wrap">
									<div className="cc-summary-card">
										<div className="cc-summary-title">
											<div className="cc-summary-icon">
												<i className="fas fa-shopping-bag"></i>
											</div>
											<h5>Order Summary</h5>
										</div>

										<div className="cc-summary-row">
											<span>Chadhava Amount</span>
											<span>₹{formatINR(mainChadhavaPrice)}</span>
										</div>
										{mergedCart.map((item, idx) => (
											<div key={idx} className="cc-summary-row" style={{ fontSize: '13px', color: '#666' }}>
												<span>{item.name} {item.qty > 1 ? `(x${item.qty})` : ''}</span>
												<span>₹{formatINR(Number(item.price) * Number(item.qty || 1))}</span>
											</div>
										))}
										<div className="cc-summary-row" style={{ fontWeight: 600 }}>
											<span>Subtotal</span>
											<span>₹{formatINR(subtotal)}</span>
										</div>
										{platformFee > 0 && (
											<div className="cc-summary-row">
												<span>Platform Fee</span>
												<span>₹{formatINR(platformFee)}</span>
											</div>
										)}
										{appliedDiscount > 0 && (
											<div className="cc-summary-row discount">
												<span>Coupon Discount</span>
												<span>-₹{formatINR(appliedDiscount)}</span>
											</div>
										)}

										<div className="cc-summary-total">
											<h4>Total Pay</h4>
											<h3>₹{formatINR(totalAmount)}</h3>
										</div>

										<div className="cc-payment-box">
											<div className="cc-payment-label">
												<span className="line" /> Select Payment Mode
											</div>

											<label className={`cc-payment-opt${paymentMode === 'razorpay' ? ' active' : ''}`}>
												<span className="cc-radio" />
												<input
													type="radio" name="paymentMode" hidden
													checked={paymentMode === "razorpay"}
													onChange={() => setPaymentMode("razorpay")}
												/>
												Online Payment (UPI / Card)
											</label>

											<label className={`cc-payment-opt${paymentMode === 'wallet' ? ' active' : ''}`}>
												<span className="cc-radio" />
												<input
													type="radio" name="paymentMode" hidden
													checked={paymentMode === "wallet"}
													onChange={() => setPaymentMode("wallet")}
												/>
												Vaidik Wallet <span className="cc-wallet-amt">₹{formatINR(walletBalance)}</span>
											</label>
										</div>

										<button className="cc-pay-btn" onClick={handlePayNow}>
											Proceed To Pay <i className="fas fa-lock"></i>
										</button>
									</div>
								</div>
							</div>
						</div>

						{/* ── TRUST STRIP ── */}
						<div className="cc-trust">
							{[
								{ icon: 'fas fa-shield-alt', label: '100% Secure & Trusted Payments' },
								{ icon: 'fas fa-spa', label: 'Pure & Authentic Rituals' },
								{ icon: 'fas fa-bolt', label: 'Instant Confirmation & Updates' },
								{ icon: 'fas fa-hands-praying', label: 'Divine Blessings Guaranteed' },
							].map((t, i) => (
								<div key={i} className="cc-trust-item">
									<div className="cc-trust-ico"><i className={t.icon}></i></div>
									<span>{t.label}</span>
								</div>
							))}
						</div>
					</>
				)}
			</div>

			{/* --- Modals --- */}
			<StatusModal status={bookingStatus} desc="" onClose={closeStatusModal} />
			<UserDetailsModal
				isOpen={isEditModalOpen}
				onClose={() => {
					setIsEditModalOpen(false);
					fetchCartFromServer();
				}}
				cart={mergedCart}
				page="chadhava"
			/>

			{/* --- Coupon Modal --- */}
			<AnimatePresence>
				{isCouponModalOpen && (
					<div
						className="diviniq-modal-overlay"
						onClick={() => setIsCouponModalOpen(false)}
					>
						<motion.div
							initial={{ scale: 0.9, opacity: 0, y: 20 }}
							animate={{ scale: 1, opacity: 1, y: 0 }}
							exit={{ scale: 0.9, opacity: 0, y: 20 }}
							className="diviniq-modal-card p-4 text-center position-relative"
							style={{ maxWidth: '420px', height: 'auto', background: '#ffffff', color: '#1f1320' }}
							onClick={e => e.stopPropagation()}
						>
							<button
								type="button"
								className="diviniq-close-btn"
								onClick={() => setIsCouponModalOpen(false)}
								aria-label="Close"
							>
								<i className="fas fa-times"></i>
							</button>

							<div
								className="d-flex align-items-center justify-content-center mx-auto mb-3"
								style={{
									width: '56px',
									height: '56px',
									borderRadius: '50%',
									background: 'rgba(123, 31, 58, 0.1)',
									color: '#7B1F3A',
									fontSize: '22px',
								}}
							>
								<i className="fas fa-tags"></i>
							</div>

							<h4 className="fw-bold mb-1" style={{ color: '#7B1F3A', fontFamily: 'Cormorant Garamond, serif', fontSize: '24px' }}>
								Apply Coupon
							</h4>
							<p className="small mb-4" style={{ color: '#4a3b32', fontSize: '13.5px' }}>
								Enter your coupon code to receive discounts on your sacred offerings.
							</p>

							<div className="form-group mb-2">
								<input
									type="text"
									className={`form-control text-center py-3 rounded-pill fw-bold text-uppercase ${couponError ? 'is-invalid' : ''}`}
									style={{
										letterSpacing: '2px',
										borderColor: couponError ? '#dc3545' : '#d7c8b0',
										fontSize: '15px',
										color: '#1f1320',
										background: '#fdf8f2',
									}}
									placeholder="Enter Code (e.g. FIRST100)"
									value={couponCode}
									onChange={e => {
										setCouponCode(e.target.value);
										if (couponError) setCouponError('');
									}}
								/>
							</div>

							{couponError && (
								<motion.div
									initial={{ opacity: 0, y: -5 }}
									animate={{ opacity: 1, y: 0 }}
									className="text-danger small fw-bold mb-3 d-flex align-items-center justify-content-center gap-1"
								>
									<i className="fas fa-exclamation-circle"></i> {couponError}
								</motion.div>
							)}

							{/* Quick Coupon Badge */}
							<div className="d-flex align-items-center justify-content-center gap-2 mb-4">
								<span className="small fw-semibold" style={{ color: '#4a3b32' }}>Available:</span>
								<button
									type="button"
									className="btn btn-sm fw-bold rounded-pill px-3 py-1"
									style={{
										fontSize: '12px',
										border: '1.5px dashed #7B1F3A',
										background: '#FFF8ED',
										color: '#7B1F3A',
									}}
									onClick={() => {
										setCouponCode('FIRST100');
										setCouponError('');
									}}
								>
									<i className="fas fa-ticket-alt me-1 text-danger"></i> FIRST100
								</button>
							</div>

							<button
								type="button"
								className="cc-pay-btn mt-0 w-100"
								style={{ borderRadius: '999px', padding: '14px' }}
								onClick={applyCoupon}
							>
								Apply Code <i className="fas fa-arrow-right ms-1"></i>
							</button>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			<Footer />
		</div>
	);
};

export default ChadhavaCartPage;