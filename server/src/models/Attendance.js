const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    clockIn: {
      type: Date,
      default: null,
    },
    clockOut: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'half-day', 'holiday', 'leave'],
      default: 'absent',
    },
    totalHours: {
      type: Number,
      default: 0,
    },
    lateByMinutes: {
      type: Number,
      default: 0,
    },
    overtimeMinutes: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    markedBy: {
      type: String,
      enum: ['self', 'admin'],
      default: 'self',
    },
  },
  {
    timestamps: true,
  }
);

// One record per staff per day
attendanceSchema.index({ staff: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);