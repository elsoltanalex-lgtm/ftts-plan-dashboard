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
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isRecordInSector } from '../utils/sectorPermissions';

import type { SiteRecord } from '../types/dashboard';
import { STATUS_CONFIG } from '../data/dashboardData';
import { ORANGE_RAW_RECORDS } from '../data/orangeSites';

interface SiteDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sites: SiteRecord[];
  activeStatusFilter?: string;
  onEditSite?: (siteCode: string) => void;
  onAddNewSite?: () => void;
  onDeleteSite?: (site: SiteRecord) => Promise<boolean | void> | void;
}

export const SiteDetailsModal: React.FC<SiteDetailsModalProps> = ({
  isOpen,
  onClose,
  sites,
  activeStatusFilter,
  onEditSite,
  onAddNewSite,
  onDeleteSite,
}) => {
  const { user, canEditRecord } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [siteToDelete, setSiteToDelete] = useState<SiteRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedOrangeCode, setExpandedOrangeCode] = useState<string | null>(null);
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

  if (!isOpen) return null;

  const filteredSites = authorizedSites.filter((site) => {
    const q = searchTerm.toLowerCase();
    return (
      site.siteCode.toLowerCase().includes(q) ||
      site.siteName.toLowerCase().includes(q) ||
      site.central.toLowerCase().includes(q) ||
      site.sector.toLowerCase().includes(q) ||
      site.company.toLowerCase().includes(q) ||
      site.status.toLowerCase().includes(q) ||
      (site.notes && site.notes.toLowerCase().includes(q)) ||
      (site.obstacleReason && site.obstacleReason.toLowerCase().includes(q)) ||
      (site.civilContractor && site.civilContractor.toLowerCase().includes(q))
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
                    {activeStatusFilter}
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

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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

        {/* Modal Table Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">كود الموقع</th>
                  <th className="py-2.5 px-3">اسم الموقع / السنترال</th>
                  <th className="py-2.5 px-3">الشركة</th>
                  <th className="py-2.5 px-3">موقف العام</th>
                  <th className="py-2.5 px-3 text-center">الروابط</th>
                  <th className="py-2.5 px-3">القطاع</th>
                  <th className="py-2.5 px-3">التاريخ المستهدف</th>
                  <th className="py-2.5 px-3">المقاول / التعذر</th>
                  <th className="py-2.5 px-3 min-w-[200px]">الملاحظات (Notes)</th>
                  <th className="py-2.5 px-3 text-center min-w-[140px] bg-slate-200/60">إجراءات التحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedSites.map((site) => {
                  const cfg = STATUS_CONFIG[site.status] || {
                    color: '#64748b',
                    bgLight: '#f1f5f9',
                    border: '#cbd5e1',
                    textColor: '#334155',
                  };

                  return (
                    <React.Fragment key={site.id}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-sky-800">
                          <div>{site.siteCode}</div>
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
                          {site.expectedDate}
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
                        <td className="py-2.5 px-3 text-center bg-slate-50/50">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* 1. زر تعديل البيانات */}
                            <button
                              type="button"
                              onClick={() => {
                                if (onEditSite) {
                                  onClose();
                                  onEditSite(site.siteCode);
                                }
                              }}
                              className="px-2.5 py-1 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-300 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              title={`تعديل بيانات الموقع ${site.siteCode}`}
                            >
                              <Edit3 className="w-3 h-3 text-amber-600" />
                              <span>تعديل</span>
                            </button>

                            {/* 2. زر إلغاء أو حذف موقع */}
                            <button
                              type="button"
                              onClick={() => {
                                setSiteToDelete(site);
                              }}
                              className="px-2.5 py-1 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-300 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              title={`إلغاء أو حذف الموقع ${site.siteCode}`}
                            >
                              <Trash2 className="w-3 h-3 text-rose-600" />
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
                            <td colSpan={10} className="p-4 text-xs">
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
                    </React.Fragment>
                  );
                })}

                {pagedSites.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-slate-400">
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
