// src/components/WeeklyPerformanceLineChart.tsx
// Executive Interactive Weekly Performance & SLA Line Chart
// Supports both:
// 1. Operator FTTS Mobile Rollout Mode (WE, Vodafone, Orange - October & November Weekly Target vs Delivered Dataset)
// 2. Availability Projects Mode (Weekly SLA / 3-Month Execution Window: Target vs Achieved vs Overdue)

import React, { useState, useMemo, useEffect } from 'react';
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
  Filter
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
  const startMonth = weekStart.toLocaleDateString('ar-EG', { month: 'short' });
  const endMonth = weekEnd.toLocaleDateString('ar-EG', { month: 'short' });
  if (startMonth === endMonth) {
    return `${weekStart.getDate()} - ${weekEnd.getDate()} ${startMonth} ${year}`;
  }
  return `${weekStart.getDate()} ${startMonth} - ${weekEnd.getDate()} ${endMonth} ${year}`;
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
  const asOfDate = useMemo(() => new Date('2026-11-22T23:59:59Z'), []);

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

  // Operator Rollout Data (Parsed from official operations Excel)
  const operatorRollout: OperatorWeeklySummary = useMemo(() => {
    return getOperatorWeeklyRollout(selectedOperator, activeDeptFilter);
  }, [selectedOperator, activeDeptFilter]);

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
    const weeklyBuckets: Array<{
      targetThisWeek: number;
      achievedThisWeek: number;
      overdueThisWeek: number;
    }> = Array.from({ length: totalWeeks }, () => ({
      targetThisWeek: 0,
      achievedThisWeek: 0,
      overdueThisWeek: 0,
    }));

    let deliveredCount = 0;
    let overdueCount = 0;
    let withinSlaCount = 0;
    let dueTargetCount = 0;

    for (const site of sites) {
      const raw = site.rawRecord || {};
      const pVal =
        site.paymentAndStartDate ||
        raw['تاريخ السداد والبدء في التنفيذ'] ||
        raw['تاريخ السداد و البدء فى التنفيذ'] ||
        raw.paymentAndStartDate ||
        raw.payment_and_start_date;
      const dVal = raw['تاريخ التسليم '] || raw['تاريخ التسليم'] || site.deliveryDate;

      const pDate = parseDateSafe(pVal);
      const dDate = parseDateSafe(dVal);

      const isDelivered =
        Boolean(dDate) ||
        site.status === 'تم الانتهاء' ||
        site.status === 'تم التسليم' ||
        site.classification === 'تم الانتهاء والتسليم' ||
        raw['موقف التسليم'] === 'تم التسليم' ||
        raw['التصنيف'] === 'تم الانتهاء والتسليم';

      // 3-Month Target Execution Window calculation
      let targetDate: Date | null = null;
      if (pDate) {
        targetDate = new Date(pDate.getTime());
        targetDate.setMonth(targetDate.getMonth() + 3);
      }

      // Check if target falls within timeline
      const tInfo = targetDate ? getWeekNumber(targetDate) : null;
      const dInfo = dDate ? getWeekNumber(dDate) : null;

      // 1) Target Bucket: due week
      if (tInfo) {
        if (tInfo.year < 2026) {
          weeklyBuckets[0].targetThisWeek++;
          dueTargetCount++;
        } else if (tInfo.year === 2026 && tInfo.week <= totalWeeks) {
          weeklyBuckets[tInfo.week - 1].targetThisWeek++;
          dueTargetCount++;
        } else {
          withinSlaCount++;
        }
      }

      // 2) Achieved Bucket: delivery week
      if (isDelivered) {
        deliveredCount++;
        let targetAchievedWeek = 1;
        if (dInfo) {
          if (dInfo.year < 2026) targetAchievedWeek = 1;
          else if (dInfo.year === 2026 && dInfo.week <= totalWeeks) targetAchievedWeek = Math.max(1, dInfo.week);
          else if (dInfo.year === 2026 && dInfo.week > totalWeeks) targetAchievedWeek = totalWeeks;
        } else {
          targetAchievedWeek = Math.min(45, totalWeeks);
        }
        weeklyBuckets[targetAchievedWeek - 1].achievedThisWeek++;
      } else {
        // 3) Overdue Bucket: 3-month window passed without delivery
        if (targetDate && targetDate <= asOfDate) {
          overdueCount++;
          let overWeek = 1;
          if (tInfo && tInfo.year === 2026 && tInfo.week <= totalWeeks) {
            overWeek = Math.max(1, tInfo.week);
          }
          weeklyBuckets[overWeek - 1].overdueThisWeek++;
        }
      }
    }

    let cTarget = 0;
    let cAchieved = 0;
    let cOverdue = 0;

    const weeklyPoints: AvailabilityWeekDataPoint[] = [];

    for (let w = 1; w <= totalWeeks; w++) {
      const b = weeklyBuckets[w - 1];
      cTarget += b.targetThisWeek;
      cAchieved += b.achievedThisWeek;
      cOverdue += b.overdueThisWeek;

      weeklyPoints.push({
        week: w,
        arabicName: ARABIC_ORDINALS[w] || `${w}`,
        dateRange: getWeekDateRange(w, 2026),
        targetThisWeek: b.targetThisWeek,
        achievedThisWeek: b.achievedThisWeek,
        overdueThisWeek: b.overdueThisWeek,
        cumTarget: cTarget,
        cumAchieved: cAchieved,
        cumOverdue: cOverdue,
      });
    }

    const onTimeRate = dueTargetCount > 0 ? Math.round((deliveredCount / dueTargetCount) * 100) : 100;

    return {
      totalSites: sites.length,
      totalTarget: dueTargetCount,
      totalAchieved: deliveredCount,
      totalOverdue: overdueCount,
      totalWithinSla: withinSlaCount,
      onTimeRate,
      weeklyPoints,
    };
  }, [isAvailability, sites, currentWeek, asOfDate]);

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
      // Operator Mode
      const maxSite = Math.max(
        10,
        ...operatorRollout.weeks.map((d) => Math.max(d.totalSites, d.targetRate, d.delivered))
      );
      return Math.max(10, Math.ceil((maxSite * 1.15) / 10) * 10);
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

  // ── Operator Mode Points (Weeks 1 to 6) ──
  const operatorTargetPoints = useMemo(() => {
    if (isAvailability) return [];
    const pts = [{ x: originX, y: originY }];
    operatorRollout.weeks.forEach((w, idx) => {
      pts.push({ x: getX(idx + 1), y: getY(w.targetRate) });
    });
    return pts;
  }, [isAvailability, operatorRollout.weeks, originX, originY, maxY]);

  const operatorDeliveredPoints = useMemo(() => {
    if (isAvailability) return [];
    const pts = [{ x: originX, y: originY }];
    operatorRollout.weeks.forEach((w, idx) => {
      pts.push({ x: getX(idx + 1), y: getY(w.delivered) });
    });
    return pts;
  }, [isAvailability, operatorRollout.weeks, originX, originY, maxY]);

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

  // Company Name in Arabic
  const companyLabelAr = useMemo(() => {
    switch (selectedOperator) {
      case 'WE':
        return 'المصرية للاتصالات (WE)';
      case 'Vodafone':
        return 'فودافون (Vodafone)';
      case 'Orange':
        return 'أورنج (Orange)';
      default:
        return 'كافة المشغلين (WE - Vodafone - Orange)';
    }
  }, [selectedOperator]);

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-sm my-6 transition-all duration-300">
      {/* ── Top Header Section ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 mb-5 border-b border-slate-100 gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md ring-4 ${
              isAvailability
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
                  : 'المسار الأسبوعي لمواقع الفايبر المنتهية والمشغلة (Weekly Fiber Rollout: Target vs Delivered)'}
              </h3>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  isAvailability
                    ? 'bg-teal-50 text-teal-800 border-teal-200/80'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200/80'
                }`}
              >
                {isAvailability ? 'مشاريع الإتاحة (Availability Projects)' : companyLabelAr}
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
                ? `متابعة أسبوعية لمشروعات الإتاحة: نافذة التسليم القياسية (3 أشهر من السداد)، ومعدل التسليم الفعلي، وحالات التأخير من الأسبوع 1 حتى الأسبوع ${totalSteps}`
                : `متابعة أسبوعية دقيقة لمواقع المحمول (أكتوبر - نوفمبر 2026): مقارنة المعدل المطلوب تسليمه بالمحقق فعلياً وتوزيع الإدارات العامة`}
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
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  selectedOperator === 'All'
                    ? 'bg-white text-indigo-700 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setSelectedOperator('WE')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  selectedOperator === 'WE'
                    ? 'bg-purple-600 text-white shadow-2xs font-black'
                    : 'text-slate-600 hover:text-purple-700'
                }`}
              >
                WE
              </button>
              <button
                onClick={() => setSelectedOperator('Vodafone')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  selectedOperator === 'Vodafone'
                    ? 'bg-rose-600 text-white shadow-2xs font-black'
                    : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                Vodafone
              </button>
              <button
                onClick={() => setSelectedOperator('Orange')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  selectedOperator === 'Orange'
                    ? 'bg-orange-600 text-white shadow-2xs font-black'
                    : 'text-slate-600 hover:text-orange-700'
                }`}
              >
                Orange
              </button>
            </div>
          )}

          {/* Availability View Mode Toggle */}
          {isAvailability && (
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setViewMode('cumulative')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'cumulative'
                    ? 'bg-white text-indigo-700 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📈 المسار التراكمي
              </button>
              <button
                onClick={() => setViewMode('weekly')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'weekly'
                    ? 'bg-white text-indigo-700 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📊 الإنجاز الأسبوعي
              </button>
            </div>
          )}

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
          <span>البيانات معتمدة من خطة التشغيل الميدانية • أكتوبر & نوفمبر 2026</span>
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
                      className={`text-[11px] font-mono ${
                        w === totalSteps ? 'font-black fill-teal-700 font-bold' : 'font-semibold fill-slate-500'
                      }`}
                    >
                      {w === totalSteps ? `أسبوع ${w} (الحالي)` : `أسبوع ${w}`}
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
                      className={`text-[11px] font-bold ${
                        idx === operatorRollout.weeks.length - 1 ? 'fill-sky-800 font-black' : 'fill-slate-600'
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
                      {w.weekDef.dateRangeAr.replace(' 2026', '')}
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
                onMouseEnter={() => setHoveredWeekIndex(idx)}
                onMouseLeave={() => setHoveredWeekIndex(null)}
              />
            );
          })}
        </svg>

        {/* ── Hover Tooltip (Interactive Floating Details Card) ── */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none transition-all duration-75 animate-in fade-in zoom-in-95"
            style={{
              left: `${(hoveredPoint.x / svgWidth) * 100}%`,
              top: `${(hoveredPoint.y / svgHeight) * 100}%`,
              transform: `translate(${hoveredPoint.x > svgWidth * 0.75 ? '-95%' : hoveredPoint.x < svgWidth * 0.25 ? '-5%' : '-50%'}, -110%)`,
            }}
          >
            <div
              className={`text-white p-3.5 rounded-2xl shadow-2xl border text-right min-w-[280px] max-w-[340px] backdrop-blur-md ${
                isAvailability
                  ? 'bg-slate-950/95 border-teal-500/40 shadow-teal-950/40'
                  : 'bg-slate-950/95 border-sky-400/40 shadow-sky-950/40'
              }`}
            >
              {/* Header: Week number & Dates */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/70 gap-2">
                <span
                  className={`font-black text-xs flex items-center gap-1.5 ${
                    isAvailability ? 'text-teal-300' : 'text-sky-300'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {isAvailability
                      ? `الأسبوع ${hoveredAvailabilityWeek?.arabicName} (${hoveredAvailabilityWeek?.week})`
                      : hoveredOperatorWeek?.weekDef.fullAr}
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {isAvailability ? hoveredAvailabilityWeek?.dateRange : hoveredOperatorWeek?.weekDef.dateRangeAr}
                </span>
              </div>

              {/* Tooltip Content */}
              {isAvailability && hoveredAvailabilityWeek ? (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0"></span>
                      <span>{viewMode === 'cumulative' ? 'المستهدف التراكمي (3 أشهر):' : 'تارجت الأسبوع (3 أشهر):'}</span>
                    </span>
                    <span className="font-mono font-bold text-sky-400">
                      {viewMode === 'cumulative' ? hoveredAvailabilityWeek.cumTarget : hoveredAvailabilityWeek.targetThisWeek} موقع
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                      <span>{viewMode === 'cumulative' ? 'تم التسليم التراكمي:' : 'تم تسليمه هذا الأسبوع:'}</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {viewMode === 'cumulative' ? hoveredAvailabilityWeek.cumAchieved : hoveredAvailabilityWeek.achievedThisWeek} موقع
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0"></span>
                      <span>{viewMode === 'cumulative' ? 'تجاوز المدة التراكمي:' : 'تجاوز المدة هذا الأسبوع:'}</span>
                    </span>
                    <span className="font-mono font-bold text-rose-400">
                      {viewMode === 'cumulative' ? hoveredAvailabilityWeek.cumOverdue : hoveredAvailabilityWeek.overdueThisWeek} موقع
                    </span>
                  </div>
                </div>
              ) : hoveredOperatorWeek ? (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0"></span>
                      <span>إجمالي مواقع النطاق:</span>
                    </span>
                    <span className="font-mono font-bold text-purple-300">
                      {hoveredOperatorWeek.totalSites} موقع
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0"></span>
                      <span>المعدل المطلوب تسليمه:</span>
                    </span>
                    <span className="font-mono font-bold text-sky-400">
                      {hoveredOperatorWeek.targetRate} موقع
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                      <span>ما تم تسليمه فعلياً:</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {hoveredOperatorWeek.delivered} موقع
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                      <span>نسبة تحقيق المطلوب:</span>
                    </span>
                    <span className="font-mono font-bold text-amber-300">
                      {hoveredOperatorWeek.achievementPercent}%
                    </span>
                  </div>

                  {/* Departments Mini Breakdown */}
                  <div className="pt-2 mt-2 border-t border-slate-800 text-[10px]">
                    <span className="text-slate-400 block mb-1 font-bold">توزيع الإدارات لهذا الأسبوع (مسلّم / مطلوب):</span>
                    <div className="grid grid-cols-2 gap-1 font-mono">
                      {hoveredOperatorWeek.deptRows.map((d) => (
                        <div key={d.rawAdmin} className="bg-slate-900/80 px-1.5 py-0.5 rounded flex justify-between text-slate-300">
                          <span className="truncate max-w-[90px]">{d.shortAdmin}</span>
                          <span className="text-emerald-400 font-bold">{d.delivered}/{d.targetRate}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* ── Executive Summary KPI Cards ── */}
      {isAvailability ? (
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-0.5">
            <span className="text-[11px] font-bold text-slate-500 block">مشروعات النطاق المفلتر</span>
            <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
              {availabilityStats.totalSites}
            </span>
            <span className="text-[10px] text-slate-400 block font-semibold">مشروع في النطاق</span>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center space-y-0.5">
            <span className="text-[11px] font-bold text-emerald-800 block">تم تسليمها واعتمادها</span>
            <span className="text-base sm:text-lg font-black text-emerald-700 font-mono">
              {availabilityStats.totalAchieved}
            </span>
            <span className="text-[10px] text-emerald-600 block font-semibold">موقع منتهي ومسلم</span>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200 text-center space-y-0.5">
            <span className="text-[11px] font-bold text-rose-800 block">تجاوزت مدة الـ 3 أشهر</span>
            <span className="text-base sm:text-lg font-black text-rose-700 font-mono">
              {availabilityStats.totalOverdue}
            </span>
            <span className="text-[10px] text-rose-600 block font-semibold">تجاوزت نافذة التسليم</span>
          </div>

          <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-200 text-center space-y-0.5">
            <span className="text-[11px] font-bold text-sky-800 block">سارية ضمن فترة الـ 3 أشهر</span>
            <span className="text-base sm:text-lg font-black text-sky-700 font-mono">
              {availabilityStats.totalWithinSla}
            </span>
            <span className="text-[10px] text-sky-600 block font-semibold">قيد التنفيذ ضمن المهلة</span>
          </div>
        </div>
      ) : (
        /* Operator KPI Cards */
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-0.5">
              <span className="text-[11px] font-bold text-slate-500 block">إجمالي عدد المواقع</span>
              <span className="text-lg sm:text-xl font-black text-slate-900 font-mono">
                {operatorRollout.latestWeek.totalSites}
              </span>
              <span className="text-[10px] text-slate-400 block font-semibold">موقع محمول في الخطة</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 text-center space-y-0.5">
              <span className="text-[11px] font-bold text-sky-800 block">المعدل المطلوب (W2-Nov)</span>
              <span className="text-lg sm:text-xl font-black text-sky-700 font-mono">
                {operatorRollout.latestWeek.targetRate}
              </span>
              <span className="text-[10px] text-sky-600 block font-semibold">موقع مطلوب تسليمه</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center space-y-0.5">
              <span className="text-[11px] font-bold text-emerald-800 block">ما تم تسليمه فعلياً</span>
              <span className="text-lg sm:text-xl font-black text-emerald-700 font-mono">
                {operatorRollout.latestWeek.delivered}
              </span>
              <span className="text-[10px] text-emerald-600 block font-semibold">موقع مسلم بالكامل</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-center space-y-0.5">
              <span className="text-[11px] font-bold text-indigo-800 block">نسبة تحقيق المطلوب</span>
              <span className="text-lg sm:text-xl font-black text-indigo-700 font-mono">
                {operatorRollout.latestWeek.achievementPercent}%
              </span>
              <span className="text-[10px] text-indigo-600 block font-semibold">
                {operatorRollout.latestWeek.gap >= 0 ? `فائض: +${operatorRollout.latestWeek.gap}` : `عجز: ${operatorRollout.latestWeek.gap}`} موقع
              </span>
            </div>
          </div>

          {/* ── General Departments Breakdown Grid (Interactive) ── */}
          <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs sm:text-sm font-black text-slate-800">
                  تفصيل الإدارات العامة لتنفيذ الشبكات (حتى الأسبوع الثاني - نوفمبر 2026)
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
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/90 border-indigo-400 ring-2 ring-indigo-200 shadow-sm'
                        : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-slate-800 leading-tight">
                        {dept.canonicalAdmin}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-black ${
                        dept.achievementPercent >= 100
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
                        className={`h-full rounded-full transition-all duration-300 ${
                          dept.achievementPercent >= 100
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
      )}

      {/* ── Footer Information Note ── */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>
            {isAvailability
              ? 'يتم احتساب التارجت آلياً بإضافة 3 أشهر لتاريخ السداد والبدء في التنفيذ، وتحدد حالة التسليم أسبوعياً بناءً على تاريخ التسليم المعتمد.'
              : 'البيانات المعروضة تتضمن تتبع التسليم المعتمد والمعدل المطلوب تسليمه لكافة أسابيع أكتوبر ونوفمبر 2026 لمواقع المحمول.'}
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-400">
          {isAvailability ? `إجمالي الأسابيع المعروضة: ${totalSteps} أسبوعاً • سنة 2026` : '6 أسابيع (أكتوبر ونوفمبر 2026)'}
        </span>
      </div>
    </div>
  );
};
