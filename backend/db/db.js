const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function initDB() {
  try {
    console.log("🔄 Подключение к БД...");
    await pool.query("SELECT NOW()");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        name TEXT,
        type TEXT,
        quantity INT DEFAULT 0,
        critical_min INT DEFAULT 0,
        order_link TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id SERIAL PRIMARY KEY,
        name TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS device_components (
        id SERIAL PRIMARY KEY,
        device_id INT,
        item_id INT,
        quantity INT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        user_name TEXT,
        action TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id SERIAL PRIMARY KEY,
        data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("✅ БД готова");
  } catch (err) {
    console.error("❌ Ошибка БД:", err);
  }
}

module.exports = { pool, initDB };
