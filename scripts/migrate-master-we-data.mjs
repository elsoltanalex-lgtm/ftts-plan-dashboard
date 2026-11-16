import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fzdmdvgmorzifysygkhp.supabase.co';
const supabaseKey = 'sb_publishable_J-ecQDFtFrIXGPP3caANTw_lup9wJay';
const supabase = createClient(supabaseUrl, supabaseKey);

const uploadedPath = 'C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1793454977619_18fca5d5.xlsx';

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
  const code = cleanStr(row[' Site code'] || row['site code']);
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

/**
 * Approved 8 classifications:
 * (تم الانتهاء، تم التشغيل فايبر، جاري المعاينة، جاري تصاريح، جاري كهربي، جاري مدني، متعذر، معوقات)
 */
function normalizeClassification(raw) {
  const s = cleanStr(raw);
  if (s.includes('انتهاء')) return 'تم الانتهاء';
  if (s.includes('تشغيل')) return 'تم التشغيل فايبر';
  // Rule: Cancel "تم مدني" -> "جاري كهربي"
  if (s.includes('مدن') && s.includes('تم')) return 'جاري كهربي';
  if (s.includes('كهرب')) return 'جاري كهربي';
  // Rule: Cancel "جاري العمل" -> "جاري مدني"
  if (s.includes('عمل') || s.includes('مدن')) return 'جاري مدني';
  if (s.includes('تصاريح')) return 'جاري تصاريح';
  if (s.includes('معاين')) return 'جاري المعاينة';
  if (s.includes('متعذر') || s.includes('متعثر')) return 'متعذر';
  if (s.includes('معوق')) return 'معوقات';
  return 'جاري المعاينة';
}

function toAggregateCategory(tasneef) {
  if (tasneef === 'تم الانتهاء' || tasneef === 'تم التشغيل فايبر') {
    return 'Completed';
  }
  if (['جاري مدني', 'جاري كهربي', 'جاري تصاريح'].includes(tasneef)) {
    return 'In Progress';
  }
  if (tasneef === 'جاري المعاينة') {
    return 'Planned';
  }
  if (['متعذر', 'معوقات'].includes(tasneef)) {
    return 'Blocked / On Hold';
  }
  return 'In Progress';
}

async function run() {
  console.log('1. Reading uploaded Excel...');
  const wb = XLSX.readFile(uploadedPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  console.log(`Loaded ${rawRows.length} rows.`);

  // 1. Copy to server/data/We_FTTS_Report.xlsx
  const destMasterExcel = path.join(process.cwd(), 'server', 'data', 'We_FTTS_Report.xlsx');
  fs.copyFileSync(uploadedPath, destMasterExcel);
  console.log(`Master Excel synchronized to: ${destMasterExcel}`);

  // 2. Build WE SiteRecord[] objects (1440 sites)
  const weSiteRecords = rawRows.map((r, i) => {
    const siteCode = cleanStr(r[' Site code'] || r['site code']) || `SITE-${i + 1}`;
    const type = cleanStr(r['Type']);
    const sector = resolveCanonicalSector(r);
    const classification = normalizeClassification(r['التصنيف']);
    const executionCategory = toAggregateCategory(classification);
    
    // Status in SiteRecord
    const status = classification;
    const generalAdmin = cleanStr(r['الادارة العامة لتنفيذ الشبكات']) || cleanStr(r['قطاع التنفيذ']) || 'الإدارة العامة لتنفيذ الشبكات';
    const competentAdmin = cleanStr(r['قطاع المناطق']) || 'إدارة التنفيذ والمسارات';
    const central = cleanStr(r['سنترال الربط']) || cleanStr(r['قطاع المناطق']) || 'سنترال رئيسي';
    const obstacleReason = cleanStr(r['اسباب التعّذر'] || r['اسباب التعذر']) || ((classification === 'معوقات' || classification === 'متعذر') && cleanStr(r['الملاحظات']) ? cleanStr(r['الملاحظات']).slice(0, 100) : 'لا يوجد تعذر');
    const planYear = cleanStr(r['خطة']) || '2026';
    const expectedDate = `${planYear}-12-31`;

    let progressPercent = 25;
    if (classification === 'تم الانتهاء' || classification === 'تم التشغيل فايبر') progressPercent = 100;
    else if (classification === 'جاري مدني') progressPercent = 60;
    else if (classification === 'جاري كهربي') progressPercent = 75;
    else if (classification === 'جاري تصاريح') progressPercent = 40;
    else if (classification === 'جاري المعاينة') progressPercent = 20;
    else if (classification === 'معوقات') progressPercent = 30;
    else if (classification === 'متعذر') progressPercent = 15;

    return {
      id: `FTTS-WE-${i + 1}`,
      siteCode,
      siteName: `موقع ${siteCode} - ${central}`,
      company: 'WE',
      status,
      executionCategory,
      linksCount: 1,
      sector,
      generalAdmin,
      competentAdmin,
      central,
      classification: type || 'FTTS Rollout',
      obstacleReason,
      expectedDate,
      progressPercent,
      civilContractor: cleanStr(r['مسئولية التنفيذ']) || 'المصرية للاتصالات',
      notes: cleanStr(r['الملاحظات']) || obstacleReason || '',
    };
  });

  // Derive Vodafone sharing sites (20) & Orange sharing sites (48)
  const vodafoneSiteRecords = weSiteRecords
    .filter(s => s.classification.includes('VDF'))
    .map((s, idx) => ({
      ...s,
      id: `FTTS-VDF-${idx + 1}`,
      company: 'Vodafone',
    }));

  const orangeSiteRecords = weSiteRecords
    .filter(s => s.classification.includes('ORG'))
    .map((s, idx) => ({
      ...s,
      id: `FTTS-ORG-${idx + 1}`,
      company: 'Orange',
    }));

  const totalFttsSiteRecords = [...weSiteRecords, ...vodafoneSiteRecords, ...orangeSiteRecords];
  console.log(`Aggregation: WE=${weSiteRecords.length}, VDF=${vodafoneSiteRecords.length}, ORG=${orangeSiteRecords.length}, Total FTTS=${totalFttsSiteRecords.length}`);

  // 3. Build db.json records & Supabase payload rows
  const sbRows = rawRows.map((r, i) => {
    const siteCode = cleanStr(r[' Site code'] || r['site code']) || `SITE-${i + 1}`;
    const canonicalSector = resolveCanonicalSector(r);
    const tanfeez = cleanStr(r['قطاع التنفيذ']);
    const manateq = cleanStr(r['قطاع المناطق']);
    const edara = cleanStr(r['الادارة العامة لتنفيذ الشبكات']);
    const masooliya = cleanStr(r['مسئولية التنفيذ']);
    const type = cleanStr(r['Type']);
    const tasneef = normalizeClassification(r['التصنيف']);
    const category = toAggregateCategory(tasneef);
    const notes = cleanStr(r['الملاحظات']);
    const taazur = cleanStr(r['اسباب التعّذر'] || r['اسباب التعذر']);
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
      'executionCategory': category,
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

  // Write server/data/db.json
  const dbData = {
    records: sbRows.map(r => r.data),
    codes: Array.from(new Set(totalFttsSiteRecords.map(s => s.siteCode))).sort(),
  };
  const dbJsonPath = path.join(process.cwd(), 'server', 'data', 'db.json');
  fs.writeFileSync(dbJsonPath, JSON.stringify(dbData, null, 2), 'utf-8');
  console.log(`Saved ${dbData.records.length} records to ${dbJsonPath}`);

  // Write server/data/We.csv
  const csvHeaders = [
    'site code',
    'Exc Sectores',
    'Sectores',
    'Exc sector',
    'Sectore',
    'Exc Zone',
    'Zone',
    'السنترال',
    'اداره التنفيذ المختصه',
    'Type',
    'التصنيف',
    'اسباب التعذر',
    'الجهة المطلوب الدعم منها',
    'خطة',
    'Site Status',
    'المستند',
    'المسئولية'
  ];
  const csvRows = sbRows.map(r => {
    const d = r.data;
    return [
      `"${d['site code']}"`,
      `"${d['Exc Sectores']}"`,
      `"${d['Sectores']}"`,
      `"${d['Exc sector']}"`,
      `"${d['Sectore']}"`,
      `"${d['Exc Zone']}"`,
      `"${d['Zone']}"`,
      `"${d['السنترال']}"`,
      `"${d['اداره التنفيذ المختصه']}"`,
      `"${d['Type']}"`,
      `"${d['التصنيف']}"`,
      `"${d['اسباب التعذر']}"`,
      `"${d['الجهة المطلوب الدعم منها']}"`,
      `"${d['خطة']}"`,
      `"${d['Site Status']}"`,
      `"${(d['المستند'] || '').replace(/"/g, '""')}"`,
      `"${d['المسئولية']}"`
    ].join(',');
  });
  const csvContent = '\uFEFF' + [csvHeaders.join(','), ...csvRows].join('\r\n');
  const csvPath = path.join(process.cwd(), 'server', 'data', 'We.csv');
  fs.writeFileSync(csvPath, csvContent, 'utf-8');
  console.log(`Saved ${csvRows.length} CSV rows to ${csvPath}`);

  // 4. Update src/data/preloadedProjects.ts
  const preloadedPath = path.join(process.cwd(), 'src', 'data', 'preloadedProjects.ts');
  const oldContent = fs.readFileSync(preloadedPath, 'utf-8');
  const etahaMarker = 'export const ETAHA_EXCEL_SITES: SiteRecord[] =';
  const etahaPart = oldContent.slice(oldContent.indexOf(etahaMarker));

  const newPreloadedContent = `// Pre-loaded datasets generated from official FTTS master plan:
// WE Master Plan: ${weSiteRecords.length} Sites
// Vodafone Sharing: ${vodafoneSiteRecords.length} Sites
// Orange Sharing: ${orangeSiteRecords.length} Sites
// Total FTTS Plan = WE (${weSiteRecords.length}) + Vodafone (${vodafoneSiteRecords.length}) + Orange (${orangeSiteRecords.length}) = ${totalFttsSiteRecords.length} Sites

import type { SiteRecord } from '../types/dashboard';

export const FTTS_EXCEL_SITES: SiteRecord[] = ${JSON.stringify(totalFttsSiteRecords, null, 2)};

export const WE_EXCEL_SITES: SiteRecord[] = ${JSON.stringify(weSiteRecords, null, 2)};

${etahaPart}
`;
  fs.writeFileSync(preloadedPath, newPreloadedContent, 'utf-8');
  console.log(`Updated ${preloadedPath}: WE=${weSiteRecords.length}, FTTS Total=${totalFttsSiteRecords.length}`);

  // 5. Seed Supabase
  console.log('Seeding Supabase public.we_records table...');
  try {
    const { error: delErr } = await supabase.from('we_records').delete().neq('site_code', '___NEVER___');
    if (delErr) console.warn('Supabase delete warning:', delErr.message);

    const BATCH_SIZE = 100;
    for (let i = 0; i < sbRows.length; i += BATCH_SIZE) {
      const batch = sbRows.slice(i, i + BATCH_SIZE);
      const { error: insErr } = await supabase.from('we_records').insert(batch);
      if (insErr) {
        console.error(`Supabase batch ${i + 1} - ${i + batch.length} error:`, insErr.message);
      }
    }
    const { count, error: countErr } = await supabase.from('we_records').select('*', { count: 'exact', head: true });
    console.log(`Supabase seeding complete! Total rows in cloud: ${count} (error: ${countErr ? countErr.message : 'none'})`);
  } catch (err) {
    console.warn('Supabase sync notice:', err.message);
  }

  console.log('🎉 All WE master datasets successfully updated!');
}

run().catch(console.error);

