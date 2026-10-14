import React, { useState, useEffect, useRef } from "react";
import {
  Sun, Moon, Calendar, ChevronLeft, ChevronRight, MapPin, Clock,
  AlertTriangle, Compass, Sparkles, Flower2, Crown, Star, Wind, Sunrise, ChevronDown
} from "lucide-react";

import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import MobileMenu from "../components/layout/MobileMenu";
import PopupSearch from "../components/layout/PopupSearch";
import SideMenu from "../components/layout/SideMenu";
import ScrollTop from "../components/common/ScrollTop";
import { useSEO } from "../hooks/seoHook";
import { SEO } from "../config/seoConfig";

// ==========================================
// HIGH-FIDELITY VECTOR GRAPHICS (VEDIC DESIGN)
// ==========================================

const Kalash = ({ size = 125, className = "" }) => {
  return (
    <img
      src="/assets/img/images/kalashchadawa.png"
      alt="Kalash"
      width={size}
      height={size * 1.25}
      className={className}
      style={{
        objectFit: "contain",
        display: "block",
      }}
    />
  );
};

// ==========================================
// DYNAMIC PANCHANG DATA GENERATION
// ==========================================

const safeMod = (n, m) => ((n % m) + m) % m;

const getPanchangData = (targetDate) => {
  const baseDate = new Date(2026, 0, 4); // Saturday, January 04, 2026
  const diffTime = targetDate.getTime() - baseDate.getTime();
  const offset = Math.round(diffTime / (1000 * 3600 * 24));

  const formattedDate = targetDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Deterministic values wrapping monthly cycle
  const tithis = [
    { name: "Pratipada Krishna-Paksha", sub: "Till 12:31 PM", paksha: "Krishna-Paksha", month: "Magha", season: "Hemant Season" },
    { name: "Dwitiya Krishna-Paksha", sub: "Till 01:45 PM", paksha: "Krishna-Paksha", month: "Magha", season: "Hemant Season" },
    { name: "Tritiya Krishna-Paksha", sub: "Till 02:30 PM", paksha: "Krishna-Paksha", month: "Magha", season: "Hemant Season" },
    { name: "Chaturthi Krishna-Paksha", sub: "Till 03:10 PM", paksha: "Krishna-Paksha", month: "Magha", season: "Hemant Season" },
    { name: "Panchami Krishna-Paksha", sub: "Till 04:15 PM", paksha: "Krishna-Paksha", month: "Magha", season: "Hemant Season" },
    { name: "Pratipada Shukla-Paksha", sub: "Till 11:20 AM", paksha: "Shukla-Paksha", month: "Magha", season: "Hemant Season" },
    { name: "Dwitiya Shukla-Paksha", sub: "Till 12:05 PM", paksha: "Shukla-Paksha", month: "Magha", season: "Hemant Season" },
    { name: "Tritiya Shukla-Paksha", sub: "Till 01:10 PM", paksha: "Shukla-Paksha", month: "Magha", season: "Hemant Season" },
  ];

  const nakshatras = [
    { name: "Punarvasu", sub: "Till 3:12 PM" },
    { name: "Pushya", sub: "Till 4:40 PM" },
    { name: "Ashlesha", sub: "Till 5:15 PM" },
    { name: "Magha", sub: "Till 6:30 PM" },
    { name: "Purva Phalguni", sub: "Till 7:20 PM" },
  ];

  const yogas = [
    { name: "Vaidhriti", sub: "Till 1:48 AM" },
    { name: "Vishkumbha", sub: "Till 12:50 AM" },
    { name: "Preeti", sub: "Till 11:35 PM" },
    { name: "Ayushman", sub: "Till 10:12 PM" },
  ];

  const karanas = [
    { name: "Kaulav", sub: "Till 12:33 PM" },
    { name: "Taitila", sub: "Till 11:45 AM" },
    { name: "Garaja", sub: "Till 01:12 PM" },
    { name: "Vanija", sub: "Till 02:40 PM" },
  ];

  const tithiIdx = safeMod(offset, tithis.length);
  const nakIdx = safeMod(offset, nakshatras.length);
  const yogaIdx = safeMod(offset, yogas.length);
  const karIdx = safeMod(offset, karanas.length);

  const t = tithis[tithiIdx];
  const n = nakshatras[nakIdx];
  const y = yogas[yogaIdx];
  const k = karanas[karIdx];

  // Specific dates for upcoming festivals based on January 2026
  const festivals = offset === 0 ? ["Ishti", "Magha Begins * North"] : [`Sankalpa Puja Day ${Math.abs(offset)}`, `Celestial Alignment Event`];

  return {
    dateLabel: formattedDate,
    tithi: t.name,
    tithiSub: t.sub,
    paksha: t.paksha,
    month: t.month,
    season: t.season,
    nakshatra: n.name,
    nakshatraSub: n.sub,
    yoga: y.name,
    yogaSub: y.sub,
    karana: k.name,
    karanaSub: k.sub,
    festivals: festivals,
    sunrise: offset % 2 === 0 ? "6:45 AM" : "6:46 AM",
    sunset: offset % 2 === 0 ? "5:22 PM" : "5:23 PM",
    moonrise: offset % 2 === 0 ? "6:25 PM" : "6:32 PM",
    moonset: offset % 2 === 0 ? "7:36 AM" : "7:45 AM",
    sunSign: offset % 2 === 0 ? "Sagittarius" : "Capricorn",
    moonSign: offset % 2 === 0 ? "Gemini" : "Cancer",
    direction: offset % 2 === 0 ? "WEST" : "NORTH",
    abhijit: offset % 2 === 0 ? "11:43 AM - 12:25 PM" : "11:40 AM - 12:22 PM",
    rahu: offset % 2 === 0 ? "4:03 PM - 5:22 PM" : "4:05 PM - 5:25 PM",
    gulika: offset % 2 === 0 ? "2:43 PM - 4:03 PM" : "2:45 PM - 4:05 PM",
    yamaghant: offset % 2 === 0 ? "12:04 PM - 1:23 PM" : "12:06 PM - 1:25 PM",
  };
};

const STYLES = `
  .dq-root {
    --ink: #2B2340;
    --purple: #5B2A86;
    --orange: #E8703A;
    --cream: #FBF3E3;
    --line: #EDE6D8;
    font-family: 'Poppins', 'Inter', sans-serif;
    background: #FDFBF7;
    color: var(--ink);
  }
  .serif-heading {
    font-family: 'Playfair Display', 'Georgia', 'Times New Roman', serif;
  }
  .ornament-line {
    position: relative;
    height: 16px;
    background-image: radial-gradient(circle, #D4AF37 2.5px, transparent 3.5px);
    background-size: 16px 16px;
    background-position: center;
  }
  .ornament-line::before, .ornament-line::after {
    content: "";
    position: absolute;
    top: 7px;
    height: 1px;
    width: 38%;
    background: linear-gradient(to right, transparent, #D4AF37 50%, transparent);
  }
  .ornament-line::before { left: 4%; }
  .ornament-line::after { right: 4%; }

  /* Compact Footer spacing overrides */
  .footer-diviniq-final {
    margin-top: 1.5rem !important;
    padding-top: 2.5rem !important;
    padding-bottom: 1.5rem !important;
  }
  .footer-diviniq-final .mb-80 {
    margin-bottom: 2rem !important;
  }
  .footer-diviniq-final .pb-60 {
    padding-bottom: 1.5rem !important;
  }
  .footer-diviniq-final .mt-100 {
    margin-top: 2rem !important;
  }
  .footer-diviniq-final .pt-40 {
    padding-top: 1rem !important;
  }

  /* =========================================================
     RESPONSIVE ENHANCEMENTS
     ========================================================= */

  .dq-root {
    overflow-x: hidden;
  }

  @media (max-width: 480px) {
    .serif-heading {
      line-height: 1.15;
    }
    .ornament-line {
      height: 12px;
    }
  }

  /* ---- Date navigation bar & location pill ---- */
  @media (max-width: 480px) {
    .dq-date-label {
      font-size: 13px !important;
      line-height: 1.3;
    }
    .dq-location-pill {
      width: 100%;
      justify-content: center;
    }
    .dq-location-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 180px;
    }
  }
  @media (max-width: 360px) {
    .dq-location-text {
      max-width: 130px;
    }
  }

  /* ---- Hero banner: full-bleed on mobile ---- */
  @media (max-width: 768px) {
    .dq-hero-section {
      max-width: 100% !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
    }
    .dq-hero-section .puja-hero-card {
      border-radius: 0 !important;
    }
  }

  /* ---- "Explore Sacred Panchang" hero banner ---- */
  .puja-hero-card {
    background-image: url('/assets/img/bg/panchang_hero_bg.webp');
    background-size: cover;
    background-position: center;
    padding-top: 8px;
    padding-bottom: 8px;
  }
  .puja-hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      100deg,
      rgba(15, 3, 8, 0.94) 0%,
      rgba(15, 3, 8, 0.75) 35%,
      rgba(15, 3, 8, 0.35) 65%,
      rgba(15, 3, 8, 0.1) 90%
    );
  }
  .puja-hero-badge {
    transition: background 0.18s ease, transform 0.18s ease;
  }
  .puja-hero-badge:hover {
    background: rgba(0, 0, 0, 0.45);
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    .puja-hero-overlay {
      background: linear-gradient(
        180deg,
        rgba(15, 3, 8, 0.55) 0%,
        rgba(15, 3, 8, 0.85) 55%,
        rgba(15, 3, 8, 0.96) 100%
      );
    }
  }
  @media (max-width: 480px) {
    .puja-hero-badges {
      gap: 8px !important;
      padding-left: 16px !important;
      padding-right: 16px !important;
      padding-top: 4px !important;
      padding-bottom: 24px !important;
    }
    .puja-hero-badge {
      padding: 6px 10px !important;
    }
    .puja-hero-badge span:last-child {
      font-size: 10px !important;
    }
  }

  /* =========================================================
     CONTENT CARDS — each card family has its own class,
     height is always driven by content (no forced h-full,
     no min-height stretching), spacing lives here instead of
     being repeated inline so nothing conflicts between cards.
     ========================================================= */

  .dq-panel {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 16px;
    box-shadow: 0 1px 2px rgba(43, 35, 64, 0.04);
    padding: 18px;
    height: fit-content;
  }
  .dq-panel-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 10px;
    margin-bottom: 14px;
    border-bottom: 1px solid var(--line);
  }
  .dq-panel-header h3 {
    font-size: 15px;
    font-weight: 700;
    color: #1f2937;
  }

  /* Row wrappers — single source of truth for the 2/3-column grids.
     Mobile-first: everything is a single stacked column by default;
     breakpoints below turn specific rows into 2 columns. */
  .dq-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
    align-items: start;
    margin-bottom: 20px;
  }
  .dq-row > * {
    align-self: start;
  }

  /* Panchang Elements */
  .dq-panchang-grid {
    display: grid;
    grid-template-columns: 1fr;
    column-gap: 28px;
  }
  .dq-panchang-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 8px 6px;
    border-bottom: 1px solid #f9fafb;
    border-radius: 10px;
    transition: background 0.15s ease;
  }
  .dq-panchang-row:hover {
    background: rgba(0, 0, 0, 0.02);
  }
  .dq-panchang-row:last-child {
    border-bottom: none;
  }
  .dq-panchang-icon {
    width: 34px;
    height: 34px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #fff;
  }
  .dq-panchang-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: #9ca3af;
    text-transform: uppercase;
  }
  .dq-panchang-value {
    font-size: 14px;
    font-weight: 700;
    color: #1f2937;
    line-height: 1.2;
    margin-top: 1px;
  }
  .dq-panchang-sub {
    font-size: 12px;
    color: #6b7280;
    font-weight: 500;
  }

  /* Today's Festivals */
  .dq-festival-today-card {
    background: linear-gradient(to bottom right, #fff0f5, #fff5ee);
  }
  .dq-festival-today-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .dq-festival-today-item {
    background: #fff;
    border-radius: 12px;
    padding: 14px;
    border: 1px solid rgba(251, 207, 232, 0.3);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .dq-festival-today-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: #9333ea;
    flex-shrink: 0;
    animation: dq-pulse 2s ease-in-out infinite;
  }
  @keyframes dq-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .dq-festival-today-note {
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px solid rgba(251, 207, 232, 0.7);
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: #6b7280;
    font-weight: 500;
  }

  /* Sun / Moon Timings — height comes purely from their own content */
  .dq-skyrow {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }
  .dq-sky-card {
    border-radius: 16px;
    padding: 18px;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .dq-sky-card--sun {
    background: linear-gradient(to bottom right, #fff8ec, #ffe9cc);
  }
  .dq-sky-card--moon {
    background: linear-gradient(to bottom right, #eef2ff, #dce4ff);
  }
  .dq-sky-card-head {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .dq-sky-card-icon {
    width: 30px;
    height: 30px;
    border-radius: 999px;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
    flex-shrink: 0;
  }
  .dq-sky-card-title {
    font-size: 14px;
    font-weight: 700;
    color: #1f2937;
  }
  .dq-sky-card-times {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 10;
  }
  .dq-sky-card-time-label {
    font-size: 12px;
    color: #6b7280;
    font-weight: 500;
  }
  .dq-sky-card-time-value {
    font-size: 19px;
    font-weight: 900;
    margin-top: 1px;
  }
  .dq-sky-card--sun .dq-sky-card-time-value { color: #ea580c; }
  .dq-sky-card--moon .dq-sky-card-time-value { color: #4f46e5; }
  .dq-sky-card-sign {
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    position: relative;
    z-index: 10;
  }
  .dq-sky-card-wave {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: auto;
    opacity: 0.1;
    pointer-events: none;
    z-index: 0;
  }

  /* Upcoming Festivals */
  .dq-upcoming-list {
    display: flex;
    flex-direction: column;
  }
  .dq-upcoming-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 0;
    border-bottom: 1px solid #f9fafb;
  }
  .dq-upcoming-item:last-child {
    border-bottom: none;
  }
  .dq-upcoming-name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #374151;
  }
  .dq-upcoming-date {
    font-size: 11px;
    font-weight: 700;
    color: #f97316;
    background: #fff7ed;
    padding: 2px 10px;
    border-radius: 999px;
    border: 1px solid rgba(251, 146, 60, 0.2);
  }
  .dq-upcoming-btn {
    width: 100%;
    margin-top: 14px;
    padding: 9px 0;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: #fff9f2;
    color: #ea580c;
    border: 1px solid #fed7aa;
    transition: background 0.15s ease;
  }
  .dq-upcoming-btn:hover {
    background: #fff7ed;
  }

  /* Auspicious & Inauspicious Timings */
  .dq-auspicious-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .dq-muhurat-box {
    border-radius: 12px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(236, 253, 245, 0.7);
    border: 1px solid rgba(167, 243, 208, 0.5);
    position: relative;
    overflow: hidden;
  }
  .dq-muhurat-title {
    font-size: 12px;
    font-weight: 700;
    color: #047857;
    letter-spacing: 0.03em;
  }
  .dq-muhurat-sub {
    font-size: 11px;
    color: #6b7280;
    font-weight: 600;
    margin-top: 2px;
    display: block;
  }
  .dq-muhurat-value {
    font-size: 14px;
    font-weight: 800;
    color: #047857;
    position: relative;
    z-index: 10;
  }
  .dq-muhurat-motif {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    opacity: 0.1;
    width: 90px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .dq-inauspicious-box {
    border-radius: 12px;
    padding: 12px 16px;
    background: rgba(254, 242, 242, 0.6);
    border: 1px solid rgba(254, 202, 202, 0.5);
  }
  .dq-inauspicious-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 9px;
    padding-bottom: 7px;
    border-bottom: 1px solid rgba(254, 202, 202, 0.5);
  }
  .dq-inauspicious-head span {
    font-size: 12px;
    font-weight: 700;
    color: #dc2626;
    letter-spacing: 0.03em;
  }
  .dq-inauspicious-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .dq-inauspicious-item-label {
    font-size: 11px;
    font-weight: 600;
    color: #6b7280;
  }
  .dq-inauspicious-item-value {
    font-size: 14px;
    font-weight: 800;
    color: #dc2626;
    margin-top: 1px;
  }
  .dq-disha-box {
    border-radius: 12px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255, 251, 235, 0.7);
    border: 1px solid rgba(253, 230, 138, 0.5);
  }
  .dq-disha-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .dq-disha-icon {
    width: 38px;
    height: 38px;
    border-radius: 999px;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    color: #d97706;
    flex-shrink: 0;
  }
  .dq-disha-title {
    font-size: 12px;
    font-weight: 700;
    color: #b45309;
    letter-spacing: 0.03em;
  }
  .dq-disha-sub {
    font-size: 11px;
    color: #6b7280;
    font-weight: 600;
    margin-top: 2px;
    display: block;
  }
  .dq-disha-value {
    font-size: 14px;
    font-weight: 800;
    color: #b45309;
    background: #fff;
    padding: 6px 14px;
    border-radius: 999px;
    border: 1px solid #fde68a;
  }

  /* Additional Details */
  .dq-details-card {
    background: linear-gradient(to bottom right, #f5f2fc, #ece6fa);
  }
  .dq-details-list {
    display: flex;
    flex-direction: column;
  }
  .dq-details-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 0;
    border-bottom: 1px solid rgba(233, 213, 255, 0.5);
  }
  .dq-details-row:last-child {
    border-bottom: none;
  }
  .dq-details-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #4b5563;
  }
  .dq-details-value {
    font-size: 13px;
    font-weight: 700;
    color: #1f2937;
  }

  /* What is Panchang */
  .dq-about-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    text-align: center;
  }
  .dq-about-icon {
    width: 60px;
    height: 60px;
    border-radius: 999px;
    background: #fffbeb;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #d97706;
    border: 1px solid #fde68a;
    flex-shrink: 0;
  }
  .dq-about-text h3 {
    font-size: 17px;
    font-weight: 800;
    color: #1f2937;
    margin-bottom: 8px;
  }
  .dq-about-text p {
    font-size: 13px;
    color: #4b5563;
    line-height: 1.6;
    font-weight: 500;
  }
  .dq-about-kalash {
    flex-shrink: 0;
    width: 170px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* =========================================================
     RESPONSIVE LAYOUT BREAKPOINTS
     Mobile-first base above == always a single stacked column.
     From tablet (768px) the inner grids (Panchang Elements,
     inauspicious-timings row, About card) go multi-column.
     From desktop (1024px) the two-card ROWS themselves split
     into a main column + a narrower side column, matching the
     reference design.
     ========================================================= */

  @media (min-width: 768px) {
    .dq-panchang-grid { grid-template-columns: 1fr 1fr; }
    .dq-inauspicious-grid { grid-template-columns: repeat(3, 1fr); }
    .dq-about-card {
      flex-direction: row;
      justify-content: space-between;
      text-align: left;
    }
    .dq-about-kalash { width: 200px; }
  }

  @media (min-width: 1024px) {
    .dq-row--main {
      grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
    }
    .dq-row--sky {
      grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
    }
    .dq-skyrow {
      grid-template-columns: 1fr 1fr;
    }
    .dq-sky-card {
      height: 190px;
    }
  }
`;

export default function PanchangPage() {
  useSEO(SEO.panchang);
  const [selectedDate, setSelectedDate] = useState(() => new Date(2026, 0, 4));
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isStylesReady, setIsStylesReady] = useState(false);
  const dateInputRef = useRef(null);

  const handleOpenCalendar = () => {
    if (dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === "function") {
        dateInputRef.current.showPicker();
      } else {
        dateInputRef.current.click();
      }
    }
  };

  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleDateInputChange = (e) => {
    if (e.target.value) {
      const [y, m, d] = e.target.value.split("-").map(Number);
      if (y && m && d) {
        setSelectedDate(new Date(y, m - 1, d));
      }
    }
  };

  // Dynamic Tailwind loader
  useEffect(() => {
    if (window.tailwind) {
      setIsStylesReady(true);
    }

    const existing = document.getElementById("tailwind-cdn-script");
    if (existing) {
      setIsStylesReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.tailwindcss.com";
    script.id = "tailwind-cdn-script";
    script.onload = () => {
      if (window.tailwind) {
        window.tailwind.config = {
          corePlugins: {
            preflight: false,
          }
        };
      }
      setIsStylesReady(true);
    };
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById("tailwind-cdn-script");
      if (el) document.head.removeChild(el);

      const styleTags = document.querySelectorAll("style");
      styleTags.forEach((s) => {
        if (s.textContent && (s.textContent.includes("tailwindcss") || s.textContent.includes("--tw-"))) {
          s.remove();
        }
      });
    };
  }, []);

  const d = getPanchangData(selectedDate);

  if (!isStylesReady) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          color: "#9a7b2f",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "3px solid #EDE6D8",
            borderTopColor: "#E8703A",
            animation: "dq-spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes dq-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="dq-root min-h-screen">
      <style>{STYLES}</style>

      {/* Standard Layout Menus */}
      <SideMenu isOpen={showSideMenu} onClose={() => setShowSideMenu(false)} />
      <PopupSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
      <MobileMenu isOpen={showMobileMenu} onClose={() => setShowMobileMenu(false)} />

      {/* Global Header */}
      <Header
        onMenuToggle={() => setShowMobileMenu(true)}
        onSideMenuToggle={() => setShowSideMenu(true)}
        onSearchToggle={() => setShowSearch(true)}
        onLoginClick={() => setShowLoginModal(true)}
      />

      {/* Space to separate from sticky header */}
      <div className="h-6"></div>

      {/* ==========================================
          1. HERO DAILY PANCHANG BANNER
          ========================================== */}
      <section className="dq-hero-section max-w-6xl mx-auto px-4 md:px-6 mb-6">
        <div className="puja-hero-card rounded-[24px] relative overflow-hidden">
          <div className="puja-hero-overlay"></div>

          {/* Text block */}
          <div className="relative z-10 px-6 pt-8 pb-4 md:px-12 md:pt-12 md:pb-6 max-w-xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-4 bg-white/10 text-orange-300 border border-white/20 backdrop-blur-sm">
              <Sun size={12} className="text-orange-400" /> Daily Panchang
            </span>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight text-white serif-heading">
              Explore
              <span className="block text-orange-500">Sacred Panchang</span>
            </h1>
            <p className="mt-3 text-sm md:text-base text-gray-200 max-w-md font-medium">
              Discover today's auspicious timings and Vedic wisdom, guided by ancient tradition for a better tomorrow.
            </p>
          </div>

          {/* Badge row */}
          <div className="puja-hero-badges relative z-10 flex flex-wrap gap-3 px-6 pb-6 md:px-12 md:pb-8">
            {[].map((b, i) => {
              const Icon = b.icon;
              return (
                <div key={i} className="puja-hero-badge flex items-center gap-2 px-3 py-2 rounded-full bg-black/30 border border-white/15 backdrop-blur-sm">
                  <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-orange-400 flex-shrink-0">
                    <Icon size={13} />
                  </span>
                  <span className="text-[11px] md:text-xs font-semibold text-white whitespace-nowrap">{b.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==========================================
          2. DATE NAVIGATION & LOCATION BAR
          ========================================== */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 mb-6">
        <div className="bg-white rounded-2xl border border-[#EDE6D8] p-4 md:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">

          {/* Hidden native date picker */}
          <input
            ref={dateInputRef}
            type="date"
            value={formatDateForInput(selectedDate)}
            onChange={handleDateInputChange}
            style={{
              position: "absolute",
              opacity: 0,
              width: 0,
              height: 0,
              pointerEvents: "none",
              zIndex: -1,
            }}
          />

          {/* Date Selector */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <button
              onClick={() => setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1))}
              className="w-10 h-10 rounded-full flex items-center justify-center border border-[#EDE6D8] bg-white hover:bg-[#FBF3E3] transition-colors"
              aria-label="Previous Day"
              title="Previous Day"
            >
              <ChevronLeft size={18} className="text-gray-700" />
            </button>
            <div className="h-8 w-px bg-[#EDE6D8] hidden sm:block"></div>

            <button
              type="button"
              onClick={handleOpenCalendar}
              className="flex items-center gap-3 text-center md:text-left bg-transparent border-0 p-0 cursor-pointer group text-left"
              title="Click to view calendar / select date"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 border border-orange-100 group-hover:bg-orange-100 group-hover:border-orange-300 transition-all">
                <Calendar size={18} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="dq-date-label text-base md:text-lg font-bold text-gray-800 tracking-tight group-hover:text-orange-600 transition-colors">
                    {d.dateLabel}
                  </h2>
                  <ChevronDown size={16} className="text-orange-500 group-hover:translate-y-0.5 transition-transform" />
                </div>
                <p className="text-xs text-orange-600 font-semibold">{d.tithiSub}</p>
              </div>
            </button>

            <div className="h-8 w-px bg-[#EDE6D8] hidden sm:block"></div>
            <button
              onClick={() => setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1))}
              className="w-10 h-10 rounded-full flex items-center justify-center border border-[#EDE6D8] bg-white hover:bg-[#FBF3E3] transition-colors"
              aria-label="Next Day"
              title="Next Day"
            >
              <ChevronRight size={18} className="text-gray-700" />
            </button>
          </div>

          {/* Location Selector */}
          <div className="dq-location-pill flex items-center gap-2 bg-[#FBF3E3] border border-[#EDE6D8] px-4 py-2.5 rounded-full shadow-sm cursor-pointer hover:bg-[#F5EAD4] transition-colors self-center">
            <MapPin size={15} className="text-orange-600 fill-orange-100 flex-shrink-0" />
            <span className="dq-location-text text-xs md:text-sm font-semibold text-gray-700">Lucknow, Uttar Pradesh, IN</span>
            <ChevronDown size={14} className="text-gray-500 ml-1 flex-shrink-0" />
          </div>

        </div>
      </section>

      {/* ==========================================
          3. MAIN LAYOUT CONTENT (ROW-BASED GRIDS)
          ========================================== */}
      {/* Section 1: Panchang Elements + Today's Festivals */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 dq-row dq-row--main">
        <div>
          {/* Panchang Elements Card */}
          <div className="dq-panel">
            <div className="dq-panel-header">
              <Calendar size={18} className="text-orange-500" />
              <h3>Panchang Elements</h3>
            </div>

            <div className="dq-panchang-grid">
              {[
                { label: "TITHI", value: d.tithi, sub: d.tithiSub, icon: Sunrise, color: "#F4623A" },
                { label: "KARANA", value: d.karana, sub: d.karanaSub, icon: Sparkles, color: "#2FA84F" },
                { label: "NAKSHATRA", value: d.nakshatra, sub: d.nakshatraSub, icon: Star, color: "#8A4FE0" },
                { label: "PAKSHA", value: d.paksha, sub: d.season, icon: Moon, color: "#3B7FE0" },
                { label: "YOGA", value: d.yoga, sub: d.yogaSub, icon: Wind, color: "#2D8FE0" },
                { label: "MONTH", value: d.month, sub: d.season, icon: Calendar, color: "#E0508F" },
              ].map((el, i) => {
                const Icon = el.icon;
                return (
                  <div key={i} className="dq-panchang-row">
                    <div className="dq-panchang-icon" style={{ background: el.color }}>
                      <Icon size={15} />
                    </div>
                    <div>
                      <span className="dq-panchang-label">{el.label}</span>
                      <h4 className="dq-panchang-value">{el.value}</h4>
                      {el.sub && <span className="dq-panchang-sub">{el.sub}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          {/* Today's Festivals Card */}
          <div className="dq-panel dq-festival-today-card">
            <div className="dq-panel-header" style={{ borderColor: "#fbcfe8" }}>
              <Crown size={18} className="text-pink-600" />
              <h3>Today's Festivals</h3>
            </div>
            <div className="dq-festival-today-list">
              {d.festivals.map((fest, idx) => (
                <div key={idx} className="dq-festival-today-item">
                  <span className="dq-festival-today-dot"></span>
                  <span className="text-xs md:text-sm font-semibold text-gray-700">{fest}</span>
                </div>
              ))}
            </div>
            <div className="dq-festival-today-note">
              <Sparkles size={13} className="text-pink-500 flex-shrink-0" />
              <span>Considered favorable for puja and new beginnings.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Sun & Moon Timings + Upcoming Festivals */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 dq-row dq-row--sky">
        <div className="dq-skyrow">
          {/* Sun Timings Card */}
          <div className="dq-sky-card dq-sky-card--sun">
            <div>
              <div className="dq-sky-card-head">
                <div className="dq-sky-card-icon">
                  <Sun size={16} className="fill-orange-400 text-orange-500" />
                </div>
                <h4 className="dq-sky-card-title">Sun Timings</h4>
              </div>
              <div className="dq-sky-card-times" style={{ marginTop: 14 }}>
                <div>
                  <span className="dq-sky-card-time-label">Sunrise</span>
                  <p className="dq-sky-card-time-value">{d.sunrise}</p>
                </div>
                <div>
                  <span className="dq-sky-card-time-label">Sunset</span>
                  <p className="dq-sky-card-time-value">{d.sunset}</p>
                </div>
              </div>
            </div>
            <div className="dq-sky-card-sign">
              Sun Sign: <span style={{ color: "#ea580c" }}>{d.sunSign}</span>
            </div>
            <svg viewBox="0 0 300 60" className="dq-sky-card-wave fill-orange-500">
              <path d="M0,60 C40,45 80,45 120,55 C160,65 200,60 240,40 C280,20 300,30 320,60 Z" />
            </svg>
          </div>

          {/* Moon Timings Card */}
          <div className="dq-sky-card dq-sky-card--moon">
            <div>
              <div className="dq-sky-card-head">
                <div className="dq-sky-card-icon">
                  <Moon size={16} className="fill-indigo-400 text-indigo-500" />
                </div>
                <h4 className="dq-sky-card-title">Moon Timings</h4>
              </div>
              <div className="dq-sky-card-times" style={{ marginTop: 14 }}>
                <div>
                  <span className="dq-sky-card-time-label">Moonrise</span>
                  <p className="dq-sky-card-time-value">{d.moonrise}</p>
                </div>
                <div>
                  <span className="dq-sky-card-time-label">Moonset</span>
                  <p className="dq-sky-card-time-value">{d.moonset}</p>
                </div>
              </div>
            </div>
            <div className="dq-sky-card-sign">
              Moon Sign: <span style={{ color: "#4f46e5" }}>{d.moonSign}</span>
            </div>
            <svg viewBox="0 0 300 60" className="dq-sky-card-wave fill-indigo-500">
              <path d="M0,50 Q60,35 120,48 T240,30 Q280,30 300,50 L300,60 L0,60 Z" />
            </svg>
          </div>
        </div>

        <div>
          {/* Upcoming Festivals Card */}
          <div className="dq-panel">
            <div className="dq-panel-header">
              <Calendar size={18} className="text-orange-500" />
              <h3>Upcoming Festivals</h3>
            </div>

            <div className="dq-upcoming-list">
              {[
                { name: "Sakat Chauth", date: "6 January" },
                { name: "Sankashti Chaturthi", date: "6 January" },
                { name: "Kalashtami", date: "10 January" },
                { name: "Lohri", date: "14 January" },
                { name: "Makara Sankranti", date: "15 January" },
                { name: "Pongal", date: "15 January" },
              ].map((it, idx) => (
                <div key={idx} className="dq-upcoming-item">
                  <div className="dq-upcoming-name">
                    <Calendar size={14} className="text-gray-400" />
                    <span>{it.name}</span>
                  </div>
                  <span className="dq-upcoming-date">{it.date}</span>
                </div>
              ))}
            </div>

            <button className="dq-upcoming-btn" onClick={handleOpenCalendar} type="button" title="Open Calendar">
              <Calendar size={15} /> View Full Calendar
            </button>
          </div>
        </div>
      </section>

      {/* Section 3: Auspicious & Inauspicious Timings + Additional Details */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 dq-row dq-row--main">
        <div>
          {/* Auspicious & Inauspicious Timings Card */}
          <div className="dq-panel">
            <div className="dq-panel-header">
              <Clock size={18} className="text-orange-500" />
              <h3>Auspicious &amp; Inauspicious Timings</h3>
            </div>

            <div className="dq-auspicious-list">
              <div className="dq-muhurat-box">
                <div>
                  <h4 className="dq-muhurat-title">ABHIJIT MUHURAT</h4>
                  <span className="dq-muhurat-sub">Most Auspicious Time</span>
                </div>
                <span className="dq-muhurat-value">{d.abhijit}</span>
                <div className="dq-muhurat-motif">
                  <svg width="56" height="56" viewBox="0 0 100 100" className="fill-emerald-800">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />
                    <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="1" />
                    <path d="M50,10 L50,90 M10,50 L90,50 M20,20 L80,80 M20,80 L80,20" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>

              <div className="dq-inauspicious-box">
                <div className="dq-inauspicious-head">
                  <AlertTriangle size={15} className="text-red-500" />
                  <span>INAUSPICIOUS TIMINGS</span>
                </div>
                <div className="dq-inauspicious-grid">
                  {[
                    { label: "Rahu Kaal", val: d.rahu },
                    { label: "Gulika Kaal", val: d.gulika },
                    { label: "Yamaghant Kaal", val: d.yamaghant }
                  ].map((it, idx) => (
                    <div key={idx}>
                      <span className="dq-inauspicious-item-label">{it.label}</span>
                      <span className="dq-inauspicious-item-value" style={{ display: "block" }}>{it.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dq-disha-box">
                <div className="dq-disha-left">
                  <div className="dq-disha-icon">
                    <Compass size={17} />
                  </div>
                  <div>
                    <h4 className="dq-disha-title">Disha Shool</h4>
                    <span className="dq-disha-sub">Avoid travel in this direction</span>
                  </div>
                </div>
                <span className="dq-disha-value">{d.direction}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          {/* Additional Details Card */}
          <div className="dq-panel dq-details-card">
            <div className="dq-panel-header" style={{ borderColor: "#e9d5ff" }}>
              <Sparkles size={18} className="text-purple-600" />
              <h3>Additional Details</h3>
            </div>

            <div className="dq-details-list">
              {[
                { label: "Nakshatra", value: d.nakshatra, icon: Star },
                { label: "Season", value: "Hemant", icon: Wind },
                { label: "Sun Sign", value: d.sunSign, icon: Sun },
                { label: "Moon Sign", value: d.moonSign, icon: Moon },
                { label: "Disha Shool", value: d.direction, icon: Compass }
              ].map((r, i) => {
                const Icon = r.icon;
                return (
                  <div key={i} className="dq-details-row">
                    <div className="dq-details-label">
                      <Icon size={14} className="text-purple-600" />
                      <span>{r.label}</span>
                    </div>
                    <span className="dq-details-value">{r.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: What is Panchang (Full Width) */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 mb-8">
        {/* What is Panchang Explanation Card */}
        <div className="dq-panel dq-about-card">
          <div className="dq-about-icon">
            <Flower2 className="w-7 h-7" />
          </div>
          <div className="dq-about-text" style={{ flex: 1 }}>
            <h3>What is Panchang?</h3>
            <p>
              A Panchang is a Hindu calendar that provides details about important celestial occurrences and their influence on life.
              The term "Panchang" is derived from the Sanskrit words <span className="font-semibold text-orange-600">Pancha (five)</span> and <span className="font-semibold text-orange-600">Anga (limb)</span>, meaning "five limbs" or components.
              These five elements - Tithi (Lunar Day), Vara (Day of the Week), Nakshatra (Constellation), Yoga (Auspicious Combination), and Karana (Half of a Tithi) - help determine the most auspicious or inauspicious timings for daily life activities, ceremonies, and rituals.
            </p>
          </div>
          <div className="dq-about-kalash">
            <Kalash size={150} />
          </div>
        </div>
      </section>

      {/* Global Footer */}
      <Footer />

      {/* Global Scroll-to-Top Button */}
      <ScrollTop />
    </div>
  );
}