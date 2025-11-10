import { createClient } from '@libsql/client';

const client = createClient({
  url: 'file:./finance.db',
});

async function createTables() {
  console.log('🔧 Creating database tables...');
  
  try {
    // Create transactions table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount TEXT NOT NULL,
        employee TEXT,
        note TEXT,
        created_at INTEGER NOT NULL
      )
    `);
    console.log('✅ Table "transactions" created');

    // Create bank_balance table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS bank_balance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT NOT NULL UNIQUE,
        balance TEXT NOT NULL DEFAULT '0',
        updated_at INTEGER NOT NULL
      )
    `);
    console.log('✅ Table "bank_balance" created');

    console.log('🎉 All tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    client.close();
  }
}

createTables();
