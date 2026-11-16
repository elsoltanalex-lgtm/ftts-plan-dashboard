// scripts/sync_we_data.cjs
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const rawWeData = JSON.parse(fs.readFileSync(path.join(__dirname, '../server/data/We.json'), 'utf8'));
console.log(`Loaded ${rawWeData.length} records from We.json`);

function normalizeClassification(raw) {
  if (!raw) return 'جاري مدني';
  const trimmed = String(raw).trim();
  if (trimmed === 'تم مدني' || trimmed === 'تم مدنى' || trimmed.includes('تم مدن')) {
    return 'جاري كهربي';
  }
  if (trimmed.includes('كهرب')) {
    return 'جاري كهربي';
  }
  if (
    trimmed === 'جاري العمل' ||
    trimmed === 'جارى العمل' ||
    trimmed === 'جاري العمل مدني' ||
    trimmed === 'جارى مدنى' ||
    trimmed === 'جارى مدني'
  ) {
    return 'جاري مدني';
  }
  if (trimmed === 'تم التشغيل فيبر' || trimmed === 'تم التشغيل') {
    return 'تم التشغيل فايبر';
  }
  if (trimmed === 'جارى تصاريح') {
    return 'جاري تصاريح';
  }
  if (trimmed === 'جارى المعاينة') {
    return 'جاري المعاينة';
  }
  return trimmed;
}

// 1. Prepare normalized records
const normalizedRecords = rawWeData.map((r, index) => {
  const code = (r[' Site code'] || r['Site code'] || r['site code'] || `SITE-${index + 1}`).trim();
  const cleanRecord = {
    ...r,
    _id: `WE-LIVE-${index + 1}`,
    'site code': code,
    site_code: code,
    'Site code': code,
    _createdAt: new Date().toISOString(),
    _updatedAt: new Date().toISOString(),
    _createdBy: 'bulk-excel-import',
  };
  return cleanRecord;
});

// 2. Prepare SiteRecord objects for frontend src/data/weSites.ts
const siteRecords = normalizedRecords.map((r, index) => {
  const siteCode = r['site code'];
  const rawTasneef = r['التصنيف'] || '';
  const tasneef = normalizeClassification(rawTasneef);
  const status = tasneef || 'جاري المعاينة';

  let executionCategory = 'In Progress';
  if (tasneef === 'تم الانتهاء' || tasneef === 'تم التشغيل فايبر' || tasneef.includes('انتهاء') || tasneef.includes('تشغيل') || status === 'تم التسليم') {
    executionCategory = 'Completed';
  } else if (tasneef === 'جاري المعاينة' || status === 'جاري المعاينة') {
    executionCategory = 'Planned';
  } else if (['معوقات', 'متعذر', 'متعثرات'].includes(tasneef) || ['معوقات', 'متعثرات'].includes(status)) {
    executionCategory = 'Blocked / On Hold';
  } else {
    executionCategory = 'In Progress';
  }

  const type = String(r['Type'] || '');
  const central = String(r['سنترال الربط'] || r['السنترال'] || 'سنترال رئيسي').trim();
  const sector = String(r['رئاسة قطاعات التنفيذ'] || 'قطاع عام').trim();
  const generalAdmin = String(r['الادارة العامة لتنفيذ الشبكات'] || 'الإدارة العامة لتنفيذ الشبكات').trim();
  const competentAdmin = String(r['ادارة التنفيذ الفرعية'] || 'إدارة التنفيذ والمسارات').trim();
  const classification = type || tasneef || 'FTTS Rollout';
  const obstacleReason = String(r['اسباب التعّذر'] || r['اسباب التعذر'] || r['الملاحظات'] || 'لا يوجد تعذر').trim();
  const expectedDate = r['خطة'] ? `${r['خطة']}-12-31` : (r['التاريخ المتوقع للانتهاء'] || '2026-12-31');

  let progressPercent = 25;
  if (status === 'تم الانتهاء' || status === 'تم التشغيل فايبر' || status === 'تم التسليم') progressPercent = 100;
  else if (status === 'جاري مدني' || status === 'جاري العمل مدني') progressPercent = 60;
  else if (status === 'جاري كهربي' || status === 'جاري العمل كهربى') progressPercent = 75;
  else if (status === 'جاري تصاريح') progressPercent = 40;
  else if (status === 'معوقات') progressPercent = 30;
  else if (status === 'متعذر' || status === 'متعثرات') progressPercent = 15;
  else if (status === 'جاري المعاينة') progressPercent = 20;

  return {
    id: `WE-${index + 1}`,
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
    classification,
    obstacleReason,
    expectedDate,
    progressPercent,
    civilContractor: String(r['مسئولية التنفيذ'] || 'WE').trim(),
    notes: String(r['الملاحظات'] || '').trim(),
    subSector: String(r['قطاع المناطق'] || '').trim(),
    executionSector: String(r['قطاع التنفيذ'] || '').trim(),
    address: String(r['Address'] || '').trim(),
    responsibility: String(r['مسئولية التنفيذ'] || 'WE').trim(),
    lat: r['NLatitude'] || '',
    lng: r['NLongitude'] || '',
    rawRecord: r
  };
});

// 3. Write src/data/weSites.ts
const weSitesTsContent = `// src/data/weSites.ts
// Official WE FTTS Master Dataset - Total: ${siteRecords.length} Sites
import type { SiteRecord } from '../types/dashboard';
import type { WeRecord } from '../config/fieldConfig';

export const WE_MASTER_RECORDS: WeRecord[] = ${JSON.stringify(normalizedRecords, null, 2)};

export const WE_MASTER_SITES: SiteRecord[] = ${JSON.stringify(siteRecords, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../src/data/weSites.ts'), weSitesTsContent, 'utf8');
console.log(`✅ Generated src/data/weSites.ts with ${siteRecords.length} sites`);

// 4. Update server/data/db.json
const dbJsonContent = {
  records: normalizedRecords,
  metadata: {
    lastUpdated: new Date().toISOString(),
    totalImported: normalizedRecords.length,
    source: 'we_.xlsx'
  }
};
fs.writeFileSync(path.join(__dirname, '../server/data/db.json'), JSON.stringify(dbJsonContent, null, 2), 'utf8');
console.log(`✅ Updated server/data/db.json with ${normalizedRecords.length} records`);

// 5. Sync to Supabase
async function uploadToSupabase() {
  const sb = createClient('https://fzdmdvgmorzifysygkhp.supabase.co', 'sb_publishable_J-ecQDFtFrIXGPP3caANTw_lup9wJay');
  
  console.log('Clearing old Supabase we_records...');
  await sb.from('we_records').delete().neq('site_code', '___NEVER___');

  console.log('Uploading batches to Supabase...');
  const batchSize = 100;
  for (let i = 0; i < normalizedRecords.length; i += batchSize) {
    const chunk = normalizedRecords.slice(i, i + batchSize);
    const rows = chunk.map(r => ({
      site_code: r['site code'],
      'site code': r['site code'],
      'Exc Sectores': r['رئاسة قطاعات التنفيذ'] || '',
      'Sectores': r['رئاسة قطاعات التنفيذ'] || '',
      'Exc sector': r['رئاسة قطاعات التنفيذ'] || '',
      'Sectore': r['رئاسة قطاعات التنفيذ'] || '',
      'Exc Zone': r['الادارة العامة لتنفيذ الشبكات'] || '',
      'Zone': r['قطاع المناطق'] || '',
      'Type': r['Type'] || '',
      'Site Status': r['Site Status'] || '',
      'NLongitude': r['NLongitude'] || '',
      'NLatitude': r['NLatitude'] || '',
      data: r,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error } = await sb.from('we_records').insert(rows);
    if (error) {
      console.error(`Batch ${i / batchSize + 1} error:`, error.message);
    } else {
      console.log(`Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(normalizedRecords.length / batchSize)} inserted (${chunk.length} rows)`);
    }
  }

  const { count } = await sb.from('we_records').select('*', { count: 'exact', head: true });
  console.log(`🎉 Supabase we_records verified total: ${count} rows`);
}

uploadToSupabase().catch(err => console.error('Upload failed:', err));

