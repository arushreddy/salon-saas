import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import MobileBottomNav from '@/components/MobileBottomNav';
import { useAuth } from '@/context/AuthContext';
import { useDataStore } from '@/context/DataStore';
import {
  Menu, LayoutDashboard, Calendar, Users, Scissors,
  IndianRupee, Package, Receipt, Tag, BarChart3, Settings,
  Clock, RefreshCw, Bell, ChevronDown, LogOut, Shield,
  Search, X, Command, ChevronRight, Zap, TrendingUp,
  UserPlus, Plus, Activity,
} from 'lucide-react';

const ADMIN_MENU = [
  { label: 'Dashboard',    path: '/admin',              icon: LayoutDashboard },
  { label: 'Appointments', path: '/admin/appointments', icon: Calendar        },
  { label: 'Attendance',   path: '/admin/attendance',   icon: Clock           },
  { label: 'Services',     path: '/admin/services',     icon: Scissors        },
  { label: 'Staff',        path: '/admin/staff',        icon: Users           },
  { label: 'Customers',    path: '/admin/customers',    icon: Users           },
  { label: 'Payments',     path: '/admin/payments',     icon: IndianRupee     },
  { label: 'Inventory',    path: '/admin/inventory',    icon: Package         },
  { label: 'Invoices',     path: '/admin/invoices',     icon: Receipt         },
  { label: 'Coupons',      path: '/admin/coupons',      icon: Tag             },
  { label: 'Analytics',    path: '/admin/analytics',    icon: BarChart3       },
  { label: 'Settings',     path: '/admin/settings',     icon: Settings        },
];

const QUICK_ACTIONS = [
  { label: 'New Appointment',  icon: Calendar,    path: '/admin/appointments', color: '#1D4ED8' },
  { label: 'Add Staff',        icon: UserPlus,    path: '/admin/staff',        color: '#15803D' },
  { label: 'New Invoice',      icon: Receipt,     path: '/admin/invoices',     color: '#92400E' },
  { label: 'View Analytics',   icon: BarChart3,   path: '/admin/analytics',    color: '#5B21B6' },
  { label: 'Manage Services',  icon: Scissors,    path: '/admin/services',     color: '#B8860B' },
  { label: 'Add Coupon',       icon: Tag,         path: '/admin/coupons',      color: '#0F766E' },
  { label: 'View Payments',    icon: IndianRupee, path: '/admin/payments',     color: '#B8860B' },
  { label: 'Settings',         icon: Settings,    path: '/admin/settings',     color: '#6B7280' },
];

const BREADCRUMB_MAP = {
  '/admin':              ['Dashboard'],
  '/admin/appointments': ['Dashboard', 'Appointments'],
  '/admin/attendance':   ['Dashboard', 'Attendance'],
  '/admin/services':     ['Dashboard', 'Services'],
  '/admin/staff':        ['Dashboard', 'Staff'],
  '/admin/customers':    ['Dashboard', 'Customers'],
  '/admin/payments':     ['Dashboard', 'Payments'],
  '/admin/inventory':    ['Dashboard', 'Inventory'],
  '/admin/invoices':     ['Dashboard', 'Invoices'],
  '/admin/coupons':      ['Dashboard', 'Coupons'],
  '/admin/analytics':    ['Dashboard', 'Analytics'],
  '/admin/settings':     ['Dashboard', 'Settings'],
};

const SyncDot = ({ syncing }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
    {syncing ? (
      <>
        <RefreshCw size={12} color='#B8860B' style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 11, color: '#B8860B', fontWeight: 500 }}>Syncing…</span>
      </>
    ) : (
      <>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px rgba(34,197,94,0.5)', animation: 'pulse 2.5s ease-in-out infinite', display: 'inline-block' }} />
        <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>Live</span>
      </>
    )}
  </div>
);

const CommandPalette = ({ onClose, navigate }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    // Lock body scroll when palette is open
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const allItems = [
    ...ADMIN_MENU.map(m => ({ label: m.label, icon: m.icon, path: m.path, type: 'page', color: '#B8860B' })),
    ...QUICK_ACTIONS.map(a => ({ ...a, type: 'action' })),
  ];

  const filtered = query.trim()
    ? allItems.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
    : QUICK_ACTIONS.slice(0, 6).map(a => ({ ...a, type: 'action' }));

  const go = (path) => { navigate(path); onClose(); };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(28,23,18,0.6)', backdropFilter: 'blur(8px)',
        zIndex: 200, display: 'flex', alignItems: 'flex-start',
        justifyContent: 'center', padding: '10vh 16px 0',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560, background: '#FDFAF4',
          borderRadius: 18, border: '1px solid #DFD0A8',
          boxShadow: '0 25px 80px rgba(28,23,18,0.20)', overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid #DFD0A8' }}>
          <Search size={18} color='#9C8660' style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, actions…"
            style={{ flex: 1, border: 'none', background: 'none', fontSize: 15, color: '#1A1208', outline: 'none', fontFamily: 'inherit' }}
            onKeyDown={e => e.key === 'Escape' && onClose()}
          />
          <kbd style={{ padding: '2px 8px', borderRadius: 6, background: '#F3ECE0', border: '1px solid #DFD0A8', fontSize: 11, color: '#9C8660', fontFamily: 'inherit' }}>ESC</kbd>
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto', padding: '8px 0' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', color: '#9C8660', fontSize: 13 }}>No results found</div>
          ) : (
            <>
              {!query && <div style={{ padding: '6px 18px 8px', fontSize: 10, fontWeight: 600, color: '#9C8660', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Quick Actions</div>}
              {filtered.map((item, i) => {
                const Icon = item.icon;
                return (
                  <button
                    key={`${item.path}-${i}`}
                    onClick={() => go(item.path)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F3ECE0'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={15} color={item.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1208' }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: '#9C8660' }}>{item.path}</div>
                    </div>
                    <ChevronRight size={13} color='#C8B090' />
                  </button>
                );
              })}
            </>
          )}
        </div>
        <div style={{ padding: '10px 18px', borderTop: '1px solid #DFD0A8', display: 'flex', gap: 16 }}>
          {[['↵', 'Go'], ['ESC', 'Close']].map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <kbd style={{ padding: '2px 6px', borderRadius: 5, background: '#F3ECE0', border: '1px solid #DFD0A8', fontSize: 10, color: '#9C8660' }}>{key}</kbd>
              <span style={{ fontSize: 11, color: '#9C8660' }}>{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

const NotificationPanel = ({ onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: 6, scale: 0.96 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 4, scale: 0.97 }}
    transition={{ duration: 0.14 }}
    onClick={e => e.stopPropagation()}
    style={{
      position: 'absolute', right: 0, top: 'calc(100% + 8px)',
      width: 300, background: '#FDF8F0',
      border: '1px solid rgba(184,137,42,0.18)', borderRadius: 16,
      boxShadow: '0 12px 40px rgba(28,23,18,0.14)', overflow: 'hidden', zIndex: 50,
    }}
  >
    <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(184,137,42,0.10)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1208' }}>Notifications</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9C8660', display: 'flex' }}><X size={14} /></button>
    </div>
    <div style={{ padding: '10px 0' }}>
      {[
        { icon: Calendar,    text: 'New appointment booked',  sub: '2 minutes ago',  color: '#1D4ED8' },
        { icon: TrendingUp,  text: "Today's revenue updated", sub: '15 minutes ago', color: '#15803D' },
        { icon: Activity,    text: 'Staff attendance marked', sub: '1 hour ago',     color: '#B8860B' },
      ].map((n, i) => {
        const Icon = n.icon;
        return (
          <div key={i}
            style={{ display: 'flex', gap: 12, padding: '10px 16px', cursor: 'pointer', transition: 'background 0.14s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(184,137,42,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `${n.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={14} color={n.color} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1208' }}>{n.text}</div>
              <div style={{ fontSize: 11, color: '#9C8660', marginTop: 2 }}>{n.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
    <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(184,137,42,0.10)', textAlign: 'center' }}>
      <button style={{ fontSize: 12, color: '#B8860B', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>View all notifications</button>
    </div>
  </motion.div>
);

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const { syncing } = useDataStore();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [collapsed,    setCollapsed]    = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [cmdOpen,      setCmdOpen]      = useState(false);
  const [isDesktop,    setIsDesktop]    = useState(window.innerWidth >= 1024);
  const [notifCount]                   = useState(3);

  // ── FIX: always sync body overflow with mobileOpen state ──────────────────
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // ── FIX: close everything on route change ─────────────────────────────────
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
    setNotifOpen(false);
    setCmdOpen(false);
    document.body.style.overflow = '';
  }, [location.pathname]);

  // Track screen size
  useEffect(() => {
    const update = () => {
      setIsDesktop(window.innerWidth >= 1024);
      // If resized to desktop, close mobile sidebar and reset overflow
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
        document.body.style.overflow = '';
      }
    };
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(true); }
      if (e.key === 'Escape') {
        setCmdOpen(false);
        setUserMenuOpen(false);
        setNotifOpen(false);
        // Don't close mobileOpen on Escape — use the X button or overlay tap
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!userMenuOpen && !notifOpen) return;
    const close = () => { setUserMenuOpen(false); setNotifOpen(false); };
    // Use setTimeout to avoid instant close on the same click that opened it
    const timer = setTimeout(() => {
      window.addEventListener('click', close, { once: true });
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', close);
    };
  }, [userMenuOpen, notifOpen]);

  // ── FIX: safe close function that always resets overflow ──────────────────
  const closeMobileSidebar = useCallback(() => {
    setMobileOpen(false);
    document.body.style.overflow = '';
  }, []);

  const openMobileSidebar = useCallback(() => {
    setMobileOpen(true);
  }, []);

  const initials = (name = '') =>
    name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'A';

  const breadcrumbs = BREADCRUMB_MAP[location.pathname] || ['Dashboard'];
  const sidebarVisible = isDesktop && !collapsed;

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', boxSizing: 'border-box' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { overflow-x: hidden; }
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.35 } }
        .adm-main { overflow-x: hidden; }
        @media (max-width: 1023px) {
          .glm-page-main { padding-bottom: calc(72px + env(safe-area-inset-bottom)) !important; }
          .adm-breadcrumb { display: none !important; }
          .adm-search-btn { display: none !important; }
          .adm-sync       { display: none !important; }
          .adm-username   { display: none !important; }
        }
        @media (max-width: 480px) {
          .adm-search-btn { display: none !important; }
        }
      `}</style>

      {/* Sidebar */}
      <Sidebar
        menuItems={ADMIN_MENU}
        title="Admin Panel"
        mobileOpen={mobileOpen}
        onMobileClose={closeMobileSidebar}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
      />

      {/* Main */}
      <div
        className="adm-main"
        style={{
          marginLeft: sidebarVisible ? 264 : 0,
          minHeight: '100vh',
          transition: 'margin-left 0.3s cubic-bezier(0.4,0,0.2,1)',
          maxWidth: '100%',
          // ── FIX: prevent main content from being interactive when sidebar is open ──
          pointerEvents: mobileOpen ? 'none' : 'auto',
        }}
      >
        {/* Header */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 30, height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px',
          background: 'rgba(250,250,248,0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(184,137,42,0.12)',
          boxShadow: '0 1px 0 rgba(180,148,90,0.08)',
          gap: 10,
          pointerEvents: 'auto', // always interactive
        }}>
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            <button
              onClick={() => {
                if (isDesktop) setCollapsed(c => !c);
                else openMobileSidebar();
              }}
              style={{ padding: 8, marginLeft: -4, background: 'none', border: 'none', cursor: 'pointer', color: '#1c1712', borderRadius: 8, display: 'flex', alignItems: 'center', flexShrink: 0 }}
            >
              <Menu size={20} />
            </button>
            <div className="adm-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
              {breadcrumbs.map((crumb, i) => (
                <div key={crumb} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {i > 0 && <ChevronRight size={12} color='#C8B090' />}
                  <span style={{
                    fontSize: 13, fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
                    color: i === breadcrumbs.length - 1 ? '#1c1712' : '#9C8660',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {crumb}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Center: Search */}
          <button
            onClick={() => setCmdOpen(true)}
            className="adm-search-btn"
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
              borderRadius: 10, border: '1px solid rgba(184,137,42,0.18)',
              background: 'rgba(243,236,224,0.6)', cursor: 'pointer',
              color: '#9C8660', fontSize: 13, flexShrink: 0, transition: 'all 0.18s',
            }}
          >
            <Search size={14} />
            <span className="adm-search-text">Quick search…</span>
            <kbd style={{ padding: '1px 6px', borderRadius: 5, background: 'rgba(184,137,42,0.10)', border: '1px solid rgba(184,137,42,0.15)', fontSize: 10, color: '#9C8660', fontFamily: 'inherit' }}>⌘K</kbd>
          </button>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <div className="adm-sync"><SyncDot syncing={syncing} /></div>

            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={e => { e.stopPropagation(); setNotifOpen(o => !o); setUserMenuOpen(false); }}
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: notifOpen ? 'rgba(184,137,42,0.08)' : 'none',
                  border: '1px solid rgba(184,137,42,0.15)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#9C8660', position: 'relative', transition: 'all 0.18s',
                }}
              >
                <Bell size={16} />
                {notifCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -2, right: -2, width: 15, height: 15,
                    borderRadius: '50%', background: '#EF4444', color: '#fff',
                    fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid rgba(250,250,248,0.95)',
                  }}>{notifCount}</span>
                )}
              </button>
              <AnimatePresence>
                {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
              </AnimatePresence>
            </div>

            {/* User Menu */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={e => { e.stopPropagation(); setUserMenuOpen(o => !o); setNotifOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '5px 10px 5px 5px', borderRadius: 24,
                  border: `1px solid ${userMenuOpen ? 'rgba(184,137,42,0.30)' : 'rgba(184,137,42,0.18)'}`,
                  background: userMenuOpen ? 'rgba(184,137,42,0.08)' : 'rgba(250,250,248,0.6)',
                  cursor: 'pointer', transition: 'all 0.18s',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #DAA520, #B8860B)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(184,137,42,0.3)', flexShrink: 0,
                }}>
                  <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 12, fontWeight: 600, color: '#fff', fontStyle: 'italic' }}>
                    {initials(user?.name)}
                  </span>
                </div>
                <span className="adm-username" style={{ fontSize: 13, fontWeight: 500, color: '#1c1712', whiteSpace: 'nowrap' }}>
                  {user?.name?.split(' ')[0]}
                </span>
                <ChevronDown size={13} color='#9C8660' style={{ transition: 'transform 0.18s', transform: userMenuOpen ? 'rotate(180deg)' : 'none' }} />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    transition={{ duration: 0.14 }}
                    onClick={e => e.stopPropagation()}
                    style={{
                      position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                      width: 220, background: '#FDF8F0',
                      border: '1px solid rgba(184,137,42,0.18)', borderRadius: 16,
                      boxShadow: '0 12px 40px rgba(28,23,18,0.14)', overflow: 'hidden', zIndex: 50,
                    }}
                  >
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(184,137,42,0.10)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #DAA520, #B8860B)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontFamily: 'Cormorant Garamond', fontSize: 16, fontWeight: 600, color: '#fff', fontStyle: 'italic' }}>{initials(user?.name)}</span>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1712', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
                          <div style={{ fontSize: 11, color: '#9C8660', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
                        </div>
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10, background: 'rgba(184,137,42,0.10)', fontSize: 10, fontWeight: 600, color: '#8B6914' }}>
                        <Shield size={9} /> Administrator
                      </div>
                    </div>
                    {[
                      { icon: Settings,  label: 'Settings',  path: '/admin/settings'  },
                      { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
                    ].map(item => {
                      const Icon = item.icon;
                      return (
                        <button key={item.path}
                          onClick={() => { navigate(item.path); setUserMenuOpen(false); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#2e2619', textAlign: 'left', transition: 'background 0.14s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(184,137,42,0.06)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <Icon size={13} color='#9C8660' /> {item.label}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => { logout(); setUserMenuOpen(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#991B1B', textAlign: 'left', borderTop: '1px solid rgba(184,137,42,0.10)', transition: 'background 0.14s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(185,28,28,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <LogOut size={13} /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="glm-page-main" style={{ padding: '20px 16px', maxWidth: '100%', overflowX: 'hidden' }}>
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav menuItems={ADMIN_MENU} />

      {/* Command Palette */}
      <AnimatePresence>
        {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} navigate={navigate} />}
      </AnimatePresence>
    </div>
  );
};

export default AdminLayout;