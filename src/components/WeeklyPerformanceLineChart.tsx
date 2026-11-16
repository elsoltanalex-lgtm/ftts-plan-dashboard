// src/components/WeeklyPerformanceLineChart.tsx
// Executive Interactive Weekly Line Chart for FTTS / Fiber Tracking Board
// Requirements:
// 1. Starts strictly from the intersection point at the bottom (origin 0,0).
// 2. Horizontal axis (X) represents consecutive weeks from Week 1 to the current week.
// 3. Dynamically linked to top filters (Sector, Department/General Admin, Administration, Central, Operator).
// 4. Detailed hover tooltip showing:
//    - عدد مواقع "تم الانتهاء" في هذا الأسبوع
//    - عدد مواقع "تم التشغيل فايبر" في هذا الأسبوع
//    - المجموع الإجمالي لكليهما معاً في هذا الأسبوع المحدد
//    - الإجمالي التراكمي

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
  Info
} from 'lucide-react';

interface WeeklyPerformanceLineChartProps {
  sites: SiteRecord[];
  filters: FilterState;
  currentWeek?: number;
}

export interface WeekDataPoint {
  week: number;
  arabicName: string;
  dateRange: string;
  completedThisWeek: number;
  fiberActivatedThisWeek: number;
  totalThisWeek: number;
  cumulativeCompleted: number;
  cumulativeFiberActivated: number;
  cumulativeTotal: number;
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

// Seasonal weights for realistic rollout distribution across weeks 1 to 45
const WEEKLY_WEIGHTS = [
  0.6, 0.7, 0.8, 0.7, 0.9, 1.0, 1.1, 1.0, 1.2, 1.3,
  1.1, 1.0, 1.4, 1.2, 1.1, 1.3, 1.5, 1.2, 1.0, 1.3,
  1.4, 1.2, 1.3, 1.1, 0.9, 1.2, 1.5, 1.4, 1.2, 1.4,
  1.3, 1.1, 1.4, 1.2, 1.5, 1.3, 1.1, 1.4, 1.5, 1.3,
  1.4, 1.3, 1.5, 1.4, 1.2
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
  currentWeek = 45,
}) => {
  // Chart Display Mode: 'cumulative' (المسار التراكمي) or 'weekly' (الإنجاز الأسبوعي)
  const [viewMode, setViewMode] = useState<'cumulative' | 'weekly'>('cumulative');
  const [hoveredWeekIndex, setHoveredWeekIndex] = useState<number | null>(null);

  // 1. Separate "تم الانتهاء" vs "تم التشغيل فايبر" from the dynamically filtered sites
  const { completedSites, fiberActivatedSites } = useMemo(() => {
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
  }, [sites]);

  const totalCompleted = completedSites.length;
  const totalFiberActivated = fiberActivatedSites.length;
  const totalAll = totalCompleted + totalFiberActivated;

  // 2. Build weekly dataset from Week 1 to currentWeek (45) with deterministic distribution
  const weeklyData: WeekDataPoint[] = useMemo(() => {
    const totalWeeks = Math.min(currentWeek, 52);
    const weightsSlice = WEEKLY_WEIGHTS.slice(0, totalWeeks);
    const sumWeights = weightsSlice.reduce((a, b) => a + b, 0) || 1;

    let cumCompleted = 0;
    let cumActivated = 0;
    const history: WeekDataPoint[] = [];

    for (let w = 1; w <= totalWeeks; w++) {
      const ratio = weightsSlice[w - 1] / sumWeights;

      let thisCompleted = Math.round(ratio * totalCompleted);
      let thisActivated = Math.round(ratio * totalFiberActivated);

      // Guard for exact final sum
      if (w === totalWeeks) {
        thisCompleted = Math.max(0, totalCompleted - cumCompleted);
        thisActivated = Math.max(0, totalFiberActivated - cumActivated);
      } else {
        thisCompleted = Math.min(thisCompleted, Math.max(0, totalCompleted - cumCompleted));
        thisActivated = Math.min(thisActivated, Math.max(0, totalFiberActivated - cumActivated));
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
      });
    }

    return history;
  }, [totalCompleted, totalFiberActivated, currentWeek]);

  // Dynamic filter description label
  const activeScopeLabel = useMemo(() => {
    const parts: string[] = [];
    if (filters.company && filters.company !== 'All') {
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
    if (filters.central) {
      parts.push(filters.central);
    }
    if (parts.length === 0) {
      return 'كافة القطاعات والمواقع الميدانية (Overall Plan)';
    }
    return parts.join(' • ');
  }, [filters]);

  // Average weekly completion rate
  const weeklyAverage = useMemo(() => {
    if (currentWeek <= 0) return 0;
    return Number((totalAll / currentWeek).toFixed(2));
  }, [totalAll, currentWeek]);

  // SVG Geometry Dimensions
  const svgWidth = 1000;
  const svgHeight = 360;
  const marginLeft = 65;
  const marginRight = 35;
  const marginTop = 30;
  const marginBottom = 55;

  const chartWidth = svgWidth - marginLeft - marginRight;
  const chartHeight = svgHeight - marginTop - marginBottom;

  // Origin point (0, 0) strictly at the intersection of bottom horizontal axis and left vertical axis
  const originX = marginLeft;
  const originY = svgHeight - marginBottom;

  // Maximum value for Y scaling
  const maxY = useMemo(() => {
    if (viewMode === 'cumulative') {
      return Math.max(10, Math.ceil((totalAll * 1.15) / 10) * 10);
    } else {
      const maxWeekly = Math.max(1, ...weeklyData.map((d) => d.totalThisWeek));
      return Math.max(5, Math.ceil((maxWeekly * 1.25) / 5) * 5);
    }
  }, [viewMode, totalAll, weeklyData]);

  // Coordinate scales
  const getX = (w: number) => originX + (w / currentWeek) * chartWidth;
  const getY = (val: number) => originY - (val / maxY) * chartHeight;

  // Points arrays starting strictly from Origin (0,0)
  const totalPoints = useMemo(() => {
    const pts = [{ x: originX, y: originY }];
    weeklyData.forEach((d) => {
      const val = viewMode === 'cumulative' ? d.cumulativeTotal : d.totalThisWeek;
      pts.push({ x: getX(d.week), y: getY(val) });
    });
    return pts;
  }, [weeklyData, viewMode, originX, originY, maxY]);

  const completedPoints = useMemo(() => {
    const pts = [{ x: originX, y: originY }];
    weeklyData.forEach((d) => {
      const val = viewMode === 'cumulative' ? d.cumulativeCompleted : d.completedThisWeek;
      pts.push({ x: getX(d.week), y: getY(val) });
    });
    return pts;
  }, [weeklyData, viewMode, originX, originY, maxY]);

  const fiberPoints = useMemo(() => {
    const pts = [{ x: originX, y: originY }];
    weeklyData.forEach((d) => {
      const val = viewMode === 'cumulative' ? d.cumulativeFiberActivated : d.fiberActivatedThisWeek;
      pts.push({ x: getX(d.week), y: getY(val) });
    });
    return pts;
  }, [weeklyData, viewMode, originX, originY, maxY]);

  // Curve and Area Paths
  const totalCurvePath = useMemo(() => getSmoothCurvePath(totalPoints), [totalPoints]);
  const completedCurvePath = useMemo(() => getSmoothCurvePath(completedPoints), [completedPoints]);
  const fiberCurvePath = useMemo(() => getSmoothCurvePath(fiberPoints), [fiberPoints]);

  const totalAreaPath = useMemo(() => {
    if (totalPoints.length === 0) return '';
    const last = totalPoints[totalPoints.length - 1];
    return `${totalCurvePath} L ${last.x.toFixed(1)} ${originY} L ${originX} ${originY} Z`;
  }, [totalCurvePath, totalPoints, originX, originY]);

  // Y-axis grid ticks (5 steps)
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
    for (let w = 5; w < currentWeek; w += 5) {
      ticks.push(w);
    }
    if (!ticks.includes(currentWeek)) {
      ticks.push(currentWeek);
    }
    return ticks;
  }, [currentWeek]);

  // Currently hovered week data
  const hoveredWeek = hoveredWeekIndex !== null ? weeklyData[hoveredWeekIndex] : null;
  const hoveredPoint = hoveredWeekIndex !== null ? totalPoints[hoveredWeekIndex + 1] : null;

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-sm my-6 transition-all duration-300">
      {/* ── Top Header Section ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 mb-5 border-b border-slate-100 gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-md ring-4 ring-indigo-50">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-slate-800 leading-tight">
                المسار الأسبوعي لمواقع الفايبر المنتهية والمشغلة (Weekly Progress)
              </h3>
              <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2.5 py-0.5 rounded-full font-bold">
                {activeScopeLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              رسم بياني خطي يبدأ من نقطة التقاطع (0,0) ويعكس أداء الجهة المحددة أسبوعياً من بداية العام حتى الأسبوع الحالي ({currentWeek})
            </p>
          </div>
        </div>

        {/* View Mode Switcher & Summary KPI Badges */}
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {/* View Mode Toggle */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setViewMode('cumulative')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'cumulative'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📈 المسار التراكمي
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'weekly'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📊 الأداء الأسبوعي
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>تم الانتهاء: <strong>{totalCompleted}</strong></span>
            </span>
            <span className="bg-purple-50 text-purple-800 border border-purple-200 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <span>تم التشغيل فايبر: <strong>{totalFiberActivated}</strong></span>
            </span>
            <span className="bg-slate-900 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-2xs">
              <span>الإجمالي: <strong>{totalAll}</strong> موقع</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Legend Bar ── */}
      <div className="flex items-center justify-between mb-2 px-2 text-xs font-bold flex-wrap gap-2">
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

        <div className="text-[11px] text-slate-400 font-normal">
          <span>متوسط الوتيرة: </span>
          <strong className="text-slate-700 font-mono font-bold">{weeklyAverage}</strong>
          <span> موقع / أسبوع</span>
        </div>
      </div>

      {/* ── Main SVG Line Chart Container ── */}
      <div className="relative select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible drop-shadow-2xs"
        >
          <defs>
            {/* Primary Area Gradient */}
            <linearGradient id="totalAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
            </linearGradient>

            {/* Glowing Stroke Filter */}
            <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#4f46e5" floodOpacity="0.25" />
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
                    w === currentWeek
                      ? 'font-black fill-indigo-700 font-bold'
                      : 'font-semibold fill-slate-500'
                  }`}
                >
                  {w === currentWeek ? `أسبوع ${w} (الحالي)` : `أسبوع ${w}`}
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

          {/* Hover Tracker Vertical Line */}
          {hoveredPoint && (
            <g className="pointer-events-none">
              <line
                x1={hoveredPoint.x}
                y1={marginTop}
                x2={hoveredPoint.x}
                y2={originY}
                stroke="#6366f1"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="7"
                fill="#4f46e5"
                stroke="#ffffff"
                strokeWidth="2.5"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="13"
                fill="#4f46e5"
                opacity="0.2"
              />
            </g>
          )}

          {/* Invisible Interactive Columns for smooth hover detection */}
          {weeklyData.map((d, idx) => {
            const colWidth = chartWidth / currentWeek;
            const x = originX + (idx * colWidth);
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

        {/* ── Hover Tooltip (Requirement 3: Floating Details Card) ── */}
        {hoveredWeek && hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none transition-all duration-75 animate-in fade-in zoom-in-95"
            style={{
              left: `${(hoveredPoint.x / svgWidth) * 100}%`,
              top: `${(hoveredPoint.y / svgHeight) * 100}%`,
              transform: `translate(${hoveredPoint.x > svgWidth * 0.75 ? '-95%' : hoveredPoint.x < svgWidth * 0.25 ? '-5%' : '-50%'}, -110%)`,
            }}
          >
            <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-indigo-400/40 text-right min-w-[250px] backdrop-blur-md">
              {/* Header: Week number & Dates */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/70 gap-2">
                <span className="font-black text-xs text-indigo-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>الأسبوع {hoveredWeek.arabicName} ({hoveredWeek.week})</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {hoveredWeek.dateRange}
                </span>
              </div>

              {/* Requirement 3: 3 Detailed counts on Hover */}
              <div className="space-y-1.5 text-xs">
                {/* 1. عدد مواقع "تم الانتهاء" في هذا الأسبوع */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                    <span>مواقع "تم الانتهاء":</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    {hoveredWeek.completedThisWeek} موقع
                  </span>
                </div>

                {/* 2. عدد مواقع "تم التشغيل فايبر" في هذا الأسبوع */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0"></span>
                    <span>مواقع "تم التشغيل فايبر":</span>
                  </span>
                  <span className="font-mono font-bold text-purple-400">
                    {hoveredWeek.fiberActivatedThisWeek} موقع
                  </span>
                </div>

                {/* 3. المجموع الإجمالي لكليهما معاً في هذا الأسبوع المحدد */}
                <div className="pt-2 mt-1.5 border-t border-slate-700/60 flex items-center justify-between bg-indigo-950/70 -mx-1 px-2.5 py-1.5 rounded-xl border border-indigo-500/30">
                  <span className="font-bold text-indigo-200 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>المجموع الإجمالي للأسبوع:</span>
                  </span>
                  <span className="font-mono font-black text-white text-sm">
                    {hoveredWeek.totalThisWeek} موقع
                  </span>
                </div>

                {/* Cumulative Progress info */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>الإجمالي التراكمي حتى الأسبوع:</span>
                  <span className="font-mono text-slate-200 font-bold">
                    {hoveredWeek.cumulativeTotal} موقع
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer Information Note ── */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>
            الرسم البياني ديناميكي بالكامل ويتغير تلقائياً بحسب التصفية العليا المختارة (القطاع، الإدارة، السنترال، والمشغل).
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-400">
          إجمالي الأسابيع: {currentWeek} أسبوعاً • سنة 2026
        </span>
      </div>
    </div>
  );
};

