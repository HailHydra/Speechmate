const mongoose = require('mongoose');

const therapistSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  specialties: { 
    type: [String], 
    required: true 
  },
  availableDays: { 
    type: [String], 
    required: true 
  },
  availableTimes: { 
    type: [{
      start: String, 
      end: String 
    }], 
    required: true 
  },
  maxCaseload: { 
    type: Number, 
    required: true,
    min: 0,
    default: 10 // Add a default value
  },
  currentCaseload: { 
    type: Number, 
    default: 0,
    min: 0,
    validate: {
      validator: function(v) {
        return v <= this.maxCaseload;
      },
      message: props => `Current caseload (${props.value}) cannot exceed max caseload!`
    }
  },
  location: { 
    type: String, 
    required: true 
  },
  languages: { 
    type: [String], 
    required: true 
  }
}, {
  // Ensure virtuals are included when converting to JSON
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Optional: Add a virtual to check remaining capacity
therapistSchema.virtual('remainingCapacity').get(function() {
  return this.maxCaseload - this.currentCaseload;
});

module.exports = mongoose.model('Therapist', therapistSchema);