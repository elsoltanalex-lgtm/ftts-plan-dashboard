const fs = require('fs');
const content = fs.readFileSync('scripts/generate-etaha-360.cjs', 'utf8');
console.log(content.slice(1500, 3000));
