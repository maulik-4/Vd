import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import apiService from '../../services/apiServices';
import storageService from '../../services/storageServices';
import LoginOTPModal from '../accounts/LoginOTPModel';
import { getAstroPrice, getAstroRating, getAstroReviewCount, getAstroChatPrice, getAstroCallPrice, getAstroRole, getAstroStatus, getWaitLabel } from '../../services/astroHelpers';
import '../../pages/AstrologerList.css';

const TeamSection = ({ astrologer }) => {
	const [list, setList] = useState(() => (Array.isArray(astrologer) && astrologer.length ? astrologer : []));
	const [showLoginModal, setShowLoginModal] = useState(false);
	const [toastMsg, setToastMsg] = useState(null);

	useEffect(() => {
		let active = true;
		const loadAstrologers = async () => {
			try {
				const payload = { page: "1" };
				const res = await apiService.postBearer('/user_api/astrologer_list', payload);
				const data = Array.isArray(res?.results) ? res.results : Array.isArray(res?.record) ? res.record : Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : null;
				if (active) {
					if (data && data.length > 0) {
						setList(data.slice(0, 8));
					} else if (Array.isArray(astrologer) && astrologer.length > 0) {
						setList(astrologer.slice(0, 8));
					} else {
						setList([]);
					}
				}
			} catch (_) {
				if (active && Array.isArray(astrologer)) setList(astrologer.slice(0, 8));
			}
		};
		loadAstrologers();
		return () => { active = false; };
	}, [astrologer]);

	const items = list && list.length ? list : [];
	if (!items || items.length === 0) return null;

	const handleAction = (astro, type) => {
		const token = storageService.getToken() || localStorage.getItem('token') || sessionStorage.getItem('token');
		if (!token && (type === 'chat' || type === 'call' || type === 'notify')) {
			setShowLoginModal(true);
			return;
		}
		if (type === 'chat') {
			window.location.href = `/astrologer/${astro.id || astro._id}?action=chat`;
		} else if (type === 'call') {
			window.location.href = `/astrologer/${astro.id || astro._id}?action=call`;
		} else {
			window.location.href = `/astrologer/${astro.id || astro._id}`;
		}
	};

	return (
		<section className="dq-section">
			<div className="dq-container">
				<div className="dq-section-head-row">
					<h2>Top Astrologers</h2>
					<a href="/astrologer">View All Astrologers</a>
				</div>

				<div className="dq-astro-grid">
					{items.map((item) => (
						<AstrologerCard
							astro={item}
							onChat={handleAction}
							onFollow={(astro, next, needLogin) => {
								if (needLogin) {
									setShowLoginModal(true);
									return;
								}
								setToastMsg(next ? `You are now following ${astro.name}.` : `You unfollowed ${astro.name}.`);
								setTimeout(() => setToastMsg(null), 2500);
							}}
							key={item.id || item._id}
						/>
					))}
				</div>
			</div>

			<LoginOTPModal
				isOpen={showLoginModal}
				onClose={() => setShowLoginModal(false)}
				onSuccess={() => {
					setShowLoginModal(false);
					window.location.reload();
				}}
			/>

			{toastMsg && (
				<div className="al-toast">
					<i className="fas fa-bell" style={{ color: '#f59e0b' }} />
					<span>{toastMsg}</span>
				</div>
			)}
		</section>
	);
};




const COLORS = ['#7a1a3d', '#8a4b1f', '#1f6f5c', '#4b3f8a', '#a3441f', '#2f6b8a'];

const avColor = (name = '') => {
	let hash = 0;
	for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
	return COLORS[Math.abs(hash) % COLORS.length];
};

// API still returns some image URLs hosted on the old domain — rewrite to the current one.
const fixImgHost = (url) =>
	typeof url === 'string' ? url.replace('admin.astrogurujii.com', 'admin.vaidikguru.com') : url;

const initials = (name = '') =>
	name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase())
		.join('');

const getFollowKey = (astro) => {
	const id = astro?.id || astro?._id || astro?.astro_id || astro?.name || '';
	return id ? `followed_astro_${String(id)}` : null;
};

const isFollowed = (astro) => {
	const key = getFollowKey(astro);
	if (!key) return false;
	try {
		return localStorage.getItem(key) === 'true';
	} catch (_) {
		return false;
	}
};

const AstrologerCard = ({ astro, onChat, onFollow }) => {
	const [liked, setLiked] = useState(false);
	const [imgErr, setImgErr] = useState(false);
	const [notified, setNotified] = useState(false);
	const [isFollowing, setIsFollowing] = useState(() => isFollowed(astro));
	const cats = (Array.isArray(astro.category) ? astro.category : []).slice(0, 3).map((c) => (typeof c === 'object' ? (c.name || c.category_name || c.title) : c)).filter(Boolean);
	const role = getAstroRole(astro);
	const { isBusy, isOnline } = getAstroStatus(astro);
	const dotCls = isBusy ? 'db' : isOnline ? 'dn' : 'do';
	const waitLabel = getWaitLabel(astro);
	// 🔥 same boost flags the astrologer list page uses
	const isBoosted = (value) => value === true || value === 1 || value === '1' || value === 'true';
	const boostChat = isBoosted(astro.is_boost_chat);
	const boostCall = isBoosted(astro.is_boost_call);

	useEffect(() => {
		setIsFollowing(isFollowed(astro));
	}, [astro]);

	const handleFollowClick = async (e) => {
		e.stopPropagation();
		const token = storageService.getToken() || localStorage.getItem('token') || sessionStorage.getItem('token');
		if (!token) {
			if (onFollow) onFollow(astro, null, true);
			return;
		}
		const nextState = !isFollowing;
		setIsFollowing(nextState);
		const key = getFollowKey(astro);
		if (key) {
			try { localStorage.setItem(key, String(nextState)); } catch (_) {}
		}
		const astroId = String(astro?.id || astro?._id || '');
		if (astroId) {
			try {
				await apiService.postBearer('/user_api/follow_astro', { astro_id: astroId });
			} catch (err) {
				console.error('[Follow] API error:', err);
			}
		}
		if (onFollow) onFollow(astro, nextState, false);
	};

	const handleNotifyClick = async (e) => {
		e.stopPropagation();
		const token = storageService.getToken() || localStorage.getItem('token') || sessionStorage.getItem('token');
		if (!token) {
			if (onChat) onChat(astro, 'notify');
			return;
		}
		setNotified(!notified);
		const astroId = String(astro?.id || astro?._id || '');
		if (astroId) {
			try {
				await apiService.postBearer('/user_api/notifyme', { astro_id: astroId });
			} catch (err) {
				console.error('[NotifyMe] API error:', err);
			}
		}
	};

	return (
		<motion.div
			className="al-card"
			initial={{ opacity: 0, y: 14 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.28 }}
			style={{ cursor: 'pointer' }}
			onClick={() => onChat(astro, 'view')}
		>
			<span className="al-exp">{astro.experience || '5'}+ Yrs Exp</span>
			<div className="al-top-actions">
				<div className="al-follow-row">
					<button
						className={`al-follow-btn${isFollowing ? ' on' : ''}`}
						onClick={handleFollowClick}
						type="button"
						aria-label={isFollowing ? `Unfollow ${astro.name}` : `Follow ${astro.name}`}
					>
						<i className={isFollowing ? 'fas fa-check' : 'fas fa-user-plus'} />
						<span>{isFollowing ? 'Following' : 'Follow'}</span>
					</button>
				</div>
				<button
					className={`al-heart${liked ? ' on' : ''}`}
					onClick={(e) => {
						e.stopPropagation();
						setLiked(!liked);
					}}
					type="button"
					aria-label="Add to favorites"
				>
					<i className={liked ? 'fas fa-heart' : 'far fa-heart'} />
				</button>
			</div>

			<div className="al-av-wrap">
				<div className="al-av-clip">
					{astro.profile_img && !imgErr ? (
						<img src={fixImgHost(astro.profile_img)} alt={astro.name} onError={() => setImgErr(true)} />
					) : (
						<div
							className="al-av-init"
							style={{ background: `linear-gradient(135deg,${avColor(astro.name)},${avColor(astro.name)}bb)` }}
						>
							{initials(astro.name)}
						</div>
					)}
				</div>
				<span className={`al-dot ${dotCls}`} />
			</div>

			<div className="al-cname">{astro.name}</div>
			{role ? <div className="al-crole">{role}</div> : null}
			<div className="al-tags">
				{cats.map((c, i) => (
					<span key={i} className="al-tag">{c}</span>
				))}
			</div>
			<div className="al-stats">
				<div className="al-rat">
					<i className="fas fa-star" />
					<span>{Number(getAstroRating(astro)).toFixed(1)}</span>
					<span className="al-rev">({getAstroReviewCount(astro)})</span>
				</div>
				{getAstroChatPrice(astro) !== null ? (
					<div className="al-price">₹{getAstroChatPrice(astro)}/min</div>
				) : null}
			</div>
			<div className="al-actions">
				{isBusy ? (
					<div className="al-wait-row">
						<button className={`al-wait-btn${notified ? ' on' : ''}`} onClick={handleNotifyClick} title={`Busy · ${waitLabel}`}>
							<i className={notified ? 'fas fa-check-circle' : 'fas fa-comment-dots'} />
							<span>{notified ? 'Notified' : waitLabel}</span>
						</button>
						<button className={`al-wait-call${notified ? ' on' : ''}`} onClick={handleNotifyClick} title={`Busy · Call · ${waitLabel}`}>
							<i className={notified ? 'fas fa-check-circle' : 'fas fa-phone'} />
						</button>
					</div>
				) : isOnline ? (
					<>
						<button className="al-chat" onClick={(e) => { e.stopPropagation(); onChat(astro, 'chat'); }}>
							{boostChat && <i className="fas fa-fire al-boost-fire" aria-label="Boosted chat" />}
							Chat Now
						</button>
						<button className="al-call" onClick={(e) => { e.stopPropagation(); onChat(astro, 'call'); }} title={`Call (₹${getAstroCallPrice(astro)}/min)`}>
							<i className="fas fa-phone" />
							{boostCall && <i className="fas fa-fire al-boost-fire" aria-label="Boosted call" />}
						</button>
					</>
				) : (
					<button className="al-notify-btn disabled" style={{ opacity: 0.65, cursor: 'not-allowed', background: '#9ca3af' }} onClick={(e) => e.stopPropagation()}>
						<i className="fas fa-moon" />
						<span>Offline</span>
					</button>
				)}
			</div>
		</motion.div>
	);
};


export default TeamSection;