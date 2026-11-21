import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  PlusCircle,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronLeft,
  Settings2,
  Sparkles,
  Radio,
  Layers,
} from 'lucide-react';

export type OperatorType = 'WE' | 'Vodafone' | 'Orange';

export interface SiteActionDropdownProps {
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddByOperator?: (operator: OperatorType) => void;
  onEditByOperator?: (operator: OperatorType) => void;
  onDeleteByOperator?: (operator: OperatorType) => void;
  hasOperatorSubmenus?: boolean;
  variant?: 'orange' | 'vodafone' | 'we' | 'etaha' | 'default';
  label?: string;
  itemTypeLabel?: string; // 'موقع' أو 'مشروع'
  className?: string;
}

export const SiteActionDropdown: React.FC<SiteActionDropdownProps> = ({
  onAdd,
  onEdit,
  onDelete,
  onAddByOperator,
  onEditByOperator,
  onDeleteByOperator,
  hasOperatorSubmenus = false,
  variant = 'default',
  label = 'إدارة وعمليات المواقع',
  itemTypeLabel = 'موقع',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredAction, setHoveredAction] = useState<'add' | 'edit' | 'delete' | null>(null);
  const [activeClickAction, setActiveClickAction] = useState<'add' | 'edit' | 'delete' | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close timer clear
  const clearTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  // Hover handlers with graceful delay buffer (280ms) to prevent accidental closing
  const handleActionMouseEnter = (action: 'add' | 'edit' | 'delete') => {
    if (!hasOperatorSubmenus) return;
    clearTimer();
    setHoveredAction(action);
  };

  const handleActionMouseLeave = () => {
    if (!hasOperatorSubmenus) return;
    clearTimer();
    closeTimerRef.current = setTimeout(() => {
      setHoveredAction(null);
    }, 280);
  };

  const handleSubmenuMouseEnter = () => {
    clearTimer();
  };

  // Close on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHoveredAction(null);
        setActiveClickAction(null);
        clearTimer();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setHoveredAction(null);
        setActiveClickAction(null);
        clearTimer();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      clearTimer();
    };
  }, [isOpen, clearTimer]);

  // Handle operator selection
  const handleSelectOperator = (action: 'add' | 'edit' | 'delete', operator: OperatorType) => {
    setIsOpen(false);
    setHoveredAction(null);
    setActiveClickAction(null);
    clearTimer();

    if (action === 'add') {
      if (onAddByOperator) onAddByOperator(operator);
      else onAdd();
    } else if (action === 'edit') {
      if (onEditByOperator) onEditByOperator(operator);
      else onEdit();
    } else if (action === 'delete') {
      if (onDeleteByOperator) onDeleteByOperator(operator);
      else onDelete();
    }
  };

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

  // Operator metadata for submenus
  const operators: { id: OperatorType; name: string; nameEn: string; color: string; hoverBg: string; border: string; badge: string; count: string }[] = [
    {
      id: 'WE',
      name: 'مواقع WE (المصرية للاتصالات)',
      nameEn: 'WE Telecom Egypt',
      color: 'text-indigo-700',
      hoverBg: 'hover:bg-indigo-50/80',
      border: 'border-indigo-200',
      badge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      count: '1029 موقع',
    },
    {
      id: 'Vodafone',
      name: 'مواقع فودافون (Vodafone)',
      nameEn: 'Vodafone Red',
      color: 'text-rose-700',
      hoverBg: 'hover:bg-rose-50/80',
      border: 'border-rose-200',
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      count: '699 موقع',
    },
    {
      id: 'Orange',
      name: 'مواقع أورانج (Orange)',
      nameEn: 'Orange Egypt',
      color: 'text-orange-700',
      hoverBg: 'hover:bg-orange-50/80',
      border: 'border-orange-200',
      badge: 'bg-orange-100 text-orange-800 border-orange-300',
      count: '480 موقع',
    },
  ];

  // Render Submenu for an action
  const renderSubmenu = (action: 'add' | 'edit' | 'delete') => {
    const isVisible = hoveredAction === action || activeClickAction === action;
    if (!isVisible || !hasOperatorSubmenus) return null;

    const actionTitle = action === 'add' ? 'إضافة موقع جديد لـ' : action === 'edit' ? 'تعديل بيانات موقع لـ' : 'حذف موقع تابع لـ';

    return (
      <div
        onMouseEnter={handleSubmenuMouseEnter}
        onMouseLeave={handleActionMouseLeave}
        className="z-50 w-full sm:w-68 sm:absolute sm:top-0 sm:right-full sm:mr-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 text-right animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5 origin-top-right mt-1 sm:mt-0
          sm:before:absolute sm:before:-right-3 sm:before:top-0 sm:before:w-4 sm:before:h-full sm:before:content-['']"
      >
        <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between mb-1.5 bg-slate-50/60 rounded-xl">
          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
            <Radio className="w-3 h-3 text-sky-600" />
            <span>اختر الشركة ({actionTitle})</span>
          </span>
          <span className="text-[10px] font-mono text-slate-400">3 مشغلين</span>
        </div>

        <div className="space-y-1">
          {operators.map((op) => (
            <button
              key={op.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectOperator(action, op.id);
              }}
              className={`w-full text-right p-2 rounded-xl border border-transparent ${op.hoverBg} hover:${op.border} transition-all flex items-center justify-between group cursor-pointer`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${op.id === 'WE' ? 'bg-indigo-600' : op.id === 'Vodafone' ? 'bg-rose-600' : 'bg-orange-500'}`} />
                <div>
                  <div className={`text-xs font-bold ${op.color} group-hover:underline`}>
                    {op.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {op.count}
                  </div>
                </div>
              </div>
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`relative inline-block text-right ${className}`} ref={dropdownRef}>
      {/* Unified Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setHoveredAction(null);
          setActiveClickAction(null);
        }}
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
        <div className="absolute right-0 z-40 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 text-right animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5 origin-top-right">
          {/* Header */}
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>عمليات وإدارة {itemTypeLabel === 'مشروع' ? 'المشروعات' : 'المواقع'}</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              {hasOperatorSubmenus ? 'اختر المشغل أو العملية' : '3 عمليات متاحة'}
            </span>
          </div>

          <div className="space-y-1">
            {/* 1. Add New Site / Project */}
            <div
              className="relative"
              onMouseEnter={() => handleActionMouseEnter('add')}
              onMouseLeave={handleActionMouseLeave}
            >
              <button
                type="button"
                onClick={(e) => {
                  if (hasOperatorSubmenus) {
                    e.stopPropagation();
                    setActiveClickAction((prev) => (prev === 'add' ? null : 'add'));
                  } else {
                    setIsOpen(false);
                    onAdd();
                  }
                }}
                className={`w-full text-right p-2.5 rounded-xl transition-all flex items-center justify-between cursor-pointer group ${
                  hasOperatorSubmenus && (hoveredAction === 'add' || activeClickAction === 'add')
                    ? 'bg-emerald-100/80 border border-emerald-300'
                    : 'hover:bg-emerald-50/80 active:bg-emerald-100 border border-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 transition-colors">
                      إضافة {itemTypeLabel} جديد
                    </div>
                    <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                      {hasOperatorSubmenus
                        ? 'إضافة موقع لـ WE أو فودافون أو أورانج'
                        : `إدخال وتسجيل ${itemTypeLabel} جديد يدوياً في قاعدة البيانات`}
                    </div>
                  </div>
                </div>

                {hasOperatorSubmenus && (
                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    <span>الشركات</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>

              {/* Submenu for Add */}
              {renderSubmenu('add')}
            </div>

            {/* 2. Edit Site / Project Data */}
            <div
              className="relative"
              onMouseEnter={() => handleActionMouseEnter('edit')}
              onMouseLeave={handleActionMouseLeave}
            >
              <button
                type="button"
                onClick={(e) => {
                  if (hasOperatorSubmenus) {
                    e.stopPropagation();
                    setActiveClickAction((prev) => (prev === 'edit' ? null : 'edit'));
                  } else {
                    setIsOpen(false);
                    onEdit();
                  }
                }}
                className={`w-full text-right p-2.5 rounded-xl transition-all flex items-center justify-between cursor-pointer group ${
                  hasOperatorSubmenus && (hoveredAction === 'edit' || activeClickAction === 'edit')
                    ? 'bg-amber-100/80 border border-amber-300'
                    : 'hover:bg-amber-50/80 active:bg-amber-100 border border-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-2xs">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 group-hover:text-amber-800 transition-colors">
                      تعديل بيانات {itemTypeLabel}
                    </div>
                    <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                      {hasOperatorSubmenus
                        ? 'تعديل مواقع WE أو فودافون أو أورانج'
                        : `تحديث تفاصيل وموقف ${itemTypeLabel} حالي مع حماية الثوابت`}
                    </div>
                  </div>
                </div>

                {hasOperatorSubmenus && (
                  <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                    <span>الشركات</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>

              {/* Submenu for Edit */}
              {renderSubmenu('edit')}
            </div>

            {/* 3. Delete Site / Project */}
            <div
              className="relative"
              onMouseEnter={() => handleActionMouseEnter('delete')}
              onMouseLeave={handleActionMouseLeave}
            >
              <button
                type="button"
                onClick={(e) => {
                  if (hasOperatorSubmenus) {
                    e.stopPropagation();
                    setActiveClickAction((prev) => (prev === 'delete' ? null : 'delete'));
                  } else {
                    setIsOpen(false);
                    onDelete();
                  }
                }}
                className={`w-full text-right p-2.5 rounded-xl transition-all flex items-center justify-between cursor-pointer group ${
                  hasOperatorSubmenus && (hoveredAction === 'delete' || activeClickAction === 'delete')
                    ? 'bg-rose-100/80 border border-rose-300'
                    : 'hover:bg-rose-50/80 active:bg-rose-100 border border-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-2xs">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 group-hover:text-rose-800 transition-colors">
                      إلغاء أو حذف {itemTypeLabel}
                    </div>
                    <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                      {hasOperatorSubmenus
                        ? 'حذف مواقع من WE أو فودافون أو أورانج'
                        : `إلغاء أو حذف ${itemTypeLabel} نهائياً مع رسالة تأكيد الحذف`}
                    </div>
                  </div>
                </div>

                {hasOperatorSubmenus && (
                  <div className="flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                    <span>الشركات</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>

              {/* Submenu for Delete */}
              {renderSubmenu('delete')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
