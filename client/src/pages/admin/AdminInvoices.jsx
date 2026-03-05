import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, FileText, Eye, IndianRupee, Sparkles } from 'lucide-react';
import api from '@/services/api';

const AdminInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const params = {};
        if (dateFilter) { params.startDate = dateFilter; params.endDate = dateFilter; }
        const { data } = await api.get('/invoices', { params });
        setInvoices(data.invoices);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [dateFilter]);

  const viewInvoice = async (bookingId) => {
    try {
      const { data } = await api.get(`/invoices/${bookingId}`);
      setInvoiceData(data.invoice);
      setSelectedInvoice(bookingId);
    } catch (err) { console.error(err); }
  };

  const printInvoice = () => {
    const printWindow = window.open('', '_blank');
    const d = invoiceData;
    printWindow.document.write(`
      <html><head><title>Invoice ${d.invoiceNumber}</title>
      <style>body{font-family:sans-serif;padding:40px;max-width:600px;margin:auto}
      h1{font-size:20px;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin:16px 0}
      td,th{padding:8px;text-align:left;border-bottom:1px solid #eee;font-size:13px}
      .right{text-align:right}.bold{font-weight:bold}.total{font-size:16px;font-weight:bold}
      .header{display:flex;justify-content:space-between;margin-bottom:24px}
      .divider{border-top:2px solid #C9A96E;margin:16px 0}</style></head><body>
      <div class="header"><div><h1>${d.salon.name}</h1><p style="font-size:12px;color:#666">${d.salon.address?.street || ''}, ${d.salon.address?.city || ''}</p>
      <p style="font-size:12px;color:#666">Ph: ${d.salon.phone || ''} | ${d.salon.email || ''}</p>
      ${d.salon.gstNumber ? `<p style="font-size:12px;color:#666">GST: ${d.salon.gstNumber}</p>` : ''}</div>
      <div style="text-align:right"><h2 style="color:#C9A96E">INVOICE</h2><p style="font-size:12px">${d.invoiceNumber}</p>
      <p style="font-size:12px">${new Date(d.date).toLocaleDateString('en-IN')}</p></div></div>
      <div class="divider"></div>
      <p style="font-size:13px"><b>Bill To:</b> ${d.customer.name} | ${d.customer.phone || ''} | ${d.customer.email || ''}</p>
      <table><tr><th>Service</th><th>Duration</th><th>Stylist</th><th class="right">Amount</th></tr>
      <tr><td>${d.service.name}</td><td>${d.service.duration} min</td><td>${d.staff}</td><td class="right">${'\u20B9'}${d.pricing.subtotal.toLocaleString('en-IN')}</td></tr></table>
      <table><tr><td>Subtotal</td><td class="right">${'\u20B9'}${d.pricing.subtotal.toLocaleString('en-IN')}</td></tr>
      <tr><td>CGST (${d.pricing.taxRate/2}%)</td><td class="right">${'\u20B9'}${d.pricing.cgst}</td></tr>
      <tr><td>SGST (${d.pricing.taxRate/2}%)</td><td class="right">${'\u20B9'}${d.pricing.sgst}</td></tr>
      ${d.pricing.discount > 0 ? `<tr><td>Discount</td><td class="right" style="color:green">-${'\u20B9'}${d.pricing.discount}</td></tr>` : ''}
      <tr class="total"><td><b>Total</b></td><td class="right"><b>${'\u20B9'}${d.pricing.total.toLocaleString('en-IN')}</b></td></tr></table>
      <p style="font-size:12px;color:#666">Payment: ${d.payment.method} | Status: ${d.payment.status}</p>
      <div class="divider"></div><p style="text-align:center;font-size:11px;color:#999">Thank you for visiting ${d.salon.name}!</p>
      </body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1"><Sparkles size={16} className="text-gold" /><span className="text-xs font-medium text-gold tracking-wide uppercase">Invoices</span></div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">Invoice Management</h1>
        </div>
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-4 py-2 rounded-xl border border-charcoal/10 bg-white text-sm focus:outline-none focus:border-gold/40" />
      </div>

      {/* Invoice Detail Modal */}
      {invoiceData && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-gold/10 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold">Invoice {invoiceData.invoiceNumber}</h3>
            <div className="flex gap-2">
              <button onClick={printInvoice} className="px-4 py-2 rounded-xl text-sm font-medium bg-gold/10 text-gold hover:bg-gold/20">Print / Download PDF</button>
              <button onClick={() => { setInvoiceData(null); setSelectedInvoice(null); }} className="px-4 py-2 rounded-xl text-sm font-medium bg-charcoal/5 text-charcoal-muted hover:bg-charcoal/10">Close</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div><p className="text-charcoal-muted text-xs">Customer</p><p className="font-medium">{invoiceData.customer.name}</p></div>
            <div><p className="text-charcoal-muted text-xs">Service</p><p className="font-medium">{invoiceData.service.name}</p></div>
            <div><p className="text-charcoal-muted text-xs">Date</p><p className="font-medium">{new Date(invoiceData.bookingDate).toLocaleDateString('en-IN')}</p></div>
            <div><p className="text-charcoal-muted text-xs">Stylist</p><p className="font-medium">{invoiceData.staff}</p></div>
          </div>
          <div className="border-t border-gold/10 pt-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-charcoal-muted">Subtotal</span><span>{'\u20B9'}{invoiceData.pricing.subtotal}</span></div>
            <div className="flex justify-between text-sm"><span className="text-charcoal-muted">CGST ({invoiceData.pricing.taxRate/2}%)</span><span>{'\u20B9'}{invoiceData.pricing.cgst}</span></div>
            <div className="flex justify-between text-sm"><span className="text-charcoal-muted">SGST ({invoiceData.pricing.taxRate/2}%)</span><span>{'\u20B9'}{invoiceData.pricing.sgst}</span></div>
            {invoiceData.pricing.discount > 0 && <div className="flex justify-between text-sm"><span className="text-charcoal-muted">Discount</span><span className="text-emerald-600">-{'\u20B9'}{invoiceData.pricing.discount}</span></div>}
            <div className="flex justify-between text-base font-bold pt-2 border-t border-gold/10"><span>Total</span><span className="text-gold">{'\u20B9'}{invoiceData.pricing.total.toLocaleString('en-IN')}</span></div>
          </div>
        </motion.div>
      )}

      {/* Invoice List */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-gold animate-spin" /></div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gold/10 p-12 text-center">
          <FileText size={40} className="text-gold/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold mb-1">No Invoices</h3>
          <p className="text-charcoal-muted text-sm">Invoices are generated for completed paid bookings</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gold/10 overflow-hidden">
          <table className="w-full">
            <thead><tr className="bg-cream/50">
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-charcoal-muted uppercase">Customer</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-charcoal-muted uppercase">Service</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-charcoal-muted uppercase">Date</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-charcoal-muted uppercase">Amount</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-charcoal-muted uppercase">Action</th>
            </tr></thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv._id} className="border-b border-gold/5 hover:bg-cream/30">
                  <td className="px-5 py-3 text-sm font-medium">{inv.customer?.name}</td>
                  <td className="px-5 py-3 text-sm text-charcoal-muted">{inv.service?.name}</td>
                  <td className="px-5 py-3 text-sm text-charcoal-muted">{new Date(inv.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                  <td className="px-5 py-3 text-sm font-bold">{'\u20B9'}{inv.finalAmount?.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3"><button onClick={() => viewInvoice(inv._id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gold/10 text-gold hover:bg-gold/20"><Eye size={12} /> View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminInvoices;