const router = require("express").Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const r = await db.query("SELECT * FROM suggestions ORDER BY created_at DESC");
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/", async (req, res) => {
  try {
    const { title, description, user_login, user_id } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: "Заголовок обязателен" });
    const r = await db.query(
      "INSERT INTO suggestions (title, description, user_login, user_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [title.trim(), description.trim(), user_login, user_id]
    );
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login}] 💡 Предложил: "${title.trim()}"`]);

    const admin = await db.query("SELECT id, login FROM users WHERE LOWER(login) = 'admin' LIMIT 1");
    if (admin.rows.length > 0) {
      await db.query("INSERT INTO notifications (user_id, user_login, message, notification_type) VALUES ($1,$2,$3,'chat')",
        [admin.rows[0].id, admin.rows[0].login, `💡 Новое предложение от ${user_login}: "${title.trim()}"`]);
    }
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/:id/status", async (req, res) => {
  try {
    const { status, admin_login } = req.body;
    if (!admin_login || admin_login.toLowerCase() !== 'admin') return res.status(403).json({ error: "Только супер-админ" });
    const allowed = ['new', 'reviewed', 'testing', 'planned', 'completed', 'declined'];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Недопустимый статус" });
    await db.query("UPDATE suggestions SET status = $1 WHERE id = $2", [status, req.params.id]);
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${admin_login}] Изменил статус предложения #${req.params.id} на "${status}"`]);
    res.sendStatus(200);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const { user_login } = req.body;
    await db.query("DELETE FROM suggestions WHERE id = $1", [req.params.id]);
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Удалил предложение #${req.params.id}`]);
    res.json({ message: "Удалено" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
