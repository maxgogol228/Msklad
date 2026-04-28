const express = require("express");
const cors = require("cors");

const { pool } = require("./db/db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/test-db", async (req, res) => {
  const result = await pool.query("SELECT NOW()");
  res.json(result.rows);
});

module.exports = app;
