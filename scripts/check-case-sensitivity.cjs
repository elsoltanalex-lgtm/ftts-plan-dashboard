const fs = require('fs');
const path = require('path');

function getActualCase(filePath) {
  const parts = path.resolve(filePath).split(path.sep);
  let current = parts[0] ? parts[0] + path.sep : path.sep; // Drive letter on Windows
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (!fs.existsSync(current)) return null;
    const items = fs.readdirSync(current);
    const exact = items.find(it => it.toLowerCase() === part.toLowerCase());
    if (!exact) return null;
    if (exact !== part) {
      return { expected: part, actual: exact, parent: current };
    }
    current = path.join(current, exact);
  }
  return null;
}

const filesToCheck = [];
function findFiles(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist') {
        findFiles(full);
      }
    } else if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.json')) {
      filesToCheck.push(full);
    }
  }
}
findFiles('src');

console.log('Checking', filesToCheck.length, 'files for import case mismatches...');

let mismatches = 0;
const importRegex = /(?:import|export)\s+(?:.*?from\s+)?['"](\.[^'"]+)['"]/g;

for (const file of filesToCheck) {
  const content = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = importRegex.exec(content)) !== null) {
    const relImport = m[1];
    const dir = path.dirname(file);
    const resolvedBase = path.resolve(dir, relImport);
    
    // Test possible extensions: none, .ts, .tsx, .js, .json, /index.ts, /index.tsx
    const extensions = ['', '.ts', '.tsx', '.js', '.json', '/index.ts', '/index.tsx'];
    let foundPath = null;
    for (const ext of extensions) {
      if (fs.existsSync(resolvedBase + ext)) {
        foundPath = resolvedBase + ext;
        break;
      }
    }

    if (!foundPath) {
      console.error(`[NOT FOUND] In ${file}: "${relImport}"`);
      mismatches++;
    } else {
      const caseMismatch = getActualCase(foundPath);
      if (caseMismatch) {
        console.error(`[CASE MISMATCH] In ${file}: "${relImport}" -> Disk has "${caseMismatch.actual}" but imported as "${caseMismatch.expected}"`);
        mismatches++;
      }
    }
  }
}

if (mismatches === 0) {
  console.log('✅ ALL IMPORTS MATCH EXACT CASE ON DISK!');
} else {
  console.log(`❌ Found ${mismatches} issues!`);
}
