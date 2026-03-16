import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Loader2, Save, UserPlus, User, Mail, Phone, Lock,
  Briefcase, Scissors, Clock, Banknote, FileText, Check,
  ChevronDown,
} from 'lucide-react';

// ─── Salon color tokens (matches AdminStaff / Appointments) ──────────────────
const C = {
  cream:       '#FDF8F0',
  creamMid:    '#F7EFD8',
  creamDark:   '#EDE0C0',
  creamBorder: '#DFD0A8',
  gold:        '#B8860B',
  goldLight:   '#DAA520',
  goldPale:    '#FFF8E7',
  ink:         '#16100A',
  inkMid:      '#5A4020',
  inkFaint:    '#B09060',
  inkGhost:    '#D4B890',
  white:       '#FFFFFF',
  ok:          '#285C3A',
  okPale:      '#EAF4EE',
  okBorder:    '#A7D4B0',
  risk:        '#7A2020',
  riskPale:    '#FEF2F2',
  riskBorder:  '#F5BABA',
  blue:        '#1D4ED8',
  bluePale:    '#EFF6FF',
  blueBorder:  '#BFDBFE',
};

const DESIGNATIONS = [
  { value:'trainee',        label:'Trainee',        icon:'🌱' },
  { value:'junior_stylist', label:'Junior Stylist',  icon:'✂' },
  { value:'senior_stylist', label:'Senior Stylist',  icon:'💇' },
  { value:'master_stylist', label:'Master Stylist',  icon:'👑' },
  { value:'receptionist',   label:'Receptionist',    icon:'🎀' },
  { value:'manager',        label:'Manager',         icon:'🏅' },
];

const SPECIALIZATIONS = [
  { value:'hair',    label:'Hair',         icon:'✂' },
  { value:'skin',    label:'Skin Care',    icon:'✨' },
  { value:'nails',   label:'Nails',        icon:'💅' },
  { value:'makeup',  label:'Makeup',       icon:'💄' },
  { value:'spa',     label:'Spa & Wellness',icon:'🧖' },
  { value:'bridal',  label:'Bridal',       icon:'👰' },
  { value:'grooming',label:'Grooming',     icon:'🪒' },
  { value:'combo',   label:'Combo',        icon:'🌟' },
];

const WEEKDAYS = [
  { value:'monday',    short:'Mon' },
  { value:'tuesday',   short:'Tue' },
  { value:'wednesday', short:'Wed' },
  { value:'thursday',  short:'Thu' },
  { value:'friday',    short:'Fri' },
  { value:'saturday',  short:'Sat' },
  { value:'sunday',    short:'Sun' },
];

const defaultForm = {
  name:'', email:'', phone:'', password:'',
  role:'staff', designation:'junior_stylist',
  specializations:[], bio:'',
  salaryBase:'', commissionEnabled:false, commissionPercent:'',
  weeklyOff:['sunday'], shiftStart:'09:00', shiftEnd:'21:00',
};

// ─── Atoms ───────────────────────────────────────────────────────────────────
const SectionLabel = ({ icon: Icon, children }) => (
  <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:14}}>
    <div style={{width:24,height:24,borderRadius:7,background:C.goldPale,
      border:`1px solid ${C.creamBorder}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <Icon size={11} style={{color:C.gold}}/>
    </div>
    <span style={{fontSize:9,fontWeight:800,textTransform:'uppercase',
      letterSpacing:'0.14em',color:C.inkFaint}}>{children}</span>
    <div style={{flex:1,height:1,background:C.creamBorder}}/>
  </div>
);

const Field = ({ label, required, children }) => (
  <div>
    <label style={{display:'block',fontSize:11,fontWeight:700,color:C.inkMid,marginBottom:5}}>
      {label}{required&&<span style={{color:C.risk,marginLeft:2}}>*</span>}
    </label>
    {children}
  </div>
);

const Inp = ({ icon:Icon, style, ...p }) => (
  <div style={{position:'relative'}}>
    {Icon && <Icon size={12} style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:C.inkGhost,pointerEvents:'none'}}/>}
    <input {...p}
      onFocus={e=>{e.target.style.borderColor=C.gold;e.target.style.boxShadow=`0 0 0 3px ${C.goldPale}`;}}
      onBlur={e=>{e.target.style.borderColor=C.creamBorder;e.target.style.boxShadow='none';}}
      style={{width:'100%',padding:Icon?'8px 12px 8px 30px':'8px 12px',borderRadius:10,
        border:`1.5px solid ${p.disabled?C.creamDark:C.creamBorder}`,
        background:p.disabled?C.cream:C.white,color:p.disabled?C.inkFaint:C.ink,
        fontSize:12,outline:'none',boxSizing:'border-box',
        transition:'border-color 0.2s,box-shadow 0.2s',fontFamily:"'DM Sans',sans-serif",...style}}/>
  </div>
);

const Select = ({ icon:Icon, children, value, onChange, name }) => (
  <div style={{position:'relative'}}>
    {Icon && <Icon size={12} style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:C.inkGhost,pointerEvents:'none'}}/>}
    <select value={value} onChange={onChange} name={name}
      onFocus={e=>{e.target.style.borderColor=C.gold;}}
      onBlur={e=>{e.target.style.borderColor=C.creamBorder;}}
      style={{width:'100%',padding:Icon?'8px 30px 8px 30px':'8px 30px 8px 12px',borderRadius:10,
        border:`1.5px solid ${C.creamBorder}`,background:C.white,color:C.ink,
        fontSize:12,outline:'none',cursor:'pointer',appearance:'none',
        fontFamily:"'DM Sans',sans-serif",transition:'border-color 0.2s'}}>
      {children}
    </select>
    <ChevronDown size={12} style={{position:'absolute',right:11,top:'50%',transform:'translateY(-50%)',color:C.inkGhost,pointerEvents:'none'}}/>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const StaffModal = ({ isOpen, onClose, onSubmit, staff, isLoading }) => {
  const [form, setForm]       = useState(defaultForm);
  const [error, setError]     = useState('');
  const isEdit = !!staff;

  useEffect(() => {
    if (staff) {
      setForm({
        name:               staff.user?.name || '',
        email:              staff.user?.email || '',
        phone:              staff.user?.phone || '',
        password:           '',
        role:               staff.user?.role || 'staff',
        designation:        staff.designation || 'junior_stylist',
        specializations:    staff.specializations || [],
        bio:                staff.bio || '',
        salaryBase:         staff.salary?.base || '',
        commissionEnabled:  staff.salary?.commissionEnabled || false,
        commissionPercent:  staff.salary?.commissionPercent || '',
        weeklyOff:          staff.schedule?.weeklyOff || ['sunday'],
        shiftStart:         staff.schedule?.shiftStart || '09:00',
        shiftEnd:           staff.schedule?.shiftEnd || '21:00',
      });
    } else {
      setForm(defaultForm);
    }
    setError('');
  }, [staff, isOpen]);

  const set = (key, val) => { setForm(f=>({...f,[key]:val})); setError(''); };

  const toggleSpec = v => set('specializations',
    form.specializations.includes(v)
      ? form.specializations.filter(s=>s!==v)
      : [...form.specializations, v]
  );

  const toggleOff = v => set('weeklyOff',
    form.weeklyOff.includes(v)
      ? form.weeklyOff.filter(d=>d!==v)
      : [...form.weeklyOff, v]
  );

  const handleSubmit = e => {
    e.preventDefault();
    if (!form.name.trim())  { setError('Full name is required'); return; }
    if (!form.email.trim()) { setError('Email is required'); return; }
    if (!isEdit && !form.password) { setError('Password is required for new staff'); return; }

    const payload = {
      name:           form.name,
      email:          form.email,
      phone:          form.phone,
      role:           form.role,
      designation:    form.designation,
      specializations:form.specializations,
      bio:            form.bio,
      salary: {
        base:               Number(form.salaryBase)||0,
        commissionEnabled:  form.commissionEnabled,
        commissionPercent:  Number(form.commissionPercent)||0,
      },
      schedule: {
        weeklyOff:  form.weeklyOff,
        shiftStart: form.shiftStart,
        shiftEnd:   form.shiftEnd,
      },
    };
    if (form.password) payload.password = form.password;
    onSubmit(payload);
  };

  const desgInfo = DESIGNATIONS.find(d=>d.value===form.designation);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={onClose}
            style={{position:'fixed',inset:0,background:'rgba(22,16,10,0.65)',
              backdropFilter:'blur(8px)',zIndex:500}}/>

          {/* Modal */}
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{position:'fixed',inset:0,zIndex:501,display:'flex',alignItems:'center',
              justifyContent:'center',padding:16,overflowY:'auto'}}>
            <motion.div
              initial={{scale:0.96,y:12}} animate={{scale:1,y:0}} exit={{scale:0.96,y:12}}
              transition={{type:'spring',damping:26,stiffness:300}}
              onClick={e=>e.stopPropagation()}
              style={{width:'100%',maxWidth:600,background:C.cream,
                border:`1px solid ${C.creamBorder}`,borderRadius:20,
                boxShadow:'0 32px 80px rgba(0,0,0,0.22)',overflow:'hidden',
                fontFamily:"'DM Sans',sans-serif",margin:'auto'}}>

              {/* ── Header ── */}
              <div style={{background:C.white,borderBottom:`1px solid ${C.creamBorder}`,padding:'16px 20px',
                position:'sticky',top:0,zIndex:10,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:38,height:38,borderRadius:11,
                    background:`linear-gradient(135deg,${C.gold},${C.goldLight})`,
                    display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <UserPlus size={16} style={{color:'#fff'}}/>
                  </div>
                  <div>
                    <h2 style={{fontSize:15,fontWeight:700,color:C.ink,margin:0,fontFamily:"'Playfair Display',serif"}}>
                      {isEdit ? 'Edit Staff Member' : 'Add New Staff'}
                    </h2>
                    <p style={{fontSize:10,color:C.inkFaint,marginTop:2}}>
                      {isEdit ? `Editing ${staff?.user?.name||'profile'}` : 'Create a new staff account'}
                    </p>
                  </div>
                </div>
                <button onClick={onClose} style={{width:30,height:30,borderRadius:9,border:`1px solid ${C.creamBorder}`,
                  background:C.creamMid,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <X size={13} style={{color:C.inkMid}}/>
                </button>
              </div>

              {/* ── Gold accent strip ── */}
              <div style={{height:2,background:`linear-gradient(90deg,${C.gold},${C.goldLight},${C.gold})`}}/>

              {/* ── Form body ── */}
              <div style={{padding:'20px',maxHeight:'70vh',overflowY:'auto'}}>
                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                      style={{padding:'10px 14px',borderRadius:10,background:C.riskPale,
                        border:`1px solid ${C.riskBorder}`,marginBottom:16,
                        display:'flex',alignItems:'center',gap:8}}>
                      <X size={12} style={{color:C.risk,flexShrink:0}}/>
                      <span style={{fontSize:12,color:C.risk,fontWeight:600}}>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── 1. Personal Info ── */}
                <div style={{marginBottom:22}}>
                  <SectionLabel icon={User}>Personal Info</SectionLabel>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    <Field label="Full Name" required>
                      <Inp icon={User} name="name" value={form.name}
                        onChange={e=>set('name',e.target.value)} placeholder="e.g. Priya Sharma"/>
                    </Field>
                    <Field label="Email Address" required>
                      <Inp icon={Mail} name="email" type="email" value={form.email}
                        onChange={e=>set('email',e.target.value)}
                        placeholder="staff@salon.com" disabled={isEdit}/>
                    </Field>
                    <Field label="Phone Number">
                      <Inp icon={Phone} name="phone" type="tel" value={form.phone}
                        onChange={e=>set('phone',e.target.value)} placeholder="9876543210"/>
                    </Field>
                    {!isEdit && (
                      <Field label="Password" required>
                        <Inp icon={Lock} name="password" type="password" value={form.password}
                          onChange={e=>set('password',e.target.value)} placeholder="Login password"/>
                      </Field>
                    )}
                  </div>
                </div>

                {/* ── 2. Role & Designation ── */}
                <div style={{marginBottom:22}}>
                  <SectionLabel icon={Briefcase}>Role & Designation</SectionLabel>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                    <Field label="System Role">
                      <Select icon={Briefcase} name="role" value={form.role} onChange={e=>set('role',e.target.value)}>
                        <option value="staff">Staff</option>
                        <option value="receptionist">Receptionist</option>
                      </Select>
                    </Field>
                    <Field label="Designation">
                      <Select icon={Briefcase} name="designation" value={form.designation} onChange={e=>set('designation',e.target.value)}>
                        {DESIGNATIONS.map(d=>(
                          <option key={d.value} value={d.value}>{d.icon} {d.label}</option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  {/* Designation preview */}
                  {desgInfo && (
                    <div style={{padding:'9px 13px',borderRadius:10,background:C.goldPale,
                      border:`1px solid ${C.creamBorder}`,display:'flex',alignItems:'center',gap:9}}>
                      <span style={{fontSize:18}}>{desgInfo.icon}</span>
                      <div>
                        <p style={{fontSize:11,fontWeight:700,color:C.gold}}>{desgInfo.label}</p>
                        <p style={{fontSize:10,color:C.inkFaint}}>
                          {form.role==='receptionist'?'Front desk · manages bookings & walk-ins':'Stylist · handles appointments & services'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── 3. Specializations ── */}
                <div style={{marginBottom:22}}>
                  <SectionLabel icon={Scissors}>Specializations</SectionLabel>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {SPECIALIZATIONS.map(sp=>{
                      const active = form.specializations.includes(sp.value);
                      return (
                        <button key={sp.value} type="button" onClick={()=>toggleSpec(sp.value)}
                          style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',
                            borderRadius:100,fontSize:11,fontWeight:700,cursor:'pointer',
                            border:`1.5px solid ${active?C.gold:C.creamBorder}`,
                            background:active?C.goldPale:C.white,
                            color:active?C.gold:C.inkFaint,transition:'all 0.15s'}}>
                          <span style={{fontSize:12}}>{sp.icon}</span>
                          {sp.label}
                          {active&&<Check size={9} style={{color:C.gold}}/>}
                        </button>
                      );
                    })}
                  </div>
                  {form.specializations.length>0&&(
                    <p style={{fontSize:10,color:C.inkFaint,marginTop:7}}>
                      {form.specializations.length} specialization{form.specializations.length!==1?'s':''} selected
                    </p>
                  )}
                </div>

                {/* ── 4. Schedule ── */}
                <div style={{marginBottom:22}}>
                  <SectionLabel icon={Clock}>Schedule</SectionLabel>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                    <Field label="Shift Start">
                      <Inp icon={Clock} name="shiftStart" type="time" value={form.shiftStart}
                        onChange={e=>set('shiftStart',e.target.value)}/>
                    </Field>
                    <Field label="Shift End">
                      <Inp icon={Clock} name="shiftEnd" type="time" value={form.shiftEnd}
                        onChange={e=>set('shiftEnd',e.target.value)}/>
                    </Field>
                  </div>
                  {/* Shift preview pill */}
                  <div style={{display:'inline-flex',alignItems:'center',gap:6,padding:'5px 12px',
                    borderRadius:100,background:C.okPale,border:`1px solid ${C.okBorder}`,marginBottom:12}}>
                    <Clock size={10} style={{color:C.ok}}/>
                    <span style={{fontSize:11,fontWeight:700,color:C.ok}}>{form.shiftStart} → {form.shiftEnd}</span>
                  </div>
                  {/* Weekly off */}
                  <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',
                    color:C.inkFaint,marginBottom:7}}>Weekly Off Days</p>
                  <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                    {WEEKDAYS.map(d=>{
                      const off = form.weeklyOff.includes(d.value);
                      return (
                        <button key={d.value} type="button" onClick={()=>toggleOff(d.value)}
                          style={{padding:'6px 12px',borderRadius:9,fontSize:11,fontWeight:700,
                            cursor:'pointer',transition:'all 0.15s',
                            border:`1.5px solid ${off?C.riskBorder:C.creamBorder}`,
                            background:off?C.riskPale:C.white,
                            color:off?C.risk:C.inkFaint}}>
                          {d.short}
                        </button>
                      );
                    })}
                  </div>
                  {form.weeklyOff.length>0&&(
                    <p style={{fontSize:10,color:C.inkFaint,marginTop:6}}>
                      Off: {form.weeklyOff.map(d=>d.charAt(0).toUpperCase()+d.slice(1,3)).join(', ')}
                    </p>
                  )}
                </div>

                {/* ── 5. Salary ── */}
                <div style={{marginBottom:22}}>
                  <SectionLabel icon={Banknote}>Salary & Commission</SectionLabel>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                    <Field label="Base Salary (₹)">
                      <Inp icon={Banknote} name="salaryBase" type="number" min={0} value={form.salaryBase}
                        onChange={e=>set('salaryBase',e.target.value)} placeholder="e.g. 18000"/>
                    </Field>
                    <div style={{display:'flex',flexDirection:'column',justifyContent:'flex-end',paddingBottom:2}}>
                      <label style={{display:'flex',alignItems:'center',gap:9,cursor:'pointer',
                        padding:'9px 12px',borderRadius:10,
                        border:`1.5px solid ${form.commissionEnabled?C.gold:C.creamBorder}`,
                        background:form.commissionEnabled?C.goldPale:C.white,
                        transition:'all 0.15s'}}>
                        {/* Custom checkbox */}
                        <div onClick={()=>set('commissionEnabled',!form.commissionEnabled)}
                          style={{width:16,height:16,borderRadius:5,flexShrink:0,
                            border:`2px solid ${form.commissionEnabled?C.gold:C.creamBorder}`,
                            background:form.commissionEnabled?C.gold:'transparent',
                            display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',
                            transition:'all 0.15s'}}>
                          {form.commissionEnabled&&<Check size={9} style={{color:'#fff'}}/>}
                        </div>
                        <span style={{fontSize:12,fontWeight:600,color:form.commissionEnabled?C.gold:C.inkMid}}>
                          Enable Commission
                        </span>
                      </label>
                    </div>
                  </div>

                  <AnimatePresence>
                    {form.commissionEnabled && (
                      <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}>
                        <div style={{padding:'12px 14px',borderRadius:11,background:C.white,
                          border:`1px solid ${C.creamBorder}`,marginBottom:4}}>
                          <Field label="Commission Rate (%)">
                            <div style={{display:'flex',gap:10,alignItems:'center'}}>
                              <Inp name="commissionPercent" type="number" min={0} max={50} value={form.commissionPercent}
                                onChange={e=>set('commissionPercent',e.target.value)} placeholder="e.g. 10"
                                style={{flex:1}}/>
                              <input type="range" min={0} max={30} step={0.5}
                                value={form.commissionPercent||0}
                                onChange={e=>set('commissionPercent',e.target.value)}
                                style={{flex:2,accentColor:C.gold}}/>
                              <span style={{fontSize:14,fontWeight:800,color:C.gold,minWidth:36,textAlign:'right'}}>
                                {form.commissionPercent||0}%
                              </span>
                            </div>
                          </Field>
                          {form.salaryBase && Number(form.commissionPercent)>0 && (
                            <div style={{marginTop:10,padding:'8px 10px',borderRadius:9,background:C.goldPale}}>
                              <p style={{fontSize:11,color:C.inkFaint}}>
                                Base ₹{Number(form.salaryBase).toLocaleString('en-IN')} + {form.commissionPercent}% commission on revenue
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ── 6. Bio ── */}
                <div style={{marginBottom:22}}>
                  <SectionLabel icon={FileText}>Bio / About</SectionLabel>
                  <textarea name="bio" value={form.bio} onChange={e=>set('bio',e.target.value)}
                    rows={2} placeholder="Short bio about this staff member…"
                    onFocus={e=>{e.target.style.borderColor=C.gold;e.target.style.boxShadow=`0 0 0 3px ${C.goldPale}`;}}
                    onBlur={e=>{e.target.style.borderColor=C.creamBorder;e.target.style.boxShadow='none';}}
                    style={{width:'100%',padding:'9px 12px',borderRadius:10,border:`1.5px solid ${C.creamBorder}`,
                      background:C.white,color:C.ink,fontSize:12,outline:'none',resize:'vertical',
                      boxSizing:'border-box',transition:'border-color 0.2s',fontFamily:"'DM Sans',sans-serif"}}/>
                </div>

                {/* ── Submit ── */}
                <button type="button" onClick={handleSubmit} disabled={isLoading}
                  style={{width:'100%',padding:'12px',borderRadius:12,border:'none',
                    cursor:isLoading?'not-allowed':'pointer',
                    background:isLoading?C.creamDark:`linear-gradient(135deg,${C.gold},${C.goldLight})`,
                    color:isLoading?C.inkGhost:C.white,
                    fontSize:13,fontWeight:700,letterSpacing:'0.04em',
                    display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                    boxShadow:isLoading?'none':'0 6px 20px rgba(184,134,11,0.25)',
                    transition:'all 0.18s'}}>
                  {isLoading
                    ? <><Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> Saving…</>
                    : <><Save size={14}/> {isEdit?'Update Staff Member':'Add Staff Member'}</>
                  }
                </button>
              </div>
            </motion.div>
          </motion.div>

          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </>
      )}
    </AnimatePresence>
  );
};

export default StaffModal;