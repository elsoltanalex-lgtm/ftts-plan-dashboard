import XLSX from 'xlsx';

const filePath = 'C:/Users/Sherif/Desktop/Copy of Report We 14-10-2026.xlsx';
const wb = XLSX.readFile(filePath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Top 5 rows as raw arrays:');
for (let i = 0; i < Math.min(5, rawRows.length); i++) {
  console.log(`Row ${i}:`, rawRows[i]);
}
