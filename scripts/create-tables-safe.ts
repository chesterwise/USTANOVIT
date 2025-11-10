import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import { sql } from 'drizzle-orm';
import * as fs from 'fs';

async function createTables() {
  console.log('🔧 Creating tables...');
  
  let databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl || databaseUrl === '') {
    console.log('🔍 DATABASE_URL not in process.env, checking alternative sources...');
    
    if (fs.existsSync('/tmp/replitdb')) {
      console.log('📝 Found /tmp/replitdb, reading...');
      databaseUrl = fs.readFileSync('/tmp/replitdb', 'utf-8').trim();
    }
  }
  
  console.log('📝 Database URL status:', databaseUrl ? '✓ Found' : '✗ Not found');
  
  if (!databaseUrl) {
    console.error('❌ Could not find DATABASE_URL');
    console.log('\n📋 Available environment variables:');
    Object.keys(process.env)
      .filter(key => key.includes('DATABASE') || key.includes('PG'))
      .forEach(key => {
        console.log(`  ${key}: ${process.env[key] ? '✓ set' : '✗ empty'}`);
      });
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  const db = drizzle(pool);
  
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

    console.log('🎉 Tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createTables();
