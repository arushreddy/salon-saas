import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  IndianRupee, Users, Calendar, TrendingUp, TrendingDown,
  Loader2, Sparkles, Award, Clock, ShoppingBag,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import api from '@/services/api';

const COLORS = ['#C9A96E', '#8FA68E', '#C4727F', '#6366f1', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444'];

const periodOptions = [
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisYear', label: 'This Year' },
];

const formatCurrency = (amount) => {
  if (amount >= 100000) return '\u20B9' + (amount / 100000).toFixed(1) + 'L';
  if (amount >= 1000) return '\u20B9' + (amount / 1000).toFixed(1) + 'K';
  return '\u20B9' + (amount || 0).toLocaleString('en-IN');
};

const AdminAnalytics = () => {
  const [period, setPeriod] = useState('thisMonth');
  const [overview, setOverview] = useState(null);
  const [revenueChart, setRevenueChart] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [staffPerformance, setStaffPerformance] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [bookingStats, setBookingStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [overviewRes, chartRes, servicesRes, staffRes, methodsRes, bookingsRes] = await Promise.all([
        api.get('/analytics/overview', { params: { period } }),
        api.get('/analytics/revenue-chart', { params: { period } }),
        api.get('/analytics/top-services', { params: { period } }),
        api.get('/analytics/staff-performance', { params: { period } }),
        api.get('/analytics/payment-methods', { params: { period } }),
        api.get('/analytics/booking-stats', { params: { period } }),
      ]);

      setOverview(overviewRes.data.overview);
      setRevenueChart(chartRes.data.chart);
      setTopServices(servicesRes.data.services);
      setStaffPerformance(staffRes.data.staff);
      setPaymentMethods(methodsRes.data.methods);
      setBookingStats(bookingsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [period]);

  const methodLabels = { cash: 'Cash', upi: 'UPI', card: 'Card', razorpay: 'Online', other: 'Other' };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-elevated border border-gold/10 px-4 py-3">
          <p className="text-xs font-medium text-charcoal mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.name === 'revenue' ? formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-gold" />
            <span className="text-xs font-medium text-gold tracking-wide uppercase">Analytics</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">Business Analytics</h1>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-charcoal/10 bg-white text-sm font-medium text-charcoal focus:outline-none focus:border-gold/40 self-start"
        >
          {periodOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'Total Revenue',
              value: formatCurrency(overview.revenue.current),
              growth: overview.revenue.growth,
              icon: IndianRupee,
              gradient: 'from-gold/15 to-gold-light/5',
              iconColor: 'text-gold-dark',
            },
            {
              label: 'Bookings',
              value: overview.bookings.current,
              growth: overview.bookings.growth,
              icon: Calendar,
              gradient: 'from-blue-500/10 to-indigo-500/5',
              iconColor: 'text-blue-600',
              sub: `${overview.bookings.completed} completed`,
            },
            {
              label: 'New Customers',
              value: overview.customers.new,
              growth: overview.customers.growth,
              icon: Users,
              gradient: 'from-emerald-500/10 to-teal-500/5',
              iconColor: 'text-emerald-600',
              sub: `${overview.customers.total} total`,
            },
            {
              label: 'Payments',
              value: overview.payments.count,
              icon: ShoppingBag,
              gradient: 'from-violet-500/10 to-purple-500/5',
              iconColor: 'text-violet-600',
              sub: `${overview.bookings.cancelled} cancelled`,
            },
          ].map((card) => {
            const Icon = card.icon;
            const isPositive = card.growth >= 0;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl bg-gradient-to-br ${card.gradient} border border-white/60 p-5 relative overflow-hidden`}
              >
                <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/5" />
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center`}>
                    <Icon size={18} className={card.iconColor} />
                  </div>
                  {card.growth !== undefined && (
                    <span className={`flex items-center gap-0.5 text-xs font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                      {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {Math.abs(card.growth)}%
                    </span>
                  )}
                </div>
                <p className="font-display text-2xl font-bold text-charcoal">{card.value}</p>
                <p className="text-xs text-charcoal-muted mt-0.5">{card.label}</p>
                {card.sub && <p className="text-[11px] text-charcoal-muted/60 mt-1">{card.sub}</p>}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Revenue Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gold/10 p-6 mb-6"
      >
        <h3 className="font-display text-base font-semibold text-charcoal mb-4">Revenue Trend</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe3" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B6B6B' }} axisLine={{ stroke: '#f0ebe3' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6B6B6B' }} axisLine={{ stroke: '#f0ebe3' }} tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="revenue" stroke="#C9A96E" strokeWidth={2.5} dot={{ r: 3, fill: '#C9A96E' }} activeDot={{ r: 6, fill: '#C9A96E', stroke: '#fff', strokeWidth: 2 }} name="revenue" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Two Column: Top Services + Payment Methods */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Top Services */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-gold/10 p-6"
        >
          <h3 className="font-display text-base font-semibold text-charcoal mb-4">Top Services</h3>
          {topServices.length === 0 ? (
            <p className="text-sm text-charcoal-muted text-center py-8">No data for this period</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topServices.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe3" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#6B6B6B' }} tickFormatter={(v) => formatCurrency(v)} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: '#6B6B6B' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" fill="#C9A96E" radius={[0, 6, 6, 0]} name="revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Payment Methods Pie */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-gold/10 p-6"
        >
          <h3 className="font-display text-base font-semibold text-charcoal mb-4">Payment Methods</h3>
          {paymentMethods.length === 0 ? (
            <p className="text-sm text-charcoal-muted text-center py-8">No data for this period</p>
          ) : (
            <div className="flex items-center gap-6">
              <div className="h-52 w-52 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethods.map((m) => ({ name: methodLabels[m._id] || m._id, value: m.total }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {paymentMethods.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {paymentMethods.map((m, i) => (
                  <div key={m._id} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <div>
                      <p className="text-sm font-medium text-charcoal">{methodLabels[m._id] || m._id}</p>
                      <p className="text-xs text-charcoal-muted">{formatCurrency(m.total)} ({m.count} payments)</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Two Column: Staff Leaderboard + Peak Hours */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Staff Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-gold/10 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Award size={18} className="text-gold" />
            <h3 className="font-display text-base font-semibold text-charcoal">Staff Leaderboard</h3>
          </div>
          {staffPerformance.length === 0 ? (
            <p className="text-sm text-charcoal-muted text-center py-8">No data for this period</p>
          ) : (
            <div className="space-y-3">
              {staffPerformance.map((staff, index) => {
                const maxRevenue = staffPerformance[0]?.revenue || 1;
                const percentage = (staff.revenue / maxRevenue) * 100;
                const medals = ['text-amber-500', 'text-gray-400', 'text-amber-700'];

                return (
                  <div key={staff._id} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
                          <span className="text-white font-bold text-xs">{staff.name?.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-charcoal">{staff.name}</p>
                            {index < 3 && (
                              <Award size={14} className={medals[index]} />
                            )}
                          </div>
                          <p className="text-[11px] text-charcoal-muted">{staff.bookings} bookings</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-charcoal">{formatCurrency(staff.revenue)}</p>
                    </div>
                    <div className="w-full h-2 rounded-full bg-cream-dark overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, #C9A96E, #D4BC8B)` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, delay: 0.5 + index * 0.1 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Peak Hours */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl border border-gold/10 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-gold" />
            <h3 className="font-display text-base font-semibold text-charcoal">Peak Hours</h3>
          </div>
          {!bookingStats?.peakHours || bookingStats.peakHours.length === 0 ? (
            <p className="text-sm text-charcoal-muted text-center py-8">No data for this period</p>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingStats.peakHours.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe3" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6B6B6B' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#6B6B6B' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#8FA68E" radius={[6, 6, 0, 0]} name="bookings" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Booking Type Breakdown */}
          {bookingStats?.typeBreakdown && bookingStats.typeBreakdown.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gold/10">
              <p className="text-xs font-semibold text-charcoal-muted uppercase tracking-wider mb-3">Booking Sources</p>
              <div className="flex gap-4">
                {bookingStats.typeBreakdown.map((t) => (
                  <div key={t._id} className="flex-1 bg-cream/50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-charcoal">{t.count}</p>
                    <p className="text-[11px] text-charcoal-muted capitalize">{t._id}</p>
                    <p className="text-[10px] text-gold font-medium">{formatCurrency(t.revenue)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminAnalytics;