const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx');

const wsDetails = wb.Sheets['Details'];
const detailsRows = XLSX.utils.sheet_to_json(wsDetails);
console.log('Sheet Details has', detailsRows.length, 'rows');
console.log('Details row 0 sample:', detailsRows[0]);
console.log('Details row 367 sample:', detailsRows[367]);

const wsGetdata = wb.Sheets['Getdata'];
const getdataRows = XLSX.utils.sheet_to_json(wsGetdata, { header: 1 });

// Check what getdata rows exist
console.log('\nGetdata raw rows:', getdataRows.length);
// Find headers in getdata
for (let i = 0; i < getdataRows.length; i++) {
  const r = getdataRows[i];
  if (r && (r[1] === 'Code' || r[4] === 'Code')) {
    console.log(`Header row at idx ${i}:`, r.slice(0, 15));
  }
}
