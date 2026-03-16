import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, Phone, Mail, MapPin, Clock, CreditCard,
  Scissors, Users, Tag, Bell, FileText, Shield,
  ChevronRight, Save, Loader2, CheckCircle2, AlertTriangle,
  Eye, EyeOff, ToggleLeft, ToggleRight, Plus, Trash2,
  Percent, DollarSign, Zap, Globe, Hash, Star,
  Settings, RefreshCw, Copy, Check, Info, X,
  ChevronDown, ChevronUp, Package, Award,
} from 'lucide-react';
import api from '@/services/api';

/* ═══════════════════════════════════════════════════════
   DESIGN TOKENS — cream / gold / dark ink (matches system)
   ═══════════════════════════════════════════════════════ */
const C = {
  bg:         '#F8F3EA',
  card:       '#FDFAF4',
  cardHover:  '#FAF5EC',
  cream:      '#F2E8D4',
  creamMid:   '#EDE0C4',
  border:     '#DDD0B0',
  borderMid:  '#C8B888',
  gold:       '#B8860B',
  goldLight:  '#DAA520',
  goldPale:   '#FFF8E0',
  goldDeep:   '#8B6914',
  goldGlow:   'rgba(184,134,11,0.12)',
  ink:        '#1C1208',
  inkMid:     '#4A3018',
  inkLight:   '#8A6840',
  inkGhost:   '#C4A870',
  inkFaint:   '#DDD0B0',
  heroBg:     '#1C1410',
  heroBg2:    '#2D1E10',
  ok:         '#166534',
  okPale:     '#DCFCE7',
  okBorder:   '#86EFAC',
  risk:       '#991B1B',
  riskPale:   '#FEF2F2',
  riskBdr:    '#FECACA',
  warn:       '#92400E',
  warnPale:   '#FEF3DC',
  warnBdr:    '#FDE68A',
  blue:       '#1E40AF',
  bluePale:   '#EFF6FF',
  blueBdr:    '#BFDBFE',
};

const ease = [0.22, 0.61, 0.36, 1];
const fd   = { hidden:{opacity:0,y:10}, show:{opacity:1,y:0,transition:{duration:0.28,ease}} };
const sl   = { hidden:{x:40,opacity:0}, show:{x:0,opacity:1,transition:{type:'spring',damping:28,stiffness:300}} };

/* ── BroadcastChannel — push settings changes to all open tabs instantly ── */
const SETTINGS_CHANNEL = 'glamour_settings_sync';

/* ── Global settings cache — other panels import this ── */
export const SettingsCache = {
  _data: null,
  _listeners: [],
  get: () => SettingsCache._data,
  set: (d) => { SettingsCache._data = d; SettingsCache._listeners.forEach(fn => fn(d)); },
  subscribe: (fn) => { SettingsCache._listeners.push(fn); return () => { SettingsCache._listeners = SettingsCache._listeners.filter(x => x !== fn); }; },
};

/* ── useSettings hook — usable by any panel for live settings ── */
export function useSettings() {
  const [s, setS] = useState(SettingsCache.get());
  useEffect(() => {
    const unsub = SettingsCache.subscribe(setS);
    if (!SettingsCache.get()) {
      api.get('/settings').then(r => {
        SettingsCache.set(r.data.settings);
      }).catch(() => {});
    }
    return unsub;
  }, []);
  return s;
}

/* ── Helpers ─────────────────────────────────────────── */
const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_LABELS = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' };

/* ── Atoms ───────────────────────────────────────────── */
function SectionCard({ icon:Icon, title, subtitle, color=C.gold, children, id, badge }) {
  return (
    <motion.div variants={fd} id={id}
      style={{background:C.card,borderRadius:20,border:`1px solid ${C.border}`,overflow:'hidden',marginBottom:16,boxShadow:`0 2px 12px ${color}08`}}>
      <div style={{padding:'18px 24px',background:`linear-gradient(135deg,${C.cream},${C.creamMid})`,borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:14}}>
        <div style={{width:40,height:40,borderRadius:13,background:`linear-gradient(135deg,${color}20,${color}10)`,border:`1px solid ${color}30`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <Icon size={17} style={{color}}/>
        </div>
        <div style={{flex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <h3 style={{fontSize:15,fontWeight:800,color:C.ink,margin:0,fontFamily:"'Playfair Display',serif"}}>{title}</h3>
            {badge&&<span style={{padding:'2px 8px',borderRadius:100,fontSize:10,fontWeight:700,background:`${color}18`,color,border:`1px solid ${color}28`}}>{badge}</span>}
          </div>
          {subtitle&&<p style={{fontSize:11,color:C.inkLight,marginTop:2}}>{subtitle}</p>}
        </div>
      </div>
      <div style={{padding:'20px 24px'}}>{children}</div>
    </motion.div>
  );
}

function Field({ label, hint, children, half, required }) {
  return (
    <div style={{marginBottom:18,flex:half?'1 1 45%':'1 1 100%'}}>
      <label style={{display:'block',fontSize:11,fontWeight:800,color:C.inkLight,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:7}}>
        {label}{required&&<span style={{color:C.risk,marginLeft:3}}>*</span>}
      </label>
      {children}
      {hint&&<p style={{fontSize:10,color:C.inkGhost,marginTop:4}}>{hint}</p>}
    </div>
  );
}

const inputStyle = (focus=false) => ({
  width:'100%',padding:'10px 14px',borderRadius:11,border:`1.5px solid ${focus?C.gold:C.border}`,
  background:'#fff',fontSize:13,color:C.ink,outline:'none',fontFamily:"'DM Sans',sans-serif",
  boxSizing:'border-box',boxShadow:focus?`0 0 0 3px ${C.gold}18`:'none',transition:'all 0.15s',
});

function Inp({ value, onChange, placeholder, type='text', disabled, style:sx={} }) {
  const [focus,setFocus] = useState(false);
  return (
    <input type={type} value={value||''} onChange={onChange} placeholder={placeholder} disabled={disabled}
      style={{...inputStyle(focus),opacity:disabled?0.55:1,...sx}}
      onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}/>
  );
}

function TextArea({ value, onChange, placeholder, rows=3 }) {
  const [focus,setFocus] = useState(false);
  return (
    <textarea value={value||''} onChange={onChange} placeholder={placeholder} rows={rows}
      style={{...inputStyle(focus),resize:'vertical',lineHeight:1.5}}
      onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}/>
  );
}

function Select({ value, onChange, options }) {
  const [focus,setFocus] = useState(false);
  return (
    <select value={value} onChange={onChange}
      style={{...inputStyle(focus),appearance:'none',backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238A6840' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 12px center'}}
      onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}>
      {options.map(([v,l])=><option key={v} value={v}>{l}</option>)}
    </select>
  );
}

function Toggle({ value, onChange, label, sub, color=C.ok }) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderRadius:12,background:value?`${color}08`:'#fafafa',border:`1px solid ${value?color+'28':C.border}`,marginBottom:10,cursor:'pointer',transition:'all 0.15s'}}
      onClick={()=>onChange(!value)}>
      <div>
        <p style={{fontSize:13,fontWeight:700,color:C.ink,margin:0}}>{label}</p>
        {sub&&<p style={{fontSize:11,color:C.inkLight,margin:'2px 0 0'}}>{sub}</p>}
      </div>
      <div style={{width:46,height:26,borderRadius:100,background:value?color:'#D1D5DB',position:'relative',flexShrink:0,transition:'background 0.2s',boxShadow:value?`0 0 0 3px ${color}20`:'none'}}>
        <div style={{width:20,height:20,borderRadius:'50%',background:'#fff',position:'absolute',top:3,left:value?23:3,transition:'left 0.2s',boxShadow:'0 1px 4px rgba(0,0,0,.18)'}}/>
      </div>
    </div>
  );
}

function SaveBtn({ saving, dirty, onSave }) {
  return (
    <button onClick={onSave} disabled={saving||!dirty}
      style={{display:'flex',alignItems:'center',gap:8,padding:'11px 24px',borderRadius:12,border:'none',cursor:saving||!dirty?'not-allowed':'pointer',background:dirty?`linear-gradient(135deg,${C.goldDeep},${C.goldLight})`:`${C.border}`,color:dirty?'#fff':C.inkGhost,fontSize:13,fontWeight:800,opacity:saving?0.7:1,transition:'all 0.2s',boxShadow:dirty?`0 4px 16px ${C.gold}30`:'none'}}>
      {saving?<Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/>:<Save size={14}/>}
      {saving?'Saving…':'Save Changes'}
    </button>
  );
}

function PasswordInp({ value, onChange, placeholder }) {
  const [show,setShow] = useState(false);
  const [focus,setFocus] = useState(false);
  return (
    <div style={{position:'relative'}}>
      <input type={show?'text':'password'} value={value||''} onChange={onChange} placeholder={placeholder}
        style={{...inputStyle(focus),paddingRight:40}}
        onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}/>
      <button onClick={()=>setShow(v=>!v)} type="button"
        style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:C.inkLight}}>
        {show?<EyeOff size={14}/>:<Eye size={14}/>}
      </button>
    </div>
  );
}

/* ── Toast ───────────────────────────────────────────── */
function Toast({msg,type='ok'}) {
  return (
    <motion.div initial={{opacity:0,y:24,scale:0.92}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:16,scale:0.95}}
      style={{position:'fixed',bottom:28,left:'50%',transform:'translateX(-50%)',zIndex:9000,display:'flex',alignItems:'center',gap:10,padding:'13px 24px',borderRadius:14,background:type==='err'?C.riskPale:C.okPale,border:`1px solid ${type==='err'?C.riskBdr:C.okBorder}`,boxShadow:'0 16px 50px rgba(0,0,0,.12)',whiteSpace:'nowrap'}}>
      {type==='err'?<AlertTriangle size={14} style={{color:C.risk}}/>:<CheckCircle2 size={14} style={{color:C.ok}}/>}
      <span style={{fontSize:13,fontWeight:700,color:type==='err'?C.risk:C.ok}}>{msg}</span>
    </motion.div>
  );
}

/* ── Nav sidebar ─────────────────────────────────────── */
const NAV_SECTIONS = [
  { id:'identity',  icon:Store,       label:'Salon Identity'    },
  { id:'hours',     icon:Clock,       label:'Business Hours'    },
  { id:'booking',   icon:Tag,         label:'Booking Rules'     },
  { id:'payments',  icon:CreditCard,  label:'Payments'          },
  { id:'billing',   icon:FileText,    label:'Billing & Tax'     },
  { id:'loyalty',   icon:Award,       label:'Loyalty & Tiers'   },
  { id:'staff',     icon:Users,       label:'Staff Policies'    },
  { id:'inventory', icon:Package,     label:'Inventory Alerts'  },
  { id:'messages',  icon:Bell,        label:'Message Templates' },
  { id:'security',  icon:Shield,      label:'Security'          },
];

/* ═══════════════════════════════════════════════════════
   DEEP CLONE / SET by path helper
   ═══════════════════════════════════════════════════════ */
function deepSet(obj, path, value) {
  const parts  = path.split('.');
  const result = JSON.parse(JSON.stringify(obj));
  let cur      = result;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
  return result;
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════ */
export default function AdminSettings() {
  const [settings,  setSettings]  = useState(null);
  const [original,  setOriginal]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState(null);
  const [active,    setActive]    = useState('identity');
  const [copied,    setCopied]    = useState('');
  const channelRef  = useRef(null);

  const flash = (msg,type='ok') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  /* ── Load ── */
  const loadSettings = useCallback(async () => {
    try {
      const {data} = await api.get('/settings');
      setSettings(data.settings);
      setOriginal(JSON.stringify(data.settings));
      SettingsCache.set(data.settings);
    } catch { flash('Failed to load settings','err'); }
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{ loadSettings(); },[loadSettings]);

  /* ── BroadcastChannel setup ── */
  useEffect(()=>{
    try {
      channelRef.current = new BroadcastChannel(SETTINGS_CHANNEL);
      channelRef.current.onmessage = () => loadSettings();
    } catch {}
    return ()=>{ try{channelRef.current?.close();}catch{} };
  },[loadSettings]);

  const dirty = settings ? JSON.stringify(settings) !== original : false;

  /* ── Field updater ── */
  const upd = (path, value) => setSettings(prev => deepSet(prev, path, value));
  const set = path => e => upd(path, e.target.type==='checkbox'?e.target.checked:e.target.value);
  const tog = path => val => upd(path, val);

  /* ── Save ── */
  const save = async () => {
    setSaving(true);
    try {
      const {data} = await api.put('/settings', settings);
      setOriginal(JSON.stringify(data.settings));
      setSettings(data.settings);
      SettingsCache.set(data.settings);
      // Broadcast to all open tabs/windows instantly
      try { channelRef.current?.postMessage({type:'updated',ts:Date.now()}); } catch {}
      flash('Settings saved — all panels updated ✓');
    } catch(e) { flash(e.response?.data?.message||'Save failed','err'); }
    finally { setSaving(false); }
  };

  const copyVal = (val, key) => { navigator.clipboard.writeText(val); setCopied(key); setTimeout(()=>setCopied(''),1800); };

  /* ── Scroll to section ── */
  const scrollTo = id => {
    setActive(id);
    document.getElementById('section-'+id)?.scrollIntoView({behavior:'smooth',block:'start'});
  };

  if (loading) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:400,gap:16}}>
      <div style={{width:52,height:52,borderRadius:16,background:`linear-gradient(135deg,${C.goldDeep},${C.goldLight})`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 12px 36px ${C.gold}30`}}>
        <Loader2 size={22} color="#fff" style={{animation:'spin 1s linear infinite'}}/>
      </div>
      <p style={{fontSize:13,color:C.inkLight,fontWeight:600}}>Loading settings…</p>
    </div>
  );

  if (!settings) return null;

  const ws  = settings.weeklySchedule || {};
  const ops = settings.operatingHours  || {};
  const pay = settings.payment         || {};
  const bil = settings.billing         || {};
  const addr= settings.address         || {};

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>

      <div style={{fontFamily:"'DM Sans',sans-serif",maxWidth:1160,margin:'0 auto',paddingBottom:80}}>

        {/* ── HERO ── */}
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.3,ease}}
          style={{borderRadius:22,overflow:'hidden',marginBottom:24,background:`linear-gradient(135deg,${C.heroBg},${C.heroBg2})`,border:'1px solid rgba(184,134,11,.15)',boxShadow:'0 20px 60px rgba(0,0,0,.22)',position:'relative'}}>
          <div style={{position:'absolute',inset:0,backgroundImage:`repeating-linear-gradient(45deg,#B8860B 0,#B8860B 1px,transparent 0,transparent 50%)`,backgroundSize:'20px 20px',opacity:.04}}/>
          <div style={{position:'absolute',top:-80,right:-80,width:320,height:320,borderRadius:'50%',background:'radial-gradient(circle,rgba(184,134,11,.08),transparent 65%)'}}/>
          <div style={{position:'relative',padding:'28px 36px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:20}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:10}}>
                <Settings size={11} style={{color:C.goldLight}}/>
                <span style={{fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.28em',color:C.goldLight}}>Owner Control Panel</span>
              </div>
              <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:34,fontWeight:900,color:'#FAF3E0',margin:0,lineHeight:1.05,letterSpacing:'-0.02em'}}>
                {settings.salonName || 'Salon'} Settings
              </h1>
              <p style={{fontSize:12,color:'rgba(255,255,255,.3)',marginTop:8}}>
                Changes save to MongoDB and sync instantly to all panels, receipts & WhatsApp messages
              </p>
            </div>
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              {dirty && (
                <motion.div initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}}
                  style={{padding:'8px 14px',borderRadius:10,background:'rgba(251,191,36,.12)',border:'1px solid rgba(251,191,36,.25)',fontSize:11,fontWeight:700,color:'#FCD34D',display:'flex',alignItems:'center',gap:6}}>
                  <span style={{width:6,height:6,borderRadius:'50%',background:'#FCD34D',display:'inline-block'}}/>
                  Unsaved changes
                </motion.div>
              )}
              <button onClick={loadSettings}
                style={{width:40,height:40,borderRadius:12,border:'1px solid rgba(255,255,255,.14)',background:'rgba(255,255,255,.07)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <RefreshCw size={14} color="rgba(255,255,255,.5)"/>
              </button>
              <SaveBtn saving={saving} dirty={dirty} onSave={save}/>
            </div>
          </div>

          {/* Quick identity strip */}
          <div style={{padding:'0 36px 20px',display:'flex',gap:24,flexWrap:'wrap'}}>
            {[
              {l:'Salon Name', v:settings.salonName,  k:'name'},
              {l:'Phone',      v:settings.phone,       k:'phone'},
              {l:'GST No.',    v:settings.gstNumber,   k:'gst'},
              {l:'Tax Rate',   v:`${settings.taxRate||18}%`, k:'tax'},
            ].map(({l,v,k})=>(
              <div key={k} style={{padding:'8px 14px',borderRadius:10,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.08)'}}>
                <p style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.28)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:3}}>{l}</p>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <p style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,.8)'}}>{v||'—'}</p>
                  {v&&<button onClick={()=>copyVal(v,k)} style={{background:'none',border:'none',cursor:'pointer',padding:2}}>
                    {copied===k?<Check size={10} color="#86EFAC"/>:<Copy size={10} color="rgba(255,255,255,.25)"/>}
                  </button>}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── LAYOUT: sticky nav + content ── */}
        <div style={{display:'flex',gap:20,alignItems:'flex-start'}}>

          {/* Sticky Nav */}
          <div style={{width:220,flexShrink:0,position:'sticky',top:20}}>
            <div style={{background:C.card,borderRadius:18,border:`1px solid ${C.border}`,overflow:'hidden',boxShadow:`0 4px 20px rgba(0,0,0,.04)`}}>
              {NAV_SECTIONS.map(({id,icon:Icon,label},i)=>(
                <button key={id} onClick={()=>scrollTo(id)}
                  style={{width:'100%',padding:'11px 16px',background:active===id?`linear-gradient(135deg,${C.goldPale},${C.cream})`:'transparent',border:'none',borderBottom:i<NAV_SECTIONS.length-1?`1px solid ${active===id?C.borderMid:C.border}`:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:10,textAlign:'left',transition:'all 0.15s'}}>
                  <div style={{width:30,height:30,borderRadius:9,background:active===id?`${C.gold}18`:`${C.inkGhost}12`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <Icon size={13} style={{color:active===id?C.gold:C.inkLight}}/>
                  </div>
                  <span style={{fontSize:12,fontWeight:active===id?800:600,color:active===id?C.gold:C.inkLight,lineHeight:1.2}}>{label}</span>
                  {active===id&&<ChevronRight size={11} style={{color:C.gold,marginLeft:'auto'}}/>}
                </button>
              ))}
            </div>
            {dirty&&(
              <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} style={{marginTop:12}}>
                <button onClick={save} disabled={saving}
                  style={{width:'100%',padding:'12px',borderRadius:12,border:'none',cursor:'pointer',background:`linear-gradient(135deg,${C.goldDeep},${C.goldLight})`,color:'#fff',fontSize:13,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:`0 6px 20px ${C.gold}30`}}>
                  {saving?<Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/>:<Save size={13}/>}
                  {saving?'Saving…':'Save All Changes'}
                </button>
                <button onClick={()=>{setSettings(JSON.parse(original));}}
                  style={{width:'100%',marginTop:6,padding:'9px',borderRadius:10,border:`1px solid ${C.border}`,background:'transparent',color:C.inkLight,fontSize:12,fontWeight:600,cursor:'pointer'}}>
                  Discard Changes
                </button>
              </motion.div>
            )}
          </div>

          {/* Settings Sections */}
          <div style={{flex:1,minWidth:0}}>
            <motion.div initial="hidden" animate="show" variants={{hidden:{},show:{transition:{staggerChildren:0.05}}}}>

              {/* ── SALON IDENTITY ── */}
              <SectionCard icon={Store} title="Salon Identity" id="section-identity" color={C.gold}
                subtitle="This name appears on receipts, WhatsApp messages and all panels">
                <div style={{display:'flex',flexWrap:'wrap',gap:16}}>
                  <Field label="Salon Name" required half hint="Shown on all receipts & messages">
                    <Inp value={settings.salonName} onChange={set('salonName')} placeholder="e.g. Glamour Salon"/>
                  </Field>
                  <Field label="Tagline" half hint="Shown below name on receipts">
                    <Inp value={settings.tagline} onChange={set('tagline')} placeholder="Premium Salon Experience"/>
                  </Field>
                  <Field label="Primary Phone" half hint="Main number shown on all receipts">
                    <Inp value={settings.phone} onChange={set('phone')} placeholder="+91 98765 43210" type="tel"/>
                  </Field>
                  <Field label="Email Address" half hint="For booking confirmations & reports">
                    <Inp value={settings.email} onChange={set('email')} placeholder="hello@glamour.in" type="email"/>
                  </Field>
                  <Field label="Website / Instagram" half>
                    <Inp value={settings.website} onChange={set('website')} placeholder="https://glamoursalon.in"/>
                  </Field>
                  <Field label="GST Number" half hint="Printed on GST invoices">
                    <div style={{display:'flex',gap:8}}>
                      <Inp value={settings.gstNumber} onChange={set('gstNumber')} placeholder="22AAAAA0000A1Z5"/>
                      {settings.gstNumber&&<button onClick={()=>copyVal(settings.gstNumber,'gst2')} style={{padding:'10px 12px',borderRadius:11,border:`1px solid ${C.border}`,background:'#fff',cursor:'pointer',flexShrink:0}}>
                        {copied==='gst2'?<Check size={13} color={C.ok}/>:<Copy size={13} color={C.inkLight}/>}
                      </button>}
                    </div>
                  </Field>
                </div>

                {/* Multiple Phone Numbers */}
                <Field label="Additional Phone Numbers" hint="All numbers appear on receipts (e.g. WhatsApp line, booking line)">
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {(settings.phoneNumbers||[]).map((ph,idx)=>(
                      <div key={idx} style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:8,alignItems:'center'}}>
                        <Inp value={ph.number||''} onChange={e=>{const arr=[...(settings.phoneNumbers||[])];arr[idx]={...arr[idx],number:e.target.value};upd('phoneNumbers',arr);}} placeholder="98765 43210"/>
                        <Inp value={ph.label||''} onChange={e=>{const arr=[...(settings.phoneNumbers||[])];arr[idx]={...arr[idx],label:e.target.value};upd('phoneNumbers',arr);}} placeholder="Label (e.g. WhatsApp, Booking)"/>
                        <button onClick={()=>{const arr=(settings.phoneNumbers||[]).filter((_,i)=>i!==idx);upd('phoneNumbers',arr);}}
                          style={{width:34,height:38,borderRadius:10,border:`1px solid ${C.riskBdr}`,background:C.riskPale,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <X size={13} color={C.risk}/>
                        </button>
                      </div>
                    ))}
                    <button onClick={()=>upd('phoneNumbers',[...(settings.phoneNumbers||[]),{number:'',label:''}])}
                      style={{display:'flex',alignItems:'center',gap:7,padding:'8px 14px',borderRadius:10,border:`1px dashed ${C.borderMid}`,background:'transparent',color:C.inkLight,fontSize:12,fontWeight:600,cursor:'pointer'}}>
                      <Plus size={12}/>Add Phone Number
                    </button>
                  </div>
                </Field>

                {/* Address */}
                <div style={{marginTop:4,padding:'16px',borderRadius:14,background:C.bg,border:`1px solid ${C.border}`}}>
                  <p style={{fontSize:11,fontWeight:800,color:C.inkLight,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:14,display:'flex',alignItems:'center',gap:7}}>
                    <MapPin size={12} style={{color:C.gold}}/> Salon Address
                  </p>
                  <div style={{display:'flex',flexWrap:'wrap',gap:12}}>
                    <Field label="Street / Area" half>
                      <Inp value={addr.street} onChange={set('address.street')} placeholder="123 MG Road, Banjara Hills"/>
                    </Field>
                    <Field label="City" half>
                      <Inp value={addr.city} onChange={set('address.city')} placeholder="Hyderabad"/>
                    </Field>
                    <Field label="State" half>
                      <Inp value={addr.state} onChange={set('address.state')} placeholder="Telangana"/>
                    </Field>
                    <Field label="Pincode" half>
                      <Inp value={addr.pincode} onChange={set('address.pincode')} placeholder="500034"/>
                    </Field>
                  </div>
                </div>
              </SectionCard>

              {/* ── BUSINESS HOURS ── */}
              <SectionCard icon={Clock} title="Business Hours" id="section-hours" color="#0F766E"
                subtitle="Controls booking availability shown to customers">
                <div style={{display:'flex',flexWrap:'wrap',gap:12,marginBottom:16}}>
                  <Field label="Default Open Time" half>
                    <Inp type="time" value={ops.openTime} onChange={set('operatingHours.openTime')}/>
                  </Field>
                  <Field label="Default Close Time" half>
                    <Inp type="time" value={ops.closeTime} onChange={set('operatingHours.closeTime')}/>
                  </Field>
                  <Field label="Slot Duration" half hint="Minutes per booking slot">
                    <Select value={ops.slotInterval||30} onChange={set('operatingHours.slotInterval')}
                      options={[['15','15 min'],['20','20 min'],['30','30 min'],['45','45 min'],['60','1 hour'],['90','1.5 hours']]}/>
                  </Field>
                  <Field label="Break / Lunch Start" half>
                    <Inp type="time" value={ops.breakStart} onChange={set('operatingHours.breakStart')} placeholder="Optional"/>
                  </Field>
                  <Field label="Break End" half>
                    <Inp type="time" value={ops.breakEnd} onChange={set('operatingHours.breakEnd')} placeholder="Optional"/>
                  </Field>
                </div>

                {/* Weekly schedule */}
                <p style={{fontSize:11,fontWeight:800,color:C.inkLight,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:12}}>Weekly Schedule</p>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {DAYS.map(d=>{
                    const day = ws[d]||{isOpen:true,open:'09:00',close:'21:00'};
                    return (
                      <div key={d} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:11,background:day.isOpen?'#fff':C.bg,border:`1px solid ${day.isOpen?C.borderMid:C.border}`,transition:'all 0.15s'}}>
                        <div style={{width:48,flexShrink:0}}>
                          <span style={{fontSize:12,fontWeight:700,color:day.isOpen?C.ink:C.inkGhost}}>{DAY_LABELS[d]}</span>
                        </div>
                        <button onClick={()=>upd(`weeklySchedule.${d}.isOpen`,!day.isOpen)}
                          style={{width:38,height:22,borderRadius:100,border:'none',background:day.isOpen?C.ok:'#D1D5DB',position:'relative',cursor:'pointer',flexShrink:0,transition:'background 0.2s'}}>
                          <div style={{width:16,height:16,borderRadius:'50%',background:'#fff',position:'absolute',top:3,left:day.isOpen?19:3,transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)'}}/>
                        </button>
                        {day.isOpen ? (
                          <>
                            <Inp type="time" value={day.open} onChange={e=>upd(`weeklySchedule.${d}.open`,e.target.value)} style={{width:110,flex:'none'}}/>
                            <span style={{fontSize:12,color:C.inkGhost}}>to</span>
                            <Inp type="time" value={day.close} onChange={e=>upd(`weeklySchedule.${d}.close`,e.target.value)} style={{width:110,flex:'none'}}/>
                          </>
                        ) : (
                          <span style={{fontSize:12,color:C.inkGhost,fontStyle:'italic'}}>Closed</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              {/* ── BOOKING RULES ── */}
              <SectionCard icon={Tag} title="Booking Rules" id="section-booking" color={C.blue}
                subtitle="Controls how customers can book appointments">
                <div style={{display:'flex',flexWrap:'wrap',gap:12,marginBottom:16}}>
                  <Field label="Advance Booking (days)" half hint="How far in advance customers can book">
                    <Inp type="number" value={settings.maxAdvanceBookingDays||30} onChange={set('maxAdvanceBookingDays')} placeholder="30"/>
                  </Field>
                  <Field label="Max Cancellation Hours" half hint="Last-minute cancellation cutoff">
                    <Inp type="number" value={settings.cancellationHours||2} onChange={set('cancellationHours')} placeholder="2"/>
                  </Field>
                  <Field label="Max Bookings per Slot" half hint="Concurrent bookings allowed">
                    <Inp type="number" value={settings.maxBookingsPerSlot||1} onChange={set('maxBookingsPerSlot')} placeholder="1"/>
                  </Field>
                  <Field label="Booking Confirmation" half>
                    <Select value={settings.bookingConfirmMode||'auto'} onChange={set('bookingConfirmMode')}
                      options={[['auto','Auto Confirm'],['manual','Manual Approval']]}/>
                  </Field>
                </div>
                <Toggle value={settings.walkInEnabled!==false} onChange={tog('walkInEnabled')} label="Allow Walk-in Bookings" sub="Receptionist can add walk-in customers"/>
                <Toggle value={settings.onlineBookingEnabled!==false} onChange={tog('onlineBookingEnabled')} label="Online Booking Enabled" sub="Customers can book via app/website"/>
                <Toggle value={settings.requirePhoneVerify||false} onChange={tog('requirePhoneVerify')} label="Require Phone Verification" sub="OTP before booking confirmation"/>
              </SectionCard>

              {/* ── PAYMENTS ── */}
              <SectionCard icon={CreditCard} title="Payments & Gateway" id="section-payments" color={C.gold}
                badge="Secure">
                <div style={{marginBottom:16}}>
                  <p style={{fontSize:11,fontWeight:800,color:C.inkLight,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:12}}>Accepted Methods</p>
                  <Toggle value={pay.acceptCash!==false} onChange={v=>upd('payment.acceptCash',v)} label="Cash" sub="Accept cash payments at counter" color={C.ok}/>
                  <Toggle value={pay.acceptUPI!==false}  onChange={v=>upd('payment.acceptUPI',v)}  label="UPI" sub="GPay, PhonePe, Paytm etc." color={C.blue}/>
                  <Toggle value={pay.acceptCard!==false} onChange={v=>upd('payment.acceptCard',v)} label="Card" sub="Debit / Credit card" color="#6D28D9}"/>
                </div>
                <Field label="UPI ID / VPA" hint="Shown to customer for manual UPI transfer">
                  <Inp value={settings.upiId} onChange={set('upiId')} placeholder="glamour@paytm"/>
                </Field>
                <div style={{padding:'14px 16px',borderRadius:14,background:C.bg,border:`1px solid ${C.border}`,marginTop:8}}>
                  <p style={{fontSize:11,fontWeight:800,color:C.inkLight,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:14,display:'flex',alignItems:'center',gap:7}}>
                    <Globe size={12} style={{color:C.gold}}/> Razorpay Online Gateway
                  </p>
                  <Toggle value={pay.razorpayEnabled||false} onChange={v=>upd('payment.razorpayEnabled',v)} label="Enable Razorpay" sub="Online payment via card/UPI/netbanking"/>
                  {pay.razorpayEnabled && (
                    <div style={{marginTop:12,display:'flex',flexWrap:'wrap',gap:12}}>
                      <Field label="Key ID" half>
                        <Inp value={pay.razorpayKeyId} onChange={e=>upd('payment.razorpayKeyId',e.target.value)} placeholder="rzp_live_…"/>
                      </Field>
                      <Field label="Key Secret" half hint="Stored encrypted — shown as ••••">
                        <PasswordInp value={pay.razorpayKeySecret} onChange={e=>upd('payment.razorpayKeySecret',e.target.value)} placeholder="Enter secret…"/>
                      </Field>
                    </div>
                  )}
                </div>
                <Toggle value={pay.payAtSalonEnabled!==false} onChange={v=>upd('payment.payAtSalonEnabled',v)} label="Pay at Salon Option" sub="Allow 'Pay later at salon' for online bookings" color={C.warn}/>
              </SectionCard>

              {/* ── BILLING & TAX ── */}
              <SectionCard icon={FileText} title="Billing & Tax" id="section-billing" color="#0F766E"
                subtitle="Controls receipts, invoices, discounts and GST">
                <div style={{display:'flex',flexWrap:'wrap',gap:12,marginBottom:16}}>
                  <Field label="Tax Rate (%)" half hint="Applied to all services unless overridden">
                    <Inp type="number" value={settings.taxRate||18} onChange={set('taxRate')} placeholder="18" min="0" max="30"/>
                  </Field>
                  <Field label="GST Number" half hint="Printed on tax invoices">
                    <Inp value={settings.gstNumber} onChange={set('gstNumber')} placeholder="22AAAAA0000A1Z5"/>
                  </Field>
                  <Field label="Max Discount (%)" half hint="Receptionist cannot exceed this discount">
                    <Inp type="number" value={bil.maxDiscountPercent||10} onChange={e=>upd('billing.maxDiscountPercent',Number(e.target.value))} placeholder="10" min="0" max="100"/>
                  </Field>
                  <Field label="Loyalty Points per ₹100" half hint="Points earned per ₹100 spent">
                    <Inp type="number" value={bil.loyaltyPointsPerRupee||1} onChange={e=>upd('billing.loyaltyPointsPerRupee',Number(e.target.value))} placeholder="1"/>
                  </Field>
                </div>
                <Toggle value={bil.allowStaffDiscount!==false} onChange={v=>upd('billing.allowStaffDiscount',v)} label="Allow Staff Discounts" sub="Staff can apply manual discount during payment" color={C.warn}/>
                <Toggle value={settings.showGSTOnReceipt!==false} onChange={tog('showGSTOnReceipt')} label="Show GST on Receipt" sub="Display tax breakdown on printed receipts"/>
                <Toggle value={settings.printReceiptAuto||false} onChange={tog('printReceiptAuto')} label="Auto Print Receipt" sub="Trigger print dialog after every payment"/>

                {/* Receipt custom text */}
                <div style={{marginTop:14}}>
                  <Field label="Receipt Header Note" hint="Appears at top of every receipt (e.g. Thank you for visiting!)">
                    <TextArea value={settings.receiptHeader} onChange={set('receiptHeader')} placeholder="Welcome to Glamour Salon — Your beauty is our priority" rows={2}/>
                  </Field>
                  <Field label="Receipt Footer Note" hint="Appears at bottom — refund policy, social handles etc.">
                    <TextArea value={settings.receiptFooter} onChange={set('receiptFooter')} placeholder="Follow us @glamoursalon · No refunds after service" rows={2}/>
                  </Field>
                </div>
              </SectionCard>

              {/* ── LOYALTY & TIERS ── */}
              <SectionCard icon={Award} title="Loyalty & Customer Tiers" id="section-loyalty" color="#6D28D9"
                subtitle="Thresholds shown as tier badges on customer cards and receipts">
                <div style={{display:'flex',flexWrap:'wrap',gap:12}}>
                  {[
                    {tier:'Bronze', key:'bronzeThreshold', default:0,     color:'#CD7F32', emoji:'🥉'},
                    {tier:'Silver', key:'silverThreshold', default:5000,  color:'#A8A9AD', emoji:'🥈'},
                    {tier:'Gold',   key:'goldThreshold',   default:15000, color:C.gold,    emoji:'🥇'},
                    {tier:'Platinum',key:'platinumThreshold',default:50000,color:'#A8D8EA',emoji:'💎'},
                  ].map(({tier,key,default:def,color,emoji})=>(
                    <Field key={key} label={`${emoji} ${tier} Tier — Min Spend (₹)`} half>
                      <Inp type="number" value={settings[key]||def} onChange={e=>upd(key,Number(e.target.value))} placeholder={String(def)}/>
                    </Field>
                  ))}
                </div>
                <div style={{padding:'12px 16px',borderRadius:12,background:C.goldPale,border:`1px solid ${C.border}`,fontSize:11,color:C.inkLight,display:'flex',alignItems:'flex-start',gap:8,marginTop:4}}>
                  <Info size={12} style={{color:C.gold,flexShrink:0,marginTop:1}}/>
                  <span>Customers auto-upgrade tiers based on lifetime spend. Tier badge shows on their profile, receipts and WhatsApp confirmation messages.</span>
                </div>
              </SectionCard>

              {/* ── STAFF POLICIES ── */}
              <SectionCard icon={Users} title="Staff Policies" id="section-staff" color={C.ink}
                subtitle="Attendance rules, commission and access defaults">
                <div style={{display:'flex',flexWrap:'wrap',gap:12,marginBottom:16}}>
                  <Field label="Default Commission (%)" half hint="Staff commission on services (can be per-staff)">
                    <Inp type="number" value={settings.defaultCommission||20} onChange={set('defaultCommission')} placeholder="20" min="0" max="100"/>
                  </Field>
                  <Field label="Attendance Late Threshold (min)" half hint="Minutes late before marked late">
                    <Inp type="number" value={settings.lateThresholdMins||15} onChange={set('lateThresholdMins')} placeholder="15"/>
                  </Field>
                  <Field label="Working Days per Month" half hint="For attendance % calculation">
                    <Inp type="number" value={settings.workingDaysPerMonth||26} onChange={set('workingDaysPerMonth')} placeholder="26"/>
                  </Field>
                  <Field label="Advance Limit per Staff (₹)" half hint="Max advance salary per month">
                    <Inp type="number" value={settings.maxAdvancePerStaff||5000} onChange={set('maxAdvancePerStaff')} placeholder="5000"/>
                  </Field>
                </div>
                <Toggle value={settings.staffCanViewOtherBookings||false} onChange={tog('staffCanViewOtherBookings')} label="Staff Can See All Bookings" sub="If off, staff only sees their own appointments"/>
                <Toggle value={settings.staffCanEditProfile||false} onChange={tog('staffCanEditProfile')} label="Staff Can Edit Own Profile" sub="Allow staff to update photo and bio"/>
              </SectionCard>

              {/* ── INVENTORY ── */}
              <SectionCard icon={Package} title="Inventory Alerts" id="section-inventory" color={C.warn}
                subtitle="Low stock thresholds and reorder rules">
                <div style={{display:'flex',flexWrap:'wrap',gap:12,marginBottom:16}}>
                  <Field label="Low Stock Alert Below (units)" half hint="Triggers warning badge on product">
                    <Inp type="number" value={settings.lowStockThreshold||5} onChange={set('lowStockThreshold')} placeholder="5" min="1"/>
                  </Field>
                  <Field label="Critical Stock Below (units)" half hint="Triggers urgent red alert">
                    <Inp type="number" value={settings.criticalStockThreshold||2} onChange={set('criticalStockThreshold')} placeholder="2" min="1"/>
                  </Field>
                </div>
                <Toggle value={settings.inventoryAlertEnabled!==false} onChange={tog('inventoryAlertEnabled')} label="Inventory Alerts Enabled" sub="Show warnings on dashboard when stock is low" color={C.warn}/>
                <Toggle value={settings.deductStockOnBooking||false} onChange={tog('deductStockOnBooking')} label="Auto-deduct Stock on Booking" sub="Reduce product stock count when service is completed"/>
              </SectionCard>

              {/* ── MESSAGE TEMPLATES ── */}
              <SectionCard icon={Bell} title="WhatsApp & Receipt Templates" id="section-messages" color="#25D366"
                subtitle={`Uses {salonName}, {customerName}, {service}, {amount}, {date}, {refNo} — all auto-filled from settings`}>

                <div style={{padding:'10px 14px',borderRadius:11,background:'#F0FDF4',border:'1px solid #86EFAC',marginBottom:16,fontSize:11,color:C.ok,display:'flex',gap:8,alignItems:'flex-start'}}>
                  <Zap size={12} style={{flexShrink:0,marginTop:1}}/>
                  <span>Variables: <strong>{'{salonName}'}</strong> <strong>{'{customerName}'}</strong> <strong>{'{service}'}</strong> <strong>{'{amount}'}</strong> <strong>{'{date}'}</strong> <strong>{'{time}'}</strong> <strong>{'{refNo}'}</strong> <strong>{'{staffName}'}</strong> — salon name & phone auto-fill from Identity settings above.</span>
                </div>

                {[
                  {key:'msgBookingConfirm', label:'Booking Confirmation', hint:'Sent when booking is confirmed',
                   default:`Hi {customerName}! 🌟 Your appointment at {salonName} is confirmed.\n\n📅 {date} at {time}\n✂️ {service} with {staffName}\n📍 {address}\n🔖 Ref: {refNo}\n\nSee you soon! – {salonName}`},
                  {key:'msgBookingReminder', label:'Appointment Reminder', hint:'Sent 1–2 hours before appointment',
                   default:`Reminder! 🔔 Your {service} appointment at {salonName} is in 1 hour.\n\n⏰ {time} today\n📍 {address}\n\nQuestions? Call {phone}`},
                  {key:'msgPaymentReceipt', label:'Payment Receipt Message', hint:'Sent after payment is recorded',
                   default:`Thank you {customerName}! 🙏\n\nPayment of ₹{amount} received for {service} at {salonName}.\n🔖 Invoice: {refNo}\n\nThank you for choosing us! Follow us for offers. – {salonName}`},
                  {key:'msgCancellation', label:'Cancellation Notice', hint:'Sent when booking is cancelled',
                   default:`Hi {customerName}, your appointment for {service} on {date} at {salonName} has been cancelled.\n\nTo rebook, call {phone}. Sorry for any inconvenience!`},
                ].map(({key,label,hint,default:def})=>(
                  <Field key={key} label={label} hint={hint}>
                    <TextArea value={settings[key]||def} onChange={set(key)} rows={4}/>
                  </Field>
                ))}
              </SectionCard>

              {/* ── SECURITY ── */}
              <SectionCard icon={Shield} title="Security & Access" id="section-security" color={C.risk}
                subtitle="Owner password and panel access controls">
                <div style={{padding:'12px 16px',borderRadius:12,background:C.riskPale,border:`1px solid ${C.riskBdr}`,marginBottom:16,fontSize:11,color:C.risk,display:'flex',gap:8,alignItems:'center'}}>
                  <Shield size={12} style={{flexShrink:0}}/>
                  <span>To change your password, use the Change Password option in your profile menu. These controls affect role-based access for staff and receptionists.</span>
                </div>
                <Toggle value={settings.receptionistCanViewRevenue||false} onChange={tog('receptionistCanViewRevenue')} label="Receptionist Can See Revenue" sub="Show revenue totals on receptionist dashboard" color={C.warn}/>
                <Toggle value={settings.receptionistCanDeleteBookings||false} onChange={tog('receptionistCanDeleteBookings')} label="Receptionist Can Delete Bookings" sub="If off, only admin can cancel/delete bookings" color={C.risk}/>
                <Toggle value={settings.receptionistCanEditPrices||false} onChange={tog('receptionistCanEditPrices')} label="Receptionist Can Edit Service Prices" sub="Allow price override during billing" color={C.risk}/>
                <Toggle value={settings.staffCanSeeCustomerPhone||false} onChange={tog('staffCanSeeCustomerPhone')} label="Staff Can See Customer Phone" sub="Show customer phone number in staff view"/>
                <div style={{marginTop:16,display:'flex',flexWrap:'wrap',gap:12}}>
                  <Field label="Session Timeout (minutes)" half hint="Auto logout after inactivity">
                    <Inp type="number" value={settings.sessionTimeoutMins||60} onChange={set('sessionTimeoutMins')} placeholder="60"/>
                  </Field>
                  <Field label="Admin PIN (4–6 digits)" half hint="Quick-access PIN for owner overrides">
                    <PasswordInp value={settings.adminPIN} onChange={set('adminPIN')} placeholder="Enter PIN…"/>
                  </Field>
                </div>
              </SectionCard>

            </motion.div>

            {/* Bottom save bar */}
            <AnimatePresence>
              {dirty && (
                <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:16}}
                  style={{position:'sticky',bottom:20,background:'rgba(253,250,244,0.95)',backdropFilter:'blur(12px)',padding:'14px 20px',borderRadius:16,border:`1px solid ${C.borderMid}`,boxShadow:`0 12px 40px rgba(0,0,0,.14)`,display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:C.goldLight,animation:'pulseDot 2s ease-in-out infinite'}}/>
                    <p style={{fontSize:13,fontWeight:600,color:C.inkMid,margin:0}}>You have unsaved changes</p>
                    <p style={{fontSize:11,color:C.inkGhost,margin:0}}>Changes sync to all panels after save</p>
                  </div>
                  <div style={{display:'flex',gap:10}}>
                    <button onClick={()=>setSettings(JSON.parse(original))}
                      style={{padding:'9px 18px',borderRadius:10,border:`1px solid ${C.border}`,background:'transparent',color:C.inkMid,fontSize:13,fontWeight:600,cursor:'pointer'}}>
                      Discard
                    </button>
                    <SaveBtn saving={saving} dirty={dirty} onSave={save}/>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>{toast&&<Toast msg={toast.msg} type={toast.type}/>}</AnimatePresence>

      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.4)}}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.border};border-radius:100px}
      `}</style>
    </>
  );
}