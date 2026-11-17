const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const excelPath = 'C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1794918303267_8186e4e2.xlsx';
const wb = XLSX.readFile(excelPath);
const ws = wb.Sheets['Details'];
const rawRows = XLSX.utils.sheet_to_json(ws);

console.log('Extracted Details rows:', rawRows.length);

const cleanRecords = rawRows.map((r, idx) => {
  const code = (r.Code !== undefined && r.Code !== null && String(r.Code).trim() !== '' && String(r.Code).trim() !== '0')
    ? String(r.Code).trim()
    : `ETAH-${idx + 1}`;

  return {
    ...r,
    Code: code,
    _id: `ETAHA-${code}`,
    'المسار_الخارجي': r['المسار الخارجي'] || '',
    'المسار الداخلى': r['المسار الداخلى'] || '',
    'موقف_اللحامات': r['المسار الداخلى'] || '',
    'موقف_التسليم': r['موقف التسليم'] || '',
    _createdAt: new Date().toISOString(),
    _updatedAt: new Date().toISOString(),
    _createdBy: 'official-excel-details-360',
  };
});

console.log('Processed records count:', cleanRecords.length);

const fileHeader = `// src/data/etahaSites.ts
// Official Availability Project Master Dataset (360 Projects)
// Generated directly from sheet 'Details' in media_1794918303267_8186e4e2.xlsx

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
  'المسار الخارجي'?: string;
  موقف_اللحامات?: string;
  'موقف اللحامات'?: string;
  'المسار الداخلى'?: string;
  موقف_التسليم?: string;
  'موقف التسليم'?: string;
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

export const ETAHA_RAW_RECORDS: EtahaRecord[] = ${JSON.stringify(cleanRecords, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../src/data/etahaSites.ts'), fileHeader, 'utf8');
console.log('Successfully wrote src/data/etahaSites.ts with 360 records');
