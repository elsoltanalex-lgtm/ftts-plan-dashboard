// src/components/WeExecutiveReportView.tsx
// Upgraded Executive Detailed Rollout Status Report (العرض التنفيذي التفصيلي المطور 100% مطابق للصورة والتقرير المعتمد)
// Features:
// 1. Exact executive top indicator boxes (Target, Achieved, Delivered w/ Cert, Region Executed, Without Cert, In Progress, Permits, Stalled/Obstacles)
// 2. Exact organization level tabs (رئاسة القطاعات | الإدارات العامة | الإدارات المتخصصة | العرض الهرمي الشامل)
// 3. Exact row layout with prominent achievement % on the right (e.g. 56.1%) and wide bicolor/multi-segment color bars with detailed numbers inscribed INSIDE the segments
// 4. Sequential Hierarchical Drill-Down (Sector -> General Administration -> Competent Admin / Area -> Site Details)
// 5. Grand Total bottom summary row and export/print features

import React, { useState, useMemo } from 'react';
import type { SiteRecord } from '../types/dashboard';
import { getSiteClassification } from '../data/dashboardData';
import {
  Target,
  CheckCircle2,
  Award,
  Clock,
  FileCheck,
  AlertOctagon,
  ChevronDown,
  ChevronRight,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  RotateCcw,
  Search,
  Filter,
  Eye,
  ShieldAlert,
  Building2,
  Building,
  Layers,
  Sparkles,
  BarChart3,
  Check,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

export interface WeExecutiveReportViewProps {
  sites: SiteRecord[];
  onSelectSector?: (sector: string) => void;
  onOpenDetailsModal?: (status?: string, sector?: string) => void;
  selectedSector?: string;
}

export type ExecutiveCategoryKey =
  | 'all'
  | 'achieved'
  | 'delivered_with_cert'
  | 'executed_by_region'
  | 'executed_without_cert'
  | 'in_progress'
  | 'permits'
  | 'blocked';

export type OrganizationalTabKey = 'sectors' | 'generalAdmins' | 'specializedAdmins' | 'hierarchicalTree';

/**
 * Color and styling dictionary for each executive status
 */
export const EXECUTIVE_STATUS_THEMES: Record<
  ExecutiveCategoryKey,
  {
    titleAr: string;
    titleEn: string;
    hex: string;
    barColor: string;
    bgBadge: string;
    textBadge: string;
    borderBadge: string;
    cardBg: string;
    cardBorder: string;
    icon: React.ElementType;
    desc: string;
  }
> = {
  all: {
    titleAr: 'كافة التصنيفات',
    titleEn: 'All Categories',
    hex: '#1e293b',
    barColor: 'bg-slate-700',
    bgBadge: 'bg-slate-100',
    textBadge: 'text-slate-800',
    borderBadge: 'border-slate-300',
    cardBg: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900',
    cardBorder: 'border-slate-700',
    icon: Layers,
    desc: 'إجمالي المشروعات والمواقع المستهدفة',
  },
  achieved: {
    titleAr: 'المحقق الإجمالي',
    titleEn: 'Total Achieved',
    hex: '#059669',
    barColor: 'bg-emerald-600',
    bgBadge: 'bg-emerald-100',
    textBadge: 'text-emerald-900',
    borderBadge: 'border-emerald-300',
    cardBg: 'bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950',
    cardBorder: 'border-emerald-500/50',
    icon: CheckCircle2,
    desc: 'مجموع المنفذ بشهادة وبدون شهادة وطرف المنطقة',
  },
  delivered_with_cert: {
    titleAr: 'مسلّم بشهادة PAT',
    titleEn: 'Delivered w/ Cert',
    hex: '#16a34a',
    barColor: 'bg-green-600',
    bgBadge: 'bg-green-100',
    textBadge: 'text-green-900',
    borderBadge: 'border-green-300',
    cardBg: 'bg-gradient-to-br from-green-950 via-emerald-900 to-slate-900',
    cardBorder: 'border-green-500/50',
    icon: Award,
    desc: 'تم تسليم الموقع رسمياً واعتماد شهادة PAT',
  },
  executed_by_region: {
    titleAr: 'منفذ طرف المنطقة',
    titleEn: 'Executed by Region',
    hex: '#0d9488',
    barColor: 'bg-teal-600',
    bgBadge: 'bg-teal-100',
    textBadge: 'text-teal-900',
    borderBadge: 'border-teal-300',
    cardBg: 'bg-gradient-to-br from-teal-950 via-teal-900 to-slate-900',
    cardBorder: 'border-teal-500/50',
    icon: Building,
    desc: 'منتهي طرف المنطقة وفي انتظار التسليم النهائي',
  },
  executed_without_cert: {
    titleAr: 'منفذ بدون شهادة',
    titleEn: 'Without Certificate',
    hex: '#0284c7',
    barColor: 'bg-sky-600',
    bgBadge: 'bg-sky-100',
    textBadge: 'text-sky-900',
    borderBadge: 'border-sky-300',
    cardBg: 'bg-gradient-to-br from-sky-950 via-blue-900 to-slate-900',
    cardBorder: 'border-sky-500/50',
    icon: FileCheck,
    desc: 'تشغيل فايبر تجاري مفعل قبل صدور الشهادة',
  },
  in_progress: {
    titleAr: 'جاري العمل',
    titleEn: 'In Progress',
    hex: '#f59e0b',
    barColor: 'bg-amber-500',
    bgBadge: 'bg-amber-100',
    textBadge: 'text-amber-900',
    borderBadge: 'border-amber-300',
    cardBg: 'bg-gradient-to-br from-amber-950 via-amber-900 to-slate-900',
    cardBorder: 'border-amber-500/50',
    icon: Clock,
    desc: 'أعمال مدنية، مد كوابل، سحب فايبر ولحام',
  },
  permits: {
    titleAr: 'جاري التصاريح',
    titleEn: 'Permits in Progress',
    hex: '#ea580c',
    barColor: 'bg-orange-600',
    bgBadge: 'bg-orange-100',
    textBadge: 'text-orange-900',
    borderBadge: 'border-orange-300',
    cardBg: 'bg-gradient-to-br from-orange-950 via-orange-900 to-slate-900',
    cardBorder: 'border-orange-500/50',
    icon: AlertOctagon,
    desc: 'بانتظار استخراج تصاريح الحفر وهيئات الطرق',
  },
  blocked: {
    titleAr: 'المتعذرات والمعوقات',
    titleEn: 'Stalled / Obstacles',
    hex: '#dc2626',
    barColor: 'bg-red-600',
    bgBadge: 'bg-rose-100',
    textBadge: 'text-rose-900',
    borderBadge: 'border-rose-400',
    cardBg: 'bg-gradient-to-br from-rose-950 via-rose-900 to-slate-900',
    cardBorder: 'border-rose-500/60',
    icon: ShieldAlert,
    desc: 'مواقع متوقفة بسبب معوقات ميدانية أو تعذر',
  },
};

/**
 * Classifies a site into one of the precision executive categories
 * strictly based on the actual Excel classification
 */
export function classifyExecutiveSite(site: SiteRecord): ExecutiveCategoryKey {
  const c = getSiteClassification(site).toLowerCase();
  const n = String(site.notes || '').toLowerCase();
  const s = String(site.status || '').toLowerCase();
  const full = `${c} ${s} ${n}`;

  // 1. مسلّم بشهادة PAT
  if (
    full.includes('مسلم بشهاد') ||
    full.includes('شهادة pat') ||
    full.includes('شهاده pat') ||
    full.includes('pat') ||
    c === 'تم التسليم' ||
    c === 'تم الانتهاء والتسليم' ||
    c === 'تم الانتهاء'
  ) {
    return 'delivered_with_cert';
  }

  // 2. منفذ طرف المنطقة
  if (
    full.includes('طرف المنطق') ||
    full.includes('منتهي طرف') ||
    full.includes('تسليم المنطق')
  ) {
    return 'executed_by_region';
  }

  // 3. منفذ بدون شهادة (سحب فايبر / تشغيل تجاري)
  if (
    c.includes('تشغيل') ||
    c.includes('فيبر') ||
    c.includes('فايبر') ||
    c.includes('on air') ||
    full.includes('بدون شهاد') ||
    full.includes('سحب فايبر')
  ) {
    return 'executed_without_cert';
  }

  // 4. المتعذرات والمعوقات (الحمراء)
  if (
    c.includes('معوق') ||
    c.includes('متعذر') ||
    c.includes('تعذر') ||
    c.includes('متعثر') ||
    c.includes('رفض')
  ) {
    return 'blocked';
  }

  // 5. جاري التصاريح
  if (c.includes('تصاريح') || c.includes('تصريح')) {
    return 'permits';
  }

  // 6. جاري العمل
  return 'in_progress';
}

export interface ExecutiveRowMetrics {
  id: string;
  name: string;
  parentName?: string;
  typeLevel: 'sector' | 'generalAdmin' | 'specializedAdmin';
  target: number;
  withCert: number;
  byRegion: number;
  noCert: number;
  executed: number;
  achievementRate: number;
  inProgress: number;
  permits: number;
  blocked: number;
  remaining: number;
  inProgressRate: number;
  permitsRate: number;
  blockedRate: number;
  sites: SiteRecord[];
}

export interface AdminRowMetrics extends ExecutiveRowMetrics {
  competentAdmins: ExecutiveRowMetrics[];
}

export interface SectorRowMetrics extends ExecutiveRowMetrics {
  sector: string;
  administrations: AdminRowMetrics[];
}

export const WeExecutiveReportView: React.FC<WeExecutiveReportViewProps> = ({
  sites,
  onSelectSector,
  onOpenDetailsModal,
  selectedSector,
}) => {
  // Navigation & View Mode State:
  // 'sectors': View by Main Sectors (رئاسة القطاعات)
  // 'generalAdmins': View by General Administrations (الإدارات العامة لتنفيذ الشبكات)
  // 'specializedAdmins': View by Specialized / Competent Administrations (الإدارات المتخصصة)
  // 'hierarchicalTree': Full 3-Tier Expandable Hierarchical Tree (العرض الهرمي الشامل)
  const [activeTab, setActiveTab] = useState<OrganizationalTabKey>('generalAdmins');

  // Hierarchical Drill-down States:
  const [drilledSector, setDrilledSector] = useState<string | null>(null);
  const [drilledCategory, setDrilledCategory] = useState<ExecutiveCategoryKey>('all');
  const [expandedSectors, setExpandedSectors] = useState<Record<string, boolean>>({
    'اسكندرية والساحل': true,
    'المنطقة الشرقية': true,
  });
  const [expandedAdmins, setExpandedAdmins] = useState<Record<string, boolean>>({});
  const [tableSearch, setTableSearch] = useState('');

  // Synchronize when external sector filter changes
  React.useEffect(() => {
    if (selectedSector && selectedSector !== 'All' && selectedSector !== 'ALL') {
      setDrilledSector(selectedSector);
      setExpandedSectors((prev) => ({ ...prev, [selectedSector]: true }));
    }
  }, [selectedSector]);

  // Toggle Sector Accordion
  const toggleSector = (secName: string) => {
    setExpandedSectors((prev) => ({
      ...prev,
      [secName]: !prev[secName],
    }));
  };

  // Toggle Administration Accordion
  const toggleAdmin = (adminKey: string) => {
    setExpandedAdmins((prev) => ({
      ...prev,
      [adminKey]: !prev[adminKey],
    }));
  };

  // Set or Toggle Category Drill-Down
  const handleCategoryDrillDown = (secName: string, catKey: ExecutiveCategoryKey) => {
    if (drilledSector === secName && drilledCategory === catKey) {
      setDrilledCategory('all');
    } else {
      setDrilledSector(secName);
      setDrilledCategory(catKey);
      setExpandedSectors((prev) => ({ ...prev, [secName]: true }));
    }
  };

  // Reset drill-down
  const handleResetDrillDown = () => {
    setDrilledSector(null);
    setDrilledCategory('all');
    if (onSelectSector) onSelectSector('');
  };

  // Compute Full 3-Tier Hierarchy: Sectors -> General Admins -> Competent Admins
  const { sectorMetricsList, allGeneralAdmins, allSpecializedAdmins } = useMemo(() => {
    const sectorMap = new Map<
      string,
      {
        sites: SiteRecord[];
        adminMap: Map<string, { sites: SiteRecord[]; compMap: Map<string, SiteRecord[]> }>;
      }
    >();

    sites.forEach((site) => {
      const sec = (site.sector || 'قطاع عام').trim();
      const admin = (site.generalAdmin || 'الإدارة العامة المختصة').trim();
      const comp = (site.competentAdmin || 'إدارة التنفيذ المختصة').trim();

      if (!sectorMap.has(sec)) {
        sectorMap.set(sec, { sites: [], adminMap: new Map() });
      }
      const secObj = sectorMap.get(sec)!;
      secObj.sites.push(site);

      if (!secObj.adminMap.has(admin)) {
        secObj.adminMap.set(admin, { sites: [], compMap: new Map() });
      }
      const admObj = secObj.adminMap.get(admin)!;
      admObj.sites.push(site);

      if (!admObj.compMap.has(comp)) {
        admObj.compMap.set(comp, []);
      }
      admObj.compMap.get(comp)!.push(site);
    });

    const computeRow = (
      id: string,
      rowName: string,
      typeLevel: 'sector' | 'generalAdmin' | 'specializedAdmin',
      rowSites: SiteRecord[],
      parentName?: string
    ): ExecutiveRowMetrics => {
      let withCert = 0;
      let byRegion = 0;
      let noCert = 0;
      let inProgress = 0;
      let permits = 0;
      let blocked = 0;

      rowSites.forEach((s) => {
        const cat = classifyExecutiveSite(s);
        if (cat === 'delivered_with_cert') withCert++;
        else if (cat === 'executed_by_region') byRegion++;
        else if (cat === 'executed_without_cert') noCert++;
        else if (cat === 'in_progress') inProgress++;
        else if (cat === 'permits') permits++;
        else if (cat === 'blocked') blocked++;
        else inProgress++;
      });

      const target = rowSites.length;
      const executed = withCert + byRegion + noCert;
      const remaining = target - executed;
      const achievementRate = target > 0 ? Number(((executed / target) * 100).toFixed(1)) : 0;
      const inProgressRate = target > 0 ? Number(((inProgress / target) * 100).toFixed(1)) : 0;
      const permitsRate = target > 0 ? Number(((permits / target) * 100).toFixed(1)) : 0;
      const blockedRate = target > 0 ? Number(((blocked / target) * 100).toFixed(1)) : 0;

      return {
        id,
        name: rowName,
        parentName,
        typeLevel,
        target,
        withCert,
        byRegion,
        noCert,
        executed,
        achievementRate,
        inProgress,
        permits,
        blocked,
        remaining,
        inProgressRate,
        permitsRate,
        blockedRate,
        sites: rowSites,
      };
    };

    const secList: SectorRowMetrics[] = [];
    const flatGenAdmins: ExecutiveRowMetrics[] = [];
    const flatSpecAdmins: ExecutiveRowMetrics[] = [];

    sectorMap.forEach((val, secName) => {
      const secMetrics = computeRow(`sec_${secName}`, secName, 'sector', val.sites);
      const admins: AdminRowMetrics[] = [];

      val.adminMap.forEach((admVal, adminName) => {
        const admMetrics = computeRow(
          `adm_${secName}_${adminName}`,
          adminName,
          'generalAdmin',
          admVal.sites,
          secName
        );
        flatGenAdmins.push(admMetrics);

        const compRows: ExecutiveRowMetrics[] = [];

        admVal.compMap.forEach((compSites, compName) => {
          const compMetric = computeRow(
            `comp_${secName}_${adminName}_${compName}`,
            compName,
            'specializedAdmin',
            compSites,
            adminName
          );
          compRows.push(compMetric);
          flatSpecAdmins.push(compMetric);
        });

        compRows.sort((a, b) => b.target - a.target);

        admins.push({
          ...admMetrics,
          competentAdmins: compRows,
        });
      });

      admins.sort((a, b) => b.target - a.target);

      secList.push({
        ...secMetrics,
        sector: secName,
        administrations: admins,
      });
    });

    secList.sort((a, b) => b.target - a.target);
    flatGenAdmins.sort((a, b) => b.target - a.target);
    flatSpecAdmins.sort((a, b) => b.target - a.target);

    return {
      sectorMetricsList: secList,
      allGeneralAdmins: flatGenAdmins,
      allSpecializedAdmins: flatSpecAdmins,
    };
  }, [sites]);

  // Overall National / Scoped Totals
  const totals = useMemo(() => {
    let target = 0;
    let withCert = 0;
    let byRegion = 0;
    let noCert = 0;
    let inProgress = 0;
    let permits = 0;
    let blocked = 0;

    sites.forEach((s) => {
      target++;
      const cat = classifyExecutiveSite(s);
      if (cat === 'delivered_with_cert') withCert++;
      else if (cat === 'executed_by_region') byRegion++;
      else if (cat === 'executed_without_cert') noCert++;
      else if (cat === 'in_progress') inProgress++;
      else if (cat === 'permits') permits++;
      else if (cat === 'blocked') blocked++;
      else inProgress++;
    });

    const executed = withCert + byRegion + noCert;
    const remaining = target - executed;
    const achievementRate = target > 0 ? Number(((executed / target) * 100).toFixed(1)) : 0;
    const inProgressRate = target > 0 ? Number(((inProgress / target) * 100).toFixed(1)) : 0;
    const permitsRate = target > 0 ? Number(((permits / target) * 100).toFixed(1)) : 0;
    const blockedRate = target > 0 ? Number(((blocked / target) * 100).toFixed(1)) : 0;

    return {
      target,
      withCert,
      byRegion,
      noCert,
      executed,
      achievementRate,
      inProgress,
      permits,
      blocked,
      remaining,
      inProgressRate,
      permitsRate,
      blockedRate,
    };
  }, [sites]);

  // Filtered rows matching search & drill-down criteria
  const displayedRows = useMemo(() => {
    let list: ExecutiveRowMetrics[] = [];

    if (activeTab === 'sectors') {
      list = sectorMetricsList;
    } else if (activeTab === 'generalAdmins') {
      list = allGeneralAdmins;
    } else if (activeTab === 'specializedAdmins') {
      list = allSpecializedAdmins;
    }

    if (drilledSector && activeTab !== 'sectors') {
      list = list.filter((r) => r.parentName === drilledSector || r.name.includes(drilledSector));
    }

    if (tableSearch.trim()) {
      const q = tableSearch.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.parentName && r.parentName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [activeTab, sectorMetricsList, allGeneralAdmins, allSpecializedAdmins, drilledSector, tableSearch]);

  const areAllExpanded = useMemo(() => {
    return (
      sectorMetricsList.length > 0 &&
      sectorMetricsList.every((s) => Boolean(expandedSectors[s.sector]))
    );
  }, [sectorMetricsList, expandedSectors]);

  const toggleAll = (expand: boolean) => {
    const nextSec: Record<string, boolean> = {};
    const nextAdm: Record<string, boolean> = {};
    sectorMetricsList.forEach((s) => {
      nextSec[s.sector] = expand;
      if (expand) {
        s.administrations.forEach((a) => {
          nextAdm[`${s.sector}_${a.name}`] = true;
        });
      }
    });
    setExpandedSectors(nextSec);
    setExpandedAdmins(nextAdm);
  };

  // Helper to determine status rating badge (A, B, C or color tag)
  const getPerformanceBadge = (rate: number) => {
    if (rate >= 90) {
      return { label: 'A', bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-700' };
    }
    if (rate >= 75) {
      return { label: 'B', bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-700' };
    }
    if (rate >= 50) {
      return { label: 'C', bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-600' };
    }
    return { label: 'D', bg: 'bg-red-600', text: 'text-white', border: 'border-red-700' };
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Export CSV Handler
  const handleExportCsv = () => {
    const headers = [
      'اسم القطاع / الإدارة',
      'التبعية / القطاع الأب',
      'المستوى التنظيمي',
      'إجمالي التارجت',
      'المحقق الإجمالي',
      'نسبة الإنجاز %',
      'مسلّم بشهادة PAT',
      'منفذ طرف المنطقة',
      'منفذ بدون شهادة',
      'المتبقي الإجمالي',
      'جاري العمل',
      'جاري التصاريح',
      'المتعذرات والمعوقات',
    ];

    const rows: string[][] = [];

    allGeneralAdmins.forEach((a) => {
      rows.push([
        `"${a.name}"`,
        `"${a.parentName || 'الجمهورية'}"`,
        '"إدارة عامة"',
        String(a.target),
        String(a.executed),
        `${a.achievementRate}%`,
        String(a.withCert),
        String(a.byRegion),
        String(a.noCert),
        String(a.remaining),
        String(a.inProgress),
        String(a.permits),
        String(a.blocked),
      ]);
    });

    rows.push([
      '"الإجمالي الكلي للجمهورية"',
      '"المصرية للاتصالات WE"',
      '"الإجمالي القومي"',
      String(totals.target),
      String(totals.executed),
      `${totals.achievementRate}%`,
      String(totals.withCert),
      String(totals.byRegion),
      String(totals.noCert),
      String(totals.remaining),
      String(totals.inProgress),
      String(totals.permits),
      String(totals.blocked),
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `WE_Executive_Rollout_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Helper component to render the dual/multi-segment color bar with numbers inside
   */
  const renderBicolorProgressBar = (
    row: ExecutiveRowMetrics,
    onClickSlice?: (cat: ExecutiveCategoryKey) => void
  ) => {
    const executedWidth = row.target > 0 ? (row.executed / row.target) * 100 : 0;
    const inProgressWidth = row.target > 0 ? (row.inProgress / row.target) * 100 : 0;
    const permitsWidth = row.target > 0 ? (row.permits / row.target) * 100 : 0;
    const blockedWidth = row.target > 0 ? (row.blocked / row.target) * 100 : 0;

    return (
      <div className="w-full">
        <div className="h-7 sm:h-8 w-full bg-slate-100 rounded-lg overflow-hidden flex shadow-xs border border-slate-300 relative select-none">
          {/* 1. Green Segment: Executed / Munjaz (المحقق / المنفذ) */}
          {executedWidth > 0 && (
            <div
              style={{ width: `${executedWidth}%` }}
              className="bg-emerald-600 hover:bg-emerald-500 h-full flex items-center justify-center transition-all duration-300 cursor-pointer text-white font-mono font-black text-xs sm:text-sm px-1 overflow-hidden"
              onClick={(e) => {
                e.stopPropagation();
                if (onClickSlice) onClickSlice('achieved');
              }}
              title={`المنفذ والمحقق: ${row.executed} موقع (${row.achievementRate}%)`}
            >
              {executedWidth >= 8 ? (
                <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)] flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 hidden sm:inline" />
                  {row.executed}
                </span>
              ) : null}
            </div>
          )}

          {/* 2. Amber Segment: In Progress (جاري العمل مدني وتراسل) */}
          {inProgressWidth > 0 && (
            <div
              style={{ width: `${inProgressWidth}%` }}
              className="bg-amber-500 hover:bg-amber-400 h-full flex items-center justify-center transition-all duration-300 cursor-pointer text-amber-950 font-mono font-black text-xs sm:text-sm px-1 overflow-hidden border-r border-white/20"
              onClick={(e) => {
                e.stopPropagation();
                if (onClickSlice) onClickSlice('in_progress');
              }}
              title={`جاري العمل مدني وتراسل: ${row.inProgress} موقع (${row.inProgressRate}%)`}
            >
              {inProgressWidth >= 6 ? (
                <span className="drop-shadow-xs">{row.inProgress}</span>
              ) : null}
            </div>
          )}

          {/* 3. Orange Segment: Permits (جاري التصاريح) */}
          {permitsWidth > 0 && (
            <div
              style={{ width: `${permitsWidth}%` }}
              className="bg-orange-600 hover:bg-orange-500 h-full flex items-center justify-center transition-all duration-300 cursor-pointer text-white font-mono font-black text-xs sm:text-sm px-1 overflow-hidden border-r border-white/20"
              onClick={(e) => {
                e.stopPropagation();
                if (onClickSlice) onClickSlice('permits');
              }}
              title={`جاري التصاريح: ${row.permits} موقع (${row.permitsRate}%)`}
            >
              {permitsWidth >= 5 ? (
                <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">{row.permits}</span>
              ) : null}
            </div>
          )}

          {/* 4. Crimson Red Segment: Stalled / Blocked (المتعذرات والمعوقات) */}
          {blockedWidth > 0 && (
            <div
              style={{ width: `${blockedWidth}%` }}
              className="bg-red-600 hover:bg-red-500 h-full flex items-center justify-center transition-all duration-300 cursor-pointer text-white font-mono font-black text-xs sm:text-sm px-1 overflow-hidden border-r border-white/20"
              onClick={(e) => {
                e.stopPropagation();
                if (onClickSlice) onClickSlice('blocked');
              }}
              title={`المتعذرات والمعوقات: ${row.blocked} موقع (${row.blockedRate}%)`}
            >
              {blockedWidth >= 5 ? (
                <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)] flex items-center gap-0.5">
                  <span className="text-[10px] hidden sm:inline">⚠️</span>
                  {row.blocked}
                </span>
              ) : null}
            </div>
          )}
        </div>

        {/* Small Progress Legend underneath */}
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mt-1 px-0.5">
          <div className="flex items-center gap-3">
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
              المحقق: {row.executed} ({row.achievementRate}%)
            </span>
            <span className="text-amber-700 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
              جاري: {row.inProgress}
            </span>
            <span className="text-orange-700 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-600 inline-block"></span>
              تصاريح: {row.permits}
            </span>
            <span className="text-red-700 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
              معوقات: {row.blocked}
            </span>
          </div>
          <span className="font-mono text-slate-400 text-xs">
            المستهدف: {row.target}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir="rtl">

      {/* =========================================================================
          1. EXACT TOP EXECUTIVE HEADER (الهيدر التنفيذي المعتمد لشركة WE)
          ========================================================================= */}
      <div className="pbi-card p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-slate-700 shadow-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">

          {/* Title and Branding */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg border border-indigo-400/30 shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white">
                  العرض التنفيذي لموقف تنفيذ مواقع FTTS
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-400/30">
                  WE Executive Rollout
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                المتابعة الشاملة لنسب الإنجاز، التسليمات الميدانية، والأشرطة المزدوجة للمنفذ والمتبقي وفقاً للتقرير التنفيذي المعتمد
              </p>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-sky-400" />
              <span>الإدارات العامة: {allGeneralAdmins.length}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              <span>إنجاز الجمهورية: {totals.achievementRate}%</span>
            </div>
          </div>

        </div>
      </div>

      {/* =========================================================================
          2. EXACT 7+1 TOP COLORED SUMMARY BOXES (شريط المربعات الإجمالية الملونة بالأعلى)
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-3.5">

        {/* Box 1: Total Target (إجمالي التارجت) */}
        <div className="pbi-card p-3.5 sm:p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl border border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-xs font-bold text-slate-300">إجمالي التارجت</span>
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-sky-400">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-mono text-2xl sm:text-3xl font-black tracking-tight leading-none block">
              {totals.target.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">موقع مستهدف</span>
          </div>
        </div>

        {/* Box 2: Total Achieved (المحقق) */}
        <div className="pbi-card p-3.5 sm:p-4 bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950 text-white rounded-2xl border border-emerald-500/50 shadow-sm flex flex-col justify-between ring-2 ring-emerald-500/20">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-xs font-bold text-emerald-200">المحقق</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="font-mono text-2xl sm:text-3xl font-black tracking-tight leading-none text-emerald-300">
                {totals.executed.toLocaleString()}
              </span>
              <span className="text-[11px] font-mono font-black px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                {totals.achievementRate}%
              </span>
            </div>
            <span className="text-[11px] text-emerald-200/80 mt-1 block">إجمالي المنفذ</span>
          </div>
        </div>

        {/* Box 3: Delivered with Certificate (مسلّم بشهادة) */}
        <div className="pbi-card p-3.5 sm:p-4 bg-white rounded-2xl border-2 border-green-300 shadow-xs flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-xs font-bold text-slate-800">مسلّم بشهادة</span>
            <div className="w-7 h-7 rounded-lg bg-green-50 text-green-700 flex items-center justify-center border border-green-200">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-mono text-xl sm:text-2xl font-black text-green-800 leading-none block">
              {totals.withCert.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">شهادة PAT معتمدة</span>
          </div>
        </div>

        {/* Box 4: Executed by Region (منفذ طرف المنطقة) */}
        <div className="pbi-card p-3.5 sm:p-4 bg-white rounded-2xl border-2 border-teal-300 shadow-xs flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-xs font-bold text-slate-800">منفذ طرف المنطقة</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-mono text-xl sm:text-2xl font-black text-teal-800 leading-none block">
              {totals.byRegion.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">منتهي طرف المنطقة</span>
          </div>
        </div>

        {/* Box 5: Executed without Certificate (منفذ بدون شهادة) */}
        <div className="pbi-card p-3.5 sm:p-4 bg-white rounded-2xl border-2 border-sky-300 shadow-xs flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-xs font-bold text-slate-800">منفذ بدون شهادة</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-mono text-xl sm:text-2xl font-black text-sky-800 leading-none block">
              {totals.noCert.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">تشغيل فايبر تجاري</span>
          </div>
        </div>

        {/* Box 6: In Progress (جاري العمل) */}
        <div className="pbi-card p-3.5 sm:p-4 bg-white rounded-2xl border-2 border-amber-300 shadow-xs flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-xs font-bold text-slate-800">جاري العمل</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-xl sm:text-2xl font-black text-amber-700 leading-none">
                {totals.inProgress.toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-amber-600">
                ({totals.inProgressRate}%)
              </span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">مدني، سحب، ولحام</span>
          </div>
        </div>

        {/* Box 7: Permits (جاري التصاريح) */}
        <div className="pbi-card p-3.5 sm:p-4 bg-white rounded-2xl border-2 border-orange-300 shadow-xs flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-xs font-bold text-slate-800">جاري التصاريح</span>
            <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-700 flex items-center justify-center border border-orange-200">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-xl sm:text-2xl font-black text-orange-700 leading-none">
                {totals.permits.toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-orange-600">
                ({totals.permitsRate}%)
              </span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">طرق، أحياء، وأجهزة</span>
          </div>
        </div>

        {/* Box 8: Blocked / Stalled (المتعذرات والمعوقات باللون الأحمر المميز) */}
        <div className="pbi-card p-3.5 sm:p-4 bg-rose-50 rounded-2xl border-2 border-rose-400 shadow-xs flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-xs font-black text-rose-950">المتعذرات والمعوقات</span>
            <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-xl sm:text-2xl font-black text-rose-700 leading-none">
                {totals.blocked.toLocaleString()}
              </span>
              <span className="text-[11px] font-black text-rose-600 bg-rose-100 px-1 py-0.5 rounded">
                ({totals.blockedRate}%)
              </span>
            </div>
            <span className="text-[11px] text-rose-900/80 font-medium mt-1 block">معوقات ومشاكل ميدانية</span>
          </div>
        </div>

      </div>

      {/* =========================================================================
          3. ORGANIZATIONAL LEVEL TABS (تابات المستويات التنظيمية المعتمدة)
          ========================================================================= */}
      <div className="pbi-card p-2.5 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">

        {/* Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('generalAdmins')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-2 shrink-0 ${activeTab === 'generalAdmins'
              ? 'bg-purple-900 text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              }`}
          >
            <Building2 className="w-4 h-4" />
            <span>الإدارات العامة لتنفيذ الشبكات</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'generalAdmins' ? 'bg-purple-800 text-white' : 'bg-slate-300 text-slate-800'}`}>
              {allGeneralAdmins.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sectors')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-2 shrink-0 ${activeTab === 'sectors'
              ? 'bg-purple-900 text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              }`}
          >
            <Layers className="w-4 h-4" />
            <span>رئاسات القطاعات</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'sectors' ? 'bg-purple-800 text-white' : 'bg-slate-300 text-slate-800'}`}>
              {sectorMetricsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('specializedAdmins')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-2 shrink-0 ${activeTab === 'specializedAdmins'
              ? 'bg-purple-900 text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              }`}
          >
            <Building className="w-4 h-4" />
            <span>الإدارات المتخصصة والمناطق</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'specializedAdmins' ? 'bg-purple-800 text-white' : 'bg-slate-300 text-slate-800'}`}>
              {allSpecializedAdmins.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hierarchicalTree')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-2 shrink-0 ${activeTab === 'hierarchicalTree'
              ? 'bg-purple-900 text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>العرض الهرمي الشامل (Drill-Down)</span>
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="relative min-w-[220px]">
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="ابحث باسم القطاع أو الإدارة..."
              className="w-full pr-9 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 font-medium"
            />
            <Search className="w-3.5 h-3.5 absolute inset-y-0 right-3 my-auto text-slate-400" />
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="تصدير جدول التقرير التنفيذي إلى CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>تصدير CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="طباعة التقرير التنفيذي"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة</span>
          </button>
        </div>

      </div>

      {/* Drill-down Alert Banner */}
      {(drilledSector || drilledCategory !== 'all') && (
        <div className="pbi-card p-3.5 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-blue-400/40 shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-sky-400 shrink-0" />
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-bold text-sky-200">تصفية هرمية نشطة:</span>
              {drilledSector && (
                <span className="px-2 py-0.5 rounded bg-blue-500/30 border border-blue-400/40 text-white font-bold">
                  {drilledSector}
                </span>
              )}
              {drilledCategory !== 'all' && (
                <span className={`px-2 py-0.5 rounded font-black ${EXECUTIVE_STATUS_THEMES[drilledCategory].bgBadge} ${EXECUTIVE_STATUS_THEMES[drilledCategory].textBadge}`}>
                  {EXECUTIVE_STATUS_THEMES[drilledCategory].titleAr}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetDrillDown}
            className="px-3 py-1 bg-rose-600/30 hover:bg-rose-600/40 text-rose-200 rounded-lg text-xs font-bold transition border border-rose-400/40 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>إلغاء التصفية</span>
          </button>
        </div>
      )}

      {/* =========================================================================
          4. TABULAR EXECUTIVE ROLLOUT VIEW (المطابق تماماً لتصميم التقرير والصورة)
          ========================================================================= */}
      {activeTab !== 'hierarchicalTree' ? (
        <div className="pbi-card overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm border-collapse">

              {/* Table Header */}
              <thead>
                <tr className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white font-bold select-none text-xs border-b-2 border-slate-700">
                  <th className="p-3.5 border-b border-slate-700 min-w-[280px] text-right font-extrabold">
                    {activeTab === 'generalAdmins'
                      ? 'الإدارة العامة لتنفيذ الشبكات'
                      : activeTab === 'sectors'
                        ? 'رئاسة القطاع'
                        : 'الإدارة المتخصصة / المنطقة'}
                  </th>
                  <th className="p-3 border-b border-slate-700 text-center font-mono font-bold min-w-[70px]">
                    التارجت
                  </th>
                  <th className="p-3 border-b border-slate-700 text-center font-mono font-bold text-emerald-300 min-w-[75px]">
                    المحقق
                  </th>
                  <th className="p-3 border-b border-slate-700 text-center font-mono text-green-300 min-w-[75px]">
                    مسلّم بشهادة
                  </th>
                  <th className="p-3 border-b border-slate-700 text-center font-mono text-teal-300 min-w-[75px]">
                    طرف المنطقة
                  </th>
                  <th className="p-3 border-b border-slate-700 text-center font-mono text-sky-300 min-w-[75px]">
                    بدون شهادة
                  </th>
                  <th className="p-3 border-b border-slate-700 text-center font-mono text-amber-300 min-w-[75px]">
                    جاري العمل
                  </th>
                  <th className="p-3 border-b border-slate-700 text-center font-mono text-orange-300 min-w-[75px]">
                    جاري التصاريح
                  </th>
                  <th className="p-3 border-b border-slate-700 text-center font-mono text-rose-300 min-w-[75px]">
                    المتعذرات
                  </th>
                  <th className="p-3.5 border-b border-slate-700 text-center min-w-[320px]">
                    شريط الموقف المزدوج (المنجز والمتبقي)
                  </th>
                </tr>
              </thead>

              {/* Table Body Rows */}
              <tbody className="divide-y divide-slate-200">
                {displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 font-bold">
                      لا توجد بيانات مطابقة لمعايير البحث الحالية
                    </td>
                  </tr>
                ) : (
                  displayedRows.map((row) => {
                    const badge = getPerformanceBadge(row.achievementRate);

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-indigo-50/40 transition duration-150 group"
                      >
                        {/* Name Column with Achievement Rate on Right */}
                        <td className="p-3.5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              {/* Performance Category Badge (A, B, C, D) */}
                              <span
                                className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-xs shadow-xs ${badge.bg} ${badge.text}`}
                                title={`تصنيف الأداء: فئة ${badge.label}`}
                              >
                                {badge.label}
                              </span>

                              <div>
                                <span className="font-extrabold text-slate-900 block text-xs sm:text-sm group-hover:text-purple-900 transition">
                                  {row.name}
                                </span>
                                {row.parentName && (
                                  <span className="text-[11px] text-slate-400 font-medium block">
                                    التابع لـ: {row.parentName}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Prominent Achievement Rate on Right (e.g. 56.1%) */}
                            <div className="text-left shrink-0">
                              <span className="font-mono text-sm sm:text-base font-black text-emerald-700 block leading-tight">
                                {row.achievementRate}%
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold block">
                                إنجاز
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Target */}
                        <td className="p-3 text-center font-mono font-bold text-slate-900 bg-slate-50/40">
                          {row.target.toLocaleString()}
                        </td>

                        {/* Achieved */}
                        <td className="p-3 text-center font-mono font-black text-emerald-700 bg-emerald-50/40">
                          {row.executed.toLocaleString()}
                        </td>

                        {/* Delivered w/ Cert */}
                        <td className="p-3 text-center font-mono font-bold text-green-700">
                          {row.withCert.toLocaleString()}
                        </td>

                        {/* Executed by Region */}
                        <td className="p-3 text-center font-mono font-bold text-teal-700">
                          {row.byRegion.toLocaleString()}
                        </td>

                        {/* Without Cert */}
                        <td className="p-3 text-center font-mono font-bold text-sky-700">
                          {row.noCert.toLocaleString()}
                        </td>

                        {/* In Progress */}
                        <td className="p-3 text-center font-mono font-bold text-amber-700">
                          {row.inProgress.toLocaleString()}
                        </td>

                        {/* Permits */}
                        <td className="p-3 text-center font-mono font-bold text-orange-700">
                          {row.permits.toLocaleString()}
                        </td>

                        {/* Stalled / Obstacles (Red) */}
                        <td className="p-3 text-center font-mono font-black text-red-700 bg-rose-50/50">
                          <span className="inline-flex items-center gap-1 font-mono">
                            {row.blocked.toLocaleString()}
                            {row.blocked > 0 && <span className="text-[10px]">⚠️</span>}
                          </span>
                        </td>

                        {/* Bicolor Progress Bar with detailed numbers inscribed */}
                        <td className="p-3.5">
                          {renderBicolorProgressBar(row, (cat) => {
                            if (row.parentName) handleCategoryDrillDown(row.parentName, cat);
                            else handleCategoryDrillDown(row.name, cat);
                          })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Footer: National Grand Total */}
              <tfoot>
                <tr className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white font-bold text-xs sm:text-sm border-t-2 border-slate-700 select-none">
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="font-black text-sm sm:text-base text-white">
                          الإجمالي الكلي للجمهورية (Grand Total)
                        </span>
                      </div>
                      <span className="font-mono text-base font-black text-emerald-400">
                        {totals.achievementRate}%
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-center font-mono font-black text-white text-base">
                    {totals.target.toLocaleString()}
                  </td>
                  <td className="p-4 text-center font-mono font-black text-emerald-400 text-base">
                    {totals.executed.toLocaleString()}
                  </td>
                  <td className="p-4 text-center font-mono text-green-300 font-bold">
                    {totals.withCert.toLocaleString()}
                  </td>
                  <td className="p-4 text-center font-mono text-teal-300 font-bold">
                    {totals.byRegion.toLocaleString()}
                  </td>
                  <td className="p-4 text-center font-mono text-sky-300 font-bold">
                    {totals.noCert.toLocaleString()}
                  </td>
                  <td className="p-4 text-center font-mono text-amber-300 font-bold">
                    {totals.inProgress.toLocaleString()}
                  </td>
                  <td className="p-4 text-center font-mono text-orange-300 font-bold">
                    {totals.permits.toLocaleString()}
                  </td>
                  <td className="p-4 text-center font-mono text-red-400 font-black">
                    {totals.blocked.toLocaleString()}
                  </td>
                  <td className="p-4">
                    {renderBicolorProgressBar({
                      id: 'grand_total',
                      name: 'الإجمالي الكلي',
                      typeLevel: 'sector',
                      target: totals.target,
                      executed: totals.executed,
                      withCert: totals.withCert,
                      byRegion: totals.byRegion,
                      noCert: totals.noCert,
                      inProgress: totals.inProgress,
                      permits: totals.permits,
                      blocked: totals.blocked,
                      remaining: totals.remaining,
                      achievementRate: totals.achievementRate,
                      inProgressRate: totals.inProgressRate,
                      permitsRate: totals.permitsRate,
                      blockedRate: totals.blockedRate,
                      sites: sites,
                    })}
                  </td>
                </tr>
              </tfoot>

            </table>
          </div>
        </div>
      ) : (
        /* =========================================================================
            5. HIERARCHICAL TREE DRILL-DOWN VIEW (العرض الهرمي الشامل المتكامل)
            ========================================================================= */
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 px-1">
            <span className="text-xs font-bold text-slate-500">
              العرض الهرمي التفاعلي (رئاسة القطاع ← الإدارة العامة ← إدارة التنفيذ المختصة)
            </span>
            <button
              type="button"
              onClick={() => toggleAll(!areAllExpanded)}
              className="text-xs font-bold text-purple-700 hover:text-purple-900 transition flex items-center gap-1 cursor-pointer"
            >
              {areAllExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{areAllExpanded ? 'طي الكل' : 'توسيع الكل'}</span>
            </button>
          </div>

          <div className="space-y-4">
            {sectorMetricsList.map((sec) => {
              const isSecExpanded = Boolean(expandedSectors[sec.sector]);
              const secBadge = getPerformanceBadge(sec.achievementRate);

              return (
                <div
                  key={sec.id}
                  className="pbi-card bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition"
                >
                  {/* Sector Header Card */}
                  <div
                    onClick={() => toggleSector(sec.sector)}
                    className="p-4 bg-slate-50/80 hover:bg-slate-100/90 transition cursor-pointer flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                        {isSecExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-xs ${secBadge.bg} ${secBadge.text}`}>
                        {secBadge.label}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm sm:text-base">
                            {sec.sector}
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            ({sec.administrations.length} إدارة عامة)
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 font-mono mt-0.5">
                          <span>تارجت: <b>{sec.target}</b></span>
                          <span className="text-emerald-700 font-bold">محقق: <b>{sec.executed}</b></span>
                          <span className="text-red-700 font-bold">معوقات: <b>{sec.blocked}</b></span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar & Percentage on Right */}
                    <div className="flex items-center gap-4 flex-1 max-w-md">
                      <div className="flex-1">
                        {renderBicolorProgressBar(sec, (cat) => handleCategoryDrillDown(sec.sector, cat))}
                      </div>
                      <div className="text-left shrink-0 min-w-[55px]">
                        <span className="font-mono text-base font-black text-emerald-700 block leading-tight">
                          {sec.achievementRate}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sector Sub-Administrations Accordion Body */}
                  {isSecExpanded && (
                    <div className="p-3 sm:p-4 bg-slate-50/40 space-y-3">
                      {sec.administrations.map((adm) => {
                        const admKey = `${sec.sector}_${adm.name}`;
                        const isAdmExpanded = Boolean(expandedAdmins[admKey]);
                        const admBadge = getPerformanceBadge(adm.achievementRate);

                        return (
                          <div
                            key={adm.id}
                            className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-2.5"
                          >
                            <div
                              onClick={() => toggleAdmin(admKey)}
                              className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                  {isAdmExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </div>
                                <span className={`w-5 h-5 rounded flex items-center justify-center font-black text-[10px] ${admBadge.bg} ${admBadge.text}`}>
                                  {admBadge.label}
                                </span>
                                <div>
                                  <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                    {adm.name}
                                  </span>
                                  <span className="text-[11px] text-slate-400 block font-mono">
                                    تارجت: {adm.target} | محقق: {adm.executed} | معوقات: {adm.blocked}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 flex-1 max-w-xs sm:max-w-sm">
                                <div className="flex-1">
                                  {renderBicolorProgressBar(adm, (cat) => handleCategoryDrillDown(sec.sector, cat))}
                                </div>
                                <span className="font-mono font-black text-xs sm:text-sm text-emerald-700 min-w-[45px] text-left">
                                  {adm.achievementRate}%
                                </span>
                              </div>
                            </div>

                            {/* Level 3: Competent Execution Administrations */}
                            {isAdmExpanded && (
                              <div className="mr-8 pt-2 border-t border-slate-100 space-y-1.5">
                                <span className="text-[11px] font-bold text-slate-400 block mb-1">
                                  إدارات ومناطق التنفيذ الفرعية التابعة:
                                </span>
                                {adm.competentAdmins.map((comp) => (
                                  <div
                                    key={comp.id}
                                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition text-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                      <span className="font-bold text-slate-800">{comp.name}</span>
                                      <span className="text-[11px] font-mono text-slate-400">
                                        ({comp.executed}/{comp.target})
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="font-mono font-black text-emerald-700">
                                        {comp.achievementRate}%
                                      </span>
                                      {onOpenDetailsModal && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenDetailsModal(undefined, sec.sector);
                                          }}
                                          className="p-1 rounded bg-white hover:bg-slate-200 text-slate-600 border border-slate-200 transition cursor-pointer"
                                          title="عرض كشف مواقع هذه الإدارة"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

export default WeExecutiveReportView;
