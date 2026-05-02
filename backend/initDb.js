const db = require("./db");

async function initDb() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        name TEXT,
        quantity INT,
        min_quantity INT,
        order_link TEXT,
        image TEXT
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS consumables (
        id SERIAL PRIMARY KEY,
        name TEXT,
        quantity INT,
        min_quantity INT,
        order_link TEXT
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id SERIAL PRIMARY KEY,
        name TEXT,
        components JSONB
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id SERIAL PRIMARY KEY,
        data JSONB,
        user_name TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        action TEXT,
        user_name TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("БД инициализирована");
  } catch (err) {
    console.error("Ошибка БД:", err);
  }
}

module.exports = initDb;
