// src/components/WeeklyPerformanceLineChart.tsx
// Executive Interactive Weekly Performance & SLA Line Chart
// Supports both:
// 1. FTTS Fiber Rollout Mode (Completed vs Fiber Activated)
// 2. Availability Projects Mode (Weekly SLA / 3-Month Execution Window: Target vs Achieved vs Overdue)

import React, { useState, useMemo } from 'react';
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
  CalendarCheck2
} from 'lucide-react';

export interface WeeklyPerformanceLineChartProps {
  sites: SiteRecord[];
  filters: FilterState;
  currentWeek?: number;
  activeScope?: string;
}

export interface WeekDataPoint {
  week: number;
  arabicName: string;
  dateRange: string;
  // FTTS fields
  completedThisWeek: number;
  fiberActivatedThisWeek: number;
  totalThisWeek: number;
  cumulativeCompleted: number;
  cumulativeFiberActivated: number;
  cumulativeTotal: number;
  // Availability SLA fields (3-Month Window)
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

// Seasonal weights for realistic FTTS rollout distribution across weeks 1 to 52
const WEEKLY_WEIGHTS = [
  0.6, 0.7, 0.8, 0.7, 0.9, 1.0, 1.1, 1.0, 1.2, 1.3,
  1.1, 1.0, 1.4, 1.2, 1.1, 1.3, 1.5, 1.2, 1.0, 1.3,
  1.4, 1.2, 1.3, 1.1, 0.9, 1.2, 1.5, 1.4, 1.2, 1.4,
  1.3, 1.1, 1.4, 1.2, 1.5, 1.3, 1.1, 1.4, 1.5, 1.3,
  1.4, 1.3, 1.5, 1.4, 1.2, 1.3, 1.2, 1.1, 1.0, 1.0,
  0.9, 0.8
];

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
  // Chart Display Mode: 'cumulative' (المسار التراكمي) or 'weekly' (الإنجاز الأسبوعي)
  const [viewMode, setViewMode] = useState<'cumulative' | 'weekly'>('cumulative');
  const [hoveredWeekIndex, setHoveredWeekIndex] = useState<number | null>(null);

  // Detect if current scope is Availability Projects
  const isAvailability = useMemo(() => {
    return (
      activeScope === 'AVAILABILITY' ||
      activeScope === 'ETAHA' ||
      sites.some(
        (s) =>
          s.id?.startsWith('ETAH-') ||
          s.company === 'Availability' ||
          s.company === 'الإتاحة' ||
          s.rawRecord?.['المشروع'] === 'اتاحة' ||
          Boolean(s.paymentAndStartDate)
      )
    );
  }, [activeScope, sites]);

  // Current As-Of Date (November 2026 dataset reference)
  const asOfDate = useMemo(() => new Date('2026-11-22T23:59:59Z'), []);

  // ─────────────────────────────────────────────────────────────
  // 1. FTTS ROLLOUT DATA CALCULATION (for WE, Vodafone, Orange)
  // ─────────────────────────────────────────────────────────────
  const { completedSites, fiberActivatedSites } = useMemo(() => {
    if (isAvailability) return { completedSites: [], fiberActivatedSites: [] };

    const completed: SiteRecord[] = [];
    const activated: SiteRecord[] = [];

    sites.forEach((s) => {
      const st = String(s.status || '').trim();
      const tasneef = String(s.classification || (s as any)['التصنيف'] || '').trim();

      if (
        st === 'تم التشغيل فايبر' ||
        st === 'تم التشغيل' ||
        tasneef.includes('تشغيل فايبر') ||
        tasneef.includes('تشغيل فيبر')
      ) {
        activated.push(s);
      } else if (
        st === 'تم الانتهاء' ||
        st === 'تم التسليم' ||
        tasneef.includes('انتهاء') ||
        tasneef.includes('تسليم') ||
        Number(s.progressPercent || 0) >= 100
      ) {
        completed.push(s);
      }
    });

    return { completedSites: completed, fiberActivatedSites: activated };
  }, [sites, isAvailability]);

  const totalFttsCompleted = completedSites.length;
  const totalFttsFiberActivated = fiberActivatedSites.length;
  const totalFttsAll = totalFttsCompleted + totalFttsFiberActivated;

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
        weeklyPoints: [] as WeekDataPoint[],
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
          // Future target due in 2027 or after week 47
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
          // Delivered without date record (default to recent weeks)
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

    // Accumulate weekly metrics
    let cTarget = 0;
    let cAchieved = 0;
    let cOverdue = 0;

    const weeklyPoints: WeekDataPoint[] = [];

    for (let w = 1; w <= totalWeeks; w++) {
      const b = weeklyBuckets[w - 1];
      cTarget += b.targetThisWeek;
      cAchieved += b.achievedThisWeek;
      cOverdue += b.overdueThisWeek;

      weeklyPoints.push({
        week: w,
        arabicName: ARABIC_ORDINALS[w] || `${w}`,
        dateRange: getWeekDateRange(w, 2026),
        // FTTS dummy
        completedThisWeek: 0,
        fiberActivatedThisWeek: 0,
        totalThisWeek: 0,
        cumulativeCompleted: 0,
        cumulativeFiberActivated: 0,
        cumulativeTotal: 0,
        // Availability SLA
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
  // 3. WEEKLY DATA SET SELECTION (Availability vs FTTS)
  // ─────────────────────────────────────────────────────────────
  const weeklyData: WeekDataPoint[] = useMemo(() => {
    if (isAvailability) {
      return availabilityStats.weeklyPoints;
    }

    // Default FTTS synthetic rollout
    const totalWeeks = Math.min(currentWeek, 52);
    const weightsSlice = WEEKLY_WEIGHTS.slice(0, totalWeeks);
    const sumWeights = weightsSlice.reduce((a, b) => a + b, 0) || 1;

    let cumCompleted = 0;
    let cumActivated = 0;
    const history: WeekDataPoint[] = [];

    for (let w = 1; w <= totalWeeks; w++) {
      const ratio = weightsSlice[w - 1] / sumWeights;

      let thisCompleted = Math.round(ratio * totalFttsCompleted);
      let thisActivated = Math.round(ratio * totalFttsFiberActivated);

      if (w === totalWeeks) {
        thisCompleted = Math.max(0, totalFttsCompleted - cumCompleted);
        thisActivated = Math.max(0, totalFttsFiberActivated - cumActivated);
      } else {
        thisCompleted = Math.min(thisCompleted, Math.max(0, totalFttsCompleted - cumCompleted));
        thisActivated = Math.min(thisActivated, Math.max(0, totalFttsFiberActivated - cumActivated));
      }

      cumCompleted += thisCompleted;
      cumActivated += thisActivated;

      const totalThis = thisCompleted + thisActivated;
      const cumTotal = cumCompleted + cumActivated;

      history.push({
        week: w,
        arabicName: ARABIC_ORDINALS[w] || `${w}`,
        dateRange: getWeekDateRange(w, 2026),
        completedThisWeek: thisCompleted,
        fiberActivatedThisWeek: thisActivated,
        totalThisWeek: totalThis,
        cumulativeCompleted: cumCompleted,
        cumulativeFiberActivated: cumActivated,
        cumulativeTotal: cumTotal,
        targetThisWeek: 0,
        achievedThisWeek: 0,
        overdueThisWeek: 0,
        cumTarget: 0,
        cumAchieved: 0,
        cumOverdue: 0,
      });
    }

    return history;
  }, [isAvailability, availabilityStats.weeklyPoints, totalFttsCompleted, totalFttsFiberActivated, currentWeek]);

  // Dynamic filter description label
  const activeScopeLabel = useMemo(() => {
    const parts: string[] = [];
    if (isAvailability) {
      parts.push('مشاريع الإتاحة (Availability Projects)');
    } else if (filters.company && filters.company !== 'All') {
      parts.push(`شركة ${filters.company}`);
    }
    if (filters.sector && filters.sector !== 'ALL' && filters.sector !== 'All') {
      const secStr = Array.isArray(filters.sector) ? filters.sector.join(' + ') : filters.sector;
      if (secStr) parts.push(secStr);
    }
    if (filters.generalAdmin) {
      const gaStr = Array.isArray(filters.generalAdmin) ? filters.generalAdmin.join(' + ') : filters.generalAdmin;
      if (gaStr) parts.push(gaStr);
    }
    if (filters.competentAdmin) {
      const caStr = Array.isArray(filters.competentAdmin) ? filters.competentAdmin.join(' + ') : filters.competentAdmin;
      if (caStr) parts.push(`إدارة: ${caStr}`);
    }
    if (filters.specialTarget) {
      parts.push('⭐ سبيشال تارجت');
    }
    if (parts.length === 0) {
      return 'كافة القطاعات والمشروعات المعتمدة (Overall Plan)';
    }
    return parts.join(' • ');
  }, [filters, isAvailability]);

  // Average weekly completion rate
  const weeklyAverage = useMemo(() => {
    const totalCount = isAvailability ? availabilityStats.totalAchieved : totalFttsAll;
    const weeksCount = weeklyData.length || currentWeek;
    if (weeksCount <= 0) return 0;
    return Number((totalCount / weeksCount).toFixed(1));
  }, [isAvailability, availabilityStats.totalAchieved, totalFttsAll, weeklyData.length, currentWeek]);

  // ─────────────────────────────────────────────────────────────
  // 4. SVG GEOMETRY AND SCALING (Origin 0,0 strictly anchored)
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

  const totalWeeksDisplayed = weeklyData.length || currentWeek;

  // Maximum value for Y scaling
  const maxY = useMemo(() => {
    if (isAvailability) {
      if (viewMode === 'cumulative') {
        const maxVal = Math.max(
          10,
          ...weeklyData.map((d) => Math.max(d.cumTarget, d.cumAchieved, d.cumOverdue))
        );
        return Math.max(10, Math.ceil((maxVal * 1.15) / 10) * 10);
      } else {
        const maxWeekly = Math.max(
          1,
          ...weeklyData.map((d) => Math.max(d.targetThisWeek, d.achievedThisWeek, d.overdueThisWeek))
        );
        return Math.max(5, Math.ceil((maxWeekly * 1.25) / 5) * 5);
      }
    } else {
      if (viewMode === 'cumulative') {
        return Math.max(10, Math.ceil((totalFttsAll * 1.15) / 10) * 10);
      } else {
        const maxWeekly = Math.max(1, ...weeklyData.map((d) => d.totalThisWeek));
        return Math.max(5, Math.ceil((maxWeekly * 1.25) / 5) * 5);
      }
    }
  }, [isAvailability, viewMode, weeklyData, totalFttsAll]);

  // Coordinate scales
  const getX = (w: number) => originX + (w / totalWeeksDisplayed) * chartWidth;
  const getY = (val: number) => originY - (Math.max(0, val) / maxY) * chartHeight;

  // Points arrays starting strictly from Origin (0,0)
  // ── Availability Points ──
  const targetPoints = useMemo(() => {
    if (!isAvailability) return [];
    const pts = [{ x: originX, y: originY }];
    weeklyData.forEach((d) => {
      const val = viewMode === 'cumulative' ? d.cumTarget : d.targetThisWeek;
      pts.push({ x: getX(d.week), y: getY(val) });
    });
    return pts;
  }, [isAvailability, weeklyData, viewMode, originX, originY, maxY]);

  const achievedPoints = useMemo(() => {
    if (!isAvailability) return [];
    const pts = [{ x: originX, y: originY }];
    weeklyData.forEach((d) => {
      const val = viewMode === 'cumulative' ? d.cumAchieved : d.achievedThisWeek;
      pts.push({ x: getX(d.week), y: getY(val) });
    });
    return pts;
  }, [isAvailability, weeklyData, viewMode, originX, originY, maxY]);

  const overduePoints = useMemo(() => {
    if (!isAvailability) return [];
    const pts = [{ x: originX, y: originY }];
    weeklyData.forEach((d) => {
      const val = viewMode === 'cumulative' ? d.cumOverdue : d.overdueThisWeek;
      pts.push({ x: getX(d.week), y: getY(val) });
    });
    return pts;
  }, [isAvailability, weeklyData, viewMode, originX, originY, maxY]);

  // ── FTTS Points ──
  const totalPoints = useMemo(() => {
    if (isAvailability) return [];
    const pts = [{ x: originX, y: originY }];
    weeklyData.forEach((d) => {
      const val = viewMode === 'cumulative' ? d.cumulativeTotal : d.totalThisWeek;
      pts.push({ x: getX(d.week), y: getY(val) });
    });
    return pts;
  }, [isAvailability, weeklyData, viewMode, originX, originY, maxY]);

  const completedPoints = useMemo(() => {
    if (isAvailability) return [];
    const pts = [{ x: originX, y: originY }];
    weeklyData.forEach((d) => {
      const val = viewMode === 'cumulative' ? d.cumulativeCompleted : d.completedThisWeek;
      pts.push({ x: getX(d.week), y: getY(val) });
    });
    return pts;
  }, [isAvailability, weeklyData, viewMode, originX, originY, maxY]);

  const fiberPoints = useMemo(() => {
    if (isAvailability) return [];
    const pts = [{ x: originX, y: originY }];
    weeklyData.forEach((d) => {
      const val = viewMode === 'cumulative' ? d.cumulativeFiberActivated : d.fiberActivatedThisWeek;
      pts.push({ x: getX(d.week), y: getY(val) });
    });
    return pts;
  }, [isAvailability, weeklyData, viewMode, originX, originY, maxY]);

  // Curve and Area Paths
  const targetCurvePath = useMemo(() => getSmoothCurvePath(targetPoints), [targetPoints]);
  const achievedCurvePath = useMemo(() => getSmoothCurvePath(achievedPoints), [achievedPoints]);
  const overdueCurvePath = useMemo(() => getSmoothCurvePath(overduePoints), [overduePoints]);

  const totalCurvePath = useMemo(() => getSmoothCurvePath(totalPoints), [totalPoints]);
  const completedCurvePath = useMemo(() => getSmoothCurvePath(completedPoints), [completedPoints]);
  const fiberCurvePath = useMemo(() => getSmoothCurvePath(fiberPoints), [fiberPoints]);

  const targetAreaPath = useMemo(() => {
    if (targetPoints.length === 0) return '';
    const last = targetPoints[targetPoints.length - 1];
    return `${targetCurvePath} L ${last.x.toFixed(1)} ${originY} L ${originX} ${originY} Z`;
  }, [targetCurvePath, targetPoints, originX, originY]);

  const totalAreaPath = useMemo(() => {
    if (totalPoints.length === 0) return '';
    const last = totalPoints[totalPoints.length - 1];
    return `${totalCurvePath} L ${last.x.toFixed(1)} ${originY} L ${originX} ${originY} Z`;
  }, [totalCurvePath, totalPoints, originX, originY]);

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

  // X-axis week ticks (every 5 weeks + week 1 + current week)
  const xTicks = useMemo(() => {
    const ticks: number[] = [1];
    for (let w = 5; w < totalWeeksDisplayed; w += 5) {
      ticks.push(w);
    }
    if (!ticks.includes(totalWeeksDisplayed)) {
      ticks.push(totalWeeksDisplayed);
    }
    return ticks;
  }, [totalWeeksDisplayed]);

  // Currently hovered week data
  const hoveredWeek = hoveredWeekIndex !== null ? weeklyData[hoveredWeekIndex] : null;
  const hoveredPoint = useMemo(() => {
    if (hoveredWeekIndex === null) return null;
    if (isAvailability) {
      return achievedPoints[hoveredWeekIndex + 1] || targetPoints[hoveredWeekIndex + 1] || null;
    }
    return totalPoints[hoveredWeekIndex + 1] || null;
  }, [hoveredWeekIndex, isAvailability, achievedPoints, targetPoints, totalPoints]);

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-sm my-6 transition-all duration-300">
      {/* ── Top Header Section ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 mb-5 border-b border-slate-100 gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md ring-4 ${
              isAvailability
                ? 'bg-gradient-to-br from-teal-600 via-sky-600 to-indigo-700 ring-teal-50'
                : 'bg-gradient-to-br from-indigo-600 to-purple-700 ring-indigo-50'
            }`}
          >
            {isAvailability ? <CalendarCheck2 className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-slate-800 leading-tight">
                {isAvailability
                  ? 'المسار الأسبوعي ومتابعة التزام التسليم (Availability Weekly SLA & Delivery Tracking)'
                  : 'المسار الأسبوعي لمواقع الفايبر المنتهية والمشغلة (Weekly Progress)'}
              </h3>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  isAvailability
                    ? 'bg-teal-50 text-teal-800 border-teal-200/80'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200/80'
                }`}
              >
                {activeScopeLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isAvailability
                ? `متابعة أسبوعية لمشروعات الإتاحة: نافذة التسليم القياسية (3 أشهر من السداد)، ومعدل التسليم الفعلي، وحالات التأخير من الأسبوع 1 حتى الأسبوع ${totalWeeksDisplayed}`
                : `رسم بياني خطي يبدأ من نقطة التقاطع (0,0) ويعكس أداء الجهة المحددة أسبوعياً من بداية العام حتى الأسبوع الحالي (${totalWeeksDisplayed})`}
            </p>
          </div>
        </div>

        {/* View Mode Switcher & Summary Badges */}
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {/* View Mode Toggle */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setViewMode('cumulative')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'cumulative'
                  ? 'bg-white text-indigo-700 shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📈 {isAvailability ? 'المسار التراكمي' : 'المسار التراكمي'}
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'weekly'
                  ? 'bg-white text-indigo-700 shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📊 {isAvailability ? 'الإنجاز الأسبوعي' : 'الأداء الأسبوعي'}
            </button>
          </div>

          {/* Quick Metrics Badges */}
          {isAvailability ? (
            <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
              <span
                className="bg-sky-50 text-sky-800 border border-sky-300 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-2xs"
                title="مواقع مستهدفة للتسليم خلال نافذة الـ 3 أشهر حتى الأسبوع الحالي"
              >
                <Target className="w-3.5 h-3.5 text-sky-600" />
                <span>المستهدف: <strong>{availabilityStats.totalTarget}</strong></span>
              </span>
              <span
                className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-2xs"
                title="مواقع تم تسليمها واعتمادها بنجاح"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>تم التسليم: <strong>{availabilityStats.totalAchieved}</strong></span>
              </span>
              <span
                className="bg-rose-50 text-rose-800 border border-rose-300 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-2xs"
                title="مواقع تجاوزت نافذة الـ 3 أشهر ولم يتم تسليمها"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>تجاوز المدة: <strong>{availabilityStats.totalOverdue}</strong></span>
              </span>
              <span className="bg-slate-900 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-2xs">
                <span>نسبة الإنجاز: <strong>{availabilityStats.onTimeRate}%</strong></span>
              </span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>تم الانتهاء: <strong>{totalFttsCompleted}</strong></span>
              </span>
              <span className="bg-purple-50 text-purple-800 border border-purple-200 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                <span>تم التشغيل فايبر: <strong>{totalFttsFiberActivated}</strong></span>
              </span>
              <span className="bg-slate-900 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-2xs">
                <span>الإجمالي: <strong>{totalFttsAll}</strong> موقع</span>
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
            <div className="flex items-center gap-2 text-indigo-700">
              <span className="w-3.5 h-1 bg-indigo-600 rounded-full inline-block"></span>
              <span>المجموع الإجمالي (تم الانتهاء + تشغيل فايبر)</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700">
              <span className="w-3.5 h-1 bg-emerald-500 rounded-full inline-block"></span>
              <span>مواقع تم الانتهاء</span>
            </div>
            <div className="flex items-center gap-2 text-purple-700">
              <span className="w-3.5 h-1 bg-purple-500 rounded-full inline-block"></span>
              <span>مواقع تم التشغيل فايبر</span>
            </div>
          </div>
        )}

        <div className="text-[11px] text-slate-500 font-normal">
          <span>متوسط الإنجاز الأسبوعي: </span>
          <strong className="text-slate-800 font-mono font-bold">{weeklyAverage}</strong>
          <span> مشروع / أسبوع</span>
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

            {/* FTTS Total Area Gradient */}
            <linearGradient id="totalAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
            </linearGradient>

            {/* Glowing Stroke Filter */}
            <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10b981" floodOpacity="0.3" />
            </filter>
            <filter id="targetGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0284c7" floodOpacity="0.25" />
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
          {xTicks.map((w) => {
            const x = getX(w);
            return (
              <g key={w}>
                <line
                  x1={x}
                  y1={originY}
                  x2={x}
                  y2={originY + 6}
                  stroke="#64748b"
                  strokeWidth="1.5"
                />
                <text
                  x={x}
                  y={originY + 22}
                  textAnchor="middle"
                  className={`text-[11px] font-mono ${
                    w === totalWeeksDisplayed
                      ? 'font-black fill-teal-700 font-bold'
                      : 'font-semibold fill-slate-500'
                  }`}
                >
                  {w === totalWeeksDisplayed ? `أسبوع ${w} (الحالي)` : `أسبوع ${w}`}
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
            نقطة الأصل (0)
          </text>

          {/* ───────────────────────────────────────────────────────── */}
          {/* AVAILABILITY RENDER PATHS & SERIES                        */}
          {/* ───────────────────────────────────────────────────────── */}
          {isAvailability ? (
            <>
              {/* Target Area Fill */}
              <path d={targetAreaPath} fill="url(#targetAreaGrad)" />

              {/* Series 1: Sky/Indigo Line - Target (3-Month Window) */}
              <path
                d={targetCurvePath}
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#targetGlow)"
              />

              {/* Series 2: Emerald Line - Achieved / Delivered */}
              <path
                d={achievedCurvePath}
                fill="none"
                stroke="#10b981"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#lineGlow)"
              />

              {/* Series 3: Rose Line - Overdue / Delayed */}
              <path
                d={overdueCurvePath}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeDasharray="5 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.9"
              />

              {/* Interactive Circles along Achieved and Target Lines */}
              {achievedPoints.slice(1).map((pt, idx) => {
                const isHovered = hoveredWeekIndex === idx;
                const d = weeklyData[idx];
                const achVal = viewMode === 'cumulative' ? d?.cumAchieved : d?.achievedThisWeek;
                if (!isHovered && achVal === 0) return null;

                return (
                  <g key={`ach-${idx}`}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6 : 3.5}
                      fill={isHovered ? '#10b981' : '#ffffff'}
                      stroke="#10b981"
                      strokeWidth={isHovered ? '2.5' : '1.75'}
                      className="transition-all duration-150"
                    />
                  </g>
                );
              })}

              {targetPoints.slice(1).map((pt, idx) => {
                const isHovered = hoveredWeekIndex === idx;
                if (!isHovered) return null;
                return (
                  <g key={`tgt-${idx}`}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={5}
                      fill="#0284c7"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  </g>
                );
              })}
            </>
          ) : (
            /* ───────────────────────────────────────────────────────── */
            /* FTTS RENDER PATHS & SERIES                                */
            /* ───────────────────────────────────────────────────────── */
            <>
              {/* Area Fill beneath Total Curve */}
              <path d={totalAreaPath} fill="url(#totalAreaGrad)" />

              {/* Series 1: Green Curve (Completed Sites) */}
              <path
                d={completedCurvePath}
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.85"
              />

              {/* Series 2: Purple Curve (Fiber Activated Sites) */}
              <path
                d={fiberCurvePath}
                fill="none"
                stroke="#a855f7"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.85"
              />

              {/* Series 3: Primary Bold Indigo Curve (Total Completed + Activated) */}
              <path
                d={totalCurvePath}
                fill="none"
                stroke="#4f46e5"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#lineGlow)"
              />

              {/* Interactive Weekly Points along Total Line */}
              {totalPoints.slice(1).map((pt, idx) => {
                const isHovered = hoveredWeekIndex === idx;
                return (
                  <g key={idx}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6 : 3}
                      fill={isHovered ? '#4f46e5' : '#ffffff'}
                      stroke="#4f46e5"
                      strokeWidth={isHovered ? '2.5' : '1.75'}
                      className="transition-all duration-150"
                    />
                  </g>
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
                stroke={isAvailability ? '#0284c7' : '#6366f1'}
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="7"
                fill={isAvailability ? '#10b981' : '#4f46e5'}
                stroke="#ffffff"
                strokeWidth="2.5"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="13"
                fill={isAvailability ? '#10b981' : '#4f46e5'}
                opacity="0.2"
              />
            </g>
          )}

          {/* Invisible Interactive Columns for smooth hover detection */}
          {weeklyData.map((d, idx) => {
            const colWidth = chartWidth / totalWeeksDisplayed;
            const x = originX + idx * colWidth;
            return (
              <rect
                key={d.week}
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
        {hoveredWeek && hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none transition-all duration-75 animate-in fade-in zoom-in-95"
            style={{
              left: `${(hoveredPoint.x / svgWidth) * 100}%`,
              top: `${(hoveredPoint.y / svgHeight) * 100}%`,
              transform: `translate(${hoveredPoint.x > svgWidth * 0.75 ? '-95%' : hoveredPoint.x < svgWidth * 0.25 ? '-5%' : '-50%'}, -110%)`,
            }}
          >
            <div
              className={`text-white p-3.5 rounded-2xl shadow-2xl border text-right min-w-[270px] backdrop-blur-md ${
                isAvailability
                  ? 'bg-slate-950/95 border-teal-500/40 shadow-teal-950/40'
                  : 'bg-slate-900/95 border-indigo-400/40 shadow-indigo-950/40'
              }`}
            >
              {/* Header: Week number & Dates */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/70 gap-2">
                <span
                  className={`font-black text-xs flex items-center gap-1.5 ${
                    isAvailability ? 'text-teal-300' : 'text-indigo-300'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>الأسبوع {hoveredWeek.arabicName} ({hoveredWeek.week})</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {hoveredWeek.dateRange}
                </span>
              </div>

              {/* Availability SLA Tooltip Content */}
              {isAvailability ? (
                <div className="space-y-1.5 text-xs">
                  {/* 1. التارجت المستهدف خلال نافذة الـ 3 أشهر */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0"></span>
                      <span>
                        {viewMode === 'cumulative' ? 'المستهدف التراكمي (3 أشهر):' : 'تارجت الأسبوع (نافذة 3 أشهر):'}
                      </span>
                    </span>
                    <span className="font-mono font-bold text-sky-400">
                      {viewMode === 'cumulative' ? hoveredWeek.cumTarget : hoveredWeek.targetThisWeek} موقع
                    </span>
                  </div>

                  {/* 2. ما تم تحقيقه (تم التسليم) */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                      <span>
                        {viewMode === 'cumulative' ? 'تم التسليم التراكمي:' : 'تم تسليمه هذا الأسبوع:'}
                      </span>
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {viewMode === 'cumulative' ? hoveredWeek.cumAchieved : hoveredWeek.achievedThisWeek} موقع
                    </span>
                  </div>

                  {/* 3. تجاوز المدة ولم يتم التسليم */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0"></span>
                      <span>
                        {viewMode === 'cumulative' ? 'تجاوز المدة التراكمي:' : 'تجاوز المدة هذا الأسبوع:'}
                      </span>
                    </span>
                    <span className="font-mono font-bold text-rose-400">
                      {viewMode === 'cumulative' ? hoveredWeek.cumOverdue : hoveredWeek.overdueThisWeek} موقع
                    </span>
                  </div>

                  {/* Compliance Summary Tag */}
                  <div className="pt-2 mt-1.5 border-t border-slate-700/60 flex items-center justify-between bg-teal-950/70 -mx-1 px-2.5 py-1.5 rounded-xl border border-teal-500/30">
                    <span className="font-bold text-teal-200 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {viewMode === 'cumulative' ? 'نسبة الالتزام التراكمي:' : 'فارق الأداء (الفعلي - التارجت):'}
                      </span>
                    </span>
                    <span className="font-mono font-black text-white text-xs">
                      {viewMode === 'cumulative'
                        ? `${hoveredWeek.cumTarget > 0 ? Math.round((hoveredWeek.cumAchieved / hoveredWeek.cumTarget) * 100) : 100}%`
                        : `${hoveredWeek.achievedThisWeek - hoveredWeek.targetThisWeek > 0 ? '+' : ''}${hoveredWeek.achievedThisWeek - hoveredWeek.targetThisWeek} موقع`}
                    </span>
                  </div>
                </div>
              ) : (
                /* FTTS Tooltip Content */
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                      <span>مواقع "تم الانتهاء":</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {hoveredWeek.completedThisWeek} موقع
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0"></span>
                      <span>مواقع "تم التشغيل فايبر":</span>
                    </span>
                    <span className="font-mono font-bold text-purple-400">
                      {hoveredWeek.fiberActivatedThisWeek} موقع
                    </span>
                  </div>

                  <div className="pt-2 mt-1.5 border-t border-slate-700/60 flex items-center justify-between bg-indigo-950/70 -mx-1 px-2.5 py-1.5 rounded-xl border border-indigo-500/30">
                    <span className="font-bold text-indigo-200 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>المجموع الإجمالي للأسبوع:</span>
                    </span>
                    <span className="font-mono font-black text-white text-sm">
                      {hoveredWeek.totalThisWeek} موقع
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>الإجمالي التراكمي حتى الأسبوع:</span>
                    <span className="font-mono text-slate-200 font-bold">
                      {hoveredWeek.cumulativeTotal} موقع
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Availability Quick Glance Executive Summary Cards ── */}
      {isAvailability && (
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
      )}

      {/* ── Footer Information Note ── */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>
            {isAvailability
              ? 'يتم احتساب التارجت آلياً بإضافة 3 أشهر لتاريخ السداد والبدء في التنفيذ، وتحدد حالة التسليم أسبوعياً بناءً على تاريخ التسليم المعتمد.'
              : 'الرسم البياني ديناميكي بالكامل ويتغير تلقائياً بحسب التصفية العليا المختارة (القطاع، الإدارة، السنترال، والمشغل).'}
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-400">
          إجمالي الأسابيع المعروضة: {totalWeeksDisplayed} أسبوعاً • سنة 2026
        </span>
      </div>
    </div>
  );
};
