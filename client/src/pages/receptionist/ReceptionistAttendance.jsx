/**
 * ReceptionistAttendance.jsx — Upgraded
 * Features:
 *  • Today tab — mark/update attendance, update live floor status
 *  • Monthly tab — combined all-staff heatmap + per-staff breakdown
 *  • BroadcastChannel sync with other panels
 *  • 30s auto-refresh polling
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, AlertCircle, Clock, Calendar,
  ChevronLeft, ChevronRight, Loader2, RefreshCw,
  Check, Sun, Coffee, X, Edit2, Zap, Users,
  Activity, ArrowUpDown,
} from 'lucide-react';
import api from '@/services/api';
import { useDataStore, broadcastChange } from '@/context/DataStore';

const C = {
  bg:'#F7F3EC', surface:'#FFFFFF', surfaceTint:'#FDFAF5', surfaceMid:'#F5EFE2',
  gold:'#B8860B', goldFaint:'#FEF8E6', goldBorder:'rgba(184,134,11,0.18)', goldDeep:'#8B6914',
  ink:'#16100A', inkMid:'#5A4020', inkMuted:'#8C7A60', inkLight:'#C4B49C',
  border:'#EAE0CC', borderLight:'#F2EAD8',
  ok:'#166534', okBg:'#F0FDF4', okBorder:'#BBF7D0',
  warn:'#92400E', warnBg:'#FFFBEB', warnBorder:'#FDE68A',
  err:'#991B1B', errBg:'#FEF2F2', errBorder:'#FECACA',
  blue:'#1D4ED8', blueBg:'#EFF6FF', blueBorder:'#BFDBFE',
  purple:'#6D28D9', purpleBg:'#F5F3FF', purpleBorder:'#DDD6FE',
  gray:'#374151', grayBg:'#F9FAFB', grayBorder:'#E5E7EB',
};

const ST = {
  present:    { label:'Present',  dot:'#22C55E', bg:C.okBg,     border:C.okBorder,     text:C.ok,     icon:CheckCircle2 },
  late:       { label:'Late',     dot:'#F59E0B', bg:C.warnBg,   border:C.warnBorder,   text:C.warn,   icon:AlertCircle },
  absent:     { label:'Absent',   dot:'#EF4444', bg:C.errBg,    border:C.errBorder,    text:C.err,    icon:XCircle },
  'half-day': { label:'Half Day', dot:'#3B82F6', bg:C.blueBg,   border:C.blueBorder,   text:C.blue,   icon:Clock },
  leave:      { label:'Leave',    dot:'#7C3AED', bg:C.purpleBg, border:C.purpleBorder, text:C.purple, icon:Sun },
  holiday:    { label:'Holiday',  dot:'#9CA3AF', bg:C.grayBg,   border:C.grayBorder,   text:C.gray,   icon:Coffee },
};

const LIVE_CFG = {
  available:  { label:'Available', dot:'#22C55E', bg:'#ECFDF5', border:'#A7F3D0', text:'#166534' },
  busy:       { label:'Busy',      dot:'#F59E0B', bg:'#FFFBEB', border:'#FDE68A', text:'#92400E' },
  'off-duty': { label:'Off Duty',  dot:'#9CA3AF', bg:'#F9FAFB', border:'#E5E7EB', text:'#374151' },
  absent:     { label:'Absent',    dot:'#EF4444', bg:'#FEF2F2', border:'#FECACA', text:'#991B1B' },
};

const STATUSES = ['present','late','absent','half-day','leave','holiday'];
const LIVE_STATUSES = ['available','busy','off-duty'];
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const todayIST = () => new Date(Date.now() + 5.5*36e5).toISOString().split('T')[0];
const fmtTime  = d => d ? new Date(d).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}) : '—';

let BC = null;
try { BC = new BroadcastChannel('glamour_bookings_sync'); } catch {}

/* ─── Badge ─────────────────────────────────────────────────────────────── */
function Badge({ status }) {
  const cfg = ST[status] || ST.absent;
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 10px',borderRadius:999,fontSize:11,fontWeight:700,background:cfg.bg,color:cfg.text,border:`1px solid ${cfg.border}`}}>
      <span style={{width:5,height:5,borderRadius:'50%',background:cfg.dot}}/>{cfg.label}
    </span>
  );
}

/* ─── Mark Modal ─────────────────────────────────────────────────────────── */
function MarkModal({ staffMember, existing, onClose, onSave }) {
  const [status, setStatus] = useState(existing?.status || 'present');
  const [notes,  setNotes]  = useState(existing?.notes  || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/attendance/mark', { staffId:staffMember.staffId||staffMember._id, date:todayIST(), status, notes });
      broadcastChange();
      onSave(staffMember._id, status);
    } catch(e) { alert(e.response?.data?.message||'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}
      style={{position:'fixed',inset:0,background:'rgba(22,16,10,0.5)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <motion.div initial={{opacity:0,scale:0.94,y:10}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.94}}
        onClick={e=>e.stopPropagation()}
        style={{background:'#fff',borderRadius:22,padding:'28px',width:'100%',maxWidth:420,boxShadow:'0 28px 72px rgba(0,0,0,0.2)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22}}>
          <div>
            <p style={{fontSize:17,fontWeight:800,color:C.ink,fontFamily:"'Playfair Display',serif"}}>{existing?'Update':'Mark'} Attendance</p>
            <p style={{fontSize:13,color:C.inkMuted,marginTop:2}}>{staffMember.name}</p>
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:9,border:`1px solid ${C.border}`,background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={14}/></button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:18}}>
          {STATUSES.map(s=>{
            const cfg=ST[s];const Icon=cfg.icon;const sel=status===s;
            return(
              <button key={s} onClick={()=>setStatus(s)}
                style={{padding:'11px 8px',borderRadius:13,border:`2px solid ${sel?cfg.dot:C.border}`,background:sel?cfg.bg:'#fff',cursor:'pointer',textAlign:'center',transition:'all 0.15s'}}>
                <Icon size={16} style={{color:sel?cfg.text:C.inkLight,margin:'0 auto 5px',display:'block'}}/>
                <p style={{fontSize:11,fontWeight:700,color:sel?cfg.text:C.inkMuted}}>{cfg.label}</p>
              </button>
            );
          })}
        </div>
        <div style={{marginBottom:20}}>
          <label style={{fontSize:11,fontWeight:700,color:C.inkMuted,textTransform:'uppercase',letterSpacing:'0.08em',display:'block',marginBottom:6}}>Notes (optional)</label>
          <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="e.g. Medical leave, arrived late..."
            style={{width:'100%',padding:'10px 14px',borderRadius:10,border:`1px solid ${C.border}`,fontSize:13,color:C.ink,outline:'none',background:C.surfaceTint,boxSizing:'border-box'}}/>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={onClose} style={{flex:1,padding:'11px',borderRadius:999,border:`1px solid ${C.border}`,background:'transparent',color:C.inkMid,fontSize:13,fontWeight:700,cursor:'pointer'}}>Cancel</button>
          <button onClick={save} disabled={saving}
            style={{flex:2,padding:'11px',borderRadius:999,border:'none',background:'linear-gradient(135deg,#B8860B,#D4A017)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:7,opacity:saving?0.7:1}}>
            {saving?<Loader2 size={14} className="animate-spin"/>:<Check size={14}/>} Save Attendance
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Status Modal ───────────────────────────────────────────────────────── */
function StatusModal({ staffMember, onClose, onSave }) {
  const [status, setStatus] = useState(staffMember.liveStatus||'off-duty');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/staff/${staffMember._id}/floor-status`,{status});
      broadcastChange();
      onSave(staffMember._id, status);
    } catch(e) { alert(e.response?.data?.message||'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}
      style={{position:'fixed',inset:0,background:'rgba(22,16,10,0.5)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <motion.div initial={{opacity:0,scale:0.94,y:10}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.94}}
        onClick={e=>e.stopPropagation()}
        style={{background:'#fff',borderRadius:22,padding:'28px',width:'100%',maxWidth:360,boxShadow:'0 28px 72px rgba(0,0,0,0.2)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div>
            <p style={{fontSize:17,fontWeight:800,color:C.ink,fontFamily:"'Playfair Display',serif"}}>Update Floor Status</p>
            <p style={{fontSize:13,color:C.inkMuted,marginTop:2}}>{staffMember.name}</p>
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:9,border:`1px solid ${C.border}`,background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={14}/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:22}}>
          {LIVE_STATUSES.map(s=>{
            const cfg=LIVE_CFG[s];const sel=status===s;
            return(
              <button key={s} onClick={()=>setStatus(s)}
                style={{padding:'13px 16px',borderRadius:13,border:`2px solid ${sel?cfg.dot:C.border}`,background:sel?cfg.bg:'#fff',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:10,transition:'all 0.15s'}}>
                <span style={{width:10,height:10,borderRadius:'50%',background:sel?cfg.dot:C.inkLight,flexShrink:0}}/>
                <span style={{fontSize:13,fontWeight:700,color:sel?cfg.text:C.inkMuted}}>{cfg.label}</span>
                {sel&&<Check size={14} style={{color:cfg.text,marginLeft:'auto'}}/>}
              </button>
            );
          })}
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={onClose} style={{flex:1,padding:'11px',borderRadius:999,border:`1px solid ${C.border}`,background:'transparent',color:C.inkMid,fontSize:13,fontWeight:700,cursor:'pointer'}}>Cancel</button>
          <button onClick={save} disabled={saving}
            style={{flex:2,padding:'11px',borderRadius:999,border:'none',background:'linear-gradient(135deg,#B8860B,#D4A017)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:7,opacity:saving?0.7:1}}>
            {saving?<Loader2 size={14} className="animate-spin"/>:<Zap size={14}/>} Update Status
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Staff Card ─────────────────────────────────────────────────────────── */
function StaffCard({ s, todayRecord, onMark, onStatus }) {
  const [hov, setHov] = useState(false);
  const cfg    = todayRecord ? (ST[todayRecord.status]||ST.absent) : null;
  const liveCfg = LIVE_CFG[s.liveStatus]||LIVE_CFG['off-duty'];

  return (
    <motion.div layout onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{background:'#fff',borderRadius:16,padding:'16px',boxShadow:hov?'0 8px 28px rgba(0,0,0,0.09)':'0 1px 4px rgba(0,0,0,0.06)',transition:'all 0.2s',border:`1px solid ${hov?C.goldBorder:C.borderLight}`}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
        <div style={{width:42,height:42,borderRadius:13,background:`linear-gradient(135deg,${C.goldFaint},#fff)`,border:`1px solid ${C.goldBorder}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:800,color:C.gold,flexShrink:0}}>
          {s.name[0]}
        </div>
        <div style={{flex:1}}>
          <p style={{fontSize:14,fontWeight:700,color:C.ink}}>{s.name}</p>
          <p style={{fontSize:11,color:C.inkMuted,marginTop:1}}>{s.designation||'Staff'}</p>
        </div>
        <button onClick={()=>onStatus(s)}
          style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:999,background:liveCfg.bg,border:`1px solid ${liveCfg.border}`,cursor:'pointer',transition:'all 0.15s'}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:liveCfg.dot}}/>
          <span style={{fontSize:10,fontWeight:700,color:liveCfg.text}}>{liveCfg.label}</span>
          <ArrowUpDown size={9} style={{color:liveCfg.text,opacity:0.6}}/>
        </button>
      </div>
      {cfg?(
        <div style={{padding:'9px 12px',borderRadius:10,background:cfg.bg,border:`1px solid ${cfg.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:6}}>
          <Badge status={todayRecord.status}/>
          <div style={{display:'flex',gap:10,fontSize:11,color:cfg.text,fontFamily:'monospace',fontWeight:600}}>
            {todayRecord.sessions?.map((sess,i)=>(
              <span key={i}>{fmtTime(sess.clockIn)}{sess.clockOut?` → ${fmtTime(sess.clockOut)}`:' (active)'}</span>
            ))}
          </div>
          <button onClick={()=>onMark(s)}
            style={{display:'flex',alignItems:'center',gap:4,padding:'4px 11px',borderRadius:999,border:`1px solid ${cfg.border}`,background:'#fff',color:cfg.text,fontSize:11,fontWeight:700,cursor:'pointer'}}>
            <Edit2 size={10}/> Edit
          </button>
        </div>
      ):(
        <div style={{padding:'9px 12px',borderRadius:10,background:C.surfaceMid,border:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:C.inkLight}}/>
            <span style={{fontSize:12,color:C.inkMuted,fontWeight:500}}>Not marked today</span>
          </div>
          <button onClick={()=>onMark(s)}
            style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:999,border:'none',background:'linear-gradient(135deg,#B8860B,#D4A017)',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
            <Check size={10}/> Mark
          </button>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Monthly Heatmap ────────────────────────────────────────────────────── */
function MonthlyHeatmap({ year, month, allRecords, onDayClick, selectedDay }) {
  const daysInMonth = new Date(year, month, 0).getDate();
  let startDow = new Date(year, month-1, 1).getDay();
  startDow = startDow===0?6:startDow-1;

  const dayMap = useMemo(()=>{
    const m={};
    allRecords.forEach(r=>{
      const key=new Date(r.date).toISOString().split('T')[0];
      if(!m[key])m[key]={present:0,late:0,absent:0,'half-day':0,leave:0,holiday:0,total:0};
      m[key][r.status]=(m[key][r.status]||0)+1;
      m[key].total++;
    });
    return m;
  },[allRecords]);

  const today=todayIST();
  const cells=[];
  for(let i=0;i<startDow;i++)cells.push(null);
  for(let d=1;d<=daysInMonth;d++){
    const key=`${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    cells.push({d,key,data:dayMap[key]||null});
  }

  const heatColor=(data)=>{
    if(!data||data.total===0)return{bg:'#F5F0E8',text:C.inkLight,border:C.borderLight};
    const r=(data.present+data.late)/Math.max(data.total,1);
    if(r>=0.85)return{bg:'#D1FAE5',text:'#065F46',border:'#6EE7B7'};
    if(r>=0.65)return{bg:'#FEF9C3',text:'#713F12',border:'#FDE047'};
    if(r>=0.4) return{bg:'#FEE2E2',text:'#7F1D1D',border:'#FCA5A5'};
    return{bg:'#EDE9FE',text:'#4C1D95',border:'#C4B5FD'};
  };

  return(
    <div style={{background:'#fff',borderRadius:20,border:`1px solid ${C.border}`,overflow:'hidden'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',background:`linear-gradient(135deg,${C.goldFaint},#FFF5D6)`,borderBottom:`1px solid ${C.border}`}}>
        {DAYS.map(d=><div key={d} style={{padding:'10px 4px',textAlign:'center',fontSize:10,fontWeight:800,color:C.gold,textTransform:'uppercase',letterSpacing:'0.1em'}}>{d}</div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,padding:'10px',background:'#FAFAF5'}}>
        {cells.map((cell,i)=>{
          if(!cell)return<div key={i} style={{aspectRatio:'1'}}/>;
          const{d,key,data}=cell;
          const isToday=key===today,isSel=key===selectedDay;
          const hc=heatColor(data);
          const pc=data?data.present+data.late:0;
          return(
            <motion.button key={key} whileHover={{scale:1.06}} whileTap={{scale:0.96}} onClick={()=>onDayClick(key)}
              style={{aspectRatio:'1',borderRadius:11,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                background:isSel?`linear-gradient(135deg,${C.gold},#D4A017)`:data?hc.bg:isToday?C.goldFaint:'#fff',
                border:`2px solid ${isSel?C.goldDeep:isToday?C.gold:data?hc.border:C.borderLight}`,
                cursor:'pointer',transition:'all 0.15s',minHeight:44,
                boxShadow:isSel?`0 4px 14px ${C.gold}40`:'none'}}>
              <span style={{fontSize:13,fontWeight:isSel||isToday?800:600,color:isSel?'#fff':data?hc.text:isToday?C.gold:C.inkLight}}>{d}</span>
              {data&&!isSel&&<span style={{fontSize:9,fontWeight:700,color:hc.text,marginTop:1}}>{pc}/{data.total}</span>}
            </motion.button>
          );
        })}
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:10,padding:'10px 14px',borderTop:`1px solid ${C.border}`,background:C.surfaceTint}}>
        {[
          {label:'≥85% present',bg:'#D1FAE5',border:'#6EE7B7',text:'#065F46'},
          {label:'65–84%',bg:'#FEF9C3',border:'#FDE047',text:'#713F12'},
          {label:'40–64%',bg:'#FEE2E2',border:'#FCA5A5',text:'#7F1D1D'},
          {label:'<40%',bg:'#EDE9FE',border:'#C4B5FD',text:'#4C1D95'},
          {label:'No data',bg:'#F5F0E8',border:C.borderLight,text:C.inkLight},
        ].map(l=>(
          <div key={l.label} style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{width:12,height:12,borderRadius:4,background:l.bg,border:`1.5px solid ${l.border}`,display:'inline-block'}}/>
            <span style={{fontSize:10,color:l.text,fontWeight:600}}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Day Detail Panel ───────────────────────────────────────────────────── */
function DayDetail({ dateKey, allRecords, onClose }) {
  const dayRecords = allRecords.filter(r=>new Date(r.date).toISOString().split('T')[0]===dateKey);
  const dateLabel  = new Date(dateKey+'T12:00:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  return(
    <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}}
      style={{background:'#fff',borderRadius:20,border:`1px solid ${C.border}`,overflow:'hidden',position:'sticky',top:16,maxHeight:'80vh',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',background:C.surfaceTint,flexShrink:0}}>
        <div>
          <p style={{fontSize:14,fontWeight:800,color:C.ink,fontFamily:"'Playfair Display',serif"}}>{dateLabel}</p>
          <p style={{fontSize:11,color:C.inkMuted,marginTop:2}}>{dayRecords.length} staff records</p>
        </div>
        <button onClick={onClose} style={{width:28,height:28,borderRadius:8,border:`1px solid ${C.border}`,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={12} style={{color:C.inkMuted}}/></button>
      </div>
      <div style={{overflowY:'auto',flex:1,padding:'12px'}}>
        {dayRecords.length===0?(
          <p style={{textAlign:'center',color:C.inkMuted,padding:'30px 0',fontSize:13}}>No records for this day</p>
        ):(
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {dayRecords.map(r=>{
              const cfg=ST[r.status]||ST.absent;
              return(
                <div key={r._id} style={{padding:'10px 12px',borderRadius:11,background:cfg.bg,border:`1px solid ${cfg.border}`,display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:30,height:30,borderRadius:9,background:`linear-gradient(135deg,${C.gold},#D4A017)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#fff',flexShrink:0}}>
                    {(r.staff?.name||'?')[0].toUpperCase()}
                  </div>
                  <div style={{flex:1}}>
                    <p style={{fontSize:12,fontWeight:700,color:C.ink}}>{r.staff?.name}</p>
                    {r.sessions?.[0]?.clockIn&&(
                      <p style={{fontSize:10,color:cfg.text,fontFamily:'monospace',fontWeight:600,marginTop:1}}>
                        {fmtTime(r.sessions[0].clockIn)}{r.sessions.slice(-1)[0]?.clockOut?` → ${fmtTime(r.sessions.slice(-1)[0].clockOut)}`:' (active)'}
                      </p>
                    )}
                  </div>
                  <Badge status={r.status}/>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main
═══════════════════════════════════════════════════════════════════════════ */
export default function ReceptionistAttendance() {
  const { staff, refreshStaff } = useDataStore();
  const [tab, setTab]           = useState('today');
  const [todayRecords, setTodayRecords] = useState([]);
  const [loadingToday, setLoadingToday] = useState(true);

  const now = new Date(Date.now()+5.5*36e5);
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()+1);
  const [monthRecords, setMonthRecords] = useState([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [selDay, setSelDay] = useState(null);

  const [marking,  setMarking]  = useState(null);
  const [statusOf, setStatusOf] = useState(null);
  const [toast,    setToast]    = useState(null);
  const [syncing,  setSyncing]  = useState(false);
  const pollRef = useRef(null);

  const showToast=(msg,ok=true)=>{setToast({msg,ok});setTimeout(()=>setToast(null),3500);};

  const loadToday = useCallback(async(silent=false)=>{
    if(!silent)setLoadingToday(true); else setSyncing(true);
    try{const{data}=await api.get('/attendance/today');setTodayRecords(data.attendance||[]);}
    catch{setTodayRecords([]);}
    finally{setLoadingToday(false);setSyncing(false);}
  },[]);

  const loadMonth = useCallback(async()=>{
    setLoadingMonth(true);
    try{const{data}=await api.get('/attendance/report',{params:{year,month}});setMonthRecords(data.records||[]);}
    catch{setMonthRecords([]);}
    finally{setLoadingMonth(false);}
  },[year,month]);

  useEffect(()=>{loadToday();},[loadToday]);
  useEffect(()=>{if(tab==='monthly')loadMonth();},[tab,loadMonth]);

  useEffect(()=>{
    pollRef.current=setInterval(()=>{
      loadToday(true);
      if(tab==='monthly')loadMonth();
      refreshStaff?.();
    },30000);
    return()=>clearInterval(pollRef.current);
  },[tab,loadToday,loadMonth,refreshStaff]);

  useEffect(()=>{
    if(!BC)return;
    let timer=null;
    const handler=(e)=>{
      if(e.data?.type!=='refresh')return;
      clearTimeout(timer);
      timer=setTimeout(()=>{loadToday(true);if(tab==='monthly')loadMonth();refreshStaff?.();},600);
    };
    BC.addEventListener('message',handler);
    return()=>{BC.removeEventListener('message',handler);clearTimeout(timer);};
  },[tab,loadToday,loadMonth,refreshStaff]);

  const getTodayRecord=(s)=>{
    const sId=String(s.staffId||s._id);
    return todayRecords.find(r=>String(r.staff?._id||r.staff||r.staffId)===sId)||null;
  };

  const summary={
    present: todayRecords.filter(r=>r.status==='present').length,
    late:    todayRecords.filter(r=>r.status==='late').length,
    absent:  todayRecords.filter(r=>r.status==='absent').length,
    leave:   todayRecords.filter(r=>['leave','holiday','half-day'].includes(r.status)).length,
    total:   (staff||[]).length,
    unmarked:(staff||[]).filter(s=>!getTodayRecord(s)).length,
  };

  const monthStats=useMemo(()=>({
    present: monthRecords.filter(r=>r.status==='present').length,
    late:    monthRecords.filter(r=>r.status==='late').length,
    absent:  monthRecords.filter(r=>r.status==='absent').length,
    halfDay: monthRecords.filter(r=>r.status==='half-day').length,
    leave:   monthRecords.filter(r=>['leave','holiday'].includes(r.status)).length,
    total:   monthRecords.length,
  }),[monthRecords]);

  const staffBreakdown=useMemo(()=>{
    const map={};
    monthRecords.forEach(r=>{
      const id=r.staff?._id||r.staff;
      if(!map[id])map[id]={name:r.staff?.name||'Unknown',present:0,late:0,absent:0,halfDay:0,leave:0};
      if(r.status==='present')map[id].present++;
      else if(r.status==='late')map[id].late++;
      else if(r.status==='absent')map[id].absent++;
      else if(r.status==='half-day')map[id].halfDay++;
      else if(['leave','holiday'].includes(r.status))map[id].leave++;
    });
    return Object.values(map).sort((a,b)=>(b.present+b.late)-(a.present+a.late));
  },[monthRecords]);

  const prevMonth=()=>{if(month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1);};
  const nextMonth=()=>{if(month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1);};

  return(
    <div style={{fontFamily:"'DM Sans',sans-serif",minHeight:'100vh',background:C.bg,paddingBottom:40}}>

      {/* Toast */}
      <AnimatePresence>
        {toast&&(
          <motion.div initial={{opacity:0,y:-12,x:'-50%'}} animate={{opacity:1,y:0,x:'-50%'}} exit={{opacity:0,y:-12,x:'-50%'}}
            style={{position:'fixed',top:70,left:'50%',zIndex:999,padding:'10px 20px',borderRadius:14,background:toast.ok?C.okBg:C.errBg,color:toast.ok?C.ok:C.err,fontWeight:700,fontSize:13,boxShadow:'0 4px 20px rgba(0,0,0,0.12)',border:`1px solid ${toast.ok?C.okBorder:C.errBorder}`,display:'flex',alignItems:'center',gap:7,whiteSpace:'nowrap'}}>
            {toast.ok?<Check size={13}/>:<AlertCircle size={13}/>} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{paddingTop:28,paddingBottom:18}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <h1 style={{fontSize:26,fontWeight:800,color:C.ink,fontFamily:"'Playfair Display',serif",margin:0}}>Attendance</h1>
              {syncing&&<span style={{width:8,height:8,borderRadius:'50%',background:C.gold,display:'inline-block'}} className="animate-pulse"/>}
            </div>
            <p style={{fontSize:13,color:C.inkMuted}}>
              {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
            </p>
          </div>
          <button onClick={()=>{loadToday(true);if(tab==='monthly')loadMonth();refreshStaff?.();}}
            style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:999,border:`1px solid ${C.border}`,background:'#fff',color:C.inkMid,fontSize:12,fontWeight:600,cursor:'pointer'}}>
            <RefreshCw size={12} className={syncing?'animate-spin':''}/> Refresh
          </button>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:4,marginTop:18,background:C.surfaceMid,borderRadius:13,padding:4,width:'fit-content'}}>
          {[['today',<Activity size={13}/>,'Today'],['monthly',<Calendar size={13}/>,'Monthly Overview']].map(([v,icon,label])=>(
            <button key={v} onClick={()=>setTab(v)}
              style={{display:'flex',alignItems:'center',gap:6,padding:'8px 18px',borderRadius:10,border:'none',background:tab===v?'#fff':'transparent',color:tab===v?C.ink:C.inkMuted,fontSize:13,fontWeight:tab===v?700:500,cursor:'pointer',boxShadow:tab===v?'0 1px 4px rgba(0,0,0,0.08)':'none',transition:'all 0.2s'}}>
              {icon}{label}
            </button>
          ))}
        </div>
      </div>

      {/* TODAY TAB */}
      <AnimatePresence mode="wait">
      {tab==='today'&&(
        <motion.div key="today" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
          {/* Summary */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:20}}>
            {[
              {label:'Total Staff', val:summary.total,   bg:'#fff',       border:C.border,       text:C.inkMid},
              {label:'Present',     val:summary.present, bg:C.okBg,       border:C.okBorder,     text:C.ok},
              {label:'Late',        val:summary.late,    bg:C.warnBg,     border:C.warnBorder,   text:C.warn},
              {label:'Absent',      val:summary.absent,  bg:C.errBg,      border:C.errBorder,    text:C.err},
              {label:'On Leave',    val:summary.leave,   bg:C.purpleBg,   border:C.purpleBorder, text:C.purple},
            ].map(({label,val,bg,border,text})=>(
              <div key={label} style={{background:bg,border:`1px solid ${border}`,borderRadius:14,padding:'14px 16px',textAlign:'center'}}>
                <p style={{fontSize:26,fontWeight:800,color:text,fontFamily:"'Playfair Display',serif",lineHeight:1}}>{val}</p>
                <p style={{fontSize:10,color:text,opacity:0.75,marginTop:4,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>{label}</p>
              </div>
            ))}
          </div>

          {/* Warning */}
          <AnimatePresence>
            {summary.unmarked>0&&(
              <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                style={{marginBottom:16,padding:'12px 18px',background:C.warnBg,border:`1px solid ${C.warnBorder}`,borderRadius:13,display:'flex',alignItems:'center',gap:8}}>
                <AlertCircle size={15} style={{color:C.warn,flexShrink:0}}/>
                <p style={{fontSize:13,fontWeight:600,color:C.warn}}>{summary.unmarked} staff not yet marked for today</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Grid */}
          {loadingToday?(
            <div style={{textAlign:'center',padding:'60px 0'}}><Loader2 size={26} className="animate-spin" style={{color:C.gold,margin:'0 auto'}}/></div>
          ):(staff||[]).length===0?(
            <div style={{textAlign:'center',padding:'60px 0',color:C.inkMuted}}><Users size={28} style={{margin:'0 auto 12px',opacity:0.3}}/><p>No staff found</p></div>
          ):(
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:12}}>
              {(staff||[]).map(s=>(
                <StaffCard key={s._id} s={s} todayRecord={getTodayRecord(s)} onMark={setMarking} onStatus={setStatusOf}/>
              ))}
            </div>
          )}

          {/* Live floor strip */}
          {!loadingToday&&(staff||[]).length>0&&(
            <div style={{marginTop:22,background:'#fff',borderRadius:16,border:`1px solid ${C.border}`,overflow:'hidden'}}>
              <div style={{padding:'10px 18px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8,background:C.surfaceTint}}>
                <span style={{width:8,height:8,borderRadius:'50%',background:'#22C55E',display:'inline-block'}} className="animate-pulse"/>
                <p style={{fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.1em',color:C.inkMid}}>Live Floor Status · click to update</p>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:8,padding:'12px 18px'}}>
                {(staff||[]).map(s=>{
                  const cfg=LIVE_CFG[s.liveStatus]||LIVE_CFG['off-duty'];
                  return(
                    <button key={s._id} onClick={()=>setStatusOf(s)}
                      style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:10,background:cfg.bg,border:`1px solid ${cfg.border}`,cursor:'pointer',transition:'all 0.15s'}}>
                      <span style={{width:6,height:6,borderRadius:'50%',background:cfg.dot}}/>
                      <span style={{fontSize:12,fontWeight:700,color:C.ink}}>{s.name}</span>
                      <span style={{fontSize:10,color:cfg.text}}>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* MONTHLY TAB */}
      {tab==='monthly'&&(
        <motion.div key="monthly" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
          {/* Nav */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap',gap:10}}>
            <div style={{display:'flex',alignItems:'center',gap:4,background:'#fff',border:`1px solid ${C.border}`,borderRadius:12,overflow:'hidden'}}>
              <button onClick={prevMonth} style={{padding:'9px 13px',background:'none',border:'none',cursor:'pointer'}}><ChevronLeft size={15} style={{color:C.inkMid}}/></button>
              <span style={{fontSize:14,fontWeight:700,color:C.ink,padding:'0 4px',whiteSpace:'nowrap'}}>{MONTHS[month-1]} {year}</span>
              <button onClick={nextMonth} style={{padding:'9px 13px',background:'none',border:'none',cursor:'pointer'}}><ChevronRight size={15} style={{color:C.inkMid}}/></button>
            </div>
            <button onClick={loadMonth} disabled={loadingMonth}
              style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:999,border:`1px solid ${C.border}`,background:'#fff',color:C.inkMid,fontSize:12,fontWeight:600,cursor:'pointer'}}>
              <RefreshCw size={12} className={loadingMonth?'animate-spin':''}/> Refresh
            </button>
          </div>

          {/* Month stats */}
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:20}}>
            {[
              {label:'Present', val:monthStats.present, cfg:ST.present},
              {label:'Late',    val:monthStats.late,    cfg:ST.late},
              {label:'Absent',  val:monthStats.absent,  cfg:ST.absent},
              {label:'Half Day',val:monthStats.halfDay, cfg:ST['half-day']},
              {label:'Leave',   val:monthStats.leave,   cfg:ST.leave},
              {label:'Total',   val:monthStats.total,   cfg:{bg:'#fff',border:C.border,text:C.inkMid,dot:C.inkLight}},
            ].map(({label,val,cfg})=>(
              <div key={label} style={{padding:'10px 16px',borderRadius:12,background:cfg.bg,border:`1px solid ${cfg.border}`,display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:8,height:8,borderRadius:'50%',background:cfg.dot}}/>
                <span style={{fontSize:20,fontWeight:800,color:cfg.text,fontFamily:"'Playfair Display',serif",lineHeight:1}}>{val}</span>
                <span style={{fontSize:11,color:cfg.text,opacity:0.75,fontWeight:600}}>{label}</span>
              </div>
            ))}
          </div>

          {loadingMonth?(
            <div style={{textAlign:'center',padding:'60px 0'}}><Loader2 size={26} className="animate-spin" style={{color:C.gold,margin:'0 auto'}}/></div>
          ):(
            <div style={{display:'grid',gridTemplateColumns:selDay?'1fr 340px':'1fr',gap:16,alignItems:'start'}}>
              <div>
                <p style={{fontSize:12,fontWeight:700,color:C.inkMuted,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>All Staff · Attendance Heatmap · click a day to inspect</p>
                <MonthlyHeatmap year={year} month={month} allRecords={monthRecords}
                  onDayClick={(key)=>setSelDay(key===selDay?null:key)} selectedDay={selDay}/>

                {staffBreakdown.length>0&&(
                  <div style={{marginTop:22}}>
                    <p style={{fontSize:12,fontWeight:700,color:C.inkMuted,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>Staff Breakdown · {MONTHS[month-1]} {year}</p>
                    <div style={{display:'flex',flexDirection:'column',gap:6}}>
                      {staffBreakdown.map((s,i)=>{
                        const total=s.present+s.late+s.absent+s.halfDay+s.leave;
                        const pct=total>0?Math.round(((s.present+s.late)/total)*100):0;
                        const color=pct>=80?C.ok:pct>=60?C.warn:C.err;
                        return(
                          <div key={i} style={{background:'#fff',borderRadius:13,padding:'12px 16px',border:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:12}}>
                            <div style={{width:36,height:36,borderRadius:11,background:`linear-gradient(135deg,${C.goldFaint},#fff)`,border:`1px solid ${C.goldBorder}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:C.gold,flexShrink:0}}>
                              {s.name[0]}
                            </div>
                            <div style={{flex:1}}>
                              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                                <p style={{fontSize:13,fontWeight:700,color:C.ink}}>{s.name}</p>
                                <p style={{fontSize:15,fontWeight:800,color,fontFamily:"'Playfair Display',serif"}}>{pct}%</p>
                              </div>
                              <div style={{height:4,borderRadius:2,background:C.borderLight,overflow:'hidden',marginBottom:5}}>
                                <div style={{height:'100%',width:`${pct}%`,borderRadius:2,background:`linear-gradient(90deg,${color},${pct>=80?'#34D399':pct>=60?'#FCD34D':'#FCA5A5'})`,transition:'width 0.6s'}}/>
                              </div>
                              <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                                {[
                                  {label:`${s.present} Present`,cfg:ST.present},
                                  {label:`${s.late} Late`,cfg:ST.late},
                                  {label:`${s.absent} Absent`,cfg:ST.absent},
                                  ...(s.halfDay>0?[{label:`${s.halfDay} Half`,cfg:ST['half-day']}]:[]),
                                  ...(s.leave>0?[{label:`${s.leave} Leave`,cfg:ST.leave}]:[]),
                                ].map(({label,cfg})=>(
                                  <span key={label} style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:100,background:cfg.bg,border:`1px solid ${cfg.border}`,color:cfg.text}}>{label}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {staffBreakdown.length===0&&monthRecords.length===0&&(
                  <div style={{textAlign:'center',padding:'50px 0',color:C.inkMuted}}>
                    <Calendar size={28} style={{margin:'0 auto 12px',opacity:0.3}}/>
                    <p>No attendance records for {MONTHS[month-1]} {year}</p>
                  </div>
                )}
              </div>

              <AnimatePresence>
                {selDay&&<DayDetail dateKey={selDay} allRecords={monthRecords} onClose={()=>setSelDay(null)}/>}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {marking&&<MarkModal staffMember={marking} existing={getTodayRecord(marking)} onClose={()=>setMarking(null)} onSave={(id,st)=>{showToast(`Marked as ${st}`);setMarking(null);loadToday(true);}}/>}
        {statusOf&&<StatusModal staffMember={statusOf} onClose={()=>setStatusOf(null)} onSave={(id,st)=>{showToast(`Status → ${LIVE_CFG[st]?.label||st}`);setStatusOf(null);refreshStaff?.();loadToday(true);}}/>}
      </AnimatePresence>

      <style>{`.animate-spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.animate-pulse{animation:pulse 2s infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}