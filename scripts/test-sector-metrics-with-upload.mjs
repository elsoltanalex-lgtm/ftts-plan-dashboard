import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

// Load uploaded Excel
const uploadPath = 'C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1793454977619_18fca5d5.xlsx';
const wb = xlsx.readFile(uploadPath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

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

function normalizeTasneef(raw) {
  const s = cleanStr(raw);
  if (s.includes('انتهاء')) return 'تم الانتهاء';
  if (s.includes('تشغيل')) return 'تم التشغيل فايبر';
  if (s.includes('مدن') && s.includes('تم')) return 'جاري كهربي'; // user rule: تم مدني -> جاري كهربي
  if (s.includes('كهرب')) return 'جاري كهربي';
  if (s.includes('عمل') || s.includes('مدن')) return 'جاري مدني'; // user rule: جاري العمل -> جاري مدني
  if (s.includes('تصاريح')) return 'جاري تصاريح';
  if (s.includes('معاين')) return 'جاري المعاينة';
  if (s.includes('متعذر') || s.includes('متعثر')) return 'متعذر';
  if (s.includes('معوق')) return 'معوقات';
  return 'جاري المعاينة';
}

function normalizeExecutionCategory(tasneef) {
  if (tasneef === 'تم الانتهاء' || tasneef === 'تم التشغيل فايبر' || tasneef.includes('تسليم')) {
    return 'Completed'; // مكتمل
  }
  if (['جاري مدني', 'جاري كهربي', 'جاري المعاينة', 'جاري تصاريح'].includes(tasneef)) {
    return 'In Progress'; // جاري التنفيذ
  }
  if (['متعذر', 'معوقات'].includes(tasneef)) {
    return 'Blocked / On Hold'; // معوقات / متعذر
  }
  return 'Planned'; // مخطط
}

const sectorStats = {};

rawRows.forEach(r => {
  const sector = resolveCanonicalSector(r);
  const tasneef = normalizeTasneef(r['التصنيف']);
  const category = normalizeExecutionCategory(tasneef);

  if (!sectorStats[sector]) {
    sectorStats[sector] = {
      target: 0,
      completed: 0,
      inProgress: 0,
      blocked: 0,
      planned: 0,
      classCounts: {}
    };
  }

  sectorStats[sector].target++;
  sectorStats[sector].classCounts[tasneef] = (sectorStats[sector].classCounts[tasneef] || 0) + 1;

  if (category === 'Completed') sectorStats[sector].completed++;
  else if (category === 'In Progress') sectorStats[sector].inProgress++;
  else if (category === 'Blocked / On Hold') sectorStats[sector].blocked++;
  else sectorStats[sector].planned++;
});

console.log('Sector breakdown for WE:');
console.table(Object.keys(sectorStats).map(sec => {
  const s = sectorStats[sec];
  const remaining = s.target - s.completed;
  const achievePct = Number(((s.completed / s.target) * 100).toFixed(1));
  const weeksPassed = 42;
  const remainingWeeks = 10;
  const weeklyAvg = Number((s.completed / weeksPassed).toFixed(2));
  const runRate = Number((remaining / remainingWeeks).toFixed(2));
  return {
    Sector: sec,
    Target: s.target,
    Completed: s.completed,
    InProgress: s.inProgress,
    Blocked: s.blocked,
    Planned: s.planned,
    Remaining: remaining,
    'Achieve%': `${achievePct}%`,
    WeeklyAvg: weeklyAvg,
    ReqRunRate: runRate,
  };
}));

