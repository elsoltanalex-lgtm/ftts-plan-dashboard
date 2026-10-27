import XLSX from 'xlsx';

const wb = XLSX.readFile('C:/Users/Sherif/Desktop/Copy of Report We 14-10-2026.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

console.log('Total rows:', rows.length);
const manateqCounts = {};
const edaraCounts = {};
let emptyManateq = 0;
const emptyRows = [];

rows.forEach((r, idx) => {
  const m = String(r['قطاع المناطق'] || '').trim();
  const d = String(r['الادارة العامة لتنفيذ الشبكات'] || '').trim();
  const s = String(r[' Site code'] || '').trim();
  const t = String(r['قطاع التنفيذ'] || '').trim();
  if (!m) {
    emptyManateq++;
    emptyRows.push({ rowIdx: idx + 2, siteCode: s, tanfeez: t, edara: d });
  } else {
    manateqCounts[m] = (manateqCounts[m] || 0) + 1;
  }
  if (d) edaraCounts[d] = (edaraCounts[d] || 0) + 1;
});

console.log('Empty قطاع المناطق count:', emptyManateq);
if (emptyRows.length > 0) {
  console.log('Empty rows details:', JSON.stringify(emptyRows, null, 2));
}

console.log('\n--- قطاع المناطق (Column C) distribution: ---');
console.table(Object.entries(manateqCounts).sort((a,b) => b[1] - a[1]));

console.log('\n--- الادارة العامة (Column D) distribution: ---');
console.table(Object.entries(edaraCounts).sort((a,b) => b[1] - a[1]));
