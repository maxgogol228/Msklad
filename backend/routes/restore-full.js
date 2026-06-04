const router = require("express").Router();
const db = require("../db");

const SUPER_ADMIN = process.env.SUPER_ADMIN_LOGIN || 'admin';

function checkSuperAdmin(login) {
  return login && login.toLowerCase() === SUPER_ADMIN.toLowerCase();
}

// Полное восстановление с детальным логом
router.post("/", async (req, res) => {
  try {
    const { user_login, file_content } = req.body;
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
    
    console.log("=== FULL RESTORE START ===");
    console.log("Tables found:", Object.keys(tables).join(', '));
    
    const results = [];
    let totalOk = 0;
    let totalFail = 0;

    // Отключаем все ограничения
    await db.query("SET session_replication_role = 'replica'");
    results.push("🔓 Ограничения отключены");

    // Порядок восстановления
    const order = [
      'users', 'categories', 'items', 'consumables', 'devices',
      'device_items', 'assembly_tasks', 'task_items', 'subtask_components',
      'routine_tasks', 'assembled_devices', 'notifications', 'chat_messages',
      'online_users', 'typing_users', 'suggestions', 'snapshots', 'logs',
      'archived_items', 'archived_consumables', 'archived_devices',
      'backups', 'restore_requests'
    ];

    for (const table of order) {
      const records = tables[table];
      if (!records || !Array.isArray(records) || records.length === 0) {
        results.push(`⏭ ${table}: нет данных`);
        continue;
      }

      // Очищаем таблицу
      try {
        await db.query(`DELETE FROM ${table}`);
        results.push(`🗑 ${table}: очищена`);
      } catch (e) {
        results.push(`⚠️ Ошибка очистки ${table}: ${e.message}`);
        continue;
      }

      let ok = 0;
      let fail = 0;
      const errors = [];

      // Вставляем записи
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
          ok++;
        } catch (e) {
          fail++;
          if (errors.length < 5) {
            errors.push({
              index: i,
              message: e.message.substring(0, 200),
              keys: Object.keys(record).join(', ')
            });
          }
        }
      }

      results.push(`✅ ${table}: ${ok}/${records.length}${fail > 0 ? ` (ошибок: ${fail})` : ''}`);
      
      if (errors.length > 0) {
        results.push(`   ❌ Первые ошибки:`);
        errors.forEach(e => {
          results.push(`      Запись #${e.index}: ${e.message}`);
          results.push(`      Поля: ${e.keys}`);
        });
      }

      totalOk += ok;
      totalFail += fail;
    }

    // Включаем ограничения обратно
    await db.query("SET session_replication_role = 'origin'");
    results.push("🔒 Ограничения включены");

    console.log("=== FULL RESTORE COMPLETE ===");
    console.log(`Total: ${totalOk} ok, ${totalFail} failed`);

    // Сохраняем бекап в историю
    const backupJSON = JSON.stringify(backup);
    await db.query(
      "INSERT INTO backups (data, created_by, size_bytes) VALUES ($1, $2, $3)",
      [backupJSON, user_login, Buffer.byteLength(backupJSON, 'utf8')]
    );

    await db.query("INSERT INTO logs(action) VALUES($1)",
      [`[${user_login}] Полное восстановление (${totalOk} записей)`]);

    res.json({
      success: true,
      totalOk,
      totalFail,
      results
    });

  } catch (e) {
    console.error("Full restore error:", e);
    await db.query("SET session_replication_role = 'origin'");
    res.status(500).json({ error: e.message, stack: e.stack });
  }
});

module.exports = router;
