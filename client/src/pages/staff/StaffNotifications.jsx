import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, CheckCheck, Trash2, Loader2, Info, AlertTriangle,
  CheckCircle2, ClipboardList, IndianRupee, Calendar,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import api from '@/services/api';

const fade = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } } };
const stagger = (d = 0.04) => ({ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: d } } });

const TYPE_CFG = {
  info: { icon: Info, bg: '#EFF6FF', border: '#BFDBFE', color: '#1E40AF', dot: '#3B82F6' },
  warning: { icon: AlertTriangle, bg: '#FFFBEB', border: '#FDE68A', color: '#92400E', dot: '#F59E0B' },
  success: { icon: CheckCircle2, bg: '#F0FDF4', border: '#BBF7D0', color: '#166534', dot: '#22C55E' },
  task: { icon: ClipboardList, bg: '#F5F3FF', border: '#DDD6FE', color: '#6D28D9', dot: '#7C3AED' },
  salary: { icon: IndianRupee, bg: '#F0FDF4', border: '#BBF7D0', color: '#166534', dot: '#22C55E' },
  schedule: { icon: Calendar, bg: '#FBF6EE', border: '#F0E6D0', color: '#B8860B', dot: '#B8860B' },
  general: { icon: Bell, bg: '#FAFAF8', border: '#eee', color: '#666', dot: '#999' },
};

const fmtAgo = iso => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const NotifCard = ({ n, onRead, onDelete }) => {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const cfg = TYPE_CFG[n.type] || TYPE_CFG.general;
  const Icon = cfg.icon;

  const handleOpen = () => { setOpen(o => !o); if (!n.isRead) onRead(n._id); };
  const handleDelete = async (e) => { e.stopPropagation(); setDeleting(true); await onDelete(n._id); };

  return (
    <motion.div layout style={{
      background: '#fff', borderRadius: 12, overflow: 'hidden',
      border: `1px solid ${open ? cfg.border : n.isRead ? '#eee' : cfg.border}`,
      opacity: deleting ? 0.3 : 1, transition: 'all 0.2s',
    }}>
      <button onClick={handleOpen} style={{
        width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
        background: open ? cfg.bg : n.isRead ? '#fff' : `${cfg.bg}88`,
        border: 'none',
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
          background: `${cfg.dot}12`,
        }}>
          <Icon size={15} style={{ color: cfg.dot }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.3 }}>{n.title}</p>
            {!n.isRead && <span style={{ width: 7, height: 7, borderRadius: 4, background: cfg.dot, flexShrink: 0, marginTop: 5 }} />}
          </div>
          {!open && (
            <p style={{ fontSize: 13, color: '#999', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {n.message}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#bbb' }}>{n.senderName || 'Admin'}</span>
            <span style={{ fontSize: 11, color: '#ddd' }}>·</span>
            <span style={{ fontSize: 11, color: '#bbb' }}>{fmtAgo(n.createdAt)}</span>
          </div>
        </div>
        <div style={{ flexShrink: 0, marginTop: 2 }}>
          {open ? <ChevronUp size={14} style={{ color: '#bbb' }} /> : <ChevronDown size={14} style={{ color: '#bbb' }} />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${cfg.border}` }}>
              <div style={{
                padding: '12px 14px', borderRadius: 10, marginTop: 12,
                background: cfg.bg, fontSize: 14, lineHeight: 1.6, color: '#555',
              }}>
                {n.message}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#bbb' }}>
                  <span style={{ fontWeight: 500 }}>From: {n.senderName || 'Admin'}</span>
                  <span>·</span>
                  <span>{new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span>·</span>
                  <span>{new Date(n.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                </div>
                <button onClick={handleDelete} style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                  borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA',
                }}>
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function StaffNotifications() {
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/notifications'); setNotifs(data.notifications || []); setUnread(data.unreadCount || 0); }
    catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleRead = useCallback(async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifs(ns => ns.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnread(u => Math.max(0, u - 1));
      window.dispatchEvent(new Event('notifications-read'));
    } catch {}
  }, []);

  const handleDelete = useCallback(async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifs(ns => {
        const removed = ns.find(n => n._id === id);
        if (removed && !removed.isRead) setUnread(u => Math.max(0, u - 1));
        return ns.filter(n => n._id !== id);
      });
    } catch {}
  }, []);

  const handleMarkAll = async () => {
    setMarking(true);
    try { await api.patch('/notifications/read-all'); setNotifs(ns => ns.map(n => ({ ...n, isRead: true }))); setUnread(0); window.dispatchEvent(new Event('notifications-read')); }
    catch {} finally { setMarking(false); }
  };

  const displayed = filter === 'unread' ? notifs.filter(n => !n.isRead) : notifs;

  return (
    <motion.div variants={stagger()} initial="hidden" animate="show"
      style={{ fontFamily: "'DM Sans', sans-serif", maxWidth: 640 }}>

      {/* Header */}
      <motion.div variants={fade} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', fontFamily: "'Playfair Display', serif", display: 'flex', alignItems: 'center', gap: 8 }}>
            Notifications
            {unread > 0 && (
              <span style={{ fontSize: 13, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}>
                {unread}
              </span>
            )}
          </h1>
          <p style={{ fontSize: 13, color: '#999', marginTop: 2 }}>Messages from admin & front desk</p>
        </div>
        {unread > 0 && (
          <button onClick={handleMarkAll} disabled={marking} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px',
            borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0',
            opacity: marking ? 0.5 : 1,
          }}>
            {marking ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
            Mark all read
          </button>
        )}
      </motion.div>

      {/* Filter */}
      <motion.div variants={fade} style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 10, background: '#f5f5f3', marginBottom: 16 }}>
        {[['all', 'All'], ['unread', 'Unread']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: filter === k ? '#fff' : 'transparent',
            color: filter === k ? '#1a1a1a' : '#999',
            border: 'none', cursor: 'pointer',
            boxShadow: filter === k ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
          }}>
            {l}
            {k === 'unread' && unread > 0 && (
              <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: '#EF4444', color: '#fff' }}>
                {unread}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <Loader2 size={22} className="animate-spin" style={{ color: '#B8860B' }} />
        </div>
      ) : displayed.length === 0 ? (
        <motion.div variants={fade} style={{
          background: '#fff', border: '1px solid #eee', borderRadius: 14,
          padding: '48px 20px', textAlign: 'center',
        }}>
          {filter === 'unread' ? (
            <>
              <CheckCircle2 size={28} style={{ color: '#ddd', margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600, color: '#999' }}>All caught up!</p>
              <p style={{ fontSize: 13, color: '#ccc', marginTop: 4 }}>No unread notifications</p>
            </>
          ) : (
            <>
              <Bell size={28} style={{ color: '#ddd', margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600, color: '#999' }}>No notifications yet</p>
              <p style={{ fontSize: 13, color: '#ccc', marginTop: 4 }}>Messages from admin will appear here</p>
            </>
          )}
        </motion.div>
      ) : (
        <motion.div variants={stagger(0.03)} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayed.map(n => (
            <motion.div key={n._id} variants={fade} layout>
              <NotifCard n={n} onRead={handleRead} onDelete={handleDelete} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}