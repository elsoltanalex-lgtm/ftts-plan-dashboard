import React, { useMemo } from 'react';
import {
  Building2,
  CheckCircle2,
  Zap,
  HardHat,
  Clock,
  Compass,
  FileText,
  AlertOctagon,
  AlertTriangle,
  RotateCcw,
  CheckSquare,
} from 'lucide-react';

import type { KpiData } from '../types/dashboard';
import { toFilterArray } from '../utils/filterUtils';

interface KpiCardsProps {
  kpis: KpiData;
  activeStatusFilter: string | string[];
  onSelectStatusFilter: (status: string) => void;
  onClearStatusFilters?: () => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  kpis,
  activeStatusFilter,
  onSelectStatusFilter,
  onClearStatusFilters,
}) => {
  const total = kpis.totalSites || 1;
  const activeList = useMemo(() => toFilterArray(activeStatusFilter), [activeStatusFilter]);
  const isAllActive = activeList.length === 0 || activeList.includes('All');

  const cards = [
    {
      id: 'kpi-total-sites',
      title: 'إجمالي الموقع',
      titleEn: 'Total Sites',
      value: kpis.totalSites,
      subValue: `${kpis.totalSites} موقعاً بالخطة`,
      icon: Building2,
      color: 'from-blue-600 via-indigo-600 to-indigo-800',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50/70',
      borderColor: 'border-blue-200',
      ringColor: 'ring-blue-500',
      filterTarget: 'All',
      isActive: isAllActive,
    },
    {
      id: 'kpi-completed',
      title: 'تم الانتهاء',
      titleEn: 'Completed',
      value: kpis.completedSites,
      subValue: `${((kpis.completedSites / total) * 100).toFixed(1)}% من الإجمالي`,
      icon: CheckCircle2,
      color: 'from-emerald-500 to-green-600',
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50/80',
      borderColor: 'border-emerald-200',
      ringColor: 'ring-emerald-500',
      filterTarget: 'تم الانتهاء',
      isActive: activeList.includes('تم الانتهاء'),
    },
    {
      id: 'kpi-fiber-active',
      title: 'تم التشغيل فايبر',
      titleEn: 'Fiber Active',
      value: kpis.fiberActiveSites ?? 0,
      subValue: `${(((kpis.fiberActiveSites ?? 0) / total) * 100).toFixed(1)}% من الإجمالي`,
      icon: Zap,
      color: 'from-cyan-500 to-blue-600',
      textColor: 'text-cyan-700',
      bgColor: 'bg-cyan-50/80',
      borderColor: 'border-cyan-200',
      ringColor: 'ring-cyan-500',
      filterTarget: 'تم التشغيل فايبر',
      isActive: activeList.includes('تم التشغيل فايبر'),
    },
    {
      id: 'kpi-civil-done',
      title: 'تم مدني',
      titleEn: 'Civil Done',
      value: kpis.civilDoneSites ?? 0,
      subValue: `${(((kpis.civilDoneSites ?? 0) / total) * 100).toFixed(1)}% من الإجمالي`,
      icon: HardHat,
      color: 'from-teal-500 to-emerald-600',
      textColor: 'text-teal-700',
      bgColor: 'bg-teal-50/80',
      borderColor: 'border-teal-200',
      ringColor: 'ring-teal-500',
      filterTarget: 'تم مدني',
      isActive: activeList.includes('تم مدني'),
    },
    {
      id: 'kpi-in-progress',
      title: 'جاري العمل',
      titleEn: 'In Progress',
      value: kpis.inProgressSites,
      subValue: `${((kpis.inProgressSites / total) * 100).toFixed(1)}% من الإجمالي`,
      icon: Clock,
      color: 'from-amber-500 to-orange-600',
      textColor: 'text-amber-700',
      bgColor: 'bg-amber-50/80',
      borderColor: 'border-amber-200',
      ringColor: 'ring-amber-500',
      filterTarget: 'جاري العمل',
      isActive: activeList.includes('جاري العمل'),
    },
    {
      id: 'kpi-survey',
      title: 'جاري المعاينة',
      titleEn: 'Under Survey',
      value: kpis.surveySites ?? kpis.plannedSites ?? 0,
      subValue: `${((((kpis.surveySites ?? kpis.plannedSites ?? 0)) / total) * 100).toFixed(1)}% من الإجمالي`,
      icon: Compass,
      color: 'from-purple-500 to-violet-600',
      textColor: 'text-purple-700',
      bgColor: 'bg-purple-50/80',
      borderColor: 'border-purple-200',
      ringColor: 'ring-purple-500',
      filterTarget: 'جاري المعاينة',
      isActive: activeList.includes('جاري المعاينة'),
    },
    {
      id: 'kpi-permits',
      title: 'جاري تصريح',
      titleEn: 'Permits',
      value: kpis.permitsSites ?? kpis.permitsCount ?? 0,
      subValue: `${((((kpis.permitsSites ?? kpis.permitsCount ?? 0)) / total) * 100).toFixed(1)}% من الإجمالي`,
      icon: FileText,
      color: 'from-sky-500 to-blue-600',
      textColor: 'text-sky-700',
      bgColor: 'bg-sky-50/80',
      borderColor: 'border-sky-200',
      ringColor: 'ring-sky-500',
      filterTarget: 'جاري تصريح',
      isActive: activeList.includes('جاري تصريح'),
    },
    {
      id: 'kpi-stalled',
      title: 'متعذر',
      titleEn: 'Stalled',
      value: kpis.stalledSites ?? kpis.stalledCount ?? 0,
      subValue: `${((((kpis.stalledSites ?? kpis.stalledCount ?? 0)) / total) * 100).toFixed(1)}% من الإجمالي`,
      icon: AlertOctagon,
      color: 'from-rose-500 to-red-600',
      textColor: 'text-rose-700',
      bgColor: 'bg-rose-50/80',
      borderColor: 'border-rose-200',
      ringColor: 'ring-rose-500',
      filterTarget: 'متعذر',
      isActive: activeList.includes('متعذر'),
    },
    {
      id: 'kpi-obstacles',
      title: 'معوقات',
      titleEn: 'Obstacles',
      value: kpis.obstaclesSites ?? kpis.obstaclesCount ?? 0,
      subValue: `${((((kpis.obstaclesSites ?? kpis.obstaclesCount ?? 0)) / total) * 100).toFixed(1)}% من الإجمالي`,
      icon: AlertTriangle,
      color: 'from-red-600 to-rose-800',
      textColor: 'text-red-700',
      bgColor: 'bg-red-50/80',
      borderColor: 'border-red-200',
      ringColor: 'ring-red-500',
      filterTarget: 'معوقات',
      isActive: activeList.includes('معوقات'),
    },
  ];

  return (
    <div className="mb-6">
      {/* Active Multi-Select Summary Banner */}
      {activeList.length > 1 && (
        <div className="mb-2.5 px-3 py-1.5 bg-gradient-to-r from-indigo-50 via-sky-50 to-blue-50 border border-indigo-200/90 rounded-xl flex items-center justify-between text-xs text-indigo-950 font-bold shadow-2xs flex-wrap gap-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 flex-wrap">
            <CheckSquare className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span>تحديد متعدد نشط ({activeList.length} تصنيفات):</span>
            <div className="flex items-center gap-1 flex-wrap">
              {activeList.map((st) => (
                <span
                  key={st}
                  className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-2xs"
                >
                  {st}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => (onClearStatusFilters ? onClearStatusFilters() : onSelectStatusFilter('All'))}
            className="text-[11px] text-rose-700 hover:text-rose-900 bg-white hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 flex items-center gap-1 font-bold cursor-pointer transition"
          >
            <RotateCcw className="w-3 h-3 text-rose-600" />
            <span>إلغاء التحديد وعرض الجميع</span>
          </button>
        </div>
      )}

      {/* Grid of Status KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5">
        {cards.map((card) => {
          const IconComponent = card.icon;
          const isClickable = Boolean(card.filterTarget);

          return (
            <div
              key={card.id}
              id={card.id}
              onClick={() => {
                if (card.filterTarget) {
                  onSelectStatusFilter(card.filterTarget);
                }
              }}
              title={
                card.filterTarget === 'All'
                  ? 'عرض إجمالي كافة المواقع وإلغاء أي تصفية'
                  : `انقر لتحديد أو إلغاء تحديد ${card.title} (يدعم التحديد المتعدد)`
              }
              className={`pbi-card p-3 flex flex-col justify-between relative overflow-hidden transition-all duration-200 select-none cursor-pointer ${card.bgColor
                } ${card.borderColor} ${isClickable ? 'hover:-translate-y-0.5' : ''} ${card.isActive && card.filterTarget !== 'All'
                  ? 'ring-2 ring-offset-1 ' + card.ringColor + ' shadow-md scale-[1.02] border-indigo-400'
                  : card.isActive && card.filterTarget === 'All'
                    ? 'ring-2 ring-offset-1 ring-blue-500 shadow-xs'
                    : 'opacity-85 hover:opacity-100 hover:shadow-xs'
                }`}
            >
              {/* Top decorative gradient bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.color}`} />

              <div className="flex items-start justify-between gap-1 mb-1.5">
                <div className="min-w-0">
                  <span className="text-[10px] font-medium text-slate-500 block truncate leading-tight">
                    {card.titleEn}
                  </span>
                  <h3 className="text-xs font-bold text-slate-800 tracking-tight truncate leading-snug">
                    {card.title}
                  </h3>
                </div>
                <div
                  className={`w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center bg-white shadow-2xs border border-slate-100 ${card.textColor}`}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="mt-1">
                <div className="flex items-baseline justify-between gap-1">
                  <span className={`text-xl sm:text-2xl font-black font-sans tracking-tight ${card.textColor}`}>
                    {card.value.toLocaleString()}
                  </span>
                  {card.filterTarget && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full transition-colors ${card.isActive && card.filterTarget !== 'All'
                          ? 'bg-slate-900 text-white'
                          : card.isActive && card.filterTarget === 'All'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/80 text-slate-500'
                        }`}
                    >
                      {card.isActive && card.filterTarget !== 'All' ? '✓ محدد' : card.filterTarget === 'All' ? 'الكل' : 'اختيار'}
                    </span>
                  )}
                </div>
                <p
                  className="text-[10px] text-slate-500 mt-0.5 font-medium truncate"
                  title={card.subValue}
                >
                  {card.subValue}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
