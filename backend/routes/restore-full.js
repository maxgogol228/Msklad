const router = require("express").Router();
const db = require("../db");

const SUPER_ADMIN = process.env.SUPER_ADMIN_LOGIN || 'admin';

function checkSuperAdmin(login) {
  return login && login.toLowerCase() === SUPER_ADMIN.toLowerCase();
}

// Тестовый маршрут
router.get("/test", async (req, res) => {
  res.json({ ok: true, message: "Restore-full работает!" });
});

// Очистка
router.post("/clear", async (req, res) => {
  console.log("=== CLEAR START ===");
  try {
    const { user_login } = req.body;
    if (!checkSuperAdmin(user_login)) return res.status(403).json({ error: "Только супер-админ" });

    const log = [];

    // Очищаем в правильном порядке (сначала зависимые таблицы)
    const tables = [
      'subtask_components', 'task_items', 'assembly_tasks', 'routine_tasks',
      'device_items', 'archived_items', 'archived_consumables', 'archived_devices',
      'assembled_devices', 'notifications', 'chat_messages', 'typing_users',
      'online_users', 'suggestions', 'snapshots', 'logs',
      'backups', 'restore_requests', 'devices', 'items', 'consumables',
      'categories', 'users'
    ];

    for (const table of tables) {
      try {
        const result = await db.query(`DELETE FROM ${table}`);
        log.push(`🗑 ${table}: удалено ${result.rowCount} строк`);
      } catch (e) {
        log.push(`⚠️ ${table}: ${e.message}`);
      }
    }

    console.log("=== CLEAR DONE ===");

    res.json({ success: true, log });
  } catch (e) {
    console.error("CLEAR ERROR:", e);
    res.status(500).json({ error: e.message });
  }
});

// Восстановление таблиц
router.post("/", async (req, res) => {
  console.log("=== RESTORE START ===");
  try {
    const { user_login, file_content } = req.body;
    
    if (!checkSuperAdmin(user_login)) {
      return res.status(403).json({ error: "Только супер-админ" });
    }
    
    if (!file_content) {
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
    const tableNames = Object.keys(tables);
    
    console.log("Tables to restore:", tableNames.join(', '));

    if (tableNames.length === 0) {
      return res.status(400).json({ error: "Нет таблиц для восстановления" });
    }

    let totalOk = 0;
    let totalFail = 0;
    const errors = [];

    // Порядок вставки: сначала главные таблицы, потом зависимые
    const insertOrder = [
      'users', 'categories', 'items', 'consumables', 'devices',
      'device_items', 'assembly_tasks', 'task_items', 'subtask_components',
      'routine_tasks', 'assembled_devices', 'notifications', 'chat_messages',
      'online_users', 'typing_users', 'suggestions', 'snapshots', 'logs',
      'archived_items', 'archived_consumables', 'archived_devices',
      'backups', 'restore_requests'
    ];

    for (const table of insertOrder) {
      const records = tables[table];
      if (!records || !Array.isArray(records) || records.length === 0) continue;

      console.log(`Processing ${table}: ${records.length} records`);

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        try {
          const keys = Object.keys(record).filter(k => record[k] !== undefined);
          const values = keys.map(k => {
            const val = record[k];
            if (val === null || val === undefined) return null;
            if (typeof val === 'boolean') return val;
            if (typeof val === 'object') return JSON.stringify(val);
            return val;
          });

          const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(',');
          const columns = keys.map(k => `"${k}"`).join(',');

          await db.query(
            `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
            values
          );
          totalOk++;
        } catch (e) {
          totalFail++;
          if (errors.length < 10) {
            errors.push(`${table}[${i}]: ${e.message.substring(0, 150)}`);
          }
        }
      }
      
      console.log(`${table}: ${records.length} records done`);
    }

    console.log(`=== RESTORE DONE: ${totalOk} ok, ${totalFail} fail ===`);

    // Сохраняем в логи
    await db.query(
      "INSERT INTO logs(action) VALUES($1)",
      [`[${user_login}] Восстановление базы (${totalOk} записей${totalFail > 0 ? ', ошибок: ' + totalFail : ''})`]
    );

    res.json({
      success: true,
      totalOk,
      totalFail,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined
    });
  } catch (e) {
    console.error("RESTORE ERROR:", e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
