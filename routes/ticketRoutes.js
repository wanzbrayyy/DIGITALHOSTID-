const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { ensureAuthenticated, isSupportOrAdmin } = require('../middleware/auth');
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
    params: {
        folder: 'ticket_attachments',
        public_id: (req, file) => `ticket-${req.session.user.id}-${Date.now()}`
    }
});

const upload = multer({ storage: storage });

// Rute untuk Pengguna
router.get('/dashboard/tickets', ensureAuthenticated, ticketController.getTicketsPage);
router.get('/dashboard/tickets/new', ensureAuthenticated, ticketController.getNewTicketPage);
router.post('/dashboard/tickets/new', ensureAuthenticated, upload.single('attachment'), ticketController.createTicket);
router.get('/dashboard/tickets/:id', ensureAuthenticated, ticketController.viewTicket);
router.post('/dashboard/tickets/:id/reply', ensureAuthenticated, upload.single('attachment'), ticketController.replyTicket);

// Rute untuk Admin & Support
router.get('/admin/tickets', ensureAuthenticated, isSupportOrAdmin, ticketController.adminGetTickets);
router.get('/admin/tickets/:id', ensureAuthenticated, isSupportOrAdmin, ticketController.viewTicket);
router.post('/admin/tickets/:id/reply', ensureAuthenticated, isSupportOrAdmin, upload.single('attachment'), ticketController.replyTicket);
router.post('/admin/tickets/:id/close', ensureAuthenticated, isSupportOrAdmin, ticketController.adminCloseTicket);

router.get('/support/tickets/:id', ensureAuthenticated, isSupportOrAdmin, ticketController.viewTicket);
router.post('/support/tickets/:id/reply', ensureAuthenticated, isSupportOrAdmin, upload.single('attachment'), ticketController.replyTicket);
router.post('/support/tickets/:id/close', ensureAuthenticated, isSupportOrAdmin, ticketController.adminCloseTicket);

module.exports = router;