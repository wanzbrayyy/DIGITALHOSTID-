const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/dashboard/deposit', ensureAuthenticated, billingController.getDepositPage);
router.post('/dashboard/deposit/process', ensureAuthenticated, billingController.processDeposit);
router.get('/dashboard/invoices', ensureAuthenticated, billingController.getInvoicesPage);

// Rute untuk webhook Midtrans
router.post('/billing/midtrans-notification', billingController.handleMidtransNotification);

module.exports = router;