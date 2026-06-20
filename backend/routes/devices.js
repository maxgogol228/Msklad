const router = require("express").Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const devices = await db.query("SELECT * FROM devices ORDER BY id DESC");
    const devicesWithItems = await Promise.all(devices.rows.map(async (device) => {
      try {
        const items = await db.query(`
          SELECT di.*, 
            CASE WHEN di.item_type = 'item' THEN i.name WHEN di.item_type = 'consumable' THEN c.name ELSE 'Неизвестный компонент' END as name,
            CASE WHEN di.item_type = 'item' THEN 'шт.' WHEN di.item_type = 'consumable' THEN COALESCE(c.unit, 'шт.') ELSE 'шт.' END as unit,
            CASE WHEN di.item_type = 'item' THEN i.quantity WHEN di.item_type = 'consumable' THEN c.quantity ELSE 0 END as available_quantity,
            CASE WHEN di.item_type = 'item' THEN i.price WHEN di.item_type = 'consumable' THEN c.price ELSE 0 END as item_price,
            CASE WHEN di.item_type = 'item' THEN i.price_per WHEN di.item_type = 'consumable' THEN c.price_per ELSE 1 END as item_price_per
          FROM device_items di
          LEFT JOIN items i ON i.id = di.item_id
          LEFT JOIN consumables c ON c.id = di.consumable_id
          WHERE di.device_id = $1 ORDER BY di.subtask_name, di.id
        `, [device.id]);

        let deviceCost = 0;
        for (const item of items.rows) {
          const unitPrice = parseFloat(item.item_price || 0) / parseFloat(item.item_price_per || 1);
          deviceCost += unitPrice * parseFloat(item.quantity || 0);
        }

        return { ...device, items: items.rows, cost: Math.round(deviceCost * 100) / 100 };
      } catch (e) { return { ...device, items: [], cost: 0 }; }
    }));
    res.json(devicesWithItems);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/", async (req, res) => {
  try {
    const { name, user_login } = req.body;
    const r = await db.query("INSERT INTO devices(name) VALUES($1) RETURNING *", [name || "Новый прибор"]);
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Создал прибор: "${name || 'Новый прибор'}"`]);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/:id", async (req, res) => {
  const { name, items, user_login } = req.body;
  const deviceId = parseInt(req.params.id);
  try {
    if (name) await db.query("UPDATE devices SET name=$1 WHERE id=$2", [name, deviceId]);
    if (items && Array.isArray(items)) {
      await db.query("DELETE FROM device_items WHERE device_id=$1", [deviceId]);
      for (const item of items) {
        if (item.quantity && parseFloat(item.quantity) > 0) {
          await db.query(
            "INSERT INTO device_items (device_id, item_id, consumable_id, quantity, item_type, subtask_name, time_estimate) VALUES ($1,$2,$3,$4,$5,$6,$7)",
            [deviceId, item.item_id || null, item.consumable_id || null, parseFloat(item.quantity) || 1, item.item_type || 'item', item.subtask_name || 'Основная сборка', item.time_estimate || 30]
          );
        }
      }
    }
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Обновил прибор: "${name || deviceId}"`]);
    res.sendStatus(200);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/:id", async (req, res) => {
  const deviceId = parseInt(req.params.id);
  const { user_login } = req.body;
  try {
    const device = await db.query("SELECT * FROM devices WHERE id=$1", [deviceId]);
    if (device.rows.length === 0) return res.status(404).json({ error: "Прибор не найден" });
    const d = device.rows[0];
    const items = await db.query("SELECT di.*, COALESCE(i.name, c.name) as name FROM device_items di LEFT JOIN items i ON i.id = di.item_id LEFT JOIN consumables c ON c.id = di.consumable_id WHERE di.device_id = $1", [deviceId]);
    await db.query("INSERT INTO archived_devices(original_id, name, device_data) VALUES($1,$2,$3)", [d.id, d.name, JSON.stringify({ items: items.rows })]);
    await db.query("DELETE FROM device_items WHERE device_id=$1", [deviceId]);
    await db.query("DELETE FROM devices WHERE id=$1", [deviceId]);
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Удалил прибор в архив: "${d.name}"`]);
    res.json({ message: "Прибор перемещён в архив" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
