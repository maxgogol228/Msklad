const router = require("express").Router();
const db = require("../db");

const SUPER_ADMIN = process.env.SUPER_ADMIN_LOGIN || 'admin';

// Получить сообщения общего чата
router.get("/", async (req, res) => {
  try {
    const r = await db.query(
      "SELECT * FROM chat_messages WHERE chat_type = 'general' ORDER BY created_at ASC LIMIT 200"
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Получить личные сообщения
router.get("/private/:user1/:user2", async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM chat_messages 
       WHERE chat_type = 'private' 
       AND ((user_login = $1 AND recipient_login = $2) OR (user_login = $2 AND recipient_login = $1))
       ORDER BY created_at ASC LIMIT 100`,
      [req.params.user1, req.params.user2]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Получить админский чат
router.get("/admin", async (req, res) => {
  try {
    const r = await db.query(
      "SELECT * FROM chat_messages WHERE chat_type = 'admin' ORDER BY created_at ASC LIMIT 200"
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Отправить сообщение
router.post("/", async (req, res) => {
  try {
    const { message, user_login, user_id, chat_type, recipient_login, recipient_id } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Сообщение не может быть пустым" });
    }

    const r = await db.query(
      `INSERT INTO chat_messages (message, user_login, user_id, chat_type, recipient_login, recipient_id, is_read) 
       VALUES ($1, $2, $3, $4, $5, $6, false) RETURNING *`,
      [message.trim(), user_login, user_id, chat_type || 'general', recipient_login || null, recipient_id || null]
    );

    // Уведомления
    try {
      if (chat_type === 'private' && recipient_id) {
        await db.query(
          "INSERT INTO notifications (user_id, user_login, message, notification_type) VALUES ($1, $2, $3, 'chat')",
          [recipient_id, recipient_login, `💬 Личное сообщение от ${user_login}`]
        );
      }
      if (chat_type === 'general') {
        const users = await db.query("SELECT id, login FROM users WHERE approved = true AND id != $1", [user_id]);
        for (const u of users.rows) {
          try {
            await db.query(
              "INSERT INTO notifications (user_id, user_login, message, notification_type) VALUES ($1, $2, $3, 'chat')",
              [u.id, u.login, `💬 Новое сообщение от ${user_login}`]
            );
          } catch (e) {}
        }
      }
      if (chat_type === 'admin') {
        const admins = await db.query(
          "SELECT id, login FROM users WHERE (is_admin = true OR LOWER(login) = LOWER($1)) AND id != $2",
          [SUPER_ADMIN, user_id]
        );
        for (const admin of admins.rows) {
          try {
            await db.query(
              "INSERT INTO notifications (user_id, user_login, message, notification_type) VALUES ($1, $2, $3, 'chat')",
              [admin.id, admin.login, `💬 Сообщение в админском чате от ${user_login}`]
            );
          } catch (e) {}
        }
      }
    } catch (e) {}

    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Удалить сообщение (только своё)
router.delete("/:id", async (req, res) => {
  try {
    const { user_login } = req.body;
    const msg = await db.query("SELECT * FROM chat_messages WHERE id = $1", [req.params.id]);
    if (msg.rows.length === 0) return res.status(404).json({ error: "Не найдено" });
    if (msg.rows[0].user_login !== user_login) {
      return res.status(403).json({ error: "Можно удалять только свои сообщения" });
    }
    await db.query("DELETE FROM chat_messages WHERE id = $1", [req.params.id]);
    res.json({ message: "Удалено" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Отметить сообщения как прочитанные
router.put("/read", async (req, res) => {
  try {
    const { user_login, chat_type, recipient_login } = req.body;
    
    if (chat_type === 'private' && recipient_login) {
      await db.query(
        "UPDATE chat_messages SET is_read = true WHERE chat_type = 'private' AND user_login = $1 AND recipient_login = $2 AND is_read = false",
        [recipient_login, user_login]
      );
    } else if (chat_type === 'general') {
      await db.query(
        "UPDATE chat_messages SET is_read = true WHERE chat_type = 'general' AND user_login != $1 AND is_read = false",
        [user_login]
      );
    } else if (chat_type === 'admin') {
      await db.query(
        "UPDATE chat_messages SET is_read = true WHERE chat_type = 'admin' AND user_login != $1 AND is_read = false",
        [user_login]
      );
    }
    
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Непрочитанные сообщения
router.get("/unread/:userLogin", async (req, res) => {
  try {
    const general = await db.query(
      "SELECT COUNT(*) as count FROM chat_messages WHERE chat_type = 'general' AND is_read = false AND user_login != $1",
      [req.params.userLogin]
    );
    const admin = await db.query(
      "SELECT COUNT(*) as count FROM chat_messages WHERE chat_type = 'admin' AND is_read = false AND user_login != $1",
      [req.params.userLogin]
    );
    const privateMsgs = await db.query(
      "SELECT user_login, COUNT(*) as count FROM chat_messages WHERE chat_type = 'private' AND is_read = false AND recipient_login = $1 GROUP BY user_login",
      [req.params.userLogin]
    );
    const privateCounts = {};
    for (const row of privateMsgs.rows) { privateCounts[row.user_login] = parseInt(row.count); }
    
    res.json({ general: parseInt(general.rows[0].count), admin: parseInt(admin.rows[0].count), private: privateCounts });
  } catch (e) { res.json({ general: 0, admin: 0, private: {} }); }
});

// Онлайн пользователи
router.post("/online", async (req, res) => {
  try {
    const { user_id, user_login } = req.body;
    if (!user_id || !user_login) return res.status(400).json({ error: "user_id и user_login обязательны" });
    
    await db.query("DELETE FROM online_users WHERE user_id = $1", [user_id]);
    await db.query("INSERT INTO online_users (user_id, user_login, last_active) VALUES ($1, $2, NOW())", [user_id, user_login]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/online-users", async (req, res) => {
  try {
    const online = await db.query(
      `SELECT DISTINCT ou.user_id, ou.user_login, ou.last_active, 'online' as status 
       FROM online_users ou
       JOIN users u ON u.id = ou.user_id
       WHERE ou.last_active > NOW() - INTERVAL '2 minutes' 
       ORDER BY ou.user_login`
    );
    
    const recent = await db.query(
      `SELECT DISTINCT ou.user_id, ou.user_login, ou.last_active, 'recent' as status 
       FROM online_users ou
       JOIN users u ON u.id = ou.user_id
       WHERE ou.last_active > NOW() - INTERVAL '24 hours' 
       AND ou.last_active <= NOW() - INTERVAL '2 minutes'
       AND ou.user_id NOT IN (
         SELECT DISTINCT ou2.user_id FROM online_users ou2 
         WHERE ou2.last_active > NOW() - INTERVAL '2 minutes'
       )
       ORDER BY ou.last_active DESC`
    );
    
    // Все остальные пользователи, которые когда-либо заходили
    const older = await db.query(
      `SELECT DISTINCT ou.user_id, ou.user_login, ou.last_active, 'old' as status 
       FROM online_users ou
       JOIN users u ON u.id = ou.user_id
       WHERE ou.last_active <= NOW() - INTERVAL '24 hours'
       AND ou.user_id NOT IN (
         SELECT DISTINCT ou2.user_id FROM online_users ou2 
         WHERE ou2.last_active > NOW() - INTERVAL '24 hours'
       )
       ORDER BY ou.last_active DESC`
    );
    
    res.json([...online.rows, ...recent.rows, ...older.rows]);
  } catch (e) {
    console.error("Online users error:", e);
    res.json([]);
  }
});
// Печатает
router.post("/typing", async (req, res) => {
  try {
    const { user_login, chat_type, recipient_login } = req.body;
    await db.query("DELETE FROM typing_users WHERE user_login = $1 AND chat_type = $2 AND COALESCE(recipient_login, '') = $3", [user_login, chat_type, recipient_login || '']);
    await db.query("INSERT INTO typing_users (user_login, chat_type, recipient_login, last_typed) VALUES ($1, $2, $3, NOW())", [user_login, chat_type, recipient_login || null]);
    res.json({ ok: true });
  } catch (e) { res.json({ ok: true }); }
});

router.get("/typing/:chatType", async (req, res) => {
  try {
    const typing = await db.query("SELECT DISTINCT user_login FROM typing_users WHERE chat_type = $1 AND last_typed > NOW() - INTERVAL '10 seconds'", [req.params.chatType]);
    res.json(typing.rows);
  } catch (e) { res.json([]); }
});

// Уведомления чата
router.get("/notifications/count/:userId", async (req, res) => {
  try {
    const r = await db.query("SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false AND notification_type = 'chat'", [req.params.userId]);
    res.json({ count: parseInt(r.rows[0].count) });
  } catch (e) { res.json({ count: 0 }); }
});

router.get("/notifications/:userId", async (req, res) => {
  try {
    const r = await db.query("SELECT * FROM notifications WHERE user_id = $1 AND is_read = false AND notification_type = 'chat' ORDER BY created_at DESC LIMIT 20", [req.params.userId]);
    res.json(r.rows);
  } catch (e) { res.json([]); }
});

router.put("/notifications/read-all/:userId", async (req, res) => {
  try {
    await db.query("UPDATE notifications SET is_read = true WHERE user_id = $1 AND notification_type = 'chat' AND is_read = false", [req.params.userId]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/notifications/:id/read", async (req, res) => {
  try { await db.query("UPDATE notifications SET is_read = true WHERE id = $1", [req.params.id]); res.sendStatus(200); } catch (e) { res.sendStatus(200); }
});

module.exports = router;
