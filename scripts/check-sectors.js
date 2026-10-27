import fs from 'fs';
const content = fs.readFileSync('./src/data/preloadedProjects.ts', 'utf8');
const sectors = new Set();
const matches = content.matchAll(/"sector":\s*"([^"]+)"/g);
for (const m of matches) {
  sectors.add(m[1]);
}
console.log('Sectors in preloadedProjects:', Array.from(sectors));
