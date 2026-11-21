import React from 'react';
import { 
  Radio, 
  RotateCcw, 
  Download, 
  Printer, 
  Calendar,
  FileSpreadsheet,
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
  onExportCsv: () => void;
  onExportBackup?: () => void;
  isExportingBackup?: boolean;
  onEmailBackup?: () => void;
  isEmailingBackup?: boolean;
  onPrint: () => void;
  onOpenUploadModal: () => void;
  activeUploadedMetadata?: UploadedFileMetadata | null;
  onResetToDefault?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onResetFilters,
  activeFiltersCount,
  totalFilteredSites,
  totalBaselineSites,
  onExportCsv,
  onExportBackup,
  isExportingBackup = false,
  onEmailBackup,
  isEmailingBackup = false,
  onPrint,
  onOpenUploadModal,
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
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight font-sans text-white">
                Fiber Tracking Board
              </h1>
              <span className="text-[11px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-xs">
                فايبر تراكينج بورد
              </span>

              {activeUploadedMetadata ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300 font-semibold bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-400/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  بيانات إكسيل مرفوعة: {activeUploadedMetadata.fileName}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300 font-medium bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  الخطة الأساسية (121 موقع)
                </span>
              )}
            </div>

            <p className="text-slate-300 text-xs sm:text-sm mt-1 flex items-center gap-2 flex-wrap">
              <span>Fiber To The Site (FTTS) • WE • Vodafone • Orange Rollout Dashboard</span>
              <span className="text-slate-500 hidden sm:inline">•</span>
              <span className="text-sky-300 font-medium">
                عرض {totalFilteredSites} من أصل {totalBaselineSites} موقع
                {user && user.role !== 'admin' && (
                  <span className="mr-1.5 text-emerald-300 font-bold">({user.sector})</span>
                )}
                {user && user.role === 'admin' && (
                  <span className="mr-1.5 text-purple-300 font-bold">(كافة القطاعات)</span>
                )}
              </span>
            </p>
          </div>
        </div>

        {/* User Account & Security RBAC Cluster (Single Unified Bar - No Duplication) */}
        <div className="flex items-center gap-2 flex-wrap self-stretch lg:self-auto justify-end">
          {user ? (
            <div className="flex items-center gap-2 p-1.5 bg-slate-900/80 rounded-xl border border-slate-700/80 shadow-inner flex-wrap">
              {/* User Identity Info */}
              <div className="flex items-center gap-2 px-2.5 py-1">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow shrink-0">
                  {user.role === 'admin' ? (
                    <ShieldCheck className="w-4 h-4 text-purple-200" />
                  ) : user.role === 'viewer' ? (
                    <Eye className="w-4 h-4 text-slate-200" />
                  ) : (
                    <Building2 className="w-4 h-4 text-emerald-200" />
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{user.displayName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {user.role === 'admin' ? (
                      <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-400/30">
                        👑 الإدارة العامة المركزية
                      </span>
                    ) : (
                      <>
                        <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded-full border border-emerald-400/30">
                          قطاع: {user.sector}
                        </span>
                        <span className="text-[10px] font-medium text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                          نطاق معزول
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* جدول الحسابات Button */}
              <button
                onClick={openLoginModal}
                className="px-2.5 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-bold border border-amber-400/40 transition shadow-xs cursor-pointer flex items-center gap-1.5"
                title="عرض جدول حسابات وكلمات مرور القطاعات المعتمدة"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">جدول الحسابات</span>
              </button>

              {/* تبديل الحساب Button */}
              <button
                onClick={openLoginModal}
                className="px-2.5 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-sky-200 rounded-lg text-xs font-bold border border-blue-400/40 transition shadow-xs cursor-pointer flex items-center gap-1.5"
                title="تبديل الحساب الحالي أو تسجيل الدخول بقطاع آخر"
              >
                <LogIn className="w-3.5 h-3.5 text-sky-300" />
                <span>تبديل الحساب</span>
              </button>

              {/* خروج Button */}
              <button
                onClick={logout}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-200 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg border border-rose-400/30 transition shadow-xs cursor-pointer flex items-center gap-1"
                title="تسجيل الخروج من الحساب"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-300" />
                <span>خروج</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={openLoginModal}
                className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold border border-amber-400/40 transition shadow-sm cursor-pointer flex items-center gap-1.5"
                title="عرض جدول حسابات وكلمات مرور القطاعات المعتمدة"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>جدول الحسابات</span>
              </button>
              <button
                onClick={openLoginModal}
                id="btn-header-login"
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl border border-blue-400/40 transition shadow-md cursor-pointer"
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

        {/* Group 2: Data Import & Utilities Cluster */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Upload Excel Button */}
          <button
            onClick={onOpenUploadModal}
            id="btn-upload-excel"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-500 hover:to-emerald-600 rounded-xl border border-teal-400/40 transition shadow-sm cursor-pointer"
            title="رفع وتحليل أي شيت إكسيل"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
            <span>رفع إكسيل</span>
          </button>

          {/* Reset to default data if uploaded */}
          {activeUploadedMetadata && onResetToDefault && (
            <button
              onClick={onResetToDefault}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-purple-200 bg-purple-900/60 hover:bg-purple-800/80 rounded-xl border border-purple-400/30 transition shadow-xs cursor-pointer"
              title="العودة لبيانات الخطة الأصلية (121 موقع)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>الخطة الافتراضية</span>
            </button>
          )}

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

          {/* Export CSV Button */}
          <button
            onClick={onExportCsv}
            id="btn-export-csv"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 rounded-xl border border-slate-600/60 transition shadow-xs cursor-pointer"
            title="تصدير البيانات الحالية بصيغة CSV"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>تصدير CSV</span>
          </button>

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
