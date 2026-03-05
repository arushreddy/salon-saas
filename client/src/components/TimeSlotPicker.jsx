import { motion } from 'framer-motion';
import { Clock, Loader2 } from 'lucide-react';

const TimeSlotPicker = ({ slots, selectedSlot, onSelect, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock size={36} className="text-charcoal-muted/30 mx-auto mb-3" />
        <p className="text-charcoal-muted text-sm">No available slots for this date</p>
        <p className="text-charcoal-muted/60 text-xs mt-1">Try selecting a different date</p>
      </div>
    );
  }

  // Group slots by period
  const morning = slots.filter((s) => {
    const h = parseInt(s.start.split(':')[0]);
    return h < 12;
  });
  const afternoon = slots.filter((s) => {
    const h = parseInt(s.start.split(':')[0]);
    return h >= 12 && h < 17;
  });
  const evening = slots.filter((s) => {
    const h = parseInt(s.start.split(':')[0]);
    return h >= 17;
  });

  const renderGroup = (label, groupSlots, emoji) => {
    if (groupSlots.length === 0) return null;
    return (
      <div className="mb-5">
        <p className="text-xs font-semibold text-charcoal-muted mb-2.5 uppercase tracking-wider">
          {emoji} {label}
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {groupSlots.map((slot) => (
            <motion.button
              key={slot.start}
              onClick={() => onSelect(slot)}
              whileTap={{ scale: 0.95 }}
              className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 border ${
                selectedSlot?.start === slot.start
                  ? 'bg-gold text-white border-gold shadow-gold'
                  : 'bg-white/70 text-charcoal border-charcoal/5 hover:border-gold/30 hover:bg-gold/5'
              }`}
            >
              {slot.display}
            </motion.button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      {renderGroup('Morning', morning, '🌅')}
      {renderGroup('Afternoon', afternoon, '☀️')}
      {renderGroup('Evening', evening, '🌙')}
    </div>
  );
};

export default TimeSlotPicker;