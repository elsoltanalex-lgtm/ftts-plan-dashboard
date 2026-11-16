// scripts/convert_vodafone_excel.cjs
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelPath = 'C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1794491229078_6783af7d.xlsx';
const wb = XLSX.readFile(excelPath);
const ws = wb.Sheets[wb.SheetNames[0]];
const rawRows = XLSX.utils.sheet_to_json(ws);

console.log(`Loaded ${rawRows.length} rows from Vodafone Excel file`);

// Normalize each row
const cleanRows = rawRows.map((r, index) => {
  const rawCode = r[' Site code'] || r['Site code'] || r['site code'] || `VDF-${index + 1}`;
  const siteCode = String(rawCode).trim();
  
  return {
    ...r,
    _id: `VODAFONE-${siteCode}`,
    'site code': siteCode,
    site_code: siteCode,
    'Site code': siteCode,
    _createdAt: new Date().toISOString(),
    _updatedAt: new Date().toISOString(),
    _createdBy: 'bulk-excel-import',
  };
});

fs.writeFileSync(path.join(__dirname, '../server/data/Vodafone.json'), JSON.stringify(cleanRows, null, 2), 'utf8');
console.log(`✅ Saved ${cleanRows.length} records to server/data/Vodafone.json`);

