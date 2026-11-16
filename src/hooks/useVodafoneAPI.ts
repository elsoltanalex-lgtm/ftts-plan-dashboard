// src/hooks/useVodafoneAPI.ts
// Live state & persistence API hook for Vodafone FTTS dataset (with localStorage & fallback)

import { useState, useCallback } from 'react';
import type { SiteRecord } from '../types/dashboard';
import type { VodafoneRecord } from '../types/vodafone';
import { VODAFONE_RAW_RECORDS } from '../data/vodafoneSites';

const STORAGE_KEY = 'ftts_vodafone_records_v1';

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
      const records = loadStoredVodafoneRecords();
      setVodafoneRecords([...records]);
    } catch (err: any) {
      setError(err?.message || 'Error fetching Vodafone records');
    } finally {
      setLoading(false);
    }
  }, []);

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
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل حذف الموقع' };
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

      recordsToImport.forEach((rec) => {
        const rawCode = rec[' Site code'] || rec['Site code'] || rec['site code'] || rec.site_code;
        const c = String(rawCode || '').trim().toUpperCase();
        if (!c) return;
        const existing = recordMap.get(c);
        if (existing) {
          recordMap.set(c, {
            ...existing,
            ...rec,
            _updatedAt: now,
          });
        } else {
          recordMap.set(c, {
            ...rec,
            _createdAt: now,
            _updatedAt: now,
          });
        }
        savedCount++;
      });

      const merged = Array.from(recordMap.values());
      saveStoredVodafoneRecords(merged);
      setVodafoneRecords(merged);
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
    bulkImportVodafoneRecords,
  };
}

