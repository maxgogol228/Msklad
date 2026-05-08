const express = require("express");
const cors = require("cors");
const initDb = require("./initDb");

const app = express();

// Увеличиваем лимит для загрузки файлов
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// routes
app.use("/auth", require("./routes/auth"));
app.use("/users", require("./routes/users"));
app.use("/items", require("./routes/items"));
app.use("/consumables", require("./routes/consumables"));
app.use("/devices", require("./routes/devices"));
app.use("/logs", require("./routes/logs"));
app.use("/categories", require("./routes/categories"));
app.use("/archive", require("./routes/archive"));
app.use("/backup", require("./routes/backup"));

app.get("/", (req, res) => {
  res.send("API работает");
});

const PORT = process.env.PORT || 10000;

initDb().then(() => {
  app.listen(PORT, () => {
    console.log("Server running:", PORT);
  });
});
