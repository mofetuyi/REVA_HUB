const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_JI4bCNfL3wRs@ep-old-cell-b5o5jg1o-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function testNeon() {
  console.log('Connecting to Neon PostgreSQL database...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Neon successfully!');
    const res = await client.query('SELECT version(), current_database(), current_user;');
    console.log('Query result:');
    console.log('PostgreSQL version:', res.rows[0].version.split(' on ')[0]);
    console.log('Database name:', res.rows[0].current_database);
    console.log('Connected user:', res.rows[0].current_user);
    
    // Test creating a table or checking schemas
    const tableRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public';");
    console.log('Public tables count:', tableRes.rows.length);
    console.log('Public tables:', tableRes.rows.map(r => r.table_name));

    await client.end();
    console.log('Neon database connection verified end-to-end!');
  } catch (err) {
    console.error('Neon connection failed:', err);
    process.exit(1);
  }
}

testNeon();
