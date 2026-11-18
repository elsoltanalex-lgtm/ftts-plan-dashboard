import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home, CheckCircle2 } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isReloading: boolean;
  clearedCache: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isReloading: false,
    clearedCache: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isReloading: false, clearedCache: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  // Safe cache clearing utility
  private clearTransientState = () => {
    try {
      // Clear session storage completely
      sessionStorage.clear();

      // Clear specific corrupted or transient keys
      const keysToClear = [
        'ftts_deleted_site_codes_v1',
        'we_master_records_cache_v1',
        'orange_ftts_records_v3_480',
        'vodafone_ftts_records_v3_699',
        'availability_etaha_records_v4_360',
      ];
      keysToClear.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch {
          // ignore
        }
      });
    } catch (e) {
      console.warn('Error clearing transient state:', e);
    }
  };

  // Immediate clean reload & cache flush
  private handleReload = () => {
    this.setState({ isReloading: true });
    this.clearTransientState();

    // Reset error state and hard-navigate to clean root URL
    setTimeout(() => {
      try {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.location.replace(cleanUrl);
      } catch {
        window.location.reload();
      }
    }, 150);
  };

  // Comprehensive reset (clears entire local state if persistent loop occurs)
  private handleFullReset = () => {
    this.setState({ isReloading: true, clearedCache: true });
    try {
      sessionStorage.clear();
      // Keep only admin auth if possible, or clear all
      const auth = localStorage.getItem('ftts_auth_user');
      localStorage.clear();
      if (auth) {
        localStorage.setItem('ftts_auth_user', auth);
      }
    } catch {
      // ignore
    }

    setTimeout(() => {
      window.location.replace('/');
    }, 250);
  };

  // In-place retry without page reload
  private handleRetryInPlace = () => {
    this.setState({ hasError: false, error: null, isReloading: false });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-white text-right font-sans" dir="rtl">
          <div className="bg-slate-800 border border-rose-500/40 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {this.props.fallbackTitle || 'حدث خطأ أثناء عرض البيانات'}
                </h2>
                <p className="text-xs text-rose-300">تم احتواء الخطأ بأمان لحماية بياناتك ومنع التوقف</p>
              </div>
            </div>

            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-700/60 font-mono text-xs text-slate-300 break-words max-h-32 overflow-y-auto">
              <p className="text-rose-300 font-semibold mb-1">تفاصيل الخطأ:</p>
              {this.state.error?.message || 'خطأ غير معروف في قراءة السجلات'}
            </div>

            {this.state.clearedCache && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>تم مسح الذاكرة المؤقتة بنجاح، جاري إعادة توجيه الصفحة...</span>
              </div>
            )}

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={this.handleReload}
                disabled={this.state.isReloading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-98"
              >
                <RefreshCw className={`w-4 h-4 ${this.state.isReloading ? 'animate-spin' : ''}`} />
                <span>{this.state.isReloading ? 'جاري التحديث والتوجيه...' : 'إعادة تحميل لوحة التحكم وتحديث الصفحة'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={this.handleRetryInPlace}
                  disabled={this.state.isReloading}
                  className="flex-1 py-2 px-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>محاولة الاستعادة فوراً</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleFullReset}
                  disabled={this.state.isReloading}
                  className="flex-1 py-2 px-3 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 hover:text-white disabled:opacity-50 text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5"
                  title="مسح الكاش المؤقت وإعادة التحميل النظيف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>مسح الكاش وإعادة التشغيل</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
