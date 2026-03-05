import { Clock, User, IndianRupee, Calendar, MapPin } from 'lucide-react';

const statusStyles = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Pending' },
  confirmed: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Confirmed' },
  'in-progress': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'In Progress' },
  completed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'Completed' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', label: 'Cancelled' },
  'no-show': { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', label: 'No Show' },
};

const paymentStyles = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Unpaid' },
  paid: { bg: 'bg-green-50', text: 'text-green-700', label: 'Paid' },
  refunded: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Refunded' },
  partial: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Partial' },
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
};

const BookingCard = ({ booking, onStatusChange, showActions, role }) => {
  const status = statusStyles[booking.status] || statusStyles.pending;
  const payment = paymentStyles[booking.paymentStatus] || paymentStyles.pending;

  return (
    <div className="bg-white rounded-2xl border border-gold/10 p-5 hover:shadow-md transition-all duration-300">
      {/* Top Row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-display text-base font-semibold text-charcoal">
            {booking.service?.name || 'Service'}
          </h3>
          <p className="text-xs text-charcoal-muted mt-0.5">{booking.service?.category}</p>
        </div>
        <div className="flex gap-2">
          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border ${status.bg} ${status.text} ${status.border}`}>
            {status.label}
          </span>
          {booking.type === 'walk-in' && (
            <span className="px-2 py-1 rounded-lg text-[11px] font-medium bg-violet-50 text-violet-700 border border-violet-200">
              Walk-in
            </span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gold" />
          <span className="text-xs text-charcoal-muted">{formatDate(booking.date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-gold" />
          <span className="text-xs text-charcoal-muted">
            {formatTime(booking.timeSlot?.start)} - {formatTime(booking.timeSlot?.end)}
          </span>
        </div>
        {booking.staff && (
          <div className="flex items-center gap-2">
            <User size={14} className="text-gold" />
            <span className="text-xs text-charcoal-muted">Stylist: {booking.staff?.name}</span>
          </div>
        )}
        {role !== 'customer' && booking.customer && (
          <div className="flex items-center gap-2">
            <User size={14} className="text-emerald-500" />
            <span className="text-xs text-charcoal-muted">{booking.customer?.name}</span>
          </div>
        )}
      </div>

      {/* Price + Payment */}
      <div className="flex items-center justify-between pt-3 border-t border-gold/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <IndianRupee size={14} className="text-gold" />
            <span className="text-sm font-bold text-charcoal">
              {booking.finalAmount?.toLocaleString('en-IN')}
            </span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${payment.bg} ${payment.text}`}>
            {payment.label}
          </span>
        </div>

        {/* Action Buttons */}
        {showActions && booking.status !== 'cancelled' && booking.status !== 'completed' && (
          <div className="flex gap-2">
            {role === 'customer' && booking.status === 'confirmed' && (
              <button
                onClick={() => onStatusChange(booking._id, 'cancelled')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
              >
                Cancel
              </button>
            )}
            {(role === 'admin' || role === 'staff') && booking.status === 'confirmed' && (
              <button
                onClick={() => onStatusChange(booking._id, 'in-progress')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
              >
                Start
              </button>
            )}
            {(role === 'admin' || role === 'staff') && booking.status === 'in-progress' && (
              <button
                onClick={() => onStatusChange(booking._id, 'completed', 'cash', 'paid')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-emerald-500 hover:bg-emerald-600 transition-colors"
              >
                Complete + Pay
              </button>
            )}
            {role === 'admin' && (
              <button
                onClick={() => onStatusChange(booking._id, 'cancelled')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>

      {booking.notes && (
        <p className="mt-3 text-xs text-charcoal-muted italic bg-cream/50 px-3 py-2 rounded-lg">
          Note: {booking.notes}
        </p>
      )}
    </div>
  );
};

export default BookingCard;