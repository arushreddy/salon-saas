import { Link } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LogOut, User, LayoutDashboard } from 'lucide-react';

const RootLayout = () => {
  const { user, isAuthenticated, logout } = useAuth();

  const getDashboardLink = () => {
    if (!user) return '/dashboard';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'staff') return '/staff';
    return '/dashboard';
  };

  return (
    <div className="min-h-screen bg-cream">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-cream/80 backdrop-blur-lg border-b border-gold/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="font-display text-xl font-bold text-charcoal">
            Glamour<span className="text-gold">.</span>
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  to={getDashboardLink()}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-charcoal hover:text-gold transition-colors"
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </Link>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold/10 text-sm">
                  <User size={14} className="text-gold" />
                  <span className="text-charcoal font-medium">{user.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-charcoal-muted hover:text-error transition-colors"
                >
                  <LogOut size={15} />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm text-charcoal hover:text-gold transition-colors font-medium"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="luxury-gradient text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-gold"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  );
};

export default RootLayout;