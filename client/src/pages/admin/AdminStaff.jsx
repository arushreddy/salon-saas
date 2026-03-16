import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Phone, Mail, Star, Calendar, Clock,
  Edit2, Trash2, RefreshCw, X, TrendingUp, Users, Download,
  Wallet, ChevronRight, Printer, MessageCircle, UserCheck, UserX,
  Trophy, Upload, CheckSquare, ArrowLeftRight, Check, MoreVertical,
  BarChart2, Send, Banknote, CheckCircle2, AlertTriangle,
  CreditCard, Smartphone, Loader2, PlusCircle, MinusCircle,
} from 'lucide-react';
import api from '@/services/api';
import StaffModal from '@/components/StaffModal';
import { useDesignations, getSalaryRecords, saveSalaryRecord, deleteSalaryRecord, getLastPaid } from '@/hooks/useDesignations';

// ─── Salon Design Tokens (matches Appointments / Dashboard) ──────────────────
const C = {
  cream:      '#FDF8F0',
  creamMid:   '#F7EFD8',
  creamDark:  '#EDE0C0',
  creamBorder:'#DFD0A8',
  gold:       '#B8860B',
  goldLight:  '#DAA520',
  goldPale:   '#FFF8E7',
  ink:        '#16100A',
  inkMid:     '#5A4020',
  inkFaint:   '#B09060',
  inkGhost:   '#D4B890',
  white:      '#FFFFFF',
  ok:         '#285C3A',
  okPale:     '#EAF4EE',
  okBorder:   '#A7D4B0',
  risk:       '#7A2020',
  riskPale:   '#FEF2F2',
  riskBorder: '#F5BABA',
  warn:       '#6B4800',
  warnPale:   '#FEF3DC',
  warnBorder: '#F0C070',
  blue:       '#1D4ED8',
  bluePale:   '#EFF6FF',
  blueBorder: '#BFDBFE',
};

// ─── Utilities ────────────────────────────────────────────────────────────────
const Rs     = n => Number(n||0).toLocaleString('en-IN');
const today  = () => new Date().toISOString().split('T')[0];
const thisMo = () => new Date().toISOString().slice(0,7);
const fmtDt  = d => new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
const fmtMo  = m => { try { return new Date(m+'-01').toLocaleDateString('en-IN',{month:'long',year:'numeric'}); } catch { return m; } };
const DESG   = k => ({trainee:'Trainee',junior_stylist:'Jr. Stylist',senior_stylist:'Sr. Stylist',master_stylist:'Master Stylist',receptionist:'Receptionist',manager:'Manager'}[k]||k||'—');
const DAYS_F = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const LS = {
  get:(k,d=null)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch{ return d; }},
  set:(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} },
};
const getSalNotes = id => LS.get(`glamour_notes_${id}`,[]);
const saveSalNotes = (id,n) => LS.set(`glamour_notes_${id}`,n);
const getDocs   = id => LS.get(`glamour_docs_${id}`,[]);
const saveDocs  = (id,d) => LS.set(`glamour_docs_${id}`,d);
const getPayDet = id => LS.get(`glamour_pd_${id}`,{});
const setPayDet = (id,d) => LS.set(`glamour_pd_${id}`,d);

const PMETHODS = {
  cash:   { label:'Cash',     icon:Banknote,   color:C.ok,   pale:C.okPale,   border:C.okBorder   },
  upi:    { label:'UPI',      icon:Smartphone, color:C.blue, pale:C.bluePale, border:C.blueBorder  },
  bank:   { label:'Bank',     icon:CreditCard, color:C.gold, pale:C.goldPale, border:C.creamBorder },
  cheque: { label:'Cheque',   icon:Wallet,     color:C.warn, pale:C.warnPale, border:C.warnBorder  },
};

// ─── Motion variants ──────────────────────────────────────────────────────────
const fd  = { hidden:{opacity:0,y:8}, show:{opacity:1,y:0,transition:{duration:0.22}} };
const stg = (d=0.05) => ({ hidden:{}, show:{ transition:{ staggerChildren:d } } });
const sl  = { hidden:{x:64,opacity:0}, show:{x:0,opacity:1,transition:{type:'spring',damping:30,stiffness:280}} };

// ─── Shared atoms ─────────────────────────────────────────────────────────────
const Avatar = ({ name='', size=40 }) => {
  const initials = (name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  return (
    <div style={{ width:size, height:size, borderRadius:size*0.3, flexShrink:0,
      background:`linear-gradient(135deg,${C.gold},${C.goldLight})`,
      display:'flex',alignItems:'center',justifyContent:'center',
      fontWeight:800, color:'#fff', fontSize:size*0.36, letterSpacing:'0.02em',
    }}>{initials}</div>
  );
};

const Badge = ({ children, color=C.gold, bg=C.goldPale, border=C.creamBorder, size=10 }) => (
  <span style={{ display:'inline-flex',alignItems:'center',padding:'2px 8px',borderRadius:100,
    fontSize:size,fontWeight:700,letterSpacing:'0.04em',color,background:bg,border:`1px solid ${border}`,whiteSpace:'nowrap' }}>
    {children}
  </span>
);

const Inp = ({ style, ...p }) => (
  <input {...p}
    onFocus={e=>{e.target.style.borderColor=C.gold;e.target.style.boxShadow=`0 0 0 3px ${C.goldPale}`;}}
    onBlur={e=>{e.target.style.borderColor=C.creamBorder;e.target.style.boxShadow='none';}}
    style={{width:'100%',padding:'9px 12px',borderRadius:10,border:`1.5px solid ${C.creamBorder}`,
      background:C.white,color:C.ink,fontSize:13,outline:'none',boxSizing:'border-box',
      transition:'border-color 0.2s,box-shadow 0.2s',fontFamily:"'DM Sans',sans-serif",...style}}/>
);

const Textarea = ({ style, ...p }) => (
  <textarea {...p}
    onFocus={e=>{e.target.style.borderColor=C.gold;}}
    onBlur={e=>{e.target.style.borderColor=C.creamBorder;}}
    style={{width:'100%',padding:'9px 12px',borderRadius:10,border:`1.5px solid ${C.creamBorder}`,
      background:C.white,color:C.ink,fontSize:13,outline:'none',resize:'vertical',
      boxSizing:'border-box',fontFamily:"'DM Sans',sans-serif",...style}}/>
);

const GoldBtn = ({ children, onClick, disabled, style }) => (
  <button onClick={onClick} disabled={disabled} style={{
    display:'flex',alignItems:'center',justifyContent:'center',gap:7,
    padding:'9px 18px',borderRadius:10,border:'none',cursor:disabled?'not-allowed':'pointer',
    background:disabled?C.creamDark:`linear-gradient(135deg,${C.gold},${C.goldLight})`,
    color:disabled?C.inkGhost:C.white,
    fontSize:12,fontWeight:700,transition:'all 0.15s',...style,
  }}>{children}</button>
);

const GhostBtn = ({ children, onClick, style }) => (
  <button onClick={onClick} style={{
    display:'flex',alignItems:'center',justifyContent:'center',gap:6,
    padding:'8px 16px',borderRadius:10,cursor:'pointer',
    border:`1.5px solid ${C.creamBorder}`,background:'transparent',
    color:C.inkMid,fontSize:12,fontWeight:600,transition:'all 0.15s',...style,
  }}
  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.color=C.gold;}}
  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.creamBorder;e.currentTarget.style.color=C.inkMid;}}>
    {children}
  </button>
);

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ msg, type='ok' }) => (
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}}
    style={{position:'fixed',bottom:28,left:'50%',transform:'translateX(-50%)',zIndex:9999,
      display:'flex',alignItems:'center',gap:9,padding:'11px 20px',borderRadius:12,
      background:type==='err'?C.riskPale:C.okPale,
      border:`1px solid ${type==='err'?C.riskBorder:C.okBorder}`,
      boxShadow:'0 8px 32px rgba(0,0,0,0.12)',minWidth:200}}>
    {type==='err'
      ? <X size={13} style={{color:C.risk,flexShrink:0}}/>
      : <Check size={13} style={{color:C.ok,flexShrink:0}}/>}
    <span style={{fontSize:12,fontWeight:700,color:type==='err'?C.risk:C.ok}}>{msg}</span>
  </motion.div>
);

// ─── Attendance bar ───────────────────────────────────────────────────────────
const AttBar = ({ val=0 }) => {
  const col = val>=90?C.ok:val>=70?C.gold:C.risk;
  const bg  = val>=90?C.okPale:val>=70?C.goldPale:C.riskPale;
  return (
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      <div style={{flex:1,height:5,borderRadius:100,background:C.creamDark,overflow:'hidden'}}>
        <motion.div initial={{width:0}} animate={{width:`${Math.min(val,100)}%`}} transition={{duration:0.7}}
          style={{height:'100%',borderRadius:100,background:`linear-gradient(90deg,${col}aa,${col})`}}/>
      </div>
      <span style={{fontSize:11,fontWeight:700,color:col,background:bg,padding:'1px 6px',borderRadius:6,minWidth:36,textAlign:'right'}}>{val}%</span>
    </div>
  );
};

// ─── Salary Status pill ───────────────────────────────────────────────────────
const SalaryStatus = ({ staffId, total, compact=false, dbPaidAmt=null }) => {
  const last = getLastPaid(staffId);
  // If dbPaidAmt passed (from live DB fetch), use that as source of truth
  const paid = dbPaidAmt != null ? dbPaidAmt > 0 : (last && last.month === thisMo());
  if (compact) return (
    <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 9px',borderRadius:100,
      background:paid?C.okPale:C.warnPale,border:`1px solid ${paid?C.okBorder:C.warnBorder}`}}>
      {paid ? <CheckCircle2 size={10} style={{color:C.ok}}/> : <AlertTriangle size={10} style={{color:C.warn}}/>}
      <span style={{fontSize:10,fontWeight:700,color:paid?C.ok:C.warn}}>{paid?'Paid':'Pending'}</span>
    </span>
  );
  return (
    <div style={{padding:'11px 13px',borderRadius:11,
      background:paid?C.okPale:C.warnPale,border:`1px solid ${paid?C.okBorder:C.warnBorder}`,
      display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <div style={{display:'flex',alignItems:'center',gap:9}}>
        {paid ? <CheckCircle2 size={15} style={{color:C.ok}}/> : <AlertTriangle size={15} style={{color:C.warn}}/>}
        <div>
          <p style={{fontSize:11,fontWeight:800,color:paid?C.ok:C.warn,textTransform:'uppercase',letterSpacing:'0.07em'}}>
            {paid?'Salary Sent':'Salary Pending'}
          </p>
          {paid && <p style={{fontSize:10,color:C.inkFaint,marginTop:1}}>{last.paymentMethodLabel||'Cash'} · {fmtDt(last.paidAt||last.date)}</p>}
          {!paid && <p style={{fontSize:10,color:C.inkFaint,marginTop:1}}>{fmtMo(thisMo())}</p>}
        </div>
      </div>
      <p style={{fontSize:15,fontWeight:800,color:paid?C.ok:C.warn,fontFamily:"'Playfair Display',serif"}}>₹{Rs(total)}</p>
    </div>
  );
};

// ─── Leaderboard ─────────────────────────────────────────────────────────────
const Leaderboard = ({ staffList }) => {
  const [metric, setMetric] = useState('revenue');
  const active = staffList.filter(s=>s.user?.isActive!==false);
  const ranked = useMemo(()=>
    [...active].sort((a,b)=>{
      if(metric==='revenue')  return (b.totalRevenueGenerated||0)-(a.totalRevenueGenerated||0);
      if(metric==='services') return (b.totalServicesCompleted||0)-(a.totalServicesCompleted||0);
      if(metric==='rating')   return (b.averageRating||0)-(a.averageRating||0);
      const ap=(a.salary?.base||0)+Math.round((a.totalRevenueGenerated||0)*(a.commissionRate||0)/100);
      const bp=(b.salary?.base||0)+Math.round((b.totalRevenueGenerated||0)*(b.commissionRate||0)/100);
      return bp-ap;
    }).slice(0,5),[active,metric]);

  const getVal = s => {
    if(metric==='revenue')  return `₹${Rs(s.totalRevenueGenerated||0)}`;
    if(metric==='services') return String(s.totalServicesCompleted||0);
    if(metric==='rating')   return (s.averageRating||0)>0?`${s.averageRating.toFixed(1)}★`:'—';
    return `₹${Rs((s.salary?.base||0)+Math.round((s.totalRevenueGenerated||0)*(s.commissionRate||0)/100))}`;
  };
  const getPct=(s,top)=>{
    let c=0,m=1;
    if(metric==='revenue'){c=s.totalRevenueGenerated||0;m=Math.max(1,top?.totalRevenueGenerated||1);}
    else if(metric==='services'){c=s.totalServicesCompleted||0;m=Math.max(1,top?.totalServicesCompleted||1);}
    else if(metric==='rating'){c=s.averageRating||0;m=5;}
    else{c=(s.salary?.base||0)+Math.round((s.totalRevenueGenerated||0)*(s.commissionRate||0)/100);m=Math.max(1,(top?.salary?.base||0)+Math.round((top?.totalRevenueGenerated||0)*(top?.commissionRate||0)/100));}
    return m>0?Math.max(5,Math.round(c/m*100)):5;
  };
  const medals=['🥇','🥈','🥉'];

  return (
    <div style={{background:C.white,border:`1px solid ${C.creamBorder}`,borderRadius:16,overflow:'hidden',marginBottom:18}}>
      <div style={{padding:'14px 18px',borderBottom:`1px solid ${C.creamBorder}`,background:C.goldPale,
        display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <Trophy size={14} style={{color:C.gold}}/>
          <span style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:"'Playfair Display',serif"}}>Top Performers</span>
          <Badge color={C.inkFaint} bg={C.cream} border={C.creamBorder}>{active.length} members</Badge>
        </div>
        <div style={{display:'flex',gap:4}}>
          {[['revenue','Revenue'],['services','Services'],['rating','Rating'],['payroll','Payroll']].map(([v,l])=>(
            <button key={v} onClick={()=>setMetric(v)} style={{
              padding:'4px 12px',borderRadius:100,fontSize:10,fontWeight:700,cursor:'pointer',
              border:`1px solid ${metric===v?C.gold:C.creamBorder}`,
              background:metric===v?C.goldPale:'transparent',
              color:metric===v?C.gold:C.inkFaint,transition:'all 0.15s',
            }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{padding:'14px 18px',display:'flex',flexDirection:'column',gap:10}}>
        {ranked.length===0
          ? <p style={{textAlign:'center',color:C.inkGhost,fontSize:12,padding:'12px 0'}}>No data yet</p>
          : ranked.map((s,i)=>(
            <div key={s._id} style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:16,width:22,textAlign:'center'}}>{i<3?medals[i]:`#${i+1}`}</span>
              <Avatar name={s.user?.name} size={30}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:5}}>
                  <span style={{fontSize:12,fontWeight:700,color:C.ink,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.user?.name}</span>
                  <span style={{fontSize:12,fontWeight:800,color:i===0?C.gold:C.inkMid,flexShrink:0,marginLeft:8}}>{getVal(s)}</span>
                </div>
                <div style={{height:4,borderRadius:100,background:C.creamDark,overflow:'hidden'}}>
                  <motion.div initial={{width:0}} animate={{width:`${getPct(s,ranked[0])}%`}} transition={{duration:0.7,delay:i*0.08}}
                    style={{height:'100%',borderRadius:100,background:i===0?`linear-gradient(90deg,${C.gold},${C.goldLight})`:
                      i===1?'linear-gradient(90deg,#94A3B8,#CBD5E1)':'linear-gradient(90deg,#C2773C,#E8A070)'}}/>
                </div>
              </div>
              <Badge color={C.inkFaint} bg={C.cream} border={C.creamBorder} size={9}>{s.designationLabel||DESG(s.designation)}</Badge>
            </div>
          ))}
      </div>
    </div>
  );
};

// ─── Salary Modal ─────────────────────────────────────────────────────────────
const SalaryModal = ({ staff, onClose, onRefresh }) => {
  const [tab,setTab]           = useState('pay');
  const [payMethod,setPayMethod]= useState('cash');
  const [month,setMonth]       = useState(thisMo());
  const [txnId,setTxnId]       = useState('');
  const [txnFile,setTxnFile]   = useState(null);
  const [txnUrl,setTxnUrl]     = useState(null);
  const [saving,setSaving]     = useState(false);
  const [adjType,setAdjType]   = useState('bonus');
  const [adjAmt,setAdjAmt]     = useState('');
  const [adjNote,setAdjNote]   = useState('');
  const [adjMo,setAdjMo]       = useState(thisMo());
  const [cr,setCr]             = useState(Number(staff.commissionRate)||0);
  const [crDirty,setCrDirty]   = useState(false);
  const [savingCr,setSavingCr] = useState(false);
  const [recs,setRecs]         = useState(()=>getSalaryRecords(staff._id));
  const [dbRecs,setDbRecs]     = useState([]);
  const [loadingDb,setLoadingDb]= useState(true);
  const [toast,setToast]       = useState(null);
  const [pd,setPd]             = useState(()=>getPayDet(staff._id));
  const [editPd,setEditPd]     = useState(false);
  const [pdForm,setPdForm]     = useState(()=>getPayDet(staff._id));

  const flash = (msg,type='ok') => { setToast({msg,type}); setTimeout(()=>setToast(null),2600); };
  const refresh = () => setRecs(getSalaryRecords(staff._id));

  // Fetch salary history from DB (includes attendance deductions)
  const fetchDbRecs = useCallback(async () => {
    setLoadingDb(true);
    try {
      const res = await api.get(`/staff/${staff._id}/salary-history`);
      const records = res.data?.records || [];
      setDbRecs(records);
      // Sync any DB deduction/bonus records into localStorage so they persist locally too
      records.forEach(r => {
        if (r.type === 'deduction' || r.type === 'bonus' || r.type === 'advance') {
          const localKey = `db_${r._id}`;
          const existing = getSalaryRecords(staff._id);
          if (!existing.find(lr => lr.id === localKey)) {
            saveSalaryRecord(staff._id, {
              id: localKey,
              type: r.type,
              staffId: staff._id,
              month: r.month,
              amount: r.amount,
              note: r.note || r.type,
              paidAt: r.paidAt || r.createdAt,
              _fromDb: true,
            });
          }
        }
        // Sync payment records too so "paid this month" is detected
        if (r.type === 'payment') {
          const localKey = `db_${r._id}`;
          const existing = getSalaryRecords(staff._id);
          if (!existing.find(lr => lr.id === localKey)) {
            saveSalaryRecord(staff._id, {
              id: localKey,
              type: 'payment',
              staffId: staff._id,
              month: r.month,
              amount: r.amount,
              baseSalary: r.baseSalary,
              commissionRate: r.commissionPercent,
              revenueGenerated: r.revenueGenerated,
              commission: r.commissionAmount,
              paymentMethod: r.paymentMethod,
              paymentMethodLabel: r.paymentMethod,
              note: r.note || `Salary for ${r.month}`,
              paidAt: r.paidAt || r.createdAt,
              _fromDb: true,
            });
          }
        }
      });
      refresh();
    } catch(e) { /* silently fail — localStorage still works */ }
    finally { setLoadingDb(false); }
  }, [staff._id]);

  useEffect(() => { fetchDbRecs(); }, [fetchDbRecs]);

  const base  = staff.salary?.base||0;
  const rev   = staff.totalRevenueGenerated||0;
  const svcs  = staff.totalServicesCompleted||0;
  const comm  = Math.round(rev*cr/100);

  // Compute net payable for current month using DB records (authoritative)
  const thisMoRecs   = dbRecs.filter(r => r.month === thisMo());
  const dbDeduct     = thisMoRecs.filter(r=>r.type==='deduction').reduce((a,r)=>a+(r.amount||0),0);
  const dbBonus      = thisMoRecs.filter(r=>r.type==='bonus').reduce((a,r)=>a+(r.amount||0),0);
  const dbPaid       = thisMoRecs.filter(r=>r.type==='payment').reduce((a,r)=>a+(r.amount||0),0);
  const dbAdvance    = thisMoRecs.filter(r=>r.type==='advance').reduce((a,r)=>a+(r.amount||0),0);
  const gross        = base + comm + dbBonus;
  const netPayable   = Math.max(0, gross - dbDeduct);
  const alreadyPaid  = dbPaid + dbAdvance;
  const balanceDue   = Math.max(0, netPayable - alreadyPaid);
  const total        = balanceDue > 0 ? balanceDue : netPayable; // show balance if partial paid

  const hist = useMemo(()=>{
    const seen=new Set();
    return recs.filter(r=>{if(seen.has(r.id))return false;seen.add(r.id);return true;})
      .sort((a,b)=>new Date(b.paidAt||b.date)-new Date(a.paidAt||a.date));
  },[recs]);

  const lastPaid   = hist.find(r=>r.type==='payment');
  const paidThisMo = lastPaid&&lastPaid.month===thisMo();

  const markPaid = async () => {
    setSaving(true);
    let receipt=null;
    if(txnFile){ receipt=await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.readAsDataURL(txnFile);}); }
    const pm=PMETHODS[payMethod];
    // Use balance due (accounts for deductions, bonuses, advances already paid)
    const payAmt = balanceDue > 0 ? balanceDue : netPayable;
    const rec={id:`pay_${Date.now()}`,type:'payment',staffId:staff._id,staffName:staff.user?.name,
      month,date:today(),baseSalary:base,commissionRate:cr,revenueGenerated:rev,commission:comm,
      commissionAmount:comm,totalNetPay:netPayable,
      deductions:dbDeduct,bonuses:dbBonus,alreadyPaid,
      amount:payAmt,
      paymentMethod:payMethod,paymentMethodLabel:pm.label,
      txnId:txnId.trim()||null,receiptImage:receipt,receiptFileName:txnFile?.name||null,
      note:`Salary for ${fmtMo(month)} via ${pm.label}${txnId?` · ${txnId}`:''}`,
      paidAt:new Date().toISOString()};
    saveSalaryRecord(staff._id,rec);refresh();
    try{await api.post(`/staff/${staff._id}/salary-payment`,{...rec,totalNetPay:netPayable,commissionAmount:comm});}catch{}
    flash(`₹${Rs(payAmt)} sent via ${pm.label}`);
    setTxnId('');setTxnFile(null);setTxnUrl(null);setSaving(false);
    await fetchDbRecs(); onRefresh();
  };

  const applyAdj = async () => {
    if(!adjAmt||Number(adjAmt)<=0)return;
    const rec={id:`${adjType}_${Date.now()}`,type:adjType,staffId:staff._id,month:adjMo,
      date:today(),amount:Number(adjAmt),note:adjNote||(adjType==='bonus'?'Bonus':'Deduction'),paidAt:new Date().toISOString()};
    saveSalaryRecord(staff._id,rec);refresh();
    // Also persist to DB so it shows in salary pending calculation
    try{ await api.post(`/staff/${staff._id}/salary-payment`,{
      type:adjType, month:adjMo, amount:Number(adjAmt),
      note:adjNote||(adjType==='bonus'?'Bonus':'Deduction'),
    }); await fetchDbRecs(); } catch{}
    flash(`${adjType==='bonus'?'+':'−'}₹${Rs(adjAmt)} ${adjType} recorded`);
    setAdjAmt('');setAdjNote('');
  };

  const saveComm = async () => {
    setSavingCr(true);
    try{await api.patch(`/staff/${staff._id}`,{commissionRate:Number(cr)});setCrDirty(false);flash(`Commission → ${cr}%`);onRefresh();}
    catch{flash('Failed','err');}
    finally{setSavingCr(false);}
  };

  const delRec = id => {
    if(!confirm('Delete this record?'))return;
    deleteSalaryRecord(staff._id,id);refresh();flash('Deleted');
  };

  const printSlip = (rec=null) => {
    const pm=PMETHODS[rec?.paymentMethod||payMethod]||PMETHODS.cash;
    const mo=fmtMo(rec?.month||month);const amt=rec?.amount||total;
    const txn=rec?.txnId||txnId||null;const img=rec?.receiptImage||null;
    const w=window.open('','_blank','width=440,height=800');
    const slipDeduct = rec?.deductions ?? dbDeduct;
    const slipBonus  = rec?.bonuses  ?? dbBonus;
    const slipNet    = rec?.totalNetPay ?? netPayable;
    w.document.write(`<!DOCTYPE html><html><head><title>Payslip</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#FDF8F0;padding:20px;max-width:400px;margin:auto}
    .card{background:#fff;border:1px solid #DFD0A8;border-radius:16px;overflow:hidden}
    .hdr{background:linear-gradient(135deg,#B8860B,#DAA520);padding:22px;text-align:center}
    .logo{font-family:'Playfair Display',serif;font-size:22px;color:#fff;font-weight:800}.sub{color:rgba(255,255,255,0.8);font-size:11px;margin-top:6px}
    .body{padding:20px}.lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#B09060;margin:14px 0 8px}
    .row{display:flex;justify-content:space-between;padding:8px 12px;font-size:12px;border-radius:8px;margin-bottom:2px}
    .row.alt{background:#F7EFD8}.v{font-weight:700;color:#16100A}.gold{color:#B8860B;font-weight:800;font-family:'Playfair Display',serif}
    .deduct{color:#C0392B;font-weight:700}.bonus{color:#285C3A;font-weight:700}
    .total{display:flex;justify-content:space-between;padding:14px;border:1.5px solid #DFD0A8;background:#FFF8E7;border-radius:12px;margin:12px 0}
    .status{padding:12px;border-radius:10px;background:#EAF4EE;border:1px solid #A7D4B0;text-align:center;font-weight:800;font-size:12px;color:#285C3A;margin:10px 0}
    .receipt{width:100%;max-height:200px;object-fit:contain;border-radius:10px;margin-top:8px}
    .ftr{background:#FDF8F0;border-top:1px solid #DFD0A8;padding:14px;text-align:center;font-size:10px;color:#B09060}
    .btn{display:block;width:100%;padding:12px;background:linear-gradient(135deg,#B8860B,#DAA520);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;margin-top:16px}
    @media print{.btn{display:none}}</style></head>
    <body><div class="card"><div class="hdr"><div class="logo">✂ Glamour Salon</div><div class="sub">PAYSLIP · ${mo}</div></div>
    <div class="body">
    <div class="lbl">Employee</div>
    <div class="row alt"><span style="color:#B09060">Name</span><span class="v">${staff.user?.name||'—'}</span></div>
    <div class="row"><span style="color:#B09060">Role</span><span class="v">${staff.designationLabel||'—'}</span></div>
    <div class="lbl">Salary Breakdown</div>
    <div class="row alt"><span style="color:#B09060">Base</span><span class="v">₹${Rs(base)}</span></div>
    <div class="row"><span style="color:#B09060">Commission (${cr}%)</span><span class="bonus">+₹${Rs(comm)}</span></div>
    ${slipBonus>0?`<div class="row alt"><span style="color:#B09060">Bonus</span><span class="bonus">+₹${Rs(slipBonus)}</span></div>`:''}
    ${slipDeduct>0?`<div class="row"><span style="color:#B09060">Deductions</span><span class="deduct">−₹${Rs(slipDeduct)}</span></div>`:''}
    <div class="total"><span style="font-size:14px;font-weight:700;color:#16100A">Net Paid</span><span class="gold" style="font-size:20px">₹${Rs(amt)}</span></div>
    <div class="status">✓ Paid via ${pm.label}${txn?` · ${txn}`:''}</div>
    ${img?`<img src="${img}" class="receipt"/>`:''}
    <div class="lbl">Performance</div>
    <div class="row alt"><span style="color:#B09060">Revenue</span><span class="v">₹${Rs(rev)}</span></div>
    <div class="row"><span style="color:#B09060">Services</span><span class="v">${svcs}</span></div>
    </div><div class="ftr">Glamour Salon · ${new Date().toLocaleDateString('en-IN')}<br>ID: PAY-${Date.now().toString(36).toUpperCase()}</div>
    </div><button class="btn" onclick="window.print()">🖨 Print</button></body></html>`);
    w.document.close();
  };

  const waSlip=(rec=null)=>{
    const ph=(staff.user?.phone||'').replace(/\D/g,'').slice(-10);
    if(!ph){alert('No phone');return;}
    const pm=PMETHODS[rec?.paymentMethod||payMethod]||PMETHODS.cash;
    const mo=fmtMo(rec?.month||month);const amt=rec?.amount||total;
    const txn=rec?.txnId||txnId||null;
    const txt=[`✂ *Glamour Salon — Payslip*`,``,`Hi *${staff.user?.name}*! Your salary for *${mo}* is ready. 🎉`,``,
      `💰 *Base:* ₹${Rs(base)}`,`📈 *Commission (${cr}%):* +₹${Rs(comm)}`,`✅ *Total:* ₹${Rs(amt)}`,``,
      `${pm.label}${txn?` · ${txn}`:''}`,``,`— Glamour Salon ✨`].join('%0A');
    window.open(`https://wa.me/91${ph}?text=${txt}`,'_blank');
  };

  const TABS=[
    {id:'pay',label:'Pay Salary',dot:paidThisMo?C.ok:C.warn},
    {id:'adjust',label:'Adjustments',dot:null},
    {id:'history',label:'History',dot:null},
    {id:'commission',label:'Commission',dot:null},
    {id:'paydetails',label:'Bank Details',dot:null},
  ];

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{position:'fixed',inset:0,zIndex:600,background:'rgba(22,16,10,0.72)',
        backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <motion.div initial={{scale:0.96,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.96,opacity:0}}
        style={{width:'100%',maxWidth:520,background:C.cream,border:`1px solid ${C.creamBorder}`,
          borderRadius:20,display:'flex',flexDirection:'column',maxHeight:'90vh',overflow:'hidden',
          boxShadow:'0 32px 80px rgba(0,0,0,0.25)'}}>

        {/* Header */}
        <div style={{padding:'18px 22px',borderBottom:`1px solid ${C.creamBorder}`,background:C.white,flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{display:'flex',alignItems:'center',gap:11}}>
              <Avatar name={staff.user?.name} size={42}/>
              <div>
                <p style={{fontSize:15,fontWeight:700,color:C.ink,fontFamily:"'Playfair Display',serif"}}>{staff.user?.name}</p>
                <div style={{display:'flex',gap:6,marginTop:4,flexWrap:'wrap'}}>
                  <Badge>{staff.designationLabel||DESG(staff.designation)}</Badge>
                  <SalaryStatus staffId={staff._id} total={balanceDue > 0 ? balanceDue : netPayable} compact dbPaidAmt={dbPaid}/>
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{width:30,height:30,borderRadius:8,border:`1px solid ${C.creamBorder}`,
              background:C.creamMid,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <X size={13} style={{color:C.inkMid}}/>
            </button>
          </div>
          <SalaryStatus staffId={staff._id} total={balanceDue > 0 ? balanceDue : netPayable} dbPaidAmt={dbPaid}/>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:3,padding:'10px 16px',borderBottom:`1px solid ${C.creamBorder}`,
          background:C.cream,flexShrink:0,overflowX:'auto'}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,
              fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',
              border:`1px solid ${tab===t.id?C.gold:C.creamBorder}`,
              background:tab===t.id?C.goldPale:'transparent',
              color:tab===t.id?C.gold:C.inkFaint,transition:'all 0.15s',
            }}>
              {t.dot&&<span style={{width:5,height:5,borderRadius:'50%',background:t.dot}}/>}
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}>
          <AnimatePresence mode="wait">

            {/* PAY */}
            {tab==='pay' && (
              <motion.div key="pay" variants={stg()} initial="hidden" animate="show" style={{display:'flex',flexDirection:'column',gap:14}}>
                {/* Breakdown */}
                <motion.div variants={fd} style={{borderRadius:12,overflow:'hidden',border:`1px solid ${C.creamBorder}`}}>
                  {loadingDb
                    ? <div style={{padding:'16px',textAlign:'center',color:C.inkFaint,fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/>Loading salary data…</div>
                    : (() => {
                        const rows = [
                          ['Base Salary', `₹${Rs(base)}`, false, false, false],
                          [`Commission (${cr}% × ₹${Rs(rev)})`, `+₹${Rs(comm)}`, true, false, false],
                          ...(dbBonus > 0  ? [['Bonus (this month)',      `+₹${Rs(dbBonus)}`,   false, false, 'bonus']]  : []),
                          ...(dbDeduct > 0 ? [['Deductions (this month)', `−₹${Rs(dbDeduct)}`,  false, false, 'deduct']] : []),
                          ...(alreadyPaid > 0 ? [['Already Paid',         `−₹${Rs(alreadyPaid)}`, false, false, 'paid']] : []),
                          ['Balance Due', `₹${Rs(balanceDue > 0 ? balanceDue : netPayable)}`, false, true, false],
                        ];
                        return rows.map(([l,v,isC,isT,tag],i) => (
                          <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                            padding:'11px 16px',background:isT?C.goldPale:i%2===0?C.white:C.cream,
                            borderBottom:i<rows.length-1?`1px solid ${C.creamBorder}`:'none'}}>
                            <span style={{fontSize:12,color:C.inkFaint}}>{l}</span>
                            <span style={{fontSize:isT?17:13,fontWeight:isT?800:700,
                              color:isT?C.gold:isC?C.ok:tag==='deduct'?C.risk:tag==='bonus'?C.ok:tag==='paid'?C.inkMid:C.ink,
                              fontFamily:isT?"'Playfair Display',serif":'inherit'}}>{v}</span>
                          </div>
                        ));
                      })()
                  }
                </motion.div>

                {/* Month */}
                <motion.div variants={fd}>
                  <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.inkFaint,marginBottom:6}}>Pay for Month</p>
                  <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
                    onFocus={e=>{e.target.style.borderColor=C.gold;}}
                    onBlur={e=>{e.target.style.borderColor=C.creamBorder;}}
                    style={{width:'100%',padding:'9px 12px',borderRadius:10,border:`1.5px solid ${C.creamBorder}`,
                      background:C.white,color:C.ink,fontSize:13,outline:'none',boxSizing:'border-box',cursor:'pointer'}}/>
                </motion.div>

                {/* Payment method */}
                <motion.div variants={fd}>
                  <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.inkFaint,marginBottom:6}}>Payment Method</p>
                  <div className="glm-staff-4col" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
                    {Object.entries(PMETHODS).map(([k,pm])=>{const Icon=pm.icon;return(
                      <button key={k} onClick={()=>{setPayMethod(k);setTxnId('');}} style={{
                        padding:'9px 5px',borderRadius:10,cursor:'pointer',
                        border:`1.5px solid ${payMethod===k?pm.color:C.creamBorder}`,
                        background:payMethod===k?pm.pale:C.cream,
                        display:'flex',flexDirection:'column',alignItems:'center',gap:5,transition:'all 0.15s',
                      }}>
                        <Icon size={13} style={{color:payMethod===k?pm.color:C.inkGhost}}/>
                        <span style={{fontSize:9,fontWeight:700,color:payMethod===k?pm.color:C.inkFaint,textAlign:'center',lineHeight:1.2}}>{pm.label}</span>
                      </button>
                    );})}
                  </div>
                </motion.div>

                {['upi','bank','cheque'].includes(payMethod)&&(
                  <motion.div variants={fd}>
                    <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.inkFaint,marginBottom:6}}>
                      {payMethod==='upi'?'UPI Transaction ID':payMethod==='bank'?'UTR / Reference':'Cheque Number'}
                    </p>
                    <Inp value={txnId} onChange={e=>setTxnId(e.target.value)}
                      placeholder={payMethod==='upi'?'e.g. 316821049123':'e.g. UTR123456789'}
                      style={{fontFamily:'monospace'}}/>
                  </motion.div>
                )}

                {['upi','bank'].includes(payMethod)&&(
                  <motion.div variants={fd}>
                    <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.inkFaint,marginBottom:6}}>Receipt Screenshot</p>
                    {txnUrl?(
                      <div style={{position:'relative'}}>
                        <img src={txnUrl} alt="receipt" style={{width:'100%',maxHeight:110,objectFit:'contain',borderRadius:10,border:`1px solid ${C.creamBorder}`}}/>
                        <button onClick={()=>{setTxnFile(null);setTxnUrl(null);}} style={{position:'absolute',top:6,right:6,width:22,height:22,borderRadius:'50%',background:C.risk,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={10} style={{color:'#fff'}}/></button>
                      </div>
                    ):(
                      <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,padding:'16px',
                        borderRadius:10,border:`2px dashed ${C.creamBorder}`,cursor:'pointer',background:C.cream}}>
                        <Upload size={16} style={{color:C.inkGhost}}/>
                        <span style={{fontSize:11,color:C.inkFaint}}>Upload screenshot</span>
                        <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){setTxnFile(f);setTxnUrl(URL.createObjectURL(f));};}}/>
                      </label>
                    )}
                  </motion.div>
                )}

                {paidThisMo&&(
                  <div style={{padding:'10px 14px',borderRadius:10,background:C.warnPale,border:`1px solid ${C.warnBorder}`}}>
                    <p style={{fontSize:11,fontWeight:700,color:C.warn}}>⚠ Salary already marked paid for {fmtMo(thisMo())}. Recording re-payment.</p>
                  </div>
                )}

                <GoldBtn onClick={markPaid} disabled={saving} style={{width:'100%',padding:'12px',fontSize:13}}>
                  {saving?<Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/>:<Send size={14}/>}
                  {saving?'Sending…':`Send ₹${Rs(balanceDue > 0 ? balanceDue : netPayable)} via ${PMETHODS[payMethod].label}`}
                </GoldBtn>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <button onClick={()=>printSlip()} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px',borderRadius:10,border:`1px solid ${C.creamBorder}`,background:C.white,color:C.inkMid,fontSize:11,fontWeight:700,cursor:'pointer'}}>
                    <Printer size={13}/> Print Payslip
                  </button>
                  <button onClick={()=>waSlip()} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px',borderRadius:10,border:'none',background:'#E7F8EE',color:'#128C7E',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                    <MessageCircle size={13}/> WhatsApp
                  </button>
                </div>
              </motion.div>
            )}

            {/* ADJUST */}
            {tab==='adjust' && (
              <motion.div key="adjust" variants={stg()} initial="hidden" animate="show" style={{display:'flex',flexDirection:'column',gap:14}}>
                <motion.div variants={fd} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {[['bonus','+ Bonus',C.ok,C.okPale,C.okBorder],['deduction','− Deduction',C.risk,C.riskPale,C.riskBorder]].map(([v,l,c,bg,bd])=>(
                    <button key={v} onClick={()=>setAdjType(v)} style={{padding:'12px',borderRadius:11,cursor:'pointer',
                      border:`1.5px solid ${adjType===v?c:C.creamBorder}`,background:adjType===v?bg:C.white,
                      color:adjType===v?c:C.inkMid,fontWeight:700,fontSize:13,transition:'all 0.15s'}}>{l}</button>
                  ))}
                </motion.div>

                <motion.div variants={fd}>
                  <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.inkFaint,marginBottom:6}}>Quick Presets</p>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {(adjType==='bonus'
                      ?[[500,'Festival'],[1000,'Performance'],[2000,'Star Award'],[500,'Overtime']]
                      :[[200,'Late Fine'],[300,'Absent'],[150,'Damage'],[500,'Advance']]
                    ).map(([amt,note])=>(
                      <button key={note} onClick={()=>{setAdjAmt(String(amt));setAdjNote(note);}} style={{
                        padding:'5px 12px',borderRadius:100,fontSize:11,fontWeight:700,cursor:'pointer',
                        border:`1px solid ${C.creamBorder}`,
                        background:adjType==='bonus'?C.okPale:C.riskPale,
                        color:adjType==='bonus'?C.ok:C.risk,
                      }}>{adjType==='bonus'?'+':'−'}₹{Rs(amt)} {note}</button>
                    ))}
                  </div>
                </motion.div>

                <motion.div variants={fd} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div>
                    <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.inkFaint,marginBottom:6}}>Amount (₹)</p>
                    <Inp type="number" min={1} value={adjAmt} onChange={e=>setAdjAmt(e.target.value)} placeholder="e.g. 500"/>
                  </div>
                  <div>
                    <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.inkFaint,marginBottom:6}}>Month</p>
                    <input type="month" value={adjMo} onChange={e=>setAdjMo(e.target.value)}
                      onFocus={e=>{e.target.style.borderColor=C.gold;}}
                      onBlur={e=>{e.target.style.borderColor=C.creamBorder;}}
                      style={{width:'100%',padding:'9px 12px',borderRadius:10,border:`1.5px solid ${C.creamBorder}`,
                        background:C.white,color:C.ink,fontSize:13,outline:'none',boxSizing:'border-box',cursor:'pointer'}}/>
                  </div>
                </motion.div>

                <motion.div variants={fd}>
                  <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.inkFaint,marginBottom:6}}>Note</p>
                  <Inp value={adjNote} onChange={e=>setAdjNote(e.target.value)} placeholder="e.g. Diwali bonus, late fine…"/>
                </motion.div>

                <button onClick={applyAdj} disabled={!adjAmt} style={{
                  width:'100%',padding:'12px',borderRadius:12,border:'none',cursor:!adjAmt?'not-allowed':'pointer',
                  background:!adjAmt?C.creamDark:adjType==='bonus'?C.ok:C.risk,
                  color:!adjAmt?C.inkGhost:'#fff',fontSize:13,fontWeight:700,
                  display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                }}>
                  {adjType==='bonus'?<PlusCircle size={14}/>:<MinusCircle size={14}/>}
                  Apply {adjType==='bonus'?'Bonus':'Deduction'}{adjAmt?` — ₹${Rs(adjAmt)}`:''}
                </button>
              </motion.div>
            )}

            {/* HISTORY */}
            {tab==='history' && (
              <motion.div key="history" variants={stg()} initial="hidden" animate="show" style={{display:'flex',flexDirection:'column',gap:10}}>
                <motion.div variants={fd} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:7}}>
                  {[['Paid',`₹${Rs(hist.filter(r=>r.type==='payment').reduce((a,r)=>a+(r.amount||0),0))}`,C.gold],
                    ['Bonuses',`+₹${Rs(hist.filter(r=>r.type==='bonus').reduce((a,r)=>a+(r.amount||0),0))}`,C.ok],
                    ['Deductions',`−₹${Rs(hist.filter(r=>r.type==='deduction').reduce((a,r)=>a+(r.amount||0),0))}`,C.risk],
                  ].map(([l,v,c])=>(
                    <div key={l} style={{padding:'11px 10px',borderRadius:11,background:C.white,border:`1px solid ${C.creamBorder}`,textAlign:'center'}}>
                      <p style={{fontSize:15,fontWeight:800,color:c,fontFamily:"'Playfair Display',serif"}}>{v}</p>
                      <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:C.inkGhost,marginTop:4}}>{l}</p>
                    </div>
                  ))}
                </motion.div>

                {hist.length===0
                  ? <div style={{textAlign:'center',padding:'32px 0'}}><BarChart2 size={24} style={{color:C.inkGhost,margin:'0 auto 10px'}}/><p style={{fontSize:12,color:C.inkFaint}}>No records yet</p></div>
                  : hist.map((h,i)=>{
                    const isPay=h.type==='payment',isBon=h.type==='bonus';
                    const pm=h.paymentMethod?PMETHODS[h.paymentMethod]:null;
                    return(
                      <motion.div key={h.id||i} variants={fd}
                        style={{display:'flex',alignItems:'center',gap:10,padding:'11px 13px',
                          borderRadius:12,background:i%2===0?C.white:C.cream,border:`1px solid ${C.creamBorder}`}}>
                        <div style={{width:32,height:32,borderRadius:9,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                          background:isPay?C.goldPale:isBon?C.okPale:C.riskPale,
                          border:`1px solid ${isPay?C.creamBorder:isBon?C.okBorder:C.riskBorder}`}}>
                          {isPay?<Send size={12} style={{color:C.gold}}/>:isBon?<PlusCircle size={12} style={{color:C.ok}}/>:<MinusCircle size={12} style={{color:C.risk}}/>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{fontSize:11,fontWeight:700,color:C.ink,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.note||h.type}</p>
                          <div style={{display:'flex',gap:5,marginTop:3,flexWrap:'wrap'}}>
                            {h.month&&<Badge color={C.inkFaint} bg={C.cream} border={C.creamBorder} size={9}>{fmtMo(h.month)}</Badge>}
                            {pm&&<Badge color={pm.color} bg={pm.pale} border={pm.border} size={9}>{pm.label}</Badge>}
                          </div>
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <p style={{fontSize:13,fontWeight:800,color:isPay?C.gold:isBon?C.ok:C.risk}}>{h.type==='deduction'?'−':'+'}₹{Rs(h.amount)}</p>
                          <p style={{fontSize:9,color:C.inkGhost,marginTop:2}}>{fmtDt(h.paidAt||h.date)}</p>
                        </div>
                        <div style={{display:'flex',gap:4,flexShrink:0}}>
                          {isPay&&<button onClick={()=>printSlip(h)} style={{width:26,height:26,borderRadius:7,border:`1px solid ${C.creamBorder}`,background:C.creamMid,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Printer size={10} style={{color:C.inkFaint}}/></button>}
                          {isPay&&<button onClick={()=>waSlip(h)} style={{width:26,height:26,borderRadius:7,border:'none',background:'#E7F8EE',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><MessageCircle size={10} style={{color:'#128C7E'}}/></button>}
                          <button onClick={()=>delRec(h.id)} style={{width:26,height:26,borderRadius:7,border:`1px solid ${C.riskBorder}`,background:C.riskPale,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={10} style={{color:C.risk}}/></button>
                        </div>
                      </motion.div>
                    );
                  })}
              </motion.div>
            )}

            {/* COMMISSION */}
            {tab==='commission' && (
              <motion.div key="commission" variants={stg()} initial="hidden" animate="show" style={{display:'flex',flexDirection:'column',gap:14}}>
                <motion.div variants={fd} style={{padding:'12px 14px',borderRadius:11,background:C.goldPale,border:`1px solid ${C.creamBorder}`}}>
                  <p style={{fontSize:12,color:C.inkMid,lineHeight:1.7}}>
                    <span style={{color:C.gold,fontWeight:700}}>Commission</span> = Rate × Revenue. Changes saved immediately.
                  </p>
                </motion.div>
                <motion.div variants={fd}>
                  <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.inkFaint,marginBottom:6}}>Commission Rate (%)</p>
                  <div style={{display:'flex',gap:8}}>
                    <Inp type="number" min={0} max={50} step={0.5} value={cr}
                      onChange={e=>{setCr(e.target.value);setCrDirty(true);}}
                      style={{fontSize:18,fontWeight:700,flex:1}}/>
                    <GoldBtn onClick={saveComm} disabled={savingCr||!crDirty} style={{flexShrink:0}}>
                      {savingCr?<Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/>:<Check size={13}/>} Save
                    </GoldBtn>
                  </div>
                  <input type="range" min={0} max={30} step={0.5} value={cr}
                    onChange={e=>{setCr(e.target.value);setCrDirty(true);}}
                    style={{width:'100%',marginTop:12,accentColor:C.gold}}/>
                </motion.div>
                <motion.div variants={fd} style={{padding:'14px',borderRadius:12,background:C.white,border:`1px solid ${C.creamBorder}`}}>
                  <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:10}}>
                    <span style={{fontSize:12,color:C.inkFaint}}>₹{Rs(rev)} × {cr}% =</span>
                    <span style={{fontSize:18,fontWeight:800,color:C.gold,fontFamily:"'Playfair Display',serif"}}>₹{Rs(comm)}</span>
                  </div>
                  <div style={{height:5,borderRadius:100,background:C.creamDark,overflow:'hidden',marginBottom:10}}>
                    <motion.div animate={{width:`${Math.min(Number(cr)*3,100)}%`}} transition={{duration:0.3}}
                      style={{height:'100%',borderRadius:100,background:`linear-gradient(90deg,${C.gold},${C.goldLight})`}}/>
                  </div>
                  <p style={{fontSize:12,color:C.inkFaint}}>Total: ₹{Rs(base)} + ₹{Rs(comm)} = <span style={{color:C.gold,fontWeight:800}}>₹{Rs(total)}</span></p>
                </motion.div>
                <motion.div variants={fd}>
                  <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.inkFaint,marginBottom:8}}>Preset Rates</p>
                  <div className="glm-staff-3col" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7}}>
                    {[['Trainee',5],['Junior',8],['Senior',12],['Master',15],['Manager',18],['Senior+',20]].map(([lbl,val])=>(
                      <button key={lbl} onClick={()=>{setCr(val);setCrDirty(true);}} style={{
                        padding:'11px 6px',borderRadius:11,cursor:'pointer',textAlign:'center',
                        border:`1.5px solid ${String(cr)===String(val)?C.gold:C.creamBorder}`,
                        background:String(cr)===String(val)?C.goldPale:C.white,transition:'all 0.15s',
                      }}>
                        <p style={{fontSize:16,fontWeight:800,color:String(cr)===String(val)?C.gold:C.ink}}>{val}%</p>
                        <p style={{fontSize:9,color:C.inkFaint,marginTop:2}}>{lbl}</p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* BANK DETAILS */}
            {tab==='paydetails' && (
              <motion.div key="paydetails" variants={stg()} initial="hidden" animate="show" style={{display:'flex',flexDirection:'column',gap:12}}>
                {!editPd ? (
                  <>
                    <motion.div variants={fd} style={{display:'flex',justifyContent:'flex-end'}}>
                      <GhostBtn onClick={()=>{setPdForm(pd);setEditPd(true);}}><Edit2 size={12}/>Edit</GhostBtn>
                    </motion.div>
                    {[
                      {lbl:'UPI ID',val:pd.upiId,sub:pd.upiName,c:C.blue},
                      {lbl:'PhonePe / GPay',val:pd.phonePeNo?`+91 ${pd.phonePeNo}`:null,c:C.ok},
                      {lbl:'Bank Account',val:pd.bankAcc,extras:[['IFSC',pd.ifsc],['Bank',pd.bankName],['Holder',pd.accName]],c:C.gold},
                    ].map(item=>(
                      <motion.div key={item.lbl} variants={fd} style={{padding:'13px 15px',borderRadius:12,background:C.white,border:`1px solid ${C.creamBorder}`}}>
                        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
                          <div style={{flex:1}}>
                            <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:item.c,marginBottom:5}}>{item.lbl}</p>
                            <p style={{fontSize:13,fontWeight:700,color:item.val?C.ink:C.inkGhost,fontFamily:item.val?'monospace':'inherit'}}>{item.val||'—'}</p>
                            {item.sub&&<p style={{fontSize:11,color:C.inkFaint,marginTop:2}}>{item.sub}</p>}
                          </div>
                          {item.val&&<button onClick={()=>navigator.clipboard.writeText(item.val).then(()=>flash('Copied!'))} style={{padding:'4px 10px',borderRadius:7,border:`1px solid ${C.creamBorder}`,background:C.cream,color:C.inkMid,fontSize:10,fontWeight:700,cursor:'pointer',flexShrink:0}}>Copy</button>}
                        </div>
                        {item.extras&&item.val&&(
                          <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.creamBorder}`}}>
                            {item.extras.filter(([,v])=>v).map(([k,v])=>(
                              <div key={k} style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                                <span style={{fontSize:11,color:C.inkFaint}}>{k}</span>
                                <span style={{fontSize:11,fontFamily:'monospace',color:C.inkMid}}>{v}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </>
                ) : (
                  <motion.div variants={fd} style={{display:'flex',flexDirection:'column',gap:12}}>
                    {[['upiId','UPI ID','name@paytm'],['upiName','UPI Name','Name on UPI'],['phonePeNo','PhonePe No.','10-digit mobile'],
                      ['bankAcc','Account Number','1234567890123'],['ifsc','IFSC Code','SBIN0001234'],
                      ['bankName','Bank Name','SBI, HDFC…'],['accName','Account Holder','Full name']].map(([key,lbl,ph])=>(
                      <div key={key}>
                        <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.inkFaint,marginBottom:5}}>{lbl}</p>
                        <Inp value={pdForm[key]||''} onChange={e=>setPdForm(f=>({...f,[key]:e.target.value}))} placeholder={ph}
                          style={['bankAcc','ifsc','upiId'].includes(key)?{fontFamily:'monospace'}:{}}/>
                      </div>
                    ))}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:8,marginTop:4}}>
                      <GhostBtn onClick={()=>setEditPd(false)}>Cancel</GhostBtn>
                      <GoldBtn onClick={()=>{setPayDet(staff._id,pdForm);setPd(pdForm);setEditPd(false);flash('Saved!');}}>
                        <Check size={13}/> Save Details
                      </GoldBtn>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      <AnimatePresence>{toast&&<Toast msg={toast.msg} type={toast.type}/>}</AnimatePresence>
    </motion.div>
  );
};

// ─── Staff Card ───────────────────────────────────────────────────────────────
const StaffCard = ({ staff, onView, onEdit, onDelete, onToggle, onSalary, onRoleChange }) => {
  const [menuOpen,setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const isActive = staff.user?.isActive!==false;
  const cr       = staff.commissionRate||0;
  const base     = staff.salary?.base||0;
  const rev      = staff.totalRevenueGenerated||0;
  const comm     = Math.round(rev*cr/100);
  const total    = base+comm;
  const att      = staff.attendancePercent??0;
  const lastPaid = getLastPaid(staff._id);
  const paid     = lastPaid&&lastPaid.month===thisMo();

  const AV_STATUS = {
    available: {color:C.ok,label:'Available'},
    busy:      {color:C.warn,label:'With Client'},
    'off-duty':{color:C.inkFaint,label:'Off Duty'},
    absent:    {color:C.risk,label:'Absent'},
  };
  const av = AV_STATUS[staff.availabilityStatus||(staff.isAvailable?'available':'off-duty')]||AV_STATUS['off-duty'];

  useEffect(()=>{
    const fn=e=>{ if(menuRef.current&&!menuRef.current.contains(e.target))setMenuOpen(false); };
    document.addEventListener('mousedown',fn);return()=>document.removeEventListener('mousedown',fn);
  },[]);

  const menuItems=[
    {icon:Edit2,       label:'Edit',          action:()=>onEdit(staff),   color:C.gold},
    {icon:Wallet,      label:'Salary & Pay',  action:()=>onSalary(staff), color:C.gold},
    {icon:ArrowLeftRight,label:staff.user?.role==='receptionist'?'→ Make Stylist':'→ Front Desk',
                                              action:()=>onRoleChange(staff,staff.user?.role==='receptionist'?'staff':'receptionist'),color:C.blue},
    {icon:isActive?UserX:UserCheck,label:isActive?'Deactivate':'Activate',action:()=>onToggle(staff),color:isActive?C.risk:C.ok},
    {icon:Trash2,      label:'Delete',        action:()=>onDelete(staff._id),color:C.risk},
  ];

  return (
    <motion.div variants={fd} layout
      whileHover={{y:-3,boxShadow:`0 12px 40px rgba(0,0,0,0.1), 0 0 0 1.5px ${C.creamBorder}`}}
      style={{background:C.white,border:`1.5px solid ${paid?C.okBorder:C.creamBorder}`,borderRadius:16,
        overflow:'visible',cursor:'pointer',position:'relative',opacity:isActive?1:0.65,
        boxShadow:'0 2px 12px rgba(0,0,0,0.06)',transition:'border-color 0.2s'}}
      onClick={()=>onView(staff)}>

      {/* Gold top accent */}
      <div style={{height:3,borderRadius:'16px 16px 0 0',
        background:isActive?`linear-gradient(90deg,${C.gold},${C.goldLight},${C.gold})`:C.creamDark}}/>

      <div style={{padding:'14px 16px'}}>
        {/* Status row */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:av.color,display:'inline-block'}}/>
            <span style={{fontSize:10,fontWeight:700,color:av.color}}>{av.label}</span>
          </div>
          <div ref={menuRef} style={{position:'relative'}} onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setMenuOpen(v=>!v)} style={{width:28,height:28,borderRadius:8,
              border:`1px solid ${C.creamBorder}`,background:C.cream,cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center'}}>
              <MoreVertical size={12} style={{color:C.inkFaint}}/>
            </button>
            <AnimatePresence>
              {menuOpen&&(
                <motion.div initial={{opacity:0,scale:0.92,y:-4}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.92}}
                  style={{position:'absolute',right:0,top:34,background:C.white,
                    border:`1px solid ${C.creamBorder}`,borderRadius:12,
                    boxShadow:'0 12px 40px rgba(0,0,0,0.12)',padding:4,minWidth:165,zIndex:60}}>
                  {menuItems.map(({icon:Icon,label,action,color})=>(
                    <button key={label} onClick={()=>{action();setMenuOpen(false);}} style={{
                      width:'100%',display:'flex',alignItems:'center',gap:8,padding:'8px 11px',
                      borderRadius:8,background:'none',border:'none',cursor:'pointer',
                      color,fontSize:11,fontWeight:700,textAlign:'left',
                    }}
                    onMouseEnter={e=>e.currentTarget.style.background=C.cream}
                    onMouseLeave={e=>e.currentTarget.style.background='none'}>
                      <Icon size={12}/>{label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Avatar + name */}
        <div style={{display:'flex',gap:11,marginBottom:12}}>
          <Avatar name={staff.user?.name} size={44}/>
          <div style={{flex:1,minWidth:0}}>
            <p style={{fontSize:14,fontWeight:700,color:C.ink,fontFamily:"'Playfair Display',serif",
              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{staff.user?.name}</p>
            <div style={{display:'flex',gap:5,marginTop:5,flexWrap:'wrap'}}>
              <Badge size={9}>{staff.designationLabel||DESG(staff.designation)}</Badge>
              {staff.user?.role==='receptionist'&&<Badge color={C.blue} bg={C.bluePale} border={C.blueBorder} size={9}>Front Desk</Badge>}
              {!isActive&&<Badge color={C.risk} bg={C.riskPale} border={C.riskBorder} size={9}>Inactive</Badge>}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:12}}>
          {staff.user?.phone&&<p style={{fontSize:10,color:C.inkFaint,display:'flex',alignItems:'center',gap:5}}>
            <Phone size={9} style={{color:C.inkGhost}}/> +91 {(staff.user.phone||'').replace(/\D/g,'').slice(-10)}
          </p>}
          {staff.user?.email&&<p style={{fontSize:10,color:C.inkFaint,display:'flex',alignItems:'center',gap:5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            <Mail size={9} style={{color:C.inkGhost}}/> {staff.user.email}
          </p>}
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:5,marginBottom:12}}>
          {[[staff.totalServicesCompleted||0,'Svc'],[`₹${Rs(rev)}`,'Rev'],
            [staff.averageRating>0?`${staff.averageRating.toFixed(1)}★`:'—','Rtg']].map(([v,l])=>(
            <div key={l} style={{textAlign:'center',padding:'7px 4px',borderRadius:9,background:C.cream,border:`1px solid ${C.creamBorder}`}}>
              <p style={{fontSize:11,fontWeight:800,color:C.inkMid}}>{v}</p>
              <p style={{fontSize:8,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:C.inkGhost,marginTop:2}}>{l}</p>
            </div>
          ))}
        </div>

        {/* Attendance */}
        <div style={{marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
            <span style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:C.inkFaint}}>Attendance</span>
          </div>
          <AttBar val={att}/>
        </div>

        {/* Salary status — clickable */}
        <div onClick={e=>{e.stopPropagation();onSalary(staff);}}
          style={{padding:'10px 12px',borderRadius:11,
            background:paid?C.okPale:C.warnPale,border:`1.5px solid ${paid?C.okBorder:C.warnBorder}`,
            cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between'}}
          onMouseEnter={e=>e.currentTarget.style.opacity='0.8'}
          onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
          <div style={{display:'flex',alignItems:'center',gap:7}}>
            {paid?<CheckCircle2 size={13} style={{color:C.ok}}/>:<AlertTriangle size={13} style={{color:C.warn}}/>}
            <div>
              <p style={{fontSize:10,fontWeight:800,color:paid?C.ok:C.warn,textTransform:'uppercase',letterSpacing:'0.07em'}}>
                {paid?'Salary Sent':'Salary Pending'}
              </p>
              {paid&&<p style={{fontSize:9,color:C.inkFaint,marginTop:1}}>{lastPaid.paymentMethodLabel} · {fmtDt(lastPaid.paidAt||lastPaid.date)}</p>}
              {!paid&&<p style={{fontSize:9,color:C.inkFaint,marginTop:1}}>Tap to pay</p>}
            </div>
          </div>
          <p style={{fontSize:15,fontWeight:800,color:paid?C.ok:C.warn,fontFamily:"'Playfair Display',serif"}}>₹{Rs(total)}</p>
        </div>

        {/* Day dots */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:11}}>
          <span style={{fontSize:9,color:C.inkFaint,display:'flex',alignItems:'center',gap:4}}>
            <Clock size={9} style={{color:C.inkGhost}}/>
            {staff.schedule?.shiftStart||'09:00'}–{staff.schedule?.shiftEnd||'21:00'}
          </span>
          <div style={{display:'flex',gap:2}}>
            {['M','T','W','T','F','S','S'].map((d,i)=>{
              const off=staff.schedule?.weeklyOff?.includes(DAYS_F[i]);
              return <div key={i} style={{width:16,height:16,borderRadius:5,display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:7,fontWeight:800,background:off?C.riskPale:C.okPale,color:off?C.risk:C.ok,
                border:`1px solid ${off?C.riskBorder:C.okBorder}`}}>{d}</div>;
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Staff Drawer ─────────────────────────────────────────────────────────────
const StaffDrawer = ({ staff, onClose, onEdit, onSalary }) => {
  const [tab,setTab]   = useState('overview');
  const [revD,setRevD] = useState(null);
  const [loading,setLoad] = useState(false);

  const cr=staff.commissionRate||0;const base=staff.salary?.base||0;
  const rev=staff.totalRevenueGenerated||0;const comm=Math.round(rev*cr/100);const total=base+comm;
  const lastPaid=getLastPaid(staff._id);const paid=lastPaid&&lastPaid.month===thisMo();

  useEffect(()=>{
    (async()=>{setLoad(true);try{const{data}=await api.get(`/staff/${staff._id}/revenue`);setRevD(data);}catch{}setLoad(false);})();
  },[staff._id]);

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{position:'fixed',inset:0,zIndex:500,background:'rgba(22,16,10,0.6)',
        backdropFilter:'blur(6px)',display:'flex',justifyContent:'flex-end'}}>
      <motion.div variants={sl} initial="hidden" animate="show" exit="hidden"
        style={{width:'100%',maxWidth:400,height:'100%',background:C.cream,
          borderLeft:`1px solid ${C.creamBorder}`,display:'flex',flexDirection:'column',
          boxShadow:'-16px 0 60px rgba(0,0,0,0.14)'}}>

        {/* Header */}
        <div style={{padding:'18px 20px',borderBottom:`1px solid ${C.creamBorder}`,background:C.white,flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{display:'flex',alignItems:'center',gap:11}}>
              <Avatar name={staff.user?.name} size={46}/>
              <div>
                <h2 style={{fontSize:16,fontWeight:700,color:C.ink,fontFamily:"'Playfair Display',serif",margin:0}}>{staff.user?.name}</h2>
                <div style={{display:'flex',gap:5,marginTop:5,flexWrap:'wrap'}}>
                  <Badge size={9}>{staff.designationLabel||DESG(staff.designation)}</Badge>
                  <Badge color={staff.user?.isActive!==false?C.ok:C.risk}
                    bg={staff.user?.isActive!==false?C.okPale:C.riskPale}
                    border={staff.user?.isActive!==false?C.okBorder:C.riskBorder} size={9}>
                    ● {staff.user?.isActive!==false?'Active':'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:5}}>
              <button onClick={()=>onEdit(staff)} style={{width:30,height:30,borderRadius:8,border:`1px solid ${C.creamBorder}`,background:C.creamMid,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Edit2 size={13} style={{color:C.inkMid}}/></button>
              <button onClick={()=>onSalary(staff)} style={{width:30,height:30,borderRadius:8,border:`1px solid ${C.creamBorder}`,background:C.goldPale,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Wallet size={13} style={{color:C.gold}}/></button>
              <button onClick={onClose} style={{width:30,height:30,borderRadius:8,border:`1px solid ${C.creamBorder}`,background:C.creamMid,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={13} style={{color:C.inkMid}}/></button>
            </div>
          </div>
          <SalaryStatus staffId={staff._id} total={total}/>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:3,padding:'9px 14px',borderBottom:`1px solid ${C.creamBorder}`,overflowX:'auto',flexShrink:0}}>
          {['overview','revenue','schedule','notes','docs'].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:'5px 12px',borderRadius:100,fontSize:10,fontWeight:700,cursor:'pointer',
              border:`1px solid ${tab===t?C.gold:C.creamBorder}`,
              background:tab===t?C.goldPale:'transparent',color:tab===t?C.gold:C.inkFaint,
              whiteSpace:'nowrap',textTransform:'capitalize',transition:'all 0.15s',
            }}>{t}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:'auto',padding:'16px 18px'}}>
          {tab==='overview' && (
            <motion.div variants={stg()} initial="hidden" animate="show" style={{display:'flex',flexDirection:'column',gap:11}}>
              {/* Contact */}
              <motion.div variants={fd} style={{padding:'12px 14px',borderRadius:12,background:C.white,border:`1px solid ${C.creamBorder}`}}>
                <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.inkFaint,marginBottom:8}}>Contact</p>
                {staff.user?.email&&<p style={{fontSize:11,color:C.inkMid,marginBottom:5,display:'flex',alignItems:'center',gap:7}}><Mail size={10} style={{color:C.inkGhost}}/>{staff.user.email}</p>}
                {staff.user?.phone&&<p style={{fontSize:11,color:C.inkMid,display:'flex',alignItems:'center',gap:7}}><Phone size={10} style={{color:C.inkGhost}}/>+91 {(staff.user.phone||'').replace(/\D/g,'').slice(-10)}</p>}
              </motion.div>
              {/* KPIs */}
              <motion.div variants={fd} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
                {[[staff.totalServicesCompleted||0,'Services',Calendar],[`₹${Rs(rev)}`,'Revenue',TrendingUp],
                  [staff.averageRating?.toFixed(1)||'—','Rating',Star],[`₹${Rs(total)}`,'Monthly Pay',Wallet]].map(([v,l,Icon])=>(
                  <div key={l} style={{padding:'11px',borderRadius:11,background:C.white,border:`1px solid ${C.creamBorder}`}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                      <Icon size={10} style={{color:C.gold}}/>
                      <span style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:C.inkFaint}}>{l}</span>
                    </div>
                    <p style={{fontSize:14,fontWeight:800,color:C.ink,fontFamily:"'Playfair Display',serif"}}>{v}</p>
                  </div>
                ))}
              </motion.div>
              {/* Salary */}
              <motion.div variants={fd} onClick={()=>onSalary(staff)}
                style={{padding:'12px 14px',borderRadius:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',
                  background:paid?C.okPale:C.warnPale,border:`1.5px solid ${paid?C.okBorder:C.warnBorder}`}}>
                <div>
                  <p style={{fontSize:11,fontWeight:800,color:paid?C.ok:C.warn}}>{paid?'✓ Salary sent this month':'⚡ Salary pending'}</p>
                  <p style={{fontSize:10,color:C.inkFaint,marginTop:2}}>₹{Rs(base)} base + {cr}% commission</p>
                </div>
                <ChevronRight size={14} style={{color:paid?C.ok:C.warn}}/>
              </motion.div>
              {/* Specializations */}
              {(staff.specializations||[]).length>0&&(
                <motion.div variants={fd} style={{padding:'12px 14px',borderRadius:12,background:C.white,border:`1px solid ${C.creamBorder}`}}>
                  <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.inkFaint,marginBottom:8}}>Specializations</p>
                  <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                    {staff.specializations.map(s=><Badge key={s} color={C.inkFaint} bg={C.cream} border={C.creamBorder} size={10}>{s}</Badge>)}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {tab==='revenue' && (
            loading
              ? <div style={{display:'flex',justifyContent:'center',padding:'40px'}}><Loader2 size={20} style={{color:C.gold,animation:'spin 1s linear infinite'}}/></div>
              : (
                <motion.div variants={stg()} initial="hidden" animate="show" style={{display:'flex',flexDirection:'column',gap:10}}>
                  <motion.div variants={fd} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
                    {[['Total',`₹${Rs(rev)}`],['This Month',`₹${Rs(revD?.thisMonth)}`],
                      ['Services',staff.totalServicesCompleted||0],['Avg/Service',`₹${Rs(revD?.avgPerService)}`]].map(([l,v])=>(
                      <div key={l} style={{padding:'13px',borderRadius:11,background:C.white,border:`1px solid ${C.creamBorder}`,textAlign:'center'}}>
                        <p style={{fontSize:15,fontWeight:800,color:C.gold,fontFamily:"'Playfair Display',serif"}}>{v}</p>
                        <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase',color:C.inkGhost,marginTop:4}}>{l}</p>
                      </div>
                    ))}
                  </motion.div>
                  {(revD?.topServices||[]).length>0&&(
                    <motion.div variants={fd} style={{padding:'12px 14px',borderRadius:12,background:C.white,border:`1px solid ${C.creamBorder}`}}>
                      <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.inkFaint,marginBottom:10}}>Top Services</p>
                      {revD.topServices.slice(0,5).map((svc,i)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                          <span style={{fontSize:10,fontWeight:800,color:C.gold,width:16}}>#{i+1}</span>
                          <div style={{flex:1}}>
                            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                              <span style={{fontSize:11,fontWeight:700,color:C.ink}}>{svc.name}</span>
                              <span style={{fontSize:11,fontWeight:800,color:C.gold}}>₹{Rs(svc.revenue)}</span>
                            </div>
                            <div style={{height:3,borderRadius:100,background:C.creamDark,overflow:'hidden'}}>
                              <motion.div initial={{width:0}} animate={{width:`${Math.round(svc.count/(revD.topServices[0]?.count||1)*100)}%`}} transition={{duration:0.5,delay:i*0.08}}
                                style={{height:'100%',borderRadius:100,background:`linear-gradient(90deg,${C.gold},${C.goldLight})`}}/>
                            </div>
                          </div>
                          <span style={{fontSize:9,color:C.inkFaint}}>{svc.count}×</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              )
          )}

          {tab==='schedule' && (
            <motion.div variants={fd} style={{padding:'16px',borderRadius:12,background:C.white,border:`1px solid ${C.creamBorder}`}}>
              <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.inkFaint,marginBottom:6}}>Shift Hours</p>
              <p style={{fontSize:20,fontWeight:800,color:C.ink,fontFamily:"'Playfair Display',serif",marginBottom:16}}>
                {staff.schedule?.shiftStart||'09:00'} — {staff.schedule?.shiftEnd||'21:00'}
              </p>
              <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.inkFaint,marginBottom:8}}>Weekly Pattern</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:5}}>
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i)=>{
                  const off=staff.schedule?.weeklyOff?.includes(DAYS_F[i]);
                  return(
                    <div key={d} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                      <div style={{width:34,height:34,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:10,fontWeight:800,background:off?C.riskPale:C.okPale,color:off?C.risk:C.ok,
                        border:`1px solid ${off?C.riskBorder:C.okBorder}`}}>{d[0]}</div>
                      <span style={{fontSize:7,fontWeight:700,color:off?C.risk:C.ok}}>{off?'Off':'On'}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {tab==='notes' && <NotesPanel staffId={staff._id}/>}
          {tab==='docs'  && <DocsPanel  staffId={staff._id}/>}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Notes panel ─────────────────────────────────────────────────────────────
const NotesPanel = ({ staffId }) => {
  const [notes,setNotes] = useState(()=>getSalNotes(staffId));
  const [text,setText]   = useState('');
  const [cat,setCat]     = useState('general');
  const CATS = {general:[C.gold,C.goldPale],performance:[C.ok,C.okPale],warning:[C.risk,C.riskPale],hr:[C.blue,C.bluePale]};
  const save = () => {
    if(!text.trim())return;
    const n=[{id:`n_${Date.now()}`,text,cat,createdAt:new Date().toISOString()},...notes];
    saveSalNotes(staffId,n);setNotes(n);setText('');
  };
  return(
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <Textarea value={text} onChange={e=>setText(e.target.value)} rows={3} placeholder="Write a private note…"/>
      <div style={{display:'flex',gap:5,flexWrap:'wrap',alignItems:'center'}}>
        {Object.entries(CATS).map(([k,[c,bg]])=>(
          <button key={k} onClick={()=>setCat(k)} style={{padding:'3px 10px',borderRadius:100,fontSize:10,fontWeight:700,cursor:'pointer',
            border:`1px solid ${cat===k?c:C.creamBorder}`,background:cat===k?bg:'transparent',
            color:cat===k?c:C.inkFaint,textTransform:'capitalize',transition:'all 0.15s'}}>{k}</button>
        ))}
        <GoldBtn onClick={save} disabled={!text.trim()} style={{marginLeft:'auto',padding:'5px 14px',fontSize:11}}>
          <Plus size={10}/> Add
        </GoldBtn>
      </div>
      {notes.map(n=>{
        const[c,bg]=CATS[n.cat]||CATS.general;
        return(
          <div key={n.id} style={{padding:'11px 13px',borderRadius:11,background:C.white,border:`1px solid ${C.creamBorder}`}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:7}}>
              <Badge color={c} bg={bg} border={`${c}40`} size={9}>{n.cat}</Badge>
              <button onClick={()=>{const u=notes.filter(x=>x.id!==n.id);saveSalNotes(staffId,u);setNotes(u);}} style={{background:'none',border:'none',cursor:'pointer'}}><Trash2 size={11} style={{color:C.risk}}/></button>
            </div>
            <p style={{fontSize:12,color:C.ink,lineHeight:1.6}}>{n.text}</p>
            <p style={{fontSize:9,color:C.inkFaint,marginTop:6}}>{fmtDt(n.createdAt)}</p>
          </div>
        );
      })}
    </div>
  );
};

// ─── Docs panel ──────────────────────────────────────────────────────────────
const DocsPanel = ({ staffId }) => {
  const [docs,setDocs] = useState(()=>getDocs(staffId));
  const [form,setForm] = useState({name:'',type:'aadhaar',number:''});
  const [show,setShow] = useState(false);
  const DTYPES={aadhaar:'🪪',pan:'💳',contract:'📄',certificate:'🏆',other:'📁'};
  const save=()=>{
    if(!form.name.trim())return;
    const d=[{id:`d_${Date.now()}`,...form,uploadedAt:new Date().toISOString(),verified:false},...docs];
    saveDocs(staffId,d);setDocs(d);setForm({name:'',type:'aadhaar',number:''});setShow(false);
  };
  return(
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      <GhostBtn onClick={()=>setShow(v=>!v)} style={{width:'100%',justifyContent:'center'}}>
        {show?<X size={11}/>:<Plus size={11}/>} {show?'Cancel':'Add Document'}
      </GhostBtn>
      {show&&(
        <div style={{padding:'14px',borderRadius:12,background:C.white,border:`1px solid ${C.creamBorder}`,display:'flex',flexDirection:'column',gap:9}}>
          <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={{padding:'8px 12px',borderRadius:9,border:`1.5px solid ${C.creamBorder}`,background:C.white,color:C.ink,fontSize:12,outline:'none'}}>
            {Object.entries(DTYPES).map(([k])=><option key={k} value={k}>{k}</option>)}
          </select>
          <Inp value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Document name"/>
          <Inp value={form.number} onChange={e=>setForm(f=>({...f,number:e.target.value}))} placeholder="Number (optional)" style={{fontFamily:'monospace'}}/>
          <GoldBtn onClick={save} disabled={!form.name.trim()} style={{width:'100%'}}><Check size={12}/> Save</GoldBtn>
        </div>
      )}
      {docs.map(d=>(
        <div key={d.id} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 13px',borderRadius:11,background:C.white,border:`1px solid ${C.creamBorder}`}}>
          <span style={{fontSize:16}}>{DTYPES[d.type]||'📁'}</span>
          <div style={{flex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
              <p style={{fontSize:12,fontWeight:700,color:C.ink}}>{d.name}</p>
              {d.verified&&<Badge color={C.ok} bg={C.okPale} border={C.okBorder} size={9}>✓ Verified</Badge>}
            </div>
            {d.number&&<p style={{fontSize:9,color:C.inkFaint,fontFamily:'monospace'}}>#{d.number}</p>}
          </div>
          <div style={{display:'flex',gap:4}}>
            <button onClick={()=>{const u=docs.map(x=>x.id===d.id?{...x,verified:!x.verified}:x);saveDocs(staffId,u);setDocs(u);}} style={{width:26,height:26,borderRadius:7,border:`1px solid ${C.okBorder}`,background:C.okPale,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><CheckSquare size={11} style={{color:C.ok}}/></button>
            <button onClick={()=>{const u=docs.filter(x=>x.id!==d.id);saveDocs(staffId,u);setDocs(u);}} style={{width:26,height:26,borderRadius:7,border:`1px solid ${C.riskBorder}`,background:C.riskPale,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={11} style={{color:C.risk}}/></button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminStaff() {
  const [staffList,  setStaffList]  = useState([]);
  const [rawStaff,   setRawStaff]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editStaff,  setEditStaff]  = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [search,     setSearch]     = useState('');
  const [fDesg,      setFDesg]      = useState('');
  const [fStatus,    setFStatus]    = useState('active');
  const [fPay,       setFPay]       = useState('');
  const [sortBy,     setSortBy]     = useState('name');
  const [drawer,     setDrawer]     = useState(null);
  const [salaryFor,  setSalaryFor]  = useState(null);
  const [showLeader, setShowLeader] = useState(true);
  const [toast,      setToast]      = useState(null);

  const { designations, desgMap } = useDesignations();
  const flash = (msg,type='ok') => { setToast({msg,type}); setTimeout(()=>setToast(null),2600); };

  const fetchStaff = useCallback(async (silent=false) => {
    if(!silent)setLoading(true);
    try{const{data}=await api.get('/staff');setRawStaff(data.staff||[]);}
    catch{flash('Failed to load staff','err');}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{fetchStaff();},[fetchStaff]);
  useEffect(()=>{setStaffList(rawStaff.map(s=>({...s,designationLabel:desgMap[s.designation]?.label||DESG(s.designation)})));},[rawStaff,designations]);

  const displayed = useMemo(()=>{
    let list=staffList.filter(s=>{
      const q=search.toLowerCase();
      const mQ=!q||s.user?.name?.toLowerCase().includes(q)||s.user?.email?.toLowerCase().includes(q)||(s.user?.phone||'').includes(q);
      const mD=!fDesg||s.designation===fDesg;
      const active=s.user?.isActive!==false;
      const mS=fStatus==='all'?true:fStatus==='active'?active:!active;
      const lp=getLastPaid(s._id);
      const mP=!fPay?true:fPay==='paid'?(lp&&lp.month===thisMo()):!(lp&&lp.month===thisMo());
      return mQ&&mD&&mS&&mP;
    });
    return [...list].sort((a,b)=>{
      if(sortBy==='revenue')  return (b.totalRevenueGenerated||0)-(a.totalRevenueGenerated||0);
      if(sortBy==='services') return (b.totalServicesCompleted||0)-(a.totalServicesCompleted||0);
      if(sortBy==='salary'){
        const ap=(a.salary?.base||0)+Math.round((a.totalRevenueGenerated||0)*(a.commissionRate||0)/100);
        const bp=(b.salary?.base||0)+Math.round((b.totalRevenueGenerated||0)*(b.commissionRate||0)/100);
        return bp-ap;
      }
      return (a.user?.name||'').localeCompare(b.user?.name||'');
    });
  },[staffList,search,fDesg,fStatus,fPay,sortBy]);

  // KPIs
  const totalActive  = staffList.filter(s=>s.user?.isActive!==false).length;
  const totalPayroll = staffList.reduce((a,s)=>a+(s.salary?.base||0)+Math.round((s.totalRevenueGenerated||0)*(s.commissionRate||0)/100),0);
  const totalRev     = staffList.reduce((a,s)=>a+(s.totalRevenueGenerated||0),0);
  const paidCt       = staffList.filter(s=>{const lp=getLastPaid(s._id);return lp&&lp.month===thisMo();}).length;
  const pendCt       = totalActive-paidCt;
  const avgRat       = (()=>{const r=staffList.filter(s=>s.averageRating>0);return r.length?(r.reduce((a,s)=>a+s.averageRating,0)/r.length).toFixed(1):'—';})();

  const handleSubmit = async fd => {
    setSaving(true);
    try{editStaff?await api.put(`/staff/${editStaff._id}`,fd):await api.post('/staff',fd);
      setModalOpen(false);setEditStaff(null);fetchStaff();
      flash(editStaff?'Staff member updated':'New staff added');}
    catch(e){flash(e.response?.data?.message||'Failed to save','err');}
    finally{setSaving(false);}
  };

  const handleDelete = async id => {
    if(!confirm('Permanently delete this staff member?'))return;
    try{await api.delete(`/staff/${id}`);fetchStaff();flash('Deleted');}
    catch{flash('Failed to delete','err');}
  };

  const handleToggle = async s => {
    const active=s.user?.isActive!==false;
    if(!confirm(`${active?'Deactivate':'Activate'} ${s.user?.name}?`))return;
    try{await api.patch(`/staff/${s._id}`,{isActive:!active});fetchStaff();flash(active?'Deactivated':'Activated');}
    catch{flash('Failed','err');}
  };

  const handleRole = async (s,role) => {
    if(!confirm(`Change ${s.user?.name} to ${role}?`))return;
    try{await api.patch(`/users/${s.user?._id||s.userId}/role`,{role});fetchStaff();flash('Role updated');}
    catch(e){flash(e.response?.data?.message||'Failed','err');}
  };

  const exportCSV = () => {
    const hdr=['Name','Designation','Phone','Email','Base','Comm%','Services','Revenue','Rating','Attendance%','Paid This Month'];
    const rows=displayed.map(s=>{const lp=getLastPaid(s._id);return[`"${s.user?.name||''}"`,s.designationLabel||'',s.user?.phone||'',s.user?.email||'',s.salary?.base||0,s.commissionRate||0,s.totalServicesCompleted||0,s.totalRevenueGenerated||0,s.averageRating?.toFixed(1)||'',s.attendancePercent||0,(lp&&lp.month===thisMo())?'Yes':'No'];});
    const csv=[hdr,...rows].map(r=>r.join(',')).join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download=`staff-${today()}.csv`;a.click();
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>

      <style>{`
        @media (max-width: 700px) {
          .glm-staff-4col { grid-template-columns: 1fr 1fr !important; }
          .glm-staff-3col { grid-template-columns: 1fr 1fr !important; }
          .glm-staff-7cal { grid-template-columns: repeat(7,1fr) !important; font-size: 9px !important; }
        }
        @media (max-width: 400px) {
          .glm-staff-4col { grid-template-columns: 1fr !important; }
          .glm-staff-3col { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <motion.div variants={stg(0.06)} initial="hidden" animate="show"
        style={{fontFamily:"'DM Sans',sans-serif",maxWidth:1200,margin:'0 auto',paddingBottom:60}}>

        {/* ── Header ── */}
        <motion.div variants={fd} style={{background:C.white,border:`1px solid ${C.creamBorder}`,borderRadius:18,
          marginBottom:18,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.06)'}}>
          {/* Gold strip */}
          <div style={{height:3,background:`linear-gradient(90deg,${C.gold},${C.goldLight},${C.gold})`}}/>
          <div style={{padding:'18px 22px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16,marginBottom:20}}>
              <div>
                <h1 style={{fontSize:22,fontWeight:800,color:C.ink,fontFamily:"'Playfair Display',serif",margin:0}}>
                  Staff & Payroll
                </h1>
                <p style={{fontSize:12,color:C.inkFaint,marginTop:5}}>
                  {totalActive} active ·&nbsp;
                  {pendCt>0
                    ? <span style={{color:C.warn,fontWeight:700}}>⚡ {pendCt} salary pending</span>
                    : <span style={{color:C.ok,fontWeight:700}}>✓ all salaries sent</span>
                  } · ₹{Rs(totalPayroll)}/mo
                </p>
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                {/* KPI chips */}
                {[[totalActive,'Active',C.ok,C.okPale,C.okBorder],[paidCt,'✓ Paid',C.ok,C.okPale,C.okBorder],
                  [pendCt,'Pending',C.warn,C.warnPale,C.warnBorder],[avgRat!=='—'?`${avgRat}★`:'—','Avg ★',C.gold,C.goldPale,C.creamBorder]].map(([v,l,c,bg,bd])=>(
                  <div key={l} style={{textAlign:'center',padding:'6px 14px',borderRadius:10,background:bg,border:`1px solid ${bd}`}}>
                    <p style={{fontSize:16,fontWeight:800,color:c,fontFamily:"'Playfair Display',serif",lineHeight:1}}>{v}</p>
                    <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:c,opacity:0.7,marginTop:3}}>{l}</p>
                  </div>
                ))}
                <GoldBtn onClick={()=>{setEditStaff(null);setModalOpen(true);}} style={{padding:'10px 20px',fontSize:13}}>
                  <Plus size={14}/> Add Staff
                </GoldBtn>
              </div>
            </div>

            {/* Payroll row */}
            <div style={{display:'flex',gap:0,paddingTop:16,borderTop:`1px solid ${C.creamBorder}`,flexWrap:'wrap',alignItems:'center'}}>
              {[['Total Payroll',`₹${Rs(totalPayroll)}`,C.gold],
                ['Base Total',`₹${Rs(staffList.reduce((a,s)=>a+(s.salary?.base||0),0))}`,C.inkMid],
                ['Commissions',`₹${Rs(staffList.reduce((a,s)=>a+Math.round((s.totalRevenueGenerated||0)*(s.commissionRate||0)/100),0))}`,C.ok],
                ['Total Revenue',`₹${Rs(totalRev)}`,C.blue],
              ].map(([l,v,c],i)=>(
                <div key={l} style={{paddingRight:22,borderRight:i<3?`1px solid ${C.creamBorder}`:'none',marginRight:i<3?22:0,paddingBottom:4}}>
                  <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.inkFaint}}>{l}</p>
                  <p style={{fontSize:15,fontWeight:800,color:c,fontFamily:"'Playfair Display',serif",marginTop:3}}>{v}</p>
                </div>
              ))}
              <div style={{marginLeft:'auto',display:'flex',gap:6}}>
                <GhostBtn onClick={()=>setShowLeader(v=>!v)} style={{fontSize:11}}>
                  <Trophy size={12} style={{color:showLeader?C.gold:C.inkFaint}}/> Board
                </GhostBtn>
                <GhostBtn onClick={exportCSV} style={{fontSize:11}}>
                  <Download size={12}/> Export
                </GhostBtn>
                <button onClick={()=>fetchStaff(true)} style={{width:33,height:33,borderRadius:9,border:`1px solid ${C.creamBorder}`,background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <RefreshCw size={13} style={{color:C.inkFaint}}/>
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Leaderboard ── */}
        <AnimatePresence>
          {showLeader&&staffList.length>0&&(
            <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
              <Leaderboard staffList={staffList}/>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Filters ── */}
        <motion.div variants={fd} style={{background:C.white,border:`1px solid ${C.creamBorder}`,borderRadius:14,
          padding:'14px 18px',marginBottom:16,display:'flex',flexDirection:'column',gap:11}}>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
            {/* Search */}
            <div style={{position:'relative',flex:1,minWidth:200}}>
              <Search size={13} style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:C.inkFaint}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, phone, email…"
                onFocus={e=>{e.target.style.borderColor=C.gold;e.target.style.boxShadow=`0 0 0 3px ${C.goldPale}`;}}
                onBlur={e=>{e.target.style.borderColor=C.creamBorder;e.target.style.boxShadow='none';}}
                style={{width:'100%',paddingLeft:33,paddingRight:10,paddingTop:8,paddingBottom:8,
                  borderRadius:10,border:`1.5px solid ${C.creamBorder}`,background:C.cream,
                  color:C.ink,fontSize:12,outline:'none',boxSizing:'border-box',transition:'all 0.2s'}}/>
              {search&&<button onClick={()=>setSearch('')} style={{position:'absolute',right:9,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer'}}><X size={12} style={{color:C.inkFaint}}/></button>}
            </div>

            {/* Status */}
            <div style={{display:'flex',borderRadius:9,border:`1px solid ${C.creamBorder}`,overflow:'hidden'}}>
              {[['active','Active'],['inactive','Inactive'],['all','All']].map(([v,l])=>(
                <button key={v} onClick={()=>setFStatus(v)} style={{padding:'7px 14px',border:'none',cursor:'pointer',fontSize:11,fontWeight:700,transition:'all 0.15s',
                  background:fStatus===v?C.gold:'transparent',color:fStatus===v?C.white:C.inkFaint}}>{l}</button>
              ))}
            </div>

            {/* Pay filter */}
            <div style={{display:'flex',borderRadius:9,border:`1px solid ${C.creamBorder}`,overflow:'hidden'}}>
              {[['','All'],['paid','✓ Paid'],['pending','⚡ Pending']].map(([v,l])=>(
                <button key={v} onClick={()=>setFPay(v)} style={{padding:'7px 14px',border:'none',cursor:'pointer',fontSize:11,fontWeight:700,transition:'all 0.15s',
                  background:fPay===v?(v==='paid'?C.ok:v==='pending'?C.warn:C.gold):'transparent',
                  color:fPay===v?C.white:C.inkFaint}}>{l}</button>
              ))}
            </div>

            {/* Sort */}
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
              style={{padding:'7px 12px',borderRadius:9,border:`1px solid ${C.creamBorder}`,background:C.cream,color:C.inkMid,fontSize:11,fontWeight:700,outline:'none',cursor:'pointer'}}>
              {[['name','A–Z'],['revenue','Revenue'],['services','Services'],['salary','Salary']].map(([v,l])=>(
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Designation pills */}
          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
            <button onClick={()=>setFDesg('')} style={{padding:'4px 12px',borderRadius:100,fontSize:10,fontWeight:700,cursor:'pointer',
              border:`1px solid ${!fDesg?C.gold:C.creamBorder}`,background:!fDesg?C.goldPale:'transparent',
              color:!fDesg?C.gold:C.inkFaint,transition:'all 0.15s'}}>All Roles</button>
            {designations.map(d=>(
              <button key={d.key} onClick={()=>setFDesg(fDesg===d.key?'':d.key)} style={{padding:'4px 12px',borderRadius:100,fontSize:10,fontWeight:700,cursor:'pointer',
                border:`1px solid ${fDesg===d.key?C.gold:C.creamBorder}`,background:fDesg===d.key?C.goldPale:'transparent',
                color:fDesg===d.key?C.gold:C.inkFaint,transition:'all 0.15s'}}>{d.label}</button>
            ))}
          </div>
        </motion.div>

        {/* Count */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <p style={{fontSize:11,color:C.inkFaint}}>{displayed.length} staff member{displayed.length!==1?'s':''}</p>
          {fPay==='pending'&&pendCt>0&&(
            <p style={{fontSize:11,fontWeight:700,color:C.warn}}>⚡ {pendCt} salaries pending for {fmtMo(thisMo())}</p>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'60px 0',gap:12}}>
            <Loader2 size={20} style={{color:C.gold,animation:'spin 1s linear infinite'}}/>
            <p style={{fontSize:12,color:C.inkFaint}}>Loading team…</p>
          </div>
        ) : displayed.length===0 ? (
          <div style={{padding:'70px 32px',textAlign:'center',background:C.white,borderRadius:16,border:`1px solid ${C.creamBorder}`}}>
            <Users size={24} style={{color:C.inkGhost,margin:'0 auto 12px'}}/>
            <p style={{fontSize:15,fontWeight:700,color:C.inkMid,fontFamily:"'Playfair Display',serif",marginBottom:8}}>No staff found</p>
            <p style={{fontSize:12,color:C.inkFaint,marginBottom:20}}>{search||fDesg?'Try adjusting your filters':'Add your first team member'}</p>
            {!search&&!fDesg&&<GoldBtn onClick={()=>{setEditStaff(null);setModalOpen(true);}}><Plus size={13}/> Add First Staff Member</GoldBtn>}
          </div>
        ) : (
          <motion.div variants={stg(0.04)} initial="hidden" animate="show"
            style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))',gap:14}}>
            {displayed.map(s=>(
              <StaffCard key={s._id} staff={s}
                onView={setDrawer}
                onEdit={s=>{setEditStaff(s);setModalOpen(true);setDrawer(null);}}
                onDelete={handleDelete} onToggle={handleToggle}
                onSalary={setSalaryFor} onRoleChange={handleRole}/>
            ))}
          </motion.div>
        )}

        {!loading&&displayed.length>0&&(
          <p style={{textAlign:'center',fontSize:11,color:C.inkGhost,marginTop:16}}>
            Showing {displayed.length} of {staffList.length} staff members
          </p>
        )}
      </motion.div>

      <AnimatePresence>
        {drawer&&<StaffDrawer staff={drawer} onClose={()=>setDrawer(null)}
          onEdit={s=>{setDrawer(null);setEditStaff(s);setModalOpen(true);}}
          onSalary={s=>{setSalaryFor(s);setDrawer(null);}}/>}
      </AnimatePresence>

      <AnimatePresence>
        {salaryFor&&<SalaryModal staff={salaryFor} onClose={()=>setSalaryFor(null)} onRefresh={()=>fetchStaff(true)}/>}
      </AnimatePresence>

      <StaffModal isOpen={modalOpen} onClose={()=>{setModalOpen(false);setEditStaff(null);}}
        onSubmit={handleSubmit} staff={editStaff} isLoading={saving}/>

      <AnimatePresence>{toast&&<Toast msg={toast.msg} type={toast.type}/>}</AnimatePresence>

      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:${C.cream}}
        ::-webkit-scrollbar-thumb{background:${C.creamDark};border-radius:100px}
        input[type="month"]::-webkit-calendar-picker-indicator{cursor:pointer;opacity:0.5}
        input[type="range"]{-webkit-appearance:none;height:5px;border-radius:100px;background:${C.creamDark}}
        input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:${C.gold};cursor:pointer;box-shadow:0 0 0 3px ${C.goldPale}}
        option{background:${C.white};color:${C.ink}}
      `}</style>
    </>
  );
}