// src/components/WeDataAnalysis.tsx
// Comprehensive WE Analytics & Distribution Component
// Features 4 independent precision filters: Sector, Region, Central, General Status
// Maintains default "Comprehensive General Analysis" view with instant reset

import React, { useState, useMemo, useEffect } from 'react';
import { DonutChart } from './DonutChart';
import { SummaryTable } from './SummaryTable';
import { WeSectorPerformance } from './WeSectorPerformance';
import type { SiteRecord, StatusType } from '../types/dashboard';
import { calculateStatusSummaries, STATUS_CONFIG } from '../data/dashboardData';
import { useAuth } from '../context/AuthContext';
import { isRecordInSector } from '../utils/sectorPermissions';
import { 
  Filter, 
  RotateCcw, 
  Search, 
  Building2, 
  MapPin, 
  Radio, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Layers,
  Lock
} from 'lucide-react';

export interface WeDataAnalysisProps {
  weSites: SiteRecord[];
}

const AUTHORIZED_SECTORS = [
  'قطاع إسكندرية والساحل',
  'قطاع شرق الدلتا',
  'قطاع مناطق غرب الدلتا',
  'قطاع مناطق وسط الدلتا',
  'قطاع مناطق السويس',
  'قطاع مناطق الإسماعيلية',
  'قطاع مناطق القاهرة الكبرى',
  'قطاع مناطق الجيزة وأكتوبر',
  'قطاع مناطق الصعيد',
];

const ALL_STATUS_OPTIONS: StatusType[] = [
  'تم التسليم',
  'جاري العمل مدني',
  'جاري تصاريح',
  'جاري المعاينة',
  'جاري العمل كهربى',
  'معوقات',
  'متعثرات',
];

export const WeDataAnalysis: React.FC<WeDataAnalysisProps> = ({ weSites }) => {
  const { user } = useAuth();
  const isSectorUser = Boolean(user && user.role !== 'admin' && user.sector && user.sector !== 'ALL');

  // ── Filter States (Defaults to 'All' for Comprehensive General Analysis) ──
  const [selectedSector, setSelectedSector] = useState<string>('All');
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [selectedCentral, setSelectedCentral] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination for drill-down table
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // Initialize sector lock for non-admin sector user
  useEffect(() => {
    if (isSectorUser && user?.sector) {
      setSelectedSector(user.sector);
    }
  }, [isSectorUser, user?.sector]);

  // Reset to default Comprehensive General Analysis
  const handleResetToGeneralAnalysis = () => {
    setSelectedSector(isSectorUser && user?.sector ? user.sector : 'All');
    setSelectedRegion('All');
    setSelectedCentral('All');
    setSelectedStatus('All');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // ── 1. Dynamic Dropdown Options ──
  // Sector options
  const sectorOptions = useMemo(() => {
    if (isSectorUser && user?.sector) {
      return [user.sector];
    }
    return AUTHORIZED_SECTORS;
  }, [isSectorUser, user?.sector]);

  // Sites matching sector (for cascading region & central lists)
  const sectorScopedSites = useMemo(() => {
    if (selectedSector === 'All') return weSites;
    return weSites.filter((s) => isRecordInSector(selectedSector, s));
  }, [weSites, selectedSector]);

  // Dynamic Region (المنطقة) options based on active sector
  const regionOptions = useMemo(() => {
    const set = new Set<string>();
    sectorScopedSites.forEach((s) => {
      const reg = s.competentAdmin || s.generalAdmin;
      if (reg && reg.trim() && reg !== 'سنترال رئيسي') {
        set.add(reg.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [sectorScopedSites]);

  // Sites matching sector + region
  const regionScopedSites = useMemo(() => {
    if (selectedRegion === 'All') return sectorScopedSites;
    return sectorScopedSites.filter((s) => {
      const reg = s.competentAdmin || s.generalAdmin;
      return reg === selectedRegion;
    });
  }, [sectorScopedSites, selectedRegion]);

  // Dynamic Central (السنترال) options based on active sector + region
  const centralOptions = useMemo(() => {
    const set = new Set<string>();
    regionScopedSites.forEach((s) => {
      if (s.central && s.central.trim() && s.central !== 'سنترال رئيسي') {
        set.add(s.central.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [regionScopedSites]);

  // ── 2. Filter Application ──
  const filteredSites = useMemo(() => {
    return weSites.filter((site) => {
      // 1. Sector Filter
      if (selectedSector !== 'All') {
        if (!isRecordInSector(selectedSector, site)) return false;
      }

      // 2. Region Filter
      if (selectedRegion !== 'All') {
        const reg = site.competentAdmin || site.generalAdmin;
        if (reg !== selectedRegion) return false;
      }

      // 3. Central Filter
      if (selectedCentral !== 'All') {
        if (site.central !== selectedCentral) return false;
      }

      // 4. Status Filter
      if (selectedStatus !== 'All') {
        if (site.status !== selectedStatus) return false;
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = String(site?.siteCode || '').toLowerCase();
        const name = String(site?.siteName || '').toLowerCase();
        const cent = String(site?.central || '').toLowerCase();
        const sec = String(site?.sector || '').toLowerCase();
        const status = String(site?.status || '').toLowerCase();
        if (
          !code.includes(q) &&
          !name.includes(q) &&
          !cent.includes(q) &&
          !sec.includes(q) &&
          !status.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [weSites, selectedSector, selectedRegion, selectedCentral, selectedStatus, searchQuery]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedSector !== 'All' && !isSectorUser) count++;
    if (selectedRegion !== 'All') count++;
    if (selectedCentral !== 'All') count++;
    if (selectedStatus !== 'All') count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [selectedSector, selectedRegion, selectedCentral, selectedStatus, searchQuery, isSectorUser]);

  const isGeneralAnalysis = activeFiltersCount === 0;

  // ── 3. Aggregates & KPIs ──
  const statusSummaries = useMemo(() => {
    return calculateStatusSummaries(filteredSites);
  }, [filteredSites]);

  const totalSites = filteredSites.length;
  const totalLinks = useMemo(() => {
    return filteredSites.reduce((sum, s) => sum + (s.linksCount ?? 1), 0);
  }, [filteredSites]);

  const completedCount = useMemo(() => {
    return filteredSites.filter((s) => s.status === 'تم التسليم').length;
  }, [filteredSites]);

  const inProgressCount = useMemo(() => {
    return filteredSites.filter(
      (s) =>
        s.status === 'جاري العمل مدني' ||
        s.status === 'جاري العمل كهربى' ||
        s.status === 'جاري تصاريح' ||
        s.status === 'جاري المعاينة'
    ).length;
  }, [filteredSites]);

  const obstaclesCount = useMemo(() => {
    return filteredSites.filter((s) => s.status === 'معوقات' || s.status === 'متعثرات').length;
  }, [filteredSites]);

  const completionRate = totalSites > 0 ? Math.round((completedCount / totalSites) * 100) : 0;

  // ── 4. Table Pagination ──
  const totalPages = Math.ceil(filteredSites.length / pageSize) || 1;
  const pagedSites = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSites.slice(start, start + pageSize);
  }, [filteredSites, currentPage]);

  return (
    <div className="space-y-6">
      {/* ── Mode Banner: Comprehensive Overview vs Precision Filter ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-2xl text-white border border-blue-500/20 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 text-sky-300">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-sky-200">
                {isGeneralAnalysis ? 'التحليل العام الشامل (Default Overview)' : 'تصفية تفصيلية مخصصة نشطة'}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  isGeneralAnalysis
                    ? 'bg-blue-500/20 text-blue-300 border-blue-400/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                }`}
              >
                {isGeneralAnalysis ? 'تحليل شامل لكافة المواقع' : `${activeFiltersCount} فلاتر نشطة`}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              {isGeneralAnalysis
                ? 'معروض التحليل الإحصائي الكامل لكافة مواقع شبكة WE التراسلية دون استثناء.'
                : 'يتم احتساب الرسوم البيانية والجداول أدناه حصرياً وفقاً للفلاتر الدقيقة المحددة.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <span className="text-xs font-mono font-bold px-3 py-1 bg-white/10 rounded-lg text-sky-200">
            {totalSites} / {weSites.length} موقع
          </span>
          {!isGeneralAnalysis && (
            <button
              onClick={handleResetToGeneralAnalysis}
              className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="إعادة تعيين الفلاتر والعودة للتحليل العام الشامل"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>التحليل العام الشامل</span>
            </button>
          )}
        </div>
      </div>

      {/* ── WE Sector Performance & Key Operational Rates (The 4 Core Metrics per Sector) ── */}
      <WeSectorPerformance
        weSites={weSites}
        selectedSectorFilter={selectedSector !== 'All' ? selectedSector : undefined}
        onSelectSectorFilter={(sec) => {
          setSelectedSector(sec === 'ALL' ? 'All' : sec);
          setSelectedRegion('All');
          setSelectedCentral('All');
          setCurrentPage(1);
        }}
      />

      {/* ── 4 Precision Slicers / Filters Bar ── */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>فلاتر التوزيع والتحليل التفصيلية (Precision Slicers):</span>
          </div>
          <span className="text-[11px] text-slate-500">
            تحديث فوري للرسوم البيانية وتوزيع الحالات
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Sector Filter */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>القطاع (Sector)</span>
              {isSectorUser && (
                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1 rounded flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> مقيد
                </span>
              )}
            </label>
            <select
              value={selectedSector}
              disabled={isSectorUser}
              onChange={(e) => {
                setSelectedSector(e.target.value);
                setSelectedRegion('All');
                setSelectedCentral('All');
                setCurrentPage(1);
              }}
              className={`w-full py-2 px-2.5 border rounded-xl text-xs font-medium outline-none transition ${
                isSectorUser
                  ? 'bg-slate-100 text-slate-600 border-slate-300 cursor-not-allowed'
                  : selectedSector !== 'All'
                  ? 'bg-blue-50/80 border-blue-400 text-blue-900 font-bold ring-2 ring-blue-500/10'
                  : 'bg-white border-slate-300 text-slate-800 focus:border-blue-500'
              }`}
            >
              {!isSectorUser && <option value="All">🏢 كل القطاعات (التحليل العام)</option>}
              {sectorOptions.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Region / Zone Filter */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              <span>ادارة التنفيذ المختصة</span>
              {regionOptions.length > 0 && (
                <span className="text-[10px] text-slate-400">({regionOptions.length})</span>
              )}
            </label>
            <select
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                setSelectedCentral('All');
                setCurrentPage(1);
              }}
              className={`w-full py-2 px-2.5 border rounded-xl text-xs font-medium outline-none transition ${
                selectedRegion !== 'All'
                  ? 'bg-indigo-50/80 border-indigo-400 text-indigo-900 font-bold ring-2 ring-indigo-500/10'
                  : 'bg-white border-slate-300 text-slate-800 focus:border-indigo-500'
              }`}
            >
              <option value="All">📍 كل إدارات التنفيذ المختصة (التحليل العام)</option>
              {regionOptions.map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Central Filter */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-600" />
              <span>السنترال (Central)</span>
              {centralOptions.length > 0 && (
                <span className="text-[10px] text-slate-400">({centralOptions.length})</span>
              )}
            </label>
            <select
              value={selectedCentral}
              onChange={(e) => {
                setSelectedCentral(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full py-2 px-2.5 border rounded-xl text-xs font-medium outline-none transition ${
                selectedCentral !== 'All'
                  ? 'bg-emerald-50/80 border-emerald-400 text-emerald-900 font-bold ring-2 ring-emerald-500/10'
                  : 'bg-white border-slate-300 text-slate-800 focus:border-emerald-500'
              }`}
            >
              <option value="All">🏛️ كل السنترالات (التحليل العام)</option>
              {centralOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 4. General Status Filter */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-600" />
              <span>الموقف العام (General Status)</span>
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full py-2 px-2.5 border rounded-xl text-xs font-medium outline-none transition ${
                selectedStatus !== 'All'
                  ? 'bg-amber-50/80 border-amber-400 text-amber-900 font-bold ring-2 ring-amber-500/10'
                  : 'bg-white border-slate-300 text-slate-800 focus:border-amber-500'
              }`}
            >
              <option value="All">🎯 كل الحالات (التحليل العام)</option>
              {ALL_STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── KPI Metrics Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Sites */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-medium">إجمالي المواقع</span>
            <span className="text-base font-bold font-mono text-slate-900">{totalSites}</span>
          </div>
        </div>

        {/* Total Links */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-medium">مسارات الربط</span>
            <span className="text-base font-bold font-mono text-purple-900">{totalLinks}</span>
          </div>
        </div>

        {/* Completed Sites */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-medium">
              تم التسليم ({completionRate}%)
            </span>
            <span className="text-base font-bold font-mono text-emerald-700">{completedCount}</span>
          </div>
        </div>

        {/* In Progress */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-medium">جاري العمل والتصاريح</span>
            <span className="text-base font-bold font-mono text-amber-700">{inProgressCount}</span>
          </div>
        </div>

        {/* Obstacles & Defaults */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-medium">معوقات ومتعثرات</span>
            <span className="text-base font-bold font-mono text-rose-700">{obstaclesCount}</span>
          </div>
        </div>
      </div>

      {/* ── Visual Charts: Donut Chart + Summary Table ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DonutChart
          data={statusSummaries}
          totalSites={totalSites}
          activeStatusFilter={selectedStatus !== 'All' ? selectedStatus : ''}
          onSelectStatus={(status) => {
            setSelectedStatus((prev) => (prev === status ? 'All' : status));
            setCurrentPage(1);
          }}
        />
        <SummaryTable
          data={statusSummaries}
          totalSites={totalSites}
          totalLinks={totalLinks}
          activeStatusFilter={selectedStatus !== 'All' ? selectedStatus : ''}
          onSelectStatus={(status) => {
            setSelectedStatus((prev) => (prev === status ? 'All' : status));
            setCurrentPage(1);
          }}
          onOpenDetailsModal={() => {}}
        />
      </div>

      {/* ── Filtered Sites Table with Instant Search & Pagination ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">📋 جدول المواقع المشمولة بالتحليل:</span>
            <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {filteredSites.length} موقع
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="بحث بالكود أو السنترال..."
              className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition"
            />
            <Search className="absolute right-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-2.5 font-mono">كود الموقع</th>
                <th className="p-2.5">السنترال</th>
                <th className="p-2.5">ادارة التنفيذ المختصة</th>
                <th className="p-2.5">القطاع</th>
                <th className="p-2.5">الموقف العام</th>
                <th className="p-2.5 font-mono">تاريخ الانتهاء</th>
                <th className="p-2.5 text-center">الإنجاز</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedSites.map((site) => {
                const cfg = STATUS_CONFIG[site.status] || {
                  color: '#64748b',
                  bgLight: '#f1f5f9',
                  border: '#cbd5e1',
                  textColor: '#334155',
                };
                return (
                  <tr key={site.id} className="hover:bg-blue-50/40 transition">
                    <td className="p-2.5 font-mono font-bold text-blue-700" dir="ltr">
                      {site.siteCode}
                    </td>
                    <td className="p-2.5 font-medium text-slate-800">
                      {site.central || 'سنترال رئيسي'}
                    </td>
                    <td className="p-2.5 text-slate-600">
                      {site.competentAdmin || site.generalAdmin || '—'}
                    </td>
                    <td className="p-2.5 text-slate-700 font-medium">
                      {site.sector}
                    </td>
                    <td className="p-2.5">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{
                          backgroundColor: cfg.bgLight,
                          color: cfg.textColor,
                          borderColor: cfg.border,
                          borderWidth: 1,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: cfg.color }}
                        />
                        {site.status}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono text-slate-500 text-[11px]">
                      {site.expectedDate || '---'}
                    </td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all"
                            style={{ width: `${site.progressPercent || 35}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-slate-500 font-bold">
                          {site.progressPercent || 35}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {pagedSites.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    لا توجد مواقع مطابقة للفلاتر المحددة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              صفحة {currentPage} من {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-white transition cursor-pointer"
                title="السابق"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-white transition cursor-pointer"
                title="التالي"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
