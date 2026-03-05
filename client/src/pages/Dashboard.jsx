import { useAuth } from '@/context/AuthContext';
import { LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-cream p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="font-display text-2xl font-bold text-charcoal">
            Glamour<span className="text-gold">.</span>
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-sm text-charcoal-muted hover:text-error transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>

        <div className="glass-card rounded-2xl p-8 shadow-card text-center">
          <h1 className="font-display text-3xl font-semibold mb-3">
            Welcome, {user?.name}!
          </h1>
          <p className="text-charcoal-muted mb-2">Role: <span className="text-gold font-medium">{user?.role}</span></p>
          <p className="text-charcoal-muted mb-2">Email: {user?.email}</p>
          <p className="text-charcoal-muted text-sm mt-6">
            Full dashboard coming in Phase 3
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
