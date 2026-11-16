// scripts/update_preloaded.cjs
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/preloadedProjects.ts');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const weStart = lines.findIndex(l => l.startsWith('export const WE_EXCEL_SITES'));
const etahaStart = lines.findIndex(l => l.startsWith('export const ETAHA_EXCEL_SITES'));

console.log(`weStart index: ${weStart}, etahaStart index: ${etahaStart}`);

if (weStart !== -1 && etahaStart !== -1 && etahaStart > weStart) {
  const beforeWe = lines.slice(0, weStart);
  // Add import at beginning if not present
  if (!beforeWe[0].includes("import { WE_MASTER_SITES }")) {
    beforeWe.unshift("import { WE_MASTER_SITES } from './weSites';");
  }
  const replacement = [
    '// WE Master Plan: Updated 1029 Sites from we_.xlsx',
    'export const WE_EXCEL_SITES: SiteRecord[] = WE_MASTER_SITES;',
    ''
  ];
  const afterWe = lines.slice(etahaStart);

  const newLines = [...beforeWe, ...replacement, ...afterWe];
  fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
  console.log(`✅ Successfully updated preloadedProjects.ts. New lines count: ${newLines.length}`);
} else {
  console.error('Indices not found or invalid');
}

