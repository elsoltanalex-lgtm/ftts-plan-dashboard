import XLSX from 'xlsx';

const filePath = 'C:/Users/Sherif/Desktop/Copy of Report We 14-10-2026.xlsx';
const wb = XLSX.readFile(filePath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

const emptyManateq = data.filter(r => !String(r['قطاع المناطق'] || '').trim());
console.log('Empty قطاع المناطق count:', emptyManateq.length);

const executionSectors = {};
const admins = {};
emptyManateq.forEach(r => {
  const ex = r['قطاع التنفيذ'] || '';
  executionSectors[ex] = (executionSectors[ex] || 0) + 1;
  const ad = r['الادارة العامة لتنفيذ الشبكات'] || '';
  admins[ad] = (admins[ad] || 0) + 1;
});

console.log('\n--- قطاع التنفيذ for empty قطاع المناطق ---');
console.log(executionSectors);

console.log('\n--- الادارة العامة for empty قطاع المناطق ---');
console.log(admins);
