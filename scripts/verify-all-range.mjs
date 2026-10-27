import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fzdmdvgmorzifysygkhp.supabase.co';
const supabaseKey = 'sb_publishable_J-ecQDFtFrIXGPP3caANTw_lup9wJay';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetchPaged() {
  const pageSize = 1000;
  let allRows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('we_records')
      .select('*')
      .range(from, from + pageSize - 1)
      .order('id');

    if (error) {
      console.error('Error fetching page:', error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`Successfully fetched ALL ${allRows.length} records in pages from Supabase!`);
  const operators = { WE: 0, Vodafone: 0, Orange: 0 };
  const sectors = {};

  allRows.forEach(r => {
    const type = r['Type'] || r.data?.['Type'] || '';
    if (type.includes('VDF')) operators.Vodafone++;
    else if (type.includes('ORG')) operators.Orange++;
    else operators.WE++;

    const sec = r['Sectore'] || r.data?.['Sectore'] || 'Unknown';
    sectors[sec] = (sectors[sec] || 0) + 1;
  });

  console.log('Operator breakdown in Supabase:', operators);
  console.log('Sector breakdown in Supabase:', sectors);
}

testFetchPaged();
