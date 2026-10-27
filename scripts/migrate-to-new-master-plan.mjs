import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fzdmdvgmorzifysygkhp.supabase.co';
const supabaseKey = 'sb_publishable_J-ecQDFtFrIXGPP3caANTw_lup9wJay';
const supabase = createClient(supabaseUrl, supabaseKey);

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

async function migrate() {
  const excelPath = 'C:/Users/Sherif/Desktop/Copy of Report We 14-10-2026.xlsx';
  console.log(`Reading Excel file from ${excelPath}...`);
  const wb = XLSX.readFile(excelPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  console.log(`Total rows in Excel: ${rawRows.length}`);

  // 1. Build SiteRecord[] objects (for dashboard and preloadedProjects.ts)
  const siteRecords = rawRows.map((r, i) => {
    const siteCode = cleanStr(r[' Site code']) || `SITE-${i + 1}`;
    const type = cleanStr(r['Type']);
    let company = 'WE';
    if (type.includes('VDF')) company = 'Vodafone';
    else if (type.includes('ORG')) company = 'Orange';

    const sector = resolveCanonicalSector(r);
    const status = normalizeStatus(r['التصنيف'], r['الملاحظات']);
    const generalAdmin = cleanStr(r['الادارة العامة لتنفيذ الشبكات']) || cleanStr(r['قطاع التنفيذ']) || 'الإدارة العامة لتنفيذ الشبكات';
    const competentAdmin = cleanStr(r['قطاع المناطق']) || (generalAdmin.includes('القاهرة') ? 'مناطق القاهرة الكبرى' : 'إدارة التنفيذ والمسارات');
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
      id: `FTTS-MASTER-${i + 1}`,
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

  // 2. Build Supabase payload rows and db.json objects
  const sbRows = rawRows.map((r, i) => {
    const siteCode = cleanStr(r[' Site code']) || `SITE-${i + 1}`;
    const canonicalSector = resolveCanonicalSector(r);
    const tanfeez = cleanStr(r['قطاع التنفيذ']);
    const manateq = cleanStr(r['قطاع المناطق']);
    const edara = cleanStr(r['الادارة العامة لتنفيذ الشبكات']);
    const masooliya = cleanStr(r['مسئولية التنفيذ']);
    const type = cleanStr(r['Type']);
    const tasneef = cleanStr(r['التصنيف']);
    const notes = cleanStr(r['الملاحظات']);
    const taazur = cleanStr(r['اسباب التعّذر']);
    const daam = cleanStr(r['الجهة المطلوب الدعم منها']);
    const plan = cleanStr(r['خطة']) || '2026';
    const status = cleanStr(r['Site Status']) || 'ON AIR';

    const fullData = {
      _id: `WE-LIVE-${i + 1}`,
      'site code': siteCode,
      'Exc sector': tanfeez || canonicalSector,
      'Exc Sectores': tanfeez || canonicalSector,
      'Sectore': canonicalSector,
      'Sectores': canonicalSector,
      'Zone': manateq || edara,
      'Exc Zone': edara,
      'اداره التنفيذ المختصه': edara || tanfeez,
      'السنترال': manateq || edara,
      'Type': type,
      'التصنيف': tasneef,
      'الملاحظات': notes,
      'اسباب التعذر': taazur || (tasneef.includes('معوق') || tasneef.includes('متعذر') ? notes : ''),
      'الجهة المطلوب الدعم منها': daam,
      'خطة': plan,
      'Site Status': status,
      'المسئولية': masooliya,
      'المستند': notes,
      'التاريخ المتوقع للانتهاء': plan ? `${plan}-12-31` : '2026-12-31',
    };

    return {
      site_code: siteCode,
      'site code': siteCode,
      'Exc Sectores': tanfeez || canonicalSector,
      'Sectores': canonicalSector,
      'Exc sector': tanfeez || canonicalSector,
      'Sectore': canonicalSector,
      'Exc Zone': edara,
      'Zone': manateq || edara,
      'Type': type,
      'Site Status': status,
      'NLongitude': '',
      'NLatitude': '',
      data: fullData,
    };
  });

  // 3. Write to server/data/db.json and sync server/data/We_FTTS_Report.xlsx
  const destExcelPath = path.join(process.cwd(), 'server', 'data', 'We_FTTS_Report.xlsx');
  fs.copyFileSync(excelPath, destExcelPath);
  console.log(`Synchronized master Excel file to ${destExcelPath}`);

  const dbData = {
    records: sbRows.map(r => r.data),
    codes: Array.from(new Set(siteRecords.map(s => s.siteCode))).sort(),
  };
  const dbJsonPath = path.join(process.cwd(), 'server', 'data', 'db.json');
  fs.writeFileSync(dbJsonPath, JSON.stringify(dbData, null, 2), 'utf-8');
  console.log(`Saved ${dbData.records.length} records to ${dbJsonPath}`);

  // 4. Update src/data/preloadedProjects.ts with the new dataset
  console.log('Updating src/data/preloadedProjects.ts...');
  const preloadedPath = path.join(process.cwd(), 'src', 'data', 'preloadedProjects.ts');
  const oldContent = fs.readFileSync(preloadedPath, 'utf-8');

  // Extract ETAHA and TAHAWOL from existing file so they are preserved
  const etahaMarker = 'export const ETAHA_EXCEL_SITES: SiteRecord[] =';
  const tahawolMarker = 'export const TAHAWOL_EXCEL_SITES: SiteRecord[] =';

  const etahaPart = oldContent.slice(oldContent.indexOf(etahaMarker));

  const newPreloadedContent = `// Pre-loaded datasets generated from official WE FTTS master plan:
// Copy of Report We 14-10-2026.xlsx (1440 Sites - All Operators: WE, Vodafone, Orange)

import type { SiteRecord } from '../types/dashboard';

export const FTTS_EXCEL_SITES: SiteRecord[] = ${JSON.stringify(siteRecords, null, 2)};

export const WE_EXCEL_SITES: SiteRecord[] = FTTS_EXCEL_SITES;

${etahaPart}
`;

  fs.writeFileSync(preloadedPath, newPreloadedContent, 'utf-8');
  console.log('src/data/preloadedProjects.ts updated successfully with 1440 sites!');

  // 5. Seed Supabase public.we_records table
  console.log('Seeding Supabase public.we_records table...');
  const { error: delErr } = await supabase.from('we_records').delete().neq('site_code', '___NEVER___');
  if (delErr) {
    console.warn('Delete warning:', delErr.message);
  }

  const BATCH_SIZE = 100;
  for (let i = 0; i < sbRows.length; i += BATCH_SIZE) {
    const batch = sbRows.slice(i, i + BATCH_SIZE);
    const { error: insErr } = await supabase.from('we_records').insert(batch);
    if (insErr) {
      console.error(`Batch ${i + 1} - ${i + batch.length} error:`, insErr.message);
    } else {
      console.log(`Uploaded batch ${i + 1} to ${Math.min(i + BATCH_SIZE, sbRows.length)} to Supabase`);
    }
  }

  const { count, error: countErr } = await supabase.from('we_records').select('*', { count: 'exact', head: true });
  console.log(`Supabase seeding complete! Total rows: ${count} (error: ${countErr ? countErr.message : 'none'})`);
}

migrate().catch(console.error);
