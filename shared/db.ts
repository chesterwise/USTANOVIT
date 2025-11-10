import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleSqlite } from 'drizzle-orm/libsql';
import pkg from 'pg';
const { Pool } = pkg;
import { createClient } from '@libsql/client';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

let pool: pkg.Pool | null = null;
let dbInstance: any = null;
let usingPostgres = false;

function getPool() {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl || databaseUrl.trim() === '') {
      console.warn('⚠️ DATABASE_URL not set, using SQLite fallback for development');
      return null;
    }
    pool = new Pool({
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      allowExitOnIdle: false,
    });
    
    pool.on('error', (err) => {
      console.error('💥 Unexpected pool error:', err);
    });
    
    usingPostgres = true;
  }
  return pool;
}

async function ensureTablesPostgres(tempDb: any) {
  try {
    await tempDb.execute(sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        chat_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount TEXT NOT NULL,
        employee TEXT,
        note TEXT,
        user_name TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    await tempDb.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_transactions_chat_id ON transactions(chat_id);
    `);
    
    await tempDb.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    `);
    
    await tempDb.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_transactions_employee ON transactions(employee) WHERE employee IS NOT NULL;
    `);
    
    await tempDb.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_transactions_chat_type ON transactions(chat_id, type);
    `);
    
    await tempDb.execute(sql`
      CREATE TABLE IF NOT EXISTS bank_balance (
        id SERIAL PRIMARY KEY,
        chat_id TEXT NOT NULL UNIQUE,
        balance TEXT NOT NULL DEFAULT '0',
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    await tempDb.execute(sql`
      CREATE TABLE IF NOT EXISTS user_states (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        state TEXT,
        action TEXT,
        temp_data TEXT,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    await tempDb.execute(sql`
      CREATE TABLE IF NOT EXISTS bot_users (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        chat_id TEXT NOT NULL,
        user_name TEXT,
        first_name TEXT,
        last_name TEXT,
        subscribed TEXT NOT NULL DEFAULT 'true',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    await tempDb.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_bot_users_chat_id ON bot_users(chat_id);
    `);
    
    console.log('✅ PostgreSQL database tables and indexes ensured');
  } catch (error) {
    console.error('⚠️ Error ensuring PostgreSQL database tables:', error);
  }
}

async function ensureTablesSqlite(tempDb: any) {
  try {
    await tempDb.run(sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount TEXT NOT NULL,
        employee TEXT,
        note TEXT,
        user_name TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);
    
    await tempDb.run(sql`
      CREATE INDEX IF NOT EXISTS idx_transactions_chat_id ON transactions(chat_id);
    `);
    
    await tempDb.run(sql`
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    `);
    
    await tempDb.run(sql`
      CREATE INDEX IF NOT EXISTS idx_transactions_employee ON transactions(employee) WHERE employee IS NOT NULL;
    `);
    
    await tempDb.run(sql`
      CREATE INDEX IF NOT EXISTS idx_transactions_chat_type ON transactions(chat_id, type);
    `);
    
    await tempDb.run(sql`
      CREATE TABLE IF NOT EXISTS bank_balance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT NOT NULL UNIQUE,
        balance TEXT NOT NULL DEFAULT '0',
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);
    
    await tempDb.run(sql`
      CREATE TABLE IF NOT EXISTS user_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL UNIQUE,
        state TEXT,
        action TEXT,
        temp_data TEXT,
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);
    
    await tempDb.run(sql`
      CREATE TABLE IF NOT EXISTS bot_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL UNIQUE,
        chat_id TEXT NOT NULL,
        user_name TEXT,
        first_name TEXT,
        last_name TEXT,
        subscribed TEXT NOT NULL DEFAULT 'true',
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);
    
    await tempDb.run(sql`
      CREATE INDEX IF NOT EXISTS idx_bot_users_chat_id ON bot_users(chat_id);
    `);
    
    console.log('✅ SQLite database tables and indexes ensured');
  } catch (error) {
    console.error('⚠️ Error ensuring SQLite database tables:', error);
  }
}

export function getDb() {
  if (!dbInstance) {
    const pgPool = getPool();
    
    if (pgPool) {
      dbInstance = drizzlePg(pgPool, { schema });
      ensureTablesPostgres(dbInstance).catch(console.error);
    } else {
      const client = createClient({
        url: 'file:./finance.db',
      });
      dbInstance = drizzleSqlite(client);
      ensureTablesSqlite(dbInstance).catch(console.error);
    }
  }
  return dbInstance;
}

export const db = getDb();
