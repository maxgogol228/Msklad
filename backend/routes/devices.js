const router = require("express").Router();
const db = require("../db");

// получить приборы с составом
router.get("/", async (req, res) => {
  const devices = await db.query("SELECT * FROM devices ORDER BY id DESC");

  for (let d of devices.rows) {
    const items = await db.query(
      `SELECT di.*, i.name 
       FROM device_items di 
       JOIN items i ON i.id = di.item_id
       WHERE device_id=$1`,
      [d.id]
    );

    const consumables = await db.query(
      `SELECT dc.*, c.name 
       FROM device_consumables dc 
       JOIN consumables c ON c.id = dc.consumable_id
       WHERE device_id=$1`,
      [d.id]
    );

    d.items = items.rows;
    d.consumables = consumables.rows;
  }

  res.json(devices.rows);
});


// создать прибор
router.post("/", async (req, res) => {
  const { name } = req.body;

  const r = await db.query(
    "INSERT INTO devices(name) VALUES($1) RETURNING *",
    [name || "Прибор"]
  );

  res.json(r.rows[0]);
});


// обновить состав
router.put("/:id", async (req, res) => {
  const { name, items = [], consumables = [] } = req.body;

  await db.query("UPDATE devices SET name=$1 WHERE id=$2", [name, req.params.id]);

  // очистка
  await db.query("DELETE FROM device_items WHERE device_id=$1", [req.params.id]);
  await db.query("DELETE FROM device_consumables WHERE device_id=$1", [req.params.id]);

  // вставка
  for (let i of items) {
    await db.query(
      "INSERT INTO device_items(device_id,item_id,quantity) VALUES($1,$2,$3)",
      [req.params.id, i.item_id, i.quantity]
    );
  }

  for (let c of consumables) {
    await db.query(
      "INSERT INTO device_consumables(device_id,consumable_id,quantity) VALUES($1,$2,$3)",
      [req.params.id, c.consumable_id, c.quantity]
    );
  }

  res.sendStatus(200);
});


// собрать прибор (списание)
router.post("/:id/build", async (req, res) => {
  const id = req.params.id;

  const items = await db.query(
    "SELECT * FROM device_items WHERE device_id=$1",
    [id]
  );

  for (let i of items.rows) {
    await db.query(
      "UPDATE items SET quantity = quantity - $1 WHERE id=$2",
      [i.quantity, i.item_id]
    );
  }

  const cons = await db.query(
    "SELECT * FROM device_consumables WHERE device_id=$1",
    [id]
  );

  for (let c of cons.rows) {
    await db.query(
      "UPDATE consumables SET quantity = quantity - $1 WHERE id=$2",
      [c.quantity, c.consumable_id]
    );
  }

  res.json({ ok: true });
});


// удалить
router.delete("/:id", async (req, res) => {
  await db.query("DELETE FROM devices WHERE id=$1", [req.params.id]);
  res.sendStatus(200);
});

module.exports = router;
