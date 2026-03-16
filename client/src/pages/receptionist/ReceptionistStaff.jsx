import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDataStore } from "@/context/DataStore";
import api from "@/services/api";
import {
  Search, X, CheckCircle, Download, MessageCircle,
  ChevronLeft, ChevronRight, BarChart2,
  ChevronRight as CRight, Send, Phone, RefreshCw,
} from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  cream:'#FDF8F0', creamMid:'#F7EFD8', creamDark:'#EDE0C0', creamBorder:'#DFD0A8',
  goldMid:'#B8860B', goldPale:'#FFF8E7', ink:'#16100A', inkMid:'#5A4020',
  inkFaint:'#B09060', inkGhost:'#D4B890', ok:'#285C3A', okPale:'#EAF4EE',
  risk:'#7A2020', riskPale:'#FEF2F2', warn:'#6B4800', warnPale:'#FEF3DC',
  blue:'#1D4ED8', bluePale:'#EFF6FF', green:'#16A34A', greenPale:'#DCFCE7',
  greenBorder:'#86EFAC', purple:'#7C3AED', purplePale:'#F5F3FF',
  orange:'#C2410C', orangePale:'#FFF7ED', orangeBorder:'#FDBA74',
};
const card = { background:'#fff', border:`1px solid ${C.creamBorder}`, borderRadius:16, boxShadow:'0 1px 4px rgba(180,130,0,0.06)' };

// ── Time / date ───────────────────────────────────────────────────────────────
const IST          = 5.5 * 3600000;
const todayIST     = () => new Date(Date.now() + IST).toISOString().split('T')[0];
const pad          = (n) => String(n).padStart(2, '0');
const daysInMonth  = (y, m) => new Date(y, m, 0).getDate();
const MONTH_NAMES  = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Phone helpers — Indian 10-digit strict ────────────────────────────────────
const normalisePhone = (raw = '') => {
  const d = String(raw).replace(/\D/g, '');
  if (d.length === 10) return d;
  if (d.length === 12 && d.startsWith('91')) return d.slice(2);
  if (d.length === 11 && d.startsWith('0'))  return d.slice(1);
  return d;
};
const toWAPhone    = (raw) => { const d = normalisePhone(raw); return d.length===10 ? '91'+d : null; };
const displayPhone = (raw) => {
  const d = normalisePhone(raw);
  return d.length===10 ? `+91 ${d.slice(0,5)} ${d.slice(5)}` : raw || '';
};
const isValidPhone = (raw) => normalisePhone(raw).length === 10;

// ── Attendance status meta ────────────────────────────────────────────────────
const ATT = [
  { key:'present',  label:'Present',  color:C.ok,     bg:C.okPale,     short:'P'  },
  { key:'late',     label:'Late',     color:C.warn,   bg:C.warnPale,   short:'L'  },
  { key:'half-day', label:'Half Day', color:C.blue,   bg:C.bluePale,   short:'H'  },
  { key:'leave',    label:'Leave',    color:C.purple, bg:C.purplePale, short:'LV' },
  { key:'absent',   label:'Absent',   color:C.risk,   bg:C.riskPale,   short:'A'  },
];
const attMeta = (k) => ATT.find(s=>s.key===k) || { label:'—', color:C.inkGhost, bg:C.creamMid, short:'—' };

// ── Floor / live status meta ──────────────────────────────────────────────────
const FLOOR = {
  'available':         { label:'Available',   dot:'#22C55E', color:C.ok,      bg:C.okPale,      icon:'✓'  },
  'busy':              { label:'Busy',        dot:'#F59E0B', color:C.warn,    bg:C.warnPale,    icon:'⚡' },
  'temp-unavailable':  { label:'Stepped Out', dot:'#F97316', color:C.orange,  bg:C.orangePale,  icon:'☕' },
  'off-duty':          { label:'Off Duty',    dot:'#D1D5DB', color:C.inkFaint,bg:C.creamMid,    icon:'—'  },
  'absent':            { label:'Absent',      dot:'#EF4444', color:C.risk,    bg:C.riskPale,    icon:'✗'  },
};
const floorMeta = (k) => FLOOR[k] || FLOOR['off-duty'];

// ── WhatsApp templates ────────────────────────────────────────────────────────
const WA_CATS = [
  { tab:'General', msgs:[
    { emoji:'💛', label:'We miss you!',      text:'Hi %name%! We miss you at *%salon%*. Hope to see you again soon 😊✂️' },
    { emoji:'🎁', label:'Special offer',      text:'Hi %name%! We have a special offer just for you at *%salon%* this week ✨' },
    { emoji:'📅', label:'Book your slot',     text:'Hi %name%! Ready for your next visit? Reply here to book at *%salon%* 📅' },
  ]},
  { tab:'Re-engage', msgs:[
    { emoji:'🕐', label:"It's been too long", text:"Hey %name%! It's been a while — time for a fresh look? Come visit *%salon%* 💆" },
    { emoji:'⭐', label:'Rate your visit',    text:'Hi %name%! Hope you loved your last visit to *%salon%*! A quick review means the world 🙏' },
    { emoji:'👯', label:'Refer a friend',     text:'Hi %name%! Refer a friend to *%salon%* — both of you get a special discount 🎉' },
  ]},
  { tab:'Special', msgs:[
    { emoji:'🎂', label:'Happy Birthday!',    text:'Happy Birthday %name%! 🎂🎉 Warm wishes from all of us at *%salon%*!' },
    { emoji:'🎊', label:'Festival greetings', text:'Warm festive greetings from *%salon%* to you and your family %name%! 🎊✨' },
    { emoji:'🌸', label:'New season look',    text:'New season, new look! Come visit *%salon%* for a fresh style %name%! 🌸' },
  ]},
];
const SALON_NAME = 'Glamour Salon';
const buildWA = (tpl, name) =>
  tpl.replace(/%name%/g, (name||'there').split(' ')[0]).replace(/%salon%/g, SALON_NAME);

// ── CSV export (Excel-safe) ───────────────────────────────────────────────────
function exportCSV(rows, headers, filename) {
  const isNum  = (s) => /^\d+$/.test(s);
  const isDt   = (s) => /^\d{1,4}[\-\/.]\d{1,2}[\-\/.]\d{2,4}$/.test(s);
  const cell   = (v) => {
    if (v===null||v===undefined) return '""';
    const s = String(v);
    if (isNum(s)||isDt(s)) return '="'+s.replace(/"/g,'""')+'"';
    return '"'+s.replace(/"/g,'""')+'"';
  };
  const csv  = [headers.join(','), ...rows.map(r=>headers.map(h=>cell(r[h])).join(','))].join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const a    = document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download=filename; a.click();
  URL.revokeObjectURL(a.href);
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────────────────────

function AttBtn({ statusKey, active, onClick, disabled, small }) {
  const m = attMeta(statusKey);
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding:small?'4px 9px':'7px 14px', borderRadius:100, border:`1.5px solid ${active?m.color:C.creamBorder}`, background:active?m.bg:'#fff', color:active?m.color:C.inkFaint, fontSize:small?10:12, fontWeight:700, cursor:disabled?'default':'pointer', opacity:disabled?0.5:1, transition:'all 0.15s' }}>
      {m.label}{active?' ✓':''}
    </button>
  );
}

function DayCell({ status, isToday, isPast }) {
  if (!status) return (
    <div style={{ width:28, height:28, borderRadius:7, background:isPast?C.riskPale:C.creamMid, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:C.inkGhost }}>
      {isPast?'A':'—'}
    </div>
  );
  const m = attMeta(status);
  return (
    <div title={m.label} style={{ width:28, height:28, borderRadius:7, background:m.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:m.color, border:isToday?`2px solid ${m.color}`:'none' }}>
      {m.short}
    </div>
  );
}

// ── WhatsApp panel ────────────────────────────────────────────────────────────
function WAPanel({ staff, onClose }) {
  const [tab, setTab]     = useState(0);
  const [custom, setCustom] = useState('');
  const [sent, setSent]   = useState(null);
  const wp = toWAPhone(staff.phone);

  const send = (text) => {
    if (!wp) return;
    window.open(`https://wa.me/${wp}?text=${encodeURIComponent(buildWA(text,staff.name))}`, '_blank');
    setSent(text); setTimeout(()=>setSent(null), 2200);
  };
  const sendCustom = () => {
    if (!wp||!custom.trim()) return;
    window.open(`https://wa.me/${wp}?text=${encodeURIComponent(custom)}`, '_blank');
    setSent('__c'); setTimeout(()=>setSent(null), 2200);
  };

  return (
    <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:5}}
      style={{ ...card, overflow:'hidden', border:`1.5px solid ${C.greenBorder}` }}>
      <div style={{ padding:'11px 14px', background:C.greenPale, borderBottom:`1px solid ${C.greenBorder}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <MessageCircle size={14} color={C.green}/>
          <span style={{ fontSize:13, fontWeight:700, color:C.green }}>WhatsApp · {staff.name?.split(' ')[0]}</span>
          {wp && <span style={{ fontSize:10, color:C.green, opacity:0.7 }}>{displayPhone(staff.phone)}</span>}
        </div>
        <button onClick={onClose} style={{ padding:4, borderRadius:7, border:'none', background:'rgba(0,0,0,0.06)', cursor:'pointer', display:'flex' }}><X size={12}/></button>
      </div>

      {!wp && (
        <div style={{ padding:'8px 14px', background:C.warnPale }}>
          <span style={{ fontSize:11, color:C.warn, fontWeight:600 }}>⚠ No valid 10-digit phone on file</span>
        </div>
      )}

      <div style={{ display:'flex', borderBottom:`1px solid ${C.creamBorder}` }}>
        {WA_CATS.map((cat, i) => (
          <button key={i} onClick={()=>setTab(i)}
            style={{ flex:1, padding:'8px 4px', border:'none', background:'none', fontSize:11, fontWeight:tab===i?700:500, color:tab===i?C.ink:C.inkFaint, borderBottom:tab===i?`2px solid ${C.ink}`:'2px solid transparent', cursor:'pointer' }}>
            {cat.tab}
          </button>
        ))}
      </div>

      <div style={{ padding:'10px 12px' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {WA_CATS[tab].msgs.map(({ emoji, label, text }) => (
            <button key={label} onClick={()=>send(text)} disabled={!wp}
              style={{ padding:'9px 12px', borderRadius:10, border:`1px solid ${sent===text?C.greenBorder:C.creamBorder}`, background:sent===text?C.greenPale:'#fff', color:C.ink, fontSize:12, fontWeight:600, cursor:wp?'pointer':'default', textAlign:'left', display:'flex', alignItems:'center', gap:8, opacity:!wp?0.35:1, transition:'all 0.12s' }}
              onMouseEnter={e=>{ if(wp){e.currentTarget.style.background=C.greenPale;e.currentTarget.style.borderColor=C.greenBorder;}}}
              onMouseLeave={e=>{ if(sent!==text){e.currentTarget.style.background='#fff';e.currentTarget.style.borderColor=C.creamBorder;}}}>
              <span style={{ fontSize:15, flexShrink:0 }}>{emoji}</span>
              <span style={{ flex:1 }}>{label}</span>
              {sent===text ? <span style={{ fontSize:10, color:C.green, fontWeight:700 }}>Sent ✓</span> : <CRight size={11} color={C.inkGhost}/>}
            </button>
          ))}
        </div>
        <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.creamBorder}` }}>
          <textarea value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Type a custom message…" rows={2}
            style={{ width:'100%', padding:'9px 11px', borderRadius:10, border:`1.5px solid ${C.creamBorder}`, fontSize:12, color:C.ink, outline:'none', resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }}
            onFocus={e=>e.target.style.borderColor=C.greenBorder} onBlur={e=>e.target.style.borderColor=C.creamBorder}/>
          <button onClick={sendCustom} disabled={!wp||!custom.trim()}
            style={{ width:'100%', marginTop:6, padding:'9px', borderRadius:100, border:'none', background:C.green, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, opacity:(!wp||!custom.trim())?0.4:1 }}>
            <Send size={13}/>{sent==='__c'?'Sent ✓':'Send via WhatsApp'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Staff Detail Panel ────────────────────────────────────────────────────────
function StaffDetail({ staff, onMarkAtt, marking, onFloorToggle, floorSaving, onClose }) {
  const [waOpen, setWaOpen] = useState(false);
  const fm         = floorMeta(staff.liveStatus);
  const wp         = toWAPhone(staff.phone);
  const isPresent  = ['present','late','half-day'].includes(staff.attendanceStatus);
  const isTempOut  = staff.liveStatus === 'temp-unavailable';

  return (
    <div style={{ ...card, padding:0, overflow:'hidden', position:'sticky', top:80 }}>
      <div style={{ padding:'12px 18px', borderBottom:`1px solid ${C.creamBorder}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontFamily:'Playfair Display,serif', fontSize:14, fontWeight:700, color:C.ink }}>Staff Detail</span>
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

      <div style={{ maxHeight:'84vh', overflowY:'auto' }}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.creamBorder}` }}>
          {/* Hero row */}
          <div style={{ display:'flex', alignItems:'center', gap:13, marginBottom:14 }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              <div style={{ width:52, height:52, borderRadius:16, background:C.creamMid, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, color:C.inkMid }}>
                {(staff.name||'S')[0].toUpperCase()}
              </div>
              <div style={{ position:'absolute', bottom:-2, right:-2, width:13, height:13, borderRadius:'50%', background:fm.dot, border:'2.5px solid #fff' }}/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:16, fontWeight:700, color:C.ink }}>{staff.name}</div>
              <div style={{ fontSize:11, color:C.inkFaint }}>{staff.designation}</div>
              {staff.phone && (
                <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:3 }}>
                  <Phone size={10} color={C.inkFaint}/>
                  <span style={{ fontSize:11, color:C.inkFaint }}>{displayPhone(staff.phone)}</span>
                  {wp && <a href={`https://wa.me/${wp}`} target="_blank" rel="noreferrer" style={{ fontSize:10, color:C.green, fontWeight:700, textDecoration:'none' }}>WA ↗</a>}
                </div>
              )}
              {!isValidPhone(staff.phone) && staff.phone && (
                <div style={{ fontSize:10, color:C.risk, marginTop:2 }}>⚠ Phone not 10-digit — WA disabled</div>
              )}
            </div>
          </div>

          {/* Live status banner */}
          <div style={{ padding:'10px 14px', borderRadius:12, background:fm.bg, marginBottom:14, display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
            <div>
              <div style={{ fontSize:9, fontWeight:700, color:fm.color, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:1 }}>Live Status</div>
              <div style={{ fontSize:14, fontWeight:700, color:fm.color }}>{fm.icon} {fm.label}</div>
            </div>
            {isPresent && (
              <button onClick={onFloorToggle} disabled={floorSaving}
                style={{ padding:'7px 13px', borderRadius:10, border:`1.5px solid ${isTempOut?C.ok:C.orange}`, background:isTempOut?C.okPale:C.orangePale, color:isTempOut?C.ok:C.orange, fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5, opacity:floorSaving?0.5:1, whiteSpace:'nowrap' }}>
                {floorSaving ? '…' : isTempOut ? '✓ Back on Floor' : '☕ Stepped Out'}
              </button>
            )}
          </div>

          {/* Attendance grid */}
          <div style={{ fontSize:11, fontWeight:700, color:C.inkFaint, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:9 }}>Today's Attendance</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
            {ATT.map(st => (
              <AttBtn key={st.key} statusKey={st.key}
                active={staff.attendanceStatus===st.key}
                onClick={()=>onMarkAtt(staff._id, st.key)}
                disabled={marking===staff._id}/>
            ))}
          </div>
        </div>

        {/* WA panel inline */}
        <AnimatePresence>
          {waOpen && (
            <div style={{ padding:'12px 14px', borderBottom:`1px solid ${C.creamBorder}` }}>
              <WAPanel staff={staff} onClose={()=>setWaOpen(false)}/>
            </div>
          )}
        </AnimatePresence>

        {/* Current booking */}
        {staff.currentBooking && (
          <div style={{ padding:'14px 20px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.inkFaint, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Current Booking</div>
            <div style={{ padding:'11px 14px', borderRadius:12, background:C.warnPale, border:`1px solid ${C.warn}33` }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>{staff.currentBooking.service}</div>
              <div style={{ fontSize:11, color:C.inkFaint, marginTop:2 }}>{staff.currentBooking.customer}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Monthly Table ─────────────────────────────────────────────────────────────
function MonthlyTable({ staffList, year, month }) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const days    = daysInMonth(year, month);
  const today   = todayIST();
  const todayDay = parseInt(today.split('-')[2]);
  const todayMonthMatch = today.startsWith(`${year}-${pad(month)}`);

  useEffect(() => {
    if (!staffList.length) return;
    setLoading(true);
    api.get('/attendance/report', { params:{ month, year } })
      .then(({ data: d }) => setData(d.summary || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [year, month, staffList.length]);

  const lookup = useMemo(() => {
    const m = {};
    data.forEach(s => {
      const sid = (s.staff?._id||s.staff)?.toString();
      m[sid] = {};
      (s.records||[]).forEach(r => { m[sid][new Date(r.date).getUTCDate()] = r.status; });
    });
    return m;
  }, [data]);

  const getSummary = (sid) =>
    data.find(s => (s.staff?._id||s.staff)?.toString()===sid) || { present:0, late:0, absent:0, halfDay:0, leave:0 };

  const handleExport = () => {
    const headers = ['Staff','Phone',...Array.from({length:days},(_,i)=>`${pad(i+1)}-${pad(month)}-${year}`),'Present','Late','Half Day','Leave','Absent'];
    const rows = staffList.map(u => {
      const sid = u._id?.toString();
      const dayMap = lookup[sid]||{};
      const sum = getSummary(sid);
      const row = { Staff:u.name||'', Phone:normalisePhone(u.phone) };
      for (let d=1;d<=days;d++) row[`${pad(d)}-${pad(month)}-${year}`] = dayMap[d]||(d<todayDay&&todayMonthMatch?'absent':'');
      row.Present=sum.present; row.Late=sum.late; row['Half Day']=sum.halfDay; row.Leave=sum.leave; row.Absent=sum.absent;
      return row;
    });
    exportCSV(rows, headers, `attendance_${year}_${pad(month)}.csv`);
  };

  if (loading) return <div style={{ padding:40, textAlign:'center', color:C.inkFaint, fontSize:13 }}>Loading monthly data…</div>;

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {ATT.map(s => (
            <div key={s.key} style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:100, background:s.bg, border:`1px solid ${s.color}33` }}>
              <span style={{ fontSize:10, fontWeight:800, color:s.color }}>{s.short}</span>
              <span style={{ fontSize:10, color:s.color }}>{s.label}</span>
            </div>
          ))}
        </div>
        <button onClick={handleExport} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:100, border:`1px solid ${C.creamBorder}`, background:'#fff', color:C.inkMid, fontSize:12, fontWeight:600, cursor:'pointer', flexShrink:0 }}>
          <Download size={13}/> Export CSV
        </button>
      </div>

      <div style={{ overflowX:'auto', borderRadius:14, border:`1px solid ${C.creamBorder}` }}>
        <table style={{ borderCollapse:'collapse', minWidth:130+days*34+'px', width:'100%' }}>
          <thead>
            <tr style={{ background:C.creamMid }}>
              <th style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:C.inkFaint, whiteSpace:'nowrap', position:'sticky', left:0, background:C.creamMid, zIndex:2, minWidth:150, borderBottom:`1px solid ${C.creamBorder}` }}>Staff</th>
              {Array.from({length:days},(_,i) => {
                const d = i+1;
                const isT = todayMonthMatch && d===todayDay;
                const dow = ['Su','Mo','Tu','We','Th','Fr','Sa'][new Date(year,month-1,d).getDay()];
                return (
                  <th key={d} style={{ padding:'6px 2px', textAlign:'center', fontSize:9, fontWeight:700, color:isT?C.goldMid:C.inkFaint, background:isT?C.goldPale:C.creamMid, minWidth:34, borderBottom:`1px solid ${C.creamBorder}` }}>
                    <div style={{ fontWeight:700 }}>{d}</div>
                    <div style={{ fontWeight:400, opacity:0.7 }}>{dow}</div>
                  </th>
                );
              })}
              {['P','L','H','LV','A'].map((h,i) => (
                <th key={h} style={{ padding:'10px 8px', fontSize:10, fontWeight:800, color:ATT[i]?.color||C.inkFaint, textAlign:'center', minWidth:32, background:C.creamMid, borderBottom:`1px solid ${C.creamBorder}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staffList.map((u, ri) => {
              const sid = u._id?.toString();
              const dayMap = lookup[sid]||{};
              const sum = getSummary(sid);
              return (
                <tr key={sid} style={{ borderBottom:ri<staffList.length-1?`1px solid ${C.creamBorder}`:'none' }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.creamMid}
                  onMouseLeave={e=>e.currentTarget.style.background='inherit'}>
                  <td style={{ padding:'10px 16px', position:'sticky', left:0, background:'inherit', zIndex:1, whiteSpace:'nowrap' }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.ink }}>{u.name}</div>
                    <div style={{ fontSize:10, color:C.inkFaint }}>{displayPhone(u.phone)}</div>
                  </td>
                  {Array.from({length:days},(_,i) => {
                    const d = i+1;
                    const dateStr = `${year}-${pad(month)}-${pad(d)}`;
                    const isT = dateStr===today;
                    const isPast = dateStr<today;
                    return (
                      <td key={d} style={{ padding:'4px 3px', textAlign:'center', background:isT?`${C.goldPale}66`:'inherit' }}>
                        <DayCell status={dayMap[d]} isToday={isT} isPast={isPast&&!dayMap[d]}/>
                      </td>
                    );
                  })}
                  {[sum.present,sum.late,sum.halfDay,sum.leave,sum.absent].map((v,i) => (
                    <td key={i} style={{ padding:'8px 4px', textAlign:'center', fontSize:12, fontWeight:700, color:ATT[i]?.color||C.inkFaint }}>{v||0}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!staffList.length && <div style={{ padding:40, textAlign:'center', color:C.inkFaint, fontSize:13 }}>No staff data</div>}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ReceptionistStaff() {
  const { staff: dsStaff }            = useDataStore();
  const [staffList, setStaffList]     = useState([]);
  const [liveData,  setLiveData]      = useState([]);
  const [attendance, setAttendance]   = useState({});
  const [search,    setSearch]        = useState('');
  const [selected,  setSelected]      = useState(null);
  const [marking,   setMarking]       = useState(null);
  const [floorSaving, setFloorSaving] = useState(null);
  const [toast,     setToast]         = useState(null);
  const [view,      setView]          = useState('today');
  const nowIST = new Date(Date.now() + IST);
  const [month, setMonth] = useState(nowIST.getMonth()+1);
  const [year,  setYear]  = useState(nowIST.getFullYear());

  const showToast = (text, ok=true) => { setToast({text,ok}); setTimeout(()=>setToast(null),3200); };

  const loadData = useCallback(async () => {
    try {
      const [listRes, attRes, liveRes] = await Promise.allSettled([
        api.get('/attendance/staff-list'),
        api.get('/attendance/today'),
        api.get('/staff/live-status'),
      ]);
      if (listRes.status==='fulfilled') setStaffList(listRes.value.data.staff || []);
      if (attRes.status==='fulfilled') {
        const map = {};
        (attRes.value.data.attendance||[]).forEach(r => {
          const id = (r.staff?._id||r.staff)?.toString();
          if (id) map[id] = r;
        });
        setAttendance(map);
      }
      if (liveRes.status==='fulfilled') setLiveData(liveRes.value.data.staff || []);
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Merge all data sources — attendance-based liveStatus fallback
  const merged = useMemo(() => staffList.map(u => {
    const uid   = String(u._id);
    const live  = liveData.find(s=>String(s._id)===uid) || (dsStaff||[]).find(s=>String(s._id)===uid);
    const att   = attendance[uid];
    // KEY FIX: if attendance is marked present/late/half-day but no live data yet,
    // still show available instead of off-duty
    const attStatus = att?.status;
    const isOnFloor = ['present','late','half-day'].includes(attStatus);
    const rawLive   = live?.liveStatus;
    const liveStatus = rawLive
      ? rawLive  // backend computed correctly
      : (isOnFloor ? 'available' : attStatus==='absent'||attStatus==='leave' ? 'absent' : 'off-duty');
    return {
      ...u,
      liveStatus,
      designation:      live?.designation || u.role || '',
      attendanceStatus: attStatus || 'unmarked',
      currentBooking:   live?.currentBooking || null,
      tempUnavailable:  live?.tempUnavailable || false,
    };
  }), [staffList, liveData, dsStaff, attendance]);

  const filtered = merged.filter(s =>
    !search || (s.name||'').toLowerCase().includes(search.toLowerCase())
  );

  const selectedStaff = merged.find(s => String(s._id)===String(selected));

  // Summary tallies
  const liveCounts = { available:0, busy:0, 'temp-unavailable':0, 'off-duty':0, absent:0 };
  merged.forEach(s => { if (s.liveStatus in liveCounts) liveCounts[s.liveStatus]++; });
  const attCounts = { present:0, late:0, 'half-day':0, leave:0, absent:0, unmarked:0 };
  merged.forEach(s => { const k=s.attendanceStatus; if (k in attCounts) attCounts[k]++; else attCounts.unmarked++; });

  const markAtt = async (staffId, status) => {
    setMarking(staffId);
    try {
      await api.post('/attendance/mark', { staffId, status, date:todayIST() });
      setAttendance(prev => ({ ...prev, [staffId]:{ ...(prev[staffId]||{}), staff:staffId, status } }));
      showToast(`Marked ${status}`);
      // refresh live in background
      api.get('/staff/live-status').then(r=>setLiveData(r.data.staff||[])).catch(()=>{});
    } catch(e) { showToast(e.response?.data?.message||'Failed', false); }
    setMarking(null);
  };

  const toggleFloor = async (staff) => {
    setFloorSaving(staff._id);
    const newVal = staff.liveStatus !== 'temp-unavailable';
    try {
      await api.patch(`/staff/${staff._id}/floor-status`, { tempUnavailable: newVal });
      setLiveData(prev => prev.map(s =>
        String(s._id)===String(staff._id)
          ? { ...s, tempUnavailable:newVal, liveStatus:newVal?'temp-unavailable':'available' }
          : s
      ));
      // Also update attendance map so merged recomputes immediately
      if (!liveData.find(s=>String(s._id)===String(staff._id))) {
        setLiveData(prev => [...prev, { _id:staff._id, tempUnavailable:newVal, liveStatus:newVal?'temp-unavailable':'available' }]);
      }
      showToast(newVal ? `${staff.name} — Stepped Out` : `${staff.name} — Back on Floor`);
    } catch(e) { showToast(e.response?.data?.message||'Failed to update floor status', false); }
    setFloorSaving(null);
  };

  const prevMonth = () => { if(month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if(month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); };

  return (
    <div style={{ maxWidth:1240, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:24, fontWeight:700, color:C.ink, margin:0 }}>Staff & Attendance</h1>
          <p style={{ fontSize:13, color:C.inkFaint, margin:'3px 0 0' }}>{staffList.length} staff · {todayIST()}</p>
        </div>
        <button onClick={loadData}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:100, border:`1px solid ${C.creamBorder}`, background:'#fff', color:C.inkMid, fontSize:12, fontWeight:600, cursor:'pointer' }}>
          <RefreshCw size={13}/> Refresh
        </button>
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

      {/* Floor status pills */}
      <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
        {[
          { key:'available',        label:'Available',   color:C.ok,      bg:C.okPale,     dot:'#22C55E' },
          { key:'busy',             label:'Busy',        color:C.warn,    bg:C.warnPale,   dot:'#F59E0B' },
          { key:'temp-unavailable', label:'Stepped Out', color:C.orange,  bg:C.orangePale, dot:'#F97316' },
          { key:'off-duty',         label:'Off Duty',    color:C.inkFaint,bg:C.creamMid,   dot:'#D1D5DB' },
        ].map(({ key, label, color, bg, dot }) => (
          <div key={key} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 13px', borderRadius:100, background:bg, border:`1px solid ${color}33` }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:dot }}/>
            <span style={{ fontSize:12, fontWeight:700, color }}>{liveCounts[key]||0} {label}</span>
          </div>
        ))}
      </div>

      {/* Attendance summary pills */}
      <div style={{ display:'flex', gap:6, marginBottom:18, flexWrap:'wrap' }}>
        {[...ATT, { key:'unmarked', label:'Unmarked', color:C.inkFaint, bg:C.creamMid }].map(({ key, label, color, bg }) => (
          <div key={key} style={{ padding:'4px 12px', borderRadius:100, background:bg, border:`1px solid ${color}33`, fontSize:11, fontWeight:700, color }}>
            {attCounts[key]||0} {label}
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:3, background:C.creamMid, padding:3, borderRadius:11 }}>
          {[
            { key:'today',   label:"Today's Attendance", icon:CheckCircle },
            { key:'monthly', label:'Monthly View',       icon:BarChart2   },
          ].map(({ key, label, icon:Icon }) => (
            <button key={key} onClick={()=>setView(key)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:9, border:'none', background:view===key?'#fff':'transparent', color:view===key?C.ink:C.inkFaint, fontSize:13, fontWeight:view===key?700:500, cursor:'pointer', boxShadow:view===key?'0 1px 4px rgba(0,0,0,0.08)':'none', transition:'all 0.15s' }}>
              <Icon size={14}/> {label}
            </button>
          ))}
        </div>

        {view==='monthly' && (
          <div style={{ display:'flex', alignItems:'center', gap:8, marginLeft:'auto' }}>
            <button onClick={prevMonth} style={{ padding:7, borderRadius:10, border:`1px solid ${C.creamBorder}`, background:'#fff', cursor:'pointer', display:'flex' }}><ChevronLeft size={15} color={C.inkMid}/></button>
            <span style={{ fontSize:15, fontWeight:700, color:C.ink, minWidth:100, textAlign:'center' }}>{MONTH_NAMES[month]} {year}</span>
            <button onClick={nextMonth} style={{ padding:7, borderRadius:10, border:`1px solid ${C.creamBorder}`, background:'#fff', cursor:'pointer', display:'flex' }}><ChevronRight size={15} color={C.inkMid}/></button>
          </div>
        )}

        {view==='today' && (
          <div style={{ position:'relative', marginLeft:'auto' }}>
            <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:C.inkFaint, pointerEvents:'none' }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search staff…"
              style={{ paddingLeft:34, paddingRight:12, paddingTop:8, paddingBottom:8, borderRadius:100, border:`1px solid ${C.creamBorder}`, background:'#fff', fontSize:12, color:C.ink, outline:'none', width:190 }}
              onFocus={e=>e.target.style.borderColor=C.goldMid} onBlur={e=>e.target.style.borderColor=C.creamBorder}/>
          </div>
        )}
      </div>

      {/* ── TODAY VIEW ── */}
      {view==='today' && (
        <div style={{ display:'grid', gridTemplateColumns:selected?'1fr 330px':'1fr', gap:16, alignItems:'start' }}>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:12 }}>
            {filtered.length===0 && (
              <div style={{ ...card, padding:44, textAlign:'center', color:C.inkFaint, fontSize:13, gridColumn:'1/-1' }}>
                {staffList.length===0 ? 'Loading staff…' : 'No staff found'}
              </div>
            )}

            {filtered.map(s => {
              const isSelected = String(s._id)===String(selected);
              const fm = floorMeta(s.liveStatus);
              const isPresent = ['present','late','half-day'].includes(s.attendanceStatus);
              const isTempOut = s.liveStatus === 'temp-unavailable';

              return (
                <motion.div key={s._id}
                  style={{ ...card, cursor:'pointer', borderColor:isSelected?C.goldMid:C.creamBorder, borderWidth:isSelected?2:1, overflow:'hidden' }}
                  whileHover={{ y:-2, boxShadow:'0 8px 20px rgba(180,130,0,0.10)' }}
                  onClick={() => setSelected(isSelected?null:s._id)}>

                  {/* Card header */}
                  <div style={{ padding:'14px 16px 0' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:10 }}>
                      <div style={{ position:'relative', flexShrink:0 }}>
                        <div style={{ width:44, height:44, borderRadius:13, background:C.creamMid, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:C.inkMid }}>
                          {(s.name||'S')[0].toUpperCase()}
                        </div>
                        <div style={{ position:'absolute', bottom:-2, right:-2, width:12, height:12, borderRadius:'50%', background:fm.dot, border:'2.5px solid #fff' }}/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:C.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.name}</div>
                        <div style={{ fontSize:11, color:C.inkFaint }}>{s.designation || 'Staff'}</div>
                        {s.phone && <div style={{ fontSize:10, color:C.inkGhost, marginTop:1 }}>{displayPhone(s.phone)}</div>}
                      </div>
                      <div style={{ padding:'4px 9px', borderRadius:100, background:fm.bg, border:`1px solid ${fm.color}33`, flexShrink:0 }}>
                        <span style={{ fontSize:10, fontWeight:700, color:fm.color }}>{fm.label}</span>
                      </div>
                    </div>

                    {/* Stepped Out toggle — only when on floor */}
                    {isPresent && (
                      <div style={{ marginBottom:10 }} onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>toggleFloor(s)} disabled={floorSaving===s._id}
                          style={{ width:'100%', padding:'6px 12px', borderRadius:9, border:`1.5px solid ${isTempOut?C.ok:C.orange}`, background:isTempOut?C.okPale:C.orangePale, color:isTempOut?C.ok:C.orange, fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, opacity:floorSaving===s._id?0.5:1, transition:'all 0.15s' }}>
                          {floorSaving===s._id ? '…' : isTempOut ? '✓ Back on Floor' : '☕ Stepped Out'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Attendance buttons */}
                  <div style={{ padding:'0 12px 12px', display:'flex', gap:4, flexWrap:'wrap' }} onClick={e=>e.stopPropagation()}>
                    {ATT.map(st => (
                      <AttBtn key={st.key} statusKey={st.key}
                        active={s.attendanceStatus===st.key}
                        onClick={()=>markAtt(s._id, st.key)}
                        disabled={marking===s._id} small/>
                    ))}
                  </div>

                  {/* Active booking chip */}
                  {s.currentBooking && (
                    <div style={{ margin:'0 12px 12px', padding:'7px 11px', borderRadius:10, background:C.warnPale, border:`1px solid ${C.warn}33` }}>
                      <span style={{ fontSize:11, fontWeight:700, color:C.warn }}>⚡ {s.currentBooking.service}</span>
                      <span style={{ fontSize:10, color:C.inkFaint }}> · {s.currentBooking.customer}</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Detail panel */}
          <AnimatePresence>
            {selected && selectedStaff && (
              <motion.div key={selected} initial={{opacity:0,x:14}} animate={{opacity:1,x:0}} exit={{opacity:0,x:14}}>
                <StaffDetail
                  staff={selectedStaff}
                  onMarkAtt={markAtt}
                  marking={marking}
                  onFloorToggle={()=>toggleFloor(selectedStaff)}
                  floorSaving={floorSaving===selectedStaff._id}
                  onClose={()=>setSelected(null)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* MONTHLY VIEW */}
      {view==='monthly' && (
        <MonthlyTable staffList={staffList} year={year} month={month}/>
      )}
    </div>
  );
}