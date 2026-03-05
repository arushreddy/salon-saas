const express = require('express');
const router = express.Router();
const { getAllUsers, updateUserRole, toggleUserStatus } = require('../controllers/user.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.get('/', protect, authorize('admin'), getAllUsers);
router.patch('/:id/role', protect, authorize('admin'), updateUserRole);
router.patch('/:id/status', protect, authorize('admin'), toggleUserStatus);

module.exports = router;
