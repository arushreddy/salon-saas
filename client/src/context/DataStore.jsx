/**
 * DataStore.jsx — Centralized data layer for Glamour Salon
 *
 * Solves "too many requests" by:
 *  1. ONE poller per data type (not one per component)
 *  2. Request deduplication — concurrent calls for same URL share one in-flight fetch
 *  3. Visibility-aware — polling pauses when browser tab is hidden
 *  4. Debounced BroadcastChannel — multiple rapid mutations trigger one re-fetch
 *  5. Stale-while-revalidate — components always get cached data instantly
 *  6. Salon settings + role permissions cached here — staff pages read from context
 */

import { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import api from '@/services/api';

// ─── BroadcastChannel (shared across tabs) ────────────────────────────────────
let BC = null;
try { BC = new BroadcastChannel('glamour_bookings_sync'); } catch {}

export const broadcastChange = () => {
  try { BC?.postMessage({ type: 'refresh', ts: Date.now() }); } catch {}
};

// ─── In-flight request deduplication map ─────────────────────────────────────
const inflight = new Map();

const dedupGet = (url, params = {}) => {
  const key = url + JSON.stringify(params);
  if (inflight.has(key)) return inflight.get(key);
  const p = api.get(url, { params }).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const todayIST = () => {
  const d = new Date(Date.now() + 5.5 * 3600000);
  return d.toISOString().split('T')[0];
};

const isVisible = () => !document.hidden;

// Default permission sets (fallback when settings not yet loaded)
const DEFAULT_PERMS = {
  staff: {
    canViewAllBookings: false, canCreateWalkIn: true,  canMarkComplete: true,
    canCancelBooking:   false, canViewInventory: true, canDeductInventory: true,
    canViewEarnings:    true,  canViewCustomers: false, canApplyDiscount: true,
    canClockInOut:      true,
  },
  receptionist: {
    canViewAllBookings: true,  canCreateWalkIn: true,  canMarkComplete: true,
    canCancelBooking:   true,  canViewInventory: true, canDeductInventory: true,
    canViewEarnings:    false, canViewCustomers: true,  canApplyDiscount: true,
    canClockInOut:      false,
  },
};

// ─── Context ─────────────────────────────────────────────────────────────────
const DataStoreCtx = createContext(null);

export const useDataStore = () => {
  const ctx = useContext(DataStoreCtx);
  if (!ctx) throw new Error('useDataStore must be used inside DataStoreProvider');
  return ctx;
};

/** Convenience hook — returns perm object for a role ('staff'|'receptionist'|'admin') */
export const usePermissions = (role) => {
  const { permissions } = useDataStore();
  if (role === 'admin') {
    return Object.fromEntries(Object.keys(DEFAULT_PERMS.staff).map(k => [k, true]));
  }
  return permissions[role] || DEFAULT_PERMS[role] || {};
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export function DataStoreProvider({ children }) {

  const [bookings,      setBookings]      = useState([]);
  const [stats,         setStats]         = useState(null);
  const [services,      setServices]      = useState([]);
  const [staff,         setStaff]         = useState([]);
  const [liveStatus,    setLiveStatus]    = useState([]);
  const [liveSummary,   setLiveSummary]   = useState(null);
  const [syncing,       setSyncing]       = useState(false);
  const [salonSettings, setSalonSettings] = useState(null);
  const [permissions,   setPermissions]   = useState(DEFAULT_PERMS);
  const [customers,     setCustomers]     = useState([]);
  const [inventory,     setInventory]     = useState([]);

  const dateRef = useRef(todayIST());

  const fetchBookings = useCallback(async (date) => {
    try {
      const { data } = await dedupGet('/bookings', { date: date || dateRef.current, limit: 200 });
      setBookings(data.bookings || []);
    } catch {}
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await dedupGet('/bookings/today/stats');
      setStats(data.stats || null);
    } catch {}
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const { data } = await dedupGet('/services', { isActive: true, limit: 100 });
      setServices(data.services || []);
    } catch {}
  }, []);

  const fetchLiveStaff = useCallback(async () => {
    try {
      const { data } = await dedupGet('/staff/live-status');
      const enriched = (data.staff || []).map(u => ({
        _id:             String(u._id),
        name:            u.name,
        phone:           u.phone,
        designation:     u.designation || '',
        skills:          u.specializations || [],
        liveStatus:      u.liveStatus,
        isClockedIn:     u.isClockedIn || u.liveStatus === 'available' || u.liveStatus === 'busy',
        isBusy:          u.liveStatus === 'busy',
        isAvailable:     u.liveStatus === 'available',
        statusLabel:     u.liveStatus === 'available' ? 'Free'
                       : u.liveStatus === 'busy'      ? 'Busy'
                       : u.liveStatus === 'off-duty'  ? 'Off Duty'
                       : 'Absent',
        currentBooking:  u.currentBooking || null,
        shiftStart:      u.shiftStart,
        shiftEnd:        u.shiftEnd,
        attendanceStatus:u.attendanceStatus,
      }));
      setStaff(enriched);
      setLiveStatus(enriched);
      setLiveSummary(data.summary || null);
    } catch {}
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const { data } = await dedupGet('/users', { role:'customer', limit:500 });
      setCustomers(data.users || []);
    } catch {}
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const { data } = await dedupGet('/inventory', { limit:500 });
      setInventory(data.products || []);
    } catch {}
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await dedupGet('/settings');
      const s = data.settings || data;
      setSalonSettings(s);
      if (s?.permissions) {
        setPermissions({
          staff:        { ...DEFAULT_PERMS.staff,        ...(s.permissions.staff        || {}) },
          receptionist: { ...DEFAULT_PERMS.receptionist, ...(s.permissions.receptionist || {}) },
        });
      }
    } catch {}
  }, []);

  const refresh = useCallback(async (silent = true) => {
    if (!localStorage.getItem('accessToken')) return; // not logged in
    if (!silent) setSyncing(true);
    const today = todayIST();
    if (today !== dateRef.current) dateRef.current = today;
    await Promise.allSettled([fetchBookings(today), fetchStats(), fetchLiveStaff()]);
    if (!silent) setSyncing(false);
  }, [fetchBookings, fetchStats, fetchLiveStaff]);

  // Initial load — only when token exists
  useEffect(() => {
    if (!localStorage.getItem('accessToken')) return;
    fetchServices();
    fetchSettings();
    fetchCustomers();
    fetchInventory();
    refresh(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Customers + inventory poll every 3 min
  useEffect(() => {
    const id = setInterval(() => {
      if (isVisible() && localStorage.getItem('accessToken')) {
        fetchCustomers();
        fetchInventory();
      }
    }, 180_000);
    return () => clearInterval(id);
  }, [fetchCustomers, fetchInventory]);

  // Settings poll every 2 min (rarely changes)
  useEffect(() => {
    const id = setInterval(() => {
      if (isVisible() && localStorage.getItem('accessToken')) fetchSettings();
    }, 120_000);
    return () => clearInterval(id);
  }, [fetchSettings]);

  // Main 45s poller
  useEffect(() => {
    const tick = () => {
      if (!isVisible() || !localStorage.getItem('accessToken')) return;
      refresh(true);
    };
    const id = setInterval(tick, 45_000);
    const onVisible = () => {
      if (isVisible() && localStorage.getItem('accessToken')) refresh(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [refresh]);

  // BroadcastChannel (debounced 600ms) — re-fetches bookings + inventory on any mutation
  useEffect(() => {
    if (!BC) return;
    let debTimer = null;
    const handler = (e) => {
      if (e.data?.type !== 'refresh') return;
      clearTimeout(debTimer);
      debTimer = setTimeout(() => {
        refresh(true);
        fetchInventory(); // inventory changes (admin add/edit, receptionist deduct) propagate instantly
      }, 600);
    };
    BC.addEventListener('message', handler);
    return () => { BC.removeEventListener('message', handler); clearTimeout(debTimer); };
  }, [refresh, fetchInventory]);

  const value = {
    bookings, stats, services, staff, liveStatus, liveSummary,
    syncing, salonSettings, permissions,
    customers, inventory,
    refresh, refreshBookings: fetchBookings, refreshStaff: fetchLiveStaff,
    refreshSettings: fetchSettings,
    refreshCustomers: fetchCustomers,
    refreshInventory: fetchInventory,
    broadcastChange,
    today: dateRef, dedupGet,
  };

  return (
    <DataStoreCtx.Provider value={value}>
      {children}
    </DataStoreCtx.Provider>
  );
}