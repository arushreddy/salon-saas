// src/pages/superadmin/SuperAdminSalons.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/services/api';
import {
  Building2, Search, Plus, ShieldCheck, X, Check,
  RefreshCw, ChevronLeft, ChevronRight,
  Edit3, Slash, CalendarDays, CalendarCheck, CalendarX,
  RotateCcw, Download, Key, LogIn,
  MoreHorizontal, Trash2, Printer, TrendingUp,
  IndianRupee, BarChart3, Activity, AlertTriangle,
  Receipt, Eye, Copy, ExternalLink, Star, Zap, Crown,
} from 'lucide-react';

const C = {
  bg:'#0F0D0B', bgCard:'#1A1613', bgCard2:'#211C16',
  border:'rgba(212,168,75,0.12)',
  gold:'#D4A84B', goldPale:'rgba(212,168,75,0.08)', goldDim:'#B8892A',
  ink:'#FAF6EF', inkMid:'#C8B896', inkMuted:'rgba(250,246,239,0.45)',
  purple:'#A78BFA', purplePale:'rgba(167,139,250,0.10)',
  green:'#34D399', greenPale:'rgba(52,211,153,0.10)', greenBorder:'rgba(52,211,153,0.25)',
  red:'#F87171', redPale:'rgba(248,113,113,0.10)', redBorder:'rgba(248,113,113,0.25)',
  blue:'#60A5FA', bluePale:'rgba(96,165,250,0.10)', blueBorder:'rgba(96,165,250,0.25)',
  amber:'#FBBF24', amberPale:'rgba(251,191,36,0.10)', amberBorder:'rgba(251,191,36,0.25)',
  teal:'#2DD4BF', tealPale:'rgba(45,212,191,0.10)', tealBorder:'rgba(45,212,191,0.25)',
};

// ── Plan config ───────────────────────────────────────────────────────────────
const PLAN_CFG = {
  plan1:{ label:'Basic',     color:C.blue,   bg:C.bluePale,   border:C.blueBorder,   icon:Star,  monthly:999,  yearly:9990  },
  plan2:{ label:'Online',    color:C.gold,   bg:C.goldPale,   border:C.border,        icon:Zap,   monthly:1999, yearly:19990 },
  plan3:{ label:'Franchise', color:C.purple, bg:C.purplePale, border:'rgba(167,139,250,0.25)', icon:Crown, monthly:4999, yearly:49990 },
};

const PAYMENT_METHODS = [
  {value:'cash',label:'💵 Cash'},
  {value:'upi',label:'📱 UPI'},
  {value:'card',label:'💳 Card'},
  {value:'bank_transfer',label:'🏦 Bank'},
  {value:'cheque',label:'📄 Cheque'},
  {value:'other',label:'🔗 Other'},
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const getSubStatus = (expiry) => {
  if (!expiry) return { label:'No Expiry', color:C.inkMuted, icon:CalendarDays };
  const diff = Math.ceil((new Date(expiry)-new Date())/86400000);
  if (diff<0)   return { label:'Expired',       color:C.red,   icon:CalendarX    };
  if (diff<=7)  return { label:`${diff}d left`, color:C.red,   icon:CalendarX    };
  if (diff<=30) return { label:`${diff}d left`, color:C.amber, icon:CalendarDays };
  return         { label:`${Math.ceil(diff/30)}mo left`, color:C.teal, icon:CalendarCheck };
};

const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtMoney = (n) => `₹${Number(n||0).toLocaleString('en-IN')}`;
const fmtK     = (n) => {
  if (!n) return '₹0';
  if (n >= 1e5) return `₹${(n/1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n/1e3).toFixed(1)}K`;
  return `₹${n}`;
};

// ── Compute auto amount based on plan + duration ──────────────────────────────
const computeAutoAmount = (plan, durationMode, months, years) => {
  const cfg = PLAN_CFG[plan];
  if (!cfg) return 0;
  if (durationMode === 'months') {
    const m = parseInt(months) || 1;
    if (m >= 12) return Math.round(cfg.yearly * (m / 12));
    return cfg.monthly * m;
  }
  if (durationMode === 'years') {
    const y = parseInt(years) || 1;
    return cfg.yearly * y;
  }
  return cfg.monthly; // default 1 month
};

// ── Print Subscription Receipt ────────────────────────────────────────────────
const printSubReceipt = (salon, payment, duration) => {
  const html = `<!DOCTYPE html>
<html><head><title>Subscription Receipt</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'DM Sans',sans-serif;background:#F0E8D8;padding:20px;max-width:420px;margin:auto}
  .card{background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.15)}
  .hdr{background:linear-gradient(145deg,#0E0B06,#1C1608);padding:26px 22px 20px;text-align:center;position:relative}
  .hdr::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(45deg,#D4A84B 0,#D4A84B 1px,transparent 0,transparent 50%);background-size:18px 18px;opacity:.05}
  .logo{font-family:'Playfair Display',serif;font-size:24px;color:#FAF3E0;position:relative;z-index:1}
  .logo span{color:#D4A84B}
  .subtitle{font-size:9px;color:rgba(255,255,255,.3);letter-spacing:.2em;text-transform:uppercase;margin-top:4px;position:relative;z-index:1}
  .ref{display:inline-flex;align-items:center;gap:5px;margin-top:12px;background:rgba(212,168,75,.12);border:1px solid rgba(212,168,75,.3);border-radius:20px;padding:5px 14px;font-size:11px;font-weight:700;color:#D4A84B;position:relative;z-index:1}
  .body{padding:20px 22px}
  .sec{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.18em;color:#9C8660;margin:14px 0 8px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
  .cell{background:#F9F4EC;border-radius:10px;padding:8px 11px;border:1px solid rgba(212,168,75,.15)}
  .cl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9C8660}
  .cv{font-size:13px;font-weight:700;color:#1A1208;margin-top:2px}
  .total{background:linear-gradient(135deg,#FFF8E7,#FFF0C4);border:1.5px solid rgba(184,134,11,.22);border-radius:14px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;margin-top:14px}
  .tl{font-size:14px;font-weight:800;color:#4A3018}
  .ta{font-family:'Playfair Display',serif;font-size:30px;font-weight:900;color:#B8860B}
  .plan-badge{display:inline-flex;align-items:center;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;background:#FFF8E7;color:#B8860B;border:1px solid rgba(184,134,11,.3);margin-top:8px}
  .disc-row{display:flex;justify-content:space-between;font-size:12px;color:#15803D;font-weight:700;padding:5px 0}
  .ftr{background:#FFF8E7;border-top:1px solid rgba(212,168,75,.2);padding:14px 22px;text-align:center;font-size:11px;color:#9C8660;line-height:2}
  .pbtn{display:block;width:100%;margin-top:20px;padding:14px;background:linear-gradient(135deg,#8B6914,#DAA520);color:#fff;border:none;border-radius:14px;font-size:13px;font-weight:800;cursor:pointer}
  @media print{.pbtn{display:none}body{background:#fff;padding:0}.card{box-shadow:none;border-radius:0}}
</style></head><body>
<div class="card">
  <div class="hdr">
    <div class="logo">✂ Glamour<span>.</span></div>
    <div class="subtitle">Platform Subscription Receipt</div>
    <div class="ref">🧾 SUB-${Date.now().toString(36).toUpperCase()}</div>
  </div>
  <div class="body">
    <div class="sec">Salon Details</div>
    <div class="grid">
      <div class="cell"><div class="cl">Salon Name</div><div class="cv">${salon.name}</div></div>
      <div class="cell"><div class="cl">Slug</div><div class="cv">${salon.slug}</div></div>
      <div class="cell"><div class="cl">Admin</div><div class="cv">${salon.admin?.name || '—'}</div></div>
      <div class="cell"><div class="cl">Contact</div><div class="cv">${salon.phone || salon.admin?.email || '—'}</div></div>
    </div>

    <div class="sec" style="margin-top:16px">Subscription Details</div>
    <div class="grid">
      <div class="cell"><div class="cl">Plan</div><div class="cv">${PLAN_CFG[payment.plan]?.label || payment.plan}</div></div>
      <div class="cell"><div class="cl">Duration</div><div class="cv">${duration}</div></div>
      <div class="cell"><div class="cl">Start Date</div><div class="cv">${fmtDate(new Date())}</div></div>
      <div class="cell"><div class="cl">Expiry Date</div><div class="cv">${fmtDate(salon.subscriptionExpiry)}</div></div>
    </div>

    <div class="sec" style="margin-top:16px">Payment</div>
    ${payment.originalAmount && payment.discountAmount > 0 ? `
    <div style="background:#F9F4EC;border-radius:10px;padding:10px 14px;border:1px solid rgba(212,168,75,.15);margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#9C8660;margin-bottom:4px"><span>Original Amount</span><span>${fmtMoney(payment.originalAmount)}</span></div>
      <div class="disc-row"><span>Discount Applied</span><span>-${fmtMoney(payment.discountAmount)}</span></div>
    </div>` : ''}
    <div class="total">
      <span class="tl">Total Paid</span>
      <span class="ta">${fmtMoney(payment.amount)}</span>
    </div>
    <div style="text-align:center">
      <span class="plan-badge">${PAYMENT_METHODS.find(m=>m.value===payment.method)?.label || payment.method}</span>
      ${payment.transactionId ? `<div style="font-size:11px;color:#9C8660;margin-top:6px">Ref: ${payment.transactionId}</div>` : ''}
    </div>
  </div>
  <div class="ftr">
    <div>Thank you for your subscription! 🙏</div>
    <div style="margin-top:4px;font-size:10px">Glamour Platform · Support: support@glamour.in</div>
    <div style="margin-top:4px;opacity:0.5">Generated: ${new Date().toLocaleString('en-IN')}</div>
  </div>
</div>
<button class="pbtn" onclick="window.print()">🖨 Print Receipt</button>
</body></html>`;
  const win = window.open('', '_blank', 'width=480,height=820');
  if (win) { win.document.write(html); win.document.close(); }
};

// ── Revenue Stats Header ──────────────────────────────────────────────────────
const RevenueStats = ({ stats, loading }) => {
  if (loading) return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
      {[1,2,3,4].map(i => (
        <div key={i} style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:16, padding:20, height:90, animation:'pulse 1.5s ease-in-out infinite' }}/>
      ))}
    </div>
  );

  const cards = [
    { label:'Total Revenue',    value:fmtK(stats.totalRevenue),    sub:`${stats.totalPayments} payments`,   color:C.gold,   icon:IndianRupee },
    { label:'This Month',       value:fmtK(stats.monthRevenue),    sub:`${stats.monthPayments} payments`,   color:C.green,  icon:TrendingUp  },
    { label:'Active Salons',    value:stats.activeSalons,           sub:`of ${stats.totalSalons} total`,    color:C.teal,   icon:Building2   },
    { label:'Expiring Soon',    value:stats.expiringSoon,           sub:'within 30 days',                   color:stats.expiringSoon>0?C.amber:C.inkMuted, icon:AlertTriangle },
  ];

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <div key={card.label} style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:16, padding:'18px 18px 14px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-16, right:-16, width:64, height:64, borderRadius:'50%', background:`${card.color}10` }}/>
            <div style={{ width:36, height:36, borderRadius:10, background:`${card.color}15`, border:`1px solid ${card.color}25`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
              <Icon size={16} color={card.color}/>
            </div>
            <div style={{ fontSize:24, fontWeight:800, color:C.ink, lineHeight:1, fontFamily:'Playfair Display, serif', marginBottom:4 }}>{card.value}</div>
            <div style={{ fontSize:12, fontWeight:600, color:C.inkMid, marginBottom:2 }}>{card.label}</div>
            <div style={{ fontSize:11, color:C.inkMuted }}>{card.sub}</div>
          </div>
        );
      })}
    </div>
  );
};

// ── Plan Revenue Breakdown ────────────────────────────────────────────────────
const PlanBreakdown = ({ stats }) => {
  if (!stats?.planRevenue) return null;
  return (
    <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 18px', marginBottom:16 }}>
      <div style={{ fontSize:11, fontWeight:700, color:C.inkMuted, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>Revenue by Plan</div>
      <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
        {Object.entries(stats.planRevenue).map(([plan, rev]) => {
          const cfg = PLAN_CFG[plan];
          if (!cfg) return null;
          const Icon = cfg.icon;
          return (
            <div key={plan} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:`${cfg.color}15`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon size={13} color={cfg.color}/>
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:cfg.color }}>{cfg.label}</div>
                <div style={{ fontSize:13, fontWeight:800, color:C.ink }}>{fmtK(rev)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Primitives ────────────────────────────────────────────────────────────────
const Inp = ({label,...p}) => (
  <div style={{display:'flex',flexDirection:'column',gap:5}}>
    {label && <label style={{fontSize:11,fontWeight:600,color:C.inkMuted,textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</label>}
    <input {...p} style={{padding:'9px 12px',borderRadius:9,fontSize:13,border:`1px solid ${C.border}`,background:C.bgCard2,color:C.ink,outline:'none',width:'100%',boxSizing:'border-box',...(p.style||{})}}
      onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
  </div>
);

const Sel = ({label,children,...p}) => (
  <div style={{display:'flex',flexDirection:'column',gap:5}}>
    {label && <label style={{fontSize:11,fontWeight:600,color:C.inkMuted,textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</label>}
    <select {...p} style={{padding:'9px 12px',borderRadius:9,fontSize:13,border:`1px solid ${C.border}`,background:C.bgCard2,color:C.ink,outline:'none',width:'100%'}}>{children}</select>
  </div>
);

const Btn = ({children,onClick,disabled,variant='primary',small,style:sx={},...p}) => {
  const v = {
    primary:{background:C.gold,      color:'#0F0D0B',border:'none'},
    danger: {background:C.redPale,   color:C.red,    border:`1px solid ${C.redBorder}`},
    ghost:  {background:C.bgCard2,   color:C.inkMid, border:`1px solid ${C.border}`},
    success:{background:C.greenPale, color:C.green,  border:`1px solid ${C.greenBorder}`},
    amber:  {background:C.amberPale, color:C.amber,  border:`1px solid ${C.amberBorder}`},
    teal:   {background:C.tealPale,  color:C.teal,   border:`1px solid ${C.tealBorder}`},
  };
  return (
    <button onClick={onClick} disabled={disabled} {...p}
      style={{display:'flex',alignItems:'center',gap:6,padding:small?'6px 12px':'9px 16px',borderRadius:9,fontSize:small?12:13,fontWeight:600,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.6:1,...v[variant],...sx}}>
      {children}
    </button>
  );
};

const Badge = ({color,bg,border,children}) => (
  <span style={{fontSize:10,fontWeight:700,color,background:bg,border:`1px solid ${border||color+'30'}`,borderRadius:20,padding:'2px 8px',whiteSpace:'nowrap'}}>{children}</span>
);

// ── Modal wrapper ─────────────────────────────────────────────────────────────
const Modal = ({title,icon:Icon,iconBg,iconColor,onClose,children,maxWidth=520}) => (
  <motion.div
    initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.15}}
    onClick={e=>{if(e.target===e.currentTarget)onClose();}}
    style={{position:'fixed',inset:0,background:'rgba(10,9,7,0.82)',backdropFilter:'blur(12px)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
  >
    <motion.div
      initial={{opacity:0,scale:0.93,y:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95,y:10}}
      transition={{duration:0.2,ease:[0.16,1,0.3,1]}}
      onClick={e=>e.stopPropagation()}
      style={{background:C.bgCard,borderRadius:20,width:'100%',maxWidth,boxShadow:'0 32px 80px rgba(0,0,0,0.55)',border:`1px solid ${C.border}`,maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column'}}
    >
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'18px 22px',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{width:40,height:40,borderRadius:11,flexShrink:0,background:iconBg||C.goldPale,border:`1px solid ${(iconColor||C.gold)}25`,display:'flex',alignItems:'center',justifyContent:'center'}}>
          {Icon && <Icon size={18} color={iconColor||C.gold}/>}
        </div>
        <h2 style={{margin:0,fontSize:16,fontWeight:700,color:C.ink,flex:1}}>{title}</h2>
        <button onClick={onClose} style={{background:C.bgCard2,border:`1px solid ${C.border}`,borderRadius:8,padding:7,cursor:'pointer',color:C.inkMuted,display:'flex'}}><X size={14}/></button>
      </div>
      <div style={{overflowY:'auto',flex:1}}>{children}</div>
    </motion.div>
  </motion.div>
);

// ── Duration Picker ───────────────────────────────────────────────────────────
const DurationPicker = ({value,onChange}) => {
  const {mode,months,years,date} = value;
  const set = (k,v) => onChange({...value,[k]:v});
  return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <label style={{fontSize:11,fontWeight:600,color:C.inkMuted,textTransform:'uppercase',letterSpacing:'0.05em'}}>Subscription Duration</label>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
        {[['none','No expiry'],['months','Months'],['years','Years'],['date','Custom date']].map(([v,l])=>(
          <button key={v} type="button" onClick={()=>set('mode',v)} style={{padding:'7px 4px',borderRadius:8,cursor:'pointer',fontSize:11,fontWeight:600,textAlign:'center',background:mode===v?C.goldPale:C.bgCard2,border:`1px solid ${mode===v?C.gold+'60':C.border}`,color:mode===v?C.gold:C.inkMuted}}>{l}</button>
        ))}
      </div>
      {mode==='months' && (
        <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
          {[1,3,6,12,24].map(m=>(
            <button key={m} type="button" onClick={()=>set('months',String(m))} style={{padding:'6px 13px',borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:600,background:months===String(m)?C.tealPale:C.bgCard2,border:`1px solid ${months===String(m)?C.tealBorder:C.border}`,color:months===String(m)?C.teal:C.inkMuted}}>{m} mo</button>
          ))}
          <input type="number" min="1" max="60" placeholder="Custom mo"
            value={![1,3,6,12,24].includes(Number(months))?months:''}
            onChange={e=>set('months',e.target.value)}
            style={{width:90,padding:'6px 10px',borderRadius:8,fontSize:12,border:`1px solid ${C.border}`,background:C.bgCard2,color:C.ink,outline:'none'}}
            onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>
      )}
      {mode==='years' && (
        <div style={{display:'flex',gap:6}}>
          {[1,2,3].map(y=>(
            <button key={y} type="button" onClick={()=>set('years',String(y))} style={{padding:'6px 18px',borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:600,background:years===String(y)?C.tealPale:C.bgCard2,border:`1px solid ${years===String(y)?C.tealBorder:C.border}`,color:years===String(y)?C.teal:C.inkMuted}}>{y} yr</button>
          ))}
        </div>
      )}
      {mode==='date' && <Inp label="Expiry Date" type="date" value={date} onChange={e=>set('date',e.target.value)}/>}
    </div>
  );
};

// ── Discount Section ──────────────────────────────────────────────────────────
const DiscountSection = ({originalAmount, value, onChange}) => {
  const {type, value:discVal} = value;
  const set = (k,v) => onChange({...value,[k]:v});
  const discountAmt = (() => {
    if (type==='percent') return Math.round((originalAmount*(parseFloat(discVal)||0))/100);
    if (type==='amount')  return Math.min(parseFloat(discVal)||0, originalAmount);
    return 0;
  })();
  const finalAmount = Math.max(0, originalAmount - discountAmt);
  const hasDiscount = type !== 'none' && discountAmt > 0;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <label style={{fontSize:11,fontWeight:600,color:C.inkMuted,textTransform:'uppercase',letterSpacing:'0.05em'}}>Discount</label>
        {hasDiscount && <span style={{fontSize:11,fontWeight:700,color:C.green}}>-{fmtMoney(discountAmt)} off</span>}
      </div>
      <div style={{display:'flex',gap:6}}>
        {[['none','No Discount'],['percent','% Off'],['amount','₹ Off']].map(([v,l])=>(
          <button key={v} type="button" onClick={()=>set('type',v)} style={{flex:1,padding:'7px 4px',borderRadius:8,cursor:'pointer',fontSize:11,fontWeight:600,textAlign:'center',background:type===v?C.purplePale:C.bgCard2,border:`1px solid ${type===v?C.purple+'50':C.border}`,color:type===v?C.purple:C.inkMuted}}>{l}</button>
        ))}
      </div>
      {type!=='none' && (
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{position:'relative',flex:1}}>
            <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:13,color:C.inkMuted,pointerEvents:'none'}}>{type==='percent'?'%':'₹'}</span>
            <input type="number" min="0" max={type==='percent'?100:originalAmount} value={discVal}
              onChange={e=>set('value',e.target.value)} placeholder={type==='percent'?'10':'200'}
              style={{padding:'9px 12px 9px 28px',borderRadius:9,fontSize:13,border:`1px solid ${C.border}`,background:C.bgCard2,color:C.ink,outline:'none',width:'100%',boxSizing:'border-box'}}
              onFocus={e=>e.target.style.borderColor=C.purple} onBlur={e=>e.target.style.borderColor=C.border}/>
          </div>
          {type==='percent'&&originalAmount>0&&<span style={{fontSize:12,color:C.inkMuted,whiteSpace:'nowrap'}}>= {fmtMoney(discountAmt)}</span>}
        </div>
      )}
      {originalAmount > 0 && (
        <div style={{background:C.bgCard2,borderRadius:10,padding:'12px 14px',border:`1px solid ${hasDiscount?C.green+'30':C.border}`}}>
          {hasDiscount && <>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:C.inkMuted,marginBottom:6}}><span>Original</span><span>{fmtMoney(originalAmount)}</span></div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:C.green,fontWeight:700,marginBottom:6}}><span>Discount {type==='percent'?`(${discVal}%)`:'(₹)'}</span><span>-{fmtMoney(discountAmt)}</span></div>
            <div style={{height:1,background:C.border,marginBottom:6}}/>
          </>}
          <div style={{display:'flex',justifyContent:'space-between',fontSize:14,fontWeight:800}}>
            <span style={{color:C.ink}}>Final Amount</span>
            <span style={{color:C.gold}}>{fmtMoney(finalAmount)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Salon Detail / History Modal ──────────────────────────────────────────────
const SalonDetailModal = ({salon, onClose, onRenew}) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPaid, setTotalPaid] = useState(0);
  const [tab, setTab] = useState('overview');
  const [copied, setCopied] = useState('');

  const sub = getSubStatus(salon.subscriptionExpiry);
  const SubIcon = sub.icon;
  const planCfg = PLAN_CFG[salon.plan] || PLAN_CFG.plan1;

  useEffect(() => {
    const load = async () => {
      try {
        const {data} = await api.get(`/superadmin/salons/${salon._id}/payments`);
        setHistory(data.payments || []);
        setTotalPaid(data.totalRevenue || 0);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [salon._id]);

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  const MI = {cash:'💵',upi:'📱',card:'💳',bank_transfer:'🏦',cheque:'📄',other:'🔗'};

  return (
    <Modal title={salon.name} icon={Building2} onClose={onClose} maxWidth={600}>
      {/* Tabs */}
      <div style={{display:'flex',borderBottom:`1px solid ${C.border}`,padding:'0 22px',flexShrink:0}}>
        {[['overview','Overview'],['history','Payment History'],['access','Quick Access']].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{padding:'10px 14px',background:'none',border:'none',borderBottom:tab===v?`2px solid ${C.gold}`:'2px solid transparent',color:tab===v?C.gold:C.inkMuted,fontSize:13,fontWeight:tab===v?700:400,cursor:'pointer',marginBottom:-1}}>{l}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{padding:'20px 22px',display:'flex',flexDirection:'column',gap:14}}>
          {/* Status Cards */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div style={{background:C.bgCard2,borderRadius:12,padding:'14px 16px',border:`1px solid ${planCfg.color}20`}}>
              <div style={{fontSize:10,fontWeight:700,color:C.inkMuted,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>Current Plan</div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <planCfg.icon size={18} color={planCfg.color}/>
                <span style={{fontSize:16,fontWeight:800,color:planCfg.color}}>{planCfg.label}</span>
              </div>
              <div style={{fontSize:11,color:C.inkMuted,marginTop:4}}>{fmtMoney(planCfg.monthly)}/month</div>
            </div>
            <div style={{background:C.bgCard2,borderRadius:12,padding:'14px 16px',border:`1px solid ${sub.color}20`}}>
              <div style={{fontSize:10,fontWeight:700,color:C.inkMuted,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>Subscription</div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <SubIcon size={18} color={sub.color}/>
                <span style={{fontSize:16,fontWeight:800,color:sub.color}}>{sub.label}</span>
              </div>
              <div style={{fontSize:11,color:C.inkMuted,marginTop:4}}>{salon.subscriptionExpiry?`Expires ${fmtDate(salon.subscriptionExpiry)}`:'No expiry set'}</div>
            </div>
          </div>

          {/* Revenue Summary */}
          <div style={{background:`linear-gradient(135deg,${C.goldPale},rgba(212,168,75,0.04))`,border:`1px solid ${C.gold}30`,borderRadius:12,padding:'16px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:11,color:C.inkMuted,marginBottom:4}}>Total Revenue from this Salon</div>
              <div style={{fontSize:28,fontWeight:800,color:C.gold,fontFamily:'Playfair Display,serif'}}>{fmtK(totalPaid)}</div>
              <div style={{fontSize:12,color:C.inkMuted,marginTop:2}}>{history.length} payments recorded</div>
            </div>
            <IndianRupee size={40} color={C.gold} style={{opacity:0.2}}/>
          </div>

          {/* Salon Info */}
          <div>
            <div style={{fontSize:10,fontWeight:700,color:C.inkMuted,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:10}}>Salon Details</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[
                ['Admin', salon.admin?.name || '—'],
                ['Email', salon.admin?.email || salon.email || '—'],
                ['Phone', salon.phone || '—'],
                ['Slug', salon.slug],
                ['Created', fmtDate(salon.createdAt)],
                ['Status', salon.isSuspended ? '⛔ Suspended' : salon.isActive ? '✅ Active' : '⚠ Inactive'],
              ].map(([label, value]) => (
                <div key={label} style={{background:C.bgCard2,borderRadius:10,padding:'8px 12px',border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:9,fontWeight:700,color:C.inkMuted,textTransform:'uppercase',letterSpacing:'0.1em'}}>{label}</div>
                  <div style={{fontSize:12,fontWeight:600,color:C.inkMid,marginTop:2,wordBreak:'break-all'}}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Booking URL */}
          <div style={{background:C.bgCard2,borderRadius:12,padding:'12px 16px',border:`1px solid ${C.border}`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.inkMuted,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>Booking Website URL</div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <code style={{flex:1,fontSize:12,color:C.gold,wordBreak:'break-all'}}>
                {window.location.origin}/book/{salon.slug}
              </code>
              <button onClick={() => copyText(`${window.location.origin}/book/${salon.slug}`, 'url')}
                style={{background:'none',border:`1px solid ${C.border}`,borderRadius:8,padding:6,cursor:'pointer',color:copied==='url'?C.green:C.inkMuted,display:'flex',flexShrink:0}}>
                {copied==='url' ? <Check size={13}/> : <Copy size={13}/>}
              </button>
              <a href={`${window.location.origin}/book/${salon.slug}`} target="_blank" rel="noreferrer"
                style={{background:'none',border:`1px solid ${C.border}`,borderRadius:8,padding:6,cursor:'pointer',color:C.inkMuted,display:'flex',flexShrink:0,textDecoration:'none'}}>
                <ExternalLink size={13}/>
              </a>
            </div>
          </div>

          <Btn onClick={onRenew} variant="teal" style={{width:'100%',justifyContent:'center'}}>
            <RotateCcw size={14}/> Renew / Change Plan
          </Btn>
        </div>
      )}

      {tab === 'history' && (
        <div style={{padding:'16px 22px',display:'flex',flexDirection:'column',gap:12}}>
          {/* Total */}
          <div style={{background:C.goldPale,border:`1px solid ${C.gold}30`,borderRadius:12,padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:12,color:C.inkMuted}}>Total collected from {salon.name}</div>
              <div style={{fontSize:22,fontWeight:800,color:C.gold}}>{fmtMoney(totalPaid)}</div>
            </div>
            <div style={{fontSize:12,color:C.inkMuted}}>{history.length} payments</div>
          </div>

          {loading ? (
            <div style={{padding:'28px',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              <RefreshCw size={16} color={C.gold} style={{animation:'spin 1s linear infinite'}}/>
              <span style={{color:C.inkMuted,fontSize:13}}>Loading…</span>
            </div>
          ) : history.length === 0 ? (
            <div style={{padding:'32px',textAlign:'center',color:C.inkMuted,fontSize:13}}>No payment records yet.</div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {history.map((p,i) => {
                const planC = PLAN_CFG[p.plan] || PLAN_CFG.plan1;
                return (
                  <div key={p._id} style={{background:C.bgCard2,borderRadius:12,padding:'14px 16px',border:`1px solid ${C.border}`,display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
                        <span style={{fontSize:18}}>{MI[p.method]||'🔗'}</span>
                        <span style={{fontSize:13,fontWeight:700,color:C.ink}}>{PAYMENT_METHODS.find(m=>m.value===p.method)?.label.replace(/^.+ /,'')||p.method}</span>
                        <Badge color={planC.color} bg={planC.bg} border={planC.border}>{planC.label}</Badge>
                        {p.discountAmount>0&&<Badge color={C.green} bg={C.greenPale} border={C.greenBorder}>-{fmtMoney(p.discountAmount)} disc.</Badge>}
                      </div>
                      <div style={{fontSize:11,color:C.inkMuted,lineHeight:1.7}}>
                        <div>{fmtDate(p.createdAt)}{p.durationMonths&&` · ${p.durationMonths} month${p.durationMonths>1?'s':''}`}</div>
                        {p.periodEnd&&<div>Valid till: <b style={{color:C.inkMid}}>{fmtDate(p.periodEnd)}</b></div>}
                        {p.transactionId&&<div>Ref: <b style={{color:C.inkMid}}>{p.transactionId}</b></div>}
                        {p.collectedBy?.name&&<div>Collected by: {p.collectedBy.name}</div>}
                        {p.originalAmount&&p.originalAmount!==p.amount&&<div style={{color:C.green}}>Original: {fmtMoney(p.originalAmount)} → Paid: {fmtMoney(p.amount)}</div>}
                      </div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}>
                      <div style={{fontSize:18,fontWeight:800,color:C.green}}>{fmtMoney(p.amount)}</div>
                      <button onClick={() => printSubReceipt(salon, p, p.durationMonths?`${p.durationMonths} months`:'—')}
                        style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',borderRadius:8,border:`1px solid ${C.border}`,background:'none',color:C.inkMuted,cursor:'pointer',fontSize:11,fontWeight:600}}>
                        <Printer size={11}/> Receipt
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'access' && (
        <div style={{padding:'20px 22px',display:'flex',flexDirection:'column',gap:12}}>
          <div style={{background:C.amberPale,border:`1px solid ${C.amberBorder}`,borderRadius:12,padding:'12px 14px',fontSize:12,color:C.amber}}>
            ⚠ Quick access tools for support and administration only.
          </div>
          {[
            { label:'Booking Site', desc:'Public booking page for customers', icon:ExternalLink, color:C.blue, action:() => window.open(`${window.location.origin}/book/${salon.slug}`, '_blank') },
            { label:'Admin Panel', desc:'Login as this salon\'s admin', icon:LogIn, color:C.purple, action: async () => {
              try {
                const {data} = await api.post(`/superadmin/salons/${salon._id}/impersonate`);
                localStorage.setItem('accessToken', data.token);
                localStorage.setItem('user', JSON.stringify({...data.adminUser, impersonating: salon.name}));
                window.location.href = '/admin';
              } catch(e) { alert(e.response?.data?.message || 'Failed'); }
            }},
            { label:'Copy Login Link', desc:'Copy admin dashboard URL', icon:Copy, color:C.teal, action: () => copyText(window.location.origin + '/admin', 'admin-link') },
          ].map(item => (
            <button key={item.label} onClick={item.action}
              style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderRadius:12,border:`1px solid ${item.color}25`,background:`${item.color}08`,cursor:'pointer',textAlign:'left'}}>
              <div style={{width:40,height:40,borderRadius:11,background:`${item.color}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <item.icon size={17} color={item.color}/>
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:item.color}}>{item.label}</div>
                <div style={{fontSize:11,color:C.inkMuted,marginTop:2}}>{item.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
};

// ── Create Salon Modal ────────────────────────────────────────────────────────
const CreateModal = ({onClose, onSaved}) => {
  const [form, setForm] = useState({name:'',slug:'',adminEmail:'',adminName:'',adminPhone:'',adminPassword:'',plan:'plan1',phone:'',email:''});
  const [duration, setDuration] = useState({mode:'months',months:'12',years:'1',date:''});
  const [payment, setPayment] = useState({amount:'',method:'cash',txnId:''});
  const [discount, setDiscount] = useState({type:'none',value:''});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  // Auto-fill amount when plan or duration changes
  useEffect(() => {
    if (duration.mode === 'none' || duration.mode === 'date') return;
    const auto = computeAutoAmount(form.plan, duration.mode, duration.months, duration.years);
    if (auto > 0) setPayment(p => ({...p, amount: String(auto)}));
  }, [form.plan, duration.mode, duration.months, duration.years]);

  const originalAmt = parseFloat(payment.amount) || 0;
  const discountAmt = (() => {
    if (discount.type==='percent') return Math.round((originalAmt*(parseFloat(discount.value)||0))/100);
    if (discount.type==='amount')  return Math.min(parseFloat(discount.value)||0, originalAmt);
    return 0;
  })();
  const finalAmt = Math.max(0, originalAmt - discountAmt);

  const handleSave = async () => {
    if (!form.name||!form.slug||!form.adminEmail||!form.adminPassword){setErr('Salon name, slug, admin email and password are required.');return;}
    setSaving(true);setErr('');
    try {
      const body={...form};
      if(duration.mode==='months')    body.subscriptionMonths=parseInt(duration.months);
      else if(duration.mode==='years') body.subscriptionMonths=parseInt(duration.years)*12;
      else if(duration.mode==='date')  body.subscriptionExpiry=duration.date;
      if(originalAmt>0){
        body.amount=finalAmt;
        body.originalAmount=originalAmt;
        body.discountAmount=discountAmt;
        body.method=payment.method;
        body.transactionId=payment.txnId;
      }
      const {data} = await api.post('/superadmin/salons', body);
      // Print receipt if payment recorded
      if (originalAmt > 0) {
        const durationLabel = duration.mode==='months' ? `${duration.months} months` : duration.mode==='years' ? `${duration.years} year(s)` : '—';
        printSubReceipt({...form, admin:{name:form.adminName,email:form.adminEmail}, subscriptionExpiry: data.salon?.subscriptionExpiry}, {amount:finalAmt, originalAmount:originalAmt, discountAmount:discountAmt, method:payment.method, transactionId:payment.txnId, plan:form.plan}, durationLabel);
      }
      onSaved?.(); onClose();
    } catch(e) { setErr(e.response?.data?.message||'Failed to create'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Create New Salon" icon={Plus} onClose={onClose} maxWidth={620}>
      <div style={{padding:'20px 22px',display:'flex',flexDirection:'column',gap:14}}>
        {err && <div style={{background:C.redPale,border:`1px solid ${C.redBorder}`,borderRadius:9,padding:'10px 14px',fontSize:13,color:C.red}}>{err}</div>}

        <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:'uppercase',letterSpacing:'0.1em'}}>Salon Info</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <Inp label="Salon Name" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Royal Cuts"/>
          <Inp label="Slug (URL)" value={form.slug} onChange={e=>set('slug',e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'-'))} placeholder="royal-cuts"/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <Inp label="Salon Phone" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+91 98765 43210"/>
          <Inp label="Salon Email" type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="hello@salon.com"/>
        </div>

        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:6}}>
          <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:12}}>Admin Account</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Inp label="Admin Email" type="email" value={form.adminEmail} onChange={e=>set('adminEmail',e.target.value)} placeholder="admin@salon.com"/>
            <Inp label="Admin Name" value={form.adminName} onChange={e=>set('adminName',e.target.value)} placeholder="Rajesh Kumar"/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:12}}>
            <Inp label="Admin Phone" value={form.adminPhone} onChange={e=>set('adminPhone',e.target.value)} placeholder="+91 99887 76655"/>
            <Inp label="Password" type="password" value={form.adminPassword} onChange={e=>set('adminPassword',e.target.value)} placeholder="Min 6 characters"/>
          </div>
        </div>

        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:6}}>
          <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:12}}>Subscription</div>

          {/* Plan selector with pricing */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
            {Object.entries(PLAN_CFG).map(([key,cfg]) => {
              const Icon = cfg.icon;
              const active = form.plan === key;
              return (
                <button key={key} type="button" onClick={()=>set('plan',key)} style={{padding:'12px 8px',borderRadius:12,border:`2px solid ${active?cfg.color:C.border}`,background:active?`${cfg.color}10`:C.bgCard2,cursor:'pointer',transition:'all 0.15s'}}>
                  <Icon size={18} color={active?cfg.color:C.inkMuted} style={{margin:'0 auto 6px',display:'block'}}/>
                  <div style={{fontSize:12,fontWeight:700,color:active?cfg.color:C.inkMuted}}>{cfg.label}</div>
                  <div style={{fontSize:11,color:C.inkMuted,marginTop:2}}>{fmtMoney(cfg.monthly)}/mo</div>
                </button>
              );
            })}
          </div>

          <DurationPicker value={duration} onChange={setDuration}/>
        </div>

        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:6}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:'uppercase',letterSpacing:'0.1em'}}>💰 Payment Received</div>
            {originalAmt > 0 && <span style={{fontSize:11,color:C.inkMuted}}>Auto-calculated from plan</span>}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Inp label="Amount (₹)" type="number" min="0" value={payment.amount} onChange={e=>setPayment(p=>({...p,amount:e.target.value}))} placeholder="Auto-filled"/>
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              <label style={{fontSize:11,fontWeight:600,color:C.inkMuted,textTransform:'uppercase',letterSpacing:'0.05em'}}>Payment Mode</label>
              <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                {PAYMENT_METHODS.map(m=>(
                  <button key={m.value} type="button" onClick={()=>setPayment(p=>({...p,method:m.value}))} style={{padding:'5px 8px',borderRadius:7,cursor:'pointer',fontSize:11,fontWeight:600,background:payment.method===m.value?C.goldPale:C.bgCard2,border:`1px solid ${payment.method===m.value?C.gold+'60':C.border}`,color:payment.method===m.value?C.gold:C.inkMuted}}>{m.label}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{marginTop:12}}>
            <Inp label="Transaction / UTR Reference (optional)" value={payment.txnId} onChange={e=>setPayment(p=>({...p,txnId:e.target.value}))} placeholder="UPI ref, card last 4, cheque no."/>
          </div>
          {originalAmt > 0 && (
            <div style={{marginTop:12}}>
              <DiscountSection originalAmount={originalAmt} value={discount} onChange={setDiscount}/>
            </div>
          )}
        </div>

        <div style={{display:'flex',gap:10,justifyContent:'flex-end',paddingTop:4}}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={saving}>
            {saving?<RefreshCw size={13} style={{animation:'spin 1s linear infinite'}}/>:<Check size={13}/>}
            {saving?'Creating…':'Create Salon'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};

// ── Edit Salon Modal ──────────────────────────────────────────────────────────
const EditModal = ({salon, onClose, onSaved}) => {
  const [form, setForm] = useState({
    name:salon.name||'', email:salon.email||'', phone:salon.phone||'',
    plan:salon.plan||'plan1', customDomain:salon.customDomain||'',
    features:{
      onlineBooking:  salon.features?.onlineBooking  ??false,
      customWebsite:  salon.features?.customWebsite  ??false,
      whatsappModule: salon.features?.whatsappModule ??true,
      invoices:       salon.features?.invoices       ??true,
      franchiseAccess:salon.features?.franchiseAccess??false,
    },
  });
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState('');
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const setFeat=(k,v)=>setForm(f=>({...f,features:{...f.features,[k]:v}}));

  const Toggle=({checked,onChange,label})=>(
    <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',userSelect:'none'}}>
      <div onClick={()=>onChange(!checked)} style={{width:36,height:20,borderRadius:10,position:'relative',flexShrink:0,background:checked?C.green:C.bgCard,border:`1px solid ${checked?C.greenBorder:C.border}`,transition:'all 0.2s'}}>
        <div style={{width:14,height:14,borderRadius:7,background:'#fff',position:'absolute',top:2,left:checked?19:3,transition:'left 0.2s',boxShadow:'0 1px 4px rgba(0,0,0,0.3)'}}/>
      </div>
      <span style={{fontSize:13,color:C.inkMid}}>{label}</span>
    </label>
  );

  const handleSave=async()=>{
    if(!form.name){setErr('Salon name is required');return;}
    setSaving(true);setErr('');
    try{await api.put(`/superadmin/salons/${salon._id}`,form);onSaved?.();onClose();}
    catch(e){setErr(e.response?.data?.message||'Failed to update');}
    finally{setSaving(false);}
  };

  return (
    <Modal title={`Edit — ${salon.name}`} icon={Edit3} onClose={onClose} maxWidth={580}>
      <div style={{padding:'20px 22px',display:'flex',flexDirection:'column',gap:14}}>
        {err&&<div style={{background:C.redPale,border:`1px solid ${C.redBorder}`,borderRadius:9,padding:'10px 14px',fontSize:13,color:C.red}}>{err}</div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <Inp label="Salon Name" value={form.name} onChange={e=>set('name',e.target.value)}/>
          <Inp label="Phone" value={form.phone} onChange={e=>set('phone',e.target.value)}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <Inp label="Email" type="email" value={form.email} onChange={e=>set('email',e.target.value)}/>
          <Inp label="Custom Domain" value={form.customDomain} onChange={e=>set('customDomain',e.target.value)} placeholder="royalcuts.com"/>
        </div>

        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:6}}>
          <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:12}}>Plan</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
            {Object.entries(PLAN_CFG).map(([key,cfg]) => {
              const Icon = cfg.icon;
              const active = form.plan === key;
              return (
                <button key={key} type="button" onClick={()=>set('plan',key)} style={{padding:'12px 8px',borderRadius:12,border:`2px solid ${active?cfg.color:C.border}`,background:active?`${cfg.color}10`:C.bgCard2,cursor:'pointer'}}>
                  <Icon size={16} color={active?cfg.color:C.inkMuted} style={{margin:'0 auto 6px',display:'block'}}/>
                  <div style={{fontSize:12,fontWeight:700,color:active?cfg.color:C.inkMuted}}>{cfg.label}</div>
                  <div style={{fontSize:11,color:C.inkMuted}}>{fmtMoney(cfg.monthly)}/mo</div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:6}}>
          <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:12}}>Feature Overrides</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <Toggle checked={form.features.whatsappModule}  onChange={v=>setFeat('whatsappModule',v)}  label="WhatsApp Tools"/>
            <Toggle checked={form.features.invoices}        onChange={v=>setFeat('invoices',v)}        label="Invoices"/>
            <Toggle checked={form.features.onlineBooking}   onChange={v=>setFeat('onlineBooking',v)}   label="Online Booking"/>
            <Toggle checked={form.features.customWebsite}   onChange={v=>setFeat('customWebsite',v)}   label="Custom Website"/>
            <Toggle checked={form.features.franchiseAccess} onChange={v=>setFeat('franchiseAccess',v)} label="Franchise Access"/>
          </div>
        </div>

        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={saving}>
            {saving?<RefreshCw size={13} style={{animation:'spin 1s linear infinite'}}/>:<Check size={13}/>}
            {saving?'Saving…':'Save Changes'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};

// ── Renew Modal ───────────────────────────────────────────────────────────────
const RenewModal = ({salon, onClose, onSaved}) => {
  const [duration, setDuration] = useState({mode:'months',months:'12',years:'1',date:''});
  const [plan, setPlan] = useState(salon.plan);
  const [amount, setAmount] = useState('');
  const [discount, setDiscount] = useState({type:'none',value:''});
  const [method, setMethod] = useState('cash');
  const [txnId, setTxnId] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState('');

  // Auto-fill amount when plan or duration changes
  useEffect(() => {
    if (duration.mode==='none'||duration.mode==='date') return;
    const auto = computeAutoAmount(plan, duration.mode, duration.months, duration.years);
    if (auto > 0) setAmount(String(auto));
  }, [plan, duration.mode, duration.months, duration.years]);

  const originalAmt = parseFloat(amount) || 0;
  const discountAmt = (() => {
    if (discount.type==='percent') return Math.round((originalAmt*(parseFloat(discount.value)||0))/100);
    if (discount.type==='amount')  return Math.min(parseFloat(discount.value)||0, originalAmt);
    return 0;
  })();
  const finalAmt = Math.max(0, originalAmt - discountAmt);
  const planCfg = PLAN_CFG[plan] || PLAN_CFG.plan1;

  const handleSave = async () => {
    setSaving(true); setErr('');
    try {
      const body = {plan};
      if (duration.mode==='months')    body.months=parseInt(duration.months);
      else if (duration.mode==='years') body.years=parseInt(duration.years);
      else if (duration.mode==='date')  { if(!duration.date){setErr('Select a date');setSaving(false);return;} body.expiryDate=duration.date; }
      if (originalAmt > 0) {
        body.amount=finalAmt;
        body.originalAmount=originalAmt;
        body.discountAmount=discountAmt;
        body.method=method;
        body.transactionId=txnId;
      }
      const {data} = await api.post(`/superadmin/salons/${salon._id}/renew-subscription`, body);
      setSuccess(true);

      // Print receipt
      const durationLabel = duration.mode==='months' ? `${duration.months} months` : duration.mode==='years' ? `${duration.years} year(s)` : '—';
      if (originalAmt > 0) {
        setTimeout(() => printSubReceipt(
          {...salon, subscriptionExpiry: data.salon?.subscriptionExpiry || salon.subscriptionExpiry},
          {amount:finalAmt, originalAmount:originalAmt, discountAmount:discountAmt, method, transactionId:txnId, plan},
          durationLabel
        ), 500);
      }

      setTimeout(() => { onSaved?.(); onClose(); }, 1500);
    } catch(e) { setErr(e.response?.data?.message||'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Renew Subscription" icon={RotateCcw} iconBg={C.tealPale} iconColor={C.teal} onClose={onClose} maxWidth={560}>
      <div style={{padding:'20px 22px',display:'flex',flexDirection:'column',gap:14}}>

        {/* Current status */}
        <div style={{background:C.bgCard2,borderRadius:11,padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:C.ink}}>{salon.name}</div>
            <div style={{display:'flex',gap:12,marginTop:4,fontSize:12,color:C.inkMuted,flexWrap:'wrap'}}>
              <span>Current: <b style={{color:PLAN_CFG[salon.plan]?.color||C.gold}}>{PLAN_CFG[salon.plan]?.label||salon.plan}</b></span>
              {salon.subscriptionExpiry&&<span>Expires: <b style={{color:C.red}}>{fmtDate(salon.subscriptionExpiry)}</b></span>}
            </div>
          </div>
        </div>

        {err && <div style={{background:C.redPale,border:`1px solid ${C.redBorder}`,borderRadius:9,padding:'10px 14px',fontSize:13,color:C.red}}>{err}</div>}

        {success ? (
          <div style={{background:C.greenPale,border:`1px solid ${C.greenBorder}`,borderRadius:12,padding:'24px',textAlign:'center'}}>
            <Check size={28} color={C.green} style={{margin:'0 auto 10px',display:'block'}}/>
            <div style={{fontWeight:700,color:C.green,fontSize:15}}>Subscription renewed successfully!</div>
            {originalAmt > 0 && <div style={{fontSize:12,color:C.inkMuted,marginTop:4}}>Receipt is being printed…</div>}
          </div>
        ) : (
          <>
            {/* Plan selector */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:10}}>Select Plan</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {Object.entries(PLAN_CFG).map(([key,cfg]) => {
                  const Icon = cfg.icon;
                  const active = plan===key;
                  return (
                    <button key={key} type="button" onClick={()=>setPlan(key)} style={{padding:'12px 8px',borderRadius:12,border:`2px solid ${active?cfg.color:C.border}`,background:active?`${cfg.color}10`:C.bgCard2,cursor:'pointer',transition:'all 0.15s',position:'relative'}}>
                      {salon.plan===key && <div style={{position:'absolute',top:6,right:6,fontSize:8,fontWeight:700,color:cfg.color,background:`${cfg.color}20`,borderRadius:4,padding:'1px 5px'}}>CURRENT</div>}
                      <Icon size={18} color={active?cfg.color:C.inkMuted} style={{margin:'0 auto 6px',display:'block'}}/>
                      <div style={{fontSize:12,fontWeight:700,color:active?cfg.color:C.inkMuted}}>{cfg.label}</div>
                      <div style={{fontSize:11,color:C.inkMuted,marginTop:2}}>{fmtMoney(cfg.monthly)}/mo</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <DurationPicker value={duration} onChange={setDuration}/>

            <div style={{borderTop:`1px solid ${C.border}`,paddingTop:6}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:'uppercase',letterSpacing:'0.1em'}}>💰 Payment Received</div>
                {originalAmt > 0 && <span style={{fontSize:11,color:C.green}}>Auto-calculated ✓</span>}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <Inp label="Amount (₹)" type="number" min="0" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Auto-filled"/>
                <div style={{display:'flex',flexDirection:'column',gap:5}}>
                  <label style={{fontSize:11,fontWeight:600,color:C.inkMuted,textTransform:'uppercase',letterSpacing:'0.05em'}}>Payment Mode</label>
                  <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                    {PAYMENT_METHODS.map(m=>(
                      <button key={m.value} type="button" onClick={()=>setMethod(m.value)} style={{padding:'5px 8px',borderRadius:7,cursor:'pointer',fontSize:11,fontWeight:600,background:method===m.value?C.goldPale:C.bgCard2,border:`1px solid ${method===m.value?C.gold+'60':C.border}`,color:method===m.value?C.gold:C.inkMuted}}>{m.label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{marginTop:12}}>
                <Inp label="Transaction / UTR Reference (optional)" value={txnId} onChange={e=>setTxnId(e.target.value)} placeholder="UPI ref, card last 4, cheque no."/>
              </div>
              {originalAmt > 0 && (
                <div style={{marginTop:12}}>
                  <DiscountSection originalAmount={originalAmt} value={discount} onChange={setDiscount}/>
                </div>
              )}
            </div>

            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
              <Btn variant="teal" onClick={handleSave} disabled={saving}>
                {saving?<RefreshCw size={13} style={{animation:'spin 1s linear infinite'}}/>:<RotateCcw size={13}/>}
                {saving?'Saving…':originalAmt>0?`Renew & Record ${fmtMoney(finalAmt)}`:'Renew Subscription'}
              </Btn>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

// ── Suspend Modal ─────────────────────────────────────────────────────────────
const SuspendModal = ({salon,onClose,onDone}) => {
  const [reason,setReason]=useState('');
  const [saving,setSaving]=useState(false);
  const handle=async()=>{setSaving(true);try{await api.post(`/superadmin/salons/${salon._id}/suspend`,{reason});onDone();onClose();}catch(e){console.error(e);setSaving(false);}};
  return(
    <Modal title={`Suspend "${salon.name}"`} icon={Slash} iconBg={C.redPale} iconColor={C.red} onClose={onClose}>
      <div style={{padding:'20px 22px',display:'flex',flexDirection:'column',gap:14}}>
        <p style={{color:C.inkMid,fontSize:13,margin:0}}>This immediately blocks all access to this salon's dashboard.</p>
        <div style={{display:'flex',flexDirection:'column',gap:5}}>
          <label style={{fontSize:11,fontWeight:600,color:C.inkMuted,textTransform:'uppercase',letterSpacing:'0.05em'}}>Reason (optional)</label>
          <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} placeholder="Non-payment, policy violation…"
            style={{padding:'9px 12px',borderRadius:9,fontSize:13,border:`1px solid ${C.border}`,background:C.bgCard2,color:C.ink,resize:'vertical',outline:'none',fontFamily:'inherit'}}
            onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="danger" onClick={handle} disabled={saving}>{saving?<RefreshCw size={13} style={{animation:'spin 1s linear infinite'}}/>:<Slash size={13}/>}Suspend</Btn>
        </div>
      </div>
    </Modal>
  );
};

// ── Reset Password Modal ──────────────────────────────────────────────────────
const ResetPasswordModal = ({salon,onClose}) => {
  const [pass,setPass]=useState('');
  const [saving,setSaving]=useState(false);
  const [done,setDone]=useState(false);
  const [err,setErr]=useState('');
  const handle=async()=>{if(pass.length<6){setErr('Min 6 characters');return;}setSaving(true);setErr('');try{await api.post(`/superadmin/salons/${salon._id}/reset-password`,{newPassword:pass});setDone(true);}catch(e){setErr(e.response?.data?.message||'Failed');setSaving(false);}};
  return(
    <Modal title="Reset Admin Password" icon={Key} iconBg={C.amberPale} iconColor={C.amber} onClose={onClose}>
      <div style={{padding:'20px 22px',display:'flex',flexDirection:'column',gap:14}}>
        {done
          ?<div style={{textAlign:'center',padding:'20px 0'}}>
             <div style={{width:52,height:52,borderRadius:16,background:C.greenPale,border:`1px solid ${C.greenBorder}`,margin:'0 auto 12px',display:'flex',alignItems:'center',justifyContent:'center'}}><Check size={22} color={C.green}/></div>
             <div style={{fontSize:15,fontWeight:700,color:C.ink}}>Password reset!</div>
             <Btn onClick={onClose} style={{margin:'16px auto 0'}}>Done</Btn>
           </div>
          :<>
             <div style={{background:C.bgCard2,borderRadius:9,padding:'10px 14px',fontSize:13}}>
               Resetting for <b style={{color:C.gold}}>{salon.name}</b>{salon.admin&&<span style={{color:C.inkMuted}}> · {salon.admin.email}</span>}
             </div>
             {err&&<div style={{background:C.redPale,border:`1px solid ${C.redBorder}`,borderRadius:9,padding:'10px 14px',fontSize:13,color:C.red}}>{err}</div>}
             <Inp label="New Password" type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Min 6 characters"/>
             <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
               <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
               <Btn variant="amber" onClick={handle} disabled={saving}>{saving?<RefreshCw size={13} style={{animation:'spin 1s linear infinite'}}/>:<Key size={13}/>}Reset Password</Btn>
             </div>
           </>
        }
      </div>
    </Modal>
  );
};

// ── Action Menu ───────────────────────────────────────────────────────────────
const ActionMenu = ({salon,onRefresh,onEdit,onSuspend,onRenew,onResetPass,onViewDetail}) => {
  const [open,setOpen]=useState(false);

  const handleUnsuspend=async()=>{setOpen(false);try{await api.post(`/superadmin/salons/${salon._id}/unsuspend`);onRefresh();}catch(e){console.error(e);}};
  const handleDelete=async()=>{setOpen(false);if(!confirm(`Deactivate "${salon.name}"?`))return;try{await api.delete(`/superadmin/salons/${salon._id}`);onRefresh();}catch(e){console.error(e);}};

  const ITEMS=[
    {icon:Eye,        label:'View Details',        action:()=>{setOpen(false);onViewDetail();},   color:C.blue,   },
    {icon:Edit3,      label:'Edit Salon',           action:()=>{setOpen(false);onEdit();},         color:C.inkMid, },
    {icon:RotateCcw,  label:'Renew Subscription',   action:()=>{setOpen(false);onRenew();},        color:C.teal,   },
    {icon:Receipt,    label:'View History',          action:()=>{setOpen(false);onViewDetail();},   color:C.gold,   },
    {icon:Key,        label:'Reset Password',        action:()=>{setOpen(false);onResetPass();},    color:C.amber,  },
    salon.isSuspended
      ?{icon:ShieldCheck,label:'Unsuspend',          action:handleUnsuspend,                        color:C.green,  }
      :{icon:Slash,       label:'Suspend Salon',     action:()=>{setOpen(false);onSuspend();},      color:C.red,    },
    {icon:Trash2,label:'Deactivate Salon',           action:handleDelete,                           color:C.red,    divider:true},
  ];

  return (
    <>
      <button onClick={e=>{e.stopPropagation();setOpen(true);}} style={{background:C.bgCard2,border:`1px solid ${C.border}`,borderRadius:8,padding:'6px 8px',cursor:'pointer',color:C.inkMuted,display:'flex',alignItems:'center'}}>
        <MoreHorizontal size={15}/>
      </button>
      {open && createPortal(
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.15}}
          onClick={()=>setOpen(false)}
          style={{position:'fixed',inset:0,background:'rgba(10,9,7,0.7)',backdropFilter:'blur(6px)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <motion.div initial={{opacity:0,scale:0.92,y:12}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95}}
            transition={{duration:0.18,ease:[0.16,1,0.3,1]}}
            onClick={e=>e.stopPropagation()}
            style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:18,overflow:'hidden',width:280,boxShadow:'0 24px 64px rgba(0,0,0,0.6)'}}>
            <div style={{padding:'16px 18px 12px',borderBottom:`1px solid ${C.border}`,background:C.bgCard2}}>
              <div style={{fontSize:13,fontWeight:700,color:C.ink,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{salon.name}</div>
              <div style={{fontSize:11,color:C.inkMuted,marginTop:2}}>{salon.slug}</div>
            </div>
            <div style={{padding:8}}>
              {ITEMS.map((item,i)=>(
                <div key={i}>
                  {item.divider&&<div style={{height:1,background:C.border,margin:'6px 0'}}/>}
                  <button onClick={item.action} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'11px 14px',borderRadius:10,background:'none',border:'none',cursor:'pointer',color:item.color,fontSize:13,fontWeight:500,textAlign:'left',transition:'background 0.1s'}}
                    onMouseEnter={e=>e.currentTarget.style.background=`${item.color}15`}
                    onMouseLeave={e=>e.currentTarget.style.background='none'}>
                    <div style={{width:32,height:32,borderRadius:9,background:`${item.color}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <item.icon size={15} color={item.color}/>
                    </div>
                    {item.label}
                  </button>
                </div>
              ))}
            </div>
            <div style={{padding:'8px',borderTop:`1px solid ${C.border}`}}>
              <button onClick={()=>setOpen(false)} style={{width:'100%',padding:'10px',borderRadius:10,background:C.bgCard2,border:`1px solid ${C.border}`,color:C.inkMuted,fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancel</button>
            </div>
          </motion.div>
        </motion.div>,
        document.body
      )}
    </>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const LIMIT = 25;

export default function SuperAdminSalons() {
  const [searchParams] = useSearchParams();
  const [salons, setSalons] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status')||'');
  const [revenueStats, setRevenueStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [renewTarget, setRenewTarget] = useState(null);
  const [resetPassTarget, setResetPassTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const searchTimer = useRef(null);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const {data} = await api.get('/superadmin/revenue-stats');
      setRevenueStats(data);
    } catch(e) {
      // Fallback: compute from salons
      setRevenueStats({ totalRevenue:0, monthRevenue:0, totalPayments:0, monthPayments:0, activeSalons:0, totalSalons:0, expiringSoon:0, planRevenue:{} });
    } finally { setStatsLoading(false); }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({page, limit:LIMIT});
      if (search) p.set('search', search);
      if (planFilter) p.set('plan', planFilter);
      if (statusFilter) p.set('status', statusFilter);
      const {data} = await api.get(`/superadmin/salons?${p}`);
      setSalons(Array.isArray(data.salons) ? data.salons : []);
      setTotal(data.pagination?.total || 0);
    } catch(e) { console.error(e); setSalons([]); setTotal(0); }
    finally { setLoading(false); }
  }, [page, search, planFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const handleSearchChange = (v) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1); }, 350);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const p = new URLSearchParams();
      if (planFilter) p.set('plan', planFilter);
      if (statusFilter) p.set('status', statusFilter);
      const res = await api.get(`/superadmin/export/salons?${p}`, {responseType:'blob'});
      const url = URL.createObjectURL(res.data);
      Object.assign(document.createElement('a'), {href:url, download:'salons.csv'}).click();
      URL.revokeObjectURL(url);
    } catch(e) { console.error(e); }
    finally { setExporting(false); }
  };

  const pages = Math.ceil(total/LIMIT);

  return (
    <div style={{padding:'24px', maxWidth:1380, margin:'0 auto'}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontFamily:'Cormorant Garamond, Georgia, serif',fontSize:'clamp(20px,3vw,27px)',fontWeight:300,fontStyle:'italic',color:C.ink,margin:0}}>
            Salon Management
          </h1>
          <p style={{fontSize:13,color:C.inkMuted,margin:'4px 0 0'}}>{total} salon{total!==1?'s':''} total</p>
        </div>
        <div style={{display:'flex',gap:9}}>
          <Btn variant="ghost" onClick={handleExport} disabled={exporting} small>
            {exporting?<RefreshCw size={13} style={{animation:'spin 1s linear infinite'}}/>:<Download size={13}/>} Export CSV
          </Btn>
          <Btn onClick={() => setShowCreate(true)} small><Plus size={13}/> New Salon</Btn>
        </div>
      </div>

      {/* Revenue Stats */}
      <RevenueStats stats={revenueStats || {}} loading={statsLoading}/>

      {/* Plan Breakdown */}
      {revenueStats && <PlanBreakdown stats={revenueStats}/>}

      {/* Filters */}
      <div style={{background:C.bgCard,borderRadius:14,border:`1px solid ${C.border}`,padding:'14px 16px',marginBottom:16,display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,background:C.bgCard2,border:`1px solid ${C.border}`,borderRadius:10,padding:'0 12px',height:38,flex:'1 1 220px',maxWidth:320}}>
          <Search size={14} color={C.inkMuted}/>
          <input placeholder="Search salons, email, slug…" onChange={e=>handleSearchChange(e.target.value)}
            style={{flex:1,background:'none',border:'none',outline:'none',fontSize:13,color:C.ink}}/>
        </div>
        <select value={planFilter} onChange={e=>{setPlanFilter(e.target.value);setPage(1);}}
          style={{padding:'0 12px',height:38,borderRadius:10,fontSize:13,border:`1px solid ${C.border}`,background:C.bgCard2,color:planFilter?C.ink:C.inkMuted}}>
          <option value="">All Plans</option>
          <option value="plan1">Basic</option>
          <option value="plan2">Online Booking</option>
          <option value="plan3">Franchise</option>
        </select>
        <select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1);}}
          style={{padding:'0 12px',height:38,borderRadius:10,fontSize:13,border:`1px solid ${C.border}`,background:C.bgCard2,color:statusFilter?C.ink:C.inkMuted}}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
          <option value="expired">Expired</option>
        </select>
        {(planFilter||statusFilter||search) && (
          <button onClick={()=>{setPlanFilter('');setStatusFilter('');setSearch('');setPage(1);}}
            style={{background:'none',border:`1px solid ${C.border}`,borderRadius:9,padding:'7px 12px',cursor:'pointer',color:C.inkMuted,display:'flex',alignItems:'center',gap:6,fontSize:12}}>
            <X size={12}/> Clear
          </button>
        )}
        <span style={{marginLeft:'auto',fontSize:12,color:C.inkMuted}}>{total} results</span>
      </div>

      {/* Table */}
      <div style={{background:C.bgCard,borderRadius:16,border:`1px solid ${C.border}`,overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 160px 110px 140px 130px 100px 52px',padding:'10px 16px',borderBottom:`1px solid ${C.border}`,background:C.bgCard2}}>
          {['Salon','Admin','Plan','Subscription','Created','Status',''].map((h,i)=>(
            <div key={i} style={{fontSize:10,fontWeight:700,color:C.inkMuted,textTransform:'uppercase',letterSpacing:'0.1em'}}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{padding:'48px',display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
            <RefreshCw size={18} color={C.gold} style={{animation:'spin 1s linear infinite'}}/><span style={{color:C.inkMuted,fontSize:13}}>Loading salons…</span>
          </div>
        ) : salons.length === 0 ? (
          <div style={{padding:'48px',textAlign:'center'}}>
            <Building2 size={32} color={C.border} style={{margin:'0 auto 12px',display:'block'}}/>
            <div style={{color:C.inkMuted,fontSize:14}}>No salons found</div>
          </div>
        ) : salons.map((salon,i) => {
          const plan = PLAN_CFG[salon.plan] || PLAN_CFG.plan1;
          const sub = getSubStatus(salon.subscriptionExpiry);
          const SubIcon = sub.icon;
          return (
            <div key={salon._id}
              style={{display:'grid',gridTemplateColumns:'1fr 160px 110px 140px 130px 100px 52px',padding:'13px 16px',alignItems:'center',borderBottom:`1px solid ${C.border}`,transition:'background 0.1s',cursor:'pointer'}}
              onClick={() => setDetailTarget(salon)}
              onMouseEnter={e=>e.currentTarget.style.background=C.bgCard2}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}
            >
              <div style={{paddingRight:12,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:13,color:C.ink,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{salon.name}</div>
                <div style={{fontSize:11,color:C.inkMuted}}>{salon.slug}</div>
              </div>
              <div style={{paddingRight:12,minWidth:0}}>
                <div style={{fontSize:12,color:C.inkMid,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{salon.admin?.name||<span style={{color:C.inkMuted}}>No admin</span>}</div>
                <div style={{fontSize:11,color:C.inkMuted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{salon.admin?.email||''}</div>
              </div>
              <div style={{paddingRight:12}}>
                <Badge color={plan.color} bg={plan.bg} border={plan.border}>{plan.label}</Badge>
              </div>
              <div style={{paddingRight:12}}>
                <div style={{display:'flex',alignItems:'center',gap:5}}>
                  <SubIcon size={12} color={sub.color}/>
                  <span style={{fontSize:12,color:sub.color,fontWeight:500}}>{sub.label}</span>
                </div>
                {salon.subscriptionExpiry&&<div style={{fontSize:11,color:C.inkMuted,marginTop:2}}>{fmtDate(salon.subscriptionExpiry)}</div>}
              </div>
              <div style={{fontSize:12,color:C.inkMuted,paddingRight:12}}>{fmtDate(salon.createdAt)}</div>
              <div style={{paddingRight:12}}>
                {salon.isSuspended
                  ?<Badge color={C.red} bg={C.redPale} border={C.redBorder}>Suspended</Badge>
                  :salon.isActive
                    ?<Badge color={C.green} bg={C.greenPale} border={C.greenBorder}>Active</Badge>
                    :<Badge color={C.inkMuted} bg="rgba(250,246,239,0.05)" border={C.border}>Inactive</Badge>
                }
              </div>
              <div onClick={e=>e.stopPropagation()}>
                <ActionMenu
                  salon={salon}
                  onRefresh={load}
                  onEdit={() => setEditTarget(salon)}
                  onSuspend={() => setSuspendTarget(salon)}
                  onRenew={() => setRenewTarget(salon)}
                  onResetPass={() => setResetPassTarget(salon)}
                  onViewDetail={() => setDetailTarget(salon)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:16,padding:'0 4px'}}>
          <span style={{fontSize:12,color:C.inkMuted}}>Page {page} of {pages} · {total} total</span>
          <div style={{display:'flex',gap:6}}>
            <Btn variant="ghost" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1} small><ChevronLeft size={13}/> Prev</Btn>
            {Array.from({length:Math.min(5,pages)},(_,i)=>{
              const p = Math.max(1,Math.min(page-2+i,pages-4+i));
              return <button key={p} onClick={()=>setPage(p)} style={{width:34,height:34,borderRadius:9,background:p===page?C.goldPale:C.bgCard,border:`1px solid ${p===page?C.gold+'40':C.border}`,color:p===page?C.gold:C.inkMuted,cursor:'pointer',fontSize:12,fontWeight:p===page?700:400}}>{p}</button>;
            })}
            <Btn variant="ghost" onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page>=pages} small>Next <ChevronRight size={13}/></Btn>
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showCreate   && <CreateModal       key="m-create"  onClose={()=>setShowCreate(false)}      onSaved={()=>{load();loadStats();}}/>}
        {editTarget   && <EditModal         key="m-edit"    salon={editTarget}  onClose={()=>setEditTarget(null)}   onSaved={load}/>}
        {suspendTarget&& <SuspendModal      key="m-suspend" salon={suspendTarget} onClose={()=>setSuspendTarget(null)} onDone={load}/>}
        {renewTarget  && <RenewModal        key="m-renew"   salon={renewTarget} onClose={()=>setRenewTarget(null)}  onSaved={()=>{load();loadStats();}}/>}
        {resetPassTarget&&<ResetPasswordModal key="m-reset" salon={resetPassTarget} onClose={()=>setResetPassTarget(null)}/>}
        {detailTarget && <SalonDetailModal  key="m-detail"  salon={detailTarget} onClose={()=>setDetailTarget(null)} onRenew={()=>{setRenewTarget(detailTarget);setDetailTarget(null);}}/>}
      </AnimatePresence>

      <style>{`
        @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}