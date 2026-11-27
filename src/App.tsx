import { Dashboard } from './pages/Dashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginScreen } from './components/LoginScreen';

function ProtectedApp() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-sans" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-300">جارِ التحقق من الجلسة...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <Dashboard />;
}

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ProtectedApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
