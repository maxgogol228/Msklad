const express = require("express");
const cors = require("cors");
const initDb = require("./initDb");
const db = require("./db");

const app = express();

// Максимально разрешительный CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// routes
app.use("/auth", require("./routes/auth"));
app.use("/users", require("./routes/users"));
app.use("/items", require("./routes/items"));
app.use("/consumables", require("./routes/consumables"));
app.use("/devices", require("./routes/devices"));
app.use("/logs", require("./routes/logs"));
app.use("/categories", require("./routes/categories"));
app.use("/archive", require("./routes/archive"));
app.use("/backup", require("./routes/backup"));
app.use("/chat", require("./routes/chat"));
app.use("/tasks", require("./routes/tasks"));
app.use("/suggestions", require("./routes/suggestions"));
app.use("/assembled", require("./routes/assembled"));
app.use("/restore-full", require("./routes/restore-full"));

app.get("/", (req, res) => {
  res.send("API работает");
});

setInterval(async () => {
  if (!isWorkingTime(new Date())) {
    try {
      await db.query(
        "UPDATE task_items SET deadline = deadline + INTERVAL '1 minute' WHERE status = 'in_progress' AND deadline IS NOT NULL"
      );
      await db.query(
        "UPDATE routine_tasks SET deadline = deadline + INTERVAL '1 minute' WHERE status = 'in_progress' AND deadline IS NOT NULL"
      );
    } catch (e) {}
  }
}, 60000);

// ========================
// ОЧИСТКА ОНЛАЙН-ПОЛЬЗОВАТЕЛЕЙ
// ========================
async function cleanOnlineUsers() {
  try {
    const result = await db.query(`
      DELETE FROM online_users 
      WHERE user_id NOT IN (SELECT id FROM users)
    `);
    if (result.rowCount > 0) {
      console.log(`Очищено online_users: ${result.rowCount} записей несуществующих пользователей`);
    }

    //const oldResult = await db.query(`
      //DELETE FROM online_users 
     // WHERE last_active < NOW() - INTERVAL '24 hours'
   // `);
  //  if (oldResult.rowCount > 0) {
     // console.log(`Очищено online_users: ${oldResult.rowCount} старых записей`);
  //  }

    const typingResult = await db.query(`
      DELETE FROM typing_users 
      WHERE user_login NOT IN (SELECT login FROM users)
    `);
    if (typingResult.rowCount > 0) {
      console.log(`Очищено typing_users: ${typingResult.rowCount} записей`);
    }
  } catch (e) {
    console.error("Ошибка очистки online_users:", e.message);
  }
}

// Запускаем при старте
cleanOnlineUsers();

// Периодическая очистка каждые 5 минут
setInterval(() => {
  cleanOnlineUsers().catch(e => console.error(e));
}, 300000);

// ========================
// ВРЕМЕННЫЙ МАРШРУТ ДЛЯ ИСПРАВЛЕНИЯ БД
// ========================
app.post("/fix-database", async (req, res) => {
  const db = require("./db");
  const results = [];
  
  try {
    const fks = await db.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'device_items' AND tc.constraint_type = 'FOREIGN KEY'
    `);
    results.push({ current_FKs: fks.rows });

    await db.query(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (
          SELECT constraint_name 
          FROM information_schema.table_constraints 
          WHERE table_name = 'device_items' AND constraint_type = 'FOREIGN KEY'
        ) LOOP
          EXECUTE 'ALTER TABLE device_items DROP CONSTRAINT IF EXISTS ' || r.constraint_name;
          RAISE NOTICE 'Dropped: %', r.constraint_name;
        END LOOP;
      END $$;
    `);
    results.push("Все FK удалены");

    const deleted1 = await db.query(`
      DELETE FROM device_items 
      WHERE (item_id IS NOT NULL AND item_id NOT IN (SELECT id FROM items))
    `);
    results.push(`Удалено записей с битыми item_id: ${deleted1.rowCount}`);

    const deleted2 = await db.query(`
      DELETE FROM device_items 
      WHERE (consumable_id IS NOT NULL AND consumable_id NOT IN (SELECT id FROM consumables))
    `);
    results.push(`Удалено записей с битыми consumable_id: ${deleted2.rowCount}`);

    const deleted3 = await db.query(`
      DELETE FROM device_items 
      WHERE (device_id IS NOT NULL AND device_id NOT IN (SELECT id FROM devices))
    `);
    results.push(`Удалено записей с битыми device_id: ${deleted3.rowCount}`);

    const deleted4 = await db.query(`DELETE FROM device_items WHERE device_id IS NULL`);
    results.push(`Удалено записей без device_id: ${deleted4.rowCount}`);

    try {
      await db.query(`
        ALTER TABLE device_items 
        ADD CONSTRAINT device_items_device_id_fkey 
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
      `);
      results.push("✅ FK device_id -> devices ON DELETE CASCADE");
    } catch (e) {
      results.push("❌ FK device_id: " + e.message.split('\n')[0]);
    }

    try {
      await db.query(`
        ALTER TABLE device_items 
        ADD CONSTRAINT device_items_item_id_fkey 
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
      `);
      results.push("✅ FK item_id -> items ON DELETE SET NULL");
    } catch (e) {
      results.push("❌ FK item_id: " + e.message.split('\n')[0]);
    }

    try {
      await db.query(`
        ALTER TABLE device_items 
        ADD CONSTRAINT device_items_consumable_id_fkey 
        FOREIGN KEY (consumable_id) REFERENCES consumables(id) ON DELETE SET NULL
      `);
      results.push("✅ FK consumable_id -> consumables ON DELETE SET NULL");
    } catch (e) {
      results.push("❌ FK consumable_id: " + e.message.split('\n')[0]);
    }

    const count = await db.query("SELECT COUNT(*) as c FROM device_items");
    results.push(`Записей в device_items после очистки: ${count.rows[0].c}`);

    res.json({ success: true, results });
    
  } catch (e) {
    console.error("Fix database error:", e);
    res.status(500).json({ error: e.message, results });
  }
});

app.post("/fix-all-notifications", async (req, res) => {
  const db = require("./db");
  try {
    await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_type TEXT DEFAULT 'task'`);
    
    await db.query(`
      UPDATE notifications 
      SET notification_type = 'chat' 
      WHERE (message LIKE '%сообщение%' OR message LIKE '%чат%' OR message LIKE '%Личное%')
      AND notification_type != 'chat'
    `);
    
    const counts = await db.query(`
      SELECT notification_type, COUNT(*) as count 
      FROM notifications 
      WHERE is_read = false 
      GROUP BY notification_type
    `);
    
    res.json({ success: true, counts: counts.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/direct-sql", async (req, res) => {
  const db = require("./db");
  const { query } = req.body;
  
  try {
    const result = await db.query(query);
    res.json({ rows: result.rows, rowCount: result.rowCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/fix-tasks-tables", async (req, res) => {
  const db = require("./db");
  const results = [];
  
  try {
    await db.query(`DROP TABLE IF EXISTS subtask_components CASCADE`);
    await db.query(`DROP TABLE IF EXISTS task_items CASCADE`);
    await db.query(`DROP TABLE IF EXISTS assembly_tasks CASCADE`);
    await db.query(`DROP TABLE IF EXISTS notifications CASCADE`);
    results.push("Старые таблицы удалены");

    await db.query(`
      CREATE TABLE assembly_tasks (
        id SERIAL PRIMARY KEY,
        device_id INT REFERENCES devices(id) ON DELETE SET NULL,
        device_name TEXT,
        created_by INT,
        created_by_login TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      )
    `);
    results.push("assembly_tasks создана");

    await db.query(`
      CREATE TABLE task_items (
        id SERIAL PRIMARY KEY,
        task_id INT REFERENCES assembly_tasks(id) ON DELETE CASCADE,
        subtask_name TEXT DEFAULT 'Подзадача',
        time_estimate INT DEFAULT 30,
        deadline TIMESTAMP,
        assigned_to INT,
        assigned_login TEXT,
        status TEXT DEFAULT 'pending',
        completed_at TIMESTAMP,
        completed_by INT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    results.push("task_items создана");

    await db.query(`
      CREATE TABLE subtask_components (
        id SERIAL PRIMARY KEY,
        task_item_id INT REFERENCES task_items(id) ON DELETE CASCADE,
        item_type TEXT,
        component_id INT,
        component_name TEXT,
        quantity DECIMAL(10,2) DEFAULT 1,
        unit TEXT DEFAULT 'шт.'
      )
    `);
    results.push("subtask_components создана");

    await db.query(`
      CREATE TABLE notifications (
        id SERIAL PRIMARY KEY,
        user_id INT,
        user_login TEXT,
        message TEXT,
        task_id INT,
        task_item_id INT,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    results.push("notifications создана");

    res.json({ success: true, results });
  } catch (e) {
    res.status(500).json({ error: e.message, results });
  }
});



const PORT = process.env.PORT || 10000;

initDb().then(() => {
  app.listen(PORT, () => {
    console.log("Server running:", PORT);
  });
});
