const db = require("./db");

module.exports = async function initDb() {
  // Исправлено: убрал ALTER TABLE из CREATE TABLE
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      login TEXT UNIQUE,
      access_key TEXT,
      approved BOOLEAN DEFAULT false,
      is_admin BOOLEAN DEFAULT false
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      name TEXT,
      quantity INT DEFAULT 0
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS consumables (
      id SERIAL PRIMARY KEY,
      name TEXT,
      quantity INT DEFAULT 0
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS devices (
      id SERIAL PRIMARY KEY,
      name TEXT
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS device_items (
      id SERIAL PRIMARY KEY,
      device_id INT,
      item_id INT,
      quantity INT
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY,
      action TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // первый админ (исправлено: login вместо name)
  const admin = await db.query("SELECT * FROM users WHERE login='admin'");

  if (!admin.rows.length) {
    await db.query(`
      INSERT INTO users(login, access_key, approved, is_admin)
      VALUES ('admin','admin123',true,true)
    `);
  }
};
