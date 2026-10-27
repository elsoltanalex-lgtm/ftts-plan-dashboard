import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fzdmdvgmorzifysygkhp.supabase.co';
const supabaseKey = 'sb_publishable_J-ecQDFtFrIXGPP3caANTw_lup9wJay';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const row = {
    site_code: 'TEST-1',
    'site code': 'TEST-1',
    'Exc Sectores': 'قطاع اسكندرية والساحل',
    'Sectores': 'قطاع إسكندرية والساحل',
    'Exc sector': 'قطاع اسكندرية والساحل',
    'Sectore': 'قطاع إسكندرية والساحل',
    'Exc Zone': 'تنفيذ شبكات الاسكندريه',
    'Zone': 'مناطق الاسكندرية',
    'Type': 'New',
    'Site Status': 'ON AIR',
    'NLongitude': '',
    'NLatitude': '',
    data: {
      'site code': 'TEST-1',
      'Site Status': 'ON AIR',
      'التصنيف': 'تم الانتهاء',
      'Sectore': 'قطاع إسكندرية والساحل',
      'Zone': 'مناطق الاسكندرية'
    }
  };

  const { data, error } = await supabase.from('we_records').insert([row]).select();
  console.log('Insert test result:', { error, data });

  if (!error) {
    await supabase.from('we_records').delete().eq('site_code', 'TEST-1');
    console.log('Cleaned up test row.');
  }
}

testInsert();
