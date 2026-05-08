const router = require("express").Router();
const db = require("../db");

// ========================
// LOGIN
// ========================
router.post("/login", async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: "Логин и пароль обязательны" });
    }

    const result = await db.query(
      "SELECT * FROM users WHERE login = $1",
      [login]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Неверный логин или пароль" });
    }

    const user = result.rows[0];

    if (user.access_key !== password) {
      return res.status(401).json({ error: "Неверный логин или пароль" });
    }

    if (!user.approved) {
      return res.status(403).json({ error: "Аккаунт ожидает подтверждения администратором" });
    }

    // Логируем вход
    await db.query(
      "INSERT INTO logs(action) VALUES($1)",
      [`Вход в систему: ${user.login}`]
    );

    // Возвращаем данные пользователя (без пароля)
    res.json({
      id: user.id,
      login: user.login,
      name: user.login,
      approved: user.approved,
      is_admin: user.is_admin
    });

  } catch (e) {
    console.error("LOGIN ERROR:", e);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// ========================
// REGISTER
// ========================
router.post("/register", async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: "Логин и пароль обязательны" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Пароль должен быть не менее 6 символов" });
    }

    // Проверяем, существует ли пользователь
    const existing = await db.query(
      "SELECT id FROM users WHERE login = $1",
      [login]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Пользователь с таким логином уже существует" });
    }

    // Проверяем, первый ли это пользователь
    const usersCount = await db.query("SELECT COUNT(*) as count FROM users");
    const isFirstUser = parseInt(usersCount.rows[0].count) === 0;

    // Создаем пользователя
    await db.query(
      "INSERT INTO users (login, access_key, approved, is_admin) VALUES ($1, $2, $3, $4)",
      [login, password, isFirstUser, isFirstUser]
    );

    // Логируем регистрацию
    await db.query(
      "INSERT INTO logs(action) VALUES($1)",
      [`Регистрация нового пользователя: ${login}`]
    );

    if (isFirstUser) {
      res.json({ 
        message: "Первый пользователь создан с правами администратора. Теперь вы можете войти.",
        is_admin: true 
      });
    } else {
      res.json({ message: "Регистрация успешна. Ожидайте подтверждения администратором." });
    }

  } catch (e) {
    console.error("REGISTER ERROR:", e);
    res.status(500).json({ error: "Ошибка регистрации" });
  }
});

// ========================
// PROMOTE TO ADMIN (ВРЕМЕННЫЙ МАРШРУТ)
// ========================
router.post("/promote-to-admin", async (req, res) => {
  try {
    const { login, secret_key } = req.body;
    
    // Получаем секретный ключ из переменных окружения
    const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY;
    
    if (!ADMIN_SECRET_KEY) {
      return res.status(500).json({ 
        error: "Секретный ключ не настроен на сервере. Добавьте переменную ADMIN_SECRET_KEY в настройках Render." 
      });
    }
    
    if (!secret_key) {
      return res.status(400).json({ error: "Укажите secret_key" });
    }
    
    if (secret_key !== ADMIN_SECRET_KEY) {
      return res.status(403).json({ error: "Неверный секретный ключ" });
    }
    
    if (!login) {
      return res.status(400).json({ error: "Укажите логин пользователя" });
    }
    
    // Проверяем существование пользователя
    const userCheck = await db.query(
      "SELECT id, login FROM users WHERE login = $1",
      [login]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    
    // Повышаем до админа
    const result = await db.query(
      "UPDATE users SET is_admin = true, approved = true WHERE login = $1 RETURNING id, login, is_admin, approved",
      [login]
    );
    
    // Логируем
    await db.query(
      "INSERT INTO logs(action) VALUES($1)",
      [`Пользователь ${login} получил права администратора`]
    );
    
    res.json({ 
      success: true,
      message: `✅ Пользователь ${login} теперь администратор! Перезайдите в систему.`,
      user: result.rows[0]
    });
    
  } catch (e) {
    console.error("PROMOTE ERROR:", e);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// ========================
// GET CURRENT USER INFO
// ========================
router.get("/me", async (req, res) => {
  try {
    // Этот эндпоинт требует ID пользователя в заголовке
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: "Не авторизован" });
    }
    
    const result = await db.query(
      "SELECT id, login, approved, is_admin, created_at FROM users WHERE id = $1",
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    
    res.json(result.rows[0]);
    
  } catch (e) {
    console.error("ME ERROR:", e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;