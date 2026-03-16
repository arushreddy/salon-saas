import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/services/api";
import {
  Search, X, Phone, MessageCircle, Calendar, Star, Download,
  ChevronRight, Send,
} from "lucide-react";

const C = {
  cream:'#FDF8F0', creamMid:'#F7EFD8', creamDark:'#EDE0C0', creamBorder:'#DFD0A8',
  goldMid:'#B8860B', goldPale:'#FFF8E7', ink:'#16100A', inkMid:'#5A4020',
  inkFaint:'#B09060', inkGhost:'#D4B890', ok:'#285C3A', okPale:'#EAF4EE',
  risk:'#7A2020', riskPale:'#FEF2F2', warn:'#6B4800', warnPale:'#FEF3DC',
  blue:'#1D4ED8', bluePale:'#EFF6FF', green:'#16A34A', greenPale:'#DCFCE7',
  greenBorder:'#86EFAC',
};

const SALON_NAME    = 'Glamour Salon';
const AVATAR_COLORS = [C.goldPale, C.bluePale, C.okPale, '#F5F3FF', C.warnPale, '#FFF0F6', '#E0F2FE'];

const avatar     = (n) => (n||'G').charAt(0).toUpperCase();
const avatarBg   = (n) => AVATAR_COLORS[(n||'').charCodeAt(0) % AVATAR_COLORS.length] || C.creamMid;
const fmtDate    = (d, opts={}) => d ? new Date(d).toLocaleDateString('en-IN', opts) : '—';
const card       = { background:'#fff', border:`1px solid ${C.creamBorder}`, borderRadius:16, boxShadow:'0 1px 4px rgba(180,130,0,0.06)' };
const displayPhone = (raw) => {
  if (!raw) return '';
  const d = raw.replace(/\D/g,'');
  const ten = d.length===12&&d.startsWith('91') ? d.slice(2) : d.startsWith('0')&&d.length===11 ? d.slice(1) : d;
  return ten.length===10 ? `+91 ${ten.slice(0,5)} ${ten.slice(5)}` : raw;
};
const tierOf = (spend) =>
  spend >= 10000 ? { label:'Gold',    color:'#B8860B', bg:'#FFF8E7', emoji:'👑' }
: spend >= 4000  ? { label:'Silver',  color:'#6B7280', bg:'#F3F4F6', emoji:'⭐' }
:                   null; // regular — show no badge

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


// ── WhatsApp message templates ────────────────────────────────────────────────
// Tokens: %name% = first name, %salon% = salon name
const WA_CATS = [
  {
    tab: 'Re-engage',
    msgs: [
      { emoji:'💛', label:'We miss you!',      text:'Hi %name%! It\'s been a while since we\'ve seen you at *%salon%*. We miss you! Come visit us for some pampering 😊✂️' },
      { emoji:'🕐', label:'It\'s been too long',text:'Hey %name%! It\'s been too long! Time for a fresh new look? Visit *%salon%* — we\'d love to see you 💆' },
      { emoji:'🎁', label:'Special offer',      text:'Hi %name%! We have a *special offer* just for you at *%salon%* this week. Come in and treat yourself ✨' },
    ],
  },
  {
    tab: 'Booking',
    msgs: [
      { emoji:'📅', label:'Book your slot',    text:'Hi %name%! Ready for your next visit? *%salon%* has slots available — reply here to book your appointment 📅' },
      { emoji:'⏰', label:'Gentle reminder',   text:'Hi %name%! Just a gentle reminder — we\'re open today at *%salon%*. Come in and refresh your look! 💇' },
      { emoji:'✅', label:'Confirm visit',      text:'Hi %name%! Confirming your upcoming appointment at *%salon%*. Let us know if you need to reschedule 😊' },
    ],
  },
  {
    tab: 'Post-visit',
    msgs: [
      { emoji:'⭐', label:'Rate your visit',   text:'Hi %name%! Hope you loved your visit to *%salon%*! A quick review means the world to us 🙏' },
      { emoji:'👯', label:'Refer a friend',    text:'Hi %name%! Enjoyed *%salon%*? Refer a friend — both of you get a special discount on the next visit 🎉' },
      { emoji:'💬', label:'How was it?',       text:'Hi %name%! It was so lovely having you at *%salon%* recently. How are you loving your new look? ✨' },
    ],
  },
  {
    tab: 'Special',
    msgs: [
      { emoji:'🎂', label:'Happy Birthday!',    text:'Hi %name%! Wishing you a very Happy Birthday from all of us at *%salon%* 🎂🎉 Come celebrate with a special treat!' },
      { emoji:'🎊', label:'Festival greetings', text:'Hi %name%! Warm festive greetings from the *%salon%* family! Wishing you a joyful celebration 🎊✨' },
      { emoji:'🌸', label:'New season look',    text:'Hi %name%! New season, new look! Come visit *%salon%* for a fresh style that matches the vibe 🌸' },
    ],
  },
];

function buildMsg(tpl, customer) {
  const first = (customer?.name || 'there').split(' ')[0];
  return tpl.replace(/%name%/g, first).replace(/%salon%/g, SALON_NAME);
}

// ── CSV export — Excel-safe ───────────────────────────────────────────────────
function exportCSV(rows, headers, filename) {
  const isNumeric  = (s) => /^\d+$/.test(s);
  const isDateLike = (s) => /^\d{1,4}[\-\/.]\d{1,2}[\-\/.]\d{2,4}$/.test(s);
  const cell = (v) => {
    if (v === null || v === undefined) return '""';
    const s = String(v);
    if (isNumeric(s) || isDateLike(s)) return '="' + s.replace(/"/g, '""') + '"';
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => cell(r[h])).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type:'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  URL.revokeObjectURL(a.href);
}

// ── WhatsApp Panel ────────────────────────────────────────────────────────────
function WAPanel({ customer, onClose }) {
  const [activeTab, setActiveTab] = useState(0);
  const [custom, setCustom]       = useState('');
  const [sent, setSent]           = useState(null);

  const rawPhone  = customer?.phone?.replace(/\D/g, '');
  const fullPhone = toWAPhone(rawPhone);

  const send = (text) => {
    if (!fullPhone) return;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(buildMsg(text, customer))}`, '_blank');
    setSent(text);
    setTimeout(() => setSent(null), 2500);
  };

  const sendCustom = () => {
    if (!custom.trim() || !fullPhone) return;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(custom)}`, '_blank');
    setSent('__custom__');
    setTimeout(() => setSent(null), 2500);
  };

  return (
    <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:5}}
      style={{ background:'#fff', borderRadius:14, border:`1.5px solid ${C.greenBorder}`, overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'11px 14px', background:C.greenPale, borderBottom:`1px solid ${C.greenBorder}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <MessageCircle size={14} color={C.green}/>
          <span style={{ fontSize:13, fontWeight:700, color:C.green }}>WhatsApp · {(customer?.name||'').split(' ')[0]}</span>
        </div>
        <button onClick={onClose} style={{ padding:4, borderRadius:7, border:'none', background:'rgba(0,0,0,0.06)', cursor:'pointer', display:'flex' }}>
          <X size={12} color={C.inkMid}/>
        </button>
      </div>

      {!fullPhone && (
        <div style={{ padding:'9px 14px', background:C.warnPale }}>
          <span style={{ fontSize:11, color:C.warn, fontWeight:600 }}>⚠ No phone number — add it to enable WhatsApp</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${C.creamBorder}`, overflowX:'auto' }}>
        {WA_CATS.map((cat, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            style={{ padding:'8px 13px', border:'none', background:'none', fontSize:11, fontWeight:activeTab===i?700:500, color:activeTab===i?C.ink:C.inkFaint, borderBottom:activeTab===i?`2px solid ${C.ink}`:'2px solid transparent', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
            {cat.tab}
          </button>
        ))}
      </div>

      {/* Message buttons */}
      <div style={{ padding:'10px 12px' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {WA_CATS[activeTab].msgs.map(({ emoji, label, text }) => (
            <button key={label} onClick={() => send(text)} disabled={!fullPhone}
              style={{ padding:'9px 12px', borderRadius:10, border:`1px solid ${sent===text ? C.greenBorder : C.creamBorder}`, background:sent===text ? C.greenPale : '#fff', color:C.ink, fontSize:12, fontWeight:600, cursor:fullPhone?'pointer':'default', textAlign:'left', display:'flex', alignItems:'center', gap:8, opacity:!fullPhone?0.35:1, transition:'all 0.12s' }}
              onMouseEnter={e=>{ if(fullPhone){e.currentTarget.style.background=C.greenPale;e.currentTarget.style.borderColor=C.greenBorder;}}}
              onMouseLeave={e=>{ if(sent!==text){e.currentTarget.style.background='#fff';e.currentTarget.style.borderColor=C.creamBorder;}}}>
              <span style={{ fontSize:15, flexShrink:0 }}>{emoji}</span>
              <span style={{ flex:1 }}>{label}</span>
              {sent===text
                ? <span style={{ fontSize:10, color:C.green, fontWeight:700, flexShrink:0 }}>Sent ✓</span>
                : <ChevronRight size={11} color={C.inkGhost} style={{ flexShrink:0 }}/>}
            </button>
          ))}
        </div>

        {/* Custom message */}
        <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.creamBorder}` }}>
          <textarea value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Type a custom message…" rows={2}
            style={{ width:'100%', padding:'9px 11px', borderRadius:10, border:`1.5px solid ${C.creamBorder}`, fontSize:12, color:C.ink, outline:'none', resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }}
            onFocus={e=>e.target.style.borderColor=C.greenBorder}
            onBlur={e=>e.target.style.borderColor=C.creamBorder}/>
          <button onClick={sendCustom} disabled={!fullPhone||!custom.trim()}
            style={{ width:'100%', marginTop:6, padding:'9px', borderRadius:100, border:'none', background:C.green, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, opacity:(!fullPhone||!custom.trim())?0.4:1 }}>
            <Send size={13}/>
            {sent==='__custom__' ? 'Sent ✓' : 'Send via WhatsApp'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────
function CustomerDetail({ customer, detail, detailLoading, onClose }) {
  const [waOpen, setWaOpen] = useState(false);

  const spent    = detail?.totalSpend    || 0;
  const visits   = detail?.completedVisits || 0;
  const avgSpend = visits > 0 ? Math.round(spent / visits) : 0;
  const lastVisit = detail?.bookings?.[0]?.date;
  const daysSince = lastVisit ? Math.floor((Date.now() - new Date(lastVisit)) / 86400000) : null;

  const tier = spent >= 10000 ? { label:'Gold',    color:'#B8860B', bg:'#FFF8E7', emoji:'👑' }
             : spent >= 4000  ? { label:'Silver',   color:'#6B7280', bg:'#F3F4F6', emoji:'⭐' }
             :                   { label:'Regular',  color:C.inkFaint, bg:C.creamMid, emoji:'👤' };

  return (
    <div style={{ ...card, padding:0, overflow:'hidden', position:'sticky', top:80 }}>
      {/* Header bar */}
      <div style={{ padding:'12px 18px', borderBottom:`1px solid ${C.creamBorder}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontFamily:'Playfair Display,serif', fontSize:14, fontWeight:700, color:C.ink }}>Customer Profile</span>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={()=>setWaOpen(w=>!w)}
            style={{ padding:'5px 11px', borderRadius:8, border:`1px solid ${waOpen?C.greenBorder:C.creamBorder}`, background:waOpen?C.greenPale:'#fff', cursor:'pointer', fontSize:11, fontWeight:700, color:waOpen?C.green:C.inkMid, display:'flex', alignItems:'center', gap:5, transition:'all 0.15s' }}>
            <MessageCircle size={12}/> WhatsApp
          </button>
          <button onClick={onClose} style={{ padding:5, borderRadius:8, border:'none', background:C.creamMid, cursor:'pointer', display:'flex' }}>
            <X size={13} color={C.inkMid}/>
          </button>
        </div>
      </div>

      <div style={{ maxHeight:'85vh', overflowY:'auto' }}>
        {/* Hero */}
        <div style={{ padding:'18px 20px', borderBottom:`1px solid ${C.creamBorder}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              <div style={{ width:56, height:56, borderRadius:18, background:avatarBg(customer.name), display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:700, color:C.inkMid }}>
                {avatar(customer.name)}
              </div>
              <div style={{ position:'absolute', bottom:-3, right:-3, background:tier.bg, border:`1px solid ${tier.color}44`, borderRadius:7, padding:'2px 6px', fontSize:9, fontWeight:700, color:tier.color, whiteSpace:'nowrap' }}>
                {tier.emoji} {tier.label}
              </div>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:17, fontWeight:700, color:C.ink, marginBottom:2 }}>{customer.name}</div>
              <div style={{ fontSize:11, color:C.inkFaint }}>Member since {fmtDate(customer.createdAt, { month:'short', year:'numeric' })}</div>
              {daysSince !== null && (
                <div style={{ fontSize:11, fontWeight:600, marginTop:3, color:daysSince>30?C.risk:daysSince>14?C.warn:C.ok }}>
                  {daysSince===0 ? '✓ Visited today' : daysSince===1 ? 'Last visit: yesterday' : `Last visit: ${daysSince} days ago`}
                  {daysSince>30 && ' — consider reaching out!'}
                </div>
              )}
            </div>
          </div>

          {/* Contact */}
          <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
            {customer.phone && (
              <a href={`tel:${customer.phone}`}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 13px', borderRadius:100, background:C.creamMid, color:C.inkMid, fontSize:12, fontWeight:600, textDecoration:'none' }}>
                <Phone size={12}/> {displayPhone(customer.phone)}
              </a>
            )}
            {customer.phone && (
              <a href={`https://wa.me/${toWAPhone(customer.phone)}`} target="_blank" rel="noreferrer"
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 13px', borderRadius:100, background:C.greenPale, color:C.green, fontSize:12, fontWeight:600, textDecoration:'none' }}>
                <MessageCircle size={12}/> Chat
              </a>
            )}
          </div>
          {customer.email && <div style={{ fontSize:11, color:C.inkFaint, marginTop:8 }}>{customer.email}</div>}
        </div>

        {/* WA panel — slides in */}
        <AnimatePresence>
          {waOpen && (
            <div style={{ padding:'12px 14px', borderBottom:`1px solid ${C.creamBorder}` }}>
              <WAPanel customer={customer} onClose={()=>setWaOpen(false)}/>
            </div>
          )}
        </AnimatePresence>

        {detailLoading ? (
          <div style={{ padding:40, textAlign:'center', color:C.inkFaint, fontSize:13 }}>Loading history…</div>
        ) : detail ? (
          <>
            {/* Stats */}
            <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.creamBorder}` }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                {[
                  { label:'Total Spent',    value:`₹${spent.toLocaleString('en-IN')}`,    color:C.goldMid },
                  { label:'Avg per Visit',  value:`₹${avgSpend.toLocaleString('en-IN')}`, color:C.ink     },
                  { label:'Visits',         value:visits,                                  color:C.ok      },
                  { label:'Total Bookings', value:detail.totalBookings,                    color:C.blue    },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background:C.creamMid, borderRadius:11, padding:'10px 13px' }}>
                    <div style={{ fontSize:16, fontWeight:700, color }}>{value}</div>
                    <div style={{ fontSize:9, color:C.inkFaint, textTransform:'uppercase', letterSpacing:'0.05em', marginTop:2 }}>{label}</div>
                  </div>
                ))}
              </div>
              {detail.favService !== '—' && (
                <div style={{ padding:'8px 12px', borderRadius:10, background:C.goldPale, display:'flex', alignItems:'center', gap:7 }}>
                  <Star size={12} color={C.goldMid} fill={C.goldMid}/>
                  <div>
                    <div style={{ fontSize:9, color:C.goldMid, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>Favourite</div>
                    <div style={{ fontSize:12, fontWeight:700, color:C.inkMid }}>{detail.favService}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Booking history */}
            <div style={{ padding:'14px 20px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.inkFaint, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>
                Recent Bookings ({detail.bookings.length})
              </div>
              {detail.bookings.length === 0 ? (
                <div style={{ fontSize:12, color:C.inkFaint }}>No bookings yet</div>
              ) : detail.bookings.map((b, i) => {
                const amt  = b.finalAmount || b.totalAmount || 0;
                const disc = b.discountAmount || 0;
                const isPaid = b.paymentStatus === 'paid';
                return (
                  <div key={b._id||i}
                    style={{ padding:'10px 12px', borderRadius:11, background:i%2===0?C.creamMid:'#fff', border:`1px solid ${C.creamBorder}`, marginBottom:6 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:C.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {b.service?.name || 'Service'}
                        </div>
                        <div style={{ fontSize:10, color:C.inkFaint, marginTop:2 }}>
                          {fmtDate(b.date, { day:'numeric', month:'short', year:'numeric' })}
                          {b.timeSlot?.start && ` · ${b.timeSlot.start}`}
                          {b.staff?.name    && ` · ${b.staff.name}`}
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:isPaid?C.ok:C.risk }}>₹{amt.toLocaleString('en-IN')}</div>
                        {disc>0 && <div style={{ fontSize:9, color:C.ok }}>−₹{disc}</div>}
                        <div style={{ fontSize:9, color:C.inkFaint, textTransform:'uppercase', marginTop:1 }}>{b.status}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ReceptionistCustomers() {
  const [customers, setCustomers]           = useState([]);
  const [search, setSearch]                 = useState('');
  const [loading, setLoading]               = useState(false);
  const [total, setTotal]                   = useState(0);
  const [selected, setSelected]             = useState(null);
  const [detail, setDetail]                 = useState(null);
  const [detailLoading, setDetailLoading]   = useState(false);
  const [error, setError]                   = useState('');
  const [toast, setToast]                   = useState(null);
  const [spendCache, setSpendCache]         = useState({});  // id → totalSpend (persists across selections)
  const timer = useRef(null);

  const showToast = (t, ok=true) => { setToast({t,ok}); setTimeout(()=>setToast(null),3000); };

  const fetchCustomers = useCallback(async (q='') => {
    setLoading(true); setError('');
    try {
      const { data } = await api.get('/users', { params:{ role:'customer', search:q||undefined, limit:80 } });
      const list = data.users || data.data || (Array.isArray(data)?data:[]);
      setCustomers(list);
      setTotal(data.pagination?.total || list.length);
    } catch(e) {
      setError(e.response?.data?.message || 'Failed to load customers');
      setCustomers([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchCustomers(search), 350);
  }, [search, fetchCustomers]);

  const fetchDetail = async (userId) => {
    setDetailLoading(true);
    try {
      const { data } = await api.get('/bookings', { params:{ limit:200 } });
      const all = (data.bookings||[]).filter(b => String(b.customer?._id||b.customer)===String(userId));
      const paid = all.filter(b=>b.paymentStatus==='paid');
      const svcCount = {};
      all.forEach(b=>{ const n=b.service?.name||'Unknown'; svcCount[n]=(svcCount[n]||0)+1; });
      const totalSpend = paid.reduce((s,b)=>s+(b.finalAmount||b.totalAmount||0), 0);
      setDetail({
        totalSpend,
        completedVisits:all.filter(b=>b.status==='completed').length,
        totalBookings:  all.length,
        favService:     Object.entries(svcCount).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—',
        bookings:       all.slice().reverse().slice(0,15),
      });
      // Cache spend so tier badge shows on card even after de-selecting
      setSpendCache(prev => ({ ...prev, [userId]: totalSpend }));
    } catch { setDetail(null); }
    setDetailLoading(false);
  };

  const handleSelect = (c) => {
    if (selected===c._id) { setSelected(null); setDetail(null); return; }
    setSelected(c._id); setDetail(null); fetchDetail(c._id);
  };

  const handleExport = () => {
    const rows = customers.map(c=>({ Name:c.name||'', Phone:c.phone||'', Email:c.email||'', 'Member Since':c.createdAt?new Date(c.createdAt).toLocaleDateString('en-IN'):'' }));
    exportCSV(rows, ['Name','Phone','Email','Member Since'], `customers_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const selectedCust = customers.find(c=>c._id===selected);

  return (
    <div style={{ maxWidth:1160, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:24, fontWeight:700, color:C.ink, margin:0 }}>Customers</h1>
          <p style={{ fontSize:13, color:C.inkFaint, margin:'3px 0 0' }}>{loading?'Loading…':`${total} customers registered`}</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>fetchCustomers(search)} style={{ padding:'9px 14px', borderRadius:100, border:`1px solid ${C.creamBorder}`, background:'#fff', color:C.inkMid, fontSize:12, fontWeight:600, cursor:'pointer' }}>↻ Refresh</button>
          <button onClick={handleExport} disabled={!customers.length}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:100, border:`1px solid ${C.creamBorder}`, background:'#fff', color:C.inkMid, fontSize:12, fontWeight:600, cursor:'pointer', opacity:customers.length?1:0.4 }}>
            <Download size={13}/> Export CSV
          </button>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            style={{ marginBottom:14, padding:'10px 16px', borderRadius:10, fontSize:13, fontWeight:600, background:toast.ok?C.okPale:C.riskPale, color:toast.ok?C.ok:C.risk }}>
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div style={{ marginBottom:16, padding:'10px 16px', borderRadius:10, background:C.riskPale, color:C.risk, fontSize:13, display:'flex', alignItems:'center', gap:8 }}>
          ⚠ {error}
          <button onClick={()=>fetchCustomers(search)} style={{ color:C.risk, fontWeight:700, background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Retry</button>
        </div>
      )}

      {/* Search bar */}
      <div style={{ position:'relative', marginBottom:18 }}>
        <Search size={15} style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', color:C.inkFaint }}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, phone or email…"
          style={{ width:'100%', paddingLeft:44, paddingRight:16, paddingTop:11, paddingBottom:11, borderRadius:100, border:`1.5px solid ${C.creamBorder}`, background:'#fff', fontSize:13, color:C.ink, outline:'none', boxSizing:'border-box' }}
          onFocus={e=>e.target.style.borderColor=C.goldMid} onBlur={e=>e.target.style.borderColor=C.creamBorder}/>
        {loading && (
          <div style={{ position:'absolute', right:16, top:'50%', width:16, height:16, border:`2px solid ${C.goldMid}`, borderTop:'2px solid transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite', transform:'translateY(-50%)' }}/>
        )}
      </div>

      {/* Layout */}
      <div style={{ display:'grid', gridTemplateColumns:selected?'1fr 370px':'1fr', gap:16, alignItems:'start' }}>

        {/* Cards grid */}
        <div>
          {!loading && !error && customers.length===0 ? (
            <div style={{ ...card, textAlign:'center', padding:52, color:C.inkFaint, fontSize:13 }}>
              {search?`No customers matching "${search}"`:'No customers yet'}
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))', gap:10 }}>
              {customers.map((c, i) => {
                const isSelected = selected===c._id;
                const cachedSpend = spendCache[c._id];
                const tier = cachedSpend !== undefined ? tierOf(cachedSpend) : null;
                return (
                  <motion.div key={c._id}
                    initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:Math.min(i*0.025,0.25) }}
                    onClick={()=>handleSelect(c)}
                    whileHover={{ y:-2, boxShadow:'0 8px 20px rgba(180,130,0,0.10)' }}
                    style={{ ...card, cursor:'pointer', padding:14, borderColor:isSelected?C.goldMid:C.creamBorder, borderWidth:isSelected?2:1, transition:'border-color 0.15s' }}>

                    <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:10 }}>
                      <div style={{ position:'relative', flexShrink:0 }}>
                        <div style={{ width:42, height:42, borderRadius:13, background:avatarBg(c.name), display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:700, color:C.inkMid }}>
                          {avatar(c.name)}
                        </div>
                        {tier && (
                          <div style={{ position:'absolute', bottom:-4, right:-4, background:tier.bg, border:`1px solid ${tier.color}55`, borderRadius:5, padding:'1px 4px', fontSize:8, fontWeight:700, color:tier.color, whiteSpace:'nowrap', lineHeight:1.4 }}>
                            {tier.emoji}
                          </div>
                        )}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:C.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.name}</div>
                        <div style={{ fontSize:11, color:C.inkFaint, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {c.phone ? displayPhone(c.phone) : c.email||'—'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span style={{ fontSize:10, color:C.inkGhost }}>
                        Since {fmtDate(c.createdAt, { month:'short', year:'numeric' })}
                      </span>
                      {/* Quick WA button — fires WA directly, does NOT open detail panel */}
                      {c.phone && (
                        <button onClick={e=>{
                            e.stopPropagation();
                            const d=c.phone.replace(/\D/g,'');
                            const ten=d.length===12&&d.startsWith('91')?d.slice(2):d.startsWith('0')&&d.length===11?d.slice(1):d;
                            if(ten.length===10) window.open(`https://wa.me/91${ten}`,'_blank');
                          }}
                          style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:100, border:`1px solid ${C.greenBorder}`, background:C.greenPale, color:C.green, fontSize:10, fontWeight:700, cursor:'pointer' }}>
                          <MessageCircle size={10}/> WA
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selected && selectedCust && (
            <motion.div key={selected} initial={{opacity:0,x:14}} animate={{opacity:1,x:0}} exit={{opacity:0,x:14}}>
              <CustomerDetail
                customer={selectedCust}
                detail={detail}
                detailLoading={detailLoading}
                onClose={()=>{ setSelected(null); setDetail(null); }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`@keyframes spin{to{transform:translateY(-50%) rotate(360deg)}}`}</style>
    </div>
  );
}