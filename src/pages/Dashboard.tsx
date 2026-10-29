import { useState, useMemo, useCallback } from 'react';
import { Header } from '../components/Header';
import { KpiCards } from '../components/KpiCards';
import { CompanySelector } from '../components/CompanySelector';
import type { CompanyStatItem } from '../components/CompanySelector';
import { DonutChart } from '../components/DonutChart';
import { SummaryTable } from '../components/SummaryTable';
import { Filters } from '../components/Filters';
import { SiteDetailsModal } from '../components/SiteDetailsModal';
import { ExcelUploaderModal } from '../components/ExcelUploaderModal';
import { ProjectTabs } from '../components/ProjectTabs';
import type { ActiveProjectScope } from '../components/ProjectTabs';
import { WeAddDataModal } from '../components/WeAddDataModal';
import { WeDataAnalysisModal } from '../components/WeDataAnalysisModal';
import { WeDataManagerModal } from '../components/WeDataManagerModal';
import { LoginModal } from '../components/LoginModal';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Building2, Eye, LogIn, Lock, LogOut } from 'lucide-react';
import { isRecordInSector, toCanonicalSector } from '../utils/sectorPermissions';
import { useWeRecords, useWeSiteCodes, exportToCSV } from '../hooks/useWeAPI';
import type { WeRecord } from '../config/fieldConfig';
import { normalizeClassification } from '../config/fieldConfig';


import {
  calculateStatusSummaries
} from '../data/dashboardData';
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
};

// Helper: Map a dynamic WeRecord from Supabase to SiteRecord format for dashboard
function mapWeRecordToSiteRecord(r: WeRecord, index = 0): SiteRecord {
  const siteCode = r['site code'] || (r as any).site_code || `SITE-${index + 1}`;
  const rawStatus = r['Site Status'] || '';
  const rawTasneef = r['التصنيف'] || '';

  let status: StatusType = 'جاري المعاينة';
  const ss = String(rawStatus).toUpperCase();
  const tasneef = normalizeClassification(rawTasneef);

  if (tasneef.includes('انتهاء') || tasneef.includes('تشغيل فايبر') || tasneef.includes('تشغيل فيبر') || tasneef.includes('تسليم')) {
    status = 'تم التسليم';
  } else if (tasneef.includes('تصاريح') || ss.includes('RDT') || tasneef.includes('طلب استخراج')) {
    status = 'جاري تصاريح';
  } else if (tasneef.includes('معوق')) {
    status = 'معوقات';
  } else if (tasneef.includes('متعذر') || tasneef.includes('متعثر') || tasneef.includes('رفض')) {
    status = 'متعثرات';
  } else if (tasneef.includes('معاين')) {
    status = 'جاري المعاينة';
  } else if (tasneef.includes('كهرب')) {
    status = 'جاري العمل كهربى';
  } else if (tasneef.includes('مدن') || ss.includes('CWF') || ss.includes('ONGOING') || tasneef.includes('عمل')) {
    status = 'جاري العمل مدني';
  }

  const type = String(r['Type'] || '');
  const company: 'WE' | 'Vodafone' | 'Orange' = 'WE';

  const central = r['السنترال'] || r['Zone'] || r['قطاع المناطق'] || r['اداره التنفيذ المختصه'] || 'سنترال رئيسي';
  const rawSectore = r['Sectore'] || r['Sectores'] || r['Exc sector'] || r['Zone'] || '';
  const sector = toCanonicalSector(rawSectore) || 'قطاع عام';

  const generalAdmin = r['اداره التنفيذ المختصه'] || r['Exc Zone'] || r['الادارة العامة لتنفيذ الشبكات'] || 'الإدارة العامة لتنفيذ الشبكات';
  const competentAdmin = r['Zone'] || r['قطاع المناطق'] || r['مسئولية التنفيذ'] || 'إدارة التنفيذ والمسارات';
  const classification = type || tasneef || 'FTTS Rollout';
  const obstacleReason = r['اسباب التعذر'] || r['الملاحظات'] || 'لا يوجد تعذر';
  const expectedDate = r['خطة'] ? `${r['خطة']}-12-31` : (r['التاريخ المتوقع للانتهاء'] || '2026-12-31');

  let progressPercent = 25;
  if (status === 'تم التسليم') progressPercent = 100;
  else if (status === 'جاري العمل مدني' || status === 'جاري مدني') progressPercent = 60;
  else if (status === 'جاري العمل كهربى' || status === 'جاري كهربي') progressPercent = 75;
  else if (status === 'جاري تصاريح') progressPercent = 40;
  else if (status === 'معوقات') progressPercent = 30;
  else if (status === 'متعثرات') progressPercent = 15;
  else if (status === 'جاري المعاينة') progressPercent = 20;

  return {
    id: r._id || `FTTS-LIVE-${index + 1}`,
    siteCode,
    siteName: `موقع ${siteCode} - ${central}`,
    company,
    status,
    linksCount: 1,
    sector,
    generalAdmin,
    competentAdmin,
    central,
    classification,
    obstacleReason,
    expectedDate,
    progressPercent,
    civilContractor: r['المسئولية'] || 'المصرية للاتصالات',
    notes: r['الملاحظات'] || r['اسباب التعذر'] || r['الجهة المطلوب الدعم منها'] || '',
  };
}

export const Dashboard: React.FC = () => {
  const { user, isLoginModalOpen, closeLoginModal, openLoginModal, logout } = useAuth();

  // Current active project scope: FTTS, ETAHA, TAHAWOL, or UPLOADED
  const [activeScope, setActiveScope] = useState<ActiveProjectScope>('FTTS');

  // Custom uploaded file states
  const [uploadedSites, setUploadedSites] = useState<SiteRecord[]>([]);
  const [uploadedMetadata, setUploadedMetadata] = useState<UploadedFileMetadata | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // WE specific UI states
  const [isWeAnalysisOpen, setIsWeAnalysisOpen] = useState(false);
  const [isWeAddDataOpen, setIsWeAddDataOpen] = useState(false);
  const [isWeManagerOpen, setIsWeManagerOpen] = useState(false);
  const [editingSiteCode, setEditingSiteCode] = useState<string | undefined>(undefined);
  const [editingRecord, setEditingRecord] = useState<WeRecord | null>(null);
  const [weModalMode, setWeModalMode] = useState<'add' | 'edit'>('edit');

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
    }
    // Background cloud sync
    refetchWeRecords();
    refetchWeCodes();
  }, [user, updateOrAddRecordLocally, addCodeLocally, refetchWeRecords, refetchWeCodes]);

  // Convert live Supabase WE records to SiteRecord format
  const liveWeSites = useMemo<SiteRecord[]>(() => {
    if (weCentralRecords && weCentralRecords.length > 0) {
      return weCentralRecords.map((r, i) => mapWeRecordToSiteRecord(r, i));
    }
    return WE_EXCEL_SITES;
  }, [weCentralRecords]);

  // Combined FTTS dataset: WE (1440 sites) + Vodafone sharing + Orange sharing = Total FTTS Plan
  const combinedFttsSites = useMemo<SiteRecord[]>(() => {
    // 1. All WE sites (1440 sites from master plan)
    const weSites = liveWeSites.map((s) => ({ ...s, company: 'WE' as const }));

    // 2. Derive Vodafone sites from Sharing (VDF)
    const vodafoneSites = liveWeSites
      .filter((s) => {
        const cls = String(s.classification || '');
        return cls.includes('VDF');
      })
      .map((s, idx) => ({
        ...s,
        id: `FTTS-VDF-${s.siteCode || idx + 1}`,
        company: 'Vodafone' as const,
      }));

    // 3. Derive Orange sites from Sharing (ORG)
    const orangeSites = liveWeSites
      .filter((s) => {
        const cls = String(s.classification || '');
        return cls.includes('ORG');
      })
      .map((s, idx) => ({
        ...s,
        id: `FTTS-ORG-${s.siteCode || idx + 1}`,
        company: 'Orange' as const,
      }));

    // Total FTTS Plan = WE (1440) + Vodafone (20) + Orange (48) = 1508
    return [...weSites, ...vodafoneSites, ...orangeSites];
  }, [liveWeSites]);

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [modalFilterStatus, setModalFilterStatus] = useState<string | undefined>(undefined);

  // Active base dataset according to selected project scope
  const currentScopeData = useMemo(() => {
    switch (activeScope) {
      case 'FTTS':
        return combinedFttsSites;
      case 'ETAHA':
        return ETAHA_EXCEL_SITES;
      case 'TAHAWOL':
        return TAHAWOL_EXCEL_SITES;
      case 'UPLOADED':
        return uploadedSites.length > 0 ? uploadedSites : combinedFttsSites;
      default:
        return combinedFttsSites;
    }
  }, [activeScope, uploadedSites, combinedFttsSites]);

  // Apply Strict Role-Based Access Control (RBAC):
  // - Admin: All sectors appear in the dashboard
  // - Specific Sector (e.g. Planning, Operations, or geographical sector):
  //   ONLY data belonging to that sector appears; all other sectors are strictly hidden and blocked!
  const authorizedScopeData = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin' || user.sector === 'ALL') {
      return currentScopeData;
    }
    return currentScopeData.filter((site) => isRecordInSector(user.sector, site));
  }, [currentScopeData, user]);

  // Project Tabs counts scoped to user's permissions
  const projectScopeCounts = useMemo(() => {
    if (!user || user.role === 'admin' || user.sector === 'ALL') {
      return {
        ftts: combinedFttsSites.length,
        etaha: ETAHA_EXCEL_SITES.length,
        tahawol: TAHAWOL_EXCEL_SITES.length,
        uploaded: uploadedSites.length,
      };
    }
    return {
      ftts: combinedFttsSites.filter((s) => isRecordInSector(user.sector, s)).length,
      etaha: ETAHA_EXCEL_SITES.filter((s) => isRecordInSector(user.sector, s)).length,
      tahawol: TAHAWOL_EXCEL_SITES.filter((s) => isRecordInSector(user.sector, s)).length,
      uploaded: uploadedSites.filter((s) => isRecordInSector(user.sector, s)).length,
    };
  }, [combinedFttsSites, uploadedSites, user]);

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

      // 2. Status Filter
      if (filters.status && site.status !== filters.status) {
        return false;
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
      if (filters.generalAdmin && site.generalAdmin !== filters.generalAdmin) {
        return false;
      }
      // 6. Competent Admin Filter
      if (filters.competentAdmin && site.competentAdmin !== filters.competentAdmin) {
        return false;
      }
      // 7. Central / Exchange Filter
      if (filters.central && site.central !== filters.central) {
        return false;
      }
      // 8. Classification Filter
      if (filters.classification && site.classification !== filters.classification) {
        return false;
      }
      // 9. Obstacle Reason Filter
      if (filters.obstacleReason && site.obstacleReason !== filters.obstacleReason) {
        return false;
      }

      return true;
    });
  }, [authorizedScopeData, filters, activeScope]);

  // Compute status breakdown table and donut chart data
  const statusSummaries = useMemo(() => {
    return calculateStatusSummaries(filteredSites);
  }, [filteredSites]);

  // Compute live KPIs
  const kpis: KpiData = useMemo(() => {
    const totalSites = filteredSites.length;
    const totalLinks = filteredSites.reduce((sum, s) => sum + s.linksCount, 0);
    const completedSites = filteredSites.filter((s) => s.status === 'تم التسليم').length;
    const permitsCount = filteredSites.filter((s) => s.status === 'جاري تصاريح').length;
    const obstaclesCount = filteredSites.filter((s) => s.status === 'معوقات').length;
    const stalledCount = filteredSites.filter((s) => s.status === 'متعثرات').length;
    const inProgressSites = totalSites - completedSites;
    const completionRate = totalSites > 0
      ? Number(((completedSites / totalSites) * 100).toFixed(1))
      : 0;

    return {
      totalSites,
      totalLinks,
      completedSites,
      permitsCount,
      obstaclesCount,
      stalledCount,
      completionRate,
      inProgressSites,
    };
  }, [filteredSites]);

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

  // Custom cards for Etaha and Tahawol scopes
  const customScopeCards: CompanyStatItem[] | undefined = useMemo(() => {
    if (activeScope === 'ETAHA') {
      const scopeData = user && user.role !== 'admin' && user.sector !== 'ALL'
        ? ETAHA_EXCEL_SITES.filter((s) => isRecordInSector(user.sector, s))
        : ETAHA_EXCEL_SITES;
      const allCount = scopeData.length;
      const eduSites = scopeData.filter((s) => s.siteName.includes('التربية والتعليم') || s.classification.includes('تعليم'));
      const bankSites = scopeData.filter((s) => s.siteName.includes('بنك') || s.siteName.includes('مصرف') || s.siteName.includes('الأهلي') || s.siteName.includes('مصر'));
      const customsSites = scopeData.filter((s) => s.siteName.includes('جمارك') || s.siteName.includes('ضرائب'));

      return [
        {
          id: 'All',
          nameAr: 'جميع الجهات والعملاء',
          nameEn: 'All Clients',
          sites: allCount,
          links: allCount,
          color: 'hover:border-slate-400',
          activeBorder: 'border-teal-700 bg-gradient-to-r from-teal-800 to-emerald-900 text-white shadow-md ring-2 ring-teal-500/20',
          badgeBg: 'bg-teal-50 text-teal-700',
          badgeText: 'text-teal-600',
          brandDot: 'bg-teal-600',
        },
        {
          id: 'التعليم',
          nameAr: 'وزارة التربية والتعليم',
          nameEn: 'Schools & Education',
          sites: eduSites.length,
          links: eduSites.length,
          color: 'hover:border-sky-400',
          activeBorder: 'border-sky-600 bg-gradient-to-br from-sky-600 to-blue-700 text-white shadow-md ring-2 ring-sky-500/20',
          badgeBg: 'bg-sky-50 text-sky-700',
          badgeText: 'text-sky-600',
          brandDot: 'bg-sky-500',
        },
        {
          id: 'البنوك',
          nameAr: 'القطاع المصرفي والبنوك',
          nameEn: 'Banking Sector',
          sites: bankSites.length,
          links: bankSites.length,
          color: 'hover:border-emerald-400',
          activeBorder: 'border-emerald-600 bg-gradient-to-br from-emerald-600 to-green-700 text-white shadow-md ring-2 ring-emerald-500/20',
          badgeBg: 'bg-emerald-50 text-emerald-700',
          badgeText: 'text-emerald-600',
          brandDot: 'bg-emerald-600',
        },
        {
          id: 'الجمارك والضرائب',
          nameAr: 'الجمارك والضرائب',
          nameEn: 'Customs & Tax Offices',
          sites: customsSites.length,
          links: customsSites.length,
          color: 'hover:border-indigo-400',
          activeBorder: 'border-indigo-600 bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-md ring-2 ring-indigo-500/20',
          badgeBg: 'bg-indigo-50 text-indigo-700',
          badgeText: 'text-indigo-600',
          brandDot: 'bg-indigo-600',
        },
      ];
    }

    if (activeScope === 'TAHAWOL') {
      const scopeData = user && user.role !== 'admin' && user.sector !== 'ALL'
        ? TAHAWOL_EXCEL_SITES.filter((s) => isRecordInSector(user.sector, s))
        : TAHAWOL_EXCEL_SITES;
      const allCount = scopeData.length;
      const dakhleya = scopeData.filter((s) => s.siteName.includes('الداخلية') || s.classification.includes('الداخلية'));
      const adl = scopeData.filter((s) => s.siteName.includes('العدل') || s.classification.includes('العدل'));
      const seha = scopeData.filter((s) => s.siteName.includes('الصحة') || s.classification.includes('الصحة'));

      return [
        {
          id: 'All',
          nameAr: 'جميع الوزارات والجهات',
          nameEn: 'All Ministries',
          sites: allCount,
          links: allCount,
          color: 'hover:border-slate-400',
          activeBorder: 'border-amber-700 bg-gradient-to-r from-amber-800 to-orange-900 text-white shadow-md ring-2 ring-amber-500/20',
          badgeBg: 'bg-amber-50 text-amber-700',
          badgeText: 'text-amber-600',
          brandDot: 'bg-amber-600',
        },
        {
          id: 'الداخلية',
          nameAr: 'وزارة الداخلية',
          nameEn: 'Interior & Law Enforcement',
          sites: dakhleya.length,
          links: dakhleya.length,
          color: 'hover:border-blue-400',
          activeBorder: 'border-blue-700 bg-gradient-to-br from-blue-700 to-indigo-900 text-white shadow-md ring-2 ring-blue-500/20',
          badgeBg: 'bg-blue-50 text-blue-700',
          badgeText: 'text-blue-600',
          brandDot: 'bg-blue-600',
        },
        {
          id: 'العدل',
          nameAr: 'وزارة العدل والمحاكم',
          nameEn: 'Justice & Courts',
          sites: adl.length,
          links: adl.length,
          color: 'hover:border-emerald-400',
          activeBorder: 'border-emerald-600 bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md ring-2 ring-emerald-500/20',
          badgeBg: 'bg-emerald-50 text-emerald-700',
          badgeText: 'text-emerald-600',
          brandDot: 'bg-emerald-600',
        },
        {
          id: 'الصحة',
          nameAr: 'وزارة الصحة والمستشفيات',
          nameEn: 'Health & Hospitals',
          sites: seha.length,
          links: seha.length,
          color: 'hover:border-rose-400',
          activeBorder: 'border-rose-600 bg-gradient-to-br from-rose-600 to-red-700 text-white shadow-md ring-2 ring-rose-500/20',
          badgeBg: 'bg-rose-50 text-rose-700',
          badgeText: 'text-rose-600',
          brandDot: 'bg-red-500',
        },
      ];
    }

    return undefined;
  }, [activeScope, user]);


  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.company !== 'All') count++;
    if (filters.status) count++;
    if (filters.expectedDate) count++;
    if (filters.sector) count++;
    if (filters.generalAdmin) count++;
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
    setFilters(initialFilters);
  };

  const handleScopeChange = (scope: ActiveProjectScope) => {
    setActiveScope(scope);
    setFilters(initialFilters);
  };

  const handleStatusSelect = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status === status ? '' : status,
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
  };

  // Reset to original baseline data
  const handleResetToDefault = () => {
    setActiveScope('FTTS');
    setUploadedMetadata(null);
    setFilters(initialFilters);
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

        {/* 2. Project Scope Navigation Tabs (FTTS, Etaha, Tahawol, Uploaded) */}
        <ProjectTabs
          activeScope={activeScope}
          onChangeScope={handleScopeChange}
          counts={projectScopeCounts}
          hasUploadedFile={Boolean(uploadedMetadata)}
          uploadedFileName={uploadedMetadata?.fileName}
        />

        {/* 3. Top KPI Cards */}
        <KpiCards
          kpis={kpis}
          activeStatusFilter={filters.status}
          onSelectStatusFilter={handleStatusSelect}
        />

        {/* 4. Company / Client Category Selector (Full Width) */}
        <div className="mb-6">
          <CompanySelector
            selectedCompany={filters.company}
            onChangeCompany={(c) => handleFilterChange('company', c)}
            title={
              activeScope === 'FTTS'
                ? 'مشغلو شبكات المحمول (ftts.xlsx + We.xlsx)'
                : activeScope === 'ETAHA'
                  ? 'تصنيف الجهات والعملاء (الاتاحه .xlsx)'
                  : activeScope === 'TAHAWOL'
                    ? 'الوزارات والهيئات الحكومية (بيان التحول الرقمى.xlsx)'
                    : 'تحديد المشغل / الكيان'
            }
            subtitle={
              activeScope === 'FTTS'
                ? 'انقر على Vodafone أو Orange لعرض ftts.xlsx أو WE لعرض We.xlsx'
                : activeScope === 'ETAHA'
                  ? 'تصفية مواقع وفروع الإتاحة بحسب القطاع المستفيد'
                  : 'تصفية مواقع التحول الرقمي بحسب الوزارة المعنية'
            }
            customCards={customScopeCards}
            stats={companyStats}
          />
          {/* WE Action Buttons */}
          {filters.company === 'WE' && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium text-sm flex items-center gap-1.5"
                onClick={() => setIsWeAnalysisOpen(true)}
              >
                📊 عرض تحليل WE
              </button>
              <button
                className="px-4 py-2 bg-blue-800 text-white rounded hover:bg-blue-900 font-medium text-sm flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                onClick={() => {
                  setEditingSiteCode(undefined);
                  setEditingRecord(null);
                  setWeModalMode(user?.role === 'admin' ? 'add' : 'edit');
                  setIsWeAddDataOpen(true);
                }}
                disabled={weCodesLoading}
                title={user?.role === 'admin' ? 'إضافة موقع جديد أو تعديل موقع مسجل' : 'تعديل وتحديث بيانات المواقع المسجلة التابعة لقطاعك'}
              >
                {weCodesLoading
                  ? '⏳ تحميل...'
                  : user?.role === 'admin'
                    ? '➕ إضافة موقع جديد / ✏️ تعديل'
                    : '✏️ تعديل بيانات مواقع قطاعك'}
              </button>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium text-sm flex items-center gap-1.5"
                onClick={() => exportToCSV()}
                title="تصدير قاعدة البيانات المركزية كاملة إلى CSV"
              >
                📥 تصدير البيانات المركزية (CSV)
              </button>
              <button
                className="px-4 py-2 bg-purple-700 text-white rounded hover:bg-purple-800 font-medium text-sm flex items-center gap-1.5 shadow-sm"
                onClick={() => setIsWeManagerOpen(true)}
                title="إدارة وتعديل السجلات وحذف البيانات غير المهمة أو تصدير CSV نظيف"
              >
                🧹 إدارة وحذف بيانات WE (CSV)
              </button>
              <button
                className="px-3 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 font-medium text-sm flex items-center gap-1.5 transition"
                onClick={() => {
                  refetchWeRecords();
                  refetchWeCodes();
                }}
                title="تحديث البيانات من السحابة"
              >
                🔄 {weRecordsLoading ? 'جارِ المزامنة...' : 'تحديث مباشر'}
              </button>
              <span className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
                ⚡ سحابي: {user && user.role !== 'admin' && user.sector !== 'ALL' ? liveWeSites.filter(s => isRecordInSector(user.sector, s)).length : liveWeSites.length} موقع
              </span>
            </div>
          )}
        </div>

        {/* 5. Interactive Dashboard Slicers / Filters (Positioned above Overview & Donut Charts) */}
        <div className="mb-6">
          <Filters
            filters={filters}
            onChangeFilter={handleFilterChange}
            onResetFilters={handleResetFilters}
            sitesData={authorizedScopeData}
          />
        </div>

        {/* 6. Core Power BI Visuals: Donut Chart + Summary Table - الموقف العام لتنفيذ المواقع */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
          {/* Donut Chart */}
          <div className="lg:col-span-6 xl:col-span-6">
            <DonutChart
              data={statusSummaries}
              totalSites={kpis.totalSites}
              activeStatusFilter={filters.status}
              onSelectStatus={handleStatusSelect}
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
          setEditingSiteCode(siteCode);
          setEditingRecord(null);
          setWeModalMode('edit');
          setIsWeAddDataOpen(true);
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
        onSaved={handleWeRecordSaved}
        onSave={handleWeRecordSaved}
        onSubmit={handleWeRecordSaved}
      />
      {/* Excel Uploader Modal */}
      <ExcelUploaderModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onApplyData={handleApplyUploadedData}
        onResetToDefault={handleResetToDefault}
        activeMetadata={uploadedMetadata}
      />

      {/* Login & Sector Permissions Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={closeLoginModal}
      />
    </div>
  );
};
