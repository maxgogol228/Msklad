const express = require("express");
const cors = require("cors");
const initDb = require("./initDb");
const authRoutes = require("./routes/auth");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// routes
app.use("/auth", require("./routes/auth"));
app.use("/users", require("./routes/users"));
app.use("/items", require("./routes/items"));
app.use("/consumables", require("./routes/consumables"));
app.use("/devices", require("./routes/devices"));
app.use("/logs", require("./routes/logs"));

app.get("/", (req, res) => {
  res.send("API работает");
});
app.get("/system/ping", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 10000;

initDb().then(() => {
  app.listen(PORT, () => {
    console.log("Server running:", PORT);
  });
});
