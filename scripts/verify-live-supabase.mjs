const supabaseUrl = 'https://fzdmdvgmorzifysygkhp.supabase.co';
const supabaseKey = 'sb_publishable_J-ecQDFtFrIXGPP3caANTw_lup9wJay';

async function testFetch() {
  const res = await fetch(`${supabaseUrl}/rest/v1/we_records?select=id,site code,Sectore,Type,Site Status&limit=2000`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    }
  });
  const data = await res.json();
  console.log(`Fetched ${data.length} records from Supabase we_records table.`);
  const sectors = {};
  data.forEach(r => {
    sectors[r['Sectore']] = (sectors[r['Sectore']] || 0) + 1;
  });
  console.log('Sectors breakdown in Supabase:');
  console.log(sectors);
}

testFetch().catch(console.error);
