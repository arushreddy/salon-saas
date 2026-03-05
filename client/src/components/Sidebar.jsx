import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LogOut, X, PanelLeftClose } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ menuItems, title, mobileOpen, onMobileClose, collapsed, onToggleCollapse }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const sidebarContent = (
    <div className="flex flex-col h-full" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)' }}>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
        <div>
          <Link to="/" className="font-display text-xl font-bold text-white">
            Glamour<span className="text-gold">.</span>
          </Link>
          <p className="text-[11px] text-gold/50 mt-0.5 tracking-[0.15em] uppercase">{title}</p>
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-gold transition-all"
          >
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onMobileClose}
              className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 group ${
                isActive
                  ? 'text-gold'
                  : 'text-white/40 hover:text-white/80'
              }`}
              style={isActive ? { background: 'linear-gradient(135deg, rgba(201,169,110,0.15) 0%, rgba(201,169,110,0.05) 100%)' } : {}}
            >
              {isActive && (
                <motion.div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                  style={{ background: 'linear-gradient(180deg, #C9A96E, #D4BC8B)' }}
                  layoutId="activeTab"
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                />
              )}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                isActive
                  ? 'bg-gold/20 shadow-[0_0_15px_rgba(201,169,110,0.15)]'
                  : 'bg-white/5 group-hover:bg-white/10'
              }`}>
                <Icon size={16} className={isActive ? 'text-gold' : 'text-white/50 group-hover:text-white/80'} />
              </div>
              <span>{item.label}</span>
              {isActive && (
                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_8px_rgba(201,169,110,0.5)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info + Logout */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-3 mb-2 rounded-xl bg-white/[0.03]">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #C9A96E 0%, #A8893E 100%)' }}
          >
            <span className="text-white font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-[11px] text-gold/40 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-4 py-2 rounded-xl text-sm text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300"
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {!collapsed && (
          <motion.aside
            className="hidden lg:flex w-64 h-screen flex-col fixed left-0 top-0 z-40 overflow-hidden"
            style={{ boxShadow: '4px 0 30px rgba(0,0,0,0.15)' }}
            initial={{ x: -256 }}
            animate={{ x: 0 }}
            exit={{ x: -256 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
            />
            <motion.aside
              className="fixed left-0 top-0 w-72 h-screen z-50 lg:hidden flex flex-col overflow-hidden"
              style={{ boxShadow: '4px 0 40px rgba(0,0,0,0.3)' }}
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <button
                onClick={onMobileClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 text-white/50 hover:text-white z-10"
              >
                <X size={18} />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;