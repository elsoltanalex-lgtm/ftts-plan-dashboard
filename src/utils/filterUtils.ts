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

  if (key === 'classification') {
    const siteCat = getSiteClassification(site);
    const rawCls = String(site.classification || '').trim();
    return activeValues.some((c) => siteCat === c || rawCls === c);
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
