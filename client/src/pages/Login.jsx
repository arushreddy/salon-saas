// src/pages/Login.jsx
import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, LogIn, Loader2, Phone, Mail, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

const C = {
  bg:        '#FAF6EF',
  card:      '#FFFFFF',
  gold:      '#B8860B',
  goldPale:  '#FFF8E7',
  ink:       '#1A1208',
  inkMid:    '#5C4A2A',
  inkLight:  '#9C8660',
  border:    '#DFD0A8',
  green:     '#15803D',
  greenPale: '#DCFCE7',
  red:       '#991B1B',
  redPale:   '#FEF2F2',
  blue:      '#1d4ed8',
  bluePale:  '#eff6ff',
};

const ROLE_REDIRECT = {
  super_admin:       '/superadmin',
  franchise_owner:   '/franchise',
  franchise_manager: '/franchise',
  admin:             '/admin',
  receptionist:      '/staff',
  staff:             '/staff',
  customer:          '/dashboard',
};

// ── Shared input ───────────────────────────────────────────────────────────
const Inp = ({ label, icon: Icon, rightEl, error, ...p }) => (
  <div>
    {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.inkMid, marginBottom: 6 }}>{label}</label>}
    <div style={{ position: 'relative' }}>
      {Icon && <Icon size={16} color={C.inkLight} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />}
      <input {...p} style={{
        width: '100%', boxSizing: 'border-box',
        padding: `11px ${rightEl ? '48px' : '14px'} 11px ${Icon ? '40px' : '14px'}`,
        borderRadius: 10, border: `1.5px solid ${error ? C.red : C.border}`,
        background: '#FDFAF9', fontSize: 14, color: C.ink,
        outline: 'none', transition: 'border-color 0.15s', ...(p.style || {}),
      }}
        onFocus={e => e.target.style.borderColor = C.gold}
        onBlur={e => e.target.style.borderColor = error ? C.red : C.border}
      />
      {rightEl && <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>{rightEl}</div>}
    </div>
    {error && <p style={{ fontSize: 11, color: C.red, margin: '4px 0 0' }}>{error}</p>}
  </div>
);

// ── OTP Input — 6 separate boxes using named refs (NO hooks in loops) ──────
const OTPInput = ({ value, onChange }) => {
  const r0 = useRef(null); const r1 = useRef(null); const r2 = useRef(null);
  const r3 = useRef(null); const r4 = useRef(null); const r5 = useRef(null);
  const refs = [r0, r1, r2, r3, r4, r5];
  const digits = Array.from({ length: 6 }, (_, i) => value?.[i] || '');

  const handleChange = (i, e) => {
    const v = e.target.value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = v;
    onChange(next.join(''));
    if (v && i < 5) refs[i + 1].current?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      if (digits[i]) {
        const next = [...digits]; next[i] = ''; onChange(next.join(''));
      } else if (i > 0) {
        refs[i - 1].current?.focus();
      }
    }
    if (e.key === 'ArrowLeft'  && i > 0) refs[i - 1].current?.focus();
    if (e.key === 'ArrowRight' && i < 5) refs[i + 1].current?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted.padEnd(6, '').slice(0, 6));
    refs[Math.min(pasted.length, 5)].current?.focus();
  };

  const boxStyle = (d) => ({
    width: 44, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 700,
    color: C.ink, border: `2px solid ${d ? C.gold : C.border}`, borderRadius: 10,
    background: d ? C.goldPale : '#FDFAF9', outline: 'none',
    transition: 'all 0.15s', caretColor: C.gold,
  });

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      <input ref={r0} type="text" inputMode="numeric" maxLength={1} value={digits[0]}
        onChange={e => handleChange(0, e)} onKeyDown={e => handleKeyDown(0, e)} onPaste={handlePaste}
        style={boxStyle(digits[0])} onFocus={e => e.target.style.borderColor = C.gold} onBlur={e => e.target.style.borderColor = digits[0] ? C.gold : C.border} />
      <input ref={r1} type="text" inputMode="numeric" maxLength={1} value={digits[1]}
        onChange={e => handleChange(1, e)} onKeyDown={e => handleKeyDown(1, e)} onPaste={handlePaste}
        style={boxStyle(digits[1])} onFocus={e => e.target.style.borderColor = C.gold} onBlur={e => e.target.style.borderColor = digits[1] ? C.gold : C.border} />
      <input ref={r2} type="text" inputMode="numeric" maxLength={1} value={digits[2]}
        onChange={e => handleChange(2, e)} onKeyDown={e => handleKeyDown(2, e)} onPaste={handlePaste}
        style={boxStyle(digits[2])} onFocus={e => e.target.style.borderColor = C.gold} onBlur={e => e.target.style.borderColor = digits[2] ? C.gold : C.border} />
      <input ref={r3} type="text" inputMode="numeric" maxLength={1} value={digits[3]}
        onChange={e => handleChange(3, e)} onKeyDown={e => handleKeyDown(3, e)} onPaste={handlePaste}
        style={boxStyle(digits[3])} onFocus={e => e.target.style.borderColor = C.gold} onBlur={e => e.target.style.borderColor = digits[3] ? C.gold : C.border} />
      <input ref={r4} type="text" inputMode="numeric" maxLength={1} value={digits[4]}
        onChange={e => handleChange(4, e)} onKeyDown={e => handleKeyDown(4, e)} onPaste={handlePaste}
        style={boxStyle(digits[4])} onFocus={e => e.target.style.borderColor = C.gold} onBlur={e => e.target.style.borderColor = digits[4] ? C.gold : C.border} />
      <input ref={r5} type="text" inputMode="numeric" maxLength={1} value={digits[5]}
        onChange={e => handleChange(5, e)} onKeyDown={e => handleKeyDown(5, e)} onPaste={handlePaste}
        style={boxStyle(digits[5])} onFocus={e => e.target.style.borderColor = C.gold} onBlur={e => e.target.style.borderColor = digits[5] ? C.gold : C.border} />
    </div>
  );
};

// ── Dev OTP banner ─────────────────────────────────────────────────────────
const DevOTPBanner = ({ otp, onUse }) => (
  <div style={{ background: C.bluePale, border: `1.5px dashed ${C.blue}`, borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 6 }}>🛠 Dev Mode — No SMS sent</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 13, color: C.blue }}>OTP: <strong style={{ fontSize: 20, letterSpacing: 5, fontFamily: 'monospace' }}>{otp}</strong></span>
      <button type="button" onClick={() => onUse(otp)} style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Auto-fill ↓</button>
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mode, setMode] = useState('email-pw');

  // Email + password
  const [epForm, setEpForm] = useState({ email: '', password: '' });
  const [showPw,  setShowPw]  = useState(false);

  // Phone OTP login
  const [poPhone,    setPoPhone]    = useState('');
  const [poOTP,      setPoOTP]      = useState('');
  const [poSent,     setPoSent]     = useState(false);
  const [poDevOtp,   setPoDevOtp]   = useState('');
  const [poCooldown, setPoCooldown] = useState(0);

  // Forgot password
  const [fpStep,    setFpStep]    = useState(1);
  const [fpId,      setFpId]      = useState('');
  const [fpChannel, setFpChannel] = useState('email');
  const [fpOTP,     setFpOTP]     = useState('');
  const [fpNewPw,   setFpNewPw]   = useState('');
  const [fpShowPw,  setFpShowPw]  = useState(false);
  const [fpDevOtp,  setFpDevOtp]  = useState('');

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const clearError = () => setError('');

  const startCooldown = () => {
    let s = 30;
    setPoCooldown(s);
    const t = setInterval(() => { s--; setPoCooldown(s); if (s <= 0) clearInterval(t); }, 1000);
  };

  const redirectByRole = (role) => navigate(ROLE_REDIRECT[role] || '/admin');

  const ErrorBox = () => error ? (
    <div style={{ background: C.redPale, border: `1px solid ${C.red}30`, borderRadius: 9, padding: '10px 14px', fontSize: 13, color: C.red, marginBottom: 16 }}>{error}</div>
  ) : null;

  // ── Email login ────────────────────────────────────────────────────────
  const handleEmailLogin = async (e) => {
    e.preventDefault(); setLoading(true); clearError();
    try {
      const data = await login(epForm.email, epForm.password);
      redirectByRole(data.user.role);
    } catch (err) { setError(err.response?.data?.message || 'Login failed.'); }
    finally { setLoading(false); }
  };

  // ── Send OTP ───────────────────────────────────────────────────────────
  const handleSendPhoneOTP = async () => {
    const digits = poPhone.replace(/\D/g, '');
    if (!digits || digits.length < 10) { setError('Enter a valid 10-digit phone number'); return; }
    setLoading(true); clearError(); setPoDevOtp('');
    try {
      const { data } = await api.post('/auth/send-otp', { identifier: digits, channel: 'phone', purpose: 'login' });
      setPoSent(true); startCooldown();
      if (data.devOtp) setPoDevOtp(data.devOtp);
    } catch (err) { setError(err.response?.data?.message || 'Failed to send OTP.'); }
    finally { setLoading(false); }
  };

  // ── Verify OTP ─────────────────────────────────────────────────────────
  const handlePhoneOTPLogin = async (e) => {
    e.preventDefault();
    if (poOTP.replace(/\s/g,'').length < 6) { setError('Enter the 6-digit OTP'); return; }
    setLoading(true); clearError();
    try {
      const { data } = await api.post('/auth/verify-otp-login', { identifier: poPhone.replace(/\D/g, ''), channel: 'phone', otp: poOTP.replace(/\s/g,'') });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      redirectByRole(data.user.role);
    } catch (err) { setError(err.response?.data?.message || 'Invalid OTP.'); }
    finally { setLoading(false); }
  };

  // ── Forgot: send OTP ───────────────────────────────────────────────────
  const handleForgotSendOTP = async () => {
    if (!fpId.trim()) { setError('Enter your phone or email'); return; }
    setLoading(true); clearError(); setFpDevOtp('');
    try {
      const { data } = await api.post('/auth/send-otp', {
        identifier: fpChannel === 'phone' ? fpId.replace(/\D/g, '') : fpId.toLowerCase(),
        channel: fpChannel, purpose: 'reset',
      });
      setFpStep(2); startCooldown();
      if (data.devOtp) setFpDevOtp(data.devOtp);
    } catch (err) { setError(err.response?.data?.message || 'Failed to send OTP.'); }
    finally { setLoading(false); }
  };

  // ── Forgot: reset password ─────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (fpOTP.replace(/\s/g,'').length < 6) { setError('Enter the 6-digit OTP'); return; }
    if (fpNewPw.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); clearError();
    try {
      await api.post('/auth/reset-password-otp', {
        identifier: fpChannel === 'phone' ? fpId.replace(/\D/g, '') : fpId.toLowerCase(),
        channel: fpChannel, otp: fpOTP.replace(/\s/g,''), newPassword: fpNewPw,
      });
      setFpStep(3);
    } catch (err) { setError(err.response?.data?.message || 'Failed to reset password.'); }
    finally { setLoading(false); }
  };

  const tabStyle = (active) => ({
    flex: 1, padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 600,
    background: active ? C.card : 'transparent',
    color: active ? C.ink : C.inkLight,
    boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
  });

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '10%', right: '15%', width: 320, height: 320, borderRadius: '50%', background: `${C.gold}08`, filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '15%', left: '10%', width: 400, height: 400, borderRadius: '50%', background: `${C.gold}05`, filter: 'blur(80px)', pointerEvents: 'none' }} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 400, fontStyle: 'italic', color: C.ink }}>
              Glamour<span style={{ color: C.gold }}>.</span>
            </span>
          </Link>
          <p style={{ fontSize: 13, color: C.inkLight, marginTop: 6 }}>
            {mode === 'forgot' ? 'Reset your password' : 'Sign in to your account'}
          </p>
        </div>

        <div style={{ background: C.card, borderRadius: 20, padding: '28px', boxShadow: '0 4px 32px rgba(184,134,11,0.08)', border: `1px solid ${C.border}` }}>
          <AnimatePresence mode="wait">

            {/* ═══ EMAIL + PASSWORD ══════════════════════════════════════ */}
            {mode === 'email-pw' && (
              <motion.div key="email-pw" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <div style={{ display: 'flex', marginBottom: 24, background: '#F5F0E8', borderRadius: 10, padding: 3 }}>
                  <button style={tabStyle(true)}  onClick={() => { setMode('email-pw');  clearError(); }}>📧 Email</button>
                  <button style={tabStyle(false)} onClick={() => { setMode('phone-otp'); clearError(); }}>📱 Phone OTP</button>
                </div>
                <ErrorBox />
                <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Inp label="Email Address" icon={Mail} type="email" placeholder="admin@salon.com"
                    value={epForm.email} onChange={e => setEpForm(f => ({ ...f, email: e.target.value }))} required />
                  <Inp label="Password" icon={KeyRound} type={showPw ? 'text' : 'password'} placeholder="Your password"
                    value={epForm.password} onChange={e => setEpForm(f => ({ ...f, password: e.target.value }))} required
                    rightEl={<button type="button" onClick={() => setShowPw(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.inkLight, display: 'flex' }}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
                  />
                  <div style={{ textAlign: 'right', marginTop: -8 }}>
                    <button type="button" onClick={() => { setMode('forgot'); clearError(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gold, fontSize: 13, fontWeight: 600, padding: 0 }}>Forgot password?</button>
                  </div>
                  <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, border: 'none', background: C.gold, color: '#1A1208', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                    {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <LogIn size={18} />}
                    {loading ? 'Signing in…' : 'Sign In'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ═══ PHONE OTP ═════════════════════════════════════════════ */}
            {mode === 'phone-otp' && (
              <motion.div key="phone-otp" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <div style={{ display: 'flex', marginBottom: 24, background: '#F5F0E8', borderRadius: 10, padding: 3 }}>
                  <button style={tabStyle(false)} onClick={() => { setMode('email-pw'); clearError(); setPoSent(false); setPoOTP(''); setPoDevOtp(''); }}>📧 Email</button>
                  <button style={tabStyle(true)}  onClick={() => { setMode('phone-otp'); clearError(); }}>📱 Phone OTP</button>
                </div>
                <ErrorBox />

                {!poSent ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <Inp label="Mobile Number" icon={Phone} type="tel" placeholder="98765 43210"
                      value={poPhone} onChange={e => setPoPhone(e.target.value)} maxLength={10} />
                    <button onClick={handleSendPhoneOTP} disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, border: 'none', background: C.gold, color: '#1A1208', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                      {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Phone size={18} />}
                      {loading ? 'Sending…' : 'Send OTP'}
                    </button>
                    <div style={{ textAlign: 'center' }}>
                      <button type="button" onClick={() => { setMode('forgot'); clearError(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gold, fontSize: 13, fontWeight: 600, padding: 0 }}>Forgot password?</button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handlePhoneOTPLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {poDevOtp && <DevOTPBanner otp={poDevOtp} onUse={setPoOTP} />}

                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 13, color: C.inkMid, marginBottom: 16 }}>
                        OTP sent to <b>+91 {poPhone}</b>
                      </p>
                      <OTPInput value={poOTP} onChange={setPoOTP} />
                    </div>

                    <button type="submit" disabled={loading || poOTP.replace(/\s/g,'').length < 6} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: 12, borderRadius: 10, border: 'none',
                      background: poOTP.replace(/\s/g,'').length === 6 ? C.gold : C.border,
                      color:      poOTP.replace(/\s/g,'').length === 6 ? '#1A1208' : C.inkLight,
                      fontSize: 15, fontWeight: 700,
                      cursor: (loading || poOTP.replace(/\s/g,'').length < 6) ? 'not-allowed' : 'pointer',
                    }}>
                      {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <LogIn size={18} />}
                      {loading ? 'Verifying…' : 'Verify & Sign In'}
                    </button>

                    <div style={{ textAlign: 'center', fontSize: 13, color: C.inkLight }}>
                      {poCooldown > 0
                        ? `Resend OTP in ${poCooldown}s`
                        : <button type="button" onClick={() => { setPoOTP(''); setPoDevOtp(''); handleSendPhoneOTP(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gold, fontWeight: 600, fontSize: 13 }}>Resend OTP</button>
                      }
                    </div>
                    <button type="button" onClick={() => { setPoSent(false); setPoOTP(''); setPoDevOtp(''); clearError(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.inkLight, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                      <ArrowLeft size={13} /> Change number
                    </button>
                  </form>
                )}
              </motion.div>
            )}

            {/* ═══ FORGOT PASSWORD ═══════════════════════════════════════ */}
            {mode === 'forgot' && (
              <motion.div key="forgot" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <button onClick={() => { setMode('email-pw'); clearError(); setFpStep(1); setFpOTP(''); setFpNewPw(''); setFpDevOtp(''); }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: C.inkLight, fontSize: 13, marginBottom: 20, padding: 0 }}>
                  <ArrowLeft size={14} /> Back to login
                </button>

                {fpStep === 3 ? (
                  <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: C.greenPale, margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={28} color={C.green} />
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 6 }}>Password Reset!</div>
                    <div style={{ fontSize: 13, color: C.inkLight, marginBottom: 20 }}>Your password has been updated.</div>
                    <button onClick={() => { setMode('email-pw'); setFpStep(1); clearError(); }} style={{ padding: '11px 28px', borderRadius: 10, border: 'none', background: C.gold, color: '#1A1208', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Sign In Now</button>
                  </div>
                ) : (
                  <>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: C.ink, margin: '0 0 4px' }}>
                      {fpStep === 1 ? 'Reset Password' : 'Enter OTP & New Password'}
                    </h3>
                    <p style={{ fontSize: 13, color: C.inkLight, margin: '0 0 20px' }}>
                      {fpStep === 1 ? "Enter your registered phone or email." : `OTP sent to ${fpId}.`}
                    </p>
                    <ErrorBox />

                    {fpStep === 1 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {[['email', '📧 Email'], ['phone', '📱 Phone']].map(([v, l]) => (
                            <button key={v} onClick={() => { setFpChannel(v); setFpId(''); clearError(); }} style={{ flex: 1, padding: 8, borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: fpChannel === v ? C.goldPale : '#F5F0E8', border: `1.5px solid ${fpChannel === v ? C.gold : C.border}`, color: fpChannel === v ? C.gold : C.inkMid }}>{l}</button>
                          ))}
                        </div>
                        <Inp icon={fpChannel === 'email' ? Mail : Phone} type={fpChannel === 'email' ? 'email' : 'tel'} placeholder={fpChannel === 'email' ? 'admin@salon.com' : '98765 43210'} value={fpId} onChange={e => setFpId(e.target.value)} />
                        <button onClick={handleForgotSendOTP} disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, border: 'none', background: C.gold, color: '#1A1208', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                          {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                          {loading ? 'Sending…' : 'Send OTP'}
                        </button>
                      </div>
                    )}

                    {fpStep === 2 && (
                      <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {fpDevOtp && <DevOTPBanner otp={fpDevOtp} onUse={setFpOTP} />}
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.inkMid, marginBottom: 10 }}>Enter OTP</label>
                          <OTPInput value={fpOTP} onChange={setFpOTP} />
                        </div>
                        <Inp label="New Password" icon={KeyRound} type={fpShowPw ? 'text' : 'password'} placeholder="Min 6 characters" value={fpNewPw} onChange={e => setFpNewPw(e.target.value)}
                          rightEl={<button type="button" onClick={() => setFpShowPw(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.inkLight, display: 'flex' }}>{fpShowPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
                        />
                        <button type="submit" disabled={loading || fpOTP.replace(/\s/g,'').length < 6 || fpNewPw.length < 6} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, border: 'none', background: (fpOTP.replace(/\s/g,'').length === 6 && fpNewPw.length >= 6) ? C.gold : C.border, color: (fpOTP.replace(/\s/g,'').length === 6 && fpNewPw.length >= 6) ? '#1A1208' : C.inkLight, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
                          {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={16} />}
                          {loading ? 'Resetting…' : 'Reset Password'}
                        </button>
                        <div style={{ textAlign: 'center', fontSize: 13, color: C.inkLight }}>
                          {poCooldown > 0 ? `Resend OTP in ${poCooldown}s`
                            : <button type="button" onClick={handleForgotSendOTP} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gold, fontWeight: 600, fontSize: 13 }}>Resend OTP</button>}
                        </div>
                      </form>
                    )}
                  </>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {mode !== 'forgot' && (
          <p style={{ textAlign: 'center', fontSize: 12, color: C.inkLight, marginTop: 20 }}>
            Platform managed by Glamour Salon SaaS
          </p>
        )}
      </motion.div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}