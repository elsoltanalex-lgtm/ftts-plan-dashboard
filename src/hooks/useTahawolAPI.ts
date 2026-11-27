// src/hooks/useTahawolAPI.ts
// Authoritative live state, legacy cache purge, & Supabase persistence hook for Digital Transformation (التحول الرقمي)

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { SiteRecord } from '../types/dashboard';
import { TAHAWOL_RAW_RECORDS, type TahawolRecord } from '../data/tahawolSites';
import { supabaseFallback, supabaseClients } from '../lib/supabase';
import {
  fetchCloudDeletedCodes,
  addCloudDeletedCodes,
  removeCloudDeletedCode,
  SYNC_DELETED_CODES_ID,
  SYNC_DELETED_CODES_SITE_CODE,
} from '../utils/deletedSitesSync';
import { normalizeArabicText } from '../utils/etahaMetrics';
import { isWeSpecialTarget } from '../utils/specialTarget';
import { logActivity, buildRecordDiffSummary, getActiveActor } from '../utils/auditService';

export const TAHAWOL_STORAGE_KEY = 'digital_transformation_records_v2_417';

const LEGACY_TAHAWOL_STORAGE_KEYS = [
  'tahawol_records',
  'tahawol_records_v1',
  'ftts_tahawol_records_v1',
  'digital_transformation_records',
  'digital_transformation_records_v1',
  'dt_records',
  'dt_records_v1',
];

const TAHAWOL_TABLE_CANDIDATES = ['tahawol_records', 'digital_transformation', 'tahawol'] as const;

let inMemoryTahawolRecords: TahawolRecord[] = [];
let legacyPurged = false;

function purgeLegacyTahawolCaches(): void {
  if (legacyPurged || typeof window === 'undefined') return;
  legacyPurged = true;
  try {
    for (const k of LEGACY_TAHAWOL_STORAGE_KEYS) {
      localStorage.removeItem(k);
    }
  } catch {
    // ignore storage errors
  }
}

function deduplicateTahawolRecords(records: TahawolRecord[]): TahawolRecord[] {
  const seen = new Map<string, TahawolRecord>();
  for (const r of records) {
    if (!r) continue;
    const code = String(r['الكود'] || r.code || r.Code || '').trim().toUpperCase();
    if (!code) continue;
    seen.set(code, r);
  }
  return Array.from(seen.values());
}

export function loadStoredTahawolRecords(): TahawolRecord[] {
  purgeLegacyTahawolCaches();
  if (inMemoryTahawolRecords.length > 0) return inMemoryTahawolRecords;
  try {
    const raw = localStorage.getItem(TAHAWOL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryTahawolRecords = deduplicateTahawolRecords(parsed);
        return inMemoryTahawolRecords;
      }
    }
  } catch {
    // fallback to authoritative Excel seed
  }
  inMemoryTahawolRecords = deduplicateTahawolRecords([...TAHAWOL_RAW_RECORDS]);
  saveStoredTahawolRecords(inMemoryTahawolRecords);
  return inMemoryTahawolRecords;
}

export function saveStoredTahawolRecords(records: TahawolRecord[]): void {
  const deduped = deduplicateTahawolRecords(records);
  inMemoryTahawolRecords = deduped;
  try {
    localStorage.setItem(TAHAWOL_STORAGE_KEY, JSON.stringify(deduped));
  } catch {
    // storage quota fallback
  }
}

export function isTahawolExternalDone(site: any): boolean {
  if (!site) return false;
  const raw = site.rawRecord || site;
  const val = String(site.externalPath || raw['المسار الخارجي'] || '').replace(/\s+/g, ' ').trim();
  if (!val) return false;
  const norm = normalizeArabicText(val);
  if (norm.includes('لم يتم') || norm.includes('غير مطلوب')) return false;
  return (
    norm === normalizeArabicText('تم التنفيذ') ||
    norm === normalizeArabicText('تمت تنفيذ') ||
    norm === normalizeArabicText('تم الانتهاء') ||
    norm.startsWith(normalizeArabicText('تم التنفيذ')) ||
    norm.startsWith(normalizeArabicText('تمت تنفيذ'))
  );
}

export function isTahawolInternalExecuted(site: any): boolean {
  if (!site) return false;
  const raw = site.rawRecord || site;
  const val = String(site.internalPath || raw['المسار الداخلى'] || raw['المسار الداخلي'] || '').replace(/\s+/g, ' ').trim();
  if (!val) return false;
  const norm = normalizeArabicText(val);
  if (norm.includes('لم يتم') || norm.includes('غير مطلوب')) return false;
  return (
    norm === normalizeArabicText('تم التنفيذ') ||
    norm === normalizeArabicText('تمت تنفيذ') ||
    norm === normalizeArabicText('تم الانتهاء') ||
    norm.startsWith(normalizeArabicText('تم التنفيذ')) ||
    norm.startsWith(normalizeArabicText('تمت تنفيذ'))
  );
}

export function isTahawolInternalNotRequired(site: any): boolean {
  if (!site) return false;
  const raw = site.rawRecord || site;
  const val = String(site.internalPath || raw['المسار الداخلى'] || raw['المسار الداخلي'] || '').replace(/\s+/g, ' ').trim();
  if (!val) return false;
  const norm = normalizeArabicText(val);
  return norm.includes(normalizeArabicText('غير مطلوب اعمال'));
}

export function isTahawolInternalDone(site: any): boolean {
  return isTahawolInternalExecuted(site) || isTahawolInternalNotRequired(site);
}

export function isCompletedOrNotRequired(val: unknown): boolean {
  const cleaned = String(val ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return false;
  const norm = normalizeArabicText(cleaned);
  if (norm.includes('لم يتم')) return false;
  return (
    norm === normalizeArabicText('تم التنفيذ') ||
    norm === normalizeArabicText('تمت تنفيذ') ||
    norm === normalizeArabicText('تم الانتهاء') ||
    norm.startsWith(normalizeArabicText('تم التنفيذ')) ||
    norm.startsWith(normalizeArabicText('تمت تنفيذ')) ||
    norm.includes(normalizeArabicText('غير مطلوب اعمال'))
  );
}

export function isDigitalTransformationOverallDone(site: any): boolean {
  if (!site) return false;
  const raw = site.rawRecord || site;
  const extVal = site.externalPath || raw['المسار الخارجي'] || '';
  const intVal = site.internalPath || raw['المسار الداخلى'] || raw['المسار الداخلي'] || '';
  return isCompletedOrNotRequired(extVal) && isCompletedOrNotRequired(intVal);
}

export function computeTahawolOverallStatus(extVal: unknown, intVal: unknown): string {
  return isCompletedOrNotRequired(extVal) && isCompletedOrNotRequired(intVal)
    ? 'تم التنفيذ'
    : 'جاري الاستكمال';
}

export function isTahawolDelivered(site: any): boolean {
  return isDigitalTransformationOverallDone(site);
}

export function isTahawolPausedOnClient(site: any): boolean {
  if (!site) return false;
  const raw = site.rawRecord || site;
  const intVal = normalizeArabicText(String(site.internalPath || raw['المسار الداخلى'] || raw['المسار الداخلي'] || '').trim());
  const cls = normalizeArabicText(String(site.classification || site.excelStatus || raw['التصنيف النهائي'] || '').trim());
  return intVal.includes('مسئوليه العميل') || cls.includes('متوقف عميل') || cls.includes('متوقف علي العميل');
}

export function isTahawolBlocked(site: any): boolean {
  if (!site) return false;
  const raw = site.rawRecord || site;
  const cls = normalizeArabicText(String(site.classification || site.excelStatus || raw['التصنيف النهائي'] || '').trim());
  return cls.includes('متعذر') || cls.includes('معوق');
}

export function computeTahawolKpis(sites: any[]) {
  // Deduplicate by siteCode / الكود to guarantee zero duplicate counting
  const uniqueSites: any[] = [];
  const seenCodes = new Set<string>();
  for (const s of sites || []) {
    if (!s) continue;
    const raw = s.rawRecord || s;
    const code = String(s.siteCode || raw['الكود'] || s.id || '').trim().toUpperCase();
    if (code) {
      if (seenCodes.has(code)) continue;
      seenCodes.add(code);
    }
    uniqueSites.push(s);
  }

  const totalSites = uniqueSites.length;
  let externalDone = 0;
  let internalExecuted = 0;
  let internalNotRequired = 0;
  let overallDone = 0;
  let pausedOnClient = 0;
  let blockedCount = 0;

  for (const s of uniqueSites) {
    if (isTahawolExternalDone(s)) externalDone++;
    if (isTahawolInternalExecuted(s)) {
      internalExecuted++;
    } else if (isTahawolInternalNotRequired(s)) {
      internalNotRequired++;
    }
    if (isDigitalTransformationOverallDone(s)) overallDone++;
    if (isTahawolPausedOnClient(s)) pausedOnClient++;
    if (isTahawolBlocked(s)) blockedCount++;
  }

  const internalDone = internalExecuted + internalNotRequired;

  return {
    totalSites,
    externalDone,
    internalDone,
    internalExecuted,
    internalNotRequired,
    overallDone,
    delivered: overallDone,
    pausedOnClient,
    blockedCount,
  };
}

export function mapTahawolRecordToSiteRecord(r: TahawolRecord, index = 0): SiteRecord {
  const rowData = (r as any).data && typeof (r as any).data === 'object' ? (r as any).data : {};
  const d: any = { ...r, ...rowData };

  const code = String(d['الكود'] || d.code || d.Code || `DT-${index + 1}`).trim();
  const ministry = String(d['اسم الوزارة'] || '').trim();
  const entity = String(d['الجهة'] || d['الجهات'] || '').trim();
  const building = String(d['المبنى'] || '').trim();
  const sector = String(d['قطاع التنفيذ'] || d['رئاسة القطاعات'] || 'قطاع عام').trim();
  const generalAdmin = String(d['الادارة العامة للتنفيذ'] || 'الإدارة العامة للتنفيذ').trim();
  const competentAdmin = String(d['اداره التنفيذ المختصة'] || 'إدارة التنفيذ المختصة').trim();
  const governorate = String(d['المحافظة'] || '').trim();
  const central = String(d['سنترال الربط'] || governorate || 'سنترال رئيسي').trim();
  const externalPath = String(d['المسار الخارجي'] || '').trim();
  const internalPath = String(d['المسار الداخلى'] || d['المسار الداخلي'] || '').trim();
  const deliveryStatus = String(d['موقف التسليم'] || '').trim();
  const finalClass = String(d['التصنيف النهائي'] || '').trim() || 'جاري معاينة';
  const responsibility = String(d['مسئولية المسار الداخلي'] || 'المصرية للاتصالات').trim();
  const extObstacle = String(d['( المعوقات / المتعذرات ) المسار الخارجي'] || '').trim();
  const intObstacle = String(d['( المعوقات / المتعذرات ) المسار الداخلي'] || '').trim();
  const extNotes = String(d['ملاحظات المسار الخارجي'] || '').trim();
  const intNotes = String(d['ملاحظات المسار الداخلي'] || '').trim();

  const normCls = normalizeArabicText(finalClass);
  let status = finalClass;
  let executionCategory: 'Completed' | 'In Progress' | 'Blocked / On Hold' | 'Planned' = 'In Progress';
  let progressPercent = 35;

  if (normCls.includes('تم الانتهاء خارجي و داخلي') || normCls.includes('غير مطلوب اعمال داخلي')) {
    status = 'تم الانتهاء';
    executionCategory = 'Completed';
    progressPercent = 100;
  } else if (normCls.includes('تم الانتهاء خارجي')) {
    status = 'تم الانتهاء';
    executionCategory = 'Completed';
    progressPercent = 85;
  } else if (normCls.includes('متعذر')) {
    status = 'متعذر';
    executionCategory = 'Blocked / On Hold';
    progressPercent = 15;
  } else if (normCls.includes('معوق')) {
    status = 'معوقات';
    executionCategory = 'Blocked / On Hold';
    progressPercent = 30;
  } else if (normCls.includes('تصاريح') || normCls.includes('تصريح')) {
    status = 'جاري تصاريح';
    executionCategory = 'In Progress';
    progressPercent = 40;
  } else if (normCls.includes('معاين')) {
    status = 'جاري المعاينة';
    executionCategory = 'Planned';
    progressPercent = 20;
  } else if (normCls.includes('جاري') || normCls.includes('حياه كريمه')) {
    status = 'جاري العمل';
    executionCategory = 'In Progress';
    progressPercent = 60;
  }

  const obstacleReason = [extObstacle, intObstacle].filter((x) => x && x !== '0').join(' | ') || 'لا يوجد تعذر';
  const notes = [extNotes, intNotes].filter((x) => x && x !== '0').join(' | ');
  const siteNameParts = [ministry, building || entity].filter(Boolean);
  const siteName = siteNameParts.length > 0 ? siteNameParts.join(' - ') : `موقع تحول رقمي ${code}`;
  const isSpecial = isWeSpecialTarget(d);

  return {
    id: `DT-${code}`,
    siteCode: code,
    siteName,
    company: ministry || 'التحول الرقمي',
    status,
    executionCategory,
    linksCount: 1,
    sector,
    executionSector: sector,
    subSector: String(d['قطاع المناطق'] || '').trim(),
    generalAdmin,
    competentAdmin,
    governorate,
    central,
    civilContractor: responsibility,
    responsibility,
    executionResponsibility: responsibility,
    classification: finalClass,
    excelStatus: finalClass,
    obstacleReason,
    deliveryStatus: deliveryStatus || 'لم يتم التسليم',
    deliveryArea: deliveryStatus || '',
    externalPath,
    internalPath,
    deliveryDate: String(d['تاريخ تنفيذ المسار الداخلي'] || d['تاريخ تنفيذ المسار الخارجي'] || '').trim(),
    expectedDate: String(d['تاريخ التكليف'] || '').trim() || '2026-12-31',
    progressPercent,
    notes,
    specialTarget: isSpecial,
    special_target: isSpecial,
    rawRecord: d,
  };
}

export function useTahawolAPI() {
  const [tahawolRecords, setTahawolRecords] = useState<TahawolRecord[]>(() => loadStoredTahawolRecords());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetchTahawolRecords = useCallback(async () => {
    setLoading(true);
    try {
      const deletedCodes = await fetchCloudDeletedCodes();

      for (const client of supabaseClients) {
        for (const table of TAHAWOL_TABLE_CANDIDATES) {
          try {
            const { data, error: sbError } = await client.from(table).select('*').limit(5000);
            if (!sbError && data && data.length > 0) {
              const baseMap = new Map<string, TahawolRecord>();
              loadStoredTahawolRecords().forEach((r) => {
                const c = String(r['الكود'] || r.code || '').trim().toUpperCase();
                if (c && !deletedCodes.has(c)) baseMap.set(c, r);
              });
              data.forEach((row: any) => {
                const rowData = row.data && typeof row.data === 'object' ? row.data : row;
                const code = String(row.code || row['الكود'] || rowData['الكود'] || row.id || '').trim().toUpperCase();
                if (code && code !== SYNC_DELETED_CODES_SITE_CODE && !deletedCodes.has(code)) {
                  const prev = baseMap.get(code) || ({} as TahawolRecord);
                  baseMap.set(code, { ...prev, ...rowData, 'الكود': code });
                }
              });
              const merged = Array.from(baseMap.values()).filter((r) => {
                const c = String(r['الكود'] || r.code || '').trim().toUpperCase();
                return !deletedCodes.has(c);
              });
              saveStoredTahawolRecords(merged);
              setTahawolRecords(merged);
              return;
            }
          } catch {
            // try next candidate table
          }
        }
      }

      const local = loadStoredTahawolRecords().filter((r) => {
        const c = String(r['الكود'] || r.code || '').trim().toUpperCase();
        return !deletedCodes.has(c);
      });
      setTahawolRecords(local);
    } catch (err: any) {
      setError(err?.message || 'خطأ في تحميل بيانات التحول الرقمي');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetchTahawolRecords();

    const channel = supabaseFallback
      .channel('tahawol_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'we_records' },
        (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;
          if (
            (newRow && (newRow.id === SYNC_DELETED_CODES_ID || newRow.site_code === SYNC_DELETED_CODES_SITE_CODE)) ||
            (oldRow && (oldRow.id === SYNC_DELETED_CODES_ID || oldRow.site_code === SYNC_DELETED_CODES_SITE_CODE))
          ) {
            refetchTahawolRecords();
          }
        }
      )
      .subscribe();

    return () => {
      supabaseFallback.removeChannel(channel);
    };
  }, [refetchTahawolRecords]);

  const saveTahawolRecord = useCallback(async (record: TahawolRecord): Promise<{ success: boolean; error?: string }> => {
    try {
      const code = String(record['الكود'] || record.code || '').trim();
      if (!code) return { success: false, error: 'كود الموقع مطلوب' };

      const codeUpper = code.toUpperCase();
      const now = new Date().toISOString();
      const extVal = record['المسار الخارجي'] || '';
      const intVal = record['المسار الداخلى'] || record['المسار الداخلي'] || '';
      const overallStatus = computeTahawolOverallStatus(extVal, intVal);
      const actor = getActiveActor();
      const enriched: TahawolRecord = {
        ...record,
        'الكود': code,
        'الموقف العام': overallStatus,
        _updatedAt: now,
        _lastModifiedBy: actor.displayName,
        _lastModifiedAt: now,
      };

      const current = loadStoredTahawolRecords();
      const idx = current.findIndex((r) => String(r['الكود'] || r.code || '').trim().toUpperCase() === codeUpper);
      const oldRec = idx >= 0 ? current[idx] : null;
      let updated: TahawolRecord[];
      if (idx >= 0) {
        updated = [...current];
        updated[idx] = { ...updated[idx], ...enriched };
      } else {
        enriched._createdAt = now;
        updated = [enriched, ...current];
      }

      saveStoredTahawolRecords(updated);
      setTahawolRecords(updated);

      logActivity({
        actionType: oldRec ? 'تعديل موقع' : 'إضافة موقع',
        module: 'التحول الرقمي',
        siteCode: code,
        details: buildRecordDiffSummary(oldRec, enriched),
      });

      const payload = {
        id: code,
        code,
        data: enriched,
        updated_at: now,
      };

      for (const client of supabaseClients) {
        for (const table of TAHAWOL_TABLE_CANDIDATES) {
          try {
            const { error: upErr } = await client.from(table).upsert(payload, { onConflict: 'id' });
            if (!upErr) break;
          } catch {
            // continue
          }
        }
      }

      await removeCloudDeletedCode(code);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل حفظ بيانات مشروع التحول الرقمي' };
    }
  }, []);

  const deleteTahawolRecord = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const norm = String(code ?? '').trim().toUpperCase();
      const targetCodes = new Set([norm, code]);
      if (norm.startsWith('DT-')) targetCodes.add(norm.slice(3));

      const current = loadStoredTahawolRecords();
      const filtered = current.filter((r) => {
        const c = String(r['الكود'] || r.code || '').trim().toUpperCase();
        return !targetCodes.has(c) && !targetCodes.has(`DT-${c}`);
      });
      saveStoredTahawolRecords(filtered);
      setTahawolRecords(filtered);

      const targetList = Array.from(targetCodes);
      await addCloudDeletedCodes(targetList);

      logActivity({
        actionType: 'حذف موقع',
        module: 'التحول الرقمي',
        siteCode: norm,
        details: `حذف مشروع تحول رقمي (${norm})`,
      });

      for (const client of supabaseClients) {
        for (const table of TAHAWOL_TABLE_CANDIDATES) {
          try {
            await client.from(table).delete().in('code', targetList);
            await client.from(table).delete().in('id', targetList);
          } catch {
            // continue
          }
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل حذف مشروع التحول الرقمي' };
    }
  }, []);

  const deleteTahawolRecordsBulk = useCallback(async (codes: string[]): Promise<{ success: boolean; count?: number; error?: string }> => {
    try {
      if (!codes || codes.length === 0) return { success: true, count: 0 };
      const codeSet = new Set<string>();
      codes.forEach((c) => {
        const str = String(c || '').trim();
        if (!str) return;
        const upper = str.toUpperCase();
        codeSet.add(str);
        codeSet.add(upper);
        if (upper.startsWith('DT-')) codeSet.add(upper.slice(3));
      });

      const current = loadStoredTahawolRecords();
      const filtered = current.filter((r) => {
        const c = String(r['الكود'] || r.code || '').trim().toUpperCase();
        return !codeSet.has(c) && !codeSet.has(`DT-${c}`);
      });
      saveStoredTahawolRecords(filtered);
      setTahawolRecords(filtered);

      const codeArray = Array.from(codeSet);
      await addCloudDeletedCodes(codeArray);

      logActivity({
        actionType: 'حذف جماعي',
        module: 'التحول الرقمي',
        siteCode: `${codes.length} مشروعات`,
        details: `حذف جماعي لمشروعات التحول الرقمي (${codes.slice(0, 10).join(', ')}${codes.length > 10 ? '...' : ''})`,
      });

      for (const client of supabaseClients) {
        for (const table of TAHAWOL_TABLE_CANDIDATES) {
          try {
            await client.from(table).delete().in('code', codeArray);
            await client.from(table).delete().in('id', codeArray);
          } catch {
            // continue
          }
        }
      }

      return { success: true, count: current.length - filtered.length };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل الحذف الجماعي لمشروعات التحول الرقمي' };
    }
  }, []);

  const tahawolSites = useMemo(
    () => tahawolRecords.map((r, i) => mapTahawolRecordToSiteRecord(r, i)),
    [tahawolRecords]
  );

  return {
    tahawolRecords,
    tahawolSites,
    loading,
    error,
    refetchTahawolRecords,
    saveTahawolRecord,
    deleteTahawolRecord,
    deleteTahawolRecordsBulk,
  };
}
