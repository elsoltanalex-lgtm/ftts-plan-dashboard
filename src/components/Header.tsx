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

        {/* Center Optical-Fiber FTTS / FTTH Illustration (Large, expressive, responsive) */}
        <div className="hidden md:flex flex-1 items-center justify-center px-1 mx-2 lg:mx-4 h-[86px] sm:h-[90px] max-w-[620px] pointer-events-none select-none opacity-95 hover:opacity-100 transition-opacity">
          <svg
            viewBox="0 0 540 90"
            className="w-full h-full max-h-[90px] overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <filter id="superGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur1" />
                <feGaussianBlur stdDeviation="1.5" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur1" />
                  <feMergeNode in="blur2" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="chassisGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="gradCyan" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity="1" />
                <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="gradBlue" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#1e40af" stopOpacity="0.25" />
                <stop offset="50%" stopColor="#60a5fa" stopOpacity="1" />
                <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.35" />
              </linearGradient>
              <linearGradient id="gradPurple" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#6b21a8" stopOpacity="0.25" />
                <stop offset="50%" stopColor="#c084fc" stopOpacity="1" />
                <stop offset="100%" stopColor="#f472b6" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="gradTeal" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#0f766e" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#2dd4bf" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="rackGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
            </defs>

            {/* ══════════ CENTER: FIBER CABLES CONDUITS & GLOWING PATHS ══════════ */}
            {/* Dark Protective Conduits (Backing) */}
            <path d="M 455 26 C 360 12, 230 45, 115 28" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" opacity="0.75" />
            <path d="M 455 40 C 340 58, 220 25, 92 48" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" opacity="0.75" />
            <path d="M 455 54 C 330 84, 190 48, 54 62" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" opacity="0.75" />
            <path d="M 455 66 C 320 62, 170 82, 115 28" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" opacity="0.5" />

            {/* Cable 1: Cyan High-Speed Fiber to FTTS Tower */}
            <path id="fiberCable1" d="M 455 26 C 360 12, 230 45, 115 28" stroke="url(#gradCyan)" strokeWidth="2" strokeLinecap="round" filter="url(#superGlow)" />
            {/* Cable 2: Electric Blue Fiber to Business Building */}
            <path id="fiberCable2" d="M 455 40 C 340 58, 220 25, 92 48" stroke="url(#gradBlue)" strokeWidth="2" strokeLinecap="round" filter="url(#superGlow)" />
            {/* Cable 3: Purple / Magenta Fiber to FTTH Home */}
            <path id="fiberCable3" d="M 455 54 C 330 84, 190 48, 54 62" stroke="url(#gradPurple)" strokeWidth="2" strokeLinecap="round" filter="url(#superGlow)" />
            {/* Cable 4: Teal Secondary Trunk */}
            <path id="fiberCable4" d="M 455 66 C 320 62, 170 82, 115 28" stroke="url(#gradTeal)" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />

            {/* Continuous Laser Beams Streaming Right-to-Left */}
            <path d="M 455 26 C 360 12, 230 45, 115 28" stroke="#ffffff" strokeWidth="2.2" strokeDasharray="25 180" strokeLinecap="round" filter="url(#superGlow)">
              <animate attributeName="stroke-dashoffset" from="0" to="205" dur="1.8s" repeatCount="indefinite" />
            </path>
            <path d="M 455 40 C 340 58, 220 25, 92 48" stroke="#93c5fd" strokeWidth="2.2" strokeDasharray="30 200" strokeLinecap="round" filter="url(#superGlow)">
              <animate attributeName="stroke-dashoffset" from="0" to="230" dur="2.2s" begin="0.4s" repeatCount="indefinite" />
            </path>
            <path d="M 455 54 C 330 84, 190 48, 54 62" stroke="#f472b6" strokeWidth="2.2" strokeDasharray="28 210" strokeLinecap="round" filter="url(#superGlow)">
              <animate attributeName="stroke-dashoffset" from="0" to="238" dur="2.5s" begin="0.8s" repeatCount="indefinite" />
            </path>

            {/* Traveling Light Pulses / Data Packets */}
            {/* Pulse 1 on Cable 1 (To Tower) */}
            <circle r="3.2" fill="#ffffff" filter="url(#superGlow)">
              <animateMotion path="M 455 26 C 360 12, 230 45, 115 28" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.2;1;1;0.4;0.1" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <circle r="2.2" fill="#38bdf8" filter="url(#superGlow)">
              <animateMotion path="M 455 26 C 360 12, 230 45, 115 28" begin="0.25s" dur="1.8s" repeatCount="indefinite" />
            </circle>

            {/* Pulse 2 on Cable 2 (To Business) */}
            <circle r="3" fill="#60a5fa" filter="url(#superGlow)">
              <animateMotion path="M 455 40 C 340 58, 220 25, 92 48" begin="0.5s" dur="2.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.2;1;1;0.3" dur="2.2s" repeatCount="indefinite" />
            </circle>
            <circle r="2" fill="#bfdbfe" filter="url(#superGlow)">
              <animateMotion path="M 455 40 C 340 58, 220 25, 92 48" begin="1.2s" dur="2.2s" repeatCount="indefinite" />
            </circle>

            {/* Pulse 3 on Cable 3 (To Home) */}
            <circle r="3" fill="#c084fc" filter="url(#superGlow)">
              <animateMotion path="M 455 54 C 330 84, 190 48, 54 62" begin="0.9s" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.2;1;1;0.3" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <circle r="2" fill="#f472b6" filter="url(#superGlow)">
              <animateMotion path="M 455 54 C 330 84, 190 48, 54 62" begin="1.6s" dur="2.5s" repeatCount="indefinite" />
            </circle>

            {/* Pulse 4 on Cable 4 */}
            <circle r="2.2" fill="#2dd4bf" filter="url(#superGlow)">
              <animateMotion path="M 455 66 C 320 62, 170 82, 115 28" begin="0.2s" dur="2.6s" repeatCount="indefinite" />
            </circle>

            {/* Mid-span Splice Enclosures */}
            <g transform="translate(325, 38)">
              <circle cx="0" cy="0" r="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
              <circle cx="0" cy="0" r="1.5" fill="#38bdf8">
                <animate attributeName="r" values="1;2.2;1" dur="1.6s" repeatCount="indefinite" />
              </circle>
            </g>
            <g transform="translate(215, 36)">
              <rect x="-3" y="-3" width="6" height="6" rx="1.5" fill="#0f172a" stroke="#818cf8" strokeWidth="1" />
              <circle cx="0" cy="0" r="1.2" fill="#c084fc">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" begin="0.5s" repeatCount="indefinite" />
              </circle>
            </g>

            {/* ══════════ RIGHT SIDE: CORE ROUTER / OLT SERVER HUB ══════════ */}
            <g id="coreRouterHub">
              {/* Outer Chassis */}
              <rect x="455" y="14" width="76" height="62" rx="7" fill="url(#rackGrad)" stroke="#38bdf8" strokeWidth="1.5" filter="url(#chassisGlow)" />
              <rect x="459" y="18" width="68" height="54" rx="4" fill="#0b1329" stroke="#1e293b" strokeWidth="1" />

              {/* Blade Server Slots */}
              {/* Slot 1 */}
              <rect x="463" y="21" width="60" height="13" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
              <line x1="467" y1="27.5" x2="480" y2="27.5" stroke="#475569" strokeWidth="1" strokeDasharray="2 1.5" />
              <circle cx="515" cy="27.5" r="1.8" fill="#10b981">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="0.8s" repeatCount="indefinite" />
              </circle>
              <circle cx="508" cy="27.5" r="1.6" fill="#38bdf8">
                <animate attributeName="opacity" values="0.4;1;0.4" dur="1.3s" repeatCount="indefinite" />
              </circle>

              {/* Slot 2 */}
              <rect x="463" y="37" width="60" height="13" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
              <line x1="467" y1="43.5" x2="480" y2="43.5" stroke="#475569" strokeWidth="1" strokeDasharray="2 1.5" />
              <circle cx="515" cy="43.5" r="1.8" fill="#38bdf8">
                <animate attributeName="opacity" values="1;0.3;1" dur="1.1s" repeatCount="indefinite" />
              </circle>
              <circle cx="508" cy="43.5" r="1.6" fill="#818cf8">
                <animate attributeName="opacity" values="0.2;1;0.2" dur="0.9s" repeatCount="indefinite" />
              </circle>

              {/* Slot 3 */}
              <rect x="463" y="53" width="60" height="13" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
              <line x1="467" y1="59.5" x2="480" y2="59.5" stroke="#475569" strokeWidth="1" strokeDasharray="2 1.5" />
              <circle cx="515" cy="59.5" r="1.8" fill="#10b981">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="508" cy="59.5" r="1.6" fill="#f59e0b">
                <animate attributeName="opacity" values="0.4;1;0.4" dur="1.7s" repeatCount="indefinite" />
              </circle>

              {/* Label */}
              <text x="493" y="75" textAnchor="middle" fill="#38bdf8" fontSize="6.5" fontFamily="monospace" fontWeight="bold" letterSpacing="0.6">
                CORE OLT HUB
              </text>

              {/* Optical Connector Ports */}
              <rect x="453" y="24" width="4" height="4" rx="1" fill="#38bdf8" />
              <rect x="453" y="38" width="4" height="4" rx="1" fill="#60a5fa" />
              <rect x="453" y="52" width="4" height="4" rx="1" fill="#c084fc" />
              <rect x="453" y="64" width="4" height="4" rx="1" fill="#2dd4bf" />
            </g>

            {/* ══════════ LEFT SIDE: TELECOM TOWER, BUILDING & HOUSE ══════════ */}
            {/* Target 1: Telecom Site Tower (FTTS) */}
            <g id="telecomTower">
              {/* Lattice Legs */}
              <line x1="108" y1="36" x2="115" y2="10" stroke="#94a3b8" strokeWidth="1.2" />
              <line x1="122" y1="36" x2="115" y2="10" stroke="#94a3b8" strokeWidth="1.2" />
              {/* Lattice Crosses */}
              <line x1="110" y1="28" x2="120" y2="20" stroke="#64748b" strokeWidth="0.8" />
              <line x1="120" y1="28" x2="110" y2="20" stroke="#64748b" strokeWidth="0.8" />
              <line x1="112" y1="20" x2="118" y2="14" stroke="#64748b" strokeWidth="0.8" />
              <line x1="118" y1="20" x2="112" y2="14" stroke="#64748b" strokeWidth="0.8" />
              {/* Antenna Platforms */}
              <line x1="111" y1="10" x2="119" y2="10" stroke="#e2e8f0" strokeWidth="1.5" />
              <line x1="115" y1="10" x2="115" y2="4" stroke="#38bdf8" strokeWidth="1.6" />
              {/* Beacon Top Light */}
              <circle cx="115" cy="4" r="1.8" fill="#f43f5e">
                <animate attributeName="opacity" values="0.2;1;0.2" dur="0.9s" repeatCount="indefinite" />
              </circle>
              {/* Radio Waves */}
              <path d="M 121 3 C 124 5, 124 8, 121 10" stroke="#38bdf8" strokeWidth="1" fill="none" opacity="0.8">
                <animate attributeName="opacity" values="0;1;0" dur="1.6s" repeatCount="indefinite" />
              </path>
              <path d="M 124 1 C 129 4, 129 11, 124 14" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="2 1" fill="none" opacity="0.5">
                <animate attributeName="opacity" values="0;1;0" begin="0.3s" dur="1.6s" repeatCount="indefinite" />
              </path>
              {/* Receiver Node on Tower */}
              <circle cx="115" cy="28" r="3" fill="#38bdf8" filter="url(#superGlow)">
                <animate attributeName="r" values="2.2;3.6;2.2" dur="1.8s" repeatCount="indefinite" />
              </circle>
              {/* Tower Label */}
              <text x="115" y="44" textAnchor="middle" fill="#38bdf8" fontSize="6" fontFamily="sans-serif" fontWeight="bold">
                FTTS TOWER
              </text>
            </g>

            {/* Target 2: Enterprise / Commercial Building */}
            <g id="enterpriseBuilding">
              {/* Skyscraper Body */}
              <rect x="70" y="28" width="22" height="42" rx="2" fill="#0b1329" stroke="#60a5fa" strokeWidth="1.2" />
              <rect x="73" y="25" width="16" height="3" fill="#1e293b" stroke="#60a5fa" strokeWidth="0.8" />
              <line x1="81" y1="25" x2="81" y2="19" stroke="#60a5fa" strokeWidth="1.2" />
              <circle cx="81" cy="19" r="1.4" fill="#93c5fd" />

              {/* Glowing Windows Grid */}
              <rect x="74" y="32" width="4" height="4" rx="0.5" fill="#38bdf8" opacity="0.85" />
              <rect x="82" y="32" width="4" height="4" rx="0.5" fill="#fde047" opacity="0.9">
                <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2.4s" repeatCount="indefinite" />
              </rect>
              <rect x="74" y="39" width="4" height="4" rx="0.5" fill="#60a5fa" opacity="0.8" />
              <rect x="82" y="39" width="4" height="4" rx="0.5" fill="#38bdf8" opacity="0.85" />
              <rect x="74" y="46" width="4" height="4" rx="0.5" fill="#fde047" opacity="0.85" />
              <rect x="82" y="46" width="4" height="4" rx="0.5" fill="#60a5fa" opacity="0.75" />
              <rect x="74" y="53" width="4" height="4" rx="0.5" fill="#38bdf8" opacity="0.85" />
              <rect x="82" y="53" width="4" height="4" rx="0.5" fill="#fde047" opacity="0.8">
                <animate attributeName="opacity" values="0.8;0.3;0.8" dur="3s" repeatCount="indefinite" />
              </rect>

              {/* Building Optical Terminal Node */}
              <circle cx="92" cy="48" r="3" fill="#60a5fa" filter="url(#superGlow)">
                <animate attributeName="r" values="2.2;3.5;2.2" begin="0.4s" dur="2.2s" repeatCount="indefinite" />
              </circle>
              {/* Building Label */}
              <text x="81" y="78" textAnchor="middle" fill="#60a5fa" fontSize="6" fontFamily="sans-serif" fontWeight="bold">
                BUSINESS
              </text>
            </g>

            {/* Target 3: Smart Home / Villa (FTTH) */}
            <g id="residentialHome">
              {/* House Roof */}
              <polygon points="36,46 18,60 54,60" fill="#1e293b" stroke="#c084fc" strokeWidth="1.2" />
              {/* House Body */}
              <rect x="22" y="60" width="28" height="20" rx="1" fill="#0b1329" stroke="#c084fc" strokeWidth="1.2" />
              {/* Glowing Warm Window */}
              <rect x="26" y="64" width="7" height="7" rx="1" fill="#fef08a" opacity="0.9">
                <animate attributeName="opacity" values="0.5;0.95;0.5" dur="2.8s" repeatCount="indefinite" />
              </rect>
              {/* Door */}
              <rect x="37" y="66" width="8" height="14" fill="#1e293b" stroke="#64748b" strokeWidth="0.8" />
              {/* Drop Terminal Box on House Wall */}
              <rect x="50" y="60" width="4" height="5" rx="1" fill="#c084fc" />
              <circle cx="54" cy="62" r="2.8" fill="#f472b6" filter="url(#superGlow)">
                <animate attributeName="r" values="2;3.4;2" begin="0.8s" dur="2.5s" repeatCount="indefinite" />
              </circle>
              {/* Home Label */}
              <text x="36" y="88" textAnchor="middle" fill="#c084fc" fontSize="6" fontFamily="sans-serif" fontWeight="bold">
                FTTH HOME
              </text>
            </g>
          </svg>
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
