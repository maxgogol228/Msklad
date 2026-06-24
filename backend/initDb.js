const db = require("./db");

module.exports = async function initDb() {
  console.log('========================================');
  console.log('Starting database initialization...');
  console.log('========================================');

  // ========================
  // USERS TABLE
  // ========================
  console.log('Checking users table...');
  
  const tableCheck = await db.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'users'
    );
  `);

  if (!tableCheck.rows[0].exists) {
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
    console.log('Users table exists, checking columns...');
    const userColumns = ['login', 'access_key', 'approved', 'is_admin', 'created_at'];
    for (const col of userColumns) {
      try {
        const check = await db.query(
          `SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name='users' AND column_name=$1)`,
          [col]
        );
        if (!check.rows[0].exists) {
          const types = {
            login: 'TEXT', access_key: 'TEXT', approved: 'BOOLEAN DEFAULT false',
            is_admin: 'BOOLEAN DEFAULT false', created_at: 'TIMESTAMP DEFAULT NOW()'
          };
          await db.query(`ALTER TABLE users ADD COLUMN ${col} ${types[col]}`);
        }
      } catch (err) {}
    }
    try {
      const nameCheck = await db.query(`SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name='users' AND column_name='name')`);
      if (nameCheck.rows[0].exists) {
        const loginCheck = await db.query(`SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name='users' AND column_name='login')`);
        if (!loginCheck.rows[0].exists) {
          await db.query(`ALTER TABLE users RENAME COLUMN name TO login;`);
        }
      }
    } catch (err) {}
  }

  // ========================
  // ONLINE USERS
  // ========================
  await db.query(`
    CREATE TABLE IF NOT EXISTS online_users (
      user_id INT,
      user_login TEXT,
      last_active TIMESTAMP DEFAULT NOW()
    );
  `);

  // ========================
  // TYPING USERS
  // ========================
  await db.query(`
    CREATE TABLE IF NOT EXISTS typing_users (
      id SERIAL PRIMARY KEY,
      user_login TEXT,
      chat_type TEXT DEFAULT 'general',
      recipient_login TEXT,
      last_typed TIMESTAMP DEFAULT NOW()
    );
  `);

  // ========================
  // CATEGORIES
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
  // ITEMS (ЦЕЛЫЕ ЧИСЛА - INT)
  // ========================
  console.log('Checking items table...');
  await db.query(`
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      name TEXT,
      quantity INT DEFAULT 0,
      min_quantity INT,
      category_id INT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  // Гарантируем что колонки INT
  try { await db.query(`ALTER TABLE items ALTER COLUMN quantity TYPE INT`); } catch (e) {}
  try { await db.query(`ALTER TABLE items ALTER COLUMN min_quantity TYPE INT`); } catch (e) {}
  await db.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS min_quantity INT`);
  await db.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS category_id INT`);

  // ========================
  // CONSUMABLES (ДРОБНЫЕ - DECIMAL)
  // ========================
  console.log('Checking consumables table...');
  await db.query(`
    CREATE TABLE IF NOT EXISTS consumables (
      id SERIAL PRIMARY KEY,
      name TEXT,
      quantity DECIMAL(10,3) DEFAULT 0,
      min_quantity DECIMAL(10,3),
      unit TEXT DEFAULT 'шт.',
      category_id INT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);


  await db.query(`
    CREATE TABLE IF NOT EXISTS reserved_devices (
      id SERIAL PRIMARY KEY,
      device_name TEXT,
      quantity INT DEFAULT 1,
      cost DECIMAL(10,2) DEFAULT 0,
      order_number TEXT DEFAULT '',
      customer TEXT DEFAULT '',
      reserved_by TEXT,
      reserved_at TIMESTAMP DEFAULT NOW(),
      shipped BOOLEAN DEFAULT false,
      shipped_at TIMESTAMP
    )
  `);
  // Гарантируем DECIMAL
  try { await db.query(`ALTER TABLE consumables ALTER COLUMN quantity TYPE DECIMAL(10,3)`); } catch (e) {}
  try { await db.query(`ALTER TABLE consumables ALTER COLUMN min_quantity TYPE DECIMAL(10,3)`); } catch (e) {}
  await db.query(`ALTER TABLE consumables ADD COLUMN IF NOT EXISTS min_quantity DECIMAL(10,3)`);
  await db.query(`ALTER TABLE consumables ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'шт.'`);
  await db.query(`ALTER TABLE consumables ADD COLUMN IF NOT EXISTS category_id INT`);

  // ========================
  // DEVICES
  // ========================
  await db.query(`
    CREATE TABLE IF NOT EXISTS devices (
      id SERIAL PRIMARY KEY,
      name TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // ========================
  // DEVICE_ITEMS (DECIMAL для поддержки расходников)
  // ========================
  await db.query(`
    CREATE TABLE IF NOT EXISTS device_items (
      id SERIAL PRIMARY KEY,
      device_id INT,
      item_id INT,
      consumable_id INT,
      quantity DECIMAL(10,3) DEFAULT 1,
      item_type TEXT,
      subtask_name TEXT,
      time_estimate INT DEFAULT 30
    );
  `);
  try { await db.query(`ALTER TABLE device_items ALTER COLUMN quantity TYPE DECIMAL(10,3)`); } catch (e) {}
  await db.query(`ALTER TABLE device_items ADD COLUMN IF NOT EXISTS consumable_id INT`);
  await db.query(`ALTER TABLE device_items ADD COLUMN IF NOT EXISTS item_type TEXT`);
  await db.query(`ALTER TABLE device_items ADD COLUMN IF NOT EXISTS subtask_name TEXT`);
  await db.query(`ALTER TABLE device_items ADD COLUMN IF NOT EXISTS time_estimate INT DEFAULT 30`);

  // ========================
  // ASSEMBLY TASKS
  // ========================
  await db.query(`
    CREATE TABLE IF NOT EXISTS assembly_tasks (
      id SERIAL PRIMARY KEY,
      device_id INT,
      device_name TEXT,
      created_by INT,
      created_by_login TEXT,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP
    );
  `);

  // ========================
  // TASK ITEMS
  // ========================
  await db.query(`
    CREATE TABLE IF NOT EXISTS task_items (
      id SERIAL PRIMARY KEY,
      task_id INT,
      subtask_name TEXT DEFAULT 'Подзадача',
      time_estimate INT DEFAULT 240,
      deadline TIMESTAMP,
      assigned_to INT,
      assigned_login TEXT,
      status TEXT DEFAULT 'pending',
      completed_at TIMESTAMP,
      completed_by INT,
      sort_order INT DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await db.query(`ALTER TABLE task_items ADD COLUMN IF NOT EXISTS subtask_name TEXT`);
  await db.query(`ALTER TABLE task_items ADD COLUMN IF NOT EXISTS time_estimate INT DEFAULT 240`);
  await db.query(`ALTER TABLE task_items ADD COLUMN IF NOT EXISTS deadline TIMESTAMP`);
  await db.query(`ALTER TABLE task_items ADD COLUMN IF NOT EXISTS assigned_to INT`);
  await db.query(`ALTER TABLE task_items ADD COLUMN IF NOT EXISTS assigned_login TEXT`);
  await db.query(`ALTER TABLE task_items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'`);
  await db.query(`ALTER TABLE task_items ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP`);
  await db.query(`ALTER TABLE task_items ADD COLUMN IF NOT EXISTS completed_by INT`);
  await db.query(`ALTER TABLE task_items ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 1`);

  // ========================
  // SUBTASK COMPONENTS (DECIMAL)
  // ========================
  await db.query(`
    CREATE TABLE IF NOT EXISTS subtask_components (
      id SERIAL PRIMARY KEY,
      task_item_id INT,
      item_type TEXT,
      component_id INT,
      component_name TEXT,
      quantity DECIMAL(10,3) DEFAULT 1,
      unit TEXT DEFAULT 'шт.'
    );
  `);
  try { await db.query(`ALTER TABLE subtask_components ALTER COLUMN quantity TYPE DECIMAL(10,3)`); } catch (e) {}

  // ========================
  // ROUTINE TASKS
  // ========================
  await db.query(`
    CREATE TABLE IF NOT EXISTS routine_tasks (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      time_estimate INT DEFAULT 60,
      deadline TIMESTAMP,
      assigned_to INT,
      assigned_login TEXT,
      status TEXT DEFAULT 'pending',
      created_by INT,
      created_by_login TEXT,
      completed_at TIMESTAMP,
      completed_by INT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // ========================
  // ASSEMBLED DEVICES
  // ========================
  await db.query(`
    CREATE TABLE IF NOT EXISTS assembled_devices (
      id SERIAL PRIMARY KEY,
      device_id INT,
      device_name TEXT,
      component_name TEXT,
      component_type TEXT DEFAULT 'device',
      quantity INT DEFAULT 1,
      assembled_by TEXT,
      assembled_from_task_id INT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // ========================
  // NOTIFICATIONS
  // ========================
  await db.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INT,
      user_login TEXT,
      message TEXT,
      task_id INT,
      task_item_id INT,
      notification_type TEXT DEFAULT 'task',
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_type TEXT DEFAULT 'task'`);

  // ========================
  // CHAT MESSAGES
  // ========================
  await db.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      message TEXT NOT NULL,
      user_login TEXT NOT NULL,
      user_id INTEGER,
      chat_type TEXT DEFAULT 'general',
      recipient_login TEXT,
      recipient_id INT,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await db.query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS chat_type TEXT DEFAULT 'general'`);
  await db.query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS recipient_login TEXT`);
  await db.query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS recipient_id INT`);
  await db.query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false`);

  // ========================
  // LOGS
  // ========================
  await db.query(`
    CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY,
      action TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // ========================
  // SNAPSHOTS
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
  // SUGGESTIONS
  // ========================
  await db.query(`
    CREATE TABLE IF NOT EXISTS suggestions (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      user_login TEXT,
      user_id INT,
      status TEXT DEFAULT 'new',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // ========================
  // BACKUPS
  // ========================
  await db.query(`
    CREATE TABLE IF NOT EXISTS backups (
      id SERIAL PRIMARY KEY,
      data JSONB,
      created_by TEXT,
      size_bytes INT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // ========================
  // RESTORE REQUESTS
  // ========================
  await db.query(`
    CREATE TABLE IF NOT EXISTS restore_requests (
      id SERIAL PRIMARY KEY,
      user_login TEXT,
      user_id INT,
      file_data JSONB,
      status TEXT DEFAULT 'pending',
      approved_by TEXT,
      approved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

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
      quantity DECIMAL(10,3) DEFAULT 0,
      min_quantity DECIMAL(10,3),
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

  // Добавляем поля для стеллажей
  await db.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS shelf TEXT DEFAULT ''`);
  await db.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS shelf_position TEXT DEFAULT ''`);
  await db.query(`ALTER TABLE consumables ADD COLUMN IF NOT EXISTS shelf TEXT DEFAULT ''`);
  await db.query(`ALTER TABLE consumables ADD COLUMN IF NOT EXISTS shelf_position TEXT DEFAULT ''`);

  // Поля для стоимости
  await db.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0`);
  await db.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS price_per INT DEFAULT 1`);
  await db.query(`ALTER TABLE consumables ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0`);
  await db.query(`ALTER TABLE consumables ADD COLUMN IF NOT EXISTS price_per DECIMAL(10,3) DEFAULT 1`);
  await db.query(`ALTER TABLE assembled_devices ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2) DEFAULT 0`);

  // ========================
  // SUPER ADMIN USER
  // ========================
  console.log('Checking super admin user...');
  const superAdminLogin = process.env.SUPER_ADMIN_LOGIN || 'admin';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123';
  
  const admin = await db.query(
    "SELECT * FROM users WHERE LOWER(login) = LOWER($1)",
    [superAdminLogin]
  );

  if (!admin.rows.length) {
    await db.query(
      "INSERT INTO users(login, access_key, approved, is_admin) VALUES ($1, $2, true, true)",
      [superAdminLogin, superAdminPassword]
    );
    console.log(`✅ Super admin created: ${superAdminLogin}`);
  } else {
    await db.query(
      "UPDATE users SET access_key = $1, is_admin = true, approved = true WHERE LOWER(login) = LOWER($2)",
      [superAdminPassword, superAdminLogin]
    );
    console.log(`✅ Super admin updated: ${superAdminLogin}`);
  }

  // ========================
  // VERIFY
  // ========================
  console.log('----------------------------------------');
  console.log('Verifying database structure...');
  
  const tables = [
    'users', 'online_users', 'typing_users', 'categories',
    'items', 'consumables', 'devices', 'device_items',
    'assembly_tasks', 'task_items', 'subtask_components', 'routine_tasks',
    'assembled_devices', 'notifications', 'chat_messages', 'logs', 'snapshots',
    'suggestions', 'backups', 'restore_requests',
    'archived_items', 'archived_consumables', 'archived_devices'
  ];
  
  for (const table of tables) {
    try {
      const count = await db.query(`SELECT COUNT(*) as c FROM ${table}`);
      console.log(`  ✅ ${table}: ${count.rows[0].c} records`);
    } catch (e) {
      console.log(`  ❌ ${table}: ${e.message}`);
    }
  }

  console.log('========================================');
  console.log('✅ Database initialization completed!');
  console.log('========================================');
};
