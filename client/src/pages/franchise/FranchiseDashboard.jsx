// src/pages/franchise/FranchiseDashboard.jsx
// Phase 4 — Overview Dashboard
// Combined KPIs, branch status cards with expiry alerts, quick-actions.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '@/services/api';
import {
  Building2, Users, TrendingUp, AlertTriangle, CheckCircle2, RefreshCw,
  BarChart3, MessageSquare, ArrowRight, Clock, CalendarX, Zap,
  ChevronRight, Activity, GitBranch,
} from 'lucide-react';

/* ─── Design Tokens ──────────────────────────────────────────────────────── */
const C = {
  pageBg:'#F4EDE0', cardBg:'#FDFAF4',
  gold:'#B8860B', goldLight:'#DAA520', goldPale:'#FFF8E7',
  ink:'#1A1208', inkMid:'#5C4A2A', inkLight:'#9C8660', border:'#DFD0A8',
  teal:'#0F766E', tealLight:'#14B8A6', tealPale:'#F0FDFA', tealBorder:'#99F6E4',
  green:'#15803D', greenPale:'#DCFCE7', greenBorder:'#86EFAC',
  red:'#991B1B', redPale:'#FEF2F2', redBorder:'#FECACA',
  amber:'#92400E', amberPale:'#FFFBEB', amberBorder:'#FDE68A',
  blue:'#1D4ED8', bluePale:'#EFF6FF', blueBorder:'#BFDBFE',
};

const fmtINR = (n) => `₹${(n||0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';

/* ─── KPI Card ───────────────────────────────────────────────────────────── */
const KpiCard = ({ label, value, sub, icon:Icon, color, pale, border, onClick, delay=0 }) => (
  <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay,duration:0.4}}
    onClick={onClick}
    style={{ background:C.cardBg, borderRadius:16, padding:'18px 20px', border:`1px solid ${border||C.border}`, boxShadow:'0 2px 12px rgba(28,23,18,0.05)', cursor:onClick?'pointer':'default' }}>
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
      <div style={{ width:44, height:44, borderRadius:12, background:pale||C.goldPale, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={20} color={color||C.gold} />
      </div>
      {onClick && <ArrowRight size={13} color={color} />}
    </div>
    <div style={{ fontSize:26, fontWeight:700, color:C.ink, lineHeight:1, marginBottom:4 }}>{value??'—'}</div>
    <div style={{ fontSize:12, color:C.inkLight, marginBottom:sub?4:0 }}>{label}</div>
    {sub && <div style={{ fontSize:11, color:color||C.inkLight, fontWeight:500 }}>{sub}</div>}
  </motion.div>
);

/* ─── Branch Card ────────────────────────────────────────────────────────── */
const BranchCard = ({ salon, index, onWhatsApp }) => {
  const navigate = useNavigate();
  const days = salon.expiryDays;
  const expired = days !== null && days <= 0;
  const urgent  = days !== null && days > 0 && days <= 7;
  const warning = days !== null && days > 7 && days <= 30;

  const statusColor = expired ? C.red : urgent ? C.red : warning ? C.amber : C.green;
  const statusPale  = expired ? C.redPale : urgent ? C.redPale : warning ? C.amberPale : C.greenPale;
  const statusLabel = salon.isSuspended ? 'Suspended' : expired ? 'Expired' : urgent ? `${days}d left` : warning ? `${days}d left` : 'Active';

  return (
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:index*0.06,duration:0.35}}
      style={{ background:C.cardBg, borderRadius:14, border:`1px solid ${C.border}`, overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'14px 16px 10px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:9, background:`linear-gradient(135deg, ${C.tealLight}40, ${C.teal}20)`, border:`1px solid ${C.tealBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:C.teal }}>
            {salon.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:C.ink }}>{salon.name}</div>
            <div style={{ fontSize:11, color:C.inkLight }}>{salon.slug}</div>
          </div>
        </div>
        <span style={{ fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:20, background:statusPale, color:statusColor, border:`1px solid ${statusColor}30` }}>
          {statusLabel}
        </span>
      </div>

      {/* Stats row */}
      <div style={{ padding:'10px 16px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, borderBottom:`1px solid ${C.border}` }}>
        {[
          { label:"Today's bookings", value: salon.todayBookings||0 },
          { label:"Today's revenue",  value: fmtINR(salon.todayRevenue) },
          { label:'30-day revenue',   value: fmtINR(salon.revenue30) },
        ].map(stat => (
          <div key={stat.label} style={{ textAlign:'center' }}>
            <div style={{ fontSize:15, fontWeight:700, color:C.ink }}>{stat.value}</div>
            <div style={{ fontSize:10, color:C.inkLight, marginTop:1 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Expiry alert */}
      {(expired || urgent || warning) && (
        <div style={{ margin:'10px 16px', padding:'8px 12px', borderRadius:9, background:statusPale, border:`1px solid ${statusColor}30`, display:'flex', alignItems:'center', gap:8 }}>
          <AlertTriangle size={13} color={statusColor} />
          <span style={{ fontSize:12, color:statusColor, fontWeight:500 }}>
            {expired ? 'Subscription expired!' : `Expires ${fmtDate(salon.subscriptionExpiry)} (${days}d left)`}
          </span>
        </div>
      )}

      {/* Actions */}
      <div style={{ padding:'10px 16px 14px', display:'flex', gap:8 }}>
        <button onClick={() => navigate(`/franchise/branches?highlight=${salon._id}`)} style={{ flex:1, padding:'8px', borderRadius:8, border:`1px solid ${C.border}`, background:'white', fontSize:12, color:C.inkMid, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
          <BarChart3 size={13} /> Analytics
        </button>
        {salon.admin?.phone && (
          <button onClick={() => onWhatsApp(salon)} style={{ flex:1, padding:'8px', borderRadius:8, border:'1px solid #16a34a30', background:C.greenPale, fontSize:12, color:C.green, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
            <MessageSquare size={13} /> WhatsApp
          </button>
        )}
      </div>
    </motion.div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function FranchiseDashboard() {
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/franchise/overview');
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load dashboard');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleQuickWhatsApp = (salon) => {
    navigate('/franchise/whatsapp', { state: { preselect: [salon._id] } });
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <RefreshCw size={20} color={C.teal} style={{ animation:'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (error) return <div style={{ padding:20, color:C.red, background:C.redPale, borderRadius:10, border:`1px solid ${C.redBorder}` }}>{error}</div>;

  const { overview = {}, salons = [] } = data || {};
  const expiring = salons.filter(s => s.expiryDays !== null && s.expiryDays <= 30 && s.expiryDays > 0);
  const expired  = salons.filter(s => s.expiryDays !== null && s.expiryDays <= 0);

  return (
    <div style={{ maxWidth:1200 }}>
      {/* Page title */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:600, color:C.ink, margin:0 }}>Franchise Overview</h1>
            <p style={{ fontSize:13, color:C.inkLight, margin:'4px 0 0' }}>All branches · live data</p>
          </div>
          <button onClick={load} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:9, border:`1px solid ${C.border}`, background:'white', fontSize:13, color:C.inkMid, cursor:'pointer' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Expiry alerts banner */}
        {(expiring.length > 0 || expired.length > 0) && (
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} style={{ marginTop:14, padding:'10px 16px', borderRadius:10, background:expired.length?C.redPale:C.amberPale, border:`1px solid ${expired.length?C.redBorder:C.amberBorder}`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <AlertTriangle size={15} color={expired.length?C.red:C.amber} />
              <span style={{ fontSize:13, color:expired.length?C.red:C.amber, fontWeight:500 }}>
                {expired.length > 0 && `${expired.length} branch${expired.length>1?'es':''} expired. `}
                {expiring.length > 0 && `${expiring.length} expiring within 30 days.`}
              </span>
            </div>
            <button onClick={() => navigate('/franchise/whatsapp')} style={{ fontSize:12, color:expired.length?C.red:C.amber, background:'none', border:`1px solid ${expired.length?C.redBorder:C.amberBorder}`, borderRadius:7, padding:'4px 10px', cursor:'pointer', whiteSpace:'nowrap' }}>
              Send reminders
            </button>
          </motion.div>
        )}
      </div>

      {/* KPI Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:12, marginBottom:24 }}>
        <KpiCard label="Total branches"     value={overview.totalBranches}    icon={Building2}    color={C.teal}  pale={C.tealPale}  border={C.tealBorder}  delay={0}   onClick={() => navigate('/franchise/branches')} />
        <KpiCard label="Active"             value={overview.activeBranches}   icon={CheckCircle2} color={C.green} pale={C.greenPale} border={C.greenBorder} delay={0.05} />
        <KpiCard label="Today's bookings"   value={overview.todayBookings}    icon={Activity}     color={C.gold}  pale={C.goldPale}  border={C.border}      delay={0.1}  />
        <KpiCard label="Today's revenue"    value={fmtINR(overview.todayRevenue)}   icon={TrendingUp}   color={C.teal}  pale={C.tealPale}  border={C.tealBorder}  delay={0.15} />
        <KpiCard label="Month revenue"      value={fmtINR(overview.monthRevenue)}   icon={Zap}          color={C.gold}  pale={C.goldPale}  border={C.border}      delay={0.2}  onClick={() => navigate('/franchise/analytics')} />
        <KpiCard label="Expiring soon"      value={overview.expiringCount}    icon={AlertTriangle} color={overview.expiringCount?C.amber:C.inkLight} pale={overview.expiringCount?C.amberPale:'#F9FAFB'} border={overview.expiringCount?C.amberBorder:C.border} delay={0.25} onClick={() => navigate('/franchise/whatsapp')} />
      </div>

      {/* Quick actions */}
      <div style={{ display:'flex', gap:10, marginBottom:24, flexWrap:'wrap' }}>
        {[
          { label:'View analytics', icon:BarChart3,     path:'/franchise/analytics',  color:C.teal  },
          { label:'Send reminders', icon:MessageSquare, path:'/franchise/whatsapp',   color:C.green },
          { label:'Manage branches',icon:Building2,     path:'/franchise/branches',   color:C.gold  },
          { label:'Manage managers',icon:Users,         path:'/franchise/managers',   color:C.blue  },
        ].map(a => (
          <button key={a.path} onClick={() => navigate(a.path)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:10, border:`1px solid ${C.border}`, background:C.cardBg, fontSize:13, color:C.inkMid, cursor:'pointer', fontWeight:500 }}>
            <a.icon size={15} color={a.color} /> {a.label} <ChevronRight size={13} color={C.inkLight} />
          </button>
        ))}
      </div>

      {/* Branch cards */}
      <div style={{ marginBottom:12 }}>
        <h2 style={{ fontSize:15, fontWeight:600, color:C.ink, margin:'0 0 12px' }}>All branches</h2>
        {salons.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:C.inkLight, background:C.cardBg, borderRadius:14, border:`1px solid ${C.border}` }}>
            No branches yet. Ask your super admin to create branches under this franchise.
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:14 }}>
            {salons.map((s, i) => (
              <BranchCard key={s._id} salon={s} index={i} onWhatsApp={handleQuickWhatsApp} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
