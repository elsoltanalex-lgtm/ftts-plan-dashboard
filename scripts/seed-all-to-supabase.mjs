// scripts/seed-all-to-supabase.mjs
// Seeds WE (1029), Vodafone (699), Orange (290), and Availability/Etaha (840) to Supabase

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const rawUrl = process.env.VITE_SUPABASE_URL || 'https://ljwflhbaiszapocyqbqt.supabase.co';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5OMbSan1EptgnMGnRQzD8A_k-RY2RD1';

console.log('⚡ Initializing Supabase client for seeding...');
console.log('Target URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

function extractArray(relPath, varName) {
  const filePath = path.join(rootDir, relPath);
  const content = fs.readFileSync(filePath, 'utf8');
  const startIdx = content.indexOf('export const ' + varName);
  if (startIdx === -1) {
    throw new Error(`Variable ${varName} not found in ${relPath}`);
  }
  const equalsIdx = content.indexOf('=', startIdx);
  const arrStart = content.indexOf('[', equalsIdx);
  const arrEnd = content.indexOf('];', arrStart);
  const jsonStr = content.substring(arrStart, arrEnd + 1);
  return JSON.parse(jsonStr);
}

async function checkTable(tableName) {
  const { error } = await supabase.from(tableName).select('id').limit(1);
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

async function seedWeRecords() {
  console.log('\n--- Seeding WE Records (we_records) ---');
  const weData = extractArray('src/data/weSites.ts', 'WE_MASTER_RECORDS');
  console.log(`Found ${weData.length} WE master records.`);

  const status = await checkTable('we_records');
  if (!status.ok) {
    console.error(`❌ Table public.we_records is not ready yet: ${status.message}`);
    console.error('Please run the SQL schema in Supabase SQL editor first.');
    return;
  }

  // Clear existing
  await supabase.from('we_records').delete().neq('site_code', '___NEVER___');

  const rows = weData.map((r, i) => {
    const siteCode = (r[' Site code'] || r['site code'] || r.site_code || `WE-${i + 1}`).trim();
    return {
      site_code: siteCode,
      'site code': siteCode,
      'Exc Sectores': r['Exc Sectores'] || r['رئاسة قطاعات التنفيذ'] || '',
      'Sectores': r['Sectores'] || r['قطاع المناطق'] || '',
      'Exc sector': r['Exc sector'] || r['قطاع التنفيذ'] || '',
      'Sectore': r['Sectore'] || r['الادارة العامة للمنطقة'] || '',
      'Exc Zone': r['Exc Zone'] || r['الادارة العامة لتنفيذ الشبكات'] || '',
      'Zone': r['Zone'] || r['ادارة التنفيذ الفرعية'] || '',
      'السنترال': r['السنترال'] || '',
      'اداره التنفيذ المختصه': r['اداره التنفيذ المختصه'] || r['ادارة التنفيذ الفرعية'] || '',
      'Type': r['Type'] || '',
      'التصنيف': r['التصنيف'] || '',
      'اسباب التعذر': r['اسباب التعذر'] || r['اسباب التعّذر'] || '',
      'الجهة المطلوب الدعم منها': r['الجهة المطلوب الدعم منها'] || '',
      'خطة': r['خطة'] || '2026',
      'مواقع تم اضافتها بتاريخ2': r['مواقع تم اضافتها بتاريخ2'] || '',
      'Site Status': r['Site Status'] || 'ON AIR',
      'التاريخ المتوقع للانتهاء': r['التاريخ المتوقع للانتهاء'] || '2026-12-31',
      'التاريخ الفعلى للانتهاء': r['التاريخ الفعلى للانتهاء'] || '',
      'NLongitude': r['NLongitude'] || '',
      'NLatitude': r['NLatitude'] || '',
      'المسافة كم': r['المسافة كم'] || '',
      'المستند': r['المستند'] || '',
      'المسئولية': r['المسئولية'] || r['مسئولية التنفيذ'] || '',
      data: r,
      created_by: 'seed_script'
    };
  });

  const BATCH_SIZE = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('we_records').insert(batch);
    if (error) {
      console.error(`Batch ${i + 1}-${i + batch.length} error:`, error.message);
    } else {
      inserted += batch.length;
      process.stdout.write(`\rUploaded ${inserted} / ${rows.length} WE records...`);
    }
  }
  console.log('\n✅ WE Records Seeding Complete!');
}

async function seedVodafoneRecords() {
  console.log('\n--- Seeding Vodafone Records (vodafone_records) ---');
  const vdfData = extractArray('src/data/vodafoneSites.ts', 'VODAFONE_RAW_RECORDS');
  console.log(`Found ${vdfData.length} Vodafone records.`);

  const status = await checkTable('vodafone_records');
  if (!status.ok) {
    console.error(`❌ Table public.vodafone_records is not ready yet: ${status.message}`);
    return;
  }

  await supabase.from('vodafone_records').delete().neq('site_code', '___NEVER___');

  const rows = vdfData.map((r, i) => {
    const siteCode = (r[' Site code'] || r['Site code'] || r['site code'] || `VDF-${i + 1}`).trim();
    return {
      site_code: siteCode,
      'site code': siteCode,
      'Site code': siteCode,
      ' Site code': siteCode,
      central: r['سنترال الربط'] || '',
      sector: r['رئاسة قطاعات التنفيذ'] || '',
      general_admin: r['الادارة العامة لتنفيذ الشبكات'] || r['الادارة العامة للمنطقة'] || '',
      competent_admin: r['ادارة التنفيذ الفرعية'] || '',
      status: r['Site Status'] || 'جاري',
      classification: r['التصنيف'] || '',
      'التصنيف': r['التصنيف'] || '',
      'الملاحظات': r['الملاحظات'] || '',
      'مسئولية التنفيذ': r['مسئولية التنفيذ'] || '',
      'احدثيات خط الطول': r['احدثيات خط الطول'] || '',
      'احدثيات خط العرض': r['احدثيات خط العرض'] || '',
      data: r,
      created_by: 'seed_script'
    };
  });

  const BATCH_SIZE = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('vodafone_records').insert(batch);
    if (error) {
      console.error(`Batch ${i + 1}-${i + batch.length} error:`, error.message);
    } else {
      inserted += batch.length;
      process.stdout.write(`\rUploaded ${inserted} / ${rows.length} Vodafone records...`);
    }
  }
  console.log('\n✅ Vodafone Records Seeding Complete!');
}

async function seedOrangeRecords() {
  console.log('\n--- Seeding Orange Records (orange_records) ---');
  const orgData = extractArray('src/data/orangeSites.ts', 'ORANGE_RAW_RECORDS');
  console.log(`Found ${orgData.length} Orange records.`);

  const status = await checkTable('orange_records');
  if (!status.ok) {
    console.error(`❌ Table public.orange_records is not ready yet: ${status.message}`);
    return;
  }

  await supabase.from('orange_records').delete().neq('site_code', '___NEVER___');

  const rows = orgData.map((r, i) => {
    const siteCode = (r[' Site code'] || r['Site code'] || r['site code'] || `ORG-${i + 1}`).trim();
    return {
      site_code: siteCode,
      'site code': siteCode,
      'Site code': siteCode,
      ' Site code': siteCode,
      central: r['سنترال الربط'] || '',
      sector: r['رئاسة قطاعات التنفيذ'] || '',
      general_admin: r['الادارة العامة لتنفيذ الشبكات'] || r['الادارة العامة للمنطقة'] || '',
      competent_admin: r['ادارة التنفيذ الفرعية'] || '',
      status: r['Site Status'] || 'جاري',
      classification: r['التصنيف'] || '',
      'التصنيف': r['التصنيف'] || '',
      'الملاحظات': r['الملاحظات'] || '',
      'مسئولية التنفيذ': r['مسئولية التنفيذ'] || '',
      data: r,
      created_by: 'seed_script'
    };
  });

  const BATCH_SIZE = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('orange_records').insert(batch);
    if (error) {
      console.error(`Batch ${i + 1}-${i + batch.length} error:`, error.message);
    } else {
      inserted += batch.length;
      process.stdout.write(`\rUploaded ${inserted} / ${rows.length} Orange records...`);
    }
  }
  console.log('\n✅ Orange Records Seeding Complete!');
}

async function seedEtahaRecords() {
  console.log('\n--- Seeding Availability/Etaha Records (etaha_records) ---');
  const etahaData = extractArray('src/data/etahaSites.ts', 'ETAHA_RAW_RECORDS');
  console.log(`Found ${etahaData.length} Availability records.`);

  const status = await checkTable('etaha_records');
  if (!status.ok) {
    console.error(`❌ Table public.etaha_records is not ready yet: ${status.message}`);
    return;
  }

  await supabase.from('etaha_records').delete().neq('code', '___NEVER___');

  const rows = etahaData.map((r, i) => {
    const code = (r.Code || `ETAH-${i + 1}`).trim();
    return {
      code,
      client_name: r['اسم العميل'] || '',
      branch_name: r['اسم الفرع'] || '',
      address: r['العنوان'] || '',
      sector: r['القطاع'] || '',
      governorate: r['المحافظة'] || '',
      central: r['سنترال الربط'] || '',
      status: r['Site Status'] || 'جاري',
      classification: r['التصنيف'] || '',
      'التصنيف': r['التصنيف'] || '',
      'اسم العميل': r['اسم العميل'] || '',
      'اسم الفرع': r['اسم الفرع'] || '',
      'العنوان': r['العنوان'] || '',
      'المحافظة': r['المحافظة'] || '',
      'سنترال الربط': r['سنترال الربط'] || '',
      project_type: 'إتاحة',
      data: r,
      created_by: 'seed_script'
    };
  });

  const BATCH_SIZE = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('etaha_records').insert(batch);
    if (error) {
      console.error(`Batch ${i + 1}-${i + batch.length} error:`, error.message);
    } else {
      inserted += batch.length;
      process.stdout.write(`\rUploaded ${inserted} / ${rows.length} Etaha records...`);
    }
  }
  console.log('\n✅ Etaha Records Seeding Complete!');
}

async function main() {
  console.log('====================================================');
  console.log('🚀 Starting Full Database Seeding to Supabase');
  console.log('====================================================');

  await seedWeRecords();
  await seedVodafoneRecords();
  await seedOrangeRecords();
  await seedEtahaRecords();

  console.log('\n====================================================');
  console.log('🏁 All Seeding Operations Finished!');
  console.log('====================================================');
}

main().catch(console.error);
