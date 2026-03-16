// src/pages/superadmin/SuperAdminWhatsApp.jsx
// Super Admin — WhatsApp Hub
// ● Plan expiry reminders (manual wa.me deep-links, no API key needed)
// ● Custom bulk messages to selected salons
// ● Pre-built message templates with variable substitution preview
// ● Export reminder list as CSV
// ● Filter: expiring within N days / all expired
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/services/api';
import {
  MessageSquare, Bell, Download, RefreshCw, Check, Filter,
  ChevronDown, ChevronUp, Phone, AlertTriangle, X, Zap,
  CheckCheck, Building2, Users,
} from 'lucide-react';

/* ─── Design Tokens ──────────────────────────────────────────────────────── */
const C = {
  pageBg:'#F4EDE0', cardBg:'#FDFAF4', cardBg2:'#FAF7F0',
  gold:'#B8860B', goldLight:'#DAA520', goldPale:'#FFF8E7',
  ink:'#1A1208', inkMid:'#5C4A2A', inkLight:'#9C8660', border:'#DFD0A8',
  teal:'#0F766E', tealLight:'#14B8A6', tealPale:'#F0FDFA', tealBorder:'#99F6E4',
  green:'#15803D', greenPale:'#DCFCE7', greenBorder:'#86EFAC',
  red:'#991B1B', redPale:'#FEF2F2', redBorder:'#FECACA',
  amber:'#92400E', amberPale:'#FFFBEB', amberBorder:'#FDE68A',
  blue:'#1D4ED8', bluePale:'#EFF6FF', blueBorder:'#BFDBFE',
  purple:'#5B21B6', purplePale:'#F5F3FF', purpleBorder:'#DDD6FE',
  wa:'#25D366', waPale:'#E8FFF1', waBorder:'#A7F3C1',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const daysUntil = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;
const buildWaLink = (phone, msg) => {
  const intl = String(phone).startsWith('+') ? phone : `+91${String(phone).replace(/\D/g,'')}`;
  return `https://wa.me/${intl.replace('+','')}?text=${encodeURIComponent(msg)}`;
};

/* ─── TEMPLATES ──────────────────────────────────────────────────────────── */
const TEMPLATES = [
  {
    id: 'expiry_reminder',
    label: '📅 Expiry reminder',
    body: `Hi {adminName},\n\nThis is a reminder that your subscription for *{salonName}* will expire in *{expiryDays} day(s)* on {expiryDate}.\n\nPlease renew your plan to avoid any interruption to your salon operations.\n\nThank you!`,
  },
  {
    id: 'expiry_urgent',
    label: '⚠️ Urgent — expires soon',
    body: `⚠️ URGENT — Hi {adminName},\n\nYour subscription for *{salonName}* expires in just *{expiryDays} day(s)* on {expiryDate}.\n\nRenew *immediately* to prevent your dashboard from being locked.\n\nContact us now to avoid disruption.`,
  },
  {
    id: 'expired',
    label: '🔴 Already expired',
    body: `Hi {adminName},\n\nYour subscription for *{salonName}* has *expired* as of {expiryDate}.\n\nYour salon dashboard is currently restricted. Please renew your plan to restore full access.\n\nWe look forward to continuing to serve you!`,
  },
  {
    id: 'renewal_confirm',
    label: '✅ Renewal confirmation',
    body: `Hi {adminName},\n\nThank you! We've received your renewal for *{salonName}*. Your subscription is now active until *{expiryDate}*. 🎉\n\nIf you have any questions, feel free to reach out.`,
  },
  {
    id: 'welcome',
    label: '🎉 Welcome new salon',
    body: `Welcome, {adminName}! 🎉\n\nYour salon *{salonName}* has been successfully onboarded to Glamour SaaS.\n\nLog in at: https://app.glamour.com\nSlug: {salonSlug}\n\nFor support, reply to this message anytime.`,
  },
  { id: 'custom', label: '✏️ Custom message', body: '' },
];

const fillTemplate = (template, salon) => {
  const days = daysUntil(salon.subscriptionExpiry);
  return template
    .replace(/{adminName}/g,  salon.adminName  || 'there')
    .replace(/{salonName}/g,  salon.name       || '')
    .replace(/{salonSlug}/g,  salon.slug       || '')
    .replace(/{expiryDate}/g, fmtDate(salon.subscriptionExpiry))
    .replace(/{expiryDays}/g, days !== null ? Math.abs(days) : '?');
};

/* ─── Shared Primitives ──────────────────────────────────────────────────── */
const Sel = ({ label, children, ...p }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
    {label && <label style={{ fontSize:12, fontWeight:500, color:C.inkMid }}>{label}</label>}
    <select {...p} style={{ padding:'8px 11px', borderRadius:8, fontSize:13, border:`1px solid ${C.border}`, background:'white', color:C.ink, outline:'none', ...(p.style||{}) }}>{children}</select>
  </div>
);

const WaBtn = ({ link, small }) => (
  <a href={link} target="_blank" rel="noopener noreferrer"
    style={{ display:'inline-flex', alignItems:'center', gap:6, padding:small?'5px 11px':'8px 15px', borderRadius:8, border:`1px solid ${C.waBorder}`, background:C.waPale, color:C.wa, fontSize:small?12:13, fontWeight:600, textDecoration:'none', whiteSpace:'nowrap', transition:'all 0.15s' }}
    onMouseEnter={e=>{e.currentTarget.style.background=C.wa;e.currentTarget.style.color='white';}}
    onMouseLeave={e=>{e.currentTarget.style.background=C.waPale;e.currentTarget.style.color=C.wa;}}>
    <MessageSquare size={small?12:14}/> Open WhatsApp
  </a>
);

/* ─── Salon Row (Reminder tab) ───────────────────────────────────────────── */
const ReminderRow = ({ salon, selected, onToggle, message }) => {
  const [open, setOpen] = useState(false);
  const days    = daysUntil(salon.subscriptionExpiry);
  const expired = days !== null && days <= 0;
  const urgent  = days !== null && days > 0 && days <= 7;
  const sc = expired ? C.red : urgent ? C.red : C.amber;
  const sb = expired ? C.redPale : urgent ? C.redPale : C.amberPale;
  const filled = message ? fillTemplate(message, salon) : '';
  const waLink = salon.adminPhone && filled ? buildWaLink(salon.adminPhone, filled) : null;

  return (
    <div style={{ background:C.cardBg, borderRadius:13, border:`1px solid ${selected?C.tealBorder:C.border}`, overflow:'hidden', transition:'border-color 0.15s' }}>
      <div style={{ padding:'13px 16px', display:'flex', alignItems:'center', gap:12 }}>
        {/* Checkbox */}
        <div onClick={onToggle} style={{ width:20, height:20, borderRadius:6, border:`2px solid ${selected?C.teal:C.border}`, background:selected?C.teal:'white', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, transition:'all 0.15s' }}>
          {selected && <Check size={12} color="white" strokeWidth={3}/>}
        </div>

        {/* Salon avatar */}
        <div style={{ width:36, height:36, borderRadius:9, background:`${C.gold}20`, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:C.gold, flexShrink:0 }}>
          {salon.name?.charAt(0)}
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:600, color:C.ink }}>{salon.name}</div>
          <div style={{ fontSize:12, color:C.inkLight, display:'flex', alignItems:'center', gap:6, marginTop:1, flexWrap:'wrap' }}>
            <span>{salon.adminName || '—'}</span>
            {salon.adminPhone && <span style={{ display:'inline-flex', alignItems:'center', gap:3 }}><Phone size={10}/>{salon.adminPhone}</span>}
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
          <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:10, background:sb, color:sc }}>
            {expired ? 'Expired' : `${days}d left`}
          </span>
          <span style={{ fontSize:10, color:C.inkLight }}>{fmtDate(salon.subscriptionExpiry)}</span>
        </div>
      </div>

      {/* Actions row */}
      <div style={{ borderTop:`1px solid ${C.border}`, padding:'8px 16px', background:`${C.tealPale}70`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
        <button onClick={()=>setOpen(o=>!o)} style={{ fontSize:12, color:C.teal, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, padding:0 }}>
          {open?<ChevronUp size={13}/>:<ChevronDown size={13}/>} {open?'Hide':'Preview'} message
        </button>
        <div style={{ display:'flex', gap:8 }}>
          {waLink ? <WaBtn link={waLink} small /> : (
            <span style={{ fontSize:12, color:C.red }}>
              {!salon.adminPhone ? 'No phone number' : 'Select a template first'}
            </span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {open && filled && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} style={{overflow:'hidden'}}>
            <div style={{ padding:'12px 16px', borderTop:`1px solid ${C.border}` }}>
              <pre style={{ fontSize:12, color:C.inkMid, background:'white', borderRadius:8, border:`1px solid ${C.border}`, padding:'10px 12px', whiteSpace:'pre-wrap', fontFamily:'inherit', lineHeight:1.65, margin:0 }}>
                {filled}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function SuperAdminWhatsApp() {
  const [tab, setTab]           = useState('reminders'); // 'reminders' | 'custom'

  // ── Reminders tab state ────────────────────────────────────────────
  const [salons, setSalons]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [withinDays, setWithinDays] = useState(30);
  const [includeExpired, setIncludeExpired] = useState(true);
  const [selTemplate, setSelTemplate] = useState(TEMPLATES[0]);
  const [customBody, setCustomBody]   = useState('');
  const [selected, setSelected]       = useState(new Set());

  // ── Custom tab state ───────────────────────────────────────────────
  const [allSalons, setAllSalons]     = useState([]);
  const [loadingAll, setLoadingAll]   = useState(false);
  const [selCustomTpl, setSelCustomTpl] = useState(TEMPLATES[5]);
  const [customMsg, setCustomMsg]     = useState('');
  const [selSalons, setSelSalons]     = useState(new Set());
  const [generatedLinks, setGeneratedLinks] = useState([]);
  const [search, setSearch]           = useState('');

  // ── Load expiring salons ───────────────────────────────────────────
  const loadExpiring = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200, page: 1 };
      const { data } = await api.get('/superadmin/salons', { params });
      let list = data.salons || [];

      // Filter client-side for expiry window
      const cutoff = new Date(Date.now() + withinDays * 86400000);
      list = list.filter(s => {
        if (!s.subscriptionExpiry) return false;
        const d = new Date(s.subscriptionExpiry);
        const days = daysUntil(s.subscriptionExpiry);
        if (includeExpired && days !== null && days <= 0) return true;
        return d <= cutoff && days > 0;
      });

      // Attach admin info
      const enriched = list.map(s => ({
        ...s,
        adminName : s.admin?.name  || '',
        adminPhone: s.admin?.phone || '',
        adminEmail: s.admin?.email || '',
      }));
      setSalons(enriched);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [withinDays, includeExpired]);

  const loadAll = useCallback(async () => {
    setLoadingAll(true);
    try {
      const { data } = await api.get('/superadmin/salons', { params:{ limit:200, page:1 } });
      setAllSalons((data.salons||[]).map(s => ({
        ...s,
        adminName : s.admin?.name  || '',
        adminPhone: s.admin?.phone || '',
      })));
    } catch (e) { console.error(e); }
    finally { setLoadingAll(false); }
  }, []);

  useEffect(() => { loadExpiring(); }, [loadExpiring]);
  useEffect(() => { if (tab==='custom') loadAll(); }, [tab, loadAll]);

  // ── Template message for current selection ─────────────────────────
  const activeMsg = selTemplate.id === 'custom' ? customBody : selTemplate.body;

  // ── Selection helpers ──────────────────────────────────────────────
  const toggleSel = (id) => setSelected(s => { const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleAll = () => setSelected(s => s.size===salons.length ? new Set() : new Set(salons.map(s=>s._id)));
  const toggleCustom = (id) => setSelSalons(s => { const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });

  // ── Generate custom links ──────────────────────────────────────────
  const generateLinks = () => {
    const msg = selCustomTpl.id==='custom' ? customMsg : selCustomTpl.body;
    if (!msg.trim()) return;
    const links = allSalons.filter(s => selSalons.has(s._id)).map(s => ({
      ...s,
      filled : fillTemplate(msg, s),
      waLink : s.adminPhone ? buildWaLink(s.adminPhone, fillTemplate(msg, s)) : null,
    }));
    setGeneratedLinks(links);
  };

  // ── CSV export ─────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [
      ['Salon Name','Slug','Plan','Admin','Phone','Email','Expiry Date','Days Left','Status'],
      ...salons.map(s => {
        const days = daysUntil(s.subscriptionExpiry);
        return [
          s.name, s.slug, s.plan,
          s.adminName, s.adminPhone, s.adminEmail,
          fmtDate(s.subscriptionExpiry),
          days !== null ? Math.abs(days) : '',
          days !== null && days <= 0 ? 'Expired' : `${days}d left`,
        ];
      }),
    ];
    const csv = rows.map(r=>r.map(c=>/[,"\n]/.test(String(c))?`"${String(c).replace(/"/g,'""')}"`:c).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));
    const a = document.createElement('a'); a.href=url; a.download=`expiry_reminders_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportAllCSV = () => {
    const rows = [
      ['Salon Name','Slug','Plan','Admin','Phone','Email','Expiry Date','Status'],
      ...allSalons.map(s => [
        s.name, s.slug, s.plan,
        s.adminName, s.adminPhone, s.adminEmail,
        fmtDate(s.subscriptionExpiry),
        s.isSuspended ? 'Suspended' : s.isActive ? 'Active' : 'Inactive',
      ]),
    ];
    const csv = rows.map(r=>r.map(c=>/[,"\n]/.test(String(c))?`"${String(c).replace(/"/g,'""')}"`:c).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));
    const a = document.createElement('a'); a.href=url; a.download=`all_salons_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filteredAll = allSalons.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.slug.includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth:960, margin:'0 auto' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Page header */}
      <div style={{ marginBottom:22 }}>
        <h1 style={{ fontFamily:'Playfair Display, Georgia, serif', fontSize:'clamp(20px,4vw,26px)', fontWeight:600, color:C.ink, margin:0 }}>
          WhatsApp Hub
        </h1>
        <p style={{ fontSize:13, color:C.inkLight, marginTop:4 }}>
          Send plan reminders and custom messages to salon admins — no API key needed
        </p>
      </div>

      {/* How it works */}
      <div style={{ padding:'12px 16px', borderRadius:10, background:C.waPale, border:`1px solid ${C.waBorder}`, marginBottom:20, display:'flex', gap:10, alignItems:'flex-start' }}>
        <MessageSquare size={15} color={C.wa} style={{ marginTop:2, flexShrink:0 }} />
        <div style={{ fontSize:13, color:'#15803D', lineHeight:1.6 }}>
          <strong>Manual WhatsApp:</strong> Click <strong>"Open WhatsApp"</strong> on any row to launch WhatsApp Web or the app with a pre-filled message. Works on desktop and mobile. No third-party API or extra setup required.
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, marginBottom:20, background:'white', borderRadius:11, border:`1px solid ${C.border}`, padding:4, width:'fit-content' }}>
        {[
          { id:'reminders', label:'Plan Reminders', icon:Bell },
          { id:'custom',    label:'Custom Message', icon:MessageSquare },
        ].map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 18px', borderRadius:9, border:'none', background:active?C.goldPale:'transparent', color:active?C.gold:C.inkMid, fontSize:13, fontWeight:active?600:400, cursor:'pointer', transition:'all 0.15s' }}>
              <Icon size={14}/> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB: REMINDERS ─────────────────────────────────────────────── */}
      {tab === 'reminders' && (
        <div>
          {/* Controls */}
          <div style={{ background:C.cardBg, borderRadius:13, border:`1px solid ${C.border}`, padding:'16px 18px', marginBottom:16 }}>
            <div style={{ display:'flex', flexWrap:'wrap', gap:12, alignItems:'flex-end', marginBottom:16 }}>
              <Sel label="Show expiring within" value={withinDays} onChange={e=>setWithinDays(+e.target.value)} style={{ minWidth:160 }}>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={999}>All (any expiry)</option>
              </Sel>

              <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:13, color:C.inkMid, userSelect:'none' }}>
                <div onClick={()=>setIncludeExpired(v=>!v)} style={{ width:20, height:20, borderRadius:6, border:`2px solid ${includeExpired?C.red:C.border}`, background:includeExpired?C.red:'white', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.15s' }}>
                  {includeExpired && <Check size={12} color="white" strokeWidth={3}/>}
                </div>
                Include expired
              </label>

              <button onClick={loadExpiring} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:9, border:'none', background:C.teal, color:'white', fontSize:13, cursor:'pointer' }}>
                {loading ? <RefreshCw size={14} style={{animation:'spin 1s linear infinite'}}/> : <Filter size={14}/>} Load
              </button>

              <button onClick={exportCSV} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:9, border:`1px solid ${C.border}`, background:'white', fontSize:13, color:C.inkMid, cursor:'pointer' }}>
                <Download size={14}/> Export CSV
              </button>
            </div>

            {/* Template selector */}
            <div>
              <div style={{ fontSize:12, fontWeight:500, color:C.inkMid, marginBottom:8 }}>Message template</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom: selTemplate.id==='custom'?12:0 }}>
                {TEMPLATES.map(t => (
                  <button key={t.id} onClick={()=>setSelTemplate(t)} style={{ padding:'5px 13px', borderRadius:20, fontSize:12, border:`1px solid ${selTemplate.id===t.id?C.gold:C.border}`, background:selTemplate.id===t.id?C.goldPale:'white', color:selTemplate.id===t.id?C.gold:C.inkMid, cursor:'pointer', fontWeight:selTemplate.id===t.id?600:400, transition:'all 0.15s' }}>
                    {t.label}
                  </button>
                ))}
              </div>
              {selTemplate.id === 'custom' && (
                <textarea value={customBody} onChange={e=>setCustomBody(e.target.value)} rows={5} placeholder="Type your custom message… Use {adminName}, {salonName}, {expiryDate}, {expiryDays} as placeholders." style={{ width:'100%', padding:'10px 12px', borderRadius:9, fontSize:13, border:`1px solid ${C.border}`, color:C.ink, resize:'vertical', fontFamily:'inherit', lineHeight:1.6, outline:'none', boxSizing:'border-box', marginTop:10 }}
                  onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border} />
              )}
            </div>
          </div>

          {/* Bulk actions bar */}
          {salons.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, padding:'10px 14px', borderRadius:9, background:C.tealPale, border:`1px solid ${C.tealBorder}`, flexWrap:'wrap', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <button onClick={toggleAll} style={{ fontSize:13, color:C.teal, background:'none', border:`1px solid ${C.tealBorder}`, borderRadius:7, padding:'4px 12px', cursor:'pointer' }}>
                  {selected.size===salons.length?'Deselect all':'Select all'} ({salons.length})
                </button>
                {selected.size > 0 && (
                  <span style={{ fontSize:13, color:C.teal, fontWeight:500 }}>{selected.size} selected</span>
                )}
              </div>
              {selected.size > 0 && activeMsg && (
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ fontSize:12, color:C.teal }}>
                    Open each link one by one →
                  </span>
                  {[...selected].slice(0,1).map(id => {
                    const s = salons.find(s=>s._id===id);
                    if (!s?.adminPhone) return null;
                    const link = buildWaLink(s.adminPhone, fillTemplate(activeMsg, s));
                    return (
                      <a key={id} href={link} target="_blank" rel="noopener noreferrer"
                        onClick={()=>{ setSelected(sel=>{const n=new Set(sel);n.delete(id);return n;}); }}
                        style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, border:`1px solid ${C.waBorder}`, background:C.wa, color:'white', fontSize:13, fontWeight:600, textDecoration:'none' }}>
                        <MessageSquare size={13}/> Send next ({selected.size} left)
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Salon list */}
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
              <RefreshCw size={22} color={C.teal} style={{animation:'spin 1s linear infinite'}}/>
            </div>
          ) : salons.length === 0 ? (
            <div style={{ padding:60, textAlign:'center', background:C.cardBg, borderRadius:14, border:`1px solid ${C.border}`, color:C.inkLight }}>
              <Bell size={32} style={{ opacity:0.3, marginBottom:12, display:'block', margin:'0 auto 12px' }}/>
              No salons expiring within {withinDays} days {includeExpired?'(including expired)':''}.
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {salons.map(s => (
                <ReminderRow key={s._id} salon={s} selected={selected.has(s._id)}
                  onToggle={()=>toggleSel(s._id)} message={activeMsg} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: CUSTOM ──────────────────────────────────────────────── */}
      {tab === 'custom' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16 }}>
            {/* Left: compose */}
            <div>
              <div style={{ background:C.cardBg, borderRadius:13, border:`1px solid ${C.border}`, overflow:'hidden', marginBottom:14 }}>
                <div style={{ padding:'13px 18px', borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:14, fontWeight:600, color:C.ink }}>Choose template</div>
                </div>
                <div style={{ padding:'14px 18px' }}>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                    {TEMPLATES.map(t => (
                      <button key={t.id} onClick={()=>{setSelCustomTpl(t);if(t.id!=='custom')setCustomMsg(t.body);}} style={{ padding:'5px 13px', borderRadius:20, fontSize:12, border:`1px solid ${selCustomTpl.id===t.id?C.gold:C.border}`, background:selCustomTpl.id===t.id?C.goldPale:'white', color:selCustomTpl.id===t.id?C.gold:C.inkMid, cursor:'pointer', fontWeight:selCustomTpl.id===t.id?600:400, transition:'all 0.15s' }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ background:C.cardBg, borderRadius:13, border:`1px solid ${C.border}`, overflow:'hidden' }}>
                <div style={{ padding:'13px 18px', borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:14, fontWeight:600, color:C.ink }}>Message</div>
                  <div style={{ fontSize:12, color:C.inkLight, marginTop:2 }}>
                    Placeholders: <code style={{background:'#F3ECE0',padding:'1px 5px',borderRadius:4}}>{'{adminName}'}</code> <code style={{background:'#F3ECE0',padding:'1px 5px',borderRadius:4}}>{'{salonName}'}</code> <code style={{background:'#F3ECE0',padding:'1px 5px',borderRadius:4}}>{'{expiryDate}'}</code>
                  </div>
                </div>
                <div style={{ padding:'14px 18px' }}>
                  <textarea value={customMsg} onChange={e=>setCustomMsg(e.target.value)} rows={9} placeholder="Type or edit message…" style={{ width:'100%', padding:'10px 12px', borderRadius:9, fontSize:13, border:`1px solid ${C.border}`, color:C.ink, resize:'vertical', fontFamily:'inherit', lineHeight:1.6, outline:'none', boxSizing:'border-box' }}
                    onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border} />
                </div>
              </div>
            </div>

            {/* Right: salon selector */}
            <div>
              <div style={{ background:C.cardBg, borderRadius:13, border:`1px solid ${C.border}`, overflow:'hidden', marginBottom:14 }}>
                <div style={{ padding:'13px 18px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ fontSize:14, fontWeight:600, color:C.ink }}>Select salons</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={exportAllCSV} style={{ fontSize:12, color:C.inkMid, background:'none', border:`1px solid ${C.border}`, borderRadius:7, padding:'3px 9px', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                      <Download size={11}/> Export all CSV
                    </button>
                    <button onClick={()=>setSelSalons(s=>s.size===filteredAll.length?new Set():new Set(filteredAll.map(b=>b._id)))} style={{ fontSize:12, color:C.teal, background:'none', border:`1px solid ${C.tealBorder}`, borderRadius:7, padding:'3px 9px', cursor:'pointer' }}>
                      {selSalons.size===filteredAll.length?'Deselect all':'Select all'}
                    </button>
                  </div>
                </div>
                {/* Search */}
                <div style={{ padding:'10px 14px', borderBottom:`1px solid ${C.border}` }}>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search salons…" style={{ width:'100%', padding:'7px 11px', borderRadius:8, fontSize:13, border:`1px solid ${C.border}`, outline:'none', boxSizing:'border-box' }}
                    onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
                </div>
                <div style={{ maxHeight:300, overflowY:'auto', padding:'8px 14px', display:'flex', flexDirection:'column', gap:6 }}>
                  {loadingAll ? (
                    <div style={{ padding:20, textAlign:'center' }}><RefreshCw size={16} color={C.teal} style={{animation:'spin 1s linear infinite'}}/></div>
                  ) : filteredAll.map(s => (
                    <div key={s._id} onClick={()=>toggleCustom(s._id)} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, border:`1px solid ${selSalons.has(s._id)?C.tealBorder:C.border}`, background:selSalons.has(s._id)?C.tealPale:'white', cursor:'pointer', transition:'all 0.15s' }}>
                      <div style={{ width:17, height:17, borderRadius:5, border:`2px solid ${selSalons.has(s._id)?C.teal:C.border}`, background:selSalons.has(s._id)?C.teal:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {selSalons.has(s._id) && <Check size={10} color="white" strokeWidth={3}/>}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:500, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</div>
                        <div style={{ fontSize:11, color:C.inkLight }}>{s.adminPhone||'No phone'}</div>
                      </div>
                      {!s.adminPhone && <span style={{ fontSize:10, color:C.red, background:C.redPale, padding:'1px 6px', borderRadius:5, flexShrink:0 }}>No phone</span>}
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={generateLinks} disabled={!customMsg.trim()||!selSalons.size}
                style={{ width:'100%', padding:'11px', borderRadius:10, border:'none', background:customMsg.trim()&&selSalons.size?C.gold:'#ccc', color:'white', fontSize:14, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'background 0.15s' }}>
                <Zap size={15}/> Generate {selSalons.size||''} WhatsApp link{selSalons.size!==1?'s':''}
              </button>
            </div>
          </div>

          {/* Generated links */}
          {generatedLinks.length > 0 && (
            <div style={{ marginTop:24 }}>
              <div style={{ fontSize:14, fontWeight:600, color:C.ink, marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
                <CheckCheck size={16} color={C.green}/> {generatedLinks.length} links ready — click each to open WhatsApp
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {generatedLinks.map(r => (
                  <div key={r._id} style={{ background:C.cardBg, borderRadius:10, border:`1px solid ${C.border}`, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:500, color:C.ink }}>{r.name}</div>
                      <div style={{ fontSize:12, color:C.inkLight, display:'flex', alignItems:'center', gap:4, marginTop:2 }}>
                        <Phone size={11}/> {r.adminPhone||'No phone'}
                      </div>
                    </div>
                    {r.waLink ? <WaBtn link={r.waLink}/> : <span style={{ fontSize:12, color:C.red }}>No phone — cannot send</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
