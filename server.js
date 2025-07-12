// server.js
require("dotenv").config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');

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

// Email Configuration
const createTransporter = () => {
  // Gmail configuration
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD, // Use App Password for Gmail
      },
    });
  }
  
  // SMTP configuration for other providers
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Registration Schema - REMOVED age and reasonToJoin fields
const registrationSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
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

// Email Log Schema (to track sent emails)
const emailLogSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  recipients: [{
    email: String,
    name: String,
    registrationId: String,
    status: {
      type: String,
      enum: ['sent', 'failed'],
      default: 'sent'
    },
    error: String,
  }],
  sentBy: {
    type: String,
    default: 'admin',
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
  totalRecipients: Number,
  successCount: Number,
  failureCount: Number,
});

const EmailLog = mongoose.model('EmailLog', emailLogSchema);

// Validation middleware - REMOVED age and reasonToJoin validation
const validateRegistration = [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('gender').isIn(['Male', 'Female']).withMessage('Invalid gender'),
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('availableAllStages').isBoolean().withMessage('Please specify availability'),
  body('termsAccepted').equals('true').withMessage('Terms must be accepted'),
];

// Bulk email validation
const validateBulkEmail = [
  body('subject').notEmpty().withMessage('Email subject is required'),
  body('message').notEmpty().withMessage('Email message is required'),
  body('recipients').isArray({ min: 1 }).withMessage('At least one recipient is required'),
  body('recipients.*.email').isEmail().withMessage('Invalid email format'),
  body('recipients.*.name').notEmpty().withMessage('Recipient name is required'),
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
        message: 'This phone number is not registered yet',
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

// POST - Send bulk email
app.post('/api/send-bulk-email', validateBulkEmail, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { subject, message, recipients } = req.body;

    // Check if email configuration is available
    if (!process.env.EMAIL_USER || (!process.env.EMAIL_APP_PASSWORD && !process.env.EMAIL_PASSWORD)) {
      return res.status(500).json({
        success: false,
        message: 'Email configuration not found. Please check your environment variables.',
      });
    }

    const transporter = createTransporter();

    // Verify transporter configuration
    try {
      await transporter.verify();
    } catch (error) {
      console.error('Email configuration error:', error);
      return res.status(500).json({
        success: false,
        message: 'Email server configuration error. Please check your email settings.',
      });
    }

    const emailResults = [];
    let successCount = 0;
    let failureCount = 0;

    // Send emails to each recipient
    for (const recipient of recipients) {
      try {
        const mailOptions = {
          from: {
            name: process.env.EMAIL_FROM_NAME || 'Registration System',
            address: process.env.EMAIL_USER
          },
          to: {
            name: recipient.name,
            address: recipient.email
          },
          subject: subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #333; margin: 0;">Hello ${recipient.name},</h2>
              </div>
              
              <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e9ecef;">
                <div style="white-space: pre-wrap; line-height: 1.6; color: #555;">
                  ${message}
                </div>
              </div>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px; text-align: center;">
                <p style="margin: 0; color: #666; font-size: 14px;">
                  Best regards,<br>
                  ${process.env.EMAIL_FROM_NAME || 'Registration System'}
                </p>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; text-align: center;">
                <p style="margin: 0; color: #999; font-size: 12px;">
                  This email was sent to you because you are registered in our system.
                </p>
              </div>
            </div>
          `,
          text: `Hello ${recipient.name},\n\n${message}\n\nBest regards,\n${process.env.EMAIL_FROM_NAME || 'Registration System'}`
        };

        const info = await transporter.sendMail(mailOptions);
        
        emailResults.push({
          email: recipient.email,
          name: recipient.name,
          registrationId: recipient.id,
          status: 'sent',
          messageId: info.messageId
        });
        
        successCount++;
      } catch (error) {
        console.error(`Failed to send email to ${recipient.email}:`, error);
        
        emailResults.push({
          email: recipient.email,
          name: recipient.name,
          registrationId: recipient.id,
          status: 'failed',
          error: error.message
        });
        
        failureCount++;
      }
    }

    // Log the email send operation
    const emailLog = new EmailLog({
      subject,
      message,
      recipients: emailResults,
      totalRecipients: recipients.length,
      successCount,
      failureCount,
    });

    await emailLog.save();

    // Return response based on results
    if (successCount === recipients.length) {
      res.json({
        success: true,
        message: `Successfully sent emails to all ${successCount} recipients`,
        data: {
          totalRecipients: recipients.length,
          successCount,
          failureCount,
          results: emailResults
        }
      });
    } else if (successCount > 0) {
      res.json({
        success: true,
        message: `Sent emails to ${successCount} of ${recipients.length} recipients. ${failureCount} failed.`,
        data: {
          totalRecipients: recipients.length,
          successCount,
          failureCount,
          results: emailResults
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send emails to all recipients',
        data: {
          totalRecipients: recipients.length,
          successCount,
          failureCount,
          results: emailResults
        }
      });
    }

  } catch (error) {
    console.error('Bulk email error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending bulk emails',
      error: error.message,
    });
  }
});

// GET - Fetch email logs
app.get('/api/email-logs', async (req, res) => {
  try {
    const logs = await EmailLog.find().sort({ sentAt: -1 }).limit(50);
    res.json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching email logs',
      error: error.message,
    });
  }
});

// GET - Test email configuration
app.get('/api/test-email-config', async (req, res) => {
  try {
    if (!process.env.EMAIL_USER || (!process.env.EMAIL_APP_PASSWORD && !process.env.EMAIL_PASSWORD)) {
      return res.status(400).json({
        success: false,
        message: 'Email configuration not found in environment variables',
      });
    }

    const transporter = createTransporter();
    await transporter.verify();

    res.json({
      success: true,
      message: 'Email configuration is valid',
      config: {
        service: process.env.EMAIL_SERVICE || 'SMTP',
        user: process.env.EMAIL_USER,
        host: process.env.SMTP_HOST || 'Not specified',
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Email configuration error',
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