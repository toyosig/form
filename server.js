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

// Quiz Questions Schema
const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  options: [{
    type: String,
    required: true,
  }],
  correctAnswer: {
    type: Number,
    required: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
});

// Quiz Session Schema
const quizSessionSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    default: '',
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
  },
  timeRemaining: {
    type: Number,
    default: 1200000, // 20 minutes in milliseconds
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
    },
    selectedAnswer: Number,
    isCorrect: Boolean,
  }],
  score: {
    type: Number,
    default: 0,
  },
  totalQuestions: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'timeout'],
    default: 'active',
  },
  completedAt: {
    type: Date,
  },
  timeTaken: {
    type: Number, // in milliseconds
  },
});

const Registration = mongoose.model('Registration', registrationSchema);
const Question = mongoose.model('Question', questionSchema);
const QuizSession = mongoose.model('QuizSession', quizSessionSchema);

// Initialize quiz questions from your provided data
const initializeQuestions = async () => {
  const existingQuestions = await Question.countDocuments();
  if (existingQuestions > 0) return;

  const questions = [
    {
      question: "What are the names of Moses' parents?",
      options: ["Abraham and Sarah", "Levi and Tarmah", "Amram and Jochebed"],
      correctAnswer: 2
    },
    {
      question: "Who said 'Thou art the Christ, the Son of the living God'?",
      options: ["Nathaniel", "Peter", "Andrew"],
      correctAnswer: 1
    },
    {
      question: "To whom did Jesus say 'Follow me and I will make you fishers of men'?",
      options: ["James and John", "Matthew and Thomas", "Peter and Andrew"],
      correctAnswer: 2
    },
    {
      question: "From Abraham to Jesus Christ was how many generations?",
      options: ["42", "28", "14"],
      correctAnswer: 0
    },
    {
      question: "What was the occupation of Matthew before Jesus called him as disciple?",
      options: ["Fisherman", "Tax collector", "Carpenter"],
      correctAnswer: 1
    },
    {
      question: "Where did Jesus' parents take him when King Herod wanted to kill him?",
      options: ["Nazareth", "Galilee", "Egypt"],
      correctAnswer: 2
    },
    {
      question: "The first four disciples of Jesus were called by the sea of...",
      options: ["Galilee", "Jordan", "Jericho"],
      correctAnswer: 0
    },
    {
      question: "What is the name of the only daughter of Jacob?",
      options: ["Rachel", "Tamar", "Dinah"],
      correctAnswer: 2
    },
    {
      question: "What are the names of the two sons of Moses?",
      options: ["Gershom and Eliezer", "Manasseh and Ephraim", "Nadab and Abihu"],
      correctAnswer: 0
    },
    {
      question: "Who was the minister of Moses?",
      options: ["Aaron", "Joshua", "Miriam"],
      correctAnswer: 1
    },
    {
      question: "Moses was from which tribe in Israel?",
      options: ["Judah", "Levi", "Reuben"],
      correctAnswer: 1
    },
    {
      question: "Upon which mountain did God give Moses the ten commandments?",
      options: ["Mount Horeb", "Mount Pisgah", "Mount Sinai"],
      correctAnswer: 2
    },
    {
      question: "For how long did Moses' parents hide him before he was taken to the bank of river?",
      options: ["3 months", "6 months", "9 months"],
      correctAnswer: 0
    },
    {
      question: "Who was the father of Lot?",
      options: ["Haran", "Terah", "Nahor"],
      correctAnswer: 0
    },
    {
      question: "God confounded the language of the world at...",
      options: ["Bethel", "Eden", "Babel"],
      correctAnswer: 2
    },
    {
      question: "Who was the first man to practice polygamy?",
      options: ["Abraham", "Lamech", "Nahor"],
      correctAnswer: 1
    },
    {
      question: "How old was Methuselah when he died?",
      options: ["996 years", "969 years", "966 years"],
      correctAnswer: 1
    },
    {
      question: "What are the names of twins of Judah?",
      options: ["Pharez and Zarah", "Manasseh and Ephraim", "Gershom and Eliezer"],
      correctAnswer: 0
    },
    {
      question: "How old was Isaac when Esau and Jacob were born?",
      options: ["40", "50", "60"],
      correctAnswer: 2
    },
    {
      question: "How old was Moses when he died?",
      options: ["120 years", "145 years", "175 years"],
      correctAnswer: 0
    },
    {
      question: "What is the name of the King that killed John the Baptist?",
      options: ["Herod the Great", "Herod the Tetrarch", "Agrippa"],
      correctAnswer: 1
    },
    {
      question: "What is the name given to Peter by Jesus Christ?",
      options: ["Barjona", "Simon", "Alpheus"],
      correctAnswer: 0
    },
    {
      question: "What is the name of the brother of King Herod which the king took his wife from him?",
      options: ["Felix", "Agrippa", "Philip"],
      correctAnswer: 2
    },
    {
      question: "After his trial, how many children did Job have?",
      options: ["10", "7", "3"],
      correctAnswer: 0
    },
    {
      question: "After Cain murdered his brother, he went out of the presence of God and dwelt in which land?",
      options: ["Canaan", "Nod", "Moriah"],
      correctAnswer: 1
    },
    {
      question: "Who was the first man to commit murder?",
      options: ["Lamech", "Achan", "Cain"],
      correctAnswer: 2
    },
    //na new one
    // New questions you want to add
    {
      question: "What was the name of Job's firstborn after his restoration?",
      options: ["Kezia", "Jemima", "Karen-happuch"],
      correctAnswer: 1
    },
    {
      question: "Who was the father of Abraham?",
      options: ["Noah", "Haran", "Terah"],
      correctAnswer: 2
    },
    {
      question: "The Ark of Noah rested after the flood on which mountain?",
      options: ["Mount Camel", "Mount Olivet", "Mount Ararat"],
      correctAnswer: 2
    },
    {
      question: "After his trial, how many years did Job live?",
      options: ["140 years", "150 years", "175 years"],
      correctAnswer: 0
    },
    {
      question: "Who was the first man God took away without seeing death?",
      options: ["Elijah", "Jesus Christ", "Enoch"],
      correctAnswer: 2
    },
    {
      question: "Who said 'I know not, am I my brother's keeper?'",
      options: ["Cain", "Esau", "Jonah"],
      correctAnswer: 0
    },
    {
      question: "What was the name of the wife which Abraham married after the death of Sarah?",
      options: ["Hagai", "Keturah", "Rebecca"],
      correctAnswer: 1
    },
    {
      question: "Who was the father of Rebekah?",
      options: ["Bethuel", "Nahor", "Laban"],
      correctAnswer: 0
    },
    {
      question: "How much did Abraham buy the place where he buried Sarah?",
      options: ["400 pieces of silver", "40 pieces of silver", "30 pieces of gold"],
      correctAnswer: 0
    },
    {
      question: "What was the name of Rebekah's nurse?",
      options: ["Rachel", "Keturah", "Deborah"],
      correctAnswer: 2
    },
    {
      question: "How many children did Jacob have?",
      options: ["12", "13", "14"],
      correctAnswer: 1
    },
    {
      question: "What was the name which Rachel gave Benjamin at her death?",
      options: ["Benjamin", "Benhadad", "Ben-oni"],
      correctAnswer: 2
    },
    {
      question: "How old was Joseph when he interpreted Pharaoh's dreams?",
      options: ["30", "21", "17"],
      correctAnswer: 0
    },
    {
      question: "What are the names of Joseph's two sons?",
      options: ["Zebulon and Manasseh", "Asher and Gad", "Manasseh and Ephraim"],
      correctAnswer: 2
    },
    {
      question: "How many souls came to Egypt with Jacob?",
      options: ["17", "70", "600"],
      correctAnswer: 1
    },
    {
      question: "How much did Joseph's brothers sell him for?",
      options: ["40 pieces of silver", "30 pieces of silver", "20 pieces of silver"],
      correctAnswer: 2
    },
    {
      question: "Paul Apostle was from which tribe of Israel?",
      options: ["Judah", "Benjamin", "Ephraim"],
      correctAnswer: 1
    },
    {
      question: "What is the name of the man that was compelled to help Christ to carry His cross?",
      options: ["Simon", "Joseph", "James"],
      correctAnswer: 0
    },
    {
      question: "What name did they call the land they bought with the money which Judas returned?",
      options: ["Golgotha", "Field of blood", "Land of skull"],
      correctAnswer: 1
    },
    {
      question: "Where was Jesus crucified?",
      options: ["Goshen", "Moriah", "Golgotha"],
      correctAnswer: 2
    },
    {
      question: "What is the name of the high priest's servant which Peter cut his ear?",
      options: ["Malchus", "Mark", "Julius"],
      correctAnswer: 0
    },
    {
      question: "How much did Judas Iscariot betray Jesus Christ for?",
      options: ["20 pieces of silver", "30 pieces of silver", "40 pieces of silver"],
      correctAnswer: 1
    },
    {
      question: "According to Jesus Christ in Matthew 5:22, what is the consequence of calling someone a fool?",
      options: ["Danger of hell", "Danger of council", "Danger of judgment"],
      correctAnswer: 0
    },
    {
      question: "Where did God change Jacob's name to Israel?",
      options: ["Bethel", "Luz", "Jabbok"],
      correctAnswer: 2
    }

  ];

  await Question.insertMany(questions);
  console.log("✅ Quiz questions initialized");
};

// Initialize questions on startup
initializeQuestions();

// Validation middleware
const validateRegistration = [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('gender').isIn(['Male', 'Female']).withMessage('Invalid gender'),
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('availableAllStages').isBoolean().withMessage('Please specify availability'),
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

// ============= CBT QUIZ ROUTES =============

// GET - Check quiz session status
app.get('/api/quiz/session/:phoneNumber', async (req, res) => {
  try {
    const session = await QuizSession.findOne({
      phoneNumber: req.params.phoneNumber,
    }).populate('answers.questionId');

    if (!session) {
      return res.json({
        success: true,
        hasSession: false,
        message: 'No active quiz session found',
      });
    }

    // Check if session has timed out
    const now = new Date();
    const sessionStartTime = new Date(session.startTime);
    const timeElapsed = now - sessionStartTime;
    const timeRemaining = Math.max(0, 1200000 - timeElapsed); // 20 minutes

    if (timeRemaining <= 0 && session.status === 'active') {
      // Auto-complete session due to timeout
      await completeQuizSession(session._id, 'timeout');
      return res.json({
        success: true,
        hasSession: true,
        status: 'timeout',
        message: 'Quiz session has timed out',
        session: await QuizSession.findById(session._id),
      });
    }

    res.json({
      success: true,
      hasSession: true,
      timeRemaining,
      session,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking quiz session',
      error: error.message,
    });
  }
});

// POST - Start quiz session
app.post('/api/quiz/start', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Check if user is registered
    const registration = await Registration.findOne({ phoneNumber });
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'User not registered',
      });
    }

    // Check if user already has a completed session
    const existingSession = await QuizSession.findOne({
      phoneNumber,
      status: { $in: ['completed', 'timeout'] },
    });

    if (existingSession) {
      return res.status(400).json({
        success: false,
        message: 'Quiz attempt already completed',
        session: existingSession,
      });
    }

    // Check if user has an active session
    const activeSession = await QuizSession.findOne({
      phoneNumber,
      status: 'active',
    });

    if (activeSession) {
      return res.json({
        success: true,
        message: 'Resuming existing quiz session',
        session: activeSession,
      });
    }

    // Get random questions
    const questions = await Question.find({ active: true });
    const shuffledQuestions = questions.sort(() => 0.5 - Math.random());

    // Create new quiz session
    const session = new QuizSession({
      phoneNumber,
      fullName: registration.fullName,
      email: registration.email || '',
      startTime: new Date(),
      totalQuestions: shuffledQuestions.length,
      answers: shuffledQuestions.map(q => ({
        questionId: q._id,
        selectedAnswer: null,
        isCorrect: false,
      })),
    });

    await session.save();

    res.json({
      success: true,
      message: 'Quiz session started successfully',
      session,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error starting quiz session',
      error: error.message,
    });
  }
});

// GET - Get quiz questions for session
app.get('/api/quiz/questions/:sessionId', async (req, res) => {
  try {
    const session = await QuizSession.findById(req.params.sessionId)
      .populate('answers.questionId');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Quiz session not found',
      });
    }

    // Check if session is still active
    if (session.status !== 'active') {
      return res.json({
        success: true,
        questions: [],
        session,
        message: 'Quiz session is no longer active',
      });
    }

    const questions = session.answers.map(answer => ({
      _id: answer.questionId._id,
      question: answer.questionId.question,
      options: answer.questionId.options,
      selectedAnswer: answer.selectedAnswer,
    }));

    res.json({
      success: true,
      questions,
      session,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching quiz questions',
      error: error.message,
    });
  }
});

// POST - Submit answer
app.post('/api/quiz/answer', async (req, res) => {
  try {
    const { sessionId, questionId, selectedAnswer } = req.body;

    const session = await QuizSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Quiz session not found',
      });
    }

    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Quiz session is not active',
      });
    }

    // Find and update the answer
    const answerIndex = session.answers.findIndex(
      a => a.questionId.toString() === questionId
    );

    if (answerIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Question not found in session',
      });
    }

    // Get the correct answer
    const question = await Question.findById(questionId);
    const isCorrect = selectedAnswer === question.correctAnswer;

    session.answers[answerIndex].selectedAnswer = selectedAnswer;
    session.answers[answerIndex].isCorrect = isCorrect;

    await session.save();

    res.json({
      success: true,
      message: 'Answer submitted successfully',
      isCorrect,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error submitting answer',
      error: error.message,
    });
  }
});

// Helper function to complete quiz session
const completeQuizSession = async (sessionId, status = 'completed') => {
  const session = await QuizSession.findById(sessionId);
  if (!session) return null;

  const score = session.answers.filter(a => a.isCorrect).length;
  const now = new Date();
  const timeTaken = now - new Date(session.startTime);

  session.status = status;
  session.score = score;
  session.completedAt = now;
  session.timeTaken = timeTaken;

  await session.save();
  return session;
};

// POST - Submit quiz
app.post('/api/quiz/submit', async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await completeQuizSession(sessionId, 'completed');
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Quiz session not found',
      });
    }

    res.json({
      success: true,
      message: 'Quiz submitted successfully',
      session,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error submitting quiz',
      error: error.message,
    });
  }
});

// GET - Get quiz results
app.get('/api/quiz/results', async (req, res) => {
  try {
    const results = await QuizSession.find({
      status: { $in: ['completed', 'timeout'] },
    })
    .select('fullName phoneNumber email score totalQuestions timeTaken completedAt status')
    .sort({ completedAt: -1 });

    const formattedResults = results.map(result => ({
      fullName: result.fullName,
      phoneNumber: result.phoneNumber,
      email: result.email,
      score: result.score,
      totalQuestions: result.totalQuestions,
      percentage: ((result.score / result.totalQuestions) * 100).toFixed(2),
      timeTaken: Math.floor(result.timeTaken / 1000), // Convert to seconds
      completedAt: result.completedAt,
      status: result.status,
    }));

    res.json({
      success: true,
      count: formattedResults.length,
      data: formattedResults,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching quiz results',
      error: error.message,
    });
  }
});

// GET - Get user's quiz result
app.get('/api/quiz/result/:phoneNumber', async (req, res) => {
  try {
    const result = await QuizSession.findOne({
      phoneNumber: req.params.phoneNumber,
      status: { $in: ['completed', 'timeout'] },
    }).populate('answers.questionId');

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'No quiz result found for this user',
      });
    }

    res.json({
      success: true,
      data: {
        fullName: result.fullName,
        phoneNumber: result.phoneNumber,
        email: result.email,
        score: result.score,
        totalQuestions: result.totalQuestions,
        percentage: ((result.score / result.totalQuestions) * 100).toFixed(2),
        timeTaken: Math.floor(result.timeTaken / 1000),
        completedAt: result.completedAt,
        status: result.status,
        answers: result.answers.map(answer => ({
          question: answer.questionId.question,
          options: answer.questionId.options,
          correctAnswer: answer.questionId.correctAnswer,
          selectedAnswer: answer.selectedAnswer,
          isCorrect: answer.isCorrect,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching quiz result',
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