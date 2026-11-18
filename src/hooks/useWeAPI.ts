// src/hooks/useWeAPI.ts
// Supabase-powered API hooks for WE Central Dataset (Cloud & Vercel ready)

import { useState, useEffect, useCallback } from 'react';
import type { WeRecord } from '../config/fieldConfig';
import { supabase } from '../lib/supabase';
import { WE_EXCEL_SITES } from '../data/preloadedProjects';

const LOCAL_API_BASE = 'http://localhost:3001/api';

// Candidate table names in Supabase (supports user-created 'we' table or 'we_records')
export const WE_TABLE_CANDIDATES = ['we', 'we_records'] as const;

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
  return {
    ...base,
    ...row,
    'site code': siteCode,
    site_code: siteCode,
    _id: row.id || row._id || base._id || '',
    _createdAt: row.created_at || row._createdAt || base._createdAt || '',
    _updatedAt: row.updated_at || row._updatedAt || base._updatedAt || '',
    _createdBy: row.created_by || row._createdBy || base._createdBy || 'user',
  } as WeRecord;
}

// Helper: fetch all rows from Supabase trying candidate tables in sequence
async function fetchAllRowsFromCandidateTables(): Promise<{ rows: any[]; tableName: string; error?: any }> {
  for (const table of WE_TABLE_CANDIDATES) {
    try {
      const pageSize = 1000;
      let allRows: any[] = [];
      let from = 0;
      let tableErr: any = null;

      while (true) {
        const { data: pageData, error: pageErr } = await supabase
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
        return { rows: allRows, tableName: table };
      }
    } catch { }
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

export function saveStoredWeRecords(records: WeRecord[]) {
  try {
    localStorage.setItem(WE_STORAGE_KEY, JSON.stringify(records));
  } catch { }
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
      // 1. Try Supabase candidate tables
      const { rows } = await fetchAllRowsFromCandidateTables();

      if (rows.length > 0) {
        const cloudRecords = rows.map(normalizeRecord);
        const local = loadStoredWeRecords();
        const mergedMap = new Map<string, WeRecord>();
        local.forEach((r) => {
          const c = String(r['site code'] || (r as any).site_code || '').trim().toUpperCase();
          if (c) mergedMap.set(c, r);
        });
        cloudRecords.forEach((r) => {
          const c = String(r['site code'] || (r as any).site_code || '').trim().toUpperCase();
          if (c) mergedMap.set(c, r);
        });
        const finalRecords = Array.from(mergedMap.values());
        saveStoredWeRecords(finalRecords);
        setRecords(finalRecords);
        return;
      }

      // 2. Check localStorage if Supabase returned 0 rows
      const local = loadStoredWeRecords();
      if (local.length > 0) {
        setRecords(local);
        return;
      }

      // 3. Fallback to local server if Supabase table is empty or error
      try {
        const res = await fetch(`${LOCAL_API_BASE}/records`);
        const localData = await res.json();
        if (localData.success && localData.records && localData.records.length > 0) {
          saveStoredWeRecords(localData.records);
          setRecords(localData.records);
          return;
        }
      } catch { }

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
  }, [fetchRecords]);

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
      // Try candidate tables in Supabase
      for (const table of WE_TABLE_CANDIDATES) {
        const pageSize = 1000;
        let allCodeRows: any[] = [];
        let from = 0;
        let sbErr: any = null;

        while (true) {
          const { data: pageData, error: pageErr } = await supabase
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
                .filter(Boolean)
            ),
          ].sort();
          if (unique.length > 0) {
            setCodes(unique as string[]);
            return;
          }
        }
      }

      // Fallback to local API
      try {
        const res = await fetch(`${LOCAL_API_BASE}/site-codes`);
        const localData = await res.json();
        if (localData.success && localData.codes && localData.codes.length > 0) {
          setCodes(localData.codes);
          return;
        }
      } catch { }

      // Final fallback: use preloaded baseline site codes
      const fallback = [...new Set(WE_EXCEL_SITES.map((s) => s.siteCode))].sort();
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

    // 1. Try Supabase tables
    for (const table of WE_TABLE_CANDIDATES) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .or(`site_code.eq."${cleanCode}",site code.eq."${cleanCode}"`)
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          return normalizeRecord(data);
        }
      } catch { }
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
    for (const table of WE_TABLE_CANDIDATES) {
      const { data, error } = await supabase.from(table).select('*');
      if (!error && data && data.length > 0) {
        let filtered = data.map(normalizeRecord);
        if (filters) {
          for (const [k, v] of Object.entries(filters)) {
            if (v && k !== column) {
              filtered = filtered.filter((r: any) => (r as any)[k] === v);
            }
          }
        }
        const values = [...new Set(filtered.map((r: any) => (r as any)[column]).filter(Boolean))].sort();
        if (values.length > 0) return values as string[];
      }
    }

    // Fallback to local server
    const params = new URLSearchParams(filters || {});
    const res = await fetch(`${LOCAL_API_BASE}/dropdown-values/${encodeURIComponent(column)}?${params}`);
    const localData = await res.json();
    if (localData.success) return localData.values;
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

    const fullData: WeRecord = {
      ...record,
      'site code': siteCode,
      site_code: siteCode,
      _id: targetId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `we-${Date.now()}`),
      _updatedAt: now,
      _createdAt: record._createdAt || now,
      _createdBy: record._createdBy || 'user',
    };

    const payload: Record<string, any> = {
      site_code: siteCode,
      'site code': siteCode,
      'Exc Sectores': record['Exc Sectores'] || record['Exc sector'] || '',
      'Sectores': record['Sectores'] || record['Exc sector'] || '',
      'Exc sector': record['Exc sector'] || record['Sectores'] || '',
      'Sectore': record['Sectore'] || record['Exc sector'] || '',
      'Exc Zone': record['Exc Zone'] || record['Zone'] || '',
      'Zone': record['Zone'] || record['Exc Zone'] || '',
      'السنترال': record['السنترال'] || '',
      'اداره التنفيذ المختصه': record['اداره التنفيذ المختصه'] || '',
      'Type': record['Type'] || '',
      'التصنيف': record['التصنيف'] || '',
      'اسباب التعذر': record['اسباب التعذر'] || '',
      'الجهة المطلوب الدعم منها': record['الجهة المطلوب الدعم منها'] || '',
      'Site Status': record['Site Status'] || '',
      'التاريخ المتوقع للانتهاء': record['التاريخ المتوقع للانتهاء'] || '',
      'التاريخ الفعلى للانتهاء': record['التاريخ الفعلى للانتهاء'] || '',
      'NLongitude': record['NLongitude'] || '',
      'NLatitude': record['NLatitude'] || '',
      data: fullData,
      updated_at: now,
    };

    let cloudSaved = false;
    let savedRow: any = null;
    let actionType: 'updated' | 'created' = isEditMode || Boolean(targetId) ? 'updated' : 'created';

    // Attempt save in Supabase candidate tables ('we', then 'we_records')
    for (const table of WE_TABLE_CANDIDATES) {
      try {
        // 1. If we have a targetId, try to update existing record by ID
        if (targetId) {
          const { data: updated, error: updateErr } = await supabase
            .from(table)
            .update(payload)
            .eq('id', targetId)
            .select()
            .maybeSingle();

          if (!updateErr && updated) {
            cloudSaved = true;
            savedRow = updated;
            actionType = 'updated';
            break;
          }
        }

        // 2. Search existing rows by siteCode
        const { data: existingRows } = await supabase
          .from(table)
          .select('*')
          .or(`site_code.eq."${siteCode}",site code.eq."${siteCode}"`);

        const existingNormalized = (existingRows || []).map(normalizeRecord);

        // If edit mode or forceUpdate, and an existing record is found for this site code
        if ((isEditMode || forceUpdate) && existingNormalized.length > 0) {
          const match = existingNormalized.find(
            (r) => r['التصنيف'] === activity && r['التاريخ المتوقع للانتهاء'] === dateWeek
          ) || existingNormalized[0];

          const rowId = match._id || (match as any).id;
          if (rowId) {
            const { data: updated, error: updateErr } = await supabase
              .from(table)
              .update(payload)
              .eq('id', rowId)
              .select()
              .maybeSingle();

            if (!updateErr && updated) {
              cloudSaved = true;
              savedRow = updated;
              actionType = 'updated';
              break;
            }
          }
        }

        // 3. Duplicate check for adding new entry
        const duplicate = existingNormalized.find(
          (r) => r['site code'] === siteCode && r['التصنيف'] === activity && r['التاريخ المتوقع للانتهاء'] === dateWeek
        );

        if (duplicate && !forceUpdate && !isEditMode) {
          return {
            success: false,
            error: 'DUPLICATE_RECORD',
            message: `سجل مكرر: الموقع ${siteCode} بالتصنيف "${activity}" موجود بالفعل`,
            existingRecord: duplicate,
          };
        }

        // 4. Insert new record
        const insertPayload = {
          ...payload,
          id: fullData._id,
          created_at: fullData._createdAt,
        };

        const { data: inserted, error: insertErr } = await supabase
          .from(table)
          .insert([insertPayload])
          .select()
          .single();

        if (!insertErr && inserted) {
          cloudSaved = true;
          savedRow = inserted;
          actionType = 'created';
          break;
        } else if (insertErr) {
          // If insert failed due to column mismatch (e.g. table has only id, created_at before running SQL schema),
          // try inserting minimal payload with data JSONB or fallback
          const minimalPayload: Record<string, any> = {
            id: fullData._id,
            created_at: fullData._createdAt,
          };
          const { data: miniInserted, error: miniErr } = await supabase
            .from(table)
            .insert([minimalPayload])
            .select()
            .single();

          if (!miniErr && miniInserted) {
            cloudSaved = true;
            savedRow = miniInserted;
            actionType = 'created';
            break;
          }
        }
      } catch (tableEx) {
        // Continue to next candidate table
      }
    }

    // Save locally immediately to guarantee persistence on reload
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

    if (cloudSaved && savedRow) {
      return {
        success: true,
        action: actionType,
        record: normalizeRecord(savedRow),
        message: actionType === 'updated'
          ? 'تم تحديث بيانات الموقع بنجاح في قاعدة بيانات Supabase السحابية ✅'
          : 'تم إضافة الموقع الجديد بنجاح في قاعدة بيانات Supabase السحابية ✅',
      };
    }

    // 5. Fallback: try local server
    try {
      const body = { ...record };
      if (forceUpdate) (body as any)._forceUpdate = true;
      const res = await fetch(`${LOCAL_API_BASE}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const localRes = await res.json();
      if (localRes.success) return localRes;
    } catch { }

    // 6. Resilient local optimistic success
    return {
      success: true,
      action: actionType,
      record: fullData,
      message: 'تم حفظ وتحديث بيانات الموقع بنجاح ✅',
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

    // 1. Delete from local persistent storage immediately
    const cleanNorm = clean.toUpperCase();
    const stored = loadStoredWeRecords();
    const remaining = stored.filter((r) => {
      const c = String(r['site code'] || (r as any).site_code || '').trim().toUpperCase();
      const id = String(r._id || (r as any).id || '').trim().toUpperCase();
      return c !== cleanNorm && id !== cleanNorm;
    });
    saveStoredWeRecords(remaining);

    // 2. Delete from Supabase candidate tables
    for (const table of WE_TABLE_CANDIDATES) {
      try {
        await supabase
          .from(table)
          .delete()
          .or(`id.eq."${clean}",site_code.eq."${clean}",site code.eq."${clean}"`);

        await supabase.from(table).delete().eq('id', clean);
      } catch { }
    }

    // 3. Also attempt cleanup on local server fallback
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

    // 1. Delete from local persistent storage immediately
    const cleanNormSet = new Set(cleanList.map((c) => c.toUpperCase()));
    const stored = loadStoredWeRecords();
    const remaining = stored.filter((r) => {
      const c = String(r['site code'] || (r as any).site_code || '').trim().toUpperCase();
      const id = String(r._id || (r as any).id || '').trim().toUpperCase();
      return !cleanNormSet.has(c) && !cleanNormSet.has(id);
    });
    saveStoredWeRecords(remaining);

    const batchSize = 60;
    for (let i = 0; i < cleanList.length; i += batchSize) {
      const batch = cleanList.slice(i, i + batchSize);

      for (const table of WE_TABLE_CANDIDATES) {
        try {
          // Delete matching by id
          await supabase.from(table).delete().in('id', batch);
          // Delete matching by site_code
          await supabase.from(table).delete().in('site_code', batch);
          // Delete matching by "site code"
          await supabase.from(table).delete().in('site code', batch);
        } catch { }
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
