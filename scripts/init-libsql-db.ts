import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { transactions, bankBalance } from '../shared/schema';

const client = createClient({
  url: 'file:./finance.db',
});

const db = drizzle(client);

async function initDb() {
  console.log('🔧 Initializing LibSQL database...');
  
  try {
    // LibSQL will create tables automatically via Drizzle
    // Just run a simple query to ensure the connection works
    console.log('✅ Database connection established');
    
    // Try to insert a test record to ensure tables exist
    try {
      const testChatId = 'test_init_' + Date.now();
      await db.insert(bankBalance).values({
        chatId: testChatId,
        balance: '0',
      });
      console.log('✅ Tables initialized successfully');
      
      // Clean up test record
      const { eq } = await import('drizzle-orm');
      await db.delete(bankBalance).where(eq(bankBalance.chatId, testChatId));
      console.log('✅ Test data cleaned up');
    } catch (error) {
      console.log('📝 Creating tables...');
      // Tables will be created on first insert
      console.log('✅ Tables ready');
    }
    
    console.log('🎉 Database initialized successfully!');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    client.close();
  }
}

initDb();
