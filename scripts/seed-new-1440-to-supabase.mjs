import XLSX from 'xlsx';
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

async function seed() {
  const filePath = 'C:/Users/Sherif/Desktop/Copy of Report We 14-10-2026.xlsx';
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  console.log(`Processing ${rawRows.length} rows for Supabase...`);

  // Clear existing records in Supabase
  console.log('Clearing old records from Supabase public.we_records...');
  const { error: delError } = await supabase.from('we_records').delete().neq('site code', '___NEVER___');
  if (delError) {
    console.error('Delete error:', delError);
  } else {
    console.log('Old records deleted successfully.');
  }

  // Format records to match we_records schema
  const rows = rawRows.map((r, i) => {
    const siteCode = cleanStr(r[' Site code']) || `WE-SITE-${i + 1}`;
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

    const rowObj = {
      'site code': siteCode,
      'Exc Sectores': tanfeez || canonicalSector,
      'Sectores': canonicalSector,
      'Exc sector': tanfeez || canonicalSector,
      'Sectore': canonicalSector,
      'Exc Zone': edara,
      'Zone': manateq || edara,
      'السنترال': manateq || edara,
      'اداره التنفيذ المختصه': edara || tanfeez,
      'Type': type,
      'التصنيف': tasneef,
      'اسباب التعذر': taazur || (tasneef.includes('معوق') || tasneef.includes('متعذر') ? notes : ''),
      'الجهة المطلوب الدعم منها': daam,
      'خطة': plan,
      'Site Status': status,
      'المستند': notes,
      'المسئولية': masooliya,
      'التاريخ المتوقع للانتهاء': plan ? `${plan}-12-31` : '2026-12-31',
      created_by: 'system_import',
    };

    return rowObj;
  });

  // Insert in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error: insError } = await supabase.from('we_records').insert(batch);
    if (insError) {
      console.error(`Batch ${i + 1} - ${i + batch.length} error:`, insError.message);
    } else {
      console.log(`Inserted batch ${i + 1} to ${Math.min(i + BATCH_SIZE, rows.length)} of ${rows.length}`);
    }
  }

  // Verify total count in Supabase
  const { count, error: countErr } = await supabase.from('we_records').select('*', { count: 'exact', head: true });
  console.log(`Total rows in Supabase: ${count} (error: ${countErr ? countErr.message : 'none'})`);
}

seed().catch(console.error);
