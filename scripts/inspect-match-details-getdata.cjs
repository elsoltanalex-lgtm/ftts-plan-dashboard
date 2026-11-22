const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx');

const wsDetails = wb.Sheets['Details'];
const detailsRows = XLSX.utils.sheet_to_json(wsDetails);
console.log('Details rows count:', detailsRows.length);

const wsGetdata = wb.Sheets['Getdata'];
const getdataRaw = XLSX.utils.sheet_to_json(wsGetdata, { header: 1 });
console.log('Getdata raw rows count:', getdataRaw.length);

// Let's see which rows in Getdata match codes in Details!
const detailsCodes = new Set(detailsRows.map(r => String(r.Code || '').trim()));
console.log('Unique codes in Details:', detailsCodes.size);

// In Getdata, find where T/F column is true or false
const specialTargetsInGetdata = new Map();
for (let i = 1; i < getdataRaw.length; i++) {
  const row = getdataRaw[i];
  if (!row) continue;
  const tf = row[0];
  const code = String(row[1] || row[4] || '').trim();
  if (code && code !== 'Code') {
    const isSpecial = (tf === true || String(tf).toLowerCase() === 'true' || tf === 1);
    specialTargetsInGetdata.set(code, isSpecial);
  }
}

console.log('Special target mapped codes count from Getdata:', specialTargetsInGetdata.size);
let matchedInDetails = 0;
let trueInDetails = 0;
detailsRows.forEach(r => {
  const c = String(r.Code || '').trim();
  if (specialTargetsInGetdata.has(c)) {
    matchedInDetails++;
    if (specialTargetsInGetdata.get(c)) trueInDetails++;
  }
});

console.log(`Details codes matched in Getdata: ${matchedInDetails} / ${detailsRows.length}`);
console.log(`Details codes with Special Target = true: ${trueInDetails}`);

// Also check all 840 codes from Details (2)
const wsD2 = wb.Sheets['Details (2)'];
const d2Rows = XLSX.utils.sheet_to_json(wsD2).filter(r => r['اسم العميل']);
console.log('\nDetails (2) real rows:', d2Rows.length);
let matchedInD2 = 0;
let trueInD2 = 0;
d2Rows.forEach(r => {
  const c = String(r.Code || '').trim();
  if (specialTargetsInGetdata.has(c)) {
    matchedInD2++;
    if (specialTargetsInGetdata.get(c)) trueInD2++;
  }
});
console.log(`Details (2) codes matched in Getdata: ${matchedInD2} / ${d2Rows.length}`);
console.log(`Details (2) codes with Special Target = true: ${trueInD2}`);
