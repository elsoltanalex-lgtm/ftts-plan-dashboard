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
 * Normalizes Internal Path (المسار الداخلي) values:
 * Unifies "تم الانتهاء بالكامل" and "تم الانتهاء" into the single canonical label "تم الانتهاء".
 */
export function normalizeEtahaInternalPath(str?: string | null): string {
  if (!str) return '';
  const trimmed = String(str).replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  const norm = normalizeArabicText(trimmed);
  if (
    !norm.includes('لم يتم') &&
    !norm.includes('لم ينته') &&
    !norm.includes('معوق') &&
    !norm.includes('تعذر') &&
    (norm === 'تم الانتهاء بالكامل' || norm === 'تم الانتهاء' || norm.startsWith('تم الانتهاء بالكامل'))
  ) {
    return 'تم الانتهاء';
  }
  return trimmed;
}

/**
 * Normalizes Delivery Status (موقف التسليم) values:
 * Replaces "مؤجل من العميل" (and spelling variants of "متوقف علي العميل") with "متوقف على العميل".
 */
export function normalizeEtahaDeliveryStatus(str?: string | null): string {
  if (!str) return '';
  const trimmed = String(str).replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  const norm = normalizeArabicText(trimmed);
  if (
    norm === 'مؤجل من العميل' ||
    norm.includes('مؤجل من العميل') ||
    norm === 'متوقف علي العميل' ||
    norm === 'متوقف على العميل'
  ) {
    return 'متوقف على العميل';
  }
  return trimmed;
}

/**
 * Checks if the internal path (المسار الداخلي) is completed:
 * Matches "تم الانتهاء" (including legacy "تم الانتهاء بالكامل") in internal path fields
 */
export function isEtahaInternalDone(site: any): boolean {
  if (!site) return false;
  const raw = site.rawRecord || site;
  const val =
    site.internalPath ||
    raw.internalPath ||
    raw.internal_path ||
    raw['المسار الداخلي'] ||
    raw['المسار الداخلى'] ||
    raw['المسار_الداخلي'] ||
    raw['المسار_الداخلى'] ||
    '';
  const norm = normalizeArabicText(normalizeEtahaInternalPath(val));
  if (!norm || norm.includes('لم يتم') || norm.includes('لم ينته') || norm.includes('معوق') || norm.includes('تعذر')) {
    return false;
  }
  return norm.includes('تم الانتهاء') || norm === 'منتهي' || norm === 'تم';
}

/**
 * Checks strictly whether the external path field (المسار الخارجي) itself is "تم الانتهاء"
 */
export function isEtahaExternalPathOnlyDone(site: any): boolean {
  if (!site) return false;
  const raw = site.rawRecord || site;
  const ext =
    site.externalPath ||
    raw.externalPath ||
    raw.external_path ||
    raw['المسار الخارجي'] ||
    raw['المسار_الخارجي'] ||
    '';
  const normExt = normalizeArabicText(ext);
  if (!normExt || normExt.includes('لم يتم') || normExt.includes('لم ينته') || normExt.includes('معوق') || normExt.includes('تعذر')) {
    return false;
  }
  return normExt.includes('تم الانتهاء') || normExt === 'منتهي' || normExt === 'تم';
}

/**
 * Checks if BOTH Internal Path === "تم الانتهاء" AND External Path === "تم الانتهاء"
 */
export function isEtahaBothPathsDone(site: any): boolean {
  return isEtahaInternalDone(site) && isEtahaExternalPathOnlyDone(site);
}

/**
 * Checks if Delivery Status (موقف التسليم) === "متوقف على العميل" (including legacy "مؤجل من العميل")
 */
export function isEtahaPausedOnClient(site: any): boolean {
  if (!site) return false;
  const raw = site.rawRecord || site;
  const del =
    site.deliveryStatus ||
    site.deliveryArea ||
    raw.deliveryStatus ||
    raw.delivery_status ||
    raw['موقف التسليم'] ||
    raw['موقف_التسليم'] ||
    '';
  return normalizeEtahaDeliveryStatus(del) === 'متوقف على العميل';
}

/**
 * Checks if the external path (المسار الخارجي) is completed:
 * Matches "تم الانتهاء" in external path, or "تم الانتهاء والتسليم", "تم خارجي" in classification
 */
export function isEtahaExternalDone(site: any): boolean {
  if (!site) return false;
  const raw = site.rawRecord || site;
  const ext =
    site.externalPath ||
    raw.externalPath ||
    raw.external_path ||
    raw['المسار الخارجي'] ||
    raw['المسار_الخارجي'] ||
    '';
  const cls =
    site.excelStatus ||
    site.classification ||
    raw.classification ||
    raw['التصنيف'] ||
    '';
  const normExt = normalizeArabicText(ext);
  const normCls = normalizeArabicText(cls);

  const isExtCompleted =
    !normExt.includes('لم يتم') &&
    !normExt.includes('معوق') &&
    !normExt.includes('تعذر') &&
    (normExt.includes('تم الانتهاء') || normExt === 'منتهي' || normExt === 'تم');

  const isClsCompleted =
    !normCls.includes('لم يتم') &&
    !normCls.includes('معوق') &&
    !normCls.includes('تعذر') &&
    (normCls.includes('تم الانتهاء') || normCls.includes('تم خارجي'));

  return isExtCompleted || isClsCompleted;
}

/**
 * Checks if the project is delivered (تم التسليم):
 * Matches "تم التسليم" in delivery status, or "تم الانتهاء والتسليم" in classification
 */
export function isEtahaDelivered(site: any): boolean {
  if (!site) return false;
  const raw = site.rawRecord || site;
  const del =
    site.deliveryStatus ||
    site.deliveryArea ||
    raw.deliveryStatus ||
    raw.delivery_status ||
    raw['موقف التسليم'] ||
    raw['موقف_التسليم'] ||
    '';
  const cls =
    site.excelStatus ||
    site.classification ||
    raw.classification ||
    raw['التصنيف'] ||
    '';
  const normDel = normalizeArabicText(del);
  const normCls = normalizeArabicText(cls);

  // Check delivery status field with negative guards
  if (
    !normDel.includes('لم يتم') &&
    !normDel.includes('لم ينته') &&
    !normDel.includes('معوق') &&
    !normDel.includes('تعذر') &&
    !normDel.includes('مؤجل') &&
    !normDel.includes('متوقف') &&
    !normDel.includes('منتظر') &&
    (normDel.includes('تم التسليم') || normDel === 'مسلم' || normDel === 'تم')
  ) {
    return true;
  }

  // Check classification field with negative guards
  if (
    !normCls.includes('لم يتم') &&
    !normCls.includes('معوق') &&
    !normCls.includes('تعذر') &&
    !normCls.includes('مؤجل') &&
    !normCls.includes('متوقف') &&
    (normCls.includes('تم الانتهاء والتسليم') || normCls.includes('تم التسليم') || normCls === 'تسليم')
  ) {
    return true;
  }

  return false;
}

/**
 * Computes live KPI numbers for Availability projects directly from the dataset
 */
export function computeEtahaKpis(sites: any[]) {
  const totalSites = sites.length;
  let internalDone = 0;
  let externalDone = 0;
  let delivered = 0;
  let bothPathsDone = 0;
  let pausedOnClient = 0;

  for (const s of sites) {
    const intDone = isEtahaInternalDone(s);
    const extDone = isEtahaExternalDone(s);
    if (intDone) internalDone++;
    if (extDone) externalDone++;
    if (isEtahaDelivered(s)) delivered++;
    if (intDone && isEtahaExternalPathOnlyDone(s)) bothPathsDone++;
    if (isEtahaPausedOnClient(s)) pausedOnClient++;
  }

  return {
    totalSites,
    internalDone,
    externalDone,
    delivered,
    bothPathsDone,
    pausedOnClient,
  };
}
