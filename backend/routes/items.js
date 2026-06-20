const router = require("express").Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const r = await db.query(`
      SELECT i.*, c.name as category_name 
      FROM items i LEFT JOIN categories c ON i.category_id = c.id 
      ORDER BY c.name, i.name
    `);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/", async (req, res) => {
  try {
    const { name, quantity, min_quantity, category_id, shelf, shelf_position, price, price_per, user_login } = req.body;
    const r = await db.query(
      "INSERT INTO items(name, quantity, min_quantity, category_id, shelf, shelf_position, price, price_per) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
      [name, parseInt(quantity) || 0, min_quantity ? parseInt(min_quantity) : null, category_id || null, shelf || '', shelf_position || '', parseFloat(price) || 0, parseInt(price_per) || 1]
    );
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Добавил деталь: "${name}"`]);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/:id", async (req, res) => {
  try {
    const { name, quantity, min_quantity, category_id, shelf, shelf_position, price, price_per, user_login } = req.body;
    await db.query(
      "UPDATE items SET name=$1, quantity=$2, min_quantity=$3, category_id=$4, shelf=$5, shelf_position=$6, price=$7, price_per=$8 WHERE id=$9",
      [name, parseInt(quantity) || 0, min_quantity ? parseInt(min_quantity) : null, category_id || null, shelf || '', shelf_position || '', parseFloat(price) || 0, parseInt(price_per) || 1, req.params.id]
    );
    res.sendStatus(200);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const { user_login } = req.body;
    const itemId = parseInt(req.params.id);
    const item = await db.query("SELECT * FROM items WHERE id=$1", [itemId]);
    if (item.rows.length === 0) return res.status(404).json({ error: "Не найдена" });
    const data = item.rows[0];
    await db.query("UPDATE device_items SET item_id = NULL WHERE item_id = $1", [itemId]);
    await db.query("INSERT INTO archived_items(original_id, name, quantity, min_quantity, category_id) VALUES($1,$2,$3,$4,$5)", [data.id, data.name, data.quantity, data.min_quantity, data.category_id]);
    await db.query("DELETE FROM items WHERE id=$1", [itemId]);
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Удалил деталь в архив: "${data.name}"`]);
    res.json({ message: "Деталь перемещена в архив" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
