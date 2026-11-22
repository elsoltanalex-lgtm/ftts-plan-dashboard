const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx');

const wsDetails = wb.Sheets['Details'];
const details = XLSX.utils.sheet_to_json(wsDetails);

console.log('Total rows in Details:', details.length);
const sectors = {};
const govMap = {};
const classMap = {};

details.forEach(r => {
  const s = r['القطاعات'] || r['قطاع التنفيذ'] || 'Unknown';
  sectors[s] = (sectors[s] || 0) + 1;
  const g = r['المحافظة'] || 'Unknown';
  govMap[g] = (govMap[g] || 0) + 1;
  const c = r['التصنيف'] || 'Unknown';
  classMap[c] = (classMap[c] || 0) + 1;
});

console.log('\nSectors breakdown in Details:');
console.log(sectors);

console.log('\nFinal Classifications breakdown in Details:');
console.log(classMap);

console.log('\nGovernorates in Details:');
console.log(govMap);
