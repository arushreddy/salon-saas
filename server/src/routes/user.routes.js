const express = require('express');
const router  = express.Router();
const { getAllUsers, updateUserRole, toggleUserStatus } = require('../controllers/user.controller');
const { protect, authorize, guardTenant } = require('../middlewares/auth.middleware');

router.use(protect, guardTenant);

router.get('/',             authorize('admin','receptionist'), getAllUsers);
router.patch('/:id/role',   authorize('admin'), updateUserRole);
router.patch('/:id/status', authorize('admin'), toggleUserStatus);

module.exports = router;
