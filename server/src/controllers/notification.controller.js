const Notification = require('../models/Notification');
const User         = require('../models/User');
const Staff        = require('../models/Staff');
const { AppError } = require('../middlewares/errorHandler');

// GET /api/notifications
const getNotifications = async (req, res, next) => {
  try {
    const { role, userId } = req.user;
    const { staffId, unreadOnly } = req.query;

    let recipientFilter = { recipient: userId };
    if ((role === 'admin' || role === 'receptionist') && staffId) {
      recipientFilter = { recipient: staffId };
    }

    const query = { salonId: req.salonId, ...recipientFilter };
    if (unreadOnly === 'true') query.isRead = false;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('sender', 'name role');

    const unreadCount = await Notification.countDocuments({ salonId: req.salonId, recipient: recipientFilter.recipient, isRead: false });

    res.json({ success: true, notifications, unreadCount });
  } catch (err) { next(err); }
};

// POST /api/notifications
const createNotification = async (req, res, next) => {
  try {
    const { recipientId, recipientIds, title, message, type } = req.body;
    if (!title?.trim() || !message?.trim()) throw new AppError('Title and message are required', 400);

    const senderUser = await User.findById(req.user.userId).select('name role');
    const senderName = senderUser?.name || 'Admin';
    const senderRole = senderUser?.role || 'admin';

    const ids = Array.isArray(recipientIds) && recipientIds.length
      ? recipientIds
      : recipientId ? [recipientId] : [];
    if (!ids.length) throw new AppError('At least one recipient required', 400);

    const docs = ids.map(rid => ({
      salonId:    req.salonId,
      recipient:  rid,
      sender:     req.user.userId,
      senderName, senderRole,
      type:       type || 'info',
      title:      title.trim(),
      message:    message.trim(),
    }));

    const created = await Notification.insertMany(docs);
    res.status(201).json({ success: true, count: created.length });
  } catch (err) { next(err); }
};

// PATCH /api/notifications/:id/read
const markRead = async (req, res, next) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, salonId: req.salonId, recipient: req.user.userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!n) throw new AppError('Not found', 404);
    res.json({ success: true });
  } catch (err) { next(err); }
};

// PATCH /api/notifications/read-all
const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { salonId: req.salonId, recipient: req.user.userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch (err) { next(err); }
};

// DELETE /api/notifications/:id
const deleteNotification = async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin'
      ? { _id: req.params.id, salonId: req.salonId }
      : { _id: req.params.id, salonId: req.salonId, recipient: req.user.userId };
    await Notification.findOneAndDelete(filter);
    res.json({ success: true });
  } catch (err) { next(err); }
};

// GET /api/notifications/staff-list
const getStaffForSending = async (req, res, next) => {
  try {
    const staffList = await Staff.find({ salonId: req.salonId })
      .populate('user', 'name email role isActive')
      .sort({ createdAt: -1 });
    const active = staffList.filter(s => s.user?.isActive !== false);
    res.json({ success: true, staff: active });
  } catch (err) { next(err); }
};

module.exports = { getNotifications, createNotification, markRead, markAllRead, deleteNotification, getStaffForSending };
