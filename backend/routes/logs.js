const router = require("express").Router();
const db = require("../db");

router.get("/", async (req, res) => {
  const r = await db.query("SELECT * FROM logs ORDER BY id DESC");
  res.json(r.rows);
});

module.exports = router;
