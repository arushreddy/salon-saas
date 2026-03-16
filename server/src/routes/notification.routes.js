const express = require('express');
const router  = express.Router();
const { protect, authorize, guardTenant } = require('../middlewares/auth.middleware');
const {
  getNotifications, createNotification,
  markRead, markAllRead, deleteNotification, getStaffForSending,
} = require('../controllers/notification.controller');

router.use(protect, guardTenant);

router.get('/staff-list', authorize('admin','receptionist'), getStaffForSending);
router.get('/',           getNotifications);
router.post('/',          authorize('admin','receptionist'), createNotification);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);
router.delete('/:id',     deleteNotification);

module.exports = router;
