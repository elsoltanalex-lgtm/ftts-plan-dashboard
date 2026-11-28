// src/utils/reasonBreakdown.ts
// Groups FTTS "متعذر" (Unfeasible) and "معوقات" (Obstacles) sites by exact normalized reason
// so the sum of breakdown rows ALWAYS matches the exact count in "جدول حصر الموقف والمسارات".

import type { SiteRecord } from '../types/dashboard';
import { getSiteClassification } from '../data/dashboardData';

export type BreakdownKind = 'unfeasible' | 'obstacles';

export interface ReasonBreakdownItem {
  reason: string;
  count: number;
  percentage: number;
  sites: SiteRecord[];
}

export interface ReasonBreakdownResult {
  statusLabel: string;
  kind: BreakdownKind;
  totalCount: number;
  items: ReasonBreakdownItem[];
}

const EMPTY_REASON_LABEL = 'غير محدد / أخرى';

const PLACEHOLDER_REASONS = new Set([
  '',
  '-',
  '—',
  '--',
  '0',
  'n/a',
  'na',
  'null',
  'undefined',
  'none',
  'لا يوجد',
  'لايوجد',
  'لا يوجد تعذر',
  'لا يوجد معوقات',
  'لا يوجد معوق',
  'لا توجد معوقات',
  'بدون',
  'غير محدد',
]);

export function getBreakdownKind(status: string): BreakdownKind | null {
  const s = String(status || '').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  if (s.includes('معوق')) return 'obstacles';
  if (s.includes('متعذر') || s.includes('تعذر') || s.includes('متعثر')) return 'unfeasible';
  return null;
}

export function isDrilldownBreakdownStatus(status: string): boolean {
  return getBreakdownKind(status) !== null;
}

function cleanReasonText(val: unknown): string {
  const str = String(val ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!str) return '';
  const lower = str.toLowerCase();
  if (PLACEHOLDER_REASONS.has(lower)) return '';
  return str;
}

function normalizeGroupingKey(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670]/g, '') // Arabic diacritics (e.g. التعّذر -> التعذر)
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Extracts the detailed obstacle or unfeasibility reason across WE, Vodafone, and Orange record schemas.
 */
export function extractSiteDetailedReason(site: SiteRecord, kind: BreakdownKind): string {
  const raw: Record<string, any> = (site.rawRecord && typeof site.rawRecord === 'object' ? site.rawRecord : {}) as Record<string, any>;

  const candidates: unknown[] =
    kind === 'obstacles'
      ? [
          raw['اسباب المعوق'],
          raw['أسباب المعوق'],
          raw['سبب المعوق'],
          raw['سبب المعوقات'],
          raw['اسباب المعوقات'],
          raw['أسباب المعوقات'],
          raw['سبب المعوق او التعذر'],
          raw['اسباب التعّذر'],
          raw['اسباب التعذر'],
          raw['أسباب التعذر'],
          raw['سبب التعذر'],
          raw['الموقف التفصيلي'],
          raw['الموقف التنفيذي'],
          site.obstacleReason,
          (site as any).obstacleType,
          raw['الملاحظات'],
          site.notes,
        ]
      : [
          raw['اسباب التعّذر'],
          raw['اسباب التعذر'],
          raw['أسباب التعذر'],
          raw['سبب التعذر'],
          raw['سبب المعوق او التعذر'],
          raw['اسباب المعوق'],
          raw['أسباب المعوق'],
          raw['سبب المعوق'],
          raw['الموقف التفصيلي'],
          raw['الموقف التنفيذي'],
          site.obstacleReason,
          (site as any).obstacleType,
          raw['الملاحظات'],
          site.notes,
        ];

  for (const c of candidates) {
    const cleaned = cleanReasonText(c);
    if (cleaned) return cleaned;
  }

  return EMPTY_REASON_LABEL;
}

/**
 * Builds an exact reason-by-reason breakdown for a clicked status row in "جدول حصر الموقف والمسارات".
 * Matches records via `getSiteClassification(site) === statusLabel` so sum(items.count) === clicked table count.
 */
export function buildReasonBreakdown(
  sites: SiteRecord[],
  statusLabel: string
): ReasonBreakdownResult {
  const kind: BreakdownKind = getBreakdownKind(statusLabel) || 'unfeasible';

  const matchingSites = sites.filter((site) => {
    if (!site) return false;
    return getSiteClassification(site) === statusLabel;
  });

  const totalCount = matchingSites.length;
  const groupMap = new Map<string, { label: string; sites: SiteRecord[] }>();

  matchingSites.forEach((site) => {
    const reasonLabel = extractSiteDetailedReason(site, kind);
    const groupKey =
      reasonLabel === EMPTY_REASON_LABEL
        ? '__empty__'
        : normalizeGroupingKey(reasonLabel);

    const existing = groupMap.get(groupKey);
    if (existing) {
      existing.sites.push(site);
    } else {
      groupMap.set(groupKey, {
        label: reasonLabel,
        sites: [site],
      });
    }
  });

  const items: ReasonBreakdownItem[] = Array.from(groupMap.values())
    .map((entry) => ({
      reason: entry.label,
      count: entry.sites.length,
      percentage: totalCount > 0 ? Number(((entry.sites.length / totalCount) * 100).toFixed(1)) : 0,
      sites: entry.sites,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (a.reason === EMPTY_REASON_LABEL) return 1;
      if (b.reason === EMPTY_REASON_LABEL) return -1;
      return a.reason.localeCompare(b.reason, 'ar');
    });

  return {
    statusLabel,
    kind,
    totalCount,
    items,
  };
}
