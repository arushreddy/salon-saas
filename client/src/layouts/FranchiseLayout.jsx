// src/layouts/FranchiseLayout.jsx
// Phase 4 — Franchise Layout
// Mirrors SuperAdminLayout exactly; accent colour is teal/emerald (franchise brand).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  Menu, LayoutDashboard, Building2, BarChart3, Users,
  MessageSquare, LogOut, ChevronDown, GitBranch, X,
  PanelLeftClose, Bell,
} from 'lucide-react';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  cream: '#FAF6EF',
  creamDeep: '#F3ECE0',
  border: 'rgba(180,148,90,0.18)',
  ink: '#1c1712',
  inkMid: '#2e2619',
  inkMuted: 'rgba(28,23,18,0.45)',
  inkDim: 'rgba(28,23,18,0.22)',
  gold: '#b8892a',
  goldLight: '#d4a84b',
  goldPale: 'rgba(184,137,42,0.10)',
  teal: '#0F766E',
  tealLight: '#14B8A6',
  tealPale: 'rgba(15,118,110,0.09)',
  tealBorder: 'rgba(15,118,110,0.22)',
};

const FRANCHISE_MENU = [
  { label: 'Overview',   path: '/franchise',            icon: LayoutDashboard },
  { label: 'Branches',   path: '/franchise/branches',   icon: Building2       },
  { label: 'Analytics',  path: '/franchise/analytics',  icon: BarChart3       },
  { label: 'Managers',   path: '/franchise/managers',   icon: Users           },
  { label: 'WhatsApp',   path: '/franchise/whatsapp',   icon: MessageSquare   },
];

const SIDEBAR_W = 264;

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const SidebarContent = ({ onClose, onCollapse }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const initials = (n = '') => n.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || 'F';

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:C.cream, position:'relative', overflow:'hidden' }}>
      {/* Grain */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0,
        backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")`,
      }} />
      <div style={{ position:'absolute', right:0, top:0, bottom:0, width:1, zIndex:1, background:'linear-gradient(180deg, transparent, rgba(180,148,90,0.25) 20%, rgba(180,148,90,0.25) 80%, transparent)' }} />

      {/* Brand */}
      <div style={{ padding:'28px 24px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'flex-start', justifyContent:'space-between', position:'relative', zIndex:1 }}>
        <div>
          <Link to="/" style={{ fontFamily:'Cormorant Garamond, Georgia, serif', fontSize:24, fontWeight:300, fontStyle:'italic', color:C.ink, textDecoration:'none' }}>
            Glamour<span style={{ color:C.gold, fontStyle:'normal', fontWeight:400 }}>.</span>
          </Link>
          <div style={{ fontSize:9, fontWeight:500, letterSpacing:'0.2em', textTransform:'uppercase', color:C.teal, marginTop:5, opacity:0.9 }}>
            Franchise Portal
          </div>
        </div>
        <div style={{ display:'flex', gap:6, marginTop:4 }}>
          {onCollapse && (
            <button onClick={onCollapse} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:6, cursor:'pointer', color:C.inkDim, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}
              onMouseEnter={e=>{e.currentTarget.style.background=C.tealPale;e.currentTarget.style.color=C.teal;}}
              onMouseLeave={e=>{e.currentTarget.style.background='none';e.currentTarget.style.color=C.inkDim;}}>
              <PanelLeftClose size={14} />
            </button>
          )}
          {onClose && (
            <button onClick={onClose} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:6, cursor:'pointer', color:C.inkDim, display:'flex', alignItems:'center' }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Franchise badge */}
      <div style={{ padding:'14px 20px 0', position:'relative', zIndex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:10, background:C.tealPale, border:`1px solid ${C.tealBorder}` }}>
          <GitBranch size={11} color={C.teal} />
          <span style={{ fontSize:11, fontWeight:600, color:C.teal, letterSpacing:'0.04em' }}>Franchise Dashboard</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'14px', overflowY:'auto', display:'flex', flexDirection:'column', gap:2, position:'relative', zIndex:1 }}>
        {FRANCHISE_MENU.map(item => {
          const Icon = item.icon;
          const isActive = item.path === '/franchise'
            ? location.pathname === '/franchise'
            : location.pathname.startsWith(item.path);
          return (
            <Link key={item.path} to={item.path} onClick={onClose}
              style={{ position:'relative', display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:10, textDecoration:'none', fontSize:13, fontWeight:isActive?500:400, color:isActive?C.ink:C.inkMuted, background:isActive?`linear-gradient(135deg, rgba(15,118,110,0.10) 0%, rgba(20,184,166,0.05) 100%)`:'transparent', border:`1px solid ${isActive?'rgba(15,118,110,0.20)':'transparent'}`, transition:'all 0.2s' }}
              onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background=C.creamDeep;}}
              onMouseLeave={e=>{if(!isActive)e.currentTarget.style.background='transparent';}}>
              {isActive && (
                <motion.div layoutId="frActiveBar" style={{ position:'absolute', left:-1, top:'50%', transform:'translateY(-50%)', width:3, height:20, borderRadius:'0 3px 3px 0', background:`linear-gradient(180deg, ${C.tealLight}, ${C.teal})` }} transition={{ type:'spring', damping:28, stiffness:220 }} />
              )}
              <div style={{ width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, background:isActive?`linear-gradient(135deg, rgba(15,118,110,0.18), rgba(20,184,166,0.10))`:'rgba(28,23,18,0.04)', border:`1px solid ${isActive?'rgba(15,118,110,0.25)':'transparent'}`, transition:'all 0.2s' }}>
                <Icon size={15} color={isActive?C.teal:C.inkMuted} />
              </div>
              <span>{item.label}</span>
              {isActive && <div style={{ marginLeft:'auto', width:5, height:5, borderRadius:'50%', background:C.teal }} />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding:'14px', borderTop:`1px solid ${C.border}`, position:'relative', zIndex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:C.creamDeep, border:`1px solid ${C.border}`, marginBottom:8 }}>
          <div style={{ width:36, height:36, borderRadius:8, flexShrink:0, background:`linear-gradient(135deg, ${C.tealLight}, ${C.teal})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 2px 12px rgba(15,118,110,0.3)` }}>
            <span style={{ fontFamily:'Cormorant Garamond, Georgia, serif', fontSize:15, fontWeight:600, color:'#fff', fontStyle:'italic' }}>{initials(user?.name)}</span>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:500, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize:10, color:C.teal, letterSpacing:'0.1em', textTransform:'capitalize' }}>{user?.role?.replace('_', ' ')}</div>
          </div>
        </div>
        <button onClick={logout} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'9px 14px', borderRadius:8, border:'none', background:'none', cursor:'pointer', fontSize:12.5, color:C.inkDim, transition:'all 0.2s' }}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(185,28,28,0.06)';e.currentTarget.style.color='#b91c1c';}}
          onMouseLeave={e=>{e.currentTarget.style.background='none';e.currentTarget.style.color=C.inkDim;}}>
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </div>
  );
};

// ─── Main Layout ──────────────────────────────────────────────────────────────
const FranchiseLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [collapsed, setCollapsed]     = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop]     = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const update = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;
    const close = () => setUserMenuOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [userMenuOpen]);

  const initials  = (n='') => n.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()||'F';
  const sidebarVisible = isDesktop && !collapsed;
  const mainMargin     = sidebarVisible ? SIDEBAR_W : 0;

  return (
    <div style={{ minHeight:'100vh', background:'#F4EDE0', boxSizing:'border-box' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { overflow-x: hidden; }
        .fr-main-content { overflow-x: hidden; }
        @media (max-width: 1023px) { .fr-page-main { padding-bottom: calc(72px + env(safe-area-inset-bottom)) !important; } }
      `}</style>

      {/* Desktop Sidebar */}
      <AnimatePresence>
        {sidebarVisible && (
          <motion.aside style={{ width:SIDEBAR_W, height:'100vh', position:'fixed', left:0, top:0, zIndex:40, overflow:'hidden', boxShadow:'4px 0 40px rgba(28,23,18,0.08)' }}
            initial={{ x:-SIDEBAR_W }} animate={{ x:0 }} exit={{ x:-SIDEBAR_W }}
            transition={{ type:'spring', damping:28, stiffness:220 }}>
            <SidebarContent onCollapse={() => setCollapsed(true)} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div style={{ position:'fixed', inset:0, background:'rgba(28,23,18,0.4)', backdropFilter:'blur(4px)', zIndex:40 }}
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setMobileOpen(false)} />
            <motion.aside style={{ position:'fixed', left:0, top:0, width:280, height:'100vh', zIndex:50, overflow:'hidden', boxShadow:'8px 0 60px rgba(28,23,18,0.15)' }}
              initial={{ x:-280 }} animate={{ x:0 }} exit={{ x:-280 }}
              transition={{ type:'spring', damping:28, stiffness:220 }}>
              <SidebarContent onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="fr-main-content" style={{ marginLeft:mainMargin, minHeight:'100vh', transition:'margin-left 0.3s cubic-bezier(0.4,0,0.2,1)', maxWidth:'100%' }}>
        {/* Header */}
        <header style={{ position:'sticky', top:0, zIndex:30, height:56, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', background:'rgba(250,250,248,0.95)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(15,118,110,0.12)', boxShadow:'0 1px 0 rgba(15,118,110,0.08)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
            <button onClick={() => { if(isDesktop) setCollapsed(c=>!c); else setMobileOpen(true); }} style={{ padding:8, background:'none', border:'none', cursor:'pointer', color:C.ink, borderRadius:8, display:'flex', alignItems:'center', flexShrink:0 }}>
              <Menu size={20} />
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:20, background:C.tealPale, border:`1px solid ${C.tealBorder}`, flexShrink:0 }}>
              <GitBranch size={11} color={C.teal} />
              <span style={{ fontSize:11, fontWeight:600, color:C.teal, letterSpacing:'0.05em', textTransform:'uppercase' }}>
                {user?.role === 'franchise_manager' ? 'Franchise Mgr' : 'Franchise'}
              </span>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:10 }} onClick={e=>e.stopPropagation()}>
            <button style={{ width:34, height:34, borderRadius:10, background:'none', border:'1px solid rgba(15,118,110,0.15)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.inkMuted, flexShrink:0 }}>
              <Bell size={16} />
            </button>

            <div style={{ position:'relative' }}>
              <button onClick={e=>{e.stopPropagation();setUserMenuOpen(o=>!o);}} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 10px 5px 5px', borderRadius:24, border:`1px solid ${userMenuOpen?C.tealBorder:'rgba(15,118,110,0.15)'}`, background:userMenuOpen?C.tealPale:'rgba(250,250,248,0.6)', cursor:'pointer', transition:'all 0.18s' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:`linear-gradient(135deg, ${C.tealLight}, ${C.teal})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(15,118,110,0.3)', flexShrink:0 }}>
                  <span style={{ fontFamily:'Cormorant Garamond, Georgia, serif', fontSize:12, fontWeight:600, color:'#fff', fontStyle:'italic' }}>{initials(user?.name)}</span>
                </div>
                <span style={{ fontSize:13, fontWeight:500, color:C.ink, display:window.innerWidth<480?'none':'block', whiteSpace:'nowrap' }}>{user?.name?.split(' ')[0]}</span>
                <ChevronDown size={13} color='#9C8660' style={{ transition:'transform 0.18s', transform:userMenuOpen?'rotate(180deg)':'none', flexShrink:0 }} />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div initial={{ opacity:0, y:6, scale:0.96 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:4, scale:0.97 }} transition={{ duration:0.14 }}
                    style={{ position:'absolute', right:0, top:'calc(100% + 8px)', width:200, background:'#FDF8F0', border:'1px solid rgba(184,137,42,0.18)', borderRadius:14, boxShadow:'0 8px 32px rgba(28,23,18,0.12)', overflow:'hidden', zIndex:50 }}
                    onClick={e=>e.stopPropagation()}>
                    <div style={{ padding:'12px 14px', borderBottom:'1px solid rgba(184,137,42,0.10)' }}>
                      <div style={{ fontSize:13, fontWeight:600, color:C.ink }}>{user?.name}</div>
                      <div style={{ fontSize:11, color:'#9C8660', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</div>
                    </div>
                    <button onClick={()=>{logout();setUserMenuOpen(false);}} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'10px 14px', background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#991B1B', textAlign:'left' }}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(185,28,28,0.05)'}
                      onMouseLeave={e=>e.currentTarget.style.background='none'}>
                      <LogOut size={13} /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="fr-page-main" style={{ padding:'20px 16px' }}>
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <FranchiseMobileNav />
    </div>
  );
};

const FranchiseMobileNav = () => {
  const location = useLocation();
  return (
    <>
      <style>{`
        .fr-bnav { display:none; position:fixed; bottom:0; left:0; right:0; z-index:60; background:rgba(250,246,239,0.97); backdrop-filter:blur(20px); border-top:1px solid rgba(15,118,110,0.15); box-shadow:0 -4px 30px rgba(28,23,18,0.08); padding-bottom:env(safe-area-inset-bottom); }
        @media (max-width:1023px) { .fr-bnav { display:flex; } }
        .fr-bnav-item { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; padding:10px 4px 8px; text-decoration:none; color:rgba(28,23,18,0.4); transition:color 0.2s; min-height:56px; position:relative; }
        .fr-bnav-item.active { color:#0F766E; }
        .fr-bnav-item.active::before { content:''; position:absolute; top:0; left:50%; transform:translateX(-50%); width:28px; height:2px; background:linear-gradient(90deg,#14B8A6,#0F766E); border-radius:0 0 4px 4px; }
        .fr-bnav-label { font-size:9.5px; font-weight:500; white-space:nowrap; }
      `}</style>
      <nav className="fr-bnav">
        {FRANCHISE_MENU.slice(0, 5).map(item => {
          const Icon = item.icon;
          const isActive = item.path === '/franchise' ? location.pathname === '/franchise' : location.pathname.startsWith(item.path);
          return (
            <Link key={item.path} to={item.path} className={`fr-bnav-item${isActive?' active':''}`}>
              <Icon size={20} strokeWidth={isActive?2:1.5} />
              <span className="fr-bnav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};

export default FranchiseLayout;
