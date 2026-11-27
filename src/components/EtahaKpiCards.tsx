import React, { useMemo } from 'react';
import {
  Layers,
  CheckCircle2,
  Zap,
  Award,
  RotateCcw,
  CheckSquare,
} from 'lucide-react';
import { toFilterArray } from '../utils/filterUtils';

export interface EtahaKpiCardsProps {
  totalSites: number;
  internalDone: number;
  externalDone: number;
  delivered: number;
  bothPathsDone?: number;
  pausedOnClient?: number;
  activeStatusFilter: string | string[];
  onSelectStatusFilter: (status: string) => void;
  onClearStatusFilters?: () => void;
}

export const EtahaKpiCards: React.FC<EtahaKpiCardsProps> = ({
  totalSites,
  internalDone,
  externalDone,
  delivered,
  bothPathsDone,
  pausedOnClient = 0,
  activeStatusFilter,
  onSelectStatusFilter,
  onClearStatusFilters,
}) => {
  const total = totalSites || 1;
  const generalStatusCount = bothPathsDone ?? delivered;
  const activeList = useMemo(() => toFilterArray(activeStatusFilter), [activeStatusFilter]);
  const isAllActive = activeList.length === 0 || activeList.includes('All');

  const cards = [
    {
      id: 'etaha-kpi-total',
      title: 'إجمالي المواقع',
      titleEn: 'Total Sites',
      value: totalSites,
      subValue: `${totalSites} مشروعاً معتمداً بـ Availability`,
      icon: Layers,
      color: 'from-blue-600 via-indigo-600 to-indigo-800',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50/70',
      borderColor: 'border-blue-200',
      ringColor: 'ring-blue-500',
      filterTarget: 'All',
      isActive: isAllActive,
    },
    {
      id: 'etaha-kpi-internal-done',
      title: 'تم الانتهاء داخلي',
      titleEn: 'Internal Completed',
      value: internalDone,
      subValue: `${((internalDone / total) * 100).toFixed(1)}% من الإجمالي`,
      icon: CheckCircle2,
      color: 'from-emerald-500 to-green-600',
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50/80',
      borderColor: 'border-emerald-200',
      ringColor: 'ring-emerald-500',
      filterTarget: 'تم الانتهاء داخلي',
      isActive: activeList.includes('تم الانتهاء داخلي'),
    },
    {
      id: 'etaha-kpi-external-done',
      title: 'تم الانتهاء خارجي',
      titleEn: 'External Completed',
      value: externalDone,
      subValue: `${((externalDone / total) * 100).toFixed(1)}% من الإجمالي`,
      icon: Zap,
      color: 'from-cyan-500 to-teal-600',
      textColor: 'text-cyan-700',
      bgColor: 'bg-cyan-50/80',
      borderColor: 'border-cyan-200',
      ringColor: 'ring-cyan-500',
      filterTarget: 'تم الانتهاء خارجي',
      isActive: activeList.includes('تم الانتهاء خارجي'),
    },
    {
      id: 'etaha-kpi-general-status',
      title: 'الموقف العام',
      titleEn: 'General Status (Internal & External Done)',
      value: generalStatusCount,
      subValue: `${((generalStatusCount / total) * 100).toFixed(1)}% من الإجمالي (تم داخلي + خارجي)`,
      extraFooter: `متوقف على العميل: ${(Number(pausedOnClient) || 0).toLocaleString()} موقع`,
      icon: Award,
      color: 'from-purple-500 to-indigo-600',
      textColor: 'text-purple-700',
      bgColor: 'bg-purple-50/80',
      borderColor: 'border-purple-200',
      ringColor: 'ring-purple-500',
      filterTarget: 'الموقف العام',
      isActive: activeList.includes('الموقف العام'),
    },
  ];

  return (
    <div className="mb-6">
      {/* Active Multi-Select Summary Banner */}
      {activeList.length > 0 && !isAllActive && (
        <div className="mb-2.5 px-3 py-1.5 bg-gradient-to-r from-teal-50 via-sky-50 to-indigo-50 border border-teal-200/90 rounded-xl flex items-center justify-between text-xs text-teal-950 font-bold shadow-2xs flex-wrap gap-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 flex-wrap">
            <CheckSquare className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <span>تصفية Availability النشطة:</span>
            <div className="flex items-center gap-1 flex-wrap">
              {activeList.map((st) => (
                <span
                  key={st}
                  className="bg-teal-700 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-2xs"
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
            <span>إلغاء التحديد وعرض كافة مشاريع Availability</span>
          </button>
        </div>
      )}

      {/* Grid of 4 Dedicated Availability KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((card) => {
          const IconComponent = card.icon;

          return (
            <div
              key={card.id}
              id={card.id}
              onClick={() => onSelectStatusFilter(card.filterTarget)}
              title={
                card.filterTarget === 'All'
                  ? 'عرض إجمالي كافة مشاريع Availability'
                  : `تصفية حسب: ${card.title}`
              }
              className={`pbi-card p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-200 select-none cursor-pointer ${
                card.bgColor
              } ${card.borderColor} hover:-translate-y-0.5 ${
                card.isActive && card.filterTarget !== 'All'
                  ? 'ring-2 ring-offset-2 ' + card.ringColor + ' shadow-md scale-[1.02] border-teal-500'
                  : card.isActive && card.filterTarget === 'All'
                    ? 'ring-2 ring-offset-1 ring-blue-500 shadow-xs'
                    : 'opacity-90 hover:opacity-100 hover:shadow-xs'
              }`}
            >
              {/* Top decorative gradient bar */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${card.color}`} />

              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold text-slate-500 block truncate">
                    {card.titleEn}
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight truncate">
                    {card.title}
                  </h3>
                </div>
                <div
                  className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center bg-white shadow-2xs border border-slate-100 ${card.textColor}`}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`text-2xl sm:text-3xl font-black font-sans tracking-tight ${card.textColor}`}>
                    {(Number(card.value) || 0).toLocaleString()}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                      card.isActive && card.filterTarget !== 'All'
                        ? 'bg-slate-900 text-white'
                        : card.isActive && card.filterTarget === 'All'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/90 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {card.isActive && card.filterTarget !== 'All' ? '✓ محدد' : card.filterTarget === 'All' ? 'الإجمالي' : 'اختيار'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-semibold truncate" title={card.subValue}>
                  {card.subValue}
                </p>
                {'extraFooter' in card && card.extraFooter && (
                  <div className="mt-2 pt-1.5 border-t border-purple-200/80 flex items-center justify-between gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50/80 px-2 py-1 rounded-lg border border-amber-200/70">
                    <span className="truncate">{card.extraFooter}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
