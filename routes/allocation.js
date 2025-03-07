// routes/allocation.js
const express = require('express');
const router = express.Router();
const allocationController = require('../controllers/allocationController');
const Patient = require('../models/patient');
const Therapist = require('../models/therapist');

// Route to trigger allocation and show results
router.get('/allocate/:patientId', allocationController.allocateTherapistToPatient);

// Route to display allocation results
router.get('/result/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // If not in session, fetch the current allocation status from the database
    const patient = await Patient.findById(patientId)
      .populate('assignedTherapist')
      .exec();
    
    if (!patient) {
      req.flash('error', 'Patient not found');
      return res.redirect('/patients');
    }
    
    // If no therapist is assigned yet
    if (!patient.assignedTherapist) {
      return res.render('allocation-result', { 
        title: 'Allocation Result',
        patient,
        result: { 
          success: false, 
          message: 'No therapist has been assigned to this patient yet'
        }
      });
    }
    
    // Create allocation result object
    const result = {
      success: true,
      therapist: patient.assignedTherapist,
      appointmentDay: patient.appointmentDay,
      appointmentTime: patient.appointmentTime,
      matchQuality: patient.matchQuality || 'medium',
      note: patient.allocationNote || '',
      matchScore: patient.matchScore
    };
    
    // Render the allocation result page with the data
    res.render('allocation-result', { 
      title: 'Allocation Result',
      patient,
      result,
      allocationMethod: result.matchReason ? 'AI-Powered Match' : 'Standard Match',
      matchDescription: result.matchReason || 
                      `Matched based on specialty and availability with a score of ${result.matchScore || 'N/A'}`
    });
  } catch (error) {
    console.error('Error displaying allocation result:', error);
    req.flash('error', `Could not display allocation result: ${error.message}`);
    res.redirect('/patients');
  }
});


// Add a route to handle the incorrect URL pattern that's causing the 404
router.get('/allocation-result/:patientId', (req, res) => {
  const { patientId } = req.params;
  // Redirect to the correct URL pattern
  res.redirect(`/allocation/result/${patientId}`);
});

module.exports = router;