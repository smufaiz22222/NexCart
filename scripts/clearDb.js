import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function clearDatabase() {
  const client = await pool.connect();
  try {
    console.log('🧹 Clearing all data and users from database...');

    const res = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename != '_prisma_migrations';
    `);

    const tableNames = res.rows.map((row) => `"${row.tablename}"`);

    if (tableNames.length > 0) {
      await client.query(`TRUNCATE TABLE ${tableNames.join(', ')} CASCADE;`);
      console.log(`✨ Successfully truncated ${res.rows.length} tables:`);
      res.rows.forEach((r) => console.log(`   - ${r.tablename}`));
    } else {
      console.log('ℹ️ No tables found to truncate.');
    }
  } catch (err) {
    console.error('❌ Error clearing database:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

clearDatabase();
