const fs = require('fs');

const code = fs.readFileSync('src/data/etahaSites.ts', 'utf8');
const match = code.match(/export const ETAHA_RAW_RECORDS:\s*EtahaRecord\[\]\s*=\s*(\[[\s\S]*?\]);\s*$/);
const rawRecords = eval(match[1]);

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

const totalWeeks = 47;
const currentWeek = 47;

const processedSites = rawRecords.map((r, i) => {
  const site = {
    id: r.Code || `ETAH-${i+1}`,
    name: r['اسم العميل'] || '',
    paymentAndStartDate: r['تاريخ السداد والبدء في التنفيذ'] || r['تاريخ السداد و البدء فى التنفيذ'] || '',
    deliveryStatus: r['موقف التسليم'] || r['موقف_التسليم'] || '',
    deliveryDate: r['تاريخ التسليم '] || r['تاريخ التسليم'] || '',
    internalPath: r['المسار الداخلي'] || r['المسار الداخلى'] || '',
    externalPath: r['المسار الخارجي'] || r['المسار_الخارجي'] || '',
    splicingStatus: r['موقف اللحامات'] || r['موقف_اللحامات'] || '',
    classification: r['التصنيف'] || '',
    obstacleReason: r['سبب المعوق او التعذر'] || '',
    status: (r['موقف التسليم'] || r['موقف_التسليم'] || '').trim() === 'تم التسليم' ? 'تم التسليم' : 'جاري التنفيذ',
    rawRecord: r
  };

  const raw = site.rawRecord || {};
  const pVal =
    site.paymentAndStartDate ||
    raw['تاريخ السداد والبدء في التنفيذ'] ||
    raw['تاريخ السداد و البدء فى التنفيذ'] ||
    raw['تاريخ السداد والبدء فى التنفيذ'] ||
    raw['تاريخ السداد'] ||
    raw.paymentAndStartDate ||
    raw.payment_and_start_date;
  const dVal =
    site.deliveryDate ||
    site.delivery_date ||
    raw['تاريخ التسليم '] ||
    raw['تاريخ التسليم'] ||
    raw.deliveryDate ||
    raw.delivery_date;

  const pDate = parseDateSafe(pVal);
  const dDate = parseDateSafe(dVal);

  const rawDelStatus = String(
    site.deliveryStatus ||
    site.deliveryArea ||
    raw['موقف التسليم'] ||
    raw['موقف_التسليم'] ||
    raw['موقف التسليم '] ||
    ''
  ).trim();

  let isDelivered = false;
  if (rawDelStatus === 'تم التسليم') {
    isDelivered = true;
  } else if (rawDelStatus === 'لم يتم') {
    isDelivered = false;
  } else {
    isDelivered = site.status === 'تم التسليم' || site.status === 'تم الانتهاء والتسليم';
  }

  let startWeek = null;
  if (pDate) {
    const pInfo = getWeekNumber(pDate);
    if (pInfo.year < 2026 || pInfo.week <= 1) {
      startWeek = 1;
    } else if (pInfo.year === 2026) {
      startWeek = Math.min(pInfo.week, totalWeeks);
    } else {
      startWeek = 999;
    }
  }

  let slaExpirationWeek = 999;
  let targetDate = null;
  if (pDate) {
    targetDate = new Date(pDate.getTime());
    targetDate.setMonth(targetDate.getMonth() + 3);
    const tInfo = getWeekNumber(targetDate);
    if (tInfo.year < 2026 || tInfo.week <= 1) {
      slaExpirationWeek = 1;
    } else if (tInfo.year === 2026) {
      slaExpirationWeek = tInfo.week;
    } else {
      slaExpirationWeek = 999;
    }
  }

  let deliveryWeek = null;
  if (isDelivered) {
    if (dDate) {
      const dInfo = getWeekNumber(dDate);
      if (dInfo.year < 2026 || dInfo.week <= 1) {
        deliveryWeek = 1;
      } else if (dInfo.year === 2026) {
        deliveryWeek = Math.min(dInfo.week, totalWeeks);
      } else {
        deliveryWeek = totalWeeks;
      }
    } else {
      deliveryWeek = startWeek !== null && startWeek <= totalWeeks ? startWeek : Math.min(currentWeek, 45);
    }
  }

  return {
    site,
    pVal,
    pDate,
    targetDate,
    startWeek,
    slaExpirationWeek,
    isDelivered,
    deliveryWeek,
    rawDelStatus,
    classification: site.classification,
    slaField: raw['SLA'] || ''
  };
});

console.log('Total processed sites:', processedSites.length);
console.log('Delivered:', processedSites.filter(s => s.isDelivered).length);
console.log('Undelivered:', processedSites.filter(s => !s.isDelivered).length);

for (let w = 45; w <= 50; w++) {
  const overdueMatches = processedSites.filter(
    (s) => s.slaExpirationWeek <= w && (!s.isDelivered || (s.deliveryWeek !== null && s.deliveryWeek > w))
  );
  console.log(`Week ${w} Overdue Count: ${overdueMatches.length}`);
}

// Let's inspect raw['SLA'] column in Excel!
const undelivered = processedSites.filter(s => !s.isDelivered);
console.log('\n--- Undelivered sites with raw SLA field ---');
const slaValues = {};
undelivered.forEach(s => {
  slaValues[s.slaField] = (slaValues[s.slaField] || 0) + 1;
});
console.log('Undelivered raw SLA values:', slaValues);

// Let's check which sites have slaExpirationWeek > 47
console.log('\n--- Undelivered sites with slaExpirationWeek > 47 ---');
const later = undelivered.filter(s => s.slaExpirationWeek > 47);
console.log('Count:', later.length);
later.forEach(s => {
  console.log({
    id: s.site.id,
    pVal: s.pVal,
    pDate: s.pDate ? s.pDate.toISOString().slice(0, 10) : null,
    targetDate: s.targetDate ? s.targetDate.toISOString().slice(0, 10) : null,
    slaExpirationWeek: s.slaExpirationWeek,
    slaField: s.slaField,
    classification: s.classification
  });
});
