// src/pages/franchise/CrossAnalytics.jsx
// Phase 4 — Cross-branch analytics with charts + CSV export
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import api from '@/services/api';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { BarChart3, Download, RefreshCw, TrendingUp, Calendar, Filter } from 'lucide-react';

/* ─── Design Tokens ──────────────────────────────────────────────────────── */
const C = {
  pageBg:'#F4EDE0', cardBg:'#FDFAF4',
  gold:'#B8860B', goldPale:'#FFF8E7',
  ink:'#1A1208', inkMid:'#5C4A2A', inkLight:'#9C8660', border:'#DFD0A8',
  teal:'#0F766E', tealLight:'#14B8A6', tealPale:'#F0FDFA', tealBorder:'#99F6E4',
  green:'#15803D', greenPale:'#DCFCE7',
  red:'#991B1B', redPale:'#FEF2F2', redBorder:'#FECACA',
  amber:'#92400E', amberPale:'#FFFBEB',
  blue:'#1D4ED8', bluePale:'#EFF6FF',
  purple:'#5B21B6',
};

// Branch colour palette (cycles)
const BRANCH_COLORS = ['#0F766E','#B8860B','#1D4ED8','#5B21B6','#15803D','#92400E','#DB2777','#0369A1'];
const branchColor = (i) => BRANCH_COLORS[i % BRANCH_COLORS.length];

const fmtINR  = (n) => `₹${(n||0).toLocaleString('en-IN')}`;
const fmtDate = (s) => s;

/* ─── Shared card wrapper ────────────────────────────────────────────────── */
const Card = ({ title, subtitle, children, action }) => (
  <div style={{ background:C.cardBg, borderRadius:14, border:`1px solid ${C.border}`, overflow:'hidden', marginBottom:16 }}>
    <div style={{ padding:'14px 18px 12px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <div>
        <div style={{ fontSize:14, fontWeight:600, color:C.ink }}>{title}</div>
        {subtitle && <div style={{ fontSize:12, color:C.inkLight, marginTop:2 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
    <div style={{ padding:'16px 18px' }}>{children}</div>
  </div>
);

/* ─── Custom Tooltip ─────────────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:C.cardBg, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px', boxShadow:'0 4px 20px rgba(0,0,0,0.1)' }}>
      <div style={{ fontSize:12, fontWeight:600, color:C.ink, marginBottom:6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize:12, color:p.color, display:'flex', justifyContent:'space-between', gap:16 }}>
          <span>{p.name}</span>
          <span style={{ fontWeight:600 }}>{p.name?.includes('Revenue') || p.dataKey?.startsWith('sal_') ? fmtINR(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ─── Inp / Sel primitives ────────────────────────────────────────────────── */
const Inp = (p) => (
  <input {...p} style={{ padding:'8px 11px', borderRadius:8, fontSize:13, border:`1px solid ${C.border}`, background:'white', color:C.ink, outline:'none', ...(p.style||{}) }}
    onFocus={e=>e.target.style.borderColor=C.teal} onBlur={e=>e.target.style.borderColor=C.border} />
);
const Sel = ({ children, ...p }) => (
  <select {...p} style={{ padding:'8px 11px', borderRadius:8, fontSize:13, border:`1px solid ${C.border}`, background:'white', color:C.ink, outline:'none', ...(p.style||{}) }}>{children}</select>
);

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function CrossAnalytics() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    from: new Date(Date.now()-30*86400000).toISOString().slice(0,10),
    to:   new Date().toISOString().slice(0,10),
    groupBy: 'day',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/franchise/analytics', { params: filters });
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async (type = 'bookings') => {
    setExporting(true);
    try {
      const res = await api.get('/franchise/export/csv', {
        params: { from: filters.from, to: filters.to, type },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement('a');
      a.href    = url;
      a.download = `franchise_${type}_${filters.from}_${filters.to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
    finally { setExporting(false); }
  };

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const { salons=[], branchData=[], timeSeries=[], statusBreakdown=[], topServices=[] } = data || {};

  // Build status pie data
  const pieData = statusBreakdown.map(s => ({ name: s._id, value: s.count }));
  const PIE_COLORS = { completed:'#0F766E', pending:'#B8860B', cancelled:'#991B1B', confirmed:'#1D4ED8' };

  return (
    <div style={{ maxWidth:1200 }}>
      {/* Header */}
      <div style={{ marginBottom:20, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:600, color:C.ink, margin:0 }}>Cross-Branch Analytics</h1>
          <p style={{ fontSize:13, color:C.inkLight, margin:'4px 0 0' }}>Revenue, bookings and performance across all branches</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button onClick={() => handleExport('bookings')} disabled={exporting} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:9, border:`1px solid ${C.border}`, background:'white', fontSize:13, color:C.inkMid, cursor:'pointer' }}>
            <Download size={14} /> Export bookings CSV
          </button>
          <button onClick={() => handleExport('branches')} disabled={exporting} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:9, border:`1px solid ${C.tealBorder}`, background:C.tealPale, fontSize:13, color:C.teal, cursor:'pointer' }}>
            <Download size={14} /> Branches summary CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background:C.cardBg, borderRadius:12, border:`1px solid ${C.border}`, padding:'14px 16px', marginBottom:20, display:'flex', flexWrap:'wrap', gap:12, alignItems:'flex-end' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:12, color:C.inkMid, fontWeight:500 }}>From</label>
          <Inp type="date" value={filters.from} onChange={e=>setF('from',e.target.value)} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:12, color:C.inkMid, fontWeight:500 }}>To</label>
          <Inp type="date" value={filters.to} onChange={e=>setF('to',e.target.value)} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:12, color:C.inkMid, fontWeight:500 }}>Group by</label>
          <Sel value={filters.groupBy} onChange={e=>setF('groupBy',e.target.value)}>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </Sel>
        </div>
        <button onClick={load} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:9, border:'none', background:C.teal, color:'white', fontSize:13, cursor:'pointer', fontWeight:500 }}>
          <Filter size={14} /> Apply
        </button>
        {loading && <RefreshCw size={16} color={C.teal} style={{ animation:'spin 1s linear infinite', alignSelf:'center' }} />}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
        {branchData.map((b, i) => (
          <motion.div key={b.salonId} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
            style={{ background:C.cardBg, borderRadius:12, border:`1px solid ${C.border}`, padding:'14px 16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:branchColor(i), flexShrink:0 }} />
              <div style={{ fontSize:12, fontWeight:600, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.salonName}</div>
            </div>
            <div style={{ fontSize:18, fontWeight:700, color:C.ink }}>{fmtINR(b.totalRevenue)}</div>
            <div style={{ fontSize:11, color:C.inkLight, marginTop:2 }}>{b.totalBookings} bookings · avg {fmtINR(b.avgTicket)}</div>
          </motion.div>
        ))}
      </div>

      {/* Revenue over time — Line chart */}
      <Card title="Revenue trend" subtitle={`Grouped by ${filters.groupBy}`}>
        {timeSeries.length === 0 ? (
          <div style={{ height:200, display:'flex', alignItems:'center', justifyContent:'center', color:C.inkLight }}>No data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeSeries} margin={{top:5,right:20,left:10,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="period" tick={{fontSize:11,fill:C.inkLight}} tickLine={false} />
              <YAxis tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} tick={{fontSize:11,fill:C.inkLight}} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{fontSize:12}} />
              <Line dataKey="total" name="Combined revenue" stroke={C.teal} strokeWidth={2.5} dot={false} />
              {salons.map((s, i) => (
                <Line key={s._id} dataKey={`sal_${s._id}`} name={s.name} stroke={branchColor(i+1)} strokeWidth={1.5} dot={false} strokeDasharray={i>0?'4 2':undefined} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Revenue by branch — Bar chart */}
      <Card title="Revenue by branch" subtitle="Sorted highest to lowest">
        {branchData.length === 0 ? (
          <div style={{ height:200, display:'flex', alignItems:'center', justifyContent:'center', color:C.inkLight }}>No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={branchData} margin={{top:5,right:20,left:10,bottom:5}} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
              <XAxis type="number" tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} tick={{fontSize:11,fill:C.inkLight}} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="salonName" tick={{fontSize:12,fill:C.inkMid}} width={120} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="totalRevenue" name="Revenue" radius={[0,4,4,0]}>
                {branchData.map((_, i) => <Cell key={i} fill={branchColor(i)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16 }}>
        {/* Booking status distribution */}
        <Card title="Booking status" subtitle="All branches combined">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" label={({name,percent})=>`${name} ${Math.round(percent*100)}%`} labelLine={false}>
                {pieData.map((entry, i) => <Cell key={i} fill={PIE_COLORS[entry.name]||branchColor(i)} />)}
              </Pie>
              <Tooltip formatter={(v)=>[v,'Count']} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Top services */}
        <Card title="Top services" subtitle="By revenue across all branches">
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {topServices.slice(0,8).map((s, i) => {
              const maxRev = topServices[0]?.revenue||1;
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:20, textAlign:'right', fontSize:11, color:C.inkLight, flexShrink:0 }}>#{i+1}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontSize:12, color:C.ink, fontWeight:500 }}>{s._id}</span>
                      <span style={{ fontSize:12, color:C.inkMid }}>{fmtINR(s.revenue)}</span>
                    </div>
                    <div style={{ height:4, borderRadius:2, background:'#F3ECE0', overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:2, background:branchColor(i), width:`${(s.revenue/maxRev)*100}%`, transition:'width 0.5s' }} />
                    </div>
                  </div>
                  <div style={{ fontSize:11, color:C.inkLight, flexShrink:0, width:40, textAlign:'right' }}>{s.count}×</div>
                </div>
              );
            })}
            {topServices.length === 0 && <div style={{ color:C.inkLight, fontSize:13, textAlign:'center', padding:20 }}>No data</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
