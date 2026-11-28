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
import {
  normalizeVodafoneRecord,
  normalizeCodeKey,
  extractVodafoneSiteCode,
  extractVodafoneSiteName,
} from '../utils/vodafoneNormalizer';

const STORAGE_KEY = 'ftts_vodafone_records_v1';
const VODAFONE_TABLE_CANDIDATES = ['vodafone_records', 'vodafone', 'we_records'];

export function mapVodafoneRecordToSiteRecord(rawInput: VodafoneRecord, index = 0): SiteRecord {
  const r = normalizeVodafoneRecord(rawInput);
  const siteCode = extractVodafoneSiteCode(r) || `VDF-${index + 1}`;
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
  const explicitSiteName = extractVodafoneSiteName(r);
  const displaySiteName = explicitSiteName || `موقع ${siteCode} - ${central}`;
  const sector = normalizeSectorName(String(r['رئاسة قطاعات التنفيذ'] || 'قطاع عام').trim()) || 'قطاع عام';
  const executionSector = normalizeSectorName(String(r['قطاع التنفيذ'] || '').trim());
  const generalAdmin = String(r['الادارة العامة لتنفيذ الشبكات'] || r['الادارة العامة للمنطقة'] || 'الإدارة العامة لتنفيذ الشبكات').trim();
  const competentAdmin = String(r['ادارة التنفيذ الفرعية'] || 'إدارة التنفيذ والمسارات').trim();
  const obstacleReason = String(r['اسباب المعوق'] || r['اسباب التعّذر'] || r['اسباب التعذر'] || r['الملاحظات'] || 'لا يوجد تعذر').trim();
  const expectedDate = r['التاريخ المتوقع للانتهاء'] || (r['خطة'] ? `${r['خطة']}-12-31` : '2026-12-31');

  return {
    id: `VDF-${siteCode}`,
    siteCode,
    siteName: displaySiteName,
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
  return normalizeVodafoneRecord(r);
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
  const normKey = normalizeCodeKey(code);
  if (!normKey) return null;
  const records = loadStoredVodafoneRecords();
  return (
    records.find((r) => normalizeCodeKey(extractVodafoneSiteCode(r)) === normKey) ||
    null
  );
}

export function useVodafoneAPI() {
  const [vodafoneRecords, setVodafoneRecords] = useState<VodafoneRecord[]>(() => loadStoredVodafoneRecords());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetchVodafoneRecords = useCallback(async () => {
    setLoading(true);
    try {
      const deletedCodes = await fetchCloudDeletedCodes();

      // 1. Fetch live from Supabase across both `vodafone_records` (if created) and `we_records` (Vodafone rows)
      const fetchedRows: { row: any; source: string }[] = [];
      for (const client of supabaseClients) {
        let clientFoundAny = false;
        for (const table of VODAFONE_TABLE_CANDIDATES) {
          try {
            let query = client.from(table).select('*').limit(5000);
            if (table === 'we_records') {
              query = query.eq('data->>company', 'Vodafone');
            }
            const { data, error: sbError } = await query;
            if (!sbError && Array.isArray(data) && data.length > 0) {
              data.forEach((row: any) => fetchedRows.push({ row, source: table }));
              clientFoundAny = true;
            }
          } catch { }
        }
        if (clientFoundAny) break;
      }

      if (fetchedRows.length > 0) {
        const baseMap = new Map<string, VodafoneRecord>();
        loadStoredVodafoneRecords().forEach((r) => {
          const normRec = normalizeVodafoneRecord(r);
          const code = extractVodafoneSiteCode(normRec);
          const key = normalizeCodeKey(code);
          if (key && !deletedCodes.has(code.toUpperCase()) && !deletedCodes.has(key) && !deletedCodes.has(`VDF-${key}`)) {
            baseMap.set(key, normRec);
          }
        });
        fetchedRows.forEach(({ row }) => {
          const normCloud = normalizeVodafoneRecord(row);
          const code = extractVodafoneSiteCode(normCloud);
          const key = normalizeCodeKey(code);
          if (
            key &&
            code !== SYNC_DELETED_CODES_SITE_CODE &&
            !deletedCodes.has(code.toUpperCase()) &&
            !deletedCodes.has(key) &&
            !deletedCodes.has(`VDF-${key}`)
          ) {
            const prev = baseMap.get(key) || {};
            const mergedRow: VodafoneRecord = normalizeVodafoneRecord({
              ...prev,
              ...normCloud,
              _id: isUUID(row.id) ? row.id : (normCloud._id || prev._id),
              ...(row.updated_at ? { _updatedAt: row.updated_at } : {}),
            });
            baseMap.set(key, mergedRow);
          }
        });
        const merged = Array.from(baseMap.values()).filter((r) => {
          const code = extractVodafoneSiteCode(r);
          const key = normalizeCodeKey(code);
          return !deletedCodes.has(code.toUpperCase()) && !deletedCodes.has(key) && !deletedCodes.has(`VDF-${key}`);
        });
        saveStoredVodafoneRecords(merged);
        setVodafoneRecords(merged);
        return;
      }

      const records = loadStoredVodafoneRecords().filter((r) => {
        const code = extractVodafoneSiteCode(r);
        const key = normalizeCodeKey(code);
        return !deletedCodes.has(code.toUpperCase()) && !deletedCodes.has(key) && !deletedCodes.has(`VDF-${key}`);
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

    // Supabase Realtime channel for instant cross-device updates on both vodafone_records & we_records
    const channel = supabaseFallback
      .channel('vodafone_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vodafone_records' },
        () => {
          refetchVodafoneRecords();
        }
      )
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
      const code = extractVodafoneSiteCode(record).toUpperCase();
      const codeKey = normalizeCodeKey(code);
      if (!code || !codeKey) return { success: false, error: 'يرجى إدخال كود الموقع قبل الحفظ (Site Code)' };

      const current = loadStoredVodafoneRecords();
      const idx = current.findIndex(
        (r) => normalizeCodeKey(extractVodafoneSiteCode(r)) === codeKey
      );
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

      // Build table-aware, cleanly normalized payload (null for empty nullable columns so Postgres never rejects types)
      const toNullableText = (v: any): string | null => {
        const s = String(v ?? '').trim();
        return s ? s : null;
      };

      const buildCloudPayload = (
        dataObj: VodafoneRecord,
        physicalSiteCode: string,
        table: string
      ): Record<string, any> => {
        if (table === 'vodafone_records' || table === 'vodafone') {
          const p: Record<string, any> = {
            site_code: physicalSiteCode,
            site_name: toNullableText(extractVodafoneSiteName(dataObj)),
            sector: toNullableText(dataObj['رئاسة قطاعات التنفيذ'] || dataObj['قطاع التنفيذ']),
            execution_sector: toNullableText(dataObj['قطاع التنفيذ']),
            governorate: toNullableText(dataObj['المحافظه']),
            central: toNullableText(dataObj['سنترال الربط']),
            status: toNullableText(dataObj['التصنيف'] || dataObj.classification) || 'جاري العمل مدني',
            data: dataObj,
            updated_at: now,
          };
          if (recordUuid) p.id = recordUuid;
          return p;
        }

        // Physical columns verified on live `we_records` table
        const p: Record<string, any> = {
          site_code: physicalSiteCode,
          'site code': physicalSiteCode,
          'Exc Sectores': dataObj['قطاع التنفيذ'] || dataObj['رئاسة قطاعات التنفيذ'] || '',
          'Sectores': dataObj['رئاسة قطاعات التنفيذ'] || dataObj['قطاع التنفيذ'] || '',
          'Exc sector': dataObj['قطاع التنفيذ'] || '',
          'Sectore': dataObj['رئاسة قطاعات التنفيذ'] || '',
          'Site Status': dataObj['التصنيف'] || dataObj.classification || 'جاري العمل مدني',
          'NLatitude': toNullableText(dataObj['احدثيات خط العرض']),
          'NLongitude': toNullableText(dataObj['احدثيات خط الطول']),
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

      // Persist directly into Supabase (`vodafone_records` if present, otherwise `we_records` with company='Vodafone')
      let cloudSaved = false;
      let confirmedRowId: string | undefined = recordUuid;
      let lastCloudError: any = null;
      const physicalCodesToTry = [code, `VDF-${code}`];

      clientLoop: for (const client of supabaseClients) {
        for (const table of VODAFONE_TABLE_CANDIDATES) {
          for (const physicalCode of physicalCodesToTry) {
            const safePayload = buildCloudPayload(cloudDataPrimary, physicalCode, table);
            try {
              // A. Direct UPDATE scoped to Vodafone so we never overwrite a WE/Orange row
              let updateQuery = client
                .from(table)
                .update(safePayload)
                .eq('site_code', physicalCode);
              if (table === 'we_records') {
                updateQuery = updateQuery.eq('data->>company', 'Vodafone');
              }
              const { data: updateData, error: updateErr } = await updateQuery.select('id, site_code');

              if (!updateErr && updateData && updateData.length > 0) {
                cloudSaved = true;
                confirmedRowId = updateData[0]?.id || confirmedRowId;
                break clientLoop;
              }
              if (updateErr?.code === 'PGRST205') {
                lastCloudError = updateErr;
                break; // Table does not exist — skip directly to next table
              }

              // B. Try UPDATE by exact UUID if this record already had a UUID
              if (recordUuid) {
                const { data: uuidData, error: uuidErr } = await client
                  .from(table)
                  .update(safePayload)
                  .eq('id', recordUuid)
                  .select('id, site_code');
                if (!uuidErr && uuidData && uuidData.length > 0) {
                  cloudSaved = true;
                  confirmedRowId = uuidData[0]?.id || confirmedRowId;
                  break clientLoop;
                }
              }

              // C. INSERT / UPSERT new row and require returned row confirmation
              const insertPayload: Record<string, any> = {
                ...safePayload,
                created_at: enriched._createdAt || now,
              };

              let { data: insertData, error: insertErr } = await client
                .from(table)
                .upsert([insertPayload], { onConflict: 'id' })
                .select('id, site_code');

              // Retry with metadata-only payload if large inline Base64 caused a payload error
              if (insertErr && isInlineDataUrl && insertErr.code !== 'PGRST205' && insertErr.code !== '23505') {
                const retryPayload = {
                  ...buildCloudPayload(cloudDataMetadataOnly, physicalCode, table),
                  created_at: enriched._createdAt || now,
                };
                const retryRes = await client
                  .from(table)
                  .upsert([retryPayload], { onConflict: 'id' })
                  .select('id, site_code');
                insertData = retryRes.data;
                insertErr = retryRes.error;
              }

              if (!insertErr && insertData && insertData.length > 0) {
                cloudSaved = true;
                confirmedRowId = insertData[0]?.id || confirmedRowId;
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

      if (!cloudSaved) {
        // Strict rollback: never keep unpersisted optimistic data or show false success
        saveStoredVodafoneRecords(current);
        setVodafoneRecords(current);
        console.error(`[Vodafone Supabase] Failed to persist site ${code}:`, lastCloudError);
        return {
          success: false,
          cloudSaved: false,
          error: formatSupabaseSaveError(
            lastCloudError || { message: 'لم تؤكد قاعدة البيانات حفظ السجل' },
            code
          ),
        };
      }

      // Sync confirmed UUID back into local cache & state so future edits match directly by UUID
      if (confirmedRowId && isUUID(confirmedRowId)) {
        const synced = updated.map((r) => {
          const c = String(r[' Site code'] || r['Site code'] || r['site code'] || r.site_code || '').trim().toUpperCase();
          return c === code ? { ...r, _id: confirmedRowId } : r;
        });
        saveStoredVodafoneRecords(synced);
        setVodafoneRecords(synced);
      }

      return {
        success: true,
        cloudSaved: true,
        message: `تم الحفظ في قاعدة بيانات فودافون بنجاح (${code}) ✅`,
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

        // Standardized Supabase payload (table-aware)
        finalRec.company = 'Vodafone';
        let rowSaved = false;
        let rowErr: any = null;
        const physicalCodes = [code, `VDF-${code}`];

        clientLoop: for (const client of supabaseClients) {
          for (const table of VODAFONE_TABLE_CANDIDATES) {
            for (const physicalCode of physicalCodes) {
              const payload: any =
                table === 'vodafone_records' || table === 'vodafone'
                  ? {
                    site_code: physicalCode,
                    sector: String(finalRec['رئاسة قطاعات التنفيذ'] || finalRec['قطاع التنفيذ'] || '').trim() || null,
                    execution_sector: String(finalRec['قطاع التنفيذ'] || '').trim() || null,
                    central: String(finalRec['سنترال الربط'] || '').trim() || null,
                    status: String(finalRec['التصنيف'] || '').trim() || 'جاري العمل مدني',
                    data: finalRec,
                    updated_at: now,
                  }
                  : {
                    site_code: physicalCode,
                    'site code': physicalCode,
                    'Site Status': finalRec['التصنيف'] || 'جاري العمل مدني',
                    data: finalRec,
                    updated_at: now,
                  };
              if (finalRec._id && isUUID(finalRec._id)) {
                payload.id = finalRec._id;
              }

              try {
                if (isExisting) {
                  let uq = client.from(table).update(payload).eq('site_code', physicalCode);
                  if (table === 'we_records') uq = uq.eq('data->>company', 'Vodafone');
                  const { data: updateData, error: updateErr } = await uq.select('id');
                  if (!updateErr && updateData && updateData.length > 0) {
                    rowSaved = true;
                    break clientLoop;
                  }
                  if (updateErr?.code === 'PGRST205') {
                    rowErr = updateErr;
                    break;
                  }
                }

                const { data: insertData, error: insertErr } = await client
                  .from(table)
                  .insert([payload])
                  .select('id');

                if (!insertErr && insertData && insertData.length > 0) {
                  rowSaved = true;
                  break clientLoop;
                }
                if (insertErr) {
                  rowErr = insertErr;
                  if (insertErr.code === 'PGRST205') break;
                  if (insertErr.code === '23505') continue;
                }
              } catch (err: any) {
                rowErr = err;
                console.warn(`[Vodafone Supabase] Error saving row ${code} to ${table}:`, err);
              }
            }
          }
        }

        if (rowSaved) {
          savedCount++;
          if (isExisting) {
            updatedCount++;
          } else {
            insertedCount++;
          }
        } else {
          failedCount++;
          errors.push(`${code}: ${formatSupabaseSaveError(rowErr, code)}`);
          if (!isExisting) recordMap.delete(code);
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

