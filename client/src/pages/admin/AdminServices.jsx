import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  Clock,
  IndianRupee,
  Filter,
  Sparkles,
} from 'lucide-react';
import api from '@/services/api';
import ServiceModal from '@/components/ServiceModal';

const categoryLabels = {
  hair: '💇 Hair',
  skin: '✨ Skin Care',
  nails: '💅 Nails',
  makeup: '💄 Makeup',
  spa: '🧖 Spa',
  bridal: '👰 Bridal',
  grooming: '🧔 Grooming',
  combo: '🎁 Combo',
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const AdminServices = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (filterCategory) params.category = filterCategory;
      const { data } = await api.get('/services', { params });
      setServices(data.services);
    } catch (error) {
      console.error('Failed to fetch services:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterCategory]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const handleAdd = () => { setEditingService(null); setModalOpen(true); };
  const handleEdit = (service) => { setEditingService(service); setModalOpen(true); };

  const handleSubmit = async (formData) => {
    try {
      setSaving(true);
      if (editingService) {
        await api.put(`/services/${editingService._id}`, formData);
      } else {
        await api.post('/services', formData);
      }
      setModalOpen(false);
      setEditingService(null);
      fetchServices();
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/services/${id}`);
      setDeleteConfirm(null);
      fetchServices();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-gold" />
            <span className="text-xs font-medium text-gold tracking-wide uppercase">Services</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">Manage Services</h1>
          <p className="text-charcoal-muted text-sm mt-0.5">Manage your salon services and pricing</p>
        </div>
        <button
          onClick={handleAdd}
          className="luxury-gradient text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity shadow-gold self-start"
        >
          <Plus size={16} />
          Add Service
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-muted" />
          <input
            type="text"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-charcoal/10 bg-white/80 text-sm text-charcoal focus:outline-none focus:border-gold/40 focus:ring-2 focus:ring-gold/10 transition-all"
          />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-muted" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="pl-10 pr-8 py-2.5 rounded-xl border border-charcoal/10 bg-white/80 text-sm text-charcoal appearance-none focus:outline-none focus:border-gold/40 focus:ring-2 focus:ring-gold/10 transition-all"
          >
            <option value="">All Categories</option>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      ) : services.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gold/10 p-12 text-center">
          <Sparkles size={40} className="text-gold/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-charcoal mb-1">No Services Found</h3>
          <p className="text-charcoal-muted text-sm">Add your first service to get started!</p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {services.map((service) => (
            <motion.div
              key={service._id}
              variants={itemVariants}
              className="bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-shadow duration-300 group relative border border-gold/10"
            >
              {/* Service Image */}
              {service.image ? (
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/10 to-transparent" />
                  <span className={`absolute top-3 right-3 text-xs px-2.5 py-1 rounded-full backdrop-blur-sm font-medium ${
                    service.isActive ? 'bg-emerald-500/80 text-white' : 'bg-red-500/80 text-white'
                  }`}>
                    {service.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-lg bg-black/30 backdrop-blur-sm text-white">
                    {categoryLabels[service.category] || service.category}
                  </span>
                  {/* Price overlay on image */}
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                    <h3 className="font-display text-base font-semibold text-white drop-shadow">
                      {service.name}
                    </h3>
                    <div className="text-right">
                      {service.discountPrice ? (
                        <div>
                          <p className="text-white font-bold text-sm drop-shadow">₹{service.discountPrice.toLocaleString('en-IN')}</p>
                          <p className="text-white/60 text-xs line-through">₹{service.price.toLocaleString('en-IN')}</p>
                        </div>
                      ) : (
                        <p className="text-white font-bold text-sm drop-shadow">₹{service.price.toLocaleString('en-IN')}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-44 bg-gradient-to-br from-gold/15 via-cream to-gold/5 flex flex-col items-center justify-center relative">
                  <span className="text-5xl mb-1">{categoryLabels[service.category]?.split(' ')[0] || '✨'}</span>
                  <span className={`absolute top-3 right-3 text-xs px-2.5 py-1 rounded-full font-medium ${
                    service.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                  }`}>
                    {service.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-lg bg-gold/10 text-gold">
                    {categoryLabels[service.category] || service.category}
                  </span>
                </div>
              )}

              {/* Card Body */}
              <div className="p-4">
                {/* Show name & price only if no image (already shown in overlay) */}
                {!service.image && (
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-display text-base font-semibold text-charcoal">{service.name}</h3>
                    <div className="text-right shrink-0 ml-2">
                      {service.discountPrice ? (
                        <div>
                          <p className="text-sm font-bold text-charcoal">₹{service.discountPrice.toLocaleString('en-IN')}</p>
                          <p className="text-xs text-charcoal-muted line-through">₹{service.price.toLocaleString('en-IN')}</p>
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-charcoal">₹{service.price.toLocaleString('en-IN')}</p>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-xs text-charcoal-muted line-clamp-2 mb-3">
                  {service.description || 'No description provided'}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-charcoal-muted">
                      <Clock size={12} />
                      <span className="text-xs">
                        {service.duration >= 60
                          ? `${Math.floor(service.duration / 60)}h ${service.duration % 60 ? service.duration % 60 + 'm' : ''}`
                          : `${service.duration} min`}
                      </span>
                    </div>
                    <span className="text-[11px] text-charcoal-muted capitalize bg-cream px-2 py-0.5 rounded-full border border-gold/10">
                      {service.gender}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(service)}
                      className="p-1.5 rounded-lg hover:bg-gold/10 text-charcoal-muted hover:text-gold transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(service._id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-charcoal-muted hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Delete Confirmation Overlay */}
              {deleteConfirm === service._id && (
                <motion.div
                  className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Trash2 size={28} className="text-red-400 mb-2" />
                  <p className="text-sm font-medium text-charcoal mb-1">Delete this service?</p>
                  <p className="text-xs text-charcoal-muted mb-4 text-center">This action cannot be undone</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-4 py-1.5 rounded-lg border border-charcoal/10 text-sm text-charcoal hover:bg-cream transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(service._id)}
                      className="px-4 py-1.5 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Add/Edit Modal */}
      <ServiceModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingService(null); }}
        onSubmit={handleSubmit}
        service={editingService}
        isLoading={saving}
      />
    </div>
  );
};

export default AdminServices;