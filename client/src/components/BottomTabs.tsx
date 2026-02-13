import { NavLink } from 'react-router-dom';

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
    to: '/terminal',
    label: 'Terminal',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="16" height="14" rx="2" />
        <path d="M5.5 8l3 2-3 2" />
        <path d="M10.5 12h4" />
      </svg>
    ),
  },
];

export default function BottomTabs() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-dropdown bg-surface border-t border-border flex md:hidden">
      {tabs.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-1.5 no-underline transition-colors duration-fast ${
              isActive
                ? 'text-accent border-t-2 border-accent -mt-px'
                : 'text-text-dim hover:text-text'
            }`
          }
        >
          {icon}
          <span className="text-micro font-medium tracking-wide">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
