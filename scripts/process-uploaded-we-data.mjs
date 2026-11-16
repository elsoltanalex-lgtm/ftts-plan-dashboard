import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const uploadedPath = 'C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1793454977619_18fca5d5.xlsx';
console.log(`Reading Excel file from ${uploadedPath}...`);
const wb = XLSX.readFile(uploadedPath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
console.log(`Total rows in Excel: ${rawRows.length}`);

function cleanStr(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

function normalize(text) {
  if (!text) return '';
  return text.toString().trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase();
}

function resolveCanonicalSector(row) {
  const code = cleanStr(row[' Site code'] || row['site code']);
  const manateq = cleanStr(row['قطاع المناطق']);
  const edara = cleanStr(row['الادارة العامة لتنفيذ الشبكات']);
  const tanfeez = cleanStr(row['قطاع التنفيذ']);
  const allText = `${manateq} ${edara} ${tanfeez}`;
  const norm = normalize(allText);

  if (norm.includes('شرق الدلتا')) return 'قطاع شرق الدلتا';
  if (norm.includes('اسكندر') || norm.includes('ساحل') || norm.includes('مطروح')) return 'قطاع إسكندرية والساحل';
  if (norm.includes('غرب الدلتا')) return 'قطاع مناطق غرب الدلتا';
  if (norm.includes('وسط الدلتا')) return 'قطاع مناطق وسط الدلتا';
  if (norm.includes('اسماعيل') || code.startsWith('LSINI')) return 'قطاع مناطق الإسماعيلية';
  if (norm.includes('سويس') || norm.includes('سيناء') || code.startsWith('LSINS') || code.startsWith('BSIN')) return 'قطاع مناطق السويس';
  if (norm.includes('اكتوبر') || norm.includes('جيزه')) return 'قطاع مناطق الجيزة وأكتوبر';
  if (norm.includes('قاهره') || norm.includes('قاهرة')) return 'قطاع مناطق القاهرة الكبرى';
  if (norm.includes('صعيد') || norm.includes('قبلي')) return 'قطاع مناطق الصعيد';

  return manateq || tanfeez || 'قطاع عام';
}

/**
 * Approved 8 classifications:
 * (تم الانتهاء، تم التشغيل فايبر، جاري المعاينة، جاري تصاريح، جاري كهربي، جاري مدني، متعذر، معوقات)
 */
function normalizeClassification(raw) {
  const s = cleanStr(raw);
  if (s.includes('انتهاء')) return 'تم الانتهاء';
  if (s.includes('تشغيل')) return 'تم التشغيل فايبر';
  // Rule: Cancel "تم مدني" -> "جاري كهربي"
  if (s.includes('مدن') && s.includes('تم')) return 'جاري كهربي';
  if (s.includes('كهرب')) return 'جاري كهربي';
  // Rule: Cancel "جاري العمل" -> "جاري مدني"
  if (s.includes('عمل') || s.includes('مدن')) return 'جاري مدني';
  if (s.includes('تصاريح')) return 'جاري تصاريح';
  if (s.includes('معاين')) return 'جاري المعاينة';
  if (s.includes('متعذر') || s.includes('متعثر')) return 'متعذر';
  if (s.includes('معوق')) return 'معوقات';
  return 'جاري المعاينة';
}

/**
 * 4 Aggregate Categories:
 * 1. Completed (المكتمل): تم الانتهاء، تم التشغيل فايبر
 * 2. In Progress (جاري التنفيذ): جاري مدني، جاري كهربي، جاري تصاريح
 * 3. Planned (مخطط): جاري المعاينة
 * 4. Blocked / On Hold (معوقات / متعذر): معوقات، متعذر
 */
function toAggregateCategory(tasneef) {
  if (tasneef === 'تم الانتهاء' || tasneef === 'تم التشغيل فايبر') {
    return 'Completed';
  }
  if (['جاري مدني', 'جاري كهربي', 'جاري تصاريح'].includes(tasneef)) {
    return 'In Progress';
  }
  if (tasneef === 'جاري المعاينة') {
    return 'Planned';
  }
  if (['متعذر', 'معوقات'].includes(tasneef)) {
    return 'Blocked / On Hold';
  }
  return 'In Progress';
}

// Inspect classification counts
const classCounts = {};
const categoryCounts = {};
const sectorCounts = {};

rawRows.forEach((r, i) => {
  const normClass = normalizeClassification(r['التصنيف']);
  const cat = toAggregateCategory(normClass);
  const sec = resolveCanonicalSector(r);

  classCounts[normClass] = (classCounts[normClass] || 0) + 1;
  categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  sectorCounts[sec] = (sectorCounts[sec] || 0) + 1;
});

console.log('Classification Counts (Strict 8 items):');
console.table(classCounts);
console.log('Aggregate Category Counts (4 items):');
console.table(categoryCounts);
console.log('Sector Counts (Canonical 9 items):');
console.table(sectorCounts);

