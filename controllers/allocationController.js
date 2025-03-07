// controllers/allocationController.js
// controllers/allocationController.js
const { allocateTherapist } = require('../utils/allocation');
const Patient = require('../models/patient');

exports.allocateTherapistToPatient = async (req, res) => {
  try {
    const patientId = req.params.patientId;
    
    // Show allocation in progress page first
    if (req.query.status !== 'processing') {
      return res.render('allocation-processing', {
        patientId: patientId,
        title: 'Allocation in Progress'
      });
    }
    
    // Call the allocation function from allocation.js
    const allocationResult = await allocateTherapist(patientId);
    
    if (!allocationResult.success) {
      return res.status(400).render('error', {
        title: 'Allocation Failed',
        message: allocationResult.message
      });
    }
    
    // Get the complete patient record with the therapist information 
    const patient = await Patient.findById(patientId)
      .populate('assignedTherapist')
      .exec();
    
    if (!patient) {
      return res.status(404).render('error', { 
        title: 'Patient Not Found',
        message: 'The patient record could not be found'
      });
    }

    // Add allocation method info to the template data
    const templateData = {
      patient,
      result: allocationResult,
      allocationMethod: allocationResult.matchReason ? 'AI-Powered Match' : 'Standard Match',
      // If there's a matchReason from LLM, use that, otherwise use basic info
      matchDescription: allocationResult.matchReason || 
                        `Matched based on specialty and availability with a score of ${allocationResult.matchScore || 'N/A'}`
    };

    // Render the allocation-result EJS template with the data
    res.render('allocation-result', templateData);
  } catch (error) {
    console.error('Error in allocation controller:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      message: 'An unexpected error occurred during therapist allocation',
      errorDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Route to display the allocation form
exports.showAllocationForm = async (req, res) => {
  try {
    const patients = await Patient.find({ assignedTherapist: { $exists: false } });
    
    res.render('allocation-form', {
      title: 'Allocate Therapist',
      patients
    });
  } catch (error) {
    console.error('Error loading allocation form:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      message: 'Failed to load the allocation form',
      errorDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};