// src/pages/franchise/FranchiseManagers.jsx
// Phase 4 — Manage franchise managers (add/remove/list)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/services/api';
import { Users, Plus, Trash2, RefreshCw, X, Eye, EyeOff } from 'lucide-react';

/* ─── Design Tokens ──────────────────────────────────────────────────────── */
const C = {
  cardBg:'#FDFAF4', ink:'#1A1208', inkMid:'#5C4A2A', inkLight:'#9C8660', border:'#DFD0A8',
  gold:'#B8860B', goldPale:'#FFF8E7',
  teal:'#0F766E', tealLight:'#14B8A6', tealPale:'#F0FDFA', tealBorder:'#99F6E4',
  green:'#15803D', greenPale:'#DCFCE7', greenBorder:'#86EFAC',
  red:'#991B1B', redPale:'#FEF2F2', redBorder:'#FECACA',
  blue:'#1D4ED8', bluePale:'#EFF6FF', blueBorder:'#BFDBFE',
};

const AV_COLORS = [C.teal, C.gold, C.blue, C.green];
const avColor = (n='') => AV_COLORS[n.charCodeAt(0)%AV_COLORS.length];

const Inp = ({ label, ...p }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
    {label && <label style={{ fontSize:12, fontWeight:500, color:C.inkMid }}>{label}</label>}
    <input {...p} style={{ padding:'9px 12px', borderRadius:9, fontSize:13, border:`1px solid ${C.border}`, background:'#fff', color:C.ink, outline:'none', width:'100%', boxSizing:'border-box', ...(p.style||{}) }}
      onFocus={e=>e.target.style.borderColor=C.teal} onBlur={e=>e.target.style.borderColor=C.border} />
  </div>
);

/* ─── Add Manager Modal ──────────────────────────────────────────────────── */
const AddManagerModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({ name:'', email:'', phone:'', password:'' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.phone || !form.password) {
      setError('All fields are required'); return;
    }
    setLoading(true); setError('');
    try {
      await api.post('/franchise/managers', form);
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to add manager');
    } finally { setLoading(false); }
  };

  return (
    <>
      <motion.div style={{ position:'fixed', inset:0, background:'rgba(28,23,18,0.4)', backdropFilter:'blur(4px)', zIndex:50 }}
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose} />
      <motion.div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:Math.min(440,window.innerWidth-32), background:C.cardBg, borderRadius:18, border:`1px solid ${C.border}`, boxShadow:'0 24px 80px rgba(28,23,18,0.15)', zIndex:51, overflow:'hidden' }}
        initial={{opacity:0,scale:0.95,y:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.96,y:10}} transition={{duration:0.22}}>
        {/* Header */}
        <div style={{ padding:'18px 22px 14px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:16, fontWeight:600, color:C.ink }}>Add franchise manager</div>
          <button onClick={onClose} style={{ padding:6, background:'none', border:`1px solid ${C.border}`, borderRadius:8, cursor:'pointer', color:C.inkMid, display:'flex' }}><X size={15}/></button>
        </div>
        {/* Body */}
        <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:14 }}>
          {error && <div style={{ padding:'9px 12px', borderRadius:8, background:C.redPale, border:`1px solid ${C.redBorder}`, fontSize:13, color:C.red }}>{error}</div>}
          <Inp label="Full name"     value={form.name}     onChange={e=>set('name',e.target.value)}     placeholder="e.g. Priya Sharma" />
          <Inp label="Email"         value={form.email}    onChange={e=>set('email',e.target.value)}    placeholder="priya@example.com" type="email" />
          <Inp label="Phone"         value={form.phone}    onChange={e=>set('phone',e.target.value)}    placeholder="10-digit number" type="tel" maxLength={10} />
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <label style={{ fontSize:12, fontWeight:500, color:C.inkMid }}>Password</label>
            <div style={{ position:'relative' }}>
              <input value={form.password} onChange={e=>set('password',e.target.value)} type={showPwd?'text':'password'} placeholder="Min 6 characters"
                style={{ padding:'9px 40px 9px 12px', borderRadius:9, fontSize:13, border:`1px solid ${C.border}`, background:'#fff', color:C.ink, outline:'none', width:'100%', boxSizing:'border-box' }}
                onFocus={e=>e.target.style.borderColor=C.teal} onBlur={e=>e.target.style.borderColor=C.border} />
              <button onClick={()=>setShowPwd(p=>!p)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.inkLight, padding:0, display:'flex' }}>
                {showPwd?<EyeOff size={15}/>:<Eye size={15}/>}
              </button>
            </div>
          </div>
          <div style={{ padding:'10px 12px', borderRadius:8, background:C.tealPale, border:`1px solid ${C.tealBorder}`, fontSize:12, color:C.teal }}>
            The manager will have read-only access to analytics and overview across all branches.
          </div>
        </div>
        {/* Footer */}
        <div style={{ padding:'0 22px 20px', display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:9, border:`1px solid ${C.border}`, background:'white', fontSize:13, color:C.inkMid, cursor:'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading} style={{ flex:2, padding:'10px', borderRadius:9, border:'none', background:C.teal, color:'white', fontSize:13, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {loading ? <RefreshCw size={14} style={{animation:'spin 1s linear infinite'}}/> : <Plus size={14}/>} Add manager
          </button>
        </div>
      </motion.div>
    </>
  );
};

/* ─── Confirm Delete Modal ───────────────────────────────────────────────── */
const ConfirmDelete = ({ manager, onClose, onConfirm }) => (
  <>
    <motion.div style={{ position:'fixed', inset:0, background:'rgba(28,23,18,0.4)', backdropFilter:'blur(4px)', zIndex:50 }}
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose} />
    <motion.div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:Math.min(380,window.innerWidth-32), background:C.cardBg, borderRadius:16, border:`1px solid ${C.border}`, boxShadow:'0 24px 80px rgba(28,23,18,0.15)', zIndex:51, padding:'24px 22px' }}
      initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.96}}>
      <div style={{ fontSize:16, fontWeight:600, color:C.ink, marginBottom:8 }}>Remove manager?</div>
      <div style={{ fontSize:13, color:C.inkMid, marginBottom:20 }}>
        <strong>{manager.name}</strong> will lose access to the franchise dashboard immediately.
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:9, border:`1px solid ${C.border}`, background:'white', fontSize:13, color:C.inkMid, cursor:'pointer' }}>Cancel</button>
        <button onClick={onConfirm} style={{ flex:1, padding:'10px', borderRadius:9, border:'none', background:C.red, color:'white', fontSize:13, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          <Trash2 size={13}/> Remove
        </button>
      </div>
    </motion.div>
  </>
);

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function FranchiseManagers() {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [delTarget, setDelTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/franchise/managers');
      setManagers(res.data.managers || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    try {
      await api.delete(`/franchise/managers/${delTarget._id}`);
      setDelTarget(null);
      load();
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ maxWidth:800 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:600, color:C.ink, margin:0 }}>Franchise managers</h1>
          <p style={{ fontSize:13, color:C.inkLight, margin:'4px 0 0' }}>{managers.length} manager{managers.length!==1?'s':''} · read-only dashboard access</p>
        </div>
        <button onClick={()=>setShowAdd(true)} style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:9, border:'none', background:C.teal, color:'white', fontSize:13, fontWeight:500, cursor:'pointer' }}>
          <Plus size={14}/> Add manager
        </button>
      </div>

      {/* Permissions info */}
      <div style={{ padding:'12px 16px', borderRadius:10, background:C.tealPale, border:`1px solid ${C.tealBorder}`, marginBottom:20, display:'flex', gap:10, alignItems:'flex-start' }}>
        <Users size={15} color={C.teal} style={{ marginTop:1 }} />
        <div style={{ fontSize:13, color:C.teal, lineHeight:1.6 }}>
          Franchise managers can view the <strong>Overview</strong> and <strong>Analytics</strong> pages across all branches. They cannot manage bookings, staff, or send WhatsApp messages.
        </div>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}><RefreshCw size={20} color={C.teal} style={{animation:'spin 1s linear infinite'}}/></div>
      ) : managers.length === 0 ? (
        <div style={{ padding:60, textAlign:'center', background:C.cardBg, borderRadius:14, border:`1px solid ${C.border}` }}>
          <Users size={32} color={C.border} style={{ marginBottom:12 }} />
          <div style={{ fontSize:15, color:C.inkMid, marginBottom:6 }}>No managers yet</div>
          <div style={{ fontSize:13, color:C.inkLight, marginBottom:16 }}>Add a franchise manager to give them read-only access to analytics.</div>
          <button onClick={()=>setShowAdd(true)} style={{ padding:'9px 20px', borderRadius:9, border:'none', background:C.teal, color:'white', fontSize:13, fontWeight:500, cursor:'pointer' }}>Add first manager</button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {managers.map((m, i) => (
            <motion.div key={m._id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
              style={{ background:C.cardBg, borderRadius:12, border:`1px solid ${C.border}`, padding:'14px 18px', display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:42, height:42, borderRadius:11, background:`linear-gradient(135deg, ${avColor(m.name)}40, ${avColor(m.name)}20)`, border:`1px solid ${avColor(m.name)}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:avColor(m.name), flexShrink:0 }}>
                {m.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:600, color:C.ink }}>{m.name}</div>
                <div style={{ fontSize:12, color:C.inkLight, marginTop:2 }}>{m.email} · {m.phone||'—'}</div>
              </div>
              <div style={{ display:'flex', gap:8, flexShrink:0, alignItems:'center' }}>
                <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:10, background:C.tealPale, color:C.teal, border:`1px solid ${C.tealBorder}` }}>
                  Franchise Mgr
                </span>
                <button onClick={()=>setDelTarget(m)} style={{ padding:'6px 10px', borderRadius:8, border:`1px solid ${C.redBorder}`, background:C.redPale, color:C.red, cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:12 }}>
                  <Trash2 size={12}/> Remove
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showAdd && <AddManagerModal onClose={()=>setShowAdd(false)} onSuccess={()=>{setShowAdd(false);load();}} />}
        {delTarget && <ConfirmDelete manager={delTarget} onClose={()=>setDelTarget(null)} onConfirm={handleDelete} />}
      </AnimatePresence>
    </div>
  );
}
