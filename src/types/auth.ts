// src/types/auth.ts
// User roles, managed accounts, and sector permissions definitions

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface ManagedUser {
  id: string;
  username: string;
  email?: string;
  displayName: string;
  password: string;
  role: UserRole;
  sector: string; // 'ALL' or specific geographic sector
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  displayName: string;
  sector: string; // e.g., 'ALL' or specific sector
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
