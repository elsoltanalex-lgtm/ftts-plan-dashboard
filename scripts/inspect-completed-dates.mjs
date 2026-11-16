import xlsx from 'xlsx';

const path = 'C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1793454977619_18fca5d5.xlsx';
const wb = xlsx.readFile(path);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });

const completedRows = data.filter(r => {
  const c = String(r['التصنيف'] || '').trim();
  return c.includes('انتهاء') || c.includes('تشغيل');
});

console.log('Total completed in Excel:', completedRows.length);
console.log('Sample 5 completed rows:');
completedRows.slice(0, 5).forEach((r, i) => {
  console.log(`[${i+1}] Code: ${r[' Site code']}, Class: ${r['التصنيف']}, Status: ${r['Site Status']}, Notes: ${r['الملاحظات']}, Plan: ${r['خطة']}, Central: ${r['سنترال الربط']}`);
});

// Check if any non-empty column in completed rows has date values
const nonZeroKeys = {};
completedRows.forEach(r => {
  Object.keys(r).forEach(k => {
    if (r[k] !== '' && r[k] !== 0 && !k.startsWith('__EMPTY')) {
      nonZeroKeys[k] = (nonZeroKeys[k] || 0) + 1;
    }
  });
});
console.log('Non-empty column counts in completed rows:', nonZeroKeys);

