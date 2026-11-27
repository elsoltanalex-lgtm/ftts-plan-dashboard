// src/components/UserManagementModal.tsx
// Admin-only User Management panel: view users, create accounts, assign roles, reset passwords, toggle active status

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { ManagedUser, UserRole } from '../types/auth';
import {
  X,
  Users,
  UserPlus,
  ShieldCheck,
  Edit3,
  Eye,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Power,
  Trash2,
  RefreshCw,
  Cloud,
  HardDrive,
} from 'lucide-react';

const ROLE_META: Record<UserRole, { label: string; badge: string; desc: string }> = {
  admin: {
    label: 'مدير نظام (Admin)',
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
    desc: 'صلاحية كاملة + إدارة المستخدمين',
  },
  editor: {
    label: 'محرر (Editor)',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    desc: 'عرض وإضافة وتعديل السجلات',
  },
  viewer: {
    label: 'مشاهد فقط (Viewer)',
    badge: 'bg-slate-100 text-slate-700 border-slate-300',
    desc: 'عرض وتصدير فقط (بدون تعديل)',
  },
};

export const UserManagementModal: React.FC = () => {
  const {
    user: currentUser,
    isAdmin,
    isUserManagementOpen,
    closeUserManagement,
    managedUsers,
    usersLoading,
    cloudUsersSynced,
    refreshUsers,
    createUser,
    updateUser,
    changeUserPassword,
    deleteUser,
  } = useAuth();

  // Create form state
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('editor');
  const [creating, setCreating] = useState(false);

  // Password reset inline modal state
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  // Feedback alerts
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isUserManagementOpen || !isAdmin) return null;

  const showNotice = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFeedback(null);
    const res = await createUser({
      displayName,
      username,
      email: email.trim() || undefined,
      password,
      role,
      sector: 'ALL',
    });
    setCreating(false);
    if (res.success) {
      setDisplayName('');
      setUsername('');
      setEmail('');
      setPassword('');
      setRole('editor');
      showNotice('success', `تم إنشاء حساب "${displayName || username}" بنجاح ✅`);
    } else {
      showNotice('error', res.error || 'فشل إنشاء المستخدم');
    }
  };

  const handleRoleChange = async (u: ManagedUser, nextRole: UserRole) => {
    const res = await updateUser(u.id, { role: nextRole });
    if (res.success) {
      showNotice('success', `تم تحديث صلاحية "${u.displayName}" إلى ${ROLE_META[nextRole].label} ✅`);
    } else {
      showNotice('error', res.error || 'تعذر تغيير الصلاحية');
    }
  };

  const handleToggleActive = async (u: ManagedUser) => {
    const res = await updateUser(u.id, { isActive: !u.isActive });
    if (res.success) {
      showNotice('success', `تم ${!u.isActive ? 'تفعيل' : 'تعطيل'} حساب "${u.displayName}" ✅`);
    } else {
      showNotice('error', res.error || 'تعذر تحديث حالة الحساب');
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetting(true);
    const res = await changeUserPassword(resetTarget.id, newPassword);
    setResetting(false);
    if (res.success) {
      showNotice('success', `تم تغيير كلمة مرور "${resetTarget.displayName}" بنجاح ✅`);
      setResetTarget(null);
      setNewPassword('');
    } else {
      showNotice('error', res.error || 'فشل تغيير كلمة المرور');
    }
  };

  const handleDelete = async (u: ManagedUser) => {
    if (!window.confirm(`هل أنت متأكد من حذف حساب "${u.displayName}" (${u.username}) نهائياً؟`)) return;
    const res = await deleteUser(u.id);
    if (res.success) {
      showNotice('success', `تم حذف حساب "${u.displayName}" بنجاح`);
    } else {
      showNotice('error', res.error || 'تعذر حذف المستخدم');
    }
  };

  const totalCount = managedUsers.length;
  const activeCount = managedUsers.filter((u) => u.isActive).length;
  const adminCount = managedUsers.filter((u) => u.role === 'admin').length;
  const editorCount = managedUsers.filter((u) => u.role === 'editor').length;
  const viewerCount = managedUsers.filter((u) => u.role === 'viewer').length;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
      dir="rtl"
    >
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-5 py-4 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>إدارة المستخدمين والصلاحيات</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/30 border border-purple-400/40 text-purple-100">
                  Admin Only
                </span>
              </h2>
              <p className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-2">
                {cloudUsersSynced ? (
                  <span className="inline-flex items-center gap-1 text-emerald-300">
                    <Cloud className="w-3.5 h-3.5" /> متزامن مع Supabase (`app_users`)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-300">
                    <HardDrive className="w-3.5 h-3.5" /> تخزين محلي نشط (مهيأ للربط الفوري مع Supabase `app_users`)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refreshUsers()}
              disabled={usersLoading}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer transition"
              title="تحديث قائمة المستخدمين"
            >
              <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={closeUserManagement}
              className="p-2 rounded-lg bg-white/10 hover:bg-rose-500/80 text-white cursor-pointer transition"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-bold text-slate-500">إجمالي الحسابات</div>
              <div className="text-lg font-black text-slate-900 font-mono">{totalCount}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-[11px] font-bold text-emerald-700">نشط</div>
              <div className="text-lg font-black text-emerald-800 font-mono">{activeCount}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200">
              <div className="text-[11px] font-bold text-purple-700">مدير (Admin)</div>
              <div className="text-lg font-black text-purple-800 font-mono">{adminCount}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
              <div className="text-[11px] font-bold text-blue-700">محرر (Editor)</div>
              <div className="text-lg font-black text-blue-800 font-mono">{editorCount}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 col-span-2 sm:col-span-1">
              <div className="text-[11px] font-bold text-slate-600">مشاهد (Viewer)</div>
              <div className="text-lg font-black text-slate-800 font-mono">{viewerCount}</div>
            </div>
          </div>

          {/* Add New User Form */}
          <form
            onSubmit={handleCreateUser}
            className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs sm:text-sm">
              <UserPlus className="w-4 h-4 text-blue-600" />
              <span>إضافة مستخدم جديد</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="الاسم الكامل (مثال: م. أحمد علي)"
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:border-blue-500 outline-none"
              />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="اسم المستخدم (username)"
                dir="ltr"
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:border-blue-500 outline-none"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="البريد الإلكتروني (اختياري)"
                dir="ltr"
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:border-blue-500 outline-none"
              />
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="كلمة المرور (4+ أحرف)"
                dir="ltr"
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono text-slate-800 focus:border-blue-500 outline-none"
              />
              <div className="flex gap-2">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-2.5 py-2 font-bold text-slate-800 focus:border-blue-500 outline-none cursor-pointer"
                >
                  <option value="admin">Admin (مدير)</option>
                  <option value="editor">Editor (محرر)</option>
                  <option value="viewer">Viewer (مشاهد)</option>
                </select>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {creating ? '...' : 'إضافة'}
                </button>
              </div>
            </div>
          </form>

          {/* Change Password Inline Drawer */}
          {resetTarget && (
            <form
              onSubmit={handleSavePassword}
              className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  تغيير كلمة مرور: <strong className="underline">{resetTarget.displayName}</strong> ({resetTarget.username})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  autoFocus
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة"
                  dir="ltr"
                  className="bg-white border border-amber-400 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-900 outline-none"
                />
                <button
                  type="submit"
                  disabled={resetting}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  {resetting ? 'جارِ الحفظ...' : 'حفظ كلمة المرور'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetTarget(null);
                    setNewPassword('');
                  }}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          )}

          {/* Users Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-2.5">الاسم</th>
                    <th className="px-3.5 py-2.5">اسم المستخدم / البريد</th>
                    <th className="px-3.5 py-2.5">الصلاحية (Role)</th>
                    <th className="px-3.5 py-2.5">الحالة</th>
                    <th className="px-3.5 py-2.5 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {managedUsers.map((u) => {
                    const isSelf = currentUser?.id === u.id;
                    return (
                      <tr key={u.id} className={u.isActive ? 'bg-white hover:bg-slate-50/70' : 'bg-slate-50/80 opacity-70'}>
                        <td className="px-3.5 py-2.5 font-bold text-slate-800">
                          <div className="flex items-center gap-1.5">
                            {u.role === 'admin' ? (
                              <ShieldCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            ) : u.role === 'editor' ? (
                              <Edit3 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            ) : (
                              <Eye className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            )}
                            <span>{u.displayName}</span>
                            {isSelf && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                                أنت
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-slate-700" dir="ltr">
                          <div className="text-right">{u.username}</div>
                          {u.email && u.email !== u.username && (
                            <div className="text-[10px] text-slate-400 text-right">{u.email}</div>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer outline-none ${ROLE_META[u.role].badge}`}
                          >
                            <option value="admin">مدير نظام (Admin)</option>
                            <option value="editor">محرر (Editor)</option>
                            <option value="viewer">مشاهد فقط (Viewer)</option>
                          </select>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              u.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {u.isActive ? 'نشط' : 'معطّل'}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setResetTarget(u);
                                setNewPassword('');
                              }}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                              title="تغيير كلمة المرور"
                            >
                              <KeyRound className="w-3 h-3" />
                              <span>كلمة المرور</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(u)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 cursor-pointer transition ${
                                u.isActive
                                  ? 'bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border-slate-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                              }`}
                              title={u.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                            >
                              <Power className="w-3 h-3" />
                              <span>{u.isActive ? 'تعطيل' : 'تفعيل'}</span>
                            </button>
                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => handleDelete(u)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg cursor-pointer transition"
                                title="حذف الحساب"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
