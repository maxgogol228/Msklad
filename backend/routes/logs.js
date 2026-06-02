const router = require("express").Router();
const db = require("../db");

const SUPER_ADMIN_LOGIN = process.env.SUPER_ADMIN_LOGIN || 'admin';

router.get("/", async (req, res) => {
  try {
    const r = await db.query("SELECT * FROM logs ORDER BY id DESC LIMIT 1000");
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/clear", async (req, res) => {
  try {
    const { user_login } = req.body;
    
    if (!user_login || user_login.toLowerCase() !== SUPER_ADMIN_LOGIN.toLowerCase()) {
      return res.status(403).json({ error: "Только супер-админ может очистить логи" });
    }

    await db.query("DELETE FROM logs");
    
    await db.query(
      "INSERT INTO logs(action) VALUES($1)",
      [`[System] Все логи очищены супер-админом ${user_login}`]
    );

    res.json({ message: "Все логи успешно удалены" });
  } catch (e) {
    console.error("Clear logs error:", e);
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: "Неверный ID" });
    }

    const result = await db.query(
      "DELETE FROM logs WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Лог не найден" });
    }

    res.json({ message: "Лог удалён", deleted: result.rows[0] });
  } catch (e) {
    console.error("Delete log error:", e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
