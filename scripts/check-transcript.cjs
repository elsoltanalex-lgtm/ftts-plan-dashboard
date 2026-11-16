const fs = require('fs');
const lines = fs.readFileSync('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.system_generated/logs/transcript_full.jsonl', 'utf8').trim().split('\n');
console.log('Total steps in transcript_full:', lines.length);

for (let i = Math.max(0, lines.length - 10); i < lines.length; i++) {
  try {
    const obj = JSON.parse(lines[i]);
    console.log(`[${i}] step_index: ${obj.step_index}, type: ${obj.type}, source: ${obj.source}, content_len: ${obj.content ? obj.content.length : 0}`);
  } catch (e) {
    console.log(`[${i}] parse error:`, e.message);
  }
}

