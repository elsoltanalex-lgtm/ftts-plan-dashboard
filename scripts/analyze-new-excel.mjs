import XLSX from 'xlsx';

const filePath = 'C:/Users/Sherif/Desktop/Copy of Report We 14-10-2026.xlsx';
const wb = XLSX.readFile(filePath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

function getCounts(field) {
  const c = {};
  data.forEach(r => {
    const val = String(r[field] || '').trim();
    c[val] = (c[val] || 0) + 1;
  });
  return c;
}

console.log('=== Total Rows ===', data.length);
console.log('\n--- Type (Operators) ---');
console.log(getCounts('Type'));

console.log('\n--- قطاع التنفيذ ---');
console.log(getCounts('قطاع التنفيذ'));

console.log('\n--- قطاع المناطق ---');
console.log(getCounts('قطاع المناطق'));

console.log('\n--- التصنيف ---');
console.log(getCounts('التصنيف'));

console.log('\n--- Site Status ---');
console.log(getCounts('Site Status'));

console.log('\n--- خطة ---');
console.log(getCounts('خطة'));
