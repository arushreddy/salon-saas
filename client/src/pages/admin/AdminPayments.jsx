import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Sparkles, TrendingUp, RefreshCw,
  CheckCircle2, Clock, Download, Search,
  Printer, MessageCircle, Calendar, BarChart3,
  X, ArrowUpRight, ArrowDownRight, Zap, Target,
  Users, RotateCcw, AlertCircle, Receipt, Wallet,
  Activity, FileText, ChevronRight,
  Copy, Check, Trash2,
  ChevronDown, ChevronUp, Crown,
  AlertTriangle, UserCheck,
  PieChart, Globe, Award,
  Scale, CheckSquare, ClipboardList, BarChart2,
  LogOut, LogIn,
} from 'lucide-react';
import api from '@/services/api';
import { loadSalonSettings, getSalonSettings, subscribeSalonSettings, buildWAReceipt, printReceipt as sharedPrintReceipt } from '@/utils/salonSettings';

/* ═══════════════════════════════════════════════════════
   DESIGN TOKENS — exact match to AdminDashboard
   ═══════════════════════════════════════════════════════ */
const C = {
  pageBg:'#F4EDE0', cardBg:'#FDFAF4', cream:'#FDF8F0', creamDark:'#F0E6CC',
  heroBg:'#0E0B06', heroBg2:'#1C1608', heroBg3:'#241E0C',
  gold:'#B8860B', goldLight:'#DAA520', goldPale:'#FFF8E7',
  goldDeep:'#8B6914', goldGlow:'rgba(218,165,32,0.14)',
  ink:'#1A1208', inkMid:'#5C4A2A', inkLight:'#9C8660', inkGhost:'#C8B090',
  border:'#DFD0A8', borderMid:'#C9B07A',
  green:'#15803D', greenPale:'#DCFCE7', greenBorder:'#86EFAC',
  red:'#991B1B',   redPale:'#FEF2F2',   redBorder:'#FECACA',
  amber:'#92400E', amberPale:'#FFFBEB', amberBorder:'#FDE68A', amberMid:'#D97706',
  blue:'#1D4ED8',  bluePale:'#EFF6FF',  blueBorder:'#BFDBFE',
  purple:'#6D28D9',purplePale:'#F5F3FF',purpleBorder:'#DDD6FE',
  teal:'#0F766E',  tealPale:'#F0FDFA',  tealBorder:'#99F6E4',
  white:'#FFFFFF', wa:'#25D366', waPale:'#D7F5E0',
};
const ease = [0.22,0.61,0.36,1];
const fd   = { hidden:{opacity:0,y:10}, show:{opacity:1,y:0,transition:{duration:0.28,ease}} };
const fdL  = { hidden:{opacity:0,y:16}, show:{opacity:1,y:0,transition:{duration:0.38,ease}} };
const sl   = { hidden:{x:72,opacity:0}, show:{x:0,opacity:1,transition:{type:'spring',damping:26,stiffness:280}} };
const stag = (d=0.045) => ({ hidden:{}, show:{transition:{staggerChildren:d}} });

const Rs    = n => Number(n||0).toLocaleString('en-IN');
const fmtRs = n => `₹${Rs(n)}`;
const fmtK  = n => { if(!n)return'₹0'; if(n>=1e7)return`₹${(n/1e7).toFixed(2)}Cr`; if(n>=1e5)return`₹${(n/1e5).toFixed(1)}L`; if(n>=1e3)return`₹${(n/1e3).toFixed(1)}K`; return fmtRs(n); };
const fmtDt = d => { try{ return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }catch{ return '—'; }};
const fmtTm = d => { try{ return new Date(d).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}); }catch{ return '—'; }};
const IST   = 5.5*3600000;
const today = () => new Date(Date.now()+IST).toISOString().split('T')[0];
const thisWeekStart = () => { const d=new Date(Date.now()+IST); d.setDate(d.getDate()-d.getDay()); return d.toISOString().split('T')[0]; };
const thisMoStart   = () => new Date(Date.now()+IST).toISOString().slice(0,7)+'-01';
const pct   = (a,b) => b>0?Math.round(a/b*100):0;
const initials = n => (n||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';
const AV_COLS = ['#B8860B','#8B6914','#C9952A','#6B4F12','#DAA520','#1D4ED8','#0F766E'];
const avCol = (n='') => AV_COLS[(n||'?').charCodeAt(0)%AV_COLS.length];

const exportCSV = (rows,fname) => {
  if (!rows?.length) return;
  const hdr=Object.keys(rows[0]);
  const lines=[hdr.join(','),...rows.map(r=>hdr.map(h=>`"${String(r[h]??'').replace(/"/g,'""')}"`).join(','))];
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/csv'}));
  a.download=fname; a.click();
};

const METHODS = {
  cash:     {icon:'💵',label:'Cash',  color:C.green, pale:C.greenPale, border:C.greenBorder},
  upi:      {icon:'📱',label:'UPI',   color:C.purple,pale:C.purplePale,border:C.purpleBorder},
  card:     {icon:'💳',label:'Card',  color:C.blue,  pale:C.bluePale,  border:C.blueBorder},
  razorpay: {icon:'🌐',label:'Online',color:C.teal,  pale:C.tealPale,  border:C.tealBorder},
  other:    {icon:'💰',label:'Other', color:C.inkLight,pale:C.pageBg,  border:C.border},
};
const PAY_STATUS = {
  completed:{label:'Paid',    color:C.green, bg:C.greenPale, border:C.greenBorder},
  pending:  {label:'Pending', color:C.amber, bg:C.amberPale, border:C.amberBorder},
  failed:   {label:'Failed',  color:C.red,   bg:C.redPale,   border:C.redBorder},
  refunded: {label:'Refunded',color:C.purple,bg:C.purplePale,border:C.purpleBorder},
  partial:  {label:'Partial', color:C.blue,  bg:C.bluePale,  border:C.blueBorder},
};
const TXNCAT = {
  cash_in:   {label:'Cash Added', color:C.green, icon:'↑'},
  withdrawal:{label:'Withdrawal', color:C.red,   icon:'↓'},
  expense:   {label:'Expense',    color:C.amber,  icon:'↓'},
  adjustment:{label:'Adjustment', color:C.blue,   icon:'↕'},
  salary:    {label:'Salary Paid',color:C.purple, icon:'↓'},
  advance:   {label:'Advance',    color:C.teal,   icon:'↓'},
};

/* ── Atoms ───────────────────────────────────────────── */
function Pulse({color='#22C55E',size=7}){
  return <span style={{display:'inline-block',width:size,height:size,borderRadius:'50%',background:color,animation:'pulseDot 2s ease-in-out infinite',boxShadow:`0 0 6px ${color}88`}}/>;
}
const Inp=({style,...p})=>(
  <input {...p}
    onFocus={e=>{e.target.style.borderColor=C.gold;e.target.style.boxShadow=`0 0 0 3px ${C.goldGlow}`;}}
    onBlur={e=>{e.target.style.borderColor=C.border;e.target.style.boxShadow='none';}}
    style={{padding:'10px 14px',borderRadius:12,border:`1.5px solid ${C.border}`,background:C.white,fontSize:13,color:C.ink,outline:'none',width:'100%',fontFamily:"'DM Sans',sans-serif",transition:'border-color 0.18s,box-shadow 0.18s',boxSizing:'border-box',...style}}/>
);
const Sel=({style,children,...p})=>(
  <select {...p} style={{padding:'10px 14px',borderRadius:12,border:`1.5px solid ${C.border}`,background:C.white,fontSize:13,color:C.ink,outline:'none',width:'100%',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",...style}}>
    {children}
  </select>
);
const PillBtn=({active,onClick,children,color})=>(
  <button onClick={onClick} style={{padding:'6px 16px',borderRadius:100,fontSize:11,fontWeight:700,cursor:'pointer',border:`1.5px solid ${active?(color||C.gold):C.border}`,background:active?(color?`${color}18`:C.goldPale):'transparent',color:active?(color||C.gold):C.inkLight,transition:'all 0.15s',whiteSpace:'nowrap'}}>{children}</button>
);
const GoldBtn=({children,onClick,disabled,icon:Icon,style})=>(
  <button onClick={onClick} disabled={disabled} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'11px 22px',borderRadius:14,border:'none',cursor:disabled?'not-allowed':'pointer',background:disabled?C.creamDark:`linear-gradient(135deg,${C.goldDeep},${C.goldLight})`,color:disabled?C.inkLight:'#fff',fontSize:13,fontWeight:800,fontFamily:"'DM Sans',sans-serif",boxShadow:disabled?'none':`0 6px 22px ${C.gold}30`,transition:'all 0.18s',...style}}>
    {Icon&&<Icon size={14}/>}{children}
  </button>
);
const GhostBtn=({children,onClick,icon:Icon,style})=>(
  <button onClick={onClick} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:7,padding:'9px 18px',borderRadius:12,cursor:'pointer',border:`1.5px solid ${C.border}`,background:'transparent',color:C.inkMid,fontSize:12,fontWeight:700,transition:'all 0.15s',...style}}
    onMouseEnter={e=>{e.currentTarget.style.borderColor=C.borderMid;e.currentTarget.style.color=C.ink;}}
    onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.inkMid;}}>
    {Icon&&<Icon size={13}/>}{children}
  </button>
);
const SectionHead=({children,icon:Icon,right})=>(
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      {Icon&&<Icon size={12} style={{color:C.goldDeep}}/>}
      <p style={{fontSize:10,fontWeight:900,textTransform:'uppercase',letterSpacing:'0.2em',color:C.inkLight}}>{children}</p>
    </div>
    {right}
  </div>
);
const Badge=({children,color,bg,border})=>(
  <span style={{display:'inline-flex',alignItems:'center',padding:'3px 9px',borderRadius:100,fontSize:10,fontWeight:800,letterSpacing:'0.04em',color:color||C.inkMid,background:bg||C.cream,border:`1px solid ${border||C.border}`,whiteSpace:'nowrap'}}>{children}</span>
);
const Avatar=({name='',size=36})=>(
  <div style={{width:size,height:size,borderRadius:size*0.3,flexShrink:0,background:`linear-gradient(135deg,${avCol(name)},${C.goldDeep})`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,color:'#fff',fontSize:size*0.36,fontFamily:"'DM Sans',sans-serif",letterSpacing:'-0.02em'}}>
    {initials(name)}
  </div>
);
const Sparkline=({data=[],color=C.gold,h=32})=>{
  if(!data||data.length<2)return null;
  const vals=data.map(d=>d.total||d.amount||d.value||0);
  const max=Math.max(...vals,1),W=100,H=h;
  const pts=vals.map((v,i)=>`${(i/(vals.length-1))*W},${H-(v/max)*(H-4)}`).join(' ');
  const id=`sp${color.replace(/[^a-z0-9]/gi,'')}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{display:'block',overflow:'visible'}}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.22"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <polyline points={`0,${H} ${pts} ${W},${H}`} fill={`url(#${id})`} stroke="none"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};
const ProgBar=({val,max,color=C.gold,h=5})=>{
  const w=max>0?Math.max(2,Math.min(100,Math.round(val/max*100))):0;
  return <div style={{height:h,borderRadius:100,background:`${color}20`,overflow:'hidden'}}><motion.div initial={{width:0}} animate={{width:`${w}%`}} transition={{duration:0.7,ease:'easeOut'}} style={{height:'100%',borderRadius:100,background:color}}/></div>;
};
const Toast=({msg,type='ok'})=>(
  <motion.div initial={{opacity:0,y:24,scale:0.92}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:16}}
    style={{position:'fixed',bottom:28,left:'50%',transform:'translateX(-50%)',zIndex:9000,display:'flex',alignItems:'center',gap:10,padding:'12px 22px',borderRadius:14,background:type==='err'?C.redPale:C.greenPale,border:`1px solid ${type==='err'?C.redBorder:C.greenBorder}`,boxShadow:'0 16px 50px rgba(0,0,0,0.15)',minWidth:220}}>
    {type==='err'?<AlertCircle size={14} style={{color:C.red,flexShrink:0}}/>:<CheckCircle2 size={14} style={{color:C.green,flexShrink:0}}/>}
    <span style={{fontSize:13,fontWeight:700,color:type==='err'?C.red:C.green}}>{msg}</span>
  </motion.div>
);
const StatCard=({label,value,sub,delta,icon:Icon,color,bg,spark})=>(
  <motion.div variants={fd} whileHover={{y:-4,boxShadow:`0 16px 44px ${color}18`}}
    style={{borderRadius:20,padding:'18px 20px',background:bg||C.cardBg,border:`1.5px solid ${color}22`,boxShadow:`0 2px 10px ${color}0A`,transition:'all 0.18s'}}>
    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12}}>
      <div style={{width:42,height:42,borderRadius:13,background:`${color}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Icon size={18} style={{color}}/></div>
      {delta!==undefined&&<div style={{display:'flex',alignItems:'center',gap:3,padding:'3px 8px',borderRadius:100,fontSize:10,fontWeight:800,background:delta>=0?C.greenPale:C.redPale,color:delta>=0?C.green:C.red}}>{delta>=0?<ArrowUpRight size={10}/>:<ArrowDownRight size={10}/>}{Math.abs(delta)}%</div>}
    </div>
    <p style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.18em',color:`${color}99`,marginBottom:4}}>{label}</p>
    <p style={{fontSize:26,fontWeight:900,color,fontFamily:"'Playfair Display',serif",lineHeight:1.1}}>{value}</p>
    {sub&&<p style={{fontSize:11,fontWeight:600,color:`${color}80`,marginTop:4}}>{sub}</p>}
    {spark?.length>1&&<div style={{marginTop:10}}><Sparkline data={spark} color={color} h={28}/></div>}
  </motion.div>
);
const MethodBreakdown=({data=[],total=0})=>(
  <div style={{display:'flex',flexDirection:'column',gap:8}}>
    {Object.entries(METHODS).map(([k,m])=>{
      const row=data.find(d=>d._id===k||d.method===k)||{total:0,count:0};
      if(!row.total)return null;
      return (
        <div key={k} style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:16,flexShrink:0}}>{m.icon}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
              <span style={{fontSize:12,fontWeight:700,color:C.inkMid}}>{m.label}</span>
              <span style={{fontSize:12,fontWeight:800,color:m.color}}>{fmtK(row.total)}</span>
            </div>
            <ProgBar val={row.total} max={Math.max(total,1)} color={m.color} h={4}/>
          </div>
          <span style={{fontSize:10,fontWeight:700,color:C.inkGhost,width:30,textAlign:'right'}}>{pct(row.total,Math.max(total,1))}%</span>
        </div>
      );
    })}
  </div>
);

/* ── Print / WhatsApp ────────────────────────────────── */
const printReceipt=(p)=>{
  // Build a booking-shaped object for the shared utility
  const booking = {
    refNo: p.refNo || p._id,
    customer: p.customer,
    service: p.service,
    staff: p.staff,
    date: p.createdAt || p.date,
    timeSlot: p.timeSlot,
    finalAmount: p.amount,
    totalAmount: p.amount,
    discountAmount: 0,
    paymentStatus: 'paid',
  };
  sharedPrintReceipt(booking, p.method || 'cash');
};
const waReceipt=(p)=>{
  const ph=(p.customer?.phone||'').replace(/\D/g,'').slice(-10);
  if(!ph){alert('No phone number found');return;}
  const booking={refNo:p.refNo||p._id,customer:p.customer,service:p.service,staff:p.staff,date:p.createdAt||p.date,timeSlot:p.timeSlot,finalAmount:p.amount,totalAmount:p.amount,discountAmount:0};
  const msg=encodeURIComponent(buildWAReceipt(booking,p.method||'cash'));
  window.open(`https://wa.me/91${ph}?text=${msg}`,'_blank');
};

/* ═══════════════════════════════════════════════════════
   PAYMENT DETAIL DRAWER
   ═══════════════════════════════════════════════════════ */
const PaymentDrawer=({payment:p,onClose,onRefund,onFlash})=>{
  const [copied,setCopied]=useState('');
  const [tab,setTab]=useState('details');
  const [refAmt,setRefAmt]=useState('');
  const [refNote,setRefNote]=useState('');
  const [refunding,setRef]=useState(false);
  const m=METHODS[p.method]||METHODS.other;
  const s=PAY_STATUS[p.status]||PAY_STATUS.pending;
  const copy=(txt,k)=>{navigator.clipboard.writeText(txt).then(()=>{setCopied(k);setTimeout(()=>setCopied(''),1600);});};
  const doRefund=async()=>{
    if(!refAmt||Number(refAmt)<=0){onFlash('Enter valid refund amount','err');return;}
    setRef(true);
    try{await api.post(`/payments/${p._id}/refund`,{amount:Number(refAmt),note:refNote});onRefund();onFlash(`Refund ₹${Rs(refAmt)} initiated`);onClose();}
    catch(e){onFlash(e.response?.data?.message||'Refund failed','err');}
    finally{setRef(false);}
  };
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{position:'fixed',inset:0,zIndex:600,background:'rgba(26,18,8,0.62)',backdropFilter:'blur(10px)',display:'flex',justifyContent:'flex-end'}}>
      <motion.div variants={sl} initial="hidden" animate="show" exit="hidden"
        style={{width:'100%',maxWidth:440,height:'100%',background:C.cardBg,borderLeft:`1px solid ${C.border}`,display:'flex',flexDirection:'column',boxShadow:'-24px 0 80px rgba(0,0,0,0.16)'}}>
        <div style={{padding:'22px 24px',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:48,height:48,borderRadius:16,background:m.pale,border:`1.5px solid ${m.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>{m.icon}</div>
              <div>
                <p style={{fontSize:15,fontWeight:800,color:C.ink,fontFamily:"'Playfair Display',serif"}}>{p.customer?.name||'Walk-in'}</p>
                <div style={{display:'flex',gap:6,alignItems:'center',marginTop:5}}>
                  <Badge color={s.color} bg={s.bg} border={s.border}>● {s.label}</Badge>
                  <Badge color={m.color} bg={m.pale} border={m.border}>{m.label}</Badge>
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{width:34,height:34,borderRadius:10,border:`1px solid ${C.border}`,background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={15} style={{color:C.inkLight}}/></button>
          </div>
          <div style={{textAlign:'center',padding:'16px',borderRadius:16,background:C.goldPale,border:`1.5px solid ${C.border}`}}>
            <p style={{fontSize:42,fontWeight:900,color:C.gold,fontFamily:"'Playfair Display',serif",lineHeight:1}}>{fmtRs(p.amount)}</p>
            <p style={{fontSize:12,color:C.inkLight,marginTop:6}}>{fmtDt(p.createdAt)} · {fmtTm(p.createdAt)}</p>
          </div>
        </div>
        <div style={{display:'flex',gap:3,padding:'10px 16px',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          {[['details','Details'],['refund','Refund'],['timeline','Timeline']].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{padding:'7px 16px',borderRadius:100,fontSize:11,fontWeight:700,cursor:'pointer',background:tab===k?`linear-gradient(135deg,${C.goldDeep},${C.goldLight})`:'transparent',border:`1px solid ${tab===k?'transparent':C.border}`,color:tab===k?'#fff':C.inkLight,transition:'all 0.15s'}}>{l}</button>
          ))}
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>
          {tab==='details'&&(
            <motion.div variants={stag()} initial="hidden" animate="show" style={{display:'flex',flexDirection:'column',gap:12}}>
              {[[`Customer`,p.customer?.name||'Walk-in'],['Phone',p.customer?.phone||'—'],['Service',p.service?.name||p.description||'—'],['Staff',p.staff?.name||p.collectedBy?.name||'—'],['Method',`${m.icon} ${m.label}`],['Status',null,s],['Booking ID',p.bookingId||p._id?.slice(-8)?.toUpperCase()||'—'],p.transactionId&&['Txn ID',p.transactionId],p.discount&&['Discount',`−₹${Rs(p.discount)}`]].filter(Boolean).map(([lbl,val,badge],i)=>(
                <motion.div key={lbl} variants={fd} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderRadius:12,background:i%2===0?C.cream:C.white,border:`1px solid ${C.border}`}}>
                  <span style={{fontSize:12,color:C.inkLight,fontWeight:600}}>{lbl}</span>
                  {badge?<Badge color={badge.color} bg={badge.bg} border={badge.border}>● {badge.label}</Badge>
                    :<div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{fontSize:12,fontWeight:700,color:C.ink}}>{val}</span>
                      {lbl==='Txn ID'&&val!=='—'&&<button onClick={()=>copy(val,'txn')} style={{background:'none',border:'none',cursor:'pointer',padding:'2px 4px'}}>{copied==='txn'?<Check size={11} style={{color:C.green}}/>:<Copy size={11} style={{color:C.inkGhost}}/>}</button>}
                    </div>}
                </motion.div>
              ))}
            </motion.div>
          )}
          {tab==='refund'&&(
            <motion.div variants={stag()} initial="hidden" animate="show" style={{display:'flex',flexDirection:'column',gap:14}}>
              {p.status==='refunded'?(
                <motion.div variants={fd} style={{padding:'24px',textAlign:'center',borderRadius:16,background:C.purplePale,border:`1px solid ${C.purpleBorder}`}}>
                  <RotateCcw size={28} style={{color:C.purple,margin:'0 auto 10px'}}/>
                  <p style={{fontSize:14,fontWeight:800,color:C.purple}}>Already refunded</p>
                </motion.div>
              ):(
                <>
                  <motion.div variants={fd} style={{padding:'14px',borderRadius:14,background:C.amberPale,border:`1px solid ${C.amberBorder}`}}>
                    <p style={{fontSize:12,color:C.amber,fontWeight:700}}>⚠ Refunds cannot be reversed.</p>
                  </motion.div>
                  <motion.div variants={fd}>
                    <p style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.14em',color:C.inkLight,marginBottom:7}}>Refund Amount (max ₹{Rs(p.amount)})</p>
                    <Inp type="number" value={refAmt} onChange={e=>setRefAmt(e.target.value)} max={p.amount} placeholder="Enter amount…"/>
                    <div style={{display:'flex',gap:7,marginTop:8}}>
                      {[100,p.amount*0.5,p.amount].map((v,i)=>(
                        <button key={i} onClick={()=>setRefAmt(String(Math.round(v)))} style={{padding:'4px 12px',borderRadius:100,fontSize:11,fontWeight:700,cursor:'pointer',border:`1px solid ${C.border}`,background:C.cream,color:C.inkMid}}>
                          {i===0?'₹100':i===1?'50%':'Full'}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                  <motion.div variants={fd}>
                    <p style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.14em',color:C.inkLight,marginBottom:7}}>Reason</p>
                    <Inp value={refNote} onChange={e=>setRefNote(e.target.value)} placeholder="e.g. Customer unsatisfied…"/>
                  </motion.div>
                  <motion.div variants={fd}>
                    <button onClick={doRefund} disabled={refunding||!refAmt} style={{width:'100%',padding:'13px',borderRadius:14,border:'none',cursor:refunding||!refAmt?'not-allowed':'pointer',background:refunding||!refAmt?C.creamDark:`linear-gradient(135deg,#4C1D95,${C.purple})`,color:refunding||!refAmt?C.inkLight:'#fff',fontSize:13,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                      {refunding?<Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/>:<RotateCcw size={14}/>}
                      {refunding?'Processing…':`Refund ₹${Rs(refAmt||0)}`}
                    </button>
                  </motion.div>
                </>
              )}
            </motion.div>
          )}
          {tab==='timeline'&&(
            <motion.div variants={stag()} initial="hidden" animate="show" style={{display:'flex',flexDirection:'column',gap:0}}>
              {[{t:'Payment Created',d:p.createdAt,color:C.inkGhost},{t:`Status: ${(PAY_STATUS[p.status]||{}).label||'—'}`,d:p.updatedAt||p.createdAt,color:s.color},p.refundedAt&&{t:'Refund Processed',d:p.refundedAt,color:C.purple}].filter(Boolean).map((ev,i,arr)=>(
                <motion.div key={i} variants={fd} style={{display:'flex',gap:14,paddingBottom:i<arr.length-1?18:0}}>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                    <div style={{width:12,height:12,borderRadius:'50%',background:ev.color,flexShrink:0,marginTop:2}}/>
                    {i<arr.length-1&&<div style={{width:2,flex:1,background:C.border,marginTop:5}}/>}
                  </div>
                  <div style={{paddingBottom:4}}>
                    <p style={{fontSize:13,fontWeight:700,color:C.ink}}>{ev.t}</p>
                    {ev.d&&<p style={{fontSize:11,color:C.inkLight,marginTop:2}}>{fmtDt(ev.d)} · {fmtTm(ev.d)}</p>}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
        <div style={{padding:'16px 24px',borderTop:`1px solid ${C.border}`,display:'flex',gap:8,flexShrink:0,flexWrap:'wrap'}}>
          <GoldBtn onClick={()=>printReceipt(p)} icon={Printer} style={{flex:1,padding:'10px'}}>Print</GoldBtn>
          <button onClick={()=>waReceipt(p)} style={{flex:1,padding:'10px',borderRadius:12,border:'none',background:C.waPale,color:C.wa,fontWeight:800,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:7}}><MessageCircle size={13}/> WhatsApp</button>
          <GhostBtn onClick={onClose} icon={X} style={{flex:1,padding:'10px'}}>Close</GhostBtn>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════
   CASH COUNTER  — Full MongoDB sync (CashTransaction API)
   ═══════════════════════════════════════════════════════ */
const CashCounter=({onFlash})=>{
  const [cashBk,     setCash]    = useState([]);
  const [onlineBk,   setOnline]  = useState([]);
  const [manualTxns, setManual]  = useState([]);
  const [summary,    setSummary] = useState({balance:0,cashIn:0,withdrawn:0,expenses:0,salaries:0,advances:0,adjNet:0});
  const [shiftReps,  setShiftRep]= useState([]);
  const [loading,    setLoad]    = useState(true);
  const [syncing,    setSyncing] = useState(false);
  const [syncSt,     setSyncSt]  = useState('idle');
  const [lastTs,     setLastTs]  = useState(null);
  const [activeTab,  setTab]     = useState('overview');
  const [drawerType, setDrawer]  = useState(null);
  const [form,       setForm]    = useState({amount:'',note:'',date:today(),category:'+',recipient:''});
  const [saving,     setSaving]  = useState(false);
  const [histRange,  setRange]   = useState(7);
  const [expandDate, setExpand]  = useState({});
  const [shiftOpen,  setShiftOpen]  = useState(false);
  const [shiftNote,  setShiftNote]  = useState('');
  const [physCount,  setPhysCount]  = useState('');
  const [countDenom, setDenom]      = useState({2000:0,500:0,200:0,100:0,50:0,20:0,10:0,5:0,2:0,1:0});
  const pollRef = useRef(null);

  /* ── Full load ── */
  const fetchAll = useCallback(async(silent=false)=>{
    if(!silent) setLoad(true); else setSyncing(true);
    try {
      const [txnR, bkR, sumR, repR] = await Promise.allSettled([
        api.get('/cash-transactions',{params:{limit:500}}),
        api.get('/cash-transactions/today-bookings'),
        api.get('/cash-transactions/summary'),
        api.get('/cash-transactions/shift-reports',{params:{limit:60}}),
      ]);
      if(txnR.status==='fulfilled') setManual(txnR.value.data.transactions||[]);
      if(bkR.status==='fulfilled'){
        setCash(bkR.value.data.cashBookings||[]);
        setOnline(bkR.value.data.onlineBookings||[]);
      }
      if(sumR.status==='fulfilled') setSummary(sumR.value.data.summary||{});
      if(repR.status==='fulfilled') setShiftRep(repR.value.data.reports||[]);
      setLastTs(Date.now()); setSyncSt('live');
    } catch { setSyncSt('error'); }
    finally { setLoad(false); setSyncing(false); }
  },[]);

  /* ── Delta poll every 12s ── */
  const deltaPoll = useCallback(async()=>{
    if(!lastTs) return;
    try {
      const {data}=await api.get(`/cash-transactions/since/${lastTs}`);
      if(data.added?.length){
        setManual(prev=>{
          const map=new Map(prev.map(t=>[t._id,t]));
          data.added.forEach(t=>map.set(t._id,t));
          return Array.from(map.values()).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
        });
      }
      if(data.deletedIds?.length) setManual(prev=>prev.filter(t=>!data.deletedIds.includes(t._id)));
      if(data.summary) setSummary(data.summary);
      setLastTs(data.serverTime||Date.now()); setSyncSt('live');
    } catch { setSyncSt('error'); }
  },[lastTs]);

  useEffect(()=>{fetchAll();},[fetchAll]);
  useEffect(()=>{ pollRef.current=setInterval(deltaPoll,12000); return()=>clearInterval(pollRef.current); },[deltaPoll]);
  useEffect(()=>{ const f=()=>deltaPoll(); window.addEventListener('focus',f); return()=>window.removeEventListener('focus',f); },[deltaPoll]);

  /* ── Derived ── */
  const {balance:counterBal=0,cashIn=0,withdrawn=0,expenses=0,salaries=0,advances=0,adjNet=0}=summary;
  const manIn=manualTxns.filter(t=>t.type==='cash_in').reduce((s,t)=>s+t.amount,0);
  const todayD=today();
  const todayCash  =cashBk.filter(b=>new Date(b.date||b.createdAt).toISOString().split('T')[0]===todayD).reduce((s,b)=>s+(b.finalAmount||b.totalAmount||0),0);
  const todayOnline=onlineBk.reduce((s,b)=>s+(b.finalAmount||b.totalAmount||0),0);
  const todayManTxns=manualTxns.filter(t=>t.date===todayD);
  const todayOut=todayManTxns.filter(t=>['withdrawal','expense','salary','advance'].includes(t.type)).reduce((s,t)=>s+t.amount,0);
  const todayIn =todayManTxns.filter(t=>t.type==='cash_in').reduce((s,t)=>s+t.amount,0);
  const todayAdj=todayManTxns.filter(t=>t.type==='adjustment').reduce((s,t)=>s+(t.sign==='+'?t.amount:-t.amount),0);
  const todayNet=todayCash+todayIn+todayAdj-todayOut;
  const physCalc=Object.entries(countDenom).reduce((s,[den,cnt])=>s+Number(den)*Number(cnt||0),0);

  const cashByDate=useMemo(()=>{
    const map={};
    cashBk.forEach(b=>{const d=new Date(b.date||b.createdAt).toISOString().split('T')[0];if(!map[d])map[d]=[];map[d].push(b);});
    return Object.entries(map).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,histRange);
  },[cashBk,histRange]);

  /* ── DRAWER CONFIG ── */
  const DRAWER_CFG={
    cash_in:   {title:'Add Cash to Counter',color:C.green, bg:C.greenPale, btn:'Add Cash',      ph:'e.g. Opening float…',   icon:LogIn},
    withdrawal:{title:'Owner Withdrawal',   color:C.red,   bg:C.redPale,   btn:'Record',        ph:'e.g. Owner withdrawal…', icon:LogOut},
    expense:   {title:'Counter Expense',    color:C.amber, bg:C.amberPale, btn:'Record Expense',ph:'e.g. Stationery…',      icon:Target},
    salary:    {title:'Salary Payment',     color:C.purple,bg:C.purplePale,btn:'Mark Paid',     ph:'Staff member name…',    icon:Users},
    advance:   {title:'Staff Advance',      color:C.teal,  bg:C.tealPale,  btn:'Deduct Advance',ph:'Staff member name…',    icon:UserCheck},
    adjustment:{title:'Balance Adjustment', color:C.blue,  bg:C.bluePale,  btn:'Apply',         ph:'e.g. Opening balance…', icon:Scale},
  };
  const dc=drawerType?DRAWER_CFG[drawerType]:null;

  /* ── Add manual → POST API ── */
  const addManual=async()=>{
    const amt=parseFloat(form.amount);
    if(!amt||amt<=0){onFlash('Enter a valid amount','err');return;}
    if(!form.note.trim()){onFlash('Add a note','err');return;}
    setSaving(true);
    try {
      await api.post('/cash-transactions',{type:drawerType,amount:amt,note:form.note.trim(),date:form.date||today(),time:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),recipient:form.recipient.trim()||null,sign:drawerType==='adjustment'?(form.category||'+'):undefined});
      setForm({amount:'',note:'',date:today(),category:'+',recipient:''});
      setDrawer(null);
      onFlash(`${dc.title} — ₹${Rs(amt)} saved`);
      await fetchAll(true);
    } catch(e){onFlash(e.response?.data?.message||'Failed to save','err');}
    finally{setSaving(false);}
  };

  /* ── Delete manual ── */
  const deleteManual=async(id)=>{
    try{
      await api.delete(`/cash-transactions/${id}`);
      setManual(prev=>prev.filter(t=>t._id!==id));
      const {data}=await api.get('/cash-transactions/summary');
      if(data?.summary) setSummary(data.summary);
      onFlash('Entry deleted');
    }catch{onFlash('Delete failed','err');}
  };

  /* ── Close shift → POST API → persist to MongoDB ── */
  const closeShift=async()=>{
    try{
      await api.post('/cash-transactions/shift-close',{
        cashIn,manualCashIn:manIn,withdrawn,expenses,salaries,advances,adjNet,
        closingBalance:counterBal,todayCash,todayOnline,
        physicalCount:Number(physCount)||null,
        variance:Number(physCount)?Number(physCount)-counterBal:null,
        note:shiftNote,
      });
      const {data}=await api.get('/cash-transactions/shift-reports',{params:{limit:60}});
      if(data?.reports) setShiftRep(data.reports);
      setShiftOpen(false); setShiftNote(''); setPhysCount('');
      onFlash('Shift closed — report saved to database');
    }catch(e){onFlash(e.response?.data?.message||'Failed to save shift','err');}
  };

  const doExportCounter=()=>exportCSV([
    ...cashBk.map(b=>({Date:b.date||new Date(b.createdAt).toLocaleDateString('en-IN'),Type:'Cash Sale',Description:`${b.service?.name||'Service'} — ${b.customer?.name||'Guest'}`,In:b.finalAmount||b.totalAmount||0,Out:'',Balance:''})),
    ...manualTxns.map(t=>({Date:t.date,Type:TXNCAT[t.type]?.label||t.type,Description:t.note,In:t.type==='cash_in'?t.amount:t.type==='adjustment'&&t.sign==='+'?t.amount:'',Out:['withdrawal','expense','salary','advance'].includes(t.type)?t.amount:t.type==='adjustment'&&t.sign==='-'?t.amount:'',Balance:''})),
  ],`cash_counter_${todayD}.csv`);

  const CTABS=[['overview','Overview'],['cashflow','Cash Flow'],['online','Online'],['history','History'],['reconcile','Reconcile'],['reports','Reports']];

  return (
    <div>
      {/* ── Hero ── */}
      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
        style={{borderRadius:24,overflow:'hidden',marginBottom:20,position:'relative',background:`linear-gradient(135deg,${C.heroBg},${C.heroBg2},${C.heroBg3})`,border:'1px solid rgba(184,134,11,.18)',boxShadow:'0 20px 60px rgba(0,0,0,.28)'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:`repeating-linear-gradient(45deg,${C.gold} 0,${C.gold} 1px,transparent 0,transparent 50%)`,backgroundSize:'16px 16px',opacity:.04}}/>
        <div style={{position:'absolute',top:-80,right:-80,width:320,height:320,borderRadius:'50%',background:'radial-gradient(circle,rgba(218,165,32,.07),transparent 68%)'}}/>
        <div style={{position:'relative',padding:'28px 32px'}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:20,marginBottom:24}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <div style={{width:44,height:44,borderRadius:14,background:`linear-gradient(135deg,${C.goldDeep},${C.goldLight})`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 6px 20px ${C.gold}50`}}><Wallet size={20} color="#fff"/></div>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:7}}>
                    <p style={{fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.2em',color:C.goldLight}}>Cash Counter</p>
                    <span style={{display:'flex',alignItems:'center',gap:4,padding:'2px 8px',borderRadius:100,fontSize:9,fontWeight:700,background:syncSt==='live'?'rgba(34,197,94,0.12)':'rgba(239,68,68,0.12)',border:`1px solid ${syncSt==='live'?'rgba(34,197,94,0.2)':'rgba(239,68,68,0.2)'}`,color:syncSt==='live'?'#6EE7B7':'#FCA5A5'}}>
                      <Pulse color={syncSt==='live'?'#22C55E':'#EF4444'} size={5}/>
                      {syncSt==='live'?'Live':'Offline'}
                    </span>
                  </div>
                  <p style={{fontSize:10,color:'rgba(255,255,255,.28)'}}>MongoDB sync · {lastTs?`updated ${new Date(lastTs).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`:''}</p>
                </div>
              </div>
              <p style={{fontSize:52,fontWeight:900,color:'#fff',fontFamily:"'Playfair Display',serif",lineHeight:1,letterSpacing:'-0.02em'}}>{fmtK(counterBal)}</p>
              <p style={{fontSize:12,color:'rgba(255,255,255,.35)',marginTop:6}}>Running balance · {cashBk.length} cash transactions</p>
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-start'}}>
              {[{key:'cash_in',icon:LogIn,label:'Add Cash',col:C.green},{key:'expense',icon:Target,label:'Expense',col:C.amber},{key:'withdrawal',icon:LogOut,label:'Withdraw',col:C.red},{key:'salary',icon:Users,label:'Salary Out',col:C.purple},{key:'advance',icon:UserCheck,label:'Advance',col:C.teal},{key:'adjustment',icon:Scale,label:'Adjust',col:C.blue}].map(({key,icon:Icon,label,col})=>(
                <button key={key} onClick={()=>{setDrawer(key);setForm({amount:'',note:'',date:today(),category:'+',recipient:''}); }}
                  style={{display:'flex',alignItems:'center',gap:6,padding:'9px 14px',borderRadius:12,border:'none',cursor:'pointer',background:`${col}22`,color:col,fontSize:11,fontWeight:800,transition:'all 0.15s',backdropFilter:'blur(4px)'}}
                  onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.background=`${col}38`;}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.background=`${col}22`;}}>
                  <Icon size={13}/>{label}
                </button>
              ))}
              <button onClick={()=>setShiftOpen(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 14px',borderRadius:12,cursor:'pointer',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.14)',color:'rgba(255,255,255,.7)',fontSize:11,fontWeight:700}}><ClipboardList size={13}/> Close Shift</button>
              <button onClick={doExportCounter} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 14px',borderRadius:12,cursor:'pointer',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.14)',color:'rgba(255,255,255,.7)',fontSize:11,fontWeight:700}}><Download size={13}/> Export</button>
              <button onClick={()=>fetchAll(true)} disabled={syncing} style={{width:38,height:38,borderRadius:12,border:'1px solid rgba(255,255,255,.14)',background:'rgba(255,255,255,.07)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><RefreshCw size={14} color="rgba(255,255,255,.55)" style={{animation:syncing?'spin 0.8s linear infinite':'none'}}/></button>
            </div>
          </div>
          {/* Breakdown strip */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:8}}>
            {[{l:'Cash Sales',v:cashIn,c:'#86EFAC',bg:'rgba(52,211,153,.1)',sign:'+'},{l:'Added',v:manIn,c:'#93C5FD',bg:'rgba(96,165,250,.1)',sign:'+'},{l:'Withdrawn',v:withdrawn,c:'#FCA5A5',bg:'rgba(248,113,113,.1)',sign:'−'},{l:'Expenses',v:expenses,c:'#FCD34D',bg:'rgba(251,191,36,.1)',sign:'−'},{l:'Salaries',v:salaries,c:'#C4B5FD',bg:'rgba(167,139,250,.1)',sign:'−'},{l:'Advances',v:advances,c:'#6EE7B7',bg:'rgba(52,211,153,.07)',sign:'−'}].map(({l,v,c,bg,sign})=>(
              <div key={l} style={{padding:'12px 14px',borderRadius:12,background:bg,backdropFilter:'blur(6px)'}}>
                <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'rgba(255,255,255,.3)',marginBottom:4}}>{sign} {l}</p>
                <p style={{fontSize:16,fontWeight:900,color:c,fontFamily:"'Playfair Display',serif"}}>{fmtK(v)}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Today summary ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:18}}>
        {[{l:'Today Cash',v:todayCash,c:C.green,bg:C.greenPale,b:C.greenBorder},{l:'Today Online',v:todayOnline,c:C.blue,bg:C.bluePale,b:C.blueBorder},{l:'Today Out',v:todayOut,c:C.red,bg:C.redPale,b:C.redBorder},{l:'Today Net',v:Math.abs(todayNet),c:todayNet>=0?C.green:C.red,bg:todayNet>=0?C.greenPale:C.redPale,b:todayNet>=0?C.greenBorder:C.redBorder},{l:'Total Today',v:todayCash+todayOnline,c:C.gold,bg:C.goldPale,b:C.border}].map(({l,v,c,bg,b})=>(
          <div key={l} style={{padding:'14px 16px',borderRadius:16,background:bg,border:`1.5px solid ${b}`}}>
            <p style={{fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.14em',color:c,marginBottom:5}}>{l}</p>
            <p style={{fontSize:24,fontWeight:900,color:c,fontFamily:"'Playfair Display',serif"}}>{fmtK(v)}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{display:'flex',gap:3,marginBottom:18,padding:4,borderRadius:16,background:C.cardBg,border:`1px solid ${C.border}`,overflowX:'auto'}}>
        {CTABS.map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:'8px 16px',borderRadius:12,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,whiteSpace:'nowrap',transition:'all 0.15s',background:activeTab===k?`linear-gradient(135deg,${C.goldDeep},${C.goldLight})`:'transparent',color:activeTab===k?'#fff':C.inkLight,boxShadow:activeTab===k?`0 4px 14px ${C.gold}28`:'none'}}>{l}</button>
        ))}
      </div>

      {loading&&<div style={{display:'flex',justifyContent:'center',padding:'50px'}}><Loader2 size={22} style={{color:C.gold,animation:'spin 1s linear infinite'}}/></div>}

      {!loading&&(
        <AnimatePresence mode="wait">

          {/* OVERVIEW */}
          {activeTab==='overview'&&(
            <motion.div key="ov" variants={stag()} initial="hidden" animate="show" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <motion.div variants={fd} style={{background:C.white,borderRadius:20,padding:'20px',border:`1px solid ${C.border}`}}>
                  <SectionHead icon={BarChart2}>Cash Flow Breakdown</SectionHead>
                  {[{l:'Cash Sales',v:cashIn,c:C.green,max:cashIn+manIn},{l:'Manual Added',v:manIn,c:C.blue,max:cashIn+manIn},{l:'Withdrawals',v:withdrawn,c:C.red,max:cashIn+manIn},{l:'Expenses',v:expenses,c:C.amber,max:cashIn+manIn},{l:'Salaries',v:salaries,c:C.purple,max:cashIn+manIn},{l:'Advances',v:advances,c:C.teal,max:cashIn+manIn}].map(({l,v,c,max})=>(
                    <div key={l} style={{marginBottom:11}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                        <span style={{fontSize:11,fontWeight:600,color:C.inkMid}}>{l}</span>
                        <span style={{fontSize:12,fontWeight:800,color:c}}>{fmtK(v)}</span>
                      </div>
                      <ProgBar val={v} max={Math.max(max,1)} color={c} h={5}/>
                    </div>
                  ))}
                </motion.div>
                <motion.div variants={fd} style={{background:C.white,borderRadius:20,padding:'20px',border:`1px solid ${C.border}`}}>
                  <SectionHead icon={Activity} right={<span style={{fontSize:10,color:C.inkGhost}}>MongoDB · live</span>}>Recent Entries</SectionHead>
                  {manualTxns.slice(0,7).length===0
                    ?<div style={{textAlign:'center',padding:'30px 0'}}><p style={{fontSize:12,color:C.inkGhost}}>No manual entries yet</p></div>
                    :manualTxns.slice(0,7).map((t,i)=>{
                      const cfg=TXNCAT[t.type]||{label:t.type,color:C.inkLight,icon:'·'};
                      const isOut=['withdrawal','expense','salary','advance'].includes(t.type);
                      return (
                        <div key={t._id||i} style={{display:'flex',alignItems:'center',gap:11,padding:'9px 0',borderBottom:i<6?`1px solid ${C.border}`:'none'}}>
                          <div style={{width:32,height:32,borderRadius:10,background:`${cfg.color}15`,border:`1px solid ${cfg.color}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            <span style={{fontSize:14,fontWeight:900,color:cfg.color}}>{cfg.icon}</span>
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <p style={{fontSize:12,fontWeight:700,color:C.ink,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.note}</p>
                            <p style={{fontSize:10,color:C.inkGhost,marginTop:2}}>{t.date} · {t.time||'—'}{t.createdBy?.name?` · ${t.createdBy.name}`:''}</p>
                          </div>
                          <div style={{display:'flex',alignItems:'center',gap:6}}>
                            <span style={{fontSize:13,fontWeight:900,color:cfg.color,fontFamily:"'Playfair Display',serif"}}>{isOut?'−':'+'}₹{Rs(t.amount)}</span>
                            <button onClick={()=>deleteManual(t._id)} style={{background:'none',border:'none',cursor:'pointer',padding:'3px'}}><Trash2 size={11} style={{color:C.inkGhost}}/></button>
                          </div>
                        </div>
                      );
                    })
                  }
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* CASHFLOW */}
          {activeTab==='cashflow'&&(
            <motion.div key="cf" variants={stag()} initial="hidden" animate="show" style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10,marginBottom:4}}>
                {[{l:'Total In',v:cashIn+manIn,c:C.green,bg:C.greenPale,b:C.greenBorder},{l:'Total Out',v:withdrawn+expenses+salaries+advances,c:C.red,bg:C.redPale,b:C.redBorder},{l:'Net Balance',v:counterBal,c:C.gold,bg:C.goldPale,b:C.border},{l:'Transactions',v:cashBk.length,c:C.blue,bg:C.bluePale,b:C.blueBorder}].map(({l,v,c,bg,b})=>(
                  <div key={l} style={{padding:'14px',borderRadius:14,background:bg,border:`1.5px solid ${b}`}}>
                    <p style={{fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.14em',color:c,marginBottom:5}}>{l}</p>
                    <p style={{fontSize:22,fontWeight:900,color:c,fontFamily:"'Playfair Display',serif"}}>{l==='Transactions'?v:fmtK(v)}</p>
                  </div>
                ))}
              </div>
              <div style={{background:C.white,borderRadius:20,border:`1px solid ${C.border}`,overflow:'hidden'}}>
                <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.border}`}}><SectionHead icon={FileText}>All Manual Entries</SectionHead></div>
                {manualTxns.length===0?(<div style={{textAlign:'center',padding:'40px',color:C.inkGhost,fontSize:13}}>No manual entries yet</div>):(
                  manualTxns.map((t,i)=>{
                    const cfg=TXNCAT[t.type]||{label:t.type,color:C.inkLight,icon:'·'};
                    const isOut=['withdrawal','expense','salary','advance'].includes(t.type);
                    return (
                      <div key={t._id||i} style={{display:'flex',alignItems:'center',gap:14,padding:'13px 20px',background:i%2===0?C.cream:C.white,borderBottom:i<manualTxns.length-1?`1px solid ${C.border}`:'none'}}>
                        <div style={{width:36,height:36,borderRadius:11,background:`${cfg.color}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><span style={{fontSize:16,fontWeight:900,color:cfg.color}}>{cfg.icon}</span></div>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{fontSize:13,fontWeight:700,color:C.ink}}>{t.note}</p>
                          <div style={{display:'flex',gap:6,marginTop:4,flexWrap:'wrap'}}>
                            <Badge color={cfg.color} bg={`${cfg.color}10`} border={`${cfg.color}20`}>{cfg.label}</Badge>
                            {t.recipient&&<Badge>{t.recipient}</Badge>}
                            {t.createdBy?.name&&<Badge>{t.createdBy.name}</Badge>}
                            {t.type==='adjustment'&&<Badge color={C.blue} bg={C.bluePale} border={C.blueBorder}>{t.sign==='+'?'Credit':'Debit'}</Badge>}
                          </div>
                        </div>
                        <div style={{textAlign:'right',marginRight:8}}>
                          <p style={{fontSize:14,fontWeight:900,color:isOut?C.red:C.green,fontFamily:"'Playfair Display',serif"}}>{isOut?'−':'+'}₹{Rs(t.amount)}</p>
                          <p style={{fontSize:10,color:C.inkGhost,marginTop:2}}>{t.date}</p>
                        </div>
                        <button onClick={()=>deleteManual(t._id)} style={{width:30,height:30,borderRadius:9,border:`1px solid ${C.redBorder}`,background:C.redPale,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={12} style={{color:C.red}}/></button>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {/* ONLINE */}
          {activeTab==='online'&&(
            <motion.div key="ol" variants={stag()} initial="hidden" animate="show" style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:4}}>
                {[{l:"Today's Online",v:todayOnline,c:C.blue,bg:C.bluePale,b:C.blueBorder},{l:'UPI',v:onlineBk.filter(b=>b.paymentMethod==='upi').reduce((s,b)=>s+(b.finalAmount||0),0),c:C.purple,bg:C.purplePale,b:C.purpleBorder},{l:'Card',v:onlineBk.filter(b=>b.paymentMethod==='card').reduce((s,b)=>s+(b.finalAmount||0),0),c:C.teal,bg:C.tealPale,b:C.tealBorder},{l:'Transactions',v:onlineBk.length,c:C.gold,bg:C.goldPale,b:C.border}].map(({l,v,c,bg,b})=>(
                  <div key={l} style={{padding:'14px',borderRadius:14,background:bg,border:`1.5px solid ${b}`}}>
                    <p style={{fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.14em',color:c,marginBottom:5}}>{l}</p>
                    <p style={{fontSize:22,fontWeight:900,color:c,fontFamily:"'Playfair Display',serif"}}>{l==='Transactions'?v:fmtK(v)}</p>
                  </div>
                ))}
              </div>
              <div style={{background:C.white,borderRadius:20,border:`1px solid ${C.border}`,overflow:'hidden'}}>
                <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.border}`}}><SectionHead icon={Globe}>Today's Online Payments</SectionHead></div>
                {onlineBk.length===0?(<div style={{textAlign:'center',padding:'40px',color:C.inkGhost,fontSize:13}}>No online payments today</div>):(
                  onlineBk.map((b,i)=>{
                    const m=METHODS[b.paymentMethod]||METHODS.other;
                    return (<div key={b._id} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 20px',background:i%2===0?C.cream:C.white,borderBottom:i<onlineBk.length-1?`1px solid ${C.border}`:'none'}}>
                      <span style={{fontSize:22}}>{m.icon}</span>
                      <div style={{flex:1,minWidth:0}}><p style={{fontSize:13,fontWeight:700,color:C.ink}}>{b.customer?.name||'Guest'}</p><p style={{fontSize:11,color:C.inkLight,marginTop:1}}>{b.service?.name||'Service'} · {fmtTm(b.createdAt)}</p></div>
                      <Badge color={m.color} bg={m.pale} border={m.border}>{m.label}</Badge>
                      <p style={{fontSize:15,fontWeight:900,color:C.blue,fontFamily:"'Playfair Display',serif"}}>₹{Rs(b.finalAmount||b.totalAmount||0)}</p>
                    </div>);
                  })
                )}
              </div>
            </motion.div>
          )}

          {/* HISTORY */}
          {activeTab==='history'&&(
            <motion.div key="hi" variants={stag()} initial="hidden" animate="show" style={{display:'flex',flexDirection:'column',gap:10}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                <SectionHead icon={Calendar}>Daily Breakdown (last {histRange} days)</SectionHead>
                <div style={{display:'flex',gap:6}}>{[7,14,30].map(d=><PillBtn key={d} active={histRange===d} onClick={()=>setRange(d)}>{d}D</PillBtn>)}</div>
              </div>
              {cashByDate.map(([date,bookings])=>{
                const dayTotal=bookings.reduce((s,b)=>s+(b.finalAmount||b.totalAmount||0),0);
                const dayManual=manualTxns.filter(t=>t.date===date);
                const dayOut=dayManual.filter(t=>['withdrawal','expense','salary','advance'].includes(t.type)).reduce((s,t)=>s+t.amount,0);
                const isToday=date===todayD;
                return (
                  <motion.div key={date} variants={fd} style={{borderRadius:18,border:`1px solid ${isToday?C.borderMid:C.border}`,background:isToday?C.goldPale:C.white,overflow:'hidden'}}>
                    <div onClick={()=>setExpand(e=>({...e,[date]:!e[date]}))} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',cursor:'pointer'}}>
                      <div style={{display:'flex',alignItems:'center',gap:12}}>
                        <div style={{width:40,height:40,borderRadius:12,background:isToday?C.gold:C.cream,border:`1px solid ${isToday?C.goldLight:C.border}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <span style={{fontSize:13,fontWeight:900,color:isToday?'#fff':C.inkMid}}>{new Date(date+'T12:00:00').getDate()}</span>
                          <span style={{fontSize:8,fontWeight:700,color:isToday?'rgba(255,255,255,.7)':C.inkGhost,textTransform:'uppercase'}}>{new Date(date+'T12:00:00').toLocaleDateString('en-IN',{month:'short'})}</span>
                        </div>
                        <div>
                          <p style={{fontSize:13,fontWeight:800,color:C.ink}}>{isToday?'Today — ':''}{new Date(date+'T12:00:00').toLocaleDateString('en-IN',{weekday:'long'})}</p>
                          <p style={{fontSize:11,color:C.inkLight,marginTop:2}}>{bookings.length} txns · {dayManual.length} manual entries</p>
                        </div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:16}}>
                        <div style={{textAlign:'right'}}>
                          <p style={{fontSize:16,fontWeight:900,color:C.green,fontFamily:"'Playfair Display',serif"}}>+{fmtK(dayTotal)}</p>
                          {dayOut>0&&<p style={{fontSize:11,fontWeight:700,color:C.red}}>−{fmtK(dayOut)}</p>}
                        </div>
                        {expandDate[date]?<ChevronUp size={16} style={{color:C.inkGhost}}/>:<ChevronDown size={16} style={{color:C.inkGhost}}/>}
                      </div>
                    </div>
                    {expandDate[date]&&(
                      <div style={{borderTop:`1px solid ${C.border}`}}>
                        {bookings.map((b,i)=>(
                          <div key={b._id} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 18px',background:i%2===0?C.cream:C.white,borderBottom:`1px solid ${C.border}`}}>
                            <span style={{fontSize:18}}>💵</span>
                            <div style={{flex:1}}><p style={{fontSize:12,fontWeight:700,color:C.ink}}>{b.customer?.name||'Guest'} · {b.service?.name||'Service'}</p><p style={{fontSize:10,color:C.inkGhost}}>{fmtTm(b.createdAt)}</p></div>
                            <p style={{fontSize:13,fontWeight:800,color:C.green}}>+₹{Rs(b.finalAmount||b.totalAmount||0)}</p>
                          </div>
                        ))}
                        {dayManual.map((t,i)=>{
                          const cfg=TXNCAT[t.type]||{color:C.inkLight,icon:'·',label:t.type};
                          const isOut=['withdrawal','expense','salary','advance'].includes(t.type);
                          return (<div key={t._id||i} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 18px',background:i%2===0?C.goldPale:C.amberPale,borderBottom:`1px solid ${C.amberBorder}`}}>
                            <span style={{fontSize:14,fontWeight:900,color:cfg.color}}>{cfg.icon}</span>
                            <div style={{flex:1}}><p style={{fontSize:12,fontWeight:700,color:C.ink}}>{t.note}</p><Badge color={cfg.color} bg={`${cfg.color}10`} border={`${cfg.color}20`}>{cfg.label}</Badge></div>
                            <p style={{fontSize:13,fontWeight:800,color:isOut?C.red:C.green}}>{isOut?'−':'+'}₹{Rs(t.amount)}</p>
                          </div>);
                        })}
                      </div>
                    )}
                  </motion.div>
                );
              })}
              {cashByDate.length===0&&<div style={{textAlign:'center',padding:'50px',color:C.inkGhost,fontSize:13}}>No cash history yet</div>}
            </motion.div>
          )}

          {/* RECONCILE */}
          {activeTab==='reconcile'&&(
            <motion.div key="rc" variants={stag()} initial="hidden" animate="show" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <motion.div variants={fd} style={{background:C.white,borderRadius:20,padding:'20px',border:`1px solid ${C.border}`}}>
                  <SectionHead icon={Scale}>Physical Count</SectionHead>
                  {Object.entries(countDenom).map(([den,cnt])=>(
                    <div key={den} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                      <div style={{width:60,padding:'5px 10px',borderRadius:8,background:C.goldPale,border:`1px solid ${C.border}`,textAlign:'center'}}><span style={{fontSize:12,fontWeight:800,color:C.gold}}>₹{den}</span></div>
                      <span style={{fontSize:14,color:C.inkLight}}>×</span>
                      <Inp type="number" min={0} value={cnt} onChange={e=>setDenom(d=>({...d,[den]:e.target.value}))} style={{textAlign:'center'}}/>
                      <span style={{fontSize:12,fontWeight:700,color:C.inkMid,width:64,textAlign:'right'}}>= ₹{Rs(Number(den)*Number(cnt||0))}</span>
                    </div>
                  ))}
                  <div style={{marginTop:14,padding:'13px 16px',borderRadius:14,background:C.goldPale,border:`1px solid ${C.border}`}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontSize:13,fontWeight:700,color:C.inkMid}}>Counted Total</span><span style={{fontSize:18,fontWeight:900,color:C.gold,fontFamily:"'Playfair Display',serif"}}>{fmtRs(physCalc)}</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}><span style={{fontSize:12,color:C.inkLight}}>System Balance</span><span style={{fontSize:13,fontWeight:700,color:C.inkMid}}>{fmtRs(counterBal)}</span></div>
                    {physCalc>0&&(<div style={{display:'flex',justifyContent:'space-between',marginTop:8,paddingTop:8,borderTop:`1px solid ${C.border}`}}><span style={{fontSize:12,fontWeight:700,color:C.inkMid}}>Variance</span><span style={{fontSize:14,fontWeight:900,color:physCalc-counterBal>=0?C.green:C.red,fontFamily:"'Playfair Display',serif"}}>{physCalc-counterBal>=0?'+':''}{fmtRs(physCalc-counterBal)}</span></div>)}
                  </div>
                </motion.div>
                <motion.div variants={fd} style={{background:C.white,borderRadius:20,padding:'20px',border:`1px solid ${C.border}`}}>
                  <SectionHead icon={ClipboardList}>Close Shift</SectionHead>
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    {[{l:'Cash Sales',v:cashIn,c:C.green},{l:'Manual Cash In',v:manIn,c:C.blue},{l:'Withdrawals',v:withdrawn,c:C.red},{l:'Expenses',v:expenses,c:C.amber},{l:'Salaries',v:salaries,c:C.purple},{l:'Advances',v:advances,c:C.teal},{l:'Closing Balance',v:counterBal,c:C.gold}].map(({l,v,c})=>(
                      <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',borderRadius:9,background:l==='Closing Balance'?C.goldPale:C.cream}}>
                        <span style={{fontSize:12,color:C.inkMid}}>{l}</span>
                        <span style={{fontSize:13,fontWeight:900,color:c,fontFamily:"'Playfair Display',serif"}}>{fmtK(v)}</span>
                      </div>
                    ))}
                    <div>
                      <p style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.14em',color:C.inkLight,marginBottom:6}}>Physical Count (optional)</p>
                      <Inp type="number" value={physCount} onChange={e=>setPhysCount(e.target.value)} placeholder="Enter physical cash count…"/>
                    </div>
                    <div>
                      <p style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.14em',color:C.inkLight,marginBottom:6}}>Shift Notes</p>
                      <Inp value={shiftNote} onChange={e=>setShiftNote(e.target.value)} placeholder="Any notes for this shift…"/>
                    </div>
                    <GoldBtn onClick={closeShift} icon={CheckSquare} style={{width:'100%',padding:'12px'}}>Close & Save Shift</GoldBtn>
                    <p style={{fontSize:10,color:C.inkGhost,textAlign:'center'}}>Saved to MongoDB — accessible from any device</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* REPORTS */}
          {activeTab==='reports'&&(
            <motion.div key="rep" variants={stag()} initial="hidden" animate="show" style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                <SectionHead icon={FileText}>Shift Reports — MongoDB</SectionHead>
                <GhostBtn onClick={()=>exportCSV(shiftReps.map(r=>({Date:r.date,ClosingBal:r.closingBalance,CashIn:r.cashIn,ManualIn:r.manualCashIn,Withdrawn:r.withdrawn,Expenses:r.expenses,Salaries:r.salaries,Physical:r.physicalCount||'—',Variance:r.variance||'—',ClosedBy:r.closedBy?.name||'—',Notes:r.note||'—'})),'shift_reports.csv')} icon={Download}>Export CSV</GhostBtn>
              </div>
              {shiftReps.length===0?(
                <div style={{textAlign:'center',padding:'50px',background:C.white,borderRadius:20,border:`1px solid ${C.border}`,color:C.inkGhost,fontSize:13}}>No shift reports yet. Use "Close Shift" in the Reconcile tab to generate them.</div>
              ):shiftReps.map((r,i)=>(
                <motion.div key={r._id||i} variants={fd} style={{background:C.white,borderRadius:18,border:`1px solid ${C.border}`,padding:'18px 20px'}}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
                    <div>
                      <p style={{fontSize:14,fontWeight:800,color:C.ink,fontFamily:"'Playfair Display',serif"}}>{fmtDt(r.date)}</p>
                      <p style={{fontSize:11,color:C.inkLight,marginTop:3}}>{fmtTm(r.closedAt)} · {r.closedBy?.name||'—'} · {r.note||'No notes'}</p>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <p style={{fontSize:20,fontWeight:900,color:C.gold,fontFamily:"'Playfair Display',serif"}}>{fmtK(r.closingBalance)}</p>
                      {r.variance!=null&&<p style={{fontSize:11,fontWeight:700,color:r.variance>=0?C.green:C.red,marginTop:3}}>Var: {r.variance>=0?'+':''}{fmtRs(r.variance)}</p>}
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))',gap:7}}>
                    {[{l:'Cash In',v:r.cashIn,c:C.green},{l:'Manual In',v:r.manualCashIn,c:C.blue},{l:'Withdrawn',v:r.withdrawn,c:C.red},{l:'Expenses',v:r.expenses,c:C.amber},{l:'Salaries',v:r.salaries,c:C.purple},r.physicalCount&&{l:'Physical',v:r.physicalCount,c:C.teal}].filter(Boolean).map(({l,v,c})=>(
                      <div key={l} style={{padding:'8px 10px',borderRadius:10,background:C.cream,textAlign:'center'}}>
                        <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase',color:C.inkGhost,marginBottom:3}}>{l}</p>
                        <p style={{fontSize:13,fontWeight:900,color:c}}>{fmtK(v)}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

        </AnimatePresence>
      )}

      {/* ── Entry Drawer ── */}
      <AnimatePresence>
        {drawerType&&dc&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={e=>e.target===e.currentTarget&&setDrawer(null)}
            style={{position:'fixed',inset:0,zIndex:700,background:'rgba(26,18,8,0.6)',backdropFilter:'blur(8px)',display:'flex',alignItems:'flex-end',justifyContent:'center',padding:16}}>
            <motion.div initial={{opacity:0,y:60}} animate={{opacity:1,y:0}} exit={{opacity:0,y:40}} transition={{type:'spring',damping:28,stiffness:300}}
              style={{width:'100%',maxWidth:480,background:C.cardBg,borderRadius:'24px 24px 20px 20px',border:`1.5px solid ${C.border}`,padding:'24px',boxShadow:'0 -24px 80px rgba(0,0,0,.22)'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:40,height:40,borderRadius:13,background:dc.bg,border:`1.5px solid ${dc.color}22`,display:'flex',alignItems:'center',justifyContent:'center'}}><dc.icon size={16} style={{color:dc.color}}/></div>
                  <div>
                    <p style={{fontSize:15,fontWeight:800,color:C.ink,fontFamily:"'Playfair Display',serif"}}>{dc.title}</p>
                    <p style={{fontSize:11,color:C.inkLight}}>Saved to MongoDB · syncs everywhere</p>
                  </div>
                </div>
                <button onClick={()=>setDrawer(null)} style={{width:32,height:32,borderRadius:10,border:`1px solid ${C.border}`,background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={13} style={{color:C.inkLight}}/></button>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:13}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div><p style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.14em',color:C.inkLight,marginBottom:6}}>Amount (₹) *</p><Inp type="number" min={1} value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="Enter amount…"/></div>
                  <div><p style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.14em',color:C.inkLight,marginBottom:6}}>Date</p><Inp type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
                </div>
                {['salary','advance'].includes(drawerType)&&(
                  <div><p style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.14em',color:C.inkLight,marginBottom:6}}>Staff / Recipient</p><Inp value={form.recipient} onChange={e=>setForm(f=>({...f,recipient:e.target.value}))} placeholder="Name of staff / recipient…"/></div>
                )}
                {drawerType==='adjustment'&&(
                  <div>
                    <p style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.14em',color:C.inkLight,marginBottom:6}}>Direction</p>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      {['+','−'].map(s=>(
                        <button key={s} onClick={()=>setForm(f=>({...f,category:s==='−'?'-':'+'}))} style={{padding:'11px',borderRadius:12,cursor:'pointer',fontWeight:800,fontSize:18,border:`1.5px solid ${form.category===(s==='−'?'-':'+')?(s==='+'?C.green:C.red):C.border}`,background:form.category===(s==='−'?'-':'+')?(s==='+'?C.greenPale:C.redPale):'transparent',color:form.category===(s==='−'?'-':'+')?(s==='+'?C.green:C.red):C.inkGhost}}>{s} {s==='+'?'Add':'Remove'}</button>
                      ))}
                    </div>
                  </div>
                )}
                <div><p style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.14em',color:C.inkLight,marginBottom:6}}>Note / Reason *</p><Inp value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder={dc.ph}/></div>
                {drawerType==='expense'&&(
                  <div>
                    <p style={{fontSize:10,fontWeight:600,color:C.inkGhost,marginBottom:6}}>Quick presets:</p>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      {['Stationery','Cleaning','Tea/Coffee','Supplies','Repairs','Utilities'].map(n=>(<button key={n} onClick={()=>setForm(f=>({...f,note:n}))} style={{padding:'4px 12px',borderRadius:100,fontSize:11,fontWeight:700,cursor:'pointer',border:`1px solid ${C.border}`,background:C.cream,color:C.inkMid}}>{n}</button>))}
                    </div>
                  </div>
                )}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:10,marginTop:18}}>
                <GhostBtn onClick={()=>setDrawer(null)} style={{padding:'12px'}}>Cancel</GhostBtn>
                <button onClick={addManual} disabled={saving||!form.amount||!form.note.trim()} style={{padding:'12px',borderRadius:14,border:'none',cursor:'pointer',fontWeight:800,fontSize:13,background:(!form.amount||!form.note.trim())?C.creamDark:`linear-gradient(135deg,${dc.color},${dc.color}CC)`,color:(!form.amount||!form.note.trim())?C.inkLight:'#fff',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:(!form.amount||!form.note.trim())?'none':`0 8px 24px ${dc.color}30`}}>
                  {saving?<Loader2 size={14} style={{animation:'spin 0.8s linear infinite'}}/>:<dc.icon size={14}/>}
                  {saving?'Saving…':`${dc.btn}${form.amount?` — ₹${Rs(form.amount)}`:''}`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   TXN ROW + PENDING CARD
   ═══════════════════════════════════════════════════════ */
const TxnRow=({p,i,onView})=>{
  const m=METHODS[p.method]||METHODS.other, s=PAY_STATUS[p.status]||PAY_STATUS.pending;
  return (
    <motion.div variants={fd} onClick={()=>onView(p)} whileHover={{background:C.goldPale}}
      style={{display:'flex',alignItems:'center',gap:14,padding:'13px 18px',cursor:'pointer',background:i%2===0?C.cream:C.white,borderBottom:`1px solid ${C.border}`,transition:'background 0.15s'}}>
      <Avatar name={p.customer?.name} size={38}/>
      <div style={{flex:1,minWidth:0}}><p style={{fontSize:13,fontWeight:700,color:C.ink,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.customer?.name||'Walk-in'}</p><p style={{fontSize:11,color:C.inkLight,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.service?.name||p.description||'Service'}</p></div>
      <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}><span style={{fontSize:16}}>{m.icon}</span><span style={{fontSize:11,fontWeight:700,color:m.color}}>{m.label}</span></div>
      <Badge color={s.color} bg={s.bg} border={s.border}>● {s.label}</Badge>
      <p style={{fontSize:15,fontWeight:900,color:C.ink,fontFamily:"'Playfair Display',serif",minWidth:70,textAlign:'right'}}>₹{Rs(p.amount)}</p>
      <p style={{fontSize:10,color:C.inkGhost,minWidth:54,textAlign:'right'}}>{fmtTm(p.createdAt)}</p>
      <ChevronRight size={13} style={{color:C.inkGhost,flexShrink:0}}/>
    </motion.div>
  );
};
const PendingCard=({p,onMark,onFlash})=>{
  const [marking,setMark]=useState(false), [method,setMethod]=useState('cash');
  const doMark=async()=>{setMark(true);try{await api.patch(`/payments/${p._id}`,{status:'completed',paymentMethod:method});onMark();onFlash(`₹${Rs(p.amount)} marked as paid`);}catch(e){onFlash(e.response?.data?.message||'Failed','err');}finally{setMark(false);}};
  return (
    <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',borderBottom:`1px solid ${C.amberBorder}`,background:C.amberPale}}>
      <div style={{width:8,height:8,borderRadius:'50%',background:C.amberMid,animation:'pulseDot 2s ease-in-out infinite',flexShrink:0}}/>
      <Avatar name={p.customer?.name} size={38}/>
      <div style={{flex:1,minWidth:0}}><p style={{fontSize:13,fontWeight:700,color:C.ink}}>{p.customer?.name||'Guest'}</p><p style={{fontSize:11,color:C.amber,marginTop:1}}>{p.service?.name||'Service'} · ₹{Rs(p.amount)}</p></div>
      <div style={{display:'flex',gap:6,alignItems:'center'}}>
        {['cash','upi','card'].map(m=>(<button key={m} onClick={()=>setMethod(m)} style={{padding:'4px 10px',borderRadius:100,fontSize:10,fontWeight:700,cursor:'pointer',border:`1px solid ${method===m?METHODS[m].color:C.border}`,background:method===m?METHODS[m].pale:'transparent',color:method===m?METHODS[m].color:C.inkGhost}}>{METHODS[m].icon}</button>))}
      </div>
      <button onClick={doMark} disabled={marking} style={{display:'flex',alignItems:'center',gap:5,padding:'7px 14px',borderRadius:12,border:'none',cursor:'pointer',background:`linear-gradient(135deg,${C.green},#16A34A)`,color:'#fff',fontSize:11,fontWeight:800,flexShrink:0}}>
        {marking?<Loader2 size={11} style={{animation:'spin 1s linear infinite'}}/>:<Check size={11}/>} Collect
      </button>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════ */
export default function AdminPayments(){
  const [payments,   setPayments] = useState([]);
  const [dashboard,  setDash]     = useState(null);
  const [loading,    setLoading]  = useState(true);
  const [syncing,    setSyncing]  = useState(false);
  const [syncSt,     setSyncSt]   = useState('idle');
  const [lastTs,     setLastTs]   = useState(null);
  const [activeView, setView]     = useState('transactions');
  const [methodF,    setMethodF]  = useState('');
  const [statusF,    setStatusF]  = useState('');
  const [from,       setFrom]     = useState('');
  const [to,         setTo]       = useState('');
  const [search,     setSearch]   = useState('');
  const [sortCol,    setSort]     = useState('date');
  const [sortDir,    setSortDir]  = useState('desc');
  const [page,       setPage]     = useState(1);
  const [drawerPay,  setDrawer]   = useState(null);
  const [toast,      setToast]    = useState(null);
  const pollRef=useRef(null);
  const PAGE_SIZE=25;

  const flash=(msg,type='ok')=>{setToast({msg,type});setTimeout(()=>setToast(null),2800);};

  const fetchAll=useCallback(async(silent=false)=>{
    if(!silent) setLoading(true); else setSyncing(true);
    try{
      const [pR,dR]=await Promise.allSettled([
        api.get('/payments',{params:{limit:1000,startDate:thisMoStart()}}),
        api.get('/payments/dashboard'),
      ]);
      if(pR.status==='fulfilled') setPayments(pR.value.data?.payments||pR.value.data||[]);
      if(dR.status==='fulfilled') setDash(dR.value.data?.dashboard||dR.value.data||null);
      setLastTs(Date.now()); setSyncSt('live');
    }catch{setSyncSt('error');}
    finally{setLoading(false);setSyncing(false);}
  },[]);

  const deltaPoll=useCallback(async()=>{
    if(!lastTs) return;
    try{
      const {data}=await api.get(`/payments/since/${lastTs}`);
      if(data.payments?.length){
        setPayments(prev=>{
          const map=new Map(prev.map(p=>[p._id,p]));
          data.payments.forEach(p=>map.set(p._id,p));
          return Array.from(map.values()).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
        });
      }
      setLastTs(data.serverTs||Date.now()); setSyncSt('live');
    }catch{setSyncSt('error');}
  },[lastTs]);

  useEffect(()=>{fetchAll();},[fetchAll]);
  useEffect(()=>{ loadSalonSettings(); return subscribeSalonSettings(()=>{}); },[]);
  useEffect(()=>{pollRef.current=setInterval(deltaPoll,12000);return()=>clearInterval(pollRef.current);},[deltaPoll]);
  useEffect(()=>{const f=()=>deltaPoll();window.addEventListener('focus',f);return()=>window.removeEventListener('focus',f);},[deltaPoll]);

  const filtered=useMemo(()=>{
    let list=payments.filter(p=>{
      const q=search.toLowerCase();
      const mQ=!q||(p.customer?.name||'').toLowerCase().includes(q)||(p.customer?.phone||'').includes(q)||(p.transactionId||'').includes(q);
      const mM=!methodF||p.method===methodF;
      const mS=!statusF||p.status===statusF;
      const d=new Date(p.createdAt).toISOString().split('T')[0];
      return mQ&&mM&&mS&&(!from||d>=from)&&(!to||d<=to);
    });
    return [...list].sort((a,b)=>{
      let va=0,vb=0;
      if(sortCol==='amount'){va=a.amount||0;vb=b.amount||0;}
      else{va=new Date(a.createdAt).getTime();vb=new Date(b.createdAt).getTime();}
      return sortDir==='asc'?va-vb:vb-va;
    });
  },[payments,search,methodF,statusF,from,to,sortCol,sortDir]);

  const pending   =useMemo(()=>payments.filter(p=>p.status==='pending'),[payments]);
  const paginated =useMemo(()=>filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE),[filtered,page]);
  const totalPages=Math.ceil(filtered.length/PAGE_SIZE);
  const totalPaid    =payments.filter(p=>p.status==='completed').reduce((s,p)=>s+p.amount,0);
  const totalPending =payments.filter(p=>p.status==='pending').reduce((s,p)=>s+p.amount,0);
  const totalRefunded=payments.filter(p=>p.status==='refunded').reduce((s,p)=>s+p.amount,0);
  const todayPaid    =payments.filter(p=>p.status==='completed'&&new Date(p.createdAt).toISOString().split('T')[0]===today()).reduce((s,p)=>s+p.amount,0);
  const methodTotals=useMemo(()=>{const map={};payments.filter(p=>p.status==='completed').forEach(p=>{if(!map[p.method])map[p.method]={_id:p.method,total:0,count:0};map[p.method].total+=p.amount;map[p.method].count++;});return Object.values(map);},[payments]);
  const todayRevByHr=useMemo(()=>{const map={};payments.filter(p=>p.status==='completed'&&new Date(p.createdAt).toISOString().split('T')[0]===today()).forEach(p=>{const h=new Date(p.createdAt).getHours();if(!map[h])map[h]=0;map[h]+=p.amount;});return Array.from({length:24},(_,h)=>({h,total:map[h]||0})).filter(x=>x.total>0);},[payments]);

  const VIEWS=[{id:'transactions',label:'Transactions',icon:Receipt},{id:'analytics',label:'Analytics',icon:BarChart3},{id:'pending',label:`Pending${pending.length?` (${pending.length})`:''}`,icon:Clock},{id:'cashcounter',label:'Cash Counter',icon:Wallet}];
  const doExport=()=>exportCSV(filtered.map(p=>({Date:fmtDt(p.createdAt),Time:fmtTm(p.createdAt),Customer:p.customer?.name||'—',Phone:p.customer?.phone||'—',Service:p.service?.name||'—',Amount:p.amount||0,Method:METHODS[p.method]?.label||p.method||'—',Status:PAY_STATUS[p.status]?.label||p.status||'—',TxnID:p.transactionId||'—',CollectedBy:p.collectedBy?.name||'—'})),`payments_${today()}.csv`);
  const clearFilters=()=>{setMethodF('');setStatusF('');setFrom('');setTo('');setSearch('');setPage(1);};
  const SortHd=({col,children})=>(<span onClick={()=>{if(sortCol===col)setSortDir(d=>d==='asc'?'desc':'asc');else{setSort(col);setSortDir('desc');}}} style={{cursor:'pointer',userSelect:'none',display:'flex',alignItems:'center',gap:3,fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.14em',color:C.inkLight}}>{children}<span style={{opacity:sortCol===col?1:0.2,fontSize:7}}>{sortCol===col&&sortDir==='asc'?'▲':'▼'}</span></span>);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;0,900;1,600&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <motion.div variants={stag(0.06)} initial="hidden" animate="show" style={{fontFamily:"'DM Sans',sans-serif",maxWidth:1200,margin:'0 auto',paddingBottom:70}}>

        {/* HERO */}
        <motion.div variants={fdL} style={{position:'relative',borderRadius:28,marginBottom:22,overflow:'hidden',background:`linear-gradient(135deg,${C.heroBg},${C.heroBg2})`,border:'1px solid rgba(184,134,11,.2)',boxShadow:'0 24px 80px rgba(0,0,0,.32)'}}>
          <div style={{position:'absolute',inset:0,backgroundImage:`repeating-linear-gradient(45deg,${C.gold} 0,${C.gold} 1px,transparent 0,transparent 50%)`,backgroundSize:'20px 20px',opacity:.04}}/>
          <div style={{position:'absolute',top:-100,right:-100,width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(218,165,32,.07),transparent 65%)'}}/>
          <div style={{position:'relative',padding:'32px 40px'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:24,marginBottom:26}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:10}}>
                  <Sparkles size={11} style={{color:C.goldLight}}/>
                  <span style={{fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.26em',color:C.goldLight}}>Payment Management</span>
                  <span style={{display:'flex',alignItems:'center',gap:4,padding:'2px 9px',borderRadius:100,fontSize:9,fontWeight:700,background:syncSt==='live'?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${syncSt==='live'?'rgba(34,197,94,0.2)':'rgba(239,68,68,0.2)'}`,color:syncSt==='live'?'#6EE7B7':'#FCA5A5'}}>
                    <Pulse color={syncSt==='live'?'#22C55E':'#EF4444'} size={5}/>
                    {syncing?'Syncing…':syncSt==='live'?'Live':'Offline'}
                  </span>
                </div>
                <h1 style={{fontSize:40,fontWeight:900,color:'#FAF3E0',fontFamily:"'Playfair Display',serif",margin:0,lineHeight:1.05,letterSpacing:'-0.02em'}}>Payments & Finance</h1>
                <p style={{fontSize:13,color:'rgba(255,255,255,.35)',marginTop:10}}>{payments.length} transactions · ₹{Rs(totalPaid)} collected · {pending.length} pending{lastTs?` · synced ${new Date(lastTs).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`:''}</p>
              </div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
                {[{l:'Collected',v:fmtK(totalPaid),c:'#86EFAC',bg:'rgba(52,211,153,.09)',b:'rgba(52,211,153,.18)'},{l:'Pending',v:fmtK(totalPending),c:'#FCD34D',bg:'rgba(251,191,36,.09)',b:'rgba(251,191,36,.18)'},{l:'Refunded',v:fmtK(totalRefunded),c:'#C4B5FD',bg:'rgba(167,139,250,.09)',b:'rgba(167,139,250,.18)'},{l:"Today's Rev",v:fmtK(todayPaid),c:'#93C5FD',bg:'rgba(96,165,250,.09)',b:'rgba(96,165,250,.18)'}].map(chip=>(
                  <div key={chip.l} style={{padding:'10px 18px',borderRadius:16,background:chip.bg,border:`1px solid ${chip.b}`,textAlign:'center'}}>
                    <p style={{fontSize:24,fontWeight:900,color:chip.c,fontFamily:"'Playfair Display',serif",lineHeight:1}}>{chip.v}</p>
                    <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.14em',color:'rgba(255,255,255,.3)',marginTop:4}}>{chip.l}</p>
                  </div>
                ))}
                <div style={{display:'flex',gap:8}}>
                  <button onClick={doExport} style={{display:'flex',alignItems:'center',gap:6,padding:'10px 18px',borderRadius:14,border:'1px solid rgba(255,255,255,.14)',background:'rgba(255,255,255,.07)',color:'rgba(255,255,255,.7)',fontSize:12,fontWeight:700,cursor:'pointer'}}><Download size={13}/> Export</button>
                  <button onClick={()=>fetchAll(true)} disabled={syncing} style={{width:40,height:40,borderRadius:13,border:'1px solid rgba(255,255,255,.14)',background:'rgba(255,255,255,.07)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',opacity:syncing?0.5:1}}><RefreshCw size={15} color="rgba(255,255,255,.55)" style={{animation:syncing?'spin 0.8s linear infinite':'none'}}/></button>
                </div>
              </div>
            </div>
            {totalPaid>0&&(<>
              <div style={{display:'flex',height:8,borderRadius:100,overflow:'hidden',gap:2}}>
                {Object.entries(METHODS).map(([k,m])=>{const row=methodTotals.find(r=>r._id===k);if(!row||!row.total)return null;return <div key={k} title={`${m.label}: ₹${Rs(row.total)}`} style={{height:'100%',background:m.color,width:`${pct(row.total,totalPaid)}%`,transition:'width 0.7s'}}/>;})}</div>
              <div style={{display:'flex',gap:14,marginTop:10,flexWrap:'wrap'}}>
                {Object.entries(METHODS).map(([k,m])=>{const row=methodTotals.find(r=>r._id===k);if(!row||!row.total)return null;return <div key={k} style={{display:'flex',alignItems:'center',gap:5}}><span style={{width:8,height:8,borderRadius:'50%',background:m.color,display:'inline-block'}}/><span style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,.45)'}}>{m.label}: ₹{Rs(row.total)}</span></div>;})}</div>
            </>)}
          </div>
        </motion.div>

        {/* STAT CARDS */}
        <motion.div variants={stag(0.06)} initial="hidden" animate="show" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14,marginBottom:22}}>
          <StatCard label="Total Collected" value={fmtK(totalPaid)} sub={`${payments.filter(p=>p.status==='completed').length} transactions`} delta={dashboard?.growth} icon={TrendingUp} color={C.green} bg={C.greenPale} spark={dashboard?.daily||[]}/>
          <StatCard label="Today Revenue" value={fmtK(todayPaid)} sub={`${payments.filter(p=>p.status==='completed'&&new Date(p.createdAt).toISOString().split('T')[0]===today()).length} today`} icon={Zap} color={C.gold} bg={C.goldPale}/>
          <StatCard label="Pending" value={fmtK(totalPending)} sub={`${pending.length} unpaid`} icon={Clock} color={C.amber} bg={C.amberPale}/>
          <StatCard label="Refunded" value={fmtK(totalRefunded)} sub={`${payments.filter(p=>p.status==='refunded').length} refunds`} icon={RotateCcw} color={C.purple} bg={C.purplePale}/>
          <StatCard label="Avg Transaction" value={fmtK(totalPaid/Math.max(payments.filter(p=>p.status==='completed').length,1))} icon={Target} color={C.blue} bg={C.bluePale}/>
        </motion.div>

        {/* NAV TABS */}
        <motion.div variants={fd} style={{display:'flex',gap:4,marginBottom:20,padding:5,borderRadius:20,background:C.cardBg,border:`1px solid ${C.border}`,overflowX:'auto'}}>
          {VIEWS.map(({id,label,icon:Icon})=>(
            <button key={id} onClick={()=>setView(id)} style={{display:'flex',alignItems:'center',gap:7,padding:'10px 20px',borderRadius:15,fontSize:12,fontWeight:700,cursor:'pointer',border:'none',whiteSpace:'nowrap',transition:'all 0.18s',background:activeView===id?`linear-gradient(135deg,${C.goldDeep},${C.goldLight})`:'transparent',color:activeView===id?'#fff':C.inkLight,boxShadow:activeView===id?`0 6px 20px ${C.gold}30`:'none'}}>
              <Icon size={13}/>{label}
            </button>
          ))}
        </motion.div>

        {loading&&(<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'90px 0',gap:16}}>
          <div style={{width:56,height:56,borderRadius:18,background:`linear-gradient(135deg,${C.goldDeep},${C.goldLight})`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 12px 36px ${C.gold}30`}}><Loader2 size={24} color="#fff" style={{animation:'spin 1s linear infinite'}}/></div>
          <p style={{fontSize:13,color:C.inkLight,fontWeight:600}}>Loading payments…</p>
        </div>)}

        {!loading&&(
          <AnimatePresence mode="wait">

            {/* TRANSACTIONS */}
            {activeView==='transactions'&&(
              <motion.div key="txns" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                <motion.div variants={fd} style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:22,padding:'18px 22px',marginBottom:18}}>
                  <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center',marginBottom:12}}>
                    <div style={{position:'relative',flex:1,minWidth:240}}>
                      <Search size={13} style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',color:C.inkGhost}}/>
                      <Inp value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search customer, phone, txn ID…" style={{paddingLeft:36,paddingRight:search?34:14}}/>
                      {search&&<button onClick={()=>setSearch('')} style={{position:'absolute',right:11,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer'}}><X size={12} style={{color:C.inkGhost}}/></button>}
                    </div>
                    <Sel value={methodF} onChange={e=>{setMethodF(e.target.value);setPage(1);}} style={{width:'auto',minWidth:130}}><option value="">All Methods</option>{Object.entries(METHODS).map(([k,m])=><option key={k} value={k}>{m.icon} {m.label}</option>)}</Sel>
                    <Sel value={statusF} onChange={e=>{setStatusF(e.target.value);setPage(1);}} style={{width:'auto',minWidth:120}}><option value="">All Status</option>{Object.entries(PAY_STATUS).map(([k,s])=><option key={k} value={k}>{s.label}</option>)}</Sel>
                    <Inp type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{width:140}}/>
                    <Inp type="date" value={to}   onChange={e=>setTo(e.target.value)}   style={{width:140}}/>
                    {(methodF||statusF||from||to||search)&&<button onClick={clearFilters} style={{display:'flex',alignItems:'center',gap:5,padding:'9px 14px',borderRadius:12,border:`1px solid ${C.redBorder}`,background:C.redPale,color:C.red,fontSize:11,fontWeight:700,cursor:'pointer'}}><X size={11}/> Clear</button>}
                  </div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {[['Today',today(),today()],['This Week',thisWeekStart(),today()],['This Month',thisMoStart(),today()]].map(([l,f,t])=><PillBtn key={l} active={from===f&&to===t} onClick={()=>{setFrom(f);setTo(t);setPage(1);}}>{l}</PillBtn>)}
                    {Object.entries(METHODS).map(([k,m])=><PillBtn key={k} active={methodF===k} onClick={()=>{setMethodF(methodF===k?'':k);setPage(1);}} color={m.color}>{m.icon} {m.label}</PillBtn>)}
                    {Object.entries(PAY_STATUS).map(([k,s])=><PillBtn key={k} active={statusF===k} onClick={()=>{setStatusF(statusF===k?'':k);setPage(1);}} color={s.color}>● {s.label}</PillBtn>)}
                  </div>
                </motion.div>
                <motion.div variants={fd} style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:22,overflow:'hidden'}}>
                  <div style={{display:'flex',alignItems:'center',gap:14,padding:'13px 18px',borderBottom:`1px solid ${C.border}`,background:C.cream}}>
                    <div style={{width:38}}/><div style={{flex:1}}><SortHd col="name">Customer</SortHd></div>
                    <div style={{width:120}}><span style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.14em',color:C.inkLight}}>Method</span></div>
                    <div style={{width:80}}><span style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.14em',color:C.inkLight}}>Status</span></div>
                    <div style={{minWidth:70,textAlign:'right'}}><SortHd col="amount">Amount</SortHd></div>
                    <div style={{minWidth:54,textAlign:'right'}}><SortHd col="date">Time</SortHd></div>
                    <div style={{width:13}}/>
                  </div>
                  {paginated.length===0?(<div style={{textAlign:'center',padding:'60px',color:C.inkGhost}}><Receipt size={32} style={{margin:'0 auto 12px'}}/><p style={{fontSize:14,fontWeight:700,marginBottom:6,color:C.inkLight}}>No payments found</p><p style={{fontSize:12}}>{search||methodF||statusF||from||to?'Try adjusting filters':'No payments recorded yet'}</p></div>):(
                    <motion.div variants={stag(0.02)} initial="hidden" animate="show">{paginated.map((p,i)=><TxnRow key={p._id||i} p={p} i={i} onView={setDrawer}/>)}</motion.div>
                  )}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'13px 18px',borderTop:`1px solid ${C.border}`,background:C.cream,flexWrap:'wrap',gap:10}}>
                    <p style={{fontSize:11,color:C.inkLight}}>{filtered.length} result{filtered.length!==1?'s':''} · Total: <strong style={{color:C.gold}}>₹{Rs(filtered.reduce((s,p)=>s+(p.amount||0),0))}</strong></p>
                    {totalPages>1&&(<div style={{display:'flex',gap:5,alignItems:'center'}}>
                      <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{padding:'5px 12px',borderRadius:9,border:`1px solid ${C.border}`,background:'transparent',cursor:'pointer',fontSize:11,fontWeight:700,color:C.inkLight,opacity:page===1?0.38:1}}>← Prev</button>
                      <span style={{fontSize:12,color:C.inkMid,padding:'0 8px'}}>{page} / {totalPages}</span>
                      <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{padding:'5px 12px',borderRadius:9,border:`1px solid ${C.border}`,background:'transparent',cursor:'pointer',fontSize:11,fontWeight:700,color:C.inkLight,opacity:page===totalPages?0.38:1}}>Next →</button>
                    </div>)}
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* ANALYTICS */}
            {activeView==='analytics'&&(
              <motion.div key="analytics" variants={stag(0.05)} initial="hidden" animate="show" style={{display:'flex',flexDirection:'column',gap:18}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  <motion.div variants={fd} style={{background:C.cardBg,borderRadius:22,padding:'22px',border:`1px solid ${C.border}`}}><SectionHead icon={PieChart}>Revenue by Method</SectionHead><MethodBreakdown data={methodTotals} total={totalPaid}/></motion.div>
                  <motion.div variants={fd} style={{background:C.cardBg,borderRadius:22,padding:'22px',border:`1px solid ${C.border}`}}>
                    <SectionHead icon={BarChart2}>Status Split</SectionHead>
                    {Object.entries(PAY_STATUS).map(([k,s])=>{const cnt=payments.filter(p=>p.status===k).length;const tot=payments.filter(p=>p.status===k).reduce((a,p)=>a+p.amount,0);if(!cnt)return null;return(<div key={k} style={{marginBottom:12}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}><div style={{display:'flex',alignItems:'center',gap:7}}><span style={{width:7,height:7,borderRadius:'50%',background:s.color,display:'inline-block'}}/><span style={{fontSize:12,fontWeight:700,color:C.inkMid}}>{s.label}</span></div><div style={{textAlign:'right'}}><span style={{fontSize:12,fontWeight:900,color:s.color}}>{fmtK(tot)}</span><span style={{fontSize:10,color:C.inkGhost,marginLeft:6}}>{cnt} txns</span></div></div><ProgBar val={cnt} max={Math.max(payments.length,1)} color={s.color} h={5}/></div>);})}
                  </motion.div>
                </div>
                {todayRevByHr.length>0&&(
                  <motion.div variants={fd} style={{background:C.cardBg,borderRadius:22,padding:'22px',border:`1px solid ${C.border}`}}>
                    <SectionHead icon={Activity}>Today's Collection by Hour</SectionHead>
                    <div style={{display:'flex',gap:4,alignItems:'flex-end',height:70}}>
                      {Array.from({length:24},(_,h)=>{const row=todayRevByHr.find(x=>x.h===h);const max=Math.max(...todayRevByHr.map(x=>x.total),1);const v=row?.total||0;const ht=Math.max(4,Math.round(v/max*60));return(<div key={h} title={`${h}:00 — ₹${Rs(v)}`} style={{flex:1,cursor:'help'}}><div style={{height:ht,borderRadius:'4px 4px 0 0',background:v?`linear-gradient(to top,${C.goldDeep},${C.goldLight})`:`${C.gold}1A`,transition:'height 0.7s'}}/></div>);})}
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:5}}>{[6,9,12,15,18,21].map(h=><span key={h} style={{fontSize:9,color:C.inkGhost,fontWeight:700}}>{h}h</span>)}</div>
                  </motion.div>
                )}
                <motion.div variants={fd} style={{background:C.cardBg,borderRadius:22,padding:'22px',border:`1px solid ${C.border}`}}>
                  <SectionHead icon={Crown}>Top Customers by Revenue</SectionHead>
                  {(()=>{const map={};payments.filter(p=>p.status==='completed'&&p.customer?.name).forEach(p=>{const k=p.customer.name;if(!map[k])map[k]={name:k,phone:p.customer?.phone,total:0,count:0};map[k].total+=p.amount;map[k].count++;});return Object.values(map).sort((a,b)=>b.total-a.total).slice(0,8).map((c,i)=>(<div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:i<7?`1px solid ${C.border}`:'none'}}><div style={{width:26,height:26,borderRadius:8,background:i<3?C.goldPale:C.cream,border:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{i===0?<span style={{fontSize:13}}>👑</span>:i===1?<span style={{fontSize:13}}>⭐</span>:i===2?<span style={{fontSize:13}}>🏅</span>:<span style={{fontSize:10,fontWeight:900,color:C.inkGhost}}>#{i+1}</span>}</div><Avatar name={c.name} size={34}/><div style={{flex:1}}><p style={{fontSize:13,fontWeight:700,color:C.ink}}>{c.name}</p><p style={{fontSize:10,color:C.inkGhost,marginTop:1}}>{c.count} visit{c.count!==1?'s':''} · {c.phone||'—'}</p></div><p style={{fontSize:16,fontWeight:900,color:i===0?C.gold:C.inkMid,fontFamily:"'Playfair Display',serif"}}>₹{Rs(c.total)}</p><div style={{width:80}}><ProgBar val={c.total} max={Object.values(map).sort((a,b)=>b.total-a.total)[0]?.total||1} color={i===0?C.gold:C.inkGhost} h={4}/></div></div>));})()}
                </motion.div>
                {dashboard?.staffRevenue?.length>0&&(
                  <motion.div variants={fd} style={{background:C.cardBg,borderRadius:22,padding:'22px',border:`1px solid ${C.border}`}}>
                    <SectionHead icon={Award}>Staff Revenue (This Month)</SectionHead>
                    {dashboard.staffRevenue.map((s,i)=>(<div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:i<dashboard.staffRevenue.length-1?`1px solid ${C.border}`:'none'}}><Avatar name={s.name} size={34}/><div style={{flex:1}}><p style={{fontSize:13,fontWeight:700,color:C.ink}}>{s.name||'Staff'}</p><p style={{fontSize:10,color:C.inkGhost,marginTop:1}}>{s.count} services</p></div><p style={{fontSize:16,fontWeight:900,color:C.gold,fontFamily:"'Playfair Display',serif"}}>₹{Rs(s.revenue)}</p><div style={{width:80}}><ProgBar val={s.revenue} max={dashboard.staffRevenue[0]?.revenue||1} color={C.gold} h={4}/></div></div>))}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* PENDING */}
            {activeView==='pending'&&(
              <motion.div key="pending" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                <div style={{background:C.amberPale,borderRadius:22,border:`1.5px solid ${C.amberBorder}`,overflow:'hidden'}}>
                  <div style={{padding:'18px 22px',borderBottom:`1px solid ${C.amberBorder}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:36,height:36,borderRadius:11,background:C.amberBorder,display:'flex',alignItems:'center',justifyContent:'center'}}><AlertTriangle size={16} style={{color:C.amber}}/></div>
                      <div><p style={{fontSize:14,fontWeight:800,color:C.amber,fontFamily:"'Playfair Display',serif"}}>{pending.length} Pending Payments</p><p style={{fontSize:11,color:C.inkLight}}>Total ₹{Rs(totalPending)} awaiting collection</p></div>
                    </div>
                    <Badge color={C.amber} bg={C.amberPale} border={C.amberBorder}>₹{Rs(totalPending)} pending</Badge>
                  </div>
                  {pending.length===0?(<div style={{textAlign:'center',padding:'50px',background:C.greenPale}}><CheckCircle2 size={32} style={{color:C.green,margin:'0 auto 12px'}}/><p style={{fontSize:14,fontWeight:700,color:C.green}}>All payments collected! 🎉</p></div>):(pending.map(p=><PendingCard key={p._id} p={p} onMark={()=>fetchAll(true)} onFlash={flash}/>))}
                </div>
              </motion.div>
            )}

            {/* CASH COUNTER */}
            {activeView==='cashcounter'&&(
              <motion.div key="cc" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                <CashCounter onFlash={flash}/>
              </motion.div>
            )}

          </AnimatePresence>
        )}

      </motion.div>

      <AnimatePresence>{drawerPay&&<PaymentDrawer payment={drawerPay} onClose={()=>setDrawer(null)} onRefund={()=>fetchAll(true)} onFlash={flash}/>}</AnimatePresence>
      <AnimatePresence>{toast&&<Toast msg={toast.msg} type={toast.type}/>}</AnimatePresence>

      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:${C.cream}}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:100px}
        ::-webkit-scrollbar-thumb:hover{background:${C.borderMid}}
        input[type="date"]::-webkit-calendar-picker-indicator{cursor:pointer;opacity:0.5}
        option{background:${C.white};color:${C.ink}}
      `}</style>
    </>
  );
}