const express = require('express');
const router = express.Router();
const { sendQuoteMessage } = require('../controllers/quoteController');

// POST /api/quote/send
router.post('/send', sendQuoteMessage);

module.exports = router;
