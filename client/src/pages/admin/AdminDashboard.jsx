import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useDataStore } from '@/context/DataStore';
import api from '@/services/api';
import { useNavigate } from 'react-router-dom';
import WebsiteBanner from '@/components/WebsiteBanner';
import {
  AreaChart, Area, ComposedChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Calendar, Users, IndianRupee, TrendingUp, TrendingDown,
  Clock, CheckCircle2, AlertCircle, ArrowUpRight,
  Plus, UserPlus, Scissors, Gift, RefreshCw, ChevronRight,
  Activity, BarChart3, Package, Loader2, Sparkles,
  AlertTriangle, CreditCard, MessageCircle, Send, Phone,
  Download, Target, Award, Bell, X, Search,
  Percent, UserCheck, Check, Settings, Wallet,
} from 'lucide-react';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  pageBg:'#F4EDE0', cardBg:'#FDFAF4', heroBg:'#0E0B06', heroBg2:'#1C1608',
  gold:'#B8860B', goldLight:'#DAA520', goldBright:'#F0C040', goldPale:'#FFF8E7',
  goldDeep:'#8B6914', goldGlow:'rgba(218,165,32,0.15)',
  ink:'#1A1208', inkMid:'#5C4A2A', inkLight:'#9C8660', inkGhost:'#C8B090',
  border:'#DFD0A8', borderMid:'#C9B07A',
  green:'#15803D', greenPale:'#DCFCE7', greenBorder:'#86EFAC',
  red:'#991B1B',   redPale:'#FEF2F2',   redBorder:'#FECACA',
  amber:'#92400E', amberPale:'#FFFBEB', amberBorder:'#FDE68A',
  blue:'#1D4ED8',  bluePale:'#EFF6FF',  blueBorder:'#BFDBFE',
  purple:'#6D28D9',purplePale:'#F5F3FF',purpleBorder:'#DDD6FE',
  teal:'#0F766E',  tealPale:'#F0FDFA',  tealBorder:'#99F6E4',
  white:'#FFFFFF',
  wa:'#25D366', waPale:'#D7F5E0',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt    = n => Number(n||0).toLocaleString('en-IN');
const fmtRs  = n => `₹${fmt(n)}`;
const fmtK   = n => {
  if (!n) return '₹0';
  if (n >= 1e7) return `₹${(n/1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n/1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n/1e3).toFixed(1)}K`;
  return `₹${fmt(n)}`;
};
const initials   = (n='') => n.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';
const IST        = 5.5*3600000;
const todayIST   = () => new Date(Date.now()+IST).toISOString().split('T')[0];
const fmtAgo     = ms => {
  const s = Math.floor(ms/1000);
  if (s<10) return 'just now';
  if (s<60) return `${s}s ago`;
  if (s<3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
};
const AV_COLS    = ['#B8860B','#8B6914','#C9952A','#6B4F12','#DAA520','#A07830','#D4A020'];
const avCol      = (n='') => AV_COLS[n.charCodeAt(0)%AV_COLS.length];

const exportCSV  = (rows, headers, filename) => {
  const lines = [headers.join(','), ...rows.map(r =>
    r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))];
  const blob = new Blob([lines.join('\n')], { type:'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
};

// ─── Status maps ──────────────────────────────────────────────────────────────
const BS = {
  confirmed:     { label:'Confirmed',   dot:'#F59E0B', bg:'#FFFBEB', text:'#92400E', border:'#FDE68A' },
  'in-progress': { label:'In Progress', dot:'#10B981', bg:'#ECFDF5', text:'#065F46', border:'#A7F3D0' },
  completed:     { label:'Completed',   dot:'#3B82F6', bg:'#EFF6FF', text:'#1E40AF', border:'#BFDBFE' },
  cancelled:     { label:'Cancelled',   dot:'#EF4444', bg:'#FEF2F2', text:'#991B1B', border:'#FECACA' },
  'no-show':     { label:'No Show',     dot:'#9CA3AF', bg:'#F9FAFB', text:'#374151', border:'#E5E7EB' },
  pending:       { label:'Pending',     dot:'#F59E0B', bg:'#FFFBEB', text:'#92400E', border:'#FDE68A' },
};
const FS = {
  available:           { label:'Available',   dot:'#22C55E', bg:'#DCFCE7', text:'#166534', border:'#86EFAC' },
  busy:                { label:'With Client', dot:'#F59E0B', bg:'#FFFBEB', text:'#92400E', border:'#FDE68A' },
  'temp-unavailable':  { label:'Stepped Out', dot:'#F97316', bg:'#FFF7ED', text:'#C2410C', border:'#FDBA74' },
  'off-duty':          { label:'Off Duty',    dot:'#D1D5DB', bg:'#F9FAFB', text:'#6B7280', border:'#E5E7EB' },
  absent:              { label:'Absent',      dot:'#EF4444', bg:'#FEF2F2', text:'#991B1B', border:'#FECACA' },
};

// ─── WA Templates ─────────────────────────────────────────────────────────────
const WA_TPL = {
  customers: [
    { id:'reminder', label:'Appointment Reminder', msg:'Hi {name}! 🌟 Your appointment is scheduled. We look forward to seeing you! Please reply to confirm.' },
    { id:'offer',    label:'Special Offer',        msg:'Hi {name}! 💫 Exclusive offer for you — 20% off on all hair services this week. Book now!' },
    { id:'feedback', label:'Feedback Request',     msg:'Hi {name}! 🙏 Thank you for visiting us today. How was your experience? We value your feedback!' },
    { id:'birthday', label:'Birthday Wishes',      msg:'Dear {name}! 🎂 Happy Birthday! Celebrate with us — special birthday discount on your next visit!' },
    { id:'custom',   label:'Custom Message',       msg:'' },
  ],
  staff: [
    { id:'schedule', label:'Schedule Update',      msg:'Hi {name}! 📅 Please note your schedule for tomorrow. Confirm receipt of this message.' },
    { id:'meeting',  label:'Team Meeting',         msg:'Hi {name}! 👥 Team meeting scheduled. Please ensure your attendance. Thank you!' },
    { id:'attend',   label:'Attendance Reminder',  msg:'Hi {name}! ⏰ Reminder to mark your attendance when you arrive at the salon.' },
    { id:'custom',   label:'Custom Message',       msg:'' },
  ],
  receptionists: [
    { id:'briefing', label:'Daily Briefing',       msg:'Hi {name}! 📋 Good morning! Please review today\'s appointment schedule and confirm all bookings.' },
    { id:'stock',    label:'Inventory Alert',      msg:'Hi {name}! 📦 Please check inventory for low-stock items and update records. Thank you!' },
    { id:'custom',   label:'Custom Message',       msg:'' },
  ],
};

// ─── Animation variants ───────────────────────────────────────────────────────
const ease    = [0.22,0.61,0.36,1];
const fade    = { hidden:{opacity:0,y:14}, show:{opacity:1,y:0,transition:{duration:0.42,ease}} };
const stagger = { hidden:{opacity:0}, show:{opacity:1,transition:{staggerChildren:0.055}} };

// ══════════════════════════════════════════════════════════════════════════════
// ATOMS
// ══════════════════════════════════════════════════════════════════════════════
function Pulse({ color='#22C55E', size=7 }) {
  return <span style={{ display:'inline-block', width:size, height:size, borderRadius:'50%',
    background:color, animation:'pulseDot 2s ease-in-out infinite',
    boxShadow:`0 0 6px ${color}88` }}/>;
}

function GrowthBadge({ value }) {
  if (value==null) return null;
  const up = value>=0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3,
      padding:'2px 7px', borderRadius:100, fontSize:10, fontWeight:700,
      background:up?C.greenPale:C.redPale, color:up?C.green:C.red,
      border:`1px solid ${up?C.greenBorder:C.redBorder}` }}>
      <Icon size={9}/> {up?'+':''}{value}%
    </span>
  );
}

function SectionHead({ title, badge, badgeBg, badgeColor, action, live=false, icon:Icon }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'16px 20px', borderBottom:`1px solid ${C.border}` }}>
      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
        {live && <Pulse size={7}/>}
        {Icon && <Icon size={15} color={C.gold}/>}
        <h3 style={{ fontFamily:'Playfair Display,serif', fontSize:15, fontWeight:700,
          color:C.ink, margin:0 }}>{title}</h3>
        {badge!=null && (
          <span style={{ padding:'2px 9px', borderRadius:100, fontSize:11, fontWeight:700,
            background:badgeBg||C.goldPale, color:badgeColor||C.gold,
            border:`1px solid ${C.border}` }}>{badge}</span>
        )}
      </div>
      {action}
    </div>
  );
}

function KpiCard({ icon:Icon, label, value, sub, growth, color, bg, border, onClick, loading }) {
  const accent = color||C.gold;
  return (
    <motion.div variants={fade} whileHover={{ y:-4, boxShadow:`0 20px 48px ${accent}22` }}
      onClick={onClick}
      style={{ background:C.cardBg, border:`1px solid ${border||C.border}`, borderRadius:20,
        padding:'20px 20px 16px', cursor:onClick?'pointer':'default',
        boxShadow:`0 2px 16px ${accent}0A`, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80,
        borderRadius:'50%', background:`${accent}12`, pointerEvents:'none' }}/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
        <div style={{ width:42, height:42, borderRadius:14, display:'flex',
          alignItems:'center', justifyContent:'center',
          background:bg||C.goldPale, border:`1px solid ${border||C.border}` }}>
          <Icon size={19} color={accent}/>
        </div>
        <span style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 8px',
          borderRadius:100, fontSize:10, fontWeight:700,
          background:C.goldPale, color:C.gold, border:`1px solid ${C.border}` }}>
          <Pulse color={C.goldLight} size={5}/> LIVE
        </span>
      </div>
      <div style={{ fontSize:30, fontWeight:800, color:C.ink, lineHeight:1,
        fontFamily:'Playfair Display,serif', marginBottom:4 }}>
        {loading ? <span style={{ color:C.inkGhost }}>—</span> : value}
      </div>
      <div style={{ fontSize:12, fontWeight:700, color:C.inkMid, marginBottom:5 }}>{label}</div>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ fontSize:11, color:C.inkLight }}>{sub}</span>
        <GrowthBadge value={growth}/>
      </div>
      <div style={{ marginTop:14, height:2, borderRadius:2,
        background:`linear-gradient(to right, ${accent}, transparent)` }}/>
    </motion.div>
  );
}

// Custom chart tooltip
function RevTooltip({ active, payload, label }) {
  if (!active||!payload?.length) return null;
  return (
    <div style={{ background:C.heroBg2, border:`1px solid #3A280C`,
      borderRadius:12, padding:'10px 14px', boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
      <div style={{ fontSize:11, color:C.inkLight, marginBottom:4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ fontSize:14, fontWeight:700, color:C.goldBright }}>
          {p.dataKey==='revenue' ? fmtRs(p.value) : `${p.value} bookings`}
        </div>
      ))}
    </div>
  );
}

// Pipeline bar
function PipelineBar({ stats }) {
  const total = Math.max(stats?.total||0, 1);
  const segs = [
    { k:'confirmed',  v:stats?.confirmed||0,  c:'#F59E0B', label:'Confirmed' },
    { k:'inProgress', v:stats?.inProgress||0, c:'#10B981', label:'Active'    },
    { k:'completed',  v:stats?.completed||0,  c:'#3B82F6', label:'Done'      },
    { k:'cancelled',  v:stats?.cancelled||0,  c:'#EF4444', label:'Cancelled' },
  ];
  return (
    <div>
      <div style={{ display:'flex', height:8, borderRadius:4, overflow:'hidden', gap:2, marginBottom:10 }}>
        {segs.map(s => (
          <div key={s.k} style={{ flex:s.v/total, background:s.c,
            minWidth:s.v>0?4:0, transition:'flex 0.6s ease', borderRadius:2 }}/>
        ))}
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
        {segs.map(s => (
          <div key={s.k} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:8, height:8, borderRadius:2, background:s.c }}/>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>{s.label}</span>
            <span style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.9)' }}>{s.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CASH COUNTER MODAL
// ══════════════════════════════════════════════════════════════════════════════
function CashCounterModal({ cashData, onClose }) {
  const counterBal  = cashData?.counterBal  || 0;
  const cashIn      = cashData?.cashIn      || 0;
  const manualIn    = cashData?.manualIn    || 0;
  const withdrawn   = cashData?.withdrawn   || 0;
  const expenses    = cashData?.expenses    || 0;
  const cashToday   = cashData?.todayCash   || 0;
  const cashCount   = cashData?.todayCashCount || 0;
  const cashPayments = cashData?.payments   || [];
  const manualTxns  = cashData?.manualTxns  || [];
  const recentManual = manualTxns.slice(0,5);

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      onClick={onClose}
      style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(15,12,7,0.72)',
        backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <motion.div initial={{scale:0.94,y:20}} animate={{scale:1,y:0}} exit={{scale:0.94,y:20}}
        onClick={e=>e.stopPropagation()}
        style={{ width:480, background:C.cardBg, borderRadius:24, border:`1px solid ${C.border}`,
          boxShadow:'0 32px 80px rgba(0,0,0,0.4)', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.border}`,
          background:`linear-gradient(135deg,#1c1408,#2d2010)`, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-30, right:-30, width:120, height:120, borderRadius:'50%',
            background:'radial-gradient(circle,rgba(218,165,32,0.15) 0%,transparent 70%)' }}/>
          <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:14, background:`linear-gradient(135deg,${C.gold},${C.goldLight})`,
                display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 16px ${C.gold}40` }}>
                <Wallet size={22} color='#fff'/>
              </div>
              <div>
                <h2 style={{ fontSize:18, fontWeight:800, color:'#fff', margin:0, fontFamily:'Playfair Display,serif' }}>
                  Cash Counter
                </h2>
                <p style={{ fontSize:12, color:'#7a6040', margin:0 }}>Today's cash flow at the counter</p>
              </div>
            </div>
            <button onClick={onClose} style={{ width:32, height:32, borderRadius:10, border:'1px solid rgba(255,255,255,0.15)',
              background:'rgba(255,255,255,0.08)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <X size={16} color='#fff'/>
            </button>
          </div>
        </div>

        <div style={{ padding:'22px 24px' }}>
          {/* Big counter balance */}
          <div style={{ textAlign:'center', padding:'24px 20px', borderRadius:20, marginBottom:16,
            background:`linear-gradient(135deg,${C.goldPale},#FFF5D6)`, border:`2px solid ${C.gold}30` }}>
            <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.14em',
              color:C.gold, marginBottom:8 }}>Current Counter Balance</div>
            <div style={{ fontSize:48, fontWeight:800, color:C.ink, lineHeight:1, fontFamily:'Playfair Display,serif' }}>
              {fmtRs(counterBal)}
            </div>
            <div style={{ fontSize:12, color:C.inkLight, marginTop:8 }}>
              Running total · +{fmtRs(cashToday)} added today ({cashCount} bookings)
            </div>
          </div>

          {/* Balance breakdown */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
            {[
              { l:'Cash from Bookings', v:cashIn,    dot:C.green,  bg:C.greenPale,  border:C.greenBorder,  sign:'+' },
              { l:'Manual Cash In',     v:manualIn,  dot:C.blue,   bg:C.bluePale,   border:C.blueBorder,   sign:'+' },
              { l:'Withdrawals',        v:withdrawn, dot:C.red,    bg:C.redPale,    border:C.redBorder,    sign:'−' },
              { l:'Expenses',           v:expenses,  dot:'#F97316',bg:C.amberPale,  border:C.amberBorder,  sign:'−' },
            ].map(({ l, v, dot, bg, border, sign }) => (
              <div key={l} style={{ padding:'11px 14px', borderRadius:12, background:bg, border:`1px solid ${border}` }}>
                <div style={{ fontSize:10, fontWeight:700, color:dot, textTransform:'uppercase',
                  letterSpacing:'0.08em', marginBottom:4 }}>{sign} {l}</div>
                <div style={{ fontSize:18, fontWeight:800, color:C.ink, fontFamily:'Playfair Display,serif' }}>
                  {fmtRs(v)}
                </div>
              </div>
            ))}
          </div>

          {/* Today's cash bookings */}
          {cashPayments.length > 0 && (
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em',
                color:C.inkLight, marginBottom:8 }}>Today's Cash Bookings</div>
              <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight:150, overflowY:'auto' }}>
                {cashPayments.slice(0,6).map((b,i) => (
                  <div key={b._id||i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'8px 12px', borderRadius:10, background:C.pageBg, border:`1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:C.ink }}>{b.customer?.name || 'Walk-in'}</div>
                      <div style={{ fontSize:10, color:C.inkLight }}>{b.service?.name || b.timeSlot?.start || '—'}</div>
                    </div>
                    <div style={{ fontSize:14, fontWeight:800, color:C.green, fontFamily:'Playfair Display,serif' }}>
                      {fmtRs(b.finalAmount||b.totalAmount||0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cashPayments.length === 0 && (
            <div style={{ padding:'16px', textAlign:'center', color:C.inkLight, fontSize:12,
              background:C.pageBg, borderRadius:12, border:`1px solid ${C.border}` }}>
              No cash bookings today — counter balance carried forward
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WHATSAPP PANEL
// ══════════════════════════════════════════════════════════════════════════════
function WhatsAppPanel({ onClose, customers:initCustomers=[], staff=[], receptionists=[] }) {
  const [tab,        setTab]        = useState('customers');
  const [search,     setSearch]     = useState('');
  const [selected,   setSelected]   = useState([]);
  const [templateId, setTemplateId] = useState('custom');
  const [message,    setMessage]    = useState('');
  const [sent,       setSent]       = useState(false);
  const [onlyWithPhone, setOnlyWithPhone] = useState(true);
  const [customers,  setCustomers]  = useState(initCustomers);
  const [loadingC,   setLoadingC]   = useState(false);

  // Always fetch fresh customers when panel opens
  useEffect(() => {
    setLoadingC(true);
    api.get('/users', { params: { role: 'customer', limit: 1000 } })
      .then(r => setCustomers(r.data.users || []))
      .catch(() => {})
      .finally(() => setLoadingC(false));
  }, []);

  const ALL = { customers, staff, receptionists };
  const TPLS = WA_TPL[tab]||[];

  const filtered = useMemo(() => {
    const list = ALL[tab]||[];
    let res = list.filter(c =>
      (c.name||'').toLowerCase().includes(search.toLowerCase()) ||
      (c.phone||'').includes(search));
    if (onlyWithPhone) res = res.filter(c => (c.phone||'').replace(/\D/g,'').length >= 10);
    return res;
  }, [tab, search, customers, staff, receptionists, onlyWithPhone]);

  const withPhoneCnt = (ALL[tab]||[]).filter(c => (c.phone||'').replace(/\D/g,'').length >= 10).length;
  const totalCnt     = (ALL[tab]||[]).length;

  const toggle    = id => setSelected(s => s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const toggleAll = () => setSelected(s => s.length===filtered.length?[]:filtered.map(c=>c._id));
  const handleTpl = t => { setTemplateId(t.id); setMessage(t.id!=='custom'?t.msg:''); };

  const sendAll = () => {
    const contacts = filtered.filter(c=>selected.includes(c._id));
    if (!contacts.length) return;
    let opened = 0;
    contacts.forEach(c => {
      const raw = (c.phone||'').replace(/\D/g,'');
      if (!raw || raw.length < 10) return;
      // Normalize to 91XXXXXXXXXX
      const ph = raw.length === 10 ? '91' + raw : raw.length === 12 && raw.startsWith('91') ? raw : '91' + raw.slice(-10);
      const msg = message
        .replace(/{name}/g, c.name||'there')
        .replace(/{date}/g, new Date().toLocaleDateString('en-IN'))
        .replace(/{time}/g, new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}))
        .replace(/{notes}/g,'Check dashboard for details');
      window.open(`https://wa.me/${ph}?text=${encodeURIComponent(msg)}`, '_blank');
      opened++;
    });
    if (opened > 0) { setSent(true); setTimeout(()=>setSent(false), 3000); }
    else alert('No valid phone numbers in selection');
  };

  const tabBtn = t => ({
    padding:'7px 14px', borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer',
    border:'none', transition:'all 0.15s',
    background:tab===t?C.ink:'transparent', color:tab===t?'#fff':C.inkMid,
  });

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{ position:'fixed', inset:0, zIndex:1000, display:'flex',
        alignItems:'center', justifyContent:'center',
        background:'rgba(15,12,7,0.72)', backdropFilter:'blur(8px)' }}
      onClick={onClose}>
      <motion.div initial={{scale:0.94,y:20}} animate={{scale:1,y:0}} exit={{scale:0.94,y:20}}
        transition={{duration:0.22,ease}}
        onClick={e=>e.stopPropagation()}
        style={{ width:700, maxHeight:'90vh', background:C.cardBg, borderRadius:24,
          boxShadow:'0 32px 80px rgba(0,0,0,0.4)', border:`1px solid ${C.border}`,
          display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'20px 24px', borderBottom:`1px solid ${C.border}`,
          background:`linear-gradient(135deg,${C.wa}18,${C.waPale})` }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:14, background:C.wa,
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:`0 4px 16px ${C.wa}40` }}>
              <MessageCircle size={22} color='#fff'/>
            </div>
            <div>
              <h2 style={{ fontSize:18, fontWeight:800, color:C.ink, margin:0,
                fontFamily:'Playfair Display,serif' }}>WhatsApp Messaging</h2>
              <p style={{ fontSize:12, color:C.inkLight, margin:0 }}>
                Send personalised messages to your contacts
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:10,
            border:`1px solid ${C.border}`, background:'transparent',
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={16} color={C.inkMid}/>
          </button>
        </div>
        {/* Body */}
        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
          {/* Left contacts */}
          <div style={{ width:280, borderRight:`1px solid ${C.border}`,
            display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ display:'flex', gap:4, padding:'12px 12px 8px',
              borderBottom:`1px solid ${C.border}` }}>
              {['customers','staff','receptionists'].map(t => (
                <button key={t} style={tabBtn(t)}
                  onClick={()=>{ setTab(t); setSelected([]); }}>
                  {t==='customers'?'Clients':t==='receptionists'?'Recept.':t.charAt(0).toUpperCase()+t.slice(1,5)}
                  <span style={{ marginLeft:4, fontSize:10, opacity:0.7 }}>({(ALL[t]||[]).length})</span>
                </button>
              ))}
            </div>
            <div style={{ padding:'8px 12px', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:8,
                background:C.pageBg, borderRadius:10, padding:'7px 10px',
                border:`1px solid ${C.border}` }}>
                <Search size={13} color={C.inkLight}/>
                <input value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="Search…" style={{ flex:1, border:'none',
                    background:'transparent', fontSize:12, color:C.ink, outline:'none' }}/>
              </div>
            </div>
            {/* Phone count + filter toggle */}
            <div style={{ padding:'6px 12px', borderBottom:`1px solid ${C.border}`,
              background: C.pageBg, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, fontWeight:600, color:C.inkMid, cursor:'pointer' }}>
                <input type='checkbox' checked={onlyWithPhone} onChange={e=>{ setOnlyWithPhone(e.target.checked); setSelected([]); }}
                  style={{ accentColor:C.wa }}/>
                With phone only
              </label>
              <span style={{ fontSize:10, color:C.inkLight }}>
                📱 {withPhoneCnt}/{totalCnt}
              </span>
            </div>
            <div style={{ padding:'8px 12px', display:'flex', alignItems:'center',
              justifyContent:'space-between' }}>
              <label style={{ display:'flex', alignItems:'center', gap:6,
                fontSize:11, fontWeight:600, color:C.inkMid, cursor:'pointer' }}>
                <input type='checkbox'
                  checked={selected.length===filtered.length && filtered.length>0}
                  onChange={toggleAll} style={{ accentColor:C.gold }}/>
                All ({filtered.length})
              </label>
              {selected.length>0 && (
                <span style={{ fontSize:11, fontWeight:700, color:C.gold }}>
                  {selected.length} selected
                </span>
              )}
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'0 8px 8px' }}>
              {loadingC && tab==='customers' ? (
                <div style={{ padding:24, textAlign:'center' }}>
                  <Loader2 size={16} color={C.gold} style={{ animation:'spin 0.8s linear infinite' }}/>
                  <div style={{ fontSize:11, color:C.inkLight, marginTop:8 }}>Loading contacts…</div>
                </div>
              ) : filtered.length===0 ? (
                <div style={{ padding:24, textAlign:'center', color:C.inkLight, fontSize:12 }}>
                  {totalCnt === 0 ? 'No contacts loaded' : onlyWithPhone ? 'No contacts with phone numbers' : 'No contacts found'}
                </div>
              ) : filtered.map(c => {
                const rawPhone = (c.phone||'').replace(/\D/g,'');
                const hasPhone = rawPhone.length >= 10;
                return (
                <div key={c._id} onClick={()=>toggle(c._id)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
                    borderRadius:10, cursor:'pointer', marginBottom:3, transition:'all 0.12s',
                    background:selected.includes(c._id)?`${C.wa}15`:'transparent',
                    border:selected.includes(c._id)?`1px solid ${C.wa}40`:'1px solid transparent' }}>
                  <input type='checkbox' checked={selected.includes(c._id)}
                    onChange={()=>toggle(c._id)} style={{ accentColor:C.wa, flexShrink:0 }}/>
                  <div style={{ width:30, height:30, borderRadius:10, flexShrink:0,
                    background:avCol(c.name), display:'flex', alignItems:'center',
                    justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff' }}>
                    {initials(c.name)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:C.ink,
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize:10, color: hasPhone ? C.inkMid : C.inkGhost }}>
                      {hasPhone ? c.phone : 'No phone number'}
                    </div>
                  </div>
                  {hasPhone && <Phone size={11} color={C.wa}/>}
                  {!hasPhone && <span style={{ fontSize:9, color:C.inkGhost }}>—</span>}
                </div>
              );})}
            </div>
          </div>
          {/* Right composer */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', padding:20, overflow:'auto' }}>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.inkLight,
                textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>
                Template
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                {TPLS.map(t => (
                  <button key={t.id} onClick={()=>handleTpl(t)}
                    style={{ padding:'6px 12px', borderRadius:10, fontSize:11, fontWeight:600,
                      cursor:'pointer', transition:'all 0.12s',
                      border:`1px solid ${C.border}`,
                      background:templateId===t.id?C.ink:C.cardBg,
                      color:templateId===t.id?'#fff':C.inkMid }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ fontSize:11, fontWeight:700, color:C.inkLight,
              textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8,
              display:'flex', justifyContent:'space-between' }}>
              <span>Message</span>
              <span style={{ textTransform:'none', fontWeight:400, color:C.inkGhost, fontSize:10 }}>
                Variables: {'{name}'} {'{date}'} {'{time}'}
              </span>
            </div>
            <textarea value={message} onChange={e=>setMessage(e.target.value)}
              placeholder="Type your message here…"
              style={{ flex:1, minHeight:130, padding:'12px 14px', borderRadius:14,
                border:`2px solid ${C.border}`, background:C.pageBg, color:C.ink,
                fontSize:13, fontFamily:'inherit', resize:'none', outline:'none',
                lineHeight:1.6, transition:'border-color 0.15s' }}
              onFocus={e=>e.target.style.borderColor=C.gold}
              onBlur={e=>e.target.style.borderColor=C.border}/>
            {message && (
              <div style={{ marginTop:10, padding:'12px 14px', borderRadius:12,
                background:`${C.wa}12`, border:`1px solid ${C.wa}30` }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.wa,
                  textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:5 }}>Preview</div>
                <div style={{ fontSize:12, color:C.inkMid, lineHeight:1.6, whiteSpace:'pre-wrap' }}>
                  {message.replace(/{name}/g,'Customer').replace(/{date}/g,'Today')
                    .replace(/{time}/g,'10:00 AM').replace(/{notes}/g,'Check dashboard')}
                </div>
              </div>
            )}
            <button onClick={sendAll} disabled={!selected.length||!message}
              style={{ marginTop:14, display:'flex', alignItems:'center', justifyContent:'center',
                gap:8, padding:'13px', borderRadius:14, border:'none',
                background:selected.length&&message?C.wa:C.border, color:'#fff',
                fontSize:13, fontWeight:700, cursor:selected.length&&message?'pointer':'not-allowed',
                transition:'all 0.15s',
                boxShadow:selected.length&&message?`0 6px 20px ${C.wa}40`:'none' }}>
              {sent ? <><Check size={16}/> Opened!</> : <><Send size={16}/> Send to {selected.length} contact{selected.length!==1?'s':''}</>}
            </button>
            <p style={{ fontSize:11, color:C.inkGhost, textAlign:'center', marginTop:8, margin:'8px 0 0' }}>
              Opens individual WhatsApp chats · contacts without phones are skipped
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const { stats, bookings:allBookings, liveStatus, syncing, refresh, inventory:dsInventory, refreshInventory } = useDataStore();

  const [overview,      setOverview]      = useState(null);
  const [chartData,     setChartData]     = useState([]);
  const [chartPeriod,   setChartPeriod]   = useState('last7');
  const [topServices,   setTopServices]   = useState([]);
  const [customers,     setCustomers]     = useState([]);
  const [staffList,     setStaffList]     = useState([]);
  const [inventory,     setInventory]     = useState([]);
  // Seed from DataStore so low-stock alert updates in real-time after admin/receptionist changes
  useEffect(() => { if (dsInventory?.length) setInventory(dsInventory); }, [dsInventory]);
  const [receptionists, setReceptionists] = useState([]);
  const [extraLoad,     setExtraLoad]     = useState(true);
  const [chartLoad,     setChartLoad]     = useState(false);
  const [lastFetchAt,   setLastFetchAt]   = useState(null);
  const [agoText,       setAgoText]       = useState('just now');
  const [time,          setTime]          = useState(new Date());
  const [manRefresh,    setManRefresh]    = useState(false);
  const [waOpen,        setWaOpen]        = useState(false);
  const [searchTerm,    setSearchTerm]    = useState('');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [showAlerts,    setShowAlerts]    = useState(true);
  const [cashData,      setCashData]      = useState(null);
  const [cashModal,     setCashModal]     = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [attendanceLoad,    setAttendanceLoad]    = useState(false);
  const extraRef = useRef(null);

  // Derived
  const today  = todayIST();
  const todayB = useMemo(() => allBookings.filter(b => {
    if (!b.date) return false;
    return new Date(new Date(b.date).getTime()).toISOString().split('T')[0] === today;
  }), [allBookings, today]);

  const filteredB = useMemo(() => {
    let b = todayB;
    if (statusFilter!=='all') b = b.filter(x=>x.status===statusFilter);
    if (searchTerm) b = b.filter(x=>
      (x.customer?.name||'').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (x.service?.name||'').toLowerCase().includes(searchTerm.toLowerCase()));
    return b;
  }, [todayB, statusFilter, searchTerm]);

  const hour     = time.getHours();
  const greeting = hour<12?'Good Morning':hour<17?'Good Afternoon':'Good Evening';
  const dateStr  = time.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const timeStr  = time.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true});

  const floorCounts = useMemo(() => {
    const c={available:0,busy:0,'temp-unavailable':0,'off-duty':0,absent:0};
    (liveStatus||[]).forEach(s=>{ const k=s.liveStatus||'off-duty'; if(k in c) c[k]++; });
    return c;
  }, [liveStatus]);

  const lowStock       = useMemo(() => inventory.filter(i=>(i.quantity||0)<=(i.lowStockThreshold||i.minStock||5)), [inventory]);
  const pendingPayCnt  = stats?.pendingPayCount||0;
  const pendingPayAmt  = stats?.pendingPayment||0;
  const totalCustomers = overview?.customers?.total??null;
  const monthRevenue   = overview?.revenue?.current??null;
  const revenueGrowth  = overview?.revenue?.growth??null;
  const bookingGrowth  = overview?.bookings?.growth??null;
  const convRate       = overview?.bookings?.total
    ? Math.round((overview.bookings.completed/overview.bookings.total)*100) : null;

  // Effects
  useEffect(() => { const id=setInterval(()=>setTime(new Date()),1000); return()=>clearInterval(id); },[]);
  useEffect(() => {
    if (!lastFetchAt) return;
    const id=setInterval(()=>setAgoText(fmtAgo(Date.now()-lastFetchAt)),5000);
    return ()=>clearInterval(id);
  }, [lastFetchAt]);

  const fetchExtra = useCallback(async () => {
    try {
      const since60 = new Date(Date.now() - 60*24*3600000).toISOString().split('T')[0];
      const todayStr = new Date(Date.now() + 5.5*3600000).toISOString().split('T')[0];
      const [ov, svc, cust, inv, cashBooks] = await Promise.allSettled([
        api.get('/analytics/overview',{params:{period:'thisMonth'}}),
        api.get('/analytics/top-services',{params:{period:'thisMonth'}}),
        api.get('/users',{params:{role:'customer', limit:1000}}),
        api.get('/inventory',{params:{limit:100}}),
        api.get('/bookings',{params:{startDate:since60, endDate:todayStr, limit:500}}),
      ]);
      if (ov.status==='fulfilled')   setOverview(ov.value.data.overview);
      if (svc.status==='fulfilled')  setTopServices(svc.value.data.services?.slice(0,8)||[]);
      if (cust.status==='fulfilled') setCustomers(cust.value.data.users||[]);
      if (inv.status==='fulfilled')  setInventory(inv.value.data.products||inv.value.data.inventory||inv.value.data.items||[]);
      if (cashBooks.status==='fulfilled') {
        const allB = cashBooks.value.data.bookings || [];
        // Same formula as ReceptionistCash.jsx
        const cashPaid = allB.filter(b => b.paymentMethod==='cash' && b.paymentStatus==='paid');
        const cashIn = cashPaid.reduce((s,b) => s+(b.finalAmount||b.totalAmount||0), 0);
        // Read manual transactions from same localStorage key the receptionist uses
        let manualTxns = [];
        try { manualTxns = JSON.parse(localStorage.getItem('salon_cash_manual_txns')||'[]') || []; } catch {}
        const manualIn  = manualTxns.filter(t=>t.type==='cash_in').reduce((s,t)=>s+t.amount,0);
        const withdrawn = manualTxns.filter(t=>t.type==='withdrawal').reduce((s,t)=>s+t.amount,0);
        const expenses  = manualTxns.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
        const counterBal = Math.max(0, cashIn + manualIn - withdrawn - expenses);
        // Today's cash for the modal
        const todayCashBookings = cashPaid.filter(b => b.date && new Date(b.date).toISOString().split('T')[0]===todayStr);
        setCashData({
          counterBal,
          todayCash: todayCashBookings.reduce((s,b)=>s+(b.finalAmount||b.totalAmount||0),0),
          todayCashCount: todayCashBookings.length,
          cashIn, manualIn, withdrawn, expenses,
          payments: todayCashBookings,
          manualTxns,
        });
      }
    } catch {}
    setExtraLoad(false);
    setLastFetchAt(Date.now());
    setAgoText('just now');
  }, []);

  const fetchChart = useCallback(async (period) => {
    setChartLoad(true);
    try {
      const { data } = await api.get('/analytics/revenue-chart',{params:{period}});
      setChartData((data.chart||[]).map(d=>({ day:d.label||d.date||'', revenue:d.revenue||0, bookings:d.bookings||0 })));
    } catch {}
    setChartLoad(false);
  }, []);

  useEffect(() => {
    const fetchPeople = async () => {
      try {
        // staff = role:'staff'  |  receptionists = role:'receptionist'
        // Both come from the User collection via /staff endpoint or /users
        const [s, r, c2] = await Promise.allSettled([
          api.get('/staff', { params: { limit: 200 } }),
          api.get('/users', { params: { role: 'receptionist', limit: 50 } }),
          api.get('/users', { params: { role: 'customer', limit: 1000 } }),
        ]);
        if (s.status === 'fulfilled') {
          const raw = s.value.data.staff || s.value.data.users || [];
          setStaffList(raw.filter(u => u.role !== 'receptionist'));
        }
        if (r.status === 'fulfilled') {
          setReceptionists(r.value.data.users || r.value.data.staff || []);
        }
        // always refresh customers list so WhatsApp panel stays up to date
        if (c2.status === 'fulfilled') {
          setCustomers(c2.value.data.users || []);
        }
      } catch {}
    };
    fetchPeople();
    fetchExtra();
    fetchChart('last7');
    // Fetch this month's attendance summary
    const n = new Date(Date.now() + 5.5*3600000);
    setAttendanceLoad(true);
    api.get('/attendance/report', { params: { year: n.getFullYear(), month: n.getMonth()+1 } })
      .then(r => setAttendanceSummary(r.data.summary || []))
      .catch(() => {})
      .finally(() => setAttendanceLoad(false));
  }, [fetchExtra, fetchChart]);

  useEffect(() => { fetchChart(chartPeriod); }, [chartPeriod, fetchChart]);

  useEffect(() => {
    extraRef.current = setInterval(() => {
      if (!document.hidden) { fetchExtra(); fetchChart(chartPeriod); }
    }, 30000);
    return () => clearInterval(extraRef.current);
  }, [fetchExtra, chartPeriod, fetchChart]);

  const handleRefresh = async () => {
    setManRefresh(true);
    await Promise.allSettled([refresh(false), fetchExtra(), fetchChart(chartPeriod)]);
    setManRefresh(false);
  };

  const exportBookings = () => exportCSV(
    filteredB.map(b=>[
      b.customer?.name||'Walk-in', b.customer?.phone||'',
      b.service?.name||'', b.staff?.name||'',
      b.date||'', b.timeSlot?.start||'',
      b.status||'', b.finalAmount||b.totalAmount||0,
    ]),
    ['Customer','Phone','Service','Stylist','Date','Time','Status','Amount(₹)'],
    `bookings-${today}.csv`
  );

  const exportRevenue = () => exportCSV(
    chartData.map(d=>[d.day,d.revenue,d.bookings]),
    ['Date','Revenue(₹)','Bookings'],
    `revenue-${today}.csv`
  );

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="glm-dash-page"
      style={{ fontFamily:'DM Sans,sans-serif' }}>

      <style>{`
        /* Responsive overrides for AdminDashboard fixed grids */
        @media (max-width: 900px) {
          .glm-dash-split { grid-template-columns: 1fr !important; }
          .glm-dash-4col  { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 500px) {
          .glm-dash-4col  { grid-template-columns: 1fr !important; }
          .glm-dash-7col  { grid-template-columns: repeat(7, 1fr) !important; font-size: 10px; }
        }
        /* Ensure modals don't overflow viewport on mobile */
        @media (max-width: 640px) {
          .glm-dash-modal {
            max-height: 90dvh;
            overflow-y: auto;
            border-radius: 20px 20px 0 0 !important;
            position: fixed !important;
            bottom: 0 !important;
            top: auto !important;
            left: 0 !important;
            right: 0 !important;
            transform: none !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <AnimatePresence>
        {waOpen && (
          <WhatsAppPanel onClose={()=>setWaOpen(false)}
            customers={customers} staff={staffList} receptionists={receptionists}/>
        )}
        {cashModal && (
          <CashCounterModal cashData={cashData} onClose={()=>setCashModal(false)}/>
        )}
      </AnimatePresence>

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <motion.div variants={fade}
        style={{ position:'relative', overflow:'hidden', borderRadius:28, marginBottom:20,
          background:`linear-gradient(145deg,${C.heroBg} 0%,${C.heroBg2} 55%,#120D04 100%)`,
          border:'1px solid #2E2410', boxShadow:'0 12px 48px rgba(0,0,0,0.45)' }}>
        {/* Crosshatch */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none',
          backgroundImage:'repeating-linear-gradient(45deg,#B8860B 0,#B8860B 1px,transparent 0,transparent 50%)',
          backgroundSize:'20px 20px', opacity:0.05 }}/>
        {/* Glow orbs */}
        <div style={{ position:'absolute', top:-80, right:-60, width:360, height:360, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(218,165,32,0.12) 0%,transparent 70%)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-60, left:60, width:200, height:200, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(184,134,11,0.07) 0%,transparent 70%)', pointerEvents:'none' }}/>

        <div style={{ position:'relative', padding:'28px 30px' }}>
          {/* Top row */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
            flexWrap:'wrap', gap:14, marginBottom:22 }}>
            {/* Greeting */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
                <Sparkles size={10} color='#F0D878'/>
                <span style={{ fontSize:10, fontWeight:800, letterSpacing:'0.22em',
                  textTransform:'uppercase', color:'#F0D878' }}>Admin Command Center</span>
              </div>
              <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:32, fontWeight:700,
                color:'#fff', margin:0, lineHeight:1.15 }}>
                {greeting},{' '}
                <span style={{ color:'#D4A017' }}>{user?.name?.split(' ')[0]}</span> 👋
              </h1>
              <p style={{ fontSize:13, color:'#5A4020', margin:'6px 0 0' }}>{dateStr}</p>
            </div>
            {/* Clock + controls */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:10 }}>
              <div style={{ fontFamily:'Courier New,monospace', fontSize:26, fontWeight:700,
                color:'#D4A017', letterSpacing:'0.06em', lineHeight:1 }}>{timeStr}</div>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px',
                  borderRadius:100, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.2)',
                  color:'#6EE7B7', fontSize:11, fontWeight:600 }}>
                  <Pulse color='#22C55E' size={6}/> System Live
                </div>
                {lastFetchAt && (
                  <div style={{ fontSize:11, color:'#5A4030', padding:'5px 10px', borderRadius:100,
                    background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                    Synced {agoText}
                  </div>
                )}
                <button onClick={handleRefresh} disabled={manRefresh||syncing}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px',
                    borderRadius:100, border:'1px solid rgba(255,255,255,0.13)',
                    background:'rgba(255,255,255,0.07)', color:'#fff', fontSize:12, fontWeight:600,
                    cursor:'pointer', opacity:(manRefresh||syncing)?0.5:1 }}>
                  <RefreshCw size={12} style={{ animation:(manRefresh||syncing)?'spin 0.8s linear infinite':'none' }}/>
                  Refresh
                </button>
              </div>
            </div>
          </div>
          {/* Bottom row: pipeline + CTAs */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            flexWrap:'wrap', gap:14 }}>
            <div style={{ flex:1, minWidth:260 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#6B5030',
                textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:10 }}>
                Today's Appointment Pipeline
              </div>
              <PipelineBar stats={stats}/>
            </div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <button onClick={()=>navigate('/admin/appointments')}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 18px',
                  borderRadius:14, border:'none', cursor:'pointer', fontWeight:700, fontSize:13,
                  background:'linear-gradient(135deg,#DAA520,#B8860B)', color:'#fff',
                  boxShadow:'0 6px 20px rgba(184,134,11,0.4)' }}>
                <Plus size={15}/> New Booking
              </button>
              <button onClick={()=>setWaOpen(true)}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 18px',
                  borderRadius:14, border:'none', cursor:'pointer', fontWeight:700, fontSize:13,
                  background:`linear-gradient(135deg,${C.wa},#1DA855)`, color:'#fff',
                  boxShadow:`0 6px 20px ${C.wa}50` }}>
                <MessageCircle size={15}/> WhatsApp
              </button>
              <button onClick={exportBookings}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 18px',
                  borderRadius:14, border:'1px solid rgba(255,255,255,0.15)',
                  background:'rgba(255,255,255,0.07)', color:'#fff', cursor:'pointer',
                  fontWeight:600, fontSize:13 }}>
                <Download size={15}/> Export
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ══ WEBSITE BANNER (Plan 2+) ═══════════════════════════════════ */}
      <WebsiteBanner />

      {/* ══ SMART ALERTS ══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showAlerts && (pendingPayCnt>0 || lowStock.length>0) && (
          <motion.div variants={fade} exit={{opacity:0,height:0}} style={{ marginBottom:18 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:'0.15em',
                textTransform:'uppercase', color:C.inkLight, display:'flex', alignItems:'center', gap:6 }}>
                <Bell size={11}/> Active Alerts
              </div>
              <button onClick={()=>setShowAlerts(false)}
                style={{ border:'none', background:'none', cursor:'pointer', color:C.inkGhost, fontSize:11 }}>
                Dismiss
              </button>
            </div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {pendingPayCnt>0 && (
                <div onClick={()=>navigate('/admin/payments')}
                  style={{ flex:1, minWidth:240, display:'flex', alignItems:'center',
                    justifyContent:'space-between', padding:'12px 16px', borderRadius:14,
                    background:C.amberPale, border:`1px solid ${C.amberBorder}`, cursor:'pointer' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:'#FDE68A',
                      display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <CreditCard size={16} color={C.amber}/>
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:C.amber }}>
                        {pendingPayCnt} pending payment{pendingPayCnt>1?'s':''}
                      </div>
                      <div style={{ fontSize:11, color:'#B45309' }}>
                        {fmtRs(pendingPayAmt)} awaiting collection
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={14} color={C.amber}/>
                </div>
              )}
              {lowStock.length>0 && (
                <div onClick={()=>navigate('/admin/inventory')}
                  style={{ flex:1, minWidth:240, display:'flex', alignItems:'center',
                    justifyContent:'space-between', padding:'12px 16px', borderRadius:14,
                    background:C.redPale, border:`1px solid ${C.redBorder}`, cursor:'pointer' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:'#FECACA',
                      display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Package size={16} color={C.red}/>
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:C.red }}>
                        {lowStock.length} low stock item{lowStock.length>1?'s':''}
                      </div>
                      <div style={{ fontSize:11, color:'#B91C1C' }}>
                        {lowStock.slice(0,2).map(i=>i.name||i.productName||'Item').join(', ')}
                        {lowStock.length>2?` +${lowStock.length-2} more`:''}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={14} color={C.red}/>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ KPI CARDS ═════════════════════════════════════════════════════ */}
      <motion.div variants={stagger}
        style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(195px,1fr))',
          gap:13, marginBottom:20 }}>
        <KpiCard icon={Calendar}    label="Today's Bookings"
          value={stats?String(stats.total):'—'}
          sub={stats?`${stats.confirmed} confirmed`:'…'}
          growth={bookingGrowth} onClick={()=>navigate('/admin/appointments')} loading={!stats}/>
        <KpiCard icon={IndianRupee} label="Today's Revenue"
          value={stats?fmtK(stats.todayRevenue):'—'}
          sub={stats?`${stats.completed} completed`:'…'}
          color={C.green} bg={C.greenPale} border={C.greenBorder}
          onClick={()=>navigate('/admin/payments')} loading={!stats}/>
        <KpiCard icon={TrendingUp}  label="Monthly Revenue"
          value={monthRevenue!=null?fmtK(monthRevenue):'—'}
          sub="vs last month" growth={revenueGrowth}
          color={C.blue} bg={C.bluePale} border={C.blueBorder}
          onClick={()=>navigate('/admin/analytics')} loading={extraLoad}/>
        <KpiCard icon={Users}       label="Total Customers"
          value={totalCustomers!=null?fmt(totalCustomers):'—'}
          sub={overview?.customers?.new?`+${overview.customers.new} this month`:'Registered'}
          growth={overview?.customers?.growth}
          onClick={()=>navigate('/admin/customers')} loading={extraLoad}/>
        <KpiCard icon={UserCheck}   label="Active Staff"
          value={String(floorCounts.available+floorCounts.busy)}
          sub={`${floorCounts.busy} with clients`}
          color={C.purple} bg={C.purplePale} border={C.purpleBorder}
          onClick={()=>navigate('/admin/staff')}/>
        <KpiCard icon={Percent}     label="Conversion Rate"
          value={convRate!=null?`${convRate}%`:'—'}
          sub="bookings → completed"
          color={C.teal} bg={C.tealPale} border={C.tealBorder}
          onClick={()=>navigate('/admin/analytics')} loading={extraLoad}/>
        {/* Cash Counter Card */}
        <motion.div variants={fade} whileHover={{ y:-4, boxShadow:`0 20px 48px ${C.green}22` }}
          onClick={()=>setCashModal(true)}
          style={{ background:C.cardBg, border:`1px solid ${C.greenBorder}`, borderRadius:20,
            padding:'20px 20px 16px', cursor:'pointer', boxShadow:`0 2px 16px ${C.green}0A`, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80,
            borderRadius:'50%', background:`${C.green}12`, pointerEvents:'none' }}/>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
            <div style={{ width:42, height:42, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center',
              background:C.greenPale, border:`1px solid ${C.greenBorder}` }}>
              <Wallet size={19} color={C.green}/>
            </div>
            <span style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:100,
              fontSize:10, fontWeight:700, background:C.greenPale, color:C.green, border:`1px solid ${C.greenBorder}` }}>
              <Pulse color={C.green} size={5}/> LIVE
            </span>
          </div>
          <div style={{ fontSize:30, fontWeight:800, color:C.ink, lineHeight:1, fontFamily:'Playfair Display,serif', marginBottom:4 }}>
            {extraLoad ? <span style={{ color:C.inkGhost }}>—</span> : fmtK(cashData?.counterBal || 0)}
          </div>
          <div style={{ fontSize:12, fontWeight:700, color:C.inkMid, marginBottom:5 }}>Cash Counter Balance</div>
          <div style={{ fontSize:11, color:C.inkLight }}>+{fmtRs(cashData?.todayCash||0)} today</div>
          <div style={{ marginTop:14, height:2, borderRadius:2, background:`linear-gradient(to right, ${C.green}, transparent)` }}/>
        </motion.div>
      </motion.div>

      {/* ══ CHART + STAFF FLOOR ═══════════════════════════════════════════ */}
      <motion.div variants={fade}
        style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:15, marginBottom:20 }} className="glm-dash-split">

        {/* Revenue chart */}
        <div style={{ background:C.cardBg, border:`1px solid ${C.border}`,
          borderRadius:22, overflow:'hidden' }}>
          <SectionHead title="Revenue Trend" icon={BarChart3} live
            action={
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                {[['last7','7D'],['last30','30D'],['thisMonth','MTD']].map(([p,l]) => (
                  <button key={p} onClick={()=>setChartPeriod(p)}
                    style={{ padding:'5px 11px', borderRadius:10, fontSize:11, fontWeight:700,
                      cursor:'pointer', border:`1px solid ${C.border}`,
                      background:chartPeriod===p?C.ink:'transparent',
                      color:chartPeriod===p?'#fff':C.inkMid }}>
                    {l}
                  </button>
                ))}
                <button onClick={exportRevenue}
                  style={{ padding:'5px 10px', borderRadius:10, border:`1px solid ${C.border}`,
                    background:'transparent', cursor:'pointer', display:'flex', alignItems:'center',
                    gap:4, fontSize:11, fontWeight:600, color:C.inkMid }}>
                  <Download size={11}/> CSV
                </button>
              </div>
            }/>
          <div style={{ padding:'18px 20px 14px' }}>
            <div style={{ display:'flex', gap:24, marginBottom:14 }}>
              <div>
                <div style={{ fontSize:10, color:C.inkLight, textTransform:'uppercase',
                  letterSpacing:'0.08em', fontWeight:600, marginBottom:2 }}>Period Total</div>
                <div style={{ fontSize:22, fontWeight:800, color:C.ink,
                  fontFamily:'Playfair Display,serif' }}>
                  {fmtK(chartData.reduce((a,d)=>a+(d.revenue||0),0))}
                </div>
              </div>
              <div>
                <div style={{ fontSize:10, color:C.inkLight, textTransform:'uppercase',
                  letterSpacing:'0.08em', fontWeight:600, marginBottom:2 }}>Daily Avg</div>
                <div style={{ fontSize:22, fontWeight:800, color:C.ink,
                  fontFamily:'Playfair Display,serif' }}>
                  {fmtK(Math.round(chartData.reduce((a,d)=>a+(d.revenue||0),0)/(chartData.length||1)))}
                </div>
              </div>
              {revenueGrowth!=null && (
                <div style={{ marginLeft:'auto', display:'flex', alignItems:'flex-end', paddingBottom:2 }}>
                  <GrowthBadge value={revenueGrowth}/>
                </div>
              )}
            </div>
            {chartLoad ? (
              <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Loader2 size={22} color={C.gold} style={{ animation:'spin 0.8s linear infinite' }}/>
              </div>
            ) : chartData.length===0 ? (
              <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center',
                color:C.inkLight, fontSize:13 }}>No data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <ComposedChart data={chartData} margin={{top:4,right:4,left:0,bottom:0}}>
                  <defs>
                    <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.gold} stopOpacity={0.28}/>
                      <stop offset="100%" stopColor={C.gold} stopOpacity={0.02}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                  <XAxis dataKey="day" tick={{fontSize:10,fill:C.inkGhost}} axisLine={false} tickLine={false}/>
                  <YAxis hide/>
                  <Tooltip content={<RevTooltip/>}/>
                  <Bar dataKey="bookings" fill={`${C.gold}25`} radius={[3,3,0,0]} yAxisId={1}/>
                  <YAxis yAxisId={1} hide/>
                  <Area dataKey="revenue" fill="url(#rg)" stroke={C.gold} strokeWidth={2.5}
                    dot={false} activeDot={{r:5,fill:C.gold}}/>
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Staff floor */}
        <div style={{ background:C.cardBg, border:`1px solid ${C.border}`, borderRadius:22, overflow:'hidden' }}>
          <SectionHead title="Staff Floor" icon={Activity} live
            action={
              <button onClick={()=>navigate('/admin/staff')}
                style={{ fontSize:12, fontWeight:700, color:C.gold, background:'none',
                  border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:3 }}>
                Manage <ChevronRight size={13}/>
              </button>
            }/>
          <div style={{ padding:'12px 13px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7, marginBottom:12 }}>
              {Object.entries(FS).filter(([k])=>k!=='absent').map(([k,cfg]) => (
                <div key={k} style={{ display:'flex', alignItems:'center', gap:8,
                  padding:'9px 11px', borderRadius:12,
                  background:cfg.bg, border:`1px solid ${cfg.border}` }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:cfg.dot, flexShrink:0,
                    animation:k==='available'?'pulseDot 2s infinite':'none' }}/>
                  <div>
                    <div style={{ fontSize:18, fontWeight:800, color:C.ink, lineHeight:1 }}>{floorCounts[k]||0}</div>
                    <div style={{ fontSize:9, fontWeight:700, color:cfg.text,
                      textTransform:'uppercase', letterSpacing:'0.06em' }}>{cfg.label}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {(liveStatus||[]).slice(0,7).map(s => {
                const ls=s.liveStatus||'off-duty';
                const cfg=FS[ls]||FS['off-duty'];
                return (
                  <div key={s._id} onClick={()=>navigate('/admin/staff')}
                    style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 10px',
                      borderRadius:11, background:cfg.bg, border:`1px solid ${cfg.border}`,
                      cursor:'pointer', transition:'opacity 0.15s' }}
                    onMouseEnter={e=>e.currentTarget.style.opacity='0.8'}
                    onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                    <div style={{ position:'relative', flexShrink:0 }}>
                      <div style={{ width:30, height:30, borderRadius:10, background:avCol(s.name),
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:11, fontWeight:700, color:'#fff' }}>
                        {initials(s.name)}
                      </div>
                      <span style={{ position:'absolute', bottom:-1, right:-1, width:9, height:9,
                        borderRadius:'50%', background:cfg.dot, border:'1.5px solid #fff' }}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:C.ink,
                        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize:10, color:cfg.text, fontWeight:600 }}>
                        {cfg.label}{ls==='busy'&&s.currentBooking?.service?` · ${s.currentBooking.service}`:''}
                      </div>
                    </div>
                    {s.phone && (
                      <button onClick={e=>{ e.stopPropagation();
                        window.open(`https://wa.me/91${s.phone.replace(/\D/g,'')}`, '_blank'); }}
                        style={{ width:26, height:26, borderRadius:8, border:`1px solid ${C.wa}30`,
                          background:`${C.wa}15`, cursor:'pointer', display:'flex',
                          alignItems:'center', justifyContent:'center' }}>
                        <MessageCircle size={12} color={C.wa}/>
                      </button>
                    )}
                  </div>
                );
              })}
              {!(liveStatus?.length) && (
                <div style={{ padding:16, textAlign:'center', color:C.inkLight, fontSize:12 }}>
                  No staff data yet
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ══ QUICK ACTIONS ════════════════════════════════════════════════ */}
      <motion.div variants={fade} style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
          <span style={{ fontSize:10, fontWeight:800, letterSpacing:'0.18em',
            textTransform:'uppercase', color:C.inkLight }}>Quick Actions</span>
          <div style={{ flex:1, height:1, background:C.border }}/>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))', gap:11 }}>
          {[
            { label:'New Booking',  sub:'Schedule now',     icon:Plus,      path:'/admin/appointments', s:'gold' },
            { label:'Add Customer', sub:'Register client',  icon:UserPlus,  path:'/admin/customers',   s:'dark' },
            { label:'Add Service',  sub:'Create listing',   icon:Scissors,  path:'/admin/services',    s:'gold' },
            { label:'Coupons',      sub:'Deals & offers',   icon:Gift,      path:'/admin/coupons',     s:'dark' },
            { label:'Analytics',    sub:'Full reports',     icon:BarChart3, path:'/admin/analytics',   s:'blue' },
            { label:'Inventory',    sub:'Stock management', icon:Package,   path:'/admin/inventory',   s:'dark' },
          ].map(a => {
            const Icon = a.icon;
            const bg = a.s==='gold'
              ? `linear-gradient(140deg,${C.gold},${C.goldLight})`
              : a.s==='blue'
              ? `linear-gradient(140deg,${C.blue},#3B82F6)`
              : `linear-gradient(140deg,${C.ink},#2D2510)`;
            return (
              <motion.button key={a.label}
                whileHover={{ y:-3, boxShadow:`0 14px 32px ${C.gold}2A` }}
                whileTap={{ scale:0.97 }}
                onClick={()=>navigate(a.path)}
                style={{ position:'relative', overflow:'hidden', borderRadius:18, padding:17,
                  textAlign:'left', border:'none', cursor:'pointer',
                  display:'flex', flexDirection:'column', gap:9, background:bg }}>
                <div style={{ position:'absolute', bottom:-8, right:-8, width:55, height:55,
                  borderRadius:'50%', background:'rgba(255,255,255,0.08)' }}/>
                <div style={{ width:35, height:35, borderRadius:11, display:'flex',
                  alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.15)' }}>
                  <Icon size={16} color='#fff'/>
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{a.label}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', marginTop:2 }}>{a.sub}</div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* ══ APPOINTMENTS + TOP SERVICES ══════════════════════════════════ */}
      <motion.div variants={fade}
        style={{ display:'grid', gridTemplateColumns:'1fr 295px', gap:15, marginBottom:20 }} className="glm-dash-split">

        {/* Appointments table */}
        <div style={{ background:C.cardBg, border:`1px solid ${C.border}`, borderRadius:22, overflow:'hidden' }}>
          <SectionHead title="Today's Appointments" badge={todayB.length} live icon={Calendar}
            action={
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <button onClick={exportBookings}
                  style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 11px',
                    borderRadius:10, border:`1px solid ${C.border}`, background:'transparent',
                    cursor:'pointer', fontSize:11, fontWeight:600, color:C.inkMid }}>
                  <Download size={11}/> CSV
                </button>
                <button onClick={()=>navigate('/admin/appointments')}
                  style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 13px',
                    borderRadius:10, border:'none', background:C.ink,
                    color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  All <ChevronRight size={12}/>
                </button>
              </div>
            }/>
          {/* Filters */}
          <div style={{ display:'flex', gap:8, padding:'11px 16px',
            borderBottom:`1px solid ${C.border}`, flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, flex:1,
              background:C.pageBg, borderRadius:10, padding:'7px 11px', border:`1px solid ${C.border}` }}>
              <Search size={13} color={C.inkLight}/>
              <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
                placeholder="Search client or service…"
                style={{ border:'none', background:'transparent', fontSize:12, color:C.ink, outline:'none', flex:1 }}/>
            </div>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
              style={{ padding:'7px 11px', borderRadius:10, border:`1px solid ${C.border}`,
                background:C.pageBg, color:C.inkMid, fontSize:12, cursor:'pointer' }}>
              <option value='all'>All</option>
              {Object.entries(BS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          {filteredB.length===0 ? (
            <div style={{ padding:'44px 24px', textAlign:'center' }}>
              <div style={{ width:54, height:54, borderRadius:16, background:C.goldPale,
                border:`1px solid ${C.border}`, display:'flex', alignItems:'center',
                justifyContent:'center', margin:'0 auto 12px' }}>
                <Calendar size={22} color={C.gold}/>
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:C.ink, marginBottom:4 }}>No appointments found</div>
              <div style={{ fontSize:12, color:C.inkLight }}>
                {searchTerm||statusFilter!=='all'?'Try adjusting your filters':'Bookings will appear here'}
              </div>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:C.pageBg }}>
                    {['Client','Service','Stylist','Time','Amount','Status','WA'].map(h => (
                      <th key={h} style={{ padding:'10px 13px', textAlign:'left', fontSize:10,
                        fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em',
                        color:C.inkLight, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredB.slice(0,15).map(b => {
                    const st  = BS[b.status]||BS.confirmed;
                    const cn  = b.customer?.name||'Walk-in';
                    const ph  = b.customer?.phone;
                    return (
                      <tr key={b._id} style={{ borderTop:`1px solid ${C.border}`, cursor:'pointer', transition:'background 0.12s' }}
                        onMouseEnter={e=>e.currentTarget.style.background=C.pageBg}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                        onClick={()=>navigate('/admin/appointments')}>
                        <td style={{ padding:'11px 13px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:30, height:30, borderRadius:9, background:avCol(cn),
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize:10, fontWeight:700, color:'#fff', flexShrink:0 }}>
                              {initials(cn)}
                            </div>
                            <span style={{ fontSize:12, fontWeight:700, color:C.ink, whiteSpace:'nowrap' }}>{cn}</span>
                          </div>
                        </td>
                        <td style={{ padding:'11px 13px', fontSize:12, color:C.inkMid, whiteSpace:'nowrap' }}>
                          {b.service?.name||'—'}
                        </td>
                        <td style={{ padding:'11px 13px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <div style={{ width:22, height:22, borderRadius:'50%', background:C.goldPale,
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize:9, fontWeight:700, color:C.gold }}>
                              {(b.staff?.name||'A').charAt(0)}
                            </div>
                            <span style={{ fontSize:11, color:C.inkMid }}>{b.staff?.name||'Any'}</span>
                          </div>
                        </td>
                        <td style={{ padding:'11px 13px', fontSize:12, fontWeight:700, color:C.ink, whiteSpace:'nowrap' }}>
                          {b.timeSlot?.start||'—'}
                        </td>
                        <td style={{ padding:'11px 13px', fontSize:12, fontWeight:700, color:C.gold, whiteSpace:'nowrap' }}>
                          {fmtRs(b.finalAmount||b.totalAmount||0)}
                        </td>
                        <td style={{ padding:'11px 13px' }}>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:5,
                            padding:'4px 9px', borderRadius:100, fontSize:11, fontWeight:600,
                            background:st.bg, border:`1px solid ${st.border}`, color:st.text }}>
                            <span style={{ width:5, height:5, borderRadius:'50%', background:st.dot }}/>
                            {st.label}
                          </span>
                        </td>
                        <td style={{ padding:'11px 13px' }}>
                          {ph && (
                            <button onClick={e=>{ e.stopPropagation();
                              window.open(`https://wa.me/91${ph.replace(/\D/g,'')}`, '_blank'); }}
                              style={{ width:28, height:28, borderRadius:8, border:`1px solid ${C.wa}30`,
                                background:`${C.wa}15`, cursor:'pointer', display:'flex',
                                alignItems:'center', justifyContent:'center' }}>
                              <MessageCircle size={12} color={C.wa}/>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredB.length>15 && (
                <div style={{ padding:'11px 16px', borderTop:`1px solid ${C.border}`,
                  display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:11, color:C.inkLight }}>
                    Showing 15 of {filteredB.length}
                  </span>
                  <button onClick={()=>navigate('/admin/appointments')}
                    style={{ fontSize:12, fontWeight:700, color:C.gold, background:'none',
                      border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                    View all <ChevronRight size={12}/>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top Services */}
        <div style={{ background:C.cardBg, border:`1px solid ${C.border}`, borderRadius:22, overflow:'hidden' }}>
          <SectionHead title="Top Services" icon={Award}
            badge="This Month" badgeBg={C.bluePale} badgeColor={C.blue}
            action={
              <button onClick={()=>navigate('/admin/analytics')}
                style={{ fontSize:11, fontWeight:700, color:C.gold, background:'none',
                  border:'none', cursor:'pointer' }}>
                <ChevronRight size={13}/>
              </button>
            }/>
          <div style={{ padding:'13px 15px' }}>
            {extraLoad ? (
              <div style={{ padding:32, textAlign:'center' }}>
                <Loader2 size={18} color={C.gold} style={{ animation:'spin 0.8s linear infinite' }}/>
              </div>
            ) : topServices.length===0 ? (
              <div style={{ padding:'32px 16px', textAlign:'center', color:C.inkLight, fontSize:12 }}>
                No data yet
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {topServices.map((s,i) => {
                  const maxR = topServices[0]?.revenue||1;
                  const pct  = Math.round((s.revenue/maxR)*100);
                  return (
                    <div key={s._id||i} style={{ padding:'10px 12px', borderRadius:14,
                      background:i===0?C.goldPale:'#F5EFE4',
                      border:`1px solid ${i===0?C.border:'#E8DFC8'}` }}>
                      <div style={{ display:'flex', justifyContent:'space-between',
                        alignItems:'flex-start', marginBottom:7 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:C.ink,
                            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                            {['🥇','🥈','🥉'][i]||`${i+1}.`} {s.name}
                          </div>
                          <div style={{ fontSize:10, color:C.inkLight, marginTop:1 }}>
                            {s.category||'—'} · {s.bookings} bookings
                          </div>
                        </div>
                        <div style={{ fontSize:13, fontWeight:800, color:C.gold, flexShrink:0, marginLeft:8 }}>
                          {fmtK(s.revenue)}
                        </div>
                      </div>
                      <div style={{ height:4, borderRadius:2, background:C.border }}>
                        <div style={{ height:'100%', width:`${pct}%`, borderRadius:2,
                          background:i===0?`linear-gradient(90deg,${C.gold},${C.goldLight})`:'#C9B07A',
                          transition:'width 0.8s ease' }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ══ STATUS SUMMARY ════════════════════════════════════════════════ */}
      <motion.div variants={fade}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(148px,1fr))', gap:10 }}>
          {[
            { label:'Confirmed',   v:todayB.filter(b=>b.status==='confirmed').length,    dot:'#F59E0B', bg:'#FFFBEB', border:'#FDE68A', color:'#92400E' },
            { label:'In Progress', v:todayB.filter(b=>b.status==='in-progress').length,  dot:'#10B981', bg:'#ECFDF5', border:'#A7F3D0', color:'#065F46' },
            { label:'Completed',   v:todayB.filter(b=>b.status==='completed').length,    dot:'#3B82F6', bg:'#EFF6FF', border:'#BFDBFE', color:'#1E40AF' },
            { label:'Cancelled',   v:todayB.filter(b=>b.status==='cancelled').length,    dot:'#EF4444', bg:'#FEF2F2', border:'#FECACA', color:'#991B1B' },
            { label:'Pending Pay', v:todayB.filter(b=>b.status==='pending').length,      dot:'#F97316', bg:'#FFF7ED', border:'#FDBA74', color:'#C2410C' },
            { label:'No Show',     v:todayB.filter(b=>b.status==='no-show').length,      dot:'#9CA3AF', bg:'#F9FAFB', border:'#E5E7EB', color:'#374151' },
          ].map(({ label,v,dot,bg,border,color }) => (
            <div key={label} style={{ padding:'13px 15px', borderRadius:14,
              background:bg, border:`1px solid ${border}`,
              display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:dot, flexShrink:0 }}/>
              <div>
                <div style={{ fontSize:22, fontWeight:800, color:C.ink, lineHeight:1 }}>{v}</div>
                <div style={{ fontSize:10, fontWeight:700, color, textTransform:'uppercase',
                  letterSpacing:'0.07em', marginTop:2 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ══ MONTHLY ATTENDANCE OVERVIEW ════════════════════════════════ */}
      <motion.div variants={fade} style={{ marginTop:20 }}>
        <div style={{ background:C.cardBg, border:`1px solid ${C.border}`, borderRadius:22, overflow:'hidden' }}>
          <SectionHead title="This Month's Attendance" icon={UserCheck} live
            action={
              <button onClick={()=>navigate('/admin/attendance')}
                style={{ fontSize:12, fontWeight:700, color:C.gold, background:'none',
                  border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:3 }}>
                Full View <ChevronRight size={13}/>
              </button>
            }/>
          <div style={{ padding:'14px 16px' }}>
            {attendanceLoad ? (
              <div style={{ padding:24, textAlign:'center' }}>
                <Loader2 size={18} color={C.gold} style={{ animation:'spin 0.8s linear infinite' }}/>
              </div>
            ) : attendanceSummary.length === 0 ? (
              <div style={{ padding:'24px 16px', textAlign:'center', color:C.inkLight, fontSize:12 }}>
                No attendance data for this month
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {attendanceSummary.map((s, i) => {
                  const total = s.present + s.late + s.absent + s.halfDay + s.leave;
                  const present = s.present + s.late;
                  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
                  const color = pct >= 80 ? C.green : pct >= 60 ? '#B45309' : C.red;
                  const bg    = pct >= 80 ? C.greenPale : pct >= 60 ? C.amberPale : C.redPale;
                  const bdr   = pct >= 80 ? C.greenBorder : pct >= 60 ? C.amberBorder : C.redBorder;
                  return (
                    <div key={i} onClick={()=>navigate('/admin/attendance')}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
                        borderRadius:14, background:bg, border:`1px solid ${bdr}`,
                        cursor:'pointer', transition:'opacity 0.15s' }}
                      onMouseEnter={e=>e.currentTarget.style.opacity='0.8'}
                      onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                      {/* Avatar */}
                      <div style={{ width:36, height:36, borderRadius:12, flexShrink:0,
                        background:avCol(s.staff?.name||''), display:'flex', alignItems:'center',
                        justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff' }}>
                        {initials(s.staff?.name||'?')}
                      </div>
                      {/* Name */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:C.ink,
                          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {s.staff?.name}
                        </div>
                        <div style={{ display:'flex', gap:8, marginTop:3, flexWrap:'wrap' }}>
                          {[
                            { l:`${present}P`, c:C.green },
                            s.absent > 0  && { l:`${s.absent}A`,   c:C.red },
                            s.halfDay > 0 && { l:`${s.halfDay}H`,  c:C.blue },
                            s.leave > 0   && { l:`${s.leave}L`,    c:'#6D28D9' },
                            s.late > 0    && { l:`${s.late}Late`,  c:'#92400E' },
                          ].filter(Boolean).map(({ l, c }) => (
                            <span key={l} style={{ fontSize:10, fontWeight:700, color:c }}>{l}</span>
                          ))}
                        </div>
                      </div>
                      {/* Progress bar + % */}
                      <div style={{ minWidth:80 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                          <span style={{ fontSize:10, color:C.inkLight }}>{present}/{total} days</span>
                          <span style={{ fontSize:12, fontWeight:800, color, fontFamily:'Playfair Display,serif' }}>{pct}%</span>
                        </div>
                        <div style={{ height:5, borderRadius:3, background:'rgba(0,0,0,0.08)', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, borderRadius:3,
                            background:`linear-gradient(90deg,${color},${pct>=80?'#34D399':pct>=60?'#FCD34D':'#FCA5A5'})`,
                            transition:'width 0.8s ease' }}/>
                        </div>
                        {(s.totalDeductions||0) > 0 && (
                          <div style={{ fontSize:9, fontWeight:700, color:C.red, marginTop:3, textAlign:'right' }}>
                            −{fmtRs(s.totalDeductions)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <style>{`
        @keyframes spin     { to { transform: rotate(360deg) } }
        @keyframes pulseDot { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:0.4; transform:scale(0.85) } }
      `}</style>
    </motion.div>
  );
}