const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { ensureAuthenticated } = require('../middleware/auth');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: { folder: 'digitalhostid', public_id: (req, file) => `user-${req.session.user.id}` }
});

const upload = multer({ storage: storage });

router.use(ensureAuthenticated);

router.get('/dashboard', dashboardController.getDashboard);
router.get('/dashboard/buy-domain', dashboardController.getBuyDomainPage);
router.get('/dashboard/transfer-domain', dashboardController.getTransferDomainPage);
router.post('/dashboard/transfer-domain', dashboardController.postTransferDomain);
router.get('/dashboard/renew', dashboardController.getRenewPage);

router.get('/dashboard/domain/:id/manage', dashboardController.getManageDomainPage);
router.post('/dashboard/domain/:id/toggle-lock', dashboardController.toggleLock);
router.post('/dashboard/domain/:id/resend-verification', dashboardController.resendVerification);
router.get('/dashboard/domain/:id/dns', dashboardController.getDnsManagerPage);
router.post('/dashboard/domain/:id/dns/create', dashboardController.createDnsRecord);
router.post('/dashboard/domain/:id/dns/delete', dashboardController.deleteDnsRecord);

router.get('/dashboard/settings', dashboardController.getSettingsPage);
router.post('/dashboard/settings', upload.single('profilePicture'), dashboardController.updateSettings);

module.exports = router;