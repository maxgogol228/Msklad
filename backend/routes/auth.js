const router = require("express").Router();
const db = require("../db");

// login
router.post("/login", async (req, res) => {
  try {
    const { login, password } = req.body;

    const r = await db.query(
      "SELECT * FROM users WHERE login=$1",
      [login]
    );

    if (!r.rows.length) 
      return res.status(401).json({ error: "Неверный логин или пароль" });

    const user = r.rows[0];

    if (user.access_key !== password)
      return res.status(401).json({ error: "Неверный логин или пароль" });

    if (!user.approved)
      return res.status(403).json({ error: "Ожидает подтверждения" });

    res.json({
      id: user.id,
      login: user.login,
      name: user.login,
      approved: user.approved,
      is_admin: user.is_admin
    });

  } catch (e) {
    console.error("LOGIN ERROR:", e);
    res.status(500).json({ error: e.message });
  }
});

// register
router.post("/register", async (req, res) => {
  try {
    const { login, password } = req.body;

    const existing = await db.query(
      "SELECT * FROM users WHERE login=$1",
      [login]
    );

    if (existing.rows.length) {
      return res.status(400).json({ error: "Пользователь уже существует" });
    }

    await db.query(
      "INSERT INTO users (login, access_key, approved, is_admin) VALUES ($1, $2, false, false)",
      [login, password]
    );

    res.json({ message: "Ожидает подтверждения администратора" });

  } catch (e) {
    console.error("REGISTER ERROR:", e);
    res.status(500).json({ error: "Ошибка регистрации" });
  }
});

// ВРЕМЕННЫЙ МАРШРУТ ДЛЯ ПОВЫШЕНИЯ ПРАВ (УДАЛИТЬ ПОСЛЕ ИСПОЛЬЗОВАНИЯ!)
// ВРЕМЕННЫЙ МАРШРУТ ДЛЯ ПОВЫШЕНИЯ ПРАВ
router.post("/force-admin", async (req, res) => {
  const { login } = req.body;
  await db.query(
    "UPDATE users SET is_admin = true, approved = true WHERE login = $1",
    [login]
  );
  res.json({ success: true });
});
    
    res.json({ 
      success: true,
      message: "✅ Права администратора успешно выданы! Перезайдите в систему.",
      user: result.rows[0]
    });
    
  } catch (e) {
    console.error("Promote error:", e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
