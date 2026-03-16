import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, Search, Loader2, Clock, ChevronDown, ChevronUp, Calendar, Tag } from 'lucide-react';
import api from '@/services/api';

const fade = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.28 } } };
const stagger = (d = 0.04) => ({ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: d } } });

const PERIODS = [{ key: 'today', label: 'Today' }, { key: 'week', label: 'Week' }, { key: 'month', label: 'Month' }, { key: 'year', label: 'Year' }];

const CAT_COLORS = {
  hair: '#B8860B', skin: '#E879A0', nails: '#C084FC', makeup: '#F472B6',
  spa: '#34D399', bridal: '#F59E0B', grooming: '#60A5FA', combo: '#A78BFA',
};

const fmtT = t => { try { return new Date(`2000-01-01T${t}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }); } catch { return t || ''; } };

const ST = {
  completed: { label: 'Completed', bg: '#F0FDF4', color: '#166534' },
  confirmed: { label: 'Confirmed', bg: '#EFF6FF', color: '#1E40AF' },
  'in-progress': { label: 'In Progress', bg: '#FFFBEB', color: '#92400E' },
  cancelled: { label: 'Cancelled', bg: '#FEF2F2', color: '#991B1B' },
};

const dateLabel = (dateStr) => {
  const IST = 5.5 * 60 * 60 * 1000;
  const todayStr = new Date(Date.now() + IST).toISOString().split('T')[0];
  const yestStr = new Date(Date.now() + IST - 86400000).toISOString().split('T')[0];
  if (dateStr === todayStr) return 'Today';
  if (dateStr === yestStr) return 'Yesterday';
  return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

const BookingRow = ({ b }) => {
  const [open, setOpen] = useState(false);
  const st = ST[b.status] || ST.completed;
  const catColor = CAT_COLORS[b.service?.category] || '#B8860B';

  return (
    <div style={{ background: '#fff', border: `1px solid ${open ? '#d4d4d4' : '#eee'}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.15s' }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
      }}>
        {/* Category dot */}
        <div style={{ width: 4, height: 24, borderRadius: 2, background: catColor, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {b.service?.name || '—'}
          </p>
          <p style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
            {b.customer?.name || 'Walk-in'}
            {b.refNo && <span style={{ marginLeft: 6, color: '#B8860B', fontWeight: 600, fontFamily: 'monospace', fontSize: 11 }}>{b.refNo}</span>}
            {b.timeSlot?.start && ` · ${fmtT(b.timeSlot.start)}`}
            {b.service?.duration && ` · ${b.service.duration}m`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: st.bg, color: st.color }}>
            {st.label}
          </span>
          {open ? <ChevronUp size={13} style={{ color: '#ccc' }} /> : <ChevronDown size={13} style={{ color: '#ccc' }} />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 16px 14px', borderTop: '1px solid #f3f3f3' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10 }}>
                {[
                  ['Service', b.service?.name],
                  ['Ref No', b.refNo || null],
                  ['Category', b.service?.category ? (b.service.category[0].toUpperCase() + b.service.category.slice(1)) : null],
                  ['Customer', b.customer?.name || 'Walk-in'],
                  ['Duration', b.service?.duration ? `${b.service.duration} min` : null],
                  ['Time', b.timeSlot?.start ? `${fmtT(b.timeSlot.start)} – ${fmtT(b.timeSlot.end)}` : null],
                  ['Type', b.type === 'walk-in' ? 'Walk-in' : 'Online'],
                  b.notes && ['Notes', b.notes],
                ].filter(r => r && r[1]).map(([k, v]) => (
                  <div key={k} style={{ padding: '6px 10px', background: '#FAFAF8', borderRadius: 8 }}>
                    <p style={{ fontSize: 10, color: '#bbb', marginBottom: 1 }}>{k}</p>
                    <p style={{ fontSize: 13, color: '#333', fontWeight: 500 }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function StaffHistory() {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data: res } = await api.get('/staff/my/earnings', { params: { period } }); setData(res); }
    catch {} finally { setLoading(false); }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const bookings = data?.recentBookings || [];
  const totalDone = data?.summary?.totalServices || 0;

  const filtered = useMemo(() => {
    if (!search) return bookings;
    const q = search.toLowerCase();
    return bookings.filter(b => (b.customer?.name || '').toLowerCase().includes(q) || (b.service?.name || '').toLowerCase().includes(q));
  }, [bookings, search]);

  // Group by date
  const grouped = useMemo(() => {
    const IST = 5.5 * 60 * 60 * 1000;
    const map = {};
    filtered.forEach(b => {
      const d = new Date(new Date(b.date).getTime() + IST).toISOString().split('T')[0];
      if (!map[d]) map[d] = [];
      map[d].push(b);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  // Top services by count only (no revenue)
  const topServices = data?.topServices?.slice(0, 3) || [];

  return (
    <motion.div variants={stagger()} initial="hidden" animate="show" style={{ fontFamily: "'DM Sans',sans-serif" }}>

      <motion.div variants={fade} style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', fontFamily: "'Playfair Display',serif" }}>Service History</h1>
        <p style={{ fontSize: 13, color: '#999', marginTop: 2 }}>
          {totalDone > 0 ? `${totalDone} service${totalDone !== 1 ? 's' : ''} completed` : 'Your completed services'}
        </p>
        <div style={{ display: 'flex', gap: 5, marginTop: 12 }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: period === p.key ? '#1a1a1a' : '#fff',
              color: period === p.key ? '#fff' : '#777',
              border: `1px solid ${period === p.key ? '#1a1a1a' : '#e5e5e5'}`,
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {p.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Top Services chips */}
      {topServices.length > 0 && (
        <motion.div variants={fade} style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {topServices.map((s, i) => (
            <span key={s.name} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: '#fff', border: '1px solid #eee', color: '#555',
            }}>
              <span style={{ fontSize: 11 }}>{['🥇', '🥈', '🥉'][i]}</span>
              {s.name} <span style={{ color: '#bbb' }}>· {s.count}×</span>
            </span>
          ))}
        </motion.div>
      )}

      {/* Search */}
      <motion.div variants={fade} style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#ccc' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search customer or service…"
          style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, border: '1px solid #eee', fontSize: 14, color: '#333', background: '#fff', outline: 'none' }}
          onFocus={e => e.target.style.borderColor = '#ccc'} onBlur={e => e.target.style.borderColor = '#eee'} />
      </motion.div>

      {/* Date-grouped list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 50 }}>
          <Loader2 size={22} className="animate-spin" style={{ color: '#B8860B' }} />
        </div>
      ) : grouped.length === 0 ? (
        <motion.div variants={fade} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 14, padding: '48px 20px', textAlign: 'center' }}>
          <Scissors size={26} style={{ color: '#e5e5e5', margin: '0 auto 10px' }} />
          <p style={{ fontWeight: 600, color: '#aaa' }}>{search ? 'No results' : 'No services this period'}</p>
          <p style={{ fontSize: 13, color: '#ccc', marginTop: 4 }}>{search ? 'Try different keywords' : 'Completed appointments show here'}</p>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {grouped.map(([date, items]) => (
            <div key={date}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#aaa', padding: '8px 4px 4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {dateLabel(date)} <span style={{ fontWeight: 400, color: '#ccc' }}>· {items.length}</span>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map((b, i) => <BookingRow key={b._id || i} b={b} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}