const express = require('express');
const router = express.Router();
const mainController = require('../controllers/mainController');

router.get('/', mainController.getHomePage);
router.post('/check-domain', mainController.checkDomain);
router.get('/order-domain', mainController.orderDomain);
router.get('/system-status', mainController.getSystemStatusPage);
router.get('/free-domain-request', mainController.getFreeDomainPage);
router.post('/free-domain-request', mainController.postFreeDomainRequest);
router.get('/about-us', mainController.getAboutPage);
router.get('/privacy-policy', mainController.getPolicyPage);
router.get('/domain-pricing', mainController.getDomainPricingPage);
router.get('/ssl', mainController.getSslPage);
router.get('/check-ip', mainController.checkServerIp);
router.use((req, res, next) => {
    if (req.query.ref) {
        res.cookie('ref_code', req.query.ref, { maxAge: 86400000, httpOnly: true });
    }
    next();
});

module.exports = router;