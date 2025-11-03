const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const { ensureAuthenticated } = require('../middleware/auth');

// Rute ini tidak perlu auth, karena akan mengarahkan ke registrasi jika belum login
router.post('/add-to-cart', checkoutController.addToCart);

// Semua rute di bawah ini memerlukan pengguna untuk login
router.get('/checkout', ensureAuthenticated, checkoutController.getCheckoutPage);
router.post('/update-cart-options', ensureAuthenticated, checkoutController.updateCartOptions);
router.post('/apply-voucher', ensureAuthenticated, checkoutController.applyVoucher);
router.get('/remove-voucher', ensureAuthenticated, checkoutController.removeVoucher);
router.post('/process-payment', ensureAuthenticated, checkoutController.processPayment);

module.exports = router;