import XLSX from 'xlsx';

function normalizeStatus(tasneef, notes, siteStatus) {
  const t = String(tasneef || '').trim();
  const n = String(notes || '').trim();
  const ss = String(siteStatus || '').trim().toUpperCase();

  if (t.includes('انتهاء') || t.includes('تشغيل فيبر') || t.includes('تسليم')) {
    return 'تم التسليم';
  }
  if (t.includes('تصاريح')) {
    return 'جاري تصاريح';
  }
  if (t.includes('معوق')) {
    return 'معوقات';
  }
  if (t.includes('متعذر')) {
    return 'متعثرات';
  }
  if (t.includes('معاين')) {
    return 'جاري المعاينة';
  }
  if (t.includes('كهرب') || n.includes('كهرب')) {
    return 'جاري العمل كهربى';
  }
  if (t.includes('مدن') || t.includes('عمل') || n.includes('مدن') || n.includes('عمل')) {
    return 'جاري العمل مدني';
  }
  return 'جاري المعاينة';
}

const filePath = 'C:/Users/Sherif/Desktop/Copy of Report We 14-10-2026.xlsx';
const wb = XLSX.readFile(filePath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

const statusCounts = {};
data.forEach(r => {
  const s = normalizeStatus(r['التصنيف'], r['الملاحظات'], r['Site Status']);
  statusCounts[s] = (statusCounts[s] || 0) + 1;
});

console.log('=== Status Breakdown for 1440 rows ===');
console.log(statusCounts);
