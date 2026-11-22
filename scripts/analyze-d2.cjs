const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx');
const wsD2 = wb.Sheets['Details (2)'];
const d2Rows = XLSX.utils.sheet_to_json(wsD2);

const distinct = (rows, key) => [...new Set(rows.map(r => String(r[key] || '').replace(/\r\n/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean))];

console.log('D2 Sectors:', distinct(d2Rows, 'القطاعات'));
console.log('D2 Execution Sectors:', distinct(d2Rows, 'قطاع التنفيذ'));
console.log('D2 Gen Admin:', distinct(d2Rows, 'الادارة العامة المنفذة'));
console.log('D2 Exec Dept:', distinct(d2Rows, 'ادارة التنفيذ'));
