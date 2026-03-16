import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import { motion } from 'framer-motion';
import { Users, Search, RefreshCw, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  cardBg: '#FDFAF4', ink: '#1A1208', inkMid: '#5C4A2A', inkLight: '#9C8660',
  border: '#DFD0A8', gold: '#B8860B', goldPale: '#FFF8E7',
  green: '#15803D', greenPale: '#DCFCE7', greenBorder: '#86EFAC',
  purple: '#5B21B6', purplePale: '#F5F3FF', purpleBorder: '#DDD6FE',
  blue: '#1D4ED8', bluePale: '#EFF6FF', blueBorder: '#BFDBFE',
  amber: '#92400E', amberPale: '#FFFBEB', amberBorder: '#FDE68A',
  red: '#991B1B', redPale: '#FEF2F2',
};

const ROLE_BADGE = {
  super_admin:       { label: 'Super Admin',       color: C.purple, bg: C.purplePale, border: C.purpleBorder },
  franchise_owner:   { label: 'Franchise Owner',   color: C.blue,   bg: C.bluePale,   border: C.blueBorder   },
  franchise_manager: { label: 'Franchise Mgr',     color: C.blue,   bg: C.bluePale,   border: C.blueBorder   },
  admin:             { label: 'Admin',              color: C.gold,   bg: C.goldPale,   border: C.border       },
  receptionist:      { label: 'Receptionist',       color: C.amber,  bg: C.amberPale,  border: C.amberBorder  },
  staff:             { label: 'Staff',              color: C.green,  bg: C.greenPale,  border: C.greenBorder  },
  customer:          { label: 'Customer',           color: '#374151',bg: '#F9FAFB',    border: '#E5E7EB'       },
};

const AV_COLORS = [C.gold, C.purple, C.blue, C.green, C.amber];
const avColor   = (name = '') => AV_COLORS[name.charCodeAt(0) % AV_COLORS.length] || C.gold;

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 34 }) => {
  const color = avColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.25, flexShrink: 0,
      background: `linear-gradient(135deg, ${color}40, ${color}20)`,
      border: `1px solid ${color}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 600, color: color,
    }}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
};

// ─── Role Badge ───────────────────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const b = ROLE_BADGE[role] || ROLE_BADGE.customer;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: b.bg, color: b.color, border: `1px solid ${b.border}`, whiteSpace: 'nowrap' }}>
      {b.label}
    </span>
  );
};

// ─── User Card (Mobile) ───────────────────────────────────────────────────────
const UserCard = ({ user, i }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.04 }}
    style={{
      background: C.cardBg, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: '14px 16px',
      boxShadow: '0 2px 8px rgba(28,23,18,0.04)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <Avatar name={user.name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
        <div style={{ fontSize: 12, color: C.inkLight, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
      </div>
      <RoleBadge role={user.role} />
    </div>
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
      {user.salonId?.name && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: C.inkMid }}>
          <Building2 size={12} /> {user.salonId.name}
        </div>
      )}
      {user.createdAt && (
        <div style={{ fontSize: 11, color: C.inkLight }}>
          Joined {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      )}
    </div>
  </motion.div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const SuperAdminUsers = () => {
  const [users,      setUsers]      = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const LIMIT = 30;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search)     params.set('search', search);
      if (roleFilter) params.set('role',   roleFilter);
      const { data } = await api.get(`/superadmin/users?${params}`);
      setUsers(data.users);
      setTotal(data.pagination.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.ceil(total / LIMIT);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 600, color: C.ink, margin: 0 }}>Users</h1>
        <p style={{ fontSize: 13, color: C.inkLight, marginTop: 3 }}>{total} total users across all salons</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 200px', minWidth: 0, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.inkLight, pointerEvents: 'none' }} />
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email…"
            style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.cardBg, fontSize: 13, color: C.ink, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          style={{ padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.cardBg, fontSize: 13, color: C.ink, outline: 'none', flex: '0 1 auto' }}>
          <option value="">All Roles</option>
          {Object.entries(ROLE_BADGE).map(([r, b]) => <option key={r} value={r}>{b.label}</option>)}
        </select>
        <button onClick={load} style={{ padding: '9px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.cardBg, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: C.inkMid, flexShrink: 0 }}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* ── Desktop Table ── */}
      <div className="sa-users-desktop" style={{ background: C.cardBg, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 2px 12px rgba(28,23,18,0.05)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.inkLight }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', opacity: 0.4 }} />
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.inkLight }}>
            <Users size={36} style={{ opacity: 0.25, marginBottom: 12 }} />
            <p>No users found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}`, background: '#FAFAF7' }}>
                  {['Name', 'Email', 'Role', 'Salon', 'Joined'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 600, color: C.inkLight, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <motion.tr
                    key={u._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.025 }}
                    style={{ borderBottom: i < users.length - 1 ? `1px solid ${C.border}` : 'none', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFAF5'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={u.name} size={32} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: C.inkMid }}>{u.email}</td>
                    <td style={{ padding: '12px 16px' }}><RoleBadge role={u.role} /></td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: C.inkLight }}>{u.salonId?.name || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: C.inkLight, whiteSpace: 'nowrap' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Mobile Cards ── */}
      <div className="sa-users-mobile">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.inkLight }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', opacity: 0.4 }} />
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.inkLight }}>
            <Users size={32} style={{ opacity: 0.25, marginBottom: 12 }} />
            <p>No users found</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {users.map((u, i) => <UserCard key={u._id} user={u} i={i} />)}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.cardBg, cursor: page === 1 ? 'not-allowed' : 'pointer', color: C.inkMid, opacity: page === 1 ? 0.4 : 1 }}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 13, color: C.inkMid }}>Page {page} of {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
            style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.cardBg, cursor: page === pages ? 'not-allowed' : 'pointer', color: C.inkMid, opacity: page === pages ? 0.4 : 1 }}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .sa-users-desktop { display: block; }
        .sa-users-mobile  { display: none; }
        @media (max-width: 600px) {
          .sa-users-desktop { display: none; }
          .sa-users-mobile  { display: block; }
        }
      `}</style>
    </div>
  );
};

export default SuperAdminUsers;
