import '../../pages/home.css';



const STATS = [
	{ icon: '/assets/img/home/men.png', value: '50K+', label: 'Happy Devotees' },
	{ icon: '/assets/img/home/deep.png', value: '1000+', label: 'Verified Pandits' },
	{ icon: '/assets/img/home/deep.png', value: '500+', label: 'Sacred Temples' },
	{ icon: '/assets/img/home/gifthome.png', value: '1L+', label: 'Pujas Performed' },
];

// API still returns some image URLs hosted on legacy domains — rewrite to the current active backend.
const fixImgHost = (url) => {
	if (!url || typeof url !== 'string') return '';
	let clean = url
		.replace('admin.astrogurujii.com', 'admin.vaidikguru.com')
		.replace('admin.astropush.com', 'admin.vaidikguru.com');
	if (clean.startsWith('/')) {
		clean = `https://admin.vaidikguru.com${clean}`;
	}
	return clean;
};

const handleImgError = (e) => {
	const img = e.currentTarget;
	if (img.dataset.fallback === 'done') return;
	img.dataset.fallback = 'done';
	img.src = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&q=80';
};

const BlogSection = ({ blog }) => {
	const items = blog && blog.length ? blog : null;

	if (!items || items.length === 0) {
		return null;
	}

	return (
		<section className="dq-section dq-section-cream">
			<div className="dq-container">
				<div className="dq-section-head-row">
					<h2>From Our Blog</h2>
					<a href="/blog">View All Blogs</a>
				</div>

				<div className="dq-blog-wrap">
					<div className="dq-blog-grid">
						{[...items]
							.sort((a, b) => {
								const dA = new Date(a.Created_date || a.createdAt || a.created_at || a.date || 0);
								const dB = new Date(b.Created_date || b.createdAt || b.created_at || b.date || 0);
								return dB - dA;
							})
							.slice(0, 6).map((item) => (
							<div
								className="dq-blog-card"
								key={item.id || item._id || item.title}
								onClick={() => (window.location.href = `/blog/${item._id || item.id}`)}
								style={{ cursor: 'pointer' }}
							> 
								<img
									src={fixImgHost(item.img || item.image || item.file)}
									alt={item.title}
									onError={handleImgError}
								/>
								<div className="dq-blog-body">
									<span className="dq-blog-tag">{item.tag}</span>
									<h4>{item.title}</h4>
									<span className="dq-blog-date">{item.date}</span>
								</div>
							</div>
						))}
					</div>

					<div className="dq-stats-panel">
						{STATS.map((s) => (
							<div className="stat" key={s.label}>
								<div className="ic"><img src={s.icon} alt={s.label} /></div>
								<strong>{s.value}</strong>
								<span>{s.label}</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
};

export default BlogSection;