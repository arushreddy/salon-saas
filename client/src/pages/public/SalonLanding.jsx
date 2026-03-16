// src/pages/public/SalonLanding.jsx
// Route: /book/:slug
// Fully customizable public salon page
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  MapPin, Phone, Mail, Clock, ChevronRight,
  Scissors, Sparkles, Star, Calendar, ArrowRight,
  Instagram, Facebook, ExternalLink,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/public`
  : 'http://localhost:5000/api/public';

const publicApi = (slug) => axios.create({
  baseURL: API,
  headers: { 'X-Salon-Slug': slug },
});

export default function SalonLanding() {
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const api        = publicApi(slug);

  const [salon,    setSalon]    = useState(null);
  const [services, setServices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const load = async () => {
      try {
        const [salonRes, servicesRes] = await Promise.all([
          api.get('/salon-info'),
          api.get('/services').catch(() => ({ data: { services: [] } })),
        ]);
        const s = salonRes.data.salon;
        setSalon(s);
        setServices(servicesRes.data.services || []);

        // Update page title + meta
        if (s.metaTitle) document.title = s.metaTitle;
        else document.title = `${s.name} — Book Online`;
        const meta = document.querySelector('meta[name="description"]');
        if (meta && s.metaDescription) meta.setAttribute('content', s.metaDescription);
      } catch (e) {
        setError(e.response?.data?.message || 'Salon not found');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FDFAF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '3px solid #B8860B', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ color: '#9C8660', fontSize: 14 }}>Loading…</div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#FDFAF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✂️</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1A1208', marginBottom: 8 }}>Salon not found</div>
        <div style={{ color: '#9C8660', fontSize: 14 }}>{error}</div>
      </div>
    </div>
  );

  // Use salon's custom colors
  const PRIMARY   = salon.theme?.primaryColor   || '#B8860B';
  const DARK      = salon.theme?.secondaryColor || '#1A1208';
  const BG        = salon.theme?.bgColor        || '#FDFAF5';
  const GOLD_PALE = PRIMARY + '18';

  const C = {
    bg: BG, card: '#FFFFFF',
    gold: PRIMARY, goldPale: GOLD_PALE,
    ink: DARK, inkMid: '#5C4A2A', inkLight: '#9C8660',
    border: '#EDE3D0',
  };

  const categories = ['All', ...new Set(services.map(s => s.category).filter(Boolean))];
  const filtered   = activeCategory === 'All' ? services : services.filter(s => s.category === activeCategory);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: 'Georgia, serif' }}>

      {/* ── Hero ── */}
      <div style={{
        background: salon.heroImage
          ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.65)), url(${salon.heroImage}) center/cover`
          : `linear-gradient(135deg, ${DARK} 0%, #2e1f0e 50%, ${DARK} 100%)`,
        padding: '60px 24px 68px',
        position: 'relative', overflow: 'hidden',
      }}>
        {!salon.heroImage && (
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.05,
            backgroundImage: `repeating-linear-gradient(45deg, ${PRIMARY} 0, ${PRIMARY} 1px, transparent 0, transparent 50%)`,
            backgroundSize: '20px 20px',
          }} />
        )}
        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', textAlign: 'center' }}>
          {/* Logo */}
          {salon.logo ? (
            <motion.img initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              src={salon.logo} alt={salon.name}
              style={{ width: 80, height: 80, borderRadius: 20, objectFit: 'cover', border: `2px solid ${PRIMARY}40`, marginBottom: 20 }}
            />
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              style={{ width: 80, height: 80, borderRadius: 20, background: GOLD_PALE, border: `2px solid ${PRIMARY}40`, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontStyle: 'italic', color: PRIMARY }}>
              {salon.name?.charAt(0)}
            </motion.div>
          )}

          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(28px,5vw,48px)', fontWeight: 400, fontStyle: 'italic', color: '#FAF6EF', margin: '0 0 10px' }}>
            {salon.heroTitle || salon.name}
          </motion.h1>

          {salon.tagline && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              style={{ fontSize: 16, color: PRIMARY, margin: '0 0 32px', fontStyle: 'italic' }}>
              {salon.tagline}
            </motion.p>
          )}

          <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate(`/book/${slug}/appointment`)}
            style={{ background: PRIMARY, color: DARK, border: 'none', borderRadius: 50, padding: '15px 40px', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: `0 4px 24px ${PRIMARY}50` }}>
            <Calendar size={18} /> Book Appointment
          </motion.button>
        </div>
      </div>

      {/* ── Info strip ── */}
      {(salon.phone || salon.email || salon.address?.city) && (
        <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: '14px 24px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            {salon.phone && (
              <a href={`tel:${salon.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 7, color: C.inkMid, fontSize: 13, textDecoration: 'none' }}>
                <Phone size={14} color={PRIMARY} /> {salon.phone}
              </a>
            )}
            {salon.email && (
              <a href={`mailto:${salon.email}`} style={{ display: 'flex', alignItems: 'center', gap: 7, color: C.inkMid, fontSize: 13, textDecoration: 'none' }}>
                <Mail size={14} color={PRIMARY} /> {salon.email}
              </a>
            )}
            {salon.address?.city && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: C.inkMid, fontSize: 13 }}>
                <MapPin size={14} color={PRIMARY} />
                {[salon.address.street, salon.address.city, salon.address.state].filter(Boolean).join(', ')}
              </span>
            )}
            {/* Social links */}
            {salon.social?.instagram && (
              <a href={salon.social.instagram} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.inkMid, fontSize: 13, textDecoration: 'none' }}>
                <Instagram size={14} color={PRIMARY} /> Instagram
              </a>
            )}
            {salon.social?.facebook && (
              <a href={salon.social.facebook} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.inkMid, fontSize: 13, textDecoration: 'none' }}>
                <Facebook size={14} color={PRIMARY} /> Facebook
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── About Section ── */}
      {salon.about?.enabled && salon.about?.text && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px 0' }}>
          <div style={{ background: C.card, borderRadius: 20, padding: '32px', border: `1px solid ${C.border}`, display: 'grid', gridTemplateColumns: salon.about.image ? '1fr 1fr' : '1fr', gap: 32 }}>
            <div>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 400, fontStyle: 'italic', color: C.ink, margin: '0 0 16px' }}>
                {salon.about.title || 'About Us'}
              </h2>
              <p style={{ fontSize: 14, color: C.inkMid, lineHeight: 1.8, margin: 0, whiteSpace: 'pre-line' }}>
                {salon.about.text}
              </p>
            </div>
            {salon.about.image && (
              <img src={salon.about.image} alt="About" style={{ width: '100%', borderRadius: 16, objectFit: 'cover', maxHeight: 280 }} />
            )}
          </div>
        </div>
      )}

      {/* ── Services ── */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 400, fontStyle: 'italic', color: C.ink, margin: 0 }}>Our Services</h2>
            <p style={{ color: C.inkLight, fontSize: 13, margin: '4px 0 0' }}>{services.length} services available</p>
          </div>
          <button onClick={() => navigate(`/book/${slug}/appointment`)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: C.goldPale, border: `1px solid ${PRIMARY}40`, borderRadius: 20, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: PRIMARY }}>
            Book Now <ArrowRight size={14} />
          </button>
        </div>

        {categories.length > 2 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                padding: '6px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: activeCategory === cat ? PRIMARY : C.card,
                color: activeCategory === cat ? DARK : C.inkMid,
                border: `1px solid ${activeCategory === cat ? PRIMARY : C.border}`,
              }}>{cat}</button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: C.inkLight }}>
            <Scissors size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            No services listed yet
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {filtered.map((service, i) => (
              <motion.div key={service._id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                whileHover={{ y: -3 }}
                onClick={() => navigate(`/book/${slug}/appointment`, { state: { selectedService: service } })}
                style={{ background: C.card, borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: C.goldPale, display: 'flex', alignItems: 'center', justifyContent: 'center', color: PRIMARY }}>
                    <Scissors size={16} />
                  </div>
                  {service.category && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.inkLight, background: C.border, borderRadius: 20, padding: '2px 8px', textTransform: 'uppercase' }}>{service.category}</span>
                  )}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{service.name}</div>
                {service.description && (
                  <div style={{ fontSize: 12, color: C.inkLight, marginBottom: 12, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {service.description}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.inkLight, fontSize: 12 }}>
                    <Clock size={12} /> {service.duration} min
                  </div>
                  <div>
                    {service.discountPrice && service.discountPrice < service.price ? (
                      <span style={{ fontSize: 12, color: C.inkLight, textDecoration: 'line-through', marginRight: 6 }}>₹{service.price}</span>
                    ) : null}
                    <span style={{ fontSize: 17, fontWeight: 800, color: PRIMARY }}>₹{service.discountPrice || service.price}</span>
                  </div>
                </div>
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: C.goldPale, borderRadius: 8, padding: 8, fontSize: 12, fontWeight: 600, color: PRIMARY }}>
                  Book this service <ChevronRight size={13} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── Gallery ── */}
      {salon.gallery?.length > 0 && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 48px' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 400, fontStyle: 'italic', color: C.ink, margin: '0 0 20px' }}>Gallery</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {salon.gallery.map((img, i) => (
              <motion.div key={i} whileHover={{ scale: 1.03 }} style={{ borderRadius: 14, overflow: 'hidden', aspectRatio: '1', background: C.border }}>
                <img src={img.url} alt={img.caption || `Gallery ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── Map ── */}
      {salon.mapEmbedUrl && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 48px' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 400, fontStyle: 'italic', color: C.ink, margin: '0 0 20px' }}>Find Us</h2>
          <iframe src={salon.mapEmbedUrl} width="100%" height="300" style={{ border: 0, borderRadius: 16 }} allowFullScreen loading="lazy" title="Salon Location" />
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ background: DARK, padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontStyle: 'italic', color: '#FAF6EF', marginBottom: 8 }}>{salon.name}</div>
        {salon.tagline && <div style={{ fontSize: 13, color: PRIMARY, marginBottom: 16 }}>{salon.tagline}</div>}
        <button onClick={() => navigate(`/book/${slug}/appointment`)} style={{ background: PRIMARY, color: DARK, border: 'none', borderRadius: 50, padding: '12px 32px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 20 }}>
          Book Appointment
        </button>
        <div style={{ fontSize: 11, color: '#9C8660' }}>
          Online booking powered by Glamour Platform
        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}