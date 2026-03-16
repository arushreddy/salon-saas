import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hash, Search, Download, Printer, MessageCircle,
  IndianRupee, Filter, X, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, Sparkles, RefreshCw,
  FileText, LayoutGrid, LayoutList, Tag, Star,
  Wallet, Check, Copy, Loader2, ChevronRight,
  BarChart3, Award, Send, Phone,
} from 'lucide-react';
import api from '@/services/api';
import { loadSalonSettings, getSalonSettings, subscribeSalonSettings, buildWAReceipt, fillTemplate, printInvoice as sharedPrintInvoice } from '@/utils/salonSettings';

// ─── Design Tokens — EXACT match to AdminDashboard ───────────────────────────
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

const ease    = [0.22,0.61,0.36,1];
const fade    = { hidden:{opacity:0,y:14}, show:{opacity:1,y:0,transition:{duration:0.42,ease}} };
const stagger = { hidden:{opacity:0}, show:{opacity:1,transition:{staggerChildren:0.055}} };

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
const fmtDate    = d => { try { return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); } catch{ return '—'; }};
const fmtDt      = d => { try { return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); } catch{ return '—'; }};
const fmtTime    = t => { if(!t) return '—'; try { const [h,m]=t.split(':').map(Number); const p=h>=12?'PM':'AM'; const dh=h>12?h-12:h===0?12:h; return `${dh}:${String(m).padStart(2,'0')} ${p}`; } catch{ return t; }};
const phone10    = p => (p||'').replace(/\D/g,'').slice(-10);
const AV_COLS    = ['#B8860B','#8B6914','#C9952A','#6B4F12','#DAA520','#A07830','#D4A020'];
const avCol      = (n='') => AV_COLS[(n||'').charCodeAt(0)%AV_COLS.length];

// ─── Atoms ───────────────────────────────────────────────────────────────────
function Pulse({ color='#22C55E', size=7 }) {
  return <span style={{ display:'inline-block', width:size, height:size, borderRadius:'50%',
    background:color, animation:'pulseDot 2s ease-in-out infinite',
    boxShadow:`0 0 6px ${color}88` }}/>;
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

// Payment method config
const METHOD = {
  cash:     { label:'Cash',   color:C.green,  bg:C.greenPale,  border:C.greenBorder  },
  upi:      { label:'UPI',    color:C.purple, bg:C.purplePale, border:C.purpleBorder },
  card:     { label:'Card',   color:C.blue,   bg:C.bluePale,   border:C.blueBorder   },
  online:   { label:'Online', color:C.blue,   bg:C.bluePale,   border:C.blueBorder   },
  razorpay: { label:'Online', color:C.blue,   bg:C.bluePale,   border:C.blueBorder   },
};
const methodCfg = m => METHOD[m||'cash'] || { label:(m||'cash').toUpperCase(), color:C.inkLight, bg:C.pageBg, border:C.border };

// ─── Print Invoice — delegates to shared utility (uses DB settings) ─────────
const printInvoice = inv => { sharedPrintInvoice(inv); };

// ─── WhatsApp receipt — uses shared utility (DB settings) ────────────────────
const sendWhatsApp = inv => {
  const ph = phone10(inv.customerPhone || '');
  if (!ph || ph.length < 10) { alert('No valid phone number.'); return; }
  const booking = {
    refNo: inv.invoiceRef || inv.refNo,
    customer: { name: inv.customerName, phone: inv.customerPhone },
    service:  { name: Array.isArray(inv.services) && inv.services.length ? inv.services.map(s=>s.name).join(', ') : inv.service },
    staff:    { name: inv.stylist || inv.staffName },
    date: inv.date || inv.completedAt,
    timeSlot: inv.timeSlot,
    finalAmount: inv.finalAmount,
    totalAmount: inv.totalAmount || inv.finalAmount,
    discountAmount: (inv.couponDiscount || 0) + (inv.manualDiscount || 0),
  };
  const msg = encodeURIComponent(buildWAReceipt(booking, inv.paymentMethod || 'cash'));
  window.open(`https://wa.me/91${ph}?text=${msg}`, '_blank');
};

// ─── Export CSV ───────────────────────────────────────────────────────────────
const exportCSV = (invoices, label='All') => {
  const today = new Date().toISOString().split('T')[0];
  const hdrs = ['S.No','Invoice Ref','Customer','Phone','Service(s)','Stylist','Date','Original','Discount','Final','Payment','Type','Loyalty','Coupon','Notes'];
  const rows = invoices.map((inv,i)=>{
    const svcs = Array.isArray(inv.services)?inv.services.map(s=>s.name).join(' | '):inv.service||'';
    return [i+1,inv.invoiceRef||inv.refNo,`"${inv.customerName||'Walk-in'}"`,
      inv.customerPhone?`+91${phone10(inv.customerPhone)}`:'—',`"${svcs}"`,
      `"${inv.stylist||'—'}"`,fmtDate(inv.date||inv.completedAt),
      inv.totalAmount||0,inv.discountAmount||0,inv.finalAmount||0,
      (inv.paymentMethod||'cash').toUpperCase(),inv.type||'walk-in',
      inv.loyaltyPoints||0,inv.couponCode||'—',`"${inv.notes||''}"`];
  });
  const totalRev = invoices.reduce((s,i)=>s+(i.finalAmount||0),0);
  const csv = [['GLAMOUR SALON — INVOICE REPORT'],[`Filter: ${label}`],[`Exported: ${new Date().toLocaleString('en-IN')}`],[],hdrs,...rows,[],['','TOTAL','','','','','','','',totalRev]].map(r=>Array.isArray(r)?r.join(','):'').join('\n');
  const a = document.createElement('a');
  a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv);
  a.download=`Glamour-Invoices-${today}.csv`;
  a.click();
};

// ─── Print Batch Report ───────────────────────────────────────────────────────
const printReport = (invoices, stats) => {
  const rows = invoices.map((inv,i)=>`
    <tr style="${i%2===0?'background:#FDFAF4':''}">
      <td>${i+1}</td><td style="color:#B8860B;font-weight:700">${inv.invoiceRef||inv.refNo}</td>
      <td>${inv.customerName||'Walk-in'}</td>
      <td>${inv.service||((inv.services||[])[0]?.name)||'—'}</td>
      <td>${inv.stylist||'—'}</td>
      <td>${fmtDate(inv.date||inv.completedAt)}</td>
      <td style="text-align:right;font-weight:700">₹${fmt(inv.finalAmount)}</td>
      <td style="text-align:center;color:${(inv.discountAmount||0)>0?'#15803D':'#9C8660'}">${(inv.discountAmount||0)>0?`₹${fmt(inv.discountAmount)}`:'—'}</td>
      <td style="text-align:center;text-transform:uppercase">${inv.paymentMethod||'cash'}</td>
    </tr>`).join('');
  const win = window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>Invoice Report</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>body{font-family:'DM Sans',sans-serif;padding:32px;color:#1A1208;max-width:1100px;margin:auto}
    h1{font-family:'Playfair Display',serif;font-size:28px;color:#0E0B06;margin-bottom:4px}
    .sub{color:#9C8660;font-size:12px;margin-bottom:24px}
    .stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px}
    .stat{background:#FFF8E7;border:1px solid #DFD0A8;border-radius:12px;padding:14px;text-align:center}
    .stat .v{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:#B8860B}
    .stat .l{font-size:10px;color:#9C8660;text-transform:uppercase;letter-spacing:0.12em;margin-top:3px;font-weight:600}
    table{width:100%;border-collapse:collapse;border:1px solid #DFD0A8}
    th{background:#FFF8E7;padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#9C8660;font-weight:700;border-bottom:2px solid #DFD0A8}
    td{padding:8px 12px;font-size:11px;border-bottom:1px solid #F4EDE0}
    .total-row td{padding:12px;font-weight:800;font-size:13px;background:#FFF8E7;border-top:2px solid #B8860B;color:#B8860B}
    @media print{body{padding:12px}}</style></head><body>
    <h1>✂ {getSalonSettings().salonName || 'Salon'} — Invoice Report</h1>
    <div class="sub">Generated: ${new Date().toLocaleString('en-IN')} · ${invoices.length} invoices</div>
    <div class="stats">
      <div class="stat"><div class="v">${invoices.length}</div><div class="l">Invoices</div></div>
      <div class="stat"><div class="v">₹${fmt(stats.revenue)}</div><div class="l">Revenue</div></div>
      <div class="stat"><div class="v">₹${fmt(Math.round(stats.avg))}</div><div class="l">Avg Ticket</div></div>
      <div class="stat"><div class="v">₹${fmt(stats.discount)}</div><div class="l">Discounts</div></div>
      <div class="stat"><div class="v">${stats.online}/${stats.walkin}</div><div class="l">Online/Walk-in</div></div>
    </div>
    <table><thead><tr>
      <th>#</th><th>Invoice Ref</th><th>Customer</th><th>Service</th><th>Stylist</th>
      <th>Date</th><th>Amount</th><th>Discount</th><th>Payment</th>
    </tr></thead><tbody>${rows}</tbody>
    <tr class="total-row"><td colspan="6">TOTAL (${invoices.length})</td><td>₹${fmt(stats.revenue)}</td><td>₹${fmt(stats.discount)}</td><td></td></tr>
    </table>
    <script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
    </body></html>`);
  win.document.close();
};

// ─── Invoice Detail Drawer ────────────────────────────────────────────────────
function InvoiceDrawer({ inv, onClose }) {
  const [copied, setCopied] = useState(false);
  const svcs = Array.isArray(inv.services)&&inv.services.length ? inv.services : (inv.service?[{name:inv.service,price:inv.totalAmount}]:[]);
  const disc = inv.discountAmount||0;
  const ref  = inv.invoiceRef||inv.refNo;

  const copyRef = () => {
    navigator.clipboard.writeText(ref).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); });
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', justifyContent:'flex-end',
        background:'rgba(15,12,7,0.72)', backdropFilter:'blur(8px)' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <motion.div initial={{x:480,opacity:0}} animate={{x:0,opacity:1}} exit={{x:480,opacity:0}}
        transition={{type:'spring',damping:28,stiffness:260}}
        style={{ width:'100%', maxWidth:440, display:'flex', flexDirection:'column', height:'100%',
          background:C.cardBg, borderLeft:`1px solid ${C.border}` }}>

        {/* Header */}
        <div style={{ position:'relative', overflow:'hidden', padding:'22px 22px 18px',
          background:`linear-gradient(145deg,${C.heroBg},${C.heroBg2})` }}>
          <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(45deg,#B8860B 0,#B8860B 1px,transparent 0,transparent 50%)', backgroundSize:'20px 20px', opacity:0.05 }}/>
          <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle,rgba(218,165,32,0.12) 0%,transparent 70%)' }}/>
          <div style={{ position:'relative', display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <Sparkles size={10} color='#F0D878'/>
                <span style={{ fontSize:10, fontWeight:800, letterSpacing:'0.2em', textTransform:'uppercase', color:'#F0D878' }}>Invoice Detail</span>
              </div>
              <button onClick={copyRef} style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', cursor:'pointer', padding:0 }}>
                <span style={{ fontFamily:'Playfair Display,serif', fontSize:20, fontWeight:700, color:'#fff' }}>{ref}</span>
                <div style={{ width:24, height:24, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.1)' }}>
                  {copied ? <Check size={11} color='#fff'/> : <Copy size={11} color='#fff'/>}
                </div>
              </button>
              <div style={{ fontSize:11, color:'#5A4020', marginTop:4 }}>{fmtDt(inv.completedAt||inv.date)}</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>printInvoice(inv)}
                style={{ width:36, height:36, borderRadius:10, border:'1px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.08)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Printer size={14} color='#fff'/>
              </button>
              {inv.customerPhone&&(
                <button onClick={()=>sendWhatsApp(inv)}
                  style={{ width:36, height:36, borderRadius:10, border:`1px solid ${C.wa}40`, background:`${C.wa}20`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <MessageCircle size={14} color={C.wa}/>
                </button>
              )}
              <button onClick={onClose}
                style={{ width:36, height:36, borderRadius:10, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <X size={14} color='#fff'/>
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:22 }}>
          {/* Amount hero */}
          <div style={{ textAlign:'center', padding:'22px 16px', borderRadius:20, marginBottom:16,
            background:`linear-gradient(135deg,${C.goldPale},#FFF5D6)`, border:`2px solid ${C.gold}30` }}>
            <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.14em', color:C.gold, marginBottom:8 }}>Total Paid</div>
            <div style={{ fontSize:44, fontWeight:800, color:C.ink, lineHeight:1, fontFamily:'Playfair Display,serif' }}>
              {fmtRs(inv.finalAmount)}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:7, justifyContent:'center', marginTop:10 }}>
              {(() => { const m=methodCfg(inv.paymentMethod); return (
                <span style={{ padding:'3px 10px', borderRadius:100, fontSize:11, fontWeight:700, background:m.bg, color:m.color, border:`1px solid ${m.border}` }}>{m.label}</span>
              );})()}
              {disc>0&&<span style={{ padding:'3px 10px', borderRadius:100, fontSize:11, fontWeight:700, background:C.greenPale, color:C.green, border:`1px solid ${C.greenBorder}` }}>−{fmtRs(disc)} saved</span>}
              {(inv.loyaltyPoints||0)>0&&<span style={{ padding:'3px 10px', borderRadius:100, fontSize:11, fontWeight:700, background:C.goldPale, color:C.gold, border:`1px solid ${C.border}` }}>+{inv.loyaltyPoints} pts ⭐</span>}
            </div>
          </div>

          {/* Customer info */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.15em', color:C.inkLight, marginBottom:10 }}>Customer</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[['Name',inv.customerName||'Walk-in'],['Phone',inv.customerPhone?`+91 ${phone10(inv.customerPhone)}`:'—'],
                ['Date',fmtDate(inv.date||inv.completedAt)],['Time',fmtTime(inv.timeSlot?.start)]].map(([l,v])=>(
                <div key={l} style={{ padding:'10px 13px', borderRadius:12, background:C.pageBg, border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:C.inkGhost, marginBottom:3 }}>{l}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:C.ink }}>{v||'—'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Services */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.15em', color:C.inkLight, marginBottom:10 }}>Services</div>
            <div style={{ borderRadius:14, overflow:'hidden', border:`1px solid ${C.border}` }}>
              {svcs.map((s,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 14px',
                  background:i%2===0?C.white:C.pageBg, borderBottom:i<svcs.length-1?`1px solid ${C.border}`:'none' }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:C.ink }}>{s.name}</div>
                    {s.duration&&<div style={{ fontSize:10, color:C.inkLight }}>{s.duration} min</div>}
                  </div>
                  <div style={{ fontSize:14, fontWeight:800, color:C.gold, fontFamily:'Playfair Display,serif' }}>₹{fmt(s.price)}</div>
                </div>
              ))}
              {(inv.couponDiscount||0)>0&&(
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:C.greenPale, borderTop:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.green }}>🏷 Coupon ({inv.couponCode})</div>
                  <div style={{ fontSize:13, fontWeight:800, color:C.green }}>−{fmtRs(inv.couponDiscount)}</div>
                </div>
              )}
              {(inv.manualDiscount||0)>0&&(
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:C.greenPale, borderTop:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.green }}>✂ Staff Discount</div>
                  <div style={{ fontSize:13, fontWeight:800, color:C.green }}>−{fmtRs(inv.manualDiscount)}</div>
                </div>
              )}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', background:C.goldPale, borderTop:`2px solid ${C.gold}` }}>
                <div style={{ fontSize:13, fontWeight:800, color:C.gold }}>Total Paid</div>
                <div style={{ fontSize:16, fontWeight:800, color:C.gold, fontFamily:'Playfair Display,serif' }}>{fmtRs(inv.finalAmount)}</div>
              </div>
            </div>
          </div>

          {/* Booking meta */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.15em', color:C.inkLight, marginBottom:10 }}>Booking Details</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[['Stylist',inv.stylist||inv.staffName],['Type',inv.type||'Walk-in'],
                ['Booking Ref',inv.invoiceRef||inv.refNo],['Completed',fmtDt(inv.completedAt)]].map(([l,v])=>(
                <div key={l} style={{ padding:'10px 13px', borderRadius:12, background:C.pageBg, border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:C.inkGhost, marginBottom:3 }}>{l}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:l==='Booking Ref'?C.gold:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v||'—'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Loyalty */}
          {(inv.loyaltyPoints||0)>0&&(
            <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderRadius:16,
              marginBottom:14, background:`linear-gradient(145deg,${C.heroBg},${C.heroBg2})` }}>
              <div style={{ width:44, height:44, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center',
                background:'rgba(218,165,32,0.2)', fontSize:22 }}>⭐</div>
              <div>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:'#5A4020' }}>Loyalty Points Earned</div>
                <div style={{ fontSize:24, fontWeight:800, color:'#DAA520', fontFamily:'Playfair Display,serif' }}>+{inv.loyaltyPoints} pts</div>
              </div>
            </div>
          )}

          {/* Notes */}
          {inv.notes&&(
            <div style={{ padding:'12px 14px', borderRadius:12, background:C.pageBg, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:C.inkGhost, marginBottom:4 }}>Notes</div>
              <div style={{ fontSize:12, color:C.inkMid, fontStyle:'italic' }}>{inv.notes}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 18px', display:'flex', gap:10,
          borderTop:`1px solid ${C.border}`, background:C.white }}>
          <button onClick={()=>printInvoice(inv)}
            style={{ flex:1, padding:'11px', borderRadius:12, border:`1px solid ${C.border}`, background:C.pageBg,
              cursor:'pointer', fontSize:12, fontWeight:700, color:C.inkMid, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <Printer size={13}/> Print
          </button>
          {inv.customerPhone&&(
            <button onClick={()=>sendWhatsApp(inv)}
              style={{ flex:1, padding:'11px', borderRadius:12, border:`1px solid ${C.wa}30`, background:C.waPale,
                cursor:'pointer', fontSize:12, fontWeight:700, color:C.green, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <MessageCircle size={13}/> WhatsApp
            </button>
          )}
          <button onClick={()=>exportCSV([inv],ref)}
            style={{ flex:1, padding:'11px', borderRadius:12, border:'none',
              background:`linear-gradient(135deg,${C.gold},${C.goldLight})`,
              cursor:'pointer', fontSize:12, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <Download size={13}/> Export
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function RevenueSparkline({ invoices }) {
  const days = useMemo(()=>{
    const map={};
    invoices.forEach(inv=>{ const d=(inv.date||inv.completedAt||'').toString().split('T')[0]; if(d) map[d]=(map[d]||0)+(inv.finalAmount||0); });
    return Object.entries(map).sort(([a],[b])=>a.localeCompare(b)).slice(-14);
  },[invoices]);
  if (days.length<2) return null;
  const max=Math.max(...days.map(([,v])=>v),1);
  const H=44,W=120;
  const pts=days.map(([,v],i)=>({x:(i/(days.length-1))*W, y:H-(v/max)*H}));
  const path=pts.map((p,i)=>i===0?`M${p.x},${p.y}`:`L${p.x},${p.y}`).join(' ');
  const area=path+` L${pts[pts.length-1].x},${H} L0,${H} Z`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{overflow:'visible'}}>
      <defs>
        <linearGradient id="spk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.gold} stopOpacity={0.35}/>
          <stop offset="100%" stopColor={C.gold} stopOpacity={0}/>
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spk)"/>
      <path d={path} stroke={C.gold} strokeWidth={2} fill="none" strokeLinejoin="round"/>
      <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r={3.5} fill={C.gold} stroke={C.white} strokeWidth={1.5}/>
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════
export default function AdminInvoices() {
  const [invoices,      setInvoices]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [syncing,       setSyncing]       = useState(false);
  const [syncStatus,    setSyncStatus]    = useState('idle'); // idle|live|error
  const [lastSyncTs,    setLastSyncTs]    = useState(null);
  const [summary,       setSummary]       = useState({totalRevenue:0,totalDiscounts:0,totalCount:0});
  const [search,        setSearch]        = useState('');
  const [refSearch,     setRefSearch]     = useState('');
  const [refResult,     setRefResult]     = useState(null);
  const [refSearching,  setRefSearching]  = useState(false);
  const [typeFilter,    setTypeFilter]    = useState('');
  const [methodFilter,  setMethodFilter]  = useState('');
  const [stylistFilter, setStylistFilter] = useState('');
  const [dateFrom,      setDateFrom]      = useState('');
  const [dateTo,        setDateTo]        = useState('');
  const [sort,          setSort]          = useState('newest');
  const [viewMode,      setViewMode]      = useState('list');
  const [selected,      setSelected]      = useState(null);
  const [showFilters,   setShowFilters]   = useState(false);
  const [checkedRefs,   setCheckedRefs]   = useState(new Set());
  const [page,          setPage]          = useState(1);
  const [totalPages,    setTotalPages]    = useState(1);
  const [expandedId,    setExpandedId]    = useState(null);
  const pollRef = useRef(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadInvoices = useCallback(async (pg=1) => {
    setSyncing(true);
    try {
      const params = new URLSearchParams({ page:pg, limit:50 });
      if (dateFrom)     params.set('startDate', dateFrom);
      if (dateTo)       params.set('endDate', dateTo);
      if (methodFilter) params.set('paymentMethod', methodFilter);
      if (typeFilter)   params.set('type', typeFilter);
      const { data } = await api.get(`/invoices?${params}`);
      setInvoices(data.invoices||[]);
      setTotalPages(data.pagination?.pages||1);
      if (data.summary) setSummary(data.summary);
      setLastSyncTs(Date.now());
      setSyncStatus('live');
    } catch {
      setSyncStatus('error');
    } finally {
      setSyncing(false); setLoading(false);
    }
  }, [dateFrom, dateTo, methodFilter, typeFilter]);

  const deltaPoll = useCallback(async () => {
    if (!lastSyncTs) return;
    try {
      const { data } = await api.get(`/invoices/since/${lastSyncTs}`);
      if (data.invoices?.length) {
        setInvoices(prev => {
          const map = new Map(prev.map(i=>[i._id||i.invoiceRef,i]));
          data.invoices.forEach(i=>map.set(i._id||i.invoiceRef,i));
          return Array.from(map.values());
        });
      }
      setLastSyncTs(data.serverTs||Date.now());
      setSyncStatus('live');
    } catch { setSyncStatus('error'); }
  }, [lastSyncTs]);

  useEffect(() => { loadInvoices(1); }, [loadInvoices]);
  useEffect(() => { loadSalonSettings(); return subscribeSalonSettings(() => {}); }, []);
  useEffect(() => { pollRef.current=setInterval(deltaPoll,15000); return()=>clearInterval(pollRef.current); }, [deltaPoll]);
  useEffect(() => { const f=()=>deltaPoll(); window.addEventListener('focus',f); return()=>window.removeEventListener('focus',f); }, [deltaPoll]);

  // ── Ref search ────────────────────────────────────────────────────────────
  const doRefSearch = async () => {
    if (!refSearch.trim()) return;
    setRefSearching(true); setRefResult(null);
    try {
      const { data } = await api.get(`/invoices/search?refNo=${encodeURIComponent(refSearch.trim())}`);
      setRefResult(data.invoice||null);
    } catch { setRefResult(null); }
    finally { setRefSearching(false); }
  };

  const stylists = useMemo(()=>[...new Set(invoices.map(i=>i.stylist||i.staffName).filter(Boolean))],[invoices]);

  const filtered = useMemo(()=>{
    let list = invoices.filter(inv=>{
      const q=search.toLowerCase();
      const matchQ = !q||(inv.customerName||'').toLowerCase().includes(q)||(inv.invoiceRef||inv.refNo||'').toLowerCase().includes(q)||(inv.service||'').toLowerCase().includes(q)||(inv.stylist||'').toLowerCase().includes(q)||(inv.customerPhone||'').includes(q)||(Array.isArray(inv.services)?inv.services.some(s=>(s.name||'').toLowerCase().includes(q)):false);
      const matchStylist = !stylistFilter||(inv.stylist||inv.staffName)===stylistFilter;
      return matchQ && matchStylist;
    });
    if (sort==='newest')   list.sort((a,b)=>new Date(b.completedAt||b.date)-new Date(a.completedAt||a.date));
    if (sort==='oldest')   list.sort((a,b)=>new Date(a.completedAt||a.date)-new Date(b.completedAt||b.date));
    if (sort==='highest')  list.sort((a,b)=>(b.finalAmount||0)-(a.finalAmount||0));
    if (sort==='lowest')   list.sort((a,b)=>(a.finalAmount||0)-(b.finalAmount||0));
    if (sort==='discount') list.sort((a,b)=>(b.discountAmount||0)-(a.discountAmount||0));
    return list;
  },[invoices,search,stylistFilter,sort]);

  const stats = useMemo(()=>({
    revenue:  filtered.reduce((s,i)=>s+(i.finalAmount||0),0),
    discount: filtered.reduce((s,i)=>s+(i.discountAmount||0),0),
    loyalty:  filtered.reduce((s,i)=>s+(i.loyaltyPoints||0),0),
    avg:      filtered.length?filtered.reduce((s,i)=>s+(i.finalAmount||0),0)/filtered.length:0,
    online:   filtered.filter(i=>i.type==='online').length,
    walkin:   filtered.filter(i=>i.type==='walk-in').length,
    cash:     filtered.filter(i=>(i.paymentMethod||'cash')==='cash').length,
    upi:      filtered.filter(i=>i.paymentMethod==='upi').length,
    card:     filtered.filter(i=>i.paymentMethod==='card').length,
  }),[filtered]);

  const hasFilters = search||typeFilter||methodFilter||stylistFilter||dateFrom||dateTo;
  const clearFilters = () => { setSearch(''); setTypeFilter(''); setMethodFilter(''); setStylistFilter(''); setDateFrom(''); setDateTo(''); };

  const toggleCheck = ref => setCheckedRefs(s=>{ const n=new Set(s); n.has(ref)?n.delete(ref):n.add(ref); return n; });
  const toggleAll   = () => checkedRefs.size===filtered.length ? setCheckedRefs(new Set()) : setCheckedRefs(new Set(filtered.map(i=>i.invoiceRef||i.refNo)));
  const bulkSelected = filtered.filter(i=>checkedRefs.has(i.invoiceRef||i.refNo));

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'80px 0', flexDirection:'column', gap:12 }}>
      <Loader2 size={28} color={C.gold} style={{ animation:'spin 0.8s linear infinite' }}/>
      <div style={{ fontSize:12, color:C.inkLight }}>Loading invoices…</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      style={{ fontFamily:'DM Sans,sans-serif' }}>

      <AnimatePresence>
        {selected && <InvoiceDrawer inv={selected} onClose={()=>setSelected(null)}/>}
      </AnimatePresence>

      {/* ══ HERO ════════════════════════════════════════════════════════════ */}
      <motion.div variants={fade}
        style={{ position:'relative', overflow:'hidden', borderRadius:28, marginBottom:20,
          background:`linear-gradient(145deg,${C.heroBg} 0%,${C.heroBg2} 55%,#120D04 100%)`,
          border:'1px solid #2E2410', boxShadow:'0 12px 48px rgba(0,0,0,0.45)' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(45deg,#B8860B 0,#B8860B 1px,transparent 0,transparent 50%)', backgroundSize:'20px 20px', opacity:0.05 }}/>
        <div style={{ position:'absolute', top:-80, right:-60, width:360, height:360, borderRadius:'50%', background:'radial-gradient(circle,rgba(218,165,32,0.12) 0%,transparent 70%)' }}/>
        <div style={{ position:'relative', padding:'28px 30px' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:14 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
                <Sparkles size={10} color='#F0D878'/>
                <span style={{ fontSize:10, fontWeight:800, letterSpacing:'0.22em', textTransform:'uppercase', color:'#F0D878' }}>Billing & Receipts</span>
                <span style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:100,
                  fontSize:10, fontWeight:700,
                  background:syncStatus==='live'?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)',
                  border:`1px solid ${syncStatus==='live'?'rgba(34,197,94,0.2)':'rgba(239,68,68,0.2)'}`,
                  color:syncStatus==='live'?'#6EE7B7':'#FCA5A5' }}>
                  <Pulse color={syncStatus==='live'?'#22C55E':'#EF4444'} size={5}/>
                  {syncStatus==='live'?'Live':'Offline'}
                </span>
              </div>
              <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:32, fontWeight:700, color:'#fff', margin:0, lineHeight:1.15 }}>
                Invoice History
              </h1>
              <p style={{ fontSize:13, color:'#5A4020', margin:'6px 0 0' }}>
                {summary.totalCount} total invoices · {fmtK(summary.totalRevenue)} all-time revenue
                {lastSyncTs&&` · synced ${new Date(lastSyncTs).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`}
              </p>
            </div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
              <button onClick={()=>loadInvoices(page)} disabled={syncing}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:100,
                  border:'1px solid rgba(255,255,255,0.13)', background:'rgba(255,255,255,0.07)',
                  color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', opacity:syncing?0.5:1 }}>
                <RefreshCw size={12} style={{ animation:syncing?'spin 0.8s linear infinite':'none' }}/> Refresh
              </button>
              <button onClick={()=>printReport(filtered,stats)} disabled={!filtered.length}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:14,
                  border:'1px solid rgba(255,255,255,0.13)', background:'rgba(255,255,255,0.07)',
                  color:'#fff', fontWeight:600, fontSize:13, cursor:'pointer', opacity:!filtered.length?0.4:1 }}>
                <Printer size={14}/> Print Report
              </button>
              <button onClick={()=>exportCSV(filtered)} disabled={!filtered.length}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:14,
                  border:'none', background:`linear-gradient(135deg,${C.gold},${C.goldLight})`, color:'#fff',
                  fontWeight:700, fontSize:13, cursor:'pointer', boxShadow:`0 6px 20px ${C.gold}40`, opacity:!filtered.length?0.4:1 }}>
                <Download size={14}/> Export CSV
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ══ KPI CARDS ═══════════════════════════════════════════════════════ */}
      <motion.div variants={stagger}
        style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { icon:FileText,    label:'Invoices',    value:String(filtered.length),    sub:`of ${summary.totalCount} total`,      color:C.gold,   bg:C.goldPale,   border:C.border },
          { icon:IndianRupee, label:'Revenue',     value:fmtK(stats.revenue),        sub:'filtered total',                       color:C.green,  bg:C.greenPale,  border:C.greenBorder },
          { icon:TrendingUp,  label:'Avg Ticket',  value:fmtRs(Math.round(stats.avg)),sub:'per invoice',                        color:C.blue,   bg:C.bluePale,   border:C.blueBorder },
          { icon:Tag,         label:'Discounts',   value:fmtK(stats.discount),       sub:'total given',                          color:C.amber,  bg:C.amberPale,  border:C.amberBorder },
          { icon:Star,        label:'Loyalty Pts', value:`+${fmt(stats.loyalty)}`,   sub:'pts awarded',                          color:C.purple, bg:C.purplePale, border:C.purpleBorder },
          { icon:Wallet,      label:'Cash/UPI/Card',value:`${stats.cash}/${stats.upi}/${stats.card}`, sub:'by payment method', color:C.teal,   bg:C.tealPale,   border:C.tealBorder },
        ].map(k=>(
          <motion.div key={k.label} variants={fade}
            whileHover={{ y:-4, boxShadow:`0 20px 48px ${k.color}22` }}
            style={{ background:C.cardBg, border:`1px solid ${k.border}`, borderRadius:20,
              padding:'18px 18px 14px', boxShadow:`0 2px 16px ${k.color}0A`, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-20, right:-20, width:70, height:70, borderRadius:'50%', background:`${k.color}12` }}/>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
              <div style={{ width:40, height:40, borderRadius:13, display:'flex', alignItems:'center', justifyContent:'center', background:k.bg, border:`1px solid ${k.border}` }}>
                <k.icon size={18} color={k.color}/>
              </div>
            </div>
            <div style={{ fontSize:26, fontWeight:800, color:C.ink, lineHeight:1, fontFamily:'Playfair Display,serif', marginBottom:4 }}>{k.value}</div>
            <div style={{ fontSize:12, fontWeight:700, color:C.inkMid, marginBottom:3 }}>{k.label}</div>
            <div style={{ fontSize:11, color:C.inkLight }}>{k.sub}</div>
            <div style={{ marginTop:12, height:2, borderRadius:2, background:`linear-gradient(to right,${k.color},transparent)` }}/>
          </motion.div>
        ))}
      </motion.div>

      {/* ══ SPARKLINE STRIP ═════════════════════════════════════════════════ */}
      {invoices.length>3&&(
        <motion.div variants={fade}
          style={{ background:C.cardBg, border:`1px solid ${C.border}`, borderRadius:18,
            padding:'14px 20px', marginBottom:18, display:'flex', alignItems:'center', gap:20 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.15em', color:C.inkLight, marginBottom:2 }}>Revenue Trend</div>
            <div style={{ fontSize:11, color:C.inkGhost }}>Daily · last 14 days</div>
          </div>
          <div style={{ flex:1 }}><RevenueSparkline invoices={filtered}/></div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:20, fontWeight:800, color:C.ink, fontFamily:'Playfair Display,serif' }}>{fmtK(summary.totalRevenue)}</div>
            <div style={{ fontSize:11, color:C.inkLight }}>all-time · {summary.totalCount} invoices</div>
          </div>
        </motion.div>
      )}

      {/* ══ REF SEARCH ══════════════════════════════════════════════════════ */}
      <motion.div variants={fade}
        style={{ background:C.cardBg, border:`1.5px solid ${C.gold}30`, borderRadius:20, padding:'16px 20px', marginBottom:18 }}>
        <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.15em', color:C.gold, marginBottom:10 }}>
          🔍 Quick Lookup — Booking Ref No
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, background:C.pageBg,
            borderRadius:12, padding:'9px 13px', border:`1.5px solid ${C.border}` }}>
            <Hash size={13} color={C.inkLight}/>
            <input value={refSearch} onChange={e=>setRefSearch(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&doRefSearch()}
              placeholder="GLM-250310-A3F7 — paste booking ref…"
              style={{ flex:1, border:'none', background:'transparent', fontSize:13, color:C.ink, outline:'none', fontFamily:'inherit' }}/>
          </div>
          <button onClick={doRefSearch} disabled={!refSearch.trim()||refSearching}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 20px', borderRadius:12, border:'none',
              background:refSearch.trim()&&!refSearching?`linear-gradient(135deg,${C.gold},${C.goldLight})`:C.border,
              color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', opacity:(!refSearch.trim()||refSearching)?0.5:1, whiteSpace:'nowrap' }}>
            {refSearching?<Loader2 size={13} style={{ animation:'spin 0.8s linear infinite'}}/>:<Search size={13}/>}
            {refSearching?'Finding…':'Find Invoice'}
          </button>
          {(refResult||refSearch)&&(
            <button onClick={()=>{setRefResult(null);setRefSearch('');}}
              style={{ width:38, height:38, borderRadius:10, border:`1px solid ${C.border}`, background:C.pageBg, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <X size={13} color={C.inkLight}/>
            </button>
          )}
        </div>

        <AnimatePresence>
          {refResult&&(
            <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0}}
              style={{ marginTop:12, padding:'12px 16px', borderRadius:14,
                background:C.greenPale, border:`1.5px solid ${C.greenBorder}`,
                display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center',
                  background:`linear-gradient(135deg,${C.gold},${C.goldLight})`, fontSize:13, fontWeight:800, color:'#fff' }}>
                  {initials(refResult.customerName)}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:C.ink }}>{refResult.customerName||'Walk-in'}</div>
                  <div style={{ fontSize:11, color:C.inkLight }}>
                    {refResult.invoiceRef||refResult.refNo} · {fmtDate(refResult.date||refResult.completedAt)} · {fmtRs(refResult.finalAmount)}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>setSelected(refResult)}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 13px', borderRadius:10, border:'none',
                    background:`linear-gradient(135deg,${C.gold},${C.goldLight})`, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  <FileText size={12}/> View
                </button>
                <button onClick={()=>printInvoice(refResult)}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 13px', borderRadius:10, border:`1px solid ${C.border}`,
                    background:C.cardBg, color:C.inkMid, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  <Printer size={12}/> Print
                </button>
                {refResult.customerPhone&&(
                  <button onClick={()=>sendWhatsApp(refResult)}
                    style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 13px', borderRadius:10, border:`1px solid ${C.wa}30`,
                      background:C.waPale, color:C.green, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    <MessageCircle size={12}/> WhatsApp
                  </button>
                )}
              </div>
            </motion.div>
          )}
          {refSearching===false&&refSearch&&!refResult&&(
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              style={{ marginTop:10, padding:'10px 14px', borderRadius:12, background:C.redPale, border:`1px solid ${C.redBorder}`, fontSize:12, color:C.red, fontWeight:600 }}>
              No invoice found for "{refSearch}"
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ══ FILTERS & SEARCH ════════════════════════════════════════════════ */}
      <motion.div variants={fade}
        style={{ background:C.cardBg, border:`1px solid ${C.border}`, borderRadius:20, padding:'14px 18px', marginBottom:18 }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:12 }}>
          {/* Search */}
          <div style={{ flex:1, minWidth:200, display:'flex', alignItems:'center', gap:8,
            background:C.pageBg, borderRadius:12, padding:'9px 12px', border:`1px solid ${C.border}` }}>
            <Search size={13} color={C.inkLight}/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search customer, service, stylist, phone…"
              style={{ flex:1, border:'none', background:'transparent', fontSize:13, color:C.ink, outline:'none', fontFamily:'inherit' }}/>
            {search&&<button onClick={()=>setSearch('')} style={{ border:'none', background:'none', cursor:'pointer' }}><X size={11} color={C.inkGhost}/></button>}
          </div>
          {/* Sort */}
          <select value={sort} onChange={e=>setSort(e.target.value)}
            style={{ padding:'9px 12px', borderRadius:12, border:`1px solid ${C.border}`, background:C.pageBg, color:C.inkMid, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Amount</option>
            <option value="lowest">Lowest Amount</option>
            <option value="discount">Most Discounted</option>
          </select>
          {/* View toggle */}
          <div style={{ display:'flex', gap:2, padding:4, borderRadius:12, background:C.pageBg, border:`1px solid ${C.border}` }}>
            {[[LayoutList,'list'],[LayoutGrid,'grid']].map(([Icon,v])=>(
              <button key={v} onClick={()=>setViewMode(v)}
                style={{ width:34, height:34, borderRadius:9, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                  background:viewMode===v?C.cardBg:'transparent', boxShadow:viewMode===v?'0 1px 6px rgba(0,0,0,0.08)':'none' }}>
                <Icon size={15} color={viewMode===v?C.gold:C.inkGhost}/>
              </button>
            ))}
          </div>
          {/* Filter toggle */}
          <button onClick={()=>setShowFilters(v=>!v)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 14px', borderRadius:12,
              border:`1px solid ${showFilters?C.ink:C.border}`, background:showFilters?C.ink:C.pageBg,
              color:showFilters?'#fff':C.inkMid, fontSize:13, fontWeight:600, cursor:'pointer' }}>
            <Filter size={12}/> Filters
            {hasFilters&&<span style={{ width:16, height:16, borderRadius:'50%', background:C.gold, color:'#fff', fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>!</span>}
          </button>
        </div>

        {/* Type + Method pills */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, alignItems:'center' }}>
          <div style={{ display:'flex', gap:6 }}>
            {[['','All'],['online','Online'],['walk-in','Walk-in']].map(([v,l])=>(
              <button key={v} onClick={()=>setTypeFilter(v)}
                style={{ padding:'6px 14px', borderRadius:100, fontSize:12, fontWeight:700, cursor:'pointer',
                  border:`1px solid ${typeFilter===v?C.gold:C.border}`,
                  background:typeFilter===v?`linear-gradient(135deg,${C.gold},${C.goldLight})`:'transparent',
                  color:typeFilter===v?'#fff':C.inkMid }}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ width:1, height:20, background:C.border }}/>
          <div style={{ display:'flex', gap:6 }}>
            {[['','Any Method'],['cash','💵 Cash'],['upi','📱 UPI'],['card','💳 Card']].map(([v,l])=>(
              <button key={v} onClick={()=>setMethodFilter(v)}
                style={{ padding:'6px 14px', borderRadius:100, fontSize:12, fontWeight:700, cursor:'pointer',
                  border:`1px solid ${methodFilter===v?C.ink:C.border}`,
                  background:methodFilter===v?C.ink:'transparent',
                  color:methodFilter===v?'#fff':C.inkMid }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced filters */}
        <AnimatePresence>
          {showFilters&&(
            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} style={{ overflow:'hidden' }}>
              <div style={{ paddingTop:14, marginTop:14, borderTop:`1px solid ${C.border}`, display:'flex', flexWrap:'wrap', gap:12, alignItems:'flex-end' }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:C.inkLight, marginBottom:6 }}>Stylist</div>
                  <select value={stylistFilter} onChange={e=>setStylistFilter(e.target.value)}
                    style={{ padding:'8px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:C.pageBg, color:C.inkMid, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                    <option value="">All Stylists</option>
                    {stylists.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:C.inkLight, marginBottom:6 }}>From Date</div>
                  <input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setPage(1);}}
                    style={{ padding:'8px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:C.pageBg, color:C.ink, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}/>
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:C.inkLight, marginBottom:6 }}>To Date</div>
                  <input type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value);setPage(1);}}
                    style={{ padding:'8px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:C.pageBg, color:C.ink, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}/>
                </div>
                {hasFilters&&(
                  <button onClick={clearFilters}
                    style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 14px', borderRadius:10, border:`1px solid ${C.redBorder}`,
                      background:C.redPale, color:C.red, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    <X size={11}/> Clear All
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ══ BULK BAR ════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {checkedRefs.size>0&&(
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            style={{ background:`linear-gradient(145deg,${C.heroBg},${C.heroBg2})`, border:'1px solid #2E2410',
              borderRadius:16, padding:'12px 18px', display:'flex', alignItems:'center', justifyContent:'space-between',
              flexWrap:'wrap', gap:10, marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{checkedRefs.size} invoice{checkedRefs.size>1?'s':''} selected</div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>exportCSV(bulkSelected)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:10, border:'none',
                  background:`linear-gradient(135deg,${C.gold},${C.goldLight})`, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                <Download size={11}/> Export
              </button>
              <button onClick={()=>printReport(bulkSelected,{revenue:bulkSelected.reduce((a,i)=>a+(i.finalAmount||0),0),discount:bulkSelected.reduce((a,i)=>a+(i.discountAmount||0),0),avg:bulkSelected.length?bulkSelected.reduce((a,i)=>a+(i.finalAmount||0),0)/bulkSelected.length:0,online:bulkSelected.filter(i=>i.type==='online').length,walkin:bulkSelected.filter(i=>i.type!=='online').length})}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.15)',
                  background:'rgba(255,255,255,0.08)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                <Printer size={11}/> Print
              </button>
              <button onClick={()=>setCheckedRefs(new Set())}
                style={{ width:34, height:34, borderRadius:10, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <X size={13} color='#fff'/>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ CONTENT ═════════════════════════════════════════════════════════ */}
      {invoices.length===0 ? (
        <motion.div variants={fade}
          style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            padding:'80px 24px', borderRadius:22, background:C.cardBg, border:`2px dashed ${C.border}` }}>
          <div style={{ width:60, height:60, borderRadius:18, background:C.goldPale, border:`1px solid ${C.border}`,
            display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
            <FileText size={26} color={C.gold}/>
          </div>
          <div style={{ fontSize:16, fontWeight:700, color:C.ink, fontFamily:'Playfair Display,serif', marginBottom:6 }}>No invoices yet</div>
          <div style={{ fontSize:13, color:C.inkLight, textAlign:'center', maxWidth:320 }}>
            Invoices are auto-generated when bookings are completed & paid
          </div>
        </motion.div>

      ) : filtered.length===0 ? (
        <motion.div variants={fade}
          style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            padding:'60px 24px', borderRadius:22, background:C.cardBg, border:`1px solid ${C.border}` }}>
          <Search size={28} color={C.border} style={{ marginBottom:12 }}/>
          <div style={{ fontSize:14, fontWeight:600, color:C.inkLight, marginBottom:12 }}>No invoices match your filters</div>
          <button onClick={clearFilters}
            style={{ padding:'9px 22px', borderRadius:12, border:'none', background:C.ink, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            Clear filters
          </button>
        </motion.div>

      ) : viewMode==='grid' ? (
        /* ─── GRID VIEW ─── */
        <motion.div variants={stagger}
          style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:14 }}>
          {filtered.map((inv,i)=>{
            const ref=inv.invoiceRef||inv.refNo;
            const isChk=checkedRefs.has(ref);
            const m=methodCfg(inv.paymentMethod);
            const disc=inv.discountAmount||0;
            const svc=inv.service||(Array.isArray(inv.services)?inv.services[0]?.name:'—')||'—';
            const col=AV_COLS[i%AV_COLS.length];
            return (
              <motion.div key={ref} variants={fade}
                whileHover={{ y:-4, boxShadow:`0 20px 48px ${C.gold}18` }}
                style={{ background:C.cardBg, borderRadius:20, overflow:'hidden',
                  border:`2px solid ${isChk?C.gold:C.border}`, boxShadow:isChk?`0 0 0 3px ${C.goldPale}`:'none' }}>
                <div style={{ height:3, background:`linear-gradient(90deg,${col},${col}44)` }}/>
                <div style={{ padding:'14px 16px' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <button onClick={()=>toggleCheck(ref)}
                        style={{ width:36, height:36, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:12, fontWeight:800, color:'#fff', border:'none', cursor:'pointer',
                          background:`linear-gradient(135deg,${col},${col}bb)` }}>
                        {isChk?<Check size={14}/>:initials(inv.customerName)}
                      </button>
                      <div>
                        <div style={{ fontSize:13, fontWeight:800, color:C.ink }}>{inv.customerName||'Walk-in'}</div>
                        <div style={{ fontSize:10, color:C.inkLight }}>{fmtDate(inv.date||inv.completedAt)}</div>
                      </div>
                    </div>
                    <span style={{ padding:'2px 8px', borderRadius:100, fontSize:10, fontWeight:700, background:C.goldPale, color:C.gold, border:`1px solid ${C.border}` }}>
                      #{ref}
                    </span>
                  </div>
                  <div style={{ padding:'9px 12px', borderRadius:12, background:C.pageBg, border:`1px solid ${C.border}`, marginBottom:12 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:C.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{svc}</div>
                    <div style={{ fontSize:10, color:C.inkLight, marginTop:2 }}>{inv.stylist||'—'}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <div style={{ fontSize:22, fontWeight:800, color:C.ink, fontFamily:'Playfair Display,serif' }}>{fmtRs(inv.finalAmount)}</div>
                    <div style={{ display:'flex', gap:5 }}>
                      <span style={{ padding:'3px 8px', borderRadius:100, fontSize:10, fontWeight:700, background:m.bg, color:m.color, border:`1px solid ${m.border}` }}>{m.label}</span>
                      {disc>0&&<span style={{ padding:'3px 8px', borderRadius:100, fontSize:10, fontWeight:700, background:C.greenPale, color:C.green, border:`1px solid ${C.greenBorder}` }}>−{fmtRs(disc)}</span>}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:7, paddingTop:10, borderTop:`1px solid ${C.border}` }}>
                    <button onClick={()=>setSelected(inv)}
                      style={{ flex:1, padding:'8px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${C.gold},${C.goldLight})`,
                        color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                      <FileText size={11}/> View
                    </button>
                    <button onClick={()=>printInvoice(inv)}
                      style={{ width:34, height:34, borderRadius:10, border:`1px solid ${C.border}`, background:C.pageBg, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Printer size={13} color={C.inkMid}/>
                    </button>
                    {inv.customerPhone&&(
                      <button onClick={()=>sendWhatsApp(inv)}
                        style={{ width:34, height:34, borderRadius:10, border:`1px solid ${C.wa}30`, background:C.waPale, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <MessageCircle size={13} color={C.green}/>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

      ) : (
        /* ─── LIST VIEW — table style like AdminDashboard ─── */
        <motion.div variants={fade}
          style={{ background:C.cardBg, border:`1px solid ${C.border}`, borderRadius:22, overflow:'hidden' }}>
          <SectionHead title="All Invoices" badge={filtered.length} live icon={FileText}
            action={
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={toggleAll}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:10,
                    border:`1px solid ${C.border}`, background:'transparent', cursor:'pointer', fontSize:11, fontWeight:600, color:C.inkMid }}>
                  <Check size={11}/> {checkedRefs.size===filtered.length&&filtered.length>0?'Deselect All':'Select All'}
                </button>
                <button onClick={()=>exportCSV(filtered)}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:10,
                    border:`1px solid ${C.border}`, background:'transparent', cursor:'pointer', fontSize:11, fontWeight:600, color:C.inkMid }}>
                  <Download size={11}/> CSV
                </button>
              </div>
            }/>

          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:C.pageBg }}>
                  {['','Customer','Invoice Ref','Service','Stylist','Date','Amount','Payment','Actions'].map(h=>(
                    <th key={h} style={{ padding:'10px 13px', textAlign:'left', fontSize:10,
                      fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em',
                      color:C.inkLight, whiteSpace:'nowrap', borderBottom:`1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv,i)=>{
                  const ref=inv.invoiceRef||inv.refNo;
                  const isChk=checkedRefs.has(ref);
                  const m=methodCfg(inv.paymentMethod);
                  const disc=inv.discountAmount||0;
                  const svc=inv.service||(Array.isArray(inv.services)?inv.services[0]?.name:'—')||'—';
                  const col=AV_COLS[i%AV_COLS.length];
                  const isExp=expandedId===ref;
                  const svcs=Array.isArray(inv.services)&&inv.services.length?inv.services:(inv.service?[{name:inv.service,price:inv.totalAmount}]:[]);
                  return [
                    <tr key={ref}
                      style={{ borderTop:`1px solid ${C.border}`, cursor:'pointer',
                        background:isChk?`${C.gold}08`:isExp?C.pageBg:'transparent', transition:'background 0.12s' }}
                      onMouseEnter={e=>{if(!isChk&&!isExp)e.currentTarget.style.background=C.pageBg}}
                      onMouseLeave={e=>{if(!isChk&&!isExp)e.currentTarget.style.background='transparent'}}
                      onClick={()=>setExpandedId(isExp?null:ref)}>
                      {/* checkbox */}
                      <td style={{ padding:'11px 13px' }} onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>toggleCheck(ref)}
                          style={{ width:20, height:20, borderRadius:6, border:`1.5px solid ${isChk?C.gold:C.border}`,
                            background:isChk?C.gold:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {isChk&&<Check size={11} color='#fff'/>}
                        </button>
                      </td>
                      {/* customer */}
                      <td style={{ padding:'11px 13px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                          <div style={{ width:32, height:32, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:11, fontWeight:800, color:'#fff', flexShrink:0,
                            background:`linear-gradient(135deg,${col},${col}bb)` }}>
                            {initials(inv.customerName)}
                          </div>
                          <div>
                            <div style={{ fontSize:13, fontWeight:700, color:C.ink, whiteSpace:'nowrap' }}>{inv.customerName||'Walk-in'}</div>
                            {inv.customerPhone&&<div style={{ fontSize:10, color:C.inkLight }}>{inv.customerPhone}</div>}
                          </div>
                        </div>
                      </td>
                      {/* ref */}
                      <td style={{ padding:'11px 13px' }}>
                        <span style={{ padding:'3px 9px', borderRadius:100, fontSize:11, fontWeight:700, background:C.goldPale, color:C.gold, border:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>
                          #{ref}
                        </span>
                      </td>
                      {/* service */}
                      <td style={{ padding:'11px 13px', fontSize:12, color:C.inkMid, maxWidth:160, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {svc}
                      </td>
                      {/* stylist */}
                      <td style={{ padding:'11px 13px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ width:22, height:22, borderRadius:'50%', background:C.goldPale, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:C.gold }}>
                            {(inv.stylist||inv.staffName||'A').charAt(0)}
                          </div>
                          <span style={{ fontSize:11, color:C.inkMid, whiteSpace:'nowrap' }}>{inv.stylist||inv.staffName||'—'}</span>
                        </div>
                      </td>
                      {/* date */}
                      <td style={{ padding:'11px 13px', fontSize:12, color:C.ink, whiteSpace:'nowrap' }}>
                        {fmtDate(inv.date||inv.completedAt)}
                      </td>
                      {/* amount */}
                      <td style={{ padding:'11px 13px' }}>
                        <div style={{ fontSize:13, fontWeight:800, color:C.gold, fontFamily:'Playfair Display,serif', whiteSpace:'nowrap' }}>
                          {fmtRs(inv.finalAmount)}
                        </div>
                        {disc>0&&<div style={{ fontSize:10, color:C.green, fontWeight:600 }}>−{fmtRs(disc)}</div>}
                      </td>
                      {/* method */}
                      <td style={{ padding:'11px 13px' }}>
                        <span style={{ padding:'4px 9px', borderRadius:100, fontSize:11, fontWeight:700,
                          background:m.bg, border:`1px solid ${m.border}`, color:m.color }}>
                          {m.label}
                        </span>
                      </td>
                      {/* actions */}
                      <td style={{ padding:'11px 13px' }} onClick={e=>e.stopPropagation()}>
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={()=>setSelected(inv)}
                            style={{ width:30, height:30, borderRadius:9, border:'none', background:C.goldPale, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <FileText size={13} color={C.gold}/>
                          </button>
                          <button onClick={()=>printInvoice(inv)}
                            style={{ width:30, height:30, borderRadius:9, border:`1px solid ${C.border}`, background:C.pageBg, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Printer size={13} color={C.inkMid}/>
                          </button>
                          {inv.customerPhone&&(
                            <button onClick={()=>sendWhatsApp(inv)}
                              style={{ width:30, height:30, borderRadius:9, border:`1px solid ${C.wa}30`, background:C.waPale, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <MessageCircle size={13} color={C.green}/>
                            </button>
                          )}
                          <button onClick={()=>setExpandedId(isExp?null:ref)}
                            style={{ width:30, height:30, borderRadius:9, border:`1px solid ${C.border}`, background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            {isExp?<ChevronUp size={13} color={C.inkLight}/>:<ChevronDown size={13} color={C.inkLight}/>}
                          </button>
                        </div>
                      </td>
                    </tr>,
                    /* Expanded row */
                    isExp&&(
                      <tr key={`${ref}-exp`} style={{ background:C.pageBg }}>
                        <td colSpan={9} style={{ padding:'0 16px 14px 16px', borderBottom:`1px solid ${C.border}` }}>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:8, paddingTop:12 }}>
                            {[
                              ['Services', svcs.map(s=>s.name).join(', ')],
                              ['Booking Ref', ref],
                              ['Time', fmtTime(inv.timeSlot?.start)],
                              ['Booking Type', inv.type||'Walk-in'],
                              ['Original', fmtRs(inv.totalAmount)],
                              ['Discount', disc>0?`−${fmtRs(disc)}`:'None'],
                              ['Loyalty Pts', (inv.loyaltyPoints||0)>0?`+${inv.loyaltyPoints} pts`:'—'],
                              ['Completed', fmtDt(inv.completedAt)],
                            ].map(([l,v])=>(
                              <div key={l} style={{ padding:'8px 12px', borderRadius:10, background:C.cardBg, border:`1px solid ${C.border}` }}>
                                <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:C.inkGhost, marginBottom:2 }}>{l}</div>
                                <div style={{ fontSize:11, fontWeight:700, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v||'—'}</div>
                              </div>
                            ))}
                            {inv.notes&&(
                              <div style={{ gridColumn:'1/-1', padding:'8px 12px', borderRadius:10, background:C.cardBg, border:`1px solid ${C.border}` }}>
                                <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:C.inkGhost, marginBottom:2 }}>Notes</div>
                                <div style={{ fontSize:11, color:C.inkMid, fontStyle:'italic' }}>{inv.notes}</div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  ];
                })}
              </tbody>
            </table>
            {filtered.length>0&&(
              <div style={{ padding:'12px 18px', borderTop:`1px solid ${C.border}`,
                display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:11, color:C.inkLight }}>
                  Showing {filtered.length} of {invoices.length} loaded · {summary.totalCount} total in DB
                </span>
                {totalPages>1&&(
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <button onClick={()=>{ setPage(p=>Math.max(1,p-1)); loadInvoices(page-1); }} disabled={page===1}
                      style={{ padding:'6px 13px', borderRadius:10, border:`1px solid ${C.border}`, background:'transparent', cursor:'pointer', fontSize:12, fontWeight:600, color:C.inkMid, opacity:page===1?0.4:1 }}>← Prev</button>
                    <span style={{ fontSize:11, color:C.inkLight }}>Page {page} of {totalPages}</span>
                    <button onClick={()=>{ setPage(p=>Math.min(totalPages,p+1)); loadInvoices(page+1); }} disabled={page===totalPages}
                      style={{ padding:'6px 13px', borderRadius:10, border:`1px solid ${C.border}`, background:'transparent', cursor:'pointer', fontSize:12, fontWeight:600, color:C.inkMid, opacity:page===totalPages?0.4:1 }}>Next →</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      <style>{`
        @keyframes spin     { to { transform: rotate(360deg) } }
        @keyframes pulseDot { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:0.4; transform:scale(0.85) } }
      `}</style>
    </motion.div>
  );
}