const router = require("express").Router();
const db = require("../db");

const SUPER_ADMIN_LOGIN = 'admin';

router.get("/", async (req, res) => {
  try {
    const r = await db.query("SELECT id, login, access_key, approved, is_admin, created_at FROM users ORDER BY id");
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/:id/login", async (req, res) => {
  try {
    const { newLogin, adminLogin } = req.body;
    const userId = parseInt(req.params.id);

    if (adminLogin && adminLogin.toLowerCase() !== SUPER_ADMIN_LOGIN.toLowerCase()) {
      return res.status(403).json({ error: "Только супер-админ может изменять логины" });
    }

    const existing = await db.query(
      "SELECT id FROM users WHERE LOWER(login) = LOWER($1) AND id != $2",
      [newLogin, userId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Логин занят" });
    }

    const user = await db.query("SELECT login FROM users WHERE id = $1", [userId]);
    const oldLogin = user.rows[0].login;
    
    await db.query("UPDATE users SET login = $1 WHERE id = $2", [newLogin, userId]);
    
    const logMsg = "[" + adminLogin + "] Изменил логин пользователя ID " + userId + ' с "' + oldLogin + '" на "' + newLogin + '"';
    await db.query("INSERT INTO logs(action) VALUES($1)", [logMsg]);

    res.json({ message: "Логин изменён" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/:id/password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = parseInt(req.params.id);

    const user = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: "Не найден" });
    }
    if (user.rows[0].access_key !== currentPassword) {
      return res.status(400).json({ error: "Неверный пароль" });
    }

    await db.query("UPDATE users SET access_key = $1 WHERE id = $2", [newPassword, userId]);
    
    const logMsg = "[User ID: " + userId + "] Изменил свой пароль";
    await db.query("INSERT INTO logs(action) VALUES($1)", [logMsg]);

    res.json({ message: "Пароль изменён" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/approve/:id", async (req, res) => {
  try {
    const { adminLogin } = req.body;
    const userId = parseInt(req.params.id);
    
    await db.query("UPDATE users SET approved = true WHERE id = $1", [userId]);
    const user = await db.query("SELECT login FROM users WHERE id = $1", [userId]);
    
    const logMsg = "[" + adminLogin + "] Подтвердил пользователя: " + user.rows[0].login + " (ID: " + userId + ")";
    await db.query("INSERT INTO logs(action) VALUES($1)", [logMsg]);

    res.sendStatus(200);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/make-admin/:id", async (req, res) => {
  try {
    const { adminLogin } = req.body;
    
    if (!adminLogin || adminLogin.toLowerCase() !== SUPER_ADMIN_LOGIN.toLowerCase()) {
      return res.status(403).json({ error: "Только супер-админ может назначать администраторов" });
    }

    const userId = parseInt(req.params.id);
    await db.query("UPDATE users SET is_admin = true WHERE id = $1", [userId]);
    const user = await db.query("SELECT login FROM users WHERE id = $1", [userId]);
    
    const logMsg = "[" + adminLogin + "] Назначил администратором: " + user.rows[0].login + " (ID: " + userId + ")";
    await db.query("INSERT INTO logs(action) VALUES($1)", [logMsg]);

    res.sendStatus(200);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/remove-admin/:id", async (req, res) => {
  try {
    const { adminLogin } = req.body;
    
    if (!adminLogin || adminLogin.toLowerCase() !== SUPER_ADMIN_LOGIN.toLowerCase()) {
      return res.status(403).json({ error: "Только супер-админ может снимать администраторов" });
    }

    if (parseInt(req.params.id) === 1) {
      return res.status(403).json({ error: "Нельзя снять супер-админа" });
    }

    const userId = parseInt(req.params.id);
    await db.query("UPDATE users SET is_admin = false WHERE id = $1", [userId]);
    const user = await db.query("SELECT login FROM users WHERE id = $1", [userId]);
    
    const logMsg = "[" + adminLogin + "] Снял администратора: " + user.rows[0].login + " (ID: " + userId + ")";
    await db.query("INSERT INTO logs(action) VALUES($1)", [logMsg]);

    res.sendStatus(200);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { adminLogin } = req.body;
    
    if (!adminLogin || adminLogin.toLowerCase() !== SUPER_ADMIN_LOGIN.toLowerCase()) {
      return res.status(403).json({ error: "Только супер-админ может удалять пользователей" });
    }

    if (parseInt(req.params.id) === 1) {
      return res.status(403).json({ error: "Нельзя удалить супер-админа" });
    }

    const userId = parseInt(req.params.id);

    // Получаем логин пользователя перед удалением
    const user = await db.query("SELECT login FROM users WHERE id = $1", [userId]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: "Не найден" });
    }

    const userLogin = user.rows[0].login;
    console.log("Deleting user:", userLogin, "ID:", userId);

    // Очищаем online_users
    await db.query("DELETE FROM online_users WHERE user_id = $1", [userId]);
    console.log("Cleared online_users for user_id:", userId);

    // Очищаем typing_users
    await db.query("DELETE FROM typing_users WHERE user_login = $1", [userLogin]);
    console.log("Cleared typing_users for login:", userLogin);

    // Очищаем chat_messages (опционально, можно оставить)
    // await db.query("DELETE FROM chat_messages WHERE user_id = $1", [userId]);

    // Очищаем notifications
    await db.query("DELETE FROM notifications WHERE user_id = $1", [userId]);
    console.log("Cleared notifications for user_id:", userId);

    // Удаляем пользователя
    await db.query("DELETE FROM users WHERE id = $1", [userId]);
    console.log("User deleted from database");
    
    const logMsg = "[" + adminLogin + "] Удалил пользователя: " + userLogin + " (ID: " + userId + ")";
    await db.query("INSERT INTO logs(action) VALUES($1)", [logMsg]);

    res.json({ message: "Пользователь удалён" });
  } catch (e) {
    console.error("Delete user error:", e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
