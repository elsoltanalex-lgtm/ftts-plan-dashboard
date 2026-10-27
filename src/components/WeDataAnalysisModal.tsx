// src/components/WeDataAnalysisModal.tsx
// Executive Modal Container for Detailed WE Analytics & Precision Slicing

import React from 'react';
import { WeDataAnalysis } from './WeDataAnalysis';
import type { SiteRecord } from '../types/dashboard';
import { X, BarChart3 } from 'lucide-react';

interface WeDataAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  weSites: SiteRecord[];
}

export const WeDataAnalysisModal: React.FC<WeDataAnalysisModalProps> = ({ isOpen, onClose, weSites }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-6xl xl:max-w-7xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        dir="rtl"
      >
        {/* Sticky Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>تحليل وتوزيع بيانات شبكة WE</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-200 font-mono">
                  {weSites.length} موقع
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تصفية دقيقة وتحليل إحصائي لمسارات الربط التراسلي ومواقف التنفيذ بالقطاعات والمناطق والسنترالات
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition cursor-pointer border border-slate-200"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 bg-slate-100/30">
          <WeDataAnalysis weSites={weSites} />
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            منظومة متابعة المشروعات القومية للاتصالات • لوحة تحكم WE التراسلية
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
