import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, Loader2, UserCog, Phone, Mail,
  Star, Calendar, IndianRupee, Clock, MoreVertical,
  Edit2, Trash2, Eye, Sparkles,
} from 'lucide-react';
import api from '@/services/api';
import StaffModal from '@/components/StaffModal';

const designationLabels = {
  trainee: { label: 'Trainee', color: 'bg-gray-100 text-gray-600' },
  junior_stylist: { label: 'Junior Stylist', color: 'bg-blue-50 text-blue-600' },
  senior_stylist: { label: 'Senior Stylist', color: 'bg-emerald-50 text-emerald-600' },
  master_stylist: { label: 'Master Stylist', color: 'bg-gold/10 text-gold-dark' },
  receptionist: { label: 'Receptionist', color: 'bg-violet-50 text-violet-600' },
  manager: { label: 'Manager', color: 'bg-amber-50 text-amber-700' },
};

const AdminStaff = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/staff');
      setStaffList(data.staff);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleAdd = () => {
    setEditingStaff(null);
    setModalOpen(true);
  };

  const handleEdit = (staff) => {
    setEditingStaff(staff);
    setModalOpen(true);
    setActiveMenu(null);
  };

  const handleSubmit = async (formData) => {
    try {
      setSaving(true);
      if (editingStaff) {
        await api.put(`/staff/${editingStaff._id}`, formData);
      } else {
        await api.post('/staff', formData);
      }
      setModalOpen(false);
      setEditingStaff(null);
      fetchStaff();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this staff member?')) return;
    try {
      await api.delete(`/staff/${id}`);
      fetchStaff();
    } catch (err) {
      console.error(err);
    }
    setActiveMenu(null);
  };

  const filtered = staffList.filter((s) =>
    s.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-gold" />
            <span className="text-xs font-medium text-gold tracking-wide uppercase">Team</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">Staff Management</h1>
          <p className="text-charcoal-muted text-sm mt-0.5">{staffList.length} team members</p>
        </div>
        <button onClick={handleAdd} className="luxury-gradient text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity shadow-gold self-start">
          <Plus size={16} />
          Add Staff
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-muted" />
        <input
          type="text"
          placeholder="Search staff by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-charcoal/10 bg-white/80 text-sm text-charcoal focus:outline-none focus:border-gold/40 focus:ring-2 focus:ring-gold/10 transition-all"
        />
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gold/10 p-12 text-center">
          <UserCog size={40} className="text-gold/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-charcoal mb-1">No Staff Members</h3>
          <p className="text-charcoal-muted text-sm">Add your first team member to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((staff, i) => {
            const desg = designationLabels[staff.designation] || designationLabels.junior_stylist;
            return (
              <motion.div
                key={staff._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-gold/10 p-5 hover:shadow-md transition-all duration-300 relative group"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center shadow-lg shrink-0">
                    <span className="text-white font-bold text-lg">
                      {staff.user?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display text-base font-semibold text-charcoal truncate">
                        {staff.user?.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${desg.color}`}>
                        {desg.label}
                      </span>
                      {!staff.user?.isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-charcoal-muted mb-3">
                      <span className="flex items-center gap-1"><Mail size={12} /> {staff.user?.email}</span>
                      {staff.user?.phone && <span className="flex items-center gap-1"><Phone size={12} /> {staff.user?.phone}</span>}
                    </div>

                    {/* Specializations */}
                    {staff.specializations?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {staff.specializations.map((spec) => (
                          <span key={spec} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-cream-dark text-charcoal-muted capitalize">
                            {spec}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Quick Stats */}
                    <div className="flex items-center gap-4 text-xs text-charcoal-muted">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-gold" />
                        {staff.totalServicesCompleted} services
                      </span>
                      <span className="flex items-center gap-1">
                        <IndianRupee size={12} className="text-gold" />
                        {(staff.totalRevenueGenerated || 0).toLocaleString('en-IN')}
                      </span>
                      {staff.averageRating > 0 && (
                        <span className="flex items-center gap-1">
                          <Star size={12} className="text-amber-500" />
                          {staff.averageRating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === staff._id ? null : staff._id)}
                      className="p-1.5 rounded-lg hover:bg-cream-dark text-charcoal-muted hover:text-charcoal transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {activeMenu === staff._id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute right-0 top-8 bg-white rounded-xl shadow-elevated border border-gold/10 py-1 z-10 min-w-[140px]"
                      >
                        <button onClick={() => handleEdit(staff)} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-charcoal hover:bg-cream transition-colors">
                          <Edit2 size={14} /> Edit
                        </button>
                        <button onClick={() => handleDelete(staff._id)} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 size={14} /> Deactivate
                        </button>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Schedule Bar */}
                <div className="mt-4 pt-3 border-t border-gold/5 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-charcoal-muted">
                    <Clock size={12} />
                    {staff.schedule?.shiftStart} — {staff.schedule?.shiftEnd}
                  </div>
                  <div className="flex gap-1">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                      const fullDay = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][idx];
                      const isOff = staff.schedule?.weeklyOff?.includes(fullDay);
                      return (
                        <span key={day} className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${
                          isOff ? 'bg-red-50 text-red-400' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {day.charAt(0)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <StaffModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingStaff(null); }}
        onSubmit={handleSubmit}
        staff={editingStaff}
        isLoading={saving}
      />
    </div>
  );
};

export default AdminStaff;