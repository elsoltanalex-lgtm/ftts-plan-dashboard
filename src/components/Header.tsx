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
        <div className="flex items-center gap-3.5">
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

            <p className="text-slate-300 text-xs sm:text-sm mt-1 flex items-center gap-2 flex-wrap">
              <span>Fiber To The Site (FTTS) • WE • Vodafone • Orange Rollout Dashboard</span>
              <span className="text-slate-500 hidden sm:inline">•</span>
              <span className="text-sky-300 font-medium">
                عرض {totalFilteredSites} من أصل {totalBaselineSites} موقع
                {user && user.role !== 'admin' ? (
                  <span className="mr-1.5 text-emerald-300 font-bold">({user.sector})</span>
                ) : (
                  <span className="mr-1.5 text-purple-300 font-bold">(كافة القطاعات)</span>
                )}
              </span>
            </p>
          </div>
        </div>

        {/* Center Optical-Fiber Branching Network (Neon Line-Art Animation on Dark Navy) */}
        <div className="hidden md:flex flex-1 items-center justify-center px-1 mx-2 lg:mx-3 h-[74px] sm:h-[78px] max-w-[580px] pointer-events-none select-none">
          <div className="w-full h-full bg-[#050b18]/90 border border-cyan-500/25 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.14),inset_0_0_15px_rgba(3,7,18,0.8)] flex items-center justify-center px-2 py-0.5 overflow-hidden relative backdrop-blur-sm">
            <svg
              viewBox="0 0 520 80"
              className="w-full h-full overflow-visible"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Neon Glow Filters */}
                <filter id="neonCyanGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2" result="blur1" />
                  <feGaussianBlur stdDeviation="1" result="blur2" />
                  <feMerge>
                    <feMergeNode in="blur1" />
                    <feMergeNode in="blur2" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="neonPurpleGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="neonGreenGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <pattern id="techGrid" width="16" height="16" patternUnits="userSpaceOnUse">
                  <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#0d1f35" strokeWidth="0.5" opacity="0.3" />
                </pattern>
              </defs>

              {/* Subtle Tech Grid Background */}
              <rect width="520" height="80" fill="url(#techGrid)" />

              {/* ══════════ FIBER CONDUITS & GLOWING BRANCHING LINES ══════════ */}
              {/* Main Trunk Backing Conduits */}
              <line x1="446" y1="40" x2="348" y2="40" stroke="#0b223d" strokeWidth="3.5" strokeLinecap="round" />
              {/* Branch Backing Conduits */}
              <path d="M 341 40 C 255 40, 180 17, 96 17" stroke="#072238" strokeWidth="3" strokeLinecap="round" />
              <path d="M 341 40 C 255 40, 180 40, 96 40" stroke="#250d36" strokeWidth="3" strokeLinecap="round" />
              <path d="M 341 40 C 255 40, 180 63, 96 63" stroke="#052920" strokeWidth="3" strokeLinecap="round" />

              {/* Glowing Active Fiber Tracks */}
              {/* Main Trunk Line */}
              <line x1="446" y1="40" x2="348" y2="40" stroke="#00f0ff" strokeWidth="1.8" strokeLinecap="round" filter="url(#neonCyanGlow)" />
              {/* Branch 1 -> FTTS Mobile Tower */}
              <path d="M 341 40 C 255 40, 180 17, 96 17" stroke="#00f0ff" strokeWidth="1.6" strokeLinecap="round" filter="url(#neonCyanGlow)" />
              {/* Branch 2 -> FTTH House 1 */}
              <path d="M 341 40 C 255 40, 180 40, 96 40" stroke="#c084fc" strokeWidth="1.6" strokeLinecap="round" filter="url(#neonPurpleGlow)" />
              {/* Branch 3 -> FTTH House 2 */}
              <path d="M 341 40 C 255 40, 180 63, 96 63" stroke="#34d399" strokeWidth="1.6" strokeLinecap="round" filter="url(#neonGreenGlow)" />

              {/* ══════════ CONTINUOUS TRAVELING LIGHT DASHES & PULSES ══════════ */}
              {/* Main Trunk Fast Laser Stream */}
              <line x1="446" y1="40" x2="348" y2="40" stroke="#ffffff" strokeWidth="2.2" strokeDasharray="10 14" strokeLinecap="round" filter="url(#neonCyanGlow)">
                <animate attributeName="stroke-dashoffset" from="0" to="24" dur="0.6s" repeatCount="indefinite" />
              </line>

              {/* Branch 1 Traveling Light Dashes */}
              <path d="M 341 40 C 255 40, 180 17, 96 17" stroke="#ffffff" strokeWidth="2" strokeDasharray="12 24" strokeLinecap="round" filter="url(#neonCyanGlow)">
                <animate attributeName="stroke-dashoffset" from="0" to="72" dur="1.3s" repeatCount="indefinite" />
              </path>
              {/* Branch 1 Photon Pulse Dot */}
              <circle r="2.6" fill="#ffffff" filter="url(#neonCyanGlow)">
                <animateMotion path="M 341 40 C 255 40, 180 17, 96 17" dur="1.3s" repeatCount="indefinite" />
              </circle>
              <circle r="1.8" fill="#38bdf8" filter="url(#neonCyanGlow)">
                <animateMotion path="M 341 40 C 255 40, 180 17, 96 17" dur="1.3s" begin="0.65s" repeatCount="indefinite" />
              </circle>

              {/* Branch 2 Traveling Light Dashes */}
              <path d="M 341 40 C 255 40, 180 40, 96 40" stroke="#f5d0fe" strokeWidth="2" strokeDasharray="12 24" strokeLinecap="round" filter="url(#neonPurpleGlow)">
                <animate attributeName="stroke-dashoffset" from="0" to="72" dur="1.5s" begin="0.3s" repeatCount="indefinite" />
              </path>
              {/* Branch 2 Photon Pulse Dot */}
              <circle r="2.6" fill="#f5d0fe" filter="url(#neonPurpleGlow)">
                <animateMotion path="M 341 40 C 255 40, 180 40, 96 40" dur="1.5s" begin="0.3s" repeatCount="indefinite" />
              </circle>
              <circle r="1.8" fill="#e879f9" filter="url(#neonPurpleGlow)">
                <animateMotion path="M 341 40 C 255 40, 180 40, 96 40" dur="1.5s" begin="1.05s" repeatCount="indefinite" />
              </circle>

              {/* Branch 3 Traveling Light Dashes */}
              <path d="M 341 40 C 255 40, 180 63, 96 63" stroke="#a7f3d0" strokeWidth="2" strokeDasharray="12 24" strokeLinecap="round" filter="url(#neonGreenGlow)">
                <animate attributeName="stroke-dashoffset" from="0" to="72" dur="1.7s" begin="0.6s" repeatCount="indefinite" />
              </path>
              {/* Branch 3 Photon Pulse Dot */}
              <circle r="2.6" fill="#a7f3d0" filter="url(#neonGreenGlow)">
                <animateMotion path="M 341 40 C 255 40, 180 63, 96 63" dur="1.7s" begin="0.6s" repeatCount="indefinite" />
              </circle>
              <circle r="1.8" fill="#6ee7b7" filter="url(#neonGreenGlow)">
                <animateMotion path="M 341 40 C 255 40, 180 63, 96 63" dur="1.7s" begin="1.45s" repeatCount="indefinite" />
              </circle>

              {/* ══════════ OPTICAL SPLITTER UNIT ══════════ */}
              <g id="opticalSplitter">
                <polygon points="348,32 355,40 348,48 341,40" fill="#071228" stroke="#00f0ff" strokeWidth="1.5" filter="url(#neonCyanGlow)" />
                <circle cx="348" cy="40" r="2.2" fill="#ffffff" />
                <text x="348" y="56" textAnchor="middle" fill="#67e8f9" fontSize="5" fontFamily="monospace">SPLITTER</text>
              </g>

              {/* ══════════ RIGHT: CENTRAL HUB (NEON LINE-ART) ══════════ */}
              <g id="centralHub">
                {/* Rotating Outer Tech Ring */}
                <circle cx="465" cy="40" r="19" fill="none" stroke="#00f0ff" strokeWidth="1.2" strokeDasharray="6 4" opacity="0.75">
                  <animateTransform attributeName="transform" type="rotate" from="0 465 40" to="360 465 40" dur="24s" repeatCount="indefinite" />
                </circle>
                {/* Inner Solid Hub Ring */}
                <circle cx="465" cy="40" r="13" fill="#040c1a" stroke="#38bdf8" strokeWidth="1.5" filter="url(#neonCyanGlow)" />
                {/* Expanding Pulse Wave */}
                <circle cx="465" cy="40" r="5" fill="none" stroke="#00f0ff" strokeWidth="1.2" opacity="0.9">
                  <animate attributeName="r" values="5;22;25" dur="2.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0.3;0" dur="2.2s" repeatCount="indefinite" />
                </circle>
                {/* Core Emitting Node */}
                <circle cx="465" cy="40" r="4.5" fill="#00f0ff" filter="url(#neonCyanGlow)">
                  <animate attributeName="r" values="3.8;5.2;3.8" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <circle cx="465" cy="40" r="2" fill="#ffffff" />
                {/* Hub Label */}
                <text x="465" y="68" textAnchor="middle" fill="#38bdf8" fontSize="5.5" fontFamily="monospace" fontWeight="bold" letterSpacing="0.6">
                  CENTRAL HUB
                </text>
              </g>

              {/* ══════════ LEFT: DESTINATIONS LINE-ART ICONS ══════════ */}
              {/* 1. FTTS Mobile Tower Line Icon */}
              <g id="fttsTower">
                {/* Line Label */}
                <text x="56" y="20" textAnchor="end" fill="#38bdf8" fontSize="6.5" fontFamily="monospace" fontWeight="bold">FTTS</text>
                {/* Tower Legs */}
                <line x1="66" y1="26" x2="74" y2="8" stroke="#38bdf8" strokeWidth="1.4" strokeLinecap="round" />
                <line x1="82" y1="26" x2="74" y2="8" stroke="#38bdf8" strokeWidth="1.4" strokeLinecap="round" />
                {/* Horizontal Lattice Crossbeams */}
                <line x1="68.5" y1="21" x2="79.5" y2="21" stroke="#0284c7" strokeWidth="0.9" />
                <line x1="71" y1="15" x2="77" y2="15" stroke="#0284c7" strokeWidth="0.9" />
                {/* Cross Braces */}
                <line x1="68.5" y1="21" x2="77" y2="15" stroke="#0284c7" strokeWidth="0.7" />
                <line x1="79.5" y1="21" x2="71" y2="15" stroke="#0284c7" strokeWidth="0.7" />
                {/* Mast Platform */}
                <line x1="70" y1="8" x2="78" y2="8" stroke="#e0f2fe" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="74" y1="8" x2="74" y2="3.5" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
                {/* Beacon Blinking Dot */}
                <circle cx="74" cy="3.5" r="1.6" fill="#f43f5e">
                  <animate attributeName="opacity" values="0.3;1;0.3" dur="0.9s" repeatCount="indefinite" />
                </circle>
                {/* Radiating Wireless Signals */}
                <path d="M 78 4 C 81 6, 81 9, 78 11" fill="none" stroke="#00f0ff" strokeWidth="1.2" strokeLinecap="round">
                  <animate attributeName="opacity" values="0.2;1;0.2" dur="1.3s" repeatCount="indefinite" />
                </path>
                <path d="M 81 2 C 85 5, 85 11, 81 14" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2 1.5" strokeLinecap="round">
                  <animate attributeName="opacity" values="0;0.9;0" dur="1.3s" begin="0.3s" repeatCount="indefinite" />
                </path>
                {/* Optical Receiver Terminal Node */}
                <circle cx="96" cy="17" r="2.8" fill="#00f0ff" filter="url(#neonCyanGlow)">
                  <animate attributeName="r" values="2.2;3.4;2.2" dur="1.3s" repeatCount="indefinite" />
                </circle>
              </g>

              {/* 2. FTTH House 1 (Single-Family Gable Home Line Art) */}
              <g id="ftthHouse1">
                {/* Line Label */}
                <text x="56" y="43" textAnchor="end" fill="#c084fc" fontSize="6.5" fontFamily="monospace" fontWeight="bold">FTTH</text>
                {/* Roof */}
                <polyline points="64,39 74,30 84,39" fill="none" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonPurpleGlow)" />
                {/* Walls */}
                <rect x="67" y="39" width="14" height="10" rx="1" fill="none" stroke="#c084fc" strokeWidth="1.4" />
                {/* Window */}
                <rect x="69.5" y="41.5" width="3.5" height="3.5" rx="0.5" fill="none" stroke="#f5d0fe" strokeWidth="0.9" />
                {/* Door */}
                <line x1="77.5" y1="49" x2="77.5" y2="44" stroke="#c084fc" strokeWidth="1.3" strokeLinecap="round" />
                {/* Chimney */}
                <polyline points="80,33 80,30 82,30 82,35" fill="none" stroke="#c084fc" strokeWidth="1" />
                {/* Optical Drop Terminal Node */}
                <circle cx="96" cy="40" r="2.8" fill="#c084fc" filter="url(#neonPurpleGlow)">
                  <animate attributeName="r" values="2.2;3.4;2.2" dur="1.5s" begin="0.3s" repeatCount="indefinite" />
                </circle>
              </g>

              {/* 3. FTTH House 2 (Modern Split-Level / Villa Line Art) */}
              <g id="ftthHouse2">
                {/* Line Label */}
                <text x="56" y="66" textAnchor="end" fill="#34d399" fontSize="6.5" fontFamily="monospace" fontWeight="bold">FTTH</text>
                {/* Modern Line Architecture Roof */}
                <polyline points="63,62 72,54 81,62" fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonGreenGlow)" />
                <polyline points="72,54 79,48 85,55 85,62" fill="none" stroke="#34d399" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                {/* Walls */}
                <rect x="66" y="62" width="18" height="10" rx="1" fill="none" stroke="#34d399" strokeWidth="1.4" />
                {/* Windows */}
                <rect x="68.5" y="64" width="3.5" height="3" fill="none" stroke="#a7f3d0" strokeWidth="0.9" />
                <rect x="78" y="64" width="3.5" height="3" fill="none" stroke="#a7f3d0" strokeWidth="0.9" />
                {/* Door */}
                <line x1="75" y1="72" x2="75" y2="67" stroke="#34d399" strokeWidth="1.3" strokeLinecap="round" />
                {/* Optical Drop Terminal Node */}
                <circle cx="96" cy="63" r="2.8" fill="#34d399" filter="url(#neonGreenGlow)">
                  <animate attributeName="r" values="2.2;3.4;2.2" dur="1.7s" begin="0.6s" repeatCount="indefinite" />
                </circle>
              </g>
            </svg>
          </div>
        </div>

        {/* User Account & Security RBAC Cluster (Single Unified Bar - No Duplication) */}
        <div className="flex items-center gap-2 flex-wrap self-stretch lg:self-auto justify-end">
          {user ? (
            <div className="flex items-center gap-2.5 p-2 bg-slate-900/80 rounded-2xl border border-slate-700/80 shadow-inner">
              {/* Column 1: Identity on top, جدول الحسابات directly underneath */}
              <div className="flex flex-col justify-between gap-1.5">
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
                  <div className="text-right leading-tight">
                    <div className="text-xs font-bold text-white truncate max-w-[130px]">
                      {user.displayName}
                    </div>
                    <div>
                      {user.role === 'admin' ? (
                        <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/20 px-1.5 py-0.2 rounded-full border border-purple-400/30 inline-block">
                          👑 الإدارة العامة المركزية
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.2 rounded-full border border-emerald-400/30 inline-block">
                          قطاع: {user.sector}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* جدول الحسابات Button */}
                <button
                  onClick={openLoginModal}
                  className="w-28 sm:w-32 h-[30px] px-2.5 bg-slate-800/90 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-bold border border-amber-400/40 transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
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
