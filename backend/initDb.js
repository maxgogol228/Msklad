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
    const columnCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'name'
      );
    `);

    if (columnCheck.rows[0].exists) {
      await db.query(`ALTER TABLE users RENAME COLUMN name TO login;`);
      console.log('Renamed column name to login');
    }
  }

  // Создаем таблицу категорий
  await db.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('item', 'consumable')),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      name TEXT,
      quantity INT DEFAULT 0,
      min_quantity INT,
      category_id INT REFERENCES categories(id) ON DELETE SET NULL
    );
  `);

  // Добавляем колонки если их нет
  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='items' AND column_name='min_quantity'
      ) THEN
        ALTER TABLE items ADD COLUMN min_quantity INTEGER;
      END IF;
      
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='items' AND column_name='category_id'
      ) THEN
        ALTER TABLE items ADD COLUMN category_id INTEGER REFERENCES categories(id);
      END IF;
    END $$;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS consumables (
      id SERIAL PRIMARY KEY,
      name TEXT,
      quantity INT DEFAULT 0,
      min_quantity INT,
      category_id INT REFERENCES categories(id) ON DELETE SET NULL
    );
  `);

  // Добавляем колонки для consumables
  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='consumables' AND column_name='min_quantity'
      ) THEN
        ALTER TABLE consumables ADD COLUMN min_quantity INTEGER;
      END IF;
      
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='consumables' AND column_name='category_id'
      ) THEN
        ALTER TABLE consumables ADD COLUMN category_id INTEGER REFERENCES categories(id);
      END IF;
    END $$;
  `);

  // Обновляем таблицу device_items для поддержки расходников
  await db.query(`
    CREATE TABLE IF NOT EXISTS device_items (
      id SERIAL PRIMARY KEY,
      device_id INT REFERENCES devices(id) ON DELETE CASCADE,
      item_id INT REFERENCES items(id) ON DELETE SET NULL,
      consumable_id INT REFERENCES consumables(id) ON DELETE SET NULL,
      quantity INT DEFAULT 1,
      item_type TEXT CHECK (item_type IN ('item', 'consumable'))
    );
  `);

  // Добавляем новые колонки в device_items если их нет
  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='device_items' AND column_name='consumable_id'
      ) THEN
        ALTER TABLE device_items ADD COLUMN consumable_id INTEGER REFERENCES consumables(id);
      END IF;
      
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='device_items' AND column_name='item_type'
      ) THEN
        ALTER TABLE device_items ADD COLUMN item_type TEXT;
      END IF;
    END $$;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS devices (
      id SERIAL PRIMARY KEY,
      name TEXT
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY,
      action TEXT,
      created_at TIMESTAMP DEFAULT NOW()
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
