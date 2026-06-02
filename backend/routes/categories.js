const router = require("express").Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const { type } = req.query;
    let query = "SELECT * FROM categories";
    const params = [];
    if (type) { query += " WHERE type = $1"; params.push(type); }
    query += " ORDER BY name";
    const r = await db.query(query, params);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/", async (req, res) => {
  try {
    const { name, type, user_login } = req.body;
    const r = await db.query("INSERT INTO categories(name, type) VALUES($1, $2) RETURNING *", [name, type]);
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Создал категорию: "${name}" (${type})`]);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/:id", async (req, res) => {
  try {
    const { name, user_login } = req.body;
    await db.query("UPDATE categories SET name=$1 WHERE id=$2", [name, req.params.id]);
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Переименовал категорию #${req.params.id} в "${name}"`]);
    res.sendStatus(200);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const { user_login } = req.body;
    const cat = await db.query("SELECT name FROM categories WHERE id=$1", [req.params.id]);
    await db.query("DELETE FROM categories WHERE id=$1", [req.params.id]);
    if (cat.rows.length > 0) {
      await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Удалил категорию: "${cat.rows[0].name}"`]);
    }
    res.sendStatus(200);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
