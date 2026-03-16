import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, CheckCircle2, Clock, Zap, Loader2, Sparkles,
  User, Scissors, IndianRupee, ArrowRight, Star, Trophy,
  Package, Activity, ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useDataStore, broadcastChange } from '@/context/DataStore';
import api from '@/services/api';

const C = {
  cream:'#FDF8F0', creamMid:'#F7EFD8', creamDark:'#EDE0C0', creamBorder:'#DFD0A8',
  goldMid:'#B8860B', goldBright:'#D4A017', goldPale:'#FFF8E7',
  ink:'#16100A', inkMid:'#5A4020', inkFaint:'#B09060', inkGhost:'#D4B890',
  ok:'#285C3A', okPale:'#EAF4EE', warn:'#6B4800', warnPale:'#FEF3DC',
  blue:'#1D4ED8', bluePale:'#EFF6FF', purple:'#6D28D9', purplePale:'#F5F3FF',
};
const ease = [0.22,0.61,0.36,1];
const fV = { hidden:{opacity:0,y:12}, show:{opacity:1,y:0,transition:{duration:0.35,ease}} };
const sV = (d=0.07) => ({ hidden:{opacity:0}, show:{opacity:1,transition:{staggerChildren:d}} });
const Rs = n => Number(n||0).toLocaleString('en-IN');
const fmtTime = t => { try { return new Date(`2000-01-01T${t}`).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}); } catch { return t; }};

const STATUS = {
  confirmed:    { color:C.ok,     bg:C.okPale,    label:'Confirmed' },
  'in-progress':{ color:C.purple, bg:C.purplePale,label:'In Progress' },
  completed:    { color:C.blue,   bg:C.bluePale,  label:'Done' },
  pending:      { color:C.warn,   bg:C.warnPale,  label:'Pending' },
  cancelled:    { color:C.inkFaint,bg:C.creamMid, label:'Cancelled' },
};

const greet = () => {
  const h = new Date().getHours();
  if (h<12) return 'Good morning';
  if (h<17) return 'Good afternoon';
  return 'Good evening';
};

export default function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { bookings: allBookings, syncing, refresh } = useDataStore();
  const [attendance,  setAttendance]  = useState(null);
  const [earnings,    setEarnings]    = useState(null);
  const [lowStock,    setLowStock]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [updatingId,  setUpdatingId]  = useState(null);
  const [toast,       setToast]       = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const today = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Filter bookings for today from DataStore (backend filters by staff for staff role)
  const bookings = allBookings.filter(b =>
    new Date(b.date).toISOString().split('T')[0] === today
  );

  // Fetch non-bookings data (attendance, earnings, inventory) locally — not in DataStore
  const fetchSideData = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, eRes, invRes] = await Promise.allSettled([
        api.get('/attendance/my'),
        api.get('/staff/my/earnings', { params: { period: 'month' } }),
        api.get('/inventory', { params: { lowStock: true, limit: 5 } }),
      ]);
      if (aRes.status === 'fulfilled') {
        const recs = aRes.value.data.records || [];
        const todayRec = recs.find(r => new Date(r.date).toISOString().split('T')[0] === today);
        setAttendance(todayRec || null);
      }
      if (eRes.status === 'fulfilled') setEarnings(eRes.value.data.summary || null);
      if (invRes.status === 'fulfilled') setLowStock(invRes.value.data.products?.slice(0,3) || []);
    } catch {}
    finally { setLoading(false); }
  }, [today]);

  useEffect(() => { fetchSideData(); }, [fetchSideData]);

  // Sync attendance on clock events
  useEffect(() => {
    const sync = () => fetchSideData();
    window.addEventListener('clock-state-changed', sync);
    return () => window.removeEventListener('clock-state-changed', sync);
  }, [fetchSideData]);

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      await api.patch(`/bookings/${id}/status`, { status });
      broadcastChange();
      await refresh(false);
      showToast('Status updated');
    }
    catch(e) { showToast(e.response?.data?.message || 'Update failed', false); }
    finally { setUpdatingId(null); }
  };

  const activeBookings = bookings.filter(b=>!['completed','cancelled','no-show'].includes(b.status));
  const doneToday      = bookings.filter(b=>b.status==='completed').length;
  const inProgressNow  = bookings.filter(b=>b.status==='in-progress');
  const nextUp         = bookings.filter(b=>b.status==='confirmed').sort((a,b)=>(a.timeSlot?.start||'').localeCompare(b.timeSlot?.start||''))[0];

  // Derive clock state from sessions (multi-session support)
  const todayRecord   = Array.isArray(attendance) ? attendance.find(r => r.date?.startsWith(today)) : attendance;
  const sessions      = todayRecord?.sessions || [];
  const isClocked     = sessions.some(s => s.clockIn && !s.clockOut); // currently clocked in
  const isClockedOut  = sessions.length > 0 && !isClocked;             // clocked in then out

  return (
    <motion.div variants={sV(0.06)} initial="hidden" animate="show" className="space-y-5">

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-16 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold shadow-lg"
          style={{
            background: toast.ok ? '#ECFDF5' : '#FEF2F2',
            color:      toast.ok ? '#065F46' : '#991B1B',
            border:     `1px solid ${toast.ok ? '#A7F3D0' : '#FECACA'}`,
          }}>
          {toast.msg}
        </div>
      )}

      {/* Hero greeting */}
      <motion.div variants={fV} className="relative overflow-hidden rounded-2xl p-6"
        style={{background:`linear-gradient(135deg,#1c1408,#2d2010)`}}>
        <div className="absolute inset-0 opacity-[0.07]"
          style={{backgroundImage:'repeating-linear-gradient(45deg,#B8860B 0,#B8860B 1px,transparent 0,transparent 50%)',backgroundSize:'16px 16px'}}/>
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={11} style={{color:'#F0D878'}}/>
            <span className="text-[10px] font-black uppercase tracking-widest" style={{color:'#F0D878'}}>
              {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white" style={{fontFamily:"'Playfair Display',serif"}}>
            {greet()}, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-sm mt-1" style={{color:'#7a6040'}}>
            {loading ? 'Loading your schedule…' :
              activeBookings.length === 0
                ? 'No appointments remaining today 🎉'
                : `${activeBookings.length} appointment${activeBookings.length>1?'s':''} remaining today`}
          </p>

          {/* Clock status — controlled from header, shown here as info only */}
          <div className="flex items-center gap-3 mt-4">
            {isClocked ? (() => {
              const openSession = sessions.find(s => s.clockIn && !s.clockOut);
              return (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
                  style={{background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.7)'}}>
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:'#4ade80'}}/>
                  Clocked in at {openSession ? new Date(openSession.clockIn).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—'}
                  {todayRecord?.lateByMinutes>0 && <span style={{color:C.warn}}> · {todayRecord.lateByMinutes}m late</span>}
                </div>
              );
            })() : isClockedOut ? (() => {
              const lastSession = sessions.filter(s => s.clockOut).slice(-1)[0];
              return (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
                  style={{background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.4)'}}>
                  Clocked out · {lastSession ? new Date(lastSession.clockOut).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—'}
                  {sessions.length > 1 && <span className="ml-1 opacity-60">({sessions.length} sessions)</span>}
                </div>
              );
            })() : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
                style={{background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.35)'}}>
                Use the Clock In button in the top bar ↑
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* KPI strip */}
      <motion.div variants={sV(0.05)} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Today',       val:bookings.length,     icon:Calendar,     color:C.goldMid, bg:C.goldPale },
          { label:'Done',        val:doneToday,           icon:CheckCircle2, color:C.ok,      bg:C.okPale   },
          { label:'In Progress', val:inProgressNow.length,icon:Zap,          color:C.purple,  bg:C.purplePale},
          { label:'Month Revenue',val:earnings?`₹${Rs(earnings.totalRevenue)}`:'—', icon:IndianRupee,color:C.blue,bg:C.bluePale},
        ].map(({label,val,icon:Icon,color,bg})=>(
          <motion.div key={label} variants={fV} className="rounded-2xl p-4" style={{background:bg, border:`1.5px solid ${color}18`}}>
            <Icon size={15} style={{color, marginBottom:8}}/>
            <p className="text-xl font-black" style={{color, fontFamily:"'Playfair Display',serif"}}>{val}</p>
            <p className="text-[11px] font-semibold mt-0.5" style={{color:`${color}70`}}>{label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Next up */}
      {nextUp && (
        <motion.div variants={fV} className="rounded-2xl p-4 flex items-center gap-3"
          style={{background:`linear-gradient(135deg,${C.goldPale},#fffbf0)`, border:`1.5px solid ${C.goldMid}25`}}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{background:`linear-gradient(135deg,${C.goldMid},${C.goldBright})`}}>
            <Zap size={16} className="text-white"/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider" style={{color:C.goldMid}}>Next Up</p>
            <p className="text-sm font-bold truncate" style={{color:C.ink}}>
              {nextUp.customer?.name||'—'} · {nextUp.service?.name||'—'}
            </p>
            <p className="text-[11px]" style={{color:C.inkFaint}}>
              {nextUp.timeSlot?.start ? fmtTime(nextUp.timeSlot.start) : '—'}
              {nextUp.service?.duration && ` · ${nextUp.service.duration} min`}
            </p>
          </div>
          <button onClick={()=>updateStatus(nextUp._id,'in-progress')} disabled={updatingId===nextUp._id}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold hover:opacity-80 disabled:opacity-40 flex-shrink-0"
            style={{background:`linear-gradient(135deg,${C.goldMid},${C.goldBright})`, color:'#fff'}}>
            {updatingId===nextUp._id ? <Loader2 size={12} className="animate-spin"/> : <><Zap size={11}/>Start</>}
          </button>
        </motion.div>
      )}

      {/* Today's appointments */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={22} className="animate-spin" style={{color:C.goldMid}}/>
        </div>
      ) : (
        <motion.div variants={fV} className="rounded-2xl overflow-hidden bg-white" style={{border:`1px solid ${C.creamBorder}`}}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{borderColor:C.creamBorder}}>
            <p className="text-xs font-black uppercase tracking-wider" style={{color:C.inkFaint}}>Today's Appointments</p>
            <button onClick={()=>navigate('/staff/appointments')}
              className="flex items-center gap-1 text-xs font-bold hover:opacity-70"
              style={{color:C.goldMid}}>
              View all <ChevronRight size={12}/>
            </button>
          </div>
          {bookings.length === 0 ? (
            <div className="p-10 text-center">
              <Calendar size={28} style={{color:C.creamDark, margin:'0 auto 10px'}}/>
              <p className="text-sm font-semibold" style={{color:C.inkFaint}}>No appointments today</p>
              <p className="text-xs mt-1" style={{color:C.inkGhost}}>Enjoy the free time!</p>
            </div>
          ) : (
            <div className="divide-y" style={{borderColor:`${C.creamBorder}60`}}>
              {bookings
                .sort((a,b)=>(a.timeSlot?.start||'').localeCompare(b.timeSlot?.start||''))
                .slice(0,6)
                .map(b=>{
                  const st = STATUS[b.status]||STATUS.pending;
                  const isIP = b.status==='in-progress';
                  return (
                    <div key={b._id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-shrink-0 text-center min-w-[52px]">
                        <p className="text-xs font-black" style={{color:C.goldMid}}>
                          {b.timeSlot?.start ? fmtTime(b.timeSlot.start) : '—'}
                        </p>
                      </div>
                      <div className="w-0.5 self-stretch rounded-full" style={{background:`${st.color}30`}}/>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{color:C.ink}}>{b.customer?.name||'—'}</p>
                        <p className="text-[10px]" style={{color:C.inkFaint}}>{b.service?.name||'—'}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{background:st.bg, color:st.color}}>
                          {st.label}
                        </span>
                        {(b.status==='confirmed'||b.status==='pending') && (
                          <button onClick={()=>updateStatus(b._id,'in-progress')} disabled={updatingId===b._id}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg hover:opacity-80 disabled:opacity-40"
                            style={{background:C.purplePale, color:C.purple}}>
                            {updatingId===b._id ? '…' : '▶ Start'}
                          </button>
                        )}
                        {b.status==='in-progress' && (
                          <button onClick={()=>updateStatus(b._id,'completed')} disabled={updatingId===b._id}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg hover:opacity-80 disabled:opacity-40"
                            style={{background:C.okPale, color:C.ok}}>
                            {updatingId===b._id ? '…' : '✓ Done'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </motion.div>
      )}

      {/* Quick links + low stock */}
      <motion.div variants={sV(0.05)} className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* Quick nav */}
        <motion.div variants={fV} className="rounded-2xl p-4 bg-white" style={{border:`1px solid ${C.creamBorder}`}}>
          <p className="text-[10px] font-black uppercase tracking-wider mb-3" style={{color:C.inkFaint}}>Quick Access</p>
          <div className="space-y-1.5">
            {[
              { label:'My Schedule',     path:'/staff/schedule',   icon:Calendar,    color:C.goldMid },
              { label:'My Earnings',     path:'/staff/earnings',   icon:IndianRupee, color:C.ok },
              { label:'Product Usage',   path:'/staff/inventory',  icon:Package,     color:C.blue },
              { label:'My Profile',      path:'/staff/profile',    icon:User,        color:C.purple },
            ].map(({label,path,icon:Icon,color})=>(
              <button key={path} onClick={()=>navigate(path)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:opacity-80 text-left transition-colors"
                style={{background:C.cream}}>
                <Icon size={14} style={{color, flexShrink:0}}/>
                <span className="text-xs font-bold flex-1" style={{color:C.ink}}>{label}</span>
                <ChevronRight size={12} style={{color:C.inkGhost}}/>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Low stock alert */}
        <motion.div variants={fV} className="rounded-2xl p-4 bg-white" style={{border:`1px solid ${C.creamBorder}`}}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black uppercase tracking-wider" style={{color:C.inkFaint}}>Low Stock Alert</p>
            <button onClick={()=>navigate('/staff/inventory')} className="text-[10px] font-bold hover:opacity-70" style={{color:C.goldMid}}>
              View all
            </button>
          </div>
          {lowStock.length===0 ? (
            <div className="py-4 text-center">
              <CheckCircle2 size={20} style={{color:C.ok, margin:'0 auto 6px'}}/>
              <p className="text-xs font-semibold" style={{color:C.ok}}>All stocked up!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lowStock.map(p=>(
                <div key={p._id} className="flex items-center gap-2 p-2 rounded-xl"
                  style={{background:C.warnPale}}>
                  <Package size={12} style={{color:C.warn, flexShrink:0}}/>
                  <p className="text-xs font-bold flex-1 truncate" style={{color:C.warn}}>{p.name}</p>
                  <span className="text-[10px] font-black" style={{color:C.warn}}>{p.quantity} {p.unit}</span>
                </div>
              ))}
            </div>
          )}

          {/* Month stats */}
          {earnings && (
            <div className="mt-3 pt-3 border-t" style={{borderColor:C.creamBorder}}>
              <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{color:C.inkFaint}}>This Month</p>
              <div className="flex gap-2">
                <div className="flex-1 text-center p-2 rounded-xl" style={{background:C.goldPale}}>
                  <p className="text-base font-black" style={{color:C.goldMid, fontFamily:"'Playfair Display',serif"}}>{earnings.totalServices}</p>
                  <p className="text-[9px]" style={{color:C.inkFaint}}>Services</p>
                </div>
                <div className="flex-1 text-center p-2 rounded-xl" style={{background:C.okPale}}>
                  <p className="text-base font-black" style={{color:C.ok, fontFamily:"'Playfair Display',serif"}}>₹{Rs(earnings.totalRevenue)}</p>
                  <p className="text-[9px]" style={{color:C.inkFaint}}>Revenue</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}