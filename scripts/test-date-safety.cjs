const fs = require('fs');
const XLSX = require('xlsx');

const excelPath = 'C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx';
const wb = XLSX.readFile(excelPath);
const wsDetails = wb.Sheets['Details'];
const rows = XLSX.utils.sheet_to_json(wsDetails);

function parseDateSafe(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '0' || trimmed === '-' || trimmed === 'N/A' || trimmed === 'null' || trimmed === 'undefined') {
      return null;
    }
    let d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
    const parts = trimmed.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        if (!isNaN(d.getTime())) return d;
      }
      if (parts[0].length === 4) {
        d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (!isNaN(d.getTime())) return d;
      }
    }
  }
  return null;
}

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: date.getUTCFullYear(), week: Math.max(1, Math.min(52, weekNo)) };
}

console.log('Testing 368 rows with parseDateSafe...');
let validStart = 0;
let validTarget = 0;
let validDeliv = 0;

rows.forEach(r => {
  const s = parseDateSafe(r['تاريخ السداد و البدء فى التنفيذ']);
  if (s) {
    validStart++;
    const t = new Date(s.getTime());
    t.setMonth(t.getMonth() + 3);
    if (!isNaN(t.getTime())) validTarget++;
  }
  const d = parseDateSafe(r['تاريخ التسليم ']);
  if (d) validDeliv++;
});

console.log('Valid Start:', validStart, '/ 368');
console.log('Valid Target:', validTarget, '/ 368');
console.log('Valid Delivery:', validDeliv, '/ 368');
