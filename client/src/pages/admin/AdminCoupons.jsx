import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag, Plus, X, Search, Copy, Check, Trash2,
  ToggleLeft, ToggleRight, Edit3, Loader2,
  Download, Printer, AlertTriangle, CheckCircle2,
  Percent, Hash, Calendar, Zap, Clock, TrendingUp,
  FileText, Filter, ChevronDown, RefreshCw,
} from 'lucide-react';
import api from '@/services/api';

/* ═══════════════════════════════════════════════════════
   DESIGN TOKENS — luxury editorial, dark ink + saffron
   ═══════════════════════════════════════════════════════ */
const C = {
  bg:        '#F8F3EA',
  card:      '#FDFAF4',
  cardDark:  '#F2EAD8',
  ink:       '#1A1208',
  inkMid:    '#4A3520',
  inkLight:  '#8A7050',
  inkGhost:  '#C4A878',
  border:    '#DDD0B0',
  borderMid: '#C8B888',
  gold:      '#C49A28',
  goldLight: '#E0B840',
  goldPale:  '#FFF8E0',
  goldDeep:  '#8B6914',
  heroBg:    '#0F0C07',
  heroBg2:   '#1E1608',
  green:     '#166534',
  greenPale: '#DCFCE7',
  greenBdr:  '#86EFAC',
  red:       '#991B1B',
  redPale:   '#FEF2F2',
  redBdr:    '#FECACA',
  amber:     '#92400E',
  amberPale: '#FFFBEB',
  amberBdr:  '#FDE68A',
  blue:      '#1E40AF',
  bluePale:  '#EFF6FF',
  blueBdr:   '#BFDBFE',
};

const ease = [0.22, 0.61, 0.36, 1];
const fd   = { hidden:{opacity:0,y:12}, show:{opacity:1,y:0,transition:{duration:0.3,ease}} };
const sl   = { hidden:{x:60,opacity:0}, show:{x:0,opacity:1,transition:{type:'spring',damping:26,stiffness:280}} };
const stag = (d=0.04) => ({ hidden:{}, show:{transition:{staggerChildren:d}} });

const Rs    = n => Number(n||0).toLocaleString('en-IN');
const fmtDt = d => { try{ return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }catch{return '—';} };
const initials = n => (n||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
const daysLeft = d => Math.ceil((new Date(d)-Date.now())/(1000*60*60*24));

/* ── Export helpers ─────────────────────────────────── */
function exportCSV(coupons) {
  const rows = coupons.map(c => ({
    Code: c.code,
    Type: c.discountType === 'percentage' ? 'Percentage' : 'Fixed',
    Value: c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`,
    'Min Order': c.minOrderAmount ? `₹${c.minOrderAmount}` : '—',
    'Max Discount': c.maxDiscount ? `₹${c.maxDiscount}` : '—',
    'Valid From': fmtDt(c.validFrom),
    'Valid Until': fmtDt(c.validUntil),
    'Usage Limit': c.usageLimit ?? 'Unlimited',
    'Used Count': c.usedCount,
    Status: !c.isActive ? 'Inactive' : new Date(c.validUntil) < new Date() ? 'Expired' : 'Active',
    Description: c.description || '',
  }));
  const hdr = Object.keys(rows[0]);
  const cell = v => `"${String(v).replace(/"/g,'""')}"`;
  const csv = [hdr.join(','), ...rows.map(r => hdr.map(h=>cell(r[h])).join(','))].join('\n');
  const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'})),download:`coupons_${new Date().toISOString().split('T')[0]}.csv`});
  a.click(); URL.revokeObjectURL(a.href);
}

function printReport(coupons, stats) {
  const now = new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});
  const activeC  = coupons.filter(c => c.isActive && new Date(c.validUntil) >= new Date());
  const expiredC = coupons.filter(c => new Date(c.validUntil) < new Date());
  const rows = coupons.map(c => {
    const status = !c.isActive ? 'Inactive' : new Date(c.validUntil)<new Date() ? 'Expired' : 'Active';
    const sColor = status==='Active'?'#166534':status==='Expired'?'#991B1B':'#92400E';
    return `<tr>
      <td style="font-weight:700;font-family:monospace;font-size:12px;color:#0F0C07">${c.code}</td>
      <td>${c.discountType==='percentage'?`${c.discountValue}%`:`₹${Rs(c.discountValue)}`}</td>
      <td>${c.minOrderAmount?`₹${Rs(c.minOrderAmount)}`:'—'}</td>
      <td>${fmtDt(c.validUntil)}</td>
      <td>${c.usedCount}${c.usageLimit?` / ${c.usageLimit}`:' / ∞'}</td>
      <td><span style="color:${sColor};font-weight:700;font-size:11px">${status}</span></td>
      <td style="font-size:11px;color:#8A7050">${c.description||'—'}</td>
    </tr>`;
  }).join('');
  const w = window.open('','_blank','width=900,height=700');
  w.document.write(`<!DOCTYPE html><html><head><title>Coupon Report — Glamour Salon</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',sans-serif;background:#F8F3EA;padding:32px;color:#1A1208}
    .card{background:#fff;border-radius:16px;padding:24px;margin-bottom:20px;border:1px solid #DDD0B0}
    h1{font-family:'Playfair Display',serif;font-size:28px;color:#1A1208;margin-bottom:4px}
    .sub{font-size:12px;color:#8A7050;margin-bottom:24px}
    .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
    .stat{background:#FFF8E0;border:1px solid #DDD0B0;border-radius:12px;padding:14px 16px;text-align:center}
    .stat-val{font-family:'Playfair Display',serif;font-size:26px;font-weight:800;color:#C49A28}
    .stat-lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#8A7050;margin-top:3px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th{background:#1A1208;color:#FFF8E0;padding:10px 12px;text-align:left;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.08em}
    td{padding:10px 12px;border-bottom:1px solid #EDE0C0}
    tr:nth-child(even) td{background:#FBF7EF}
    .ftr{text-align:center;font-size:11px;color:#8A7050;margin-top:20px}
    .btn{display:block;margin:16px auto 0;padding:10px 24px;background:#C49A28;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif}
    @media print{.btn{display:none}body{background:#fff;padding:20px}}
  </style></head><body>
  <div class="card">
    <h1>✂ Glamour Salon — Coupon Report</h1>
    <p class="sub">Generated on ${now} · ${coupons.length} total coupons</p>
    <div class="stats">
      <div class="stat"><div class="stat-val">${coupons.length}</div><div class="stat-lbl">Total</div></div>
      <div class="stat"><div class="stat-val" style="color:#166534">${activeC.length}</div><div class="stat-lbl">Active</div></div>
      <div class="stat"><div class="stat-val" style="color:#991B1B">${expiredC.length}</div><div class="stat-lbl">Expired</div></div>
      <div class="stat"><div class="stat-val">${coupons.reduce((s,c)=>s+c.usedCount,0)}</div><div class="stat-lbl">Total Used</div></div>
    </div>
    <table>
      <thead><tr><th>Code</th><th>Discount</th><th>Min Order</th><th>Expires</th><th>Usage</th><th>Status</th><th>Description</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <p class="ftr">Glamour Salon · Internal Report · Confidential</p>
  <button class="btn" onclick="window.print()">🖨 Print Report</button>
  </body></html>`);
  w.document.close();
}

/* ── Atoms ───────────────────────────────────────────── */
const Inp = ({label,type='text',value,onChange,placeholder,min,max,step,required,hint,style}) => (
  <div style={{marginBottom:16}}>
    {label && <label style={{display:'block',fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.1em',color:C.inkLight,marginBottom:7}}>{label}{required&&<span style={{color:C.red,marginLeft:3}}>*</span>}</label>}
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} min={min} max={max} step={step}
      style={{width:'100%',padding:'10px 14px',borderRadius:10,border:`1.5px solid ${C.border}`,background:'#fff',fontSize:13,color:C.ink,outline:'none',fontFamily:"'DM Sans',sans-serif",boxSizing:'border-box',...style}}
      onFocus={e=>{e.target.style.borderColor=C.gold;e.target.style.boxShadow=`0 0 0 3px ${C.gold}20`;}}
      onBlur={e=>{e.target.style.borderColor=C.border;e.target.style.boxShadow='none';}}/>
    {hint && <p style={{fontSize:10,color:C.inkGhost,marginTop:4}}>{hint}</p>}
  </div>
);

const Toast = ({msg,type='ok'}) => (
  <motion.div initial={{opacity:0,y:24,scale:0.92}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:16}}
    style={{position:'fixed',bottom:28,left:'50%',transform:'translateX(-50%)',zIndex:9000,display:'flex',alignItems:'center',gap:10,padding:'12px 22px',borderRadius:14,background:type==='err'?C.redPale:C.greenPale,border:`1px solid ${type==='err'?C.redBdr:C.greenBdr}`,boxShadow:'0 16px 50px rgba(0,0,0,.14)',minWidth:220}}>
    {type==='err'?<AlertTriangle size={14} style={{color:C.red}}/>:<CheckCircle2 size={14} style={{color:C.green}}/>}
    <span style={{fontSize:13,fontWeight:700,color:type==='err'?C.red:C.green}}>{msg}</span>
  </motion.div>
);

/* ── Status pill ─────────────────────────────────────── */
function CouponStatus({c}) {
  const expired = new Date(c.validUntil) < new Date();
  const dl      = daysLeft(c.validUntil);
  if (!c.isActive) return <span style={{padding:'3px 9px',borderRadius:100,fontSize:10,fontWeight:800,background:C.amberPale,color:C.amber,border:`1px solid ${C.amberBdr}`}}>Inactive</span>;
  if (expired)     return <span style={{padding:'3px 9px',borderRadius:100,fontSize:10,fontWeight:800,background:C.redPale,color:C.red,border:`1px solid ${C.redBdr}`}}>Expired</span>;
  if (dl <= 3)     return <span style={{padding:'3px 9px',borderRadius:100,fontSize:10,fontWeight:800,background:C.amberPale,color:C.amber,border:`1px solid ${C.amberBdr}`}}>Expires in {dl}d</span>;
  return             <span style={{padding:'3px 9px',borderRadius:100,fontSize:10,fontWeight:800,background:C.greenPale,color:C.green,border:`1px solid ${C.greenBdr}`}}>● Active</span>;
}

/* ── Coupon Card ─────────────────────────────────────── */
function CouponCard({c, onEdit, onDelete, onToggle, onCopy, copied}) {
  const expired  = new Date(c.validUntil) < new Date();
  const usePct   = c.usageLimit ? Math.round(c.usedCount/c.usageLimit*100) : null;
  const accentColor = expired||!c.isActive ? C.inkGhost : C.gold;

  return (
    <motion.div variants={fd} whileHover={{y:-3,boxShadow:`0 16px 48px rgba(196,154,40,0.14)`}}
      style={{background:C.card,border:`1.5px solid ${expired||!c.isActive?C.border:C.borderMid}`,borderRadius:18,overflow:'hidden',transition:'box-shadow 0.2s',position:'relative'}}>

      {/* top color strip */}
      <div style={{height:4,background:expired||!c.isActive?`${C.inkGhost}40`:`linear-gradient(90deg,${C.goldDeep},${C.goldLight})`}}/>

      <div style={{padding:'18px 20px'}}>
        {/* Header row */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
              <span style={{fontFamily:'monospace',fontSize:18,fontWeight:900,color:C.ink,letterSpacing:'0.08em'}}>{c.code}</span>
              <button onClick={()=>onCopy(c.code)} style={{background:'none',border:'none',cursor:'pointer',padding:'2px 4px',borderRadius:5,opacity:0.6}}
                onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='0.6'}>
                {copied===c.code?<Check size={13} style={{color:C.green}}/>:<Copy size={13} style={{color:C.inkLight}}/>}
              </button>
            </div>
            <CouponStatus c={c}/>
          </div>
          {/* Discount badge */}
          <div style={{textAlign:'center',padding:'8px 14px',borderRadius:12,background:expired||!c.isActive?C.cardDark:`linear-gradient(135deg,${C.goldDeep},${C.goldLight})`,minWidth:64}}>
            {c.discountType==='percentage'
              ? <><div style={{fontSize:22,fontWeight:900,color:expired||!c.isActive?C.inkLight:'#fff',lineHeight:1,fontFamily:"'Playfair Display',serif"}}>{c.discountValue}%</div><div style={{fontSize:9,fontWeight:700,color:expired||!c.isActive?C.inkGhost:'rgba(255,255,255,.7)',textTransform:'uppercase',letterSpacing:'0.05em',marginTop:1}}>off</div></>
              : <><div style={{fontSize:22,fontWeight:900,color:expired||!c.isActive?C.inkLight:'#fff',lineHeight:1,fontFamily:"'Playfair Display',serif"}}>₹{c.discountValue}</div><div style={{fontSize:9,fontWeight:700,color:expired||!c.isActive?C.inkGhost:'rgba(255,255,255,.7)',textTransform:'uppercase',letterSpacing:'0.05em',marginTop:1}}>flat</div></>}
          </div>
        </div>

        {/* Description */}
        {c.description && <p style={{fontSize:12,color:C.inkLight,marginBottom:12,lineHeight:1.4}}>{c.description}</p>}

        {/* Meta grid */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
          {[
            {icon:Calendar,label:'Expires',val:fmtDt(c.validUntil)},
            {icon:Zap,label:'Min Order',val:c.minOrderAmount?`₹${Rs(c.minOrderAmount)}`:'Any amount'},
            {icon:Hash,label:'Usage',val:c.usageLimit?`${c.usedCount} / ${c.usageLimit}`:`${c.usedCount} used`},
            {icon:Percent,label:'Max Discount',val:c.maxDiscount?`₹${Rs(c.maxDiscount)}`:'No limit'},
          ].map(({icon:Icon,label,val})=>(
            <div key={label} style={{display:'flex',alignItems:'center',gap:7,padding:'7px 10px',borderRadius:9,background:C.bg,border:`1px solid ${C.border}`}}>
              <Icon size={11} style={{color:accentColor,flexShrink:0}}/>
              <div style={{minWidth:0}}>
                <div style={{fontSize:9,fontWeight:700,color:C.inkGhost,textTransform:'uppercase',letterSpacing:'0.06em'}}>{label}</div>
                <div style={{fontSize:11,fontWeight:700,color:C.inkMid,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Usage progress */}
        {usePct !== null && (
          <div style={{marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
              <span style={{fontSize:10,fontWeight:700,color:C.inkGhost}}>Usage</span>
              <span style={{fontSize:10,fontWeight:800,color:accentColor}}>{usePct}%</span>
            </div>
            <div style={{height:4,borderRadius:100,background:`${C.inkGhost}30`,overflow:'hidden'}}>
              <motion.div initial={{width:0}} animate={{width:`${usePct}%`}} transition={{duration:0.8,ease:'easeOut'}}
                style={{height:'100%',borderRadius:100,background:usePct>80?C.red:usePct>50?C.amber:C.gold}}/>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{display:'flex',gap:7,borderTop:`1px solid ${C.border}`,paddingTop:14,flexWrap:'wrap'}}>
          <button onClick={()=>onEdit(c)}
            style={{display:'flex',alignItems:'center',gap:5,padding:'7px 13px',borderRadius:9,border:`1px solid ${C.border}`,background:'transparent',color:C.inkMid,fontSize:11,fontWeight:700,cursor:'pointer',flex:1}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=C.gold} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <Edit3 size={11}/> Edit
          </button>
          <button onClick={()=>onToggle(c)}
            style={{display:'flex',alignItems:'center',gap:5,padding:'7px 13px',borderRadius:9,border:`1px solid ${c.isActive?C.amberBdr:C.greenBdr}`,background:c.isActive?C.amberPale:C.greenPale,color:c.isActive?C.amber:C.green,fontSize:11,fontWeight:700,cursor:'pointer',flex:1}}>
            {c.isActive?<ToggleLeft size={11}/>:<ToggleRight size={11}/>}
            {c.isActive?'Disable':'Enable'}
          </button>
          <button onClick={()=>onDelete(c._id)}
            style={{display:'flex',alignItems:'center',gap:5,padding:'7px 11px',borderRadius:9,border:`1px solid ${C.redBdr}`,background:C.redPale,color:C.red,fontSize:11,fontWeight:700,cursor:'pointer'}}
            onMouseEnter={e=>e.currentTarget.style.background='#FCA5A5'} onMouseLeave={e=>e.currentTarget.style.background=C.redPale}>
            <Trash2 size={11}/>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Form drawer ─────────────────────────────────────── */
const BLANK = { code:'', description:'', discountType:'percentage', discountValue:'', minOrderAmount:'', maxDiscount:'', validFrom:new Date().toISOString().split('T')[0], validUntil:'', usageLimit:'', isActive:true };

function CouponDrawer({editData, onClose, onSaved, onFlash}) {
  const [form, setForm] = useState(editData || BLANK);
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const submit = async () => {
    if (!form.code || !form.discountValue || !form.validUntil) { onFlash('Fill required fields','err'); return; }
    setSaving(true);
    try {
      const body = { ...form, code: form.code.toUpperCase().trim(), discountValue: Number(form.discountValue),
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : 0,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null };
      if (editData?._id) await api.put(`/coupons/${editData._id}`, body);
      else await api.post('/coupons', body);
      onSaved(); onClose(); onFlash(editData ? 'Coupon updated' : 'Coupon created ✓');
    } catch(e) { onFlash(e.response?.data?.message||'Failed','err'); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{position:'fixed',inset:0,zIndex:800,background:'rgba(15,12,7,0.65)',backdropFilter:'blur(10px)',display:'flex',justifyContent:'flex-end'}}>
      <motion.div variants={sl} initial="hidden" animate="show" exit="hidden"
        style={{width:'100%',maxWidth:460,height:'100%',background:C.card,borderLeft:`1px solid ${C.border}`,display:'flex',flexDirection:'column',boxShadow:'-24px 0 80px rgba(0,0,0,.18)'}}>

        {/* Header */}
        <div style={{padding:'22px 24px',borderBottom:`1px solid ${C.border}`,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:800,color:C.ink,margin:0}}>{editData?'Edit Coupon':'Create Coupon'}</h2>
            <p style={{fontSize:11,color:C.inkLight,marginTop:3}}>{editData?`Editing ${editData.code}`:'New discount code'}</p>
          </div>
          <button onClick={onClose} style={{width:34,height:34,borderRadius:10,border:`1px solid ${C.border}`,background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={15} style={{color:C.inkLight}}/></button>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'22px 24px'}}>
          <Inp label="Coupon Code" value={form.code} onChange={set('code')} placeholder="e.g. SAVE20" required hint="Will be uppercased automatically"/>
          <Inp label="Description" value={form.description} onChange={set('description')} placeholder="e.g. 20% off all services"/>

          {/* Discount type toggle */}
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.1em',color:C.inkLight,marginBottom:7}}>Discount Type</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[['percentage','% Percentage'],['fixed','₹ Fixed Amount']].map(([v,l])=>(
                <button key={v} onClick={()=>setForm(f=>({...f,discountType:v}))}
                  style={{padding:'10px',borderRadius:10,cursor:'pointer',fontWeight:700,fontSize:12,border:`1.5px solid ${form.discountType===v?C.gold:C.border}`,background:form.discountType===v?C.goldPale:'transparent',color:form.discountType===v?C.goldDeep:C.inkLight}}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Inp label={form.discountType==='percentage'?'Discount %':'Discount ₹'} type="number" value={form.discountValue} onChange={set('discountValue')} placeholder="0" min="0" required/>
            <Inp label="Min Order (₹)" type="number" value={form.minOrderAmount} onChange={set('minOrderAmount')} placeholder="0 = any"/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Inp label="Max Discount (₹)" type="number" value={form.maxDiscount} onChange={set('maxDiscount')} placeholder="blank = no cap" hint="Only for % type"/>
            <Inp label="Usage Limit" type="number" value={form.usageLimit} onChange={set('usageLimit')} placeholder="blank = unlimited"/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Inp label="Valid From" type="date" value={form.validFrom} onChange={set('validFrom')} required/>
            <Inp label="Valid Until" type="date" value={form.validUntil} onChange={set('validUntil')} required/>
          </div>

          {/* Active toggle */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',borderRadius:12,background:C.bg,border:`1px solid ${C.border}`}}>
            <div>
              <p style={{fontSize:13,fontWeight:700,color:C.ink}}>Active</p>
              <p style={{fontSize:11,color:C.inkLight}}>Customers can use this coupon</p>
            </div>
            <button onClick={()=>setForm(f=>({...f,isActive:!f.isActive}))}
              style={{width:44,height:24,borderRadius:100,border:'none',cursor:'pointer',background:form.isActive?C.green:'#D1D5DB',transition:'background 0.2s',position:'relative',flexShrink:0}}>
              <div style={{width:18,height:18,borderRadius:'50%',background:'#fff',position:'absolute',top:3,transition:'left 0.2s',left:form.isActive?23:3}}/>
            </button>
          </div>
        </div>

        <div style={{padding:'16px 24px',borderTop:`1px solid ${C.border}`,display:'flex',gap:10,flexShrink:0}}>
          <button onClick={onClose} style={{flex:1,padding:'12px',borderRadius:12,border:`1px solid ${C.border}`,background:'transparent',color:C.inkMid,fontSize:13,fontWeight:700,cursor:'pointer'}}>Cancel</button>
          <button onClick={submit} disabled={saving}
            style={{flex:2,padding:'12px',borderRadius:12,border:'none',cursor:saving?'not-allowed':'pointer',background:`linear-gradient(135deg,${C.goldDeep},${C.goldLight})`,color:'#fff',fontSize:13,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:saving?0.7:1}}>
            {saving?<Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/>:null}
            {saving?'Saving…':editData?'Save Changes':'Create Coupon'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════ */
export default function AdminCoupons() {
  const [coupons,   setCoupons]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('all'); // all|active|expired|inactive
  const [drawer,    setDrawer]    = useState(null);  // null|'create'|coupon object
  const [toast,     setToast]     = useState(null);
  const [copied,    setCopied]    = useState('');
  const [exMenu,    setExMenu]    = useState(false);

  const flash = (msg,type='ok') => { setToast({msg,type}); setTimeout(()=>setToast(null),2800); };

  const load = useCallback(async () => {
    setLoading(true);
    try { const {data} = await api.get('/coupons'); setCoupons(data.coupons||[]); }
    catch { flash('Failed to load coupons','err'); }
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{ load(); },[load]);

  const handleCopy = code => { navigator.clipboard.writeText(code); setCopied(code); setTimeout(()=>setCopied(''),1800); };

  const handleDelete = async id => {
    if (!confirm('Delete this coupon?')) return;
    try { await api.delete(`/coupons/${id}`); setCoupons(c=>c.filter(x=>x._id!==id)); flash('Deleted'); }
    catch { flash('Delete failed','err'); }
  };

  const handleToggle = async c => {
    try {
      const {data} = await api.put(`/coupons/${c._id}`,{isActive:!c.isActive});
      setCoupons(prev=>prev.map(x=>x._id===c._id?data.coupon:x));
      flash(`Coupon ${data.coupon.isActive?'enabled':'disabled'}`);
    } catch { flash('Update failed','err'); }
  };

  const filtered = useMemo(()=>{
    const now = new Date();
    return coupons.filter(c=>{
      const q = search.toLowerCase();
      const mQ = !q || c.code.toLowerCase().includes(q) || (c.description||'').toLowerCase().includes(q);
      const expired = new Date(c.validUntil) < now;
      const mF = filter==='all' || (filter==='active'&&c.isActive&&!expired) || (filter==='expired'&&expired) || (filter==='inactive'&&!c.isActive);
      return mQ && mF;
    });
  },[coupons,search,filter]);

  const stats = useMemo(()=>{
    const now = new Date();
    return {
      total:   coupons.length,
      active:  coupons.filter(c=>c.isActive&&new Date(c.validUntil)>=now).length,
      expired: coupons.filter(c=>new Date(c.validUntil)<now).length,
      used:    coupons.reduce((s,c)=>s+c.usedCount,0),
    };
  },[coupons]);

  const FILTERS = [['all','All'],['active','Active'],['expired','Expired'],['inactive','Inactive']];

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <motion.div variants={stag(0.05)} initial="hidden" animate="show"
        style={{fontFamily:"'DM Sans',sans-serif",maxWidth:1100,margin:'0 auto',paddingBottom:60}}>

        {/* ── HERO ── */}
        <motion.div variants={fd} style={{borderRadius:24,overflow:'hidden',marginBottom:24,position:'relative',background:`linear-gradient(135deg,${C.heroBg},${C.heroBg2})`,border:'1px solid rgba(196,154,40,.18)',boxShadow:'0 20px 60px rgba(0,0,0,.28)'}}>
          <div style={{position:'absolute',inset:0,backgroundImage:`repeating-linear-gradient(45deg,${C.gold} 0,${C.gold} 1px,transparent 0,transparent 50%)`,backgroundSize:'18px 18px',opacity:.04}}/>
          <div style={{position:'absolute',top:-80,right:-80,width:360,height:360,borderRadius:'50%',background:'radial-gradient(circle,rgba(196,154,40,.08),transparent 65%)'}}/>
          <div style={{position:'relative',padding:'30px 36px'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:20,marginBottom:22}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:10}}>
                  <Tag size={12} style={{color:C.goldLight}}/>
                  <span style={{fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.28em',color:C.goldLight}}>Coupon Management</span>
                </div>
                <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:36,fontWeight:900,color:'#FAF3E0',margin:0,lineHeight:1.05,letterSpacing:'-0.02em'}}>Discount Coupons</h1>
                <p style={{fontSize:12,color:'rgba(255,255,255,.3)',marginTop:8}}>{stats.total} coupons · {stats.active} active · {stats.used} total redemptions</p>
              </div>
              <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                {/* Export menu */}
                <div style={{position:'relative'}}>
                  <button onClick={()=>setExMenu(v=>!v)}
                    style={{display:'flex',alignItems:'center',gap:7,padding:'10px 18px',borderRadius:13,border:'1px solid rgba(255,255,255,.14)',background:'rgba(255,255,255,.07)',color:'rgba(255,255,255,.75)',fontSize:12,fontWeight:700,cursor:'pointer',backdropFilter:'blur(6px)'}}>
                    <Download size={13}/> Export <ChevronDown size={11} style={{marginLeft:2,transition:'transform 0.2s',transform:exMenu?'rotate(180deg)':'rotate(0deg)'}}/>
                  </button>
                  <AnimatePresence>
                    {exMenu && (
                      <motion.div initial={{opacity:0,y:-8,scale:0.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-6,scale:0.95}}
                        style={{position:'absolute',top:'calc(100% + 8px)',right:0,background:'#fff',border:`1px solid ${C.border}`,borderRadius:13,padding:6,boxShadow:'0 16px 40px rgba(0,0,0,.14)',zIndex:100,minWidth:180}}>
                        {[
                          {icon:Printer,label:'Print Report',action:()=>{printReport(filtered,stats);setExMenu(false);}},
                          {icon:FileText,label:'Export CSV',action:()=>{exportCSV(filtered);setExMenu(false);}},
                        ].map(({icon:Icon,label,action})=>(
                          <button key={label} onClick={action}
                            style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'10px 14px',borderRadius:9,border:'none',background:'transparent',cursor:'pointer',fontSize:13,fontWeight:600,color:C.inkMid,textAlign:'left'}}
                            onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                            <Icon size={14} style={{color:C.gold}}/>{label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button onClick={load} style={{width:40,height:40,borderRadius:12,border:'1px solid rgba(255,255,255,.14)',background:'rgba(255,255,255,.07)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <RefreshCw size={14} color="rgba(255,255,255,.55)" style={{animation:loading?'spin 0.8s linear infinite':'none'}}/>
                </button>
                <button onClick={()=>setDrawer('create')}
                  style={{display:'flex',alignItems:'center',gap:7,padding:'10px 20px',borderRadius:13,border:'none',background:`linear-gradient(135deg,${C.goldDeep},${C.goldLight})`,color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',boxShadow:`0 8px 24px ${C.gold}40`}}>
                  <Plus size={14}/> New Coupon
                </button>
              </div>
            </div>

            {/* Stats strip */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
              {[
                {l:'Total Coupons', v:stats.total,   c:'rgba(255,255,255,.9)',  bg:'rgba(255,255,255,.06)'},
                {l:'Active',        v:stats.active,  c:'#86EFAC',              bg:'rgba(52,211,153,.08)'},
                {l:'Expired',       v:stats.expired, c:'#FCA5A5',              bg:'rgba(248,113,113,.08)'},
                {l:'Total Used',    v:stats.used,    c:'#FCD34D',              bg:'rgba(251,191,36,.08)'},
              ].map(({l,v,c,bg})=>(
                <div key={l} style={{padding:'12px 16px',borderRadius:13,background:bg,backdropFilter:'blur(6px)',border:'1px solid rgba(255,255,255,.06)'}}>
                  <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'rgba(255,255,255,.3)',marginBottom:4}}>{l}</p>
                  <p style={{fontSize:24,fontWeight:900,color:c,fontFamily:"'Playfair Display',serif",lineHeight:1}}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── TOOLBAR ── */}
        <motion.div variants={fd} style={{display:'flex',gap:12,marginBottom:22,flexWrap:'wrap',alignItems:'center'}}>
          {/* Search */}
          <div style={{position:'relative',flex:1,minWidth:220}}>
            <Search size={13} style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',color:C.inkGhost}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search code or description…"
              style={{width:'100%',padding:'10px 14px 10px 36px',borderRadius:12,border:`1.5px solid ${C.border}`,background:'#fff',fontSize:13,color:C.ink,outline:'none',fontFamily:"'DM Sans',sans-serif",boxSizing:'border-box'}}
              onFocus={e=>{e.target.style.borderColor=C.gold;}} onBlur={e=>{e.target.style.borderColor=C.border;}}/>
            {search && <button onClick={()=>setSearch('')} style={{position:'absolute',right:11,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer'}}><X size={12} style={{color:C.inkGhost}}/></button>}
          </div>
          {/* Filter pills */}
          <div style={{display:'flex',gap:6}}>
            {FILTERS.map(([k,l])=>(
              <button key={k} onClick={()=>setFilter(k)}
                style={{padding:'8px 16px',borderRadius:100,fontSize:12,fontWeight:700,cursor:'pointer',border:`1.5px solid ${filter===k?C.gold:C.border}`,background:filter===k?C.goldPale:'#fff',color:filter===k?C.goldDeep:C.inkLight,transition:'all 0.15s'}}>
                {l}
              </button>
            ))}
          </div>
          <p style={{fontSize:12,color:C.inkGhost,marginLeft:'auto'}}>{filtered.length} result{filtered.length!==1?'s':''}</p>
        </motion.div>

        {/* ── GRID ── */}
        {loading ? (
          <div style={{display:'flex',justifyContent:'center',padding:'80px 0',gap:14,alignItems:'center'}}>
            <Loader2 size={20} style={{color:C.gold,animation:'spin 1s linear infinite'}}/>
            <span style={{fontSize:13,color:C.inkLight}}>Loading coupons…</span>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div variants={fd} style={{textAlign:'center',padding:'80px 0'}}>
            <Tag size={40} style={{color:C.inkGhost,margin:'0 auto 16px'}}/>
            <p style={{fontSize:16,fontWeight:700,color:C.inkMid,marginBottom:8}}>No coupons found</p>
            <p style={{fontSize:13,color:C.inkGhost}}>{search?'Try a different search':'Create your first coupon to get started'}</p>
          </motion.div>
        ) : (
          <motion.div variants={stag(0.04)} initial="hidden" animate="show"
            style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
            {filtered.map(c=>(
              <CouponCard key={c._id} c={c} onEdit={c=>setDrawer(c)} onDelete={handleDelete} onToggle={handleToggle} onCopy={handleCopy} copied={copied}/>
            ))}
          </motion.div>
        )}

      </motion.div>

      {/* Drawer */}
      <AnimatePresence>
        {drawer && (
          <CouponDrawer
            editData={drawer==='create'?null:drawer}
            onClose={()=>setDrawer(null)}
            onSaved={load}
            onFlash={flash}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{toast && <Toast msg={toast.msg} type={toast.type}/>}</AnimatePresence>

      {/* Close export menu on click outside */}
      {exMenu && <div onClick={()=>setExMenu(false)} style={{position:'fixed',inset:0,zIndex:90}}/>}

      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.border};border-radius:100px}
      `}</style>
    </>
  );
}