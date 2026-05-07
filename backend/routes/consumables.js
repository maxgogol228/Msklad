const router = require("express").Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const r = await db.query("SELECT * FROM consumables ORDER BY id DESC");
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  const { name, quantity, min_quantity } = req.body;
  try {
    const r = await db.query(
      "INSERT INTO consumables(name, quantity, min_quantity) VALUES($1,$2,$3) RETURNING *",
      [name, quantity || 0, min_quantity || null]
    );
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/:id", async (req, res) => {
  const { name, quantity, min_quantity } = req.body;
  try {
    await db.query(
      "UPDATE consumables SET name=$1, quantity=$2, min_quantity=$3 WHERE id=$4",
      [name, quantity, min_quantity || null, req.params.id]
    );
    res.sendStatus(200);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM consumables WHERE id=$1", [req.params.id]);
    res.sendStatus(200);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
