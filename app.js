// app.js or server.js
const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/speech_therapy_db')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'speech-therapy-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 60 * 60 * 1000 } // 1 hour
}));

// Flash messages
app.use(flash());

// Make flash messages available to all views
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success');
  res.locals.error_msg = req.flash('error');
  next();
});

// Routes
const patientRoutes = require('./routes/patients');
const therapistRoutes = require('./routes/therapists');
const allocationRoutes = require('./routes/allocation');

app.use('/patients', patientRoutes);
app.use('/therapists', therapistRoutes);
app.use('/allocation', allocationRoutes);

// Home route
app.get('/', (req, res) => {
  res.render('index', { title: 'Speech Therapy Management System' });
});

// Add a direct route for allocation results
app.get('/allocation-result/:id', async (req, res) => {
  try {
    const allocationId = req.params.id;
    
    // Import the Allocation model
    const Allocation = require('./models/allocation');
    
    // Fetch allocation from database
    const allocation = await Allocation.findById(allocationId);
    
    if (!allocation) {
      req.flash('error', 'Allocation not found');
      return res.redirect('/patient');
    }
    
    // Get patient ID if available
    const patientId = allocation.patientId;
    
    res.render('allocation-result', { 
      allocation: allocation,
      patientId: patientId
    });
  } catch (err) {
    console.error('Error fetching allocation:', err);
    req.flash('error', 'Failed to load allocation details');
    res.redirect('/patients');
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;