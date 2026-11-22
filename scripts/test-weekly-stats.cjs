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

// Helper to get ISO week number and year
function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return { year: date.getUTCFullYear(), week: weekNo };
}

console.log('Inspecting week distribution for 2026...');
const weekStats2026 = {};
for (let w = 1; w <= 47; w++) {
  weekStats2026[w] = { target: 0, achieved: 0, overdue: 0 };
}

// Current date in November 2026
const currentDate = new Date('2026-11-22T00:00:00Z');

rows.forEach(r => {
  const pVal = r['تاريخ السداد و البدء فى التنفيذ'] || r['تاريخ السداد والبدء في التنفيذ'];
  const dVal = r['تاريخ التسليم '] || r['تاريخ التسليم'];
  const pDate = parseExcelDate(pVal);
  const dDate = parseExcelDate(dVal);
  const isDelivered = r['موقف التسليم'] === 'تم التسليم' || r['التصنيف'] === 'تم الانتهاء والتسليم';

  if (!pDate) return;

  const targetDate = new Date(pDate);
  targetDate.setMonth(targetDate.getMonth() + 3);

  // Determine target week
  const tInfo = getWeekNumber(targetDate);
  // Determine delivery week if delivered
  const dInfo = dDate ? getWeekNumber(dDate) : null;

  // If target was in 2026
  if (tInfo.year === 2026 && tInfo.week >= 1 && tInfo.week <= 47) {
    weekStats2026[tInfo.week].target++;
  } else if (tInfo.year < 2026) {
    weekStats2026[1].target++;
  }

  // If delivered
  if (isDelivered) {
    if (dInfo && dInfo.year === 2026 && dInfo.week >= 1 && dInfo.week <= 47) {
      weekStats2026[dInfo.week].achieved++;
    } else if (dInfo && dInfo.year < 2026) {
      weekStats2026[1].achieved++;
    } else if (!dInfo) {
      weekStats2026[45].achieved++;
    }
  } else {
    // Not delivered
    // If targetDate < currentDate, it's overdue
    if (targetDate < currentDate) {
      const overdueWeek = (tInfo.year === 2026 && tInfo.week <= 47) ? Math.max(1, tInfo.week) : 1;
      weekStats2026[overdueWeek].overdue++;
    }
  }
});

let totalTarget = 0;
let totalAchieved = 0;
let totalOverdue = 0;

for (let w = 1; w <= 47; w++) {
  totalTarget += weekStats2026[w].target;
  totalAchieved += weekStats2026[w].achieved;
  totalOverdue += weekStats2026[w].overdue;
  if (weekStats2026[w].target > 0 || weekStats2026[w].achieved > 0 || weekStats2026[w].overdue > 0) {
    console.log('Week ' + w + ': Target = ' + weekStats2026[w].target + ', Achieved = ' + weekStats2026[w].achieved + ', Overdue = ' + weekStats2026[w].overdue);
  }
}

console.log('\nTotals: Target = ' + totalTarget + ', Achieved = ' + totalAchieved + ', Overdue = ' + totalOverdue);
