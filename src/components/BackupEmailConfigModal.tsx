// src/components/BackupEmailConfigModal.tsx
// Modal to configure email credentials (Gmail App Password or Resend API Key)
// for sending backups immediately to Elsoltanalex@gmail.com

import React, { useState, useEffect } from 'react';
import { Mail, Key, ShieldCheck, CheckCircle2, AlertCircle, X, ExternalLink, Send, Loader2 } from 'lucide-react';

interface BackupEmailConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendWithCredentials: (creds: { gmailAppPassword?: string; resendApiKey?: string }) => Promise<void>;
  isSending: boolean;
  targetEmail?: string;
}

export const BackupEmailConfigModal: React.FC<BackupEmailConfigModalProps> = ({
  isOpen,
  onClose,
  onSendWithCredentials,
  isSending,
  targetEmail = 'Elsoltanalex@gmail.com',
}) => {
  const [gmailAppPassword, setGmailAppPassword] = useState('');
  const [resendApiKey, setResendApiKey] = useState('');
  const [activeTab, setActiveTab] = useState<'gmail' | 'resend'>('gmail');
  const [saveLocally, setSaveLocally] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const savedGmail = localStorage.getItem('ftts_backup_gmail_pass') || '';
      const savedResend = localStorage.getItem('ftts_backup_resend_key') || '';
      if (savedGmail) setGmailAppPassword(savedGmail);
      if (savedResend) setResendApiKey(savedResend);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveLocally) {
      if (gmailAppPassword.trim()) {
        localStorage.setItem('ftts_backup_gmail_pass', gmailAppPassword.trim());
      }
      if (resendApiKey.trim()) {
        localStorage.setItem('ftts_backup_resend_key', resendApiKey.trim());
      }
    }
    await onSendWithCredentials({
      gmailAppPassword: gmailAppPassword.trim() || undefined,
      resendApiKey: resendApiKey.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-sky-300">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">إعدادات إرسال النسخة الاحتياطية</h3>
              <p className="text-xs text-sky-200/80">ربط خادم البريد للإرسال الفوري لـ {targetEmail}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {/* Target Info */}
          <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-600" />
              <span className="text-xs font-bold text-slate-700">البريد المستلم المعتمد:</span>
            </div>
            <span className="text-xs font-mono font-bold text-sky-700 bg-white px-2.5 py-1 rounded-lg border border-sky-300 dir-ltr">
              {targetEmail}
            </span>
          </div>

          {/* Provider Selection Tabs */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('gmail')}
              className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'gmail'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📧 كلمة مرور Gmail App</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-full">الموصى به</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('resend')}
              className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'resend'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>⚡ مفتاح Resend API</span>
            </button>
          </div>

          {/* Tab 1: Gmail App Password */}
          {activeTab === 'gmail' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  كلمة مرور تطبيقات Google (Google App Password) المكونة من 16 حرفاً:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={gmailAppPassword}
                    onChange={(e) => setGmailAppPassword(e.target.value)}
                    placeholder="xxxx xxxx xxxx xxxx"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono dir-ltr focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Step-by-step guidance */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5 leading-relaxed">
                <div className="font-bold flex items-center gap-1 text-amber-950">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>كيف تحصل على كلمة مرور التطبيقات في 30 ثانية؟</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-800 pr-1">
                  <li>
                    ادخل إلى صفحة: {' '}
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 underline font-bold inline-flex items-center gap-0.5 dir-ltr"
                    >
                      myaccount.google.com/apppasswords
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>اكتب أي اسم (مثلاً: <strong>FTTS Backup</strong>) واضغط <strong>إنشاء (Create)</strong>.</li>
                  <li>انسخ الرمز الأصفر المكون من 16 حرفاً وضعه في الحقل أعلاه.</li>
                </ol>
              </div>
            </div>
          )}

          {/* Tab 2: Resend API */}
          {activeTab === 'resend' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  مفتاح Resend API Key (يبدأ بـ re_...):
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={resendApiKey}
                    onChange={(e) => setResendApiKey(e.target.value)}
                    placeholder="re_xxxxxxxxxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono dir-ltr focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                <p>
                  يمكنك الحصول على مفتاح مجاني فوراً (3000 إيميل شهرياً) من موقع:{' '}
                  <a
                    href="https://resend.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 underline font-bold inline-flex items-center gap-0.5 dir-ltr"
                  >
                    resend.com/api-keys
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
            </div>
          )}

          {/* Option to remember */}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 select-none">
            <input
              type="checkbox"
              checked={saveLocally}
              onChange={(e) => setSaveLocally(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <span>حفظ المفتاح في هذا المتصفح لعدم طلبه مجدداً في المرات القادمة</span>
          </label>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSending || (activeTab === 'gmail' && !gmailAppPassword.trim()) || (activeTab === 'resend' && !resendApiKey.trim())}
              className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 rounded-xl transition shadow-md hover:shadow-emerald-500/25 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>جارِ الإرسال...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-emerald-200" />
                  <span>إرسال النسخة الاحتياطية الآن 🚀</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
