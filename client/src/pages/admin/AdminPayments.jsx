import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  IndianRupee, CreditCard, Banknote, Smartphone, Globe,
  Loader2, Filter, Sparkles, TrendingUp, Clock, RefreshCw,
  CheckCircle2, XCircle, ArrowUpRight,
} from 'lucide-react';
import api from '@/services/api';

const methodIcons = {
  cash: { icon: Banknote, label: 'Cash', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  upi: { icon: Smartphone, label: 'UPI', color: 'text-violet-600', bg: 'bg-violet-50' },
  card: { icon: CreditCard, label: 'Card', color: 'text-blue-600', bg: 'bg-blue-50' },
  razorpay: { icon: Globe, label: 'Razorpay', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  other: { icon: IndianRupee, label: 'Other', color: 'text-charcoal-muted', bg: 'bg-gray-50' },
};

const statusStyles = {
  completed: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Paid' },
  pending: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Pending' },
  failed: { color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', label: 'Failed' },
  refunded: { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Refunded' },
};

const AdminPayments = () => {
  const [dashboard, setDashboard] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const fetchDashboard = async () => {
    try {
      const { data } = await api.get('/payments/dashboard');
      setDashboard(data.dashboard);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (methodFilter) params.method = methodFilter;
      if (statusFilter) params.status = statusFilter;
      if (dateFilter) {
        params.startDate = dateFilter;
        params.endDate = dateFilter;
      }
      const { data } = await api.get('/payments', { params });
      setPayments(data.payments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);
  useEffect(() => { fetchPayments(); }, [methodFilter, statusFilter, dateFilter]);

  const handleRefund = async (paymentId) => {
    if (!confirm('Refund this payment? This action cannot be undone.')) return;
    try {
      await api.post('/payments/refund', { paymentId, reason: 'Admin initiated refund' });
      fetchPayments();
      fetchDashboard();
    } catch (err) {
      alert(err.response?.data?.message || 'Refund failed');
    }
  };

  const formatCurrency = (amount) => {
    return '\u20B9' + (amount || 0).toLocaleString('en-IN');
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} className="text-gold" />
          <span className="text-xs font-medium text-gold tracking-wide uppercase">Payments</span>
        </div>
        <h1 className="font-display text-2xl font-semibold text-charcoal">Payment Dashboard</h1>
      </div>

      {/* Revenue Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Today's Revenue", value: formatCurrency(dashboard.today?.revenue), sub: `${dashboard.today?.count || 0} payments`, gradient: 'from-gold/10 to-gold-light/5', iconColor: 'text-gold', icon: IndianRupee },
            { label: 'This Week', value: formatCurrency(dashboard.thisWeek?.revenue), sub: `${dashboard.thisWeek?.count || 0} payments`, gradient: 'from-emerald-500/10 to-teal-500/5', iconColor: 'text-emerald-600', icon: TrendingUp },
            { label: 'This Month', value: formatCurrency(dashboard.thisMonth?.revenue), sub: `${dashboard.thisMonth?.count || 0} payments`, gradient: 'from-violet-500/10 to-purple-500/5', iconColor: 'text-violet-600', icon: ArrowUpRight },
            { label: 'Pending', value: formatCurrency(dashboard.pending?.amount), sub: `${dashboard.pending?.count || 0} unpaid`, gradient: 'from-amber-500/10 to-orange-500/5', iconColor: 'text-amber-600', icon: Clock },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl bg-gradient-to-br ${card.gradient} border border-white/60 p-5`}
              >
                <div className={`w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center mb-3`}>
                  <Icon size={18} className={card.iconColor} />
                </div>
                <p className="font-display text-2xl font-bold text-charcoal">{card.value}</p>
                <p className="text-xs text-charcoal-muted mt-0.5">{card.label}</p>
                <p className="text-[11px] text-charcoal-muted/70 mt-1">{card.sub}</p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Method Breakdown */}
      {dashboard?.byMethod && dashboard.byMethod.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {dashboard.byMethod.map((m) => {
            const methodInfo = methodIcons[m._id] || methodIcons.other;
            const Icon = methodInfo.icon;
            return (
              <div key={m._id} className="bg-white rounded-xl border border-gold/10 p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${methodInfo.bg} flex items-center justify-center`}>
                  <Icon size={16} className={methodInfo.color} />
                </div>
                <div>
                  <p className="text-sm font-bold text-charcoal">{formatCurrency(m.total)}</p>
                  <p className="text-[11px] text-charcoal-muted">{methodInfo.label} ({m.count})</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-charcoal/10 bg-white/80 text-sm focus:outline-none focus:border-gold/40"
        />
        <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-charcoal/10 bg-white/80 text-sm focus:outline-none focus:border-gold/40">
          <option value="">All Methods</option>
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="razorpay">Razorpay</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-charcoal/10 bg-white/80 text-sm focus:outline-none focus:border-gold/40">
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Payments Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gold/10 p-12 text-center">
          <IndianRupee size={40} className="text-gold/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-charcoal mb-1">No Payments Found</h3>
          <p className="text-charcoal-muted text-sm">Payments will appear here as bookings are completed</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gold/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-cream/50">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider">Customer</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider">Amount</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider">Method</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, i) => {
                  const methodInfo = methodIcons[payment.method] || methodIcons.other;
                  const MethodIcon = methodInfo.icon;
                  const status = statusStyles[payment.status] || statusStyles.pending;
                  return (
                    <motion.tr
                      key={payment._id}
                      className="border-b border-gold/5 last:border-0 hover:bg-cream/30 transition-colors"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-gold">{payment.customer?.name?.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-charcoal">{payment.customer?.name}</p>
                            <p className="text-[11px] text-charcoal-muted">{payment.customer?.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-bold text-charcoal">{formatCurrency(payment.amount)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${methodInfo.bg} ${methodInfo.color}`}>
                          <MethodIcon size={12} />
                          {methodInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${status.bg} ${status.color} ${status.border}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-charcoal-muted">
                        {new Date(payment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {' '}
                        {new Date(payment.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3.5">
                        {payment.status === 'completed' && (
                          <button
                            onClick={() => handleRefund(payment._id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <RefreshCw size={12} />
                            Refund
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;