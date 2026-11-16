// scripts/build_new_orange_sites.cjs
const fs = require('fs');
const path = require('path');

const rawRecords = JSON.parse(fs.readFileSync(path.join(__dirname, '../server/data/Orange.json'), 'utf8'));
console.log(`Building Orange sites for ${rawRecords.length} records`);

function mapOrangeRecord(r, index) {
  const rawCode = r[' Site code'] || r['Site code'] || r['site code'] || r.site_code || `ORG-${index + 1}`;
  const siteCode = String(rawCode).trim();
  const rawTasneef = String(r['التصنيف'] || '').trim();

  let status = 'جاري المعاينة';
  let executionCategory = 'In Progress';
  let progressPercent = 20;

  if (rawTasneef === 'تم التسليم' || rawTasneef.includes('تسليم')) {
    status = 'تم الانتهاء';
    executionCategory = 'Completed';
    progressPercent = 100;
  } else if (rawTasneef.includes('تصاريح')) {
    status = 'جاري تصاريح';
    executionCategory = 'In Progress';
    progressPercent = 40;
  } else if (rawTasneef.includes('معوق')) {
    status = 'معوقات';
    executionCategory = 'Blocked / On Hold';
    progressPercent = 30;
  } else if (rawTasneef.includes('متعذر') || rawTasneef.includes('تعذر')) {
    status = 'متعذر';
    executionCategory = 'Blocked / On Hold';
    progressPercent = 15;
  } else if (rawTasneef === 'جاري العمل مدني' || rawTasneef.includes('مدن')) {
    status = 'جاري مدني';
    executionCategory = 'In Progress';
    progressPercent = 60;
  } else if (rawTasneef.includes('كهرب')) {
    status = 'جاري كهربي';
    executionCategory = 'In Progress';
    progressPercent = 75;
  } else if (rawTasneef.includes('معاين')) {
    status = 'جاري المعاينة';
    executionCategory = 'Planned';
    progressPercent = 20;
  }

  const central = String(r['سنترال الربط'] || 'سنترال رئيسي').trim();
  const sector = String(r['رئاسة قطاعات التنفيذ'] || r['رئاسة القطاعات '] || r['رئاسة القطاعات'] || 'تنفيذ شبكات المنطقة الشرقية والغربية').trim();
  const generalAdmin = String(r['الادارة العامة لتنفيذ الشبكات'] || r['الادارة العامة للتنفيذ'] || r['الادارة العامة'] || 'الإدارة العامة لتنفيذ الشبكات').trim();
  const subSector = String(r['قطاع التنفيذ'] || r['قطاع المناطق'] || r['القطاع'] || 'إدارة مختصة').trim();
  const competentAdmin = String(r['ادارة التنفيذ الفرعية'] || r['الادارة العامة للمنطقة'] || r['المنطقة'] || 'إدارة المنطقة').trim();
  const obstacleReason = String(r['اسباب التعّذر'] || r['اسباب التعذر'] || r['الملاحظات'] || 'لا يوجد تعذر').trim();
  const expectedDate = r['التاريخ المتوقع للانتهاء'] || (r['خطة'] ? `${r['خطة']}-12-31` : '2026-12-31');

  return {
    id: `ORG-${siteCode}`,
    siteCode,
    siteName: `موقع ${siteCode} - ${central}`,
    company: 'Orange',
    status,
    executionCategory,
    linksCount: 1,
    sector,
    generalAdmin,
    subSector,
    competentAdmin,
    executionSector: String(r['قطاع التنفيذ'] || '').trim(),
    governorate: String(r['المحافظه'] || '').trim(),
    central,
    civilContractor: String(r['مسئولية التنفيذ'] || 'التنفيذ').trim(),
    responsibility: String(r['مسئولية التنفيذ'] || 'التنفيذ').trim(),
    classification: rawTasneef || 'FTTS Rollout',
    obstacleReason,
    obstacleType: String(r['اسباب التعّذر'] || r['اسباب التعذر'] || '').trim(),
    deliveryArea: String(r['تاكيد التسليم للمنطقه'] || '').trim(),
    electricalClassification: String(r['التصنيف (كهربي)'] || '').trim(),
    electricalStage: String(r['المرحله الكهربيه'] || '').trim(),
    expectedDate,
    progressPercent,
    notes: String(r['الملاحظات'] || '').trim(),
    lat: r['احدثيات خط العرض'] || '',
    lng: r['احدثيات خط الطول'] || '',
    rawRecord: r,
  };
}

const siteRecords = rawRecords.map(mapOrangeRecord);

const tsContent = `// src/data/orangeSites.ts
// Complete Official Orange FTTS Dataset (${siteRecords.length} Sites)
// Generated from media_1794493121591_4e0138ec.xlsx

import type { SiteRecord } from '../types/dashboard';
import type { OrangeRecord } from '../types/orange';

export const ORANGE_RAW_RECORDS: OrangeRecord[] = ${JSON.stringify(rawRecords, null, 2)};

export const ORANGE_SITES: SiteRecord[] = ${JSON.stringify(siteRecords, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../src/data/orangeSites.ts'), tsContent, 'utf8');
console.log(`✅ Successfully generated src/data/orangeSites.ts with ${siteRecords.length} sites`);

