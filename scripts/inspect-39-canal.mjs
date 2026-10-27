import XLSX from 'xlsx';

const filePath = 'C:/Users/Sherif/Desktop/Copy of Report We 14-10-2026.xlsx';
const wb = XLSX.readFile(filePath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

const rows39 = data.filter(r => !r['قطاع المناطق'] && r['الادارة العامة لتنفيذ الشبكات'] === 'الادارة العامة لتنفيذ مدن القناة وسيناء');
console.log('Sample rows from the 39 Canal rows:');
rows39.forEach(r => {
  console.log({
    siteCode: r[' Site code'],
    notes: r['الملاحظات'],
    tasneef: r['التصنيف'],
    taazur: r['اسباب التعّذر']
  });
});
