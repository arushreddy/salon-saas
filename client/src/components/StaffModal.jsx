import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Save, UserPlus } from 'lucide-react';

const designations = [
  { value: 'trainee', label: 'Trainee' },
  { value: 'junior_stylist', label: 'Junior Stylist' },
  { value: 'senior_stylist', label: 'Senior Stylist' },
  { value: 'master_stylist', label: 'Master Stylist' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'manager', label: 'Manager' },
];

const specializations = [
  { value: 'hair', label: 'Hair' },
  { value: 'skin', label: 'Skin Care' },
  { value: 'nails', label: 'Nails' },
  { value: 'makeup', label: 'Makeup' },
  { value: 'spa', label: 'Spa & Wellness' },
  { value: 'bridal', label: 'Bridal' },
  { value: 'grooming', label: 'Grooming' },
  { value: 'combo', label: 'Combo' },
];

const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const defaultForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'staff',
  designation: 'junior_stylist',
  specializations: [],
  bio: '',
  salaryBase: '',
  commissionEnabled: false,
  commissionPercent: '',
  weeklyOff: ['sunday'],
  shiftStart: '09:00',
  shiftEnd: '21:00',
};

const StaffModal = ({ isOpen, onClose, onSubmit, staff, isLoading }) => {
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState('');

  useEffect(() => {
    if (staff) {
      setForm({
        name: staff.user?.name || '',
        email: staff.user?.email || '',
        phone: staff.user?.phone || '',
        password: '',
        role: staff.user?.role || 'staff',
        designation: staff.designation || 'junior_stylist',
        specializations: staff.specializations || [],
        bio: staff.bio || '',
        salaryBase: staff.salary?.base || '',
        commissionEnabled: staff.salary?.commissionEnabled || false,
        commissionPercent: staff.salary?.commissionPercent || '',
        weeklyOff: staff.schedule?.weeklyOff || ['sunday'],
        shiftStart: staff.schedule?.shiftStart || '09:00',
        shiftEnd: staff.schedule?.shiftEnd || '21:00',
      });
    } else {
      setForm(defaultForm);
    }
    setError('');
  }, [staff, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox' && name === 'commissionEnabled') {
      setForm({ ...form, commissionEnabled: checked });
    } else {
      setForm({ ...form, [name]: value });
    }
    setError('');
  };

  const toggleSpecialization = (spec) => {
    setForm((prev) => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter((s) => s !== spec)
        : [...prev.specializations, spec],
    }));
  };

  const toggleWeeklyOff = (day) => {
    setForm((prev) => ({
      ...prev,
      weeklyOff: prev.weeklyOff.includes(day)
        ? prev.weeklyOff.filter((d) => d !== day)
        : [...prev.weeklyOff, day],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      setError('Name and email are required');
      return;
    }
    if (!staff && !form.password) {
      setError('Password is required for new staff');
      return;
    }

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      role: form.role,
      designation: form.designation,
      specializations: form.specializations,
      bio: form.bio,
      salary: {
        base: Number(form.salaryBase) || 0,
        commissionEnabled: form.commissionEnabled,
        commissionPercent: Number(form.commissionPercent) || 0,
      },
      schedule: {
        weeklyOff: form.weeklyOff,
        shiftStart: form.shiftStart,
        shiftEnd: form.shiftEnd,
      },
    };
    if (form.password) payload.password = form.password;

    onSubmit(payload);
  };

  const inputClass =
    'w-full px-4 py-2.5 rounded-xl border border-charcoal/10 bg-white/80 text-charcoal text-sm focus:outline-none focus:border-gold/40 focus:ring-2 focus:ring-gold/10 transition-all';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-charcoal/30 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-elevated w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gold/10 sticky top-0 bg-white rounded-t-2xl z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                    <UserPlus size={18} className="text-gold" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-semibold text-charcoal">
                      {staff ? 'Edit Staff Member' : 'Add New Staff'}
                    </h2>
                    <p className="text-xs text-charcoal-muted">
                      {staff ? 'Update profile details' : 'Create a new staff account'}
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="text-charcoal-muted hover:text-charcoal transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-5">
                {error && (
                  <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm text-center">
                    {error}
                  </div>
                )}

                {/* Personal Info */}
                <div>
                  <p className="text-xs font-semibold text-charcoal-muted uppercase tracking-wider mb-3">Personal Info</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1">Full Name</label>
                      <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Staff name" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1">Email</label>
                      <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="staff@salon.com" className={inputClass} disabled={!!staff} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1">Phone</label>
                      <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="9876543210" className={inputClass} />
                    </div>
                    {!staff && (
                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-1">Password</label>
                        <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Login password" className={inputClass} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Role & Designation */}
                <div>
                  <p className="text-xs font-semibold text-charcoal-muted uppercase tracking-wider mb-3">Role & Designation</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1">Role</label>
                      <select name="role" value={form.role} onChange={handleChange} className={inputClass}>
  <option value="staff">Staff</option>
  <option value="receptionist">Receptionist</option>
</select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1">Designation</label>
                      <select name="designation" value={form.designation} onChange={handleChange} className={inputClass}>
                        {designations.map((d) => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Specializations */}
                <div>
                  <p className="text-xs font-semibold text-charcoal-muted uppercase tracking-wider mb-3">Specializations</p>
                  <div className="flex flex-wrap gap-2">
                    {specializations.map((spec) => (
                      <button
                        key={spec.value}
                        type="button"
                        onClick={() => toggleSpecialization(spec.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          form.specializations.includes(spec.value)
                            ? 'bg-gold text-white'
                            : 'bg-charcoal/5 text-charcoal-muted hover:bg-gold/10 hover:text-gold'
                        }`}
                      >
                        {spec.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Schedule */}
                <div>
                  <p className="text-xs font-semibold text-charcoal-muted uppercase tracking-wider mb-3">Schedule</p>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1">Shift Start</label>
                      <input type="time" name="shiftStart" value={form.shiftStart} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1">Shift End</label>
                      <input type="time" name="shiftEnd" value={form.shiftEnd} onChange={handleChange} className={inputClass} />
                    </div>
                  </div>
                  <p className="text-xs text-charcoal-muted mb-2">Weekly Off Days:</p>
                  <div className="flex flex-wrap gap-2">
                    {weekDays.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWeeklyOff(day)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                          form.weeklyOff.includes(day)
                            ? 'bg-error/10 text-error border border-error/20'
                            : 'bg-charcoal/5 text-charcoal-muted hover:bg-charcoal/10'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Salary */}
                <div>
                  <p className="text-xs font-semibold text-charcoal-muted uppercase tracking-wider mb-3">Salary & Commission</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1">Base Salary (₹)</label>
                      <input type="number" name="salaryBase" value={form.salaryBase} onChange={handleChange} placeholder="18000" className={inputClass} />
                    </div>
                    <div className="flex items-end gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="commissionEnabled" checked={form.commissionEnabled} onChange={handleChange} className="w-4 h-4 rounded border-charcoal/20 text-gold focus:ring-gold" />
                        <span className="text-sm text-charcoal">Enable Commission</span>
                      </label>
                    </div>
                    {form.commissionEnabled && (
                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-1">Commission %</label>
                        <input type="number" name="commissionPercent" value={form.commissionPercent} onChange={handleChange} placeholder="10" min="0" max="100" className={inputClass} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Bio / About</label>
                  <textarea name="bio" value={form.bio} onChange={handleChange} placeholder="Short bio about this staff member..." rows={2} className={inputClass + ' resize-none'} />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full luxury-gradient text-white py-3 rounded-xl font-medium text-sm tracking-wide hover:opacity-90 transition-opacity shadow-gold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {isLoading ? 'Saving...' : staff ? 'Update Staff' : 'Add Staff Member'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default StaffModal;