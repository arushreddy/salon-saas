import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/services/api";
import {
  X, Wallet, TrendingDown, Plus, Trash2, Download,
  CreditCard, Smartphone, Globe, RefreshCw, Loader2,
  CheckCircle2, AlertCircle, Zap,
} from "lucide-react";

/* ── Design tokens ─────────────────────────────────── */
const C = {
  cream:'#FDF8F0', creamMid:'#F7EFD8', creamDark:'#EDE0C0', creamBorder:'#DFD0A8',
  goldMid:'#B8860B', goldPale:'#FFF8E7', goldDeep:'#8B6914',
  ink:'#16100A', inkMid:'#5A4020', inkLight:'#9C8660', inkFaint:'#B09060', inkGhost:'#D4B890',
  ok:'#166534', okPale:'#DCFCE7', okBorder:'#86EFAC',
  risk:'#991B1B', riskPale:'#FEF2F2', riskBorder:'#FECACA',
  warn:'#92400E', warnPale:'#FEF3DC', warnBorder:'#FDE68A',
  blue:'#1E40AF', bluePale:'#EFF6FF', blueBorder:'#BFDBFE',
  purple:'#6D28D9', teal:'#0F766E',
  heroBg:'#1C1410', heroBg2:'#2D1E10',
};

/* ── Helpers ─────────────────────────────────────────── */
const IST      = 5.5 * 3600000;
const todayStr = () => new Date(Date.now() + IST).toISOString().split('T')[0];
const fmtRs    = n  => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtK     = n  => { if (!n) return '₹0'; if (n >= 1e5) return `₹${(n/1e5).toFixed(1)}L`; if (n >= 1e3) return `₹${(n/1e3).toFixed(1)}K`; return fmtRs(n); };
const fmtTm    = d  => { try { return new Date(d).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}); } catch { return '—'; } };
const fmtDt    = d  => { try { return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'}); } catch { return '—'; } };

/* ── BroadcastChannel — signals all tabs to refresh ── */
const CHANNEL = 'glamour_cash_sync';
function useBroadcast() {
  const ref = useRef(null);
  useEffect(() => {
    try { ref.current = new BroadcastChannel(CHANNEL); } catch {}
    return () => { try { ref.current?.close(); } catch {} };
  }, []);
  return {
    listen: (fn) => { if (ref.current) ref.current.onmessage = fn; },
    send:   ()   => { try { ref.current?.postMessage({ type:'refresh', ts:Date.now() }); } catch {} },
  };
}

const TXNCAT = {
  cash_in:    { label:'Cash Added',  color:C.ok,     isIn:true  },
  withdrawal: { label:'Withdrawal',  color:C.risk,   isIn:false },
  expense:    { label:'Expense',     color:C.warn,   isIn:false },
  salary:     { label:'Salary Paid', color:C.purple, isIn:false },
  advance:    { label:'Advance',     color:C.teal,   isIn:false },
};

function exportCSV(cashBookings, manualTxns) {
  const cell = v => { const s = String(v??''); return /^\d+$/.test(s)?`="` +s+`"`:'"'+s.replace(/"/g,'""')+'"'; };
  const rows = [
    ...cashBookings.map(b => ({ Date: b.date?fmtDt(b.date):'', Type:'Cash Sale', Description:`${b.service?.name||'Service'} — ${b.customer?.name||'Guest'}`, 'Amount In':b.finalAmount||b.totalAmount||0, 'Amount Out':'' })),
    ...manualTxns.map(t => ({ Date:t.date, Type:TXNCAT[t.type]?.label||t.type, Description:t.note, 'Amount In':t.type==='cash_in'?t.amount:'', 'Amount Out':t.type!=='cash_in'?t.amount:'' })),
  ];
  const hdr = Object.keys(rows[0]||{});
  const csv = [hdr.join(','), ...rows.map(r=>hdr.map(h=>cell(r[h])).join(','))].join('\n');
  const a = Object.assign(document.createElement('a'), { href:URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'})), download:`cash_${todayStr()}.csv` });
  a.click(); URL.revokeObjectURL(a.href);
}

/* ── Atoms ───────────────────────────────────────────── */
function SyncPill({ status, syncing, lastTs }) {
  const live = status === 'live';
  return (
    <div style={{display:'flex',alignItems:'center',gap:7}}>
      <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:100,fontSize:10,fontWeight:700,background:live?'rgba(34,197,94,.12)':'rgba(239,68,68,.12)',border:`1px solid ${live?'rgba(34,197,94,.25)':'rgba(239,68,68,.25)'}`,color:live?'#6EE7B7':'#FCA5A5'}}>
        <span style={{width:6,height:6,borderRadius:'50%',background:live?'#22C55E':'#EF4444',animation:'pulseDot 2s ease-in-out infinite'}}/>
        {syncing?'Syncing…':live?'Live — synced with Admin':'Offline'}
      </span>
      {lastTs&&live&&<span style={{fontSize:10,color:C.inkFaint}}>↻ {new Date(lastTs).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>}
    </div>
  );
}

function Pill({ label, value, color, bg, border }) {
  return (
    <div style={{padding:'14px 16px',background:bg||'#fff',border:`1.5px solid ${border||C.creamBorder}`,borderRadius:16}}>
      <div style={{fontSize:9,fontWeight:800,color,textTransform:'uppercase',letterSpacing:'0.14em',marginBottom:5}}>{label}</div>
      <div style={{fontSize:22,fontWeight:900,color,fontFamily:'Playfair Display,serif'}}>{value}</div>
    </div>
  );
}

function TxnRow({ dot, title, sub, amtLabel, amtColor, badge, onDelete }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:12,padding:'11px 18px'}}>
      <div style={{width:8,height:8,borderRadius:'50%',background:dot,flexShrink:0}}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:600,color:C.ink,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{title}</div>
        {sub&&<div style={{fontSize:10,color:C.inkFaint}}>{sub}</div>}
      </div>
      {badge&&<span style={{padding:'2px 8px',borderRadius:100,fontSize:9,fontWeight:700,background:badge.bg,color:badge.color,border:`1px solid ${badge.border}`,flexShrink:0}}>{badge.label}</span>}
      <div style={{fontSize:14,fontWeight:700,color:amtColor,flexShrink:0,marginRight:onDelete?6:0}}>{amtLabel}</div>
      {onDelete&&(
        <button onClick={onDelete} style={{padding:4,borderRadius:6,border:'none',background:'none',cursor:'pointer',color:C.inkGhost,flexShrink:0}}
          onMouseEnter={e=>e.currentTarget.style.color=C.risk} onMouseLeave={e=>e.currentTarget.style.color=C.inkGhost}>
          <Trash2 size={12}/>
        </button>
      )}
    </div>
  );
}

function Section({ title, badge, badgeColor='#fff', badgeBg=C.inkMid, action, children, empty }) {
  return (
    <div style={{background:'#fff',border:`1px solid ${C.creamBorder}`,borderRadius:14,overflow:'hidden',marginBottom:16}}>
      <div style={{padding:'11px 18px',background:C.creamMid,borderBottom:`1px solid ${C.creamBorder}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:12,fontWeight:700,color:C.inkMid}}>{title}</span>
          {badge!==undefined&&<span style={{padding:'2px 8px',borderRadius:100,fontSize:10,fontWeight:700,color:badgeColor,background:badgeBg}}>{badge}</span>}
        </div>
        {action}
      </div>
      {empty?<div style={{padding:'28px 18px',textAlign:'center',color:C.inkFaint,fontSize:12}}>{empty}</div>:<div>{children}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function ReceptionistCash() {
  const [cashBookings,   setCashBookings] = useState([]);
  const [onlineBookings, setOnline]       = useState([]);
  const [manualTxns,     setManual]       = useState([]);
  const [summary,        setSummary]      = useState({balance:0,cashIn:0,withdrawn:0,expenses:0,salaries:0,advances:0});
  const [loading,        setLoading]      = useState(true);
  const [syncing,        setSyncing]      = useState(false);
  const [syncStatus,     setSyncStatus]   = useState('idle');
  const [lastTs,         setLastTs]       = useState(null);
  const [drawer,         setDrawer]       = useState(null);
  const [form,           setForm]         = useState({amount:'',note:''});
  const [saving,         setSaving]       = useState(false);
  const [toast,          setToast]        = useState(null);
  const [tab,            setTab]          = useState('cash');

  // Refs so deltaPoll closure always sees latest lastTs
  const lastTsRef  = useRef(null);
  const pollRef    = useRef(null);
  const channelRef = useRef(null);
  useEffect(()=>{ lastTsRef.current = lastTs; },[lastTs]);

  const showToast = (text, ok=true) => { setToast({text,ok}); setTimeout(()=>setToast(null),3000); };

  /* ── Full fetch ── */
  const fetchAll = useCallback(async (silent=false) => {
    if (!silent) setLoading(true); else setSyncing(true);
    try {
      const [txnR, bkR, sumR] = await Promise.allSettled([
        api.get('/cash-transactions',{params:{limit:500}}),
        api.get('/cash-transactions/today-bookings'),
        api.get('/cash-transactions/summary'),
      ]);
      if (txnR.status==='fulfilled') setManual(txnR.value.data.transactions||[]);
      if (bkR.status==='fulfilled') {
        setCashBookings((bkR.value.data.cashBookings||[]).slice().reverse());
        setOnline((bkR.value.data.onlineBookings||[]).slice().reverse());
      }
      if (sumR.status==='fulfilled') setSummary(sumR.value.data.summary||{});
      setLastTs(Date.now()); setSyncStatus('live');
    } catch { setSyncStatus('error'); }
    finally { setLoading(false); setSyncing(false); }
  },[]);

  /* ── Delta poll — only new/changed docs since lastTs ── */
  const deltaPoll = useCallback(async () => {
    const ts = lastTsRef.current;
    if (!ts) return;
    try {
      const {data} = await api.get(`/cash-transactions/since/${ts}`);
      if (data.added?.length) {
        setManual(prev=>{
          const map = new Map(prev.map(t=>[t._id,t]));
          data.added.forEach(t=>map.set(t._id,t));
          return Array.from(map.values()).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
        });
      }
      if (data.deletedIds?.length) setManual(prev=>prev.filter(t=>!data.deletedIds.includes(t._id)));
      if (data.summary) setSummary(data.summary);
      setLastTs(data.serverTime||Date.now()); setSyncStatus('live');
    } catch { setSyncStatus('error'); }
  },[]); // stable ref, uses lastTsRef

  /* ── Broadcast to admin panel (same browser, instant) ── */
  const broadcastRefresh = useCallback(()=>{
    try { channelRef.current?.postMessage({type:'refresh',ts:Date.now()}); } catch {}
  },[]);

  /* ── Bootstrap ── */
  useEffect(()=>{
    fetchAll();
    // BroadcastChannel: if ADMIN writes something, receptionist updates instantly too
    try {
      channelRef.current = new BroadcastChannel(CHANNEL);
      channelRef.current.onmessage = () => fetchAll(true);
    } catch {}
    // Poll every 6s
    pollRef.current = setInterval(deltaPoll, 6000);
    // Re-fetch on tab focus
    const onFocus = () => fetchAll(true);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(pollRef.current);
      window.removeEventListener('focus', onFocus);
      try { channelRef.current?.close(); } catch {}
    };
  },[]); // eslint-disable-line

  const CHANNEL = 'glamour_cash_sync';

  /* ── Derived ── */
  const {balance:counterBal=0,cashIn=0,withdrawn=0,expenses=0,salaries=0,advances=0} = summary;
  const todayDate   = todayStr();
  const todayCash   = cashBookings.filter(b=>{const d=(b.date?new Date(b.date):new Date(b.createdAt)).toISOString().split('T')[0];return d===todayDate;}).reduce((s,b)=>s+(b.finalAmount||b.totalAmount||0),0);
  const todayOnline = onlineBookings.reduce((s,b)=>s+(b.finalAmount||b.totalAmount||0),0);
  const todayOut    = manualTxns.filter(t=>t.date===todayDate&&['withdrawal','expense','salary','advance'].includes(t.type)).reduce((s,t)=>s+t.amount,0);

  /* ── Write helpers ── */
  const DRAWER_CFG = {
    cash_in:    {title:'Add Cash',          color:C.ok,   bg:C.okPale,   btn:'Add to Counter',   ph:'e.g. Opening float…'},
    expense:    {title:'Counter Expense',   color:C.warn, bg:C.warnPale, btn:'Record Expense',    ph:'e.g. Bought supplies…'},
    withdrawal: {title:'Owner Withdrawal',  color:C.risk, bg:C.riskPale, btn:'Record Withdrawal', ph:'e.g. Owner withdrawal…'},
  };
  const dc = drawer ? DRAWER_CFG[drawer] : null;

  const addManual = async () => {
    const amt = parseFloat(form.amount);
    if (!amt||amt<=0) { showToast('Enter a valid amount',false); return; }
    if (!form.note.trim()) { showToast('Add a note',false); return; }
    setSaving(true);
    try {
      await api.post('/cash-transactions', {
        type:drawer, amount:amt, note:form.note.trim(), date:todayDate,
        time:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),
      });
      setForm({amount:'',note:''}); setDrawer(null);
      showToast(drawer==='withdrawal'?'Withdrawal recorded':drawer==='expense'?'Expense recorded':'Cash added');
      // Instant cross-tab broadcast → admin sees it immediately
      broadcastRefresh();
      // Also do our own refresh
      await fetchAll(true);
    } catch(e) { showToast(e.response?.data?.message||'Failed to save',false); }
    finally { setSaving(false); }
  };

  const deleteManual = async (id) => {
    try {
      await api.delete(`/cash-transactions/${id}`);
      setManual(prev=>prev.filter(t=>t._id!==id));
      broadcastRefresh(); // admin sees deletion instantly
      const {data} = await api.get('/cash-transactions/summary');
      if (data?.summary) setSummary(data.summary);
      showToast('Removed');
    } catch { showToast('Delete failed',false); }
  };

  /* ─────────────────────────────────────────────────────
     RENDER
     ───────────────────────────────────────────────────── */
  return (
    <div style={{maxWidth:860,margin:'0 auto'}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:24,fontWeight:700,color:C.ink,margin:0}}>Cash Counter</h1>
          <div style={{marginTop:5}}><SyncPill status={syncStatus} syncing={syncing} lastTs={lastTs}/></div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>fetchAll(true)} disabled={syncing}
            style={{display:'flex',alignItems:'center',gap:6,padding:'9px 14px',borderRadius:100,border:`1px solid ${C.creamBorder}`,background:'#fff',color:C.inkMid,fontSize:12,fontWeight:600,cursor:'pointer',opacity:syncing?0.5:1}}>
            <RefreshCw size={13} style={{animation:syncing?'spin 0.8s linear infinite':'none'}}/> Refresh
          </button>
          <button onClick={()=>exportCSV(cashBookings,manualTxns)}
            style={{display:'flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:100,border:`1px solid ${C.creamBorder}`,background:'#fff',color:C.inkMid,fontSize:12,fontWeight:600,cursor:'pointer'}}>
            <Download size={13}/> Export CSV
          </button>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast&&(
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            style={{marginBottom:14,padding:'10px 16px',borderRadius:10,fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:8,background:toast.ok?C.okPale:C.riskPale,color:toast.ok?C.ok:C.risk,border:`1px solid ${toast.ok?C.okBorder:C.riskBorder}`}}>
            {toast.ok?<CheckCircle2 size={14}/>:<AlertCircle size={14}/>} {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero balance card */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
        style={{background:`linear-gradient(135deg,${C.heroBg},${C.heroBg2})`,borderRadius:20,padding:'28px 32px',marginBottom:20,position:'relative',overflow:'hidden',border:'1px solid rgba(184,134,11,.15)',boxShadow:'0 16px 48px rgba(0,0,0,.22)'}}>
        <div style={{position:'absolute',top:-60,right:-60,width:260,height:260,borderRadius:'50%',background:'radial-gradient(circle,rgba(218,165,32,.07),transparent 68%)'}}/>
        <div style={{position:'absolute',inset:0,backgroundImage:`repeating-linear-gradient(45deg,#B8860B 0,#B8860B 1px,transparent 0,transparent 50%)`,backgroundSize:'14px 14px',opacity:.04}}/>
        <div style={{position:'relative'}}>
          <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,.35)',textTransform:'uppercase',letterSpacing:'0.14em',marginBottom:6}}>Cash in Counter — Running Balance</div>
          {loading
            ? <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0 20px'}}><Loader2 size={20} color="rgba(255,255,255,.4)" style={{animation:'spin 1s linear infinite'}}/><span style={{fontSize:14,color:'rgba(255,255,255,.3)'}}>Loading…</span></div>
            : <div style={{fontSize:52,fontWeight:900,color:'#fff',fontFamily:'Playfair Display,serif',lineHeight:1,marginBottom:22,letterSpacing:'-0.02em'}}>{fmtK(counterBal)}</div>
          }
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:10}}>
            {[
              {label:'Cash Sales', val:fmtK(cashIn),    c:'#86EFAC',bg:'rgba(52,211,153,.1)',  sign:'+'},
              {label:'Withdrawn',  val:fmtK(withdrawn), c:'#FCA5A5',bg:'rgba(248,113,113,.1)', sign:'−'},
              {label:'Expenses',   val:fmtK(expenses),  c:'#FCD34D',bg:'rgba(251,191,36,.1)',  sign:'−'},
              {label:'Salaries',   val:fmtK(salaries),  c:'#C4B5FD',bg:'rgba(167,139,250,.1)', sign:'−'},
            ].map(({label,val,c,bg,sign})=>(
              <div key={label} style={{background:bg,borderRadius:12,padding:'10px 12px',backdropFilter:'blur(6px)'}}>
                <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:3}}>{sign} {label}</div>
                <div style={{fontSize:15,fontWeight:900,color:c,fontFamily:'Playfair Display,serif'}}>{val}</div>
              </div>
            ))}
          </div>
          {/* Sync status bar */}
          <div style={{marginTop:14,padding:'8px 12px',borderRadius:10,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.07)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:7}}>
              <Zap size={10} color="rgba(255,255,255,.3)"/>
              <span style={{fontSize:10,color:'rgba(255,255,255,.3)',fontWeight:600}}>
                Shared with Admin · instant sync via BroadcastChannel + 6s poll
              </span>
            </div>
            {lastTs&&<span style={{fontSize:9,color:'rgba(255,255,255,.2)'}}>↻ {new Date(lastTs).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>}
          </div>
        </div>
      </motion.div>

      {/* Today pills */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
        <Pill label="Today Cash"   value={fmtK(todayCash)}   color={C.ok}   bg={C.okPale}   border={C.okBorder}/>
        <Pill label="Today Online" value={fmtK(todayOnline)} color={C.blue} bg={C.bluePale} border={C.blueBorder}/>
        <Pill label="Today Out"    value={`−${fmtK(todayOut)}`} color={C.risk} bg={C.riskPale} border={C.riskBorder}/>
      </div>

      {/* Action buttons */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:24}}>
        {[
          {key:'cash_in',    label:'Add Cash',         icon:Plus,         color:C.ok,   bg:C.okPale},
          {key:'expense',    label:'Counter Expense',  icon:Wallet,       color:C.warn, bg:C.warnPale},
          {key:'withdrawal', label:'Owner Withdrawal', icon:TrendingDown, color:C.risk, bg:C.riskPale},
        ].map(({key,label,icon:Icon,color,bg})=>(
          <motion.button key={key} onClick={()=>{setDrawer(key);setForm({amount:'',note:'',});}}
            whileHover={{y:-2}} whileTap={{scale:0.97}}
            style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'16px 10px',borderRadius:16,border:`1px solid ${C.creamBorder}`,background:'#fff',cursor:'pointer'}}>
            <div style={{width:40,height:40,borderRadius:12,background:bg,display:'flex',alignItems:'center',justifyContent:'center'}}><Icon size={20} color={color}/></div>
            <span style={{fontSize:12,fontWeight:700,color,textAlign:'center'}}>{label}</span>
          </motion.button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:16,background:C.creamMid,padding:4,borderRadius:12,width:'fit-content'}}>
        {[{key:'cash',label:'Cash Payments'},{key:'online',label:'Online Payments'},{key:'manual',label:`Manual (${manualTxns.length})`}].map(({key,label})=>(
          <button key={key} onClick={()=>setTab(key)}
            style={{padding:'8px 18px',borderRadius:9,border:'none',background:tab===key?'#fff':'transparent',color:tab===key?C.ink:C.inkFaint,fontSize:13,fontWeight:tab===key?700:500,cursor:'pointer',boxShadow:tab===key?'0 1px 4px rgba(0,0,0,0.08)':'none',transition:'all 0.15s'}}>
            {label}
          </button>
        ))}
      </div>

      {loading&&<div style={{display:'flex',justifyContent:'center',padding:'40px',gap:12,alignItems:'center'}}><Loader2 size={18} color={C.goldMid} style={{animation:'spin 1s linear infinite'}}/><span style={{fontSize:13,color:C.inkFaint}}>Loading…</span></div>}

      {!loading&&(
        <>
          {/* CASH TAB */}
          {tab==='cash'&&(
            <Section title="Cash Sales" badge={cashBookings.length} badgeBg={C.okPale} badgeColor={C.ok}
              empty={cashBookings.length===0?'No cash payments recorded':undefined}>
              {cashBookings.slice(0,30).map((b,i)=>(
                <div key={b._id||i} style={{borderBottom:i<Math.min(29,cashBookings.length-1)?`1px solid ${C.creamBorder}`:'none'}}>
                  <TxnRow dot="#22C55E" title={`${b.service?.name||'Service'} — ${b.customer?.name||'Guest'}`}
                    sub={`${b.date?fmtDt(b.date):fmtDt(b.createdAt)} · ${b.timeSlot?.start||fmtTm(b.createdAt)} · ${b.staff?.name||'—'}`}
                    amtLabel={`+${fmtRs(b.finalAmount||b.totalAmount||0)}`} amtColor={C.ok}/>
                </div>
              ))}
              {cashBookings.length>30&&<div style={{padding:'8px 18px',fontSize:11,color:C.inkFaint,textAlign:'center'}}>+{cashBookings.length-30} more — export CSV for full history</div>}
            </Section>
          )}

          {/* ONLINE TAB */}
          {tab==='online'&&(
            <Section title="Today's Online Payments" badge={onlineBookings.length} badgeBg={C.bluePale} badgeColor={C.blue}
              action={<span style={{fontSize:12,fontWeight:700,color:C.blue}}>{fmtRs(todayOnline)}</span>}
              empty={onlineBookings.length===0?'No online payments today':undefined}>
              {onlineBookings.map((b,i)=>{
                const MethodIcon = b.paymentMethod==='upi'?Smartphone:b.paymentMethod==='card'?CreditCard:Globe;
                return (
                  <div key={b._id||i} style={{borderBottom:i<onlineBookings.length-1?`1px solid ${C.creamBorder}`:'none',display:'flex',alignItems:'center',gap:12,padding:'11px 18px'}}>
                    <div style={{width:32,height:32,borderRadius:10,background:C.bluePale,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><MethodIcon size={15} color={C.blue}/></div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:C.ink,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{b.service?.name||'Service'} — {b.customer?.name||'Guest'}</div>
                      <div style={{fontSize:10,color:C.inkFaint}}>{fmtTm(b.createdAt)} · {b.staff?.name||'—'} · {(b.paymentMethod||'').toUpperCase()}</div>
                    </div>
                    <div style={{fontSize:14,fontWeight:700,color:C.blue,flexShrink:0}}>{fmtRs(b.finalAmount||b.totalAmount||0)}</div>
                  </div>
                );
              })}
            </Section>
          )}

          {/* MANUAL TAB */}
          {tab==='manual'&&(
            <Section title="Manual Transactions" badge={manualTxns.length} badgeBg={C.creamDark} badgeColor={C.inkMid}
              action={<span style={{fontSize:10,color:C.ok,fontWeight:700,display:'flex',alignItems:'center',gap:4}}><CheckCircle2 size={11}/> Synced with Admin</span>}
              empty={manualTxns.length===0?'No manual entries yet — use the buttons above to record transactions':undefined}>
              {manualTxns.map((t,i)=>{
                const cfg = TXNCAT[t.type]||{label:t.type,color:C.inkLight,isIn:false};
                return (
                  <div key={t._id||i} style={{borderBottom:i<manualTxns.length-1?`1px solid ${C.creamBorder}`:'none'}}>
                    <TxnRow dot={cfg.color} title={t.note}
                      sub={`${cfg.label} · ${t.date}${t.time?` · ${t.time}`:''}${t.createdBy?.name?` · by ${t.createdBy.name}`:''}`}
                      badge={{label:cfg.label,color:cfg.color,bg:`${cfg.color}14`,border:`${cfg.color}28`}}
                      amtLabel={`${cfg.isIn?'+':'−'}${fmtRs(t.amount)}`} amtColor={cfg.isIn?C.ok:C.risk}
                      onDelete={()=>deleteManual(t._id)}/>
                  </div>
                );
              })}
            </Section>
          )}
        </>
      )}

      {/* Drawer */}
      <AnimatePresence>
        {drawer&&dc&&(
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setDrawer(null)}
              style={{position:'fixed',inset:0,background:'rgba(22,16,10,0.5)',zIndex:100,backdropFilter:'blur(4px)'}}/>
            <motion.div initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{type:'spring',damping:28,stiffness:300}}
              style={{position:'fixed',top:0,right:0,bottom:0,width:400,background:C.cream,zIndex:101,display:'flex',flexDirection:'column',boxShadow:'-4px 0 32px rgba(0,0,0,.18)'}}>
              <div style={{padding:'20px 24px',borderBottom:`1px solid ${C.creamBorder}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
                <h2 style={{fontFamily:'Playfair Display,serif',fontSize:18,fontWeight:600,color:C.ink,margin:0}}>{dc.title}</h2>
                <button onClick={()=>setDrawer(null)} style={{padding:8,borderRadius:8,border:'none',background:C.creamMid,cursor:'pointer',color:C.inkMid}}><X size={15}/></button>
              </div>
              <div style={{flex:1,padding:24,overflowY:'auto'}}>
                <div style={{padding:'11px 14px',borderRadius:12,background:dc.bg,marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:13,fontWeight:600,color:dc.color}}>Counter Balance</span>
                  <span style={{fontSize:16,fontWeight:900,color:dc.color,fontFamily:'Playfair Display,serif'}}>{fmtRs(counterBal)}</span>
                </div>
                <div style={{marginBottom:18}}>
                  <label style={{display:'block',fontSize:12,fontWeight:600,color:C.inkMid,marginBottom:8}}>Amount (₹) *</label>
                  <input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="0" autoFocus
                    style={{width:'100%',padding:'14px',borderRadius:12,border:`1.5px solid ${C.creamBorder}`,background:'#fff',fontSize:28,fontWeight:700,color:C.ink,outline:'none',boxSizing:'border-box',textAlign:'center',fontFamily:'Playfair Display,serif'}}
                    onFocus={e=>e.target.style.borderColor=C.goldMid} onBlur={e=>e.target.style.borderColor=C.creamBorder}/>
                </div>
                <div style={{marginBottom:18}}>
                  <label style={{display:'block',fontSize:12,fontWeight:600,color:C.inkMid,marginBottom:8}}>Note / Reason *</label>
                  <input type="text" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))}
                    placeholder={dc.ph} onKeyDown={e=>{if(e.key==='Enter')addManual();}}
                    style={{width:'100%',padding:'11px 14px',borderRadius:12,border:`1.5px solid ${C.creamBorder}`,background:'#fff',fontSize:13,color:C.ink,outline:'none',boxSizing:'border-box'}}
                    onFocus={e=>e.target.style.borderColor=C.goldMid} onBlur={e=>e.target.style.borderColor=C.creamBorder}/>
                  {drawer==='expense'&&(
                    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:8}}>
                      {['Stationery','Cleaning','Tea/Coffee','Supplies','Repairs'].map(n=>(
                        <button key={n} onClick={()=>setForm(f=>({...f,note:n}))}
                          style={{padding:'4px 11px',borderRadius:100,fontSize:11,fontWeight:700,cursor:'pointer',border:`1px solid ${C.creamBorder}`,background:C.creamMid,color:C.inkMid}}>{n}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{padding:'10px 12px',borderRadius:10,background:'rgba(34,197,94,.06)',border:'1px solid rgba(34,197,94,.15)',fontSize:11,color:C.inkFaint,display:'flex',alignItems:'center',gap:7}}>
                  <Zap size={11} color={C.ok}/> Admin panel updates instantly when you save
                </div>
              </div>
              <div style={{padding:'16px 24px',borderTop:`1px solid ${C.creamBorder}`,display:'flex',gap:10,flexShrink:0}}>
                <button onClick={()=>setDrawer(null)} style={{flex:1,padding:'12px',borderRadius:100,border:`1px solid ${C.creamBorder}`,background:'#fff',color:C.inkMid,fontSize:14,fontWeight:600,cursor:'pointer'}}>Cancel</button>
                <button onClick={addManual} disabled={saving||!form.amount||!form.note.trim()}
                  style={{flex:2,padding:'12px',borderRadius:100,border:'none',background:(saving||!form.amount||!form.note.trim())?C.creamDark:dc.color,color:(saving||!form.amount||!form.note.trim())?C.inkLight:'#fff',fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  {saving?<Loader2 size={14} style={{animation:'spin 0.8s linear infinite'}}/>:null}
                  {saving?'Saving…':`${dc.btn}${form.amount?` — ${fmtRs(form.amount)}`:''}`}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}
      `}</style>
    </div>
  );
}