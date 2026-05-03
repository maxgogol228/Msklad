const router = require("express").Router();
const db = require("../db");

// получить все
router.get("/", async (req, res) => {
  const result = await db.query("SELECT * FROM items ORDER BY id DESC");
  res.json(result.rows);
});

// создать
router.post("/", async (req, res) => {
  try {
    const { name, quantity, min_quantity, order_link, image } = req.body;

    const result = await db.query(
      "INSERT INTO items(name, quantity, min_quantity, order_link, image) VALUES($1,$2,$3,$4,$5) RETURNING *",
      [name, quantity, min_quantity, order_link, image]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("POST /items error:", err);
    res.status(500).json({ error: err.message });
  }
});

// обновить
router.put("/:id", async (req, res) => {
  const { name, quantity, min_quantity, order_link, image } = req.body;

  await db.query(
    "UPDATE items SET name=$1, quantity=$2, min_quantity=$3, order_link=$4, image=$5 WHERE id=$6",
    [name, quantity, min_quantity, order_link, image, req.params.id]
  );

  res.sendStatus(200);
});

module.exports = router;
