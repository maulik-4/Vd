import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    User, Mail, Phone, Lock, Calendar, Globe, Briefcase, Landmark,
    Hash, CreditCard, ShieldCheck, UploadCloud, FileText, X, Check,
    MessageCircle, PhoneCall, Video, AlertTriangle,
} from 'lucide-react';
import apiService from '../services/apiServices';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import TestimonialSection from '../components/sections/TestimonialSection';
import ScrollTop from '../components/common/ScrollTop';
import SideMenu from '../components/layout/SideMenu';
import PopupSearch from '../components/layout/PopupSearch';
import MobileMenu from '../components/layout/MobileMenu';
import { useSEO } from '../hooks/seoHook';
import { SEO } from '../config/seoConfig';

/* ── Reusable: icon-prefixed text input ── */
const IconInput = ({ icon, error, ...props }) => (
    <div className={`pp-input-group ${error ? 'pp-input-group--error' : ''}`}>
        <span className="pp-input-group__icon">{icon}</span>
        <input {...props} className="pp-input-group__field" />
    </div>
);

/* ── Reusable: drag & drop file upload ── */
const FileUploadField = ({ label, name, accept, file, error, hint, onFileSelect }) => {
    const [dragOver, setDragOver] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (file && file.type && file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setPreviewUrl(null);
        }
    }, [file]);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileSelect(name, e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="pp-field">
            <label className="pp-field__label">{label}</label>
            <div
                className={`pp-upload ${error ? 'pp-upload--error' : ''} ${dragOver ? 'pp-upload--drag' : ''} ${file ? 'pp-upload--filled' : ''}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
            >
                <input
                    ref={inputRef}
                    type="file"
                    name={name}
                    accept={accept}
                    onChange={(e) => e.target.files[0] && onFileSelect(name, e.target.files[0])}
                    style={{ display: 'none' }}
                />

                {file ? (
                    <div className="pp-upload__preview">
                        {previewUrl ? (
                            <img src={previewUrl} alt={label} className="pp-upload__thumb" />
                        ) : (
                            <div className="pp-upload__filetype"><FileText size={22} /></div>
                        )}
                        <div className="pp-upload__info">
                            <p className="pp-upload__filename">{file.name}</p>
                            <p className="pp-upload__filesize">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                            type="button"
                            className="pp-upload__remove"
                            onClick={(e) => { e.stopPropagation(); onFileSelect(name, null); }}
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <div className="pp-upload__empty">
                        <div className="pp-upload__icon"><UploadCloud size={24} /></div>
                        <p className="pp-upload__text"><strong>Click to upload</strong> or drag & drop</p>
                        <p className="pp-upload__subtext">
                            {accept?.includes('pdf') ? 'PNG, JPG or PDF · max 5MB' : 'PNG or JPG · max 5MB'}
                        </p>
                    </div>
                )}
            </div>
            {error && <p className="pp-error">{error}</p>}
            {hint && !error && <p className="pp-hint">{hint}</p>}
        </div>
    );
};

const AstrologerRegistration = () => {
    useSEO(SEO.astrologerRegistration);
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [animateKey, setAnimateKey] = useState(0);
    const [showSideMenu, setShowSideMenu] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [categories, setCategories] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [skills, setSkills] = useState([]);
    const [countries, setCountries] = useState([]);
    const [modal, setModal] = useState({ open: false, type: 'success', title: '', message: '' });

    const wizardRef = useRef(null);

    const [formData, setFormData] = useState({
        email: "", name: "", displayname: "", number: "", password: "",
        about: "", experience: "", address: "", country_id: "", state_id: "",
        city_id: "", language: "", skill: "", category: "", report_type: "",
        dob: "", gender: "Male", account_type: "Saving", account_holder_name: "",
        account_no: "", bank: "", ifsc: "", aadhar_card_no: "",
        is_chat: "off", is_voice_call: "off", is_video_call: "off",
        per_min_chat: 0, per_min_voice_call: 0, per_min_video_call: 0,
        contact_no2: "", working: "", pincode: "", pan_card: "", gst: "", bio: "",
        deviceType: "Web", deviceID: "Web_Portal", deviceToken: "Web_Token",
        profile_img: null, aadhar_card_img: null, pan_card_img: null
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [catRes, langRes, skillRes, countryRes] = await Promise.all([
                    apiService.post('/astrologer_api/category_list', {}),
                    apiService.post('/astrologer_api/language_list', {}),
                    apiService.post('/astrologer_api/skill_list', {}),
                    apiService.post('/astrologer_api/location_list', {})
                ]);

                if (catRes.status) setCategories(catRes.results);
                if (langRes.status) setLanguages(langRes.results);
                if (skillRes.status) setSkills(skillRes.results);
                if (countryRes.status) setCountries(countryRes.results);
            } catch (err) {
                console.error("API load failed", err);
            }
        };
        fetchMetadata();
    }, []);

    const toggleMultiSelect = (field, value) => {
        const current = formData[field] ? formData[field].split(', ').filter(v => v !== "") : [];
        let updated = current.includes(value)
            ? current.filter(v => v !== value)
            : [...current, value];
        setFormData(prev => ({ ...prev, [field]: updated.join(', ') }));

        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleChange = (e) => {
        const { name, value, files, type, checked } = e.target;

        if (type === "checkbox") {
            setFormData(prev => ({ ...prev, [name]: checked ? "on" : "off" }));
        } else if (type === "file") {
            setFormData(prev => ({ ...prev, [name]: files ? files[0] : null }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // Dedicated handler for the drag-and-drop file fields
    const handleFileSelect = (name, file) => {
        setFormData(prev => ({ ...prev, [name]: file }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateStep = (currentStep) => {
        const newErrors = {};

        switch (currentStep) {
            case 1:
                if (!formData.name.trim()) newErrors.name = 'Full name is required';
                if (!formData.displayname.trim()) newErrors.displayname = 'Display name is required';
                if (!formData.email.trim()) newErrors.email = 'Email is required';
                else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
                if (!formData.number.trim()) newErrors.number = 'Mobile number is required';
                else if (!/^\d{10}$/.test(formData.number)) newErrors.number = 'Mobile number must be 10 digits';
                if (!formData.password.trim()) newErrors.password = 'Password is required';
                else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
                break;

            case 2:
                if (!formData.category.trim()) newErrors.category = 'Please select at least one category';
                if (!formData.skill.trim()) newErrors.skill = 'Please select at least one skill';
                if (!formData.experience.trim()) newErrors.experience = 'Experience is required';
                if (!formData.bio.trim()) newErrors.bio = 'Bio is required';
                break;

            case 3:
                if (formData.is_chat === 'on' && (!formData.per_min_chat || formData.per_min_chat <= 0)) {
                    newErrors.per_min_chat = 'Chat rate is required';
                }
                if (formData.is_voice_call === 'on' && (!formData.per_min_voice_call || formData.per_min_voice_call <= 0)) {
                    newErrors.per_min_voice_call = 'Voice call rate is required';
                }
                if (formData.is_video_call === 'on' && (!formData.per_min_video_call || formData.per_min_video_call <= 0)) {
                    newErrors.per_min_video_call = 'Video call rate is required';
                }
                if (formData.is_chat === 'off' && formData.is_voice_call === 'off' && formData.is_video_call === 'off') {
                    newErrors.services = 'Please enable at least one service';
                }
                break;

            case 4:
                if (!formData.account_holder_name.trim()) newErrors.account_holder_name = 'Account holder name is required';
                if (!formData.bank.trim()) newErrors.bank = 'Bank name is required';
                if (!formData.account_no.trim()) newErrors.account_no = 'Account number is required';
                if (!formData.ifsc.trim()) newErrors.ifsc = 'IFSC code is required';
                if (!formData.pan_card.trim()) newErrors.pan_card = 'PAN card number is required';
                if (!formData.aadhar_card_no.trim()) newErrors.aadhar_card_no = 'Aadhar card number is required';
                break;

            case 5:
                if (!formData.profile_img) newErrors.profile_img = 'Profile photo is required';
                if (!formData.aadhar_card_img) newErrors.aadhar_card_img = 'Aadhar copy is required';
                if (!formData.pan_card_img) newErrors.pan_card_img = 'PAN copy is required';
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Scrolls to the top of the FORM (not the page hero) with a small offset for the sticky header
    const scrollToForm = () => {
        if (wizardRef.current) {
            const offset = 100;
            const top = wizardRef.current.getBoundingClientRect().top + window.pageYOffset - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    };

    const handleNext = () => {
        if (validateStep(step)) {
            setStep(step + 1);
            setAnimateKey(prev => prev + 1);
            scrollToForm();
        }
    };

    const handleBack = () => {
        setStep(step - 1);
        setAnimateKey(prev => prev + 1);
        scrollToForm();
    };

    const handleSubmit = async () => {
        if (!validateStep(5)) return;

        setLoading(true);
        const data = new FormData();

        // Populate base form data
        Object.keys(formData).forEach(key => {
            if (formData[key] !== null && formData[key] !== undefined) {
                data.append(key, formData[key]);
            }
        });

        // Ensure aliases for admin control panel mapping compatibility
        if (formData.bio && !formData.about) {
            data.append('about', formData.bio);
        }
        
        try {
            const res = await apiService.postMultipart('/astrologer_api/astrologer_register', data);
            if (res.status) {
                setModal({
                    open: true,
                    type: 'success',
                    title: 'Application Submitted!',
                    message: res.message || 'Welcome to the VaidikGuru family. Our team will review your application and get in touch with you shortly.',
                });
            } else {
                setModal({
                    open: true,
                    type: 'error',
                    title: 'Submission Failed',
                    message: res.message || 'Something went wrong while submitting your application. Please check your details and try again.',
                });
            }
        } catch (err) {
            console.error(err);
            setModal({
                open: true,
                type: 'error',
                title: 'Something Went Wrong',
                message: 'We could not process your request right now. Please try again in a moment.',
            });
        } finally {
            setLoading(false);
        }
    };

    const stepTitles = ['Identity', 'Expertise', 'Rates', 'Payouts', 'KYC'];
    const stepSubtitles = {
        1: 'Tell us who you are so we can set up your account.',
        2: 'Share your consultation focus and professional background.',
        3: 'Set the rates seekers will pay for each service you offer.',
        4: 'Add your payout details so we can settle your earnings.',
        5: 'Upload your documents for a quick verification.',
    };

    return (
        <div className="pp-root">
            <SideMenu isOpen={showSideMenu} onClose={() => setShowSideMenu(false)} />
            <PopupSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
            <MobileMenu isOpen={showMobileMenu} onClose={() => setShowMobileMenu(false)} />

            <Header
                onMenuToggle={() => setShowMobileMenu(true)}
                onSideMenuToggle={() => setShowSideMenu(true)}
                onSearchToggle={() => setShowSearch(true)}
                onLoginClick={() => setShowLoginModal(true)}
            />

            {/* ── Hero ── */}
            <section className="pp-hero-section">
                <div className="pp-container pp-hero-container">
                    <div className="pp-hero-banner">
                        {/* Dark Overlay */}
                        <div className="pp-hero-overlay" />

                        {/* Decorative Blur */}
                        <div className="pp-hero-blur" />

                        {/* Content */}
                        <div className="pp-container pp-hero-content">
                            <motion.div
                                initial={{ opacity: 0, y: 40 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                <span className="pp-hero-eyebrow">
                                    EXPERT PORTAL REGISTRATION
                                </span>

                                <h1 className="pp-hero-title">
                                    Join the{" "}
                                    <span className="pp-hero-title__accent">
                                        VaidikGuru Lineage
                                    </span>
                                </h1>

                                <p className="pp-hero-desc">
                                    Register as a verified astrologer and start guiding seekers on
                                    VaidikGuru.
                                </p>

                                <div className="pp-hero-divider" />
                            </motion.div>
                        </div>

                        {/* Golden Border */}
                        <div className="pp-hero-border" />
                    </div>
                </div>
            </section>

            {/* ── Form Section ── */}
            <section className="pp-section">
                <div className="pp-container pp-wizard-container" ref={wizardRef}>

                    {/* Step progress */}
                    <div className="pp-progress">
                        {stepTitles.map((title, index) => {
                            const stepNum = index + 1;
                            const isActive = step === stepNum;
                            const isCompleted = step > stepNum;
                            return (
                                <div key={stepNum} className="pp-progress__item">
                                    <div className="pp-progress__step-wrap">
                                        <div className={`pp-progress__dot ${isCompleted ? 'pp-progress__dot--done' : ''} ${isActive ? 'pp-progress__dot--active' : ''}`}>
                                            {isCompleted ? <Check size={16} /> : stepNum}
                                        </div>
                                        <span className={`pp-progress__label ${isActive ? 'pp-progress__label--active' : ''}`}>
                                            {title}
                                        </span>
                                    </div>
                                    {stepNum < 5 && (
                                        <div className={`pp-progress__line ${step > stepNum ? 'pp-progress__line--done' : ''}`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="pp-card pp-wizard-card"
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={animateKey}
                                initial={{ opacity: 0, x: 24 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -24 }}
                                transition={{ duration: 0.3 }}
                            >
                                {step === 1 && (
                                    <div>
                                        <h2 className="pp-heading">Identity Verification</h2>
                                        <p className="pp-step-subtitle">{stepSubtitles[1]}</p>
                                        <div className="pp-grid-2">
                                            <div className="pp-field">
                                                <label className="pp-field__label">Full Name *</label>
                                                <IconInput
                                                    icon={<User size={16} />}
                                                    name="name"
                                                    onChange={handleChange}
                                                    value={formData.name}
                                                    placeholder="Enter your full name"
                                                    error={errors.name}
                                                />
                                                {errors.name && <p className="pp-error">{errors.name}</p>}
                                            </div>

                                            <div className="pp-field">
                                                <label className="pp-field__label">Display Name *</label>
                                                <IconInput
                                                    icon={<User size={16} />}
                                                    name="displayname"
                                                    onChange={handleChange}
                                                    value={formData.displayname}
                                                    placeholder="Name to display to clients"
                                                    error={errors.displayname}
                                                />
                                                {errors.displayname && <p className="pp-error">{errors.displayname}</p>}
                                            </div>

                                            <div className="pp-field">
                                                <label className="pp-field__label">Email *</label>
                                                <IconInput
                                                    icon={<Mail size={16} />}
                                                    type="email"
                                                    name="email"
                                                    onChange={handleChange}
                                                    value={formData.email}
                                                    placeholder="your.email@example.com"
                                                    error={errors.email}
                                                />
                                                {errors.email && <p className="pp-error">{errors.email}</p>}
                                            </div>

                                            <div className="pp-field">
                                                <label className="pp-field__label">Mobile Number *</label>
                                                <IconInput
                                                    icon={<Phone size={16} />}
                                                    type="tel"
                                                    name="number"
                                                    onChange={handleChange}
                                                    value={formData.number}
                                                    placeholder="10-digit mobile number"
                                                    maxLength="10"
                                                    error={errors.number}
                                                />
                                                {errors.number && <p className="pp-error">{errors.number}</p>}
                                            </div>

                                            <div className="pp-field">
                                                <label className="pp-field__label">Password *</label>
                                                <IconInput
                                                    icon={<Lock size={16} />}
                                                    type="password"
                                                    name="password"
                                                    onChange={handleChange}
                                                    value={formData.password}
                                                    placeholder="Minimum 6 characters"
                                                    error={errors.password}
                                                />
                                                {errors.password && <p className="pp-error">{errors.password}</p>}
                                            </div>

                                            <div className="pp-field">
                                                <label className="pp-field__label">Gender *</label>
                                                <select
                                                    name="gender"
                                                    className="pp-input"
                                                    onChange={handleChange}
                                                    value={formData.gender}
                                                >
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>

                                            <div className="pp-field">
                                                <label className="pp-field__label">Date of Birth</label>
                                                <IconInput
                                                    icon={<Calendar size={16} />}
                                                    type="date"
                                                    name="dob"
                                                    onChange={handleChange}
                                                    value={formData.dob}
                                                />
                                            </div>

                                            <div className="pp-field">
                                                <label className="pp-field__label">Country</label>
                                                <select
                                                    name="country_id"
                                                    className="pp-input"
                                                    onChange={handleChange}
                                                    value={formData.country_id}
                                                >
                                                    <option value="">Select Country</option>
                                                    {countries.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div>
                                        <h2 className="pp-heading">Professional Mastery</h2>
                                        <p className="pp-step-subtitle">{stepSubtitles[2]}</p>

                                        <div className="pp-field">
                                            <label className="pp-field__label">Consultation Categories *</label>
                                            <div className="pp-pills">
                                                {categories.map(c => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        className={`pp-pill ${formData.category.includes(c.name) ? 'pp-pill--active' : ''}`}
                                                        onClick={() => toggleMultiSelect('category', c.name)}
                                                    >
                                                        {formData.category.includes(c.name) && <Check size={12} />}
                                                        {c.name}
                                                    </button>
                                                ))}
                                            </div>
                                            {errors.category && <p className="pp-error">{errors.category}</p>}
                                        </div>

                                        <div className="pp-field">
                                            <label className="pp-field__label">Languages</label>
                                            <div className="pp-pills">
                                                {languages.map(l => (
                                                    <button
                                                        key={l.id}
                                                        type="button"
                                                        className={`pp-pill pp-pill--alt ${formData.language.includes(l.name) ? 'pp-pill--active-alt' : ''}`}
                                                        onClick={() => toggleMultiSelect('language', l.name)}
                                                    >
                                                        {formData.language.includes(l.name) && <Check size={12} />}
                                                        {l.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pp-field">
                                            <label className="pp-field__label">Skills *</label>
                                            <div className="pp-pills">
                                                {skills.map(s => (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        className={`pp-pill pp-pill--rose ${formData.skill.includes(s.name) ? 'pp-pill--active-rose' : ''}`}
                                                        onClick={() => toggleMultiSelect('skill', s.name)}
                                                    >
                                                        {formData.skill.includes(s.name) && <Check size={12} />}
                                                        {s.name}
                                                    </button>
                                                ))}
                                            </div>
                                            {errors.skill && <p className="pp-error">{errors.skill}</p>}
                                        </div>

                                        <div className="pp-grid-2">
                                            <div className="pp-field">
                                                <label className="pp-field__label">Experience (Years) *</label>
                                                <IconInput
                                                    icon={<Briefcase size={16} />}
                                                    type="number"
                                                    name="experience"
                                                    onChange={handleChange}
                                                    value={formData.experience}
                                                    placeholder="Years of experience"
                                                    min="0"
                                                    error={errors.experience}
                                                />
                                                {errors.experience && <p className="pp-error">{errors.experience}</p>}
                                            </div>
                                        </div>

                                        <div className="pp-field">
                                            <label className="pp-field__label">Professional Bio *</label>
                                            <textarea
                                                className={`pp-input pp-input--textarea ${errors.bio ? 'pp-input--error' : ''}`}
                                                name="bio"
                                                rows="4"
                                                onChange={handleChange}
                                                value={formData.bio}
                                                placeholder="Tell us about your expertise and approach..."
                                            />
                                            {errors.bio && <p className="pp-error">{errors.bio}</p>}
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div>
                                        <h2 className="pp-heading">Service Pricing &amp; Rates</h2>
                                        <p className="pp-step-subtitle">{stepSubtitles[3]}</p>
                                        {errors.services && (
                                            <p className="pp-error pp-error--banner">
                                                <AlertTriangle size={14} /> {errors.services}
                                            </p>
                                        )}

                                        <div className="pp-service-grid">
                                            <div className="pp-service-card">
                                                <div className="pp-service-card__head">
                                                    <div className="pp-service-card__title">
                                                        <span className="pp-service-card__icon"><MessageCircle size={17} /></span>
                                                        <h3>Chat Service</h3>
                                                    </div>
                                                    <label className="pp-toggle">
                                                        <input
                                                            type="checkbox"
                                                            name="is_chat"
                                                            onChange={handleChange}
                                                            checked={formData.is_chat === "on"}
                                                        />
                                                        <span className="pp-toggle__slider"></span>
                                                    </label>
                                                </div>
                                                <label className="pp-field__label">Rate per Minute (₹)</label>
                                                <input
                                                    type="number"
                                                    className={`pp-input ${errors.per_min_chat ? 'pp-input--error' : ''}`}
                                                    name="per_min_chat"
                                                    onChange={handleChange}
                                                    value={formData.per_min_chat}
                                                    disabled={formData.is_chat === "off"}
                                                    placeholder="0"
                                                    min="0"
                                                />
                                                {errors.per_min_chat && <p className="pp-error">{errors.per_min_chat}</p>}
                                            </div>

                                            <div className="pp-service-card">
                                                <div className="pp-service-card__head">
                                                    <div className="pp-service-card__title">
                                                        <span className="pp-service-card__icon"><PhoneCall size={17} /></span>
                                                        <h3>Voice Call</h3>
                                                    </div>
                                                    <label className="pp-toggle">
                                                        <input
                                                            type="checkbox"
                                                            name="is_voice_call"
                                                            onChange={handleChange}
                                                            checked={formData.is_voice_call === "on"}
                                                        />
                                                        <span className="pp-toggle__slider"></span>
                                                    </label>
                                                </div>
                                                <label className="pp-field__label">Rate per Minute (₹)</label>
                                                <input
                                                    type="number"
                                                    className={`pp-input ${errors.per_min_voice_call ? 'pp-input--error' : ''}`}
                                                    name="per_min_voice_call"
                                                    onChange={handleChange}
                                                    value={formData.per_min_voice_call}
                                                    disabled={formData.is_voice_call === "off"}
                                                    placeholder="0"
                                                    min="0"
                                                />
                                                {errors.per_min_voice_call && <p className="pp-error">{errors.per_min_voice_call}</p>}
                                            </div>

                                            <div className="pp-service-card">
                                                <div className="pp-service-card__head">
                                                    <div className="pp-service-card__title">
                                                        <span className="pp-service-card__icon"><Video size={17} /></span>
                                                        <h3>Video Call</h3>
                                                    </div>
                                                    <label className="pp-toggle">
                                                        <input
                                                            type="checkbox"
                                                            name="is_video_call"
                                                            onChange={handleChange}
                                                            checked={formData.is_video_call === "on"}
                                                        />
                                                        <span className="pp-toggle__slider"></span>
                                                    </label>
                                                </div>
                                                <label className="pp-field__label">Rate per Minute (₹)</label>
                                                <input
                                                    type="number"
                                                    className={`pp-input ${errors.per_min_video_call ? 'pp-input--error' : ''}`}
                                                    name="per_min_video_call"
                                                    onChange={handleChange}
                                                    value={formData.per_min_video_call}
                                                    disabled={formData.is_video_call === "off"}
                                                    placeholder="0"
                                                    min="0"
                                                />
                                                {errors.per_min_video_call && <p className="pp-error">{errors.per_min_video_call}</p>}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 4 && (
                                    <div>
                                        <h2 className="pp-heading">Financial Details</h2>
                                        <p className="pp-step-subtitle">{stepSubtitles[4]}</p>

                                        <div className="pp-grid-2">
                                            <div className="pp-field">
                                                <label className="pp-field__label">Account Holder Name *</label>
                                                <IconInput
                                                    icon={<User size={16} />}
                                                    name="account_holder_name"
                                                    onChange={handleChange}
                                                    value={formData.account_holder_name}
                                                    placeholder="As per bank records"
                                                    error={errors.account_holder_name}
                                                />
                                                {errors.account_holder_name && <p className="pp-error">{errors.account_holder_name}</p>}
                                            </div>

                                            <div className="pp-field">
                                                <label className="pp-field__label">Bank Name *</label>
                                                <IconInput
                                                    icon={<Landmark size={16} />}
                                                    name="bank"
                                                    onChange={handleChange}
                                                    value={formData.bank}
                                                    placeholder="Enter bank name"
                                                    error={errors.bank}
                                                />
                                                {errors.bank && <p className="pp-error">{errors.bank}</p>}
                                            </div>

                                            <div className="pp-field">
                                                <label className="pp-field__label">Account Number *</label>
                                                <IconInput
                                                    icon={<Hash size={16} />}
                                                    name="account_no"
                                                    onChange={handleChange}
                                                    value={formData.account_no}
                                                    placeholder="Bank account number"
                                                    error={errors.account_no}
                                                />
                                                {errors.account_no && <p className="pp-error">{errors.account_no}</p>}
                                            </div>

                                            <div className="pp-field">
                                                <label className="pp-field__label">IFSC Code *</label>
                                                <IconInput
                                                    icon={<Hash size={16} />}
                                                    name="ifsc"
                                                    onChange={handleChange}
                                                    value={formData.ifsc}
                                                    placeholder="11-digit IFSC code"
                                                    error={errors.ifsc}
                                                />
                                                {errors.ifsc && <p className="pp-error">{errors.ifsc}</p>}
                                            </div>

                                            <div className="pp-field">
                                                <label className="pp-field__label">Account Type</label>
                                                <select
                                                    name="account_type"
                                                    className="pp-input"
                                                    onChange={handleChange}
                                                    value={formData.account_type}
                                                >
                                                    <option value="Saving">Saving</option>
                                                    <option value="Current">Current</option>
                                                </select>
                                            </div>

                                            <div className="pp-field">
                                                <label className="pp-field__label">PAN Card Number *</label>
                                                <IconInput
                                                    icon={<CreditCard size={16} />}
                                                    name="pan_card"
                                                    onChange={handleChange}
                                                    value={formData.pan_card}
                                                    placeholder="10-character PAN"
                                                    maxLength="10"
                                                    error={errors.pan_card}
                                                />
                                                {errors.pan_card && <p className="pp-error">{errors.pan_card}</p>}
                                            </div>

                                            <div className="pp-field">
                                                <label className="pp-field__label">Aadhar Card Number *</label>
                                                <IconInput
                                                    icon={<CreditCard size={16} />}
                                                    name="aadhar_card_no"
                                                    onChange={handleChange}
                                                    value={formData.aadhar_card_no}
                                                    placeholder="12-digit Aadhar number"
                                                    maxLength="12"
                                                    error={errors.aadhar_card_no}
                                                />
                                                {errors.aadhar_card_no && <p className="pp-error">{errors.aadhar_card_no}</p>}
                                            </div>

                                            <div className="pp-field">
                                                <label className="pp-field__label">GST Number (Optional)</label>
                                                <IconInput
                                                    icon={<FileText size={16} />}
                                                    name="gst"
                                                    onChange={handleChange}
                                                    value={formData.gst}
                                                    placeholder="GST number if applicable"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 5 && (
                                    <div>
                                        <h2 className="pp-heading">Secure Verification</h2>
                                        <p className="pp-step-subtitle">{stepSubtitles[5]}</p>

                                        <FileUploadField
                                            label="Profile Photo *"
                                            name="profile_img"
                                            accept="image/*"
                                            file={formData.profile_img}
                                            error={errors.profile_img}
                                            hint="Upload a clear photo of yourself"
                                            onFileSelect={handleFileSelect}
                                        />

                                        <FileUploadField
                                            label="Aadhar Card Copy *"
                                            name="aadhar_card_img"
                                            accept="image/*,application/pdf"
                                            file={formData.aadhar_card_img}
                                            error={errors.aadhar_card_img}
                                            hint="Upload scanned copy of your Aadhar card"
                                            onFileSelect={handleFileSelect}
                                        />

                                        <FileUploadField
                                            label="PAN Card Copy *"
                                            name="pan_card_img"
                                            accept="image/*,application/pdf"
                                            file={formData.pan_card_img}
                                            error={errors.pan_card_img}
                                            hint="Upload scanned copy of your PAN card"
                                            onFileSelect={handleFileSelect}
                                        />

                                        <div className="pp-notice">
                                            <ShieldCheck size={18} className="pp-notice__icon" />
                                            <p><strong>Privacy Notice:</strong> All documents are encrypted and stored securely. They will only be used for verification purposes and will not be shared with third parties.</p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {/* Navigation */}
                        <div className="pp-wizard-nav">
                            {step > 1 && (
                                <button onClick={handleBack} className="pp-btn-secondary">
                                    Back
                                </button>
                            )}

                            {step < 5 ? (
                                <button onClick={handleNext} className="pp-print-btn pp-wizard-nav__next">
                                    Next
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className={`pp-print-btn pp-wizard-nav__next ${loading ? 'pp-print-btn--disabled' : ''}`}
                                >
                                    {loading ? 'Submitting...' : 'Submit Application'}
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ── Astrologer App Download Banner ── */}
            <section className="pp-section pp-app-section">
                <div className="pp-container">
                    <div className="pp-app-banner-wrap">
                        <img
                            src="/assets/img/about/middlebanner_about.webp"
                            alt="VaidikGuru Astrologer App – Manage Consultations On the Go"
                            className="pp-app-banner-img"
                        />
                        <div className="pp-app-overlay">
                            <div className="pp-app-overlay-inner">
                                <div className="pp-app-stores">
                                    <div className="pp-app-scan">Download the App</div>
                                    <div className="pp-app-sub">Get the VaidikGuru Astrologer App Now</div>
                                    <div className="pp-app-btns">
                                        <a
                                            href="https://play.google.com/store/apps/details?id=com.astrologer.vaidikguru"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="pp-app-store-btn"
                                        >
                                            <i className="fab fa-google-play" />
                                            <span className="pp-app-store-btn__txt"><small>GET IT ON</small>Google Play</span>
                                        </a>
                                        <a
                                            href="https://apps.apple.com/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="pp-app-store-btn"
                                        >
                                            <i className="fab fa-apple" />
                                            <span className="pp-app-store-btn__txt"><small>Download on the</small>App Store</span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <TestimonialSection />
            <Footer />
            <ScrollTop />

            {/* ── Success / Fail Modal ── */}
            <AnimatePresence>
                {modal.open && (
                    <motion.div
                        className="pp-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setModal(prev => ({ ...prev, open: false }))}
                    >
                        <motion.div
                            className="pp-modal-card"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ duration: 0.25 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className={`pp-modal-icon ${modal.type === 'success' ? 'pp-modal-icon--success' : 'pp-modal-icon--error'}`}>
                                {modal.type === 'success' ? <Check size={28} /> : <X size={28} />}
                            </div>
                            <h3 className="pp-modal-title">{modal.title}</h3>
                            <p className="pp-modal-message">{modal.message}</p>
                            <button
                                className="pp-print-btn pp-modal-btn"
                                onClick={() => {
                                    setModal(prev => ({ ...prev, open: false }));
                                    if (modal.type === 'success') {
                                        navigate('/');
                                    }
                                }}
                            >
                                {modal.type === 'success' ? 'Great, Thanks!' : 'Try Again'}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
        :root {
          --pp-bg: #faf9f7;
          --pp-gold: #c9882a;
          --pp-gold-light: #f0a93b;
          --pp-maroon: #3a1330;
          --pp-maroon-deep: #2b0f23;
          --pp-ink: #1a1118;
          --pp-muted: #6b6070;
          --pp-line: #ede8eb;
          --pp-card: #ffffff;
          --pp-radius: 18px;
        }

        .pp-root { background: var(--pp-bg); font-family: 'Poppins', sans-serif; color: var(--pp-ink); }
        .pp-container { max-width: 1180px; margin: 0 auto; padding: 0 24px; }

        .pp-section { padding: 50px 0 90px; }

        /* ── Hero ── */
        .pp-hero-section {
          padding: 28px 0;
          background: #fff;
        }
        .pp-hero-container {
          max-width: 1400px;
        }
        .pp-hero-banner {
          position: relative;
          background-image: url("/assets/img/images/profile-hero-banner.jpeg");
          background-size: cover;
          background-position: center;
          border-radius: 24px;
          overflow: hidden;
          min-height: 350px;
          box-shadow: 0 18px 45px rgba(65, 15, 25, 0.18);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          cursor: pointer;
        }
        .pp-hero-banner:hover {
          transform: translateY(-4px) scale(1.005);
          box-shadow: 0 24px 60px rgba(65, 15, 25, 0.28);
        }
        .pp-hero-banner:hover .pp-hero-border {
          border-color: rgba(246,182,63,0.75);
        }
        .pp-hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(45,8,18,.85) 0%, rgba(70,10,25,.65) 45%, rgba(0,0,0,.20) 100%);
        }
        .pp-hero-blur {
          position: absolute;
          width: 350px;
          height: 350px;
          background: rgba(255,170,40,.12);
          filter: blur(120px);
          top: -120px;
          left: -100px;
          border-radius: 50%;
        }
        .pp-hero-content {
          position: relative;
          z-index: 2;
          min-height: 200px;
          display: flex;
          align-items: center;
          padding: 80px 70px;
        }
        .pp-hero-eyebrow {
          color: #F6B63F;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 2.5px;
          text-transform: uppercase;
        }
        .pp-hero-title {
          color: #fff;
          font-size: 40px;
          font-weight: 800;
          margin-top: 12px;
          line-height: 1.15;
        }
        .pp-hero-title__accent { color: #F6B63F; }
        .pp-hero-desc {
          color: rgba(255,255,255,.85);
          max-width: 620px;
          font-size: 15px;
          margin-top: 14px;
        }
        .pp-hero-divider {
          width: 110px;
          height: 4px;
          background: #F6B63F;
          border-radius: 50px;
          margin-top: 20px;
        }
        .pp-hero-border {
          position: absolute;
          inset: 10px;
          border: 1px solid rgba(246,182,63,.45);
          border-radius: 18px;
          pointer-events: none;
          transition: border-color 0.3s ease;
        }

        /* ── App Download Banner ── */
        .pp-app-section { padding: 0 0 60px; }
        .pp-app-banner-wrap {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 18px 45px rgba(65, 15, 25, 0.18);
        }
        .pp-app-banner-img {
          width: 100%;
          display: block;
          object-fit: cover;
        }
        .pp-app-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }
        .pp-app-overlay-inner {
          display: flex;
          align-items: center;
          gap: 18px;
          padding-right: 6%;
        }
        .pp-app-scan { color: #fff; font-weight: 700; font-size: 14px; }
        .pp-app-sub { color: rgba(255,255,255,.75); font-size: 11.5px; margin-bottom: 10px; }
        .pp-app-btns { display: flex; flex-direction: column; gap: 8px; }
        .pp-app-store-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 14px;
          border-radius: 8px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.3);
          color: #fff;
          text-decoration: none;
          transition: background 0.2s ease, transform 0.2s ease;
        }
        .pp-app-store-btn:hover { background: rgba(255,255,255,0.2); transform: translateY(-1px); color: #fff; }
        .pp-app-store-btn i { font-size: 15px; }
        .pp-app-store-btn__txt { display: flex; flex-direction: column; font-size: 11.5px; font-weight: 700; line-height: 1.2; }
        .pp-app-store-btn__txt small { font-size: 8.5px; font-weight: 500; opacity: 0.8; text-transform: uppercase; }

        @media (max-width: 860px) {
          .pp-app-overlay { position: static; background: linear-gradient(135deg, #6E2A22, #2A0C10); }
          .pp-app-overlay-inner { padding: 24px; flex-wrap: wrap; justify-content: center; text-align: center; margin: auto;}
        }

        /* ── Wizard container ── */
        .pp-wizard-container { max-width: 880px; scroll-margin-top: 100px; }

        /* ── Progress ── */
        .pp-progress { display: flex; align-items: flex-start; margin-bottom: 32px; }
        .pp-progress__item { display: flex; align-items: center; flex: 1; }
        .pp-progress__step-wrap { display: flex; flex-direction: column; align-items: center; flex: 1; }
        .pp-progress__dot {
          width: 38px; height: 38px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 14px;
          background: #ede8eb; color: var(--pp-muted);
          transition: all 0.25s ease;
        }
        .pp-progress__dot--active { background: linear-gradient(135deg, var(--pp-gold-light), var(--pp-gold)); color: #fff; }
        .pp-progress__dot--done { background: #4caf6d; color: #fff; }
        .pp-progress__label { font-size: 11.5px; margin-top: 8px; color: var(--pp-muted); font-weight: 500; }
        .pp-progress__label--active { color: var(--pp-maroon); font-weight: 700; }
        .pp-progress__line { height: 2px; flex: 1; margin: 0 4px; background: var(--pp-line); margin-bottom: 24px; transition: background 0.25s ease; }
        .pp-progress__line--done { background: #4caf6d; }

        /* ── Card ── */
        .pp-card {
          background: var(--pp-card);
          border: 1px solid var(--pp-line);
          border-radius: var(--pp-radius);
          padding: 44px 46px;
          box-shadow: 0 4px 24px rgba(60,20,40,0.06);
        }
        .pp-wizard-card { overflow: hidden; }
        .pp-heading { font-size: 24px; font-weight: 800; color: var(--pp-maroon); margin: 0 0 6px; }
        .pp-step-subtitle { font-size: 13.5px; color: var(--pp-muted); margin: 0 0 28px; }

        /* ── Grid / fields ── */
        .pp-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .pp-field { margin-bottom: 20px; }
        .pp-field__label { display: block; font-size: 13px; font-weight: 600; color: var(--pp-ink); margin-bottom: 7px; }
        .pp-input {
          width: 100%; border: 1px solid var(--pp-line); background: #fbf6f4;
          border-radius: 12px; padding: 13px 16px; font-family: 'Poppins', sans-serif;
          font-size: 14px; color: var(--pp-ink); outline: none;
          transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
        }
        .pp-input:focus { border-color: var(--pp-gold-light); background: #fff; box-shadow: 0 0 0 3px rgba(240,169,59,0.15); }
        .pp-input--error { border-color: #e0554f; }
        .pp-input--textarea { resize: vertical; }
        .pp-error { color: #e0554f; font-size: 12.5px; margin: 6px 0 0; display: flex; align-items: center; gap: 6px; }
        .pp-error--banner {
          background: #fdeceb; border: 1px solid rgba(224,85,79,0.3);
          padding: 10px 14px; border-radius: 10px; margin-bottom: 18px;
        }
        .pp-hint { color: var(--pp-muted); font-size: 12px; margin: 6px 0 0; }

        /* ── Icon-prefixed input ── */
        .pp-input-group {
          display: flex; align-items: center; gap: 10px;
          border: 1px solid var(--pp-line); background: #fbf6f4;
          border-radius: 12px; padding: 0 14px;
          transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
        }
        .pp-input-group:focus-within { border-color: var(--pp-gold-light); background: #fff; box-shadow: 0 0 0 3px rgba(240,169,59,0.15); }
        .pp-input-group--error { border-color: #e0554f; }
        .pp-input-group__icon { color: var(--pp-gold); display: flex; flex-shrink: 0; }
        .pp-input-group__field {
          flex: 1; border: none; outline: none; background: transparent;
          font-family: 'Poppins', sans-serif; font-size: 14px; color: var(--pp-ink);
          padding: 13px 0;
          min-width: 0;
        }

        /* ── Pills (multi-select) ── */
        .pp-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .pp-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 18px; border-radius: 50px; font-size: 13px; font-weight: 600;
          background: #f1ecef; color: var(--pp-muted); border: none; cursor: pointer;
          transition: all 0.18s ease;
        }
        .pp-pill--active { background: linear-gradient(135deg, var(--pp-gold-light), var(--pp-gold)); color: #fff; }
        .pp-pill--active-alt { background: #2e7d5b; color: #fff; }
        .pp-pill--active-rose { background: #c2185b; color: #fff; }

        /* ── Service cards / toggle ── */
        .pp-service-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        .pp-service-card {
          border: 1px solid var(--pp-line); border-radius: 16px; padding: 22px;
          background: #fbf6f4; transition: box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .pp-service-card:has(input:checked) { border-color: var(--pp-gold-light); box-shadow: 0 8px 22px rgba(201,136,42,0.12); }
        .pp-service-card__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .pp-service-card__title { display: flex; align-items: center; gap: 10px; }
        .pp-service-card__icon {
          width: 30px; height: 30px; border-radius: 9px;
          background: #fdeef0; color: #c2185b;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .pp-service-card__head h3 { font-size: 14.5px; font-weight: 700; color: var(--pp-maroon); margin: 0; }

        .pp-toggle { position: relative; display: inline-block; width: 42px; height: 24px; }
        .pp-toggle input { opacity: 0; width: 0; height: 0; }
        .pp-toggle__slider {
          position: absolute; cursor: pointer; inset: 0;
          background: #dcd4d8; border-radius: 24px; transition: 0.2s;
        }
        .pp-toggle__slider::before {
          content: ""; position: absolute; height: 18px; width: 18px;
          left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: 0.2s;
        }
        .pp-toggle input:checked + .pp-toggle__slider { background: var(--pp-gold-light); }
        .pp-toggle input:checked + .pp-toggle__slider::before { transform: translateX(18px); }

        /* ── File upload ── */
        .pp-upload {
          border: 2px dashed var(--pp-line);
          border-radius: 16px;
          background: #fbf6f4;
          padding: 22px;
          cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .pp-upload:hover { border-color: var(--pp-gold-light); background: #fdf6ec; }
        .pp-upload--drag { border-color: var(--pp-gold); background: #fdf1dc; }
        .pp-upload--error { border-color: #e0554f; }
        .pp-upload--filled { border-style: solid; background: #fff; }

        .pp-upload__empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px; }
        .pp-upload__icon {
          width: 46px; height: 46px; border-radius: 50%;
          background: #fdeef0; color: #c2185b;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 8px;
        }
        .pp-upload__text { font-size: 13.5px; color: var(--pp-ink); margin: 0; }
        .pp-upload__text strong { color: var(--pp-gold); }
        .pp-upload__subtext { font-size: 11.5px; color: var(--pp-muted); margin: 2px 0 0; }

        .pp-upload__preview { display: flex; align-items: center; gap: 14px; }
        .pp-upload__thumb { width: 56px; height: 56px; border-radius: 12px; object-fit: cover; flex-shrink: 0; }
        .pp-upload__filetype {
          width: 56px; height: 56px; border-radius: 12px;
          background: #fdeef0; color: #c2185b;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .pp-upload__info { flex: 1; min-width: 0; }
        .pp-upload__filename { font-size: 13.5px; font-weight: 600; color: var(--pp-ink); margin: 0 0 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pp-upload__filesize { font-size: 11.5px; color: var(--pp-muted); margin: 0; }
        .pp-upload__remove {
          width: 28px; height: 28px; border-radius: 50%; border: none;
          background: #fdeceb; color: #e0554f;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; flex-shrink: 0; transition: background 0.18s ease;
        }
        .pp-upload__remove:hover { background: #f9d5d3; }

        /* ── Notice ── */
        .pp-notice {
          margin-top: 24px; padding: 16px 18px; border-radius: 12px;
          background: #fdf3ee; border: 1px solid rgba(240,169,59,0.3);
          display: flex; align-items: flex-start; gap: 12px;
        }
        .pp-notice__icon { color: var(--pp-gold); flex-shrink: 0; margin-top: 2px; }
        .pp-notice p { font-size: 13px; color: var(--pp-maroon-deep); margin: 0; line-height: 1.6; }

        /* ── Nav buttons ── */
        .pp-wizard-nav { display: flex; justify-content: space-between; margin-top: 36px; }
        .pp-btn-secondary {
          padding: 13px 26px; border-radius: 12px; border: 1px solid var(--pp-line);
          background: #fff; color: var(--pp-ink); font-weight: 600; font-size: 13.5px;
          cursor: pointer; font-family: 'Poppins', sans-serif; transition: background 0.18s ease;
        }
        .pp-btn-secondary:hover { background: #f5f0f2; }
        .pp-print-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: linear-gradient(135deg, var(--pp-gold-light), var(--pp-gold));
          border: none; color: #fff; font-size: 13.5px; font-weight: 600;
          font-family: 'Poppins', sans-serif; padding: 13px 28px; border-radius: 12px;
          cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .pp-print-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(201,136,42,0.35); }
        .pp-wizard-nav__next { margin-left: auto; }
        .pp-print-btn--disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        /* ── Success / Fail modal ── */
        .pp-modal-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(26,17,24,0.55);
          backdrop-filter: blur(3px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .pp-modal-card {
          background: #fff; border-radius: 22px; padding: 40px 36px;
          max-width: 380px; width: 100%; text-align: center;
          box-shadow: 0 24px 60px rgba(43,15,35,0.35);
        }
        .pp-modal-icon {
          width: 64px; height: 64px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px;
        }
        .pp-modal-icon--success { background: #e4f6ea; color: #2e9e5b; }
        .pp-modal-icon--error { background: #fdeceb; color: #e0554f; }
        .pp-modal-title { font-size: 19px; font-weight: 800; color: var(--pp-maroon); margin: 0 0 10px; }
        .pp-modal-message { font-size: 13.5px; color: var(--pp-muted); line-height: 1.7; margin: 0 0 26px; }
        .pp-modal-btn { width: 100%; padding: 14px; }

        /* ── Responsive ── */
        @media (max-width: 860px) {
          .pp-hero-banner { min-height: 170px; border-radius: 18px; }
          .pp-hero-content { min-height: 170px; padding: 0 36px; }
          .pp-hero-title { font-size: 32px; margin-top: 10px; }
          .pp-hero-eyebrow { font-size: 12px; letter-spacing: 2px; }
          .pp-hero-desc { font-size: 13.5px; margin-top: 10px; }
        }
        @media (max-width: 760px) {
          .pp-grid-2 { grid-template-columns: 1fr; }
          .pp-service-grid { grid-template-columns: 1fr; }
          .pp-card { padding: 30px 22px; }
          .pp-progress__label { display: none; }
        }
        @media (max-width: 640px) {
          .pp-hero-section { padding: 18px 0; }
          .pp-hero-banner { min-height: 150px; border-radius: 14px; }
          .pp-hero-content { min-height: 150px; padding: 0 20px; }
          .pp-hero-title { font-size: 25px; margin-top: 8px; }
          .pp-hero-eyebrow { font-size: 10.5px; letter-spacing: 1.5px; }
          .pp-hero-desc { font-size: 12.5px; margin-top: 8px; line-height: 1.5; }
          .pp-hero-divider { width: 70px; height: 3px; margin-top: 14px; }
          .pp-hero-border { inset: 6px; border-radius: 10px; }
          .pp-hero-blur { width: 220px; height: 220px; filter: blur(80px); }
        }
        @media (max-width: 520px) {
          .pp-hero-content { padding: 0 16px; }
          .pp-hero-title { font-size: 21px; }
          .pp-hero-desc { font-size: 12px; }
        }
      `}</style>
        </div>
    );
};

export default AstrologerRegistration;