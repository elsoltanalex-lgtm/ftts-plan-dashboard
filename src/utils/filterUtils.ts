// src/utils/filterUtils.ts
// Utility functions for Multi-Select filtering and array normalization

import type { SiteRecord } from '../types/dashboard';
import { isRecordInSector } from './sectorPermissions';
import { getSiteClassification, isClassificationCompleted, isClassificationBlocked } from '../data/dashboardData';

/**
 * Converts a string, comma-separated string, or array into a normalized string array.
 */
export function toFilterArray(val: string | string[] | undefined | null): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val
      .map((s) => String(s || '').trim())
      .filter((s) => Boolean(s) && s !== 'All' && s !== 'ALL');
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === 'All' || trimmed === 'ALL') return [];
    if (trimmed.includes(',')) {
      return trimmed
        .split(',')
        .map((s) => s.trim())
        .filter((s) => Boolean(s) && s !== 'All' && s !== 'ALL');
    }
    return [trimmed];
  }
  return [];
}

/**
 * Checks if a site matches the multi-selection for a given field
 */
export function siteMatchesMultiFilter(
  site: SiteRecord,
  key: 'sector' | 'generalAdmin' | 'subSector' | 'competentAdmin' | 'classification' | 'status' | 'obstacleReason',
  filterValue: string | string[] | undefined | null
): boolean {
  const activeValues = toFilterArray(filterValue);
  if (activeValues.length === 0) return true;

  if (key === 'sector') {
    return activeValues.some(
      (sec) => isRecordInSector(sec, site) || String(site.sector || '').trim() === sec
    );
  }

  if (key === 'classification' || key === 'excelStatus') {
    const siteCat = getSiteClassification(site);
    const rawCls = String(site.classification || site.excelStatus || site.rawRecord?.['التصنيف'] || '').trim();
    const normRawCls = (rawCls === 'تعذر' || rawCls === 'متعذرات' || rawCls === 'متعذر') ? 'متعذر' : rawCls;
    const normSiteCat = (siteCat === 'تعذر' || siteCat === 'متعذرات' || siteCat === 'متعذر') ? 'متعذر' : siteCat;
    return activeValues.some((c) => {
      const normC = (c === 'تعذر' || c === 'متعذرات' || c === 'متعذر') ? 'متعذر' : c;
      return normSiteCat === normC || normRawCls === normC;
    });
  }

  if (key === 'status') {
    const siteCat = getSiteClassification(site);
    const siteStatus = String(site.status || '').trim();
    const siteCls = String(site.classification || '').trim();

    return activeValues.some((st) => {
      if (st === siteCat || siteStatus === st || siteCls === st) return true;
      if (st === 'المكتمل' || st === 'Completed') return isClassificationCompleted(siteCat);
      if (st === 'متعذر / معوقات' || st === 'Blocked / On Hold') return isClassificationBlocked(siteCat);
      return false;
    });
  }

  const val = String(site[key] || '').trim();
  return activeValues.includes(val);
}

/**
 * Helper to toggle an item in a multi-select array
 */
export function toggleFilterValue(
  current: string | string[] | undefined | null,
  item: string
): string[] {
  const existing = toFilterArray(current);
  const trimmed = item.trim();
  if (existing.includes(trimmed)) {
    return existing.filter((x) => x !== trimmed);
  } else {
    return [...existing, trimmed];
  }
}

/**
 * Converts various date formats (Excel serial number like 45656, ISO date string, or Date)
 * into a valid YYYY-MM-DD string suitable for HTML date inputs (<input type="date">).
 */
export function parseToDateInputValue(val: any): string {
  if (val === undefined || val === null || val === '') return '';
  if (typeof val === 'number') {
    // Excel serial dates: e.g. 45656 is around year 2024
    if (val > 30000 && val < 70000) {
      const d = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return '';
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return '';
    // If it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    // If it's ISO like 2024-12-30T...
    if (trimmed.includes('T')) return trimmed.split('T')[0];
    // If it's pure digits like "45656"
    const num = Number(trimmed);
    if (!isNaN(num) && num > 30000 && num < 70000) {
      const d = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    // Try DD/MM/YYYY or DD-MM-YYYY
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(trimmed)) {
      const parts = trimmed.split(/[\/\-]/);
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    // Try native Date parsing
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return trimmed;
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  return '';
}

