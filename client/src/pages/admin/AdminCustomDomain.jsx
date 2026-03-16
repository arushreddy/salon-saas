// src/pages/admin/AdminCustomDomain.jsx
// Custom domain setup UI — shown inside AdminWebsite domain tab
import { useState, useEffect } from 'react';
import { CheckCircle2, Copy, ExternalLink, Loader2, AlertCircle, Globe, Shield } from 'lucide-react';
import api from '@/services/api';

const C = {
  gold: '#B8860B', goldPale: '#FFF8E7',
  ink: '#1A1208', inkMid: '#5C4A2A', inkLight: '#9C8660',
  border: '#DFD0A8', card: '#FFFFFF',
  green: '#15803D', greenPale: '#DCFCE7',
  red: '#991B1B', redPale: '#FEF2F2',
  blue: '#1d4ed8', bluePale: '#eff6ff',
  orange: '#c2410c', orangePale: '#fff7ed',
};

const PLATFORM_URL = import.meta.env.VITE_PLATFORM_URL || window.location.origin;
const PLATFORM_HOST = PLATFORM_URL.replace('https://', '').replace('http://', '');

const CopyBox = ({ value }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1A1208', borderRadius: 10, padding: '10px 14px' }}>
      <code style={{ flex: 1, color: '#FAF6EF', fontSize: 13, fontFamily: 'monospace', wordBreak: 'break-all' }}>{value}</code>
      <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        style={{ background: copied ? C.green : C.gold, color: copied ? '#fff' : C.ink, border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
        {copied ? <><CheckCircle2 size={11}/> Copied</> : <><Copy size={11}/> Copy</>}
      </button>
    </div>
  );
};

const Step = ({ number, title, children, done }) => (
  <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
    <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', background: done ? C.green : C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {done ? <CheckCircle2 size={16} color="#fff"/> : <span style={{ fontSize: 13, fontWeight: 800, color: '#1A1208' }}>{number}</span>}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  </div>
);

export default function AdminCustomDomain() {
  const [customDomain, setCustomDomain] = useState('');
  const [savedDomain,  setSavedDomain]  = useState('');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [checking, setChecking] = useState(false);
  const [dnsStatus, setDnsStatus] = useState(null); // 'ok' | 'pending' | 'error'
  const [error, setError] = useState('');
  const [domainType, setDomainType] = useState('subdomain'); // 'subdomain' | 'root'

  // Load current setting
  useEffect(() => {
    api.get('/settings').then(({ data }) => {
      const d = data.settings?.publicWebsite?.customDomain || '';
      setCustomDomain(d);
      setSavedDomain(d);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      await api.patch('/settings', { publicWebsite: { customDomain: customDomain.toLowerCase().trim() } });
      setSavedDomain(customDomain.toLowerCase().trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const checkDNS = async () => {
    if (!savedDomain) return;
    setChecking(true); setDnsStatus(null);
    try {
      // Try to fetch salon-info from the custom domain
      const res = await fetch(`https://${savedDomain}/api/public/salon-info`, { mode: 'no-cors' });
      setDnsStatus('ok');
    } catch {
      setDnsStatus('pending');
    } finally { setChecking(false); }
  };

  // Derive DNS record values based on domain type
  const isSubdomain   = customDomain.split('.').length > 2;
  const subdomainPart = isSubdomain ? customDomain.split('.')[0] : '@';

  return (
    <div>
      {/* Header info */}
      <div style={{ background: C.goldPale, border: `1px solid ${C.gold}40`, borderRadius: 12, padding: '14px 16px', marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, marginBottom: 4 }}>🌍 Point your own domain to your booking page</div>
        <div style={{ fontSize: 12, color: C.inkMid }}>
          Instead of <code style={{ background: '#fff', padding: '1px 6px', borderRadius: 4 }}>{PLATFORM_HOST}/book/your-slug</code>, your customers go to your own domain like <code style={{ background: '#fff', padding: '1px 6px', borderRadius: 4 }}>book.royalcuts.com</code>
        </div>
      </div>

      {/* Domain type selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.inkMid, marginBottom: 10 }}>What type of domain do you want?</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { id: 'subdomain', label: '📌 Subdomain', example: 'book.royalcuts.com', desc: 'Recommended — your main site stays untouched' },
            { id: 'root',      label: '🌐 Root domain', example: 'royalcuts.com', desc: 'Entire domain points to booking page' },
          ].map(({ id, label, example, desc }) => (
            <div key={id} onClick={() => setDomainType(id)} style={{
              flex: 1, padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
              background: domainType === id ? C.goldPale : C.card,
              border: `2px solid ${domainType === id ? C.gold : C.border}`,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: domainType === id ? C.gold : C.ink, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 12, color: C.gold, fontFamily: 'monospace', marginBottom: 4 }}>{example}</div>
              <div style={{ fontSize: 11, color: C.inkLight }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Step 1 — Enter domain */}
      <Step number="1" title="Enter your custom domain" done={!!savedDomain}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={customDomain}
            onChange={e => setCustomDomain(e.target.value.toLowerCase().replace(/\s/g, ''))}
            placeholder={domainType === 'subdomain' ? 'book.royalcuts.com' : 'royalcuts.com'}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 10,
              border: `1.5px solid ${C.border}`, background: '#FDFAF9',
              fontSize: 14, color: C.ink, outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = C.gold}
            onBlur={e => e.target.style.borderColor = C.border}
          />
          <button onClick={handleSave} disabled={saving || !customDomain} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: saved ? C.green : C.gold, color: saved ? '#fff' : C.ink,
            border: 'none', borderRadius: 10, padding: '10px 20px',
            fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            opacity: !customDomain ? 0.5 : 1,
          }}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }}/> : null}
            {saved ? '✅ Saved' : saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {error && <div style={{ fontSize: 12, color: C.red, marginTop: 8 }}>{error}</div>}
      </Step>

      {/* Step 2 — Add DNS record */}
      <Step number="2" title={`Add this DNS record at your domain registrar`} done={dnsStatus === 'ok'}>
        <div style={{ marginBottom: 12, fontSize: 13, color: C.inkMid }}>
          Go to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) → DNS Settings → Add this record:
        </div>

        {domainType === 'subdomain' ? (
          // CNAME record for subdomain
          <div style={{ background: '#1A1208', borderRadius: 12, padding: '16px 20px', marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 120px 1fr', gap: '6px 16px' }}>
              <div style={{ color: C.gold, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Type</div>
              <div style={{ color: C.gold, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Name</div>
              <div style={{ color: C.gold, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Value / Target</div>
              <div style={{ color: '#FAF6EF', fontFamily: 'monospace', fontSize: 14, fontWeight: 700 }}>CNAME</div>
              <div style={{ color: '#FAF6EF', fontFamily: 'monospace', fontSize: 14 }}>{customDomain ? customDomain.split('.')[0] : 'book'}</div>
              <div style={{ color: C.gold, fontFamily: 'monospace', fontSize: 14 }}>{PLATFORM_HOST}</div>
            </div>
          </div>
        ) : (
          // A record for root domain
          <div style={{ background: '#1A1208', borderRadius: 12, padding: '16px 20px', marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 120px 1fr', gap: '6px 16px' }}>
              <div style={{ color: C.gold, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Type</div>
              <div style={{ color: C.gold, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Name</div>
              <div style={{ color: C.gold, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Value / IP</div>
              <div style={{ color: '#FAF6EF', fontFamily: 'monospace', fontSize: 14, fontWeight: 700 }}>A</div>
              <div style={{ color: '#FAF6EF', fontFamily: 'monospace', fontSize: 14 }}>@</div>
              <div style={{ color: C.gold, fontFamily: 'monospace', fontSize: 14 }}>YOUR_SERVER_IP</div>
            </div>
          </div>
        )}

        <div style={{ background: C.bluePale, border: `1px solid #93c5fd`, borderRadius: 10, padding: '10px 14px', fontSize: 12, color: C.blue }}>
          <strong>💡 Using Cloudflare?</strong> Set proxy to <strong>ON (orange cloud ☁️)</strong> — SSL is handled automatically for free. DNS changes take 5 minutes.
          <br/><strong>Using GoDaddy/Namecheap?</strong> DNS changes can take up to 48 hours, but usually under 1 hour.
        </div>
      </Step>

      {/* Step 3 — SSL */}
      <Step number="3" title="SSL Certificate (HTTPS)" done={dnsStatus === 'ok'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: C.greenPale, border: `1px solid #86EFAC`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.green, marginBottom: 4 }}>
              ✅ Easiest: Use Cloudflare (Free)
            </div>
            <div style={{ fontSize: 12, color: C.inkMid }}>
              Move your domain DNS to Cloudflare → enable proxy (orange cloud) → SSL is automatic. Takes 5 minutes. No server access needed.
            </div>
            <a href="https://cloudflare.com" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 12, color: C.green, fontWeight: 600 }}>
              Go to Cloudflare <ExternalLink size={12}/>
            </a>
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 4 }}>
              🖥️ If using VPS — run this command on your server:
            </div>
            <CopyBox value={`sudo certbot certonly --nginx -d ${customDomain || 'book.royalcuts.com'}`} />
          </div>
        </div>
      </Step>

      {/* Step 4 — Verify */}
      <Step number="4" title="Verify it's working" done={dnsStatus === 'ok'}>
        {savedDomain ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={checkDNS} disabled={checking} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: C.gold, color: C.ink, border: 'none', borderRadius: 10,
                padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: checking ? 'not-allowed' : 'pointer',
              }}>
                {checking ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }}/> : <Globe size={14}/>}
                {checking ? 'Checking…' : 'Check DNS Status'}
              </button>
              <a href={`https://${savedDomain}`} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: C.card, color: C.inkMid, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
              }}>
                <ExternalLink size={14}/> Open {savedDomain}
              </a>
            </div>

            {dnsStatus === 'ok' && (
              <div style={{ background: C.greenPale, border: `1px solid #86EFAC`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={18} color={C.green}/>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>Domain is live!</div>
                  <div style={{ fontSize: 12, color: C.inkMid }}>Customers can now book at <strong>{savedDomain}</strong></div>
                </div>
              </div>
            )}

            {dnsStatus === 'pending' && (
              <div style={{ background: C.orangePale, border: `1px solid #fdba74`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={18} color={C.orange}/>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.orange }}>DNS not active yet</div>
                  <div style={{ fontSize: 12, color: C.inkMid }}>DNS changes can take up to 48 hours. Check back later.</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: C.inkLight }}>Save your domain first, then verify.</div>
        )}
      </Step>

      {/* Summary */}
      {savedDomain && (
        <div style={{ background: C.goldPale, border: `1px solid ${C.gold}40`, borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, marginBottom: 10 }}>📋 Your booking URLs</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Custom domain (after DNS)', value: `https://${savedDomain}` },
              { label: 'Platform URL (always works)', value: `${PLATFORM_URL}/book/your-slug` },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: C.inkLight, marginBottom: 4 }}>{label}</div>
                <CopyBox value={value} />
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}