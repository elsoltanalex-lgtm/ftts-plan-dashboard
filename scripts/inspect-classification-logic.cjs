const fs = require('fs');

const weSitesCode = fs.readFileSync('src/data/weSites.ts', 'utf8');
const vdfSitesCode = fs.readFileSync('src/data/vodafoneSites.ts', 'utf8');
const orgSitesCode = fs.readFileSync('src/data/orangeSites.ts', 'utf8');
const etaSitesCode = fs.readFileSync('src/data/etahaSites.ts', 'utf8');

console.log('weSites size:', weSitesCode.length);
console.log('vdfSites size:', vdfSitesCode.length);
console.log('orgSites size:', orgSitesCode.length);
console.log('etaSites size:', etaSitesCode.length);

// In Dashboard.tsx, let's see how currentScopeData is loaded:
const dash = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
const lines = dash.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('currentScopeData') || l.includes('activeScope') || l.includes('liveWeSites')) {
    if (idx > 100 && idx < 220) {
      console.log((idx + 1) + ': ' + l);
    }
  }
});
