const fs = require('fs');
const XLSX = require('xlsx');

const excelPath = 'C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx';
const wb = XLSX.readFile(excelPath);
const wsDetails = wb.Sheets['Details'];
const rows = XLSX.utils.sheet_to_json(wsDetails);

const distinctSLA = [...new Set(rows.map(r => r.SLA))];
console.log('Distinct SLA values:', distinctSLA);

const slaCounts = {};
rows.forEach(r => {
  const k = String(r.SLA || 'N/A');
  slaCounts[k] = (slaCounts[k] || 0) + 1;
});
console.log('SLA counts in Excel:', slaCounts);

console.log('Sample durations:', rows.slice(0, 10).map(r => ({ code: r.Code, duration: r['المده'], sla: r.SLA })));
