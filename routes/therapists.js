const express = require('express');
const router = express.Router();
const therapistController = require('../controllers/therapistController');

// List all therapists
router.get('/', therapistController.getAllTherapists);

// Additional therapist routes would go here

module.exports = router;