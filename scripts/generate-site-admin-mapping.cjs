const fs = require('fs');
const xlsx = require('xlsx');

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

const tsLines = [
  '// src/data/siteAdminMapping.ts',
  '// Official mapping of Project Site Code -> إدارة التنفيذ المختصة',
  '',
  `export const SITE_ADMIN_MAPPING: Record<string, string> = ${JSON.stringify(mapping, null, 2)};`,
  '',
  'export function getSiteCompetentAdmin(siteCode: string, fallback?: string): string {',
  '  const cleanCode = String(siteCode || "").trim();',
  '  return SITE_ADMIN_MAPPING[cleanCode] || fallback || "إدارة التنفيذ والمسارات";',
  '}',
  ''
];

fs.writeFileSync('src/data/siteAdminMapping.ts', tsLines.join('\n'), 'utf8');
console.log('Successfully created src/data/siteAdminMapping.ts with', Object.keys(mapping).length, 'mappings');

