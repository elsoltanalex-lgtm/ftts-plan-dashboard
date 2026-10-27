// src/types/auth.ts
// User roles and sector permissions definitions

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  sector: string; // e.g., 'شرق الدلتا 1', 'غرب الدلتا', 'ALL', 'None'
  role: UserRole;
  permissions: string[];
  plainPassword?: string;
  token?: string;
  loginTime?: string;
}

export interface DemoAccount {
  username: string;
  displayName: string;
  plainPassword: string;
  sector: string;
  role: UserRole;
  description: string;
  tagColor: string;
}
