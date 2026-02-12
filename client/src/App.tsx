import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import RosterPage from './pages/RosterPage';
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

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/roster" replace />} />
      <Route path="/roster" element={<RosterPage />} />
      <Route path="/terminal" element={<AppShell />} />
      <Route path="*" element={<Navigate to="/roster" replace />} />
    </Routes>
  );
}
