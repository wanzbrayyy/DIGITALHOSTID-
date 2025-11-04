const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const { ensureAuthenticated } = require('../middleware/auth');

router.post('/add-to-cart', checkoutController.addToCart);

router.get('/checkout', ensureAuthenticated, checkoutController.getCheckoutPage);
router.post('/update-cart-options', ensureAuthenticated, checkoutController.updateCartOptions);
router.post('/apply-voucher', ensureAuthenticated, checkoutController.applyVoucher);
router.get('/remove-voucher', ensureAuthenticated, checkoutController.removeVoucher);

router.post('/process-checkout', ensureAuthenticated, checkoutController.processCheckout);

module.exports = router;