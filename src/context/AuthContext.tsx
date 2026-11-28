// src/context/AuthContext.tsx
// Phase 1 Authentication, Session Persistence, RBAC (Admin / Editor / Viewer), & User Management Context

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { AuthUser, DemoAccount, ManagedUser, UserRole } from '../types/auth';
import { isSectorMatch, extractRecordSector, isRecordInSector } from '../utils/sectorPermissions';
import { supabaseClients, supabaseFallback } from '../lib/supabase';
import { startUserSession, heartbeatUserSession, endUserSession } from '../utils/auditService';
import { SYNC_APP_USERS_ID, SYNC_APP_USERS_SITE_CODE } from '../utils/deletedSitesSync';

export const INITIAL_ADMIN_CREDENTIALS = {
  username: 'admin',
  email: 'admin@ftts.local',
  password: 'Admin@2026',
  displayName: 'د. شريف — الإدارة العامة المركزية (Admin)',
};

export const PRESET_ACCOUNTS: DemoAccount[] = [
  {
    username: INITIAL_ADMIN_CREDENTIALS.username,
    displayName: INITIAL_ADMIN_CREDENTIALS.displayName,
    plainPassword: INITIAL_ADMIN_CREDENTIALS.password,
    sector: 'ALL',
    role: 'admin',
    description: 'صلاحية كاملة لإدارة جميع الوحدات والمستخدمين وكلمات المرور (Admin)',
    tagColor: 'bg-purple-500/10 text-purple-700 border-purple-300',
  },
];

const SESSION_STORAGE_KEY = 'ftts_auth_user_session_v2';
const USERS_STORAGE_KEY = 'ftts_managed_users_v1';
const USERS_TABLE_NAME = 'app_users';

function buildInitialAdminUser(): ManagedUser {
  const now = new Date().toISOString();
  return {
    id: 'usr-admin-root',
    username: INITIAL_ADMIN_CREDENTIALS.username,
    email: INITIAL_ADMIN_CREDENTIALS.email,
    displayName: INITIAL_ADMIN_CREDENTIALS.displayName,
    password: INITIAL_ADMIN_CREDENTIALS.password,
    role: 'admin',
    sector: 'ALL',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeIdentifier(val: string): string {
  return String(val || '').trim().toLowerCase();
}

function ensureAdminPresent(users: ManagedUser[]): ManagedUser[] {
  const map = new Map<string, ManagedUser>();
  for (const u of users) {
    if (!u || !u.username) continue;
    const key = normalizeIdentifier(u.username);
    map.set(key, {
      ...u,
      username: u.username.trim(),
      email: u.email ? u.email.trim() : undefined,
      displayName: u.displayName?.trim() || u.username.trim(),
      role: (['admin', 'editor', 'viewer'].includes(u.role) ? u.role : 'viewer') as UserRole,
      sector: u.sector || 'ALL',
      isActive: u.isActive !== false,
    });
  }

  const hasActiveAdmin = Array.from(map.values()).some((u) => u.role === 'admin' && u.isActive);
  if (!hasActiveAdmin) {
    const existingAdmin = map.get('admin');
    if (existingAdmin) {
      map.set('admin', { ...existingAdmin, role: 'admin', isActive: true, sector: 'ALL' });
    } else {
      map.set('admin', buildInitialAdminUser());
    }
  }
  return Array.from(map.values());
}

function loadLocalUsers(): ManagedUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return ensureAdminPresent(parsed);
      }
    }
  } catch {
    // ignore storage errors
  }
  const seeded = [buildInitialAdminUser()];
  saveLocalUsers(seeded);
  return seeded;
}

function saveLocalUsers(users: ManagedUser[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(ensureAdminPresent(users)));
  } catch {
    // ignore quota errors
  }
}

function buildPermissionsForRole(role: UserRole): string[] {
  if (role === 'admin') return ['view_all', 'edit_all', 'delete_all', 'manage_users'];
  if (role === 'editor') return ['view_all', 'edit_records'];
  return ['view_all'];
}

function toAuthUser(u: ManagedUser): AuthUser {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    displayName: u.displayName,
    sector: u.sector || 'ALL',
    role: u.role,
    permissions: buildPermissionsForRole(u.role),
    loginTime: new Date().toISOString(),
  };
}

interface SectorPermissionInfo {
  canEdit: boolean;
  isOwnSector: boolean;
  recordSector: string;
  userSector: string;
  reason: string;
}

export interface CreateUserInput {
  displayName: string;
  username: string;
  email?: string;
  password: string;
  role: UserRole;
  sector?: string;
}

export interface UpdateUserInput {
  displayName?: string;
  role?: UserRole;
  sector?: string;
  isActive?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isViewer: boolean;
  canManageUsers: boolean;
  isLoading: boolean;
  login: (usernameOrEmail: string, password: string, selectedSector?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  canEditRecord: (record: any) => boolean;
  canDeleteRecord: (record?: any) => boolean;
  canCreateForSector: (targetSector?: string) => boolean;
  canAddSite: boolean;
  getSectorPermission: (record: any) => SectorPermissionInfo;
  demoAccounts: DemoAccount[];
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  // Phase 1 User Management
  managedUsers: ManagedUser[];
  usersLoading: boolean;
  cloudUsersSynced: boolean;
  refreshUsers: () => Promise<void>;
  createUser: (input: CreateUserInput) => Promise<{ success: boolean; error?: string }>;
  updateUser: (userId: string, updates: UpdateUserInput) => Promise<{ success: boolean; error?: string }>;
  changeUserPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  isUserManagementOpen: boolean;
  openUserManagement: () => void;
  closeUserManagement: () => void;
  // Phase 2 Activity & Sessions Log
  isAuditLogOpen: boolean;
  openAuditLog: () => void;
  closeAuditLog: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUsersFromSupabase(): Promise<ManagedUser[] | null> {
  // 1. Try dedicated `app_users` table first (prioritizing live fallback DB fzdmdvgmorzifysygkhp.supabase.co)
  for (const client of supabaseClients) {
    try {
      const { data, error } = await client.from(USERS_TABLE_NAME).select('*').limit(500);
      if (!error && Array.isArray(data)) {
        const mapped: ManagedUser[] = data
          .map((row: any) => {
            const payload = row.data && typeof row.data === 'object' ? row.data : row;
            const username = String(row.username || payload.username || '').trim();
            if (!username) return null;
            return {
              id: String(row.id || payload.id || `usr-${username}`),
              username,
              email: row.email || payload.email || undefined,
              displayName: String(row.display_name || payload.displayName || username),
              password: String(row.password || payload.password || ''),
              role: (['admin', 'editor', 'viewer'].includes(row.role || payload.role)
                ? (row.role || payload.role)
                : 'viewer') as UserRole,
              sector: String(row.sector || payload.sector || 'ALL'),
              isActive: row.is_active !== undefined ? Boolean(row.is_active) : payload.isActive !== false,
              createdAt: String(row.created_at || payload.createdAt || new Date().toISOString()),
              updatedAt: String(row.updated_at || payload.updatedAt || new Date().toISOString()),
            } as ManagedUser;
          })
          .filter(Boolean) as ManagedUser[];
        return mapped;
      }
    } catch {
      // try next client
    }
  }

  // 2. Live cloud fallback via reserved sentinel record in `we_records` so cross-device sync works immediately even before SQL migration
  for (const client of [supabaseFallback, ...supabaseClients]) {
    try {
      const { data, error } = await client
        .from('we_records')
        .select('id, data')
        .eq('id', SYNC_APP_USERS_ID)
        .maybeSingle();
      if (!error && data && data.data && Array.isArray(data.data.users)) {
        return data.data.users as ManagedUser[];
      }
    } catch {
      // continue
    }
  }

  return null;
}

async function mirrorUsersToCloudSentinel(users: ManagedUser[]): Promise<boolean> {
  const payload = {
    id: SYNC_APP_USERS_ID,
    site_code: SYNC_APP_USERS_SITE_CODE,
    'site code': SYNC_APP_USERS_SITE_CODE,
    data: {
      __system: true,
      users: ensureAdminPresent(users),
      updatedAt: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  };
  try {
    const { error } = await supabaseFallback.from('we_records').upsert(payload, { onConflict: 'id' });
    if (!error) return true;
  } catch {
    // ignore
  }
  return false;
}

async function upsertUserToSupabase(u: ManagedUser, allUsers: ManagedUser[]): Promise<boolean> {
  const row = {
    id: u.id,
    username: u.username,
    email: u.email || null,
    display_name: u.displayName,
    password: u.password,
    role: u.role,
    sector: u.sector || 'ALL',
    is_active: u.isActive,
    updated_at: u.updatedAt,
    created_at: u.createdAt,
  };
  let tableSynced = false;
  for (const client of supabaseClients) {
    try {
      const { error } = await client.from(USERS_TABLE_NAME).upsert(row, { onConflict: 'id' });
      if (!error) {
        tableSynced = true;
        break;
      }
    } catch {
      // continue
    }
  }
  const sentinelSynced = await mirrorUsersToCloudSentinel(allUsers);
  return tableSynced || sentinelSynced;
}

async function deleteUserFromSupabase(userId: string, remainingUsers: ManagedUser[]): Promise<boolean> {
  let tableSynced = false;
  for (const client of supabaseClients) {
    try {
      const { error } = await client.from(USERS_TABLE_NAME).delete().eq('id', userId);
      if (!error) {
        tableSynced = true;
        break;
      }
    } catch {
      // continue
    }
  }
  const sentinelSynced = await mirrorUsersToCloudSentinel(remainingUsers);
  return tableSynced || sentinelSynced;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>(() => loadLocalUsers());
  const [usersLoading, setUsersLoading] = useState(false);
  const [cloudUsersSynced, setCloudUsersSynced] = useState(false);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);

  const refreshUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const local = loadLocalUsers();
      const cloud = await fetchUsersFromSupabase();
      if (cloud !== null) {
        setCloudUsersSynced(true);
        if (cloud.length === 0) {
          // Table exists but empty — seed initial admin to cloud
          const seeded = ensureAdminPresent(local);
          saveLocalUsers(seeded);
          setManagedUsers(seeded);
          for (const u of seeded) {
            await upsertUserToSupabase(u, seeded);
          }
        } else {
          // Merge cloud (authoritative) with ensureAdminPresent
          const merged = ensureAdminPresent(cloud);
          saveLocalUsers(merged);
          setManagedUsers(merged);
        }
      } else {
        setCloudUsersSynced(false);
        const ensured = ensureAdminPresent(local);
        saveLocalUsers(ensured);
        setManagedUsers(ensured);
      }
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Restore saved session on mount & sync user directory
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const localUsers = loadLocalUsers();
        setManagedUsers(localUsers);

        const saved = localStorage.getItem(SESSION_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as AuthUser;
          const match = localUsers.find(
            (u) =>
              u.isActive &&
              (u.id === parsed.id || normalizeIdentifier(u.username) === normalizeIdentifier(parsed.username))
          );
          if (match && active) {
            const refreshedSession = toAuthUser(match);
            setUser(refreshedSession);
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(refreshedSession));
            startUserSession(refreshedSession);
          } else {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            if (active) setUser(null);
          }
        }
      } catch {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        if (active) setUser(null);
      } finally {
        if (active) setIsLoading(false);
      }

      // Sync cloud users in background
      await refreshUsers();
    })();
    return () => {
      active = false;
    };
  }, [refreshUsers]);

  // Keep active user session in sync if admin updates own role/name or disables account
  useEffect(() => {
    if (!user) return;
    const match = managedUsers.find(
      (u) => u.id === user.id || normalizeIdentifier(u.username) === normalizeIdentifier(user.username)
    );
    if (!match || !match.isActive) {
      setUser(null);
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }
    if (
      match.role !== user.role ||
      match.displayName !== user.displayName ||
      match.sector !== user.sector
    ) {
      const updatedSession = toAuthUser(match);
      setUser(updatedSession);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
    }
  }, [managedUsers, user]);

  // Continuous session heartbeat (every 20s) + close-only flush on pagehide/beforeunload.
  // Never ends or splits the session when switching windows/tabs (visibilitychange).
  useEffect(() => {
    if (!user) return;
    heartbeatUserSession(false);
    const interval = window.setInterval(() => {
      heartbeatUserSession(false);
    }, 20_000);

    const handleCloseFlush = () => {
      endUserSession(true);
    };
    const handleVisibilityChange = () => {
      // Keep the same continuous session alive across tab/window switches:
      // only update last_active_at without ever closing or creating a new session.
      if (document.visibilityState === 'hidden') {
        heartbeatUserSession(true);
      } else if (document.visibilityState === 'visible') {
        heartbeatUserSession(false);
      }
    };

    window.addEventListener('pagehide', handleCloseFlush);
    window.addEventListener('beforeunload', handleCloseFlush);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('pagehide', handleCloseFlush);
      window.removeEventListener('beforeunload', handleCloseFlush);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const login = useCallback(
    async (usernameOrEmail: string, password: string, selectedSector?: string): Promise<{ success: boolean; error?: string }> => {
      // Automatically trim leading/trailing whitespace on username/email (mobile keyboard auto-space)
      // while keeping password exact
      const cleanId = normalizeIdentifier(String(usernameOrEmail || '').trim());
      const exactPass = String(password ?? '');

      if (!cleanId || !exactPass) {
        return { success: false, error: 'يرجى إدخال اسم المستخدم أو البريد الإلكتروني وكلمة المرور' };
      }

      // Always fetch latest user credentials from live Supabase first (fallback to local only if offline)
      let currentUsers = loadLocalUsers();
      const cloud = await fetchUsersFromSupabase();
      if (cloud && cloud.length > 0) {
        currentUsers = ensureAdminPresent(cloud);
        saveLocalUsers(currentUsers);
        setManagedUsers(currentUsers);
        setCloudUsersSynced(true);
      }

      const found = currentUsers.find((u) => {
        const uName = normalizeIdentifier(u.username);
        const uMail = normalizeIdentifier(u.email || '');
        return uName === cleanId || (uMail && uMail === cleanId);
      });

      if (!found || found.password !== exactPass) {
        return {
          success: false,
          error: 'اسم المستخدم أو كلمة المرور غير صحيحة. يرجى التحقق وإعادة المحاولة.',
        };
      }

      if (!found.isActive) {
        return {
          success: false,
          error: 'هذا الحساب معطّل حالياً. يرجى التواصل مع مدير النظام (Admin) لتفعيله.',
        };
      }

      if (selectedSector && selectedSector !== 'ALL' && found.role !== 'admin' && found.sector !== 'ALL') {
        if (!isSectorMatch(found.sector, selectedSector)) {
          return {
            success: false,
            error: `حساب (${found.displayName}) غير مصرح له بالدخول على (${selectedSector}).`,
          };
        }
      }

      const authUser = toAuthUser(found);
      setUser(authUser);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(authUser));
      startUserSession(authUser, { forceNew: true });
      setIsLoginModalOpen(false);
      return { success: true };
    },
    []
  );

  const logout = useCallback(() => {
    endUserSession(false);
    setUser(null);
    setIsUserManagementOpen(false);
    setIsAuditLogOpen(false);
    setIsLoginModalOpen(false);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  const createUser = useCallback(async (input: CreateUserInput): Promise<{ success: boolean; error?: string }> => {
    const username = String(input.username || '').trim();
    const displayName = String(input.displayName || '').trim();
    const password = String(input.password || '').trim();
    const email = input.email ? String(input.email).trim() : (username.includes('@') ? username : undefined);

    if (!displayName) return { success: false, error: 'الاسم الكامل مطلوب' };
    if (!username) return { success: false, error: 'اسم المستخدم أو البريد الإلكتروني مطلوب' };
    if (password.length < 4) return { success: false, error: 'كلمة المرور يجب ألا تقل عن 4 أحرف' };

    const current = loadLocalUsers();
    const exists = current.some(
      (u) =>
        normalizeIdentifier(u.username) === normalizeIdentifier(username) ||
        (email && u.email && normalizeIdentifier(u.email) === normalizeIdentifier(email))
    );
    if (exists) {
      return { success: false, error: 'اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل' };
    }

    const now = new Date().toISOString();
    const newUser: ManagedUser = {
      id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      username,
      email,
      displayName,
      password,
      role: input.role,
      sector: input.sector || 'ALL',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const next = ensureAdminPresent([...current, newUser]);
    saveLocalUsers(next);
    setManagedUsers(next);

    const synced = await upsertUserToSupabase(newUser, next);
    if (synced) setCloudUsersSynced(true);

    return { success: true };
  }, []);

  const updateUser = useCallback(async (userId: string, updates: UpdateUserInput): Promise<{ success: boolean; error?: string }> => {
    const current = loadLocalUsers();
    const target = current.find((u) => u.id === userId);
    if (!target) return { success: false, error: 'المستخدم غير موجود' };

    const activeAdmins = current.filter((u) => u.role === 'admin' && u.isActive);
    const isLastActiveAdmin = activeAdmins.length === 1 && activeAdmins[0].id === userId;

    if (isLastActiveAdmin && (updates.isActive === false || (updates.role && updates.role !== 'admin'))) {
      return { success: false, error: 'لا يمكن تعطيل أو تغيير صلاحية آخر حساب مدير نظام (Admin) نشط.' };
    }

    const updatedUser: ManagedUser = {
      ...target,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const next = ensureAdminPresent(current.map((u) => (u.id === userId ? updatedUser : u)));
    saveLocalUsers(next);
    setManagedUsers(next);

    const synced = await upsertUserToSupabase(updatedUser, next);
    if (synced) setCloudUsersSynced(true);

    return { success: true };
  }, []);

  const changeUserPassword = useCallback(async (userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    const cleanPass = String(newPassword || '').trim();
    if (cleanPass.length < 4) {
      return { success: false, error: 'كلمة المرور الجديدة يجب ألا تقل عن 4 أحرف' };
    }

    const current = loadLocalUsers();
    const target = current.find((u) => u.id === userId);
    if (!target) return { success: false, error: 'المستخدم غير موجود' };

    const updatedUser: ManagedUser = {
      ...target,
      password: cleanPass,
      updatedAt: new Date().toISOString(),
    };

    const next = ensureAdminPresent(current.map((u) => (u.id === userId ? updatedUser : u)));
    saveLocalUsers(next);
    setManagedUsers(next);

    const synced = await upsertUserToSupabase(updatedUser, next);
    if (synced) setCloudUsersSynced(true);

    return { success: true };
  }, []);

  const deleteUser = useCallback(async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (user && user.id === userId) {
      return { success: false, error: 'لا يمكنك حذف حسابك الحالي أثناء تسجيل الدخول.' };
    }

    const current = loadLocalUsers();
    const target = current.find((u) => u.id === userId);
    if (!target) return { success: false, error: 'المستخدم غير موجود' };

    const activeAdmins = current.filter((u) => u.role === 'admin' && u.isActive);
    if (activeAdmins.length === 1 && activeAdmins[0].id === userId) {
      return { success: false, error: 'لا يمكن حذف آخر حساب مدير نظام (Admin) نشط.' };
    }

    const next = ensureAdminPresent(current.filter((u) => u.id !== userId));
    saveLocalUsers(next);
    setManagedUsers(next);

    const synced = await deleteUserFromSupabase(userId, next);
    if (synced) setCloudUsersSynced(true);

    return { success: true };
  }, [user]);

  const isAdmin = useMemo(() => Boolean(user && user.role === 'admin'), [user]);
  const isViewer = useMemo(() => Boolean(user && user.role === 'viewer'), [user]);
  const canManageUsers = isAdmin;

  const canEditRecord = useCallback(
    (record: any): boolean => {
      if (!user) return false;
      if (user.role === 'viewer') return false;
      if (user.role === 'admin' || user.sector === 'ALL') return true;
      return isRecordInSector(user.sector, record);
    },
    [user]
  );

  const canDeleteRecord = useCallback(
    (_record?: any): boolean => {
      if (!user) return false;
      return user.role === 'admin';
    },
    [user]
  );

  const canCreateForSector = useCallback(
    (targetSector?: string): boolean => {
      if (!user) return false;
      if (user.role === 'viewer') return false;
      if (user.role === 'admin' || user.sector === 'ALL') return true;
      if (!targetSector) return true;
      return isSectorMatch(user.sector, targetSector);
    },
    [user]
  );

  const canAddSite = useMemo(() => Boolean(user && (user.role === 'admin' || user.role === 'editor')), [user]);

  const getSectorPermission = useCallback(
    (record: any): SectorPermissionInfo => {
      const recordSector = extractRecordSector(record);

      if (!user) {
        return {
          canEdit: false,
          isOwnSector: false,
          recordSector,
          userSector: 'غير مسجل',
          reason: 'يرجى تسجيل الدخول أولاً',
        };
      }

      if (user.role === 'admin') {
        return {
          canEdit: true,
          isOwnSector: true,
          recordSector,
          userSector: 'الإدارة العامة (كافة القطاعات)',
          reason: 'صلاحية كاملة لجميع القطاعات والمشروعات وكافة الحقول (Admin)',
        };
      }

      if (user.role === 'viewer') {
        return {
          canEdit: false,
          isOwnSector: false,
          recordSector,
          userSector: 'مشاهدة فقط',
          reason: 'حسابك يحمل صلاحية المشاهدة فقط (Viewer - Read-Only)',
        };
      }

      if (user.sector === 'ALL' || isRecordInSector(user.sector, record)) {
        return {
          canEdit: true,
          isOwnSector: true,
          recordSector,
          userSector: user.sector === 'ALL' ? 'كافة القطاعات (Editor)' : user.sector,
          reason: 'لديك صلاحية الإضافة والتعديل لهذا الموقع (Editor)',
        };
      }

      return {
        canEdit: false,
        isOwnSector: false,
        recordSector,
        userSector: user.sector,
        reason: `هذا الموقع يتبع قطاع (${recordSector || 'آخر'}). حسابك مصرح له بإدارة مواقع قطاع (${user.sector}) فقط.`,
      };
    },
    [user]
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin,
      isViewer,
      canManageUsers,
      isLoading,
      login,
      logout,
      canEditRecord,
      canDeleteRecord,
      canCreateForSector,
      canAddSite,
      getSectorPermission,
      demoAccounts: PRESET_ACCOUNTS,
      isLoginModalOpen,
      openLoginModal: () => setIsLoginModalOpen(true),
      closeLoginModal: () => setIsLoginModalOpen(false),
      managedUsers,
      usersLoading,
      cloudUsersSynced,
      refreshUsers,
      createUser,
      updateUser,
      changeUserPassword,
      deleteUser,
      isUserManagementOpen,
      openUserManagement: () => setIsUserManagementOpen(true),
      closeUserManagement: () => setIsUserManagementOpen(false),
      isAuditLogOpen,
      openAuditLog: () => setIsAuditLogOpen(true),
      closeAuditLog: () => setIsAuditLogOpen(false),
    }),
    [
      user,
      isAdmin,
      isViewer,
      canManageUsers,
      isLoading,
      login,
      logout,
      canEditRecord,
      canDeleteRecord,
      canCreateForSector,
      canAddSite,
      getSectorPermission,
      isLoginModalOpen,
      managedUsers,
      usersLoading,
      cloudUsersSynced,
      refreshUsers,
      createUser,
      updateUser,
      changeUserPassword,
      deleteUser,
      isUserManagementOpen,
      isAuditLogOpen,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
