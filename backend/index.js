const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  await client.connect();
  console.log("Connected to DB");

  const res = await client.query('SELECT NOW()');
  console.log(res.rows);

  await client.end();
}

main();
