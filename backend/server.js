const express = require("express");
const cors = require("cors");
const db = require("./db");
const initDb = require("./initDb");

const app = express();

app.use(cors({
  origin: "*"
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("М склад API работает");
});

app.get("/system/ping", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/admin/users", async (req, res) => {
  try {
    const users = await db.query("SELECT * FROM users ORDER BY id DESC");
    res.json(users.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { name, key } = req.body;

    const user = await db.query(
      "SELECT * FROM users WHERE name=$1",
      [name]
    );

    if (!user.rows.length) {
      return res.status(401).json({ error: "Пользователь не найден" });
    }

    if (user.rows[0].access_key !== key) {
      return res.status(401).json({ error: "Неверный ключ" });
    }

    if (!user.rows[0].approved) {
      return res.status(403).json({ error: "Нет подтверждения" });
    }

    res.json(user.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/auth/register", async (req, res) => {
  try {
    const { name, key } = req.body;

    await db.query(
      "INSERT INTO users(name, access_key) VALUES($1,$2)",
      [name, key]
    );

    res.json({ ok: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 10000;

initDb().then(() => {
  app.listen(PORT, () => {
    console.log("Server running on", PORT);
  });
});
