// server.js
require("dotenv").config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/groupchat";

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Registration Schema
const registrationSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  age: {
    type: Number,
    required: true,
    min: 13,
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female'],
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  churchName: {
    type: String,
    trim: true,
  },
  availableAllStages: {
    type: Boolean,
    required: true,
  },
  reasonToJoin: {
    type: String,
    required: true,
    trim: true,
  },
  registrationDate: {
    type: Date,
    default: Date.now,
  },
  termsAccepted: {
    type: Boolean,
    required: true,
  },
});

const Registration = mongoose.model('Registration', registrationSchema);

// Validation middleware
const validateRegistration = [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('age').isInt({ min: 13 }).withMessage('Age must be at least 13'),
  body('gender').isIn(['Male', 'Female']).withMessage('Invalid gender'),
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('availableAllStages').isBoolean().withMessage('Please specify availability'),
  body('reasonToJoin').notEmpty().withMessage('Please provide a reason to join'),
  body('termsAccepted').equals('true').withMessage('Terms must be accepted'),
];

// Routes

// GET - Fetch all registrations
app.get('/api/registrations', async (req, res) => {
  try {
    const registrations = await Registration.find().sort({ registrationDate: -1 });
    res.json({
      success: true,
      count: registrations.length,
      data: registrations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching registrations',
      error: error.message,
    });
  }
});
// POST - Login (fetch registration by phone number)
app.post('/api/login', async (req, res) => {
  try {
    const existingRegistration = await Registration.findOne({
      phoneNumber: req.body.phoneNumber,
    });
    if (existingRegistration) {
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: existingRegistration,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Registration not found for this phone number',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching registrations',
      error: error.message,
    });
  }
});


// GET - Fetch single registration by ID
app.get('/api/registrations/:id', async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }
    res.json({
      success: true,
      data: registration,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching registration',
      error: error.message,
    });
  }
});

// POST - Create new registration
app.post('/api/registrations', validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    // Check if phone number already exists
    const existingRegistration = await Registration.findOne({
      phoneNumber: req.body.phoneNumber,
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered',
      });
    }

    const registration = new Registration(req.body);
    await registration.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      data: registration,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating registration',
      error: error.message,
    });
  }
});

// PUT - Update registration
app.put('/api/registrations/:id', validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const registration = await Registration.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }

    res.json({
      success: true,
      message: 'Registration updated successfully',
      data: registration,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating registration',
      error: error.message,
    });
  }
});

// DELETE - Delete registration
app.delete('/api/registrations/:id', async (req, res) => {
  try {
    const registration = await Registration.findByIdAndDelete(req.params.id);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }
    res.json({
      success: true,
      message: 'Registration deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting registration',
      error: error.message,
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;