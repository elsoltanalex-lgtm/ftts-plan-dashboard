const fs = require('fs');
const XLSX = require('xlsx');

const excelPath = 'C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx';
const wb = XLSX.readFile(excelPath);
const wsDetails = wb.Sheets['Details'];
const rows = XLSX.utils.sheet_to_json(wsDetails);

function parseDateSafe(val) {
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

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return { year: date.getUTCFullYear(), week: weekNo };
}

const asOfDate = new Date('2026-11-22T00:00:00Z');
const currentWeek = 47;

const weeklyStats = [];
for (let w = 1; w <= currentWeek; w++) {
  weeklyStats.push({
    week: w,
    targetThisWeek: 0,
    achievedThisWeek: 0,
    overdueThisWeek: 0,
    cumTarget: 0,
    cumAchieved: 0,
    cumOverdue: 0
  });
}

rows.forEach(r => {
  const pDate = parseDateSafe(r['تاريخ السداد والبدء في التنفيذ'] || r['تاريخ السداد و البدء فى التنفيذ']);
  const dDate = parseDateSafe(r['تاريخ التسليم '] || r['تاريخ التسليم']);
  const isDelivered = r['موقف التسليم'] === 'تم التسليم' || r['التصنيف'] === 'تم الانتهاء والتسليم';

  if (!pDate) return;

  const targetDate = new Date(pDate.getTime());
  targetDate.setMonth(targetDate.getMonth() + 3);

  const tInfo = getWeekNumber(targetDate);
  const dInfo = dDate ? getWeekNumber(dDate) : null;

  // Target bucket
  let targetW = null;
  if (tInfo.year < 2026) {
    targetW = 1;
  } else if (tInfo.year === 2026 && tInfo.week <= currentWeek) {
    targetW = Math.max(1, tInfo.week);
  }

  if (targetW !== null) {
    weeklyStats[targetW - 1].targetThisWeek++;
  }

  // Achieved bucket
  if (isDelivered) {
    let achW = null;
    if (dInfo) {
      if (dInfo.year < 2026) achW = 1;
      else if (dInfo.year === 2026 && dInfo.week <= currentWeek) achW = Math.max(1, dInfo.week);
      else if (dInfo.year === 2026 && dInfo.week > currentWeek) achW = currentWeek;
    } else {
      // Delivered without date (row 54, 56)
      achW = currentWeek;
    }
    if (achW !== null) {
      weeklyStats[achW - 1].achievedThisWeek++;
    }
  } else {
    // Not delivered: if targetDate has passed, it became overdue in the week of targetDate
    if (targetDate <= asOfDate) {
      let overW = 1;
      if (tInfo.year === 2026 && tInfo.week <= currentWeek) {
        overW = Math.max(1, tInfo.week);
      }
      weeklyStats[overW - 1].overdueThisWeek++;
    }
  }
});

let cTarget = 0;
let cAchieved = 0;
let cOverdue = 0;

weeklyStats.forEach(ws => {
  cTarget += ws.targetThisWeek;
  cAchieved += ws.achievedThisWeek;
  cOverdue += ws.overdueThisWeek;
  ws.cumTarget = cTarget;
  ws.cumAchieved = cAchieved;
  ws.cumOverdue = cOverdue;
});

console.log('Week 1:', weeklyStats[0]);
console.log('Week 20:', weeklyStats[19]);
console.log('Week 47 Final:', weeklyStats[46]);
