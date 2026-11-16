const fs = require('fs');
const lines = fs.readFileSync('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.system_generated/logs/transcript_full.jsonl', 'utf8').trim().split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('LALXA23261')) {
    const obj = JSON.parse(lines[i]);
    console.log(`Line ${i}: step_index = ${obj.step_index}, type = ${obj.type}, source = ${obj.source}`);
  }
}
