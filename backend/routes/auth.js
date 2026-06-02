const router = require("express").Router();
const db = require("../db");
const crypto = require('crypto');

// Конфигурация супер-админа
const SUPER_ADMIN_LOGIN = process.env.SUPER_ADMIN_LOGIN || 'admin';

// Генерация токена
function generateToken(userId) {
  const payload = {
    userId,
    timestamp: Date.now(),
    random: crypto.randomBytes(16).toString('hex')
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// Проверка токена
function verifyToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    return payload;
  } catch (e) {
    return null;
  }
}

// Проверка, является ли пользователь супер-админом
function isSuperAdmin(login) {
  return login === SUPER_ADMIN_LOGIN;
}

// Middleware для проверки авторизации
const checkAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: "Не авторизован" });
  }

  const payload = verifyToken(token);
  if (!payload || !payload.userId) {
    return res.status(401).json({ error: "Неверный токен" });
  }

  const user = await db.query(
    "SELECT id, login, approved, is_admin FROM users WHERE id = $1",
    [payload.userId]
  );

  if (user.rows.length === 0) {
    return res.status(401).json({ error: "Пользователь удалён" });
  }

  if (!user.rows[0].approved) {
    return res.status(403).json({ error: "Аккаунт не подтверждён" });
  }

  req.user = user.rows[0];
  req.user.is_super_admin = isSuperAdmin(user.rows[0].login);
  next();
};

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

    const token = generateToken(user.id);
    const superAdmin = isSuperAdmin(user.login);

    // Логируем вход
    await db.query(
      "INSERT INTO logs(action) VALUES($1)",
      [`[User: ${user.login}] Вход в систему`]
    );

    res.json({
      token,
      user: {
        id: user.id,
        login: user.login,
        name: user.login,
        approved: user.approved,
        is_admin: superAdmin ? true : user.is_admin,
        is_super_admin: superAdmin
      }
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

    // Запрещаем регистрацию с логином admin
    if (login.toLowerCase() === SUPER_ADMIN_LOGIN.toLowerCase()) {
      return res.status(400).json({ error: "Этот логин зарезервирован" });
    }

    const existing = await db.query(
      "SELECT id FROM users WHERE LOWER(login) = LOWER($1)",
      [login]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Пользователь с таким логином уже существует" });
    }

    const usersCount = await db.query("SELECT COUNT(*) as count FROM users");
    const isFirstUser = parseInt(usersCount.rows[0].count) === 0;

    await db.query(
      "INSERT INTO users (login, access_key, approved, is_admin) VALUES ($1, $2, $3, $4)",
      [login, password, isFirstUser, isFirstUser]
    );

    await db.query(
      "INSERT INTO logs(action) VALUES($1)",
      [`[New User] Регистрация: ${login}`]
    );

    if (isFirstUser) {
      res.json({ 
        message: "Первый пользователь создан с правами администратора. Теперь вы можете войти."
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
// CHECK SESSION
// ========================
router.get("/check-session", checkAuth, async (req, res) => {
  const superAdmin = isSuperAdmin(req.user.login);
  
  res.json({
    user: {
      id: req.user.id,
      login: req.user.login,
      name: req.user.login,
      approved: req.user.approved,
      is_admin: superAdmin ? true : req.user.is_admin,
      is_super_admin: superAdmin
    }
  });
});

// ========================
// PROMOTE TO ADMIN
// ========================
router.post("/promote-to-admin", async (req, res) => {
  try {
    const { login, secret_key } = req.body;
    const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY;
    
    if (!ADMIN_SECRET_KEY) {
      return res.status(500).json({ error: "Секретный ключ не настроен" });
    }
    
    if (secret_key !== ADMIN_SECRET_KEY) {
      return res.status(403).json({ error: "Неверный секретный ключ" });
    }
    
    if (!login) {
      return res.status(400).json({ error: "Укажите логин" });
    }
    
    // Нельзя повышать супер-админа
    if (isSuperAdmin(login)) {
      return res.status(403).json({ error: "Супер-админ не может быть изменён" });
    }
    
    const result = await db.query(
      "UPDATE users SET is_admin = true, approved = true WHERE login = $1 RETURNING id, login, is_admin, approved",
      [login]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    
    await db.query(
      "INSERT INTO logs(action) VALUES($1)",
      [`[System] Пользователь ${login} получил права администратора`]
    );
    
    res.json({ 
      success: true,
      message: `✅ Пользователь ${login} теперь администратор!`,
      user: result.rows[0]
    });
    
  } catch (e) {
    console.error("PROMOTE ERROR:", e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
