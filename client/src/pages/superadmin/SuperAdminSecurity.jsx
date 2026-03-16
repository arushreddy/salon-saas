// src/pages/superadmin/SuperAdminSecurity.jsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/services/api';
import {
  Shield, Users, LogOut, RefreshCw, Search, X, AlertTriangle,
  Key, Lock, Activity, Eye, EyeOff, Check, UserX,
} from 'lucide-react';

const C = {
  bg: '#0F0D0B', bgCard: '#1A1613', bgCard2: '#211C16',
  border: 'rgba(212,168,75,0.12)',
  gold: '#D4A84B', goldPale: 'rgba(212,168,75,0.08)',
  ink: '#FAF6EF', inkMid: '#C8B896', inkMuted: 'rgba(250,246,239,0.45)',
  purple: '#A78BFA', purplePale: 'rgba(167,139,250,0.10)',
  green: '#34D399', greenPale: 'rgba(52,211,153,0.10)', greenBorder: 'rgba(52,211,153,0.25)',
  red: '#F87171', redPale: 'rgba(248,113,113,0.10)', redBorder: 'rgba(248,113,113,0.25)',
  blue: '#60A5FA', bluePale: 'rgba(96,165,250,0.10)',
  amber: '#FBBF24', amberPale: 'rgba(251,191,36,0.10)', amberBorder: 'rgba(251,191,36,0.25)',
};

const ROLE_CFG = {
  super_admin:       { label: 'Super Admin',    color: C.purple, bg: C.purplePale },
  admin:             { label: 'Admin',           color: C.gold,   bg: C.goldPale  },
  franchise_owner:   { label: 'Franchise Owner',color: C.blue,   bg: C.bluePale  },
  franchise_manager: { label: 'Franchise Mgr',  color: C.blue,   bg: C.bluePale  },
  receptionist:      { label: 'Receptionist',   color: C.amber,  bg: C.amberPale },
  staff:             { label: 'Staff',           color: C.green,  bg: C.greenPale },
  customer:          { label: 'Customer',        color: C.inkMuted, bg: C.bgCard2 },
};

const fmtDate = (d) => d
  ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

const LIMIT = 30;

export default function SuperAdminSecurity() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: LIMIT });
      if (search)     p.set('search', search);
      if (roleFilter) p.set('role', roleFilter);
      const { data } = await api.get(`/superadmin/users?${p}`);
      setUsers(Array.isArray(data.users) ? data.users : []);
      setTotal(data.pagination?.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const handleForceLogout = async (user) => {
    if (!confirm(`Force logout "${user.name}"? All their sessions will be invalidated.`)) return;
    try {
      await api.post(`/superadmin/users/${user._id}/force-logout`);
      setActionMsg(`✓ ${user.name} has been logged out from all sessions.`);
      setTimeout(() => setActionMsg(''), 4000);
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
  };

  const pages = Math.ceil(total / LIMIT);

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(20px,3vw,27px)', fontWeight: 300, fontStyle: 'italic', color: C.ink, margin: 0 }}>
          Security Center
        </h1>
        <p style={{ fontSize: 13, color: C.inkMuted, margin: '4px 0 0' }}>
          User management, session control, and access tools
        </p>
      </div>

      {/* Action feedback */}
      <AnimatePresence>
        {actionMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              background: C.greenPale, border: `1px solid ${C.greenBorder}`,
              borderRadius: 12, padding: '12px 16px', marginBottom: 16,
              fontSize: 13, color: C.green, display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <Check size={14} /> {actionMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { icon: Users, label: 'Total Users', value: total, color: C.blue, bg: C.bluePale },
          { icon: Shield, label: 'Super Admins', value: users.filter(u => u.role === 'super_admin').length, color: C.purple, bg: C.purplePale },
          { icon: AlertTriangle, label: 'Admins', value: users.filter(u => u.role === 'admin').length, color: C.gold, bg: C.goldPale },
          { icon: Activity, label: 'Shown on page', value: users.length, color: C.green, bg: C.greenPale },
        ].map(({ icon: Icon, label, value, color, bg }, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            style={{ background: C.bgCard, borderRadius: 14, padding: '16px 18px', border: `1px solid ${C.border}` }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Icon size={16} color={color} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.ink }}>{value}</div>
            <div style={{ fontSize: 12, color: C.inkMuted, marginTop: 3 }}>{label}</div>
          </motion.div>
        ))}
      </div>

      {/* User table */}
      <div style={{ background: C.bgCard, borderRadius: 18, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', background: C.bgCard2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: '0 12px', height: 36, flex: '1 1 200px', maxWidth: 300 }}>
            <Search size={13} color={C.inkMuted} />
            <input
              placeholder="Search users…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: C.ink }}
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
            style={{ padding: '0 12px', height: 36, borderRadius: 9, fontSize: 12, border: `1px solid ${C.border}`, background: C.bgCard, color: roleFilter ? C.ink : C.inkMuted }}
          >
            <option value="">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="franchise_owner">Franchise Owner</option>
            <option value="receptionist">Receptionist</option>
            <option value="staff">Staff</option>
            <option value="customer">Customer</option>
          </select>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 9, padding: '7px 12px', cursor: 'pointer', fontSize: 12, color: C.inkMid }}>
            <RefreshCw size={12} /> Refresh
          </button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: C.inkMuted }}>{total} total</span>
        </div>

        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px 140px 80px', gap: 0, padding: '10px 16px', borderBottom: `1px solid ${C.border}`, background: C.bgCard2 }}>
          {['User', 'Salon', 'Role', 'Created', 'Actions'].map((h, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 700, color: C.inkMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <RefreshCw size={18} color={C.gold} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ color: C.inkMuted, fontSize: 13 }}>Loading users…</span>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Users size={32} color={C.border} style={{ margin: '0 auto 12px', display: 'block' }} />
            <div style={{ color: C.inkMuted, fontSize: 14 }}>No users found</div>
          </div>
        ) : (
          users.map((user, i) => {
            const roleCfg = ROLE_CFG[user.role] || { label: user.role, color: C.inkMuted, bg: C.bgCard2 };
            return (
              <div key={user._id} style={{
                display: 'grid', gridTemplateColumns: '1fr 140px 100px 140px 80px',
                gap: 0, padding: '12px 16px', alignItems: 'center',
                borderBottom: i < users.length - 1 ? `1px solid ${C.border}` : 'none',
                transition: 'background 0.1s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = C.bgCard2}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                  <div style={{ fontSize: 11, color: C.inkMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                </div>
                <div style={{ fontSize: 11, color: C.inkMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.salonId?.name || '—'}
                </div>
                <div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: roleCfg.color,
                    background: roleCfg.bg, borderRadius: 20, padding: '2px 8px',
                  }}>
                    {roleCfg.label}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: C.inkMuted }}>
                  {fmtDate(user.createdAt)}
                </div>
                <div>
                  {user.role !== 'super_admin' && (
                    <button
                      onClick={() => handleForceLogout(user)}
                      title="Force logout all sessions"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 10px', borderRadius: 8,
                        background: C.redPale, border: `1px solid ${C.redBorder}`,
                        color: C.red, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      }}
                    >
                      <LogOut size={11} />
                      Logout
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 8 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{
            padding: '7px 14px', borderRadius: 9, background: C.bgCard, border: `1px solid ${C.border}`, color: C.inkMid, cursor: 'pointer', fontSize: 12,
          }}>Prev</button>
          <span style={{ fontSize: 12, color: C.inkMuted }}>Page {page} of {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages} style={{
            padding: '7px 14px', borderRadius: 9, background: C.bgCard, border: `1px solid ${C.border}`, color: C.inkMid, cursor: 'pointer', fontSize: 12,
          }}>Next</button>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}