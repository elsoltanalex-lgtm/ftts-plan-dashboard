// src/hooks/useOrangeAPI.ts
// Live state & persistence API hook for Orange FTTS dataset (with Supabase sync & localStorage fallback)

import { useState, useEffect, useCallback } from 'react';
import type { SiteRecord } from '../types/dashboard';
import type { OrangeRecord } from '../types/orange';
import { normalizeOrangeClassification } from '../types/orange';
import { ORANGE_RAW_RECORDS, ORANGE_SITES } from '../data/orangeSites';
import { supabase, supabaseFallback, supabaseClients, isUUID } from '../lib/supabase';

const STORAGE_KEY = 'ftts_orange_records_v3';
const ORANGE_TABLE_CANDIDATES = ['orange_records', 'orange', 'we_records'];

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
      // 1. Attempt to fetch live from Supabase tables across active clients
      for (const client of supabaseClients) {
        for (const table of ORANGE_TABLE_CANDIDATES) {
          try {
            let query = client.from(table).select('*').limit(5000);
            if (table === 'we_records') {
              query = query.eq('data->>company', 'Orange');
            }
            const { data, error: sbError } = await query;
            if (!sbError && data && data.length > 0) {
              const baseMap = new Map<string, OrangeRecord>();
              loadStoredOrangeRecords().forEach((r) => {
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
              saveStoredOrangeRecords(merged);
              setOrangeRecords(merged);
              return;
            }
          } catch { }
        }
      }

      const records = loadStoredOrangeRecords();
      setOrangeRecords([...records]);
    } catch (err: any) {
      setError(err?.message || 'Error fetching Orange records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetchOrangeRecords();

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
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refetchOrangeRecords]);

  const saveOrangeRecord = useCallback(async (record: OrangeRecord): Promise<{ success: boolean; cloudSaved?: boolean; message?: string; error?: string }> => {
    try {
      const rawCode = record[' Site code'] || record['Site code'] || record['site code'] || (record as any).site_code;
      const code = String(rawCode || '').trim().toUpperCase();
      if (!code) return { success: false, error: 'كود الموقع مطلوب' };

      const current = loadStoredOrangeRecords();
      const idx = current.findIndex((r) => {
        const c = String(r[' Site code'] || r['Site code'] || r['site code'] || '').trim().toUpperCase();
        return c === code;
      });

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

      const enriched: OrangeRecord = {
        ...record,
        company: 'Orange',
        'Site code': code,
        'site code': code,
        site_code: code,
        'التصنيف': record['التصنيف'] || record['التصنيف (مدني)'] || '',
        'التصنيف (مدني)': record['التصنيف (مدني)'] || record['التصنيف'] || '',
        classification: record['التصنيف'] || record['التصنيف (مدني)'] || '',
        specialTarget: isSpecial,
        special_target: isSpecial,
        'سبيشال تارجت': isSpecial,
        _updatedAt: now,
      };

      // Safe payload matching physical Supabase table columns + JSONB data
      // (Preserves specialTarget and all operator attributes inside data: enriched)
      const safePayload: any = {
        site_code: code,
        'site code': code,
        'Site Status': enriched['التصنيف (مدني)'] || enriched['التصنيف'] || 'جاري',
        data: enriched,
        updated_at: now,
      };
      if (enriched._id && isUUID(enriched._id)) {
        safePayload.id = enriched._id;
      }

      // Persist directly into Supabase orange tables across active clients
      let cloudSaved = false;
      let lastCloudError: any = null;
      clientLoop: for (const client of supabaseClients) {
        for (const table of ORANGE_TABLE_CANDIDATES) {
          try {
            // 1. Direct UPDATE on existing record in Supabase
            let { data: updateData, error: updateErr } = await client
              .from(table)
              .update(safePayload)
              .eq('site_code', code)
              .select();

            if (updateErr || !updateData || updateData.length === 0) {
              const retryQuoted = await client
                .from(table)
                .update(safePayload)
                .eq('site code', code)
                .select();
              if (!retryQuoted.error && retryQuoted.data && retryQuoted.data.length > 0) {
                updateData = retryQuoted.data;
                updateErr = null;
              } else if (retryQuoted.error) {
                lastCloudError = retryQuoted.error;
              }
            }

            if (updateErr) {
              lastCloudError = updateErr;
              console.error(`[Orange Supabase] Update error on table ${table}:`, updateErr);
            }

            if (!updateErr && updateData && updateData.length > 0) {
              cloudSaved = true;
              console.log(`[Orange Supabase] Successfully updated site ${code} in ${table}`);
              break clientLoop;
            }

            // 2. INSERT if row does not exist
            const insertPayload: any = {
              ...safePayload,
              created_at: enriched._createdAt || now,
            };
            if (enriched._id && isUUID(enriched._id)) {
              insertPayload.id = enriched._id;
            }

            const { data: insertData, error: insertErr } = await client
              .from(table)
              .insert([insertPayload])
              .select();

            if (insertErr) {
              lastCloudError = insertErr;
              console.error(`[Orange Supabase] Insert error on table ${table}:`, insertErr);
            }

            if (!insertErr && insertData && insertData.length > 0) {
              cloudSaved = true;
              console.log(`[Orange Supabase] Successfully inserted site ${code} in ${table}`);
              break clientLoop;
            }
          } catch (err: any) {
            lastCloudError = err;
            console.error(`[Orange Supabase] Error saving site ${code} to table ${table}:`, err);
          }
        }
      }

      if (cloudSaved) {
        let updated: OrangeRecord[];
        if (idx >= 0) {
          updated = [...current];
          updated[idx] = { ...updated[idx], ...enriched };
        } else {
          enriched._createdAt = now;
          updated = [enriched, ...current];
        }
        saveStoredOrangeRecords(updated);
        setOrangeRecords(updated);

        return {
          success: true,
          cloudSaved: true,
          message: `تم حفظ وتحديث بيانات موقع Orange (${code}) وتصنيفه بنجاح في قاعدة بيانات Supabase السحابية ✅`,
        };
      }

      // Return explicit error with details if cloud save failed across all clients
      console.error(`[Orange Supabase] Failed to save site ${code} across all clients:`, lastCloudError);
      return {
        success: false,
        cloudSaved: false,
        error: `فشل تسجيل التحديث لموقع Orange (${code}) في قاعدة بيانات Supabase السحابية: ${lastCloudError?.message || 'يرجى التحقق من اتصال الإنترنت.'}`,
      };
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

      // Delete from Supabase tables across active clients (Client 2 Fallback hosts active live dataset)
      for (const client of supabaseClients) {
        for (const table of ORANGE_TABLE_CANDIDATES) {
          try {
            const { error: err1 } = await client.from(table).delete().eq('site_code', norm);
            const { error: err2 } = await client.from(table).delete().eq('site code', norm);
            if (err1 && err2) {
              console.error(`[Orange Supabase] Delete error on table ${table}:`, err1 || err2);
            }
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
      const codeSet = new Set(codes.map((c) => String(c || '').trim().toUpperCase()));
      const current = loadStoredOrangeRecords();
      const filtered = current.filter((r) => {
        const c = String(r[' Site code'] || r['Site code'] || r['site code'] || '').trim().toUpperCase();
        return !codeSet.has(c);
      });
      saveStoredOrangeRecords(filtered);
      setOrangeRecords(filtered);

      // Batch delete from Supabase tables across active clients
      const codeArray = Array.from(codeSet);
      for (const client of supabaseClients) {
        for (const table of ORANGE_TABLE_CANDIDATES) {
          try {
            await client.from(table).delete().in('site_code', codeArray);
            await client.from(table).delete().in('site code', codeArray);
          } catch (bulkErr) {
            console.error(`[Orange Supabase] Bulk delete exception on table ${table}:`, bulkErr);
          }
        }
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

