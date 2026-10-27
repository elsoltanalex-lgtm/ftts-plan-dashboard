import { Dashboard } from './pages/Dashboard';
import { AuthProvider } from './context/AuthContext';

export function App() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}

export default App;
