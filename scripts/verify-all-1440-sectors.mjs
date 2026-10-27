import XLSX from 'xlsx';

function normalize(text) {
  if (!text) return '';
  return text.toString().trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase();
}

function resolveCanonicalSector(row) {
  const code = String(row[' Site code'] || '').trim();
  const manateq = String(row['قطاع المناطق'] || '').trim();
  const edara = String(row['الادارة العامة لتنفيذ الشبكات'] || '').trim();
  const tanfeez = String(row['قطاع التنفيذ'] || '').trim();
  const allText = `${manateq} ${edara} ${tanfeez}`;
  const norm = normalize(allText);

  // 1. East Delta (شرق الدلتا 1 & 2)
  if (norm.includes('شرق الدلتا')) {
    return 'قطاع شرق الدلتا';
  }

  // 2. Alexandria & North Coast / Matrouh (إسكندرية والساحل)
  if (norm.includes('اسكندر') || norm.includes('ساحل') || norm.includes('مطروح')) {
    return 'قطاع إسكندرية والساحل';
  }

  // 3. West Delta (غرب الدلتا)
  if (norm.includes('غرب الدلتا')) {
    return 'قطاع مناطق غرب الدلتا';
  }

  // 4. Central Delta (وسط الدلتا)
  if (norm.includes('وسط الدلتا')) {
    return 'قطاع مناطق وسط الدلتا';
  }

  // 5. Ismailia (الإسماعيلية)
  if (norm.includes('اسماعيل') || code.startsWith('LSINI')) {
    return 'قطاع مناطق الإسماعيلية';
  }

  // 6. Suez & Sinai (السويس)
  if (norm.includes('سويس') || norm.includes('سيناء') || code.startsWith('LSINS') || code.startsWith('BSIN')) {
    return 'قطاع مناطق السويس';
  }

  // Other regional sectors
  if (norm.includes('اكتوبر') || norm.includes('جيزه')) {
    return 'قطاع مناطق الجيزة وأكتوبر';
  }
  if (norm.includes('قاهره') || norm.includes('قاهرة')) {
    return 'قطاع مناطق القاهرة الكبرى';
  }
  if (norm.includes('صعيد') || norm.includes('قبلي')) {
    return 'قطاع مناطق الصعيد';
  }

  return manateq || tanfeez || 'قطاع عام';
}

const filePath = 'C:/Users/Sherif/Desktop/Copy of Report We 14-10-2026.xlsx';
const wb = XLSX.readFile(filePath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

const sectorCounts = {};
data.forEach(r => {
  const s = resolveCanonicalSector(r);
  sectorCounts[s] = (sectorCounts[s] || 0) + 1;
});

console.log('=== Sector Breakdown for 1440 rows ===');
console.log(sectorCounts);
