const router = require("express").Router();
const db = require("../db");

// Получить все собранные
router.get("/", async (req, res) => {
  try {
    const items = await db.query("SELECT * FROM assembled_devices ORDER BY created_at DESC");
    res.json(items.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Получить забронированные
router.get("/reserved", async (req, res) => {
  try {
    const items = await db.query("SELECT * FROM reserved_devices WHERE shipped = false ORDER BY reserved_at DESC");
    res.json(items.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Добавить в собранные
router.post("/", async (req, res) => {
  try {
    const { device_id, device_name, component_name, component_type, quantity, assembled_by } = req.body;
    if (!device_name) return res.status(400).json({ error: "Название прибора обязательно" });
    const qty = Math.max(1, parseInt(quantity) || 1);

    const existing = await db.query(
      "SELECT * FROM assembled_devices WHERE device_name = $1 AND component_type = $2 AND COALESCE(component_name, '') = COALESCE($3, '')",
      [device_name, component_type || 'device', component_name || '']
    );

    let result;
    if (existing.rows.length > 0) {
      result = await db.query(
        "UPDATE assembled_devices SET quantity = quantity + $1 WHERE id = $2 RETURNING *",
        [qty, existing.rows[0].id]
      );
    } else {
      result = await db.query(
        "INSERT INTO assembled_devices (device_id, device_name, component_name, component_type, quantity, assembled_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
        [device_id || null, device_name, component_name || null, component_type || 'device', qty, assembled_by || null]
      );
    }

    const itemName = component_name || device_name;
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${assembled_by || 'Система'}] Добавил в собранные: "${itemName}" (+${qty} шт.)`]);
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Проверить собранные компоненты для прибора
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

// Использовать собранный компонент
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
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Использовал компонент "${component_name}" для "${device_name}"`]);
    res.json({ message: `"${component_name}" списан`, remaining: Math.max(0, item.quantity - 1) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Забронировать прибор
router.post("/:id/reserve", async (req, res) => {
  try {
    const { user_login, order_number, customer } = req.body;
    const id = parseInt(req.params.id);
    const item = await db.query("SELECT * FROM assembled_devices WHERE id = $1", [id]);
    if (item.rows.length === 0) return res.status(404).json({ error: "Не найден" });
    const data = item.rows[0];
    if (data.component_type !== 'device') return res.status(400).json({ error: "Бронировать можно только приборы" });

    if (data.quantity > 1) {
      await db.query("UPDATE assembled_devices SET quantity = quantity - 1 WHERE id = $1", [id]);
    } else {
      await db.query("DELETE FROM assembled_devices WHERE id = $1", [id]);
    }

    const result = await db.query(
      "INSERT INTO reserved_devices (device_name, quantity, cost, order_number, customer, reserved_by) VALUES ($1,1,$2,$3,$4,$5) RETURNING *",
      [data.device_name, data.cost || 0, order_number || '', customer || '', user_login || 'Система']
    );

    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Забронировал прибор: "${data.device_name}"`]);
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Отправить забронированный прибор
router.post("/reserved/:id/ship", async (req, res) => {
  try {
    const { user_login } = req.body;
    const id = parseInt(req.params.id);
    const item = await db.query("SELECT * FROM reserved_devices WHERE id = $1", [id]);
    if (item.rows.length === 0) return res.status(404).json({ error: "Не найден" });

    await db.query("UPDATE reserved_devices SET shipped = true, shipped_at = NOW() WHERE id = $1", [id]);
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Отправил прибор: "${item.rows[0].device_name}"`]);
    res.json({ message: `Прибор "${item.rows[0].device_name}" отправлен` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Обновить данные забронированного прибора
router.put("/reserved/:id", async (req, res) => {
  try {
    const { order_number, customer } = req.body;
    const id = parseInt(req.params.id);
    const result = await db.query(
      "UPDATE reserved_devices SET order_number = $1, customer = $2 WHERE id = $3 RETURNING *",
      [order_number || '', customer || '', id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Не найден" });
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Вернуть из брони в собранные
router.delete("/reserved/:id", async (req, res) => {
  try {
    const { user_login } = req.body;
    const id = parseInt(req.params.id);
    const item = await db.query("SELECT * FROM reserved_devices WHERE id = $1", [id]);
    if (item.rows.length === 0) return res.status(404).json({ error: "Не найден" });
    const data = item.rows[0];

    const existing = await db.query(
      "SELECT * FROM assembled_devices WHERE device_name = $1 AND component_type = 'device'",
      [data.device_name]
    );
    if (existing.rows.length > 0) {
      await db.query("UPDATE assembled_devices SET quantity = quantity + 1, cost = $1 WHERE id = $2", [data.cost, existing.rows[0].id]);
    } else {
      await db.query(
        "INSERT INTO assembled_devices (device_name, component_type, quantity, cost, assembled_by) VALUES ($1,'device',1,$2,$3)",
        [data.device_name, data.cost, user_login]
      );
    }

    await db.query("DELETE FROM reserved_devices WHERE id = $1", [id]);
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Вернул прибор из брони: "${data.device_name}"`]);
    res.json({ message: "Прибор возвращён в собранные" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Отправить прибор (старый метод, оставлен для совместимости)
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

    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Отправил прибор: "${data.device_name}" (1 шт.)`]);
    res.json({ message: `"${data.device_name}" отправлен (1 шт.)`, remaining: Math.max(0, data.quantity - 1) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Удалить компонент
router.delete("/:id", async (req, res) => {
  try {
    const { user_login } = req.body;
    const id = parseInt(req.params.id);
    const item = await db.query("SELECT * FROM assembled_devices WHERE id = $1", [id]);
    if (item.rows.length === 0) return res.status(404).json({ error: "Не найдена" });
    const data = item.rows[0];
    if (data.component_type === 'device') return res.status(400).json({ error: "Используйте 'Бронь' для прибора" });

    if (data.quantity > 1) {
      await db.query("UPDATE assembled_devices SET quantity = quantity - 1 WHERE id = $1", [id]);
    } else {
      await db.query("DELETE FROM assembled_devices WHERE id = $1", [id]);
    }

    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Удалил компонент: "${data.component_name}" (1 шт.)`]);
    res.json({ message: `"${data.component_name}" удалён (1 шт.)`, remaining: Math.max(0, data.quantity - 1) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Обновить количество
router.put("/:id", async (req, res) => {
  try {
    const { quantity } = req.body;
    const id = parseInt(req.params.id);
    const qty = Math.max(0, parseInt(quantity) || 0);
    if (qty === 0) { await db.query("DELETE FROM assembled_devices WHERE id = $1", [id]); return res.json({ message: "Удалено (0 шт.)" }); }
    const result = await db.query("UPDATE assembled_devices SET quantity = $1 WHERE id = $2 RETURNING *", [qty, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Не найдена" });
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
