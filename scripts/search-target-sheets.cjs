const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx');
for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] || '');
      if (val.includes('تارجت') || val.includes('سبيشال') || /special/i.test(val) || /target/i.test(val)) {
        console.log('Found in ' + sheetName + ' [r' + r + ', c' + c + ']: ' + val);
      }
    }
  }
}
