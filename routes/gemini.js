// routes/gemini.js
const express = require('express');
const router = express.Router();
const { generateContent } = require('../services/geminiService');

// Generate speech therapy exercises
router.post('/generate-exercises', async (req, res) => {
  try {
    const { condition, age, difficulty } = req.body;
    
    const prompt = `Generate speech therapy exercises for a ${age}-year-old patient with ${condition}. 
    The exercises should be ${difficulty} difficulty level.`;
    
    const exercises = await generateContent(prompt);
    res.json({ success: true, exercises });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generate progress report
router.post('/generate-report', async (req, res) => {
  try {
    const { patientData, exerciseHistory, goals } = req.body;
    
    const prompt = `Generate a speech therapy progress report based on the following information:
    Patient: ${JSON.stringify(patientData)}
    Exercise History: ${JSON.stringify(exerciseHistory)}
    Goals: ${JSON.stringify(goals)}`;
    
    const report = await generateContent(prompt);
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;