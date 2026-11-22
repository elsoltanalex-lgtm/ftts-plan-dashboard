const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx');
const wsDetails = wb.Sheets['Details'];
const rows = XLSX.utils.sheet_to_json(wsDetails);

const distinct = (key) => [...new Set(rows.map(r => String(r[key] || '').trim()).filter(Boolean))];

console.log('Governorates:', distinct('المحافظة'));
console.log('Sectors (القطاعات):', distinct('القطاعات'));
console.log('Execution Sectors (قطاع التنفيذ):', distinct('قطاع التنفيذ'));
console.log('General Admin (الادارة العامة المنفذة):', distinct('الادارة العامة المنفذة'));
console.log('Exec Dept (ادارة التنفيذ):', distinct('ادارة التنفيذ'));
console.log('External Path (المسار الخارجي):', distinct('المسار الخارجي'));
console.log('Welding (موقف اللحامات):', distinct('موقف اللحامات'));
console.log('Delivery (موقف التسليم):', distinct('موقف التسليم'));
console.log('Classification (التصنيف):', distinct('التصنيف'));

// Build hierarchy
const hierarchy = {};
rows.forEach(r => {
  const sec = String(r['القطاعات'] || '').trim();
  const execSec = String(r['قطاع التنفيذ'] || '').trim();
  const genAdm = String(r['الادارة العامة المنفذة'] || '').trim();
  const execDept = String(r['ادارة التنفيذ'] || '').trim();
  
  if (!sec) return;
  if (!hierarchy[sec]) hierarchy[sec] = {};
  if (!hierarchy[sec][execSec]) hierarchy[sec][execSec] = {};
  if (!hierarchy[sec][execSec][genAdm]) hierarchy[sec][execSec][genAdm] = new Set();
  if (execDept) hierarchy[sec][execSec][genAdm].add(execDept);
});

// Convert sets to arrays
for (const s in hierarchy) {
  for (const es in hierarchy[s]) {
    for (const ga in hierarchy[s][es]) {
      hierarchy[s][es][ga] = [...hierarchy[s][es][ga]];
    }
  }
}

console.log('\nHierarchy summary:');
console.log(JSON.stringify(hierarchy, null, 2));
