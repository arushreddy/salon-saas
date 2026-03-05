import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

const todayAppointments = [
  { id: 1, customer: 'Priya Sharma', service: 'Hair Spa + Cut', time: '10:00 AM', duration: '60 min', status: 'upcoming' },
  { id: 2, customer: 'Anita Reddy', service: 'Bridal Makeup', time: '11:30 AM', duration: '90 min', status: 'in-progress' },
  { id: 3, customer: 'Meera Patel', service: 'Manicure + Pedicure', time: '1:00 PM', duration: '45 min', status: 'upcoming' },
  { id: 4, customer: 'Deepa Gupta', service: 'Facial + Cleanup', time: '4:00 PM', duration: '60 min', status: 'upcoming' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 0.61, 0.36, 1] } },
};

const StaffDashboard = () => {
  const { user } = useAuth();

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-charcoal">
          Hello, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-charcoal-muted text-sm mt-1">
          Here's your schedule for today
        </p>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Today', value: '4', icon: Calendar, bg: 'bg-gold/10', color: 'text-gold' },
          { label: 'Completed', value: '0', icon: CheckCircle2, bg: 'bg-success/10', color: 'text-success' },
          { label: 'In Progress', value: '1', icon: Clock, bg: 'bg-warning/10', color: 'text-warning' },
          { label: 'Upcoming', value: '3', icon: AlertCircle, bg: 'bg-sage/10', color: 'text-sage' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} variants={itemVariants} className="glass-card rounded-xl p-4">
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                <Icon size={18} className={stat.color} />
              </div>
              <p className="font-display text-xl font-bold text-charcoal">{stat.value}</p>
              <p className="text-xs text-charcoal-muted">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Appointments */}
      <motion.div variants={itemVariants} className="glass-card rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-gold/10">
          <h2 className="font-display text-lg font-semibold text-charcoal">Today's Appointments</h2>
        </div>

        <div className="p-4 space-y-3">
          {todayAppointments.map((apt) => (
            <div key={apt.id} className="flex items-center gap-4 bg-cream/50 rounded-xl p-4 hover:bg-cream transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gold/10 flex flex-col items-center justify-center shrink-0">
                <span className="text-xs font-bold text-gold">{apt.time.split(':')[0]}</span>
                <span className="text-[10px] text-gold-dark">{apt.time.includes('PM') ? 'PM' : 'AM'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-charcoal">{apt.customer}</p>
                <p className="text-xs text-charcoal-muted">{apt.service} • {apt.duration}</p>
              </div>
              <button className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                apt.status === 'in-progress'
                  ? 'bg-success/10 text-success'
                  : 'bg-gold/10 text-gold hover:bg-gold/20'
              }`}>
                {apt.status === 'in-progress' ? 'Complete' : 'Start'}
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StaffDashboard;