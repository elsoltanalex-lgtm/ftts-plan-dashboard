// scripts/build_etaha_dataset.cjs
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelPath = 'C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1794494399457_e4890540.xlsx';
const wb = XLSX.readFile(excelPath);

console.log('Available sheets:', wb.SheetNames);

const d2 = XLSX.utils.sheet_to_json(wb.Sheets['Details (2)']);
const d3 = XLSX.utils.sheet_to_json(wb.Sheets['Details (3)']);
const prog = XLSX.utils.sheet_to_json(wb.Sheets['Progress']);

// Lookup maps
const d3Map = new Map();
d3.forEach(r => {
  const c = String(r.Code || '').trim();
  if (c) d3Map.set(c, r);
});

const progMap = new Map();
prog.forEach(r => {
  const c = String(r.Code || '').trim();
  if (c) progMap.set(c, r);
});

// Filter real project rows with client name
const realRows = d2.filter(r => r['اسم العميل'] && String(r['اسم العميل']).trim().length > 0);
console.log(`Processing ${realRows.length} real Etaha projects`);

const normalizedRecords = realRows.map((r, index) => {
  const rawCode = r.Code || r.code || `ETAH-${index + 1}`;
  const siteCode = String(rawCode).trim();

  // Merge latest status
  let status = r['التصنيف'];
  if (!status && progMap.has(siteCode)) {
    const p = progMap.get(siteCode);
    status = p['الموقف 12-11-2025'] || p['الموقف 10-11-2025'] || p['الموقف 6-11-2025'] || p['الموقف 4-11-2025'] || p['الموقف 2-11-2025'] || p['الموقف 28-10-2025'] || p['الموقف 26-10-2025'] || p['الموقف 18-10-2025'] || p['الموقف 14-10-2025'] || p['الموقف 7-10-2025'] || p['الموقف 30-9-2025'];
  }
  if (!status && d3Map.has(siteCode)) {
    status = d3Map.get(siteCode)['التصنيف'];
  }
  if (!status) {
    if (r['تاريخ الانتهاء'] && String(r['تاريخ الانتهاء']).trim().length > 3) {
      status = 'تم الانتهاء والتسليم';
    } else {
      status = 'جاري التنفيذ';
    }
  }

  const obstacleReason = r['سبب المعوق او التعذر'] || (d3Map.get(siteCode) && d3Map.get(siteCode)['سبب المعوق او التعذر']) || r['ملحوظه في حاله عدم الانتهاء'] || '';
  const notes = r['ملحوظه في حاله عدم الانتهاء'] || (d3Map.get(siteCode) && d3Map.get(siteCode)['ملحوظه في حاله عدم الانتهاء']) || '';
  const deliveryDate = r['تاريخ التسليم '] || (d3Map.get(siteCode) && d3Map.get(siteCode)['تاريخ التسليم ']) || '';

  return {
    ...r,
    Code: siteCode,
    _id: `ETAHA-${siteCode}`,
    'التصنيف': String(status).trim(),
    'سبب المعوق او التعذر': String(obstacleReason).trim(),
    'ملحوظه في حاله عدم الانتهاء': String(notes).trim(),
    'تاريخ التسليم ': deliveryDate,
    _createdAt: new Date().toISOString(),
    _updatedAt: new Date().toISOString(),
    _createdBy: 'bulk-excel-import',
  };
});

// Map to SiteRecord for dashboard
const siteRecords = normalizedRecords.map((r, index) => {
  const siteCode = r.Code;
  const clientName = String(r['اسم العميل'] || '').trim();
  const branchName = String(r['اسم الفرع'] || '').trim();
  const address = String(r['العنوان'] || '').trim();
  const rawStatus = String(r['التصنيف'] || '').trim();

  let status = 'جاري المعاينة';
  let executionCategory = 'In Progress';
  let progressPercent = 25;

  if (rawStatus === 'تم الانتهاء والتسليم' || rawStatus === 'تم التسليم' || rawStatus.includes('تسليم')) {
    status = 'تم الانتهاء';
    executionCategory = 'Completed';
    progressPercent = 100;
  } else if (rawStatus.includes('تم خارجي') || rawStatus.includes('متوقف علي العميل')) {
    status = 'تم الانتهاء';
    executionCategory = 'Completed';
    progressPercent = 85;
  } else if (rawStatus.includes('تصاريح')) {
    status = 'جاري تصاريح';
    executionCategory = 'In Progress';
    progressPercent = 40;
  } else if (rawStatus.includes('معوق')) {
    status = 'معوقات';
    executionCategory = 'Blocked / On Hold';
    progressPercent = 30;
  } else if (rawStatus.includes('تعذر') || rawStatus.includes('متعذر')) {
    status = 'متعذر';
    executionCategory = 'Blocked / On Hold';
    progressPercent = 15;
  } else if (rawStatus.includes('مدن') || rawStatus.includes('جاري خارجي') || rawStatus.includes('تنفيذ')) {
    status = 'جاري مدني';
    executionCategory = 'In Progress';
    progressPercent = 60;
  } else if (rawStatus.includes('كهرب')) {
    status = 'جاري كهربي';
    executionCategory = 'In Progress';
    progressPercent = 75;
  } else if (rawStatus.includes('معاين') || rawStatus.includes('منتظر')) {
    status = 'جاري المعاينة';
    executionCategory = 'Planned';
    progressPercent = 20;
  }

  // Canonical sector normalization
  let sector = String(r['القطاعات'] || 'القاهرة الكبرى').trim();
  if (sector.includes('القاهرة')) sector = 'قطاع مناطق القاهرة الكبرى';
  else if (sector.includes('الشرقية')) sector = 'قطاع شرق الدلتا';
  else if (sector.includes('الغربية')) sector = 'قطاع مناطق غرب الدلتا';
  else if (sector.includes('الجنوبية')) sector = 'قطاع مناطق الصعيد';

  const generalAdmin = String(r['الادارة العامة المنفذة'] || 'الإدارة العامة لتنفيذ الشبكات').trim();
  const competentAdmin = String(r['ادارة التنفيذ'] || r['قطاع التنفيذ'] || 'إدارة التنفيذ المختصة').trim();
  const governorate = String(r['المحافظة'] || '').trim();
  const central = String(r['سنترال الربط'] || governorate || 'سنترال رئيسي').trim();

  // Client category for Company filter
  let clientCategory = 'المؤسسات والشركات';
  if (clientName.includes('بنك') || clientName.includes('مصرف') || clientName.includes('CIB') || clientName.includes('QNB')) {
    clientCategory = 'البنوك والقطاع المصرفي';
  } else if (clientName.includes('تعليم') || clientName.includes('مدرسة') || clientName.includes('جامعة') || clientName.includes('أزهر')) {
    clientCategory = 'التربية والتعليم والجامعات';
  } else if (clientName.includes('صحة') || clientName.includes('إسعاف') || clientName.includes('مستشفى') || clientName.includes('بلازما')) {
    clientCategory = 'الصحة والمستشفيات';
  } else if (clientName.includes('كهرباء') || clientName.includes('مياه') || clientName.includes('بترول') || clientName.includes('غاز')) {
    clientCategory = 'المرافق والبنية التحتية';
  } else if (clientName.includes('ضرائب') || clientName.includes('جمارك') || clientName.includes('شرطة') || clientName.includes('داخلية')) {
    clientCategory = 'الجهات والوزارات الحكومية';
  }

  const obstacleReason = String(r['سبب المعوق او التعذر'] || r['ملحوظه في حاله عدم الانتهاء'] || 'لا يوجد تعذر').trim();
  const expectedDate = r['تاريخ الانتهاء'] || (r['تاريخ السداد و البدء فى التنفيذ'] ? '2026-12-31' : '2026-12-31');

  return {
    id: `ETAH-${siteCode}`,
    siteCode,
    siteName: `${clientName} - ${branchName && branchName !== '0' ? branchName : (address || siteCode)}`,
    company: clientCategory,
    status,
    executionCategory,
    linksCount: 1,
    sector,
    generalAdmin,
    competentAdmin,
    executionSector: String(r['قطاع التنفيذ'] || '').trim(),
    subSector: String(r['ادارة التنفيذ'] || '').trim(),
    governorate,
    central,
    civilContractor: String(r['مسئوليه التنفيذ'] || 'التنفيذ').trim(),
    responsibility: String(r['مسئوليه التنفيذ'] || 'التنفيذ').trim(),
    classification: rawStatus || 'إتاحة',
    obstacleReason,
    obstacleType: rawStatus.includes('معوق') ? 'معوقات' : rawStatus.includes('تعذر') ? 'تعذر' : '',
    deliveryArea: r['موقف التسليم'] || '',
    expectedDate,
    progressPercent,
    notes: [r['ملحوظه في حاله عدم الانتهاء'], r['اسم ورقم تليفون مدير الادارة']].filter(Boolean).join(' | '),
    rawRecord: r,
  };
});

// Save to server/data/Etaha.json
fs.writeFileSync(path.join(__dirname, '../server/data/Etaha.json'), JSON.stringify(normalizedRecords, null, 2), 'utf8');
console.log(`✅ Saved ${normalizedRecords.length} records to server/data/Etaha.json`);

// Save to src/data/etahaSites.ts
const tsContent = `// src/data/etahaSites.ts
// Official Availability Project Master Dataset (${siteRecords.length} Projects)
// Generated from media_1794494399457_e4890540.xlsx

import type { SiteRecord } from '../types/dashboard';

export interface EtahaRecord {
  م?: number;
  المشروع?: string;
  Code: string;
  'اسم العميل'?: string;
  'اسم الفرع'?: string;
  العنوان?: string;
  القطاعات?: string;
  'الادارة العامة المنفذة'?: string;
  'قطاع التنفيذ'?: string;
  المحافظة?: string;
  'مسئوليه التنفيذ'?: string;
  'ادارة التنفيذ'?: string;
  'اسم ورقم تليفون مدير الادارة'?: string;
  '  Order Service'?: any;
  'تاريخ السداد و البدء فى التنفيذ'?: any;
  المسار_الخارجي?: string;
  موقف_اللحامات?: string;
  موقف_التسليم?: string;
  'سبب المعوق او التعذر'?: string;
  'ملحوظه في حاله عدم الانتهاء'?: string;
  'تاريخ التسليم '?: any;
  التصنيف?: string;
  المده?: any;
  SLA?: string;
  'تاريخ الانتهاء'?: any;
  _id?: string;
  _createdAt?: string;
  _updatedAt?: string;
  _createdBy?: string;
  [key: string]: any;
}

export const ETAHA_RAW_RECORDS: EtahaRecord[] = ${JSON.stringify(normalizedRecords, null, 2)};

export const ETAHA_MASTER_SITES: SiteRecord[] = ${JSON.stringify(siteRecords, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../src/data/etahaSites.ts'), tsContent, 'utf8');
console.log(`✅ Saved ${siteRecords.length} sites to src/data/etahaSites.ts`);

