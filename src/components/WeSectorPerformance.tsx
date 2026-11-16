// src/components/WeSectorPerformance.tsx
// Executive Dashboard Component strictly for operator "WE"
// Grouping and displaying data per sector with the required metrics:
// 1. Unified Hero Card: Weekly Completion Average & Field Achievement % + Last 5 Weeks Performance
// 2. Required Run Rate Card
// 3. Year-End Projection & Trajectory Card
// 4. Interactive Weekly Completion & Fiber Activation Chart per Sector (Week 1 to Current Week)

import React, { useState, useMemo, useEffect } from 'react';
import type { SiteRecord } from '../types/dashboard';
import {
  calculateWeSectorMetrics,
  computeSectorWeeklyHistory,
  isSiteCompleted,
} from '../utils/weSectorMetrics';
import type {
  SectorPerformanceMetric,
  WeeklyPerformanceData,
} from '../utils/weSectorMetrics';
import { useAuth } from '../context/AuthContext';
import { isRecordInSector, toCanonicalSector } from '../utils/sectorPermissions';
import {
  TrendingUp,
  Target,
  Award,
  Zap,
  Activity,
  Calendar,
  Building2,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  Download,
  Filter,
  BarChart3,
  Sparkles,
  Info
} from 'lucide-react';

interface WeSectorPerformanceProps {
  weSites: SiteRecord[];
  onSelectSectorFilter?: (sector: string) => void;
  selectedSectorFilter?: string;
  onOpenDetailsModal?: (sectorName?: string) => void;
}

export const WeSectorPerformance: React.FC<WeSectorPerformanceProps> = ({
  weSites,
  onSelectSectorFilter,
  selectedSectorFilter,
  onOpenDetailsModal,
}) => {
  const { user } = useAuth();
  const isSectorLocked = Boolean(
    user && user.role !== 'admin' && user.sector && user.sector !== 'ALL'
  );

  // Active sector state (bi-directional sync with global filter)
  const [activeSector, setActiveSector] = useState<string>(
    isSectorLocked && user?.sector ? user.sector : selectedSectorFilter || 'ALL'
  );

  // Hovered week state for interactive chart tooltip
  const [hoveredWeek, setHoveredWeek] = useState<WeeklyPerformanceData | null>(null);

  // Synchronize activeSector with interactive filter prop
  useEffect(() => {
    if (isSectorLocked && user?.sector) {
      setActiveSector(user.sector);
      return;
    }
    if (
      selectedSectorFilter &&
      selectedSectorFilter !== 'All' &&
      selectedSectorFilter !== 'ALL' &&
      selectedSectorFilter.trim() !== ''
    ) {
      const canonical = toCanonicalSector(selectedSectorFilter);
      setActiveSector(canonical || selectedSectorFilter);
    } else {
      setActiveSector('ALL');
    }
  }, [selectedSectorFilter, isSectorLocked, user?.sector]);

  // Handler for sector selection
  const handleSelectSector = (sec: string) => {
    const nextSector = activeSector === sec ? 'ALL' : sec;
    setActiveSector(nextSector);
    if (onSelectSectorFilter) {
      onSelectSectorFilter(nextSector === 'ALL' ? '' : nextSector);
    }
    setHoveredWeek(null);
  };

  // Calculate metrics using pure calculation engine
  const metrics = useMemo(() => {
    return calculateWeSectorMetrics(weSites);
  }, [weSites]);

  // Selected Sector Metric (or Overall if 'ALL')
  const activeMetric: SectorPerformanceMetric | null = useMemo(() => {
    if (activeSector === 'ALL') return null;
    return metrics.sectors.find((s) => s.sector === activeSector) || null;
  }, [activeSector, metrics]);

  // Current scope values for Hero Cards
  const displayTarget = activeMetric ? activeMetric.targetSites : metrics.totalTargetSites;
  const displayCompleted = activeMetric ? activeMetric.completedSites : metrics.totalCompletedSites;
  const displayRemaining = activeMetric ? activeMetric.remainingSites : metrics.totalRemainingSites;
  const displayAchievement = activeMetric
    ? activeMetric.achievementPercentage
    : metrics.overallAchievementPercentage;
  const displayWeeklyAvg = activeMetric
    ? activeMetric.weeklyCompletionAverage
    : metrics.overallWeeklyAverage;
  const displayEta = activeMetric ? activeMetric.etaFormattedAr : metrics.overallEtaFormattedAr;
  const displayReqRunRate = activeMetric
    ? activeMetric.requiredRunRate
    : metrics.overallRequiredRunRate;
  const displayProjected = activeMetric
    ? activeMetric.projectedYearEndAchievement
    : metrics.overallProjectedYearEndAchievement;
  const displayTrajectoryLabel = activeMetric
    ? activeMetric.trajectoryLabelAr
    : metrics.overallTrajectoryLabelAr;

  // Active sites matching current sector scope
  const currentSectorSites = useMemo(() => {
    if (activeSector === 'ALL') return weSites;
    return weSites.filter((s) => isRecordInSector(activeSector, s));
  }, [weSites, activeSector]);

  // Week-by-week performance history (Week 1 to current week ~41)
  const weeklyHistory = useMemo(() => {
    return computeSectorWeeklyHistory(currentSectorSites, metrics.weeksPassed);
  }, [currentSectorSites, metrics.weeksPassed]);

  // Last 5 weeks data for Requirement 9
  const last5Weeks = useMemo(() => {
    return weeklyHistory.slice(-5);
  }, [weeklyHistory]);

  const last5WeeksAvg = useMemo(() => {
    if (last5Weeks.length === 0) return 0;
    const sum = last5Weeks.reduce((acc, it) => acc + it.completedThisWeek, 0);
    return Number((sum / last5Weeks.length).toFixed(2));
  }, [last5Weeks]);

  // Max weekly completion for SVG scaling
  const maxWeeklyCount = useMemo(() => {
    const max = Math.max(...weeklyHistory.map((w) => w.completedThisWeek), 1);
    return Math.ceil(max * 1.25);
  }, [weeklyHistory]);

  // Export Sector Performance to CSV
  const handleExportSectorCsv = () => {
    const headers = [
      'Sector',
      'Target Sites',
      'Completed Sites',
      'Remaining Sites',
      'Achievement Rate (%)',
      'Weekly Avg Rate',
      'ETA',
      'Required Run Rate',
      'Projected Year-End (%)',
      'Trajectory',
    ];

    const rows = metrics.sectors.map((s) => [
      `"${s.sector}"`,
      s.targetSites,
      s.completedSites,
      s.remainingSites,
      `${s.achievementPercentage}%`,
      s.weeklyCompletionAverage,
      `"${s.etaFormattedAr}"`,
      s.requiredRunRate,
      `${s.projectedYearEndAchievement}%`,
      `"${s.trajectoryLabelAr}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `WE_Sector_Weekly_Performance_${metrics.currentYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-indigo-500/30 my-6 transition-all duration-300">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 mb-6 border-b border-indigo-800/50 gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-2.5 bg-purple-600/30 border border-purple-400/40 rounded-2xl text-purple-300 shadow-inner flex items-center justify-center">
              <Building2 className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2 flex-wrap">
                  {activeSector !== 'ALL' ? (
                    <>
                      <span>لوحة متابعة ومعدلات أداء</span>
                      <span className="bg-purple-600/40 border border-purple-400/60 text-purple-200 px-3 py-0.5 rounded-xl text-lg sm:text-xl font-black shadow-inner">
                        {activeSector}
                      </span>
                      <span className="text-purple-300 text-base font-semibold">- شبكة "WE"</span>
                    </>
                  ) : (
                    <>
                      <span>لوحة متابعة ومعدلات أداء قطاعات شبكة "WE"</span>
                      <span className="text-xs bg-purple-500/20 text-purple-200 border border-purple-400/40 px-2.5 py-0.5 rounded-full font-mono font-bold">
                        WE Operator FTTS (إجمالي المشغل)
                      </span>
                    </>
                  )}
                </h2>
                {activeSector !== 'ALL' && (
                  <button
                    onClick={() => handleSelectSector('ALL')}
                    className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 px-3 py-1 rounded-full font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                    title="الرجوع لعرض إجمالي كافة قطاعات WE"
                  >
                    <span>📍 تصفية نشطة: <strong>{activeSector}</strong></span>
                    <span className="bg-emerald-800/80 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-black mr-1">✕</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-indigo-200/80 mt-1.5 flex items-center gap-2 flex-wrap">
                <span>
                  معدل الإنجاز الأسبوعي • نسبة الإنجاز الميداني • وتيرة آخر 5 أسابيع • الرسم البياني الأسبوعي للأعمال المنتهية والمشغلة
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Calendar Info & Export Action */}
        <div className="flex items-center gap-2.5 flex-wrap self-stretch lg:self-auto justify-end">
          <div className="bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 text-indigo-200 font-medium">
            <Calendar className="w-3.5 h-3.5 text-purple-300" />
            <span>خطة عام <strong className="text-white font-mono">{metrics.currentYear}</strong></span>
            <span className="text-white/30">•</span>
            <span>المنقضي: <strong className="text-emerald-300 font-mono">{metrics.weeksPassed}</strong> أسبوع</span>
            <span className="text-white/30">•</span>
            <span>المتبقي: <strong className="text-amber-300 font-mono">{metrics.remainingWeeks}</strong> أسبوع</span>
          </div>

          <button
            onClick={handleExportSectorCsv}
            className="px-3.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 hover:text-white border border-indigo-400/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="تصدير تقرير المؤشرات الأسبوعية للقطاعات بصيغة CSV"
          >
            <Download className="w-3.5 h-3.5 text-indigo-300" />
            <span>تصدير CSV</span>
          </button>
        </div>
      </div>

      {/* ── Requirement 9: Unified Hero KPI Cards Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-7">

        {/* ── 1. Unified Card: Merged Weekly Average + Field Achievement % + Last 5 Weeks Data ── */}
        <div className="lg:col-span-6 bg-gradient-to-br from-indigo-900/70 via-slate-800/90 to-purple-950/80 border border-indigo-400/40 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Unified Card Header */}
          <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-indigo-700/40">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-400/30">
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-xs font-black text-white">
                معدل الإنجاز الأسبوعي ونسبة الإنجاز الميداني (مؤشر موحد)
              </span>
            </div>
            <span className="text-[10px] bg-purple-500/20 text-purple-200 border border-purple-400/40 px-2.5 py-0.5 rounded-full font-mono font-bold">
              {displayCompleted} من {displayTarget} موقع
            </span>
          </div>

          {/* Top Row: Dual Big Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            {/* Metric A: Field Achievement */}
            <div className="bg-slate-900/60 p-3 rounded-xl border border-emerald-500/20">
              <span className="text-[11px] text-emerald-300 font-semibold block mb-0.5">
                نسبة الإنجاز الميداني:
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono text-emerald-300">
                  {displayAchievement}%
                </span>
                <span className="text-[10px] text-slate-300">من إجمالي الخطة</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-700/60 h-2 rounded-full overflow-hidden mt-2 border border-emerald-500/30">
                <div
                  className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, displayAchievement)}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-300 mt-1 font-mono">
                <span>المكتمل: {displayCompleted}</span>
                <span>المتبقي: {displayRemaining}</span>
              </div>
            </div>

            {/* Metric B: Weekly Run Rate & ETA */}
            <div className="bg-slate-900/60 p-3 rounded-xl border border-blue-500/20">
              <span className="text-[11px] text-blue-300 font-semibold block mb-0.5">
                معدل الإنجاز الأسبوعي:
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono text-white">
                  {displayWeeklyAvg}
                </span>
                <span className="text-xs text-blue-300 font-bold">موقع / أسبوع</span>
              </div>
              <div className="mt-2 pt-1 border-t border-blue-500/20 flex items-center justify-between text-[11px]">
                <span className="text-slate-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-400" />
                  <span>تاريخ الانتهاء (ETA):</span>
                </span>
                <span className="font-bold text-sky-300 font-mono text-xs">
                  {displayEta}
                </span>
              </div>
              <span className="text-[9px] text-slate-400 block mt-0.5">
                حساب: {displayCompleted} موقع ÷ {metrics.weeksPassed} أسبوع منقضي
              </span>
            </div>
          </div>

          {/* Sub-section: Last 5 Weeks Breakdown (Requirement 9) */}
          <div className="bg-slate-950/70 border border-purple-500/30 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                <span>معدل الإنجاز لآخر خمسة أسابيع:</span>
              </span>
              <span className="text-[10px] font-mono text-purple-300 bg-purple-900/50 px-2 py-0.5 rounded border border-purple-400/30 font-bold">
                متوسط آخر 5 أسابيع: {last5WeeksAvg} موقع/أسبوع
              </span>
            </div>

            {/* 5-Week Pills Grid */}
            <div className="grid grid-cols-5 gap-1.5 text-center">
              {last5Weeks.map((wItem, idx) => {
                const isLatest = idx === last5Weeks.length - 1;
                return (
                  <div
                    key={wItem.week}
                    className={`p-2 rounded-lg border transition ${
                      isLatest
                        ? 'bg-purple-900/60 border-purple-400 text-white font-bold ring-1 ring-purple-400/50 shadow-sm'
                        : 'bg-slate-900/80 border-slate-700/60 text-slate-300'
                    }`}
                  >
                    <span className="text-[10px] font-mono block text-purple-300">
                      أسبوع {wItem.week}
                    </span>
                    <span className="text-base font-black font-mono block text-white my-0.5">
                      {wItem.completedThisWeek}
                    </span>
                    <span className="text-[9px] text-slate-400 block truncate">
                      موقع منجز
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 2. Card 2: Required Run Rate Until Year-End ── */}
        <div className="lg:col-span-3 bg-gradient-to-br from-amber-900/60 via-slate-800/80 to-amber-950/70 border border-amber-400/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl"></div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>المعدل المطلوب لنهاية العام</span>
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-200 border border-amber-400/30 px-2 py-0.5 rounded-full font-mono font-bold">
                {metrics.remainingWeeks} أسبوع متبقٍ
              </span>
            </div>

            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono tracking-tight text-amber-300">
                  {displayReqRunRate}
                </span>
                <span className="text-xs text-amber-200 font-semibold">موقع / أسبوع</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                السرعة المطلوبة لإنجاز <strong className="text-amber-300 font-mono">{displayRemaining}</strong> موقع قبل 31 ديسمبر {metrics.currentYear}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-500/20">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">الفارق عن وتيرة اليوم:</span>
              {displayReqRunRate > displayWeeklyAvg ? (
                <span className="text-rose-300 font-bold font-mono text-[11px] flex items-center gap-0.5 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/30">
                  <ArrowUpRight className="w-3 h-3 text-rose-400" />
                  <span>+{(displayReqRunRate - displayWeeklyAvg).toFixed(2)} تسريع</span>
                </span>
              ) : (
                <span className="text-emerald-300 font-bold font-mono text-[11px] flex items-center gap-0.5 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>معدل كافٍ ✅</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── 3. Card 3: Year-End Projection & Trajectory ── */}
        <div className="lg:col-span-3 bg-gradient-to-br from-purple-900/60 via-slate-800/80 to-purple-950/70 border border-purple-400/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-purple-400" />
                <span>التوقع السنوي ومسار الأداء</span>
              </span>
              <span className="text-[10px] bg-purple-500/20 text-purple-200 border border-purple-400/30 px-2 py-0.5 rounded-full font-mono font-bold">
                {displayTrajectoryLabel}
              </span>
            </div>

            <div className="mt-2">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black font-mono tracking-tight text-purple-300">
                    {displayProjected}%
                  </span>
                  <span className="text-[11px] text-slate-300 block">الإنجاز المتوقع لنهاية العام</span>
                </div>
                <div className="text-left bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/10 text-right">
                  <span className="text-[10px] text-purple-200 block">آخر أسبوع مسجل</span>
                  <span className="text-lg font-black font-mono text-white block">
                    {last5Weeks.length > 0 ? last5Weeks[last5Weeks.length - 1].completedThisWeek : 0} <span className="text-xs font-normal text-purple-300">موقع</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-purple-500/20 flex items-center justify-between text-xs text-indigo-200">
            <span>وتيرة التنفيذ الحالية:</span>
            <span className="font-bold text-white font-mono">{displayWeeklyAvg} موقع/أسبوع</span>
          </div>
        </div>

      </div>

      {/* ── Requirement 10: Interactive Weekly Performance Chart for Completed & Activated Sites ── */}
      <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-5 shadow-2xl">
        {/* Chart Header with Sector Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-4 border-b border-indigo-800/40 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2 flex-wrap">
                  <span>الرسم البياني الأسبوعي للأعمال المنتهية والمشغلة</span>
                  <span className="text-xs text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                    {activeSector === 'ALL' ? 'إجمالي شبكة WE' : activeSector}
                  </span>
                </h3>
                <p className="text-xs text-indigo-300/80 mt-0.5">
                  عرض وتيرة الإنجاز الأسبوعية للمواقع المكتملة والمشغلة فايبر من أول العام (الأسبوع 1) حتى اليوم (الأسبوع {metrics.weeksPassed})
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Indicator */}
          <div className="flex items-center gap-3 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
            <span className="text-slate-300">
              إجمالي المنتهي والمشغل: <strong className="text-emerald-300 font-mono">{displayCompleted}</strong> موقع
            </span>
            <span className="text-white/20">|</span>
            <span className="text-slate-300">
              المعدل الأسبوعي: <strong className="text-sky-300 font-mono">{displayWeeklyAvg}</strong> موقع/أسبوع
            </span>
          </div>
        </div>

        {/* Sector Selection Pills Bar */}
        <div className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => handleSelectSector('ALL')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              activeSector === 'ALL'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white ring-1 ring-purple-400 shadow-md'
                : 'bg-white/5 text-indigo-200 hover:bg-white/10'
            }`}
          >
            🏢 كل قطاعات WE ({metrics.totalCompletedSites})
          </button>

          {metrics.sectors.map((sec) => (
            <button
              key={sec.sector}
              onClick={() => handleSelectSector(sec.sector)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer flex items-center gap-1 ${
                activeSector === sec.sector
                  ? 'bg-purple-600 text-white font-bold ring-1 ring-purple-400 shadow-sm'
                  : 'bg-white/5 text-indigo-200 hover:bg-white/10'
              }`}
            >
              <span>{sec.sector.replace('قطاع مناطق ', '').replace('قطاع ', '')}</span>
              <span className="text-[10px] font-mono opacity-80 font-bold">
                ({sec.completedSites})
              </span>
            </button>
          ))}
        </div>

        {/* Interactive SVG Bar & Trend Chart */}
        <div className="relative pt-2 pb-6 px-2">
          {/* Chart Canvas */}
          <div className="h-64 sm:h-72 w-full flex items-end gap-1 sm:gap-1.5 relative border-b border-indigo-700/40 pb-2">
            {weeklyHistory.map((item) => {
              const heightPct = Math.max(6, (item.completedThisWeek / maxWeeklyCount) * 100);
              const isHovered = hoveredWeek?.week === item.week;

              return (
                <div
                  key={item.week}
                  className="flex-1 h-full flex flex-col justify-end items-center relative group cursor-pointer"
                  onMouseEnter={() => setHoveredWeek(item)}
                  onMouseLeave={() => setHoveredWeek(null)}
                >
                  {/* Bar Value on top for hovered or prominent weeks */}
                  {isHovered && (
                    <div className="absolute -top-7 z-20 bg-emerald-500 text-slate-950 font-black text-[11px] px-1.5 py-0.5 rounded shadow-lg animate-in fade-in zoom-in-90 font-mono">
                      {item.completedThisWeek}
                    </div>
                  )}

                  {/* The Interactive Bar */}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-md transition-all duration-200 ${
                      isHovered
                        ? 'bg-gradient-to-t from-emerald-400 to-cyan-300 ring-2 ring-emerald-300 shadow-lg shadow-emerald-500/50 scale-105'
                        : 'bg-gradient-to-t from-emerald-600/80 via-teal-500/80 to-emerald-400/90 hover:from-emerald-500 hover:to-teal-300'
                    }`}
                  ></div>

                  {/* Week label bottom */}
                  <span className="text-[9px] font-mono text-slate-400 mt-1 select-none hidden sm:block">
                    {item.week % 5 === 0 || item.week === 1 || item.week === weeklyHistory.length
                      ? `W${item.week}`
                      : ''}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Interactive Floating Hover Tooltip (Requirement 10) */}
          {hoveredWeek && (
            <div className="mt-3 p-3 bg-slate-950/95 border border-emerald-400/50 rounded-xl shadow-2xl flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-top-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-mono font-black border border-emerald-400/40">
                  {hoveredWeek.week}
                </div>
                <div>
                  <span className="font-bold text-white block">
                    الأسبوع {hoveredWeek.week} ({hoveredWeek.dateLabel})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    قطاع: {activeSector === 'ALL' ? 'كافة قطاعات WE' : activeSector}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 font-mono">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">إنجاز الأسبوع المحدد</span>
                  <span className="text-emerald-400 font-black text-sm">
                    {hoveredWeek.completedThisWeek} موقع مكتمل
                  </span>
                </div>

                <div className="text-right border-r border-white/10 pr-4">
                  <span className="text-[10px] text-slate-400 block">المعدل الأسبوعي التراكمي</span>
                  <span className="text-sky-300 font-black text-sm">
                    {hoveredWeek.weeklyAverageSoFar} موقع/أسبوع
                  </span>
                </div>

                <div className="text-right border-r border-white/10 pr-4">
                  <span className="text-[10px] text-slate-400 block">نسبة الإنجاز التراكمية</span>
                  <span className="text-purple-300 font-black text-sm">
                    {hoveredWeek.achievementPercentageSoFar}% ({hoveredWeek.cumulativeCompleted} موقع)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Helper note */}
          {!hoveredWeek && (
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-purple-400" />
                <span>حرك مؤشر الماوس (Hover) فوق أي أسبوع لعرض تفاصيل الإنجاز للأسبوع المحدد ومعدل الأداء التراكمي</span>
              </span>
              <span className="font-mono">
                المدى الزمني: من الأسبوع 1 إلى الأسبوع {metrics.weeksPassed}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Subtitle Footnote ── */}
      <div className="mt-4 pt-3 border-t border-indigo-800/40 flex flex-col sm:flex-row items-center justify-between text-xs text-indigo-300/70 gap-2">
        <span>
          💡 يتم تحديث كافة المؤشرات الأسبوعية والرسوم البيانية ديناميكياً بناءً على الشيت المعتمد وشبكة "WE".
        </span>
        <span className="font-mono text-[11px]">
          خطة FTTS المعتمدة: 1440 موقع WE موزعة على 9 قطاعات
        </span>
      </div>
    </div>
  );
};
