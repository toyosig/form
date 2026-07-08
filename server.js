require("dotenv").config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.connect()
  .then(() => console.log("PostgreSQL Connected"))
  .catch((err) => console.error("PostgreSQL Connection Error:", err));

const createTables = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS registrations (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female')),
        phone_number VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(255),
        church_name VARCHAR(255),
        available_all_stages BOOLEAN NOT NULL,
        registration_date TIMESTAMP DEFAULT NOW(),
        terms_accepted BOOLEAN NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        options TEXT[] NOT NULL,
        correct_answer INTEGER NOT NULL,
        active BOOLEAN DEFAULT true
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_sessions (
        id SERIAL PRIMARY KEY,
        phone_number VARCHAR(50) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) DEFAULT '',
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        time_remaining INTEGER DEFAULT 1200000,
        score INTEGER DEFAULT 0,
        total_questions INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'timeout')),
        completed_at TIMESTAMP,
        time_taken INTEGER
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_answers (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES quiz_sessions(id) ON DELETE CASCADE,
        question_id INTEGER REFERENCES questions(id),
        selected_answer INTEGER,
        is_correct BOOLEAN
      )
    `);

    console.log("Tables created successfully");
  } catch (error) {
    console.error("Error creating tables:", error);
  } finally {
    client.release();
  }
};

createTables();

const mapRegistration = (row) => ({
  _id: row.id,
  id: row.id,
  fullName: row.full_name,
  gender: row.gender,
  phoneNumber: row.phone_number,
  email: row.email,
  churchName: row.church_name,
  availableAllStages: row.available_all_stages,
  registrationDate: row.registration_date,
  termsAccepted: row.terms_accepted,
});

const mapQuestion = (row) => ({
  _id: row.id,
  id: row.id,
  question: row.question,
  options: row.options,
  correctAnswer: row.correct_answer,
  active: row.active,
});

const mapSession = (row) => ({
  _id: row.id,
  id: row.id,
  phoneNumber: row.phone_number,
  fullName: row.full_name,
  email: row.email,
  startTime: row.start_time,
  endTime: row.end_time,
  timeRemaining: row.time_remaining,
  score: row.score,
  totalQuestions: row.total_questions,
  status: row.status,
  completedAt: row.completed_at,
  timeTaken: row.time_taken,
});

const initializeQuestions = async (forceReset = false) => {
  try {
    const result = await pool.query('SELECT COUNT(*)::int AS count FROM questions');
    const count = result.rows[0].count;

    if (count > 0 && !forceReset) {
      console.log(`${count} quiz questions already exist`);
      return;
    }

    if (forceReset && count > 0) {
      await pool.query('DELETE FROM questions');
      console.log(`Cleared ${count} existing questions`);
    }

    const questions = [
      {
        question: "What are the names of Moses' parents?",
        options: ["Abraham and Sarah", "Levi and Tarmah", "Amram and Jochebed"],
        correctAnswer: 2
      },
      {
        question: "Who was the first king of Israel?",
        options: ["David", "Saul", "Solomon", "Samuel"],
        correctAnswer: 1
      },
      {
        question: "How many days did it rain during the flood in Noah's time?",
        options: ["30 days", "40 days", "50 days", "60 days"],
        correctAnswer: 1
      },
      {
        question: "What was the name of Abraham's wife?",
        options: ["Rachel", "Rebecca", "Sarah", "Leah"],
        correctAnswer: 2
      },
      {
        question: "Which prophet was swallowed by a great fish?",
        options: ["Jonah", "Elijah", "Isaiah", "Jeremiah"],
        correctAnswer: 0
      },
    ];

    for (const q of questions) {
      await pool.query(
        'INSERT INTO questions (question, options, correct_answer, active) VALUES ($1, $2, $3, true)',
        [q.question, q.options, q.correctAnswer]
      );
    }

    console.log(`Successfully initialized ${questions.length} quiz questions`);
  } catch (error) {
    console.error("Error initializing questions:", error);
  }
};

initializeQuestions();

const validateRegistration = [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('gender').isIn(['Male', 'Female']).withMessage('Invalid gender'),
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('availableAllStages').isBoolean().withMessage('Please specify availability'),
  body('termsAccepted').equals('true').withMessage('Terms must be accepted'),
];

app.get('/api/registrations', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM registrations ORDER BY registration_date DESC'
    );
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows.map(mapRegistration),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching registrations',
      error: error.message,
    });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM registrations WHERE phone_number = $1',
      [req.body.phoneNumber]
    );
    if (result.rows.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: mapRegistration(result.rows[0]),
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

app.get('/api/registrations/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM registrations WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }
    res.json({
      success: true,
      data: mapRegistration(result.rows[0]),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching registration',
      error: error.message,
    });
  }
});

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

    const existing = await pool.query(
      'SELECT id FROM registrations WHERE phone_number = $1',
      [req.body.phoneNumber]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered',
      });
    }

    const result = await pool.query(
      `INSERT INTO registrations (full_name, gender, phone_number, email, church_name, available_all_stages, terms_accepted)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        req.body.fullName,
        req.body.gender,
        req.body.phoneNumber,
        req.body.email || null,
        req.body.churchName || null,
        req.body.availableAllStages,
        req.body.termsAccepted === 'true' || req.body.termsAccepted === true,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      data: mapRegistration(result.rows[0]),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating registration',
      error: error.message,
    });
  }
});

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

    const result = await pool.query(
      `UPDATE registrations
       SET full_name = $1, gender = $2, phone_number = $3, email = $4,
           church_name = $5, available_all_stages = $6, terms_accepted = $7
       WHERE id = $8 RETURNING *`,
      [
        req.body.fullName,
        req.body.gender,
        req.body.phoneNumber,
        req.body.email || null,
        req.body.churchName || null,
        req.body.availableAllStages,
        req.body.termsAccepted === 'true' || req.body.termsAccepted === true,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }

    res.json({
      success: true,
      message: 'Registration updated successfully',
      data: mapRegistration(result.rows[0]),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating registration',
      error: error.message,
    });
  }
});

app.delete('/api/registrations/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM registrations WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
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

app.get('/api/quiz/session/:phoneNumber', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM quiz_sessions WHERE phone_number = $1 ORDER BY start_time DESC LIMIT 1',
      [req.params.phoneNumber]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        hasSession: false,
        message: 'No active quiz session found',
      });
    }

    const sessionRow = result.rows[0];
    const now = new Date();
    const sessionStartTime = new Date(sessionRow.start_time);
    const timeElapsed = now - sessionStartTime;
    const timeRemaining = Math.max(0, 1200000 - timeElapsed);

    if (timeRemaining <= 0 && sessionRow.status === 'active') {
      const completed = await completeQuizSession(sessionRow.id, 'timeout');
      return res.json({
        success: true,
        hasSession: true,
        status: 'timeout',
        message: 'Quiz session has timed out',
        session: completed,
      });
    }

    const answersResult = await pool.query(
      `SELECT qa.*, q.question, q.options, q.correct_answer
       FROM quiz_answers qa
       JOIN questions q ON q.id = qa.question_id
       WHERE qa.session_id = $1`,
      [sessionRow.id]
    );

    const session = mapSession(sessionRow);
    session.answers = answersResult.rows.map(a => ({
      _id: a.id,
      questionId: {
        _id: a.question_id,
        id: a.question_id,
        question: a.question,
        options: a.options,
        correctAnswer: a.correct_answer,
      },
      selectedAnswer: a.selected_answer,
      isCorrect: a.is_correct,
    }));

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

app.post('/api/quiz/start', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    const regResult = await pool.query(
      'SELECT * FROM registrations WHERE phone_number = $1',
      [phoneNumber]
    );
    if (regResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not registered',
      });
    }
    const registration = regResult.rows[0];

    const existingSession = await pool.query(
      `SELECT * FROM quiz_sessions
       WHERE phone_number = $1 AND status IN ('completed', 'timeout')`,
      [phoneNumber]
    );
    if (existingSession.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Quiz attempt already completed',
        session: mapSession(existingSession.rows[0]),
      });
    }

    const activeSession = await pool.query(
      `SELECT * FROM quiz_sessions
       WHERE phone_number = $1 AND status = 'active'`,
      [phoneNumber]
    );
    if (activeSession.rows.length > 0) {
      const answersResult = await pool.query(
        `SELECT qa.*, q.question, q.options, q.correct_answer
         FROM quiz_answers qa
         JOIN questions q ON q.id = qa.question_id
         WHERE qa.session_id = $1`,
        [activeSession.rows[0].id]
      );

      const session = mapSession(activeSession.rows[0]);
      session.answers = answersResult.rows.map(a => ({
        _id: a.id,
        questionId: {
          _id: a.question_id,
          id: a.question_id,
          question: a.question,
          options: a.options,
          correctAnswer: a.correct_answer,
        },
        selectedAnswer: a.selected_answer,
        isCorrect: a.is_correct,
      }));

      return res.json({
        success: true,
        message: 'Resuming existing quiz session',
        session,
      });
    }

    const questionsResult = await pool.query(
      'SELECT * FROM questions WHERE active = true ORDER BY RANDOM()'
    );
    const shuffledQuestions = questionsResult.rows;

    const sessionResult = await pool.query(
      `INSERT INTO quiz_sessions (phone_number, full_name, email, start_time, total_questions, status)
       VALUES ($1, $2, $3, NOW(), $4, 'active') RETURNING *`,
      [phoneNumber, registration.full_name, registration.email || '', shuffledQuestions.length]
    );

    const sessionRow = sessionResult.rows[0];

    for (const q of shuffledQuestions) {
      await pool.query(
        `INSERT INTO quiz_answers (session_id, question_id, selected_answer, is_correct)
         VALUES ($1, $2, NULL, false)`,
        [sessionRow.id, q.id]
      );
    }

    const answersResult = await pool.query(
      `SELECT qa.*, q.question, q.options, q.correct_answer
       FROM quiz_answers qa
       JOIN questions q ON q.id = qa.question_id
       WHERE qa.session_id = $1`,
      [sessionRow.id]
    );

    const session = mapSession(sessionRow);
    session.answers = answersResult.rows.map(a => ({
      _id: a.id,
      questionId: {
        _id: a.question_id,
        id: a.question_id,
        question: a.question,
        options: a.options,
        correctAnswer: a.correct_answer,
      },
      selectedAnswer: a.selected_answer,
      isCorrect: a.is_correct,
    }));

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

app.get('/api/quiz/questions/:sessionId', async (req, res) => {
  try {
    const sessionResult = await pool.query(
      'SELECT * FROM quiz_sessions WHERE id = $1',
      [req.params.sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quiz session not found',
      });
    }

    const sessionRow = sessionResult.rows[0];

    if (sessionRow.status !== 'active') {
      return res.json({
        success: true,
        questions: [],
        session: mapSession(sessionRow),
        message: 'Quiz session is no longer active',
      });
    }

    const answersResult = await pool.query(
      `SELECT qa.*, q.question, q.options
       FROM quiz_answers qa
       JOIN questions q ON q.id = qa.question_id
       WHERE qa.session_id = $1`,
      [req.params.sessionId]
    );

    const questions = answersResult.rows.map(a => ({
      _id: a.question_id,
      id: a.question_id,
      question: a.question,
      options: a.options,
      selectedAnswer: a.selected_answer,
    }));

    res.json({
      success: true,
      questions,
      session: mapSession(sessionRow),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching quiz questions',
      error: error.message,
    });
  }
});

app.post('/api/quiz/answer', async (req, res) => {
  try {
    const { sessionId, questionId, selectedAnswer } = req.body;

    const sessionResult = await pool.query(
      'SELECT * FROM quiz_sessions WHERE id = $1 AND status = $2',
      [sessionId, 'active']
    );
    if (sessionResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Quiz session is not active',
      });
    }

    const questionResult = await pool.query(
      'SELECT correct_answer FROM questions WHERE id = $1',
      [questionId]
    );
    if (questionResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Question not found',
      });
    }

    const isCorrect = selectedAnswer === questionResult.rows[0].correct_answer;

    const answerResult = await pool.query(
      `UPDATE quiz_answers
       SET selected_answer = $1, is_correct = $2
       WHERE session_id = $3 AND question_id = $4 RETURNING *`,
      [selectedAnswer, isCorrect, sessionId, questionId]
    );

    if (answerResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Question not found in session',
      });
    }

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

const completeQuizSession = async (sessionId, status = 'completed') => {
  const sessionResult = await pool.query(
    'SELECT * FROM quiz_sessions WHERE id = $1',
    [sessionId]
  );
  if (sessionResult.rows.length === 0) return null;

  const scoreResult = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE is_correct = true)::int AS score,
            COUNT(*)::int AS total
     FROM quiz_answers WHERE session_id = $1`,
    [sessionId]
  );

  const now = new Date();
  const startTime = new Date(sessionResult.rows[0].start_time);
  const timeTaken = now - startTime;

  await pool.query(
    `UPDATE quiz_sessions
     SET status = $1, score = $2, total_questions = $3,
         completed_at = NOW(), time_taken = $4
     WHERE id = $5`,
    [status, scoreResult.rows[0].score, scoreResult.rows[0].total, timeTaken, sessionId]
  );

  const updatedResult = await pool.query(
    'SELECT * FROM quiz_sessions WHERE id = $1',
    [sessionId]
  );

  const answersResult = await pool.query(
    `SELECT qa.*, q.question, q.options, q.correct_answer
     FROM quiz_answers qa
     JOIN questions q ON q.id = qa.question_id
     WHERE qa.session_id = $1`,
    [sessionId]
  );

  const session = mapSession(updatedResult.rows[0]);
  session.answers = answersResult.rows.map(a => ({
    _id: a.id,
    questionId: {
      _id: a.question_id,
      id: a.question_id,
      question: a.question,
      options: a.options,
      correctAnswer: a.correct_answer,
    },
    selectedAnswer: a.selected_answer,
    isCorrect: a.is_correct,
  }));

  return session;
};

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

app.get('/api/quiz/results', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM quiz_sessions
       WHERE status IN ('completed', 'timeout')
       ORDER BY completed_at DESC`
    );

    const formattedResults = result.rows.map(row => ({
      fullName: row.full_name,
      phoneNumber: row.phone_number,
      email: row.email,
      score: row.score,
      totalQuestions: row.total_questions,
      percentage: row.total_questions > 0
        ? ((row.score / row.total_questions) * 100).toFixed(2)
        : '0.00',
      timeTaken: row.time_taken ? Math.floor(row.time_taken / 1000) : 0,
      completedAt: row.completed_at,
      status: row.status,
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

app.get('/api/quiz/result/:phoneNumber', async (req, res) => {
  try {
    const sessionResult = await pool.query(
      `SELECT * FROM quiz_sessions
       WHERE phone_number = $1 AND status IN ('completed', 'timeout')
       ORDER BY completed_at DESC LIMIT 1`,
      [req.params.phoneNumber]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No quiz result found for this user',
      });
    }

    const sessionRow = sessionResult.rows[0];

    const answersResult = await pool.query(
      `SELECT qa.*, q.question, q.options, q.correct_answer
       FROM quiz_answers qa
       JOIN questions q ON q.id = qa.question_id
       WHERE qa.session_id = $1`,
      [sessionRow.id]
    );

    res.json({
      success: true,
      data: {
        fullName: sessionRow.full_name,
        phoneNumber: sessionRow.phone_number,
        email: sessionRow.email,
        score: sessionRow.score,
        totalQuestions: sessionRow.total_questions,
        percentage: sessionRow.total_questions > 0
          ? ((sessionRow.score / sessionRow.total_questions) * 100).toFixed(2)
          : '0.00',
        timeTaken: sessionRow.time_taken ? Math.floor(sessionRow.time_taken / 1000) : 0,
        completedAt: sessionRow.completed_at,
        status: sessionRow.status,
        answers: answersResult.rows.map(a => ({
          question: a.question,
          options: a.options,
          correctAnswer: a.correct_answer,
          selectedAnswer: a.selected_answer,
          isCorrect: a.is_correct,
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

app.get('/health', (req, res) => {
  res.json({ status: 'Server is running!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
