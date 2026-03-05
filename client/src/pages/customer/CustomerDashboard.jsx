import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { CalendarPlus, History, Star, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';

const quickActions = [
  {
    label: 'Book Appointment',
    description: 'Schedule your next visit',
    icon: CalendarPlus,
    path: '/dashboard/book',
    color: 'text-gold',
    bg: 'bg-gold/10',
  },
  {
    label: 'My Bookings',
    description: 'View upcoming & past visits',
    icon: History,
    path: '/dashboard/bookings',
    color: 'text-sage',
    bg: 'bg-sage/10',
  },
  {
    label: 'Loyalty Points',
    description: 'Check your rewards',
    icon: Star,
    path: '/dashboard/profile',
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
  {
    label: 'Offers',
    description: 'Exclusive deals for you',
    icon: Gift,
    path: '/dashboard/profile',
    color: 'text-rose',
    bg: 'bg-rose/10',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 0.61, 0.36, 1] } },
};

const CustomerDashboard = () => {
  const { user } = useAuth();

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-charcoal">
          Welcome back, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-charcoal-muted text-sm mt-1">
          Ready for your next salon visit?
        </p>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <motion.div key={action.label} variants={itemVariants}>
              <Link
                to={action.path}
                className="glass-card rounded-2xl p-6 flex items-start gap-4 hover:shadow-card transition-all duration-300 group block"
              >
                <div className={`w-12 h-12 rounded-xl ${action.bg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                  <Icon size={22} className={action.color} />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-charcoal group-hover:text-gold transition-colors">
                    {action.label}
                  </h3>
                  <p className="text-sm text-charcoal-muted mt-0.5">{action.description}</p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* No Bookings Yet */}
      <motion.div variants={itemVariants} className="glass-card rounded-2xl p-8 text-center">
        <History size={40} className="text-gold/30 mx-auto mb-4" />
        <h3 className="font-display text-lg font-semibold text-charcoal mb-1">No Recent Bookings</h3>
        <p className="text-charcoal-muted text-sm mb-5">You haven't made any bookings yet. Book your first appointment!</p>
        <Link
          to="/dashboard/book"
          className="inline-flex luxury-gradient text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-gold"
        >
          Book Now
        </Link>
      </motion.div>
    </motion.div>
  );
};

export default CustomerDashboard;