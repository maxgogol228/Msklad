const router = require("express").Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const r = await db.query(`
      SELECT c.*, cat.name as category_name 
      FROM consumables c 
      LEFT JOIN categories cat ON c.category_id = cat.id 
      ORDER BY cat.name, c.name
    `);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  const { name, quantity, min_quantity, category_id } = req.body;
  try {
    const r = await db.query(
      "INSERT INTO consumables(name, quantity, min_quantity, category_id) VALUES($1,$2,$3,$4) RETURNING *",
      [name, quantity || 0, min_quantity || null, category_id || null]
    );
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/:id", async (req, res) => {
  const { name, quantity, min_quantity, category_id } = req.body;
  try {
    await db.query(
      "UPDATE consumables SET name=$1, quantity=$2, min_quantity=$3, category_id=$4 WHERE id=$5",
      [name, quantity, min_quantity || null, category_id || null, req.params.id]
    );
    res.sendStatus(200);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const item = await db.query("SELECT * FROM consumables WHERE id=$1", [req.params.id]);
    
    if (item.rows.length > 0) {
      const i = item.rows[0];
      await db.query(
        "INSERT INTO archived_consumables(original_id, name, quantity, min_quantity, category_id) VALUES($1,$2,$3,$4,$5)",
        [i.id, i.name, i.quantity, i.min_quantity, i.category_id]
      );
    }

    await db.query("DELETE FROM consumables WHERE id=$1", [req.params.id]);
    res.json({ message: "Расходник перемещён в архив" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
