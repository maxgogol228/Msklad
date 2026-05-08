const router = require("express").Router();
const db = require("../db");

// Получение всех приборов с составом
router.get("/", async (req, res) => {
  try {
    const d = await db.query("SELECT * FROM devices ORDER BY id DESC");
    
    const devicesWithItems = await Promise.all(d.rows.map(async (device) => {
      try {
        // Получаем состав прибора
        const items = await db.query(`
          SELECT 
            di.id,
            di.device_id,
            di.item_id,
            di.consumable_id,
            di.quantity,
            di.item_type,
            CASE 
              WHEN di.item_type = 'item' THEN i.name
              WHEN di.item_type = 'consumable' THEN c.name
              ELSE 'Неизвестно'
            END as name,
            CASE 
              WHEN di.item_type = 'item' THEN 'шт.'
              WHEN di.item_type = 'consumable' THEN COALESCE(c.unit, 'шт.')
              ELSE 'шт.'
            END as unit,
            CASE 
              WHEN di.item_type = 'item' THEN i.quantity
              WHEN di.item_type = 'consumable' THEN c.quantity
              ELSE 0
            END as available_quantity
          FROM device_items di
          LEFT JOIN items i ON i.id = di.item_id
          LEFT JOIN consumables c ON c.id = di.consumable_id
          WHERE di.device_id = $1
        `, [device.id]);
        
        return {
          ...device,
          items: items.rows
        };
      } catch (innerError) {
        console.error(`Error loading items for device ${device.id}:`, innerError);
        return {
          ...device,
          items: []
        };
      }
    }));
    
    res.json(devicesWithItems);
  } catch (e) {
    console.error("Error getting devices:", e);
    res.status(500).json({ error: e.message });
  }
});

// Создание прибора
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
    if (name) {
      await db.query(
        "UPDATE devices SET name=$1 WHERE id=$2",
        [name, req.params.id]
      );
    }
    
    if (items && Array.isArray(items)) {
      // Удаляем старый состав
      await db.query("DELETE FROM device_items WHERE device_id=$1", [req.params.id]);
      
      // Добавляем новый состав
      for (const item of items) {
        await db.query(
          `INSERT INTO device_items(device_id, item_id, consumable_id, quantity, item_type) 
           VALUES($1, $2, $3, $4, $5)`,
          [
            req.params.id, 
            item.item_id || null, 
            item.consumable_id || null, 
            item.quantity || 1, 
            item.item_type || 'item'
          ]
        );
      }
    }
    
    res.sendStatus(200);
  } catch (e) {
    console.error("Error updating device:", e);
    res.status(500).json({ error: e.message });
  }
});

// Сборка прибора
router.post("/:id/build", async (req, res) => {
  const deviceId = req.params.id;
  
  try {
    const deviceItems = await db.query(
      "SELECT * FROM device_items WHERE device_id=$1",
      [deviceId]
    );
    
    if (deviceItems.rows.length === 0) {
      return res.status(400).json({ error: "Нет компонентов для сборки" });
    }
    
    for (const item of deviceItems.rows) {
      if (item.item_type === 'item' && item.item_id) {
        const currentItem = await db.query("SELECT * FROM items WHERE id=$1", [item.item_id]);
        
        if (currentItem.rows.length === 0) {
          return res.status(400).json({ error: `Деталь с ID ${item.item_id} не найдена` });
        }
        
        if (currentItem.rows[0].quantity < item.quantity) {
          return res.status(400).json({ 
            error: `Недостаточно: ${currentItem.rows[0].name} (нужно ${item.quantity}, есть ${currentItem.rows[0].quantity})` 
          });
        }
        
        await db.query(
          "UPDATE items SET quantity = quantity - $1 WHERE id=$2",
          [item.quantity, item.item_id]
        );
      } else if (item.item_type === 'consumable' && item.consumable_id) {
        const currentConsumable = await db.query("SELECT * FROM consumables WHERE id=$1", [item.consumable_id]);
        
        if (currentConsumable.rows.length === 0) {
          return res.status(400).json({ error: `Расходник с ID ${item.consumable_id} не найден` });
        }
        
        if (parseFloat(currentConsumable.rows[0].quantity) < item.quantity) {
          return res.status(400).json({ 
            error: `Недостаточно: ${currentConsumable.rows[0].name} (нужно ${item.quantity}, есть ${currentConsumable.rows[0].quantity})` 
          });
        }
        
        await db.query(
          "UPDATE consumables SET quantity = quantity - $1 WHERE id=$2",
          [item.quantity, item.consumable_id]
        );
      }
    }
    
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

// Удаление прибора
router.delete("/:id", async (req, res) => {
  try {
    const device = await db.query("SELECT * FROM devices WHERE id=$1", [req.params.id]);
    
    if (device.rows.length > 0) {
      const d = device.rows[0];
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

    await db.query("DELETE FROM device_items WHERE device_id=$1", [req.params.id]);
    await db.query("DELETE FROM devices WHERE id=$1", [req.params.id]);
    
    await db.query(
      "INSERT INTO logs(action) VALUES($1)",
      [`Удалён прибор: ${device.rows[0]?.name || req.params.id}`]
    );
    
    res.json({ ok: true, message: "Прибор перемещён в архив" });
  } catch (e) {
    console.error("Error deleting device:", e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
