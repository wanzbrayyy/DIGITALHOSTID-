const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/dashboard/my-services', ensureAuthenticated, serviceController.getMyServicesPage);

module.exports = router;