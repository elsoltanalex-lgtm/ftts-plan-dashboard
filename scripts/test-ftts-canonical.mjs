import fs from 'fs';

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
  if (norm === 'all' || norm.includes('كافه') || norm.includes('الاداره العامه')) return 'ALL';
  if (norm.includes('شرق الدلتا')) return 'قطاع شرق الدلتا';
  if (norm.includes('اسكندر') || norm.includes('ساحل') || norm.includes('مطروح')) return 'قطاع إسكندرية والساحل';
  if (norm.includes('غرب الدلتا')) return 'قطاع مناطق غرب الدلتا';
  if (norm.includes('وسط الدلتا')) return 'قطاع مناطق وسط الدلتا';
  if (norm.includes('سويس')) return 'قطاع مناطق السويس';
  if (norm.includes('اسماعيل')) return 'قطاع مناطق الإسماعيلية';
  return raw;
}

const content = fs.readFileSync('./src/data/preloadedProjects.ts', 'utf-8');
const fttsEnd = content.indexOf('export const ETAHA_EXCEL_SITES: SiteRecord[] = [');
const fttsPart = content.slice(0, fttsEnd);

const regex = /"sector":\s*"([^"]+)"/g;
let match;
const counts = {};
let total = 0;
while ((match = regex.exec(fttsPart)) !== null) {
  total++;
  const raw = match[1];
  const c = toCanonicalSector(raw);
  counts[c] = (counts[c] || 0) + 1;
}
console.log('FTTS Canonical Breakdown (Total ' + total + '):');
console.log(counts);
