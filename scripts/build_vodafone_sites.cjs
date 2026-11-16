// scripts/build_vodafone_sites.cjs
const fs = require('fs');
const path = require('path');

const rawRecords = JSON.parse(fs.readFileSync(path.join(__dirname, '../server/data/Vodafone.json'), 'utf8'));
console.log(`Building Vodafone sites for ${rawRecords.length} records`);

function mapVodafoneRecord(r, index) {
  const rawCode = r[' Site code'] || r['Site code'] || r['site code'] || r.site_code || `VDF-${index + 1}`;
  const siteCode = String(rawCode).trim();
  const rawTasneef = String(r['التصنيف'] || '').trim();

  let status = 'جاري المعاينة';
  let executionCategory = 'In Progress';
  let progressPercent = 25;

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
  const sector = String(r['رئاسة قطاعات التنفيذ'] || 'قطاع عام').trim();
  const generalAdmin = String(r['الادارة العامة لتنفيذ الشبكات'] || r['الادارة العامة للمنطقة'] || 'الإدارة العامة لتنفيذ الشبكات').trim();
  const competentAdmin = String(r['ادارة التنفيذ الفرعية'] || 'إدارة التنفيذ والمسارات').trim();
  const obstacleReason = String(r['اسباب التعّذر'] || r['اسباب التعذر'] || r['الملاحظات'] || 'لا يوجد تعذر').trim();
  const expectedDate = r['التاريخ المتوقع للانتهاء'] || (r['خطة'] ? `${r['خطة']}-12-31` : '2026-12-31');

  return {
    id: `VDF-${siteCode}`,
    siteCode,
    siteName: `موقع ${siteCode} - ${central}`,
    company: 'Vodafone',
    status,
    executionCategory,
    linksCount: 1,
    sector,
    executionSector: String(r['قطاع التنفيذ'] || '').trim(),
    subSector: String(r['قطاع المناطق'] || '').trim(),
    generalAdmin,
    competentAdmin,
    central,
    governorate: String(r['المحافظه'] || '').trim(),
    classification: rawTasneef || 'FTTS Rollout',
    obstacleReason,
    expectedDate,
    progressPercent,
    civilContractor: String(r['مسئولية التنفيذ'] || 'التنفيذ').trim(),
    responsibility: String(r['مسئولية التنفيذ'] || 'التنفيذ').trim(),
    deliveryArea: String(r['تاكيد التسليم للمنطقه'] || '').trim(),
    electricalClassification: String(r['التصنيف (كهربي)'] || '').trim(),
    electricalStage: String(r['المرحله الكهربيه'] || '').trim(),
    notes: String(r['الملاحظات'] || '').trim(),
    lat: r['احدثيات خط العرض'] || '',
    lng: r['احدثيات خط الطول'] || '',
    rawRecord: r,
  };
}

const siteRecords = rawRecords.map(mapVodafoneRecord);

const tsContent = `// src/data/vodafoneSites.ts
// Official Vodafone FTTS Dataset (${siteRecords.length} Sites)
// Generated from media_1794491229078_6783af7d.xlsx

import type { SiteRecord } from '../types/dashboard';
import type { VodafoneRecord } from '../types/vodafone';

export const VODAFONE_RAW_RECORDS: VodafoneRecord[] = ${JSON.stringify(rawRecords, null, 2)};

export const VODAFONE_SITES: SiteRecord[] = ${JSON.stringify(siteRecords, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../src/data/vodafoneSites.ts'), tsContent, 'utf8');
console.log(`✅ Successfully generated src/data/vodafoneSites.ts with ${siteRecords.length} sites`);

