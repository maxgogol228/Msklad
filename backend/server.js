const express = require("express");
const cors = require("cors");

const initDb = require("./initDb");

// роуты
const itemsRoutes = require("./routes/items");
const consumablesRoutes = require("./routes/consumables");
const devicesRoutes = require("./routes/devices");
const snapshotsRoutes = require("./routes/snapshots");
const logsRoutes = require("./routes/logs");

const app = express();

// ====================
// MIDDLEWARE
// ====================
console.log("🔥 ЗАПУЩЕН НУЖНЫЙ SERVER.JS");
app.use(cors({
  origin: [
    "https://msklad-frontend.onrender.com"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.get("/debug", (req, res) => {
  res.send("debug ok");
});

app.use(express.json({ limit: "10mb" })); // важно для base64 изображений

// логирование запросов


// ====================
// ROUTES
// ====================

app.use("/items", itemsRoutes);
app.use("/consumables", consumablesRoutes);
app.use("/devices", devicesRoutes);
app.use("/snapshots", snapshotsRoutes);
app.use("/logs", logsRoutes);

// тест API
app.get("/system/ping", (req, res) => {
  res.json({ status: "ok" });
});

// корень
app.get("/", (req, res) => {
  res.send("М склад API работает");
});

// ====================
// ERROR HANDLER
// ====================

app.use((err, req, res, next) => {
  console.error("Ошибка:", err);
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
});

app.post("/admin/login", (req, res) => {
  const { password } = req.body;

  if (password === process.env.ADMIN_PASSWORD) {
    return res.json({ ok: true });
  }

  res.status(401).json({ error: "Неверный пароль" });
});

// логин
app.post("/auth/login", async (req, res) => {
  const { name, key } = req.body;

  const user = await db.query(
    "SELECT * FROM users WHERE name=$1 AND access_key=$2",
    [name, key]
  );

  if (!user.rows.length) {
    return res.status(401).json({ error: "Неверные данные" });
  }

  if (!user.rows[0].approved) {
    return res.status(403).json({ error: "Ожидает подтверждения" });
  }

  res.json(user.rows[0]);
});

// регистрация
app.post("/auth/register", async (req, res) => {
  const { name, key } = req.body;

  await db.query(
    "INSERT INTO users(name, access_key) VALUES($1,$2)",
    [name, key]
  );

  res.json({ ok: true });
});

// список пользователей (админ)
app.get("/admin/users", async (req, res) => {
  const r = await db.query("SELECT * FROM users ORDER BY id DESC");
  res.json(r.rows);
});

// подтверждение
app.post("/admin/approve/:id", async (req, res) => {
  await db.query("UPDATE users SET approved=true WHERE id=$1", [
    req.params.id
  ]);
  res.sendStatus(200);
});

// ====================
// START SERVER
// ====================

const PORT = process.env.PORT || 10000;

// сначала инициализация БД, потом запуск
initDb().then(() => {
  app.listen(PORT, () => {
    console.log("Server running on port", PORT);
  });
});
