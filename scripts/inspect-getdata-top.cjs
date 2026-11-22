const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx');

const ws = wb.Sheets['Getdata'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log('Getdata rows 0 to 20:');
for (let i = 0; i < 20; i++) {
  console.log(`Row ${i}:`, data[i]);
}

// Check which rows in Getdata have T/F set to true or false
let countTrue = 0;
let countFalse = 0;
const trueCodes = new Set();
const falseCodes = new Set();

for (let r = 0; r < data.length; r++) {
  const row = data[r];
  if (!row) continue;
  const tf = row[0];
  const code = String(row[1] || row[4] || '').trim();
  if (tf === true || String(tf).toLowerCase() === 'true') {
    countTrue++;
    if (code && code !== 'Code') trueCodes.add(code);
  } else if (tf === false || String(tf).toLowerCase() === 'false') {
    countFalse++;
    if (code && code !== 'Code') falseCodes.add(code);
  }
}

console.log(`\nFound ${countTrue} TRUE rows, ${trueCodes.size} unique true codes`);
console.log(`Found ${countFalse} FALSE rows, ${falseCodes.size} unique false codes`);
console.log('True codes sample:', Array.from(trueCodes).slice(0, 25));
