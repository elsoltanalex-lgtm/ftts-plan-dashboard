// src/hooks/useWeAPI.ts
// Supabase-powered API hooks for WE Central Dataset (Cloud & Vercel ready)

import { useState, useEffect, useCallback } from 'react';
import type { WeRecord } from '../config/fieldConfig';
import { isClassificationValue } from '../config/fieldConfig';
import { supabase, supabaseFallback, supabaseClients } from '../lib/supabase';
import { normalizeSectorName } from '../utils/sectorPermissions';
import { WE_EXCEL_SITES } from '../data/preloadedProjects';
import { WE_MASTER_RECORDS } from '../data/weSites';
import {
  fetchCloudDeletedCodes,
  addCloudDeletedCodes,
  removeCloudDeletedCode,
  getLocalDeletedCodes,
  normalizeSiteCode,
  SYNC_DELETED_CODES_ID,
  SYNC_DELETED_CODES_SITE_CODE,
} from '../utils/deletedSitesSync';

export const API_BASE = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? '/api'
  : 'http://localhost:3001/api';

const LOCAL_API_BASE = API_BASE;

// Candidate table names in Supabase (prioritizes active we_records table)
export const WE_TABLE_CANDIDATES = ['we_records', 'we'] as const;

export interface APIResponse<T> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
}

// ── Convert Supabase row to WeRecord ──
export function normalizeRecord(row: Record<string, any>): WeRecord {
  const base = (row.data && typeof row.data === 'object') ? row.data : {};
  const siteCode = base['site code'] || row['site code'] || row.site_code || row['Site code'] || '';
  const docUrl = base.documentUrl || row.documentUrl || base.attachmentUrl || row.attachmentUrl || '';
  const docName = base['المستند'] || row['المستند'] || (docUrl ? `Doc-${siteCode}.pdf` : '');
  const isSpecial = Boolean(
    base.specialTarget ??
    base.special_target ??
    base['سبيشال تارجت'] ??
    row.specialTarget ??
    row.special_target ??
    row['سبيشال تارجت'] ??
    false
  );

  const normExcSector = normalizeSectorName(base['Exc sector'] || row['Exc sector'] || base['قطاع التنفيذ'] || row['قطاع التنفيذ'] || '');
  const normSectores = normalizeSectorName(base['Sectores'] || row['Sectores'] || normExcSector);
  const normSectore = normalizeSectorName(base['Sectore'] || row['Sectore'] || normExcSector);
  const normPresidency = normalizeSectorName(base['رئاسة قطاعات التنفيذ'] || row['رئاسة قطاعات التنفيذ'] || base['Exc Sectores'] || row['Exc Sectores'] || '');

  return {
    ...row,
    ...base,
    ...(normExcSector ? { 'Exc sector': normExcSector, 'قطاع التنفيذ': normExcSector } : {}),
    ...(normSectores ? { 'Sectores': normSectores } : {}),
    ...(normSectore ? { 'Sectore': normSectore } : {}),
    ...(normPresidency ? { 'رئاسة قطاعات التنفيذ': normPresidency, 'Exc Sectores': normPresidency } : {}),
    specialTarget: isSpecial,
    special_target: isSpecial,
    'سبيشال تارجت': isSpecial,
    'site code': siteCode,
    site_code: siteCode,
    _id: row.id || row._id || base._id || '',
    _createdAt: row.created_at || row._createdAt || base._createdAt || '',
    _updatedAt: row.updated_at || row._updatedAt || base._updatedAt || '',
    _createdBy: row.created_by || row._createdBy || base._createdBy || 'user',
    documentUrl: docUrl,
    attachmentUrl: docUrl,
    'المستند': docName,
  } as WeRecord;
}

// Helper: fetch all rows from Supabase trying candidate tables and active clients in sequence
async function fetchAllRowsFromCandidateTables(): Promise<{ rows: any[]; tableName: string; error?: any }> {
  for (const client of supabaseClients) {
    for (const table of WE_TABLE_CANDIDATES) {
      try {
        const pageSize = 1000;
        let allRows: any[] = [];
        let from = 0;
        let tableErr: any = null;

        while (true) {
          const { data: pageData, error: pageErr } = await client
            .from(table)
            .select('*')
            .range(from, from + pageSize - 1)
            .order('created_at', { ascending: false });

          if (pageErr) {
            tableErr = pageErr;
            break;
          }
          if (!pageData || pageData.length === 0) break;
          allRows.push(...pageData);
          if (pageData.length < pageSize) break;
          from += pageSize;
        }

        if (!tableErr && allRows.length > 0) {
          const validRows = allRows.filter((r) => {
            const sc = String(r.site_code || r['site code'] || '').trim().toUpperCase();
            const id = String(r.id || '').trim().toUpperCase();
            return sc !== SYNC_DELETED_CODES_SITE_CODE && id !== SYNC_DELETED_CODES_ID;
          });
          return { rows: validRows, tableName: table };
        }
      } catch { }
    }
  }
  return { rows: [], tableName: 'we' };
}

const WE_STORAGE_KEY = 'we_records_live_v3';

export function loadStoredWeRecords(): WeRecord[] {
  try {
    const raw = localStorage.getItem(WE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeRecord);
      }
    }
  } catch { }
  return [];
}

function stripLargeInlineDataUrls(rec: WeRecord): WeRecord {
  const docUrl = typeof rec.documentUrl === 'string' ? rec.documentUrl : '';
  const attUrl = typeof (rec as any).attachmentUrl === 'string' ? (rec as any).attachmentUrl : '';
  const hasLargeDoc = docUrl.startsWith('data:') && docUrl.length > 32 * 1024;
  const hasLargeAtt = attUrl.startsWith('data:') && attUrl.length > 32 * 1024;
  if (!hasLargeDoc && !hasLargeAtt) return rec;
  const copy: WeRecord = { ...rec };
  if (hasLargeDoc) copy.documentUrl = '';
  if (hasLargeAtt) (copy as any).attachmentUrl = '';
  return copy;
}

export function saveStoredWeRecords(records: WeRecord[]) {
  try {
    // Strip large inline Base64 Data URLs from localStorage cache to prevent QuotaExceededError
    // while preserving all record fields, document filename ('المستند'), and HTTP(S) storage URLs.
    const compact = records.map(stripLargeInlineDataUrls);
    localStorage.setItem(WE_STORAGE_KEY, JSON.stringify(compact));
  } catch {
    try {
      // Secondary fallback: strip all data: URLs if browser quota is tight
      const minimal = records.map((r) => {
        const copy: WeRecord = { ...r };
        if (typeof copy.documentUrl === 'string' && copy.documentUrl.startsWith('data:')) copy.documentUrl = '';
        if (typeof (copy as any).attachmentUrl === 'string' && (copy as any).attachmentUrl.startsWith('data:')) (copy as any).attachmentUrl = '';
        return copy;
      });
      localStorage.setItem(WE_STORAGE_KEY, JSON.stringify(minimal));
    } catch { }
  }
}

// ── Fetch all records from Supabase ──
export function useWeRecords() {
  const [records, setRecords] = useState<WeRecord[]>(() => loadStoredWeRecords());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch authoritative cloud deleted codes first to guarantee multi-device sync
      const deletedCodes = await fetchCloudDeletedCodes();

      // 2. Fetch all live rows from Supabase
      const { rows } = await fetchAllRowsFromCandidateTables();

      if (rows.length > 0) {
        // Filter out deleted codes so deleted sites are never resurrected
        const cloudRecords = rows
          .map(normalizeRecord)
          .filter((r) => {
            const c = normalizeSiteCode(r['site code'] || (r as any).site_code);
            const id = normalizeSiteCode(r._id || (r as any).id);
            return !deletedCodes.has(c) && !deletedCodes.has(id);
          });

        saveStoredWeRecords(cloudRecords);
        setRecords(cloudRecords);
        return;
      }

      // 3. Fallback to localStorage if cloud returned 0 rows (offline / network error)
      const local = loadStoredWeRecords();
      if (local.length > 0) {
        const filteredLocal = local.filter((r) => {
          const c = normalizeSiteCode(r['site code'] || (r as any).site_code);
          const id = normalizeSiteCode(r._id || (r as any).id);
          return !deletedCodes.has(c) && !deletedCodes.has(id);
        });
        setRecords(filteredLocal);
        return;
      }

      // If both return 0 rows, initialize with empty (Dashboard handles preloaded fallback)
      setRecords([]);
    } catch (err: any) {
      setError(err?.message || 'خطأ في تحميل البيانات المركزية');
    } finally {
      setLoading(false);
    }
  }, []);

  // Instant local optimistic update for immediate dashboard/table reflection
  const updateOrAddRecordLocally = useCallback((newOrUpdated: WeRecord) => {
    setRecords((prev) => {
      const siteCode = String(newOrUpdated['site code'] || (newOrUpdated as any).site_code || '').trim().toUpperCase();
      const id = String(newOrUpdated._id || (newOrUpdated as any).id || '').trim().toUpperCase();

      const idx = prev.findIndex((r) => {
        const rId = String(r._id || (r as any).id || '').trim().toUpperCase();
        const rCode = String(r['site code'] || (r as any).site_code || '').trim().toUpperCase();
        return (id && rId === id) || (siteCode && rCode === siteCode);
      });

      let next: WeRecord[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = { ...next[idx], ...newOrUpdated };
      } else {
        next = [newOrUpdated, ...prev];
      }
      saveStoredWeRecords(next);
      return next;
    });
  }, []);

  const removeRecordLocally = useCallback((idOrCode: string) => {
    const clean = String(idOrCode || '').trim().toUpperCase();
    setRecords((prev) => {
      const next = prev.filter((r) => {
        const rId = String(r._id || (r as any).id || '').trim().toUpperCase();
        const rCode = String(r['site code'] || (r as any).site_code || '').trim().toUpperCase();
        return rId !== clean && rCode !== clean;
      });
      saveStoredWeRecords(next);
      return next;
    });
  }, []);

  const removeRecordsLocally = useCallback((idsOrCodes: string[]) => {
    const set = new Set(idsOrCodes.map((s) => String(s || '').trim().toUpperCase()));
    setRecords((prev) => {
      const next = prev.filter((r) => {
        const id = String(r._id || (r as any).id || '').trim().toUpperCase();
        const code = String(r['site code'] || (r as any).site_code || '').trim().toUpperCase();
        return !set.has(id) && !set.has(code);
      });
      saveStoredWeRecords(next);
      return next;
    });
  }, []);

  useEffect(() => {
    fetchRecords();

    // Supabase Realtime channel for instant cross-device and cross-user live updates
    const channel = supabaseFallback
      .channel('we_records_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'we_records' },
        async (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;

          // 1. Deleted codes metadata row change
          if (
            (newRow && (newRow.id === SYNC_DELETED_CODES_ID || newRow.site_code === SYNC_DELETED_CODES_SITE_CODE)) ||
            (oldRow && (oldRow.id === SYNC_DELETED_CODES_ID || oldRow.site_code === SYNC_DELETED_CODES_SITE_CODE))
          ) {
            const updatedDeleted = await fetchCloudDeletedCodes();
            setRecords((prev) =>
              prev.filter((r) => {
                const c = normalizeSiteCode(r['site code'] || (r as any).site_code);
                const id = normalizeSiteCode(r._id || (r as any).id);
                return !updatedDeleted.has(c) && !updatedDeleted.has(id);
              })
            );
            return;
          }

          // 2. Row DELETE event
          if (payload.eventType === 'DELETE') {
            const delCode = oldRow?.site_code || oldRow?.['site code'] || oldRow?.id;
            if (delCode) {
              removeRecordLocally(delCode);
            }
            return;
          }

          // 3. Row INSERT or UPDATE event
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            if (!newRow) return;
            const code = normalizeSiteCode(newRow.site_code || newRow['site code']);
            const currentDeleted = getLocalDeletedCodes();
            if (currentDeleted.has(code)) return; // Never show deleted site

            const norm = normalizeRecord(newRow);
            updateOrAddRecordLocally(norm);
          }
        }
      )
      .subscribe();

    // Force real-time refresh whenever mobile/desktop user switches back to the tab or unlocks screen
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchRecords();
      }
    };
    const handleFocus = () => {
      fetchRecords();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      supabaseFallback.removeChannel(channel);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchRecords, removeRecordLocally, updateOrAddRecordLocally]);

  return {
    records,
    setRecords,
    loading,
    error,
    refetch: fetchRecords,
    updateOrAddRecordLocally,
    removeRecordLocally,
    removeRecordsLocally,
  };
}

// ── Fetch all unique site codes ──
export function useWeSiteCodes() {
  const [codes, setCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshCodes = useCallback(async () => {
    try {
      const deletedCodes = await fetchCloudDeletedCodes();
      // Try candidate tables in Supabase across active clients
      for (const client of supabaseClients) {
        for (const table of WE_TABLE_CANDIDATES) {
          const pageSize = 1000;
          let allCodeRows: any[] = [];
          let from = 0;
          let sbErr: any = null;

          while (true) {
            const { data: pageData, error: pageErr } = await client
              .from(table)
              .select('*')
              .range(from, from + pageSize - 1);

            if (pageErr) {
              sbErr = pageErr;
              break;
            }
            if (!pageData || pageData.length === 0) break;
            allCodeRows.push(...pageData);
            if (pageData.length < pageSize) break;
            from += pageSize;
          }

          if (!sbErr && allCodeRows.length > 0) {
            const unique = [
              ...new Set(
                allCodeRows
                  .map((r: any) => r.site_code || r['site code'] || r.data?.['site code'])
                  .filter((c: any) => {
                    const norm = normalizeSiteCode(c);
                    return norm && norm !== SYNC_DELETED_CODES_SITE_CODE && !deletedCodes.has(norm);
                  })
              ),
            ].sort();
            if (unique.length > 0) {
              setCodes(unique as string[]);
              return;
            }
          }
        }
      }

      // Fallback to local API
      try {
        const res = await fetch(`${LOCAL_API_BASE}/site-codes`);
        const localData = await res.json();
        if (localData.success && localData.codes && localData.codes.length > 0) {
          const filtered = (localData.codes as string[]).filter(c => !deletedCodes.has(normalizeSiteCode(c)));
          setCodes(filtered);
          return;
        }
      } catch { }

      // Final fallback: use preloaded baseline site codes filtered by deletedCodes
      const fallback = [...new Set(WE_EXCEL_SITES.map((s) => s.siteCode))].filter(c => !deletedCodes.has(normalizeSiteCode(c))).sort();
      setCodes(fallback);
    } catch {
      const fallback = [...new Set(WE_EXCEL_SITES.map((s) => s.siteCode))].sort();
      setCodes(fallback);
    } finally {
      setLoading(false);
    }
  }, []);

  const addCodeLocally = useCallback((newCode: string) => {
    if (!newCode || !newCode.trim()) return;
    const clean = newCode.trim();
    setCodes((prev) => (prev.includes(clean) ? prev : [...prev, clean].sort()));
  }, []);

  useEffect(() => {
    refreshCodes();
  }, [refreshCodes]);

  return { codes, setCodes, loading, refetch: refreshCodes, addCodeLocally };
}

// ── Fetch single record by site code ──
export async function fetchSiteRecord(siteCode: string): Promise<WeRecord | null> {
  try {
    const cleanCode = siteCode.trim();

    // 1. Try Supabase tables across active clients
    for (const client of supabaseClients) {
      for (const table of WE_TABLE_CANDIDATES) {
        try {
          const { data, error } = await client
            .from(table)
            .select('*')
            .eq('site_code', cleanCode)
            .limit(1);

          if (!error && data && data.length > 0) {
            return normalizeRecord(data[0]);
          }

          // Retry by 'site code' column
          const retry = await client
            .from(table)
            .select('*')
            .eq('site code', cleanCode)
            .limit(1);

          if (!retry.error && retry.data && retry.data.length > 0) {
            return normalizeRecord(retry.data[0]);
          }
        } catch { }
      }
    }

    // 2. Fallback to local server
    try {
      const res = await fetch(`${LOCAL_API_BASE}/records/${encodeURIComponent(cleanCode)}`);
      const localData = await res.json();
      if (localData.success && localData.record) return localData.record;
    } catch { }

    // 3. Check preloaded sites as fallback
    const preloaded = WE_EXCEL_SITES.find(s => String(s?.siteCode || '').trim().toLowerCase() === cleanCode.toLowerCase());
    if (preloaded) {
      return {
        'site code': preloaded.siteCode,
        'Exc sector': preloaded.sector,
        'السنترال': preloaded.central,
        'Site Status': preloaded.status === 'تم التسليم' ? 'ON AIR' : preloaded.status,
        'التصنيف': preloaded.classification,
        'اداره التنفيذ المختصه': preloaded.competentAdmin,
        'Zone': preloaded.competentAdmin,
        'التاريخ المتوقع للانتهاء': preloaded.expectedDate,
        'اسباب التعذر': preloaded.obstacleReason,
        _id: preloaded.id,
      };
    }

    return null;
  } catch {
    return null;
  }
}

// ── Fetch dropdown distinct values ──
export async function fetchDropdownValues(
  column: string,
  filters?: Record<string, string>
): Promise<string[]> {
  try {
    for (const client of supabaseClients) {
      for (const table of WE_TABLE_CANDIDATES) {
        const { data, error } = await client.from(table).select('*').limit(2000);
        if (!error && data && data.length > 0) {
          let filtered = data.map(normalizeRecord);
          if (filters) {
            for (const [k, v] of Object.entries(filters)) {
              if (v && k !== column) {
                filtered = filtered.filter((r: any) => (r as any)[k] === v);
              }
            }
          }
          const rawVals = filtered
            .map((r: any) => (r as any)[column] || (column === 'Site Status' ? (r as any)['حالة الموقع'] : undefined))
            .filter(Boolean)
            .map((v: any) => String(v).replace(/\s+/g, ' ').trim())
            .filter((v: string) => {
              if (!v || v === '0' || v.toLowerCase() === column.toLowerCase()) return false;
              if (column === 'Site Status' || column === 'حالة الموقع') {
                if (isClassificationValue(v)) return false;
              }
              return true;
            });

          const uniqueVals = [...new Set(rawVals)].sort();
          if (uniqueVals.length > 0) return uniqueVals;
        }
      }
    }

    // Fallback to official WE Excel master records
    if (column === 'Site Status' || column === 'حالة الموقع') {
      const excelVals = [...new Set(
        WE_MASTER_RECORDS
          .map((r) => (r['Site Status'] || r['حالة الموقع'] || '').replace(/\s+/g, ' ').trim())
          .filter((v) => v && v !== '0' && v.toLowerCase() !== 'site status' && !isClassificationValue(v))
      )].sort();
      if (excelVals.length > 0) return excelVals;
    }

    // Fallback to local server
    const params = new URLSearchParams(filters || {});
    const res = await fetch(`${LOCAL_API_BASE}/dropdown-values/${encodeURIComponent(column)}?${params}`);
    const localData = await res.json();
    if (localData.success && Array.isArray(localData.values)) return localData.values;
    return [];
  } catch {
    return [];
  }
}

// ── Save or update a record ──
export async function saveRecord(
  record: WeRecord,
  forceUpdate = false,
  isEditMode = false
): Promise<{ success: boolean; action?: string; error?: string; message?: string; existingRecord?: WeRecord; record?: WeRecord }> {
  try {
    const siteCode = (record['site code'] || (record as any).site_code || '').trim();
    if (!siteCode) {
      return { success: false, error: 'كود الموقع مطلوب' };
    }

    const activity = record['التصنيف'] || '';
    const dateWeek = record['التاريخ المتوقع للانتهاء'] || '';
    const targetId = record._id || (record as any).id;
    const now = new Date().toISOString();

    const isSpecial = Boolean(
      (record as any).specialTarget ??
      (record as any).special_target ??
      (record as any)['specialTarget'] ??
      (record as any)['special_target'] ??
      record['سبيشال تارجت'] ??
      (record as any)['سبيشال_تارجت'] ??
      false
    );

    const docUrl = String(record.documentUrl || (record as any).attachmentUrl || '').trim();
    const isInlineDataUrl = docUrl.startsWith('data:');
    // Avoid duplicating large Base64 data URLs across two keys in the JSONB payload
    const safeAttachmentUrl = isInlineDataUrl ? '' : docUrl;
    const fullData: WeRecord = {
      ...record,
      documentUrl: docUrl,
      attachmentUrl: safeAttachmentUrl || docUrl,
      'المستند': record['المستند'] || (docUrl ? `Doc-${siteCode}.pdf` : ''),
      specialTarget: isSpecial,
      special_target: isSpecial,
      'سبيشال تارجت': isSpecial,
      'site code': siteCode,
      site_code: siteCode,
      _id: targetId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `we-${Date.now()}`),
      _updatedAt: now,
      _createdAt: record._createdAt || now,
      _createdBy: record._createdBy || 'user',
    };

    // Instant local optimistic update to guarantee persistence in we_records_live_v3 immediately
    const currentStored = loadStoredWeRecords();
    const cleanCode = (siteCode || '').trim().toUpperCase();
    const sIdx = currentStored.findIndex((r) => {
      const c = String(r['site code'] || (r as any).site_code || '').trim().toUpperCase();
      return c === cleanCode;
    });
    let nextStored: WeRecord[];
    if (sIdx >= 0) {
      nextStored = [...currentStored];
      nextStored[sIdx] = { ...nextStored[sIdx], ...fullData };
    } else {
      nextStored = [fullData, ...currentStored];
    }
    saveStoredWeRecords(nextStored);

    // Build payload for Supabase (avoid storing duplicate Base64 copy inside JSONB)
    const cloudData: WeRecord = isInlineDataUrl
      ? { ...fullData, attachmentUrl: '' }
      : fullData;

    const buildSafePayload = (dataObj: WeRecord): Record<string, any> => ({
      site_code: siteCode,
      'site code': siteCode,
      'Exc Sectores': record['Exc Sectores'] || record['Exc sector'] || '',
      'Sectores': record['Sectores'] || record['Exc sector'] || '',
      'Exc sector': record['Exc sector'] || record['Sectores'] || '',
      'Sectore': record['Sectore'] || record['Exc sector'] || '',
      'Exc Zone': record['Exc Zone'] || record['Zone'] || '',
      'Zone': record['Zone'] || record['Exc Zone'] || '',
      'Type': record['Type'] || '',
      'Site Status': record['Site Status'] || record['التصنيف'] || '',
      'NLongitude': record['NLongitude'] || '',
      'NLatitude': record['NLatitude'] || '',
      data: dataObj,
      updated_at: now,
    });

    // Candidate payloads: first with full attachment, then without inline Base64 data URL if payload was rejected
    const payloadVariants: Record<string, any>[] = [buildSafePayload(cloudData)];
    if (isInlineDataUrl) {
      payloadVariants.push(
        buildSafePayload({
          ...fullData,
          documentUrl: '',
          attachmentUrl: '',
        })
      );
    }

    let cloudSaved = false;
    let savedRow: any = null;
    let actionType: 'updated' | 'created' = isEditMode || Boolean(targetId) ? 'updated' : 'created';
    let lastCloudError: any = null;

    // Attempt save in Supabase candidate tables across active clients (Client 1 = supabaseFallback hosting live dataset)
    clientLoop: for (const safePayload of payloadVariants) {
      for (const client of supabaseClients) {
        for (const table of WE_TABLE_CANDIDATES) {
          try {
            // 1. Direct UPDATE in Supabase by site_code or 'site code'
            let updateQuery = client.from(table).update(safePayload).eq('site_code', siteCode);
            let { data: updated, error: updateErr } = await updateQuery.select();

            // Retry by 'site code' if primary site_code column didn't match
            if (updateErr || !updated || updated.length === 0) {
              const retryByQuoted = await client.from(table).update(safePayload).eq('site code', siteCode).select();
              if (!retryByQuoted.error && retryByQuoted.data && retryByQuoted.data.length > 0) {
                updated = retryByQuoted.data;
                updateErr = null;
              } else if (retryByQuoted.error) {
                lastCloudError = retryByQuoted.error;
              }
            }

            if (updateErr) {
              lastCloudError = updateErr;
              console.error(`[WE Supabase] Update error on table ${table}:`, updateErr);
            }

            if (!updateErr && updated && updated.length > 0) {
              cloudSaved = true;
              savedRow = updated[0];
              actionType = 'updated';
              console.log(`[WE Supabase] Successfully updated site ${siteCode} in ${table}`);
              break clientLoop;
            }

            // 2. Search existing rows by siteCode to verify if row exists
            const { data: existingRows, error: searchErr } = await client
              .from(table)
              .select('*')
              .eq('site_code', siteCode);

            if (searchErr) {
              lastCloudError = searchErr;
              console.error(`[WE Supabase] Search error on table ${table}:`, searchErr);
            }

            if (existingRows && existingRows.length > 0) {
              // Duplicate check for adding new entry
              if (!forceUpdate && !isEditMode) {
                const duplicate = existingRows[0];
                return {
                  success: false,
                  error: 'DUPLICATE_RECORD',
                  message: `سجل مكرر: الموقع ${siteCode} بالتصنيف "${activity}" موجود بالفعل`,
                  existingRecord: normalizeRecord(duplicate),
                };
              }

              const { data: updatedExisting, error: existingErr } = await client
                .from(table)
                .update(safePayload)
                .eq('site_code', siteCode)
                .select();

              if (!existingErr && updatedExisting && updatedExisting.length > 0) {
                cloudSaved = true;
                savedRow = updatedExisting[0];
                actionType = 'updated';
                console.log(`[WE Supabase] Successfully updated existing site ${siteCode} in ${table}`);
                break clientLoop;
              } else if (existingErr) {
                lastCloudError = existingErr;
                console.error(`[WE Supabase] Re-update error on table ${table}:`, existingErr);
              }
            }

            // 3. Insert new record
            const insertPayload: Record<string, any> = {
              ...safePayload,
              created_at: fullData._createdAt || now,
            };
            if (targetId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(targetId))) {
              insertPayload.id = targetId;
            }

            const { data: inserted, error: insertErr } = await client
              .from(table)
              .insert([insertPayload])
              .select();

            if (insertErr) {
              lastCloudError = insertErr;
              console.error(`[WE Supabase] Insert error on table ${table}:`, insertErr);
            }

            if (!insertErr && inserted && inserted.length > 0) {
              cloudSaved = true;
              savedRow = inserted[0];
              actionType = 'created';
              console.log(`[WE Supabase] Successfully inserted site ${siteCode} in ${table}`);
              break clientLoop;
            }
          } catch (tableEx: any) {
            lastCloudError = tableEx;
            console.error(`[WE Supabase] Exception saving site ${siteCode} to table ${table}:`, tableEx);
            // Continue to next candidate table / client / payload variant
          }
        }
      }
    }

    if (cloudSaved && savedRow) {
      // If site was previously in cloud deleted list, unmark it
      await removeCloudDeletedCode(siteCode);

      // Save locally immediately to guarantee persistence on reload
      const currentStored = loadStoredWeRecords();
      const cleanCode = (siteCode || '').trim().toUpperCase();
      const sIdx = currentStored.findIndex((r) => {
        const c = String(r['site code'] || (r as any).site_code || '').trim().toUpperCase();
        return c === cleanCode;
      });
      let nextStored: WeRecord[];
      const normalizedRow = normalizeRecord(savedRow);
      if (sIdx >= 0) {
        nextStored = [...currentStored];
        nextStored[sIdx] = { ...nextStored[sIdx], ...normalizedRow };
      } else {
        nextStored = [normalizedRow, ...currentStored];
      }
      saveStoredWeRecords(nextStored);

      return {
        success: true,
        action: actionType,
        record: normalizedRow,
        message: actionType === 'updated'
          ? 'تم تحديث بيانات الموقع والتصنيف بنجاح في قاعدة بيانات Supabase السحابية ✅'
          : 'تم إضافة الموقع الجديد بنجاح في قاعدة بيانات Supabase السحابية ✅',
      };
    }

    // Return explicit error if cloud save failed
    console.error(`[WE Supabase] All clients failed to save site ${siteCode}:`, lastCloudError);
    return {
      success: false,
      error: `فشل حفظ وتحديث السجل لموقع ${siteCode} في قاعدة بيانات Supabase السحابية: ${lastCloudError?.message || 'يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً.'}`,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'خطأ أثناء حفظ السجل' };
  }
}

// ── Export all data as CSV (Instant client-side download) ──
export async function exportToCSV() {
  try {
    let records: WeRecord[] = [];
    const { rows } = await fetchAllRowsFromCandidateTables();

    if (rows.length > 0) {
      records = rows.map(normalizeRecord);
    } else {
      const res = await fetch(`${LOCAL_API_BASE}/records`);
      const localData = await res.json();
      if (localData.success && localData.records) {
        records = localData.records;
      }
    }

    if (records.length === 0) {
      alert('لا توجد سجلات لتصديرها');
      return;
    }

    const excludeKeys = ['id', '_id', 'created_at', '_createdAt', 'updated_at', '_updatedAt', 'created_by', '_createdBy', 'data', 'site_code'];
    const columns = Object.keys(records[0]).filter((k) => !excludeKeys.includes(k));

    const csvRows = [
      columns.join(','),
      ...records.map((r) =>
        columns
          .map((col) => {
            const val = (r as any)[col] !== undefined && (r as any)[col] !== null ? String((r as any)[col]) : '';
            return `"${val.replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ];

    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `WE_Master_Database_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export failed:', err);
    window.open(`${LOCAL_API_BASE}/export/csv`, '_blank');
  }
}

// ── Export Clean / Filtered CSV with selected columns ──
export function exportCleanCSV(
  records: WeRecord[],
  selectedColumns: string[],
  filename = 'WE_Clean_Export'
) {
  if (records.length === 0) {
    alert('لا توجد سجلات لتصديرها');
    return;
  }

  const columns = selectedColumns.length > 0
    ? selectedColumns
    : Object.keys(records[0]).filter(k => !['id', '_id', 'created_at', '_createdAt', 'updated_at', '_updatedAt', 'created_by', '_createdBy', 'data', 'site_code'].includes(k));

  const csvRows = [
    columns.join(','),
    ...records.map(r =>
      columns.map(col => {
        const val = (r as any)[col] !== undefined && (r as any)[col] !== null ? String((r as any)[col]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',')
    )
  ];

  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Delete a single record (by UUID id or siteCode) ──
export async function deleteRecord(idOrCode: string): Promise<{ success: boolean; error?: string }> {
  try {
    const clean = (idOrCode || '').trim();
    if (!clean) return { success: false, error: 'معرف أو كود الموقع مطلوب' };

    const cleanNorm = clean.toUpperCase();

    // 1. Delete from local persistent storage immediately
    const stored = loadStoredWeRecords();
    const remaining = stored.filter((r) => {
      const c = String(r['site code'] || (r as any).site_code || '').trim().toUpperCase();
      const id = String(r._id || (r as any).id || '').trim().toUpperCase();
      return c !== cleanNorm && id !== cleanNorm && c !== clean && id !== clean;
    });
    saveStoredWeRecords(remaining);

    // 2. Persist to authoritative Cloud Deleted Codes in Supabase for cross-device sync
    await addCloudDeletedCodes([cleanNorm, clean]);

    // 3. Delete from all active Supabase clients and candidate tables
    let anySuccess = false;
    for (const client of supabaseClients) {
      for (const table of WE_TABLE_CANDIDATES) {
        try {
          const { error: err1 } = await client.from(table).delete().eq('site_code', cleanNorm);
          const { error: err2 } = await client.from(table).delete().eq('site code', cleanNorm);
          const { error: err3 } = await client.from(table).delete().eq('id', clean);
          if (!err1 || !err2 || !err3) {
            anySuccess = true;
          } else {
            console.error(`[WE Supabase] Delete error on ${table}:`, err1 || err2 || err3);
          }
        } catch (delEx) {
          console.error(`[WE Supabase] Delete exception on ${table}:`, delEx);
        }
      }
    }

    // 3. Update memory/browser deleted cache
    if (typeof window !== 'undefined') {
      try {
        const key = 'we_deleted_codes_cache';
        const raw = localStorage.getItem(key);
        const set = new Set(raw ? JSON.parse(raw) : []);
        set.add(cleanNorm);
        set.add(clean);
        const arr = Array.from(set);
        localStorage.setItem(key, JSON.stringify(arr));
        localStorage.setItem('ftts_deleted_site_codes_v3', JSON.stringify(arr));
      } catch { }
    }

    // 4. Also attempt cleanup on local server fallback
    try {
      await fetch(`${LOCAL_API_BASE}/records/${encodeURIComponent(clean)}`, { method: 'DELETE' });
    } catch { }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'فشل في حذف السجل' };
  }
}

// ── Bulk delete multiple records from Supabase (by ID or Site Code) ──
export async function deleteRecordsBulk(idsOrCodes: string[]): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    if (!idsOrCodes || idsOrCodes.length === 0) return { success: true, count: 0 };
    const cleanList = idsOrCodes.map((s) => String(s || '').trim()).filter(Boolean);
    if (cleanList.length === 0) return { success: true, count: 0 };

    const cleanNormList = cleanList.map((c) => c.toUpperCase());
    const cleanNormSet = new Set(cleanNormList);
    cleanList.forEach((c) => cleanNormSet.add(c));

    // 1. Delete from local persistent storage immediately
    const stored = loadStoredWeRecords();
    const remaining = stored.filter((r) => {
      const c = String(r['site code'] || (r as any).site_code || '').trim().toUpperCase();
      const id = String(r._id || (r as any).id || '').trim().toUpperCase();
      return !cleanNormSet.has(c) && !cleanNormSet.has(id);
    });
    saveStoredWeRecords(remaining);

    const combinedList = Array.from(new Set([...cleanList, ...cleanNormList]));

    // 2. Persist to authoritative Cloud Deleted Codes in Supabase for cross-device sync
    await addCloudDeletedCodes(combinedList);

    // 3. Delete across all active Supabase clients in batches
    const batchSize = 50;

    for (let i = 0; i < combinedList.length; i += batchSize) {
      const batch = combinedList.slice(i, i + batchSize);

      for (const client of supabaseClients) {
        for (const table of WE_TABLE_CANDIDATES) {
          try {
            await client.from(table).delete().in('site_code', batch);
            await client.from(table).delete().in('site code', batch);
            await client.from(table).delete().in('Site code', batch);
            await client.from(table).delete().in('id', batch);
          } catch { }
        }
      }

      // Also call local server if running
      try {
        await fetch(`${LOCAL_API_BASE}/records/bulk-delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: batch }),
        });
      } catch { }
    }

    // 3. Update memory/browser deleted cache
    if (typeof window !== 'undefined') {
      try {
        const key = 'we_deleted_codes_cache';
        const raw = localStorage.getItem(key);
        const set = new Set(raw ? JSON.parse(raw) : []);
        combinedList.forEach((c) => set.add(c));
        const arr = Array.from(set);
        localStorage.setItem(key, JSON.stringify(arr));
        localStorage.setItem('ftts_deleted_site_codes_v3', JSON.stringify(arr));
      } catch { }
    }

    return { success: true, count: cleanList.length };
  } catch (err: any) {
    return { success: false, error: err?.message || 'فشل في حذف السجلات من قاعدة بيانات Supabase' };
  }
}

// ── Fetch all records for dashboard compatibility ──
export async function fetchAllRecordsForDashboard(): Promise<WeRecord[]> {
  try {
    const { rows } = await fetchAllRowsFromCandidateTables();
    if (rows.length > 0) {
      return rows.map(normalizeRecord);
    }
    const res = await fetch(`${LOCAL_API_BASE}/records`);
    const localData = await res.json();
    if (localData.success && localData.records) return localData.records;
    return [];
  } catch {
    return [];
  }
}

// ── Helper: Seed Supabase from baseline ──
export async function seedSupabaseFromBaseline(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const batchSize = 100;
    let saved = 0;
    const now = new Date().toISOString();

    for (let i = 0; i < WE_EXCEL_SITES.length; i += batchSize) {
      const slice = WE_EXCEL_SITES.slice(i, i + batchSize);
      const rows = slice.map((s) => ({
        site_code: s.siteCode,
        'site code': s.siteCode,
        'Exc sector': s.sector,
        'Sectores': s.sector,
        'السنترال': s.central,
        'اداره التنفيذ المختصه': s.competentAdmin,
        'Zone': s.competentAdmin,
        'Site Status': s.status === 'تم التسليم' ? 'ON AIR' : s.status,
        'التصنيف': s.classification,
        'التاريخ المتوقع للانتهاء': s.expectedDate,
        'اسباب التعذر': s.obstacleReason,
        created_at: now,
        updated_at: now,
        data: {
          'site code': s.siteCode,
          'Exc sector': s.sector,
          'السنترال': s.central,
          'Site Status': s.status,
          'التصنيف': s.classification,
          'اداره التنفيذ المختصه': s.competentAdmin,
          'التاريخ المتوقع للانتهاء': s.expectedDate,
          'اسباب التعذر': s.obstacleReason,
        },
      }));

      for (const table of WE_TABLE_CANDIDATES) {
        const { error } = await supabase.from(table).upsert(rows, { onConflict: 'site_code' });
        if (!error) {
          saved += rows.length;
          break;
        }
      }
    }

    return { success: saved > 0, count: saved };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message };
  }
}
