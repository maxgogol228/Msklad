const router = require("express").Router();
const db = require("../db");

router.get("/", async (req, res) => {
  const result = await db.query("SELECT * FROM logs ORDER BY id DESC");
  res.json(result.rows);
});

router.post("/", async (req, res) => {
  const { action, user } = req.body;

  await db.query(
    "INSERT INTO logs(action, user_name) VALUES($1,$2)",
    [action, user]
  );

  res.sendStatus(200);
});

module.exports = router;