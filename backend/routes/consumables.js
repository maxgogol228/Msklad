const router = require("express").Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const r = await db.query(`
      SELECT c.*, cat.name as category_name 
      FROM consumables c LEFT JOIN categories cat ON c.category_id = cat.id 
      ORDER BY cat.name, c.name
    `);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/", async (req, res) => {
  try {
    const { name, quantity, min_quantity, unit, category_id, shelf, shelf_position, user_login } = req.body;
    const r = await db.query(
      "INSERT INTO consumables(name, quantity, min_quantity, unit, category_id, shelf, shelf_position) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [name, parseFloat(quantity) || 0, min_quantity ? parseFloat(min_quantity) : null, unit || 'шт.', category_id || null, shelf || '', shelf_position || '']
    );
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Добавил расходник: "${name}"`]);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/:id", async (req, res) => {
  try {
    const { name, quantity, min_quantity, unit, category_id, shelf, shelf_position, user_login } = req.body;
    const old = await db.query("SELECT name, quantity FROM consumables WHERE id = $1", [req.params.id]);
    await db.query(
      "UPDATE consumables SET name=$1, quantity=$2, min_quantity=$3, unit=$4, category_id=$5, shelf=$6, shelf_position=$7 WHERE id=$8",
      [name, parseFloat(quantity) || 0, min_quantity ? parseFloat(min_quantity) : null, unit || 'шт.', category_id || null, shelf || '', shelf_position || '', req.params.id]
    );
    if (old.rows.length > 0) {
      const changes = [];
      if (old.rows[0].name !== name) changes.push(`название: "${old.rows[0].name}" → "${name}"`);
      if (parseFloat(old.rows[0].quantity) !== parseFloat(quantity)) changes.push(`кол-во: ${old.rows[0].quantity} → ${parseFloat(quantity) || 0}`);
      if (changes.length > 0) {
        await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Изменил расходник "${name}": ${changes.join(', ')}`]);
      }
    }
    res.sendStatus(200);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const { user_login } = req.body;
    const consumableId = parseInt(req.params.id);
    const item = await db.query("SELECT * FROM consumables WHERE id=$1", [consumableId]);
    if (item.rows.length === 0) return res.status(404).json({ error: "Не найден" });
    const data = item.rows[0];
    await db.query("UPDATE device_items SET consumable_id = NULL WHERE consumable_id = $1", [consumableId]);
    await db.query(
      "INSERT INTO archived_consumables(original_id, name, quantity, min_quantity, unit, category_id) VALUES($1,$2,$3,$4,$5,$6)",
      [data.id, data.name, data.quantity, data.min_quantity, data.unit, data.category_id]
    );
    await db.query("DELETE FROM consumables WHERE id=$1", [consumableId]);
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Удалил расходник в архив: "${data.name}"`]);
    res.json({ message: "Расходник перемещён в архив" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
