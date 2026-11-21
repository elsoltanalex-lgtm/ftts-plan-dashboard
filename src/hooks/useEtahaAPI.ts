// src/hooks/useEtahaAPI.ts
// Live state & persistence API hook for Availability / Etaha project dataset

import { useState, useCallback, useEffect } from 'react';
import type { SiteRecord } from '../types/dashboard';
import { ETAHA_RAW_RECORDS, type EtahaRecord } from '../data/etahaSites';
import { supabase } from '../lib/supabase';
import { parseToDateInputValue } from '../utils/filterUtils';

const STORAGE_KEY = 'availability_etaha_records_v4_360';

let inMemoryEtahaRecords: EtahaRecord[] = [];

function loadStoredEtahaRecords(): EtahaRecord[] {
  if (inMemoryEtahaRecords.length > 0) return inMemoryEtahaRecords;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryEtahaRecords = parsed;
        return inMemoryEtahaRecords;
      }
    }
  } catch {
    // fallback
  }
  inMemoryEtahaRecords = [...ETAHA_RAW_RECORDS];
  return inMemoryEtahaRecords;
}

function saveStoredEtahaRecords(records: EtahaRecord[]): void {
  inMemoryEtahaRecords = records;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // storage limit fallback
  }
}

export function mapEtahaRecordToSiteRecord(r: EtahaRecord, index = 0): SiteRecord {
  const siteCode = String(r.Code || `ETAH-${index + 1}`).trim();
  const clientName = String(r['اسم العميل'] || '').trim();
  const branchName = String(r['اسم الفرع'] || '').trim();
  const address = String(r['العنوان'] || '').trim();
  const rawStatus = String(r['التصنيف'] || '').trim();

  let status = 'جاري المعاينة';
  let executionCategory: 'Completed' | 'In Progress' | 'Blocked / On Hold' | 'Planned' = 'In Progress';
  let progressPercent = 25;

  if (rawStatus === 'تم الانتهاء والتسليم' || rawStatus === 'تم التسليم' || rawStatus.includes('تسليم')) {
    status = 'تم الانتهاء';
    executionCategory = 'Completed';
    progressPercent = 100;
  } else if (rawStatus.includes('تم خارجي') || rawStatus.includes('متوقف علي العميل')) {
    status = 'تم الانتهاء';
    executionCategory = 'Completed';
    progressPercent = 85;
  } else if (rawStatus.includes('تصاريح')) {
    status = 'جاري تصاريح';
    executionCategory = 'In Progress';
    progressPercent = 40;
  } else if (rawStatus.includes('معوق')) {
    status = 'معوقات';
    executionCategory = 'Blocked / On Hold';
    progressPercent = 30;
  } else if (rawStatus.includes('تعذر') || rawStatus.includes('متعذر')) {
    status = 'متعذر';
    executionCategory = 'Blocked / On Hold';
    progressPercent = 15;
  } else if (rawStatus.includes('مدن') || rawStatus.includes('جاري خارجي') || rawStatus.includes('تنفيذ')) {
    status = 'جاري مدني';
    executionCategory = 'In Progress';
    progressPercent = 60;
  } else if (rawStatus.includes('كهرب')) {
    status = 'جاري كهربي';
    executionCategory = 'In Progress';
    progressPercent = 75;
  } else if (rawStatus.includes('معاين') || rawStatus.includes('منتظر')) {
    status = 'جاري المعاينة';
    executionCategory = 'Planned';
    progressPercent = 20;
  }

  let sector = String(r['القطاعات'] || 'القاهرة الكبرى').trim();
  if (sector.includes('القاهرة')) sector = 'قطاع مناطق القاهرة الكبرى';
  else if (sector.includes('الشرقية')) sector = 'قطاع شرق الدلتا';
  else if (sector.includes('الغربية')) sector = 'قطاع مناطق غرب الدلتا';
  else if (sector.includes('الجنوبية')) sector = 'قطاع مناطق الصعيد';

  const generalAdmin = String(r['الادارة العامة المنفذة'] || 'الإدارة العامة لتنفيذ الشبكات').trim();
  const competentAdmin = String(r['ادارة التنفيذ'] || r['قطاع التنفيذ'] || 'إدارة التنفيذ المختصة').trim();
  const governorate = String(r['المحافظة'] || '').trim();
  const central = String(r['سنترال الربط'] || governorate || 'سنترال رئيسي').trim();

  let clientCategory = 'المؤسسات والشركات';
  if (clientName.includes('بنك') || clientName.includes('مصرف') || clientName.includes('CIB') || clientName.includes('QNB')) {
    clientCategory = 'البنوك والقطاع المصرفي';
  } else if (clientName.includes('تعليم') || clientName.includes('مدرسة') || clientName.includes('جامعة') || clientName.includes('أزهر')) {
    clientCategory = 'التربية والتعليم والجامعات';
  } else if (clientName.includes('صحة') || clientName.includes('إسعاف') || clientName.includes('مستشفى') || clientName.includes('بلازما')) {
    clientCategory = 'الصحة والمستشفيات';
  } else if (clientName.includes('كهرباء') || clientName.includes('مياه') || clientName.includes('بترول') || clientName.includes('غاز')) {
    clientCategory = 'المرافق والبنية التحتية';
  } else if (clientName.includes('ضرائب') || clientName.includes('جمارك') || clientName.includes('شرطة') || clientName.includes('داخلية')) {
    clientCategory = 'الجهات والوزارات الحكومية';
  }

  const obstacleReason = String(r['سبب المعوق او التعذر'] || r['ملحوظه في حاله عدم الانتهاء'] || 'لا يوجد تعذر').trim();
  const expectedDate = r['تاريخ الانتهاء'] || '2026-12-31';

  return {
    id: `ETAH-${siteCode}`,
    siteCode,
    siteName: `${clientName} - ${branchName && branchName !== '0' ? branchName : (address || siteCode)}`,
    company: clientCategory,
    status,
    executionCategory,
    linksCount: 1,
    sector,
    generalAdmin,
    competentAdmin,
    executionSector: String(r['قطاع التنفيذ'] || '').trim(),
    subSector: String(r['ادارة التنفيذ'] || '').trim(),
    governorate,
    central,
    civilContractor: String(r['مسئوليه التنفيذ'] || 'التنفيذ').trim(),
    responsibility: String(r['مسئوليه التنفيذ'] || 'التنفيذ').trim(),
    classification: rawStatus || 'إتاحة',
    obstacleReason,
    obstacleType: rawStatus.includes('معوق') ? 'معوقات' : rawStatus.includes('تعذر') ? 'تعذر' : '',
    deliveryArea: r['موقف التسليم'] || r['موقف_التسليم'] || '',
    expectedDate,
    progressPercent,
    notes: [r['ملحوظه في حاله عدم الانتهاء'], r['اسم ورقم تليفون مدير الادارة']].filter(Boolean).join(' | '),
    externalPath: String(r['المسار الخارجي'] || r['المسار_الخارجي'] || '').trim(),
    internalPath: String(r['المسار الداخلى'] || r['المسار_الداخلى'] || r['موقف اللحامات'] || r['موقف_اللحامات'] || '').trim(),
    deliveryStatus: String(r['موقف التسليم'] || r['موقف_التسليم'] || '').trim(),
    excelStatus: rawStatus || 'إتاحة',
    paymentAndStartDate: parseToDateInputValue(
      r['تاريخ السداد والبدء في التنفيذ'] ||
      r['تاريخ السداد و البدء فى التنفيذ'] ||
      r.paymentAndStartDate ||
      r.payment_and_start_date
    ),
    rawRecord: r,
  };
}

export function useEtahaAPI() {
  const [etahaRecords, setEtahaRecords] = useState<EtahaRecord[]>(() => loadStoredEtahaRecords());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetchEtahaRecords = useCallback(async () => {
    setLoading(true);
    try {
      // Attempt live fetch from Supabase availability tables
      for (const table of ['etaha_records', 'etaha', 'availability']) {
        try {
          const { data, error: sbError } = await supabase.from(table).select('*').limit(5000);
          if (!sbError && data && data.length > 0) {
            const baseMap = new Map<string, EtahaRecord>();
            loadStoredEtahaRecords().forEach((r) => {
              const c = String(r.Code || r.code || '').trim().toUpperCase();
              if (c) baseMap.set(c, r);
            });
            data.forEach((row: any) => {
              const rowData = row.data && typeof row.data === 'object' ? row.data : row;
              const code = String(row.Code || row.code || row.id || rowData.Code || rowData.code || '').trim().toUpperCase();
              if (code) {
                const prev = baseMap.get(code) || {};
                baseMap.set(code, { ...prev, ...rowData, ...row, Code: code });
              }
            });
            const merged = Array.from(baseMap.values());
            saveStoredEtahaRecords(merged);
            setEtahaRecords(merged);
            return;
          }
        } catch { }
      }

      const records = loadStoredEtahaRecords();
      setEtahaRecords([...records]);
    } catch (err: any) {
      setError(err?.message || 'Error fetching Etaha records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetchEtahaRecords();

    // Force real-time refresh whenever mobile/desktop user switches back to the tab or unlocks screen
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetchEtahaRecords();
      }
    };
    const handleFocus = () => {
      refetchEtahaRecords();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refetchEtahaRecords]);

  const saveEtahaRecord = useCallback(async (record: EtahaRecord): Promise<{ success: boolean; error?: string }> => {
    try {
      const code = String(record.Code || record.code || '').trim().toUpperCase();
      if (!code) return { success: false, error: 'كود المشروع مطلوب' };

      const current = loadStoredEtahaRecords();
      const idx = current.findIndex((r) => String(r.Code || r.code || '').trim().toUpperCase() === code);
      let updated: EtahaRecord[];

      const now = new Date().toISOString();
      const enriched: EtahaRecord = {
        ...record,
        Code: code,
        _updatedAt: now,
      };

      if (idx >= 0) {
        updated = [...current];
        updated[idx] = { ...updated[idx], ...enriched };
      } else {
        enriched._createdAt = now;
        updated = [enriched, ...current];
      }

      saveStoredEtahaRecords(updated);
      setEtahaRecords(updated);

      const paymentDate = enriched['تاريخ السداد والبدء في التنفيذ'] || enriched['تاريخ السداد و البدء فى التنفيذ'] || enriched.paymentAndStartDate || enriched.payment_and_start_date || '';

      // Persist directly into Supabase availability / etaha tables
      for (const table of ['etaha_records', 'etaha', 'availability']) {
        try {
          const payload: any = {
            id: code,
            code: code,
            Code: code,
            'المشروع': enriched['المشروع'] || enriched.project || 'اتاحة',
            'التصنيف': enriched['موقف التسليم'] || enriched.classification || '',
            'الجهة': enriched['الجهة'] || '',
            'السنترال': enriched['سنترال الربط'] || enriched.central || '',
            'القطاع': enriched['رئاسة قطاعات التنفيذ'] || enriched.sector || '',
            'المحافظة': enriched['المحافظه'] || enriched.governorate || '',
            'الملاحظات': enriched['الملاحظات'] || enriched.notes || '',
            'تاريخ السداد والبدء في التنفيذ': paymentDate,
            'تاريخ السداد و البدء فى التنفيذ': paymentDate,
            payment_and_start_date: paymentDate,
            data: enriched,
            updated_at: now,
          };

          if (idx >= 0) {
            const { data: updateData, error: updateErr } = await supabase
              .from(table)
              .update(payload)
              .or(`Code.eq."${code}",code.eq."${code}",id.eq."${code}"`)
              .select();
            if (!updateErr && updateData && updateData.length > 0) break;
          }

          const { data: insertData, error: insertErr } = await supabase
            .from(table)
            .insert([payload])
            .select();
          if (!insertErr && insertData && insertData.length > 0) break;

          await supabase.from(table).upsert(payload, { onConflict: 'id' });
        } catch { }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل حفظ بيانات المشروع' };
    }
  }, []);

  const deleteEtahaRecord = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const norm = (code || '').trim().toUpperCase();
      const current = loadStoredEtahaRecords();
      const filtered = current.filter((r) => String(r.Code || r.code || '').trim().toUpperCase() !== norm);
      saveStoredEtahaRecords(filtered);
      setEtahaRecords(filtered);

      // Attempt deletion in Supabase if etaha table exists
      for (const table of ['etaha', 'etaha_records', 'availability']) {
        try {
          await supabase.from(table).delete().or(`Code.eq."${norm}",code.eq."${norm}",id.eq."${norm}"`);
        } catch { }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل حذف المشروع' };
    }
  }, []);

  const deleteEtahaRecordsBulk = useCallback(async (codes: string[]): Promise<{ success: boolean; count?: number; error?: string }> => {
    try {
      if (!codes || codes.length === 0) return { success: true, count: 0 };
      const codeSet = new Set(codes.map((c) => String(c || '').trim().toUpperCase()));
      const current = loadStoredEtahaRecords();
      const filtered = current.filter((r) => {
        const c = String(r.Code || r.code || '').trim().toUpperCase();
        return !codeSet.has(c);
      });
      saveStoredEtahaRecords(filtered);
      setEtahaRecords(filtered);

      // Attempt batch deletion in Supabase
      const codeArray = Array.from(codeSet);
      for (const table of ['etaha', 'etaha_records', 'availability']) {
        try {
          await supabase.from(table).delete().in('Code', codeArray);
          await supabase.from(table).delete().in('code', codeArray);
        } catch { }
      }

      return { success: true, count: current.length - filtered.length };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل حذف مشاريع الإتاحة' };
    }
  }, []);

  const bulkImportEtahaRecords = useCallback(async (recordsToImport: EtahaRecord[]): Promise<{
    success: boolean;
    savedCount: number;
    insertedCount: number;
    updatedCount: number;
    failedCount: number;
    errors: string[];
    error?: string;
  }> => {
    try {
      const current = loadStoredEtahaRecords();
      const recordMap = new Map<string, EtahaRecord>();
      current.forEach((r) => {
        const c = String(r.Code || r.code || '').trim().toUpperCase();
        if (c) recordMap.set(c, r);
      });

      const now = new Date().toISOString();
      let savedCount = 0;
      let insertedCount = 0;
      let updatedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const rec of recordsToImport) {
        const c = String(rec.Code || rec.code || '').trim().toUpperCase();
        if (!c) continue;

        const isExisting = recordMap.has(c);
        const existing = recordMap.get(c);
        const finalRec: EtahaRecord = isExisting
          ? { ...existing, ...rec, _updatedAt: now }
          : { ...rec, _createdAt: now, _updatedAt: now };

        recordMap.set(c, finalRec);

        const payload: any = {
          id: c,
          code: c,
          Code: c,
          'المشروع': finalRec['المشروع'] || finalRec.project || 'اتاحة',
          'التصنيف': finalRec['موقف التسليم'] || finalRec.classification || '',
          'الجهة': finalRec['الجهة'] || '',
          'السنترال': finalRec['سنترال الربط'] || finalRec.central || '',
          'القطاع': finalRec['رئاسة قطاعات التنفيذ'] || finalRec.sector || '',
          'المحافظة': finalRec['المحافظه'] || finalRec.governorate || '',
          'الملاحظات': finalRec['الملاحظات'] || finalRec.notes || '',
          data: finalRec,
          updated_at: now,
        };

        for (const table of ['etaha_records', 'etaha', 'availability']) {
          try {
            if (isExisting) {
              const { data: updateData, error: updateErr } = await supabase
                .from(table)
                .update(payload)
                .or(`Code.eq."${c}",code.eq."${c}",id.eq."${c}"`)
                .select();

              if (!updateErr && updateData && updateData.length > 0) {
                break;
              }
            }

            const { data: insertData, error: insertErr } = await supabase
              .from(table)
              .insert([payload])
              .select();

            if (!insertErr && insertData && insertData.length > 0) {
              break;
            }

            const { data: upsertData, error: upsertErr } = await supabase
              .from(table)
              .upsert(payload, { onConflict: 'id' })
              .select();

            if (!upsertErr && upsertData && upsertData.length > 0) {
              break;
            }
          } catch (err: any) {
            console.warn(`[Etaha Supabase] Error saving row ${c} to ${table}:`, err);
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
      saveStoredEtahaRecords(merged);
      setEtahaRecords(merged);

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

  const etahaSites = etahaRecords.map((r, i) => mapEtahaRecordToSiteRecord(r, i));

  return {
    etahaRecords,
    etahaSites,
    loading,
    error,
    refetchEtahaRecords,
    saveEtahaRecord,
    deleteEtahaRecord,
    deleteEtahaRecordsBulk,
    bulkImportEtahaRecords,
  };
}

