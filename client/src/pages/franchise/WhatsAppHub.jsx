// src/pages/franchise/WhatsAppHub.jsx
// Phase 4 — WhatsApp Hub
// Manual WhatsApp messaging: plan reminders, custom messages, templates,
// per-branch messaging, multi-select, and CSV export of reminder list.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/services/api';
import {
  MessageSquare, Send, RefreshCw, Check, CheckCheck, AlertTriangle,
  Download, Users, ChevronDown, ChevronUp, Phone, Copy, ExternalLink,
  Filter, X, Zap, Bell,
} from 'lucide-react';

/* ─── Design Tokens ──────────────────────────────────────────────────────── */
const C = {
  cardBg:'#FDFAF4', ink:'#1A1208', inkMid:'#5C4A2A', inkLight:'#9C8660', border:'#DFD0A8',
  gold:'#B8860B', goldPale:'#FFF8E7',
  teal:'#0F766E', tealLight:'#14B8A6', tealPale:'#F0FDFA', tealBorder:'#99F6E4',
  green:'#15803D', greenPale:'#DCFCE7', greenBorder:'#86EFAC',
  red:'#991B1B', redPale:'#FEF2F2', redBorder:'#FECACA',
  amber:'#92400E', amberPale:'#FFFBEB', amberBorder:'#FDE68A',
  wa:'#25D366', waPale:'#E8FFF1', waBorder:'#A7F3C1',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const daysUntil = (d) => d ? Math.ceil((new Date(d)-new Date())/86400000) : null;

/* ─── Shared primitives ──────────────────────────────────────────────────── */
const Inp = ({ label, ...p }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
    {label && <label style={{ fontSize:12, fontWeight:500, color:C.inkMid }}>{label}</label>}
    <input {...p} style={{ padding:'9px 12px', borderRadius:9, fontSize:13, border:`1px solid ${C.border}`, background:'#fff', color:C.ink, outline:'none', width:'100%', boxSizing:'border-box', ...(p.style||{}) }}
      onFocus={e=>e.target.style.borderColor=C.teal} onBlur={e=>e.target.style.borderColor=C.border} />
  </div>
);

const Sel = ({ label, children, ...p }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
    {label && <label style={{ fontSize:12, fontWeight:500, color:C.inkMid }}>{label}</label>}
    <select {...p} style={{ padding:'9px 12px', borderRadius:9, fontSize:13, border:`1px solid ${C.border}`, background:'#fff', color:C.ink, outline:'none', width:'100%', boxSizing:'border-box' }}>{children}</select>
  </div>
);

/* ─── WhatsApp Send Button ───────────────────────────────────────────────── */
const WaButton = ({ link, label='Open WhatsApp', small=false }) => (
  <a href={link} target="_blank" rel="noopener noreferrer"
    style={{ display:'inline-flex', alignItems:'center', gap:6, padding:small?'6px 12px':'9px 16px', borderRadius:9, border:`1px solid ${C.waBorder}`, background:C.waPale, color:C.wa, fontSize:small?12:13, fontWeight:600, textDecoration:'none', cursor:'pointer', transition:'all 0.15s' }}
    onMouseEnter={e=>{e.currentTarget.style.background=C.wa;e.currentTarget.style.color='white';}}
    onMouseLeave={e=>{e.currentTarget.style.background=C.waPale;e.currentTarget.style.color=C.wa;}}>
    <MessageSquare size={small?13:15}/> {label}
  </a>
);

/* ─── Reminder Card ──────────────────────────────────────────────────────── */
const ReminderCard = ({ r, selected, onToggle }) => {
  const expired = r.expiryDays !== null && r.expiryDays <= 0;
  const urgent  = r.expiryDays !== null && r.expiryDays > 0 && r.expiryDays <= 7;
  const statusColor = expired ? C.red : urgent ? C.red : C.amber;
  const statusBg    = expired ? C.redPale : urgent ? C.redPale : C.amberPale;
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
      style={{ background:C.cardBg, borderRadius:13, border:`1px solid ${selected?C.tealBorder:C.border}`, overflow:'hidden', transition:'border-color 0.15s' }}>
      <div style={{ padding:'13px 16px', display:'flex', alignItems:'center', gap:12 }}>
        {/* Checkbox */}
        <div onClick={onToggle} style={{ width:20, height:20, borderRadius:6, border:`2px solid ${selected?C.teal:C.border}`, background:selected?C.teal:'white', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, transition:'all 0.15s' }}>
          {selected && <Check size={12} color="white" strokeWidth={3}/>}
        </div>

        {/* Avatar */}
        <div style={{ width:36, height:36, borderRadius:9, background:`linear-gradient(135deg, ${C.tealLight}40, ${C.teal}20)`, border:`1px solid ${C.tealBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:C.teal, flexShrink:0 }}>
          {r.salonName?.charAt(0)}
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:600, color:C.ink }}>{r.salonName}</div>
          <div style={{ fontSize:12, color:C.inkLight }}>{r.adminName} · {r.adminPhone||'No phone'}</div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
          <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:10, background:statusBg, color:statusColor }}>
            {expired?'Expired':`${r.expiryDays}d left`}
          </span>
          <span style={{ fontSize:11, color:C.inkLight }}>{fmtDate(r.expiryDate)}</span>
        </div>
      </div>

      {/* Message preview & actions */}
      <div style={{ borderTop:`1px solid ${C.border}`, padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, background:`${C.tealPale}80` }}>
        <button onClick={()=>setExpanded(e=>!e)} style={{ fontSize:12, color:C.teal, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, padding:0 }}>
          {expanded?<ChevronUp size={13}/>:<ChevronDown size={13}/>} {expanded?'Hide':'Preview'} message
        </button>
        <div style={{ display:'flex', gap:8 }}>
          {r.canSend ? (
            <WaButton link={r.waLink} small />
          ) : (
            <span style={{ fontSize:12, color:C.red }}>No phone number</span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
            style={{ overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderTop:`1px solid ${C.border}` }}>
              <div style={{ fontSize:12, color:C.inkMid, background:'white', borderRadius:8, border:`1px solid ${C.border}`, padding:'10px 12px', whiteSpace:'pre-wrap', lineHeight:1.6, fontFamily:'inherit' }}>
                {r.message}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ─── Template Selector ──────────────────────────────────────────────────── */
const TemplateSelector = ({ templates, selected, onSelect }) => (
  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
    {templates.map(t => (
      <button key={t.id} onClick={()=>onSelect(t)} style={{ padding:'6px 13px', borderRadius:20, fontSize:12, border:`1px solid ${selected?.id===t.id?C.teal:C.border}`, background:selected?.id===t.id?C.tealPale:'white', color:selected?.id===t.id?C.teal:C.inkMid, cursor:'pointer', fontWeight:selected?.id===t.id?600:400, transition:'all 0.15s' }}>
        {t.label}
      </button>
    ))}
  </div>
);

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function WhatsAppHub() {
  const location = useLocation();
  const preselectIds = location.state?.preselect || [];

  // Tab: 'reminders' | 'custom'
  const [tab, setTab] = useState('reminders');

  // Reminders tab state
  const [reminders, setReminders] = useState([]);
  const [loadingRem, setLoadingRem] = useState(false);
  const [withinDays, setWithinDays] = useState(30);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [customRemMsg, setCustomRemMsg] = useState('');

  // Custom tab state
  const [branches, setBranches] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selTemplate, setSelTemplate] = useState(null);
  const [customMsg, setCustomMsg] = useState('');
  const [selBranches, setSelBranches] = useState(new Set());
  const [customLinks, setCustomLinks] = useState([]);
  const [loadingCustom, setLoadingCustom] = useState(false);

  // CSV export
  const [exporting, setExporting] = useState(false);

  /* Load data */
  const loadReminders = useCallback(async () => {
    setLoadingRem(true);
    try {
      const res = await api.post('/franchise/whatsapp/plan-reminder', {
        withinDays, customMessage: customRemMsg||undefined,
      });
      setReminders(res.data.reminders || []);
      // Auto-select preselected ids
      if (preselectIds.length) {
        setSelectedIds(new Set(res.data.reminders
          .filter(r => preselectIds.includes(r.salonId?.toString()))
          .map(r => r.salonId)));
      }
    } catch (e) { console.error(e); }
    finally { setLoadingRem(false); }
  }, [withinDays, customRemMsg, preselectIds.join(',')]);

  const loadCustomData = useCallback(async () => {
    try {
      const [brRes, tmRes] = await Promise.all([
        api.get('/franchise/branches', { params:{ limit:100 } }),
        api.get('/franchise/whatsapp/templates'),
      ]);
      setBranches(brRes.data.salons || []);
      setTemplates(tmRes.data.templates || []);
      // Auto-select preselected branches
      if (preselectIds.length) setSelBranches(new Set(preselectIds));
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    loadReminders();
    loadCustomData();
  }, []);

  useEffect(() => { if (tab==='reminders') loadReminders(); }, [tab, withinDays]);

  /* Toggle selection */
  const toggleId = (id, setter) => setter(s => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const toggleAll = () => setSelectedIds(s => s.size===reminders.length ? new Set() : new Set(reminders.map(r=>r.salonId)));

  /* Generate custom WA links */
  const handleGenerateLinks = async () => {
    if (!customMsg.trim()) return;
    if (!selBranches.size) return;
    setLoadingCustom(true);
    try {
      const res = await api.post('/franchise/whatsapp/custom', {
        salonIds: [...selBranches],
        message: customMsg,
      });
      setCustomLinks(res.data.results || []);
    } catch (e) { console.error(e); }
    finally { setLoadingCustom(false); }
  };

  /* Export reminder list as CSV */
  const exportReminderCSV = () => {
    const rows = [
      ['Salon', 'Admin', 'Phone', 'Expiry Date', 'Days Left', 'Status'],
      ...reminders.map(r => [
        r.salonName, r.adminName||'', r.adminPhone||'',
        fmtDate(r.expiryDate),
        r.expiryDays ?? 'N/A',
        r.expired ? 'Expired' : `${r.expiryDays}d left`,
      ]),
    ];
    const csv = rows.map(r=>r.map(c=>/[,"\n]/.test(String(c))?`"${String(c).replace(/"/g,'""')}"`:c).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a'); a.href=url; a.download='subscription_reminders.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  /* Fill template placeholders on select */
  const applyTemplate = (t) => {
    setSelTemplate(t);
    setCustomMsg(t.template);
  };

  return (
    <div style={{ maxWidth:900 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Page header */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:600, color:C.ink, margin:0 }}>WhatsApp Hub</h1>
        <p style={{ fontSize:13, color:C.inkLight, margin:'4px 0 0' }}>Send plan reminders and custom messages to branch admins via WhatsApp</p>
      </div>

      {/* How it works banner */}
      <div style={{ padding:'12px 16px', borderRadius:10, background:C.waPale, border:`1px solid ${C.waBorder}`, marginBottom:20, display:'flex', gap:10, alignItems:'flex-start' }}>
        <MessageSquare size={15} color={C.wa} style={{ marginTop:1 }} />
        <div style={{ fontSize:13, color:'#15803D', lineHeight:1.6 }}>
          <strong>Manual WhatsApp:</strong> Messages are sent by opening WhatsApp Web or the app directly. Click <strong>"Open WhatsApp"</strong> on any card to launch a pre-filled message. No API key needed — works on all devices.
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, marginBottom:20, background:'white', borderRadius:11, border:`1px solid ${C.border}`, padding:4, width:'fit-content' }}>
        {[
          { id:'reminders', label:'Plan reminders', icon:Bell },
          { id:'custom',    label:'Custom message', icon:MessageSquare },
        ].map(t => {
          const Icon = t.icon;
          const active = tab===t.id;
          return (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 18px', borderRadius:9, border:'none', background:active?C.tealPale:'transparent', color:active?C.teal:C.inkMid, fontSize:13, fontWeight:active?600:400, cursor:'pointer', transition:'all 0.15s' }}>
              <Icon size={14}/> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB: REMINDERS ── */}
      {tab === 'reminders' && (
        <div>
          {/* Controls */}
          <div style={{ background:C.cardBg, borderRadius:12, border:`1px solid ${C.border}`, padding:'14px 16px', marginBottom:16 }}>
            <div style={{ display:'flex', flexWrap:'wrap', gap:12, alignItems:'flex-end' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <label style={{ fontSize:12, fontWeight:500, color:C.inkMid }}>Show branches expiring within</label>
                <select value={withinDays} onChange={e=>setWithinDays(+e.target.value)} style={{ padding:'8px 12px', borderRadius:8, fontSize:13, border:`1px solid ${C.border}`, background:'white', color:C.ink, outline:'none' }}>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={999}>All (including expired)</option>
                </select>
              </div>
              <div style={{ flex:1, minWidth:200, display:'flex', flexDirection:'column', gap:4 }}>
                <label style={{ fontSize:12, fontWeight:500, color:C.inkMid }}>Custom message override (optional)</label>
                <input value={customRemMsg} onChange={e=>setCustomRemMsg(e.target.value)} placeholder="Leave blank to use auto-generated messages" style={{ padding:'8px 12px', borderRadius:8, fontSize:13, border:`1px solid ${C.border}`, background:'white', color:C.ink, outline:'none' }}
                  onFocus={e=>e.target.style.borderColor=C.teal} onBlur={e=>e.target.style.borderColor=C.border} />
              </div>
              <button onClick={loadReminders} style={{ padding:'8px 16px', borderRadius:9, border:'none', background:C.teal, color:'white', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                {loadingRem ? <RefreshCw size={14} style={{animation:'spin 1s linear infinite'}}/> : <Filter size={14}/>} Load
              </button>
              <button onClick={exportReminderCSV} style={{ padding:'8px 14px', borderRadius:9, border:`1px solid ${C.border}`, background:'white', fontSize:13, color:C.inkMid, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                <Download size={14}/> Export CSV
              </button>
            </div>
          </div>

          {/* Bulk actions */}
          {reminders.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, padding:'10px 14px', borderRadius:9, background:C.tealPale, border:`1px solid ${C.tealBorder}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <button onClick={toggleAll} style={{ fontSize:13, color:C.teal, background:'none', border:`1px solid ${C.tealBorder}`, borderRadius:7, padding:'4px 10px', cursor:'pointer' }}>
                  {selectedIds.size===reminders.length?'Deselect all':'Select all'} ({reminders.length})
                </button>
                {selectedIds.size>0 && <span style={{ fontSize:13, color:C.teal, fontWeight:500 }}>{selectedIds.size} selected</span>}
              </div>
              {selectedIds.size>0 && (
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={()=>{ const r=reminders.filter(r=>selectedIds.has(r.salonId)&&r.canSend); if(r.length>0){window.open(r[0].waLink,'_blank');setSelectedIds(new Set(s=>{const n=new Set(s);n.delete(r[0].salonId);return n;}));} }} style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${C.waBorder}`, background:C.waPale, color:C.wa, fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                    <MessageSquare size={13}/> Send next ({selectedIds.size})
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Reminder list */}
          {loadingRem ? (
            <div style={{ display:'flex', justifyContent:'center', padding:60 }}><RefreshCw size={20} color={C.teal} style={{animation:'spin 1s linear infinite'}}/></div>
          ) : reminders.length === 0 ? (
            <div style={{ padding:60, textAlign:'center', background:C.cardBg, borderRadius:14, border:`1px solid ${C.border}`, color:C.inkLight }}>
              No branches found with subscriptions expiring within {withinDays} days.
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {reminders.map(r => (
                <ReminderCard key={r.salonId} r={r} selected={selectedIds.has(r.salonId)} onToggle={()=>toggleId(r.salonId, setSelectedIds)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: CUSTOM ── */}
      {tab === 'custom' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16 }}>
            {/* Left: compose */}
            <div>
              <div style={{ background:C.cardBg, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden', marginBottom:14 }}>
                <div style={{ padding:'13px 16px', borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:14, fontWeight:600, color:C.ink }}>Choose a template</div>
                </div>
                <div style={{ padding:'14px 16px' }}>
                  <TemplateSelector templates={templates} selected={selTemplate} onSelect={applyTemplate} />
                </div>
              </div>

              <div style={{ background:C.cardBg, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden' }}>
                <div style={{ padding:'13px 16px', borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:14, fontWeight:600, color:C.ink }}>Message</div>
                  <div style={{ fontSize:12, color:C.inkLight, marginTop:2 }}>Use <code style={{background:'#F3ECE0',padding:'1px 5px',borderRadius:4}}>{'{adminName}'}</code>, <code style={{background:'#F3ECE0',padding:'1px 5px',borderRadius:4}}>{'{salonName}'}</code> as placeholders</div>
                </div>
                <div style={{ padding:'14px 16px' }}>
                  <textarea value={customMsg} onChange={e=>setCustomMsg(e.target.value)} rows={8} placeholder="Type your message here…" style={{ width:'100%', padding:'10px 12px', borderRadius:9, fontSize:13, border:`1px solid ${C.border}`, background:'white', color:C.ink, outline:'none', resize:'vertical', fontFamily:'inherit', lineHeight:1.6, boxSizing:'border-box' }}
                    onFocus={e=>e.target.style.borderColor=C.teal} onBlur={e=>e.target.style.borderColor=C.border} />
                </div>
              </div>
            </div>

            {/* Right: select branches */}
            <div>
              <div style={{ background:C.cardBg, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden', marginBottom:14 }}>
                <div style={{ padding:'13px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ fontSize:14, fontWeight:600, color:C.ink }}>Select branches</div>
                  <button onClick={()=>setSelBranches(s => s.size===branches.length ? new Set() : new Set(branches.map(b=>b._id)))} style={{ fontSize:12, color:C.teal, background:'none', border:`1px solid ${C.tealBorder}`, borderRadius:7, padding:'3px 9px', cursor:'pointer' }}>
                    {selBranches.size===branches.length?'Deselect all':'Select all'}
                  </button>
                </div>
                <div style={{ padding:'10px 16px', maxHeight:280, overflowY:'auto', display:'flex', flexDirection:'column', gap:7 }}>
                  {branches.map(b => (
                    <div key={b._id} onClick={()=>toggleId(b._id, setSelBranches)}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:9, border:`1px solid ${selBranches.has(b._id)?C.tealBorder:C.border}`, background:selBranches.has(b._id)?C.tealPale:'white', cursor:'pointer', transition:'all 0.15s' }}>
                      <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${selBranches.has(b._id)?C.teal:C.border}`, background:selBranches.has(b._id)?C.teal:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {selBranches.has(b._id) && <Check size={11} color="white" strokeWidth={3}/>}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:500, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.name}</div>
                        <div style={{ fontSize:11, color:C.inkLight }}>{b.admin?.phone||'No phone'}</div>
                      </div>
                      {!b.admin?.phone && <span style={{ fontSize:10, color:C.red, background:C.redPale, padding:'1px 6px', borderRadius:6 }}>No phone</span>}
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleGenerateLinks} disabled={!customMsg.trim()||!selBranches.size||loadingCustom}
                style={{ width:'100%', padding:'11px', borderRadius:10, border:'none', background:customMsg.trim()&&selBranches.size?C.teal:'#ccc', color:'white', fontSize:14, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'background 0.15s' }}>
                {loadingCustom ? <RefreshCw size={15} style={{animation:'spin 1s linear infinite'}}/> : <Zap size={15}/>}
                Generate {selBranches.size||''} WhatsApp link{selBranches.size!==1?'s':''}
              </button>
            </div>
          </div>

          {/* Generated links */}
          {customLinks.length > 0 && (
            <div style={{ marginTop:20 }}>
              <div style={{ fontSize:14, fontWeight:600, color:C.ink, marginBottom:12 }}>Generated links — click each to open WhatsApp</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {customLinks.map(r => (
                  <div key={r.salonId} style={{ background:C.cardBg, borderRadius:10, border:`1px solid ${C.border}`, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:500, color:C.ink }}>{r.salonName}</div>
                      <div style={{ fontSize:12, color:C.inkLight, display:'flex', alignItems:'center', gap:4, marginTop:2 }}>
                        <Phone size={11}/> {r.phone||'No phone'}
                      </div>
                    </div>
                    {r.canSend ? (
                      <WaButton link={r.waLink} />
                    ) : (
                      <span style={{ fontSize:12, color:C.red }}>No phone — cannot send</span>
                    )}
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
