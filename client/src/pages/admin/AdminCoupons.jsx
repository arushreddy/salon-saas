import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2, Tag, Edit2, Trash2, Sparkles, Percent, IndianRupee, Calendar } from 'lucide-react';
import api from '@/services/api';

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '', description: '', discountType: 'percentage', discountValue: '',
    minOrderAmount: '', maxDiscount: '', validUntil: '', usageLimit: '', perUserLimit: '1',
  });

  const fetchCoupons = async () => {
    try { setLoading(true); const { data } = await api.get('/coupons'); setCoupons(data.coupons); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...form,
        discountValue: Number(form.discountValue),
        minOrderAmount: Number(form.minOrderAmount) || 0,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        perUserLimit: Number(form.perUserLimit) || 1,
      };
      if (editing) { await api.put(`/coupons/${editing._id}`, payload); }
      else { await api.post('/coupons', payload); }
      setShowForm(false); setEditing(null);
      setForm({ code: '', description: '', discountType: 'percentage', discountValue: '', minOrderAmount: '', maxDiscount: '', validUntil: '', usageLimit: '', perUserLimit: '1' });
      fetchCoupons();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleEdit = (coupon) => {
    setEditing(coupon);
    setForm({
      code: coupon.code, description: coupon.description || '', discountType: coupon.discountType,
      discountValue: coupon.discountValue, minOrderAmount: coupon.minOrderAmount || '',
      maxDiscount: coupon.maxDiscount || '', validUntil: coupon.validUntil?.split('T')[0] || '',
      usageLimit: coupon.usageLimit || '', perUserLimit: coupon.perUserLimit || '1',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this coupon?')) return;
    try { await api.delete(`/coupons/${id}`); fetchCoupons(); }
    catch (err) { console.error(err); }
  };

  const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-charcoal/10 bg-cream/50 text-charcoal text-sm focus:outline-none focus:border-gold/40 focus:ring-2 focus:ring-gold/10 transition-all';

  const isExpired = (date) => new Date(date) < new Date();

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1"><Sparkles size={16} className="text-gold" /><span className="text-xs font-medium text-gold tracking-wide uppercase">Promotions</span></div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">Coupon Management</h1>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditing(null); }} className="luxury-gradient text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:opacity-90 shadow-gold self-start">
          <Plus size={16} /> Create Coupon
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-white rounded-2xl border border-gold/10 p-5 mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium mb-1">Coupon Code</label><input type="text" placeholder="FLAT20" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required className={inputClass} /></div>
            <div><label className="block text-sm font-medium mb-1">Description</label><input type="text" placeholder="20% off on all services" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} /></div>
            <div><label className="block text-sm font-medium mb-1">Discount Type</label>
              <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className={inputClass}>
                <option value="percentage">Percentage (%)</option><option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium mb-1">Discount Value</label><input type="number" placeholder={form.discountType === 'percentage' ? '20' : '500'} value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} required className={inputClass} /></div>
            <div><label className="block text-sm font-medium mb-1">Min Order Amount (₹)</label><input type="number" placeholder="0" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} className={inputClass} /></div>
            {form.discountType === 'percentage' && <div><label className="block text-sm font-medium mb-1">Max Discount (₹)</label><input type="number" placeholder="500" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} className={inputClass} /></div>}
            <div><label className="block text-sm font-medium mb-1">Valid Until</label><input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} required className={inputClass} /></div>
            <div><label className="block text-sm font-medium mb-1">Usage Limit (total)</label><input type="number" placeholder="Unlimited" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} className={inputClass} /></div>
            <div><label className="block text-sm font-medium mb-1">Per User Limit</label><input type="number" value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })} className={inputClass} /></div>
            <button type="submit" disabled={saving} className="luxury-gradient text-white py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 lg:col-span-3">
              {saving ? 'Saving...' : editing ? 'Update Coupon' : 'Create Coupon'}
            </button>
          </form>
        </motion.div>
      )}

      {/* Coupons Grid */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-gold animate-spin" /></div>
      ) : coupons.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gold/10 p-12 text-center">
          <Tag size={40} className="text-gold/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold mb-1">No Coupons</h3>
          <p className="text-charcoal-muted text-sm">Create your first coupon to attract customers</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {coupons.map((coupon, i) => (
            <motion.div key={coupon._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className={`bg-white rounded-2xl border p-5 relative overflow-hidden ${isExpired(coupon.validUntil) ? 'border-red-200 opacity-60' : 'border-gold/10'}`}>
              <div className="absolute top-0 right-0 w-20 h-20 bg-gold/5 rounded-bl-[40px]" />
              <div className="flex items-start justify-between mb-3 relative">
                <div className="px-3 py-1.5 rounded-lg bg-charcoal text-white text-sm font-bold tracking-wider">{coupon.code}</div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(coupon)} className="p-1.5 rounded-lg hover:bg-gold/10 text-charcoal-muted hover:text-gold"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(coupon._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-charcoal-muted hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
              <p className="text-xs text-charcoal-muted mb-3">{coupon.description || 'No description'}</p>
              <div className="flex items-center gap-2 mb-3">
                {coupon.discountType === 'percentage' ? (
                  <span className="flex items-center gap-1 text-2xl font-bold text-gold"><Percent size={18} />{coupon.discountValue}%</span>
                ) : (
                  <span className="flex items-center gap-1 text-2xl font-bold text-gold"><IndianRupee size={18} />{coupon.discountValue}</span>
                )}
                <span className="text-xs text-charcoal-muted">OFF</span>
              </div>
              <div className="space-y-1 text-xs text-charcoal-muted">
                {coupon.minOrderAmount > 0 && <p>Min order: {'\u20B9'}{coupon.minOrderAmount}</p>}
                {coupon.maxDiscount && <p>Max discount: {'\u20B9'}{coupon.maxDiscount}</p>}
                <p className="flex items-center gap-1"><Calendar size={11} /> Expires: {new Date(coupon.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                <p>Used: {coupon.usedCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}</p>
              </div>
              {isExpired(coupon.validUntil) && <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold">EXPIRED</div>}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCoupons;