import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  Calendar,
  Users,
  IndianRupee,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';

const statsCards = [
  {
    label: "Today's Bookings",
    value: '12',
    change: '+3 from yesterday',
    trend: 'up',
    icon: Calendar,
    gradient: 'from-amber-500/10 to-orange-500/5',
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-600',
  },
  {
    label: 'Total Customers',
    value: '248',
    change: '+18 this month',
    trend: 'up',
    icon: Users,
    gradient: 'from-emerald-500/10 to-teal-500/5',
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-600',
  },
  {
    label: "Today's Revenue",
    value: '\u20B915,400',
    change: '+12% vs last week',
    trend: 'up',
    icon: IndianRupee,
    gradient: 'from-gold/10 to-gold-light/5',
    iconBg: 'bg-gold/15',
    iconColor: 'text-gold-dark',
  },
  {
    label: 'Monthly Revenue',
    value: '\u20B92,84,000',
    change: '+8% vs last month',
    trend: 'up',
    icon: TrendingUp,
    gradient: 'from-violet-500/10 to-purple-500/5',
    iconBg: 'bg-violet-500/15',
    iconColor: 'text-violet-600',
  },
];

const recentBookings = [
  { id: 1, customer: 'Priya Sharma', service: 'Hair Spa + Cut', time: '10:00 AM', status: 'confirmed', stylist: 'Neha', amount: 1700 },
  { id: 2, customer: 'Anita Reddy', service: 'Bridal Makeup', time: '11:30 AM', status: 'in-progress', stylist: 'Ritu', amount: 12999 },
  { id: 3, customer: 'Meera Patel', service: 'Manicure + Pedicure', time: '1:00 PM', status: 'confirmed', stylist: 'Sana', amount: 1100 },
  { id: 4, customer: 'Kavya Nair', service: 'Hair Color', time: '2:30 PM', status: 'cancelled', stylist: 'Neha', amount: 2200 },
  { id: 5, customer: 'Deepa Gupta', service: 'Facial + Cleanup', time: '4:00 PM', status: 'confirmed', stylist: 'Ritu', amount: 800 },
];

const statusConfig = {
  'confirmed': { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', label: 'Confirmed' },
  'in-progress': { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', label: 'In Progress' },
  'cancelled': { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100', label: 'Cancelled' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 0.61, 0.36, 1] } },
};

const AdminDashboard = () => {
  const { user } = useAuth();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-gold" />
          <span className="text-xs font-medium text-gold tracking-wide uppercase">Dashboard Overview</span>
        </div>
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-charcoal">
          {greeting}, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-charcoal-muted text-sm mt-1">
          Here's what's happening at your salon today
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-5 mb-8">
        {statsCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              variants={itemVariants}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} border border-white/60 p-5 hover:shadow-lg transition-all duration-500 group`}
              style={{ backdropFilter: 'blur(10px)', boxShadow: '0 1px 20px rgba(0,0,0,0.03)' }}
            >
              {/* Background decoration */}
              <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/5 group-hover:bg-white/10 transition-all duration-500" />

              <div className="flex items-start justify-between mb-4 relative">
                <div className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                  <Icon size={20} className={card.iconColor} />
                </div>
                <div className={`flex items-center gap-0.5 text-xs font-medium ${
                  card.trend === 'up' ? 'text-emerald-600' : 'text-red-500'
                }`}>
                  {card.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                </div>
              </div>
              <p className="font-display text-2xl font-bold text-charcoal relative">{card.value}</p>
              <p className="text-xs text-charcoal-muted mt-1 relative">{card.label}</p>
              <p className={`text-[11px] mt-2 font-medium relative ${
                card.trend === 'up' ? 'text-emerald-600' : 'text-red-500'
              }`}>{card.change}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Bookings */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gold/10 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-gold/10 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-charcoal">Today's Bookings</h2>
            <p className="text-xs text-charcoal-muted mt-0.5">Manage and track appointments</p>
          </div>
          <span className="text-xs font-medium text-gold bg-gold/10 px-3 py-1 rounded-full">
            {recentBookings.length} bookings
          </span>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-cream/50">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider">Customer</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider">Service</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider">Stylist</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider">Time</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider">Amount</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((booking, index) => {
                const status = statusConfig[booking.status];
                const StatusIcon = status.icon;
                return (
                  <motion.tr
                    key={booking.id}
                    className="border-b border-gold/5 last:border-0 hover:bg-cream/30 transition-colors"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                          <span className="text-xs font-semibold text-gold">
                            {booking.customer.charAt(0)}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-charcoal">{booking.customer}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-charcoal-muted">{booking.service}</td>
                    <td className="px-5 py-3.5 text-sm text-charcoal-muted">{booking.stylist}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-charcoal">{booking.time}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-charcoal">{'\u20B9'}{booking.amount.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${status.bg} ${status.color} border ${status.border}`}>
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden p-4 space-y-3">
          {recentBookings.map((booking) => {
            const status = statusConfig[booking.status];
            const StatusIcon = status.icon;
            return (
              <div key={booking.id} className="bg-cream/50 rounded-xl p-4 border border-gold/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-gold">{booking.customer.charAt(0)}</span>
                    </div>
                    <p className="text-sm font-medium text-charcoal">{booking.customer}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium ${status.bg} ${status.color} border ${status.border}`}>
                    <StatusIcon size={11} />
                    {status.label}
                  </span>
                </div>
                <p className="text-xs text-charcoal-muted">{booking.service}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-charcoal-muted">Stylist: {booking.stylist}</p>
                  <div className="flex items-center gap-3">
                    <p className="text-xs font-semibold text-charcoal">{'\u20B9'}{booking.amount.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-gold font-medium">{booking.time}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AdminDashboard;