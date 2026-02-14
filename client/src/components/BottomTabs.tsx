import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSlidingIndicator } from '../hooks/useSlidingIndicator';

const tabs = [
  {
    to: '/roster',
    label: 'Roster',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="6" r="2.5" />
        <path d="M2.5 16v-1a4 4 0 0 1 4-4h1a4 4 0 0 1 4 4v1" />
        <circle cx="14" cy="7" r="2" />
        <path d="M14.5 11.5a3.5 3.5 0 0 1 3 3.5v1" />
      </svg>
    ),
  },
  {
    to: '/raids',
    label: 'Raids',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2l2 5h5l-4 3.5 1.5 5L10 13l-4.5 2.5L7 10.5 3 7h5z" />
      </svg>
    ),
  },
  {
    to: '/bank',
    label: 'Bank',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="8" width="14" height="9" rx="1.5" />
        <path d="M6 8V6a4 4 0 0 1 8 0v2" />
        <circle cx="10" cy="12.5" r="1.5" />
      </svg>
    ),
  },
  {
    to: '/chat',
    label: 'Chat',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7l-4 3V6a2 2 0 0 1 2-2z" />
        <path d="M7 9h6" />
        <path d="M7 12h4" />
      </svg>
    ),
  },
];

export default function BottomTabs() {
  const { isDemo } = useAuth();
  const { ref: navRef, style: indicatorStyle } = useSlidingIndicator<HTMLElement>();
  const visibleTabs = isDemo ? tabs.filter(t => t.to !== '/chat') : tabs;

  return (
    <nav ref={navRef} className="fixed bottom-0 inset-x-0 z-dropdown bg-surface border-t border-border flex md:hidden relative">
      {visibleTabs.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-1.5 no-underline transition-colors duration-fast ${
              isActive ? 'text-accent' : 'text-text-dim hover:text-text'
            }`
          }
        >
          {icon}
          <span className="text-micro font-medium tracking-wide">{label}</span>
        </NavLink>
      ))}
      {indicatorStyle && (
        <span
          className="absolute top-0 h-px bg-accent pointer-events-none"
          style={indicatorStyle}
        />
      )}
    </nav>
  );
}
