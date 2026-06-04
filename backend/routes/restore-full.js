const router = require("express").Router();
const db = require("../db");

const SUPER_ADMIN = process.env.SUPER_ADMIN_LOGIN || 'admin';

function checkSuperAdmin(login) {
  return login && login.toLowerCase() === SUPER_ADMIN.toLowerCase();
}

const CLEAR_ORDER = [
  'subtask_components', 'task_items', 'assembly_tasks', 'routine_tasks',
  'device_items', 'archived_items', 'archived_consumables', 'archived_devices',
  'assembled_devices', 'notifications', 'chat_messages', 'typing_users',
  'online_users', 'suggestions', 'snapshots', 'logs',
  'restore_requests', 'backups', 'devices', 'items', 'consumables',
  'categories', 'users'
];

// Отдельный маршрут для очистки
router.post("/clear", async (req, res) => {
  try {
    const { user_login } = req.body;
    if (!checkSuperAdmin(user_login)) return res.status(403).json({ error: "Только супер-админ" });

    const log = [];
    await db.query("SET session_replication_role = 'replica'");
    log.push("🔓 Ограничения отключены");

    for (const table of CLEAR_ORDER) {
      try {
        await db.query(`DELETE FROM ${table}`);
        log.push(`🗑 ${table}: очищено`);
      } catch (e) {
        log.push(`⚠️ ${table}: ${e.message}`);
      }
    }

    await db.query("SET session_replication_role = 'origin'");
    log.push("🔒 Ограничения включены");

    res.json({ success: true, log });
  } catch (e) {
    await db.query("SET session_replication_role = 'origin'");
    res.status(500).json({ error: e.message });
  }
});

// Восстановление таблиц
router.post("/", async (req, res) => {
  try {
    const { user_login, file_content } = req.body;
    if (!checkSuperAdmin(user_login)) return res.status(403).json({ error: "Только супер-админ" });
    if (!file_content) return res.status(400).json({ error: "Нет данных" });

    let backup;
    if (typeof file_content === 'string') {
      try { backup = JSON.parse(file_content); }
      catch (e) { return res.status(400).json({ error: "Неверный JSON" }); }
    } else {
      backup = file_content;
    }

    const tables = backup.tables || backup.data || {};
    const tableNames = Object.keys(tables);

    if (tableNames.length === 0) {
      return res.status(400).json({ error: "Нет таблиц" });
    }

    await db.query("SET session_replication_role = 'replica'");

    let totalOk = 0;
    let totalFail = 0;

    for (const table of tableNames) {
      const records = tables[table];
      if (!records || !Array.isArray(records) || records.length === 0) continue;

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
        }
      }
    }

    await db.query("SET session_replication_role = 'origin'");

    res.json({ success: true, totalOk, totalFail });
  } catch (e) {
    await db.query("SET session_replication_role = 'origin'");
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
