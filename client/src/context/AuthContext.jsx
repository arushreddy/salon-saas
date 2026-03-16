// src/context/AuthContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Phase 1: Expanded with isSuperAdmin, isFranchiseOwner, isFranchiseMgr,
// salonId, franchiseId and plan helpers.
// All existing code (login, register, logout, fetchUser) is unchanged.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) { setLoading(false); return; }
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      localStorage.removeItem('accessToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    setUser(data.user);
    return data;
  };

  const register = async (name, email, phone, password) => {
    const { data } = await api.post('/auth/register', { name, email, phone, password });
    localStorage.setItem('accessToken', data.accessToken);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('accessToken');
      setUser(null);
    }
  };

  // ─── Derived role booleans ──────────────────────────────────────────────
  const isSuperAdmin     = user?.role === 'super_admin';
  const isFranchiseOwner = user?.role === 'franchise_owner';
  const isFranchiseMgr   = user?.role === 'franchise_manager';
  const isAdmin          = user?.role === 'admin';
  const isReceptionist   = user?.role === 'receptionist';
  const isStaff          = user?.role === 'staff';
  const isCustomer       = user?.role === 'customer';

  // isFranchise = franchise_owner OR franchise_manager
  const isFranchise = isFranchiseOwner || isFranchiseMgr;

  // canManageSalon = roles that access the admin dashboard
  const canManageSalon = isSuperAdmin || isFranchiseOwner || isAdmin;

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    fetchUser,

    // ── Auth state ──────────────────────────────────────────────────────
    isAuthenticated: !!user,

    // ── Role checks ─────────────────────────────────────────────────────
    isSuperAdmin,
    isFranchiseOwner,
    isFranchiseMgr,
    isFranchise,
    isAdmin,
    isReceptionist,
    isStaff,
    isCustomer,
    canManageSalon,

    // ── Tenant context ───────────────────────────────────────────────────
    // These are the raw IDs from the user document.
    // null for super_admin; set for everyone else.
    salonId:     user?.salonId     || null,
    franchiseId: user?.franchiseId || null,

    // Plan + website info — now populated by getMe
    plan:               user?.plan             || null,
    salonSlug:          user?.salonSlug         || null,
    salonName:          user?.salonName         || null,
    features:           user?.features          || {},
    subscriptionExpiry: user?.subscriptionExpiry || null,
    isPlan1:            user?.plan === 'plan1',
    isPlan2:            user?.plan === 'plan2',
    isPlan3:            user?.plan === 'plan3',
    hasOnlineBooking:   ['plan2', 'plan3'].includes(user?.plan),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;