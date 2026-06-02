const router = require("express").Router();
const db = require("../db");

const SUPER_ADMIN = process.env.SUPER_ADMIN_LOGIN || 'admin';

function checkSuperAdmin(login) { return login && login.toLowerCase() === SUPER_ADMIN.toLowerCase(); }

const ALL_TABLES = ['users','online_users','typing_users','categories','items','consumables','devices','device_items','assembly_tasks','task_items','subtask_components','routine_tasks','chat_messages','notifications','logs','suggestions','snapshots','archived_items','archived_consumables','archived_devices','backups','restore_requests'];
const CLEAR_ORDER = ['device_items','subtask_components','task_items','assembly_tasks','routine_tasks','chat_messages','notifications','logs','suggestions','snapshots','archived_items','archived_consumables','archived_devices','devices','items','consumables','categories','typing_users','online_users','backups','restore_requests'];
const INSERT_ORDER = ['users','categories','items','consumables','devices','device_items','assembly_tasks','task_items','subtask_components','routine_tasks','chat_messages','notifications','logs','suggestions','snapshots','archived_items','archived_consumables','archived_devices','online_users','typing_users','backups','restore_requests'];

router.post("/create", async (req, res) => {
  try {
    const { user_login } = req.body;
    if (!checkSuperAdmin(user_login)) return res.status(403).json({ error: "Только супер-админ" });
    const backup = { version: "2.0", date: new Date().toISOString(), created_by: user_login, tables: {}, summary: {} };
    for (const table of ALL_TABLES) {
      try { const result = await db.query(`SELECT * FROM ${table}`); backup.tables[table] = result.rows; backup.summary[table] = result.rows.length; }
      catch (e) { backup.tables[table] = []; backup.summary[table] = 0; }
    }
    const backupJSON = JSON.stringify(backup, null, 2);
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login}] Создал резервную копию`]);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup-${new Date().toISOString().split('T')[0]}.json`);
    res.setHeader('Content-Length', Buffer.byteLength(backupJSON));
    res.send(backupJSON);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/download/:id", async (req, res) => {
  try {
    const backup = await db.query("SELECT * FROM backups WHERE id = $1", [req.params.id]);
    if (backup.rows.length === 0) return res.status(404).json({ error: "Бекап не найден" });
    const data = backup.rows[0];
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup-${new Date(data.created_at).toISOString().split('T')[0]}-v2.json`);
    res.send(data.data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/export", async (req, res) => {
  try {
    const backup = { version: "2.0", date: new Date().toISOString(), tables: {}, summary: {} };
    for (const table of ALL_TABLES) {
      try { const result = await db.query(`SELECT * FROM ${table}`); backup.tables[table] = result.rows; backup.summary[table] = result.rows.length; }
      catch (e) { backup.tables[table] = []; backup.summary[table] = 0; }
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup-${new Date().toISOString().split('T')[0]}.json`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/history", async (req, res) => {
  try {
    const backups = await db.query("SELECT id, created_by, size_bytes, created_at FROM backups ORDER BY created_at DESC LIMIT 50");
    res.json(backups.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/restore/:id", async (req, res) => {
  try {
    const { user_login } = req.body;
    if (!checkSuperAdmin(user_login)) return res.status(403).json({ error: "Только супер-админ" });
    const backup = await db.query("SELECT * FROM backups WHERE id = $1", [req.params.id]);
    if (backup.rows.length === 0) return res.status(404).json({ error: "Бекап не найден" });
    const backupData = JSON.parse(backup.rows[0].data);
    const tables = backupData.tables || backupData.data || {};
    for (const table of CLEAR_ORDER) { try { await db.query(`DELETE FROM ${table}`); } catch (e) {} }
    let total = 0;
    for (const table of INSERT_ORDER) {
      const records = tables[table];
      if (!records || !Array.isArray(records) || records.length === 0) continue;
      const columns = Object.keys(records[0]).filter(col => col !== 'id');
      if (columns.length === 0) continue;
      const ph = columns.map((_, i) => `$${i + 1}`).join(',');
      const cn = columns.join(',');
      for (const record of records) {
        try {
          const values = columns.map(col => typeof record[col] === 'object' && record[col] !== null ? JSON.stringify(record[col]) : record[col]);
          await db.query(`INSERT INTO ${table} (${cn}) VALUES (${ph})`, values);
          total++;
        } catch (e) {}
      }
    }
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login}] Восстановил базу из бекапа #${req.params.id} (${total} записей)`]);
    res.json({ message: `База восстановлена из бекапа #${req.params.id}. Вставлено ${total} записей.` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/import", async (req, res) => {
  try {
    const backup = req.body;
    if (!backup) return res.status(400).json({ error: "Неверный формат" });
    const tables = backup.tables || backup.data || {};
    if (Object.keys(tables).length === 0) return res.status(400).json({ error: "Файл не содержит данных" });
    const backupJSON = JSON.stringify(backup);
    const saved = await db.query("INSERT INTO backups (data, created_by, size_bytes) VALUES ($1,$2,$3) RETURNING id", [backupJSON, backup.created_by || 'import', Buffer.byteLength(backupJSON, 'utf8')]);
    for (const table of CLEAR_ORDER) { try { await db.query(`DELETE FROM ${table}`); } catch (e) {} }
    let total = 0;
    for (const table of INSERT_ORDER) {
      const records = tables[table];
      if (!records || !Array.isArray(records) || records.length === 0) continue;
      const columns = Object.keys(records[0]).filter(col => col !== 'id');
      if (columns.length === 0) continue;
      const ph = columns.map((_, i) => `$${i + 1}`).join(',');
      const cn = columns.join(',');
      for (const record of records) {
        try {
          const values = columns.map(col => typeof record[col] === 'object' && record[col] !== null ? JSON.stringify(record[col]) : record[col]);
          await db.query(`INSERT INTO ${table} (${cn}) VALUES (${ph})`, values);
          total++;
        } catch (e) {}
      }
    }
    await db.query("INSERT INTO logs(action) VALUES($1)", [`База восстановлена из файла (${total} записей). Бекап #${saved.rows[0].id}`]);
    res.json({ message: `База восстановлена. Вставлено ${total} записей. Бекап #${saved.rows[0].id} сохранён.` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/:id", async (req, res) => {
  try { await db.query("DELETE FROM backups WHERE id = $1", [req.params.id]); res.json({ message: "Бекап удалён" }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/request-restore", async (req, res) => {
  try {
    const { user_login, user_id, file_data } = req.body;
    if (!file_data) return res.status(400).json({ error: "Файл обязателен" });
    const result = await db.query("INSERT INTO restore_requests (user_login, user_id, file_data, status) VALUES ($1,$2,$3,'pending') RETURNING *", [user_login, user_id, JSON.stringify(file_data)]);
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login}] Отправил заявку на восстановление БД`]);
    res.json({ message: "Заявка отправлена.", request_id: result.rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/restore-requests", async (req, res) => {
  try { const r = await db.query("SELECT * FROM restore_requests ORDER BY created_at DESC"); res.json(r.rows); } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/approve-restore/:id", async (req, res) => {
  try {
    const { admin_login } = req.body;
    if (!checkSuperAdmin(admin_login)) return res.status(403).json({ error: "Только супер-админ" });
    const request = await db.query("SELECT * FROM restore_requests WHERE id = $1 AND status = 'pending'", [req.params.id]);
    if (request.rows.length === 0) return res.status(404).json({ error: "Заявка не найдена" });
    const reqData = request.rows[0];
    const backup = reqData.file_data;
    const tables = backup.tables || backup.data || {};
    const backupJSON = JSON.stringify(backup);
    await db.query("INSERT INTO backups (data, created_by, size_bytes) VALUES ($1,$2,$3)", [backupJSON, reqData.user_login, Buffer.byteLength(backupJSON, 'utf8')]);
    for (const table of CLEAR_ORDER) { try { await db.query(`DELETE FROM ${table}`); } catch (e) {} }
    for (const table of INSERT_ORDER) {
      const records = tables[table];
      if (!records || !Array.isArray(records) || records.length === 0) continue;
      const columns = Object.keys(records[0]).filter(col => col !== 'id');
      if (columns.length === 0) continue;
      const ph = columns.map((_, i) => `$${i + 1}`).join(',');
      const cn = columns.join(',');
      for (const record of records) {
        try {
          const values = columns.map(col => typeof record[col] === 'object' && record[col] !== null ? JSON.stringify(record[col]) : record[col]);
          await db.query(`INSERT INTO ${table} (${cn}) VALUES (${ph})`, values);
        } catch (e) {}
      }
    }
    await db.query("UPDATE restore_requests SET status = 'approved', approved_by = $1, approved_at = NOW() WHERE id = $2", [admin_login, req.params.id]);
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${admin_login}] Одобрил заявку на восстановление БД от ${reqData.user_login}`]);
    res.json({ message: "База данных восстановлена" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/decline-restore/:id", async (req, res) => {
  try {
    const { admin_login } = req.body;
    if (!checkSuperAdmin(admin_login)) return res.status(403).json({ error: "Только супер-админ" });
    await db.query("UPDATE restore_requests SET status = 'declined', approved_by = $1 WHERE id = $2", [admin_login, req.params.id]);
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${admin_login}] Отклонил заявку на восстановление БД #${req.params.id}`]);
    res.json({ message: "Заявка отклонена" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
