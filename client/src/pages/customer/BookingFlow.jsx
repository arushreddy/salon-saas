import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, IndianRupee, Clock, Sparkles, CreditCard, Banknote, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import TimeSlotPicker from '@/components/TimeSlotPicker';

const steps = ['Select Service', 'Choose Date & Time', 'Payment', 'Confirm'];

const BookingFlow = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [notes, setNotes] = useState('');
  const [paymentChoice, setPaymentChoice] = useState('salon');
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  // Fetch services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data } = await api.get('/services', { params: { active: 'true' } });
        setServices(data.services);
      } catch (err) {
        console.error(err);
      }
    };
    fetchServices();
  }, []);

  // Fetch payment config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await api.get('/payments/config');
        setPaymentConfig(data.config);
      } catch (err) {
        console.error(err);
      }
    };
    fetchConfig();
  }, []);

  // Fetch slots when date changes
  useEffect(() => {
    if (!selectedDate || !selectedService) return;
    const fetchSlots = async () => {
      try {
        setSlotsLoading(true);
        const { data } = await api.get('/bookings/available-slots', {
          params: { date: selectedDate, serviceId: selectedService._id },
        });
        setAvailableSlots(data.slots);
      } catch (err) {
        console.error(err);
        setAvailableSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [selectedDate, selectedService]);

  const handleBook = async () => {
    try {
      setLoading(true);
      setError('');

      const { data } = await api.post('/bookings', {
        serviceId: selectedService._id,
        date: selectedDate,
        timeSlot: { start: selectedSlot.start },
        notes,
      });

      // If user chose online payment and Razorpay is enabled
      if (paymentChoice === 'online' && paymentConfig?.razorpayEnabled && paymentConfig?.razorpayKeyId) {
        try {
          const orderRes = await api.post('/payments/create-order', {
            bookingId: data.booking._id,
          });

          const options = {
            key: orderRes.data.key,
            amount: orderRes.data.order.amount,
            currency: orderRes.data.order.currency,
            name: 'Glamour Salon',
            description: selectedService.name,
            order_id: orderRes.data.order.id,
            handler: async function (response) {
              try {
                await api.post('/payments/verify', {
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  bookingId: data.booking._id,
                });
                setSuccess(true);
              } catch (verifyErr) {
                setError('Payment verification failed. Your booking is confirmed — please pay at salon.');
                setSuccess(true);
              }
            },
            prefill: {},
            theme: { color: '#C9A96E' },
          };

          if (window.Razorpay) {
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function () {
              setError('Payment failed. Your booking is confirmed — you can pay at the salon or retry online from My Bookings.');
              setSuccess(true);
            });
            rzp.open();
            return;
          } else {
            setError('Online payment is temporarily unavailable. Your booking is confirmed — please pay at the salon.');
          }
        } catch (payErr) {
          setError('Online payment failed. Your booking is confirmed — you can pay at the salon.');
          console.error('Razorpay error:', payErr);
        }
      }

      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get next 14 days
  const getDateOptions = () => {
    const dates = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push({
        value: d.toISOString().split('T')[0],
        day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        date: d.getDate(),
        month: d.toLocaleDateString('en-IN', { month: 'short' }),
        isToday: i === 0,
      });
    }
    return dates;
  };

  const categories = [...new Set(services.map((s) => s.category))];
  const filteredServices = activeCategory
    ? services.filter((s) => s.category === activeCategory)
    : services;

  const servicePrice = selectedService?.discountPrice || selectedService?.price || 0;

  // Success Screen
  if (success) {
    return (
      <motion.div
        className="max-w-md mx-auto text-center py-16"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
          <Check size={36} className="text-emerald-500" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-charcoal mb-2">Booking Confirmed!</h1>
        <p className="text-charcoal-muted text-sm mb-1">{selectedService?.name}</p>
        <p className="text-charcoal-muted text-sm">
          {new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} at {selectedSlot?.display}
        </p>
        <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/10">
          <IndianRupee size={14} className="text-gold" />
          <span className="text-sm font-bold text-gold">{servicePrice.toLocaleString('en-IN')}</span>
          <span className="text-xs text-charcoal-muted">
            {paymentChoice === 'online' ? '— Paid Online' : '— Pay at Salon'}
          </span>
        </div>
        {error && (
          <p className="mt-3 text-xs text-amber-600 bg-amber-50 rounded-lg px-4 py-2">{error}</p>
        )}
        <div className="flex gap-3 justify-center mt-8">
          <button
            onClick={() => navigate('/dashboard/bookings')}
            className="px-6 py-2.5 rounded-xl text-sm font-medium bg-gold/10 text-gold hover:bg-gold/20 transition-colors"
          >
            View My Bookings
          </button>
          <button
            onClick={() => {
              setSuccess(false);
              setCurrentStep(0);
              setSelectedService(null);
              setSelectedDate('');
              setSelectedSlot(null);
              setNotes('');
              setPaymentChoice('salon');
              setError('');
            }}
            className="luxury-gradient text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-gold"
          >
            Book Another
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-gold" />
          <span className="text-xs font-medium text-gold tracking-wide uppercase">Book Appointment</span>
        </div>
        <h1 className="font-display text-2xl font-semibold text-charcoal">Schedule Your Visit</h1>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i <= currentStep
                ? 'bg-gold text-white shadow-gold'
                : 'bg-charcoal/5 text-charcoal-muted'
            }`}>
              {i < currentStep ? <Check size={14} /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${
              i <= currentStep ? 'text-charcoal' : 'text-charcoal-muted'
            }`}>
              {step}
            </span>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 rounded-full ${
                i < currentStep ? 'bg-gold' : 'bg-charcoal/5'
              }`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: Select Service */}
        {currentStep === 0 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
              <button
                onClick={() => setActiveCategory('')}
                className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  !activeCategory ? 'bg-gold text-white' : 'bg-white/70 text-charcoal-muted hover:bg-gold/10 border border-charcoal/5'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap capitalize transition-all ${
                    activeCategory === cat ? 'bg-gold text-white' : 'bg-white/70 text-charcoal-muted hover:bg-gold/10 border border-charcoal/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredServices.map((service) => (
                <button
                  key={service._id}
                  onClick={() => { setSelectedService(service); setCurrentStep(1); }}
                  className={`text-left p-4 rounded-2xl border transition-all duration-200 ${
                    selectedService?._id === service._id
                      ? 'border-gold bg-gold/5 shadow-gold'
                      : 'border-charcoal/5 bg-white/70 hover:border-gold/30 hover:bg-gold/5'
                  }`}
                >
                  <h3 className="font-display text-sm font-semibold text-charcoal mb-1">{service.name}</h3>
                  <p className="text-xs text-charcoal-muted line-clamp-1 mb-3">{service.description}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <IndianRupee size={12} className="text-gold" />
                      <span className="text-sm font-bold text-charcoal">
                        {(service.discountPrice || service.price).toLocaleString('en-IN')}
                      </span>
                      {service.discountPrice && (
                        <span className="text-[11px] text-charcoal-muted line-through">{service.price.toLocaleString('en-IN')}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-charcoal-muted">
                      <Clock size={12} />
                      <span className="text-xs">{service.duration} min</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* STEP 2: Date & Time */}
        {currentStep === 1 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="bg-gold/5 rounded-xl p-4 mb-6 border border-gold/10">
              <p className="text-xs text-gold font-medium uppercase tracking-wider mb-1">Selected Service</p>
              <p className="font-display text-base font-semibold text-charcoal">{selectedService?.name}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm font-bold text-charcoal">{'\u20B9'}{servicePrice.toLocaleString('en-IN')}</span>
                <span className="text-xs text-charcoal-muted">{selectedService?.duration} min</span>
              </div>
            </div>

            <p className="text-sm font-semibold text-charcoal mb-3">Select Date</p>
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {getDateOptions().map((d) => (
                <button
                  key={d.value}
                  onClick={() => { setSelectedDate(d.value); setSelectedSlot(null); }}
                  className={`flex flex-col items-center min-w-[60px] py-3 px-3 rounded-xl transition-all ${
                    selectedDate === d.value
                      ? 'bg-gold text-white shadow-gold'
                      : 'bg-white/70 text-charcoal border border-charcoal/5 hover:border-gold/30'
                  }`}
                >
                  <span className="text-[10px] font-medium uppercase">{d.day}</span>
                  <span className="text-lg font-bold">{d.date}</span>
                  <span className="text-[10px]">{d.month}</span>
                </button>
              ))}
            </div>

            {selectedDate && (
              <>
                <p className="text-sm font-semibold text-charcoal mb-3">Select Time</p>
                <TimeSlotPicker
                  slots={availableSlots}
                  selectedSlot={selectedSlot}
                  onSelect={setSelectedSlot}
                  loading={slotsLoading}
                />
              </>
            )}

            <div className="flex justify-between mt-6">
              <button onClick={() => setCurrentStep(0)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-charcoal-muted hover:text-charcoal transition-colors">
                <ArrowLeft size={16} /> Back
              </button>
              <button
                onClick={() => setCurrentStep(2)}
                disabled={!selectedSlot}
                className="flex items-center gap-2 luxury-gradient text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-gold disabled:opacity-40"
              >
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Payment Choice */}
        {currentStep === 2 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="bg-gold/5 rounded-xl p-4 mb-6 border border-gold/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-base font-semibold text-charcoal">{selectedService?.name}</p>
                  <p className="text-xs text-charcoal-muted">
                    {new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })} at {selectedSlot?.display}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gold">{'\u20B9'}{servicePrice.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>

            <h2 className="font-display text-lg font-semibold text-charcoal mb-4">How would you like to pay?</h2>

            <div className="space-y-3 mb-6">
              {/* Pay at Salon */}
              {paymentConfig?.payAtSalonEnabled !== false && (
                <button
                  onClick={() => setPaymentChoice('salon')}
                  className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${
                    paymentChoice === 'salon'
                      ? 'border-gold bg-gold/5'
                      : 'border-charcoal/10 bg-white hover:border-gold/30'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    paymentChoice === 'salon' ? 'bg-gold/20' : 'bg-charcoal/5'
                  }`}>
                    <Store size={22} className={paymentChoice === 'salon' ? 'text-gold' : 'text-charcoal-muted'} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-charcoal">Pay at Salon</p>
                    <p className="text-xs text-charcoal-muted mt-0.5">
                      Pay via Cash, UPI, or Card when you visit
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    paymentChoice === 'salon' ? 'border-gold' : 'border-charcoal/20'
                  }`}>
                    {paymentChoice === 'salon' && <div className="w-2.5 h-2.5 rounded-full bg-gold" />}
                  </div>
                </button>
              )}

              {/* Pay Online */}
              {paymentConfig?.razorpayEnabled && paymentConfig?.razorpayKeyId && (
                <button
                  onClick={() => setPaymentChoice('online')}
                  className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${
                    paymentChoice === 'online'
                      ? 'border-gold bg-gold/5'
                      : 'border-charcoal/10 bg-white hover:border-gold/30'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    paymentChoice === 'online' ? 'bg-gold/20' : 'bg-charcoal/5'
                  }`}>
                    <CreditCard size={22} className={paymentChoice === 'online' ? 'text-gold' : 'text-charcoal-muted'} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-charcoal">Pay Now Online</p>
                    <p className="text-xs text-charcoal-muted mt-0.5">
                      Secure payment via UPI, Card, or Net Banking
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    paymentChoice === 'online' ? 'border-gold' : 'border-charcoal/20'
                  }`}>
                    {paymentChoice === 'online' && <div className="w-2.5 h-2.5 rounded-full bg-gold" />}
                  </div>
                </button>
              )}

              {/* If Razorpay not configured */}
              {(!paymentConfig?.razorpayEnabled || !paymentConfig?.razorpayKeyId) && (
                <div className="bg-cream/50 rounded-xl p-4 border border-charcoal/5">
                  <p className="text-xs text-charcoal-muted text-center">
                    Online payment is not available. Please pay at the salon.
                  </p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                Special Requests <span className="text-charcoal-muted font-normal">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any preferences or allergies we should know about?"
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-charcoal/10 bg-cream/50 text-charcoal text-sm focus:outline-none focus:border-gold/40 focus:ring-2 focus:ring-gold/10 transition-all resize-none"
              />
            </div>

            <div className="flex justify-between">
              <button onClick={() => setCurrentStep(1)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-charcoal-muted hover:text-charcoal transition-colors">
                <ArrowLeft size={16} /> Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="flex items-center gap-2 luxury-gradient text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-gold"
              >
                Review Booking <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 4: Confirm */}
        {currentStep === 3 && (
          <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="bg-white rounded-2xl border border-gold/10 p-6 mb-6">
              <h3 className="font-display text-lg font-semibold text-charcoal mb-4">Booking Summary</h3>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between py-2 border-b border-charcoal/5">
                  <span className="text-sm text-charcoal-muted">Service</span>
                  <span className="text-sm font-medium text-charcoal">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-charcoal/5">
                  <span className="text-sm text-charcoal-muted">Date</span>
                  <span className="text-sm font-medium text-charcoal">
                    {new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-charcoal/5">
                  <span className="text-sm text-charcoal-muted">Time</span>
                  <span className="text-sm font-medium text-charcoal">{selectedSlot?.display} ({selectedService?.duration} min)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-charcoal/5">
                  <span className="text-sm text-charcoal-muted">Payment</span>
                  <span className={`text-sm font-medium flex items-center gap-1.5 ${
                    paymentChoice === 'online' ? 'text-indigo-600' : 'text-emerald-600'
                  }`}>
                    {paymentChoice === 'online' ? <CreditCard size={14} /> : <Store size={14} />}
                    {paymentChoice === 'online' ? 'Pay Online Now' : 'Pay at Salon'}
                  </span>
                </div>
                {selectedService?.discountPrice && (
                  <div className="flex justify-between py-2 border-b border-charcoal/5">
                    <span className="text-sm text-charcoal-muted">Discount</span>
                    <span className="text-sm font-medium text-emerald-600">
                      -{'\u20B9'}{(selectedService.price - selectedService.discountPrice).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-3">
                  <span className="text-base font-semibold text-charcoal">Total</span>
                  <span className="text-base font-bold text-gold">{'\u20B9'}{servicePrice.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm text-center mb-4">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button onClick={() => setCurrentStep(2)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-charcoal-muted hover:text-charcoal transition-colors">
                <ArrowLeft size={16} /> Back
              </button>
              <button
                onClick={handleBook}
                disabled={loading}
                className="flex items-center gap-2 luxury-gradient text-white px-8 py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-gold disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {loading ? 'Confirming...' : paymentChoice === 'online' ? 'Pay & Confirm' : 'Confirm Booking'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingFlow;