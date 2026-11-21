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

        {/* Center Optical-Fiber Branching Network (Expanded Space with Generous Proportion & Smooth Blending) */}
        <div className="hidden md:flex flex-1 items-center justify-center px-1 mx-1 lg:mx-3 h-[84px] sm:h-[92px] max-w-[660px] min-w-[280px] pointer-events-none select-none">
          <div className="w-full h-full bg-[#020714] border border-cyan-500/35 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.22),inset_0_0_20px_rgba(1,4,14,0.95)] flex items-center justify-center overflow-hidden relative backdrop-blur-md px-1">
            {/* Subtle soft edge gradient blending on left and right */}
            <div className="absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-[#020714] to-transparent pointer-events-none z-10" />
            <div className="absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-[#020714] to-transparent pointer-events-none z-10" />

            <svg
              viewBox="0 0 534 302"
              className="w-full h-full max-h-[90px] object-contain overflow-visible"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Intense Laser Beam Glow */}
                <filter id="laserBeamGlow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="4" result="b1" />
                  <feGaussianBlur stdDeviation="2" result="b2" />
                  <feMerge>
                    <feMergeNode in="b1" />
                    <feMergeNode in="b2" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Hot White-Core Pulse Glow */}
                <filter id="hotPulseGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="6" result="blurWide" />
                  <feGaussianBlur stdDeviation="2.5" result="blurTight" />
                  <feMerge>
                    <feMergeNode in="blurWide" />
                    <feMergeNode in="blurTight" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Radial Core Glow */}
                <radialGradient id="coreAura" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="35%" stopColor="#00f0ff" stopOpacity="0.8" />
                  <stop offset="70%" stopColor="#0284c7" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* ══════════ 1. EXACT REFERENCE ARTWORK BASE ══════════ */}
              <image
                href="/assets/fiber-network-hub.jpg"
                x="0"
                y="0"
                width="534"
                height="302"
                preserveAspectRatio="xMidYMid meet"
              />

              {/* ══════════ 2. CENTRAL CORE HIGH-SPEED PULSING AURA ══════════ */}
              <circle cx="107" cy="153" r="16" fill="url(#coreAura)">
                <animate attributeName="r" values="10;22;10" dur="0.9s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0.95;0.4" dur="0.9s" repeatCount="indefinite" />
              </circle>
              <circle cx="107" cy="153" r="4.5" fill="#ffffff" filter="url(#hotPulseGlow)">
                <animate attributeName="r" values="3.5;6;3.5" dur="0.9s" repeatCount="indefinite" />
              </circle>

              {/* Input Bus Rushing Pulses into Chip */}
              <path d="M 0 142 L 80 142" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="16 28" strokeLinecap="round" filter="url(#laserBeamGlow)">
                <animate attributeName="stroke-dashoffset" from="0" to="-44" dur="0.5s" repeatCount="indefinite" />
              </path>
              <path d="M 0 155 L 80 155" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="16 28" strokeLinecap="round" filter="url(#laserBeamGlow)">
                <animate attributeName="stroke-dashoffset" from="0" to="-44" dur="0.55s" begin="0.15s" repeatCount="indefinite" />
              </path>

              {/* ══════════ 3. MAIN TRUNK RUSHING OUTWARD FROM CHIP ══════════ */}
              <path d="M 136 136 L 190 136" stroke="#ffffff" strokeWidth="2.6" strokeDasharray="14 18" strokeLinecap="round" filter="url(#laserBeamGlow)">
                <animate attributeName="stroke-dashoffset" from="0" to="-32" dur="0.4s" repeatCount="indefinite" />
              </path>
              <path d="M 136 156 L 190 156" stroke="#00f0ff" strokeWidth="2.8" strokeDasharray="14 18" strokeLinecap="round" filter="url(#laserBeamGlow)">
                <animate attributeName="stroke-dashoffset" from="0" to="-32" dur="0.4s" begin="0.1s" repeatCount="indefinite" />
              </path>
              <path d="M 136 176 L 190 176" stroke="#ffffff" strokeWidth="2.6" strokeDasharray="14 18" strokeLinecap="round" filter="url(#laserBeamGlow)">
                <animate attributeName="stroke-dashoffset" from="0" to="-32" dur="0.4s" begin="0.2s" repeatCount="indefinite" />
              </path>

              {/* ══════════ 4. FAST GLOWING PULSES: UPPER BRANCH (HOUSES) ══════════ */}
              {/* Path H1: Rushing to House 1 */}
              <path
                id="pulsePathH1"
                d="M 188 136 L 246 76 L 334 76 L 344 55 L 354 55"
                stroke="#ffffff"
                strokeWidth="2.8"
                strokeDasharray="22 55"
                strokeLinecap="round"
                filter="url(#laserBeamGlow)"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-154" dur="0.8s" repeatCount="indefinite" />
              </path>
              <circle r="4" fill="#ffffff" filter="url(#hotPulseGlow)">
                <animateMotion path="M 188 136 L 246 76 L 334 76 L 344 55 L 354 55" dur="0.8s" repeatCount="indefinite" />
              </circle>

              {/* Path H2: Rushing to House 2 */}
              <path
                id="pulsePathH2"
                d="M 188 146 L 254 88 L 382 88 L 396 68 L 408 68"
                stroke="#38bdf8"
                strokeWidth="2.8"
                strokeDasharray="24 60"
                strokeLinecap="round"
                filter="url(#laserBeamGlow)"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-168" dur="0.85s" begin="0.15s" repeatCount="indefinite" />
              </path>
              <circle r="4" fill="#ffffff" filter="url(#hotPulseGlow)">
                <animateMotion path="M 188 146 L 254 88 L 382 88 L 396 68 L 408 68" dur="0.85s" begin="0.15s" repeatCount="indefinite" />
              </circle>

              {/* Path H3: Rushing to House 3 */}
              <path
                id="pulsePathH3"
                d="M 188 156 L 260 98 L 458 98"
                stroke="#ffffff"
                strokeWidth="3"
                strokeDasharray="26 65"
                strokeLinecap="round"
                filter="url(#laserBeamGlow)"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-182" dur="0.9s" begin="0.3s" repeatCount="indefinite" />
              </path>
              <circle r="4.5" fill="#ffffff" filter="url(#hotPulseGlow)">
                <animateMotion path="M 188 156 L 260 98 L 458 98" dur="0.9s" begin="0.3s" repeatCount="indefinite" />
              </circle>

              {/* Path H4: Rushing to House 4 */}
              <path
                id="pulsePathH4"
                d="M 270 98 L 312 142 L 406 142"
                stroke="#00f0ff"
                strokeWidth="2.8"
                strokeDasharray="20 50"
                strokeLinecap="round"
                filter="url(#laserBeamGlow)"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-140" dur="0.75s" begin="0.45s" repeatCount="indefinite" />
              </path>
              <circle r="3.8" fill="#ffffff" filter="url(#hotPulseGlow)">
                <animateMotion path="M 270 98 L 312 142 L 406 142" dur="0.75s" begin="0.45s" repeatCount="indefinite" />
              </circle>

              {/* ══════════ 5. FAST GLOWING PULSES: LOWER BRANCH (MOBILE TOWER) ══════════ */}
              {/* Path T1: Stepped Lower Line 1 */}
              <path
                d="M 188 166 L 238 216 L 334 216 L 344 204 L 356 204"
                stroke="#38bdf8"
                strokeWidth="2.6"
                strokeDasharray="20 50"
                strokeLinecap="round"
                filter="url(#laserBeamGlow)"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-140" dur="0.8s" begin="0.1s" repeatCount="indefinite" />
              </path>

              {/* Path T2: Stepped Lower Line 2 */}
              <path
                d="M 188 176 L 246 226 L 390 226"
                stroke="#ffffff"
                strokeWidth="2.8"
                strokeDasharray="22 55"
                strokeLinecap="round"
                filter="url(#laserBeamGlow)"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-154" dur="0.82s" begin="0.25s" repeatCount="indefinite" />
              </path>
              <circle r="3.8" fill="#ffffff" filter="url(#hotPulseGlow)">
                <animateMotion path="M 188 176 L 246 226 L 390 226" dur="0.82s" begin="0.25s" repeatCount="indefinite" />
              </circle>

              {/* Path T3: Stepped Lower Line 3 */}
              <path
                d="M 198 184 L 254 238 L 416 238"
                stroke="#00f0ff"
                strokeWidth="2.8"
                strokeDasharray="24 60"
                strokeLinecap="round"
                filter="url(#laserBeamGlow)"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-168" dur="0.85s" begin="0.35s" repeatCount="indefinite" />
              </path>

              {/* Path T4: Direct Highway into Mobile Tower */}
              <path
                id="pulsePathTower"
                d="M 208 192 L 262 248 L 442 248"
                stroke="#ffffff"
                strokeWidth="3.2"
                strokeDasharray="26 65"
                strokeLinecap="round"
                filter="url(#laserBeamGlow)"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-182" dur="0.88s" begin="0.4s" repeatCount="indefinite" />
              </path>
              <circle r="4.5" fill="#ffffff" filter="url(#hotPulseGlow)">
                <animateMotion path="M 208 192 L 262 248 L 442 248" dur="0.88s" begin="0.4s" repeatCount="indefinite" />
              </circle>

              {/* ══════════ 6. TERMINATION ARRIVAL FLASHES & WIRELESS SIGNALS ══════════ */}
              {/* House 1 Terminal Flash */}
              <circle cx="354" cy="55" r="5" fill="#ffffff" filter="url(#hotPulseGlow)">
                <animate attributeName="r" values="3.5;7;3.5" dur="0.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;1;0.6" dur="0.8s" repeatCount="indefinite" />
              </circle>

              {/* House 2 Terminal Flash */}
              <circle cx="408" cy="68" r="5" fill="#ffffff" filter="url(#hotPulseGlow)">
                <animate attributeName="r" values="3.5;7;3.5" dur="0.85s" begin="0.15s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;1;0.6" dur="0.85s" begin="0.15s" repeatCount="indefinite" />
              </circle>

              {/* House 3 Terminal Flash */}
              <circle cx="458" cy="98" r="5.5" fill="#ffffff" filter="url(#hotPulseGlow)">
                <animate attributeName="r" values="4;8;4" dur="0.9s" begin="0.3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;1;0.6" dur="0.9s" begin="0.3s" repeatCount="indefinite" />
              </circle>

              {/* House 4 Terminal Flash */}
              <circle cx="406" cy="142" r="5" fill="#ffffff" filter="url(#hotPulseGlow)">
                <animate attributeName="r" values="3.5;7;3.5" dur="0.75s" begin="0.45s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;1;0.6" dur="0.75s" begin="0.45s" repeatCount="indefinite" />
              </circle>

              {/* Mobile Tower Terminal & Wireless Transmission Radiations */}
              <circle cx="442" cy="248" r="5" fill="#ffffff" filter="url(#hotPulseGlow)">
                <animate attributeName="r" values="3.5;7.5;3.5" dur="0.88s" begin="0.4s" repeatCount="indefinite" />
              </circle>

              {/* Tower Antenna Beacon Pulse */}
              <circle cx="488" cy="198" r="4.5" fill="#ffffff" filter="url(#hotPulseGlow)">
                <animate attributeName="r" values="3;6;3" dur="0.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;1;0.5" dur="0.8s" repeatCount="indefinite" />
              </circle>

              {/* Animated Glowing Wireless Waves from Tower */}
              <circle cx="488" cy="198" r="14" fill="none" stroke="#00f0ff" strokeWidth="1.8" filter="url(#laserBeamGlow)">
                <animate attributeName="r" values="10;28;36" dur="1.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0.3;0" dur="1.2s" repeatCount="indefinite" />
              </circle>
              <circle cx="488" cy="198" r="14" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.8">
                <animate attributeName="r" values="8;24;32" dur="1.2s" begin="0.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0.2;0" dur="1.2s" begin="0.4s" repeatCount="indefinite" />
              </circle>
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
