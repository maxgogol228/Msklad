const db = require("./db");

async function initDb() {
  try {
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT,
        access_key TEXT,
        approved BOOLEAN DEFAULT false
        );
    `);
    await db.query(`
      INSERT INTO users(name, access_key, approved)
      VALUES ('admin', 'admin123', true)
      ON CONFLICT DO NOTHING
    `);

    await db.query(`
      DELETE FROM users;
    `);
      
    await db.query(`
      INSERT INTO users(name, access_key, approved)
      VALUES ('admin', 'admin123', true);
    `);
    
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
      CREATE TABLE IF NOT EXISTS device_consumables (
        id SERIAL PRIMARY KEY,
        device_id INT,
        consumable_id INT,
        quantity INT
      );
    `);

    await db.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS min_quantity INT;`);
    await db.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS order_link TEXT;`);
    await db.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS image TEXT;`);

    console.log("БД инициализирована");
  } catch (err) {
    console.error("Ошибка БД:", err);
  }
}

module.exports = initDb;
