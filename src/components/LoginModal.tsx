// src/components/LoginModal.tsx
// Role-Based Access Control Login Component
// Features mandatory Sector selection dropdown, username, and password verification
// Automatically filters dashboard based on chosen and verified sector

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Key, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  X,
  MapPin,
  ChevronDown
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const GEOGRAPHIC_LOGIN_SECTORS = [
  { value: 'ALL', label: 'الإدارة العامة المركزية (Admin / كافة القطاعات)', badge: 'Admin' },
  { value: 'قطاع إسكندرية والساحل', label: 'قطاع إسكندرية والساحل' },
  { value: 'قطاع شرق الدلتا', label: 'قطاع شرق الدلتا' },
  { value: 'قطاع مناطق غرب الدلتا', label: 'قطاع مناطق غرب الدلتا' },
  { value: 'قطاع مناطق وسط الدلتا', label: 'قطاع مناطق وسط الدلتا' },
  { value: 'قطاع مناطق السويس', label: 'قطاع مناطق السويس' },
  { value: 'قطاع مناطق الإسماعيلية', label: 'قطاع مناطق الإسماعيلية' },
  { value: 'قطاع مناطق القاهرة الكبرى', label: 'قطاع مناطق القاهرة الكبرى' },
  { value: 'قطاع مناطق الجيزة وأكتوبر', label: 'قطاع مناطق الجيزة وأكتوبر' },
  { value: 'قطاع مناطق الصعيد', label: 'قطاع مناطق الصعيد' },
];

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { login, user, demoAccounts } = useAuth();

  const [selectedSector, setSelectedSector] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    if (!selectedSector) {
      setErrorMessage('يرجى اختيار القطاع الجغرافي التابع له الحساب للمتابعة');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(username, password, selectedSector);
      if (result.success) {
        setSuccessNotice('تم التحقق وتسجيل الدخول بنجاح! جاري توجيهك وتصفية بيانات القطاع...');
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
        }, 500);
      } else {
        setErrorMessage(result.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch {
      setErrorMessage('حدث خطأ أثناء الاتصال بالنظام، يرجى المحاولة لاحقاً');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-right"
        dir="rtl"
      >
        {/* Header Banner */}
        <div className="relative bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 text-white overflow-hidden border-b border-slate-800">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Close Button only if user is already authenticated */}
          {user && (
            <button
              onClick={onClose}
              className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 text-white font-bold ring-2 ring-white/20 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                تسجيل الدخول للنظام
              </h2>
              <p className="text-xs text-sky-200/80 mt-0.5">
                منظومة متابعة المشروعات القومية FTTS • التحكم بالصلاحيات بحسب القطاعات الجغرافية
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {/* Error & Success Alerts */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Sector Dropdown (Required) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>القطاع الجغرافي (Sector)</span>
                </span>
                <span className="text-red-500 font-bold text-[11px]">* إلزامي</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className={`w-full pl-8 pr-10 py-2.5 border rounded-xl text-xs sm:text-sm font-medium outline-none transition appearance-none cursor-pointer ${
                    selectedSector
                      ? 'bg-blue-50/70 border-blue-400 text-blue-900 font-bold ring-2 ring-blue-500/10'
                      : 'bg-slate-50 border-slate-300 text-slate-700 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                >
                  <option value="">-- اضغط لاختيار القطاع الجغرافي --</option>
                  {GEOGRAPHIC_LOGIN_SECTORS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <MapPin className="absolute right-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <ChevronDown className="absolute left-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* 2. Username Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>اسم المستخدم (Username)</span>
                <span className="text-red-500 font-bold text-[11px]">* إلزامي</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="أدخل اسم المستخدم"
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                  dir="ltr"
                />
                <User className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* 3. Password Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>كلمة المرور (Password)</span>
                <span className="text-red-500 font-bold text-[11px]">* إلزامي</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition font-mono"
                  dir="ltr"
                />
                <Key className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>تذكر بيانات تسجيل الدخول</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جارِ التحقق ومطابقة القطاع...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>تسجيل الدخول والتحقق</span>
                </>
              )}
            </button>
          </form>

          {/* Authorized Credentials Table for Quick Selection */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>📋</span>
                <span>الحسابات المعتمدة للقطاعات الجغرافية (تعبئة تلقائية سريعة):</span>
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-slate-50/50">
              <table className="w-full text-right text-[11px] border-collapse">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2">القطاع المخصص</th>
                    <th className="p-2 font-mono">اسم المستخدم</th>
                    <th className="p-2 font-mono">كلمة المرور</th>
                    <th className="p-2 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {demoAccounts.map((acc) => (
                    <tr key={acc.username} className="hover:bg-blue-50/50 transition">
                      <td className="p-2 font-medium text-slate-800">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span>{acc.displayName}</span>
                          {acc.role === 'admin' && (
                            <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded font-bold">
                              Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 font-mono text-blue-700 font-semibold" dir="ltr">
                        {acc.username}
                      </td>
                      <td className="p-2 font-mono text-slate-600 font-bold" dir="ltr">
                        {acc.plainPassword}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setUsername(acc.username);
                            setPassword(acc.plainPassword);
                            setSelectedSector(acc.sector);
                          }}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[10px] font-bold transition cursor-pointer border border-blue-200"
                          title="تعبئة بيانات الحساب والقطاع تلقائياً"
                        >
                          استخدام ←
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
          <span>نظام تأمين البيانات والتحكم بالصلاحيات • FTTS Telecom Dashboard</span>
        </div>
      </div>
    </div>
  );
};
