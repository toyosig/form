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
);

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_answer INTEGER NOT NULL,
  active BOOLEAN DEFAULT true
);

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
);

CREATE TABLE IF NOT EXISTS quiz_answers (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id),
  selected_answer INTEGER,
  is_correct BOOLEAN
);
