import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Calendar } from 'lucide-react';
import api from '@/services/api';
import BookingCard from '@/components/BookingCard';

const StaffAppointments = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/bookings', { params: { date: dateFilter } });
      setBookings(data.bookings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, [dateFilter]);

  const handleStatusChange = async (bookingId, status, paymentMethod, paymentStatus) => {
    try {
      const body = { status };
      if (paymentMethod) body.paymentMethod = paymentMethod;
      if (paymentStatus) body.paymentStatus = paymentStatus;
      await api.patch(`/bookings/${bookingId}/status`, body);
      fetchBookings();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">My Appointments</h1>
          <p className="text-charcoal-muted text-sm mt-0.5">View and manage assigned bookings</p>
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2 rounded-xl border border-charcoal/10 bg-white/80 text-sm focus:outline-none focus:border-gold/40"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gold/10 p-12 text-center">
          <Calendar size={40} className="text-gold/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-charcoal mb-1">No Appointments</h3>
          <p className="text-charcoal-muted text-sm">No appointments assigned for this date</p>
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
                role="staff"
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffAppointments;