const router = require("express").Router();
const db = require("../db");

// Создать резервную копию (скачать)
router.get("/export", async (req, res) => {
  try {
    const backup = {
      version: "1.0",
      date: new Date().toISOString(),
      data: {}
    };

    // Экспорт всех таблиц
    const tables = [
      'users', 'items', 'consumables', 'devices', 'device_items',
      'categories', 'logs', 'archived_items', 'archived_consumables', 
      'archived_devices', 'snapshots'
    ];

    for (const table of tables) {
      try {
        const result = await db.query(`SELECT * FROM ${table}`);
        backup.data[table] = result.rows;
      } catch (e) {
        console.log(`Table ${table} not found, skipping...`);
        backup.data[table] = [];
      }
    }

    const backupJSON = JSON.stringify(backup, null, 2);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup-${new Date().toISOString().split('T')[0]}.json`);
    res.send(backupJSON);
  } catch (e) {
    console.error("Backup export error:", e);
    res.status(500).json({ error: e.message });
  }
});

// Восстановить из резервной копии
router.post("/import", async (req, res) => {
  try {
    const backup = req.body;
    
    if (!backup || !backup.data) {
      return res.status(400).json({ error: "Неверный формат файла резервной копии" });
    }

    const tables = Object.keys(backup.data);
    
    // Начинаем транзакцию
    await db.query("BEGIN");

    try {
      for (const table of tables) {
        const records = backup.data[table];
        
        if (records && records.length > 0) {
          // Очищаем таблицу
          await db.query(`DELETE FROM ${table}`);
          
          // Получаем колонки из первого объекта
          const columns = Object.keys(records[0]);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(',');
          const columnNames = columns.join(',');
          
          // Вставляем записи
          for (const record of records) {
            const values = columns.map(col => record[col]);
            try {
              await db.query(
                `INSERT INTO ${table} (${columnNames}) VALUES (${placeholders})`,
                values
              );
            } catch (insertError) {
              console.log(`Error inserting into ${table}:`, insertError.message);
            }
          }
        }
      }
      
      await db.query("COMMIT");
      
      await db.query(
        "INSERT INTO logs(action) VALUES($1)",
        ["Восстановлена резервная копия базы данных"]
      );
      
      res.json({ message: "База данных успешно восстановлена" });
    } catch (e) {
      await db.query("ROLLBACK");
      throw e;
    }
  } catch (e) {
    console.error("Backup import error:", e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
