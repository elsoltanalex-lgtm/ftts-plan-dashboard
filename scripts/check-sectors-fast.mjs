import fs from 'fs';

const content = fs.readFileSync('./src/data/preloadedProjects.ts', 'utf-8');
const regex = /"sector":\s*"([^"]+)"/g;
let match;
const counts = {};
while ((match = regex.exec(content)) !== null) {
  const s = match[1];
  counts[s] = (counts[s] || 0) + 1;
}
console.log('Distinct sectors in preloadedProjects.ts:');
console.log(counts);
