const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx');

const ws = wb.Sheets['Getdata'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

for (let r = 0; r < data.length; r++) {
  const row = data[r];
  if (!row) continue;
  row.forEach((c, colIdx) => {
    if (String(c || '').includes('048-1-34') || String(c || '').includes('40-1-17')) {
      console.log(`Found at R${r}C${colIdx}:`, row.slice(0, 10));
    }
  });
}
