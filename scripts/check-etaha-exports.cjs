const fs = require('fs');
const content = fs.readFileSync('src/data/etahaSites.ts', 'utf8');
const lines = content.split('\n');
lines.filter(l => l.startsWith('export ')).forEach(l => console.log(l));
