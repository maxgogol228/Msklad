const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 300000, // 5 минут на запрос
  query_timeout: 300000,
  connectionTimeoutMillis: 30000
});

module.exports = {
  query: (text, params) => pool.query(text, params)
};
