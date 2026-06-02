const router = require("express").Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const items = await db.query("SELECT * FROM assembled_devices ORDER BY created_at DESC");
    res.json(items.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/", async (req, res) => {
  try {
    const { device_id, device_name, component_name, component_type, quantity, assembled_by } = req.body;
    if (!device_name) return res.status(400).json({ error: "Название прибора обязательно" });
    const qty = Math.max(1, parseInt(quantity) || 1);
    const result = await db.query(
      "INSERT INTO assembled_devices (device_id, device_name, component_name, component_type, quantity, assembled_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [device_id || null, device_name, component_name || null, component_type || 'device', qty, assembled_by || null]
    );
    const itemName = component_name || device_name;
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${assembled_by || 'Система'}] Добавил в собранные: "${itemName}" (${qty} шт.)`]);
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/check/:deviceId", async (req, res) => {
  try {
    const deviceId = parseInt(req.params.deviceId);
    const device = await db.query("SELECT * FROM devices WHERE id = $1", [deviceId]);
    if (device.rows.length === 0) return res.status(404).json({ error: "Прибор не найден" });
    const deviceName = device.rows[0].name;
    const assembled = await db.query(
      "SELECT * FROM assembled_devices WHERE device_name = $1 AND component_type = 'component' AND quantity > 0",
      [deviceName]
    );
    res.json({ device_name: deviceName, assembled_components: assembled.rows, skippable_subtasks: assembled.rows.map(a => a.component_name) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/use-component", async (req, res) => {
  try {
    const { device_name, component_name, user_login } = req.body;
    if (!device_name || !component_name) return res.status(400).json({ error: "Укажите прибор и компонент" });
    const component = await db.query(
      "SELECT * FROM assembled_devices WHERE device_name = $1 AND component_name = $2 AND component_type = 'component' AND quantity > 0 ORDER BY quantity DESC LIMIT 1",
      [device_name, component_name]
    );
    if (component.rows.length === 0) return res.status(404).json({ error: `"${component_name}" не найден` });
    const item = component.rows[0];
    if (item.quantity > 1) {
      await db.query("UPDATE assembled_devices SET quantity = quantity - 1 WHERE id = $1", [item.id]);
    } else {
      await db.query("DELETE FROM assembled_devices WHERE id = $1", [item.id]);
    }
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Использовал собранный компонент "${component_name}" для "${device_name}"`]);
    res.json({ message: `"${component_name}" списан`, remaining: Math.max(0, item.quantity - 1) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/:id/ship", async (req, res) => {
  try {
    const { user_login } = req.body;
    const id = parseInt(req.params.id);
    const item = await db.query("SELECT * FROM assembled_devices WHERE id = $1", [id]);
    if (item.rows.length === 0) return res.status(404).json({ error: "Не найден" });
    const data = item.rows[0];
    if (data.component_type !== 'device') return res.status(400).json({ error: "Отправлять можно только приборы" });

    if (data.quantity > 1) {
      await db.query("UPDATE assembled_devices SET quantity = quantity - 1 WHERE id = $1", [id]);
    } else {
      await db.query("DELETE FROM assembled_devices WHERE id = $1", [id]);
      await db.query("DELETE FROM assembled_devices WHERE device_name = $1 AND component_type = 'component'", [data.device_name]);
    }

    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] 📤 Отправил покупателю прибор: "${data.device_name}" (1 шт.)`]);
    res.json({ message: `"${data.device_name}" отправлен (1 шт.)`, remaining: Math.max(0, data.quantity - 1) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const { user_login } = req.body;
    const id = parseInt(req.params.id);
    const item = await db.query("SELECT * FROM assembled_devices WHERE id = $1", [id]);
    if (item.rows.length === 0) return res.status(404).json({ error: "Не найдена" });
    const data = item.rows[0];
    if (data.component_type === 'device') return res.status(400).json({ error: "Используйте 'Отправлен' для прибора" });

    if (data.quantity > 1) {
      await db.query("UPDATE assembled_devices SET quantity = quantity - 1 WHERE id = $1", [id]);
    } else {
      await db.query("DELETE FROM assembled_devices WHERE id = $1", [id]);
    }

    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] 🗑 Удалил компонент: "${data.component_name}" (1 шт.)`]);
    res.json({ message: `"${data.component_name}" удалён (1 шт.)`, remaining: Math.max(0, data.quantity - 1) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/:id", async (req, res) => {
  try {
    const { quantity, user_login } = req.body;
    const id = parseInt(req.params.id);
    const qty = Math.max(0, parseInt(quantity) || 0);
    if (qty === 0) {
      await db.query("DELETE FROM assembled_devices WHERE id = $1", [id]);
      return res.json({ message: "Удалено (0 шт.)" });
    }
    const result = await db.query("UPDATE assembled_devices SET quantity = $1 WHERE id = $2 RETURNING *", [qty, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Не найдена" });
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
