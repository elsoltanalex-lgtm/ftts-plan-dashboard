import { FTTS_EXCEL_SITES, ETAHA_EXCEL_SITES, TAHAWOL_EXCEL_SITES } from './src/data/preloadedProjects.ts';

function countSectors(sites, name) {
  const counts = {};
  sites.forEach(s => {
    counts[s.sector] = (counts[s.sector] || 0) + 1;
  });
  console.log(`=== ${name} (total ${sites.length}) ===`);
  console.log(counts);
}

countSectors(FTTS_EXCEL_SITES, 'FTTS_EXCEL_SITES');
countSectors(ETAHA_EXCEL_SITES, 'ETAHA_EXCEL_SITES');
countSectors(TAHAWOL_EXCEL_SITES, 'TAHAWOL_EXCEL_SITES');
