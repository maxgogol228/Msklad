const router = require("express").Router();
const { pool } = require("../db/db");

router.get("/items", async (req, res) => {
  const result = await pool.query("SELECT * FROM items");
  res.json(result.rows);
});

module.exports = router;
