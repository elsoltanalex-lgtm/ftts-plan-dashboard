const fs = require('fs');
const XLSX = require('xlsx');

const excelPath = 'C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx';
const wb = XLSX.readFile(excelPath);
const wsDetails = wb.Sheets['Details'];
const rows = XLSX.utils.sheet_to_json(wsDetails);

function parseExcelDate(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    const t = val.trim();
    if (!t || t === '0' || t === '-') return null;
    const d = new Date(t);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

const targetDates = [];
const deliveryDates = [];

rows.forEach(r => {
  const pVal = r['تاريخ السداد و البدء فى التنفيذ'] || r['تاريخ السداد والبدء في التنفيذ'];
  const dVal = r['تاريخ التسليم '] || r['تاريخ التسليم'];
  const pDate = parseExcelDate(pVal);
  const dDate = parseExcelDate(dVal);

  if (pDate) {
    const target = new Date(pDate);
    target.setMonth(target.getMonth() + 3);
    targetDates.push({ code: r.Code, pDate, target, dDate, status: r['موقف التسليم'], cls: r['التصنيف'] });
  }
});

console.log('Valid rows with start date:', targetDates.length);

const targetYears = {};
targetDates.forEach(item => {
  const y = item.target.getFullYear();
  targetYears[y] = (targetYears[y] || 0) + 1;
});
console.log('Target Due Dates by Year:', targetYears);

const deliveryYears = {};
targetDates.filter(x => x.dDate).forEach(item => {
  const y = item.dDate.getFullYear();
  deliveryYears[y] = (deliveryYears[y] || 0) + 1;
});
console.log('Actual Delivery Dates by Year:', deliveryYears);
