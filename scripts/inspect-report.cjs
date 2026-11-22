const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx');

const ws = wb.Sheets['Report'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
console.log('Report sheet:');
data.slice(0, 30).forEach(r => {
  if (r && r.length > 0) console.log(r);
});

const ws3 = wb.Sheets['Report (3)'];
const data3 = XLSX.utils.sheet_to_json(ws3, { header: 1 });
console.log('\nReport (3) sheet:');
data3.slice(0, 30).forEach(r => {
  if (r && r.length > 0) console.log(r);
});
