const router = require("express").Router();
const db = require("../db");

// Получить архивные элементы
router.get("/items", async (req, res) => {
  try {
    const r = await db.query("SELECT * FROM archived_items ORDER BY deleted_at DESC");
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/consumables", async (req, res) => {
  try {
    const r = await db.query("SELECT * FROM archived_consumables ORDER BY deleted_at DESC");
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/devices", async (req, res) => {
  try {
    const r = await db.query("SELECT * FROM archived_devices ORDER BY deleted_at DESC");
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Восстановить из архива
router.post("/items/:id/restore", async (req, res) => {
  try {
    const archived = await db.query("SELECT * FROM archived_items WHERE id=$1", [req.params.id]);
    
    if (archived.rows.length === 0) {
      return res.status(404).json({ error: "Элемент не найден" });
    }

    const item = archived.rows[0];
    
    // Восстанавливаем в основную таблицу
    await db.query(
      "INSERT INTO items(name, quantity, min_quantity, category_id) VALUES($1, $2, $3, $4)",
      [item.name, item.quantity, item.min_quantity, item.category_id]
    );

    // Удаляем из архива
    await db.query("DELETE FROM archived_items WHERE id=$1", [req.params.id]);

    res.json({ message: "Деталь восстановлена" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/consumables/:id/restore", async (req, res) => {
  try {
    const archived = await db.query("SELECT * FROM archived_consumables WHERE id=$1", [req.params.id]);
    
    if (archived.rows.length === 0) {
      return res.status(404).json({ error: "Элемент не найден" });
    }

    const item = archived.rows[0];
    
    await db.query(
      "INSERT INTO consumables(name, quantity, min_quantity, category_id) VALUES($1, $2, $3, $4)",
      [item.name, item.quantity, item.min_quantity, item.category_id]
    );

    await db.query("DELETE FROM archived_consumables WHERE id=$1", [req.params.id]);

    res.json({ message: "Расходник восстановлен" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/devices/:id/restore", async (req, res) => {
  try {
    const archived = await db.query("SELECT * FROM archived_devices WHERE id=$1", [req.params.id]);
    
    if (archived.rows.length === 0) {
      return res.status(404).json({ error: "Прибор не найден" });
    }

    const device = archived.rows[0];
    
    // Восстанавливаем прибор
    const newDevice = await db.query(
      "INSERT INTO devices(name) VALUES($1) RETURNING *",
      [device.name]
    );

    // Восстанавливаем состав если есть
    if (device.device_data && device.device_data.items) {
      for (const item of device.device_data.items) {
        await db.query(
          "INSERT INTO device_items(device_id, item_id, consumable_id, quantity, item_type) VALUES($1,$2,$3,$4,$5)",
          [newDevice.rows[0].id, item.item_id, item.consumable_id, item.quantity, item.item_type]
        );
      }
    }

    await db.query("DELETE FROM archived_devices WHERE id=$1", [req.params.id]);

    res.json({ message: "Прибор восстановлен" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Полное удаление из архива
router.delete("/items/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM archived_items WHERE id=$1", [req.params.id]);
    res.json({ message: "Деталь окончательно удалена" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/consumables/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM archived_consumables WHERE id=$1", [req.params.id]);
    res.json({ message: "Расходник окончательно удалён" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/devices/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM archived_devices WHERE id=$1", [req.params.id]);
    res.json({ message: "Прибор окончательно удалён" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
