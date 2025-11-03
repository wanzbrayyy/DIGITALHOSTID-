const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const ticketController = require('../controllers/ticketController'); 
const { ensureAuthenticated, isSupportOrAdmin } = require('../middleware/auth');
router.use(ensureAuthenticated, isSupportOrAdmin);
router.get('/support', supportController.getSupportDashboard);
router.get('/support/tickets/:id', ticketController.viewTicket);
router.post('/support/tickets/:id/reply', ticketController.replyTicket);
router.post('/support/tickets/:id/close', ticketController.adminCloseTicket);

module.exports = router;