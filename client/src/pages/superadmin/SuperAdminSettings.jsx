import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '@/services/api';
import {
  Settings, Save, Loader2, CheckCircle2, AlertTriangle,
  Globe, Shield, Bell, CreditCard, Zap, Mail, Phone,
  ToggleLeft, ToggleRight, RefreshCw, Info,
} from 'lucide-react';

// ─── Design Tokens (matches SuperAdmin palette) ───────────────────────────────
const C = {
  pageBg:  '#F4EDE0', cardBg: '#FDFAF4',
  gold:    '#B8860B', goldLight: '#DAA520', goldPale: '#FFF8E7',
  ink:     '#1A1208', inkMid: '#5C4A2A', inkLight: '#9C8660',
  border:  '#DFD0A8',
  ok:      '#15803D', okPale: '#DCFCE7', okBorder: '#86EFAC',
  risk:    '#991B1B', riskPale: '#FEF2F2', riskBorder: '#FECACA',
  blue:    '#1D4ED8', bluePale: '#EFF6FF', blueBorder: '#BFDBFE',
};

const fd = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({ icon: Icon, title, children }) => (
  <motion.div variants={fd} style={{
    background: C.cardBg, borderRadius: 16, padding: '24px 28px',
    border: `1px solid ${C.border}`, boxShadow: '0 2px 12px rgba(28,23,18,0.05)',
    marginBottom: 20,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: C.goldPale, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={C.gold} />
      </div>
      <span style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>{title}</span>
    </div>
    {children}
  </motion.div>
);

// ─── Toggle row ───────────────────────────────────────────────────────────────
const ToggleRow = ({ label, desc, value, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
    <div>
      <div style={{ fontWeight: 600, fontSize: 13, color: C.ink }}>{label}</div>
      {desc && <div style={{ fontSize: 12, color: C.inkLight, marginTop: 2 }}>{desc}</div>}
    </div>
    <button onClick={() => onChange(!value)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: value ? C.gold : C.inkLight }}>
      {value ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
    </button>
  </div>
);

// ─── Field ────────────────────────────────────────────────────────────────────
const Field = ({ label, value, onChange, type = 'text', placeholder }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.inkMid, marginBottom: 6 }}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', boxSizing: 'border-box', padding: '9px 12px',
        borderRadius: 8, border: `1px solid ${C.border}`,
        background: '#FDFAF4', fontSize: 13, color: C.ink,
        outline: 'none',
      }}
    />
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SuperAdminSettings() {
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(true);

  const [platform, setPlatform] = useState({
    platformName:         'Glamour SaaS',
    supportEmail:         'support@glamour.app',
    supportPhone:         '',
    maintenanceMode:      false,
    allowNewRegistrations: true,
    defaultPlan:          'plan1',
  });

  const [notifications, setNotifications] = useState({
    emailOnNewSalon:    true,
    emailOnPlanUpgrade: true,
    emailOnPlanExpiry:  true,
    smsAlerts:          false,
  });

  const [security, setSecurity] = useState({
    enforceStrongPassword: true,
    sessionTimeoutHours:   24,
    maxLoginAttempts:      5,
    requireEmailVerify:    false,
  });

  // Load existing platform settings
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/superadmin/platform-settings');
        if (res.data?.settings) {
          const s = res.data.settings;
          if (s.platform)      setPlatform(p => ({ ...p, ...s.platform }));
          if (s.notifications) setNotifications(n => ({ ...n, ...s.notifications }));
          if (s.security)      setSecurity(sc => ({ ...sc, ...s.security }));
        }
      } catch {
        // If endpoint doesn't exist yet, use defaults silently
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put('/superadmin/platform-settings', { platform, notifications, security });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: C.inkLight }}>
      <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ padding: '28px 32px', background: C.pageBg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: C.goldPale, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Settings size={22} color={C.gold} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.ink }}>Platform Settings</h1>
            <p style={{ margin: 0, fontSize: 13, color: C.inkLight }}>Configure global SaaS platform behaviour</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 22px', borderRadius: 10, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            background: saved ? C.ok : C.gold, color: '#fff', fontWeight: 700, fontSize: 14,
            opacity: saving ? 0.7 : 1, transition: 'background 0.2s',
          }}
        >
          {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, background: C.riskPale, border: `1px solid ${C.riskBorder}`, marginBottom: 20, color: C.risk }}>
          <AlertTriangle size={16} />
          <span style={{ fontSize: 13 }}>{error}</span>
        </div>
      )}

      <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.07 } } }}>

        {/* Platform Info */}
        <Section icon={Globe} title="Platform Info">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <Field label="Platform Name" value={platform.platformName} onChange={v => setPlatform(p => ({ ...p, platformName: v }))} placeholder="My Salon SaaS" />
            <Field label="Support Email" value={platform.supportEmail} onChange={v => setPlatform(p => ({ ...p, supportEmail: v }))} type="email" placeholder="support@example.com" />
            <Field label="Support Phone" value={platform.supportPhone} onChange={v => setPlatform(p => ({ ...p, supportPhone: v }))} placeholder="+91 98765 43210" />
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.inkMid, marginBottom: 6 }}>Default Plan for New Salons</label>
              <select
                value={platform.defaultPlan}
                onChange={e => setPlatform(p => ({ ...p, defaultPlan: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: '#FDFAF4', fontSize: 13, color: C.ink }}
              >
                <option value="plan1">Basic</option>
                <option value="plan2">Online Booking</option>
                <option value="plan3">Franchise</option>
              </select>
            </div>
          </div>
          <ToggleRow label="Allow New Registrations" desc="Let new salons sign up on the platform" value={platform.allowNewRegistrations} onChange={v => setPlatform(p => ({ ...p, allowNewRegistrations: v }))} />
          <ToggleRow label="Maintenance Mode" desc="Show maintenance page to all salon users" value={platform.maintenanceMode} onChange={v => setPlatform(p => ({ ...p, maintenanceMode: v }))} />
        </Section>

        {/* Notifications */}
        <Section icon={Bell} title="Admin Notifications">
          <ToggleRow label="New Salon Registered" desc="Email you when a new salon signs up" value={notifications.emailOnNewSalon} onChange={v => setNotifications(n => ({ ...n, emailOnNewSalon: v }))} />
          <ToggleRow label="Plan Upgrade" desc="Email you when a salon upgrades their plan" value={notifications.emailOnPlanUpgrade} onChange={v => setNotifications(n => ({ ...n, emailOnPlanUpgrade: v }))} />
          <ToggleRow label="Plan Expiry Alert" desc="Email you when a salon's plan is expiring" value={notifications.emailOnPlanExpiry} onChange={v => setNotifications(n => ({ ...n, emailOnPlanExpiry: v }))} />
          <ToggleRow label="SMS Alerts" desc="Receive critical alerts via SMS" value={notifications.smsAlerts} onChange={v => setNotifications(n => ({ ...n, smsAlerts: v }))} />
        </Section>

        {/* Security */}
        <Section icon={Shield} title="Security">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <Field label="Session Timeout (hours)" value={security.sessionTimeoutHours} onChange={v => setSecurity(s => ({ ...s, sessionTimeoutHours: parseInt(v) || 24 }))} type="number" />
            <Field label="Max Login Attempts" value={security.maxLoginAttempts} onChange={v => setSecurity(s => ({ ...s, maxLoginAttempts: parseInt(v) || 5 }))} type="number" />
          </div>
          <ToggleRow label="Enforce Strong Passwords" desc="Require min 8 chars, uppercase, number for all users" value={security.enforceStrongPassword} onChange={v => setSecurity(s => ({ ...s, enforceStrongPassword: v }))} />
          <ToggleRow label="Require Email Verification" desc="Users must verify email before accessing the app" value={security.requireEmailVerify} onChange={v => setSecurity(s => ({ ...s, requireEmailVerify: v }))} />
        </Section>

        {/* Info banner */}
        <motion.div variants={fd} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          borderRadius: 10, background: C.bluePale, border: `1px solid ${C.blueBorder}`, color: C.blue,
        }}>
          <Info size={16} />
          <span style={{ fontSize: 13 }}>Changes take effect immediately across all salon dashboards. Maintenance mode will block all non-super-admin logins.</span>
        </motion.div>

      </motion.div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}