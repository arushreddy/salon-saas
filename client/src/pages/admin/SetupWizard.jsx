import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, Store, Clock, Palette, Sparkles } from 'lucide-react';
import api from '@/services/api';
import { useNavigate } from 'react-router-dom';

const steps = ['Salon Info', 'Operating Hours', 'Theme'];

const SetupWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    salonName: '', tagline: '', phone: '', email: '',
    address: { street: '', city: '', state: '', pincode: '' },
    operatingHours: { openTime: '09:00', closeTime: '21:00', slotInterval: 30 },
    theme: { primaryColor: '#C9A96E', accentColor: '#2C2C2C', backgroundColor: '#FAF7F2' },
  });

  const updateField = (path, value) => {
    setForm((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = updated;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const handleComplete = async () => {
    try {
      setSaving(true);
      await api.put('/settings', form);
      navigate('/admin');
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-charcoal/10 bg-white text-charcoal text-sm focus:outline-none focus:border-gold/40 focus:ring-2 focus:ring-gold/10';

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Sparkles size={32} className="text-gold mx-auto mb-3" />
          <h1 className="font-display text-2xl font-bold text-charcoal">Welcome! Let's set up your salon</h1>
          <p className="text-charcoal-muted text-sm mt-1">This takes less than 2 minutes</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i <= step ? 'bg-gold text-white' : 'bg-charcoal/5 text-charcoal-muted'}`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:block">{s}</span>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-gold' : 'bg-charcoal/5'}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-2xl border border-gold/10 p-6 space-y-4">
              <input type="text" placeholder="Salon Name" value={form.salonName} onChange={(e) => updateField('salonName', e.target.value)} className={inputClass} />
              <input type="text" placeholder="Tagline (e.g. Premium Salon Experience)" value={form.tagline} onChange={(e) => updateField('tagline', e.target.value)} className={inputClass} />
              <div className="grid grid-cols-2 gap-4">
                <input type="tel" placeholder="Phone" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className={inputClass} />
                <input type="email" placeholder="Email" value={form.email} onChange={(e) => updateField('email', e.target.value)} className={inputClass} />
              </div>
              <input type="text" placeholder="Street Address" value={form.address.street} onChange={(e) => updateField('address.street', e.target.value)} className={inputClass} />
              <div className="grid grid-cols-3 gap-4">
                <input type="text" placeholder="City" value={form.address.city} onChange={(e) => updateField('address.city', e.target.value)} className={inputClass} />
                <input type="text" placeholder="State" value={form.address.state} onChange={(e) => updateField('address.state', e.target.value)} className={inputClass} />
                <input type="text" placeholder="Pincode" value={form.address.pincode} onChange={(e) => updateField('address.pincode', e.target.value)} className={inputClass} />
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-2xl border border-gold/10 p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Opening Time</label><input type="time" value={form.operatingHours.openTime} onChange={(e) => updateField('operatingHours.openTime', e.target.value)} className={inputClass} /></div>
                <div><label className="block text-sm font-medium mb-1">Closing Time</label><input type="time" value={form.operatingHours.closeTime} onChange={(e) => updateField('operatingHours.closeTime', e.target.value)} className={inputClass} /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Appointment Slot Duration</label>
                <select value={form.operatingHours.slotInterval} onChange={(e) => updateField('operatingHours.slotInterval', parseInt(e.target.value))} className={inputClass}>
                  <option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option>
                </select>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-2xl border border-gold/10 p-6 space-y-4">
              <p className="text-sm font-medium">Choose your brand colors</p>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-xs mb-2">Primary</label><input type="color" value={form.theme.primaryColor} onChange={(e) => updateField('theme.primaryColor', e.target.value)} className="w-full h-12 rounded-xl cursor-pointer" /></div>
                <div><label className="block text-xs mb-2">Accent</label><input type="color" value={form.theme.accentColor} onChange={(e) => updateField('theme.accentColor', e.target.value)} className="w-full h-12 rounded-xl cursor-pointer" /></div>
                <div><label className="block text-xs mb-2">Background</label><input type="color" value={form.theme.backgroundColor} onChange={(e) => updateField('theme.backgroundColor', e.target.value)} className="w-full h-12 rounded-xl cursor-pointer" /></div>
              </div>
              <div className="rounded-xl p-4 border" style={{ backgroundColor: form.theme.backgroundColor }}>
                <p className="font-display font-bold" style={{ color: form.theme.accentColor }}>{form.salonName || 'Your Salon'}<span style={{ color: form.theme.primaryColor }}>.</span></p>
                <button className="mt-2 px-4 py-1.5 rounded-lg text-white text-xs" style={{ backgroundColor: form.theme.primaryColor }}>Preview Button</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between mt-6">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} className="flex items-center gap-2 px-4 py-2 text-sm text-charcoal-muted"><ArrowLeft size={16} /> Back</button>
          ) : <div />}
          {step < steps.length - 1 ? (
            <button onClick={() => setStep(step + 1)} className="flex items-center gap-2 luxury-gradient text-white px-6 py-2.5 rounded-xl text-sm font-medium shadow-gold">
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button onClick={handleComplete} disabled={saving} className="flex items-center gap-2 luxury-gradient text-white px-6 py-2.5 rounded-xl text-sm font-medium shadow-gold disabled:opacity-50">
              {saving ? 'Setting up...' : 'Complete Setup'} <Check size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;