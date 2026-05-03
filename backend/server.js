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

app.get("/test-cors", (req, res) => {
  res.json({ ok: true });
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
