import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Loader2, Package, AlertTriangle, IndianRupee, Edit2, Trash2, Minus, PlusIcon, Sparkles } from 'lucide-react';
import api from '@/services/api';

const categoryLabels = {
  shampoo: 'Shampoo', conditioner: 'Conditioner', oil: 'Oil', color: 'Color',
  cream: 'Cream', serum: 'Serum', tools: 'Tools', accessories: 'Accessories',
  consumables: 'Consumables', other: 'Other',
};

const AdminInventory = () => {
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', category: 'other', brand: '', quantity: '', unit: 'pieces',
    costPrice: '', sellingPrice: '', lowStockThreshold: '5', notes: '',
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (showLowStock) params.lowStock = 'true';
      const { data } = await api.get('/inventory', { params });
      setProducts(data.products);
      setSummary(data.summary);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, [search, showLowStock]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = { ...form, quantity: Number(form.quantity), costPrice: Number(form.costPrice), sellingPrice: Number(form.sellingPrice) || 0, lowStockThreshold: Number(form.lowStockThreshold) };
      if (editingProduct) {
        await api.put(`/inventory/${editingProduct._id}`, payload);
      } else {
        await api.post('/inventory', payload);
      }
      setShowForm(false);
      setEditingProduct(null);
      setForm({ name: '', category: 'other', brand: '', quantity: '', unit: 'pieces', costPrice: '', sellingPrice: '', lowStockThreshold: '5', notes: '' });
      fetchProducts();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleStockUpdate = async (id, type) => {
    const qty = prompt(`Enter quantity to ${type}:`);
    if (!qty || isNaN(qty)) return;
    try {
      await api.patch(`/inventory/${id}/stock`, { quantity: Number(qty), type });
      fetchProducts();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this product?')) return;
    try { await api.delete(`/inventory/${id}`); fetchProducts(); }
    catch (err) { console.error(err); }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name, category: product.category, brand: product.brand || '',
      quantity: product.quantity, unit: product.unit, costPrice: product.costPrice,
      sellingPrice: product.sellingPrice || '', lowStockThreshold: product.lowStockThreshold, notes: product.notes || '',
    });
    setShowForm(true);
  };

  const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-charcoal/10 bg-cream/50 text-charcoal text-sm focus:outline-none focus:border-gold/40 focus:ring-2 focus:ring-gold/10 transition-all';

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-gold" />
            <span className="text-xs font-medium text-gold tracking-wide uppercase">Inventory</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">Product Inventory</h1>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingProduct(null); }} className="luxury-gradient text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:opacity-90 shadow-gold self-start">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gold/10 p-4 text-center">
            <p className="font-display text-xl font-bold text-charcoal">{summary.totalProducts}</p>
            <p className="text-xs text-charcoal-muted">Total Products</p>
          </div>
          <div className={`rounded-xl border p-4 text-center ${summary.lowStockCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gold/10'}`}>
            <p className={`font-display text-xl font-bold ${summary.lowStockCount > 0 ? 'text-red-600' : 'text-charcoal'}`}>{summary.lowStockCount}</p>
            <p className="text-xs text-charcoal-muted">Low Stock</p>
          </div>
          <div className="bg-white rounded-xl border border-gold/10 p-4 text-center">
            <p className="font-display text-xl font-bold text-gold">{'\u20B9'}{(summary.totalValue || 0).toLocaleString('en-IN')}</p>
            <p className="text-xs text-charcoal-muted">Stock Value</p>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-white rounded-2xl border border-gold/10 p-5 mb-6">
          <h3 className="font-display text-base font-semibold mb-4">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <input type="text" placeholder="Product Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inputClass} />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
              {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="text" placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required className={inputClass} />
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inputClass}>
              {['pieces', 'ml', 'liters', 'grams', 'kg', 'bottles', 'packets', 'boxes'].map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <input type="number" placeholder="Cost Price (₹)" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} required className={inputClass} />
            <input type="number" placeholder="Selling Price (₹)" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Low Stock Alert At" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} className={inputClass} />
            <button type="submit" disabled={saving} className="luxury-gradient text-white py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 sm:col-span-2 lg:col-span-4">
              {saving ? 'Saving...' : editingProduct ? 'Update' : 'Add Product'}
            </button>
          </form>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-muted" />
          <input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-charcoal/10 bg-white/80 text-sm focus:outline-none focus:border-gold/40" />
        </div>
        <button onClick={() => setShowLowStock(!showLowStock)} className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${showLowStock ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-white border border-charcoal/10 text-charcoal-muted'}`}>
          <AlertTriangle size={14} /> Low Stock
        </button>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-gold animate-spin" /></div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gold/10 p-12 text-center">
          <Package size={40} className="text-gold/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold mb-1">No Products</h3>
          <p className="text-charcoal-muted text-sm">Add your first product to start tracking inventory</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {products.map((product, i) => (
            <motion.div key={product._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className={`bg-white rounded-2xl border p-5 hover:shadow-md transition-all ${product.quantity <= product.lowStockThreshold ? 'border-red-200' : 'border-gold/10'}`}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gold/10 text-gold capitalize">{product.category}</span>
                {product.quantity <= product.lowStockThreshold && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 flex items-center gap-1"><AlertTriangle size={10} /> Low</span>
                )}
              </div>
              <h3 className="font-display text-base font-semibold text-charcoal">{product.name}</h3>
              {product.brand && <p className="text-xs text-charcoal-muted">{product.brand}</p>}
              <div className="flex items-center gap-4 mt-3 mb-3">
                <div>
                  <p className="text-lg font-bold text-charcoal">{product.quantity} <span className="text-xs font-normal text-charcoal-muted">{product.unit}</span></p>
                  <p className="text-[11px] text-charcoal-muted">In Stock</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gold">{'\u20B9'}{product.costPrice}</p>
                  <p className="text-[11px] text-charcoal-muted">Cost/unit</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-gold/5">
                <button onClick={() => handleStockUpdate(product._id, 'add')} className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center gap-1"><PlusIcon size={12} /> Add</button>
                <button onClick={() => handleStockUpdate(product._id, 'use')} className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 flex items-center justify-center gap-1"><Minus size={12} /> Use</button>
                <button onClick={() => handleEdit(product)} className="p-1.5 rounded-lg hover:bg-gold/10 text-charcoal-muted hover:text-gold"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(product._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-charcoal-muted hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminInventory;