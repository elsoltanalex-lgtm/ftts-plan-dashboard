const { createClient } = require('@supabase/supabase-js');

const url1 = 'https://ljwflhbaiszapocyqbqt.supabase.co';
const key1 = 'sb_publishable_5OMbSan1EptgnMGnRQzD8A_k-RY2RD1';
const url2 = 'https://fzdmdvgmorzifysygkhp.supabase.co';
const key2 = 'sb_publishable_J-ecQDFtFrIXGPP3caANTw_lup9wJay';

async function check() {
  const clients = [
    { name: 'Client 1', client: createClient(url1, key1) },
    { name: 'Client 2 (Fallback)', client: createClient(url2, key2) }
  ];

  const tables = ['etaha_records', 'etaha', 'availability', 'we_records', 'availability_records'];

  for (const { name, client } of clients) {
    console.log(`\n=== Testing ${name} ===`);
    for (const t of tables) {
      try {
        const { data, error } = await client.from(t).select('*').limit(2);
        if (error) {
          console.log(`Table '${t}': Error -> ${error.message} (${error.code})`);
        } else {
          console.log(`Table '${t}': EXISTS! Sample count: ${data.length}`);
          if (data.length > 0) console.log('Columns:', Object.keys(data[0]));
        }
      } catch (e) {
        console.log(`Table '${t}': Exception -> ${e.message}`);
      }
    }
  }
}

check();
