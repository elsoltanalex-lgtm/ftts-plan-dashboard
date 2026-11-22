const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx');

const wsDetails = wb.Sheets['Details'];
const details = XLSX.utils.sheet_to_json(wsDetails);

console.log('Sample details row keys:');
console.log(Object.keys(details[0]));

// Let's check distinct values for:
// - المسار الخارجي
// - موقف اللحامات
// - موقف التسليم
// - التصنيف
// - القطاعات
// - قطاع التنفيذ
// - الادارة العامة المنفذة
// - ادارة التنفيذ
// - المحافظة

function getDistinct(arr, key) {
  const s = new Set();
  arr.forEach(r => {
    if (r[key] !== undefined && r[key] !== null && String(r[key]).trim() !== '' && String(r[key]).trim() !== '0') {
      s.add(String(r[key]).trim());
    }
  });
  return Array.from(s);
}

console.log('\nDistinct المسار الخارجي:', getDistinct(details, 'المسار الخارجي'));
console.log('\nDistinct موقف اللحامات:', getDistinct(details, 'موقف اللحامات'));
console.log('\nDistinct موقف التسليم:', getDistinct(details, 'موقف التسليم'));
console.log('\nDistinct التصنيف:', getDistinct(details, 'التصنيف'));
console.log('\nDistinct القطاعات:', getDistinct(details, 'القطاعات'));
console.log('\nDistinct قطاع التنفيذ:', getDistinct(details, 'قطاع التنفيذ'));
console.log('\nDistinct الادارة العامة المنفذة:', getDistinct(details, 'الادارة العامة المنفذة'));
console.log('\nDistinct ادارة التنفيذ:', getDistinct(details, 'ادارة التنفيذ'));
console.log('\nDistinct المحافظة:', getDistinct(details, 'المحافظة'));
