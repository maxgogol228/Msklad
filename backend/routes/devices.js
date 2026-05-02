const router = require("express").Router();
const db = require("../db");

// список приборов
router.get("/", async (req, res) => {
  const result = await db.query("SELECT * FROM devices ORDER BY id DESC");
  res.json(result.rows);
});

// создать прибор
router.post("/", async (req, res) => {
  const { name, components } = req.body;

  const result = await db.query(
    "INSERT INTO devices(name, components) VALUES($1,$2) RETURNING *",
    [name, JSON.stringify(components)]
  );

  res.json(result.rows[0]);
});

// сборка прибора (списание)
router.post("/:id/assemble", async (req, res) => {
  const device = await db.query(
    "SELECT * FROM devices WHERE id=$1",
    [req.params.id]
  );

  const components = device.rows[0].components;

  for (let c of components) {
    await db.query(
      "UPDATE items SET quantity = quantity - $1 WHERE id=$2",
      [c.quantity, c.item_id]
    );
  }

  res.send("Собрано");
});

module.exports = router;