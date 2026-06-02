const router = require("express").Router();
const db = require("../db");

router.get("/items", async (req, res) => {
  try {
    const r = await db.query("SELECT * FROM archived_items ORDER BY deleted_at DESC");
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/consumables", async (req, res) => {
  try {
    const r = await db.query("SELECT * FROM archived_consumables ORDER BY deleted_at DESC");
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/devices", async (req, res) => {
  try {
    const r = await db.query("SELECT * FROM archived_devices ORDER BY deleted_at DESC");
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/devices/:id/restore", async (req, res) => {
  try {
    const { user_login } = req.body;
    const archived = await db.query("SELECT * FROM archived_devices WHERE id=$1", [req.params.id]);
    if (archived.rows.length === 0) return res.status(404).json({ error: "Прибор не найден в архиве" });
    const device = archived.rows[0];

    const newDevice = await db.query("INSERT INTO devices(name) VALUES($1) RETURNING *", [device.name]);
    const newDeviceId = newDevice.rows[0].id;

    if (device.device_data && device.device_data.items) {
      for (const item of device.device_data.items) {
        try {
          await db.query(
            "INSERT INTO device_items(device_id, item_id, consumable_id, quantity, item_type, subtask_name, time_estimate) VALUES($1,$2,$3,$4,$5,$6,$7)",
            [newDeviceId, item.item_id || null, item.consumable_id || null, item.quantity || 1, item.item_type || 'item', item.subtask_name || 'Основная сборка', item.time_estimate || 240]
          );
        } catch (e) { console.log("Restore item error:", e.message); }
      }
    }

    await db.query("DELETE FROM archived_devices WHERE id=$1", [req.params.id]);
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Восстановил прибор из архива: "${device.name}"`]);
    res.json({ message: "Прибор восстановлен" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/items/:id/restore", async (req, res) => {
  try {
    const { user_login } = req.body;
    const archived = await db.query("SELECT * FROM archived_items WHERE id=$1", [req.params.id]);
    if (archived.rows.length === 0) return res.status(404).json({ error: "Не найдено" });
    const item = archived.rows[0];

    let categoryId = item.category_id || null;
    if (categoryId) {
      const catCheck = await db.query("SELECT id FROM categories WHERE id = $1", [categoryId]);
      if (catCheck.rows.length === 0) categoryId = null;
    }

    const existing = await db.query("SELECT id FROM items WHERE name = $1", [item.name]);
    if (existing.rows.length > 0) {
      await db.query("UPDATE items SET quantity = quantity + $1, min_quantity = COALESCE($2, min_quantity), category_id = COALESCE($3, category_id) WHERE id = $4",
        [item.quantity || 0, item.min_quantity, categoryId, existing.rows[0].id]);
    } else {
      await db.query("INSERT INTO items(name, quantity, min_quantity, category_id) VALUES($1,$2,$3,$4)",
        [item.name, item.quantity || 0, item.min_quantity, categoryId]);
    }

    await db.query("DELETE FROM archived_items WHERE id=$1", [req.params.id]);
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Восстановил деталь из архива: "${item.name}"`]);
    res.json({ message: "Деталь восстановлена" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/consumables/:id/restore", async (req, res) => {
  try {
    const { user_login } = req.body;
    const archived = await db.query("SELECT * FROM archived_consumables WHERE id=$1", [req.params.id]);
    if (archived.rows.length === 0) return res.status(404).json({ error: "Не найдено" });
    const item = archived.rows[0];

    let categoryId = item.category_id || null;
    if (categoryId) {
      const catCheck = await db.query("SELECT id FROM categories WHERE id = $1", [categoryId]);
      if (catCheck.rows.length === 0) categoryId = null;
    }

    const existing = await db.query("SELECT id FROM consumables WHERE name = $1", [item.name]);
    if (existing.rows.length > 0) {
      await db.query("UPDATE consumables SET quantity = quantity + $1, min_quantity = COALESCE($2, min_quantity), unit = COALESCE($3, unit), category_id = COALESCE($4, category_id) WHERE id = $5",
        [item.quantity || 0, item.min_quantity, item.unit || 'шт.', categoryId, existing.rows[0].id]);
    } else {
      await db.query("INSERT INTO consumables(name, quantity, min_quantity, unit, category_id) VALUES($1,$2,$3,$4,$5)",
        [item.name, item.quantity || 0, item.min_quantity, item.unit || 'шт.', categoryId]);
    }

    await db.query("DELETE FROM archived_consumables WHERE id=$1", [req.params.id]);
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Восстановил расходник из архива: "${item.name}"`]);
    res.json({ message: "Расходник восстановлен" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/items/:id", async (req, res) => {
  try {
    const { user_login } = req.body;
    const item = await db.query("SELECT name FROM archived_items WHERE id=$1", [req.params.id]);
    await db.query("DELETE FROM archived_items WHERE id=$1", [req.params.id]);
    if (item.rows.length > 0) {
      await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Навсегда удалил деталь из архива: "${item.rows[0].name}"`]);
    }
    res.json({ message: "Удалено" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/consumables/:id", async (req, res) => {
  try {
    const { user_login } = req.body;
    const item = await db.query("SELECT name FROM archived_consumables WHERE id=$1", [req.params.id]);
    await db.query("DELETE FROM archived_consumables WHERE id=$1", [req.params.id]);
    if (item.rows.length > 0) {
      await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Навсегда удалил расходник из архива: "${item.rows[0].name}"`]);
    }
    res.json({ message: "Удалено" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/devices/:id", async (req, res) => {
  try {
    const { user_login } = req.body;
    const item = await db.query("SELECT name FROM archived_devices WHERE id=$1", [req.params.id]);
    await db.query("DELETE FROM archived_devices WHERE id=$1", [req.params.id]);
    if (item.rows.length > 0) {
      await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Навсегда удалил прибор из архива: "${item.rows[0].name}"`]);
    }
    res.json({ message: "Удалено" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
