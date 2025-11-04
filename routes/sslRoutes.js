const express = require('express');
const router = express.Router();
const sslController = require('../controllers/sslController');
const { ensureAuthenticated } = require('../middleware/auth');
router.get('/ssl/order/:productId', ensureAuthenticated, sslController.getOrderPage);
router.post('/ssl/order/:productId/generate-csr', ensureAuthenticated, sslController.generateCsrAndConfirm);
router.post('/ssl/order/:productId/confirm', ensureAuthenticated, sslController.processSslOrder);

module.exports = router;