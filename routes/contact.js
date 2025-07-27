const express = require('express');
const router = express.Router();
const { sendContactMessage } = require('../controllers/sendMailController');

router.post('/send', sendContactMessage); // ✅ POST /api/contact/send

module.exports = router;
