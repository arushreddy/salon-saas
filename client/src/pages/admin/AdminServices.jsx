import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, Clock, Tag,
  ChevronDown, Upload, X, Check, Loader2, RefreshCw, Download,
  Sparkles, Grid3X3, List, Filter, ImageIcon, IndianRupee,
  TrendingUp, Package, Eye, EyeOff, Star, MoreVertical, Copy,
  ChevronRight, AlertTriangle, Scissors, Flame,
} from 'lucide-react';
import api from '@/services/api';

/* ── Design tokens ─────────────────────────────────────────────────────────── */
const C = {
  bg: '#F4EDE0', card: '#FFFDF7', cardAlt: '#FDF8EE',
  gold: '#B8860B', goldLight: '#D4A017', goldPale: '#FFF8E7', goldDeep: '#8B6914',
  ink: '#1A1208', inkMid: '#5C4A2A', inkLight: '#9C8660', inkGhost: '#C8B090',
  border: '#DFD0A8', borderLight: '#EDE5C8',
  green: '#065F46', greenPale: '#ECFDF5', greenBorder: '#A7F3D0',
  red: '#991B1B', redPale: '#FEF2F2', redBorder: '#FECACA',
  amber: '#92400E', amberPale: '#FFFBEB', amberBorder: '#FDE68A',
  blue: '#1E40AF', bluePale: '#EFF6FF', blueBorder: '#BFDBFE',
  purple: '#6D28D9', purplePale: '#F5F3FF', purpleBorder: '#DDD6FE',
};

const fade = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.22 } } };
const stag = (d = 0.04) => ({ hidden: {}, show: { transition: { staggerChildren: d } } });

/* ── Category config ───────────────────────────────────────────────────────── */
const CATS = {
  hair:     { label: 'Hair',          emoji: '💇', color: '#8B5CF6', pale: '#F5F3FF', border: '#DDD6FE' },
  skin:     { label: 'Skin Care',     emoji: '✨', color: '#0891B2', pale: '#ECFEFF', border: '#A5F3FC' },
  nails:    { label: 'Nails',         emoji: '💅', color: '#DB2777', pale: '#FDF2F8', border: '#FBCFE8' },
  makeup:   { label: 'Makeup',        emoji: '💄', color: '#DC2626', pale: '#FEF2F2', border: '#FECACA' },
  spa:      { label: 'Spa',           emoji: '🧖', color: '#059669', pale: '#ECFDF5', border: '#A7F3D0' },
  bridal:   { label: 'Bridal',        emoji: '👰', color: '#B8860B', pale: '#FFF8E7', border: '#FDE68A' },
  grooming: { label: 'Grooming',      emoji: '🧔', color: '#1D4ED8', pale: '#EFF6FF', border: '#BFDBFE' },
  combo:    { label: 'Combo',         emoji: '🎁', color: '#7C3AED', pale: '#F5F3FF', border: '#DDD6FE' },
};

const GENDER_CFG = {
  unisex: { label: 'Unisex', color: C.inkMid, bg: '#F3F4F6', border: '#E5E7EB' },
  female: { label: 'Female', color: '#BE185D', bg: '#FDF2F8', border: '#FBCFE8' },
  male:   { label: 'Male',   color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
};

const fmtRs = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const fmtDur = m => m >= 60 ? `${Math.floor(m/60)}h${m%60?` ${m%60}m`:''}` : `${m}m`;

/* ── ServiceCard ───────────────────────────────────────────────────────────── */
function ServiceCard({ svc, onEdit, onDelete, onToggle, onDuplicate, selected, onSelect, viewMode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const cat = CATS[svc.category] || CATS.hair;
  const gender = GENDER_CFG[svc.gender] || GENDER_CFG.unisex;
  const discount = svc.discountPrice && svc.discountPrice < svc.price;
  const savings = discount ? Math.round(((svc.price - svc.discountPrice) / svc.price) * 100) : 0;
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleToggle = async (e) => {
    e.stopPropagation();
    setToggling(true);
    await onToggle(svc._id, !svc.isActive);
    setToggling(false);
  };

  if (viewMode === 'table') {
    return (
      <motion.tr variants={fade}
        style={{ borderBottom: `1px solid ${C.border}`, background: selected ? C.goldPale : C.card, transition: 'background 0.15s' }}
        onMouseEnter={e => { if (!selected) e.currentTarget.style.background = C.cardAlt; }}
        onMouseLeave={e => { if (!selected) e.currentTarget.style.background = C.card; }}>
        <td style={{ padding: '10px 14px', width: 40 }}>
          <input type="checkbox" checked={selected} onChange={() => onSelect(svc._id)}
            style={{ width: 14, height: 14, accentColor: C.gold, cursor: 'pointer' }} />
        </td>
        <td style={{ padding: '10px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: cat.pale, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {svc.image ? <img src={svc.image} alt={svc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 18 }}>{cat.emoji}</span>}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{svc.name}</p>
              {svc.description && <p style={{ fontSize: 11, color: C.inkLight, marginTop: 1, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{svc.description}</p>}
            </div>
          </div>
        </td>
        <td style={{ padding: '10px 14px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 100, background: cat.pale, color: cat.color, border: `1px solid ${cat.border}` }}>
            {cat.emoji} {cat.label}
          </span>
        </td>
        <td style={{ padding: '10px 14px' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: discount ? C.green : C.ink, fontFamily: "'Playfair Display',serif" }}>{fmtRs(discount ? svc.discountPrice : svc.price)}</p>
            {discount && <p style={{ fontSize: 10, color: C.inkLight, textDecoration: 'line-through' }}>{fmtRs(svc.price)}</p>}
          </div>
        </td>
        <td style={{ padding: '10px 14px' }}>
          <span style={{ fontSize: 12, color: C.inkMid, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} style={{ color: C.gold }} />{fmtDur(svc.duration)}</span>
        </td>
        <td style={{ padding: '10px 14px' }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: gender.bg, color: gender.color, border: `1px solid ${gender.border}` }}>{gender.label}</span>
        </td>
        <td style={{ padding: '10px 14px' }}>
          <button onClick={handleToggle} disabled={toggling} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, border: `1px solid ${svc.isActive ? C.greenBorder : C.border}`, background: svc.isActive ? C.greenPale : C.cardAlt, cursor: 'pointer', transition: 'all 0.15s' }}>
            {toggling ? <Loader2 size={11} style={{ color: C.inkLight, animation: 'spin 1s linear infinite' }} /> : <span style={{ width: 6, height: 6, borderRadius: '50%', background: svc.isActive ? '#10B981' : '#D1D5DB' }} />}
            <span style={{ fontSize: 11, fontWeight: 700, color: svc.isActive ? C.green : C.inkLight }}>{svc.isActive ? 'Active' : 'Off'}</span>
          </button>
        </td>
        <td style={{ padding: '10px 14px' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => onEdit(svc)} title="Edit" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Edit2 size={11} style={{ color: C.inkMid }} />
            </button>
            <button onClick={() => onDuplicate(svc)} title="Duplicate" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Copy size={11} style={{ color: C.inkMid }} />
            </button>
            <button onClick={() => onDelete(svc)} title="Delete" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.redBorder}`, background: C.redPale, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={11} style={{ color: C.red }} />
            </button>
          </div>
        </td>
      </motion.tr>
    );
  }

  return (
    <motion.div variants={fade} whileHover={{ y: -4, boxShadow: `0 12px 40px ${C.gold}18` }}
      style={{ background: selected ? C.goldPale : C.card, border: `1.5px solid ${selected ? C.gold : C.border}`, borderRadius: 20, overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s', opacity: svc.isActive ? 1 : 0.65, position: 'relative' }}>

      {/* Selection checkbox */}
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 3 }} onClick={e => { e.stopPropagation(); onSelect(svc._id); }}>
        <div style={{ width: 20, height: 20, borderRadius: 6, background: selected ? C.gold : 'rgba(255,255,255,0.9)', border: `1.5px solid ${selected ? C.goldDeep : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          {selected && <Check size={11} style={{ color: '#fff' }} />}
        </div>
      </div>

      {/* 3-dot menu */}
      <div ref={menuRef} style={{ position: 'absolute', top: 10, right: 10, zIndex: 3 }}>
        <button onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.9)', border: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <MoreVertical size={12} style={{ color: C.inkMid }} />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
              style={{ position: 'absolute', right: 0, top: 34, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, boxShadow: '0 16px 48px rgba(26,18,8,0.18)', padding: 6, minWidth: 150, zIndex: 10 }}>
              {[
                { icon: Edit2, label: 'Edit', action: () => { onEdit(svc); setMenuOpen(false); }, color: C.inkMid },
                { icon: Copy, label: 'Duplicate', action: () => { onDuplicate(svc); setMenuOpen(false); }, color: C.inkMid },
                { icon: svc.isActive ? EyeOff : Eye, label: svc.isActive ? 'Deactivate' : 'Activate', action: async () => { setMenuOpen(false); await onToggle(svc._id, !svc.isActive); }, color: svc.isActive ? C.amber : C.green },
                { icon: Trash2, label: 'Delete', action: () => { onDelete(svc); setMenuOpen(false); }, color: C.red },
              ].map(({ icon: Icon, label, action, color }) => (
                <button key={label} onClick={e => { e.stopPropagation(); action(); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 9, background: 'none', border: 'none', cursor: 'pointer', color, fontSize: 12, fontWeight: 600, textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = C.cardAlt}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <Icon size={12} /> {label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Image */}
      <div style={{ height: 140, background: `linear-gradient(135deg, ${cat.pale}, ${cat.border}20)`, position: 'relative', overflow: 'hidden' }} onClick={() => onEdit(svc)}>
        {svc.image ? (
          <img src={svc.image} alt={svc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 42, lineHeight: 1 }}>{cat.emoji}</span>
          </div>
        )}
        {/* Category badge overlay */}
        <div style={{ position: 'absolute', bottom: 8, left: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 100, background: 'rgba(255,255,255,0.95)', color: cat.color, border: `1px solid ${cat.border}`, backdropFilter: 'blur(4px)' }}>
            {cat.emoji} {cat.label}
          </span>
        </div>
        {/* Discount badge */}
        {discount && (
          <div style={{ position: 'absolute', top: 38, right: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 100, background: C.green, color: '#fff' }}>
              {savings}% OFF
            </span>
          </div>
        )}
        {/* Inactive overlay */}
        {!svc.isActive && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 100, background: 'rgba(0,0,0,0.6)', color: '#fff', letterSpacing: '0.08em' }}>INACTIVE</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px' }} onClick={() => onEdit(svc)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: C.ink, fontFamily: "'Playfair Display',serif", lineHeight: 1.3, flex: 1 }}>{svc.name}</p>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100, background: gender.bg, color: gender.color, border: `1px solid ${gender.border}`, flexShrink: 0 }}>{gender.label}</span>
        </div>
        {svc.description && (
          <p style={{ fontSize: 11, color: C.inkLight, marginBottom: 10, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{svc.description}</p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: discount ? C.green : C.gold, fontFamily: "'Playfair Display',serif", lineHeight: 1 }}>
                {fmtRs(discount ? svc.discountPrice : svc.price)}
              </p>
              {discount && <p style={{ fontSize: 11, color: C.inkLight, textDecoration: 'line-through' }}>{fmtRs(svc.price)}</p>}
            </div>
            <p style={{ fontSize: 10, color: C.inkLight, display: 'flex', alignItems: 'center', gap: 3, marginTop: 3 }}>
              <Clock size={9} style={{ color: C.gold }} />{fmtDur(svc.duration)}
            </p>
          </div>
          {/* Toggle */}
          <button onClick={handleToggle} disabled={toggling} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20, border: `1px solid ${svc.isActive ? C.greenBorder : C.border}`, background: svc.isActive ? C.greenPale : C.cardAlt, cursor: 'pointer', transition: 'all 0.2s' }}>
            {toggling ? <Loader2 size={11} style={{ color: C.inkLight, animation: 'spin 1s linear infinite' }} /> : (svc.isActive ? <ToggleRight size={14} style={{ color: C.green }} /> : <ToggleLeft size={14} style={{ color: C.inkLight }} />)}
            <span style={{ fontSize: 10, fontWeight: 700, color: svc.isActive ? C.green : C.inkLight }}>{svc.isActive ? 'Active' : 'Off'}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Service Form Modal ─────────────────────────────────────────────────────── */
function ServiceModal({ service, onClose, onSave }) {
  const isEdit = !!service?._id;
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', description: '', category: 'hair', price: '',
    discountPrice: '', duration: '', gender: 'unisex', image: '', isActive: true,
  });

  useEffect(() => {
    if (service) {
      setForm({
        name: service.name || '', description: service.description || '',
        category: service.category || 'hair', price: service.price || '',
        discountPrice: service.discountPrice || '', duration: service.duration || '',
        gender: service.gender || 'unisex', image: service.image || '',
        isActive: service.isActive !== false,
      });
    } else {
      setForm({ name: '', description: '', category: 'hair', price: '', discountPrice: '', duration: '', gender: 'unisex', image: '', isActive: true });
    }
    setError('');
  }, [service]);

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setError(''); };

  const processImg = (file) => {
    if (!file?.type?.startsWith('image/')) { setError('Upload a valid image file'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Image must be under 2MB'); return; }
    const r = new FileReader();
    r.onload = e => set('image', e.target.result);
    r.readAsDataURL(file);
  };

  const validate = () => {
    if (!form.name.trim()) return 'Service name is required';
    if (!form.price || Number(form.price) <= 0) return 'Valid price is required';
    if (!form.duration || Number(form.duration) <= 0) return 'Valid duration is required';
    if (form.discountPrice && Number(form.discountPrice) >= Number(form.price)) return 'Discount must be less than price';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        price: Number(form.price),
        discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
        duration: Number(form.duration),
      });
      onClose();
    } catch (e) { setError(e.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const cat = CATS[form.category] || CATS.hair;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(26,18,8,0.72)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <motion.div initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 600, background: C.card, borderRadius: 28, boxShadow: '0 40px 100px rgba(26,18,8,0.5)', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 32px)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '22px 28px', borderBottom: `1px solid ${C.border}`, background: `linear-gradient(135deg,${C.goldPale},${C.card})`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg,${C.gold},${C.goldLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              {cat.emoji}
            </div>
            <div>
              <p style={{ fontSize: 17, fontWeight: 800, color: C.ink, fontFamily: "'Playfair Display',serif" }}>
                {isEdit ? 'Edit Service' : 'Add New Service'}
              </p>
              <p style={{ fontSize: 11, color: C.inkLight, marginTop: 2 }}>
                {isEdit ? `Editing: ${service.name}` : 'Fill in the details to create a new service'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 11, border: `1px solid ${C.border}`, background: C.card, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} style={{ color: C.inkMid }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: C.redPale, border: `1px solid ${C.redBorder}`, marginBottom: 18 }}>
              <AlertTriangle size={13} style={{ color: C.red, flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>{error}</p>
            </motion.div>
          )}

          {/* Image upload */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.inkLight, marginBottom: 10 }}>Service Image</p>
            {form.image ? (
              <div style={{ position: 'relative', height: 160, borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                <img src={form.image} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,18,8,0)', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,18,8,0.4)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(26,18,8,0)'}>
                  <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', gap: 6 }}>
                    <button type="button" onClick={() => fileRef.current?.click()}
                      style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.95)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: C.inkMid, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Upload size={11} /> Change
                    </button>
                    <button type="button" onClick={() => set('image', '')}
                      style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(153,27,27,0.85)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Trash2 size={11} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); processImg(e.dataTransfer.files[0]); }}
                onClick={() => fileRef.current?.click()}
                style={{ height: 120, borderRadius: 16, border: `2px dashed ${dragging ? C.gold : C.border}`, background: dragging ? C.goldPale : C.cardAlt, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.15s' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: C.goldPale, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImageIcon size={16} style={{ color: C.gold }} />
                </div>
                <p style={{ fontSize: 12, fontWeight: 600, color: C.inkMid }}>{dragging ? 'Drop here' : 'Click or drag image'}</p>
                <p style={{ fontSize: 10, color: C.inkLight }}>JPG, PNG, WEBP · Max 2MB</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={e => processImg(e.target.files[0])} style={{ display: 'none' }} />
          </div>

          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.inkLight, marginBottom: 7 }}>Service Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Premium Hair Spa"
              style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.card, fontSize: 13, fontWeight: 600, color: C.ink, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor = C.gold} onBlur={e => e.target.style.borderColor = C.border} />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.inkLight, marginBottom: 7 }}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description of this service…" rows={3}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.card, fontSize: 12, color: C.ink, outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.6, fontFamily: "'DM Sans',sans-serif", transition: 'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor = C.gold} onBlur={e => e.target.style.borderColor = C.border} />
          </div>

          {/* Category + Gender */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.inkLight, marginBottom: 7 }}>Category *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                {Object.entries(CATS).map(([k, cfg]) => (
                  <button key={k} type="button" onClick={() => set('category', k)}
                    style={{ padding: '7px 8px', borderRadius: 10, border: `1.5px solid ${form.category === k ? cfg.color : C.border}`, background: form.category === k ? cfg.pale : C.card, cursor: 'pointer', fontSize: 10, fontWeight: 700, color: form.category === k ? cfg.color : C.inkMid, textAlign: 'center', transition: 'all 0.15s' }}>
                    {cfg.emoji} {cfg.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.inkLight, marginBottom: 7 }}>Gender</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(GENDER_CFG).map(([k, cfg]) => (
                  <button key={k} type="button" onClick={() => set('gender', k)}
                    style={{ padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${form.gender === k ? cfg.color : C.border}`, background: form.gender === k ? cfg.bg : C.card, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: form.gender === k ? cfg.color : C.inkMid, textAlign: 'left', transition: 'all 0.15s' }}>
                    {cfg.label}
                  </button>
                ))}
              </div>

              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.inkLight, marginTop: 14, marginBottom: 7 }}>Status</label>
              <button type="button" onClick={() => set('isActive', !form.isActive)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${form.isActive ? C.greenBorder : C.border}`, background: form.isActive ? C.greenPale : C.cardAlt, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: form.isActive ? C.green : C.inkMid, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}>
                {form.isActive ? <ToggleRight size={16} style={{ color: C.green }} /> : <ToggleLeft size={16} style={{ color: C.inkLight }} />}
                {form.isActive ? 'Active — visible to customers' : 'Inactive — hidden'}
              </button>
            </div>
          </div>

          {/* Price, Discount, Duration */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 4 }}>
            {[
              { key: 'price', label: 'Price (₹) *', placeholder: '500' },
              { key: 'discountPrice', label: 'Discount (₹)', placeholder: 'Optional' },
              { key: 'duration', label: 'Duration (min) *', placeholder: '45' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.inkLight, marginBottom: 7 }}>{label}</label>
                <input type="number" value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} min="0"
                  style={{ width: '100%', padding: '11px 12px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.card, fontSize: 14, fontWeight: 700, color: C.ink, outline: 'none', boxSizing: 'border-box', fontFamily: "'Playfair Display',serif", transition: 'border-color 0.15s' }}
                  onFocus={e => e.target.style.borderColor = C.gold} onBlur={e => e.target.style.borderColor = C.border} />
              </div>
            ))}
          </div>

          {/* Price preview */}
          {form.price > 0 && form.discountPrice > 0 && Number(form.discountPrice) < Number(form.price) && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              style={{ marginTop: 10, padding: '10px 14px', borderRadius: 12, background: C.greenPale, border: `1px solid ${C.greenBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>Customer saves {Math.round(((form.price - form.discountPrice) / form.price) * 100)}%</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: C.green, fontFamily: "'Playfair Display',serif" }}>
                {fmtRs(form.discountPrice)} <span style={{ fontSize: 11, textDecoration: 'line-through', opacity: 0.6 }}>{fmtRs(form.price)}</span>
              </p>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: `1px solid ${C.border}`, background: C.cardAlt, flexShrink: 0, display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 14, border: `1px solid ${C.border}`, background: C.card, color: C.inkMid, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 2, padding: '12px', borderRadius: 14, border: 'none', background: saving ? C.border : `linear-gradient(135deg,${C.gold},${C.goldLight})`, color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
            {saving ? 'Saving…' : isEdit ? 'Update Service' : 'Create Service'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Delete Confirm Modal ───────────────────────────────────────────────────── */
function DeleteModal({ service, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const handle = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(26,18,8,0.72)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }} onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 400, background: C.card, borderRadius: 24, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 32px 80px rgba(26,18,8,0.45)' }}>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: C.redPale, border: `1px solid ${C.redBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Trash2 size={22} style={{ color: C.red }} />
          </div>
          <p style={{ fontSize: 17, fontWeight: 800, color: C.ink, fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>Delete Service?</p>
          <p style={{ fontSize: 13, color: C.inkLight, lineHeight: 1.6, marginBottom: 4 }}>
            This will permanently delete <strong style={{ color: C.ink }}>{service?.name}</strong>.
          </p>
          <p style={{ fontSize: 11, color: C.red, fontWeight: 600, marginBottom: 22 }}>This action cannot be undone.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, color: C.inkMid, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handle} disabled={deleting}
              style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg,${C.red},#DC2626)`, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {deleting ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />}
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────────── */
export default function AdminServices() {
  const [services, setServices]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy]       = useState('name');
  const [viewMode, setViewMode]   = useState('grid');
  const [editSvc, setEditSvc]     = useState(null);   // null=closed, {}=new, {...}=edit
  const [deleteSvc, setDeleteSvc] = useState(null);
  const [selected, setSelected]   = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast]         = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const fetchServices = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/services', { params: { showAll: true, limit: 200 } });
      setServices(data.services || []);
    } catch { showToast('Failed to load services', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  /* ── Computed ── */
  const filtered = useMemo(() => {
    let r = services;
    if (catFilter) r = r.filter(s => s.category === catFilter);
    if (genderFilter) r = r.filter(s => s.gender === genderFilter || s.gender === 'unisex');
    if (statusFilter === 'active') r = r.filter(s => s.isActive);
    if (statusFilter === 'inactive') r = r.filter(s => !s.isActive);
    if (search) { const q = search.toLowerCase(); r = r.filter(s => s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)); }
    const sorted = [...r];
    if (sortBy === 'price_low') sorted.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
    if (sortBy === 'price_high') sorted.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
    if (sortBy === 'popular') sorted.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    if (sortBy === 'newest') sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (sortBy === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [services, catFilter, genderFilter, statusFilter, search, sortBy]);

  const catCounts = useMemo(() => {
    const m = {};
    services.forEach(s => { m[s.category] = (m[s.category] || 0) + 1; });
    return m;
  }, [services]);

  const stats = useMemo(() => ({
    total: services.length,
    active: services.filter(s => s.isActive).length,
    withDiscount: services.filter(s => s.discountPrice && s.discountPrice < s.price).length,
    avgPrice: services.length ? Math.round(services.reduce((t, s) => t + (s.discountPrice || s.price), 0) / services.length) : 0,
    categories: new Set(services.map(s => s.category)).size,
  }), [services]);

  /* ── CRUD ── */
  const handleSave = async (formData) => {
    if (editSvc?._id) {
      const { data } = await api.put(`/services/${editSvc._id}`, formData);
      setServices(prev => prev.map(s => s._id === editSvc._id ? data.service : s));
      showToast('Service updated!');
    } else {
      const { data } = await api.post('/services', formData);
      setServices(prev => [data.service, ...prev]);
      showToast('Service created!');
    }
  };

  const handleToggle = async (id, isActive) => {
    try {
      const { data } = await api.patch(`/services/${id}`, { isActive });
      setServices(prev => prev.map(s => s._id === id ? data.service : s));
      showToast(isActive ? 'Service activated' : 'Service deactivated');
    } catch { showToast('Failed to update', 'error'); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/services/${deleteSvc._id}`);
      setServices(prev => prev.filter(s => s._id !== deleteSvc._id));
      setSelected(prev => { const n = new Set(prev); n.delete(deleteSvc._id); return n; });
      setDeleteSvc(null);
      showToast('Service deleted');
    } catch { showToast('Failed to delete', 'error'); }
  };

  const handleDuplicate = async (svc) => {
    try {
      const { _id, createdAt, updatedAt, __v, ...rest } = svc;
      const { data } = await api.post('/services', { ...rest, name: `${svc.name} (Copy)`, isActive: false });
      setServices(prev => [data.service, ...prev]);
      showToast('Service duplicated!');
    } catch { showToast('Failed to duplicate', 'error'); }
  };

  const handleBulkToggle = async (isActive) => {
    await Promise.all([...selected].map(id => api.patch(`/services/${id}`, { isActive })));
    setServices(prev => prev.map(s => selected.has(s._id) ? { ...s, isActive } : s));
    showToast(`${selected.size} services ${isActive ? 'activated' : 'deactivated'}`);
    setSelected(new Set());
  };

  const handleBulkDelete = async () => {
    await Promise.all([...selected].map(id => api.delete(`/services/${id}`)));
    setServices(prev => prev.filter(s => !selected.has(s._id)));
    showToast(`${selected.size} services deleted`);
    setSelected(new Set());
  };

  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(new Set(filtered.map(s => s._id)));
  const clearSelect = () => setSelected(new Set());

  const exportCSV = () => {
    const rows = [['Name', 'Category', 'Gender', 'Price', 'Discount Price', 'Duration (min)', 'Status', 'Popularity']];
    services.forEach(s => rows.push([`"${s.name}"`, s.category, s.gender, s.price, s.discountPrice || '', s.duration, s.isActive ? 'Active' : 'Inactive', s.popularity || 0]));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' }));
    a.download = 'services.csv'; a.click();
  };

  return (
    <motion.div variants={stag()} initial="hidden" animate="show"
      style={{ fontFamily: "'DM Sans',sans-serif", maxWidth: 1200, margin: '0 auto', paddingBottom: 48 }}>

      {/* ── Hero Header ── */}
      <motion.div variants={fade} style={{ borderRadius: 24, padding: '26px 30px', marginBottom: 22, background: 'linear-gradient(135deg,#1c1408,#2d2010,#1a0e06)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'repeating-linear-gradient(45deg,#B8860B 0,#B8860B 1px,transparent 0,transparent 50%)', backgroundSize: '14px 14px' }} />
        <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle,${C.gold}18 0%,transparent 70%)` }} />
        <div style={{ position: 'absolute', bottom: -30, left: 60, width: 140, height: 140, borderRadius: '50%', background: `radial-gradient(circle,#7C3AED10 0%,transparent 70%)` }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Scissors size={11} style={{ color: '#F0D878' }} />
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#F0D878' }}>Service Management</span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', fontFamily: "'Playfair Display',serif", margin: '0 0 6px' }}>Services & Pricing</h1>
            <p style={{ fontSize: 12, color: '#7a6040' }}>Manage your menu · {stats.active} active · {stats.categories} categories</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {[
              { l: 'Total', v: stats.total, c: '#F0D878' },
              { l: 'Active', v: stats.active, c: '#34D399' },
              { l: 'Discounted', v: stats.withDiscount, c: '#A78BFA' },
              { l: 'Avg Price', v: fmtRs(stats.avgPrice), c: '#F59E0B' },
            ].map(p => (
              <div key={p.l} style={{ textAlign: 'center', padding: '9px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: p.c, lineHeight: 1, fontFamily: "'Playfair Display',serif" }}>{p.v}</p>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{p.l}</p>
              </div>
            ))}
            <button onClick={() => setEditSvc({})}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 20px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg,${C.gold},${C.goldLight})`, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 18px ${C.gold}50` }}>
              <Plus size={15} /> Add Service
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Category Quick Tabs ── */}
      <motion.div variants={fade} style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setCatFilter('')}
          style={{ padding: '7px 16px', borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${!catFilter ? C.gold : C.border}`, background: !catFilter ? C.gold : C.card, color: !catFilter ? '#fff' : C.inkMid, transition: 'all 0.15s' }}>
          All ({services.length})
        </button>
        {Object.entries(CATS).map(([k, cfg]) => {
          const cnt = catCounts[k] || 0;
          const active = catFilter === k;
          return (
            <button key={k} onClick={() => setCatFilter(catFilter === k ? '' : k)}
              style={{ padding: '7px 14px', borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${active ? cfg.color : C.border}`, background: active ? cfg.pale : C.card, color: active ? cfg.color : C.inkMid, transition: 'all 0.15s' }}>
              {cfg.emoji} {cfg.label} {cnt > 0 && <span style={{ opacity: 0.6 }}>({cnt})</span>}
            </button>
          );
        })}
      </motion.div>

      {/* ── Toolbar ── */}
      <motion.div variants={fade} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.inkLight }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search services…"
            style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, fontSize: 12, color: C.ink, outline: 'none', boxSizing: 'border-box' }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.inkLight }}><X size={12} /></button>}
        </div>

        {/* Sort */}
        <div style={{ position: 'relative' }}>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ padding: '9px 32px 9px 12px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, fontSize: 11, fontWeight: 700, color: C.inkMid, outline: 'none', cursor: 'pointer', appearance: 'none' }}>
            <option value="name">A–Z Name</option>
            <option value="price_low">Price: Low–High</option>
            <option value="price_high">Price: High–Low</option>
            <option value="popular">Most Popular</option>
            <option value="newest">Newest First</option>
          </select>
          <ChevronDown size={11} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: C.inkLight, pointerEvents: 'none' }} />
        </div>

        {/* Filter toggle */}
        <button onClick={() => setShowFilters(!showFilters)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 12, border: `1px solid ${showFilters ? C.gold : C.border}`, background: showFilters ? C.goldPale : C.card, color: showFilters ? C.goldDeep : C.inkMid, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
          <Filter size={12} /> Filters {(genderFilter || statusFilter) ? '●' : ''}
        </button>

        {/* View toggle */}
        <div style={{ display: 'flex', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          {[['grid', <Grid3X3 size={13} />], ['table', <List size={13} />]].map(([v, icon]) => (
            <button key={v} onClick={() => setViewMode(v)}
              style={{ padding: '9px 12px', background: viewMode === v ? C.gold : C.card, border: 'none', cursor: 'pointer', color: viewMode === v ? '#fff' : C.inkMid, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {icon}
            </button>
          ))}
        </div>

        <button onClick={() => fetchServices()} style={{ width: 36, height: 36, borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw size={13} style={{ color: C.inkMid }} className={loading ? 'animate-spin' : ''} />
        </button>

        <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, color: C.inkMid, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
          <Download size={12} /> Export
        </button>
      </motion.div>

      {/* ── Extended Filters ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 10, padding: '14px 16px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.inkLight }}>Gender:</span>
              {[['', 'All'], ['female', '♀ Female'], ['male', '♂ Male'], ['unisex', '⚥ Unisex']].map(([v, l]) => (
                <button key={v} onClick={() => setGenderFilter(v)}
                  style={{ padding: '5px 12px', borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${genderFilter === v ? C.gold : C.border}`, background: genderFilter === v ? C.goldPale : 'transparent', color: genderFilter === v ? C.goldDeep : C.inkMid }}>
                  {l}
                </button>
              ))}
              <div style={{ width: 1, height: 20, background: C.border, margin: '0 4px' }} />
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.inkLight }}>Status:</span>
              {[['', 'All'], ['active', '● Active'], ['inactive', '○ Inactive']].map(([v, l]) => (
                <button key={v} onClick={() => setStatusFilter(v)}
                  style={{ padding: '5px 12px', borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${statusFilter === v ? C.gold : C.border}`, background: statusFilter === v ? C.goldPale : 'transparent', color: statusFilter === v ? C.goldDeep : C.inkMid }}>
                  {l}
                </button>
              ))}
              {(genderFilter || statusFilter) && (
                <button onClick={() => { setGenderFilter(''); setStatusFilter(''); }}
                  style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${C.redBorder}`, background: C.redPale, color: C.red }}>
                  Clear filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bulk action bar ── */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', background: C.goldPale, border: `1.5px solid ${C.gold}`, borderRadius: 14, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.goldDeep }}>{selected.size} selected</span>
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
              <button onClick={() => handleBulkToggle(true)} style={{ padding: '6px 14px', borderRadius: 10, border: `1px solid ${C.greenBorder}`, background: C.greenPale, color: C.green, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Activate All</button>
              <button onClick={() => handleBulkToggle(false)} style={{ padding: '6px 14px', borderRadius: 10, border: `1px solid ${C.amberBorder}`, background: C.amberPale, color: C.amber, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Deactivate All</button>
              <button onClick={handleBulkDelete} style={{ padding: '6px 14px', borderRadius: 10, border: `1px solid ${C.redBorder}`, background: C.redPale, color: C.red, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Delete All</button>
              <button onClick={clearSelect} style={{ padding: '6px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, color: C.inkMid, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Clear</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Result count + select all ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ fontSize: 12, color: C.inkLight, fontWeight: 500 }}>
          {filtered.length} service{filtered.length !== 1 ? 's' : ''}{catFilter || search ? ' found' : ''}
        </p>
        {filtered.length > 0 && (
          <button onClick={selected.size === filtered.length ? clearSelect : selectAll}
            style={{ fontSize: 11, fontWeight: 700, color: C.goldDeep, background: 'none', border: 'none', cursor: 'pointer' }}>
            {selected.size === filtered.length ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 18, background: `linear-gradient(135deg,${C.gold},${C.goldLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={22} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} />
          </div>
          <p style={{ fontSize: 13, color: C.inkLight }}>Loading services…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '80px 40px', textAlign: 'center', background: C.card, borderRadius: 20, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>✂️</div>
          <p style={{ fontSize: 17, fontWeight: 800, color: C.ink, fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>No services found</p>
          <p style={{ fontSize: 13, color: C.inkLight, marginBottom: 22 }}>
            {search || catFilter || genderFilter || statusFilter ? 'Try adjusting your filters.' : 'Add your first service to get started.'}
          </p>
          {(!search && !catFilter && !genderFilter && !statusFilter) && (
            <button onClick={() => setEditSvc({})}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '12px 22px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg,${C.gold},${C.goldLight})`, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={14} /> Add First Service
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        <div style={{ background: C.card, borderRadius: 20, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: `linear-gradient(135deg,${C.goldPale},${C.card})`, borderBottom: `1px solid ${C.border}` }}>
                {['', 'Service', 'Category', 'Price', 'Duration', 'Gender', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.inkLight, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <motion.tbody variants={stag(0.03)} initial="hidden" animate="show">
              {filtered.map(svc => (
                <ServiceCard key={svc._id} svc={svc} viewMode="table" selected={selected.has(svc._id)} onSelect={toggleSelect}
                  onEdit={setEditSvc} onDelete={setDeleteSvc} onToggle={handleToggle} onDuplicate={handleDuplicate} />
              ))}
            </motion.tbody>
          </table>
        </div>
      ) : (
        <motion.div variants={stag(0.05)} initial="hidden" animate="show"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 16 }}>
          {filtered.map(svc => (
            <ServiceCard key={svc._id} svc={svc} viewMode="grid" selected={selected.has(svc._id)} onSelect={toggleSelect}
              onEdit={setEditSvc} onDelete={setDeleteSvc} onToggle={handleToggle} onDuplicate={handleDuplicate} />
          ))}
        </motion.div>
      )}

      {/* ── Modals ── */}
      <AnimatePresence>
        {editSvc !== null && (
          <ServiceModal service={editSvc?._id ? editSvc : null} onClose={() => setEditSvc(null)} onSave={handleSave} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteSvc && (
          <DeleteModal service={deleteSvc} onClose={() => setDeleteSvc(null)} onConfirm={handleDelete} />
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.9 }}
            style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 999, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 22px', borderRadius: 14, background: toast.type === 'error' ? '#1a0808' : '#0d1a0d', border: `1px solid ${toast.type === 'error' ? C.redBorder : C.greenBorder}`, boxShadow: '0 16px 48px rgba(0,0,0,0.4)', minWidth: 200 }}>
            {toast.type === 'error' ? <AlertTriangle size={14} style={{ color: '#FCA5A5' }} /> : <Check size={14} style={{ color: '#34D399' }} />}
            <span style={{ fontSize: 13, fontWeight: 700, color: toast.type === 'error' ? '#FCA5A5' : '#34D399' }}>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.animate-spin{animation:spin 1s linear infinite}`}</style>
    </motion.div>
  );
}