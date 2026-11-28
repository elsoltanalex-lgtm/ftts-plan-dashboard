// src/hooks/useOrangeAPI.ts
// Live state & persistence API hook for Orange FTTS dataset (with Supabase sync & localStorage fallback)

import { useState, useEffect, useCallback } from 'react';
import type { SiteRecord } from '../types/dashboard';
import type { OrangeRecord } from '../types/orange';
import { normalizeOrangeClassification } from '../types/orange';
import { ORANGE_RAW_RECORDS, ORANGE_SITES } from '../data/orangeSites';
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
import { normalizeCodeKey } from '../utils/vodafoneNormalizer';

const STORAGE_KEY = 'ftts_orange_records_v3';
const ORANGE_TABLE_CANDIDATES = ['orange_records', 'orange', 'we_records'];

function extractOrangeSiteCode(raw: any): string {
  if (!raw || typeof raw !== 'object') return '';
  const val =
    raw.site_code ??
    raw.Site_code ??
    raw['Site code'] ??
    raw['site code'] ??
    raw[' Site code'] ??
    raw.HUBID ??
    raw.hubid ??
    raw.siteCode ??
    '';
  return String(val ?? '')
    .trim()
    .toUpperCase()
    .replace(/^(ORG-|ORANGE-)/i, '')
    .trim();
}

function extractOrangeSiteName(raw: any): string {
  if (!raw || typeof raw !== 'object') return '';
  const candidates = [
    raw.site_name,
    raw['Site name'],
    raw['Site Name'],
    raw.siteName,
    raw['اسم الموقع'],
    raw['إسم الموقع'],
    raw.name,
  ];
  for (const c of candidates) {
    const s = String(c ?? '').trim();
    if (s && s !== 'undefined' && s !== 'null' && s !== '-') return s;
  }
  return '';
}

function normalizeOrangeCodeKey(code: unknown): string {
  const bare = String(code ?? '')
    .trim()
    .toUpperCase()
    .replace(/^(ORG-|ORANGE-)/i, '')
    .trim();
  return normalizeCodeKey(bare);
}

export function normalizeOrangeRecord(raw: any): OrangeRecord {
  const base: Record<string, any> =
    raw && typeof raw === 'object'
      ? raw.data && typeof raw.data === 'object'
        ? { ...raw, ...raw.data }
        : { ...raw }
      : {};
  delete base.data;

  const code = extractOrangeSiteCode(base);
  const siteName = extractOrangeSiteName(base);
  const sec = normalizeSectorName(
    base['رئاسة قطاعات التنفيذ'] || base['رئاسة القطاعات '] || base['رئاسة القطاعات'] || base.sector || ''
  );
  const execSec = normalizeSectorName(base['قطاع التنفيذ'] || base.execution_sector || sec || '');
  const central = String(base['سنترال الربط'] ?? base.central ?? '').trim();
  const governorate = String(base['المحافظه'] ?? base['المحافظة'] ?? base.governorate ?? '').trim();
  const status = String(
    base['التصنيف'] ?? base['التصنيف (مدني)'] ?? base.general_status ?? base.status ?? base.classification ?? ''
  ).trim();

  return {
    ...base,
    company: 'Orange',
    site_code: code,
    'Site code': code,
    'site code': code,
    ' Site code': code,
    HUBID: code || base.HUBID,
    site_name: siteName,
    'Site name': siteName,
    'اسم الموقع': siteName,
    ...(sec ? { 'رئاسة قطاعات التنفيذ': sec, 'رئاسة القطاعات': sec, 'رئاسة القطاعات ': sec, sector: sec } : {}),
    ...(execSec ? { 'قطاع التنفيذ': execSec, execution_sector: execSec } : {}),
    ...(central ? { 'سنترال الربط': central, central } : {}),
    ...(governorate ? { 'المحافظه': governorate, governorate } : {}),
    ...(status ? { 'التصنيف': status, 'التصنيف (مدني)': base['التصنيف (مدني)'] || status, classification: status } : {}),
  };
}

export function mapOrangeRecordToSiteRecord(rawInput: OrangeRecord, index = 0): SiteRecord {
  const r = normalizeOrangeRecord(rawInput);
  const code = extractOrangeSiteCode(r) || `ORG-${index + 1}`;
  const rawTasneef = String(r['التصنيف'] || r['التصنيف (مدني)'] || '').trim();

  let status = 'جاري المعاينة';
  let executionCategory: 'Completed' | 'In Progress' | 'Blocked / On Hold' | 'Planned' = 'In Progress';
  let progressPercent = 20;

  if (rawTasneef.includes('تشغيل') || rawTasneef.includes('فيبر') || rawTasneef.includes('فايبر') || rawTasneef === 'مشغل') {
    status = 'تم التشغيل فايبر';
    executionCategory = 'Completed';
    progressPercent = 100;
  } else if (rawTasneef === 'تم مدني' || (rawTasneef.includes('مدني') && (rawTasneef.startsWith('تم') || rawTasneef.includes('تم ')) && !rawTasneef.includes('انتهاء'))) {
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
  const explicitName = extractOrangeSiteName(r);
  const displayName = explicitName || `موقع ${code} - ${central}`;
  const sector = normalizeSectorName(String(r['رئاسة قطاعات التنفيذ'] || r['رئاسة القطاعات '] || r['رئاسة القطاعات'] || 'قطاع الشرقية').trim()) || 'قطاع الشرقية';
  const generalAdmin = String(r['الادارة العامة لتنفيذ الشبكات'] || r['الادارة العامة للتنفيذ'] || r['الادارة العامة'] || 'الإدارة العامة لتنفيذ الشبكات').trim();
  const subSector = normalizeSectorName(String(r['قطاع التنفيذ'] || r['قطاع المناطق'] || r['القطاع'] || 'إدارة مختصة').trim()) || 'إدارة مختصة';
  const competentAdmin = String(r['ادارة التنفيذ الفرعية'] || r['الادارة العامة للمنطقة'] || r['المنطقة'] || 'إدارة المنطقة').trim();
  const obstacleReason = String(r['اسباب المعوق'] || r['اسباب التعّذر'] || r['اسباب التعذر'] || r['نوع المعوق المدني'] || r['الملاحظات'] || 'لا يوجد تعذر').trim();
  const expectedDate = r['التاريخ المتوقع للانتهاء'] || (r['خطة'] ? `${r['خطة']}-12-31` : '2026-12-31');

  return {
    id: `ORG-${code}`,
    siteCode: code,
    siteName: displayName,
    company: 'Orange',
    status,
    executionCategory,
    linksCount: 1,
    // 4-tier exact hierarchy fields for Orange
    sector, // رئاسة القطاعات
    generalAdmin, // الإدارة العامة للتنفيذ
    subSector, // الإدارة المختصة
    competentAdmin, // إدارة المنطقة
    executionSector: normalizeSectorName(String(r['قطاع التنفيذ'] || '').trim()),
    governorate: String(r['المحافظه'] || '').trim(),
    central,
    civilContractor: String(r['مسئولية التنفيذ'] || r['مسئوليه التنفيذ'] || 'التنفيذ').trim(),
    responsibility: String(r['مسئولية التنفيذ'] || r['مسئوليه التنفيذ'] || 'التنفيذ').trim(),
    classification: rawTasneef || 'FTTS Rollout',
    obstacleReason,
    obstacleType: String(r['اسباب التعّذر'] || r['اسباب التعذر'] || '').trim(),
    deliveryArea: String(r['تاكيد التسليم للمنطقه'] || '').trim(),
    electricalClassification: String(r['التصنيف (كهربي)'] || '').trim(),
    electricalStage: String(r['المرحله الكهربيه'] || '').trim(),
    progressPercent,
    expectedDate,
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

// In-memory cache
let inMemoryOrangeRecords: OrangeRecord[] = [];

function normalizeOrangeSector(r: OrangeRecord): OrangeRecord {
  return normalizeOrangeRecord(r);
}

function loadStoredOrangeRecords(): OrangeRecord[] {
  if (inMemoryOrangeRecords.length > 0) return inMemoryOrangeRecords;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryOrangeRecords = parsed.map(normalizeOrangeSector);
        return inMemoryOrangeRecords;
      }
    }
  } catch {
    // fallback
  }
  inMemoryOrangeRecords = ORANGE_RAW_RECORDS.map(normalizeOrangeSector);
  return inMemoryOrangeRecords;
}

function saveStoredOrangeRecords(records: OrangeRecord[]): void {
  inMemoryOrangeRecords = records;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // storage limit fallback
  }
}

export function fetchOrangeSiteRecord(code: string): OrangeRecord | null {
  const targetKey = normalizeOrangeCodeKey(code);
  if (!targetKey) return null;
  const records = loadStoredOrangeRecords();
  return records.find((r) => normalizeOrangeCodeKey(extractOrangeSiteCode(r)) === targetKey) || null;
}

export function useOrangeAPI() {
  const [orangeRecords, setOrangeRecords] = useState<OrangeRecord[]>(() => loadStoredOrangeRecords());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetchOrangeRecords = useCallback(async () => {
    setLoading(true);
    try {
      const deletedCodes = await fetchCloudDeletedCodes();

      // 1. Fetch live from Supabase across both `orange_records` (if created) and `we_records` (Orange rows)
      const fetchedRows: { row: any; source: string }[] = [];
      for (const client of supabaseClients) {
        let clientFoundAny = false;
        for (const table of ORANGE_TABLE_CANDIDATES) {
          try {
            let query = client.from(table).select('*').limit(5000);
            if (table === 'we_records') {
              query = query.eq('data->>company', 'Orange');
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
        const baseMap = new Map<string, OrangeRecord>();
        loadStoredOrangeRecords().forEach((r) => {
          const normRec = normalizeOrangeRecord(r);
          const code = extractOrangeSiteCode(normRec);
          const key = normalizeOrangeCodeKey(code);
          if (key && !deletedCodes.has(code) && !deletedCodes.has(key) && !deletedCodes.has(`ORG-${key}`)) {
            baseMap.set(key, normRec);
          }
        });
        fetchedRows.forEach(({ row }) => {
          const normCloud = normalizeOrangeRecord(row);
          const code = extractOrangeSiteCode(normCloud);
          const key = normalizeOrangeCodeKey(code);
          if (
            key &&
            code !== SYNC_DELETED_CODES_SITE_CODE &&
            !deletedCodes.has(code) &&
            !deletedCodes.has(key) &&
            !deletedCodes.has(`ORG-${key}`)
          ) {
            const prev = baseMap.get(key) || {};
            const mergedRow = normalizeOrangeRecord({
              ...prev,
              ...normCloud,
              _id: isUUID(row.id) ? row.id : (normCloud._id || prev._id),
              ...(row.updated_at ? { _updatedAt: row.updated_at } : {}),
            });
            baseMap.set(key, mergedRow);
          }
        });
        const merged = Array.from(baseMap.values()).filter((r) => {
          const code = extractOrangeSiteCode(r);
          const key = normalizeOrangeCodeKey(code);
          return !deletedCodes.has(code) && !deletedCodes.has(key) && !deletedCodes.has(`ORG-${key}`);
        });
        saveStoredOrangeRecords(merged);
        setOrangeRecords(merged);
        return;
      }

      const records = loadStoredOrangeRecords().filter((r) => {
        const code = extractOrangeSiteCode(r);
        const key = normalizeOrangeCodeKey(code);
        return !deletedCodes.has(code) && !deletedCodes.has(key) && !deletedCodes.has(`ORG-${key}`);
      });
      setOrangeRecords(records);
    } catch (err: any) {
      setError(err?.message || 'Error fetching Orange records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetchOrangeRecords();

    // Supabase Realtime channel for instant cross-device updates on both orange_records & we_records
    const channel = supabaseFallback
      .channel('orange_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orange_records' },
        () => {
          refetchOrangeRecords();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'we_records' },
        (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;
          if (
            (newRow && (newRow.data?.company === 'Orange' || newRow.id === SYNC_DELETED_CODES_ID || newRow.site_code === SYNC_DELETED_CODES_SITE_CODE)) ||
            (oldRow && (oldRow.data?.company === 'Orange' || oldRow.id === SYNC_DELETED_CODES_ID || oldRow.site_code === SYNC_DELETED_CODES_SITE_CODE))
          ) {
            refetchOrangeRecords();
          }
        }
      )
      .subscribe();

    // Force real-time refresh whenever mobile/desktop user switches back to the tab or unlocks screen
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetchOrangeRecords();
      }
    };
    const handleFocus = () => {
      refetchOrangeRecords();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      supabaseFallback.removeChannel(channel);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refetchOrangeRecords]);

  const saveOrangeRecord = useCallback(async (record: OrangeRecord): Promise<{ success: boolean; cloudSaved?: boolean; message?: string; error?: string }> => {
    try {
      const code = extractOrangeSiteCode(record);
      const codeKey = normalizeOrangeCodeKey(code);
      if (!code || !codeKey) return { success: false, error: 'يرجى إدخال كود الموقع قبل الحفظ (Site Code)' };

      const current = loadStoredOrangeRecords();
      const idx = current.findIndex((r) => normalizeOrangeCodeKey(extractOrangeSiteCode(r)) === codeKey);
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

      const docUrl = String(record.documentUrl || (record as any).attachmentUrl || '').trim();
      const isInlineDataUrl = docUrl.startsWith('data:');
      const recordUuid =
        (record._id && isUUID(record._id) ? record._id : null) ||
        (oldRec?._id && isUUID(oldRec._id) ? oldRec._id : null) ||
        (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : undefined);

      const canonSec = normalizeSectorName(
        record['رئاسة قطاعات التنفيذ'] || record['رئاسة القطاعات '] || record['رئاسة القطاعات'] || record['قطاع التنفيذ'] || ''
      );
      const actor = getActiveActor();
      const enriched: OrangeRecord = normalizeOrangeRecord({
        ...record,
        ...(recordUuid ? { _id: recordUuid } : {}),
        company: 'Orange',
        ' Site code': code,
        'Site code': code,
        'site code': code,
        site_code: code,
        HUBID: code,
        ...(canonSec ? {
          'رئاسة قطاعات التنفيذ': canonSec,
          'رئاسة القطاعات ': canonSec,
          'رئاسة القطاعات': canonSec,
          'قطاع التنفيذ': canonSec,
        } : {}),
        'التصنيف': String(record['التصنيف'] || record['التصنيف (مدني)'] || '').trim() || 'جاري المعاينة',
        'التصنيف (مدني)': String(record['التصنيف (مدني)'] || record['التصنيف'] || '').trim() || 'جاري المعاينة',
        classification: String(record['التصنيف'] || record['التصنيف (مدني)'] || '').trim() || 'جاري المعاينة',
        documentUrl: docUrl,
        attachmentUrl: isInlineDataUrl ? '' : docUrl,
        'المستند': record['المستند'] || (docUrl ? `Doc-Orange-${code}.pdf` : ''),
        specialTarget: isSpecial,
        special_target: isSpecial,
        'سبيشال تارجت': isSpecial,
        _createdAt: oldRec?._createdAt || record._createdAt || now,
        _updatedAt: now,
        _lastModifiedBy: actor.displayName,
        _lastModifiedAt: now,
      });

      // 1. Ensure code & ORG- prefixed variant are removed from deleted-codes registry BEFORE updating state/cloud
      await removeCloudDeletedCode(code);
      await removeCloudDeletedCode(`ORG-${code}`);

      // 2. Instant local optimistic update
      let updated: OrangeRecord[];
      if (idx >= 0) {
        updated = [...current];
        updated[idx] = { ...updated[idx], ...enriched };
      } else {
        updated = [enriched, ...current];
      }
      saveStoredOrangeRecords(updated);
      setOrangeRecords(updated);

      const toNullableText = (v: any): string | null => {
        const s = String(v ?? '').trim();
        return s ? s : null;
      };

      const buildCloudPayload = (dataObj: OrangeRecord, physicalSiteCode: string, table: string): Record<string, any> => {
        if (table === 'orange_records' || table === 'orange') {
          const p: Record<string, any> = {
            site_code: physicalSiteCode,
            site_name: toNullableText(extractOrangeSiteName(dataObj)),
            sector: toNullableText(dataObj['رئاسة قطاعات التنفيذ'] || dataObj['قطاع التنفيذ']),
            execution_sector: toNullableText(dataObj['قطاع التنفيذ']),
            governorate: toNullableText(dataObj['المحافظه']),
            central: toNullableText(dataObj['سنترال الربط']),
            status: toNullableText(dataObj['التصنيف'] || dataObj['التصنيف (مدني)']) || 'جاري المعاينة',
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
          'Site Status': dataObj['التصنيف (مدني)'] || dataObj['التصنيف'] || 'جاري المعاينة',
          'NLatitude': toNullableText(dataObj['احدثيات خط العرض']),
          'NLongitude': toNullableText(dataObj['احدثيات خط الطول']),
          data: dataObj,
          updated_at: now,
        };
        if (recordUuid) p.id = recordUuid;
        return p;
      };

      const cloudDataPrimary: OrangeRecord = isInlineDataUrl ? { ...enriched, attachmentUrl: '' } : enriched;
      const cloudDataMetadataOnly: OrangeRecord = {
        ...enriched,
        documentUrl: isInlineDataUrl ? '' : docUrl,
        attachmentUrl: isInlineDataUrl ? '' : docUrl,
      };

      // Persist directly into Supabase (`orange_records` if created, otherwise `we_records` with company='Orange')
      let cloudSaved = false;
      let confirmedRowId: string | undefined = recordUuid;
      let lastCloudError: any = null;
      const physicalCodesToTry = [code, `ORG-${code}`];

      clientLoop: for (const client of supabaseClients) {
        for (const table of ORANGE_TABLE_CANDIDATES) {
          for (const physicalCode of physicalCodesToTry) {
            const safePayload = buildCloudPayload(cloudDataPrimary, physicalCode, table);
            try {
              // A. Direct UPDATE scoped to Orange so we never overwrite a WE/Vodafone row
              let updateQuery = client
                .from(table)
                .update(safePayload)
                .eq('site_code', physicalCode);
              if (table === 'we_records') {
                updateQuery = updateQuery.eq('data->>company', 'Orange');
              }
              const { data: updateData, error: updateErr } = await updateQuery.select('id, site_code');

              if (!updateErr && updateData && updateData.length > 0) {
                cloudSaved = true;
                confirmedRowId = updateData[0]?.id || confirmedRowId;
                break clientLoop;
              }
              if (updateErr?.code === 'PGRST205') {
                lastCloudError = updateErr;
                break;
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

              // C. UPSERT new row and require returned row confirmation
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
                if (insertErr.code === 'PGRST205') break;
                if (insertErr.code === '23505') continue; // Try ORG-${code} next
              }
            } catch (err: any) {
              lastCloudError = err;
            }
          }
        }
      }

      if (!cloudSaved) {
        // Strict rollback: never keep unpersisted optimistic data or log false activity
        saveStoredOrangeRecords(current);
        setOrangeRecords(current);
        console.error(`[Orange Supabase] Failed to persist site ${code}:`, lastCloudError);
        return {
          success: false,
          cloudSaved: false,
          error: formatSupabaseSaveError(
            lastCloudError || { message: 'لم تؤكد قاعدة البيانات حفظ السجل' },
            code
          ),
        };
      }

      // Sync confirmed UUID back into local cache & state
      if (confirmedRowId && isUUID(confirmedRowId)) {
        const synced = updated.map((r) =>
          normalizeOrangeCodeKey(extractOrangeSiteCode(r)) === codeKey ? { ...r, _id: confirmedRowId } : r
        );
        saveStoredOrangeRecords(synced);
        setOrangeRecords(synced);
      }

      logActivity({
        actionType: oldRec ? 'تعديل موقع' : 'إضافة موقع',
        module: 'Orange',
        siteCode: code,
        details: buildRecordDiffSummary(oldRec, enriched, docUrl ? `مرفق: ${enriched['المستند']}` : undefined),
      });

      return {
        success: true,
        cloudSaved: true,
        message: `تم الحفظ في قاعدة بيانات Orange بنجاح (${code}) ✅`,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل حفظ بيانات الموقع' };
    }
  }, []);

  const deleteOrangeRecord = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const norm = String(code ?? '').trim().toUpperCase();
      const targetCodes = new Set([norm, code]);
      if (norm.startsWith('ORG-')) targetCodes.add(norm.slice(4));
      if (norm.startsWith('ORANGE-')) targetCodes.add(norm.slice(7));

      const current = loadStoredOrangeRecords();
      const filtered = current.filter((r) => {
        const c = String(r[' Site code'] || r['Site code'] || r['site code'] || (r as any).HUBID || (r as any).hubid || (r as any).site_code || (r as any)._id || (r as any).id || '').trim().toUpperCase();
        return !targetCodes.has(c);
      });
      saveStoredOrangeRecords(filtered);
      setOrangeRecords(filtered);

      const targetList = Array.from(targetCodes);

      // Persist to authoritative Cloud Deleted Codes in Supabase for cross-device sync
      await addCloudDeletedCodes(targetList);

      logActivity({
        actionType: 'حذف موقع',
        module: 'Orange',
        siteCode: norm,
        details: `حذف موقع Orange (${norm})`,
      });

      // Delete from Supabase tables across active clients (Client 2 Fallback hosts active live dataset)
      for (const client of supabaseClients) {
        for (const table of ORANGE_TABLE_CANDIDATES) {
          try {
            await client.from(table).delete().in('site_code', targetList);
            await client.from(table).delete().in('site code', targetList);
            await client.from(table).delete().in('Site code', targetList);
            await client.from(table).delete().in('id', targetList);
          } catch (delErr) {
            console.error(`[Orange Supabase] Delete exception on table ${table}:`, delErr);
          }
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل حذف الموقع' };
    }
  }, []);

  const deleteOrangeRecordsBulk = useCallback(async (codes: string[]): Promise<{ success: boolean; count?: number; error?: string }> => {
    try {
      if (!codes || codes.length === 0) return { success: true, count: 0 };
      const codeSet = new Set<string>();
      codes.forEach((c) => {
        const str = String(c || '').trim();
        if (!str) return;
        const upper = str.toUpperCase();
        codeSet.add(str);
        codeSet.add(upper);
        if (upper.startsWith('ORG-')) codeSet.add(upper.slice(4));
        if (upper.startsWith('ORANGE-')) codeSet.add(upper.slice(7));
      });

      const current = loadStoredOrangeRecords();
      const filtered = current.filter((r) => {
        const c = String(r[' Site code'] || r['Site code'] || r['site code'] || (r as any).HUBID || (r as any).hubid || (r as any).site_code || (r as any)._id || (r as any).id || '').trim().toUpperCase();
        return !codeSet.has(c);
      });
      saveStoredOrangeRecords(filtered);
      setOrangeRecords(filtered);

      // Batch delete from Supabase tables across active clients
      const codeArray = Array.from(codeSet);

      // Persist to authoritative Cloud Deleted Codes in Supabase for cross-device sync
      await addCloudDeletedCodes(codeArray);

      logActivity({
        actionType: 'حذف جماعي',
        module: 'Orange',
        siteCode: `${codes.length} مواقع`,
        details: `حذف جماعي لمواقع Orange (${codes.slice(0, 10).join(', ')}${codes.length > 10 ? '...' : ''})`,
      });

      for (const client of supabaseClients) {
        for (const table of ORANGE_TABLE_CANDIDATES) {
          try {
            await client.from(table).delete().in('site_code', codeArray);
            await client.from(table).delete().in('site code', codeArray);
            await client.from(table).delete().in('Site code', codeArray);
            await client.from(table).delete().in('id', codeArray);
          } catch (bulkErr) {
            console.error(`[Orange Supabase] Bulk delete exception on table ${table}:`, bulkErr);
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
      return { success: false, error: err?.message || 'فشل حذف مواقع Orange' };
    }
  }, []);

  const bulkImportOrangeRecords = useCallback(async (recordsToImport: OrangeRecord[]): Promise<{
    success: boolean;
    savedCount: number;
    insertedCount: number;
    updatedCount: number;
    failedCount: number;
    errors: string[];
    error?: string;
  }> => {
    try {
      const current = loadStoredOrangeRecords();
      const recordMap = new Map<string, OrangeRecord>();
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
        const rawCode = rec[' Site code'] || rec['Site code'] || rec['site code'] || (rec as any).site_code;
        const code = String(rawCode || '').trim().toUpperCase();
        if (!code) continue;

        const isExisting = recordMap.has(code);
        const existing = recordMap.get(code);
        const finalRec: OrangeRecord = isExisting
          ? { ...existing, ...rec, _updatedAt: now }
          : { ...rec, _createdAt: now, _updatedAt: now };

        recordMap.set(code, finalRec);

        // Standardized Supabase payload matching database schema
        finalRec.company = 'Orange';
        const payload: any = {
          site_code: code,
          'site code': code,
          'Site Status': finalRec['التصنيف (مدني)'] || finalRec['التصنيف'] || 'جاري',
          data: finalRec,
          updated_at: now,
        };
        if (finalRec._id && isUUID(finalRec._id)) {
          payload.id = finalRec._id;
        }

        clientLoop: for (const client of supabaseClients) {
          for (const table of ORANGE_TABLE_CANDIDATES) {
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
              console.warn(`[Orange Supabase] Error saving row ${code} to ${table}:`, err);
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
      saveStoredOrangeRecords(merged);
      setOrangeRecords(merged);

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

  // Convert Orange records to SiteRecord format
  const orangeSites = orangeRecords.map((r, i) => mapOrangeRecordToSiteRecord(r, i));

  return {
    orangeRecords,
    orangeSites,
    loading,
    error,
    refetchOrangeRecords,
    saveOrangeRecord,
    deleteOrangeRecord,
    deleteOrangeRecordsBulk,
    bulkImportOrangeRecords,
  };
}

