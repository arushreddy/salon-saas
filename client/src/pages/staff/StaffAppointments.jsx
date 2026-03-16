// StaffAppointments — strictly mirrors admin booking state.
// Now reads from DataStore — no local polling needed.
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw, Play, CheckCircle2, Clock, IndianRupee, Hash, Calendar, AlertCircle } from 'lucide-react';
import api from '@/services/api';
import { useDataStore, broadcastChange } from '@/context/DataStore';

const C = {
  cream:'#FDF8F0', creamDark:'#F5EDD8', creamBorder:'#E8D9B8',
  gold:'#B8860B', goldLight:'#DAA520', goldPale:'#FFF8E7',
  ink:'#1C1410', inkMid:'#5C4A2A', inkLight:'#9C8660', white:'#FFFFFF',
};

const IST_OFFSET = 5.5 * 60 * 60 * 1000;
const todayIST   = () => new Date(Date.now() + IST_OFFSET).toISOString().split('T')[0];

const fmtTime = t => {
  if (!t) return '';
  const [h,m] = t.split(':').map(Number);
  return `${h>12?h-12:h===0?12:h}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`;
};
const makeRef = (id='',date) => {
  const d = date?new Date(date):new Date();
  return `GLM-${String(d.getFullYear()).slice(2)}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(id).slice(-4).toUpperCase()}`;
};

const ST = {
  'in-progress': { label:'In Service',  dot:'#10B981', bg:'#ECFDF5', border:'#A7F3D0', text:'#065F46' },
  'confirmed':   { label:'Upcoming',    dot:'#F59E0B', bg:'#FFFBEB', border:'#FDE68A', text:'#92400E' },
  'pending':     { label:'Upcoming',    dot:'#F59E0B', bg:'#FFFBEB', border:'#FDE68A', text:'#92400E' },
  'completed':   { label:'Done',        dot:'#3B82F6', bg:'#EFF6FF', border:'#BFDBFE', text:'#1E40AF' },
  'cancelled':   { label:'Cancelled',   dot:'#EF4444', bg:'#FEF2F2', border:'#FECACA', text:'#991B1B' },
  'no-show':     { label:'No Show',     dot:'#9CA3AF', bg:'#F9FAFB', border:'#E5E7EB', text:'#374151' },
};

const fV = { hidden:{opacity:0,y:8}, show:{opacity:1,y:0,transition:{duration:0.22}} };
const sV = { hidden:{}, show:{transition:{staggerChildren:0.05}} };

export default function StaffAppointments() {
  const { bookings: allBookings, syncing, refresh } = useDataStore();
  const today    = todayIST();
  const bookings = allBookings.filter(b => new Date(b.date).toISOString().split('T')[0] === today);
  const [actioning, setActioning] = useState(null);
  const lastSync = null;

  const handleStart = async (id) => {
    setActioning(id);
    try { await api.patch(`/bookings/${id}/status`, { status:'in-progress' }); broadcastChange(); await refresh(false); }
    catch(e) { console.error(e); }
    finally { setActioning(null); }
  };
  const handleDone = async (id) => {
    setActioning(id);
    try { await api.patch(`/bookings/${id}/status`, { status:'completed' }); broadcastChange(); await refresh(false); }
    catch(e) { console.error(e); }
    finally { setActioning(null); }
  };

  const inProgress = bookings.filter(b=>b.status==='in-progress');
  const upcoming   = bookings.filter(b=>b.status==='confirmed'||b.status==='pending');
  const done       = bookings.filter(b=>b.status==='completed');
  const cancelled  = bookings.filter(b=>b.status==='cancelled'||b.status==='no-show');

  const Card = ({ b }) => {
    const st   = ST[b.status] || ST.confirmed;
    const ref  = makeRef(b._id, b.date);
    const isIP = b.status==='in-progress';
    const isCo = b.status==='confirmed'||b.status==='pending';

    return (
      <motion.div variants={fV} className="rounded-2xl overflow-hidden transition-all hover:shadow-md"
        style={{background:C.white, border:`1px solid ${isIP?'#A7F3D0':C.creamBorder}`,
          boxShadow:isIP?'0 0 0 2px #A7F3D022, 0 2px 12px rgba(16,185,129,0.08)':'none'}}>
        <div className="h-0.5" style={{background:`linear-gradient(90deg,${st.dot},${st.dot}55)`}}/>
        <div className="p-4">
          {/* Top row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{background:`linear-gradient(135deg,${C.gold},${C.goldLight})`}}>
                {(b.customer?.name||'?')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold" style={{color:C.ink}}>{b.customer?.name||'Walk-in'}</p>
                <p className="text-[11px]" style={{color:C.inkLight}}>
                  {b.customer?.phone ? `+91 ${(b.customer.phone+'').replace(/\D/g,'').slice(-10)}` : b.type==='walk-in'?'Walk-in':'Online'}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold border flex-shrink-0"
              style={{background:st.bg, borderColor:st.border, color:st.text}}>
              <span className="w-1.5 h-1.5 rounded-full" style={{background:st.dot,
                boxShadow:isIP?`0 0 4px ${st.dot}`:undefined}}/>
              {st.label}
            </span>
          </div>

          {/* Service block */}
          <div className="rounded-xl px-3 py-2.5 mb-3" style={{background:C.goldPale, border:`1px solid ${C.creamBorder}`}}>
            <p className="text-sm font-bold" style={{color:C.ink}}>{b.service?.name||'—'}</p>
            <p className="text-[10px] capitalize mt-0.5" style={{color:C.inkLight}}>
              {b.service?.category} · {b.service?.duration} min
            </p>
          </div>

          {/* Detail row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Clock size={11} style={{color:C.inkLight}}/>
              <span className="text-xs font-semibold" style={{color:C.inkMid}}>
                {fmtTime(b.timeSlot?.start)} – {fmtTime(b.timeSlot?.end)}
              </span>
            </div>
            <span className="text-sm font-bold" style={{color:C.gold}}>₹{(b.finalAmount||0).toLocaleString('en-IN')}</span>
          </div>

          {/* Ref + payment */}
          <div className="flex items-center gap-2 mb-3 text-[10px]">
            <Hash size={9} style={{color:C.inkGhost}}/>
            <span className="font-mono font-semibold" style={{color:C.inkLight}}>{ref}</span>
            <span className="ml-auto px-2 py-0.5 rounded-full font-bold"
              style={{background:b.paymentStatus==='paid'?'#ECFDF5':'#FFFBEB',
                color:b.paymentStatus==='paid'?'#065F46':'#92400E'}}>
              {b.paymentStatus==='paid'?'Paid ✓':'Unpaid'}
            </span>
          </div>

          {/* Notes */}
          {b.notes && (
            <p className="text-[11px] italic px-3 py-2 rounded-lg mb-3"
              style={{color:C.inkMid, background:C.cream, border:`1px solid ${C.creamBorder}`}}>
              📝 {b.notes}
            </p>
          )}

          {/* Actions */}
          {isCo && (
            <button onClick={()=>handleStart(b._id)} disabled={actioning===b._id}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90 disabled:opacity-50"
              style={{background:'#EFF6FF', color:'#1E40AF', border:'1px solid #BFDBFE'}}>
              {actioning===b._id ? <Loader2 size={12} className="animate-spin"/> : <><Play size={12} fill="#1E40AF"/>Start Service</>}
            </button>
          )}
          {isIP && (
            <button onClick={()=>handleDone(b._id)} disabled={actioning===b._id}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90 disabled:opacity-50"
              style={{background:'linear-gradient(135deg,#166534,#16A34A)', color:'#fff'}}>
              {actioning===b._id ? <Loader2 size={12} className="animate-spin"/> : <><CheckCircle2 size={12}/>Mark Done</>}
            </button>
          )}
          {b.status==='completed' && (
            <div className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
              style={{background:b.paymentStatus==='paid'?'#ECFDF5':'#FFFBEB',
                color:b.paymentStatus==='paid'?'#065F46':'#92400E',
                border:`1px solid ${b.paymentStatus==='paid'?'#A7F3D0':'#FDE68A'}`}}>
              <CheckCircle2 size={12}/>
              {b.paymentStatus==='paid' ? 'Complete & Paid ✓' : 'Done · Awaiting payment'}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const Section = ({ emoji, title, items, accent, showIfEmpty=false }) => {
    if (!showIfEmpty && items.length===0) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span>{emoji}</span>
          <p className="text-xs font-bold uppercase tracking-wider" style={{color:C.inkLight}}>{title}</p>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{background:`${accent}15`, color:accent}}>{items.length}</span>
        </div>
        {items.length===0 ? (
          <p className="text-xs px-4 py-3 rounded-xl" style={{color:C.inkLight, background:C.creamDark}}>
            No {title.toLowerCase()} right now
          </p>
        ) : (
          <motion.div variants={sV} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map(b=><Card key={b._id} b={b}/>)}
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <motion.div variants={sV} initial="hidden" animate="show" className="space-y-6 pb-10"
      style={{fontFamily:"'DM Sans',sans-serif"}}>

      {/* Header */}
      <motion.div variants={fV} className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{fontFamily:"'Playfair Display',serif", color:C.ink}}>
            <Calendar size={18} style={{color:C.gold}}/> Today's Appointments
          </h2>
          <p className="text-[11px] mt-0.5 flex items-center gap-1.5" style={{color:C.inkLight}}>
            {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
            {lastSync && <span>· Synced {lastSync.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>}
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" title="Auto-refreshing every 10s"/>
          </p>
        </div>
        <button onClick={()=>refresh(false)} disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-40"
          style={{background:C.white, color:C.inkMid, border:`1px solid ${C.creamBorder}`}}>
          <RefreshCw size={12} className={syncing?'animate-spin':''}/> Refresh
        </button>
      </motion.div>

      {/* Status pills */}
      {bookings.length > 0 && (
        <motion.div variants={fV} className="flex flex-wrap gap-2">
          {[
            {label:'In Service', count:inProgress.length, dot:'#10B981'},
            {label:'Upcoming',   count:upcoming.length,   dot:'#F59E0B'},
            {label:'Done',       count:done.length,       dot:'#3B82F6'},
            {label:'Cancelled',  count:cancelled.length,  dot:'#EF4444'},
          ].map(p=>(
            <span key={p.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{background:`${p.dot}12`, color:p.dot, border:`1px solid ${p.dot}22`}}>
              <span className="w-1.5 h-1.5 rounded-full" style={{background:p.dot}}/>
              {p.count} {p.label}
            </span>
          ))}
        </motion.div>
      )}

      {false ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{background:`linear-gradient(135deg,${C.gold},${C.goldLight})`}}>
            <Loader2 size={20} className="text-white animate-spin"/>
          </div>
          <p className="text-sm" style={{color:C.inkLight}}>Loading appointments…</p>
        </div>
      ) : bookings.length===0 ? (
        <motion.div variants={fV} className="flex flex-col items-center justify-center py-20 gap-3 rounded-2xl"
          style={{background:C.white, border:`1px solid ${C.creamBorder}`}}>
          <Calendar size={28} style={{color:C.creamBorder}}/>
          <p className="font-bold" style={{color:C.inkLight}}>No appointments today</p>
          <p className="text-xs" style={{color:C.inkLight}}>New bookings assigned by admin will appear here automatically</p>
        </motion.div>
      ) : (
        <div className="space-y-7">
          <Section emoji="🟢" title="In Service"  items={inProgress} accent="#10B981"/>
          <Section emoji="🟡" title="Upcoming"    items={upcoming}   accent="#F59E0B" showIfEmpty/>
          <Section emoji="✅" title="Completed"   items={done}       accent="#3B82F6"/>
          <Section emoji="❌" title="Cancelled"   items={cancelled}  accent="#EF4444"/>
        </div>
      )}
    </motion.div>
  );
}