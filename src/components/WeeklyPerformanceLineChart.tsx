// src/components/WeeklyPerformanceLineChart.tsx
// Executive Interactive Weekly Performance & SLA Line Chart
// Supports both:
// 1. Operator FTTS Mobile Rollout Mode (WE, Vodafone, Orange - October & November Weekly Target vs Delivered Dataset)
// 2. Availability Projects Mode (Weekly SLA / 3-Month Execution Window: Target vs Achieved vs Overdue)

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { SiteRecord, FilterState } from '../types/dashboard';
import {
  TrendingUp,
  Calendar,
  CheckCircle2,
  Zap,
  Activity,
  Layers,
  Sparkles,
  Info,
  Clock,
  AlertTriangle,
  Target,
  CheckCheck,
  ShieldAlert,
  BarChart3,
  CalendarCheck2,
  Building2,
  Smartphone,
  ChevronDown,
  ArrowUpRight,
  Filter,
  Search,
  X,
  Download,
  FileSpreadsheet,
  Eye
} from 'lucide-react';
import {
  OPERATOR_WEEKS,
  CANONICAL_DEPARTMENTS,
  toCanonicalDepartment,
  getOperatorWeeklyRollout,
  type OperatorWeeklySummary,
  type OperatorWeekAggregated,
} from '../data/operatorWeeklyRolloutData';

export interface WeeklyPerformanceLineChartProps {
  sites: SiteRecord[];
  filters: FilterState;
  currentWeek?: number;
  activeScope?: string;
}

export interface OverdueBreakdown {
  total: number;
  clientHold: number;        // متوقف على العميل / تم الخروج
  permits: number;           // واقف تصاريح
  motaazer: number;          // متعذر
  obstacles: number;         // معوقات تنفيذية
  externalProgress: number;  // جاري مسار خارجي
  internalStalled: number;   // مسار داخلي آخر
  splicingStalled: number;   // لحامات
  other: number;             // قيد الاستكمال / أخرى
  clientHoldSites?: SiteRecord[];
  permitsSites?: SiteRecord[];
  motaazerSites?: SiteRecord[];
  obstaclesSites?: SiteRecord[];
  externalProgressSites?: SiteRecord[];
  internalStalledSites?: SiteRecord[];
  splicingStalledSites?: SiteRecord[];
  otherSites?: SiteRecord[];
}

export interface AvailabilityWeekDataPoint {
  week: number;
  arabicName: string;
  dateRange: string;
  targetThisWeek: number;
  achievedThisWeek: number;
  overdueThisWeek: number;
  cumTarget: number;
  cumAchieved: number;
  cumOverdue: number;
  deliveredLast5Weeks: number;
  startedUndeliveredCount: number;
  targetSites: SiteRecord[];
  achievedSites: SiteRecord[];
  deliveredLast5WeeksSites: SiteRecord[];
  overdueSites: SiteRecord[];
  startedUndeliveredSites: SiteRecord[];
  overdueBreakdown: OverdueBreakdown;
  startedBreakdown: OverdueBreakdown;
}

const ARABIC_ORDINALS: Record<number, string> = {
  1: 'الأول',
  2: 'الثاني',
  3: 'الثالث',
  4: 'الرابع',
  5: 'الخامس',
  6: 'السادس',
  7: 'السابع',
  8: 'الثامن',
  9: 'التاسع',
  10: 'العاشر',
  11: 'الحادي عشر',
  12: 'الثاني عشر',
  13: 'الثالث عشر',
  14: 'الرابع عشر',
  15: 'الخامس عشر',
  16: 'السادس عشر',
  17: 'السابع عشر',
  18: 'الثامن عشر',
  19: 'التاسع عشر',
  20: 'العشرون',
  21: 'الحادي والعشرون',
  22: 'الثاني والعشرون',
  23: 'الثالث والعشرون',
  24: 'الرابع والعشرون',
  25: 'الخامس والعشرون',
  26: 'السادس والعشرون',
  27: 'السابع والعشرون',
  28: 'الثامن والعشرون',
  29: 'التاسع والعشرون',
  30: 'الثلاثون',
  31: 'الحادي والثلاثون',
  32: 'الثاني والثلاثون',
  33: 'الثالث والثلاثون',
  34: 'الرابع والثلاثون',
  35: 'الخامس والثلاثون',
  36: 'السادس والثلاثون',
  37: 'السابع والثلاثون',
  38: 'الثامن والثلاثون',
  39: 'التاسع والثلاثون',
  40: 'الأربعون',
  41: 'الحادي والأربعون',
  42: 'الثاني والأربعون',
  43: 'الثالث والأربعون',
  44: 'الرابع والأربعون',
  45: 'الخامس والأربعون',
  46: 'السادس والأربعون',
  47: 'السابع والأربعون',
  48: 'الثامن والأربعون',
  49: 'التاسع والأربعون',
  50: 'الخمسون',
  51: 'الحادي والخمسون',
  52: 'الثاني والخمسون',
};

function getWeekDateRange(w: number, year = 2026): string {
  const weekStart = new Date(year, 0, 1 + (w - 1) * 7);
  const weekEnd = new Date(year, 0, 1 + (w - 1) * 7 + 6);
  const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
  if (startMonth === endMonth) {
    return `${startMonth} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${year}`;
  }
  return `${startMonth} ${weekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}, ${year}`;
}

// Robust date parser supporting Excel serial numbers, ISO strings, and standard dates
function parseDateSafe(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '0' || trimmed === '-' || trimmed === 'N/A' || trimmed === 'null' || trimmed === 'undefined') {
      return null;
    }
    let d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
    const parts = trimmed.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        if (!isNaN(d.getTime())) return d;
      }
      if (parts[0].length === 4) {
        d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (!isNaN(d.getTime())) return d;
      }
    }
  }
  return null;
}

// ISO Week Number and Year calculator
function getWeekNumber(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: date.getUTCFullYear(), week: Math.max(1, Math.min(52, weekNo)) };
}

// Generate smooth cubic bezier SVG path starting from the origin (0,0)
function getSmoothCurvePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export const WeeklyPerformanceLineChart: React.FC<WeeklyPerformanceLineChartProps> = ({
  sites,
  filters,
  currentWeek = 47,
  activeScope,
}) => {
  // Chart Display Mode: 'cumulative' | 'weekly'
  const [viewMode, setViewMode] = useState<'cumulative' | 'weekly'>('cumulative');
  const [hoveredWeekIndex, setHoveredWeekIndex] = useState<number | null>(null);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Interactive Site Inspection Modal State
  const [inspectionModal, setInspectionModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    weekNumber: number;
    sites: SiteRecord[];
  } | null>(null);
  const [modalSearch, setModalSearch] = useState('');

  const openInspection = (title: string, subtitle: string, weekNumber: number, sitesList: SiteRecord[]) => {
    setModalSearch('');
    setInspectionModal({
      isOpen: true,
      title,
      subtitle,
      weekNumber,
      sites: sitesList,
    });
  };

  const closeInspection = () => {
    setInspectionModal(null);
    setModalSearch('');
  };

  // Filtered sites inside the inspection modal
  const filteredModalSites = useMemo(() => {
    if (!inspectionModal || !inspectionModal.sites) return [];
    if (!modalSearch.trim()) return inspectionModal.sites;
    const q = modalSearch.trim().toLowerCase();
    return inspectionModal.sites.filter((s) => {
      const raw = s.rawRecord || {};
      const text = [
        s.id,
        s.name,
        s.sector,
        s.generalAdmin,
        s.internalPath,
        s.externalPath,
        (s as any).splicingStatus,
        s.classification,
        s.obstacleReason,
        s.deliveryStatus,
        raw['كود الموقع'],
        raw['اسم الموقع'],
        raw['موقف التسليم'],
        raw['موقف المسار الداخلي'],
        raw['موقف المسار الخارجي'],
        raw['موقف اللحامات'],
        raw['التصنيف النهائي'],
        raw['سبب المعوق او التعذر'],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(q);
    });
  }, [inspectionModal?.sites, modalSearch]);

  const exportInspectionToCSV = (sitesToExport: SiteRecord[], title: string, weekNum: number) => {
    const headers = [
      'كود الموقع / المشروع',
      'اسم الموقع / العميل',
      'القطاع',
      'الإدارة العامة للتنفيذ',
      'تاريخ السداد والبدء في التنفيذ',
      'موقف التسليم',
      'تاريخ التسليم',
      'موقف المسار الداخلي',
      'موقف المسار الخارجي',
      'موقف اللحامات',
      'التصنيف النهائي',
      'سبب المعوق او التعذر',
    ];

    const rows = sitesToExport.map((s) => {
      const raw = s.rawRecord || {};
      const delStatus = String(
        s.deliveryStatus ||
        raw['موقف التسليم'] ||
        raw['موقف_التسليم'] ||
        (s.status === 'تم التسليم' ? 'تم التسليم' : 'لم يتم')
      ).trim();

      return [
        s.id || raw['كود الموقع'] || raw['site_id'] || '',
        s.name || raw['اسم الموقع'] || raw['اسم المشروع'] || '',
        s.sector || raw['القطاع'] || raw['قطاع التنفيذ'] || '',
        s.generalAdmin || raw['الإدارة العامة'] || raw['الإدارة العامة للتنفيذ'] || '',
        s.paymentAndStartDate || raw['تاريخ السداد والبدء في التنفيذ'] || '',
        delStatus,
        s.deliveryDate || (s as any).delivery_date || raw['تاريخ التسليم'] || raw['تاريخ التسليم '] || '',
        s.internalPath || raw['موقف المسار الداخلي'] || '',
        s.externalPath || raw['موقف المسار الخارجي'] || '',
        (s as any).splicingStatus || raw['موقف اللحامات'] || '',
        s.classification || raw['التصنيف النهائي'] || raw['التصنيف'] || '',
        s.obstacleReason || raw['سبب المعوق او التعذر'] || '',
      ];
    });

    const csvContent =
      '\uFEFF' +
      [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${title.replace(/[\/\s:]+/g, '_')}_Week_${weekNum}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Detect if current scope is Availability Projects
  const isAvailability = useMemo(() => {
    return (
      activeScope === 'AVAILABILITY' ||
      activeScope === 'ETAHA' ||
      filters.company === 'Availability' ||
      filters.company === 'الإتاحة' ||
      sites.some(
        (s) =>
          s.id?.startsWith('ETAH-') ||
          s.company === 'Availability' ||
          s.company === 'الإتاحة' ||
          s.rawRecord?.['المشروع'] === 'اتاحة' ||
          Boolean(s.paymentAndStartDate)
      )
    );
  }, [activeScope, filters.company, sites]);

  // Current As-Of Date (November 2026 dataset reference)
  const asOfDate = useMemo(() => new Date('2026-11-23T23:59:59Z'), []);

  // ─────────────────────────────────────────────────────────────
  // 1. OPERATOR SELECTION (WE, Vodafone, Orange, All)
  // ─────────────────────────────────────────────────────────────
  const initialCompany = useMemo<'Vodafone' | 'Orange' | 'WE' | 'All'>(() => {
    const comp = String(filters.company || '').trim();
    if (comp === 'WE' || comp === 'Vodafone' || comp === 'Orange') return comp;
    const sc = String(activeScope || '').toUpperCase();
    if (sc === 'WE') return 'WE';
    if (sc === 'VODAFONE') return 'Vodafone';
    if (sc === 'ORANGE') return 'Orange';
    return 'All';
  }, [filters.company, activeScope]);

  const [selectedOperator, setSelectedOperator] = useState<'Vodafone' | 'Orange' | 'WE' | 'All'>(initialCompany);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string | null>(null);

  // Sync operator when top filter changes
  useEffect(() => {
    const comp = String(filters.company || '').trim();
    if (comp === 'WE' || comp === 'Vodafone' || comp === 'Orange') {
      setSelectedOperator(comp);
    } else {
      const sc = String(activeScope || '').toUpperCase();
      if (sc === 'WE') setSelectedOperator('WE');
      else if (sc === 'VODAFONE') setSelectedOperator('Vodafone');
      else if (sc === 'ORANGE') setSelectedOperator('Orange');
      else if (comp === 'All') setSelectedOperator('All');
    }
  }, [filters.company, activeScope]);

  // Active general department filter from dashboard or local selector
  const activeDeptFilter = useMemo(() => {
    if (selectedDeptFilter) return selectedDeptFilter;
    if (filters.generalAdmin) {
      if (Array.isArray(filters.generalAdmin) && filters.generalAdmin.length > 0) {
        return filters.generalAdmin;
      }
      if (typeof filters.generalAdmin === 'string' && filters.generalAdmin && filters.generalAdmin !== 'All' && filters.generalAdmin !== 'ALL') {
        return filters.generalAdmin;
      }
    }
    return undefined;
  }, [selectedDeptFilter, filters.generalAdmin]);

  // Operator Rollout Data (Parsed from official operations Excel & synchronized with live sites)
  const operatorRollout: OperatorWeeklySummary = useMemo(() => {
    return getOperatorWeeklyRollout(selectedOperator, activeDeptFilter, sites);
  }, [selectedOperator, activeDeptFilter, sites]);

  // ─────────────────────────────────────────────────────────────
  // 2. AVAILABILITY WEEKLY SLA / 3-MONTH DELIVERY CALCULATION
  // ─────────────────────────────────────────────────────────────
  const availabilityStats = useMemo(() => {
    if (!isAvailability) {
      return {
        totalSites: 0,
        totalTarget: 0,
        totalAchieved: 0,
        totalOverdue: 0,
        totalWithinSla: 0,
        onTimeRate: 0,
        weeklyPoints: [] as AvailabilityWeekDataPoint[],
      };
    }

    const totalWeeks = Math.min(Math.max(currentWeek, 47), 52);

    const processedSites = sites.map((site) => {
      const raw = site.rawRecord || {};
      const pVal =
        site.paymentAndStartDate ||
        raw['تاريخ السداد والبدء في التنفيذ'] ||
        raw['تاريخ السداد و البدء فى التنفيذ'] ||
        raw['تاريخ السداد والبدء فى التنفيذ'] ||
        raw['تاريخ السداد'] ||
        raw.paymentAndStartDate ||
        raw.payment_and_start_date;
      const dVal =
        site.deliveryDate ||
        (site as any).delivery_date ||
        raw['تاريخ التسليم '] ||
        raw['تاريخ التسليم'] ||
        raw.deliveryDate ||
        raw.delivery_date;

      const pDate = parseDateSafe(pVal);
      const dDate = parseDateSafe(dVal);

      // 1. Delivery Status Rule: Strictly from "موقف التسليم" column
      // "تم التسليم" = delivered, "لم يتم" = not delivered
      const rawDelStatus = String(
        site.deliveryStatus ||
        site.deliveryArea ||
        raw['موقف التسليم'] ||
        raw['موقف_التسليم'] ||
        raw['موقف التسليم '] ||
        ''
      ).trim();

      let isDelivered = false;
      if (rawDelStatus === 'تم التسليم') {
        isDelivered = true;
      } else if (rawDelStatus === 'لم يتم') {
        isDelivered = false;
      } else {
        isDelivered = site.status === 'تم التسليم' || site.status === 'تم الانتهاء والتسليم';
      }

      // 2. Start Week: Based on "تاريخ السداد والبدء في التنفيذ"
      let startWeek: number | null = null;
      if (pDate) {
        const pInfo = getWeekNumber(pDate);
        if (pInfo.year < 2026 || pInfo.week <= 1) {
          startWeek = 1;
        } else if (pInfo.year === 2026) {
          startWeek = Math.min(pInfo.week, totalWeeks);
        } else {
          startWeek = 999;
        }
      }

      // 3. SLA Expiration Week: 3 months from "تاريخ السداد والبدء في التنفيذ"
      let slaExpirationWeek: number = 999;
      if (pDate) {
        const targetDate = new Date(pDate.getTime());
        targetDate.setMonth(targetDate.getMonth() + 3);
        const tInfo = getWeekNumber(targetDate);
        if (tInfo.year < 2026) {
          slaExpirationWeek = 1;
        } else if (tInfo.year === 2026) {
          const iso = targetDate.toISOString().slice(0, 10);
          // Reconcile boundary on Nov 23 (Week 47 / 48 cutoff):
          // Sites that reach 3 months SLA on or before 23 November 2026 fall into week 47
          if (iso <= '2026-11-23' && tInfo.week === 48) {
            slaExpirationWeek = 47;
          } else {
            slaExpirationWeek = tInfo.week;
          }
        } else {
          // Expires in 2027 or later (e.g. 062-1-44 on 2027-01-07)
          slaExpirationWeek = 999;
        }
      }

      // 4. Delivery Week: Week when the site was delivered
      let deliveryWeek: number | null = null;
      if (isDelivered) {
        if (dDate) {
          const dInfo = getWeekNumber(dDate);
          if (dInfo.year < 2026 || dInfo.week <= 1) {
            deliveryWeek = 1;
          } else if (dInfo.year === 2026) {
            deliveryWeek = Math.min(dInfo.week, totalWeeks);
          } else {
            deliveryWeek = totalWeeks;
          }
        } else {
          deliveryWeek = startWeek !== null && startWeek <= totalWeeks ? startWeek : Math.min(currentWeek, 45);
        }
      }

      const intPath = String(site.internalPath || raw['موقف المسار الداخلي'] || raw['المسار الداخلى'] || raw['المسار الداخلي'] || '').trim();
      const extPath = String(site.externalPath || raw['موقف المسار الخارجي'] || raw['المسار الخارجي'] || '').trim();
      const splicing = String((site as any).splicingStatus || raw['موقف اللحامات'] || raw['اللحامات'] || '').trim();
      const classification = String(site.classification || raw['التصنيف النهائي'] || raw['التصنيف'] || '').trim();
      const obstacle = String(site.obstacleReason || raw['سبب المعوق او التعذر'] || raw['اسباب التعذر'] || '').trim();

      // Categorize obstacle / stalling reason based strictly on Availability master classification
      let category:
        | 'clientHold'
        | 'permits'
        | 'motaazer'
        | 'obstacles'
        | 'externalProgress'
        | 'internalStalled'
        | 'splicingStalled'
        | 'other' = 'other';

      if (classification.includes('عميل')) {
        category = 'clientHold';
      } else if (classification.includes('تصاريح') || extPath.includes('تصاريح')) {
        category = 'permits';
      } else if (classification.includes('تعذر') || classification.includes('متعذر') || classification.includes('متعثر')) {
        category = 'motaazer';
      } else if (classification.includes('معوق') || obstacle.includes('معوق')) {
        category = 'obstacles';
      } else if (classification.includes('جاري خارجي') || (extPath && !extPath.includes('تم'))) {
        category = 'externalProgress';
      } else if (intPath && !intPath.includes('تم')) {
        category = 'internalStalled';
      } else if (splicing && !splicing.includes('تم')) {
        category = 'splicingStalled';
      } else {
        category = 'other';
      }

      return {
        site,
        startWeek,
        slaExpirationWeek,
        isDelivered,
        deliveryWeek,
        intPath,
        extPath,
        splicing,
        classification,
        obstacle,
        category,
      };
    });

    const weeklyPoints: AvailabilityWeekDataPoint[] = [];

    const buildBreakdown = (items: typeof processedSites): OverdueBreakdown => {
      const clientHoldSites = items.filter((s) => s.category === 'clientHold').map((s) => s.site);
      const permitsSites = items.filter((s) => s.category === 'permits').map((s) => s.site);
      const motaazerSites = items.filter((s) => s.category === 'motaazer').map((s) => s.site);
      const obstaclesSites = items.filter((s) => s.category === 'obstacles').map((s) => s.site);
      const externalProgressSites = items.filter((s) => s.category === 'externalProgress').map((s) => s.site);
      const internalStalledSites = items.filter((s) => s.category === 'internalStalled').map((s) => s.site);
      const splicingStalledSites = items.filter((s) => s.category === 'splicingStalled').map((s) => s.site);
      const otherSites = items.filter((s) => s.category === 'other').map((s) => s.site);

      return {
        total: items.length,
        clientHold: clientHoldSites.length,
        permits: permitsSites.length,
        motaazer: motaazerSites.length,
        obstacles: obstaclesSites.length,
        externalProgress: externalProgressSites.length,
        internalStalled: internalStalledSites.length,
        splicingStalled: splicingStalledSites.length,
        other: otherSites.length,
        clientHoldSites,
        permitsSites,
        motaazerSites,
        obstaclesSites,
        externalProgressSites,
        internalStalledSites,
        splicingStalledSites,
        otherSites,
      };
    };

    for (let w = 1; w <= totalWeeks; w++) {
      // 1. المستهدف التراكمي: Cumulative sites with payment and start date up to week w
      const targetMatches = processedSites.filter((s) => s.startWeek !== null && s.startWeek <= w);
      const targetSites = targetMatches.map((s) => s.site);
      const targetThisWeek = processedSites.filter((s) => s.startWeek === w).length;

      // 2. المحقق التراكمي: Cumulative delivered sites up to week w
      const achievedMatches = processedSites.filter((s) => s.isDelivered && s.deliveryWeek !== null && s.deliveryWeek <= w);
      const achievedSites = achievedMatches.map((s) => s.site);
      const achievedThisWeek = processedSites.filter((s) => s.isDelivered && s.deliveryWeek === w).length;

      // 3. المسلمة آخر 5 أسابيع: Rolling 5-week window
      const deliveredLast5WeeksMatches = processedSites.filter(
        (s) => s.isDelivered && s.deliveryWeek !== null && s.deliveryWeek >= Math.max(1, w - 4) && s.deliveryWeek <= w
      );
      const deliveredLast5WeeksSites = deliveredLast5WeeksMatches.map((s) => s.site);

      // 4. المتجاوزة 3 أشهر وغير مسلمة as of week w
      const overdueMatches = processedSites.filter(
        (s) => s.slaExpirationWeek <= w && (!s.isDelivered || (s.deliveryWeek !== null && s.deliveryWeek > w))
      );
      const overdueSites = overdueMatches.map((s) => s.site);
      const overdueThisWeek = processedSites.filter(
        (s) => s.slaExpirationWeek === w && (!s.isDelivered || (s.deliveryWeek !== null && s.deliveryWeek > w))
      ).length;
      const overdueBreakdown = buildBreakdown(overdueMatches);

      // 5. بدأت التنفيذ ولم تسلم بعد as of week w
      const startedUndeliveredMatches = processedSites.filter(
        (s) => s.startWeek !== null && s.startWeek <= w && (!s.isDelivered || (s.deliveryWeek !== null && s.deliveryWeek > w))
      );
      const startedUndeliveredSites = startedUndeliveredMatches.map((s) => s.site);
      const startedBreakdown = buildBreakdown(startedUndeliveredMatches);

      weeklyPoints.push({
        week: w,
        arabicName: ARABIC_ORDINALS[w] || `${w}`,
        dateRange: getWeekDateRange(w, 2026),
        targetThisWeek,
        achievedThisWeek,
        overdueThisWeek,
        cumTarget: targetSites.length,
        cumAchieved: achievedSites.length,
        cumOverdue: overdueSites.length,
        deliveredLast5Weeks: deliveredLast5WeeksSites.length,
        startedUndeliveredCount: startedUndeliveredSites.length,
        targetSites,
        achievedSites,
        deliveredLast5WeeksSites,
        overdueSites,
        startedUndeliveredSites,
        overdueBreakdown,
        startedBreakdown,
      });
    }

    const latestPoint = weeklyPoints[weeklyPoints.length - 1];
    const totalDeliveredAll = processedSites.filter((s) => s.isDelivered).length;
    const latestOverdue = latestPoint ? latestPoint.cumOverdue : 0;
    const withinSlaCount = Math.max(0, sites.length - totalDeliveredAll - latestOverdue);
    const onTimeRate = sites.length > 0 ? Math.round((totalDeliveredAll / sites.length) * 100) : 100;

    return {
      totalSites: sites.length,
      totalTarget: sites.length,
      totalAchieved: totalDeliveredAll,
      totalOverdue: latestOverdue,
      totalWithinSla: withinSlaCount,
      onTimeRate,
      weeklyPoints,
    };
  }, [isAvailability, sites, currentWeek]);

  // ─────────────────────────────────────────────────────────────
  // 3. SVG GEOMETRY AND SCALING (Origin 0,0 strictly anchored)
  // ─────────────────────────────────────────────────────────────
  const svgWidth = 1000;
  const svgHeight = 360;
  const marginLeft = 65;
  const marginRight = 35;
  const marginTop = 30;
  const marginBottom = 55;

  const chartWidth = svgWidth - marginLeft - marginRight;
  const chartHeight = svgHeight - marginTop - marginBottom;

  const originX = marginLeft;
  const originY = svgHeight - marginBottom;

  // Total steps on X-axis: 6 weeks for operators, 47..52 for Availability
  const totalSteps = isAvailability ? availabilityStats.weeklyPoints.length : operatorRollout.weeks.length;

  // Maximum value for Y scaling
  const maxY = useMemo(() => {
    if (isAvailability) {
      if (viewMode === 'cumulative') {
        const maxVal = Math.max(
          10,
          ...availabilityStats.weeklyPoints.map((d) => Math.max(d.cumTarget, d.cumAchieved, d.cumOverdue))
        );
        return Math.max(10, Math.ceil((maxVal * 1.15) / 10) * 10);
      } else {
        const maxWeekly = Math.max(
          1,
          ...availabilityStats.weeklyPoints.map((d) => Math.max(d.targetThisWeek, d.achievedThisWeek, d.overdueThisWeek))
        );
        return Math.max(5, Math.ceil((maxWeekly * 1.25) / 5) * 5);
      }
    } else {
      // Operator Mode (supports both Cumulative & Weekly views)
      if (viewMode === 'cumulative') {
        const maxSite = Math.max(
          10,
          ...operatorRollout.weeks.map((d) => Math.max(d.targetRate, d.delivered, d.deliveredLast5Weeks))
        );
        return Math.max(10, Math.ceil((maxSite * 1.15) / 10) * 10);
      } else {
        const maxWeekly = Math.max(
          5,
          ...operatorRollout.weeks.map((d) => Math.max(d.deliveredThisWeek, d.deliveredLast5Weeks))
        );
        return Math.max(5, Math.ceil((maxWeekly * 1.25) / 5) * 5);
      }
    }
  }, [isAvailability, viewMode, availabilityStats.weeklyPoints, operatorRollout.weeks]);

  // Coordinate scales
  const getX = (stepIndex: number) => originX + (stepIndex / totalSteps) * chartWidth;
  const getY = (val: number) => originY - (Math.max(0, val) / (maxY || 1)) * chartHeight;

  // ── Availability Points ──
  const availabilityTargetPoints = useMemo(() => {
    if (!isAvailability) return [];
    const pts = [{ x: originX, y: originY }];
    availabilityStats.weeklyPoints.forEach((d) => {
      const val = viewMode === 'cumulative' ? d.cumTarget : d.targetThisWeek;
      pts.push({ x: getX(d.week), y: getY(val) });
    });
    return pts;
  }, [isAvailability, availabilityStats.weeklyPoints, viewMode, originX, originY, maxY]);

  const availabilityAchievedPoints = useMemo(() => {
    if (!isAvailability) return [];
    const pts = [{ x: originX, y: originY }];
    availabilityStats.weeklyPoints.forEach((d) => {
      const val = viewMode === 'cumulative' ? d.cumAchieved : d.achievedThisWeek;
      pts.push({ x: getX(d.week), y: getY(val) });
    });
    return pts;
  }, [isAvailability, availabilityStats.weeklyPoints, viewMode, originX, originY, maxY]);

  const availabilityOverduePoints = useMemo(() => {
    if (!isAvailability) return [];
    const pts = [{ x: originX, y: originY }];
    availabilityStats.weeklyPoints.forEach((d) => {
      const val = viewMode === 'cumulative' ? d.cumOverdue : d.overdueThisWeek;
      pts.push({ x: getX(d.week), y: getY(val) });
    });
    return pts;
  }, [isAvailability, availabilityStats.weeklyPoints, viewMode, originX, originY, maxY]);

  // ── Operator Mode Points (8 Weeks: Oct W1-W4 & Nov W1-W4) ──
  const operatorTargetPoints = useMemo(() => {
    if (isAvailability) return [];
    const pts = [{ x: originX, y: originY }];
    operatorRollout.weeks.forEach((w, idx) => {
      const val = viewMode === 'cumulative' ? w.targetRate : w.deliveredLast5Weeks;
      pts.push({ x: getX(idx + 1), y: getY(val) });
    });
    return pts;
  }, [isAvailability, operatorRollout.weeks, viewMode, originX, originY, maxY]);

  const operatorDeliveredPoints = useMemo(() => {
    if (isAvailability) return [];
    const pts = [{ x: originX, y: originY }];
    operatorRollout.weeks.forEach((w, idx) => {
      const val = viewMode === 'cumulative' ? w.delivered : w.deliveredThisWeek;
      pts.push({ x: getX(idx + 1), y: getY(val) });
    });
    return pts;
  }, [isAvailability, operatorRollout.weeks, viewMode, originX, originY, maxY]);

  const operatorTotalSitesPoints = useMemo(() => {
    if (isAvailability) return [];
    const pts = [{ x: originX, y: originY }];
    operatorRollout.weeks.forEach((w, idx) => {
      pts.push({ x: getX(idx + 1), y: getY(w.totalSites) });
    });
    return pts;
  }, [isAvailability, operatorRollout.weeks, originX, originY, maxY]);

  // Smooth Curves
  const availTargetCurve = useMemo(() => getSmoothCurvePath(availabilityTargetPoints), [availabilityTargetPoints]);
  const availAchievedCurve = useMemo(() => getSmoothCurvePath(availabilityAchievedPoints), [availabilityAchievedPoints]);
  const availOverdueCurve = useMemo(() => getSmoothCurvePath(availabilityOverduePoints), [availabilityOverduePoints]);

  const opTargetCurve = useMemo(() => getSmoothCurvePath(operatorTargetPoints), [operatorTargetPoints]);
  const opDeliveredCurve = useMemo(() => getSmoothCurvePath(operatorDeliveredPoints), [operatorDeliveredPoints]);
  const opTotalCurve = useMemo(() => getSmoothCurvePath(operatorTotalSitesPoints), [operatorTotalSitesPoints]);

  // Area Paths
  const availTargetArea = useMemo(() => {
    if (availabilityTargetPoints.length === 0) return '';
    const last = availabilityTargetPoints[availabilityTargetPoints.length - 1];
    return `${availTargetCurve} L ${last.x.toFixed(1)} ${originY} L ${originX} ${originY} Z`;
  }, [availTargetCurve, availabilityTargetPoints, originX, originY]);

  const opTargetArea = useMemo(() => {
    if (operatorTargetPoints.length === 0) return '';
    const last = operatorTargetPoints[operatorTargetPoints.length - 1];
    return `${opTargetCurve} L ${last.x.toFixed(1)} ${originY} L ${originX} ${originY} Z`;
  }, [opTargetCurve, operatorTargetPoints, originX, originY]);

  // Y-axis grid ticks (4 steps)
  const yTicks = useMemo(() => {
    const steps = 4;
    const ticks: { val: number; y: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const val = Math.round((maxY / steps) * i);
      ticks.push({ val, y: getY(val) });
    }
    return ticks;
  }, [maxY]);

  // Hovered Data
  const hoveredAvailabilityWeek = isAvailability && hoveredWeekIndex !== null
    ? availabilityStats.weeklyPoints[hoveredWeekIndex]
    : null;

  const hoveredOperatorWeek = !isAvailability && hoveredWeekIndex !== null
    ? operatorRollout.weeks[hoveredWeekIndex]
    : null;

  const hoveredPoint = useMemo(() => {
    if (hoveredWeekIndex === null) return null;
    if (isAvailability) {
      return availabilityAchievedPoints[hoveredWeekIndex + 1] || availabilityTargetPoints[hoveredWeekIndex + 1] || null;
    }
    return operatorDeliveredPoints[hoveredWeekIndex + 1] || operatorTargetPoints[hoveredWeekIndex + 1] || null;
  }, [hoveredWeekIndex, isAvailability, availabilityAchievedPoints, availabilityTargetPoints, operatorDeliveredPoints, operatorTargetPoints]);

  // Standardized English Company / Operator Label
  const companyLabelEn = useMemo(() => {
    switch (selectedOperator) {
      case 'WE':
        return 'FTTS • WE';
      case 'Vodafone':
        return 'FTTS • Vodafone';
      case 'Orange':
        return 'FTTS • Orange';
      default:
        return 'FTTS • All Operators';
    }
  }, [selectedOperator]);

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-sm my-6 transition-all duration-300">
      {/* ── Top Header Section ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 mb-5 border-b border-slate-100 gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md ring-4 ${isAvailability
              ? 'bg-gradient-to-br from-teal-600 via-sky-600 to-indigo-700 ring-teal-50'
              : 'bg-gradient-to-br from-indigo-600 via-sky-600 to-purple-700 ring-indigo-50'
              }`}
          >
            {isAvailability ? <CalendarCheck2 className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-slate-800 leading-tight">
                {isAvailability
                  ? 'المسار الأسبوعي ومتابعة التزام التسليم (Availability Weekly SLA & Delivery Tracking)'
                  : 'المسار الأسبوعي ومتابعة التزام التسليم (FTTS Weekly Progress & Delivery Commitment)'}
              </h3>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${isAvailability
                  ? 'bg-teal-50 text-teal-800 border-teal-200/80'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200/80'
                  }`}
              >
                {isAvailability ? 'Availability' : companyLabelEn}
              </span>
              {selectedDeptFilter && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-amber-600" />
                  <span>{selectedDeptFilter}</span>
                  <button
                    onClick={() => setSelectedDeptFilter(null)}
                    className="ml-1 text-amber-600 hover:text-amber-950 font-black cursor-pointer"
                    title="إلغاء التصفية الخاصة بالإدارة"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isAvailability
                ? `Availability Weekly SLA & Delivery Tracking (W1 – W${totalSteps}, 2026)`
                : `FTTS Weekly Progress (Oct – Nov 2026): Cumulative Target, Cumulative Achieved, & Last 5 Weeks`}
            </p>
          </div>
        </div>

        {/* View Mode & Operator Switcher */}
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {/* Operator Selector Pills (When not in Availability mode) */}
          {!isAvailability && (
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setSelectedOperator('All')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${selectedOperator === 'All'
                  ? 'bg-white text-indigo-700 shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                All Operators
              </button>
              <button
                onClick={() => setSelectedOperator('WE')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${selectedOperator === 'WE'
                  ? 'bg-purple-600 text-white shadow-2xs font-black'
                  : 'text-slate-600 hover:text-purple-700'
                  }`}
              >
                WE
              </button>
              <button
                onClick={() => setSelectedOperator('Vodafone')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${selectedOperator === 'Vodafone'
                  ? 'bg-rose-600 text-white shadow-2xs font-black'
                  : 'text-slate-600 hover:text-rose-700'
                  }`}
              >
                Vodafone
              </button>
              <button
                onClick={() => setSelectedOperator('Orange')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${selectedOperator === 'Orange'
                  ? 'bg-orange-600 text-white shadow-2xs font-black'
                  : 'text-slate-600 hover:text-orange-700'
                  }`}
              >
                Orange
              </button>
            </div>
          )}

          {/* View Mode Toggle (Works for BOTH Availability & FTTS Operators) */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setViewMode('cumulative')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${viewMode === 'cumulative'
                ? 'bg-white text-indigo-700 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              📈 المسار التراكمي
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${viewMode === 'weekly'
                ? 'bg-white text-indigo-700 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              📊 الإنجاز الأسبوعي
            </button>
          </div>

          {/* Quick Metrics Badges */}
          {isAvailability ? (
            <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
              <span className="bg-sky-50 text-sky-800 border border-sky-300 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-2xs">
                <Target className="w-3.5 h-3.5 text-sky-600" />
                <span>المستهدف: <strong>{availabilityStats.totalTarget}</strong></span>
              </span>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-2xs">
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>تم التسليم: <strong>{availabilityStats.totalAchieved}</strong></span>
              </span>
              <span className="bg-rose-50 text-rose-800 border border-rose-300 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-2xs">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>تجاوز المدة: <strong>{availabilityStats.totalOverdue}</strong></span>
              </span>
              <span className="bg-slate-900 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-2xs">
                <span>نسبة الإنجاز: <strong>{availabilityStats.onTimeRate}%</strong></span>
              </span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
              <span className="bg-sky-50 text-sky-800 border border-sky-200 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-sky-600" />
                <span>المعدل المطلوب (W2-Nov): <strong>{operatorRollout.latestWeek.targetRate}</strong></span>
              </span>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>تم التسليم: <strong>{operatorRollout.latestWeek.delivered}</strong></span>
              </span>
              <span className="bg-slate-900 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-2xs">
                <span>إجمالي المواقع: <strong>{operatorRollout.latestWeek.totalSites}</strong></span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Legend Bar ── */}
      <div className="flex items-center justify-between mb-3 px-2 text-xs font-bold flex-wrap gap-2">
        {isAvailability ? (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sky-700">
              <span className="w-4 h-1.5 bg-sky-500 rounded-full inline-block"></span>
              <span>المستهدف / التارجت (نافذة 3 أشهر من تاريخ السداد)</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700">
              <span className="w-4 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
              <span>ما تم تحقيقه (تم التسليم الفعلي)</span>
            </div>
            <div className="flex items-center gap-2 text-rose-700">
              <span className="w-4 h-1.5 bg-rose-500 rounded-full inline-block border-b-2 border-dashed border-rose-600"></span>
              <span>تجاوز المدة ولم يتم التسليم (متأخر عن 3 أشهر)</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sky-700">
              <span className="w-3.5 h-1 bg-sky-600 rounded-full inline-block"></span>
              <span>المعدل المطلوب تسليمه (Required Target Rate)</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700">
              <span className="w-3.5 h-1 bg-emerald-500 rounded-full inline-block"></span>
              <span>ما تم تسليمه فعلياً (Actual Delivered Sites)</span>
            </div>
            <div className="flex items-center gap-2 text-purple-700">
              <span className="w-3.5 h-1 bg-purple-500 rounded-full inline-block border-b-2 border-dashed border-purple-500"></span>
              <span>إجمالي عدد المواقع (Total Mobile Sites)</span>
            </div>
          </div>
        )}

        <div className="text-[11px] text-slate-500 font-normal">
          <span>{isAvailability ? 'Availability Weekly Tracking • 2026' : 'FTTS Weekly Rollout • Oct – Nov 2026'}</span>
        </div>
      </div>

      {/* ── Main SVG Line Chart Container ── */}
      <div className="relative select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible drop-shadow-2xs"
        >
          <defs>
            {/* Target Area Gradient */}
            <linearGradient id="targetAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
            </linearGradient>

            {/* Glowing Stroke Filter */}
            <filter id="lineGlowEmerald" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10b981" floodOpacity="0.35" />
            </filter>
            <filter id="targetGlowSky" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0284c7" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Horizontal Gridlines & Y-axis Labels */}
          {yTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={originX}
                y1={tick.y}
                x2={originX + chartWidth}
                y2={tick.y}
                stroke={tick.val === 0 ? '#64748b' : '#e2e8f0'}
                strokeWidth={tick.val === 0 ? '1.75' : '1'}
                strokeDasharray={tick.val === 0 ? undefined : '3 3'}
              />
              <text
                x={originX - 10}
                y={tick.y + 4}
                textAnchor="end"
                className="text-[11px] font-mono font-bold fill-slate-400"
              >
                {tick.val}
              </text>
            </g>
          ))}

          {/* Left Vertical Axis */}
          <line
            x1={originX}
            y1={marginTop}
            x2={originX}
            y2={originY}
            stroke="#64748b"
            strokeWidth="1.75"
          />

          {/* Bottom Horizontal Axis Label (Weeks) */}
          {isAvailability
            ? availabilityStats.weeklyPoints.map((d) => {
              const w = d.week;
              const showTick = w === 1 || w % 5 === 0 || w === totalSteps;
              if (!showTick) return null;
              const x = getX(w);
              return (
                <g key={w}>
                  <line x1={x} y1={originY} x2={x} y2={originY + 6} stroke="#64748b" strokeWidth="1.5" />
                  <text
                    x={x}
                    y={originY + 22}
                    textAnchor="middle"
                    className={`text-[11px] font-mono ${w === totalSteps ? 'font-black fill-teal-700 font-bold' : 'font-semibold fill-slate-500'
                      }`}
                  >
                    {w === totalSteps ? `W${w} (Current)` : `W${w}`}
                  </text>
                </g>
              );
            })
            : operatorRollout.weeks.map((w, idx) => {
              const x = getX(idx + 1);
              return (
                <g key={w.weekKey}>
                  <line x1={x} y1={originY} x2={x} y2={originY + 6} stroke="#64748b" strokeWidth="1.5" />
                  <text
                    x={x}
                    y={originY + 20}
                    textAnchor="middle"
                    className={`text-[11px] font-bold ${idx === operatorRollout.weeks.length - 1 ? 'fill-sky-800 font-black' : 'fill-slate-600'
                      }`}
                  >
                    {w.weekDef.shortAr}
                  </text>
                  <text
                    x={x}
                    y={originY + 34}
                    textAnchor="middle"
                    className="text-[9px] font-mono fill-slate-400"
                  >
                    {w.weekDef.dateRangeAr.replace(', 2026', '')}
                  </text>
                </g>
              );
            })}

          {/* Origin (0,0) Intersection Indicator */}
          <circle cx={originX} cy={originY} r="4" fill="#64748b" />
          <text
            x={originX - 8}
            y={originY + 16}
            textAnchor="end"
            className="text-[10px] font-bold fill-slate-400 font-mono"
          >
            0
          </text>

          {/* ───────────────────────────────────────────────────────── */}
          {/* AVAILABILITY RENDER PATHS                                 */}
          {/* ───────────────────────────────────────────────────────── */}
          {isAvailability ? (
            <>
              <path d={availTargetArea} fill="url(#targetAreaGrad)" />
              <path
                d={availTargetCurve}
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#targetGlowSky)"
              />
              <path
                d={availAchievedCurve}
                fill="none"
                stroke="#10b981"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#lineGlowEmerald)"
              />
              <path
                d={availOverdueCurve}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeDasharray="5 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.9"
              />

              {availabilityAchievedPoints.slice(1).map((pt, idx) => {
                const isHovered = hoveredWeekIndex === idx;
                const d = availabilityStats.weeklyPoints[idx];
                const achVal = viewMode === 'cumulative' ? d?.cumAchieved : d?.achievedThisWeek;
                if (!isHovered && achVal === 0) return null;

                return (
                  <circle
                    key={`ach-${idx}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 6 : 3.5}
                    fill={isHovered ? '#10b981' : '#ffffff'}
                    stroke="#10b981"
                    strokeWidth={isHovered ? '2.5' : '1.75'}
                    className="transition-all duration-150"
                  />
                );
              })}
            </>
          ) : (
            /* ───────────────────────────────────────────────────────── */
            /* OPERATOR RENDER PATHS (Target Rate vs Actual Delivered)   */
            /* ───────────────────────────────────────────────────────── */
            <>
              {/* Target Area Fill */}
              <path d={opTargetArea} fill="url(#targetAreaGrad)" />

              {/* Series 1: Total Mobile Sites Reference Line (Dashed) */}
              <path
                d={opTotalCurve}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="2"
                strokeDasharray="4 3"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.75"
              />

              {/* Series 2: Required Target Rate (Sky Curve) */}
              <path
                d={opTargetCurve}
                fill="none"
                stroke="#0284c7"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#targetGlowSky)"
              />

              {/* Series 3: Actual Delivered (Emerald Curve) */}
              <path
                d={opDeliveredCurve}
                fill="none"
                stroke="#10b981"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#lineGlowEmerald)"
              />

              {/* Circles on Target Rate Curve */}
              {operatorTargetPoints.slice(1).map((pt, idx) => {
                const isHovered = hoveredWeekIndex === idx;
                return (
                  <circle
                    key={`optgt-${idx}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 5.5 : 3.5}
                    fill={isHovered ? '#0284c7' : '#ffffff'}
                    stroke="#0284c7"
                    strokeWidth="2"
                    className="transition-all duration-150"
                  />
                );
              })}

              {/* Circles on Delivered Curve */}
              {operatorDeliveredPoints.slice(1).map((pt, idx) => {
                const isHovered = hoveredWeekIndex === idx;
                return (
                  <circle
                    key={`opdel-${idx}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 6.5 : 4}
                    fill={isHovered ? '#10b981' : '#ffffff'}
                    stroke="#10b981"
                    strokeWidth="2.5"
                    className="transition-all duration-150"
                  />
                );
              })}
            </>
          )}

          {/* Hover Tracker Vertical Line */}
          {hoveredPoint && (
            <g className="pointer-events-none">
              <line
                x1={hoveredPoint.x}
                y1={marginTop}
                x2={hoveredPoint.x}
                y2={originY}
                stroke={isAvailability ? '#0284c7' : '#0ea5e9'}
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="7"
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="2.5"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="13"
                fill="#10b981"
                opacity="0.2"
              />
            </g>
          )}

          {/* Invisible Interactive Columns for hover */}
          {(isAvailability ? availabilityStats.weeklyPoints : operatorRollout.weeks).map((_, idx) => {
            const colWidth = chartWidth / totalSteps;
            const x = originX + idx * colWidth;
            return (
              <rect
                key={idx}
                x={x}
                y={marginTop}
                width={colWidth}
                height={chartHeight + 10}
                fill="transparent"
                className="cursor-pointer"
                onClick={() => setSelectedWeekIndex(idx)}
                onMouseEnter={() => {
                  if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
                  setHoveredWeekIndex(idx);
                }}
                onMouseLeave={() => {
                  leaveTimeoutRef.current = setTimeout(() => {
                    setHoveredWeekIndex(null);
                  }, 200);
                }}
              />
            );
          })}
        </svg>

        {/* ── Hover Tooltip (Interactive Floating Details Card) ── */}
        {hoveredPoint && (
          <div
            className="absolute z-30 pointer-events-auto transition-all duration-75 animate-in fade-in zoom-in-95"
            style={{
              left: `${(hoveredPoint.x / svgWidth) * 100}%`,
              top: `${(hoveredPoint.y / svgHeight) * 100}%`,
              transform: `translate(${hoveredPoint.x > svgWidth * 0.72
                ? '-95%'
                : hoveredPoint.x < svgWidth * 0.28
                  ? '-5%'
                  : '-50%'
                }, ${hoveredPoint.y < 150 ? '16px' : '-105%'})`,
            }}
            onMouseEnter={() => {
              if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
            }}
            onMouseLeave={() => {
              setHoveredWeekIndex(null);
            }}
          >
            <div
              className={`text-white p-3.5 rounded-2xl shadow-2xl border text-right min-w-[320px] max-w-[380px] backdrop-blur-md ${isAvailability
                ? 'bg-slate-950/95 border-teal-500/40 shadow-teal-950/50'
                : 'bg-slate-950/95 border-sky-400/40 shadow-sky-950/40'
                }`}
            >
              {/* Header: Week number & Dates */}
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-700/80 gap-2">
                <span
                  className={`font-black text-xs flex items-center gap-1.5 ${isAvailability ? 'text-teal-300' : 'text-sky-300'
                    }`}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {isAvailability
                      ? `Week ${hoveredAvailabilityWeek?.week} (2026)`
                      : hoveredOperatorWeek?.weekDef.fullEn}
                  </span>
                </span>
                <span className="text-[10px] text-slate-300 font-mono">
                  {isAvailability ? hoveredAvailabilityWeek?.dateRange : hoveredOperatorWeek?.weekDef.dateRangeAr}
                </span>
              </div>

              {/* Tooltip Content for Availability */}
              {isAvailability && hoveredAvailabilityWeek ? (
                <div className="space-y-2 text-xs">
                  {/* 1. المستهدف التراكمي */}
                  <div
                    onClick={() =>
                      openInspection(
                        'المستهدف التراكمي',
                        'المشروعات التي بدأ سدادها وتنفيذها حتى نهاية هذا الأسبوع',
                        hoveredAvailabilityWeek.week,
                        hoveredAvailabilityWeek.targetSites
                      )
                    }
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-sky-500/30 hover:border-sky-400 hover:bg-sky-950/40 cursor-pointer transition-all duration-150 group"
                    title="انقر لعرض قائمة المشروعات"
                  >
                    <span className="flex items-center gap-1.5 text-slate-200 group-hover:text-sky-200">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0 group-hover:scale-110 transition-transform"></span>
                      <span className="font-bold">المستهدف التراكمي:</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-sky-300 text-sm">
                        {hoveredAvailabilityWeek.cumTarget}{' '}
                        <span className="text-[10px] font-sans font-normal text-slate-400">موقع</span>
                      </span>
                      <Eye className="w-3.5 h-3.5 text-sky-400/60 group-hover:text-sky-300 shrink-0" />
                    </div>
                  </div>

                  {/* 2. المحقق التراكمي */}
                  <div
                    onClick={() =>
                      openInspection(
                        'المحقق التراكمي (تم تسليمه)',
                        'المشروعات المسلّمة والمعتمدة رسمياً حتى هذا الأسبوع',
                        hoveredAvailabilityWeek.week,
                        hoveredAvailabilityWeek.achievedSites
                      )
                    }
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-950/40 cursor-pointer transition-all duration-150 group"
                    title="انقر لعرض قائمة المشروعات المسلّمة"
                  >
                    <span className="flex items-center gap-1.5 text-slate-200 group-hover:text-emerald-200">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 group-hover:scale-110 transition-transform"></span>
                      <span className="font-bold">المحقق التراكمي (تم تسليمه):</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-emerald-300 text-sm">
                        {hoveredAvailabilityWeek.cumAchieved}{' '}
                        <span className="text-[10px] font-sans font-normal text-slate-400">موقع</span>
                      </span>
                      <Eye className="w-3.5 h-3.5 text-emerald-400/60 group-hover:text-emerald-300 shrink-0" />
                    </div>
                  </div>

                  {/* 3. المسلمة آخر 5 أسابيع */}
                  <div
                    onClick={() =>
                      openInspection(
                        'المسلّمة آخر 5 أسابيع',
                        'المشروعات المسلّمة خلال نافذة الأسابيع الخمسة الأخيرة',
                        hoveredAvailabilityWeek.week,
                        hoveredAvailabilityWeek.deliveredLast5WeeksSites
                      )
                    }
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-teal-500/30 hover:border-teal-400 hover:bg-teal-950/40 cursor-pointer transition-all duration-150 group"
                    title="انقر لعرض مشروعات آخر 5 أسابيع"
                  >
                    <span className="flex items-center gap-1.5 text-slate-200 group-hover:text-teal-200">
                      <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="font-bold">المسلّمة آخر 5 أسابيع:</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-teal-300 text-sm">
                        {hoveredAvailabilityWeek.deliveredLast5Weeks}{' '}
                        <span className="text-[10px] font-sans font-normal text-slate-400">موقع</span>
                      </span>
                      <Eye className="w-3.5 h-3.5 text-teal-400/60 group-hover:text-teal-300 shrink-0" />
                    </div>
                  </div>

                  {/* 4. المتجاوزة 3 أشهر وغير مسلمة */}
                  <div className="p-2 rounded-xl bg-rose-950/50 border border-rose-500/40 space-y-1.5">
                    <div
                      onClick={() =>
                        openInspection(
                          'تجاوزت 3 أشهر وغير مسلّمة',
                          'المشروعات التي تجاوزت مهلة التنفيذ التعاقدية (3 أشهر) ولم يتم تسليمها بعد',
                          hoveredAvailabilityWeek.week,
                          hoveredAvailabilityWeek.overdueSites
                        )
                      }
                      className="flex items-center justify-between cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      <span className="flex items-center gap-1.5 text-rose-200 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>تجاوزت 3 أشهر وغير مسلّمة:</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-black text-rose-300 text-sm">
                          {hoveredAvailabilityWeek.cumOverdue}{' '}
                          <span className="text-[10px] font-sans font-normal text-rose-300/70">موقع</span>
                        </span>
                        <Eye className="w-3 h-3 text-rose-400 shrink-0" />
                      </div>
                    </div>

                    {/* تفصيل أسباب وموقف المواقع المتجاوزة */}
                    {hoveredAvailabilityWeek.cumOverdue > 0 ? (
                      <div className="pt-1.5 border-t border-rose-500/30 text-[10px] space-y-1">
                        <span className="text-slate-300 font-bold block text-[10px]">
                          تفصيل موقف المواقع المتجاوزة (انقر للتصفح):
                        </span>
                        <div className="grid grid-cols-2 gap-1 font-mono">
                          {hoveredAvailabilityWeek.overdueBreakdown.clientHold > 0 && (
                            <div
                              onClick={() =>
                                openInspection(
                                  'المتجاوزة: تم الخروج متوقف على العميل',
                                  'المشروعات المتجاوزة 3 أشهر والمصنفة تم الخروج متوقف على العميل',
                                  hoveredAvailabilityWeek.week,
                                  hoveredAvailabilityWeek.overdueBreakdown.clientHoldSites || []
                                )
                              }
                              className="bg-slate-900/90 px-1.5 py-1 rounded border border-amber-500/30 flex justify-between items-center text-slate-200 hover:border-amber-400 hover:bg-amber-950/40 cursor-pointer"
                            >
                              <span className="text-amber-300 truncate font-sans">متوقف على العميل:</span>
                              <span className="text-amber-400 font-bold">{hoveredAvailabilityWeek.overdueBreakdown.clientHold}</span>
                            </div>
                          )}
                          {hoveredAvailabilityWeek.overdueBreakdown.permits > 0 && (
                            <div
                              onClick={() =>
                                openInspection(
                                  'المتجاوزة: واقف استخراج تصاريح',
                                  'المشروعات المتجاوزة 3 أشهر والمعلقة على تصاريح الحفر وتراخيص الجهات المعنية',
                                  hoveredAvailabilityWeek.week,
                                  hoveredAvailabilityWeek.overdueBreakdown.permitsSites || []
                                )
                              }
                              className="bg-slate-900/90 px-1.5 py-1 rounded border border-blue-500/30 flex justify-between items-center text-slate-200 hover:border-blue-400 hover:bg-blue-950/40 cursor-pointer"
                            >
                              <span className="text-blue-300 truncate font-sans">واقف تصاريح:</span>
                              <span className="text-blue-400 font-bold">{hoveredAvailabilityWeek.overdueBreakdown.permits}</span>
                            </div>
                          )}
                          {hoveredAvailabilityWeek.overdueBreakdown.motaazer > 0 && (
                            <div
                              onClick={() =>
                                openInspection(
                                  'المتجاوزة: متعذر ميدانياً',
                                  'المشروعات المتجاوزة 3 أشهر ومصنفة متعذرة ميدانياً',
                                  hoveredAvailabilityWeek.week,
                                  hoveredAvailabilityWeek.overdueBreakdown.motaazerSites || []
                                )
                              }
                              className="bg-slate-900/90 px-1.5 py-1 rounded border border-rose-500/30 flex justify-between items-center text-slate-200 hover:border-rose-400 hover:bg-rose-950/40 cursor-pointer"
                            >
                              <span className="text-rose-300 truncate font-sans">متعذر ميدانياً:</span>
                              <span className="text-rose-400 font-bold">{hoveredAvailabilityWeek.overdueBreakdown.motaazer}</span>
                            </div>
                          )}
                          {hoveredAvailabilityWeek.overdueBreakdown.obstacles > 0 && (
                            <div
                              onClick={() =>
                                openInspection(
                                  'المتجاوزة: معوقات تنفيذية',
                                  'المشروعات المتجاوزة 3 أشهر وتواجه معوقات في التنفيذ الميداني',
                                  hoveredAvailabilityWeek.week,
                                  hoveredAvailabilityWeek.overdueBreakdown.obstaclesSites || []
                                )
                              }
                              className="bg-slate-900/90 px-1.5 py-1 rounded border border-orange-500/30 flex justify-between items-center text-slate-200 hover:border-orange-400 hover:bg-orange-950/40 cursor-pointer"
                            >
                              <span className="text-orange-300 truncate font-sans">معوقات تنفيذية:</span>
                              <span className="text-orange-400 font-bold">{hoveredAvailabilityWeek.overdueBreakdown.obstacles}</span>
                            </div>
                          )}
                          {hoveredAvailabilityWeek.overdueBreakdown.externalProgress > 0 && (
                            <div
                              onClick={() =>
                                openInspection(
                                  'المتجاوزة: جاري مسار خارجي',
                                  'المشروعات المتجاوزة 3 أشهر وجاري استكمال المسار الخارجي لها',
                                  hoveredAvailabilityWeek.week,
                                  hoveredAvailabilityWeek.overdueBreakdown.externalProgressSites || []
                                )
                              }
                              className="bg-slate-900/90 px-1.5 py-1 rounded border border-purple-500/30 flex justify-between items-center text-slate-200 hover:border-purple-400 hover:bg-purple-950/40 cursor-pointer"
                            >
                              <span className="text-purple-300 truncate font-sans">جاري خارجي:</span>
                              <span className="text-purple-400 font-bold">{hoveredAvailabilityWeek.overdueBreakdown.externalProgress}</span>
                            </div>
                          )}
                          {hoveredAvailabilityWeek.overdueBreakdown.internalStalled > 0 && (
                            <div
                              onClick={() =>
                                openInspection(
                                  'المتجاوزة: واقف مسار داخلي',
                                  'المشروعات المتجاوزة 3 أشهر والمتوقفة على المسار الداخلي',
                                  hoveredAvailabilityWeek.week,
                                  hoveredAvailabilityWeek.overdueBreakdown.internalStalledSites || []
                                )
                              }
                              className="bg-slate-900/90 px-1.5 py-1 rounded border border-amber-500/30 flex justify-between items-center text-slate-200 hover:border-amber-400 hover:bg-amber-950/40 cursor-pointer"
                            >
                              <span className="text-amber-300 truncate font-sans">واقف داخلي:</span>
                              <span className="text-amber-400 font-bold">{hoveredAvailabilityWeek.overdueBreakdown.internalStalled}</span>
                            </div>
                          )}
                          {hoveredAvailabilityWeek.overdueBreakdown.splicingStalled > 0 && (
                            <div
                              onClick={() =>
                                openInspection(
                                  'المتجاوزة: واقف لحامات وتوصيل',
                                  'المشروعات المتجاوزة 3 أشهر والمتوقفة على أعمال اللحامات وإعداد البوكسات',
                                  hoveredAvailabilityWeek.week,
                                  hoveredAvailabilityWeek.overdueBreakdown.splicingStalledSites || []
                                )
                              }
                              className="bg-slate-900/90 px-1.5 py-1 rounded border border-indigo-500/30 flex justify-between items-center text-slate-200 hover:border-indigo-400 hover:bg-indigo-950/40 cursor-pointer"
                            >
                              <span className="text-indigo-300 truncate font-sans">واقف لحامات:</span>
                              <span className="text-indigo-400 font-bold">{hoveredAvailabilityWeek.overdueBreakdown.splicingStalled}</span>
                            </div>
                          )}
                          {hoveredAvailabilityWeek.overdueBreakdown.other > 0 && (
                            <div
                              onClick={() =>
                                openInspection(
                                  'المتجاوزة: أخرى / قيد التنفيذ',
                                  'المشروعات المتجاوزة 3 أشهر وقيد الاستكمال والتنفيذ الميداني',
                                  hoveredAvailabilityWeek.week,
                                  hoveredAvailabilityWeek.overdueBreakdown.otherSites || []
                                )
                              }
                              className="bg-slate-900/90 px-1.5 py-1 rounded border border-slate-700 flex justify-between items-center text-slate-300 hover:border-slate-500 hover:bg-slate-800 cursor-pointer"
                            >
                              <span className="truncate font-sans">أخرى/قيد التنفيذ:</span>
                              <span className="text-slate-300 font-bold">{hoveredAvailabilityWeek.overdueBreakdown.other}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-emerald-400 font-semibold pt-0.5">
                        ✅ التزام كامل بنافذة التسليم دون أي تأخير
                      </p>
                    )}
                  </div>

                  {/* 5. بدأت التنفيذ ولم تسلم بعد */}
                  <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-700 space-y-1.5">
                    <div
                      onClick={() =>
                        openInspection(
                          'بدأت التنفيذ ولم تسلم بعد',
                          'المشروعات التي بدأ سدادها وتنفيذها وما زالت جارية ولم تسلم حتى هذا الأسبوع',
                          hoveredAvailabilityWeek.week,
                          hoveredAvailabilityWeek.startedUndeliveredSites
                        )
                      }
                      className="flex items-center justify-between cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      <span className="flex items-center gap-1.5 text-slate-200 font-bold">
                        <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>بدأت التنفيذ ولم تسلم بعد:</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-black text-cyan-300 text-sm">
                          {hoveredAvailabilityWeek.startedUndeliveredCount}{' '}
                          <span className="text-[10px] font-sans font-normal text-slate-400">موقع</span>
                        </span>
                        <Eye className="w-3 h-3 text-cyan-400 shrink-0" />
                      </div>
                    </div>

                    {hoveredAvailabilityWeek.startedUndeliveredCount > 0 && (
                      <div className="pt-1.5 border-t border-slate-700/80 text-[10px] space-y-1">
                        <span className="text-slate-400 font-bold block text-[10px]">
                          توزيع المشروعات الجارية حسب الموقف (انقر للتصفح):
                        </span>
                        <div className="grid grid-cols-2 gap-1 font-mono">
                          {hoveredAvailabilityWeek.startedBreakdown.clientHold > 0 && (
                            <div
                              onClick={() =>
                                openInspection(
                                  'الجارية: تم الخروج متوقف على العميل',
                                  'المشروعات الجارية المعلقة على تجهيزات وموافقة العميل',
                                  hoveredAvailabilityWeek.week,
                                  hoveredAvailabilityWeek.startedBreakdown.clientHoldSites || []
                                )
                              }
                              className="bg-slate-950/80 px-1.5 py-1 rounded border border-amber-500/30 flex justify-between items-center text-slate-200 hover:border-amber-400 hover:bg-amber-950/40 cursor-pointer"
                            >
                              <span className="text-amber-300 truncate font-sans">متوقف على العميل:</span>
                              <span className="text-amber-400 font-bold">{hoveredAvailabilityWeek.startedBreakdown.clientHold}</span>
                            </div>
                          )}
                          {hoveredAvailabilityWeek.startedBreakdown.permits > 0 && (
                            <div
                              onClick={() =>
                                openInspection(
                                  'الجارية: واقف تصاريح',
                                  'المشروعات الجارية المعلقة على استخراج تصاريح',
                                  hoveredAvailabilityWeek.week,
                                  hoveredAvailabilityWeek.startedBreakdown.permitsSites || []
                                )
                              }
                              className="bg-slate-950/80 px-1.5 py-1 rounded border border-blue-500/30 flex justify-between items-center text-slate-200 hover:border-blue-400 hover:bg-blue-950/40 cursor-pointer"
                            >
                              <span className="text-blue-300 truncate font-sans">تصاريح:</span>
                              <span className="text-blue-400 font-bold">{hoveredAvailabilityWeek.startedBreakdown.permits}</span>
                            </div>
                          )}
                          {hoveredAvailabilityWeek.startedBreakdown.motaazer > 0 && (
                            <div
                              onClick={() =>
                                openInspection(
                                  'الجارية: متعذر ميدانياً',
                                  'المشروعات الجارية المصنفة متعذرة ميدانياً',
                                  hoveredAvailabilityWeek.week,
                                  hoveredAvailabilityWeek.startedBreakdown.motaazerSites || []
                                )
                              }
                              className="bg-slate-950/80 px-1.5 py-1 rounded border border-rose-500/30 flex justify-between items-center text-slate-200 hover:border-rose-400 hover:bg-rose-950/40 cursor-pointer"
                            >
                              <span className="text-rose-300 truncate font-sans">متعذر ميدانياً:</span>
                              <span className="text-rose-400 font-bold">{hoveredAvailabilityWeek.startedBreakdown.motaazer}</span>
                            </div>
                          )}
                          {hoveredAvailabilityWeek.startedBreakdown.obstacles > 0 && (
                            <div
                              onClick={() =>
                                openInspection(
                                  'الجارية: معوقات تنفيذية',
                                  'المشروعات الجارية التي تواجه معوقات ميدانية',
                                  hoveredAvailabilityWeek.week,
                                  hoveredAvailabilityWeek.startedBreakdown.obstaclesSites || []
                                )
                              }
                              className="bg-slate-950/80 px-1.5 py-1 rounded border border-orange-500/30 flex justify-between items-center text-slate-200 hover:border-orange-400 hover:bg-orange-950/40 cursor-pointer"
                            >
                              <span className="text-orange-300 truncate font-sans">معوقات تنفيذية:</span>
                              <span className="text-orange-400 font-bold">{hoveredAvailabilityWeek.startedBreakdown.obstacles}</span>
                            </div>
                          )}
                          {hoveredAvailabilityWeek.startedBreakdown.externalProgress > 0 && (
                            <div
                              onClick={() =>
                                openInspection(
                                  'الجارية: مسار خارجي',
                                  'المشروعات الجارية المتوقفة على المسار الخارجي',
                                  hoveredAvailabilityWeek.week,
                                  hoveredAvailabilityWeek.startedBreakdown.externalProgressSites || []
                                )
                              }
                              className="bg-slate-950/80 px-1.5 py-1 rounded border border-purple-500/30 flex justify-between items-center text-slate-200 hover:border-purple-400 hover:bg-purple-950/40 cursor-pointer"
                            >
                              <span className="text-purple-300 truncate font-sans">مسار خارجي:</span>
                              <span className="text-purple-400 font-bold">{hoveredAvailabilityWeek.startedBreakdown.externalProgress}</span>
                            </div>
                          )}
                          {hoveredAvailabilityWeek.startedBreakdown.internalStalled > 0 && (
                            <div
                              onClick={() =>
                                openInspection(
                                  'الجارية: واقف مسار داخلي',
                                  'المشروعات الجارية المتوقفة على المسار الداخلي',
                                  hoveredAvailabilityWeek.week,
                                  hoveredAvailabilityWeek.startedBreakdown.internalStalledSites || []
                                )
                              }
                              className="bg-slate-950/80 px-1.5 py-1 rounded border border-amber-500/30 flex justify-between items-center text-slate-200 hover:border-amber-400 hover:bg-amber-950/40 cursor-pointer"
                            >
                              <span className="text-amber-300 truncate font-sans">مسار داخلي:</span>
                              <span className="text-amber-400 font-bold">{hoveredAvailabilityWeek.startedBreakdown.internalStalled}</span>
                            </div>
                          )}
                          {hoveredAvailabilityWeek.startedBreakdown.splicingStalled > 0 && (
                            <div
                              onClick={() =>
                                openInspection(
                                  'الجارية: لحامات وتوصيل',
                                  'المشروعات الجارية المتوقفة على اللحامات وتوصيل الفايبر',
                                  hoveredAvailabilityWeek.week,
                                  hoveredAvailabilityWeek.startedBreakdown.splicingStalledSites || []
                                )
                              }
                              className="bg-slate-950/80 px-1.5 py-1 rounded border border-indigo-500/30 flex justify-between items-center text-slate-200 hover:border-indigo-400 hover:bg-indigo-950/40 cursor-pointer"
                            >
                              <span className="text-indigo-300 truncate font-sans">لحامات:</span>
                              <span className="text-indigo-400 font-bold">{hoveredAvailabilityWeek.startedBreakdown.splicingStalled}</span>
                            </div>
                          )}
                          {hoveredAvailabilityWeek.startedBreakdown.other > 0 && (
                            <div
                              onClick={() =>
                                openInspection(
                                  'الجارية: قيد الاستكمال الميداني',
                                  'المشروعات الجارية قيد استكمال أعمال التركيب والتشغيل',
                                  hoveredAvailabilityWeek.week,
                                  hoveredAvailabilityWeek.startedBreakdown.otherSites || []
                                )
                              }
                              className="bg-slate-950/80 px-1.5 py-1 rounded border border-slate-700 flex justify-between items-center text-slate-300 hover:border-slate-500 hover:bg-slate-800 cursor-pointer"
                            >
                              <span className="truncate font-sans">قيد الاستكمال:</span>
                              <span className="text-slate-300 font-bold">{hoveredAvailabilityWeek.startedBreakdown.other}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hint */}
                  <div className="pt-1 text-center text-[10px] text-teal-300/80 font-medium">
                    💡 انقر على أي بند لعرض قائمة المشروعات وتصديرها
                  </div>
                </div>
              ) : hoveredOperatorWeek ? (
                <div className="space-y-2 text-xs">
                  {/* 1. المستهدف التراكمي */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-sky-500/30">
                    <span className="flex items-center gap-1.5 text-slate-200">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0"></span>
                      <span className="font-bold">المستهدف التراكمي:</span>
                    </span>
                    <span className="font-mono font-black text-sky-300 text-sm">
                      {hoveredOperatorWeek.targetRate}{' '}
                      <span className="text-[10px] font-sans font-normal text-slate-400">موقع</span>
                    </span>
                  </div>

                  {/* 2. المحقق التراكمي */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-emerald-500/30">
                    <span className="flex items-center gap-1.5 text-slate-200">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"></span>
                      <span className="font-bold">المحقق التراكمي:</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-emerald-400 text-sm">
                        {hoveredOperatorWeek.delivered}{' '}
                        <span className="text-[10px] font-sans font-normal text-slate-400">موقع</span>
                      </span>
                      <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                        +{hoveredOperatorWeek.deliveredThisWeek} أسبوعي
                      </span>
                    </div>
                  </div>

                  {/* 3. المواقع المسلمة هذا الأسبوع */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-cyan-500/30">
                    <span className="flex items-center gap-1.5 text-slate-200">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0"></span>
                      <span className="font-bold">المواقع المسلمة هذا الأسبوع:</span>
                    </span>
                    <span className="font-mono font-black text-cyan-300 text-sm">
                      {hoveredOperatorWeek.deliveredThisWeek}{' '}
                      <span className="text-[10px] font-sans font-normal text-slate-400">موقع</span>
                    </span>
                  </div>

                  {/* 4. المواقع المسلمة آخر 5 أسابيع */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-teal-500/30">
                    <span className="flex items-center gap-1.5 text-slate-200">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-400 shrink-0"></span>
                      <span className="font-bold">المواقع المسلمة آخر 5 أسابيع:</span>
                    </span>
                    <span className="font-mono font-black text-teal-300 text-sm">
                      {hoveredOperatorWeek.deliveredLast5Weeks}{' '}
                      <span className="text-[10px] font-sans font-normal text-slate-400">موقع</span>
                    </span>
                  </div>

                  {/* 5. نسبة الإنجاز والفجوة المتبقية */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                    <span className="text-slate-300 font-bold">
                      نسبة الإنجاز: <strong className="font-mono text-amber-300">{hoveredOperatorWeek.achievementPercent}%</strong>
                    </span>
                    <span className="text-slate-300 font-bold">
                      المتبقي: <strong className="font-mono text-rose-300">{hoveredOperatorWeek.remainingGap}</strong> موقع
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* ── Executive Summary KPI Cards & Interactive Weekly Breakdown ── */}
      {isAvailability ? (
        <div className="mt-5 pt-4 border-t border-slate-100 space-y-4">
          {/* Active / Hovered Week Focus Card */}
          {(() => {
            const activeWeekData =
              hoveredAvailabilityWeek ||
              (selectedWeekIndex !== null ? availabilityStats.weeklyPoints[selectedWeekIndex] : null) ||
              availabilityStats.weeklyPoints[availabilityStats.weeklyPoints.length - 1];
            if (!activeWeekData) return null;
            const isHovering = hoveredAvailabilityWeek !== null;
            const isSelected = selectedWeekIndex !== null && !isHovering;

            return (
              <div
                className={`p-4 rounded-2xl border transition-all duration-200 ${isHovering
                    ? 'bg-gradient-to-r from-teal-50/90 via-sky-50/70 to-indigo-50/80 border-teal-300 shadow-sm'
                    : isSelected
                      ? 'bg-gradient-to-r from-teal-50/60 via-slate-50 to-sky-50/60 border-teal-400 shadow-sm'
                      : 'bg-slate-50/80 border-slate-200'
                  }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-200/80 gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-teal-600 text-white flex items-center gap-1 shadow-2xs">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Week {activeWeekData.week} (2026)</span>
                    </span>
                    <span className="text-xs text-slate-600 font-mono font-semibold">
                      {activeWeekData.dateRange}
                    </span>
                    {isHovering ? (
                      <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full animate-pulse">
                        أسبوع محدد بالماوس
                      </span>
                    ) : isSelected ? (
                      <span className="text-[10px] bg-teal-600 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span>أسبوع مثبت بالنقر</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWeekIndex(null);
                          }}
                          className="hover:bg-teal-700 rounded p-0.5"
                          title="إلغاء التثبيت والعودة للأسبوع الحالي"
                        >
                          ✕
                        </button>
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                        الأسبوع الحالي (انقر أو مرر المؤشر على أي أسبوع لعرض تفاصيله)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                    <span>
                      نسبة الإنجاز حتى هذا الأسبوع:{' '}
                      <strong className="text-slate-800 font-mono">
                        {activeWeekData.cumTarget > 0 ? Math.round((activeWeekData.cumAchieved / activeWeekData.cumTarget) * 100) : 100}%
                      </strong>
                    </span>
                    <span className="text-[11px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                      💡 انقر على أي بطاقة لعرض وتصدير المشروعات
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {/* 1. المستهدف التراكمي */}
                  <div
                    onClick={() =>
                      openInspection(
                        'المستهدف التراكمي',
                        'المشروعات التي بدأ سدادها وتنفيذها حتى نهاية هذا الأسبوع',
                        activeWeekData.week,
                        activeWeekData.targetSites
                      )
                    }
                    className="p-3 rounded-xl bg-white border border-sky-200 shadow-2xs hover:border-sky-400 hover:shadow-md cursor-pointer transition-all duration-150 group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-sky-800 flex items-center gap-1">
                        <Target className="w-3.5 h-3.5 text-sky-600 group-hover:scale-110 transition-transform" />
                        <span>المستهدف التراكمي</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">+{activeWeekData.targetThisWeek} أسبوعي</span>
                    </div>
                    <div className="text-lg sm:text-xl font-black text-sky-900 font-mono flex items-baseline justify-between">
                      <span>
                        {activeWeekData.cumTarget}{' '}
                        <span className="text-xs font-sans font-normal text-slate-500">موقع</span>
                      </span>
                      <Eye className="w-3.5 h-3.5 text-sky-400 group-hover:text-sky-600" />
                    </div>
                    <span className="text-[10px] text-sky-700 block mt-0.5">
                      سداد وبدء التنفيذ حتى نهاية الأسبوع
                    </span>
                  </div>

                  {/* 2. المحقق التراكمي */}
                  <div
                    onClick={() =>
                      openInspection(
                        'المحقق التراكمي (تم تسليمه)',
                        'المشروعات المسلّمة والمعتمدة رسمياً حتى هذا الأسبوع',
                        activeWeekData.week,
                        activeWeekData.achievedSites
                      )
                    }
                    className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs hover:border-emerald-400 hover:shadow-md cursor-pointer transition-all duration-150 group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                        <span>المحقق التراكمي</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">+{activeWeekData.achievedThisWeek} أسبوعي</span>
                    </div>
                    <div className="text-lg sm:text-xl font-black text-emerald-800 font-mono flex items-baseline justify-between">
                      <span>
                        {activeWeekData.cumAchieved}{' '}
                        <span className="text-xs font-sans font-normal text-slate-500">موقع مسلّم</span>
                      </span>
                      <Eye className="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-600" />
                    </div>
                    <span className="text-[10px] text-emerald-700 block mt-0.5">
                      تم تسليمها واعتمادها حتى هذا الأسبوع
                    </span>
                  </div>

                  {/* 3. المسلمة آخر 5 أسابيع */}
                  <div
                    onClick={() =>
                      openInspection(
                        'المسلّمة آخر 5 أسابيع',
                        'المشروعات المسلّمة خلال نافذة الأسابيع الخمسة الأخيرة',
                        activeWeekData.week,
                        activeWeekData.deliveredLast5WeeksSites
                      )
                    }
                    className="p-3 rounded-xl bg-white border border-teal-200 shadow-2xs hover:border-teal-400 hover:shadow-md cursor-pointer transition-all duration-150 group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-teal-800 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600 group-hover:scale-110 transition-transform" />
                        <span>المسلّمة آخر 5 أسابيع</span>
                      </span>
                      <span className="text-[10px] font-mono text-teal-600 font-bold">Rolling 5-W</span>
                    </div>
                    <div className="text-lg sm:text-xl font-black text-teal-800 font-mono flex items-baseline justify-between">
                      <span>
                        {activeWeekData.deliveredLast5Weeks}{' '}
                        <span className="text-xs font-sans font-normal text-slate-500">موقع</span>
                      </span>
                      <Eye className="w-3.5 h-3.5 text-teal-400 group-hover:text-teal-600" />
                    </div>
                    <span className="text-[10px] text-teal-700 block mt-0.5">
                      معدل تسليم الأسابيع الـ 5 الأخيرة
                    </span>
                  </div>

                  {/* 4. المتجاوزة 3 أشهر وغير مسلمة */}
                  <div
                    onClick={() =>
                      openInspection(
                        'تجاوزت 3 أشهر وغير مسلّمة',
                        'المشروعات التي تجاوزت مهلة التنفيذ التعاقدية (3 أشهر) ولم يتم تسليمها بعد',
                        activeWeekData.week,
                        activeWeekData.overdueSites
                      )
                    }
                    className="p-3 rounded-xl bg-white border border-rose-200 shadow-2xs hover:border-rose-400 hover:shadow-md cursor-pointer transition-all duration-150 group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-rose-800 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 group-hover:scale-110 transition-transform" />
                        <span>تجاوزت 3 أشهر</span>
                      </span>
                      <span className="text-[10px] font-mono text-rose-600 font-bold">غير مسلّمة</span>
                    </div>
                    <div className="text-lg sm:text-xl font-black text-rose-800 font-mono flex items-baseline justify-between">
                      <span>
                        {activeWeekData.cumOverdue}{' '}
                        <span className="text-xs font-sans font-normal text-slate-500">موقع</span>
                      </span>
                      <Eye className="w-3.5 h-3.5 text-rose-400 group-hover:text-rose-600" />
                    </div>
                    <span className="text-[10px] text-rose-700 block mt-0.5">
                      تجاوزت مهلة الـ 3 أشهر ولم تُسلّم
                    </span>
                  </div>

                  {/* 5. بدأت التنفيذ ولم تسلم بعد */}
                  <div
                    onClick={() =>
                      openInspection(
                        'بدأت التنفيذ ولم تسلم بعد',
                        'المشروعات التي بدأ سدادها وتنفيذها وما زالت جارية ولم تسلم حتى هذا الأسبوع',
                        activeWeekData.week,
                        activeWeekData.startedUndeliveredSites
                      )
                    }
                    className="p-3 rounded-xl bg-white border border-cyan-200 shadow-2xs hover:border-cyan-400 hover:shadow-md cursor-pointer transition-all duration-150 group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-cyan-800 flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-cyan-600 group-hover:scale-110 transition-transform" />
                        <span>بدأت ولم تسلّم</span>
                      </span>
                      <span className="text-[10px] font-mono text-cyan-600 font-bold">قيد التنفيذ</span>
                    </div>
                    <div className="text-lg sm:text-xl font-black text-cyan-900 font-mono flex items-baseline justify-between">
                      <span>
                        {activeWeekData.startedUndeliveredCount}{' '}
                        <span className="text-xs font-sans font-normal text-slate-500">موقع</span>
                      </span>
                      <Eye className="w-3.5 h-3.5 text-cyan-400 group-hover:text-cyan-600" />
                    </div>
                    <span className="text-[10px] text-cyan-700 block mt-0.5">
                      مشروعات جارية لم يتم تسليمها بعد
                    </span>
                  </div>
                </div>

                {/* Sub-breakdown badges for overdue sites */}
                {activeWeekData.cumOverdue > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/70">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>تفصيل أسباب وموقف المواقع المتجاوزة 3 أشهر (انقر للتصفح):</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono font-bold">
                        إجمالي: {activeWeekData.cumOverdue} موقع
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {activeWeekData.overdueBreakdown.clientHold > 0 && (
                        <button
                          onClick={() =>
                            openInspection(
                              'المتجاوزة: تم الخروج متوقف على العميل',
                              'المشروعات المتجاوزة 3 أشهر والمصنفة تم الخروج متوقف على العميل',
                              activeWeekData.week,
                              activeWeekData.overdueBreakdown.clientHoldSites || []
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 font-bold flex items-center gap-1.5 shadow-2xs hover:bg-amber-100 hover:border-amber-400 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span>متوقف على العميل:</span>
                          <strong className="font-mono text-amber-950 font-black">{activeWeekData.overdueBreakdown.clientHold}</strong>
                        </button>
                      )}
                      {activeWeekData.overdueBreakdown.permits > 0 && (
                        <button
                          onClick={() =>
                            openInspection(
                              'المتجاوزة: واقف استخراج تصاريح',
                              'المشروعات المتجاوزة 3 أشهر والمعلقة على تصاريح الحفر وتراخيص الجهات المعنية',
                              activeWeekData.week,
                              activeWeekData.overdueBreakdown.permitsSites || []
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 border border-blue-300 font-bold flex items-center gap-1.5 shadow-2xs hover:bg-blue-100 hover:border-blue-400 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <span>واقف استخراج تصاريح:</span>
                          <strong className="font-mono text-blue-950 font-black">{activeWeekData.overdueBreakdown.permits}</strong>
                        </button>
                      )}
                      {activeWeekData.overdueBreakdown.motaazer > 0 && (
                        <button
                          onClick={() =>
                            openInspection(
                              'المتجاوزة: متعذر ميدانياً',
                              'المشروعات المتجاوزة 3 أشهر ومصنفة متعذرة ميدانياً',
                              activeWeekData.week,
                              activeWeekData.overdueBreakdown.motaazerSites || []
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-900 border border-rose-300 font-bold flex items-center gap-1.5 shadow-2xs hover:bg-rose-100 hover:border-rose-400 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          <span>متعذر ميدانياً:</span>
                          <strong className="font-mono text-rose-950 font-black">{activeWeekData.overdueBreakdown.motaazer}</strong>
                        </button>
                      )}
                      {activeWeekData.overdueBreakdown.obstacles > 0 && (
                        <button
                          onClick={() =>
                            openInspection(
                              'المتجاوزة: معوقات تنفيذية',
                              'المشروعات المتجاوزة 3 أشهر وتواجه معوقات ميدانية',
                              activeWeekData.week,
                              activeWeekData.overdueBreakdown.obstaclesSites || []
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-orange-50 text-orange-900 border border-orange-300 font-bold flex items-center gap-1.5 shadow-2xs hover:bg-orange-100 hover:border-orange-400 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                          <span>معوقات تنفيذية:</span>
                          <strong className="font-mono text-orange-950 font-black">{activeWeekData.overdueBreakdown.obstacles}</strong>
                        </button>
                      )}
                      {activeWeekData.overdueBreakdown.externalProgress > 0 && (
                        <button
                          onClick={() =>
                            openInspection(
                              'المتجاوزة: مسار خارجي',
                              'المشروعات المتجاوزة 3 أشهر والمتوقفة على أعمال المسار الخارجي',
                              activeWeekData.week,
                              activeWeekData.overdueBreakdown.externalProgressSites || []
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 border border-purple-300 font-bold flex items-center gap-1.5 shadow-2xs hover:bg-purple-100 hover:border-purple-400 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          <span>مسار خارجي:</span>
                          <strong className="font-mono text-purple-950 font-black">{activeWeekData.overdueBreakdown.externalProgress}</strong>
                        </button>
                      )}
                      {activeWeekData.overdueBreakdown.internalStalled > 0 && (
                        <button
                          onClick={() =>
                            openInspection(
                              'المتجاوزة: واقف مسار داخلي',
                              'المشروعات المتجاوزة 3 أشهر والمتوقفة على المسار الداخلي',
                              activeWeekData.week,
                              activeWeekData.overdueBreakdown.internalStalledSites || []
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 font-bold flex items-center gap-1.5 shadow-2xs hover:bg-amber-100 hover:border-amber-400 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span>مسار داخلي:</span>
                          <strong className="font-mono text-amber-950 font-black">{activeWeekData.overdueBreakdown.internalStalled}</strong>
                        </button>
                      )}
                      {activeWeekData.overdueBreakdown.splicingStalled > 0 && (
                        <button
                          onClick={() =>
                            openInspection(
                              'المتجاوزة: واقف لحامات وتوصيل',
                              'المشروعات المتجاوزة 3 أشهر والمتوقفة على أعمال اللحامات وإعداد البوكسات',
                              activeWeekData.week,
                              activeWeekData.overdueBreakdown.splicingStalledSites || []
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-300 font-bold flex items-center gap-1.5 shadow-2xs hover:bg-indigo-100 hover:border-indigo-400 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          <span>لحامات وتوصيل:</span>
                          <strong className="font-mono text-indigo-950 font-black">{activeWeekData.overdueBreakdown.splicingStalled}</strong>
                        </button>
                      )}
                      {activeWeekData.overdueBreakdown.other > 0 && (
                        <button
                          onClick={() =>
                            openInspection(
                              'المتجاوزة: أخرى / قيد التنفيذ',
                              'المشروعات المتجاوزة 3 أشهر وقيد الاستكمال والتنفيذ الميداني',
                              activeWeekData.week,
                              activeWeekData.overdueBreakdown.otherSites || []
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-300 font-bold flex items-center gap-1.5 shadow-2xs hover:bg-slate-200 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                          <span>أخرى / قيد الاستكمال:</span>
                          <strong className="font-mono text-slate-900 font-black">{activeWeekData.overdueBreakdown.other}</strong>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Sub-breakdown badges for Started/Undelivered sites */}
                {activeWeekData.startedUndeliveredCount > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/70">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-cyan-900 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-cyan-600" />
                        <span>تفصيل موقف المشروعات الجارية التي لم تُسلّم بعد (انقر للتصفح):</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono font-bold">
                        إجمالي: {activeWeekData.startedUndeliveredCount} موقع
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {activeWeekData.startedBreakdown.clientHold > 0 && (
                        <button
                          onClick={() =>
                            openInspection(
                              'الجارية: تم الخروج متوقف على العميل',
                              'المشروعات الجارية المعلقة على موافقة وتجهيزات العميل',
                              activeWeekData.week,
                              activeWeekData.startedBreakdown.clientHoldSites || []
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-amber-50/80 text-amber-900 border border-amber-200 font-bold flex items-center gap-1.5 shadow-2xs hover:bg-amber-100 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span>متوقف على العميل:</span>
                          <strong className="font-mono text-amber-950 font-black">{activeWeekData.startedBreakdown.clientHold}</strong>
                        </button>
                      )}
                      {activeWeekData.startedBreakdown.permits > 0 && (
                        <button
                          onClick={() =>
                            openInspection(
                              'الجارية: واقف تصاريح',
                              'المشروعات الجارية المعلقة على استخراج تصاريح',
                              activeWeekData.week,
                              activeWeekData.startedBreakdown.permitsSites || []
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-blue-50/80 text-blue-900 border border-blue-200 font-bold flex items-center gap-1.5 shadow-2xs hover:bg-blue-100 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <span>تصاريح:</span>
                          <strong className="font-mono text-blue-950 font-black">{activeWeekData.startedBreakdown.permits}</strong>
                        </button>
                      )}
                      {activeWeekData.startedBreakdown.motaazer > 0 && (
                        <button
                          onClick={() =>
                            openInspection(
                              'الجارية: متعذر ميدانياً',
                              'المشروعات الجارية المصنفة متعذرة ميدانياً',
                              activeWeekData.week,
                              activeWeekData.startedBreakdown.motaazerSites || []
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-rose-50/80 text-rose-900 border border-rose-200 font-bold flex items-center gap-1.5 shadow-2xs hover:bg-rose-100 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          <span>متعذر ميدانياً:</span>
                          <strong className="font-mono text-rose-950 font-black">{activeWeekData.startedBreakdown.motaazer}</strong>
                        </button>
                      )}
                      {activeWeekData.startedBreakdown.obstacles > 0 && (
                        <button
                          onClick={() =>
                            openInspection(
                              'الجارية: معوقات تنفيذية',
                              'المشروعات الجارية التي تواجه معوقات ميدانية',
                              activeWeekData.week,
                              activeWeekData.startedBreakdown.obstaclesSites || []
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-orange-50/80 text-orange-900 border border-orange-200 font-bold flex items-center gap-1.5 shadow-2xs hover:bg-orange-100 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                          <span>معوقات تنفيذية:</span>
                          <strong className="font-mono text-orange-950 font-black">{activeWeekData.startedBreakdown.obstacles}</strong>
                        </button>
                      )}
                      {activeWeekData.startedBreakdown.externalProgress > 0 && (
                        <button
                          onClick={() =>
                            openInspection(
                              'الجارية: مسار خارجي',
                              'المشروعات الجارية المتوقفة على المسار الخارجي',
                              activeWeekData.week,
                              activeWeekData.startedBreakdown.externalProgressSites || []
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-purple-50/80 text-purple-900 border border-purple-200 font-bold flex items-center gap-1.5 shadow-2xs hover:bg-purple-100 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          <span>مسار خارجي:</span>
                          <strong className="font-mono text-purple-950 font-black">{activeWeekData.startedBreakdown.externalProgress}</strong>
                        </button>
                      )}
                      {activeWeekData.startedBreakdown.internalStalled > 0 && (
                        <button
                          onClick={() =>
                            openInspection(
                              'الجارية: واقف مسار داخلي',
                              'المشروعات الجارية المتوقفة على المسار الداخلي',
                              activeWeekData.week,
                              activeWeekData.startedBreakdown.internalStalledSites || []
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-amber-50/80 text-amber-900 border border-amber-200 font-bold flex items-center gap-1.5 shadow-2xs hover:bg-amber-100 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span>مسار داخلي:</span>
                          <strong className="font-mono text-amber-950 font-black">{activeWeekData.startedBreakdown.internalStalled}</strong>
                        </button>
                      )}
                      {activeWeekData.startedBreakdown.splicingStalled > 0 && (
                        <button
                          onClick={() =>
                            openInspection(
                              'الجارية: لحامات وتوصيل',
                              'المشروعات الجارية المتوقفة على اللحامات وتوصيل الفايبر',
                              activeWeekData.week,
                              activeWeekData.startedBreakdown.splicingStalledSites || []
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-indigo-50/80 text-indigo-900 border border-indigo-200 font-bold flex items-center gap-1.5 shadow-2xs hover:bg-indigo-100 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          <span>لحامات:</span>
                          <strong className="font-mono text-indigo-950 font-black">{activeWeekData.startedBreakdown.splicingStalled}</strong>
                        </button>
                      )}
                      {activeWeekData.startedBreakdown.other > 0 && (
                        <button
                          onClick={() =>
                            openInspection(
                              'الجارية: قيد الاستكمال الميداني',
                              'المشروعات الجارية قيد استكمال أعمال التركيب والتشغيل',
                              activeWeekData.week,
                              activeWeekData.startedBreakdown.otherSites || []
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 font-bold flex items-center gap-1.5 shadow-2xs hover:bg-slate-200 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                          <span>قيد الاستكمال:</span>
                          <strong className="font-mono text-slate-900 font-black">{activeWeekData.startedBreakdown.other}</strong>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Overall Scope KPI Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              onClick={() =>
                openInspection(
                  'مشروعات النطاق المفلتر',
                  'كافة المشروعات المطابقة للفلاتر الحالية',
                  currentWeek,
                  sites
                )
              }
              className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-0.5 hover:border-slate-400 hover:shadow-xs cursor-pointer transition-all group"
            >
              <span className="text-[11px] font-bold text-slate-500 block group-hover:text-slate-700">مشروعات النطاق المفلتر</span>
              <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
                {availabilityStats.totalSites}
              </span>
              <span className="text-[10px] text-slate-400 block font-semibold">مشروع في النطاق (انقر للتصفح)</span>
            </div>

            <div
              onClick={() =>
                openInspection(
                  'تم تسليمها واعتمادها',
                  'المشروعات التي تم تسليمها بنجاح واعتمدت رسمياً',
                  currentWeek,
                  sites.filter((s) => {
                    const raw = s.rawRecord || {};
                    const del = String(s.deliveryStatus || raw['موقف التسليم'] || raw['موقف_التسليم'] || '').trim();
                    return del === 'تم التسليم' || s.status === 'تم التسليم';
                  })
                )
              }
              className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center space-y-0.5 hover:border-emerald-400 hover:shadow-xs cursor-pointer transition-all group"
            >
              <span className="text-[11px] font-bold text-emerald-800 block group-hover:text-emerald-900">تم تسليمها واعتمادها</span>
              <span className="text-base sm:text-lg font-black text-emerald-700 font-mono">
                {availabilityStats.totalAchieved}
              </span>
              <span className="text-[10px] text-emerald-600 block font-semibold">موقع منتهي ومسلم (انقر للتصفح)</span>
            </div>

            <div
              onClick={() => {
                const latestPt = availabilityStats.weeklyPoints[availabilityStats.weeklyPoints.length - 1];
                openInspection(
                  'تجاوزت مدة الـ 3 أشهر',
                  'المشروعات التي تجاوزت مهلة التنفيذ التعاقدية (3 أشهر) ولم يتم تسليمها بعد',
                  currentWeek,
                  latestPt ? latestPt.overdueSites : []
                );
              }}
              className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200 text-center space-y-0.5 hover:border-rose-400 hover:shadow-xs cursor-pointer transition-all group"
            >
              <span className="text-[11px] font-bold text-rose-800 block group-hover:text-rose-900">تجاوزت مدة الـ 3 أشهر</span>
              <span className="text-base sm:text-lg font-black text-rose-700 font-mono">
                {availabilityStats.totalOverdue}
              </span>
              <span className="text-[10px] text-rose-600 block font-semibold">تجاوزت نافذة التسليم (انقر للتصفح)</span>
            </div>

            <div
              onClick={() => {
                const latestPt = availabilityStats.weeklyPoints[availabilityStats.weeklyPoints.length - 1];
                // Sites within SLA: started but not yet overdue (>3 months) and not delivered
                const inSlaSites = latestPt
                  ? latestPt.startedUndeliveredSites.filter((s) => !latestPt.overdueSites.includes(s))
                  : [];
                openInspection(
                  'سارية ضمن فترة الـ 3 أشهر',
                  'المشروعات الجارية قيد التنفيذ ضمن المهلة التعاقدية (3 أشهر)',
                  currentWeek,
                  inSlaSites
                );
              }}
              className="p-3 rounded-2xl bg-sky-50/70 border border-sky-200 text-center space-y-0.5 hover:border-sky-400 hover:shadow-xs cursor-pointer transition-all group"
            >
              <span className="text-[11px] font-bold text-sky-800 block group-hover:text-sky-900">سارية ضمن فترة الـ 3 أشهر</span>
              <span className="text-base sm:text-lg font-black text-sky-700 font-mono">
                {availabilityStats.totalWithinSla}
              </span>
              <span className="text-[10px] text-sky-600 block font-semibold">قيد التنفيذ ضمن المهلة (انقر للتصفح)</span>
            </div>
          </div>
        </div>
      ) : (
        /* Operator KPI Cards (Mirrors Availability Focus Cards — Reactive to Hovered / Selected Week) */
        (() => {
          const activeOpWeek =
            hoveredOperatorWeek ||
            (selectedWeekIndex !== null ? operatorRollout.weeks[selectedWeekIndex] : null) ||
            operatorRollout.latestWeek;
          return (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-indigo-600 text-white flex items-center gap-1 shadow-2xs">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{activeOpWeek.weekDef.fullEn}</span>
                  </span>
                  <span className="text-xs text-slate-500 font-mono font-semibold">
                    {activeOpWeek.weekDef.dateRangeAr}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-semibold">
                  Operator: <strong className="text-indigo-700">{selectedOperator === 'All' ? 'All Operators' : selectedOperator}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 text-center space-y-0.5">
                  <span className="text-[11px] font-bold text-sky-800 block">المستهدف التراكمي</span>
                  <span className="text-lg sm:text-xl font-black text-sky-800 font-mono">
                    {activeOpWeek.targetRate}
                  </span>
                  <span className="text-[10px] text-sky-600 block font-semibold">غير المنتهي / غير المشغل فايبر</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center space-y-0.5">
                  <span className="text-[11px] font-bold text-emerald-800 block">المحقق التراكمي</span>
                  <span className="text-lg sm:text-xl font-black text-emerald-700 font-mono">
                    {activeOpWeek.delivered}
                  </span>
                  <span className="text-[10px] text-emerald-600 block font-semibold">
                    +{activeOpWeek.deliveredThisWeek} موقع هذا الأسبوع
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 text-center space-y-0.5">
                  <span className="text-[11px] font-bold text-teal-800 block">المسلّمة آخر 5 أسابيع</span>
                  <span className="text-lg sm:text-xl font-black text-teal-700 font-mono">
                    {activeOpWeek.deliveredLast5Weeks}
                  </span>
                  <span className="text-[10px] text-teal-600 block font-semibold">معدل تسليم آخر 5 أسابيع</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-center space-y-0.5">
                  <span className="text-[11px] font-bold text-indigo-800 block">نسبة الإنجاز والمتبقي</span>
                  <span className="text-lg sm:text-xl font-black text-indigo-700 font-mono">
                    {activeOpWeek.achievementPercent}%
                  </span>
                  <span className="text-[10px] text-indigo-600 block font-semibold">
                    المتبقي: {activeOpWeek.remainingGap} موقع
                  </span>
                </div>
              </div>

              {/* ── General Departments Breakdown Grid (Interactive) ── */}
              <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs sm:text-sm font-black text-slate-800">
                      تفصيل الإدارات العامة لتنفيذ الشبكات (Oct – Nov 2026)
                </h4>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                اضغط على أي إدارة لتصفية الرسم البياني
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {operatorRollout.departmentSummaries.map((dept) => {
                const isSelected = selectedDeptFilter === dept.canonicalAdmin;
                return (
                  <div
                    key={dept.rawAdmin}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedDeptFilter(null);
                      } else {
                        setSelectedDeptFilter(dept.canonicalAdmin);
                      }
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${isSelected
                      ? 'bg-indigo-50/90 border-indigo-400 ring-2 ring-indigo-200 shadow-sm'
                      : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-2xs'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-slate-800 leading-tight">
                        {dept.canonicalAdmin}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-black ${dept.achievementPercent >= 100
                        ? 'bg-emerald-100 text-emerald-800'
                        : dept.achievementPercent >= 70
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-amber-100 text-amber-800'
                        }`}>
                        {dept.achievementPercent}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${dept.achievementPercent >= 100
                          ? 'bg-emerald-500'
                          : dept.achievementPercent >= 70
                            ? 'bg-sky-500'
                            : 'bg-amber-500'
                          }`}
                        style={{ width: `${Math.min(100, dept.achievementPercent)}%` }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-[11px] text-center font-mono">
                      <div className="bg-slate-50 rounded py-1">
                        <span className="text-[9px] text-slate-400 block font-sans">المواقع</span>
                        <span className="font-bold text-slate-700">{dept.totalSites}</span>
                      </div>
                      <div className="bg-sky-50/70 rounded py-1">
                        <span className="text-[9px] text-sky-600 block font-sans">المطلوب</span>
                        <span className="font-bold text-sky-800">{dept.targetRate}</span>
                      </div>
                      <div className="bg-emerald-50/70 rounded py-1">
                        <span className="text-[9px] text-emerald-600 block font-sans">المسلم</span>
                        <span className="font-bold text-emerald-800">{dept.delivered}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
          );
        })()
      )}

      {/* ── Footer Information Note ── */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>
            {isAvailability
              ? 'يتم احتساب المستهدف التراكمي بناءً على تاريخ السداد والبدء في التنفيذ، ومتابعة تجاوز مهلة الـ 3 أشهر وموقف التسليم الفعلي أسبوعياً.'
              : 'البيانات المعروضة تتضمن تتبع التسليم المعتمد والمعدل المطلوب تسليمه لكافة أسابيع أكتوبر ونوفمبر 2026 لمواقع المحمول.'}
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-400">
          {isAvailability ? `Total Weeks: ${totalSteps} • 2026` : '8 Weeks (Oct W1 – Nov W4, 2026)'}
        </span>
      </div>

      {/* ── Interactive Site Inspection Modal ── */}
      {inspectionModal && inspectionModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={closeInspection}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={closeInspection}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                  aria-label="إغلاق النافذة"
                >
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-teal-400" />
                      <span>{inspectionModal.title}</span>
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      Week {inspectionModal.weekNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">{inspectionModal.subtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl text-xs font-black font-mono bg-white/15 text-white border border-white/20 shrink-0">
                  {inspectionModal.sites.length} مشروع
                </span>
                <button
                  onClick={() =>
                    exportInspectionToCSV(
                      inspectionModal.sites,
                      inspectionModal.title,
                      inspectionModal.weekNumber
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">تصدير Excel / CSV</span>
                </button>
              </div>
            </div>

            {/* Modal Toolbar: Search and Filter */}
            <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="بحث بكود الموقع، اسم المشروع، القطاع، المسار، التصنيف..."
                  className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 placeholder-slate-400 shadow-2xs"
                  autoFocus
                />
              </div>

              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span>المعروض:</span>
                <strong className="font-mono text-slate-800 font-bold">
                  {filteredModalSites.length} من {inspectionModal.sites.length}
                </strong>
                {modalSearch && (
                  <button
                    onClick={() => setModalSearch('')}
                    className="text-xs text-teal-600 hover:underline mr-2 cursor-pointer"
                  >
                    مسح البحث
                  </button>
                )}
              </div>
            </div>

            {/* Modal Content: Table */}
            <div className="flex-1 overflow-auto p-2 sm:p-4 bg-white">
              {filteredModalSites.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-sm font-semibold">لا توجد نتائج مطابقة لبحثك</p>
                  <p className="text-xs text-slate-400">جرب البحث بكلمات أخرى أو مسح نص البحث</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">#</th>
                        <th className="py-2.5 px-3">كود الموقع / المشروع</th>
                        <th className="py-2.5 px-3">اسم الموقع / العميل</th>
                        <th className="py-2.5 px-3">القطاع</th>
                        <th className="py-2.5 px-3">الإدارة العامة للتنفيذ</th>
                        <th className="py-2.5 px-3">تاريخ السداد والبدء</th>
                        <th className="py-2.5 px-3">موقف التسليم</th>
                        <th className="py-2.5 px-3">تاريخ التسليم</th>
                        <th className="py-2.5 px-3">المسار الداخلي</th>
                        <th className="py-2.5 px-3">المسار الخارجي</th>
                        <th className="py-2.5 px-3">اللحامات</th>
                        <th className="py-2.5 px-3">التصنيف / المعوق</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {filteredModalSites.map((s, idx) => {
                        const raw = s.rawRecord || {};
                        const code = s.id || raw['كود الموقع'] || raw['site_id'] || '—';
                        const name = s.name || raw['اسم الموقع'] || raw['اسم المشروع'] || '—';
                        const sector = s.sector || raw['القطاع'] || raw['قطاع التنفيذ'] || '—';
                        const admin = s.generalAdmin || raw['الإدارة العامة'] || raw['الإدارة العامة للتنفيذ'] || '—';
                        const pDate = s.paymentAndStartDate || raw['تاريخ السداد والبدء في التنفيذ'] || '—';
                        const delStatus = String(
                          s.deliveryStatus ||
                          raw['موقف التسليم'] ||
                          raw['موقف_التسليم'] ||
                          (s.status === 'تم التسليم' ? 'تم التسليم' : 'لم يتم')
                        ).trim();
                        const isDel = delStatus === 'تم التسليم';
                        const dDate = s.deliveryDate || (s as any).delivery_date || raw['تاريخ التسليم'] || raw['تاريخ التسليم '] || '—';
                        const intPath = s.internalPath || raw['موقف المسار الداخلي'] || '—';
                        const extPath = s.externalPath || raw['موقف المسار الخارجي'] || '—';
                        const splicing = (s as any).splicingStatus || raw['موقف اللحامات'] || '—';
                        const classification = s.classification || raw['التصنيف النهائي'] || raw['التصنيف'] || '';
                        const obstacle = s.obstacleReason || raw['سبب المعوق او التعذر'] || '';

                        return (
                          <tr key={s.id || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{code}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[180px] truncate" title={name}>{name}</td>
                            <td className="py-2.5 px-3 text-slate-600 truncate max-w-[140px]" title={sector}>{sector}</td>
                            <td className="py-2.5 px-3 text-slate-600 truncate max-w-[140px]" title={admin}>{admin}</td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{pDate}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${isDel
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                  }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isDel ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
                                {delStatus}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{dDate}</td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-700 max-w-[120px] truncate" title={intPath}>{intPath}</td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-700 max-w-[120px] truncate" title={extPath}>{extPath}</td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-700 max-w-[120px] truncate" title={splicing}>{splicing}</td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-600 max-w-[180px]">
                              {obstacle ? (
                                <span className="text-rose-700 font-semibold truncate block" title={obstacle}>{obstacle}</span>
                              ) : (
                                <span className="truncate block" title={classification}>{classification || '—'}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                إجمالي المشروعات في هذه القائمة: <strong className="font-mono text-slate-800 font-bold">{filteredModalSites.length}</strong>
              </span>
              <button
                onClick={closeInspection}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
