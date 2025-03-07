const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  name: String,
  age: Number,
  condition: String, // Main speech condition
  additionalNeeds: [String],
  preferredDays: [String],
  preferredTimes: [{ start: String, end: String }],
  location: String,
  preferredLanguage: String,
  assignedTherapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist' },
  appointmentTime: String,
  appointmentDay: String
});

module.exports = mongoose.model('Patient', patientSchema);