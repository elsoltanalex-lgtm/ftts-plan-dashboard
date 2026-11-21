// src/components/VodafoneDataAnalysisModal.tsx
// Comprehensive Executive Analytics Modal for Vodafone Network (FTTS Rollout)
// Matches WE Analysis and Orange Analysis layout, features, and responsive design

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { SiteRecord, FilterState, StatusSummary } from '../types/dashboard';
import { calculateStatusSummaries, STATUS_CONFIG, getSiteClassification } from '../data/dashboardData';
import { isRecordInSector } from '../utils/sectorPermissions';
import { toFilterArray } from '../utils/filterUtils';
import {
  X,
  BarChart3,
  Building2,
  FileText,
  Zap,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Layers,
  Search,
  RotateCcw,
  MapPin,
  Briefcase,
  Tag,
  AlertCircle,
  Download,
  ChevronLeft,
  ChevronRight,
  Edit3,
  PieChart,
} from 'lucide-react';

export interface VodafoneDataAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  vodafoneSites: SiteRecord[];
  activeFilters?: FilterState;
  onEditSite?: (siteCode: string) => void;
}

export const VodafoneDataAnalysisModal: React.FC<VodafoneDataAnalysisModalProps> = ({
  isOpen,
  onClose,
  vodafoneSites,
  activeFilters,
  onEditSite,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sectors' | 'obstacles' | 'drilldown'>('overview');

  // Multi-level cascading filter states inside the analysis modal
  const [selectedSector, setSelectedSector] = useState<string>('All');
  const [selectedGeneralAdmin, setSelectedGeneralAdmin] = useState<string>('All');
  const [selectedCompetentAdmin, setSelectedCompetentAdmin] = useState<string>('All');
  const [selectedClassification, setSelectedClassification] = useState<string>('All');
  const [selectedObstacle, setSelectedObstacle] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination for drilldown table
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Initialize filters when opened from dashboard with active filters
  useEffect(() => {
    if (isOpen && activeFilters) {
      const activeSectors = toFilterArray(activeFilters.sector);
      if (activeSectors.length === 1) setSelectedSector(activeSectors[0]);
      else setSelectedSector('All');

      const activeGAs = toFilterArray(activeFilters.generalAdmin);
      if (activeGAs.length === 1) setSelectedGeneralAdmin(activeGAs[0]);
      else setSelectedGeneralAdmin('All');

      const activeCAs = toFilterArray(activeFilters.competentAdmin);
      if (activeCAs.length === 1) setSelectedCompetentAdmin(activeCAs[0]);
      else setSelectedCompetentAdmin('All');

      const activeCls = toFilterArray(activeFilters.classification);
      if (activeCls.length === 1) setSelectedClassification(activeCls[0]);
      else setSelectedClassification('All');

      const activeObs = toFilterArray(activeFilters.obstacleReason);
      if (activeObs.length === 1) setSelectedObstacle(activeObs[0]);
      else setSelectedObstacle('All');
    }
  }, [isOpen, activeFilters]);

  // Reset all filters inside modal
  const handleResetFilters = useCallback(() => {
    setSelectedSector('All');
    setSelectedGeneralAdmin('All');
    setSelectedCompetentAdmin('All');
    setSelectedClassification('All');
    setSelectedObstacle('All');
    setSearchQuery('');
    setCurrentPage(1);
  }, []);

  // Cascading options derived strictly from vodafoneSites
  const availableSectors = useMemo(() => {
    const set = new Set<string>();
    vodafoneSites.forEach((s) => {
      const sec = String(s.sector || s.rawRecord?.['رئاسة قطاعات التنفيذ'] || '').trim();
      if (sec) set.add(sec);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [vodafoneSites]);

  // Scoped by Sector
  const sectorScopedSites = useMemo(() => {
    if (selectedSector === 'All') return vodafoneSites;
    return vodafoneSites.filter((s) => {
      const sec = String(s.sector || s.rawRecord?.['رئاسة قطاعات التنفيذ'] || '').trim();
      return sec === selectedSector || isRecordInSector(selectedSector, s);
    });
  }, [vodafoneSites, selectedSector]);

  const availableGeneralAdmins = useMemo(() => {
    const set = new Set<string>();
    sectorScopedSites.forEach((s) => {
      const ga = String(s.generalAdmin || s.rawRecord?.['الادارة العامة لتنفيذ الشبكات'] || s.rawRecord?.['الادارة العامة للمنطقة'] || '').trim();
      if (ga) set.add(ga);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [sectorScopedSites]);

  // Scoped by General Admin
  const gaScopedSites = useMemo(() => {
    if (selectedGeneralAdmin === 'All') return sectorScopedSites;
    return sectorScopedSites.filter((s) => {
      const ga = String(s.generalAdmin || s.rawRecord?.['الادارة العامة لتنفيذ الشبكات'] || s.rawRecord?.['الادارة العامة للمنطقة'] || '').trim();
      return ga === selectedGeneralAdmin;
    });
  }, [sectorScopedSites, selectedGeneralAdmin]);

  const availableCompetentAdmins = useMemo(() => {
    const set = new Set<string>();
    gaScopedSites.forEach((s) => {
      const ca = String(s.competentAdmin || s.rawRecord?.['ادارة التنفيذ الفرعية'] || '').trim();
      if (ca) set.add(ca);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [gaScopedSites]);

  // Scoped by Competent Admin
  const caScopedSites = useMemo(() => {
    if (selectedCompetentAdmin === 'All') return gaScopedSites;
    return gaScopedSites.filter((s) => {
      const ca = String(s.competentAdmin || s.rawRecord?.['ادارة التنفيذ الفرعية'] || '').trim();
      return ca === selectedCompetentAdmin;
    });
  }, [gaScopedSites, selectedCompetentAdmin]);

  const availableClassifications = useMemo(() => {
    const set = new Set<string>();
    caScopedSites.forEach((s) => {
      const cat = getSiteClassification(s);
      if (cat && cat !== 'غير محدد') set.add(cat);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [caScopedSites]);

  // Scoped by Classification
  const clsScopedSites = useMemo(() => {
    if (selectedClassification === 'All') return caScopedSites;
    return caScopedSites.filter((s) => {
      const cat = getSiteClassification(s);
      const raw = String(s.classification || s.rawRecord?.['التصنيف'] || '').trim();
      return cat === selectedClassification || raw === selectedClassification;
    });
  }, [caScopedSites, selectedClassification]);

  const availableObstacles = useMemo(() => {
    const set = new Set<string>();
    clsScopedSites.forEach((s) => {
      const obs = String(s.obstacleReason || s.rawRecord?.['اسباب التعّذر'] || s.rawRecord?.['اسباب التعذر'] || s.rawRecord?.['الملاحظات'] || '').trim();
      if (obs && obs !== 'لا يوجد تعذر' && obs !== 'لا يوجد') set.add(obs);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [clsScopedSites]);

  // Fully filtered dataset
  const filteredSites = useMemo(() => {
    let result = clsScopedSites;

    if (selectedObstacle !== 'All') {
      result = result.filter((s) => {
        const obs = String(s.obstacleReason || s.rawRecord?.['اسباب التعّذر'] || s.rawRecord?.['اسباب التعذر'] || s.rawRecord?.['الملاحظات'] || '').trim();
        return obs === selectedObstacle;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((s) => {
        const code = String(s.siteCode || '').toLowerCase();
        const central = String(s.central || '').toLowerCase();
        const gov = String(s.governorate || '').toLowerCase();
        const notes = String(s.notes || '').toLowerCase();
        return code.includes(q) || central.includes(q) || gov.includes(q) || notes.includes(q);
      });
    }

    return result;
  }, [clsScopedSites, selectedObstacle, searchQuery]);

  // Status Summaries for Charts and Tables
  const statusSummaries = useMemo<StatusSummary[]>(() => {
    return calculateStatusSummaries(filteredSites);
  }, [filteredSites]);

  // KPI Statistics
  const stats = useMemo(() => {
    const totalSites = filteredSites.length;
    const totalLinks = filteredSites.reduce((sum, s) => sum + (s.linksCount || 1), 0);

    const completedSites = filteredSites.filter((s) => {
      const cat = getSiteClassification(s);
      const raw = String(s.classification || s.rawRecord?.['التصنيف'] || '').trim();
      return cat === 'تم التسليم' || cat === 'تم الانتهاء' || raw.includes('تسليم') || raw.includes('انتهاء');
    }).length;

    const inProgressSites = filteredSites.filter((s) => {
      const cat = getSiteClassification(s);
      return cat === 'جاري العمل مدني' || cat === 'جاري العمل كهربى' || cat === 'جاري مدني' || cat === 'جاري كهربي';
    }).length;

    const permitsSites = filteredSites.filter((s) => {
      const cat = getSiteClassification(s);
      return cat === 'جاري تصاريح';
    }).length;

    const surveySites = filteredSites.filter((s) => {
      const cat = getSiteClassification(s);
      return cat === 'جاري المعاينة';
    }).length;

    const blockedSites = filteredSites.filter((s) => {
      const cat = getSiteClassification(s);
      return cat === 'معوقات' || cat === 'متعثرات' || cat === 'متعذر';
    }).length;

    const deliveredAreaSites = filteredSites.filter((s) => {
      const area = String(s.deliveryArea || s.rawRecord?.['تاكيد التسليم للمنطقه'] || '').trim();
      return area === 'تم التسليم' || area.includes('تسليم');
    }).length;

    const completionRate = totalSites > 0 ? ((completedSites / totalSites) * 100).toFixed(1) : '0';

    return {
      totalSites,
      totalLinks,
      completedSites,
      inProgressSites,
      permitsSites,
      surveySites,
      blockedSites,
      deliveredAreaSites,
      completionRate,
    };
  }, [filteredSites]);

  // Sector Breakdown Data for Tab 2
  const sectorBreakdown = useMemo(() => {
    const map = new Map<string, {
      sector: string;
      total: number;
      completed: number;
      inProgress: number;
      permits: number;
      survey: number;
      blocked: number;
      delivered: number;
    }>();

    filteredSites.forEach((s) => {
      const sec = String(s.sector || s.rawRecord?.['رئاسة قطاعات التنفيذ'] || 'غير محدد').trim();
      if (!map.has(sec)) {
        map.set(sec, {
          sector: sec,
          total: 0,
          completed: 0,
          inProgress: 0,
          permits: 0,
          survey: 0,
          blocked: 0,
          delivered: 0,
        });
      }
      const entry = map.get(sec)!;
      entry.total += 1;

      const cat = getSiteClassification(s);
      const raw = String(s.classification || s.rawRecord?.['التصنيف'] || '').trim();

      if (cat === 'تم التسليم' || cat === 'تم الانتهاء' || raw.includes('تسليم')) {
        entry.completed += 1;
      } else if (cat === 'جاري تصاريح') {
        entry.permits += 1;
      } else if (cat === 'جاري المعاينة') {
        entry.survey += 1;
      } else if (cat === 'معوقات' || cat === 'متعثرات' || cat === 'متعذر') {
        entry.blocked += 1;
      } else {
        entry.inProgress += 1;
      }

      const area = String(s.deliveryArea || s.rawRecord?.['تاكيد التسليم للمنطقه'] || '').trim();
      if (area === 'تم التسليم' || area.includes('تسليم')) {
        entry.delivered += 1;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredSites]);

  // Obstacle Breakdown Data for Tab 3
  const obstacleBreakdown = useMemo(() => {
    const map = new Map<string, { reason: string; count: number; sectors: Set<string>; centrals: Set<string> }>();

    filteredSites.forEach((s) => {
      const obs = String(s.obstacleReason || s.rawRecord?.['اسباب التعّذر'] || s.rawRecord?.['اسباب التعذر'] || s.rawRecord?.['الملاحظات'] || '').trim();
      if (!obs || obs === 'لا يوجد تعذر' || obs === 'لا يوجد') return;

      if (!map.has(obs)) {
        map.set(obs, { reason: obs, count: 0, sectors: new Set(), centrals: new Set() });
      }
      const entry = map.get(obs)!;
      entry.count += 1;
      if (s.sector) entry.sectors.add(s.sector);
      if (s.central) entry.centrals.add(s.central);
    });

    return Array.from(map.values())
      .map((e) => ({
        reason: e.reason,
        count: e.count,
        percentage: filteredSites.length > 0 ? ((e.count / filteredSites.length) * 100).toFixed(1) : '0',
        sectorCount: e.sectors.size,
        centralCount: e.centrals.size,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredSites]);

  // Paged Sites for Drilldown Tab 4
  const totalPages = Math.max(1, Math.ceil(filteredSites.length / pageSize));
  const pagedSites = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSites.slice(start, start + pageSize);
  }, [filteredSites, currentPage, pageSize]);

  // Export to CSV helper
  const handleExportCsv = () => {
    const headers = [
      'كود الموقع',
      'السنترال',
      'المحافظة',
      'القطاع',
      'الإدارة العامة',
      'إدارة التنفيذ',
      'التصنيف',
      'أسباب التعثر',
      'تأكيد تسليم المنطقة',
      'التاريخ المتوقع',
    ];

    const rows = filteredSites.map((s) => [
      `"${s.siteCode}"`,
      `"${s.central || ''}"`,
      `"${s.governorate || ''}"`,
      `"${s.sector || ''}"`,
      `"${s.generalAdmin || ''}"`,
      `"${s.competentAdmin || ''}"`,
      `"${s.classification || ''}"`,
      `"${(s.obstacleReason || '').replace(/"/g, '""')}"`,
      `"${s.deliveryArea || ''}"`,
      `"${s.expectedDate || ''}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Vodafone_Analysis_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasActiveFilters =
    selectedSector !== 'All' ||
    selectedGeneralAdmin !== 'All' ||
    selectedCompetentAdmin !== 'All' ||
    selectedClassification !== 'All' ||
    selectedObstacle !== 'All' ||
    searchQuery.trim().length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl xl:max-w-7xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Sticky Header with Vodafone Crimson Brand Styling */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs shadow-xs">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>التحليل الإحصائي والتوزيع المتقدم لشبكة Vodafone</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 text-white font-mono font-bold">
                  {stats.totalSites} موقع • {stats.totalLinks} لينك
                </span>
              </h2>
              <p className="text-xs text-rose-100 font-medium">
                تصفية تفاعلية هرمية وتحليل لمسارات الربط التراسلي ومواقف التنفيذ بالقطاعات والإدارات والسنترالات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition cursor-pointer border border-white/20"
              title="تصدير النتائج كملف CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/20 text-white transition cursor-pointer border border-white/20"
              title="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Cascading Filter Bar */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 shrink-0 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {/* 1. القطاع */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-red-600" />
                <span>القطاع</span>
              </label>
              <select
                value={selectedSector}
                onChange={(e) => {
                  setSelectedSector(e.target.value);
                  setSelectedGeneralAdmin('All');
                  setSelectedCompetentAdmin('All');
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
              >
                <option value="All">كافة القطاعات ({vodafoneSites.length})</option>
                {availableSectors.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. الإدارة العامة */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-red-600" />
                <span>الإدارة العامة</span>
              </label>
              <select
                value={selectedGeneralAdmin}
                onChange={(e) => {
                  setSelectedGeneralAdmin(e.target.value);
                  setSelectedCompetentAdmin('All');
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
              >
                <option value="All">كافة الإدارات العامة</option>
                {availableGeneralAdmins.map((ga) => (
                  <option key={ga} value={ga}>
                    {ga}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. إدارة التنفيذ المختصة */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-red-600" />
                <span>إدارة التنفيذ</span>
              </label>
              <select
                value={selectedCompetentAdmin}
                onChange={(e) => {
                  setSelectedCompetentAdmin(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
              >
                <option value="All">كافة إدارات التنفيذ</option>
                {availableCompetentAdmins.map((ca) => (
                  <option key={ca} value={ca}>
                    {ca}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. التصنيف */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-red-600" />
                <span>التصنيف</span>
              </label>
              <select
                value={selectedClassification}
                onChange={(e) => {
                  setSelectedClassification(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
              >
                <option value="All">كافة التصنيفات</option>
                {availableClassifications.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. أسباب التعثر */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-red-600" />
                <span>أسباب التعثر</span>
              </label>
              <select
                value={selectedObstacle}
                onChange={(e) => {
                  setSelectedObstacle(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
              >
                <option value="All">كافة أسباب التعثر</option>
                {availableObstacles.map((obs) => (
                  <option key={obs} value={obs}>
                    {obs}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. بحث سريع وإعادة تعيين */}
            <div className="flex items-end gap-1.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute inset-y-0 right-2.5 my-auto text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="كود أو سنترال..."
                  className="w-full pr-8 pl-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition cursor-pointer"
                  title="إلغاء وتصفير الفلاتر"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 p-3 bg-slate-100/70 border-b border-slate-200 text-xs shrink-0">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-slate-500 block text-[11px] font-bold">إجمالي المواقع واللينكات</span>
            <span className="text-base font-black text-slate-800 font-mono">
              {stats.totalSites} <span className="text-xs font-normal text-slate-400">({stats.totalLinks} L)</span>
            </span>
          </div>

          <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
            <span className="text-emerald-700 block text-[11px] font-bold">تم التسليم والانتهاء</span>
            <span className="text-base font-black text-emerald-800 font-mono">
              {stats.completedSites} <span className="text-xs font-semibold text-emerald-600">({stats.completionRate}%)</span>
            </span>
          </div>

          <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200 shadow-2xs">
            <span className="text-blue-700 block text-[11px] font-bold">جاري العمل (تنفيذ)</span>
            <span className="text-base font-black text-blue-800 font-mono">{stats.inProgressSites}</span>
          </div>

          <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 shadow-2xs">
            <span className="text-amber-700 block text-[11px] font-bold">جاري تصاريح</span>
            <span className="text-base font-black text-amber-800 font-mono">{stats.permitsSites}</span>
          </div>

          <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-200 shadow-2xs">
            <span className="text-indigo-700 block text-[11px] font-bold">جاري المعاينة</span>
            <span className="text-base font-black text-indigo-800 font-mono">{stats.surveySites}</span>
          </div>

          <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200 shadow-2xs">
            <span className="text-rose-700 block text-[11px] font-bold">معوقات ومتعثرات</span>
            <span className="text-base font-black text-rose-800 font-mono">{stats.blockedSites}</span>
          </div>

          <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200 shadow-2xs">
            <span className="text-purple-700 block text-[11px] font-bold">تسليم المنطقة</span>
            <span className="text-base font-black text-purple-800 font-mono">{stats.deliveredAreaSites}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-4 pt-3 border-b border-slate-200 bg-white shrink-0 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>1. الموقف التنفيذي والتصنيف</span>
          </button>

          <button
            onClick={() => setActiveTab('sectors')}
            className={`px-3.5 py-2 rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sectors'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>2. توزيع وأداء القطاعات والإدارات</span>
          </button>

          <button
            onClick={() => setActiveTab('obstacles')}
            className={`px-3.5 py-2 rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'obstacles'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>3. تحليل المعوقات وأسباب التعثر ({obstacleBreakdown.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('drilldown')}
            className={`px-3.5 py-2 rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'drilldown'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>4. سجل المواقع والبحث الميداني ({filteredSites.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50/40">
          {/* ── TAB 1: Overview & Distribution ── */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Summary Table */}
                <div className="lg:col-span-7 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="font-black text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-red-600" />
                      <span>جدول نسب التوزيع والموقف التنفيذي العام</span>
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">{filteredSites.length} موقع</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold">
                        <tr>
                          <th className="py-2.5 px-3">حالة وموقف التنفيذ</th>
                          <th className="py-2.5 px-3 text-center">المواقع</th>
                          <th className="py-2.5 px-3 text-center">اللينكات</th>
                          <th className="py-2.5 px-3 text-center">النسبة %</th>
                          <th className="py-2.5 px-3">مؤشر الإنجاز</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {statusSummaries.map((s) => (
                          <tr key={s.status} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-3 font-semibold text-slate-800 flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                              <span>{s.status}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">{s.sitesCount}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-500">{s.linksCount}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold" style={{ color: s.color }}>
                              {s.percentage.toFixed(1)}%
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(100, s.percentage)}%`, backgroundColor: s.color }}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Visual Distribution Cards */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <h3 className="font-black text-slate-800 text-xs sm:text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
                      <TrendingUp className="w-4 h-4 text-red-600" />
                      <span>مؤشرات المتابعة والإنجاز لشبكة Vodafone</span>
                    </h3>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <div className="flex justify-between text-slate-700 font-bold mb-1">
                          <span>نسبة المواقع المكتملة (تم الانتهاء والتسليم):</span>
                          <span className="font-mono text-emerald-700">{stats.completionRate}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${stats.completionRate}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 block text-[11px] font-bold">مواقع تسليم المنطقة</span>
                          <span className="font-mono font-black text-sm text-purple-700">{stats.deliveredAreaSites}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {stats.totalSites > 0 ? ((stats.deliveredAreaSites / stats.totalSites) * 100).toFixed(1) : 0}% من الإجمالي
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 block text-[11px] font-bold">مواقع تحت التصاريح</span>
                          <span className="font-mono font-black text-sm text-amber-700">{stats.permitsSites}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {stats.totalSites > 0 ? ((stats.permitsSites / stats.totalSites) * 100).toFixed(1) : 0}% من الإجمالي
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-rose-50/50 p-4 rounded-2xl border border-red-200 text-xs space-y-2">
                    <div className="flex items-center gap-2 text-red-900 font-bold">
                      <Zap className="w-4 h-4 text-red-600" />
                      <span>بيانات الربط التراسلي (Vodafone FTTS 2026)</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">
                      يتم تحديث ومزامنة بيانات مواقع فودافون تلقائياً مع قاعدة بيانات Supabase وشيتات الرفع المعتمدة لمتابعة تقدم خطة الربط التراسلي FTTS.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: Sectors Breakdown ── */}
          {activeTab === 'sectors' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <h3 className="font-black text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-red-600" />
                  <span>جدول مقارنة أداء وتوزيع قطاعات شبكة Vodafone</span>
                </h3>
                <span className="text-xs text-slate-500 font-semibold font-mono">
                  {sectorBreakdown.length} قطاعات مسجلة
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3.5">القطاع / رئاسة القطاعات</th>
                      <th className="py-3 px-3 text-center font-bold">إجمالي المواقع</th>
                      <th className="py-3 px-3 text-center bg-emerald-50 text-emerald-800 font-bold">مكتمل / تسليم</th>
                      <th className="py-3 px-3 text-center bg-blue-50 text-blue-800 font-bold">جاري التنفيذ</th>
                      <th className="py-3 px-3 text-center bg-amber-50 text-amber-800 font-bold">جاري تصاريح</th>
                      <th className="py-3 px-3 text-center bg-indigo-50 text-indigo-800 font-bold">جاري معاينة</th>
                      <th className="py-3 px-3 text-center bg-rose-50 text-rose-800 font-bold">معوقات وتعثر</th>
                      <th className="py-3 px-3 text-center bg-purple-50 text-purple-800 font-bold">تسليم المنطقة</th>
                      <th className="py-3 px-3.5 text-center min-w-[130px]">نسبة الإنجاز %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {sectorBreakdown.map((row) => {
                      const rate = row.total > 0 ? ((row.completed / row.total) * 100).toFixed(1) : '0';
                      return (
                        <tr key={row.sector} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3.5 font-sans font-bold text-slate-900">{row.sector}</td>
                          <td className="py-3 px-3 text-center font-bold text-slate-800">{row.total}</td>
                          <td className="py-3 px-3 text-center text-emerald-700 font-bold">{row.completed}</td>
                          <td className="py-3 px-3 text-center text-blue-700 font-bold">{row.inProgress}</td>
                          <td className="py-3 px-3 text-center text-amber-700 font-bold">{row.permits}</td>
                          <td className="py-3 px-3 text-center text-indigo-700 font-bold">{row.survey}</td>
                          <td className="py-3 px-3 text-center text-rose-700 font-bold">{row.blocked}</td>
                          <td className="py-3 px-3 text-center text-purple-700 font-bold">{row.delivered}</td>
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-800 min-w-[40px] text-left">{rate}%</span>
                              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${rate}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TAB 3: Obstacles Breakdown ── */}
          {activeTab === 'obstacles' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <h3 className="font-black text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>تفصيل المعوقات وأسباب التعثر المرصودة لمواقع Vodafone</span>
                </h3>
                <span className="text-xs text-slate-500 font-semibold font-mono">
                  {obstacleBreakdown.length} نوع معوق
                </span>
              </div>

              {obstacleBreakdown.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                  لا توجد معوقات أو أسباب تعثر مسجلة ضمن النطاق المختار حالياً.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3.5">سبب المعوق أو التعذر</th>
                        <th className="py-3 px-3 text-center font-bold">عدد المواقع المتأثرة</th>
                        <th className="py-3 px-3 text-center font-bold">النسبة من الإجمالي %</th>
                        <th className="py-3 px-3 text-center">القطاعات المتأثرة</th>
                        <th className="py-3 px-3 text-center">السنترالات المتأثرة</th>
                        <th className="py-3 px-3.5 text-center">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {obstacleBreakdown.map((obs) => (
                        <tr key={obs.reason} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3.5 font-bold text-slate-900">{obs.reason}</td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-rose-700">{obs.count}</td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">{obs.percentage}%</td>
                          <td className="py-3 px-3 text-center font-mono text-slate-600">{obs.sectorCount} قطاع</td>
                          <td className="py-3 px-3 text-center font-mono text-slate-600">{obs.centralCount} سنترال</td>
                          <td className="py-3 px-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedObstacle(obs.reason);
                                setActiveTab('drilldown');
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 transition cursor-pointer"
                            >
                              عرض المواقع ←
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 4: Detailed Drilldown Table ── */}
          {activeTab === 'drilldown' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-slate-800 text-xs sm:text-sm">
                    سجل المواقع التفصيلي المطابق للتصفية المطبقة
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold border border-slate-200">
                    {filteredSites.length} موقع
                  </span>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>تصفير الفلاتر</span>
                  </button>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">كود الموقع</th>
                        <th className="py-2.5 px-3">السنترال</th>
                        <th className="py-2.5 px-3">المحافظة</th>
                        <th className="py-2.5 px-3">القطاع</th>
                        <th className="py-2.5 px-3">الإدارة العامة</th>
                        <th className="py-2.5 px-3">إدارة التنفيذ</th>
                        <th className="py-2.5 px-3">التصنيف</th>
                        <th className="py-2.5 px-3">أسباب التعثر</th>
                        <th className="py-2.5 px-3 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagedSites.map((site) => {
                        const cfg = STATUS_CONFIG[site.status] || {
                          bgLight: '#f1f5f9',
                          textColor: '#334155',
                          border: '#cbd5e1',
                        };
                        return (
                          <tr key={site.id || site.siteCode} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-3 font-mono font-bold text-red-700">{site.siteCode}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">{site.central || 'غير محدد'}</td>
                            <td className="py-2.5 px-3 text-slate-600">{site.governorate || '-'}</td>
                            <td className="py-2.5 px-3 text-slate-700 font-medium">{site.sector || '-'}</td>
                            <td className="py-2.5 px-3 text-slate-600">{site.generalAdmin || '-'}</td>
                            <td className="py-2.5 px-3 text-slate-600">{site.competentAdmin || '-'}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border"
                                style={{
                                  backgroundColor: cfg.bgLight,
                                  color: cfg.textColor,
                                  borderColor: cfg.border,
                                }}
                              >
                                {site.classification || site.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={site.obstacleReason}>
                              {site.obstacleReason || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {onEditSite && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onEditSite(site.siteCode);
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition flex items-center gap-1 mx-auto shadow-2xs cursor-pointer"
                                  title="تعديل بيانات الموقع"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>تعديل</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {pagedSites.length === 0 && (
                        <tr>
                          <td colSpan={9} className="text-center py-8 text-slate-400">
                            لا توجد مواقع مطابقة للبحث أو التصفية المختارة.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">
                      عرض الصفحة <strong className="font-mono text-slate-800">{currentPage}</strong> من{' '}
                      <strong className="font-mono text-slate-800">{totalPages}</strong> ({filteredSites.length} موقع)
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          currentPage <= 1
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          currentPage >= totalPages
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            منظومة متابعة المشروعات القومية للاتصالات • لوحة تحكم وتحليل شبكة Vodafone FTTS
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
