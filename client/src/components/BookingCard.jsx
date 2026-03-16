import { useState } from 'react';
import {
  Clock, User, IndianRupee, Calendar, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Play, Banknote, Smartphone, CreditCard,
  Printer, MessageCircle, Hash, UserPlus, Loader2, ShieldCheck, AlertCircle,
} from 'lucide-react';
import api from '@/services/api';

const C = {
  cream:'#FDF8F0', creamDark:'#F5EDD8', creamBorder:'#E8D9B8',
  gold:'#B8860B', goldLight:'#DAA520', goldPale:'#FFF8E7',
  ink:'#1C1410', inkMid:'#5C4A2A', inkLight:'#9C8660', white:'#FFFFFF',
};
const STATUS = {
  pending:       { label:'Pending',     dot:'#F59E0B', bg:'#FFFBEB', border:'#FDE68A', text:'#92400E' },
  confirmed:     { label:'Confirmed',   dot:'#F59E0B', bg:'#FFFBEB', border:'#FDE68A', text:'#92400E' },
  'in-progress': { label:'In Progress', dot:'#10B981', bg:'#ECFDF5', border:'#A7F3D0', text:'#065F46' },
  completed:     { label:'Done',        dot:'#3B82F6', bg:'#EFF6FF', border:'#BFDBFE', text:'#1E40AF' },
  cancelled:     { label:'Cancelled',   dot:'#EF4444', bg:'#FEF2F2', border:'#FECACA', text:'#991B1B' },
  'no-show':     { label:'No Show',     dot:'#9CA3AF', bg:'#F9FAFB', border:'#E5E7EB', text:'#374151' },
};
const PAYMENT = {
  pending:  { label:'Unpaid',   bg:'#FFFBEB', text:'#92400E', border:'#FDE68A' },
  paid:     { label:'Paid ✓',   bg:'#ECFDF5', text:'#065F46', border:'#A7F3D0' },
  refunded: { label:'Refunded', bg:'#F5F3FF', text:'#4C1D95', border:'#DDD6FE' },
  partial:  { label:'Partial',  bg:'#FFF7ED', text:'#9A3412', border:'#FED7AA' },
};
const AVAIL_STYLE = {
  free:          { dot:'#10B981', bg:'#ECFDF5', text:'#065F46', label:'Free' },
  busy:          { dot:'#EF4444', bg:'#FEF2F2', text:'#991B1B', label:'Busy' },
  'not-available':{ dot:'#9CA3AF', bg:'#F9FAFB', text:'#6B7280', label:'Off' },
};

const fmtDate = d => new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
const fmtTime = t => {
  if (!t) return '';
  const [h,m] = t.split(':').map(Number);
  return `${h>12?h-12:h===0?12:h}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`;
};
const initials = n => (n||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';
const AVATARS  = ['#B8860B','#8B6914','#C9952A','#6B4F12','#DAA520'];

const makeRef = (id='',date) => {
  const d = date ? new Date(date) : new Date();
  return `GLM-${String(d.getFullYear()).slice(2)}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(id).slice(-4).toUpperCase()}`;
};

const printReceipt = (booking, ref, method) => {
  const win      = window.open('','_blank','width=420,height=700');
  const custName = booking.customer?.name||'Walk-in';
  const phone    = booking.customer?.phone||'—';
  const amount   = (booking.finalAmount||0).toLocaleString('en-IN');
  const payMethod= (method||booking.paymentMethod||'cash').toUpperCase();
  // Multi-service: use additionalServices array (new) or parse legacy notes
  const addSvcs  = booking.additionalServices||[];
  const allSvcs  = addSvcs.length>0 ? [booking.service,...addSvcs].filter(Boolean) : null;
  const legMatch = !allSvcs && booking.notes?.match(/^Multi-service:\s*([^.]+)/);
  const legNames = legMatch ? legMatch[1].split(',').map(s=>s.trim()).filter(Boolean) : null;
  const svcNames = allSvcs ? allSvcs.map(s=>s.name||'—') : legNames;
  const serviceCell = svcNames
    ? `<div class="cell" style="grid-column:1/-1"><div class="clabel">Services (${svcNames.length})</div><div class="cval">${svcNames.join(' · ')}</div></div>`
    : `<div class="cell"><div class="clabel">Service</div><div class="cval">${booking.service?.name||'—'}</div></div>`;
  const cleanNotes = booking.notes?.replace(/^Multi-service:[^.]*\.?\s*/,'').trim()||'';
  win.document.write(`<html><head><title>${ref}</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#FDF8F0;padding:24px;max-width:400px;margin:auto}
  .card{background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(184,134,11,0.12)}
  .hdr{background:linear-gradient(135deg,#1C1410,#2d2510);padding:22px 24px;text-align:center}
  .logo{font-family:'Playfair Display',serif;font-size:24px;color:#fff}.logo span{color:#DAA520}
  .sub{font-size:10px;color:#9C8660;letter-spacing:0.15em;text-transform:uppercase;margin-top:3px}
  .inv{display:inline-flex;align-items:center;gap:6px;margin-top:12px;background:rgba(218,165,32,0.15);border:1px solid rgba(218,165,32,0.3);border-radius:20px;padding:5px 14px;font-size:11px;font-weight:700;color:#DAA520}
  .body{padding:20px 22px}.sec{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#9C8660;margin:16px 0 8px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.cell{background:#FDF8F0;border-radius:10px;padding:8px 12px}
  .clabel{font-size:10px;color:#9C8660;font-weight:600;text-transform:uppercase}.cval{font-size:13px;font-weight:700;color:#1C1410;margin-top:2px}
  .svc{background:#FFF8E7;border:1px solid #E8D9B8;border-radius:12px;padding:12px 14px;margin-bottom:12px}
  table{width:100%;border-collapse:collapse;font-size:13px}td{padding:7px 0;border-bottom:1px dashed #F5EDD8}
  .tr td{font-weight:800;font-size:16px;border:none;padding-top:12px}.av{color:#B8860B}.green{color:#10B981}
  .ftr{background:#FDF8F0;border-top:1px solid #F5EDD8;padding:14px 22px;text-align:center}
  .ftr p{font-size:11px;color:#9C8660;line-height:1.8}.ftr strong{color:#B8860B}
  .pbtn{display:block;width:100%;padding:12px;background:linear-gradient(135deg,#B8860B,#DAA520);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;margin-top:18px}
  @media print{.pbtn{display:none}body{background:#fff;padding:0}.card{box-shadow:none;border-radius:0}}</style></head>
  <body><div class="card"><div class="hdr"><div class="logo">✂ Glamour<span>.</span></div><div class="sub">Premium Salon & Spa</div><div class="inv">🧾 ${ref}</div></div>
  <div class="body"><div class="sec">Customer & Booking</div><div class="grid">
  <div class="cell"><div class="clabel">Customer</div><div class="cval">${custName}</div></div>
  <div class="cell"><div class="clabel">Phone</div><div class="cval">${phone!=='—'?'+91 '+phone.replace(/\D/g,'').slice(-10):'—'}</div></div>
  <div class="cell"><div class="clabel">Date</div><div class="cval">${fmtDate(booking.date)}</div></div>
  <div class="cell"><div class="clabel">Stylist</div><div class="cval">${booking.staff?.name||'Any'}</div></div>
  ${serviceCell}
  <div class="cell"><div class="clabel">Payment</div><div class="cval">${payMethod}</div></div>
  </div><div class="sec">Amount</div>
  <table><tr><td>Original</td><td style="text-align:right">₹${(booking.totalAmount||0).toLocaleString('en-IN')}</td></tr>
  ${booking.discountAmount>0?`<tr><td class="green">Discount</td><td style="text-align:right" class="green">−₹${(booking.discountAmount||0).toLocaleString('en-IN')}</td></tr>`:''}
  <tr class="tr"><td>Total Paid</td><td style="text-align:right" class="av">₹${amount}</td></tr></table>
  ${cleanNotes?`<div style="margin-top:12px;padding:10px 14px;background:#FDF8F0;border-radius:10px;font-size:12px;color:#5C4A2A;font-style:italic">📝 ${cleanNotes}</div>`:''}
  </div><div class="ftr"><p>Thank you for choosing <strong>Glamour Salon</strong> 💛</p><p>Invoice: <strong>${ref}</strong></p></div></div>
  <button class="pbtn" onclick="window.print()">🖨 Print Invoice</button></body></html>`);
  win.document.close();
};

const sendWA = (booking, ref, method) => {
  const phone = (booking.customer?.phone||'').replace(/\D/g,'').slice(-10);
  if (!phone||phone.length<10) { alert('No phone number for this customer'); return; }
  const payMethod = (method||booking.paymentMethod||'cash').toUpperCase();
  // Multi-service: use additionalServices array (new) or parse legacy notes
  const addSvcs  = booking.additionalServices||[];
  const allSvcs  = addSvcs.length>0 ? [booking.service,...addSvcs].filter(Boolean) : null;
  const legMatch = !allSvcs && booking.notes?.match(/^Multi-service:\s*([^.]+)/);
  const legNames = legMatch ? legMatch[1].split(',').map(s=>s.trim()).filter(Boolean) : null;
  const svcNames = allSvcs ? allSvcs.map(s=>s.name||'—') : legNames;
  const serviceLine = svcNames
    ? `💆 *Services:*%0A${svcNames.map((n,i)=>`   ${i+1}. ${n}`).join('%0A')}`
    : `💆 *Service:* ${booking.service?.name||'—'}`;
  const msg = [
    `✂ *Glamour Salon — Invoice*`, ``,
    `Hi *${booking.customer?.name||'there'}*, your service is complete! 💛`, ``,
    `🧾 *Invoice:* \`${ref}\``, `📅 *Date:* ${fmtDate(booking.date)}`,
    serviceLine,
    `👩‍🎨 *Stylist:* ${booking.staff?.name||'Any'}`,
    booking.discountAmount>0 ? `🏷 *Discount:* −₹${(booking.discountAmount||0).toLocaleString('en-IN')}` : null,
    `💰 *Total:* ₹${(booking.finalAmount||0).toLocaleString('en-IN')} _(${payMethod})_`, ``,
    `_Thank you for visiting Glamour Salon!_ ✨`,
  ].filter(Boolean).join('%0A');
  window.open(`https://wa.me/91${phone}?text=${msg}`, '_blank');
};

export default function BookingCard({
  booking, onStatusChange, onAssignStaff,
  showActions=true, role='admin', viewMode='grid', index=0,
  staffAvailability=[],
}) {
  const [expanded,    setExpanded]    = useState(false);
  const [payModal,    setPayModal]    = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [selPayment,  setSelPayment]  = useState('cash');
  const [loading,     setLoading]     = useState(false);
  const [payLoading,  setPayLoading]  = useState(false);

  // All derived from props — updates instantly after fetchBookings()
  const isCompleted = booking.status === 'completed';
  const isPaid      = booking.paymentStatus === 'paid';
  const invoiceRef  = (isCompleted && isPaid) ? makeRef(booking._id, booking.date) : null;
  const isAdminLike = role==='admin' || role==='receptionist';
  const isStaff     = role==='staff';
  const isOnlinePaid = booking.type==='online' && isPaid;
  const needsPaymentVerify = isCompleted && !isPaid && isAdminLike;
  const isCancelled = booking.status==='cancelled';

  const st  = STATUS[booking.status] || STATUS.pending;
  const pmt = PAYMENT[booking.paymentStatus] || PAYMENT.pending;
  const av  = AVATARS[index % AVATARS.length];
  const custName = booking.customer?.name || 'Walk-in';

  // ── Multi-service detection ───────────────────────────────────────────────
  // Multi-service walk-ins store extra services in additionalServices array (new)
  // or fall back to parsing notes for legacy bookings ("Multi-service: S1, S2, ...")
  const additionalSvcs  = booking.additionalServices || [];
  const allServices     = additionalSvcs.length > 0
    ? [booking.service, ...additionalSvcs].filter(Boolean)
    : null;
  // Legacy fallback: parse notes
  const legacyMatch     = !allServices && booking.notes?.match(/^Multi-service:\s*([^.]+)/);
  const legacyNames     = legacyMatch ? legacyMatch[1].split(',').map(s=>s.trim()).filter(Boolean) : null;

  const isMulti         = !!(allServices || legacyNames);
  const displayServiceName = isMulti
    ? `${(allServices?.length || legacyNames?.length)} Services`
    : (booking.service?.name || '—');
  const serviceListForDisplay = allServices
    ? allServices.map(s => s.name || '—')
    : legacyNames || (booking.service?.name ? [booking.service.name] : []);
  const handleStart = async () => {
    setLoading(true);
    try { await onStatusChange(booking._id, 'in-progress'); }
    finally { setLoading(false); }
  };

  const handleDone = async () => {
    setLoading(true);
    try { await onStatusChange(booking._id, 'completed'); }
    finally { setLoading(false); }
  };

  // Dedicated payment verify — calls new /verify-payment endpoint
  const handleVerifyPayment = async () => {
    if (!payModal) { setPayModal(true); return; }
    setPayLoading(true);
    try {
      await api.patch(`/bookings/${booking._id}/verify-payment`, { method: selPayment });
      const ref = makeRef(booking._id, booking.date);
      await onStatusChange(booking._id, booking.status); // trigger re-fetch only
      setPayModal(false);
      if (booking.customer?.phone) setTimeout(()=>sendWA({...booking,paymentMethod:selPayment},ref,selPayment),700);
    } catch(e) {
      console.error('Payment verify error:', e);
    } finally { setPayLoading(false); }
  };

  const handleAssign = async (staffId) => {
    setLoading(true);
    try { await onAssignStaff(booking._id, staffId); setAssignModal(false); }
    finally { setLoading(false); }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this booking?')) return;
    setLoading(true);
    try { await onStatusChange(booking._id, 'cancelled'); }
    finally { setLoading(false); }
  };

  // ── Sub-components ───────────────────────────────────────────────────────
  const InvoiceBar = () => {
    if (!invoiceRef) return null;
    return (
      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl mb-3"
        style={{background:'linear-gradient(135deg,#FFF8E7,#FFF3D0)',border:`1px solid ${C.creamBorder}`}}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{background:C.gold}}>
            <Hash size={10} className="text-white"/>
          </div>
          <span className="text-xs font-bold font-mono tracking-wide" style={{color:C.inkMid}}>{invoiceRef}</span>
        </div>
        <div className="flex gap-1.5">
          <button onClick={()=>printReceipt(booking,invoiceRef,booking.paymentMethod||selPayment)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold hover:opacity-80 transition-opacity"
            style={{background:C.ink,color:'#fff'}}>
            <Printer size={10}/> Print
          </button>
          {booking.customer?.phone && (
            <button onClick={()=>sendWA(booking,invoiceRef,booking.paymentMethod||selPayment)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold hover:opacity-80 transition-opacity"
              style={{background:'#25D366',color:'#fff'}}>
              <MessageCircle size={10}/> WA
            </button>
          )}
        </div>
      </div>
    );
  };

  const PaymentModal = () => {
    if (!payModal) return null;
    return (
      <div className="mt-3 rounded-2xl p-4 space-y-3"
        style={{background:'linear-gradient(135deg,#FFF8E7,#FFFBEB)',border:`2px solid ${C.gold}30`}}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold" style={{color:C.inkMid}}>
            💰 Verify Payment · <span style={{color:C.gold}}>₹{(booking.finalAmount||0).toLocaleString('en-IN')}</span>
          </p>
          <button onClick={()=>setPayModal(false)} className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
            style={{background:C.creamDark,color:C.inkMid}}>✕</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[['cash','Cash',Banknote],['upi','UPI',Smartphone],['card','Card',CreditCard]].map(([v,l,Icon])=>(
            <button key={v} onClick={()=>setSelPayment(v)}
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{
                background: selPayment===v ? `linear-gradient(135deg,${C.gold},${C.goldLight})` : C.white,
                color: selPayment===v ? '#fff' : C.inkMid,
                border: `1px solid ${selPayment===v ? C.gold : C.creamBorder}`,
                transform: selPayment===v ? 'scale(1.03)' : 'scale(1)',
              }}>
              <Icon size={15}/>{l}
            </button>
          ))}
        </div>
        <button onClick={handleVerifyPayment} disabled={payLoading}
          className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
          style={{background:`linear-gradient(135deg,${C.gold},${C.goldLight})`,color:'#fff'}}>
          {payLoading ? <Loader2 size={13} className="animate-spin"/> : <><ShieldCheck size={13}/> Confirm — ₹{(booking.finalAmount||0).toLocaleString('en-IN')}</>}
        </button>
      </div>
    );
  };

  const AssignModal = () => {
    if (!assignModal) return null;
    return (
      <div className="mt-3 rounded-2xl p-4 space-y-2"
        style={{background:'#F5F3FF',border:'1px solid #C4B5FD'}}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-bold" style={{color:'#6D28D9'}}>
            <UserPlus size={11} style={{display:'inline',marginRight:4}}/>Assign Stylist
          </p>
          <button onClick={()=>setAssignModal(false)} className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
            style={{background:'#EDE9FE',color:'#6D28D9'}}>✕</button>
        </div>
        {/* Unassign */}
        <button onClick={()=>handleAssign(null)} disabled={loading}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
          style={{background:'#F9FAFB',border:'1px solid #E5E7EB',color:'#6B7280'}}>
          <span>Unassigned</span>
          {!booking.staff && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">Current</span>}
        </button>
        {staffAvailability.length===0 ? (
          <p className="text-xs text-center py-2" style={{color:C.inkLight}}>Loading staff…</p>
        ) : staffAvailability.map(s => {
          const sty = AVAIL_STYLE[s.availability] || AVAIL_STYLE['not-available'];
          const isCurrent = booking.staff?._id?.toString()===s._id?.toString() || booking.staff?.toString()===s._id?.toString();
          return (
            <button key={s._id}
              onClick={()=>s.availability!=='busy'&&handleAssign(s._id)}
              disabled={loading}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: isCurrent?'#EDE9FE':sty.bg,
                border: `1px solid ${isCurrent?'#C4B5FD':sty.dot+'33'}`,
                cursor: s.availability==='busy'?'not-allowed':'pointer',
                opacity: s.availability==='busy'?0.7:1,
              }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:sty.dot}}/>
                <span style={{color:C.ink,fontWeight:600}}>{s.name}</span>
                {s.designation && <span className="text-[10px] capitalize" style={{color:C.inkLight}}>{s.designation.replace(/_/g,' ')}</span>}
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:sty.bg,color:sty.text,border:`1px solid ${sty.dot}33`}}>
                {isCurrent ? '✓ Current' : sty.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  // ── List view ─────────────────────────────────────────────────────────────
  if (viewMode==='list') {
    return (
      <div className="rounded-xl overflow-hidden transition-all hover:shadow-md"
        style={{background:C.white,border:`1px solid ${needsPaymentVerify?'#FDE68A':C.creamBorder}`}}>
        <div className="flex items-center gap-3 px-4 py-3">
          {/* avatar */}
          <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
            style={{background:`linear-gradient(135deg,${av},${av}bb)`}}>{initials(custName)}</div>
          {/* name + service */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold truncate" style={{color:C.ink}}>{custName}</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                style={{background:booking.type==='walk-in'?'#F5F3FF':'#EFF6FF',color:booking.type==='walk-in'?'#6D28D9':'#1E40AF'}}>
                {booking.type==='walk-in'?'Walk-in':'Online'}
              </span>
            </div>
            <p className="text-xs truncate" style={{color:C.inkLight}}>
              {displayServiceName} · {booking.staff?.name||<span style={{color:'#EF4444'}}>Unassigned</span>}
              {invoiceRef && <span className="ml-2 font-mono font-bold" style={{color:C.gold}}>#{invoiceRef.slice(-8)}</span>}
            </p>
          </div>
          {/* status + amount */}
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border flex-shrink-0"
            style={{background:st.bg,borderColor:st.border,color:st.text}}>
            <span className="w-1.5 h-1.5 rounded-full" style={{background:st.dot}}/>
            {st.label}
          </span>
          <span className="text-sm font-bold flex-shrink-0" style={{color:C.gold}}>
            ₹{(booking.finalAmount||0).toLocaleString('en-IN')}
          </span>
          <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border flex-shrink-0"
            style={{background:pmt.bg,borderColor:pmt.border,color:pmt.text}}>{pmt.label}</span>
          {/* action buttons */}
          {showActions && !isCancelled && (
            <div className="flex gap-1.5 flex-shrink-0">
              {isAdminLike && !booking.staff && !isCompleted && (
                <button onClick={()=>setAssignModal(!assignModal)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-90"
                  style={{background:'#F5F3FF',color:'#6D28D9',border:'1px solid #C4B5FD'}}>
                  Assign
                </button>
              )}
              {(isAdminLike||isStaff) && booking.status==='confirmed' && (
                <button onClick={handleStart} disabled={loading}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-90"
                  style={{background:'#EFF6FF',color:'#1E40AF',border:'1px solid #BFDBFE'}}>
                  {loading?'…':'▶ Start'}
                </button>
              )}
              {booking.status==='in-progress' && (
                <button onClick={handleDone} disabled={loading}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-90"
                  style={{background:'linear-gradient(135deg,#166534,#16A34A)',color:'#fff'}}>
                  {loading?'…':'✓ Done'}
                </button>
              )}
              {needsPaymentVerify && (
                <button onClick={()=>setPayModal(!payModal)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold animate-pulse"
                  style={{background:`linear-gradient(135deg,${C.gold},${C.goldLight})`,color:'#fff'}}>
                  💰 Verify
                </button>
              )}
              {invoiceRef && (
                <button onClick={()=>printReceipt(booking,invoiceRef,booking.paymentMethod)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:opacity-80"
                  style={{background:C.goldPale,border:`1px solid ${C.creamBorder}`}}>
                  <Printer size={11} style={{color:C.gold}}/>
                </button>
              )}
            </div>
          )}
        </div>
        {/* expanded modals */}
        {(payModal||assignModal) && (
          <div className="px-4 pb-3">
            <PaymentModal/>
            <AssignModal/>
          </div>
        )}
      </div>
    );
  }

  // ── Grid view ─────────────────────────────────────────────────────────────
  const borderColor = needsPaymentVerify ? '#FDE68A' : isCancelled ? '#FECACA' : isCompleted&&isPaid ? '#A7F3D0' : C.creamBorder;
  const topBar = needsPaymentVerify
    ? `linear-gradient(90deg,#F59E0B,#FDE68A,#F59E0B)`
    : isPaid&&isCompleted
    ? 'linear-gradient(90deg,#10B981,#34D399)'
    : booking.status==='in-progress'
    ? 'linear-gradient(90deg,#3B82F6,#60A5FA)'
    : `linear-gradient(90deg,${C.gold},${C.goldLight},transparent)`;

  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg"
      style={{background:C.white,border:`1px solid ${borderColor}`,
        boxShadow: needsPaymentVerify ? `0 0 0 2px ${C.gold}22, 0 4px 16px rgba(184,134,11,0.1)` : '0 2px 12px rgba(184,134,11,0.05)'}}>

      {/* animated top accent bar */}
      <div className="h-1" style={{background:topBar,
        animation: needsPaymentVerify ? 'shimmer 2s ease-in-out infinite' : 'none'}}/>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{background:`linear-gradient(135deg,${av},${av}aa)`}}>
              {initials(custName)}
            </div>
            <div>
              <p className="text-sm font-bold leading-tight" style={{color:C.ink}}>{custName}</p>
              <p className="text-[11px] mt-0.5" style={{color:C.inkLight}}>
                {booking.customer?.phone
                  ? `+91 ${booking.customer.phone.replace(/\D/g,'').slice(-10)}`
                  : booking.type==='walk-in' ? 'Walk-in customer' : 'Online booking'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border"
              style={{background:st.bg,borderColor:st.border,color:st.text}}>
              <span className="w-1.5 h-1.5 rounded-full" style={{background:st.dot}}/>
              {st.label}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold"
              style={{background:booking.type==='walk-in'?'#F5F3FF':'#EFF6FF',
                color:booking.type==='walk-in'?'#6D28D9':'#1E40AF',
                border:`1px solid ${booking.type==='walk-in'?'#DDD6FE':'#BFDBFE'}`}}>
              {booking.type==='walk-in'?'🚶 Walk-in':'🌐 Online'}
            </span>
          </div>
        </div>

        <InvoiceBar/>

        {/* Service */}
        <div className="rounded-xl px-4 py-3 mb-4"
          style={{background:C.goldPale,border:`1px solid ${C.creamBorder}`}}>
          <p className="text-sm font-bold" style={{color:C.ink}}>{displayServiceName}</p>
          {isMulti ? (
            <div className="mt-1.5 space-y-1">
              {serviceListForDisplay.map((name, i) => (
                <p key={i} className="text-[11px] flex items-center gap-1.5" style={{color:C.inkLight}}>
                  <span className="w-1 h-1 rounded-full inline-block flex-shrink-0" style={{background:C.gold}}/>
                  {name}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-[11px] mt-0.5 capitalize" style={{color:C.inkLight}}>
              {booking.service?.category} · {booking.service?.duration} min
            </p>
          )}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            {icon:Calendar,    label:'Date',    value:fmtDate(booking.date)},
            {icon:Clock,       label:'Time',    value:`${fmtTime(booking.timeSlot?.start)}–${fmtTime(booking.timeSlot?.end)}`},
            {icon:User,        label:'Stylist', value:booking.staff?.name||'Unassigned', warn:!booking.staff},
            {icon:IndianRupee, label:'Amount',  value:`₹${(booking.finalAmount||0).toLocaleString('en-IN')}`, gold:true},
          ].map(item=>{
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{background:item.warn?'#FEF2F2':C.goldPale}}>
                  <Icon size={13} style={{color:item.warn?'#EF4444':C.gold}}/>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{color:C.inkLight}}>{item.label}</p>
                  <p className="text-xs font-bold" style={{color:item.gold?C.gold:item.warn?'#DC2626':C.ink}}>{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment + action row */}
        <div className="flex items-center justify-between pt-3"
          style={{borderTop:`1px solid ${C.creamDark}`}}>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border"
            style={{background:pmt.bg,borderColor:pmt.border,color:pmt.text}}>
            <span className="w-1.5 h-1.5 rounded-full" style={{background:pmt.text}}/>
            {pmt.label}
          </span>
          {isOnlinePaid && !isCompleted && (
            <span className="flex items-center gap-1 text-[11px] font-semibold" style={{color:'#065F46'}}>
              <ShieldCheck size={11}/>Verified online
            </span>
          )}
          {needsPaymentVerify && !payModal && (
            <span className="text-[11px] font-semibold flex items-center gap-1" style={{color:'#92400E'}}>
              <AlertCircle size={11}/>Awaiting verification
            </span>
          )}
        </div>

        {/* Action buttons */}
        {showActions && !isCancelled && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3" style={{borderTop:`1px solid ${C.creamDark}`}}>
            {/* Assign */}
            {isAdminLike && !isCompleted && (
              <button onClick={()=>{setAssignModal(!assignModal);setPayModal(false);}}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                style={{background:assignModal?'#EDE9FE':'#F5F3FF',color:'#6D28D9',border:`1px solid ${assignModal?'#A78BFA':'#C4B5FD'}`}}>
                <UserPlus size={10}/>
                {booking.staff ? 'Reassign' : 'Assign'}
              </button>
            )}
            {/* Start */}
            {(isAdminLike||isStaff) && booking.status==='confirmed' && (
              <button onClick={handleStart} disabled={loading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-90 disabled:opacity-50"
                style={{background:'#EFF6FF',color:'#1E40AF',border:'1px solid #BFDBFE'}}>
                {loading?<Loader2 size={11} className="animate-spin"/>:<><Play size={11} fill="#1E40AF"/>Start Service</>}
              </button>
            )}
            {/* Mark done */}
            {(isAdminLike||isStaff) && booking.status==='in-progress' && (
              <button onClick={handleDone} disabled={loading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-90 disabled:opacity-50"
                style={{background:'linear-gradient(135deg,#166534,#16A34A)',color:'#fff'}}>
                {loading?<Loader2 size={11} className="animate-spin"/>:<><CheckCircle2 size={11}/>Mark Done</>}
              </button>
            )}
            {/* Verify Payment */}
            {needsPaymentVerify && (
              <button onClick={()=>{setPayModal(!payModal);setAssignModal(false);}}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                style={{
                  background: payModal ? `linear-gradient(135deg,${C.inkMid},${C.ink})` : `linear-gradient(135deg,${C.gold},${C.goldLight})`,
                  color:'#fff',
                  animation: !payModal ? 'pulse 2s ease-in-out infinite' : 'none',
                }}>
                <ShieldCheck size={11}/>Verify Payment
              </button>
            )}
            {/* Cancel */}
            {isAdminLike && !isCompleted && (
              <button onClick={handleCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90 ml-auto"
                style={{background:'#FEF2F2',color:'#991B1B',border:'1px solid #FECACA'}}>
                <XCircle size={10}/>Cancel
              </button>
            )}
          </div>
        )}

        <PaymentModal/>
        <AssignModal/>

        {/* Notes */}
        {booking.notes && (
          <div className="mt-3">
            <button onClick={()=>setExpanded(!expanded)}
              className="flex items-center gap-1 text-[11px] font-semibold transition-all hover:opacity-70"
              style={{color:C.inkLight}}>
              {expanded?<ChevronUp size={11}/>:<ChevronDown size={11}/>}
              {expanded?'Hide note':'View note'}
            </button>
            {expanded && (
              <p className="mt-2 text-xs italic px-3 py-2.5 rounded-xl"
                style={{color:C.inkMid,background:C.cream,border:`1px solid ${C.creamBorder}`}}>
                {booking.notes}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}