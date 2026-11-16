const fs = require('fs');
const lines = fs.readFileSync('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.system_generated/logs/transcript_full.jsonl', 'utf8').trim().split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('LCAIG49062')) {
    const obj = JSON.parse(lines[i]);
    console.log(`transcript_full line ${i}: step_index = ${obj.step_index}, type = ${obj.type}, source = ${obj.source}`);
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string' && v.includes('LCAIG49062')) {
        console.log(`  Found in key "${k}", length = ${v.length}`);
        if (v.includes('Site code,رئاسة قطاعات التنفيذ')) {
          const start = v.indexOf('Site code,رئاسة قطاعات التنفيذ');
          const end = v.indexOf('<USER_REQUEST>', start);
          const csvText = v.substring(start, end !== -1 ? end : undefined).trim();
          fs.writeFileSync('server/data/We_New_Master.csv', csvText, 'utf8');
          console.log('Saved CSV to server/data/We_New_Master.csv! Length:', csvText.length);
        }
      }
    }
  }
}

