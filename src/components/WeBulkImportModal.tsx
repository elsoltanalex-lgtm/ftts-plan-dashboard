import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  Search,
  Filter,
  Check,
  RefreshCw,
  FileDown,
  Info,
  ArrowRight,
  Database,
  Lock,
} from 'lucide-react';
import type { SiteRecord } from '../types/dashboard';
import type { WeRecord } from '../config/fieldConfig';
import {
  generateBulkImportTemplate,
  parseAndValidateBulkExcel,
  executeBulkImport,
  type BulkValidationSummary,
  type RowValidationResult,
} from '../utils/bulkExcelService';

interface WeBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  baselineSites: SiteRecord[];
  userSector?: string;
  isAdmin?: boolean;
  onSuccess: (savedRecords: WeRecord[]) => void;
  onSwitchToManual?: () => void;
}

export const WeBulkImportModal: React.FC<WeBulkImportModalProps> = ({
  isOpen,
  onClose,
  baselineSites,
  userSector,
  isAdmin = false,
  onSuccess,
  onSwitchToManual,
}) => {
  const [activeStep, setActiveStep] = useState<'upload' | 'preview' | 'executing' | 'done'>('upload');

  // File states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Validation results
  const [validationSummary, setValidationSummary] = useState<BulkValidationSummary | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'READY' | 'ISSUES'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Import options
  const [protectConstants, setProtectConstants] = useState(true);
  const [skipErrors, setSkipErrors] = useState(true);

  // Execution states
  const [progressCount, setProgressCount] = useState(0);
  const [totalToSave, setTotalToSave] = useState(0);
  const [executionResult, setExecutionResult] = useState<{
    success: boolean;
    savedCount: number;
    errors: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // ── Handle File Selection & Validation ──
  const handleFileChange = async (file: File) => {
    setParseError(null);
    setSelectedFile(file);
    setIsParsing(true);

    try {
      const buffer = await file.arrayBuffer();
      const summary = parseAndValidateBulkExcel(buffer, baselineSites, userSector, isAdmin);
      setValidationSummary(summary);
      setActiveStep('preview');
    } catch (err: any) {
      setParseError(err?.message || 'حدث خطأ أثناء قراءة ملف الإكسيل. يرجى التأكد من سلامة الملف.');
      setValidationSummary(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // ── Execute Final Commit to Database ──
  const handleConfirmImport = async () => {
    if (!validationSummary) return;

    // Filter which records to import based on user choices
    let targets: RowValidationResult[] = [];
    if (skipErrors) {
      // Import rows that don't have blocking errors
      targets = validationSummary.results.filter((r) => r.status !== 'ERROR');
    } else {
      // Must be completely free of errors
      targets = validationSummary.results;
      if (validationSummary.errorCount > 0) {
        alert('يوجد صفوف تحتوي على أخطاء مانعة. يرجى إصلاحها أو تفعيل خيار "استيراد الصفوف السليمة فقط".');
        return;
      }
    }

    if (targets.length === 0) {
      alert('لا توجد أي صفوف صالحة ومستوفية للشروط للاستيراد.');
      return;
    }

    const recordsToSave: WeRecord[] = targets
      .map((t) => t.sanitizedRecord)
      .filter((r): r is WeRecord => Boolean(r));

    setActiveStep('executing');
    setTotalToSave(recordsToSave.length);
    setProgressCount(0);

    const result = await executeBulkImport(recordsToSave, (current, _total) => {
      setProgressCount(current);
    });

    setExecutionResult(result);
    setActiveStep('done');

    if (result.savedCount > 0) {
      onSuccess(recordsToSave);
    }
  };

  // Filtered rows for the preview table
  const displayedRows = (validationSummary?.results || []).filter((row) => {
    if (filterMode === 'READY' && row.status === 'ERROR') return false;
    if (filterMode === 'ISSUES' && row.status === 'VALID') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchCode = String(row.data?.siteCode || '').toLowerCase().includes(q);
      const matchName = String(row.data?.siteName || '').toLowerCase().includes(q);
      const matchStatus = String(row.data?.siteStatus || '').toLowerCase().includes(q);
      const matchErrors = (row.errors || []).some((e) => String(e || '').toLowerCase().includes(q));
      const matchWarnings = (row.warnings || []).some((w) => String(w || '').toLowerCase().includes(q));
      return matchCode || matchName || matchStatus || matchErrors || matchWarnings;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* 1. Modal Header Banner */}
        <div className="pbi-header-banner p-4 sm:p-5 text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  استيراد وتحديث البيانات جماعياً عبر Excel (Bulk Import)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/30 text-teal-200 border border-teal-400/30">
                  حماية الثوابت مفعلة 🔒
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                تنزيل القوالب المعتمدة، فحص التعديلات برمجياً، وتحديث قواعد البيانات المركزية
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Top Dual-Option Switcher (الإدخال اليدوي vs الرفع الجماعي) ── */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSwitchToManual}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <span>✍️ الخيار الأول: الإدخال اليدوي الفردي (Manual Entry)</span>
            </button>

            <button
              type="button"
              className="px-3.5 py-1.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-teal-700 to-emerald-800 border border-teal-600 shadow-sm cursor-default flex items-center gap-1.5 ring-2 ring-emerald-500/20"
            >
              <span>📤 الخيار الثاني: الرفع الجماعي عبر إكسيل (Bulk Excel Import)</span>
              <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.2 rounded-full border border-emerald-400/30">
                مفعل حالياً
              </span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-medium hidden md:inline">
            حماية الثوابت مقفلة برمجياً 🔒
          </span>
        </div>

        {/* 2. Step Indicator Tabs */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs font-bold text-slate-600">
          <div className="flex items-center gap-4">
            <span
              className={`flex items-center gap-1.5 pb-1 border-b-2 transition-colors ${activeStep === 'upload'
                  ? 'border-blue-600 text-blue-700 font-extrabold'
                  : 'border-transparent text-slate-400'
                }`}
            >
              <Upload className="w-3.5 h-3.5" />
              1. تحميل القالب ورفع الملف
            </span>
            <span
              className={`flex items-center gap-1.5 pb-1 border-b-2 transition-colors ${activeStep === 'preview'
                  ? 'border-blue-600 text-blue-700 font-extrabold'
                  : 'border-transparent text-slate-400'
                }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              2. الفحص والتحقق البرمجي
            </span>
            <span
              className={`flex items-center gap-1.5 pb-1 border-b-2 transition-colors ${activeStep === 'executing' || activeStep === 'done'
                  ? 'border-emerald-600 text-emerald-700 font-extrabold'
                  : 'border-transparent text-slate-400'
                }`}
            >
              <Database className="w-3.5 h-3.5" />
              3. الحفظ النهائي والمزامنة
            </span>
          </div>

          {activeStep === 'preview' && validationSummary && (
            <div className="text-[11px] text-slate-500 font-medium">
              تم فحص <span className="font-mono font-bold text-slate-800">{validationSummary.totalRows}</span> صف
            </div>
          )}
        </div>

        {/* 3. Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/40">
          {/* ─────────────── STEP 1: UPLOAD & TEMPLATE ─────────────── */}
          {activeStep === 'upload' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Part A: Download Template Buttons */}
              <div className="pbi-card p-4 sm:p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <FileDown className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-extrabold text-sm text-slate-800">
                      1. تحميل النموذج الاسترشادي (Download Template)
                    </h4>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    موصى به
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  قم بتحميل ملف النموذج الاسترشادي المجهز بالمواقع الحالية. الأعمدة الثابتة مقفلة ومحمية برمجياً،
                  ويسمح الشيت فقط بتكملة وتحديث البيانات المتاحة والمطلوبة (الحالة، نسبة الإنجاز، أسباب التعذر، والتواريخ والملاحظات):
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => generateBulkImportTemplate(baselineSites, 'with-data')}
                    className="p-3.5 rounded-xl border-2 border-emerald-500/50 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-950 flex items-center justify-between gap-3 text-right transition cursor-pointer shadow-2xs group"
                  >
                    <div>
                      <span className="font-black text-xs sm:text-sm block text-emerald-900 group-hover:text-emerald-950">
                        تحميل النموذج الاسترشادي (Download Template)
                      </span>
                      <span className="text-[10px] text-emerald-700 block mt-0.5">
                        يحتوي على كافة بيانات المواقع ({baselineSites.length} موقع) مع إقفال الثوابت
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                      <Download className="w-4 h-4" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => generateBulkImportTemplate(baselineSites, 'blank')}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 flex items-center justify-between gap-3 text-right transition cursor-pointer shadow-2xs group"
                  >
                    <div>
                      <span className="font-extrabold text-xs sm:text-sm block text-slate-800 group-hover:text-slate-900">
                        تحميل نموذج إكسيل فارغ
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        نموذج يحتوي على عناوين الأعمدة المقفلة والمتاحة فقط
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0 border border-slate-200">
                      <Download className="w-4 h-4" />
                    </div>
                  </button>
                </div>

                {/* Constant Protection Rules Note */}
                <div className="mt-4 p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
                  <Lock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">حماية الثوابت (Read-Only / Locked Fields):</span>
                    <span className="text-[11px] text-blue-800 leading-relaxed block mt-0.5">
                      البيانات الأساسية الخاصة بالموقع (كود الموقع، اسم الموقع، المشغل، القطاع، السنترال، إدارة التنفيذ، النوع)
                      لا يجوز للقطاع أو المستخدم تعديلها؛ وهي مقفلة ويتم التحقق منها برمجياً بحيث يرفض النظام أي تعديل عليها
                      إذا حاول المستخدم تغييرها داخل شيت الإكسيل، مع السماح فقط بتكملة وتحديث البيانات التشغيلية المطلوبة.
                    </span>
                  </div>
                </div>
              </div>

              {/* Part B: Upload File Dropzone */}
              <div className="pbi-card p-4 sm:p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <h4 className="font-extrabold text-sm text-slate-800">
                      2. رفع ملف الإكسيل (Upload Excel)
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    فحص وتحديث دفعة واحدة
                  </span>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${isDragging
                      ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
                      : 'border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-slate-50'
                    }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                  />

                  <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-3 shadow-xs">
                    <FileSpreadsheet className="w-7 h-7" />
                  </div>

                  <span className="font-extrabold text-sm sm:text-base text-slate-800 block">
                    اسحب وأفلت ملف الإكسيل هنا، أو انقر للاختيار من جهازك
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">
                    يدعم الملفات بصيغة: .xlsx, .xls, .csv
                  </span>

                  {isParsing && (
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      جارِ قراءة وفحص بيانات الملف برمجياً...
                    </div>
                  )}
                </div>

                {parseError && (
                  <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span className="font-bold">{parseError}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─────────────── STEP 2: PREVIEW & VALIDATION ─────────────── */}
          {activeStep === 'preview' && validationSummary && (
            <div className="space-y-4">
              {/* Validation Summary KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs text-center">
                  <span className="text-[11px] text-slate-500 font-bold block">إجمالي الصفوف</span>
                  <span className="font-mono text-xl sm:text-2xl font-black text-slate-800 block mt-0.5">
                    {validationSummary.totalRows}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl shadow-2xs text-center">
                  <span className="text-[11px] text-emerald-800 font-bold block flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    سليمة وجاهزة
                  </span>
                  <span className="font-mono text-xl sm:text-2xl font-black text-emerald-700 block mt-0.5">
                    {validationSummary.validCount}
                  </span>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl shadow-2xs text-center">
                  <span className="text-[11px] text-amber-800 font-bold block flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    محاولات تعديل ثوابت
                  </span>
                  <span className="font-mono text-xl sm:text-2xl font-black text-amber-700 block mt-0.5">
                    {validationSummary.warningCount}
                  </span>
                </div>

                <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl shadow-2xs text-center">
                  <span className="text-[11px] text-rose-800 font-bold block flex items-center justify-center gap-1">
                    <AlertCircle className="w-3 h-3 text-rose-600" />
                    صفوف بها أخطاء مانعة
                  </span>
                  <span className="font-mono text-xl sm:text-2xl font-black text-rose-700 block mt-0.5">
                    {validationSummary.errorCount}
                  </span>
                </div>
              </div>

              {/* Protection & Options Bar */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={protectConstants}
                      onChange={(e) => setProtectConstants(e.target.checked)}
                      className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                    />
                    <span className="flex items-center gap-1 text-blue-900">
                      <Lock className="w-3.5 h-3.5 text-blue-600" />
                      تثبيت وحماية الثوابت (إلغاء أي تعديل غير مصرح به على القطاع/السنترال/الإدارة)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={skipErrors}
                      onChange={(e) => setSkipErrors(e.target.checked)}
                      className="rounded text-emerald-600 w-4 h-4 cursor-pointer"
                    />
                    <span>استيراد الصفوف السليمة ({validationSummary.readyToImportCount}) وتخطي الأخطاء</span>
                  </label>
                </div>

                <div className="text-[11px] text-slate-400">
                  الملف: <span className="font-mono font-bold text-slate-600">{selectedFile?.name}</span>
                </div>
              </div>

              {/* Table Filters & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFilterMode('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${filterMode === 'ALL'
                        ? 'bg-slate-800 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    الكل ({validationSummary.totalRows})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('READY')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${filterMode === 'READY'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                      }`}
                  >
                    السليم فقط ({validationSummary.validCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('ISSUES')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${filterMode === 'ISSUES'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                      }`}
                  >
                    المخالفات والأخطاء ({validationSummary.warningCount + validationSummary.errorCount})
                  </button>
                </div>

                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث بكود الموقع أو سبب الخطأ..."
                    className="w-full pl-3 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Validation Results Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="max-h-[380px] overflow-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 w-12 text-center">#</th>
                        <th className="p-2.5">كود الموقع</th>
                        <th className="p-2.5">السنترال / القطاع</th>
                        <th className="p-2.5">التصنيف</th>
                        <th className="p-2.5">الحالة الميدانية</th>
                        <th className="p-2.5 text-center">الإنجاز</th>
                        <th className="p-2.5 text-center">حالة الفحص</th>
                        <th className="p-2.5">ملاحظات الفحص وحماية الثوابت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400">
                            لا توجد صفوف مطابقة للفلاتر المحددة.
                          </td>
                        </tr>
                      ) : (
                        displayedRows.map((r) => {
                          const isError = r.status === 'ERROR';
                          const isWarning = r.status === 'WARNING_TAMPER';

                          return (
                            <tr
                              key={r.rowNumber}
                              className={`transition-colors ${isError
                                  ? 'bg-rose-50/50 hover:bg-rose-50'
                                  : isWarning
                                    ? 'bg-amber-50/40 hover:bg-amber-50/70'
                                    : 'hover:bg-slate-50'
                                }`}
                            >
                              <td className="p-2.5 text-center font-mono text-[11px] text-slate-400">
                                {r.rowNumber}
                              </td>
                              <td className="p-2.5 font-bold font-mono text-slate-900">
                                {r.data.siteCode || '—'}
                              </td>
                              <td className="p-2.5">
                                <span className="font-semibold text-slate-800 block truncate max-w-[150px]">
                                  {r.data.central || '—'}
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                                  {r.data.sector || '—'}
                                </span>
                              </td>
                              <td className="p-2.5">
                                <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md inline-block text-[11px]">
                                  {r.data.classification || '—'}
                                </span>
                              </td>
                              <td className="p-2.5">
                                <span className="font-bold text-slate-800 block">
                                  {r.data.siteStatus}
                                </span>
                                {r.data.obstacleReason && (
                                  <span className="text-[10px] text-rose-600 block truncate max-w-[140px]">
                                    عائق: {r.data.obstacleReason}
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-center font-mono font-bold text-slate-700">
                                {r.data.progressPercent}%
                              </td>
                              <td className="p-2.5 text-center">
                                {isError ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                    <AlertCircle className="w-3 h-3" />
                                    خطأ مانع
                                  </span>
                                ) : isWarning ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                    <AlertTriangle className="w-3 h-3" />
                                    تعديل ثوابت
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <Check className="w-3 h-3" />
                                    جاهز
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-xs">
                                {r.errors.length > 0 && (
                                  <div className="space-y-0.5 text-rose-700 font-bold">
                                    {r.errors.map((e, i) => (
                                      <div key={i}>❌ {e}</div>
                                    ))}
                                  </div>
                                )}

                                {r.tamperedFields.length > 0 && (
                                  <div className="mt-0.5 p-1.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 leading-tight">
                                    <span className="font-bold block text-amber-800">
                                      🔒 تم رفض تعديل الثوابت والاحتفاظ بالأصل:
                                    </span>
                                    {r.tamperedFields.map((t, idx) => (
                                      <span key={idx} className="block mt-0.5">
                                        • {t.field}: تم تغييرها في الملف إلى [{t.uploadedValue}]، وسيتم الإبقاء على الأصل [{t.baselineValue}].
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {r.warnings.length > 0 && r.tamperedFields.length === 0 && (
                                  <div className="space-y-0.5 text-amber-700 text-[11px]">
                                    {r.warnings.map((w, i) => (
                                      <div key={i}>⚠️ {w}</div>
                                    ))}
                                  </div>
                                )}

                                {r.errors.length === 0 && r.warnings.length === 0 && (
                                  <span className="text-emerald-700 font-medium text-[11px]">
                                    البيانات مطابقة وجاهزة للتطبيق
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────── STEP 3: EXECUTING PROGRESS ─────────────── */}
          {activeStep === 'executing' && (
            <div className="p-8 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto shadow-sm">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
              <div>
                <h4 className="font-black text-lg text-slate-800">
                  جارِ حفظ التحديثات في قاعدة البيانات المركزية...
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  تتم المزامنة السحابية وتطبيق قواعد حماية الثوابت بصورة موثوقة.
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-200"
                  style={{
                    width: `${totalToSave > 0 ? Math.round((progressCount / totalToSave) * 100) : 0}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-600">
                <span>{progressCount} / {totalToSave} موقع</span>
                <span>{totalToSave > 0 ? Math.round((progressCount / totalToSave) * 100) : 0}%</span>
              </div>
            </div>
          )}

          {/* ─────────────── STEP 4: SUCCESS / DONE ─────────────── */}
          {activeStep === 'done' && executionResult && (
            <div className="p-8 text-center max-w-lg mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="font-black text-lg text-emerald-950">
                  تم الاستيراد والتحديث بنجاح! 🎉
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  تم تحديث وحفظ <span className="font-bold text-emerald-800">{executionResult.savedCount}</span> موقع في قاعدة البيانات السحابية المركزية، مع حماية وتأمين كافة الحقول الثابتة.
                </p>
              </div>

              {executionResult.errors.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs text-right max-h-32 overflow-y-auto">
                  <span className="font-bold block mb-1">تنبيهات أثناء الحفظ:</span>
                  {executionResult.errors.map((e, idx) => (
                    <div key={idx}>• {e}</div>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold rounded-xl text-xs transition cursor-pointer shadow-md"
                >
                  إغلاق وتحديث لوحة المتابعة
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4. Modal Footer Action Buttons */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center justify-between">
          {activeStep === 'upload' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                إلغاء
              </button>
              <span className="text-[11px] text-slate-400">
                اختر أو أسقط ملف الإكسيل للمتابعة للخطوة التالية
              </span>
            </>
          )}

          {activeStep === 'preview' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setActiveStep('upload');
                  setSelectedFile(null);
                  setValidationSummary(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                ⬅️ اختيار ملف آخر
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black rounded-xl text-xs transition shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>
                    حفظ وتطبيق التحديثات المعتمدة ({validationSummary?.readyToImportCount || 0} موقع)
                  </span>
                </button>
              </div>
            </>
          )}

          {(activeStep === 'executing' || activeStep === 'done') && (
            <div className="w-full text-center text-xs text-slate-400">
              {activeStep === 'executing' ? 'يرجى الانتظار حتى اكتمال المعالجة...' : 'اكتملت العملية'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

