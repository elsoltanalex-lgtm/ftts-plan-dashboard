import React, { useState, useMemo, useEffect } from 'react';
import {
  PieChart,
  Info,
  RotateCcw,
  ChevronRight,
  Layers,
  Building,
  Briefcase,
  AlertOctagon,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import type { StatusSummary, SiteRecord } from '../types/dashboard';
import { getSiteClassification } from '../data/dashboardData';
import { isRecordInSector } from '../utils/sectorPermissions';
import { toFilterArray } from '../utils/filterUtils';

interface DonutChartProps {
  data: StatusSummary[];
  totalSites: number;
  activeStatusFilter?: string | string[];
  onSelectStatus: (status: string) => void;
  sitesData?: SiteRecord[];
  activeSector?: string | string[];
  onSelectSector?: (sector: string) => void;
  onSelectGeneralAdmin?: (admin: string) => void;
  onSelectCompetentAdmin?: (admin: string) => void;
  resetTrigger?: number;
  onResetAll?: () => void;
}

const DRILL_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981',
  '#f59e0b', '#3b82f6', '#14b8a6', '#f97316', '#a855f7'
];

function normAdmin(text?: string | null): string {
  if (!text) return '';
  return text
    .toString()
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  totalSites,
  activeStatusFilter,
  onSelectStatus,
  sitesData = [],
  activeSector,
  onSelectSector,
  onSelectGeneralAdmin,
  onSelectCompetentAdmin,
  resetTrigger,
  onResetAll,
}) => {
  // Hierarchical Drill-down navigation levels:
  // Level 0: Main Status Overview (الموقف العام)
  // Level 1:
  //   - If Sector is "ALL": Breakdown of chosen Status across SECTORS (القطاعات المختلفة)
  //   - If Sector is specific: Breakdown across General Directorates (الإدارات العامة)
  // Level 2:
  //   - If Sector is "ALL": General Directorates (الإدارات العامة) for chosen Sector
  //   - If Sector is specific: Execution Admins (إدارات التنفيذ المختصة)
  // Level 3:
  //   - Execution Admins (إدارات التنفيذ المختصة) for chosen General Directorate
  const [drillLevel, setDrillLevel] = useState<0 | 1 | 2 | 3>(0);
  const [drilledStatus, setDrilledStatus] = useState<string>('');
  const [drilledSector, setDrilledSector] = useState<string>('');
  const [drilledGeneralAdmin, setDrilledGeneralAdmin] = useState<string>('');
  const [drilledCompetentAdmin, setDrilledCompetentAdmin] = useState<string>('');
  const [hoveredSlice, setHoveredSlice] = useState<{
    label: string;
    count: number;
    percentage: number;
    color: string;
  } | null>(null);

  // Synchronize reset when external resetTrigger fires (e.g. from Reset Filters button)
  useEffect(() => {
    if (resetTrigger !== undefined) {
      setDrillLevel(0);
      setDrilledStatus('');
      setDrilledSector('');
      setDrilledGeneralAdmin('');
      setDrilledCompetentAdmin('');
      setHoveredSlice(null);
    }
  }, [resetTrigger]);

  // Synchronize when activeSector changes from the top filters
  useEffect(() => {
    setDrillLevel(0);
    setDrilledStatus('');
    setDrilledSector('');
    setDrilledGeneralAdmin('');
    setDrilledCompetentAdmin('');
    setHoveredSlice(null);
  }, [activeSector]);

  // Synchronize when status filter is cleared from outside
  const activeStatusList = useMemo(() => toFilterArray(activeStatusFilter), [activeStatusFilter]);
  const activeSectors = useMemo(() => toFilterArray(activeSector), [activeSector]);
  const isSectorAll = activeSectors.length === 0 || activeSectors.includes('ALL') || activeSectors.includes('All');

  useEffect(() => {
    if (activeStatusList.length === 0 && drillLevel > 0) {
      setDrillLevel(0);
      setDrilledStatus('');
      setDrilledSector('');
      setDrilledGeneralAdmin('');
      setDrilledCompetentAdmin('');
      setHoveredSlice(null);
    }
  }, [activeStatusList, drillLevel]);

  // Separate "المتعذرات" and "المعوقات" for independent dedicated sections (Requirement 7)
  const stalledSummary = useMemo(() => {
    const item = data.find((d) => d.status === 'متعذر' || d.status.includes('متعذر') || d.status.includes('تعذر'));
    const count = item ? item.sitesCount : sitesData.filter((s) => {
      const matchCat = getSiteClassification(s).includes('متعذر') || getSiteClassification(s).includes('تعذر');
      const matchSec = isSectorAll || activeSectors.some((sec) => isRecordInSector(sec, s));
      return matchCat && matchSec;
    }).length;
    const total = totalSites || 1;
    const pct = Number(((count / total) * 100).toFixed(1));
    return { count, pct };
  }, [data, sitesData, totalSites, isSectorAll, activeSectors]);

  const obstaclesSummary = useMemo(() => {
    const item = data.find((d) => d.status === 'معوقات' || d.status.includes('معوق'));
    const count = item ? item.sitesCount : sitesData.filter((s) => {
      const matchCat = getSiteClassification(s).includes('معوق');
      const matchSec = isSectorAll || activeSectors.some((sec) => isRecordInSector(sec, s));
      return matchCat && matchSec;
    }).length;
    const total = totalSites || 1;
    const pct = Number(((count / total) * 100).toFixed(1));
    return { count, pct };
  }, [data, sitesData, totalSites, isSectorAll, activeSectors]);

  // Compute active dataset based on drill level
  const currentLevelItems = useMemo(() => {
    // ── Level 0: Main Status Overview ──
    if (drillLevel === 0) {
      return data
        .filter((d) => d.sitesCount > 0)
        .map((d) => ({
          id: d.status,
          label: d.status,
          count: d.sitesCount,
          percentage: d.percentage,
          color: d.color,
          badgeBg: d.badgeBg,
        }));
    }

    // ── Level 1: Sectors (if Sector='ALL') OR General Directorates (if specific Sector) ──
    if (drillLevel === 1) {
      if (isSectorAll) {
        // Group matching status sites across SECTORS
        const filtered = sitesData.filter((s) => getSiteClassification(s) === drilledStatus);
        const totalMatching = filtered.length || 1;
        const map: Record<string, number> = {};

        filtered.forEach((s) => {
          const sec = String(s.sector || 'قطاع عام').trim();
          map[sec] = (map[sec] || 0) + 1;
        });

        return Object.entries(map)
          .sort((a, b) => b[1] - a[1])
          .map(([secName, count], idx) => ({
            id: secName,
            label: secName,
            count,
            percentage: Number(((count / totalMatching) * 100).toFixed(1)),
            color: DRILL_COLORS[idx % DRILL_COLORS.length],
            badgeBg: '#f1f5f9',
          }));
      } else {
        // Specific sector already active: drill directly to General Directorates belonging to this Sector
        const filtered = sitesData.filter((s) => {
          const matchesStatus = getSiteClassification(s) === drilledStatus;
          const matchesSector = isRecordInSector(activeSector, s);
          return matchesStatus && matchesSector;
        });

        const totalMatching = filtered.length || 1;
        const map: Record<string, number> = {};
        filtered.forEach((s) => {
          const ga = String(s.generalAdmin || 'الإدارة العامة لتنفيذ الشبكات').trim();
          map[ga] = (map[ga] || 0) + 1;
        });

        return Object.entries(map)
          .sort((a, b) => b[1] - a[1])
          .map(([adminName, count], idx) => ({
            id: adminName,
            label: adminName,
            count,
            percentage: Number(((count / totalMatching) * 100).toFixed(1)),
            color: DRILL_COLORS[idx % DRILL_COLORS.length],
            badgeBg: '#f1f5f9',
          }));
      }
    }

    // ── Level 2: General Directorates (if Sector='ALL') OR Competent Execution Admins (if specific Sector) ──
    if (drillLevel === 2) {
      if (isSectorAll) {
        // In Sector='ALL' mode, Level 2 is General Directorates for the chosen drilledSector
        const filtered = sitesData.filter((s) => {
          const matchesStatus = getSiteClassification(s) === drilledStatus;
          const matchesSector = isRecordInSector(drilledSector, s);
          return matchesStatus && matchesSector;
        });

        const totalMatching = filtered.length || 1;
        const map: Record<string, number> = {};
        filtered.forEach((s) => {
          const ga = String(s.generalAdmin || 'الإدارة العامة لتنفيذ الشبكات').trim();
          map[ga] = (map[ga] || 0) + 1;
        });

        return Object.entries(map)
          .sort((a, b) => b[1] - a[1])
          .map(([adminName, count], idx) => ({
            id: adminName,
            label: adminName,
            count,
            percentage: Number(((count / totalMatching) * 100).toFixed(1)),
            color: DRILL_COLORS[idx % DRILL_COLORS.length],
            badgeBg: '#f1f5f9',
          }));
      } else {
        // Specific sector: Level 2 is Competent Execution Admins for chosen drilledGeneralAdmin
        const targetGaNorm = normAdmin(drilledGeneralAdmin);
        const filtered = sitesData.filter((s) => {
          const matchesStatus = getSiteClassification(s) === drilledStatus;
          const matchesSector = isRecordInSector(activeSector, s);
          const matchesGa = normAdmin(s.generalAdmin) === targetGaNorm || normAdmin(s.generalAdmin).includes(targetGaNorm);
          return matchesStatus && matchesSector && matchesGa;
        });

        const totalMatching = filtered.length || 1;
        const map: Record<string, number> = {};
        filtered.forEach((s) => {
          const ca = String(s.competentAdmin || 'إدارة التنفيذ والمسارات').trim();
          map[ca] = (map[ca] || 0) + 1;
        });

        return Object.entries(map)
          .sort((a, b) => b[1] - a[1])
          .map(([adminName, count], idx) => ({
            id: adminName,
            label: adminName,
            count,
            percentage: Number(((count / totalMatching) * 100).toFixed(1)),
            color: DRILL_COLORS[idx % DRILL_COLORS.length],
            badgeBg: '#f1f5f9',
          }));
      }
    }

    // ── Level 3: Competent Execution Admins (when Sector was 'ALL') ──
    if (drillLevel === 3) {
      const targetGaNorm = normAdmin(drilledGeneralAdmin);
      const filtered = sitesData.filter((s) => {
        const matchesStatus = getSiteClassification(s) === drilledStatus;
        const matchesSector = isRecordInSector(drilledSector, s);
        const matchesGa = normAdmin(s.generalAdmin) === targetGaNorm || normAdmin(s.generalAdmin).includes(targetGaNorm);
        return matchesStatus && matchesSector && matchesGa;
      });

      const totalMatching = filtered.length || 1;
      const map: Record<string, number> = {};
      filtered.forEach((s) => {
        const ca = String(s.competentAdmin || 'إدارة التنفيذ والمسارات').trim();
        map[ca] = (map[ca] || 0) + 1;
      });

      return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .map(([adminName, count], idx) => ({
          id: adminName,
          label: adminName,
          count,
          percentage: Number(((count / totalMatching) * 100).toFixed(1)),
          color: DRILL_COLORS[idx % DRILL_COLORS.length],
          badgeBg: '#f1f5f9',
        }));
    }

    return [];
  }, [drillLevel, drilledStatus, drilledSector, drilledGeneralAdmin, data, sitesData, isSectorAll, activeSector]);

  // Current level total sites count
  const currentTotal = useMemo(() => {
    if (drillLevel === 0) return totalSites > 0 ? totalSites : 1;
    return currentLevelItems.reduce((acc, it) => acc + it.count, 0) || 1;
  }, [drillLevel, totalSites, currentLevelItems]);

  // Calculate SVG arc paths
  let cumulativeAngle = -90;
  const slices = currentLevelItems.map((item) => {
    const sliceAngle = (item.count / currentTotal) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + sliceAngle;
    cumulativeAngle += sliceAngle;

    return {
      ...item,
      startAngle,
      endAngle,
      sliceAngle,
    };
  });

  const createArc = (
    centerX: number,
    centerY: number,
    radius: number,
    innerRadius: number,
    startDeg: number,
    endDeg: number
  ) => {
    const isFull = endDeg - startDeg >= 359.99;
    const effectiveEndDeg = isFull ? startDeg + 359.99 : endDeg;

    const startRad = (startDeg * Math.PI) / 180;
    const endRad = (effectiveEndDeg * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const x3 = centerX + innerRadius * Math.cos(endRad);
    const y3 = centerY + innerRadius * Math.sin(endRad);
    const x4 = centerX + innerRadius * Math.cos(startRad);
    const y4 = centerY + innerRadius * Math.sin(startRad);

    const largeArcFlag = endDeg - startDeg > 180 ? 1 : 0;

    return `
      M ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}
      Z
    `;
  };

  // Handler for slice click with Drill-down logic
  const handleSliceClick = (item: (typeof currentLevelItems)[0]) => {
    if (drillLevel === 0) {
      setDrilledStatus(item.label);
      setDrillLevel(1);
      onSelectStatus(item.label);
      setHoveredSlice(null);
    } else if (drillLevel === 1) {
      if (isSectorAll) {
        setDrilledSector(item.label);
        setDrillLevel(2);
        if (onSelectSector) onSelectSector(item.label);
      } else {
        setDrilledGeneralAdmin(item.label);
        setDrillLevel(2);
        if (onSelectGeneralAdmin) onSelectGeneralAdmin(item.label);
      }
      setHoveredSlice(null);
    } else if (drillLevel === 2) {
      if (isSectorAll) {
        setDrilledGeneralAdmin(item.label);
        setDrillLevel(3);
        if (onSelectGeneralAdmin) onSelectGeneralAdmin(item.label);
      } else {
        setDrilledCompetentAdmin(item.label);
        if (onSelectCompetentAdmin) onSelectCompetentAdmin(item.label);
      }
      setHoveredSlice(null);
    } else if (drillLevel === 3) {
      setDrilledCompetentAdmin(item.label);
      if (onSelectCompetentAdmin) onSelectCompetentAdmin(item.label);
      setHoveredSlice(null);
    }
  };

  const handleBackStep = () => {
    if (drillLevel === 3) {
      setDrillLevel(2);
      setDrilledCompetentAdmin('');
      if (onSelectCompetentAdmin) onSelectCompetentAdmin('');
    } else if (drillLevel === 2) {
      setDrillLevel(1);
      if (isSectorAll) {
        setDrilledGeneralAdmin('');
        if (onSelectGeneralAdmin) onSelectGeneralAdmin('');
      } else {
        setDrilledGeneralAdmin('');
        setDrilledCompetentAdmin('');
        if (onSelectGeneralAdmin) onSelectGeneralAdmin('');
        if (onSelectCompetentAdmin) onSelectCompetentAdmin('');
      }
    } else if (drillLevel === 1) {
      setDrillLevel(0);
      setDrilledStatus('');
      setDrilledSector('');
      setDrilledGeneralAdmin('');
      setDrilledCompetentAdmin('');
      onSelectStatus('');
      if (onSelectGeneralAdmin) onSelectGeneralAdmin('');
      if (onSelectCompetentAdmin) onSelectCompetentAdmin('');
    }
    setHoveredSlice(null);
  };

  const handleResetDrill = () => {
    setDrillLevel(0);
    setDrilledStatus('');
    setDrilledSector('');
    setDrilledGeneralAdmin('');
    setDrilledCompetentAdmin('');
    setHoveredSlice(null);
    onSelectStatus('');
    if (onResetAll) {
      onResetAll();
    }
  };

  const activeDisplay = hoveredSlice || null;

  return (
    <div className="pbi-card p-5 flex flex-col justify-between h-full bg-white/95">
      {/* Visual Header with Drill Breadcrumbs */}
      <div className="pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-700 border border-purple-100">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800 leading-tight">
                  الموقف العام لتنفيذ المواقع (Drill-down Interactive)
                </h3>
                {drillLevel > 0 && (
                  <span className="text-[10px] bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Layers className="w-3 h-3 text-purple-600" />
                    <span>
                      مستوى تدرج:{' '}
                      {drillLevel === 1
                        ? isSectorAll ? `القطاعات (${drilledStatus})` : `الإدارات العامة (${drilledStatus})`
                        : drillLevel === 2
                          ? isSectorAll ? `الإدارات العامة (${drilledSector})` : `إدارات التنفيذ المختصة (${drilledGeneralAdmin})`
                          : `إدارات التنفيذ المختصة (${drilledGeneralAdmin})`}
                    </span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                توزيع المواقع حسب المراحل مع إمكانية التدرج الهرمي بالنقر
              </p>
            </div>
          </div>

          {/* Drill Reset or Overall Reset Button */}
          <div className="flex items-center gap-2">
            {drillLevel > 0 ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleBackStep}
                  className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-300 rounded-lg hover:bg-purple-100 transition cursor-pointer"
                  title="الرجوع للمستوى الهرمي السابق"
                >
                  <span>◀ رجوع خطوة</span>
                </button>
                <button
                  onClick={handleResetDrill}
                  className="flex items-center gap-1 text-xs font-bold px-2 py-1 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-200 transition cursor-pointer"
                  title="إلغاء التدرج والعودة للموقف العام لكافة القطاعات"
                >
                  <RotateCcw className="w-3 h-3 text-slate-600" />
                  <span>إلغاء التدرج</span>
                </button>
              </div>
            ) : activeStatusList.length > 0 ? (
              <button
                onClick={() => onSelectStatus('')}
                className="flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md hover:bg-amber-100 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>عرض الكل</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Drill-down Interactive Breadcrumb Bar */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 overflow-x-auto">
          <button
            onClick={handleResetDrill}
            className={`hover:text-purple-700 transition cursor-pointer font-bold ${drillLevel === 0 ? 'text-purple-800' : 'text-slate-600'
              }`}
          >
            الموقف العام {!isSectorAll ? `(${activeSector})` : '(كافة القطاعات)'}
          </button>

          {drillLevel >= 1 && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <button
                onClick={() => {
                  setDrillLevel(1);
                  setDrilledSector('');
                  setDrilledGeneralAdmin('');
                  setDrilledCompetentAdmin('');
                  setHoveredSlice(null);
                }}
                className={`hover:text-purple-700 transition cursor-pointer font-bold ${drillLevel === 1 ? 'text-purple-800' : 'text-slate-600'
                  }`}
              >
                {drilledStatus} {isSectorAll ? '(القطاعات)' : '(الإدارات العامة)'}
              </button>
            </>
          )}

          {drillLevel >= 2 && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <button
                onClick={() => {
                  setDrillLevel(2);
                  setDrilledGeneralAdmin('');
                  setDrilledCompetentAdmin('');
                  setHoveredSlice(null);
                }}
                className={`hover:text-purple-700 transition cursor-pointer font-bold ${drillLevel === 2 ? 'text-purple-800' : 'text-slate-600'
                  }`}
              >
                {isSectorAll ? `${drilledSector} (الإدارات العامة)` : `${drilledGeneralAdmin} (إدارات التنفيذ المختصة)`}
              </button>
            </>
          )}

          {drillLevel >= 3 && isSectorAll && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-purple-900 font-extrabold truncate">
                {drilledGeneralAdmin} (إدارات التنفيذ المختصة)
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main SVG Donut + Center Overlay + Legend */}
      <div className="flex flex-col xl:flex-row items-center justify-center gap-6 my-2">
        <div className="relative flex items-center justify-center">
          <svg
            viewBox="0 0 320 320"
            className="w-64 h-64 sm:w-72 sm:h-72 drop-shadow-sm select-none"
          >
            {/* Background ring */}
            <circle
              cx="160"
              cy="160"
              r="135"
              fill="none"
              stroke="#f8fafc"
              strokeWidth="2"
            />

            {/* Slices */}
            {slices.map((slice) => {
              const isHovered = hoveredSlice?.label === slice.label;
              const isSelected = activeStatusList.includes(slice.label) && drillLevel === 0;
              const outerR = isHovered || isSelected ? 142 : 135;
              const innerR = isHovered || isSelected ? 84 : 88;

              return (
                <path
                  key={slice.id}
                  d={createArc(160, 160, outerR, innerR, slice.startAngle, slice.endAngle)}
                  fill={slice.color}
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  className="cursor-pointer transition-all duration-200"
                  style={{
                    filter: isHovered || isSelected ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.18))' : 'none',
                  }}
                  onMouseEnter={() =>
                    setHoveredSlice({
                      label: slice.label,
                      count: slice.count,
                      percentage: slice.percentage,
                      color: slice.color,
                    })
                  }
                  onMouseLeave={() => setHoveredSlice(null)}
                  onClick={() => handleSliceClick(slice)}
                />
              );
            })}

            {/* Center Circle */}
            <circle cx="160" cy="160" r="82" fill="#ffffff" />
          </svg>

          {/* Center Info Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            {activeDisplay ? (
              <div className="animate-fade-in">
                <span
                  className="text-2xl sm:text-3xl font-extrabold font-sans tracking-tight block"
                  style={{ color: activeDisplay.color }}
                >
                  {activeDisplay.count}
                </span>
                <span className="text-[11px] font-bold text-slate-800 line-clamp-1 block max-w-[125px]">
                  {activeDisplay.label}
                </span>
                <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-bold rounded-full font-mono bg-slate-100 text-slate-700 border border-slate-200">
                  {activeDisplay.percentage}%
                </span>
              </div>
            ) : (
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-800 font-sans tracking-tight block">
                  {currentTotal}
                </span>
                <span className="text-xs font-bold text-slate-500 block mt-0.5">
                  {drillLevel === 0
                    ? !isSectorAll ? `إجمالي: ${activeSector}` : 'إجمالي كافة القطاعات'
                    : drillLevel === 1
                      ? isSectorAll ? `توزيع قطاعات: ${drilledStatus}` : `إدارات عامة: ${drilledStatus}`
                      : drillLevel === 2
                        ? isSectorAll ? `إدارات عامة: ${drilledSector}` : `إدارات التنفيذ المختصة`
                        : `إدارات التنفيذ المختصة`}
                </span>
                <span className="text-[10px] text-purple-600 font-medium block">
                  {drillLevel === 0 ? 'انقر للتدرج الهرمي 🔍' : 'مستوى تدرجي هرمي'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Legend List */}
        <div className="flex-1 w-full space-y-1.5 max-w-md max-h-56 overflow-y-auto pr-1">
          {slices.map((item) => {
            const isHovered = hoveredSlice?.label === item.label;

            return (
              <div
                key={item.id}
                onMouseEnter={() =>
                  setHoveredSlice({
                    label: item.label,
                    count: item.count,
                    percentage: item.percentage,
                    color: item.color,
                  })
                }
                onMouseLeave={() => setHoveredSlice(null)}
                onClick={() => handleSliceClick(item)}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all text-xs border ${isHovered
                  ? 'bg-purple-50 text-purple-900 border-purple-300 shadow-2xs font-bold'
                  : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-700'
                  }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-semibold truncate max-w-[160px] sm:max-w-[200px]">
                    {item.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono flex-shrink-0">
                  <span className="font-bold text-slate-800">{item.count}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                    {item.percentage}%
                  </span>
                  <span className="text-[10px] text-purple-500">▶</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Requirement 7: Dedicated Independent Sections for "المتعذرات" and "المعوقات" */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 1. قسم المتعذرات المستقل */}
        <div
          onClick={() => {
            onSelectStatus('متعذر');
            setDrilledStatus('متعذر');
            setDrillLevel(1);
            setDrilledSector('');
            setDrilledGeneralAdmin('');
            setDrilledCompetentAdmin('');
          }}
          className="p-3 bg-rose-50/80 hover:bg-rose-100/90 border border-rose-200 rounded-xl transition cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-extrabold text-rose-900 flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-rose-600" />
              <span>قسم المتعذرات المستقل (Stalled)</span>
            </span>
            <span className="text-xs font-mono font-black text-rose-700 bg-white px-2 py-0.5 rounded-full border border-rose-300 shadow-2xs">
              {stalledSummary.count} موقع
            </span>
          </div>
          <p className="text-[11px] text-rose-700 leading-tight">
            المواقع المتوقفة تماماً بنسبة <strong className="font-mono">{stalledSummary.pct}%</strong> من خطة المشغل • انقر لعرض تفاصيل إدارات التنفيذ
          </p>
        </div>

        {/* 2. قسم المعوقات المستقل */}
        <div
          onClick={() => {
            onSelectStatus('معوقات');
            setDrilledStatus('معوقات');
            setDrillLevel(1);
            setDrilledSector('');
            setDrilledGeneralAdmin('');
            setDrilledCompetentAdmin('');
          }}
          className="p-3 bg-amber-50/80 hover:bg-amber-100/90 border border-amber-200 rounded-xl transition cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>قسم المعوقات المستقل (Obstacles)</span>
            </span>
            <span className="text-xs font-mono font-black text-amber-800 bg-white px-2 py-0.5 rounded-full border border-amber-300 shadow-2xs">
              {obstaclesSummary.count} موقع
            </span>
          </div>
          <p className="text-[11px] text-amber-700 leading-tight">
            مواقع بها عوائق جاري التنسيق لحلها بنسبة <strong className="font-mono">{obstaclesSummary.pct}%</strong> • انقر لعرض تفاصيل إدارات التنفيذ
          </p>
        </div>
      </div>
    </div>
  );
};