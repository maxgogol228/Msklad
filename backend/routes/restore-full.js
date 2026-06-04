const router = require("express").Router();
const db = require("../db");

const SUPER_ADMIN = process.env.SUPER_ADMIN_LOGIN || 'admin';

function checkSuperAdmin(login) {
  return login && login.toLowerCase() === SUPER_ADMIN.toLowerCase();
}

// Тестовый маршрут — проверить что роутер работает
router.get("/test", async (req, res) => {
  res.json({ ok: true, message: "Restore-full router works!" });
});

// Очистка
router.post("/clear", async (req, res) => {
  console.log("=== CLEAR START ===");
  try {
    const { user_login } = req.body;
    if (!checkSuperAdmin(user_login)) return res.status(403).json({ error: "Только супер-админ" });

    const log = [];
    await db.query("SET session_replication_role = 'replica'");

    const tables = [
      'subtask_components', 'task_items', 'assembly_tasks', 'routine_tasks',
      'device_items', 'archived_items', 'archived_consumables', 'archived_devices',
      'assembled_devices', 'notifications', 'chat_messages', 'typing_users',
      'online_users', 'suggestions', 'snapshots', 'logs',
      'backups', 'devices', 'items', 'consumables', 'categories', 'users'
    ];

    for (const table of tables) {
      try {
        await db.query(`DELETE FROM ${table}`);
        log.push(`🗑 ${table}`);
      } catch (e) {
        log.push(`⚠️ ${table}: ${e.message}`);
      }
    }

    await db.query("SET session_replication_role = 'origin'");
    console.log("=== CLEAR DONE ===");

    res.json({ success: true, log });
  } catch (e) {
    console.error("CLEAR ERROR:", e);
    await db.query("SET session_replication_role = 'origin'");
    res.status(500).json({ error: e.message });
  }
});

// Восстановление (упрощённое)
router.post("/", async (req, res) => {
  console.log("=== RESTORE START ===");
  try {
    const { user_login, file_content } = req.body;
    console.log("User:", user_login);
    
    if (!checkSuperAdmin(user_login)) {
      console.log("Not super admin");
      return res.status(403).json({ error: "Только супер-админ" });
    }
    
    if (!file_content) {
      console.log("No file_content");
      return res.status(400).json({ error: "Нет данных" });
    }

    let backup;
    if (typeof file_content === 'string') {
      try { backup = JSON.parse(file_content); }
      catch (e) { return res.status(400).json({ error: "Неверный JSON: " + e.message }); }
    } else {
      backup = file_content;
    }

    const tables = backup.tables || backup.data || {};
    console.log("Tables:", Object.keys(tables).join(', '));

    await db.query("SET session_replication_role = 'replica'");

    let totalOk = 0;
    let totalFail = 0;
    const errors = [];

    for (const table of Object.keys(tables)) {
      const records = tables[table];
      if (!records || !Array.isArray(records) || records.length === 0) continue;

      console.log(`Processing ${table}: ${records.length} records`);

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        try {
          const keys = Object.keys(record);
          const values = keys.map(k => {
            const val = record[k];
            if (val === null || val === undefined) return null;
            if (typeof val === 'boolean') return val;
            if (typeof val === 'object') return JSON.stringify(val);
            return val;
          });

          const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(',');
          const columns = keys.join(',');

          await db.query(
            `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
            values
          );
          totalOk++;
        } catch (e) {
          totalFail++;
          if (errors.length < 3) {
            errors.push(`${table}[${i}]: ${e.message.substring(0, 100)}`);
          }
        }
      }
    }

    await db.query("SET session_replication_role = 'origin'");
    console.log(`=== RESTORE DONE: ${totalOk} ok, ${totalFail} fail ===`);

    res.json({
      success: true,
      totalOk,
      totalFail,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (e) {
    console.error("RESTORE ERROR:", e);
    await db.query("SET session_replication_role = 'origin'");
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
