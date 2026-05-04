const router = require("express").Router();
const db = require("../db");

router.get("/", async (req, res) => {
  const r = await db.query("SELECT * FROM items ORDER BY id DESC");
  res.json(r.rows);
});

router.post("/", async (req, res) => {
  const { name, quantity } = req.body;

  const r = await db.query(
    "INSERT INTO items(name, quantity) VALUES($1,$2) RETURNING *",
    [name, quantity]
  );

  res.json(r.rows[0]);
});

router.put("/:id", async (req, res) => {
  const { name, quantity } = req.body;

  await db.query(
    "UPDATE items SET name=$1, quantity=$2 WHERE id=$3",
    [name, quantity, req.params.id]
  );

  res.sendStatus(200);
});

router.delete("/:id", async (req, res) => {
  await db.query("DELETE FROM items WHERE id=$1", [req.params.id]);
  res.sendStatus(200);
});

module.exports = router;
