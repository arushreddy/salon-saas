const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sender:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderName:  { type: String, default: 'Admin' },
  senderRole:  { type: String, default: 'admin' },
  type: {
    type: String,
    enum: ['info', 'warning', 'success', 'task', 'salary', 'schedule', 'general'],
    default: 'info',
  },
  title:   { type: String, required: true },
  message: { type: String, required: true },
  isRead:  { type: Boolean, default: false },
  readAt:  { type: Date },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);