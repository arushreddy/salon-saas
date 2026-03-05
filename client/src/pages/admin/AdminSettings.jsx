import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Loader2, Sparkles, Store, Clock, CreditCard, Palette, FileText } from 'lucide-react';
import api from '@/services/api';

const AdminSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/settings');
        setSettings(data.settings);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (path, value) => {
    setSettings((prev) => {
      const updated = { ...prev };
      const keys = path.split('.');
      let obj = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-charcoal/10 bg-cream/50 text-charcoal text-sm focus:outline-none focus:border-gold/40 focus:ring-2 focus:ring-gold/10 transition-all';

  const tabs = [
    { id: 'general', label: 'General', icon: Store },
    { id: 'hours', label: 'Hours', icon: Clock },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'tax', label: 'Tax & GST', icon: FileText },
    { id: 'theme', label: 'Theme', icon: Palette },
  ];

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-gold" />
            <span className="text-xs font-medium text-gold tracking-wide uppercase">Settings</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">Salon Settings</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-gold ${
            saved ? 'bg-emerald-500 text-white' : 'luxury-gradient text-white hover:opacity-90'
          } disabled:opacity-50`}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Save size={14} /> : <Save size={14} />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-gold text-white shadow-gold'
                  : 'bg-white/70 text-charcoal-muted hover:bg-gold/10 border border-charcoal/5'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-gold/10 p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Salon Name</label>
              <input type="text" value={settings.salonName} onChange={(e) => updateField('salonName', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Tagline</label>
              <input type="text" value={settings.tagline} onChange={(e) => updateField('tagline', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Phone</label>
              <input type="tel" value={settings.phone} onChange={(e) => updateField('phone', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Email</label>
              <input type="email" value={settings.email} onChange={(e) => updateField('email', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Street Address</label>
            <input type="text" value={settings.address?.street || ''} onChange={(e) => updateField('address.street', e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">City</label>
              <input type="text" value={settings.address?.city || ''} onChange={(e) => updateField('address.city', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">State</label>
              <input type="text" value={settings.address?.state || ''} onChange={(e) => updateField('address.state', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Pincode</label>
              <input type="text" value={settings.address?.pincode || ''} onChange={(e) => updateField('address.pincode', e.target.value)} className={inputClass} />
            </div>
          </div>
        </motion.div>
      )}

      {/* Hours Tab */}
      {activeTab === 'hours' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-gold/10 p-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Opening Time</label>
              <input type="time" value={settings.operatingHours?.openTime || '09:00'} onChange={(e) => updateField('operatingHours.openTime', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Closing Time</label>
              <input type="time" value={settings.operatingHours?.closeTime || '21:00'} onChange={(e) => updateField('operatingHours.closeTime', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Slot Interval (min)</label>
              <input type="number" value={settings.operatingHours?.slotInterval || 30} onChange={(e) => updateField('operatingHours.slotInterval', parseInt(e.target.value))} className={inputClass} />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-charcoal mb-3">Weekly Schedule</p>
            <div className="space-y-3">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                <div key={day} className="flex items-center gap-4 bg-cream/50 rounded-xl p-3">
                  <label className="flex items-center gap-2 w-24">
                    <input
                      type="checkbox"
                      checked={settings.weeklySchedule?.[day]?.isOpen !== false}
                      onChange={(e) => updateField(`weeklySchedule.${day}.isOpen`, e.target.checked)}
                      className="w-4 h-4 rounded border-charcoal/20 text-gold focus:ring-gold"
                    />
                    <span className="text-sm font-medium text-charcoal capitalize">{day.slice(0, 3)}</span>
                  </label>
                  <input type="time" value={settings.weeklySchedule?.[day]?.open || '09:00'} onChange={(e) => updateField(`weeklySchedule.${day}.open`, e.target.value)} className="px-3 py-1.5 rounded-lg border border-charcoal/10 bg-white text-sm" />
                  <span className="text-xs text-charcoal-muted">to</span>
                  <input type="time" value={settings.weeklySchedule?.[day]?.close || '21:00'} onChange={(e) => updateField(`weeklySchedule.${day}.close`, e.target.value)} className="px-3 py-1.5 rounded-lg border border-charcoal/10 bg-white text-sm" />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Payment Tab */}
      {activeTab === 'payment' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-gold/10 p-6 space-y-6">
          <div>
            <p className="text-sm font-semibold text-charcoal mb-3">In-Store Payment Methods</p>
            <div className="flex flex-wrap gap-4">
              {[
                { key: 'payAtSalonEnabled', label: 'Pay at Salon' },
                { key: 'acceptCash', label: 'Accept Cash' },
                { key: 'acceptUPI', label: 'Accept UPI' },
                { key: 'acceptCard', label: 'Accept Card' },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.payment?.[item.key] !== false}
                    onChange={(e) => updateField(`payment.${item.key}`, e.target.checked)}
                    className="w-4 h-4 rounded border-charcoal/20 text-gold focus:ring-gold"
                  />
                  <span className="text-sm text-charcoal">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-gold/10 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-charcoal">Razorpay Online Payments</p>
                <p className="text-xs text-charcoal-muted mt-0.5">Enable to accept online payments from customers</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.payment?.razorpayEnabled || false}
                  onChange={(e) => updateField('payment.razorpayEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-charcoal/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
              </label>
            </div>

            {settings.payment?.razorpayEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-cream/50 rounded-xl">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Razorpay Key ID</label>
                  <input
                    type="text"
                    value={settings.payment?.razorpayKeyId || ''}
                    onChange={(e) => updateField('payment.razorpayKeyId', e.target.value)}
                    placeholder="rzp_live_xxxxxxxxxxxxx"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Razorpay Key Secret</label>
                  <input
                    type="password"
                    value={settings.payment?.razorpayKeySecret || ''}
                    onChange={(e) => updateField('payment.razorpayKeySecret', e.target.value)}
                    placeholder="Enter secret key"
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-charcoal-muted">
                    Get your keys from <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noreferrer" className="text-gold underline">Razorpay Dashboard</a>. 
                    Payments will go directly to your bank account linked with Razorpay.
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Tax Tab */}
      {activeTab === 'tax' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-gold/10 p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">GST Number</label>
              <input type="text" value={settings.gstNumber || ''} onChange={(e) => updateField('gstNumber', e.target.value)} placeholder="22AAAAA0000A1Z5" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Tax Rate (%)</label>
              <input type="number" value={settings.taxRate || 18} onChange={(e) => updateField('taxRate', parseFloat(e.target.value))} min="0" max="28" className={inputClass} />
            </div>
          </div>
          <p className="text-xs text-charcoal-muted">GST will be automatically calculated on invoices using this rate.</p>
        </motion.div>
      )}
      {/* Theme Tab */}
{activeTab === 'theme' && (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-gold/10 p-6 space-y-6">
    <div>
      <p className="text-sm font-semibold text-charcoal mb-4">Brand Colors</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-charcoal mb-2">Primary Color</label>
          <div className="flex items-center gap-3">
            <input type="color" value={settings.theme?.primaryColor || '#C9A96E'} onChange={(e) => updateField('theme.primaryColor', e.target.value)}
              className="w-12 h-12 rounded-xl border border-charcoal/10 cursor-pointer" />
            <input type="text" value={settings.theme?.primaryColor || '#C9A96E'} onChange={(e) => updateField('theme.primaryColor', e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-2">Accent Color</label>
          <div className="flex items-center gap-3">
            <input type="color" value={settings.theme?.accentColor || '#2C2C2C'} onChange={(e) => updateField('theme.accentColor', e.target.value)}
              className="w-12 h-12 rounded-xl border border-charcoal/10 cursor-pointer" />
            <input type="text" value={settings.theme?.accentColor || '#2C2C2C'} onChange={(e) => updateField('theme.accentColor', e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-2">Background Color</label>
          <div className="flex items-center gap-3">
            <input type="color" value={settings.theme?.backgroundColor || '#FAF7F2'} onChange={(e) => updateField('theme.backgroundColor', e.target.value)}
              className="w-12 h-12 rounded-xl border border-charcoal/10 cursor-pointer" />
            <input type="text" value={settings.theme?.backgroundColor || '#FAF7F2'} onChange={(e) => updateField('theme.backgroundColor', e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>
    </div>
    <div>
      <p className="text-sm font-semibold text-charcoal mb-2">Preview</p>
      <div className="rounded-xl p-6 border" style={{ backgroundColor: settings.theme?.backgroundColor || '#FAF7F2' }}>
        <h3 className="font-display text-xl font-bold" style={{ color: settings.theme?.accentColor || '#2C2C2C' }}>
          {settings.salonName || 'Salon Name'}<span style={{ color: settings.theme?.primaryColor || '#C9A96E' }}>.</span>
        </h3>
        <p className="text-sm mt-2" style={{ color: settings.theme?.accentColor || '#2C2C2C', opacity: 0.6 }}>{settings.tagline || 'Your tagline here'}</p>
        <button className="mt-4 px-6 py-2 rounded-lg text-white text-sm font-medium" style={{ background: `linear-gradient(135deg, ${settings.theme?.primaryColor || '#C9A96E'}, ${settings.theme?.accentColor || '#2C2C2C'})` }}>
          Sample Button
        </button>
      </div>
    </div>
  </motion.div>
)}
    </div>
  );
};

export default AdminSettings;