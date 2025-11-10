import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pkg from 'pg';
const { Pool } = pkg;
import { sql } from 'drizzle-orm';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function pushSchema() {
  console.log('🔧 Pushing schema to PostgreSQL...');
  console.log('📝 DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✓' : 'Not set ✗');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }
  
  try {
    console.log('📋 Creating transactions table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        chat_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount TEXT NOT NULL,
        employee TEXT,
        note TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table "transactions" created');

    console.log('📋 Creating bank_balance table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bank_balance (
        id SERIAL PRIMARY KEY,
        chat_id TEXT NOT NULL UNIQUE,
        balance TEXT NOT NULL DEFAULT '0',
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table "bank_balance" created');

    console.log('🎉 Schema pushed successfully!');
  } catch (error) {
    console.error('❌ Error pushing schema:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

pushSchema();
