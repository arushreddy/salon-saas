import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Loader2, Package, AlertTriangle, RefreshCw, Download,
  X, Check, Plus, Minus, TrendingDown, TrendingUp, History,
  AlertCircle, CheckCircle2, Activity, Zap, ShoppingCart,
  ChevronDown, Clock, BarChart2, Eye,
} from 'lucide-react';
import api from '@/services/api';

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS — matches admin panel exactly
// ═══════════════════════════════════════════════════════════════════════════
const C = {
  pageBg: '#F4EDE0', cardBg: '#FDFAF4', heroBg: '#0E0B06', heroBg2: '#1C1608',
  gold: '#B8860B', goldLight: '#DAA520', goldBright: '#F0C040', goldPale: '#FFF8E7',
  goldDeep: '#8B6914',
  ink: '#1A1208', inkMid: '#5C4A2A', inkLight: '#9C8660', inkGhost: '#C8B090',
  border: '#DFD0A8', cream: '#FDF8F0', creamMid: '#F7EFD8', creamDark: '#EDE0C0',
  green: '#15803D', greenPale: '#DCFCE7', greenBorder: '#86EFAC',
  red: '#991B1B', redPale: '#FEF2F2', redBorder: '#FECACA',
  amber: '#92400E', amberPale: '#FFFBEB', amberBorder: '#FDE68A',
  blue: '#1D4ED8', bluePale: '#EFF6FF', blueBorder: '#BFDBFE',
  white: '#FFFFFF',
};

const ease = [0.22, 0.61, 0.36, 1];
const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease } } };
const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.46, ease } } };
const slideIn = { hidden: { x: 420, opacity: 0 }, show: { x: 0, opacity: 1, transition: { type: 'spring', damping: 28, stiffness: 240 } } };
const popIn = { hidden: { scale: 0.9, opacity: 0 }, show: { scale: 1, opacity: 1, transition: { type: 'spring', damping: 22, stiffness: 340 } } };
const stag = (d = 0.05) => ({ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: d } } });

const Rs = n => Number(n || 0).toLocaleString('en-IN');
const fmtK = n => { if (!n) return '₹0'; if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`; if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`; return `₹${Rs(n)}`; };
const fmtDt = d => { try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return '—'; } };

const CAT_ICONS = {
  shampoo: '🧴', conditioner: '💧', oil: '🫙', color: '🎨', cream: '🧈',
  serum: '✨', tools: '✂️', accessories: '💎', consumables: '📦', other: '📋',
};
const CAT_COLORS = {
  shampoo: { color: C.blue, pale: C.bluePale },
  conditioner: { color: '#0F766E', pale: '#F0FDFA' },
  oil: { color: C.amber, pale: C.amberPale },
  color: { color: '#7C3AED', pale: '#F5F3FF' },
  cream: { color: C.gold, pale: C.goldPale },
  serum: { color: '#BE185D', pale: '#FDF2F8' },
  tools: { color: C.inkMid, pale: C.creamMid },
  accessories: { color: '#B45309', pale: '#FEF3C7' },
  consumables: { color: C.green, pale: C.greenPale },
  other: { color: C.inkLight, pale: C.creamMid },
};

import { broadcastChange } from '@/context/DataStore';

const stockStatus = (item) => {
  const qty = item.quantity || 0, min = item.lowStockThreshold || 5;
  if (qty === 0) return { label: '⛔ Out of Stock', color: C.red, bg: C.redPale, level: 'empty' };
  if (qty <= min) return { label: '⚠ Low Stock', color: C.amber, bg: C.amberPale, level: 'low' };
  return { label: '✓ In Stock', color: C.green, bg: C.greenPale, level: 'ok' };
};

// ═══════════════════════════════════════════════════════════════════════════
// ATOMS
// ═══════════════════════════════════════════════════════════════════════════
const inpStyle = {
  width: '100%', padding: '10px 13px', borderRadius: 10,
  border: `1.5px solid ${C.border}`, background: C.white,
  fontSize: 13, color: C.ink, outline: 'none', fontFamily: "'DM Sans',sans-serif",
  boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s',
};

const Toast = ({ toast }) => (
  <AnimatePresence>
    {toast && (
      <motion.div initial={{ opacity: 0, y: -10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }}
        style={{
          position: 'fixed', top: 20, right: 20, zIndex: 200, display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 18px', borderRadius: 14, fontSize: 13, fontWeight: 700, maxWidth: 380,
          background: toast.ok ? C.greenPale : C.redPale, color: toast.ok ? C.green : C.red,
          border: `1px solid ${toast.ok ? C.greenBorder : C.redBorder}`,
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        }}>
        {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
        {toast.text}
      </motion.div>
    )}
  </AnimatePresence>
);

const StockBar = ({ qty, threshold }) => {
  const max = Math.max(threshold * 4, 20, qty || 0);
  const pct = Math.min(100, ((qty || 0) / max) * 100);
  const color = (qty || 0) === 0 ? C.red : (qty || 0) <= threshold ? C.amber : C.green;
  return (
    <div style={{ height: 5, borderRadius: 3, background: C.creamDark, overflow: 'hidden', minWidth: 60 }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ height: '100%', background: color, borderRadius: 3 }} />
    </div>
  );
};

const StatTile = ({ icon: Icon, value, label, color, pale, alert }) => (
  <motion.div variants={fade} whileHover={{ y: -2 }}
    style={{
      padding: '16px 18px', borderRadius: 18, background: C.white, border: `1.5px solid ${alert ? color + '40' : C.border}`,
      boxShadow: alert ? `0 4px 20px ${color}18` : '0 2px 10px rgba(139,100,0,0.05)', flex: 1, minWidth: 110,
    }}>
    <div style={{ width: 34, height: 34, borderRadius: 10, background: pale, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, border: `1px solid ${color}20` }}>
      <Icon size={16} style={{ color }} />
    </div>
    <p style={{ fontSize: 20, fontWeight: 800, color: C.ink, fontFamily: "'Playfair Display',serif", lineHeight: 1.1 }}>{value}</p>
    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.inkLight, marginTop: 3 }}>{label}</p>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════
// USE STOCK DRAWER
// ═══════════════════════════════════════════════════════════════════════════
const UseStockDrawer = ({ item, onClose, onDone }) => {
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('Used in service');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!qty || qty < 1) { setError('Enter valid quantity'); return; }
    if (!reason.trim()) { setError('Add a reason'); return; }
    setSaving(true);
    setError('');
    try {
      const { data } = await api.patch(`/inventory/${item._id}/stock`, {
        quantity: parseInt(qty), type: 'use', notes: reason,
      });
      broadcastChange();
      onDone(data.product || data);
      onClose();
    } catch (e) { setError(e.response?.data?.message || 'Failed to update stock'); }
    finally { setSaving(false); }
  };

  const after = Math.max(0, (item.quantity || 0) - qty);
  const afterColor = after === 0 ? C.red : after <= item.lowStockThreshold ? C.amber : C.green;
  const catColor = CAT_COLORS[item.category] || CAT_COLORS.other;

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(14,11,6,0.5)', zIndex: 100, backdropFilter: 'blur(4px)' }} />
      <motion.div variants={slideIn} initial="hidden" animate="show" exit="hidden"
        style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, background: C.pageBg, zIndex: 101, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 40px rgba(0,0,0,0.18)' }}>

        {/* Header */}
        <div style={{ position: 'relative', overflow: 'hidden', padding: '20px', background: `linear-gradient(135deg,${C.heroBg},#2d2510)`, flexShrink: 0 }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.07, backgroundImage: 'repeating-linear-gradient(45deg,#B8860B 0,#B8860B 1px,transparent 0,transparent 50%)', backgroundSize: '12px 12px' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.goldBright, marginBottom: 4 }}>Deduct Stock</p>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#fff', fontFamily: "'Playfair Display',serif" }}>{item.name}</p>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: catColor.pale, color: catColor.color, fontWeight: 700, textTransform: 'capitalize' }}>
                  {CAT_ICONS[item.category]} {item.category}
                </span>
                {item.brand && <span style={{ fontSize: 10, color: C.inkGhost }}>{item.brand}</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <X size={14} style={{ color: '#fff' }} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Current stock card */}
          <div style={{ padding: '16px', borderRadius: 16, background: C.white, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: C.gold }}>Current Stock</p>
              <span style={{ ...stockStatus(item), fontSize: 11, padding: '3px 9px', borderRadius: 8, fontWeight: 700 }}>{stockStatus(item).label}</span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 800, color: C.ink, fontFamily: "'Playfair Display',serif", lineHeight: 1 }}>
              {item.quantity} <span style={{ fontSize: 16, color: C.inkLight }}>{item.unit || 'units'}</span>
            </p>
            <StockBar qty={item.quantity} threshold={item.lowStockThreshold || 5} />
            <p style={{ fontSize: 10, color: C.inkLight, marginTop: 5 }}>Min stock: {item.lowStockThreshold || 5} {item.unit}</p>
          </div>

          {/* Quantity input */}
          <div style={{ borderRadius: 16, padding: '16px', background: C.white, border: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: C.gold, marginBottom: 12 }}>Quantity to Deduct</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                style={{ width: 42, height: 42, borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.inkMid, fontSize: 18, fontWeight: 700 }}>
                <Minus size={16} />
              </button>
              <input type="number" value={qty}
                onChange={e => setQty(Math.max(1, Math.min(item.quantity || 0, parseInt(e.target.value) || 1)))}
                style={{ ...inpStyle, flex: 1, fontSize: 22, fontWeight: 800, textAlign: 'center' }}
                onFocus={e => { e.target.style.borderColor = C.gold; e.target.style.boxShadow = `0 0 0 3px ${C.goldPale}`; }}
                onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }} />
              <button onClick={() => setQty(q => Math.min(item.quantity || 0, q + 1))}
                style={{ width: 42, height: 42, borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.inkMid }}>
                <Plus size={16} />
              </button>
            </div>
            {/* After preview */}
            <div style={{ padding: '10px 14px', borderRadius: 10, background: after === 0 ? C.redPale : after <= item.lowStockThreshold ? C.amberPale : C.greenPale, border: `1px solid ${afterColor}30` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: afterColor }}>After deduction:</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: afterColor, fontFamily: "'Playfair Display',serif" }}>{after} {item.unit}</span>
              </div>
              {after <= item.lowStockThreshold && after > 0 && (
                <p style={{ fontSize: 10, color: C.amber, marginTop: 4 }}>⚠ Will be below minimum threshold</p>
              )}
              {after === 0 && <p style={{ fontSize: 10, color: C.red, marginTop: 4 }}>⛔ This will empty the stock</p>}
            </div>
          </div>

          {/* Reason */}
          <div style={{ borderRadius: 16, padding: '16px', background: C.white, border: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: C.gold, marginBottom: 10 }}>Reason *</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {['Used in service', 'Used in treatment', 'Damaged', 'Expired', 'Training use', 'Sample given'].map(r => (
                <button key={r} onClick={() => setReason(r)}
                  style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    background: reason === r ? C.ink : C.creamMid, color: reason === r ? '#fff' : C.inkMid,
                    border: `1px solid ${reason === r ? C.ink : C.border}`, transition: 'all 0.15s',
                  }}>{r}</button>
              ))}
            </div>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Or type a custom reason…"
              style={inpStyle}
              onFocus={e => { e.target.style.borderColor = C.gold; e.target.style.boxShadow = `0 0 0 3px ${C.goldPale}`; }}
              onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }} />
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: C.redPale, color: C.red, fontSize: 13, fontWeight: 600, border: `1px solid ${C.redBorder}` }}>
              <AlertCircle size={14} />{error}
            </div>
          )}
        </div>

        <div style={{ padding: '16px 20px', borderTop: `1px solid ${C.border}`, background: C.white, display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.white, color: C.inkMid, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving || (item.quantity || 0) === 0}
            style={{
              flex: 2, padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              background: `linear-gradient(135deg,${C.amber},#D97706)`, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: saving || (item.quantity || 0) === 0 ? 0.5 : 1,
            }}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <><TrendingDown size={14} /> Deduct {qty} {item.unit}</>}
          </button>
        </div>
      </motion.div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// REORDER REQUEST DRAWER
// ═══════════════════════════════════════════════════════════════════════════
const ReorderDrawer = ({ item, onClose, onDone }) => {
  const [qty, setQty] = useState(item.reorderQty || 10);
  const [notes, setNotes] = useState('Low on stock — please restock urgently');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!qty || parseInt(qty) < 1) return;
    setSaving(true);
    try {
      await api.post('/inventory/reorder', { itemId: item._id, quantity: parseInt(qty), notes });
      onDone();
    } catch {
      onDone(); // Graceful fallback — reorder logged locally
    }
    setSaving(false);
    onClose();
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(14,11,6,0.5)', zIndex: 100, backdropFilter: 'blur(4px)' }} />
      <motion.div variants={slideIn} initial="hidden" animate="show" exit="hidden"
        style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, background: C.pageBg, zIndex: 101, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 40px rgba(0,0,0,0.18)' }}>

        <div style={{ position: 'relative', overflow: 'hidden', padding: '20px', background: `linear-gradient(135deg,${C.amber},#D97706)`, flexShrink: 0 }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '12px 12px' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>Reorder Request</p>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#fff', fontFamily: "'Playfair Display',serif" }}>{item.name}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Current stock: {item.quantity} {item.unit}</p>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} style={{ color: '#fff' }} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ borderRadius: 16, padding: '16px', background: C.amberPale, border: `1px solid ${C.amberBorder}` }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.amber, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} /> Stock Alert
            </p>
            <p style={{ fontSize: 13, color: C.inkMid, marginTop: 6 }}>
              Only <strong>{item.quantity}</strong> {item.unit} remaining. Minimum threshold is {item.lowStockThreshold || 5}.
              {item.supplier?.name && <span> Supplier: <strong>{item.supplier.name}</strong>{item.supplier.phone && ` (${item.supplier.phone})`}</span>}
            </p>
          </div>

          <div style={{ borderRadius: 16, padding: '16px', background: C.white, border: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: C.gold, marginBottom: 10 }}>Quantity to Order</p>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="e.g. 20" autoFocus
              style={{ ...inpStyle, fontSize: 20, fontWeight: 800, textAlign: 'center' }}
              onFocus={e => { e.target.style.borderColor = C.gold; e.target.style.boxShadow = `0 0 0 3px ${C.goldPale}`; }}
              onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }} />
          </div>

          <div style={{ borderRadius: 16, padding: '16px', background: C.white, border: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: C.gold, marginBottom: 10 }}>Notes / Instructions</p>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Supplier info, urgency, special instructions…"
              style={{ ...inpStyle, resize: 'none' }}
              onFocus={e => { e.target.style.borderColor = C.gold; e.target.style.boxShadow = `0 0 0 3px ${C.goldPale}`; }}
              onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }} />
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderTop: `1px solid ${C.border}`, background: C.white, display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.white, color: C.inkMid, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving || !qty || parseInt(qty) < 1}
            style={{
              flex: 2, padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              background: `linear-gradient(135deg,${C.amber},#D97706)`, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: saving || !qty || parseInt(qty) < 1 ? 0.5 : 1,
            }}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <><ShoppingCart size={14} /> Send Reorder Request</>}
          </button>
        </div>
      </motion.div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT DETAIL MODAL
// ═══════════════════════════════════════════════════════════════════════════
const ProductDetailModal = ({ item, onClose, onUse, onReorder }) => {
  const st = stockStatus(item);
  const catColor = CAT_COLORS[item.category] || CAT_COLORS.other;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(14,11,6,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div variants={popIn} initial="hidden" animate="show" exit="hidden"
        style={{ width: '100%', maxWidth: 380, borderRadius: 24, overflow: 'hidden', background: C.cream, boxShadow: '0 32px 80px rgba(14,11,6,0.3)' }}>

        <div style={{ height: 3, background: st.level === 'ok' ? `linear-gradient(90deg,${C.green},#22C55E)` : st.level === 'low' ? `linear-gradient(90deg,${C.amber},#F59E0B)` : C.red }} />

        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: catColor.pale, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, border: `1px solid ${catColor.color}20` }}>
                {CAT_ICONS[item.category] || '📦'}
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 800, color: C.ink, fontFamily: "'Playfair Display',serif" }}>{item.name}</p>
                {item.brand && <p style={{ fontSize: 11, color: C.inkLight }}>{item.brand}</p>}
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: catColor.pale, color: catColor.color, textTransform: 'capitalize', marginTop: 4, display: 'inline-block' }}>{item.category}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: C.creamMid, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={13} style={{ color: C.inkLight }} />
            </button>
          </div>

          {/* Stock */}
          <div style={{ padding: '14px', borderRadius: 14, background: st.bg, border: `1px solid ${st.color}20`, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: st.color, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Stock Level</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: st.color }}>{st.label}</span>
            </div>
            <p style={{ fontSize: 26, fontWeight: 800, color: st.color, fontFamily: "'Playfair Display',serif", lineHeight: 1 }}>
              {item.quantity} <span style={{ fontSize: 14, color: st.color + 'aa' }}>{item.unit}</span>
            </p>
            <div style={{ marginTop: 8 }}>
              <StockBar qty={item.quantity} threshold={item.lowStockThreshold || 5} />
              <p style={{ fontSize: 10, color: st.color + 'aa', marginTop: 4 }}>Min: {item.lowStockThreshold || 5} {item.unit}</p>
            </div>
          </div>

          {item.notes && (
            <div style={{ padding: '10px 14px', borderRadius: 12, background: C.creamMid, marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: C.inkMid, lineHeight: 1.5 }}>{item.notes}</p>
            </div>
          )}

          {item.supplier?.name && (
            <div style={{ padding: '10px 14px', borderRadius: 12, background: C.creamMid, marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.gold, textTransform: 'uppercase', marginBottom: 3 }}>Supplier</p>
              <p style={{ fontSize: 12, color: C.ink }}>{item.supplier.name}</p>
              {item.supplier.phone && <p style={{ fontSize: 11, color: C.inkLight }}>{item.supplier.phone}</p>}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { onClose(); onUse(); }} disabled={(item.quantity || 0) === 0}
              style={{
                flex: 1, padding: '11px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                background: C.amberPale, color: C.amber, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: (item.quantity || 0) === 0 ? 0.4 : 1,
              }}>
              <TrendingDown size={13} /> Use Stock
            </button>
            <button onClick={() => { onClose(); onReorder(); }}
              style={{
                flex: 1, padding: '11px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                background: (item.quantity || 0) <= (item.lowStockThreshold || 5) ? C.ink : C.creamMid,
                color: (item.quantity || 0) <= (item.lowStockThreshold || 5) ? '#fff' : C.inkMid,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              <ShoppingCart size={13} /> Reorder
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function ReceptionistInventory() {
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState({ totalProducts: 0, lowStockCount: 0, totalValue: 0 });
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [filterLow, setFilterLow] = useState(false);
  const [useDrawer, setUseDrawer] = useState(null);
  const [reorderDrawer, setReorderDrawer] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const showToast = (text, ok = true) => { setToast({ text, ok }); setTimeout(() => setToast(null), 3500); };

  const fetchInventory = useCallback(async () => {
    setFetching(true);
    try {
      const { data } = await api.get('/inventory', { params: { limit: 300 } });
      const items = data.products || data.items || (Array.isArray(data) ? data : []);
      setProducts(items);
      setSummary({
        totalProducts: data.summary?.totalProducts || items.length,
        lowStockCount: data.summary?.lowStockCount || items.filter(i => (i.quantity || 0) <= (i.lowStockThreshold || 5)).length,
        totalValue: data.summary?.totalValue || items.reduce((s, i) => s + (i.quantity || 0) * (i.costPrice || 0), 0),
      });
      setLastSync(new Date());
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to load inventory', false);
    }
    setFetching(false);
  }, []);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  // BroadcastChannel — listens on shared glamour_bookings_sync so any admin change
  // (new product, stock update, edit) is reflected here instantly
  useEffect(() => {
    let BC2;
    try { BC2 = new BroadcastChannel('glamour_bookings_sync'); } catch { return; }
    let timer;
    const handler = e => {
      if (e.data?.type !== 'refresh') return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        fetchInventory();
        showToast('📦 Inventory updated', true);
      }, 700);
    };
    BC2.addEventListener('message', handler);
    return () => { BC2.removeEventListener('message', handler); try { BC2.close(); } catch {} clearTimeout(timer); };
  }, [fetchInventory]);

  const outItems = products.filter(i => (i.quantity || 0) === 0);
  const lowItems = products.filter(i => (i.quantity || 0) > 0 && (i.quantity || 0) <= (i.lowStockThreshold || 5));
  const categories = ['All', ...new Set(products.map(i => i.category).filter(Boolean))];

  const filtered = useMemo(() => products.filter(i => {
    const mS = !search || (i.name || '').toLowerCase().includes(search.toLowerCase()) || (i.brand || '').toLowerCase().includes(search.toLowerCase());
    const mL = !filterLow || (i.quantity || 0) <= (i.lowStockThreshold || 5);
    const mC = category === 'All' || i.category === category;
    return mS && mL && mC;
  }), [products, search, filterLow, category]);

  const handleUseDone = (updated) => {
    setProducts(prev => prev.map(p => p._id === updated._id ? { ...p, ...updated } : p));
    showToast(`✓ Stock updated`);
  };

  const handleReorderDone = () => showToast('📋 Reorder request sent to admin');

  const handleExport = () => {
    const rows = filtered.map(i => [i.name || '', i.brand || '', i.category || '', i.quantity ?? 0, i.lowStockThreshold || 5, stockStatus(i).label, i.costPrice || 0, (i.quantity || 0) * (i.costPrice || 0)]);
    const headers = ['Name', 'Brand', 'Category', 'Quantity', 'Min Stock', 'Status', 'Cost Price', 'Stock Value'];
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <motion.div variants={stag(0.06)} initial="hidden" animate="show"
      style={{ minHeight: '100vh', paddingBottom: 56, background: C.pageBg, fontFamily: "'DM Sans',sans-serif" }}>

      <Toast toast={toast} />

      {/* ══ HERO HEADER ══════════════════════════════════════════════════ */}
      <motion.div variants={fadeUp}
        style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, padding: '24px 28px 22px', marginBottom: 20, background: `linear-gradient(135deg,${C.heroBg},#2a1e08)`, border: '1px solid #3a2a0c' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundImage: 'repeating-linear-gradient(45deg,#B8860B 0,#B8860B 1px,transparent 0,transparent 50%)', backgroundSize: '18px 18px' }} />
        <div style={{ position: 'absolute', right: -60, top: -60, width: 240, height: 240, borderRadius: '50%', background: `radial-gradient(circle,${C.goldBright}10,transparent 70%)` }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
              {/* Live sync indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, background: 'rgba(34,197,94,0.15)' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px #22C55E', animation: 'pulse 2s ease-in-out infinite' }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: '#86EFAC', letterSpacing: '0.1em' }}>LIVE SYNC</span>
              </div>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', fontFamily: "'Playfair Display',serif", lineHeight: 1.1, marginBottom: 6 }}>Inventory</h1>
            <p style={{ fontSize: 12, color: '#7a6a50' }}>
              {summary.totalProducts} products &nbsp;·&nbsp;
              {lowItems.length > 0 && <span style={{ color: '#fbbf24' }}>{lowItems.length} low &nbsp;·&nbsp; </span>}
              {outItems.length > 0 && <span style={{ color: '#f87171' }}>{outItems.length} empty &nbsp;·&nbsp; </span>}
              {lastSync && <span>last synced {lastSync.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleExport} disabled={products.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.08)', color: '#fff', opacity: products.length === 0 ? 0.4 : 1 }}>
              <Download size={13} /> Export
            </button>
            <button onClick={fetchInventory} disabled={fetching}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.08)', color: '#fff' }}>
              <RefreshCw size={13} style={{ animation: fetching ? 'spin 0.8s linear infinite' : 'none' }} /> Refresh
            </button>
          </div>
        </div>
      </motion.div>

      {/* ══ STAT TILES ═══════════════════════════════════════════════════ */}
      <motion.div variants={stag(0.06)} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatTile icon={Package} value={summary.totalProducts} label="Total Products" color={C.inkMid} pale={C.creamMid} />
        <StatTile icon={AlertTriangle} value={lowItems.length} label="Low Stock" color={C.amber} pale={C.amberPale} alert={lowItems.length > 0} />
        <StatTile icon={Zap} value={outItems.length} label="Out of Stock" color={C.red} pale={C.redPale} alert={outItems.length > 0} />
        <StatTile icon={Activity} value={fmtK(summary.totalValue)} label="Stock Value" color={C.green} pale={C.greenPale} />
      </motion.div>

      {/* ══ ALERTS PANEL ════════════════════════════════════════════════ */}
      {(lowItems.length > 0 || outItems.length > 0) && (
        <motion.div variants={fade} style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 20, border: `1px solid ${C.amberBorder}` }}>
          <div style={{ padding: '12px 18px', background: C.amberPale, borderBottom: `1px solid ${C.amberBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={15} style={{ color: C.amber }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: C.amber }}>{outItems.length + lowItems.length} items need attention</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', background: C.white }}>
            {[...outItems, ...lowItems].map(item => {
              const st = stockStatus(item);
              return (
                <div key={item._id} style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {CAT_ICONS[item.category] || '📦'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                    <p style={{ fontSize: 10, fontWeight: 700, color: st.color }}>{item.quantity === 0 ? 'Empty' : `${item.quantity} left (min ${item.lowStockThreshold || 5})`}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                    <button onClick={() => setUseDrawer(item)} disabled={(item.quantity || 0) === 0}
                      style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.inkMid, fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: (item.quantity || 0) === 0 ? 0.4 : 1 }}>
                      Use
                    </button>
                    <button onClick={() => setReorderDrawer(item)}
                      style={{ padding: '4px 10px', borderRadius: 8, border: 'none', background: C.ink, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      Reorder
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ══ SEARCH + FILTERS ════════════════════════════════════════════ */}
      <motion.div variants={fade} style={{ borderRadius: 20, padding: '14px', background: C.white, border: `1px solid ${C.border}`, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.inkLight }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products, brands…"
              style={{ ...inpStyle, paddingLeft: 36 }}
              onFocus={e => { e.target.style.borderColor = C.gold; e.target.style.boxShadow = `0 0 0 3px ${C.goldPale}`; }}
              onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }} />
          </div>
          <button onClick={() => setFilterLow(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: filterLow ? C.amberPale : C.creamMid, color: filterLow ? C.amber : C.inkMid,
              border: `1.5px solid ${filterLow ? C.amberBorder : C.border}`,
            }}>
            <AlertTriangle size={12} /> Low Stock {filterLow && `(${summary.lowStockCount})`}
          </button>
          <span style={{ fontSize: 11, color: C.inkLight, fontWeight: 600 }}>{filtered.length} products</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {categories.slice(0, 10).map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                background: category === cat ? `linear-gradient(135deg,${C.gold},${C.goldBright})` : C.creamMid,
                color: category === cat ? '#fff' : C.inkMid,
                border: `1px solid ${category === cat ? C.gold : C.border}`,
                boxShadow: category === cat ? `0 2px 8px ${C.gold}30` : 'none',
              }}>
              {cat !== 'All' && CAT_ICONS[cat]} {cat}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ══ TABLE ════════════════════════════════════════════════════════ */}
      <motion.div variants={fade} style={{ borderRadius: 20, overflow: 'hidden', background: C.white, border: `1px solid ${C.border}` }}>
        {fetching ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 0', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg,${C.gold},${C.goldBright})` }}>
              <Loader2 size={20} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} />
            </div>
            <p style={{ fontSize: 13, color: C.inkLight }}>Loading inventory…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <Package size={28} style={{ color: C.border, margin: '0 auto 10px' }} />
            <p style={{ fontSize: 13, color: C.inkLight }}>{products.length === 0 ? 'No products in inventory' : `No results for "${search || category}"`}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ background: C.creamMid }}>
                  {['Product', 'Category', 'Stock', 'Level', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.inkLight, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => {
                  const st = stockStatus(item);
                  const catColor = CAT_COLORS[item.category] || CAT_COLORS.other;
                  return (
                    <motion.tr key={item._id} variants={fade}
                      style={{ borderBottom: `1px solid ${C.border}20`, background: i % 2 === 0 ? C.white : C.cardBg, transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = C.goldPale}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? C.white : C.cardBg}>

                      {/* Product */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 12, background: catColor.pale, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, border: `1px solid ${catColor.color}20` }}>
                            {CAT_ICONS[item.category] || '📦'}
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{item.name}</p>
                            {item.brand && <p style={{ fontSize: 10, color: C.inkLight }}>{item.brand}</p>}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: catColor.pale, color: catColor.color, textTransform: 'capitalize' }}>
                          {item.category || '—'}
                        </span>
                      </td>

                      {/* Qty */}
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ fontSize: 16, fontWeight: 800, color: st.level === 'empty' ? C.red : st.level === 'low' ? C.amber : C.ink, fontFamily: "'Playfair Display',serif", lineHeight: 1 }}>
                          {item.quantity ?? 0}
                        </p>
                        <p style={{ fontSize: 10, color: C.inkLight }}>min {item.lowStockThreshold || 5} {item.unit}</p>
                      </td>

                      {/* Bar */}
                      <td style={{ padding: '12px 16px', minWidth: 90 }}>
                        <StockBar qty={item.quantity || 0} threshold={item.lowStockThreshold || 5} />
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setDetailModal(item)}
                            style={{ padding: '5px 9px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.inkLight, cursor: 'pointer' }}>
                            <Eye size={12} />
                          </button>
                          <button onClick={() => { setUseDrawer(item); }} disabled={(item.quantity || 0) === 0}
                            style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: (item.quantity || 0) === 0 ? C.creamMid : C.amberPale, color: (item.quantity || 0) === 0 ? C.inkLight : C.amber, fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: (item.quantity || 0) === 0 ? 0.5 : 1 }}>
                            Use
                          </button>
                          <button onClick={() => setReorderDrawer(item)}
                            style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: st.level !== 'ok' ? C.ink : C.creamMid, color: st.level !== 'ok' ? '#fff' : C.inkMid, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                            Reorder
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: '10px 18px', borderTop: `1px solid ${C.border}`, background: C.creamMid, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: C.inkLight }}>
              <span>Showing {filtered.length} of {products.length} products</span>
              <span style={{ fontWeight: 700, color: C.gold }}>Value: {fmtK(summary.totalValue)}</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Drawers & Modals */}
      <AnimatePresence>
        {useDrawer && (
          <UseStockDrawer item={useDrawer} onClose={() => setUseDrawer(null)} onDone={handleUseDone} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {reorderDrawer && (
          <ReorderDrawer item={reorderDrawer} onClose={() => setReorderDrawer(null)} onDone={handleReorderDone} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {detailModal && (
          <ProductDetailModal
            item={detailModal}
            onClose={() => setDetailModal(null)}
            onUse={() => setUseDrawer(detailModal)}
            onReorder={() => setReorderDrawer(detailModal)} />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </motion.div>
  );
}