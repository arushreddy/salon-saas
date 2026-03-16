import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

/**
 * MobileBottomNav
 * Shows first 5 nav items as a fixed bottom bar on mobile/tablet only (< 1024px).
 * Displays icons + short labels, highlights the active route.
 */
const MobileBottomNav = ({ menuItems = [] }) => {
  const location = useLocation();

  // Take the first 5 items for the bottom bar (most important ones)
  const visibleItems = menuItems.slice(0, 5);

  return (
    <>
      <style>{`
        .glm-bnav {
          display: none;
          position: fixed;
          bottom: 0; left: 0; right: 0;
          z-index: 60;
          background: rgba(250, 246, 239, 0.97);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(184, 137, 42, 0.15);
          box-shadow: 0 -4px 30px rgba(28, 23, 18, 0.08);
          padding: 0;
          padding-bottom: env(safe-area-inset-bottom);
        }

        @media (max-width: 1023px) {
          .glm-bnav { display: flex; }
        }

        .glm-bnav-inner {
          display: flex;
          width: 100%;
          align-items: stretch;
        }

        .glm-bnav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 10px 4px 8px;
          text-decoration: none;
          color: rgba(28, 23, 18, 0.4);
          transition: color 0.2s;
          min-height: 56px;
          position: relative;
          -webkit-tap-highlight-color: transparent;
        }

        .glm-bnav-item.active {
          color: #B8860B;
        }

        .glm-bnav-item.active::before {
          content: '';
          position: absolute;
          top: 0; left: 50%;
          transform: translateX(-50%);
          width: 28px; height: 2px;
          background: linear-gradient(90deg, #DAA520, #B8860B);
          border-radius: 0 0 4px 4px;
        }

        .glm-bnav-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 9.5px;
          font-weight: 500;
          letter-spacing: 0.01em;
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 58px;
          text-align: center;
        }

        .glm-bnav-icon {
          width: 22px; height: 22px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        /* Ensure page content isn't hidden behind bottom nav on mobile */
        @media (max-width: 1023px) {
          .glm-page-main {
            padding-bottom: calc(72px + env(safe-area-inset-bottom)) !important;
          }
        }
      `}</style>

      <nav className="glm-bnav" role="navigation" aria-label="Main navigation">
        <div className="glm-bnav-inner">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && item.path !== '/admin' && item.path !== '/staff' &&
               location.pathname.startsWith(item.path));
            const exactActive = location.pathname === item.path;

            // Shorten label for bottom bar
            const shortLabel = item.label
              .replace('Appointments', 'Bookings')
              .replace('Dashboard', 'Home')
              .replace('Analytics', 'Stats')
              .replace('Customers', 'Clients')
              .replace('Inventory', 'Stock')
              .replace('Notifications', 'Alerts')
              .replace('Service History', 'History')
              .replace('Cash Counter', 'Cash')
              .replace('Staff Status', 'Staff');

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`glm-bnav-item${exactActive ? ' active' : ''}`}
                aria-label={item.label}
                aria-current={exactActive ? 'page' : undefined}
              >
                <div className="glm-bnav-icon">
                  {exactActive ? (
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    >
                      <Icon size={20} strokeWidth={2} />
                    </motion.div>
                  ) : (
                    <Icon size={20} strokeWidth={1.5} />
                  )}
                </div>
                <span className="glm-bnav-label">{shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default MobileBottomNav;