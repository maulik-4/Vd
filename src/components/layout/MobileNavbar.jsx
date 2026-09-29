import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

/* ── Point these to your actual image files.
     Use two versions per icon (default + active) if you want a
     color-swapped/highlighted version when selected, or reuse the
     same file for both if you'd rather just rely on a filter/opacity
     change (see .dqm-bottomnav__item.dqm-active img below). ── */
const IMG = {
	homeDefault: '/assets/img/bottomnav/inactivehome.png',
	homeActive: '/assets/img/bottomnav/activehome.png',
	pujaDefault: '/assets/img/bottomnav/inactivepuja.png',
	pujaActive: '/assets/img/bottomnav/pujaactive.png',
	chadhavaDefault: '/assets/img/bottomnav/inactivechadhawa.png',
	chadhavaActive: '/assets/img/bottomnav/activechadhawa.png',
	astrologerDefault: '/assets/img/bottomnav/inactiveastro.png',
	astrologerActive: '/assets/img/bottomnav/astroactive.png',
	liveDefault: '/assets/img/bottomnav/inactivelive.png',
	liveActive: '/assets/img/bottomnav/liveactive.png',
};

const NAV_ITEMS = [
	{ label: 'Home', path: '/', imgDefault: IMG.homeDefault, imgActive: IMG.homeActive },
	{ label: 'Puja', path: '/puja', imgDefault: IMG.pujaDefault, imgActive: IMG.pujaActive },
	{ label: 'Chadhava', path: '/chadhava', imgDefault: IMG.chadhavaDefault, imgActive: IMG.chadhavaActive },
	{ label: 'Astrologer', path: '/astrologer', imgDefault: IMG.astrologerDefault, imgActive: IMG.astrologerActive },
	{ label: 'Live', path: '/live-astrologer', imgDefault: IMG.liveDefault, imgActive: IMG.liveActive },
];

/**
 * Detects whether the site is running inside the wrapped native
 * Android app (APK) rather than a regular mobile/desktop browser tab.
 */
const useIsNativeApp = () => {
	const [isNativeApp, setIsNativeApp] = useState(false);

	useEffect(() => {
		const flagInjected = typeof window !== 'undefined' && window.isDivinIQApp === true;

		const isStandaloneDisplay =
			typeof window !== 'undefined' &&
			window.matchMedia &&
			(window.matchMedia('(display-mode: standalone)').matches ||
				window.matchMedia('(display-mode: fullscreen)').matches ||
				window.matchMedia('(display-mode: minimal-ui)').matches);

		const isTWAReferrer =
			typeof document !== 'undefined' &&
			document.referrer &&
			document.referrer.startsWith('android-app://');

		setIsNativeApp(flagInjected || isStandaloneDisplay || isTWAReferrer);
	}, []);

	return isNativeApp;
};

const MobileBottomNav = () => {
	const location = useLocation();
	const isNativeApp = useIsNativeApp();
	const isVisiblePage = NAV_ITEMS.some((item) => item.path === location.pathname);

	if (!isVisiblePage) return null;

	return (
		<>
			<style>{`
				.dqm-bottomnav {
					position: fixed;
					left: 0;
					right: 0;
					bottom: 0;
					z-index: 1000;
					background: #fff;
					border-top: 1px solid #eee0cf;
					display: flex;
					align-items: stretch;
					justify-content: space-around;
					padding-bottom: env(safe-area-inset-bottom, 0px);
					box-shadow: 0 -4px 20px rgba(0,0,0,0.06);
				}
				.dqm-bottomnav__item {
					flex: 1;
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					gap: 4px;
					padding: 9px 4px 8px;
					text-decoration: none !important;
					color: #8a8a8a;
					font-size: 11px;
					font-weight: 600;
					transition: color .18s ease, transform .18s ease;
				}
					@media (min-width: 768px) {
					.dqm-bottomnav, .dqm-bottomnav-spacer {
						display: none;
					}
				}
				.dqm-bottomnav__item img {
					width: 23px;
					height: 23px;
					object-fit: contain;
					transition: transform .18s ease;
				}
				.dqm-bottomnav__item.dqm-active {
					color: #7B1C38;
				}
				.dqm-bottomnav__item.dqm-active img {
					transform: translateY(-1px) scale(1.08);
				}
				.dqm-bottomnav__dot {
					width: 4px;
					height: 4px;
					border-radius: 50%;
					background: transparent;
					margin-bottom: -2px;
				}
				.dqm-bottomnav__item.dqm-active .dqm-bottomnav__dot {
					background: linear-gradient(135deg, #f5a623, #C8963E);
				}

				/* spacer so page content isn't hidden behind the fixed bar */
				.dqm-bottomnav-spacer {
					height: 62px;
				}
			`}</style>

			<div className="dqm-bottomnav-spacer" />
			<nav className="dqm-bottomnav">
				{NAV_ITEMS.map(({ label, path, imgDefault, imgActive }) => {
					const active = location.pathname === path;
					return (
						<Link
							key={path}
							to={path}
							onClick={() => {
								window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
								document.documentElement.scrollTop = 0;
								document.body.scrollTop = 0;
								const root = document.getElementById('root');
								if (root) root.scrollTop = 0;
							}}
							className={`dqm-bottomnav__item ${active ? 'dqm-active' : ''}`}
						>
							<img
								src={active ? imgActive : imgDefault}
								alt={label}
								onError={(e) => {
									// fallback so a missing image doesn't break layout —
									// remove this once your real image files are in place
									e.target.style.opacity = 0.2;
								}}
							/>
							<span>{label}</span>
							<span className="dqm-bottomnav__dot" />
						</Link>
					);
				})}
			</nav>
		</>
	);
};

export default MobileBottomNav;