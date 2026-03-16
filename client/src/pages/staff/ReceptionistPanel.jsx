/**
 * ReceptionistPanel — Ultra-Pro Front Desk
 * ─────────────────────────────────────────
 * • Full admin-grade Appointments tab (same features as AdminBookings)
 * • Mutual real-time sync across Admin ↔ Staff ↔ Receptionist via BroadcastChannel
 * • Walk-in billing, Inventory, Customers, Staff tabs
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, IndianRupee, Clock, CheckCircle2, XCircle,
  Loader2, Sparkles, User, Scissors, Phone, CreditCard,
  Banknote, Smartphone, RotateCcw, X, ChevronDown,
  Receipt, AlertCircle, RefreshCw, Zap, Activity,
  MessageCircle, Printer, Check, UserPlus,
  Package, Download, Users, AlertTriangle,
  Mail, Calendar, ChevronRight, UserCheck,
  Star, BarChart3, Bell, Wallet, TrendingDown, TrendingUp, ArrowUp, ArrowDown,
} from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import BookingCard from '@/components/BookingCard';
import { useDataStore, broadcastChange } from '@/context/DataStore';

// ─── Design System ─────────────────────────────────────────────────────────────
const C = {
  cream:'#FDF8F0', creamMid:'#F7EFD8', creamDark:'#EDE0C0', creamBorder:'#DFD0A8',
  gold:'#B8860B', goldLight:'#D4A017', goldMid:'#B8860B', goldPale:'#FFF8E7',
  ink:'#16100A', inkDeep:'#201408', inkMid:'#5A4020', inkFaint:'#B09060', inkGhost:'#D4B890',
  ok:'#285C3A', okPale:'#EAF4EE',
  risk:'#7A2020', riskPale:'#F7EEEE',
  warn:'#6B4800', warnPale:'#FEF3DC',
  blue:'#1D4ED8', bluePale:'#EFF6FF',
  purple:'#6D28D9', purplePale:'#F5F3FF',
  white:'#FFFFFF',
};
const ease = [0.22, 0.61, 0.36, 1];
const fade = { hidden:{opacity:0,y:10}, show:{opacity:1,y:0,transition:{duration:0.28,ease}} };

const Rs = n => Number(n||0).toLocaleString('en-IN');
const fmtTime = t => { try { return new Date(`2000-01-01T${t}`).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}); } catch { return t||'—'; }};
const fmtDt = d => { try { return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); } catch { return '—'; }};
const makeRef = (id='') => {
  const d = new Date();
  return `GLM-${String(d.getFullYear()).slice(2)}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(id).slice(-4).toUpperCase()||Math.random().toString(36).slice(2,6).toUpperCase()}`;
};
const IST_OFFSET = 5.5 * 60 * 60 * 1000;
const getTodayIST = () => new Date(Date.now()+IST_OFFSET).toISOString().split('T')[0];

const inp = (ex={}) => ({
  padding:'10px 14px', borderRadius:12, border:`1.5px solid ${C.creamBorder}`,
  background:C.cream, fontSize:13, color:C.ink, outline:'none',
  width:'100%', fontFamily:"'DM Sans',sans-serif", transition:'border-color 0.2s', ...ex,
});

const STATUS = {
  confirmed:    { label:'Confirmed',   color:C.ok,      bg:C.okPale },
  'in-progress':{ label:'In Progress', color:C.purple,  bg:C.purplePale },
  completed:    { label:'Completed',   color:C.blue,    bg:C.bluePale },
  pending:      { label:'Pending',     color:C.warn,    bg:C.warnPale },
  cancelled:    { label:'Cancelled',   color:C.risk,    bg:C.riskPale },
  'no-show':    { label:'No Show',     color:C.inkFaint,bg:C.creamMid },
};

// ─── Receipt helpers ──────────────────────────────────────────────────────────
const printReceipt = (data) => {
  const ref = data.invoiceRef || makeRef(data.bookingId);
  const win = window.open('','_blank','width=440,height=720');
  const svcs = (data.services||[data.service]).filter(Boolean);
  win.document.write(`<html><head><title>Receipt</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#FDF8F0;padding:24px;max-width:420px;margin:auto}
  .card{background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(184,134,11,0.12)}
  .hdr{background:linear-gradient(135deg,#1C1410,#2d2510);padding:22px 24px;text-align:center}
  .logo{font-family:'Playfair Display',serif;font-size:26px;color:#fff}.logo span{color:#DAA520}
  .sub{font-size:10px;color:#9C8660;letter-spacing:0.15em;text-transform:uppercase;margin-top:3px}
  .inv{display:inline-flex;align-items:center;gap:6px;margin-top:12px;background:rgba(218,165,32,0.15);border:1px solid rgba(218,165,32,0.3);border-radius:20px;padding:5px 14px;font-size:11px;font-weight:700;color:#DAA520}
  .body{padding:20px 22px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}
  .cell{background:#FDF8F0;border-radius:10px;padding:8px 12px}
  .clabel{font-size:10px;color:#9C8660;font-weight:600;text-transform:uppercase}.cval{font-size:13px;font-weight:700;color:#1C1410;margin-top:2px}
  .stitle{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#9C8660;margin-bottom:8px}
  table{width:100%;border-collapse:collapse;font-size:13px}td{padding:7px 0;border-bottom:1px dashed #F5EDD8}
  .tr td{font-weight:800;font-size:16px;border:none;padding-top:12px}.av{color:#B8860B}.green{color:#10B981}
  .ftr{background:#FDF8F0;border-top:1px solid #F5EDD8;padding:14px 22px;text-align:center}
  .ftr p{font-size:11px;color:#9C8660;line-height:1.8}.ftr strong{color:#B8860B}
  .pbtn{display:block;width:100%;padding:12px;background:linear-gradient(135deg,#B8860B,#DAA520);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;margin-top:18px}
  @media print{.pbtn{display:none}}</style></head>
  <body><div class="card">
  <div class="hdr"><div class="logo">✂ Glamour<span>.</span></div>
  <div class="sub">Premium Salon &amp; Spa</div><div class="inv">🧾 ${ref}</div></div>
  <div class="body"><div class="grid">
  <div class="cell"><div class="clabel">Customer</div><div class="cval">${data.customerName||'Walk-in'}</div></div>
  <div class="cell"><div class="clabel">Phone</div><div class="cval">${data.customerPhone?'+91 '+data.customerPhone:'—'}</div></div>
  <div class="cell"><div class="clabel">Stylist</div><div class="cval">${data.staffName||'—'}</div></div>
  <div class="cell"><div class="clabel">Payment</div><div class="cval">${(data.paymentMethod||'cash').toUpperCase()}</div></div>
  </div>
  <div class="stitle">Services</div><table>
  ${svcs.map(s=>`<tr><td>${s.name||s}</td><td style="text-align:right">₹${Rs(s.price||0)}</td></tr>`).join('')}
  ${(data.couponDiscount||0)>0?`<tr><td class="green">Coupon</td><td style="text-align:right" class="green">−₹${Rs(data.couponDiscount)}</td></tr>`:''}
  <tr class="tr"><td>Total</td><td style="text-align:right" class="av">₹${Rs(data.finalAmount)}</td></tr></table>
  </div><div class="ftr"><p>Thank you for choosing <strong>Glamour Salon</strong> 💛</p>
  <p>Invoice: <strong>${ref}</strong></p></div></div>
  <button class="pbtn" onclick="window.print()">🖨 Print Invoice</button></body></html>`);
  win.document.close();
};

const sendWhatsApp = (data) => {
  const ph = (data.customerPhone||'').replace(/\D/g,'').slice(-10);
  if (!ph || ph.length < 10) { alert('No phone number on record'); return; }
  const svcs = (data.services||[data.service]).filter(Boolean);
  const svcList = svcs.map(s=>`  • ${s.name||s}: ₹${Rs(s.price||0)}`).join('%0A');
  const msg = [
    `✂ *Glamour Salon — Receipt*`, ``,
    `Hi *${data.customerName||'there'}*! 💛`, ``,
    `🧾 *Invoice:* \`${data.invoiceRef||makeRef()}\``,
    `👩‍🎨 *Stylist:* ${data.staffName||'—'}`,
    ``, svcList, ``,
    (data.couponDiscount||0)>0 ? `🏷 *Discount:* −₹${Rs(data.couponDiscount)}` : null,
    `💰 *Total:* ₹${Rs(data.finalAmount)} _(${(data.paymentMethod||'cash').toUpperCase()})_`,
    ``, `_See you again at Glamour Salon!_ ✨`,
  ].filter(Boolean).join('%0A');
  window.open(`https://wa.me/91${ph}?text=${msg}`, '_blank');
};

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ msg, type='ok', onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, []);
  return (
    <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} exit={{opacity:0,y:30}}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
      style={{background:type==='ok'?C.inkDeep:C.risk, color:'#fff', minWidth:260, maxWidth:400}}>
      {type==='ok' ? <Check size={15}/> : <AlertCircle size={15}/>}
      <span className="text-sm font-semibold">{msg}</span>
    </motion.div>
  );
};

// ─── Live dot ─────────────────────────────────────────────────────────────────
const LiveDot = ({ syncing }) => (
  <span className="flex items-center gap-1.5">
    <span className={`w-1.5 h-1.5 rounded-full ${syncing?'bg-amber-400':'bg-emerald-400 animate-pulse'}`}/>
    <span className="text-[9px] font-bold" style={{color:'rgba(255,255,255,0.45)'}}>
      {syncing ? 'Syncing…' : 'Live'}
    </span>
  </span>
);

// ─── Staff availability pill ──────────────────────────────────────────────────
const StaffPill = ({ s }) => {
  const bg  = s.isAvailable ? C.okPale   : s.isBusy ? C.warnPale : '#F3F4F6';
  const clr = s.isAvailable ? C.ok       : s.isBusy ? '#D97706'  : '#9CA3AF';
  const dot = s.isAvailable ? C.ok       : s.isBusy ? '#D97706'  : '#CBD5E1';
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{background:bg}}>
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:dot}}/>
      <p className="text-[11px] font-bold" style={{color:clr}}>{s.name}</p>
      <span className="text-[9px] font-semibold" style={{color:clr}}>{s.statusLabel}</span>
    </div>
  );
};

// ─── Success Banner ───────────────────────────────────────────────────────────
const SuccessBanner = ({ data, onClose }) => (
  <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}
    className="rounded-2xl p-5 mb-4" style={{background:C.okPale, border:`1px solid ${C.ok}30`}}>
    <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:C.ok}}>
          <Check size={18} className="text-white"/>
        </div>
        <div>
          <p className="text-sm font-bold" style={{color:C.ok}}>Walk-in booking created!</p>
          <p className="text-xs" style={{color:C.inkFaint}}>
            {data.customerName||'Walk-in'} · ₹{Rs(data.finalAmount)} · {data.invoiceRef}
          </p>
        </div>
      </div>
      <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full"
        style={{background:`${C.ok}20`, color:C.ok}}>
        <X size={13}/>
      </button>
    </div>
    <div className="flex items-center gap-2 flex-wrap">
      <button onClick={()=>printReceipt(data)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold hover:opacity-80"
        style={{background:C.ok, color:'#fff'}}>
        <Printer size={13}/> Print Receipt
      </button>
      {data.customerPhone && (
        <button onClick={()=>sendWhatsApp(data)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold hover:opacity-80"
          style={{background:'#25D366', color:'#fff'}}>
          <MessageCircle size={13}/> WhatsApp
        </button>
      )}
    </div>
  </motion.div>
);

// ─── Walk-In Form ─────────────────────────────────────────────────────────────
const WalkInPanel = ({ services, staffAvail, onClose, onSuccess }) => {
  const [saving,       setSaving]       = useState(false);
  const [custSearch,   setCustSearch]   = useState('');
  const [custName,     setCustName]     = useState('');
  const [custPhone,    setCustPhone]    = useState('');
  const [custId,       setCustId]       = useState('');
  const [loyaltyPts,   setLoyaltyPts]   = useState(0);
  const [custResults,  setCustResults]  = useState([]);
  const [custSearching,setCustSearching]= useState(false);
  const custTimer = useRef(null);

  const [selServices,  setSelServices]  = useState([]);
  const [svcSearch,    setSvcSearch]    = useState('');
  const [staffId,      setStaffId]      = useState('');
  const [method,       setMethod]       = useState('cash');
  const [notes,        setNotes]        = useState('');
  const [couponCode,   setCouponCode]   = useState('');
  const [appliedCoupon,setAppliedCoupon]= useState(null);
  const [couponMsg,    setCouponMsg]    = useState('');
  const [couponLoading,setCouponLoading]= useState(false);
  const [manualDiscPct,setManualDiscPct]= useState(0);

  const subtotal     = selServices.reduce((s,sv)=>s+sv.price,0);
  const couponDisc   = useMemo(()=>{
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountType==='percentage')
      return Math.min(Math.round(subtotal*appliedCoupon.discountValue/100), appliedCoupon.maxDiscount||9999);
    return appliedCoupon.discountValue||0;
  },[appliedCoupon, subtotal]);
  const manualDisc   = Math.round(subtotal * Math.min(50, manualDiscPct||0) / 100);
  const finalAmt     = Math.max(0, subtotal - couponDisc - manualDisc);
  const loyaltyEarned= Math.floor(finalAmt/100);

  const searchCustomers = q => {
    setCustSearch(q); setCustName(q); setCustId(''); setLoyaltyPts(0);
    clearTimeout(custTimer.current);
    if (!q||q.length<2) { setCustResults([]); return; }
    custTimer.current = setTimeout(async()=>{
      setCustSearching(true);
      try {
        // /api/users is admin-only; search customers via bookings instead
        const { data } = await api.get('/bookings', { params:{ search:q, limit:30 } });
        const seen = new Map();
        (data.bookings||[]).forEach(b=>{
          const c=b.customer; if(c&&c._id&&!seen.has(String(c._id))) seen.set(String(c._id),c);
        });
        setCustResults(Array.from(seen.values()).filter(c=>{
          const lq=q.toLowerCase();
          return c.name?.toLowerCase().includes(lq)||(c.phone||'').includes(q);
        }).slice(0,6));
      } catch {} finally { setCustSearching(false); }
    }, 350);
  };
  const selectCustomer = c => {
    setCustSearch(c.name); setCustName(c.name);
    setCustPhone(c.phone||''); setCustId(c._id); setLoyaltyPts(c.loyaltyPoints||0);
    setCustResults([]);
  };

  const verifyCoupon = async () => {
    if (!couponCode || subtotal===0) return;
    setCouponLoading(true); setCouponMsg('');
    try {
      const { data } = await api.post('/coupons/validate', {code:couponCode, amount:subtotal});
      setAppliedCoupon(data.coupon); setCouponMsg('✓ Coupon applied!');
    } catch(e) { setAppliedCoupon(null); setCouponMsg(e.response?.data?.message||'Invalid coupon'); }
    finally { setCouponLoading(false); }
  };

  const submit = async () => {
    if (!selServices.length) return;
    setSaving(true);
    try {
      await api.post('/bookings/walk-in', {
        customerName:  custName||'Walk-in Guest',
        customerPhone: custPhone,
        serviceIds:    selServices.map(s=>s.serviceId),   // full array — backend sums prices
        staffId:       staffId||undefined,
        paymentMethod: method,
        notes:         notes||'',
        couponCode:    appliedCoupon ? couponCode : '',
        manualDiscountPercent: manualDiscPct||0,
      });
      broadcastChange();
      onSuccess({
        invoiceRef:    makeRef(),
        customerName:  custName||'Walk-in Guest',
        customerPhone: custPhone,
        staffName:     staffAvail.find(s=>s._id===staffId)?.name || 'Any',
        services:      selServices,
        paymentMethod: method,
        couponDiscount:couponDisc,
        manualDiscount:manualDisc,
        finalAmount:   finalAmt,
        loyaltyPoints: loyaltyEarned,
      });
    } catch(e) { alert(e.response?.data?.message||'Failed to create booking'); }
    finally { setSaving(false); }
  };

  const filteredSvcs = useMemo(()=>services.filter(s=>
    !svcSearch || s.name.toLowerCase().includes(svcSearch.toLowerCase()) ||
    (s.category||'').toLowerCase().includes(svcSearch.toLowerCase())
  ),[services, svcSearch]);

  return (
    <div className="rounded-2xl overflow-hidden mb-5"
      style={{background:C.white, border:`1.5px solid ${C.creamBorder}`, boxShadow:'0 4px 32px rgba(184,134,11,0.1)'}}>
      <div className="flex items-center justify-between px-6 py-4"
        style={{borderBottom:`1px solid ${C.creamDark}`, background:C.goldPale}}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{background:`linear-gradient(135deg,${C.gold},${C.goldLight})`}}>
            <UserPlus size={16} className="text-white"/>
          </div>
          <div>
            <p className="text-sm font-bold" style={{color:C.ink}}>Walk-in Premium Billing</p>
            <p className="text-xs" style={{color:C.inkFaint}}>Multi-service · Customer lookup · Loyalty · Receipt</p>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{background:C.creamDark}}>
          <X size={14} style={{color:C.inkMid}}/>
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Customer */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{color:C.gold}}>
            <User size={12}/> Customer Details
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{color:C.inkFaint}}>Name / Search</label>
              <div className="relative">
                <Search size={13} style={{color:C.inkFaint,position:'absolute',left:12,top:'50%',transform:'translateY(-50%)'}}/>
                <input style={{...inp(),paddingLeft:34}} placeholder="Type name to search…"
                  value={custSearch} onChange={e=>searchCustomers(e.target.value)}
                  onFocus={e=>e.target.style.borderColor=C.gold}
                  onBlur={e=>e.target.style.borderColor=C.creamBorder}/>
                {custSearching && <Loader2 size={12} style={{color:C.gold,position:'absolute',right:12,top:'50%',transform:'translateY(-50%)'}} className="animate-spin"/>}
              </div>
              {custResults.length>0 && (
                <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-lg"
                  style={{background:C.white, border:`1px solid ${C.creamBorder}`}}>
                  {custResults.map(c=>(
                    <button key={c._id} type="button" onClick={()=>selectCustomer(c)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:opacity-80"
                      style={{borderBottom:`1px solid ${C.creamDark}`}}
                      onMouseEnter={e=>e.currentTarget.style.background=C.goldPale}
                      onMouseLeave={e=>e.currentTarget.style.background=C.white}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{background:C.gold}}>
                        {(c.name||'?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{color:C.ink}}>{c.name}</p>
                        <p className="text-xs" style={{color:C.inkFaint}}>{c.phone||c.email}</p>
                      </div>
                      {c.loyaltyPoints>0 && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{background:C.goldPale,color:C.gold}}>
                          ⭐ {c.loyaltyPoints}pts
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{color:C.inkFaint}}>Phone Number</label>
              <div className="flex rounded-xl overflow-hidden" style={{border:`1.5px solid ${C.creamBorder}`}}>
                <span className="flex items-center justify-center px-3 text-xs font-bold select-none"
                  style={{background:C.goldPale, borderRight:`1px solid ${C.creamBorder}`, color:C.gold, minWidth:48}}>+91</span>
                <input style={{...inp({border:'none',borderRadius:0,flex:1,paddingLeft:12})}}
                  type="tel" placeholder="98765 43210" maxLength={10}
                  value={custPhone}
                  onChange={e=>setCustPhone(e.target.value.replace(/\D/g,'').slice(0,10))}/>
              </div>
            </div>
            {custId && (
              <div className="sm:col-span-2 flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{background:C.goldPale, border:`1px solid ${C.creamBorder}`}}>
                <Star size={15} style={{color:C.gold}}/>
                <p className="text-xs font-bold" style={{color:C.ink}}>
                  Returning customer · {loyaltyPts} loyalty points · Will earn +{loyaltyEarned} more
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Services */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{color:C.gold}}>
            <Scissors size={12}/> Services
          </p>
          <div className="relative mb-3">
            <Search size={12} style={{color:C.inkFaint,position:'absolute',left:11,top:'50%',transform:'translateY(-50%)'}}/>
            <input value={svcSearch} onChange={e=>setSvcSearch(e.target.value)}
              placeholder="Search services…" style={{...inp({paddingLeft:32})}}
              onFocus={e=>e.target.style.borderColor=C.gold}
              onBlur={e=>e.target.style.borderColor=C.creamBorder}/>
          </div>
          <div className="grid gap-1.5 max-h-52 overflow-y-auto pr-1 mb-3">
            {filteredSvcs.filter(s=>!selServices.find(sel=>sel.serviceId===s._id)).map(s=>(
              <button key={s._id} type="button" onClick={()=>{
                  setSelServices(prev=>[...prev, {serviceId:s._id, name:s.name, price:s.discountPrice||s.price, duration:s.duration}]);
                  setSvcSearch('');
                }}
                className="flex items-center justify-between px-4 py-2.5 rounded-xl text-left hover:opacity-80"
                style={{background:C.cream, border:`1px solid ${C.creamBorder}`}}>
                <div>
                  <p className="text-xs font-bold" style={{color:C.ink}}>{s.name}</p>
                  <p className="text-[10px]" style={{color:C.inkFaint}}>{s.category} · {s.duration}min</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black" style={{color:C.gold}}>₹{Rs(s.discountPrice||s.price)}</p>
                  <Plus size={13} style={{color:C.gold}}/>
                </div>
              </button>
            ))}
          </div>
          {selServices.length>0 && (
            <div className="space-y-2">
              {selServices.map(s=>(
                <div key={s.serviceId} className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                  style={{background:C.goldPale, border:`1px solid ${C.creamBorder}`}}>
                  <div>
                    <p className="text-xs font-bold" style={{color:C.ink}}>{s.name}</p>
                    <p className="text-[10px]" style={{color:C.inkFaint}}>{s.duration}min</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold" style={{color:C.gold}}>₹{Rs(s.price)}</span>
                    <button type="button" onClick={()=>setSelServices(prev=>prev.filter(sv=>sv.serviceId!==s.serviceId))}
                      className="w-6 h-6 flex items-center justify-center rounded-full" style={{background:C.riskPale}}>
                      <X size={11} style={{color:C.risk}}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Staff */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{color:C.gold}}>
            <User size={12}/> Assign Stylist
          </p>
          <div className="flex flex-wrap gap-2">
            {staffAvail.map(s=>{
              const isSelected = staffId===s._id;
              const dotClr = s.isAvailable ? C.ok : s.isBusy ? '#D97706' : '#9CA3AF';
              return (
                <button key={s._id} type="button" onClick={()=>setStaffId(s._id)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: isSelected ? `linear-gradient(135deg,${C.gold},${C.goldLight})` : s.isAvailable ? C.okPale : C.warnPale,
                    color: isSelected ? '#fff' : s.isAvailable ? C.ok : '#92400E',
                    border: `1.5px solid ${isSelected?C.gold:s.isAvailable?`${C.ok}40`:`${C.warn}40`}`,
                  }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:isSelected?'rgba(255,255,255,0.6)':dotClr}}/>
                  {s.name}
                  <span className="text-[9px] opacity-75">{s.isAvailable?'· Free':s.isBusy?'· Busy':`· ${s.statusLabel}`}</span>
                  {isSelected && <Check size={10}/>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Coupon + Discount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{color:C.inkFaint}}>🏷 Coupon Code</label>
            <div className="flex gap-2">
              <input style={{...inp({flex:1})}} placeholder="e.g. SAVE20"
                value={couponCode} onChange={e=>setCouponCode(e.target.value.toUpperCase())}
                onFocus={e=>e.target.style.borderColor=C.gold}
                onBlur={e=>e.target.style.borderColor=C.creamBorder}/>
              <button type="button" onClick={verifyCoupon}
                disabled={couponLoading||!couponCode||subtotal===0}
                className="px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-40"
                style={{background:`linear-gradient(135deg,${C.gold},${C.goldLight})`,color:'#fff',flexShrink:0}}>
                {couponLoading?<Loader2 size={12} className="animate-spin"/>:'Apply'}
              </button>
            </div>
            {couponMsg && <p className="text-[11px] mt-1 font-semibold" style={{color:couponMsg.startsWith('✓')?C.ok:C.risk}}>{couponMsg}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{color:C.inkFaint}}>% Manual Discount (0–50%)</label>
            <input style={inp()} type="number" min={0} max={50} placeholder="0"
              value={manualDiscPct||''} onChange={e=>setManualDiscPct(Math.min(50,Math.max(0,Number(e.target.value))))}
              onFocus={e=>e.target.style.borderColor=C.gold}
              onBlur={e=>e.target.style.borderColor=C.creamBorder}/>
          </div>
        </div>

        {/* Payment */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{color:C.inkFaint}}>Payment Method</label>
          <div className="grid grid-cols-3 gap-2">
            {[['cash','Cash',Banknote],['upi','UPI',Smartphone],['card','Card',CreditCard]].map(([v,l,Icon])=>(
              <button key={v} type="button" onClick={()=>setMethod(v)}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: method===v ? `linear-gradient(135deg,${C.gold},${C.goldLight})` : C.cream,
                  color: method===v ? '#fff' : C.inkMid,
                  border: `1.5px solid ${method===v?C.gold:C.creamBorder}`,
                  transform: method===v ? 'scale(1.03)' : 'scale(1)',
                }}>
                <Icon size={16}/>{l}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{color:C.inkFaint}}>Notes (optional)</label>
          <textarea style={{...inp({resize:'vertical',minHeight:60})}}
            placeholder="Special requests…"
            value={notes} onChange={e=>setNotes(e.target.value)}
            onFocus={e=>e.target.style.borderColor=C.gold}
            onBlur={e=>e.target.style.borderColor=C.creamBorder}/>
        </div>

        {/* Summary */}
        {selServices.length>0 && (
          <div className="rounded-xl p-4 space-y-2" style={{background:C.goldPale, border:`1px solid ${C.creamBorder}`}}>
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{color:C.gold}}>Order Summary</p>
            {selServices.map(s=>(
              <div key={s.serviceId} className="flex justify-between text-sm" style={{color:C.inkMid}}>
                <span>{s.name}</span><span>₹{Rs(s.price)}</span>
              </div>
            ))}
            {couponDisc>0 && <div className="flex justify-between text-sm" style={{color:C.ok}}><span>Coupon</span><span>−₹{Rs(couponDisc)}</span></div>}
            {manualDisc>0 && <div className="flex justify-between text-sm" style={{color:C.ok}}><span>Discount ({manualDiscPct}%)</span><span>−₹{Rs(manualDisc)}</span></div>}
            <div className="flex justify-between text-base font-bold pt-2" style={{borderTop:`1px solid ${C.creamBorder}`, color:C.ink}}>
              <span>Total Payable</span>
              <span style={{color:C.gold}}>₹{Rs(finalAmt)}</span>
            </div>
          </div>
        )}

        <button type="button" onClick={submit}
          disabled={saving || selServices.length===0}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40"
          style={{background:`linear-gradient(135deg,${C.gold},${C.goldLight})`, color:'#fff'}}>
          {saving ? <Loader2 size={16} className="animate-spin"/> : <><Plus size={16}/> Create Booking — ₹{Rs(finalAmt)}</>}
        </button>
      </div>
    </div>
  );
};

// ─── Appointments Tab (full admin-grade) ──────────────────────────────────────
const AppointmentsTab = ({ staffAvail, services }) => {
  const { bookings: allBookings, stats, syncing, refresh } = useDataStore();

  const [loading,      setLoading]     = useState(false);
  const [lastRefresh,  setLastRefresh] = useState(null);
  const [searchQuery,  setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter]= useState('');
  const [typeFilter,   setTypeFilter]  = useState('');
  const [dateFilter,   setDateFilter]  = useState(getTodayIST());
  const [viewMode,     setViewMode]    = useState('grid');
  const [showWalkIn,   setShowWalkIn]  = useState(false);
  const [billDone,     setBillDone]    = useState(null);
  const [showAnalytics,setShowAnalytics]=useState(false);

  // Filter bookings locally from DataStore
  const bookings = allBookings.filter(b => {
    if (statusFilter && b.status !== statusFilter) return false;
    if (typeFilter   && b.type   !== typeFilter)   return false;
    if (dateFilter) {
      const bd = new Date(b.date).toISOString().split('T')[0];
      if (bd !== dateFilter) return false;
    }
    return true;
  });

  useEffect(() => { setLastRefresh(new Date()); }, [allBookings]);

  const doRefresh = useCallback(async () => {
    setLoading(true);
    await refresh(false);
    setLastRefresh(new Date());
    setLoading(false);
  }, [refresh]);

  const handleStatusChange = async (bookingId, status, paymentMethod, paymentStatus) => {
    try {
      const body = { status };
      if (paymentMethod) body.paymentMethod = paymentMethod;
      if (paymentStatus) body.paymentStatus = paymentStatus;
      await api.patch(`/bookings/${bookingId}/status`, body);
      broadcastChange(); // instantly update admin + other tabs
      await refresh(false);
    } catch(e) { console.error(e); }
  };

  const handleAssignStaff = async (bookingId, staffId) => {
    try {
      await api.patch(`/bookings/${bookingId}/assign`, {staffId:staffId||null});
      broadcastChange();
      await refresh(false);
    } catch(e) { console.error(e); }
  };

  const exportCSV = () => {
    const headers = ['Ref','Date','Customer','Phone','Service','Stylist','Status','Payment','Amount'];
    const rows = filteredBookings.map(b=>[
      makeRef(b._id), new Date(b.date).toLocaleDateString('en-IN'),
      b.customer?.name||'Walk-in', b.customer?.phone||'',
      b.service?.name||'', b.staff?.name||'Unassigned',
      b.status, b.paymentStatus, b.finalAmount||0,
    ]);
    const csv = [headers,...rows].map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));
    a.download = `Glamour-Bookings-${dateFilter}.csv`;
    a.click();
  };

  const filteredBookings = bookings.filter(b=>{
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const phone = (b.customer?.phone||'').replace(/\D/g,'');
    const qDigits = searchQuery.replace(/\D/g,'');
    return b.customer?.name?.toLowerCase().includes(q) ||
           b.service?.name?.toLowerCase().includes(q)  ||
           b.staff?.name?.toLowerCase().includes(q)    ||
           (b.customerName||'').toLowerCase().includes(q) ||
           (qDigits.length>=3 && phone.includes(qDigits));
  });

  const pendingPayments = bookings.filter(b=>b.status==='completed'&&b.paymentStatus!=='paid');
  const pendingTotal    = pendingPayments.reduce((s,b)=>s+(b.finalAmount||0),0);

  const staffWorkload = {};
  bookings.forEach(b=>{
    if (!b.staff) return;
    const id = b.staff._id||b.staff, name = b.staff.name||'';
    if (!staffWorkload[id]) staffWorkload[id] = {name, total:0, completed:0, inProgress:0, revenue:0};
    staffWorkload[id].total++;
    if (b.status==='completed') { staffWorkload[id].completed++; staffWorkload[id].revenue+=b.finalAmount||0; }
    if (b.status==='in-progress') staffWorkload[id].inProgress++;
  });

  const staffAvailForCard = staffAvail.map(s=>({
    _id:s._id, name:s.name,
    availability: s.isAvailable?'free':s.isBusy?'busy':'not-available',
  }));

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{fontFamily:"'Playfair Display',serif",color:C.ink}}>
            <Calendar size={18} style={{color:C.gold}}/> Appointments
          </h2>
          <p className="text-xs mt-0.5" style={{color:C.inkFaint}}>
            {dateFilter===getTodayIST()?'Today':dateFilter}
            {lastRefresh && ` · Updated ${lastRefresh.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {pendingPayments.length>0 && (
            <button onClick={()=>setStatusFilter('completed')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold animate-pulse"
              style={{background:C.warnPale,color:C.warn,border:`1px solid ${C.warn}30`}}>
              <Bell size={12}/> {pendingPayments.length} unpaid · ₹{Rs(pendingTotal)}
            </button>
          )}
          <button onClick={doRefresh}
            className="w-9 h-9 flex items-center justify-center rounded-xl"
            style={{background:C.white,border:`1.5px solid ${C.creamBorder}`}}>
            <RefreshCw size={14} style={{color:C.inkMid}} className={syncing?'animate-spin':''}/>
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
            style={{background:C.white,color:C.inkMid,border:`1.5px solid ${C.creamBorder}`}}>
            <Download size={13}/> Export
          </button>
          <button onClick={()=>setShowWalkIn(v=>!v)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90"
            style={{background:showWalkIn?C.inkDeep:`linear-gradient(135deg,${C.gold},${C.goldLight})`,color:'#fff'}}>
            {showWalkIn ? <><X size={12}/> Close</> : <><Plus size={13}/> Walk-in</>}
          </button>
        </div>
      </div>

      {/* Walk-in form */}
      <AnimatePresence>
        {showWalkIn && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="overflow-hidden">
            <WalkInPanel
              services={services}
              staffAvail={staffAvail}
              onClose={()=>setShowWalkIn(false)}
              onSuccess={(receipt)=>{ setShowWalkIn(false); setBillDone(receipt);  }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bill done banner */}
      <AnimatePresence>
        {billDone && <SuccessBanner data={billDone} onClose={()=>setBillDone(null)}/>}
      </AnimatePresence>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {label:'Total',      value:stats.total,               icon:Calendar,    accent:C.gold},
            {label:'Confirmed',  value:stats.confirmed,           icon:Clock,       accent:'#F59E0B'},
            {label:'In Service', value:stats.inProgress,          icon:Activity,    accent:'#10B981'},
            {label:'Completed',  value:stats.completed,           icon:CheckCircle2,accent:C.blue},
            {label:'Cancelled',  value:stats.cancelled,           icon:XCircle,     accent:'#EF4444'},
            {label:'Revenue',    value:`₹${Rs(stats.todayRevenue||0)}`, icon:IndianRupee, accent:C.gold},
          ].map((s,i)=>{
            const Icon = s.icon;
            return (
              <div key={i} className="rounded-2xl p-4 text-center relative overflow-hidden"
                style={{background:C.white,border:`1.5px solid ${C.creamBorder}`}}>
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:`linear-gradient(90deg,${s.accent}44,${s.accent},${s.accent}44)`}}/>
                <div className="w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{background:`${s.accent}18`}}>
                  <Icon size={14} style={{color:s.accent}}/>
                </div>
                <p className="text-lg font-bold" style={{fontFamily:"'Playfair Display',serif",color:C.ink}}>{s.value}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{color:C.inkFaint}}>{s.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Staff live status */}
      {staffAvail.length>0 && (
        <div className="rounded-2xl px-5 py-4" style={{background:C.white,border:`1.5px solid ${C.creamBorder}`}}>
          <div className="flex items-center gap-2 mb-3">
            <Activity size={12} style={{color:C.gold}}/>
            <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{color:C.gold}}>Live Staff Status</p>
            <span className="ml-auto text-[10px]" style={{color:C.inkGhost}}>
              {staffAvail.filter(s=>s.isAvailable).length} free · {staffAvail.filter(s=>s.isBusy).length} busy
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {staffAvail.map(s=><StaffPill key={s._id} s={s}/>)}
          </div>
        </div>
      )}

      {/* Analytics toggle */}
      {Object.keys(staffWorkload).length>0 && (
        <>
          <button onClick={()=>setShowAnalytics(v=>!v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={{background:showAnalytics?C.inkDeep:C.white,color:showAnalytics?'#fff':C.inkMid,border:`1.5px solid ${showAnalytics?C.inkDeep:C.creamBorder}`}}>
            <BarChart3 size={12}/> {showAnalytics?'Hide Analytics':'Staff Analytics'}
          </button>
          <AnimatePresence>
            {showAnalytics && (
              <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="overflow-hidden">
                <div className="rounded-2xl p-5 space-y-3" style={{background:C.white,border:`1.5px solid ${C.creamBorder}`}}>
                  <p className="text-sm font-bold" style={{color:C.ink}}>Staff Performance Today</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(staffWorkload).sort((a,b)=>b[1].revenue-a[1].revenue).map(([id,w])=>{
                      const maxRev = Math.max(...Object.values(staffWorkload).map(x=>x.revenue),1);
                      return (
                        <div key={id} className="rounded-xl p-4" style={{background:C.goldPale,border:`1px solid ${C.creamBorder}`}}>
                          <div className="flex justify-between mb-2">
                            <p className="text-xs font-bold" style={{color:C.ink}}>{w.name}</p>
                            <span className="text-xs font-bold" style={{color:C.gold}}>₹{Rs(w.revenue)}</span>
                          </div>
                          <div className="h-1.5 rounded-full mb-3" style={{background:C.creamBorder}}>
                            <div className="h-full rounded-full" style={{width:`${Math.round(w.revenue/maxRev*100)}%`,background:`linear-gradient(90deg,${C.gold},${C.goldLight})`}}/>
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-center">
                            {[['Total',w.total,C.inkFaint],['Done',w.completed,'#10B981'],['Active',w.inProgress,C.blue]].map(([l,v,col])=>(
                              <div key={l}>
                                <p className="text-sm font-bold" style={{color:col}}>{v}</p>
                                <p className="text-[9px] uppercase" style={{color:C.inkFaint}}>{l}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Pending payments alert */}
      {pendingPayments.length>0 && !statusFilter && (
        <div className="rounded-2xl overflow-hidden" style={{border:`2px solid ${C.warn}50`,background:C.warnPale}}>
          <div className="flex items-center justify-between px-5 py-3" style={{borderBottom:`1px solid ${C.warn}30`}}>
            <p className="text-xs font-bold flex items-center gap-2" style={{color:C.warn}}>
              <AlertCircle size={12}/> {pendingPayments.length} bookings awaiting payment · ₹{Rs(pendingTotal)} pending
            </p>
            <button onClick={()=>setStatusFilter('completed')}
              className="text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1"
              style={{background:`${C.warn}20`,color:C.warn}}>
              View all <ChevronRight size={11}/>
            </button>
          </div>
          <div className="px-5 py-3 flex flex-wrap gap-2">
            {pendingPayments.slice(0,4).map(b=>(
              <div key={b._id} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                style={{background:C.white,border:`1px solid ${C.warn}30`,color:C.warn}}>
                <span className="font-bold">{b.customer?.name||'Walk-in'}</span>
                <span>·</span><span>{b.service?.name}</span>
                <span className="font-bold" style={{color:C.gold}}>₹{Rs(b.finalAmount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="rounded-2xl p-4 space-y-3" style={{background:C.white,border:`1.5px solid ${C.creamBorder}`}}>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} style={{color:C.inkFaint,position:'absolute',left:12,top:'50%',transform:'translateY(-50%)'}}/>
            <input style={{...inp(),paddingLeft:36}}
              placeholder="Search name, phone, service…"
              value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
              onFocus={e=>e.target.style.borderColor=C.gold}
              onBlur={e=>e.target.style.borderColor=C.creamBorder}/>
            {searchQuery && (
              <button onClick={()=>setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X size={13} style={{color:C.inkFaint}}/>
              </button>
            )}
          </div>
          <input type="date" value={dateFilter} onChange={e=>setDateFilter(e.target.value)}
            style={{...inp(),width:'auto',cursor:'pointer'}}
            onFocus={e=>e.target.style.borderColor=C.gold}
            onBlur={e=>e.target.style.borderColor=C.creamBorder}/>
          <button onClick={()=>setDateFilter(getTodayIST())}
            className="px-3 py-2 rounded-xl text-xs font-bold"
            style={{background:dateFilter===getTodayIST()?`linear-gradient(135deg,${C.gold},${C.goldLight})`:C.cream,
              color:dateFilter===getTodayIST()?'#fff':C.inkMid,border:`1.5px solid ${dateFilter===getTodayIST()?C.gold:C.creamBorder}`}}>
            Today
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1.5 flex-wrap">
            {[['','All'],['confirmed','Confirmed'],['in-progress','In Progress'],['completed','Completed'],['cancelled','Cancelled']].map(([s,l])=>(
              <button key={s} onClick={()=>setStatusFilter(s)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{background:statusFilter===s?`linear-gradient(135deg,${C.gold},${C.goldLight})`:C.cream,
                  color:statusFilter===s?'#fff':C.inkMid,border:`1px solid ${statusFilter===s?C.gold:C.creamBorder}`}}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 ml-auto flex-wrap">
            {[['','All'],['online','Online'],['walk-in','Walk-in']].map(([v,l])=>(
              <button key={v} onClick={()=>setTypeFilter(v)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{background:typeFilter===v?C.inkDeep:C.cream,color:typeFilter===v?'#fff':C.inkMid,border:`1px solid ${typeFilter===v?C.inkDeep:C.creamBorder}`}}>
                {l}
              </button>
            ))}
            <div className="flex gap-1 rounded-xl p-1" style={{background:C.cream,border:`1px solid ${C.creamBorder}`}}>
              {[['grid','▦'],['list','☰']].map(([m,ic])=>(
                <button key={m} onClick={()=>setViewMode(m)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-sm"
                  style={{background:viewMode===m?C.white:'transparent',color:viewMode===m?C.gold:C.inkFaint,boxShadow:viewMode===m?'0 1px 4px rgba(0,0,0,0.08)':'none'}}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bookings */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{background:`linear-gradient(135deg,${C.gold},${C.goldLight})`}}>
            <Loader2 size={22} className="text-white animate-spin"/>
          </div>
          <p className="text-sm" style={{color:C.inkFaint}}>Loading appointments…</p>
        </div>
      ) : filteredBookings.length===0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 rounded-2xl"
          style={{background:C.white,border:`1.5px solid ${C.creamBorder}`}}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{background:C.goldPale}}>
            <Calendar size={28} style={{color:C.gold}}/>
          </div>
          <p className="font-bold" style={{color:C.ink}}>No appointments found</p>
          <div className="flex gap-2">
            <button onClick={()=>{setSearchQuery('');setStatusFilter('');setTypeFilter('');}}
              className="flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-full"
              style={{background:C.inkDeep,color:'#fff'}}><X size={13}/> Clear filters</button>
            <button onClick={()=>setDateFilter('')}
              className="flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-full"
              style={{background:C.gold,color:'#fff'}}>All Dates</button>
          </div>
        </div>
      ) : (
        <div className={viewMode==='grid'?'grid grid-cols-1 lg:grid-cols-2 gap-4':'flex flex-col gap-3'}>
          {filteredBookings.map((booking,i)=>(
            <BookingCard
              key={booking._id}
              booking={booking}
              onStatusChange={handleStatusChange}
              onAssignStaff={handleAssignStaff}
              staffAvailability={staffAvailForCard}
              showActions={true}
              role="admin"
              viewMode={viewMode}
              index={i}
            />
          ))}
        </div>
      )}

      {!loading && filteredBookings.length>0 && (
        <div className="flex items-center justify-between text-xs font-medium" style={{color:C.inkFaint}}>
          <span>Showing {filteredBookings.length} of {bookings.length} appointments</span>
          <span style={{color:C.gold}}>₹{Rs(filteredBookings.filter(b=>b.paymentStatus==='paid').reduce((s,b)=>s+(b.finalAmount||0),0))} collected</span>
        </div>
      )}
    </div>
  );
};

// ─── Inventory Tab ─────────────────────────────────────────────────────────────
const InventoryTab = () => {
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filterLow,setFilterLow]= useState(false);
  const [category, setCategory] = useState('all');

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try { const {data}=await api.get('/inventory',{params:{limit:300}}); setProducts(data.products||[]); }
      catch {} finally { setLoading(false); }
    })();
  },[]);

  const CATS = useMemo(()=>['all',...new Set(products.map(p=>p.category).filter(Boolean))],[products]);
  const filtered = useMemo(()=>products.filter(p=>{
    const q=search.toLowerCase();
    return (!q||p.name?.toLowerCase().includes(q)||(p.brand||'').toLowerCase().includes(q))
      &&(category==='all'||p.category===category)
      &&(!filterLow||p.quantity<=p.lowStockThreshold);
  }),[products,search,category,filterLow]);

  const stats = useMemo(()=>({
    total: products.length,
    low:   products.filter(p=>p.quantity<=p.lowStockThreshold&&p.quantity>0).length,
    empty: products.filter(p=>p.quantity===0).length,
    value: products.reduce((a,p)=>a+(p.quantity*(p.sellingPrice||0)),0),
  }),[products]);

  const exportCSV = (onlyLow = false) => {
    const list = onlyLow ? products.filter(p => p.quantity <= p.lowStockThreshold) : products;
    const rows=[['Name','Category','Brand','Qty','Unit','Cost Price','Selling Price','Stock Value','Low Threshold','Supplier','Status']];
    list.forEach(p => rows.push([
      p.name, p.category || '', p.brand || '', p.quantity, p.unit || '',
      p.costPrice || 0, p.sellingPrice || 0, p.quantity * (p.costPrice || 0),
      p.lowStockThreshold || 0, p.supplier?.name || '',
      p.quantity === 0 ? 'Out of Stock' : p.quantity <= p.lowStockThreshold ? 'Low Stock' : 'OK',
    ]));
    const csv=rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
    const a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv);
    a.download=`Inventory-${onlyLow ? 'Reorder' : 'Full'}-${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 size={24} className="animate-spin" style={{color:C.gold}}/></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {label:'Products', val:stats.total,       color:C.goldMid, bg:C.goldPale,  icon:Package},
          {label:'Low Stock', val:stats.low,         color:C.warn,    bg:C.warnPale,  icon:AlertTriangle},
          {label:'Out of Stock',val:stats.empty,     color:C.risk,    bg:C.riskPale,  icon:XCircle},
          {label:'Stock Value', val:`₹${Rs(stats.value)}`,color:C.ok,bg:C.okPale,    icon:IndianRupee},
        ].map(({label,val,color,bg,icon:Icon})=>(
          <div key={label} className="rounded-2xl p-4" style={{background:bg,border:`1.5px solid ${color}18`}}>
            <Icon size={16} style={{color,marginBottom:8}}/>
            <p className="text-lg font-black" style={{color}}>{val}</p>
            <p className="text-[10px] font-semibold mt-0.5" style={{color:`${color}90`}}>{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 p-4 rounded-2xl" style={{background:C.white,border:`1.5px solid ${C.creamBorder}`}}>
        <p className="text-[11px] font-black uppercase tracking-wider w-full mb-1" style={{color:C.inkFaint}}>Quick Actions</p>
        <button onClick={()=>exportCSV(false)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold hover:opacity-80"
          style={{background:C.okPale,color:C.ok,border:`1px solid ${C.ok}25`}}>
          <Download size={13}/> Export Full Stock
        </button>
        <button onClick={()=>exportCSV(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold hover:opacity-80"
          style={{background:C.warnPale,color:C.warn,border:`1px solid ${C.warn}25`}}>
          <Download size={13}/> Export Reorder List
        </button>
        <button onClick={()=>setFilterLow(f=>!f)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold hover:opacity-80"
          style={{background:filterLow?C.warnPale:C.white,color:filterLow?C.warn:C.inkFaint,border:`1.5px solid ${filterLow?C.warn+'50':C.creamBorder}`}}>
          <AlertTriangle size={12}/> {filterLow?'Showing Low Only':'Low Stock Only'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={12} style={{color:C.inkFaint,position:'absolute',left:10,top:'50%',transform:'translateY(-50%)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
            style={{...inp({paddingLeft:30})}}
            onFocus={e=>e.target.style.borderColor=C.gold}
            onBlur={e=>e.target.style.borderColor=C.creamBorder}/>
        </div>
        <select value={category} onChange={e=>setCategory(e.target.value)} style={{...inp({cursor:'pointer',width:'auto',minWidth:140})}}>
          {CATS.map(c=><option key={c} value={c}>{c==='all'?'All Categories':c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
        </select>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{border:`1.5px solid ${C.creamBorder}`}}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{background:C.creamMid}}>
                {['Product','Category','Qty','Min Level','Price','Status'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider" style={{color:C.inkFaint}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p,i)=>{
                const isOut=p.quantity===0, isLow=!isOut&&p.quantity<=p.lowStockThreshold;
                const sc=isOut?C.risk:isLow?C.warn:C.ok;
                const sb=isOut?C.riskPale:isLow?C.warnPale:C.okPale;
                return (
                  <tr key={p._id} style={{borderTop:i>0?`1px solid ${C.creamBorder}`:'none',background:i%2===0?C.white:C.cream}}>
                    <td className="px-4 py-3"><p className="text-sm font-semibold" style={{color:C.ink}}>{p.name}</p><p className="text-[10px]" style={{color:C.inkFaint}}>{p.brand||''}</p></td>
                    <td className="px-4 py-3"><span className="text-[11px] capitalize" style={{color:C.inkFaint}}>{p.category||'—'}</span></td>
                    <td className="px-4 py-3"><p className="text-sm font-bold" style={{color:sc}}>{p.quantity} <span className="text-[10px] font-normal">{p.unit||''}</span></p></td>
                    <td className="px-4 py-3"><span className="text-[11px]" style={{color:C.inkFaint}}>{p.lowStockThreshold||'—'}</span></td>
                    <td className="px-4 py-3"><span className="text-sm font-semibold" style={{color:C.gold}}>₹{Rs(p.sellingPrice||0)}</span></td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{background:sb,color:sc}}>
                        {isOut?'Out of Stock':isLow?'Low Stock':'OK'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length===0&&(
            <div className="py-14 text-center">
              <Package size={28} style={{color:C.creamDark,margin:'0 auto 8px'}}/>
              <p className="text-sm" style={{color:C.inkFaint}}>No products found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Customers Tab ─────────────────────────────────────────────────────────────
const CustomersTab = () => {
  const [customers,  setCustomers] = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [search,     setSearch]    = useState('');
  const [selected,   setSelected]  = useState(null);
  const [history,    setHistory]   = useState([]);
  const [loadingHist,setLoadingHist]=useState(false);

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try {
        // /api/users is admin-only; fetch unique customers via bookings instead
        const {data} = await api.get('/bookings', { params:{ limit:500 } });
        const bookings = data.bookings || [];
        // Deduplicate customers by _id
        const seen = new Map();
        bookings.forEach(b => {
          const c = b.customer;
          if (c && c._id && !seen.has(String(c._id))) seen.set(String(c._id), c);
        });
        setCustomers(Array.from(seen.values()));
      }
      catch {} finally { setLoading(false); }
    })();
  },[]);

  const viewCustomer=async(c)=>{
    setSelected(c); setLoadingHist(true);
    try { const {data}=await api.get('/bookings',{params:{customerId:c._id,limit:20}}); setHistory(data.bookings||[]); }
    catch { setHistory([]); } finally { setLoadingHist(false); }
  };

  const filtered=customers.filter(c=>{
    const q=search.toLowerCase();
    return !q||c.name?.toLowerCase().includes(q)||(c.phone||'').includes(q)||(c.email||'').toLowerCase().includes(q);
  });

  const totalSpend=history.filter(b=>b.status==='completed'&&b.paymentStatus==='paid').reduce((a,b)=>a+(b.finalAmount||0),0);

  const exportCustomersCSV = () => {
    const rows=[['Name','Phone','Email','Joined']];
    filtered.forEach(c=>rows.push([c.name||'',c.phone||'',c.email||'',c.createdAt?fmtDt(c.createdAt):'']));
    const csv=rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
    const a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv);
    a.download=`Customers-${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  if(loading) return <div className="flex items-center justify-center py-24"><Loader2 size={24} className="animate-spin" style={{color:C.gold}}/></div>;

  return (
    <div className="flex gap-4">
      <div className={`${selected?'hidden sm:flex':'flex'} flex-col gap-3`} style={{width:selected?300:undefined,minWidth:selected?300:0,flex:selected?undefined:1}}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={12} style={{color:C.inkFaint,position:'absolute',left:10,top:'50%',transform:'translateY(-50%)'}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${customers.length} customers…`}
              style={{...inp({paddingLeft:30})}}
              onFocus={e=>e.target.style.borderColor=C.gold}
              onBlur={e=>e.target.style.borderColor=C.creamBorder}/>
          </div>
          <button onClick={exportCustomersCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold hover:opacity-80 flex-shrink-0"
            style={{background:C.okPale,color:C.ok,border:`1px solid ${C.ok}25`}}>
            <Download size={12}/> CSV
          </button>
        </div>
        <div className="space-y-2 overflow-y-auto" style={{maxHeight:'72vh'}}>
          {filtered.map(c=>(
            <button key={c._id} onClick={()=>viewCustomer(c)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl text-left hover:opacity-80"
              style={{background:selected?._id===c._id?C.goldPale:C.white,border:`1.5px solid ${selected?._id===c._id?C.goldMid:C.creamBorder}`}}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black flex-shrink-0"
                style={{background:C.creamMid,color:C.inkMid,fontSize:15}}>
                {(c.name||'?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{color:C.ink}}>{c.name||'—'}</p>
                <p className="text-[11px]" style={{color:C.inkFaint}}>{c.phone||c.email||'—'}</p>
              </div>
              <ChevronRight size={14} style={{color:C.inkGhost}}/>
            </button>
          ))}
          {!filtered.length && <div className="py-12 text-center"><Users size={24} style={{color:C.creamDark,margin:'0 auto 8px'}}/><p className="text-sm" style={{color:C.inkFaint}}>No customers found</p></div>}
        </div>
      </div>

      {selected && (
        <motion.div initial={{x:20,opacity:0}} animate={{x:0,opacity:1}} className="flex-1 space-y-4" style={{minWidth:0}}>
          <button onClick={()=>setSelected(null)} className="sm:hidden flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{background:C.creamMid,color:C.inkMid}}>← Back</button>

          <div className="rounded-2xl p-5 space-y-3" style={{background:C.white,border:`1.5px solid ${C.creamBorder}`}}>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0"
                style={{background:C.goldPale,color:C.goldMid}}>
                {(selected.name||'?')[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-lg font-black" style={{color:C.ink}}>{selected.name||'—'}</p>
                <p className="text-sm" style={{color:C.inkFaint}}>Since {selected.createdAt?fmtDt(selected.createdAt):'—'}</p>
              </div>
              <div className="flex gap-2">
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold hover:opacity-80"
                    style={{background:C.okPale,color:C.ok}}>
                    <Phone size={12}/> Call
                  </a>
                )}
                {selected.phone && (
                  <button onClick={()=>sendWhatsApp({customerName:selected.name,customerPhone:selected.phone,services:[],finalAmount:0,staffName:''})}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold hover:opacity-80"
                    style={{background:'#EAF4EE',color:'#1A7A45'}}>
                    <MessageCircle size={12}/> WhatsApp
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[['Phone',selected.phone||'—',Phone],['Email',selected.email||'—',Mail],['Loyalty',`${selected.loyaltyPoints||0}pts`,Star],['Joined',selected.createdAt?fmtDt(selected.createdAt):'—',Calendar]].map(([label,val,Icon])=>(
                <div key={label} className="flex items-center gap-3 p-3 rounded-xl" style={{background:C.cream}}>
                  <Icon size={13} style={{color:C.inkFaint,flexShrink:0}}/>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase" style={{color:C.inkGhost}}>{label}</p>
                    <p className="text-sm font-semibold truncate" style={{color:C.ink}}>{val}</p>
                  </div>
                </div>
              ))}
            </div>
            {history.length>0 && (
              <div className="flex gap-3 p-3 rounded-xl" style={{background:C.goldPale}}>
                <div className="text-center flex-1">
                  <p className="text-xl font-black" style={{color:C.gold}}>{history.filter(b=>b.status==='completed').length}</p>
                  <p className="text-[10px] font-bold" style={{color:C.inkFaint}}>Visits</p>
                </div>
                <div className="text-center flex-1" style={{borderLeft:`1px solid ${C.creamBorder}`}}>
                  <p className="text-xl font-black" style={{color:C.gold}}>₹{Rs(totalSpend)}</p>
                  <p className="text-[10px] font-bold" style={{color:C.inkFaint}}>Spent</p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl overflow-hidden" style={{border:`1.5px solid ${C.creamBorder}`}}>
            <div className="px-4 py-3" style={{background:C.creamMid}}>
              <p className="text-[11px] font-black uppercase tracking-wider" style={{color:C.inkFaint}}>Booking History ({history.length})</p>
            </div>
            {loadingHist ? (
              <div className="py-8 flex items-center justify-center"><Loader2 size={16} className="animate-spin" style={{color:C.gold}}/></div>
            ) : !history.length ? (
              <div className="py-8 text-center text-sm" style={{color:C.inkFaint}}>No bookings found</div>
            ) : history.slice(0,12).map((b,i)=>{
              const st=STATUS[b.status]||STATUS.pending;
              return (
                <div key={b._id} className="flex items-center justify-between px-4 py-3"
                  style={{borderTop:i>0?`1px solid ${C.creamBorder}`:'none'}}>
                  <div>
                    <p className="text-sm font-semibold" style={{color:C.ink}}>{b.service?.name||'—'}</p>
                    <p className="text-[11px]" style={{color:C.inkFaint}}>{b.date?fmtDt(b.date):'—'} · {b.staff?.name||'Unassigned'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{color:C.gold}}>₹{Rs(b.finalAmount)}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:st.bg,color:st.color}}>{st.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ─── Cash Counter Tab ──────────────────────────────────────────────────────────
const CashCounterTab = () => {
  const [entries,  setEntries]  = useState([]);
  const [amount,   setAmount]   = useState('');
  const [type,     setType]     = useState('add'); // add | subtract | correction
  const [note,     setNote]     = useState('');
  const [method,   setMethod]   = useState('cash');
  const [opening,  setOpening]  = useState(0);

  // Load from localStorage for persistence within session
  useEffect(() => {
    try {
      const saved = localStorage.getItem('glamour_cash_counter');
      if (saved) {
        const parsed = JSON.parse(saved);
        const today = getTodayIST();
        if (parsed.date === today) {
          setEntries(parsed.entries || []);
          setOpening(parsed.opening || 0);
        }
      }
    } catch {}
  }, []);

  const saveLocal = (newEntries, newOpening) => {
    try {
      localStorage.setItem('glamour_cash_counter', JSON.stringify({
        date: getTodayIST(), entries: newEntries, opening: newOpening ?? opening,
      }));
    } catch {}
  };

  const balance = useMemo(() => {
    return opening + entries.reduce((sum, e) => sum + e.signedAmount, 0);
  }, [entries, opening]);

  const totalIn  = entries.filter(e => e.signedAmount > 0).reduce((s, e) => s + e.signedAmount, 0);
  const totalOut = entries.filter(e => e.signedAmount < 0).reduce((s, e) => s + Math.abs(e.signedAmount), 0);

  const addEntry = () => {
    const num = Number(amount);
    if (!num || num <= 0) return;
    const signedAmount = type === 'subtract' || type === 'correction' ? -num : num;
    const entry = {
      id: Date.now(),
      type,
      amount: num,
      signedAmount,
      note: note || (type === 'add' ? 'Cash in' : type === 'subtract' ? 'Cash out' : 'Correction'),
      method,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
    const updated = [entry, ...entries];
    setEntries(updated);
    saveLocal(updated);
    setAmount(''); setNote('');
  };

  const setOpeningBalance = () => {
    const num = Number(amount);
    if (isNaN(num)) return;
    setOpening(num);
    saveLocal(entries, num);
    setAmount(''); setNote('');
  };

  const clearDay = () => {
    if (!window.confirm('Clear all entries for today?')) return;
    setEntries([]); setOpening(0);
    localStorage.removeItem('glamour_cash_counter');
  };

  const exportCSV = () => {
    const rows = [['Time', 'Type', 'Amount', 'Method', 'Note', 'Running Balance']];
    let running = opening;
    [...entries].reverse().forEach(e => {
      running += e.signedAmount;
      rows.push([e.time, e.type, e.signedAmount > 0 ? `+${e.amount}` : `-${e.amount}`, e.method, e.note, running]);
    });
    rows.push([]);
    rows.push(['Opening Balance', opening]);
    rows.push(['Total In', totalIn]);
    rows.push(['Total Out', totalOut]);
    rows.push(['Closing Balance', balance]);
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
    a.download = `CashCounter-${getTodayIST()}.csv`; a.click();
  };

  const TYPE_CFG = {
    add:        { label: 'Cash In',     color: C.ok,     bg: C.okPale,     icon: ArrowUp,   prefix: '+' },
    subtract:   { label: 'Cash Out',    color: C.risk,   bg: C.riskPale,   icon: ArrowDown,  prefix: '−' },
    correction: { label: 'Correction',  color: C.warn,   bg: C.warnPale,   icon: RotateCcw,  prefix: '−' },
  };

  return (
    <div className="space-y-4">
      {/* Balance Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Opening', val: `₹${Rs(opening)}`, color: C.inkMid, bg: C.creamMid, icon: Wallet },
          { label: 'Cash In', val: `₹${Rs(totalIn)}`, color: C.ok, bg: C.okPale, icon: ArrowUp },
          { label: 'Cash Out', val: `₹${Rs(totalOut)}`, color: C.risk, bg: C.riskPale, icon: ArrowDown },
          { label: 'Balance', val: `₹${Rs(balance)}`, color: balance >= 0 ? C.ok : C.risk, bg: balance >= 0 ? C.okPale : C.riskPale, icon: IndianRupee },
        ].map(({ label, val, color, bg, icon: Icon }) => (
          <div key={label} className="rounded-2xl p-4" style={{ background: bg, border: `1.5px solid ${color}18` }}>
            <Icon size={16} style={{ color, marginBottom: 8 }} />
            <p className="text-lg font-black" style={{ color }}>{val}</p>
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: `${color}90` }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Entry Form */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: C.white, border: `1.5px solid ${C.creamBorder}` }}>
        <p className="text-[11px] font-black uppercase tracking-wider" style={{ color: C.inkFaint }}>Add Entry</p>

        {/* Type selector */}
        <div className="flex gap-2">
          {[['add', 'Cash In', C.ok, C.okPale], ['subtract', 'Cash Out', C.risk, C.riskPale], ['correction', 'Correction', C.warn, C.warnPale]].map(([v, l, col, bg]) => (
            <button key={v} onClick={() => setType(v)}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{ background: type === v ? bg : C.cream, color: type === v ? col : C.inkFaint, border: `1.5px solid ${type === v ? col + '50' : C.creamBorder}` }}>
              {l}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: C.inkFaint }}>Amount (₹)</label>
            <input type="number" min="0" step="1" placeholder="Enter amount…"
              value={amount} onChange={e => setAmount(e.target.value)} style={inp()}
              onFocus={e => e.target.style.borderColor = C.gold} onBlur={e => e.target.style.borderColor = C.creamBorder} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: C.inkFaint }}>Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)} style={{ ...inp({ cursor: 'pointer' }) }}>
              <option value="cash">💵 Cash</option>
              <option value="upi">📱 UPI</option>
              <option value="card">💳 Card</option>
              <option value="other">💰 Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: C.inkFaint }}>Note</label>
          <input placeholder={type === 'subtract' ? 'e.g. Vendor payment, change given…' : type === 'correction' ? 'e.g. Mismatch correction, short by…' : 'e.g. Walk-in payment, tip…'}
            value={note} onChange={e => setNote(e.target.value)} style={inp()}
            onFocus={e => e.target.style.borderColor = C.gold} onBlur={e => e.target.style.borderColor = C.creamBorder} />
        </div>

        <div className="flex gap-2">
          <button onClick={addEntry} disabled={!amount || Number(amount) <= 0}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold disabled:opacity-40"
            style={{ background: `linear-gradient(135deg,${C.gold},${C.goldLight})`, color: '#fff' }}>
            {type === 'add' ? <ArrowUp size={14} /> : type === 'subtract' ? <ArrowDown size={14} /> : <RotateCcw size={14} />}
            {type === 'add' ? `Add ₹${amount || '0'}` : type === 'subtract' ? `Subtract ₹${amount || '0'}` : `Correct −₹${amount || '0'}`}
          </button>
          <button onClick={setOpeningBalance} title="Set opening balance"
            className="px-4 py-3 rounded-xl text-xs font-bold"
            style={{ background: C.creamMid, color: C.inkMid, border: `1px solid ${C.creamBorder}` }}>
            Set Opening
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold hover:opacity-80"
          style={{ background: C.okPale, color: C.ok, border: `1px solid ${C.ok}25` }}>
          <Download size={13} /> Export CSV
        </button>
        <button onClick={clearDay}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold hover:opacity-80"
          style={{ background: C.riskPale, color: C.risk, border: `1px solid ${C.risk}25` }}>
          <RotateCcw size={13} /> Clear Day
        </button>
      </div>

      {/* Entries List */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${C.creamBorder}` }}>
        <div className="px-5 py-3" style={{ background: C.creamMid }}>
          <p className="text-[11px] font-black uppercase tracking-wider" style={{ color: C.inkFaint }}>
            Today's Entries ({entries.length})
          </p>
        </div>
        {entries.length === 0 ? (
          <div className="py-12 text-center">
            <Wallet size={28} style={{ color: C.creamDark, margin: '0 auto 8px' }} />
            <p className="text-sm" style={{ color: C.inkFaint }}>No entries yet. Add your opening balance to start.</p>
          </div>
        ) : (
          <div>
            {entries.map((e, i) => {
              const cfg = TYPE_CFG[e.type] || TYPE_CFG.add;
              const Icon = cfg.icon;
              return (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3"
                  style={{ borderTop: i > 0 ? `1px solid ${C.creamBorder}` : 'none', background: i % 2 === 0 ? C.white : C.cream }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                    <Icon size={14} style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: C.ink }}>{e.note}</p>
                    <p className="text-[10px]" style={{ color: C.inkFaint }}>{e.time} · {e.method}</p>
                  </div>
                  <p className="text-sm font-black flex-shrink-0" style={{ color: e.signedAmount >= 0 ? C.ok : C.risk }}>
                    {e.signedAmount >= 0 ? '+' : '−'}₹{Rs(Math.abs(e.signedAmount))}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Staff Tab ─────────────────────────────────────────────────────────────────
const StaffTab = ({ staffList }) => {
  const [allStaff,  setAllStaff] = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [selected,  setSelected] = useState(null);
  const [search,    setSearch]   = useState('');
  const [todayBk,   setTodayBk]  = useState([]);
  const [loadingBk, setLoadingBk]= useState(false);

  useEffect(()=>{
    // staffList comes from the parent fetchShared via /staff/live-status (accessible to receptionist)
    setAllStaff(staffList||[]);
    setLoading(false);
  },[staffList]);

  const enriched = useMemo(()=>allStaff,[allStaff]);

  const viewStaff=async(s)=>{
    setSelected(s); setLoadingBk(true);
    const today=new Date().toISOString().split('T')[0];
    try { const {data}=await api.get('/bookings',{params:{staffId:s._id,date:today,limit:20}}); setTodayBk(data.bookings||[]); }
    catch { setTodayBk([]); } finally { setLoadingBk(false); }
  };

  const filtered=enriched.filter(s=>{
    const q=search.toLowerCase();
    return !q||s.name?.toLowerCase().includes(q)||(s.designation||'').toLowerCase().includes(q);
  });

  if(loading) return <div className="flex items-center justify-center py-24"><Loader2 size={24} className="animate-spin" style={{color:C.gold}}/></div>;

  return (
    <div className="flex gap-4">
      <div className={`${selected?'hidden sm:flex':'flex'} flex-col gap-3`} style={{width:selected?300:undefined,minWidth:selected?300:0,flex:selected?undefined:1}}>
        <div className="relative">
          <Search size={12} style={{color:C.inkFaint,position:'absolute',left:10,top:'50%',transform:'translateY(-50%)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search staff…"
            style={{...inp({paddingLeft:30})}}
            onFocus={e=>e.target.style.borderColor=C.gold}
            onBlur={e=>e.target.style.borderColor=C.creamBorder}/>
        </div>
        <div className="space-y-2 overflow-y-auto" style={{maxHeight:'72vh'}}>
          {filtered.map(s=>{
            const dot=s.isAvailable?C.ok:s.isBusy?'#D97706':'#9CA3AF';
            return (
              <button key={s._id} onClick={()=>viewStaff(s)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl text-left hover:opacity-80"
                style={{background:selected?._id===s._id?C.goldPale:C.white,border:`1.5px solid ${selected?._id===s._id?C.goldMid:C.creamBorder}`}}>
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black"
                    style={{background:C.creamMid,color:C.inkMid,fontSize:15}}>{(s.name||'?')[0].toUpperCase()}</div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{background:dot}}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{color:C.ink}}>{s.name||'—'}</p>
                  <p className="text-[11px]" style={{color:C.inkFaint}}>{s.designation||'Stylist'} · <span style={{color:dot}}>{s.statusLabel||'—'}</span></p>
                </div>
                <ChevronRight size={14} style={{color:C.inkGhost}}/>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <motion.div initial={{x:20,opacity:0}} animate={{x:0,opacity:1}} className="flex-1 space-y-4" style={{minWidth:0}}>
          <button onClick={()=>setSelected(null)} className="sm:hidden flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{background:C.creamMid,color:C.inkMid}}>← Back</button>

          <div className="rounded-2xl p-5 space-y-3" style={{background:C.white,border:`1.5px solid ${C.creamBorder}`}}>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl"
                  style={{background:C.goldPale,color:C.goldMid}}>{(selected.name||'?')[0].toUpperCase()}</div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white"
                  style={{background:selected.isAvailable?C.ok:selected.isBusy?'#D97706':'#9CA3AF'}}/>
              </div>
              <div>
                <p className="text-lg font-black" style={{color:C.ink}}>{selected.name||'—'}</p>
                <p className="text-sm" style={{color:C.inkFaint}}>{selected.designation||'Stylist'}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl flex items-center gap-3"
              style={{background:selected.isAvailable?C.okPale:selected.isBusy?C.warnPale:C.creamMid}}>
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{background:selected.isAvailable?C.ok:selected.isBusy?'#D97706':'#9CA3AF'}}/>
              <p className="text-sm font-bold" style={{color:selected.isAvailable?C.ok:selected.isBusy?'#92400E':C.inkFaint}}>
                {selected.isAvailable?'Free — Available':selected.isBusy?'Busy — In Service':selected.statusLabel||'Not Available'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{border:`1.5px solid ${C.creamBorder}`}}>
            <div className="px-4 py-3" style={{background:C.creamMid}}>
              <p className="text-[11px] font-black uppercase tracking-wider" style={{color:C.inkFaint}}>Today's Appointments ({todayBk.length})</p>
            </div>
            {loadingBk ? (
              <div className="py-6 flex items-center justify-center"><Loader2 size={16} className="animate-spin" style={{color:C.gold}}/></div>
            ) : !todayBk.length ? (
              <div className="py-6 text-center text-sm" style={{color:C.inkFaint}}>No appointments today</div>
            ) : todayBk.map((b,i)=>{
              const st=STATUS[b.status]||STATUS.pending;
              return (
                <div key={b._id} className="flex items-center justify-between px-4 py-3"
                  style={{borderTop:i>0?`1px solid ${C.creamBorder}`:'none'}}>
                  <div>
                    <p className="text-sm font-semibold" style={{color:C.ink}}>{b.customer?.name||'Walk-in'}</p>
                    <p className="text-[11px]" style={{color:C.inkFaint}}>{b.service?.name||'—'} · {b.timeSlot?.start?fmtTime(b.timeSlot.start):'—'}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:st.bg,color:st.color}}>{st.label}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN RECEPTIONIST PANEL
// ═══════════════════════════════════════════════════════════════════════════════
const ReceptionistPanel = () => {
  // ── DataStore — all data managed centrally, no local polling needed ──────
  const { services, staff, syncing, refresh } = useDataStore();
  const [loading,   setLoading]   = useState(false);
  const [toast,     setToast]     = useState(null);
  const [activeTab, setActiveTab] = useState('appointments');

  const TABS=[
    {id:'appointments', label:'Appointments', icon:Calendar},
    {id:'cashcounter',  label:'Cash Counter', icon:Wallet},
    {id:'inventory',    label:'Inventory',    icon:Package},
    {id:'customers',    label:'Customers',    icon:Users},
    {id:'staff',        label:'Staff',        icon:UserCheck},
  ];

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif"}}>

      {/* Header */}
      <motion.div variants={fade} initial="hidden" animate="show"
        className="relative overflow-hidden rounded-2xl px-6 py-6 mb-5"
        style={{background:`linear-gradient(135deg,${C.inkDeep},#2d2510)`, border:`1px solid #3a2a0c`}}>
        <div className="absolute inset-0 opacity-[0.07]"
          style={{backgroundImage:'repeating-linear-gradient(45deg,#B8860B 0,#B8860B 1px,transparent 0,transparent 50%)',backgroundSize:'18px 18px'}}/>
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles size={11} style={{color:'#F0D878'}}/>
              <span className="text-[10px] font-black tracking-[0.22em] uppercase" style={{color:'#F0D878'}}>Reception</span>
            </div>
            <h1 className="text-2xl font-bold text-white" style={{fontFamily:"'Playfair Display',serif"}}>Front Desk</h1>
            <p className="text-sm mt-1" style={{color:'#7a6040'}}>
              {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 rounded-full"
              style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)'}}>
              <LiveDot syncing={syncing}/>
            </div>
            <button onClick={()=>refresh(false)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold hover:opacity-80"
              style={{background:'rgba(255,255,255,0.08)',color:'#fff',border:'1px solid rgba(255,255,255,0.12)'}}>
              <RefreshCw size={12} className={syncing?'animate-spin':''}/> Refresh
            </button>
          </div>
        </div>
      </motion.div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 rounded-2xl mb-5" style={{background:C.creamMid,border:`1px solid ${C.creamBorder}`}}>
        {TABS.map(({id,label,icon:Icon})=>(
          <button key={id} onClick={()=>setActiveTab(id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
            style={{background:activeTab===id?C.white:'transparent',color:activeTab===id?C.inkDeep:C.inkFaint,
              boxShadow:activeTab===id?'0 1px 4px rgba(0,0,0,0.1)':'none'}}>
            <Icon size={12}/>
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Tabs */}
      {activeTab==='appointments' && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.28}}>
          <AppointmentsTab staffAvail={staff} services={services}/>
        </motion.div>
      )}
      {activeTab==='cashcounter' && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.28}}>
          <CashCounterTab/>
        </motion.div>
      )}
      {activeTab==='inventory' && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.28}}>
          <InventoryTab/>
        </motion.div>
      )}
      {activeTab==='customers' && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.28}}>
          <CustomersTab/>
        </motion.div>
      )}
      {activeTab==='staff' && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.28}}>
          <StaffTab staffList={staff}/>
        </motion.div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
      </AnimatePresence>
    </div>
  );
};

export default ReceptionistPanel;