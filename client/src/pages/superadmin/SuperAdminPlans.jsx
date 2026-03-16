// src/pages/superadmin/SuperAdminPlans.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/services/api';
import {
  CreditCard, Plus, Edit3, Trash2, Check, X,
  RefreshCw, Star, Zap, Crown, Users, GitBranch,
  BarChart3, Globe, Wifi, Package,
} from 'lucide-react';

const C = {
  bg: '#0F0D0B', bgCard: '#1A1613', bgCard2: '#211C16',
  border: 'rgba(212,168,75,0.12)', borderHover: 'rgba(212,168,75,0.28)',
  gold: '#D4A84B', goldDim: '#B8892A', goldPale: 'rgba(212,168,75,0.08)',
  ink: '#FAF6EF', inkMid: '#C8B896', inkMuted: 'rgba(250,246,239,0.45)',
  purple: '#A78BFA', purplePale: 'rgba(167,139,250,0.10)',
  green: '#34D399', greenPale: 'rgba(52,211,153,0.10)', greenBorder: 'rgba(52,211,153,0.25)',
  red: '#F87171', redPale: 'rgba(248,113,113,0.10)', redBorder: 'rgba(248,113,113,0.25)',
  blue: '#60A5FA', bluePale: 'rgba(96,165,250,0.10)', blueBorder: 'rgba(96,165,250,0.25)',
};

const FEATURE_LIST = [
  { key: 'onlineBooking',   label: 'Online Booking',   icon: Globe },
  { key: 'customWebsite',   label: 'Custom Website',   icon: Globe },
  { key: 'whatsappModule',  label: 'WhatsApp Tools',   icon: Wifi },
  { key: 'invoices',        label: 'Invoices',         icon: Package },
  { key: 'inventory',       label: 'Inventory',        icon: Package },
  { key: 'analytics',       label: 'Advanced Analytics', icon: BarChart3 },
  { key: 'apiAccess',       label: 'API Access',       icon: Zap },
  { key: 'franchiseAccess', label: 'Franchise Access', icon: GitBranch },
  { key: 'customDomain',    label: 'Custom Domain',    icon: Globe },
  { key: 'prioritySupport', label: 'Priority Support', icon: Star },
];

const PLAN_ICONS = { plan1: Star, plan2: Zap, plan3: Crown };
const PLAN_COLORS = { plan1: C.blue, plan2: C.gold, plan3: C.purple };

const defaultForm = () => ({
  key: '', name: '', description: '',
  price: { monthly: 0, yearly: 0 },
  limits: { staffCount: 5, branchCount: 1, bookingsPerMonth: 500 },
  features: {
    onlineBooking: false, customWebsite: false, whatsappModule: true,
    invoices: true, inventory: true, analytics: false,
    apiAccess: false, franchiseAccess: false, customDomain: false, prioritySupport: false,
  },
  isActive: true, isPopular: false, sortOrder: 0,
});

const Inp = ({ label, ...p }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    {label && <label style={{ fontSize: 11, fontWeight: 600, color: C.inkMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>}
    <input {...p} style={{
      padding: '9px 12px', borderRadius: 9, fontSize: 13,
      border: `1px solid ${C.border}`, background: C.bgCard2,
      color: C.ink, outline: 'none', width: '100%', boxSizing: 'border-box', ...(p.style || {}),
    }}
      onFocus={e => e.target.style.borderColor = C.gold}
      onBlur={e => e.target.style.borderColor = C.border} />
  </div>
);

const Toggle = ({ checked, onChange, label }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20, borderRadius: 10, position: 'relative',
        background: checked ? C.green : C.bgCard2,
        border: `1px solid ${checked ? C.greenBorder : C.border}`,
        transition: 'all 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: 7, background: '#fff',
        position: 'absolute', top: 2,
        left: checked ? 19 : 3,
        transition: 'left 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </div>
    <span style={{ fontSize: 13, color: C.inkMid }}>{label}</span>
  </label>
);

const PlanModal = ({ plan, onClose, onSaved }) => {
  const [form, setForm] = useState(plan ? { ...defaultForm(), ...plan, features: { ...defaultForm().features, ...plan.features }, price: { ...plan.price }, limits: { ...plan.limits } } : defaultForm());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (path, value) => {
    setForm(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
      cur[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.key || !form.name) { setErr('Key and Name are required'); return; }
    setSaving(true); setErr('');
    try {
      if (plan?._id) await api.put(`/superadmin/plans/${plan._id}`, form);
      else await api.post('/superadmin/plans', form);
      onSaved(); onClose();
    } catch (e) { setErr(e.response?.data?.message || 'Failed to save plan'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(10,9,7,0.85)',
      backdropFilter: 'blur(12px)', zIndex: 100, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        style={{
          background: C.bgCard, borderRadius: 20, width: '100%', maxWidth: 620,
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)', border: `1px solid ${C.border}`,
          maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 22px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: C.goldPale, border: `1px solid ${C.gold}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={18} color={C.gold} />
          </div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.ink, flex: 1 }}>
            {plan ? 'Edit Plan' : 'Create New Plan'}
          </h2>
          <button onClick={onClose} style={{ background: C.bgCard2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 7, cursor: 'pointer', color: C.inkMuted, display: 'flex' }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {err && <div style={{ background: C.redPale, border: `1px solid ${C.redBorder}`, borderRadius: 9, padding: '10px 14px', fontSize: 13, color: C.red }}>{err}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Inp label="Plan Key (e.g. plan1)" value={form.key} onChange={e => set('key', e.target.value.toLowerCase())} placeholder="plan1" disabled={!!plan} />
            <Inp label="Plan Name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Basic" />
          </div>
          <Inp label="Description" value={form.description} onChange={e => set('description', e.target.value)} placeholder="For small salons just getting started" />

          {/* Pricing */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.inkMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Pricing (₹)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Inp label="Monthly Price" type="number" value={form.price.monthly} onChange={e => set('price.monthly', Number(e.target.value))} min={0} />
              <Inp label="Yearly Price" type="number" value={form.price.yearly} onChange={e => set('price.yearly', Number(e.target.value))} min={0} />
            </div>
          </div>

          {/* Limits */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.inkMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Limits</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              <Inp label="Max Staff" type="number" value={form.limits.staffCount} onChange={e => set('limits.staffCount', Number(e.target.value))} min={1} />
              <Inp label="Max Branches" type="number" value={form.limits.branchCount} onChange={e => set('limits.branchCount', Number(e.target.value))} min={1} />
              <Inp label="Bookings/Month" type="number" value={form.limits.bookingsPerMonth} onChange={e => set('limits.bookingsPerMonth', Number(e.target.value))} min={1} />
            </div>
          </div>

          {/* Features */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.inkMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Features</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {FEATURE_LIST.map(f => (
                <Toggle key={f.key} checked={form.features[f.key]} label={f.label} onChange={v => set(`features.${f.key}`, v)} />
              ))}
            </div>
          </div>

          {/* Options */}
          <div style={{ display: 'flex', gap: 16 }}>
            <Toggle checked={form.isPopular} label="Mark as Popular" onChange={v => set('isPopular', v)} />
            <Toggle checked={form.isActive} label="Active" onChange={v => set('isActive', v)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Inp label="Sort Order" type="number" value={form.sortOrder} onChange={e => set('sortOrder', Number(e.target.value))} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '14px 22px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 9, background: C.bgCard2, border: `1px solid ${C.border}`, color: C.inkMid, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', borderRadius: 9, background: C.gold, border: 'none', color: '#0F0D0B', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            {saving ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={13} />}
            {saving ? 'Saving…' : (plan ? 'Update Plan' : 'Create Plan')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const PlanCard = ({ plan, onEdit, onDelete }) => {
  const Icon = PLAN_ICONS[plan.key] || Star;
  const color = PLAN_COLORS[plan.key] || C.gold;
  const activeFeatures = Object.entries(plan.features || {}).filter(([, v]) => v);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: C.bgCard, border: `1px solid ${C.border}`,
        borderRadius: 18, overflow: 'hidden', position: 'relative',
      }}
    >
      {plan.isPopular && (
        <div style={{
          position: 'absolute', top: 14, right: 14,
          background: `${color}20`, border: `1px solid ${color}40`,
          borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 700, color,
        }}>POPULAR</div>
      )}
      <div style={{ padding: '24px 24px 16px' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 13, marginBottom: 14,
          background: `${color}15`, border: `1px solid ${color}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} color={color} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{plan.name}</div>
        <div style={{ fontSize: 12, color: C.inkMuted, marginBottom: 16, minHeight: 32 }}>{plan.description || '—'}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
          <span style={{ fontSize: 28, fontWeight: 800, color }}>₹{plan.price?.monthly || 0}</span>
          <span style={{ fontSize: 12, color: C.inkMuted }}>/month</span>
        </div>
        {plan.price?.yearly > 0 && (
          <div style={{ fontSize: 12, color: C.green }}>₹{plan.price.yearly}/year (save {Math.round((1 - plan.price.yearly / (plan.price.monthly * 12)) * 100)}%)</div>
        )}
      </div>

      <div style={{ padding: '0 24px', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ padding: '12px 0', display: 'flex', gap: 16, fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.inkMid }}>
            <Users size={12} color={C.inkMuted} />
            <span>{plan.limits?.staffCount} staff</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.inkMid }}>
            <GitBranch size={12} color={C.inkMuted} />
            <span>{plan.limits?.branchCount} branch{plan.limits?.branchCount !== 1 ? 'es' : ''}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {activeFeatures.slice(0, 6).map(([k]) => {
            const f = FEATURE_LIST.find(f => f.key === k);
            return f ? (
              <span key={k} style={{
                fontSize: 10, fontWeight: 600,
                background: C.greenPale, color: C.green,
                border: `1px solid ${C.greenBorder}`,
                borderRadius: 6, padding: '3px 8px',
              }}>✓ {f.label}</span>
            ) : null;
          })}
          {activeFeatures.length > 6 && (
            <span style={{ fontSize: 10, color: C.inkMuted }}>+{activeFeatures.length - 6} more</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onEdit(plan)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px', borderRadius: 9, cursor: 'pointer',
            background: C.bgCard2, border: `1px solid ${C.border}`,
            color: C.inkMid, fontSize: 12, fontWeight: 600,
          }}>
            <Edit3 size={12} /> Edit
          </button>
          <button onClick={() => onDelete(plan)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '8px 12px', borderRadius: 9, cursor: 'pointer',
            background: C.redPale, border: `1px solid ${C.redBorder}`,
            color: C.red,
          }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {!plan.isActive && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(10,9,7,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 18, backdropFilter: 'blur(2px)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.red, background: C.redPale, padding: '6px 16px', borderRadius: 20, border: `1px solid ${C.redBorder}` }}>Inactive</span>
        </div>
      )}
    </motion.div>
  );
};

export default function SuperAdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/superadmin/plans');
      setPlans(data.plans || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (plan) => {
    if (!confirm(`Delete plan "${plan.name}"? Salons using this plan will keep their current assignment.`)) return;
    try { await api.delete(`/superadmin/plans/${plan._id}`); load(); }
    catch (e) { alert(e.response?.data?.message || 'Delete failed'); }
  };

  // Seed 3 default plans with prices pre-filled
  const handleSeedDefaults = async () => {
    setSeeding(true);
    const defaults = [
      {
        key: 'plan1', name: 'Basic', description: 'Perfect for single salons just getting started.', sortOrder: 1, isPopular: false,
        price: { monthly: 999, yearly: 9990 },
        limits: { staffCount: 5, branchCount: 1, bookingsPerMonth: 500 },
        features: { whatsappModule: true, invoices: true, inventory: true, onlineBooking: false, customWebsite: false, analytics: false, apiAccess: false, franchiseAccess: false, customDomain: false, prioritySupport: false },
      },
      {
        key: 'plan2', name: 'Online Booking', description: 'Grow with online bookings, customer website and analytics.', sortOrder: 2, isPopular: true,
        price: { monthly: 1999, yearly: 19990 },
        limits: { staffCount: 15, branchCount: 1, bookingsPerMonth: 2000 },
        features: { whatsappModule: true, invoices: true, inventory: true, onlineBooking: true, customWebsite: true, analytics: true, apiAccess: false, franchiseAccess: false, customDomain: true, prioritySupport: false },
      },
      {
        key: 'plan3', name: 'Franchise', description: 'Enterprise-grade for multi-location franchises with API access.', sortOrder: 3, isPopular: false,
        price: { monthly: 4999, yearly: 49990 },
        limits: { staffCount: 100, branchCount: 20, bookingsPerMonth: 10000 },
        features: { whatsappModule: true, invoices: true, inventory: true, onlineBooking: true, customWebsite: true, analytics: true, apiAccess: true, franchiseAccess: true, customDomain: true, prioritySupport: true },
      },
    ];
    try {
      for (const p of defaults) {
        await api.post('/superadmin/plans', p).catch(() => {}); // skip if key already exists
      }
      await load();
    } catch (e) { console.error(e); }
    finally { setSeeding(false); }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(20px,3vw,27px)', fontWeight: 300, fontStyle: 'italic', color: C.ink, margin: 0 }}>
            Plan Management
          </h1>
          <p style={{ fontSize: 13, color: C.inkMuted, margin: '4px 0 0' }}>
            Configure subscription plans, pricing and features
          </p>
        </div>
        <div style={{ display: 'flex', gap: 9 }}>
          {plans.length === 0 && !loading && (
            <button onClick={handleSeedDefaults} disabled={seeding} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: C.purplePale, border: `1px solid ${C.purple}40`,
              borderRadius: 10, padding: '9px 16px',
              fontSize: 13, fontWeight: 700, color: C.purple, cursor: 'pointer',
            }}>
              {seeding ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
              {seeding ? 'Seeding…' : 'Seed Default Plans'}
            </button>
          )}
          <button onClick={() => setShowCreate(true)} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: C.gold, border: 'none', borderRadius: 10, padding: '9px 18px',
            fontSize: 13, fontWeight: 700, color: '#0F0D0B', cursor: 'pointer',
          }}>
            <Plus size={14} /> New Plan
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '30vh', gap: 10 }}>
          <RefreshCw size={20} color={C.gold} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ color: C.inkMuted }}>Loading plans…</span>
        </div>
      ) : plans.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: C.bgCard, borderRadius: 18, border: `1px solid ${C.border}`,
        }}>
          <CreditCard size={36} color={C.border} style={{ margin: '0 auto 14px', display: 'block' }} />
          <div style={{ color: C.ink, fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No plans configured yet</div>
          <div style={{ color: C.inkMuted, fontSize: 13, marginBottom: 22 }}>
            Seed the 3 default plans (Basic ₹999, Online ₹1999, Franchise ₹4999) or create custom ones.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleSeedDefaults} disabled={seeding} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: C.purplePale, border: `1px solid ${C.purple}40`,
              borderRadius: 10, padding: '10px 20px',
              fontSize: 13, fontWeight: 700, color: C.purple, cursor: 'pointer',
            }}>
              {seeding ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
              {seeding ? 'Seeding…' : 'Seed Default Plans'}
            </button>
            <button onClick={() => setShowCreate(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: C.gold, border: 'none', borderRadius: 10, padding: '10px 20px',
              fontSize: 13, fontWeight: 700, color: '#0F0D0B', cursor: 'pointer',
            }}>
              <Plus size={14} /> Create Custom Plan
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
          {plans.map(plan => (
            <PlanCard key={plan._id} plan={plan} onEdit={p => setEditing(p)} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {(showCreate || editing) && (
          <PlanModal
            plan={editing}
            onClose={() => { setShowCreate(false); setEditing(null); }}
            onSaved={load}
          />
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}