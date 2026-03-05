import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { Menu } from 'lucide-react';
import {
  LayoutDashboard,
  Calendar,
  Clock,
  User,
} from 'lucide-react';

const staffMenu = [
  { label: 'Dashboard', path: '/staff', icon: LayoutDashboard },
  { label: 'My Schedule', path: '/staff/schedule', icon: Calendar },
  { label: 'Appointments', path: '/staff/appointments', icon: Clock },
  { label: 'Profile', path: '/staff/profile', icon: User },
];

const StaffLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-cream">
      <Sidebar
        menuItems={staffMenu}
        title="Staff Panel"
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      <div
         className={`min-h-screen transition-all duration-300 ${collapsed ? 'lg:ml-0' : 'lg:ml-64'}`}
            onClick={() => { if (!collapsed) setCollapsed(true); }}
        >
        <header className="sticky top-0 z-30 bg-cream/80 backdrop-blur-lg border-b border-gold/10 px-6 h-14 flex items-center">
          <button
            onClick={() => {
              if (window.innerWidth >= 1024) {
                setCollapsed(!collapsed);
              } else {
                setMobileOpen(true);
              }
            }}
            className="p-2 -ml-2 text-charcoal hover:text-gold transition-colors"
          >
            <Menu size={22} />
          </button>
        </header>

        <main className="p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StaffLayout;