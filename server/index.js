// server/index.js
// Central backend server: Express + lowdb (JSON file persistence)
// Provides REST API with Sector-based Permissions for the FTTS/WE data entry system
// Single source of truth for all users

import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ── Database file paths ──
const DB_PATH = join(__dirname, 'data', 'db.json');
const CSV_PATH = join(__dirname, 'data', 'We.csv');
const USERS_PATH = join(__dirname, 'data', 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'ftts_secure_telecom_jwt_secret_2026';

// ── Simple JSON database helper ──
function readDB() {
  if (!existsSync(DB_PATH)) {
    return { records: [], metadata: { lastUpdated: null, totalImported: 0 } };
  }
  const raw = readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeDB(db) {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

// Load users from users.json
function readUsers() {
  if (!existsSync(USERS_PATH)) return [];
  const raw = readFileSync(USERS_PATH, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// ── Sector comparison & normalization helper ──
export function normalizeSectorName(sec) {
  if (!sec) return '';
  return sec
    .toString()
    .replace(/^قطاع\s+/g, '')
    .replace(/^مناطق\s+/g, '')
    .replace(/^منطقة\s+/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function isSectorMatch(userSector, recordSector) {
  if (!userSector) return false;
  if (userSector === 'ALL') return true;
  if (!recordSector) return false;

  const u = normalizeSectorName(userSector);
  const r = normalizeSectorName(recordSector);

  if (u === r) return true;
  if (u.includes(r) || r.includes(u)) return true;
  return false;
}

// ── Authentication helpers ──
function generateToken(user) {
  const payload = {
    username: user.username,
    displayName: user.displayName,
    sector: user.sector,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, error: 'رمز الدخول مطلوب (Authentication token required)' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول' });
    }
    req.user = user;
    next();
  });
}

// Optional auth: parse user if token present, but don't reject if not
function optionalToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    req.user = null;
    return next();
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    req.user = err ? null : user;
    next();
  });
}

// ── Parse CSV manually ──
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim());

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] || '';
    });
    record['_id'] = randomUUID();
    record['_createdAt'] = new Date().toISOString();
    record['_updatedAt'] = new Date().toISOString();
    record['_createdBy'] = 'system-import';
    records.push(record);
  }
  return records;
}

// ── Import CSV on first run ──
function initializeDB() {
  const db = readDB();
  if (db.records.length === 0 && existsSync(CSV_PATH)) {
    console.log('🔄 Importing We.csv into central database...');
    const csvText = readFileSync(CSV_PATH, 'utf-8');
    const records = parseCSV(csvText);
    db.records = records;
    db.metadata = {
      lastUpdated: new Date().toISOString(),
      totalImported: records.length,
    };
    writeDB(db);
    console.log(`✅ Imported ${records.length} records from We.csv`);
  } else {
    console.log(`📊 Database has ${db.records.length} records`);
  }
}

// ───────────────────────────────────────────
// API ROUTES
// ───────────────────────────────────────────

// 1. Authentication Routes
// POST /api/login — Login with username and password
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'اسم المستخدم وكلمة المرور مطلوبان' });
  }

  const users = readUsers();
  const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user) {
    return res.status(401).json({ success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }

  const match = bcrypt.compareSync(password, user.passwordHash) || (user.plainPassword && user.plainPassword === password);
  if (!match) {
    return res.status(401).json({ success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }

  const token = generateToken(user);
  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      sector: user.sector,
      role: user.role,
      permissions: user.permissions || [],
    },
    message: `مرحباً بك، ${user.displayName}`,
  });
});

// GET /api/auth/me — Check current login token
app.get('/api/auth/me', verifyToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

// GET /api/users/demo — Return public list of demo sector accounts for quick testing
app.get('/api/users/demo', (req, res) => {
  const users = readUsers();
  const publicAccounts = users.map(u => ({
    username: u.username,
    displayName: u.displayName,
    sector: u.sector,
    role: u.role,
    plainPassword: u.plainPassword,
  }));
  res.json({ success: true, accounts: publicAccounts });
});

// 2. Data Routes

// GET /api/records — Return records scoped by user sector if restricted
app.get('/api/records', optionalToken, (req, res) => {
  const db = readDB();
  const user = req.user;
  let records = db.records;

  if (user && user.role !== 'admin' && user.sector && user.sector !== 'ALL') {
    records = records.filter(r => {
      const sec = r['Exc sector'] || r['Sectore'] || r['Sectores'] || r['Exc Sectores'] || '';
      return isSectorMatch(user.sector, sec);
    });
  }

  res.json({
    success: true,
    count: records.length,
    records,
    metadata: db.metadata,
  });
});

// GET /api/records/:siteCode — Get a single record by site code
app.get('/api/records/:siteCode', optionalToken, (req, res) => {
  const db = readDB();
  const siteCode = req.params.siteCode;
  const record = db.records.find(r => r['site code'] === siteCode);
  if (!record) {
    return res.status(404).json({ success: false, error: `الموقع "${siteCode}" غير موجود` });
  }

  const user = req.user;
  if (user && user.role !== 'admin' && user.sector && user.sector !== 'ALL') {
    const sec = record['Exc sector'] || record['Sectore'] || record['Sectores'] || record['Exc Sectores'] || '';
    if (!isSectorMatch(user.sector, sec)) {
      return res.status(403).json({
        success: false,
        error: `⛔ غير مصرح: الموقع "${siteCode}" يتبع قطاع (${sec}) ولا يقع ضمن نطاق قطاعك المصرح لك به (${user.sector}).`,
      });
    }
  }

  res.json({ success: true, record });
});

// GET /api/site-codes — Return unique site codes
app.get('/api/site-codes', optionalToken, (req, res) => {
  const db = readDB();
  const user = req.user;
  let records = db.records;

  if (user && user.role !== 'admin' && user.sector && user.sector !== 'ALL') {
    records = records.filter(r => {
      const sec = r['Exc sector'] || r['Sectore'] || r['Sectores'] || r['Exc Sectores'] || '';
      return isSectorMatch(user.sector, sec);
    });
  }

  const codes = [...new Set(records.map(r => r['site code']).filter(Boolean))].sort();
  res.json({ success: true, codes });
});

// GET /api/dropdown-values/:column — Return distinct values for a green column
app.get('/api/dropdown-values/:column', (req, res) => {
  const db = readDB();
  const column = req.params.column;
  let filtered = db.records;

  const filterParams = req.query;
  for (const [key, value] of Object.entries(filterParams)) {
    if (value && key !== 'column') {
      filtered = filtered.filter(r => r[key] === value);
    }
  }

  const values = [...new Set(filtered.map(r => r[column]).filter(Boolean))].sort();
  res.json({ success: true, column, values });
});

// Helper: Check edit permission for a sector
function checkSectorEditPermission(user, recordSector) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'viewer') return false;
  return isSectorMatch(user.sector, recordSector);
}

// POST /api/records — Add or update a record
// Enforces Sector-specific write permission
app.post('/api/records', verifyToken, (req, res) => {
  const db = readDB();
  const newRecord = req.body;
  const user = req.user;

  if (user.role === 'viewer') {
    return res.status(403).json({
      success: false,
      error: 'حسابك يحمل صلاحية المشاهدة فقط (Read-Only)، لا يمكنك إضافة أو تعديل البيانات',
    });
  }

  if (!newRecord['site code']) {
    return res.status(400).json({ success: false, error: 'كود الموقع مطلوب' });
  }

  const recordSector = newRecord['Exc sector'] || newRecord['Sectore'] || newRecord['Sectores'] || newRecord['Exc Sectores'] || '';

  // Check sector edit permission
  if (!checkSectorEditPermission(user, recordSector)) {
    return res.status(403).json({
      success: false,
      error: `لا تملك صلاحية التعديل على قطاع "${recordSector || 'غير محدد'}". حسابك مصرح له بتعديل مواقع قطاع "${user.sector}" فقط.`,
    });
  }

  // Check for duplicates (site code + activity + date)
  const siteCode = newRecord['site code'];
  const activity = newRecord['التصنيف'] || '';
  const dateWeek = newRecord['التاريخ المتوقع للانتهاء'] || '';

  const existingIdx = db.records.findIndex(r =>
    r['site code'] === siteCode &&
    r['التصنيف'] === activity &&
    r['التاريخ المتوقع للانتهاء'] === dateWeek
  );

  if (existingIdx !== -1 && !newRecord._forceUpdate) {
    return res.status(409).json({
      success: false,
      error: 'DUPLICATE_RECORD',
      message: `سجل مكرر: الموقع ${siteCode} بالتصنيف "${activity}" موجود بالفعل`,
      existingRecord: db.records[existingIdx],
    });
  }

  if (existingIdx !== -1 && newRecord._forceUpdate) {
    delete newRecord._forceUpdate;
    const existing = db.records[existingIdx];
    const updated = {
      ...existing,
      ...newRecord,
      _updatedAt: new Date().toISOString(),
      _updatedBy: user.username,
    };
    // Preserve immutable fields on existing record
    const immutableFields = [
      'site code', 'Site code', 'site_code',
      'Exc sector', 'Exc Sectores', 'Sectore', 'قطاع التنفيذ',
      'Zone', 'Sectores', 'قطاع المناطق',
      'Exc Zone', 'اداره التنفيذ المختصه', 'الادارة العامة لتنفيذ الشبكات',
      'المسئولية', 'مسئولية التنفيذ', 'مسؤولية التنفيذ',
      'Type', 'النوع',
      'خطة', 'Plan',
      'Site Status', 'حالة الموقع',
      'السنترال'
    ];
    immutableFields.forEach(f => {
      if (existing[f] !== undefined) updated[f] = existing[f];
    });

    db.records[existingIdx] = updated;
    db.metadata.lastUpdated = new Date().toISOString();
    writeDB(db);
    return res.json({
      success: true,
      action: 'updated',
      record: updated,
      message: 'تم تحديث السجل بنجاح',
    });
  }

  // Add new record (Admin only)
  if (user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: '⛔ غير مصرح: إضافة المواقع الجديدة مقتصرة حصرياً على حساب الإدارة (Admin). حسابات القطاعات تملك صلاحية التعديل على مواقعها فقط.',
    });
  }

  const record = {
    ...newRecord,
    _id: randomUUID(),
    _createdAt: new Date().toISOString(),
    _updatedAt: new Date().toISOString(),
    _createdBy: user.username,
  };
  delete record._forceUpdate;

  db.records.push(record);
  db.metadata.lastUpdated = new Date().toISOString();
  writeDB(db);

  res.status(201).json({
    success: true,
    action: 'created',
    record,
    message: 'تم إضافة السجل بنجاح',
  });
});

// PUT /api/records/:id — Update a record by its _id
app.put('/api/records/:id', verifyToken, (req, res) => {
  const db = readDB();
  const id = req.params.id;
  const user = req.user;

  const idx = db.records.findIndex(r => r._id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'السجل غير موجود' });
  }

  const existingRecord = db.records[idx];
  const existingSector = existingRecord['Exc sector'] || existingRecord['Sectore'] || existingRecord['Sectores'] || '';
  if (!checkSectorEditPermission(user, existingSector)) {
    return res.status(403).json({
      success: false,
      error: `لا يمكنك تعديل هذا السجل لأنه يتبع قطاع "${existingSector || 'آخر'}". حسابك مخصص لقطاع "${user.sector}".`,
    });
  }

  const updatedData = { ...req.body };

  // Strictly protect baseline immutable fields:
  // (كود الموقع، قطاع التنفيذ، قطاع المناطق، الإدارة العامة لتنفيذ الشبكات، مسؤولية التنفيذ، النوع، الخطة، حالة الموقع)
  const immutableFields = [
    'site code', 'Site code', 'site_code',
    'Exc sector', 'Exc Sectores', 'Sectore', 'قطاع التنفيذ',
    'Zone', 'Sectores', 'قطاع المناطق',
    'Exc Zone', 'اداره التنفيذ المختصه', 'الادارة العامة لتنفيذ الشبكات',
    'المسئولية', 'مسئولية التنفيذ', 'مسؤولية التنفيذ',
    'Type', 'النوع',
    'خطة', 'Plan',
    'Site Status', 'حالة الموقع',
    'السنترال'
  ];

  immutableFields.forEach(field => {
    if (existingRecord[field] !== undefined) {
      updatedData[field] = existingRecord[field];
    }
  });

  db.records[idx] = {
    ...existingRecord,
    ...updatedData,
    _updatedAt: new Date().toISOString(),
    _updatedBy: user.username,
  };
  db.metadata.lastUpdated = new Date().toISOString();
  writeDB(db);

  res.json({ success: true, record: db.records[idx], message: 'تم تحديث السجل بنجاح' });
});

// DELETE /api/records/:id — Delete a record (Admin only)
app.delete('/api/records/:id', verifyToken, (req, res) => {
  const db = readDB();
  const id = req.params.id;
  const user = req.user;

  if (user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: '⛔ غير مصرح: حذف المواقع مقتصر حصرياً على حساب الإدارة (Admin).',
    });
  }

  const idx = db.records.findIndex(r => r._id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'السجل غير موجود' });
  }

  db.records.splice(idx, 1);
  db.metadata.lastUpdated = new Date().toISOString();
  writeDB(db);

  res.json({ success: true, message: 'تم حذف السجل بنجاح' });
});

// GET /api/export/csv — Export master dataset as CSV
app.get('/api/export/csv', (req, res) => {
  const db = readDB();
  const records = db.records;
  if (records.length === 0) {
    return res.status(404).json({ success: false, error: 'لا توجد سجلات للتصدير' });
  }

  const internalFields = ['_id', '_createdAt', '_updatedAt', '_createdBy', '_updatedBy'];
  const allKeys = Object.keys(records[0]).filter(k => !internalFields.includes(k));

  let csv = allKeys.join(',') + '\n';
  for (const rec of records) {
    const row = allKeys.map(k => {
      const val = (rec[k] || '').toString().replace(/,/g, '،');
      return `"${val.replace(/"/g, '""')}"`;
    });
    csv += row.join(',') + '\n';
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="we_master_data_export.csv"');
  res.send('\uFEFF' + csv);
});

// GET /api/stats — Dashboard statistics
app.get('/api/stats', (req, res) => {
  const db = readDB();
  const records = db.records;
  const totalSites = records.length;

  const statusCounts = {};
  records.forEach(r => {
    const status = r['التصنيف'] || r['Site Status'] || 'غير محدد';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const sectorCounts = {};
  records.forEach(r => {
    const sector = r['Exc sector'] || r['Sectore'] || r['Sectores'] || 'غير محدد';
    sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
  });

  const zoneCounts = {};
  records.forEach(r => {
    const zone = r['Zone'] || 'غير محدد';
    zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
  });

  res.json({
    success: true,
    stats: {
      totalSites,
      statusCounts,
      sectorCounts,
      zoneCounts,
      lastUpdated: db.metadata.lastUpdated,
    },
  });
});

// ── Start server ──
initializeDB();
app.listen(PORT, () => {
  console.log(`🚀 WE Central API Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard API: http://localhost:${PORT}/api/stats`);
  console.log(`📋 Records API: http://localhost:${PORT}/api/records`);
  console.log(`🔐 Auth API: http://localhost:${PORT}/api/login`);
});
