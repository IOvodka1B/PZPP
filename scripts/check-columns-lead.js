const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
  });
  await client.connect();
  try {
    const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Lead';");
    console.log('Columns in Lead:');
    res.rows.forEach(row => console.log(' - ' + row.column_name));
  } finally {
    await client.end();
  }
}

main().catch(console.error);
