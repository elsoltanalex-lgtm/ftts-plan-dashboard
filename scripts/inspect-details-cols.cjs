const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx');
const wsDetails = wb.Sheets['Details'];
const rows = XLSX.utils.sheet_to_json(wsDetails);
console.log('Sample row from Details:');
console.log(Object.keys(rows[0]));
console.log('Values:', rows[0]);
