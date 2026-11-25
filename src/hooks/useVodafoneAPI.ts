// src/hooks/useVodafoneAPI.ts
// Live state & persistence API hook for Vodafone FTTS dataset (with Supabase sync & localStorage fallback)

import { useState, useCallback, useEffect } from 'react';
import type { SiteRecord } from '../types/dashboard';
import type { VodafoneRecord } from '../types/vodafone';
import { VODAFONE_RAW_RECORDS } from '../data/vodafoneSites';
import { supabase, supabaseFallback, supabaseClients, isUUID } from '../lib/supabase';
import { normalizeSectorName } from '../utils/sectorPermissions';
import {
  fetchCloudDeletedCodes,
  addCloudDeletedCodes,
  removeCloudDeletedCode,
  getLocalDeletedCodes,
  normalizeSiteCode,
  SYNC_DELETED_CODES_ID,
  SYNC_DELETED_CODES_SITE_CODE,
} from '../utils/deletedSitesSync';

const STORAGE_KEY = 'ftts_vodafone_records_v1';
const VODAFONE_TABLE_CANDIDATES = ['vodafone_records', 'vodafone', 'we_records'];

export function mapVodafoneRecordToSiteRecord(r: VodafoneRecord, index = 0): SiteRecord {
  const rawCode = r[' Site code'] || r['Site code'] || r['site code'] || r.site_code || `VDF-${index + 1}`;
  const siteCode = String(rawCode).trim();
  const rawTasneef = String(r['التصنيف'] || '').trim();

  let status = 'جاري المعاينة';
  let executionCategory: 'Completed' | 'In Progress' | 'Blocked / On Hold' | 'Planned' = 'In Progress';
  let progressPercent = 25;

  if (rawTasneef.includes('تشغيل') || rawTasneef.includes('فيبر') || rawTasneef.includes('فايبر') || rawTasneef === 'مشغل') {
    status = 'تم التشغيل فايبر';
    executionCategory = 'Completed';
    progressPercent = 100;
  } else if (rawTasneef === 'تم مدني' || (rawTasneef.includes('مدني') && (rawTasneef.startsWith('تم') || rawTasneef.includes('تم ')))) {
    status = 'تم مدني';
    executionCategory = 'Completed';
    progressPercent = 85;
  } else if (rawTasneef.includes('تسليم') || rawTasneef.includes('انتهاء') || rawTasneef.includes('مكتمل')) {
    status = 'تم الانتهاء';
    executionCategory = 'Completed';
    progressPercent = 100;
  } else if (rawTasneef.includes('تصاريح') || rawTasneef.includes('تصريح')) {
    status = 'جاري تصاريح';
    executionCategory = 'In Progress';
    progressPercent = 40;
  } else if (rawTasneef.includes('معوق')) {
    status = 'معوقات';
    executionCategory = 'Blocked / On Hold';
    progressPercent = 30;
  } else if (rawTasneef.includes('متعذر') || rawTasneef.includes('تعذر') || rawTasneef.includes('متعثر') || rawTasneef.includes('متعذرات')) {
    status = 'متعذر';
    executionCategory = 'Blocked / On Hold';
    progressPercent = 15;
  } else if (rawTasneef.includes('كهرب')) {
    status = 'جاري كهربي';
    executionCategory = 'In Progress';
    progressPercent = 75;
  } else if (rawTasneef.includes('مدن') || rawTasneef.includes('عمل')) {
    status = 'جاري مدني';
    executionCategory = 'In Progress';
    progressPercent = 60;
  } else if (rawTasneef.includes('معاين')) {
    status = 'جاري المعاينة';
    executionCategory = 'Planned';
    progressPercent = 20;
  } else {
    status = rawTasneef || 'جاري المعاينة';
  }

  const central = String(r['سنترال الربط'] || 'سنترال رئيسي').trim();
  const sector = normalizeSectorName(String(r['رئاسة قطاعات التنفيذ'] || 'قطاع عام').trim()) || 'قطاع عام';
  const executionSector = normalizeSectorName(String(r['قطاع التنفيذ'] || '').trim());
  const generalAdmin = String(r['الادارة العامة لتنفيذ الشبكات'] || r['الادارة العامة للمنطقة'] || 'الإدارة العامة لتنفيذ الشبكات').trim();
  const competentAdmin = String(r['ادارة التنفيذ الفرعية'] || 'إدارة التنفيذ والمسارات').trim();
  const obstacleReason = String(r['اسباب التعّذر'] || r['اسباب التعذر'] || r['الملاحظات'] || 'لا يوجد تعذر').trim();
  const expectedDate = r['التاريخ المتوقع للانتهاء'] || (r['خطة'] ? `${r['خطة']}-12-31` : '2026-12-31');

  return {
    id: `VDF-${siteCode}`,
    siteCode,
    siteName: `موقع ${siteCode} - ${central}`,
    company: 'Vodafone',
    status,
    executionCategory,
    linksCount: 1,
    sector,
    executionSector,
    subSector: String(r['قطاع المناطق'] || '').trim(),
    generalAdmin,
    competentAdmin,
    central,
    governorate: String(r['المحافظه'] || '').trim(),
    classification: rawTasneef || 'FTTS Rollout',
    obstacleReason,
    expectedDate,
    progressPercent,
    civilContractor: String(r['مسئولية التنفيذ'] || 'التنفيذ').trim(),
    responsibility: String(r['مسئولية التنفيذ'] || 'التنفيذ').trim(),
    deliveryArea: String(r['تاكيد التسليم للمنطقه'] || '').trim(),
    electricalClassification: String(r['التصنيف (كهربي)'] || '').trim(),
    electricalStage: String(r['المرحله الكهربيه'] || '').trim(),
    notes: String(r['الملاحظات'] || '').trim(),
    lat: r['احدثيات خط العرض'] || '',
    lng: r['احدثيات خط الطول'] || '',
    documentUrl: r.documentUrl || r.attachmentUrl || '',
    attachmentUrl: r.attachmentUrl || r.documentUrl || '',
    documentName: r['المستند'] || '',
    specialTarget: Boolean(
      r.specialTarget ??
      r.special_target ??
      (r as any)['specialTarget'] ??
      (r as any)['special_target'] ??
      r['سبيشال تارجت'] ??
      (r as any)['سبيشال_تارجت'] ??
      false
    ),
    special_target: Boolean(
      r.specialTarget ??
      r.special_target ??
      (r as any)['specialTarget'] ??
      (r as any)['special_target'] ??
      r['سبيشال تارجت'] ??
      (r as any)['سبيشال_تارجت'] ??
      false
    ),
    rawRecord: r,
  };
}

let inMemoryVodafoneRecords: VodafoneRecord[] = [];

function normalizeVodafoneSector(r: VodafoneRecord): VodafoneRecord {
  const sec = normalizeSectorName(r['رئاسة قطاعات التنفيذ']);
  const execSec = normalizeSectorName(r['قطاع التنفيذ']);
  if (sec === r['رئاسة قطاعات التنفيذ'] && execSec === r['قطاع التنفيذ']) return r;
  return {
    ...r,
    ...(sec ? { 'رئاسة قطاعات التنفيذ': sec } : {}),
    ...(execSec ? { 'قطاع التنفيذ': execSec } : {}),
  };
}

function loadStoredVodafoneRecords(): VodafoneRecord[] {
  if (inMemoryVodafoneRecords.length > 0) return inMemoryVodafoneRecords;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryVodafoneRecords = parsed.map(normalizeVodafoneSector);
        return inMemoryVodafoneRecords;
      }
    }
  } catch {
    // fallback
  }
  inMemoryVodafoneRecords = VODAFONE_RAW_RECORDS.map(normalizeVodafoneSector);
  return inMemoryVodafoneRecords;
}

function saveStoredVodafoneRecords(records: VodafoneRecord[]): void {
  inMemoryVodafoneRecords = records;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // storage limit fallback
  }
}

export function fetchVodafoneSiteRecord(code: string): VodafoneRecord | null {
  const norm = (code || '').trim().toUpperCase();
  const records = loadStoredVodafoneRecords();
  return records.find((r) => {
    const c = String(r[' Site code'] || r['Site code'] || r['site code'] || '').trim().toUpperCase();
    return c === norm;
  }) || null;
}

export function useVodafoneAPI() {
  const [vodafoneRecords, setVodafoneRecords] = useState<VodafoneRecord[]>(() => loadStoredVodafoneRecords());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetchVodafoneRecords = useCallback(async () => {
    setLoading(true);
    try {
      const deletedCodes = await fetchCloudDeletedCodes();

      // 1. Attempt to fetch live from Supabase tables across active clients
      for (const client of supabaseClients) {
        for (const table of VODAFONE_TABLE_CANDIDATES) {
          try {
            let query = client.from(table).select('*').limit(5000);
            if (table === 'we_records') {
              query = query.eq('data->>company', 'Vodafone');
            }
            const { data, error: sbError } = await query;
            if (!sbError && data && data.length > 0) {
              const baseMap = new Map<string, VodafoneRecord>();
              loadStoredVodafoneRecords().forEach((r) => {
                const c = String(r[' Site code'] || r['Site code'] || r['site code'] || '').trim().toUpperCase();
                if (c && !deletedCodes.has(c)) baseMap.set(c, r);
              });
              data.forEach((row: any) => {
                const rowData = row.data && typeof row.data === 'object' ? row.data : row;
                const code = String(
                  row.site_code || row['site code'] || row['Site code'] || rowData['Site code'] || rowData['site code'] || row.id || ''
                ).trim().toUpperCase();
                if (code && code !== SYNC_DELETED_CODES_SITE_CODE && !deletedCodes.has(code)) {
                  const prev = baseMap.get(code) || {};
                  baseMap.set(code, { ...prev, ...rowData, ...row, 'Site code': code, 'site code': code });
                }
              });
              const merged = Array.from(baseMap.values()).filter((r) => {
                const c = String(r[' Site code'] || r['Site code'] || r['site code'] || '').trim().toUpperCase();
                return !deletedCodes.has(c);
              });
              saveStoredVodafoneRecords(merged);
              setVodafoneRecords(merged);
              return;
            }
          } catch { }
        }
      }

      const records = loadStoredVodafoneRecords().filter((r) => {
        const c = String(r[' Site code'] || r['Site code'] || r['site code'] || '').trim().toUpperCase();
        return !deletedCodes.has(c);
      });
      setVodafoneRecords(records);
    } catch (err: any) {
      setError(err?.message || 'Error fetching Vodafone records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetchVodafoneRecords();

    // Supabase Realtime channel for instant cross-device updates
    const channel = supabaseFallback
      .channel('vodafone_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'we_records' },
        (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;
          if (
            (newRow && (newRow.data?.company === 'Vodafone' || newRow.id === SYNC_DELETED_CODES_ID || newRow.site_code === SYNC_DELETED_CODES_SITE_CODE)) ||
            (oldRow && (oldRow.data?.company === 'Vodafone' || oldRow.id === SYNC_DELETED_CODES_ID || oldRow.site_code === SYNC_DELETED_CODES_SITE_CODE))
          ) {
            refetchVodafoneRecords();
          }
        }
      )
      .subscribe();

    // Force real-time refresh whenever mobile/desktop user switches back to the tab or unlocks screen
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetchVodafoneRecords();
      }
    };
    const handleFocus = () => {
      refetchVodafoneRecords();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      supabaseFallback.removeChannel(channel);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refetchVodafoneRecords]);

  const saveVodafoneRecord = useCallback(async (record: VodafoneRecord): Promise<{ success: boolean; cloudSaved?: boolean; message?: string; error?: string }> => {
    try {
      const rawCode = record[' Site code'] || record['Site code'] || record['site code'] || record.site_code;
      const code = String(rawCode || '').trim().toUpperCase();
      if (!code) return { success: false, error: 'كود الموقع مطلوب' };

      const current = loadStoredVodafoneRecords();
      const idx = current.findIndex((r) => {
        const c = String(r[' Site code'] || r['Site code'] || r['site code'] || '').trim().toUpperCase();
        return c === code;
      });

      const now = new Date().toISOString();
      const isSpecial = Boolean(
        record.specialTarget ??
        record.special_target ??
        (record as any)['specialTarget'] ??
        (record as any)['special_target'] ??
        record['سبيشال تارجت'] ??
        (record as any)['سبيشال_تارجت'] ??
        false
      );

      const docUrl = record.documentUrl || record.attachmentUrl || '';
      const enriched: VodafoneRecord = {
        ...record,
        company: 'Vodafone',
        'Site code': code,
        'site code': code,
        site_code: code,
        'التصنيف': record['التصنيف'] || '',
        classification: record['التصنيف'] || '',
        documentUrl: docUrl,
        attachmentUrl: docUrl,
        'المستند': record['المستند'] || (docUrl ? `Doc-${code}.pdf` : ''),
        specialTarget: isSpecial,
        special_target: isSpecial,
        'سبيشال تارجت': isSpecial,
        _updatedAt: now,
      };

      // 1. Instant local optimistic update: immediate reflection across localStorage & all dashboard counters
      let updated: VodafoneRecord[];
      if (idx >= 0) {
        updated = [...current];
        updated[idx] = { ...updated[idx], ...enriched };
      } else {
        enriched._createdAt = now;
        updated = [enriched, ...current];
      }
      saveStoredVodafoneRecords(updated);
      setVodafoneRecords(updated);

      // Safe payload matching physical Supabase table columns + JSONB data
      // (Preserves specialTarget and all operator attributes inside data: enriched)
      const safePayload: any = {
        site_code: code,
        'site code': code,
        'Site Status': enriched['التصنيف'] || enriched.classification || 'جاري',
        data: enriched,
        updated_at: now,
      };
      if (enriched._id && isUUID(enriched._id)) {
        safePayload.id = enriched._id;
      }

      // Persist directly into Supabase vodafone tables across active clients
      let cloudSaved = false;
      let lastCloudError: any = null;
      clientLoop: for (const client of supabaseClients) {
        for (const table of VODAFONE_TABLE_CANDIDATES) {
          try {
            // 1. Direct UPDATE on existing record in Supabase
            let { data: updateData, error: updateErr } = await client
              .from(table)
              .update(safePayload)
              .eq('site_code', code)
              .select();

            if (updateErr || !updateData || updateData.length === 0) {
              const retryQuoted = await client
                .from(table)
                .update(safePayload)
                .eq('site code', code)
                .select();
              if (!retryQuoted.error && retryQuoted.data && retryQuoted.data.length > 0) {
                updateData = retryQuoted.data;
                updateErr = null;
              } else if (retryQuoted.error) {
                lastCloudError = retryQuoted.error;
              }
            }

            if (updateErr) {
              lastCloudError = updateErr;
              console.error(`[Vodafone Supabase] Update error on table ${table}:`, updateErr);
            }

            if (!updateErr && updateData && updateData.length > 0) {
              cloudSaved = true;
              console.log(`[Vodafone Supabase] Successfully updated site ${code} in ${table}`);
              break clientLoop;
            }

            // 2. INSERT if row does not exist
            const insertPayload: any = {
              ...safePayload,
              created_at: enriched._createdAt || now,
            };
            if (enriched._id && isUUID(enriched._id)) {
              insertPayload.id = enriched._id;
            }

            const { data: insertData, error: insertErr } = await client
              .from(table)
              .insert([insertPayload])
              .select();

            if (insertErr) {
              lastCloudError = insertErr;
              console.error(`[Vodafone Supabase] Insert error on table ${table}:`, insertErr);
            }

            if (!insertErr && insertData && insertData.length > 0) {
              cloudSaved = true;
              console.log(`[Vodafone Supabase] Successfully inserted site ${code} in ${table}`);
              break clientLoop;
            }
          } catch (err: any) {
            lastCloudError = err;
            console.error(`[Vodafone Supabase] Error saving site ${code} to table ${table}:`, err);
          }
        }
      }

      if (cloudSaved) {
        await removeCloudDeletedCode(code);
      }

      return {
        success: true,
        cloudSaved,
        message: cloudSaved
          ? `تم حفظ وتحديث بيانات موقع Vodafone (${code}) وتصنيفه بنجاح في قاعدة بيانات Supabase السحابية ✅`
          : `تم حفظ بيانات موقع Vodafone (${code}) محلياً وتحديث النظام فورياً ✅`,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل حفظ بيانات الموقع' };
    }
  }, []);

  const deleteVodafoneRecord = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const norm = (code || '').trim().toUpperCase();
      const cleanNorm = norm.startsWith('VDF-') ? norm.slice(4) : norm;
      const targetCodes = new Set([norm, cleanNorm, code]);

      const current = loadStoredVodafoneRecords();
      const filtered = current.filter((r) => {
        const c = String(r[' Site code'] || r['Site code'] || r['site code'] || (r as any).site_code || (r as any).code || (r as any).id || '').trim().toUpperCase();
        return !targetCodes.has(c);
      });
      saveStoredVodafoneRecords(filtered);
      setVodafoneRecords(filtered);

      const targetList = Array.from(targetCodes);

      // Persist to authoritative Cloud Deleted Codes in Supabase for cross-device sync
      await addCloudDeletedCodes(targetList);

      // Delete from Supabase tables across active clients (Client 2 Fallback hosts active live dataset)
      for (const client of supabaseClients) {
        for (const table of VODAFONE_TABLE_CANDIDATES) {
          try {
            await client.from(table).delete().in('site_code', targetList);
            await client.from(table).delete().in('site code', targetList);
            await client.from(table).delete().in('Site code', targetList);
            await client.from(table).delete().in('id', targetList);
          } catch (delErr) {
            console.error(`[Vodafone Supabase] Delete exception on table ${table}:`, delErr);
          }
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل حذف الموقع' };
    }
  }, []);

  const deleteVodafoneRecordsBulk = useCallback(async (codes: string[]): Promise<{ success: boolean; count?: number; error?: string }> => {
    try {
      if (!codes || codes.length === 0) return { success: true, count: 0 };
      const codeSet = new Set<string>();
      codes.forEach((c) => {
        const str = String(c || '').trim();
        if (!str) return;
        const upper = str.toUpperCase();
        codeSet.add(str);
        codeSet.add(upper);
        if (upper.startsWith('VDF-')) {
          codeSet.add(upper.slice(4));
        }
      });

      const current = loadStoredVodafoneRecords();
      const filtered = current.filter((r) => {
        const c = String(r[' Site code'] || r['Site code'] || r['site code'] || (r as any).site_code || (r as any).code || (r as any).id || '').trim().toUpperCase();
        return !codeSet.has(c);
      });
      saveStoredVodafoneRecords(filtered);
      setVodafoneRecords(filtered);

      // Batch delete from Supabase tables across active clients
      const codeArray = Array.from(codeSet);

      // Persist to authoritative Cloud Deleted Codes in Supabase for cross-device sync
      await addCloudDeletedCodes(codeArray);

      for (const client of supabaseClients) {
        for (const table of VODAFONE_TABLE_CANDIDATES) {
          try {
            await client.from(table).delete().in('site_code', codeArray);
            await client.from(table).delete().in('site code', codeArray);
            await client.from(table).delete().in('Site code', codeArray);
            await client.from(table).delete().in('id', codeArray);
          } catch (bulkErr) {
            console.error(`[Vodafone Supabase] Bulk delete exception on table ${table}:`, bulkErr);
          }
        }
      }

      if (typeof window !== 'undefined') {
        try {
          const k1 = 'ftts_deleted_site_codes_v3';
          const k2 = 'we_deleted_codes_cache';
          const raw1 = localStorage.getItem(k1);
          const set = new Set(raw1 ? JSON.parse(raw1) : []);
          codeArray.forEach((c) => set.add(c));
          const arr = Array.from(set);
          localStorage.setItem(k1, JSON.stringify(arr));
          localStorage.setItem(k2, JSON.stringify(arr));
        } catch { }
      }

      return { success: true, count: current.length - filtered.length };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل حذف مواقع Vodafone' };
    }
  }, []);

  const bulkImportVodafoneRecords = useCallback(async (recordsToImport: VodafoneRecord[]): Promise<{
    success: boolean;
    savedCount: number;
    insertedCount: number;
    updatedCount: number;
    failedCount: number;
    errors: string[];
    error?: string;
  }> => {
    try {
      const current = loadStoredVodafoneRecords();
      const recordMap = new Map<string, VodafoneRecord>();
      current.forEach((r) => {
        const c = String(r[' Site code'] || r['Site code'] || r['site code'] || '').trim().toUpperCase();
        if (c) recordMap.set(c, r);
      });

      const now = new Date().toISOString();
      let savedCount = 0;
      let insertedCount = 0;
      let updatedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const rec of recordsToImport) {
        const rawCode = rec[' Site code'] || rec['Site code'] || rec['site code'] || rec.site_code;
        const code = String(rawCode || '').trim().toUpperCase();
        if (!code) continue;

        const isExisting = recordMap.has(code);
        const existing = recordMap.get(code);
        const finalRec: VodafoneRecord = isExisting
          ? { ...existing, ...rec, _updatedAt: now }
          : { ...rec, _createdAt: now, _updatedAt: now };

        recordMap.set(code, finalRec);

        // Standardized Supabase payload
        finalRec.company = 'Vodafone';
        const payload: any = {
          site_code: code,
          'site code': code,
          'Site Status': finalRec['التصنيف'] || 'جاري',
          data: finalRec,
          updated_at: now,
        };
        if (finalRec._id && isUUID(finalRec._id)) {
          payload.id = finalRec._id;
        }

        clientLoop: for (const client of supabaseClients) {
          for (const table of VODAFONE_TABLE_CANDIDATES) {
            try {
              if (isExisting) {
                const { data: updateData, error: updateErr } = await client
                  .from(table)
                  .update(payload)
                  .eq('site_code', code)
                  .select();

                if (!updateErr && updateData && updateData.length > 0) {
                  break clientLoop;
                }
              }

              // Insert new record or if update found 0 rows
              const { data: insertData, error: insertErr } = await client
                .from(table)
                .insert([payload])
                .select();

              if (!insertErr && insertData && insertData.length > 0) {
                break clientLoop;
              }
            } catch (err: any) {
              console.warn(`[Vodafone Supabase] Error saving row ${code} to ${table}:`, err);
            }
          }
        }

        savedCount++;
        if (isExisting) {
          updatedCount++;
        } else {
          insertedCount++;
        }
      }

      const merged = Array.from(recordMap.values());
      saveStoredVodafoneRecords(merged);
      setVodafoneRecords(merged);

      return {
        success: savedCount > 0,
        savedCount,
        insertedCount,
        updatedCount,
        failedCount,
        errors,
      };
    } catch (err: any) {
      return {
        success: false,
        savedCount: 0,
        insertedCount: 0,
        updatedCount: 0,
        failedCount: 0,
        errors: [err?.message || 'فشل الاستيراد الجماعي'],
        error: err?.message || 'فشل الاستيراد الجماعي',
      };
    }
  }, []);

  const vodafoneSites = vodafoneRecords.map((r, i) => mapVodafoneRecordToSiteRecord(r, i));

  return {
    vodafoneRecords,
    vodafoneSites,
    loading,
    error,
    refetchVodafoneRecords,
    saveVodafoneRecord,
    deleteVodafoneRecord,
    deleteVodafoneRecordsBulk,
    bulkImportVodafoneRecords,
  };
}

