const router = require("express").Router();
const db = require("../db");
const fs = require('fs');
const path = require('path');

const SUPER_ADMIN = process.env.SUPER_ADMIN_LOGIN || 'admin';

function checkSuperAdmin(login) {
  return login && login.toLowerCase() === SUPER_ADMIN.toLowerCase();
}

// Порядок удаления (обратный — сначала зависимые таблицы)
const ALL_TABLES_CLEAR = [
  'subtask_components', 'task_items', 'assembly_tasks', 'routine_tasks',
  'device_items', 'archived_items', 'archived_consumables', 'archived_devices',
  'assembled_devices', 'notifications', 'chat_messages', 'typing_users',
  'online_users', 'suggestions', 'snapshots', 'logs',
  'restore_requests', 'backups', 'devices', 'items', 'consumables',
  'categories', 'users'
];

// Порядок вставки (прямой — сначала главные таблицы)
const ALL_TABLES_INSERT = [
  'users', 'categories', 'items', 'consumables', 'devices',
  'device_items', 'assembly_tasks', 'task_items', 'subtask_components',
  'routine_tasks', 'assembled_devices', 'notifications', 'chat_messages',
  'online_users', 'typing_users', 'suggestions', 'snapshots', 'logs',
  'archived_items', 'archived_consumables', 'archived_devices',
  'backups', 'restore_requests'
];

// Создать бекап
router.post("/create", async (req, res) => {
  try {
    const { user_login } = req.body;
    if (!checkSuperAdmin(user_login)) return res.status(403).json({ error: "Только супер-админ" });

    const backup = { version: "3.0", date: new Date().toISOString(), created_by: user_login, tables: {}, summary: {} };

    for (const table of ALL_TABLES_INSERT) {
      try {
        const result = await db.query(`SELECT * FROM \`${table}\``);
        backup.tables[table] = result.rows;
        backup.summary[table] = result.rows.length;
      } catch (e) {
        backup.tables[table] = [];
        backup.summary[table] = 0;
      }
    }

    const backupJSON = JSON.stringify(backup, null, 2);

    // Сохраняем в файл
    const backupDir = path.join('/tmp', 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const fileName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(path.join(backupDir, fileName), backupJSON);

    await db.query("INSERT INTO logs(action) VALUES(?)", [`[${user_login}] Создал резервную копию`]);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.send(backupJSON);
  } catch (e) {
    console.error("Create backup error:", e);
    res.status(500).json({ error: e.message });
  }
});

router.post("/restore", async (req, res) => {
  try {
    const { user_login, file_content, append } = req.body;
    if (!checkSuperAdmin(user_login)) return res.status(403).json({ error: "Только супер-админ" });
    if (!file_content) return res.status(400).json({ error: "Нет данных" });

    let backup;
    if (typeof file_content === 'string') {
      try { backup = JSON.parse(file_content); }
      catch (e) { return res.status(400).json({ error: "Неверный JSON: " + e.message }); }
    } else {
      backup = file_content;
    }

    const tables = backup.tables || backup.data || {};

    if (Object.keys(tables).length === 0) {
      return res.status(400).json({ error: "Файл не содержит таблиц" });
    }

    const log = [];
    let totalInserted = 0;
    const tableResults = {};

    await db.query("SET FOREIGN_KEY_CHECKS = 0");

    // Очищаем только если это первая часть
    if (!append) {
      for (const table of ALL_TABLES_CLEAR) {
        try {
          await db.query(`DELETE FROM \`${table}\``);
          log.push(`🗑 ${table}: очищено`);
        } catch (e) {
          log.push(`⚠️ ${table}: ${e.message}`);
        }
      }
    }

    // Вставляем данные
    for (const table of ALL_TABLES_INSERT) {
      const records = tables[table];
      if (!records || !Array.isArray(records) || records.length === 0) continue;

      let inserted = 0;
      const errors = [];

      // Вставляем по одной
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        try {
          const keys = Object.keys(record).filter(k => record[k] !== undefined);
          const values = keys.map(k => {
            const val = record[k];
            if (typeof val === 'boolean') return val ? 1 : 0;
            if (val === null || val === undefined) return null;
            return val;
          });

          const placeholders = keys.map(() => '?').join(',');
          const columns = keys.map(k => `\`${k}\``).join(',');

          await db.query(
            `INSERT INTO \`${table}\` (${columns}) VALUES (${placeholders})`,
            values
          );
          inserted++;
          totalInserted++;
        } catch (e) {
          if (errors.length < 3) {
            errors.push({
              index: i,
              message: e.message.substring(0, 200)
            });
          }
        }
      }

      tableResults[table] = { total: records.length, inserted, errors };
      log.push(`✅ ${table}: ${inserted}/${records.length}`);
    }

    await db.query("SET FOREIGN_KEY_CHECKS = 1");

    await db.query("INSERT INTO logs(action) VALUES(?)",
      [`[${user_login}] Восстановил данные (${totalInserted} записей)${append ? ' (частичное)' : ''}`]);

    res.json({
      success: true,
      message: `✅ Восстановлено ${totalInserted} записей`,
      totalInserted,
      log,
      tableResults
    });

  } catch (e) {
    console.error("Restore error:", e);
    await db.query("SET FOREIGN_KEY_CHECKS = 1");
    res.status(500).json({ error: e.message });
  }
});

// История бекапов
router.get("/history", async (req, res) => {
  try {
    const backupDir = path.join('/tmp', 'backups');
    if (!fs.existsSync(backupDir)) return res.json([]);
    
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .map(f => {
        const stat = fs.statSync(path.join(backupDir, f));
        return { name: f, size: stat.size, date: stat.mtime };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json(files);
  } catch (e) {
    res.json([]);
  }
});

// Скачать из истории
router.get("/download/:filename", async (req, res) => {
  try {
    const filePath = path.join('/tmp', 'backups', req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Не найден" });
    res.download(filePath);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Восстановить из истории
router.post("/restore-from-history/:filename", async (req, res) => {
  try {
    const { user_login } = req.body;
    if (!checkSuperAdmin(user_login)) return res.status(403).json({ error: "Только супер-админ" });

    const filePath = path.join('/tmp', 'backups', req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Файл не найден" });

    const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Используем тот же механизм восстановления
    req.body.file_content = fileContent;
    return router.handle(req, res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
