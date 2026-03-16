import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Users, Scissors, BarChart2,
  ArrowUpRight, ArrowDownRight, Calendar, RefreshCw,
  Loader2, Download, Printer, FileText, ChevronDown,
  Zap, Target, Clock, CheckCircle2, XCircle,
  Star, Award, Activity,
} from 'lucide-react';
import api from '@/services/api';

/* ═══════════════════════════════════════════════════════
   TOKENS — midnight emerald / warm cream
   ═══════════════════════════════════════════════════════ */
const C = {
  bg:        '#F5F0E8',
  card:      '#FDFAF4',
  ink:       '#18120A',
  inkMid:    '#4A3820',
  inkLight:  '#8A7250',
  inkGhost:  '#BCA880',
  border:    '#DDD0B0',
  borderMid: '#C8B888',
  gold:      '#C49A28',
  goldLight: '#E0B840',
  goldPale:  '#FFF8E0',
  goldDeep:  '#8B6914',
  heroBg:    '#0A0F0C',
  heroBg2:   '#0F1A12',
  heroBg3:   '#142218',
  green:     '#065F46',
  greenMid:  '#059669',
  greenPale: '#D1FAE5',
  greenBdr:  '#6EE7B7',
  red:       '#991B1B',
  redPale:   '#FEF2F2',
  redBdr:    '#FECACA',
  amber:     '#92400E',
  amberPale: '#FFFBEB',
  amberBdr:  '#FDE68A',
  blue:      '#1E3A8A',
  bluePale:  '#EFF6FF',
  blueBdr:   '#BFDBFE',
  teal:      '#134E4A',
  tealPale:  '#F0FDFA',
  tealBdr:   '#99F6E4',
};

const ease = [0.22,0.61,0.36,1];
const fd   = { hidden:{opacity:0,y:14}, show:{opacity:1,y:0,transition:{duration:0.32,ease}} };
const stag = (d=0.04) => ({hidden:{},show:{transition:{staggerChildren:d}}});

const Rs    = n => Number(n||0).toLocaleString('en-IN');
const fmtRs = n => `₹${Rs(n)}`;
const fmtK  = n => { if(!n) return '₹0'; if(n>=1e7) return `₹${(n/1e7).toFixed(2)}Cr`; if(n>=1e5) return `₹${(n/1e5).toFixed(1)}L`; if(n>=1e3) return `₹${(n/1e3).toFixed(1)}K`; return fmtRs(n); };

const PERIODS = [
  {key:'today',      label:'Today'},
  {key:'yesterday',  label:'Yesterday'},
  {key:'last7',      label:'Last 7 Days'},
  {key:'thisWeek',   label:'This Week'},
  {key:'lastWeek',   label:'Last Week'},
  {key:'thisMonth',  label:'This Month'},
  {key:'lastMonth',  label:'Last Month'},
  {key:'last30',     label:'Last 30 Days'},
  {key:'thisYear',   label:'This Year'},
];

const METHOD_META = {
  cash:     {label:'Cash',   color:C.green,  icon:'💵'},
  upi:      {label:'UPI',    color:'#6D28D9',icon:'📱'},
  card:     {label:'Card',   color:C.blue,   icon:'💳'},
  online:   {label:'Online', color:C.teal,   icon:'🌐'},
  razorpay: {label:'Online', color:C.teal,   icon:'🌐'},
  other:    {label:'Other',  color:C.inkLight,icon:'💰'},
};

const STATUS_META = {
  completed:  {label:'Completed',  color:C.green,    pale:C.greenPale},
  confirmed:  {label:'Confirmed',  color:C.blue,     pale:C.bluePale},
  'in-progress':{label:'In Progress',color:'#0F766E',pale:C.tealPale},
  pending:    {label:'Pending',    color:C.amber,    pale:C.amberPale},
  cancelled:  {label:'Cancelled',  color:C.red,      pale:C.redPale},
  'no-show':  {label:'No Show',    color:C.inkGhost, pale:C.bg},
};

const initials = n => (n||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
const AV_COLS  = ['#C49A28','#8B6914','#065F46','#059669','#1E3A8A','#6D28D9','#134E4A'];
const avCol    = n => AV_COLS[(n||'?').charCodeAt(0)%AV_COLS.length];

/* ── Export ─────────────────────────────────────────── */
function exportCSV(data, period) {
  const sections = [];
  // Overview
  sections.push(['=== OVERVIEW ===','',''],
    ['Metric','Current','Growth %'],
    ['Revenue', fmtRs(data.overview?.revenue?.current||0), `${data.overview?.revenue?.growth||0}%`],
    ['Bookings', data.overview?.bookings?.current||0, `${data.overview?.bookings?.growth||0}%`],
    ['New Customers', data.overview?.customers?.new||0, `${data.overview?.customers?.growth||0}%`],
    ['Completed', data.overview?.bookings?.completed||0,''],
    ['Cancelled', data.overview?.bookings?.cancelled||0,''],
    [''],
  );
  // Revenue chart
  if (data.chart?.length) {
    sections.push(['=== REVENUE CHART ===','',''],['Date','Revenue','Bookings'],...data.chart.map(d=>[d.date||d.label,d.revenue||0,d.count||0]),['']);
  }
  // Top services
  if (data.services?.length) {
    sections.push(['=== TOP SERVICES ===','',''],['Service','Category','Bookings','Revenue'],...data.services.map(s=>[s.name,s.category||'',s.bookings,fmtRs(s.revenue)]),['']);
  }
  // Staff
  if (data.staff?.length) {
    sections.push(['=== STAFF PERFORMANCE ===','',''],['Staff','Bookings','Revenue'],...data.staff.map(s=>[s.name,s.bookings,fmtRs(s.revenue)]),['']);
  }
  // Payment methods
  if (data.methods?.length) {
    sections.push(['=== PAYMENT METHODS ===','',''],['Method','Total','Count'],...data.methods.map(m=>[(METHOD_META[m._id]||{label:m._id}).label,fmtRs(m.total),m.count]),['']);
  }
  const cell = v => `"${String(v).replace(/"/g,'""')}"`;
  const csv  = sections.map(r=>r.map(cell).join(',')).join('\n');
  const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'})),download:`analytics_${period}_${new Date().toISOString().split('T')[0]}.csv`});
  a.click(); URL.revokeObjectURL(a.href);
}

function printReport(data, period) {
  const pLabel = PERIODS.find(p=>p.key===period)?.label||period;
  const now    = new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});
  const ov     = data.overview||{};
  const revG   = ov.revenue?.growth||0;
  const bkG    = ov.bookings?.growth||0;

  const barChart = (data.chart||[]).slice(-14).map((d,i,arr)=>{
    const max = Math.max(...arr.map(x=>x.revenue||0),1);
    const pct  = Math.round((d.revenue||0)/max*100);
    return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:0;gap:4px">
      <div style="font-size:8px;font-weight:700;color:#C49A28">${(d.revenue||0)>0?`₹${Math.round((d.revenue||0)/1000)}k`:''}</div>
      <div style="width:100%;background:#F8F3EA;border-radius:4px 4px 0 0;height:80px;display:flex;align-items:flex-end">
        <div style="width:100%;background:linear-gradient(to top,#8B6914,#E0B840);border-radius:4px 4px 0 0;height:${Math.max(pct,2)}%"></div>
      </div>
      <div style="font-size:8px;color:#8A7250;text-align:center;white-space:nowrap;overflow:hidden;width:100%;text-overflow:ellipsis">${d.label||d.date||''}</div>
    </div>`;
  }).join('');

  const services = (data.services||[]).slice(0,8).map((s,i)=>`
    <tr><td style="font-weight:700">${i+1}. ${s.name}</td><td>${s.category||'—'}</td>
    <td style="text-align:center">${s.bookings}</td><td style="text-align:right;font-weight:800;color:#C49A28">₹${Rs(s.revenue)}</td></tr>`).join('');

  const staff = (data.staff||[]).slice(0,8).map((s,i)=>`
    <tr><td style="font-weight:700">${i+1}. ${s.name}</td><td style="text-align:center">${s.bookings}</td>
    <td style="text-align:right;font-weight:800;color:#065F46">₹${Rs(s.revenue)}</td></tr>`).join('');

  const methods = (data.methods||[]).map(m=>{
    const meta = METHOD_META[m._id]||{label:m._id,icon:'💰'};
    const pct  = data.overview?.revenue?.current>0?Math.round(m.total/data.overview.revenue.current*100):0;
    return `<div style="display:flex;align-items:center;gap:10;padding:8px 0;border-bottom:1px solid #EDE0C0">
      <span style="font-size:18px">${meta.icon}</span>
      <span style="flex:1;font-weight:700;font-size:13px">${meta.label}</span>
      <span style="font-size:11px;color:#8A7250">${m.count} txns · ${pct}%</span>
      <span style="font-weight:800;color:${meta.color};font-size:14px;margin-left:12px">₹${Rs(m.total)}</span>
    </div>`;
  }).join('');

  const w = window.open('','_blank','width=960,height=800');
  w.document.write(`<!DOCTYPE html><html><head><title>Analytics Report — Glamour Salon</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#F5F0E8;padding:28px;color:#18120A;font-size:13px}
    .page{max-width:860px;margin:0 auto}
    .hdr{background:linear-gradient(135deg,#0A0F0C,#142218);border-radius:18px;padding:28px 32px;margin-bottom:20px;color:#fff}
    .logo{font-family:'Playfair Display',serif;font-size:22px;color:#E0B840;margin-bottom:4px}
    .hdr-sub{font-size:11px;color:rgba(255,255,255,.35);letter-spacing:.1em;text-transform:uppercase}
    .hdr h1{font-family:'Playfair Display',serif;font-size:30px;font-weight:800;color:#FAF3E0;margin:10px 0 4px;line-height:1.1}
    .hdr p{font-size:12px;color:rgba(255,255,255,.4)}
    .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
    .stat{background:#fff;border:1px solid #DDD0B0;border-radius:14px;padding:16px 18px}
    .stat-lbl{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:#8A7250;margin-bottom:5px}
    .stat-val{font-family:'Playfair Display',serif;font-size:26px;font-weight:800;color:#18120A;line-height:1}
    .stat-delta{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:800;padding:2px 7px;border-radius:100px;margin-top:5px}
    .section{background:#fff;border:1px solid #DDD0B0;border-radius:14px;padding:20px;margin-bottom:16px}
    .section-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.18em;color:#8A7250;margin-bottom:14px;display:flex;align-items:center;gap:8px}
    table{width:100%;border-collapse:collapse}th{background:#F5F0E8;padding:9px 12px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#8A7250}
    td{padding:9px 12px;border-bottom:1px solid #EDE0C0;font-size:12px}tr:last-child td{border-bottom:none}
    .chart-wrap{display:flex;gap:4px;align-items:flex-end;padding:8px 0}
    .ftr{text-align:center;font-size:10px;color:#8A7250;margin-top:18px}
    .btn{display:block;margin:16px auto 0;padding:10px 28px;background:linear-gradient(135deg,#8B6914,#E0B840);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;font-family:'DM Sans',sans-serif}
    @media print{.btn{display:none}body{background:#fff;padding:16px}}
  </style></head><body><div class="page">
  <div class="hdr">
    <div class="logo">✂ Glamour Salon</div>
    <div class="hdr-sub">Analytics Report · ${pLabel}</div>
    <h1>Business Analytics</h1>
    <p>Generated on ${now}</p>
  </div>

  <div class="stats">
    <div class="stat"><div class="stat-lbl">Revenue</div><div class="stat-val" style="color:#C49A28">${fmtK(ov.revenue?.current)}</div>
      <div class="stat-delta" style="background:${revG>=0?'#DCFCE7':'#FEF2F2'};color:${revG>=0?'#166534':'#991B1B'}">${revG>=0?'▲':'▼'} ${Math.abs(revG)}%</div></div>
    <div class="stat"><div class="stat-lbl">Bookings</div><div class="stat-val">${ov.bookings?.current||0}</div>
      <div class="stat-delta" style="background:${bkG>=0?'#DCFCE7':'#FEF2F2'};color:${bkG>=0?'#166534':'#991B1B'}">${bkG>=0?'▲':'▼'} ${Math.abs(bkG)}%</div></div>
    <div class="stat"><div class="stat-lbl">Completed</div><div class="stat-val" style="color:#065F46">${ov.bookings?.completed||0}</div></div>
    <div class="stat"><div class="stat-lbl">New Customers</div><div class="stat-val" style="color:#1E3A8A">${ov.customers?.new||0}</div></div>
  </div>

  ${barChart?`<div class="section"><div class="section-title">📈 Revenue Trend</div><div class="chart-wrap">${barChart}</div></div>`:''}

  ${services?`<div class="section"><div class="section-title">✂ Top Services</div><table><thead><tr><th>Service</th><th>Category</th><th style="text-align:center">Bookings</th><th style="text-align:right">Revenue</th></tr></thead><tbody>${services}</tbody></table></div>`:''}

  ${staff?`<div class="section"><div class="section-title">👤 Staff Performance</div><table><thead><tr><th>Staff</th><th style="text-align:center">Bookings</th><th style="text-align:right">Revenue</th></tr></thead><tbody>${staff}</tbody></table></div>`:''}

  ${methods?`<div class="section"><div class="section-title">💳 Payment Methods</div>${methods}</div>`:''}

  <p class="ftr">Glamour Salon · Analytics Report · ${pLabel} · Confidential</p>
  <button class="btn" onclick="window.print()">🖨 Print Report</button>
  </div></body></html>`);
  w.document.close();
}

/* ── Shared atoms ────────────────────────────────────── */
function DeltaBadge({val}) {
  if (val===undefined||val===null) return null;
  const pos = val >= 0;
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:3,padding:'3px 8px',borderRadius:100,fontSize:10,fontWeight:800,background:pos?C.greenPale:C.redPale,color:pos?C.green:C.red}}>
      {pos?<ArrowUpRight size={10}/>:<ArrowDownRight size={10}/>}{Math.abs(val)}%
    </span>
  );
}

function StatCard({label,value,sub,growth,icon:Icon,color,bg,border}) {
  return (
    <motion.div variants={fd} whileHover={{y:-3,boxShadow:`0 14px 40px ${color}18`}}
      style={{borderRadius:20,padding:'20px 22px',background:bg,border:`1.5px solid ${border||color+'28'}`,transition:'all 0.18s'}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
        <div style={{width:44,height:44,borderRadius:14,background:`${color}18`,display:'flex',alignItems:'center',justifyContent:'center'}}><Icon size={18} style={{color}}/></div>
        <DeltaBadge val={growth}/>
      </div>
      <p style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.18em',color:`${color}99`,marginBottom:5}}>{label}</p>
      <p style={{fontSize:28,fontWeight:900,color,fontFamily:"'Playfair Display',serif",lineHeight:1}}>{value}</p>
      {sub && <p style={{fontSize:11,color:`${color}80`,marginTop:5,fontWeight:600}}>{sub}</p>}
    </motion.div>
  );
}

function ProgBar({val,max,color=C.gold,h=5}) {
  const w = max>0?Math.max(2,Math.min(100,Math.round(val/max*100))):0;
  return (
    <div style={{height:h,borderRadius:100,background:`${color}20`,overflow:'hidden'}}>
      <motion.div initial={{width:0}} animate={{width:`${w}%`}} transition={{duration:0.8,ease:'easeOut'}} style={{height:'100%',borderRadius:100,background:color}}/>
    </div>
  );
}

function Avatar({name,size=36}) {
  return (
    <div style={{width:size,height:size,borderRadius:size*0.3,flexShrink:0,background:`linear-gradient(135deg,${avCol(name)},${C.goldDeep})`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,color:'#fff',fontSize:size*0.36,fontFamily:"'DM Sans',sans-serif"}}>
      {initials(name)}
    </div>
  );
}

/* ── Revenue Chart ───────────────────────────────────── */
function RevenueChart({data=[]}) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d=>d.revenue||0),1);
  const W=100, H=70;
  const pts = data.map((d,i)=>`${(i/(data.length-1||1))*W},${H-(d.revenue||0)/max*(H-6)+3}`).join(' ');
  const id  = 'revGrad';

  return (
    <div style={{position:'relative'}}>
      <svg width="100%" height={H+30} viewBox={`0 0 ${W} ${H+30}`} preserveAspectRatio="none" style={{display:'block',overflow:'visible'}}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.greenMid} stopOpacity="0.25"/>
            <stop offset="100%" stopColor={C.greenMid} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <polyline points={`0,${H} ${pts} ${W},${H}`} fill={`url(#${id})`} stroke="none"/>
        <polyline points={pts} fill="none" stroke={C.greenMid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {data.map((d,i)=>{
          const x = (i/(data.length-1||1))*W;
          const y = H-(d.revenue||0)/max*(H-6)+3;
          if (!(d.revenue>0)) return null;
          return <circle key={i} cx={x} cy={y} r="2.5" fill={C.greenMid} stroke="#fff" strokeWidth="1.5"/>;
        })}
      </svg>
      {/* X-axis labels */}
      <div style={{display:'flex',justifyContent:'space-between',marginTop:-8,paddingTop:4}}>
        {data.filter((_,i)=>i===0||i===Math.floor(data.length/2)||i===data.length-1).map((d,i)=>(
          <span key={i} style={{fontSize:9,color:C.inkGhost,fontWeight:700}}>{d.label||d.date?.slice(5)||''}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Peak hours heatmap ──────────────────────────────── */
function PeakHours({data=[]}) {
  if (!data.length) return <p style={{fontSize:12,color:C.inkGhost,textAlign:'center',padding:'24px 0'}}>No booking data</p>;
  const max = Math.max(...data.map(d=>d.count),1);
  const allHours = Array.from({length:24},(_,h)=>{
    const found = data.find(d=>d.hour===h);
    return {hour:h,count:found?.count||0};
  });
  return (
    <div className="glm-anl-12" style={{display:'grid',gridTemplateColumns:'repeat(12,1fr)',gap:3}}>
      {allHours.map(({hour,count})=>{
        const intensity = count/max;
        const bg = count===0?`${C.inkGhost}18`:`rgba(5,150,105,${0.12+intensity*0.75})`;
        const color = count===0?C.inkGhost:intensity>0.5?'#fff':C.green;
        return (
          <div key={hour} title={`${hour}:00 — ${count} bookings`}
            style={{aspectRatio:'1',borderRadius:6,background:bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'default',transition:'transform 0.1s'}}
            onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'}
            onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
            <span style={{fontSize:9,fontWeight:800,color}}>{hour}h</span>
            {count>0&&<span style={{fontSize:8,fontWeight:700,color:intensity>0.5?'rgba(255,255,255,.7)':C.greenMid}}>{count}</span>}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════ */
export default function AdminAnalytics() {
  const [period,   setPeriod]   = useState('thisMonth');
  const [data,     setData]     = useState({});
  const [loading,  setLoading]  = useState(true);
  const [exMenu,   setExMenu]   = useState(false);
  const prevPeriod = useRef(null);

  const load = useCallback(async (p) => {
    setLoading(true);
    try {
      const [ovR, chartR, svcR, staffR, methodR, bkR] = await Promise.allSettled([
        api.get('/analytics/overview',         {params:{period:p}}),
        api.get('/analytics/revenue-chart',    {params:{period:p}}),
        api.get('/analytics/top-services',     {params:{period:p}}),
        api.get('/analytics/staff-performance',{params:{period:p}}),
        api.get('/analytics/payment-methods',  {params:{period:p}}),
        api.get('/analytics/booking-stats',    {params:{period:p}}),
      ]);
      setData({
        overview:  ovR.status==='fulfilled'    ? ovR.value.data.overview   : {},
        chart:     chartR.status==='fulfilled' ? chartR.value.data.chart   : [],
        services:  svcR.status==='fulfilled'   ? svcR.value.data.services  : [],
        staff:     staffR.status==='fulfilled' ? staffR.value.data.staff   : [],
        methods:   methodR.status==='fulfilled'? methodR.value.data.methods: [],
        bookingStats: bkR.status==='fulfilled' ? {
          statusBreakdown: bkR.value.data.statusBreakdown,
          typeBreakdown:   bkR.value.data.typeBreakdown,
          peakHours:       bkR.value.data.peakHours,
        } : {},
      });
    } catch {}
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{ if (prevPeriod.current!==period) { prevPeriod.current=period; load(period); } },[period,load]);
  useEffect(()=>{ load(period); },[]);

  const ov = data.overview||{};
  const totalRevenue = ov.revenue?.current||0;
  const pLabel = PERIODS.find(p=>p.key===period)?.label||period;

  /* Booking status totals */
  const statusMap = useMemo(()=>{
    const m={};
    (data.bookingStats?.statusBreakdown||[]).forEach(s=>m[s._id]=(s.count||0));
    return m;
  },[data.bookingStats]);

  const totalBookings = Object.values(statusMap).reduce((a,b)=>a+b,0);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <style>{`
        @media (max-width: 700px) {
          .glm-anl-2col { grid-template-columns: 1fr !important; }
          .glm-anl-12   { grid-template-columns: repeat(6, 1fr) !important; }
        }
        @media (max-width: 440px) {
          .glm-anl-12   { grid-template-columns: repeat(4, 1fr) !important; }
        }
      `}</style>
      <div style={{fontFamily:"'DM Sans',sans-serif",maxWidth:1200,margin:'0 auto',paddingBottom:60}}>

        {/* ── HERO ── */}
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.35,ease}}
          style={{borderRadius:26,overflow:'hidden',marginBottom:24,position:'relative',background:`linear-gradient(135deg,${C.heroBg},${C.heroBg2},${C.heroBg3})`,border:'1px solid rgba(5,150,105,.2)',boxShadow:'0 24px 80px rgba(0,0,0,.32)'}}>
          <div style={{position:'absolute',inset:0,backgroundImage:`repeating-linear-gradient(45deg,#059669 0,#059669 1px,transparent 0,transparent 50%)`,backgroundSize:'22px 22px',opacity:.04}}/>
          <div style={{position:'absolute',top:-100,right:-100,width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(5,150,105,.08),transparent 65%)'}}/>
          <div style={{position:'relative',padding:'30px 36px'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:20,marginBottom:22}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:10}}>
                  <Activity size={12} style={{color:C.greenMid}}/>
                  <span style={{fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.28em',color:C.greenMid}}>Business Analytics</span>
                </div>
                <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:36,fontWeight:900,color:'#F0FAF4',margin:0,lineHeight:1.05,letterSpacing:'-0.02em'}}>Analytics & Reports</h1>
                <p style={{fontSize:12,color:'rgba(255,255,255,.28)',marginTop:8}}>
                  {pLabel} · {ov.bookings?.current||0} bookings · {fmtK(totalRevenue)} revenue
                </p>
              </div>
              <div style={{display:'flex',gap:10,alignItems:'flex-start',flexWrap:'wrap'}}>
                {/* Period selector */}
                <div style={{position:'relative'}}>
                  <select value={period} onChange={e=>setPeriod(e.target.value)}
                    style={{appearance:'none',padding:'10px 36px 10px 16px',borderRadius:13,border:'1px solid rgba(255,255,255,.14)',background:'rgba(255,255,255,.08)',color:'rgba(255,255,255,.85)',fontSize:12,fontWeight:700,cursor:'pointer',backdropFilter:'blur(6px)',fontFamily:"'DM Sans',sans-serif",outline:'none'}}>
                    {PERIODS.map(({key,label})=><option key={key} value={key} style={{background:'#1A1208',color:'#FAF3E0'}}>{label}</option>)}
                  </select>
                  <Calendar size={12} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,.5)',pointerEvents:'none'}}/>
                </div>
                {/* Export */}
                <div style={{position:'relative'}}>
                  <button onClick={()=>setExMenu(v=>!v)}
                    style={{display:'flex',alignItems:'center',gap:7,padding:'10px 18px',borderRadius:13,border:'1px solid rgba(255,255,255,.14)',background:'rgba(255,255,255,.07)',color:'rgba(255,255,255,.75)',fontSize:12,fontWeight:700,cursor:'pointer',backdropFilter:'blur(6px)'}}>
                    <Download size={13}/> Export <ChevronDown size={11} style={{marginLeft:2,transition:'transform 0.2s',transform:exMenu?'rotate(180deg)':'none'}}/>
                  </button>
                  <AnimatePresence>
                    {exMenu && (
                      <motion.div initial={{opacity:0,y:-8,scale:0.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-6,scale:0.95}}
                        style={{position:'absolute',top:'calc(100% + 8px)',right:0,background:'#fff',border:`1px solid ${C.border}`,borderRadius:13,padding:6,boxShadow:'0 16px 40px rgba(0,0,0,.14)',zIndex:100,minWidth:188}}>
                        {[
                          {icon:Printer, label:'Print Report', action:()=>{printReport(data,period);setExMenu(false);}},
                          {icon:FileText,label:'Export CSV',   action:()=>{exportCSV(data,period);setExMenu(false);}},
                        ].map(({icon:Icon,label,action})=>(
                          <button key={label} onClick={action}
                            style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'10px 14px',borderRadius:9,border:'none',background:'transparent',cursor:'pointer',fontSize:13,fontWeight:600,color:C.inkMid,textAlign:'left'}}
                            onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                            <Icon size={14} style={{color:C.greenMid}}/>{label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button onClick={()=>load(period)} style={{width:40,height:40,borderRadius:12,border:'1px solid rgba(255,255,255,.14)',background:'rgba(255,255,255,.07)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <RefreshCw size={14} color="rgba(255,255,255,.55)" style={{animation:loading?'spin 0.8s linear infinite':'none'}}/>
                </button>
              </div>
            </div>

            {/* KPI strip */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10}}>
              {[
                {l:'Revenue',     v:fmtK(ov.revenue?.current),   c:'#86EFAC',bg:'rgba(52,211,153,.09)', g:ov.revenue?.growth},
                {l:'vs Last Period',v:fmtK(ov.revenue?.previous),c:'rgba(255,255,255,.5)',bg:'rgba(255,255,255,.05)',g:null},
                {l:'Bookings',    v:ov.bookings?.current||0,      c:'#93C5FD',bg:'rgba(96,165,250,.09)', g:ov.bookings?.growth},
                {l:'Completed',   v:ov.bookings?.completed||0,    c:'#86EFAC',bg:'rgba(52,211,153,.07)',g:null},
                {l:'Cancelled',   v:ov.bookings?.cancelled||0,    c:'#FCA5A5',bg:'rgba(248,113,113,.07)',g:null},
                {l:'New Customers',v:ov.customers?.new||0,        c:'#FCD34D',bg:'rgba(251,191,36,.09)', g:ov.customers?.growth},
              ].map(({l,v,c,bg,g})=>(
                <div key={l} style={{padding:'12px 14px',borderRadius:13,background:bg,backdropFilter:'blur(6px)',border:'1px solid rgba(255,255,255,.06)'}}>
                  <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.09em',color:'rgba(255,255,255,.28)',marginBottom:4}}>{l}</p>
                  <p style={{fontSize:20,fontWeight:900,color:c,fontFamily:"'Playfair Display',serif",lineHeight:1}}>{v}</p>
                  {g!==null&&g!==undefined&&<p style={{fontSize:10,fontWeight:700,color:g>=0?'#86EFAC':'#FCA5A5',marginTop:4}}>{g>=0?'▲':'▼'} {Math.abs(g)}%</p>}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {loading && (
          <div style={{display:'flex',justifyContent:'center',alignItems:'center',padding:'90px 0',gap:14}}>
            <div style={{width:52,height:52,borderRadius:16,background:`linear-gradient(135deg,${C.green},${C.greenMid})`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 12px 36px ${C.greenMid}30`}}>
              <Loader2 size={22} color="#fff" style={{animation:'spin 1s linear infinite'}}/>
            </div>
            <p style={{fontSize:13,color:C.inkLight,fontWeight:600}}>Loading analytics…</p>
          </div>
        )}

        {!loading && (
          <motion.div variants={stag(0.06)} initial="hidden" animate="show" style={{display:'flex',flexDirection:'column',gap:18}}>

            {/* ── STAT CARDS ── */}
            <motion.div variants={stag(0.05)} initial="hidden" animate="show"
              style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14}}>
              <StatCard label="Total Revenue"   value={fmtK(ov.revenue?.current)}   sub={`vs ${fmtK(ov.revenue?.previous)} last period`} growth={ov.revenue?.growth}   icon={TrendingUp} color={C.greenMid} bg={C.greenPale} border={C.greenBdr}/>
              <StatCard label="Total Bookings"  value={ov.bookings?.current||0}      sub={`${ov.bookings?.completed||0} completed`}                                       icon={Calendar}   color={C.blue}    bg={C.bluePale}  border={C.blueBdr}/>
              <StatCard label="New Customers"   value={ov.customers?.new||0}          sub={`${ov.customers?.total||0} total in system`}  growth={ov.customers?.growth}    icon={Users}      color={C.gold}    bg={C.goldPale}  border={C.border}/>
              <StatCard label="Avg Revenue/Day" value={fmtK(Math.round((ov.revenue?.current||0)/Math.max((data.chart||[]).filter(d=>d.revenue>0).length,1)))} icon={Target} color='#6D28D9' bg='#F5F3FF' border='#DDD6FE'/>
            </motion.div>

            {/* ── REVENUE CHART ── */}
            {(data.chart||[]).length > 0 && (
              <motion.div variants={fd} style={{background:C.card,borderRadius:22,padding:'22px 24px',border:`1px solid ${C.border}`,boxShadow:`0 2px 16px ${C.greenMid}08`}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
                  <div>
                    <p style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.2em',color:C.inkGhost,marginBottom:4}}>Revenue Trend</p>
                    <p style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:800,color:C.ink}}>{pLabel}</p>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <p style={{fontSize:26,fontWeight:900,color:C.greenMid,fontFamily:"'Playfair Display',serif"}}>{fmtK(totalRevenue)}</p>
                    <DeltaBadge val={ov.revenue?.growth}/>
                  </div>
                </div>
                <RevenueChart data={data.chart}/>
                {/* Bar chart below line */}
                <div style={{display:'flex',gap:2,marginTop:12,height:32,alignItems:'flex-end'}}>
                  {(data.chart||[]).map((d,i)=>{
                    const max=Math.max(...(data.chart||[]).map(x=>x.revenue||0),1);
                    const h=Math.max(2,Math.round((d.revenue||0)/max*30));
                    return <div key={i} title={`${d.label}: ₹${Rs(d.revenue)}`} style={{flex:1,height:h,borderRadius:'3px 3px 0 0',background:d.revenue>0?`linear-gradient(to top,${C.goldDeep},${C.gold})`:`${C.inkGhost}18`,transition:'height 0.5s',cursor:'help'}}/>;
                  })}
                </div>
              </motion.div>
            )}

            {/* ── TWO-COL ROW: Services + Staff ── */}
            <div className="glm-anl-2col" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              {/* Top Services */}
              <motion.div variants={fd} style={{background:C.card,borderRadius:22,padding:'22px 24px',border:`1px solid ${C.border}`}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
                  <div>
                    <p style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.2em',color:C.inkGhost,marginBottom:3}}>Top Services</p>
                    <p style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:800,color:C.ink}}>By Revenue</p>
                  </div>
                  <Scissors size={18} style={{color:C.gold}}/>
                </div>
                {(data.services||[]).length===0
                  ? <p style={{fontSize:12,color:C.inkGhost,textAlign:'center',padding:'30px 0'}}>No service data</p>
                  : (data.services||[]).map((s,i)=>{
                    const maxRev = data.services[0]?.revenue||1;
                    return (
                      <div key={s._id||i} style={{marginBottom:i<(data.services||[]).length-1?14:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:5}}>
                          <div style={{width:22,height:22,borderRadius:7,background:i===0?C.goldPale:C.bg,border:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            <span style={{fontSize:10,fontWeight:900,color:i===0?C.gold:C.inkGhost}}>{i+1}</span>
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <p style={{fontSize:12,fontWeight:700,color:C.ink,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.name}</p>
                            <p style={{fontSize:10,color:C.inkGhost}}>{s.category||'—'} · {s.bookings} bookings</p>
                          </div>
                          <p style={{fontSize:14,fontWeight:900,color:i===0?C.gold:C.inkMid,fontFamily:"'Playfair Display',serif",flexShrink:0}}>{fmtK(s.revenue)}</p>
                        </div>
                        <ProgBar val={s.revenue} max={maxRev} color={i===0?C.gold:C.inkGhost} h={3}/>
                      </div>
                    );
                  })
                }
              </motion.div>

              {/* Staff Performance */}
              <motion.div variants={fd} style={{background:C.card,borderRadius:22,padding:'22px 24px',border:`1px solid ${C.border}`}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
                  <div>
                    <p style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.2em',color:C.inkGhost,marginBottom:3}}>Staff Performance</p>
                    <p style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:800,color:C.ink}}>Revenue Leaders</p>
                  </div>
                  <Award size={18} style={{color:C.greenMid}}/>
                </div>
                {(data.staff||[]).length===0
                  ? <p style={{fontSize:12,color:C.inkGhost,textAlign:'center',padding:'30px 0'}}>No staff data</p>
                  : (data.staff||[]).map((s,i)=>{
                    const maxRev = data.staff[0]?.revenue||1;
                    return (
                      <div key={s._id||i} style={{display:'flex',alignItems:'center',gap:12,marginBottom:i<(data.staff||[]).length-1?14:0}}>
                        <div style={{position:'relative'}}>
                          <Avatar name={s.name} size={36}/>
                          {i===0 && <span style={{position:'absolute',top:-4,right:-4,fontSize:12}}>👑</span>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{fontSize:12,fontWeight:700,color:C.ink}}>{s.name}</p>
                          <div style={{marginTop:3}}><ProgBar val={s.revenue} max={maxRev} color={i===0?C.greenMid:C.inkGhost} h={3}/></div>
                          <p style={{fontSize:10,color:C.inkGhost,marginTop:2}}>{s.bookings} services</p>
                        </div>
                        <p style={{fontSize:14,fontWeight:900,color:i===0?C.greenMid:C.inkMid,fontFamily:"'Playfair Display',serif",flexShrink:0}}>{fmtK(s.revenue)}</p>
                      </div>
                    );
                  })
                }
              </motion.div>
            </div>

            {/* ── TWO-COL ROW: Payment Methods + Booking Status ── */}
            <div className="glm-anl-2col" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              {/* Payment Methods */}
              <motion.div variants={fd} style={{background:C.card,borderRadius:22,padding:'22px 24px',border:`1px solid ${C.border}`}}>
                <p style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.2em',color:C.inkGhost,marginBottom:3}}>Payment Methods</p>
                <p style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:800,color:C.ink,marginBottom:18}}>Revenue Split</p>

                {/* Stacked bar */}
                {(data.methods||[]).length>0 && (
                  <div style={{height:10,borderRadius:100,overflow:'hidden',display:'flex',gap:2,marginBottom:18}}>
                    {(data.methods||[]).map((m,i)=>{
                      const meta=METHOD_META[m._id]||{color:C.inkGhost};
                      const pct=totalRevenue>0?Math.round(m.total/totalRevenue*100):0;
                      return <div key={i} style={{height:'100%',background:meta.color,width:`${pct}%`,transition:'width 0.7s'}} title={`${(METHOD_META[m._id]||{label:m._id}).label}: ${pct}%`}/>;
                    })}
                  </div>
                )}

                {(data.methods||[]).length===0
                  ? <p style={{fontSize:12,color:C.inkGhost,textAlign:'center',padding:'24px 0'}}>No payment data</p>
                  : (data.methods||[]).map((m,i)=>{
                    const meta=METHOD_META[m._id]||{label:m._id,color:C.inkGhost,icon:'💰'};
                    const pct=totalRevenue>0?Math.round(m.total/totalRevenue*100):0;
                    return (
                      <div key={m._id||i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                        <span style={{fontSize:18,flexShrink:0}}>{meta.icon}</span>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                            <span style={{fontSize:12,fontWeight:700,color:C.inkMid}}>{meta.label}</span>
                            <div style={{display:'flex',gap:8,alignItems:'center'}}>
                              <span style={{fontSize:11,color:C.inkGhost}}>{m.count} txns</span>
                              <span style={{fontSize:13,fontWeight:900,color:meta.color,fontFamily:"'Playfair Display',serif"}}>{fmtK(m.total)}</span>
                            </div>
                          </div>
                          <ProgBar val={m.total} max={Math.max(totalRevenue,1)} color={meta.color} h={4}/>
                        </div>
                        <span style={{fontSize:10,fontWeight:800,color:C.inkGhost,width:28,textAlign:'right'}}>{pct}%</span>
                      </div>
                    );
                  })
                }
              </motion.div>

              {/* Booking Status */}
              <motion.div variants={fd} style={{background:C.card,borderRadius:22,padding:'22px 24px',border:`1px solid ${C.border}`}}>
                <p style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.2em',color:C.inkGhost,marginBottom:3}}>Booking Status</p>
                <p style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:800,color:C.ink,marginBottom:18}}>Breakdown</p>

                {Object.keys(statusMap).length===0
                  ? <p style={{fontSize:12,color:C.inkGhost,textAlign:'center',padding:'24px 0'}}>No booking data</p>
                  : Object.entries(STATUS_META).map(([k,s])=>{
                    const cnt=statusMap[k]||0;
                    if (!cnt) return null;
                    return (
                      <div key={k} style={{marginBottom:13}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                          <div style={{display:'flex',alignItems:'center',gap:7}}>
                            <span style={{width:8,height:8,borderRadius:'50%',background:s.color,display:'inline-block'}}/>
                            <span style={{fontSize:12,fontWeight:700,color:C.inkMid}}>{s.label}</span>
                          </div>
                          <div>
                            <span style={{fontSize:13,fontWeight:900,color:s.color,fontFamily:"'Playfair Display',serif"}}>{cnt}</span>
                            <span style={{fontSize:10,color:C.inkGhost,marginLeft:5}}>{totalBookings>0?`${Math.round(cnt/totalBookings*100)}%`:''}</span>
                          </div>
                        </div>
                        <ProgBar val={cnt} max={Math.max(totalBookings,1)} color={s.color} h={4}/>
                      </div>
                    );
                  })
                }

                {/* Walk-in vs Online */}
                {(data.bookingStats?.typeBreakdown||[]).length>0 && (
                  <div style={{marginTop:18,padding:'12px 14px',borderRadius:12,background:C.bg,border:`1px solid ${C.border}`}}>
                    <p style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.1em',color:C.inkGhost,marginBottom:10}}>Source</p>
                    {(data.bookingStats.typeBreakdown).map((t,i)=>(
                      <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                        <span style={{fontSize:12,fontWeight:700,color:C.inkMid,textTransform:'capitalize'}}>{t._id==='walk-in'?'🚶 Walk-in':'🌐 Online'}</span>
                        <div style={{textAlign:'right'}}>
                          <span style={{fontSize:13,fontWeight:800,color:C.ink}}>{t.count}</span>
                          <span style={{fontSize:10,color:C.inkGhost,marginLeft:6}}>{fmtK(t.revenue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

            {/* ── PEAK HOURS ── */}
            {(data.bookingStats?.peakHours||[]).length>0 && (
              <motion.div variants={fd} style={{background:C.card,borderRadius:22,padding:'22px 24px',border:`1px solid ${C.border}`}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
                  <div>
                    <p style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.2em',color:C.inkGhost,marginBottom:3}}>Peak Hours</p>
                    <p style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:800,color:C.ink}}>Booking Heatmap</p>
                  </div>
                  <Clock size={18} style={{color:C.inkGhost}}/>
                </div>
                <PeakHours data={data.bookingStats.peakHours}/>
                <div style={{display:'flex',alignItems:'center',gap:10,marginTop:12}}>
                  <span style={{fontSize:10,color:C.inkGhost}}>Low</span>
                  <div style={{display:'flex',gap:2,flex:1}}>
                    {[0.12,0.3,0.5,0.7,0.87].map((op,i)=>(
                      <div key={i} style={{flex:1,height:8,borderRadius:4,background:`rgba(5,150,105,${op})`}}/>
                    ))}
                  </div>
                  <span style={{fontSize:10,color:C.inkGhost}}>High</span>
                </div>
              </motion.div>
            )}

          </motion.div>
        )}

      </div>

      {exMenu && <div onClick={()=>setExMenu(false)} style={{position:'fixed',inset:0,zIndex:90}}/>}

      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.border};border-radius:100px}
        select option{background:#1A1208;color:#FAF3E0}
      `}</style>
    </>
  );
}