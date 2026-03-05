import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Save } from 'lucide-react';

const categories = [
  { value: 'hair', label: 'Hair' },
  { value: 'skin', label: 'Skin Care' },
  { value: 'nails', label: 'Nails' },
  { value: 'makeup', label: 'Makeup' },
  { value: 'spa', label: 'Spa & Wellness' },
  { value: 'bridal', label: 'Bridal' },
  { value: 'grooming', label: 'Grooming' },
  { value: 'combo', label: 'Combo Packages' },
];

const genderOptions = [
  { value: 'unisex', label: 'Unisex' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
];

const defaultForm = {
  name: '',
  description: '',
  category: 'hair',
  price: '',
  discountPrice: '',
  duration: '',
  gender: 'unisex',
};

const ServiceModal = ({ isOpen, onClose, onSubmit, service, isLoading }) => {
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState('');

  useEffect(() => {
    if (service) {
      setForm({
        name: service.name || '',
        description: service.description || '',
        category: service.category || 'hair',
        price: service.price || '',
        discountPrice: service.discountPrice || '',
        duration: service.duration || '',
        gender: service.gender || 'unisex',
      });
    } else {
      setForm(defaultForm);
    }
    setError('');
  }, [service, isOpen]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.name || !form.category || !form.price || !form.duration) {
      setError('Name, category, price and duration are required');
      return;
    }

    if (form.discountPrice && Number(form.discountPrice) >= Number(form.price)) {
      setError('Discount price must be less than regular price');
      return;
    }

    onSubmit({
      ...form,
      price: Number(form.price),
      discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
      duration: Number(form.duration),
    });
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
              className="bg-white rounded-2xl shadow-elevated w-full max-w-lg max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gold/10">
                <h2 className="font-display text-lg font-semibold text-charcoal">
                  {service ? 'Edit Service' : 'Add New Service'}
                </h2>
                <button onClick={onClose} className="text-charcoal-muted hover:text-charcoal transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm text-center">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Service Name</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Hair Spa Treatment"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Description</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Brief description of the service"
                    rows={3}
                    className={inputClass + ' resize-none'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1">Category</label>
                    <select name="category" value={form.category} onChange={handleChange} className={inputClass}>
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1">Gender</label>
                    <select name="gender" value={form.gender} onChange={handleChange} className={inputClass}>
                      {genderOptions.map((g) => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1">Price (₹)</label>
                    <input
                      type="number"
                      name="price"
                      value={form.price}
                      onChange={handleChange}
                      placeholder="500"
                      min="0"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1">Discount (₹)</label>
                    <input
                      type="number"
                      name="discountPrice"
                      value={form.discountPrice}
                      onChange={handleChange}
                      placeholder="Optional"
                      min="0"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1">Duration (min)</label>
                    <input
                      type="number"
                      name="duration"
                      value={form.duration}
                      onChange={handleChange}
                      placeholder="45"
                      min="5"
                      className={inputClass}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full luxury-gradient text-white py-2.5 rounded-xl font-medium text-sm tracking-wide hover:opacity-90 transition-opacity shadow-gold flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {isLoading ? 'Saving...' : service ? 'Update Service' : 'Add Service'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ServiceModal;