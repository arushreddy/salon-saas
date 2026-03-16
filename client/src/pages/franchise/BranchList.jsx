// src/pages/franchise/BranchList.jsx
// Phase 4 — Branch list with search, filters, bookings drill-down, CSV export
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/services/api';
import {
  Building2, Search, RefreshCw, Download, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle2, XCircle, CalendarDays, Eye, MessageSquare,
  Filter, X,
} from 'lucide-react';

/* ─── Design Tokens ──────────────────────────────────────────────────────── */
const C = {
  pageBg:'#F4EDE0', cardBg:'#FDFAF4',
  gold:'#B8860B', goldPale:'#FFF8E7',
  ink:'#1A1208', inkMid:'#5C4A2A', inkLight:'#9C8660', border:'#DFD0A8',
  teal:'#0F766E', tealLight:'#14B8A6', tealPale:'#F0FDFA', tealBorder:'#99F6E4',
  green:'#15803D', greenPale:'#DCFCE7', greenBorder:'#86EFAC',
  red:'#991B1B', redPale:'#FEF2F2', redBorder:'#FECACA',
  amber:'#92400E', amberPale:'#FFFBEB', amberBorder:'#FDE68A',
  blue:'#1D4ED8', bluePale:'#EFF6FF', blueBorder:'#BFDBFE',
  purple:'#5B21B6', purplePale:'#F5F3FF', purpleBorder:'#DDD6FE',
};

const PLAN_BADGE = {
  plan1:{ label:'Basic',     color:C.blue,   bg:C.bluePale,   border:C.blueBorder   },
  plan2:{ label:'Online',    color:C.gold,   bg:C.goldPale,   border:C.border       },
  plan3:{ label:'Franchise', color:C.purple, bg:C.purplePale, border:C.purpleBorder },
};

const fmtINR  = (n) => `₹${(n||0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const daysUntil = (d) => d ? Math.ceil((new Date(d)-new Date())/86400000) : null;

const statusInfo = (salon) => {
  if (salon.isSuspended) return { label:'Suspended', color:C.red, bg:C.redPale, border:C.redBorder };
  if (!salon.isActive)   return { label:'Inactive',  color:C.inkLight, bg:'#F9FAFB', border:C.border };
  const days = daysUntil(salon.subscriptionExpiry);
  if (days !== null && days <= 0)  return { label:'Expired', color:C.red, bg:C.redPale, border:C.redBorder };
  if (days !== null && days <= 7)  return { label:`${days}d left`, color:C.red, bg:C.redPale, border:C.redBorder };
  if (days !== null && days <= 30) return { label:`${days}d left`, color:C.amber, bg:C.amberPale, border:C.amberBorder };
  return { label:'Active', color:C.green, bg:C.greenPale, border:C.greenBorder };
};

const Inp = (p) => (
  <input {...p} style={{ padding:'8px 11px', borderRadius:8, fontSize:13, border:`1px solid ${C.border}`, background:'white', color:C.ink, outline:'none', ...(p.style||{}) }}
    onFocus={e=>e.target.style.borderColor=C.teal} onBlur={e=>e.target.style.borderColor=C.border} />
);
const Sel = ({children,...p}) => (
  <select {...p} style={{ padding:'8px 11px', borderRadius:8, fontSize:13, border:`1px solid ${C.border}`, background:'white', color:C.ink, outline:'none', ...(p.style||{}) }}>{children}</select>
);

/* ─── Bookings Drawer ────────────────────────────────────────────────────── */
const BookingsDrawer = ({ salon, onClose }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [dateFilter, setDateFilter] = useState({ from:'', to:'' });

  const load = useCallback(async () => {
    if (!salon) return;
    setLoading(true);
    try {
      const params = { page, limit:15 };
      if (dateFilter.from) params.from = dateFilter.from;
      if (dateFilter.to)   params.to   = dateFilter.to;
      const res = await api.get(`/franchise/branches/${salon._id}/bookings`, { params });
      setBookings(res.data.bookings || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [salon, page, dateFilter]);

  useEffect(() => { load(); }, [load]);

  const STATUS_COLOR = {
    completed: C.green, confirmed: C.blue, pending: C.amber, cancelled: C.red,
  };

  return (
    <AnimatePresence>
      {salon && (
        <>
          <motion.div style={{ position:'fixed', inset:0, background:'rgba(28,23,18,0.35)', backdropFilter:'blur(4px)', zIndex:50 }}
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose} />
          <motion.div style={{ position:'fixed', right:0, top:0, bottom:0, width:Math.min(600,window.innerWidth), background:C.cardBg, zIndex:51, overflowY:'auto', boxShadow:'-8px 0 60px rgba(28,23,18,0.12)' }}
            initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{type:'spring',damping:28,stiffness:220}}>
            {/* Drawer header */}
            <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, background:C.cardBg, zIndex:2 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:600, color:C.ink }}>{salon.name} — Bookings</div>
                <div style={{ fontSize:12, color:C.inkLight }}>{total} total bookings</div>
              </div>
              <button onClick={onClose} style={{ padding:8, background:'none', border:`1px solid ${C.border}`, borderRadius:8, cursor:'pointer', color:C.inkMid, display:'flex' }}>
                <X size={16} />
              </button>
            </div>

            {/* Date filter */}
            <div style={{ padding:'12px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', gap:8, flexWrap:'wrap' }}>
              <Inp type="date" value={dateFilter.from} onChange={e=>setDateFilter(f=>({...f,from:e.target.value}))} style={{ flex:1, minWidth:130 }} />
              <Inp type="date" value={dateFilter.to}   onChange={e=>setDateFilter(f=>({...f,to:e.target.value}))}   style={{ flex:1, minWidth:130 }} />
              <button onClick={()=>{setPage(1);load();}} style={{ padding:'8px 14px', borderRadius:8, border:'none', background:C.teal, color:'white', fontSize:13, cursor:'pointer' }}>Apply</button>
            </div>

            {/* List */}
            <div style={{ padding:'12px 20px' }}>
              {loading ? (
                <div style={{ display:'flex', justifyContent:'center', padding:40 }}><RefreshCw size={20} color={C.teal} style={{animation:'spin 1s linear infinite'}} /></div>
              ) : bookings.length === 0 ? (
                <div style={{ textAlign:'center', padding:40, color:C.inkLight }}>No bookings found</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {bookings.map(b => {
                    const sc = STATUS_COLOR[b.status] || C.inkLight;
                    return (
                      <div key={b._id} style={{ background:'white', borderRadius:10, border:`1px solid ${C.border}`, padding:'11px 14px', display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:500, color:C.ink }}>{b.customer?.name||'—'} <span style={{ fontSize:11, color:C.inkLight }}>· {b.customer?.phone}</span></div>
                          <div style={{ fontSize:12, color:C.inkMid, marginTop:2 }}>{b.service?.name||'—'} {b.staff ? `· ${b.staff.name}` : ''}</div>
                          <div style={{ fontSize:11, color:C.inkLight, marginTop:1 }}>
                            {new Date(b.date).toLocaleDateString('en-IN')} {b.timeSlot?.start||''}
                          </div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:C.ink }}>{fmtINR(b.finalAmount||b.service?.price)}</div>
                          <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:10, background:`${sc}15`, color:sc, border:`1px solid ${sc}30`, display:'inline-block', marginTop:3 }}>{b.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Pagination */}
              {total > 15 && (
                <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:12, marginTop:16 }}>
                  <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{ padding:'6px 12px', borderRadius:7, border:`1px solid ${C.border}`, background:'white', cursor:'pointer', display:'flex', alignItems:'center' }}><ChevronLeft size={14}/></button>
                  <span style={{ fontSize:13, color:C.inkMid }}>Page {page} of {Math.ceil(total/15)}</span>
                  <button onClick={()=>setPage(p=>p+1)} disabled={page>=Math.ceil(total/15)} style={{ padding:'6px 12px', borderRadius:7, border:`1px solid ${C.border}`, background:'white', cursor:'pointer', display:'flex', alignItems:'center' }}><ChevronRight size={14}/></button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function BranchList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [salons, setSalons]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [pagination, setPagination] = useState({ total:0, page:1, pages:1 });
  const [filters, setFilters] = useState({ search:'', status:'', page:1 });
  const [drawerSalon, setDrawerSalon] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/franchise/branches', { params: filters });
      setSalons(res.data.salons || []);
      setPagination(res.data.pagination || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  // Auto-open drawer if ?highlight=salonId
  useEffect(() => {
    const h = searchParams.get('highlight');
    if (h && salons.length) {
      const found = salons.find(s => s._id === h);
      if (found) setDrawerSalon(found);
    }
  }, [searchParams, salons]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/franchise/export/csv', { params:{ type:'branches' }, responseType:'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href=url; a.download='branches_report.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
    finally { setExporting(false); }
  };

  const setF = (k,v) => setFilters(f=>({...f,[k]:v,page:1}));

  return (
    <div style={{ maxWidth:1200 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:600, color:C.ink, margin:0 }}>Branches</h1>
          <p style={{ fontSize:13, color:C.inkLight, margin:'4px 0 0' }}>{pagination.total} branches in your franchise</p>
        </div>
        <button onClick={handleExport} disabled={exporting} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:9, border:`1px solid ${C.border}`, background:'white', fontSize:13, color:C.inkMid, cursor:'pointer' }}>
          <Download size={14} /> {exporting?'Exporting...':'Export CSV'}
        </button>
      </div>

      {/* Filters */}
      <div style={{ background:C.cardBg, borderRadius:12, border:`1px solid ${C.border}`, padding:'12px 16px', marginBottom:16, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:180 }}>
          <Search size={14} color={C.inkLight} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)' }} />
          <Inp placeholder="Search branches…" value={filters.search} onChange={e=>setF('search',e.target.value)} style={{ paddingLeft:32, width:'100%' }} />
        </div>
        <Sel value={filters.status} onChange={e=>setF('status',e.target.value)} style={{ minWidth:130 }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </Sel>
        <button onClick={load} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:9, border:'none', background:C.teal, color:'white', fontSize:13, cursor:'pointer' }}>
          {loading ? <RefreshCw size={14} style={{animation:'spin 1s linear infinite'}}/> : <Filter size={14}/>} Refresh
        </button>
      </div>

      {/* Table (desktop) */}
      <div style={{ display:'none' }} className="branch-table-wrapper">
        {/* hidden — handled below via cards */}
      </div>

      {/* Branch cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:12 }}>
        {salons.map((salon, i) => {
          const st   = statusInfo(salon);
          const plan = PLAN_BADGE[salon.plan] || PLAN_BADGE.plan1;
          return (
            <motion.div key={salon._id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}}
              style={{ background:C.cardBg, borderRadius:13, border:`1px solid ${C.border}`, overflow:'hidden' }}>
              {/* Card header */}
              <div style={{ padding:'13px 16px 10px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                  <div style={{ width:36, height:36, borderRadius:9, background:`linear-gradient(135deg, ${C.tealLight}40, ${C.teal}20)`, border:`1px solid ${C.tealBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:C.teal, flexShrink:0 }}>
                    {salon.name.charAt(0)}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{salon.name}</div>
                    <div style={{ fontSize:11, color:C.inkLight }}>{salon.slug}</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:10, background:plan.bg, color:plan.color, border:`1px solid ${plan.border}` }}>{plan.label}</span>
                  <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:10, background:st.bg, color:st.color, border:`1px solid ${st.border}` }}>{st.label}</span>
                </div>
              </div>

              {/* Stats */}
              <div style={{ padding:'10px 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <div style={{ fontSize:11, color:C.inkLight }}>Admin</div>
                  <div style={{ fontSize:13, fontWeight:500, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{salon.admin?.name||'—'}</div>
                  <div style={{ fontSize:11, color:C.inkLight }}>{salon.admin?.phone||'—'}</div>
                </div>
                <div>
                  <div style={{ fontSize:11, color:C.inkLight }}>30-day revenue</div>
                  <div style={{ fontSize:15, fontWeight:700, color:C.ink }}>{fmtINR(salon.revenue30)}</div>
                  <div style={{ fontSize:11, color:C.inkLight }}>{salon.bookings30||0} bookings</div>
                </div>
              </div>

              {/* Expiry row */}
              <div style={{ padding:'0 16px 10px', display:'flex', alignItems:'center', gap:6 }}>
                <CalendarDays size={12} color={st.color} />
                <span style={{ fontSize:12, color:st.color }}>
                  {salon.subscriptionExpiry ? `Expires ${fmtDate(salon.subscriptionExpiry)}` : 'No expiry set'}
                </span>
              </div>

              {/* Actions */}
              <div style={{ padding:'8px 16px 12px', display:'flex', gap:8, borderTop:`1px solid ${C.border}` }}>
                <button onClick={()=>setDrawerSalon(salon)} style={{ flex:1, padding:'7px', borderRadius:8, border:`1px solid ${C.border}`, background:'white', fontSize:12, color:C.inkMid, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                  <Eye size={13}/> Bookings
                </button>
                {salon.admin?.phone && (
                  <button onClick={()=>navigate('/franchise/whatsapp', {state:{preselect:[salon._id]}})} style={{ flex:1, padding:'7px', borderRadius:8, border:'1px solid #16a34a30', background:C.greenPale, fontSize:12, color:C.green, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                    <MessageSquare size={13}/> WhatsApp
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {!loading && salons.length === 0 && (
        <div style={{ padding:60, textAlign:'center', color:C.inkLight, background:C.cardBg, borderRadius:14, border:`1px solid ${C.border}` }}>
          No branches found
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:12, marginTop:20 }}>
          <button onClick={()=>setF('page',Math.max(1,filters.page-1))} disabled={filters.page<=1} style={{ padding:'7px 14px', borderRadius:8, border:`1px solid ${C.border}`, background:'white', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:13 }}><ChevronLeft size={14}/> Prev</button>
          <span style={{ fontSize:13, color:C.inkMid }}>Page {filters.page} of {pagination.pages}</span>
          <button onClick={()=>setF('page',Math.min(pagination.pages,filters.page+1))} disabled={filters.page>=pagination.pages} style={{ padding:'7px 14px', borderRadius:8, border:`1px solid ${C.border}`, background:'white', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:13 }}>Next <ChevronRight size={14}/></button>
        </div>
      )}

      <BookingsDrawer salon={drawerSalon} onClose={()=>setDrawerSalon(null)} />
    </div>
  );
}
