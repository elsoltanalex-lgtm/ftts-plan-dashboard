const supabaseUrl = 'https://fzdmdvgmorzifysygkhp.supabase.co';
const supabaseKey = 'sb_publishable_J-ecQDFtFrIXGPP3caANTw_lup9wJay';

async function checkColumns() {
  const res = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    }
  });
  const data = await res.json();
  const weTable = data.definitions?.we_records;
  if (weTable) {
    console.log('Columns in we_records:', Object.keys(weTable.properties));
  } else {
    console.log('Definitions:', Object.keys(data.definitions || {}));
  }
}

checkColumns();
