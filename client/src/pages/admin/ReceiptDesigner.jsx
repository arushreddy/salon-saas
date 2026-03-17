// src/pages/admin/ReceiptDesigner.jsx
// Drag-and-drop receipt format designer with live preview
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, Save, RefreshCw, Printer, Check, Palette,
  Type, Layout, ToggleLeft, ToggleRight, ChevronDown,
  Sparkles, Phone, MapPin, Mail, Globe, Hash,
  Star, Tag, Scissors, FileText, Loader2,
} from 'lucide-react';
import api from '@/services/api';
import { loadSalonSettings, getSalonSettings } from '@/utils/salonSettings';

const C = {
  pageBg: '#F4EDE0', cardBg: '#FDFAF4',
  heroBg: '#0E0B06', heroBg2: '#1C1608',
  gold: '#B8860B', goldLight: '#DAA520', goldPale: '#FFF8E7',
  ink: '#1A1208', inkMid: '#5C4A2A', inkLight: '#9C8660',
  border: '#DFD0A8', green: '#15803D', greenPale: '#DCFCE7',
  red: '#991B1B', redPale: '#FEF2F2',
};

// ── Preset Themes ─────────────────────────────────────────────────────────────
const THEMES = [
  {
    id: 'classic-gold',
    name: 'Classic Gold',
    primary: '#B8860B', headerBg: '#0E0B06',
    headerText: '#FAF3E0', bodyBg: '#FFFFFF',
    accentBg: '#FFF8E7', footerBg: '#FFF8E7',
    textColor: '#1A1208', mutedColor: '#9C8660',
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    primary: '#7C3AED', headerBg: '#1E1B4B',
    headerText: '#EDE9FE', bodyBg: '#FFFFFF',
    accentBg: '#F5F3FF', footerBg: '#F5F3FF',
    textColor: '#1E1B4B', mutedColor: '#6D28D9',
  },
  {
    id: 'rose-blush',
    name: 'Rose Blush',
    primary: '#BE185D', headerBg: '#500724',
    headerText: '#FCE7F3', bodyBg: '#FFFFFF',
    accentBg: '#FDF2F8', footerBg: '#FDF2F8',
    textColor: '#1F2937', mutedColor: '#BE185D',
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    primary: '#15803D', headerBg: '#052E16',
    headerText: '#DCFCE7', bodyBg: '#FFFFFF',
    accentBg: '#F0FDF4', footerBg: '#F0FDF4',
    textColor: '#1A2E1A', mutedColor: '#15803D',
  },
  {
    id: 'slate-modern',
    name: 'Slate Modern',
    primary: '#0F172A', headerBg: '#0F172A',
    headerText: '#F8FAFC', bodyBg: '#FFFFFF',
    accentBg: '#F8FAFC', footerBg: '#F1F5F9',
    textColor: '#0F172A', mutedColor: '#64748B',
  },
  {
    id: 'custom',
    name: 'Custom',
    primary: '#B8860B', headerBg: '#0E0B06',
    headerText: '#FAF3E0', bodyBg: '#FFFFFF',
    accentBg: '#FFF8E7', footerBg: '#FFF8E7',
    textColor: '#1A1208', mutedColor: '#9C8660',
  },
];

// ── Layout Presets ────────────────────────────────────────────────────────────
const LAYOUTS = [
  { id: 'thermal', name: 'Thermal (80mm)', desc: 'Compact POS printer format', width: 300 },
  { id: 'a5',      name: 'A5 Detailed',   desc: 'Half-page detailed receipt',  width: 420 },
  { id: 'a4',      name: 'A4 Full',       desc: 'Full page invoice format',    width: 560 },
];

// ── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({ value, onChange, label, desc }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: C.inkLight, marginTop: 2 }}>{desc}</div>}
      </div>
      <button onClick={() => onChange(!value)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        {value
          ? <ToggleRight size={28} color={C.gold} />
          : <ToggleLeft size={28} color={C.inkLight} />}
      </button>
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: C.goldPale, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={13} color={C.gold} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.inkLight }}>{title}</span>
    </div>
  );
}

// ── Live Receipt Preview ──────────────────────────────────────────────────────
function ReceiptPreview({ design, salon }) {
  const theme = THEMES.find(t => t.id === design.themeId) || THEMES[0];
  const layout = LAYOUTS.find(l => l.id === design.layout) || LAYOUTS[0];

  const primary = design.themeId === 'custom' ? design.customPrimary : theme.primary;
  const headerBg = design.themeId === 'custom' ? design.customHeaderBg : theme.headerBg;
  const headerText = design.themeId === 'custom' ? design.customHeaderText : theme.headerText;
  const accentBg = design.themeId === 'custom' ? design.customAccentBg : theme.accentBg;
  const footerBg = theme.footerBg;
  const textColor = theme.textColor;
  const mutedColor = theme.mutedColor;

  const scale = Math.min(1, 320 / layout.width);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
      <div style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top center',
        width: layout.width,
        marginBottom: `${-(layout.width * (1 - scale))}px`,
        fontFamily: design.fontFamily || "'DM Sans', sans-serif",
      }}>
        {/* Receipt Card */}
        <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}>

          {/* Header */}
          <div style={{ background: headerBg, padding: '24px 20px 18px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 0, transparent 50%)', backgroundSize: '16px 16px' }} />
            {design.showLogo && (
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${primary}30`, border: `2px solid ${primary}50`, margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, fontSize: 20, fontFamily: 'Georgia, serif', color: primary }}>
                {(salon?.salonName || 'G').charAt(0)}
              </div>
            )}
            <div style={{ fontFamily: design.displayFont || 'Georgia, serif', fontSize: design.layout === 'thermal' ? 20 : 24, fontWeight: 700, color: headerText, position: 'relative', zIndex: 1 }}>
              ✂ {salon?.salonName || 'Glamour'}<span style={{ color: primary }}>.</span>
            </div>
            {design.showTagline && salon?.tagline && (
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 4, position: 'relative', zIndex: 1 }}>
                {salon.tagline}
              </div>
            )}
            {design.showAddress && salon?.address?.city && (
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 4, position: 'relative', zIndex: 1 }}>
                {[salon.address.street, salon.address.city, salon.address.state].filter(Boolean).join(', ')}
              </div>
            )}
            {design.showPhone && salon?.phone && (
              <div style={{ marginTop: 6, position: 'relative', zIndex: 1 }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '2px 10px' }}>
                  📞 {salon.phone}
                </span>
              </div>
            )}
            {design.headerNote && (
              <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', position: 'relative', zIndex: 1 }}>
                {design.headerNote}
              </div>
            )}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, background: `${primary}20`, border: `1px solid ${primary}40`, borderRadius: 20, padding: '4px 12px', fontSize: 10, fontWeight: 700, color: primary, position: 'relative', zIndex: 1 }}>
              🧾 GLM-250310-A3F7
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '16px 18px', background: '#fff' }}>

            {/* Customer info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
              {[['Customer', 'Priya Sharma'], ['Phone', '+91 98765 43210'], ['Date', '17 Mar 2026'], ['Time', '11:00 AM']].map(([l, v]) => (
                <div key={l} style={{ background: accentBg, borderRadius: 8, padding: '7px 10px', border: `1px solid ${primary}15` }}>
                  <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: mutedColor }}>{l}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: textColor, marginTop: 1 }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Services */}
            <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${primary}20`, marginBottom: 10 }}>
              <div style={{ background: accentBg, padding: '7px 12px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: mutedColor }}>
                Services
              </div>
              {[['Hair Cut & Style', '₹800'], ['Deep Conditioning', '₹500']].map(([name, price], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderTop: `1px dashed ${primary}15`, fontSize: 11 }}>
                  <span style={{ color: textColor, fontWeight: 500 }}>{name}</span>
                  <span style={{ color: primary, fontWeight: 700 }}>{price}</span>
                </div>
              ))}
              {design.showDiscount && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', borderTop: `1px dashed ${primary}15`, fontSize: 11, color: '#15803D', fontWeight: 700 }}>
                  <span>✂ Staff Discount</span><span>−₹130</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: accentBg, borderTop: `2px solid ${primary}`, fontSize: 14, fontWeight: 800, color: primary }}>
                <span>Total Paid</span><span>₹1,170</span>
              </div>
            </div>

            {/* Payment */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: design.showLoyalty ? 10 : 0 }}>
              <span style={{ padding: '3px 12px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC' }}>💵 Cash</span>
              {design.showGST && (
                <span style={{ padding: '3px 12px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: accentBg, color: mutedColor, border: `1px solid ${primary}20` }}>GST: 29ABCDE1234F1Z5</span>
              )}
            </div>

            {/* Loyalty */}
            {design.showLoyalty && (
              <div style={{ background: headerBg, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <span style={{ fontSize: 18 }}>⭐</span>
                <div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>LOYALTY POINTS EARNED</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: primary }}>+117 pts</div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ background: footerBg, borderTop: `1px solid ${primary}20`, padding: '14px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: mutedColor, lineHeight: 1.8 }}>
              {design.footerText || 'Thank you for visiting! 💛'}
            </div>
            {design.showContact && (
              <div style={{ fontSize: 10, color: mutedColor, marginTop: 4, opacity: 0.7 }}>
                {[salon?.email, salon?.website].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function ReceiptDesigner() {
  const [salon, setSalon] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('theme');

  const [design, setDesign] = useState({
    themeId:          'classic-gold',
    layout:           'a5',
    displayFont:      'Georgia, serif',
    fontFamily:       "'DM Sans', sans-serif",
    // Toggles
    showLogo:         true,
    showTagline:      true,
    showAddress:      true,
    showPhone:        true,
    showContact:      true,
    showGST:          true,
    showDiscount:     true,
    showLoyalty:      true,
    showQR:           false,
    // Text
    headerNote:       '',
    footerText:       'Thank you for visiting! 💛',
    // Custom theme colors
    customPrimary:    '#B8860B',
    customHeaderBg:   '#0E0B06',
    customHeaderText: '#FAF3E0',
    customAccentBg:   '#FFF8E7',
  });

  useEffect(() => {
    const load = async () => {
      await loadSalonSettings();
      const s = getSalonSettings();
      setSalon(s);
      // Load saved receipt design if exists
      if (s.receiptDesign) {
        setDesign(prev => ({ ...prev, ...s.receiptDesign }));
      }
      if (s.receiptFooter) {
        setDesign(prev => ({ ...prev, footerText: s.receiptFooter }));
      }
    };
    load();
  }, []);

  const update = useCallback((key, value) => {
    setDesign(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/settings', {
        receiptFooter: design.footerText,
        receiptDesign: design,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintTest = () => {
    const s = salon || {};
    // Build test invoice
    const testInv = {
      invoiceRef: 'GLM-250310-TEST',
      customerName: 'Priya Sharma',
      customerPhone: '9876543210',
      services: [
        { name: 'Hair Cut & Style', price: 800 },
        { name: 'Deep Conditioning', price: 500 },
      ],
      stylist: 'Rahul Kumar',
      date: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      timeSlot: { start: '11:00' },
      totalAmount: 1300,
      manualDiscount: 130,
      finalAmount: 1170,
      paymentMethod: 'cash',
      loyaltyPoints: 117,
    };

    // Import and call printInvoice with design
    import('@/utils/salonSettings').then(({ printInvoiceWithDesign }) => {
      if (printInvoiceWithDesign) {
        printInvoiceWithDesign(testInv, design);
      } else {
        import('@/utils/salonSettings').then(({ printInvoice }) => printInvoice(testInv));
      }
    });
  };

  const TABS = [
    { id: 'theme',   label: 'Theme',   icon: Palette },
    { id: 'layout',  label: 'Layout',  icon: Layout },
    { id: 'content', label: 'Content', icon: Type },
    { id: 'text',    label: 'Text',    icon: FileText },
  ];

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, marginBottom: 20, background: `linear-gradient(145deg, ${C.heroBg}, ${C.heroBg2})`, border: '1px solid #2E2410', boxShadow: '0 12px 48px rgba(0,0,0,0.4)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg,#B8860B 0,#B8860B 1px,transparent 0,transparent 50%)', backgroundSize: '20px 20px', opacity: 0.05 }} />
        <div style={{ position: 'relative', padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <Sparkles size={10} color='#F0D878' />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#F0D878' }}>Receipt Designer</span>
            </div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>
              Design Your Receipt
            </h1>
            <p style={{ fontSize: 13, color: '#5A4020', margin: '6px 0 0' }}>
              Customize how your receipts look when printed or sent via WhatsApp
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handlePrintTest}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.13)', background: 'rgba(255,255,255,0.07)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              <Printer size={14} /> Test Print
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, border: 'none', background: saved ? '#15803D' : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.3s' }}>
              {saving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : saved ? <Check size={14} /> : <Save size={14} />}
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Design'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout: Controls + Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,380px)', gap: 20, alignItems: 'start' }}>

        {/* ── Left: Controls ── */}
        <div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 16, padding: 6, marginBottom: 16 }}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: active ? 700 : 500, background: active ? `linear-gradient(135deg, ${C.gold}, ${C.goldLight})` : 'transparent', color: active ? '#fff' : C.inkLight, transition: 'all 0.18s' }}>
                  <Icon size={13} />
                  <span className="tab-label">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 20, padding: 22 }}>

            {/* ── THEME TAB ── */}
            {activeTab === 'theme' && (
              <div>
                <SectionHeader icon={Palette} title="Color Theme" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                  {THEMES.map(theme => (
                    <button key={theme.id} onClick={() => update('themeId', theme.id)}
                      style={{ padding: '12px 8px', borderRadius: 14, border: `2px solid ${design.themeId === theme.id ? C.gold : C.border}`, background: design.themeId === theme.id ? C.goldPale : C.pageBg || '#F9F4EC', cursor: 'pointer', transition: 'all 0.18s', position: 'relative' }}>
                      {/* Color swatch */}
                      <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginBottom: 8 }}>
                        <div style={{ width: 18, height: 18, borderRadius: 6, background: theme.headerBg }} />
                        <div style={{ width: 18, height: 18, borderRadius: 6, background: theme.primary }} />
                        <div style={{ width: 18, height: 18, borderRadius: 6, background: theme.accentBg, border: '1px solid #ddd' }} />
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.ink, textAlign: 'center' }}>{theme.name}</div>
                      {design.themeId === theme.id && (
                        <div style={{ position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: '50%', background: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={9} color='#fff' />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Custom colors */}
                {design.themeId === 'custom' && (
                  <div>
                    <SectionHeader icon={Palette} title="Custom Colors" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {[
                        ['customPrimary',    'Accent / Gold Color'],
                        ['customHeaderBg',   'Header Background'],
                        ['customHeaderText', 'Header Text Color'],
                        ['customAccentBg',   'Accent Background'],
                      ].map(([key, label]) => (
                        <div key={key}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: C.inkLight, marginBottom: 6 }}>{label}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: '#F9F4EC' }}>
                            <input type="color" value={design[key]} onChange={e => update(key, e.target.value)}
                              style={{ width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer', padding: 0, borderRadius: 6 }} />
                            <span style={{ fontSize: 12, fontFamily: 'monospace', color: C.ink }}>{design[key]}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Font */}
                <div style={{ marginTop: 20 }}>
                  <SectionHeader icon={Type} title="Fonts" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.inkLight, marginBottom: 6 }}>Display Font (Salon Name)</div>
                      <select value={design.displayFont} onChange={e => update('displayFont', e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: '#F9F4EC', fontSize: 13, color: C.ink, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <option value="Georgia, serif">Georgia (Classic)</option>
                        <option value="'Playfair Display', serif">Playfair Display</option>
                        <option value="'Cormorant Garamond', serif">Cormorant Garamond</option>
                        <option value="'Times New Roman', serif">Times New Roman</option>
                        <option value="Arial, sans-serif">Arial (Modern)</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.inkLight, marginBottom: 6 }}>Body Font</div>
                      <select value={design.fontFamily} onChange={e => update('fontFamily', e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: '#F9F4EC', fontSize: 13, color: C.ink, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <option value="'DM Sans', sans-serif">DM Sans</option>
                        <option value="'Nunito', sans-serif">Nunito</option>
                        <option value="Arial, sans-serif">Arial</option>
                        <option value="'Helvetica Neue', sans-serif">Helvetica</option>
                        <option value="Georgia, serif">Georgia</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── LAYOUT TAB ── */}
            {activeTab === 'layout' && (
              <div>
                <SectionHeader icon={Layout} title="Paper / Layout Size" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {LAYOUTS.map(layout => (
                    <button key={layout.id} onClick={() => update('layout', layout.id)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 14, border: `2px solid ${design.layout === layout.id ? C.gold : C.border}`, background: design.layout === layout.id ? C.goldPale : '#F9F4EC', cursor: 'pointer', transition: 'all 0.18s', textAlign: 'left' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{layout.name}</div>
                        <div style={{ fontSize: 11, color: C.inkLight, marginTop: 2 }}>{layout.desc}</div>
                      </div>
                      {design.layout === layout.id && <Check size={16} color={C.gold} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── CONTENT TAB ── */}
            {activeTab === 'content' && (
              <div>
                <SectionHeader icon={Type} title="Show / Hide Sections" />
                <Toggle value={design.showLogo}     onChange={v => update('showLogo', v)}     label="Salon Logo / Initial"    desc="Show salon initial badge in header" />
                <Toggle value={design.showTagline}  onChange={v => update('showTagline', v)}  label="Tagline"                 desc="Show salon tagline below name" />
                <Toggle value={design.showAddress}  onChange={v => update('showAddress', v)}  label="Address"                 desc="Show salon address in header" />
                <Toggle value={design.showPhone}    onChange={v => update('showPhone', v)}    label="Phone Number"            desc="Show phone in header" />
                <Toggle value={design.showContact}  onChange={v => update('showContact', v)}  label="Email & Website"         desc="Show in footer" />
                <Toggle value={design.showGST}      onChange={v => update('showGST', v)}      label="GST Number"              desc="Show GST number on receipt" />
                <Toggle value={design.showDiscount} onChange={v => update('showDiscount', v)} label="Discount Breakdown"      desc="Show discount as separate line" />
                <Toggle value={design.showLoyalty}  onChange={v => update('showLoyalty', v)}  label="Loyalty Points"          desc="Show loyalty points earned" />
              </div>
            )}

            {/* ── TEXT TAB ── */}
            {activeTab === 'text' && (
              <div>
                <SectionHeader icon={FileText} title="Custom Text" />
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.inkLight, marginBottom: 6 }}>Header Note (below salon name)</label>
                  <textarea value={design.headerNote} onChange={e => update('headerNote', e.target.value)}
                    placeholder="e.g. Valid only with stamp · No cash refunds"
                    rows={2}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: '#F9F4EC', fontSize: 13, color: C.ink, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = C.gold}
                    onBlur={e => e.target.style.borderColor = C.border}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.inkLight, marginBottom: 6 }}>Footer Message</label>
                  <textarea value={design.footerText} onChange={e => update('footerText', e.target.value)}
                    placeholder="Thank you for visiting! 💛"
                    rows={3}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: '#F9F4EC', fontSize: 13, color: C.ink, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = C.gold}
                    onBlur={e => e.target.style.borderColor = C.border}
                  />
                  <div style={{ fontSize: 11, color: C.inkLight, marginTop: 6 }}>
                    Tip: Use emojis! 💛✂👑
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Live Preview ── */}
        <div style={{ position: 'sticky', top: 80 }}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Eye size={14} color={C.gold} />
              <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Live Preview</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: C.inkLight }}>
                {LAYOUTS.find(l => l.id === design.layout)?.name}
              </span>
            </div>
            <div style={{ background: '#E8DCC4', minHeight: 500, overflowY: 'auto', padding: '16px 12px' }}>
              <ReceiptPreview design={design} salon={salon} />
            </div>
          </div>

          {/* Quick tips */}
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.inkLight, marginBottom: 10 }}>Quick Tips</div>
            {[
              ['🖨', 'Thermal (80mm) works best for POS printers'],
              ['📱', 'A5 is ideal for WhatsApp sharing'],
              ['🎨', 'Match your salon brand colors for professionalism'],
              ['💛', 'A warm footer message builds customer loyalty'],
            ].map(([emoji, tip]) => (
              <div key={tip} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 11, color: C.inkMid }}>
                <span>{emoji}</span><span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 768px) {
          .tab-label { display: none; }
        }
        @media (max-width: 1024px) {
          .receipt-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

