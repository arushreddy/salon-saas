import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Clock, LogIn, LogOut, Calendar, Loader2, CheckCircle2, XCircle, AlertCircle, Sparkles } from 'lucide-react';
import api from '@/services/api';

const StaffProfile = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clockLoading, setClockLoading] = useState(false);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/attendance/my');
      setAttendance(data.records);
      setSummary(data.summary);

      // Find today's record
      const today = new Date().toISOString().split('T')[0];
      const todayRec = data.records.find((r) => new Date(r.date).toISOString().split('T')[0] === today);
      setTodayRecord(todayRec);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAttendance(); }, []);

  const handleClockIn = async () => {
    try {
      setClockLoading(true);
      await api.post('/attendance/clock-in');
      fetchAttendance();
    } catch (err) {
      alert(err.response?.data?.message || 'Clock in failed');
    } finally {
      setClockLoading(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setClockLoading(true);
      await api.post('/attendance/clock-out');
      fetchAttendance();
    } catch (err) {
      alert(err.response?.data?.message || 'Clock out failed');
    } finally {
      setClockLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={16} className="text-gold" />
        <span className="text-xs font-medium text-gold tracking-wide uppercase">Profile</span>
      </div>
      <h1 className="font-display text-2xl font-semibold text-charcoal mb-6">My Profile & Attendance</h1>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-gold/10 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-2xl">{user?.name?.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-charcoal">{user?.name}</h2>
            <p className="text-sm text-charcoal-muted">{user?.email}</p>
            <p className="text-xs text-gold capitalize mt-0.5">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Clock In/Out */}
      <div className="bg-white rounded-2xl border border-gold/10 p-6 mb-6">
        <h3 className="font-display text-base font-semibold text-charcoal mb-4">Today's Attendance</h3>

        {loading ? (
          <Loader2 className="w-6 h-6 text-gold animate-spin mx-auto" />
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {todayRecord?.clockIn ? (
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <LogIn size={16} />
                  <span>In: {new Date(todayRecord.clockIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {todayRecord.clockOut ? (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-600">
                    <LogOut size={16} />
                    <span>Out: {new Date(todayRecord.clockOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ) : (
                  <button
                    onClick={handleClockOut}
                    disabled={clockLoading}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {clockLoading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                    Clock Out
                  </button>
                )}
                {todayRecord.status === 'late' && (
                  <span className="px-3 py-1 rounded-lg bg-amber-50 text-amber-600 text-xs font-medium">
                    Late by {todayRecord.lateByMinutes} min
                  </span>
                )}
              </div>
            ) : (
              <button
                onClick={handleClockIn}
                disabled={clockLoading}
                className="flex items-center gap-2 luxury-gradient text-white px-8 py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-gold disabled:opacity-50"
              >
                {clockLoading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                Clock In
              </button>
            )}
          </div>
        )}
      </div>

      {/* Monthly Summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Present', value: summary.present, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Late', value: summary.late, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Absent', value: summary.absent, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
            { label: 'Total Hours', value: summary.totalHours + 'h', icon: Clock, color: 'text-gold', bg: 'bg-gold/10' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gold/10 p-4"
              >
                <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-2`}>
                  <Icon size={16} className={stat.color} />
                </div>
                <p className="font-display text-xl font-bold text-charcoal">{stat.value}</p>
                <p className="text-xs text-charcoal-muted">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Attendance History */}
      {attendance && attendance.length > 0 && (
        <div className="bg-white rounded-2xl border border-gold/10 overflow-hidden">
          <div className="p-5 border-b border-gold/10">
            <h3 className="font-display text-base font-semibold text-charcoal">Attendance History</h3>
          </div>
          <div className="divide-y divide-gold/5">
            {attendance.slice().reverse().slice(0, 15).map((record) => (
              <div key={record._id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    record.status === 'present' ? 'bg-emerald-500' :
                    record.status === 'late' ? 'bg-amber-500' :
                    record.status === 'absent' ? 'bg-red-500' :
                    'bg-gray-400'
                  }`} />
                  <span className="text-sm text-charcoal">
                    {new Date(record.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-charcoal-muted">
                  {record.clockIn && (
                    <span>In: {new Date(record.clockIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  )}
                  {record.clockOut && (
                    <span>Out: {new Date(record.clockOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  )}
                  {record.totalHours > 0 && <span className="font-medium text-gold">{record.totalHours}h</span>}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                    record.status === 'present' ? 'bg-emerald-50 text-emerald-600' :
                    record.status === 'late' ? 'bg-amber-50 text-amber-600' :
                    'bg-red-50 text-red-600'
                  }`}>
                    {record.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffProfile;