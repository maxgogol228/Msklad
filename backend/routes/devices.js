const router = require("express").Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const d = await db.query("SELECT * FROM devices ORDER BY id DESC");
    
// В GET / запросе измените запрос состава:
    const devicesWithItems = await Promise.all(d.rows.map(async (device) => {
      const items = await db.query(`
        SELECT 
          di.*,
          COALESCE(i.name, c.name) as name,
          CASE 
            WHEN di.item_type = 'consumable' THEN c.quantity
            ELSE i.quantity
          END as available_quantity
        FROM device_items di
        LEFT JOIN items i ON i.id = di.item_id AND di.item_type = 'item'
        LEFT JOIN consumables c ON c.id = di.consumable_id AND di.item_type = 'consumable'
        WHERE di.device_id = $1
      `, [device.id]);
      
      return {
        ...device,
        items: items.rows
      };
    }));
    
    res.json(devicesWithItems);
  } catch (e) {
    console.error("Error getting devices:", e);
    res.status(500).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const r = await db.query(
      "INSERT INTO devices(name) VALUES($1) RETURNING *",
      [req.body.name || "Новый прибор"]
    );
    res.json(r.rows[0]);
  } catch (e) {
    console.error("Error creating device:", e);
    res.status(500).json({ error: e.message });
  }
});

// Обновление прибора и его состава
router.put("/:id", async (req, res) => {
  const { name, items } = req.body;
  
  try {
    // Обновляем название прибора
    if (name) {
      await db.query(
        "UPDATE devices SET name=$1 WHERE id=$2",
        [name, req.params.id]
      );
    }
    
    // Если передан состав, обновляем его
    if (items && Array.isArray(items)) {
      // Удаляем старый состав
      await db.query(
        "DELETE FROM device_items WHERE device_id=$1",
        [req.params.id]
      );
      
      // Добавляем новый состав
      for (const item of items) {
        await db.query(
          "INSERT INTO device_items(device_id, item_id, quantity) VALUES($1,$2,$3)",
          [req.params.id, item.item_id, item.quantity]
        );
      }
    }
    
    res.sendStatus(200);
  } catch (e) {
    console.error("Error updating device:", e);
    res.status(500).json({ error: e.message });
  }
});

// Сборка прибора (списание деталей)
router.post("/:id/build", async (req, res) => {
  const deviceId = req.params.id;
  
  try {
    // Получаем состав прибора
    const deviceItems = await db.query(
      "SELECT * FROM device_items WHERE device_id=$1",
      [deviceId]
    );
    
    if (deviceItems.rows.length === 0) {
      return res.status(400).json({ error: "Нет деталей для сборки" });
    }
    
    // Проверяем наличие деталей и списываем
    for (const item of deviceItems.rows) {
      const currentItem = await db.query(
        "SELECT * FROM items WHERE id=$1",
        [item.item_id]
      );
      
      if (currentItem.rows.length === 0) {
        return res.status(400).json({ 
          error: `Деталь с ID ${item.item_id} не найдена` 
        });
      }
      
      if (currentItem.rows[0].quantity < item.quantity) {
        return res.status(400).json({ 
          error: `Недостаточно деталей: ${currentItem.rows[0].name}` 
        });
      }
      
      // Списываем детали
      await db.query(
        "UPDATE items SET quantity = quantity - $1 WHERE id=$2",
        [item.quantity, item.item_id]
      );
    }
    
    // Логируем сборку
    const device = await db.query("SELECT name FROM devices WHERE id=$1", [deviceId]);
    await db.query(
      "INSERT INTO logs(action) VALUES($1)",
      [`Собран прибор: ${device.rows[0]?.name || deviceId}`]
    );
    
    res.json({ ok: true, message: "Прибор успешно собран" });
  } catch (e) {
    console.error("Error building device:", e);
    res.status(500).json({ error: e.message });
  }
});

// Удаление прибора (ДОБАВЛЕННЫЙ МАРШРУТ)
router.delete("/:id", async (req, res) => {
  try {
    // Сохраняем в архив
    const device = await db.query("SELECT * FROM devices WHERE id=$1", [req.params.id]);
    
    if (device.rows.length > 0) {
      const d = device.rows[0];
      
      // Получаем состав прибора
      const items = await db.query(`
        SELECT di.*, COALESCE(i.name, c.name) as name
        FROM device_items di
        LEFT JOIN items i ON i.id = di.item_id
        LEFT JOIN consumables c ON c.id = di.consumable_id
        WHERE di.device_id = $1
      `, [req.params.id]);
      
      await db.query(
        "INSERT INTO archived_devices(original_id, name, device_data) VALUES($1,$2,$3)",
        [d.id, d.name, JSON.stringify({ items: items.rows })]
      );
    }

    // Удаляем состав и прибор
    await db.query("DELETE FROM device_items WHERE device_id=$1", [req.params.id]);
    await db.query("DELETE FROM devices WHERE id=$1", [req.params.id]);
    
    res.json({ message: "Прибор перемещён в архив" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
