import { db } from "../../../shared/db";
import { botUsers } from "../../../shared/schema";
import { eq, and } from "drizzle-orm";

export interface TransactionNotification {
  type: 'income' | 'expense' | 'employee_expense' | 'dispute' | 'set_bank';
  amount: number;
  employee?: string;
  note?: string;
  userName: string;
  newBalance?: number;
}

/**
 * Регистрирует пользователя в системе уведомлений
 */
export async function registerUser(
  userId: string,
  chatId: string,
  userName?: string,
  firstName?: string,
  lastName?: string
): Promise<void> {
  try {
    const existing = await db.select().from(botUsers).where(eq(botUsers.userId, userId));
    
    if (existing.length > 0) {
      await db.update(botUsers)
        .set({
          chatId,
          userName: userName || existing[0].userName,
          firstName: firstName || existing[0].firstName,
          lastName: lastName || existing[0].lastName,
          updatedAt: new Date(),
        })
        .where(eq(botUsers.userId, userId));
    } else {
      try {
        await db.insert(botUsers).values({
          userId,
          chatId,
          userName,
          firstName,
          lastName,
          subscribed: 'true',
        });
      } catch (insertError: any) {
        if (insertError.message?.includes('UNIQUE constraint failed') || insertError.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          await db.update(botUsers)
            .set({
              chatId,
              userName: userName || undefined,
              firstName: firstName || undefined,
              lastName: lastName || undefined,
              updatedAt: new Date(),
            })
            .where(eq(botUsers.userId, userId));
        } else {
          throw insertError;
        }
      }
    }
  } catch (error) {
    console.error('❌ [Notifications] Error registering user:', error);
  }
}

/**
 * Включает уведомления для пользователя
 */
export async function subscribeUser(userId: string): Promise<boolean> {
  try {
    await db.update(botUsers)
      .set({ subscribed: 'true', updatedAt: new Date() })
      .where(eq(botUsers.userId, userId));
    return true;
  } catch (error) {
    console.error('❌ [Notifications] Error subscribing user:', error);
    return false;
  }
}

/**
 * Отключает уведомления для пользователя
 */
export async function unsubscribeUser(userId: string): Promise<boolean> {
  try {
    await db.update(botUsers)
      .set({ subscribed: 'false', updatedAt: new Date() })
      .where(eq(botUsers.userId, userId));
    return true;
  } catch (error) {
    console.error('❌ [Notifications] Error unsubscribing user:', error);
    return false;
  }
}

/**
 * Получает список всех подписанных пользователей
 * @param chatId - Если указан, возвращает только пользователей из этого чата
 */
export async function getSubscribedUsers(chatId?: string): Promise<Array<{
  userId: string;
  chatId: string;
  userName?: string | null;
}>> {
  try {
    let users;
    if (chatId) {
      // Фильтруем по chatId для изоляции между чатами
      users = await db
        .select()
        .from(botUsers)
        .where(
          and(
            eq(botUsers.subscribed, 'true'),
            eq(botUsers.chatId, chatId)
          )
        );
    } else {
      users = await db.select().from(botUsers).where(eq(botUsers.subscribed, 'true'));
    }
    
    return users.map((u: typeof botUsers.$inferSelect) => ({
      userId: u.userId,
      chatId: u.chatId,
      userName: u.userName,
    }));
  } catch (error) {
    console.error('❌ [Notifications] Error getting subscribed users:', error);
    return [];
  }
}

/**
 * Формирует текст уведомления на основе типа транзакции
 */
export function formatNotification(transaction: TransactionNotification): string {
  const { type, amount, employee, note, userName, newBalance } = transaction;
  
  let emoji = '';
  let action = '';
  let sign = '';
  
  switch (type) {
    case 'income':
      emoji = '📈';
      action = 'Прибыль';
      sign = '+';
      break;
    case 'expense':
      emoji = '📉';
      action = 'Расход';
      sign = '-';
      break;
    case 'employee_expense':
      emoji = '👤';
      action = `Личный расход ${employee}`;
      sign = '-';
      break;
    case 'dispute':
      emoji = '🔄';
      action = 'Закрыт спор';
      sign = '';
      break;
    case 'set_bank':
      emoji = '💰';
      action = 'Установлен баланс';
      sign = '';
      break;
  }
  
  let message = `${emoji} <b>${action}</b>: ${sign}${amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.`;
  
  if (newBalance !== undefined && type !== 'employee_expense') {
    message += `\n💰 Новый баланс: ${newBalance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.`;
  }
  
  if (note) {
    message += `\n📝 ${note}`;
  }
  
  message += `\n👤 ${userName}`;
  
  return message;
}

/**
 * Отправляет уведомление в групповой чат Telegram
 * @param transaction - Данные о транзакции
 * @param currentUserId - ID текущего пользователя (не используется для групп)
 * @param chatId - ID чата (группы или личного чата)
 */
export async function broadcastNotification(
  transaction: TransactionNotification,
  currentUserId: string,
  chatId: string
): Promise<void> {
  try {
    const message = formatNotification(transaction);
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error('❌ [Notifications] TELEGRAM_BOT_TOKEN not found');
      return;
    }
    
    // Отправляем уведомление напрямую в чат (группу)
    // Все участники группы увидят это сообщение
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`❌ [Notifications] Failed to send: ${response.status} ${response.statusText}`, errorData);
      }
    } catch (error: any) {
      console.error(`❌ [Notifications] Error sending to chat ${chatId}:`, {
        message: error.message,
        cause: error.cause,
        code: error.code,
      });
    }
    
    console.log(`✅ [Notifications] Sent notification to chat ${chatId}`);
  } catch (error) {
    console.error('❌ [Notifications] Error broadcasting notification:', error);
  }
}
