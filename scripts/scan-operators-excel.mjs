import XLSX from 'xlsx';

const wb = XLSX.readFile('C:/Users/Sherif/Desktop/Copy of Report We 14-10-2026.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

console.log('Total rows in sheet:', rows.length);

// Check column 'Type'
const byType = {};
rows.forEach(r => {
  const t = r['Type'] || '(EMPTY)';
  byType[t] = (byType[t] || 0) + 1;
});
console.log('--- Breakdown by Type ---');
console.table(byType);

// Let's check if there is any other column indicating operator or sharing
console.log('\n--- Checking rows with VDF or Vodafone in any column ---');
const vdfRows = [];
const orgRows = [];

rows.forEach((r, idx) => {
  const type = String(r['Type'] || '');
  const notes = String(r['الملاحظات'] || '');
  const reasons = String(r['اسباب التعّذر'] || '');
  const support = String(r['الجهة المطلوب الدعم منها'] || '');
  const code = String(r[' Site code'] || '');

  const isVdfType = type.includes('VDF') || type.toLowerCase().includes('vodafone');
  const isOrgType = type.includes('ORG') || type.toLowerCase().includes('orange');

  const mentionsVdf = /vodafone|vdf|فودافون/i.test(`${type} ${notes} ${reasons} ${support}`);
  const mentionsOrg = /orange|org|أورانج|اورانج/i.test(`${type} ${notes} ${reasons} ${support}`);

  if (isVdfType || mentionsVdf) {
    vdfRows.push({ row: idx + 2, code, type, notes: notes.slice(0, 60), isVdfType });
  }
  if (isOrgType || mentionsOrg) {
    orgRows.push({ row: idx + 2, code, type, notes: notes.slice(0, 60), isOrgType });
  }
});

console.log(`Rows with VDF Type: ${vdfRows.filter(r => r.isVdfType).length}, All VDF mentions: ${vdfRows.length}`);
console.log(`Rows with ORG Type: ${orgRows.filter(r => r.isOrgType).length}, All ORG mentions: ${orgRows.length}`);

console.log('\nNon-type VDF rows:');
console.table(vdfRows.filter(r => !r.isVdfType));

console.log('\nNon-type ORG rows:');
console.table(orgRows.filter(r => !r.isOrgType));
