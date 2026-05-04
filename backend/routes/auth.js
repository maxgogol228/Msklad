const router = require("express").Router();
const db = require("../db");

// login
router.post("/login", async (req, res) => {
  try {
    const { name, key } = req.body;

    const r = await db.query(
      "SELECT * FROM users WHERE name=$1",
      [name]
    );

    if (!r.rows.length) return res.status(401).json({ error: "Нет пользователя" });

    const user = r.rows[0];

    if (user.access_key !== key)
      return res.status(401).json({ error: "Неверный ключ" });

    if (!user.approved)
      return res.status(403).json({ error: "Не подтвержден" });

    res.json(user);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// register
router.post("/register", async (req, res) => {
  try {
    const { name, key } = req.body;

    await db.query(
      "INSERT INTO users(name, access_key) VALUES($1,$2)",
      [name, key]
    );

    res.json({ ok: true });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
