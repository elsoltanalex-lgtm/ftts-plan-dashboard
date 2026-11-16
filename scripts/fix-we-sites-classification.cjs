const fs = require('fs');

console.log('Reading src/data/weSites.ts...');
let content = fs.readFileSync('src/data/weSites.ts', 'utf8');

const marker = 'export const WE_MASTER_SITES: SiteRecord[] = [';
const idx = content.indexOf(marker);
if (idx === -1) {
  console.error('Marker not found!');
  process.exit(1);
}

const before = content.slice(0, idx + marker.length);
let arrayStr = content.slice(idx + marker.length).trim();
if (arrayStr.endsWith(';')) arrayStr = arrayStr.slice(0, -1).trim();

console.log('Parsing JSON...');
const jsonStr = '[' + arrayStr;
const sites = JSON.parse(jsonStr);
console.log('Parsed sites count:', sites.length);

let updated = 0;
sites.forEach(s => {
  const rawTasneef = s.rawRecord?.['التصنيف'];
  if (rawTasneef) {
    const trimmed = String(rawTasneef).trim();
    if (trimmed) {
      s.classification = trimmed;
      s.status = trimmed;
      updated++;
    }
  }
});

console.log('Updated sites count:', updated);

// Verify classification breakdown
const counts = {};
sites.forEach(s => {
  counts[s.classification] = (counts[s.classification] || 0) + 1;
});
console.log('New WE_MASTER_SITES classifications:', counts);

// Write back to file
const newContent = content.slice(0, idx) + 'export const WE_MASTER_SITES: SiteRecord[] = ' + JSON.stringify(sites, null, 2) + ';\n';
fs.writeFileSync('src/data/weSites.ts', newContent, 'utf8');
console.log('Successfully wrote updated src/data/weSites.ts!');
