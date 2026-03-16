// src/pages/admin/AdminWebsite.jsx
// Salon admin customizes their public booking website + gets embed code
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Globe, Link2, Code2, Palette, Image, Info,
  CheckCircle2, Copy, ExternalLink, Eye, Save,
  Loader2, Instagram, Facebook, MapPin, Smartphone,
} from 'lucide-react';
import api from '@/services/api';

const C = {
  bg: '#FAF6EF', card: '#FFFFFF',
  gold: '#B8860B', goldPale: '#FFF8E7',
  ink: '#1A1208', inkMid: '#5C4A2A', inkLight: '#9C8660',
  border: '#DFD0A8', green: '#15803D', greenPale: '#DCFCE7',
  red: '#991B1B', redPale: '#FEF2F2',
  blue: '#1d4ed8', bluePale: '#eff6ff',
};

const PLATFORM_URL = import.meta.env.VITE_PLATFORM_URL || window.location.origin;

const Section = ({ icon: Icon, title, children }) => (
  <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 20 }}>
    <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: C.goldPale, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={16} color={C.gold} />
      </div>
      <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{title}</span>
    </div>
    <div style={{ padding: '20px' }}>{children}</div>
  </div>
);

const Field = ({ label, hint, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.inkMid, marginBottom: 4 }}>{label}</label>
    {hint && <div style={{ fontSize: 11, color: C.inkLight, marginBottom: 6 }}>{hint}</div>}
    {children}
  </div>
);

const Inp = ({ value, onChange, placeholder, type = 'text', ...p }) => (
  <input
    type={type}
    value={value || ''}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    style={{
      width: '100%', boxSizing: 'border-box',
      padding: '10px 12px', borderRadius: 10,
      border: `1.5px solid ${C.border}`, background: '#FDFAF9',
      fontSize: 13, color: C.ink, outline: 'none',
      ...(p.style || {}),
    }}
    onFocus={e => e.target.style.borderColor = C.gold}
    onBlur={e => e.target.style.borderColor = C.border}
    {...p}
  />
);

const Toggle = ({ value, onChange, label }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 12 }}>
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, position: 'relative',
        background: value ? C.gold : C.border, transition: 'background 0.2s', flexShrink: 0,
        cursor: 'pointer',
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: value ? 22 : 3,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }} />
    </div>
    <span style={{ fontSize: 13, color: C.inkMid }}>{label}</span>
  </label>
);

const CodeBox = ({ code, label }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ background: '#1A1208', borderRadius: 12, overflow: 'hidden', marginTop: 8 }}>
      {label && <div style={{ padding: '8px 14px', fontSize: 11, color: C.gold, fontWeight: 600, borderBottom: '1px solid #2e1f0e' }}>{label}</div>}
      <div style={{ position: 'relative' }}>
        <pre style={{ margin: 0, padding: '14px', fontSize: 12, color: '#FAF6EF', overflowX: 'auto', lineHeight: 1.6, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {code}
        </pre>
        <button onClick={copy} style={{
          position: 'absolute', top: 10, right: 10,
          background: copied ? C.green : C.gold, color: '#1A1208',
          border: 'none', borderRadius: 8, padding: '5px 10px',
          fontSize: 11, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {copied ? <><CheckCircle2 size={12}/> Copied!</> : <><Copy size={12}/> Copy</>}
        </button>
      </div>
    </div>
  );
};

export default function AdminWebsite() {
  const [settings, setSettings] = useState(null);
  const [slug, setSlug]         = useState('');
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');
  const [activeTab, setActiveTab] = useState('website'); // 'website' | 'embed' | 'domain'

  useEffect(() => {
    const load = async () => {
      try {
        const [settingsRes, profileRes] = await Promise.all([
          api.get('/settings'),
          api.get('/auth/me'),
        ]);
        setSettings(settingsRes.data.settings || {});
        // Get salon slug from user's salon
        const salonRes = await api.get('/settings').catch(() => null);
        // Try to get slug from user context
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.salonSlug) setSlug(user.salonSlug);
      } catch (e) {
        setError('Failed to load settings');
      }
    };
    load();
  }, []);

  const update = (path, value) => {
    setSettings(prev => {
      const next = { ...prev };
      const parts = path.split('.');
      let obj = next;
      for (let i = 0; i < parts.length - 1; i++) {
        obj[parts[i]] = { ...(obj[parts[i]] || {}) };
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const pw = settings?.publicWebsite || {};

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      await api.patch('/settings', { publicWebsite: pw });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const bookingUrl  = `${PLATFORM_URL}/book/${slug}`;
  const widgetScript = `<script src="${PLATFORM_URL}/api/public/widget.js?salon=${slug}" async></script>`;
  const iframeCode   = `<iframe\n  src="${PLATFORM_URL}/book/${slug}/appointment"\n  width="100%"\n  height="700px"\n  frameborder="0"\n  style="border-radius:16px;"\n  title="Book Appointment"\n></iframe>`;
  const buttonCode   = `<!-- Book Now Button -->\n<a href="${bookingUrl}" target="_blank"\n   style="display:inline-block;background:#B8860B;color:#1A1208;\n          padding:14px 32px;border-radius:50px;font-weight:700;\n          text-decoration:none;font-family:Georgia,serif;">\n  ✂️ Book Appointment\n</a>`;

  if (!settings) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Loader2 size={28} color={C.gold} style={{ animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const tabs = [
    { id: 'website', label: '🌐 Your Website', icon: Globe },
    { id: 'embed',   label: '🔗 Embed on Existing Site', icon: Code2 },
    { id: 'domain',  label: '🌍 Custom Domain', icon: Link2 },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontStyle: 'italic', color: C.ink, margin: '0 0 6px' }}>
          Public Website & Booking
        </h1>
        <p style={{ color: C.inkLight, fontSize: 13, margin: 0 }}>
          Customize your booking page, embed it on your existing website, or set up a custom domain.
        </p>
      </div>

      {/* Live Link Banner */}
      {slug && (
        <div style={{ background: C.greenPale, border: `1px solid #86EFAC`, borderRadius: 12, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} color={C.green} />
            <span style={{ fontSize: 13, fontWeight: 600, color: C.green }}>Your booking page is live!</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.green, color: '#fff', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
              <Eye size={13} /> Preview
            </a>
            <button onClick={() => { navigator.clipboard.writeText(bookingUrl); }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: C.green, border: `1px solid #86EFAC`, padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <Copy size={13} /> Copy Link
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#F5F0E8', borderRadius: 12, padding: 4 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: '10px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
            background: activeTab === tab.id ? C.card : 'transparent',
            color: activeTab === tab.id ? C.ink : C.inkLight,
            boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div style={{ background: C.redPale, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: C.red, marginBottom: 16 }}>{error}</div>}

      {/* ═══ TAB: YOUR WEBSITE ══════════════════════════════════════════════ */}
      {activeTab === 'website' && (
        <>
          <Section icon={Palette} title="Hero Section">
            <Field label="Hero Title" hint="Main heading on your booking page (defaults to salon name)">
              <Inp value={pw.heroTitle} onChange={v => update('publicWebsite.heroTitle', v)} placeholder="Royal Cuts & Spa" />
            </Field>
            <Field label="Tagline / Subtitle" hint="Short description below your name">
              <Inp value={pw.heroSubtitle} onChange={v => update('publicWebsite.heroSubtitle', v)} placeholder="Premium beauty services since 2018" />
            </Field>
            <Field label="Hero Background Image URL" hint="Full URL to a banner image (1200×400px recommended)">
              <Inp value={pw.heroImage} onChange={v => update('publicWebsite.heroImage', v)} placeholder="https://example.com/banner.jpg" />
            </Field>
          </Section>

          <Section icon={Palette} title="Colors">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { key: 'primaryColor',   label: 'Primary Color',    default: '#B8860B' },
                { key: 'secondaryColor', label: 'Dark Color',       default: '#1A1208' },
                { key: 'bgColor',        label: 'Background Color', default: '#FDFAF5' },
              ].map(({ key, label, default: def }) => (
                <Field key={key} label={label}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={pw[key] || def}
                      onChange={e => update(`publicWebsite.${key}`, e.target.value)}
                      style={{ width: 40, height: 36, borderRadius: 8, border: `1.5px solid ${C.border}`, cursor: 'pointer', padding: 2 }}
                    />
                    <Inp value={pw[key] || def} onChange={v => update(`publicWebsite.${key}`, v)} placeholder={def} style={{ flex: 1 }} />
                  </div>
                </Field>
              ))}
            </div>
          </Section>

          <Section icon={Info} title="About Section">
            <Toggle value={pw.aboutEnabled} onChange={v => update('publicWebsite.aboutEnabled', v)} label="Show About section on your page" />
            {pw.aboutEnabled && (
              <>
                <Field label="Section Title">
                  <Inp value={pw.aboutTitle} onChange={v => update('publicWebsite.aboutTitle', v)} placeholder="About Us" />
                </Field>
                <Field label="About Text">
                  <textarea
                    value={pw.aboutText || ''}
                    onChange={e => update('publicWebsite.aboutText', e.target.value)}
                    placeholder="Tell your story — when you started, your specialty, your team..."
                    rows={4}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: '#FDFAF9', fontSize: 13, color: C.ink, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                    onFocus={e => e.target.style.borderColor = C.gold}
                    onBlur={e => e.target.style.borderColor = C.border}
                  />
                </Field>
                <Field label="About Image URL">
                  <Inp value={pw.aboutImage} onChange={v => update('publicWebsite.aboutImage', v)} placeholder="https://example.com/team.jpg" />
                </Field>
              </>
            )}
          </Section>

          <Section icon={Image} title="Gallery">
            <Toggle value={pw.galleryEnabled} onChange={v => update('publicWebsite.galleryEnabled', v)} label="Show photo gallery on your page" />
            {pw.galleryEnabled && (
              <Field label="Gallery Image URLs" hint="Add one URL per line">
                <textarea
                  value={(pw.gallery || []).map(g => g.url).join('\n')}
                  onChange={e => {
                    const urls = e.target.value.split('\n').filter(u => u.trim());
                    update('publicWebsite.gallery', urls.map(url => ({ url: url.trim(), caption: '' })));
                  }}
                  placeholder={"https://example.com/photo1.jpg\nhttps://example.com/photo2.jpg"}
                  rows={5}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: '#FDFAF9', fontSize: 13, color: C.ink, outline: 'none', resize: 'vertical', fontFamily: 'monospace' }}
                />
              </Field>
            )}
          </Section>

          <Section icon={Globe} title="Social & Contact">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Instagram URL">
                <Inp value={pw.instagram} onChange={v => update('publicWebsite.instagram', v)} placeholder="https://instagram.com/royalcuts" />
              </Field>
              <Field label="Facebook URL">
                <Inp value={pw.facebook} onChange={v => update('publicWebsite.facebook', v)} placeholder="https://facebook.com/royalcuts" />
              </Field>
            </div>
            <Field label="Google Maps Embed URL" hint="Google Maps → Share → Embed a map → copy the src URL">
              <Inp value={pw.mapEmbedUrl} onChange={v => update('publicWebsite.mapEmbedUrl', v)} placeholder="https://www.google.com/maps/embed?pb=..." />
            </Field>
          </Section>

          <Section icon={Globe} title="SEO">
            <Field label="Page Title" hint="Shown in browser tab and Google results">
              <Inp value={pw.metaTitle} onChange={v => update('publicWebsite.metaTitle', v)} placeholder="Royal Cuts — Book Online" />
            </Field>
            <Field label="Meta Description" hint="Shown in Google search results (150 chars max)">
              <Inp value={pw.metaDescription} onChange={v => update('publicWebsite.metaDescription', v)} placeholder="Book appointments at Royal Cuts. Premium hair & beauty services." />
            </Field>
          </Section>
        </>
      )}

      {/* ═══ TAB: EMBED ON EXISTING SITE ════════════════════════════════════ */}
      {activeTab === 'embed' && (
        <>
          <div style={{ background: C.bluePale, border: `1px solid #93c5fd`, borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.blue, marginBottom: 6 }}>
              🔗 Already have a website? Add booking in 3 ways:
            </div>
            <div style={{ fontSize: 12, color: C.blue }}>
              Option 1: Floating button widget (recommended) — One script tag, no code changes needed<br/>
              Option 2: Embed iframe — Add booking flow directly inside your page<br/>
              Option 3: Simple link button — Just a styled link to your booking page
            </div>
          </div>

          <Section icon={Globe} title="Your Website URL">
            <Field label="Your existing website URL" hint="Optional — for your reference only">
              <Inp value={pw.externalWebsite} onChange={v => update('publicWebsite.externalWebsite', v)} placeholder="https://royalcuts.in" />
            </Field>
          </Section>

          <Section icon={Palette} title="Widget Button Customization">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Button Text">
                <Inp value={pw.embedWidgetText} onChange={v => update('publicWebsite.embedWidgetText', v)} placeholder="Book Appointment" />
              </Field>
              <Field label="Button Color">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" value={pw.embedWidgetColor || '#B8860B'} onChange={e => update('publicWebsite.embedWidgetColor', e.target.value)} style={{ width: 40, height: 36, borderRadius: 8, border: `1.5px solid ${C.border}`, cursor: 'pointer', padding: 2 }} />
                  <Inp value={pw.embedWidgetColor || '#B8860B'} onChange={v => update('publicWebsite.embedWidgetColor', v)} placeholder="#B8860B" />
                </div>
              </Field>
            </div>
            <Field label="Button Position">
              <div style={{ display: 'flex', gap: 8 }}>
                {[['bottom-right', 'Bottom Right'], ['bottom-left', 'Bottom Left']].map(([val, label]) => (
                  <button key={val} onClick={() => update('publicWebsite.embedWidgetPosition', val)} style={{
                    flex: 1, padding: '8px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    background: (pw.embedWidgetPosition || 'bottom-right') === val ? C.goldPale : '#F5F0E8',
                    border: `1.5px solid ${(pw.embedWidgetPosition || 'bottom-right') === val ? C.gold : C.border}`,
                    color: (pw.embedWidgetPosition || 'bottom-right') === val ? C.gold : C.inkMid,
                  }}>{label}</button>
                ))}
              </div>
            </Field>
          </Section>

          <Section icon={Code2} title="Option 1 — Floating Widget (Recommended)">
            <p style={{ fontSize: 13, color: C.inkMid, margin: '0 0 12px' }}>
              Paste this single line before the <code>&lt;/body&gt;</code> tag of your website. A floating "Book Appointment" button will appear automatically.
            </p>
            <CodeBox code={widgetScript} label="Add before </body>" />
            <div style={{ marginTop: 12, padding: '10px 14px', background: C.goldPale, borderRadius: 10, fontSize: 12, color: C.inkMid }}>
              💡 Works on Wix, WordPress, Webflow, Squarespace, and any HTML site. No coding required.
            </div>
          </Section>

          <Section icon={Code2} title="Option 2 — Embed Booking Form">
            <p style={{ fontSize: 13, color: C.inkMid, margin: '0 0 12px' }}>
              Embed the full booking flow directly inside a page on your website.
            </p>
            <CodeBox code={iframeCode} label="Paste where you want the booking form" />
          </Section>

          <Section icon={Link2} title="Option 3 — Simple Book Now Button">
            <p style={{ fontSize: 13, color: C.inkMid, margin: '0 0 12px' }}>
              Add a styled button anywhere on your site that opens your booking page.
            </p>
            <CodeBox code={buttonCode} label="HTML button code" />
          </Section>
        </>
      )}

      {/* ═══ TAB: CUSTOM DOMAIN ═════════════════════════════════════════════ */}
      {activeTab === 'domain' && (
        <>
          <div style={{ background: C.goldPale, border: `1px solid ${C.gold}40`, borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, marginBottom: 4 }}>
              🌍 Point your domain to your booking page
            </div>
            <div style={{ fontSize: 12, color: C.inkMid }}>
              Instead of <code>yourplatform.com/book/royal-cuts</code>, customers go to <code>book.royalcuts.in</code>
            </div>
          </div>

          <Section icon={Link2} title="Your Custom Domain">
            <Field label="Custom Domain / Subdomain" hint="e.g. book.royalcuts.in or appointments.royalcuts.com">
              <Inp value={pw.customDomain} onChange={v => update('publicWebsite.customDomain', v)} placeholder="book.royalcuts.in" />
            </Field>
          </Section>

          <Section icon={Globe} title="DNS Setup Instructions">
            <p style={{ fontSize: 13, color: C.inkMid, margin: '0 0 16px' }}>
              Go to your domain registrar (GoDaddy, Namecheap, Cloudflare etc.) and add this DNS record:
            </p>
            <div style={{ background: '#1A1208', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 80px 1fr', gap: '8px 16px', fontSize: 13 }}>
                <div style={{ color: C.gold, fontWeight: 700 }}>Type</div>
                <div style={{ color: C.gold, fontWeight: 700 }}>Name</div>
                <div style={{ color: C.gold, fontWeight: 700 }}>Value</div>
                <div style={{ color: '#FAF6EF', fontFamily: 'monospace' }}>CNAME</div>
                <div style={{ color: '#FAF6EF', fontFamily: 'monospace' }}>{pw.customDomain?.split('.')[0] || 'book'}</div>
                <div style={{ color: '#FAF6EF', fontFamily: 'monospace' }}>{PLATFORM_URL.replace('https://', '').replace('http://', '')}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: C.inkMid }}>
              <div style={{ display: 'flex', gap: 8 }}><span style={{ color: C.gold, fontWeight: 700 }}>1.</span> Add the CNAME record above in your DNS settings</div>
              <div style={{ display: 'flex', gap: 8 }}><span style={{ color: C.gold, fontWeight: 700 }}>2.</span> Save your custom domain above and click Save</div>
              <div style={{ display: 'flex', gap: 8 }}><span style={{ color: C.gold, fontWeight: 700 }}>3.</span> DNS changes take 5 minutes to 48 hours to propagate</div>
              <div style={{ display: 'flex', gap: 8 }}><span style={{ color: C.gold, fontWeight: 700 }}>4.</span> Contact support after setup for SSL certificate activation</div>
            </div>
          </Section>
        </>
      )}

      {/* Save Button */}
      <div style={{ position: 'sticky', bottom: 20, display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button onClick={handleSave} disabled={saving} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: saved ? C.green : C.gold, color: saved ? '#fff' : '#1A1208',
          border: 'none', borderRadius: 50, padding: '13px 28px',
          fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          opacity: saving ? 0.7 : 1,
        }}>
          {saving ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }}/> Saving…</>
           : saved  ? <><CheckCircle2 size={16}/> Saved!</>
           : <><Save size={16}/> Save Changes</>}
        </button>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}