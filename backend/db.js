const { Pool } = require("pg");

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'msklad',
  user: 'msklad_user',
  password: 'devchik1993',
  statement_timeout: 300000,
  query_timeout: 300000,
  connectionTimeoutMillis: 30000
});

module.exports = {
  query: (text, params) => pool.query(text, params)
};
