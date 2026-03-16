// src/pages/superadmin/SuperAdminExport.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import api from '@/services/api';
import { Download, Building2, Users, RefreshCw, Check, Filter, FileText } from 'lucide-react';

const C = {
  bg: '#0F0D0B', bgCard: '#1A1613', bgCard2: '#211C16',
  border: 'rgba(212,168,75,0.12)',
  gold: '#D4A84B', goldPale: 'rgba(212,168,75,0.08)',
  ink: '#FAF6EF', inkMid: '#C8B896', inkMuted: 'rgba(250,246,239,0.45)',
  purple: '#A78BFA', purplePale: 'rgba(167,139,250,0.10)',
  green: '#34D399', greenPale: 'rgba(52,211,153,0.10)', greenBorder: 'rgba(52,211,153,0.25)',
  red: '#F87171', redPale: 'rgba(248,113,113,0.10)', redBorder: 'rgba(248,113,113,0.25)',
  blue: '#60A5FA', bluePale: 'rgba(96,165,250,0.10)',
};

const Sel = ({ label, children, ...p }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    {label && <label style={{ fontSize: 11, fontWeight: 600, color: C.inkMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>}
    <select {...p} style={{ padding: '9px 12px', borderRadius: 9, fontSize: 13, border: `1px solid ${C.border}`, background: C.bgCard2, color: C.ink, outline: 'none', width: '100%' }}>
      {children}
    </select>
  </div>
);

const ExportCard = ({ icon: Icon, title, description, fields, onExport, loading, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    style={{
      background: C.bgCard, border: `1px solid ${C.border}`,
      borderRadius: 18, overflow: 'hidden',
    }}
  >
    <div style={{ padding: '22px 22px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        <div style={{
          width: 46, height: 46, borderRadius: 13, flexShrink: 0,
          background: `${color}12`, border: `1px solid ${color}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} color={color} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>{title}</div>
          <div style={{ fontSize: 12, color: C.inkMuted, marginTop: 3 }}>{description}</div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.inkMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Fields Exported</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {fields.map(f => (
            <span key={f} style={{
              fontSize: 11, fontWeight: 500,
              background: C.bgCard2, color: C.inkMid,
              border: `1px solid ${C.border}`, borderRadius: 6, padding: '3px 8px',
            }}>{f}</span>
          ))}
        </div>
      </div>
    </div>

    <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 22px', background: C.bgCard2 }}>
      {onExport}
    </div>
  </motion.div>
);

const SalonExport = () => {
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleExport = async () => {
    setLoading(true); setDone(false);
    try {
      const p = new URLSearchParams();
      if (plan)   p.set('plan', plan);
      if (status) p.set('status', status);
      const res = await api.get(`/superadmin/export/salons?${p}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      Object.assign(document.createElement('a'), { href: url, download: 'salons_export.csv' }).click();
      URL.revokeObjectURL(url);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Sel label="Filter by Plan" value={plan} onChange={e => setPlan(e.target.value)}>
          <option value="">All Plans</option>
          <option value="plan1">Basic</option>
          <option value="plan2">Online Booking</option>
          <option value="plan3">Franchise</option>
        </Sel>
        <Sel label="Filter by Status" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="expired">Expired</option>
        </Sel>
      </div>
      <button
        onClick={handleExport}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '10px 18px', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
          background: done ? C.greenPale : C.goldPale,
          border: `1px solid ${done ? C.greenBorder : C.gold + '50'}`,
          color: done ? C.green : C.gold, fontSize: 13, fontWeight: 700,
          transition: 'all 0.2s',
        }}
      >
        {loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
          : done ? <Check size={14} />
          : <Download size={14} />}
        {loading ? 'Generating…' : done ? 'Downloaded!' : 'Download Salons CSV'}
      </button>
    </div>
  );
};

const UsersExport = () => {
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleExport = async () => {
    setLoading(true); setDone(false);
    try {
      const p = new URLSearchParams({ limit: 10000, page: 1 });
      if (role) p.set('role', role);
      const { data } = await api.get(`/superadmin/users?${p}`);
      const users = data.users || [];

      const header = ['Name', 'Email', 'Phone', 'Role', 'Salon', 'Created'];
      const rows = users.map(u => [
        u.name, u.email, u.phone || '', u.role,
        u.salonId?.name || '',
        new Date(u.createdAt).toLocaleDateString('en-IN'),
      ]);
      const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: 'users_export.csv' }).click();
      URL.revokeObjectURL(url);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Sel label="Filter by Role" value={role} onChange={e => setRole(e.target.value)}>
        <option value="">All Roles</option>
        <option value="admin">Admins</option>
        <option value="staff">Staff</option>
        <option value="receptionist">Receptionists</option>
        <option value="customer">Customers</option>
        <option value="franchise_owner">Franchise Owners</option>
      </Sel>
      <button
        onClick={handleExport}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '10px 18px', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
          background: done ? C.greenPale : C.bluePale,
          border: `1px solid ${done ? C.greenBorder : C.blue + '50'}`,
          color: done ? C.green : C.blue, fontSize: 13, fontWeight: 700,
        }}
      >
        {loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
          : done ? <Check size={14} />
          : <Download size={14} />}
        {loading ? 'Generating…' : done ? 'Downloaded!' : 'Download Users CSV'}
      </button>
    </div>
  );
};

export default function SuperAdminExport() {
  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(20px,3vw,27px)', fontWeight: 300, fontStyle: 'italic', color: C.ink, margin: 0 }}>
          Data Export
        </h1>
        <p style={{ fontSize: 13, color: C.inkMuted, margin: '4px 0 0' }}>
          Export platform data with filters as CSV
        </p>
      </div>

      {/* Info banner */}
      <div style={{
        background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14,
        padding: '14px 18px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <FileText size={18} color={C.gold} />
        <div style={{ fontSize: 13, color: C.inkMid }}>
          All exports are in <strong style={{ color: C.gold }}>CSV format</strong> and respect the applied filters. Data is exported in real-time from the database.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px,1fr))', gap: 18 }}>
        <ExportCard
          icon={Building2} title="Salon List" color={C.gold} delay={0}
          description="All salons with admin contact info, plan, and subscription status"
          fields={['Salon Name', 'Slug', 'Admin Name', 'Admin Email', 'Admin Phone', 'Plan', 'Status', 'Suspended', 'Expiry', 'Created']}
          onExport={<SalonExport />}
        />
        <ExportCard
          icon={Users} title="User List" color={C.blue} delay={0.08}
          description="All platform users with role and associated salon"
          fields={['Name', 'Email', 'Phone', 'Role', 'Salon', 'Created']}
          onExport={<UsersExport />}
        />
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}