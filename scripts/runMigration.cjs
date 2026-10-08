const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is required to run migration.');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20261008000000_nestcare_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log('Migration executed successfully!');
    await client.end();
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  run();
}
