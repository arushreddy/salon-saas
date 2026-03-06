import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Save, Upload, ImageIcon, Trash2 } from 'lucide-react';

const categories = [
  { value: 'hair', label: '💇 Hair' },
  { value: 'skin', label: '✨ Skin Care' },
  { value: 'nails', label: '💅 Nails' },
  { value: 'makeup', label: '💄 Makeup' },
  { value: 'spa', label: '🧖 Spa & Wellness' },
  { value: 'bridal', label: '👰 Bridal' },
  { value: 'grooming', label: '🧔 Grooming' },
  { value: 'combo', label: '🎁 Combo Packages' },
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
  image: '',
};

const ServiceModal = ({ isOpen, onClose, onSubmit, service, isLoading }) => {
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [imageDragging, setImageDragging] = useState(false);
  const fileInputRef = useRef(null);

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
        image: service.image || '',
      });
      setImagePreview(service.image || '');
    } else {
      setForm(defaultForm);
      setImagePreview('');
    }
    setError('');
  }, [service, isOpen]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const processImage = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      setImagePreview(base64);
      setForm((prev) => ({ ...prev, image: base64 }));
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    processImage(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setImageDragging(false);
    processImage(e.dataTransfer.files[0]);
  };

  const handleRemoveImage = () => {
    setImagePreview('');
    setForm((prev) => ({ ...prev, image: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
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
            className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-50"
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
                <div>
                  <h2 className="font-display text-lg font-semibold text-charcoal">
                    {service ? 'Edit Service' : 'Add New Service'}
                  </h2>
                  <p className="text-xs text-charcoal-muted mt-0.5">
                    {service ? 'Update service details' : 'Create a new salon service'}
                  </p>
                </div>
                <button onClick={onClose} className="text-charcoal-muted hover:text-charcoal transition-colors p-1">
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm text-center">
                    {error}
                  </div>
                )}

                {/* ✅ Luxury Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">Service Image</label>
                  {imagePreview ? (
                    <div className="relative rounded-2xl overflow-hidden group">
                      <img
                        src={imagePreview}
                        alt="Service preview"
                        className="w-full h-48 object-cover"
                      />
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/40 transition-all duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-white text-charcoal px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-cream"
                          >
                            <Upload size={12} /> Change
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-red-600"
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>
                      </div>
                      {/* Gold border accent */}
                      <div className="absolute inset-0 rounded-2xl ring-1 ring-gold/20 pointer-events-none" />
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setImageDragging(true); }}
                      onDragLeave={() => setImageDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`
                        relative w-full h-40 rounded-2xl border-2 border-dashed cursor-pointer
                        flex flex-col items-center justify-center gap-3 transition-all duration-200
                        ${imageDragging
                          ? 'border-gold bg-gold/5 scale-[1.01]'
                          : 'border-charcoal/15 bg-cream/30 hover:border-gold/40 hover:bg-gold/5'
                        }
                      `}
                    >
                      <div className={`p-3 rounded-full transition-colors ${imageDragging ? 'bg-gold/20' : 'bg-gold/10'}`}>
                        <ImageIcon size={22} className="text-gold" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-charcoal">
                          {imageDragging ? 'Drop image here' : 'Upload Service Image'}
                        </p>
                        <p className="text-xs text-charcoal-muted mt-0.5">
                          Drag & drop or click to browse · Max 2MB
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-charcoal-muted">
                        <span className="px-2 py-0.5 bg-white rounded-md border border-charcoal/10">JPG</span>
                        <span className="px-2 py-0.5 bg-white rounded-md border border-charcoal/10">PNG</span>
                        <span className="px-2 py-0.5 bg-white rounded-md border border-charcoal/10">WEBP</span>
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* Service Name */}
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

                {/* Description */}
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

                {/* Category & Gender */}
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

                {/* Price, Discount, Duration */}
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

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full luxury-gradient text-white py-3 rounded-xl font-medium text-sm tracking-wide hover:opacity-90 transition-opacity shadow-gold flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
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