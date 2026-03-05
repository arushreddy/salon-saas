import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { 
  Menu,
  LayoutDashboard,
  Calendar,
  Scissors,
  UserCog,
  Users,
  CreditCard,
  BarChart3,
  Package,    
  FileText,   
  Tag,        
  Settings 
} from 'lucide-react';

const adminMenu = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Appointments', path: '/admin/appointments', icon: Calendar },
  { label: 'Services', path: '/admin/services', icon: Scissors },
  { label: 'Staff', path: '/admin/staff', icon: UserCog },
  { label: 'Customers', path: '/admin/customers', icon: Users },
  { label: 'Payments', path: '/admin/payments', icon: CreditCard },
  { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
  { label: 'Inventory', path: '/admin/inventory', icon: Package },
  { label: 'Invoices', path: '/admin/invoices', icon: FileText },
  { label: 'Coupons', path: '/admin/coupons', icon: Tag },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
];

const AdminLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-cream">
      <Sidebar
        menuItems={adminMenu}
        title="Admin Panel"
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Main content wrapper with your touch-to-close logic restored */}
      <div
        className={`min-h-screen transition-all duration-300 ${
          collapsed ? 'lg:ml-0' : 'lg:ml-64'
        }`}
        onClick={() => { 
          // This closes the sidebar if it's currently open/expanded when you touch the screen
          if (!collapsed) setCollapsed(true); 
        }}
      >
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-gold/10 px-6 h-14 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevents the parent div onClick from firing immediately
                if (window.innerWidth >= 1024) {
                  setCollapsed(!collapsed);
                } else {
                  setMobileOpen(true);
                }
              }}
              className="p-2 -ml-2 rounded-xl text-charcoal hover:text-gold hover:bg-gold/5 transition-all"
            >
              <Menu size={20} />
            </button>
            <span className="ml-3 font-display font-semibold text-charcoal text-sm">
              {collapsed ? 'Glamour.' : ''}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cream-dark text-xs text-charcoal-muted">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              System Online
            </div>
          </div>
        </header>

        <main className="p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;