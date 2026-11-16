import React from 'react';
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
} from 'lucide-react';

import type { KpiData } from '../types/dashboard';

interface KpiCardsProps {
  kpis: KpiData;
  activeStatusFilter: string;
  onSelectStatusFilter: (status: string) => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  kpis,
  activeStatusFilter,
  onSelectStatusFilter,
}) => {
  const total = kpis.totalSites || 1;

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
      isActive: activeStatusFilter === 'All' || activeStatusFilter === '',
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
      isActive: activeStatusFilter === 'تم الانتهاء',
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
      isActive: activeStatusFilter === 'تم التشغيل فايبر',
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
      isActive: activeStatusFilter === 'تم مدني',
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
      isActive: activeStatusFilter === 'جاري العمل',
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
      isActive: activeStatusFilter === 'جاري المعاينة',
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
      isActive: activeStatusFilter === 'جاري تصريح',
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
      isActive: activeStatusFilter === 'متعذر',
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
      isActive: activeStatusFilter === 'معوقات',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5 mb-6">
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
            className={`pbi-card p-3 flex flex-col justify-between relative overflow-hidden transition-all duration-200 select-none ${
              card.bgColor
            } ${card.borderColor} ${isClickable ? 'cursor-pointer hover:-translate-y-0.5' : ''} ${
              card.isActive && card.filterTarget !== 'All'
                ? 'ring-2 ring-offset-1 ' + card.ringColor + ' shadow-md scale-[1.02]'
                : card.isActive && card.filterTarget === 'All'
                ? 'ring-2 ring-offset-1 ring-blue-500 shadow-xs'
                : 'opacity-90 hover:opacity-100 hover:shadow-xs'
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
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                      card.isActive && card.filterTarget !== 'All'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white/80 text-slate-500'
                    }`}
                  >
                    {card.isActive && card.filterTarget !== 'All' ? 'محدد' : 'تصفية'}
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
  );
};
