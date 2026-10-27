import XLSX from 'xlsx';

const filePath = 'C:/Users/Sherif/Desktop/Copy of Report We 14-10-2026.xlsx';
const wb = XLSX.readFile(filePath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

// Sample 5 rows of each Type
const typeSamples = {};
data.forEach(r => {
  const t = r['Type'] || 'UNKNOWN';
  if (!typeSamples[t]) typeSamples[t] = [];
  if (typeSamples[t].length < 2) {
    typeSamples[t].push({
      siteCode: r[' Site code'],
      sector: r['قطاع المناطق'],
      type: r['Type'],
      tasneef: r['التصنيف'],
      notes: r['الملاحظات']
    });
  }
});

console.log(JSON.stringify(typeSamples, null, 2));
