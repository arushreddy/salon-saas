import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Loader2, Users, Phone, Mail, Calendar, IndianRupee,
  Sparkles, ChevronRight, X, Star, ShoppingBag, TrendingUp,
  MessageCircle, UserCheck, UserX, Download, Eye,
  Clock, Gift, BarChart2, Crown, Flame, RefreshCw,
  Plus, Tag, CheckCircle2, AlertCircle, Zap,
  MoreVertical, Edit2, Trash2, Filter, Hash,
  ArrowUpRight, Repeat, Target, Award, PlusCircle,
  Heart, Send, Copy, Check, ChevronDown, Wallet,
  LayoutGrid, LayoutList, Printer, Activity, Bell,
  ChevronUp, SlidersHorizontal, UserPlus, Percent,
} from 'lucide-react';
import api from '@/services/api';
import { useDataStore } from '@/context/DataStore';

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════
const C = {
  pageBg: '#F4EDE0',
  cardBg: '#FDFAF4',
  heroBg: '#0E0B06',
  heroBg2: '#1C1608',
  gold: '#B8860B',
  goldLight: '#DAA520',
  goldBright: '#F0C040',
  goldPale: '#FFF8E7',
  goldDeep: '#8B6914',
  goldGlow: 'rgba(218,165,32,0.18)',
  ink: '#1A1208',
  inkMid: '#5C4A2A',
  inkLight: '#9C8660',
  inkGhost: '#C8B090',
  border: '#DFD0A8',
  borderMid: '#C9B07A',
  cream: '#FDF8F0',
  creamMid: '#F7EFD8',
  creamDark: '#EDE0C0',
  green: '#15803D',
  greenPale: '#DCFCE7',
  greenBorder: '#86EFAC',
  red: '#991B1B',
  redPale: '#FEF2F2',
  redBorder: '#FECACA',
  amber: '#92400E',
  amberPale: '#FFFBEB',
  amberBorder: '#FDE68A',
  blue: '#1D4ED8',
  bluePale: '#EFF6FF',
  blueBorder: '#BFDBFE',
  white: '#FFFFFF',
  wa: '#25D366',
  waPale: '#D7F5E0',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Rs = n => Number(n || 0).toLocaleString('en-IN');
const fmtRs = n => `₹${Rs(n)}`;
const fmtK = n => {
  if (!n) return '₹0';
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${Rs(n)}`;
};
const fmtDt = d => { try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return '—'; } };
const fmtMo = d => { try { return new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }); } catch { return '—'; } };
const today = () => new Date().toISOString().split('T')[0];
const daysSince = d => { if (!d) return null; return Math.floor((Date.now() - new Date(d)) / (1000 * 60 * 60 * 24)); };
const AV_COLS = ['#B8860B', '#8B6914', '#C9952A', '#6B4F12', '#DAA520', '#A07830'];
const avCol = (n = '') => AV_COLS[n.charCodeAt(0) % AV_COLS.length];
const initials = (n = '') => n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

// ─── Tier engine ──────────────────────────────────────────────────────────────
const getTier = (visits = 0, spend = 0) => {
  if (spend >= 50000 || visits >= 50) return { label: 'VIP', icon: '👑', color: '#8A6400', pale: C.goldPale, gradient: `linear-gradient(135deg,#B8860B,#F0C040)` };
  if (spend >= 15000 || visits >= 15) return { label: 'Regular', icon: '⭐', color: C.green, pale: C.greenPale, gradient: `linear-gradient(135deg,#15803D,#22C55E)` };
  if (visits >= 3) return { label: 'Returning', icon: '🔄', color: C.blue, pale: C.bluePale, gradient: `linear-gradient(135deg,#1D4ED8,#3B82F6)` };
  return { label: 'New', icon: '✨', color: C.inkMid, pale: C.creamMid, gradient: `linear-gradient(135deg,#5C4A2A,#9C8660)` };
};
const tierProgress = (visits = 0, spend = 0) => {
  if (spend >= 50000 || visits >= 50) return 100;
  if (spend >= 15000 || visits >= 15) return Math.min(100, Math.max((visits / 50) * 100, (spend / 50000) * 100));
  if (visits >= 3) return Math.min(100, (visits / 15) * 100);
  return Math.min(100, (visits / 3) * 100);
};

// ─── Risk engine ──────────────────────────────────────────────────────────────
const getRisk = (lastVisit) => {
  const d = daysSince(lastVisit);
  if (d === null || d < 30) return null;
  if (d >= 60) return { label: `${d}d absent`, color: C.red, pale: C.redPale, level: 'high' };
  return { label: `${d}d absent`, color: C.amber, pale: C.amberPale, level: 'medium' };
};

// ─── Loyalty (localStorage) ───────────────────────────────────────────────────
const LP_KEY = 'glamour_loyalty';
const getLoyalty = (id) => { try { return JSON.parse(localStorage.getItem(LP_KEY) || '{}')[id] || { points: 0, history: [] }; } catch { return { points: 0, history: [] }; } };
const saveLoyalty = (id, data) => { try { const all = JSON.parse(localStorage.getItem(LP_KEY) || '{}'); all[id] = data; localStorage.setItem(LP_KEY, JSON.stringify(all)); } catch { } };
const addPoints = (id, pts, reason) => {
  const d = getLoyalty(id);
  d.points = (d.points || 0) + pts;
  d.history = [{ id: `lp_${Date.now()}`, pts, reason, at: new Date().toISOString() }, ...(d.history || [])].slice(0, 30);
  saveLoyalty(id, d);
  return d;
};

// ─── Notes (localStorage) ─────────────────────────────────────────────────────
const NOTES_KEY = (id) => `glamour_cnotes_${id}`;
const getNotes = (id) => { try { return JSON.parse(localStorage.getItem(NOTES_KEY(id)) || '[]'); } catch { return []; } };
const saveNotes = (id, notes) => { try { localStorage.setItem(NOTES_KEY(id), JSON.stringify(notes)); } catch { } };

// ─── Tags (localStorage) ──────────────────────────────────────────────────────
const TAGS_KEY = 'glamour_ctags';
const getCustomerTags = (id) => { try { return (JSON.parse(localStorage.getItem(TAGS_KEY) || '{}'))[id] || []; } catch { return []; } };
const saveCustomerTag = (id, tags) => { try { const all = JSON.parse(localStorage.getItem(TAGS_KEY) || '{}'); all[id] = tags; localStorage.setItem(TAGS_KEY, JSON.stringify(all)); } catch { } };

const PRESET_TAGS = ['VIP', 'Bride', 'Allergic', 'Regular', 'Staff Friend', 'Birthday Soon', 'Price Sensitive', 'Color Expert'];

// ─── Animation variants ───────────────────────────────────────────────────────
const ease = [0.22, 0.61, 0.36, 1];
const fade = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.38, ease } } };
const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.48, ease } } };
const popIn = { hidden: { scale: 0.9, opacity: 0 }, show: { scale: 1, opacity: 1, transition: { type: 'spring', damping: 22, stiffness: 340 } } };
const slideIn = { hidden: { x: 440, opacity: 0 }, show: { x: 0, opacity: 1, transition: { type: 'spring', damping: 28, stiffness: 240 } } };
const stag = (d = 0.05) => ({ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: d } } });

// ═══════════════════════════════════════════════════════════════════════════
// ATOMS
// ═══════════════════════════════════════════════════════════════════════════
const Avatar = ({ name = '', size = 44 }) => (
  <div style={{
    width: size, height: size, borderRadius: size * 0.32, flexShrink: 0,
    background: `linear-gradient(145deg,${avCol(name)},${C.heroBg2})`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, color: '#fff', fontSize: size > 40 ? size * 0.38 : size * 0.42,
    letterSpacing: '0.02em', boxShadow: `0 2px 10px ${avCol(name)}40`,
  }}>
    {initials(name)}
  </div>
);

const TierBadge = ({ visits = 0, spend = 0, size = 'sm' }) => {
  const t = getTier(visits, spend);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: size === 'sm' ? '2px 8px' : '4px 12px',
      borderRadius: 20, fontSize: size === 'sm' ? 10 : 12,
      fontWeight: 700, background: t.pale, color: t.color,
      border: `1px solid ${t.color}30`,
    }}>
      {t.icon} {t.label}
    </span>
  );
};

const LastSeenChip = ({ lastVisit }) => {
  const d = daysSince(lastVisit);
  if (d === null) return <span style={{ fontSize: 11, color: C.inkLight }}>Never visited</span>;
  if (d === 0) return <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>Today ✓</span>;
  const col = d >= 60 ? C.red : d >= 30 ? C.amber : C.inkLight;
  return <span style={{ fontSize: 11, fontWeight: d >= 30 ? 700 : 400, color: col }}>{d}d ago {d >= 30 ? '⚠' : ''}</span>;
};

const StatPill = ({ icon: Icon, value, label, color, pale, active, onClick }) => (
  <motion.button
    whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.98 }}
    onClick={onClick}
    style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
      padding: '16px 18px', borderRadius: 16, cursor: 'pointer',
      background: active ? `linear-gradient(135deg,${color},${color}dd)` : C.white,
      border: `1px solid ${active ? color : C.border}`,
      boxShadow: active ? `0 6px 24px ${color}30` : `0 2px 12px rgba(139,100,0,0.05)`,
      transition: 'all 0.2s ease', flex: 1, minWidth: 110,
    }}>
    <div style={{
      width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
      background: active ? 'rgba(255,255,255,0.2)' : pale, border: `1px solid ${active ? 'rgba(255,255,255,0.3)' : C.border}`,
    }}>
      <Icon size={16} style={{ color: active ? '#fff' : color }} />
    </div>
    <p style={{ fontSize: 20, fontWeight: 800, color: active ? '#fff' : C.ink, fontFamily: "'Playfair Display',serif", lineHeight: 1.1 }}>{value}</p>
    <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: active ? 'rgba(255,255,255,0.7)' : C.inkLight, marginTop: 3 }}>{label}</p>
  </motion.button>
);

const FlashMsg = ({ msg }) => (
  <AnimatePresence>
    {msg?.text && (
      <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }}
        style={{
          padding: '10px 16px', borderRadius: 12, marginBottom: 12, fontSize: 13, fontWeight: 600,
          background: msg.ok ? C.greenPale : C.redPale, color: msg.ok ? C.green : C.red,
          border: `1px solid ${msg.ok ? C.greenBorder : C.redBorder}`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
        {msg.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
        {msg.text}
      </motion.div>
    )}
  </AnimatePresence>
);

const SecHead = ({ children, icon: Icon, action }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      {Icon && (
        <div style={{ width: 22, height: 22, borderRadius: 6, background: C.goldPale, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={11} style={{ color: C.gold }} />
        </div>
      )}
      <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: C.gold }}>{children}</p>
    </div>
    {action}
  </div>
);

// ─── Spend mini bars ───────────────────────────────────────────────────────────
const SpendBars = ({ data = [] }) => {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.v), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 20 }}>
      {data.slice(-7).map((d, i) => (
        <motion.div key={i}
          initial={{ height: 0 }} animate={{ height: `${Math.max((d.v / max) * 100, 10)}%` }}
          transition={{ duration: 0.5, delay: i * 0.04, ease: 'easeOut' }}
          style={{
            flex: 1, minWidth: 3, borderRadius: 2,
            background: `linear-gradient(180deg,${C.gold},${C.goldBright})`,
            opacity: 0.5 + i * 0.07,
          }} />
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SPENDING ANALYTICS TAB
// ═══════════════════════════════════════════════════════════════════════════
const SpendingTab = ({ bookings = [], customer }) => {
  const monthly = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      const mo = fmtMo(b.createdAt);
      map[mo] = (map[mo] || 0) + (b.finalAmount || b.totalAmount || 0);
    });
    return Object.entries(map).slice(-6).map(([m, v]) => ({ m, v }));
  }, [bookings]);

  const services = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      (Array.isArray(b.services) ? b.services : []).forEach(s => {
        const name = s.service?.name || s.name || 'Service';
        map[name] = (map[name] || 0) + 1;
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [bookings]);

  const avgTicket = bookings.length ? Math.round(bookings.reduce((a, b) => a + (b.finalAmount || b.totalAmount || 0), 0) / bookings.length) : 0;
  const totalSpend = bookings.reduce((a, b) => a + (b.finalAmount || b.totalAmount || 0), 0);
  const maxSvc = services[0]?.[1] || 1;

  return (
    <motion.div variants={stag()} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <motion.div variants={fade} className="glm-cust-3col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          [fmtK(totalSpend), 'Lifetime Value', C.gold, C.goldPale],
          [fmtK(avgTicket), 'Avg Ticket', C.green, C.greenPale],
          [bookings.length, 'Total Visits', C.blue, C.bluePale],
        ].map(([v, l, col, bg]) => (
          <div key={l} style={{ borderRadius: 14, padding: '12px 14px', background: bg, border: `1px solid ${col}20`, textAlign: 'center' }}>
            <p style={{ fontSize: 17, fontWeight: 800, color: col, fontFamily: "'Playfair Display',serif" }}>{v}</p>
            <p style={{ fontSize: 10, fontWeight: 600, color: col + 'aa', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{l}</p>
          </div>
        ))}
      </motion.div>

      {monthly.length > 0 && (
        <motion.div variants={fade} style={{ borderRadius: 16, padding: '16px', background: C.white, border: `1px solid ${C.border}` }}>
          <SecHead icon={BarChart2}>Monthly Spend (last 6 months)</SecHead>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
            {monthly.map((d, i) => {
              const max = Math.max(...monthly.map(x => x.v), 1);
              const h = Math.max((d.v / max) * 100, 6);
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: C.gold }}>{d.v > 999 ? `${(d.v / 1000).toFixed(0)}k` : d.v}</span>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${h}%` }}
                    transition={{ duration: 0.7, delay: i * 0.09, ease: 'easeOut' }}
                    style={{ width: '100%', borderRadius: '4px 4px 0 0', background: `linear-gradient(180deg,${C.gold},${C.goldBright})`, minHeight: 4 }} />
                  <span style={{ fontSize: 9, color: C.inkLight }}>{d.m.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {services.length > 0 && (
        <motion.div variants={fade} style={{ borderRadius: 16, padding: '16px', background: C.white, border: `1px solid ${C.border}` }}>
          <SecHead icon={Award}>Favourite Services</SecHead>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {services.map(([name, count], i) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: i === 0 ? C.goldPale : C.creamMid, fontSize: 10, fontWeight: 800, color: i === 0 ? C.gold : C.inkLight,
                }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{name}</p>
                    <p style={{ fontSize: 10, fontWeight: 700, color: C.inkLight }}>{count}×</p>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, overflow: 'hidden', background: C.creamDark }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(count / maxSvc) * 100}%` }}
                      transition={{ duration: 0.6, delay: i * 0.1 }}
                      style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg,${C.gold},${C.goldBright})` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
      {bookings.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <BarChart2 size={28} style={{ color: C.border, margin: '0 auto 10px' }} />
          <p style={{ fontSize: 13, color: C.inkLight }}>No spending data yet</p>
        </div>
      )}
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// LOYALTY TAB
// ═══════════════════════════════════════════════════════════════════════════
const LoyaltyTab = ({ customer, totalSpent = 0, totalBookings = 0 }) => {
  const [loyalty, setLoyalty] = useState(() => getLoyalty(customer._id));
  const [addAmt, setAddAmt] = useState('');
  const [addReason, setAddReason] = useState('');
  const [msg, setMsg] = useState({ text: '', ok: true });
  const tier = getTier(totalBookings, totalSpent);
  const prog = tierProgress(totalBookings, totalSpent);
  const flash = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg({ text: '', ok: true }), 3000); };

  const handleAdd = () => {
    if (!addAmt || Number(addAmt) <= 0) return;
    const d = addPoints(customer._id, Number(addAmt), addReason || 'Manual adjustment');
    setLoyalty({ ...d }); setAddAmt(''); setAddReason('');
    flash(`+${addAmt} points added`);
  };
  const handleRedeem = () => {
    if (loyalty.points <= 0) return;
    const d = addPoints(customer._id, -loyalty.points, 'Redeemed all points');
    setLoyalty({ ...d }); flash('Points redeemed');
  };

  const inpStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`,
    background: C.white, color: C.ink, fontSize: 13, outline: 'none', boxSizing: 'border-box',
    fontFamily: "'DM Sans',sans-serif",
  };

  return (
    <motion.div variants={stag()} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <FlashMsg msg={msg} />
      {/* tier card */}
      <motion.div variants={fade} style={{
        borderRadius: 16, overflow: 'hidden',
        background: tier.gradient, position: 'relative',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.08, backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '14px 14px' }} />
        <div style={{ position: 'relative', padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Current Tier</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#fff', fontFamily: "'Playfair Display',serif" }}>{tier.icon} {tier.label}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 28, fontWeight: 800, color: '#fff', fontFamily: "'Playfair Display',serif", lineHeight: 1 }}>{loyalty.points}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Points</p>
            </div>
          </div>
          {/* progress */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>Progress to {tier.label === 'VIP' ? 'Max' : `next tier`}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>{Math.round(prog)}%</p>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.2)', overflow: 'hidden' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${prog}%` }}
                transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                style={{ height: '100%', borderRadius: 3, background: 'rgba(255,255,255,0.8)' }} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* add points */}
      <motion.div variants={fade} style={{ borderRadius: 16, padding: '16px', background: C.white, border: `1px solid ${C.border}` }}>
        <SecHead icon={Plus}>Add / Adjust Points</SecHead>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input type="number" placeholder="Points to add…" value={addAmt} onChange={e => setAddAmt(e.target.value)}
            style={inpStyle}
            onFocus={e => { e.target.style.borderColor = C.gold; e.target.style.boxShadow = `0 0 0 3px ${C.goldPale}`; }}
            onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }} />
          <input type="text" placeholder="Reason (optional)…" value={addReason} onChange={e => setAddReason(e.target.value)}
            style={inpStyle}
            onFocus={e => { e.target.style.borderColor = C.gold; e.target.style.boxShadow = `0 0 0 3px ${C.goldPale}`; }}
            onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAdd} disabled={!addAmt || Number(addAmt) <= 0}
              style={{
                flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                background: `linear-gradient(135deg,${C.gold},${C.goldBright})`, color: C.ink,
                opacity: !addAmt || Number(addAmt) <= 0 ? 0.4 : 1,
              }}>+ Add Points</button>
            <button onClick={handleRedeem} disabled={loyalty.points <= 0}
              style={{
                flex: 1, padding: '10px', borderRadius: 10, border: `1.5px solid ${C.border}`, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                background: C.white, color: C.inkMid, opacity: loyalty.points <= 0 ? 0.4 : 1,
              }}>Redeem All</button>
          </div>
        </div>
      </motion.div>

      {/* history */}
      {loyalty.history?.length > 0 && (
        <motion.div variants={fade} style={{ borderRadius: 16, padding: '16px', background: C.white, border: `1px solid ${C.border}` }}>
          <SecHead icon={Clock}>Point History</SecHead>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {loyalty.history.slice(0, 8).map((h, i) => (
              <div key={h.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', borderRadius: 10, background: i % 2 === 0 ? C.cardBg : C.white,
              }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{h.reason}</p>
                  <p style={{ fontSize: 10, color: C.inkLight }}>{fmtDt(h.at)}</p>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: h.pts > 0 ? C.green : C.red }}>
                  {h.pts > 0 ? '+' : ''}{h.pts}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// NOTES & TAGS TAB
// ═══════════════════════════════════════════════════════════════════════════
const NotesTagsTab = ({ customer }) => {
  const [notes, setNotesState] = useState(() => getNotes(customer._id));
  const [text, setText] = useState('');
  const [tags, setTagsState] = useState(() => getCustomerTags(customer._id));
  const [newTag, setNewTag] = useState('');
  const [msg, setMsg] = useState({ text: '', ok: true });
  const flash = (t, ok = true) => { setMsg({ text: t, ok }); setTimeout(() => setMsg({ text: '', ok: true }), 3000); };

  const addNote = () => {
    if (!text.trim()) return;
    const n = [{ id: `n_${Date.now()}`, text: text.trim(), at: new Date().toISOString(), author: 'Admin' }, ...notes].slice(0, 20);
    saveNotes(customer._id, n); setNotesState(n); setText(''); flash('Note saved');
  };
  const delNote = (id) => { const n = notes.filter(x => x.id !== id); saveNotes(customer._id, n); setNotesState(n); };
  const toggleTag = (t) => {
    const updated = tags.includes(t) ? tags.filter(x => x !== t) : [...tags, t];
    saveCustomerTag(customer._id, updated); setTagsState(updated);
  };
  const addCustomTag = () => {
    if (!newTag.trim() || tags.includes(newTag.trim())) return;
    const updated = [...tags, newTag.trim()];
    saveCustomerTag(customer._id, updated); setTagsState(updated); setNewTag('');
  };

  const inpStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`,
    background: C.white, color: C.ink, fontSize: 13, outline: 'none', boxSizing: 'border-box',
    fontFamily: "'DM Sans',sans-serif",
  };

  return (
    <motion.div variants={stag()} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <FlashMsg msg={msg} />

      {/* Tags */}
      <motion.div variants={fade} style={{ borderRadius: 16, padding: '16px', background: C.white, border: `1px solid ${C.border}` }}>
        <SecHead icon={Tag}>Customer Tags</SecHead>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {PRESET_TAGS.map(t => (
            <button key={t} onClick={() => toggleTag(t)}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                background: tags.includes(t) ? `linear-gradient(135deg,${C.gold},${C.goldBright})` : C.creamMid,
                color: tags.includes(t) ? '#fff' : C.inkMid,
                border: `1px solid ${tags.includes(t) ? C.gold : C.border}`,
                transition: 'all 0.15s',
              }}>{t}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="text" placeholder="Add custom tag…" value={newTag}
            onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustomTag()}
            style={{ ...inpStyle, flex: 1 }}
            onFocus={e => { e.target.style.borderColor = C.gold; e.target.style.boxShadow = `0 0 0 3px ${C.goldPale}`; }}
            onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }} />
          <button onClick={addCustomTag} disabled={!newTag.trim()}
            style={{
              padding: '9px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: C.ink, color: '#fff', fontSize: 12, fontWeight: 700,
              opacity: !newTag.trim() ? 0.4 : 1,
            }}><Plus size={14} /></button>
        </div>
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
            {tags.map(t => (
              <span key={t} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20,
                fontSize: 11, fontWeight: 700, background: C.goldPale, color: C.gold, border: `1px solid ${C.border}`,
              }}>
                {t}
                <button onClick={() => toggleTag(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <X size={9} style={{ color: C.gold }} />
                </button>
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Add Note */}
      <motion.div variants={fade} style={{ borderRadius: 16, padding: '16px', background: C.white, border: `1px solid ${C.border}` }}>
        <SecHead icon={Edit2}>Staff Notes</SecHead>
        <textarea rows={3} placeholder="Allergy info, preferences, special requirements…"
          value={text} onChange={e => setText(e.target.value)}
          style={{ ...inpStyle, resize: 'none', marginBottom: 8 }}
          onFocus={e => { e.target.style.borderColor = C.gold; e.target.style.boxShadow = `0 0 0 3px ${C.goldPale}`; }}
          onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }} />
        <button onClick={addNote} disabled={!text.trim()}
          style={{
            width: '100%', padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
            background: `linear-gradient(135deg,${C.gold},${C.goldBright})`, color: C.ink,
            opacity: !text.trim() ? 0.4 : 1,
          }}>Save Note</button>
      </motion.div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: 12, color: C.inkLight, padding: '16px 0' }}>No notes yet</p>
      ) : notes.map((n, i) => (
        <motion.div key={n.id} variants={fade}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px',
            borderRadius: 14, background: i % 2 === 0 ? C.white : C.cardBg, border: `1px solid ${C.border}`,
          }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, color: C.ink, lineHeight: 1.5 }}>{n.text}</p>
            <p style={{ fontSize: 10, color: C.inkLight, marginTop: 4 }}>{fmtDt(n.at)} · {n.author}</p>
          </div>
          <button onClick={() => delNote(n.id)} style={{
            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 8, background: C.redPale, border: 'none', cursor: 'pointer', flexShrink: 0,
          }}>
            <X size={10} style={{ color: C.red }} />
          </button>
        </motion.div>
      ))}
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// WHATSAPP PANEL
// ═══════════════════════════════════════════════════════════════════════════
const WA_TEMPLATES = [
  { id: 'welcome', label: 'Welcome Back', icon: '👋', msg: n => `Hi ${n}! Welcome back to Glamour Salon 💛 We've missed you! Book your next session and enjoy 10% off. Reply to book now.` },
  { id: 'bday', label: 'Birthday Wish', icon: '🎂', msg: n => `Happy Birthday ${n}! 🎉 Glamour Salon wishes you a wonderful day. Treat yourself with a special birthday discount — just reply to claim!` },
  { id: 'reengage', label: 'We Miss You', icon: '💝', msg: n => `Hi ${n}! It's been a while and we miss you at Glamour Salon ✂ Come back and pamper yourself — exclusive returning customer offer waiting for you!` },
  { id: 'appt', label: 'Appointment Reminder', icon: '📅', msg: n => `Hi ${n}! Just a friendly reminder about your upcoming appointment at Glamour Salon 💛 See you soon!` },
  { id: 'review', label: 'Request Review', icon: '⭐', msg: n => `Hi ${n}! Thank you for visiting Glamour Salon! We'd love to hear your feedback. Could you spare 2 mins to leave us a review? We truly appreciate it 💛` },
  { id: 'offer', label: 'Special Offer', icon: '🎁', msg: n => `Hi ${n}! 🌟 Exclusive offer just for you from Glamour Salon — this week only! Limited slots available. Reply to know more 💛` },
];

const WhatsAppPanel = ({ customer, onClose }) => {
  const [selected, setSelected] = useState(null);
  const [custom, setCustom] = useState('');
  const [sent, setSent] = useState(false);
  const name = customer.name?.split(' ')[0] || 'there';

  const send = (msg) => {
    const ph = (customer.phone || '').replace(/\D/g, '').slice(-10);
    if (!ph) return;
    window.open(`https://wa.me/91${ph}?text=${encodeURIComponent(msg)}`, '_blank');
    setSent(true);
    setTimeout(() => { setSent(false); onClose(); }, 1500);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(14,11,6,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div variants={popIn} initial="hidden" animate="show" exit="hidden"
        style={{ width: '100%', maxWidth: 440, borderRadius: 24, overflow: 'hidden', background: C.cream, boxShadow: '0 32px 80px rgba(14,11,6,0.35)' }}>

        <div style={{ padding: '18px 20px', background: 'linear-gradient(135deg,#1A7A45,#0D5C2E)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={18} style={{ color: '#fff' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>WhatsApp {name}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>+91 {(customer.phone || '').slice(-10)}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 10, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} style={{ color: '#fff' }} />
          </button>
        </div>

        <div style={{ padding: '16px', maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.gold, marginBottom: 4 }}>Message Templates</p>
          {WA_TEMPLATES.map(t => (
            <button key={t.id} onClick={() => setSelected(selected === t.id ? null : t.id)}
              style={{
                width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
                background: selected === t.id ? C.goldPale : C.white,
                border: `1.5px solid ${selected === t.id ? C.gold : C.border}`,
                transition: 'all 0.15s',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{t.icon} {t.label}</p>
                <ChevronDown size={13} style={{ color: C.inkLight, transform: selected === t.id ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
              </div>
              {selected === t.id && (
                <>
                  <p style={{ fontSize: 12, color: C.inkMid, marginTop: 8, marginBottom: 10, lineHeight: 1.6 }}>{t.msg(name)}</p>
                  <button onClick={e => { e.stopPropagation(); send(t.msg(name)); }}
                    style={{ width: '100%', padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: '#1A7A45', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {sent ? <><Check size={12} /> Sent!</> : <><Send size={12} /> Send this message</>}
                  </button>
                </>
              )}
            </button>
          ))}

          <div style={{ borderRadius: 14, padding: '14px', background: C.white, border: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: C.gold, marginBottom: 8 }}>Custom Message</p>
            <textarea rows={3} value={custom} onChange={e => setCustom(e.target.value)} placeholder="Type a custom message…"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.cardBg, color: C.ink, fontSize: 12, outline: 'none', resize: 'none', marginBottom: 8, fontFamily: "'DM Sans',sans-serif" }} />
            <button onClick={() => custom.trim() && send(custom)} disabled={!custom.trim()}
              style={{ width: '100%', padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: '#1A7A45', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: !custom.trim() ? 0.5 : 1 }}>
              <Send size={11} /> Send Custom
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMER DETAIL DRAWER
// ═══════════════════════════════════════════════════════════════════════════
const CustomerDrawer = ({ customer, onClose, onRefresh }) => {
  const [tab, setTab] = useState('overview');
  const [bookings, setBookings] = useState([]);
  const [loadingB, setLoadingB] = useState(false);
  const [showWA, setShowWA] = useState(false);
  const [msg, setMsg] = useState({ text: '', ok: true });
  const [liveStats, setLiveStats] = useState(null);

  const loyalty = getLoyalty(customer._id);
  const tags = getCustomerTags(customer._id);
  const totalSpent = liveStats?.totalSpent ?? customer.totalSpent ?? 0;
  const totalBookings = liveStats?.totalBookings ?? customer.totalBookings ?? 0;
  const lastVisitDate = liveStats?.lastVisit ?? customer.lastVisit ?? customer.updatedAt;
  const tier = getTier(totalBookings, totalSpent);
  const risk = getRisk(lastVisitDate);

  useEffect(() => {
    (async () => {
      setLoadingB(true);
      try {
        const { data } = await api.get('/bookings', { params: { customer: customer._id, limit: 200 } });
        const bList = data.bookings || [];
        setBookings(bList);
        const completed = bList.filter(b => b.status === 'completed' || b.status === 'paid');
        const spent = completed.reduce((a, b) => a + (b.finalAmount || b.totalAmount || 0), 0);
        const dates = bList.map(b => b.createdAt || b.date).filter(Boolean).sort((a, b) => new Date(b) - new Date(a));
        setLiveStats({ totalSpent: spent, totalBookings: bList.length, lastVisit: dates[0] || null });
      } catch { setBookings([]); }
      finally { setLoadingB(false); }
    })();
  }, [customer._id]);

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'history', label: 'History' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'loyalty', label: 'Loyalty' },
    { id: 'notes', label: 'Notes' },
  ];

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end', background: 'rgba(14,11,6,0.55)', backdropFilter: 'blur(6px)' }}
        onClick={e => e.target === e.currentTarget && onClose()}>

        <motion.div variants={slideIn} initial="hidden" animate="show" exit="hidden"
          style={{ width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', height: '100%', background: C.pageBg }}>

          {/* Header */}
          <div style={{ position: 'relative', overflow: 'hidden', padding: '20px 20px 0', flexShrink: 0, background: `linear-gradient(135deg,${C.heroBg},#2d2510)` }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundImage: 'repeating-linear-gradient(45deg,#B8860B 0,#B8860B 1px,transparent 0,transparent 50%)', backgroundSize: '14px 14px' }} />
            <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle,${C.goldBright}20,transparent)` }} />

            <div style={{ position: 'relative' }}>
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={customer.name} size={52} />
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: "'Playfair Display',serif", lineHeight: 1.2 }}>{customer.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                      <TierBadge visits={totalBookings} spend={totalSpent} />
                      {loyalty.points > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(240,192,64,0.2)', color: C.goldBright }}>
                          🏅 {loyalty.points} pts
                        </span>
                      )}
                      {risk && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(153,27,27,0.3)', color: '#fca5a5' }}>
                          ⚠ {risk.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setShowWA(true)} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(26,122,69,0.3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageCircle size={14} style={{ color: '#86EFAC' }} />
                  </button>
                  <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={14} style={{ color: '#fff' }} />
                  </button>
                </div>
              </div>

              {/* Stats row */}
              <div className="glm-cust-4col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 16 }}>
                {[
                  [fmtK(totalSpent), 'Spent'],
                  [totalBookings, 'Visits'],
                  [loyalty.points, 'Points'],
                  [tags.length, 'Tags'],
                ].map(([v, l]) => (
                  <div key={l} style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 10, background: 'rgba(255,255,255,0.07)' }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', fontFamily: "'Playfair Display',serif" }}>{v}</p>
                    <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.inkGhost, marginTop: 2 }}>{l}</p>
                  </div>
                ))}
              </div>

              {/* Tab bar */}
              <div style={{ display: 'flex', gap: 2, overflowX: 'auto', paddingBottom: 0 }}>
                {TABS.map(({ id, label }) => (
                  <button key={id} onClick={() => setTab(id)}
                    style={{
                      padding: '8px 14px', borderRadius: '10px 10px 0 0', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                      background: tab === id ? C.pageBg : 'transparent',
                      color: tab === id ? C.gold : 'rgba(255,255,255,0.45)',
                      transition: 'all 0.2s',
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 0 }}>
            <AnimatePresence mode="wait">
              {tab === 'overview' && (
                <motion.div key="overview" variants={stag(0.06)} initial="hidden" animate="show" exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                  {/* Contact card */}
                  <motion.div variants={fade} style={{ borderRadius: 16, padding: '14px 16px', background: C.white, border: `1px solid ${C.border}` }}>
                    <SecHead icon={Phone}>Contact Info</SecHead>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {customer.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: C.greenPale, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Phone size={12} style={{ color: C.green }} />
                            </div>
                            <span style={{ fontSize: 13, color: C.ink }}>{customer.phone}</span>
                          </div>
                          <a href={`tel:${customer.phone}`} style={{ fontSize: 11, fontWeight: 700, color: C.green, textDecoration: 'none' }}>Call</a>
                        </div>
                      )}
                      {customer.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: C.bluePale, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Mail size={12} style={{ color: C.blue }} />
                          </div>
                          <span style={{ fontSize: 12, color: C.inkMid }}>{customer.email}</span>
                        </div>
                      )}
                      {customer.createdAt && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: C.goldPale, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Calendar size={12} style={{ color: C.gold }} />
                          </div>
                          <span style={{ fontSize: 12, color: C.inkMid }}>Joined {fmtDt(customer.createdAt)}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Key metrics */}
                  <motion.div variants={fade} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      [fmtK(totalSpent), 'Lifetime Value', C.gold, C.goldPale, IndianRupee],
                      [totalBookings, 'Total Visits', C.blue, C.bluePale, Activity],
                      [fmtDt(lastVisitDate), 'Last Visit', C.green, C.greenPale, Clock],
                      [customer.isActive ? 'Active' : 'Inactive', 'Status', customer.isActive ? C.green : C.red, customer.isActive ? C.greenPale : C.redPale, UserCheck],
                    ].map(([val, lbl, col, bg, Icon]) => (
                      <div key={lbl} style={{ borderRadius: 14, padding: '12px 14px', background: bg, border: `1px solid ${col}20` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <Icon size={12} style={{ color: col }} />
                          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: col + 'bb' }}>{lbl}</p>
                        </div>
                        <p style={{ fontSize: 15, fontWeight: 800, color: col, fontFamily: "'Playfair Display',serif" }}>{val}</p>
                      </div>
                    ))}
                  </motion.div>

                  {/* Tier progress */}
                  <motion.div variants={fade} style={{ borderRadius: 16, padding: '14px 16px', background: C.white, border: `1px solid ${C.border}` }}>
                    <SecHead icon={Crown}>Tier Progress</SecHead>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{tier.icon} {tier.label}</span>
                      <span style={{ fontSize: 11, color: C.inkLight }}>{Math.round(tierProgress(totalBookings, totalSpent))}%</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: C.creamDark, overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${tierProgress(totalBookings, totalSpent)}%` }}
                        transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
                        style={{ height: '100%', borderRadius: 4, background: tier.gradient }} />
                    </div>
                    {tier.label !== 'VIP' && (
                      <p style={{ fontSize: 10, color: C.inkLight, marginTop: 6 }}>
                        Reach {tier.next || 'VIP'} tier with more visits
                      </p>
                    )}
                  </motion.div>

                  {/* Tags */}
                  {tags.length > 0 && (
                    <motion.div variants={fade} style={{ borderRadius: 16, padding: '14px 16px', background: C.white, border: `1px solid ${C.border}` }}>
                      <SecHead icon={Tag}>Tags</SecHead>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {tags.map(t => (
                          <span key={t} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: C.goldPale, color: C.gold, border: `1px solid ${C.border}` }}>{t}</span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {tab === 'history' && (
                <motion.div key="history" variants={stag(0.04)} initial="hidden" animate="show" exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {loadingB ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                      <Loader2 size={24} style={{ color: C.gold, animation: 'spin 1s linear infinite' }} />
                    </div>
                  ) : bookings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <ShoppingBag size={28} style={{ color: C.border, margin: '0 auto 10px' }} />
                      <p style={{ fontSize: 13, color: C.inkLight }}>No visits yet</p>
                    </div>
                  ) : (
                    <>
                      <motion.div variants={fade} style={{ borderRadius: 14, padding: '14px 16px', background: `linear-gradient(135deg,${C.gold},${C.goldBright})`, marginBottom: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Lifetime Value</p>
                            <p style={{ fontSize: 22, fontWeight: 800, color: '#fff', fontFamily: "'Playfair Display',serif" }}>
                              {fmtK(bookings.reduce((a, b) => a + (b.finalAmount || b.totalAmount || 0), 0))}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: 22, fontWeight: 800, color: '#fff', fontFamily: "'Playfair Display',serif" }}>{bookings.length}</p>
                            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Visits</p>
                          </div>
                        </div>
                      </motion.div>
                      {bookings.map((b, i) => {
                        const statusColor = b.status === 'completed' ? C.green : b.status === 'cancelled' ? C.red : C.amber;
                        const statusBg = b.status === 'completed' ? C.greenPale : b.status === 'cancelled' ? C.redPale : C.amberPale;
                        return (
                          <motion.div key={b._id} variants={fade}
                            style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 14, background: i % 2 === 0 ? C.white : C.cardBg, border: `1px solid ${C.border}` }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: statusBg }}>
                              {b.status === 'completed' ? <CheckCircle2 size={15} style={{ color: statusColor }} /> :
                                b.status === 'cancelled' ? <X size={15} style={{ color: statusColor }} /> :
                                  <Clock size={15} style={{ color: statusColor }} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>
                                {Array.isArray(b.services) ? b.services.map(s => s.service?.name || s.name).filter(Boolean).join(', ') : 'Appointment'}
                              </p>
                              <p style={{ fontSize: 10, color: C.inkLight, marginTop: 3 }}>
                                {fmtDt(b.createdAt)}{b.staffName ? ` · ${b.staffName}` : ''}
                              </p>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <p style={{ fontSize: 14, fontWeight: 800, color: C.gold }}>{fmtK(b.finalAmount || b.totalAmount)}</p>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: statusBg, color: statusColor, textTransform: 'capitalize' }}>{b.status}</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </>
                  )}
                </motion.div>
              )}

              {tab === 'analytics' && (
                <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {loadingB ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                      <Loader2 size={24} style={{ color: C.gold, animation: 'spin 1s linear infinite' }} />
                    </div>
                  ) : <SpendingTab bookings={bookings} customer={customer} />}
                </motion.div>
              )}
              {tab === 'loyalty' && (
                <motion.div key="loyalty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <LoyaltyTab customer={customer} totalSpent={totalSpent} totalBookings={totalBookings} />
                </motion.div>
              )}
              {tab === 'notes' && (
                <motion.div key="notes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <NotesTagsTab customer={customer} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showWA && <WhatsAppPanel customer={customer} onClose={() => setShowWA(false)} />}
      </AnimatePresence>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// BULK WA CAMPAIGN MODAL
// ═══════════════════════════════════════════════════════════════════════════
const BulkWAModal = ({ customers, onClose }) => {
  const [tmpl, setTmpl] = useState(WA_TEMPLATES[0]);
  const [sent, setSent] = useState(false);
  const valid = customers.filter(c => c.phone);

  const sendAll = () => {
    valid.forEach((c, i) => {
      const ph = c.phone.replace(/\D/g, '').slice(-10);
      const msg = tmpl.msg(c.name?.split(' ')[0] || 'there');
      setTimeout(() => window.open(`https://wa.me/91${ph}?text=${encodeURIComponent(msg)}`, '_blank'), i * 300);
    });
    setSent(true);
    setTimeout(onClose, 1500);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(14,11,6,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div variants={popIn} initial="hidden" animate="show" exit="hidden"
        style={{ width: '100%', maxWidth: 440, borderRadius: 24, overflow: 'hidden', background: C.cream, boxShadow: '0 32px 80px rgba(14,11,6,0.35)' }}>
        <div style={{ padding: '18px 20px', background: 'linear-gradient(135deg,#1A7A45,#0D5C2E)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>📣 Bulk Campaign</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{valid.length} of {customers.length} have phone numbers</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 10, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} style={{ color: '#fff' }} />
          </button>
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.gold }}>Select Template</p>
          {WA_TEMPLATES.map(t => (
            <button key={t.id} onClick={() => setTmpl(t)}
              style={{
                width: '100%', textAlign: 'left', padding: '11px 14px', borderRadius: 12, cursor: 'pointer',
                background: tmpl.id === t.id ? C.goldPale : C.white,
                border: `1.5px solid ${tmpl.id === t.id ? C.gold : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{t.icon} {t.label}</p>
              {tmpl.id === t.id && <Check size={13} style={{ color: C.gold }} />}
            </button>
          ))}
          <button onClick={sendAll} disabled={valid.length === 0}
            style={{
              width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, marginTop: 4,
              background: sent ? C.greenPale : '#1A7A45', color: sent ? C.green : '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: valid.length === 0 ? 0.5 : 1,
            }}>
            {sent ? <><Check size={14} /> Campaign Sent!</> : <><Send size={14} /> Send to {valid.length} Customers</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMER CARD (Grid)
// ═══════════════════════════════════════════════════════════════════════════
const CustomerCard = ({ customer, selected, onSelect, onView, onWA }) => {
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);
  const risk = getRisk(customer.lastVisit || customer.updatedAt);
  const loyalty = getLoyalty(customer._id);
  const tags = getCustomerTags(customer._id);
  const tier = getTier(customer.totalBookings || 0, customer.totalSpent || 0);

  useEffect(() => {
    const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    if (menu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menu]);

  return (
    <motion.div variants={fade}
      onClick={() => onView(customer)}
      whileHover={{ y: -3, boxShadow: `0 12px 40px rgba(139,100,0,0.12)` }}
      style={{
        borderRadius: 20, background: C.white, border: `1px solid ${selected ? C.gold : C.border}`,
        cursor: 'pointer', overflow: 'hidden', position: 'relative',
        boxShadow: selected ? `0 0 0 2px ${C.gold}40` : '0 2px 12px rgba(139,100,0,0.05)',
        transition: 'all 0.2s ease',
      }}>

      {/* Top accent bar */}
      <div style={{ height: 3, background: tier.gradient }} />

      <div style={{ padding: '14px 14px 12px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
          {/* Checkbox */}
          <div style={{ flexShrink: 0, paddingTop: 2 }} onClick={e => { e.stopPropagation(); onSelect(customer._id); }}>
            <div style={{
              width: 16, height: 16, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
              background: selected ? C.gold : 'transparent', border: `2px solid ${selected ? C.gold : C.border}`,
            }}>
              {selected && <Check size={9} style={{ color: '#fff' }} />}
            </div>
          </div>

          <Avatar name={customer.name} size={42} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: C.ink, fontFamily: "'Playfair Display',serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{customer.name}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
              <TierBadge visits={customer.totalBookings || 0} spend={customer.totalSpent || 0} />
              {loyalty.points > 0 && (
                <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: C.goldPale, color: C.gold }}>🏅{loyalty.points}</span>
              )}
            </div>
          </div>

          {/* Menu */}
          <div ref={menuRef} style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setMenu(v => !v)}
              style={{ width: 28, height: 28, borderRadius: 8, background: C.creamMid, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MoreVertical size={12} style={{ color: C.inkLight }} />
            </button>
            <AnimatePresence>
              {menu && (
                <motion.div initial={{ opacity: 0, scale: 0.88, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.88 }} transition={{ duration: 0.15 }}
                  style={{ position: 'absolute', right: 0, top: 34, borderRadius: 14, padding: '4px', zIndex: 30, minWidth: 150, background: C.white, border: `1px solid ${C.border}`, boxShadow: '0 12px 40px rgba(14,11,6,0.15)' }}>
                  {[
                    [() => { onView(customer); setMenu(false); }, Eye, 'View Profile', C.inkMid],
                    [() => { onWA(customer); setMenu(false); }, MessageCircle, 'WhatsApp', '#1A7A45'],
                    [() => { window.location.href = `tel:${customer.phone}`; }, Phone, 'Call', C.green],
                  ].map(([fn, Icon, lbl, col], i) => (
                    <button key={i} onClick={fn}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, color: col, background: 'none', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = C.creamMid}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <Icon size={12} />{lbl}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Contact */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 10 }}>
          {customer.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.inkLight }}>
              <Phone size={9} />{customer.phone}
            </div>
          )}
          {customer.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.inkLight, overflow: 'hidden' }}>
              <Mail size={9} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.email}</span>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="glm-cust-3col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
          {[
            [fmtK(customer.totalSpent || 0), 'Spent', C.gold, C.goldPale],
            [customer.totalBookings || 0, 'Visits', C.blue, C.bluePale],
            [customer.avgRating > 0 ? `${customer.avgRating?.toFixed(1)}★` : '—', 'Rating', C.amber, C.amberPale],
          ].map(([v, l, col, bg]) => (
            <div key={l} style={{ textAlign: 'center', padding: '6px 4px', borderRadius: 10, background: bg, border: `1px solid ${col}20` }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: col }}>{v}</p>
              <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: col + 'aa' }}>{l}</p>
            </div>
          ))}
        </div>

        {/* Footer row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={9} style={{ color: C.inkLight }} />
            <LastSeenChip lastVisit={customer.lastVisit || customer.updatedAt} />
          </div>
          {risk ? (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: risk.pale, color: risk.color }}>⚠ {risk.label}</span>
          ) : (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: C.greenPale, color: C.green }}>✓ Active</span>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.creamDark}` }}>
            {tags.slice(0, 3).map(t => (
              <span key={t} style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: C.goldPale, color: C.gold }}>{t}</span>
            ))}
            {tags.length > 3 && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: C.creamMid, color: C.inkLight }}>+{tags.length - 3}</span>}
          </div>
        )}
      </div>

      {/* Bottom hover bar */}
      <div className="card-hover-bar" style={{
        position: 'absolute', insetInline: 0, bottom: 0, padding: '7px', display: 'flex',
        alignItems: 'center', justifyContent: 'center', gap: 6,
        background: tier.gradient, opacity: 0, transition: 'opacity 0.2s',
        borderRadius: '0 0 20px 20px',
      }}>
        <Eye size={10} style={{ color: '#fff' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>View Full Profile</span>
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE REPORT (print window)
// ═══════════════════════════════════════════════════════════════════════════
const generateReport = (list, reportTitle = 'Customer Report') => {
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const totalSpend = list.reduce((a, c) => a + (c.totalSpent || 0), 0);
  const vipCount = list.filter(c => (c.totalSpent || 0) >= 15000 || (c.totalBookings || 0) >= 15).length;
  const atRiskCount = list.filter(c => { const d = daysSince(c.lastVisit || c.updatedAt); return d !== null && d >= 30; }).length;

  const csvRows = [['#', 'Name', 'Phone', 'Email', 'Joined', 'Last Visit', 'Visits', 'Total Spent', 'Tier', 'Status']];
  list.forEach((c, i) => {
    const tier = getTier(c.totalBookings || 0, c.totalSpent || 0);
    csvRows.push([i + 1, c.name || '', c.phone || '', c.email || '', fmtDt(c.createdAt), fmtDt(c.lastVisit || c.updatedAt), c.totalBookings || 0, c.totalSpent || 0, tier.label, c.isActive ? 'Active' : 'Inactive']);
  });
  const csv = csvRows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

  const tableRows = list.map((c, i) => {
    const tier = getTier(c.totalBookings || 0, c.totalSpent || 0);
    const risk = getRisk(c.lastVisit || c.updatedAt);
    const d = daysSince(c.lastVisit || c.updatedAt);
    return `<tr class="${i % 2 === 0 ? 'even' : 'odd'}">
      <td style="color:#B09060">${i + 1}</td>
      <td><strong>${c.name || ''}</strong></td>
      <td>${c.phone || '—'}</td>
      <td style="font-size:11px">${c.email || '—'}</td>
      <td style="font-size:11px">${fmtDt(c.createdAt)}</td>
      <td style="font-size:11px${d !== null && d >= 30 ? ';font-weight:700;color:#991B1B' : ''}">${d === null ? 'Never' : d === 0 ? 'Today' : `${d}d ago`}</td>
      <td style="text-align:center;font-weight:700">${c.totalBookings || 0}</td>
      <td style="font-weight:700;color:#8A6400">&#x20B9;${Rs(c.totalSpent || 0)}</td>
      <td><span class="tier tier-${tier.label.toLowerCase()}">${tier.icon} ${tier.label}</span></td>
      <td>${risk ? `<span class="risk">&#9888; ${risk.label}</span>` : '<span class="ok">&#10003; Active</span>'}</td>
    </tr>`;
  }).join('');

  const fn = `Glamour-Customers-${today()}`;
  const win = window.open('', '_blank', 'width=1200,height=900');
  win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${reportTitle} — Glamour Salon</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,serif;background:#FDF8F0;color:#1A1208;font-size:13px}
.page{max-width:1100px;margin:0 auto;padding:44px 40px}.toolbar{display:flex;gap:10px;margin-bottom:32px;align-items:center}
@media print{.toolbar{display:none!important}body{background:#fff}}
.btn{padding:10px 22px;border-radius:30px;border:none;cursor:pointer;font-family:Georgia,serif;font-size:13px;font-weight:700;display:inline-flex;align-items:center;gap:7px}
.btn-p{background:#B8860B;color:#fff}.btn-d{background:#15803D;color:#fff}
.header{border-bottom:2px solid #DFD0A8;padding-bottom:22px;margin-bottom:28px}
.salon-name{font-size:30px;font-weight:700;color:#B8860B}.report-title{font-size:17px;color:#5C4A2A;margin-top:5px}
.report-meta{font-size:11px;color:#B09060;margin-top:6px}.summary{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:30px}
.chip{background:#F7EFD8;border:1px solid #DFD0A8;border-radius:12px;padding:13px 20px;text-align:center;min-width:100px}
.chip-val{font-size:21px;font-weight:700;color:#B8860B}.chip-lbl{font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#B09060;margin-top:3px}
table{width:100%;border-collapse:collapse;font-size:12px}thead{background:#F7EFD8}
th{padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#B09060;border-bottom:2px solid #DFD0A8;white-space:nowrap}
td{padding:9px 12px;border-bottom:1px solid #EDE0C0;vertical-align:middle}tr.even td{background:#FDF8F0}tr.odd td{background:#fff}
.tier{padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700}.tier-vip{background:#FFF8E7;color:#8A6400}
.tier-regular{background:#DCFCE7;color:#15803D}.tier-returning{background:#EFF6FF;color:#1D4ED8}.tier-new{background:#F7EFD8;color:#5C4A2A}
.risk{color:#991B1B;font-weight:700;font-size:11px}.ok{color:#15803D;font-size:11px}
.footer{margin-top:30px;border-top:1px solid #DFD0A8;padding-top:14px;font-size:10px;color:#B09060;display:flex;justify-content:space-between}
</style></head><body><div class="page">
<div class="toolbar"><button class="btn btn-p" onclick="window.print()">&#128424; Print Report</button><button class="btn btn-d" onclick="dlCSV()">&#8595; Download CSV</button><span style="font-size:12px;color:#B09060;margin-left:8px">${list.length} records &middot; ${dateStr}</span></div>
<div class="header"><div class="salon-name">&#10022; Glamour Salon</div><div class="report-title">${reportTitle}</div><div class="report-meta">Generated ${dateStr} at ${timeStr} &middot; ${list.length} customers</div></div>
<div class="summary">
<div class="chip"><div class="chip-val">${list.length}</div><div class="chip-lbl">Total</div></div>
<div class="chip"><div class="chip-val">${list.filter(c => c.isActive).length}</div><div class="chip-lbl">Active</div></div>
<div class="chip"><div class="chip-val">${vipCount}</div><div class="chip-lbl">VIP</div></div>
<div class="chip"><div class="chip-val">${atRiskCount}</div><div class="chip-lbl">At Risk</div></div>
<div class="chip"><div class="chip-val">&#x20B9;${Rs(totalSpend)}</div><div class="chip-lbl">Revenue</div></div>
</div>
<table><thead><tr><th>#</th><th>Customer</th><th>Phone</th><th>Email</th><th>Joined</th><th>Last Visit</th><th>Visits</th><th>Spent</th><th>Tier</th><th>Status</th></tr></thead>
<tbody>${tableRows}</tbody></table>
<div class="footer"><span>Glamour Salon &mdash; Confidential</span><span>${reportTitle} &mdash; ${dateStr}</span></div>
</div><script>const _csv=${JSON.stringify(csv)};function dlCSV(){const b=new Blob([_csv],{type:'text/csv;charset=utf-8;'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='${fn}.csv';a.click();URL.revokeObjectURL(u);}<\/script></body></html>`);
  win.document.close();
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [selected, setSelected] = useState(null);
  const [waCustomer, setWaCustomer] = useState(null);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [bulkWA, setBulkWA] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const searchRef = useRef(null);
  const { broadcastChange } = useDataStore();

  const fetchCustomers = useCallback(async (q = '') => {
    try {
      setLoading(true);
      const params = { role: 'customer' };
      if (q) params.search = q;
      const { data } = await api.get('/users', { params });
      const users = data.users || [];
      users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setCustomers(users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(search), 350);
    return () => clearTimeout(t);
  }, [search, fetchCustomers]);

  // BroadcastChannel sync
  useEffect(() => {
    let BC;
    try { BC = new BroadcastChannel('glamour_bookings_sync'); } catch { }
    if (!BC) return;
    let timer;
    const handler = e => {
      if (e.data?.type !== 'refresh') return;
      clearTimeout(timer);
      timer = setTimeout(() => fetchCustomers(search), 900);
    };
    BC.addEventListener('message', handler);
    return () => { BC.removeEventListener('message', handler); try { BC.close(); } catch { } clearTimeout(timer); };
  }, [fetchCustomers, search]);

  const filtered = useMemo(() => {
    let list = [...customers];
    if (filter === 'active') list = list.filter(c => c.isActive);
    if (filter === 'inactive') list = list.filter(c => !c.isActive);
    if (filter === 'vip') list = list.filter(c => (c.totalSpent || 0) >= 15000 || (c.totalBookings || 0) >= 15);
    if (filter === 'atrisk') list = list.filter(c => { const d = daysSince(c.lastVisit || c.updatedAt); return d !== null && d >= 30; });
    if (filter === 'new') list = list.filter(c => (c.totalBookings || 0) < 3);
    if (sort === 'spend') list.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
    if (sort === 'visits') list.sort((a, b) => (b.totalBookings || 0) - (a.totalBookings || 0));
    if (sort === 'name') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (sort === 'lastvisit') list.sort((a, b) => new Date(b.lastVisit || b.updatedAt) - new Date(a.lastVisit || a.updatedAt));
    if (sort === 'atrisk') list.sort((a, b) => (daysSince(b.lastVisit || b.updatedAt) || 0) - (daysSince(a.lastVisit || a.updatedAt) || 0));
    return list;
  }, [customers, filter, sort]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: customers.length,
      active: customers.filter(c => c.isActive).length,
      vip: customers.filter(c => (c.totalSpent || 0) >= 15000 || (c.totalBookings || 0) >= 15).length,
      atRisk: customers.filter(c => { const d = daysSince(c.lastVisit || c.updatedAt); return d !== null && d >= 30; }).length,
      newMonth: customers.filter(c => { const d = new Date(c.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length,
      revenue: customers.reduce((a, c) => a + (c.totalSpent || 0), 0),
    };
  }, [customers]);

  const toggleCheck = id => setCheckedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => { if (checkedIds.size === filtered.length) setCheckedIds(new Set()); else setCheckedIds(new Set(filtered.map(c => c._id))); };
  const selectedCustomers = filtered.filter(c => checkedIds.has(c._id));

  const FILTERS = [
    ['all', `All`, stats.total],
    ['active', 'Active', stats.active],
    ['inactive', 'Inactive', null],
    ['vip', '👑 VIP', stats.vip],
    ['atrisk', '⚠ At Risk', stats.atRisk],
    ['new', '✨ New', null],
  ];

  return (
    <motion.div variants={stag(0.06)} initial="hidden" animate="show"
      style={{ minHeight: '100vh', paddingBottom: 56, background: C.pageBg, fontFamily: "'DM Sans',sans-serif" }}>

      <style>{`
        @media (max-width: 700px) {
          .glm-cust-3col { grid-template-columns: 1fr 1fr !important; }
          .glm-cust-4col { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 420px) {
          .glm-cust-3col { grid-template-columns: 1fr !important; }
          .glm-cust-4col { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* ══ HERO HEADER ══════════════════════════════════════════════════ */}
      <motion.div variants={fadeUp}
        style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, padding: '28px 28px 24px', marginBottom: 20, background: `linear-gradient(135deg,${C.heroBg},#2a1e08)`, border: '1px solid #3a2a0c' }}>
        {/* Grid texture */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundImage: 'repeating-linear-gradient(45deg,#B8860B 0,#B8860B 1px,transparent 0,transparent 50%)', backgroundSize: '18px 18px' }} />
        {/* Glow orb */}
        <div style={{ position: 'absolute', right: -60, top: -60, width: 280, height: 280, borderRadius: '50%', background: `radial-gradient(circle,${C.goldBright}12,transparent 70%)` }} />
        <div style={{ position: 'absolute', left: -40, bottom: -40, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle,${C.gold}08,transparent 70%)` }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.goldBright, boxShadow: `0 0 8px ${C.goldBright}` }} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase', color: C.goldBright }}>Customer Intelligence</span>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', fontFamily: "'Playfair Display',serif", lineHeight: 1.1, marginBottom: 8 }}>
              Customer Directory
            </h1>
            <p style={{ fontSize: 13, color: '#7a6a50' }}>
              {stats.active} active &nbsp;·&nbsp; {stats.vip} VIP &nbsp;·&nbsp;
              <span style={{ color: stats.atRisk > 0 ? '#f87171' : '#7a6a50' }}>{stats.atRisk} at risk</span>
              &nbsp;·&nbsp; +{stats.newMonth} this month &nbsp;·&nbsp;
              <span style={{ color: C.goldBright, fontWeight: 700 }}>{fmtK(stats.revenue)}</span> total revenue
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {checkedIds.size > 0 && (
              <>
                <button onClick={() => setBulkWA(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: '#1A7A45', color: '#fff' }}>
                  <MessageCircle size={13} /> WhatsApp ({checkedIds.size})
                </button>
                <button onClick={() => generateReport(selectedCustomers, `Selected Customers (${checkedIds.size})`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.08)', color: '#fff' }}>
                  <Printer size={13} /> Report ({checkedIds.size})
                </button>
              </>
            )}
            <button onClick={() => fetchCustomers(search)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.08)', color: '#fff' }}>
              <RefreshCw size={13} /> Refresh
            </button>
            <button onClick={() => generateReport(filtered, 'Customer Directory Report')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: `linear-gradient(135deg,${C.gold},${C.goldBright})`, color: C.heroBg }}>
              <Download size={13} /> Export Report
            </button>
          </div>
        </div>
      </motion.div>

      {/* ══ STAT TILES ═══════════════════════════════════════════════════ */}
      <motion.div variants={stag(0.06)} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatPill icon={Users} value={stats.total} label="Total Customers" color={C.inkMid} pale={C.creamMid} active={filter === 'all'} onClick={() => setFilter('all')} />
        <StatPill icon={CheckCircle2} value={stats.active} label="Active" color={C.green} pale={C.greenPale} active={filter === 'active'} onClick={() => setFilter('active')} />
        <StatPill icon={Crown} value={stats.vip} label="VIP Clients" color={C.gold} pale={C.goldPale} active={filter === 'vip'} onClick={() => setFilter('vip')} />
        <StatPill icon={Flame} value={stats.atRisk} label="At Risk" color={C.red} pale={C.redPale} active={filter === 'atrisk'} onClick={() => setFilter('atrisk')} />
        <StatPill icon={UserPlus} value={`+${stats.newMonth}`} label="New This Month" color={C.blue} pale={C.bluePale} active={filter === 'new'} onClick={() => setFilter('new')} />
        <StatPill icon={IndianRupee} value={fmtK(stats.revenue)} label="Total Revenue" color={C.amber} pale={C.amberPale} active={false} onClick={() => { }} />
      </motion.div>

      {/* ══ SEARCH + CONTROLS ════════════════════════════════════════════ */}
      <motion.div variants={fade} style={{ borderRadius: 20, padding: '16px', background: C.white, border: `1px solid ${C.border}`, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Search row */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.inkLight }} />
            <input ref={searchRef}
              placeholder="Search by name, phone, or email…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px 10px 36px', borderRadius: 12, border: `1.5px solid ${C.border}`,
                background: C.cardBg, color: C.ink, fontSize: 13, outline: 'none', fontFamily: "'DM Sans',sans-serif", boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.borderColor = C.gold; e.target.style.boxShadow = `0 0 0 3px ${C.goldPale}`; }}
              onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }} />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                <X size={13} style={{ color: C.inkLight }} />
              </button>
            )}
          </div>

          {/* Sort select */}
          <select value={sort} onChange={e => setSort(e.target.value)}
            style={{
              padding: '10px 12px', borderRadius: 12, border: `1.5px solid ${C.border}`,
              background: C.cardBg, color: C.ink, fontSize: 13, outline: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
            }}
            onFocus={e => e.target.style.borderColor = C.gold}
            onBlur={e => e.target.style.borderColor = C.border}>
            {[['newest', 'Newest First'], ['spend', 'Top Spend'], ['visits', 'Most Visits'], ['name', 'Name A–Z'], ['lastvisit', 'Last Visit'], ['atrisk', 'At Risk First']].map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>

          {/* View toggle */}
          <div style={{ display: 'flex', padding: 3, borderRadius: 12, background: C.creamMid, border: `1px solid ${C.border}`, flexShrink: 0 }}>
            {[[LayoutGrid, 'grid'], [LayoutList, 'list']].map(([Icon, v]) => (
              <button key={v} onClick={() => setViewMode(v)}
                style={{
                  padding: '6px 10px', borderRadius: 9, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: viewMode === v ? C.white : 'transparent',
                  boxShadow: viewMode === v ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                }}>
                <Icon size={15} style={{ color: viewMode === v ? C.gold : C.inkLight }} />
              </button>
            ))}
          </div>
        </div>

        {/* Filter pills + select all */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={toggleAll}
            style={{
              padding: '5px 13px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
              background: checkedIds.size === filtered.length && filtered.length > 0 ? C.ink : C.creamMid,
              color: checkedIds.size === filtered.length && filtered.length > 0 ? '#fff' : C.inkMid,
              border: `1px solid ${C.border}`,
            }}>
            {checkedIds.size > 0 ? `${checkedIds.size} selected` : 'Select All'}
          </button>

          <div style={{ width: 1, height: 18, background: C.border, flexShrink: 0 }} />

          {FILTERS.map(([v, l, count]) => (
            <button key={v} onClick={() => setFilter(v)}
              style={{
                padding: '5px 13px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                background: filter === v ? `linear-gradient(135deg,${v === 'atrisk' ? C.red : v === 'vip' ? C.gold : C.gold},${v === 'atrisk' ? '#DC2626' : v === 'vip' ? C.goldBright : C.goldBright})` : C.creamMid,
                color: filter === v ? '#fff' : C.inkMid,
                border: `1px solid ${filter === v ? (v === 'atrisk' ? C.red : C.gold) : C.border}`,
                boxShadow: filter === v ? `0 2px 8px ${v === 'atrisk' ? C.red : C.gold}30` : 'none',
              }}>
              {l}{count !== null ? ` (${count})` : ''}
            </button>
          ))}

          <div style={{ marginLeft: 'auto', fontSize: 11, color: C.inkLight, fontWeight: 600, flexShrink: 0 }}>
            {filtered.length} customers
          </div>
        </div>
      </motion.div>

      {/* ══ CONTENT ══════════════════════════════════════════════════════ */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg,${C.gold},${C.goldBright})` }}>
            <Loader2 size={22} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: C.inkLight }}>Loading customers…</p>
        </div>
      ) : filtered.length === 0 ? (
        <motion.div variants={fade} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 14, borderRadius: 20, background: C.white, border: `1px solid ${C.border}` }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.goldPale }}>
            <Users size={28} style={{ color: C.gold }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 700, color: C.ink, fontSize: 15 }}>No customers found</p>
            <p style={{ fontSize: 13, color: C.inkLight, marginTop: 4 }}>{search ? 'Try a different search' : 'Adjust your filters'}</p>
          </div>
          {filter !== 'all' && (
            <button onClick={() => setFilter('all')} style={{ padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: C.creamMid, color: C.inkMid }}>
              Clear Filter
            </button>
          )}
        </motion.div>
      ) : viewMode === 'grid' ? (
        <motion.div variants={stag(0.04)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
          {filtered.map(c => (
            <CustomerCard key={c._id} customer={c}
              selected={checkedIds.has(c._id)}
              onSelect={toggleCheck}
              onView={setSelected}
              onWA={setWaCustomer} />
          ))}
        </motion.div>
      ) : (
        /* ── TABLE VIEW ── */
        <motion.div variants={fade} style={{ borderRadius: 20, overflow: 'hidden', background: C.white, border: `1px solid ${C.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.creamMid }}>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>
                  <input type="checkbox" checked={checkedIds.size === filtered.length && filtered.length > 0} onChange={toggleAll}
                    style={{ cursor: 'pointer', accentColor: C.gold }} />
                </th>
                {['Customer', 'Contact', 'Last Visit', 'Activity', 'Tier', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.inkLight, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const tier = getTier(c.totalBookings || 0, c.totalSpent || 0);
                const risk = getRisk(c.lastVisit || c.updatedAt);
                const loyalty = getLoyalty(c._id);
                return (
                  <motion.tr key={c._id} variants={fade}
                    onClick={() => setSelected(c)}
                    style={{ background: i % 2 === 0 ? C.white : C.cardBg, borderBottom: `1px solid ${C.border}20`, cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = C.goldPale}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? C.white : C.cardBg}>
                    <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={checkedIds.has(c._id)} onChange={() => toggleCheck(c._id)} style={{ cursor: 'pointer', accentColor: C.gold }} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={c.name || ''} size={34} />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{c.name}</p>
                          {loyalty.points > 0 && <p style={{ fontSize: 10, color: C.gold }}>🏅 {loyalty.points} pts</p>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 11, color: C.inkMid, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {c.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={9} />{c.phone}</span>}
                        {c.email && <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.inkLight }}><Mail size={9} />{c.email}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <LastSeenChip lastVisit={c.lastVisit || c.updatedAt} />
                      {risk && <p style={{ fontSize: 9, color: risk.color, fontWeight: 700, marginTop: 2 }}>⚠ {risk.label}</p>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ fontSize: 13, fontWeight: 800, color: C.gold }}>{fmtK(c.totalSpent || 0)}</p>
                      <p style={{ fontSize: 10, color: C.inkLight }}>{c.totalBookings || 0} visits</p>
                    </td>
                    <td style={{ padding: '12px 16px' }}><TierBadge visits={c.totalBookings || 0} spend={c.totalSpent || 0} /></td>
                    <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => setWaCustomer(c)}
                        style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: C.greenPale, border: 'none', cursor: 'pointer' }}>
                        <MessageCircle size={12} style={{ color: C.green }} />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: '10px 18px', borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.inkLight, background: C.creamMid, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Showing {filtered.length} of {customers.length} customers</span>
            <span style={{ fontWeight: 700, color: C.gold }}>{fmtK(stats.revenue)} lifetime revenue</span>
          </div>
        </motion.div>
      )}

      {!loading && filtered.length > 0 && (
        <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: C.inkLight, marginTop: 16 }}>
          {filtered.length} customers{checkedIds.size > 0 ? ` · ${checkedIds.size} selected ·` : ' ·'} {fmtK(stats.revenue)} total revenue
        </p>
      )}

      {/* Drawers + Modals */}
      <AnimatePresence>
        {selected && <CustomerDrawer customer={selected} onClose={() => setSelected(null)} onRefresh={() => fetchCustomers(search)} />}
      </AnimatePresence>
      <AnimatePresence>
        {waCustomer && <WhatsAppPanel customer={waCustomer} onClose={() => setWaCustomer(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {bulkWA && <BulkWAModal customers={selectedCustomers} onClose={() => { setBulkWA(false); setCheckedIds(new Set()); }} />}
      </AnimatePresence>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .card-hover-bar { opacity: 0 !important; }
        [style*="cursor: pointer"]:hover .card-hover-bar,
        div[style*="cursor: pointer"]:hover > div:last-child { opacity: 1 !important; }
      `}</style>
    </motion.div>
  );
}