import React from 'react';
import {
  Radio,
  RotateCcw,
  Printer,
  Calendar,
  CheckCircle2,
  LogIn,
  LogOut,
  Building2,
  ShieldCheck,
  Eye,
  Database,
  Loader2,
  Mail,
  KeyRound
} from 'lucide-react';
import type { UploadedFileMetadata } from '../types/dashboard';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onResetFilters: () => void;
  activeFiltersCount: number;
  totalFilteredSites: number;
  totalBaselineSites: number;
  onExportCsv?: () => void;
  onExportBackup?: () => void;
  isExportingBackup?: boolean;
  onEmailBackup?: () => void;
  isEmailingBackup?: boolean;
  onPrint: () => void;
  onOpenUploadModal?: () => void;
  activeUploadedMetadata?: UploadedFileMetadata | null;
  onResetToDefault?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onResetFilters,
  activeFiltersCount,
  totalFilteredSites,
  totalBaselineSites,
  onExportBackup,
  isExportingBackup = false,
  onEmailBackup,
  isEmailingBackup = false,
  onPrint,
  activeUploadedMetadata,
  onResetToDefault,
}) => {
  const { user, openLoginModal, logout } = useAuth();

  return (
    <header className="pbi-header-banner text-white rounded-2xl shadow-xl p-4 sm:p-5 mb-5 border border-slate-700/60 transition-all">
      {/* ── TOP SECTION: Brand, Scope Status & User Account Controls ── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-white/10">

        {/* Title & Telecom Branding */}
        <div className="flex items-center gap-3.5 shrink-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/25 text-white font-bold ring-2 ring-white/20 shrink-0">
            <Radio className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight font-sans text-white">
                  Fiber Tracking Board
                </h1>
                <span className="relative flex h-2.5 w-2.5" title="مباشر (Live)">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>

              {activeUploadedMetadata && (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300 font-semibold bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-400/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  بيانات إكسيل مرفوعة: {activeUploadedMetadata.fileName}
                </span>
              )}
            </div>

            {/* Subtitle line */}
            <p className="text-slate-300 text-xs sm:text-sm mt-0.5 font-normal tracking-wide">
              Fiber To The Site (FTTS) • WE • Vodafone • Orange Rollout Dashboard
            </p>

            {/* Site count placed on its own clean line below subtitle */}
            <div className="text-sky-300 text-xs mt-1 font-medium flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0"></span>
              <span>
                عرض {totalFilteredSites} من أصل {totalBaselineSites} موقع
              </span>
              {user && user.role !== 'admin' ? (
                <span className="mr-1 text-emerald-300 font-bold">({user.sector})</span>
              ) : (
                <span className="mr-1 text-purple-300 font-bold">(كافة القطاعات)</span>
              )}
            </div>
          </div>
        </div>

        {/* Center Optical-Fiber Branching Network (Full-Bleed Edge-to-Edge with Zero Side Gaps) */}
        <div className="hidden md:flex flex-1 items-center justify-center mx-1 lg:mx-3 h-[84px] sm:h-[92px] max-w-[660px] min-w-[260px] pointer-events-none select-none">
          <div className="w-full h-full bg-[#020714] border border-cyan-500/35 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.22),inset_0_0_20px_rgba(1,4,14,0.95)] flex items-center justify-center overflow-hidden relative backdrop-blur-md">
            <svg
              viewBox="0 0 720 140"
              preserveAspectRatio="none"
              className="w-full h-full overflow-hidden"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Intense Neon Glow Filters */}
                <filter id="neonLaserGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3.5" result="blur1" />
                  <feGaussianBlur stdDeviation="1.5" result="blur2" />
                  <feMerge>
                    <feMergeNode in="blur1" />
                    <feMergeNode in="blur2" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter id="hotFlareGlow" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="4.5" result="b1" />
                  <feGaussianBlur stdDeviation="1.8" result="b2" />
                  <feMerge>
                    <feMergeNode in="b1" />
                    <feMergeNode in="b2" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Ambient Circuit Pattern */}
                <pattern id="ambientGrid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#081932" strokeWidth="0.5" opacity="0.35" />
                </pattern>

                {/* Core Radial Aura */}
                <radialGradient id="chipAura" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="35%" stopColor="#00f0ff" stopOpacity="0.75" />
                  <stop offset="70%" stopColor="#0284c7" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Ambient Grid Backdrop */}
              <rect width="720" height="140" fill="url(#ambientGrid)" />

              {/* ══════════ LEFT EDGE: EXTENDED FIBER CONDUITS (FLUSH WITH LEFT BORDER) ══════════ */}
              {/* Backing Dark Conduits from x = 0 */}
              <path d="M 0 50 L 55 50 L 78 62 L 122 62" stroke="#05172e" strokeWidth="4" strokeLinecap="round" />
              <path d="M 0 64 L 122 64" stroke="#05172e" strokeWidth="4" strokeLinecap="round" />
              <path d="M 0 74 L 122 74" stroke="#05172e" strokeWidth="4" strokeLinecap="round" />
              <path d="M 0 84 L 55 84 L 78 74 L 122 74" stroke="#05172e" strokeWidth="4" strokeLinecap="round" />
              <path d="M 0 98 L 60 98 L 84 84 L 122 84" stroke="#05172e" strokeWidth="4" strokeLinecap="round" />

              {/* Glowing Active Neon Lines from x = 0 */}
              <path d="M 0 50 L 55 50 L 78 62 L 122 62" stroke="#00f0ff" strokeWidth="1.8" strokeLinecap="round" filter="url(#neonLaserGlow)" />
              <path d="M 0 64 L 122 64" stroke="#00f0ff" strokeWidth="1.8" strokeLinecap="round" filter="url(#neonLaserGlow)" />
              <path d="M 0 74 L 122 74" stroke="#00f0ff" strokeWidth="1.8" strokeLinecap="round" filter="url(#neonLaserGlow)" />
              <path d="M 0 84 L 55 84 L 78 74 L 122 74" stroke="#00f0ff" strokeWidth="1.8" strokeLinecap="round" filter="url(#neonLaserGlow)" />
              <path d="M 0 98 L 60 98 L 84 84 L 122 84" stroke="#00f0ff" strokeWidth="1.8" strokeLinecap="round" filter="url(#neonLaserGlow)" />

              {/* Rushing Light Pulses along Left Input Lines */}
              <path d="M 0 64 L 122 64" stroke="#ffffff" strokeWidth="2.4" strokeDasharray="14 20" strokeLinecap="round" filter="url(#neonLaserGlow)">
                <animate attributeName="stroke-dashoffset" from="0" to="-34" dur="0.6s" repeatCount="indefinite" />
              </path>
              <path d="M 0 74 L 122 74" stroke="#38bdf8" strokeWidth="2.4" strokeDasharray="14 20" strokeLinecap="round" filter="url(#neonLaserGlow)">
                <animate attributeName="stroke-dashoffset" from="0" to="-34" dur="0.65s" begin="0.15s" repeatCount="indefinite" />
              </path>

              {/* Left Bus Lens Flare */}
              <g transform="translate(68, 69)" filter="url(#hotFlareGlow)">
                <circle cx="0" cy="0" r="3" fill="#ffffff" />
                <path d="M 0 -10 L 1.2 -1.5 L 10 0 L 1.2 1.5 L 0 10 L -1.2 1.5 L -10 0 L -1.2 -1.5 Z" fill="#ffffff" opacity="0.95" />
              </g>

              {/* ══════════ CENTRAL OPTICAL PROCESSOR CHIP (HUB) ══════════ */}
              <g id="opticalChipHub">
                {/* Outer Rounded Chassis */}
                <rect x="122" y="42" width="56" height="56" rx="8" fill="#020817" stroke="#00f0ff" strokeWidth="2.2" filter="url(#neonLaserGlow)" />
                <rect x="125" y="45" width="50" height="50" rx="6" fill="#010511" stroke="#0284c7" strokeWidth="0.8" />

                {/* Top Connection Pins */}
                <line x1="132" y1="38" x2="132" y2="42" stroke="#38bdf8" strokeWidth="1.5" />
                <line x1="141" y1="38" x2="141" y2="42" stroke="#38bdf8" strokeWidth="1.5" />
                <line x1="150" y1="38" x2="150" y2="42" stroke="#38bdf8" strokeWidth="1.5" />
                <line x1="159" y1="38" x2="159" y2="42" stroke="#38bdf8" strokeWidth="1.5" />
                <line x1="168" y1="38" x2="168" y2="42" stroke="#38bdf8" strokeWidth="1.5" />

                {/* Bottom Connection Pins */}
                <line x1="132" y1="98" x2="132" y2="102" stroke="#38bdf8" strokeWidth="1.5" />
                <line x1="141" y1="98" x2="141" y2="102" stroke="#38bdf8" strokeWidth="1.5" />
                <line x1="150" y1="98" x2="150" y2="102" stroke="#38bdf8" strokeWidth="1.5" />
                <line x1="159" y1="98" x2="159" y2="102" stroke="#38bdf8" strokeWidth="1.5" />
                <line x1="168" y1="98" x2="168" y2="102" stroke="#38bdf8" strokeWidth="1.5" />

                {/* Internal Maze Circuit Quadrants (Matching Reference Image) */}
                <path d="M 130 50 L 143 50 L 143 63" fill="none" stroke="#00f0ff" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M 135 55 L 139 55 L 139 60" fill="none" stroke="#38bdf8" strokeWidth="1" strokeLinecap="round" />

                <path d="M 170 50 L 157 50 L 157 63" fill="none" stroke="#00f0ff" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M 165 55 L 161 55 L 161 60" fill="none" stroke="#38bdf8" strokeWidth="1" strokeLinecap="round" />

                <path d="M 130 90 L 143 90 L 143 77" fill="none" stroke="#00f0ff" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M 135 85 L 139 85 L 139 80" fill="none" stroke="#38bdf8" strokeWidth="1" strokeLinecap="round" />

                <path d="M 170 90 L 157 90 L 157 77" fill="none" stroke="#00f0ff" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M 165 85 L 161 85 L 161 80" fill="none" stroke="#38bdf8" strokeWidth="1" strokeLinecap="round" />

                {/* Central Diamond Core Pulse */}
                <rect x="146.5" y="66.5" width="7" height="7" fill="#00f0ff" transform="rotate(45 150 70)" filter="url(#neonLaserGlow)">
                  <animate attributeName="opacity" values="0.6;1;0.6" dur="0.8s" repeatCount="indefinite" />
                </rect>
                <circle cx="150" cy="70" r="14" fill="url(#chipAura)">
                  <animate attributeName="r" values="8;18;8" dur="0.9s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0.85;0.3" dur="0.9s" repeatCount="indefinite" />
                </circle>
              </g>

              {/* Output Bus Flare */}
              <g transform="translate(186, 70)" filter="url(#hotFlareGlow)">
                <circle cx="0" cy="0" r="3.5" fill="#ffffff" />
                <path d="M 0 -12 L 1.5 -1.8 L 12 0 L 1.5 1.8 L 0 12 L -1.5 1.8 L -12 0 L -1.5 -1.8 Z" fill="#ffffff" opacity="0.95" />
              </g>

              {/* ══════════ MAIN TRUNK (CHIP TO FORK) ══════════ */}
              <line x1="178" y1="56" x2="245" y2="56" stroke="#00f0ff" strokeWidth="1.8" filter="url(#neonLaserGlow)" />
              <line x1="178" y1="65" x2="245" y2="65" stroke="#00f0ff" strokeWidth="1.8" filter="url(#neonLaserGlow)" />
              <line x1="178" y1="75" x2="245" y2="75" stroke="#00f0ff" strokeWidth="1.8" filter="url(#neonLaserGlow)" />
              <line x1="178" y1="84" x2="245" y2="84" stroke="#00f0ff" strokeWidth="1.8" filter="url(#neonLaserGlow)" />

              {/* Floating Pill Accents */}
              <rect x="195" y="46" width="16" height="2.5" rx="1.2" fill="#00f0ff" opacity="0.8" />
              <rect x="195" y="93" width="16" height="2.5" rx="1.2" fill="#00f0ff" opacity="0.8" />

              {/* Main Trunk Fast Stream */}
              <line x1="178" y1="65" x2="245" y2="65" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="14 18" strokeLinecap="round" filter="url(#neonLaserGlow)">
                <animate attributeName="stroke-dashoffset" from="0" to="-32" dur="0.4s" repeatCount="indefinite" />
              </line>

              {/* ══════════ UPPER BRANCH: TOWARDS HOUSES ══════════ */}
              {/* Backing Conduits */}
              <path d="M 245 56 L 285 25 L 460 25 L 472 32 L 485 32" stroke="#05172e" strokeWidth="4" strokeLinecap="round" />
              <path d="M 245 65 L 292 34 L 545 34 L 558 26 L 570 26" stroke="#05172e" strokeWidth="4" strokeLinecap="round" />
              <path d="M 245 75 L 300 43 L 720 43" stroke="#05172e" strokeWidth="4" strokeLinecap="round" />
              <path d="M 380 43 L 415 66 L 555 66" stroke="#05172e" strokeWidth="4" strokeLinecap="round" />

              {/* Active Neon Lines */}
              <path d="M 245 56 L 285 25 L 460 25 L 472 32 L 485 32" stroke="#00f0ff" strokeWidth="1.8" strokeLinecap="round" filter="url(#neonLaserGlow)" />
              <path d="M 245 65 L 292 34 L 545 34 L 558 26 L 570 26" stroke="#00f0ff" strokeWidth="1.8" strokeLinecap="round" filter="url(#neonLaserGlow)" />
              <path d="M 245 75 L 300 43 L 720 43" stroke="#00f0ff" strokeWidth="1.8" strokeLinecap="round" filter="url(#neonLaserGlow)" />
              <path d="M 380 43 L 415 66 L 555 66" stroke="#00f0ff" strokeWidth="1.8" strokeLinecap="round" filter="url(#neonLaserGlow)" />

              {/* Upper Floating Pills */}
              <rect x="360" y="16" width="18" height="2.5" rx="1.2" fill="#00f0ff" opacity="0.8" />
              <circle cx="350" cy="17.2" r="1.3" fill="#ffffff" />
              <rect x="375" y="52" width="16" height="2.5" rx="1.2" fill="#00f0ff" opacity="0.6" />

              {/* Streaming Data Pulses to Houses */}
              <path d="M 245 56 L 285 25 L 460 25 L 472 32 L 485 32" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="18 40" strokeLinecap="round" filter="url(#neonLaserGlow)">
                <animate attributeName="stroke-dashoffset" from="0" to="-116" dur="0.8s" repeatCount="indefinite" />
              </path>
              <circle r="3.5" fill="#ffffff" filter="url(#hotFlareGlow)">
                <animateMotion path="M 245 56 L 285 25 L 460 25 L 472 32 L 485 32" dur="0.8s" repeatCount="indefinite" />
              </circle>

              <path d="M 245 65 L 292 34 L 545 34 L 558 26 L 570 26" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="20 45" strokeLinecap="round" filter="url(#neonLaserGlow)">
                <animate attributeName="stroke-dashoffset" from="0" to="-130" dur="0.85s" begin="0.15s" repeatCount="indefinite" />
              </path>
              <circle r="3.5" fill="#ffffff" filter="url(#hotFlareGlow)">
                <animateMotion path="M 245 65 L 292 34 L 545 34 L 558 26 L 570 26" dur="0.85s" begin="0.15s" repeatCount="indefinite" />
              </circle>

              <path d="M 245 75 L 300 43 L 720 43" stroke="#ffffff" strokeWidth="2.6" strokeDasharray="22 50" strokeLinecap="round" filter="url(#neonLaserGlow)">
                <animate attributeName="stroke-dashoffset" from="0" to="-144" dur="0.9s" begin="0.3s" repeatCount="indefinite" />
              </path>
              <circle r="4" fill="#ffffff" filter="url(#hotFlareGlow)">
                <animateMotion path="M 245 75 L 300 43 L 720 43" dur="0.9s" begin="0.3s" repeatCount="indefinite" />
              </circle>

              <path d="M 380 43 L 415 66 L 555 66" stroke="#00f0ff" strokeWidth="2.4" strokeDasharray="16 35" strokeLinecap="round" filter="url(#neonLaserGlow)">
                <animate attributeName="stroke-dashoffset" from="0" to="-102" dur="0.75s" begin="0.45s" repeatCount="indefinite" />
              </path>

              {/* Upper Bend Flare */}
              <g transform="translate(290, 32)" filter="url(#hotFlareGlow)">
                <circle cx="0" cy="0" r="3.5" fill="#ffffff" />
                <path d="M 0 -12 L 1.5 -1.8 L 12 0 L 1.5 1.8 L 0 12 L -1.5 1.8 L -12 0 L -1.5 -1.8 Z" fill="#ffffff" opacity="0.95" />
              </g>

              {/* ══════════ LOWER BRANCH: TOWARDS MOBILE TOWER ══════════ */}
              {/* Backing Conduits */}
              <path d="M 245 75 L 285 98 L 440 98 L 450 90 L 460 90" stroke="#05172e" strokeWidth="4" strokeLinecap="round" />
              <path d="M 245 84 L 292 108 L 525 108" stroke="#05172e" strokeWidth="4" strokeLinecap="round" />
              <path d="M 255 92 L 300 118 L 585 118" stroke="#05172e" strokeWidth="4" strokeLinecap="round" />
              <path d="M 265 99 L 308 126 L 640 126" stroke="#05172e" strokeWidth="4" strokeLinecap="round" />
              <path d="M 320 133 L 720 133" stroke="#05172e" strokeWidth="3.5" strokeLinecap="round" />

              {/* Active Neon Lines */}
              <path d="M 245 75 L 285 98 L 440 98 L 450 90 L 460 90" stroke="#00f0ff" strokeWidth="1.8" strokeLinecap="round" filter="url(#neonLaserGlow)" />
              <path d="M 245 84 L 292 108 L 525 108" stroke="#00f0ff" strokeWidth="1.8" strokeLinecap="round" filter="url(#neonLaserGlow)" />
              <path d="M 255 92 L 300 118 L 585 118" stroke="#00f0ff" strokeWidth="1.8" strokeLinecap="round" filter="url(#neonLaserGlow)" />
              <path d="M 265 99 L 308 126 L 640 126" stroke="#00f0ff" strokeWidth="1.8" strokeLinecap="round" filter="url(#neonLaserGlow)" />
              <path d="M 320 133 L 720 133" stroke="#00f0ff" strokeWidth="1.6" strokeLinecap="round" filter="url(#neonLaserGlow)" />

              {/* Lower Floating Pills */}
              <rect x="330" y="132" width="16" height="2.5" rx="1.2" fill="#00f0ff" opacity="0.75" />
              <circle cx="355" cy="133.2" r="1.3" fill="#ffffff" />

              {/* Streaming Pulses to Tower */}
              <path d="M 265 99 L 308 126 L 640 126" stroke="#ffffff" strokeWidth="2.8" strokeDasharray="22 50" strokeLinecap="round" filter="url(#neonLaserGlow)">
                <animate attributeName="stroke-dashoffset" from="0" to="-144" dur="0.88s" begin="0.4s" repeatCount="indefinite" />
              </path>
              <circle r="4" fill="#ffffff" filter="url(#hotFlareGlow)">
                <animateMotion path="M 265 99 L 308 126 L 640 126" dur="0.88s" begin="0.4s" repeatCount="indefinite" />
              </circle>

              {/* Lower Bend Flare */}
              <g transform="translate(294, 110)" filter="url(#hotFlareGlow)">
                <circle cx="0" cy="0" r="3.5" fill="#ffffff" />
                <path d="M 0 -12 L 1.5 -1.8 L 12 0 L 1.5 1.8 L 0 12 L -1.5 1.8 L -12 0 L -1.5 -1.8 Z" fill="#ffffff" opacity="0.95" />
              </g>

              {/* Stepped Lower Line Glowing Termination Dots */}
              <circle cx="460" cy="90" r="3" fill="#ffffff" filter="url(#hotFlareGlow)" />
              <circle cx="525" cy="108" r="3" fill="#ffffff" filter="url(#hotFlareGlow)" />
              <circle cx="585" cy="118" r="3" fill="#ffffff" filter="url(#hotFlareGlow)" />

              {/* ══════════ 4 HOUSES (NEON LINE ART MATCHING REFERENCE) ══════════ */}
              {/* House 1: Top Left */}
              <g transform="translate(488, 12)">
                <path d="M 0 11 L 11 0 L 22 11" fill="none" stroke="#00f0ff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonLaserGlow)" />
                <path d="M 15 4 L 15 1 L 18 1 L 18 7" fill="none" stroke="#00f0ff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="2" y="11" width="18" height="12" rx="0.5" fill="#02091c" stroke="#00f0ff" strokeWidth="1.6" />
                <rect x="5" y="13.5" width="4.5" height="4.5" rx="0.5" fill="none" stroke="#67e8f9" strokeWidth="1.1" />
                <path d="M 13 23 L 13 16 L 17.5 16 L 17.5 23" fill="none" stroke="#67e8f9" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="-3" cy="20" r="3.2" fill="#ffffff" filter="url(#hotFlareGlow)">
                  <animate attributeName="r" values="2.6;3.6;2.6" dur="0.8s" repeatCount="indefinite" />
                </circle>
              </g>

              {/* House 2: Top Middle (Highest) */}
              <g transform="translate(573, 6)">
                <path d="M 0 11 L 11 0 L 22 11" fill="none" stroke="#00f0ff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonLaserGlow)" />
                <path d="M 15 4 L 15 1 L 18 1 L 18 7" fill="none" stroke="#00f0ff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="2" y="11" width="18" height="12" rx="0.5" fill="#02091c" stroke="#00f0ff" strokeWidth="1.6" />
                <rect x="5" y="13.5" width="4.5" height="4.5" rx="0.5" fill="none" stroke="#67e8f9" strokeWidth="1.1" />
                <path d="M 13 23 L 13 16 L 17.5 16 L 17.5 23" fill="none" stroke="#67e8f9" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="-3" cy="20" r="3.2" fill="#ffffff" filter="url(#hotFlareGlow)">
                  <animate attributeName="r" values="2.6;3.6;2.6" dur="0.85s" begin="0.15s" repeatCount="indefinite" />
                </circle>
              </g>

              {/* House 3: Top Right (Furthest) */}
              <g transform="translate(653, 22)">
                <path d="M 0 11 L 11 0 L 22 11" fill="none" stroke="#00f0ff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonLaserGlow)" />
                <path d="M 15 4 L 15 1 L 18 1 L 18 7" fill="none" stroke="#00f0ff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="2" y="11" width="18" height="12" rx="0.5" fill="#02091c" stroke="#00f0ff" strokeWidth="1.6" />
                <rect x="5" y="13.5" width="4.5" height="4.5" rx="0.5" fill="none" stroke="#67e8f9" strokeWidth="1.1" />
                <path d="M 13 23 L 13 16 L 17.5 16 L 17.5 23" fill="none" stroke="#67e8f9" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="-3" cy="21" r="3.2" fill="#ffffff" filter="url(#hotFlareGlow)">
                  <animate attributeName="r" values="2.6;3.6;2.6" dur="0.9s" begin="0.3s" repeatCount="indefinite" />
                </circle>
              </g>

              {/* House 4: Lower Cluster House */}
              <g transform="translate(558, 45)">
                <path d="M 0 11 L 11 0 L 22 11" fill="none" stroke="#00f0ff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonLaserGlow)" />
                <path d="M 15 4 L 15 1 L 18 1 L 18 7" fill="none" stroke="#00f0ff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="2" y="11" width="18" height="12" rx="0.5" fill="#02091c" stroke="#00f0ff" strokeWidth="1.6" />
                <rect x="5" y="13.5" width="4.5" height="4.5" rx="0.5" fill="none" stroke="#67e8f9" strokeWidth="1.1" />
                <path d="M 13 23 L 13 16 L 17.5 16 L 17.5 23" fill="none" stroke="#67e8f9" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="-3" cy="21" r="3.2" fill="#ffffff" filter="url(#hotFlareGlow)">
                  <animate attributeName="r" values="2.6;3.6;2.6" dur="0.75s" begin="0.45s" repeatCount="indefinite" />
                </circle>
              </g>

              {/* ══════════ MOBILE CELL TOWER (BOTTOM RIGHT) ══════════ */}
              <g transform="translate(675, 96)">
                {/* Triangular Lattice Mast */}
                <line x1="-14" y1="36" x2="0" y2="-12" stroke="#00f0ff" strokeWidth="1.6" strokeLinecap="round" filter="url(#neonLaserGlow)" />
                <line x1="14" y1="36" x2="0" y2="-12" stroke="#00f0ff" strokeWidth="1.6" strokeLinecap="round" filter="url(#neonLaserGlow)" />

                {/* Horizontal Ties */}
                <line x1="-11" y1="24" x2="11" y2="24" stroke="#00f0ff" strokeWidth="1.2" />
                <line x1="-7.5" y1="12" x2="7.5" y2="12" stroke="#00f0ff" strokeWidth="1.2" />
                <line x1="-4" y1="0" x2="4" y2="0" stroke="#00f0ff" strokeWidth="1.2" />

                {/* Diagonal Cross-Bracing */}
                <line x1="-11" y1="24" x2="7.5" y2="12" stroke="#38bdf8" strokeWidth="1" />
                <line x1="11" y1="24" x2="-7.5" y2="12" stroke="#38bdf8" strokeWidth="1" />
                <line x1="-7.5" y1="12" x2="4" y2="0" stroke="#38bdf8" strokeWidth="1" />
                <line x1="7.5" y1="12" x2="-4" y2="0" stroke="#38bdf8" strokeWidth="1" />

                {/* Center Antenna Head Circle */}
                <circle cx="0" cy="-14" r="3.5" fill="#02091c" stroke="#00f0ff" strokeWidth="1.6" filter="url(#neonLaserGlow)" />
                <circle cx="0" cy="-14" r="1.5" fill="#ffffff" />

                {/* Radiating Wireless Arcs (Left) */}
                <path d="M -6 -19 C -10 -16, -10 -12, -6 -9" fill="none" stroke="#00f0ff" strokeWidth="1.4" strokeLinecap="round">
                  <animate attributeName="opacity" values="0.3;1;0.3" dur="1.3s" repeatCount="indefinite" />
                </path>
                <path d="M -10 -23 C -16 -18, -16 -10, -10 -5" fill="none" stroke="#38bdf8" strokeWidth="1.3" strokeLinecap="round">
                  <animate attributeName="opacity" values="0.2;1;0.2" dur="1.3s" begin="0.25s" repeatCount="indefinite" />
                </path>
                <path d="M -14 -27 C -22 -20, -22 -8, -14 -1" fill="none" stroke="#00f0ff" strokeWidth="1.1" strokeLinecap="round" opacity="0.85">
                  <animate attributeName="opacity" values="0.1;0.9;0.1" dur="1.3s" begin="0.5s" repeatCount="indefinite" />
                </path>

                {/* Radiating Wireless Arcs (Right) */}
                <path d="M 6 -19 C 10 -16, 10 -12, 6 -9" fill="none" stroke="#00f0ff" strokeWidth="1.4" strokeLinecap="round">
                  <animate attributeName="opacity" values="0.3;1;0.3" dur="1.3s" repeatCount="indefinite" />
                </path>
                <path d="M 10 -23 C 16 -18, 16 -10, 10 -5" fill="none" stroke="#38bdf8" strokeWidth="1.3" strokeLinecap="round">
                  <animate attributeName="opacity" values="0.2;1;0.2" dur="1.3s" begin="0.25s" repeatCount="indefinite" />
                </path>
                <path d="M 14 -27 C 22 -20, 22 -8, 14 -1" fill="none" stroke="#00f0ff" strokeWidth="1.1" strokeLinecap="round" opacity="0.85">
                  <animate attributeName="opacity" values="0.1;0.9;0.1" dur="1.3s" begin="0.5s" repeatCount="indefinite" />
                </path>
              </g>
            </svg>
          </div>
        </div>

        {/* User Account & Security RBAC Cluster (Single Unified Bar - No Duplication) */}
        <div className="flex items-center gap-2 flex-wrap self-stretch lg:self-auto justify-end">
          {user ? (
            <div className="flex items-center gap-2.5 p-2 bg-slate-900/80 rounded-2xl border border-slate-700/80 shadow-inner shrink-0">
              {/* Column 1: Identity on top, جدول الحسابات directly underneath */}
              <div className="flex flex-col justify-between gap-1.5 min-w-[142px]">
                {/* User Identity Info */}
                <div className="flex items-center gap-2 px-1 h-[30px]">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow shrink-0">
                    {user.role === 'admin' ? (
                      <ShieldCheck className="w-4 h-4 text-purple-200" />
                    ) : user.role === 'viewer' ? (
                      <Eye className="w-4 h-4 text-slate-200" />
                    ) : (
                      <Building2 className="w-4 h-4 text-emerald-200" />
                    )}
                  </div>
                  <div className="text-right leading-tight whitespace-nowrap">
                    <div className="text-xs font-bold text-white whitespace-nowrap">
                      {user.displayName}
                    </div>
                    <div className="mt-0.5">
                      {user.role === 'admin' ? (
                        <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-400/30 inline-flex items-center gap-1 whitespace-nowrap shadow-xs">
                          👑 الإدارة العامة المركزية
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30 inline-flex items-center gap-1 whitespace-nowrap shadow-xs">
                          قطاع: {user.sector}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* جدول الحسابات Button */}
                <button
                  onClick={openLoginModal}
                  className="w-full h-[30px] px-2.5 bg-slate-800/90 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-bold border border-amber-400/40 transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  title="عرض جدول حسابات وكلمات مرور القطاعات المعتمدة"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>جدول الحسابات</span>
                </button>
              </div>

              {/* Column 2: تبديل الحساب on top, خروج directly underneath */}
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={openLoginModal}
                  className="w-28 sm:w-32 h-[30px] px-2.5 bg-blue-600/30 hover:bg-blue-600/50 text-sky-200 rounded-lg text-xs font-bold border border-blue-400/40 transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  title="تبديل الحساب الحالي أو تسجيل الدخول بقطاع آخر"
                >
                  <LogIn className="w-3.5 h-3.5 text-sky-300" />
                  <span>تبديل الحساب</span>
                </button>

                <button
                  onClick={logout}
                  className="w-28 sm:w-32 h-[30px] px-2.5 text-xs font-bold text-rose-200 bg-rose-600/30 hover:bg-rose-600/50 rounded-lg border border-rose-400/40 transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  title="تسجيل الخروج من الحساب"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-300" />
                  <span>خروج</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={openLoginModal}
                className="w-28 sm:w-32 h-[32px] px-3 bg-slate-800/90 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold border border-amber-400/40 transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                title="عرض جدول حسابات وكلمات مرور القطاعات المعتمدة"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>جدول الحسابات</span>
              </button>
              <button
                onClick={openLoginModal}
                id="btn-header-login"
                className="w-28 sm:w-32 h-[32px] flex items-center justify-center gap-1.5 px-3.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl border border-blue-400/40 transition shadow-md cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-sky-200" />
                <span>تسجيل الدخول</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM SECTION: Operations, Backup & Utility Controls Bar ── */}
      <div className="pt-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 flex-wrap">

        {/* Group 1: Backup & Automated Schedule Cluster */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Export Backup Button (includes PDF files) */}
          {onExportBackup && (
            <button
              onClick={onExportBackup}
              id="btn-export-backup"
              disabled={isExportingBackup}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 hover:from-sky-500 hover:to-indigo-600 rounded-xl border border-sky-400/50 transition shadow-md hover:shadow-sky-500/20 cursor-pointer disabled:opacity-60"
              title="تجميع كافة البيانات الحالية والمستندات المرفوعة من Supabase وتنزيلها كملف ZIP مدمج (Export Backup)"
            >
              {isExportingBackup ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-200" />
                  <span>جارِ تجهيز النسخة الاحتياطية...</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 text-sky-200" />
                  <span>تحميل النسخة الاحتياطية (Export Backup)</span>
                </>
              )}
            </button>
          )}

          {/* Send Backup Now (Instant On-Demand Request) */}
          {onEmailBackup && (
            <button
              onClick={onEmailBackup}
              id="btn-send-backup-now"
              disabled={isEmailingBackup}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 rounded-xl border border-emerald-400/50 transition shadow-md hover:shadow-emerald-500/25 cursor-pointer disabled:opacity-60"
              title="توليد وإرسال نسخة احتياطية فورية من بيانات Supabase كطلب يدوي إلى Elsoltanalex@gmail.com"
            >
              {isEmailingBackup ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-200" />
                  <span>جارِ الإرسال للإيميل...</span>
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5 text-emerald-200" />
                  <span>نسخة احتياطية الآن (Send Backup Now)</span>
                </>
              )}
            </button>
          )}

          {/* Automated Schedule Status Badge */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/70 rounded-xl border border-emerald-500/40 shadow-xs"
            title="الجدولة الأوتوماتيكية اليومية مفعلة وتعمل تلقائياً كل ليلة الساعة 12:00 منتصف الليل دون أي تدخل يدوي"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>الجدولة يومياً 12:00 AM تلقائياً</span>
          </div>
        </div>

        {/* Group 2: Utilities Cluster (Filters reset, Print & Date) */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Active Filters Indicator & Reset */}
          {activeFiltersCount > 0 && (
            <button
              onClick={onResetFilters}
              id="btn-reset-filters"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-600 hover:to-indigo-600 rounded-xl border border-purple-400/40 transition shadow-md shadow-purple-500/25 cursor-pointer"
              title="إلغاء وتصفية كافة الفلاتر والعودة لعرض كامل البيانات"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تصفية الفلاتر ({activeFiltersCount})</span>
            </button>
          )}

          {/* Reset to default data if uploaded */}
          {activeUploadedMetadata && onResetToDefault && (
            <button
              onClick={onResetToDefault}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-purple-200 bg-purple-900/60 hover:bg-purple-800/80 rounded-xl border border-purple-400/30 transition shadow-xs cursor-pointer"
              title="العودة لبيانات الخطة الأصلية"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>الخطة الافتراضية</span>
            </button>
          )}

          {/* Print/Report Button */}
          <button
            onClick={onPrint}
            id="btn-print-report"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 rounded-xl border border-slate-600/60 transition shadow-xs cursor-pointer"
            title="طباعة أو تصدير التقرير"
          >
            <Printer className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">طباعة</span>
          </button>

          {/* Current Date Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-900/70 rounded-xl border border-slate-700 shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-mono text-xs dir-ltr">
              {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

      </div>
    </header>
  );
};
