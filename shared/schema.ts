import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { sqliteTable, integer, text as sqliteText } from 'drizzle-orm/sqlite-core';

const isPostgres = Boolean(process.env.DATABASE_URL?.trim());

export const transactions = isPostgres 
  ? pgTable('transactions', {
      id: serial('id').primaryKey(),
      chatId: text('chat_id').notNull(),
      type: text('type').notNull(),
      amount: text('amount').notNull(),
      employee: text('employee'),
      note: text('note'),
      userName: text('user_name'),
      createdAt: timestamp('created_at').defaultNow().notNull(),
    })
  : sqliteTable('transactions', {
      id: integer('id').primaryKey({ autoIncrement: true }),
      chatId: sqliteText('chat_id').notNull(),
      type: sqliteText('type').notNull(),
      amount: sqliteText('amount').notNull(),
      employee: sqliteText('employee'),
      note: sqliteText('note'),
      userName: sqliteText('user_name'),
      createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
    });

export const bankBalance = isPostgres
  ? pgTable('bank_balance', {
      id: serial('id').primaryKey(),
      chatId: text('chat_id').notNull().unique(),
      balance: text('balance').notNull().default('0'),
      updatedAt: timestamp('updated_at').defaultNow().notNull(),
    })
  : sqliteTable('bank_balance', {
      id: integer('id').primaryKey({ autoIncrement: true }),
      chatId: sqliteText('chat_id').notNull().unique(),
      balance: sqliteText('balance').notNull().default('0'),
      updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
    });

export const userStates = isPostgres
  ? pgTable('user_states', {
      id: serial('id').primaryKey(),
      userId: text('user_id').notNull().unique(),
      state: text('state'),
      action: text('action'),
      tempData: text('temp_data'),
      updatedAt: timestamp('updated_at').defaultNow().notNull(),
    })
  : sqliteTable('user_states', {
      id: integer('id').primaryKey({ autoIncrement: true }),
      userId: sqliteText('user_id').notNull().unique(),
      state: sqliteText('state'),
      action: sqliteText('action'),
      tempData: sqliteText('temp_data'),
      updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
    });

export const botUsers = isPostgres
  ? pgTable('bot_users', {
      id: serial('id').primaryKey(),
      userId: text('user_id').notNull().unique(),
      chatId: text('chat_id').notNull(),
      userName: text('user_name'),
      firstName: text('first_name'),
      lastName: text('last_name'),
      subscribed: text('subscribed').notNull().default('true'),
      createdAt: timestamp('created_at').defaultNow().notNull(),
      updatedAt: timestamp('updated_at').defaultNow().notNull(),
    })
  : sqliteTable('bot_users', {
      id: integer('id').primaryKey({ autoIncrement: true }),
      userId: sqliteText('user_id').notNull().unique(),
      chatId: sqliteText('chat_id').notNull(),
      userName: sqliteText('user_name'),
      firstName: sqliteText('first_name'),
      lastName: sqliteText('last_name'),
      subscribed: sqliteText('subscribed').notNull().default('true'),
      createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
      updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
    });
