const express = require('express');
const { getMessages } = require('../controllers/chatController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, getMessages);

module.exports = router;
