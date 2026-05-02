const router = require("express").Router();
const db = require("../db");

router.get("/", async (req, res) => {
  const result = await db.query("SELECT * FROM consumables ORDER BY id DESC");
  res.json(result.rows);
});

router.post("/", async (req, res) => {
  const { name, quantity, min_quantity, order_link } = req.body;

  const result = await db.query(
    "INSERT INTO consumables(name, quantity, min_quantity, order_link) VALUES($1,$2,$3,$4) RETURNING *",
    [name, quantity, min_quantity, order_link]
  );

  res.json(result.rows[0]);
});

router.put("/:id", async (req, res) => {
  const { name, quantity, min_quantity, order_link } = req.body;

  await db.query(
    "UPDATE consumables SET name=$1, quantity=$2, min_quantity=$3, order_link=$4 WHERE id=$5",
    [name, quantity, min_quantity, order_link, req.params.id]
  );

  res.sendStatus(200);
});

module.exports = router;