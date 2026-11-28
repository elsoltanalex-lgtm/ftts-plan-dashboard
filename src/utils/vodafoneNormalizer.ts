// src/utils/vodafoneNormalizer.ts
// Single Canonical Record Normalizer & Search/Code Matcher for Vodafone FTTS

import type { VodafoneRecord } from '../types/vodafone';
import type { SiteRecord } from '../types/dashboard';
import { normalizeSectorName } from './sectorPermissions';

/**
 * Normalizes a Vodafone site code into a canonical lookup key for search & duplicate matching:
 * - Trims whitespace & uppercases
 * - Strips operator prefixes (VDF-, VODAFONE-)
 * - Strips leading zeros for purely numeric codes (e.g. "05749" -> "5749") while keeping "0" intact
 */
export function normalizeCodeKey(code: unknown): string {
  const cleaned = String(code ?? '')
    .trim()
    .toUpperCase()
    .replace(/^(VDF-|VODAFONE-)/i, '')
    .trim();
  if (!cleaned) return '';
  if (/^\d+$/.test(cleaned)) {
    return cleaned.replace(/^0+/, '') || '0';
  }
  return cleaned;
}

/**
 * Normalizes Arabic & English text for reliable case-insensitive, diacritic-insensitive search
 */
export function normalizeSearchText(text: unknown): string {
  return String(text ?? '')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Extracts original trimmed site_code across all legacy/Excel/Supabase column aliases
 */
export function extractVodafoneSiteCode(raw: any): string {
  if (!raw || typeof raw !== 'object') return '';
  const val =
    raw.site_code ??
    raw.Site_code ??
    raw['Site code'] ??
    raw['site code'] ??
    raw[' Site code'] ??
    raw.siteCode ??
    '';
  return String(val ?? '')
    .trim()
    .replace(/^(VDF-|VODAFONE-)/i, '')
    .trim();
}

/**
 * Extracts canonical site_name across all possible column aliases so names are never lost
 */
export function extractVodafoneSiteName(raw: any): string {
  if (!raw || typeof raw !== 'object') return '';
  const candidates = [
    raw.site_name,
    raw['Site name'],
    raw['Site Name'],
    raw.siteName,
    raw['اسم الموقع'],
    raw['إسم الموقع'],
    raw.name,
  ];
  for (const c of candidates) {
    const s = String(c ?? '').trim();
    if (s && s !== 'undefined' && s !== 'null' && s !== '-') {
      return s;
    }
  }
  return '';
}

/**
 * Single canonical normalizer for EVERY Vodafone record on load, search, display, and save.
 */
export function normalizeVodafoneRecord(raw: any): VodafoneRecord {
  const base: Record<string, any> =
    raw && typeof raw === 'object'
      ? raw.data && typeof raw.data === 'object'
        ? { ...raw, ...raw.data }
        : { ...raw }
      : {};

  const siteCode = extractVodafoneSiteCode(base);
  const siteName = extractVodafoneSiteName(base);

  const rawSector = String(
    base['رئاسة قطاعات التنفيذ'] ?? base.sector ?? base['Sectores'] ?? base['Sectore'] ?? ''
  ).trim();
  const rawExecSector = String(
    base['قطاع التنفيذ'] ?? base.execution_sector ?? base['Exc sector'] ?? base['Exc Sectores'] ?? ''
  ).trim();

  const canonSector = normalizeSectorName(rawSector || rawExecSector);
  const canonExecSector = normalizeSectorName(rawExecSector || rawSector);

  const central = String(base['سنترال الربط'] ?? base.central ?? base.exchange ?? '').trim();
  const governorate = String(base['المحافظه'] ?? base['المحافظة'] ?? base.governorate ?? '').trim();
  const status = String(
    base['التصنيف'] ?? base.general_status ?? base.status ?? base.classification ?? base['Site Status'] ?? ''
  ).trim();

  return {
    ...base,
    company: 'Vodafone',
    site_code: siteCode,
    'Site code': siteCode,
    'site code': siteCode,
    ' Site code': siteCode,
    site_name: siteName,
    'Site name': siteName,
    'اسم الموقع': siteName,
    ...(canonSector ? { 'رئاسة قطاعات التنفيذ': canonSector, sector: canonSector } : {}),
    ...(canonExecSector ? { 'قطاع التنفيذ': canonExecSector, execution_sector: canonExecSector } : {}),
    ...(central ? { 'سنترال الربط': central, central } : {}),
    ...(governorate ? { 'المحافظه': governorate, governorate } : {}),
    ...(status ? { 'التصنيف': status, general_status: status, classification: status } : {}),
  };
}

/**
 * Reliable multi-field search matcher (exact/partial code with leading-zero & prefix tolerance,
 * plus Arabic/English normalized site_name, central, sector, governorate, notes, and obstacle reason).
 */
export function matchesSiteSearchQuery(site: SiteRecord, rawQuery: string): boolean {
  const trimmed = String(rawQuery ?? '').trim();
  if (!trimmed) return true;

  const qNorm = normalizeSearchText(trimmed);
  const qCodeKey = normalizeCodeKey(trimmed);

  const raw: Record<string, any> =
    site.rawRecord && typeof site.rawRecord === 'object' ? (site.rawRecord as Record<string, any>) : {};

  // 1. Code matching (exact, partial, normalized key without leading zeros/prefixes)
  const siteCodeStr = String(site.siteCode || extractVodafoneSiteCode(raw) || '').trim();
  const siteCodeKey = normalizeCodeKey(siteCodeStr);
  const idStr = String(site.id || '').trim();
  const idCodeKey = normalizeCodeKey(idStr);

  if (
    siteCodeStr.toLowerCase().includes(qNorm) ||
    idStr.toLowerCase().includes(qNorm) ||
    (qCodeKey && (siteCodeKey === qCodeKey || siteCodeKey.includes(qCodeKey) || idCodeKey.includes(qCodeKey)))
  ) {
    return true;
  }

  // 2. Site name, central, sector, governorate, status, notes, obstacle reason (Arabic/English normalized)
  const rawSiteName = extractVodafoneSiteName(raw);
  const haystacks = [
    site.siteName,
    rawSiteName,
    site.central,
    site.sector,
    site.executionSector,
    site.governorate,
    site.company,
    site.status,
    site.classification,
    site.notes,
    site.obstacleReason,
    site.civilContractor,
    raw['الملاحظات'],
    raw['اسباب التعّذر'],
    raw['اسباب التعذر'],
    raw['اسباب المعوق'],
  ];

  return haystacks.some((h) => h && normalizeSearchText(h).includes(qNorm));
}
