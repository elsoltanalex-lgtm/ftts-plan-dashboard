import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Filter,
  ChevronDown,
  Search,
  X,
  RotateCcw,
  Check,
  MapPin,
  Building,
  Briefcase,
  Layers,
  Tag,
  AlertCircle,
  Lock
} from 'lucide-react';
import type { FilterState, SiteRecord } from '../types/dashboard';
import { useAuth } from '../context/AuthContext';
import { isRecordInSector, toCanonicalSector } from '../utils/sectorPermissions';
import {
  SECTORS,
  GENERAL_ADMINS,
  COMPETENT_ADMINS,
  CLASSIFICATIONS,
  OBSTACLE_REASONS,
  getSiteClassification
} from '../data/dashboardData';

interface FiltersProps {
  filters: FilterState;
  onChangeFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onResetFilters: () => void;
  sitesData: SiteRecord[];
  selectedCompany?: string;
}

interface FilterDropdownProps {
  id: string;
  label: string;
  labelEn: string;
  icon: React.ElementType;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  sitesData: SiteRecord[];
  filterKey: keyof SiteRecord;
  disabled?: boolean;
  lockedNote?: string;
}

const SingleFilterDropdown: React.FC<FilterDropdownProps> = ({
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

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Count items for each option in current context
  const getOptionCount = (optVal: string) => {
    if (!optVal) return sitesData.length;
    if (filterKey === 'sector') {
      return sitesData.filter((s) => isRecordInSector(optVal, s) || String(s.sector || '').trim() === String(optVal).trim()).length;
    }
    const targetTrimmed = String(optVal).trim();
    return sitesData.filter((s) => String(s[filterKey] || '').trim() === targetTrimmed).length;
  };

  const isSelected = Boolean(value);

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
              onChange('');
            }}
            className="text-[10px] text-rose-500 hover:text-rose-700 flex items-center gap-0.5 cursor-pointer"
            title="إلغاء التحديد"
          >
            <X className="w-2.5 h-2.5" />
            <span>مسح</span>
          </button>
        )}
      </div>

      {/* Button to toggle dropdown */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        title={disabled ? (lockedNote || 'نطاق مقيد بحسب صلاحيات حسابك') : undefined}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl border transition-all text-right shadow-2xs ${disabled
          ? 'bg-slate-100/90 border-slate-300 text-slate-600 font-semibold cursor-not-allowed opacity-90'
          : isSelected
            ? 'bg-sky-50 border-sky-400 text-sky-900 font-semibold ring-1 ring-sky-300 cursor-pointer'
            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer'
          }`}
      >
        <span className="truncate flex-1">
          {isSelected ? value : 'الكل (عرض الجميع)'}
        </span>
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
        <div className="absolute z-50 mt-1 w-full sm:w-64 max-w-[90vw] right-0 bg-white border border-slate-200 rounded-xl shadow-xl p-2 animate-in fade-in zoom-in-95 duration-150">
          {/* Search box inside dropdown */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute inset-y-0 right-2.5 my-auto text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`بحث في ${label}...`}
              className="w-full pr-8 pl-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-700"
              autoFocus
            />
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {/* "All" Option */}
            <div
              onClick={() => {
                onChange('');
                setIsOpen(false);
                setSearchTerm('');
              }}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${!value
                ? 'bg-sky-100 text-sky-900 font-bold'
                : 'hover:bg-slate-100 text-slate-700'
                }`}
            >
              <div className="flex items-center gap-1.5">
                {!value && <Check className="w-3 h-3 text-sky-700" />}
                <span>الكل (عرض الجميع)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {sitesData.length}
              </span>
            </div>

            {/* Individual Options */}
            {filteredOptions.map((opt) => {
              const isOptionActive = String(value || '').trim() === String(opt || '').trim();
              const count = getOptionCount(opt);

              return (
                <div
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${isOptionActive
                    ? 'bg-sky-100 text-sky-900 font-bold'
                    : 'hover:bg-slate-100 text-slate-700'
                    }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {isOptionActive && <Check className="w-3 h-3 text-sky-700 flex-shrink-0" />}
                    <span className="truncate">{opt}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isOptionActive
                      ? 'bg-sky-200/60 text-sky-900 font-bold'
                      : 'bg-slate-100 text-slate-500'
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
}) => {
  const { user } = useAuth();
  const isSectorLocked = Boolean(user && user.role !== 'admin' && user.sector !== 'ALL');
  const isOrange = (selectedCompany || filters.company) === 'Orange';

  // Base dataset: when specific operator is selected, strictly scope to those sites
  const baseSites = useMemo(() => {
    const comp = selectedCompany || filters.company;
    if (comp && comp !== 'All') {
      const filtered = sitesData.filter((s) => s.company === comp);
      return filtered.length > 0 ? filtered : sitesData;
    }
    return sitesData;
  }, [sitesData, selectedCompany, filters.company]);

  // Active filters count
  const activeCount = isOrange
    ? [
      !isSectorLocked && filters.sector,
      filters.generalAdmin,
      filters.subSector,
      filters.competentAdmin,
    ].filter(Boolean).length
    : [
      !isSectorLocked && filters.sector,
      filters.generalAdmin,
      filters.competentAdmin,
      filters.classification,
      filters.obstacleReason,
    ].filter(Boolean).length;

  // Level 1: Sector / Presidency Filter
  const dynamicSectors = useMemo(() => {
    if (isSectorLocked && user?.sector) {
      return [toCanonicalSector(user.sector)];
    }
    if (isOrange) {
      const orangeSecs = Array.from(
        new Set(baseSites.map((s) => (s.sector || '').trim()).filter(Boolean))
      );
      return orangeSecs.length > 0
        ? orangeSecs
        : ['المنطقة الجنوبية', 'المنطقة الغربية', 'المنطقة الشرقية', 'القاهرة الكبرى', 'الجيزة و أكتوبر', 'اسكندرية و الساحل'];
    }
    const directSecs = Array.from(
      new Set(baseSites.map((s) => (s.sector || '').trim()).filter(Boolean))
    );
    if (directSecs.length > 0) {
      return directSecs;
    }
    const presentCanonical = new Set(
      baseSites.map((s) => toCanonicalSector(s.sector)).filter(Boolean)
    );
    const ordered = SECTORS.filter((sec) => presentCanonical.has(sec));
    return ordered.length > 0 ? ordered : SECTORS;
  }, [baseSites, user, isSectorLocked, isOrange]);

  // Level 2: Scoped by chosen Sector -> Feeds General Admin
  const sectorScopedSites = useMemo(() => {
    if (filters.sector && filters.sector !== 'All') {
      return baseSites.filter((s) => isRecordInSector(filters.sector, s) || String(s.sector || '').trim() === String(filters.sector).trim());
    }
    return baseSites;
  }, [baseSites, filters.sector]);

  // Dynamic General Admins belonging strictly to chosen Sector
  const dynamicGeneralAdmins = useMemo(() => {
    const list = Array.from(
      new Set(
        sectorScopedSites
          .map((s) => String(s.generalAdmin || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'ar'));
    return list;
  }, [sectorScopedSites]);

  // Auto-reset General Admin if chosen sector changes and current general admin is not present in it
  useEffect(() => {
    if (
      filters.generalAdmin &&
      dynamicGeneralAdmins.length > 0 &&
      !dynamicGeneralAdmins.some((d) => d === filters.generalAdmin.trim())
    ) {
      onChangeFilter('generalAdmin', '');
    }
  }, [dynamicGeneralAdmins, filters.generalAdmin, onChangeFilter]);

  // Level 2.5: Scoped by Sector AND Department -> Feeds Competent Admin / SubSector
  const deptScopedSites = useMemo(() => {
    if (filters.generalAdmin) {
      const gTrimmed = filters.generalAdmin.trim();
      return sectorScopedSites.filter((s) => String(s.generalAdmin || '').trim() === gTrimmed);
    }
    return sectorScopedSites;
  }, [sectorScopedSites, filters.generalAdmin]);

  // ── Orange Hierarchy Specific: Level 3 (الإدارة المختصة - القطاع) ──
  const dynamicSubSectors = useMemo(() => {
    if (!isOrange) return [];
    const list = Array.from(
      new Set(
        deptScopedSites
          .map((s) => String(s.subSector || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'ar'));
    return list;
  }, [deptScopedSites, isOrange]);

  // Auto-reset Orange SubSector if no longer valid
  useEffect(() => {
    if (
      isOrange &&
      filters.subSector &&
      dynamicSubSectors.length > 0 &&
      !dynamicSubSectors.some((s) => s === filters.subSector?.trim())
    ) {
      onChangeFilter('subSector', '');
    }
  }, [isOrange, dynamicSubSectors, filters.subSector, onChangeFilter]);

  // Level 3.5: Scoped by SubSector -> Feeds Area / إدارة المنطقة
  const subSectorScopedSites = useMemo(() => {
    if (isOrange && filters.subSector) {
      const subTrimmed = filters.subSector.trim();
      return deptScopedSites.filter((s) => String(s.subSector || '').trim() === subTrimmed);
    }
    return deptScopedSites;
  }, [deptScopedSites, filters.subSector, isOrange]);

  // Dynamic Competent Admins / Areas
  const dynamicCompetentAdmins = useMemo(() => {
    if (isOrange) {
      const list = Array.from(
        new Set(
          subSectorScopedSites
            .map((s) => String(s.competentAdmin || '').trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, 'ar'));
      return list;
    }
    const validSet = new Set(COMPETENT_ADMINS);
    const set = new Set<string>();
    deptScopedSites.forEach((s) => {
      const c = String(s.competentAdmin || '').trim();
      if (validSet.has(c)) {
        set.add(c);
      }
    });
    if (set.size === 0) {
      sectorScopedSites.forEach((s) => {
        const c = String(s.competentAdmin || '').trim();
        if (validSet.has(c)) {
          set.add(c);
        }
      });
    }
    const list = Array.from(set.size > 0 ? set : validSet);
    return list.sort((a, b) => a.localeCompare(b, 'ar'));
  }, [subSectorScopedSites, deptScopedSites, sectorScopedSites, isOrange]);

  // Auto-reset Competent Admin if no longer valid
  useEffect(() => {
    if (
      filters.competentAdmin &&
      dynamicCompetentAdmins.length > 0 &&
      !dynamicCompetentAdmins.some((c) => c === filters.competentAdmin.trim())
    ) {
      onChangeFilter('competentAdmin', '');
    }
  }, [dynamicCompetentAdmins, filters.competentAdmin, onChangeFilter]);

  // ── Standard Levels (WE, Vodafone, Orange, Etaha) ──
  // Level 3: Classification strictly from the uploaded Excel sheet
  const competentScopedSites = useMemo(() => {
    if (filters.competentAdmin) {
      const cTrimmed = filters.competentAdmin.trim();
      return deptScopedSites.filter((s) => String(s.competentAdmin || '').trim() === cTrimmed);
    }
    return deptScopedSites;
  }, [deptScopedSites, filters.competentAdmin]);

  const dynamicClassifications = useMemo(() => {
    const list = Array.from(
      new Set(
        competentScopedSites
          .map((s) => getSiteClassification(s))
          .filter((c) => Boolean(c) && c !== 'غير محدد')
      )
    ).sort((a, b) => a.localeCompare(b, 'ar'));
    return list;
  }, [competentScopedSites]);

  useEffect(() => {
    if (
      filters.classification &&
      dynamicClassifications.length > 0 &&
      !dynamicClassifications.some((c) => c === filters.classification.trim())
    ) {
      onChangeFilter('classification', '');
    }
  }, [dynamicClassifications, filters.classification, onChangeFilter]);

  // Level 4: Obstacle Reasons
  const typeScopedSites = useMemo(() => {
    if (filters.classification) {
      const clTrimmed = filters.classification.trim();
      return competentScopedSites.filter(
        (s) => getSiteClassification(s) === clTrimmed
      );
    }
    return competentScopedSites;
  }, [competentScopedSites, filters.classification]);

  const dynamicObstacleReasons = useMemo(() => {
    if (isOrange) return [];
    const list = Array.from(
      new Set(
        typeScopedSites
          .map((s) => String(s.obstacleReason || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'ar'));
    return list;
  }, [typeScopedSites, isOrange]);

  useEffect(() => {
    if (
      !isOrange &&
      filters.obstacleReason &&
      dynamicObstacleReasons.length > 0 &&
      !dynamicObstacleReasons.some((o) => o === filters.obstacleReason.trim())
    ) {
      onChangeFilter('obstacleReason', '');
    }
  }, [isOrange, dynamicObstacleReasons, filters.obstacleReason, onChangeFilter]);

  return (
    <div className="pbi-card p-5 mt-6">
      {/* Filters Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 border border-sky-100">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-800 leading-tight">
                {isOrange
                  ? 'فلاتر التصفية الهرمية لـ Orange (Orange Cascading Filters)'
                  : 'فلاتر التصفية التفاعلية الهرمية (Hierarchical Cascading Filters)'}
              </h3>
              {(filters.sector || filters.generalAdmin || filters.subSector || filters.competentAdmin) && (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <span>⚡ تصفية شجرية متسلسلة نشطة</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isOrange
                ? 'تصفية المواقع طبقاً للهيكل الإداري لـ Orange: رئاسة القطاعات ← الإدارة العامة للتنفيذ ← الإدارة المختصة ← إدارة المنطقة'
                : 'تصفية المؤشرات طبقاً للهيكل الإداري المتسلسل: القطاع ← الإدارة العامة ← إدارة التنفيذ المختصة ← النوع'}
            </p>
          </div>
        </div>

        {/* Prominent Header Reset Button - Purple Theme */}
        {activeCount > 0 ? (
          <button
            onClick={onResetFilters}
            id="btn-reset-filters-header"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-600 hover:to-indigo-600 shadow-md shadow-purple-500/25 ring-2 ring-purple-400/40 cursor-pointer transition-all hover:scale-105 active:scale-95"
            title="إلغاء وتصفية جميع الفلاتر والعودة لعرض كافة البيانات"
          >
            <RotateCcw className="w-4 h-4" />
            <span>إلغاء وتصفية الفلاتر</span>
            <span className="bg-white/25 text-white px-2 py-0.5 rounded-full font-mono font-black text-xs shadow-2xs">
              {activeCount}
            </span>
          </button>
        ) : (
          <button
            disabled
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-60"
            title="لا توجد فلاتر نشطة حالياً"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إلغاء وتصفية الفلاتر</span>
          </button>
        )}
      </div>

      {/* Grid of Slicers */}
      {isOrange ? (
        /* Orange Slicers: Strictly the 4 Hierarchical Filters Requested */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. رئاسة القطاعات */}
          <SingleFilterDropdown
            id="filter-orange-presidency"
            label={isSectorLocked ? `رئاسة القطاع (${user?.sector})` : 'رئاسة القطاعات'}
            labelEn="Presidency"
            icon={MapPin}
            value={isSectorLocked ? (user?.sector || '') : filters.sector}
            options={dynamicSectors}
            onChange={(val) => !isSectorLocked && onChangeFilter('sector', val)}
            sitesData={baseSites}
            filterKey="sector"
            disabled={isSectorLocked}
            lockedNote={`تم حجب باقي القطاعات - مقيد بقطاع ${user?.sector}`}
          />

          {/* 2. الإدارة العامة للتنفيذ */}
          <SingleFilterDropdown
            id="filter-orange-general-admin"
            label="الإدارة العامة للتنفيذ"
            labelEn="General Directorate"
            icon={Building}
            value={filters.generalAdmin}
            options={dynamicGeneralAdmins}
            onChange={(val) => onChangeFilter('generalAdmin', val)}
            sitesData={sectorScopedSites}
            filterKey="generalAdmin"
          />

          {/* 3. الإدارة المختصة */}
          <SingleFilterDropdown
            id="filter-orange-subsector"
            label="الإدارة المختصة"
            labelEn="Competent Admin"
            icon={Briefcase}
            value={filters.subSector || ''}
            options={dynamicSubSectors}
            onChange={(val) => onChangeFilter('subSector', val)}
            sitesData={deptScopedSites}
            filterKey="subSector"
          />

          {/* 4. إدارة المنطقة */}
          <SingleFilterDropdown
            id="filter-orange-area"
            label="إدارة المنطقة"
            labelEn="Area Admin"
            icon={Layers}
            value={filters.competentAdmin}
            options={dynamicCompetentAdmins}
            onChange={(val) => onChangeFilter('competentAdmin', val)}
            sitesData={subSectorScopedSites}
            filterKey="competentAdmin"
          />
        </div>
      ) : (
        /* Standard Multi-operator Slicers (5 Levels) */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. القطاع (Level 1: Sector) */}
          <SingleFilterDropdown
            id="filter-sector"
            label={isSectorLocked ? `القطاع (${user?.sector})` : 'القطاع'}
            labelEn="Sector"
            icon={MapPin}
            value={isSectorLocked ? (user?.sector || '') : filters.sector}
            options={dynamicSectors}
            onChange={(val) => !isSectorLocked && onChangeFilter('sector', val)}
            sitesData={baseSites}
            filterKey="sector"
            disabled={isSectorLocked}
            lockedNote={`تم حجب باقي القطاعات - مقيد بقطاع ${user?.sector}`}
          />

          {/* 2. الإدارات العامه (Level 2: Department / General Admin) */}
          <SingleFilterDropdown
            id="filter-general-admin"
            label={
              filters.sector && filters.sector !== 'All'
                ? `الإدارة (${filters.sector.replace('قطاع مناطق ', '').replace('قطاع ', '').replace('المنطقة ', '')})`
                : 'الإدارات العامه'
            }
            labelEn="Department"
            icon={Building}
            value={filters.generalAdmin}
            options={dynamicGeneralAdmins}
            onChange={(val) => onChangeFilter('generalAdmin', val)}
            sitesData={sectorScopedSites}
            filterKey="generalAdmin"
          />

          {/* 3. إدارة التنفيذ المختصة (Level 2.5: Competent Execution Admin) */}
          <SingleFilterDropdown
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

          {/* 4. Type / التصنيف (Level 3: Type & Classification) */}
          <SingleFilterDropdown
            id="filter-classification"
            label="Type / النوع"
            labelEn="Type"
            icon={Tag}
            value={filters.classification}
            options={dynamicClassifications}
            onChange={(val) => onChangeFilter('classification', val)}
            sitesData={competentScopedSites}
            filterKey="classification"
          />

          {/* 5. أسباب التعذر (Level 4: Obstacle Reasons) */}
          <SingleFilterDropdown
            id="filter-obstacle-reason"
            label="أسباب التعذر"
            labelEn="Stall / Obstacle Reason"
            icon={AlertCircle}
            value={filters.obstacleReason}
            options={dynamicObstacleReasons}
            onChange={(val) => onChangeFilter('obstacleReason', val)}
            sitesData={typeScopedSites}
            filterKey="obstacleReason"
          />
        </div>
      )}
    </div>
  );
};
