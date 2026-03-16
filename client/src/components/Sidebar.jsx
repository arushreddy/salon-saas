import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LogOut, X, PanelLeftClose } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Design Tokens ────────────────────────────────────────────────────────────
// Palette: cream parchment surfaces · burnished gold accents · deep ink text
// Typography: Cormorant Garamond (display) + DM Sans (body)
// Add to your index.html / global CSS:
//   <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">

const SIDEBAR_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=DM+Sans:wght@300;400;500&display=swap');

  .glm-sidebar {
    --cream:        #faf6ef;
    --cream-deep:   #f3ece0;
    --cream-border: rgba(180, 148, 90, 0.18);
    --ink:          #1c1712;
    --ink-mid:      #2e2619;
    --ink-muted:    rgba(28, 23, 18, 0.45);
    --ink-dim:      rgba(28, 23, 18, 0.22);
    --gold:         #b8892a;
    --gold-light:   #d4a84b;
    --gold-pale:    rgba(184, 137, 42, 0.10);
    --gold-glow:    rgba(212, 168, 75, 0.25);
    --font-display: 'Cormorant Garamond', Georgia, serif;
    --font-body:    'DM Sans', sans-serif;
  }

  .glm-sidebar * { box-sizing: border-box; }

  /* ── Scrollbar ── */
  .glm-nav::-webkit-scrollbar { width: 3px; }
  .glm-nav::-webkit-scrollbar-track { background: transparent; }
  .glm-nav::-webkit-scrollbar-thumb { background: var(--cream-border); border-radius: 10px; }

  /* ── Brand ── */
  .glm-brand {
    padding: 32px 28px 24px;
    border-bottom: 1px solid var(--cream-border);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    position: relative;
  }

  .glm-brand::after {
    content: '';
    position: absolute;
    bottom: -1px; left: 28px; right: 28px;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--gold-light), transparent);
    opacity: 0.4;
  }

  .glm-logo {
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 300;
    font-style: italic;
    color: var(--ink);
    letter-spacing: 0.01em;
    line-height: 1;
    text-decoration: none;
  }

  .glm-logo span {
    color: var(--gold);
    font-style: normal;
    font-weight: 400;
  }

  .glm-panel-label {
    font-family: var(--font-body);
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--gold);
    margin-top: 6px;
    opacity: 0.75;
  }

  .glm-collapse-btn {
    background: none;
    border: 1px solid var(--cream-border);
    border-radius: 8px;
    padding: 6px;
    cursor: pointer;
    color: var(--ink-dim);
    display: none;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    margin-top: 4px;
  }

  @media (min-width: 1024px) {
    .glm-collapse-btn { display: flex; }
  }

  .glm-collapse-btn:hover {
    background: var(--gold-pale);
    border-color: var(--gold-light);
    color: var(--gold);
  }

  /* ── Nav ── */
  .glm-nav {
    flex: 1;
    padding: 16px 14px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  /* ── Section dividers ── */
  .glm-nav-section {
    font-family: var(--font-body);
    font-size: 8.5px;
    font-weight: 500;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--ink-dim);
    padding: 14px 12px 6px;
    margin-top: 4px;
  }

  /* ── Nav Item ── */
  .glm-nav-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border-radius: 10px;
    text-decoration: none;
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 400;
    color: var(--ink-muted);
    transition: all 0.22s ease;
    border: 1px solid transparent;
  }

  .glm-nav-item:hover {
    color: var(--ink);
    background: var(--cream-deep);
    border-color: var(--cream-border);
  }

  .glm-nav-item.active {
    color: var(--ink);
    background: linear-gradient(135deg, rgba(212,168,75,0.12) 0%, rgba(184,137,42,0.06) 100%);
    border-color: rgba(184, 137, 42, 0.22);
    font-weight: 500;
  }

  /* Active left bar */
  .glm-active-bar {
    position: absolute;
    left: -1px; top: 50%;
    transform: translateY(-50%);
    width: 3px; height: 20px;
    border-radius: 0 3px 3px 0;
    background: linear-gradient(180deg, var(--gold-light), var(--gold));
    box-shadow: 0 0 10px var(--gold-glow);
  }

  /* ── Icon container ── */
  .glm-icon-wrap {
    width: 32px; height: 32px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: all 0.22s ease;
    background: rgba(28, 23, 18, 0.04);
    border: 1px solid transparent;
  }

  .glm-nav-item:hover .glm-icon-wrap {
    background: rgba(28, 23, 18, 0.06);
  }

  .glm-nav-item.active .glm-icon-wrap {
    background: linear-gradient(135deg, rgba(212,168,75,0.2), rgba(184,137,42,0.12));
    border-color: rgba(184, 137, 42, 0.3);
    box-shadow: 0 2px 12px rgba(184, 137, 42, 0.15);
  }

  /* Active dot */
  .glm-active-dot {
    margin-left: auto;
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--gold);
    box-shadow: 0 0 8px var(--gold-glow);
    flex-shrink: 0;
  }

  /* ── Decorative divider ── */
  .glm-divider {
    margin: 10px 14px;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--cream-border) 40%, var(--cream-border) 60%, transparent);
  }

  /* ── User Footer ── */
  .glm-footer {
    padding: 16px 14px;
    border-top: 1px solid var(--cream-border);
    position: relative;
  }

  .glm-footer::before {
    content: '';
    position: absolute;
    top: -1px; left: 14px; right: 14px;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--gold-light), transparent);
    opacity: 0.35;
  }

  .glm-user-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 10px;
    background: var(--cream-deep);
    border: 1px solid var(--cream-border);
    margin-bottom: 8px;
  }

  .glm-avatar {
    width: 36px; height: 36px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, var(--gold-light) 0%, var(--gold) 100%);
    box-shadow: 0 2px 12px rgba(184, 137, 42, 0.3);
    flex-shrink: 0;
  }

  .glm-avatar span {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 600;
    color: #fff;
    font-style: italic;
  }

  .glm-user-name {
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 500;
    color: var(--ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .glm-user-role {
    font-family: var(--font-body);
    font-size: 10px;
    font-weight: 400;
    color: var(--gold);
    letter-spacing: 0.1em;
    text-transform: capitalize;
    opacity: 0.8;
  }

  .glm-logout {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 9px 14px;
    border-radius: 8px;
    border: none;
    background: none;
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 12.5px;
    font-weight: 400;
    color: var(--ink-dim);
    transition: all 0.2s;
    letter-spacing: 0.02em;
  }

  .glm-logout:hover {
    background: rgba(185, 28, 28, 0.06);
    color: #b91c1c;
  }
`;

// ─── Sidebar Content ──────────────────────────────────────────────────────────
const SidebarContent = ({ menuItems, title, onMobileClose, onToggleCollapse }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  // Group items for visual hierarchy
  const groups = [
    { label: 'Overview', paths: ['/dashboard'] },
    { label: 'Operations', paths: ['/appointments', '/services', '/staff', '/customers'] },
    { label: 'Finance', paths: ['/payments', '/invoices', '/coupons'] },
    { label: 'Management', paths: ['/analytics', '/inventory', '/settings'] },
  ];

  const getGroup = (path) => groups.find(g => g.paths.includes(path));
  const renderedLabels = new Set();

  return (
    <div
      className="glm-sidebar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--cream)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle grain texture */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")`,
      }} />

      {/* Right edge shadow line */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: '1px',
        background: 'linear-gradient(180deg, transparent, rgba(180,148,90,0.25) 20%, rgba(180,148,90,0.25) 80%, transparent)',
        zIndex: 1,
      }} />

      {/* Brand */}
      <div className="glm-brand" style={{ position: 'relative', zIndex: 1 }}>
        <div>
          <Link to="/" className="glm-logo">
            Glamour<span>.</span>
          </Link>
          <p className="glm-panel-label">{title}</p>
        </div>
        {onToggleCollapse && (
          <button className="glm-collapse-btn" onClick={onToggleCollapse}>
            <PanelLeftClose size={15} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="glm-nav" style={{ position: 'relative', zIndex: 1 }}>
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const group = getGroup(item.path);
          const showLabel = group && !renderedLabels.has(group.label);
          if (showLabel) renderedLabels.add(group.label);

          return (
            <div key={item.path}>
              {showLabel && (
                <p className="glm-nav-section">{group.label}</p>
              )}
              <Link
                to={item.path}
                onClick={onMobileClose}
                className={`glm-nav-item${isActive ? ' active' : ''}`}
              >
                {isActive && (
                  <motion.div
                    className="glm-active-bar"
                    layoutId="activeBar"
                    transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                  />
                )}
                <div className="glm-icon-wrap">
                  <Icon
                    size={15}
                    style={{ color: isActive ? 'var(--gold)' : 'var(--ink-muted)', transition: 'color 0.22s' }}
                  />
                </div>
                <span>{item.label}</span>
                {isActive && <div className="glm-active-dot" />}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="glm-footer" style={{ position: 'relative', zIndex: 1 }}>
        <div className="glm-user-card">
          <div className="glm-avatar">
            <span>{user?.name?.charAt(0).toUpperCase()}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="glm-user-name">{user?.name}</p>
            <p className="glm-user-role">{user?.role}</p>
          </div>
        </div>
        <button className="glm-logout" onClick={logout}>
          <LogOut size={13} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
const Sidebar = ({ menuItems, title, mobileOpen, onMobileClose, collapsed, onToggleCollapse }) => {
  return (
    <>
      {/* Inject styles once */}
      <style>{SIDEBAR_STYLES}</style>

      {/* Desktop */}
      <AnimatePresence>
        {!collapsed && (
          <motion.aside
            className="hidden lg:flex"
            style={{
              width: 264,
              height: '100vh',
              flexDirection: 'column',
              position: 'fixed',
              left: 0, top: 0,
              zIndex: 40,
              overflow: 'hidden',
              boxShadow: '4px 0 40px rgba(28,23,18,0.08), 8px 0 60px rgba(28,23,18,0.04)',
            }}
            initial={{ x: -264 }}
            animate={{ x: 0 }}
            exit={{ x: -264 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          >
            <SidebarContent
              menuItems={menuItems}
              title={title}
              onToggleCollapse={onToggleCollapse}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              style={{
                position: 'fixed', inset: 0,
                background: 'rgba(28,23,18,0.35)',
                backdropFilter: 'blur(4px)',
                zIndex: 40,
              }}
              className="lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
            />
            <motion.aside
              className="lg:hidden"
              style={{
                position: 'fixed', left: 0, top: 0,
                width: 280, height: '100vh',
                zIndex: 50, overflow: 'hidden',
                boxShadow: '8px 0 60px rgba(28,23,18,0.15)',
              }}
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            >
              <button
                onClick={onMobileClose}
                style={{
                  position: 'absolute', top: 16, right: 16,
                  zIndex: 10, background: 'rgba(28,23,18,0.06)',
                  border: '1px solid rgba(180,148,90,0.2)',
                  borderRadius: 8, padding: 6, cursor: 'pointer',
                  color: 'rgba(28,23,18,0.45)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
              <SidebarContent
                menuItems={menuItems}
                title={title}
                onMobileClose={onMobileClose}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;