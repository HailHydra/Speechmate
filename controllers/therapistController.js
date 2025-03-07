const Therapist = require('../models/therapist');

// Display all therapists
exports.getAllTherapists = async (req, res) => {
  try {
    const therapists = await Therapist.find();
    res.render('therapists', { therapists });
  } catch (error) {
    res.status(500).send('Error fetching therapists');
  }
};

// Additional therapist controller methods would go here