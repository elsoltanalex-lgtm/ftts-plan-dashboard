import React, { useMemo } from 'react';
import {
  Landmark,
  CheckCircle2,
  Zap,
  Award,
  RotateCcw,
  CheckSquare,
} from 'lucide-react';
import { toFilterArray } from '../utils/filterUtils';

export interface TahawolKpiCardsProps {
  totalSites?: number;
  externalDone?: number;
  internalDone?: number;
  delivered?: number;
  pausedOnClient?: number;
  blockedCount?: number;
  blocked?: number;
  activeStatusFilter: string | string[];
  onSelectStatusFilter: (status: string) => void;
  onClearStatusFilters?: () => void;
}

export const TahawolKpiCards: React.FC<TahawolKpiCardsProps> = ({
  totalSites = 0,
  externalDone = 0,
  internalDone = 0,
  delivered = 0,
  pausedOnClient = 0,
  blockedCount,
  blocked,
  activeStatusFilter,
  onSelectStatusFilter,
  onClearStatusFilters,
}) => {
  const safeTotalSites = Number(totalSites) || 0;
  const safeExternalDone = Number(externalDone) || 0;
  const safeInternalDone = Number(internalDone) || 0;
  const safeDelivered = Number(delivered) || 0;
  const safePausedOnClient = Number(pausedOnClient) || 0;
  const safeBlockedCount = Number(blockedCount ?? blocked) || 0;
  const total = safeTotalSites || 1;
  const activeList = useMemo(() => toFilterArray(activeStatusFilter), [activeStatusFilter]);
  const isAllActive = activeList.length === 0 || activeList.includes('All');

  const cards = [
    {
      id: 'tahawol-kpi-total',
      title: 'إجمالي مواقع التحول الرقمي',
      titleEn: 'Total Digital Transformation Sites',
      value: safeTotalSites,
      subValue: `${safeTotalSites.toLocaleString()} موقع حكومي معتمد`,
      extraFooter: `معوقات / متعذرات: ${safeBlockedCount.toLocaleString()} موقع`,
      icon: Landmark,
      color: 'from-amber-600 via-orange-600 to-amber-700',
      textColor: 'text-amber-800',
      bgColor: 'bg-amber-50/70',
      borderColor: 'border-amber-200',
      ringColor: 'ring-amber-500',
      filterTarget: 'All',
      isActive: isAllActive,
    },
    {
      id: 'tahawol-kpi-external-done',
      title: 'تم التنفيذ خارجي',
      titleEn: 'External Path Completed',
      value: safeExternalDone,
      subValue: `${((safeExternalDone / total) * 100).toFixed(1)}% من الإجمالي`,
      icon: Zap,
      color: 'from-cyan-500 to-teal-600',
      textColor: 'text-cyan-700',
      bgColor: 'bg-cyan-50/80',
      borderColor: 'border-cyan-200',
      ringColor: 'ring-cyan-500',
      filterTarget: 'تم التنفيذ خارجي',
      isActive: activeList.includes('تم التنفيذ خارجي'),
    },
    {
      id: 'tahawol-kpi-internal-done',
      title: 'تم التنفيذ داخلي',
      titleEn: 'Internal Path Completed',
      value: safeInternalDone,
      subValue: `${((safeInternalDone / total) * 100).toFixed(1)}% من الإجمالي`,
      icon: CheckCircle2,
      color: 'from-emerald-500 to-green-600',
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50/80',
      borderColor: 'border-emerald-200',
      ringColor: 'ring-emerald-500',
      filterTarget: 'تم التنفيذ داخلي',
      isActive: activeList.includes('تم التنفيذ داخلي'),
    },
    {
      id: 'tahawol-kpi-delivered',
      title: 'تم التسليم / الموقف العام',
      titleEn: 'Delivered & General Status',
      value: safeDelivered,
      subValue: `${((safeDelivered / total) * 100).toFixed(1)}% من الإجمالي`,
      extraFooter: `متوقف على العميل: ${safePausedOnClient.toLocaleString()} موقع`,
      icon: Award,
      color: 'from-purple-500 to-indigo-600',
      textColor: 'text-purple-700',
      bgColor: 'bg-purple-50/80',
      borderColor: 'border-purple-200',
      ringColor: 'ring-purple-500',
      filterTarget: 'تم التسليم تحول',
      isActive: activeList.includes('تم التسليم تحول'),
    },
  ];

  return (
    <div className="mb-6">
      {activeList.length > 0 && !isAllActive && (
        <div className="mb-2.5 px-3 py-1.5 bg-gradient-to-r from-amber-50 via-orange-50 to-indigo-50 border border-amber-200/90 rounded-xl flex items-center justify-between text-xs text-amber-950 font-bold shadow-2xs flex-wrap gap-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 flex-wrap">
            <CheckSquare className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>تصفية التحول الرقمي النشطة:</span>
            <div className="flex items-center gap-1 flex-wrap">
              {activeList.map((st) => (
                <span
                  key={st}
                  className="bg-amber-700 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-2xs"
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
            <span>إلغاء التحديد وعرض كافة مواقع التحول الرقمي</span>
          </button>
        </div>
      )}

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
                  ? 'عرض إجمالي كافة مواقع التحول الرقمي'
                  : `تصفية حسب: ${card.title}`
              }
              className={`pbi-card p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-200 select-none cursor-pointer ${
                card.bgColor
              } ${card.borderColor} hover:-translate-y-0.5 ${
                card.isActive && card.filterTarget !== 'All'
                  ? 'ring-2 ring-offset-2 ' + card.ringColor + ' shadow-md scale-[1.02] border-amber-500'
                  : card.isActive && card.filterTarget === 'All'
                    ? 'ring-2 ring-offset-1 ring-amber-500 shadow-xs'
                    : 'opacity-95 hover:opacity-100 hover:shadow-xs'
              }`}
            >
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
                          ? 'bg-amber-600 text-white'
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
                  <div className="mt-2 pt-1.5 border-t border-slate-200/80 flex items-center justify-between gap-1.5 text-[11px] font-bold text-amber-900 bg-white/80 px-2 py-1 rounded-lg border border-amber-200/70">
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
