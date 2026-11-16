const fs = require('fs');
const lines = fs.readFileSync('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.system_generated/logs/transcript.jsonl', 'utf8').trim().split('\n');
const obj = JSON.parse(lines[2930]);
console.log('step_index:', obj.step_index, 'type:', obj.type, 'source:', obj.source);
if (obj.content) {
  console.log('Content length:', obj.content.length);
  fs.writeFileSync('server/data/extracted_from_2930.txt', obj.content, 'utf8');
}

