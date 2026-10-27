import XLSX from 'xlsx';

const filePath = 'C:/Users/Sherif/Desktop/Copy of Report We 14-10-2026.xlsx';
const wb = XLSX.readFile(filePath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

const canalRows = data.filter(r => {
  const all = `${r['قطاع التنفيذ']} ${r['قطاع المناطق']} ${r['الادارة العامة لتنفيذ الشبكات']} ${r['الملاحظات']}`;
  return all.includes('قناة') || all.includes('سيناء') || all.includes('سويس') || all.includes('اسماعيل');
});

console.log('Total Canal/Suez/Ismailia/Sinai rows:', canalRows.length);
const breakdown = {};
canalRows.forEach(r => {
  const key = `قطاع: "${r['قطاع المناطق']}" | إدارة: "${r['الادارة العامة لتنفيذ الشبكات']}"`;
  breakdown[key] = (breakdown[key] || 0) + 1;
});
console.log(breakdown);
