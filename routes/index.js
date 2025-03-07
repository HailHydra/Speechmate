const express = require('express');
const router = express.Router();

// Home page
router.get('/', (req, res) => {
  res.render('index');
});

// How it works page
router.get('/how-it-works', (req, res) => {
  res.render('how-it-works');
});

// About page
router.get('/about', (req, res) => {
  res.render('about');
});

module.exports = router;