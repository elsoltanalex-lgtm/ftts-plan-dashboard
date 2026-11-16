import xlsx from 'xlsx';

const path = 'C:/Users/Sherif/.gemini/antigravity/brain/9e280e4e-06d4-45b8-9530-dcf868786adb/.user_uploaded/media_1793454977619_18fca5d5.xlsx';
const wb = xlsx.readFile(path);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log('Total raw rows:', data.length);
const header = data[0].map(h => (h !== undefined && h !== null ? String(h).trim() : ''));
console.log('Headers:', header);

const countsBySector = {};
const countsByClass = {};
const countsByStatus = {};
const sampleRowsWithDates = [];

let validRowCount = 0;
for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (!row || row.length === 0 || !row[0]) continue;
  validRowCount++;
  
  const siteCode = String(row[0]).trim();
  const execSector = row[1] ? String(row[1]).trim() : '';
  const regionSector = row[2] ? String(row[2]).trim() : '';
  const classification = row[8] ? String(row[8]).trim() : '';
  const status = row[14] ? String(row[14]).trim() : '';
  const notes = row[10] ? String(row[10]).trim() : '';
  
  countsBySector[regionSector || execSector || 'Unassigned'] = (countsBySector[regionSector || execSector || 'Unassigned'] || 0) + 1;
  countsByClass[classification] = (countsByClass[classification] || 0) + 1;
  countsByStatus[status] = (countsByStatus[status] || 0) + 1;

  // Check if any date strings or week info in notes or any column
  row.forEach((cell, idx) => {
    const s = String(cell);
    if (s.includes('2026') || s.includes('2025') || s.includes('/') || s.includes('-')) {
      if (idx !== 13 && idx !== 0) { // not just plan year or site code
        sampleRowsWithDates.push({ rowIdx: i, colIdx: idx, colName: header[idx], val: cell });
      }
    }
  });
}

console.log('Valid rows count:', validRowCount);
console.log('\nCounts by Sector:');
console.table(countsBySector);
console.log('\nCounts by Classification:');
console.table(countsByClass);
console.log('\nCounts by Status:');
console.table(countsByStatus);
console.log('\nSample cells with date-like info (first 10):', sampleRowsWithDates.slice(0, 10));

