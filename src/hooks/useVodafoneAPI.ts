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
import { logActivity, buildRecordDiffSummary, getActiveActor } from '../utils/auditService';
import { formatSupabaseSaveError } from '../utils/siteValidation';

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
    // Storage quota exceeded (e.g. large inline Base64 attachment) — strip inline data URLs only for localStorage copy
    try {
      const compact = records.map((r) => {
        const hasInlineDoc = typeof r.documentUrl === 'string' && r.documentUrl.startsWith('data:') && r.documentUrl.length > 40000;
        const hasInlineAtt = typeof r.attachmentUrl === 'string' && r.attachmentUrl.startsWith('data:') && r.attachmentUrl.length > 40000;
        if (!hasInlineDoc && !hasInlineAtt) return r;
        return {
          ...r,
          documentUrl: hasInlineDoc ? '' : r.documentUrl,
          attachmentUrl: hasInlineAtt ? '' : r.attachmentUrl,
        };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
    } catch {
      // keep in-memory copy intact
    }
  }
}

export function fetchVodafoneSiteRecord(code: string): VodafoneRecord | null {
  const norm = String(code ?? '').trim().toUpperCase();
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
                const rawCodeFromRow =
                  rowData['Site code'] ||
                  rowData['site code'] ||
                  rowData[' Site code'] ||
                  rowData.site_code ||
                  row.site_code ||
                  row['site code'] ||
                  row['Site code'] ||
                  row.id ||
                  '';
                const code = String(rawCodeFromRow).trim().toUpperCase().replace(/^VDF-/, '');
                if (code && code !== SYNC_DELETED_CODES_SITE_CODE && !deletedCodes.has(code)) {
                  const prev = baseMap.get(code) || {};
                  const mergedRow: VodafoneRecord = normalizeVodafoneSector({
                    ...prev,
                    ...rowData,
                    _id: isUUID(row.id) ? row.id : (rowData._id || prev._id),
                    company: 'Vodafone',
                    ' Site code': code,
                    'Site code': code,
                    'site code': code,
                    site_code: code,
                  });
                  baseMap.set(code, mergedRow);
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
      const code = String(rawCode ?? '').trim().toUpperCase();
      if (!code) return { success: false, error: 'كود الموقع مطلوب' };

      const current = loadStoredVodafoneRecords();
      const idx = current.findIndex((r) => {
        const c = String(r[' Site code'] || r['Site code'] || r['site code'] || r.site_code || '').trim().toUpperCase();
        return c === code;
      });
      const oldRec = idx >= 0 ? current[idx] : null;

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

      const docUrl = String(record.documentUrl || record.attachmentUrl || '').trim();
      const isInlineDataUrl = docUrl.startsWith('data:');
      const actor = getActiveActor();
      const recordUuid =
        (record._id && isUUID(record._id) ? record._id : null) ||
        (oldRec?._id && isUUID(oldRec._id) ? oldRec._id : null) ||
        (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : undefined);

      const canonSector = normalizeSectorName(
        record['رئاسة قطاعات التنفيذ'] || record['قطاع التنفيذ'] || ''
      );

      const enriched: VodafoneRecord = normalizeVodafoneSector({
        ...record,
        ...(recordUuid ? { _id: recordUuid } : {}),
        company: 'Vodafone',
        ' Site code': code,
        'Site code': code,
        'site code': code,
        site_code: code,
        ...(canonSector ? {
          'رئاسة قطاعات التنفيذ': canonSector,
          'قطاع التنفيذ': canonSector,
        } : {}),
        'التصنيف': String(record['التصنيف'] || '').trim() || 'جاري العمل مدني',
        classification: String(record['التصنيف'] || '').trim() || 'جاري العمل مدني',
        documentUrl: docUrl,
        attachmentUrl: isInlineDataUrl ? '' : docUrl,
        'المستند': record['المستند'] || (docUrl ? `Doc-${code}.pdf` : ''),
        specialTarget: isSpecial,
        special_target: isSpecial,
        'سبيشال تارجت': isSpecial,
        _createdAt: oldRec?._createdAt || record._createdAt || now,
        _updatedAt: now,
        _lastModifiedBy: actor.displayName,
        _lastModifiedAt: now,
      });

      // 1. Ensure code is removed from deleted-codes cache BEFORE updating state & cloud
      await removeCloudDeletedCode(code);
      await removeCloudDeletedCode(`VDF-${code}`);

      // 2. Instant local optimistic update: immediate reflection across localStorage & all dashboard counters
      let updated: VodafoneRecord[];
      if (idx >= 0) {
        updated = [...current];
        updated[idx] = { ...updated[idx], ...enriched };
      } else {
        updated = [enriched, ...current];
      }
      saveStoredVodafoneRecords(updated);
      setVodafoneRecords(updated);

      logActivity({
        actionType: oldRec ? 'تعديل موقع' : 'إضافة موقع',
        module: 'Vodafone',
        siteCode: code,
        details: buildRecordDiffSummary(oldRec, enriched, docUrl ? `مرفق: ${enriched['المستند']}` : undefined),
      });

      // Build safe payload matching physical Supabase `we_records` columns + JSONB `data`
      const buildCloudPayload = (dataObj: VodafoneRecord, physicalSiteCode: string): Record<string, any> => {
        const p: Record<string, any> = {
          site_code: physicalSiteCode,
          'site code': physicalSiteCode,
          'Exc Sectores': dataObj['قطاع التنفيذ'] || dataObj['رئاسة قطاعات التنفيذ'] || '',
          'Sectores': dataObj['رئاسة قطاعات التنفيذ'] || dataObj['قطاع التنفيذ'] || '',
          'Exc sector': dataObj['قطاع التنفيذ'] || '',
          'Sectore': dataObj['رئاسة قطاعات التنفيذ'] || '',
          'Site Status': dataObj['التصنيف'] || dataObj.classification || 'جاري العمل مدني',
          data: dataObj,
          updated_at: now,
        };
        if (recordUuid) p.id = recordUuid;
        return p;
      };

      const cloudDataPrimary: VodafoneRecord = isInlineDataUrl
        ? { ...enriched, attachmentUrl: '' }
        : enriched;
      const cloudDataMetadataOnly: VodafoneRecord = {
        ...enriched,
        documentUrl: isInlineDataUrl ? '' : docUrl,
        attachmentUrl: isInlineDataUrl ? '' : docUrl,
      };

      // Persist directly into Supabase vodafone tables across active clients
      let cloudSaved = false;
      let lastCloudError: any = null;
      const physicalCodesToTry = [code, `VDF-${code}`];

      clientLoop: for (const client of supabaseClients) {
        for (const table of VODAFONE_TABLE_CANDIDATES) {
          for (const physicalCode of physicalCodesToTry) {
            const safePayload = buildCloudPayload(cloudDataPrimary, physicalCode);
            try {
              // A. Direct UPDATE scoped to Vodafone (or matching UUID) so we never overwrite a WE row
              let updateQuery = client
                .from(table)
                .update(safePayload)
                .eq('site_code', physicalCode);
              if (table === 'we_records') {
                updateQuery = updateQuery.eq('data->>company', 'Vodafone');
              }
              const { data: updateData, error: updateErr } = await updateQuery.select('id');

              if (!updateErr && updateData && updateData.length > 0) {
                cloudSaved = true;
                break clientLoop;
              }

              // B. Try UPDATE by exact UUID if this record already had a UUID
              if (recordUuid) {
                const { data: uuidData, error: uuidErr } = await client
                  .from(table)
                  .update(safePayload)
                  .eq('id', recordUuid)
                  .select('id');
                if (!uuidErr && uuidData && uuidData.length > 0) {
                  cloudSaved = true;
                  break clientLoop;
                }
              }

              // C. INSERT new row (or UPSERT on id)
              const insertPayload: Record<string, any> = {
                ...safePayload,
                created_at: enriched._createdAt || now,
              };

              let { data: insertData, error: insertErr } = await client
                .from(table)
                .upsert([insertPayload], { onConflict: 'id' })
                .select('id');

              // Retry with metadata-only payload if large inline Base64 caused a payload error
              if (insertErr && isInlineDataUrl && insertErr.code !== 'PGRST205' && insertErr.code !== '23505') {
                const retryPayload = {
                  ...buildCloudPayload(cloudDataMetadataOnly, physicalCode),
                  created_at: enriched._createdAt || now,
                };
                const retryRes = await client
                  .from(table)
                  .upsert([retryPayload], { onConflict: 'id' })
                  .select('id');
                insertData = retryRes.data;
                insertErr = retryRes.error;
              }

              if (!insertErr && insertData && insertData.length > 0) {
                cloudSaved = true;
                break clientLoop;
              }

              if (insertErr) {
                lastCloudError = insertErr;
                // If table doesn't exist (PGRST205), move immediately to next table
                if (insertErr.code === 'PGRST205') break;
                // If unique site_code collision (23505) with another operator, loop tries `VDF-${code}` next!
                if (insertErr.code === '23505') continue;
              }
            } catch (err: any) {
              lastCloudError = err;
            }
          }
        }
      }

      if (!cloudSaved && lastCloudError) {
        console.error(`[Vodafone Supabase] Failed to persist site ${code}:`, lastCloudError);
        return {
          success: false,
          cloudSaved: false,
          error: formatSupabaseSaveError(lastCloudError, code),
        };
      }

      return {
        success: true,
        cloudSaved: true,
        message: `تم حفظ وتحديث بيانات موقع Vodafone (${code}) بنجاح في قاعدة البيانات السحابية ✅`,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل حفظ بيانات الموقع' };
    }
  }, []);

  const deleteVodafoneRecord = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const norm = String(code ?? '').trim().toUpperCase();
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

      logActivity({
        actionType: 'حذف موقع',
        module: 'Vodafone',
        siteCode: cleanNorm,
        details: `حذف موقع Vodafone (${cleanNorm})`,
      });

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

      logActivity({
        actionType: 'حذف جماعي',
        module: 'Vodafone',
        siteCode: `${codes.length} مواقع`,
        details: `حذف جماعي لمواقع Vodafone (${codes.slice(0, 10).join(', ')}${codes.length > 10 ? '...' : ''})`,
      });

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

