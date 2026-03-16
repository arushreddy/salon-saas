// src/pages/superadmin/SuperAdminFranchises.jsx
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import api from '@/services/api';
import {
  GitBranch, Search, RefreshCw, Building2, Users, ChevronLeft, ChevronRight,
} from 'lucide-react';

const C = {
  bg: '#0F0D0B', bgCard: '#1A1613', bgCard2: '#211C16',
  border: 'rgba(212,168,75,0.12)',
  gold: '#D4A84B', goldPale: 'rgba(212,168,75,0.08)',
  ink: '#FAF6EF', inkMid: '#C8B896', inkMuted: 'rgba(250,246,239,0.45)',
  purple: '#A78BFA', purplePale: 'rgba(167,139,250,0.10)',
  green: '#34D399', greenPale: 'rgba(52,211,153,0.10)', greenBorder: 'rgba(52,211,153,0.25)',
  blue: '#60A5FA', bluePale: 'rgba(96,165,250,0.10)',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const AvatarInitials = ({ name, size = 44, color = C.purple }) => (
  <div style={{
    width: size, height: size, borderRadius: Math.floor(size * 0.28),
    background: `${color}18`, border: `1px solid ${color}30`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: Math.floor(size * 0.36), fontWeight: 700, color, flexShrink: 0,
  }}>
    {(name || '?').charAt(0).toUpperCase()}
  </div>
);

const LIMIT = 20;

export default function SuperAdminFranchises() {
  const [franchises, setFranchises] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: LIMIT });
      if (search) p.set('search', search);
      const { data } = await api.get(`/superadmin/franchises?${p}`);
      setFranchises(Array.isArray(data.franchises) ? data.franchises : []);
      setTotal(data.pagination?.total || 0);
    } catch (e) { console.error(e); setFranchises([]); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.ceil(total / LIMIT);

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(20px,3vw,27px)', fontWeight: 300, fontStyle: 'italic', color: C.ink, margin: 0 }}>
          Franchise Management
        </h1>
        <p style={{ fontSize: 13, color: C.inkMuted, margin: '4px 0 0' }}>
          {total} franchise{total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Search */}
      <div style={{
        background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`,
        padding: '12px 14px', marginBottom: 16,
        display: 'flex', gap: 10, alignItems: 'center',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: C.bgCard2, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '0 12px', height: 38, flex: '1 1 240px', maxWidth: 340,
        }}>
          <Search size={14} color={C.inkMuted} />
          <input
            placeholder="Search franchises…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: C.ink }}
          />
        </div>
        <button onClick={load} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: C.bgCard2, border: `1px solid ${C.border}`,
          borderRadius: 9, padding: '7px 13px', cursor: 'pointer',
          fontSize: 12, color: C.inkMid,
        }}>
          <RefreshCw size={12} />
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: C.inkMuted }}>{total} results</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '28vh', gap: 10 }}>
          <RefreshCw size={20} color={C.gold} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ color: C.inkMuted }}>Loading franchises…</span>
        </div>
      ) : franchises.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: C.bgCard, borderRadius: 18, border: `1px solid ${C.border}`,
        }}>
          <GitBranch size={36} color={C.border} style={{ margin: '0 auto 14px', display: 'block' }} />
          <div style={{ color: C.inkMuted, fontSize: 14 }}>No franchises found</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 16 }}>
            {franchises.map((f, i) => (
              <motion.div
                key={f._id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{
                  background: C.bgCard, border: `1px solid ${C.border}`,
                  borderRadius: 18, padding: '20px', cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.purple + '50'}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                  <AvatarInitials name={f.name} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div style={{ fontSize: 12, color: C.inkMuted }}>{f.slug}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: C.bgCard2, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.blue }}>{f.branchCount || 0}</div>
                    <div style={{ fontSize: 11, color: C.inkMuted, marginTop: 2 }}>Branches</div>
                  </div>
                  <div style={{ background: C.bgCard2, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.inkMid }}>{f.owner?.name || '—'}</div>
                    <div style={{ fontSize: 11, color: C.inkMuted, marginTop: 2 }}>Owner</div>
                  </div>
                </div>

                {f.owner?.email && (
                  <div style={{ marginTop: 12, fontSize: 11, color: C.inkMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.owner.email}
                  </div>
                )}

                <div style={{ marginTop: 12, fontSize: 11, color: C.inkMuted }}>
                  Created {fmtDate(f.createdAt)}
                </div>
              </motion.div>
            ))}
          </div>

          {pages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 20, gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9,
                background: C.bgCard, border: `1px solid ${C.border}`, color: C.inkMid, cursor: 'pointer', fontSize: 12,
              }}>
                <ChevronLeft size={13} /> Prev
              </button>
              <span style={{ fontSize: 12, color: C.inkMuted }}>Page {page} of {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9,
                background: C.bgCard, border: `1px solid ${C.border}`, color: C.inkMid, cursor: 'pointer', fontSize: 12,
              }}>
                Next <ChevronRight size={13} />
              </button>
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}