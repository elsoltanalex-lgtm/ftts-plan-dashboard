const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx');

const ws = wb.Sheets['Getdata'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

const breaks = [0, 389, 465, 506, 708, data.length];
for (let b = 0; b < breaks.length - 1; b++) {
  const start = breaks[b];
  const end = breaks[b + 1];
  console.log(`\n=== Section from row ${start} to ${end - 1} ===`);
  console.log('Header row:', data[start]);
  let sampleCount = 0;
  for (let r = start + 1; r < end; r++) {
    const row = data[r];
    if (row && row.some(c => c !== undefined && c !== null && c !== '')) {
      if (sampleCount < 3) {
        console.log(`  Row ${r}: T/F=${row[0]}, col1=${row[1]}, col2=${row[2]}, col3=${row[3]}, col4=${row[4]}, client=${row[5]}, branch=${row[6]}`);
        sampleCount++;
      }
    }
  }
}
