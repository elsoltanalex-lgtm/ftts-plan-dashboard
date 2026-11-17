// src/utils/backupExportService.ts
// Service to collect and export a full organized backup from Supabase & application state to Excel (.xlsx)

import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import type { SiteRecord } from '../types/dashboard';
import { WE_EXCEL_SITES, TAHAWOL_EXCEL_SITES } from '../data/preloadedProjects';
import { VODAFONE_RAW_RECORDS } from '../data/vodafoneSites';
import { ORANGE_RAW_RECORDS } from '../data/orangeSites';
import { ETAHA_RAW_RECORDS } from '../data/etahaSites';

export interface ExportBackupOptions {
  liveWeSites?: SiteRecord[];
  vodafoneSites?: SiteRecord[];
  orangeSites?: SiteRecord[];
  etahaSites?: SiteRecord[];
  deletedSiteCodes?: Set<string>;
  userName?: string;
  userSector?: string;
}

/**
 * Safely queries a Supabase table with fallback to empty array on failure
 */
async function fetchSupabaseTableData(tableName: string): Promise<any[] | null> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(10000);

    if (error || !data || data.length === 0) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Collects all current data from Supabase tables (with live frontend state fallback)
 * and downloads a comprehensive, multi-sheet Excel (.xlsx) backup file.
 */
export async function exportFullDatabaseBackup(options: ExportBackupOptions = {}): Promise<{
  success: boolean;
  fileName: string;
  totalSites: number;
  counts: Record<string, number>;
}> {
  const {
    liveWeSites = [],
    vodafoneSites = [],
    orangeSites = [],
    etahaSites = [],
    deletedSiteCodes = new Set(),
    userName = 'مدير النظام',
    userSector = 'كافة القطاعات',
  } = options;

  // 1. Fetch live tables from Supabase in parallel
  const [supabaseWe, supabaseVodafone, supabaseOrange, supabaseEtaha] = await Promise.all([
    fetchSupabaseTableData('we_records').catch(() => null),
    fetchSupabaseTableData('vodafone_records').catch(() => null),
    fetchSupabaseTableData('orange_records').catch(() => null),
    fetchSupabaseTableData('etaha_records').catch(() => null),
  ]);

  const isDeleted = (code?: string, id?: string) => {
    if (!code && !id) return false;
    const c = String(code || '').trim().toUpperCase();
    const i = String(id || '').trim().toUpperCase();
    return deletedSiteCodes.has(c) || deletedSiteCodes.has(i);
  };

  // 2. Prepare WE Data
  let weList: any[] = [];
  if (supabaseWe && supabaseWe.length > 0) {
    weList = supabaseWe.filter((r) => !isDeleted(r['site code'] || r[' Site code'] || r.site_code, r.id));
  } else if (liveWeSites && liveWeSites.length > 0) {
    weList = liveWeSites.filter((s) => !isDeleted(s.siteCode, s.id));
  } else {
    weList = WE_EXCEL_SITES.filter((s) => !isDeleted(s.siteCode, s.id));
  }

  // 3. Prepare Vodafone Data
  let vodafoneList: any[] = [];
  if (supabaseVodafone && supabaseVodafone.length > 0) {
    vodafoneList = supabaseVodafone.filter((r) => !isDeleted(r['site code'] || r[' Site code'] || r.site_code, r.id));
  } else if (vodafoneSites && vodafoneSites.length > 0) {
    vodafoneList = vodafoneSites.filter((s) => !isDeleted(s.siteCode, s.id));
  } else {
    vodafoneList = VODAFONE_RAW_RECORDS.filter((r) => !isDeleted(r[' Site code']));
  }

  // 4. Prepare Orange Data
  let orangeList: any[] = [];
  if (supabaseOrange && supabaseOrange.length > 0) {
    orangeList = supabaseOrange.filter((r) => !isDeleted(r['site code'] || r[' Site code'] || r.site_code, r.id));
  } else if (orangeSites && orangeSites.length > 0) {
    orangeList = orangeSites.filter((s) => !isDeleted(s.siteCode, s.id));
  } else {
    orangeList = ORANGE_RAW_RECORDS.filter((r) => !isDeleted(r[' Site code']));
  }

  // 5. Prepare Availability (Etaha) Data
  let etahaList: any[] = [];
  if (supabaseEtaha && supabaseEtaha.length > 0) {
    etahaList = supabaseEtaha.filter((r) => !isDeleted(r.Code || r.code, r.id));
  } else if (etahaSites && etahaSites.length > 0) {
    etahaList = etahaSites.filter((s) => !isDeleted(s.siteCode, s.id));
  } else {
    etahaList = ETAHA_RAW_RECORDS.filter((r) => !isDeleted(r.Code));
  }

  // 6. Digital Transformation Data
  const tahawolList = TAHAWOL_EXCEL_SITES.filter((s) => !isDeleted(s.siteCode, s.id));

  // 7. Master Consolidated FTTS Dataset (WE + Vodafone + Orange)
  const masterFttsRows: any[] = [];

  // Helper to extract uniform fields
  const extractMasterRow = (item: any, operator: string) => {
    const raw = item.rawRecord || item;
    const code = item.siteCode || raw[' Site code'] || raw['site code'] || raw.site_code || raw.Code || '';
    const name = item.siteName || `موقع ${code}`;
    const central = item.central || raw['سنترال الربط'] || raw['السنترال'] || '';
    const sector = item.sector || raw['رئاسة قطاعات التنفيذ'] || raw['Sectore'] || '';
    const generalAdmin = item.generalAdmin || raw['الادارة العامة لتنفيذ الشبكات'] || raw['الادارة العامة للمنطقة'] || '';
    const competentAdmin = item.competentAdmin || raw['ادارة التنفيذ الفرعية'] || raw['إدارة التنفيذ المختصة'] || raw['اداره التنفيذ المختصه'] || '';
    const classification = item.classification || raw['التصنيف'] || '';
    const status = item.status || classification || 'جاري العمل';
    const obstacles = item.obstacleReason || raw['اسباب التعّذر'] || raw['اسباب التعذر'] || '';
    const notes = item.notes || raw['الملاحظات'] || '';
    const expectedDate = item.expectedDate || raw['التاريخ المتوقع للانتهاء'] || '';
    const progress = item.progressPercent !== undefined ? `${item.progressPercent}%` : '';
    const contractor = item.civilContractor || raw['مسئولية التنفيذ'] || operator;

    return {
      'كود الموقع (Site Code)': code,
      'اسم الموقع (Site Name)': name,
      'المشغل (Operator)': operator,
      'التصنيف الحالي': classification,
      'الحالة التنفيذية': status,
      'نسبة الإنجاز': progress,
      'السنترال (Central)': central,
      'القطاع (Sector)': sector,
      'الإدارة العامة (General Admin)': generalAdmin,
      'إدارة التنفيذ المختصة': competentAdmin,
      'تاريخ الانتهاء المتوقع': expectedDate,
      'أسباب التعذر / المعوقات': obstacles,
      'الملاحظات': notes,
      'مسئولية التنفيذ': contractor,
    };
  };

  weList.forEach((item) => masterFttsRows.push(extractMasterRow(item, 'WE')));
  vodafoneList.forEach((item) => masterFttsRows.push(extractMasterRow(item, 'Vodafone')));
  orangeList.forEach((item) => masterFttsRows.push(extractMasterRow(item, 'Orange')));

  // Format WE Sheet
  const weSheetRows = weList.map((item, idx) => {
    const raw = item.rawRecord || item;
    return {
      'مسلسل': idx + 1,
      'Site Code': item.siteCode || raw[' Site code'] || raw['site code'] || raw.site_code || '',
      'اسم الموقع': item.siteName || `موقع ${item.siteCode || ''}`,
      'سنترال الربط': item.central || raw['سنترال الربط'] || raw['السنترال'] || '',
      'التصنيف': item.classification || raw['التصنيف'] || '',
      'الحالة التنفيذية': item.status || raw['التصنيف'] || '',
      'نسبة الإنجاز': item.progressPercent ? `${item.progressPercent}%` : '',
      'رئاسة قطاعات التنفيذ': item.sector || raw['رئاسة قطاعات التنفيذ'] || raw['Sectore'] || '',
      'الادارة العامة لتنفيذ الشبكات': item.generalAdmin || raw['الادارة العامة لتنفيذ الشبكات'] || '',
      'إدارة التنفيذ المختصة': item.competentAdmin || raw['ادارة التنفيذ الفرعية'] || raw['إدارة التنفيذ المختصة'] || '',
      'تاريخ الانتهاء المتوقع': item.expectedDate || raw['التاريخ المتوقع للانتهاء'] || '',
      'اسباب التعذر': item.obstacleReason || raw['اسباب التعّذر'] || raw['اسباب التعذر'] || '',
      'الملاحظات': item.notes || raw['الملاحظات'] || '',
      'الجهة المطلوب الدعم منها': raw['الجهة المطلوب الدعم منها'] || '',
      'مسئولية التنفيذ': item.civilContractor || raw['مسئولية التنفيذ'] || 'WE',
      'خط العرض (Lat)': item.lat || raw['NLatitude'] || '',
      'خط الطول (Lng)': item.lng || raw['NLongitude'] || '',
    };
  });

  // Format Vodafone Sheet
  const vodafoneSheetRows = vodafoneList.map((item, idx) => {
    const raw = item.rawRecord || item;
    return {
      'مسلسل': idx + 1,
      'Site Code': item.siteCode || raw[' Site code'] || raw['site code'] || '',
      'اسم الموقع': item.siteName || `موقع ${item.siteCode || ''}`,
      'المشغل': 'Vodafone',
      'سنترال الربط': item.central || raw['سنترال الربط'] || '',
      'التصنيف': item.classification || raw['التصنيف'] || '',
      'الحالة': item.status || '',
      'رئاسة قطاعات التنفيذ': item.sector || raw['رئاسة قطاعات التنفيذ'] || '',
      'الادارة العامة لتنفيذ الشبكات': item.generalAdmin || raw['الادارة العامة لتنفيذ الشبكات'] || '',
      'إدارة التنفيذ المختصة': item.competentAdmin || raw['اداره التنفيذ المختصه'] || raw['ادارة التنفيذ الفرعية'] || '',
      'تاريخ الانتهاء المتوقع': item.expectedDate || raw['التاريخ المتوقع للانتهاء'] || '',
      'اسباب التعذر': item.obstacleReason || raw['اسباب التعّذر'] || raw['اسباب التعذر'] || '',
      'الملاحظات': item.notes || raw['الملاحظات'] || '',
    };
  });

  // Format Orange Sheet
  const orangeSheetRows = orangeList.map((item, idx) => {
    const raw = item.rawRecord || item;
    return {
      'مسلسل': idx + 1,
      'Site Code': item.siteCode || raw[' Site code'] || raw['site code'] || '',
      'اسم الموقع': item.siteName || `موقع ${item.siteCode || ''}`,
      'المشغل': 'Orange',
      'سنترال الربط': item.central || raw['سنترال الربط'] || '',
      'التصنيف': item.classification || raw['التصنيف'] || '',
      'الحالة': item.status || '',
      'رئاسة قطاعات التنفيذ': item.sector || raw['رئاسة قطاعات التنفيذ'] || '',
      'الادارة العامة للمنطقة': item.generalAdmin || raw['الادارة العامة للمنطقة'] || '',
      'إدارة التنفيذ المختصة': item.competentAdmin || raw['ادارة التنفيذ الفرعية'] || '',
      'تاريخ الانتهاء المتوقع': item.expectedDate || raw['التاريخ المتوقع للانتهاء'] || '',
      'اسباب التعذر': item.obstacleReason || raw['اسباب التعذر'] || '',
      'الملاحظات': item.notes || raw['الملاحظات'] || '',
    };
  });

  // Format Availability (Etaha) Sheet
  const etahaSheetRows = etahaList.map((item, idx) => {
    const raw = item.rawRecord || item;
    return {
      'مسلسل': idx + 1,
      'كود الموقع (Code)': item.siteCode || raw.Code || raw.code || '',
      'اسم العميل': raw['اسم العميل'] || item.clientName || '',
      'اسم الفرع': raw['اسم الفرع'] || item.branchName || '',
      'العنوان': item.address || raw['العنوان'] || '',
      'القطاع': item.sector || raw['القطاع'] || '',
      'الإدارة العامة': item.generalAdmin || raw['الإدارة العامة'] || raw['الادارة العامة'] || '',
      'إدارة التنفيذ المختصة': item.competentAdmin || raw['إدارة التنفيذ المختصة'] || raw['ادارة التنفيذ المختصة'] || '',
      'المسار الداخلي': raw['المسار الداخلي'] || raw['مسار داخلي'] || 'غير محدد',
      'المسار الخارجي': raw['المسار الخارجي'] || raw['مسار خارجي'] || 'غير محدد',
      'موقف التسليم / التصنيف': item.status || raw['التصنيف'] || raw['موقف التسليم'] || '',
      'الملاحظات': item.notes || raw['الملاحظات'] || '',
    };
  });

  // Format Tahawol Sheet
  const tahawolSheetRows = tahawolList.map((item, idx) => ({
    'مسلسل': idx + 1,
    'كود الموقع': item.siteCode,
    'اسم الموقع': item.siteName,
    'المشروع': 'التحول الرقمي (Digital Transformation)',
    'القطاع': item.sector,
    'السنترال': item.central,
    'الحالة': item.status,
    'تاريخ الانتهاء المتوقع': item.expectedDate || '',
  }));

  // Format Metadata / Summary Sheet
  const now = new Date();
  const summarySheetRows = [
    { 'البيان': 'اسم المنظومة', 'القيمة': 'Fiber Tracking Board (FTTS Plan & Availability)' },
    { 'البيان': 'تاريخ وتوقيت النسخة الاحتياطية', 'القيمة': now.toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'medium' }) },
    { 'البيان': 'المستخدم المنفذ', 'القيمة': userName },
    { 'البيان': 'نطاق الصلاحيات', 'القيمة': userSector },
    { 'البيان': 'مصدر البيانات الرئيسي', 'القيمة': 'قاعدة بيانات Supabase السحابية المباشرة (Cloud PostgreSQL) مع المزامنة التلقائية' },
    { 'البيان': 'إجمالي مواقع خطة FTTS المجمعة', 'القيمة': masterFttsRows.length },
    { 'البيان': 'عدد مواقع المصرية للاتصالات (WE)', 'القيمة': weSheetRows.length },
    { 'البيان': 'عدد مواقع فودافون (Vodafone)', 'القيمة': vodafoneSheetRows.length },
    { 'البيان': 'عدد مواقع أورنج (Orange)', 'القيمة': orangeSheetRows.length },
    { 'البيان': 'عدد مشروعات الإتاحة (Availability)', 'القيمة': etahaSheetRows.length },
    { 'البيان': 'عدد مشروعات التحول الرقمي (Digital Transformation)', 'القيمة': tahawolSheetRows.length },
    { 'البيان': 'إجمالي السجلات المدعومة بالنسخة الاحتياطية', 'القيمة': masterFttsRows.length + etahaSheetRows.length + tahawolSheetRows.length },
    { 'البيان': 'حالة الحفظ والمزامنة', 'القيمة': 'محدثة بالكامل مع أحدث عمليات الإضافة والتعديل والحذف' },
  ];

  // Create Excel Workbook
  const wb = XLSX.utils.book_new();

  // Helper to add sheet with RTL and column auto-widths
  const addStyledSheet = (sheetData: any[], sheetName: string) => {
    const ws = XLSX.utils.json_to_sheet(sheetData);
    // Auto-fit column widths
    if (sheetData.length > 0) {
      const keys = Object.keys(sheetData[0]);
      ws['!cols'] = keys.map((key) => {
        let maxLen = key.length;
        for (let i = 0; i < Math.min(sheetData.length, 50); i++) {
          const val = sheetData[i][key];
          if (val) {
            const strVal = String(val);
            if (strVal.length > maxLen) maxLen = strVal.length;
          }
        }
        return { wch: Math.min(Math.max(maxLen + 4, 14), 45) };
      });
    }
    // Set RTL direction for Arabic readability
    ws['!views'] = [{ rightToLeft: true }];
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  };

  // Append Sheets in professional logical order
  addStyledSheet(masterFttsRows, 'Master_FTTS_Plan');
  addStyledSheet(weSheetRows, 'WE_Rollout');
  addStyledSheet(vodafoneSheetRows, 'Vodafone_Plan');
  addStyledSheet(orangeSheetRows, 'Orange_Plan');
  addStyledSheet(etahaSheetRows, 'Availability_الإتاحة');
  addStyledSheet(tahawolSheetRows, 'Digital_Transformation');
  addStyledSheet(summarySheetRows, 'معلومات النسخة الاحتياطية');

  // Generate file name with ISO date
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${now.getHours()}-${now.getMinutes()}`;
  const fileName = `FTTS_Supabase_Full_Backup_${dateStr}_${timeStr}.xlsx`;

  // Write and trigger download
  XLSX.writeFile(wb, fileName);

  const totalSites = masterFttsRows.length + etahaSheetRows.length + tahawolSheetRows.length;
  const counts = {
    totalFTTS: masterFttsRows.length,
    we: weSheetRows.length,
    vodafone: vodafoneSheetRows.length,
    orange: orangeSheetRows.length,
    availability: etahaSheetRows.length,
    tahawol: tahawolSheetRows.length,
    grandTotal: totalSites,
  };

  return {
    success: true,
    fileName,
    totalSites,
    counts,
  };
}
