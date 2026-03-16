/**
 * AdminBookings.jsx  ─  Admin Appointments Page
 * List rows → click → CENTERED OVERLAY MODAL (no side panel)
 * Advanced: multi-customer walk-in, refund, reassign, WhatsApp, receipt
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDataStore, broadcastChange } from '@/context/DataStore';
import api from '@/services/api';
import {
  loadSalonSettings as loadSharedSettings,
  getSalonSettings, subscribeSalonSettings,
  printReceipt as sharedPrintReceipt,
  buildWAReceipt, fillTemplate as sharedFillTemplate,
} from '@/utils/salonSettings';
import {
  Search, Plus, X, Wallet, CreditCard, Smartphone, Scissors,
  Download, Printer, MessageCircle, RefreshCw, Phone, Hash,
  Edit3, UserCheck, AlertTriangle, CheckCircle, XCircle,
  Copy, Check, Zap, RotateCcw, Calendar, Star, Filter, Users,
} from 'lucide-react';

/* ── tokens ─────────────────────────────────────────────────────────── */
const C = {
  cream:'#FDF8F0', creamMid:'#F7EFD8', creamDark:'#EDE0C0', creamBorder:'#DFD0A8',
  goldMid:'#B8860B', goldPale:'#FFF8E7', goldDeep:'#8B6508',
  ink:'#16100A', inkMid:'#5A4020', inkFaint:'#B09060', inkGhost:'#D4B890',
  ok:'#285C3A', okPale:'#EAF4EE', okBr:'rgba(40,92,58,0.25)',
  risk:'#7A2020', riskPale:'#FEF2F2', riskBr:'rgba(122,32,32,0.25)',
  warn:'#6B4800', warnPale:'#FEF3DC', warnBr:'rgba(107,72,0,0.25)',
  blue:'#1D4ED8', bluePale:'#EFF6FF', blueBr:'rgba(29,78,216,0.25)',
};

const SM = {
  all:          { label:'All',         dot:C.ink,     bg:C.creamMid, br:C.creamBorder, tx:C.inkMid  },
  confirmed:    { label:'Confirmed',   dot:C.blue,    bg:C.bluePale, br:C.blueBr,      tx:C.blue    },
  'in-progress':{ label:'In Progress', dot:C.warn,    bg:C.warnPale, br:C.warnBr,      tx:C.warn    },
  completed:    { label:'Completed',   dot:C.ok,      bg:C.okPale,   br:C.okBr,        tx:C.ok      },
  cancelled:    { label:'Cancelled',   dot:C.risk,    bg:C.riskPale, br:C.riskBr,      tx:C.risk    },
  'no-show':    { label:'No Show',     dot:'#6B7280', bg:'#F3F4F6',  br:'#D1D5DB',     tx:'#374151' },
  pending:      { label:'Pending',     dot:C.goldMid, bg:C.goldPale, br:C.creamBorder, tx:C.goldDeep},
};

const PMS = [
  { v:'cash', l:'Cash', I:Wallet     },
  { v:'upi',  l:'UPI',  I:Smartphone },
  { v:'card', l:'Card', I:CreditCard },
];

const IST = 5.5*3600000;
const todayStr = () => new Date(Date.now()+IST).toISOString().split('T')[0];
const fmt  = n => Number(n||0).toLocaleString('en-IN');
const rs   = n => '₹'+fmt(n);
const inits = s => (s||'G').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
const AVS  = ['#B8860B','#8B6508','#1E40AF','#166534','#6D28D9','#BE185D'];
const avc  = n => AVS[(n||'').charCodeAt(0)%AVS.length];
const toWA = r => { if(!r)return null; const d=r.replace(/\D/g,''); if(d.length===10)return'91'+d; if(d.length===12&&d.startsWith('91'))return d; return'91'+d; };

/* ── salon settings cache ─────────────────────────────────────────── */
// Proxy so _s.name etc always return live values from the shared cache
const _s = {
  get name()         { return getSalonSettings().salonName         || 'Glamour Salon'; },
  get tagline()      { return getSalonSettings().tagline            || 'Premium Salon & Spa'; },
  get phone()        { return getSalonSettings().phone              || ''; },
  get address()      { const a=getSalonSettings().address||{}; return [a.street,a.city,a.state].filter(Boolean).join(', '); },
  get receiptFooter(){ return getSalonSettings().receiptFooter      || 'Thank you for visiting! 💛'; },
  get msgConfirm()   { return getSalonSettings().msgBookingConfirm  || ''; },
  get msgRemind()    { return getSalonSettings().msgBookingReminder  || ''; },
  get msgReceipt()   { return getSalonSettings().msgPaymentReceipt  || ''; },
};
const loadSettings = loadSharedSettings;

/* ── utils ────────────────────────────────────────────────────────── */
function buildWA(b, method) { return buildWAReceipt(b, method); }

function printReceipt(b, method) { sharedPrintReceipt(b, method); }

function exportCSV(rows, headers, fname) {
  const c=v=>{if(v==null)return'""';const s=String(v);return/^\d+$/.test(s)?'="'+s.replace(/"/g,'""')+'"':'"'+s.replace(/"/g,'""')+'"';};
  const csv=[headers.join(','),...rows.map(r=>headers.map(h=>c(r[h])).join(','))].join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}));a.download=fname;a.click();URL.revokeObjectURL(a.href);
}

const INP = { width:'100%', padding:'9px 12px', borderRadius:10, border:`1.5px solid ${C.creamBorder}`, background:'#fff', color:C.ink, fontSize:12, outline:'none', boxSizing:'border-box' };

/* ══════════════════════════════════════════════════════════════════════
   PAY MODAL
══════════════════════════════════════════════════════════════════════ */
function PayModal({ booking, onConfirm, onClose, saving }) {
  const [m, setM] = useState('cash');
  if (!booking) return null;
  const amt=booking.finalAmount||booking.totalAmount||0, disc=booking.discountAmount||0;
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}
      style={{position:'fixed',inset:0,zIndex:700,background:'rgba(22,16,10,0.65)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <motion.div onClick={e=>e.stopPropagation()} initial={{scale:0.93,y:18}} animate={{scale:1,y:0}} exit={{scale:0.93,opacity:0}} transition={{type:'spring',damping:26,stiffness:320}}
        style={{width:'100%',maxWidth:400,background:C.cream,borderRadius:24,overflow:'hidden',border:`1.5px solid ${C.creamBorder}`,boxShadow:'0 32px 80px rgba(22,16,10,0.28)'}}>
        <div style={{padding:'18px 22px',borderBottom:`1px solid ${C.creamBorder}`,display:'flex',alignItems:'center',justifyContent:'space-between',background:C.creamMid}}>
          <div>
            <div style={{fontSize:17,fontWeight:800,color:C.ink,fontFamily:"'Playfair Display',serif"}}>Collect Payment</div>
            {booking.refNo&&<div style={{fontSize:11,color:C.inkFaint,marginTop:2}}>Ref: <span style={{color:C.goldDeep,fontWeight:700}}>{booking.refNo}</span></div>}
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:10,border:`1px solid ${C.creamBorder}`,background:C.creamDark,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={13} color={C.inkMid}/></button>
        </div>
        <div style={{padding:'18px 22px'}}>
          <div style={{background:'#fff',borderRadius:14,padding:'14px 16px',marginBottom:18,border:`1.5px solid ${C.creamBorder}`}}>
            {disc>0&&<><div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}><span style={{fontSize:12,color:C.inkFaint}}>Service price</span><span style={{fontSize:12,color:C.inkFaint,textDecoration:'line-through'}}>{rs(booking.totalAmount||amt)}</span></div><div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}><span style={{fontSize:12,color:C.ok}}>Discount</span><span style={{fontSize:12,fontWeight:700,color:C.ok}}>−{rs(disc)}</span></div></>}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:disc>0?10:0,borderTop:disc>0?`1px solid ${C.creamBorder}`:'none'}}>
              <span style={{fontSize:14,fontWeight:700,color:C.inkMid}}>Amount Due</span>
              <span style={{fontSize:36,fontWeight:900,color:C.ink,letterSpacing:'-0.02em'}}>{rs(amt)}</span>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
            {PMS.map(({v,l,I})=>(
              <button key={v} onClick={()=>setM(v)} style={{padding:'14px 8px',borderRadius:12,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:6,border:`2px solid ${m===v?C.goldMid:C.creamBorder}`,background:m===v?C.goldPale:'#fff',transition:'all 0.15s'}}>
                <I size={18} color={m===v?C.goldDeep:C.inkFaint}/><span style={{fontSize:11,fontWeight:700,color:m===v?C.goldDeep:C.inkFaint}}>{l}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{padding:'14px 22px',borderTop:`1px solid ${C.creamBorder}`,display:'flex',gap:10,background:C.creamMid}}>
          <button onClick={onClose} style={{flex:1,padding:'12px',borderRadius:100,border:`1px solid ${C.creamBorder}`,background:'#fff',color:C.inkMid,fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancel</button>
          <button onClick={()=>onConfirm(m)} disabled={saving} style={{flex:2,padding:'12px',borderRadius:100,border:'none',background:saving?C.creamBorder:C.ok,color:'#fff',fontSize:13,fontWeight:800,cursor:saving?'not-allowed':'pointer',transition:'all 0.15s'}}>
            {saving?'Saving…':`Confirm · ${rs(amt)}`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   REFUND MODAL
══════════════════════════════════════════════════════════════════════ */
function RefundModal({ booking, onClose, onConfirm, saving }) {
  const [m,setM]=useState(booking?.paymentMethod==='none'?'cash':(booking?.paymentMethod||'cash'));
  const [reason,setR]=useState('');
  const amt=booking?.finalAmount||booking?.totalAmount||0;
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}
      style={{position:'fixed',inset:0,zIndex:700,background:'rgba(22,16,10,0.65)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <motion.div onClick={e=>e.stopPropagation()} initial={{scale:0.93,y:18}} animate={{scale:1,y:0}} exit={{scale:0.93,opacity:0}} transition={{type:'spring',damping:26,stiffness:320}}
        style={{width:'100%',maxWidth:420,background:C.cream,borderRadius:24,overflow:'hidden',border:`1.5px solid ${C.riskBr}`,boxShadow:'0 32px 80px rgba(22,16,10,0.28)'}}>
        <div style={{padding:'18px 22px',borderBottom:`1px solid ${C.creamBorder}`,display:'flex',alignItems:'center',gap:12,background:'#FEF9F9'}}>
          <div style={{width:40,height:40,borderRadius:12,background:C.riskPale,border:`1.5px solid ${C.riskBr}`,display:'flex',alignItems:'center',justifyContent:'center'}}><RotateCcw size={18} color={C.risk}/></div>
          <div><div style={{fontSize:17,fontWeight:800,color:C.ink,fontFamily:"'Playfair Display',serif"}}>Issue Refund</div><div style={{fontSize:11,color:C.inkFaint}}>This will reverse the payment record</div></div>
        </div>
        <div style={{padding:'16px 22px',display:'flex',flexDirection:'column',gap:14}}>
          <div style={{background:C.riskPale,borderRadius:14,padding:'16px',border:`1.5px solid ${C.riskBr}`,textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,color:C.risk,textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:4}}>Refund Amount</div>
            <div style={{fontSize:38,fontWeight:900,color:C.risk,letterSpacing:'-0.02em'}}>{rs(amt)}</div>
            <div style={{fontSize:12,color:C.inkFaint,marginTop:4}}>{booking?.customer?.name} · {booking?.service?.name}</div>
          </div>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:C.inkFaint,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>Refund Via</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              {PMS.map(({v,l,I})=>(
                <button key={v} onClick={()=>setM(v)} style={{padding:'12px 8px',borderRadius:12,cursor:'pointer',border:`2px solid ${m===v?C.risk:C.creamBorder}`,background:m===v?C.riskPale:'#fff',display:'flex',flexDirection:'column',alignItems:'center',gap:5,transition:'all 0.15s'}}>
                  <I size={16} color={m===v?C.risk:C.inkFaint}/><span style={{fontSize:11,fontWeight:600,color:m===v?C.risk:C.inkFaint}}>{l}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:C.inkFaint,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>Reason (optional)</div>
            <textarea value={reason} onChange={e=>setR(e.target.value)} placeholder="e.g. Customer not satisfied…" rows={2} style={{...INP,resize:'none',lineHeight:1.5}}/>
          </div>
        </div>
        <div style={{padding:'14px 22px',borderTop:`1px solid ${C.creamBorder}`,display:'flex',gap:10,background:C.creamMid}}>
          <button onClick={onClose} style={{flex:1,padding:'11px',borderRadius:100,border:`1px solid ${C.creamBorder}`,background:'#fff',color:C.inkMid,fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancel</button>
          <button onClick={()=>onConfirm(m,reason)} disabled={saving} style={{flex:2,padding:'11px',borderRadius:100,border:'none',background:saving?C.creamBorder:C.risk,color:'#fff',fontSize:13,fontWeight:800,cursor:saving?'not-allowed':'pointer',transition:'all 0.15s'}}>
            {saving?'Processing…':`Refund ${rs(amt)}`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ACTION BUTTON + WA BUTTON helpers
══════════════════════════════════════════════════════════════════════ */
function ABt({ icon:Ic, label, c, bg, br, onClick, dis }) {
  return (
    <button onClick={onClick} disabled={dis}
      style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:12,border:`1.5px solid ${br}`,background:bg,color:c,fontSize:12,fontWeight:700,cursor:dis?'not-allowed':'pointer',opacity:dis?0.5:1,transition:'all 0.12s',textAlign:'left',width:'100%'}}>
      <Ic size={14}/>{label}
    </button>
  );
}

function WABt({ label, sent, onClick }) {
  return (
    <button onClick={onClick}
      style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:10,border:`1px solid ${sent?'rgba(22,101,52,0.3)':C.creamBorder}`,background:sent?C.okPale:'#fff',color:sent?C.ok:C.inkMid,fontSize:12,fontWeight:700,cursor:'pointer',transition:'all 0.15s',width:'100%'}}>
      <MessageCircle size={12} color={sent?C.ok:'#25D366'}/><span style={{flex:1}}>{label}</span>
      {sent&&<span style={{fontSize:9,fontWeight:700}}>Sent ✓</span>}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   BOOKING DETAIL MODAL CONTENT  (tabs: Details | Actions | Receipt | WhatsApp)
══════════════════════════════════════════════════════════════════════ */
function BookingModalContent({ booking, allStaff, onRefresh, onClose }) {
  const [tab,       setTab]      = useState('details');
  const [loading,   setLoading]  = useState(false);
  const [saving,    setSaving]   = useState(false);
  const [payModal,  setPayModal] = useState(false);
  const [paySaving, setPS]       = useState(false);
  const [refModal,  setRefModal] = useState(false);
  const [refSaving, setRS]       = useState(false);
  const [reassignId,setReassign] = useState('');
  const [editMode,  setEditMode] = useState(false);
  const [editNotes, setEditNotes]= useState(booking?.notes||'');
  const [copied,    setCopied]   = useState(false);
  const [toast,     setToast]    = useState(null);
  const [waMsg,     setWaMsg]    = useState(null);

  const t$ = (t,ok=true)=>{ setToast({t,ok}); setTimeout(()=>setToast(null),3000); };
  const phone = toWA(booking?.customer?.phone);
  const amt   = booking.finalAmount||booking.totalAmount||0;
  const disc  = booking.discountAmount||0;
  const gross = booking.totalAmount||amt;
  const paid  = booking.paymentStatus==='paid';
  const refunded = booking.paymentStatus==='refunded';
  const canAct = !['cancelled','no-show'].includes(booking.status);
  const cn  = booking.customer?.name||'Guest';
  const fn  = cn.split(' ')[0];
  const rDate = booking.date?new Date(booking.date).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}):'';

  const qUpdate = async(status,extra={})=>{ setLoading(true); try{await api.patch(`/bookings/${booking._id}/status`,{status,...extra});broadcastChange();onRefresh();t$('Marked: '+status);}catch(e){t$(e.response?.data?.message||'Failed',false);} setLoading(false); };
  const payConfirm = async method=>{ setPS(true); try{await api.patch(`/bookings/${booking._id}/status`,{status:'completed',paymentMethod:method,paymentStatus:'paid'});broadcastChange();onRefresh();setPayModal(false);t$('Payment confirmed ✓');}catch(e){t$(e.response?.data?.message||'Failed',false);} setPS(false); };
  const doRefund = async(rm,reason)=>{ setRS(true); try{await api.post(`/bookings/${booking._id}/refund`,{refundMethod:rm,reason});broadcastChange();onRefresh();setRefModal(false);t$('Refund processed ✓');}catch(e){t$(e.response?.data?.message||'Refund failed',false);} setRS(false); };
  const doReassign = async()=>{ if(!reassignId)return; setSaving(true); try{await api.patch(`/bookings/${booking._id}/assign`,{staffId:reassignId});broadcastChange();onRefresh();t$('Stylist reassigned');setReassign('');}catch(e){t$(e.response?.data?.message||'Failed',false);} setSaving(false); };
  const saveNotes = async()=>{ setSaving(true); try{await api.patch(`/bookings/${booking._id}/notes`,{notes:editNotes});broadcastChange();onRefresh();t$('Notes saved');setEditMode(false);}catch(e){t$(e.response?.data?.message||'Failed',false);} setSaving(false); };
  const sendWA = txt=>{ const msg=txt?txt.replace('%name%',fn):buildWA(booking,booking.paymentMethod||'cash'); if(!phone){t$('No phone number',false);return;} window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank'); setWaMsg(txt||'__receipt__'); setTimeout(()=>setWaMsg(null),3000); };
  const fillT = tpl => sharedFillTemplate(tpl, booking);

  const WA_MSGS = [
    {k:'confirm',label:'✅ Confirmed', txt:fillT(_s.msgConfirm||`Hi %name%! Your appointment at *${_s.name}* is confirmed.\nService: ${booking.service?.name||'—'}\nTime: ${booking.timeSlot?.start||'—'}\nRef: ${booking.refNo||''}\nSee you! 💛`)},
    {k:'remind', label:'🔔 Reminder',  txt:fillT(_s.msgRemind ||`Hi %name%! Reminder — your appointment at *${_s.name}* is today.\nTime: ${booking.timeSlot?.start||'—'} 💛`)},
    {k:'thanks', label:'💛 Thank You', txt:fillT(`Hi %name%! Thank you for visiting *${_s.name}* today 😊`)},
    {k:'review', label:'⭐ Rate Us',   txt:fillT(`Hi %name%! We'd love your feedback about *${_s.name}*. A quick review means the world to us! 🙏`)},
    {k:'rebook', label:'📅 Rebook',   txt:fillT(`Hi %name%! Ready for your next visit at *${_s.name}*? We'd love to see you again! 💛`)},
    {k:'refer',  label:'🎁 Referral', txt:fillT(`Hi %name%! Loved your service? Refer a friend to *${_s.name}* and both get a special discount! 💛`)},
  ];

  const TABS = [{k:'details',l:'Details'},{k:'actions',l:'Actions'},{k:'receipt',l:'Receipt'},{k:'whatsapp',l:'WhatsApp'}];

  return (
    <>
      <AnimatePresence>
        {refModal&&<RefundModal booking={booking} onClose={()=>setRefModal(false)} onConfirm={doRefund} saving={refSaving}/>}
        {payModal&&<PayModal booking={booking} onClose={()=>setPayModal(false)} onConfirm={payConfirm} saving={paySaving}/>}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast&&<motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0}}
          style={{margin:'0 20px 0',padding:'8px 14px',borderRadius:10,fontSize:12,fontWeight:700,background:toast.ok?C.okPale:C.riskPale,color:toast.ok?C.ok:C.risk,border:`1px solid ${toast.ok?C.okBr:C.riskBr}`,flexShrink:0}}>
          {toast.t}</motion.div>}
      </AnimatePresence>

      {/* Tab bar */}
      <div style={{display:'flex',padding:'0 20px',gap:2,borderBottom:`1px solid ${C.creamBorder}`,background:C.creamMid,flexShrink:0}}>
        {TABS.map(({k,l})=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{padding:'10px 18px',borderRadius:'9px 9px 0 0',border:'none',cursor:'pointer',fontSize:12,fontWeight:700,transition:'all 0.15s',background:tab===k?C.cream:'transparent',color:tab===k?C.ink:C.inkFaint,borderBottom:tab===k?`2.5px solid ${C.goldMid}`:'2.5px solid transparent'}}>
            {l}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{flex:1,overflowY:'auto',padding:'20px',minHeight:0}}>

        {/* ── DETAILS ── */}
        {tab==='details'&&(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16}}>
            {/* Left card */}
            <div style={{background:'#fff',borderRadius:16,overflow:'hidden',border:`1.5px solid ${C.creamBorder}`}}>
              {/* Ref */}
              <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 16px',background:`linear-gradient(90deg,${C.goldPale},transparent)`,borderBottom:`1px solid ${C.creamBorder}`}}>
                <Hash size={12} color={C.goldMid}/>
                <span style={{flex:1,fontSize:12,fontWeight:800,color:C.goldDeep,fontFamily:'monospace',letterSpacing:'0.04em'}}>{booking.refNo||'PENDING'}</span>
                <button onClick={()=>{navigator.clipboard?.writeText(booking.refNo);setCopied(true);setTimeout(()=>setCopied(false),2000);}}
                  style={{display:'flex',alignItems:'center',gap:4,padding:'3px 10px',borderRadius:7,border:`1px solid ${C.creamBorder}`,background:C.creamMid,color:copied?C.ok:C.inkFaint,fontSize:10,fontWeight:700,cursor:'pointer'}}>
                  {copied?<Check size={9}/>:<Copy size={9}/>}{copied?'Copied!':'Copy'}
                </button>
              </div>
              {/* Customer */}
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',borderBottom:`1px solid ${C.creamBorder}`}}>
                <div style={{width:38,height:38,borderRadius:10,background:avc(booking.customer?.name),flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#fff'}}>{inits(booking.customer?.name)}</div>
                <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:C.ink}}>{booking.customer?.name||'Guest'}</div>
                  {booking.customer?.phone&&<div style={{fontSize:11,color:C.inkFaint,display:'flex',alignItems:'center',gap:3}}><Phone size={9}/>{booking.customer.phone}</div>}
                </div>
                <span style={{fontSize:9,fontWeight:700,color:C.inkFaint,textTransform:'uppercase',letterSpacing:'0.08em',background:C.creamMid,padding:'3px 8px',borderRadius:6,border:`1px solid ${C.creamBorder}`}}>{booking.type||'online'}</span>
              </div>
              {/* Service + Stylist */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',borderBottom:`1px solid ${C.creamBorder}`}}>
                <div style={{padding:'10px 16px',borderRight:`1px solid ${C.creamBorder}`}}>
                  <div style={{fontSize:8,fontWeight:700,color:C.inkFaint,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4}}>Service</div>
                  <div style={{fontSize:13,fontWeight:700,color:C.ink}}>{booking.service?.name||'—'}</div>
                  <div style={{fontSize:10,color:C.inkFaint}}>{booking.service?.duration||'—'}min</div>
                </div>
                <div style={{padding:'10px 16px'}}>
                  <div style={{fontSize:8,fontWeight:700,color:C.inkFaint,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4}}>Stylist</div>
                  <div style={{fontSize:13,fontWeight:700,color:C.ink}}>{booking.staff?.name||'—'}</div>
                  <div style={{fontSize:10,color:C.inkFaint}}>{booking.timeSlot?.start||'—'} → {booking.timeSlot?.end||'—'}</div>
                </div>
              </div>
              {/* Pricing */}
              {disc>0&&<div style={{display:'flex',justifyContent:'space-between',padding:'7px 16px',borderBottom:`1px solid ${C.creamBorder}`}}><span style={{fontSize:11,color:C.inkFaint}}>Original price</span><span style={{fontSize:11,color:C.inkFaint,textDecoration:'line-through'}}>{rs(gross)}</span></div>}
              {disc>0&&<div style={{display:'flex',justifyContent:'space-between',padding:'7px 16px',borderBottom:`1px solid ${C.creamBorder}`}}><span style={{fontSize:11,color:C.ok}}>Discount</span><span style={{fontSize:11,fontWeight:700,color:C.ok}}>−{rs(disc)}</span></div>}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',background:`linear-gradient(90deg,${C.goldPale},transparent)`,borderBottom:`1px solid ${C.creamBorder}`}}>
                <span style={{fontSize:15,fontWeight:800,color:C.ink}}>Total</span>
                <span style={{fontSize:28,fontWeight:900,color:C.ink,letterSpacing:'-0.02em'}}>{rs(amt)}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 16px'}}>
                <span style={{fontSize:11,color:C.inkFaint}}>Payment</span>
                <span style={{fontSize:12,fontWeight:800,color:refunded?C.risk:paid?C.ok:C.warn}}>
                  {refunded?'↩ Refunded':paid?`✓ Paid · ${booking.paymentMethod||''}` :'⏳ Unpaid'}
                </span>
              </div>
            </div>

            {/* Right: notes + reassign */}
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{background:'#fff',borderRadius:14,padding:'14px 16px',border:`1.5px solid ${C.creamBorder}`,flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <span style={{fontSize:8,fontWeight:700,color:C.inkFaint,textTransform:'uppercase',letterSpacing:'0.1em'}}>Notes</span>
                  {!editMode&&<button onClick={()=>setEditMode(true)} style={{padding:'2px 9px',borderRadius:7,border:`1px solid ${C.creamBorder}`,background:C.creamMid,color:C.inkFaint,fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:3}}><Edit3 size={9}/>Edit</button>}
                </div>
                {editMode?(
                  <div>
                    <textarea value={editNotes} onChange={e=>setEditNotes(e.target.value)} rows={3} style={{...INP,resize:'none',lineHeight:1.5,marginBottom:8}}/>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={()=>setEditMode(false)} style={{flex:1,padding:'7px',borderRadius:8,border:`1px solid ${C.creamBorder}`,background:C.creamMid,color:C.inkFaint,fontSize:11,cursor:'pointer'}}>Cancel</button>
                      <button onClick={saveNotes} disabled={saving} style={{flex:2,padding:'7px',borderRadius:8,border:'none',background:saving?C.creamBorder:C.goldMid,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>{saving?'Saving…':'Save Notes'}</button>
                    </div>
                  </div>
                ):(
                  <p style={{fontSize:12,color:booking.notes?C.inkMid:C.inkFaint,margin:0,lineHeight:1.6}}>{booking.notes||'No notes added'}</p>
                )}
              </div>
              {canAct&&(
                <div style={{background:'#fff',borderRadius:14,padding:'14px 16px',border:`1.5px solid ${C.creamBorder}`}}>
                  <div style={{fontSize:8,fontWeight:700,color:C.inkFaint,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>Reassign Stylist</div>
                  <div style={{display:'flex',gap:8}}>
                    <select value={reassignId} onChange={e=>setReassign(e.target.value)} style={{...INP,flex:1,padding:'9px 12px'}}>
                      <option value="">Select stylist…</option>
                      {(allStaff||[]).map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                    <button onClick={doReassign} disabled={!reassignId||saving}
                      style={{padding:'9px 14px',borderRadius:10,border:'none',background:reassignId?C.goldMid:C.creamBorder,color:reassignId?'#fff':C.inkFaint,fontSize:12,fontWeight:700,cursor:reassignId?'pointer':'default',transition:'all 0.15s',display:'flex',alignItems:'center',gap:5}}>
                      <UserCheck size={13}/>{saving?'…':'Assign'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ACTIONS ── */}
        {tab==='actions'&&(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:8,maxWidth:600}}>
            {booking.status==='confirmed'&&<ABt icon={Zap} label="Start Service" c={C.warn} bg={C.warnPale} br={C.warnBr} onClick={()=>qUpdate('in-progress')} dis={loading}/>}
            {booking.status==='in-progress'&&<ABt icon={CheckCircle} label="Complete & Collect Payment" c={C.ok} bg={C.okPale} br={C.okBr} onClick={()=>setPayModal(true)} dis={loading}/>}
            {!paid&&!refunded&&canAct&&booking.status!=='in-progress'&&<ABt icon={Wallet} label="Collect Payment" c={C.blue} bg={C.bluePale} br={C.blueBr} onClick={()=>setPayModal(true)} dis={loading}/>}
            {paid&&<ABt icon={Printer} label="Print Receipt" c={C.inkMid} bg={C.creamMid} br={C.creamBorder} onClick={()=>printReceipt(booking,booking.paymentMethod||'cash')} dis={false}/>}
            {booking.status==='completed'&&paid&&<ABt icon={RotateCcw} label="Issue Refund" c={C.risk} bg={C.riskPale} br={C.riskBr} onClick={()=>setRefModal(true)} dis={loading}/>}
            {['confirmed','in-progress'].includes(booking.status)&&paid&&<ABt icon={RotateCcw} label="Cancel & Refund" c={C.risk} bg={C.riskPale} br={C.riskBr} onClick={()=>setRefModal(true)} dis={loading}/>}
            {canAct&&!paid&&!refunded&&<ABt icon={XCircle} label="Cancel Booking" c={C.risk} bg={C.riskPale} br={C.riskBr} onClick={()=>qUpdate('cancelled')} dis={loading}/>}
            {['confirmed','in-progress'].includes(booking.status)&&<ABt icon={AlertTriangle} label="Mark No Show" c="#374151" bg="#F3F4F6" br="#D1D5DB" onClick={()=>qUpdate('no-show')} dis={loading}/>}
            {refunded&&<div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:12,background:C.riskPale,border:`1.5px solid ${C.riskBr}`,gridColumn:'1/-1'}}><RotateCcw size={14} color={C.risk}/><div><div style={{fontSize:12,fontWeight:700,color:C.risk}}>Refund Issued</div><div style={{fontSize:10,color:C.inkFaint}}>Payment has been reversed</div></div></div>}
          </div>
        )}

        {/* ── RECEIPT ── */}
        {tab==='receipt'&&(
          <div style={{maxWidth:480}}>
            <div style={{borderRadius:20,overflow:'hidden',border:`1.5px solid ${C.creamBorder}`,boxShadow:'0 8px 32px rgba(22,16,10,0.12)',marginBottom:12}}>
              <div style={{background:'linear-gradient(135deg,#1C1410,#2D1E10)',padding:'20px',textAlign:'center',position:'relative'}}>
                <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(45deg,#C9952A 0,#C9952A 1px,transparent 0,transparent 50%)',backgroundSize:'14px 14px',opacity:0.05}}/>
                <div style={{position:'relative'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:4}}><Scissors size={14} color={C.goldMid}/><span style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:900,color:'#FAF3E0',letterSpacing:'0.04em'}}>{_s.name}</span></div>
                  <p style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'0.2em',margin:0}}>{_s.tagline}</p>
                  {booking.refNo&&<div style={{marginTop:10,display:'inline-flex',alignItems:'center',gap:6,padding:'4px 14px',borderRadius:100,background:'rgba(201,149,42,.15)',border:'1px solid rgba(201,149,42,.3)'}}><Hash size={9} color={C.goldMid}/><span style={{fontSize:10,fontWeight:800,color:C.goldMid,letterSpacing:'0.08em'}}>{booking.refNo}</span></div>}
                </div>
              </div>
              <div style={{padding:'14px 18px',background:C.creamMid}}>
                {[[['CUSTOMER',booking.customer?.name||'Guest'],['PHONE',booking.customer?.phone||'—']],[['SERVICE',booking.service?.name||'—'],['STYLIST',booking.staff?.name||'—']],[['DATE',rDate],['TIME',booking.timeSlot?.start||'—']]].map((pairs,i)=>(
                  <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                    {pairs.map(([l,v])=><div key={l}><div style={{fontSize:8,fontWeight:700,color:C.inkFaint,letterSpacing:'0.12em',marginBottom:2}}>{l}</div><div style={{fontSize:12,fontWeight:700,color:C.ink}}>{v}</div></div>)}
                  </div>
                ))}
                <div style={{borderTop:`1.5px solid ${C.creamBorder}`,margin:'10px 0',paddingTop:10}}>
                  {disc>0&&<><div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:11,color:C.inkFaint}}>Price</span><span style={{fontSize:11,color:C.inkFaint,textDecoration:'line-through'}}>{rs(gross)}</span></div><div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:11,color:C.ok}}>Discount</span><span style={{fontSize:11,fontWeight:700,color:C.ok}}>−{rs(disc)}</span></div></>}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}><span style={{fontSize:13,fontWeight:700,color:C.inkMid}}>TOTAL PAID</span><span style={{fontSize:26,fontWeight:900,color:C.ink,letterSpacing:'-0.02em'}}>{rs(amt)}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}><span style={{fontSize:11,color:C.inkFaint}}>Method</span><span style={{fontSize:11,fontWeight:700,color:C.inkMid,textTransform:'capitalize'}}>{booking.paymentMethod||'—'}</span></div>
                </div>
              </div>
            </div>
            {paid&&<div style={{display:'flex',gap:8}}>
              <button onClick={()=>printReceipt(booking,booking.paymentMethod||'cash')} style={{flex:1,padding:'10px',borderRadius:12,border:`1.5px solid ${C.creamBorder}`,background:'#fff',color:C.inkMid,fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Printer size={13}/>Print</button>
              <button onClick={()=>sendWA(null)} disabled={!phone} style={{flex:1,padding:'10px',borderRadius:12,border:'1px solid rgba(37,211,102,0.35)',background:'rgba(37,211,102,0.06)',color:'#166534',fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,opacity:!phone?0.4:1}}><MessageCircle size={13}/>{waMsg==='__receipt__'?'Sent ✓':'Send WA'}</button>
            </div>}
          </div>
        )}

        {/* ── WHATSAPP ── */}
        {tab==='whatsapp'&&(
          <div style={{maxWidth:460}}>
            {!phone?(
              <div style={{padding:'32px 16px',textAlign:'center'}}><div style={{fontSize:36,marginBottom:10}}>📵</div><div style={{fontSize:13,fontWeight:700,color:C.inkMid}}>No phone number</div></div>
            ):(
              <div>
                <div style={{background:'#fff',borderRadius:12,padding:'10px 14px',marginBottom:12,border:`1.5px solid ${C.creamBorder}`,display:'flex',alignItems:'center',gap:10}}>
                  <Phone size={13} color={C.ok}/><div><div style={{fontSize:12,fontWeight:700,color:C.ink}}>{booking.customer?.name}</div><div style={{fontSize:11,color:C.ok}}>{booking.customer?.phone}</div></div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:5}}>
                  {paid&&<WABt label="🧾 Send Receipt" sent={waMsg==='__receipt__'} onClick={()=>sendWA(null)}/>}
                  {WA_MSGS.map(({k,label,txt})=><WABt key={k} label={label} sent={waMsg===txt} onClick={()=>sendWA(txt)}/>)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MULTI-CUSTOMER WALK-IN DRAWER
══════════════════════════════════════════════════════════════════════ */
function WalkInDrawer({ open, onClose, staff, services, onCreated }) {
  const makeC = ()=>({cid:Math.random().toString(36).slice(2),customerSearch:'',customerName:'',customerPhone:'',customerId:'',loyaltyPoints:0,selectedServices:[],staffIds:[],couponCode:'',coupon:null,couponMsg:'',manualDiscountPercent:0});
  const [wiCusts,setWiCusts]=useState([makeC()]);
  const [payMethod,setPayMethod]=useState('cash');
  const [notes,setNotes]=useState('');
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);
  const [results,setResults]=useState({});
  const timers=useRef({});

  const t$=(t,ok=true)=>{setToast({t,ok});setTimeout(()=>setToast(null),3000);};
  const upd=(cid,p)=>setWiCusts(prev=>prev.map(c=>c.cid===cid?{...c,...p}:c));
  const addC=()=>setWiCusts(p=>[...p,makeC()]);
  const remC=cid=>setWiCusts(p=>p.filter(c=>c.cid!==cid));

  const searchC=(cid,q)=>{
    upd(cid,{customerSearch:q,customerName:q,customerId:'',loyaltyPoints:0});
    clearTimeout(timers.current[cid]);
    if(!q||q.length<2){setResults(p=>({...p,[cid]:[]}));return;}
    timers.current[cid]=setTimeout(async()=>{try{const{data}=await api.get('/users',{params:{role:'customer',search:q,limit:6}});setResults(p=>({...p,[cid]:data.users||[]}));}catch{}},300);
  };
  const pickC=(cid,cu)=>{upd(cid,{customerSearch:cu.name,customerName:cu.name,customerPhone:cu.phone||'',customerId:cu._id,loyaltyPoints:cu.loyaltyPoints||0});setResults(p=>({...p,[cid]:[]}));};
  const addSvc=(cid,svc)=>setWiCusts(p=>p.map(c=>{if(c.cid!==cid||c.selectedServices.find(s=>s.serviceId===svc._id))return c;return{...c,selectedServices:[...c.selectedServices,{serviceId:svc._id,name:svc.name,price:svc.discountPrice||svc.price,duration:svc.duration}]};}));
  const remSvc=(cid,sid)=>setWiCusts(p=>p.map(c=>c.cid!==cid?c:{...c,selectedServices:c.selectedServices.filter(s=>s.serviceId!==sid)}));
  const togStaff=(cid,sid)=>setWiCusts(p=>p.map(c=>{if(c.cid!==cid)return c;const ids=c.staffIds.includes(sid)?c.staffIds.filter(i=>i!==sid):[...c.staffIds,sid];return{...c,staffIds:ids};}));
  const verifyCoupon=async cid=>{const c=wiCusts.find(x=>x.cid===cid);if(!c||!c.couponCode)return;const sub=c.selectedServices.reduce((s,sv)=>s+sv.price,0);upd(cid,{coupon:null,couponMsg:'Checking…'});try{const{data}=await api.post('/coupons/validate',{code:c.couponCode,amount:sub});upd(cid,{coupon:data.coupon,couponMsg:'✓ Applied!'});}catch(e){upd(cid,{coupon:null,couponMsg:e.response?.data?.message||'Invalid'});}};

  const sub=c=>c.selectedServices.reduce((s,sv)=>s+sv.price,0);
  const cpnD=c=>{if(!c.coupon)return 0;if(c.coupon.discountType==='percentage')return Math.min(Math.round(sub(c)*c.coupon.discountValue/100),c.coupon.maxDiscount||9999);return c.coupon.discountValue||0;};
  const manD=c=>Math.round(sub(c)*Math.min(50,c.manualDiscountPercent||0)/100);
  const final=c=>Math.max(0,sub(c)-cpnD(c)-manD(c));
  const grand=()=>wiCusts.reduce((s,c)=>s+final(c),0);
  const reset=()=>{setWiCusts([makeC()]);setPayMethod('cash');setNotes('');};

  const submit=async()=>{
    const noSvc=wiCusts.find(c=>!c.selectedServices.length);
    if(noSvc){t$('Each customer needs at least one service',false);return;}
    const noName=wiCusts.find(c=>!c.customerName.trim());
    if(noName){t$('Enter customer name for each entry',false);return;}
    setSaving(true);
    try{
      for(const c of wiCusts){
        const payload={customerName:c.customerName||'Walk-in Guest',serviceIds:c.selectedServices.map(s=>s.serviceId),staffIds:c.staffIds.length?c.staffIds:undefined,paymentMethod:payMethod,notes:notes||'',couponCode:c.coupon?c.couponCode:'',manualDiscountPercent:c.manualDiscountPercent||0};
        if(c.customerPhone)payload.customerPhone=c.customerPhone;
        await api.post('/bookings/walk-in',payload);
      }
      broadcastChange();t$(wiCusts.length>1?`${wiCusts.length} bookings created!`:'Walk-in created!');onCreated?.();reset();onClose();
    }catch(e){t$(e?.response?.data?.message||e?.message||'Booking failed',false);}
    finally{setSaving(false);}
  };

  if(!open)return null;

  return(
    <AnimatePresence>
      <motion.div key="wi-ov" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}
        style={{position:'fixed',inset:0,zIndex:400,background:'rgba(22,16,10,0.55)',backdropFilter:'blur(4px)'}}/>
      <motion.div key="wi-dr" initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{type:'spring',damping:32,stiffness:320}}
        style={{position:'fixed',top:0,right:0,bottom:0,width:'min(620px,95vw)',zIndex:401,background:'#fff',borderLeft:`1.5px solid ${C.creamBorder}`,display:'flex',flexDirection:'column',boxShadow:'-8px 0 48px rgba(22,16,10,0.18)'}}>

        <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.creamBorder}`,background:C.goldPale,flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:38,height:38,borderRadius:12,background:`linear-gradient(135deg,${C.goldMid},#DAA520)`,display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={16} color="#fff"/></div>
              <div>
                <p style={{fontSize:15,fontWeight:800,color:C.ink,margin:0,fontFamily:"'Playfair Display',serif"}}>New Walk-in</p>
                <p style={{fontSize:11,color:C.inkFaint,margin:0}}>{wiCusts.length} customer{wiCusts.length!==1?'s':''} · Multi-service · Multi-staff</p>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button onClick={addC} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:9,background:'#fff',border:`1px solid ${C.creamBorder}`,cursor:'pointer',fontSize:11,fontWeight:700,color:C.goldMid}}><Users size={12}/>Add Customer</button>
              <button onClick={onClose} style={{width:30,height:30,borderRadius:9,border:`1px solid ${C.creamBorder}`,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={14} color={C.inkMid}/></button>
            </div>
          </div>
          {toast&&<div style={{marginTop:8,padding:'8px 12px',borderRadius:10,fontSize:12,fontWeight:700,background:toast.ok?C.okPale:C.riskPale,color:toast.ok?C.ok:C.risk}}>{toast.t}</div>}
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
          {wiCusts.map((c,idx)=>(
            <div key={c.cid} style={{marginBottom:16,borderRadius:14,border:`2px solid ${C.creamBorder}`,overflow:'hidden'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:C.creamMid,borderBottom:`1px solid ${C.creamBorder}`}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:26,height:26,borderRadius:8,background:`linear-gradient(135deg,${C.goldMid},#DAA520)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#fff'}}>{idx+1}</div>
                  <span style={{fontSize:13,fontWeight:700,color:C.ink}}>Customer {idx+1}</span>
                  {c.customerName&&<span style={{fontSize:11,color:C.inkFaint}}>— {c.customerName}</span>}
                  {final(c)>0&&<span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:100,background:C.goldPale,color:C.goldMid,border:`1px solid ${C.creamBorder}`}}>{rs(final(c))}</span>}
                </div>
                {wiCusts.length>1&&<button onClick={()=>remC(c.cid)} style={{width:22,height:22,borderRadius:6,background:C.riskPale,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={9} color={C.risk}/></button>}
              </div>
              <div style={{padding:14}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                  <div style={{position:'relative'}}>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:C.inkFaint,marginBottom:4}}>Name *</label>
                    <div style={{position:'relative'}}><Search size={12} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:C.inkFaint}}/><input style={{...INP,paddingLeft:30}} placeholder="Search customer…" value={c.customerSearch} onChange={e=>searchC(c.cid,e.target.value)}/></div>
                    {(results[c.cid]||[]).length>0&&<div style={{position:'absolute',zIndex:30,left:0,right:0,marginTop:3,borderRadius:10,overflow:'hidden',boxShadow:'0 6px 20px rgba(0,0,0,0.1)',background:'#fff',border:`1px solid ${C.creamBorder}`}}>
                      {(results[c.cid]||[]).map(r=><button key={r._id} onClick={()=>pickC(c.cid,r)} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'none',border:'none',borderBottom:`1px solid ${C.creamMid}`,cursor:'pointer',textAlign:'left'}} onMouseEnter={e=>e.currentTarget.style.background=C.goldPale} onMouseLeave={e=>e.currentTarget.style.background='none'}><div style={{width:24,height:24,borderRadius:7,background:C.goldMid,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#fff'}}>{(r.name||'?')[0]}</div><div><p style={{fontSize:12,fontWeight:700,color:C.ink,margin:0}}>{r.name}</p><p style={{fontSize:10,color:C.inkFaint,margin:0}}>{r.phone}</p></div></button>)}
                    </div>}
                    {c.customerId&&<div style={{marginTop:5,display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:8,background:C.goldPale,border:`1px solid ${C.creamBorder}`}}><Star size={10} color={C.goldMid}/><span style={{fontSize:10,fontWeight:700,color:C.ink}}>{c.loyaltyPoints} pts</span></div>}
                  </div>
                  <div><label style={{display:'block',fontSize:10,fontWeight:700,color:C.inkFaint,marginBottom:4}}>Phone</label><input style={INP} type="tel" placeholder="98765 43210" maxLength={10} value={c.customerPhone} onChange={e=>upd(c.cid,{customerPhone:e.target.value.replace(/\D/g,'').slice(0,10)})}/></div>
                </div>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:C.inkFaint,marginBottom:5}}>Services</label>
                <select style={{...INP,marginBottom:8}} onChange={e=>{const svc=(services||[]).find(s=>s._id===e.target.value);if(svc)addSvc(c.cid,svc);e.target.value='';}} defaultValue="">
                  <option value="" disabled>+ Add service…</option>
                  {(services||[]).filter(s=>!c.selectedServices.find(sel=>sel.serviceId===s._id)).map(s=><option key={s._id} value={s._id}>{s.name} — {rs(s.discountPrice||s.price||0)}</option>)}
                </select>
                {c.selectedServices.map(s=>(
                  <div key={s.serviceId} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 10px',borderRadius:9,background:C.goldPale,border:`1px solid ${C.creamBorder}`,marginBottom:5}}>
                    <div><p style={{fontSize:12,fontWeight:700,color:C.ink,margin:0}}>{s.name}</p><p style={{fontSize:10,color:C.inkFaint,margin:0}}>{s.duration}min</p></div>
                    <div style={{display:'flex',alignItems:'center',gap:7}}><span style={{fontSize:12,fontWeight:700,color:C.goldMid}}>{rs(s.price)}</span><button onClick={()=>remSvc(c.cid,s.serviceId)} style={{width:20,height:20,borderRadius:5,background:C.riskPale,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={9} color={C.risk}/></button></div>
                  </div>
                ))}
                <label style={{display:'block',fontSize:10,fontWeight:700,color:C.inkFaint,marginTop:10,marginBottom:5}}>Assign Staff <span style={{fontWeight:400,color:C.inkGhost}}>(tap multiple)</span></label>
                <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:10}}>
                  {(staff||[]).map(s=>{const sel=c.staffIds.includes(s._id||s);return(<button key={s._id||s} onClick={()=>togStaff(c.cid,s._id||s)} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',background:sel?`linear-gradient(135deg,${C.goldMid},#DAA520)`:C.cream,color:sel?'#fff':C.ink,border:`1px solid ${sel?C.goldMid:C.creamBorder}`}}>{sel&&<Check size={9}/>}{s.name||s}</button>);})}
                  {(!staff||staff.length===0)&&<span style={{fontSize:11,color:C.inkFaint}}>No staff found</span>}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                  <div>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:C.inkFaint,marginBottom:4}}>Coupon</label>
                    <div style={{display:'flex',gap:5}}><input style={{...INP,flex:1,padding:'7px 10px',fontSize:11}} placeholder="CODE" value={c.couponCode} onChange={e=>upd(c.cid,{couponCode:e.target.value.toUpperCase()})}/><button onClick={()=>verifyCoupon(c.cid)} disabled={!c.couponCode||!c.selectedServices.length} style={{padding:'0 10px',borderRadius:9,background:C.goldMid,color:'#fff',border:'none',cursor:'pointer',fontSize:11,fontWeight:700,opacity:(!c.couponCode||!c.selectedServices.length)?0.4:1}}>OK</button></div>
                    {c.couponMsg&&<p style={{fontSize:10,marginTop:3,fontWeight:600,color:c.couponMsg.startsWith('✓')?C.ok:C.risk}}>{c.couponMsg}</p>}
                  </div>
                  <div><label style={{display:'block',fontSize:10,fontWeight:700,color:C.inkFaint,marginBottom:4}}>Discount %</label><input style={{...INP,padding:'8px 12px'}} type="number" min="0" max="50" placeholder="0–50" value={c.manualDiscountPercent||''} onChange={e=>upd(c.cid,{manualDiscountPercent:Math.min(50,Math.max(0,Number(e.target.value)))})}/></div>
                </div>
                {c.selectedServices.length>0&&<div style={{padding:'8px 12px',borderRadius:10,background:C.goldPale,border:`1px solid ${C.creamBorder}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:11,color:C.inkMid}}>{c.selectedServices.length} service{c.selectedServices.length!==1?'s':''}{c.staffIds.length>0?` · ${c.staffIds.length} staff`:''}</span>
                  <span style={{fontSize:14,fontWeight:800,color:C.goldMid}}>{rs(final(c))}</span>
                </div>}
              </div>
            </div>
          ))}

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
            <div>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:C.inkFaint,marginBottom:6}}>Payment Method</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                {PMS.map(({v,l,I})=>(
                  <button key={v} onClick={()=>setPayMethod(v)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'9px 4px',borderRadius:10,cursor:'pointer',background:payMethod===v?`linear-gradient(135deg,${C.goldMid},#DAA520)`:C.cream,color:payMethod===v?'#fff':C.inkMid,border:`1px solid ${payMethod===v?C.goldMid:C.creamBorder}`}}><I size={14}/><span style={{fontSize:10,fontWeight:700}}>{l}</span></button>
                ))}
              </div>
            </div>
            <div><label style={{display:'block',fontSize:10,fontWeight:700,color:C.inkFaint,marginBottom:6}}>Notes</label><textarea style={{...INP,resize:'none',height:72,lineHeight:1.5,fontSize:12}} placeholder="Special notes…" value={notes} onChange={e=>setNotes(e.target.value)}/></div>
          </div>

          {grand()>0&&<div style={{padding:'11px 16px',borderRadius:14,background:`linear-gradient(135deg,${C.goldPale},#FFF5D6)`,border:`1px solid ${C.creamBorder}`,marginBottom:4,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:12,color:C.inkMid,fontWeight:600}}>{wiCusts.length} Customer{wiCusts.length!==1?'s':''} · Grand Total</span>
            <span style={{fontSize:22,fontWeight:900,color:C.goldMid}}>{rs(grand())}</span>
          </div>}
        </div>

        <div style={{padding:'14px 20px',borderTop:`1px solid ${C.creamBorder}`,flexShrink:0}}>
          <button onClick={submit} disabled={saving||wiCusts.every(c=>!c.selectedServices.length)}
            style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:14,borderRadius:100,border:'none',cursor:'pointer',background:`linear-gradient(135deg,${C.goldMid},#DAA520)`,color:'#fff',fontSize:14,fontWeight:700,opacity:(saving||wiCusts.every(c=>!c.selectedServices.length))?0.4:1}}>
            {saving?'Creating…':<>{wiCusts.length>1?`Create ${wiCusts.length} Bookings`:'Create Walk-in'}{grand()>0?` — ${rs(grand())}`:''}</>}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════ */
export default function AdminBookings() {
  const { staff:dsStaff, services } = useDataStore();
  const [bookings,    setBookings]    = useState([]);
  const [fetching,    setFetching]    = useState(false);
  const [date,        setDate]        = useState(todayStr());
  const [search,      setSearch]      = useState('');
  const [statusF,     setStatusF]     = useState('all');
  const [staffF,      setStaffF]      = useState('all');
  const [modalBooking,setModalBooking]= useState(null);   // ← opens the CENTERED MODAL
  const [walkIn,      setWalkIn]      = useState(false);
  const [toast,       setToast]       = useState(null);
  const [,            rerender]       = useState(0);

  const t$ = (t,ok=true)=>{ setToast({t,ok}); setTimeout(()=>setToast(null),3000); };

  useEffect(()=>{
    loadSharedSettings();
    const unsub = subscribeSalonSettings(()=>rerender(n=>n+1));
    return unsub;
  },[]);

  const fetchB = useCallback(async()=>{
    setFetching(true);
    try{const params={date,limit:200};if(search.toUpperCase().startsWith('GS-'))params.refNo=search.toUpperCase().trim();const{data}=await api.get('/bookings',{params});setBookings(data.bookings||[]);}
    catch{setBookings([]);}
    setFetching(false);
  },[date]);

  useEffect(()=>{fetchB();},[fetchB]);
  useEffect(()=>{const t=setInterval(fetchB,30000);return()=>clearInterval(t);},[fetchB]);

  const safeStaff = dsStaff||[];

  const filtered = bookings.filter(b=>{
    if(statusF!=='all'&&b.status!==statusF)return false;
    if(staffF!=='all'&&(b.staff?._id||b.staff)!==staffF)return false;
    const q=search.toLowerCase();if(!q)return true;
    if(q.startsWith('gs-'))return(b.refNo||'').toLowerCase().includes(q);
    return(b.customer?.name||'').toLowerCase().includes(q)||(b.service?.name||'').toLowerCase().includes(q)||(b.staff?.name||'').toLowerCase().includes(q)||(b.refNo||'').toLowerCase().includes(q)||(b.customer?.phone||'').includes(search);
  }).sort((a,b)=>(a.timeSlot?.start||'').localeCompare(b.timeSlot?.start||''));

  const stats = {
    total:      bookings.length,
    completed:  bookings.filter(b=>b.status==='completed').length,
    inProgress: bookings.filter(b=>b.status==='in-progress').length,
    revenue:    bookings.filter(b=>b.paymentStatus==='paid').reduce((s,b)=>s+(b.finalAmount||b.totalAmount||0),0),
    unpaid:     bookings.filter(b=>b.paymentStatus!=='paid'&&!['cancelled','no-show'].includes(b.status)).length,
  };

  const doExport=()=>{
    const rows=filtered.map(b=>({'Ref No':b.refNo||'',Date:date,Time:b.timeSlot?.start||'',Customer:b.customer?.name||'Guest',Phone:b.customer?.phone||'',Service:b.service?.name||'',Stylist:b.staff?.name||'','Total (₹)':b.totalAmount||0,'Discount (₹)':b.discountAmount||0,'Net (₹)':b.finalAmount||b.totalAmount||0,Status:b.status,'Pay Status':b.paymentStatus,'Pay Method':b.paymentMethod||''}));
    exportCSV(rows,['Ref No','Date','Time','Customer','Phone','Service','Stylist','Total (₹)','Discount (₹)','Net (₹)','Status','Pay Status','Pay Method'],`admin_appointments_${date}.csv`);
  };

  const STATUS_PILLS = ['all','confirmed','in-progress','completed','cancelled','no-show','pending'];

  return (
    <div style={{maxWidth:1100,margin:'0 auto',fontFamily:'DM Sans, sans-serif'}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:800,color:C.ink,margin:0,letterSpacing:'-0.02em',display:'flex',alignItems:'center',gap:10}}>
            Appointments
            <span style={{fontSize:12,fontWeight:600,color:C.goldDeep,fontFamily:'DM Sans,sans-serif',letterSpacing:0}}>
              {new Date(date).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}
            </span>
          </h1>
          <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
            {[{v:stats.total,l:'Total',c:C.ink},{v:stats.inProgress,l:'Active',c:C.ok,hide:!stats.inProgress},{v:stats.completed,l:'Done',c:C.blue},{v:stats.unpaid,l:'Unpaid',c:C.warn,hide:!stats.unpaid},{v:rs(stats.revenue),l:'Revenue',c:C.goldDeep}].filter(x=>!x.hide).map(({v,l,c})=>(
              <span key={l} style={{padding:'3px 12px',borderRadius:100,background:'#fff',border:`1.5px solid ${C.creamBorder}`,fontSize:11,fontWeight:700}}>
                <span style={{color:c}}>{v}</span><span style={{color:C.inkFaint,marginLeft:4}}>{l}</span>
              </span>
            ))}
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={fetchB} style={{width:36,height:36,borderRadius:'50%',border:`1.5px solid ${C.creamBorder}`,background:'#fff',color:C.inkFaint,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><RefreshCw size={13}/></button>
          <button onClick={doExport} disabled={!filtered.length} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:100,border:`1.5px solid ${C.creamBorder}`,background:'#fff',color:C.inkMid,fontSize:12,fontWeight:600,cursor:'pointer',opacity:filtered.length?1:0.4}}><Download size={12}/>Export</button>
          <motion.button onClick={()=>setWalkIn(true)} whileHover={{scale:1.03}} whileTap={{scale:0.97}}
            style={{display:'flex',alignItems:'center',gap:8,padding:'10px 20px',borderRadius:100,background:C.goldMid,color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',border:'none',boxShadow:`0 4px 16px rgba(184,134,11,0.35)`}}>
            <Plus size={15}/>New Walk-in
          </motion.button>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast&&<motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}} style={{marginBottom:14,padding:'10px 16px',borderRadius:12,fontSize:13,fontWeight:700,background:toast.ok?C.okPale:C.riskPale,color:toast.ok?C.ok:C.risk,border:`1px solid ${toast.ok?C.okBr:C.riskBr}`}}>{toast.t}</motion.div>}
      </AnimatePresence>

      {/* Filters */}
      <div style={{background:'#fff',borderRadius:16,border:`1.5px solid ${C.creamBorder}`,padding:'12px 16px',marginBottom:14,display:'flex',flexDirection:'column',gap:10}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          <div style={{position:'relative',flex:1,minWidth:200}}>
            <Search size={12} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:C.inkFaint}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, service, ref, phone…" style={{...INP,paddingLeft:34,borderRadius:100}}/>
          </div>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...INP,width:'auto',padding:'9px 14px',borderRadius:100}}/>
          <div style={{position:'relative'}}>
            <Filter size={11} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:C.inkFaint,pointerEvents:'none'}}/>
            <select value={staffF} onChange={e=>setStaffF(e.target.value)} style={{...INP,width:'auto',padding:'9px 14px 9px 30px',borderRadius:100,appearance:'none',cursor:'pointer'}}>
              <option value="all">All Stylists</option>
              {safeStaff.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
          {STATUS_PILLS.map(key=>{
            const meta=SM[key]; const cnt=key==='all'?bookings.length:bookings.filter(b=>b.status===key).length; const active=statusF===key;
            return(
              <button key={key} onClick={()=>setStatusF(key)}
                style={{display:'flex',alignItems:'center',gap:5,padding:'5px 13px',borderRadius:100,border:`1.5px solid ${active?meta.dot+'66':C.creamBorder}`,background:active?meta.bg:'#fff',color:active?meta.tx:C.inkFaint,fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',transition:'all 0.15s'}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:active?meta.dot:C.creamBorder,flexShrink:0}}/>
                {meta.label}
                {cnt>0&&<span style={{fontSize:10,padding:'1px 6px',borderRadius:100,background:active?'rgba(0,0,0,0.09)':'rgba(0,0,0,0.05)',color:active?meta.tx:C.inkFaint,fontWeight:800}}>{cnt}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Booking list */}
      <div style={{background:'#fff',borderRadius:16,border:`1.5px solid ${C.creamBorder}`,overflow:'hidden',boxShadow:'0 2px 12px rgba(22,16,10,0.06)'}}>
        {fetching?(
          <div style={{padding:48,textAlign:'center',color:C.inkFaint,fontSize:13}}>
            <motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:1,ease:'linear'}} style={{display:'inline-block',marginBottom:10}}><RefreshCw size={22} color={C.inkFaint}/></motion.div>
            <p style={{margin:0}}>Loading appointments…</p>
          </div>
        ):filtered.length===0?(
          <div style={{padding:60,textAlign:'center'}}>
            <Calendar size={40} color={C.creamBorder} style={{marginBottom:12}}/>
            <p style={{color:C.inkMid,fontSize:15,fontWeight:700,margin:'0 0 6px'}}>No appointments</p>
            <p style={{color:C.inkFaint,fontSize:12,margin:0}}>Try different filters or select another date</p>
          </div>
        ):filtered.map((b,i)=>{
          const meta = SM[b.status]||SM.confirmed;
          const amt  = b.finalAmount||b.totalAmount||0;
          const disc = b.discountAmount||0;
          const isPaid = b.paymentStatus==='paid';
          const refunded = b.paymentStatus==='refunded';
          const av = avc(b.customer?.name);

          return(
            <div key={b._id||i}
              onClick={()=>setModalBooking(b)}
              style={{display:'flex',alignItems:'center',gap:12,padding:'13px 20px',cursor:'pointer',borderBottom:`1px solid ${C.creamBorder}`,background:'#fff',transition:'background 0.12s'}}
              onMouseEnter={e=>e.currentTarget.style.background=C.creamMid}
              onMouseLeave={e=>e.currentTarget.style.background='#fff'}>

              {/* Time */}
              <div style={{minWidth:50,textAlign:'center',flexShrink:0}}>
                <div style={{fontSize:13,fontWeight:700,color:C.ink}}>{b.timeSlot?.start||'--'}</div>
                <div style={{fontSize:9,color:C.inkFaint}}>{b.timeSlot?.end||''}</div>
              </div>
              <div style={{width:1,height:32,background:C.creamBorder,flexShrink:0}}/>

              {/* Avatar */}
              <div style={{width:36,height:36,borderRadius:10,background:av,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#fff'}}>{inits(b.customer?.name)}</div>

              {/* Info */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.ink,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:160}}>{b.customer?.name||'Guest'}</div>
                  {b.refNo&&<span style={{fontSize:9,fontWeight:700,color:C.goldDeep,background:C.goldPale,border:`1px solid ${C.creamBorder}`,padding:'1px 7px',borderRadius:100,flexShrink:0,fontFamily:'monospace',letterSpacing:'0.04em'}}>{b.refNo}</span>}
                  {b.customer?.phone&&<span style={{fontSize:10,color:C.inkFaint,display:'flex',alignItems:'center',gap:2}}><Phone size={9}/>{b.customer.phone}</span>}
                </div>
                <div style={{fontSize:12,color:C.inkFaint,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                  {b.service?.name||'—'}{b.staff?.name?' · '+b.staff.name:''}
                  {b.type&&<span style={{marginLeft:6,fontSize:9,background:C.creamMid,border:`1px solid ${C.creamBorder}`,borderRadius:5,padding:'1px 6px',textTransform:'capitalize',color:C.inkFaint}}>{b.type}</span>}
                </div>
              </div>

              {/* Amount */}
              <div style={{textAlign:'right',flexShrink:0,minWidth:80}}>
                <div style={{fontSize:15,fontWeight:800,color:C.ink}}>{rs(amt)}</div>
                {disc>0&&<div style={{fontSize:10,color:C.ok,fontWeight:600}}>−{rs(disc)} off</div>}
                <div style={{fontSize:10,fontWeight:700,color:refunded?C.risk:isPaid?C.ok:C.warn}}>{refunded?'↩ Refunded':isPaid?'✓ Paid':'⏳ Unpaid'}</div>
              </div>

              {/* Status badge */}
              <div style={{padding:'4px 10px',borderRadius:100,background:meta.bg,color:meta.tx,fontSize:10,fontWeight:700,flexShrink:0,border:`1px solid ${meta.br}`}}>{meta.label}</div>

              {/* Arrow hint */}
              <div style={{width:28,height:28,borderRadius:8,background:C.creamMid,border:`1px solid ${C.creamBorder}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke={C.inkFaint} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>
          );
        })}
      </div>

      {/* Walk-in Drawer */}
      <WalkInDrawer open={walkIn} onClose={()=>setWalkIn(false)} staff={safeStaff} services={services||[]} onCreated={fetchB}/>

      {/* ════════════════════════════════════════════════════
          CENTERED OVERLAY MODAL — opens on row click
          ════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {modalBooking && (
          <>
            {/* Dark blurred backdrop */}
            <motion.div
              key="mbd"
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={()=>setModalBooking(null)}
              style={{position:'fixed',inset:0,zIndex:500,background:'rgba(22,16,10,0.65)',backdropFilter:'blur(8px)'}}
            />

            {/* Modal card — centered */}
            <motion.div
              key="mcard"
              initial={{opacity:0,scale:0.93,y:24}}
              animate={{opacity:1,scale:1,y:0}}
              exit={{opacity:0,scale:0.93,y:12}}
              transition={{type:'spring',damping:28,stiffness:340}}
              style={{
                position:'fixed', inset:0, zIndex:501,
                display:'flex', alignItems:'center', justifyContent:'center',
                padding:'20px 16px', pointerEvents:'none',
              }}
            >
              <div
                onClick={e=>e.stopPropagation()}
                style={{
                  width:'100%', maxWidth:700,
                  maxHeight:'calc(100vh - 40px)',
                  background:C.cream,
                  borderRadius:24,
                  border:`1.5px solid ${C.creamBorder}`,
                  boxShadow:'0 40px 100px rgba(22,16,10,0.35)',
                  display:'flex', flexDirection:'column',
                  overflow:'hidden',
                  pointerEvents:'all',
                }}
              >
                {/* Modal header */}
                <div style={{
                  padding:'16px 22px',
                  borderBottom:`1px solid ${C.creamBorder}`,
                  background:`linear-gradient(180deg,#fff,${C.creamMid})`,
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  flexShrink:0,
                }}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:40,height:40,borderRadius:12,background:avc(modalBooking.customer?.name),display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'#fff',flexShrink:0}}>
                      {inits(modalBooking.customer?.name)}
                    </div>
                    <div>
                      <div style={{fontSize:16,fontWeight:800,color:C.ink,fontFamily:"'Playfair Display',serif"}}>{modalBooking.customer?.name||'Guest'}</div>
                      <div style={{fontSize:11,color:C.inkFaint,marginTop:2,display:'flex',alignItems:'center',gap:6}}>
                        {modalBooking.date?new Date(modalBooking.date).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'}):'—'}
                        {modalBooking.timeSlot?.start&&<span>· {modalBooking.timeSlot.start}</span>}
                        {modalBooking.refNo&&<span style={{fontFamily:'monospace',fontWeight:700,color:C.goldDeep,background:C.goldPale,padding:'1px 7px',borderRadius:5}}>#{modalBooking.refNo}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{padding:'5px 14px',borderRadius:100,fontSize:11,fontWeight:700,background:(SM[modalBooking.status]||SM.confirmed).bg,color:(SM[modalBooking.status]||SM.confirmed).tx,border:`1px solid ${(SM[modalBooking.status]||SM.confirmed).br}`}}>
                      {(SM[modalBooking.status]||SM.confirmed).label}
                    </span>
                    {/* ✕ CLOSE BUTTON */}
                    <button
                      onClick={()=>setModalBooking(null)}
                      style={{width:36,height:36,borderRadius:10,border:`1.5px solid ${C.creamBorder}`,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s'}}
                      onMouseEnter={e=>{e.currentTarget.style.background=C.riskPale;e.currentTarget.style.borderColor=C.riskBr;}}
                      onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.borderColor=C.creamBorder;}}
                    >
                      <X size={16} color={C.inkMid}/>
                    </button>
                  </div>
                </div>

                {/* Modal body — scrollable, reuses BookingModalContent */}
                <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0,overflowY:'auto'}}>
                  <BookingModalContent
                    booking={modalBooking}
                    allStaff={safeStaff}
                    onRefresh={()=>{fetchB();}}
                    onClose={()=>setModalBooking(null)}
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}