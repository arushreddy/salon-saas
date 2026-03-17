import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, Building2, Users, Settings, LogOut,
  Shield, PanelLeftClose, Bell, CreditCard, BarChart3,
  GitBranch, MessageSquare, Download, Search, ChevronDown,
  Menu, X, Zap, Globe, Activity, ChevronRight,
} from 'lucide-react';

const C = {
  bg: '#0F0D0B', bgMid: '#171310', bgCard: '#1E1A15',
  border: 'rgba(212,168,75,0.12)', borderHover: 'rgba(212,168,75,0.28)',
  gold: '#D4A84B', goldDim: '#B8892A', goldPale: 'rgba(212,168,75,0.08)',
  goldGlow: 'rgba(212,168,75,0.15)',
  ink: '#FAF6EF', inkMid: '#C8B896', inkMuted: 'rgba(250,246,239,0.40)',
  purple: '#8B5CF6', purplePale: 'rgba(139,92,246,0.12)',
  green: '#34D399', greenPale: 'rgba(52,211,153,0.10)',
  red: '#F87171', redPale: 'rgba(248,113,113,0.10)',
  blue: '#60A5FA', bluePale: 'rgba(96,165,250,0.10)',
  sidebar: '#0A0907',
};

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/superadmin', icon: LayoutDashboard, exact: true },
      { label: 'Analytics', path: '/superadmin/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Salons',     path: '/superadmin/salons',     icon: Building2,    badge: 'salons' },
      { label: 'Plans',      path: '/superadmin/plans',      icon: CreditCard },
      { label: 'Franchises', path: '/superadmin/franchises', icon: GitBranch },
      { label: 'Users',      path: '/superadmin/users',      icon: Users },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'WhatsApp', path: '/superadmin/whatsapp',  icon: MessageSquare, accent: '#34D399' },
      { label: 'Export',   path: '/superadmin/export',    icon: Download },
      { label: 'Security', path: '/superadmin/security',  icon: Shield, accent: '#F87171' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Settings', path: '/superadmin/settings', icon: Settings },
    ],
  },
];

// All nav items flat for mobile bottom bar
const ALL_NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);
const MOBILE_NAV = [
  { label: 'Dashboard', path: '/superadmin',            icon: LayoutDashboard, exact: true },
  { label: 'Salons',    path: '/superadmin/salons',     icon: Building2 },
  { label: 'Plans',     path: '/superadmin/plans',      icon: CreditCard },
  { label: 'Users',     path: '/superadmin/users',      icon: Users },
  { label: 'Settings',  path: '/superadmin/settings',   icon: Settings },
];

const SIDEBAR_W = 220;

const NavItem = ({ item, collapsed, stats, onClose }) => {
  const location = useLocation();
  const isActive = item.exact
    ? location.pathname === item.path
    : location.pathname.startsWith(item.path);
  const Icon = item.icon;
  const accent = item.accent || C.gold;

  return (
    <Link
      to={item.path}
      onClick={onClose}
      title={collapsed ? item.label : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: collapsed ? '10px' : '9px 12px',
        borderRadius: 10, textDecoration: 'none',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: isActive ? `${accent}18` : 'transparent',
        border: isActive ? `1px solid ${accent}30` : '1px solid transparent',
        color: isActive ? accent : C.inkMuted,
        transition: 'all 0.15s',
        position: 'relative',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.background = `${accent}0D`;
          e.currentTarget.style.color = C.ink;
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = C.inkMuted;
        }
      }}
    >
      {isActive && (
        <div style={{
          position: 'absolute', left: 0, top: '25%', bottom: '25%',
          width: 3, borderRadius: 2, background: accent,
        }} />
      )}
      <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
      {!collapsed && (
        <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, letterSpacing: '0.01em' }}>
          {item.label}
        </span>
      )}
      {!collapsed && item.badge && stats?.[item.badge] > 0 && (
        <span style={{
          marginLeft: 'auto', fontSize: 10, fontWeight: 700,
          background: C.goldPale, color: C.gold, border: `1px solid ${C.border}`,
          borderRadius: 20, padding: '1px 6px',
        }}>
          {stats[item.badge]}
        </span>
      )}
    </Link>
  );
};

const SidebarContent = ({ collapsed, onClose, onCollapse, stats }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: C.sidebar, borderRight: `1px solid ${C.border}`,
    }}>
      {/* Brand */}
      <div style={{
        padding: collapsed ? '20px 12px' : '20px 16px',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        minHeight: 64, flexShrink: 0,
      }}>
        {!collapsed && (
          <div>
            <div style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontSize: 20, fontWeight: 300, fontStyle: 'italic', color: C.ink,
            }}>
              Glamour<span style={{ color: C.gold, fontStyle: 'normal', fontWeight: 500 }}>.</span>
            </div>
            <div style={{
              fontSize: 9, fontWeight: 600, letterSpacing: '0.22em',
              textTransform: 'uppercase', color: C.purple, marginTop: 2,
            }}>
              Control Center
            </div>
          </div>
        )}
        {collapsed && (
          <div style={{
            width: 32, height: 32, borderRadius: 9, background: C.goldPale,
            border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 600, color: C.gold,
          }}>G</div>
        )}
        <div style={{ display: 'flex', gap: 4 }}>
          {onCollapse && !collapsed && (
            <button onClick={onCollapse} style={{
              background: 'none', border: `1px solid ${C.border}`, borderRadius: 7,
              padding: 5, cursor: 'pointer', color: C.inkMuted, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <PanelLeftClose size={13} />
            </button>
          )}
          {onClose && (
            <button onClick={onClose} style={{
              background: 'none', border: `1px solid ${C.border}`, borderRadius: 7,
              padding: 5, cursor: 'pointer', color: C.inkMuted, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
        {NAV_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: 8 }}>
            {!collapsed && (
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.18em',
                textTransform: 'uppercase', color: C.inkMuted,
                padding: '8px 12px 4px',
              }}>
                {group.label}
              </div>
            )}
            {group.items.map(item => (
              <NavItem key={item.path} item={item} collapsed={collapsed} stats={stats} onClose={onClose} />
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{
        borderTop: `1px solid ${C.border}`,
        padding: collapsed ? '12px 8px' : '12px',
        flexShrink: 0,
      }}>
        {!collapsed ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 10,
            background: C.goldPale, border: `1px solid ${C.border}`,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: `linear-gradient(135deg, ${C.goldDim}, ${C.gold})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#0F0D0B', flexShrink: 0,
            }}>
              {(user?.name || 'S').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Super Admin'}</div>
              <div style={{ fontSize: 10, color: C.purple, fontWeight: 500 }}>Super Admin</div>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.inkMuted, padding: 4, display: 'flex', borderRadius: 6,
            }} title="Logout">
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <button onClick={() => { logout(); navigate('/login'); }} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: `1px solid ${C.border}`, borderRadius: 9,
            padding: 9, cursor: 'pointer', color: C.inkMuted,
          }} title="Logout">
            <LogOut size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

// Mobile Bottom Nav for superadmin
const SuperAdminMobileNav = () => {
  const location = useLocation();
  return (
    <>
      <style>{`
        .sa-bnav {
          display: none;
          position: fixed;
          bottom: 0; left: 0; right: 0;
          z-index: 60;
          background: rgba(10,9,7,0.97);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(212,168,75,0.15);
          box-shadow: 0 -4px 30px rgba(0,0,0,0.3);
          padding-bottom: env(safe-area-inset-bottom);
        }
        @media (max-width: 1023px) { .sa-bnav { display: flex; } }
        .sa-bnav-inner { display: flex; width: 100%; align-items: stretch; }
        .sa-bnav-item {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 3px; padding: 10px 4px 8px;
          text-decoration: none; color: rgba(250,246,239,0.35);
          transition: color 0.2s; min-height: 56px;
          position: relative; -webkit-tap-highlight-color: transparent;
        }
        .sa-bnav-item.active { color: #D4A84B; }
        .sa-bnav-item.active::before {
          content: ''; position: absolute;
          top: 0; left: 50%; transform: translateX(-50%);
          width: 28px; height: 2px;
          background: linear-gradient(90deg, #D4A84B, #B8892A);
          border-radius: 0 0 4px 4px;
        }
        .sa-bnav-label {
          font-size: 9.5px; font-weight: 500;
          white-space: nowrap; text-align: center;
        }
      `}</style>
      <nav className="sa-bnav">
        <div className="sa-bnav-inner">
          {MOBILE_NAV.map(item => {
            const Icon = item.icon;
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            return (
              <Link key={item.path} to={item.path} className={`sa-bnav-item${isActive ? ' active' : ''}`}>
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.5} />
                <span className="sa-bnav-label">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

const SuperAdminLayout = () => {
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [isDesktop,   setIsDesktop]   = useState(window.innerWidth >= 1024);
  const [stats,       setStats]       = useState({});
  const location = useLocation();

  // Track screen size
  useEffect(() => {
    const update = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bgMid, overflow: 'hidden' }}>
      <style>{`
        @media (max-width: 1023px) {
          .sa-page-content { padding-bottom: calc(72px + env(safe-area-inset-bottom)) !important; }
          .sa-search-full  { display: none !important; }
          .sa-status-badge { display: none !important; }
        }
      `}</style>

      {/* ── Desktop Sidebar ── */}
      {isDesktop && (
        <motion.div
          animate={{ width: collapsed ? 60 : SIDEBAR_W }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          style={{ flexShrink: 0, position: 'relative', zIndex: 10, height: '100vh' }}
        >
          <div style={{ position: 'absolute', inset: 0 }}>
            <SidebarContent
              collapsed={collapsed}
              onCollapse={() => setCollapsed(true)}
              stats={stats}
            />
            {collapsed && (
              <button
                onClick={() => setCollapsed(false)}
                style={{
                  position: 'absolute', top: 18, right: -14, zIndex: 20,
                  width: 26, height: 26, borderRadius: 8,
                  background: C.bgCard, border: `1px solid ${C.border}`,
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: C.inkMuted,
                }}
              >
                <ChevronRight size={12} />
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Mobile Sidebar Overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 40,
                background: 'rgba(10,9,7,0.75)', backdropFilter: 'blur(6px)',
              }}
            />
            <motion.div
              initial={{ x: -SIDEBAR_W }} animate={{ x: 0 }} exit={{ x: -SIDEBAR_W }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              style={{
                position: 'fixed', left: 0, top: 0, bottom: 0,
                width: SIDEBAR_W, zIndex: 50,
              }}
            >
              <SidebarContent onClose={() => setMobileOpen(false)} stats={stats} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Top bar */}
        <div style={{
          height: 56, borderBottom: `1px solid ${C.border}`,
          background: C.bg, display: 'flex', alignItems: 'center',
          padding: '0 16px', gap: 12, flexShrink: 0,
        }}>
          {/* Hamburger — always visible on mobile */}
          <button
            onClick={() => setMobileOpen(true)}
            style={{
              background: 'none', border: `1px solid ${C.border}`,
              borderRadius: 8, padding: 7, cursor: 'pointer', color: C.inkMuted,
              display: isDesktop ? 'none' : 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <Menu size={16} />
          </button>

          {/* Search */}
          <div
            className="sa-search-full"
            style={{
              flex: 1, maxWidth: 420, display: 'flex', alignItems: 'center', gap: 8,
              background: C.bgCard, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: '0 12px', height: 36,
            }}
          >
            <Search size={14} color={C.inkMuted} />
            <input
              placeholder="Search salons, users, franchises…"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 13, color: C.ink,
              }}
            />
            <kbd style={{
              fontSize: 10, color: C.inkMuted, background: C.bgMid,
              border: `1px solid ${C.border}`, borderRadius: 4, padding: '1px 5px',
            }}>⌘K</kbd>
          </div>

          {/* Right side */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              className="sa-status-badge"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: C.greenPale, border: `1px solid ${C.green}30`,
                borderRadius: 20, padding: '4px 10px',
                fontSize: 11, fontWeight: 600, color: C.green,
              }}
            >
              <Activity size={11} /> Live
            </div>

            <button style={{
              background: 'none', border: `1px solid ${C.border}`, borderRadius: 9,
              padding: 8, cursor: 'pointer', color: C.inkMuted, display: 'flex', position: 'relative',
            }}>
              <Bell size={15} />
              <div style={{
                position: 'absolute', top: 6, right: 6, width: 6, height: 6,
                borderRadius: '50%', background: C.gold,
              }} />
            </button>

            <button style={{
              background: 'none', border: `1px solid ${C.border}`, borderRadius: 9,
              padding: 8, cursor: 'pointer', color: C.inkMuted, display: 'flex',
            }}>
              <Globe size={15} />
            </button>
          </div>
        </div>

        {/* Page content */}
        <div
          className="sa-page-content"
          style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: C.bgMid }}
        >
          <Outlet />
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <SuperAdminMobileNav />
    </div>
  );
};

export default SuperAdminLayout;