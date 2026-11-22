const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx');

const ws = wb.Sheets['Getdata'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log('Headers (Row 0):');
data[0].forEach((h, idx) => console.log(`  Col ${idx}: ${h}`));

const rowsWithData = [];
for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (!row) continue;
  const tf = row[0];
  const col1 = row[1];
  const col2 = row[2];
  const col3 = row[3];
  const col4 = row[4];
  const client = row[5];
  if (client || col1 || col4) {
    rowsWithData.push({ rowIdx: i, tf, col1, col2, col3, col4, client, branch: row[6], gov: row[11] });
  }
}

console.log(`Total rows with data in Getdata: ${rowsWithData.length}`);
console.log('First 15 sample rows in Getdata:');
rowsWithData.slice(0, 15).forEach(r => console.log(JSON.stringify(r)));

console.log('\nSample rows with T/F = true:');
rowsWithData.filter(r => r.tf === true || String(r.tf).toLowerCase() === 'true').slice(0, 15).forEach(r => console.log(JSON.stringify(r)));

console.log('\nSample rows with T/F = false:');
rowsWithData.filter(r => r.tf === false || String(r.tf).toLowerCase() === 'false').slice(0, 15).forEach(r => console.log(JSON.stringify(r)));
