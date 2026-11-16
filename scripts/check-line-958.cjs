const fs = require('fs');
const lines = fs.readFileSync('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.system_generated/logs/transcript_full.jsonl', 'utf8').trim().split('\n');

const obj = JSON.parse(lines[958]);
console.log('Line 958:', obj.step_index, obj.type, obj.source);
console.log('Content preview:');
console.log(obj.content.substring(0, 300));
fs.writeFileSync('server/data/We_New_Extracted.csv', obj.content, 'utf8');
console.log('Saved to server/data/We_New_Extracted.csv, length:', obj.content.length);

