const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { ensureAuthenticated, isAdmin } = require('../middleware/auth');

router.use(ensureAuthenticated, isAdmin);

router.get('/', adminController.getAdminDashboard);
router.get('/domains', adminController.getDomainsPage);
router.post('/domains/:id/suspend', adminController.suspendDomain);
router.post('/domains/:id/unsuspend', adminController.unsuspendDomain);

router.get('/users', adminController.getUsersPage);
router.post('/users/:id/update-role', adminController.updateUserRole);

router.get('/notifications', adminController.getNotificationsPage);
router.post('/notifications/send', adminController.sendNotification);

router.get('/products', adminController.getProductsPage);
router.post('/products/create', adminController.createProduct);
router.post('/products/:id/delete', adminController.deleteProduct);

router.get('/vouchers', adminController.getVouchersPage);
router.post('/vouchers/create', adminController.createVoucher);
router.post('/vouchers/:id/delete', adminController.deleteVoucher);

router.get('/promos', adminController.getPromosPage);
router.post('/promos/create', adminController.createPromo);
router.post('/promos/:id/delete', adminController.deletePromo);

router.get('/settings-harga', adminController.getSettingsHargaPage);
router.post('/settings-harga/update', adminController.updateSettingsHarga);

module.exports = router;