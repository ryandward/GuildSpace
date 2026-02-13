import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import RosterPage from './pages/RosterPage';
import AppShell from './layouts/AppShell';

function SvgDefs() {
  return (
    <svg style={{ position: 'fixed', width: 0, height: 0 }} aria-hidden="true">
      <defs>
        <filter id="organic-hover" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02 0.5"
            numOctaves={2}
            seed={42}
            result="noise"
          >
            <animate
              attributeName="baseFrequency"
              dur="4s"
              values="0.02 0.5;0.025 0.45;0.015 0.55;0.02 0.5"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={3}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}

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
    return <><SvgDefs /><LoginPage /></>;
  }

  if (needsSetup) {
    return <><SvgDefs /><SetupPage /></>;
  }

  if (!user) {
    return <><SvgDefs /><LoginPage /></>;
  }

  return (
    <>
      <SvgDefs />
      <Routes>
        <Route path="/" element={<Navigate to="/roster" replace />} />
        <Route path="/roster" element={<RosterPage />} />
        <Route path="/terminal" element={<AppShell />} />
        <Route path="*" element={<Navigate to="/roster" replace />} />
      </Routes>
    </>
  );
}
