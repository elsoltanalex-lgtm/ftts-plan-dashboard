import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import { Header } from '../components/Header';
import { KpiCards } from '../components/KpiCards';
import { EtahaKpiCards } from '../components/EtahaKpiCards';
import { DonutChart } from '../components/DonutChart';
import { SummaryTable } from '../components/SummaryTable';
import { Filters } from '../components/Filters';
import { SiteDetailsModal } from '../components/SiteDetailsModal';
import { BulkDeleteModal } from '../components/BulkDeleteModal';
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
import { ShieldCheck, Building2, Eye, LogIn, Lock, LogOut, Globe, Trash2, PlusCircle, Edit3, X, Search, AlertTriangle, Landmark, Mail, PieChart, ChevronRight, Download, Loader2, Database } from 'lucide-react';
import { isRecordInSector, toCanonicalSector } from '../utils/sectorPermissions';
import { toFilterArray } from '../utils/filterUtils';
import { getSiteCompetentAdmin } from '../data/siteAdminMapping';
import { useWeRecords, useWeSiteCodes, exportToCSV, deleteRecord, deleteRecordsBulk } from '../hooks/useWeAPI';
import { exportFullDatabaseBackup } from '../utils/backupExportService';
import type { WeRecord } from '../config/fieldConfig';
import { normalizeClassification } from '../config/fieldConfig';
import { useOrangeAPI } from '../hooks/useOrangeAPI';
import type { OrangeRecord } from '../types/orange';
import { OrangeAddDataModal } from '../components/OrangeAddDataModal';
import { OrangeBulkImportModal } from '../components/OrangeBulkImportModal';
import { OrangeDataAnalysisModal } from '../components/OrangeDataAnalysisModal';

import { useVodafoneAPI } from '../hooks/useVodafoneAPI';
import type { VodafoneRecord } from '../types/vodafone';
import { VodafoneAddDataModal } from '../components/VodafoneAddDataModal';
import { VodafoneBulkImportModal } from '../components/VodafoneBulkImportModal';
import { useEtahaAPI } from '../hooks/useEtahaAPI';
import type { EtahaRecord } from '../data/etahaSites';
import { EtahaBulkImportModal } from '../components/EtahaBulkImportModal';
import { EtahaAddDataModal } from '../components/EtahaAddDataModal';
import { WeExecutiveReportView } from '../components/WeExecutiveReportView';
import { SiteActionDropdown } from '../components/SiteActionDropdown';
import { BackupEmailConfigModal } from '../components/BackupEmailConfigModal';
import { ModalErrorBoundary } from '../components/ModalErrorBoundary';


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
  externalPath: [],
  internalPath: [],
  excelStatus: [],
  deliveryStatus: [],
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

// Persistent Storage Key for Deleted Site Codes (guarantees survival across page refreshes)
const FTTS_DELETED_CODES_KEY = 'ftts_deleted_site_codes_v3';

function loadDeletedSiteCodes(): Set<string> {
  try {
    const raw = localStorage.getItem(FTTS_DELETED_CODES_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr.map((c: string) => String(c).trim().toUpperCase()));
      }
    }
  } catch { }
  return new Set();
}

function persistDeletedSiteCodes(set: Set<string>) {
  try {
    localStorage.setItem(FTTS_DELETED_CODES_KEY, JSON.stringify(Array.from(set)));
  } catch { }
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
    saveVodafoneRecord,
    deleteVodafoneRecord,
    deleteVodafoneRecordsBulk,
    bulkImportVodafoneRecords,
    refetchVodafoneRecords,
  } = useVodafoneAPI();
  const [isVodafoneBulkImportOpen, setIsVodafoneBulkImportOpen] = useState(false);
  const [isVodafoneAddDataOpen, setIsVodafoneAddDataOpen] = useState(false);
  const [vodafoneEditingSiteCode, setVodafoneEditingSiteCode] = useState<string | undefined>(undefined);
  const [vodafoneEditingRecord, setVodafoneEditingRecord] = useState<VodafoneRecord | null>(null);
  const [vodafoneModalMode, setVodafoneModalMode] = useState<'add' | 'edit'>('edit');

  // Availability / Etaha specific UI states & live dataset
  const {
    etahaRecords,
    etahaSites,
    saveEtahaRecord,
    deleteEtahaRecord,
    deleteEtahaRecordsBulk,
    bulkImportEtahaRecords,
    refetchEtahaRecords,
  } = useEtahaAPI();
  const [isEtahaBulkImportOpen, setIsEtahaBulkImportOpen] = useState(false);
  const [isEtahaAddDataOpen, setIsEtahaAddDataOpen] = useState(false);
  const [etahaEditingSiteCode, setEtahaEditingSiteCode] = useState<string | undefined>(undefined);
  const [etahaEditingRecord, setEtahaEditingRecord] = useState<EtahaRecord | null>(null);
  const [etahaModalMode, setEtahaModalMode] = useState<'add' | 'edit'>('edit');

  // Quick delete site states from control panel
  const [isQuickDeleteModalOpen, setIsQuickDeleteModalOpen] = useState(false);
  const [quickDeleteSearch, setQuickDeleteSearch] = useState('');
  const [quickDeleteSelectedCode, setQuickDeleteSelectedCode] = useState<string>('');
  const [isDeletingQuick, setIsDeletingQuick] = useState(false);

  // Set of deleted site codes / IDs for instant optimistic UI reflection across fallback & database
  const [deletedSiteCodes, setDeletedSiteCodes] = useState<Set<string>>(() => loadDeletedSiteCodes());

  // Live WE records and site codes from Supabase cloud database
  const {
    records: weCentralRecords,
    loading: weRecordsLoading,
    refetch: refetchWeRecords,
    updateOrAddRecordLocally,
    removeRecordLocally: _removeRecordLocally,
    removeRecordsLocally,
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
    deleteOrangeRecordsBulk,
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
        next.delete(String(code).trim().toUpperCase());
        persistDeletedSiteCodes(next);
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
          if (siteCode) next.add(String(siteCode).trim().toUpperCase());
          if (siteId) next.add(String(siteId).trim().toUpperCase());
          persistDeletedSiteCodes(next);
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
      if (weCentralRecords.length >= WE_EXCEL_SITES.length) {
        baseSites = weCentralRecords.map((r, i) => mapWeRecordToSiteRecord(r, i));
      } else {
        // Merge Supabase records with baseline so partial edits/additions don't hide remaining sites
        const liveMap = new Map<string, SiteRecord>();
        weCentralRecords.forEach((r, i) => {
          const s = mapWeRecordToSiteRecord(r, i);
          const c = String(s?.siteCode || '').trim().toUpperCase();
          if (c) liveMap.set(c, s);
        });
        const merged: SiteRecord[] = [];
        const seen = new Set<string>();
        for (const [code, site] of liveMap.entries()) {
          merged.push(site);
          seen.add(code);
        }
        for (const site of WE_EXCEL_SITES) {
          const c = String(site?.siteCode || '').trim().toUpperCase();
          if (c && !seen.has(c)) {
            merged.push(site);
          }
        }
        baseSites = merged;
      }
    } else {
      baseSites = WE_EXCEL_SITES;
    }
    if (deletedSiteCodes.size === 0) return baseSites;
    return baseSites.filter((s) => {
      const c = String(s.siteCode || '').trim().toUpperCase();
      const id = String(s.id || '').trim().toUpperCase();
      return !deletedSiteCodes.has(c) && !deletedSiteCodes.has(id);
    });
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
  const [isExportingImage, setIsExportingImage] = useState(false);
  const executionSectionRef = useRef<HTMLDivElement>(null);

  const handleExportChartImage = useCallback(async () => {
    if (!executionSectionRef.current) return;
    setIsExportingImage(true);
    try {
      const dataUrl = await toPng(executionSectionRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        filter: (node: HTMLElement) => {
          if (node?.id === 'btn-export-chart-image') return false;
          return true;
        },
      });

      const link = document.createElement('a');
      const filename = executionViewMode === 'executive'
        ? `Executive_Rollout_Report_${new Date().toISOString().slice(0, 10)}.png`
        : `Execution_Status_Chart_${new Date().toISOString().slice(0, 10)}.png`;
      link.download = filename;
      link.href = dataUrl;
      link.click();
      setToastMessage('تم تحميل الرسم البياني بنجاح كصورة عالية الدقة 📸');
    } catch (err) {
      console.error('Failed to export chart image:', err);
      setToastMessage('حدث خطأ أثناء تصدير الصورة، يرجى المحاولة مرة أخرى');
    } finally {
      setIsExportingImage(false);
    }
  }, [executionViewMode]);

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
      base = base.filter((s) => {
        const c = String(s?.siteCode || '').trim().toUpperCase();
        const id = String(s?.id || '').trim().toUpperCase();
        return !deletedSiteCodes.has(c) && !deletedSiteCodes.has(id);
      });
    }
    if (user.role === 'admin' || user.sector === 'ALL') {
      return base;
    }
    return base.filter((site) => isRecordInSector(user.sector, site));
  }, [currentScopeData, user, deletedSiteCodes]);

  // Matching sites for Quick Delete Modal
  const matchingDeleteSites = useMemo(() => {
    const q = (quickDeleteSearch || '').toLowerCase().trim();
    if (!q) return authorizedScopeData.slice(0, 30);
    return authorizedScopeData.filter((s) => {
      const code = String(s?.siteCode || '').toLowerCase();
      const name = String(s?.siteName || '').toLowerCase();
      const central = String(s?.central || '').toLowerCase();
      const sector = String(s?.sector || '').toLowerCase();
      return code.includes(q) || name.includes(q) || central.includes(q) || sector.includes(q);
    }).slice(0, 30);
  }, [authorizedScopeData, quickDeleteSearch]);

  const selectedDeleteSite = useMemo(() => {
    if (!quickDeleteSelectedCode) return null;
    const targetNorm = String(quickDeleteSelectedCode).trim().toUpperCase();
    return authorizedScopeData.find((s) => String(s?.siteCode || '').trim().toUpperCase() === targetNorm) || null;
  }, [authorizedScopeData, quickDeleteSelectedCode]);

  // Base dataset for interactive filtering (strictly scoped to selected operator, e.g. "WE")
  const baseFilterSites = useMemo(() => {
    if (filters.company && filters.company !== 'All') {
      return authorizedScopeData.filter((s) => s?.company === filters.company);
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
    if (user.role === 'admin' || user.sector === 'ALL') {
      if (weCentralCodes && weCentralCodes.length > 0) return weCentralCodes;
      return [...new Set(liveWeSites.map((s) => s.siteCode).filter(Boolean))].sort();
    }
    const sectorSites = liveWeSites.filter((s) => isRecordInSector(user.sector, s));
    return [...new Set(sectorSites.map((s) => s.siteCode).filter(Boolean))].sort();
  }, [weCentralCodes, liveWeSites, user]);

  // Dynamic filter application across authorized scope (Supports Multi-Select & Search)
  const filteredSites = useMemo(() => {
    const activeStatuses = toFilterArray(filters.status);
    const activeSectors = toFilterArray(filters.sector);
    const activeGeneralAdmins = toFilterArray(filters.generalAdmin);
    const activeSubSectors = toFilterArray(filters.subSector);
    const activeCompetentAdmins = toFilterArray(filters.competentAdmin);
    const activeClassifications = toFilterArray(filters.classification);
    const activeObstacles = toFilterArray(filters.obstacleReason);
    const searchQuery = (filters.searchQuery || '').toLowerCase().trim();

    return authorizedScopeData.filter((site) => {
      if (!site) return false;
      // 1. Company / Category Filter
      if (filters.company !== 'All') {
        if (activeScope === 'FTTS') {
          if (site.company !== filters.company) return false;
        } else if (activeScope === 'ETAHA') {
          // Filter by client category or classification
          const sName = String(site.siteName || '');
          const sCls = String(site.classification || '');
          if (filters.company === 'التعليم' && !sName.includes('التربية والتعليم') && !sCls.includes('تعليم')) return false;
          if (filters.company === 'البنوك' && !sName.includes('بنك') && !sName.includes('مصرف') && !sName.includes('الأهلي') && !sName.includes('مصر')) return false;
          if (filters.company === 'الجمارك والضرائب' && !sName.includes('جمارك') && !sName.includes('ضرائب')) return false;
        } else if (activeScope === 'TAHAWOL') {
          // Filter by ministry
          const sName = String(site.siteName || '');
          const sCls = String(site.classification || '');
          if (filters.company === 'الداخلية' && !sName.includes('الداخلية') && !sCls.includes('الداخلية')) return false;
          if (filters.company === 'العدل' && !sName.includes('العدل') && !sCls.includes('العدل')) return false;
          if (filters.company === 'الصحة' && !sName.includes('الصحة') && !sCls.includes('الصحة')) return false;
        } else if (site.company !== filters.company) {
          return false;
        }
      }

      // 2. Status / Exact Excel Classification Filter (Multi-Select)
      if (activeStatuses.length > 0) {
        const siteCat = getSiteClassification(site);
        const siteStatus = String(site.status || '').trim();
        const siteCls = String(site.classification || '').trim();

        const match = activeStatuses.some((fs) => {
          if (activeScope === 'ETAHA' || activeScope === 'AVAILABILITY') {
            if (fs === 'تم الانتهاء داخلي') {
              const intVal = String(site.internalPath || site.rawRecord?.['المسار الداخلى'] || site.rawRecord?.['موقف اللحامات'] || '').trim();
              const del = String(site.deliveryStatus || site.deliveryArea || site.rawRecord?.['موقف التسليم'] || '').trim();
              const cls = String(site.excelStatus || site.classification || site.rawRecord?.['التصنيف'] || '').trim();
              return intVal === 'تم الانتهاء' || intVal === 'تم الانتهاء بالكامل' || del === 'تم التسليم' || cls === 'تم الانتهاء والتسليم';
            }
            if (fs === 'تم الانتهاء خارجي') {
              const ext = String(site.externalPath || site.rawRecord?.['المسار الخارجي'] || '').trim();
              const cls = String(site.excelStatus || site.classification || site.rawRecord?.['التصنيف'] || '').trim();
              return ext === 'تم الانتهاء' || cls === 'تم الانتهاء والتسليم' || cls.includes('تم خارجي');
            }
            if (fs === 'تم التسليم') {
              const del = String(site.deliveryStatus || site.deliveryArea || site.rawRecord?.['موقف التسليم'] || '').trim();
              const cls = String(site.excelStatus || site.classification || site.rawRecord?.['التصنيف'] || '').trim();
              return del === 'تم التسليم' || cls === 'تم الانتهاء والتسليم';
            }
          }
          if (siteCat === fs || siteStatus === fs || siteCls === fs) return true;
          if (fs === 'المكتمل' || fs === 'Completed') return isClassificationCompleted(siteCat);
          if (fs === 'متعذر / معوقات' || fs === 'Blocked / On Hold') return isClassificationBlocked(siteCat);
          return false;
        });
        if (!match) return false;
      }

      // 3. Expected Date Filter
      if (filters.expectedDate && site.expectedDate > filters.expectedDate) {
        return false;
      }

      // 4. Sector Multi-Select Filter
      if (activeSectors.length > 0) {
        const matchSector = activeSectors.some(
          (sec) => isRecordInSector(sec, site) || String(site.sector || '').trim() === sec
        );
        if (!matchSector) return false;
      }

      // 5. General Admin Multi-Select Filter
      if (activeGeneralAdmins.length > 0) {
        const ga = String(site.generalAdmin || '').trim();
        if (!activeGeneralAdmins.includes(ga)) return false;
      }

      // 5.5 SubSector / الإدارة المختصة Filter (Orange Multi-Select)
      if (activeSubSectors.length > 0) {
        const sub = String(site.subSector || '').trim();
        if (!activeSubSectors.includes(sub)) return false;
      }

      // 6. Competent Admin Multi-Select Filter
      if (activeCompetentAdmins.length > 0) {
        const ca = String(site.competentAdmin || '').trim();
        if (!activeCompetentAdmins.includes(ca)) return false;
      }

      // 7. Central / Exchange Filter
      if (filters.central && String(site.central || '').trim() !== String(filters.central).trim()) {
        return false;
      }

      // 8. Classification Multi-Select Filter
      if (activeClassifications.length > 0) {
        const siteCat = getSiteClassification(site);
        const rawCls = String(site.classification || '').trim();
        const matchCls = activeClassifications.some((fc) => siteCat === fc || rawCls === fc);
        if (!matchCls) return false;
      }

      // 9. Obstacle Reason Multi-Select Filter
      if (activeObstacles.length > 0) {
        const obs = String(site.obstacleReason || '').trim();
        if (!activeObstacles.includes(obs)) return false;
      }

      // 10. Quick Site Search Query (Site ID, Site Code, Site Name, Central)
      if (searchQuery) {
        const code = String(site?.siteCode || '').toLowerCase();
        const id = String(site?.id || '').toLowerCase();
        const name = String(site?.siteName || '').toLowerCase();
        const central = String(site?.central || '').toLowerCase();
        const sector = String(site?.sector || '').toLowerCase();
        const notes = String(site?.notes || '').toLowerCase();

        const matchSearch =
          code.includes(searchQuery) ||
          id.includes(searchQuery) ||
          name.includes(searchQuery) ||
          central.includes(searchQuery) ||
          sector.includes(searchQuery) ||
          notes.includes(searchQuery);

        if (!matchSearch) return false;
      }

      // 11. Etaha-Specific: 3 Classification Axes (المسار الخارجي، المسار الداخلي، وموقف التسليم)
      if (activeScope === 'ETAHA' || activeScope === 'AVAILABILITY') {
        const activeExts = toFilterArray(filters.externalPath);
        if (activeExts.length > 0) {
          const siteExt = String(site.externalPath || site.rawRecord?.['المسار الخارجي'] || '').trim();
          if (!activeExts.includes(siteExt)) return false;
        }

        const activeInts = toFilterArray(filters.internalPath);
        if (activeInts.length > 0) {
          const siteInt = String(site.internalPath || site.rawRecord?.['المسار الداخلى'] || site.rawRecord?.['المسار الداخلي'] || site.rawRecord?.['موقف اللحامات'] || '').trim();
          if (!activeInts.includes(siteInt)) return false;
        }

        const activeExcels = toFilterArray(filters.excelStatus);
        if (activeExcels.length > 0) {
          const siteExcel = String(site.excelStatus || site.classification || site.rawRecord?.['التصنيف'] || '').trim();
          if (!activeExcels.includes(siteExcel)) return false;
        }

        const activeDels = toFilterArray(filters.deliveryStatus);
        if (activeDels.length > 0) {
          const siteDel = String(site.deliveryStatus || site.deliveryArea || site.rawRecord?.['موقف التسليم'] || '').trim();
          if (!activeDels.includes(siteDel)) return false;
        }
      }

      return true;
    });
  }, [authorizedScopeData, filters, activeScope]);

  // Compute status breakdown table and donut chart data (strictly based on the exact classifications present in the uploaded Excel data)
  const statusSummaries = useMemo(() => {
    return calculateStatusSummaries(filteredSites);
  }, [filteredSites]);

  // Scope dataset for KPI cards & Status Tabs (scoped to sector/admin/search, without status filter so tabs reflect active distribution)
  const kpiScopeSites = useMemo(() => {
    const activeSectors = toFilterArray(filters.sector);
    const activeGeneralAdmins = toFilterArray(filters.generalAdmin);
    const activeSubSectors = toFilterArray(filters.subSector);
    const activeCompetentAdmins = toFilterArray(filters.competentAdmin);
    const activeObstacles = toFilterArray(filters.obstacleReason);
    const searchQuery = (filters.searchQuery || '').toLowerCase().trim();

    return authorizedScopeData.filter((site) => {
      if (!site) return false;
      // 1. Company Filter
      if (filters.company !== 'All') {
        if (activeScope === 'FTTS') {
          if (site.company !== filters.company) return false;
        } else if (activeScope === 'ETAHA') {
          const sName = String(site.siteName || '');
          const sCls = String(site.classification || '');
          if (filters.company === 'التعليم' && !sName.includes('التربية والتعليم') && !sCls.includes('تعليم')) return false;
          if (filters.company === 'البنوك' && !sName.includes('بنك') && !sName.includes('مصرف') && !sName.includes('الأهلي') && !sName.includes('مصر')) return false;
          if (filters.company === 'الجمارك والضرائب' && !sName.includes('جمارك') && !sName.includes('ضرائب')) return false;
        } else if (activeScope === 'TAHAWOL') {
          const sName = String(site.siteName || '');
          const sCls = String(site.classification || '');
          if (filters.company === 'الداخلية' && !sName.includes('الداخلية') && !sCls.includes('الداخلية')) return false;
          if (filters.company === 'العدل' && !sName.includes('العدل') && !sCls.includes('العدل')) return false;
          if (filters.company === 'الصحة' && !sName.includes('الصحة') && !sCls.includes('الصحة')) return false;
        } else if (site.company !== filters.company) {
          return false;
        }
      }
      // 2. Expected Date Filter
      if (filters.expectedDate && site.expectedDate > filters.expectedDate) return false;
      // 3. Sector Multi-Select Filter
      if (activeSectors.length > 0) {
        const matchSector = activeSectors.some(
          (sec) => isRecordInSector(sec, site) || String(site.sector || '').trim() === sec
        );
        if (!matchSector) return false;
      }
      // 4. General Admin Multi-Select Filter
      if (activeGeneralAdmins.length > 0) {
        const ga = String(site.generalAdmin || '').trim();
        if (!activeGeneralAdmins.includes(ga)) return false;
      }
      // 5. SubSector Multi-Select Filter
      if (activeSubSectors.length > 0) {
        const sub = String(site.subSector || '').trim();
        if (!activeSubSectors.includes(sub)) return false;
      }
      // 6. Competent Admin Multi-Select Filter
      if (activeCompetentAdmins.length > 0) {
        const ca = String(site.competentAdmin || '').trim();
        if (!activeCompetentAdmins.includes(ca)) return false;
      }
      // 7. Central Filter
      if (filters.central && String(site.central || '').trim() !== String(filters.central).trim()) {
        return false;
      }
      // 8. Obstacle Reason Filter
      if (activeObstacles.length > 0) {
        const obs = String(site.obstacleReason || '').trim();
        if (!activeObstacles.includes(obs)) return false;
      }
      // 9. Quick Search Query
      if (searchQuery) {
        const code = String(site?.siteCode || '').toLowerCase();
        const id = String(site?.id || '').toLowerCase();
        const name = String(site?.siteName || '').toLowerCase();
        const central = String(site?.central || '').toLowerCase();
        if (!code.includes(searchQuery) && !id.includes(searchQuery) && !name.includes(searchQuery) && !central.includes(searchQuery)) {
          return false;
        }
      }

      // 10. Etaha-Specific: 3 Classification Axes
      if (activeScope === 'ETAHA' || activeScope === 'AVAILABILITY') {
        const activeExts = toFilterArray(filters.externalPath);
        if (activeExts.length > 0) {
          const siteExt = String(site.externalPath || site.rawRecord?.['المسار الخارجي'] || '').trim();
          if (!activeExts.includes(siteExt)) return false;
        }

        const activeInts = toFilterArray(filters.internalPath);
        if (activeInts.length > 0) {
          const siteInt = String(site.internalPath || site.rawRecord?.['المسار الداخلى'] || site.rawRecord?.['المسار الداخلي'] || site.rawRecord?.['موقف اللحامات'] || '').trim();
          if (!activeInts.includes(siteInt)) return false;
        }

        const activeExcels = toFilterArray(filters.excelStatus);
        if (activeExcels.length > 0) {
          const siteExcel = String(site.excelStatus || site.classification || site.rawRecord?.['التصنيف'] || '').trim();
          if (!activeExcels.includes(siteExcel)) return false;
        }

        const activeDels = toFilterArray(filters.deliveryStatus);
        if (activeDels.length > 0) {
          const siteDel = String(site.deliveryStatus || site.deliveryArea || site.rawRecord?.['موقف التسليم'] || '').trim();
          if (!activeDels.includes(siteDel)) return false;
        }
      }

      return true;
    });
  }, [authorizedScopeData, filters.company, filters.expectedDate, filters.sector, filters.generalAdmin, filters.subSector, filters.competentAdmin, filters.central, filters.obstacleReason, filters.searchQuery, filters.externalPath, filters.internalPath, filters.excelStatus, filters.deliveryStatus, activeScope]);

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

  // Compute Etaha KPI statistics (Total Sites, Internal Done, External Done, Delivered)
  const etahaKpis = useMemo(() => {
    const totalSites = kpiScopeSites.length;
    let internalDone = 0;
    let externalDone = 0;
    let delivered = 0;

    kpiScopeSites.forEach((site) => {
      const ext = String(site.externalPath || site.rawRecord?.['المسار الخارجي'] || '').trim();
      const intVal = String(site.internalPath || site.rawRecord?.['المسار الداخلى'] || site.rawRecord?.['موقف اللحامات'] || '').trim();
      const del = String(site.deliveryStatus || site.deliveryArea || site.rawRecord?.['موقف التسليم'] || '').trim();
      const cls = String(site.excelStatus || site.classification || site.rawRecord?.['التصنيف'] || '').trim();

      if (ext === 'تم الانتهاء' || cls === 'تم الانتهاء والتسليم' || cls.includes('تم خارجي')) {
        externalDone++;
      }
      if (intVal === 'تم الانتهاء' || intVal === 'تم الانتهاء بالكامل' || del === 'تم التسليم' || cls === 'تم الانتهاء والتسليم') {
        internalDone++;
      }
      if (del === 'تم التسليم' || cls === 'تم الانتهاء والتسليم') {
        delivered++;
      }
    });

    return { totalSites, internalDone, externalDone, delivered };
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
    if (toFilterArray(filters.status).length > 0) count++;
    if (filters.expectedDate) count++;
    if (toFilterArray(filters.sector).length > 0) count++;
    if (toFilterArray(filters.generalAdmin).length > 0) count++;
    if (toFilterArray(filters.subSector).length > 0) count++;
    if (toFilterArray(filters.competentAdmin).length > 0) count++;
    if (toFilterArray(filters.classification).length > 0) count++;
    if (toFilterArray(filters.obstacleReason).length > 0) count++;
    if (filters.searchQuery) count++;
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
    setFilters((prev) => {
      if (status === 'All' || !status) {
        return { ...prev, status: '' };
      }
      const currentList = toFilterArray(prev.status);
      const nextList = currentList.includes(status)
        ? currentList.filter((s) => s !== status)
        : [...currentList, status];
      return { ...prev, status: nextList.length === 0 ? '' : nextList };
    });
  };

  const handleClearStatusFilters = () => {
    setFilters((prev) => ({ ...prev, status: '' }));
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

  // State & Handler for Full Database / Supabase Backup Export to Excel (.xlsx)
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isEmailingBackup, setIsEmailingBackup] = useState(false);
  const [isBackupSettingsOpen, setIsBackupSettingsOpen] = useState(false);

  const handleExportBackup = useCallback(async () => {
    setIsExportingBackup(true);
    setToastMessage('جارِ تجميع كافة البيانات الحالية من قاعدة البيانات السحابية Supabase...');
    try {
      const res = await exportFullDatabaseBackup({
        liveWeSites,
        vodafoneSites,
        orangeSites,
        etahaSites,
        deletedSiteCodes,
        userName: user?.displayName || 'مدير النظام',
        userSector: user?.sector || (user?.role === 'admin' ? 'كافة القطاعات' : 'قطاع عام'),
      });
      setToastMessage(`✅ تم تحميل النسخة الاحتياطية بنجاح (${res.totalSites.toLocaleString()} موقعاً ومفرزة بكل الجداول)`);
    } catch (err: any) {
      console.error('Failed to export backup:', err);
      setToastMessage(`❌ حدث خطأ أثناء تصدير النسخة الاحتياطية: ${err?.message || 'فشل التصدير'}`);
    } finally {
      setIsExportingBackup(false);
    }
  }, [liveWeSites, vodafoneSites, orangeSites, etahaSites, deletedSiteCodes, user]);

  // Handler to trigger the on-demand email backup to Elsoltanalex@gmail.com
  const handleEmailBackup = useCallback(async (customCreds?: { gmailAppPassword?: string; resendApiKey?: string }) => {
    setIsEmailingBackup(true);
    setToastMessage('جارِ تجميع البيانات من Supabase وتوليد ملف الإكسيل للإرسال إلى Elsoltanalex@gmail.com...');
    try {
      const storedGmailPass = customCreds?.gmailAppPassword || localStorage.getItem('ftts_backup_gmail_pass') || undefined;
      const storedResendKey = customCreds?.resendApiKey || localStorage.getItem('ftts_backup_resend_key') || undefined;

      const res = await fetch('/api/backup/send-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'Elsoltanalex@gmail.com',
          gmailAppPassword: storedGmailPass,
          resendApiKey: storedResendKey,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsBackupSettingsOpen(false);
        setToastMessage(`✅ تم إرسال النسخة الاحتياطية بنجاح إلى Elsoltanalex@gmail.com عبر ${data.provider || 'البريد'} (${data.totalRecords} موقعاً) 📦`);
      } else if (data.requiresConfig) {
        setIsBackupSettingsOpen(true);
        setToastMessage('⚙️ يرجى إدخال كلمة مرور تطبيقات Gmail أو مفتاح Resend لإتمام الإرسال الفوري');
      } else {
        setToastMessage(`❌ ${data.error || data.message || 'فشل إرسال الإيميل'}`);
      }
    } catch (err: any) {
      console.error('Email backup error:', err);
      setToastMessage('❌ حدث خطأ في الاتصال بالخادم، يرجى المحاولة مرة أخرى');
    } finally {
      setIsEmailingBackup(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-100/70 p-3 sm:p-5 lg:p-7 text-slate-800 font-sans">
      <div className="max-w-[1600px] mx-auto">
        {/* 1. Header with Upload Action & Backup Export */}
        <Header
          onResetFilters={handleResetFilters}
          activeFiltersCount={activeFiltersCount}
          totalFilteredSites={filteredSites.length}
          totalBaselineSites={authorizedScopeData.length}
          onExportCsv={handleExportFullCsv}
          onExportBackup={handleExportBackup}
          isExportingBackup={isExportingBackup}
          onEmailBackup={handleEmailBackup}
          isEmailingBackup={isEmailingBackup}
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

            {/* زر منفصل ومستقل للطلب الفوري: نسخة احتياطية الآن (Send Backup Now) */}
            <button
              onClick={() => handleEmailBackup()}
              disabled={isEmailingBackup}
              id="btn-admin-send-backup-now"
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold border border-emerald-400/50 transition-all shadow-md hover:shadow-emerald-500/25 cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
              title="توليد وإرسال نسخة احتياطية فورية من بيانات Supabase كطلب يدوي إلى Elsoltanalex@gmail.com"
            >
              {isEmailingBackup ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-200" />
                  <span>جارِ الإرسال للإيميل...</span>
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5 text-emerald-200" />
                  <span>نسخة احتياطية الآن (Send Backup Now)</span>
                </>
              )}
            </button>

            {/* شارة توضيحية لجدولة النسخ الأوتوماتيكية اليومية المستقلة */}
            <div
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 shadow-sm"
              title="الجدولة الأوتوماتيكية اليومية تعمل تلقائياً كل ليلة في تمام الساعة 12:00 منتصف الليل دون أي تدخل يدوي"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>الجدولة الآلية: 12:00 منتصف الليل يومياً</span>
            </div>

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
                الانتقال إلى تبويب Availability المعتمد
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
                الانتقال إلى تبويب Availability المعتمد
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 4. Summary KPI Cards ("Total Sites", "Completed", "In Progress", "Planned / Inspection") - Immediately below Mobile Operators */}
            <div className="mb-4">
              {activeScope === 'ETAHA' || activeScope === 'AVAILABILITY' ? (
                <EtahaKpiCards
                  totalSites={etahaKpis.totalSites}
                  internalDone={etahaKpis.internalDone}
                  externalDone={etahaKpis.externalDone}
                  delivered={etahaKpis.delivered}
                  activeStatusFilter={filters.status}
                  onSelectStatusFilter={handleStatusSelect}
                  onClearStatusFilters={() => handleFilterChange('status', 'All')}
                />
              ) : (
                <KpiCards
                  kpis={kpis}
                  activeStatusFilter={filters.status}
                  onSelectStatusFilter={handleStatusSelect}
                />
              )}
            </div>

            {/* Quick Site Search Bar (شريط البحث السريع المباشر بكود أو اسم الموقع) */}
            <div className="mb-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/70 rounded-2xl p-3.5 shadow-md text-white">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-sky-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    id="quick-site-search-input"
                    value={filters.searchQuery || ''}
                    onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                    placeholder="🔍 بحث سريع ومباشر بكود الموقع أو اسمه (Site ID / Site Code / Site Name / Central)..."
                    className="w-full pr-10 pl-9 py-2 text-xs sm:text-sm bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/20 focus:border-sky-400 rounded-xl text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-all font-sans"
                  />
                  {filters.searchQuery && (
                    <button
                      type="button"
                      onClick={() => handleFilterChange('searchQuery', '')}
                      className="absolute inset-y-0 left-2.5 flex items-center text-slate-300 hover:text-white cursor-pointer"
                      title="مسح البحث"
                    >
                      <X className="w-4 h-4 bg-white/20 hover:bg-white/30 rounded-full p-0.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                  {filters.searchQuery ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 ${filteredSites.length > 0
                        ? 'bg-sky-500/20 text-sky-200 border border-sky-400/30'
                        : 'bg-rose-500/20 text-rose-200 border border-rose-400/30'
                        }`}>
                        <span>النتائج:</span>
                        <strong className="text-white font-mono text-sm">{filteredSites.length}</strong>
                        <span>موقع</span>
                      </span>
                      {filteredSites.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenDetails()}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer transition hover:scale-105"
                          title="عرض تفاصيل وداتا المواقع المطابقة في نافذة تفصيلية"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>عرض داتا المواقع المطابقة ({filteredSites.length})</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                      <span className="bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded text-[10px] font-mono border border-sky-400/30 font-bold">
                        ⚡ بحث فوري
                      </span>
                      <span>اكتب كود أو اسم أي موقع لتصفيته وعرض داتا الموقع فوراً</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Instant Site Card Preview when 1 site matches */}
              {filters.searchQuery && filteredSites.length === 1 && (
                <div className="mt-2.5 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs bg-white/5 p-2.5 rounded-xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-sky-300 text-sm tracking-wide bg-sky-950/80 px-2 py-0.5 rounded border border-sky-500/30">
                      {filteredSites[0].siteCode}
                    </span>
                    <span className="text-slate-100 font-bold">{filteredSites[0].siteName}</span>
                    <span className="bg-white/15 px-2 py-0.5 rounded text-[11px] text-slate-200">{filteredSites[0].company}</span>
                    <span className="bg-white/10 px-2 py-0.5 rounded text-[11px] text-slate-300">{filteredSites[0].sector}</span>
                    <span className="bg-white/10 px-2 py-0.5 rounded text-[11px] text-slate-300">{filteredSites[0].central}</span>
                    <span className="bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded text-[11px] font-bold">
                      {getSiteClassification(filteredSites[0])}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenDetails()}
                    className="text-xs text-sky-300 hover:text-white font-bold underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>فتح الشيت والبيانات الكاملة للموقع ←</span>
                  </button>
                </div>
              )}
            </div>

            {/* 5. Interactive Filtering Row (فلاتر التصفية التفاعلية الهرمية) */}
            <div className="mb-5">
              <Filters
                filters={filters}
                onChangeFilter={handleFilterChange}
                onResetFilters={handleResetFilters}
                sitesData={baseFilterSites}
                selectedCompany={filters.company}
                activeScope={activeScope}
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

                      {/* 2. زر موحد لإدارة وعمليات المواقع (إضافة / تعديل / حذف) */}
                      <SiteActionDropdown
                        variant="orange"
                        label="إدارة وعمليات المواقع"
                        onAdd={() => {
                          setOrangeEditingSiteCode(undefined);
                          setOrangeEditingRecord(null);
                          setOrangeModalMode('add');
                          setIsOrangeAddDataOpen(true);
                        }}
                        onEdit={() => {
                          setOrangeEditingSiteCode(undefined);
                          setOrangeEditingRecord(null);
                          setOrangeModalMode('edit');
                          setIsOrangeAddDataOpen(true);
                        }}
                        onDelete={() => {
                          setIsQuickDeleteModalOpen(true);
                        }}
                      />

                      {/* 3. زر الرفع الجماعي عبر شيت الإكسيل */}
                      <button
                        className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        onClick={() => setIsOrangeBulkImportOpen(true)}
                        title="تحميل النموذج الاسترشادي والرفع الجماعي لملفات الإكسيل لشبكة Orange مع حماية الثوابت"
                      >
                        <span>📤</span>
                        <span>الرفع الجماعي عبر إكسيل (Bulk Import)</span>
                      </button>

                      {/* 4. زر تحميل النسخة الاحتياطية */}
                      <button
                        className="px-3.5 py-2 bg-gradient-to-r from-sky-600 to-indigo-700 hover:from-sky-700 hover:to-indigo-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-60"
                        onClick={handleExportBackup}
                        disabled={isExportingBackup}
                        title="تحميل نسخة احتياطية شاملة لكافة الجداول والبيانات من Supabase (Excel)"
                      >
                        {isExportingBackup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                        <span>تحميل النسخة الاحتياطية (Export Backup)</span>
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

                      {/* 2. زر موحد لإدارة وعمليات المواقع (إضافة / تعديل / حذف) */}
                      <SiteActionDropdown
                        variant="vodafone"
                        label="إدارة وعمليات المواقع"
                        onAdd={() => {
                          setVodafoneEditingSiteCode(undefined);
                          setVodafoneEditingRecord(null);
                          setVodafoneModalMode('add');
                          setIsVodafoneAddDataOpen(true);
                        }}
                        onEdit={() => {
                          setVodafoneEditingSiteCode(undefined);
                          setVodafoneEditingRecord(null);
                          setVodafoneModalMode('edit');
                          setIsVodafoneAddDataOpen(true);
                        }}
                        onDelete={() => setIsQuickDeleteModalOpen(true)}
                      />

                      {/* 3. زر تحميل النسخة الاحتياطية */}
                      <button
                        className="px-3.5 py-2 bg-gradient-to-r from-sky-600 to-indigo-700 hover:from-sky-700 hover:to-indigo-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-60"
                        onClick={handleExportBackup}
                        disabled={isExportingBackup}
                        title="تحميل نسخة احتياطية شاملة لكافة الجداول والبيانات من Supabase (Excel)"
                      >
                        {isExportingBackup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                        <span>تحميل النسخة الاحتياطية (Export Backup)</span>
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

                      {/* 2. زر موحد لإدارة وعمليات المواقع (إضافة / تعديل / حذف) */}
                      <SiteActionDropdown
                        variant="we"
                        label="إدارة وعمليات المواقع"
                        onAdd={() => {
                          setEditingSiteCode(undefined);
                          setEditingRecord(null);
                          setWeModalMode('add');
                          setIsWeAddDataOpen(true);
                        }}
                        onEdit={() => {
                          setEditingSiteCode(undefined);
                          setEditingRecord(null);
                          setWeModalMode('edit');
                          setIsWeAddDataOpen(true);
                        }}
                        onDelete={() => {
                          setIsQuickDeleteModalOpen(true);
                        }}
                      />

                      {/* 3. زر الرفع الجماعي عبر شيت الإكسيل */}
                      <button
                        className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        onClick={() => setIsBulkImportOpen(true)}
                        title="تحميل النموذج الاسترشادي والرفع الجماعي لملفات الإكسيل مع حماية الثوابت"
                      >
                        <span>📤</span>
                        <span>رفع جماعي عبر إكسيل (Bulk Excel)</span>
                      </button>

                      {/* 4. زر تصدير CSV */}
                      <button
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        onClick={() => exportToCSV()}
                        title="تصدير قاعدة البيانات المركزية كاملة إلى CSV"
                      >
                        <span>📥</span>
                        <span>تصدير CSV</span>
                      </button>

                      {/* 5. إدارة وحذف متقدم */}
                      <button
                        className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        onClick={() => setIsWeManagerOpen(true)}
                        title="إدارة وتعديل السجلات وحذف البيانات غير المهمة أو تصدير CSV نظيف"
                      >
                        <span>🧹</span>
                        <span>إدارة وحذف متقدم (CSV)</span>
                      </button>

                      {/* 6. زر تحميل النسخة الاحتياطية */}
                      <button
                        className="px-3.5 py-2 bg-gradient-to-r from-sky-600 to-indigo-700 hover:from-sky-700 hover:to-indigo-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-60"
                        onClick={handleExportBackup}
                        disabled={isExportingBackup}
                        title="تحميل نسخة احتياطية شاملة لكافة الجداول والبيانات من Supabase (Excel)"
                      >
                        {isExportingBackup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                        <span>تحميل النسخة الاحتياطية (Export Backup)</span>
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

                    {/* 2. زر موحد لإدارة وعمليات المشروعات (إضافة / تعديل / حذف) */}
                    <SiteActionDropdown
                      variant="etaha"
                      label="إدارة وعمليات المشروعات"
                      itemTypeLabel="مشروع"
                      onAdd={() => {
                        setEtahaEditingSiteCode(undefined);
                        setEtahaEditingRecord(null);
                        setEtahaModalMode('add');
                        setIsEtahaAddDataOpen(true);
                      }}
                      onEdit={() => {
                        setEtahaEditingSiteCode(undefined);
                        setEtahaEditingRecord(null);
                        setEtahaModalMode('edit');
                        setIsEtahaAddDataOpen(true);
                      }}
                      onDelete={() => setIsQuickDeleteModalOpen(true)}
                    />

                    {/* 3. زر تحميل النسخة الاحتياطية */}
                    <button
                      className="px-3.5 py-2 bg-gradient-to-r from-sky-600 to-indigo-700 hover:from-sky-700 hover:to-indigo-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-60"
                      onClick={handleExportBackup}
                      disabled={isExportingBackup}
                      title="تحميل نسخة احتياطية شاملة لكافة مشروعات وجداول البيانات من Supabase (Excel)"
                    >
                      {isExportingBackup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                      <span>تحميل النسخة الاحتياطية (Export Backup)</span>
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
                      🌐 قاعدة بيانات Availability: {etahaSites.length} مشروع معتمد
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 7. Overall Sites Execution Status - with View Mode Toggle */}
            <div ref={executionSectionRef} className="mb-6 space-y-3">
              {/* Section Header with View Mode Toggle & Export Image Button */}
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

                <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto">
                  {/* Export Chart as Image Button */}
                  <button
                    type="button"
                    id="btn-export-chart-image"
                    onClick={handleExportChartImage}
                    disabled={isExportingImage}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                    title="تحميل وتصدير الموقف العام للتنفيذ كصورة عالية الدقة PNG"
                  >
                    {isExportingImage ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                        <span>جارِ التصدير...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 text-sky-600" />
                        <span>تصدير الرسم البياني كصورة</span>
                      </>
                    )}
                  </button>

                  {/* View Mode Toggle Controls */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 shrink-0">
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
                      companyVariant={
                        filters.company === 'Orange' ? 'orange' :
                          filters.company === 'Vodafone' ? 'vodafone' :
                            activeScope === 'ETAHA' ? 'etaha' : 'we'
                      }
                      onAddNewSite={() => {
                        if (activeScope === 'ETAHA') {
                          setEtahaEditingSiteCode(undefined);
                          setEtahaEditingRecord(null);
                          setEtahaModalMode('add');
                          setIsEtahaAddDataOpen(true);
                        } else if (filters.company === 'Orange') {
                          setOrangeEditingSiteCode(undefined);
                          setOrangeEditingRecord(null);
                          setOrangeModalMode('add');
                          setIsOrangeAddDataOpen(true);
                        } else if (filters.company === 'Vodafone') {
                          setVodafoneEditingSiteCode(undefined);
                          setVodafoneEditingRecord(null);
                          setVodafoneModalMode('add');
                          setIsVodafoneAddDataOpen(true);
                        } else {
                          setEditingSiteCode(undefined);
                          setEditingRecord(null);
                          setWeModalMode('add');
                          setIsWeAddDataOpen(true);
                        }
                      }}
                      onEditSite={() => {
                        if (activeScope === 'ETAHA') {
                          setEtahaEditingSiteCode(undefined);
                          setEtahaEditingRecord(null);
                          setEtahaModalMode('edit');
                          setIsEtahaAddDataOpen(true);
                        } else if (filters.company === 'Orange') {
                          setOrangeEditingSiteCode(undefined);
                          setOrangeEditingRecord(null);
                          setOrangeModalMode('edit');
                          setIsOrangeAddDataOpen(true);
                        } else if (filters.company === 'Vodafone') {
                          setVodafoneEditingSiteCode(undefined);
                          setVodafoneEditingRecord(null);
                          setVodafoneModalMode('edit');
                          setIsVodafoneAddDataOpen(true);
                        } else {
                          setEditingSiteCode(undefined);
                          setEditingRecord(null);
                          setWeModalMode('edit');
                          setIsWeAddDataOpen(true);
                        }
                      }}
                      onDeleteSite={() => {
                        setIsQuickDeleteModalOpen(true);
                      }}
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
            منظومة متابعة المشروعات القومية للاتصالات والفايبر • FTTS • Availability • Digital Transformation
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

      {/* Drill-down Modal with Error Boundary */}
      <ModalErrorBoundary isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title="نافذة تفاصيل المواقع">
        <SiteDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          sites={filteredSites}
          activeStatusFilter={modalFilterStatus || filters.status || undefined}
          onEditSite={(siteCode) => {
            try {
              const targetCode = String(siteCode || '').trim().toUpperCase();
              if (!targetCode) return;

              if (activeScope === 'ETAHA' || activeScope === 'AVAILABILITY') {
                const matchedEtaha = etahaSites.find(
                  (s) => String(s?.siteCode || '').trim().toUpperCase() === targetCode
                );
                const etRec = etahaRecords.find(
                  (r) => String(r?.['Code'] || r?.['siteCode'] || r?.Code || '').trim().toUpperCase() === targetCode
                ) || (matchedEtaha?.rawRecord as EtahaRecord) || null;

                setEtahaEditingSiteCode(targetCode);
                setEtahaEditingRecord(etRec);
                setEtahaModalMode('edit');
                setIsEtahaAddDataOpen(true);
                return;
              }

              const matched =
                authorizedScopeData.find((s) => String(s?.siteCode || '').trim().toUpperCase() === targetCode) ||
                liveWeSites.find((s) => String(s?.siteCode || '').trim().toUpperCase() === targetCode) ||
                orangeSites.find((s) => String(s?.siteCode || '').trim().toUpperCase() === targetCode) ||
                vodafoneSites.find((s) => String(s?.siteCode || '').trim().toUpperCase() === targetCode);

              if (matched?.company === 'Orange') {
                const orgRec = orangeRecords.find(
                  (r) => String(r?.['Site code'] || r?.['Site Code'] || r?.siteCode || '').trim().toUpperCase() === targetCode
                ) || (matched?.rawRecord as OrangeRecord) || null;
                setOrangeEditingSiteCode(targetCode);
                setOrangeEditingRecord(orgRec);
                setOrangeModalMode('edit');
                setIsOrangeAddDataOpen(true);
                return;
              }

              if (matched?.company === 'Vodafone') {
                const vdfRec = vodafoneRecords.find(
                  (r) => String(r?.['Site code'] || r?.['site code'] || r?.siteCode || '').trim().toUpperCase() === targetCode
                ) || (matched?.rawRecord as VodafoneRecord) || null;
                setVodafoneEditingSiteCode(targetCode);
                setVodafoneEditingRecord(vdfRec);
                setVodafoneModalMode('edit');
                setIsVodafoneAddDataOpen(true);
                return;
              }

              if (matched) {
                setEditingRecord({
                  'site code': matched.siteCode || targetCode,
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
              setEditingSiteCode(targetCode);
              setWeModalMode('edit');
              setIsWeAddDataOpen(true);
            } catch (err: any) {
              console.error('Error opening edit site modal:', err);
              setToastMessage(`تعذر فتح نافذة التعديل للموقع (${siteCode}): ${err?.message || ''}`);
            }
          }}
          onAddNewSite={() => {
            if (activeScope === 'ETAHA' || activeScope === 'AVAILABILITY') {
              setEtahaEditingSiteCode(undefined);
              setEtahaEditingRecord(null);
              setEtahaModalMode('add');
              setIsEtahaAddDataOpen(true);
            } else if (filters.company === 'Orange') {
              setOrangeEditingSiteCode(undefined);
              setOrangeEditingRecord(null);
              setOrangeModalMode('add');
              setIsOrangeAddDataOpen(true);
            } else if (filters.company === 'Vodafone') {
              setVodafoneEditingSiteCode(undefined);
              setVodafoneEditingRecord(null);
              setVodafoneModalMode('add');
              setIsVodafoneAddDataOpen(true);
            } else {
              setEditingSiteCode(undefined);
              setEditingRecord(null);
              setWeModalMode('add');
              setIsWeAddDataOpen(true);
            }
          }}
          onDeleteSite={async (siteOrCode) => {
            try {
              const rawCode = typeof siteOrCode === 'string' ? siteOrCode : siteOrCode?.siteCode;
              const code = String(rawCode || '').trim();
              if (!code) return;
              const targetCode = code.toUpperCase();
              const matched = authorizedScopeData.find((s) => String(s?.siteCode || '').trim().toUpperCase() === targetCode);
              if (activeScope === 'ETAHA' || activeScope === 'AVAILABILITY' || matched?.company === 'Availability' || matched?.company === 'الإتاحة') {
                await deleteEtahaRecord(code);
                setToastMessage(`تم حذف وإلغاء مشروع الإتاحة (${code}) بنجاح ✅`);
              } else if (matched?.company === 'Orange') {
                await deleteOrangeRecord(code);
                setToastMessage(`تم حذف وإلغاء موقع Orange (${code}) بنجاح ✅`);
              } else if (matched?.company === 'Vodafone') {
                await deleteVodafoneRecord(code);
                setToastMessage(`تم حذف وإلغاء موقع Vodafone (${code}) بنجاح ✅`);
              } else {
                handleDeleteSite(siteOrCode);
              }
            } catch (err: any) {
              console.error('Error deleting site:', err);
              setToastMessage(`حدث خطأ أثناء حذف الموقع: ${err?.message || ''}`);
            }
          }}
          onDeleteBulkSites={async (siteCodes) => {
            if (!siteCodes || siteCodes.length === 0) return;
            try {
              if (activeScope === 'ETAHA' || activeScope === 'AVAILABILITY') {
                await deleteEtahaRecordsBulk(siteCodes);
                setToastMessage(`تم حذف ${siteCodes.length} مشروع بنجاح من قاعدة بيانات الإتاحة ✅`);
              } else if (filters.company === 'Orange') {
                await deleteOrangeRecordsBulk(siteCodes);
                setToastMessage(`تم حذف ${siteCodes.length} موقع بنجاح من مواقع Orange ✅`);
              } else if (filters.company === 'Vodafone') {
                await deleteVodafoneRecordsBulk(siteCodes);
                setToastMessage(`تم حذف ${siteCodes.length} موقع بنجاح من مواقع Vodafone ✅`);
              } else {
                await deleteRecordsBulk(siteCodes);
                removeRecordsLocally(siteCodes);
                setToastMessage(`تم حذف ${siteCodes.length} موقع بنجاح من قاعدة بيانات Supabase ✅`);
              }
              setDeletedSiteCodes((prev) => {
                const next = new Set(prev);
                siteCodes.forEach((c) => next.add(String(c).trim().toUpperCase()));
                persistDeletedSiteCodes(next);
                return next;
              });
            } catch (err: any) {
              setToastMessage(`حدث خطأ أثناء حذف المواقع: ${err?.message || ''}`);
            }
          }}
        />
      </ModalErrorBoundary>

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
      <ModalErrorBoundary
        isOpen={isWeAddDataOpen}
        onClose={() => {
          setIsWeAddDataOpen(false);
          setEditingSiteCode(undefined);
          setEditingRecord(null);
        }}
        title="نافذة تعديل موقع WE"
      >
        <WeAddDataModal
          isOpen={isWeAddDataOpen}
          onClose={() => {
            setIsWeAddDataOpen(false);
            setEditingSiteCode(undefined);
            setEditingRecord(null);
          }}
          allSiteCodes={authorizedWeCodes}
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
      </ModalErrorBoundary>
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

      <ModalErrorBoundary
        isOpen={isOrangeAddDataOpen}
        onClose={() => {
          setIsOrangeAddDataOpen(false);
          setOrangeEditingSiteCode(undefined);
          setOrangeEditingRecord(null);
        }}
        title="نافذة تعديل موقع Orange"
      >
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
              const code = record['Site code'] || record['site code'] || (record as any).site_code || '';
              if (code) {
                setDeletedSiteCodes((prev) => {
                  const next = new Set(prev);
                  next.delete(String(code).trim().toUpperCase());
                  persistDeletedSiteCodes(next);
                  return next;
                });
              }
              setToastMessage(res.message || `تم حفظ وتحديث بيانات موقع Orange (${code}) بنجاح في قاعدة البيانات ✅`);
            }
            return res;
          }}
          onSwitchToBulk={() => {
            setIsOrangeAddDataOpen(false);
            setIsOrangeBulkImportOpen(true);
          }}
        />
      </ModalErrorBoundary>

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
          setVodafoneEditingSiteCode(undefined);
          setVodafoneEditingRecord(null);
          setVodafoneModalMode('edit');
          setIsVodafoneAddDataOpen(true);
        }}
      />

      {/* Vodafone Add / Edit Data Modal */}
      <ModalErrorBoundary
        isOpen={isVodafoneAddDataOpen}
        onClose={() => {
          setIsVodafoneAddDataOpen(false);
          setVodafoneEditingSiteCode(undefined);
          setVodafoneEditingRecord(null);
        }}
        title="نافذة تعديل موقع Vodafone"
      >
        <VodafoneAddDataModal
          isOpen={isVodafoneAddDataOpen}
          onClose={() => {
            setIsVodafoneAddDataOpen(false);
            setVodafoneEditingSiteCode(undefined);
            setVodafoneEditingRecord(null);
          }}
          allSiteCodes={vodafoneSites.map((s) => s.siteCode)}
          initialSiteCode={vodafoneEditingSiteCode}
          initialRecord={vodafoneEditingRecord}
          mode={vodafoneModalMode}
          sitesData={vodafoneSites}
          onSave={async (record) => {
            const res = await saveVodafoneRecord(record);
            if (res.success) {
              const code = record['Site code'] || record['site code'] || (record as any).site_code || '';
              if (code) {
                setDeletedSiteCodes((prev) => {
                  const next = new Set(prev);
                  next.delete(String(code).trim().toUpperCase());
                  persistDeletedSiteCodes(next);
                  return next;
                });
              }
              setToastMessage(res.message || `تم حفظ وتحديث بيانات موقع Vodafone (${code}) بنجاح في قاعدة البيانات ✅`);
            }
            return res;
          }}
          onSwitchToBulk={() => {
            setIsVodafoneAddDataOpen(false);
            setIsVodafoneBulkImportOpen(true);
          }}
        />
      </ModalErrorBoundary>

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
          setEtahaEditingSiteCode(undefined);
          setEtahaEditingRecord(null);
          setEtahaModalMode('edit');
          setIsEtahaAddDataOpen(true);
        }}
      />

      {/* Availability (الإتاحة) Add / Edit Data Modal */}
      <ModalErrorBoundary
        isOpen={isEtahaAddDataOpen}
        onClose={() => {
          setIsEtahaAddDataOpen(false);
          setEtahaEditingSiteCode(undefined);
          setEtahaEditingRecord(null);
        }}
        title="نافذة تعديل مشروع Availability"
      >
        <EtahaAddDataModal
          isOpen={isEtahaAddDataOpen}
          onClose={() => {
            setIsEtahaAddDataOpen(false);
            setEtahaEditingSiteCode(undefined);
            setEtahaEditingRecord(null);
          }}
          allSiteCodes={etahaSites.map((s) => s.siteCode)}
          initialSiteCode={etahaEditingSiteCode}
          initialRecord={etahaEditingRecord}
          mode={etahaModalMode}
          sitesData={etahaSites}
          onSave={async (record) => {
            const res = await saveEtahaRecord(record);
            if (res.success) {
              setToastMessage(`تم حفظ وتحديث بيانات مشروع الإتاحة (${record['Code'] || record['siteCode'] || ''}) بنجاح ✅`);
            } else {
              setToastMessage(`حدث خطأ أثناء حفظ بيانات الإتاحة: ${res.error || ''}`);
            }
            return res;
          }}
          onSwitchToBulk={() => {
            setIsEtahaAddDataOpen(false);
            setIsEtahaBulkImportOpen(true);
          }}
        />
      </ModalErrorBoundary>

      {/* Excel Uploader Modal */}
      <ExcelUploaderModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onApplyData={handleApplyUploadedData}
        onResetToDefault={handleResetToDefault}
        activeMetadata={uploadedMetadata}
      />

      {/* Bulk Delete Modal (Multi-Select & Excel File Bulk Delete) */}
      <BulkDeleteModal
        isOpen={isQuickDeleteModalOpen}
        onClose={() => {
          setIsQuickDeleteModalOpen(false);
          setQuickDeleteSelectedCode('');
        }}
        sites={authorizedScopeData}
        initialSelectedCodes={quickDeleteSelectedCode ? [quickDeleteSelectedCode] : []}
        activeScopeLabel={activeScope === 'ETAHA' ? 'مشروعات الإتاحة' : 'مواقع FTTS'}
        onDeleteBulk={async (siteCodes) => {
          if (!siteCodes || siteCodes.length === 0) return;
          try {
            if (activeScope === 'ETAHA' || activeScope === 'AVAILABILITY') {
              await deleteEtahaRecordsBulk(siteCodes);
              setToastMessage(`تم حذف ${siteCodes.length} مشروع بنجاح من قاعدة بيانات الإتاحة ✅`);
            } else if (filters.company === 'Orange') {
              await deleteOrangeRecordsBulk(siteCodes);
              setToastMessage(`تم حذف ${siteCodes.length} موقع بنجاح من مواقع Orange ✅`);
            } else if (filters.company === 'Vodafone') {
              await deleteVodafoneRecordsBulk(siteCodes);
              setToastMessage(`تم حذف ${siteCodes.length} موقع بنجاح من مواقع Vodafone ✅`);
            } else {
              await deleteRecordsBulk(siteCodes);
              removeRecordsLocally(siteCodes);
              setToastMessage(`تم حذف ${siteCodes.length} موقع بنجاح من قاعدة بيانات Supabase ✅`);
            }
            setDeletedSiteCodes((prev) => {
              const next = new Set(prev);
              siteCodes.forEach((c) => next.add(String(c).trim().toUpperCase()));
              persistDeletedSiteCodes(next);
              return next;
            });
            setIsQuickDeleteModalOpen(false);
          } catch (err: any) {
            setToastMessage(`حدث خطأ أثناء الحذف: ${err?.message || ''}`);
          }
        }}
      />

      {/* Login & Sector Permissions Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={closeLoginModal}
      />

      {/* Backup Email Configuration & Sending Modal */}
      <BackupEmailConfigModal
        isOpen={isBackupSettingsOpen}
        onClose={() => setIsBackupSettingsOpen(false)}
        onSendWithCredentials={handleEmailBackup}
        isSending={isEmailingBackup}
        targetEmail="Elsoltanalex@gmail.com"
      />
    </div>
  );
};
