import React, { useState, useRef, useEffect } from 'react';
import {
  Radio,
  Globe,
  Sparkles,
  Building2,
  Mail,
  ChevronDown,
  Check,
  FileSpreadsheet,
  Clock,
  Layers,
  ArrowRight,
  Filter,
  Landmark,
} from 'lucide-react';
import type { CompanyType } from '../types/dashboard';

export type ActiveProjectScope = 'FTTS' | 'AVAILABILITY' | 'ETAHA' | 'TAHAWOL' | 'POST' | 'COMMUNITIES' | 'UPLOADED';

export interface TopNavBarStats {
  allCount: number;
  allLinks: number;
  weCount: number;
  weLinks: number;
  vodafoneCount: number;
  vodafoneLinks: number;
  orangeCount: number;
  orangeLinks: number;
  etahaCount?: number;
}

interface TopNavBarProps {
  activeScope: ActiveProjectScope;
  onChangeScope: (scope: ActiveProjectScope) => void;
  selectedCompany: CompanyType;
  onChangeCompany: (company: CompanyType) => void;
  selectedSector?: string;
  onChangeSector?: (sector: string) => void;
  onShowToast: (message: string, subtitle?: string) => void;
  stats: TopNavBarStats;
  hasUploadedFile?: boolean;
  uploadedFileName?: string;
  onSelectUploaded?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  activeScope,
  onChangeScope,
  selectedCompany,
  onChangeCompany,
  selectedSector = '',
  onChangeSector,
  onShowToast,
  stats,
  hasUploadedFile,
  uploadedFileName,
  onSelectUploaded,
}) => {
  const [isFttsDropdownOpen, setIsFttsDropdownOpen] = useState(false);
  const [isAvailabilityDropdownOpen, setIsAvailabilityDropdownOpen] = useState(false);

  const fttsRef = useRef<HTMLDivElement>(null);
  const availabilityRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fttsRef.current && !fttsRef.current.contains(event.target as Node)) {
        setIsFttsDropdownOpen(false);
      }
      if (availabilityRef.current && !availabilityRef.current.contains(event.target as Node)) {
        setIsAvailabilityDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFttsDropdownOpen(false);
        setIsAvailabilityDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Handle FTTS Section Click
  const handleSelectFtts = () => {
    onChangeScope('FTTS');
  };

  // Handle Availability Section Click -> Activate 1. الإتاحة by default
  const handleSelectAvailability = () => {
    onChangeScope('ETAHA');
  };

  // Handle FTTS Sub-operator selection (from Dropdown or Card)
  const handleSelectOperator = (operator: CompanyType) => {
    if (activeScope !== 'FTTS') {
      onChangeScope('FTTS');
    }
    onChangeCompany(operator);
    setIsFttsDropdownOpen(false);
  };

  // Handle Availability Sub-Navigation selection
  const handleSelectAvailabilitySubTab = (scope: ActiveProjectScope) => {
    onChangeScope(scope);
    setIsAvailabilityDropdownOpen(false);
  };

  const isFttsActive = activeScope === 'FTTS';
  const isAvailabilityActive =
    activeScope === 'AVAILABILITY' ||
    activeScope === 'ETAHA' ||
    activeScope === 'TAHAWOL' ||
    activeScope === 'POST' ||
    activeScope === 'COMMUNITIES';

  // Sub-items for FTTS Plan
  const fttsOperators = [
    {
      id: 'All' as CompanyType,
      name: 'All Operators',
      arSubtitle: 'جميع المشغلين',
      sites: stats.allCount,
      links: stats.allLinks,
      brandColor: 'bg-slate-700',
      activeGradient:
        'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-md ring-2 ring-slate-800/30 border-slate-700',
      badgeDot: 'bg-blue-500',
    },
    {
      id: 'WE' as CompanyType,
      name: 'WE',
      arSubtitle: 'المصرية للاتصالات',
      sites: stats.weCount,
      links: stats.weLinks,
      brandColor: 'bg-purple-600',
      activeGradient:
        'bg-gradient-to-r from-purple-700 via-indigo-800 to-purple-900 text-white shadow-md ring-2 ring-purple-500/30 border-purple-600',
      badgeDot: 'bg-purple-500',
    },
    {
      id: 'Vodafone' as CompanyType,
      name: 'Vodafone',
      arSubtitle: 'فودافون مصر',
      sites: stats.vodafoneCount,
      links: stats.vodafoneLinks,
      brandColor: 'bg-rose-600',
      activeGradient:
        'bg-gradient-to-r from-rose-600 to-red-800 text-white shadow-md ring-2 ring-rose-500/30 border-rose-600',
      badgeDot: 'bg-red-500',
    },
    {
      id: 'Orange' as CompanyType,
      name: 'Orange',
      arSubtitle: 'أورنج مصر',
      sites: stats.orangeCount,
      links: stats.orangeLinks,
      brandColor: 'bg-orange-500',
      activeGradient:
        'bg-gradient-to-r from-orange-500 to-amber-700 text-white shadow-md ring-2 ring-orange-500/30 border-orange-500',
      badgeDot: 'bg-orange-500',
    },
  ];

  // The 3 Sub-navigation Tabs under "الإتاحة":
  // 1. الإتاحة (Availability) - Linked exclusively to the 360 sites Excel sheet
  // 2. Digital Transformation
  // 3. Egypt Post
  const availabilitySubTabs = [
    {
      id: 'ETAHA' as ActiveProjectScope,
      name: 'الإتاحة',
      nameEn: 'Availability',
      arSubtitle: 'مشروعات الإتاحة المعتمدة (الشيت المرفوع)',
      icon: Globe,
      count: stats.etahaCount || 360,
      countLabel: 'مشروع معتمد',
      badge: 'شيت الإتاحة المرفوع ✅',
      activeGradient:
        'bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 text-white shadow-md ring-2 ring-emerald-500/30 border-teal-600',
      brandDot: 'bg-emerald-400',
    },
    {
      id: 'TAHAWOL' as ActiveProjectScope,
      name: 'Digital Transformation',
      nameEn: '',
      arSubtitle: 'مشروعات الوزارات والهيئات الحكومية',
      icon: Landmark,
      count: 0,
      countLabel: 'مهيأ لاستقبال البيانات',
      badge: 'مهيأ للربط ⏳',
      activeGradient:
        'bg-gradient-to-r from-amber-700 via-orange-700 to-amber-800 text-white shadow-md ring-2 ring-amber-500/30 border-amber-600',
      brandDot: 'bg-amber-400',
    },
    {
      id: 'POST' as ActiveProjectScope,
      name: 'Egypt Post',
      nameEn: '',
      arSubtitle: 'فروع ومكاتب البريد',
      icon: Mail,
      count: 0,
      countLabel: 'مهيأ لاستقبال البيانات',
      badge: 'مهيأ للربط ⏳',
      activeGradient:
        'bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 text-white shadow-md ring-2 ring-indigo-500/30 border-indigo-600',
      brandDot: 'bg-indigo-400',
    },
  ];

  return (
    <div className="mb-6 space-y-3">
      {/* 1. Main Top Navigation Bar Container */}
      <div className="pbi-card p-2 sm:p-3 bg-white/95 backdrop-blur-sm shadow-sm border border-slate-200/90 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2.5 mb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5">
                <span>Top Navigation Bar</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                  Power BI Central
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                National Projects & Telecommunications Infrastructure
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              Active Section:
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              <span className={`w-2 h-2 rounded-full ${isFttsActive ? 'bg-blue-600' : 'bg-emerald-600'}`} />
              {isFttsActive ? 'FTTS Plan' : 'Availability'}
            </span>
          </div>
        </div>

        {/* Primary Sections Row (FTTS Plan & Availability) with Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
          {/* Section 1: FTTS Plan */}
          <div ref={fttsRef} className="relative">
            <div
              className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer ${isFttsActive
                ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white shadow-md ring-2 ring-blue-500/30 border-blue-600'
                : 'bg-slate-50/90 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              onClick={handleSelectFtts}
            >
              {/* Left Content */}
              <div className="flex items-center gap-3 text-left flex-1 min-w-0">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isFttsActive
                    ? 'bg-white/15 text-white'
                    : 'bg-white text-blue-600 shadow-2xs border border-slate-200'
                    }`}
                >
                  <Radio className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm sm:text-base leading-tight tracking-tight">
                      FTTS Plan
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isFttsActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                        }`}
                    >
                      {stats.allCount.toLocaleString()} Sites
                    </span>
                  </div>
                  <span
                    className={`text-[11px] block mt-0.5 truncate ${isFttsActive ? 'text-blue-100' : 'text-slate-400'
                      }`}
                  >
                    All Operators, WE, Vodafone, Orange
                  </span>
                </div>
              </div>

              {/* Interactive Dropdown Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFttsDropdownOpen((prev) => !prev);
                  setIsAvailabilityDropdownOpen(false);
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ml-2 ${isFttsActive
                  ? 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
                  : 'bg-white hover:bg-slate-200/80 text-slate-600 border border-slate-200 shadow-2xs'
                  }`}
                title="Open FTTS Operators Dropdown"
              >
                <span className="hidden sm:inline text-[11px]">Operators (4)</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${isFttsDropdownOpen ? 'rotate-180' : ''
                    }`}
                />
              </button>
            </div>

            {/* Dropdown Menu for FTTS Plan */}
            {isFttsDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-slate-200/90 rounded-2xl shadow-2xl p-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 border-b border-slate-100 mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Filter className="w-3 h-3 text-blue-600" />
                    FTTS Operators
                  </span>
                  <span className="text-[10px] text-slate-400">Click to filter dashboard</span>
                </div>
                <div className="space-y-1">
                  {fttsOperators.map((op) => {
                    const isSelected = selectedCompany === op.id && isFttsActive;
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => handleSelectOperator(op.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${isSelected
                          ? 'bg-blue-50/90 text-blue-900 border border-blue-200 font-bold'
                          : 'hover:bg-slate-50 text-slate-700 font-medium'
                          }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${op.badgeDot}`} />
                          <div>
                            <span className="text-xs sm:text-sm font-bold block">{op.name}</span>
                            <span className="text-[10px] text-slate-400 block">{op.arSubtitle}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                            {op.sites.toLocaleString()} Sites
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Availability (الإتاحة) */}
          <div ref={availabilityRef} className="relative">
            <div
              className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer ${isAvailabilityActive
                ? 'bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 text-white shadow-md ring-2 ring-emerald-500/30 border-teal-600'
                : 'bg-slate-50/90 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              onClick={handleSelectAvailability}
            >
              {/* Left Content */}
              <div className="flex items-center gap-3 text-left flex-1 min-w-0">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isAvailabilityActive
                    ? 'bg-white/15 text-white'
                    : 'bg-white text-emerald-600 shadow-2xs border border-slate-200'
                    }`}
                >
                  <Globe className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm sm:text-base leading-tight tracking-tight">
                      الإتاحة
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${isAvailabilityActive
                        ? 'bg-white/20 text-white'
                        : 'bg-emerald-100 text-emerald-800'
                        }`}
                    >
                      {(stats.etahaCount || 360).toLocaleString()} Projects
                    </span>
                  </div>
                  <span
                    className={`text-[11px] block mt-0.5 truncate ${isAvailabilityActive ? 'text-teal-100' : 'text-slate-400'
                      }`}
                  >
                    الإتاحة • Digital Transformation • Egypt Post
                  </span>
                </div>
              </div>

              {/* Interactive Dropdown Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAvailabilityDropdownOpen((prev) => !prev);
                  setIsFttsDropdownOpen(false);
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ml-2 ${isAvailabilityActive
                  ? 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
                  : 'bg-white hover:bg-slate-200/80 text-slate-600 border border-slate-200 shadow-2xs'
                  }`}
                title="فتح قائمة الأقسام الفرعية للإتاحة"
              >
                <span className="hidden sm:inline text-[11px]">الأقسام (3)</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${isAvailabilityDropdownOpen ? 'rotate-180' : ''
                    }`}
                />
              </button>
            </div>

            {/* Dropdown Menu for Availability Sub-Navigation */}
            {isAvailabilityDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-slate-200/90 rounded-2xl shadow-2xl p-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 border-b border-slate-100 mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-emerald-600" />
                    أقسام منظومة الإتاحة
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    3 خيارات فرعية
                  </span>
                </div>
                <div className="space-y-1">
                  {availabilitySubTabs.map((subTab) => {
                    const isSelected =
                      (subTab.id === 'ETAHA' && (activeScope === 'ETAHA' || activeScope === 'AVAILABILITY')) ||
                      activeScope === subTab.id;
                    const Icon = subTab.icon;
                    return (
                      <button
                        key={subTab.id}
                        type="button"
                        onClick={() => handleSelectAvailabilitySubTab(subTab.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${isSelected
                          ? 'bg-teal-50/90 text-teal-900 border border-teal-200 font-bold'
                          : 'hover:bg-slate-50 text-slate-700 font-medium'
                          }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs sm:text-sm font-bold block">{subTab.name}</span>
                            {subTab.nameEn ? <span className="text-[10px] text-slate-400 block">{subTab.nameEn}</span> : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                            {subTab.id === 'ETAHA' ? `${subTab.count} موقع` : subTab.countLabel}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-teal-600" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Custom Uploaded Excel File Pill (if uploaded) */}
        {hasUploadedFile && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={onSelectUploaded}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeScope === 'UPLOADED'
                ? 'bg-purple-700 text-white shadow-sm'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Custom Uploaded File:</span>
              <span className="font-mono text-[11px] underline truncate max-w-[200px]">
                {uploadedFileName || 'Uploaded Dataset'}
              </span>
            </button>
            <span className="text-[10px] text-slate-400">Custom dynamic Excel analysis</span>
          </div>
        )}
      </div>

      {/* 2. Direct Sub-Options Row / Distinctive Power BI Cards (Under Chosen Section) */}
      <div>
        {isFttsActive ? (
          /* FTTS Plan Sub-Options: All Operators, WE, Vodafone, Orange */
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                FTTS Mobile Operators (انقر لاختيار المشغل وتصفية البيانات الميدانية):
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                4 Operators Available
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {fttsOperators.map((op) => {
                const isSelected = selectedCompany === op.id;

                return (
                  <button
                    key={op.id}
                    type="button"
                    id={`btn-operator-${op.id.toLowerCase()}`}
                    onClick={() => handleSelectOperator(op.id)}
                    className={`relative p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer group flex flex-col justify-between ${isSelected
                      ? op.activeGradient
                      : 'bg-white hover:bg-slate-50/90 border-slate-200/90 text-slate-700 shadow-xs hover:shadow-sm'
                      }`}
                  >
                    {/* Top Row: Icon, Title, and Brand dot */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-3 h-3 rounded-full ${op.badgeDot} flex-shrink-0 shadow-xs`} />
                        <div className="truncate">
                          <h3 className="font-black text-sm sm:text-base leading-tight tracking-tight truncate">
                            {op.name}
                          </h3>
                          <span
                            className={`text-[10px] font-semibold block mt-0.5 truncate ${isSelected ? 'text-white/80' : 'text-slate-400'
                              }`}
                          >
                            {op.arSubtitle}
                          </span>
                        </div>
                      </div>

                      {/* Active Checkmark or Filter Badge */}
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      ) : (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          Filter
                        </span>
                      )}
                    </div>

                    {/* Bottom Row: Sites & Links Counts */}
                    <div className="pt-2 border-t border-slate-100/30 flex items-end justify-between">
                      <div>
                        <span
                          className={`text-[10px] block font-medium ${isSelected ? 'text-white/70' : 'text-slate-400'
                            }`}
                        >
                          Total Sites
                        </span>
                        <span className="font-mono text-base sm:text-lg font-black tracking-tight leading-none">
                          {op.sites.toLocaleString()}
                        </span>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-[10px] block font-medium ${isSelected ? 'text-white/70' : 'text-slate-400'
                            }`}
                        >
                          Network Links
                        </span>
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md inline-block ${isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-700'
                            }`}
                        >
                          {op.links.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Availability Sub-Navigation: 3 Sub-Tabs in exact order: 1. الإتاحة, 2. التحول الرقمي, 3. البريد */
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                القائمة الفرعية لمنظومة الإتاحة (انقر للتبديل بين الأقسام):
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                3 خيارات فرعية
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {availabilitySubTabs.map((subTab) => {
                const isSelected =
                  (subTab.id === 'ETAHA' && (activeScope === 'ETAHA' || activeScope === 'AVAILABILITY')) ||
                  activeScope === subTab.id;
                const Icon = subTab.icon;

                return (
                  <button
                    key={subTab.id}
                    type="button"
                    id={`btn-availability-sub-${subTab.id.toLowerCase()}`}
                    onClick={() => {
                      onChangeScope(subTab.id);
                      setIsAvailabilityDropdownOpen(false);
                    }}
                    className={`relative p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer group flex flex-col justify-between ${isSelected
                      ? subTab.activeGradient
                      : 'bg-white hover:bg-slate-50/90 border-slate-200/90 text-slate-700 shadow-xs hover:shadow-sm'
                      }`}
                  >
                    {/* Top Row: Icon, Title, and Brand dot */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-700 group-hover:bg-teal-50 group-hover:text-teal-700'
                            }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="truncate">
                          <h3 className="font-black text-sm sm:text-base leading-tight tracking-tight truncate">
                            {subTab.name}
                          </h3>
                          {subTab.nameEn ? (
                            <span
                              className={`text-[10px] font-semibold block mt-0.5 truncate ${isSelected ? 'text-white/80' : 'text-slate-400'
                                }`}
                            >
                              {subTab.nameEn}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Active Checkmark or Filter Badge */}
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          عرض
                        </span>
                      )}
                    </div>

                    <p
                      className={`text-xs mb-3 font-medium ${isSelected ? 'text-white/90' : 'text-slate-500'
                        }`}
                    >
                      {subTab.arSubtitle}
                    </p>

                    {/* Bottom Row: Count & Badge */}
                    <div className="pt-2 border-t border-slate-100/30 flex items-center justify-between">
                      <div>
                        {subTab.id === 'ETAHA' ? (
                          <>
                            <span
                              className={`text-[10px] block font-medium ${isSelected ? 'text-white/70' : 'text-slate-400'
                                }`}
                            >
                              إجمالي مشروعات الإكسيل
                            </span>
                            <span className="font-mono text-base sm:text-lg font-black tracking-tight leading-none">
                              {(stats.etahaCount || 360).toLocaleString()} موقع
                            </span>
                          </>
                        ) : (
                          <span
                            className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-600'
                              }`}
                          >
                            {subTab.countLabel}
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected
                          ? 'bg-white/20 text-white border border-white/30'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                      >
                        {subTab.badge}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
