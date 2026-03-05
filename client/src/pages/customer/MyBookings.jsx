import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Calendar, Filter } from 'lucide-react';
import api from '@/services/api';
import BookingCard from '@/components/BookingCard';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/bookings', { params });
      setBookings(data.bookings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, [statusFilter]);

  const handleStatusChange = async (bookingId, status) => {
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status });
      fetchBookings();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">My Bookings</h1>
          <p className="text-charcoal-muted text-sm mt-0.5">View and manage your appointments</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-charcoal-muted" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-charcoal/10 bg-white/80 text-sm text-charcoal appearance-none focus:outline-none focus:border-gold/40"
          >
            <option value="">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gold/10 p-12 text-center">
          <Calendar size={40} className="text-gold/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-charcoal mb-1">No Bookings Yet</h3>
          <p className="text-charcoal-muted text-sm">Book your first appointment to get started!</p>
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
                role="customer"
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;