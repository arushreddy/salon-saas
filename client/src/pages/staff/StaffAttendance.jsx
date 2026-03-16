import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Calendar, ChevronLeft, ChevronRight, Loader2,
  CheckCircle2, XCircle, AlertCircle, Minus, Sun, Coffee,
  LogIn, LogOut,
} from 'lucide-react';
import api from '@/services/api';

const fade = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } } };
const stagger = (d = 0.04) => ({ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: d } } });

const STATUS = {
  present: { label: 'Present', color: '#166534', bg: '#F0FDF4', border: '#BBF7D0', dot: '#22C55E', icon: CheckCircle2 },
  late: { label: 'Late', color: '#92400E', bg: '#FFFBEB', border: '#FDE68A', dot: '#F59E0B', icon: AlertCircle },
  absent: { label: 'Absent', color: '#991B1B', bg: '#FEF2F2', border: '#FECACA', dot: '#EF4444', icon: XCircle },
  'half-day': { label: 'Half Day', color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE', dot: '#3B82F6', icon: Minus },
  leave: { label: 'Leave', color: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE', dot: '#7C3AED', icon: Sun },
  holiday: { label: 'Holiday', color: '#B8860B', bg: '#FBF6EE', border: '#F0E6D0', dot: '#B8860B', icon: Coffee },
};

const fmtHM = mins => { if (!mins) return '—'; const h = Math.floor(Math.abs(mins) / 60), m = Math.abs(mins) % 60; return h > 0 ? `${h}h ${m}m` : `${m}m`; };
const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DayCell = ({ day, record, isToday, onClick }) => {
  if (!day) return <div />;
  const cfg = record ? (STATUS[record.status] || STATUS.present) : null;
  return (
    <button onClick={() => record && onClick(record)} style={{
      aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', borderRadius: 8, fontSize: 12, fontWeight: 600,
      background: cfg ? cfg.bg : isToday ? '#FBF6EE' : 'transparent',
      border: `1px solid ${cfg ? cfg.border : isToday ? '#F0E6D0' : 'transparent'}`,
      color: cfg ? cfg.color : isToday ? '#B8860B' : '#aaa',
      cursor: record ? 'pointer' : 'default', transition: 'all 0.15s',
    }}>
      <span>{day}</span>
      {(cfg || isToday) && <span style={{ width: 4, height: 4, borderRadius: 2, marginTop: 2, background: cfg ? cfg.dot : '#B8860B' }} />}
    </button>
  );
};

const RecordDetail = ({ record, onClose }) => {
  if (!record) return null;
  const cfg = STATUS[record.status] || STATUS.present;
  const Icon = cfg.icon;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
      style={{ background: '#fff', border: `1px solid ${cfg.border}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: cfg.bg, borderBottom: `1px solid ${cfg.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={15} style={{ color: cfg.color }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
          <span style={{ fontSize: 12, color: cfg.color, opacity: 0.7 }}>
            {new Date(record.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>
        <button onClick={onClose} style={{
          background: `${cfg.color}15`, border: 'none', borderRadius: 6,
          padding: '2px 8px', fontSize: 12, fontWeight: 600, color: cfg.color, cursor: 'pointer',
        }}>✕</button>
      </div>
      <div style={{ padding: 16 }}>
        {record.sessions?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Sessions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {record.sessions.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#FAFAF8', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, color: '#166534' }}>
                    <LogIn size={12} /> {fmtTime(s.clockIn)}
                  </div>
                  <div style={{ flex: 1, height: 1, background: '#e5e5e5' }} />
                  {s.clockOut ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, color: '#991B1B' }}>
                      <LogOut size={12} /> {fmtTime(s.clockOut)}
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#F0FDF4', color: '#166534' }}>Active</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Total Hours', val: fmtHM(record.totalMinutes), color: '#B8860B' },
            { label: 'Overtime', val: fmtHM(record.overtimeMinutes), color: '#6D28D9' },
            { label: 'Late By', val: record.lateByMinutes > 0 ? fmtHM(record.lateByMinutes) : '—', color: '#92400E' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ padding: '10px 8px', background: '#FAFAF8', borderRadius: 8, textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color, fontFamily: "'Playfair Display', serif" }}>{val}</p>
              <p style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>{label}</p>
            </div>
          ))}
        </div>
        {record.notes && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#FAFAF8', borderRadius: 8, fontSize: 13, color: '#666' }}>
            <span style={{ fontWeight: 600, color: '#999' }}>Note: </span>{record.notes}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default function StaffAttendance() {
  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setSelected(null);
    try { const { data: res } = await api.get('/attendance/my', { params: { year, month } }); setData(res); }
    catch {} finally { setLoading(false); }
  }, [year, month]);
  useEffect(() => { load(); }, [load]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const buildGrid = () => {
    const records = data?.records || [];
    const recMap = {};
    records.forEach(r => { recMap[new Date(r.date).toISOString().split('T')[0]] = r; });
    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    let startDow = firstDay.getDay(); startDow = startDow === 0 ? 6 : startDow - 1;
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, record: recMap[key] || null, key });
    }
    return cells;
  };

  const grid = buildGrid();
  const summary = data?.summary || {};
  const todayStr = now.toISOString().split('T')[0];

  return (
    <motion.div variants={stagger()} initial="hidden" animate="show"
      style={{ fontFamily: "'DM Sans', sans-serif", maxWidth: 640 }}>

      <motion.div variants={fade} style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', fontFamily: "'Playfair Display', serif" }}>Attendance</h1>
        <p style={{ fontSize: 13, color: '#999', marginTop: 2 }}>Clock history & monthly summary</p>
      </motion.div>

      {/* Summary KPIs */}
      {!loading && data && (
        <motion.div variants={stagger(0.03)} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Present', val: (summary.present || 0) + (summary.late || 0), cfg: STATUS.present },
            { label: 'Absent', val: summary.absent || 0, cfg: STATUS.absent },
            { label: 'Leave', val: (summary.leave || 0) + (summary.holiday || 0), cfg: STATUS.leave },
          ].map(({ label, val, cfg }) => (
            <motion.div key={label} variants={fade} style={{
              padding: '12px 10px', borderRadius: 10, textAlign: 'center',
              background: cfg.bg, border: `1px solid ${cfg.border}`,
            }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: cfg.color, fontFamily: "'Playfair Display', serif" }}>{val}</p>
              <p style={{ fontSize: 10, fontWeight: 500, color: `${cfg.color}99`, marginTop: 2 }}>{label}</p>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Hours */}
      {!loading && summary.totalMinutes > 0 && (
        <motion.div variants={fade} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Total Hours', val: fmtHM(summary.totalMinutes), color: '#B8860B' },
            { label: 'Overtime', val: fmtHM(summary.overtimeMinutes), color: '#6D28D9' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ padding: '14px 16px', background: '#fff', border: '1px solid #eee', borderRadius: 12 }}>
              <p style={{ fontSize: 18, fontWeight: 700, color, fontFamily: "'Playfair Display', serif" }}>{val}</p>
              <p style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>{label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Calendar */}
      <motion.div variants={fade} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{
          padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#FAFAF8', borderBottom: '1px solid #f3f3f3',
        }}>
          <button onClick={prevMonth} style={{
            width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#fff', border: '1px solid #eee', cursor: 'pointer',
          }}>
            <ChevronLeft size={14} style={{ color: '#666' }} />
          </button>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', fontFamily: "'Playfair Display', serif" }}>
            {MONTHS[month - 1]} {year}
          </p>
          <button onClick={nextMonth}
            disabled={year === now.getFullYear() && month === now.getMonth() + 1}
            style={{
              width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#fff', border: '1px solid #eee', cursor: 'pointer', opacity: (year === now.getFullYear() && month === now.getMonth() + 1) ? 0.3 : 1,
            }}>
            <ChevronRight size={14} style={{ color: '#666' }} />
          </button>
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#bbb', textTransform: 'uppercase', padding: '4px 0' }}>{d}</div>
            ))}
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <Loader2 size={20} className="animate-spin" style={{ color: '#B8860B' }} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {grid.map((cell, i) => cell
                ? <DayCell key={cell.key} day={cell.day} record={cell.record} isToday={cell.key === todayStr} onClick={setSelected} />
                : <div key={i} />
              )}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12, paddingTop: 10, borderTop: '1px solid #f3f3f3' }}>
            {Object.entries(STATUS).map(([key, cfg]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: cfg.dot }} />
                <span style={{ fontSize: 10, fontWeight: 500, color: '#aaa' }}>{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Selected record detail */}
      <AnimatePresence>
        {selected && <RecordDetail record={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}