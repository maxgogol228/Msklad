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

    // Отправляем пользователя с полем name для совместимости с фронтендом
    res.json({
      ...user,
      name: user.login // Добавляем name для фронтенда
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

    // Проверяем, существует ли пользователь
    const existing = await db.query(
      "SELECT * FROM users WHERE login=$1",
      [login]
    );

    if (existing.rows.length) {
      return res.status(400).json({ error: "Пользователь уже существует" });
    }

    // Проверяем, есть ли уже пользователи в системе
    const usersCount = await db.query("SELECT COUNT(*) FROM users");
    const isFirstUser = parseInt(usersCount.rows[0].count) === 0;

    // Создаем нового пользователя
    // Если это первый пользователь - делаем его админом
    await db.query(
      "INSERT INTO users (login, access_key, approved, is_admin) VALUES ($1, $2, $3, $4)",
      [login, password, isFirstUser, isFirstUser] // Первый пользователь авто-подтверждён и админ
    );

    if (isFirstUser) {
      res.json({ message: "Первый пользователь создан с правами администратора" });
    } else {
      res.json({ message: "Ожидает подтверждения администратора" });
    }

  } catch (e) {
    console.error("REGISTER ERROR:", e);
    res.status(500).json({ error: "Ошибка регистрации" });
  }
});
module.exports = router;
