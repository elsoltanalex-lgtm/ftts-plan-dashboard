import XLSX from 'xlsx';

const filePath = 'C:/Users/Sherif/Desktop/Copy of Report We 14-10-2026.xlsx';
const wb = XLSX.readFile(filePath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

const madanyRows = data.filter(r => r['التصنيف'] === 'تم مدنى').slice(0, 5);
console.log('Sample "تم مدنى" rows:');
madanyRows.forEach(r => {
  console.log({
    siteCode: r[' Site code'],
    tasneef: r['التصنيف'],
    notes: r['الملاحظات'],
    status: r['Site Status']
  });
});
