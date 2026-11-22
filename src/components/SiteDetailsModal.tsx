import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Download,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Lock,
  FileText,
  Edit3,
  Trash2,
  PlusCircle,
  AlertTriangle,
  Info,
  CheckSquare,
  Square,
  FileSpreadsheet,
  Calendar,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { isRecordInSector } from '../utils/sectorPermissions';
import { BulkDeleteModal } from './BulkDeleteModal';
import { parseToDateInputValue } from '../utils/filterUtils';

import type { SiteRecord } from '../types/dashboard';
import { STATUS_CONFIG } from '../data/dashboardData';
import { ORANGE_RAW_RECORDS } from '../data/orangeSites';

interface SiteDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sites: SiteRecord[];
  activeStatusFilter?: string | string[];
  onEditSite?: (siteCode: string) => void;
  onAddNewSite?: () => void;
  onDeleteSite?: (site: SiteRecord) => Promise<boolean | void> | void;
  onDeleteBulkSites?: (siteCodes: string[]) => Promise<{ success: boolean; count?: number; error?: string } | void>;
}

export const SiteDetailsModal: React.FC<SiteDetailsModalProps> = ({
  isOpen,
  onClose,
  sites,
  activeStatusFilter,
  onEditSite,
  onAddNewSite,
  onDeleteSite,
  onDeleteBulkSites,
}) => {
  const { user, canEditRecord } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [siteToDelete, setSiteToDelete] = useState<SiteRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedOrangeCode, setExpandedOrangeCode] = useState<string | null>(null);
  const [expandedEtahaCode, setExpandedEtahaCode] = useState<string | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const pageSize = 8;

  // Quick lookup map for Orange raw Excel records
  const orangeRawMap = useMemo(() => {
    const map = new Map<string, any>();
    ORANGE_RAW_RECORDS.forEach((r) => {
      const code = (r.HUBID || r['Site code'] || '').trim();
      if (code) map.set(code, r);
    });
    return map;
  }, []);

  // Strict Sector Scope Restriction: Non-admin users cannot see sites outside their assigned sector
  const authorizedSites = useMemo(() => {
    if (!user || user.role === 'admin' || user.sector === 'ALL') {
      return sites;
    }
    return sites.filter((site) => isRecordInSector(user.sector, site));
  }, [sites, user]);

  const filteredSites = authorizedSites.filter((site) => {
    const q = (searchTerm || '').toLowerCase();
    const code = String(site?.siteCode || '').toLowerCase();
    const name = String(site?.siteName || '').toLowerCase();
    const central = String(site?.central || '').toLowerCase();
    const sector = String(site?.sector || '').toLowerCase();
    const company = String(site?.company || '').toLowerCase();
    const status = String(site?.status || '').toLowerCase();
    const notes = String(site?.notes || '').toLowerCase();
    const obstacleReason = String(site?.obstacleReason || '').toLowerCase();
    const civilContractor = String(site?.civilContractor || '').toLowerCase();
    return (
      code.includes(q) ||
      name.includes(q) ||
      central.includes(q) ||
      sector.includes(q) ||
      company.includes(q) ||
      status.includes(q) ||
      notes.includes(q) ||
      obstacleReason.includes(q) ||
      civilContractor.includes(q)
    );
  });

  const totalPages = Math.ceil(filteredSites.length / pageSize) || 1;
  const pagedSites = filteredSites.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleExportCsv = () => {
    const headers = [
      'Site ID',
      'Site Code',
      'Site Name',
      'Company',
      'Status',
      'Links Count',
      'Sector',
      'Central',
      'General Admin',
      'ادارة التنفيذ المختصة',
      'Classification',
      'Expected Date',
      'Progress %',
      'Contractor',
      'Obstacle Reason',
      'Notes',
    ];

    const rows = filteredSites.map((s) => [
      s.id,
      s.siteCode,
      `"${s.siteName}"`,
      s.company,
      `"${s.status}"`,
      s.linksCount,
      `"${s.sector}"`,
      `"${s.central}"`,
      `"${s.generalAdmin}"`,
      `"${s.competentAdmin}"`,
      `"${s.classification}"`,
      s.expectedDate,
      `${s.progressPercent}%`,
      `"${s.civilContractor || ''}"`,
      `"${s.obstacleReason || ''}"`,
      `"${s.notes || ''}"`,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `FTTS_Sites_Export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Checkbox selection logic
  const handleToggleSiteSelect = (code: string) => {
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

  const isAllCurrentPageSelected = useMemo(() => {
    if (pagedSites.length === 0) return false;
    return pagedSites.every((s) => selectedCodes.has(String(s?.siteCode || '').trim().toUpperCase()));
  }, [pagedSites, selectedCodes]);

  const handleToggleSelectAllPage = () => {
    if (isAllCurrentPageSelected) {
      setSelectedCodes((prev) => {
        const next = new Set(prev);
        pagedSites.forEach((s) => {
          const code = String(s?.siteCode || '').trim().toUpperCase();
          if (code) next.delete(code);
        });
        return next;
      });
    } else {
      setSelectedCodes((prev) => {
        const next = new Set(prev);
        pagedSites.forEach((s) => {
          const code = String(s?.siteCode || '').trim().toUpperCase();
          if (code) next.add(code);
        });
        return next;
      });
    }
  };

  const handleDownloadDeleteTemplate = () => {
    try {
      const sample = sites.slice(0, 3);
      const data = [
        ['كود الموقع (Site Code) - إجباري', 'اسم الموقع (Site Name) - اختياري', 'ملاحظات أو سبب الحذف - اختياري'],
        ...sample.map((s, idx) => [
          s.siteCode,
          s.siteName,
          idx === 0 ? 'موقع مكرر أو ملغي' : 'تم استبداله بموقع بديل',
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [{ wch: 30 }, { wch: 35 }, { wch: 35 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Delete_Codes');
      XLSX.writeFile(wb, `Delete_Sites_Template_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Failed to generate template:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="pbi-header-banner p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center ring-1 ring-white/20">
              <Building2 className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">
                  سجل تفاصيل المواقع الميدانية (Site Detailed Records)
                </h3>
                {activeStatusFilter && (
                  <span className="text-xs bg-sky-500/30 text-sky-200 px-2.5 py-0.5 rounded-full border border-sky-400/30 font-medium">
                    {Array.isArray(activeStatusFilter) ? activeStatusFilter.join(' + ') : activeStatusFilter}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                عرض {filteredSites.length} موقع مطابق للتصفية المطبقة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Toolbar: Search and Export */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute inset-y-0 right-3 my-auto text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="بحث بكود الموقع، السنترال، المقاول..."
              className="w-full pr-9 pl-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-700"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {/* Download Delete Template */}
            <button
              type="button"
              onClick={handleDownloadDeleteTemplate}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
              title="تحميل شيت إكسيل فارغ مخصص لتسجيل الأكواد المراد حذفها"
            >
              <Download className="w-3.5 h-3.5 text-sky-600" />
              <span>نموذج حذف إكسيل</span>
            </button>

            {/* Excel Bulk Delete Button */}
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
              title="حذف جماعي للأكواد برفع ملف إكسيل أو التحديد المتعدد"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف جماعي (إكسيل / يدوي)</span>
            </button>

            <button
              onClick={() => {
                onClose();
                if (onAddNewSite) {
                  onAddNewSite();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
              title="إضافة موقع جديد يدوياً"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>إضافة موقع جديد</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-sky-600" />
              <span>تصدير النتائج (CSV)</span>
            </button>
          </div>
        </div>

        {/* Multi-Select Floating Notification Bar */}
        {selectedCodes.size > 0 && (
          <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 flex items-center justify-between text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
              <span className="font-bold text-rose-900">
                تم تحديد <strong className="font-mono text-sm">{selectedCodes.size}</strong> موقع للحذف
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedCodes(new Set())}
                className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                إلغاء التحديد
              </button>
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="px-3.5 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف المواقع المحددة ({selectedCodes.size})</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Table Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 text-center w-10">
                    <button
                      type="button"
                      onClick={handleToggleSelectAllPage}
                      className="text-slate-600 hover:text-slate-900 cursor-pointer flex items-center justify-center mx-auto"
                      title={isAllCurrentPageSelected ? 'إلغاء تحديد كافة مواقع الصفحة' : 'تحديد كافة مواقع الصفحة الحالية'}
                    >
                      {isAllCurrentPageSelected ? (
                        <CheckSquare className="w-4 h-4 text-rose-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3">كود الموقع</th>
                  <th className="py-2.5 px-3">اسم الموقع / السنترال</th>
                  <th className="py-2.5 px-3">الشركة</th>
                  <th className="py-2.5 px-3">موقف العام</th>
                  <th className="py-2.5 px-3 text-center">الروابط</th>
                  <th className="py-2.5 px-3">القطاع</th>
                  <th className="py-2.5 px-3">التاريخ المستهدف</th>
                  <th className="py-2.5 px-3">المقاول / التعذر</th>
                  <th className="py-2.5 px-3 min-w-[200px]">الملاحظات (Notes)</th>
                  <th className="py-2.5 px-3 text-center min-w-[160px] bg-indigo-50 text-indigo-950 font-extrabold border-l border-r border-indigo-200">إجراءات التحكم (تعديل / حذف)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedSites.map((site, sIdx) => {
                  const cfg = STATUS_CONFIG[site.status] || {
                    color: '#64748b',
                    bgLight: '#f1f5f9',
                    border: '#cbd5e1',
                    textColor: '#334155',
                  };
                  const codeNorm = String(site?.siteCode || '').trim().toUpperCase();
                  const isEtahaSite = Boolean(
                    site?.id?.startsWith('ETAH-') ||
                    site?.rawRecord?.['المشروع'] === 'اتاحة' ||
                    site?.paymentAndStartDate ||
                    site?.rawRecord?.['تاريخ السداد و البدء فى التنفيذ'] ||
                    site?.rawRecord?.['تاريخ السداد والبدء في التنفيذ']
                  );

                  return (
                    <React.Fragment key={site?.id || site?.siteCode || sIdx}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSiteSelect(site?.siteCode || '')}
                            className="cursor-pointer flex items-center justify-center mx-auto text-rose-600"
                            title={codeNorm && selectedCodes.has(codeNorm) ? 'إلغاء التحديد' : 'تحديد للحذف'}
                          >
                            {codeNorm && selectedCodes.has(codeNorm) ? (
                              <CheckSquare className="w-4 h-4 text-rose-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-sky-800">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{site.siteCode}</span>
                            {(site.specialTarget || site.rawRecord?.specialTarget || site.rawRecord?.['سبيشال تارجت'] || site.rawRecord?.['سبيشال_تارجت']) && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs" title="مشروع سبيشال تارجت">
                                ⭐ سبيشال تارجت
                              </span>
                            )}
                          </div>
                          {site.company === 'Orange' && (
                            <button
                              type="button"
                              onClick={() => setExpandedOrangeCode(expandedOrangeCode === site.siteCode ? null : site.siteCode)}
                              className="mt-1 px-1.5 py-0.5 text-[10px] font-bold bg-orange-50 hover:bg-orange-100 text-orange-800 rounded border border-orange-200 transition flex items-center gap-0.5 cursor-pointer"
                              title="استعراض كافة بيانات شيت أورنج المطابقة لملف الإكسيل"
                            >
                              {expandedOrangeCode === site.siteCode ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                              <span>بيانات شيت أورنج</span>
                            </button>
                          )}
                          {isEtahaSite && (
                            <button
                              type="button"
                              onClick={() => setExpandedEtahaCode(expandedEtahaCode === site.siteCode ? null : site.siteCode)}
                              className="mt-1 px-1.5 py-0.5 text-[10px] font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 rounded border border-teal-200 transition flex items-center gap-0.5 cursor-pointer"
                              title="استعراض تفاصيل مشروع الإتاحة وتاريخ السداد والبدء في التنفيذ"
                            >
                              {expandedEtahaCode === site.siteCode ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                              <span>بيانات مشروع الإتاحة</span>
                            </button>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold block text-slate-800">
                            {site.siteName}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            السنترال: {site.central}
                            {site.governorate && ` • ${site.governorate}`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${site.company === 'WE'
                              ? 'bg-purple-100 text-purple-800 border-purple-200'
                              : site.company === 'Orange'
                                ? 'bg-orange-100 text-orange-800 border-orange-200'
                                : site.company === 'Vodafone'
                                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              }`}
                          >
                            {site.company}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                            style={{
                              backgroundColor: cfg.bgLight,
                              color: cfg.textColor,
                              borderColor: cfg.border,
                              borderWidth: 1,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: cfg.color }}
                            />
                            {site.status}
                          </span>
                          {site.company === 'Orange' && site.classification && (
                            <span className="block text-[10px] text-slate-500 font-medium mt-0.5">
                              التصنيف: {site.classification}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                          {site.linksCount}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {site.company === 'Orange' ? (
                            <div className="text-[11px] space-y-0.5">
                              <span className="font-semibold text-slate-800 block">رئاسة القطاع: {site.sector}</span>
                              {site.generalAdmin && (
                                <span className="text-[10px] text-slate-600 block">
                                  الإدارة العامة: {site.generalAdmin}
                                </span>
                              )}
                              {site.subSector && (
                                <span className="text-[10px] text-indigo-700 font-medium block">
                                  الإدارة المختصة: {site.subSector}
                                </span>
                              )}
                              {site.competentAdmin && (
                                <span className="text-[10px] text-slate-500 block">
                                  إدارة المنطقة: {site.competentAdmin}
                                </span>
                              )}
                            </div>
                          ) : (
                            <>
                              <span className="font-semibold text-slate-800 block">{site.sector}</span>
                              {site.competentAdmin && (
                                <span className="text-[10px] text-slate-500 block mt-0.5">
                                  إدارة التنفيذ: {site.competentAdmin}
                                </span>
                              )}
                            </>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          <div>{site.expectedDate}</div>
                          {(site.paymentAndStartDate || site.rawRecord?.['تاريخ السداد والبدء في التنفيذ'] || site.rawRecord?.['تاريخ السداد و البدء فى التنفيذ']) && (
                            <span
                              className="text-[10px] text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded font-sans font-bold block mt-1"
                              title="تاريخ السداد والبدء في التنفيذ"
                            >
                              بدء وسداد: {site.paymentAndStartDate || parseToDateInputValue(site.rawRecord?.['تاريخ السداد والبدء في التنفيذ'] || site.rawRecord?.['تاريخ السداد و البدء فى التنفيذ'])}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          <span className="block font-medium text-slate-700">
                            {site.responsibility || site.civilContractor || 'المناطق'}
                          </span>
                          {site.obstacleType && (
                            <span className="text-[10px] text-rose-600 block mt-0.5">
                              معوق: {site.obstacleType}
                            </span>
                          )}
                          {site.deliveryOrange && (
                            <span className="text-[10px] text-teal-700 block mt-0.5 font-medium">
                              أورنج: {site.deliveryOrange}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 min-w-[200px]">
                          {site.notes && site.notes.trim() ? (
                            <div className="bg-amber-50/90 border border-amber-200 rounded-lg p-2 text-xs text-amber-950 shadow-2xs leading-relaxed">
                              <div className="flex items-center gap-1 text-[10px] text-amber-700 font-bold mb-0.5">
                                <FileText className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>ملاحظات الموقع:</span>
                              </div>
                              <p className="whitespace-pre-wrap font-medium">{site.notes}</p>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">لا توجد ملاحظات مسجلة</span>
                          )}
                        </td>
                        {/* إجراءات التحكم بجانب كل موقع */}
                        <td className="py-2.5 px-3 text-center bg-slate-50/70 border-l border-r border-slate-200">
                          <div className="flex items-center justify-center gap-2">
                            {/* 1. زر تعديل البيانات */}
                            <button
                              type="button"
                              onClick={() => {
                                if (onEditSite) {
                                  const code = site?.siteCode ? String(site.siteCode).trim() : '';
                                  if (!code) return;
                                  onClose();
                                  onEditSite(code);
                                }
                              }}
                              className="px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-xs hover:shadow-amber-500/25 active:scale-95"
                              title={`تعديل بيانات (${site.siteCode})`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>تعديل</span>
                            </button>

                            {/* 2. زر إلغاء أو حذف موقع */}
                            <button
                              type="button"
                              onClick={() => {
                                setSiteToDelete(site);
                              }}
                              className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-xs hover:shadow-rose-600/25 active:scale-95"
                              title={`حذف وإلغاء (${site.siteCode})`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable sub-row with exact Orange Excel Sheet columns */}
                      {site.company === 'Orange' && expandedOrangeCode === site.siteCode && (() => {
                        const raw = site.rawRecord || orangeRawMap.get(site.siteCode) || {};
                        return (
                          <tr className="bg-orange-50/50 border-b-2 border-orange-200">
                            <td colSpan={11} className="p-4 text-xs">
                              <div className="bg-white rounded-xl p-4 border border-orange-200 shadow-sm space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-orange-100">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-orange-600 text-white font-bold text-xs">
                                      بيانات شيت Orange الرسمي المطابقة للإكسيل
                                    </span>
                                    <span className="font-mono font-bold text-slate-800">
                                      HUBID: {raw['HUBID'] || site.siteCode}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-500">
                                    العميل: {raw['العميل'] || 'Orange 2026'}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-slate-700">
                                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                                    <span className="text-[11px] font-bold text-slate-500 block">الهيكل الإداري لـ Orange</span>
                                    <div><strong className="text-slate-600">رئاسة القطاعات:</strong> {raw['رئاسة القطاعات '] || site.sector}</div>
                                    <div><strong className="text-slate-600">الادارة العامة:</strong> {raw['الادارة العامة'] || site.generalAdmin}</div>
                                    <div><strong className="text-slate-600">القطاع (الإدارة المختصة):</strong> {raw['القطاع'] || site.subSector}</div>
                                    <div><strong className="text-slate-600">المنطقة (إدارة المنطقة):</strong> {raw['المنطقة'] || site.competentAdmin}</div>
                                    <div><strong className="text-slate-600">مسئوليه التنفيذ:</strong> {raw['مسئوليه التنفيذ'] || site.responsibility}</div>
                                  </div>

                                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                                    <span className="text-[11px] font-bold text-slate-500 block">الموقف الميداني والتنفيذي</span>
                                    <div><strong className="text-slate-600">التصنيف (مدني):</strong> <span className="font-semibold text-indigo-700">{raw['التصنيف (مدني)'] || site.classification}</span></div>
                                    <div><strong className="text-slate-600">عدد الروابط:</strong> {raw['No. Links.'] || site.linksCount}</div>
                                    <div><strong className="text-slate-600">الزياره الاولي (تنفيذ):</strong> {raw['الزياره  الاولي (تنفيذ)'] || '0'}</div>
                                    <div><strong className="text-slate-600">الزياره الثانيه:</strong> {raw['الزياره  الثانيه'] || '0'}</div>
                                    <div><strong className="text-slate-600">الزياره الثالثه:</strong> {raw['الزياره  الثالثه'] || '0'}</div>
                                  </div>

                                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                                    <span className="text-[11px] font-bold text-slate-500 block">الموقف الكهربي والتسليمات</span>
                                    <div><strong className="text-slate-600">التصنيف (كهربي):</strong> {raw['التصنيف (كهربي)'] || 'اسباب مدنيه'}</div>
                                    <div><strong className="text-slate-600">المرحله الكهربيه):</strong> {raw['المرحله الكهربيه'] || 'لم يتم مدني'}</div>
                                    <div><strong className="text-slate-600">تاكيد التسليم للمنطقه:</strong> {raw['تاكيد التسليم للمنطقه'] || 'لم يتم التسليم'}</div>
                                    <div><strong className="text-slate-600">موقف التسليم لاورنچ:</strong> {raw['موقف التسليم لاورنچ'] || 'لم يتم التسليم لاورنچ'}</div>
                                    <div><strong className="text-slate-600">TX avail:</strong> {raw['TX avail'] || 'له تراسل '}</div>
                                  </div>

                                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                                    <span className="text-[11px] font-bold text-slate-500 block">المعوقات والمستندات والإحداثيات</span>
                                    <div><strong className="text-slate-600">نوع المعوق المدني:</strong> {raw['نوع المعوق المدني'] && raw['نوع المعوق المدني'] !== '0' ? raw['نوع المعوق المدني'] : 'لا يوجد'}</div>
                                    <div><strong className="text-slate-600">توضيح تفاصيل المعوق:</strong> {raw['توضيح تفاصيل المعوق و المتعذر '] && raw['توضيح تفاصيل المعوق و المتعذر '] !== '0' ? raw['توضيح تفاصيل المعوق و المتعذر '] : 'لا يوجد'}</div>
                                    <div><strong className="text-slate-600">موقف المرفقات:</strong> <span className="font-semibold text-emerald-700">{raw['موقف المرفقات'] || site.documentStatus}</span></div>
                                    <div><strong className="text-slate-600">إحداثيات:</strong> {raw['احدثيات خط العرض'] || 'N/A'}, {raw['احدثيات خط الطول'] || 'N/A'}</div>
                                    <div><strong className="text-slate-600">إجمالي التكلفة:</strong> {raw['اجمالي تكلفة الموقع'] || '0'}</div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })()}

                      {/* Expandable sub-row for Availability / Etaha project details */}
                      {isEtahaSite && expandedEtahaCode === site.siteCode && (() => {
                        const raw = (site.rawRecord as any) || {};
                        const pDate = site.paymentAndStartDate || parseToDateInputValue(raw['تاريخ السداد والبدء في التنفيذ'] || raw['تاريخ السداد و البدء فى التنفيذ']);
                        return (
                          <tr className="bg-teal-50/50 border-b-2 border-teal-200">
                            <td colSpan={11} className="p-4 text-xs">
                              <div className="bg-white rounded-xl p-4 border border-teal-200 shadow-sm space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-teal-100">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-teal-600 text-white font-bold text-xs">
                                      بيانات مشروع الإتاحة (Availability Project)
                                    </span>
                                    <span className="font-mono font-bold text-slate-800">
                                      كود المشروع: {site.siteCode}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-500">
                                    العميل: {raw['اسم العميل'] || site.siteName}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-slate-700">
                                  {/* كارت تاريخ السداد والبدء في التنفيذ وأمر الخدمة */}
                                  <div className="p-2.5 rounded-lg bg-teal-50/80 border border-teal-300 space-y-1.5">
                                    <span className="text-[11px] font-black text-teal-900 flex items-center gap-1">
                                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                                      <span>تاريخ السداد وأمر الخدمة</span>
                                    </span>
                                    <div>
                                      <strong className="text-teal-950 font-bold block text-[11px]">تاريخ السداد والبدء في التنفيذ:</strong>
                                      <span className="font-mono font-bold text-xs text-teal-900 bg-white px-2 py-0.5 rounded border border-teal-300 inline-block mt-0.5 shadow-2xs">
                                        {pDate || 'غير مسجل'}
                                      </span>
                                    </div>
                                    <div><strong className="text-slate-600">أمر الخدمة (Order Service):</strong> <span className="font-mono font-bold">{raw['  Order Service'] || raw.orderService || 'N/A'}</span></div>
                                    <div><strong className="text-slate-600">تاريخ التسليم:</strong> {raw['تاريخ التسليم '] || raw['تاريخ التسليم'] || 'لم يتم'}</div>
                                    <div>
                                      <strong className="text-slate-600">سبيشال تارجت:</strong>{' '}
                                      {(site.specialTarget || raw.specialTarget || raw['سبيشال تارجت']) ? (
                                        <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300">⭐ نعم (Special Target)</span>
                                      ) : (
                                        <span className="text-slate-500">لا</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* الهيكل الإداري والتنفيذي */}
                                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                                    <span className="text-[11px] font-bold text-slate-500 block">الهيكل الإداري والتنفيذي</span>
                                    <div><strong className="text-slate-600">القطاعات:</strong> {raw['القطاعات'] || site.sector}</div>
                                    <div><strong className="text-slate-600">قطاع التنفيذ:</strong> {raw['قطاع التنفيذ'] || site.executionSector || 'غير محدد'}</div>
                                    <div><strong className="text-slate-600">الإدارة العامة المنفذة:</strong> {raw['الادارة العامة المنفذة'] || site.generalAdmin}</div>
                                    <div><strong className="text-slate-600">إدارة التنفيذ:</strong> {raw['ادارة التنفيذ'] || site.competentAdmin}</div>
                                  </div>

                                  {/* مسارات المشروع واللحامات */}
                                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                                    <span className="text-[11px] font-bold text-slate-500 block">موقف المسارات والتسليم</span>
                                    <div><strong className="text-slate-600">المسار الخارجي:</strong> <span className="font-semibold text-teal-800">{raw['المسار الخارجي'] || site.externalPath || 'غير محدد'}</span></div>
                                    <div><strong className="text-slate-600">المسار الداخلي:</strong> <span className="font-semibold text-teal-800">{raw['المسار الداخلى'] || site.internalPath || 'غير محدد'}</span></div>
                                    <div><strong className="text-slate-600">موقف اللحامات:</strong> {raw['موقف اللحامات'] || 'لم يتم'}</div>
                                    <div><strong className="text-slate-600">موقف التسليم:</strong> {raw['موقف التسليم'] || site.deliveryStatus || 'لم يتم'}</div>
                                  </div>

                                  {/* المعوقات والملاحظات */}
                                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                                    <span className="text-[11px] font-bold text-slate-500 block">المعوقات والملاحظات</span>
                                    <div><strong className="text-slate-600">التصنيف:</strong> <span className="font-bold text-indigo-700">{raw['التصنيف'] || site.classification}</span></div>
                                    <div><strong className="text-slate-600">سبب المعوق أو التعذر:</strong> {raw['سبب المعوق او التعذر'] || 'لا يوجد'}</div>
                                    <div><strong className="text-slate-600">ملحوظة عدم الانتهاء:</strong> {raw['ملحوظه في حاله عدم الانتهاء'] || 'لا يوجد'}</div>
                                    <div><strong className="text-slate-600">مدير الإدارة:</strong> {raw['اسم ورقم تليفون مدير الادارة'] || 'غير مسجل'}</div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })()}
                    </React.Fragment>
                  );
                })}

                {pagedSites.length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-slate-400">
                      لا توجد مواقع مطابقة للبحث أو التصفية الحالية
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Pagination Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            صفحة <strong className="text-slate-700">{currentPage}</strong> من{' '}
            <strong className="text-slate-700">{totalPages}</strong> (إجمالي {filteredSites.length} موقع)
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage <= 1}
              className="px-2.5 py-1 rounded bg-white border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors flex items-center gap-1"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              <span>السابق</span>
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1 rounded bg-white border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors flex items-center gap-1"
            >
              <span>التالي</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal Overlay */}
      {siteToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 w-full max-w-md p-6 overflow-hidden animate-in zoom-in-95 duration-150 text-right">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800">
                  تأكيد إلغاء أو حذف الموقع
                </h4>
                <p className="text-xs text-rose-600 font-medium">
                  عملية لا يمكن التراجع عنها
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              هل أنت متأكد من رغبتك في حذف وإلغاء الموقع التالي نهائياً من قاعدة البيانات المركزية؟
            </p>

            {/* Site Details Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 mb-5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">كود الموقع:</span>
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {siteToDelete.siteCode}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">اسم الموقع:</span>
                <span className="font-semibold text-slate-800">
                  {siteToDelete.siteName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">الشركة المشغلة:</span>
                <span className="font-semibold text-slate-700">
                  {siteToDelete.company}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">القطاع والسنترال:</span>
                <span className="text-slate-700">
                  {siteToDelete.sector} • {siteToDelete.central}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">الموقف التنفيذي:</span>
                <span className="font-medium text-slate-700">
                  {siteToDelete.status}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSiteToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                إلغاء الأمر
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!onDeleteSite) return;
                  setIsDeleting(true);
                  try {
                    await onDeleteSite(siteToDelete);
                    setSiteToDelete(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'جارِ الحذف...' : 'تأكيد الحذف النهائي'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
