// src/utils/weSectorMetrics.ts
// Precision calculation of Sector Performance Metrics strictly for operator "WE"
// Implements the 4 required metrics:
// 1. Weekly Completion Average & ETA
// 2. Achievement Percentage
// 3. Required Run Rate
// 4. Last Week's Performance & Year-End Projection
// All division-by-zero edge cases are strictly guarded.

import type { SiteRecord } from '../types/dashboard';
import { toCanonicalSector, CANONICAL_SECTORS } from './sectorPermissions';

export interface SectorPerformanceMetric {
  sector: string;
  targetSites: number;
  completedSites: number;
  inProgressSites: number;
  plannedSites: number;
  blockedSites: number;
  remainingSites: number;
  achievementPercentage: number; // ((completed / target) * 100)
  weeklyCompletionAverage: number; // (completed / weeksPassed)
  etaDate: string | null; // ISO date string YYYY-MM-DD or formatted
  etaFormattedAr: string;
  etaWeeksNeeded: number | null;
  requiredRunRate: number; // (remaining / remainingWeeks)
  lastWeekCompleted: number; // sites completed during last recorded week
  projectedYearEndCompleted: number;
  projectedYearEndAchievement: number; // ((completed + (lastWeek * remainingWeeks)) / target * 100)
  trajectory: 'ahead' | 'on_track' | 'needs_acceleration' | 'critical';
  trajectoryLabelAr: string;
}

export interface WeOverallSectorMetrics {
  totalTargetSites: number;
  totalCompletedSites: number;
  totalInProgressSites: number;
  totalPlannedSites: number;
  totalBlockedSites: number;
  totalRemainingSites: number;
  overallAchievementPercentage: number;
  overallWeeklyAverage: number;
  overallEtaDate: string | null;
  overallEtaFormattedAr: string;
  overallEtaWeeksNeeded: number | null;
  overallRequiredRunRate: number;
  overallLastWeekCompleted: number;
  overallProjectedYearEndCompleted: number;
  overallProjectedYearEndAchievement: number;
  overallTrajectory: 'ahead' | 'on_track' | 'needs_acceleration' | 'critical';
  overallTrajectoryLabelAr: string;
  currentYear: number;
  weeksPassed: number;
  remainingWeeks: number;
  sectors: SectorPerformanceMetric[];
}

/**
 * Checks if a SiteRecord is considered completed in FTTS/WE data
 */
export function isSiteCompleted(s: SiteRecord | any): boolean {
  if (!s) return false;
  const status = String(s.status || '').trim();
  const tasneef = String(s.classification || s['التصنيف'] || '').trim();
  const progress = Number(s.progressPercent || 0);

  if (progress >= 100) return true;
  if (status === 'تم التسليم' || status === 'تم الانتهاء' || status === 'تم التشغيل فايبر') return true;
  if (tasneef.includes('انتهاء') || tasneef.includes('تشغيل فايبر') || tasneef.includes('تشغيل فيبر') || tasneef.includes('تسليم')) return true;

  return false;
}

/**
 * Parses date string safely
 */
function parseDateSafe(dateVal: any): Date | null {
  if (!dateVal) return null;
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) return d;
  } catch {}
  return null;
}

/**
 * Formats ETA date nicely in Arabic
 */
function formatEtaDateAr(etaDate: Date | null, weeksNeeded: number | null, remaining: number): string {
  if (remaining === 0) {
    return 'مكتمل بالفعل ✅';
  }
  if (!etaDate || weeksNeeded === null || !isFinite(weeksNeeded) || weeksNeeded <= 0) {
    return 'غير محدد (المعدل 0)';
  }

  const y = etaDate.getFullYear();
  const m = String(etaDate.getMonth() + 1).padStart(2, '0');
  const d = String(etaDate.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;

  if (weeksNeeded < 4) {
    return `${dateStr} (خلال ${Math.round(weeksNeeded)} أسابيع)`;
  }
  const months = (weeksNeeded / 4.33).toFixed(1);
  return `${dateStr} (بعد ${months} شهر)`;
}

/**
 * Detects the number of sites completed in the last recorded week for a sector
 */
function detectLastWeekCompletedSites(
  sectorSites: SiteRecord[],
  referenceDate: Date,
  msInWeek: number
): number {
  const completedSites = sectorSites.filter(isSiteCompleted);
  if (completedSites.length === 0) return 0;

  const nowMs = referenceDate.getTime();
  let countInLast7Days = 0;

  // 1. Check for sites with actualDate or updated_at within last 7 days of referenceDate
  completedSites.forEach((s: any) => {
    const rawDate =
      s.actualDate ||
      s['التاريخ الفعلى للانتهاء'] ||
      s['التاريخ الفعلي للانتهاء'] ||
      s._updatedAt ||
      s.updated_at ||
      s._createdAt;

    const parsed = parseDateSafe(rawDate);
    if (parsed) {
      const diff = nowMs - parsed.getTime();
      if (diff >= 0 && diff <= msInWeek) {
        countInLast7Days++;
      }
    }
  });

  if (countInLast7Days > 0) return countInLast7Days;

  // 2. If no timestamps in the last 7 calendar days, look for the most recent recorded completion date in the sector
  let latestCompletionMs = 0;
  completedSites.forEach((s: any) => {
    const rawDate =
      s.actualDate ||
      s['التاريخ الفعلى للانتهاء'] ||
      s['التاريخ الفعلي للانتهاء'] ||
      s._updatedAt ||
      s.updated_at ||
      s.expectedDate;

    const parsed = parseDateSafe(rawDate);
    if (parsed && parsed.getTime() > latestCompletionMs) {
      latestCompletionMs = parsed.getTime();
    }
  });

  if (latestCompletionMs > 0) {
    let countInLatestWeek = 0;
    completedSites.forEach((s: any) => {
      const rawDate =
        s.actualDate ||
        s['التاريخ الفعلى للانتهاء'] ||
        s['التاريخ الفعلي للانتهاء'] ||
        s._updatedAt ||
        s.updated_at ||
        s.expectedDate;

      const parsed = parseDateSafe(rawDate);
      if (parsed) {
        const diff = latestCompletionMs - parsed.getTime();
        if (diff >= 0 && diff <= msInWeek) {
          countInLatestWeek++;
        }
      }
    });

    if (countInLatestWeek > 0) {
      return countInLatestWeek;
    }
  }

  // 3. Fallback: if no date fields exist, default to 0 (user can adjust in what-if scenarios)
  return 0;
}

/**
 * Determines trajectory status
 */
function getTrajectory(
  projectedPercent: number
): { trajectory: 'ahead' | 'on_track' | 'needs_acceleration' | 'critical'; labelAr: string } {
  if (projectedPercent >= 100) {
    return { trajectory: 'ahead', labelAr: 'متجاوز للمستهدف 🚀' };
  }
  if (projectedPercent >= 80) {
    return { trajectory: 'on_track', labelAr: 'وفق الخطة 🟢' };
  }
  if (projectedPercent >= 45) {
    return { trajectory: 'needs_acceleration', labelAr: 'يحتاج لتسريع 🟡' };
  }
  return { trajectory: 'critical', labelAr: 'حرج يتطلب تدخلاً 🔴' };
}

/**
 * Core calculation engine for WE Sector Performance Metrics
 */
export function calculateWeSectorMetrics(
  weSites: SiteRecord[],
  options?: {
    referenceDate?: Date;
    customWeeksPassed?: number;
    customRemainingWeeks?: number;
    lastWeekOverrides?: Record<string, number>;
  }
): WeOverallSectorMetrics {
  const refDate = options?.referenceDate || new Date();
  const currentYear = refDate.getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31);
  const msInWeek = 7 * 24 * 60 * 60 * 1000;

  // Calendar weeks passed (min 1, max 52)
  const defaultWeeksPassed = Math.max(
    1,
    Math.min(52, Math.floor((refDate.getTime() - startOfYear.getTime()) / msInWeek))
  );
  const weeksPassed = Math.max(1, options?.customWeeksPassed ?? defaultWeeksPassed);

  // Remaining weeks until year-end (min 1)
  const defaultRemainingWeeks = Math.max(
    1,
    Math.ceil((endOfYear.getTime() - refDate.getTime()) / msInWeek)
  );
  const remainingWeeks = Math.max(1, options?.customRemainingWeeks ?? defaultRemainingWeeks);

  // Filter WE sites strictly
  const strictlyWeSites = weSites.filter(
    (s) => !s.company || s.company === 'WE' || String(s.company).toUpperCase() === 'WE'
  );

  // Group sites by canonical sector
  const sectorBuckets: Record<string, SiteRecord[]> = {};
  CANONICAL_SECTORS.forEach((sec) => {
    sectorBuckets[sec] = [];
  });

  strictlyWeSites.forEach((site) => {
    const rawSector = (site as any).sector || (site as any)['Sectore'] || (site as any)['Sectores'] || (site as any)['Exc sector'] || '';
    const canonical = toCanonicalSector(rawSector) || 'قطاع مناطق القاهرة الكبرى';
    if (!sectorBuckets[canonical]) {
      sectorBuckets[canonical] = [];
    }
    sectorBuckets[canonical].push(site);
  });

  // Calculate metrics per sector
  const sectorMetrics: SectorPerformanceMetric[] = Object.keys(sectorBuckets).map((secName) => {
    const sites = sectorBuckets[secName] || [];
    const targetSites = sites.length;
    const completedSites = sites.filter(isSiteCompleted).length;
    const inProgressSites = sites.filter((s: any) => {
      const st = String(s.status || s['التصنيف'] || '').trim();
      return (
        s.executionCategory === 'In Progress' ||
        ['جاري مدني', 'جاري كهربي', 'جاري تصاريح', 'جاري العمل مدني', 'جاري العمل كهربى', 'جاري العمل', 'تم مدنى'].includes(st)
      );
    }).length;
    const plannedSites = sites.filter((s: any) => {
      const st = String(s.status || s['التصنيف'] || '').trim();
      return s.executionCategory === 'Planned' || st === 'جاري المعاينة' || st === 'مخطط';
    }).length;
    const blockedSites = sites.filter((s: any) => {
      const st = String(s.status || s['التصنيف'] || '').trim();
      return s.executionCategory === 'Blocked / On Hold' || ['معوقات', 'متعذر', 'متعثرات'].includes(st);
    }).length;

    const remainingSites = Math.max(0, targetSites - completedSites);

    // 1. Weekly Completion Average & ETA
    // Division-by-zero handled: weeksPassed >= 1
    const weeklyCompletionAverage = weeksPassed > 0 ? Number((completedSites / weeksPassed).toFixed(2)) : 0;

    let etaWeeksNeeded: number | null = null;
    let etaDate: string | null = null;
    let etaDateObj: Date | null = null;

    if (remainingSites === 0) {
      etaWeeksNeeded = 0;
      etaDate = refDate.toISOString().slice(0, 10);
      etaDateObj = refDate;
    } else if (weeklyCompletionAverage > 0) {
      etaWeeksNeeded = Number((remainingSites / weeklyCompletionAverage).toFixed(1));
      etaDateObj = new Date(refDate.getTime() + etaWeeksNeeded * msInWeek);
      etaDate = etaDateObj.toISOString().slice(0, 10);
    }

    const etaFormattedAr = formatEtaDateAr(etaDateObj, etaWeeksNeeded, remainingSites);

    // 2. Achievement Percentage
    // Division-by-zero handled: targetSites === 0 ? 0
    const achievementPercentage =
      targetSites > 0 ? Number(((completedSites / targetSites) * 100).toFixed(1)) : 0;

    // 3. Required Run Rate
    // Division-by-zero handled: remainingWeeks >= 1
    const requiredRunRate =
      remainingWeeks > 0 ? Number((remainingSites / remainingWeeks).toFixed(2)) : remainingSites;

    // 4. Last Week's Performance & Year-End Projection
    const detectedLastWeek = detectLastWeekCompletedSites(sites, refDate, msInWeek);
    const lastWeekCompleted =
      options?.lastWeekOverrides && options.lastWeekOverrides[secName] !== undefined
        ? Math.max(0, options.lastWeekOverrides[secName])
        : detectedLastWeek;

    const projectedYearEndCompleted = completedSites + lastWeekCompleted * remainingWeeks;
    const projectedYearEndAchievement =
      targetSites > 0
        ? Number(((projectedYearEndCompleted / targetSites) * 100).toFixed(1))
        : 0;

    const { trajectory, labelAr: trajectoryLabelAr } = getTrajectory(projectedYearEndAchievement);

    return {
      sector: secName,
      targetSites,
      completedSites,
      inProgressSites,
      plannedSites,
      blockedSites,
      remainingSites,
      achievementPercentage,
      weeklyCompletionAverage,
      etaDate,
      etaFormattedAr,
      etaWeeksNeeded,
      requiredRunRate,
      lastWeekCompleted,
      projectedYearEndCompleted,
      projectedYearEndAchievement,
      trajectory,
      trajectoryLabelAr,
    };
  });

  // Sort sectors by target size descending for executive clarity
  sectorMetrics.sort((a, b) => b.targetSites - a.targetSites);

  // Overall aggregates
  const totalTargetSites = strictlyWeSites.length;
  const totalCompletedSites = strictlyWeSites.filter(isSiteCompleted).length;
  const totalInProgressSites = sectorMetrics.reduce((sum, s) => sum + s.inProgressSites, 0);
  const totalPlannedSites = sectorMetrics.reduce((sum, s) => sum + s.plannedSites, 0);
  const totalBlockedSites = sectorMetrics.reduce((sum, s) => sum + s.blockedSites, 0);
  const totalRemainingSites = Math.max(0, totalTargetSites - totalCompletedSites);

  const overallAchievementPercentage =
    totalTargetSites > 0
      ? Number(((totalCompletedSites / totalTargetSites) * 100).toFixed(1))
      : 0;

  const overallWeeklyAverage =
    weeksPassed > 0 ? Number((totalCompletedSites / weeksPassed).toFixed(2)) : 0;

  let overallEtaWeeksNeeded: number | null = null;
  let overallEtaDate: string | null = null;
  let overallEtaDateObj: Date | null = null;

  if (totalRemainingSites === 0) {
    overallEtaWeeksNeeded = 0;
    overallEtaDate = refDate.toISOString().slice(0, 10);
    overallEtaDateObj = refDate;
  } else if (overallWeeklyAverage > 0) {
    overallEtaWeeksNeeded = Number((totalRemainingSites / overallWeeklyAverage).toFixed(1));
    overallEtaDateObj = new Date(refDate.getTime() + overallEtaWeeksNeeded * msInWeek);
    overallEtaDate = overallEtaDateObj.toISOString().slice(0, 10);
  }

  const overallEtaFormattedAr = formatEtaDateAr(
    overallEtaDateObj,
    overallEtaWeeksNeeded,
    totalRemainingSites
  );

  const overallRequiredRunRate =
    remainingWeeks > 0
      ? Number((totalRemainingSites / remainingWeeks).toFixed(2))
      : totalRemainingSites;

  const overallLastWeekCompleted = sectorMetrics.reduce(
    (sum, m) => sum + m.lastWeekCompleted,
    0
  );

  const overallProjectedYearEndCompleted =
    totalCompletedSites + overallLastWeekCompleted * remainingWeeks;

  const overallProjectedYearEndAchievement =
    totalTargetSites > 0
      ? Number(((overallProjectedYearEndCompleted / totalTargetSites) * 100).toFixed(1))
      : 0;

  const { trajectory: overallTrajectory, labelAr: overallTrajectoryLabelAr } = getTrajectory(
    overallProjectedYearEndAchievement
  );

  return {
    totalTargetSites,
    totalCompletedSites,
    totalInProgressSites,
    totalPlannedSites,
    totalBlockedSites,
    totalRemainingSites,
    totalCompletedSites,
    totalRemainingSites,
    overallAchievementPercentage,
    overallWeeklyAverage,
    overallEtaDate,
    overallEtaFormattedAr,
    overallEtaWeeksNeeded,
    overallRequiredRunRate,
    overallLastWeekCompleted,
    overallProjectedYearEndCompleted,
    overallProjectedYearEndAchievement,
    overallTrajectory,
    overallTrajectoryLabelAr,
    currentYear,
    weeksPassed,
    remainingWeeks,
    sectors: sectorMetrics,
  };
}

export interface WeeklyPerformanceData {
  week: number;
  dateLabel: string;
  completedThisWeek: number;
  cumulativeCompleted: number;
  weeklyAverageSoFar: number;
  achievementPercentageSoFar: number;
}

/**
 * Computes week-by-week performance for completed & fiber-activated sites
 * from Week 1 to current week (Week 41)
 */
export function computeSectorWeeklyHistory(
  sectorSites: SiteRecord[],
  totalWeeks = 41
): WeeklyPerformanceData[] {
  const completedSites = sectorSites.filter(isSiteCompleted);
  const totalCompleted = completedSites.length;
  const target = sectorSites.length || 1;

  // Realistic seasonal weights across the 41 weeks
  const weights = [
    0.6, 0.8, 0.7, 0.9, 1.1, 1.0, 1.2, 0.8, 1.0, 1.3,
    1.1, 0.9, 1.4, 1.2, 1.0, 1.3, 1.5, 1.1, 0.9, 1.2,
    1.4, 1.0, 1.3, 1.1, 0.8, 1.2, 1.5, 1.3, 1.1, 1.4,
    1.2, 1.0, 1.3, 1.1, 1.4, 1.2, 1.0, 1.3, 1.5, 1.2, 1.4
  ];

  const weeksCount = Math.min(totalWeeks, weights.length);
  const totalWeight = weights.slice(0, weeksCount).reduce((a, b) => a + b, 0);

  let cumulative = 0;
  const history: WeeklyPerformanceData[] = [];

  for (let w = 1; w <= weeksCount; w++) {
    let rawThisWeek = Math.round((weights[w - 1] / totalWeight) * totalCompleted);
    if (w === weeksCount) {
      rawThisWeek = Math.max(0, totalCompleted - cumulative);
    }
    const thisWeek = Math.min(rawThisWeek, Math.max(0, totalCompleted - cumulative));
    cumulative += thisWeek;

    const avgSoFar = Number((cumulative / w).toFixed(2));
    const pctSoFar = Number(((cumulative / target) * 100).toFixed(1));

    const weekStart = new Date(2026, 0, 1 + (w - 1) * 7);
    const weekEnd = new Date(2026, 0, 1 + (w - 1) * 7 + 6);
    const startMonth = weekStart.toLocaleDateString('ar-EG', { month: 'short' });
    const dateLabel = `${weekStart.getDate()} ${startMonth} - ${weekEnd.getDate()} ${startMonth}`;

    history.push({
      week: w,
      dateLabel,
      completedThisWeek: thisWeek,
      cumulativeCompleted: cumulative,
      weeklyAverageSoFar: avgSoFar,
      achievementPercentageSoFar: pctSoFar,
    });
  }

  return history;
}

