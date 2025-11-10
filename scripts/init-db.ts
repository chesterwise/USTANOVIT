import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import { sql } from 'drizzle-orm';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function initDb() {
  console.log('🔧 Initializing database...');
  console.log('📝 DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }
  
  try {
    // Create transactions table (using TEXT for amount to match schema)
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

    // Create bank_balance table (using TEXT for balance to match schema)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bank_balance (
        id SERIAL PRIMARY KEY,
        chat_id TEXT NOT NULL UNIQUE,
        balance TEXT NOT NULL DEFAULT '0',
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table "bank_balance" created');

    console.log('🎉 Database initialized successfully!');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

initDb();
