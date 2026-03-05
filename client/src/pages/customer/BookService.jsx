import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Clock, IndianRupee, Loader2, Sparkles } from 'lucide-react';
import api from '@/services/api';

const categoryTabs = [
  { value: '', label: 'All' },
  { value: 'hair', label: '💇 Hair' },
  { value: 'skin', label: '✨ Skin' },
  { value: 'nails', label: '💅 Nails' },
  { value: 'makeup', label: '💄 Makeup' },
  { value: 'spa', label: '🧖 Spa' },
  { value: 'bridal', label: '👰 Bridal' },
  { value: 'grooming', label: '🧔 Grooming' },
  { value: 'combo', label: '🎁 Combo' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const BookService = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const params = { active: 'true' };
        if (activeCategory) params.category = activeCategory;
        if (searchQuery) params.search = searchQuery;

        const { data } = await api.get('/services', { params });
        setServices(data.services);
      } catch (error) {
        console.error('Failed to fetch services:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [activeCategory, searchQuery]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-charcoal">Our Services</h1>
        <p className="text-charcoal-muted text-sm mt-0.5">Choose a service and book your appointment</p>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-muted" />
        <input
          type="text"
          placeholder="Search services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-charcoal/10 bg-white/80 text-sm text-charcoal focus:outline-none focus:border-gold/40 focus:ring-2 focus:ring-gold/10 transition-all"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {categoryTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveCategory(tab.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === tab.value
                ? 'bg-gold text-white shadow-gold'
                : 'bg-white/70 text-charcoal-muted hover:bg-gold/10 hover:text-gold border border-charcoal/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      ) : services.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Sparkles size={36} className="text-gold/30 mx-auto mb-3" />
          <p className="text-charcoal-muted text-sm">No services found in this category</p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {services.map((service) => (
            <motion.div
              key={service._id}
              variants={itemVariants}
              className="glass-card rounded-2xl p-5 hover:shadow-card transition-all duration-300 group"
            >
              {/* Discount Badge */}
              {service.discountPrice && (
                <div className="mb-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-error/10 text-error uppercase tracking-wider">
                    {Math.round(((service.price - service.discountPrice) / service.price) * 100)}% Off
                  </span>
                </div>
              )}

              <h3 className="font-display text-base font-semibold text-charcoal mb-1 group-hover:text-gold transition-colors">
                {service.name}
              </h3>
              <p className="text-xs text-charcoal-muted line-clamp-2 mb-4">
                {service.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <IndianRupee size={14} className="text-gold" />
                    {service.discountPrice ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-charcoal">
                          {service.discountPrice.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-charcoal-muted line-through">
                          {service.price.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-charcoal">
                        {service.price.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-charcoal-muted">
                    <Clock size={13} />
                    <span className="text-xs">
                      {service.duration >= 60
                        ? `${Math.floor(service.duration / 60)}h ${service.duration % 60 ? service.duration % 60 + 'm' : ''}`
                        : `${service.duration} min`}
                    </span>
                  </div>
                </div>

                <button className="px-4 py-1.5 rounded-lg bg-gold/10 text-gold text-xs font-medium hover:bg-gold hover:text-white transition-all">
                  Book
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default BookService;