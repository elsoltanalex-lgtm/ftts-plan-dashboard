const fs = require('fs');
const lines = fs.readFileSync('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.system_generated/logs/transcript_full.jsonl', 'utf8').trim().split('\n');

lines.forEach((l, idx) => {
  if (l.includes('LALXA23261')) {
    try {
      const o = JSON.parse(l);
      console.log(`Line ${idx}: step ${o.step_index}, source: ${o.source}, type: ${o.type}`);
    } catch(e) {}
  }
});

