const express = require('express');
const router = express.Router();
const sslController = require('../controllers/sslController');
const { ensureAuthenticated } = require('../middleware/auth');

// Halaman 1: Menampilkan form untuk mengisi detail CSR
// Contoh URL: /ssl/order/2919
router.get('/ssl/order/:priceId', ensureAuthenticated, sslController.getOrderPage);

// Aksi 1: Memproses data dari form CSR, membuat CSR via API, lalu menampilkan halaman konfirmasi
router.post('/ssl/order/:priceId/generate-csr', ensureAuthenticated, sslController.generateCsrAndConfirm);

// Aksi 2: Memproses konfirmasi akhir dan mengirim pesanan SSL ke API
router.post('/ssl/order/:priceId/confirm', ensureAuthenticated, sslController.processSslOrder);

module.exports = router;