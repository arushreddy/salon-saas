import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDataStore } from "@/context/DataStore";
import api from "@/services/api";
import {
  Calendar, Users, Package, ChevronRight, Plus, Wallet,
  AlertTriangle, UserCheck, CheckCircle, Clock, ArrowRight,
  TrendingUp, Zap, Coffee,
} from "lucide-react";

const C = {
  cream:'#FDF8F0', creamMid:'#F7EFD8', creamDark:'#EDE0C0', creamBorder:'#DFD0A8',
  goldMid:'#B8860B', goldBright:'#D4A017', goldPale:'#FFF8E7',
  ink:'#16100A', inkMid:'#5A4020', inkFaint:'#B09060', inkGhost:'#D4B890',
  ok:'#285C3A', okPale:'#EAF4EE', risk:'#7A2020', riskPale:'#FEF2F2',
  warn:'#6B4800', warnPale:'#FEF3DC', blue:'#1D4ED8', bluePale:'#EFF6FF',
  orange:'#C2410C', orangePale:'#FFF7ED',
};
const card = { background:'#fff', border:`1px solid ${C.creamBorder}`, borderRadius:16, boxShadow:'0 1px 3px rgba(180,130,0,0.06)' };

const IST = 5.5 * 3600000;
// Timezone-safe today string
const todayIST = () => new Date(Date.now() + IST).toISOString().split('T')[0];
const bookingDate = (b) => b.date ? new Date(new Date(b.date).getTime()).toISOString().split('T')[0] : '';
const CASH_KEY = (d) => `salon_cash_txn_${d}`;

const STATUS_META = {
  confirmed:     { label:'Confirmed',   bg:'#EFF6FF', color:'#1D4ED8', dot:'#3B82F6' },
  'in-progress': { label:'In Progress', bg:'#FEF3DC', color:'#6B4800', dot:'#F59E0B' },
  completed:     { label:'Done',        bg:'#EAF4EE', color:'#285C3A', dot:'#22C55E' },
  cancelled:     { label:'Cancelled',   bg:'#FEF2F2', color:'#7A2020', dot:'#EF4444' },
  pending:       { label:'Pending',     bg:'#FFF8E7', color:'#B8860B', dot:'#D4A017' },
  'no-show':     { label:'No Show',     bg:'#F5F5F3', color:'#888',   dot:'#aaa'    },
};

// ── Staff floor status meta (matches live-status values from backend) ─────────
const FLOOR_META = {
  'available':        { label:'Available',   dot:'#22C55E', color:C.ok,      bg:C.okPale      },
  'busy':             { label:'Busy',        dot:'#F59E0B', color:C.warn,    bg:C.warnPale    },
  'temp-unavailable': { label:'Stepped Out', dot:'#F97316', color:C.orange,  bg:C.orangePale  },
  'off-duty':         { label:'Off Duty',    dot:'#D1D5DB', color:C.inkFaint,bg:C.creamMid    },
  'absent':           { label:'Absent',      dot:'#EF4444', color:C.risk,    bg:C.riskPale    },
};
const floorMeta = (k) => FLOOR_META[k] || FLOOR_META['off-duty'];

function Row({ label, value, valueStyle }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
      <span style={{ fontSize:12, color:C.inkFaint }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:600, color:C.ink, ...valueStyle }}>{value}</span>
    </div>
  );
}

export default function ReceptionistDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { bookings, staff, inventory: dsInventory } = useDataStore();
  // bookings: today only. staff: flat live-status objects — { _id, name, liveStatus, isAvailable, designation, ... }

  const [time, setTime] = useState(new Date());
  const [expandedId, setExpandedId] = useState(null);
  const [cashData, setCashData] = useState({ cash:0, online:0, counter:0 });
  const [lowStock, setLowStock] = useState(0);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Revenue from today's bookings
  useEffect(() => {
    const today = todayIST();
    const todayB = (bookings||[]).filter(b => bookingDate(b)===today);
    const cash = todayB.filter(b=>b.paymentMethod==='cash'&&b.paymentStatus==='paid')
      .reduce((s,b)=>s+(b.finalAmount||b.totalAmount||0),0);
    const online = todayB.filter(b=>['upi','card','online'].includes(b.paymentMethod)&&b.paymentStatus==='paid')
      .reduce((s,b)=>s+(b.finalAmount||b.totalAmount||0),0);
    // Cash counter deductions
    const stored = JSON.parse(localStorage.getItem(CASH_KEY(today))||'[]');
    const deducted = stored.filter(t=>['withdrawal','expense'].includes(t.type)).reduce((s,t)=>s+t.amount,0);
    setCashData({ cash, online, counter: Math.max(0, cash - deducted) });
  }, [bookings]);

  // Low stock count — driven by DataStore so it updates live when inventory changes
  useEffect(() => {
    const items = dsInventory || [];
    setLowStock(items.filter(i=>(i.quantity||0)<=(i.lowStockThreshold||5)).length);
  }, [dsInventory]);

  const today = todayIST();
  const todayB = (bookings||[]).filter(b => bookingDate(b)===today);

  const stats = {
    total:      todayB.length,
    completed:  todayB.filter(b=>b.status==='completed').length,
    inProgress: todayB.filter(b=>b.status==='in-progress').length,
    pending:    todayB.filter(b=>b.paymentStatus!=='paid'&&b.status!=='cancelled').length,
    revenue:    todayB.filter(b=>b.paymentStatus==='paid')
                  .reduce((s,b)=>s+(b.finalAmount||b.totalAmount||0),0),
  };

  // Upcoming bookings sorted by time
  const upcoming = todayB
    .filter(b=>['confirmed','pending','in-progress'].includes(b.status))
    .sort((a,b)=>(a.timeSlot?.start||'').localeCompare(b.timeSlot?.start||''));

  // Next appointment (first confirmed/pending in the future)
  const nowHM = `${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`;
  const nextAppt = upcoming.find(b => (b.timeSlot?.start||'99:99') >= nowHM && b.status!=='in-progress');
  const inProgress = todayB.find(b=>b.status==='in-progress');

  // Staff floor counts — FIX: use liveStatus, not s.isAvailable/s.isBusy
  const safeStaff = staff||[];
  const floorCounts = { available:0, busy:0, 'temp-unavailable':0, 'off-duty':0 };
  safeStaff.forEach(s => {
    const k = s.liveStatus || (s.isAvailable ? 'available' : 'off-duty');
    if (k in floorCounts) floorCounts[k]++;
  });

  const greet = () => { const h=time.getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening'; };
  const fmtDate = d => d.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'});
  const fmtTime = d => d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true});

  const fade = { hidden:{opacity:0,y:12}, show:{opacity:1,y:0} };
  const stagger = { show:{ transition:{ staggerChildren:0.06 } } };

  return (
    <div style={{ maxWidth:1160, margin:'0 auto' }}>

      {/* ── Header ── */}
      <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:C.inkFaint, letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:4 }}>
              {fmtDate(time)} · {fmtTime(time)}
            </div>
            <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:26, fontWeight:700, color:C.ink, margin:0 }}>
              {greet()}, {user?.name?.split(' ')[0]} ✦
            </h1>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            {lowStock > 0 && (
              <button onClick={()=>navigate('/staff/inventory')}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:100, border:'1px solid #FDBA74', background:C.warnPale, color:C.warn, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                <AlertTriangle size={13}/> {lowStock} Low Stock
              </button>
            )}
            <button onClick={()=>navigate('/staff/appointments')}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:100, background:C.ink, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', border:'none' }}>
              <Plus size={15}/> New Walk-in
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── KPI Strip ── */}
      <motion.div variants={stagger} initial="hidden" animate="show"
        style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { label:'Today',       value:stats.total,      icon:Calendar,     color:C.blue,  bg:C.bluePale  },
          { label:'Completed',   value:stats.completed,  icon:CheckCircle,  color:C.ok,    bg:C.okPale    },
          { label:'In Progress', value:stats.inProgress, icon:Clock,        color:C.warn,  bg:C.warnPale  },
          { label:'Unpaid',      value:stats.pending,    icon:AlertTriangle,color:C.risk,  bg:C.riskPale  },
        ].map(({ label, value, icon:Icon, color, bg }) => (
          <motion.div key={label} variants={fade} style={{ ...card, padding:'18px 20px', display:'flex', alignItems:'center', gap:14 }}
            whileHover={{ y:-2, boxShadow:'0 4px 16px rgba(180,130,0,0.10)' }}>
            <div style={{ width:38, height:38, borderRadius:12, background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon size={17} color={color}/>
            </div>
            <div>
              <div style={{ fontSize:28, fontWeight:300, color:C.ink, lineHeight:1 }}>{value}</div>
              <div style={{ fontSize:10, fontWeight:700, color:C.inkFaint, textTransform:'uppercase', letterSpacing:'0.05em', marginTop:3 }}>{label}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Revenue Row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>

        {/* Revenue breakdown */}
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.14}}
          style={{ ...card, padding:'20px 24px' }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.inkFaint, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>Today's Revenue</div>
          <div style={{ fontSize:36, fontWeight:300, color:C.ink, lineHeight:1, marginBottom:14 }}>
            ₹{stats.revenue.toLocaleString('en-IN')}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div style={{ borderRadius:10, background:C.creamMid, padding:'10px 12px' }}>
              <div style={{ fontSize:10, color:C.inkFaint, fontWeight:600, textTransform:'uppercase', marginBottom:3 }}>💵 Cash</div>
              <div style={{ fontSize:16, fontWeight:700, color:C.ink }}>₹{cashData.cash.toLocaleString('en-IN')}</div>
            </div>
            <div style={{ borderRadius:10, background:C.bluePale, padding:'10px 12px' }}>
              <div style={{ fontSize:10, color:C.blue, fontWeight:600, textTransform:'uppercase', marginBottom:3, opacity:0.8 }}>📱 Online</div>
              <div style={{ fontSize:16, fontWeight:700, color:C.blue }}>₹{cashData.online.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </motion.div>

        {/* Cash in counter — click to manage */}
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.17}}
          onClick={()=>navigate('/staff/cash')}
          style={{ ...card, cursor:'pointer', background:'linear-gradient(135deg,#FFF8E7,#FFF3CC)', border:`1px solid ${C.creamDark}`, padding:'20px 24px', position:'relative', overflow:'hidden' }}
          whileHover={{ y:-2, boxShadow:'0 8px 24px rgba(180,130,0,0.14)' }}>
          <div style={{ position:'absolute', top:-20, right:-20, width:100, height:100, borderRadius:'50%', background:'rgba(212,160,23,0.07)' }}/>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.warn, textTransform:'uppercase', letterSpacing:'0.05em' }}>Cash in Counter</div>
            <ArrowRight size={14} color={C.goldMid}/>
          </div>
          <div style={{ fontSize:36, fontWeight:300, color:C.ink, lineHeight:1, marginBottom:8 }}>
            ₹{cashData.counter.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize:12, color:C.inkFaint }}>Tap to log withdrawals &amp; expenses</div>
        </motion.div>
      </div>

      {/* ── Now / Next Spotlight ── */}
      {(inProgress || nextAppt) && (
        <div style={{ display:'grid', gridTemplateColumns:inProgress&&nextAppt?'1fr 1fr':'1fr', gap:12, marginBottom:20 }}>
          {inProgress && (() => {
            const meta = STATUS_META['in-progress'];
            return (
              <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.20}}
                style={{ ...card, padding:'16px 20px', borderLeft:`4px solid ${meta.dot}`, borderRadius:16 }}>
                <div style={{ fontSize:10, fontWeight:700, color:meta.color, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>⚡ In Progress Right Now</div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:16, fontWeight:700, color:C.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {inProgress.customer?.name || 'Guest'}
                    </div>
                    <div style={{ fontSize:12, color:C.inkFaint, marginTop:2 }}>
                      {inProgress.service?.name||'—'} · {inProgress.staff?.name||'—'}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>
                      {inProgress.timeSlot?.start||'—'} → {inProgress.timeSlot?.end||'—'}
                    </div>
                    <button onClick={()=>navigate('/staff/appointments')}
                      style={{ marginTop:4, padding:'4px 10px', borderRadius:100, border:`1px solid ${C.creamBorder}`, background:'#fff', color:C.inkMid, fontSize:11, fontWeight:600, cursor:'pointer' }}>
                      Manage →
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })()}

          {nextAppt && (() => {
            const meta = STATUS_META[nextAppt.status] || STATUS_META.confirmed;
            return (
              <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.22}}
                style={{ ...card, padding:'16px 20px', borderLeft:`4px solid ${C.goldMid}`, borderRadius:16 }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.goldMid, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
                  📅 Next Up · {nextAppt.timeSlot?.start||'—'}
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:16, fontWeight:700, color:C.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {nextAppt.customer?.name || 'Guest'}
                    </div>
                    <div style={{ fontSize:12, color:C.inkFaint, marginTop:2 }}>
                      {nextAppt.service?.name||'—'} · {nextAppt.staff?.name||'—'}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:C.ink }}>
                      ₹{(nextAppt.finalAmount||nextAppt.totalAmount||0).toLocaleString('en-IN')}
                    </div>
                    <span style={{ fontSize:10, fontWeight:600, color:meta.color, background:meta.bg, padding:'2px 8px', borderRadius:100, display:'inline-block', marginTop:3 }}>{meta.label}</span>
                  </div>
                </div>
              </motion.div>
            );
          })()}
        </div>
      )}

      {/* ── Schedule + Sidebar ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:16, alignItems:'start' }}>

        {/* Today's Schedule */}
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.24}}
          style={{ ...card, padding:0, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:`1px solid ${C.creamBorder}` }}>
            <span style={{ fontFamily:'Playfair Display,serif', fontSize:16, fontWeight:600, color:C.ink }}>Today's Schedule</span>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:12, color:C.inkFaint }}>{upcoming.length} upcoming</span>
              <button onClick={()=>navigate('/staff/appointments')}
                style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:600, color:C.goldMid, background:'none', border:'none', cursor:'pointer' }}>
                View all <ChevronRight size={13}/>
              </button>
            </div>
          </div>

          {upcoming.length === 0 ? (
            <div style={{ padding:44, textAlign:'center', color:C.inkFaint, fontSize:13 }}>
              {todayB.length === 0 ? 'No appointments today' : 'All done for today! 🎉'}
            </div>
          ) : upcoming.slice(0, 10).map((b, i) => {
            const meta = STATUS_META[b.status] || STATUS_META.confirmed;
            const isExp = expandedId === b._id;
            return (
              <div key={b._id||i}>
                <div onClick={()=>setExpandedId(isExp?null:b._id)}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 20px', cursor:'pointer', borderBottom:`1px solid ${C.creamBorder}`, background:isExp?C.creamMid:'#fff', transition:'background 0.15s' }}
                  onMouseEnter={e=>{ if(!isExp)e.currentTarget.style.background=C.creamMid; }}
                  onMouseLeave={e=>{ if(!isExp)e.currentTarget.style.background='#fff'; }}>
                  <div style={{ minWidth:48, textAlign:'right' }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>{b.timeSlot?.start||'—'}</div>
                    <div style={{ fontSize:10, color:C.inkFaint }}>{b.timeSlot?.end||''}</div>
                  </div>
                  <div style={{ width:9, height:9, borderRadius:'50%', background:meta.dot, flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:C.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {b.customer?.name||'Guest'}
                    </div>
                    <div style={{ fontSize:11, color:C.inkFaint, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {b.service?.name||'—'} · {b.staff?.name||'—'}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>₹{(b.finalAmount||b.totalAmount||0).toLocaleString('en-IN')}</div>
                    <span style={{ fontSize:10, fontWeight:600, color:meta.color, background:meta.bg, padding:'2px 7px', borderRadius:100, display:'inline-block', marginTop:2 }}>{meta.label}</span>
                  </div>
                </div>
                <AnimatePresence>
                  {isExp && (
                    <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.18}} style={{overflow:'hidden'}}>
                      <div style={{ padding:'10px 20px 10px 81px', background:C.creamMid, borderBottom:`1px solid ${C.creamBorder}`, display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
                        <span style={{ fontSize:12, color:C.inkMid }}><span style={{ color:C.inkFaint }}>Type: </span>{b.type||'Online'}</span>
                        {b.paymentStatus!=='paid' && <span style={{ fontSize:10, fontWeight:700, color:C.risk, background:C.riskPale, padding:'2px 8px', borderRadius:100 }}>Unpaid</span>}
                        <button onClick={e=>{e.stopPropagation();navigate('/staff/appointments');}}
                          style={{ marginLeft:'auto', padding:'5px 12px', borderRadius:100, border:`1px solid ${C.creamBorder}`, background:'#fff', color:C.inkMid, fontSize:11, fontWeight:600, cursor:'pointer' }}>
                          Manage →
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>

        {/* Right sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

          {/* Staff Floor Status — ALL 4 states */}
          <motion.div initial={{opacity:0,x:12}} animate={{opacity:1,x:0}} transition={{delay:0.28}}
            style={{ ...card, padding:'18px 20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <span style={{ fontFamily:'Playfair Display,serif', fontSize:14, fontWeight:600, color:C.ink }}>Staff Floor</span>
              <button onClick={()=>navigate('/staff/staff-status')}
                style={{ fontSize:11, fontWeight:600, color:C.goldMid, background:'none', border:'none', cursor:'pointer' }}>
                Manage →
              </button>
            </div>

            {/* Counts grid — all 4 live statuses */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:14 }}>
              {[
                { key:'available',        label:'Available',   dot:'#22C55E', color:C.ok,      bg:C.okPale    },
                { key:'busy',             label:'Busy',        dot:'#F59E0B', color:C.warn,    bg:C.warnPale  },
                { key:'temp-unavailable', label:'Stepped Out', dot:'#F97316', color:C.orange,  bg:C.orangePale},
                { key:'off-duty',         label:'Off Duty',    dot:'#D1D5DB', color:C.inkFaint,bg:C.creamMid  },
              ].map(({ key, label, dot, color, bg }) => (
                <div key={key} style={{ background:bg, borderRadius:10, padding:'8px 10px', textAlign:'center' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, marginBottom:2 }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:dot }}/>
                    <span style={{ fontSize:18, fontWeight:300, color:C.ink }}>{floorCounts[key]||0}</span>
                  </div>
                  <div style={{ fontSize:9, fontWeight:700, color, textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Staff list — top 6 with live dot */}
            <div style={{ borderTop:`1px solid ${C.creamBorder}`, paddingTop:10 }}>
              {safeStaff.slice(0,6).map(s => {
                // FIX: use s.liveStatus, not s.isAvailable/s.isBusy (isBusy doesn't exist)
                const ls = s.liveStatus || (s.isAvailable ? 'available' : 'off-duty');
                const fm = floorMeta(ls);
                return (
                  <div key={s._id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                    <div style={{ position:'relative', flexShrink:0 }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:C.creamMid, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:C.inkMid }}>
                        {(s.name||'S').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ position:'absolute', bottom:-1, right:-1, width:8, height:8, borderRadius:'50%', background:fm.dot, border:'1.5px solid #fff' }}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:C.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.name||'Staff'}</div>
                      <div style={{ fontSize:10, color:fm.color, fontWeight:600 }}>{fm.label}</div>
                    </div>
                  </div>
                );
              })}
              {safeStaff.length === 0 && (
                <div style={{ fontSize:12, color:C.inkFaint, textAlign:'center', padding:'8px 0' }}>No staff data</div>
              )}
            </div>
          </motion.div>

          {/* Quick Access */}
          <motion.div initial={{opacity:0,x:12}} animate={{opacity:1,x:0}} transition={{delay:0.32}}
            style={{ ...card, padding:'16px 18px' }}>
            <div style={{ fontFamily:'Playfair Display,serif', fontSize:13, fontWeight:700, color:C.ink, marginBottom:10 }}>Quick Access</div>
            {[
              { label:'Appointments', path:'/staff/appointments', icon:Calendar  },
              { label:'Customers',    path:'/staff/customers',    icon:Users     },
              { label:'Cash Counter', path:'/staff/cash',         icon:Wallet    },
              { label:'Attendance',   path:'/staff/staff-status', icon:UserCheck },
              { label:'Inventory',    path:'/staff/inventory',    icon:Package   },
            ].map(({ label, path, icon:Icon }) => (
              <button key={label} onClick={()=>navigate(path)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 6px', borderRadius:10, border:'none', background:'none', cursor:'pointer', width:'100%', color:C.inkMid, marginBottom:2 }}
                onMouseEnter={e=>e.currentTarget.style.background=C.creamMid}
                onMouseLeave={e=>e.currentTarget.style.background='none'}>
                <Icon size={14} color={C.goldMid}/>
                <span style={{ fontSize:12, fontWeight:500 }}>{label}</span>
                <ChevronRight size={11} style={{ marginLeft:'auto', color:C.inkGhost }}/>
              </button>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}