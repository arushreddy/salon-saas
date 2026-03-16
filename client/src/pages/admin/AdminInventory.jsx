import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Loader2, Package, AlertTriangle, IndianRupee,
  Edit2, Trash2, Sparkles, RefreshCw, X, Download,
  BarChart2, TrendingUp, TrendingDown, Check,
  ChevronDown, History, Printer, ArrowUpRight,
  LayoutGrid, LayoutList, Tag, Zap, AlertCircle,
  ShoppingCart, Boxes, Activity, DollarSign,
} from 'lucide-react';
import api from '@/services/api';
import { useDataStore } from '@/context/DataStore';

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════
const C = {
  pageBg: '#F4EDE0', cardBg: '#FDFAF4', heroBg: '#0E0B06', heroBg2: '#1C1608',
  gold: '#B8860B', goldLight: '#DAA520', goldBright: '#F0C040', goldPale: '#FFF8E7',
  goldDeep: '#8B6914', goldGlow: 'rgba(218,165,32,0.18)',
  ink: '#1A1208', inkMid: '#5C4A2A', inkLight: '#9C8660', inkGhost: '#C8B090',
  border: '#DFD0A8', borderMid: '#C9B07A', cream: '#FDF8F0', creamMid: '#F7EFD8', creamDark: '#EDE0C0',
  green: '#15803D', greenPale: '#DCFCE7', greenBorder: '#86EFAC',
  red: '#991B1B', redPale: '#FEF2F2', redBorder: '#FECACA',
  amber: '#92400E', amberPale: '#FFFBEB', amberBorder: '#FDE68A',
  blue: '#1D4ED8', bluePale: '#EFF6FF', blueBorder: '#BFDBFE',
  white: '#FFFFFF',
};

const ease = [0.22, 0.61, 0.36, 1];
const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease } } };
const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.48, ease } } };
const popIn = { hidden: { scale: 0.9, opacity: 0 }, show: { scale: 1, opacity: 1, transition: { type: 'spring', damping: 22, stiffness: 340 } } };
const slideIn = { hidden: { x: 460, opacity: 0 }, show: { x: 0, opacity: 1, transition: { type: 'spring', damping: 28, stiffness: 240 } } };
const stag = (d = 0.05) => ({ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: d } } });

const Rs = n => Number(n || 0).toLocaleString('en-IN');
const fmtK = n => { if (!n) return '₹0'; if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`; if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`; return `₹${Rs(n)}`; };
const today = () => new Date().toISOString().split('T')[0];
const fmtDt = d => { try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return '—'; } };

const CATEGORIES = {
  all: 'All', shampoo: 'Shampoo', conditioner: 'Conditioner', oil: 'Oil',
  color: 'Color', cream: 'Cream', serum: 'Serum', tools: 'Tools',
  accessories: 'Accessories', consumables: 'Consumables', other: 'Other',
};
const CAT_ICONS = {
  shampoo: '🧴', conditioner: '💧', oil: '🫙', color: '🎨', cream: '🧈',
  serum: '✨', tools: '✂️', accessories: '💎', consumables: '📦', other: '📋',
};
const UNITS = ['pieces', 'ml', 'liters', 'grams', 'kg', 'bottles', 'packets', 'boxes'];

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

const fetchItemHistory = async (productId) => {
  try {
    const { data } = await api.get('/inventory/history', { params: { productId, limit: 80 } });
    return data.logs || [];
  } catch { return []; }
};




// ═══════════════════════════════════════════════════════════════════════════
// ATOMS
// ═══════════════════════════════════════════════════════════════════════════
const inpStyle = {
  width: '100%', padding: '9px 13px', borderRadius: 10,
  border: `1.5px solid ${C.border}`, background: C.white,
  fontSize: 13, color: C.ink, outline: 'none', fontFamily: "'DM Sans',sans-serif",
  boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s',
};
const Inp = ({ style, ...props }) => (
  <input {...props} style={{ ...inpStyle, ...style }}
    onFocus={e => { e.target.style.borderColor = C.gold; e.target.style.boxShadow = `0 0 0 3px ${C.goldPale}`; }}
    onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }} />
);

const FlashMsg = ({ msg }) => (
  <AnimatePresence>
    {msg?.text && (
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, marginBottom: 12, fontSize: 13, fontWeight: 600,
          background: msg.ok ? C.greenPale : C.redPale, color: msg.ok ? C.green : C.red,
          border: `1px solid ${msg.ok ? C.greenBorder : C.redBorder}`,
        }}>
        {msg.ok ? <Check size={14} /> : <AlertCircle size={14} />}{msg.text}
      </motion.div>
    )}
  </AnimatePresence>
);

const SecHead = ({ children, icon: Icon }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
    {Icon && (
      <div style={{ width: 22, height: 22, borderRadius: 6, background: C.goldPale, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={11} style={{ color: C.gold }} />
      </div>
    )}
    <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: C.gold }}>{children}</p>
  </div>
);

const StockBar = ({ qty, threshold, max }) => {
  const maxVal = Math.max(max || threshold * 4, qty + 1, 1);
  const pct = Math.min((qty / maxVal) * 100, 100);
  const color = qty === 0 ? C.red : qty <= threshold ? C.amber : qty <= threshold * 2 ? C.gold : C.green;
  return (
    <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', background: C.creamDark }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{ height: '100%', borderRadius: 3, background: color }} />
    </div>
  );
};

const StatusChip = ({ product }) => {
  const isEmpty = product.quantity === 0;
  const isLow = !isEmpty && product.quantity <= product.lowStockThreshold;
  if (isEmpty) return <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: C.redPale, color: C.red }}>⛔ Empty</span>;
  if (isLow) return <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: C.amberPale, color: C.amber }}>⚠ Low</span>;
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: C.greenPale, color: C.green }}>✓ OK</span>;
};

const MarginBadge = ({ cost, selling }) => {
  if (!selling || selling <= 0 || !cost || cost <= 0) return null;
  const m = Math.round(((selling - cost) / selling) * 100);
  const color = m >= 50 ? C.green : m >= 25 ? C.gold : m >= 10 ? C.amber : C.red;
  const bg = m >= 50 ? C.greenPale : m >= 25 ? C.goldPale : m >= 10 ? C.amberPale : C.redPale;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: bg, color }}>{m}% margin</span>;
};

const StatTile = ({ icon: Icon, value, label, color, pale, sub }) => (
  <motion.div variants={fade} whileHover={{ y: -2 }}
    style={{ padding: '18px 20px', borderRadius: 18, background: C.white, border: `1px solid ${C.border}`, boxShadow: `0 2px 12px rgba(139,100,0,0.05)`, flex: 1, minWidth: 120 }}>
    <div style={{ width: 36, height: 36, borderRadius: 10, background: pale, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, border: `1px solid ${color}20` }}>
      <Icon size={17} style={{ color }} />
    </div>
    <p style={{ fontSize: 22, fontWeight: 800, color: C.ink, fontFamily: "'Playfair Display',serif", lineHeight: 1.1 }}>{value}</p>
    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.inkLight, marginTop: 3 }}>{label}</p>
    {sub && <p style={{ fontSize: 11, color, fontWeight: 600, marginTop: 4 }}>{sub}</p>}
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════
// STOCK UPDATE MODAL
// ═══════════════════════════════════════════════════════════════════════════
const StockModal = ({ product, initialType = 'add', onClose, onDone }) => {
  const [type, setType] = useState(initialType);
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', ok: true });
  const flash = (t, ok = true) => { setMsg({ text: t, ok }); setTimeout(() => setMsg({ text: '', ok: true }), 3000); };

  const submit = async () => {
    if (!qty || isNaN(qty) || Number(qty) <= 0) { flash('Enter a valid quantity', false); return; }
    setSaving(true);
    try {
      await api.patch(`/inventory/${product._id}/stock`, { quantity: Number(qty), type, notes: reason || `Manual ${type}` });
      
      onDone();
      onClose();
    } catch (e) { flash(e.response?.data?.message || 'Failed to update stock', false); }
    finally { setSaving(false); }
  };

  const presets = type === 'add' ? [5, 10, 25, 50, 100] : [1, 2, 5, 10];
  const newQty = qty && !isNaN(qty) && Number(qty) > 0
    ? (type === 'add' ? product.quantity + Number(qty) : Math.max(0, product.quantity - Number(qty)))
    : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(14,11,6,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div variants={popIn} initial="hidden" animate="show" exit="hidden"
        style={{ width: '100%', maxWidth: 400, borderRadius: 24, overflow: 'hidden', background: C.cream, boxShadow: '0 32px 80px rgba(14,11,6,0.3)' }}>

        {/* Header */}
        <div style={{ position: 'relative', overflow: 'hidden', padding: '18px 20px', background: `linear-gradient(135deg,${C.heroBg},#2d2510)` }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.07, backgroundImage: 'repeating-linear-gradient(45deg,#B8860B 0,#B8860B 1px,transparent 0,transparent 50%)', backgroundSize: '12px 12px' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', fontFamily: "'Playfair Display',serif" }}>{product.name}</p>
              <p style={{ fontSize: 11, color: C.inkGhost, marginTop: 2 }}>Current stock: {product.quantity} {product.unit}</p>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} style={{ color: '#fff' }} />
            </button>
          </div>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FlashMsg msg={msg} />

          {/* Type toggle */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[['add', '+ Add Stock', C.green, C.greenPale], ['use', '− Use / Deduct', C.amber, C.amberPale]].map(([v, l, col, bg]) => (
              <button key={v} onClick={() => setType(v)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: type === v ? col : bg, color: type === v ? '#fff' : col,
                  border: `1.5px solid ${type === v ? col : col + '30'}`, transition: 'all 0.15s',
                }}>{l}</button>
            ))}
          </div>

          {/* Quick presets */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: C.gold, marginBottom: 8 }}>Quick Select</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {presets.map(p => (
                <button key={p} onClick={() => setQty(String(p))}
                  style={{
                    padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    background: qty === String(p) ? C.ink : C.creamMid, color: qty === String(p) ? '#fff' : C.inkMid,
                    border: `1px solid ${qty === String(p) ? C.ink : C.border}`, transition: 'all 0.15s',
                  }}>{p}</button>
              ))}
            </div>
          </div>

          {/* Qty input */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: C.gold, marginBottom: 8 }}>Quantity</p>
            <Inp type="number" min={1} placeholder={`Units to ${type}`} value={qty}
              onChange={e => setQty(e.target.value)}
              style={{ fontSize: 18, fontWeight: 700, textAlign: 'center' }} />
            {newQty !== null && (
              <p style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', marginTop: 6, color: newQty === 0 ? C.red : newQty <= product.lowStockThreshold ? C.amber : C.green }}>
                New stock: {newQty} {product.unit}
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: C.gold, marginBottom: 8 }}>Reason (optional)</p>
            <Inp type="text" placeholder="e.g. New delivery, Used in service…" value={reason} onChange={e => setReason(e.target.value)} />
          </div>

          {/* Submit */}
          <button onClick={submit} disabled={!qty || isNaN(qty) || Number(qty) <= 0 || saving}
            style={{
              width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              background: type === 'add' ? `linear-gradient(135deg,${C.green},#22C55E)` : `linear-gradient(135deg,${C.amber},#F59E0B)`,
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: !qty || isNaN(qty) || Number(qty) <= 0 || saving ? 0.4 : 1,
            }}>
            {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <><Check size={15} /> Confirm {type === 'add' ? 'Add' : 'Deduct'}</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// HISTORY PANEL
// ═══════════════════════════════════════════════════════════════════════════
const TYPE_META = {
  add:        { label: 'Added',     color: C.green,  bg: C.greenPale,  Icon: TrendingUp   },
  refill:     { label: 'Restocked', color: C.green,  bg: C.greenPale,  Icon: TrendingUp   },
  use:        { label: 'Used',      color: C.amber,  bg: C.amberPale,  Icon: TrendingDown },
  wastage:    { label: 'Wastage',   color: C.red,    bg: C.redPale,    Icon: TrendingDown },
  adjustment: { label: 'Adjusted',  color: C.blue,   bg: C.bluePale,   Icon: Activity     },
};

const HistoryPanel = ({ product, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const logs = await fetchItemHistory(product._id);
      setHistory(logs);
      setLoading(false);
    })();
  }, [product._id]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end', background: 'rgba(14,11,6,0.5)', backdropFilter: 'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div variants={slideIn} initial="hidden" animate="show" exit="hidden"
        style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', height: '100%', background: C.pageBg }}>

        {/* Header */}
        <div style={{ position: 'relative', overflow: 'hidden', padding: '20px', flexShrink: 0, background: `linear-gradient(135deg,${C.heroBg},#2d2510)` }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundImage: 'repeating-linear-gradient(45deg,#B8860B 0,#B8860B 1px,transparent 0,transparent 50%)', backgroundSize: '14px 14px' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.goldBright, marginBottom: 4 }}>Stock History</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: "'Playfair Display',serif" }}>{product.name}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <div style={{ textAlign: 'center', padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.08)' }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: "'Playfair Display',serif" }}>{product.quantity}</p>
                  <p style={{ fontSize: 9, color: C.inkGhost, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{product.unit}</p>
                </div>
                <div style={{ textAlign: 'center', padding: '8px 14px', borderRadius: 10, background: product.quantity <= product.lowStockThreshold ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: product.quantity <= product.lowStockThreshold ? '#fca5a5' : '#86efac' }}>
                    {product.quantity === 0 ? '⛔ Empty' : product.quantity <= product.lowStockThreshold ? '⚠ Low' : '✓ OK'}
                  </p>
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} style={{ color: '#fff' }} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <Loader2 size={22} style={{ color: C.gold, animation: 'spin 1s linear infinite' }} />
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <History size={28} style={{ color: C.border, margin: '0 auto 10px' }} />
              <p style={{ fontSize: 13, color: C.inkLight }}>No history yet</p>
            </div>
          ) : history.map((h, i) => {
            const isUse = h.type === 'use' || h.type === 'wastage';
            const meta = TYPE_META[h.type] || TYPE_META.adjustment;
            const Icon = meta.Icon;
            return (
              <motion.div key={h._id || i} variants={fade}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 14, background: i % 2 === 0 ? C.white : C.cardBg, border: `1px solid ${C.border}` }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: meta.bg }}>
                  <Icon size={14} style={{ color: meta.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: meta.color }}>{isUse ? '−' : '+'}{h.quantity} {product.unit}</p>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: meta.bg, color: meta.color }}>{meta.label}</span>
                  </div>
                  {h.performedBy?.name && <p style={{ fontSize: 11, color: C.inkMid, fontWeight: 600 }}>👤 {h.performedBy.name}</p>}
                  {h.customerName && <p style={{ fontSize: 11, color: C.inkLight }}>💅 {h.customerName}</p>}
                  {h.serviceName && <p style={{ fontSize: 11, color: C.inkLight }}>✂️ {h.serviceName}</p>}
                  {h.notes && <p style={{ fontSize: 11, color: C.inkLight, fontStyle: 'italic' }}>{h.notes}</p>}
                  {h.stockBefore !== undefined && h.stockAfter !== undefined && (
                    <p style={{ fontSize: 10, color: C.inkLight }}>Stock: {h.stockBefore} → {h.stockAfter} {product.unit}</p>
                  )}
                  <p style={{ fontSize: 10, color: C.inkLight, marginTop: 3 }}>{fmtDt(h.createdAt || h.at)}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT FORM DRAWER
// ═══════════════════════════════════════════════════════════════════════════
const ProductForm = ({ product, onClose, onSaved }) => {
  const isEdit = !!product;
  const [form, setForm] = useState({
    name: product?.name || '',
    category: product?.category || 'other',
    brand: product?.brand || '',
    quantity: product?.quantity ?? '',
    unit: product?.unit || 'pieces',
    costPrice: product?.costPrice ?? '',
    sellingPrice: product?.sellingPrice ?? '',
    lowStockThreshold: product?.lowStockThreshold ?? '5',
    notes: product?.notes || '',
    'supplier.name': product?.supplier?.name || '',
    'supplier.phone': product?.supplier?.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', ok: true });
  const flash = (t, ok = true) => { setMsg({ text: t, ok }); setTimeout(() => setMsg({ text: '', ok: true }), 3000); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const margin = form.costPrice && form.sellingPrice && Number(form.sellingPrice) > 0
    ? Math.round(((Number(form.sellingPrice) - Number(form.costPrice)) / Number(form.sellingPrice)) * 100) : null;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.quantity === '' || form.costPrice === '') { flash('Fill required fields', false); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name, category: form.category, brand: form.brand,
        quantity: Number(form.quantity), unit: form.unit,
        costPrice: Number(form.costPrice), sellingPrice: Number(form.sellingPrice) || 0,
        lowStockThreshold: Number(form.lowStockThreshold) || 5, notes: form.notes,
        supplier: { name: form['supplier.name'], phone: form['supplier.phone'] },
      };
      if (isEdit) await api.put(`/inventory/${product._id}`, payload);
      else await api.post('/inventory', payload);
      
      onSaved();
      onClose();
    } catch (e) { flash(e.response?.data?.message || 'Failed to save', false); }
    finally { setSaving(false); }
  };

  const fieldStyle = { display: 'flex', flexDirection: 'column', gap: 6 };
  const labelStyle = { fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: C.gold };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end', background: 'rgba(14,11,6,0.5)', backdropFilter: 'blur(5px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div variants={slideIn} initial="hidden" animate="show" exit="hidden"
        style={{ width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', height: '100%', background: C.pageBg }}>

        <div style={{ position: 'relative', overflow: 'hidden', padding: '20px', flexShrink: 0, background: `linear-gradient(135deg,${C.heroBg},#2d2510)` }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundImage: 'repeating-linear-gradient(45deg,#B8860B 0,#B8860B 1px,transparent 0,transparent 50%)', backgroundSize: '14px 14px' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.goldBright, marginBottom: 4 }}>
                {isEdit ? 'Edit Product' : 'Add Product'}
              </p>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: "'Playfair Display',serif" }}>
                {isEdit ? product.name : 'New Inventory Item'}
              </p>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} style={{ color: '#fff' }} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <FlashMsg msg={msg} />

            {/* Basic info */}
            <div style={{ borderRadius: 16, padding: '16px', background: C.white, border: `1px solid ${C.border}` }}>
              <SecHead icon={Package}>Basic Info</SecHead>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Name *</label>
                  <Inp placeholder="Product name…" value={form.name} onChange={e => set('name', e.target.value)} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Category</label>
                    <select value={form.category} onChange={e => set('category', e.target.value)}
                      style={{ ...inpStyle, cursor: 'pointer' }}
                      onFocus={e => { e.target.style.borderColor = C.gold; e.target.style.boxShadow = `0 0 0 3px ${C.goldPale}`; }}
                      onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}>
                      {Object.entries(CATEGORIES).filter(([k]) => k !== 'all').map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Brand</label>
                    <Inp placeholder="Brand name…" value={form.brand} onChange={e => set('brand', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Stock */}
            <div style={{ borderRadius: 16, padding: '16px', background: C.white, border: `1px solid ${C.border}` }}>
              <SecHead icon={Boxes}>Stock</SecHead>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Qty *</label>
                  <Inp type="number" min={0} placeholder="0" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Unit</label>
                  <select value={form.unit} onChange={e => set('unit', e.target.value)}
                    style={{ ...inpStyle, cursor: 'pointer' }}
                    onFocus={e => { e.target.style.borderColor = C.gold; e.target.style.boxShadow = `0 0 0 3px ${C.goldPale}`; }}
                    onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Min Alert</label>
                  <Inp type="number" min={1} placeholder="5" value={form.lowStockThreshold} onChange={e => set('lowStockThreshold', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div style={{ borderRadius: 16, padding: '16px', background: C.white, border: `1px solid ${C.border}` }}>
              <SecHead icon={IndianRupee}>Pricing</SecHead>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Cost Price *</label>
                  <Inp type="number" min={0} step="0.01" placeholder="₹0" value={form.costPrice} onChange={e => set('costPrice', e.target.value)} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Selling Price</label>
                  <Inp type="number" min={0} step="0.01" placeholder="₹0" value={form.sellingPrice} onChange={e => set('sellingPrice', e.target.value)} />
                </div>
              </div>
              {margin !== null && (
                <div style={{ padding: '8px 12px', borderRadius: 10, background: margin >= 25 ? C.greenPale : C.amberPale, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: margin >= 25 ? C.green : C.amber }}>
                    {margin}% profit margin on this product
                  </span>
                </div>
              )}
            </div>

            {/* Supplier */}
            <div style={{ borderRadius: 16, padding: '16px', background: C.white, border: `1px solid ${C.border}` }}>
              <SecHead icon={ShoppingCart}>Supplier (optional)</SecHead>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Supplier Name</label>
                  <Inp placeholder="Supplier Co…" value={form['supplier.name']} onChange={e => set('supplier.name', e.target.value)} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Phone</label>
                  <Inp placeholder="Phone…" value={form['supplier.phone']} onChange={e => set('supplier.phone', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div style={{ borderRadius: 16, padding: '16px', background: C.white, border: `1px solid ${C.border}` }}>
              <SecHead icon={Tag}>Notes</SecHead>
              <textarea rows={2} placeholder="Storage instructions, usage notes…" value={form.notes} onChange={e => set('notes', e.target.value)}
                style={{ ...inpStyle, resize: 'none' }}
                onFocus={e => { e.target.style.borderColor = C.gold; e.target.style.boxShadow = `0 0 0 3px ${C.goldPale}`; }}
                onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }} />
            </div>
          </form>
        </div>

        <div style={{ padding: '16px', borderTop: `1px solid ${C.border}`, background: C.white, display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.white, color: C.inkMid, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={submit} disabled={saving}
            style={{
              flex: 2, padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              background: `linear-gradient(135deg,${C.gold},${C.goldBright})`, color: C.heroBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: saving ? 0.6 : 1,
            }}>
            {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <><Check size={15} /> {isEdit ? 'Save Changes' : 'Add Product'}</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT CARD
// ═══════════════════════════════════════════════════════════════════════════
const ProductCard = ({ product, onEdit, onDelete, onStock, onHistory, viewMode }) => {
  const isEmpty = product.quantity === 0;
  const isLow = !isEmpty && product.quantity <= product.lowStockThreshold;
  const margin = product.sellingPrice > 0 && product.costPrice > 0
    ? Math.round(((product.sellingPrice - product.costPrice) / product.sellingPrice) * 100) : null;
  const totalVal = product.quantity * (product.costPrice || 0);
  const catColor = CAT_COLORS[product.category] || CAT_COLORS.other;
  const borderCol = isEmpty ? C.red : isLow ? C.amber : C.border;

  if (viewMode === 'list') return (
    <motion.tr variants={fade}
      style={{ background: isEmpty ? C.redPale + '40' : isLow ? C.amberPale + '60' : C.white, borderBottom: `1px solid ${C.border}20`, transition: 'background 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background = C.goldPale}
      onMouseLeave={e => e.currentTarget.style.background = isEmpty ? C.redPale + '40' : isLow ? C.amberPale + '60' : C.white}>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: catColor.pale, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, border: `1px solid ${catColor.color}20` }}>
            {CAT_ICONS[product.category] || '📦'}
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{product.name}</p>
            {product.brand && <p style={{ fontSize: 10, color: C.inkLight }}>{product.brand}</p>}
          </div>
        </div>
      </td>
      <td style={{ padding: '12px 16px' }}>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: catColor.pale, color: catColor.color, textTransform: 'capitalize' }}>
          {CAT_ICONS[product.category]} {product.category}
        </span>
      </td>
      <td style={{ padding: '12px 16px' }}>
        <p style={{ fontSize: 16, fontWeight: 800, color: isEmpty ? C.red : isLow ? C.amber : C.ink }}>{product.quantity}</p>
        <p style={{ fontSize: 10, color: C.inkLight }}>{product.unit}</p>
      </td>
      <td style={{ padding: '12px 16px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>{fmtK(product.costPrice)}</p>
        {margin !== null && <MarginBadge cost={product.costPrice} selling={product.sellingPrice} />}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: C.blue }}>{fmtK(totalVal)}</p>
      </td>
      <td style={{ padding: '12px 16px' }}><StatusChip product={product} /></td>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => onStock(product, 'add')} style={{ padding: '5px 10px', borderRadius: 8, background: C.greenPale, color: C.green, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer' }}>+Add</button>
          <button onClick={() => onStock(product, 'use')} style={{ padding: '5px 10px', borderRadius: 8, background: C.amberPale, color: C.amber, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer' }}>−Use</button>
          <button onClick={() => onHistory(product)} style={{ padding: '5px 7px', borderRadius: 8, background: C.creamMid, border: 'none', cursor: 'pointer' }}><History size={12} style={{ color: C.inkLight }} /></button>
          <button onClick={() => onEdit(product)} style={{ padding: '5px 7px', borderRadius: 8, background: C.creamMid, border: 'none', cursor: 'pointer' }}><Edit2 size={12} style={{ color: C.inkLight }} /></button>
          <button onClick={() => onDelete(product._id)} style={{ padding: '5px 7px', borderRadius: 8, background: C.redPale, border: 'none', cursor: 'pointer' }}><Trash2 size={12} style={{ color: C.red }} /></button>
        </div>
      </td>
    </motion.tr>
  );

  return (
    <motion.div variants={fade} layout
      whileHover={{ y: -3, boxShadow: `0 14px 40px rgba(139,100,0,0.12)` }}
      style={{
        borderRadius: 20, overflow: 'hidden', background: C.white,
        border: `1.5px solid ${borderCol}50`,
        boxShadow: isEmpty ? `0 0 0 1px ${C.redPale}` : isLow ? `0 0 0 1px ${C.amberPale}` : '0 2px 12px rgba(139,100,0,0.05)',
        transition: 'all 0.2s ease',
      }}>

      {/* Status stripe */}
      <div style={{ height: 3, background: isEmpty ? C.red : isLow ? `linear-gradient(90deg,${C.amber},#F59E0B)` : `linear-gradient(90deg,${C.green},#22C55E)` }} />

      <div style={{ padding: '14px 14px 12px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: catColor.pale, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, border: `1px solid ${catColor.color}20` }}>
              {CAT_ICONS[product.category] || '📦'}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: C.ink, fontFamily: "'Playfair Display',serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{product.name}</p>
              <div style={{ display: 'flex', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: catColor.pale, color: catColor.color, textTransform: 'capitalize' }}>{product.category}</span>
                {product.brand && <span style={{ fontSize: 9, color: C.inkLight }}>{product.brand}</span>}
              </div>
            </div>
          </div>
          <StatusChip product={product} />
        </div>

        {/* Stock level */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 }}>
            <div>
              <p style={{ fontSize: 24, fontWeight: 800, color: isEmpty ? C.red : isLow ? C.amber : C.ink, fontFamily: "'Playfair Display',serif", lineHeight: 1 }}>{product.quantity}</p>
              <p style={{ fontSize: 10, color: C.inkLight }}>{product.unit} in stock</p>
            </div>
            <p style={{ fontSize: 10, color: C.inkLight }}>min {product.lowStockThreshold}</p>
          </div>
          <StockBar qty={product.quantity} threshold={product.lowStockThreshold} max={product.lowStockThreshold * 6} />
        </div>

        {/* Pricing row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
          {[
            [fmtK(product.costPrice), 'Cost', C.inkMid, C.creamMid],
            [product.sellingPrice ? fmtK(product.sellingPrice) : '—', 'Sell', product.sellingPrice ? C.gold : C.inkGhost, C.goldPale],
            [fmtK(totalVal), 'Value', C.blue, C.bluePale],
          ].map(([v, l, col, bg]) => (
            <div key={l} style={{ textAlign: 'center', padding: '7px 4px', borderRadius: 10, background: bg, border: `1px solid ${col}15` }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: col }}>{v}</p>
              <p style={{ fontSize: 9, color: col + 'aa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</p>
            </div>
          ))}
        </div>

        {margin !== null && <div style={{ marginBottom: 8 }}><MarginBadge cost={product.costPrice} selling={product.sellingPrice} /></div>}
        {product.notes && <p style={{ fontSize: 10, color: C.inkLight, marginBottom: 8, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.notes}</p>}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, paddingTop: 10, borderTop: `1px solid ${C.creamDark}` }}>
          <button onClick={() => onStock(product, 'add')}
            style={{ flex: 1, padding: '7px', borderRadius: 10, background: C.greenPale, color: C.green, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <TrendingUp size={11} /> Add
          </button>
          <button onClick={() => onStock(product, 'use')}
            style={{ flex: 1, padding: '7px', borderRadius: 10, background: C.amberPale, color: C.amber, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <TrendingDown size={11} /> Use
          </button>
          <button onClick={() => onHistory(product)} style={{ padding: '7px 9px', borderRadius: 10, background: C.creamMid, border: 'none', cursor: 'pointer' }}>
            <History size={13} style={{ color: C.inkLight }} />
          </button>
          <button onClick={() => onEdit(product)} style={{ padding: '7px 9px', borderRadius: 10, background: C.creamMid, border: 'none', cursor: 'pointer' }}>
            <Edit2 size={13} style={{ color: C.inkLight }} />
          </button>
          <button onClick={() => onDelete(product._id)} style={{ padding: '7px 9px', borderRadius: 10, background: C.redPale, border: 'none', cursor: 'pointer' }}>
            <Trash2 size={13} style={{ color: C.red }} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// REPORT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════
const generateReport = (list, reportTitle = 'Inventory Report') => {
  if (!list.length) return;
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const totalCost = list.reduce((a, p) => a + p.quantity * (p.costPrice || 0), 0);
  const totalSell = list.reduce((a, p) => a + p.quantity * (p.sellingPrice || 0), 0);
  const lowCount = list.filter(p => p.quantity > 0 && p.quantity <= p.lowStockThreshold).length;
  const emptyCount = list.filter(p => p.quantity === 0).length;
  const csvRows = [['#', 'Product', 'Category', 'Brand', 'Qty', 'Unit', 'Cost', 'Sell', 'Value', 'Margin%', 'Status']];
  list.forEach((p, i) => {
    const m = p.sellingPrice > 0 ? Math.round(((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100) : 0;
    const st = p.quantity === 0 ? 'Empty' : p.quantity <= p.lowStockThreshold ? 'Low' : 'OK';
    csvRows.push([i + 1, p.name, p.category, p.brand || '', p.quantity, p.unit, p.costPrice || 0, p.sellingPrice || 0, Math.round(p.quantity * (p.costPrice || 0)), m, st]);
  });
  const csv = csvRows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const tableRows = list.map((p, i) => {
    const m = p.sellingPrice > 0 ? Math.round(((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100) : null;
    const isEmpty = p.quantity === 0, isLow = !isEmpty && p.quantity <= p.lowStockThreshold;
    const sc = isEmpty ? '#991B1B' : isLow ? '#92400E' : '#15803D';
    const sb = isEmpty ? '#FEF2F2' : isLow ? '#FFFBEB' : '#DCFCE7';
    const st = isEmpty ? '⛔ EMPTY' : isLow ? '⚠ LOW' : '✓ OK';
    return `<tr class="${i % 2 === 0 ? 'e' : 'o'}"><td style="color:#B09060">${i + 1}</td><td><strong>${p.name}</strong>${p.brand ? `<br><small style="color:#9C8660">${p.brand}</small>` : ''}</td><td>${CAT_ICONS[p.category] || '📦'} ${p.category}</td><td style="font-weight:700;color:#1A1208">${p.quantity} ${p.unit}</td><td>₹${Rs(p.costPrice || 0)}</td><td>${p.sellingPrice ? '₹' + Rs(p.sellingPrice) : '—'}</td><td style="font-weight:700;color:#1D4ED8">₹${Rs(Math.round(p.quantity * (p.costPrice || 0)))}</td><td style="font-weight:700;color:${m !== null ? (m >= 50 ? '#15803D' : m >= 25 ? '#B8860B' : '#92400E') : '#9C8660'}">${m !== null ? m + '%' : '—'}</td><td><span style="padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:${sb};color:${sc}">${st}</span></td></tr>`;
  }).join('');
  const fn = `Glamour-Inventory-${today()}`;
  const win = window.open('', '_blank', 'width=1200,height=900');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${reportTitle}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,serif;background:#FDF8F0;color:#1A1208;font-size:13px}.p{max-width:1100px;margin:0 auto;padding:44px 40px}.tb{display:flex;gap:10px;margin-bottom:32px}@media print{.tb{display:none}}button{padding:10px 22px;border-radius:30px;border:none;cursor:pointer;font-size:13px;font-weight:700}.bp{background:#B8860B;color:#fff}.bd{background:#15803D;color:#fff}.hd{border-bottom:2px solid #DFD0A8;padding-bottom:20px;margin-bottom:24px}.sn{font-size:28px;font-weight:700;color:#B8860B}.rt{font-size:16px;color:#5C4A2A;margin-top:4px}.rm{font-size:11px;color:#B09060;margin-top:4px}.sm{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px}.ch{background:#F7EFD8;border:1px solid #DFD0A8;border-radius:12px;padding:12px 18px;text-align:center;min-width:100px}.cv{font-size:20px;font-weight:700;color:#B8860B}.cl{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#B09060;margin-top:2px}table{width:100%;border-collapse:collapse;font-size:12px}thead{background:#F7EFD8}th{padding:9px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#9C8660;border-bottom:2px solid #DFD0A8;white-space:nowrap}td{padding:9px 12px;border-bottom:1px solid #EDE0C0;vertical-align:middle}tr.e td{background:#FDF8F0}tr.o td{background:#fff}.ft{margin-top:24px;border-top:1px solid #DFD0A8;padding-top:12px;font-size:10px;color:#9C8660;display:flex;justify-content:space-between}</style></head><body><div class="p"><div class="tb"><button class="bp" onclick="window.print()">🖨 Print</button><button class="bd" onclick="dl()">↓ CSV</button><span style="font-size:11px;color:#9C8660;margin-left:6px">${list.length} products · ${dateStr}</span></div><div class="hd"><div class="sn">✦ Glamour Salon</div><div class="rt">${reportTitle}</div><div class="rm">Generated ${dateStr} at ${timeStr} · ${list.length} products</div></div><div class="sm"><div class="ch"><div class="cv">${list.length}</div><div class="cl">Products</div></div><div class="ch"><div class="cv">${lowCount}</div><div class="cl">Low Stock</div></div><div class="ch"><div class="cv">${emptyCount}</div><div class="cl">Empty</div></div><div class="ch"><div class="cv">₹${Rs(Math.round(totalCost))}</div><div class="cl">Cost Value</div></div><div class="ch"><div class="cv">₹${Rs(Math.round(totalSell))}</div><div class="cl">Sell Value</div></div><div class="ch"><div class="cv">₹${Rs(Math.round(totalSell - totalCost))}</div><div class="cl">Potential Profit</div></div></div><table><thead><tr><th>#</th><th>Product</th><th>Category</th><th>Stock</th><th>Cost</th><th>Sell</th><th>Value</th><th>Margin</th><th>Status</th></tr></thead><tbody>${tableRows}</tbody></table><div class="ft"><span>Glamour Salon — Confidential</span><span>${reportTitle} — ${dateStr}</span></div></div><script>const _c=${JSON.stringify(csv)};function dl(){const b=new Blob([_c],{type:'text/csv'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='${fn}.csv';a.click();URL.revokeObjectURL(u);}<\/script></body></html>`);
  win.document.close();
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function AdminInventory() {
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('name');
  const [viewMode, setViewMode] = useState('grid');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [stockModal, setStockModal] = useState(null);
  const [histModal, setHistModal] = useState(null);
  const [msg, setMsg] = useState({ text: '', ok: true });
  const [filterLow, setFilterLow] = useState(false);
  const searchRef = useRef(null);
  const { broadcastChange } = useDataStore();

  const flash = (t, ok = true) => { setMsg({ text: t, ok }); setTimeout(() => setMsg({ text: '', ok: true }), 3500); };

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (filterLow) params.lowStock = 'true';
      const { data } = await api.get('/inventory', { params });
      setProducts(data.products || []);
      setSummary(data.summary || null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, filterLow]);

  useEffect(() => { const t = setTimeout(fetchProducts, 300); return () => clearTimeout(t); }, [fetchProducts]);

  // Listen on the shared glamour_bookings_sync channel — broadcastChange() from
  // any panel (receptionist deducting stock, etc.) triggers a local re-fetch here.
  useEffect(() => {
    let BC2;
    try { BC2 = new BroadcastChannel('glamour_bookings_sync'); } catch { return; }
    let timer;
    const handler = e => {
      if (e.data?.type !== 'refresh') return;
      clearTimeout(timer);
      timer = setTimeout(fetchProducts, 700);
    };
    BC2.addEventListener('message', handler);
    return () => { BC2.removeEventListener('message', handler); try { BC2.close(); } catch {} clearTimeout(timer); };
  }, [fetchProducts]);

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this product permanently?')) return;
    try {
      await api.delete(`/inventory/${id}`);
      flash('✓ Product removed');
      fetchProducts();
      broadcastChange();
      
    } catch (e) { flash(e.response?.data?.message || 'Failed to delete', false); }
  };

  const filtered = useMemo(() => {
    let list = [...products];
    if (category !== 'all') list = list.filter(p => p.category === category);
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'stock') list.sort((a, b) => a.quantity - b.quantity);
    if (sort === 'value') list.sort((a, b) => (b.quantity * (b.costPrice || 0)) - (a.quantity * (a.costPrice || 0)));
    if (sort === 'cost') list.sort((a, b) => (b.costPrice || 0) - (a.costPrice || 0));
    if (sort === 'margin') list.sort((a, b) => {
      const ma = a.sellingPrice > 0 ? ((a.sellingPrice - a.costPrice) / a.sellingPrice) * 100 : 0;
      const mb = b.sellingPrice > 0 ? ((b.sellingPrice - b.costPrice) / b.sellingPrice) * 100 : 0;
      return mb - ma;
    });
    return list;
  }, [products, category, sort]);

  const stats = useMemo(() => ({
    total: products.length,
    lowStock: products.filter(p => p.quantity > 0 && p.quantity <= p.lowStockThreshold).length,
    empty: products.filter(p => p.quantity === 0).length,
    totalValue: products.reduce((a, p) => a + p.quantity * (p.costPrice || 0), 0),
    sellValue: products.reduce((a, p) => a + p.quantity * (p.sellingPrice || 0), 0),
  }), [products]);

  const alertItems = useMemo(() => [
    ...products.filter(p => p.quantity === 0),
    ...products.filter(p => p.quantity > 0 && p.quantity <= p.lowStockThreshold),
  ], [products]);

  return (
    <motion.div variants={stag(0.06)} initial="hidden" animate="show"
      style={{ minHeight: '100vh', paddingBottom: 56, background: C.pageBg, fontFamily: "'DM Sans',sans-serif" }}>

      {/* ══ HERO HEADER ══════════════════════════════════════════════════ */}
      <motion.div variants={fadeUp}
        style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, padding: '28px 28px 24px', marginBottom: 20, background: `linear-gradient(135deg,${C.heroBg},#2a1e08)`, border: '1px solid #3a2a0c' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundImage: 'repeating-linear-gradient(45deg,#B8860B 0,#B8860B 1px,transparent 0,transparent 50%)', backgroundSize: '18px 18px' }} />
        <div style={{ position: 'absolute', right: -60, top: -60, width: 280, height: 280, borderRadius: '50%', background: `radial-gradient(circle,${C.goldBright}12,transparent 70%)` }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.goldBright, boxShadow: `0 0 8px ${C.goldBright}` }} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase', color: C.goldBright }}>Stock Management</span>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', fontFamily: "'Playfair Display',serif", lineHeight: 1.1, marginBottom: 8 }}>Inventory</h1>
            <p style={{ fontSize: 13, color: '#7a6a50' }}>
              {stats.total} products &nbsp;·&nbsp;
              {stats.lowStock > 0 && <span style={{ color: '#fbbf24' }}>{stats.lowStock} low stock &nbsp;·&nbsp; </span>}
              {stats.empty > 0 && <span style={{ color: '#f87171' }}>{stats.empty} empty &nbsp;·&nbsp; </span>}
              <span style={{ color: C.goldBright, fontWeight: 700 }}>{fmtK(stats.totalValue)}</span> cost value
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => fetchProducts()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.08)', color: '#fff' }}>
              <RefreshCw size={13} /> Refresh
            </button>
            <button onClick={() => generateReport(filtered, 'Inventory Report')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.08)', color: '#fff' }}>
              <Download size={13} /> Export
            </button>
            <button onClick={() => { setEditing(null); setShowForm(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: `linear-gradient(135deg,${C.gold},${C.goldBright})`, color: C.heroBg }}>
              <Plus size={13} /> Add Product
            </button>
          </div>
        </div>
      </motion.div>

      {/* ══ STAT TILES ═══════════════════════════════════════════════════ */}
      <motion.div variants={stag(0.06)} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatTile icon={Package} value={stats.total} label="Total Products" color={C.inkMid} pale={C.creamMid} />
        <StatTile icon={AlertTriangle} value={stats.lowStock} label="Low Stock" color={C.amber} pale={C.amberPale} sub={stats.lowStock > 0 ? 'Needs restock soon' : 'All good'} />
        <StatTile icon={Zap} value={stats.empty} label="Out of Stock" color={C.red} pale={C.redPale} sub={stats.empty > 0 ? 'Urgent attention' : 'None empty'} />
        <StatTile icon={IndianRupee} value={fmtK(stats.totalValue)} label="Cost Value" color={C.gold} pale={C.goldPale} />
        <StatTile icon={TrendingUp} value={fmtK(stats.sellValue)} label="Sell Value" color={C.green} pale={C.greenPale} sub={stats.totalValue > 0 ? `${Math.round(((stats.sellValue - stats.totalValue) / stats.totalValue) * 100)}% potential margin` : null} />
      </motion.div>

      {/* ══ FLASH ════════════════════════════════════════════════════════ */}
      <FlashMsg msg={msg} />

      {/* ══ ALERTS ═══════════════════════════════════════════════════════ */}
      {alertItems.length > 0 && (
        <motion.div variants={fade} style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 20, border: `1px solid ${C.amberBorder}` }}>
          <div style={{ padding: '12px 18px', background: C.amberPale, borderBottom: `1px solid ${C.amberBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={15} style={{ color: C.amber }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: C.amber }}>{alertItems.length} items need attention</span>
            </div>
            <span style={{ fontSize: 11, color: C.amber }}>Click to restock →</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', background: C.white }}>
            {alertItems.map(item => {
              const isEmpty = item.quantity === 0;
              return (
                <div key={item._id} style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                    <p style={{ fontSize: 10, fontWeight: 700, color: isEmpty ? C.red : C.amber }}>{isEmpty ? '⛔ Empty' : `${item.quantity} left (min ${item.lowStockThreshold})`}</p>
                  </div>
                  <button onClick={() => setStockModal({ product: item, type: 'add' })}
                    style={{ padding: '4px 12px', borderRadius: 8, background: C.ink, color: '#fff', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                    + Restock
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ══ SEARCH + CONTROLS ════════════════════════════════════════════ */}
      <motion.div variants={fade} style={{ borderRadius: 20, padding: '16px', background: C.white, border: `1px solid ${C.border}`, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.inkLight }} />
            <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products, brands…"
              style={{ ...inpStyle, paddingLeft: 36 }}
              onFocus={e => { e.target.style.borderColor = C.gold; e.target.style.boxShadow = `0 0 0 3px ${C.goldPale}`; }}
              onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }} />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
              <X size={13} style={{ color: C.inkLight }} />
            </button>}
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)}
            style={{ ...inpStyle, width: 'auto', cursor: 'pointer' }}
            onFocus={e => { e.target.style.borderColor = C.gold; }}
            onBlur={e => { e.target.style.borderColor = C.border; }}>
            <option value="name">Name A–Z</option>
            <option value="stock">Lowest Stock</option>
            <option value="value">Highest Value</option>
            <option value="cost">Highest Cost</option>
            <option value="margin">Best Margin</option>
          </select>
          <div style={{ display: 'flex', padding: 3, borderRadius: 12, background: C.creamMid, border: `1px solid ${C.border}` }}>
            {[[LayoutGrid, 'grid'], [LayoutList, 'list']].map(([Icon, v]) => (
              <button key={v} onClick={() => setViewMode(v)}
                style={{ padding: '6px 10px', borderRadius: 9, border: 'none', cursor: 'pointer', background: viewMode === v ? C.white : 'transparent', boxShadow: viewMode === v ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
                <Icon size={15} style={{ color: viewMode === v ? C.gold : C.inkLight }} />
              </button>
            ))}
          </div>
          <button onClick={() => setFilterLow(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: filterLow ? C.amberPale : C.creamMid, color: filterLow ? C.amber : C.inkMid,
              border: `1.5px solid ${filterLow ? C.amberBorder : C.border}`,
            }}>
            <AlertTriangle size={12} /> Low Stock {filterLow && `(${stats.lowStock})`}
          </button>
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {Object.entries(CATEGORIES).map(([k, v]) => {
            const count = k === 'all' ? products.length : products.filter(p => p.category === k).length;
            const catCol = CAT_COLORS[k] || { color: C.inkMid, pale: C.creamMid };
            return (
              <button key={k} onClick={() => setCategory(k)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  background: category === k ? `linear-gradient(135deg,${C.gold},${C.goldBright})` : C.creamMid,
                  color: category === k ? '#fff' : C.inkMid,
                  border: `1px solid ${category === k ? C.gold : C.border}`,
                  boxShadow: category === k ? `0 2px 8px ${C.gold}30` : 'none',
                }}>
                {k !== 'all' && <span>{CAT_ICONS[k]}</span>}
                {v}
                <span style={{ opacity: 0.7, fontSize: 10 }}>{count}</span>
              </button>
            );
          })}
          <div style={{ marginLeft: 'auto', fontSize: 11, color: C.inkLight, fontWeight: 600, alignSelf: 'center' }}>
            {filtered.length} products
          </div>
        </div>
      </motion.div>

      {/* ══ CONTENT ══════════════════════════════════════════════════════ */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg,${C.gold},${C.goldBright})` }}>
            <Loader2 size={22} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: C.inkLight }}>Loading inventory…</p>
        </div>
      ) : filtered.length === 0 ? (
        <motion.div variants={fade} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 14, borderRadius: 20, background: C.white, border: `1px solid ${C.border}` }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.goldPale }}>
            <Package size={28} style={{ color: C.gold }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 700, color: C.ink, fontSize: 15 }}>No products found</p>
            <p style={{ fontSize: 13, color: C.inkLight, marginTop: 4 }}>{search ? 'Try a different search' : 'Add your first product'}</p>
          </div>
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: `linear-gradient(135deg,${C.gold},${C.goldBright})`, color: C.heroBg }}>
            <Plus size={14} /> Add Product
          </button>
        </motion.div>
      ) : viewMode === 'grid' ? (
        <motion.div variants={stag(0.04)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 14 }}>
          {filtered.map(p => (
            <ProductCard key={p._id} product={p} viewMode="grid"
              onEdit={p => { setEditing(p); setShowForm(true); }}
              onDelete={handleDelete}
              onStock={(p, t) => setStockModal({ product: p, type: t })}
              onHistory={p => setHistModal(p)} />
          ))}
        </motion.div>
      ) : (
        <motion.div variants={fade} style={{ borderRadius: 20, overflow: 'hidden', background: C.white, border: `1px solid ${C.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.creamMid }}>
                {['Product', 'Category', 'Stock', 'Pricing', 'Value', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.inkLight, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <ProductCard key={p._id} product={p} viewMode="list"
                  onEdit={p => { setEditing(p); setShowForm(true); }}
                  onDelete={handleDelete}
                  onStock={(p, t) => setStockModal({ product: p, type: t })}
                  onHistory={p => setHistModal(p)} />
              ))}
            </tbody>
          </table>
          <div style={{ padding: '10px 18px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: C.inkLight, background: C.creamMid }}>
            <span>{filtered.length} products</span>
            <span style={{ fontWeight: 700, color: C.gold }}>Cost value: {fmtK(stats.totalValue)}</span>
          </div>
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <ProductForm product={editing} onClose={() => { setShowForm(false); setEditing(null); }}
            onSaved={() => { fetchProducts(); broadcastChange();  flash('✓ Product saved successfully'); }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {stockModal && (
          <StockModal product={stockModal.product} initialType={stockModal.type}
            onClose={() => setStockModal(null)}
            onDone={() => { fetchProducts(); broadcastChange(); flash('✓ Stock updated'); }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {histModal && <HistoryPanel product={histModal} onClose={() => setHistModal(null)} />}
      </AnimatePresence>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
}