// src/components/WebsiteBanner.jsx
// Shows a prominent "Your booking site is live" banner on admin dashboard
// Only visible for Plan 2 and Plan 3 salons
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Globe, Copy, CheckCircle2, ExternalLink, Settings, X, ArrowRight } from 'lucide-react';

const PLATFORM_URL = import.meta.env.VITE_PLATFORM_URL || window.location.origin;

export default function WebsiteBanner() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [copied,   setCopied]   = useState(false);
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('websiteBannerDismissed') === '1'
  );

  // Only show for plan2 and plan3
  const plan = user?.plan;
  if (!plan || plan === 'plan1') return null;
  if (dismissed) return null;

  const slug       = user?.salonSlug;
  const bookingUrl = slug ? `${PLATFORM_URL}/book/${slug}` : null;
  if (!bookingUrl) return null;

  const copy = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const dismiss = () => {
    sessionStorage.setItem('websiteBannerDismissed', '1');
    setDismissed(true);
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0E0B06 0%, #1C1608 60%, #0E0B06 100%)',
      borderRadius: 20, padding: '18px 22px',
      border: '1px solid #2E2410',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      marginBottom: 20,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: -40, right: -40, width: 200, height: 200,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(184,134,11,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Dismiss button */}
      <button onClick={dismiss} style={{
        position: 'absolute', top: 12, right: 12,
        background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%',
        width: 26, height: 26, cursor: 'pointer', color: '#9C8660',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <X size={13} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>

        {/* Left — info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg, #DAA520, #B8860B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(184,134,11,0.4)',
          }}>
            <Globe size={20} color="#1A1208" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <div style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '0.18em',
                textTransform: 'uppercase', color: '#6EE7B7',
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                padding: '2px 8px', borderRadius: 100,
              }}>
                🟢 Live
              </div>
              <span style={{ fontSize: 11, color: '#6B5030', fontWeight: 600 }}>
                {plan === 'plan3' ? 'Plan 3 — Franchise' : 'Plan 2 — Pro'}
              </span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#FAF6EF', marginBottom: 2 }}>
              Your booking website is live!
            </div>
            <div style={{
              fontSize: 12, color: '#B8860B', fontFamily: 'monospace',
              background: 'rgba(184,134,11,0.1)', padding: '3px 10px', borderRadius: 8,
              display: 'inline-block',
            }}>
              {bookingUrl}
            </div>
          </div>
        </div>

        {/* Right — actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={copy} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(184,134,11,0.15)',
            border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(184,134,11,0.3)'}`,
            color: copied ? '#6EE7B7' : '#DAA520',
            borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s',
          }}>
            {copied ? <><CheckCircle2 size={13} /> Copied!</> : <><Copy size={13} /> Copy Link</>}
          </button>

          <a href={bookingUrl} target="_blank" rel="noopener noreferrer" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            color: '#FAF6EF', borderRadius: 10, padding: '8px 14px',
            fontSize: 12, fontWeight: 600, textDecoration: 'none',
          }}>
            <ExternalLink size={13} /> Preview
          </a>

          <button onClick={() => navigate('/admin/website')} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'linear-gradient(135deg, #DAA520, #B8860B)',
            border: 'none', color: '#1A1208',
            borderRadius: 10, padding: '8px 14px',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(184,134,11,0.3)',
          }}>
            <Settings size={13} /> Customize <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}