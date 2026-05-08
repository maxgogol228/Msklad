const router = require("express").Router();
const db = require("../db");

// Получить всех пользователей
router.get("/", async (req, res) => {
  try {
    const r = await db.query("SELECT id, login, approved, is_admin, created_at FROM users ORDER BY id DESC");
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Подтвердить пользователя
router.post("/approve/:id", async (req, res) => {
  try {
    await db.query("UPDATE users SET approved=true WHERE id=$1", [req.params.id]);
    
    const user = await db.query("SELECT login FROM users WHERE id=$1", [req.params.id]);
    await db.query(
      "INSERT INTO logs(action) VALUES($1)",
      [`Подтверждён пользователь: ${user.rows[0]?.login}`]
    );
    
    res.sendStatus(200);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Дать права админа
router.post("/make-admin/:id", async (req, res) => {
  try {
    await db.query("UPDATE users SET is_admin=true WHERE id=$1", [req.params.id]);
    
    const user = await db.query("SELECT login FROM users WHERE id=$1", [req.params.id]);
    await db.query(
      "INSERT INTO logs(action) VALUES($1)",
      [`Назначен администратором: ${user.rows[0]?.login}`]
    );
    
    res.sendStatus(200);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Убрать права админа
router.post("/remove-admin/:id", async (req, res) => {
  try {
    await db.query("UPDATE users SET is_admin=false WHERE id=$1", [req.params.id]);
    
    const user = await db.query("SELECT login FROM users WHERE id=$1", [req.params.id]);
    await db.query(
      "INSERT INTO logs(action) VALUES($1)",
      [`Сняты права администратора: ${user.rows[0]?.login}`]
    );
    
    res.sendStatus(200);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Удалить пользователя
router.delete("/:id", async (req, res) => {
  try {
    const user = await db.query("SELECT login FROM users WHERE id=$1", [req.params.id]);
    
    if (user.rows.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    
    await db.query("DELETE FROM users WHERE id=$1", [req.params.id]);
    
    await db.query(
      "INSERT INTO logs(action) VALUES($1)",
      [`Удалён пользователь: ${user.rows[0].login}`]
    );
    
    res.json({ message: "Пользователь удалён" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
