const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx');

const wsDetails = wb.Sheets['Details'];
const details = XLSX.utils.sheet_to_json(wsDetails);
const wsGetdata = wb.Sheets['Getdata'];
const getdataRaw = XLSX.utils.sheet_to_json(wsGetdata, { header: 1 });

const specialByCode = new Map();
const specialByClient = new Map();

for (let r = 0; r < getdataRaw.length; r++) {
  const row = getdataRaw[r];
  if (!row) continue;
  const tf = row[0];
  const isSpecial = (tf === true || String(tf).toLowerCase() === 'true' || tf === 1);
  const code1 = String(row[1] || '').trim();
  const code4 = String(row[4] || '').trim();
  const client = String(row[5] || '').trim();
  const branch = String(row[6] || '').trim();

  if (isSpecial) {
    if (code1 && code1 !== 'Code') specialByCode.set(code1, true);
    if (code4 && code4 !== 'Code') specialByCode.set(code4, true);
    if (client && client !== 'اسم العميل') {
      specialByClient.set(client + '||' + branch, true);
      specialByClient.set(client, true);
    }
  }
}

console.log('Unique Special Codes:', specialByCode.size);
console.log('Codes:', Array.from(specialByCode.keys()));

let count = 0;
details.forEach(d => {
  const c = String(d.Code || '').trim();
  const client = String(d['اسم العميل'] || '').trim();
  const branch = String(d['اسم الفرع'] || '').trim();
  const isSpec = specialByCode.has(c) || specialByClient.has(client + '||' + branch);
  if (isSpec) count++;
});

console.log('Details rows marked special:', count, 'out of', details.length);
