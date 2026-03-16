import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  Clock, LogIn, LogOut, Calendar, Loader2, CheckCircle2,
  XCircle, AlertCircle, Sparkles, Timer, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import api from '@/services/api';

const C = {
  cream:'#FDF8F0', creamMid:'#F7EFD8', creamBorder:'#DFD0A8',
  gold:'#B8860B', goldBright:'#DAA520', goldPale:'#FFF8E7',
  ink:'#1C1410', inkMid:'#5C4A2A', inkLight:'#9C8660',
  white:'#FFFFFF',
  green:'#065F46', greenPale:'#ECFDF5', greenBorder:'#A7F3D0',
  red:'#991B1B', redPale:'#FEF2F2',
  orange:'#92400E', orangePale:'#FFFBEB',
  blue:'#1E40AF', bluePale:'#EFF6FF',
};

const fmtTime = d => new Date(d).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true});
const fmtMins = m => {
  if (!m) return '0m';
  const h = Math.floor(m/60), min = m%60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
};

// Returns today's date string in IST e.g. "2026-03-07"
const todayISTStr = () => new Date(Date.now() + 5.5*60*60*1000).toISOString().split('T')[0];

// Find today's attendance record robustly:
// DB stores March 7 IST as either:
//   A) 2026-03-07T00:00:00.000Z  (new format via istDayUTC)
//   B) 2026-03-06T18:30:00.000Z  (old format: actual UTC of IST midnight)
// Both should resolve to "2026-03-07" in IST.
const findTodayRecord = (records) => {
  const todayStr = todayISTStr();
  // Try exact match first (new format)
  const direct = records.find(r =>
    new Date(r.date).toISOString().split('T')[0] === todayStr
  );
  if (direct) return direct;
  // Try IST-adjusted match (old format: date stored as real UTC midnight IST)
  // Old format: 2026-03-06T18:30:00Z + 5.5h = 2026-03-07T00:00Z = today in IST
  const adjusted = records.find(r => {
    const d = new Date(r.date);
    const istDate = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
    return istDate.toISOString().split('T')[0] === todayStr;
  });
  // Only return adjusted match if it has sessions (not a historical record)
  // This prevents false positives where yesterday's date + 5.5h = today
  return (adjusted && (adjusted.sessions?.length > 0 || adjusted.status !== 'absent')) ? adjusted : null;
};

const STATUS_STYLE = {
  present:  { bg:'#ECFDF5', color:'#065F46', border:'#A7F3D0', dot:'#10B981' },
  late:     { bg:'#FFFBEB', color:'#92400E', border:'#FDE68A', dot:'#F59E0B' },
  absent:   { bg:'#FEF2F2', color:'#991B1B', border:'#FECACA', dot:'#EF4444' },
  'half-day':{ bg:'#EFF6FF',color:'#1E40AF', border:'#BFDBFE', dot:'#3B82F6' },
  leave:    { bg:'#F5F3FF', color:'#6D28D9', border:'#DDD6FE', dot:'#7C3AED' },
  holiday:  { bg:'#F9FAFB', color:'#6B7280', border:'#E5E7EB', dot:'#9CA3AF' },
};

const fV = { hidden:{opacity:0,y:8}, show:{opacity:1,y:0,transition:{duration:0.22}} };
const sV = { hidden:{}, show:{transition:{staggerChildren:0.05}} };

const HistoryRow = ({ record }) => {
  const [open, setOpen] = useState(false);
  const st = STATUS_STYLE[record.status] || STATUS_STYLE.absent;
  const ds = new Date(record.date).toISOString().split('T')[0];
  const sessions = record.sessions || [];
  const firstIn  = sessions[0]?.clockIn;
  const lastOut  = sessions.filter(s=>s.clockOut).slice(-1)[0]?.clockOut;
  const isOpen   = sessions.some(s=>s.clockIn && !s.clockOut);

  return (
    <div className="rounded-xl overflow-hidden" style={{border:`1px solid ${open?st.border:C.creamBorder}`}}>
      <button onClick={()=>setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:opacity-90"
        style={{background:open?st.bg:C.white}}>
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:st.dot}}/>
        <div className="flex-1">
          <p className="text-xs font-bold" style={{color:C.ink}}>
            {new Date(ds+'T12:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}
          </p>
          <p className="text-[10px]" style={{color:C.inkLight}}>
            {firstIn?fmtTime(firstIn):'—'} → {lastOut?fmtTime(lastOut):isOpen?'Active':'—'}
            {sessions.length>1?` · ${sessions.length} sessions`:''}
          </p>
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full border"
          style={{background:st.bg, borderColor:st.border, color:st.color}}>
          {record.status}
        </span>
        <span className="text-xs font-bold w-12 text-right" style={{color:C.gold}}>
          {fmtMins(record.totalMinutes)}
        </span>
        {sessions.length>0&&(open?<ChevronUp size={11} style={{color:C.inkLight}}/>:<ChevronDown size={11} style={{color:C.inkLight}}/>)}
      </button>
      <AnimatePresence>
        {open && sessions.length>0 && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
            className="overflow-hidden">
            <div className="px-4 pb-3 pt-1 space-y-1.5" style={{borderTop:`1px solid ${st.border}`}}>
              {sessions.map((s,i)=>(
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs"
                  style={{background:i%2===0?C.greenPale:'#F0FDF4'}}>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{background:C.white,color:C.inkLight,border:`1px solid ${C.creamBorder}`}}>#{i+1}</span>
                  <span className="flex items-center gap-1"><LogIn size={10} style={{color:C.green}}/>{fmtTime(s.clockIn)}</span>
                  {s.clockOut
                    ? <span className="flex items-center gap-1"><LogOut size={10} style={{color:C.red}}/>{fmtTime(s.clockOut)}</span>
                    : <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/><span style={{color:C.green}}>Active</span></span>}
                  <span className="ml-auto font-bold" style={{color:C.inkMid}}>{s.clockOut?fmtMins(s.durationMinutes):'—'}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StaffProfile = () => {
  const { user } = useAuth();
  const [attendance,   setAttendance]   = useState([]);
  const [todayRecord,  setTodayRecord]  = useState(null);
  const [summary,      setSummary]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [clockLoading, setClockLoading] = useState(false);
  const [msg,          setMsg]          = useState({ text:'', ok:true });

  const flash = (text, ok=true) => {
    setMsg({text, ok});
    setTimeout(() => setMsg({text:'', ok:true}), 3500);
  };

  const fetchAttendance = useCallback(async (silent=false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/attendance/my');
      const records = data.records || [];
      setAttendance(records);
      setSummary(data.summary || null);
      setTodayRecord(findTodayRecord(records));
    } catch(e) {
      console.error('fetchAttendance error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  // Sync when header clock widget changes state
  useEffect(() => {
    const sync = () => fetchAttendance(true);
    window.addEventListener('clock-state-changed', sync);
    return () => window.removeEventListener('clock-state-changed', sync);
  }, [fetchAttendance]);

  const handleClockIn = async () => {
    setClockLoading(true);
    try {
      const { data } = await api.post('/attendance/clock-in');
      flash(data.message || 'Clocked in!', true);
    } catch(e) {
      flash(e.response?.data?.message || 'Clock in failed', false);
    } finally {
      setClockLoading(false);
      // Always refresh — server may have saved the session even if it returned an error
      await fetchAttendance(true);
      window.dispatchEvent(new Event('clock-state-changed'));
    }
  };

  const handleClockOut = async () => {
    setClockLoading(true);
    try {
      const { data } = await api.post('/attendance/clock-out');
      flash(data.message || 'Clocked out!', true);
    } catch(e) {
      flash(e.response?.data?.message || 'Clock out failed', false);
    } finally {
      setClockLoading(false);
      await fetchAttendance(true);
      window.dispatchEvent(new Event('clock-state-changed'));
    }
  };

  const sessions      = todayRecord?.sessions || [];
  const isCurrentlyIn = sessions.some(s => s.clockIn && !s.clockOut);
  const hasAnySession = sessions.length > 0;
  const totalToday    = todayRecord?.totalMinutes || 0;
  const sessionCount  = sessions.length;

  return (
    <motion.div variants={sV} initial="hidden" animate="show" className="space-y-5 pb-10"
      style={{fontFamily:"'DM Sans',sans-serif"}}>

      {/* Header */}
      <motion.div variants={fV} className="flex items-center gap-2">
        <Sparkles size={14} style={{color:C.gold}}/>
        <span className="text-xs font-black uppercase tracking-widest" style={{color:C.gold}}>Profile</span>
      </motion.div>

      {/* Profile card */}
      <motion.div variants={fV} className="rounded-2xl p-5 flex items-center gap-4"
        style={{background:C.white, border:`1px solid ${C.creamBorder}`}}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black flex-shrink-0"
          style={{background:`linear-gradient(135deg,${C.gold},${C.goldBright})`}}>
          {(user?.name||'?')[0].toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-black" style={{fontFamily:"'Playfair Display',serif",color:C.ink}}>{user?.name}</h2>
          <p className="text-xs" style={{color:C.inkLight}}>{user?.email}</p>
          <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
            style={{background:C.goldPale,color:C.gold}}>{user?.role}</span>
        </div>
      </motion.div>

      {/* Flash message */}
      <AnimatePresence>
        {msg.text && (
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className="rounded-xl px-4 py-3 text-sm font-semibold"
            style={{background:msg.ok?C.greenPale:C.redPale, color:msg.ok?C.green:C.red,
              border:`1px solid ${msg.ok?C.greenBorder:'#FECACA'}`}}>
            {msg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Today's attendance clock */}
      <motion.div variants={fV} className="rounded-2xl overflow-hidden"
        style={{background:C.white, border:`1.5px solid ${isCurrentlyIn?C.greenBorder:C.creamBorder}`,
          boxShadow:isCurrentlyIn?'0 0 0 2px #A7F3D022':'none'}}>

        <div className="px-5 py-4 flex items-center gap-3" style={{borderBottom:`1px solid ${C.creamBorder}`, background:C.cream}}>
          <Clock size={14} style={{color:C.gold}}/>
          <p className="text-xs font-black uppercase tracking-wider" style={{color:C.inkLight}}>Today's Attendance</p>
          {todayRecord?.status && (
            <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize"
              style={{
                background:(STATUS_STYLE[todayRecord.status]||STATUS_STYLE.absent).bg,
                color:(STATUS_STYLE[todayRecord.status]||STATUS_STYLE.absent).color,
                borderColor:(STATUS_STYLE[todayRecord.status]||STATUS_STYLE.absent).border,
              }}>
              {todayRecord.status}
            </span>
          )}
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 size={20} className="animate-spin" style={{color:C.gold}}/>
            </div>
          ) : (
            <>
              {/* Session summary pills */}
              {sessions.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {sessions.map((s,i)=>(
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                      style={{background:s.clockOut?C.greenPale:C.goldPale,
                        border:`1px solid ${s.clockOut?C.greenBorder:C.creamBorder}`,
                        color:s.clockOut?C.green:C.gold}}>
                      <LogIn size={10}/>
                      {fmtTime(s.clockIn)}
                      {s.clockOut ? <><LogOut size={10} style={{marginLeft:4}}/>{fmtTime(s.clockOut)}</> : <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>}
                    </div>
                  ))}
                </div>
              )}

              {/* Total time today */}
              {totalToday > 0 && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl"
                  style={{background:C.goldPale, border:`1px solid ${C.creamBorder}`}}>
                  <Timer size={13} style={{color:C.gold}}/>
                  <p className="text-xs font-semibold" style={{color:C.inkMid}}>Total today</p>
                  <p className="ml-auto text-sm font-black" style={{color:C.gold}}>{fmtMins(totalToday)}</p>
                </div>
              )}

              {/* Late notice */}
              {todayRecord?.lateByMinutes > 0 && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl"
                  style={{background:C.orangePale, border:`1px solid #FDE68A`}}>
                  <AlertCircle size={12} style={{color:C.orange}}/>
                  <p className="text-xs font-semibold" style={{color:C.orange}}>
                    Late by {fmtMins(todayRecord.lateByMinutes)}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                {isCurrentlyIn ? (
                  <button onClick={handleClockOut} disabled={clockLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
                    style={{background:'linear-gradient(135deg,#DC2626,#EF4444)',color:'#fff'}}>
                    {clockLoading?<Loader2 size={14} className="animate-spin"/>:<><LogOut size={14}/>Clock Out</>}
                  </button>
                ) : (
                  <button onClick={handleClockIn} disabled={clockLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
                    style={{background:`linear-gradient(135deg,${C.gold},${C.goldBright})`,color:'#fff'}}>
                    {clockLoading?<Loader2 size={14} className="animate-spin"/>:<><LogIn size={14}/>{hasAnySession?'Clock In Again':'Clock In'}</>}
                  </button>
                )}
                <button onClick={()=>fetchAttendance(true)} disabled={loading}
                  className="w-11 flex items-center justify-center rounded-xl transition-all hover:opacity-80 disabled:opacity-40"
                  style={{background:C.cream, border:`1px solid ${C.creamBorder}`}}>
                  <RefreshCw size={14} style={{color:C.inkLight}}/>
                </button>
              </div>

              {hasAnySession && !isCurrentlyIn && (
                <p className="text-[10px] text-center mt-2.5" style={{color:C.inkLight}}>
                  {sessionCount} session{sessionCount>1?'s':''} today · tap Clock In Again to start another session
                </p>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* Monthly summary */}
      {summary && (
        <motion.div variants={fV} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label:'Present',    val:summary.present,              color:C.green,  bg:C.greenPale,  icon:CheckCircle2 },
            { label:'Late',       val:summary.late,                 color:C.orange, bg:C.orangePale, icon:AlertCircle },
            { label:'Absent',     val:summary.absent,               color:C.red,    bg:'#FEF2F2',    icon:XCircle },
            { label:'Total Time', val:fmtMins(summary.totalMinutes||0), color:C.gold, bg:C.goldPale, icon:Timer },
          ].map(({ label, val, color, bg, icon:Icon })=>(
            <div key={label} className="rounded-2xl p-4" style={{background:bg, border:`1.5px solid ${color}20`}}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{background:`${color}18`}}>
                <Icon size={13} style={{color}}/>
              </div>
              <p className="text-xl font-black" style={{color, fontFamily:"'Playfair Display',serif"}}>{val}</p>
              <p className="text-[10px] font-bold mt-0.5" style={{color:`${color}88`}}>{label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Attendance history */}
      {attendance.length > 0 && (
        <motion.div variants={fV} className="rounded-2xl overflow-hidden"
          style={{background:C.white, border:`1px solid ${C.creamBorder}`}}>
          <div className="px-5 py-3.5 flex items-center gap-2" style={{borderBottom:`1px solid ${C.creamBorder}`,background:C.cream}}>
            <Calendar size={13} style={{color:C.gold}}/>
            <p className="text-xs font-black uppercase tracking-wider" style={{color:C.inkLight}}>
              Attendance History
            </p>
          </div>
          <div className="p-4 space-y-2">
            {attendance.slice().reverse().slice(0,20).map(record=>(
              <HistoryRow key={record._id} record={record}/>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default StaffProfile;