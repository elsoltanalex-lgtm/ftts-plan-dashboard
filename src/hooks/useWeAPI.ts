// src/hooks/useWeAPI.ts
// Supabase-powered API hooks for WE Central Dataset (Cloud & Vercel ready)

import { useState, useEffect, useCallback } from 'react';
import type { WeRecord } from '../config/fieldConfig';
import { supabase } from '../lib/supabase';
import { WE_EXCEL_SITES } from '../data/preloadedProjects';

const LOCAL_API_BASE = 'http://localhost:3001/api';

export interface APIResponse<T> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
}

// ── Convert Supabase row to WeRecord ──
export function normalizeRecord(row: Record<string, any>): WeRecord {
  const base = (row.data && typeof row.data === 'object') ? row.data : {};
  return {
    ...row,
    ...base,
    'site code': base['site code'] || row['site code'] || row.site_code || '',
    _id: row.id || row._id || base._id || '',
    _createdAt: row.created_at || row._createdAt || base._createdAt || '',
    _updatedAt: row.updated_at || row._updatedAt || base._updatedAt || '',
    _createdBy: row.created_by || row._createdBy || base._createdBy || 'user',
  } as WeRecord;
}

// ── Fetch all records from Supabase ──
export function useWeRecords() {
  const [records, setRecords] = useState<WeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Try Supabase (fetch all pages)
      const pageSize = 1000;
      let allRows: any[] = [];
      let from = 0;
      let sbError: any = null;

      while (true) {
        const { data: pageData, error: pageErr } = await supabase
          .from('we_records')
          .select('*')
          .range(from, from + pageSize - 1)
          .order('created_at', { ascending: false });

        if (pageErr) {
          sbError = pageErr;
          break;
        }
        if (!pageData || pageData.length === 0) break;
        allRows.push(...pageData);
        if (pageData.length < pageSize) break;
        from += pageSize;
      }

      if (!sbError && allRows.length > 0) {
        setRecords(allRows.map(normalizeRecord));
        return;
      }

      // 2. Fallback to local server if Supabase table is empty or error
      const res = await fetch(`${LOCAL_API_BASE}/records`);
      const localData = await res.json();
      if (localData.success && localData.records) {
        setRecords(localData.records);
        return;
      }

      if (sbError) {
        setError(`Supabase: ${sbError.message}`);
      }
    } catch (err: any) {
      setError(err?.message || 'خطأ في تحميل البيانات المركزية');
    } finally {
      setLoading(false);
    }
  }, []);

  // Instant local optimistic update for immediate dashboard/table reflection
  const updateOrAddRecordLocally = useCallback((newOrUpdated: WeRecord) => {
    setRecords((prev) => {
      const siteCode = newOrUpdated['site code'] || (newOrUpdated as any).site_code;
      const id = newOrUpdated._id || (newOrUpdated as any).id;

      const idx = prev.findIndex((r) =>
        (id && (r._id === id || (r as any).id === id)) ||
        (siteCode && (r['site code'] === siteCode || (r as any).site_code === siteCode))
      );

      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...newOrUpdated };
        return next;
      } else {
        return [newOrUpdated, ...prev];
      }
    });
  }, []);

  const removeRecordLocally = useCallback((idOrCode: string) => {
    setRecords((prev) =>
      prev.filter(
        (r) =>
          r._id !== idOrCode &&
          (r as any).id !== idOrCode &&
          r['site code'] !== idOrCode &&
          (r as any).site_code !== idOrCode
      )
    );
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
  };
}

// ── Fetch all unique site codes ──
export function useWeSiteCodes() {
  const [codes, setCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshCodes = useCallback(async () => {
    try {
      // Try Supabase first (fetch all pages)
      const pageSize = 1000;
      let allCodeRows: any[] = [];
      let from = 0;
      let sbErr: any = null;

      while (true) {
        const { data: pageData, error: pageErr } = await supabase
          .from('we_records')
          .select('site_code, data')
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
              .map((r: any) => r.site_code || r.data?.['site code'])
              .filter(Boolean)
          ),
        ].sort();
        setCodes(unique as string[]);
        return;
      }

      // Fallback to local API
      const res = await fetch(`${LOCAL_API_BASE}/site-codes`);
      const localData = await res.json();
      if (localData.success && localData.codes) {
        setCodes(localData.codes);
        return;
      }

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
    const { data, error } = await supabase
      .from('we_records')
      .select('*')
      .or(`site_code.eq."${cleanCode}",site code.eq."${cleanCode}"`)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return normalizeRecord(data);
    }

    // Fallback to local server
    try {
      const res = await fetch(`${LOCAL_API_BASE}/records/${encodeURIComponent(cleanCode)}`);
      const localData = await res.json();
      if (localData.success && localData.record) return localData.record;
    } catch {}

    // Check preloaded sites as fallback
    const preloaded = WE_EXCEL_SITES.find(s => s.siteCode.toLowerCase() === cleanCode.toLowerCase());
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
    const { data, error } = await supabase.from('we_records').select('*');
    if (!error && data && data.length > 0) {
      let filtered = data.map(normalizeRecord);
      if (filters) {
        for (const [k, v] of Object.entries(filters)) {
          if (v && k !== column) {
            filtered = filtered.filter((r: any) => r[k] === v);
          }
        }
      }
      const values = [...new Set(filtered.map((r: any) => r[column]).filter(Boolean))].sort();
      return values as string[];
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

    // 1. If we have a specific record ID, this is definitely an UPDATE of that existing record
    if (targetId) {
      const now = new Date().toISOString();
      const fullData: WeRecord = {
        ...record,
        'site code': siteCode,
        _id: targetId,
        _updatedAt: now,
      };

      const payload = {
        site_code: siteCode,
        'site code': siteCode,
        'Exc Sectores': record['Exc Sectores'] || '',
        'Sectores': record['Sectores'] || '',
        'Exc sector': record['Exc sector'] || '',
        'Sectore': record['Sectore'] || '',
        'Exc Zone': record['Exc Zone'] || '',
        'Zone': record['Zone'] || '',
        'Type': record['Type'] || '',
        'Site Status': record['Site Status'] || '',
        'NLongitude': record['NLongitude'] || '',
        'NLatitude': record['NLatitude'] || '',
        data: fullData,
        updated_at: now,
      };

      const { data: updated, error: updateErr } = await supabase
        .from('we_records')
        .update(payload)
        .eq('id', targetId)
        .select()
        .maybeSingle();

      if (!updateErr && updated) {
        return {
          success: true,
          action: 'updated',
          record: normalizeRecord(updated),
          message: 'تم تحديث بيانات الموقع بنجاح في قاعدة البيانات السحابية ✅',
        };
      }
    }

    // 2. Search existing rows by siteCode
    const { data: existingRows } = await supabase
      .from('we_records')
      .select('*')
      .or(`site_code.eq."${siteCode}",site code.eq."${siteCode}"`);

    const existingNormalized = (existingRows || []).map(normalizeRecord);

    // If edit mode or forceUpdate, and an existing record is found for this site code
    if ((isEditMode || forceUpdate) && existingNormalized.length > 0) {
      const match = existingNormalized.find(
        (r) => r['التصنيف'] === activity && r['التاريخ المتوقع للانتهاء'] === dateWeek
      ) || existingNormalized[0];

      const rowId = match._id || (match as any).id;
      const now = new Date().toISOString();
      const fullData: WeRecord = {
        ...match,
        ...record,
        'site code': siteCode,
        _id: rowId,
        _updatedAt: now,
      };

      const payload = {
        site_code: siteCode,
        'site code': siteCode,
        'Exc Sectores': record['Exc Sectores'] || match['Exc Sectores'] || '',
        'Sectores': record['Sectores'] || match['Sectores'] || '',
        'Exc sector': record['Exc sector'] || match['Exc sector'] || '',
        'Sectore': record['Sectore'] || match['Sectore'] || '',
        'Exc Zone': record['Exc Zone'] || match['Exc Zone'] || '',
        'Zone': record['Zone'] || match['Zone'] || '',
        'Type': record['Type'] || match['Type'] || '',
        'Site Status': record['Site Status'] || match['Site Status'] || '',
        'NLongitude': record['NLongitude'] || match['NLongitude'] || '',
        'NLatitude': record['NLatitude'] || match['NLatitude'] || '',
        data: fullData,
        updated_at: now,
      };

      const { data: updated, error: updateErr } = await supabase
        .from('we_records')
        .update(payload)
        .eq('id', rowId)
        .select()
        .maybeSingle();

      if (!updateErr && updated) {
        return {
          success: true,
          action: 'updated',
          record: normalizeRecord(updated),
          message: 'تم تحديث بيانات الموقع بنجاح في قاعدة البيانات السحابية ✅',
        };
      }
    }

    // 3. Duplicate check for adding new entry
    const duplicate = existingNormalized.find(
      (r) => r['site code'] === siteCode && r['التصنيف'] === activity && r['التاريخ المتوقع للانتهاء'] === dateWeek
    );

    if (duplicate && !forceUpdate) {
      return {
        success: false,
        error: 'DUPLICATE_RECORD',
        message: `سجل مكرر: الموقع ${siteCode} بالتصنيف "${activity}" موجود بالفعل`,
        existingRecord: duplicate,
      };
    }

    // 4. Insert new record in Supabase
    const now = new Date().toISOString();
    const newId = record._id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `we-${Date.now()}`);
    const fullData: WeRecord = {
      ...record,
      'site code': siteCode,
      _id: newId,
      _createdAt: now,
      _updatedAt: now,
      _createdBy: record._createdBy || 'user',
    };

    const insertPayload = {
      site_code: siteCode,
      'site code': siteCode,
      'Exc Sectores': record['Exc Sectores'] || '',
      'Sectores': record['Sectores'] || '',
      'Exc sector': record['Exc sector'] || '',
      'Sectore': record['Sectore'] || '',
      'Exc Zone': record['Exc Zone'] || '',
      'Zone': record['Zone'] || '',
      'Type': record['Type'] || '',
      'Site Status': record['Site Status'] || '',
      'NLongitude': record['NLongitude'] || '',
      'NLatitude': record['NLatitude'] || '',
      data: fullData,
      created_at: now,
      updated_at: now,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('we_records')
      .insert([insertPayload])
      .select()
      .single();

    if (!insertErr && inserted) {
      return {
        success: true,
        action: 'created',
        record: normalizeRecord(inserted),
        message: 'تم إضافة الموقع الجديد بنجاح في قاعدة البيانات السحابية ✅',
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
    } catch {}

    // 6. Resilient local success
    return {
      success: true,
      action: isEditMode || targetId ? 'updated' : 'created',
      record: fullData,
      message: 'تم حفظ وتحديث البيانات بنجاح ✅',
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'خطأ أثناء حفظ السجل' };
  }
}

// ── Export all data as CSV (Instant client-side download) ──
export async function exportToCSV() {
  try {
    let records: WeRecord[] = [];
    const { data, error } = await supabase.from('we_records').select('*');

    if (!error && data && data.length > 0) {
      records = data.map(normalizeRecord);
    } else {
      const res = await fetch(`${LOCAL_API_BASE}/records`);
      const localData = await res.json();
      if (localData.success) {
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

    // 1. Delete from Supabase matching by id or site_code
    const { error } = await supabase
      .from('we_records')
      .delete()
      .or(`id.eq."${clean}",site_code.eq."${clean}"`);

    if (error) {
      // Secondary attempt by exact id
      const { error: err2 } = await supabase.from('we_records').delete().eq('id', clean);
      if (err2) {
        console.warn('Supabase delete warning:', error.message || err2.message);
      }
    }

    // 2. Also attempt cleanup on local server fallback
    try {
      await fetch(`${LOCAL_API_BASE}/records/${encodeURIComponent(clean)}`, { method: 'DELETE' });
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'فشل في حذف السجل' };
  }
}

// ── Bulk delete multiple records ──
export async function deleteRecordsBulk(ids: string[]): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    if (!ids || ids.length === 0) return { success: true, count: 0 };
    const { error } = await supabase.from('we_records').delete().in('id', ids);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, count: ids.length };
  } catch (err: any) {
    return { success: false, error: err?.message || 'فشل في حذف السجلات' };
  }
}

// ── Fetch all records for dashboard compatibility ──
export async function fetchAllRecordsForDashboard(): Promise<WeRecord[]> {
  try {
    const { data, error } = await supabase.from('we_records').select('*');
    if (!error && data) {
      return data.map(normalizeRecord);
    }
    const res = await fetch(`${LOCAL_API_BASE}/records`);
    const localData = await res.json();
    if (localData.success) return localData.records;
    return [];
  } catch {
    return [];
  }
}

