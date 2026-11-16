import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.VITE_SUPABASE_URL || 'https://ljwflhbaiszapocyqbqt.supabase.co';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5OMbSan1EptgnMGnRQzD8A_k-RY2RD1';

console.log('Connecting to Supabase at:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
  console.log('Testing connectivity to tables...\n');
  
  const tables = ['we_records', 'vodafone_records', 'orange_records', 'etaha_records', 'uploaded_datasets'];
  
  for (const table of tables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact' })
      .limit(1);

    if (error) {
      console.log(`Table [${table}]: ⚠️ Not ready / ${error.message} (Code: ${error.code})`);
    } else {
      console.log(`Table [${table}]: ✅ Accessible and ready! Row count: ${count}`);
    }
  }

  console.log('\nTesting storage buckets...');
  const { data: buckets, error: bError } = await supabase.storage.listBuckets();
  if (bError) {
    console.log('Storage Buckets: ⚠️ Error:', bError.message);
  } else {
    console.log(`Storage Buckets: ✅ Found ${buckets.length} bucket(s):`, buckets.map(b => b.name).join(', ') || '(none yet)');
  }
}

testFetch().catch(console.error);
