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
  if (code && adm) mapping[code] = adm;
});

// 2. Update server/data/We_FTTS_Report.xlsx
const masterFile = 'server/data/We_FTTS_Report.xlsx';
if (fs.existsSync(masterFile)) {
  const wb = xlsx.readFile(masterFile);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet);
  
  rows.forEach(r => {
    const code = String(r[' Site code'] || r['site code'] || '').trim();
    if (mapping[code]) {
      r['إدارة التنفيذ المختصة'] = mapping[code];
      r['اداره التنفيذ المختصه'] = mapping[code];
    }
  });

  const newSheet = xlsx.utils.json_to_sheet(rows);
  wb.Sheets[sheetName] = newSheet;
  xlsx.writeFile(wb, masterFile);
  console.log('Updated server/data/We_FTTS_Report.xlsx');
}

// 3. Update server/data/db.json
const dbPath = 'server/data/db.json';
if (fs.existsSync(dbPath)) {
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  if (Array.isArray(db.we_records)) {
    let updatedInDb = 0;
    db.we_records.forEach(r => {
      const code = String(r['site code'] || r[' Site code'] || r.site_code || '').trim();
      if (mapping[code]) {
        r['إدارة التنفيذ المختصة'] = mapping[code];
        r['اداره التنفيذ المختصه'] = mapping[code];
        r.competent_admin = mapping[code];
        updatedInDb++;
      }
    });
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
    console.log('Updated server/data/db.json with', updatedInDb, 'records');
  }
}

