const fs = require('fs');
const xlsx = require('xlsx');

// 1. Load mapping
const fileNew = 'C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1793612157416_abb63ac5.xlsx';
const wbNew = xlsx.readFile(fileNew);
const weData = xlsx.utils.sheet_to_json(wbNew.Sheets['WE']);

const mapping = {};
weData.forEach(r => {
  const code = String(r['site code'] || '').trim();
  const adm = String(r['إدارة التنفيذ المختصة'] || '').trim();
  if (code && adm) {
    mapping[code] = adm;
  }
});

// 2. Load preloadedProjects
const preloadedPath = 'src/data/preloadedProjects.ts';
let content = fs.readFileSync(preloadedPath, 'utf8');

// Match WE_EXCEL_SITES array and FTTS_EXCEL_SITES array
// We can extract each site record and update competentAdmin
let updateCount = 0;

// Match JSON objects inside the arrays
// A regex to match each object block
const regex = /"siteCode":\s*"([^"]+)",[\s\S]*?"competentAdmin":\s*"([^"]+)"/g;

content = content.replace(regex, (match, siteCode, currentAdmin) => {
  const code = siteCode.trim();
  if (mapping[code]) {
    updateCount++;
    return match.replace(`"competentAdmin": "${currentAdmin}"`, `"competentAdmin": "${mapping[code]}"`);
  }
  return match;
});

fs.writeFileSync(preloadedPath, content, 'utf8');
console.log('Updated competentAdmin in', preloadedPath, 'count:', updateCount);

