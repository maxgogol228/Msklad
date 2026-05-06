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
router.post("/login", async (req, res) => {
  const { login, password } = req.body;

  const user = await db.query(
    "SELECT * FROM users WHERE login=$1",
    [login]
  );

  if (!user.rows.length) {
    return res.status(400).json({ error: "Нет пользователя" });
  }

  const u = user.rows[0];

  if (u.password !== password) {
    return res.status(400).json({ error: "Неверный пароль" });
  }

  if (!u.approved) {
    return res.status(403).json({ error: "Не подтверждён" });
  }

  res.json(u);
});
