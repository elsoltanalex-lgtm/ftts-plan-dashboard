import xlsx from 'xlsx';

const newPath = 'C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1793456796954_812c9229.xlsx';
const wb = xlsx.readFile(newPath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });

console.log('Total valid rows in new Excel:', data.length);

const rawClassCounts = {};
const statusCounts = {};

data.forEach(r => {
  const c = String(r['التصنيف'] || '').trim();
  const s = String(r['Site Status'] || '').trim();
  rawClassCounts[c] = (rawClassCounts[c] || 0) + 1;
  statusCounts[s] = (statusCounts[s] || 0) + 1;
});

console.log('\nRaw Classification Counts:');
console.table(rawClassCounts);

console.log('\nSite Status Counts:');
console.table(statusCounts);

