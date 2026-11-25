// src/utils/specialTarget.ts
// Single unified predicate for Special Target detection across badges, KPIs, filters, modals, and API hooks.

function parseSpecialTargetValue(val: unknown): boolean | null {
  if (val === true || val === 1) return true;
  if (val === false || val === 0 || val === null || val === undefined) return false;
  if (typeof val === 'string') {
    const norm = val
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    if (!norm || norm === 'false' || norm === '0' || norm === 'no' || norm === 'لا' || norm === 'null' || norm === 'undefined') {
      return false;
    }
    if (
      norm === 'true' ||
      norm === '1' ||
      norm === 'yes' ||
      norm === 'نعم' ||
      norm === 'special target' ||
      norm === 'سبيشال تارجت'
    ) {
      return true;
    }
  }
  return null;
}

/**
 * Unified Special Target predicate used across WE, Vodafone, Orange, Availability,
 * main dashboard badges/KPIs, and opened Special Target lists/modals.
 * Guarantees badge count === opened list row count.
 */
export function isWeSpecialTarget(record: any): boolean {
  if (!record || typeof record !== 'object') return false;

  const sources = [
    record,
    record.rawRecord && typeof record.rawRecord === 'object' ? record.rawRecord : null,
    record.data && typeof record.data === 'object' ? record.data : null,
  ].filter(Boolean);

  for (const src of sources) {
    const candidates = [
      src.specialTarget,
      src.special_target,
      src['سبيشال تارجت'],
      src['سبيشال_تارجت'],
      src['Special Target'],
    ];
    for (const c of candidates) {
      const parsed = parseSpecialTargetValue(c);
      if (parsed === true) return true;
    }
  }

  return false;
}

// Alias for clarity across all operators / modules
export const isSpecialTargetRecord = isWeSpecialTarget;
