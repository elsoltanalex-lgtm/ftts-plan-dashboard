const fs = require('fs');

const code = fs.readFileSync('src/data/weSites.ts', 'utf8');
const regex = /"classification":\s*"(Sharing|New|GD)"/g;
let match;
let count = 0;
while ((match = regex.exec(code)) !== null) {
  count++;
}
console.log('Sites with Sharing/New/GD classification in weSites.ts:', count);
