const router = require("express").Router();
const db = require("../db");

router.get("/", async (req, res) => {
  const result = await db.query("SELECT * FROM snapshots ORDER BY id DESC");
  res.json(result.rows);
});

router.post("/", async (req, res) => {
  const { data, user } = req.body;

  await db.query(
    "INSERT INTO snapshots(data, user_name) VALUES($1,$2)",
    [JSON.stringify(data), user]
  );

  res.sendStatus(200);
});

module.exports = router;
