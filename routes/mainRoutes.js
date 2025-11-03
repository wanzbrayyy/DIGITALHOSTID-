const express = require('express');
const router = express.Router();
const mainController = require('../controllers/mainController');

router.get('/', mainController.getHomePage);
router.post('/check-domain', mainController.checkDomain);
router.get('/order-domain', mainController.orderDomain);
router.get('/ssl', mainController.getSslPage);
router.get('/check-ip', mainController.checkServerIp);
router.use((req, res, next) => {
    if (req.query.ref) {
        res.cookie('ref_code', req.query.ref, { maxAge: 86400000, httpOnly: true });
    }
    next();
});

module.exports = router;