// src/pages/public/PublicBookingFlow.jsx
// Route: /book/:slug/appointment
// Steps: 1) Select Service → 2) Choose Staff → 3) Pick Date & Time → 4) Your Details → Confirm
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  ArrowLeft, ArrowRight, Check, Clock, Calendar,
  User, Phone, Mail, Scissors, Sparkles, Star,
  ChevronLeft, RefreshCw, X,
} from 'lucide-react';

const API = 'http://localhost:5000/api/public';

const C = {
  bg: '#FDFAF5', card: '#FFFFFF',
  gold: '#B8860B', goldLight: '#DAA520', goldPale: '#FFF8E7',
  ink: '#1A1208', inkMid: '#5C4A2A', inkLight: '#9C8660',
  border: '#EDE3D0',
  green: '#15803D', greenPale: '#DCFCE7', greenBorder: '#86EFAC',
  red: '#991B1B', redPale: '#FEF2F2', redBorder: '#FECACA',
};

const STEPS = ['Service', 'Staff', 'Date & Time', 'Your Details'];

const makeApi = (slug) => axios.create({ baseURL: API, headers: { 'X-Salon-Slug': slug } });

const fmtDate = (d) => {
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
};

// Today + next 14 days
const getAvailableDates = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

export default function PublicBookingFlow() {
  const { slug } = useParams();
  const navigate  = useNavigate();
  const location  = useLocation();
  const api       = makeApi(slug);

  const [step, setStep] = useState(0);
  const [salon, setSalon]       = useState(null);
  const [services, setServices] = useState([]);
  const [staff, setStaff]       = useState([]);
  const [slots, setSlots]       = useState([]);

  const [selectedService, setSelectedService] = useState(location.state?.selectedService || null);
  const [selectedStaff,   setSelectedStaff]   = useState(null); // null = any
  const [selectedDate,    setSelectedDate]     = useState('');
  const [selectedSlot,    setSelectedSlot]     = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });

  const [loading,       setLoading]       = useState(true);
  const [slotsLoading,  setSlotsLoading]  = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState('');
  const [booking,       setBooking]       = useState(null); // on success

  const [activeCategory, setActiveCategory] = useState('All');

  // Initial load
  useEffect(() => {
    const load = async () => {
      try {
        const [salonRes, servicesRes, staffRes] = await Promise.all([
          api.get('/salon-info'),
          api.get('/services'),
          api.get('/staff').catch(() => ({ data: { staff: [] } })),
        ]);
        setSalon(salonRes.data.salon);
        setServices(servicesRes.data.services || []);
        setStaff(staffRes.data.staff || []);

        // If pre-selected service from landing, jump to step 1
        if (location.state?.selectedService) setStep(1);
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load salon');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  // Load slots when date changes
  const loadSlots = useCallback(async () => {
    if (!selectedDate || !selectedService) return;
    setSlotsLoading(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const params = { date: selectedDate, serviceId: selectedService._id };
      if (selectedStaff) params.staffId = selectedStaff._id;
      const { data } = await api.get('/timeslots', { params });
      setSlots(data.slots || []);
    } catch (e) {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [selectedDate, selectedService, selectedStaff]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  const handleSubmit = async () => {
    if (!form.name || !form.phone) { setError('Name and phone are required'); return; }
    setSubmitting(true); setError('');
    try {
      const { data } = await api.post('/book', {
        serviceId:     selectedService._id,
        staffId:       selectedStaff?._id || null,
        date:          selectedDate,
        timeSlot:      { start: selectedSlot.start, end: selectedSlot.end },
        customerName:  form.name,
        customerPhone: form.phone,
        customerEmail: form.email,
        notes:         form.notes,
      });
      setBooking(data.booking);

      // ── Auto-notify salon admin via WhatsApp ──────────────────────────
      // Opens WhatsApp on the admin's phone with full booking details
      const adminPhone = data.booking.salonAdminPhone;
      if (adminPhone) {
        const adminMsg = [
          `🔔 *New Online Booking*`,
          ``,
          `📋 Ref: *${data.booking.refNo}*`,
          `👤 Customer: ${form.name} (${form.phone})`,
          `✂️ Service: ${selectedService.name}`,
          `👨‍💼 Stylist: ${selectedStaff?.name || 'Any available'}`,
          `📅 Date: ${fmtDate(selectedDate)}`,
          `⏰ Time: ${selectedSlot.display}`,
          `💰 Amount: ₹${selectedService.price}`,
          form.notes ? `📝 Notes: ${form.notes}` : '',
        ].filter(Boolean).join('\n');

        // Small delay so success screen renders first
        setTimeout(() => {
          window.open(
            `https://wa.me/${adminPhone.replace(/\D/g, '')}?text=${encodeURIComponent(adminMsg)}`,
            '_blank'
          );
        }, 800);
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canNext = () => {
    if (step === 0) return !!selectedService;
    if (step === 2) return !!(selectedDate && selectedSlot);
    if (step === 3) return !!(form.name && form.phone);
    return true;
  };

  const next = () => { if (canNext()) setStep(s => s + 1); };
  const back = () => { setError(''); setStep(s => Math.max(0, s - 1)); };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: `3px solid ${C.gold}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }}/>
        <div style={{ color: C.inkLight, fontSize: 13 }}>Loading salon…</div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error && !salon) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✂️</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 6 }}>{error}</div>
        <button onClick={() => navigate(`/book/${slug}`)} style={{ color: C.gold, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>← Back to salon</button>
      </div>
    </div>
  );

  // ── Success screen ─────────────────────────────────────────────────────────
  if (booking) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: C.card, borderRadius: 24, padding: 36,
          maxWidth: 480, width: '100%', textAlign: 'center',
          boxShadow: '0 8px 40px rgba(0,0,0,0.10)', border: `1px solid ${C.border}`,
        }}
      >
        <div style={{ width: 64, height: 64, borderRadius: 20, background: C.greenPale, border: `2px solid ${C.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Check size={28} color={C.green}/>
        </div>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 400, fontStyle: 'italic', color: C.ink, margin: '0 0 6px' }}>
          Booking Confirmed!
        </h2>
        <p style={{ color: C.inkLight, fontSize: 14, margin: '0 0 24px' }}>
          We'll see you soon at {salon?.name}
        </p>

        {/* Booking card */}
        <div style={{ background: '#FDFAF5', borderRadius: 16, padding: '18px 20px', border: `1px solid ${C.border}`, textAlign: 'left', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.inkLight, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ref No.</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: C.gold, fontFamily: 'monospace' }}>{booking.refNo}</span>
          </div>
          {[
            { label: 'Service',  value: booking.service },
            { label: 'Date',     value: fmtDate(booking.date) },
            { label: 'Time',     value: (() => { const h = parseInt(booking.timeSlot?.start); const d = h > 12 ? h-12 : h === 0 ? 12 : h; return `${d}:${booking.timeSlot?.start?.split(':')[1]} ${h>=12?'PM':'AM'}`; })() },
            { label: 'Name',     value: booking.customerName },
            { label: 'Amount',   value: `₹${booking.amount}` },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: C.inkLight }}>{label}</span>
              <span style={{ color: C.ink, fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* WhatsApp buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>

          {/* Notify salon admin */}
          {booking.salonAdminPhone && (
            <a
              href={`https://wa.me/${booking.salonAdminPhone.replace(/\D/g,'')}?text=${encodeURIComponent([
                `🔔 *New Online Booking*`,
                ``,
                `📋 Ref: *${booking.refNo}*`,
                `👤 Customer: ${booking.customerName} (${booking.customerPhone})`,
                `✂️ Service: ${booking.service}`,
                `📅 Date: ${fmtDate(booking.date)}`,
                `⏰ Time: ${(() => { const h = parseInt(booking.timeSlot?.start); const d = h > 12 ? h-12 : h===0?12:h; return `${d}:${booking.timeSlot?.start?.split(':')[1]} ${h>=12?'PM':'AM'}`; })()}`,
                `💰 Amount: ₹${booking.amount}`,
              ].join('\n'))}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: '#25D366', color: '#fff', borderRadius: 50,
                padding: '12px 28px', fontSize: 13, fontWeight: 700, textDecoration: 'none',
              }}
            >
              💬 Notify Salon via WhatsApp
            </a>
          )}

          {/* Customer saves their own confirmation */}
          <a
            href={`https://wa.me/?text=${encodeURIComponent([
              `✅ *Booking Confirmed — ${booking.salonName || salon?.name}*`,
              ``,
              `📋 Ref: *${booking.refNo}*`,
              `✂️ Service: ${booking.service}`,
              `📅 Date: ${fmtDate(booking.date)}`,
              `⏰ Time: ${(() => { const h = parseInt(booking.timeSlot?.start); const d = h > 12 ? h-12 : h===0?12:h; return `${d}:${booking.timeSlot?.start?.split(':')[1]} ${h>=12?'PM':'AM'}`; })()}`,
              `💰 Amount: ₹${booking.amount}`,
              ``,
              `📍 ${salon?.address?.city || ''}`,
              `📞 ${salon?.phone || ''}`,
            ].filter(Boolean).join('\n'))}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: C.goldPale, border: `1px solid ${C.gold}40`,
              color: C.gold, borderRadius: 50,
              padding: '11px 28px', fontSize: 13, fontWeight: 700, textDecoration: 'none',
            }}
          >
            📲 Save My Confirmation
          </a>
        </div>

        <button onClick={() => navigate(`/book/${slug}`)} style={{
          width: '100%', padding: '11px', borderRadius: 50,
          background: C.goldPale, border: `1px solid ${C.gold}40`,
          color: C.gold, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          Back to {salon?.name}
        </button>
      </motion.div>
    </div>
  );

  const categories = ['All', ...new Set(services.map(s => s.category).filter(Boolean))];
  const filteredServices = activeCategory === 'All' ? services : services.filter(s => s.category === activeCategory);
  const dates = getAvailableDates();

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      {/* Top bar */}
      <div style={{ background: '#1A1208', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => step === 0 ? navigate(`/book/${slug}`) : back()} style={{ background: 'none', border: 'none', color: C.gold, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, padding: 0 }}>
          <ChevronLeft size={16}/> {step === 0 ? salon?.name : 'Back'}
        </button>
        <div style={{ marginLeft: 'auto', fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#FAF6EF', fontSize: 15 }}>
          Book Appointment
        </div>
      </div>

      {/* Step indicator */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 0, maxWidth: 600, margin: '0 auto' }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative' }}>
              {i < STEPS.length - 1 && (
                <div style={{ position: 'absolute', left: '50%', top: 14, width: '100%', height: 2, background: i < step ? C.gold : C.border, zIndex: 0 }}/>
              )}
              <div style={{
                width: 28, height: 28, borderRadius: '50%', zIndex: 1,
                background: i < step ? C.gold : i === step ? '#1A1208' : C.card,
                border: `2px solid ${i <= step ? C.gold : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                color: i < step ? '#1A1208' : i === step ? C.gold : C.inkLight,
              }}>
                {i < step ? <Check size={12}/> : i + 1}
              </div>
              <span style={{ fontSize: 10, color: i === step ? C.gold : C.inkLight, fontWeight: i === step ? 700 : 400, whiteSpace: 'nowrap' }}>
                {s}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
        {error && (
          <div style={{ background: C.redPale, border: `1px solid ${C.redBorder}`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: C.red, display: 'flex', alignItems: 'center', gap: 8 }}>
            <X size={14}/> {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

            {/* ── Step 0: Select Service ── */}
            {step === 0 && (
              <div>
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 400, fontStyle: 'italic', color: C.ink, margin: '0 0 4px' }}>Choose a Service</h2>
                <p style={{ color: C.inkLight, fontSize: 13, margin: '0 0 20px' }}>{services.length} services available</p>

                {categories.length > 2 && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                    {categories.map(cat => (
                      <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                        padding: '5px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        background: activeCategory === cat ? C.gold : C.card,
                        color: activeCategory === cat ? '#1A1208' : C.inkMid,
                        border: `1px solid ${activeCategory === cat ? C.gold : C.border}`,
                      }}>{cat}</button>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredServices.map(service => (
                    <div key={service._id} onClick={() => { setSelectedService(service); next(); }} style={{
                      background: selectedService?._id === service._id ? C.goldPale : C.card,
                      border: `2px solid ${selectedService?._id === service._id ? C.gold : C.border}`,
                      borderRadius: 14, padding: '16px 18px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 14,
                      transition: 'all 0.15s',
                    }}
                      onMouseEnter={e => { if (selectedService?._id !== service._id) e.currentTarget.style.borderColor = C.goldLight; }}
                      onMouseLeave={e => { if (selectedService?._id !== service._id) e.currentTarget.style.borderColor = C.border; }}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: C.goldPale, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold, flexShrink: 0 }}>
                        <Scissors size={18}/>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{service.name}</div>
                        {service.description && <div style={{ fontSize: 12, color: C.inkLight, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{service.description}</div>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                          <span style={{ fontSize: 11, color: C.inkLight, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11}/> {service.duration} min</span>
                          {service.category && <span style={{ fontSize: 10, color: C.inkLight, background: C.border, borderRadius: 20, padding: '2px 8px' }}>{service.category}</span>}
                        </div>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: C.gold, flexShrink: 0 }}>₹{service.price}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 1: Choose Staff ── */}
            {step === 1 && (
              <div>
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 400, fontStyle: 'italic', color: C.ink, margin: '0 0 4px' }}>Choose a Stylist</h2>
                <p style={{ color: C.inkLight, fontSize: 13, margin: '0 0 20px' }}>Optional — or let us assign the best available</p>

                {/* Any stylist option */}
                <div onClick={() => { setSelectedStaff(null); next(); }} style={{
                  background: selectedStaff === null ? C.goldPale : C.card,
                  border: `2px solid ${selectedStaff === null ? C.gold : C.border}`,
                  borderRadius: 14, padding: '16px 18px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10,
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: C.goldPale, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold, flexShrink: 0 }}>
                    <Star size={18}/>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Any Available Stylist</div>
                    <div style={{ fontSize: 12, color: C.inkLight, marginTop: 2 }}>We'll assign the best available stylist for you</div>
                  </div>
                  {selectedStaff === null && <Check size={18} color={C.gold} style={{ marginLeft: 'auto' }}/>}
                </div>

                {staff.map(s => (
                  <div key={s._id} onClick={() => { setSelectedStaff(s); next(); }} style={{
                    background: selectedStaff?._id === s._id ? C.goldPale : C.card,
                    border: `2px solid ${selectedStaff?._id === s._id ? C.gold : C.border}`,
                    borderRadius: 14, padding: '16px 18px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10,
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
                      background: C.goldPale, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {s.photo
                        ? <img src={s.photo} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                        : <span style={{ fontSize: 18, fontWeight: 700, color: C.gold }}>{s.name?.charAt(0)}</span>
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{s.name}</div>
                      {s.designation && <div style={{ fontSize: 12, color: C.inkLight, marginTop: 2 }}>{s.designation}</div>}
                    </div>
                    {selectedStaff?._id === s._id && <Check size={18} color={C.gold}/>}
                  </div>
                ))}
              </div>
            )}

            {/* ── Step 2: Date & Time ── */}
            {step === 2 && (
              <div>
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 400, fontStyle: 'italic', color: C.ink, margin: '0 0 4px' }}>Pick a Date & Time</h2>
                <p style={{ color: C.inkLight, fontSize: 13, margin: '0 0 20px' }}>
                  {selectedService?.name} · ₹{selectedService?.price} · {selectedService?.duration} min
                </p>

                {/* Date row */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.inkLight, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Select Date</div>
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
                    {dates.map(d => {
                      const date = new Date(d);
                      const isSelected = d === selectedDate;
                      const day  = date.toLocaleDateString('en-IN', { weekday: 'short' });
                      const num  = date.getDate();
                      const mon  = date.toLocaleDateString('en-IN', { month: 'short' });
                      return (
                        <button key={d} onClick={() => setSelectedDate(d)} style={{
                          flexShrink: 0, width: 60, padding: '10px 0',
                          borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                          background: isSelected ? C.gold : C.card,
                          border: `2px solid ${isSelected ? C.gold : C.border}`,
                          color: isSelected ? '#1A1208' : C.inkMid,
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 600 }}>{day}</div>
                          <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{num}</div>
                          <div style={{ fontSize: 10 }}>{mon}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time slots */}
                {selectedDate && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.inkLight, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                      Available Times — {fmtDate(selectedDate)}
                    </div>
                    {slotsLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 0', color: C.inkLight, fontSize: 13 }}>
                        <RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }}/> Loading slots…
                      </div>
                    ) : slots.length === 0 ? (
                      <div style={{ padding: '20px 0', color: C.inkLight, fontSize: 13, textAlign: 'center' }}>
                        No available slots for this date. Please try another day.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                        {slots.map(slot => (
                          <button key={slot.start} onClick={() => setSelectedSlot(slot)} style={{
                            padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                            background: selectedSlot?.start === slot.start ? C.gold : C.card,
                            border: `2px solid ${selectedSlot?.start === slot.start ? C.gold : C.border}`,
                            color: selectedSlot?.start === slot.start ? '#1A1208' : C.ink,
                            fontSize: 13, fontWeight: 600,
                          }}>
                            {slot.display}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Customer Details ── */}
            {step === 3 && (
              <div>
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 400, fontStyle: 'italic', color: C.ink, margin: '0 0 4px' }}>Your Details</h2>
                <p style={{ color: C.inkLight, fontSize: 13, margin: '0 0 20px' }}>We'll use these to confirm your appointment</p>

                {/* Booking summary */}
                <div style={{ background: C.goldPale, border: `1px solid ${C.gold}40`, borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Booking Summary</div>
                  {[
                    { label: 'Service',  value: selectedService?.name },
                    { label: 'Stylist',  value: selectedStaff?.name || 'Any available' },
                    { label: 'Date',     value: fmtDate(selectedDate) },
                    { label: 'Time',     value: selectedSlot?.display },
                    { label: 'Amount',   value: `₹${selectedService?.price}` },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                      <span style={{ color: C.inkLight }}>{label}</span>
                      <span style={{ color: C.ink, fontWeight: 600 }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Form fields */}
                {[
                  { key: 'name', label: 'Full Name *', placeholder: 'Priya Sharma', icon: User, type: 'text' },
                  { key: 'phone', label: 'Phone Number *', placeholder: '98765 43210', icon: Phone, type: 'tel' },
                  { key: 'email', label: 'Email (optional)', placeholder: 'priya@example.com', icon: Mail, type: 'email' },
                ].map(({ key, label, placeholder, icon: Icon, type }) => (
                  <div key={key} style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.inkMid, marginBottom: 6 }}>{label}</label>
                    <div style={{ position: 'relative' }}>
                      <Icon size={15} color={C.inkLight} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}/>
                      <input
                        type={type}
                        value={form[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          padding: '11px 14px 11px 38px',
                          borderRadius: 12, border: `1.5px solid ${C.border}`,
                          background: C.card, fontSize: 14, color: C.ink, outline: 'none',
                        }}
                        onFocus={e => e.target.style.borderColor = C.gold}
                        onBlur={e => e.target.style.borderColor = C.border}
                      />
                    </div>
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.inkMid, marginBottom: 6 }}>Special Requests (optional)</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Any specific requests or notes for your stylist…"
                    rows={3}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '11px 14px', borderRadius: 12,
                      border: `1.5px solid ${C.border}`, background: C.card,
                      fontSize: 14, color: C.ink, outline: 'none',
                      resize: 'vertical', fontFamily: 'inherit',
                    }}
                    onFocus={e => e.target.style.borderColor = C.gold}
                    onBlur={e => e.target.style.borderColor = C.border}
                  />
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
          {step > 0 && (
            <button onClick={back} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '12px 20px', borderRadius: 50,
              background: C.card, border: `1.5px solid ${C.border}`,
              color: C.inkMid, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              <ArrowLeft size={15}/> Back
            </button>
          )}
          {step < 3 ? (
            <button onClick={next} disabled={!canNext()} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 20px', borderRadius: 50, border: 'none',
              background: canNext() ? C.gold : C.border,
              color: canNext() ? '#1A1208' : C.inkLight,
              fontSize: 14, fontWeight: 700, cursor: canNext() ? 'pointer' : 'not-allowed',
            }}>
              Continue <ArrowRight size={15}/>
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting || !canNext()} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 20px', borderRadius: 50, border: 'none',
              background: canNext() ? C.gold : C.border,
              color: canNext() ? '#1A1208' : C.inkLight,
              fontSize: 14, fontWeight: 700, cursor: canNext() ? 'pointer' : 'not-allowed',
            }}>
              {submitting ? <RefreshCw size={15} style={{ animation: 'spin 0.8s linear infinite' }}/> : <Check size={15}/>}
              {submitting ? 'Confirming…' : 'Confirm Booking'}
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}