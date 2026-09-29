import { Link, useLocation } from 'react-router-dom';

const MobileMenu = ({ isOpen, onClose }) => {
	const location = useLocation();

	const isActive = (path) =>
		path === '/'
			? location.pathname === '/'
			: location.pathname.startsWith(path);

	const handleNavClick = () => {
		onClose();
		window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
		document.documentElement.scrollTop = 0;
		document.body.scrollTop = 0;
		const root = document.getElementById('root');
		if (root) root.scrollTop = 0;
	};

	return (
		<div
			className={`th-menu-wrapper onepage-nav ${
				isOpen ? 'th-body-visible' : ''
			}`}
			style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
		>
			<div className="th-menu-area text-center">
				<button className="th-menu-toggle" onClick={onClose}>
					<i className="fal fa-times"></i>
				</button>
				<div className="mobile-logo">
					<Link to="/" onClick={handleNavClick}>
						<img src="/assets/img/logo123.svg" alt="VaidikGuru" />
					</Link>
				</div>
				<div className="th-mobile-menu">
					<ul>
						<li>
							<Link
								className={isActive('/') ? 'active' : ''}
								to="/"
								onClick={handleNavClick}
							>
								Home
							</Link>
						</li>
						<li>
							<Link
								className={isActive('/about_us') ? 'active' : ''}
								to="/about_us"
								onClick={handleNavClick}
							>
								About Us
							</Link>
						</li>
						<li>
							<Link
								className={isActive('/puja') ? 'active' : ''}
								to="/puja"
								onClick={handleNavClick}
							>
								Book YourPuja
							</Link>
						</li>
						<li>
							<Link
								className={isActive('/chadhava') ? 'active' : ''}
								to="/chadhava"
								onClick={handleNavClick}
							>
								Book Your Chadhava
							</Link>
						</li>
						<li>
							<Link
								className={isActive('/astrologer') ? 'active' : ''}
								to="/astrologer"
								onClick={handleNavClick}
							>
								Consult With Astrologer
							</Link>
						</li>
						<li>
							<Link
								className={isActive('/live-astrologer') ? 'active' : ''}
								to="/live-astrologer"
								onClick={handleNavClick}
							>
								Live Astrologers
							</Link>
						</li>
						<li>
							<Link
								className={isActive('/panchang') ? 'active' : ''}
								to="/panchang"
								onClick={handleNavClick}
							>
								Panchang
							</Link>
						</li>
						<li>
							<Link
								className={isActive('/astrology_calculator_hub') ? 'active' : ''}
								to="/astrology_calculator_hub"
								onClick={handleNavClick}
							>
								Astrology Tools
							</Link>
						</li>
						<li>
							<Link
								className={isActive('/horoscope') ? 'active' : ''}
								to="/horoscope"
								onClick={handleNavClick}
							>
								Horoscope
							</Link>
						</li>
						<li>
							<Link
								className={isActive('/contact_us') ? 'active' : ''}
								to="/contact_us"
								onClick={handleNavClick}
							>
								Contact us
							</Link>
						</li>
						<li>
							<Link
								className={isActive('/notification') ? 'active' : ''}
								to="/notification"
								onClick={handleNavClick}
							>
								Notification
							</Link>
						</li>
					</ul>
				</div>
			</div>
		</div>
	);
};

export default MobileMenu;
