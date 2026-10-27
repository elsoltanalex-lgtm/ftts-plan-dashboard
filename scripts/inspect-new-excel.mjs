import XLSX from 'xlsx';

const filePath = 'C:/Users/Sherif/Desktop/Copy of Report We 14-10-2026.xlsx';
const wb = XLSX.readFile(filePath);

console.log('Sheet names in workbook:');
console.log(wb.SheetNames);

wb.SheetNames.forEach(sheetName => {
  const sheet = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  console.log(`\n=== Sheet: "${sheetName}" (Rows: ${data.length}) ===`);
  if (data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
    console.log('Sample row 0:', JSON.stringify(data[0], null, 2));
    if (data.length > 1) {
      console.log('Sample row 1:', JSON.stringify(data[1], null, 2));
    }
  }
});
