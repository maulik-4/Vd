import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import LoginOTPModal from '../accounts/LoginOTPModel';
import { useStorage } from '../../context/StorageContext';
import { useLanguage } from '../../context/LanguageContext';

import styles from './Header.module.css';

const Header = ({ onMenuToggle, onSideMenuToggle, onSearchToggle }) => {
	const location = useLocation();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [isLangOpen, setIsLangOpen] = useState(false);
	const { activeLang, setLanguage, LANGUAGES } = useLanguage();
	const { user, isLoggedIn, clearStorage } = useStorage();
	const dropdownRef = useRef(null);
	const langRef = useRef(null);

	const handleEmailClick = () => {
		window.open("mailto:support@vaidikguru.store", "_blank");
	};

	const handleWhatsappClick = () => {
		window.open(
			"https://wa.me/8881110520?text=Hello%20I%20am%20interested",
			"_blank"
		);
	};

	// Close user dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = event => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setIsDropdownOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	// Close language dropdown when clicking outside
	useEffect(() => {
		const handleClickOutsideLang = event => {
			if (langRef.current && !langRef.current.contains(event.target)) {
				setIsLangOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutsideLang);
		return () => {
			document.removeEventListener('mousedown', handleClickOutsideLang);
		};
	}, []);

	const handleLogoutClick = () => {
		setIsDropdownOpen(false);
		setShowLogoutConfirm(true);
	};

	const handleLogoutConfirm = () => {
		clearStorage();
		setShowLogoutConfirm(false);
		window.location.href = '/';
	};

	const handleLogoutCancel = () => {
		setShowLogoutConfirm(false);
	};

	const getUserInitial = name => {
		return name ? name.charAt(0).toUpperCase() : 'U';
	};

	const fixImageUrl = (url) => {
		if (!url) return "";
		const unescaped = url.replace(/&#x2F;/g, "/");
		let fixed = unescaped.replace('admin.astrogurujii.com', 'admin.vaidikguru.com');
		if (!fixed.startsWith('http://') && !fixed.startsWith('https://')) {
			fixed = `https://admin.vaidikguru.com/${fixed.replace(/^\/+/, '')}`;
		}
		return fixed;
	};

	const handleLangSelect = (lang) => {
		setLanguage(lang.code);
		setIsLangOpen(false);
	};

	return (
		<>
			{/* ── scoped styles: font/logo optimization, mobile reorder,
			     language switcher — unique "dqh-" prefix, no conflicts ── */}
			<style>{`
				/* ── Full width + height fix ──
				   Breaks the header out of any parent wrapper's
				   padding/margin using the 100vw full-bleed trick,
				   since width:100% only fills the parent's own
				   (possibly already-narrowed) box, not the viewport. */
				.th-header, .sticky-wrapper {
					width: 100% !important;
					max-width: 100% !important;
				}
				.menu-area {
					width: 100vw !important;
					max-width: 100vw !important;
					margin-left: calc(-50vw + 50%) !important;
					margin-right: calc(-50vw + 50%) !important;
					position: relative;
					left: 0;
				}
				.menu-area .container-xxl.th-container {
					width: 100% !important;
					max-width: 100% !important;
					margin: 0 !important;
					padding-left: 32px !important;
					padding-right: 32px !important;
					box-sizing: border-box;
				}
				.menu-area .dqh-header-row.row {
					margin-left: 0 !important;
					margin-right: 0 !important;
					width: 100% !important;
				}
				.menu-area .dqh-header-row.row > .col-auto {
					padding-left: 0;
					padding-right: 0;
				}
				.menu-area .dqh-action-col {
					padding-right: 0 !important;
					margin-right: 0 !important;
				}
				.menu-area {
					min-height: 92px;
					display: flex;
					align-items: center;
				}
				html, body {
					overflow-x: hidden;
				}

				@media (max-width: 1199px) {
					.menu-area .container-xxl.th-container {
						padding-left: 20px !important;
						padding-right: 20px !important;
					}
				}
				@media (max-width: 480px) {
					.menu-area .container-xxl.th-container {
						padding-left: 14px !important;
						padding-right: 14px !important;
					}
				}

				.dqh-logo-col .main-header-divinlogo {
					max-height: 50px;
					width: auto !important;
					object-fit: contain;
				}
				.dqh-nav-col {
					margin-left: 36px;
				}
				.dqh-nav-col .main-menu ul {
					display: flex;
					align-items: center;
					gap: 0px;
					margin: 0;
					padding: 0;
					list-style: none;
				}
				.dqh-nav-col .main-menu ul li a {
					font-size: 14.5px;
					font-weight: 500;
					padding: 8px 5px;
					white-space: nowrap;
				}

				/* Language switcher */
				.dqh-lang {
					position: relative;
					margin-right: 10px;
				}
				.dqh-lang-btn {
					display: flex;
					align-items: center;
					gap: 6px;
					background: #fff;
					border: 1.5px solid rgba(123,28,56,0.25);
					border-radius: 50px;
					padding: 8px 12px;
					font-size: 13px;
					font-weight: 600;
					cursor: pointer;
					color: #7B1C38;
					transition: border-color .2s ease, background .2s ease, color .2s ease;
				}
				.dqh-lang-btn i.fa-globe {
					color: #7B1C38;
				}
				.dqh-lang-btn:hover {
					border-color: #7B1C38;
					background: #7B1C38;
					color: #fff;
				}
				.dqh-lang-btn:hover i.fa-globe {
					color: #fff;
				}
				.dqh-lang-dropdown {
					position: absolute;
					top: calc(100% + 8px);
					right: 0;
					background: #fff;
					border: 1px solid #eee;
					border-radius: 12px;
					box-shadow: 0 10px 30px rgba(0,0,0,0.12);
					min-width: 150px;
					padding: 6px;
					z-index: 1200;
				}
				.dqh-lang-option {
					display: flex;
					align-items: center;
					justify-content: space-between;
					width: 100%;
					background: none;
					border: none;
					text-align: left;
					padding: 9px 10px;
					font-size: 13.5px;
					border-radius: 8px;
					cursor: pointer;
					color: #222;
				}
				.dqh-lang-option:hover { background: #f7f2f4; }
				.dqh-lang-option.active { color: #7B1C38; font-weight: 700; }

				/* Header row layout hooks */
				.dqh-header-row {
					display: flex;
					align-items: center;
					justify-content: space-between;
				}

				/* ── Mobile: hamburger left, logo centered ── */
				@media (max-width: 1199px) {
					.menu-area {
						min-height: 72px;
					}
					.dqh-header-row {
						position: relative;
					}
					.dqh-nav-col {
						order: 1;
						margin-left: 0;
					}
					.dqh-logo-col {
						order: 2;
						position: absolute;
						left: 50%;
						transform: translateX(-50%);
					}
					.dqh-action-col {
						order: 3;
						margin-left: auto;
					}
					.dqh-logo-col .main-header-divinlogo {
						max-height: 34px;
					}
					.dqh-lang-btn span.dqh-lang-text {
						display: none;
					}
					.dqh-lang-btn {
						padding: 8px;
						border-radius: 50%;
						width: 38px;
						height: 38px;
						justify-content: center;
					}
				}
				@media (max-width: 480px) {
					.menu-area {
						min-height: 64px;
					}
					.dqh-logo-col .main-header-divinlogo {
						max-height: 28px;
					}
				}

				/* ── Themed hamburger toggle ── */
				.dqh-menu-toggle {
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					gap: 5px;
					width: 42px;
					height: 42px;
					border-radius: 12px;
					background: linear-gradient(135deg, #7B1C38, #9B1C3A);
					border: none;
					cursor: pointer;
					box-shadow: 0 4px 14px rgba(123,28,56,0.28);
					transition: transform .2s ease, box-shadow .2s ease;
				}
				.dqh-menu-toggle:hover {
					transform: translateY(-1px);
					box-shadow: 0 6px 18px rgba(123,28,56,0.35);
				}
				.dqh-menu-toggle span {
					display: block;
					width: 20px;
					height: 2px;
					border-radius: 2px;
					background: #fff;
					transition: all .25s ease;
				}
				.dqh-menu-toggle span:nth-child(2) {
					width: 14px;
					align-self: flex-start;
					margin-left: 11px;
				}
			`}</style>

			<header className="th-header header-layout1">
				<div className="sticky-wrapper">
					{/* Main Menu Area */}
					<div className="menu-area">
						<div className="container-xxl th-container">
							<div className="row align-items-center justify-content-between flex-nowrap dqh-header-row">
								<div className="col-auto dqh-logo-col">
									<div className="header-logo">
										<Link to="/">
											<img className='main-header-divinlogo w-md-100 w-75' src="/assets/img/logo1234.jpeg" alt="DivinIQ" />
										</Link>
									</div>
								</div>
								<div className="col-auto dqh-nav-col">
									<nav className="main-menu d-none d-xl-inline-block px-0">
										<ul>
											<li>
												<Link
													className={location.pathname === '/' ? 'dqh-active' : ''}
													to="/"
												>
													Home
												</Link>
											</li>
											<li>
												<Link
													className={location.pathname.startsWith('/about_us') ? 'dqh-active' : ''}
													to="/about_us"
												>
													About Us
												</Link>
											</li>
											<li>
												<Link
													className={location.pathname.startsWith('/puja') ? 'dqh-active' : ''}
													to="/puja"
												>
													Puja
												</Link>
											</li>
											<li>
												<Link
													className={location.pathname.startsWith('/chadhava') ? 'dqh-active' : ''}
													to="/chadhava"
												>
													Chadhava
												</Link>
											</li>
											<li>
												<Link
													className={location.pathname.startsWith('/astrologer') ? 'dqh-active' : ''}
													to="/astrologer"
												>
													Consult With Astrologer
												</Link>
											</li>
											<li>
												<Link
													className={location.pathname.startsWith('/live-astrologer') || location.pathname.startsWith('/live/') ? 'dqh-active' : ''}
													to="/live-astrologer"
												>
													Live Astrologers
												</Link>
											</li>
											<li>
												<Link
													className={location.pathname.startsWith('/panchang') ? 'dqh-active' : ''}
													to="/panchang"
												>
													Panchang
												</Link>
											</li>

											<li>
												<Link
													className={location.pathname.startsWith('/astrology_calculator_hub') ? 'dqh-active' : ''}
													to="/astrology_calculator_hub"
												>
													Astrology Tools
												</Link>
											</li>

											{/* <li>
												<Link
													className={location.pathname.startsWith('/horoscope') ? 'dqh-active' : ''}
													to="/horoscope"
												>
													Horoscope
												</Link>
											</li> */}
										</ul>
									</nav>
									<button
										type="button"
										className="th-menu-toggle d-block d-xl-none"
										onClick={onMenuToggle}
									>
										<i className="far fa-bars"></i>
									</button>
								</div>
								<div className="col-auto dqh-action-col">
									<div className="header-button d-flex align-items-center">

										{/* ── Language Switcher ── */}
										<div className="dqh-lang" ref={langRef}>
											<button
												type="button"
												className="dqh-lang-btn"
												onClick={() => setIsLangOpen(!isLangOpen)}
											>
												<i className="fas fa-globe"></i>
												<span className="dqh-lang-text">{activeLang.label}</span>
											</button>

											{isLangOpen && (
												<div className="dqh-lang-dropdown">
													{LANGUAGES.map((lang) => (
														<button
															key={lang.code}
															className={`dqh-lang-option ${activeLang.code === lang.code ? 'active' : ''}`}
															onClick={() => handleLangSelect(lang)}
														>
															{lang.label}
															{activeLang.code === lang.code && (
																<i className="fas fa-check" style={{ fontSize: 11 }}></i>
															)}
														</button>
													))}
												</div>
											)}
										</div>

										{isLoggedIn && user ? (
											<div className={styles.userMenu} ref={dropdownRef}>
												<button
													className={styles.userBtn}
													onClick={() => setIsDropdownOpen(!isDropdownOpen)}
												>
													{user.profile_img ? (
														<img
															src={fixImageUrl(user.profile_img)}
															alt="User"
															style={{
																width: "100%",
																height: "100%",
																minWidth: "100%",
																minHeight: "100%",
																maxWidth: "100%",
																maxHeight: "100%",
																borderRadius: "50%",
																objectFit: "cover",
																display: "block"
															}}
														/>
													) : (
														<span className={styles.userInitial}>
															{getUserInitial(user.name)}
														</span>
													)}
												</button>

												{isDropdownOpen && (
													<div className={styles.dropdown}>
														<div className={styles.userInfo}>
															<p className={styles.userName}>
																{user.name || 'User'}
															</p>
															<p className={styles.userPhone}>
																{user.number || user.phone}
															</p>
														</div>
														<div className={styles.menuList}>

															{/* 1. Notification */}
															<Link
																to="/notification"
																className={styles.menuItem}
																onClick={() => setIsDropdownOpen(false)}
															>
																<div className={styles.menuItemLeft}>
																	<i className={`fas fa-star ${styles.menuIcon}`}></i>
																	Notification
																</div>
																<i className={`fas fa-chevron-right ${styles.chevron}`}></i>
															</Link>

															{/* 2. My Profile */}
															<Link
																to="/profile"
																className={styles.menuItem}
																onClick={() => setIsDropdownOpen(false)}
															>
																<div className={styles.menuItemLeft}>
																	<i className={`fas fa-user ${styles.menuIcon}`}></i>
																	My profile
																</div>
																<i className={`fas fa-chevron-right ${styles.chevron}`}></i>
															</Link>

															{/* 3. My Wallet */}
															<Link
																to="/wallet"
																className={styles.menuItem}
																onClick={() => setIsDropdownOpen(false)}
															>
																<div className={styles.menuItemLeft}>
																	<i className={`fas fa-wallet ${styles.menuIcon}`}></i>
																	My Wallet
																</div>
																<i className={`fas fa-chevron-right ${styles.chevron}`}></i>
															</Link>

															{/* 4. My Orders */}
															<Link
																to="/orders"
																className={styles.menuItem}
																onClick={() => setIsDropdownOpen(false)}
															>
																<div className={styles.menuItemLeft}>
																	<i className={`fas fa-wallet ${styles.menuIcon}`}></i>
																	My Orders
																</div>
																<i className={`fas fa-chevron-right ${styles.chevron}`}></i>
															</Link>

															{/* 5. My Puja Bookings */}
															<Link
																to="/my_puja_booking"
																className={styles.menuItem}
																onClick={() => setIsDropdownOpen(false)}
															>
																<div className={styles.menuItemLeft}>
																	<i className={`fas fa-calendar-alt ${styles.menuIcon}`}></i>
																	My Puja Bookings
																</div>
																<i className={`fas fa-chevron-right ${styles.chevron}`}></i>
															</Link>

															{/* 6. My Chadhava Bookings */}
															<Link
																to="/my_chadhava_booking"
																className={styles.menuItem}
																onClick={() => setIsDropdownOpen(false)}
															>
																<div className={styles.menuItemLeft}>
																	<i className={`fas fa-hand-holding-heart ${styles.menuIcon}`}></i>
																	My Chadhava Bookings
																</div>
																<i className={`fas fa-chevron-right ${styles.chevron}`}></i>
															</Link>

															{/* 7. Astro Mall Bookings */}
															<Link
																to="/astro_mall_booking"
																className={styles.menuItem}
																onClick={() => setIsDropdownOpen(false)}
															>
																<div className={styles.menuItemLeft}>
																	<i className={`fas fa-shopping-bag ${styles.menuIcon}`}></i>
																	Astro Mall Bookings
																</div>
																<i className={`fas fa-chevron-right ${styles.chevron}`}></i>
															</Link>

															{/* 8. Book a Puja - New */}
															<Link
																to="/puja"
																className={styles.menuItem}
																onClick={() => setIsDropdownOpen(false)}
															>
																<div className={styles.menuItemLeft}>
																	<i className={`fas fa-om ${styles.menuIcon}`}></i>
																	Book a Puja
																</div>
																<div style={{ display: 'flex', alignItems: 'center' }}>
																	<span className={styles.badgeNew}>New</span>
																	<i className={`fas fa-chevron-right ${styles.chevron}`}></i>
																</div>
															</Link>

															{/* 9. Book a Chadhava - New */}
															<Link
																to="/chadhava"
																className={styles.menuItem}
																onClick={() => setIsDropdownOpen(false)}
															>
																<div className={styles.menuItemLeft}>
																	<i className={`fas fa-gift ${styles.menuIcon}`}></i>
																	Book a Chadhava
																</div>
																<div style={{ display: 'flex', alignItems: 'center' }}>
																	<span className={styles.badgeNew}>New</span>
																	<i className={`fas fa-chevron-right ${styles.chevron}`}></i>
																</div>
															</Link>

															{/* 10. Astro Mall - New */}
															<Link
																to="https://vaidikguru.store.com"
																className={styles.menuItem}
																onClick={() => setIsDropdownOpen(false)}
															>
																<div className={styles.menuItemLeft}>
																	<i className={`fas fa-wallet ${styles.menuIcon}`}></i>
																	Astro Mall
																</div>
																<div style={{ display: 'flex', alignItems: 'center' }}>
																	<span className={styles.badgeNew}>New</span>
																	<i className={`fas fa-chevron-right ${styles.chevron}`}></i>
																</div>
															</Link>

															{/* 11. Astro Tools - New */}
															<Link
																to="/astrology_calculator_hub"
																className={styles.menuItem}
																onClick={() => setIsDropdownOpen(false)}
															>
																<div className={styles.menuItemLeft}>
																	<i className={`fas fa-star ${styles.menuIcon}`}></i>
																	Astro Tools
																</div>
																<div style={{ display: 'flex', alignItems: 'center' }}>
																	<span className={styles.badgeNew}>New</span>
																	<i className={`fas fa-chevron-right ${styles.chevron}`}></i>
																</div>
															</Link>

														</div>

														{/* Help Section */}
														<div className={styles.helpSection}>
															<p className={styles.helpTitle}>Help & Support</p>
															<div className={styles.supportBox}>
																<div className={styles.supportRow}>
																	<span>+91  8881110520</span>
																	<p className={styles.supportTime}>Available: 10:30 AM - 7:30 PM</p>
																</div>
																<i className="fas fa-headset" style={{ color: '#f37335', fontSize: '1.2rem' }}></i>
															</div>
															<div className={styles.contactBtns}>
																<button className={styles.contactBtn} onClick={handleEmailClick}>
																	<i className="fas fa-envelope"></i>
																	Email
																</button>
																<button className={styles.contactBtn} onClick={handleWhatsappClick}>
																	<i className="fab fa-whatsapp"></i>
																	Whatsapp
																</button>
															</div>
														</div>

														<div className={styles.logoutSection}>
															<button
																onClick={handleLogoutClick}
																className={styles.logoutBtn}
															>
																<i className="fas fa-sign-out-alt"></i>
																Is Not You? Logout
															</button>
														</div>
													</div>
												)}
											</div>
										) : (
											<button
												onClick={() => setIsModalOpen(true)}
												className="th-btn style3 rounded-circle p-0 d-flex align-items-center justify-content-center"
												style={{
													width: '45px',
													height: '45px',
													borderRadius: '50%',
												}}
											>
												<img
													src={isLoggedIn ? "/assets/img/icon/user-active.svg" : "/assets/img/icon/user.svg"}
													alt={isLoggedIn ? "My Account" : "Login"}
													style={{ width: '20px', height: '20px' }}
												/>
											</button>
										)}
									</div>
								</div>
							</div>
						</div>
						<div
							className="logo-bg"
							style={{
								maskImage: `url(/assets/img/logo_bg_mask.png)`,
							}}
						></div>
					</div>
				</div>
			</header>

			{/* Login Modal */}
			<LoginOTPModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
			/>

			{/* Logout Confirmation Modal */}
			{showLogoutConfirm && (
				<div className={styles.modalOverlay}>
					<div className={styles.modalContent}>
						<h3 className={styles.modalTitle}>Confirm Logout</h3>
						<p className={styles.modalText}>
							Are you sure you want to log out?
						</p>
						<div className={styles.modalActions}>
							<button className={styles.btnCancel} onClick={handleLogoutCancel}>
								Cancel
							</button>
							<button
								className={styles.btnConfirm}
								onClick={handleLogoutConfirm}
							>
								Confirm
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export default Header;