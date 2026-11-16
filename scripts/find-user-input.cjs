const fs = require('fs');
const lines = fs.readFileSync('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.system_generated/logs/transcript_full.jsonl', 'utf8').trim().split('\n');

for (let i = lines.length - 1; i >= 0; i--) {
  const obj = JSON.parse(lines[i]);
  if (obj.type === 'USER_INPUT') {
    console.log(`Step ${obj.step_index}: content length = ${obj.content?.length}`);
    if (obj.content && obj.content.includes('Site code')) {
      console.log('Found Site code in step:', obj.step_index);
      fs.writeFileSync('server/data/We_New_Extracted.csv', obj.content, 'utf8');
      break;
    }
  }
}

