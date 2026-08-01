require("dotenv").config();
const { Pool } = require("pg");
const { quizQuestions } = require("./quiz-data");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const countResult = await client.query(
      "SELECT COUNT(*)::int AS count FROM questions"
    );
    const existingCount = countResult.rows[0].count;

    if (existingCount > 0) {
      await client.query(
        "DELETE FROM quiz_answers WHERE question_id IN (SELECT id FROM questions)"
      );
      await client.query("DELETE FROM questions");
      console.log(`Cleared ${existingCount} existing questions`);
    }

    for (const q of quizQuestions) {
      await client.query(
        "INSERT INTO questions (question, options, correct_answer, active) VALUES ($1, $2, $3, true)",
        [q.question, q.options, q.correctAnswer]
      );
    }

    await client.query("COMMIT");
    console.log(`Successfully uploaded ${quizQuestions.length} quiz questions`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error seeding questions:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
