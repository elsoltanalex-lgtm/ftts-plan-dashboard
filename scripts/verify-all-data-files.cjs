const fs = require('fs');

['src/data/vodafoneSites.ts', 'src/data/orangeSites.ts', 'src/data/etahaSites.ts'].forEach(file => {
  const code = fs.readFileSync(file, 'utf8');
  const counts = {};
  const lines = code.split('\n');
  lines.forEach(l => {
    if (l.includes('"classification":')) {
      const parts = l.split('"classification":');
      if (parts[1]) {
        const val = parts[1].replace(/["\s,]/g, '');
        counts[val] = (counts[val] || 0) + 1;
      }
    }
  });
  console.log(file, counts);
});
