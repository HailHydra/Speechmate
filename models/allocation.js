const mongoose = require('mongoose');

const AllocationSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  therapist: {
    type: Object,
    required: true
  },
  success: {
    type: Boolean,
    default: true
  },
  matchQuality: {
    type: String,
    enum: ['High', 'Medium', 'Low', null],
    default: null
  },
  matchScore: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  matchReason: {
    type: String,
    default: null
  },
  appointmentDay: String,
  appointmentTime: String,
  note: String,
  message: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Allocation', AllocationSchema);