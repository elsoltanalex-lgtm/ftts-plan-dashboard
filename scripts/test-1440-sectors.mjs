import XLSX from 'xlsx';

function normalize(text) {
  if (!text) return '';
  return text.toString().trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase();
}

function toCanonicalSector(raw) {
  if (!raw) return '';
  const norm = normalize(raw);
  if (norm === 'all' || norm.includes('كافه القطاعات') || norm.includes('الاداره العامه المركزيه')) return 'ALL';
  if (norm.includes('شرق الدلتا')) return 'قطاع شرق الدلتا';
  if (norm.includes('اسكندر') || norm.includes('ساحل') || norm.includes('مطروح')) return 'قطاع إسكندرية والساحل';
  if (norm.includes('غرب الدلتا')) return 'قطاع مناطق غرب الدلتا';
  if (norm.includes('وسط الدلتا')) return 'قطاع مناطق وسط الدلتا';
  if (norm.includes('سويس')) return 'قطاع مناطق السويس';
  if (norm.includes('اسماعيل')) return 'قطاع مناطق الإسماعيلية';
  return raw.trim();
}

function resolveSector(row) {
  // Check قطاع المناطق first
  const manateq = toCanonicalSector(row['قطاع المناطق']);
  if (manateq && [
    'قطاع شرق الدلتا',
    'قطاع إسكندرية والساحل',
    'قطاع مناطق غرب الدلتا',
    'قطاع مناطق وسط الدلتا',
    'قطاع مناطق السويس',
    'قطاع مناطق الإسماعيلية'
  ].includes(manateq)) return manateq;

  // Check الادارة العامة لتنفيذ الشبكات
  const edara = toCanonicalSector(row['الادارة العامة لتنفيذ الشبكات']);
  if (edara && [
    'قطاع شرق الدلتا',
    'قطاع إسكندرية والساحل',
    'قطاع مناطق غرب الدلتا',
    'قطاع مناطق وسط الدلتا',
    'قطاع مناطق السويس',
    'قطاع مناطق الإسماعيلية'
  ].includes(edara)) return edara;

  // Check قطاع التنفيذ
  const tanfeez = toCanonicalSector(row['قطاع التنفيذ']);
  if (tanfeez && [
    'قطاع شرق الدلتا',
    'قطاع إسكندرية والساحل',
    'قطاع مناطق غرب الدلتا',
    'قطاع مناطق وسط الدلتا',
    'قطاع مناطق السويس',
    'قطاع مناطق الإسماعيلية'
  ].includes(tanfeez)) return tanfeez;

  // Fallback to regional name (e.g. القاهرة الكبرى, الجيزة و اكتوبر, etc.)
  return row['قطاع المناطق'] || row['قطاع التنفيذ'] || 'غير محدد';
}

const filePath = 'C:/Users/Sherif/Desktop/Copy of Report We 14-10-2026.xlsx';
const wb = XLSX.readFile(filePath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

const sectorCounts = {};
data.forEach(r => {
  const s = resolveSector(r);
  sectorCounts[s] = (sectorCounts[s] || 0) + 1;
});

console.log('=== Sector Resolution across 1440 rows ===');
console.log(sectorCounts);
