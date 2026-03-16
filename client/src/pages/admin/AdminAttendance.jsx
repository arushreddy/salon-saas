import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Calendar, Users, Download, Search, ChevronLeft, ChevronRight,
  CheckCircle2, AlertCircle, XCircle, Loader2, RefreshCw, LogIn, LogOut,
  UserCheck, Timer, IndianRupee, Minus, Sun, Coffee, Check, X,
  BarChart3, List, Grid3X3, Activity,
} from 'lucide-react';
import api from '@/services/api';

const C = {
  bg: '#F4EDE0', card: '#FFFDF7', cardAlt: '#FDF8EE',
  gold: '#B8860B', goldLight: '#D4A017', goldPale: '#FFF8E7', goldDeep: '#8B6914',
  ink: '#1A1208', inkMid: '#5C4A2A', inkLight: '#9C8660', inkGhost: '#C8B090',
  border: '#DFD0A8', borderLight: '#EDE5C8',
  green: '#065F46', greenPale: '#ECFDF5', greenBorder: '#A7F3D0',
  red: '#991B1B', redPale: '#FEF2F2', redBorder: '#FECACA',
  amber: '#92400E', amberPale: '#FFFBEB', amberBorder: '#FDE68A',
  blue: '#1E40AF', bluePale: '#EFF6FF', blueBorder: '#BFDBFE',
  purple: '#6D28D9', purplePale: '#F5F3FF', purpleBorder: '#DDD6FE',
  gray: '#374151', grayPale: '#F9FAFB', grayBorder: '#E5E7EB',
};

const ST = {
  present:    { label: 'Present',  dot: '#10B981', bg: C.greenPale,  border: C.greenBorder,  text: C.green,  icon: CheckCircle2 },
  late:       { label: 'Late',     dot: '#F59E0B', bg: C.amberPale,  border: C.amberBorder,  text: C.amber,  icon: AlertCircle },
  absent:     { label: 'Absent',   dot: '#EF4444', bg: C.redPale,    border: C.redBorder,    text: C.red,    icon: XCircle },
  'half-day': { label: 'Half Day', dot: '#3B82F6', bg: C.bluePale,   border: C.blueBorder,   text: C.blue,   icon: Minus },
  leave:      { label: 'Leave',    dot: '#7C3AED', bg: C.purplePale, border: C.purpleBorder, text: C.purple, icon: Sun },
  holiday:    { label: 'Holiday',  dot: '#9CA3AF', bg: C.grayPale,   border: C.grayBorder,   text: C.gray,   icon: Coffee },
};

const IST = 5.5 * 3600000;
const todayKey = () => new Date(Date.now() + IST).toISOString().split('T')[0];
const fmtHM = m => { if (!m || m <= 0) return '—'; const h = Math.floor(m / 60), r = m % 60; return h > 0 ? `${h}h ${r}m` : `${r}m`; };
const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
const fmtRs = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const monthLabel = (y, m) => new Date(`${y}-${String(m).padStart(2, '0')}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
const fade = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.22 } } };
const stag = (d = 0.04) => ({ hidden: {}, show: { transition: { staggerChildren: d } } });

function Pill({ status, size = 'sm' }) {
  const s = ST[status] || ST.absent;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: size === 'lg' ? '4px 12px' : '2px 8px', borderRadius: 100, fontSize: size === 'lg' ? 12 : 10, fontWeight: 700, background: s.bg, border: `1px solid ${s.border}`, color: s.text }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot }} />{s.label}
    </span>
  );
}

function DeductionModal({ record, staffInfo, onClose, onSaved }) {
  const base = staffInfo?.salary?.base || 0;
  const perDay = base > 0 ? base / 26 : 0;
  const perHalf = perDay / 2;
  const [mode, setMode] = useState('auto');
  const [type, setType] = useState('full');
  const [manual, setManual] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const amt = mode === 'auto' ? Math.round(type === 'full' ? perDay : perHalf) : Number(manual) || 0;
  const staffName = staffInfo?.name || record.staff?.name || 'Staff';

  const save = async () => {
    if (amt <= 0) return;
    setSaving(true);
    try {
      await api.post('/attendance/deduction', {
        staffId: record.staff?._id || record.staff,
        date: new Date(record.date).toISOString().split('T')[0],
        attendanceId: record._id, amount: amt, mode,
        autoType: mode === 'auto' ? type : null,
        reason: reason || `${ST[record.status]?.label || record.status} deduction`,
      });
      setSaved(true);
      setTimeout(() => { onSaved(); onClose(); }, 900);
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const dateStr = new Date(record.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(26,18,8,0.72)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92 }} onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 460, background: C.card, borderRadius: 24, boxShadow: '0 40px 100px rgba(26,18,8,0.45)', border: `1px solid ${C.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 40px)' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, background: `linear-gradient(135deg,${C.redPale},#FFF5F5)`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: `linear-gradient(135deg,${C.red},#DC2626)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IndianRupee size={16} color="#fff" />
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: C.ink, fontFamily: "'Playfair Display',serif" }}>Salary Deduction</p>
                <p style={{ fontSize: 11, color: C.inkMid }}>{staffName} · {dateStr}</p>
              </div>
            </div>
            <div style={{ marginLeft: 46 }}><Pill status={record.status} size="lg" /></div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, border: `1px solid ${C.border}`, background: C.card, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={13} style={{ color: C.inkMid }} />
          </button>
        </div>
        <div style={{ padding: '22px 24px', overflowY: 'auto', flex: 1 }}>
          {saved ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.greenPale, border: `2px solid ${C.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Check size={24} style={{ color: C.green }} />
              </div>
              <p style={{ fontSize: 16, fontWeight: 800, color: C.green }}>Deduction Applied!</p>
              <p style={{ fontSize: 12, color: C.inkLight, marginTop: 4 }}>{fmtRs(amt)} deducted from {staffName}'s salary</p>
            </div>
          ) : (
            <>
              {base > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
                  {[{ l: 'Base Salary', v: fmtRs(base), c: C.gold }, { l: 'Per Day (÷26)', v: fmtRs(Math.round(perDay)), c: C.amber }, { l: 'Half Day', v: fmtRs(Math.round(perHalf)), c: C.blue }].map(({ l, v, c }) => (
                    <div key={l} style={{ padding: '10px 12px', borderRadius: 12, background: C.cardAlt, border: `1px solid ${C.border}`, textAlign: 'center' }}>
                      <p style={{ fontSize: 15, fontWeight: 800, color: c, fontFamily: "'Playfair Display',serif" }}>{v}</p>
                      <p style={{ fontSize: 9, fontWeight: 600, color: C.inkLight, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{l}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: C.amberPale, border: `1px solid ${C.amberBorder}`, marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: C.amber, fontWeight: 600 }}>⚠ No base salary set. Use manual mode.</p>
                </div>
              )}
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.inkLight, marginBottom: 8 }}>Deduction Mode</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[['auto', '⚡ Auto (from salary)'], ['manual', '✏️ Manual amount']].map(([v, l]) => (
                  <button key={v} onClick={() => setMode(v)} style={{ padding: '11px 14px', borderRadius: 12, border: `1.5px solid ${mode === v ? C.gold : C.border}`, background: mode === v ? C.goldPale : C.card, color: mode === v ? C.goldDeep : C.inkMid, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{l}</button>
                ))}
              </div>
              {mode === 'auto' ? (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.inkLight, marginBottom: 8 }}>Deduction Type</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[['full', '1 Full Day', Math.round(perDay)], ['half', '½ Half Day', Math.round(perHalf)]].map(([v, l, a]) => (
                      <button key={v} onClick={() => setType(v)} style={{ padding: '14px', borderRadius: 12, border: `1.5px solid ${type === v ? C.red : C.border}`, background: type === v ? C.redPale : C.card, cursor: 'pointer', textAlign: 'left' }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: type === v ? C.red : C.inkMid }}>{l}</p>
                        <p style={{ fontSize: 18, fontWeight: 800, color: type === v ? C.red : C.gold, fontFamily: "'Playfair Display',serif", marginTop: 4 }}>{fmtRs(a)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: C.inkLight, marginBottom: 6 }}>Amount (₹)</label>
                  <div style={{ display: 'flex', alignItems: 'center', borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.card, overflow: 'hidden' }}>
                    <span style={{ padding: '10px 14px', background: C.goldPale, borderRight: `1px solid ${C.border}`, fontSize: 14, fontWeight: 800, color: C.gold }}>₹</span>
                    <input type="number" min="0" value={manual} onChange={e => setManual(e.target.value)} placeholder="Enter amount" style={{ flex: 1, padding: '10px 14px', border: 'none', outline: 'none', fontSize: 15, fontWeight: 700, color: C.ink, background: 'transparent' }} />
                  </div>
                </div>
              )}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: C.inkLight, marginBottom: 6 }}>Reason (optional)</label>
                <input value={reason} onChange={e => setReason(e.target.value)} placeholder={`Deduction for ${record.status}…`}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, fontSize: 12, color: C.ink, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ padding: '14px 18px', borderRadius: 14, background: amt > 0 ? C.redPale : C.grayPale, border: `1px solid ${amt > 0 ? C.redBorder : C.grayBorder}`, marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 11, color: amt > 0 ? C.red : C.gray, fontWeight: 600 }}>Total deduction</p>
                  <p style={{ fontSize: 10, color: C.inkLight, marginTop: 2 }}>{staffName} · {monthLabel(new Date(record.date).getFullYear(), new Date(record.date).getMonth() + 1)}</p>
                </div>
                <p style={{ fontSize: 26, fontWeight: 800, color: amt > 0 ? C.red : C.gray, fontFamily: "'Playfair Display',serif" }}>{amt > 0 ? fmtRs(amt) : '—'}</p>
              </div>
              <button onClick={save} disabled={saving || amt <= 0}
                style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', cursor: saving || amt <= 0 ? 'not-allowed' : 'pointer', background: amt > 0 ? `linear-gradient(135deg,${C.red},#DC2626)` : C.grayBorder, color: '#fff', fontSize: 13, fontWeight: 700, opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <IndianRupee size={14} />}
                {saving ? 'Applying…' : `Apply ${amt > 0 ? fmtRs(amt) : ''} Deduction`}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function MonthCalendar({ records, year, month, onDayClick, selectedDate }) {
  const daysInMonth = new Date(year, month, 0).getDate();
  let startDow = new Date(year, month - 1, 1).getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;
  const today = todayKey();
  const recMap = {};
  records.forEach(r => { recMap[new Date(r.date).toISOString().split('T')[0]] = r; });
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ d, key, rec: recMap[key] || null });
  }

  return (
    <div style={{ background: C.card, borderRadius: 20, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: `linear-gradient(135deg,${C.goldPale},#FFF5D6)`, borderBottom: `1px solid ${C.border}` }}>
        {DAYS.map(d => <div key={d} style={{ padding: '10px 4px', textAlign: 'center', fontSize: 10, fontWeight: 800, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, padding: '10px 10px 6px', background: '#FAF5EC' }}>
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} style={{ aspectRatio: '1' }} />;
          const { d, key, rec } = cell;
          const isToday = key === today, isSel = key === selectedDate;
          const s = rec ? ST[rec.status] : null;
          return (
            <motion.button key={key} onClick={() => onDayClick(key, rec)} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
              style={{
                aspectRatio: '1', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative',
                background: isSel ? `linear-gradient(135deg,${C.gold},${C.goldLight})` : s ? s.bg : isToday ? C.goldPale : C.card,
                border: `2px solid ${isSel ? C.goldDeep : isToday ? C.gold : s ? s.border : C.borderLight}`,
                cursor: 'pointer', minHeight: 40, transition: 'all 0.15s',
                boxShadow: isSel ? `0 4px 14px ${C.gold}40` : 'none',
              }}>
              <span style={{ fontSize: 13, fontWeight: isSel || isToday ? 800 : 600, color: isSel ? '#fff' : s ? s.text : isToday ? C.gold : C.inkLight }}>{d}</span>
              {s && !isSel && <span style={{ width: 4, height: 4, borderRadius: '50%', background: s.dot, marginTop: 2 }} />}
              {rec?.deduction > 0 && !isSel && <span style={{ position: 'absolute', top: 2, right: 3, width: 6, height: 6, borderRadius: '50%', background: C.red, border: '1px solid white' }} />}
            </motion.button>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '10px 14px', borderTop: `1px solid ${C.border}`, background: C.cardAlt }}>
        {Object.entries(ST).map(([k, s]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: s.dot }} />
            <span style={{ fontSize: 10, color: C.inkLight, fontWeight: 500 }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DayPanel({ dateKey, record, staffInfo, onClose, onDeduct, onRefresh }) {
  const [newStatus, setNewStatus] = useState(record?.status || 'absent');
  const [saving, setSaving] = useState(false);
  const [localRecord, setLocalRecord] = useState(record);

  useEffect(() => { setLocalRecord(record); setNewStatus(record?.status || 'absent'); }, [record]);

  const s = ST[localRecord?.status || 'absent'] || ST.absent;
  const sessions = localRecord?.sessions || [];
  const canDeduct = ['absent', 'half-day', 'late'].includes(localRecord?.status);

  const handleMark = async (status) => {
    setSaving(true);
    try {
      await api.post('/attendance/mark', { staffId: localRecord?.staff?._id || localRecord?.staff || staffInfo?._id, date: dateKey, status });
      setLocalRecord(r => ({ ...r, status })); setNewStatus(status); onRefresh();
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const dateLabel = new Date(dateKey + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      style={{ background: C.card, borderRadius: 20, border: `1.5px solid ${s.border}`, overflow: 'hidden', position: 'sticky', top: 16 }}>
      <div style={{ padding: '16px 20px', background: s.bg, borderBottom: `1px solid ${s.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 800, color: s.text, fontFamily: "'Playfair Display',serif", marginBottom: 6 }}>{dateLabel}</p>
          <Pill status={localRecord?.status || 'absent'} size="lg" />
          {staffInfo?.name && <p style={{ fontSize: 11, color: s.text, opacity: 0.7, marginTop: 4 }}>{staffInfo.name}</p>}
        </div>
        <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${s.border}`, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={12} style={{ color: s.text }} />
        </button>
      </div>
      <div style={{ padding: '16px 20px' }}>
        {sessions.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.inkLight, marginBottom: 8 }}>Sessions ({sessions.length})</p>
            {sessions.map((ss, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: C.greenPale, border: `1px solid ${C.greenBorder}`, marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.inkLight, background: 'white', padding: '2px 6px', borderRadius: 6 }}>#{i + 1}</span>
                <LogIn size={11} style={{ color: C.green }} /><span style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{fmtTime(ss.clockIn)}</span>
                <span style={{ color: C.inkLight, fontSize: 10 }}>→</span>
                <LogOut size={11} style={{ color: C.red }} /><span style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{ss.clockOut ? fmtTime(ss.clockOut) : <span style={{ color: C.green, fontSize: 11 }}>Active</span>}</span>
                {ss.durationMinutes > 0 && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: C.gold }}>{fmtHM(ss.durationMinutes)}</span>}
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginTop: 8 }}>
              {[{ l: 'Total', v: fmtHM(localRecord?.totalMinutes), c: C.gold }, { l: 'Overtime', v: fmtHM(localRecord?.overtimeMinutes), c: C.purple }, { l: 'Late By', v: localRecord?.lateByMinutes > 0 ? fmtHM(localRecord?.lateByMinutes) : '—', c: C.amber }].map(({ l, v, c }) => (
                <div key={l} style={{ padding: '8px', borderRadius: 8, background: C.cardAlt, border: `1px solid ${C.border}`, textAlign: 'center' }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: c, fontFamily: "'Playfair Display',serif" }}>{v}</p>
                  <p style={{ fontSize: 9, color: C.inkLight }}>{l}</p>
                </div>
              ))}
            </div>
            {localRecord?.deduction > 0 && (
              <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: C.redPale, border: `1px solid ${C.redBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: C.red, fontWeight: 600 }}>Deduction applied</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.red }}>{fmtRs(localRecord.deduction)}</span>
              </div>
            )}
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.inkLight, marginBottom: 8 }}>Change Status</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
            {Object.entries(ST).map(([k, cfg]) => (
              <button key={k} onClick={() => setNewStatus(k)}
                style={{ padding: '5px 10px', borderRadius: 100, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${newStatus === k ? cfg.dot : C.border}`, background: newStatus === k ? cfg.bg : C.card, color: newStatus === k ? cfg.text : C.inkMid }}>
                {cfg.label}
              </button>
            ))}
          </div>
          {newStatus !== (localRecord?.status || 'absent') && (
            <button onClick={() => handleMark(newStatus)} disabled={saving}
              style={{ width: '100%', padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${C.gold},${C.goldLight})`, color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Save as {ST[newStatus]?.label}
            </button>
          )}
        </div>
        {canDeduct && (
          <button onClick={() => onDeduct(localRecord || { staff: staffInfo, date: new Date(dateKey), status: newStatus, sessions: [] })}
            style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1.5px solid ${C.redBorder}`, background: C.redPale, color: C.red, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <IndianRupee size={13} /> Apply Salary Deduction
          </button>
        )}
      </div>
    </motion.div>
  );
}

function SummaryCard({ s, onSelect, active }) {
  const total = s.present + s.late + s.absent + s.halfDay + s.leave;
  const pct = total > 0 ? Math.round(((s.present + s.late) / total) * 100) : 0;
  const color = pct >= 80 ? C.green : pct >= 60 ? C.amber : C.red;
  return (
    <motion.div variants={fade} onClick={() => onSelect(s.staff?._id)} whileHover={{ y: -3, boxShadow: `0 8px 30px ${C.gold}20` }}
      style={{ background: active ? C.goldPale : C.card, border: `1.5px solid ${active ? C.gold : C.border}`, borderRadius: 18, padding: '16px 18px', cursor: 'pointer', transition: 'all 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 14, background: `linear-gradient(135deg,${C.gold},${C.goldLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
          {(s.staff?.name || '?')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.staff?.name}</p>
          <p style={{ fontSize: 10, color: C.inkLight }}>{s.staff?.phone || 'No phone'}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Playfair Display',serif", lineHeight: 1, color }}>{pct}%</p>
          <p style={{ fontSize: 9, color: C.inkLight }}>attendance</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {[{ k: 'present', v: s.present + s.late, cfg: ST.present }, { k: 'absent', v: s.absent, cfg: ST.absent }, { k: 'halfDay', v: s.halfDay, cfg: ST['half-day'] }, { k: 'leave', v: s.leave, cfg: ST.leave }].filter(x => x.v > 0).map(x => (
          <span key={x.k} style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: x.cfg.bg, border: `1px solid ${x.cfg.border}`, color: x.cfg.text }}>{x.v} {x.cfg.label}</span>
        ))}
      </div>
      <div style={{ height: 5, borderRadius: 3, background: C.border, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: `linear-gradient(90deg,${color},${pct >= 80 ? '#34D399' : pct >= 60 ? '#FCD34D' : '#FCA5A5'})` }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.inkLight }}>
        <span>{fmtHM(s.totalMinutes)} worked</span>
        {(s.totalDeductions || 0) > 0 && <span style={{ color: C.red, fontWeight: 700 }}>−{fmtRs(s.totalDeductions)} deducted</span>}
      </div>
    </motion.div>
  );
}

export default function AdminAttendance() {
  const n = new Date(Date.now() + IST);
  const [year, setYear] = useState(n.getFullYear());
  const [month, setMonth] = useState(n.getMonth() + 1);
  const [staffId, setStaffId] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [salaryMap, setSalaryMap] = useState({});
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('month');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selDate, setSelDate] = useState(null);
  const [selRecord, setSelRecord] = useState(null);
  const [deductRecord, setDeductRecord] = useState(null);
  const [liveStaff, setLiveStaff] = useState([]);
  const [liveSummary, setLiveSummary] = useState(null);

  const fetchLive = useCallback(async () => {
    try { const { data } = await api.get('/staff/live-status'); setLiveStaff(data.staff || []); setLiveSummary(data.summary || null); } catch {}
  }, []);
  useEffect(() => { fetchLive(); const t = setInterval(fetchLive, 30000); return () => clearInterval(t); }, [fetchLive]);

  useEffect(() => {
    api.get('/attendance/staff-list').then(r => {
      const list = r.data.staff || [];
      setStaffList(list);
      const sm = {};
      list.forEach(s => { sm[s._id] = s; });
      setSalaryMap(sm);
    }).catch(() => {});
  }, []);

  const fetchReport = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = { year, month };
      if (staffId) params.staffId = staffId;
      const { data } = await api.get('/attendance/report', { params });
      setRecords(data.records || []);
      setSummary(data.summary || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [year, month, staffId]);
  useEffect(() => { fetchReport(); }, [fetchReport]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const filtered = useMemo(() => {
    let r = records;
    if (statusFilter) r = r.filter(x => x.status === statusFilter);
    if (search) { const q = search.toLowerCase(); r = r.filter(x => x.staff?.name?.toLowerCase().includes(q) || x.staff?.phone?.includes(q)); }
    return r;
  }, [records, search, statusFilter]);

  const byDate = useMemo(() => {
    const map = {};
    filtered.forEach(r => { const ds = new Date(r.date).toISOString().split('T')[0]; if (!map[ds]) map[ds] = []; map[ds].push(r); });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const overall = useMemo(() => ({
    present: summary.reduce((s, x) => s + x.present, 0),
    late: summary.reduce((s, x) => s + x.late, 0),
    absent: summary.reduce((s, x) => s + x.absent, 0),
    halfDay: summary.reduce((s, x) => s + x.halfDay, 0),
    leave: summary.reduce((s, x) => s + x.leave, 0),
    totalMinutes: summary.reduce((s, x) => s + x.totalMinutes, 0),
    totalDeductions: summary.reduce((s, x) => s + (x.totalDeductions || 0), 0),
  }), [summary]);

  const exportCSV = () => {
    const rows = [['Date', 'Staff', 'Status', 'Clock In', 'Clock Out', 'Total Hours', 'Deduction', 'Notes']];
    records.forEach(r => {
      const ss = r.sessions || []; const fi = ss[0]?.clockIn; const lo = ss.filter(s => s.clockOut).slice(-1)[0]?.clockOut;
      rows.push([new Date(r.date).toISOString().split('T')[0], `"${r.staff?.name || ''}"`, r.status, fi ? fmtTime(fi) : '', lo ? fmtTime(lo) : '', fmtHM(r.totalMinutes), r.deduction || 0, `"${r.notes || ''}"`]);
    });
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })); a.download = `attendance_${year}_${String(month).padStart(2, '0')}.csv`; a.click();
  };

  const currentStaff = staffList.find(s => s._id === staffId);
  const staffForPanel = staffId ? salaryMap[staffId] : selRecord ? salaryMap[selRecord.staff?._id || selRecord.staff] : null;

  return (
    <motion.div variants={stag()} initial="hidden" animate="show" style={{ fontFamily: "'DM Sans',sans-serif", maxWidth: 1140, margin: '0 auto', paddingBottom: 40 }}>

      <style>{`
        @media (max-width: 860px) {
          .glm-att-split { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 560px) {
          .glm-att-3col { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Hero Header */}
      <motion.div variants={fade} style={{ borderRadius: 24, padding: '24px 28px', marginBottom: 20, background: 'linear-gradient(135deg,#1c1408,#2d2010,#1a0e06)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'repeating-linear-gradient(45deg,#B8860B 0,#B8860B 1px,transparent 0,transparent 50%)', backgroundSize: '14px 14px' }} />
        <div style={{ position: 'absolute', top: -30, right: -30, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle,${C.gold}20 0%,transparent 70%)` }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Activity size={11} style={{ color: '#F0D878' }} />
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#F0D878' }}>Attendance Command Centre</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', fontFamily: "'Playfair Display',serif", margin: 0 }}>
              {staffId ? (currentStaff?.name || 'Staff') : 'All Staff'} · {monthLabel(year, month)}
            </h1>
            <p style={{ fontSize: 12, color: '#7a6040', marginTop: 4 }}>Monthly overview · Day view · Salary deductions · Live floor</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[{ l: 'Present', v: overall.present + overall.late, dot: '#10B981' }, { l: 'Late', v: overall.late, dot: '#F59E0B' }, { l: 'Absent', v: overall.absent, dot: '#EF4444' }, { l: 'Half Day', v: overall.halfDay, dot: '#3B82F6' }, { l: 'Leave', v: overall.leave, dot: '#7C3AED' }].map(p => (
              <div key={p.l} style={{ textAlign: 'center', padding: '8px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: p.dot, lineHeight: 1, fontFamily: "'Playfair Display',serif" }}>{p.v}</p>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{p.l}</p>
              </div>
            ))}
            {overall.totalDeductions > 0 && (
              <div style={{ textAlign: 'center', padding: '8px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#FCA5A5', lineHeight: 1, fontFamily: "'Playfair Display',serif" }}>{fmtRs(overall.totalDeductions)}</p>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Deducted</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Live Floor */}
      {liveStaff.length > 0 && (
        <motion.div variants={fade} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.inkMid }}>Live Floor</p>
            </div>
            {liveSummary && (
              <div style={{ display: 'flex', gap: 6 }}>
                {[['available', '#10B981', '#ECFDF5', '#065F46'], ['busy', '#F59E0B', '#FFFBEB', '#92400E'], ['absent', '#EF4444', '#FEF2F2', '#991B1B']].map(([k, dot, bg, text]) => (
                  <span key={k} style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: bg, color: text, border: `1px solid ${dot}33`, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot }} />
                    {liveSummary[k === 'absent' ? 'absent' : k === 'busy' ? 'busy' : 'available']} {k}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 18px' }}>
            {liveStaff.map(s => {
              const cfg = { available: { dot: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', label: 'Available' }, busy: { dot: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', label: 'Busy' }, 'off-duty': { dot: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB', text: '#374151', label: 'Off' }, absent: { dot: '#EF4444', bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', label: 'Absent' } }[s.liveStatus] || { dot: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB', text: '#374151', label: 'Off' };
              return (
                <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{s.name}</span>
                  <span style={{ fontSize: 10, color: cfg.text }}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Controls */}
      <motion.div variants={fade} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <button onClick={prevMonth} style={{ padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer' }}><ChevronLeft size={14} style={{ color: C.inkMid }} /></button>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.ink, padding: '0 4px', whiteSpace: 'nowrap' }}>{monthLabel(year, month)}</span>
          <button onClick={nextMonth} style={{ padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer' }}><ChevronRight size={14} style={{ color: C.inkMid }} /></button>
        </div>
        <select value={staffId} onChange={e => { setStaffId(e.target.value); setSelDate(null); setSelRecord(null); }}
          style={{ padding: '8px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, fontSize: 12, fontWeight: 700, color: C.ink, outline: 'none', cursor: 'pointer' }}>
          <option value="">All Staff</option>
          {staffList.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
          <Search size={12} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.inkLight }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff…"
            style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, fontSize: 12, color: C.ink, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[['', 'All'], ['absent', 'Absent'], ['late', 'Late'], ['half-day', 'Half Day'], ['leave', 'Leave']].map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              style={{ padding: '6px 12px', borderRadius: 100, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: `1px solid ${statusFilter === v ? C.gold : C.border}`, background: statusFilter === v ? C.goldPale : C.card, color: statusFilter === v ? C.goldDeep : C.inkMid }}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          {[['month', <Grid3X3 size={12} />, 'Month'], ['day', <List size={12} />, 'Day List'], ['summary', <BarChart3 size={12} />, 'Summary']].map(([v, icon, l]) => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: '8px 12px', fontSize: 11, border: 'none', cursor: 'pointer', background: view === v ? C.gold : C.card, color: view === v ? '#fff' : C.inkMid, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
              {icon}{l}
            </button>
          ))}
        </div>
        <button onClick={() => fetchReport()} disabled={loading} style={{ width: 36, height: 36, borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw size={13} style={{ color: C.inkMid }} className={loading ? 'animate-spin' : ''} />
        </button>
        <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 12, border: 'none', background: C.gold, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
          <Download size={12} /> Export
        </button>
      </motion.div>

      {/* KPI Row */}
      <motion.div variants={fade} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { l: 'Hours Worked', v: fmtHM(overall.totalMinutes), icon: Timer, c: C.gold, bg: C.goldPale },
          { l: 'Present', v: overall.present + overall.late, icon: UserCheck, c: C.green, bg: C.greenPale },
          { l: 'Absent', v: overall.absent, icon: XCircle, c: C.red, bg: C.redPale },
          { l: 'Half Days', v: overall.halfDay, icon: Minus, c: C.blue, bg: C.bluePale },
          { l: 'Leave', v: overall.leave, icon: Sun, c: C.purple, bg: C.purplePale },
          { l: 'Deductions', v: fmtRs(overall.totalDeductions), icon: IndianRupee, c: C.red, bg: C.redPale },
        ].map(({ l, v, icon: Icon, c, bg }) => (
          <motion.div key={l} variants={fade} style={{ borderRadius: 14, padding: '12px 14px', background: bg, border: `1.5px solid ${c}20` }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${c}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
              <Icon size={13} style={{ color: c }} />
            </div>
            <p style={{ fontSize: 18, fontWeight: 800, color: c, fontFamily: "'Playfair Display',serif", lineHeight: 1 }}>{v}</p>
            <p style={{ fontSize: 9, fontWeight: 700, color: `${c}88`, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3 }}>{l}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, background: `linear-gradient(135deg,${C.gold},${C.goldLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={22} style={{ color: '#fff' }} className="animate-spin" />
          </div>
          <p style={{ fontSize: 13, color: C.inkLight }}>Loading attendance data…</p>
        </div>

      ) : view === 'summary' ? (
        <motion.div variants={stag(0.05)} initial="hidden" animate="show" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 12 }}>
          {summary.length === 0 ? (
            <div style={{ gridColumn: '1/-1', padding: '60px', textAlign: 'center', background: C.card, borderRadius: 16, border: `1px solid ${C.border}` }}>
              <Users size={32} style={{ color: C.border, margin: '0 auto 12px' }} />
              <p style={{ color: C.inkLight }}>No data for this period</p>
            </div>
          ) : summary.map((s, i) => (
            <SummaryCard key={i} s={s} onSelect={id => { setStaffId(id); setView('month'); }} active={staffId === s.staff?._id} />
          ))}
        </motion.div>

      ) : view === 'month' ? (
        <div className="glm-att-split" style={{ display: 'grid', gridTemplateColumns: selDate ? '1fr 340px' : '1fr', gap: 16, alignItems: 'start' }}>
          <div>
            {staffId ? (
              <MonthCalendar records={records} year={year} month={month}
                onDayClick={(key, rec) => { setSelDate(key); setSelRecord(rec || null); }} selectedDate={selDate} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {byDate.length === 0 ? (
                  <div style={{ padding: '60px', textAlign: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: 16 }}>
                    <Calendar size={28} style={{ color: C.border, margin: '0 auto 12px' }} />
                    <p style={{ color: C.inkLight }}>No records found</p>
                  </div>
                ) : byDate.map(([ds, dayRecs]) => {
                  const dateObj = new Date(ds + 'T12:00:00');
                  const dLabel = dateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
                  const counts = dayRecs.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
                  return (
                    <div key={ds} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}`, background: C.cardAlt, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Calendar size={13} style={{ color: C.gold }} />
                          <p style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{dLabel}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {Object.entries(counts).map(([st, cnt]) => { const cfg = ST[st] || ST.absent; return <span key={st} style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text }}>{cnt} {cfg.label}</span>; })}
                        </div>
                      </div>
                      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {dayRecs.map(r => {
                          const isAbs = ['absent', 'half-day', 'late'].includes(r.status);
                          const isSel = selDate === ds && selRecord?._id === r._id;
                          return (
                            <motion.div key={r._id} onClick={() => { setSelDate(ds); setSelRecord(r); }} whileHover={{ background: C.goldPale }}
                              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: isSel ? C.goldPale : C.card, border: `1px solid ${isSel ? C.gold : C.border}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                              <div style={{ width: 34, height: 34, borderRadius: 11, background: `linear-gradient(135deg,${C.gold},${C.goldLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                                {(r.staff?.name || '?')[0].toUpperCase()}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{r.staff?.name}</p>
                                <p style={{ fontSize: 11, color: C.inkLight }}>
                                  {r.sessions?.length > 0 ? `${fmtTime(r.sessions[0]?.clockIn)} – ${r.sessions.slice(-1)[0]?.clockOut ? fmtTime(r.sessions.slice(-1)[0]?.clockOut) : 'Active'}` : r.status}
                                  {r.totalMinutes > 0 ? ` · ${fmtHM(r.totalMinutes)}` : ''}
                                </p>
                              </div>
                              <Pill status={r.status} />
                              {r.deduction > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: C.red, padding: '2px 7px', borderRadius: 8, background: C.redPale, border: `1px solid ${C.redBorder}` }}>−{fmtRs(r.deduction)}</span>}
                              {isAbs && (
                                <button onClick={e => { e.stopPropagation(); setDeductRecord(r); }}
                                  style={{ padding: '4px 10px', borderRadius: 8, border: `1.5px solid ${C.redBorder}`, background: C.redPale, color: C.red, fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                                  Deduct
                                </button>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <AnimatePresence>
            {selDate && (
              <DayPanel dateKey={selDate} record={selRecord} staffInfo={staffForPanel}
                onClose={() => { setSelDate(null); setSelRecord(null); }}
                onDeduct={r => setDeductRecord(r)}
                onRefresh={() => fetchReport(true)} />
            )}
          </AnimatePresence>
        </div>

      ) : (
        /* Day List View */
        <motion.div variants={stag(0.04)} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: 16 }}>
              <p style={{ color: C.inkLight }}>No records found</p>
            </div>
          ) : filtered.map(r => {
            const ss = r.sessions || [];
            const fi = ss[0]?.clockIn;
            const lo = ss.filter(s => s.clockOut).slice(-1)[0]?.clockOut;
            const isAbs = ['absent', 'half-day', 'late'].includes(r.status);
            const ds = new Date(r.date).toISOString().split('T')[0];
            return (
              <motion.div key={r._id} variants={fade}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, cursor: 'pointer', transition: 'all 0.15s' }}
                onClick={() => { setSelDate(ds); setSelRecord(r); setView('month'); }}
                onMouseEnter={e => e.currentTarget.style.background = C.cardAlt}
                onMouseLeave={e => e.currentTarget.style.background = C.card}>
                <div style={{ minWidth: 52, textAlign: 'center', flexShrink: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: C.gold, fontFamily: "'Playfair Display',serif" }}>{new Date(ds + 'T12:00:00').getDate()}</p>
                  <p style={{ fontSize: 9, fontWeight: 700, color: C.inkLight, textTransform: 'uppercase' }}>{new Date(ds + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', month: 'short' })}</p>
                </div>
                <div style={{ width: 1, height: 32, background: C.border, flexShrink: 0 }} />
                {!staffId && (
                  <>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg,${C.gold},${C.goldLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {(r.staff?.name || '?')[0].toUpperCase()}
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: C.ink, width: 90, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.staff?.name}</p>
                  </>
                )}
                <Pill status={r.status} />
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  {fi && <span style={{ fontSize: 11, color: C.inkMid, display: 'flex', alignItems: 'center', gap: 4 }}><LogIn size={10} style={{ color: C.green }} />{fmtTime(fi)}</span>}
                  {lo && <span style={{ fontSize: 11, color: C.inkMid, display: 'flex', alignItems: 'center', gap: 4 }}><LogOut size={10} style={{ color: C.red }} />{fmtTime(lo)}</span>}
                  {r.totalMinutes > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: C.gold }}>{fmtHM(r.totalMinutes)}</span>}
                </div>
                {r.deduction > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: C.red, padding: '2px 7px', borderRadius: 8, background: C.redPale, border: `1px solid ${C.redBorder}` }}>−{fmtRs(r.deduction)}</span>}
                {isAbs && (
                  <button onClick={e => { e.stopPropagation(); setDeductRecord(r); }}
                    style={{ padding: '5px 10px', borderRadius: 8, border: `1.5px solid ${C.redBorder}`, background: C.redPale, color: C.red, fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                    Deduct
                  </button>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <AnimatePresence>
        {deductRecord && (
          <DeductionModal record={deductRecord} staffInfo={salaryMap[deductRecord.staff?._id || deductRecord.staff]}
            onClose={() => setDeductRecord(null)} onSaved={() => fetchReport(true)} />
        )}
      </AnimatePresence>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </motion.div>
  );
}