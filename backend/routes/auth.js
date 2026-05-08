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

  // ВРЕМЕННЫЙ МАРШРУТ ДЛЯ ПОВЫШЕНИЯ ПРАВ (УДАЛИТЬ ПОСЛЕ ИСПОЛЬЗОВАНИЯ)
router.post("/promote-to-admin", async (req, res) => {
  try {
    const { login, secret_key } = req.body;
    
    // Проверка ключа безопасности
    if (secret_key !== "admin_promote_2024") {
      return res.status(403).json({ error: "Неверный ключ безопасности" });
    }
    
    if (!login) {
      return res.status(400).json({ error: "Укажите логин" });
    }
    
    const result = await db.query(
      "UPDATE users SET is_admin = true, approved = true WHERE login = $1 RETURNING id, login, is_admin, approved",
      [login]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    
    res.json({ 
      success: true,
      message: "Права администратора успешно выданы!",
      user: result.rows[0]
    });
    
  } catch (e) {
    console.error("Promote error:", e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
