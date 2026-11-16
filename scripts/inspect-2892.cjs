const fs = require('fs');
const lines = fs.readFileSync('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.system_generated/logs/transcript_full.jsonl', 'utf8').trim().split('\n');

const line2892 = lines[2892];
const idx = line2892.indexOf('LALXA23261');
console.log('Index of LALXA23261:', idx);
console.log(line2892.substring(idx - 50, idx + 200));
