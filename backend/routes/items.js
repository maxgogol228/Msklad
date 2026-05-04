const router = require("express").Router();
const db = require("../db");

// получить все
router.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM items ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("GET ITEMS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// создать
router.post("/", async (req, res) => {
  try {
    const { name, quantity } = req.body;

    const result = await db.query(
      "INSERT INTO items(name, quantity) VALUES($1,$2) RETURNING *",
      [name, quantity]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("POST ITEMS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// обновить
router.put("/:id", async (req, res) => {
  try {
    const { name, quantity } = req.body;

    await db.query(
      "UPDATE items SET name=$1, quantity=$2 WHERE id=$3",
      [name, quantity, req.params.id]
    );

    res.sendStatus(200);
  } catch (err) {
    console.error("PUT ITEMS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// удалить
router.delete("/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM items WHERE id=$1", [req.params.id]);
    res.sendStatus(200);
  } catch (err) {
    console.error("DELETE ITEMS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
