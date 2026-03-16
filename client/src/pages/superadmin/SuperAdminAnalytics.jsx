// src/pages/superadmin/SuperAdminAnalytics.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '@/services/api';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { BarChart3, TrendingUp, RefreshCw, Building2, Activity, DollarSign, Crown } from 'lucide-react';

const C = {
  bg: '#0F0D0B', bgCard: '#1A1613', bgCard2: '#211C16',
  border: 'rgba(212,168,75,0.12)',
  gold: '#D4A84B', goldPale: 'rgba(212,168,75,0.08)',
  ink: '#FAF6EF', inkMid: '#C8B896', inkMuted: 'rgba(250,246,239,0.45)',
  purple: '#A78BFA', purplePale: 'rgba(167,139,250,0.10)',
  green: '#34D399', greenPale: 'rgba(52,211,153,0.10)',
  red: '#F87171',
  blue: '#60A5FA', bluePale: 'rgba(96,165,250,0.10)',
  amber: '#FBBF24',
  teal: '#2DD4BF',
};

const PLAN_COLORS = { plan1: C.blue, plan2: C.gold, plan3: C.purple, unset: C.inkMuted };
const PLAN_LABELS = { plan1: 'Basic', plan2: 'Online', plan3: 'Franchise' };

const fmt = (n) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L`
  : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${n}`;

const CustomTooltip = ({ active, payload, label, fmtValue }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.bgCard2, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>
      <div style={{ fontSize: 11, color: C.inkMuted, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color || p.fill }} />
          <span style={{ color: C.inkMid }}>{p.name}:</span>
          <span style={{ color: C.ink, fontWeight: 700 }}>
            {fmtValue ? fmtValue(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const Section = ({ title, icon: Icon, children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    style={{
      background: C.bgCard, borderRadius: 18, border: `1px solid ${C.border}`,
      padding: '22px', boxShadow: '0 2px 20px rgba(0,0,0,0.2)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
      {Icon && <Icon size={16} color={C.gold} />}
      <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{title}</span>
    </div>
    {children}
  </motion.div>
);

export default function SuperAdminAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [months, setMonths] = useState(6);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (m = months, showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await api.get(`/superadmin/analytics?months=${m}`);
      setAnalytics(data.analytics);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const handleMonthsChange = (m) => {
    setMonths(m);
    load(m, true);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 10 }}>
      <RefreshCw size={22} color={C.gold} style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ color: C.inkMuted }}>Loading analytics…</span>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const timeline = analytics?.timeline || [];
  const topSalons = analytics?.topSalons || [];
  const revenueByPlan = analytics?.revenueByPlan || [];

  const totalRev = timeline.reduce((s, d) => s + d.revenue, 0);
  const totalBookings = timeline.reduce((s, d) => s + d.bookings, 0);
  const totalNewSalons = timeline.reduce((s, d) => s + d.newSalons, 0);

  const pieData = revenueByPlan.map(p => ({
    name: PLAN_LABELS[p._id] || p._id || 'Unknown',
    value: p.total,
    color: PLAN_COLORS[p._id] || C.inkMuted,
  }));

  // Compute MoM growth for revenue
  const revenueGrowth = timeline.length >= 2
    ? (() => {
        const last = timeline[timeline.length - 1]?.revenue || 0;
        const prev = timeline[timeline.length - 2]?.revenue || 1;
        return prev > 0 ? Math.round(((last - prev) / prev) * 100) : 0;
      })()
    : 0;

  return (
    <div style={{ padding: '24px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(20px,3vw,27px)', fontWeight: 300, fontStyle: 'italic', color: C.ink, margin: 0 }}>
            Platform Analytics
          </h1>
          <p style={{ fontSize: 13, color: C.inkMuted, margin: '4px 0 0' }}>Revenue, growth, and performance metrics</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[3, 6, 12].map(m => (
            <button key={m} onClick={() => handleMonthsChange(m)} style={{
              padding: '7px 14px', borderRadius: 9, cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
              background: months === m ? C.goldPale : C.bgCard,
              border: `1px solid ${months === m ? C.gold + '40' : C.border}`,
              color: months === m ? C.gold : C.inkMuted,
            }}>
              {m}M
            </button>
          ))}
          <button onClick={() => load(months, true)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: C.bgCard, border: `1px solid ${C.border}`,
            borderRadius: 9, padding: '7px 14px', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, color: C.inkMid,
          }}>
            <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { label: `Revenue (${months}mo)`, value: fmt(totalRev), sub: `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth}% vs prev month`, color: C.gold, icon: DollarSign },
          { label: `Bookings (${months}mo)`, value: totalBookings.toLocaleString('en-IN'), color: C.green, icon: Activity },
          { label: `New Salons (${months}mo)`, value: totalNewSalons, color: C.blue, icon: Building2 },
        ].map(({ label, value, sub, color, icon: Icon }, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            style={{
              background: C.bgCard, borderRadius: 16, padding: '20px',
              border: `1px solid ${C.border}`, boxShadow: '0 2px 20px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}12`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={17} color={color} />
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.ink, letterSpacing: '-0.5px' }}>{value}</div>
            <div style={{ fontSize: 12, color: C.inkMuted, marginTop: 4 }}>{label}</div>
            {sub && <div style={{ fontSize: 11, color: color, marginTop: 4, fontWeight: 600 }}>{sub}</div>}
          </motion.div>
        ))}
      </div>

      {/* Revenue + Bookings combined */}
      <div style={{ marginBottom: 18 }}>
        <Section title="Revenue & Bookings Trend" icon={TrendingUp} delay={0.2}>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={timeline} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.gold} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={C.gold} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: C.inkMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="rev" tick={{ fill: C.inkMuted, fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
              <YAxis yAxisId="book" orientation="right" tick={{ fill: C.inkMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip fmtValue={fmt} />} />
              <Legend
                formatter={(v) => <span style={{ color: C.inkMid, fontSize: 12 }}>{v}</span>}
                wrapperStyle={{ paddingTop: 12 }}
              />
              <Area yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue" stroke={C.gold} strokeWidth={2.5} fill="url(#revGrad2)" dot={false} />
              <Bar yAxisId="book" dataKey="bookings" name="Bookings" fill={`${C.blue}60`} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </ComposedChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* Salon growth + revenue by plan */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
        <Section title="Salon Growth" icon={Building2} delay={0.3}>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={timeline} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="salonGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.green} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: C.inkMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.inkMuted, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="newSalons" name="New Salons" stroke={C.green}
                strokeWidth={2.5} fill="url(#salonGrad)" dot={false} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Revenue by Plan" icon={BarChart3} delay={0.35}>
          {pieData.length === 0 ? (
            <div style={{ height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.inkMuted, fontSize: 13 }}>
              No revenue data yet
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <PieChart width={180} height={180}>
                <Pie data={pieData} cx={85} cy={85} innerRadius={52} outerRadius={78}
                  paddingAngle={4} dataKey="value">
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v) => [fmt(v), 'Revenue']} contentStyle={{ background: C.bgCard2, border: `1px solid ${C.border}`, borderRadius: 8 }} />
              </PieChart>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pieData.map((p, i) => {
                  const total = pieData.reduce((s, d) => s + d.value, 0);
                  const pct = total > 0 ? Math.round((p.value / total) * 100) : 0;
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
                          <span style={{ color: C.inkMid }}>{p.name}</span>
                        </div>
                        <span style={{ fontWeight: 700, color: p.color }}>{fmt(p.value)}</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: C.bgCard2 }}>
                        <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: p.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Section>
      </div>

      {/* Top salons */}
      {topSalons.length > 0 && (
        <Section title="Top Salons by Revenue" icon={Crown} delay={0.4}>
          <div>
            {topSalons.map((s, i) => {
              const maxRev = topSalons[0]?.revenue || 1;
              const color = PLAN_COLORS[s.plan] || C.gold;
              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '24px 1fr 160px 120px',
                  alignItems: 'center', gap: 16,
                  padding: '13px 0',
                  borderBottom: i < topSalons.length - 1 ? `1px solid ${C.border}` : 'none',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: C.inkMuted }}>{i + 1}</span>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{s.name || 'Unknown Salon'}</span>
                    <span style={{
                      marginLeft: 8, fontSize: 10, fontWeight: 700,
                      color, background: `${color}15`, borderRadius: 4, padding: '2px 7px',
                    }}>
                      {PLAN_LABELS[s.plan] || s.plan}
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: C.bgCard2 }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      width: `${Math.round((s.revenue / maxRev) * 100)}%`,
                      background: `linear-gradient(90deg, ${C.gold}, ${C.amber})`,
                    }} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.gold, textAlign: 'right' }}>
                    {fmt(s.revenue)}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}