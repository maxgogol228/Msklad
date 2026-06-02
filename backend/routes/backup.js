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

// Восстановить из файла
router.post("/restore", async (req, res) => {
  try {
    const { user_login, file_content } = req.body;
    if (!checkSuperAdmin(user_login)) return res.status(403).json({ error: "Только супер-админ" });
    if (!file_content) return res.status(400).json({ error: "Нет данных" });

    // Парсим
    let backup;
    if (typeof file_content === 'string') {
      try {
        backup = JSON.parse(file_content);
      } catch (e) {
        return res.status(400).json({ error: "Неверный JSON: " + e.message });
      }
    } else {
      backup = file_content;
    }

    const tables = backup.tables || backup.data || {};
    
    if (Object.keys(tables).length === 0) {
      return res.status(400).json({ error: "Файл не содержит таблиц. Ключи: " + Object.keys(backup).join(', ') });
    }

    console.log("=== RESTORE START ===");
    console.log("Tables found:", Object.keys(tables).join(', '));
    console.log("Summary:", JSON.stringify(backup.summary || {}));

    const log = [];
    
    // Отключаем проверку внешних ключей
    await db.query("SET FOREIGN_KEY_CHECKS = 0");
    log.push("🔓 Внешние ключи отключены");

    // Очищаем таблицы
    for (const table of ALL_TABLES_CLEAR) {
      try {
        await db.query(`DELETE FROM \`${table}\``);
        log.push(`🗑 Очищено: ${table}`);
      } catch (e) {
        log.push(`⚠️ Ошибка очистки ${table}: ${e.message}`);
      }
    }

    // Вставляем данные
    let totalInserted = 0;
    const errors = [];

    for (const table of ALL_TABLES_INSERT) {
      const records = tables[table];
      if (!records || !Array.isArray(records) || records.length === 0) {
        log.push(`⏭ Пропущено (нет данных): ${table}`);
        continue;
      }

      let tableInserted = 0;
      
      for (const record of records) {
        try {
          const keys = Object.keys(record);
          const values = keys.map(k => record[k]);
          const placeholders = keys.map(() => '?').join(',');
          const columns = keys.map(k => `\`${k}\``).join(',');
          
          await db.query(
            `INSERT INTO \`${table}\` (${columns}) VALUES (${placeholders})`,
            values
          );
          tableInserted++;
          totalInserted++;
        } catch (e) {
          errors.push(`${table}: ${e.message.substring(0, 100)}`);
        }
      }
      
      log.push(`✅ ${table}: ${tableInserted}/${records.length} записей`);
    }

    // Включаем внешние ключи
    await db.query("SET FOREIGN_KEY_CHECKS = 1");
    log.push("🔒 Внешние ключи включены");

    // Сохраняем бекап в базу для истории
    const backupJSON = JSON.stringify(backup);
    await db.query(
      "INSERT INTO backups (data, created_by, size_bytes) VALUES (?, ?, ?)",
      [backupJSON, user_login, Buffer.byteLength(backupJSON, 'utf8')]
    );

    await db.query("INSERT INTO logs(action) VALUES(?)", [`[${user_login}] Восстановил базу из файла (${totalInserted} записей)`]);

    console.log("=== RESTORE COMPLETE ===");
    console.log(`Total inserted: ${totalInserted}`);
    if (errors.length > 0) console.log("Errors:", errors);

    res.json({
      message: `✅ Восстановлено ${totalInserted} записей`,
      log: log,
      errors: errors.length > 0 ? errors : undefined
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
