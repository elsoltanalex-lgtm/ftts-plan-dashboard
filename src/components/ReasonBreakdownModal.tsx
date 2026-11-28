// src/components/ReasonBreakdownModal.tsx
// Interactive drill-down breakdown modal for "متعذر" (Unfeasible) and "معوقات" (Obstacles)
// Groups exact matching sites by reason, sorted highest-to-lowest, with click-to-view site list.

import React, { useMemo, useState } from 'react';
import {
  X,
  AlertTriangle,
  Ban,
  Search,
  ChevronLeft,
  Eye,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import type { SiteRecord } from '../types/dashboard';
import { buildReasonBreakdown } from '../utils/reasonBreakdown';

interface ReasonBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  sites: SiteRecord[];
  statusLabel: string;
  operatorLabel: string;
  activeSectorLabel?: string;
  onSelectReasonSites: (reasonLabel: string, reasonSites: SiteRecord[]) => void;
  onViewAllCategorySites: (allCategorySites: SiteRecord[]) => void;
}

export const ReasonBreakdownModal: React.FC<ReasonBreakdownModalProps> = ({
  isOpen,
  onClose,
  sites,
  statusLabel,
  operatorLabel,
  activeSectorLabel,
  onSelectReasonSites,
  onViewAllCategorySites,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const breakdown = useMemo(
    () => buildReasonBreakdown(sites, statusLabel),
    [sites, statusLabel]
  );

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return breakdown.items;
    return breakdown.items.filter((item) => item.reason.toLowerCase().includes(q));
  }, [breakdown.items, searchTerm]);

  const allCategorySites = useMemo(
    () => breakdown.items.flatMap((i) => i.sites),
    [breakdown.items]
  );

  if (!isOpen) return null;

  const isObstacles = breakdown.kind === 'obstacles';
  const maxItemCount = Math.max(...breakdown.items.map((i) => i.count), 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl border w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 ${
          isObstacles ? 'border-amber-200' : 'border-rose-200'
        }`}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div
          className={`text-white p-4 sm:p-5 flex items-center justify-between gap-3 ${
            isObstacles
              ? 'bg-gradient-to-l from-amber-600 via-orange-600 to-amber-700'
              : 'bg-gradient-to-l from-rose-700 via-red-700 to-rose-800'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center ring-1 ring-white/25 shrink-0">
              {isObstacles ? (
                <AlertTriangle className="w-5 h-5 text-amber-100" />
              ) : (
                <Ban className="w-5 h-5 text-rose-100" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black leading-tight">
                  {isObstacles
                    ? `تفصيل أسباب المعوقات — ${statusLabel}`
                    : `تفصيل أسباب التعذر — ${statusLabel}`}
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 border border-white/25">
                  {operatorLabel}
                </span>
                {activeSectorLabel && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-black/20 border border-white/20 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    <span>{activeSectorLabel}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-white/85 mt-1">
                حصر وتصنيف المواقع حسب السبب التفصيلي • اضغط على أي سبب لاستعراض قائمة المواقع وتعديلها
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-center bg-white/15 border border-white/25 rounded-xl px-3 py-1.5">
              <div className="text-[10px] text-white/80 font-semibold leading-none">الإجمالي</div>
              <div className="text-lg font-mono font-black leading-tight">{breakdown.totalCount}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Quick Action Bar */}
        <div className="px-4 sm:px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث داخل الأسباب التفصيلية..."
              className="w-full pr-9 pl-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
            />
          </div>

          <button
            type="button"
            onClick={() => onViewAllCategorySites(allCategorySites)}
            className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer shadow-2xs shrink-0 ${
              isObstacles
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>عرض كل المواقع ({breakdown.totalCount})</span>
          </button>
        </div>

        {/* Breakdown List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
          {filteredItems.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              لا توجد أسباب مطابقة للبحث.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const barPct = Math.max(4, Math.round((item.count / maxItemCount) * 100));
              return (
                <button
                  key={`${item.reason}-${idx}`}
                  type="button"
                  onClick={() => onSelectReasonSites(item.reason, item.sites)}
                  className={`w-full text-right p-3 sm:p-3.5 rounded-xl border bg-white transition-all duration-150 group cursor-pointer flex items-center justify-between gap-3 ${
                    isObstacles
                      ? 'border-slate-200 hover:border-amber-400 hover:bg-amber-50/50'
                      : 'border-slate-200 hover:border-rose-400 hover:bg-rose-50/50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md shrink-0 ${
                          isObstacles
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-800 leading-snug break-words">
                        {item.reason}
                      </span>
                    </div>

                    {/* Proportional Bar */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isObstacles ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Count, Percentage & Drill-down Arrow */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-left">
                      <div
                        className={`font-mono font-black text-base leading-none ${
                          isObstacles ? 'text-amber-700' : 'text-rose-700'
                        }`}
                      >
                        {item.count}
                        <span className="text-[10px] font-sans font-semibold text-slate-500 mr-1">
                          موقع
                        </span>
                      </div>
                      <div className="text-[11px] font-mono font-bold text-slate-400 mt-0.5">
                        {item.percentage}%
                      </div>
                    </div>

                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        isObstacles
                          ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white'
                          : 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Sum Verification */}
        <div className="px-4 sm:px-5 py-3 bg-slate-900 text-white flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">
              إجمالي الأسباب ({breakdown.items.length} تصنيف تفصيلي)
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono font-black">
            <span className="text-sky-300 text-sm">
              {breakdown.items.reduce((s, i) => s + i.count, 0)} موقع
            </span>
            <span className="text-emerald-300 text-xs">100%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReasonBreakdownModal;
