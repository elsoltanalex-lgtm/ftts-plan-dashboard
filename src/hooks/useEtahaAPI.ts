// src/hooks/useEtahaAPI.ts
// Live state & persistence API hook for Availability / Etaha project dataset

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { SiteRecord } from '../types/dashboard';
import { ETAHA_RAW_RECORDS, type EtahaRecord } from '../data/etahaSites';
import { supabase, supabaseFallback, supabaseClients } from '../lib/supabase';
import { parseToDateInputValue } from '../utils/filterUtils';
import {
  normalizeEtahaInternalPath,
  normalizeEtahaDeliveryStatus,
} from '../utils/etahaMetrics';
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

const STORAGE_KEY = 'availability_etaha_records_v7_368';

let inMemoryEtahaRecords: EtahaRecord[] = [];

function normalizeEtahaRecordFields(r: EtahaRecord): EtahaRecord {
  const rowData = (r as any).data && typeof (r as any).data === 'object' ? (r as any).data : {};
  const merged: any = { ...r, ...rowData };
  const rawInt = merged['المسار الداخلي'] || merged['المسار الداخلى'] || merged['المسار_الداخلي'] || merged['المسار_الداخلى'] || merged.internalPath || '';
  const normInt = normalizeEtahaInternalPath(rawInt);
  const rawDel = merged['موقف التسليم'] || merged['موقف_التسليم'] || merged.deliveryStatus || '';
  const normDel = normalizeEtahaDeliveryStatus(rawDel);
  let rawExt = String(merged['المسار الخارجي'] || merged['المسار_الخارجي'] || merged.externalPath || '').trim();
  if (rawExt === 'تعذر' || rawExt === 'متعذرات' || rawExt === 'متعذر') rawExt = 'متعذر';
  let rawCls = String(merged['التصنيف'] || merged.classification || '').trim();
  if (rawCls === 'تعذر' || rawCls === 'متعذرات' || rawCls === 'متعذر') rawCls = 'متعذر';

  const result: EtahaRecord = { ...merged };
  if (normInt) {
    result['المسار الداخلي'] = normInt;
    result['المسار الداخلى'] = normInt;
    result.internalPath = normInt;
  }
  if (normDel) {
    result['موقف التسليم'] = normDel;
    result.deliveryStatus = normDel;
  }
  if (rawExt) {
    result['المسار الخارجي'] = rawExt;
    result.externalPath = rawExt;
  }
  if (rawCls) {
    result['التصنيف'] = rawCls;
    result.classification = rawCls;
  }
  return result;
}

function loadStoredEtahaRecords(): EtahaRecord[] {
  if (inMemoryEtahaRecords.length > 0) return inMemoryEtahaRecords;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryEtahaRecords = parsed.map(normalizeEtahaRecordFields);
        return inMemoryEtahaRecords;
      }
    }
  } catch {
    // fallback
  }
  inMemoryEtahaRecords = ETAHA_RAW_RECORDS.map(normalizeEtahaRecordFields);
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
  const rowData = (r as any).data && typeof (r as any).data === 'object' ? (r as any).data : {};
  const d: any = { ...r, ...rowData };

  const siteCode = String(d.Code || d.code || `ETAH-${index + 1}`).trim();
  const clientName = String(d['اسم العميل'] || d.clientName || '').trim();
  const branchName = String(d['اسم الفرع'] || d.branchName || '').trim();
  const address = String(d['العنوان'] || d.address || '').trim();
  let rawStatus = String(d['التصنيف'] || d.classification || '').trim();
  if (rawStatus === 'تعذر' || rawStatus === 'متعذرات' || rawStatus === 'متعذر') {
    rawStatus = 'متعذر';
  }
  const internalPath = normalizeEtahaInternalPath(
    String(d['المسار الداخلي'] || d['المسار الداخلى'] || d['المسار_الداخلى'] || d['المسار_الداخلي'] || d.internalPath || '').trim()
  );
  let externalPath = String(d['المسار الخارجي'] || d['المسار_الخارجي'] || d.externalPath || '').trim();
  if (externalPath === 'تعذر' || externalPath === 'متعذرات' || externalPath === 'متعذر') {
    externalPath = 'متعذر';
  }
  const deliveryStatus = normalizeEtahaDeliveryStatus(
    String(d['موقف التسليم'] || d['موقف_التسليم'] || d.deliveryStatus || '').trim()
  );
  if (internalPath) {
    d['المسار الداخلي'] = internalPath;
    d['المسار الداخلى'] = internalPath;
    d.internalPath = internalPath;
  }
  if (deliveryStatus) {
    d['موقف التسليم'] = deliveryStatus;
    d.deliveryStatus = deliveryStatus;
  }
  const splicingStatus = String(d['موقف اللحامات'] || d['موقف_اللحامات'] || d.splicingStatus || '').trim();
  const rawDelDate = String(d['تاريخ التسليم '] || d['تاريخ التسليم'] || d.deliveryDate || d.delivery_date || d['تاريخ_التسليم'] || '').trim();
  const deliveryDate = parseToDateInputValue(rawDelDate);

  let status = 'جاري المعاينة';
  let executionCategory: 'Completed' | 'In Progress' | 'Blocked / On Hold' | 'Planned' = 'In Progress';
  let progressPercent = 25;

  if (
    deliveryStatus === 'تم التسليم' ||
    deliveryStatus.includes('تم التسليم') ||
    rawStatus === 'تم الانتهاء والتسليم' ||
    rawStatus === 'تم التسليم' ||
    rawStatus.includes('تسليم') ||
    Boolean(deliveryDate)
  ) {
    status = 'تم التسليم';
    executionCategory = 'Completed';
    progressPercent = 100;
  } else if (
    (internalPath === 'تم الانتهاء' || internalPath === 'تم الانتهاء بالكامل') &&
    externalPath === 'تم الانتهاء'
  ) {
    status = 'تم الانتهاء';
    executionCategory = 'Completed';
    progressPercent = 95;
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

  // Drive Etaha sector strictly from قطاع التنفيذ in Excel dataset
  const rawExecSector = String(d['قطاع التنفيذ'] || d.executionSector || '').replace(/\s+/g, ' ').trim();
  const rawAltSector = String(d['القطاعات'] || d.sector || '').replace(/\s+/g, ' ').trim();
  const sector = rawExecSector || rawAltSector || 'قطاع غير محدد';

  const generalAdmin = String(d['الادارة العامة المنفذة'] || d['الادارة العامة لتنفيذ الشبكات'] || 'الإدارة العامة لتنفيذ الشبكات').replace(/\s+/g, ' ').trim();
  const competentAdmin = String(d['ادارة التنفيذ'] || d['إدارة التنفيذ المختصة'] || rawExecSector || 'إدارة التنفيذ المختصة').replace(/\s+/g, ' ').trim();
  const governorate = String(d['المحافظة'] || d['المحافظه'] || d.governorate || '').trim();
  const central = String(d['سنترال الربط'] || d.central || governorate || 'سنترال رئيسي').trim();

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

  const obstacleReason = String(d['سبب المعوق او التعذر'] || d['ملحوظه في حاله عدم الانتهاء'] || d.obstacleReason || 'لا يوجد تعذر').trim();
  const expectedDate = d['تاريخ الانتهاء'] || d.expectedDate || '2026-12-31';
  const rawResponsibility = String(d['مسئوليه التنفيذ'] || d['مسؤولية التنفيذ'] || d.responsibility || d.executionResponsibility || 'التنفيذ').replace(/\s+/g, ' ').trim();

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
    executionSector: rawExecSector || sector,
    subSector: competentAdmin,
    governorate,
    central,
    civilContractor: rawResponsibility,
    responsibility: rawResponsibility,
    executionResponsibility: rawResponsibility,
    classification: rawStatus || 'إتاحة',
    obstacleReason,
    obstacleType: rawStatus.includes('معوق') ? 'معوقات' : (rawStatus.includes('تعذر') || rawStatus === 'متعذر') ? 'متعذر' : '',
    deliveryArea: deliveryStatus || '',
    expectedDate,
    progressPercent,
    notes: [d['ملحوظه في حاله عدم الانتهاء'], d['اسم ورقم تليفون مدير الادارة'], d.notes].filter(Boolean).join(' | '),
    externalPath,
    internalPath,
    splicingStatus,
    deliveryStatus,
    deliveryDate,
    excelStatus: rawStatus || 'إتاحة',
    paymentAndStartDate: parseToDateInputValue(
      d['تاريخ السداد والبدء في التنفيذ'] ||
      d['تاريخ السداد و البدء فى التنفيذ'] ||
      d.paymentAndStartDate ||
      d.payment_and_start_date
    ),
    specialTarget: Boolean(d.specialTarget || d.special_target || d['سبيشال تارجت'] || d['سبيشال_تارجت']),
    special_target: Boolean(d.specialTarget || d.special_target || d['سبيشال تارجت'] || d['سبيشال_تارجت']),
    rawRecord: d,
  };
}

export function useEtahaAPI() {
  const [etahaRecords, setEtahaRecords] = useState<EtahaRecord[]>(() => loadStoredEtahaRecords());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetchEtahaRecords = useCallback(async () => {
    setLoading(true);
    try {
      const deletedCodes = await fetchCloudDeletedCodes();

      // Attempt live fetch from Supabase availability tables across all clients
      for (const client of supabaseClients) {
        for (const table of ['etaha_records', 'etaha', 'availability']) {
          try {
            const { data, error: sbError } = await client.from(table).select('*').limit(5000);
            if (!sbError && data && data.length > 0) {
              const baseMap = new Map<string, EtahaRecord>();
              loadStoredEtahaRecords().forEach((r) => {
                const c = String(r.Code || r.code || '').trim().toUpperCase();
                if (c && !deletedCodes.has(c)) baseMap.set(c, r);
              });
              data.forEach((row: any) => {
                const rowData = row.data && typeof row.data === 'object' ? row.data : row;
                const code = String(row.Code || row.code || row.id || rowData.Code || rowData.code || '').trim().toUpperCase();
                if (code && code !== SYNC_DELETED_CODES_SITE_CODE && !deletedCodes.has(code)) {
                  const prev = baseMap.get(code) || {};
                  baseMap.set(code, normalizeEtahaRecordFields({ ...prev, ...rowData, ...row, Code: code }));
                }
              });
              const merged = Array.from(baseMap.values()).filter((r) => {
                const c = String(r.Code || r.code || '').trim().toUpperCase();
                return !deletedCodes.has(c);
              });
              saveStoredEtahaRecords(merged);
              setEtahaRecords(merged);
              return;
            }
          } catch { }
        }
      }

      const records = loadStoredEtahaRecords().filter((r) => {
        const c = String(r.Code || r.code || '').trim().toUpperCase();
        return !deletedCodes.has(c);
      });
      setEtahaRecords(records);
    } catch (err: any) {
      setError(err?.message || 'Error fetching Etaha records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetchEtahaRecords();

    // Supabase Realtime channel for instant cross-device updates
    const channel = supabaseFallback
      .channel('etaha_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'we_records' },
        (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;
          if (
            (newRow && (newRow.id === SYNC_DELETED_CODES_ID || newRow.site_code === SYNC_DELETED_CODES_SITE_CODE)) ||
            (oldRow && (oldRow.id === SYNC_DELETED_CODES_ID || oldRow.site_code === SYNC_DELETED_CODES_SITE_CODE))
          ) {
            refetchEtahaRecords();
          }
        }
      )
      .subscribe();

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
      supabaseFallback.removeChannel(channel);
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
      const intVal = normalizeEtahaInternalPath(String(record['المسار الداخلي'] || record['المسار الداخلى'] || record.internalPath || '').trim());
      let extVal = String(record['المسار الخارجي'] || record.externalPath || '').trim();
      if (extVal === 'تعذر' || extVal === 'متعذرات' || extVal === 'متعذر') {
        extVal = 'متعذر';
      }
      const spliceVal = String(record['موقف اللحامات'] || record.splicingStatus || '').trim();
      const delVal = normalizeEtahaDeliveryStatus(String(record['موقف التسليم'] || record.deliveryStatus || '').trim());
      let clsVal = String(record['التصنيف'] || record.classification || '').trim();
      if (clsVal === 'تعذر' || clsVal === 'متعذرات' || clsVal === 'متعذر' || clsVal.includes('تعذر')) {
        clsVal = 'متعذر';
      }
      const delDate = String(record['تاريخ التسليم'] || record['تاريخ التسليم '] || record.deliveryDate || record.delivery_date || '').trim();

      const actor = getActiveActor();
      const enriched: EtahaRecord = {
        ...record,
        Code: code,
        _updatedAt: now,
        _lastModifiedBy: actor.displayName,
        _lastModifiedAt: now,
      };
      const oldRec = idx >= 0 ? current[idx] : null;

      if (intVal) {
        enriched['المسار الداخلي'] = intVal;
        enriched['المسار الداخلى'] = intVal;
        enriched.internalPath = intVal;
      }
      if (extVal) {
        enriched['المسار الخارجي'] = extVal;
        enriched.externalPath = extVal;
      }
      if (spliceVal) {
        enriched['موقف اللحامات'] = spliceVal;
        enriched.splicingStatus = spliceVal;
      }
      if (delVal) {
        enriched['موقف التسليم'] = delVal;
        enriched.deliveryStatus = delVal;
      }
      if (clsVal) {
        enriched['التصنيف'] = clsVal;
        enriched.classification = clsVal;
      }
      if (delDate) {
        enriched['تاريخ التسليم'] = delDate;
        enriched.deliveryDate = delDate;
        enriched.delivery_date = delDate;
      } else if (delVal === 'تم التسليم' && !enriched['تاريخ التسليم']) {
        const today = new Date().toISOString().slice(0, 10);
        enriched['تاريخ التسليم'] = today;
        enriched.deliveryDate = today;
        enriched.delivery_date = today;
      }

      if (idx >= 0) {
        updated = [...current];
        updated[idx] = { ...updated[idx], ...enriched };
      } else {
        enriched._createdAt = now;
        updated = [enriched, ...current];
      }

      saveStoredEtahaRecords(updated);
      setEtahaRecords(updated);

      logActivity({
        actionType: oldRec ? 'تعديل موقع' : 'إضافة موقع',
        module: 'الإتاحة',
        siteCode: code,
        details: buildRecordDiffSummary(oldRec, enriched),
      });

      const paymentDate = enriched['تاريخ السداد والبدء في التنفيذ'] || enriched['تاريخ السداد و البدء فى التنفيذ'] || enriched.paymentAndStartDate || enriched.payment_and_start_date || '';
      const finalDelDate = enriched['تاريخ التسليم'] || enriched.deliveryDate || '';
      const isSpecial = Boolean(enriched.specialTarget || enriched['سبيشال تارجت'] || enriched['سبيشال_تارجت']);

      // Persist directly into Supabase availability / etaha tables
      for (const client of supabaseClients) {
        for (const table of ['etaha_records', 'etaha', 'availability']) {
          try {
            const payload: any = {
              id: code,
              code: code,
              Code: code,
              'المشروع': enriched['المشروع'] || enriched.project || 'اتاحة',
              'التصنيف': clsVal || enriched['التصنيف'] || enriched.classification || '',
              'موقف التسليم': delVal || enriched['موقف التسليم'] || enriched.deliveryStatus || '',
              'المسار الداخلي': intVal || enriched['المسار الداخلي'] || enriched['المسار الداخلى'] || '',
              'المسار الداخلى': intVal || enriched['المسار الداخلي'] || enriched['المسار الداخلى'] || '',
              'المسار الخارجي': extVal || enriched['المسار الخارجي'] || enriched.externalPath || '',
              'موقف اللحامات': spliceVal || enriched['موقف اللحامات'] || enriched.splicingStatus || '',
              'الجهة': enriched['الجهة'] || enriched['اسم العميل'] || '',
              'السنترال': enriched['سنترال الربط'] || enriched.central || '',
              'القطاع': enriched['القطاعات'] || enriched['رئاسة قطاعات التنفيذ'] || enriched.sector || '',
              'قطاع التنفيذ': enriched['قطاع التنفيذ'] || enriched.executionSector || '',
              'الادارة العامة المنفذة': enriched['الادارة العامة المنفذة'] || enriched.generalAdmin || '',
              'ادارة التنفيذ': enriched['ادارة التنفيذ'] || enriched.competentAdmin || '',
              'مسئوليه التنفيذ': enriched['مسئوليه التنفيذ'] || enriched['مسؤولية التنفيذ'] || enriched.responsibility || '',
              'مسؤولية التنفيذ': enriched['مسؤولية التنفيذ'] || enriched['مسئوليه التنفيذ'] || enriched.responsibility || '',
              'المحافظة': enriched['المحافظه'] || enriched['المحافظة'] || enriched.governorate || '',
              'الملاحظات': enriched['الملاحظات'] || enriched.notes || '',
              'تاريخ السداد والبدء في التنفيذ': paymentDate,
              'تاريخ السداد و البدء فى التنفيذ': paymentDate,
              payment_and_start_date: paymentDate,
              'تاريخ التسليم': finalDelDate,
              deliveryDate: finalDelDate,
              delivery_date: finalDelDate,
              specialTarget: isSpecial,
              'سبيشال تارجت': isSpecial,
              'سبيشال_تارجت': isSpecial,
              data: enriched,
              updated_at: now,
            };

            if (idx >= 0) {
              const { data: updateData, error: updateErr } = await client
                .from(table)
                .update(payload)
                .or(`Code.eq."${code}",code.eq."${code}",id.eq."${code}"`)
                .select();
              if (!updateErr && updateData && updateData.length > 0) break;
            }

            const { data: insertData, error: insertErr } = await client
              .from(table)
              .insert([payload])
              .select();
            if (!insertErr && insertData && insertData.length > 0) break;

            await client.from(table).upsert(payload, { onConflict: 'id' });
          } catch { }
        }
      }

      await removeCloudDeletedCode(code);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل حفظ بيانات المشروع' };
    }
  }, []);

  const deleteEtahaRecord = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const norm = String(code ?? '').trim().toUpperCase();
      const targetCodes = new Set([norm, code]);
      if (norm.startsWith('ETAH-')) targetCodes.add(norm.slice(5));

      const current = loadStoredEtahaRecords();
      const filtered = current.filter((r) => {
        const c = String(r.Code || r.code || (r as any).id || '').trim().toUpperCase();
        return !targetCodes.has(c);
      });
      saveStoredEtahaRecords(filtered);
      setEtahaRecords(filtered);

      const targetList = Array.from(targetCodes);

      // Persist to authoritative Cloud Deleted Codes in Supabase for cross-device sync
      await addCloudDeletedCodes(targetList);

      logActivity({
        actionType: 'حذف موقع',
        module: 'الإتاحة',
        siteCode: norm,
        details: `حذف مشروع إتاحة (${norm})`,
      });

      // Attempt deletion in Supabase if etaha table exists across all clients
      for (const client of supabaseClients) {
        for (const table of ['etaha', 'etaha_records', 'availability']) {
          try {
            await client.from(table).delete().in('Code', targetList);
            await client.from(table).delete().in('code', targetList);
            await client.from(table).delete().in('id', targetList);
          } catch { }
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل حذف المشروع' };
    }
  }, []);

  const deleteEtahaRecordsBulk = useCallback(async (codes: string[]): Promise<{ success: boolean; count?: number; error?: string }> => {
    try {
      if (!codes || codes.length === 0) return { success: true, count: 0 };
      const codeSet = new Set<string>();
      codes.forEach((c) => {
        const str = String(c || '').trim();
        if (!str) return;
        const upper = str.toUpperCase();
        codeSet.add(str);
        codeSet.add(upper);
        if (upper.startsWith('ETAH-')) codeSet.add(upper.slice(5));
      });

      const current = loadStoredEtahaRecords();
      const filtered = current.filter((r) => {
        const c = String(r.Code || r.code || (r as any).id || '').trim().toUpperCase();
        return !codeSet.has(c);
      });
      saveStoredEtahaRecords(filtered);
      setEtahaRecords(filtered);

      // Attempt batch deletion in Supabase across all clients
      const codeArray = Array.from(codeSet);

      // Persist to authoritative Cloud Deleted Codes in Supabase for cross-device sync
      await addCloudDeletedCodes(codeArray);

      logActivity({
        actionType: 'حذف جماعي',
        module: 'الإتاحة',
        siteCode: `${codes.length} مشروعات`,
        details: `حذف جماعي لمشروعات الإتاحة (${codes.slice(0, 10).join(', ')}${codes.length > 10 ? '...' : ''})`,
      });

      for (const client of supabaseClients) {
        for (const table of ['etaha', 'etaha_records', 'availability']) {
          try {
            await client.from(table).delete().in('Code', codeArray);
            await client.from(table).delete().in('code', codeArray);
            await client.from(table).delete().in('id', codeArray);
          } catch { }
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

        if (finalRec['التصنيف'] === 'تعذر' || finalRec['التصنيف'] === 'متعذرات') {
          finalRec['التصنيف'] = 'متعذر';
          finalRec.classification = 'متعذر';
        }
        if (finalRec['المسار الخارجي'] === 'تعذر' || finalRec['المسار الخارجي'] === 'متعذرات') {
          finalRec['المسار الخارجي'] = 'متعذر';
          finalRec.externalPath = 'متعذر';
        }
        const bulkInt = normalizeEtahaInternalPath(String(finalRec['المسار الداخلي'] || finalRec['المسار الداخلى'] || finalRec.internalPath || '').trim());
        if (bulkInt) {
          finalRec['المسار الداخلي'] = bulkInt;
          finalRec['المسار الداخلى'] = bulkInt;
          finalRec.internalPath = bulkInt;
        }
        const bulkDel = normalizeEtahaDeliveryStatus(String(finalRec['موقف التسليم'] || finalRec.deliveryStatus || '').trim());
        if (bulkDel) {
          finalRec['موقف التسليم'] = bulkDel;
          finalRec.deliveryStatus = bulkDel;
        }

        const payload: any = {
          id: c,
          code: c,
          Code: c,
          'المشروع': finalRec['المشروع'] || finalRec.project || 'اتاحة',
          'التصنيف': finalRec['التصنيف'] || finalRec.classification || finalRec['موقف التسليم'] || '',
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

  const etahaSites = useMemo(() => etahaRecords.map((r, i) => mapEtahaRecordToSiteRecord(r, i)), [etahaRecords]);

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

