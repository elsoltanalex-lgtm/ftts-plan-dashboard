// src/utils/auditService.ts
// Real-time Multi-Visit Session Tracking (user_sessions) & Automatic Audit Trail (activity_logs)
// Supports 15s heartbeats, keepalive flush on tab/mobile close, automatic stale-session closure,
// dedicated Supabase tables + instant live cloud sentinel fallback + localStorage cache

import { supabaseClients, supabaseFallback, FALLBACK_SUPABASE_URL, FALLBACK_SUPABASE_KEY } from '../lib/supabase';
import type { AuthUser } from '../types/auth';
import {
  SYNC_SESSIONS_ID,
  SYNC_SESSIONS_SITE_CODE,
  SYNC_ACTIVITY_LOGS_ID,
  SYNC_ACTIVITY_LOGS_SITE_CODE,
} from './deletedSitesSync';

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
  duration_seconds: number;
  is_active: boolean;
}

export interface ActivityLogRecord {
  id: string;
  session_id: string | null;
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
const TAB_SESSION_ID_KEY = 'ftts_tab_session_id_v2';
const ACTIVITY_LOGS_STORAGE_KEY = 'ftts_activity_logs_v1';

const MAX_LOCAL_SESSIONS = 500;
const MAX_LOCAL_LOGS = 2000;
// Any session with no heartbeat for > 50s is automatically treated as ended
export const STALE_SESSION_THRESHOLD_MS = 50 * 1000;

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

export function getActiveSessionId(): string | null {
  try {
    return sessionStorage.getItem(TAB_SESSION_ID_KEY);
  } catch {
    return null;
  }
}

function setActiveSessionId(id: string | null): void {
  try {
    if (id) {
      sessionStorage.setItem(TAB_SESSION_ID_KEY, id);
    } else {
      sessionStorage.removeItem(TAB_SESSION_ID_KEY);
    }
  } catch {
    // ignore
  }
}

export function computeDurationSeconds(loginAt: string, endAt?: string | null): number {
  const startMs = new Date(loginAt).getTime();
  const endMs = endAt ? new Date(endAt).getTime() : Date.now();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0;
  return Math.max(0, Math.round((endMs - startMs) / 1000));
}

export function formatDurationSeconds(totalSeconds: number): string {
  const sec = Math.max(0, Math.round(Number(totalSeconds) || 0));
  if (sec < 60) {
    return sec <= 5 ? 'أقل من دقيقة' : `${sec} ثانية`;
  }
  const totalMinutes = Math.floor(sec / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins} دقيقة`;
  if (mins === 0) return `${hours} ساعة`;
  return `${hours} س ${mins} د`;
}

export function formatSessionDuration(loginAt: string, endAt?: string | null, durationSeconds?: number): string {
  const sec =
    typeof durationSeconds === 'number' && Number.isFinite(durationSeconds) && durationSeconds > 0
      ? durationSeconds
      : computeDurationSeconds(loginAt, endAt);
  return formatDurationSeconds(sec);
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
    // ignore quota
  }
}

async function mirrorSessionsToSentinel(sessions: UserSessionRecord[], keepalive = false): Promise<void> {
  const payload = {
    id: SYNC_SESSIONS_ID,
    site_code: SYNC_SESSIONS_SITE_CODE,
    'site code': SYNC_SESSIONS_SITE_CODE,
    data: {
      __system: true,
      sessions: sessions.slice(0, 200),
      updatedAt: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  };

  if (keepalive && typeof fetch === 'function') {
    try {
      void fetch(`${FALLBACK_SUPABASE_URL}/rest/v1/we_records?on_conflict=id`, {
        method: 'POST',
        keepalive: true,
        headers: {
          apikey: FALLBACK_SUPABASE_KEY,
          Authorization: `Bearer ${FALLBACK_SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(payload),
      });
      return;
    } catch {
      // fallback below
    }
  }

  try {
    await supabaseFallback.from('we_records').upsert(payload, { onConflict: 'id' });
  } catch {
    // non-blocking
  }
}

async function upsertSessionToSupabase(session: UserSessionRecord, keepalive = false): Promise<void> {
  const row = {
    id: session.id,
    user_id: session.user_id,
    user_name: session.user_name,
    username: session.username,
    role: session.role || null,
    login_at: session.login_at,
    last_active_at: session.last_active_at,
    logout_at: session.logout_at,
    duration_seconds: session.duration_seconds,
    is_active: session.is_active,
  };

  if (keepalive && typeof fetch === 'function') {
    try {
      void fetch(`${FALLBACK_SUPABASE_URL}/rest/v1/user_sessions?on_conflict=id`, {
        method: 'POST',
        keepalive: true,
        headers: {
          apikey: FALLBACK_SUPABASE_KEY,
          Authorization: `Bearer ${FALLBACK_SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(row),
      });
    } catch {
      // ignore
    }
    void mirrorSessionsToSentinel(loadLocalSessions(), true);
    return;
  }

  let tableOk = false;
  for (const client of supabaseClients) {
    try {
      const { error } = await client.from('user_sessions').upsert(row, { onConflict: 'id' });
      if (!error) {
        tableOk = true;
        break;
      }
    } catch {
      // try next client
    }
  }

  if (!tableOk) {
    void mirrorSessionsToSentinel(loadLocalSessions(), false);
  }
}

/**
 * Starts a distinct visit/session entry.
 * - On explicit login (`forceNew = true`), ALWAYS creates a brand-new session row.
 * - On page load/new tab (`forceNew = false`), creates a brand-new session row if this tab has no active session ID
 *   or if the previous session was closed/stale (> 50s).
 */
export function startUserSession(user: AuthUser, options: { forceNew?: boolean } = {}): UserSessionRecord {
  const now = new Date().toISOString();
  const nowMs = Date.now();
  const sessions = loadLocalSessions();

  if (!options.forceNew) {
    const existingTabId = getActiveSessionId();
    if (existingTabId) {
      const idx = sessions.findIndex((s) => s.id === existingTabId && s.user_id === (user.id || user.username));
      if (idx >= 0) {
        const prev = sessions[idx];
        const lastMs = new Date(prev.last_active_at || prev.login_at).getTime();
        const isFresh = !prev.logout_at && nowMs - lastMs <= STALE_SESSION_THRESHOLD_MS * 2;
        if (isFresh) {
          const updated: UserSessionRecord = {
            ...prev,
            last_active_at: now,
            duration_seconds: computeDurationSeconds(prev.login_at, now),
            is_active: true,
          };
          sessions[idx] = updated;
          saveLocalSessions(sessions);
          void upsertSessionToSupabase(updated, false);
          return updated;
        }
      }
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
    duration_seconds: 0,
    is_active: true,
  };

  saveLocalSessions([newSession, ...sessions]);
  setActiveSessionId(newSession.id);
  void upsertSessionToSupabase(newSession, false);
  return newSession;
}

export function heartbeatUserSession(): void {
  try {
    const activeId = getActiveSessionId();
    if (!activeId) return;
    const sessions = loadLocalSessions();
    const idx = sessions.findIndex((s) => s.id === activeId);
    if (idx < 0) return;

    const now = new Date().toISOString();
    const updated: UserSessionRecord = {
      ...sessions[idx],
      last_active_at: now,
      logout_at: null,
      duration_seconds: computeDurationSeconds(sessions[idx].login_at, now),
      is_active: true,
    };
    sessions[idx] = updated;
    saveLocalSessions(sessions);
    void upsertSessionToSupabase(updated, false);
  } catch {
    // non-blocking
  }
}

export function endUserSession(isTabClose = false): void {
  try {
    const activeId = getActiveSessionId();
    if (!activeId) return;
    const sessions = loadLocalSessions();
    const idx = sessions.findIndex((s) => s.id === activeId);
    if (idx >= 0) {
      const now = new Date().toISOString();
      const closed: UserSessionRecord = {
        ...sessions[idx],
        last_active_at: now,
        logout_at: now,
        duration_seconds: computeDurationSeconds(sessions[idx].login_at, now),
        is_active: false,
      };
      sessions[idx] = closed;
      saveLocalSessions(sessions);
      void upsertSessionToSupabase(closed, isTabClose);
    }
    if (!isTabClose) {
      setActiveSessionId(null);
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
  // 1. Primary table `user_sessions`
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
            const loginAt = String(row.login_at || new Date().toISOString());
            const lastActiveAt = String(row.last_active_at || loginAt);
            const logoutAt = row.logout_at ? String(row.logout_at) : null;
            map.set(String(row.id), {
              id: String(row.id),
              user_id: String(row.user_id || ''),
              user_name: String(row.user_name || row.username || 'مستخدم'),
              username: String(row.username || ''),
              role: row.role || undefined,
              login_at: loginAt,
              last_active_at: lastActiveAt,
              logout_at: logoutAt,
              duration_seconds:
                typeof row.duration_seconds === 'number'
                  ? row.duration_seconds
                  : computeDurationSeconds(loginAt, logoutAt || lastActiveAt),
              is_active: Boolean(row.is_active && !logoutAt),
            });
          }
        });
        break;
      }
    } catch {
      // try next client
    }
  }

  // 2. Live cloud sentinel fallback in `we_records` if dedicated table isn't created yet
  if (!cloudSynced) {
    try {
      const { data, error } = await supabaseFallback
        .from('we_records')
        .select('id, data')
        .eq('id', SYNC_SESSIONS_ID)
        .maybeSingle();
      if (!error && data?.data && Array.isArray(data.data.sessions)) {
        cloudSynced = true;
        (data.data.sessions as UserSessionRecord[]).forEach((s) => {
          if (s && s.id) {
            const existing = map.get(s.id);
            if (
              !existing ||
              new Date(s.last_active_at || s.login_at).getTime() >=
                new Date(existing.last_active_at || existing.login_at).getTime()
            ) {
              map.set(s.id, s);
            }
          }
        });
      }
    } catch {
      // ignore
    }
  }

  const nowMs = Date.now();
  const activeTabId = getActiveSessionId();
  const records = Array.from(map.values())
    .map((s) => {
      const lastMs = new Date(s.last_active_at || s.login_at).getTime();
      const isCurrentTabVisible =
        s.id === activeTabId &&
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible';
      const stillOnline =
        !s.logout_at && (isCurrentTabVisible || nowMs - lastMs <= STALE_SESSION_THRESHOLD_MS);
      const effectiveExit = stillOnline ? null : s.logout_at || s.last_active_at;
      const durationSec = computeDurationSeconds(s.login_at, effectiveExit || nowMs.toString());
      return {
        ...s,
        logout_at: effectiveExit,
        duration_seconds: stillOnline ? computeDurationSeconds(s.login_at, new Date().toISOString()) : durationSec,
        is_active: stillOnline,
      };
    })
    .sort((a, b) => new Date(b.login_at).getTime() - new Date(a.login_at).getTime());

  saveLocalSessions(records);
  return { records, cloudSynced };
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

async function mirrorLogsToSentinel(logs: ActivityLogRecord[]): Promise<void> {
  const payload = {
    id: SYNC_ACTIVITY_LOGS_ID,
    site_code: SYNC_ACTIVITY_LOGS_SITE_CODE,
    'site code': SYNC_ACTIVITY_LOGS_SITE_CODE,
    data: {
      __system: true,
      logs: logs.slice(0, 300),
      updatedAt: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  };
  try {
    await supabaseFallback.from('we_records').upsert(payload, { onConflict: 'id' });
  } catch {
    // non-blocking
  }
}

async function insertLogToSupabase(entry: ActivityLogRecord): Promise<void> {
  const row = {
    id: entry.id,
    session_id: entry.session_id,
    user_id: entry.user_id,
    user_name: entry.user_name,
    username: entry.username,
    action_type: entry.action_type,
    module: entry.module,
    site_code: entry.site_code,
    details: entry.details,
    created_at: entry.created_at,
  };
  let tableOk = false;
  for (const client of supabaseClients) {
    try {
      const { error } = await client.from('activity_logs').insert(row);
      if (!error) {
        tableOk = true;
        break;
      }
    } catch {
      // continue silently
    }
  }
  if (!tableOk) {
    void mirrorLogsToSentinel(loadLocalLogs());
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
    session_id: getActiveSessionId(),
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

  // Also bump current session heartbeat on every action
  heartbeatUserSession();
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
              session_id: row.session_id ? String(row.session_id) : null,
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

  if (!cloudSynced) {
    try {
      const { data, error } = await supabaseFallback
        .from('we_records')
        .select('id, data')
        .eq('id', SYNC_ACTIVITY_LOGS_ID)
        .maybeSingle();
      if (!error && data?.data && Array.isArray(data.data.logs)) {
        cloudSynced = true;
        (data.data.logs as ActivityLogRecord[]).forEach((l) => {
          if (l && l.id) map.set(l.id, l);
        });
      }
    } catch {
      // ignore
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
