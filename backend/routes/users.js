const router = require("express").Router();
const db = require("../db");

// список
router.get("/", async (req, res) => {
  const r = await db.query("SELECT * FROM users ORDER BY id DESC");
  res.json(r.rows);
});

// подтвердить
router.post("/approve/:id", async (req, res) => {
  await db.query("UPDATE users SET approved=true WHERE id=$1", [req.params.id]);
  res.sendStatus(200);
});

// дать админку
router.post("/make-admin/:id", async (req, res) => {
  await db.query("UPDATE users SET is_admin=true WHERE id=$1", [req.params.id]);
  res.sendStatus(200);
});

// убрать админку
router.post("/remove-admin/:id", async (req, res) => {
  await db.query("UPDATE users SET is_admin=false WHERE id=$1", [req.params.id]);
  res.sendStatus(200);
});

// удалить
router.delete("/:id", async (req, res) => {
  await db.query("DELETE FROM users WHERE id=$1", [req.params.id]);
  res.sendStatus(200);
});

module.exports = router;
