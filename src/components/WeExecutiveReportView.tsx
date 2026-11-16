// src/components/WeExecutiveReportView.tsx
// Upgraded Executive Detailed Rollout Status Report (العرض التنفيذي التفصيلي المطور 100% مطابق للصورة والتقرير المعتمد)
// Features:
// 1. Exact top executive Telecom Egypt branding header with purple gradient and sub-bar
// 2. Exact 7 colored executive indicator boxes (Target, Executed, Delivered w/ Cert, Region Executed, Without Cert, In Progress, Permits)
// 3. Exact legend row with dots and target threshold
// 4. Exact card row design with prominent achievement % on the right, multi-segment color bar in the center with inscribed numbers, and the 6 metric boxes on the left
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
  selectedSector?: string | string[];
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

export type OrganizationalTabKey = 'generalAdmins' | 'sectors' | 'specializedAdmins' | 'hierarchicalTree';

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
    hex: '#15803d',
    barColor: 'bg-green-700',
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
    hex: '#10b981',
    barColor: 'bg-emerald-500',
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
    hex: '#34d399',
    barColor: 'bg-teal-400',
    bgBadge: 'bg-sky-100',
    textBadge: 'text-sky-900',
    borderBadge: 'border-sky-300',
    cardBg: 'bg-gradient-to-br from-sky-950 via-blue-900 to-slate-900',
    cardBorder: 'border-sky-500/50',
    icon: FileCheck,
    desc: 'تشغيل فايبر تجاري مفعل قبل صدور الشهادة',
  },
  in_progress: {
    titleAr: 'متبقي: جاري العمل',
    titleEn: 'In Progress',
    hex: '#be123c',
    barColor: 'bg-rose-700',
    bgBadge: 'bg-rose-100',
    textBadge: 'text-rose-900',
    borderBadge: 'border-rose-300',
    cardBg: 'bg-gradient-to-br from-rose-950 via-rose-900 to-slate-900',
    cardBorder: 'border-rose-500/50',
    icon: Clock,
    desc: 'أعمال مدنية، مد كوابل، سحب فايبر ولحام',
  },
  permits: {
    titleAr: 'متبقي: جاري التصاريح',
    titleEn: 'Permits in Progress',
    hex: '#f87171',
    barColor: 'bg-rose-400',
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
  // Default to General Administrations (الإدارات العامة) matching the report image
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
    const firstSec = Array.isArray(selectedSector) ? selectedSector[0] : selectedSector;
    if (firstSec && firstSec !== 'All' && firstSec !== 'ALL') {
      setDrilledSector(firstSec);
      setExpandedSectors((prev) => ({ ...prev, [firstSec]: true }));
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
   * Helper component to render each Executive Card Row exactly as shown in the approved report image
   */
  const renderExecutiveCardRow = (
    row: ExecutiveRowMetrics,
    options?: { showAccordion?: boolean; isExpanded?: boolean; onToggle?: () => void }
  ) => {
    const executed = row.executed;
    const remaining = row.remaining;
    const permitsAll = row.permits + row.blocked;

    const withCertWidth = row.target > 0 ? (row.withCert / row.target) * 100 : 0;
    const byRegionWidth = row.target > 0 ? (row.byRegion / row.target) * 100 : 0;
    const noCertWidth = row.target > 0 ? (row.noCert / row.target) * 100 : 0;
    const inProgressWidth = row.target > 0 ? (row.inProgress / row.target) * 100 : 0;
    const permitsWidth = row.target > 0 ? (permitsAll / row.target) * 100 : 0;

    // Target marker position: calculated proportional to target (default target benchmark ~63%)
    const targetMarkerVal = Math.round(row.target * 0.63);

    // Sub-breakdown if available in site notes / names
    const rasdCount = row.sites.filter((s) => s.siteName.includes('رصد') || s.classification?.includes('رصد') || s.notes?.includes('رصد')).length;
    const isharaCount = row.sites.filter((s) => s.siteName.includes('إشارة') || s.classification?.includes('إشارة') || s.notes?.includes('إشارة')).length;
    const shortaCount = row.sites.filter((s) => s.siteName.includes('شرطة') || s.classification?.includes('شرطة') || s.notes?.includes('شرطة')).length;

    const breakdownText = rasdCount > 0 || isharaCount > 0 || shortaCount > 0
      ? `رصد: ${rasdCount} | إشارة: ${isharaCount} | شرطة: ${shortaCount}`
      : `محقق: ${executed} | متبقي: ${remaining}`;

    return (
      <div
        key={row.id}
        className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-xs hover:shadow-md transition-all flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 sm:gap-4 group"
      >
        {/* 1. Right: Admin Name, Target Breakdown & Achievement Rate Badge */}
        <div className="xl:w-60 flex-shrink-0 text-right">
          <div className="flex items-center gap-2">
            {options?.showAccordion && (
              <button
                type="button"
                onClick={options.onToggle}
                className="w-6 h-6 rounded bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer hover:bg-slate-200"
              >
                {options.isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}
            <h4
              onClick={() => onOpenDetailsModal && onOpenDetailsModal(undefined, row.name)}
              className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-purple-950 transition-colors cursor-pointer hover:underline"
              title="انقر لعرض شيت مواقع هذه الإدارة"
            >
              {row.name}
            </h4>
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            التارجت: {row.target} ({breakdownText})
          </div>
          <div className="mt-1.5">
            <span className="bg-gradient-to-r from-blue-900 via-indigo-900 to-sky-700 text-white font-mono font-black text-xs px-2.5 py-0.5 rounded-md inline-block shadow-2xs">
              نسبة الإنجاز {row.achievementRate}%
            </span>
          </div>
        </div>

        {/* 2. Center: Dual / Multi-Segment Color Bar with floating target pin */}
        <div className="flex-1 min-w-[260px] relative px-1 sm:px-2">
          {/* Floating Target Marker Pin */}
          <div className="flex justify-center mb-1">
            <span className="bg-[#3730a3] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs flex items-center gap-1 font-mono">
              <span>مستهدف:</span>
              <span>{targetMarkerVal}</span>
            </span>
          </div>

          {/* The Multi-Segment Bar */}
          <div className="h-7 sm:h-8 w-full bg-slate-100 rounded-md overflow-hidden flex relative shadow-inner border border-slate-300 select-none">
            {/* Segment 1: مسلّم بشهادة (Dark Green #15803d) */}
            {withCertWidth > 0 && (
              <div
                style={{ width: `${withCertWidth}%` }}
                className="bg-[#15803d] hover:bg-green-700 h-full flex items-center justify-center text-white font-mono font-black text-xs sm:text-sm transition-all cursor-pointer overflow-hidden"
                title={`مسلّم بشهادة معتمدة: ${row.withCert}`}
                onClick={() => onOpenDetailsModal && onOpenDetailsModal('تم الانتهاء', row.name)}
              >
                {withCertWidth >= 6 ? row.withCert : null}
              </div>
            )}

            {/* Segment 2: طرف المنطقة (Medium Green #10b981) */}
            {byRegionWidth > 0 && (
              <div
                style={{ width: `${byRegionWidth}%` }}
                className="bg-[#10b981] hover:bg-emerald-500 h-full flex items-center justify-center text-white font-mono font-black text-xs sm:text-sm transition-all cursor-pointer overflow-hidden border-r border-white/20"
                title={`منفذ طرف المنطقة: ${row.byRegion}`}
                onClick={() => onOpenDetailsModal && onOpenDetailsModal('تم التشغيل فايبر', row.name)}
              >
                {byRegionWidth >= 6 ? row.byRegion : null}
              </div>
            )}

            {/* Segment 3: بدون شهادة (Mint Green #34d399) */}
            {noCertWidth > 0 && (
              <div
                style={{ width: `${noCertWidth}%` }}
                className="bg-[#34d399] hover:bg-teal-400 h-full flex items-center justify-center text-emerald-950 font-mono font-bold text-xs transition-all cursor-pointer overflow-hidden border-r border-white/20"
                title={`منفذ بدون شهادة: ${row.noCert}`}
                onClick={() => onOpenDetailsModal && onOpenDetailsModal('تم مدني', row.name)}
              >
                {noCertWidth >= 5 ? row.noCert : null}
              </div>
            )}

            {/* Segment 4: متبقي: جاري العمل (Dark Crimson Red #be123c) */}
            {inProgressWidth > 0 && (
              <div
                style={{ width: `${inProgressWidth}%` }}
                className="bg-[#be123c] hover:bg-rose-700 h-full flex items-center justify-center text-white font-mono font-black text-xs sm:text-sm transition-all cursor-pointer overflow-hidden border-r border-white/20"
                title={`متبقي جاري العمل: ${row.inProgress}`}
                onClick={() => onOpenDetailsModal && onOpenDetailsModal('جاري العمل', row.name)}
              >
                {inProgressWidth >= 6 ? row.inProgress : null}
              </div>
            )}

            {/* Segment 5: متبقي: جاري التصاريح (Light Coral Red #f87171) */}
            {permitsWidth > 0 && (
              <div
                style={{ width: `${permitsWidth}%` }}
                className="bg-[#f87171] hover:bg-rose-400 h-full flex items-center justify-center text-white font-mono font-black text-xs sm:text-sm transition-all cursor-pointer overflow-hidden border-r border-white/20"
                title={`متبقي جاري التصاريح والمعوقات: ${permitsAll}`}
                onClick={() => onOpenDetailsModal && onOpenDetailsModal('جاري تصريح', row.name)}
              >
                {permitsWidth >= 5 ? permitsAll : null}
              </div>
            )}
          </div>

          {/* Subtext below the bar */}
          <div className="text-slate-600 text-[11px] font-mono mt-1 text-center font-medium truncate">
            المنفذ: {executed} (بشهادة: {row.withCert} • منطقه: {row.byRegion} • بدون شهادة: {row.noCert}) | المتبقي: {remaining} (جاري العمل: {row.inProgress} • جاري التصاريح: {permitsAll})
          </div>
        </div>

        {/* 3. Left: The 6 Horizontal Metric Boxes */}
        <div className="flex-shrink-0 flex items-center justify-end gap-1 sm:gap-1.5 self-center">
          {/* إجمالي المنفذ */}
          <div
            className="bg-[#dcfce7] border border-emerald-300 text-[#15803d] font-mono font-black text-xs sm:text-sm w-11 sm:w-12 h-8 rounded-lg flex items-center justify-center shadow-2xs cursor-pointer hover:scale-105 transition-transform"
            title={`إجمالي المنفذ: ${executed}`}
            onClick={() => onOpenDetailsModal && onOpenDetailsModal('تم الانتهاء', row.name)}
          >
            {executed}
          </div>

          {/* بشهادة */}
          <div
            className="bg-[#f0fdf4] border border-green-200 text-[#166534] font-mono font-bold text-xs w-10 sm:w-11 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
            title={`مسلّم بشهادة: ${row.withCert}`}
            onClick={() => onOpenDetailsModal && onOpenDetailsModal('تم الانتهاء', row.name)}
          >
            {row.withCert}
          </div>

          {/* طرف المنطقة */}
          <div
            className="bg-[#f0fdf4] border border-green-200 text-[#166534] font-mono font-bold text-xs w-10 sm:w-11 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
            title={`طرف المنطقة: ${row.byRegion}`}
            onClick={() => onOpenDetailsModal && onOpenDetailsModal('تم التشغيل فايبر', row.name)}
          >
            {row.byRegion}
          </div>

          {/* بدون شهادة */}
          <div
            className="bg-[#f0fdf4] border border-green-200 text-[#166534] font-mono font-bold text-xs w-10 sm:w-11 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
            title={`بدون شهادة: ${row.noCert}`}
            onClick={() => onOpenDetailsModal && onOpenDetailsModal('تم مدني', row.name)}
          >
            {row.noCert}
          </div>

          {/* جاري العمل */}
          <div
            className="bg-[#ffe4e6] border border-rose-200 text-[#be123c] font-mono font-bold text-xs w-10 sm:w-11 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
            title={`جاري العمل: ${row.inProgress}`}
            onClick={() => onOpenDetailsModal && onOpenDetailsModal('جاري العمل', row.name)}
          >
            {row.inProgress}
          </div>

          {/* جاري التصاريح */}
          <div
            className="bg-[#fff1f2] border border-rose-200 text-[#e11d48] font-mono font-bold text-xs w-10 sm:w-11 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
            title={`جاري التصاريح: ${permitsAll}`}
            onClick={() => onOpenDetailsModal && onOpenDetailsModal('جاري تصريح', row.name)}
          >
            {permitsAll}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200 select-text" dir="rtl">

      {/* =========================================================================
          1. EXACT TOP EXECUTIVE HEADER (الهيدر التنفيذي المعتمد لشركة WE)
          ========================================================================= */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#1c1242] via-[#2d1b64] to-[#1c1242] text-white rounded-2xl shadow-md border border-purple-900/60 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* White Circular WE Logo */}
            <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-md flex-shrink-0">
              <span className="text-[#2d1b64] font-black text-xl tracking-tighter">we</span>
            </div>
            <div>
              <span className="text-[10px] tracking-widest uppercase font-mono font-bold text-purple-300 block">
                TELECOM EGYPT • VISUAL MONITORING EXECUTIVE TARGET REPORT
              </span>
              <h2 className="text-base sm:text-2xl font-black text-white tracking-tight mt-0.5">
                بيان التارجت وموقف التنفيذ والشهادات والمتبقي للإدارات العامة
              </h2>
            </div>
          </div>

          <div className="text-left text-xs text-purple-200 font-mono">
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 font-bold">
              تاريخ التقرير: 16 نوفمبر 2026 | موعد الاستحقاق: 30 نوفمبر 2026
            </span>
          </div>
        </div>

        {/* Subtitle bar */}
        <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-purple-200">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">العرض:</span>
            <span>الإدارة العامة للتنفيذ — النطاق: جميع الملفات (الرصد المرئي + الإشارة + أقسام الشرطة)</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="bg-purple-500/20 px-2 py-0.5 rounded border border-purple-400/30 text-purple-200">
              {allGeneralAdmins.length} إدارات عامة
            </span>
            <span className="bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-400/30 text-emerald-300 font-bold">
              نسبة الإنجاز: {totals.achievementRate}%
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. EXACT 7 TOP COLORED SUMMARY BOXES (شريط المربعات الإجمالية الملونة بالأعلى)
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
        {/* Card 1: إجمالي التارجت */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 border-t-4 border-t-slate-800 p-3 sm:p-3.5 flex flex-col justify-between text-right">
          <span className="text-xs font-bold text-slate-800">إجمالي التارجت</span>
          <span className="font-mono text-2xl sm:text-3xl font-black text-slate-900 my-1 block">
            {totals.target.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400">إجمالي المواقع المستهدفة</span>
        </div>

        {/* Card 2: إجمالي المحقق (المنفذ) */}
        <div className="bg-[#f0fdfa] rounded-xl shadow-xs border border-teal-200 border-t-4 border-t-teal-600 p-3 sm:p-3.5 flex flex-col justify-between text-right">
          <span className="text-xs font-bold text-teal-800">إجمالي المحقق (المنفذ)</span>
          <span className="font-mono text-2xl sm:text-3xl font-black text-teal-700 my-1 block">
            {totals.executed.toLocaleString()}
          </span>
          <span className="text-[10px] font-bold text-teal-700">بنسبة إنجاز {totals.achievementRate}% من التارجت</span>
        </div>

        {/* Card 3: مسلّم بشهادة معتمدة */}
        <div className="bg-[#f0fdf4] rounded-xl shadow-xs border border-green-200 border-t-4 border-t-green-600 p-3 sm:p-3.5 flex flex-col justify-between text-right">
          <span className="text-xs font-bold text-green-800">مسلّم بشهادة معتمدة</span>
          <span className="font-mono text-2xl sm:text-3xl font-black text-green-700 my-1 block">
            {totals.withCert.toLocaleString()}
          </span>
          <span className="text-[10px] text-green-700">
            {totals.executed > 0 ? ((totals.withCert / totals.executed) * 100).toFixed(1) : 0}% من إجمالي المنفذ
          </span>
        </div>

        {/* Card 4: منفذ طرف المنطقة */}
        <div className="bg-[#ecfdf5] rounded-xl shadow-xs border border-emerald-200 border-t-4 border-t-emerald-500 p-3 sm:p-3.5 flex flex-col justify-between text-right">
          <span className="text-xs font-bold text-emerald-800">منفذ طرف المنطقة</span>
          <span className="font-mono text-2xl sm:text-3xl font-black text-emerald-700 my-1 block">
            {totals.byRegion.toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-700">
            {totals.executed > 0 ? ((totals.byRegion / totals.executed) * 100).toFixed(1) : 0}% من إجمالي المنفذ
          </span>
        </div>

        {/* Card 5: منفذ بدون شهادة */}
        <div className="bg-[#f0fdf4] rounded-xl shadow-xs border border-emerald-200 border-t-4 border-t-emerald-400 p-3 sm:p-3.5 flex flex-col justify-between text-right">
          <span className="text-xs font-bold text-emerald-800">منفذ بدون شهادة</span>
          <span className="font-mono text-2xl sm:text-3xl font-black text-emerald-700 my-1 block">
            {totals.noCert.toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-700">
            {totals.executed > 0 ? ((totals.noCert / totals.executed) * 100).toFixed(1) : 0}% من إجمالي المنفذ
          </span>
        </div>

        {/* Card 6: متبقي: جاري العمل */}
        <div className="bg-[#fff1f2] rounded-xl shadow-xs border border-rose-200 border-t-4 border-t-rose-700 p-3 sm:p-3.5 flex flex-col justify-between text-right">
          <span className="text-xs font-bold text-rose-800">متبقي: جاري العمل</span>
          <span className="font-mono text-2xl sm:text-3xl font-black text-rose-700 my-1 block">
            {totals.inProgress.toLocaleString()}
          </span>
          <span className="text-[10px] text-rose-700">من إجمالي المتبقي ({totals.remaining})</span>
        </div>

        {/* Card 7: متبقي: جاري التصاريح */}
        <div className="bg-[#fff1f2] rounded-xl shadow-xs border border-rose-200 border-t-4 border-t-rose-500 p-3 sm:p-3.5 flex flex-col justify-between text-right">
          <span className="text-xs font-bold text-rose-800">متبقي: جاري التصاريح</span>
          <span className="font-mono text-2xl sm:text-3xl font-black text-rose-600 my-1 block">
            {(totals.permits + totals.blocked).toLocaleString()}
          </span>
          <span className="text-[10px] text-rose-600">
            المطلوب يومياً: {Math.max(1, Math.round((totals.permits + totals.blocked) / 14))} موقع
          </span>
        </div>
      </div>

      {/* =========================================================================
          3. EXACT LEGEND ROW
          ========================================================================= */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-slate-700 font-bold bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#15803d]"></span>
          <span>مسلّم بشهادة ({totals.withCert})</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#10b981]"></span>
          <span>منفذ طرف المنطقة ({totals.byRegion})</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#34d399]"></span>
          <span>منفذ بدون شهادة ({totals.noCert})</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#be123c]"></span>
          <span>متبقي: جاري العمل ({totals.inProgress})</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#f87171]"></span>
          <span>متبقي: جاري التصاريح ({totals.permits + totals.blocked})</span>
        </span>
        <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-900 border border-indigo-200 px-2.5 py-0.5 rounded-full font-mono text-[11px]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4f46e5]"></span>
          <span>المستهدف بنهاية اليوم ({Math.min(totals.target, Math.round(totals.executed * 1.05))})</span>
        </span>
      </div>

      {/* =========================================================================
          4. ORGANIZATIONAL LEVEL TABS & TOOLBAR
          ========================================================================= */}
      <div className="p-2.5 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('generalAdmins')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-2 shrink-0 ${activeTab === 'generalAdmins'
              ? 'bg-[#2d1b64] text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>الإدارات العامة لتنفيذ الشبكات</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'generalAdmins' ? 'bg-purple-800 text-white' : 'bg-slate-300 text-slate-800'}`}>
              {allGeneralAdmins.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sectors')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-2 shrink-0 ${activeTab === 'sectors'
              ? 'bg-[#2d1b64] text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>رئاسات القطاعات</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'sectors' ? 'bg-purple-800 text-white' : 'bg-slate-300 text-slate-800'}`}>
              {sectorMetricsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('specializedAdmins')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-2 shrink-0 ${activeTab === 'specializedAdmins'
              ? 'bg-[#2d1b64] text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>الإدارات المتخصصة والمناطق</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'specializedAdmins' ? 'bg-purple-800 text-white' : 'bg-slate-300 text-slate-800'}`}>
              {allSpecializedAdmins.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hierarchicalTree')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-2 shrink-0 ${activeTab === 'hierarchicalTree'
              ? 'bg-[#2d1b64] text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>العرض الهرمي الشامل</span>
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="relative min-w-[200px]">
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="ابحث باسم القطاع أو الإدارة..."
              className="w-full pr-8 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 font-medium"
            />
            <Search className="w-3.5 h-3.5 absolute inset-y-0 right-2.5 my-auto text-slate-400" />
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
            className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="طباعة التقرير التنفيذي"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة</span>
          </button>
        </div>
      </div>

      {/* Drill-down Alert Banner */}
      {(drilledSector || drilledCategory !== 'all') && (
        <div className="p-3 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-blue-400/40 shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-sky-400 shrink-0" />
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
            className="px-2.5 py-1 bg-rose-600/30 hover:bg-rose-600/40 text-rose-200 rounded-lg text-xs font-bold transition border border-rose-400/40 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>إلغاء التصفية</span>
          </button>
        </div>
      )}

      {/* Header labels for the 6 boxes aligned with rows */}
      <div className="hidden xl:flex items-center justify-between px-5 text-xs font-extrabold text-slate-500 select-none">
        <span>الإدارة العامة للتنفيذ / القطاع والمستهدفات</span>
        <div className="flex items-center gap-1 sm:gap-1.5 text-center font-bold">
          <span className="w-11 sm:w-12 text-emerald-800">إجمالي المنفذ</span>
          <span className="w-10 sm:w-11 text-green-800">بشهادة</span>
          <span className="w-10 sm:w-11 text-teal-800">طرف المنطقة</span>
          <span className="w-10 sm:w-11 text-sky-800">بدون شهادة</span>
          <span className="w-10 sm:w-11 text-rose-800">جاري العمل</span>
          <span className="w-10 sm:w-11 text-red-800">جاري التصاريح</span>
        </div>
      </div>

      {/* =========================================================================
          5. CARDS LIST VIEW (مطابق 100% لتصميم الصفوف في الصورة المرفقة)
          ========================================================================= */}
      {activeTab !== 'hierarchicalTree' ? (
        <div className="space-y-3">
          {displayedRows.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
              لا توجد إدارات أو بيانات مطابقة للبحث الحالي
            </div>
          ) : (
            displayedRows.map((row) => renderExecutiveCardRow(row))
          )}
        </div>
      ) : (
        /* Hierarchical Tree Accordion Mode */
        <div className="space-y-3">
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

          <div className="space-y-3">
            {sectorMetricsList.map((sec) => {
              const isSecExpanded = Boolean(expandedSectors[sec.sector]);
              return (
                <div key={sec.id} className="space-y-2">
                  {renderExecutiveCardRow(sec, {
                    showAccordion: true,
                    isExpanded: isSecExpanded,
                    onToggle: () => toggleSector(sec.sector),
                  })}

                  {/* Sub-administrations rendered as cards */}
                  {isSecExpanded && (
                    <div className="mr-6 space-y-2.5 pr-2 border-r-2 border-purple-300">
                      {sec.administrations.map((adm) => {
                        const admKey = `${sec.sector}_${adm.name}`;
                        const isAdmExpanded = Boolean(expandedAdmins[admKey]);

                        return (
                          <div key={adm.id} className="space-y-2">
                            {renderExecutiveCardRow(adm, {
                              showAccordion: adm.competentAdmins.length > 0,
                              isExpanded: isAdmExpanded,
                              onToggle: () => toggleAdmin(admKey),
                            })}

                            {/* Sub-competent administrations */}
                            {isAdmExpanded && adm.competentAdmins.length > 0 && (
                              <div className="mr-6 space-y-2 pr-2 border-r-2 border-indigo-200">
                                {adm.competentAdmins.map((comp) => renderExecutiveCardRow(comp))}
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

      {/* =========================================================================
          6. GRAND TOTAL BOTTOM SUMMARY ROW (الإجمالي الكلي)
          ========================================================================= */}
      <div className="bg-[#1e293b] text-white rounded-2xl p-4 shadow-lg flex flex-col xl:flex-row items-center justify-between gap-4 select-none">
        <div className="text-right">
          <h3 className="font-extrabold text-sm sm:text-base text-white">
            الإجمالي الكلي ({allGeneralAdmins.length} إدارات عامة)
          </h3>
          <p className="text-slate-300 text-xs mt-0.5 font-mono">
            التارجت: {totals.target} موقع — المنفذ: {totals.executed} ({totals.achievementRate}%) — المتبقي: {totals.remaining} موقع
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 text-xs font-mono font-bold">
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1.5 rounded-xl">
            المنفذ: {totals.executed}
          </span>
          <span className="bg-white/10 px-2.5 py-1.5 rounded-xl text-slate-200">
            بشهادة: {totals.withCert}
          </span>
          <span className="bg-white/10 px-2.5 py-1.5 rounded-xl text-slate-200">
            طرف المنطقة: {totals.byRegion}
          </span>
          <span className="bg-white/10 px-2.5 py-1.5 rounded-xl text-slate-200">
            بدون شهادة: {totals.noCert}
          </span>
          <span className="bg-rose-500/20 text-rose-300 border border-rose-400/30 px-2.5 py-1.5 rounded-xl">
            جاري العمل: {totals.inProgress}
          </span>
          <span className="bg-rose-500/20 text-rose-300 border border-rose-400/30 px-2.5 py-1.5 rounded-xl">
            جاري التصاريح: {totals.permits + totals.blocked}
          </span>
        </div>
      </div>

      {/* =========================================================================
          7. FOOTER NOTE matching bottom of the image
          ========================================================================= */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 font-medium select-none">
        <span className="text-right">
          ملاحظة: المنفذ مقسم لـ 3 درجات أخضر (بشهادة / طرف المنطقة / بدون شهادة)، والمتبقي مقسم لدرجتين أحمر (أحمر داكن: جاري العمل أولاً، يليه أحمر فاتح: جاري التصاريح).
        </span>
        <span className="text-left font-mono text-slate-400">
          Verified Data • WE Visual Monitoring Dashboard
        </span>
      </div>

    </div>
  );
};

export default WeExecutiveReportView;
