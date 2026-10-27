// src/context/AuthContext.tsx
// Strict Role-Based Access Control (RBAC) & Sector Permissions Context
// Provides session management, sector permissions, and role validation

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { AuthUser, DemoAccount, UserRole } from '../types/auth';
import { isSectorMatch, extractRecordSector, isRecordInSector } from '../utils/sectorPermissions';

// Built-in sector accounts with credentials
// Built-in sector accounts with credentials (Admin + 6 Geographic Sectors)
// Built-in sector accounts with credentials (Admin + Unified Canonical Sectors)
export const PRESET_ACCOUNTS: DemoAccount[] = [
  {
    username: 'admin',
    displayName: 'الإدارة العامة المركزية',
    plainPassword: 'Admin@2026',
    sector: 'ALL',
    role: 'admin',
    description: 'صلاحية كاملة لرؤية وإدارة كافة القطاعات (إضافة وتعديل وحذف واستعراض شامل)',
    tagColor: 'bg-purple-500/10 text-purple-700 border-purple-300',
  },
  {
    username: 'alex_coast',
    displayName: 'قطاع إسكندرية والساحل',
    plainPassword: 'AlexCoast@2026',
    sector: 'قطاع إسكندرية والساحل',
    role: 'editor',
    description: 'صلاحية موحدة لمناطق الإسكندرية والساحل الشمالي ومطروح • إدارة وتعديل المواقع',
    tagColor: 'bg-cyan-500/10 text-cyan-700 border-cyan-300',
  },
  {
    username: 'east_delta',
    displayName: 'قطاع شرق الدلتا',
    plainPassword: 'EastDelta@2026',
    sector: 'قطاع شرق الدلتا',
    role: 'editor',
    description: 'صلاحية موحدة لمناطق شرق الدلتا 1 وشرق الدلتا 2 • إدارة وتعديل المواقع',
    tagColor: 'bg-indigo-500/10 text-indigo-700 border-indigo-300',
  },
  {
    username: 'west_delta',
    displayName: 'قطاع مناطق غرب الدلتا',
    plainPassword: 'West@2026',
    sector: 'قطاع مناطق غرب الدلتا',
    role: 'editor',
    description: 'صلاحية كاملة لقطاع مناطق غرب الدلتا • إدارة وتعديل المواقع',
    tagColor: 'bg-blue-500/10 text-blue-700 border-blue-300',
  },
  {
    username: 'central_delta',
    displayName: 'قطاع مناطق وسط الدلتا',
    plainPassword: 'Delta@2026',
    sector: 'قطاع مناطق وسط الدلتا',
    role: 'editor',
    description: 'صلاحية كاملة لقطاع مناطق وسط الدلتا • إدارة وتعديل المواقع',
    tagColor: 'bg-amber-500/10 text-amber-700 border-amber-300',
  },
  {
    username: 'suez',
    displayName: 'قطاع مناطق السويس',
    plainPassword: 'Suez@2026',
    sector: 'قطاع مناطق السويس',
    role: 'editor',
    description: 'صلاحية كاملة لقطاع مناطق السويس وسيناء • إدارة وتعديل المواقع',
    tagColor: 'bg-rose-500/10 text-rose-700 border-rose-300',
  },
  {
    username: 'ismailia',
    displayName: 'قطاع مناطق الإسماعيلية',
    plainPassword: 'Ismailia@2026',
    sector: 'قطاع مناطق الإسماعيلية',
    role: 'editor',
    description: 'صلاحية كاملة لقطاع مناطق الإسماعيلية • إدارة وتعديل المواقع',
    tagColor: 'bg-teal-500/10 text-teal-700 border-teal-300',
  },
  {
    username: 'cairo',
    displayName: 'قطاع مناطق القاهرة الكبرى',
    plainPassword: 'Cairo@2026',
    sector: 'قطاع مناطق القاهرة الكبرى',
    role: 'editor',
    description: 'صلاحية كاملة لقطاع مناطق القاهرة الكبرى • إدارة وتعديل المواقع',
    tagColor: 'bg-emerald-500/10 text-emerald-700 border-emerald-300',
  },
  {
    username: 'giza_october',
    displayName: 'قطاع مناطق الجيزة وأكتوبر',
    plainPassword: 'Giza@2026',
    sector: 'قطاع مناطق الجيزة وأكتوبر',
    role: 'editor',
    description: 'صلاحية كاملة لقطاع مناطق الجيزة وأكتوبر • إدارة وتعديل المواقع',
    tagColor: 'bg-orange-500/10 text-orange-700 border-orange-300',
  },
  {
    username: 'upper_egypt',
    displayName: 'قطاع مناطق الصعيد',
    plainPassword: 'Upper@2026',
    sector: 'قطاع مناطق الصعيد',
    role: 'editor',
    description: 'صلاحية كاملة لقطاع مناطق الصعيد • إدارة وتعديل المواقع',
    tagColor: 'bg-violet-500/10 text-violet-700 border-violet-300',
  },
];

interface SectorPermissionInfo {
  canEdit: boolean;
  isOwnSector: boolean;
  recordSector: string;
  userSector: string;
  reason: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (username: string, password: string, selectedSector?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  canEditRecord: (record: any) => boolean;
  canDeleteRecord: (record: any) => boolean;
  canCreateForSector: (targetSector: string) => boolean;
  getSectorPermission: (record: any) => SectorPermissionInfo;
  demoAccounts: DemoAccount[];
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'ftts_auth_user_session';
const API_BASE = 'http://localhost:3001/api';

function isUsernameMatch(accUser: string, input?: string | null): boolean {
  if (!input) return false;
  const a = accUser.toLowerCase();
  const i = input.toLowerCase().trim();
  if (a === i) return true;
  if (a === 'alex_coast' && ['alexandria', 'alex', 'north_coast_matrouh', 'north_coast', 'coast', 'matrouh', 'alexcoast'].includes(i)) return true;
  if (a === 'east_delta' && ['east_delta1', 'east_delta2', 'east', 'delta1', 'delta2', 'eastdelta'].includes(i)) return true;
  if (a === 'west_delta' && ['west', 'westdelta'].includes(i)) return true;
  if (a === 'central_delta' && ['mid_delta', 'delta', 'central_delta', 'centraldelta'].includes(i)) return true;
  return false;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Restore saved session on load
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const validAccount = PRESET_ACCOUNTS.find((a) => isUsernameMatch(a.username, parsed.username));
        if (validAccount) {
          setUser(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
          setUser(null);
          setIsLoginModalOpen(true);
        }
      } else {
        // Require login if no session
        setUser(null);
        setIsLoginModalOpen(true);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      setIsLoginModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login handler with backend fallback and sector validation
  const login = useCallback(
    async (username: string, password: string, selectedSector?: string): Promise<{ success: boolean; error?: string }> => {
      const cleanUser = username.trim().toLowerCase();
      const cleanPass = password.trim();

      if (!cleanUser || !cleanPass) {
        return { success: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور' };
      }

      // 1. Try local server login first
      try {
        const res = await fetch(`${API_BASE}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUser, password: cleanPass, sector: selectedSector }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            // Validate selected sector
            if (selectedSector && selectedSector !== 'ALL' && data.user.role !== 'admin') {
              if (!isSectorMatch(data.user.sector, selectedSector)) {
                return {
                  success: false,
                  error: `حسابك (${data.user.displayName}) يتبع (${data.user.sector}) ولا يتطابق مع القطاع المختار (${selectedSector}). يرجى اختيار القطاع الصحيح.`,
                };
              }
            }

            const authUser: AuthUser = {
              id: data.user.id || cleanUser,
              username: data.user.username,
              displayName: data.user.displayName || cleanUser,
              sector: data.user.sector,
              role: data.user.role as UserRole,
              permissions: data.user.permissions || ['view_all'],
              token: data.token,
              loginTime: new Date().toISOString(),
            };
            setUser(authUser);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
            return { success: true };
          }
        }
      } catch {
        // Local server is not reachable, fallback to credentials check
      }

      // 2. Client-side authentication fallback using PRESET_ACCOUNTS
      const found = PRESET_ACCOUNTS.find((a) => {
        const matchUser = isUsernameMatch(a.username, cleanUser);
        const matchPass =
          a.plainPassword === cleanPass ||
          (a.username === 'alex_coast' && ['Alex@2026', 'CoastMatrouh@2026', 'Coast@2026'].includes(cleanPass)) ||
          (a.username === 'east_delta' && ['Delta1@2026', 'Delta2@2026'].includes(cleanPass));
        return matchUser && matchPass;
      });

      if (!found) {
        return {
          success: false,
          error: 'اسم المستخدم أو كلمة المرور غير صحيحة. يرجى التحقق وإعادة المحاولة.',
        };
      }

      // Verify chosen sector matches the account
      if (selectedSector && selectedSector !== 'ALL' && found.role !== 'admin') {
        if (!isSectorMatch(found.sector, selectedSector)) {
          return {
            success: false,
            error: `حساب (${found.displayName}) غير مصرح له بالدخول على (${selectedSector}). يرجى اختيار قطاعك التابع له حسابك.`,
          };
        }
      }

      const authUser: AuthUser = {
        id: found.username,
        username: found.username,
        displayName: found.displayName,
        sector: found.sector,
        role: found.role,
        permissions:
          found.role === 'admin'
            ? ['view_all', 'edit_all', 'delete_all']
            : ['view_own_sector', 'edit_own_sector'],
        loginTime: new Date().toISOString(),
      };
      setUser(authUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
      return { success: true };
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    setIsLoginModalOpen(true);
  }, []);

  // Check if current user has permission to edit this record
  const canEditRecord = useCallback(
    (record: any): boolean => {
      if (!user) return false;
      if (user.role === 'admin' || user.sector === 'ALL') return true;
      if (user.role === 'viewer') return false;

      return isRecordInSector(user.sector, record);
    },
    [user]
  );

  // Check if current user has permission to delete this record
  const canDeleteRecord = useCallback(
    (record: any): boolean => {
      if (!user) return false;
      if (user.role === 'admin' || user.sector === 'ALL') return true;
      if (user.role === 'viewer') return false;

      return isRecordInSector(user.sector, record);
    },
    [user]
  );

  // Check if current user can create a site in target sector
  const canCreateForSector = useCallback(
    (targetSector: string): boolean => {
      if (!user) return false;
      if (user.role === 'admin' || user.sector === 'ALL') return true;
      if (user.role === 'viewer') return false;
      return isSectorMatch(user.sector, targetSector);
    },
    [user]
  );

  // Get detailed sector permission info
  const getSectorPermission = useCallback(
    (record: any): SectorPermissionInfo => {
      const recordSector = extractRecordSector(record);

      if (!user) {
        return {
          canEdit: false,
          isOwnSector: false,
          recordSector,
          userSector: 'غير مسجل',
          reason: 'يرجى تسجيل الدخول للوصول إلى النظام',
        };
      }

      if (user.role === 'admin' || user.sector === 'ALL') {
        return {
          canEdit: true,
          isOwnSector: true,
          recordSector,
          userSector: 'الإدارة العامة (كافة القطاعات)',
          reason: 'صلاحية كاملة لجميع القطاعات (Admin)',
        };
      }

      if (user.role === 'viewer') {
        return {
          canEdit: false,
          isOwnSector: false,
          recordSector,
          userSector: 'مشاهدة فقط',
          reason: 'حسابك يحمل صلاحية المشاهدة فقط (Read-Only)',
        };
      }

      const match = isRecordInSector(user.sector, record);
      if (match) {
        return {
          canEdit: true,
          isOwnSector: true,
          recordSector,
          userSector: user.sector,
          reason: `هذا الموقع يتبع قطاعك (${user.sector}) - لديك صلاحية التعديل الكاملة`,
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

  const isAdmin = useMemo(() => {
    return Boolean(user && (user.role === 'admin' || user.sector === 'ALL'));
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin,
      isLoading,
      login,
      logout,
      canEditRecord,
      canDeleteRecord,
      canCreateForSector,
      getSectorPermission,
      demoAccounts: PRESET_ACCOUNTS,
      isLoginModalOpen,
      openLoginModal: () => setIsLoginModalOpen(true),
      closeLoginModal: () => setIsLoginModalOpen(false),
    }),
    [
      user,
      isAdmin,
      isLoading,
      login,
      logout,
      canEditRecord,
      canDeleteRecord,
      canCreateForSector,
      getSectorPermission,
      isLoginModalOpen,
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
