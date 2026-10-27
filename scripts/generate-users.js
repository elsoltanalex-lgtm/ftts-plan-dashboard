import bcrypt from 'bcryptjs';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Unified Canonical Accounts
const USERS = [
  {
    id: 'user_admin',
    username: 'admin',
    displayName: 'الإدارة العامة المركزية',
    plainPassword: 'Admin@2026',
    sector: 'ALL',
    role: 'admin',
    permissions: ['view_all', 'edit_all', 'delete_all', 'export_all'],
  },
  {
    id: 'user_alex_coast',
    username: 'alex_coast',
    displayName: 'قطاع إسكندرية والساحل',
    plainPassword: 'AlexCoast@2026',
    sector: 'قطاع إسكندرية والساحل',
    role: 'editor',
    permissions: ['view_all', 'edit_own_sector', 'export_all'],
  },
  {
    id: 'user_alexandria_alias',
    username: 'alexandria',
    displayName: 'قطاع إسكندرية والساحل (اسم مستخدم إضافي)',
    plainPassword: 'Alex@2026',
    sector: 'قطاع إسكندرية والساحل',
    role: 'editor',
    permissions: ['view_all', 'edit_own_sector', 'export_all'],
  },
  {
    id: 'user_north_coast_alias',
    username: 'north_coast_matrouh',
    displayName: 'قطاع إسكندرية والساحل (اسم مستخدم إضافي)',
    plainPassword: 'CoastMatrouh@2026',
    sector: 'قطاع إسكندرية والساحل',
    role: 'editor',
    permissions: ['view_all', 'edit_own_sector', 'export_all'],
  },
  {
    id: 'user_east_delta',
    username: 'east_delta',
    displayName: 'قطاع شرق الدلتا',
    plainPassword: 'EastDelta@2026',
    sector: 'قطاع شرق الدلتا',
    role: 'editor',
    permissions: ['view_all', 'edit_own_sector', 'export_all'],
  },
  {
    id: 'user_west_delta',
    username: 'west_delta',
    displayName: 'قطاع مناطق غرب الدلتا',
    plainPassword: 'West@2026',
    sector: 'قطاع مناطق غرب الدلتا',
    role: 'editor',
    permissions: ['view_all', 'edit_own_sector', 'export_all'],
  },
  {
    id: 'user_central_delta',
    username: 'central_delta',
    displayName: 'قطاع مناطق وسط الدلتا',
    plainPassword: 'Delta@2026',
    sector: 'قطاع مناطق وسط الدلتا',
    role: 'editor',
    permissions: ['view_all', 'edit_own_sector', 'export_all'],
  },
  {
    id: 'user_suez',
    username: 'suez',
    displayName: 'قطاع مناطق السويس',
    plainPassword: 'Suez@2026',
    sector: 'قطاع مناطق السويس',
    role: 'editor',
    permissions: ['view_all', 'edit_own_sector', 'export_all'],
  },
  {
    id: 'user_ismailia',
    username: 'ismailia',
    displayName: 'قطاع مناطق الإسماعيلية',
    plainPassword: 'Ismailia@2026',
    sector: 'قطاع مناطق الإسماعيلية',
    role: 'editor',
    permissions: ['view_all', 'edit_own_sector', 'export_all'],
  },
  {
    id: 'user_cairo',
    username: 'cairo',
    displayName: 'قطاع مناطق القاهرة الكبرى',
    plainPassword: 'Cairo@2026',
    sector: 'قطاع مناطق القاهرة الكبرى',
    role: 'editor',
    permissions: ['view_all', 'edit_own_sector', 'export_all'],
  },
  {
    id: 'user_giza_october',
    username: 'giza_october',
    displayName: 'قطاع مناطق الجيزة وأكتوبر',
    plainPassword: 'Giza@2026',
    sector: 'قطاع مناطق الجيزة وأكتوبر',
    role: 'editor',
    permissions: ['view_all', 'edit_own_sector', 'export_all'],
  },
  {
    id: 'user_upper_egypt',
    username: 'upper_egypt',
    displayName: 'قطاع مناطق الصعيد',
    plainPassword: 'Upper@2026',
    sector: 'قطاع مناطق الصعيد',
    role: 'editor',
    permissions: ['view_all', 'edit_own_sector', 'export_all'],
  },
];

async function generate() {
  const usersWithHash = [];
  const salt = await bcrypt.genSalt(10);

  for (const user of USERS) {
    const hash = await bcrypt.hash(user.plainPassword, salt);
    usersWithHash.push({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      passwordHash: hash,
      plainPassword: user.plainPassword,
      sector: user.sector,
      role: user.role,
      permissions: user.permissions,
    });
  }

  const outDir = join(__dirname, '../server/data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = join(outDir, 'users.json');
  fs.writeFileSync(outPath, JSON.stringify(usersWithHash, null, 2), 'utf-8');
  console.log(`Generated ${usersWithHash.length} users with secure bcrypt hashes -> ${outPath}`);
}

generate().catch(console.error);
