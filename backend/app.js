const express = require("express");
const cors = require("cors");
const systemRoutes = require("./routes/systemRoutes");
const userLogger = require("./middleware/userLogger");
const { pool } = require("./db/db");

app.get("/api/test-db", async (req, res) => {
  const result = await pool.query("SELECT NOW()");
  res.json(result.rows);
});

const app = express();
app.use(cors());
app.use(express.json());
app.use(userLogger);

app.use("/api/system", systemRoutes);

module.exports = app;
