const express = require('express');
const router = express.Router();
const affiliateController = require('../controllers/affiliateController');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/dashboard/affiliate', ensureAuthenticated, affiliateController.getAffiliatePage);

module.exports = router;