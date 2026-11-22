const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx');

for (const name of ['Details', 'Details (2)', 'Details (3)', 'Getdata', 'Progress', 'Cancel']) {
  const ws = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(ws);
  console.log(`\n=================== SHEET: ${name} ===================`);
  console.log(`Total sheet_to_json rows: ${rows.length}`);
  if (rows.length > 0) {
    console.log('Columns in row 0:', Object.keys(rows[0]));
    // Count rows with a valid Code
    const withCode = rows.filter(r => r.Code !== undefined && String(r.Code).trim() !== '' && String(r.Code).trim() !== '0');
    console.log(`Rows with valid Code: ${withCode.length}`);
    const withClient = rows.filter(r => r['اسم العميل'] && String(r['اسم العميل']).trim() !== '' && String(r['اسم العميل']).trim() !== '0');
    console.log(`Rows with valid اسم العميل: ${withClient.length}`);
  }
}
