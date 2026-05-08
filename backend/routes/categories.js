const router = require("express").Router();
const db = require("../db");

// Получить все категории
router.get("/", async (req, res) => {
  try {
    const { type } = req.query;
    let query = "SELECT * FROM categories";
    const params = [];
    
    if (type) {
      query += " WHERE type = $1";
      params.push(type);
    }
    
    query += " ORDER BY name";
    const r = await db.query(query, params);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Создать категорию
router.post("/", async (req, res) => {
  try {
    const { name, type } = req.body;
    const r = await db.query(
      "INSERT INTO categories(name, type) VALUES($1, $2) RETURNING *",
      [name, type]
    );
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Обновить категорию
router.put("/:id", async (req, res) => {
  try {
    const { name } = req.body;
    await db.query(
      "UPDATE categories SET name=$1 WHERE id=$2",
      [name, req.params.id]
    );
    res.sendStatus(200);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Удалить категорию
router.delete("/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM categories WHERE id=$1", [req.params.id]);
    res.sendStatus(200);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
