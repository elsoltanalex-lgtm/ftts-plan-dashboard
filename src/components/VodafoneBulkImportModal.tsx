// src/components/VodafoneBulkImportModal.tsx
// Bulk Excel Import modal for Vodafone FTTS with locked baseline constants and data validation

import React, { useState, useRef } from 'react';
import type { SiteRecord } from '../types/dashboard';
import type { VodafoneRecord } from '../types/vodafone';
import {
  generateVodafoneBulkImportTemplate,
  parseAndValidateVodafoneBulkExcel,
  type VodafoneValidationReport,
} from '../utils/vodafoneBulkExcelService';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lock,
  ArrowRight,
  X,
  FileCheck,
  ShieldAlert,
} from 'lucide-react';

export interface VodafoneBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  baselineSites: SiteRecord[];
  onSuccess: (savedRecords: VodafoneRecord[]) => void;
  onSwitchToManual?: () => void;
}

export const VodafoneBulkImportModal: React.FC<VodafoneBulkImportModalProps> = ({
  isOpen,
  onClose,
  baselineSites,
  onSuccess,
  onSwitchToManual,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [report, setReport] = useState<VodafoneValidationReport | null>(null);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Handle Download Protected Template
  const handleDownloadTemplate = async () => {
    try {
      setDownloading(true);
      setGeneralError('');
      const buffer = await generateVodafoneBulkImportTemplate(baselineSites);
      const blob = new Blob([buffer as any], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FTTS_Vodafone_Template_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setGeneralError(`فشل تنزيل النموذج: ${err?.message || 'خطأ غير متوقع'}`);
    } finally {
      setDownloading(false);
    }
  };

  // Handle File Upload & Validation
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setGeneralError('');
      setReport(null);
      setFileName(file.name);

      const arrayBuffer = await file.arrayBuffer();
      const valReport = parseAndValidateVodafoneBulkExcel(arrayBuffer, baselineSites);
      setReport(valReport);
    } catch (err: any) {
      setGeneralError(`فشل تحليل الملف: ${err?.message || 'تأكد من اختيار ملف إكسيل صحيح'}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Execute Import
  const handleConfirmImport = async () => {
    if (!report || report.recordsToImport.length === 0) return;

    try {
      setImporting(true);
      setGeneralError('');
      await onSuccess(report.recordsToImport);
      onClose();
    } catch (err: any) {
      setGeneralError(`فشل إتمام الحفظ: ${err?.message || 'حدث خطأ غير متوقع'}`);
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50 via-red-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  الرفع الجماعي عبر الإكسيل - فودافون (Vodafone Bulk Import)
                </h2>
                <span className="text-[10px] bg-rose-100 text-rose-700 font-extrabold px-2 py-0.5 rounded-full border border-rose-200">
                  FTTS Plan
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تنزيل النموذج الاسترشادي المحمي، تحديث الموقف الميداني، والرفع التلقائي
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {generalError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2.5">
              <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{generalError}</span>
            </div>
          )}

          {/* Step 1: Download Protected Template */}
          <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[11px]">
                  1
                </span>
                <span>تنزيل النموذج الاسترشادي المحمي (Protected Excel Template)</span>
              </div>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                ثوابت القطاعات مقفلة ومحمية برمجياً
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              قم بتحميل شيت الإكسيل الاسترشادي المنظم والمحمي برمجياً. يحتوي الشيت على بيانات مواقع فودافون الرسمية مع حماية
              الثوابت (مثل كود الموقع، رئاسة قطاعات التنفيذ، الإدارة العامة، والسنترال)، مع إتاحة تعديل التصنيف والملاحظات
              والتكاليف.
            </p>
            <div className="pt-1">
              <button
                onClick={handleDownloadTemplate}
                disabled={downloading}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{downloading ? 'جارِ تجهيز وتنزيل الشيت...' : 'تحميل نموذج إكسيل مواقع فودافون المحمي (.xlsx)'}</span>
              </button>
            </div>
          </div>

          {/* Step 2: Upload Updated Sheet */}
          <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[11px]">
                2
              </span>
              <span>رفع ملف الإكسيل المكتمل وفحصه برمجياً (Upload & Validate)</span>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-rose-200 hover:border-rose-400 rounded-2xl p-6 text-center cursor-pointer transition bg-white/70 hover:bg-rose-50/30 flex flex-col items-center justify-center gap-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold text-slate-800">
                {uploading ? 'جارِ فحص ومطابقة الملف...' : 'اضغط لاختيار شيت الإكسيل أو اسحبه هنا'}
              </div>
              <p className="text-[11px] text-slate-500">يدعم ملفات الإكسيل الرسمية (.xlsx, .xls)</p>
              {fileName && (
                <div className="mt-2 text-xs font-mono font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-lg border border-rose-200">
                  📁 {fileName}
                </div>
              )}
            </div>
          </div>

          {/* Validation Report */}
          {report && (
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>نتيجة فحص الشيت (Validation Summary)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    جاهز للحفظ: {report.validRows} موقع
                  </span>
                  {report.tamperedRows > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      محاولات تعديل ثوابت: {report.tamperedRows}
                    </span>
                  )}
                  {report.invalidRows > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 font-bold border border-red-200">
                      أخطاء: {report.invalidRows}
                    </span>
                  )}
                </div>
              </div>

              {/* Tampering Warnings Notice */}
              {report.tamperedRows > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>تم رصد محاولات تعديل في بعض الثوابت المحمية!</span>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    تم حماية النظام تلقائياً وتثبيت القيم المعتمدة الأصلية (كود الموقع، القطاع، الإدارة العامة) مع تطبيق
                    تعديلاتك على الحقول المسموح بها (التصنيف، الملاحظات، والتكاليف).
                  </p>
                </div>
              )}

              {/* Preview Table of Uploaded Rows */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100/80 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">الكود</th>
                      <th className="p-2.5">رئاسة القطاع</th>
                      <th className="p-2.5">الإدارة العامة</th>
                      <th className="p-2.5">التصنيف</th>
                      <th className="p-2.5">سنترال الربط</th>
                      <th className="p-2.5">الملاحظات</th>
                      <th className="p-2.5 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.rows.slice(0, 30).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/70 transition">
                        <td className="p-2.5 font-bold font-mono text-slate-800">{r.siteCode}</td>
                        <td className="p-2.5 text-slate-600">{r.sector || '—'}</td>
                        <td className="p-2.5 text-slate-600 truncate max-w-[150px]">{r.generalAdmin || '—'}</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-700 border border-slate-200 text-[11px]">
                            {r.classification}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600">{r.central || '—'}</td>
                        <td className="p-2.5 text-slate-500 truncate max-w-[160px]">{r.notes || '—'}</td>
                        <td className="p-2.5 text-center">
                          {r.validationErrors.length > 0 ? (
                            <span className="text-red-600" title={r.validationErrors.join(', ')}>
                              ❌
                            </span>
                          ) : r.tamperedFields.length > 0 ? (
                            <span className="text-amber-600" title="تم تثبيت الثوابت الأصلية">
                              ⚠️
                            </span>
                          ) : (
                            <span className="text-emerald-600">✅</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
          {onSwitchToManual ? (
            <button
              onClick={onSwitchToManual}
              className="text-xs font-bold text-rose-700 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
            >
              <span>التبديل إلى التعديل اليدوي الفردي</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={importing}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={!report || report.validRows === 0 || importing}
              className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {importing
                  ? 'جارِ حفظ السجلات...'
                  : `اعتماد واستيراد (${report ? report.validRows : 0}) موقع في فودافون`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

