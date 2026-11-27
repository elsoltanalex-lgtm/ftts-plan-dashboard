// src/utils/auditService.ts
// Phase 2: User Session Tracking (user_sessions) & Automatic Audit Trail (activity_logs)
// Persists to Supabase with seamless localStorage fallback so logging never blocks user actions

import { supabaseClients } from '../lib/supabase';
import type { AuthUser } from '../types/auth';

export type ActivityActionType =
  | 'إضافة موقع'
  | 'تعديل موقع'
  | 'حذف موقع'
  | 'حذف جماعي'
  | 'تصدير بيانات';

export type ActivityModule =
  | 'WE'
  | 'Vodafone'
  | 'Orange'
  | 'الإتاحة'
  | 'التحول الرقمي'
  | 'النظام';

export interface UserSessionRecord {
  id: string;
  user_id: string;
  user_name: string;
  username: string;
  role?: string;
  login_at: string;
  last_active_at: string;
  logout_at: string | null;
  is_active: boolean;
}

export interface ActivityLogRecord {
  id: string;
  user_id: string;
  user_name: string;
  username: string;
  action_type: ActivityActionType;
  module: ActivityModule;
  site_code: string;
  details: string;
  created_at: string;
}

const SESSION_AUTH_KEY = 'ftts_auth_user_session_v2';
const SESSIONS_STORAGE_KEY = 'ftts_user_sessions_v1';
const ACTIVE_SESSION_ID_KEY = 'ftts_active_session_id_v1';
const ACTIVITY_LOGS_STORAGE_KEY = 'ftts_activity_logs_v1';

const MAX_LOCAL_SESSIONS = 500;
const MAX_LOCAL_LOGS = 2000;

export function getActiveActor(): { id: string; displayName: string; username: string; role: string } {
  try {
    const raw = localStorage.getItem(SESSION_AUTH_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AuthUser;
      if (parsed && parsed.username) {
        return {
          id: parsed.id || parsed.username,
          displayName: parsed.displayName || parsed.username,
          username: parsed.username,
          role: parsed.role || 'viewer',
        };
      }
    }
  } catch {
    // ignore
  }
  return {
    id: 'system',
    displayName: 'مستخدم النظام',
    username: 'system',
    role: 'admin',
  };
}

// ─────────────────────────── SESSION TRACKING ───────────────────────────

function loadLocalSessions(): UserSessionRecord[] {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function saveLocalSessions(list: UserSessionRecord[]): void {
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(list.slice(0, MAX_LOCAL_SESSIONS)));
  } catch {
    // ignore quota errors
  }
}

async function upsertSessionToSupabase(session: UserSessionRecord): Promise<void> {
  const row = {
    id: session.id,
    user_id: session.user_id,
    user_name: session.user_name,
    username: session.username,
    role: session.role || null,
    login_at: session.login_at,
    last_active_at: session.last_active_at,
    logout_at: session.logout_at,
    is_active: session.is_active,
  };
  for (const client of supabaseClients) {
    try {
      const { error } = await client.from('user_sessions').upsert(row, { onConflict: 'id' });
      if (!error) return;
    } catch {
      // continue silently
    }
  }
}

export function startUserSession(user: AuthUser): UserSessionRecord {
  const now = new Date().toISOString();
  const sessions = loadLocalSessions();

  // Check if there is already an open active session for this exact user on this browser tab
  const existingId = localStorage.getItem(ACTIVE_SESSION_ID_KEY);
  if (existingId) {
    const idx = sessions.findIndex((s) => s.id === existingId && s.user_id === user.id && s.is_active);
    if (idx >= 0) {
      const updated: UserSessionRecord = {
        ...sessions[idx],
        last_active_at: now,
      };
      sessions[idx] = updated;
      saveLocalSessions(sessions);
      void upsertSessionToSupabase(updated);
      return updated;
    }
  }

  const newSession: UserSessionRecord = {
    id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: user.id || user.username,
    user_name: user.displayName || user.username,
    username: user.username,
    role: user.role,
    login_at: now,
    last_active_at: now,
    logout_at: null,
    is_active: true,
  };

  saveLocalSessions([newSession, ...sessions]);
  try {
    localStorage.setItem(ACTIVE_SESSION_ID_KEY, newSession.id);
  } catch {
    // ignore
  }
  void upsertSessionToSupabase(newSession);
  return newSession;
}

export function heartbeatUserSession(): void {
  try {
    const activeId = localStorage.getItem(ACTIVE_SESSION_ID_KEY);
    if (!activeId) return;
    const sessions = loadLocalSessions();
    const idx = sessions.findIndex((s) => s.id === activeId);
    if (idx < 0) return;

    const now = new Date().toISOString();
    const updated: UserSessionRecord = {
      ...sessions[idx],
      last_active_at: now,
      is_active: true,
    };
    sessions[idx] = updated;
    saveLocalSessions(sessions);
    void upsertSessionToSupabase(updated);
  } catch {
    // non-blocking
  }
}

export function endUserSession(isTabClose = false): void {
  try {
    const activeId = localStorage.getItem(ACTIVE_SESSION_ID_KEY);
    if (!activeId) return;
    const sessions = loadLocalSessions();
    const idx = sessions.findIndex((s) => s.id === activeId);
    if (idx >= 0) {
      const now = new Date().toISOString();
      const closed: UserSessionRecord = {
        ...sessions[idx],
        last_active_at: now,
        logout_at: now,
        is_active: false,
      };
      sessions[idx] = closed;
      saveLocalSessions(sessions);
      void upsertSessionToSupabase(closed);
    }
    if (!isTabClose) {
      localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
    }
  } catch {
    // non-blocking
  }
}

export async function fetchUserSessions(): Promise<{ records: UserSessionRecord[]; cloudSynced: boolean }> {
  const local = loadLocalSessions();
  const map = new Map<string, UserSessionRecord>();
  local.forEach((s) => map.set(s.id, s));

  let cloudSynced = false;
  for (const client of supabaseClients) {
    try {
      const { data, error } = await client
        .from('user_sessions')
        .select('*')
        .order('login_at', { ascending: false })
        .limit(500);
      if (!error && Array.isArray(data)) {
        cloudSynced = true;
        data.forEach((row: any) => {
          if (row && row.id) {
            map.set(String(row.id), {
              id: String(row.id),
              user_id: String(row.user_id || ''),
              user_name: String(row.user_name || row.username || 'مستخدم'),
              username: String(row.username || ''),
              role: row.role || undefined,
              login_at: String(row.login_at || new Date().toISOString()),
              last_active_at: String(row.last_active_at || row.login_at || new Date().toISOString()),
              logout_at: row.logout_at ? String(row.logout_at) : null,
              is_active: Boolean(row.is_active && !row.logout_at),
            });
          }
        });
        break;
      }
    } catch {
      // try next client
    }
  }

  const nowMs = Date.now();
  const activeLocalId = localStorage.getItem(ACTIVE_SESSION_ID_KEY);
  const records = Array.from(map.values())
    .map((s) => {
      // Consider a session still online only if it has no logout_at AND last_active_at is within 3 minutes (or is current tab)
      const lastMs = new Date(s.last_active_at || s.login_at).getTime();
      const stillOnline = !s.logout_at && (s.id === activeLocalId || nowMs - lastMs < 3 * 60 * 1000);
      return { ...s, is_active: stillOnline };
    })
    .sort((a, b) => new Date(b.login_at).getTime() - new Date(a.login_at).getTime());

  saveLocalSessions(records);
  return { records, cloudSynced };
}

export function formatSessionDuration(loginAt: string, endAt?: string | null): string {
  const startMs = new Date(loginAt).getTime();
  const endMs = endAt ? new Date(endAt).getTime() : Date.now();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return 'أقل من دقيقة';
  }
  const totalMinutes = Math.floor((endMs - startMs) / 60000);
  if (totalMinutes < 1) return 'أقل من دقيقة';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins} دقيقة`;
  if (mins === 0) return `${hours} ساعة`;
  return `${hours} س ${mins} د`;
}

// ─────────────────────────── ACTIVITY AUDIT TRAIL ───────────────────────────

function loadLocalLogs(): ActivityLogRecord[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_LOGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function saveLocalLogs(list: ActivityLogRecord[]): void {
  try {
    localStorage.setItem(ACTIVITY_LOGS_STORAGE_KEY, JSON.stringify(list.slice(0, MAX_LOCAL_LOGS)));
  } catch {
    // ignore quota
  }
}

async function insertLogToSupabase(entry: ActivityLogRecord): Promise<void> {
  const row = {
    id: entry.id,
    user_id: entry.user_id,
    user_name: entry.user_name,
    username: entry.username,
    action_type: entry.action_type,
    module: entry.module,
    site_code: entry.site_code,
    details: entry.details,
    created_at: entry.created_at,
  };
  for (const client of supabaseClients) {
    try {
      const { error } = await client.from('activity_logs').insert(row);
      if (!error) return;
    } catch {
      // continue silently
    }
  }
}

export function logActivity(params: {
  actionType: ActivityActionType;
  module: ActivityModule;
  siteCode: string;
  details: string;
}): ActivityLogRecord {
  const actor = getActiveActor();
  const entry: ActivityLogRecord = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: actor.id,
    user_name: actor.displayName,
    username: actor.username,
    action_type: params.actionType,
    module: params.module,
    site_code: String(params.siteCode || '-').trim() || '-',
    details: String(params.details || '').trim() || params.actionType,
    created_at: new Date().toISOString(),
  };

  try {
    const existing = loadLocalLogs();
    saveLocalLogs([entry, ...existing]);
  } catch {
    // non-blocking
  }

  void insertLogToSupabase(entry);
  return entry;
}

export async function fetchActivityLogs(): Promise<{ records: ActivityLogRecord[]; cloudSynced: boolean }> {
  const local = loadLocalLogs();
  const map = new Map<string, ActivityLogRecord>();
  local.forEach((l) => map.set(l.id, l));

  let cloudSynced = false;
  for (const client of supabaseClients) {
    try {
      const { data, error } = await client
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (!error && Array.isArray(data)) {
        cloudSynced = true;
        data.forEach((row: any) => {
          if (row && row.id) {
            map.set(String(row.id), {
              id: String(row.id),
              user_id: String(row.user_id || ''),
              user_name: String(row.user_name || row.username || 'مستخدم'),
              username: String(row.username || ''),
              action_type: (row.action_type || 'تعديل موقع') as ActivityActionType,
              module: (row.module || 'النظام') as ActivityModule,
              site_code: String(row.site_code || '-'),
              details: String(row.details || ''),
              created_at: String(row.created_at || new Date().toISOString()),
            });
          }
        });
        break;
      }
    } catch {
      // try next client
    }
  }

  const records = Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  saveLocalLogs(records);
  return { records, cloudSynced };
}

const IGNORED_DIFF_KEYS = new Set([
  'id',
  '_id',
  'data',
  'created_at',
  'updated_at',
  '_createdAt',
  '_updatedAt',
  '_lastModifiedBy',
  '_lastModifiedAt',
  'rawRecord',
  'attachment_base64',
  'document_base64',
]);

export function buildRecordDiffSummary(
  oldRecord: Record<string, any> | null | undefined,
  newRecord: Record<string, any>,
  extraNote?: string
): string {
  const parts: string[] = [];

  if (!oldRecord) {
    const sector = newRecord['قطاع التنفيذ'] || newRecord['رئاسة قطاعات التنفيذ'] || newRecord['القطاع'] || newRecord['Sectore'] || '';
    const status = newRecord['التصنيف النهائي'] || newRecord['التصنيف'] || newRecord['موقف التسليم'] || '';
    const ext = newRecord['المسار الخارجي'] || '';
    const intP = newRecord['المسار الداخلى'] || newRecord['المسار الداخلي'] || '';
    if (sector) parts.push(`القطاع: ${sector}`);
    if (status) parts.push(`التصنيف: ${status}`);
    if (ext) parts.push(`خارجي: ${ext}`);
    if (intP) parts.push(`داخلي: ${intP}`);
    if (extraNote) parts.push(extraNote);
    return parts.length > 0 ? `إضافة سجل جديد (${parts.join(' | ')})` : 'إضافة سجل جديد';
  }

  const allKeys = new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)]);
  for (const key of allKeys) {
    if (IGNORED_DIFF_KEYS.has(key) || key.startsWith('_')) continue;
    const oldVal = oldRecord[key];
    const newVal = newRecord[key];
    if (typeof newVal === 'object' && newVal !== null) continue;
    if (typeof oldVal === 'object' && oldVal !== null) continue;
    const oldStr = String(oldVal ?? '').trim();
    const newStr = String(newVal ?? '').trim();
    if (oldStr !== newStr) {
      if (key.toLowerCase().includes('attachment') || key.includes('مرفق') || key.includes('مستند')) {
        parts.push(`تحديث مرفق (${newStr ? newStr.slice(0, 40) : 'تمت الإزالة'})`);
      } else {
        parts.push(`${key}: "${oldStr || 'فارغ'}" ← "${newStr || 'فارغ'}"`);
      }
    }
    if (parts.length >= 6) break;
  }

  if (extraNote) parts.push(extraNote);
  return parts.length > 0 ? parts.join(' | ') : 'تحديث بيانات الموقع';
}

export function getLastModifiedInfoForSite(siteCode: string, rawRecord?: any): { userName: string; timestamp: string } | null {
  if (rawRecord?._lastModifiedBy && rawRecord?._lastModifiedAt) {
    return {
      userName: String(rawRecord._lastModifiedBy),
      timestamp: String(rawRecord._lastModifiedAt),
    };
  }
  const norm = String(siteCode || '').trim().toUpperCase();
  if (!norm) return null;
  const logs = loadLocalLogs();
  const found = logs.find(
    (l) =>
      (l.action_type === 'إضافة موقع' || l.action_type === 'تعديل موقع') &&
      String(l.site_code || '').trim().toUpperCase() === norm
  );
  if (found) {
    return { userName: found.user_name, timestamp: found.created_at };
  }
  return null;
}
