const fs = require('fs');
const XLSX = require('xlsx');

const excelPath = 'C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx';
const wb = XLSX.readFile(excelPath);
const wsDetails = wb.Sheets['Details'];
const rows = XLSX.utils.sheet_to_json(wsDetails);

console.log('Total rows:', rows.length);

let withPaymentDate = 0;
let withDeliveryDate = 0;
let paymentDates = [];
let deliveryDates = [];

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

rows.forEach((r, idx) => {
  const pVal = r['تاريخ السداد و البدء فى التنفيذ'] || r['تاريخ السداد والبدء في التنفيذ'];
  const dVal = r['تاريخ التسليم '] || r['تاريخ التسليم'];
  
  const pDate = parseExcelDate(pVal);
  const dDate = parseExcelDate(dVal);
  
  if (pDate) {
    withPaymentDate++;
    paymentDates.push(pDate);
  }
  if (dDate) {
    withDeliveryDate++;
    deliveryDates.push(dDate);
  }
});

console.log('With Payment Date:', withPaymentDate);
console.log('With Delivery Date:', withDeliveryDate);

paymentDates.sort((a,b) => a - b);
deliveryDates.sort((a,b) => a - b);

if (paymentDates.length > 0) {
  console.log('Payment Date Min:', paymentDates[0].toISOString().slice(0, 10));
  console.log('Payment Date Max:', paymentDates[paymentDates.length - 1].toISOString().slice(0, 10));
}
if (deliveryDates.length > 0) {
  console.log('Delivery Date Min:', deliveryDates[0].toISOString().slice(0, 10));
  console.log('Delivery Date Max:', deliveryDates[deliveryDates.length - 1].toISOString().slice(0, 10));
}

// Sample inspect 5 rows with dates
console.log('\nSample 5 rows:');
rows.slice(0, 5).forEach(r => {
  console.log({
    code: r.Code,
    paymentDate: r['تاريخ السداد و البدء فى التنفيذ'],
    deliveryDate: r['تاريخ التسليم '],
    deliveryStatus: r['موقف التسليم'],
    classification: r['التصنيف'],
    duration: r['المده'],
    sla: r['SLA']
  });
});
