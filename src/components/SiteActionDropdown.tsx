import React, { useState, useRef, useEffect } from 'react';
import { PlusCircle, Edit3, Trash2, ChevronDown, Settings2, Sparkles } from 'lucide-react';

export interface SiteActionDropdownProps {
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
  variant?: 'orange' | 'vodafone' | 'we' | 'etaha' | 'default';
  label?: string;
  itemTypeLabel?: string; // 'موقع' أو 'مشروع'
  className?: string;
}

export const SiteActionDropdown: React.FC<SiteActionDropdownProps> = ({
  onAdd,
  onEdit,
  onDelete,
  variant = 'default',
  label = 'إدارة وعمليات المواقع',
  itemTypeLabel = 'موقع',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Gradient themes matching each scope/operator
  const themeStyles = {
    orange: {
      btn: 'bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-700 hover:to-amber-700 text-white shadow-orange-500/20 ring-orange-500/30',
      badge: 'bg-orange-950/30 text-amber-200 border-amber-400/30',
    },
    vodafone: {
      btn: 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 text-white shadow-rose-500/20 ring-rose-500/30',
      badge: 'bg-red-950/30 text-rose-200 border-rose-400/30',
    },
    etaha: {
      btn: 'bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 hover:from-teal-800 hover:to-emerald-900 text-white shadow-teal-500/20 ring-teal-500/30',
      badge: 'bg-teal-950/30 text-teal-200 border-teal-400/30',
    },
    we: {
      btn: 'bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white shadow-indigo-500/20 ring-indigo-500/30',
      badge: 'bg-indigo-950/30 text-indigo-200 border-indigo-400/30',
    },
    default: {
      btn: 'bg-gradient-to-r from-indigo-600 via-blue-600 to-slate-800 hover:from-indigo-700 hover:to-slate-900 text-white shadow-indigo-500/20 ring-indigo-500/30',
      badge: 'bg-indigo-950/30 text-indigo-200 border-indigo-400/30',
    },
  }[variant];

  return (
    <div className={`relative inline-block text-right ${className}`} ref={dropdownRef}>
      {/* Unified Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all duration-200 cursor-pointer select-none ring-1 active:scale-95 ${themeStyles.btn}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="فتح قائمة عمليات وإدارة المواقع (إضافة، تعديل، حذف)"
      >
        <Settings2 className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
        <span>{label}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono border ${themeStyles.badge}`}>
          إضافة / تعديل / حذف
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Unified Dropdown Menu Popover */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 text-right animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5 origin-top-right">
          {/* Header */}
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>عمليات وإدارة {itemTypeLabel === 'مشروع' ? 'المشروعات' : 'المواقع'}</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              3 عمليات متاحة
            </span>
          </div>

          <div className="space-y-1">
            {/* 1. Add New Site / Project */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onAdd();
              }}
              className="w-full text-right p-2.5 rounded-xl hover:bg-emerald-50/80 active:bg-emerald-100 transition-colors flex items-start gap-3 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs">
                <PlusCircle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 transition-colors">
                  إضافة {itemTypeLabel} جديد
                </div>
                <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  إدخال وتسجيل {itemTypeLabel} جديد يدوياً في قاعدة البيانات
                </div>
              </div>
            </button>

            {/* 2. Edit Site / Project Data */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onEdit();
              }}
              className="w-full text-right p-2.5 rounded-xl hover:bg-amber-50/80 active:bg-amber-100 transition-colors flex items-start gap-3 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-2xs">
                <Edit3 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-800 group-hover:text-amber-800 transition-colors">
                  تعديل بيانات {itemTypeLabel}
                </div>
                <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  تحديث تفاصيل وموقف {itemTypeLabel} حالي مع حماية الثوابت
                </div>
              </div>
            </button>

            {/* 3. Delete Site / Project */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onDelete();
              }}
              className="w-full text-right p-2.5 rounded-xl hover:bg-rose-50/80 active:bg-rose-100 transition-colors flex items-start gap-3 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-2xs">
                <Trash2 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-800 group-hover:text-rose-800 transition-colors">
                  إلغاء أو حذف {itemTypeLabel}
                </div>
                <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  إلغاء أو حذف {itemTypeLabel} نهائياً مع رسالة تأكيد الحذف
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
