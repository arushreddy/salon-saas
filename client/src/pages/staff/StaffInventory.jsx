import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Search, Loader2, Check, AlertTriangle, X,
  History, Plus, Minus, RefreshCw, ChevronDown,
  Droplets, Scissors, RotateCcw, Filter,
} from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';

// ── Design tokens ─────────────────────────────────────────────────────
const C = {
  cream:'#FDF8F0', creamMid:'#F7EFD8', creamBorder:'#DFD0A8',
  gold:'#B8860B', goldLight:'#D4A017', goldPale:'#FFF8E7',
  ink:'#16100A', inkMid:'#5A4020', inkFaint:'#B09060',
  ok:'#285C3A', okPale:'#EAF4EE',
  risk:'#7A2020', riskPale:'#F7EEEE',
  warn:'#92400E', warnPale:'#FEF3DC',
  blue:'#1D4ED8', bluePale:'#EFF6FF',
  purple:'#6D28D9', purplePale:'#F5F3FF',
};

const fV = { hidden:{opacity:0,y:10}, show:{opacity:1,y:0,transition:{duration:0.25}} };
const sV = { hidden:{}, show:{transition:{staggerChildren:0.05}} };

const CAT_ICON = {
  shampoo:'💆', conditioner:'💧', oil:'🫙', color:'🎨',
  cream:'🧴', serum:'💊', tools:'🔧', accessories:'📎',
  consumables:'🧻', other:'📦',
};

const LOG_TYPE = {
  use:        { label:'Used',       color:C.purple, bg:C.purplePale, icon:'🔧' },
  refill:     { label:'Refilled',   color:C.ok,     bg:C.okPale,     icon:'📦' },
  wastage:    { label:'Wastage',    color:C.risk,   bg:C.riskPale,   icon:'🗑️' },
  adjustment: { label:'Adjusted',  color:C.gold,   bg:C.goldPale,   icon:'⚙️' },
};

const fmtDate = d => {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) +
    ' ' + dt.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true});
};
const todayIST = () => new Date(Date.now() + 5.5*60*60*1000).toISOString().split('T')[0];

// ── Toast ──────────────────────────────────────────────────────────────
const Toast = ({ msg, ok, onDone }) => {
  useEffect(()=>{const t=setTimeout(onDone,2500);return()=>clearTimeout(t);},[]);
  return (
    <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} exit={{opacity:0}}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl text-sm font-bold"
      style={{background:ok?'#1A4731':C.risk, color:'#fff', whiteSpace:'nowrap'}}>
      {ok?<Check size={13}/>:<AlertTriangle size={13}/>} {msg}
    </motion.div>
  );
};

// ── Use Product Modal ─────────────────────────────────────────────────
const UseModal = ({ product, onClose, onSuccess }) => {
  const [qty,          setQty]          = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [serviceName,  setServiceName]  = useState('');
  const [notes,        setNotes]        = useState('');
  const [loading,      setLoading]      = useState(false);

  const handleSubmit = async () => {
    if (qty < 1) return;
    setLoading(true);
    try {
      await api.patch(`/inventory/${product._id}/stock`, {
        quantity: qty,
        type: 'use',
        customerName,
        serviceName,
        notes,
      });
      onSuccess(`Used ${qty} ${product.unit} of ${product.name}`);
      onClose();
    } catch(e) {
      onSuccess(e.response?.data?.message || 'Failed', false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{background:'rgba(22,16,10,0.6)'}}>
      <motion.div initial={{opacity:0,scale:0.93}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.93}}
        className="w-full max-w-sm rounded-3xl p-6 shadow-2xl"
        style={{background:C.cream, border:`1px solid ${C.creamBorder}`}}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-bold text-base" style={{color:C.ink,fontFamily:"'Playfair Display',serif"}}>
              Log Product Use
            </p>
            <p className="text-xs mt-0.5" style={{color:C.inkFaint}}>
              {CAT_ICON[product.category]} {product.name} · {product.quantity} {product.unit} in stock
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5">
            <X size={15} style={{color:C.inkFaint}}/>
          </button>
        </div>

        {/* Qty */}
        <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{color:C.inkFaint}}>
          Quantity Used
        </p>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={()=>setQty(q=>Math.max(1,q-1))}
            className="w-10 h-10 rounded-xl flex items-center justify-center border font-bold transition-all hover:bg-black/5"
            style={{borderColor:C.creamBorder}}>
            <Minus size={14} style={{color:C.inkMid}}/>
          </button>
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold" style={{color:C.gold,fontFamily:"'Playfair Display',serif"}}>{qty}</p>
            <p className="text-[10px]" style={{color:C.inkFaint}}>{product.unit}</p>
          </div>
          <button onClick={()=>setQty(q=>Math.min(product.quantity,q+1))}
            className="w-10 h-10 rounded-xl flex items-center justify-center border font-bold transition-all hover:bg-black/5"
            style={{borderColor:C.creamBorder}}>
            <Plus size={14} style={{color:C.inkMid}}/>
          </button>
        </div>

        {/* Context fields */}
        <div className="space-y-3 mb-5">
          <input value={customerName} onChange={e=>setCustomerName(e.target.value)}
            placeholder="Customer name (optional)"
            className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
            style={{background:'#fff',borderColor:C.creamBorder,color:C.ink}}/>
          <input value={serviceName} onChange={e=>setServiceName(e.target.value)}
            placeholder="Service / treatment (optional)"
            className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
            style={{background:'#fff',borderColor:C.creamBorder,color:C.ink}}/>
          <input value={notes} onChange={e=>setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
            style={{background:'#fff',borderColor:C.creamBorder,color:C.ink}}/>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-semibold"
            style={{background:C.creamMid, color:C.inkMid, border:`1px solid ${C.creamBorder}`}}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading || qty < 1}
            className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{background:`linear-gradient(135deg,${C.purple},#7C3AED)`, color:'#fff'}}>
            {loading ? <Loader2 size={14} className="animate-spin"/> : <><Check size={14}/>Log Use</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Refill Modal ──────────────────────────────────────────────────────
const RefillModal = ({ product, onClose, onSuccess }) => {
  const [qty,       setQty]       = useState(1);
  const [supplier,  setSupplier]  = useState(product.supplier?.name || '');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [costPer,   setCostPer]   = useState(product.costPrice || 0);
  const [notes,     setNotes]     = useState('');
  const [loading,   setLoading]   = useState(false);

  const handleSubmit = async () => {
    if (qty < 1) return;
    setLoading(true);
    try {
      await api.patch(`/inventory/${product._id}/stock`, {
        quantity: qty,
        type: 'refill',
        supplier,
        invoiceNo,
        costPerUnit: costPer,
        notes,
      });
      onSuccess(`Refilled ${qty} ${product.unit} of ${product.name}`);
      onClose();
    } catch(e) {
      onSuccess(e.response?.data?.message || 'Failed', false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{background:'rgba(22,16,10,0.6)'}}>
      <motion.div initial={{opacity:0,scale:0.93}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.93}}
        className="w-full max-w-sm rounded-3xl p-6 shadow-2xl"
        style={{background:C.cream, border:`1px solid ${C.creamBorder}`}}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-bold text-base" style={{color:C.ink,fontFamily:"'Playfair Display',serif"}}>
              Log Refill
            </p>
            <p className="text-xs mt-0.5" style={{color:C.inkFaint}}>
              {CAT_ICON[product.category]} {product.name} · Currently {product.quantity} {product.unit}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5">
            <X size={15} style={{color:C.inkFaint}}/>
          </button>
        </div>

        <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{color:C.inkFaint}}>
          Quantity Added
        </p>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={()=>setQty(q=>Math.max(1,q-1))}
            className="w-10 h-10 rounded-xl flex items-center justify-center border font-bold hover:bg-black/5"
            style={{borderColor:C.creamBorder}}>
            <Minus size={14} style={{color:C.inkMid}}/>
          </button>
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold" style={{color:C.ok,fontFamily:"'Playfair Display',serif"}}>{qty}</p>
            <p className="text-[10px]" style={{color:C.inkFaint}}>{product.unit}</p>
          </div>
          <button onClick={()=>setQty(q=>q+1)}
            className="w-10 h-10 rounded-xl flex items-center justify-center border font-bold hover:bg-black/5"
            style={{borderColor:C.creamBorder}}>
            <Plus size={14} style={{color:C.inkMid}}/>
          </button>
        </div>

        <div className="space-y-3 mb-5">
          <input value={supplier} onChange={e=>setSupplier(e.target.value)}
            placeholder="Supplier name"
            className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
            style={{background:'#fff',borderColor:C.creamBorder,color:C.ink}}/>
          <input value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)}
            placeholder="Invoice / bill number"
            className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
            style={{background:'#fff',borderColor:C.creamBorder,color:C.ink}}/>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{color:C.inkFaint}}>₹</span>
            <input type="number" value={costPer} onChange={e=>setCostPer(Number(e.target.value))}
              placeholder="Cost per unit"
              className="flex-1 px-3 py-2.5 rounded-xl text-sm border outline-none"
              style={{background:'#fff',borderColor:C.creamBorder,color:C.ink}}/>
          </div>
          <input value={notes} onChange={e=>setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
            style={{background:'#fff',borderColor:C.creamBorder,color:C.ink}}/>
        </div>

        {costPer>0 && qty>0 && (
          <div className="rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between"
            style={{background:C.okPale, border:`1px solid #BBF7D0`}}>
            <p className="text-xs font-semibold" style={{color:C.ok}}>Total Refill Cost</p>
            <p className="text-sm font-black" style={{color:C.ok}}>₹{(costPer*qty).toLocaleString('en-IN')}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-semibold"
            style={{background:C.creamMid, color:C.inkMid, border:`1px solid ${C.creamBorder}`}}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading||qty<1}
            className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{background:`linear-gradient(135deg,${C.ok},#16A34A)`, color:'#fff'}}>
            {loading ? <Loader2 size={14} className="animate-spin"/> : <><RotateCcw size={14}/>Log Refill</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── History Row ───────────────────────────────────────────────────────
const HistoryRow = ({ log }) => {
  const t = LOG_TYPE[log.type] || LOG_TYPE.adjustment;
  const isUse = log.type === 'use' || log.type === 'wastage';
  return (
    <motion.div variants={fV}
      className="flex items-start gap-3 p-4 rounded-2xl bg-white"
      style={{border:`1px solid ${C.creamBorder}`}}>

      {/* Icon */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
        style={{background:t.bg}}>{t.icon}</div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className="text-sm font-bold truncate" style={{color:C.ink}}>
            {log.product?.name || 'Unknown product'}
            <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{background:t.bg, color:t.color}}>{t.label}</span>
          </p>
          <p className="flex-shrink-0 text-xs font-bold" style={{color:isUse?C.purple:C.ok}}>
            {isUse?'−':'+'}
            {log.quantity} {log.product?.unit}
          </p>
        </div>

        {/* Context */}
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-[11px]" style={{color:C.inkFaint}}>
            🕐 {fmtDate(log.createdAt)}
          </p>
          {log.performedBy?.name && (
            <p className="text-[11px]" style={{color:C.inkFaint}}>
              👤 {log.performedBy.name}
            </p>
          )}
          {log.customerName && (
            <p className="text-[11px]" style={{color:C.inkFaint}}>
              💅 {log.customerName}
            </p>
          )}
          {log.serviceName && (
            <p className="text-[11px]" style={{color:C.inkFaint}}>
              ✂️ {log.serviceName}
            </p>
          )}
          {log.supplier && (
            <p className="text-[11px]" style={{color:C.inkFaint}}>
              🏭 {log.supplier}
              {log.invoiceNo ? ` · #${log.invoiceNo}` : ''}
            </p>
          )}
          {log.notes && (
            <p className="text-[11px] italic" style={{color:C.inkFaint}}>{log.notes}</p>
          )}
        </div>

        {/* Stock before → after */}
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{background:C.creamMid, color:C.inkMid}}>
            Stock: {log.stockBefore} → {log.stockAfter} {log.product?.unit}
          </span>
          {log.costPerUnit>0 && log.type==='refill' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{background:C.okPale, color:C.ok}}>
              ₹{log.costPerUnit}/unit · Total ₹{(log.costPerUnit*log.quantity).toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────
export default function StaffInventory() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [tab,        setTab]        = useState('products'); // 'products' | 'history'
  const [products,   setProducts]   = useState([]);
  const [logs,       setLogs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [histLoading,setHistLoading]= useState(false);
  const [search,     setSearch]     = useState('');
  const [histFilter, setHistFilter] = useState('all'); // all | use | refill | wastage
  const [useModal,   setUseModal]   = useState(null);
  const [refillModal,setRefillModal]= useState(null);
  const [toast,      setToast]      = useState(null);

  const showToast = (msg, ok=true) => setToast({msg,ok});

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/inventory', { params: { limit:100 } });
      setProducts(data.products || []);
    } catch(e) {}
    finally { setLoading(false); }
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const params = { limit:100 };
      if (histFilter !== 'all') params.type = histFilter;
      const { data } = await api.get('/inventory/history', { params });
      setLogs(data.logs || []);
    } catch(e) {}
    finally { setHistLoading(false); }
  }, [histFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { if (tab==='history') fetchHistory(); }, [tab, fetchHistory]);

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.brand?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <AnimatePresence>
        {toast && <Toast msg={toast.msg} ok={toast.ok} onDone={()=>setToast(null)}/>}
      </AnimatePresence>
      <AnimatePresence>
        {useModal && (
          <UseModal product={useModal} onClose={()=>{ setUseModal(null); fetchProducts(); fetchHistory(); }}
            onSuccess={(m,ok=true)=>{ showToast(m,ok); if(ok && tab==='history') fetchHistory(); }}/>
        )}
        {isAdmin && refillModal && (
          <RefillModal product={refillModal} onClose={()=>{ setRefillModal(null); fetchProducts(); fetchHistory(); }}
            onSuccess={(m,ok=true)=>{ showToast(m,ok); if(ok && tab==='history') fetchHistory(); }}/>
        )}
      </AnimatePresence>

      <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-charcoal">Products</h1>
            <p className="text-charcoal-muted text-sm mt-0.5">{products.length} items in inventory</p>
          </div>
          <button onClick={()=>{ fetchProducts(); if(tab==='history') fetchHistory(); }} disabled={loading}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gold/20 hover:bg-gold/5 disabled:opacity-40">
            <RefreshCw size={14} className={`text-charcoal ${loading?'animate-spin':''}`}/>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-2xl" style={{background:'#F0E8D8'}}>
          {[
            { key:'products', label:'Products', icon:<Package size={13}/> },
            { key:'history',  label:'History',  icon:<History size={13}/> },
          ].map(t => (
            <button key={t.key} onClick={()=>setTab(t.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{
                background: tab===t.key ? C.cream : 'transparent',
                color:      tab===t.key ? C.gold  : C.inkFaint,
                boxShadow:  tab===t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── PRODUCTS TAB ── */}
        {tab === 'products' && (
          <>
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:C.inkFaint}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-9 pr-4 py-3 rounded-2xl text-sm border outline-none"
                style={{background:'#fff', borderColor:C.creamBorder, color:C.ink}}/>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={22} className="animate-spin" style={{color:C.gold}}/>
              </div>
            ) : filtered.length===0 ? (
              <div className="text-center py-14 rounded-2xl bg-white border border-gold/10">
                <Package size={30} style={{color:C.creamBorder, margin:'0 auto 10px'}}/>
                <p className="font-semibold text-charcoal">No products found</p>
              </div>
            ) : (
              <motion.div variants={sV} initial="hidden" animate="show" className="space-y-2">
                {filtered.map(p => {
                  const isLow = p.quantity <= p.lowStockThreshold;
                  return (
                    <motion.div key={p._id} variants={fV}
                      className="rounded-2xl bg-white p-4"
                      style={{border:`1.5px solid ${isLow?'#FCA5A5':C.creamBorder}`}}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                          style={{background:C.goldPale}}>{CAT_ICON[p.category]||'📦'}</div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-bold truncate" style={{color:C.ink}}>{p.name}</p>
                            {isLow && (
                              <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{background:'#FEE2E2', color:'#B91C1C'}}>
                                <AlertTriangle size={8}/>Low
                              </span>
                            )}
                          </div>
                          <p className="text-xs mt-0.5" style={{color:C.inkFaint}}>
                            {p.brand && `${p.brand} · `}{p.category}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                              style={{
                                background: isLow?'#FEE2E2':C.goldPale,
                                color: isLow?'#B91C1C':C.gold,
                              }}>
                              {p.quantity} {p.unit}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <button onClick={()=>setUseModal(p)}
                            disabled={p.quantity<=0}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all hover:opacity-90 disabled:opacity-40"
                            style={{background:C.purplePale, color:C.purple, border:`1px solid #C4B5FD`}}>
                            <Scissors size={10}/>Use
                          </button>
                          {isAdmin && (
                            <button onClick={()=>setRefillModal(p)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all hover:opacity-90"
                              style={{background:C.okPale, color:C.ok, border:`1px solid #86EFAC`}}>
                              <RotateCcw size={10}/>Refill
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          <>
            {/* Filter pills */}
            <div className="flex gap-2 flex-wrap">
              {[
                { key:'all',     label:'All'      },
                { key:'use',     label:'🔧 Uses'   },
                { key:'refill',  label:'📦 Refills' },
                { key:'wastage', label:'🗑️ Wastage' },
              ].map(f => (
                <button key={f.key} onClick={()=>setHistFilter(f.key)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: histFilter===f.key ? C.gold : '#F0E8D8',
                    color:      histFilter===f.key ? '#fff'  : C.inkMid,
                  }}>
                  {f.label}
                </button>
              ))}
              <button onClick={fetchHistory} disabled={histLoading}
                className="ml-auto w-8 h-8 flex items-center justify-center rounded-xl disabled:opacity-40"
                style={{background:'#F0E8D8'}}>
                <RefreshCw size={12} className={histLoading?'animate-spin':''} style={{color:C.inkMid}}/>
              </button>
            </div>

            {histLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={22} className="animate-spin" style={{color:C.gold}}/>
              </div>
            ) : logs.length===0 ? (
              <div className="text-center py-14 rounded-2xl bg-white border border-gold/10">
                <History size={30} style={{color:C.creamBorder, margin:'0 auto 10px'}}/>
                <p className="font-semibold text-charcoal">No history yet</p>
                <p className="text-sm text-charcoal-muted mt-1">Use or refill a product to see logs here</p>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold" style={{color:C.inkFaint}}>{logs.length} records</p>
                <motion.div variants={sV} initial="hidden" animate="show" className="space-y-2">
                  {logs.map((log,i) => <HistoryRow key={log._id||i} log={log}/>)}
                </motion.div>
              </>
            )}
          </>
        )}
      </motion.div>
    </>
  );
}