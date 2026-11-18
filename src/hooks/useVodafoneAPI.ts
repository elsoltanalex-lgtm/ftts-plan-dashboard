// src/hooks/useVodafoneAPI.ts
// Live state & persistence API hook for Vodafone FTTS dataset (with Supabase sync & localStorage fallback)

import { useState, useCallback, useEffect } from 'react';
import type { SiteRecord } from '../types/dashboard';
import type { VodafoneRecord } from '../types/vodafone';
import { VODAFONE_RAW_RECORDS } from '../data/vodafoneSites';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'ftts_vodafone_records_v1';
const VODAFONE_TABLE_CANDIDATES = ['vodafone_records', 'vodafone'];

export function mapVodafoneRecordToSiteRecord(r: VodafoneRecord, index = 0): SiteRecord {
  const rawCode = r[' Site code'] || r['Site code'] || r['site code'] || r.site_code || `VDF-${index + 1}`;
  const siteCode = String(rawCode).trim();
  const rawTasneef = String(r['التصنيف'] || '').trim();

  let status = 'جاري المعاينة';
  let executionCategory: 'Completed' | 'In Progress' | 'Blocked / On Hold' | 'Planned' = 'In Progress';
  let progressPercent = 25;

  if (rawTasneef === 'تم التسليم' || rawTasneef.includes('تسليم')) {
    status = 'تم الانتهاء';
    executionCategory = 'Completed';
    progressPercent = 100;
  } else if (rawTasneef.includes('تصاريح')) {
    status = 'جاري تصاريح';
    executionCategory = 'In Progress';
    progressPercent = 40;
  } else if (rawTasneef.includes('معوق')) {
    status = 'معوقات';
    executionCategory = 'Blocked / On Hold';
    progressPercent = 30;
  } else if (rawTasneef.includes('متعذر') || rawTasneef.includes('تعذر')) {
    status = 'متعذر';
    executionCategory = 'Blocked / On Hold';
    progressPercent = 15;
  } else if (rawTasneef === 'جاري العمل مدني' || rawTasneef.includes('مدن')) {
    status = 'جاري مدني';
    executionCategory = 'In Progress';
    progressPercent = 60;
  } else if (rawTasneef.includes('كهرب')) {
    status = 'جاري كهربي';
    executionCategory = 'In Progress';
    progressPercent = 75;
  } else if (rawTasneef.includes('معاين')) {
    status = 'جاري المعاينة';
    executionCategory = 'Planned';
    progressPercent = 20;
  }

  const central = String(r['سنترال الربط'] || 'سنترال رئيسي').trim();
  const sector = String(r['رئاسة قطاعات التنفيذ'] || 'قطاع عام').trim();
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
    executionSector: String(r['قطاع التنفيذ'] || '').trim(),
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
    rawRecord: r,
  };
}

let inMemoryVodafoneRecords: VodafoneRecord[] = [];

function loadStoredVodafoneRecords(): VodafoneRecord[] {
  if (inMemoryVodafoneRecords.length > 0) return inMemoryVodafoneRecords;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryVodafoneRecords = parsed;
        return inMemoryVodafoneRecords;
      }
    }
  } catch {
    // fallback
  }
  inMemoryVodafoneRecords = [...VODAFONE_RAW_RECORDS];
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
      // 1. Attempt to fetch live from Supabase tables
      for (const table of VODAFONE_TABLE_CANDIDATES) {
        try {
          const { data, error: sbError } = await supabase.from(table).select('*').limit(5000);
          if (!sbError && data && data.length > 0) {
            const baseMap = new Map<string, VodafoneRecord>();
            loadStoredVodafoneRecords().forEach((r) => {
              const c = String(r[' Site code'] || r['Site code'] || r['site code'] || '').trim().toUpperCase();
              if (c) baseMap.set(c, r);
            });
            data.forEach((row: any) => {
              const rowData = row.data && typeof row.data === 'object' ? row.data : row;
              const code = String(
                row.site_code || row['site code'] || row['Site code'] || rowData['Site code'] || rowData['site code'] || row.id || ''
              ).trim().toUpperCase();
              if (code) {
                const prev = baseMap.get(code) || {};
                baseMap.set(code, { ...prev, ...rowData, ...row, 'Site code': code, 'site code': code });
              }
            });
            const merged = Array.from(baseMap.values());
            saveStoredVodafoneRecords(merged);
            setVodafoneRecords(merged);
            return;
          }
        } catch { }
      }

      const records = loadStoredVodafoneRecords();
      setVodafoneRecords([...records]);
    } catch (err: any) {
      setError(err?.message || 'Error fetching Vodafone records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetchVodafoneRecords();
  }, [refetchVodafoneRecords]);

  const saveVodafoneRecord = useCallback(async (record: VodafoneRecord): Promise<{ success: boolean; error?: string }> => {
    try {
      const rawCode = record[' Site code'] || record['Site code'] || record['site code'] || record.site_code;
      const code = String(rawCode || '').trim().toUpperCase();
      if (!code) return { success: false, error: 'كود الموقع مطلوب' };

      const current = loadStoredVodafoneRecords();
      const idx = current.findIndex((r) => {
        const c = String(r[' Site code'] || r['Site code'] || r['site code'] || '').trim().toUpperCase();
        return c === code;
      });

      let updated: VodafoneRecord[];
      const now = new Date().toISOString();
      const enriched: VodafoneRecord = {
        ...record,
        'Site code': code,
        'site code': code,
        _updatedAt: now,
      };

      if (idx >= 0) {
        updated = [...current];
        updated[idx] = { ...updated[idx], ...enriched };
      } else {
        enriched._createdAt = now;
        updated = [enriched, ...current];
      }

      saveStoredVodafoneRecords(updated);
      setVodafoneRecords(updated);

      // Persist directly into Supabase vodafone tables
      for (const table of VODAFONE_TABLE_CANDIDATES) {
        try {
          const payload: any = {
            id: code,
            site_code: code,
            'site code': code,
            'Site code': code,
            data: enriched,
            ...enriched,
            updated_at: now,
          };
          await supabase.from(table).upsert(payload, { onConflict: 'id' });
        } catch (err) {
          console.warn(`[Vodafone Supabase] Error saving to ${table}:`, err);
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل حفظ بيانات الموقع' };
    }
  }, []);

  const deleteVodafoneRecord = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const norm = (code || '').trim().toUpperCase();
      const current = loadStoredVodafoneRecords();
      const filtered = current.filter((r) => {
        const c = String(r[' Site code'] || r['Site code'] || r['site code'] || '').trim().toUpperCase();
        return c !== norm;
      });
      saveStoredVodafoneRecords(filtered);
      setVodafoneRecords(filtered);

      // Delete from Supabase tables
      for (const table of VODAFONE_TABLE_CANDIDATES) {
        try {
          await supabase.from(table).delete().or(`site_code.eq."${norm}",site code.eq."${norm}",id.eq."${norm}"`);
        } catch { }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل حذف الموقع' };
    }
  }, []);

  const deleteVodafoneRecordsBulk = useCallback(async (codes: string[]): Promise<{ success: boolean; count?: number; error?: string }> => {
    try {
      if (!codes || codes.length === 0) return { success: true, count: 0 };
      const codeSet = new Set(codes.map((c) => String(c || '').trim().toUpperCase()));
      const current = loadStoredVodafoneRecords();
      const filtered = current.filter((r) => {
        const c = String(r[' Site code'] || r['Site code'] || r['site code'] || '').trim().toUpperCase();
        return !codeSet.has(c);
      });
      saveStoredVodafoneRecords(filtered);
      setVodafoneRecords(filtered);

      // Batch delete from Supabase tables
      const codeArray = Array.from(codeSet);
      for (const table of VODAFONE_TABLE_CANDIDATES) {
        try {
          await supabase.from(table).delete().in('site_code', codeArray);
          await supabase.from(table).delete().in('site code', codeArray);
          await supabase.from(table).delete().in('id', codeArray);
        } catch { }
      }

      return { success: true, count: current.length - filtered.length };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل حذف مواقع Vodafone' };
    }
  }, []);

  const bulkImportVodafoneRecords = useCallback(async (recordsToImport: VodafoneRecord[]): Promise<{ success: boolean; savedCount: number; error?: string }> => {
    try {
      const current = loadStoredVodafoneRecords();
      const recordMap = new Map<string, VodafoneRecord>();
      current.forEach((r) => {
        const c = String(r[' Site code'] || r['Site code'] || r['site code'] || '').trim().toUpperCase();
        if (c) recordMap.set(c, r);
      });

      const now = new Date().toISOString();
      let savedCount = 0;
      const supabaseBatch: any[] = [];

      recordsToImport.forEach((rec) => {
        const rawCode = rec[' Site code'] || rec['Site code'] || rec['site code'] || rec.site_code;
        const c = String(rawCode || '').trim().toUpperCase();
        if (!c) return;
        const existing = recordMap.get(c);
        let finalRec: VodafoneRecord;
        if (existing) {
          finalRec = {
            ...existing,
            ...rec,
            _updatedAt: now,
          };
          recordMap.set(c, finalRec);
        } else {
          finalRec = {
            ...rec,
            _createdAt: now,
            _updatedAt: now,
          };
          recordMap.set(c, finalRec);
        }
        supabaseBatch.push({
          id: c,
          site_code: c,
          'site code': c,
          'Site code': c,
          data: finalRec,
          ...finalRec,
          updated_at: now,
        });
        savedCount++;
      });

      const merged = Array.from(recordMap.values());
      saveStoredVodafoneRecords(merged);
      setVodafoneRecords(merged);

      // Batch save to Supabase
      if (supabaseBatch.length > 0) {
        for (const table of VODAFONE_TABLE_CANDIDATES) {
          try {
            await supabase.from(table).upsert(supabaseBatch, { onConflict: 'id' });
          } catch { }
        }
      }

      return { success: true, savedCount };
    } catch (err: any) {
      return { success: false, savedCount: 0, error: err?.message || 'فشل الاستيراد الجماعي' };
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

