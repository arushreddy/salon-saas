const mongoose = require('mongoose');

// A single clock-in / clock-out pair (one "session")
const sessionSchema = new mongoose.Schema({
  clockIn:  { type: Date, required: true },
  clockOut: { type: Date, default: null },
  durationMinutes: { type: Number, default: 0 }, // filled when clock-out happens
  note: { type: String, default: '' },
}, { _id: true });

const attendanceSchema = new mongoose.Schema({
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'User',
    required: true,
  },
  // IST calendar date stored as UTC midnight: "2026-03-07T00:00:00.000Z" = 7 Mar IST
  date: { type: Date, required: true },

  // Multi-session support: staff can go out & come back multiple times
  sessions: { type: [sessionSchema], default: [] },

  // Computed — sum of all completed session durations
  totalMinutes: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day', 'holiday', 'leave'],
    default: 'absent',
  },
  lateByMinutes:    { type: Number, default: 0 },
  overtimeMinutes:  { type: Number, default: 0 },
  deduction:        { type: Number, default: 0 },   // total salary deduction applied for this day
  notes:            { type: String, default: '' },
  markedBy:         { type: String, enum: ['self', 'admin'], default: 'self' },
}, { timestamps: true });

// One record per staff per day
attendanceSchema.index({ staff: 1, date: 1 }, { unique: true });

// Virtual: is any session currently open (clocked-in but not out)?
attendanceSchema.virtual('isCurrentlyIn').get(function() {
  return this.sessions.some(s => s.clockIn && !s.clockOut);
});

module.exports = mongoose.model('Attendance', attendanceSchema);