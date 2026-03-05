import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2, Users, Phone, Mail, Calendar, IndianRupee, Sparkles } from 'lucide-react';
import api from '@/services/api';

const AdminCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const params = { role: 'customer' };
        if (searchQuery) params.search = searchQuery;
        const { data } = await api.get('/users', { params });
        setCustomers(data.users);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, [searchQuery]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-gold" />
            <span className="text-xs font-medium text-gold tracking-wide uppercase">Customers</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">Customer Directory</h1>
          <p className="text-charcoal-muted text-sm mt-0.5">{customers.length} registered customers</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-muted" />
        <input
          type="text"
          placeholder="Search by name, email or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-charcoal/10 bg-white/80 text-sm text-charcoal focus:outline-none focus:border-gold/40 focus:ring-2 focus:ring-gold/10 transition-all"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gold/10 p-12 text-center">
          <Users size={40} className="text-gold/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-charcoal mb-1">No Customers Yet</h3>
          <p className="text-charcoal-muted text-sm">Customers will appear here after they register or book</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gold/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-cream/50">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider">Customer</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider">Contact</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider">Joined</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer, i) => (
                  <motion.tr
                    key={customer._id}
                    className="border-b border-gold/5 last:border-0 hover:bg-cream/30 transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-gold">{customer.name?.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="text-sm font-medium text-charcoal">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="space-y-0.5">
                        <p className="text-xs text-charcoal-muted flex items-center gap-1"><Mail size={11} /> {customer.email}</p>
                        {customer.phone && <p className="text-xs text-charcoal-muted flex items-center gap-1"><Phone size={11} /> {customer.phone}</p>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-charcoal-muted">
                        {new Date(customer.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        customer.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {customer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCustomers;