import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import RosterPage from './pages/RosterPage';
import MemberDetailPage from './pages/MemberDetailPage';
import AppShell from './layouts/AppShell';
import RaidsPage from './pages/RaidsPage';
import RaidEventPage from './pages/RaidEventPage';
import BottomTabs from './components/BottomTabs';

export default function App() {
  const { loading, token, user, needsSetup } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1">
        <p className="text-text-dim font-body">Loading...</p>
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
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/roster" replace />} />
        <Route path="/roster" element={<RosterPage />} />
        <Route path="/roster/:discordId" element={<MemberDetailPage />} />
        <Route path="/raids" element={<RaidsPage />} />
        <Route path="/raids/:eventId" element={<RaidEventPage />} />
        <Route path="/terminal" element={<AppShell />} />
        <Route path="*" element={<Navigate to="/roster" replace />} />
      </Routes>
      <BottomTabs />
    </>
  );
}
