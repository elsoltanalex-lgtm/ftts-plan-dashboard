const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx');

const wsDetails = wb.Sheets['Details'];
const detailsRows = XLSX.utils.sheet_to_json(wsDetails);

const wsGetdata = wb.Sheets['Getdata'];
const getdataRaw = XLSX.utils.sheet_to_json(wsGetdata, { header: 1 });

const specialTargetsInGetdata = new Map();
for (let i = 1; i < getdataRaw.length; i++) {
  const row = getdataRaw[i];
  if (!row) continue;
  const tf = row[0];
  const code = String(row[1] || row[4] || '').trim();
  if (code && code !== 'Code') {
    const isSpecial = (tf === true || String(tf).toLowerCase() === 'true' || tf === 1);
    if (isSpecial) {
      specialTargetsInGetdata.set(code, true);
    }
  }
}

console.log('Total True in Getdata:', specialTargetsInGetdata.size);

const specialsInDetails = [];
detailsRows.forEach((r, idx) => {
  const c = String(r.Code || '').trim();
  if (specialTargetsInGetdata.has(c)) {
    specialsInDetails.push({ code: c, client: r['اسم العميل'], branch: r['اسم الفرع'], sector: r['القطاعات'], status: r['موقف التسليم'] });
  }
});

console.log('Specials in Details count:', specialsInDetails.length);
console.log('Specials list:', JSON.stringify(specialsInDetails.slice(0, 10), null, 2));
