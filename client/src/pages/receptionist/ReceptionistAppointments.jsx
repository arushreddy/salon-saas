import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDataStore, broadcastChange } from "@/context/DataStore";
import api from "@/services/api";
import { Search, Plus, X, Wallet, CreditCard, Smartphone, Scissors, Download, Printer, MessageCircle, Share2, Check, Star } from "lucide-react";

const C = {
  cream:'#FDF8F0', creamMid:'#F7EFD8', creamDark:'#EDE0C0', creamBorder:'#DFD0A8',
  goldMid:'#B8860B', goldPale:'#FFF8E7', ink:'#16100A', inkMid:'#5A4020',
  inkFaint:'#B09060', inkGhost:'#D4B890', ok:'#285C3A', okPale:'#EAF4EE',
  risk:'#7A2020', riskPale:'#FEF2F2', warn:'#6B4800', warnPale:'#FEF3DC',
  blue:'#1D4ED8', bluePale:'#EFF6FF',
};

const IST = 5.5 * 3600000;
const todayStr = () => new Date(Date.now() + IST).toISOString().split('T')[0];

const STATUS_META = {
  all:           { label:'All',         color:C.ink,    bg:C.creamMid  },
  confirmed:     { label:'Confirmed',   color:C.blue,   bg:C.bluePale  },
  'in-progress': { label:'In Progress', color:C.warn,   bg:C.warnPale  },
  completed:     { label:'Completed',   color:C.ok,     bg:C.okPale    },
  cancelled:     { label:'Cancelled',   color:C.risk,   bg:C.riskPale  },
  pending:       { label:'Pending',     color:C.goldMid,bg:C.goldPale  },
};

const PAY_METHODS = [
  { value:'cash', label:'Cash', icon:Wallet },
  { value:'upi',  label:'UPI',  icon:Smartphone },
  { value:'card', label:'Card', icon:CreditCard },
];

const card = { background:'#fff', border:`1px solid #DFD0A8`, borderRadius:16, boxShadow:'0 1px 3px rgba(180,130,0,0.06)' };

// Indian mobile numbers are always 10 digits.
// NEVER use startsWith('91') — a number like 9177799653 starts with 91
// but is still a 10-digit local number that needs the prefix added.
const toWAPhone = (raw) => {
  if (!raw) return null;
  const d = raw.replace(/\D/g, '');          // strip non-digits
  if (d.length === 10) return '91' + d;       // 9177799653  → 919177799653
  if (d.length === 12 && d.startsWith('91')) return d; // already full
  if (d.length === 11 && d.startsWith('0'))  return '91' + d.slice(1); // 09177799653
  return '91' + d;                            // fallback — add prefix
};


function exportCSV(rows, headers, filename) {
  // Excel auto-converts phones (scientific notation) and dates (date serial).
  // Solution: wrap purely-numeric and date-like values with ="..." which is
  // an Excel text-formula that always yields the literal string unchanged.
  const isNumeric  = (s) => /^\d+$/.test(s);
  const isDateLike = (s) => /^\d{1,4}[\-\/.]\d{1,2}[\-\/.]\d{2,4}$/.test(s);
  const cell = (v) => {
    if (v === null || v === undefined) return '""';
    const s = String(v);
    if (isNumeric(s) || isDateLike(s)) return '="' + s.replace(/"/g, '""') + '"';
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => cell(r[h])).join(','))
  ].join('\n');
  const bom  = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Payment Modal ─────────────────────────────────────────────────────────────
// Key fixes:
//   1. Overlay is a flex container that centres the card — no transform translate
//   2. Card uses flex column with fixed header/footer and scrollable body
//   3. No overflow:hidden on the outer wrapper (was cutting off buttons)
function PaymentModal({ booking, onConfirm, onClose, saving }) {
  const [method, setMethod] = useState('cash');
  if (!booking) return null;
  const amt   = booking.finalAmount || booking.totalAmount || 0;
  const disc  = booking.discountAmount || 0;
  const gross = booking.totalAmount || amt;

  return (
    <>
      {/* Backdrop — also acts as the flex centering wrapper */}
      <motion.div
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        onClick={onClose}
        style={{
          position:'fixed', inset:0, zIndex:200,
          background:'rgba(22,16,10,0.55)',
          display:'flex', alignItems:'center', justifyContent:'center',
          padding:'20px',
        }}
      >
        {/* Card — stop click propagation so backdrop click doesn't fire inside */}
        <motion.div
          onClick={e => e.stopPropagation()}
          initial={{ opacity:0, scale:0.94, y:12 }}
          animate={{ opacity:1, scale:1,    y:0  }}
          exit={{    opacity:0, scale:0.94       }}
          transition={{ type:'spring', damping:26, stiffness:320 }}
          style={{
            width:'100%', maxWidth:400,
            background:C.cream, borderRadius:20,
            boxShadow:'0 24px 64px rgba(0,0,0,0.22)',
            display:'flex', flexDirection:'column',
            maxHeight:'calc(100vh - 40px)',   /* never taller than viewport */
          }}
        >
          {/* ── Header ── */}
          <div style={{
            padding:'18px 22px', flexShrink:0,
            borderBottom:`1px solid ${C.creamBorder}`,
            display:'flex', alignItems:'center', justifyContent:'space-between',
          }}>
            <h2 style={{ fontFamily:'Playfair Display,serif', fontSize:17, fontWeight:700, color:C.ink, margin:0 }}>
              Collect Payment
            </h2>
            <button onClick={onClose} style={{ padding:7, borderRadius:8, border:'none', background:C.creamMid, cursor:'pointer', color:C.inkMid, display:'flex' }}>
              <X size={15}/>
            </button>
          </div>

          {/* ── Scrollable body ── */}
          <div style={{ padding:'20px 22px', overflowY:'auto', flex:1 }}>
            {/* Amount summary card */}
            <div style={{ background:'#fff', borderRadius:14, padding:'14px 16px', marginBottom:20, border:`1px solid ${C.creamBorder}` }}>
              <Row label="Customer" value={booking.customer?.name||'Guest'}/>
              <Row label="Service"  value={booking.service?.name||'—'}/>
              {disc > 0 && <>
                <Row label="Price"    value={`₹${gross.toLocaleString('en-IN')}`} valueStyle={{ textDecoration:'line-through', color:C.inkFaint }}/>
                <Row label="Discount" value={`−₹${disc.toLocaleString('en-IN')}`} valueStyle={{ color:C.ok, fontWeight:600 }}/>
              </>}
              <div style={{ borderTop:`1px solid ${C.creamBorder}`, paddingTop:12, marginTop:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:15, fontWeight:700, color:C.ink }}>Amount Due</span>
                <span style={{ fontSize:30, fontWeight:800, color:C.ink, lineHeight:1 }}>₹{amt.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Payment method */}
            <p style={{ fontSize:11, fontWeight:700, color:C.inkFaint, marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>
              Choose Payment Method
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              {PAY_METHODS.map(({ value, label, icon:Icon }) => (
                <button key={value} onClick={() => setMethod(value)}
                  style={{
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                    gap:7, padding:'16px 8px', borderRadius:14,
                    border:`2.5px solid ${method===value ? C.goldMid : C.creamBorder}`,
                    background: method===value ? C.goldPale : '#fff',
                    color: method===value ? C.goldMid : C.inkFaint,
                    cursor:'pointer', transition:'all 0.15s', minHeight:80,
                  }}>
                  <Icon size={22}/>
                  <span style={{ fontSize:12, fontWeight:700 }}>{label}</span>
                  {method===value && (
                    <div style={{ width:6, height:6, borderRadius:'50%', background:C.goldMid }}/>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Footer — always visible ── */}
          <div style={{
            padding:'16px 22px', flexShrink:0,
            borderTop:`1px solid ${C.creamBorder}`,
            display:'flex', gap:10,
          }}>
            <button onClick={onClose}
              style={{ flex:1, padding:'13px', borderRadius:100, border:`1px solid ${C.creamBorder}`, background:'#fff', color:C.inkMid, fontSize:14, fontWeight:600, cursor:'pointer' }}>
              Cancel
            </button>
            <button onClick={() => onConfirm(method)} disabled={saving}
              style={{ flex:2, padding:'13px', borderRadius:100, border:'none', background:C.ok, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', opacity:saving?0.6:1 }}>
              {saving ? 'Saving…' : `Confirm ${method==='cash'?'💵 Cash':method==='upi'?'📱 UPI':'💳 Card'} · ₹${amt.toLocaleString('en-IN')}`}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}


// ── WhatsApp quick messages — text filled from settings at runtime ──────────────
const POST_PAYMENT_MSGS = [
  { label:'Thank you! 💛',     text:'Hi %name%! Thank you for visiting *{salonName}* today. We hope you loved your service! See you soon 😊' },
  { label:'Receipt via WA',    text:null }, // handled separately — sends full receipt
  { label:'Rate us ⭐',         text:'Hi %name%! We\'d love to know how your experience was at *{salonName}*. A quick review means the world to us! 🙏' },
  { label:'Book next visit',   text:'Hi %name%! It was great having you today at *{salonName}*. Ready to book your next appointment? Just reply here! 📅' },
  { label:'Refer a friend 🎁', text:'Hi %name%! Loved your service today? Refer a friend to *{salonName}* and both of you get a special discount on your next visit! 💛' },
];

// ── buildReceiptWA — now delegates to shared utility ─────────────────────────
function buildReceiptWA(booking, method) {
  return buildWAReceipt(booking, method);
}

// ── Print styles (injected into <head>, only affects print) ──────────────────
const PRINT_STYLES = `
@media print {
  body > * { display: none !important; }
  #salon-receipt-print { display: block !important; }
}
#salon-receipt-print { display: none; }
`;

function injectPrintStyles() {
  if (document.getElementById('salon-receipt-style')) return;
  const s = document.createElement('style');
  s.id = 'salon-receipt-style';
  s.textContent = PRINT_STYLES;
  document.head.appendChild(s);
}

function printReceipt(booking, method) {
  sharedPrintReceipt(booking, method);
}

// ── Receipt / Share Modal ─────────────────────────────────────────────────────
function ReceiptModal({ booking, method, onClose }) {
  const [sentMsg, setSentMsg] = useState(null);
  if (!booking) return null;
  const amt  = booking.finalAmount || booking.totalAmount || 0;
  const disc = booking.discountAmount || 0;
  const gross = booking.totalAmount || amt;
  const phone = booking.customer?.phone?.replace(/\D/g,'');
  const fullPhone = toWAPhone(phone);
  const firstName = (booking.customer?.name||'Guest').split(' ')[0];

  const sendWA = (text) => {
    const msg = text ? fillTemplate(text, booking) : buildWAReceipt(booking, method);
    if (!fullPhone) { alert('No phone number for this customer'); return; }
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    setSentMsg(text||'receipt');
    setTimeout(() => setSentMsg(null), 2500);
  };

  return (
    <>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        onClick={onClose}
        style={{ position:'fixed', inset:0, zIndex:220, background:'rgba(22,16,10,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
        <motion.div onClick={e=>e.stopPropagation()}
          initial={{opacity:0,scale:0.93,y:14}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.93}}
          transition={{type:'spring',damping:26,stiffness:320}}
          style={{ width:'100%', maxWidth:480, background:C.cream, borderRadius:20, boxShadow:'0 24px 64px rgba(0,0,0,0.24)', display:'flex', flexDirection:'column', maxHeight:'calc(100vh - 32px)' }}>

          {/* Header */}
          <div style={{ padding:'16px 22px', flexShrink:0, borderBottom:`1px solid ${C.creamBorder}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:C.okPale, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ fontSize:18 }}>✓</span>
              </div>
              <div>
                <h2 style={{ fontFamily:'Playfair Display,serif', fontSize:16, fontWeight:700, color:C.ink, margin:0 }}>Payment Received!</h2>
                <p style={{ fontSize:11, color:C.inkFaint, margin:0 }}>₹{amt.toLocaleString('en-IN')} · {method==='cash'?'💵 Cash':method==='upi'?'📱 UPI':'💳 Card'}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ padding:7, borderRadius:8, border:'none', background:C.creamMid, cursor:'pointer', color:C.inkMid, display:'flex' }}><X size={15}/></button>
          </div>

          {/* Body */}
          <div style={{ overflowY:'auto', flex:1, padding:'18px 22px' }}>
            {/* Mini receipt preview */}
            <div style={{ background:'#fff', borderRadius:14, padding:'14px 16px', marginBottom:18, border:`1px solid ${C.creamBorder}`, fontFamily:'Courier New,monospace', fontSize:12 }}>
              <div style={{ textAlign:'center', fontWeight:900, fontSize:14, marginBottom:6, letterSpacing:'0.05em' }}>{SALON_NAME}</div>
              <div style={{ textAlign:'center', fontSize:10, color:C.inkFaint, marginBottom:10 }}>
                {booking.date ? new Date(booking.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : ''}
                {booking.timeSlot?.start ? ' · ' + booking.timeSlot.start : ''}
              </div>
              <div style={{ borderTop:'1px dashed #ccc', borderBottom:'1px dashed #ccc', padding:'8px 0', marginBottom:8 }}>
                {[
                  ['Customer', booking.customer?.name||'Guest'],
                  ['Service',  booking.service?.name||'—'],
                  ['Stylist',  booking.staff?.name||'—'],
                ].map(([l,v]) => (
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                    <span style={{ color:C.inkFaint }}>{l}</span>
                    <span style={{ fontWeight:700 }}>{v}</span>
                  </div>
                ))}
              </div>
              {disc > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2, fontSize:11 }}>
                  <span style={{ color:C.inkFaint }}>Discount</span>
                  <span style={{ color:C.ok }}>−₹{disc.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', fontWeight:900, fontSize:14, marginTop:6, paddingTop:6, borderTop:'1px dashed #ccc' }}>
                <span>TOTAL</span>
                <span>₹{amt.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginTop:2, color:C.inkFaint }}>
                <span>Payment</span>
                <span>{method==='cash'?'Cash':method==='upi'?'UPI':'Card'}</span>
              </div>
            </div>

            {/* Action buttons row */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:18 }}>
              <button onClick={() => printReceipt(booking, method)}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'14px', borderRadius:14, border:`1px solid ${C.creamBorder}`, background:'#fff', cursor:'pointer', transition:'all 0.15s' }}
                onMouseEnter={e=>{e.currentTarget.style.background=C.creamMid;}} onMouseLeave={e=>{e.currentTarget.style.background='#fff';}}>
                <Printer size={20} color={C.ink}/>
                <span style={{ fontSize:12, fontWeight:700, color:C.ink }}>Print Receipt</span>
              </button>
              <button onClick={() => sendWA(null)} disabled={!fullPhone}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'14px', borderRadius:14, border:'1px solid #86EFAC', background:sentMsg==='receipt'?'#DCFCE7':'#fff', cursor:'pointer', opacity:!fullPhone?0.4:1, transition:'all 0.15s' }}>
                <MessageCircle size={20} color='#16A34A'/>
                <span style={{ fontSize:12, fontWeight:700, color:'#16A34A' }}>{sentMsg==='receipt'?'Sent ✓':'Send Receipt'}</span>
              </button>
            </div>

            {/* Quick WA messages */}
            {fullPhone && (
              <>
                <p style={{ fontSize:11, fontWeight:700, color:C.inkFaint, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Quick Messages</p>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {POST_PAYMENT_MSGS.filter(m=>m.text).map(({label,text}) => (
                    <button key={label} onClick={() => sendWA(text)}
                      style={{ padding:'9px 14px', borderRadius:12, border:`1px solid ${C.creamBorder}`, background:'#fff', color:C.ink, fontSize:12, fontWeight:600, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:8, transition:'all 0.12s' }}
                      onMouseEnter={e=>{e.currentTarget.style.background='#DCFCE7';e.currentTarget.style.borderColor='#86EFAC';}}
                      onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.borderColor=C.creamBorder;}}>
                      <MessageCircle size={12} color='#16A34A'/>
                      {label}
                      {sentMsg===text && <span style={{ marginLeft:'auto', fontSize:10, color:'#16A34A', fontWeight:700 }}>Sent ✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding:'14px 22px', flexShrink:0, borderTop:`1px solid ${C.creamBorder}` }}>
            <button onClick={onClose}
              style={{ width:'100%', padding:'13px', borderRadius:100, border:'none', background:C.ink, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

function Row({ label, value, valueStyle={} }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
      <span style={{ fontSize:12, color:C.inkFaint }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:600, color:C.ink, ...valueStyle }}>{value}</span>
    </div>
  );
}

export default function ReceptionistAppointments() {
  const { staff, services, refresh } = useDataStore();
  const [bookings, setBookings]           = useState([]);
  const [fetching, setFetching]           = useState(false);
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState('all');
  const [date, setDate]                   = useState(todayStr());
  const [expandedId, setExpandedId]       = useState(null);

  const fetchBookings = useCallback(async (d) => {
    setFetching(true);
    try {
      const { data } = await api.get('/bookings', { params: { date: d, limit: 200 } });
      setBookings(data.bookings || []);
    } catch (e) {
      console.error('Failed to fetch bookings', e);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { fetchBookings(date); }, [date]); // eslint-disable-line react-hooks/exhaustive-deps
  // Load salon settings (name, phones, address, receipt texts) from DB
  useEffect(() => {
    loadSalonSettings();
    const unsub = subscribeSalonSettings(() => {});
    return unsub;
  }, []);
  const [toast, setToast]                 = useState(null);
  const showToast = (msg, ok = true) => setToast({ msg, ok });
  const [loading, setLoading]             = useState(false);
  const [payModal, setPayModal]           = useState(null);
  const [payAction, setPayAction]         = useState(null);
  const [paySaving, setPaySaving]         = useState(false);
  const [receiptData, setReceiptData]       = useState(null); // {booking, method}
  const [walkInOpen, setWalkInOpen] = useState(false);

  // Multi-customer walk-in state
  const makeWiCust = () => ({ cid:Math.random().toString(36).slice(2), customerSearch:'', customerName:'', customerPhone:'', customerId:'', loyaltyPoints:0, selectedServices:[], staffIds:[], couponCode:'', coupon:null, couponMsg:'', manualDiscountPercent:0 });
  const [wiCustomers, setWiCustomers] = useState([makeWiCust()]);
  const [wiPayMethod, setWiPayMethod] = useState('cash');
  const [wiNotes,     setWiNotes]     = useState('');
  const [wiSaving,    setWiSaving]    = useState(false);
  const [wiCustResults, setWiCustResults] = useState({});
  const wiTimers = useRef({});
  const custTimer = useRef(null); // keep for compat

  const updateWiCust = (cid,patch) => setWiCustomers(p=>p.map(c=>c.cid===cid?{...c,...patch}:c));
  const addWiCust    = () => setWiCustomers(p=>[...p,makeWiCust()]);
  const removeWiCust = cid => setWiCustomers(p=>p.filter(c=>c.cid!==cid));
  const searchWiCust = (cid,q) => {
    updateWiCust(cid,{customerSearch:q,customerName:q,customerId:'',loyaltyPoints:0});
    clearTimeout(wiTimers.current[cid]);
    if(!q||q.length<2){setWiCustResults(p=>({...p,[cid]:[]}));return;}
    wiTimers.current[cid]=setTimeout(async()=>{try{const{data}=await api.get('/users',{params:{role:'customer',search:q,limit:6}});setWiCustResults(p=>({...p,[cid]:data.users||[]}));}catch{}},300);
  };
  const pickWiCust = (cid,c) => { updateWiCust(cid,{customerSearch:c.name,customerName:c.name,customerPhone:c.phone||'',customerId:c._id,loyaltyPoints:c.loyaltyPoints||0}); setWiCustResults(p=>({...p,[cid]:[]})); };
  const addWiService = (cid,svc) => setWiCustomers(p=>p.map(c=>{if(c.cid!==cid||c.selectedServices.find(s=>s.serviceId===svc._id))return c;return{...c,selectedServices:[...c.selectedServices,{serviceId:svc._id,name:svc.name,price:svc.discountPrice||svc.price,duration:svc.duration}]};}));
  const removeWiService = (cid,serviceId) => setWiCustomers(p=>p.map(c=>c.cid!==cid?c:{...c,selectedServices:c.selectedServices.filter(s=>s.serviceId!==serviceId)}));
  const toggleWiStaff = (cid,staffId) => setWiCustomers(p=>p.map(c=>{if(c.cid!==cid)return c;const ids=c.staffIds.includes(staffId)?c.staffIds.filter(id=>id!==staffId):[...c.staffIds,staffId];return{...c,staffIds:ids};}));
  const verifyCouponWi = async (cid) => {
    const c=wiCustomers.find(x=>x.cid===cid);if(!c||!c.couponCode)return;
    const sub=c.selectedServices.reduce((s,sv)=>s+sv.price,0);
    updateWiCust(cid,{coupon:null,couponMsg:'Checking…'});
    try{const{data}=await api.post('/coupons/validate',{code:c.couponCode,amount:sub});updateWiCust(cid,{coupon:data.coupon,couponMsg:'✓ Applied!'});}
    catch(e){updateWiCust(cid,{coupon:null,couponMsg:e.response?.data?.message||'Invalid'});}
  };
  const wiSub       = c => c.selectedServices.reduce((s,sv)=>s+sv.price,0);
  const wiCpnDisc   = c => { if(!c.coupon)return 0; if(c.coupon.discountType==='percentage')return Math.min(Math.round(wiSub(c)*c.coupon.discountValue/100),c.coupon.maxDiscount||9999); return c.coupon.discountValue||0; };
  const wiManDisc   = c => Math.round(wiSub(c)*Math.min(50,c.manualDiscountPercent||0)/100);
  const wiFinal     = c => Math.max(0,wiSub(c)-wiCpnDisc(c)-wiManDisc(c));
  const wiGrandTotal= () => wiCustomers.reduce((s,c)=>s+wiFinal(c),0);

  const submitWalkIn = async () => {
    const invalid = wiCustomers.find(c=>!c.selectedServices.length);
    if(invalid){ showToast('Each customer needs at least one service', false); return; }
    const noName = wiCustomers.find(c=>!c.customerName.trim());
    if(noName){ showToast('Enter customer name for each entry', false); return; }
    setWiSaving(true);
    try {
      for(const c of wiCustomers){
        const payload = {
          customerName: c.customerName || 'Walk-in Guest',
          serviceIds: c.selectedServices.map(s=>s.serviceId),
          staffIds: c.staffIds.length ? c.staffIds : undefined,
          paymentMethod: wiPayMethod,
          notes: wiNotes || '',
          couponCode: c.coupon ? c.couponCode : '',
          manualDiscountPercent: c.manualDiscountPercent || 0,
        };
        if (c.customerPhone) payload.customerPhone = c.customerPhone;
        await api.post('/bookings/walk-in', payload);
      }
      broadcastChange();
      showToast(wiCustomers.length > 1 ? `${wiCustomers.length} bookings created!` : 'Walk-in created!');
      setWalkInOpen(false);
      setWiCustomers([makeWiCust()]);
      setWiPayMethod('cash');
      setWiNotes('');
      await fetchBookings(date);
    } catch(e) {
      console.error('Walk-in creation error:', e?.response?.data || e?.message || e);
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Booking failed';
      alert('ERROR: ' + msg); // temporary - shows exact error
    } finally {
      setWiSaving(false);
    }
  };

  const handlePayConfirm = async (method) => {
    if (!payModal) return;
    setPaySaving(true);
    try {
      let completedBooking = payModal;
      if (payAction === 'complete') {
        const { data } = await api.patch(`/bookings/${payModal._id}/status`, { status:'completed', paymentMethod:method, paymentStatus:'paid' });
        completedBooking = data.booking || { ...payModal, paymentMethod:method, paymentStatus:'paid' };
      } else {
        const { data } = await api.patch(`/bookings/${payModal._id}/verify-payment`, { method });
        completedBooking = data.booking || { ...payModal, paymentMethod:method, paymentStatus:'paid' };
      }
      broadcastChange(); fetchBookings(date);
      setPayModal(null);
      // Open receipt modal
      setReceiptData({ booking:{ ...completedBooking, paymentMethod:method }, method });
    } catch(e) { showToast(e.response?.data?.message||'Failed', false); }
    setPaySaving(false);
  };

  const quickUpdate = async (id, status, extra={}) => {
    setLoading(true);
    try { await api.patch(`/bookings/${id}/status`, { status, ...extra }); broadcastChange(); fetchBookings(date); }
    catch(e) { showToast(e.response?.data?.message||'Failed', false); }
    setLoading(false);
  };

  const filtered = bookings
    .filter(b => (statusFilter==='all'||b.status===statusFilter) &&
                 (!search||(b.customer?.name||'').toLowerCase().includes(search.toLowerCase())||(b.service?.name||'').toLowerCase().includes(search.toLowerCase())||(b.refNo||'').toLowerCase().includes(search.toLowerCase())||(b.customer?.phone||'').includes(search)))
    .sort((a,b) => (a.timeSlot?.start||'').localeCompare(b.timeSlot?.start||''));

  const stats = {
    total: filtered.length,
    completed: filtered.filter(b=>b.status==='completed').length,
    pendingPay: filtered.filter(b=>b.paymentStatus!=='paid'&&b.status!=='cancelled').length,
    revenue: filtered.filter(b=>b.paymentStatus==='paid').reduce((s,b)=>s+(b.finalAmount||b.totalAmount||0),0),
  };

  const handleExport = () => {
    const rows = filtered.map(b=>({
      Date:date, Time:b.timeSlot?.start||'',
      Customer:b.customer?.name||'Guest', Phone:b.customer?.phone||'',
      Service:b.service?.name||'', Stylist:b.staff?.name||'',
      'Total (₹)':b.totalAmount||0, 'Discount (₹)':b.discountAmount||0,
      'Net (₹)':b.finalAmount||b.totalAmount||0,
      Status:b.status, 'Pay Status':b.paymentStatus, 'Pay Method':b.paymentMethod||'',
    }));
    exportCSV(rows, ['Date','Time','Customer','Phone','Service','Stylist','Total (₹)','Discount (₹)','Net (₹)','Status','Pay Status','Pay Method'], `appointments_${date}.csv`);
  };

  const safeStaff = staff || [];

  return (
    <div style={{ maxWidth:1100, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:24, fontWeight:700, color:C.ink, margin:0 }}>Appointments</h1>
          <p style={{ fontSize:13, color:C.inkFaint, margin:'3px 0 0' }}>Bookings for {date}</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={handleExport} disabled={filtered.length===0}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:100, border:`1px solid ${C.creamBorder}`, background:'#fff', color:C.inkMid, fontSize:12, fontWeight:600, cursor:'pointer', opacity:filtered.length===0?0.5:1 }}>
            <Download size={13}/> Export CSV
          </button>
          <motion.button onClick={()=>setWalkInOpen(true)} whileHover={{y:-1}} whileTap={{scale:0.97}}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:100, background:C.ink, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', border:'none' }}>
            <Plus size={15}/> New Walk-in
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            style={{ marginBottom:14, padding:'10px 16px', borderRadius:10, fontSize:13, fontWeight:600, background:toast.ok?C.okPale:C.riskPale, color:toast.ok?C.ok:C.risk }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        {[
          {label:'Shown',      value:stats.total,                                 color:C.ink},
          {label:'Completed',  value:stats.completed,                             color:C.ok},
          {label:'Pending Pay',value:stats.pendingPay,                            color:C.risk},
          {label:'Revenue',    value:`₹${stats.revenue.toLocaleString('en-IN')}`, color:C.goldMid},
        ].map(({label,value,color})=>(
          <div key={label} style={{ padding:'6px 16px', borderRadius:100, background:'#fff', border:`1px solid ${C.creamBorder}` }}>
            <span style={{ fontSize:13, fontWeight:700, color }}>{value}</span>
            <span style={{ fontSize:11, color:C.inkFaint, marginLeft:5 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:180 }}>
          <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:C.inkFaint }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, phone, ref no…"
            style={{ paddingLeft:34, paddingRight:12, paddingTop:9, paddingBottom:9, borderRadius:100, border:`1px solid ${C.creamBorder}`, background:'#fff', fontSize:13, color:C.ink, outline:'none', width:'100%', boxSizing:'border-box' }}/>
        </div>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)}
          style={{ padding:'9px 12px', borderRadius:100, border:`1px solid ${C.creamBorder}`, background:'#fff', fontSize:12, color:C.ink, outline:'none', cursor:'pointer' }}/>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {Object.entries(STATUS_META).map(([key,meta])=>(
            <button key={key} onClick={()=>setStatusFilter(key)}
              style={{ padding:'6px 12px', borderRadius:100, border:`1px solid ${statusFilter===key?meta.color:C.creamBorder}`, background:statusFilter===key?meta.bg:'#fff', color:statusFilter===key?meta.color:C.inkFaint, fontSize:11, fontWeight:600, cursor:'pointer' }}>
              {meta.label}
            </button>
          ))}
        </div>
      </div>

      {/* Booking list */}
      <motion.div style={{ ...card, overflow:'hidden' }}>
        {fetching ? (
          <div style={{ padding:40, textAlign:'center', color:C.inkFaint, fontSize:13 }}>Loading...</div>
        ) : filtered.length===0 ? (
          <div style={{ padding:48, textAlign:'center', color:C.inkFaint, fontSize:13 }}>No appointments found</div>
        ) : filtered.map((b,i)=>{
          const meta   = STATUS_META[b.status] || STATUS_META.confirmed;
          const isExp  = expandedId === b._id;
          const amt    = b.finalAmount || b.totalAmount || 0;
          const disc   = b.discountAmount || 0;
          const gross  = b.totalAmount || amt;
          const isPaid = b.paymentStatus === 'paid';

          return (
            <div key={b._id||i}>
              <div onClick={()=>setExpandedId(isExp?null:b._id)}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', cursor:'pointer', borderBottom:`1px solid ${C.creamBorder}`, background:isExp?C.creamMid:'#fff', transition:'background 0.12s' }}
                onMouseEnter={e=>{if(!isExp)e.currentTarget.style.background=C.creamMid}}
                onMouseLeave={e=>{if(!isExp)e.currentTarget.style.background='#fff'}}>
                <div style={{ minWidth:52, textAlign:'center' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>{b.timeSlot?.start||'--'}</div>
                  <div style={{ fontSize:9, color:C.inkFaint }}>{b.timeSlot?.end||''}</div>
                </div>
                <div style={{ width:1, height:32, background:C.creamBorder, flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:C.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{b.customer?.name||'Guest'}</div>
                    {b.refNo && <span style={{ fontSize:10, fontWeight:700, color:C.goldMid, background:C.goldPale, border:`1px solid ${C.creamDark}`, padding:'1px 7px', borderRadius:100, flexShrink:0, fontFamily:'monospace', letterSpacing:'0.04em' }}>{b.refNo}</span>}
                  </div>
                  <div style={{ fontSize:12, color:C.inkFaint, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{b.service?.name||'—'} · {b.staff?.name||'—'}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0, minWidth:80 }}>
                  <div style={{ fontSize:15, fontWeight:800, color:C.ink }}>₹{amt.toLocaleString('en-IN')}</div>
                  {disc>0 && <div style={{ fontSize:10, color:C.ok, fontWeight:600 }}>−₹{disc.toLocaleString('en-IN')} off</div>}
                  <div style={{ fontSize:10, fontWeight:700, color:isPaid?C.ok:C.risk }}>{isPaid?'✓ Paid':'Unpaid'}</div>
                </div>
                <div style={{ padding:'4px 10px', borderRadius:100, background:meta.bg, color:meta.color, fontSize:10, fontWeight:700, flexShrink:0 }}>{meta.label}</div>
              </div>

              <AnimatePresence>
                {isExp && (
                  <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.18}} style={{overflow:'hidden'}}>
                    <div style={{ padding:'14px 20px', background:C.creamMid, borderBottom:`1px solid ${C.creamBorder}` }}>
                      {/* Amount pills */}
                      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
                        <div style={{ padding:'8px 14px', borderRadius:10, background:'#fff', border:`1px solid ${C.creamBorder}` }}>
                          <div style={{ fontSize:9, color:C.inkFaint, fontWeight:600, textTransform:'uppercase' }}>Service Price</div>
                          <div style={{ fontSize:14, fontWeight:700, color:C.ink }}>₹{gross.toLocaleString('en-IN')}</div>
                        </div>
                        {disc>0 && (
                          <div style={{ padding:'8px 14px', borderRadius:10, background:C.okPale, border:'1px solid #A7F3D0' }}>
                            <div style={{ fontSize:9, color:C.ok, fontWeight:600, textTransform:'uppercase' }}>Discount</div>
                            <div style={{ fontSize:14, fontWeight:700, color:C.ok }}>−₹{disc.toLocaleString('en-IN')}</div>
                          </div>
                        )}
                        <div style={{ padding:'8px 14px', borderRadius:10, background:C.goldPale, border:`1px solid ${C.creamDark}` }}>
                          <div style={{ fontSize:9, color:C.goldMid, fontWeight:600, textTransform:'uppercase' }}>Net Amount</div>
                          <div style={{ fontSize:14, fontWeight:800, color:C.ink }}>₹{amt.toLocaleString('en-IN')}</div>
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:16, marginBottom:12, flexWrap:'wrap' }}>
                        {b.refNo && <span style={{ fontSize:12, color:C.inkMid, display:'flex', alignItems:'center', gap:4 }}><span style={{ color:C.inkFaint }}>Ref: </span><span style={{ fontWeight:700, color:C.goldMid, fontFamily:'monospace' }}>{b.refNo}</span></span>}
                        <span style={{ fontSize:12, color:C.inkMid }}><span style={{ color:C.inkFaint }}>Stylist: </span>{b.staff?.name||'—'}</span>
                        <span style={{ fontSize:12, color:C.inkMid }}><span style={{ color:C.inkFaint }}>Pay: </span>{b.paymentMethod||'—'}</span>
                        <span style={{ fontSize:12, color:C.inkMid }}><span style={{ color:C.inkFaint }}>Type: </span>{b.type||'—'}</span>
                      </div>
                      {/* Actions */}
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {b.status==='confirmed' && (
                          <button onClick={e=>{e.stopPropagation();quickUpdate(b._id,'in-progress');}} disabled={loading}
                            style={{ padding:'7px 16px', borderRadius:100, border:'none', background:C.warn, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                            ▶ Start Service
                          </button>
                        )}
                        {b.status==='in-progress' && (
                          <button onClick={e=>{e.stopPropagation();setPayModal(b);setPayAction('complete');}} disabled={loading}
                            style={{ padding:'7px 16px', borderRadius:100, border:'none', background:C.ok, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                            ✓ Mark Complete & Pay
                          </button>
                        )}
                        {!isPaid && !['cancelled','no-show'].includes(b.status) && (
                          <button onClick={e=>{e.stopPropagation();setPayModal(b);setPayAction('pay');}} disabled={loading}
                            style={{ padding:'7px 16px', borderRadius:100, border:'1px solid #A7F3D0', background:C.okPale, color:C.ok, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                            💰 Collect Payment
                          </button>
                        )}
                        {['confirmed','in-progress'].includes(b.status) && (
                          <button onClick={e=>{e.stopPropagation();quickUpdate(b._id,'no-show');}} disabled={loading}
                            style={{ padding:'7px 14px', borderRadius:100, border:`1px solid ${C.creamBorder}`, background:'#fff', color:C.inkMid, fontSize:11, fontWeight:600, cursor:'pointer' }}>
                            No Show
                          </button>
                        )}
                        {!['cancelled','completed'].includes(b.status) && (
                          <button onClick={e=>{e.stopPropagation();quickUpdate(b._id,'cancelled');}} disabled={loading}
                            style={{ padding:'7px 14px', borderRadius:100, border:'1px solid #FECACA', background:C.riskPale, color:C.risk, fontSize:11, fontWeight:600, cursor:'pointer' }}>
                            Cancel
                          </button>
                        )}

                        {/* ── Receipt buttons — shown whenever booking is paid ── */}
                        {isPaid && (
                          <>
                            <div style={{ width:1, height:28, background:C.creamBorder, alignSelf:'center', flexShrink:0 }}/>
                            <button
                              onClick={e=>{
                                e.stopPropagation();
                                printReceipt(b, b.paymentMethod||'cash');
                              }}
                              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:100, border:`1px solid ${C.creamBorder}`, background:'#fff', color:C.inkMid, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                              <Printer size={13}/> Print
                            </button>
                            <button
                              onClick={e=>{
                                e.stopPropagation();
                                setReceiptData({ booking:b, method:b.paymentMethod||'cash' });
                              }}
                              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:100, border:'1px solid #86EFAC', background:'#DCFCE7', color:'#16A34A', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                              <MessageCircle size={13}/> Send Receipt
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </motion.div>

      {/* Payment Modal */}
      <AnimatePresence>
        {payModal && <PaymentModal booking={payModal} onConfirm={handlePayConfirm} onClose={()=>setPayModal(null)} saving={paySaving}/>}
      </AnimatePresence>

      {/* Receipt / Share Modal */}
      <AnimatePresence>
        {receiptData && <ReceiptModal booking={receiptData.booking} method={receiptData.method} onClose={()=>setReceiptData(null)}/>}
      </AnimatePresence>

      {/* Walk-in Drawer */}
      <AnimatePresence>
        {walkInOpen && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setWalkInOpen(false)}
              style={{position:'fixed',inset:0,zIndex:200,background:'rgba(22,16,10,0.55)',backdropFilter:'blur(4px)'}}/>
            <motion.div initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{type:'spring',damping:32,stiffness:320}}
              style={{position:'fixed',top:0,right:0,bottom:0,width:'min(600px,95vw)',zIndex:201,background:'#fff',borderLeft:`1px solid ${C.creamBorder}`,display:'flex',flexDirection:'column',boxShadow:'-8px 0 32px rgba(22,16,10,0.15)'}}>
              {/* Header */}
              <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.creamBorder}`,background:C.goldPale,flexShrink:0}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:36,height:36,borderRadius:11,background:`linear-gradient(135deg,#B8860B,#DAA520)`,display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={16} color="#fff"/></div>
                    <div><p style={{fontSize:15,fontWeight:700,color:C.ink}}>New Walk-in</p><p style={{fontSize:11,color:C.inkFaint}}>{wiCustomers.length} customer{wiCustomers.length!==1?'s':''} · Multi-service · Multi-staff</p></div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <button onClick={addWiCust} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:9,background:'#fff',border:`1px solid ${C.creamBorder}`,cursor:'pointer',fontSize:11,fontWeight:700,color:C.goldMid}}><Plus size={12}/> Add Customer</button>
                    <button onClick={()=>setWalkInOpen(false)} style={{width:30,height:30,borderRadius:9,border:`1px solid ${C.creamBorder}`,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={14} color={C.inkMid}/></button>
                  </div>
                </div>
              </div>
              {/* Body - scrollable */}
              <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
                {wiCustomers.map((c,idx)=>(
                  <div key={c.cid} style={{marginBottom:16,borderRadius:14,border:`2px solid ${C.creamBorder}`,overflow:'hidden'}}>
                    {/* Customer tab header */}
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:C.creamMid,borderBottom:`1px solid ${C.creamBorder}`}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:26,height:26,borderRadius:8,background:`linear-gradient(135deg,#B8860B,#DAA520)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#fff'}}>{idx+1}</div>
                        <span style={{fontSize:13,fontWeight:700,color:C.ink}}>Customer {idx+1}</span>
                        {c.customerName&&<span style={{fontSize:11,color:C.inkMid}}>— {c.customerName}</span>}
                        {wiFinal(c)>0&&<span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:100,background:C.goldPale,color:C.goldMid,border:`1px solid ${C.creamBorder}`}}>₹{wiFinal(c).toLocaleString('en-IN')}</span>}
                      </div>
                      {wiCustomers.length>1&&<button onClick={()=>removeWiCust(c.cid)} style={{width:22,height:22,borderRadius:6,background:'#FEF2F2',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={9} color="#991B1B"/></button>}
                    </div>
                    <div style={{padding:14}}>
                      {/* Customer search */}
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                        <div style={{position:'relative'}}>
                          <label style={{display:'block',fontSize:10,fontWeight:700,color:C.inkFaint,marginBottom:4}}>Name *</label>
                          <div style={{position:'relative'}}><Search size={12} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:C.inkFaint}}/><input style={{padding:'8px 10px 8px 30px',borderRadius:10,border:`1px solid ${C.creamBorder}`,background:C.cream,fontSize:12,color:C.ink,outline:'none',width:'100%'}} placeholder="Search customer…" value={c.customerSearch} onChange={e=>searchWiCust(c.cid,e.target.value)}/></div>
                          {(wiCustResults[c.cid]||[]).length>0&&<div style={{position:'absolute',zIndex:30,left:0,right:0,marginTop:3,borderRadius:10,overflow:'hidden',boxShadow:'0 6px 20px rgba(0,0,0,0.1)',background:'#fff',border:`1px solid ${C.creamBorder}`}}>{(wiCustResults[c.cid]||[]).map(r=><button key={r._id} onClick={()=>pickWiCust(c.cid,r)} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'none',border:'none',borderBottom:`1px solid ${C.creamMid}`,cursor:'pointer',textAlign:'left'}} onMouseEnter={e=>e.currentTarget.style.background=C.goldPale} onMouseLeave={e=>e.currentTarget.style.background='none'}><div style={{width:24,height:24,borderRadius:7,background:'#B8860B',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#fff'}}>{(r.name||'?')[0]}</div><div style={{flex:1}}><p style={{fontSize:12,fontWeight:700,color:C.ink}}>{r.name}</p><p style={{fontSize:10,color:C.inkFaint}}>{r.phone}</p></div></button>)}</div>}
                          {c.customerId&&<div style={{marginTop:5,display:'flex',alignItems:'center',gap:5,padding:'5px 10px',borderRadius:8,background:C.goldPale,border:`1px solid ${C.creamBorder}`}}><Star size={10} color="#B8860B"/><span style={{fontSize:10,fontWeight:700,color:C.ink}}>{c.loyaltyPoints}pts</span></div>}
                        </div>
                        <div><label style={{display:'block',fontSize:10,fontWeight:700,color:C.inkFaint,marginBottom:4}}>Phone</label><input style={{padding:'8px 12px',borderRadius:10,border:`1px solid ${C.creamBorder}`,background:C.cream,fontSize:12,color:C.ink,outline:'none',width:'100%'}} type="tel" placeholder="98765 43210" maxLength={10} value={c.customerPhone} onChange={e=>updateWiCust(c.cid,{customerPhone:e.target.value.replace(/\D/g,'').slice(0,10)})}/></div>
                      </div>
                      {/* Services */}
                      <label style={{display:'block',fontSize:10,fontWeight:700,color:C.inkFaint,marginBottom:5}}>Services</label>
                      <select style={{padding:'8px 12px',borderRadius:10,border:`1px solid ${C.creamBorder}`,background:C.cream,fontSize:12,color:C.ink,outline:'none',width:'100%',marginBottom:8}} onChange={e=>{const svc=(services||[]).find(s=>s._id===e.target.value);if(svc)addWiService(c.cid,svc);e.target.value='';}} defaultValue="">
                        <option value="" disabled>+ Add service…</option>
                        {(services||[]).filter(s=>!c.selectedServices.find(sel=>sel.serviceId===s._id)).map(s=><option key={s._id} value={s._id}>{s.name} — ₹{(s.discountPrice||s.price||0).toLocaleString('en-IN')}</option>)}
                      </select>
                      {c.selectedServices.map(s=><div key={s.serviceId} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 10px',borderRadius:9,background:C.goldPale,border:`1px solid ${C.creamBorder}`,marginBottom:5}}><div><p style={{fontSize:12,fontWeight:700,color:C.ink}}>{s.name}</p><p style={{fontSize:10,color:C.inkFaint}}>{s.duration}min</p></div><div style={{display:'flex',alignItems:'center',gap:7}}><span style={{fontSize:12,fontWeight:700,color:C.goldMid}}>₹{s.price.toLocaleString('en-IN')}</span><button onClick={()=>removeWiService(c.cid,s.serviceId)} style={{width:20,height:20,borderRadius:5,background:'#FEF2F2',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={9} color="#991B1B"/></button></div></div>)}
                      {/* Staff - multi-select */}
                      <label style={{display:'block',fontSize:10,fontWeight:700,color:C.inkFaint,marginTop:10,marginBottom:5}}>Assign Staff <span style={{fontWeight:400,color:C.inkGhost}}>(tap multiple)</span></label>
                      <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:10}}>
                        {(staff||[]).map(s=>{const sel=c.staffIds.includes(s._id||s);return(
                          <button key={s._id||s} onClick={()=>toggleWiStaff(c.cid,s._id||s)} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',background:sel?`linear-gradient(135deg,#B8860B,#DAA520)`:C.cream,color:sel?'#fff':C.ink,border:`1px solid ${sel?'#B8860B':C.creamBorder}`}}>
                            {sel&&<Check size={9}/>}{s.name||s}
                          </button>
                        )})}
                        {(!staff||staff.length===0)&&<span style={{fontSize:11,color:C.inkFaint}}>No staff found</span>}
                      </div>
                      {/* Discount */}
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                        <div><label style={{display:'block',fontSize:10,fontWeight:700,color:C.inkFaint,marginBottom:4}}>Coupon</label><div style={{display:'flex',gap:5}}><input style={{padding:'7px 10px',borderRadius:9,border:`1px solid ${C.creamBorder}`,background:C.cream,fontSize:11,color:C.ink,outline:'none',flex:1}} placeholder="CODE" value={c.couponCode} onChange={e=>updateWiCust(c.cid,{couponCode:e.target.value.toUpperCase()})}/><button onClick={()=>verifyCouponWi(c.cid)} disabled={!c.couponCode||!c.selectedServices.length} style={{padding:'0 10px',borderRadius:9,background:'#B8860B',color:'#fff',border:'none',cursor:'pointer',fontSize:11,fontWeight:700,opacity:(!c.couponCode||!c.selectedServices.length)?0.4:1}}>OK</button></div>{c.couponMsg&&<p style={{fontSize:10,marginTop:3,fontWeight:600,color:c.couponMsg.startsWith('✓')?C.ok:C.risk}}>{c.couponMsg}</p>}</div>
                        <div><label style={{display:'block',fontSize:10,fontWeight:700,color:C.inkFaint,marginBottom:4}}>Discount %</label><input style={{padding:'8px 12px',borderRadius:10,border:`1px solid ${C.creamBorder}`,background:C.cream,fontSize:12,color:C.ink,outline:'none',width:'100%'}} type="number" min="0" max="50" placeholder="0–50" value={c.manualDiscountPercent||''} onChange={e=>updateWiCust(c.cid,{manualDiscountPercent:Math.min(50,Math.max(0,Number(e.target.value)))})}/></div>
                      </div>
                      {/* Per-customer total */}
                      {c.selectedServices.length>0&&<div style={{padding:'8px 12px',borderRadius:10,background:C.goldPale,border:`1px solid ${C.creamBorder}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontSize:11,color:C.inkMid}}>{c.selectedServices.length} service{c.selectedServices.length!==1?'s':''}{c.staffIds.length>0&&` · ${c.staffIds.length} staff`}</span>
                        <span style={{fontSize:14,fontWeight:800,color:C.goldMid}}>₹{wiFinal(c).toLocaleString('en-IN')}</span>
                      </div>}
                    </div>
                  </div>
                ))}
                {/* Shared: Payment + Notes */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                  <div><label style={{display:'block',fontSize:10,fontWeight:700,color:C.inkFaint,marginBottom:6}}>Payment Method</label>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                      {[['cash','Cash',Wallet],['upi','UPI',Smartphone],['card','Card',CreditCard]].map(([v,l,I])=>(
                        <button key={v} onClick={()=>setWiPayMethod(v)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'9px 4px',borderRadius:10,cursor:'pointer',background:wiPayMethod===v?`linear-gradient(135deg,#B8860B,#DAA520)`:C.cream,color:wiPayMethod===v?'#fff':C.inkMid,border:`1px solid ${wiPayMethod===v?'#B8860B':C.creamBorder}`}}><I size={14}/><span style={{fontSize:10,fontWeight:700}}>{l}</span></button>
                      ))}
                    </div>
                  </div>
                  <div><label style={{display:'block',fontSize:10,fontWeight:700,color:C.inkFaint,marginBottom:6}}>Notes</label><textarea style={{padding:'8px 12px',borderRadius:10,border:`1px solid ${C.creamBorder}`,background:C.cream,fontSize:12,color:C.ink,outline:'none',width:'100%',resize:'none',height:72}} placeholder="Notes…" value={wiNotes} onChange={e=>setWiNotes(e.target.value)}/></div>
                </div>
                {/* Grand total */}
                {wiGrandTotal()>0&&<div style={{padding:'11px 14px',borderRadius:12,background:`linear-gradient(135deg,${C.goldPale},#FFF5D6)`,border:`1px solid ${C.creamBorder}`,marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:12,color:C.inkMid,fontWeight:600}}>{wiCustomers.length} Customer{wiCustomers.length!==1?'s':''} · Grand Total</span>
                  <span style={{fontSize:20,fontWeight:800,color:C.goldMid}}>₹{wiGrandTotal().toLocaleString('en-IN')}</span>
                </div>}
              </div>
              {/* Footer */}
              <div style={{padding:'14px 20px',borderTop:`1px solid ${C.creamBorder}`,flexShrink:0}}>
                <button onClick={submitWalkIn} disabled={wiSaving||wiCustomers.every(c=>!c.selectedServices.length)}
                  style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:14,borderRadius:100,border:'none',cursor:'pointer',background:`linear-gradient(135deg,#B8860B,#DAA520)`,color:'#fff',fontSize:14,fontWeight:700,opacity:(wiSaving||wiCustomers.every(c=>!c.selectedServices.length))?0.4:1}}>
                  {wiSaving?'Creating…':<>{wiCustomers.length>1?`Create ${wiCustomers.length} Bookings`:'Create Walk-in'}{wiGrandTotal()>0?` — ₹${wiGrandTotal().toLocaleString('en-IN')}`:''}</>}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}