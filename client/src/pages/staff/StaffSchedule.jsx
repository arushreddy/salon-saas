// StaffSchedule — Weekly calendar. Reads from DataStore — no local polling.
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Calendar, ChevronLeft, ChevronRight, Scissors, Clock, RefreshCw, Hash } from 'lucide-react';
import { useDataStore } from '@/context/DataStore';

const IST    = 5.5 * 60 * 60 * 1000;
const DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const STATUS = {
  confirmed:    { bg:'#FFFBEB', color:'#92400E', dot:'#F59E0B', label:'Confirmed'   },
  completed:    { bg:'#EFF6FF', color:'#1E40AF', dot:'#3B82F6', label:'Done'        },
  pending:      { bg:'#FFFBEB', color:'#92400E', dot:'#F59E0B', label:'Pending'     },
  cancelled:    { bg:'#FEF2F2', color:'#991B1B', dot:'#EF4444', label:'Cancelled'   },
  'in-progress':{ bg:'#ECFDF5', color:'#065F46', dot:'#10B981', label:'In Service'  },
  'no-show':    { bg:'#F9FAFB', color:'#6B7280', dot:'#9CA3AF', label:'No Show'     },
};

// Convert a DB date to IST date string
// DB stores: 2026-03-07T00:00:00.000Z (UTC midnight = IST 05:30)
// Adding IST offset ensures we read the correct calendar day
const toISTDate = (d) => new Date(new Date(d).getTime() + IST).toISOString().split('T')[0];
const todayIST  = () => new Date(Date.now() + IST).toISOString().split('T')[0];

const fmtTime = t => {
  if (!t) return '';
  const [h,m] = t.split(':').map(Number);
  return `${h>12?h-12:h===0?12:h}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`;
};
const displayDate = d => new Date(d+'T12:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'});
const makeRef = (id='',date) => {
  const d = date?new Date(date):new Date();
  return `GLM-${String(d.getFullYear()).slice(2)}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(id).slice(-4).toUpperCase()}`;
};

const getWeekDates = (anchor) => {
  const d = new Date(anchor); d.setHours(12,0,0,0);
  const dow = d.getDay();
  const monday = new Date(d); monday.setDate(d.getDate() - (dow===0?6:dow-1));
  return Array.from({length:7}, (_,i) => { const dt=new Date(monday); dt.setDate(monday.getDate()+i); return dt; });
};

const fV = { hidden:{opacity:0,y:8}, show:{opacity:1,y:0,transition:{duration:0.22}} };
const sV = { hidden:{}, show:{transition:{staggerChildren:0.06}} };

export default function StaffSchedule() {
  const { bookings: allBookings, syncing, refresh } = useDataStore();
  const [anchor,    setAnchor]    = useState(new Date());
  const [activeDay, setActiveDay] = useState(todayIST());

  const weekDates = getWeekDates(anchor);
  const weekStart = weekDates[0].toISOString().split('T')[0];
  const weekEnd   = weekDates[6].toISOString().split('T')[0];
  const today     = todayIST();

  // Filter from DataStore — all bookings for this week
  const bookings = allBookings.filter(b => {
    if (!b.date) return false;
    const ds = toISTDate(b.date);
    return ds >= weekStart && ds <= weekEnd;
  });

  // Use toISTDate so the date comparison is correct regardless of server timezone
  const dayBookings = (ds) => bookings
    .filter(b => b.date && toISTDate(b.date)===ds)
    .sort((a,b)=>(a.timeSlot?.start||'').localeCompare(b.timeSlot?.start||''));

  const activeDayBookings = dayBookings(activeDay);
  const totalWeek = bookings.filter(b=>b.status!=='cancelled').length;
  const doneWeek  = bookings.filter(b=>b.status==='completed').length;
  const pending   = bookings.filter(b=>b.status==='confirmed'||b.status==='pending').length;

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-5 pb-10"
      style={{fontFamily:"'DM Sans',sans-serif"}}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{fontFamily:"'Playfair Display',serif", color:'#1C1410'}}>
            <Calendar size={18} style={{color:'#B8860B'}}/> My Schedule
          </h1>
          <p className="text-[11px] mt-0.5 flex items-center gap-1.5" style={{color:'#9C8660'}}>
            {displayDate(weekStart)} — {displayDate(weekEnd)} · {totalWeek} appointments
            <span className="opacity-60">· live</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"/>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>refresh(false)} disabled={syncing}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:opacity-80 disabled:opacity-40"
            style={{background:'#fff', border:'1px solid #E8D9B8'}}>
            <RefreshCw size={13} className={syncing?'animate-spin':''} style={{color:'#9C8660'}}/>
          </button>
          <button onClick={()=>{ setAnchor(new Date()); setActiveDay(todayIST()); }}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
            style={{background:'#fff', border:'1px solid #E8D9B8', color:'#5C4A2A'}}>Today</button>
          <button onClick={()=>{ const d=new Date(anchor); d.setDate(d.getDate()-7); setAnchor(d); }}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:opacity-80"
            style={{background:'#fff', border:'1px solid #E8D9B8'}}>
            <ChevronLeft size={16} style={{color:'#5C4A2A'}}/>
          </button>
          <button onClick={()=>{ const d=new Date(anchor); d.setDate(d.getDate()+7); setAnchor(d); }}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:opacity-80"
            style={{background:'#fff', border:'1px solid #E8D9B8'}}>
            <ChevronRight size={16} style={{color:'#5C4A2A'}}/>
          </button>
        </div>
      </div>

      {/* Week stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label:'This Week', val:totalWeek, color:'#B8860B', bg:'#FFF8E7' },
          { label:'Completed', val:doneWeek,  color:'#065F46', bg:'#ECFDF5' },
          { label:'Upcoming',  val:pending,   color:'#92400E', bg:'#FFFBEB' },
        ].map(({label,val,color,bg})=>(
          <div key={label} className="rounded-2xl p-4 text-center" style={{background:bg, border:`1.5px solid ${color}18`}}>
            <p className="text-2xl font-black" style={{color, fontFamily:"'Playfair Display',serif"}}>{val}</p>
            <p className="text-[11px] font-semibold mt-0.5" style={{color:'#9C8660'}}>{label}</p>
          </div>
        ))}
      </div>

      {/* Week strip */}
      <div className="grid grid-cols-7 gap-1 rounded-2xl p-2" style={{background:'#fff', border:'1px solid #E8D9B8'}}>
        {weekDates.map((date,i) => {
          const ds      = date.toISOString().split('T')[0];
          const count   = dayBookings(ds).length;
          const isToday  = ds===today;
          const isActive = ds===activeDay;
          return (
            <button key={ds} onClick={()=>setActiveDay(ds)}
              className="flex flex-col items-center gap-1 py-3 rounded-xl transition-all"
              style={{background:isActive?'linear-gradient(135deg,#B8860B,#DAA520)':isToday?'#FFF8E7':'transparent'}}>
              <span className="text-[9px] font-bold uppercase" style={{color:isActive?'rgba(255,255,255,0.7)':'#9C8660'}}>{DAYS[i]}</span>
              <span className="text-base font-black" style={{color:isActive?'#fff':isToday?'#B8860B':'#1C1410'}}>{date.getDate()}</span>
              <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                style={{background:count>0?(isActive?'rgba(255,255,255,0.2)':'#FFF8E7'):'transparent',
                  color:count>0?(isActive?'#fff':'#B8860B'):'transparent'}}>
                {count>0?count:'·'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected day list */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={11} style={{color:'#B8860B'}}/>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{color:'#B8860B'}}>
            {activeDay===today ? 'Today'
              : new Date(activeDay+'T12:00:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
          </p>
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:'#FFF8E7',color:'#B8860B'}}>
            {activeDayBookings.length} appt{activeDayBookings.length!==1?'s':''}
          </span>
        </div>

        {false ? (
          <div className="flex items-center justify-center py-14">
            <Loader2 size={22} className="animate-spin" style={{color:'#B8860B'}}/>
          </div>
        ) : activeDayBookings.length===0 ? (
          <div className="rounded-2xl p-10 text-center" style={{background:'#fff', border:'1px solid #E8D9B8'}}>
            <Calendar size={26} style={{color:'#DFD0A8', margin:'0 auto 10px'}}/>
            <p className="font-bold" style={{color:'#9C8660'}}>No appointments this day</p>
            <p className="text-xs mt-1" style={{color:'#B09060'}}>
              {activeDay===today ? 'Free today!' : 'Nothing scheduled'}
            </p>
          </div>
        ) : (
          <motion.div variants={sV} initial="hidden" animate="show" className="space-y-2">
            {activeDayBookings.map((b,i) => {
              const st  = STATUS[b.status] || STATUS.pending;
              const ref = makeRef(b._id, b.date);
              const isIP = b.status==='in-progress';
              return (
                <motion.div key={b._id||i} variants={fV}
                  className="flex items-start gap-3 p-4 rounded-2xl transition-all hover:shadow-sm"
                  style={{background:'#fff', border:`1px solid ${isIP?'#A7F3D0':'#E8D9B8'}`,
                    boxShadow:isIP?'0 0 0 2px #A7F3D022':undefined}}>
                  {/* Time column */}
                  <div className="flex-shrink-0 text-center min-w-[52px]">
                    <p className="text-xs font-bold" style={{color:'#B8860B'}}>
                      {fmtTime(b.timeSlot?.start)||'—'}
                    </p>
                    {b.service?.duration && (
                      <p className="text-[9px] mt-0.5 flex items-center justify-center gap-0.5" style={{color:'#9C8660'}}>
                        <Clock size={8}/>{b.service.duration}m
                      </p>
                    )}
                  </div>

                  <div className="w-0.5 self-stretch rounded-full" style={{background:`${st.dot}35`}}/>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-bold truncate" style={{color:'#1C1410'}}>
                        {b.customer?.name||'Walk-in'}
                      </p>
                      <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
                        style={{background:st.bg, color:st.color, borderColor:st.dot+'33'}}>
                        <span style={{width:5,height:5,borderRadius:'50%',background:st.dot,display:'inline-block',
                          boxShadow:isIP?`0 0 4px ${st.dot}`:undefined}}/>
                        {st.label}
                      </span>
                    </div>
                    <p className="text-xs flex items-center gap-1 mb-0.5" style={{color:'#9C8660'}}>
                      <Scissors size={10}/>{b.service?.name||'—'}
                    </p>
                    <div className="flex items-center gap-3 text-[10px]" style={{color:'#9C8660'}}>
                      <span className="font-mono">{ref}</span>
                      {b.type==='walk-in' && <span className="px-1.5 py-0.5 rounded-full" style={{background:'#F5F3FF',color:'#6D28D9'}}>Walk-in</span>}
                    </div>
                    {b.customer?.phone && (
                      <p className="text-[10px] mt-1" style={{color:'#9C8660'}}>
                        📞 +91 {(b.customer.phone+'').replace(/\D/g,'').slice(-10)}
                      </p>
                    )}
                    {b.notes && (
                      <p className="text-[11px] italic mt-1.5 border-l-2 pl-2" style={{borderColor:'#DFD0A8',color:'#5C4A2A'}}>
                        {b.notes}
                      </p>
                    )}
                  </div>

                  {/* Amount */}
                  {b.finalAmount > 0 && (
                    <p className="flex-shrink-0 text-sm font-black" style={{color:'#B8860B', fontFamily:"'Playfair Display',serif"}}>
                      ₹{Number(b.finalAmount).toLocaleString('en-IN')}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      <p className="text-[11px] text-center pb-2" style={{color:'#9C8660'}}>
        Go to <span className="font-bold" style={{color:'#1C1410'}}>Appointments</span> tab to start or complete services · Auto-syncs every 15s
      </p>
    </motion.div>
  );
}