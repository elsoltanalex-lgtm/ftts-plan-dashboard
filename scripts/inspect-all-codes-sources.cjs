const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx');

const wsDetails = wb.Sheets['Details'];
const details = XLSX.utils.sheet_to_json(wsDetails);

const wsGetdata = wb.Sheets['Getdata'];
const getdataRaw = XLSX.utils.sheet_to_json(wsGetdata, { header: 1 });

const getdataMap = new Map();
for (let r = 0; r < getdataRaw.length; r++) {
  const row = getdataRaw[r];
  if (!row) continue;
  const tf = row[0];
  const code = String(row[1] || row[4] || '').trim();
  if (code && code !== 'Code') {
    getdataMap.set(code, {
      rowIdx: r,
      isSpecial: (tf === true || String(tf).toLowerCase() === 'true' || tf === 1),
      rawRow: row
    });
  }
}

console.log('Total details rows:', details.length);
console.log('Total getdata mapped codes:', getdataMap.size);

let specialCountInDetails = 0;
let notFoundInGetdata = 0;
details.forEach((d, idx) => {
  const c = String(d.Code || '').trim();
  const g = getdataMap.get(c);
  if (g) {
    if (g.isSpecial) specialCountInDetails++;
  } else {
    notFoundInGetdata++;
    if (notFoundInGetdata <= 10) {
      console.log(`Details #${idx + 1} (${c} - ${d['اسم العميل']}) not found in Getdata`);
    }
  }
});

console.log(`Details in Getdata: ${details.length - notFoundInGetdata} / ${details.length}`);
console.log(`Details Special Target count: ${specialCountInDetails}`);
console.log(`Details Not Special Target count: ${details.length - specialCountInDetails}`);
