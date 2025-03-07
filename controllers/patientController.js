const Patient = require('../models/patient');
const { allocateTherapist } = require('../utils/allocation');

// Display all patients
exports.getAllPatients = async (req, res) => {
  try {
    const patients = await Patient.find().populate('assignedTherapist');
    res.render('patients', { patients });
  } catch (error) {
    res.status(500).send('Error fetching patients');
  }
};

// Display patient registration form
exports.showRegistrationForm = (req, res) => {
  res.render('register-patient');
};

// Process patient registration
exports.registerPatient = async (req, res) => {
  try {
    // Convert string arrays from form
    const formData = {
      ...req.body,
      additionalNeeds: req.body.additionalNeeds ? req.body.additionalNeeds.split(',') : [],
      preferredDays: req.body.preferredDays ? req.body.preferredDays.split(',') : []
    };
    
    // Create preferred times array
    if (req.body.preferredTimeStart && req.body.preferredTimeEnd) {
      formData.preferredTimes = [{
        start: req.body.preferredTimeStart,
        end: req.body.preferredTimeEnd
      }];
      
      // Remove the individual time fields
      delete formData.preferredTimeStart;
      delete formData.preferredTimeEnd;
    }
    
    const patient = new Patient(formData);
    await patient.save();
    
    // Allocate therapist for the new patient
    const allocation = await allocateTherapist(patient._id);
    
    if (allocation.success) {
      res.redirect(`/allocation-result/${patient._id}`);
    } else {
      res.render('allocation-failed', { message: allocation.message });
    }
  } catch (error) {
    res.status(500).render('error', { message: 'Error registering patient' });
  }
};

// Display allocation result
exports.showAllocationResult = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.patientId).populate('assignedTherapist');
    if (!patient) {
      return res.status(404).send('Patient not found');
    }
    
    res.render('allocation-result', { patient });
  } catch (error) {
    res.status(500).send('Error fetching allocation result');
  }
};

// Display patient dashboard
exports.showDashboard = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.patientId).populate('assignedTherapist');
    if (!patient) {
      return res.status(404).send('Patient not found');
    }
    
    res.render('patient-dashboard', { patient });
  } catch (error) {
    res.status(500).send('Error fetching patient dashboard');
  }
};

// Manual allocation trigger (for admin use)
exports.manualAllocate = async (req, res) => {
  try {
    const allocation = await allocateTherapist(req.params.patientId);
    res.json(allocation);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};