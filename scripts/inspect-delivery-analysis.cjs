const fs = require('fs');
const XLSX = require('xlsx');

const excelPath = 'C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx';
const wb = XLSX.readFile(excelPath);
const wsDetails = wb.Sheets['Details'];
const rows = XLSX.utils.sheet_to_json(wsDetails);

const deliveredWithDate = rows.filter(r => (r['تاريخ التسليم '] || r['تاريخ التسليم']) && (r['موقف التسليم'] === 'تم التسليم' || r['التصنيف'] === 'تم الانتهاء والتسليم'));
const deliveredWithoutDate = rows.filter(r => !(r['تاريخ التسليم '] || r['تاريخ التسليم']) && (r['موقف التسليم'] === 'تم التسليم' || r['التصنيف'] === 'تم الانتهاء والتسليم'));
const notDeliveredWithDate = rows.filter(r => (r['تاريخ التسليم '] || r['تاريخ التسليم']) && (r['موقف التسليم'] !== 'تم التسليم' && r['التصنيف'] !== 'تم الانتهاء والتسليم'));
const notDeliveredWithoutDate = rows.filter(r => !(r['تاريخ التسليم '] || r['تاريخ التسليم']) && (r['موقف التسليم'] !== 'تم التسليم' && r['التصنيف'] !== 'تم الانتهاء والتسليم'));

console.log('Delivered with Date:', deliveredWithDate.length);
console.log('Delivered without Date:', deliveredWithoutDate.length);
console.log('Not Delivered with Date:', notDeliveredWithDate.length);
console.log('Not Delivered without Date:', notDeliveredWithoutDate.length);

if (deliveredWithoutDate.length > 0) {
  console.log('Delivered without date samples:', deliveredWithoutDate.slice(0, 3));
}
