import { useState, useEffect } from 'react';
import PujaService from '../../services/pujaServices';
import '../../pages/home.css';



// Inline SVG placeholder with an Om symbol — never triggers a network request, so it can't fail/loop.
const PLACEHOLDER =
	"data:image/svg+xml;charset=UTF-8," +
	encodeURIComponent(`
		<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260">
			<rect width="400" height="260" fill="#f5ede0"/>
			<text x="50%" y="52%" font-size="120" text-anchor="middle" dominant-baseline="middle" fill="#c9962f" font-family="serif">ॐ</text>
		</svg>
	`);

const formatDate = (iso) => {
	if (!iso) return '';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '';
	return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fixImgHost = (url) => {
	if (!url) return PLACEHOLDER;
	let clean = typeof url === 'string' ? url.replace('admin.astrogurujii.com', 'admin.vaidikguru.com') : url;
	if (typeof clean === 'string' && clean.startsWith('/')) {
		clean = `https://admin.vaidikguru.com${clean}`;
	}
	return clean;
};

const handleImgError = (e) => {
	const img = e.currentTarget;
	if (img.dataset.fallback === 'done') return; // already swapped once — stop the loop
	img.dataset.fallback = 'done';
	img.src = PLACEHOLDER;
};

const isItemValid = (item) => {
	if (!item || typeof item !== 'object') return false;
	if (!item.title && !item.name) return false;
	if (item.type === 'App') return false;
	if (item.isDeleted === true || item.is_deleted === 1 || item.is_deleted === true || item.deleted === true) return false;
	if (item.status === 0 || item.status === false || item.status === 'inactive' || item.status === '0') return false;
	if (item.isActive === false || item.is_active === 0 || item.is_active === false || item.is_active === '0') return false;
	return true;
};

const extractPujaItems = (source) => {
	if (!source) return [];
	let rawList = [];

	if (Array.isArray(source)) {
		rawList = source;
	} else if (Array.isArray(source.data)) {
		rawList = source.data;
	} else if (Array.isArray(source.results)) {
		rawList = source.results;
	} else if (Array.isArray(source.result)) {
		rawList = source.result;
	} else if (Array.isArray(source.puja)) {
		rawList = source.puja;
	}

	const flattened = [];
	rawList.forEach((item) => {
		if (item && Array.isArray(item.result)) {
			flattened.push(...item.result.filter(isItemValid));
		} else if (item && isItemValid(item)) {
			flattened.push(item);
		}
	});

	return flattened;
};

const PujaListSection = ({ puja }) => {
	const [apiPujas, setApiPujas] = useState([]);

	useEffect(() => {
		const fetchRealPujas = async () => {
			try {
				const res = await PujaService.getPujaList();
				const list = extractPujaItems(res);
				if (list.length > 0) {
					setApiPujas(list);
				}
			} catch (err) {
				console.error("PujaListSection fetch error:", err);
			}
		};
		fetchRealPujas();
	}, []);

	const passedItems = extractPujaItems(puja);
	const rawItems = passedItems.length > 0 ? passedItems : (apiPujas.length > 0 ? apiPujas : null);

	if (!rawItems || rawItems.length === 0) {
		return null;
	}

	const items = rawItems.slice(0, 6).map((p) => ({
		id: p._id || p.id,
		name: p.title || p.name || 'Sacred Pooja',
		image: fixImgHost(p.pujaImage || p.image || p.img),
		mandir: p.mandirName || p.mandir || 'At Temple',
		purpose: p.purposeOfPooja || p.purpose,
		date: formatDate(p.pujaDatetime || p.date),
	}));

	return (
		<section className="dq-section">
			<div className="dq-container">
				<div className="dq-section-head-row">
					<h2>Most Booked Pujas</h2>
					<a href="/puja">View All Pujas</a>
				</div>

				<div className="row">
					{items.map((item) => (
						<div key={item.id || item.name} className="col-lg-4 col-md-6 col-12">
							<div className="dq-puja-link overflow-hidden border rounded shadow-sm mb-4">
								<a href={`/puja/${encodeURIComponent(item.name)}/${item.id}`}
								 key={item.id || item.name}>
								<img
									src={item.image}
									alt={item.name}
									loading="lazy"
									onError={handleImgError}
								/>
								<div className="dq-puja-body">
									<h4>{item.name}</h4>
									{item.date && <div className="dq-puja-meta">📅 {item.date}</div>}
									<div className="dq-puja-sub">{item.mandir}</div>
									<div className="dq-puja-footer">
										<span className="dq-btn dq-btn-sm">Book Now</span>
									</div>
								</div>
								</a>
							</div>
						</div>
					))}
				</div>

			</div>
		</section>
	);
};

export default PujaListSection;