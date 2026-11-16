import { useState, useMemo, useCallback, useEffect } from 'react';
import { Header } from '../components/Header';
import { KpiCards } from '../components/KpiCards';
import { DonutChart } from '../components/DonutChart';
import { SummaryTable } from '../components/SummaryTable';
import { Filters } from '../components/Filters';
import { SiteDetailsModal } from '../components/SiteDetailsModal';
import { ExcelUploaderModal } from '../components/ExcelUploaderModal';
import { TopNavBar } from '../components/TopNavBar';
import type { ActiveProjectScope } from '../components/TopNavBar';
import { WeAddDataModal } from '../components/WeAddDataModal';
import { WeDataAnalysisModal } from '../components/WeDataAnalysisModal';
import { WeDataManagerModal } from '../components/WeDataManagerModal';
import { WeeklyPerformanceLineChart } from '../components/WeeklyPerformanceLineChart';
import { WeBulkImportModal } from '../components/WeBulkImportModal';
import { LoginModal } from '../components/LoginModal';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Building2, Eye, LogIn, Lock, LogOut, Globe, Trash2, PlusCircle, Edit3, X, Search, AlertTriangle, Landmark, Mail, PieChart } from 'lucide-react';
import { isRecordInSector, toCanonicalSector } from '../utils/sectorPermissions';
import { getSiteCompetentAdmin } from '../data/siteAdminMapping';
import { useWeRecords, useWeSiteCodes, exportToCSV, deleteRecord } from '../hooks/useWeAPI';
import type { WeRecord } from '../config/fieldConfig';
import { normalizeClassification } from '../config/fieldConfig';
import { useOrangeAPI } from '../hooks/useOrangeAPI';
import type { OrangeRecord } from '../types/orange';
import { OrangeAddDataModal } from '../components/OrangeAddDataModal';
import { OrangeBulkImportModal } from '../components/OrangeBulkImportModal';
import { OrangeDataAnalysisModal } from '../components/OrangeDataAnalysisModal';

import { useVodafoneAPI } from '../hooks/useVodafoneAPI';
import { VodafoneBulkImportModal } from '../components/VodafoneBulkImportModal';
import { useEtahaAPI } from '../hooks/useEtahaAPI';
import { EtahaBulkImportModal } from '../components/EtahaBulkImportModal';
import { WeExecutiveReportView } from '../components/WeExecutiveReportView';


import {
  calculateStatusSummaries,
  getWeExactCategory,
  getSiteClassification,
  isClassificationCompleted,
  isClassificationInProgress,
  isClassificationBlocked,
  isClassificationPermits,
  isClassificationPlanned,
} from '../data/dashboardData';
import { isSiteCompleted } from '../utils/weSectorMetrics';
import {
  FTTS_EXCEL_SITES,
  WE_EXCEL_SITES,
  ETAHA_EXCEL_SITES,
  TAHAWOL_EXCEL_SITES,
} from '../data/preloadedProjects';
import type {
  FilterState,
  KpiData,
  SiteRecord,
  StatusType,
  ExecutionCategory,
  UploadedFileMetadata
} from '../types/dashboard';

const initialFilters: FilterState = {
  company: 'All',
  sector: '',
  generalAdmin: '',
  competentAdmin: '',
  central: '',
  classification: '',
  obstacleReason: '',
  status: '',
  expectedDate: '',
  searchQuery: '',
  subSector: '',
};

// Helper: Map a dynamic WeRecord from Supabase to SiteRecord format for dashboard strictly based on Excel
function mapWeRecordToSiteRecord(r: WeRecord, index = 0): SiteRecord {
  const siteCode = (r[' Site code'] || r['site code'] || r['Site code'] || (r as any).site_code || `SITE-${index + 1}`).trim();
  const rawTasneef = String(r['التصنيف'] || '').trim();

  const tasneef = rawTasneef || 'غير محدد';
  let status: StatusType = (tasneef as StatusType) || 'غير محدد';

  let executionCategory: ExecutionCategory = 'In Progress';
  if (isClassificationCompleted(tasneef)) {
    executionCategory = 'Completed';
  } else if (isClassificationPlanned(tasneef)) {
    executionCategory = 'Planned';
  } else if (isClassificationBlocked(tasneef)) {
    executionCategory = 'Blocked / On Hold';
  } else {
    executionCategory = 'In Progress';
  }

  const type = String(r['Type'] || '');
  const company: 'WE' | 'Vodafone' | 'Orange' = 'WE';

  const central = String(r['سنترال الربط'] || r['السنترال'] || r['قطاع المناطق'] || 'سنترال رئيسي').trim();
  const rawSectore = r['رئاسة قطاعات التنفيذ'] || r['Sectore'] || r['Sectores'] || r['Exc sector'] || r['Zone'] || '';
  const sector = String(rawSectore).trim() || 'قطاع عام';

  const generalAdmin = String(r['الادارة العامة لتنفيذ الشبكات'] || r['الادارة العامة للمنطقة'] || r['اداره التنفيذ المختصه'] || r['Exc Zone'] || 'الإدارة العامة لتنفيذ الشبكات').trim();
  const competentAdmin = String(r['ادارة التنفيذ الفرعية'] || r['إدارة التنفيذ المختصة'] || r['اداره التنفيذ المختصه'] || r['Area'] || 'إدارة التنفيذ والمسارات').trim();
  const classification = tasneef;
  const obstacleReason = String(r['اسباب التعّذر'] || r['اسباب التعذر'] || r['الملاحظات'] || 'لا يوجد تعذر').trim();
  const expectedDate = r['خطة'] ? `${r['خطة']}-12-31` : (r['التاريخ المتوقع للانتهاء'] || '2026-12-31');

  let progressPercent = 25;
  if (isClassificationCompleted(status)) progressPercent = 100;
  else if (status.includes('كهرب')) progressPercent = 75;
  else if (status.includes('مدني') || status.includes('عمل')) progressPercent = 60;
  else if (status.includes('تصاريح')) progressPercent = 40;
  else if (status.includes('معوق')) progressPercent = 30;
  else if (status.includes('متعذر') || status.includes('تعذر')) progressPercent = 15;
  else if (status.includes('معاين')) progressPercent = 20;

  return {
    id: r._id || `WE-${index + 1}`,
    siteCode,
    siteName: `موقع ${siteCode} - ${central}`,
    company,
    status,
    executionCategory,
    linksCount: 1,
    sector,
    generalAdmin,
    competentAdmin,
    central,
    classification,
    obstacleReason,
    expectedDate,
    progressPercent,
    civilContractor: String(r['مسئولية التنفيذ'] || r['المسئولية'] || 'WE').trim(),
    notes: String(r['الملاحظات'] || r['اسباب التعّذر'] || r['اسباب التعذر'] || r['الجهة المطلوب الدعم منها'] || '').trim(),
    subSector: String(r['قطاع المناطق'] || '').trim(),
    executionSector: String(r['قطاع التنفيذ'] || '').trim(),
    address: String(r['Address'] || '').trim(),
    responsibility: String(r['مسئولية التنفيذ'] || 'WE').trim(),
    lat: r['NLatitude'] || '',
    lng: r['NLongitude'] || '',
    rawRecord: r,
  };
}

export const Dashboard: React.FC = () => {
  const { user, isLoginModalOpen, closeLoginModal, openLoginModal, logout } = useAuth();

  // Current active project scope: FTTS, ETAHA, TAHAWOL, or UPLOADED
  const [activeScope, setActiveScope] = useState<ActiveProjectScope>('FTTS');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Custom uploaded file states
  const [uploadedSites, setUploadedSites] = useState<SiteRecord[]>([]);
  const [uploadedMetadata, setUploadedMetadata] = useState<UploadedFileMetadata | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // WE specific UI states
  const [isWeAnalysisOpen, setIsWeAnalysisOpen] = useState(false);
  const [isWeAddDataOpen, setIsWeAddDataOpen] = useState(false);
  const [isWeManagerOpen, setIsWeManagerOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [editingSiteCode, setEditingSiteCode] = useState<string | undefined>(undefined);
  const [editingRecord, setEditingRecord] = useState<WeRecord | null>(null);
  const [weModalMode, setWeModalMode] = useState<'add' | 'edit'>('edit');

  // Orange specific UI states
  const [isOrangeAnalysisOpen, setIsOrangeAnalysisOpen] = useState(false);
  const [isOrangeAddDataOpen, setIsOrangeAddDataOpen] = useState(false);
  const [isOrangeBulkImportOpen, setIsOrangeBulkImportOpen] = useState(false);
  const [orangeEditingSiteCode, setOrangeEditingSiteCode] = useState<string | undefined>(undefined);
  const [orangeEditingRecord, setOrangeEditingRecord] = useState<OrangeRecord | null>(null);
  const [orangeModalMode, setOrangeModalMode] = useState<'add' | 'edit'>('edit');

  // Vodafone specific UI states & live dataset
  const {
    vodafoneRecords,
    vodafoneSites,
    bulkImportVodafoneRecords,
    refetchVodafoneRecords,
  } = useVodafoneAPI();
  const [isVodafoneBulkImportOpen, setIsVodafoneBulkImportOpen] = useState(false);

  // Availability / Etaha specific UI states & live dataset
  const {
    etahaRecords,
    etahaSites,
    saveEtahaRecord,
    deleteEtahaRecord,
    bulkImportEtahaRecords,
    refetchEtahaRecords,
  } = useEtahaAPI();
  const [isEtahaBulkImportOpen, setIsEtahaBulkImportOpen] = useState(false);

  // Quick delete site states from control panel
  const [isQuickDeleteModalOpen, setIsQuickDeleteModalOpen] = useState(false);
  const [quickDeleteSearch, setQuickDeleteSearch] = useState('');
  const [quickDeleteSelectedCode, setQuickDeleteSelectedCode] = useState<string>('');
  const [isDeletingQuick, setIsDeletingQuick] = useState(false);

  // Set of deleted site codes / IDs for instant optimistic UI reflection across fallback & database
  const [deletedSiteCodes, setDeletedSiteCodes] = useState<Set<string>>(new Set());

  // Live WE records and site codes from Supabase cloud database
  const {
    records: weCentralRecords,
    loading: weRecordsLoading,
    refetch: refetchWeRecords,
    updateOrAddRecordLocally,
    removeRecordLocally: _removeRecordLocally
  } = useWeRecords();
  const {
    codes: weCentralCodes,
    loading: weCodesLoading,
    refetch: refetchWeCodes,
    addCodeLocally
  } = useWeSiteCodes();

  // Live Orange records from Orange API
  const {
    orangeRecords,
    orangeSites,
    saveOrangeRecord,
    deleteOrangeRecord,
    bulkImportOrangeRecords,
    refetchOrangeRecords,
  } = useOrangeAPI();

  // Instant handler for adding/editing records with immediate local state reflection
  const handleWeRecordSaved = useCallback((savedRecord: WeRecord) => {
    const recordToSave = { ...savedRecord };
    if (user && user.role !== 'admin' && user.sector && user.sector !== 'ALL') {
      recordToSave['Exc sector'] = user.sector;
      recordToSave['Sectores'] = user.sector;
      recordToSave['Exc Sectores'] = user.sector;
    }
    updateOrAddRecordLocally(recordToSave);
    const code = recordToSave['site code'] || (recordToSave as any).site_code;
    if (code) {
      addCodeLocally(code);
      setDeletedSiteCodes((prev) => {
        const next = new Set(prev);
        next.delete(code);
        return next;
      });
    }
    // Background cloud sync
    refetchWeRecords();
    refetchWeCodes();
    setToastMessage(`تم حفظ بيانات الموقع (${code || ''}) بنجاح في قاعدة البيانات ✅`);
  }, [user, updateOrAddRecordLocally, addCodeLocally, refetchWeRecords, refetchWeCodes]);

  // Robust deletion handler with immediate optimistic removal & Supabase delete
  const handleDeleteSite = useCallback(
    async (siteOrCode: SiteRecord | string) => {
      const siteCode = typeof siteOrCode === 'string' ? siteOrCode : siteOrCode.siteCode;
      const siteId = typeof siteOrCode === 'string' ? siteOrCode : (siteOrCode.id || siteOrCode.siteCode);
      const siteName = typeof siteOrCode === 'string' ? siteOrCode : (siteOrCode.siteName || siteCode);

      try {
        // 1. Optimistic instant local removal
        setDeletedSiteCodes((prev) => {
          const next = new Set(prev);
          next.add(siteCode);
          if (siteId) next.add(siteId);
          return next;
        });
        _removeRecordLocally(siteCode);
        if (siteId && siteId !== siteCode) {
          _removeRecordLocally(siteId);
        }

        // 2. Database cloud deletion
        const res = await deleteRecord(siteId || siteCode);
        if (res.success) {
          setToastMessage(`تم حذف وإلغاء الموقع (${siteCode} - ${siteName}) بنجاح من قاعدة البيانات ✅`);
          refetchWeRecords();
          refetchWeCodes();
          return true;
        } else {
          setToastMessage(`فشل حذف الموقع من السحابة: ${res.error || 'خطأ غير معروف'}`);
          return false;
        }
      } catch (err: any) {
        setToastMessage(`خطأ أثناء حذف الموقع: ${err?.message || 'فشل الاتصال'}`);
        return false;
      }
    },
    [_removeRecordLocally, refetchWeRecords, refetchWeCodes]
  );

  // Convert live Supabase WE records to SiteRecord format
  const liveWeSites = useMemo<SiteRecord[]>(() => {
    let baseSites: SiteRecord[] = [];
    if (weCentralRecords && weCentralRecords.length > 0) {
      baseSites = weCentralRecords.map((r, i) => mapWeRecordToSiteRecord(r, i));
    } else {
      baseSites = WE_EXCEL_SITES;
    }
    if (deletedSiteCodes.size === 0) return baseSites;
    return baseSites.filter((s) => !deletedSiteCodes.has(s.siteCode) && !deletedSiteCodes.has(s.id));
  }, [weCentralRecords, deletedSiteCodes]);

  // Combined FTTS dataset: WE (1029 sites) + Vodafone (699 sites) + Orange (480 sites) = Total FTTS Plan (2208 sites)
  const combinedFttsSites = useMemo<SiteRecord[]>(() => {
    // 1. All WE sites (from master plan)
    const weSites = liveWeSites.map((s) => ({ ...s, company: 'WE' as const }));

    // 2. Official Vodafone Sites (699 sites from official FTTS master plan)
    const vdfSites = vodafoneSites.map((s) => ({
      ...s,
      company: 'Vodafone' as const,
    }));

    // 3. Official Orange Sites (480 sites from official Orange network report)
    const orgSites = orangeSites.map((s) => ({
      ...s,
      company: 'Orange' as const,
    }));

    // Total FTTS Plan = WE (1029) + Vodafone (699) + Orange (480) = 2208 sites
    return [...weSites, ...vdfSites, ...orgSites];
  }, [liveWeSites, vodafoneSites, orangeSites]);

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [donutResetKey, setDonutResetKey] = useState(0);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [modalFilterStatus, setModalFilterStatus] = useState<string | undefined>(undefined);
  // View mode toggle for Overall Sites Execution Status: 'graphical' (Donut + Summary Table) vs 'executive' (Detailed Rollout Report)
  const [executionViewMode, setExecutionViewMode] = useState<'graphical' | 'executive'>('graphical');

  // Active base dataset according to selected project scope
  const currentScopeData = useMemo(() => {
    switch (activeScope) {
      case 'FTTS':
        return combinedFttsSites;
      case 'AVAILABILITY':
      case 'ETAHA':
        return etahaSites;
      case 'TAHAWOL':
        return TAHAWOL_EXCEL_SITES;
      case 'UPLOADED':
        return uploadedSites.length > 0 ? uploadedSites : combinedFttsSites;
      default:
        return combinedFttsSites;
    }
  }, [activeScope, uploadedSites, combinedFttsSites, etahaSites]);

  // Apply Strict Role-Based Access Control (RBAC):
  // - Admin: All sectors appear in the dashboard
  // - Specific Sector (e.g. Planning, Operations, or geographical sector):
  //   ONLY data belonging to that sector appears; all other sectors are strictly hidden and blocked!
  const authorizedScopeData = useMemo(() => {
    if (!user) return [];
    let base = currentScopeData;
    if (deletedSiteCodes.size > 0) {
      base = base.filter((s) => !deletedSiteCodes.has(s.siteCode) && !deletedSiteCodes.has(s.id));
    }
    if (user.role === 'admin' || user.sector === 'ALL') {
      return base;
    }
    return base.filter((site) => isRecordInSector(user.sector, site));
  }, [currentScopeData, user, deletedSiteCodes]);

  // Matching sites for Quick Delete Modal
  const matchingDeleteSites = useMemo(() => {
    const q = quickDeleteSearch.toLowerCase().trim();
    if (!q) return authorizedScopeData.slice(0, 30);
    return authorizedScopeData.filter(
      (s) =>
        s.siteCode.toLowerCase().includes(q) ||
        s.siteName.toLowerCase().includes(q) ||
        s.central.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [authorizedScopeData, quickDeleteSearch]);

  const selectedDeleteSite = useMemo(() => {
    if (!quickDeleteSelectedCode) return null;
    return authorizedScopeData.find((s) => s.siteCode === quickDeleteSelectedCode) || null;
  }, [authorizedScopeData, quickDeleteSelectedCode]);

  // Base dataset for interactive filtering (strictly scoped to selected operator, e.g. "WE")
  const baseFilterSites = useMemo(() => {
    if (filters.company && filters.company !== 'All') {
      return authorizedScopeData.filter((s) => s.company === filters.company);
    }
    return authorizedScopeData;
  }, [authorizedScopeData, filters.company]);

  // WE Central Records scoped to user's sector
  const authorizedWeCentralRecords = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin' || user.sector === 'ALL') return weCentralRecords;
    return weCentralRecords.filter((r) => isRecordInSector(user.sector, r));
  }, [weCentralRecords, user]);

  // WE Site Codes scoped to user's sector
  const authorizedWeCodes = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin' || user.sector === 'ALL') return weCentralCodes;
    const sectorSites = liveWeSites.filter((s) => isRecordInSector(user.sector, s));
    return [...new Set(sectorSites.map((s) => s.siteCode))].sort();
  }, [weCentralCodes, liveWeSites, user]);

  // Dynamic filter application across authorized scope
  const filteredSites = useMemo(() => {
    return authorizedScopeData.filter((site) => {
      // 1. Company / Category Filter
      if (filters.company !== 'All') {
        if (activeScope === 'FTTS') {
          if (site.company !== filters.company) return false;
        } else if (activeScope === 'ETAHA') {
          // Filter by client category or classification
          if (filters.company === 'التعليم' && !site.siteName.includes('التربية والتعليم') && !site.classification.includes('تعليم')) return false;
          if (filters.company === 'البنوك' && !site.siteName.includes('بنك') && !site.siteName.includes('مصرف') && !site.siteName.includes('الأهلي') && !site.siteName.includes('مصر')) return false;
          if (filters.company === 'الجمارك والضرائب' && !site.siteName.includes('جمارك') && !site.siteName.includes('ضرائب')) return false;
        } else if (activeScope === 'TAHAWOL') {
          // Filter by ministry
          if (filters.company === 'الداخلية' && !site.siteName.includes('الداخلية') && !site.classification.includes('الداخلية')) return false;
          if (filters.company === 'العدل' && !site.siteName.includes('العدل') && !site.classification.includes('العدل')) return false;
          if (filters.company === 'الصحة' && !site.siteName.includes('الصحة') && !site.classification.includes('الصحة')) return false;
        } else if (site.company !== filters.company) {
          return false;
        }
      }

      // 2. Status / Exact Excel Classification Filter
      if (filters.status && filters.status !== 'All') {
        const fs = filters.status.trim();
        const siteCat = getSiteClassification(site);

        if (siteCat === fs || site.status === fs || site.classification === fs) {
          // exact match
        } else if (fs === 'المكتمل' || fs === 'Completed') {
          if (!isClassificationCompleted(siteCat)) return false;
        } else if (fs === 'متعذر / معوقات' || fs === 'Blocked / On Hold') {
          if (!isClassificationBlocked(siteCat)) return false;
        } else {
          return false;
        }
      }
      // 3. Expected Date Filter
      if (filters.expectedDate && site.expectedDate > filters.expectedDate) {
        return false;
      }
      // 4. Sector Filter
      if (filters.sector && filters.sector !== 'All') {
        if (!isRecordInSector(filters.sector, site)) {
          return false;
        }
      }
      // 5. General Admin Filter
      if (filters.generalAdmin && String(site.generalAdmin || '').trim() !== String(filters.generalAdmin).trim()) {
        return false;
      }
      // 5.5 SubSector / الإدارة المختصة Filter (Orange 4-tier hierarchy)
      if (filters.subSector && String(site.subSector || '').trim() !== String(filters.subSector).trim()) {
        return false;
      }
      // 6. Competent Admin Filter
      if (filters.competentAdmin && String(site.competentAdmin || '').trim() !== String(filters.competentAdmin).trim()) {
        return false;
      }
      // 7. Central / Exchange Filter
      if (filters.central && String(site.central || '').trim() !== String(filters.central).trim()) {
        return false;
      }
      // 8. Classification Filter (Strict Excel Match)
      if (filters.classification && filters.classification !== 'All') {
        const siteCat = getSiteClassification(site);
        const fc = filters.classification.trim();
        if (siteCat !== fc && String(site.classification || '').trim() !== fc) {
          return false;
        }
      }
      // 9. Obstacle Reason Filter
      if (filters.obstacleReason && String(site.obstacleReason || '').trim() !== String(filters.obstacleReason).trim()) {
        return false;
      }

      return true;
    });
  }, [authorizedScopeData, filters, activeScope]);

  // Compute status breakdown table and donut chart data (strictly based on the exact classifications present in the uploaded Excel data)
  const statusSummaries = useMemo(() => {
    return calculateStatusSummaries(filteredSites);
  }, [filteredSites]);

  // Scope dataset for KPI cards & Status Tabs (scoped to sector/admin/search, without status filter)
  const kpiScopeSites = useMemo(() => {
    return authorizedScopeData.filter((site) => {
      // 1. Company Filter
      if (filters.company !== 'All') {
        if (activeScope === 'FTTS') {
          if (site.company !== filters.company) return false;
        } else if (activeScope === 'ETAHA') {
          if (filters.company === 'التعليم' && !site.siteName.includes('التربية والتعليم') && !site.classification.includes('تعليم')) return false;
          if (filters.company === 'البنوك' && !site.siteName.includes('بنك') && !site.siteName.includes('مصرف') && !site.siteName.includes('الأهلي') && !site.siteName.includes('مصر')) return false;
          if (filters.company === 'الجمارك والضرائب' && !site.siteName.includes('جمارك') && !site.siteName.includes('ضرائب')) return false;
        } else if (activeScope === 'TAHAWOL') {
          if (filters.company === 'الداخلية' && !site.siteName.includes('الداخلية') && !site.classification.includes('الداخلية')) return false;
          if (filters.company === 'العدل' && !site.siteName.includes('العدل') && !site.classification.includes('العدل')) return false;
          if (filters.company === 'الصحة' && !site.siteName.includes('الصحة') && !site.classification.includes('الصحة')) return false;
        } else if (site.company !== filters.company) {
          return false;
        }
      }
      // 2. Expected Date Filter
      if (filters.expectedDate && site.expectedDate > filters.expectedDate) return false;
      // 3. Sector Filter
      if (filters.sector && filters.sector !== 'All') {
        if (!isRecordInSector(filters.sector, site)) return false;
      }
      // 4. General Admin Filter
      if (filters.generalAdmin && String(site.generalAdmin || '').trim() !== String(filters.generalAdmin).trim()) {
        return false;
      }
      // 5. SubSector Filter
      if (filters.subSector && String(site.subSector || '').trim() !== String(filters.subSector).trim()) {
        return false;
      }
      // 6. Competent Admin Filter
      if (filters.competentAdmin && String(site.competentAdmin || '').trim() !== String(filters.competentAdmin).trim()) {
        return false;
      }
      // 7. Central Filter
      if (filters.central && String(site.central || '').trim() !== String(filters.central).trim()) {
        return false;
      }
      // 8. Obstacle Reason Filter
      if (filters.obstacleReason && String(site.obstacleReason || '').trim() !== String(filters.obstacleReason).trim()) {
        return false;
      }
      return true;
    });
  }, [authorizedScopeData, filters.company, filters.expectedDate, filters.sector, filters.generalAdmin, filters.subSector, filters.competentAdmin, filters.central, filters.obstacleReason, activeScope]);

  // Compute live KPIs reflecting the exact 8 Excel classifications dynamically
  const kpis: KpiData = useMemo(() => {
    const totalSites = kpiScopeSites.length;
    const totalLinks = kpiScopeSites.reduce((sum, s) => sum + (s.linksCount || 1), 0);

    const completedSites = kpiScopeSites.filter((s) => getSiteClassification(s) === 'تم الانتهاء').length;
    const fiberActiveSites = kpiScopeSites.filter((s) => getSiteClassification(s) === 'تم التشغيل فايبر').length;
    const civilDoneSites = kpiScopeSites.filter((s) => getSiteClassification(s) === 'تم مدني').length;
    const inProgressSites = kpiScopeSites.filter((s) => getSiteClassification(s) === 'جاري العمل').length;
    const surveySites = kpiScopeSites.filter((s) => getSiteClassification(s) === 'جاري المعاينة').length;
    const permitsSites = kpiScopeSites.filter((s) => getSiteClassification(s) === 'جاري تصريح').length;
    const stalledSites = kpiScopeSites.filter((s) => getSiteClassification(s) === 'متعذر').length;
    const obstaclesSites = kpiScopeSites.filter((s) => getSiteClassification(s) === 'معوقات').length;

    const achieved = completedSites + fiberActiveSites + civilDoneSites;
    const completionRate = totalSites > 0
      ? Number(((achieved / totalSites) * 100).toFixed(1))
      : 0;

    return {
      totalSites,
      totalLinks,
      completedSites,
      fiberActiveSites,
      civilDoneSites,
      inProgressSites,
      surveySites,
      permitsSites,
      stalledSites,
      obstaclesSites,
      plannedSites: surveySites,
      blockedSites: stalledSites + obstaclesSites,
      permitsCount: permitsSites,
      obstaclesCount: obstaclesSites,
      stalledCount: stalledSites,
      completionRate,
    };
  }, [kpiScopeSites]);

  // FTTS Operator cards stats scoped to user's authorized dataset
  const companyStats = useMemo(() => {
    const fttsScoped = user && user.role !== 'admin' && user.sector !== 'ALL'
      ? combinedFttsSites.filter((s) => isRecordInSector(user.sector, s))
      : combinedFttsSites;

    const weSites = fttsScoped.filter((s) => s.company === 'WE');
    const vodafoneSites = fttsScoped.filter((s) => s.company === 'Vodafone');
    const orangeSites = fttsScoped.filter((s) => s.company === 'Orange');

    return {
      allCount: fttsScoped.length,
      allLinks: fttsScoped.reduce((sum, s) => sum + s.linksCount, 0),
      weCount: weSites.length,
      weLinks: weSites.reduce((sum, s) => sum + s.linksCount, 0),
      vodafoneCount: vodafoneSites.length,
      vodafoneLinks: vodafoneSites.reduce((sum, s) => sum + s.linksCount, 0),
      orangeCount: orangeSites.length,
      orangeLinks: orangeSites.reduce((sum, s) => sum + s.linksCount, 0),
    };
  }, [combinedFttsSites, user]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.company !== 'All') count++;
    if (filters.status) count++;
    if (filters.expectedDate) count++;
    if (filters.sector) count++;
    if (filters.generalAdmin) count++;
    if (filters.subSector) count++;
    if (filters.competentAdmin) count++;
    if (filters.classification) count++;
    if (filters.obstacleReason) count++;
    return count;
  }, [filters]);

  const handleFilterChange = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleResetFilters = () => {
    setFilters((prev) => ({
      ...initialFilters,
      company: prev.company, // Preserves the current mobile operator (WE, Vodafone, Orange, or All)
    }));
    setModalFilterStatus(undefined);
    setDonutResetKey((k) => k + 1);
  };

  const handleScopeChange = (scope: ActiveProjectScope) => {
    setActiveScope(scope);
    setFilters(initialFilters);
    setModalFilterStatus(undefined);
    setDonutResetKey((k) => k + 1);
  };

  const handleStatusSelect = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status === status || status === 'All' ? '' : status,
    }));
  };

  const handleOpenDetails = (status?: string) => {
    setModalFilterStatus(status);
    setIsDetailsModalOpen(true);
  };

  // Switch to uploaded Excel data
  const handleApplyUploadedData = (newSites: SiteRecord[], metadata: UploadedFileMetadata) => {
    setUploadedSites(newSites);
    setUploadedMetadata(metadata);
    setActiveScope('UPLOADED');
    setFilters(initialFilters);
    setModalFilterStatus(undefined);
    setDonutResetKey((k) => k + 1);
  };

  // Reset to original baseline data
  const handleResetToDefault = () => {
    setActiveScope('FTTS');
    setUploadedMetadata(null);
    setFilters(initialFilters);
    setModalFilterStatus(undefined);
    setDonutResetKey((k) => k + 1);
  };

  // CSV Export
  const handleExportFullCsv = () => {
    const headers = [
      'Site ID',
      'Site Code',
      'Site Name',
      'Company / Entity',
      'Status',
      'Links Count',
      'Sector',
      'Central / Governorate',
      'General Admin',
      'Competent Admin',
      'Classification',
      'Expected Date',
      'Progress %',
      'Contractor',
      'Obstacle Reason',
      'Notes',
    ];

    const rows = filteredSites.map((s) => [
      s.id,
      s.siteCode,
      `"${s.siteName}"`,
      `"${s.company}"`,
      `"${s.status}"`,
      s.linksCount,
      `"${s.sector}"`,
      `"${s.central}"`,
      `"${s.generalAdmin}"`,
      `"${s.competentAdmin}"`,
      `"${s.classification}"`,
      s.expectedDate,
      `${s.progressPercent}%`,
      `"${s.civilContractor || ''}"`,
      `"${s.obstacleReason || ''}"`,
      `"${s.notes || ''}"`,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Project_${activeScope}_Export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100/70 p-3 sm:p-5 lg:p-7 text-slate-800 font-sans">
      <div className="max-w-[1600px] mx-auto">
        {/* 1. Header with Upload Action */}
        <Header
          onResetFilters={handleResetFilters}
          activeFiltersCount={activeFiltersCount}
          totalFilteredSites={filteredSites.length}
          totalBaselineSites={authorizedScopeData.length}
          onExportCsv={handleExportFullCsv}
          onPrint={handlePrint}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          activeUploadedMetadata={uploadedMetadata}
          onResetToDefault={handleResetToDefault}
        />

        {/* 1.5 Sector Permissions Status Banner (Strict RBAC) */}
        <div className="mb-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-4 border border-blue-500/30 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 text-sky-300">
              {user?.role === 'admin' ? (
                <ShieldCheck className="w-5 h-5 text-purple-300" />
              ) : user?.role === 'viewer' ? (
                <Eye className="w-5 h-5 text-slate-300" />
              ) : (
                <Building2 className="w-5 h-5 text-emerald-300" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-sky-200">
                  {user ? `مرحباً بك، ${user.displayName}` : 'جلسة غير مسجلة'}
                </span>
                {user && user.role !== 'admin' && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-bold">
                    قطاع: {user.sector}
                  </span>
                )}
                {user && user.role === 'admin' && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/40 font-bold">
                    الإدارة العامة المركزية
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {user?.role === 'admin' ? (
                  <span className="text-purple-200 font-medium">
                    صلاحية مدير عام (Admin): تظهر كافة قطاعات الجمهورية في لوحة البيانات مع صلاحية كاملة للإدارة والتعديل.
                  </span>
                ) : !user ? (
                  <span className="text-slate-300">
                    يرجى تسجيل الدخول للوصول إلى بيانات قطاعك المحددة وفقاً لسياسة الأمان.
                  </span>
                ) : (
                  <span className="text-sky-100">
                    نظام أمان صارم (RBAC): معروض بيانات قطاع <strong className="text-emerald-300">({user.sector})</strong> فقط • تم حجب وعزل كافة القطاعات والأقسام الأخرى نهائياً.
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end flex-wrap">
            {user && user.role !== 'admin' && user.sector && (
              <div className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 shadow-sm">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>نطاق معزول: {user.sector} (محجوب ما دونه)</span>
              </div>
            )}

            <button
              onClick={openLoginModal}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 rounded-xl text-xs font-bold border border-amber-400/40 transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
              title="عرض جدول حسابات وكلمات مرور القطاعات المعتمدة"
            >
              <span>🔑 جدول الحسابات</span>
            </button>

            <button
              onClick={openLoginModal}
              className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold border border-blue-400/40 transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-sky-200" />
              <span>{user ? 'تبديل الحساب' : 'تسجيل الدخول'}</span>
            </button>

            {user && (
              <button
                onClick={logout}
                className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-200 rounded-xl text-xs font-bold border border-rose-500/40 transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                title="تسجيل الخروج"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-300" />
                <span>خروج</span>
              </button>
            )}
          </div>
        </div>

        {/* Floating Toast Notification Popup */}
        {toastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-amber-500/40 flex items-center gap-3.5 animate-in fade-in slide-in-from-top-4 duration-300 backdrop-blur-md ring-2 ring-amber-500/20 max-w-md">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 flex-shrink-0">
              <span className="text-lg">⏳</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-black text-xs text-amber-300 uppercase tracking-wider">
                  Coming Soon
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200 border border-amber-400/30 font-bold">
                  قريباً في التحديثات القادمة
                </span>
              </div>
              <span className="text-xs text-slate-100 font-medium block mt-0.5">
                {toastMessage}
              </span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer text-sm transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* 2. Top Navigation Bar (English: FTTS Plan & Availability with interactive dropdowns & sub-options cards) */}
        <TopNavBar
          activeScope={activeScope}
          onChangeScope={handleScopeChange}
          selectedCompany={filters.company}
          onChangeCompany={(c) => handleFilterChange('company', c)}
          onShowToast={(title, sub) =>
            setToastMessage(`${title}: ${sub || 'قريباً في التحديثات القادمة'}`)
          }
          stats={companyStats}
          hasUploadedFile={Boolean(uploadedMetadata)}
          uploadedFileName={uploadedMetadata?.fileName}
          onSelectUploaded={() => handleScopeChange('UPLOADED')}
        />

        {activeScope === 'TAHAWOL' ? (
          <div className="pbi-card p-8 my-6 text-center bg-white/95 border border-dashed border-amber-300 rounded-2xl shadow-xs">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-sm">
              <Landmark className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">
              مشروعات التحول الرقمي (Digital Transformation)
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-lg mx-auto">
              هذا التبويب الفرعي مخصص لمشروعات التحول الرقمي والوزارات والهيئات الحكومية. النظام مهيأ بالكامل لاستقبال وربط شيت الإكسيل الخاص به ليعمل بكامل وظائفه الميدانية.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                ⏳ مهيأ للربط واستقبال البيانات
              </span>
            </div>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => handleScopeChange('ETAHA')}
                className="px-5 py-2.5 bg-gradient-to-r from-teal-700 to-emerald-800 hover:from-teal-800 hover:to-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                الانتقال إلى تبويب الإتاحة المعتمد (840 موقعاً)
              </button>
            </div>
          </div>
        ) : activeScope === 'POST' ? (
          <div className="pbi-card p-8 my-6 text-center bg-white/95 border border-dashed border-indigo-300 rounded-2xl shadow-xs">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200 shadow-sm">
              <Mail className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">
              مشروعات البريد المصري (Egypt Post)
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-lg mx-auto">
              هذا التبويب الفرعي مخصص لمشروعات مكاتب وفروع البريد المصري ومراكز الخدمات اللوجستية. النظام مهيأ بالكامل لاستقبال وربط شيت الإكسيل الخاص به فور توفره.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="text-xs font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
                ⏳ مهيأ للربط واستقبال البيانات
              </span>
            </div>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => handleScopeChange('ETAHA')}
                className="px-5 py-2.5 bg-gradient-to-r from-teal-700 to-emerald-800 hover:from-teal-800 hover:to-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                الانتقال إلى تبويب الإتاحة المعتمد (840 موقعاً)
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 4. Summary KPI Cards ("Total Sites", "Completed", "In Progress", "Planned / Inspection") - Immediately below Mobile Operators */}
            <div className="mb-4">
              <KpiCards
                kpis={kpis}
                activeStatusFilter={filters.status}
                onSelectStatusFilter={handleStatusSelect}
              />
            </div>

            {/* 5. Interactive Filtering Row (فلاتر التصفية التفاعلية الهرمية) */}
            <div className="mb-5">
              <Filters
                filters={filters}
                onChangeFilter={handleFilterChange}
                onResetFilters={handleResetFilters}
                sitesData={baseFilterSites}
                selectedCompany={filters.company}
              />
            </div>

            {/* 6. Main Action Buttons Row (مجموعة أزرار التحكم - مرتبة مباشرة بعد فلاتر التصفية) */}
            {activeScope === 'FTTS' && (
              <div className="mb-6 p-3.5 bg-white border border-slate-200/90 rounded-2xl shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Primary Core Control Buttons Group (أزرار التحكم مرتبة بدقة) */}
                  {filters.company === 'Orange' ? (
                    /* Orange Buttons Group */
                    <div className="flex flex-wrap items-center gap-2">
                      {/* 1. زر تحليل Orange */}
                      <button
                        className="px-4 py-2 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        onClick={() => setIsOrangeAnalysisOpen(true)}
                        title="عرض التحليل الإحصائي المتقدم لمواقع Orange"
                      >
                        <span>📊</span>
                        <span>تحليل Orange (Orange Analysis)</span>
                      </button>

                      {/* 2. زر إضافة موقع جديد */}
                      <button
                        className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        onClick={() => {
                          setOrangeEditingSiteCode(undefined);
                          setOrangeEditingRecord(null);
                          setOrangeModalMode('add');
                          setIsOrangeAddDataOpen(true);
                        }}
                        title="إدخال وإضافة موقع جديد لـ Orange يدوياً في قاعدة البيانات"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>إضافة موقع جديد (Add New Site)</span>
                      </button>

                      {/* 3. زر تعديل البيانات */}
                      <button
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        onClick={() => {
                          setOrangeEditingSiteCode(undefined);
                          setOrangeEditingRecord(null);
                          setOrangeModalMode('edit');
                          setIsOrangeAddDataOpen(true);
                        }}
                        title="تعديل بيانات موقع Orange حالي مع حماية الثوابت غير القابلة للتعديل"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل البيانات (Edit Site Data)</span>
                      </button>

                      {/* 4. زر إلغاء أو حذف موقع */}
                      <button
                        className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        onClick={() => {
                          setIsQuickDeleteModalOpen(true);
                        }}
                        title="إلغاء أو حذف موقع Orange مع رسالة تأكيد الحذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>إلغاء أو حذف موقع (Delete Site)</span>
                      </button>

                      {/* 5. زر الرفع الجماعي عبر شيت الإكسيل */}
                      <button
                        className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        onClick={() => setIsOrangeBulkImportOpen(true)}
                        title="تحميل النموذج الاسترشادي والرفع الجماعي لملفات الإكسيل لشبكة Orange مع حماية الثوابت"
                      >
                        <span>📤</span>
                        <span>الرفع الجماعي عبر إكسيل (Bulk Import)</span>
                      </button>
                    </div>
                  ) : filters.company === 'Vodafone' ? (
                    /* Vodafone Buttons Group */
                    <div className="flex flex-wrap items-center gap-2">
                      {/* 1. زر الرفع الجماعي عبر شيت الإكسيل لفودافون */}
                      <button
                        className="px-4 py-2 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-700 hover:to-red-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        onClick={() => setIsVodafoneBulkImportOpen(true)}
                        title="تحميل النموذج الاسترشادي والرفع الجماعي لملفات إكسيل خطة Vodafone FTTS"
                      >
                        <span>📤</span>
                        <span>الرفع الجماعي عبر إكسيل (Bulk Import)</span>
                      </button>

                      {/* 2. زر إضافة موقع جديد */}
                      <button
                        className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        onClick={() => {
                          setEditingSiteCode(undefined);
                          setEditingRecord(null);
                          setWeModalMode('add');
                          setIsWeAddDataOpen(true);
                        }}
                        title="إضافة موقع جديد لفودافون"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>إضافة موقع جديد (Add New Site)</span>
                      </button>

                      {/* 3. زر تعديل البيانات */}
                      <button
                        className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        onClick={() => {
                          setEditingSiteCode(undefined);
                          setEditingRecord(null);
                          setWeModalMode('edit');
                          setIsWeAddDataOpen(true);
                        }}
                        title="تعديل بيانات موقع فودافون"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل البيانات (Edit Site Data)</span>
                      </button>

                      {/* 4. زر حذف موقع */}
                      <button
                        className="px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        onClick={() => setIsQuickDeleteModalOpen(true)}
                        title="إلغاء أو حذف موقع فودافون"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>إلغاء أو حذف موقع (Delete Site)</span>
                      </button>
                    </div>
                  ) : (
                    /* WE & Default Buttons Group */
                    <div className="flex flex-wrap items-center gap-2">
                      {/* 1. زر تحليل WE في أقصى بداية السطر وقبل زر إضافة موقع جديد */}
                      <button
                        className="px-4 py-2 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        onClick={() => setIsWeAnalysisOpen(true)}
                        title="عرض التحليل الإحصائي المتقدم لمواقع WE"
                      >
                        <span>📊</span>
                        <span>تحليل WE (WE Analysis)</span>
                      </button>

                      {/* 2. زر إضافة موقع جديد */}
                      <button
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        onClick={() => {
                          setEditingSiteCode(undefined);
                          setEditingRecord(null);
                          setWeModalMode('add');
                          setIsWeAddDataOpen(true);
                        }}
                        title="إدخال وإضافة موقع جديد يدوياً في قاعدة البيانات"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>إضافة موقع جديد (Add New Site)</span>
                      </button>

                      {/* 3. زر تعديل البيانات */}
                      <button
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        onClick={() => {
                          setEditingSiteCode(undefined);
                          setEditingRecord(null);
                          setWeModalMode('edit');
                          setIsWeAddDataOpen(true);
                        }}
                        title="تعديل بيانات موقع حالي مع حماية الثوابت غير القابلة للتعديل"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل البيانات (Edit Site Data)</span>
                      </button>

                      {/* 4. زر إلغاء أو حذف موقع */}
                      <button
                        className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        onClick={() => {
                          setIsQuickDeleteModalOpen(true);
                        }}
                        title="إلغاء أو حذف موقع مع رسالة تأكيد الحذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>إلغاء أو حذف موقع (Delete Site)</span>
                      </button>

                      {/* 5. زر الرفع الجماعي عبر شيت الإكسيل */}
                      <button
                        className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        onClick={() => setIsBulkImportOpen(true)}
                        title="تحميل النموذج الاسترشادي والرفع الجماعي لملفات الإكسيل مع حماية الثوابت"
                      >
                        <span>📤</span>
                        <span>رفع جماعي عبر إكسيل (Bulk Excel)</span>
                      </button>

                      {/* 6. زر تصدير CSV */}
                      <button
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        onClick={() => exportToCSV()}
                        title="تصدير قاعدة البيانات المركزية كاملة إلى CSV"
                      >
                        <span>📥</span>
                        <span>تصدير CSV</span>
                      </button>

                      {/* 7. إدارة وحذف متقدم */}
                      <button
                        className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        onClick={() => setIsWeManagerOpen(true)}
                        title="إدارة وتعديل السجلات وحذف البيانات غير المهمة أو تصدير CSV نظيف"
                      >
                        <span>🧹</span>
                        <span>إدارة وحذف متقدم (CSV)</span>
                      </button>
                    </div>
                  )}

                  {/* Status and Cloud Sync Bar */}
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs flex items-center gap-1.5 transition border border-slate-200 cursor-pointer"
                      onClick={() => {
                        refetchWeRecords();
                        refetchWeCodes();
                      }}
                      title="تحديث البيانات من السحابة"
                    >
                      🔄 {weRecordsLoading ? 'جارِ المزامنة...' : 'تحديث مباشر'}
                    </button>
                    <span className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold font-mono">
                      ⚡ سحابي: {user && user.role !== 'admin' && user.sector !== 'ALL' ? liveWeSites.filter(s => isRecordInSector(user.sector, s)).length : liveWeSites.length} موقع
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons for Availability (الإتاحة) */}
            {(activeScope === 'AVAILABILITY' || activeScope === 'ETAHA') && (
              <div className="mb-6 p-3.5 bg-white border border-teal-200/90 rounded-2xl shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* 1. زر الرفع الجماعي عبر شيت الإكسيل للإتاحة */}
                    <button
                      className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                      onClick={() => setIsEtahaBulkImportOpen(true)}
                      title="تحميل النموذج الاسترشادي والرفع الجماعي لملفات إكسيل مشروعات الإتاحة مع حماية الثوابت"
                    >
                      <span>📤</span>
                      <span>الرفع الجماعي عبر إكسيل (Bulk Import)</span>
                    </button>

                    {/* 2. زر إضافة مشروع جديد */}
                    <button
                      className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                      onClick={() => {
                        setEditingSiteCode(undefined);
                        setEditingRecord(null);
                        setWeModalMode('add');
                        setIsWeAddDataOpen(true);
                      }}
                      title="إدخال وإضافة مشروع جديد للإتاحة يدوياً"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>إضافة مشروع جديد (Add New Project)</span>
                    </button>

                    {/* 3. زر تعديل البيانات */}
                    <button
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                      onClick={() => {
                        setEditingSiteCode(undefined);
                        setEditingRecord(null);
                        setWeModalMode('edit');
                        setIsWeAddDataOpen(true);
                      }}
                      title="تعديل بيانات مشروع إتاحة مع حماية الثوابت"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل البيانات (Edit Project Data)</span>
                    </button>

                    {/* 4. زر إلغاء أو حذف مشروع */}
                    <button
                      className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                      onClick={() => setIsQuickDeleteModalOpen(true)}
                      title="إلغاء أو حذف مشروع إتاحة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>إلغاء أو حذف مشروع (Delete Project)</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs flex items-center gap-1.5 transition border border-slate-200 cursor-pointer"
                      onClick={() => refetchEtahaRecords()}
                      title="تحديث بيانات مشروعات الإتاحة"
                    >
                      🔄 تحديث مباشر
                    </button>
                    <span className="px-3 py-1.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold font-mono">
                      🌐 قاعدة بيانات الإتاحة: {etahaSites.length} مشروع معتمد
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 7. Overall Sites Execution Status - with View Mode Toggle */}
            <div className="mb-6 space-y-3">
              {/* Section Header with View Mode Toggle */}
              <div className="pbi-card p-3 bg-white/95 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                    <PieChart className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                      <span>الموقف العام لتنفيذ المواقع (Overall Sites Execution Status)</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                        {filteredSites.length.toLocaleString()} موقع معروض
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      اختر نمط العرض المناسب: المخططات الرسومية أو التقرير التنفيذي التفصيلي
                    </p>
                  </div>
                </div>

                {/* View Mode Toggle Controls */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 shrink-0 self-stretch sm:self-auto">
                  {/* Option 1: Graphical View */}
                  <button
                    type="button"
                    onClick={() => setExecutionViewMode('graphical')}
                    className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${executionViewMode === 'graphical'
                        ? 'bg-white text-blue-900 shadow-sm border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    <span>📊</span>
                    <span>العرض الرسومي</span>
                  </button>

                  {/* Option 2: Executive Detailed Report View */}
                  <button
                    type="button"
                    onClick={() => setExecutionViewMode('executive')}
                    className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${executionViewMode === 'executive'
                        ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-sm border border-slate-700'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    <span>📋</span>
                    <span>العرض التنفيذي التفصيلي</span>
                  </button>
                </div>
              </div>

              {/* View Content Rendering */}
              {executionViewMode === 'graphical' ? (
                /* 1. Current Graphical View: Donut Chart + Summary Table */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Donut Chart with Hierarchical Drill-down & Separated Stalled/Obstacles */}
                  <div className="lg:col-span-6 xl:col-span-6">
                    <DonutChart
                      data={statusSummaries}
                      totalSites={kpis.totalSites}
                      activeStatusFilter={filters.status}
                      onSelectStatus={handleStatusSelect}
                      sitesData={baseFilterSites}
                      activeSector={filters.sector}
                      onSelectSector={(sec) => handleFilterChange('sector', sec)}
                      onSelectGeneralAdmin={(admin) => handleFilterChange('generalAdmin', admin)}
                      onSelectCompetentAdmin={(admin) => handleFilterChange('competentAdmin', admin)}
                      resetTrigger={donutResetKey}
                      onResetAll={handleResetFilters}
                    />
                  </div>

                  {/* Summary Table */}
                  <div className="lg:col-span-6 xl:col-span-6">
                    <SummaryTable
                      data={statusSummaries}
                      totalSites={kpis.totalSites}
                      totalLinks={kpis.totalLinks}
                      activeStatusFilter={filters.status}
                      onSelectStatus={handleStatusSelect}
                      onOpenDetailsModal={handleOpenDetails}
                    />
                  </div>
                </div>
              ) : (
                /* 2. Executive Detailed Report View matching WE Executive Report */
                <WeExecutiveReportView
                  sites={filteredSites}
                  onSelectSector={(sec) => handleFilterChange('sector', sec)}
                  onOpenDetailsModal={handleOpenDetails}
                  selectedSector={filters.sector}
                />
              )}
            </div>

            {/* 8. Weekly Performance Tracking Line Chart (Positioned at the VERY BOTTOM, dynamically bound to top filters) */}
            <div className="mb-8">
              <WeeklyPerformanceLineChart
                sites={filteredSites}
                filters={filters}
                currentWeek={45}
              />
            </div>
          </>
        )}

        {/* Footer info bar */}
        <footer className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            منظومة متابعة المشروعات القومية للاتصالات والفايبر • FTTS • الإتاحة • التحول الرقمي
          </span>
          <span className="font-mono text-[11px]">
            {activeScope === 'FTTS'
              ? 'مصدر البيانات: ftts.xlsx (Orange/Vodafone) & We.xlsx (WE)'
              : activeScope === 'ETAHA'
                ? 'مصدر البيانات: الاتاحه .xlsx (1,374 موقع)'
                : activeScope === 'TAHAWOL'
                  ? 'مصدر البيانات: بيان التحول الرقمى.xlsx (380 موقع)'
                  : `ملف مخصص: ${uploadedMetadata?.fileName}`}
          </span>
        </footer>
      </div>

      {/* Drill-down Modal */}
      <SiteDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        sites={filteredSites}
        activeStatusFilter={modalFilterStatus || filters.status || undefined}
        onEditSite={(siteCode) => {
          const matched =
            authorizedScopeData.find((s) => s.siteCode.toUpperCase() === siteCode.toUpperCase()) ||
            liveWeSites.find((s) => s.siteCode.toUpperCase() === siteCode.toUpperCase()) ||
            orangeSites.find((s) => s.siteCode.toUpperCase() === siteCode.toUpperCase());

          if (matched?.company === 'Orange') {
            const orgRec = orangeRecords.find(
              (r) => (r['Site code'] || '').toUpperCase() === siteCode.toUpperCase()
            );
            setOrangeEditingSiteCode(siteCode);
            setOrangeEditingRecord(orgRec || null);
            setOrangeModalMode('edit');
            setIsOrangeAddDataOpen(true);
            return;
          }

          if (matched) {
            setEditingRecord({
              'site code': matched.siteCode,
              'Exc sector': matched.sector,
              'Sectores': matched.sector,
              'Sectore': matched.sector,
              'السنترال': matched.central || '',
              'الادارة العامة لتنفيذ الشبكات': matched.generalAdmin || '',
              'اداره التنفيذ المختصه': matched.competentAdmin || '',
              'Zone': matched.competentAdmin || '',
              'Exc Zone': matched.generalAdmin || '',
              'المسئولية': matched.civilContractor || '',
              'Type': matched.classification || 'FTTS',
              'Site Status': matched.status === 'تم التسليم' ? 'ON AIR' : matched.status,
              'التصنيف': matched.classification || matched.status || 'جاري مدني',
              'اسباب التعذر': matched.obstacleReason || 'لا يوجد تعذر',
              'نسبة الإنجاز %': String(matched.progressPercent || 0),
              'التاريخ المتوقع للانتهاء': matched.expectedDate || '',
              'الملاحظات': matched.notes || '',
              _id: matched.id || '',
            });
          } else {
            setEditingRecord(null);
          }
          setEditingSiteCode(siteCode);
          setWeModalMode('edit');
          setIsWeAddDataOpen(true);
        }}
        onAddNewSite={() => {
          if (filters.company === 'Orange') {
            setOrangeEditingSiteCode(undefined);
            setOrangeEditingRecord(null);
            setOrangeModalMode('add');
            setIsOrangeAddDataOpen(true);
          } else {
            setEditingSiteCode(undefined);
            setEditingRecord(null);
            setWeModalMode('add');
            setIsWeAddDataOpen(true);
          }
        }}
        onDeleteSite={async (siteOrCode) => {
          const code = typeof siteOrCode === 'string' ? siteOrCode : siteOrCode.siteCode;
          const matched = authorizedScopeData.find((s) => s.siteCode.toUpperCase() === code.toUpperCase());
          if (matched?.company === 'Orange') {
            await deleteOrangeRecord(code);
            setToastMessage(`تم حذف وإلغاء موقع Orange (${code}) بنجاح ✅`);
          } else {
            handleDeleteSite(siteOrCode);
          }
        }}
      />

      <WeDataAnalysisModal
        isOpen={isWeAnalysisOpen}
        onClose={() => setIsWeAnalysisOpen(false)}
        weSites={user && user.role !== 'admin' && user.sector !== 'ALL' ? liveWeSites.filter(s => isRecordInSector(user.sector, s)) : liveWeSites}
      />
      <WeDataManagerModal
        isOpen={isWeManagerOpen}
        onClose={() => setIsWeManagerOpen(false)}
        records={authorizedWeCentralRecords}
        onRefresh={async () => {
          await Promise.all([refetchWeRecords(), refetchWeCodes()]);
        }}
        onAddNew={() => {
          if (user?.role !== 'admin' && user?.sector !== 'ALL') return;
          setEditingSiteCode(undefined);
          setEditingRecord(null);
          setWeModalMode('add');
          setIsWeAddDataOpen(true);
        }}
        onEditRecord={(siteCode, record) => {
          setEditingSiteCode(siteCode);
          setEditingRecord(record || null);
          setWeModalMode('edit');
          setIsWeAddDataOpen(true);
        }}
      />
      <WeAddDataModal
        isOpen={isWeAddDataOpen}
        onClose={() => {
          setIsWeAddDataOpen(false);
          setEditingSiteCode(undefined);
          setEditingRecord(null);
        }}
        allSiteCodes={authorizedWeCodes.length > 0 ? authorizedWeCodes : liveWeSites.filter(s => isRecordInSector(user?.sector, s)).map(s => s.siteCode)}
        initialSiteCode={editingSiteCode}
        initialRecord={editingRecord}
        mode={weModalMode}
        sitesData={authorizedScopeData}
        onSaved={handleWeRecordSaved}
        onSave={handleWeRecordSaved}
        onSubmit={handleWeRecordSaved}
        onSwitchToBulk={() => {
          setIsWeAddDataOpen(false);
          setIsBulkImportOpen(true);
        }}
      />
      {/* Excel Bulk Import Modal with Constant Protection & Validation */}
      <WeBulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        baselineSites={liveWeSites.length > 0 ? liveWeSites : combinedFttsSites}
        userSector={user?.sector}
        isAdmin={user?.role === 'admin'}
        onSwitchToManual={() => {
          setIsBulkImportOpen(false);
          setEditingSiteCode(undefined);
          setEditingRecord(null);
          setWeModalMode(user?.role === 'admin' ? 'add' : 'edit');
          setIsWeAddDataOpen(true);
        }}
        onSuccess={(savedRecords) => {
          savedRecords.forEach((r) => updateOrAddRecordLocally(r));
          refetchWeRecords();
          refetchWeCodes();
          setToastMessage(`تم استيراد وحفظ ${savedRecords.length} موقع بنجاح في قاعدة البيانات المركزية ✅`);
        }}
      />

      {/* ── Orange Modules ── */}
      <OrangeDataAnalysisModal
        isOpen={isOrangeAnalysisOpen}
        onClose={() => setIsOrangeAnalysisOpen(false)}
        orangeSites={
          user && user.role !== 'admin' && user.sector !== 'ALL'
            ? orangeSites.filter((s) => isRecordInSector(user.sector, s))
            : orangeSites
        }
      />

      <OrangeAddDataModal
        isOpen={isOrangeAddDataOpen}
        onClose={() => {
          setIsOrangeAddDataOpen(false);
          setOrangeEditingSiteCode(undefined);
          setOrangeEditingRecord(null);
        }}
        allSiteCodes={orangeSites.map((s) => s.siteCode)}
        initialSiteCode={orangeEditingSiteCode}
        initialRecord={orangeEditingRecord}
        mode={orangeModalMode}
        sitesData={orangeSites}
        onSave={async (record) => {
          const res = await saveOrangeRecord(record);
          if (res.success) {
            setToastMessage(`تم حفظ وتحديث بيانات موقع Orange (${record['Site code']}) بنجاح ✅`);
          }
          return res;
        }}
        onSwitchToBulk={() => {
          setIsOrangeAddDataOpen(false);
          setIsOrangeBulkImportOpen(true);
        }}
      />

      <OrangeBulkImportModal
        isOpen={isOrangeBulkImportOpen}
        onClose={() => setIsOrangeBulkImportOpen(false)}
        baselineSites={orangeSites}
        onSuccess={async (savedRecords) => {
          const res = await bulkImportOrangeRecords(savedRecords);
          if (res.success) {
            setToastMessage(`تم استيراد وحفظ ${res.savedCount} موقع لـ Orange بنجاح في قاعدة البيانات ✅`);
          }
        }}
        onSwitchToManual={() => {
          setIsOrangeBulkImportOpen(false);
          setOrangeEditingSiteCode(undefined);
          setOrangeEditingRecord(null);
          setOrangeModalMode('edit');
          setIsOrangeAddDataOpen(true);
        }}
      />

      <VodafoneBulkImportModal
        isOpen={isVodafoneBulkImportOpen}
        onClose={() => setIsVodafoneBulkImportOpen(false)}
        baselineSites={vodafoneSites}
        onSuccess={async (savedRecords) => {
          const res = await bulkImportVodafoneRecords(savedRecords);
          if (res.success) {
            setToastMessage(`تم استيراد وحفظ ${res.savedCount} موقع لـ Vodafone بنجاح في قاعدة البيانات ✅`);
          }
        }}
        onSwitchToManual={() => {
          setIsVodafoneBulkImportOpen(false);
          setEditingSiteCode(undefined);
          setEditingRecord(null);
          setWeModalMode('edit');
          setIsWeAddDataOpen(true);
        }}
      />

      {/* Availability (الإتاحة) Bulk Import Modal */}
      <EtahaBulkImportModal
        isOpen={isEtahaBulkImportOpen}
        onClose={() => setIsEtahaBulkImportOpen(false)}
        baselineSites={etahaSites}
        onSuccess={async (savedRecords) => {
          const res = await bulkImportEtahaRecords(savedRecords);
          if (res.success) {
            setToastMessage(`تم استيراد وحفظ ${res.savedCount} مشروع بنجاح في قاعدة بيانات الإتاحة ✅`);
          }
        }}
        onSwitchToManual={() => {
          setIsEtahaBulkImportOpen(false);
          setEditingSiteCode(undefined);
          setEditingRecord(null);
          setWeModalMode('edit');
          setIsWeAddDataOpen(true);
        }}
      />

      {/* Excel Uploader Modal */}
      <ExcelUploaderModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onApplyData={handleApplyUploadedData}
        onResetToDefault={handleResetToDefault}
        activeMetadata={uploadedMetadata}
      />

      {/* Quick Site Deletion Modal from Control Panel */}
      {isQuickDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 text-right flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-700 to-red-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center ring-1 ring-white/20">
                  <Trash2 className="w-5 h-5 text-rose-200" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    إلغاء أو حذف موقع (Delete Site)
                  </h3>
                  <p className="text-xs text-rose-200 mt-0.5">
                    اختر الموقع المطلوب إلغاؤه أو حذفه مع رسالة تأكيد الحذف
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsQuickDeleteModalOpen(false);
                  setQuickDeleteSelectedCode('');
                }}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  البحث عن كود أو اسم الموقع المطلوب حذفه:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute inset-y-0 right-3 my-auto text-slate-400" />
                  <input
                    type="text"
                    value={quickDeleteSearch}
                    onChange={(e) => setQuickDeleteSearch(e.target.value)}
                    placeholder="ابحث بكود الموقع، السنترال، أو الاسم..."
                    className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800"
                  />
                </div>
              </div>

              {/* List of matching sites */}
              <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white">
                {matchingDeleteSites.slice(0, 30).map((site) => {
                  const isSelected = quickDeleteSelectedCode === site.siteCode;
                  return (
                    <button
                      key={site.id}
                      type="button"
                      onClick={() => setQuickDeleteSelectedCode(site.siteCode)}
                      className={`w-full text-right p-2.5 transition flex items-center justify-between text-xs cursor-pointer ${isSelected
                        ? 'bg-rose-50/90 text-rose-900 font-bold border-l-4 border-rose-600'
                        : 'hover:bg-slate-50 text-slate-700'
                        }`}
                    >
                      <div>
                        <span className="font-mono font-bold text-indigo-700 ml-2">
                          {site.siteCode}
                        </span>
                        <span className="text-slate-800 font-medium">{site.siteName}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {site.company} • {site.sector}
                      </span>
                    </button>
                  );
                })}
                {matchingDeleteSites.length === 0 && (
                  <p className="p-4 text-center text-xs text-slate-400">
                    لا توجد مواقع مطابقة للبحث
                  </p>
                )}
              </div>

              {/* Selected Site Preview Card */}
              {selectedDeleteSite && (
                <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-rose-700 font-bold mb-1">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>تأكيد بيانات الموقع المراد حذفه:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <span className="text-slate-400 text-[11px] block">كود الموقع:</span>
                      <strong className="font-mono text-indigo-800">{selectedDeleteSite.siteCode}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">اسم الموقع:</span>
                      <strong>{selectedDeleteSite.siteName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">المشغل:</span>
                      <span>{selectedDeleteSite.company}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">القطاع والسنترال:</span>
                      <span>{selectedDeleteSite.sector} - {selectedDeleteSite.central}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 text-[11px] block">الموقف التنفيذي:</span>
                      <span className="font-semibold text-slate-800">{selectedDeleteSite.status}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsQuickDeleteModalOpen(false);
                  setQuickDeleteSelectedCode('');
                }}
                disabled={isDeletingQuick}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                إلغاء الأمر
              </button>
              <button
                type="button"
                disabled={!selectedDeleteSite || isDeletingQuick}
                onClick={async () => {
                  if (!selectedDeleteSite) return;
                  setIsDeletingQuick(true);
                  try {
                    if (selectedDeleteSite.company === 'Orange') {
                      await deleteOrangeRecord(selectedDeleteSite.siteCode);
                      setToastMessage(`تم حذف وإلغاء موقع Orange (${selectedDeleteSite.siteCode}) بنجاح ✅`);
                    } else if (activeScope === 'ETAHA' || activeScope === 'AVAILABILITY') {
                      await deleteEtahaRecord(selectedDeleteSite.siteCode);
                      await handleDeleteSite(selectedDeleteSite);
                      setToastMessage(`تم حذف وإلغاء مشروع الإتاحة (${selectedDeleteSite.siteCode}) بنجاح ✅`);
                    } else {
                      await handleDeleteSite(selectedDeleteSite);
                    }
                    setIsQuickDeleteModalOpen(false);
                    setQuickDeleteSelectedCode('');
                  } finally {
                    setIsDeletingQuick(false);
                  }
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingQuick ? 'جارِ الحذف والتنفيذ...' : 'تأكيد الحذف النهائي للموقع'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login & Sector Permissions Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={closeLoginModal}
      />
    </div>
  );
};
