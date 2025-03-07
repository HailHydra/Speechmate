require('dotenv').config();
const mongoose = require('mongoose');
const Therapist = require('../models/therapist');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('Connected to MongoDB for seeding'))
.catch(err => console.error('MongoDB connection error:', err));

// Sample therapist data
const therapists = [
  {
    name: "Dr. Sarah Jenkins",
    specialties: ["stuttering", "articulation", "childhood speech disorders"],
    availableDays: ["Monday", "Tuesday", "Wednesday"],
    availableTimes: [
      { start: "9:00 AM", end: "10:00 AM" },
      { start: "10:30 AM", end: "11:30 AM" },
      { start: "2:30 PM", end: "3:30 PM" }
    ],
    maxCaseload: 15,
    currentCaseload: 8,
    location: "New York",
    languages: ["English", "Spanish"]
  },
  {
    name: "Dr. Michael Chen",
    specialties: ["aphasia", "voice disorders", "swallowing disorders"],
    availableDays: ["Monday", "Thursday", "Friday"],
    availableTimes: [
      { start: "8:00 AM", end: "9:00 AM" },
      { start: "11:00 AM", end: "12:00 PM" },
      { start: "3:00 PM", end: "4:00 PM" }
    ],
    maxCaseload: 12,
    currentCaseload: 5,
    location: "Chicago",
    languages: ["English", "Mandarin"]
  },
  {
    name: "Dr. James Wilson",
    specialties: ["articulation", "fluency disorders", "accent modification"],
    availableDays: ["Tuesday", "Wednesday", "Friday"],
    availableTimes: [
      { start: "10:00 AM", end: "11:00 AM" },
      { start: "1:00 PM", end: "2:00 PM" },
      { start: "4:00 PM", end: "5:00 PM" }
    ],
    maxCaseload: 10,
    currentCaseload: 7,
    location: "Los Angeles",
    languages: ["English"]
  },
  {
    name: "Dr. Emily Rodriguez",
    specialties: ["childhood speech disorders", "developmental delays", "articulation"],
    availableDays: ["Monday", "Wednesday", "Thursday"],
    availableTimes: [
      { start: "9:30 AM", end: "10:30 AM" },
      { start: "12:30 PM", end: "1:30 PM" },
      { start: "3:30 PM", end: "4:30 PM" }
    ],
    maxCaseload: 18,
    currentCaseload: 12,
    location: "New York",
    languages: ["English", "Spanish", "Portuguese"]
  },
  {
    name: "Dr. Alex Patel",
    specialties: ["voice disorders", "swallowing disorders", "neurological speech disorders"],
    availableDays: ["Tuesday", "Thursday", "Friday"],
    availableTimes: [
      { start: "8:30 AM", end: "9:30 AM" },
      { start: "11:30 AM", end: "12:30 PM" },
      { start: "2:00 PM", end: "3:00 PM" }
    ],
    maxCaseload: 14,
    currentCaseload: 9,
    location: "Seattle",
    languages: ["English", "Hindi", "Gujarati"]
  }
];

async function seedDatabase() {
  try {
    // Clear existing data
    await Therapist.deleteMany({});
    
    // Insert new data
    await Therapist.insertMany(therapists);
    
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedDatabase();