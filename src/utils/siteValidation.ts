// src/utils/siteValidation.ts
// Unified duplicate site-code detection (local + live Supabase) and clear Arabic Supabase error translator
// Shared across WE, Vodafone, Orange, الإتاحة (Availability), and التحول الرقمي (Digital Transformation)

import { supabaseFallback } from '../lib/supabase';
import { getLocalDeletedCodes } from './deletedSitesSync';

export type SiteModuleType = 'WE' | 'Vodafone' | 'Orange' | 'الإتاحة' | 'التحول الرقمي';

export interface DuplicateSiteMatch {
  siteCode: string;
  sector: string;
  central: string;
  status: string;
  message: string;
}

export function buildDuplicateSiteMessage(siteCode: string, sector: string, status: string): string {
  const sec = sector?.trim() || 'غير محدد';
  const st = status?.trim() || 'غير محدد';
  return `هذا الكود (${siteCode}) موجود بالفعل في النظام — القطاع: ${sec} | الموقف الحالي: ${st}`;
}

/**
 * Translates raw Supabase/network errors into clear, actionable Arabic failure reasons
 */
export function formatSupabaseSaveError(error: any, siteCode?: string): string {
  if (!error) return 'تعذر الحفظ في قاعدة البيانات لسبب غير معروف. يرجى المحاولة مرة أخرى.';
  const code = String(error?.code || error?.status || '').trim();
  const msg = String(error?.message || error?.details || error || '').trim();
  const lower = msg.toLowerCase();

  if (code === '23505' || lower.includes('duplicate key') || lower.includes('unique constraint')) {
    return siteCode
      ? `تعذر تسجيل الموقع بسبب تكرار الكود (${siteCode}) في قاعدة البيانات`
      : 'تعذر تسجيل الموقع بسبب تكرار الكود في قاعدة البيانات';
  }
  if (code === '42501' || code === '401' || code === '403' || lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'تعذر الحفظ في قاعدة البيانات: خطأ في صلاحيات الوصول (RLS / Permission Denied)';
  }
  if (code === '413' || lower.includes('payload too large') || lower.includes('request entity too large')) {
    return 'تعذر الحفظ في قاعدة البيانات: حجم المرفق كبير جداً، يرجى تقليل حجم الملف وإعادة المحاولة';
  }
  if (code === '22P02' || code === '23502' || code === '23503' || lower.includes('invalid input syntax') || lower.includes('not-null')) {
    return `تعذر الحفظ في قاعدة البيانات: تنسيق حقل غير صالح أو قيمة إلزامية ناقصة (${msg})`;
  }
  if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('timeout') || lower.includes('err_internet')) {
    return 'تعذر الاتصال بقاعدة البيانات السحابية — يرجى التحقق من الاتصال بالإنترنت وإعادة المحاولة';
  }
  return `تعذر الحفظ في قاعدة البيانات: ${msg || code || 'خطأ غير متوقع'}`;
}

/**
 * Synchronous check against currently loaded sites array (instant UI warning while typing)
 */
export function findDuplicateInLocalSites(
  siteCode: string,
  sitesData?: any[],
  allSiteCodes?: string[]
): DuplicateSiteMatch | null {
  const norm = String(siteCode ?? '').trim().toUpperCase();
  if (!norm) return null;

  const deleted = getLocalDeletedCodes();
  if (deleted.has(norm)) return null;

  if (Array.isArray(sitesData)) {
    const matched = sitesData.find((s) => {
      const c = String(
        s?.siteCode || s?.['Site code'] || s?.['site code'] || s?.[' Site code'] || s?.Code || s?.['الكود'] || ''
      ).trim().toUpperCase();
      return c === norm;
    });
    if (matched) {
      const raw = matched.rawRecord || matched;
      const sector = String(
        matched.sector ||
          raw['رئاسة قطاعات التنفيذ'] ||
          raw['قطاع التنفيذ'] ||
          raw['Sectore'] ||
          raw['القطاع'] ||
          'غير محدد'
      ).trim();
      const central = String(
        matched.central || raw['سنترال الربط'] || raw['السنترال'] || 'غير محدد'
      ).trim();
      const status = String(
        matched.classification ||
          matched.status ||
          raw['التصنيف النهائي'] ||
          raw['التصنيف'] ||
          raw['موقف التسليم'] ||
          'غير محدد'
      ).trim();
      return {
        siteCode: norm,
        sector,
        central,
        status,
        message: buildDuplicateSiteMessage(norm, sector, status),
      };
    }
  }

  if (Array.isArray(allSiteCodes)) {
    const inCodes = allSiteCodes.find((c) => String(c ?? '').trim().toUpperCase() === norm);
    if (inCodes) {
      return {
        siteCode: norm,
        sector: 'غير محدد',
        central: 'غير محدد',
        status: 'مسجل مسبقاً',
        message: buildDuplicateSiteMessage(norm, 'غير محدد', 'مسجل مسبقاً'),
      };
    }
  }

  return null;
}

/**
 * Live check against Supabase (`https://fzdmdvgmorzifysygkhp.supabase.co`) before inserting a new site
 */
export async function checkDuplicateSiteInSupabase(
  module: SiteModuleType,
  siteCode: string
): Promise<DuplicateSiteMatch | null> {
  const norm = String(siteCode ?? '').trim().toUpperCase();
  if (!norm) return null;

  const deleted = getLocalDeletedCodes();
  if (deleted.has(norm)) return null;

  try {
    if (module === 'Vodafone') {
      // Check dedicated `vodafone_records` first if present in Supabase
      try {
        const { data: vfData, error: vfErr } = await supabaseFallback
          .from('vodafone_records')
          .select('id, site_code, sector, status, central, data')
          .or(`site_code.eq.${norm},site_code.eq.VDF-${norm}`)
          .limit(1);
        if (!vfErr && Array.isArray(vfData) && vfData.length > 0) {
          const row: any = vfData[0];
          const d = row.data && typeof row.data === 'object' ? row.data : {};
          const sector = String(d['رئاسة قطاعات التنفيذ'] || d['قطاع التنفيذ'] || row.sector || 'غير محدد').trim();
          const central = String(d['سنترال الربط'] || row.central || 'غير محدد').trim();
          const status = String(d['التصنيف'] || d.classification || row.status || 'غير محدد').trim();
          return {
            siteCode: norm,
            sector,
            central,
            status,
            message: buildDuplicateSiteMessage(norm, sector, status),
          };
        }
      } catch {
        // Table may not exist yet — fall through to we_records
      }
    }

    if (module === 'WE' || module === 'Vodafone' || module === 'Orange') {
      const prefix = module === 'Vodafone' ? `VDF-${norm}` : module === 'Orange' ? `ORG-${norm}` : norm;
      const { data, error } = await supabaseFallback
        .from('we_records')
        .select('id, site_code, data, "Site Status", "Sectores", "Exc Sectores"')
        .or(`site_code.eq.${norm},site_code.eq.${prefix}`)
        .limit(5);

      if (!error && Array.isArray(data) && data.length > 0) {
        const match = data.find((row: any) => {
          const rowComp = String(row?.data?.company || 'WE').toLowerCase();
          if (module === 'WE') return rowComp === 'we' || !row?.data?.company;
          return rowComp === module.toLowerCase();
        });
        if (match) {
          const d = match.data && typeof match.data === 'object' ? match.data : {};
          const sector = String(
            d['رئاسة قطاعات التنفيذ'] || d['قطاع التنفيذ'] || match['Sectores'] || match['Exc Sectores'] || 'غير محدد'
          ).trim();
          const central = String(d['سنترال الربط'] || d['السنترال'] || 'غير محدد').trim();
          const status = String(d['التصنيف'] || d.classification || match['Site Status'] || 'غير محدد').trim();
          return {
            siteCode: norm,
            sector,
            central,
            status,
            message: buildDuplicateSiteMessage(norm, sector, status),
          };
        }
      }
    } else if (module === 'الإتاحة') {
      const { data, error } = await supabaseFallback
        .from('etaha_records')
        .select('*')
        .or(`code.eq.${norm},id.eq.${norm}`)
        .limit(1);
      if (!error && Array.isArray(data) && data.length > 0) {
        const row: any = data[0];
        const d = row.data && typeof row.data === 'object' ? row.data : row;
        const sector = String(d['قطاع التنفيذ'] || d['القطاع'] || 'غير محدد').trim();
        const central = String(d['سنترال الربط'] || d['السنترال'] || 'غير محدد').trim();
        const status = String(d['التصنيف'] || d['موقف التسليم'] || 'غير محدد').trim();
        return {
          siteCode: norm,
          sector,
          central,
          status,
          message: buildDuplicateSiteMessage(norm, sector, status),
        };
      }
    } else if (module === 'التحول الرقمي') {
      const { data, error } = await supabaseFallback
        .from('tahawol_records')
        .select('*')
        .or(`code.eq.${norm},id.eq.${norm}`)
        .limit(1);
      if (!error && Array.isArray(data) && data.length > 0) {
        const row: any = data[0];
        const d = row.data && typeof row.data === 'object' ? row.data : row;
        const sector = String(d['قطاع التنفيذ'] || d['رئاسة القطاعات'] || 'غير محدد').trim();
        const central = String(d['سنترال الربط'] || 'غير محدد').trim();
        const status = String(d['التصنيف النهائي'] || d['موقف التسليم'] || 'غير محدد').trim();
        return {
          siteCode: norm,
          sector,
          central,
          status,
          message: buildDuplicateSiteMessage(norm, sector, status),
        };
      }
    }
  } catch {
    // non-blocking if offline
  }

  return null;
}
