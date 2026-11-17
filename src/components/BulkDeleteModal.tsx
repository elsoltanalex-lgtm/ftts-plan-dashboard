import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Trash2,
  Search,
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  Check,
  CheckSquare,
  Square,
  Loader2,
  RefreshCw,
  Building2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { SiteRecord } from '../types/dashboard';

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  sites: SiteRecord[];
  onDeleteBulk: (siteCodes: string[]) => Promise<{ success: boolean; count?: number; error?: string } | void>;
  activeScopeLabel?: string;
  initialSelectedCodes?: string[];
}

export const BulkDeleteModal: React.FC<BulkDeleteModalProps> = ({
  isOpen,
  onClose,
  sites,
  onDeleteBulk,
  activeScopeLabel = 'المواقع',
  initialSelectedCodes = [],
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'excel'>('manual');
  
  // ── Manual Multi-select State ──
  const [manualSearch, setManualSearch] = useState('');
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(() => new Set(initialSelectedCodes));

  // ── Excel Bulk Delete State ──
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [parsedCodes, setParsedCodes] = useState<string[]>([]);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [excelError, setExcelError] = useState<string | null>(null);

  // ── Confirmation & Execution State ──
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when opening/closing
  React.useEffect(() => {
    if (isOpen) {
      if (initialSelectedCodes.length > 0) {
        setSelectedCodes(new Set(initialSelectedCodes));
      }
      setIsConfirming(false);
      setIsDeleting(false);
    }
  }, [isOpen, initialSelectedCodes]);

  // Lookup map of all existing sites in this dataset
  const sitesMap = useMemo(() => {
    const map = new Map<string, SiteRecord>();
    sites.forEach((s) => {
      const code = String(s?.siteCode || '').trim().toUpperCase();
      if (code) map.set(code, s);
    });
    return map;
  }, [sites]);

  // ── Manual Filtered Sites ──
  const filteredManualSites = useMemo(() => {
    const q = (manualSearch || '').trim().toLowerCase();
    if (!q) return sites;
    return sites.filter((s) => {
      const code = String(s?.siteCode || '').toLowerCase();
      const name = String(s?.siteName || '').toLowerCase();
      const central = String(s?.central || '').toLowerCase();
      const sector = String(s?.sector || '').toLowerCase();
      const company = String(s?.company || '').toLowerCase();
      return (
        code.includes(q) ||
        name.includes(q) ||
        central.includes(q) ||
        sector.includes(q) ||
        company.includes(q)
      );
    });
  }, [sites, manualSearch]);

  const handleToggleCode = (code: string) => {
    const norm = String(code || '').trim().toUpperCase();
    if (!norm) return;
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(norm)) {
        next.delete(norm);
      } else {
        next.add(norm);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      filteredManualSites.forEach((s) => {
        const code = String(s?.siteCode || '').trim().toUpperCase();
        if (code) next.add(code);
      });
      return next;
    });
  };

  const handleDeselectAll = () => {
    setSelectedCodes(new Set());
  };

  // ── Excel Template Download ──
  const handleDownloadTemplate = () => {
    try {
      const sampleSites = sites.slice(0, 3);
      const data = [
        ['كود الموقع (Site Code) - إجباري', 'اسم الموقع (Site Name) - اختياري', 'ملاحظات أو سبب الحذف - اختياري'],
        ...sampleSites.map((s, idx) => [
          s?.siteCode || '',
          s?.siteName || '',
          idx === 0 ? 'موقع مكرر أو ملغي' : 'تم استبداله بموقع بديل',
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      // Auto column widths
      ws['!cols'] = [{ wch: 30 }, { wch: 35 }, { wch: 35 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Delete_Codes');
      XLSX.writeFile(wb, `Delete_Sites_Template_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Failed to generate Excel template:', err);
      alert('حدث خطأ أثناء تحميل نموذج الإكسيل');
    }
  };

  // ── Excel Upload Handler ──
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingExcel(true);
    setExcelError(null);
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result;
        const wb = XLSX.read(buffer, { type: 'binary' });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];

        const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (!rawRows || rawRows.length === 0) {
          setExcelError('الملف فارغ أو لا يحتوي على بيانات صالحة');
          setIsParsingExcel(false);
          return;
        }

        // Identify site code column
        let codeColIndex = 0;
        let startRowIndex = 0;

        // Check if row 0 has headers
        const firstRow = rawRows[0] || [];
        const foundHeaderIndex = firstRow.findIndex((cell: any) => {
          const s = String(cell || '').trim().toLowerCase();
          return (
            s.includes('code') ||
            s.includes('site') ||
            s.includes('كود') ||
            s.includes('الموقع') ||
            s.includes('hubid')
          );
        });

        if (foundHeaderIndex >= 0) {
          codeColIndex = foundHeaderIndex;
          startRowIndex = 1;
        }

        const extracted: string[] = [];
        for (let i = startRowIndex; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;
          const val = String(row[codeColIndex] || '').trim();
          if (val && !extracted.includes(val.toUpperCase())) {
            extracted.push(val.toUpperCase());
          }
        }

        if (extracted.length === 0) {
          setExcelError('لم يتم العثور على أي أكواد مواقع في الشيت المرفوع');
        } else {
          setParsedCodes(extracted);
        }
      } catch (err: any) {
        setExcelError('حدث خطأ أثناء قراءة ملف الإكسيل: ' + (err?.message || 'تنسيق غير مدعوم'));
      } finally {
        setIsParsingExcel(false);
      }
    };

    reader.onerror = () => {
      setExcelError('تعذر فتح الملف');
      setIsParsingExcel(false);
    };

    reader.readAsBinaryString(file);
    // Reset file input so re-selecting same file triggers onChange
    e.target.value = '';
  };

  // ── Match Parsed Excel Codes Against Sites Map ──
  const excelMatching = useMemo(() => {
    const matched: SiteRecord[] = [];
    const unmatchedCodes: string[] = [];

    parsedCodes.forEach((code) => {
      const site = sitesMap.get(code);
      if (site) {
        matched.push(site);
      } else {
        unmatchedCodes.push(code);
      }
    });

    return { matched, unmatchedCodes };
  }, [parsedCodes, sitesMap]);

  // Current active codes to delete depending on active tab
  const activeCodesToDelete = useMemo(() => {
    if (activeTab === 'manual') {
      return Array.from(selectedCodes);
    } else {
      return excelMatching.matched.map((s) => s.siteCode);
    }
  }, [activeTab, selectedCodes, excelMatching.matched]);

  // Execute Deletion
  const handleExecuteDelete = async () => {
    if (activeCodesToDelete.length === 0) return;
    setIsDeleting(true);
    try {
      await onDeleteBulk(activeCodesToDelete);
      onClose();
    } catch (err: any) {
      alert('حدث خطأ أثناء الحذف: ' + (err?.message || 'يرجى المحاولة لاحقاً'));
    } finally {
      setIsDeleting(false);
      setIsConfirming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-150 text-right flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-700 via-red-800 to-rose-900 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center ring-1 ring-white/20">
              <Trash2 className="w-5 h-5 text-rose-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">
                  منظومة الحذف الجماعي للمواقع (Bulk Delete System)
                </h3>
                <span className="text-[11px] bg-white/20 text-white px-2 py-0.5 rounded-full font-mono">
                  {activeScopeLabel}
                </span>
              </div>
              <p className="text-xs text-rose-200 mt-0.5">
                حذف متعدد يدوي أو عبر رفع ملف إكسيل مباشرة من قاعدة بيانات Supabase
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isDeleting}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50/80 px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-t-2 ${
              activeTab === 'manual'
                ? 'bg-white border-rose-600 text-rose-700 shadow-2xs border-x border-slate-200'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-rose-600" />
            <span>1. الحذف اليدوي المتعدد (Multi-Select)</span>
            {selectedCodes.size > 0 && (
              <span className="bg-rose-100 text-rose-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {selectedCodes.size}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('excel')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-t-2 ${
              activeTab === 'excel'
                ? 'bg-white border-rose-600 text-rose-700 shadow-2xs border-x border-slate-200'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>2. الحذف الجماعي برفع إكسيل (Excel Bulk Delete)</span>
            {parsedCodes.length > 0 && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {excelMatching.matched.length} مطابق
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'manual' ? (
            /* ── Tab 1: Manual Multi-Select ── */
            <div className="space-y-3">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute inset-y-0 right-3 my-auto text-slate-400" />
                  <input
                    type="text"
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    placeholder="ابحث بكود الموقع، السنترال، القطاع..."
                    className="w-full pr-9 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer flex items-center gap-1 border border-slate-300"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                    <span>تحديد نتائج البحث ({filteredManualSites.length})</span>
                  </button>
                  {selectedCodes.size > 0 && (
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="px-3 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition cursor-pointer border border-rose-200"
                    >
                      إلغاء التحديد ({selectedCodes.size})
                    </button>
                  )}
                </div>
              </div>

              {/* Sites List with Checkboxes */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100 bg-white shadow-2xs">
                {filteredManualSites.map((site, idx) => {
                  const code = String(site?.siteCode || '').trim().toUpperCase();
                  const isChecked = code ? selectedCodes.has(code) : false;
                  return (
                    <div
                      key={site?.id || site?.siteCode || idx}
                      onClick={() => handleToggleCode(site?.siteCode || '')}
                      className={`p-3 transition-colors flex items-center justify-between text-xs cursor-pointer select-none ${
                        isChecked ? 'bg-rose-50/80 font-medium' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0 text-rose-600">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-rose-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-700">
                              {site?.siteCode || 'بدون كود'}
                            </span>
                            <span className="text-slate-800 font-semibold truncate">
                              {site?.siteName || '-'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            السنترال: {site?.central || '-'} • القطاع: {site?.sector || '-'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {site?.company || '-'}
                        </span>
                        <span className="text-[11px] text-slate-600 font-medium">
                          {site?.status || '-'}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {filteredManualSites.length === 0 && (
                  <p className="p-6 text-center text-xs text-slate-400">
                    لا توجد مواقع مطابقة للبحث
                  </p>
                )}
              </div>

              {/* Selected Count Indicator */}
              <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-600 font-medium">
                  إجمالي المواقع المحددة للحذف:
                </span>
                <span className="font-mono font-bold text-rose-700 bg-rose-100 px-3 py-1 rounded-lg border border-rose-300 text-sm">
                  {selectedCodes.size} موقع
                </span>
              </div>
            </div>
          ) : (
            /* ── Tab 2: Excel Bulk Delete ── */
            <div className="space-y-4">
              {/* Action Buttons: Template Download & Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Download Template */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-xs mb-1">
                      <Download className="w-4 h-4 text-sky-600" />
                      <span>تحميل نموذج الإكسيل الفارغ</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      قم بتحميل شيت الإكسيل المخصص لتسجيل الأكواد المراد حذفها دفعة واحدة.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="w-full py-2 px-3 text-xs font-bold text-sky-700 bg-white hover:bg-sky-50 border border-sky-300 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل نموذج الحذف (Template.xlsx)</span>
                  </button>
                </div>

                {/* 2. Upload Excel File */}
                <div className="p-4 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs mb-1">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>رفع شيت الأكواد المراد حذفها</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      يدعم ملفات (.xlsx, .xls, .csv). سيتم استخراج الأكواد ومطابقتها فوراً.
                    </p>
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleExcelUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isParsingExcel}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {isParsingExcel ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>جارِ قراءة الملف...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>رفع ملف الحذف (Upload Delete File)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload Feedback / Error */}
              {excelError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{excelError}</span>
                </div>
              )}

              {/* Uploaded Summary */}
              {uploadedFileName && parsedCodes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold text-slate-800">{uploadedFileName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                        {excelMatching.matched.length} موقع مطابق في القاعدة
                      </span>
                      {excelMatching.unmatchedCodes.length > 0 && (
                        <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                          {excelMatching.unmatchedCodes.length} كود غير موجود
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Matched Sites Preview Table */}
                  {excelMatching.matched.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white">
                      <div className="p-2 bg-slate-50 text-[11px] font-bold text-slate-600 flex items-center justify-between sticky top-0 border-b border-slate-200">
                        <span>معاينة المواقع المطابقة الجاهزة للحذف:</span>
                        <span className="text-emerald-700 font-mono font-bold">
                          {excelMatching.matched.length} موقع
                        </span>
                      </div>
                      {excelMatching.matched.map((site, idx) => (
                        <div key={site?.id || site?.siteCode || idx} className="p-2.5 text-xs flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-indigo-700 ml-2">
                              {site?.siteCode || 'بدون كود'}
                            </span>
                            <span className="text-slate-800 font-medium">{site?.siteName || '-'}</span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {site?.company || '-'} • {site?.sector || '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Unmatched Codes Warning */}
                  {excelMatching.unmatchedCodes.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-900">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>أكواد موجودة في الشيت ولم يتم العثور عليها في قاعدة البيانات:</span>
                      </div>
                      <p className="text-[11px] text-amber-700 font-mono">
                        {excelMatching.unmatchedCodes.slice(0, 15).join(', ')}
                        {excelMatching.unmatchedCodes.length > 15 && ' ... وغيرها'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Warning Confirmation Box */}
          {activeCodesToDelete.length > 0 && (
            <div className="p-3.5 bg-rose-50/90 border border-rose-300 rounded-xl text-xs space-y-1.5 text-rose-900">
              <div className="flex items-center gap-2 font-bold text-rose-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>تحذير هام قبل تنفيذ الحذف الجماعي:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-700">
                أنت على وشك حذف <strong>{activeCodesToDelete.length} موقع</strong> نهائياً من قاعدة بيانات 
                <strong className="text-indigo-800"> Supabase </strong>. هذا الإجراء سيقوم بحذف كافة السجلات وبيانات المتابعة الخاصة بها ولا يمكن التراجع عنه.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2.5">
          <span className="text-xs text-slate-500 font-medium">
            المحدد للحذف: <strong className="text-rose-700 font-mono">{activeCodesToDelete.length}</strong> موقع
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              إلغاء الأمر
            </button>

            <button
              type="button"
              disabled={activeCodesToDelete.length === 0 || isDeleting}
              onClick={handleExecuteDelete}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>جارِ الحذف من Supabase...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف ({activeCodesToDelete.length}) موقع نهائياً</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
