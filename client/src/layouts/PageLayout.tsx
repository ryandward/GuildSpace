import { Outlet } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import PresenceSidebar from '../components/PresenceSidebar';
import BottomTabs from '../components/BottomTabs';

export default function PageLayout() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden grain-overlay">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden relative z-0">
        <PresenceSidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Outlet />
        </div>
      </div>
      <BottomTabs />
    </div>
  );
}
