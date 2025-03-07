const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');

// List all patients
router.get('/', patientController.getAllPatients);

// Patient registration
router.get('/register', patientController.showRegistrationForm);
router.post('/register', patientController.registerPatient);

// Allocation result
router.get('/allocation-result/:patientId', patientController.showAllocationResult);

// Patient dashboard
router.get('/dashboard/:patientId', patientController.showDashboard);

// Manual allocation (admin only)
router.post('/allocate/:patientId', patientController.manualAllocate);

module.exports = router;