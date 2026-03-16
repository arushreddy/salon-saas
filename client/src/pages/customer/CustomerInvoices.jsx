import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hash, FileText, Sparkles, Calendar, Clock,
  Scissors, User, IndianRupee, Download, Printer,
  ChevronDown, ChevronUp, CheckCircle2, Star,
} from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';

// ─── tokens ───────────────────────────────────────────────────────────────────
const C = {
  cream:'#FDF8F0', creamDark:'#F5EDD8', creamBorder:'#E8D9B8',
  gold:'#B8860B', goldLight:'#DAA520', goldPale:'#FFF8E7',
  ink:'#1C1410', inkMid:'#5C4A2A', inkLight:'#9C8660', white:'#FFFFFF',
};

const fade    = { hidden:{opacity:0,y:14}, show:{opacity:1,y:0,transition:{duration:0.45,ease:[0.22,0.61,0.36,1]}} };
const stagger = { hidden:{opacity:0}, show:{opacity:1,transition:{staggerChildren:0.06}} };

const fmtDate = d => new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
const fmtTime = t => { if(!t) return ''; const [h,m]=t.split(':').map(Number); const p=h>=12?'PM':'AM'; const dh=h>12?h-12:h===0?12:h; return `${dh}:${String(m).padStart(2,'0')} ${p}`; };

const PAYMENT_METHODS = { cash:'💵 Cash', upi:'📱 UPI', card:'💳 Card' };

// ─── print receipt for customer ───────────────────────────────────────────────
const printMyReceipt = (booking) => {
  const ref    = `GLM-${String(booking.date||'').slice(2,4)}${String(new Date(booking.date).getMonth()+1).toString().padStart(2,'0')}${String(new Date(booking.date).getDate()).toString().padStart(2,'0')}-${String(booking._id).slice(-4).toUpperCase()}`;
  const win    = window.open('','_blank','width=420,height=640');
  const amount = (booking.finalAmount||0).toLocaleString('en-IN');
  win.document.write(`
    <html><head><title>My Invoice ${ref}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'DM Sans',sans-serif;background:#FDF8F0;padding:24px;max-width:380px;margin:auto;color:#1C1410}
      .card{background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(184,134,11,0.12)}
      .hdr{background:linear-gradient(135deg,#1C1410,#2d2510);padding:22px;text-align:center;position:relative}
      .hdr::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(45deg,#B8860B 0,#B8860B 1px,transparent 0,transparent 50%);background-size:16px 16px;opacity:0.08}
      .logo{font-family:'Playfair Display',serif;font-size:22px;color:#fff;position:relative}
      .logo span{color:#DAA520}
      .sub{font-size:10px;color:#9C8660;letter-spacing:0.15em;text-transform:uppercase;position:relative;margin-top:3px}
      .ref{display:inline-block;margin-top:12px;background:rgba(218,165,32,0.15);border:1px solid rgba(218,165,32,0.3);border-radius:20px;padding:5px 14px;font-size:11px;font-weight:700;color:#DAA520;position:relative}
      .body{padding:20px}
      .sec{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#9C8660;margin:14px 0 8px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .cell{background:#FDF8F0;border-radius:10px;padding:8px 12px}
      .cl{font-size:10px;color:#9C8660;font-weight:600;text-transform:uppercase}
      .cv{font-size:13px;font-weight:700;color:#1C1410;margin-top:2px}
      .sbox{background:#FFF8E7;border:1px solid #E8D9B8;border-radius:12px;padding:12px}
      .sname{font-family:'Playfair Display',serif;font-size:15px;font-weight:700}
      table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
      td{padding:7px 0;border-bottom:1px dashed #F5EDD8}
      .tr td{font-weight:800;font-size:15px;border:none;padding-top:10px;color:#1C1410}
      .av{color:#B8860B}
      .ftr{background:#FDF8F0;border-top:1px solid #F5EDD8;padding:14px;text-align:center}
      .ftr p{font-size:11px;color:#9C8660;line-height:1.8}
      .ftr strong{color:#B8860B}
      .pbtn{display:block;width:100%;padding:12px;background:linear-gradient(135deg,#B8860B,#DAA520);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;margin-top:16px}
      @media print{.pbtn{display:none}body{background:#fff;padding:0}.card{box-shadow:none;border-radius:0}}
    </style></head><body>
    <div class="card">
      <div class="hdr">
        <div class="logo">✂ Glamour<span>.</span></div>
        <div class="sub">Your Personal Invoice</div>
        <div class="ref">🧾 ${ref}</div>
      </div>
      <div class="body">
        <div class="sec">Visit Details</div>
        <div class="grid">
          <div class="cell"><div class="cl">Date</div><div class="cv">${fmtDate(booking.date)}</div></div>
          <div class="cell"><div class="cl">Time</div><div class="cv">${fmtTime(booking.timeSlot?.start)}</div></div>
          <div class="cell"><div class="cl">Stylist</div><div class="cv">${booking.staff?.name||'Any'}</div></div>
          <div class="cell"><div class="cl">Payment</div><div class="cv">${(booking.paymentMethod||'cash').toUpperCase()}</div></div>
        </div>
        <div class="sec">Service</div>
        <div class="sbox">
          <div class="sname">${booking.service?.name||'—'}</div>
          <div style="font-size:11px;color:#9C8660;margin-top:3px">${booking.service?.category||''} · ${booking.service?.duration||'—'} min</div>
        </div>
        <div class="sec">Amount</div>
        <table>
          ${booking.totalAmount?(booking.totalAmount!==booking.finalAmount?`<tr><td>Original Price</td><td style="text-align:right">₹${(booking.totalAmount||0).toLocaleString('en-IN')}</td></tr>`:''):''}
          ${(booking.discountAmount||0)>0?`<tr><td style="color:#10B981">You Saved</td><td style="text-align:right;color:#10B981">−₹${(booking.discountAmount||0).toLocaleString('en-IN')}</td></tr>`:''}
          <tr class="tr"><td>Total Paid</td><td style="text-align:right" class="av">₹${amount}</td></tr>
        </table>
        ${booking.notes?`<div style="margin-top:12px;padding:10px;background:#FDF8F0;border-radius:10px;font-size:12px;color:#5C4A2A;font-style:italic">📝 ${booking.notes}</div>`:''}
      </div>
      <div class="ftr">
        <p>Thank you for visiting <strong>Glamour Salon</strong> 💛</p>
        <p>We look forward to seeing you again!</p>
        <p style="margin-top:4px;font-size:10px;color:#b5a080">Ref: ${ref}</p>
      </div>
    </div>
    <button class="pbtn" onclick="window.print()">🖨 &nbsp;Save / Print Receipt</button>
    </body></html>
  `);
  win.document.close();
};

// ═════════════════════════════════════════════════════════════════════════════
export default function CustomerInvoices() {
  const { user }      = useAuth();
  const [bookings,    setBookings]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [expanded,    setExpanded]    = useState(null);
  const [activeTab,   setActiveTab]   = useState('all'); // all | completed | upcoming

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/bookings/my?limit=50');
        setBookings(data.bookings || []);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const completed  = bookings.filter(b => b.status === 'completed');
  const upcoming   = bookings.filter(b => ['confirmed','in-progress'].includes(b.status));
  const displayed  = activeTab === 'completed' ? completed : activeTab === 'upcoming' ? upcoming : bookings;

  const totalSpent = completed.reduce((s,b) => s+(b.finalAmount||0), 0);
  const totalSaved = completed.reduce((s,b) => s+(b.discountAmount||0), 0);
  const visits     = completed.length;

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background:`linear-gradient(135deg,${C.gold},${C.goldLight})` }}>
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="space-y-6 pb-12"
      style={{ fontFamily:"'DM Sans',sans-serif" }}>

      {/* ── greeting header ── */}
      <motion.div variants={fade}
        className="relative overflow-hidden rounded-2xl px-6 py-5"
        style={{ background:`linear-gradient(135deg,${C.ink},#2d2510)` }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage:'repeating-linear-gradient(45deg,#B8860B 0,#B8860B 1px,transparent 0,transparent 50%)', backgroundSize:'18px 18px' }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={12} style={{ color:C.goldLight }} />
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color:C.goldLight }}>My Invoices</span>
          </div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily:"'Playfair Display',serif" }}>
            Your Visit History
          </h1>
          <p className="text-sm mt-1" style={{ color:'#9ca3af' }}>
            {visits} visit{visits!==1?'s':''} · All your receipts in one place
          </p>
        </div>
      </motion.div>

      {/* ── loyalty / spend summary ── */}
      {visits > 0 && (
        <motion.div variants={fade}
          className="grid grid-cols-3 gap-3">
          {[
            { label:'Total Visits',  value:visits,                                          icon:CheckCircle2, accent:'#10B981' },
            { label:'Total Spent',   value:`₹${totalSpent.toLocaleString('en-IN')}`,         icon:IndianRupee,  accent:C.gold    },
            { label:'Total Saved',   value:`₹${totalSaved.toLocaleString('en-IN')}`,         icon:Star,         accent:'#F59E0B' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label}
                className="rounded-2xl p-4 text-center"
                style={{ background:C.white, border:`1px solid ${C.creamBorder}`, boxShadow:'0 2px 10px rgba(184,134,11,0.05)' }}>
                <div className="w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center"
                  style={{ background:`${s.accent}18` }}>
                  <Icon size={15} style={{ color:s.accent }} />
                </div>
                <p className="text-lg font-bold" style={{ fontFamily:"'Playfair Display',serif", color:C.ink }}>{s.value}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color:C.inkLight }}>{s.label}</p>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* ── tabs ── */}
      <motion.div variants={fade} className="flex gap-2">
        {[['all',`All (${bookings.length})`],['completed',`Completed (${completed.length})`],['upcoming',`Upcoming (${upcoming.length})`]].map(([v,l]) => (
          <button key={v} onClick={()=>setActiveTab(v)}
            className="px-4 py-2 rounded-full text-xs font-bold transition-all"
            style={{
              background: activeTab===v ? `linear-gradient(135deg,${C.gold},${C.goldLight})` : C.white,
              color: activeTab===v ? '#fff' : C.inkMid,
              border:`1px solid ${activeTab===v ? C.gold : C.creamBorder}`,
            }}>{l}</button>
        ))}
      </motion.div>

      {/* ── invoice cards ── */}
      {displayed.length === 0 ? (
        <motion.div variants={fade}
          className="flex flex-col items-center justify-center py-20 rounded-2xl gap-3"
          style={{ background:C.white, border:`2px dashed ${C.creamBorder}` }}>
          <FileText size={28} style={{ color:C.creamBorder }} />
          <p className="text-sm font-semibold" style={{ color:C.inkLight }}>
            {activeTab==='completed' ? 'No completed bookings yet' : activeTab==='upcoming' ? 'No upcoming bookings' : 'No bookings yet'}
          </p>
        </motion.div>
      ) : (
        <motion.div variants={stagger} className="space-y-3">
          {displayed.map((b, i) => {
            const isCompleted = b.status === 'completed';
            const isOpen      = expanded === b._id;
            const ref         = `GLM-${String(b.date||'').slice(2,4)}${String(new Date(b.date).getMonth()+1).toString().padStart(2,'0')}${String(new Date(b.date).getDate()).toString().padStart(2,'0')}-${String(b._id).slice(-4).toUpperCase()}`;
            const statusColors = {
              completed:     { bg:'#EFF6FF', text:'#1E40AF', dot:'#3B82F6', border:'#BFDBFE', label:'Completed' },
              confirmed:     { bg:'#FFFBEB', text:'#92400E', dot:'#F59E0B', border:'#FDE68A', label:'Confirmed' },
              'in-progress': { bg:'#ECFDF5', text:'#065F46', dot:'#10B981', border:'#A7F3D0', label:'In Progress' },
              cancelled:     { bg:'#FEF2F2', text:'#991B1B', dot:'#EF4444', border:'#FECACA', label:'Cancelled' },
            };
            const sc = statusColors[b.status] || statusColors.confirmed;

            return (
              <motion.div key={b._id} variants={fade}
                className="rounded-2xl overflow-hidden"
                style={{ background:C.white, border:`1px solid ${C.creamBorder}`, boxShadow:'0 2px 10px rgba(184,134,11,0.04)' }}>

                {/* top accent */}
                <div className="h-0.5" style={{ background: isCompleted ? `linear-gradient(to right,${C.gold},${C.goldLight},transparent)` : `linear-gradient(to right,#E5E7EB,transparent)` }} />

                <div className="p-5">
                  {/* top row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-base font-bold" style={{ fontFamily:"'Playfair Display',serif", color:C.ink }}>
                          {b.service?.name || '—'}
                        </p>
                        {isCompleted && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background:C.goldPale, color:C.gold, border:`1px solid ${C.creamBorder}` }}>
                            <Hash size={8}/>{ref}
                          </span>
                        )}
                      </div>
                      <p className="text-xs capitalize" style={{ color:C.inkLight }}>
                        {b.service?.category} · {b.service?.duration} min
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border ml-3 flex-shrink-0"
                      style={{ background:sc.bg, borderColor:sc.border, color:sc.text }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background:sc.dot }} />
                      {sc.label}
                    </span>
                  </div>

                  {/* detail pills */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[
                      { icon:Calendar, text:fmtDate(b.date) },
                      { icon:Clock,    text:fmtTime(b.timeSlot?.start) },
                      b.staff && { icon:User, text:b.staff.name },
                    ].filter(Boolean).map((item,j) => {
                      const Icon = item.icon;
                      return (
                        <span key={j} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                          style={{ background:C.cream, color:C.inkMid, border:`1px solid ${C.creamBorder}` }}>
                          <Icon size={11} style={{ color:C.gold }} />
                          {item.text}
                        </span>
                      );
                    })}
                    {isCompleted && (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                        style={{ background:C.cream, color:C.inkMid, border:`1px solid ${C.creamBorder}` }}>
                        {PAYMENT_METHODS[b.paymentMethod]||'💵 Cash'}
                      </span>
                    )}
                  </div>

                  {/* amount + actions */}
                  <div className="flex items-center justify-between pt-3"
                    style={{ borderTop:`1px solid ${C.creamDark}` }}>
                    <div>
                      <p className="text-xl font-bold" style={{ fontFamily:"'Playfair Display',serif", color: isCompleted ? C.gold : C.ink }}>
                        ₹{(b.finalAmount||0).toLocaleString('en-IN')}
                      </p>
                      {(b.discountAmount||0) > 0 && (
                        <p className="text-[11px] font-semibold" style={{ color:'#10B981' }}>
                          You saved ₹{(b.discountAmount||0).toLocaleString('en-IN')} 🎉
                        </p>
                      )}
                    </div>
                    {isCompleted && (
                      <div className="flex gap-2">
                        <button onClick={()=>printMyReceipt(b)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                          style={{ background:`linear-gradient(135deg,${C.gold},${C.goldLight})`, color:'#fff' }}>
                          <Printer size={13} /> Print Receipt
                        </button>
                        <button onClick={()=>setExpanded(isOpen?null:b._id)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:opacity-70"
                          style={{ background:C.cream, border:`1px solid ${C.creamBorder}` }}>
                          {isOpen ? <ChevronUp size={14} style={{ color:C.inkLight }}/> : <ChevronDown size={14} style={{ color:C.inkLight }}/>}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* expanded breakdown */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
                        className="overflow-hidden">
                        <div className="mt-4 rounded-xl p-4 space-y-2"
                          style={{ background:C.goldPale, border:`1px solid ${C.creamBorder}` }}>
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color:C.inkMid }}>
                            Billing Breakdown
                          </p>
                          <div className="flex justify-between text-sm" style={{ color:C.inkMid }}>
                            <span>Service Price</span>
                            <span>₹{(b.totalAmount||b.finalAmount||0).toLocaleString('en-IN')}</span>
                          </div>
                          {(b.discountAmount||0) > 0 && (
                            <div className="flex justify-between text-sm" style={{ color:'#10B981' }}>
                              <span>Discount</span>
                              <span>−₹{(b.discountAmount||0).toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm font-bold pt-2"
                            style={{ borderTop:`1px solid ${C.creamBorder}`, color:C.ink }}>
                            <span>Total Paid</span>
                            <span style={{ color:C.gold }}>₹{(b.finalAmount||0).toLocaleString('en-IN')}</span>
                          </div>
                          {b.notes && (
                            <p className="text-xs italic pt-1" style={{ color:C.inkMid, borderTop:`1px solid ${C.creamBorder}` }}>
                              📝 {b.notes}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

    </motion.div>
  );
}