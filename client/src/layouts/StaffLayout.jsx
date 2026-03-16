import { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import MobileBottomNav from '@/components/MobileBottomNav';
import { Menu, LogIn, LogOut, Loader2, RefreshCw } from 'lucide-react';
import { LayoutDashboard, Scissors, IndianRupee, Clock, Bell, ConciergeBell, Calendar, Users, Package, Activity, Wallet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDataStore } from '@/context/DataStore';
import api from '@/services/api';

const StaffLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const { syncing } = useDataStore();
  const isReceptionist = user?.role === 'receptionist';

  const [isClocked, setIsClocked] = useState(false);
  const [clockedAt, setClockedAt] = useState(null);
  const [clocking, setClocking] = useState(false);
  const [toast, setToast] = useState(null);
  const [unread, setUnread] = useState(0);
  const [salonOpen, setSalonOpen] = useState(true);
  const [salonMsg, setSalonMsg] = useState('');

  const showToast = (text, ok = true) => {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const syncClockState = useCallback(async () => {
    try {
      const { data } = await api.get('/attendance/my');
      const records = data.records || [];
      const IST = 5.5 * 60 * 60 * 1000;
      const todayStr = new Date(Date.now() + IST).toISOString().split('T')[0];
      const todayRec = records.find(r => new Date(r.date).toISOString().startsWith(todayStr));
      const open = (todayRec?.sessions || []).find(s => s.clockIn && !s.clockOut);
      setIsClocked(!!open);
      setClockedAt(open ? new Date(open.clockIn) : null);
      if (data.salonOpen !== undefined) setSalonOpen(data.salonOpen);
      if (data.salonMessage) setSalonMsg(data.salonMessage);
      else setSalonMsg('');
    } catch {}
  }, []);

  const fetchUnread = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications', { params: { unreadOnly: 'true' } });
      setUnread(data.unreadCount || 0);
    } catch {}
  }, []);

  useEffect(() => {
    syncClockState();
    fetchUnread();
    window.addEventListener('clock-state-changed', syncClockState);
    window.addEventListener('notifications-read', fetchUnread);
    // Auto-refresh clock state every 2 min, unread every 1 min
    const clockTimer = setInterval(syncClockState, 120_000);
    const unreadTimer = setInterval(fetchUnread, 60_000);
    return () => {
      window.removeEventListener('clock-state-changed', syncClockState);
      window.removeEventListener('notifications-read', fetchUnread);
      clearInterval(clockTimer);
      clearInterval(unreadTimer);
    };
  }, [syncClockState, fetchUnread]);

  const handleClockIn = async () => {
    setClocking(true);
    try {
      const { data } = await api.post('/attendance/clock-in');
      showToast(data.message || 'Clocked in!', true);
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed';
      showToast(msg, false);
    }
    finally { setClocking(false); await syncClockState(); window.dispatchEvent(new Event('clock-state-changed')); }
  };

  const handleClockOut = async () => {
    setClocking(true);
    try {
      const { data } = await api.post('/attendance/clock-out');
      showToast(data.message || 'Clocked out!', true);
    } catch (e) { showToast(e.response?.data?.message || 'Failed', false); }
    finally { setClocking(false); await syncClockState(); window.dispatchEvent(new Event('clock-state-changed')); }
  };

  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    if (!clockedAt) { setElapsed(''); return; }
    const tick = () => {
      const ms = Date.now() - clockedAt.getTime();
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      setElapsed(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [clockedAt]);

  const fmtTime = d => d ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

  const receptionistMenu = [
    { label: 'Dashboard',    path: '/staff',               icon: LayoutDashboard },
    { label: 'Appointments', path: '/staff/appointments',  icon: Calendar },
    { label: 'Customers',    path: '/staff/customers',     icon: Users },
    { label: 'Staff Status', path: '/staff/staff-status',  icon: Activity },
    { label: 'Inventory',    path: '/staff/inventory',     icon: Package },
    { label: 'Cash Counter', path: '/staff/cash',          icon: Wallet },
    { label: 'Attendance',   path: '/staff/attendance',    icon: Clock },
    { label: unread > 0 ? `Notifications (${unread > 9 ? '9+' : unread})` : 'Notifications', path: '/staff/notifications', icon: Bell },
  ];

  const staffMenu = [
    { label: 'Home',           path: '/staff',               icon: LayoutDashboard },
    { label: 'Service History',path: '/staff/history',       icon: Scissors },
    { label: 'My Salary',      path: '/staff/salary',        icon: IndianRupee },
    { label: 'Attendance',     path: '/staff/attendance',    icon: Clock },
    { label: unread > 0 ? `Notifications (${unread > 9 ? '9+' : unread})` : 'Notifications', path: '/staff/notifications', icon: Bell },
  ];

  const menuItems = isReceptionist ? receptionistMenu : staffMenu;

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <Sidebar menuItems={menuItems} title={isReceptionist ? "Reception" : "Staff Panel"} mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)} collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)} />

      <div className={`min-h-screen transition-all duration-300 ${collapsed ? 'lg:ml-0' : 'lg:ml-64'}`}
        onClick={() => { if (!collapsed) setCollapsed(true); }}>

        <header style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: 'rgba(250,250,248,0.88)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          height: 56, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={(e) => { e.stopPropagation(); if (window.innerWidth >= 1024) setCollapsed(!collapsed); else setMobileOpen(true); }}
              style={{ padding: 8, marginLeft: -8, color: '#1a1a1a', background: 'none', border: 'none', cursor: 'pointer' }}>
              <Menu size={20} />
            </button>
            {/* Subtle user greeting on desktop */}
            <span className="hidden sm:block" style={{ fontSize: 13, fontWeight: 500, color: '#999' }}>
              {user?.name?.split(' ')[0]}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
            {toast && (
              <span className="hidden sm:flex" style={{
                fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 20,
                background: toast.ok ? '#ECFDF5' : '#FEF2F2',
                color: toast.ok ? '#065F46' : '#991B1B',
                border: `1px solid ${toast.ok ? '#A7F3D0' : '#FECACA'}`,
                animation: 'fadeIn 0.25s ease',
              }}>
                {toast.text}
              </span>
            )}

            {isClocked ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', animation: 'pulse 2s infinite' }} />
                  <span className="hidden sm:inline">{fmtTime(clockedAt)}</span>
                  {elapsed && <span style={{ opacity: 0.5 }}>· {elapsed}</span>}
                </div>
                <button onClick={handleClockOut} disabled={clocking} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '5px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B',
                  cursor: 'pointer', opacity: clocking ? 0.5 : 1,
                }}>
                  {clocking ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
                  <span className="hidden sm:inline">Out</span>
                </button>
              </div>
            ) : !salonOpen ? (
              <span title={salonMsg} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                background: '#F5F5F3', color: '#aaa',
              }}>
                Closed
              </span>
            ) : (
              <button onClick={handleClockIn} disabled={clocking} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534',
                cursor: 'pointer', opacity: clocking ? 0.5 : 1,
              }}>
                {clocking ? <Loader2 size={12} className="animate-spin" /> : <LogIn size={12} />}
                Clock In
              </button>
            )}
          </div>
        </header>

        {/* Mobile toast - shown below header */}
        {toast && (
          <div className="sm:hidden" style={{
            padding: '8px 20px', background: toast.ok ? '#ECFDF5' : '#FEF2F2',
            borderBottom: `1px solid ${toast.ok ? '#A7F3D0' : '#FECACA'}`,
            fontSize: 12, fontWeight: 600, color: toast.ok ? '#065F46' : '#991B1B',
            textAlign: 'center', animation: 'fadeIn 0.2s ease',
          }}>
            {toast.text}
          </div>
        )}

        <main className="glm-page-main" style={{ maxWidth: isReceptionist ? 1400 : 720, margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:none } }
      `}</style>

      {/* ── Mobile bottom nav ── */}
      <MobileBottomNav menuItems={menuItems} />
    </div>
  );
};

export default StaffLayout;