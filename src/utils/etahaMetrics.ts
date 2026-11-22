// src/utils/etahaMetrics.ts
// Accurate normalization and KPI calculation for Availability (الإتاحة) projects

/**
 * Normalizes Arabic text for flexible, 100% accurate comparison:
 * - Removes zero-width and invisible formatting characters
 * - Collapses consecutive spaces and trims edges
 * - Normalizes Alif variants (أ, إ, آ -> ا)
 * - Normalizes Taa Marbouta / Haa (ة -> ه)
 * - Normalizes Yaa / Alif Maqsura (ى -> ي)
 */
export function normalizeArabicText(str?: string | null): string {
  if (!str) return '';
  return String(str)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase();
}

/**
 * Checks if the internal path (المسار الداخلي) is completed:
 * Matches "تم الانتهاء", "تم الانتهاء بالكامل", "منتهي" in internal path fields
 */
export function isEtahaInternalDone(site: any): boolean {
  if (!site) return false;
  const raw = site.rawRecord || site;
  const val =
    site.internalPath ||
    raw['المسار الداخلي'] ||
    raw['المسار الداخلى'] ||
    raw['المسار_الداخلي'] ||
    raw['المسار_الداخلى'] ||
    raw['موقف اللحامات'] ||
    raw['موقف_اللحامات'] ||
    '';
  const norm = normalizeArabicText(val);
  if (!norm || norm.includes('لم يتم') || norm.includes('لم ينته') || norm.includes('معوق') || norm.includes('تعذر')) {
    return false;
  }
  return norm.includes('تم الانتهاء') || norm === 'منتهي' || norm === 'تم';
}

/**
 * Checks if the external path (المسار الخارجي) is completed:
 * Matches "تم الانتهاء" in external path, or "تم الانتهاء والتسليم", "تم خارجي" in classification
 */
export function isEtahaExternalDone(site: any): boolean {
  if (!site) return false;
  const raw = site.rawRecord || site;
  const ext = site.externalPath || raw['المسار الخارجي'] || raw['المسار_الخارجي'] || '';
  const cls = site.excelStatus || site.classification || raw['التصنيف'] || '';
  const normExt = normalizeArabicText(ext);
  const normCls = normalizeArabicText(cls);
  const isExtCompleted = !normExt.includes('لم يتم') && (normExt.includes('تم الانتهاء') || normExt === 'منتهي');
  return (
    isExtCompleted ||
    normCls.includes('تم الانتهاء') ||
    normCls.includes('تم خارجي')
  );
}

/**
 * Checks if the project is delivered (تم التسليم):
 * Matches "تم التسليم" in delivery status, or "تم الانتهاء والتسليم" in classification
 */
export function isEtahaDelivered(site: any): boolean {
  if (!site) return false;
  const raw = site.rawRecord || site;
  const del = site.deliveryStatus || site.deliveryArea || raw['موقف التسليم'] || raw['موقف_التسليم'] || '';
  const cls = site.excelStatus || site.classification || raw['التصنيف'] || '';
  const normDel = normalizeArabicText(del);
  const normCls = normalizeArabicText(cls);
  return (
    normDel.includes('تم التسليم') ||
    normDel === 'مسلم' ||
    normCls.includes('التسليم')
  );
}

/**
 * Computes live KPI numbers for Availability projects directly from the dataset
 */
export function computeEtahaKpis(sites: any[]) {
  const totalSites = sites.length;
  let internalDone = 0;
  let externalDone = 0;
  let delivered = 0;

  for (const s of sites) {
    if (isEtahaInternalDone(s)) internalDone++;
    if (isEtahaExternalDone(s)) externalDone++;
    if (isEtahaDelivered(s)) delivered++;
  }

  return {
    totalSites,
    internalDone,
    externalDone,
    delivered,
  };
}
