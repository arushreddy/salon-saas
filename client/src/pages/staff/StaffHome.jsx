import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scissors, IndianRupee, Clock, Bell, Calendar, Loader2, User, Briefcase,
  Phone, Mail, ChevronDown, ChevronUp, Play, CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

const fade = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } } };
const stagger = (d = 0.05) => ({ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: d } } });

const DESG = { junior_stylist:'Junior Stylist', senior_stylist:'Senior Stylist', master_stylist:'Master Stylist', receptionist:'Receptionist', manager:'Manager', trainee:'Trainee' };
const SPEC = { hair:'Hair', skin:'Skincare', nails:'Nails', makeup:'Makeup', spa:'Spa', bridal:'Bridal', grooming:'Grooming', combo:'Combo' };
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const fmtT = t => { try { return new Date(`2000-01-01T${t}`).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}); } catch { return t||''; } };

const ST = {
  confirmed:     { label:'Upcoming',    bg:'#EFF6FF', color:'#1E40AF', dot:'#3B82F6' },
  'in-progress': { label:'In Progress', bg:'#FFFBEB', color:'#92400E', dot:'#F59E0B' },
  completed:     { label:'Done',        bg:'#F0FDF4', color:'#166534', dot:'#22C55E' },
  cancelled:     { label:'Cancelled',   bg:'#FEF2F2', color:'#991B1B', dot:'#EF4444' },
  pending:       { label:'Pending',     bg:'#F5F3FF', color:'#6D28D9', dot:'#7C3AED' },
  'no-show':     { label:'No Show',     bg:'#FEF2F2', color:'#991B1B', dot:'#EF4444' },
};

const BookingItem = ({ b, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen || false);
  const st = ST[b.status] || ST.confirmed;
  return (
    <div style={{ borderBottom: '1px solid #f5f5f5' }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 18px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
      }}>
        <div style={{ width: 48, flexShrink: 0, textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{b.timeSlot?.start ? fmtT(b.timeSlot.start) : '—'}</p>
          {b.service?.duration && <p style={{ fontSize: 10, color: '#ccc' }}>{b.service.duration}m</p>}
        </div>
        <div style={{ width: 3, height: 28, borderRadius: 2, background: st.bg, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {b.service?.name || 'Service'}
          </p>
          <p style={{ fontSize: 12, color: '#999', marginTop: 1 }}>
            {b.customer?.name || 'Walk-in'}
            {b.type === 'walk-in' && <span style={{ color: '#B8860B' }}> · Walk-in</span>}
          </p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: st.bg, color: st.color, flexShrink: 0 }}>
          {st.label}
        </span>
        {open ? <ChevronUp size={13} style={{ color: '#ccc' }} /> : <ChevronDown size={13} style={{ color: '#ccc' }} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 18px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[
                ['Service', b.service?.name],
                ['Customer', b.customer?.name || 'Walk-in'],
                ['Duration', b.service?.duration ? `${b.service.duration} min` : null],
                ['Time', b.timeSlot?.start ? `${fmtT(b.timeSlot.start)} – ${fmtT(b.timeSlot.end)}` : null],
                ['Type', b.type === 'walk-in' ? 'Walk-in' : 'Online Booking'],
                ['Status', st.label],
                b.notes && ['Notes', b.notes],
              ].filter(r => r && r[1]).map(([k, v]) => (
                <div key={k} style={{ padding: '6px 10px', background: '#FAFAF8', borderRadius: 8 }}>
                  <p style={{ fontSize: 10, color: '#bbb', marginBottom: 1 }}>{k}</p>
                  <p style={{ fontSize: 13, color: '#333', fontWeight: 500 }}>{v}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function StaffHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [unread, setUnread] = useState(0);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const refreshRef = useRef(null);

  const todayStr = useCallback(() => {
    const IST = 5.5 * 60 * 60 * 1000;
    return new Date(Date.now() + IST).toISOString().split('T')[0];
  }, []);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [pRes, eRes, nRes, bRes] = await Promise.allSettled([
        api.get('/staff/me'),
        api.get('/staff/my/earnings', { params: { period: 'month' } }),
        api.get('/notifications', { params: { unreadOnly: 'true' } }),
        api.get('/bookings', { params: { date: todayStr() } }),
      ]);
      if (pRes.status === 'fulfilled') setProfile(pRes.value.data.staff);
      if (eRes.status === 'fulfilled') setEarnings(eRes.value.data.summary);
      if (nRes.status === 'fulfilled') setUnread(nRes.value.data.unreadCount || 0);
      if (bRes.status === 'fulfilled') setBookings(bRes.value.data.bookings || []);
    } catch {}
    finally { if (!silent) setLoading(false); }
  }, [todayStr]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-refresh bookings every 30s (silent)
  useEffect(() => {
    refreshRef.current = setInterval(() => fetchAll(true), 30_000);
    const onVis = () => { if (!document.hidden) fetchAll(true); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(refreshRef.current); document.removeEventListener('visibilitychange', onVis); };
  }, [fetchAll]);

  const desg = DESG[profile?.designation] || profile?.designation || '';
  const specs = profile?.specializations || [];
  const joining = profile?.joiningDate ? new Date(profile.joiningDate) : null;
  const months = joining ? Math.floor((Date.now() - joining.getTime()) / (30 * 24 * 3600 * 1000)) : 0;
  const tenure = months < 12 ? `${months}mo` : `${Math.floor(months / 12)}y ${months % 12}mo`;

  // Categorize bookings
  const active = bookings.find(b => b.status === 'in-progress');
  const upcoming = bookings.filter(b => ['confirmed', 'pending'].includes(b.status));
  const completed = bookings.filter(b => b.status === 'completed');
  const cancelled = bookings.filter(b => ['cancelled', 'no-show'].includes(b.status));
  const totalToday = bookings.filter(b => b.status !== 'cancelled' && b.status !== 'no-show').length;

  const navCards = [
    { label: 'Service History', desc: 'Completed services', icon: Scissors, path: '/staff/history' },
    { label: 'My Salary', desc: 'Payslips & breakdown', icon: IndianRupee, path: '/staff/salary',
      stat: earnings?.netSalary > 0 ? `₹${Number(earnings.netSalary).toLocaleString('en-IN')}` : null },
    { label: 'Attendance', desc: 'Calendar & hours', icon: Clock, path: '/staff/attendance' },
    { label: 'Notifications', desc: unread > 0 ? `${unread} unread` : 'From admin', icon: Bell, path: '/staff/notifications', badge: unread || null },
  ];

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><Loader2 size={22} className="animate-spin" style={{ color: '#B8860B' }} /></div>;

  return (
    <motion.div variants={stagger()} initial="hidden" animate="show" style={{ fontFamily: "'DM Sans',sans-serif" }}>

      {/* Greeting */}
      <motion.div variants={fade} style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, color: '#999', fontWeight: 500, letterSpacing: '0.02em' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', fontFamily: "'Playfair Display',serif", marginTop: 2 }}>
          {greet()}, {user?.name?.split(' ')[0]}
        </h1>
        {desg && <p style={{ fontSize: 13, color: '#B8860B', fontWeight: 500, marginTop: 3 }}>{desg}</p>}
      </motion.div>

      {/* Now Serving Hero — shows when a booking is in-progress */}
      {active && (
        <motion.div variants={fade} style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2518 100%)',
          borderRadius: 16, padding: '20px 22px', marginBottom: 20, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle,rgba(184,134,11,0.15),transparent)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Play size={10} style={{ color: '#F59E0B' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Now Serving</span>
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#F5E6B8', fontFamily: "'Playfair Display',serif" }}>
            {active.service?.name || 'Service'}
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
            {active.customer?.name || 'Walk-in'}
            {active.timeSlot?.start && <span> · Started {fmtT(active.timeSlot.start)}</span>}
            {active.service?.duration && <span> · {active.service.duration} min</span>}
          </p>
        </motion.div>
      )}

      {/* Today's Stats Strip */}
      {totalToday > 0 && (
        <motion.div variants={fade} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Total', val: totalToday, color: '#1a1a1a' },
            { label: 'Upcoming', val: upcoming.length, color: '#1E40AF' },
            { label: 'Done', val: completed.length, color: '#166534' },
            ...(active ? [{ label: 'Active', val: 1, color: '#92400E' }] : []),
          ].map(({ label, val, color }) => (
            <div key={label} style={{
              flex: 1, padding: '10px 8px', borderRadius: 10, textAlign: 'center',
              background: '#fff', border: '1px solid #eee',
            }}>
              <p style={{ fontSize: 18, fontWeight: 700, color, fontFamily: "'Playfair Display',serif" }}>{val}</p>
              <p style={{ fontSize: 10, color: '#bbb', marginTop: 1 }}>{label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Today's Appointments */}
      <motion.div variants={fade} style={{
        background: '#fff', border: '1px solid #eee', borderRadius: 14,
        overflow: 'hidden', marginBottom: 24,
      }}>
        <div style={{
          padding: '13px 18px', borderBottom: '1px solid #f3f3f3',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={14} style={{ color: '#B8860B' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Today's Schedule
            </span>
          </div>
          {bookings.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#B8860B', background: '#FBF6EE', padding: '2px 8px', borderRadius: 6 }}>
              {bookings.length}
            </span>
          )}
        </div>

        {bookings.length === 0 ? (
          <div style={{ padding: '32px 18px', textAlign: 'center' }}>
            <Calendar size={22} style={{ color: '#e5e5e5', margin: '0 auto 8px' }} />
            <p style={{ fontSize: 14, color: '#bbb' }}>No appointments today</p>
          </div>
        ) : (
          <div>{bookings.map((b, i) => <BookingItem key={b._id || i} b={b} defaultOpen={b.status === 'in-progress'} />)}</div>
        )}
      </motion.div>

      {/* Quick Nav */}
      <motion.div variants={stagger(0.04)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        {navCards.map(({ label, desc, icon: Icon, path, stat, badge }) => (
          <motion.button key={path} variants={fade} onClick={() => navigate(path)} style={{
            position: 'relative', textAlign: 'left', padding: '16px 14px',
            background: '#fff', border: '1px solid #eee', borderRadius: 12,
            cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#d4d4d4'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#eee'; e.currentTarget.style.boxShadow = 'none'; }}>
            {badge && (
              <span style={{ position: 'absolute', top: 10, right: 10, minWidth: 18, height: 18, borderRadius: 9, background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
                {badge > 9 ? '9+' : badge}
              </span>
            )}
            <Icon size={16} style={{ color: '#B8860B', marginBottom: 10 }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{label}</p>
            <p style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{stat || desc}</p>
          </motion.button>
        ))}
      </motion.div>

      {/* Profile */}
      {profile && (
        <motion.div variants={fade} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px', borderBottom: '1px solid #f3f3f3', display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={13} style={{ color: '#aaa' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Profile</span>
          </div>
          <div style={{ padding: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              {[
                { icon: Mail, label: 'Email', val: user?.email },
                { icon: Phone, label: 'Phone', val: user?.phone || profile.user?.phone },
              ].filter(r => r.val).map(({ icon: Ic, label, val }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#FAFAF8', borderRadius: 8 }}>
                  <Ic size={13} style={{ color: '#ccc', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 10, color: '#bbb' }}>{label}</p>
                    <p style={{ fontSize: 12, color: '#333', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</p>
                  </div>
                </div>
              ))}
            </div>
            {specs.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Specializations</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {specs.map(s => <span key={s} style={{ padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 500, background: '#FBF6EE', color: '#B8860B', border: '1px solid #F0E6D0' }}>{SPEC[s]||s}</span>)}
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              <div style={{ padding: '10px 12px', background: '#FAFAF8', borderRadius: 8, textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#B8860B', fontFamily: "'Playfair Display',serif" }}>{profile.totalServicesCompleted || 0}</p>
                <p style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>Total Services</p>
              </div>
              <div style={{ padding: '10px 12px', background: '#FAFAF8', borderRadius: 8, textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#6D28D9', fontFamily: "'Playfair Display',serif" }}>{profile.averageRating ? `${profile.averageRating.toFixed(1)}★` : '—'}</p>
                <p style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>Rating</p>
              </div>
            </div>
            {profile.schedule?.shiftStart && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#FAFAF8', borderRadius: 8, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={12} style={{ color: '#ccc' }} />
                  <span style={{ fontSize: 12, color: '#555', fontWeight: 500 }}>{profile.schedule.shiftStart} – {profile.schedule.shiftEnd}</span>
                </div>
                {profile.schedule.weeklyOff?.length > 0 && (
                  <span style={{ fontSize: 12, color: '#aaa' }}>Off: {profile.schedule.weeklyOff.map(d => d.slice(0, 3)).join(', ')}</span>
                )}
              </div>
            )}
            {joining && (
              <p style={{ fontSize: 11, color: '#ccc', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Briefcase size={11} /> Joined {joining.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                {months > 0 && ` · ${tenure}`}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}