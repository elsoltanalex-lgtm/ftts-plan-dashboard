const fs = require('fs');

const weSites = JSON.parse(fs.readFileSync('server/data/We.json', 'utf8'));
const vdfSites = JSON.parse(fs.readFileSync('server/data/Vodafone.json', 'utf8'));
const orgSites = JSON.parse(fs.readFileSync('server/data/Orange.json', 'utf8'));
const etaSites = JSON.parse(fs.readFileSync('server/data/Etaha.json', 'utf8'));

function getSiteClassification(raw) {
  if (raw && raw['التصنيف']) return String(raw['التصنيف']).trim();
  if (raw && raw.classification && raw.classification !== 'Sharing' && raw.classification !== 'New' && raw.classification !== 'GD') {
    return String(raw.classification).trim();
  }
  if (raw && raw.status) return String(raw.status).trim();
  return 'غير محدد';
}

function testDataset(name, list) {
  console.log(`\n=== Testing ${name} (${list.length} records) ===`);
  const counts = {};
  list.forEach(item => {
    const c = getSiteClassification(item);
    counts[c] = (counts[c] || 0) + 1;
  });
  console.log('Exact Excel Classifications Breakdown:');
  Object.entries(counts).sort((a,b) => b[1] - a[1]).forEach(([k, v]) => {
    const pct = ((v / list.length) * 100).toFixed(1);
    console.log(`  - ${k}: ${v} (${pct}%)`);
  });
}

testDataset('WE', weSites);
testDataset('Vodafone', vdfSites);
testDataset('Orange', orgSites);
testDataset('Etaha (Availability)', etaSites);
