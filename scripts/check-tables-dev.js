const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
  });
  await client.connect();
  try {
    const res = await client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'pzpp_dev';");
    console.log('Tables in pzpp_dev:');
    res.rows.forEach(row => console.log(' - ' + row.tablename));
  } finally {
    await client.end();
  }
}

main().catch(console.error);
