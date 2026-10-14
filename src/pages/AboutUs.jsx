import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import SideMenu from '../components/layout/SideMenu';
import MobileMenu from '../components/layout/MobileMenu';
import PopupSearch from '../components/layout/PopupSearch';
import ScrollTop from '../components/common/ScrollTop';
import FAQSection from '../components/home_comp/FAQSection';
import { useSEO } from '../hooks/seoHook';
import { SEO } from '../config/seoConfig';

import './AboutUs.css';

/* ══════════════════════════════════════
   ALL IMAGE PATHS  →  public/assets/img/about/
══════════════════════════════════════ */
const IMG = {
  hero: '/assets/img/about/ab-hero.webp',
  statsBar: '/assets/img/about/ab-stats-bar.webp',
  storyThumb: '/assets/img/about/ab-story-thumb.webp',
  appPhones: '/assets/img/about/ab-app-phones.png',
  svcAstro: '/assets/img/about/purple-icon.svg',
  svcPuja: '/assets/img/about/pink-lotus-icon.svg',
  svcChadhava: '/assets/img/about/bowl-icon.svg',
  svcPanchang: '/assets/img/about/calendar-icon.svg',
  svcRemedies: '/assets/img/about/home-green-icon.svg',
  svcGuidance: '/assets/img/about/id-card-purple.svg',
  featWisdom: '/assets/img/about/om-icon.svg',
  featModern: '/assets/img/about/calendar-icon.svg',
  featExperts: '/assets/img/about/user-circle-purple.svg',
  featHolistic: '/assets/img/about/user-gold-icon.svg',
  stepChoose: '/assets/img/about/document-add-pink.svg',
  stepConnect: '/assets/img/about/user-circle-purple.svg',
  stepGuide: '/assets/img/about/id-card-purple.svg',
  stepTransform: '/assets/img/about/home-green-icon.svg',
  trustSecure: '/assets/img/about/purple-icon.svg',
  trustTrusted: '/assets/img/about/group-users-gold.svg',
  trustTemple: '/assets/img/about/temple-icon.svg',
  trustVerified: '/assets/img/about/user-circle-purple.svg',
  trustDelivery: '/assets/img/about/bowl-icon.svg',
  omMandala: '/assets/img/about/om-mandala-icon.svg',
};

/* ══════════════════════════════════════
   DATA
══════════════════════════════════════ */
const SERVICES = [
  { img: IMG.svcAstro,    title: 'Astrology Consultations', desc: 'One-on-one with verified experts' },
  { img: IMG.svcPuja,     title: 'Online Pujas',            desc: 'Vedic rituals performed by expert pandits' },
  { img: IMG.svcChadhava, title: 'Temple Chadhava',         desc: 'Offer your prayers at sacred temples across India' },
  { img: IMG.svcPanchang, title: 'Panchang & Muhurat',      desc: 'Accurate tithi, nakshatra and muhurat details' },
  { img: IMG.svcRemedies, title: 'Spiritual Remedies',      desc: 'Personalized remedies for a better life' },
  { img: IMG.svcGuidance, title: 'Personalized Guidance',   desc: 'Solutions tailored to your unique birth chart' },
];

const WHY_LIST = [
  'Verified & Experienced Experts',
  '100% Secure & Private Consultations',
  'Live Puja & Chadhava Updates',
  'Temple Certified Rituals',
  'Prasad Delivery to Your Home',
  '24x7 Customer Support',
];

const STORY_FEATS = [
  { img: IMG.featWisdom,  title: 'Ancient Wisdom',    desc: 'Timeless knowledge from scriptures' },
  { img: IMG.featModern,  title: 'Modern Approach',   desc: 'Technology that simplifies spirituality' },
  { img: IMG.featExperts, title: 'Trusted Experts',   desc: 'Verified and experienced spiritual guides' },
  { img: IMG.featHolistic,title: 'Holistic Solutions', desc: 'Complete guidance for every aspect of life' },
];

const STEPS = [
  { img: IMG.stepChoose,    num: '01', title: 'Choose Service',      desc: 'Select the service you need' },
  { img: IMG.stepConnect,   num: '02', title: 'Connect With Expert', desc: 'Get matched with the right expert' },
  { img: IMG.stepGuide,     num: '03', title: 'Receive Guidance',    desc: 'Consult and receive precise solutions' },
  { img: IMG.stepTransform, num: '04', title: 'Transform Your Life', desc: 'Follow the guidance and see positive change' },
];

// // Fallback data shown while loading or if the API request fails
// const EXPERTS_FALLBACK = [
//   { img: '/assets/img/about/expert1.png', name: 'Acharya Rohit Sharma', specialty: 'Vedic Astrology', exp: '15+ Years Exp.', rating: '4.9', langs: 'Hindi, English' },
//   { img: '/assets/img/about/expert2.png', name: 'Confidentiality',      specialty: 'Your privacy is our', exp: '12+ Years Exp.', rating: '4.8', langs: 'Hindi, English' },
//   { img: '/assets/img/about/expert3.png', name: 'Pandit Ankit Gaur',    specialty: 'Vastu Expert',     exp: '10+ Years Exp.', rating: '4.9', langs: 'Hindi, English' },
//   { img: '/assets/img/about/expert4.png', name: 'Acharya Dev Mishra',   specialty: 'Tarot & Remedies', exp: '20+ Years Exp.', rating: '4.9', langs: 'Hindi, English' },
// ];

/* ── TESTIMONIALS — Unsplash avatars, single declaration ── */
const TESTIMONIALS = [
  {
    img: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=80&h=80&fit=crop&crop=face',
    name: 'Priya Mehta', loc: 'Mumbai, India',
    text: 'The online puja experience was truly divine. I received live updates and the prasad was delivered on time. Highly recommended!'
  },
  {
    img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&crop=face',
    name: 'Rajesh Kumar', loc: 'Delhi, India',
    text: 'Consultation with Acharya Ji changed my perspective towards life. Grateful for the accurate guidance and remedies provided.'
  },
  {
    img: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop&crop=face',
    name: 'Anita Verma', loc: 'Bangalore, India',
    text: 'VaidikGuru is my go-to platform for all spiritual needs. Authentic, reliable and trustworthy service every time.'
  },
  {
    img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face',
    name: 'Sunita Sharma', loc: 'Jaipur, India',
    text: 'I booked a Satyanarayan Puja and the pandit was very knowledgeable. The live streaming feature made it feel so personal.'
  },
  {
    img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face',
    name: 'Vikram Singh', loc: 'Pune, India',
    text: 'My kundali reading was spot on. The astrologer explained everything clearly and the remedies have truly helped my family.'
  },
  {
    img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&crop=face',
    name: 'Deepa Nair', loc: 'Chennai, India',
    text: 'Excellent platform! The Vastu consultation helped us redesign our home and we have seen positive changes ever since.'
  },
  {
    img: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=80&h=80&fit=crop&crop=face',
    name: 'Amit Tiwari', loc: 'Lucknow, India',
    text: "I was skeptical at first but the astrologer's predictions were amazingly accurate. VaidikGuru has become a part of my daily spiritual routine."
  },
  {
    img: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=80&h=80&fit=crop&crop=face',
    name: 'Kavita Rao', loc: 'Hyderabad, India',
    text: 'The Griha Pravesh puja was performed flawlessly. The pandit was very knowledgeable and the entire ceremony was live-streamed beautifully.'
  },
];

const FAQS = [
  { q: 'How does VaidikGuru verify astrologers and experts?', a: 'Every astrologer and pandit on VaidikGuru goes through a strict verification process including credential checks, background screening and a live evaluation before they are onboarded.' },
  { q: 'Is my personal information and consultation private?', a: 'Yes, all your personal details and consultations are fully encrypted and kept 100% confidential. We never share your information with third parties.' },
  { q: 'How are online pujas performed?', a: 'Our verified pandits perform the puja at the chosen temple following authentic Vedic rituals, with a live video link sent to you so you can watch in real-time.' },
  { q: 'When will I receive the prasad after puja?', a: 'Prasad is couriered to your registered address within 5-7 business days after the puja is completed.' },
  { q: 'Can I speak to an astrologer before booking?', a: 'Yes, you can chat with an astrologer for a quick preliminary consultation before booking a full session.' },
  { q: 'What payment methods are accepted?', a: 'We accept all major credit/debit cards, UPI, net banking and popular digital wallets.' },
];

const TRUST_ITEMS = [
  { img: IMG.trustSecure,   text: '100% Secure\n& Private' },
  { img: IMG.trustTrusted,  text: 'Trusted by\nLakhs of Users' },
  { img: IMG.trustTemple,   text: 'Temple Certified\n& Authenticated' },
  { img: IMG.trustVerified, text: 'Verified Experts\n& Pandits' },
  { img: IMG.trustDelivery, text: 'Timely Prasad\nDelivery' },
];

/* ── helpers ── */
const StarIco = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="#F5A623" stroke="none">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);
const Stars5 = () => (
  <div className="ab-stars">{[0,1,2,3,4].map(i => <StarIco key={i} />)}</div>
);
const CheckIco = () => (
  <span className="ab-why-check">
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4L19 7" stroke="#2E8B3E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);

/* ══════════════════════════════════════
   HERO
══════════════════════════════════════ */
const Hero = () => (
  <section className="abh-hero" style={{ backgroundImage: `url(${IMG.hero})` }}>
    <div className="abh-inner">
    </div>
  </section>
);

/* ══════════════════════════════════════
   OUR STORY
══════════════════════════════════════ */
const OurStory = () => (
  <section className="ab-story">
    <div className="container">
      <div className="ab-story-inner">
        <div className="ab-story-video">
          <img src={IMG.storyThumb} alt="VaidikGuru Story" className="ab-story-thumb" />
          <div className="ab-story-play-btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(80,20,90,0.9)">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        <div className="ab-story-text">
          <img src={IMG.omMandala} alt="" aria-hidden="true" className="ab-story-om" />
          <div className="ab-eyebrow"><span>✦</span>&nbsp;OUR STORY&nbsp;<span>✦</span></div>
          <h2>
            A Vaidik Journey<br />
            Rooted in Tradition,{' '}
            <span className="italic-gold">Driven by Purpose</span>
          </h2>
          <p>
            Vaidikguru was born out of a simple yet powerful vision – to make authentic Vedic
            guidance accessible to everyone, everywhere. We bring together a team of learned
            astrologers, experienced pundits, and spiritual experts who are dedicated to
            helping you navigate life's challenges with clarity and confidence.
          </p>
          <div className="ab-story-feats">
            {STORY_FEATS.map(f => (
              <div className="ab-story-feat" key={f.title}>
                <img src={f.img} alt={f.title} className="ab-story-feat-ico" />
                <div>
                  <h5>{f.title}</h5>
                  <span>{f.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* ══════════════════════════════════════
   SERVICES
══════════════════════════════════════ */
const Services = () => (
  <section className="ab-services">
    <div className="container">
      <div className="ab-section-head">
        <div className="ab-eyebrow ab-center"><span>✦</span>&nbsp;WHAT WE OFFER&nbsp;<span>✦</span></div>
        <h2 className="text-center">Complete Spiritual Solutions</h2>
      </div>
      <div className="row g-3">
        {SERVICES.map((s, i) => (
          <motion.div key={s.title} className="col-6 col-md-4 col-lg-2"
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .28, delay: i * .06 }}>
            <div className="ab-svc-card">
              <img src={s.img} alt={s.title} className="ab-svc-ico" />
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

/* ══════════════════════════════════════
   WHY CHOOSE + STATS
══════════════════════════════════════ */
const WhyChoose = () => (
  <section className="ab-why">
    <div className="container">
      <div className="ab-why-inner">
        <div className="ab-why-left">
          <div className="ab-why-label">
            <i className="fas fa-circle-dot" style={{ fontSize: 11, color: '#C0392B' }} />
            &nbsp;WHY CHOOSE VAIDIK GURU?
          </div>
          <ul className="ab-why-list">
            {WHY_LIST.map(item => (
              <li key={item}><CheckIco />{item}</li>
            ))}
          </ul>
        </div>
        <div className="ab-stats-img-wrap">
          <img src={IMG.statsBar} alt="VaidikGuru Stats" className="ab-stats-img" />
        </div>
      </div>
    </div>
  </section>
);

/* ══════════════════════════════════════
   HOW IT WORKS
══════════════════════════════════════ */
const HowItWorks = () => (
  <section className="ab-how">
    <div className="container">
      <div className="ab-section-head">
        <div className="ab-eyebrow ab-center ab-eyebrow-red"><span>✦</span>&nbsp;HOW VaidikGuru WORKS&nbsp;<span>✦</span></div>
        <h2 className="text-center">Simple Steps to Vaidik Guidance</h2>
      </div>
      <div className="ab-steps">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.num}>
            <motion.div className="ab-step"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: .28, delay: i * .08 }}>
              <img src={s.img} alt={s.title} className="ab-step-ico-img" />
              <div className="ab-step-num">{s.num}</div>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </motion.div>
            {i < STEPS.length - 1 && (
              <div className="ab-step-arrow"><i className="fas fa-arrow-right" /></div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  </section>
);

/* ══════════════════════════════════════
   MISSION & VISION
══════════════════════════════════════ */
const MissionVision = () => (
  <section className="ab-mv">
    <div className="container">
      <div className="row g-4">
        <div className="col-md-6">
          <div className="ab-mv-card">
            <div className="ab-mv-icon"><i className="fas fa-bullseye" /></div>
            <div>
              <h3>Our Mission</h3>
              <p>To democratise access to authentic Vedic astrology by connecting every seeker — regardless of location or background — with verified, compassionate experts who provide real guidance rooted in ancient wisdom.</p>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="ab-mv-card">
            <div className="ab-mv-icon"><i className="fas fa-eye" /></div>
            <div>
              <h3>Our Vision</h3>
              <p>To become the world's most trusted astrology platform — where every person can find clarity, purpose, and peace by aligning with the cosmic energy that surrounds them.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// const ExpertAvatar = ({ img, name }) => {
//   const [errored, setErrored] = useState(false);
//   const initials = name
//     .split(' ')
//     .map(w => w[0])
//     .join('')
//     .slice(0, 2)
//     .toUpperCase();

//   if (errored || !img) {
//     return (
//       <div
//         className="ab-expert-avatar ab-expert-avatar-fallback"
//         style={{
//           background: 'linear-gradient(135deg,#d4a88a,#b07850)',
//           display: 'flex',
//           alignItems: 'center',
//           justifyContent: 'center',
//           color: '#fff',
//           fontWeight: 600,
//         }}
//       >
//         {initials}
//       </div>
//     );
//   }

//   return (
//     <img
//       src={img}
//       alt={name}
//       className="ab-expert-avatar"
//       onError={() => setErrored(true)}
//     />
//   );
// };

// /* ══════════════════════════════════════
//    EXPERTS
// ══════════════════════════════════════ */
// const Experts = () => {
//   const [experts, setExperts] = useState(EXPERTS_FALLBACK);

//   useEffect(() => {
//     let isMounted = true;
//     fetch('/api/experts')
//       .then(res => {
//         if (!res.ok) throw new Error('Failed to fetch experts');
//         return res.json();
//       })
//       .then(data => {
//         if (isMounted && Array.isArray(data) && data.length) {
//           setExperts(data);
//         }
//       })
//       .catch(err => {
//         console.error('Error fetching experts:', err);
//         // keep EXPERTS_FALLBACK on failure
//       });
//     return () => { isMounted = false; };
//   }, []);

//   return (
//   <section className="ab-experts">
//     <div className="container">
//       <div className="ab-section-head">
//         <div className="ab-eyebrow ab-center"><span>✦</span>&nbsp;OUR CORE VALUES&nbsp;<span>✦</span></div>
//       </div>
//       <div className="ab-experts-wrap">
//         <button className="ab-carousel-btn left" aria-label="Previous">
//           <i className="fas fa-chevron-left" />
//         </button>
//         <div className="row g-3">
//           {experts.map((e, i) => (
//             <motion.div key={e.name} className="col-12 col-md-6 col-lg-3"
//               initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
//               transition={{ duration: .28, delay: i * .07 }}>
//               <div className="ab-expert-card">
//                 <ExpertAvatar img={e.img} name={e.name} />
//                 <div className="ab-expert-info">
//                   <h4>{e.name}</h4>
//                   <div className="specialty">{e.specialty}</div>
//                   <div className="meta">{e.exp}&nbsp;&nbsp;{e.rating}&nbsp;<StarIco /></div>
//                   <div className="langs">{e.langs}</div>
//                 </div>
//               </div>
//             </motion.div>
//           ))}
//         </div>
//         <button className="ab-carousel-btn right" aria-label="Next">
//           <i className="fas fa-chevron-right" />
//         </button>
//       </div>
//     </div>
//   </section>
//   );
// };

/* ══════════════════════════════════════
   TESTIMONIALS  —  working carousel
══════════════════════════════════════ */
const Testimonials = () => {
  const [current, setCurrent] = useState(0);
  const perPage = 3;
  // slide one-by-one: with 8 items showing 3, there are 6 valid start positions
  const total = TESTIMONIALS.length - perPage + 1;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % total);
    }, 3500);
    return () => clearInterval(timer);
  }, [total]);

  const prev = () => setCurrent(c => (c - 1 + total) % total);
  const next = () => setCurrent(c => (c + 1) % total);

  // show 3 consecutive cards starting at `current`
  const visible = TESTIMONIALS.slice(current, current + perPage);

  return (
    <section className="ab-testimonials">
      <div className="container">
        <div className="ab-testi-header">
          <div>
            <div className="ab-eyebrow"><span>✦</span>&nbsp;TESTIMONIALS&nbsp;<span>✦</span></div>
            <h2>What Our Devotees Say</h2>
          </div>
          {/* <Link to="/experts" className="ab-view-all">View All Experts</Link> */}
        </div>

        <div className="ab-testi-wrap">
          <button className="ab-carousel-btn left" onClick={prev} aria-label="Previous">
            <i className="fas fa-chevron-left" />
          </button>

          <div className="row g-4">
            {visible.map((t, i) => (
              <motion.div
                key={`${current}-${i}`}
                className="col-12 col-md-4"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.07 }}
              >
                <div className="ab-testi-card">
                  <div className="ab-testi-top">
                    <img
                      src={t.img}
                      alt={t.name}
                      className="ab-testi-avatar"
                      onError={ev => {
                        ev.target.onerror = null;
                        ev.target.style.background = 'linear-gradient(135deg,#ddd,#bbb)';
                        ev.target.removeAttribute('src');
                      }}
                    />
                    <div>
                      <div className="ab-testi-name">{t.name}</div>
                      <div className="ab-testi-loc">{t.loc}</div>
                    </div>
                  </div>
                  <p>{t.text}</p>
                  <Stars5 />
                </div>
              </motion.div>
            ))}
          </div>

          <button className="ab-carousel-btn right" onClick={next} aria-label="Next">
            <i className="fas fa-chevron-right" />
          </button>
        </div>

        <div className="ab-testi-dots">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`ab-testi-dot${i === current ? ' active' : ''}`}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

/* ══════════════════════════════════════
   APP DOWNLOAD
══════════════════════════════════════ */
const AppDownload = () => (
  <section className="ab-app">
    <div className="ab-app-banner-wrap">
      <img
        src="/assets/img/about/middlebanner_about.webp"
        alt="DiviniQ App – Your Spiritual Companion"
        className="ab-app-banner-img"
      />
      <div className="ab-app-overlay">
        <div className="ab-app-overlay-inner">
          <div className="ab-app-qr">
            <img
              src="https://api.qrserver.com/v1/create-qr-code/?size=76x76&data=https://diviniq.com/download&color=333333&bgcolor=ffffff&margin=4"
              alt="Scan to download DiviniQ"
              width="76"
              height="76"
              style={{ borderRadius: 8, display: 'block' }}
            />
          </div>
          <div className="ab-app-stores">
            <div className="ab-store-scan">Scan to Download</div>
            <div className="ab-store-sub">Get the VaidikGuru App Now</div>
            <div className="ab-store-btns">
              <a href="https://play.google.com/store/apps/details?id=com.app.vaidikguru" target="_blank" rel="noopener noreferrer" className="ab-store-btn">
                <i className="fab fa-google-play" />
                <span className="btn-txt"><small>GET IT ON</small>Google Play</span>
              </a>
              <a href="https://play.google.com/store/apps/details?id=com.app.vaidikguru" target="_blank" rel="noopener noreferrer" className="ab-store-btn">
                <i className="fab fa-apple" />
                <span className="btn-txt"><small>Download on the</small>App Store</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* ══════════════════════════════════════
   FAQ
══════════════════════════════════════ */
const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="ab-faq">
      <div className="container">
        <div className="ab-section-head">
          <div className="ab-eyebrow ab-center">
            <span>✦</span>&nbsp;FREQUENTLY ASKED QUESTIONS&nbsp;<span>✦</span>
          </div>
        </div>

        <div className="dq-faq-grid">
          {FAQS.map((item, index) => (
            <div className={`dq-faq-item-wrap ${openIndex === index ? 'open' : ''}`} key={item.q}>
              <div
                className="ab-faq-item"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span>{item.q}</span>
                <i className={`fas fa-${openIndex === index ? 'minus' : 'plus'}`} />
              </div>
              {openIndex === index && <p className="answer">{item.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ══════════════════════════════════════
   TRUST BAR
══════════════════════════════════════ */
const TrustBar = () => (
  <div className="ab-trust-bar">
    <div className="container">
      <div className="ab-trust-inner">
        {TRUST_ITEMS.map(t => (
          <div className="ab-trust-item" key={t.text}>
            <img src={t.img} alt="" className="ab-trust-ico-img" />
            <span style={{ whiteSpace: 'pre-line' }}>{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ══════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════ */
const AboutUs = () => {
  useSEO(SEO.about);
  const [showSideMenu,   setShowSideMenu]   = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearch,     setShowSearch]     = useState(false);

  return (
    <div className="main-wrapper ab-page" style={{ paddingTop: 0, marginTop: 0 }}>
      <ScrollTop />
      <SideMenu    isOpen={showSideMenu}   onClose={() => setShowSideMenu(false)} />
      <PopupSearch isOpen={showSearch}     onClose={() => setShowSearch(false)} />
      <MobileMenu  isOpen={showMobileMenu} onClose={() => setShowMobileMenu(false)} />
      <Header
        onMenuToggle={()     => setShowMobileMenu(true)}
        onSideMenuToggle={() => setShowSideMenu(true)}
        onSearchToggle={()   => setShowSearch(true)}
      />

      <Hero />
      <OurStory />
      <Services />
      <WhyChoose />
      <HowItWorks />
      <MissionVision />
      {/* <Experts /> */}
      <Testimonials />
      <AppDownload />
      <FAQSection />
      <TrustBar />

      <Footer />
    </div>
  );
};

export default AboutUs;