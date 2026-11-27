// src/components/LoginScreen.tsx
// Full-page Arabic-friendly authentication gate protecting FIBER TRACKING PORT until signed in

import React, { useState } from 'react';
import { useAuth, INITIAL_ADMIN_CREDENTIALS } from '../context/AuthContext';
import {
  Radio,
  ShieldCheck,
  User,
  Key,
  Eye,
  EyeOff,
  Lock,
  AlertCircle,
  Info,
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showAdminHint, setShowAdminHint] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const res = await login(username, password);
      if (!res.success) {
        setErrorMessage(res.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch {
      setErrorMessage('حدث خطأ أثناء الاتصال بالنظام، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4 font-sans relative overflow-hidden"
      dir="rtl"
    >
      {/* Subtle background fiber glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-6 py-7 text-white text-center border-b border-slate-800">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/30 ring-2 ring-white/20">
            <Radio className="w-7 h-7 text-white animate-pulse" />
          </div>
          <h1 className="text-2xl font-black tracking-tight font-sans text-white">
            FIBER TRACKING PORT
          </h1>
          <p className="text-xs text-sky-200/90 mt-1 font-medium">
            منظومة متابعة مشروعات الألياف الضوئية • FTTS • الإتاحة • التحول الرقمي
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-7 space-y-5">
          <div className="flex items-center gap-2 text-slate-800">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <h2 className="text-base font-extrabold">تسجيل الدخول للوحة المتابعة</h2>
              <p className="text-[11px] text-slate-500">
                أدخل اسم المستخدم أو البريد الإلكتروني وكلمة المرور للمتابعة
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                اسم المستخدم أو البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin أو admin@ftts.local"
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                  dir="ltr"
                />
                <User className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition font-mono"
                  dir="ltr"
                />
                <Key className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute left-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جارِ التحقق من البيانات...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>تسجيل الدخول</span>
                </>
              )}
            </button>
          </form>

          {/* Non-intrusive initial admin setup hint */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAdminHint((v) => !v)}
              className="text-[11px] font-semibold text-slate-500 hover:text-blue-700 flex items-center gap-1.5 cursor-pointer transition"
            >
              <Info className="w-3.5 h-3.5 text-blue-500" />
              <span>{showAdminHint ? 'إخفاء بيانات الدخول المبدئية للمدير' : 'بيانات الدخول المبدئية لمدير النظام (أول تشغيل)'}</span>
            </button>
            {showAdminHint && (
              <div className="mt-2 p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-[11px] text-slate-700 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600">اسم المستخدم:</span>
                  <code className="font-mono font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200">
                    {INITIAL_ADMIN_CREDENTIALS.username}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600">كلمة المرور المبدئية:</span>
                  <code className="font-mono font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200">
                    {INITIAL_ADMIN_CREDENTIALS.password}
                  </code>
                </div>
                <p className="text-[10px] text-slate-500 pt-1">
                  يمكنك تغيير كلمة مرور المدير فوراً بعد تسجيل الدخول من نافذة «إدارة المستخدمين».
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
