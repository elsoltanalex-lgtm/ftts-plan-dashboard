const fs = require('fs');

const lines = fs.readFileSync('C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.system_generated/logs/transcript_full.jsonl', 'utf8').trim().split('\n');

const marker = 'Site code,' + 'رئاسة قطاعات التنفيذ';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.startsWith('{')) continue;
  try {
    const obj = JSON.parse(line);
    // Search in raw json
    if (obj.source !== 'MODEL' || (obj.thinking && obj.thinking.includes(marker))) {
      const text = obj.content || obj.thinking || JSON.stringify(obj);
      if (text.includes(marker) && text.includes('LALXA23261')) {
        console.log(`Found in step ${obj.step_index}, source: ${obj.source}`);
        const start = text.indexOf(marker);
        const end = text.indexOf('<USER_REQUEST>', start);
        let csv = (end !== -1 ? text.substring(start, end) : text.substring(start)).trim();
        fs.writeFileSync('server/data/We_New_Master.csv', csv, 'utf8');
        const rows = csv.split('\n').filter(r => r.trim().length > 0);
        console.log(`Successfully saved ${rows.length} rows to server/data/We_New_Master.csv!`);
        console.log('Row 0:', rows[0].substring(0, 80));
        console.log('Row 1:', rows[1].substring(0, 80));
        console.log('Row last:', rows[rows.length - 1].substring(0, 80));
        break;
      }
    }
  } catch (e) {}
}
