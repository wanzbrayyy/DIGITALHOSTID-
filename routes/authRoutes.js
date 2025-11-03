const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { forwardAuthenticated } = require('../middleware/auth');

router.get('/login', forwardAuthenticated, authController.getLoginPage);
router.post('/login', authController.postLogin);
router.get('/register', forwardAuthenticated, authController.getRegisterPage);
router.post('/register', authController.postRegister);
router.get('/logout', authController.logout);

module.exports = router;