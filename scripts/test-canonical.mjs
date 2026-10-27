const supabaseUrl = 'https://fzdmdvgmorzifysygkhp.supabase.co';
const supabaseAnonKey = 'sb_publishable_J-ecQDFtFrIXGPP3caANTw_lup9wJay';

function normalize(text) {
  if (!text) return '';
  return text.toString().trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase();
}

function toCanonicalSector(raw) {
  if (!raw) return '';
  const norm = normalize(raw);
  if (norm === 'all' || norm.includes('كافه') || norm.includes('الاداره العامه')) return 'ALL';
  if (norm.includes('شرق الدلتا')) return 'قطاع شرق الدلتا';
  if (norm.includes('اسكندر') || norm.includes('ساحل') || norm.includes('مطروح')) return 'قطاع إسكندرية والساحل';
  if (norm.includes('غرب الدلتا')) return 'قطاع مناطق غرب الدلتا';
  if (norm.includes('وسط الدلتا')) return 'قطاع مناطق وسط الدلتا';
  if (norm.includes('سويس')) return 'قطاع مناطق السويس';
  if (norm.includes('اسماعيل')) return 'قطاع مناطق الإسماعيلية';
  return raw;
}

function getRecordCanonicalSector(record) {
  if (!record) return '';
  // Check Sectore first (which in WE differentiates between East Delta, Suez, Ismailia)
  const sectore = toCanonicalSector(record['Sectore']);
  if (sectore && sectore !== record['Sectore']) return sectore;

  // Check sector / Sector
  const siteSector = toCanonicalSector(record['sector'] || record.sector);
  if (siteSector && siteSector !== (record['sector'] || record.sector)) return siteSector;

  // Check Exc sector
  const excSector = toCanonicalSector(record['Exc sector'] || record['Exc Sectores']);
  if (excSector && excSector !== (record['Exc sector'] || record['Exc Sectores'])) return excSector;

  // Check Zone / generalAdmin
  const zone = toCanonicalSector(record['Zone'] || record['generalAdmin']);
  if (zone && zone !== (record['Zone'] || record['generalAdmin'])) return zone;

  return toCanonicalSector(record['sector'] || record.sector || record['Sectore'] || record['Exc sector'] || '');
}

async function testAll() {
  const res = await fetch(`${supabaseUrl}/rest/v1/we_records?select=*&limit=1000`, {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
    }
  });
  const weRecords = await res.json();
  const weCounts = {};
  weRecords.forEach(r => {
    const s = getRecordCanonicalSector(r);
    weCounts[s] = (weCounts[s] || 0) + 1;
  });
  console.log('WE Records Canonical Breakdown (Total ' + weRecords.length + '):');
  console.log(weCounts);
}

testAll();
