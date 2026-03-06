import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Calendar, Filter, Plus, UserPlus, Sparkles, Ticket, Check, Percent } from 'lucide-react';
import api from '@/services/api';
import BookingCard from '@/components/BookingCard';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [typeFilter, setTypeFilter] = useState('');
  const [stats, setStats] = useState(null);
  const [showWalkIn, setShowWalkIn] = useState(false);

  const [walkInForm, setWalkInForm] = useState({
    customerName: '',
    customerPhone: '',
    serviceId: '',
    paymentMethod: 'cash',
    notes: '',
    couponCode: '',
    manualDiscountPercent: 0,
  });

  const [services, setServices] = useState([]);
  const [walkInLoading, setWalkInLoading] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;
      if (typeFilter) params.type = typeFilter;
      const { data } = await api.get('/bookings', { params });
      setBookings(data.bookings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFilter, typeFilter]);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/bookings/today/stats');
      setStats(data.stats);
    } catch (err) { console.error(err); }
  };

  const fetchServices = async () => {
    try {
      const { data } = await api.get('/services');
      setServices(data.services);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  useEffect(() => { fetchStats(); fetchServices(); }, []);

  // Get selected service base price
  const getServicePrice = () => {
    if (!walkInForm.serviceId) return 0;
    const s = services.find(sv => sv._id === walkInForm.serviceId);
    return s ? (s.discountPrice || s.price) : 0;
  };

  // Calculate final price with manual discount
  const getFinalPrice = () => {
    let price = getServicePrice();
    if (appliedCoupon) price = appliedCoupon.finalAmount;
    if (walkInForm.manualDiscountPercent > 0) {
      const discountAmt = Math.round(price * walkInForm.manualDiscountPercent / 100);
      price = price - discountAmt;
    }
    return price;
  };

  const getManualDiscountAmount = () => {
    const price = appliedCoupon ? appliedCoupon.finalAmount : getServicePrice();
    return Math.round(price * walkInForm.manualDiscountPercent / 100);
  };

  const handleVerifyCoupon = async () => {
    if (!walkInForm.couponCode || !walkInForm.serviceId) {
      alert("Please select a service and enter a coupon code first.");
      return;
    }
    try {
      setCouponLoading(true);
      const amount = getServicePrice();
      const { data } = await api.post('/coupons/validate', {
        code: walkInForm.couponCode,
        amount,
      });
      setAppliedCoupon(data.coupon);
    } catch (err) {
      alert(err.response?.data?.message || "Invalid coupon code");
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleStatusChange = async (bookingId, status, paymentMethod, paymentStatus) => {
    try {
      const body = { status };
      if (paymentMethod) body.paymentMethod = paymentMethod;
      if (paymentStatus) body.paymentStatus = paymentStatus;
      await api.patch(`/bookings/${bookingId}/status`, body);
      if (status === 'completed' && paymentMethod) {
        try {
          await api.post('/payments/mark-paid', { bookingId, method: paymentMethod });
        } catch (e) { console.error('Payment record failed:', e); }
      }
      fetchBookings();
      fetchStats();
    } catch (err) { console.error(err); }
  };

  const handleWalkIn = async (e) => {
    e.preventDefault();
    if (!walkInForm.serviceId) return;
    try {
      setWalkInLoading(true);
      const payload = {
        customerName: walkInForm.customerName,
        customerPhone: walkInForm.customerPhone,
        serviceId: walkInForm.serviceId,
        paymentMethod: walkInForm.paymentMethod,
        notes: walkInForm.notes,
        couponCode: appliedCoupon ? walkInForm.couponCode : '',
        manualDiscountPercent: walkInForm.manualDiscountPercent,
      };
      await api.post('/bookings/walk-in', payload);
      setShowWalkIn(false);
      setWalkInForm({ customerName: '', customerPhone: '', serviceId: '', paymentMethod: 'cash', notes: '', couponCode: '', manualDiscountPercent: 0 });
      setAppliedCoupon(null);
      fetchBookings();
      fetchStats();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Booking failed");
    } finally {
      setWalkInLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-gold" />
            <span className="text-xs font-medium text-gold tracking-wide uppercase">Appointments</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">Manage Bookings</h1>
        </div>
        <button
          onClick={() => setShowWalkIn(!showWalkIn)}
          className="luxury-gradient text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity shadow-gold self-start"
        >
          <UserPlus size={16} />
          Walk-in Billing
        </button>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-charcoal' },
            { label: 'Confirmed', value: stats.confirmed, color: 'text-blue-600' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-amber-600' },
            { label: 'Completed', value: stats.completed, color: 'text-emerald-600' },
            { label: 'Cancelled', value: stats.cancelled, color: 'text-red-500' },
            { label: 'Revenue', value: `₹${stats.todayRevenue?.toLocaleString('en-IN')}`, color: 'text-gold' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gold/10 p-3 text-center">
              <p className={`font-display text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-charcoal-muted">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Walk-in Form */}
      {showWalkIn && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white rounded-2xl border border-gold/10 p-5 mb-6 shadow-sm"
        >
          <h3 className="font-display text-base font-semibold text-charcoal mb-4">Quick Walk-in Billing</h3>
          <form onSubmit={handleWalkIn} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Customer Name"
              value={walkInForm.customerName}
              onChange={(e) => setWalkInForm({ ...walkInForm, customerName: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-charcoal/10 bg-cream/50 text-sm focus:outline-none focus:border-gold/40"
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={walkInForm.customerPhone}
              onChange={(e) => setWalkInForm({ ...walkInForm, customerPhone: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-charcoal/10 bg-cream/50 text-sm focus:outline-none focus:border-gold/40"
            />
            <select
              value={walkInForm.serviceId}
              onChange={(e) => {
                setWalkInForm({ ...walkInForm, serviceId: e.target.value, couponCode: '', manualDiscountPercent: 0 });
                setAppliedCoupon(null);
              }}
              className="px-4 py-2.5 rounded-xl border border-charcoal/10 bg-cream/50 text-sm focus:outline-none focus:border-gold/40"
            >
              <option value="">Select Service</option>
              {services.map((s) => (
                <option key={s._id} value={s._id}>{s.name} — ₹{(s.discountPrice || s.price).toLocaleString('en-IN')}</option>
              ))}
            </select>

            {/* Coupon Code */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Ticket size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40" />
                <input
                  type="text"
                  placeholder="Coupon Code (optional)"
                  value={walkInForm.couponCode}
                  onChange={(e) => {
                    setWalkInForm({ ...walkInForm, couponCode: e.target.value.toUpperCase() });
                    setAppliedCoupon(null);
                  }}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-charcoal/10 bg-cream/50 text-sm focus:outline-none focus:border-gold/40"
                />
              </div>
              <button
                type="button"
                onClick={handleVerifyCoupon}
                disabled={!walkInForm.couponCode || !walkInForm.serviceId}
                className="bg-charcoal text-white px-3 rounded-xl hover:bg-charcoal/90 transition-colors disabled:opacity-40"
              >
                {couponLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              </button>
            </div>

            {/* Manual Discount (0–10%) */}
            <div className="relative">
              <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40" />
              <input
                type="number"
                placeholder="Special Discount % (max 10)"
                min={0}
                max={10}
                value={walkInForm.manualDiscountPercent || ''}
                onChange={(e) => {
                  const val = Math.min(10, Math.max(0, Number(e.target.value)));
                  setWalkInForm({ ...walkInForm, manualDiscountPercent: val });
                }}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-charcoal/10 bg-cream/50 text-sm focus:outline-none focus:border-gold/40"
              />
            </div>

            <select
              value={walkInForm.paymentMethod}
              onChange={(e) => setWalkInForm({ ...walkInForm, paymentMethod: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-charcoal/10 bg-cream/50 text-sm focus:outline-none focus:border-gold/40"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
            </select>

            <input
              type="text"
              placeholder="Notes (optional)"
              value={walkInForm.notes}
              onChange={(e) => setWalkInForm({ ...walkInForm, notes: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-charcoal/10 bg-cream/50 text-sm focus:outline-none focus:border-gold/40 sm:col-span-2 lg:col-span-1"
            />

            {/* Discount Summary */}
            {(appliedCoupon || walkInForm.manualDiscountPercent > 0) && walkInForm.serviceId && (
              <div className="sm:col-span-2 lg:col-span-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-emerald-700 mb-1">Discount Summary</p>
                <div className="flex justify-between text-xs text-emerald-600">
                  <span>Original Price</span>
                  <span>₹{getServicePrice().toLocaleString('en-IN')}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-xs text-emerald-600">
                    <span>Coupon ({appliedCoupon.code}) discount</span>
                    <span>-₹{(getServicePrice() - appliedCoupon.finalAmount).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {walkInForm.manualDiscountPercent > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600">
                    <span>Special Discount ({walkInForm.manualDiscountPercent}%)</span>
                    <span>-₹{getManualDiscountAmount().toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-emerald-700 pt-1 border-t border-emerald-200">
                  <span>Final Amount</span>
                  <span>₹{getFinalPrice().toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={walkInLoading || !walkInForm.serviceId}
              className="luxury-gradient text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40 sm:col-span-2 lg:col-span-3"
            >
              {walkInLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create Billing — ₹{getFinalPrice().toLocaleString('en-IN')}
            </button>
          </form>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-charcoal/10 bg-white/80 text-sm focus:outline-none focus:border-gold/40"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-charcoal/10 bg-white/80 text-sm focus:outline-none focus:border-gold/40"
        >
          <option value="">All Status</option>
          <option value="confirmed">Confirmed</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-charcoal/10 bg-white/80 text-sm focus:outline-none focus:border-gold/40"
        >
          <option value="">All Types</option>
          <option value="online">Online</option>
          <option value="walk-in">Walk-in</option>
        </select>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gold/10 p-12 text-center">
          <Calendar size={40} className="text-gold/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-charcoal mb-1">No Bookings Found</h3>
          <p className="text-charcoal-muted text-sm">No bookings for the selected filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {bookings.map((booking, i) => (
            <motion.div
              key={booking._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <BookingCard
                booking={booking}
                onStatusChange={handleStatusChange}
                showActions={true}
                role="admin"
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminBookings;