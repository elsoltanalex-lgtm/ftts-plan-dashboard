// src/components/EtahaBulkImportModal.tsx
// Bulk Excel Import modal for Availability / Etaha with locked baseline constants and data validation

import React, { useState, useRef } from 'react';
import type { SiteRecord } from '../types/dashboard';
import type { EtahaRecord } from '../data/etahaSites';
import {
  generateEtahaBulkImportTemplate,
  parseAndValidateEtahaBulkExcel,
  type EtahaValidationReport,
} from '../utils/etahaBulkExcelService';
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
  Globe,
} from 'lucide-react';

export interface EtahaBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  baselineSites: SiteRecord[];
  onSuccess: (savedRecords: EtahaRecord[]) => void;
  onSwitchToManual?: () => void;
}

export const EtahaBulkImportModal: React.FC<EtahaBulkImportModalProps> = ({
  isOpen,
  onClose,
  baselineSites,
  onSuccess,
  onSwitchToManual,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [report, setReport] = useState<EtahaValidationReport | null>(null);
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
      const buffer = await generateEtahaBulkImportTemplate(baselineSites);
      const blob = new Blob([buffer as any], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Availability_Etaha_Template_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
      const valReport = await parseAndValidateEtahaBulkExcel(arrayBuffer, baselineSites);
      setReport(valReport);
    } catch (err: any) {
      setGeneralError(`فشل تحليل الملف: ${err?.message || 'تأكد من اختيار ملف إكسيل صحيح'}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Confirm and Execute Import
  const handleExecuteImport = async () => {
    if (!report || report.recordsToImport.length === 0) return;
    try {
      setImporting(true);
      onSuccess(report.recordsToImport);
      onClose();
    } catch (err: any) {
      setGeneralError(`فشل إدخال البيانات: ${err?.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-700 to-emerald-800 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                الاستيراد والرفع الجماعي لشيت إكسيل مشروعات الإتاحة (Availability)
              </h2>
              <p className="text-xs text-teal-100 font-medium">
                تحميل النموذج المعتمد • التحقق البرمجي • حماية الثوابت • تحديث الموقف التنفيذي
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {generalError && (
            <div className="p-3.5 bg-red-50 border border-red-300 rounded-xl text-red-800 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          {/* Guidelines Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Lock className="w-4 h-4 text-slate-600" />
                <span>حماية الثوابت الإلزامية لمشروعات الإتاحة:</span>
              </div>
              <p className="text-slate-500">
                الأعمدة (الكود، اسم المشروع، العميل، الفرع، العنوان، القطاع، الإدارة العامة، المحافظة، أمر الشغل) محمية ومؤمنة برمجياً.
                التحديث متاح لحقول الموقف التنفيذي، التصنيف، سبب المعوقات، والملاحظات.
              </p>
            </div>
            {onSwitchToManual && (
              <button
                type="button"
                onClick={onSwitchToManual}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <span>الإدخال اليدوي الفردي</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Boxes: Download & Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Box 1: Download Protected Template */}
            <div className="border border-teal-200 bg-teal-50/40 rounded-2xl p-5 flex flex-col justify-between space-y-3">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-3">
                  <Download className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-teal-950 text-sm">
                  1. تحميل النموذج المعتمد لمشروعات الإتاحة
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  تنزيل ملف إكسيل منسق ومحمي يحتوي على كافة بيانات مشروعات الإتاحة مع قوائم الاختيار السريعة لحالات التنفيذ.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={downloading}
                className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{downloading ? 'جارٍ إنشاء وتحميل النموذج...' : 'تحميل نموذج الإتاحة المعتمد (.xlsx)'}</span>
              </button>
            </div>

            {/* Box 2: Upload Completed File */}
            <div className="border border-emerald-200 bg-emerald-50/40 rounded-2xl p-5 flex flex-col justify-between space-y-3">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-emerald-950 text-sm">
                  2. رفع وفحص ملف الإكسيل المعبأ
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  يقوم النظام بالتحقق الآلي من مطابقة الثوابت، تطابق الأكواد، وصحة التصنيفات قبل إتمام الحفظ.
                </p>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{uploading ? 'جارٍ قراءة وفحص الشيت...' : 'اختيار ورفع ملف الإكسيل'}</span>
              </button>
            </div>
          </div>

          {/* Validation Report & Summary */}
          {report && (
            <div className="space-y-4 pt-2 border-t border-slate-200 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>تقرير فحص ملف: {fileName}</span>
                </h4>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                    الإجمالي: {report.totalRows} مشروع
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200">
                    جاهز للحفظ: {report.validRows}
                  </span>
                  {report.tamperedRows > 0 && (
                    <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200">
                      ثوابت محمية مسترجعة: {report.tamperedRows}
                    </span>
                  )}
                  {report.invalidRows > 0 && (
                    <span className="bg-red-100 text-red-800 px-2.5 py-1 rounded-lg border border-red-200">
                      أخطاء: {report.invalidRows}
                    </span>
                  )}
                </div>
              </div>

              {/* Warnings on Tampered Constants */}
              {report.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-1 text-xs">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>تنبيهات حماية الثوابت (تم الحفاظ على البيانات الأساسية ومنع التعديل غير المصرح به):</span>
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-0.5 text-amber-800 font-mono text-[11px]">
                    {report.warnings.map((w, idx) => (
                      <p key={idx}>• {w}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors List */}
              {report.errors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-300 rounded-xl space-y-1 text-xs">
                  <div className="font-bold text-red-900 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span>أخطاء يجب تصحيحها في الشيت:</span>
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-0.5 text-red-800 font-mono text-[11px]">
                    {report.errors.map((e, idx) => (
                      <p key={idx}>• {e}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto text-xs">
                <table className="w-full text-right">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                    <tr>
                      <th className="p-2 border-b">الكود</th>
                      <th className="p-2 border-b">اسم العميل / المشروع</th>
                      <th className="p-2 border-b">الفرع</th>
                      <th className="p-2 border-b">القطاع</th>
                      <th className="p-2 border-b">المحافظة</th>
                      <th className="p-2 border-b">الموقف التنفيذي</th>
                      <th className="p-2 border-b text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.rows.slice(0, 30).map((r, idx) => (
                      <tr key={idx} className={r.validationErrors.length > 0 ? 'bg-red-50/40' : ''}>
                        <td className="p-2 font-mono font-bold text-teal-800">{r.siteCode}</td>
                        <td className="p-2 font-bold text-slate-800">{r.clientName}</td>
                        <td className="p-2">{r.branchName}</td>
                        <td className="p-2">{r.sector}</td>
                        <td className="p-2">{r.governorate}</td>
                        <td className="p-2 font-bold text-emerald-700">{r.classification}</td>
                        <td className="p-2 text-center">
                          {r.validationErrors.length > 0 ? (
                            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                              خطأ
                            </span>
                          ) : (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                              جاهز ✅
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Execute Import Action */}
              <div className="pt-2 flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">
                  {report.validRows > 0
                    ? `سيتم استيراد وحفظ ${report.validRows} مشروع في قاعدة بيانات الإتاحة الرسمية.`
                    : 'لا توجد أسطر صالحة للاستيراد حالياً.'}
                </p>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={importing || report.validRows === 0}
                  className="px-6 py-2.5 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {importing ? 'جارٍ الاستيراد...' : `تأكيد استيراد وحفظ (${report.validRows}) مشروع`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

