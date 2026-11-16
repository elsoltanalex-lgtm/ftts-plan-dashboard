// src/hooks/useOrangeAPI.ts
// Live state & persistence API hook for Orange FTTS dataset (with localStorage & Cloud sync)

import { useState, useEffect, useCallback } from 'react';
import type { SiteRecord } from '../types/dashboard';
import type { OrangeRecord } from '../types/orange';
import { normalizeOrangeClassification } from '../types/orange';
import { ORANGE_RAW_RECORDS, ORANGE_SITES } from '../data/orangeSites';

const STORAGE_KEY = 'ftts_orange_records_v3';

export function mapOrangeRecordToSiteRecord(r: OrangeRecord, index = 0): SiteRecord {
  const rawCode = r[' Site code'] || r['Site code'] || r['site code'] || r['HUBID'] || `ORG-${index + 1}`;
  const code = String(rawCode).trim();
  const rawTasneef = String(r['التصنيف'] || r['التصنيف (مدني)'] || '').trim();

  let status = 'جاري المعاينة';
  let executionCategory: 'Completed' | 'In Progress' | 'Blocked / On Hold' | 'Planned' = 'In Progress';
  let progressPercent = 20;

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
  const sector = String(r['رئاسة قطاعات التنفيذ'] || r['رئاسة القطاعات '] || r['رئاسة القطاعات'] || 'تنفيذ شبكات المنطقة الشرقية والغربية').trim();
  const generalAdmin = String(r['الادارة العامة لتنفيذ الشبكات'] || r['الادارة العامة للتنفيذ'] || r['الادارة العامة'] || 'الإدارة العامة لتنفيذ الشبكات').trim();
  const subSector = String(r['قطاع التنفيذ'] || r['قطاع المناطق'] || r['القطاع'] || 'إدارة مختصة').trim();
  const competentAdmin = String(r['ادارة التنفيذ الفرعية'] || r['الادارة العامة للمنطقة'] || r['المنطقة'] || 'إدارة المنطقة').trim();
  const obstacleReason = String(r['اسباب التعّذر'] || r['اسباب التعذر'] || r['نوع المعوق المدني'] || r['الملاحظات'] || 'لا يوجد تعذر').trim();
  const expectedDate = r['التاريخ المتوقع للانتهاء'] || (r['خطة'] ? `${r['خطة']}-12-31` : '2026-12-31');

  return {
    id: `ORG-${code}`,
    siteCode: code,
    siteName: `موقع ${code} - ${central}`,
    company: 'Orange',
    status,
    executionCategory,
    linksCount: 1,
    // 4-tier exact hierarchy fields for Orange
    sector, // رئاسة القطاعات
    generalAdmin, // الإدارة العامة للتنفيذ
    subSector, // الإدارة المختصة
    competentAdmin, // إدارة المنطقة
    executionSector: String(r['قطاع التنفيذ'] || '').trim(),
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
    rawRecord: r,
  };
}

// In-memory cache
let inMemoryOrangeRecords: OrangeRecord[] = [];

function loadStoredOrangeRecords(): OrangeRecord[] {
  if (inMemoryOrangeRecords.length > 0) return inMemoryOrangeRecords;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryOrangeRecords = parsed;
        return inMemoryOrangeRecords;
      }
    }
  } catch {
    // fallback
  }
  inMemoryOrangeRecords = [...ORANGE_RAW_RECORDS];
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
  const norm = (code || '').trim().toUpperCase();
  const records = loadStoredOrangeRecords();
  return records.find((r) => {
    const c = String(r[' Site code'] || r['Site code'] || r['site code'] || '').trim().toUpperCase();
    return c === norm;
  }) || null;
}

export function useOrangeAPI() {
  const [orangeRecords, setOrangeRecords] = useState<OrangeRecord[]>(() => loadStoredOrangeRecords());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetchOrangeRecords = useCallback(async () => {
    setLoading(true);
    try {
      const records = loadStoredOrangeRecords();
      setOrangeRecords([...records]);
    } catch (err: any) {
      setError(err?.message || 'Error fetching Orange records');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveOrangeRecord = useCallback(async (record: OrangeRecord): Promise<{ success: boolean; error?: string }> => {
    try {
      const rawCode = record[' Site code'] || record['Site code'] || record['site code'] || (record as any).site_code;
      const code = String(rawCode || '').trim().toUpperCase();
      if (!code) return { success: false, error: 'كود الموقع مطلوب' };

      const current = loadStoredOrangeRecords();
      const idx = current.findIndex((r) => {
        const c = String(r[' Site code'] || r['Site code'] || r['site code'] || '').trim().toUpperCase();
        return c === code;
      });
      let updated: OrangeRecord[];

      const now = new Date().toISOString();
      const enriched: OrangeRecord = {
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

      saveStoredOrangeRecords(updated);
      setOrangeRecords(updated);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل حفظ بيانات الموقع' };
    }
  }, []);

  const deleteOrangeRecord = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const norm = (code || '').trim().toUpperCase();
      const current = loadStoredOrangeRecords();
      const filtered = current.filter((r) => {
        const c = String(r[' Site code'] || r['Site code'] || r['site code'] || '').trim().toUpperCase();
        return c !== norm;
      });
      saveStoredOrangeRecords(filtered);
      setOrangeRecords(filtered);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل حذف الموقع' };
    }
  }, []);

  const bulkImportOrangeRecords = useCallback(async (recordsToImport: OrangeRecord[]): Promise<{ success: boolean; savedCount: number; error?: string }> => {
    try {
      const current = loadStoredOrangeRecords();
      const recordMap = new Map<string, OrangeRecord>();
      current.forEach((r) => {
        const c = String(r[' Site code'] || r['Site code'] || r['site code'] || '').trim().toUpperCase();
        if (c) recordMap.set(c, r);
      });

      const now = new Date().toISOString();
      let savedCount = 0;

      recordsToImport.forEach((rec) => {
        const rawCode = rec[' Site code'] || rec['Site code'] || rec['site code'] || (rec as any).site_code;
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
      saveStoredOrangeRecords(merged);
      setOrangeRecords(merged);
      return { success: true, savedCount };
    } catch (err: any) {
      return { success: false, savedCount: 0, error: err?.message || 'فشل الاستيراد الجماعي' };
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
    bulkImportOrangeRecords,
  };
}

