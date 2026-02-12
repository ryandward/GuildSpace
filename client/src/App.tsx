import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import AppShell from './layouts/AppShell';

export default function App() {
  const { loading, token, user, needsSetup } = useAuth();

  if (loading) {
    return (
      <div className="login-screen">
        <p style={{ color: 'var(--text-dim)' }}>Loading...</p>
      </div>
    );
  }

  if (!token) {
    return <LoginPage />;
  }

  if (needsSetup) {
    return <SetupPage />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AppShell />;
}
