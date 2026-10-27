import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

function cleanStr(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

function normalize(text) {
  if (!text) return '';
  return text.toString().trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase();
}

function resolveCanonicalSector(row) {
  const code = cleanStr(row[' Site code']);
  const manateq = cleanStr(row['قطاع المناطق']);
  const edara = cleanStr(row['الادارة العامة لتنفيذ الشبكات']);
  const tanfeez = cleanStr(row['قطاع التنفيذ']);
  const allText = `${manateq} ${edara} ${tanfeez}`;
  const norm = normalize(allText);

  if (norm.includes('شرق الدلتا')) return 'قطاع شرق الدلتا';
  if (norm.includes('اسكندر') || norm.includes('ساحل') || norm.includes('مطروح')) return 'قطاع إسكندرية والساحل';
  if (norm.includes('غرب الدلتا')) return 'قطاع مناطق غرب الدلتا';
  if (norm.includes('وسط الدلتا')) return 'قطاع مناطق وسط الدلتا';
  if (norm.includes('اسماعيل') || code.startsWith('LSINI')) return 'قطاع مناطق الإسماعيلية';
  if (norm.includes('سويس') || norm.includes('سيناء') || code.startsWith('LSINS') || code.startsWith('BSIN')) return 'قطاع مناطق السويس';
  if (norm.includes('اكتوبر') || norm.includes('جيزه')) return 'قطاع مناطق الجيزة وأكتوبر';
  if (norm.includes('قاهره') || norm.includes('قاهرة')) return 'قطاع مناطق القاهرة الكبرى';
  if (norm.includes('صعيد') || norm.includes('قبلي')) return 'قطاع مناطق الصعيد';

  return manateq || tanfeez || 'قطاع عام';
}

function normalizeStatus(tasneef, notes) {
  const t = cleanStr(tasneef);
  const n = cleanStr(notes);
  if (t.includes('انتهاء') || t.includes('تشغيل فيبر') || t.includes('تسليم')) return 'تم التسليم';
  if (t.includes('تصاريح')) return 'جاري تصاريح';
  if (t.includes('معوق')) return 'معوقات';
  if (t.includes('متعذر')) return 'متعثرات';
  if (t.includes('معاين')) return 'جاري المعاينة';
  if (t.includes('كهرب') || n.includes('كهرب')) return 'جاري العمل كهربى';
  if (t.includes('مدن') || t.includes('عمل') || n.includes('مدن') || n.includes('عمل')) return 'جاري العمل مدني';
  return 'جاري المعاينة';
}

const filePath = 'C:/Users/Sherif/Desktop/Copy of Report We 14-10-2026.xlsx';
const wb = XLSX.readFile(filePath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

const sites = rawRows.map((r, i) => {
  const siteCode = cleanStr(r[' Site code']) || `SITE-${i + 1}`;
  const type = cleanStr(r['Type']);
  let company = 'WE';
  if (type.includes('VDF')) company = 'Vodafone';
  else if (type.includes('ORG')) company = 'Orange';

  const sector = resolveCanonicalSector(r);
  const status = normalizeStatus(r['التصنيف'], r['الملاحظات']);
  const generalAdmin = cleanStr(r['الادارة العامة لتنفيذ الشبكات']) || cleanStr(r['قطاع التنفيذ']) || 'الإدارة العامة لتنفيذ الشبكات';
  const competentAdmin = cleanStr(r['قطاع المناطق']) || cleanStr(r['مسئولية التنفيذ']) || 'إدارة التنفيذ والمسارات';
  const central = cleanStr(r['قطاع المناطق']) || cleanStr(r['الادارة العامة لتنفيذ الشبكات']) || 'سنترال رئيسي';
  const classification = type || 'FTTS Rollout';
  const obstacleReason = cleanStr(r['اسباب التعّذر']) || ((status === 'معوقات' || status === 'متعثرات') && cleanStr(r['الملاحظات']) ? cleanStr(r['الملاحظات']).slice(0, 80) : 'لا يوجد تعذر');
  const expectedDate = r['خطة'] ? `${r['خطة']}-12-31` : '2026-12-31';

  let progressPercent = 25;
  if (status === 'تم التسليم') progressPercent = 100;
  else if (status === 'جاري العمل مدني') progressPercent = cleanStr(r['التصنيف']).includes('تم مدنى') ? 80 : 60;
  else if (status === 'جاري العمل كهربى') progressPercent = 70;
  else if (status === 'جاري تصاريح') progressPercent = 40;
  else if (status === 'معوقات') progressPercent = 30;
  else if (status === 'متعثرات') progressPercent = 15;
  else if (status === 'جاري المعاينة') progressPercent = 20;

  return {
    id: `FTTS-NEW-${i + 1}`,
    siteCode,
    siteName: `موقع ${siteCode} - ${central}`,
    company,
    status,
    linksCount: 1,
    sector,
    generalAdmin,
    competentAdmin,
    central,
    classification,
    obstacleReason,
    expectedDate,
    progressPercent,
    civilContractor: cleanStr(r['مسئولية التنفيذ']) || 'المصرية للاتصالات',
    notes: cleanStr(r['الملاحظات']) || cleanStr(r['اسباب التعّذر']) || cleanStr(r['الجهة المطلوب الدعم منها']) || '',
  };
});

console.log(`Successfully parsed ${sites.length} sites!`);
const companyCounts = {};
sites.forEach(s => companyCounts[s.company] = (companyCounts[s.company] || 0) + 1);
console.log('Company distribution:', companyCounts);

const statusCounts = {};
sites.forEach(s => statusCounts[s.status] = (statusCounts[s.status] || 0) + 1);
console.log('Status distribution:', statusCounts);

const sectorCounts = {};
sites.forEach(s => sectorCounts[s.sector] = (sectorCounts[s.sector] || 0) + 1);
console.log('Sector distribution:', sectorCounts);
