import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface Props {
  children: ReactNode;
  onClose?: () => void;
  title?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ModalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Modal ErrorBoundary caught an error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-white relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-3 text-red-400">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">
                    {this.props.title || 'تعذر عرض بيانات الموقع'}
                  </h3>
                  <p className="text-xs text-slate-400">حدث خطأ داخلي أثناء فتح نافذة التعديل أو العرض</p>
                </div>
              </div>
              {this.props.onClose && (
                <button
                  onClick={this.props.onClose}
                  className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
                  title="إغلاق النافذة"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 mb-6">
              <p className="text-xs font-mono text-red-300 break-words line-clamp-3">
                {this.state.error?.message || 'خطأ غير معروف في قراءة الحقول'}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                تم احتواء الخطأ بأمان داخل النافذة حتى لا تتأثر الصفحة الرئيسية أو ينهار التطبيق.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                إعادة المحاولة
              </button>
              {this.props.onClose && (
                <button
                  onClick={this.props.onClose}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors shadow-lg shadow-red-600/20"
                >
                  إغلاق النافذة
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
