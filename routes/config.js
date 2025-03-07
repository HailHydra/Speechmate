// routes/config.js
const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');

// GET OpenAI configuration page
router.get('/openai', configController.showConfigPage);

// POST update OpenAI configuration
router.post('/openai', configController.updateOpenAIConfig);

module.exports = router;