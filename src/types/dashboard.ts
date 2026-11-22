export type StatusType =
  | 'تم الانتهاء'
  | 'تم التشغيل فايبر'
  | 'جاري العمل مدني'
  | 'جاري المعاينة'
  | 'جاري تصاريح'
  | 'جاري كهرباء'
  | 'متعذر / معوقات'
  | 'تم التسليم'
  | 'جاري مدني'
  | 'جاري كهربي'
  | 'جاري العمل كهربى'
  | 'متعذر'
  | 'معوقات'
  | 'متعثرات'
  | string;

export type ExecutionCategory = 'Completed' | 'In Progress' | 'Planned' | 'Blocked / On Hold' | string;

export type CompanyType = 'All' | 'Vodafone' | 'Orange' | 'WE' | string;

export interface SiteRecord {
  id: string;
  siteCode: string;
  siteName: string;
  company: 'Orange' | 'Vodafone' | 'WE' | string;
  status: StatusType;
  executionCategory?: ExecutionCategory;
  linksCount: number;
  sector: string;
  generalAdmin: string;
  competentAdmin: string;
  central: string;
  classification: string;
  obstacleReason: string;
  expectedDate: string;
  progressPercent: number;
  civilContractor?: string;
  notes?: string;
  // Orange & detailed attributes
  subSector?: string;
  executionSector?: string;
  governorate?: string;
  address?: string;
  responsibility?: string;
  deliveryArea?: string;
  deliveryOrange?: string;
  deliveryNotes?: string;
  obstacleType?: string;
  obstacleDetails?: string;
  documentStatus?: string;
  documentRef?: string;
  electricalClassification?: string;
  electricalStage?: string;
  lat?: number | string;
  lng?: number | string;
  txAvail?: string;
  executedBy?: string;
  totalCost?: number | string;
  // Etaha attributes
  externalPath?: string;
  internalPath?: string;
  deliveryStatus?: string;
  excelStatus?: string;
  paymentAndStartDate?: string;
  specialTarget?: boolean;
  rawRecord?: any;
}

export interface StatusSummary {
  status: string;
  statusEn: string;
  sitesCount: number;
  linksCount: number;
  percentage: number;
  color: string;
  badgeBg: string;
  borderColor: string;
}

export interface FilterState {
  company: CompanyType;
  sector: string | string[];
  generalAdmin: string | string[];
  competentAdmin: string | string[];
  central: string | string[];
  classification: string | string[];
  obstacleReason: string | string[];
  status: string | string[]; // 'All' or specific status or array of statuses
  expectedDate: string;
  searchQuery: string;
  subSector?: string | string[]; // الإدارة المختصة (القطاع) for Orange 4-tier hierarchy
  // Etaha-specific 3 axes of classification (Multi-Select)
  externalPath?: string | string[];   // المسار الخارجي
  internalPath?: string | string[];   // المسار الداخلي
  excelStatus?: string | string[];    // موقف الإكسيل (legacy)
  deliveryStatus?: string | string[]; // موقف التسليم
  specialTarget?: boolean | string;   // سبيشال تارجت
}

export interface KpiData {
  totalSites: number;
  totalLinks: number;
  // Exact 8 Excel classifications
  completedSites: number;     // تم الانتهاء
  fiberActiveSites: number;   // تم التشغيل فايبر
  civilDoneSites: number;     // تم مدني
  inProgressSites: number;    // جاري العمل
  surveySites: number;        // جاري المعاينة
  permitsSites: number;       // جاري تصريح
  stalledSites: number;       // متعذر
  obstaclesSites: number;     // معوقات
  // Backward-compatibility aliases
  plannedSites?: number;
  blockedSites?: number;
  permitsCount?: number;
  obstaclesCount?: number;
  stalledCount?: number;
  completionRate: number;
}

export interface UploadedFileMetadata {
  fileName: string;
  uploadTime: string;
  totalRows: number;
  detectedColumns: string[];
}
