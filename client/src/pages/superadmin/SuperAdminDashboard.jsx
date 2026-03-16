// src/pages/superadmin/SuperAdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '@/services/api';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Building2, Users, ShieldAlert, ShieldCheck, TrendingUp,
  RefreshCw, CreditCard, GitBranch, Zap, Crown, Star,
  ArrowUpRight, CalendarX, Activity, DollarSign, BarChart3,
} from 'lucide-react';

const C = {
  bg: '#0F0D0B', bgCard: '#1A1613', bgCard2: '#211C16',
  border: 'rgba(212,168,75,0.12)', borderHover: 'rgba(212,168,75,0.22)',
  gold: '#D4A84B', goldDim: '#B8892A', goldPale: 'rgba(212,168,75,0.08)',
  ink: '#FAF6EF', inkMid: '#C8B896', inkMuted: 'rgba(250,246,239,0.45)',
  purple: '#A78BFA', purplePale: 'rgba(167,139,250,0.10)',
  green: '#34D399', greenPale: 'rgba(52,211,153,0.10)',
  red: '#F87171', redPale: 'rgba(248,113,113,0.10)',
  blue: '#60A5FA', bluePale: 'rgba(96,165,250,0.10)',
  amber: '#FBBF24', amberPale: 'rgba(251,191,36,0.10)',
};

const PLAN_COLORS = {
  plan1: C.blue,
  plan2: C.gold,
  plan3: C.purple,
  unset: C.inkMuted,
};
const PLAN_LABELS = { plan1: 'Basic', plan2: 'Online', plan3: 'Franchise', unset: 'Unset' };

const fmt = (n) => n >= 10000000 ? `₹${(n / 10000000).toFixed(1)}Cr`
  : n >= 100000 ? `₹${(n / 100000).toFixed(1)}L`
  : n >= 1000   ? `₹${(n / 1000).toFixed(1)}K`
  : `₹${n}`;

const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;

const StatCard = ({ icon: Icon, label, value, sub, color, pale, trend, delay = 0, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.38 }}
    whileHover={{ y: -2 }}
    onClick={onClick}
    style={{
      background: C.bgCard, borderRadius: 16, padding: '18px 20px',
      border: `1px solid ${C.border}`, cursor: onClick ? 'pointer' : 'default',
      boxShadow: '0 2px 20px rgba(0,0,0,0.25)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 11,
        background: pale || C.goldPale,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${color}25`,
      }}>
        <Icon size={18} color={color || C.gold} strokeWidth={2} />
      </div>
      {trend !== undefined && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 3,
          fontSize: 11, fontWeight: 600,
          color: trend >= 0 ? C.green : C.red,
        }}>
          <ArrowUpRight size={12} style={{ transform: trend < 0 ? 'rotate(90deg)' : 'none' }} />
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div style={{ fontSize: 26, fontWeight: 700, color: C.ink, letterSpacing: '-0.5px', marginBottom: 4 }}>
      {value ?? '—'}
    </div>
    <div style={{ fontSize: 12, color: C.inkMuted }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: color || C.gold, marginTop: 4, fontWeight: 500 }}>{sub}</div>}
  </motion.div>
);

const ChartCard = ({ title, icon: Icon, children, action, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    style={{
      background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`,
      padding: 20, boxShadow: '0 2px 20px rgba(0,0,0,0.2)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {Icon && <Icon size={15} color={C.gold} />}
        <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{title}</span>
      </div>
      {action}
    </div>
    {children}
  </motion.div>
);

const CustomTooltip = ({ active, payload, label, valueFormatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.bgCard2, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    }}>
      <div style={{ fontSize: 11, color: C.inkMuted, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
          <span style={{ color: C.inkMid }}>{p.name}:</span>
          <span style={{ color: C.ink, fontWeight: 600 }}>
            {valueFormatter ? valueFormatter(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [statsRes, analyticsRes] = await Promise.all([
        api.get('/superadmin/stats'),
        api.get('/superadmin/analytics?months=6'),
      ]);
      setStats(statsRes.data.stats);
      setAnalytics(analyticsRes.data.analytics);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <RefreshCw size={22} color={C.gold} style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const planBreakdown = stats?.planBreakdown || {};
  const pieData = Object.entries(planBreakdown)
    .filter(([k]) => k !== '__v')
    .map(([key, count]) => ({ name: PLAN_LABELS[key] || key, value: count, color: PLAN_COLORS[key] || C.inkMuted }));

  const topSalons = analytics?.topSalons || [];
  const timeline = analytics?.timeline || [];

  return (
    <div style={{ padding: '24px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{
            fontFamily: 'Cormorant Garamond, Georgia, serif',
            fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 300, fontStyle: 'italic',
            color: C.ink, margin: 0, letterSpacing: '-0.3px',
          }}>
            Platform Overview
          </h1>
          <p style={{ fontSize: 13, color: C.inkMuted, margin: '4px 0 0' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: C.goldPale, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '8px 16px',
            fontSize: 12, fontWeight: 600, color: C.gold,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px,1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard
          icon={Building2} label="Total Salons"
          value={stats?.totalSalons} sub={`${stats?.activeSalons} active`}
          color={C.gold} pale={C.goldPale} delay={0}
          onClick={() => navigate('/superadmin/salons')}
        />
        <StatCard
          icon={ShieldCheck} label="Active Salons"
          value={stats?.activeSalons}
          sub={`${pct(stats?.activeSalons, stats?.totalSalons)}% of total`}
          color={C.green} pale={C.greenPale} delay={0.05}
        />
        <StatCard
          icon={ShieldAlert} label="Suspended"
          value={stats?.suspendedSalons}
          color={C.red} pale={C.redPale} delay={0.1}
          onClick={() => navigate('/superadmin/salons?status=suspended')}
        />
        <StatCard
          icon={CalendarX} label="Expired Subs"
          value={stats?.expiredSubs}
          color={C.amber} pale={C.amberPale} delay={0.15}
          onClick={() => navigate('/superadmin/salons?status=expired')}
        />
        <StatCard
          icon={DollarSign} label="Total Revenue"
          value={fmt(stats?.totalRevenue || 0)}
          color={C.purple} pale={C.purplePale} delay={0.2}
        />
        <StatCard
          icon={TrendingUp} label="This Month (MRR)"
          value={fmt(stats?.mrr || 0)}
          color={C.blue} pale={C.bluePale} delay={0.25}
        />
        <StatCard
          icon={Users} label="Total Users"
          value={stats?.totalUsers}
          color={C.inkMid} pale="rgba(200,184,150,0.10)" delay={0.3}
          onClick={() => navigate('/superadmin/users')}
        />
        <StatCard
          icon={GitBranch} label="Franchises"
          value={stats?.totalFranchises}
          color={C.purple} pale={C.purplePale} delay={0.35}
          onClick={() => navigate('/superadmin/franchises')}
        />
        <StatCard
          icon={Zap} label="New This Month"
          value={stats?.newThisMonth}
          sub="new salons"
          color={C.green} pale={C.greenPale} delay={0.4}
        />
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Revenue chart */}
        <ChartCard title="Revenue Trend" icon={TrendingUp} delay={0.45}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={timeline} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.gold} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.gold} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: C.inkMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.inkMuted, fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
              <Tooltip content={<CustomTooltip valueFormatter={fmt} />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke={C.gold}
                strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: C.gold }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Salon growth chart */}
        <ChartCard title="Salon Growth" icon={Building2} delay={0.5}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={timeline} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: C.inkMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.inkMuted, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="newSalons" name="New Salons" fill={C.blue} radius={[5, 5, 0, 0]}
                maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Booking activity */}
        <ChartCard title="Booking Activity" icon={Activity} delay={0.55}>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={timeline} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: C.inkMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.inkMuted, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="bookings" name="Bookings" stroke={C.green}
                strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: C.green }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Plan distribution */}
        <ChartCard title="Plans Distribution" icon={CreditCard} delay={0.6}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <PieChart width={140} height={140}>
              <Pie data={pieData} cx={65} cy={65} innerRadius={42} outerRadius={62}
                paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pieData.map((p) => (
                <div key={p.name} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontSize: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
                    <span style={{ color: C.inkMid }}>{p.name}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: p.color }}>{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Top Salons */}
      {topSalons.length > 0 && (
        <ChartCard title="Top Performing Salons" icon={Crown} delay={0.65}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {topSalons.map((s, i) => {
              const maxRev = topSalons[0]?.revenue || 1;
              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '24px 1fr 140px 100px',
                  alignItems: 'center', gap: 14,
                  padding: '12px 0',
                  borderBottom: i < topSalons.length - 1 ? `1px solid ${C.border}` : 'none',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.inkMuted }}>{i + 1}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{s.name || 'Unknown'}</div>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2,
                      fontSize: 10, fontWeight: 600,
                      color: PLAN_COLORS[s.plan] || C.inkMuted,
                      background: `${PLAN_COLORS[s.plan] || C.inkMuted}18`,
                      borderRadius: 4, padding: '1px 6px',
                    }}>
                      {PLAN_LABELS[s.plan] || s.plan}
                    </div>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: C.bgCard2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      width: `${pct(s.revenue, maxRev)}%`,
                      background: `linear-gradient(90deg, ${C.gold}, ${C.goldDim})`,
                    }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, textAlign: 'right' }}>
                    {fmt(s.revenue)}
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}