const router = require("express").Router();
const db = require("../db");

// =======================
// LOGIN
// =======================
router.post("/login", async (req, res) => {
  try {
    const { login, password } = req.body;

    const result = await db.query(
      "SELECT * FROM users WHERE login=$1",
      [login]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Пользователь не найден" });
    }

    const user = result.rows[0];

    if (user.password !== password) {
      return res.status(400).json({ error: "Неверный пароль" });
    }

    if (!user.approved) {
      return res.status(403).json({ error: "Ожидает подтверждения" });
    }

    res.json(user);
    catch (err) {
    console.error("LOGIN FULL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// REGISTER
// =======================
router.post("/register", async (req, res) => {
  try {
    const { login, password } = req.body;

    await db.query(
      "INSERT INTO users (login, password, approved, is_admin) VALUES ($1, $2, false, false)",
      [login, password]
    );

    res.json({ message: "Ожидает подтверждения" });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ error: "Ошибка регистрации" });
  }
});

module.exports = router;
