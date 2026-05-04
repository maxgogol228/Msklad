const db = require("./db");

module.exports = async function initDb() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT,
      access_key TEXT,
      approved BOOLEAN DEFAULT false
    );
  `);

  const exists = await db.query(
    "SELECT * FROM users WHERE name='admin'"
  );

  if (!exists.rows.length) {
    await db.query(`
      INSERT INTO users(name, access_key, approved)
      VALUES ('admin', 'admin123', true)
    `);
  }
};
