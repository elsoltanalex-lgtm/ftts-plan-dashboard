// src/components/ActivitySessionsModal.tsx
// Admin-only Real-Time "سجل النشاط والجلسات" (Activity & Sessions Log)
// Features Supabase Realtime + 10s auto-refresh, Per-User Multi-Visit Summary cards,
// Per-Visit expandable edits breakdown, filters, and Excel export

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { supabaseFallback } from '../lib/supabase';
import {
  fetchUserSessions,
  fetchActivityLogs,
  formatSessionDuration,
  formatDurationSeconds,
  computeDurationSeconds,
  type UserSessionRecord,
  type ActivityLogRecord,
} from '../utils/auditService';
import { SYNC_SESSIONS_ID, SYNC_ACTIVITY_LOGS_ID } from '../utils/deletedSitesSync';
import {
  X,
  Activity,
  Clock,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Cloud,
  HardDrive,
  Filter,
  UserCheck,
  History,
  ChevronDown,
  ChevronUp,
  LogIn,
  Edit3,
} from 'lucide-react';

type DatePreset = 'all' | 'today' | 'yesterday' | 'custom';

function toLocalYMD(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateTimeAr(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const ACTION_BADGE: Record<string, string> = {
  'إضافة موقع': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'تعديل موقع': 'bg-blue-100 text-blue-800 border-blue-300',
  'حذف موقع': 'bg-rose-100 text-rose-800 border-rose-300',
  'حذف جماعي': 'bg-red-100 text-red-900 border-red-300',
  'تصدير بيانات': 'bg-purple-100 text-purple-800 border-purple-300',
};

export const ActivitySessionsModal: React.FC = () => {
  const { isAdmin, isAuditLogOpen, closeAuditLog } = useAuth();

  const [activeTab, setActiveTab] = useState<'sessions' | 'activity'>('sessions');
  const [sessions, setSessions] = useState<UserSessionRecord[]>([]);
  const [logs, setLogs] = useState<ActivityLogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [cloudSynced, setCloudSynced] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Filters
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [customDate, setCustomDate] = useState(() => toLocalYMD(new Date()));
  const [selectedUser, setSelectedUser] = useState('ALL');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [sessRes, logsRes] = await Promise.all([fetchUserSessions(), fetchActivityLogs()]);
      setSessions(sessRes.records);
      setLogs(logsRes.records);
      setCloudSynced(sessRes.cloudSynced || logsRes.cloudSynced);
      setLastRefreshedAt(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Real-time Supabase subscriptions + 10-second live auto-refresh while Admin is viewing
  useEffect(() => {
    if (!isAuditLogOpen || !isAdmin) return;
    loadData(false);

    const interval = window.setInterval(() => {
      loadData(true);
    }, 10_000);

    const channel = supabaseFallback
      .channel('audit_sessions_live_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_sessions' }, () => {
        loadData(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => {
        loadData(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'we_records' }, (payload) => {
        const row = (payload.new || payload.old) as any;
        if (row && (row.id === SYNC_SESSIONS_ID || row.id === SYNC_ACTIVITY_LOGS_ID)) {
          loadData(true);
        }
      })
      .subscribe();

    return () => {
      window.clearInterval(interval);
      supabaseFallback.removeChannel(channel);
    };
  }, [isAuditLogOpen, isAdmin, loadData]);

  const todayYmd = useMemo(() => toLocalYMD(new Date()), []);
  const yesterdayYmd = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toLocalYMD(d);
  }, []);

  const matchesDateFilter = useCallback(
    (iso: string): boolean => {
      if (datePreset === 'all') return true;
      const ymd = toLocalYMD(iso);
      if (datePreset === 'today') return ymd === todayYmd;
      if (datePreset === 'yesterday') return ymd === yesterdayYmd;
      if (datePreset === 'custom') return !customDate || ymd === customDate;
      return true;
    },
    [datePreset, customDate, todayYmd, yesterdayYmd]
  );

  const uniqueUsers = useMemo(() => {
    const map = new Map<string, string>();
    sessions.forEach((s) => map.set(s.username, s.user_name));
    logs.forEach((l) => map.set(l.username, l.user_name));
    return Array.from(map.entries()).map(([username, user_name]) => ({ username, user_name }));
  }, [sessions, logs]);

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sessions.filter((s) => {
      if (!matchesDateFilter(s.login_at)) return false;
      if (selectedUser !== 'ALL' && s.username !== selectedUser) return false;
      if (q && !s.user_name.toLowerCase().includes(q) && !s.username.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [sessions, matchesDateFilter, selectedUser, searchQuery]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return logs.filter((l) => {
      if (!matchesDateFilter(l.created_at)) return false;
      if (selectedUser !== 'ALL' && l.username !== selectedUser) return false;
      if (selectedModule !== 'ALL' && l.module !== selectedModule) return false;
      if (
        q &&
        !l.user_name.toLowerCase().includes(q) &&
        !l.username.toLowerCase().includes(q) &&
        !l.site_code.toLowerCase().includes(q) &&
        !l.details.toLowerCase().includes(q) &&
        !l.action_type.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [logs, matchesDateFilter, selectedUser, selectedModule, searchQuery]);

  // Match activity logs belonging to a specific visit/session
  const getLogsForSession = useCallback(
    (s: UserSessionRecord): ActivityLogRecord[] => {
      const startMs = new Date(s.login_at).getTime();
      const endMs = s.is_active ? Date.now() : new Date(s.logout_at || s.last_active_at).getTime() + 5000;
      return logs.filter((l) => {
        if (l.session_id && l.session_id === s.id) return true;
        if (!l.session_id && l.username === s.username) {
          const t = new Date(l.created_at).getTime();
          return t >= startMs - 2000 && t <= endMs;
        }
        return false;
      });
    },
    [logs]
  );

  // Per-User Multi-Visit Summary for the currently selected date filter
  const perUserSummary = useMemo(() => {
    const map = new Map<
      string,
      { username: string; userName: string; visits: number; totalSeconds: number; edits: number; online: boolean }
    >();

    for (const s of filteredSessions) {
      const key = s.username;
      const cur = map.get(key) || {
        username: s.username,
        userName: s.user_name,
        visits: 0,
        totalSeconds: 0,
        edits: 0,
        online: false,
      };
      cur.visits += 1;
      cur.totalSeconds +=
        typeof s.duration_seconds === 'number' && s.duration_seconds > 0
          ? s.duration_seconds
          : computeDurationSeconds(s.login_at, s.is_active ? null : s.logout_at || s.last_active_at);
      if (s.is_active) cur.online = true;
      map.set(key, cur);
    }

    for (const l of filteredLogs) {
      const key = l.username;
      const cur = map.get(key) || {
        username: l.username,
        userName: l.user_name,
        visits: 0,
        totalSeconds: 0,
        edits: 0,
        online: false,
      };
      cur.edits += 1;
      map.set(key, cur);
    }

    return Array.from(map.values()).sort((a, b) => b.visits - a.visits || b.edits - a.edits);
  }, [filteredSessions, filteredLogs]);

  const handleExportActivityExcel = () => {
    const rows = filteredLogs.map((l, idx) => ({
      'مسلسل': idx + 1,
      'التاريخ والوقت': formatDateTimeAr(l.created_at),
      'المستخدم': l.user_name,
      'اسم الدخول': l.username,
      'نوع العملية': l.action_type,
      'القسم / المشغل': l.module,
      'كود الموقع': l.site_code,
      'تفاصيل التغيير': l.details,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!views'] = [{ rightToLeft: true }];
    ws['!cols'] = [
      { wch: 8 },
      { wch: 22 },
      { wch: 24 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 60 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'سجل_التعديلات');
    XLSX.writeFile(wb, `FTTS_Activity_Log_${toLocalYMD(new Date())}.xlsx`);
  };

  if (!isAuditLogOpen || !isAdmin) return null;

  const onlineCount = sessions.filter((s) => s.is_active).length;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
      dir="rtl"
    >
      <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-5 py-4 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/25 border border-sky-400/40 flex items-center justify-center">
              <Activity className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2 flex-wrap">
                <span>سجل النشاط والجلسات المباشر</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  متصل الآن: {onlineCount}
                </span>
              </h2>
              <p className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
                {cloudSynced ? (
                  <span className="inline-flex items-center gap-1 text-emerald-300">
                    <Cloud className="w-3.5 h-3.5" /> بث مباشر مع Supabase (تحديث تلقائي كل 10 ثوانٍ)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-300">
                    <HardDrive className="w-3.5 h-3.5" /> تسجيل محلي فوري نشط
                  </span>
                )}
                {lastRefreshedAt && (
                  <span className="text-slate-400 font-mono text-[10px]">
                    • آخر تحديث: {lastRefreshedAt}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(false)}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-sky-600/80 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer transition flex items-center gap-1.5"
              title="تحديث فوري الآن"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>تحديث فوري</span>
            </button>
            <button
              type="button"
              onClick={closeAuditLog}
              className="p-2 rounded-lg bg-white/10 hover:bg-rose-500/80 text-white cursor-pointer transition"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('sessions')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-extrabold rounded-t-xl border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'sessions'
                  ? 'border-blue-600 text-blue-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>سجل الجلسات والحضور</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                {filteredSessions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-extrabold rounded-t-xl border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'activity'
                  ? 'border-indigo-600 text-indigo-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span>سجل التعديلات والحركات</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                {filteredLogs.length}
              </span>
            </button>
          </div>

          {activeTab === 'activity' && (
            <button
              type="button"
              onClick={handleExportActivityExcel}
              disabled={filteredLogs.length === 0}
              className="mb-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>تصدير إلى Excel</span>
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="px-5 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center gap-2.5 text-xs shrink-0">
          <div className="flex items-center gap-1 text-slate-500 font-bold">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>الفترة:</span>
          </div>
          {(['today', 'yesterday', 'all', 'custom'] as DatePreset[]).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setDatePreset(preset)}
              className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${
                datePreset === preset
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {preset === 'all' ? 'الكل' : preset === 'today' ? 'اليوم' : preset === 'yesterday' ? 'أمس' : 'تاريخ مخصص'}
            </button>
          ))}

          {datePreset === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 font-mono text-slate-800 outline-none"
            />
          )}

          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">جميع المستخدمين</option>
            {uniqueUsers.map((u) => (
              <option key={u.username} value={u.username}>
                {u.user_name} ({u.username})
              </option>
            ))}
          </select>

          {activeTab === 'activity' && (
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">جميع الأقسام والمشغلين</option>
              <option value="WE">WE</option>
              <option value="Vodafone">Vodafone</option>
              <option value="Orange">Orange</option>
              <option value="الإتاحة">الإتاحة</option>
              <option value="التحول الرقمي">التحول الرقمي</option>
              <option value="النظام">النظام</option>
            </select>
          )}

          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بكود الموقع، المستخدم، أو التفاصيل..."
              className="w-full pr-8 pl-3 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Per-User Multi-Visit Summary Cards */}
          {perUserSummary.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {perUserSummary.map((u) => (
                <div
                  key={u.username}
                  onClick={() => setSelectedUser(selectedUser === u.username ? 'ALL' : u.username)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                    selectedUser === u.username
                      ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-500/20'
                      : 'bg-slate-50/80 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-800 truncate">{u.userName}</div>
                      <div className="text-[10px] font-mono text-slate-400">{u.username}</div>
                    </div>
                    {u.online ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        متصل الآن
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 text-slate-600 shrink-0">
                        غير متصل
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
                    <div className="bg-white rounded-xl p-1.5 border border-slate-200/80">
                      <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-0.5">
                        <LogIn className="w-3 h-3 text-blue-500" /> الدخول
                      </div>
                      <div className="font-mono font-black text-slate-800">{u.visits} مرة</div>
                    </div>
                    <div className="bg-white rounded-xl p-1.5 border border-slate-200/80">
                      <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-0.5">
                        <Clock className="w-3 h-3 text-indigo-500" /> التواجد
                      </div>
                      <div className="font-bold text-indigo-700 truncate">{formatDurationSeconds(u.totalSeconds)}</div>
                    </div>
                    <div className="bg-white rounded-xl p-1.5 border border-slate-200/80">
                      <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-0.5">
                        <Edit3 className="w-3 h-3 text-emerald-500" /> التعديلات
                      </div>
                      <div className="font-mono font-black text-emerald-700">{u.edits}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'sessions' ? (
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-2.5">المستخدم</th>
                      <th className="px-3.5 py-2.5">وقت الدخول</th>
                      <th className="px-3.5 py-2.5">وقت الخروج / آخر نشاط</th>
                      <th className="px-3.5 py-2.5">مدة الزيارة</th>
                      <th className="px-3.5 py-2.5 text-center">الحالة</th>
                      <th className="px-3.5 py-2.5 text-center">تعديلات الزيارة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSessions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-400 font-bold">
                          لا توجد زيارات أو جلسات مسجلة في النطاق المحدد
                        </td>
                      </tr>
                    ) : (
                      filteredSessions.map((s) => {
                        const visitLogs = getLogsForSession(s);
                        const isExpanded = expandedSessionId === s.id;
                        return (
                          <React.Fragment key={s.id}>
                            <tr className="bg-white hover:bg-slate-50/80">
                              <td className="px-3.5 py-2.5">
                                <div className="font-bold text-slate-800">{s.user_name}</div>
                                <div className="text-[10px] font-mono text-slate-400">{s.username}</div>
                              </td>
                              <td className="px-3.5 py-2.5 font-mono text-slate-700 whitespace-nowrap">
                                {formatDateTimeAr(s.login_at)}
                              </td>
                              <td className="px-3.5 py-2.5 font-mono text-slate-700 whitespace-nowrap">
                                {formatDateTimeAr(s.logout_at || s.last_active_at)}
                              </td>
                              <td className="px-3.5 py-2.5 font-bold text-slate-800 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                                  {formatSessionDuration(s.login_at, s.logout_at || s.last_active_at, s.duration_seconds)}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                                {s.is_active ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    متصل الآن
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                    منتهية
                                  </span>
                                )}
                              </td>
                              <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                                {visitLogs.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedSessionId(isExpanded ? null : s.id)}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
                                  >
                                    <span>{visitLogs.length} تعديل</span>
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-400">تصفح فقط</span>
                                )}
                              </td>
                            </tr>

                            {isExpanded && visitLogs.length > 0 && (
                              <tr className="bg-indigo-50/40">
                                <td colSpan={6} className="px-4 py-3">
                                  <div className="bg-white rounded-xl border border-indigo-200 p-3 space-y-2">
                                    <div className="text-[11px] font-extrabold text-indigo-900">
                                      التعديلات والحركات المسجلة خلال هذه الزيارة ({visitLogs.length}):
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                      {visitLogs.map((vl) => (
                                        <div key={vl.id} className="py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span
                                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                ACTION_BADGE[vl.action_type] || 'bg-slate-100 text-slate-700 border-slate-200'
                                              }`}
                                            >
                                              {vl.action_type}
                                            </span>
                                            <span className="font-bold text-slate-700">{vl.module}</span>
                                            <span className="font-mono font-bold text-indigo-700">{vl.site_code}</span>
                                            <span className="text-slate-600">{vl.details}</span>
                                          </div>
                                          <span className="font-mono text-[10px] text-slate-400">
                                            {formatDateTimeAr(vl.created_at)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5">التاريخ والوقت</th>
                      <th className="px-3 py-2.5">المستخدم</th>
                      <th className="px-3 py-2.5">نوع العملية</th>
                      <th className="px-3 py-2.5">القسم / المشغل</th>
                      <th className="px-3 py-2.5">كود الموقع</th>
                      <th className="px-3 py-2.5">تفاصيل التغيير</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-400 font-bold">
                          لا توجد تعديلات أو حركات مسجلة في النطاق المحدد
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((l) => (
                        <tr key={l.id} className="bg-white hover:bg-slate-50/80">
                          <td className="px-3 py-2.5 font-mono text-slate-600 whitespace-nowrap">
                            {formatDateTimeAr(l.created_at)}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="font-bold text-slate-800">{l.user_name}</div>
                            <div className="text-[10px] font-mono text-slate-400">{l.username}</div>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                ACTION_BADGE[l.action_type] || 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {l.action_type}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-bold text-slate-700 whitespace-nowrap">
                            {l.module}
                          </td>
                          <td className="px-3 py-2.5 font-mono font-bold text-indigo-700 whitespace-nowrap">
                            {l.site_code}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700 max-w-md break-words">
                            {l.details}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
