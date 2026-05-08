const db = require("./db");

module.exports = async function initDb() {
  console.log('Starting database initialization...');

  // ========================
  // USERS TABLE
  // ========================
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
        is_admin BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Users table created');
  } else {
    // Добавляем недостающие колонки
    const columns = [
      { name: 'login', type: 'TEXT UNIQUE' },
      { name: 'access_key', type: 'TEXT' },
      { name: 'approved', type: 'BOOLEAN DEFAULT false' },
      { name: 'is_admin', type: 'BOOLEAN DEFAULT false' },
      { name: 'created_at', type: 'TIMESTAMP DEFAULT NOW()' }
    ];

    for (const col of columns) {
      try {
        const columnCheck = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = $1
          );
        `, [col.name]);

        if (!columnCheck.rows[0].exists) {
          await db.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
          console.log(`Added column ${col.name} to users table`);
        }
      } catch (err) {
        console.log(`Note: ${err.message}`);
      }
    }

    // Переименовываем name в login если нужно
    try {
      const nameColumnCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'name'
        );
      `);

      if (nameColumnCheck.rows[0].exists) {
        const loginColumnCheck = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'login'
          );
        `);

        if (!loginColumnCheck.rows[0].exists) {
          await db.query(`ALTER TABLE users RENAME COLUMN name TO login;`);
          console.log('Renamed column name to login');
        }
      }
    } catch (err) {
      console.log('Note:', err.message);
    }
  }

  // ========================
  // CATEGORIES TABLE
  // ========================
  await db.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('item', 'consumable')),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // ========================
  // ITEMS TABLE
  // ========================
  await db.query(`
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      name TEXT,
      quantity INT DEFAULT 0,
      min_quantity INT,
      category_id INT REFERENCES categories(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Добавляем колонки в items
  try {
    const itemColumns = ['min_quantity', 'category_id'];
    for (const col of itemColumns) {
      const columnCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'items' AND column_name = $1
        );
      `, [col]);

      if (!columnCheck.rows[0].exists) {
        if (col === 'category_id') {
          await db.query(`ALTER TABLE items ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL`);
        } else {
          await db.query(`ALTER TABLE items ADD COLUMN ${col} INTEGER`);
        }
        console.log(`Added column ${col} to items table`);
      }
    }
  } catch (err) {
    console.log('Note:', err.message);
  }

  // ========================
  // CONSUMABLES TABLE
  // ========================
  await db.query(`
    CREATE TABLE IF NOT EXISTS consumables (
      id SERIAL PRIMARY KEY,
      name TEXT,
      quantity DECIMAL(10,2) DEFAULT 0,
      min_quantity DECIMAL(10,2),
      unit TEXT DEFAULT 'шт.',
      category_id INT REFERENCES categories(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Добавляем колонки в consumables
  try {
    const consColumns = [
      { name: 'min_quantity', type: 'DECIMAL(10,2)' },
      { name: 'unit', type: "TEXT DEFAULT 'шт.'" },
      { name: 'category_id', type: 'INTEGER REFERENCES categories(id) ON DELETE SET NULL' }
    ];
    
    for (const col of consColumns) {
      const columnCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'consumables' AND column_name = $1
        );
      `, [col.name]);

      if (!columnCheck.rows[0].exists) {
        await db.query(`ALTER TABLE consumables ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column ${col.name} to consumables table`);
      }
    }
  } catch (err) {
    console.log('Note:', err.message);
  }

  // ========================
  // DEVICES TABLE
  // ========================
  await db.query(`
    CREATE TABLE IF NOT EXISTS devices (
      id SERIAL PRIMARY KEY,
      name TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // ========================
  // DEVICE_ITEMS TABLE
  // ========================
  await db.query(`
    CREATE TABLE IF NOT EXISTS device_items (
      id SERIAL PRIMARY KEY,
      device_id INT REFERENCES devices(id) ON DELETE CASCADE,
      item_id INT REFERENCES items(id) ON DELETE SET NULL,
      consumable_id INT REFERENCES consumables(id) ON DELETE SET NULL,
      quantity DECIMAL(10,2) DEFAULT 1,
      item_type TEXT CHECK (item_type IN ('item', 'consumable'))
    );
  `);

  // Добавляем колонки в device_items
  try {
    const diColumns = [
      { name: 'consumable_id', type: 'INTEGER REFERENCES consumables(id) ON DELETE SET NULL' },
      { name: 'item_type', type: 'TEXT CHECK (item_type IN (\'item\', \'consumable\'))' }
    ];
    
    for (const col of diColumns) {
      const columnCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'device_items' AND column_name = $1
        );
      `, [col.name]);

      if (!columnCheck.rows[0].exists) {
        await db.query(`ALTER TABLE device_items ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column ${col.name} to device_items table`);
      }
    }
  } catch (err) {
    console.log('Note:', err.message);
  }

  // ========================
  // ARCHIVE TABLES
  // ========================
  await db.query(`
    CREATE TABLE IF NOT EXISTS archived_items (
      id SERIAL PRIMARY KEY,
      original_id INT,
      name TEXT,
      quantity INT DEFAULT 0,
      min_quantity INT,
      category_id INT,
      deleted_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS archived_consumables (
      id SERIAL PRIMARY KEY,
      original_id INT,
      name TEXT,
      quantity DECIMAL(10,2) DEFAULT 0,
      min_quantity DECIMAL(10,2),
      unit TEXT DEFAULT 'шт.',
      category_id INT,
      deleted_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS archived_devices (
      id SERIAL PRIMARY KEY,
      original_id INT,
      name TEXT,
      device_data JSONB,
      deleted_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // ========================
  // LOGS TABLE
  // ========================
  await db.query(`
    CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY,
      action TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // ========================
  // SNAPSHOTS TABLE
  // ========================
  await db.query(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id SERIAL PRIMARY KEY,
      data JSONB,
      user_name TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // ========================
  // CREATE ADMIN USER
  // ========================
  const adminLogin = process.env.ADMIN_LOGIN || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  console.log(`Checking for admin user: ${adminLogin}`);
  
  const admin = await db.query("SELECT * FROM users WHERE login=$1", [adminLogin]);

  if (!admin.rows.length) {
    await db.query(`
      INSERT INTO users(login, access_key, approved, is_admin)
      VALUES ($1, $2, true, true)
    `, [adminLogin, adminPassword]);
    console.log('✅ Admin user created successfully');
  } else {
    // Обновляем пароль админа из переменных окружения (если изменился)
    await db.query(`
      UPDATE users SET access_key = $1, is_admin = true, approved = true 
      WHERE login = $2
    `, [adminPassword, adminLogin]);
    console.log('✅ Admin user updated');
  }

  console.log('✅ Database initialization completed successfully');
};