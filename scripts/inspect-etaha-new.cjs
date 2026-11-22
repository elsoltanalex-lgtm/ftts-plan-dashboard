const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx');

console.log('Sheet Names:', wb.SheetNames);

for (const s of wb.SheetNames) {
  const ws = wb.Sheets[s];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log(`\n--- Sheet: ${s} (rows: ${data.length}) ---`);
  // Print header rows
  for (let r = 0; r < Math.min(5, data.length); r++) {
    const row = data[r];
    if (row && row.some(cell => cell !== undefined && cell !== '')) {
      console.log(` Row ${r}:`, row.slice(0, 25));
    }
  }

  // Search entire sheet for 'target' or 'سبيشال' or 'تارجت' or similar
  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    if (!row) continue;
    row.forEach((cell, c) => {
      const str = String(cell || '');
      if (/target|special|سبيشال|تارجت|هدف/i.test(str)) {
        console.log(` Match in ${s} R${r}C${c}: "${str}"`);
      }
    });
  }
}
