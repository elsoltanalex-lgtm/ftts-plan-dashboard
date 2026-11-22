const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const excelPath = 'C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1795351484868_0b279723.xlsx';
const wb = XLSX.readFile(excelPath);

// 1. Getdata for Special Target lookup
const wsGetdata = wb.Sheets['Getdata'];
const getdataRaw = XLSX.utils.sheet_to_json(wsGetdata, { header: 1 });
const specialTargetsMap = new Map();

for (let i = 1; i < getdataRaw.length; i++) {
  const row = getdataRaw[i];
  if (!row) continue;
  const tf = row[0];
  const code = String(row[1] || row[4] || '').trim();
  if (code && code !== 'Code') {
    const isSpecial = (tf === true || String(tf).toLowerCase() === 'true' || tf === 1);
    if (isSpecial) {
      specialTargetsMap.set(code, true);
    }
  }
}

console.log('Total special targets found in Getdata:', specialTargetsMap.size);

// Excel date converter
function parseExcelDate(val) {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel serial date to YYYY-MM-DD
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '0' || trimmed === '-') return '';
    // If already YYYY-MM-DD or DD/MM/YYYY
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
    return trimmed;
  }
  return String(val);
}

// 2. Details sheet
const wsDetails = wb.Sheets['Details'];
const rawRows = XLSX.utils.sheet_to_json(wsDetails);
console.log('Extracted Details rows:', rawRows.length);

let specialCount = 0;
const cleanRecords = rawRows.map((r, idx) => {
  const code = (r.Code !== undefined && r.Code !== null && String(r.Code).trim() !== '' && String(r.Code).trim() !== '0')
    ? String(r.Code).trim()
    : 'ETAH-' + (idx + 1);

  const isSpecial = specialTargetsMap.has(code);
  if (isSpecial) specialCount++;

  const paymentDate = parseExcelDate(r['تاريخ السداد و البدء فى التنفيذ']);
  const deliveryDate = parseExcelDate(r['تاريخ التسليم ']);
  const extPathDoneDate = parseExcelDate(r['تاريخ الانتهاء من المسار الخارجي']);

  // Normalize Sector label if has newlines
  const rawSector = String(r['القطاعات'] || '').replace(/\r\n/g, ' ').replace(/\s+/g, ' ').trim();

  return {
    ...r,
    Code: code,
    _id: 'ETAHA-' + code,
    'القطاعات': rawSector,
    'تاريخ السداد و البدء فى التنفيذ': paymentDate || r['تاريخ السداد و البدء فى التنفيذ'] || '',
    'تاريخ السداد والبدء في التنفيذ': paymentDate || r['تاريخ السداد و البدء فى التنفيذ'] || '',
    'تاريخ التسليم ': deliveryDate || r['تاريخ التسليم '] || '',
    'تاريخ الانتهاء من المسار الخارجي': extPathDoneDate || r['تاريخ الانتهاء من المسار الخارجي'] || '',
    'المسار_الخارجي': r['المسار الخارجي'] || '',
    'المسار الداخلى': r['المسار الداخلى'] || '',
    'موقف_اللحامات': r['موقف اللحامات'] || '',
    'موقف_التسليم': r['موقف التسليم'] || '',
    specialTarget: isSpecial,
    'سبيشال تارجت': isSpecial,
    'سبيشال_تارجت': isSpecial,
    _createdAt: new Date().toISOString(),
    _updatedAt: new Date().toISOString(),
    _createdBy: 'official-excel-details-368',
  };
});

console.log('Processed records count:', cleanRecords.length);
console.log('Special target count in Details:', specialCount);

// Generate TypeScript code
const tsContent = `// src/data/etahaSites.ts
// Official Availability Project Master Dataset (368 Projects)
// Generated directly from sheet 'Details' and 'Getdata' in media_1795351484868_0b279723.xlsx

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
  'تاريخ السداد والبدء في التنفيذ'?: any;
  paymentAndStartDate?: string;
  payment_and_start_date?: string;
  المسار_الخارجي?: string;
  'المسار الخارجي'?: string;
  موقف_اللحامات?: string;
  'موقف اللحامات'?: string;
  'المسار الداخلى'?: string;
  'المسار الداخلي'?: string;
  موقف_التسليم?: string;
  'موقف التسليم'?: string;
  'سبب المعوق او التعذر'?: string;
  'ملحوظه في حاله عدم الانتهاء'?: string;
  'تاريخ التسليم '?: any;
  التصنيف?: string;
  المده?: any;
  SLA?: string;
  'تاريخ الانتهاء'?: any;
  'تاريخ الانتهاء من المسار الخارجي'?: any;
  'SLA (المسار الخارجي)'?: string;
  specialTarget?: boolean;
  'سبيشال تارجت'?: boolean;
  'سبيشال_تارجت'?: boolean;
  _id?: string;
  _createdAt?: string;
  _updatedAt?: string;
  _createdBy?: string;
  [key: string]: any;
}

export const ETAHA_RAW_RECORDS: EtahaRecord[] = ${JSON.stringify(cleanRecords, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../src/data/etahaSites.ts'), tsContent, 'utf8');
console.log('Successfully wrote src/data/etahaSites.ts with 368 records');
