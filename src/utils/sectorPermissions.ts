// src/utils/sectorPermissions.ts
// Robust normalization, canonical grouping, and permission matching for Egyptian telecom sectors

export const CANONICAL_SECTORS = [
  'قطاع إسكندرية والساحل',
  'قطاع شرق الدلتا',
  'قطاع مناطق غرب الدلتا',
  'قطاع مناطق وسط الدلتا',
  'قطاع مناطق السويس',
  'قطاع مناطق الإسماعيلية',
  'قطاع مناطق القاهرة الكبرى',
  'قطاع مناطق الجيزة وأكتوبر',
  'قطاع مناطق الصعيد',
] as const;

export type CanonicalSector = typeof CANONICAL_SECTORS[number];

/**
 * Standardize Arabic text for fuzzy sector matching:
 * - Unifies Hamzas (أ, إ, آ -> ا)
 * - Unifies Taa Marbuta (ة -> ه)
 * - Unifies Alef Maqsura (ى -> ي)
 * - Removes common organizational prefixes (قطاع, مناطق, منطقة, رئاسة, رئاسه)
 * - Cleans spaces and punctuation
 */
export function normalizeSectorString(text?: string | null): string {
  if (!text) return '';
  return text
    .toString()
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/^(قطاع|مناطق|منطقة|رئاسة|رئاسه)\s+/g, '')
    .replace(/^(قطاع|مناطق|منطقة|رئاسة|رئاسه)\s+/g, '') // twice if "قطاع مناطق"
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Maps any variant/synonym of a sector name to its official unified Canonical Name:
 * 1. شرق الدلتا: ("قطاع شرق الدلتا 1", "شرق الدلتا 2", "قطاع مناطق شرق الدلتا 1", ...) -> "قطاع شرق الدلتا"
 * 2. إسكندرية والساحل: ("قطاع مناطق مطروح والساحل الشمالي", "الساحل الشمالي", "الإسكندرية", "مطروح", ...) -> "قطاع إسكندرية والساحل"
 * 3. غرب الدلتا: ("مناطق غرب الدلتا", "قطاع مناطق غرب الدلتا", "غرب الدلتا") -> "قطاع مناطق غرب الدلتا"
 * 4. وسط الدلتا: ("مناطق وسط الدلتا", "قطاع مناطق وسط الدلتا", "وسط الدلتا") -> "قطاع مناطق وسط الدلتا"
 * 5. السويس: ("منطقة السويس", "قطاع مناطق السويس", "السويس") -> "قطاع مناطق السويس"
 * 6. الإسماعيلية: ("منطقة الاسماعيليه", "قطاع مناطق الإسماعيلية", "الإسماعيلية") -> "قطاع مناطق الإسماعيلية"
 */
export function toCanonicalSector(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = raw.toString().trim();
  const norm = normalizeSectorString(trimmed);

  if (norm === 'all' || trimmed.toUpperCase() === 'ALL' || norm.includes('كافه') || norm.includes('الاداره العامه المركزيه')) {
    return 'ALL';
  }

  // 1. شرق الدلتا / المنطقة الشرقية
  if (norm.includes('شرق')) {
    return 'قطاع شرق الدلتا';
  }

  // 2. إسكندرية والساحل ومطروح
  if (norm.includes('اسكندر') || norm.includes('ساحل') || norm.includes('مطروح')) {
    return 'قطاع إسكندرية والساحل';
  }

  // 3. غرب الدلتا / المنطقة الغربية
  if (norm.includes('غرب')) {
    return 'قطاع مناطق غرب الدلتا';
  }

  // 4. وسط الدلتا
  if (norm.includes('وسط الدلتا')) {
    return 'قطاع مناطق وسط الدلتا';
  }

  // 5. الإسماعيلية
  if (norm.includes('اسماعيل')) {
    return 'قطاع مناطق الإسماعيلية';
  }

  // 6. السويس وسيناء
  if (norm.includes('سويس') || norm.includes('سيناء')) {
    return 'قطاع مناطق السويس';
  }

  // 7. القاهرة الكبرى
  if (norm.includes('قاهره') || norm.includes('قاهرة')) {
    return 'قطاع مناطق القاهرة الكبرى';
  }

  // 8. الجيزة وأكتوبر
  if (norm.includes('اكتوبر') || norm.includes('جيزه')) {
    return 'قطاع مناطق الجيزة وأكتوبر';
  }

  // 9. الصعيد / قبلي / المنطقة الجنوبية
  if (norm.includes('صعيد') || norm.includes('قبلي') || norm.includes('جنوب')) {
    return 'قطاع مناطق الصعيد';
  }

  return trimmed;
}

/**
 * Check if two sector names match under canonical and fuzzy normalization rules.
 */
export function isSectorMatch(userSector?: string | null, targetSector?: string | null): boolean {
  if (!userSector) return false;
  if (userSector.toUpperCase() === 'ALL') return true;
  if (!targetSector) return false;

  const uCanon = toCanonicalSector(userSector);
  const tCanon = toCanonicalSector(targetSector);

  // Direct canonical match
  if (uCanon && tCanon && uCanon === tCanon) return true;

  const uNorm = normalizeSectorString(userSector);
  const tNorm = normalizeSectorString(targetSector);

  if (!uNorm || !tNorm) return false;
  if (uNorm === tNorm) return true;

  // Geographic checks:
  if (uCanon === 'قطاع إسكندرية والساحل') {
    return tNorm.includes('اسكندر') || tNorm.includes('ساحل') || tNorm.includes('مطروح');
  }
  if (uCanon === 'قطاع شرق الدلتا') {
    return tNorm.includes('شرق الدلتا');
  }
  if (uCanon === 'قطاع مناطق غرب الدلتا') {
    return tNorm.includes('غرب الدلتا');
  }
  if (uCanon === 'قطاع مناطق وسط الدلتا') {
    return tNorm.includes('وسط الدلتا');
  }
  if (uCanon === 'قطاع مناطق السويس') {
    return tNorm.includes('سويس') || tNorm.includes('سيناء');
  }
  if (uCanon === 'قطاع مناطق الإسماعيلية') {
    return tNorm.includes('اسماعيل');
  }

  return uNorm.includes(tNorm) || tNorm.includes(uNorm);
}

/**
 * Extract canonical sector name from any record structure (WeRecord or SiteRecord).
 */
export function extractRecordSector(record: any): string {
  if (!record) return '';
  const raw =
    record['Sectore'] ||
    record['Sectores'] ||
    record['sector'] ||
    record.sector ||
    record['Exc sector'] ||
    record['Exc Sectores'] ||
    record['Zone'] ||
    '';
  return toCanonicalSector(raw);
}

/**
 * Checks if a record belongs strictly to a user's sector domain.
 */
export function isRecordInSector(userSector?: string | null, record?: any): boolean {
  if (!userSector) return false;
  if (userSector.toUpperCase() === 'ALL') return true;
  if (!record) return false;

  const uCanon = toCanonicalSector(userSector);

  // Fast check: Check record sector directly
  const recordSector = record.sector || record['Sectore'] || record['sector'] || record['رئاسة قطاعات التنفيذ'] || record['رئاسة القطاعات '] || record['رئاسة القطاعات'];
  if (recordSector) {
    if (String(recordSector).trim().toLowerCase() === String(userSector).trim().toLowerCase()) {
      return true;
    }
    if (normalizeSectorString(recordSector) === normalizeSectorString(userSector)) {
      return true;
    }
    if (toCanonicalSector(recordSector) === uCanon) {
      return true;
    }
  }

  const code = (record.siteCode || record['site code'] || (record as any).site_code || '').toString();
  const sectore = normalizeSectorString(record['Sectore'] || record['Sectores'] || record['Zone'] || '');
  const excSector = normalizeSectorString(record['Exc sector'] || record['Exc Sectores'] || '');
  const siteSector = normalizeSectorString(record['sector'] || record.sector || '');
  const generalAdmin = normalizeSectorString(record['generalAdmin'] || record['اداره التنفيذ المختصه'] || record['Exc Zone'] || record['الادارة العامة لتنفيذ الشبكات'] || '');
  const notes = normalizeSectorString(record['notes'] || record['الملاحظات'] || '');

  // 1. إسكندرية والساحل ومطروح
  if (uCanon === 'قطاع إسكندرية والساحل') {
    return (
      sectore.includes('ساحل') ||
      sectore.includes('مطروح') ||
      sectore.includes('اسكندر') ||
      siteSector.includes('ساحل') ||
      siteSector.includes('مطروح') ||
      siteSector.includes('اسكندر') ||
      excSector.includes('اسكندرية والساحل') ||
      generalAdmin.includes('اسكندر') ||
      generalAdmin.includes('ساحل')
    );
  }

  // 2. شرق الدلتا
  if (uCanon === 'قطاع شرق الدلتا') {
    return (
      sectore.includes('شرق الدلتا') ||
      siteSector.includes('شرق الدلتا') ||
      generalAdmin.includes('شرق الدلتا')
    );
  }

  // 3. غرب الدلتا
  if (uCanon === 'قطاع مناطق غرب الدلتا') {
    return (
      sectore.includes('غرب الدلتا') ||
      siteSector.includes('غرب الدلتا') ||
      generalAdmin.includes('غرب الدلتا')
    );
  }

  // 4. وسط الدلتا
  if (uCanon === 'قطاع مناطق وسط الدلتا') {
    return (
      sectore.includes('وسط الدلتا') ||
      siteSector.includes('وسط الدلتا') ||
      generalAdmin.includes('وسط الدلتا')
    );
  }

  // 5. الإسماعيلية
  if (uCanon === 'قطاع مناطق الإسماعيلية') {
    return (
      sectore.includes('اسماعيل') ||
      siteSector.includes('اسماعيل') ||
      generalAdmin.includes('اسماعيل') ||
      code.startsWith('LSINI')
    );
  }

  // 6. السويس
  if (uCanon === 'قطاع مناطق السويس') {
    return (
      sectore.includes('سويس') ||
      siteSector.includes('سويس') ||
      generalAdmin.includes('سويس') ||
      sectore.includes('سيناء') ||
      code.startsWith('LSINS') ||
      code.startsWith('BSIN')
    );
  }

  // 7. القاهرة الكبرى
  if (uCanon === 'قطاع مناطق القاهرة الكبرى') {
    return (
      sectore.includes('قاهره') ||
      sectore.includes('قاهرة') ||
      siteSector.includes('قاهره') ||
      siteSector.includes('قاهرة') ||
      generalAdmin.includes('قاهره')
    );
  }

  // 8. الجيزة وأكتوبر
  if (uCanon === 'قطاع مناطق الجيزة وأكتوبر') {
    return (
      sectore.includes('اكتوبر') ||
      sectore.includes('جيزه') ||
      siteSector.includes('اكتوبر') ||
      siteSector.includes('جيزه') ||
      generalAdmin.includes('اكتوبر') ||
      generalAdmin.includes('جيزه')
    );
  }

  // 9. الصعيد
  if (uCanon === 'قطاع مناطق الصعيد') {
    return (
      sectore.includes('صعيد') ||
      sectore.includes('قبلي') ||
      siteSector.includes('صعيد') ||
      siteSector.includes('قبلي') ||
      generalAdmin.includes('قبلي')
    );
  }

  return isSectorMatch(userSector, extractRecordSector(record));
}
