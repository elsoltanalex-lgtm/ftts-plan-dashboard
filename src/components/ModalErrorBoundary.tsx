import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface Props {
  children: ReactNode;
  onClose?: () => void;
  title?: string;
  isOpen?: boolean;
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

  public componentDidUpdate(prevProps: Props) {
    // If the modal was closed and reopened, automatically reset error state so user can try again cleanly
    if (this.props.isOpen && !prevProps.isOpen) {
      if (this.state.hasError) {
        this.setState({ hasError: false, error: null });
      }
    }
    // If the modal was closed, reset error state
    if (!this.props.isOpen && prevProps.isOpen) {
      if (this.state.hasError) {
        this.setState({ hasError: false, error: null });
      }
    }
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public handleClose = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onClose) {
      this.props.onClose();
    }
  };

  public render() {
    // If modal is explicitly marked as not open, never render anything (not even error box)
    if (this.props.isOpen === false) {
      return null;
    }

    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-white relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-3 text-amber-400">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">
                    {this.props.title || 'تنبيه في بيانات الموقع'}
                  </h3>
                  <p className="text-xs text-slate-400">حدث تنبيه أثناء قراءة بعض الحقول</p>
                </div>
              </div>
              <button
                type="button"
                onClick={this.handleClose}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="إغلاق النافذة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 mb-6">
              <p className="text-xs font-mono text-amber-300 break-words line-clamp-3">
                {this.state.error?.message || 'تم احتواء القيمة غير المعرفة بأمان'}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                تم احتواء التنبيه محلياً لحماية الصفحة واستمرار عمل التطبيق دون تجميد.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                إعادة المحاولة
              </button>
              <button
                type="button"
                onClick={this.handleClose}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-600/20 cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
