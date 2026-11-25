import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronDown,
  Search,
  X,
  RotateCcw,
  Check,
  CheckSquare,
  Square,
  MapPin,
  Building,
  Briefcase,
  Layers,
  Tag,
  AlertCircle,
  Lock,
  Award,
  Zap,
} from 'lucide-react';
import type { FilterState, SiteRecord } from '../types/dashboard';
import { useAuth } from '../context/AuthContext';
import { isRecordInSector, toCanonicalSector, normalizeSectorName } from '../utils/sectorPermissions';
import {
  normalizeEtahaInternalPath,
  normalizeEtahaDeliveryStatus,
} from '../utils/etahaMetrics';
import {
  SECTORS,
  COMPETENT_ADMINS,
  getSiteClassification,
} from '../data/dashboardData';
import { toFilterArray } from '../utils/filterUtils';
import { normalizeArabicText } from '../utils/etahaMetrics';

interface FiltersProps {
  filters: FilterState;
  onChangeFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onResetFilters: () => void;
  sitesData: SiteRecord[];
  selectedCompany?: string;
  activeScope?: string;
}

interface MultiFilterDropdownProps {
  id: string;
  label: string;
  labelEn: string;
  icon: React.ElementType;
  value: string | string[];
  options: string[];
  onChange: (val: string[]) => void;
  sitesData: SiteRecord[];
  filterKey: keyof SiteRecord;
  disabled?: boolean;
  lockedNote?: string;
}

const MultiFilterDropdown: React.FC<MultiFilterDropdownProps> = ({
  id,
  label,
  labelEn,
  icon: Icon,
  value,
  options,
  onChange,
  sitesData,
  filterKey,
  disabled = false,
  lockedNote,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedList = useMemo(() => toFilterArray(value), [value]);

  const filteredOptions = useMemo(() => {
    return options.filter((opt) =>
      opt.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  // Count items for each option strictly in the current scoped dataset
  const getOptionCount = useCallback((optVal: string) => {
    if (!optVal) return sitesData.length;
    const target = String(optVal).trim();
    const normTarget = normalizeArabicText(target);
    return sitesData.filter((s) => {
      if (filterKey === 'sector') {
        const val = String(s.executionSector || s.rawRecord?.['قطاع التنفيذ'] || s.sector || s.rawRecord?.['رئاسة قطاعات التنفيذ'] || s.rawRecord?.['القطاع'] || s.rawRecord?.['رئاسة القطاعات'] || '').replace(/\s+/g, ' ').trim();
        return val === target || normalizeArabicText(val) === normTarget || isRecordInSector(target, s);
      }
      if (filterKey === 'generalAdmin') {
        const val = String(s.generalAdmin || s.rawRecord?.['الادارة العامة المنفذة'] || s.rawRecord?.['الادارة العامة لتنفيذ الشبكات'] || s.rawRecord?.['الادارة العامة للتنفيذ'] || s.rawRecord?.['الادارة العامة للمنطقة'] || s.rawRecord?.['الإدارة العامة'] || s.rawRecord?.['الإدارة العامة للتنفيذ'] || '').replace(/\s+/g, ' ').trim();
        return val === target || normalizeArabicText(val) === normTarget;
      }
      if (filterKey === 'competentAdmin') {
        const val = String(s.competentAdmin || s.rawRecord?.['ادارة التنفيذ'] || s.rawRecord?.['ادارة التنفيذ الفرعية'] || s.rawRecord?.['إدارة التنفيذ المختصة'] || s.rawRecord?.['المنطقة'] || s.rawRecord?.['إدارة المنطقة'] || '').replace(/\s+/g, ' ').trim();
        return val === target || normalizeArabicText(val) === normTarget;
      }
      if (filterKey === 'responsibility' || (filterKey as string) === 'executionResponsibility') {
        const val = String(s.executionResponsibility || s.responsibility || s.rawRecord?.['مسئوليه التنفيذ'] || s.rawRecord?.['مسؤولية التنفيذ'] || '').replace(/\s+/g, ' ').trim();
        return val === target || normalizeArabicText(val) === normTarget;
      }
      if (filterKey === 'classification') {
        const val = String(s.classification || s.rawRecord?.['التصنيف'] || s.rawRecord?.['التصنيف (مدني)'] || '').trim();
        return val === target || getSiteClassification(s) === target;
      }
      if (filterKey === 'obstacleReason') {
        const val = String(s.obstacleReason || s.rawRecord?.['اسباب التعّذر'] || s.rawRecord?.['اسباب التعذر'] || s.rawRecord?.['نوع المعوق المدني'] || s.rawRecord?.['الملاحظات'] || '').trim();
        return val === target;
      }
      if (filterKey === 'externalPath') {
        const val = String(s.externalPath || s.rawRecord?.['المسار الخارجي'] || '').trim();
        return val === target;
      }
      if (filterKey === 'internalPath') {
        const val = String(s.internalPath || s.rawRecord?.['المسار الداخلى'] || s.rawRecord?.['المسار الداخلي'] || s.rawRecord?.['موقف اللحامات'] || s.rawRecord?.['موقف_اللحامات'] || '').trim();
        return val === target;
      }
      if (filterKey === 'deliveryStatus') {
        const val = String(s.deliveryStatus || s.deliveryArea || s.rawRecord?.['موقف التسليم'] || '').trim();
        return val === target;
      }
      const val = String(s[filterKey] || '').trim();
      return val === target;
    }).length;
  }, [sitesData, filterKey]);

  const isSelected = selectedList.length > 0;

  const toggleOption = (opt: string) => {
    const clean = String(opt).trim();
    if (selectedList.includes(clean)) {
      onChange(selectedList.filter((x) => x !== clean));
    } else {
      onChange([...selectedList, clean]);
    }
  };

  const selectAll = () => {
    const all = Array.from(new Set([...selectedList, ...filteredOptions]));
    onChange(all);
  };

  const clearAll = () => {
    onChange([]);
  };

  // Button title and display summary showing live matching record/site count
  const displayLabel = useMemo(() => {
    if (selectedList.length === 0) return 'الكل (عرض الجميع)';
    if (selectedList.length === 1) {
      const cnt = getOptionCount(selectedList[0]);
      return `${selectedList[0]} (${cnt})`;
    }
    if (selectedList.length === 2) {
      const cnt1 = getOptionCount(selectedList[0]);
      const cnt2 = getOptionCount(selectedList[1]);
      return `${selectedList[0]} (${cnt1}) + ${selectedList[1]} (${cnt2})`;
    }
    const totalSelectedCount = selectedList.reduce((sum, item) => sum + getOptionCount(item), 0);
    return `${selectedList.length} محددة (${totalSelectedCount})`;
  }, [selectedList, getOptionCount]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Label and Header */}
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor={id}
          className="text-xs font-bold text-slate-700 flex items-center gap-1.5 truncate"
        >
          <Icon className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
          <span className="truncate">{label}</span>
          {disabled && (
            <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.2 rounded-full font-bold flex items-center gap-0.5">
              <Lock className="w-2.5 h-2.5" />
              <span>معزول</span>
            </span>
          )}
        </label>
        {isSelected && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearAll();
            }}
            className="text-[10px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-0.5 cursor-pointer"
            title="إلغاء التحديد بالكامل"
          >
            <X className="w-2.5 h-2.5" />
            <span>مسح ({selectedList.length})</span>
          </button>
        )}
      </div>

      {/* Button to toggle dropdown */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        title={disabled ? (lockedNote || 'نطاق مقيد بحسب صلاحيات حسابك') : selectedList.join(' • ')}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl border transition-all text-right shadow-2xs ${disabled
          ? 'bg-slate-100/90 border-slate-300 text-slate-600 font-semibold cursor-not-allowed opacity-90'
          : isSelected
            ? 'bg-sky-50 border-sky-400 text-sky-950 font-bold ring-1 ring-sky-300 cursor-pointer shadow-xs'
            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer'
          }`}
      >
        <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
          {selectedList.length > 1 && (
            <span className="bg-sky-600 text-white text-[10px] font-mono font-black px-1.5 py-0.2 rounded-md shadow-2xs flex-shrink-0">
              {selectedList.length}
            </span>
          )}
          <span className="truncate">{displayLabel}</span>
        </div>
        {disabled ? (
          <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180 text-sky-600' : ''
              }`}
          />
        )}
      </button>

      {/* Dropdown Menu Modal */}
      {isOpen && !disabled && (
        <div className={`absolute z-50 mt-1 w-full sm:w-72 max-w-[92vw] bg-white border border-slate-200 rounded-xl shadow-2xl p-2.5 animate-in fade-in zoom-in-95 duration-150 ${id === 'filter-obstacle-reason' || id === 'filter-etaha-delivery-status' || id === 'filter-orange-area'
          ? 'right-0 lg:right-auto lg:left-0'
          : 'right-0'
          }`}>
          {/* Search box inside dropdown */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute inset-y-0 right-2.5 my-auto text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`بحث وتصفية في ${label}...`}
              className="w-full pr-8 pl-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-700 font-sans"
              autoFocus
            />
          </div>

          {/* Multi-Select Action Helpers */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-[11px]">
            <button
              type="button"
              onClick={selectAll}
              className="text-sky-700 hover:text-sky-900 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <CheckSquare className="w-3 h-3 text-sky-600" />
              <span>تحديد الكل ({filteredOptions.length})</span>
            </button>
            {selectedList.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-rose-600 hover:text-rose-800 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3 text-rose-500" />
                <span>مسح المحدد ({selectedList.length})</span>
              </button>
            )}
          </div>

          {/* Options List with Checkboxes */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5">
            {filteredOptions.map((opt) => {
              const clean = String(opt).trim();
              const isOptionActive = selectedList.includes(clean);
              const count = getOptionCount(clean);

              return (
                <div
                  key={clean}
                  onClick={() => toggleOption(clean)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${isOptionActive
                    ? 'bg-sky-50 text-sky-950 font-bold border border-sky-200/80'
                    : 'hover:bg-slate-100 text-slate-700 border border-transparent'
                    }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {/* Checkbox Box */}
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center transition-colors flex-shrink-0 border ${isOptionActive
                        ? 'bg-sky-600 border-sky-600 text-white shadow-2xs'
                        : 'border-slate-300 bg-white'
                        }`}
                    >
                      {isOptionActive && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate font-medium">
                      {clean} <span className="font-mono text-[11px] font-bold text-slate-400">({count})</span>
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${isOptionActive
                      ? 'bg-sky-200/80 text-sky-900 font-black'
                      : 'bg-slate-100 text-slate-600'
                      }`}
                  >
                    {count}
                  </span>
                </div>
              );
            })}

            {filteredOptions.length === 0 && (
              <div className="text-center py-3 text-xs text-slate-400">
                لا توجد نتائج مطابقة
              </div>
            )}
          </div>

          {/* Bottom Confirm/Done Button */}
          <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-medium">
              تم تحديد {selectedList.length} من أصل {options.length}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[11px] font-bold shadow-2xs cursor-pointer transition"
            >
              تم والتطبيق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const Filters: React.FC<FiltersProps> = ({
  filters,
  onChangeFilter,
  onResetFilters,
  sitesData,
  selectedCompany,
  activeScope,
}) => {
  const { user } = useAuth();
  const isSectorLocked = Boolean(user && user.role !== 'admin' && user.sector !== 'ALL');
  const isEtaha = activeScope === 'ETAHA' || activeScope === 'AVAILABILITY';

  // Base dataset: when specific operator is selected, strictly scope to those sites
  const baseSites = useMemo(() => {
    if (isEtaha) return sitesData;
    const comp = selectedCompany || filters.company;
    if (comp && comp !== 'All') {
      const filtered = sitesData.filter((s) => s.company === comp);
      return filtered.length > 0 ? filtered : sitesData;
    }
    return sitesData;
  }, [sitesData, selectedCompany, filters.company, isEtaha]);

  // Active filters count
  const activeCount = useMemo(() => {
    let count = 0;
    if (isEtaha) {
      if (!isSectorLocked && toFilterArray(filters.sector).length > 0) count += toFilterArray(filters.sector).length;
      if (toFilterArray(filters.generalAdmin).length > 0) count += toFilterArray(filters.generalAdmin).length;
      if (toFilterArray(filters.competentAdmin).length > 0) count += toFilterArray(filters.competentAdmin).length;
      if (toFilterArray(filters.executionResponsibility).length > 0) count += toFilterArray(filters.executionResponsibility).length;
      if (toFilterArray(filters.externalPath).length > 0) count += toFilterArray(filters.externalPath).length;
      if (toFilterArray(filters.internalPath).length > 0) count += toFilterArray(filters.internalPath).length;
      if (toFilterArray(filters.deliveryStatus).length > 0) count += toFilterArray(filters.deliveryStatus).length;
      if (filters.specialTarget) count += 1;
      if (filters.searchQuery) count += 1;
      return count;
    }
    if (!isSectorLocked && toFilterArray(filters.sector).length > 0) count += toFilterArray(filters.sector).length;
    if (toFilterArray(filters.generalAdmin).length > 0) count += toFilterArray(filters.generalAdmin).length;
    if (toFilterArray(filters.competentAdmin).length > 0) count += toFilterArray(filters.competentAdmin).length;
    if (toFilterArray(filters.classification).length > 0) count += toFilterArray(filters.classification).length;
    if (toFilterArray(filters.obstacleReason).length > 0) count += toFilterArray(filters.obstacleReason).length;
    if (toFilterArray(filters.status).length > 0) count += toFilterArray(filters.status).length;
    if (filters.searchQuery) count += 1;
    return count;
  }, [filters, isSectorLocked, isEtaha]);

  // Level 1: Dynamic Sectors strictly from baseSites (deduplicated & normalized)
  const dynamicSectors = useMemo(() => {
    if (isSectorLocked && user?.sector) {
      return [normalizeSectorName(toCanonicalSector(user.sector))];
    }
    return Array.from(
      new Set(
        baseSites
          .map((s) => {
            if (isEtaha) {
              return String(s.executionSector || s.rawRecord?.['قطاع التنفيذ'] || s.sector || '').replace(/\s+/g, ' ').trim();
            }
            const rawSec = String(s.sector || s.rawRecord?.['رئاسة قطاعات التنفيذ'] || s.rawRecord?.['قطاع التنفيذ'] || '').trim();
            return normalizeSectorName(rawSec);
          })
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [baseSites, user, isSectorLocked, isEtaha]);

  // Level 2: Scoped by chosen Sector(s) -> Feeds General Admin
  const sectorScopedSites = useMemo(() => {
    const activeSectors = toFilterArray(filters.sector).map((s) => String(s).replace(/\s+/g, ' ').trim());
    if (activeSectors.length > 0) {
      return baseSites.filter((s) => {
        if (isEtaha) {
          const sec = String(s.executionSector || s.rawRecord?.['قطاع التنفيذ'] || s.sector || '').replace(/\s+/g, ' ').trim();
          const normSec = normalizeArabicText(sec);
          return activeSectors.some((as) => normalizeArabicText(as) === normSec || as === sec);
        }
        const rawSec = String(s.sector || s.rawRecord?.['رئاسة قطاعات التنفيذ'] || s.rawRecord?.['قطاع التنفيذ'] || '').trim();
        const normSec = normalizeSectorName(rawSec);
        return activeSectors.some((as) => normalizeSectorName(as) === normSec || as === rawSec || isRecordInSector(as, s));
      });
    }
    return baseSites;
  }, [baseSites, filters.sector, isEtaha]);

  // Dynamic General Admins belonging strictly to chosen Sector(s)
  const dynamicGeneralAdmins = useMemo(() => {
    return Array.from(
      new Set(
        sectorScopedSites
          .map((s) => String(s.generalAdmin || s.rawRecord?.['الادارة العامة المنفذة'] || s.rawRecord?.['الادارة العامة لتنفيذ الشبكات'] || s.rawRecord?.['الادارة العامة للتنفيذ'] || s.rawRecord?.['الادارة العامة للمنطقة'] || '').replace(/\s+/g, ' ').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [sectorScopedSites]);

  // Auto-reset General Admin if chosen sector changes and current general admin is not present in it
  useEffect(() => {
    const current = toFilterArray(filters.generalAdmin);
    if (current.length > 0) {
      const valid = current.filter((g) => dynamicGeneralAdmins.some((dga) => normalizeArabicText(dga) === normalizeArabicText(g) || dga === g));
      if (valid.length !== current.length) {
        onChangeFilter('generalAdmin', valid.length === 1 ? valid[0] : valid);
      }
    }
  }, [dynamicGeneralAdmins, filters.generalAdmin, onChangeFilter]);

  // Level 3: Scoped by Sector AND Department -> Feeds Competent Executing Admin
  const deptScopedSites = useMemo(() => {
    const activeGAs = toFilterArray(filters.generalAdmin).map((g) => String(g).replace(/\s+/g, ' ').trim());
    if (activeGAs.length > 0) {
      return sectorScopedSites.filter((s) => {
        const ga = String(s.generalAdmin || s.rawRecord?.['الادارة العامة المنفذة'] || s.rawRecord?.['الادارة العامة لتنفيذ الشبكات'] || s.rawRecord?.['الادارة العامة للتنفيذ'] || s.rawRecord?.['الادارة العامة للمنطقة'] || '').replace(/\s+/g, ' ').trim();
        const normGa = normalizeArabicText(ga);
        return activeGAs.some((aga) => normalizeArabicText(aga) === normGa || aga === ga);
      });
    }
    return sectorScopedSites;
  }, [sectorScopedSites, filters.generalAdmin]);

  // Dynamic Competent Executing Admins (strictly from table, no hardcoded arrays)
  const dynamicCompetentAdmins = useMemo(() => {
    return Array.from(
      new Set(
        deptScopedSites
          .map((s) => String(s.competentAdmin || s.rawRecord?.['ادارة التنفيذ'] || s.rawRecord?.['ادارة التنفيذ الفرعية'] || s.rawRecord?.['إدارة التنفيذ المختصة'] || s.rawRecord?.['المنطقة'] || '').replace(/\s+/g, ' ').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [deptScopedSites]);

  // Auto-reset Competent Admin if no longer valid
  useEffect(() => {
    const current = toFilterArray(filters.competentAdmin);
    if (current.length > 0) {
      const valid = current.filter((c) => dynamicCompetentAdmins.some((dca) => normalizeArabicText(dca) === normalizeArabicText(c) || dca === c));
      if (valid.length !== current.length) {
        onChangeFilter('competentAdmin', valid.length === 1 ? valid[0] : valid);
      }
    }
  }, [dynamicCompetentAdmins, filters.competentAdmin, onChangeFilter]);

  // Level 4: Classification strictly from active Executing Department
  const competentScopedSites = useMemo(() => {
    const activeCAs = toFilterArray(filters.competentAdmin).map((c) => String(c).trim());
    if (activeCAs.length > 0) {
      return deptScopedSites.filter((s) => {
        const ca = String(s.competentAdmin || s.rawRecord?.['ادارة التنفيذ الفرعية'] || s.rawRecord?.['إدارة التنفيذ المختصة'] || s.rawRecord?.['المنطقة'] || '').trim();
        return activeCAs.includes(ca);
      });
    }
    return deptScopedSites;
  }, [deptScopedSites, filters.competentAdmin]);

  // Dynamic Classifications strictly from the active parent scope
  const dynamicClassifications = useMemo(() => {
    return Array.from(
      new Set(
        competentScopedSites
          .map((s) => String(s.classification || s.rawRecord?.['التصنيف'] || s.rawRecord?.['التصنيف (مدني)'] || '').trim())
          .filter((c) => Boolean(c) && c !== 'غير محدد')
      )
    ).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [competentScopedSites]);

  // Auto-reset Classification if no longer valid
  useEffect(() => {
    const current = toFilterArray(filters.classification);
    if (current.length > 0) {
      const valid = current.filter((c) => dynamicClassifications.includes(c));
      if (valid.length !== current.length) {
        onChangeFilter('classification', valid.length === 1 ? valid[0] : valid);
      }
    }
  }, [dynamicClassifications, filters.classification, onChangeFilter]);

  // Level 5: Delay Reasons (أسباب التعثر) strictly scoped by active Classification
  const classificationScopedSites = useMemo(() => {
    const activeCls = toFilterArray(filters.classification).map((c) => String(c).trim());
    if (activeCls.length > 0) {
      return competentScopedSites.filter((s) => {
        const cls = String(s.classification || s.rawRecord?.['التصنيف'] || s.rawRecord?.['التصنيف (مدني)'] || '').trim();
        const siteCat = getSiteClassification(s);
        return activeCls.includes(cls) || activeCls.includes(siteCat);
      });
    }
    return competentScopedSites;
  }, [competentScopedSites, filters.classification]);

  // Dynamic Delay Reasons (أسباب التعثر) strictly from matching active records
  const dynamicObstacleReasons = useMemo(() => {
    return Array.from(
      new Set(
        classificationScopedSites
          .map((s) => String(s.obstacleReason || s.rawRecord?.['اسباب التعّذر'] || s.rawRecord?.['اسباب التعذر'] || s.rawRecord?.['نوع المعوق المدني'] || s.rawRecord?.['الملاحظات'] || '').trim())
          .filter((r) => Boolean(r) && r !== 'لا يوجد تعذر' && r !== 'تم الانتهاء' && r !== 'لا يوجد')
      )
    ).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [classificationScopedSites]);

  // Auto-reset Obstacle Reason if no longer valid
  useEffect(() => {
    const current = toFilterArray(filters.obstacleReason);
    if (current.length > 0) {
      const valid = current.filter((o) => dynamicObstacleReasons.includes(o));
      if (valid.length !== current.length) {
        onChangeFilter('obstacleReason', valid.length === 1 ? valid[0] : valid);
      }
    }
  }, [dynamicObstacleReasons, filters.obstacleReason, onChangeFilter]);

  // ── Etaha Specific: Dynamic Options for 3 Axes ──
  const dynamicExternalPaths = useMemo(() => {
    if (!isEtaha) return [];
    const list = Array.from(
      new Set(
        baseSites
          .map((s) => {
            const raw = String(s.externalPath || s.rawRecord?.['المسار الخارجي'] || '').trim();
            if (raw === 'تعذر' || raw === 'متعذرات' || raw === 'متعذر') return 'متعذر';
            return raw;
          })
          .filter(Boolean)
      )
    );
    const order = ['تم الانتهاء', 'جاري العمل', 'جاري استخراج تصاريح', 'متعذر', 'معوقات'];
    return list.sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b, 'ar');
    });
  }, [baseSites, isEtaha]);

  const dynamicInternalPaths = useMemo(() => {
    if (!isEtaha) return [];
    const list = Array.from(
      new Set(
        baseSites
          .map((s) =>
            normalizeEtahaInternalPath(
              String(s.internalPath || s.rawRecord?.['المسار الداخلى'] || s.rawRecord?.['المسار الداخلي'] || s.rawRecord?.['موقف اللحامات'] || s.rawRecord?.['موقف_اللحامات'] || '').trim()
            )
          )
          .filter(Boolean)
      )
    );
    const order = ['تم الانتهاء', 'لم يتم', 'لم يتم الانتهاء من المسار الخارجي', 'مسار خارجي متعذرات او معوقات', 'جاري العمل'];
    return list.sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b, 'ar');
    });
  }, [baseSites, isEtaha]);

  const dynamicExcelStatuses = useMemo(() => {
    if (!isEtaha) return [];
    const list = Array.from(
      new Set(
        baseSites
          .map((s) => {
            const raw = String(s.excelStatus || s.classification || s.rawRecord?.['التصنيف'] || '').trim();
            if (raw === 'تعذر' || raw === 'متعذرات' || raw === 'متعذر') return 'متعذر';
            return raw;
          })
          .filter(Boolean)
      )
    );
    const order = ['تم الانتهاء والتسليم', 'تم خارجي -متوقف علي العميل', 'جاري خارجي', 'تصاريح', 'متعذر', 'معوقات', 'منتظر التسليم'];
    return list.sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b, 'ar');
    });
  }, [baseSites, isEtaha]);

  const dynamicDeliveryStatuses = useMemo(() => {
    if (!isEtaha) return [];
    const list = Array.from(
      new Set(
        baseSites
          .map((s) =>
            normalizeEtahaDeliveryStatus(
              String(s.deliveryStatus || s.deliveryArea || s.rawRecord?.['موقف التسليم'] || '').trim()
            )
          )
          .filter(Boolean)
      )
    );
    const order = ['تم التسليم', 'متوقف على العميل', 'لم يتم', 'منتظر التسليم'];
    return list.sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b, 'ar');
    });
  }, [baseSites, isEtaha]);

  useEffect(() => {
    if (isEtaha) {
      const current = toFilterArray(filters.externalPath);
      if (current.length > 0 && dynamicExternalPaths.length > 0) {
        const valid = current.filter((x) => dynamicExternalPaths.includes(x));
        if (valid.length !== current.length) {
          onChangeFilter('externalPath', valid.length === 1 ? valid[0] : valid);
        }
      }
    }
  }, [isEtaha, dynamicExternalPaths, filters.externalPath, onChangeFilter]);

  useEffect(() => {
    if (isEtaha) {
      const current = toFilterArray(filters.excelStatus);
      if (current.length > 0 && dynamicExcelStatuses.length > 0) {
        const valid = current.filter((x) => dynamicExcelStatuses.includes(x));
        if (valid.length !== current.length) {
          onChangeFilter('excelStatus', valid.length === 1 ? valid[0] : valid);
        }
      }
    }
  }, [isEtaha, dynamicExcelStatuses, filters.excelStatus, onChangeFilter]);

  useEffect(() => {
    if (isEtaha) {
      const current = toFilterArray(filters.internalPath);
      if (current.length > 0 && dynamicInternalPaths.length > 0) {
        const valid = current.filter((x) => dynamicInternalPaths.includes(x));
        if (valid.length !== current.length) {
          onChangeFilter('internalPath', valid.length === 1 ? valid[0] : valid);
        }
      }
    }
  }, [isEtaha, dynamicInternalPaths, filters.internalPath, onChangeFilter]);

  useEffect(() => {
    if (isEtaha) {
      const current = toFilterArray(filters.deliveryStatus);
      if (current.length > 0 && dynamicDeliveryStatuses.length > 0) {
        const valid = current.filter((x) => dynamicDeliveryStatuses.includes(x));
        if (valid.length !== current.length) {
          onChangeFilter('deliveryStatus', valid.length === 1 ? valid[0] : valid);
        }
      }
    }
  }, [isEtaha, dynamicDeliveryStatuses, filters.deliveryStatus, onChangeFilter]);

  // ── Etaha: Dynamic Options for مسؤولية التنفيذ strictly from base dataset ──
  const dynamicResponsibilities = useMemo(() => {
    if (!isEtaha) return [];
    return Array.from(
      new Set(
        baseSites
          .map((s) => String(s.executionResponsibility || s.responsibility || s.rawRecord?.['مسئوليه التنفيذ'] || s.rawRecord?.['مسؤولية التنفيذ'] || '').replace(/\s+/g, ' ').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [baseSites, isEtaha]);

  useEffect(() => {
    if (isEtaha) {
      const current = toFilterArray(filters.executionResponsibility);
      if (current.length > 0 && dynamicResponsibilities.length > 0) {
        const valid = current.filter((x) => dynamicResponsibilities.some((dr) => normalizeArabicText(dr) === normalizeArabicText(x) || dr === x));
        if (valid.length !== current.length) {
          onChangeFilter('executionResponsibility', valid.length === 1 ? valid[0] : valid);
        }
      }
    }
  }, [isEtaha, dynamicResponsibilities, filters.executionResponsibility, onChangeFilter]);

  return (
    <div className="w-full">
      {/* Slicers Controls Row */}
      {isEtaha ? (
        /* Etaha Specific: 7 Multi-Select Slicers in a flexible row on wide screens */
        <div className="flex flex-col sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:flex xl:flex-row items-stretch xl:items-end gap-2.5">
          {/* 1. القطاع */}
          <div className="flex-1 min-w-0">
            <MultiFilterDropdown
              id="filter-etaha-sector"
              label={isSectorLocked ? `القطاع (${user?.sector})` : 'القطاع'}
              labelEn="Sector"
              icon={MapPin}
              value={isSectorLocked ? [user?.sector || ''] : filters.sector}
              options={dynamicSectors}
              onChange={(val) => !isSectorLocked && onChangeFilter('sector', val)}
              sitesData={baseSites}
              filterKey="sector"
              disabled={isSectorLocked}
              lockedNote={`تم حجب باقي القطاعات - مقيد بقطاع ${user?.sector}`}
            />
          </div>

          {/* 2. الإدارة العامة */}
          <div className="flex-1 min-w-0">
            <MultiFilterDropdown
              id="filter-etaha-general-admin"
              label="الإدارة العامة"
              labelEn="General Admin"
              icon={Building}
              value={filters.generalAdmin}
              options={dynamicGeneralAdmins}
              onChange={(val) => onChangeFilter('generalAdmin', val)}
              sitesData={sectorScopedSites}
              filterKey="generalAdmin"
            />
          </div>

          {/* 3. إدارة التنفيذ المختصة */}
          <div className="flex-1 min-w-0">
            <MultiFilterDropdown
              id="filter-etaha-competent-admin"
              label="إدارة التنفيذ المختصة"
              labelEn="Execution Admin"
              icon={Briefcase}
              value={filters.competentAdmin}
              options={dynamicCompetentAdmins}
              onChange={(val) => onChangeFilter('competentAdmin', val)}
              sitesData={deptScopedSites}
              filterKey="competentAdmin"
            />
          </div>

          {/* 4. مسؤولية التنفيذ */}
          <div className="flex-1 min-w-0">
            <MultiFilterDropdown
              id="filter-etaha-execution-responsibility"
              label="مسؤولية التنفيذ"
              labelEn="Execution Responsibility"
              icon={Layers}
              value={filters.executionResponsibility || []}
              options={dynamicResponsibilities}
              onChange={(val) => onChangeFilter('executionResponsibility', val)}
              sitesData={baseSites}
              filterKey="responsibility"
            />
          </div>

          {/* 5. محور 1: المسار الخارجي */}
          <div className="flex-1 min-w-0">
            <MultiFilterDropdown
              id="filter-etaha-external-path"
              label="المسار الخارجي"
              labelEn="External Path"
              icon={Zap}
              value={filters.externalPath || []}
              options={dynamicExternalPaths}
              onChange={(val) => onChangeFilter('externalPath', val)}
              sitesData={baseSites}
              filterKey="externalPath"
            />
          </div>

          {/* 6. محور 2: المسار الداخلي */}
          <div className="flex-1 min-w-0">
            <MultiFilterDropdown
              id="filter-etaha-internal-path"
              label="المسار الداخلي"
              labelEn="Internal Route"
              icon={Tag}
              value={filters.internalPath || []}
              options={dynamicInternalPaths}
              onChange={(val) => onChangeFilter('internalPath', val)}
              sitesData={baseSites}
              filterKey="internalPath"
            />
          </div>

          {/* 7. محور 3: موقف التسليم */}
          <div className="flex-1 min-w-0">
            <MultiFilterDropdown
              id="filter-etaha-delivery-status"
              label="موقف التسليم"
              labelEn="Delivery Status"
              icon={Award}
              value={filters.deliveryStatus || []}
              options={dynamicDeliveryStatuses}
              onChange={(val) => onChangeFilter('deliveryStatus', val)}
              sitesData={baseSites}
              filterKey="deliveryStatus"
            />
          </div>

          {/* Reset Filters Action */}
          {activeCount > 0 && (
            <div className="flex-shrink-0 self-end">
              <button
                type="button"
                onClick={onResetFilters}
                id="btn-reset-filters-etaha"
                className="w-full xl:w-auto h-[38px] px-3.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-600 hover:to-indigo-600 shadow-sm cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap"
                title="إلغاء وتصفية جميع الفلاتر والعودة لعرض كافة البيانات"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إلغاء الفلاتر</span>
                <span className="bg-white/25 text-white px-1.5 py-0.5 rounded-full font-mono font-bold text-[11px]">
                  {activeCount}
                </span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Standard Multi-operator Slicers (5 Multi-Select Levels in a single row on desktop) */
        <div className="flex flex-col sm:grid sm:grid-cols-2 md:grid-cols-3 lg:flex lg:flex-row items-stretch lg:items-end gap-2.5">
          {/* 1. القطاع (Level 1: Sector) */}
          <div className="flex-1 min-w-0">
            <MultiFilterDropdown
              id="filter-sector"
              label={isSectorLocked ? `القطاع (${user?.sector})` : 'القطاع'}
              labelEn="Sector"
              icon={MapPin}
              value={isSectorLocked ? [user?.sector || ''] : filters.sector}
              options={dynamicSectors}
              onChange={(val) => !isSectorLocked && onChangeFilter('sector', val)}
              sitesData={baseSites}
              filterKey="sector"
              disabled={isSectorLocked}
              lockedNote={`تم حجب باقي القطاعات - مقيد بقطاع ${user?.sector}`}
            />
          </div>

          {/* 2. الإدارات العامه (Level 2: Department / General Admin) */}
          <div className="flex-1 min-w-0">
            <MultiFilterDropdown
              id="filter-general-admin"
              label="الإدارات العامه"
              labelEn="Department"
              icon={Building}
              value={filters.generalAdmin}
              options={dynamicGeneralAdmins}
              onChange={(val) => onChangeFilter('generalAdmin', val)}
              sitesData={sectorScopedSites}
              filterKey="generalAdmin"
            />
          </div>

          {/* 3. إدارة التنفيذ المختصة (Level 2.5: Competent Execution Admin) */}
          <div className="flex-1 min-w-0">
            <MultiFilterDropdown
              id="filter-competent-admin"
              label="إدارة التنفيذ المختصة"
              labelEn="Execution Admin"
              icon={Briefcase}
              value={filters.competentAdmin}
              options={dynamicCompetentAdmins}
              onChange={(val) => onChangeFilter('competentAdmin', val)}
              sitesData={deptScopedSites}
              filterKey="competentAdmin"
            />
          </div>

          {/* 4. التصنيف (Level 3: Classification) */}
          <div className="flex-1 min-w-0">
            <MultiFilterDropdown
              id="filter-classification"
              label="التصنيف"
              labelEn="Classification"
              icon={Tag}
              value={filters.classification}
              options={dynamicClassifications}
              onChange={(val) => onChangeFilter('classification', val)}
              sitesData={competentScopedSites}
              filterKey="classification"
            />
          </div>

          {/* 5. أسباب التعذر (Level 4: Obstacle Reasons) */}
          <div className="flex-1 min-w-0">
            <MultiFilterDropdown
              id="filter-obstacle-reason"
              label="أسباب التعذر"
              labelEn="Stall / Obstacle Reason"
              icon={AlertCircle}
              value={filters.obstacleReason}
              options={dynamicObstacleReasons}
              onChange={(val) => onChangeFilter('obstacleReason', val)}
              sitesData={classificationScopedSites}
              filterKey="obstacleReason"
            />
          </div>

          {/* Reset Filters Action */}
          {activeCount > 0 && (
            <div className="flex-shrink-0 self-end">
              <button
                type="button"
                onClick={onResetFilters}
                id="btn-reset-filters-header"
                className="w-full lg:w-auto h-[38px] px-3.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-600 hover:to-indigo-600 shadow-sm cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap"
                title="إلغاء وتصفية جميع الفلاتر والعودة لعرض كافة البيانات"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إلغاء الفلاتر</span>
                <span className="bg-white/25 text-white px-1.5 py-0.5 rounded-full font-mono font-bold text-[11px]">
                  {activeCount}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
