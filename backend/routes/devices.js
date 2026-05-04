const router = require("express").Router();
const db = require("../db");

router.get("/", async (req, res) => {
  const d = await db.query("SELECT * FROM devices ORDER BY id DESC");
  res.json(d.rows);
});

router.post("/", async (req, res) => {
  const r = await db.query(
    "INSERT INTO devices(name) VALUES($1) RETURNING *",
    [req.body.name || "Прибор"]
  );

  res.json(r.rows[0]);
});

router.post("/:id/build", async (req, res) => {
  // пока простая заглушка
  await db.query(
    "INSERT INTO logs(action) VALUES($1)",
    [`Собран прибор ${req.params.id}`]
  );

  res.json({ ok: true });
});

module.exports = router;
