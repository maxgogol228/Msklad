const db = require("./db");

module.exports = async function initDb() {
  // Проверяем существование таблицы users
  const tableCheck = await db.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'users'
    );
  `);

  const tableExists = tableCheck.rows[0].exists;

  if (!tableExists) {
    // Создаем новую таблицу с колонкой login
    await db.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        login TEXT UNIQUE,
        access_key TEXT,
        approved BOOLEAN DEFAULT false,
        is_admin BOOLEAN DEFAULT false
      );
    `);
  } else {
    // Проверяем, есть ли колонка name (старая структура)
    const columnCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'name'
      );
    `);

    if (columnCheck.rows[0].exists) {
      // Переименовываем name в login
      await db.query(`ALTER TABLE users RENAME COLUMN name TO login;`);
      console.log('Renamed column name to login');
    }
  }

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

  // Создаем таблицу snapshots если её нет
  await db.query(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id SERIAL PRIMARY KEY,
      data JSONB,
      user_name TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  // Добавьте эти ALTER TABLE запросы после создания таблиц:

// Добавляем колонку min_quantity если её нет
  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='items' AND column_name='min_quantity'
      ) THEN
        ALTER TABLE items ADD COLUMN min_quantity INTEGER;
      END IF;
    END $$;
  `);
  
  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='consumables' AND column_name='min_quantity'
      ) THEN
        ALTER TABLE consumables ADD COLUMN min_quantity INTEGER;
      END IF;
    END $$;
  `);

  // Первый админ
  const admin = await db.query("SELECT * FROM users WHERE login='admin'");

  if (!admin.rows.length) {
    await db.query(`
      INSERT INTO users(login, access_key, approved, is_admin)
      VALUES ('admin','admin123',true,true)
    `);
    console.log('Admin user created');
  }

  console.log('Database initialized successfully');
};
