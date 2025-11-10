import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { db } from "../../../shared/db";
import { transactions, bankBalance } from "../../../shared/schema";

function formatDateMSK(date: Date | string | number): string {
  const d = new Date(date);
  d.setHours(d.getHours() + 3);
  return d.toLocaleString('ru-RU', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'UTC'
  });
}

export const financeTool = createTool({
  id: "finance-tool",
  description: "Finance operations tool",
  inputSchema: z.object({
    action: z.enum([
      'set_bank',
      'get_bank',
      'add_income',
      'add_expense',
      'add_employee_expense',
      'add_employee_income',
      'add_dispute',
      'add_debts',
      'add_visyak',
      'get_statistics',
      'get_statistics_income',
      'get_statistics_expense',
      'get_statistics_disputes',
      'get_statistics_employees',
      'get_history_24h'
    ]),
    chatId: z.string(),
    amount: z.number().optional(),
    employee: z.enum(['ZY', 'MIO', 'AO']).optional(),
    note: z.string().optional(),
    userName: z.string().optional(),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    data: z.any().optional(),
    notificationData: z.object({
      shouldNotify: z.boolean(),
      type: z.enum(['income', 'expense', 'employee_expense', 'dispute', 'set_bank']).optional(),
      amount: z.number().optional(),
      employee: z.string().optional(),
      note: z.string().optional(),
      userName: z.string().optional(),
      newBalance: z.number().optional(),
    }).optional(),
  }),

  execute: async ({ context, mastra }) => {
    try {
      switch (context.action) {
        case 'set_bank': {
          if (!context.amount) {
            return { success: false, message: "Не указана сумма" };
          }
          
          const existing = await db.select().from(bankBalance).where(eq(bankBalance.chatId, context.chatId));
          
          if (existing.length > 0) {
            await db.update(bankBalance)
              .set({ balance: context.amount.toString(), updatedAt: new Date() })
              .where(eq(bankBalance.chatId, context.chatId));
          } else {
            await db.insert(bankBalance).values({
              chatId: context.chatId,
              balance: context.amount.toString(),
            });
          }
          
          return { 
            success: true, 
            message: `💰 Банк установлен: ${context.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.`,
            notificationData: {
              shouldNotify: true,
              type: 'set_bank' as const,
              amount: context.amount,
              userName: context.userName || 'Пользователь',
              newBalance: context.amount,
            }
          };
        }

        case 'get_bank': {
          const balance = await db.select().from(bankBalance).where(eq(bankBalance.chatId, context.chatId));
          const amount = balance.length > 0 ? parseFloat(balance[0].balance) : 0;
          
          return { 
            success: true, 
            message: `💰 Текущий баланс: ${amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.`,
            data: { balance: amount }
          };
        }

        case 'add_income': {
          if (!context.amount) {
            return { success: false, message: "Не указана сумма" };
          }
          
          await db.insert(transactions).values({
            chatId: context.chatId,
            type: 'income',
            amount: context.amount.toString(),
            note: context.note,
            userName: context.userName,
          });
          
          const balance = await db.select().from(bankBalance).where(eq(bankBalance.chatId, context.chatId));
          const currentBalance = balance.length > 0 ? parseFloat(balance[0].balance) : 0;
          const newBalance = currentBalance + context.amount;
          
          if (balance.length > 0) {
            await db.update(bankBalance)
              .set({ balance: newBalance.toString(), updatedAt: new Date() })
              .where(eq(bankBalance.chatId, context.chatId));
          } else {
            await db.insert(bankBalance).values({
              chatId: context.chatId,
              balance: newBalance.toString(),
            });
          }
          
          return { 
            success: true, 
            message: `📈 Прибыль +${context.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.\n💰 Новый баланс: ${newBalance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.${context.note ? `\n📝 Заметка: ${context.note}` : ''}${context.userName ? `\n👤 Внес: ${context.userName}` : ''}`,
            notificationData: {
              shouldNotify: true,
              type: 'income' as const,
              amount: context.amount,
              note: context.note,
              userName: context.userName || 'Пользователь',
              newBalance: newBalance,
            }
          };
        }

        case 'add_expense': {
          if (!context.amount) {
            return { success: false, message: "Не указана сумма" };
          }
          
          await db.insert(transactions).values({
            chatId: context.chatId,
            type: 'expense',
            amount: context.amount.toString(),
            note: context.note,
            userName: context.userName,
          });
          
          const balance = await db.select().from(bankBalance).where(eq(bankBalance.chatId, context.chatId));
          const currentBalance = balance.length > 0 ? parseFloat(balance[0].balance) : 0;
          const newBalance = currentBalance - context.amount;
          
          if (balance.length > 0) {
            await db.update(bankBalance)
              .set({ balance: newBalance.toString(), updatedAt: new Date() })
              .where(eq(bankBalance.chatId, context.chatId));
          } else {
            await db.insert(bankBalance).values({
              chatId: context.chatId,
              balance: newBalance.toString(),
            });
          }
          
          return { 
            success: true, 
            message: `📉 Расход -${context.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.\n💰 Новый баланс: ${newBalance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.${context.note ? `\n📝 Заметка: ${context.note}` : ''}${context.userName ? `\n👤 Внес: ${context.userName}` : ''}`,
            notificationData: {
              shouldNotify: true,
              type: 'expense' as const,
              amount: context.amount,
              note: context.note,
              userName: context.userName || 'Пользователь',
              newBalance: newBalance,
            }
          };
        }

        case 'add_employee_expense': {
          if (!context.amount || !context.employee) {
            return { success: false, message: "Не указана сумма или сотрудник" };
          }
          
          await db.insert(transactions).values({
            chatId: context.chatId,
            type: 'employee_expense',
            amount: context.amount.toString(),
            employee: context.employee,
            note: context.note,
            userName: context.userName,
          });
          
          return { 
            success: true, 
            message: `👤 Личный расход ${context.employee}: -${context.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.${context.note ? `\n📝 Заметка: ${context.note}` : ''}${context.userName ? `\n👤 Внес: ${context.userName}` : ''}`,
            notificationData: {
              shouldNotify: true,
              type: 'employee_expense' as const,
              amount: context.amount,
              employee: context.employee,
              note: context.note,
              userName: context.userName || 'Пользователь',
            }
          };
        }

        case 'add_employee_income': {
          if (!context.amount || !context.employee) {
            return { success: false, message: "Не указана сумма или сотрудник" };
          }
          
          
          // Добавляем отрицательную транзакцию расхода (т.е. уменьшаем расход)
          await db.insert(transactions).values({
            chatId: context.chatId,
            type: 'employee_expense',
            amount: (-context.amount).toString(),
            employee: context.employee,
            note: context.note,
            userName: context.userName,
          });
          
          return { 
            success: true, 
            message: `👤 Личный расход ${context.employee}: +${context.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.${context.note ? `\n📝 Заметка: ${context.note}` : ''}${context.userName ? `\n👤 Внес: ${context.userName}` : ''}`
          };
        }

        case 'add_dispute': {
          if (!context.amount) {
            return { success: false, message: "Не указана сумма" };
          }
          
          
          await db.insert(transactions).values({
            chatId: context.chatId,
            type: 'dispute',
            amount: context.amount.toString(),
            note: context.note,
            userName: context.userName,
          });
          
          return { 
            success: true, 
            message: `🔄 Закрыт спор на сумму: ${context.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.${context.note ? `\n📝 Заметка: ${context.note}` : ''}${context.userName ? `\n👤 Внес: ${context.userName}` : ''}`
          };
        }

        case 'add_debts': {
          if (!context.amount) {
            return { success: false, message: "Не указана сумма" };
          }
          
          
          const debtsNote = `💳 Долги${context.note ? `: ${context.note}` : ''}`;
          
          await db.insert(transactions).values({
            chatId: context.chatId,
            type: 'expense',
            amount: context.amount.toString(),
            note: debtsNote,
            userName: context.userName,
          });
          
          const balance = await db.select().from(bankBalance).where(eq(bankBalance.chatId, context.chatId));
          const currentBalance = balance.length > 0 ? parseFloat(balance[0].balance) : 0;
          const newBalance = currentBalance - context.amount;
          
          if (balance.length > 0) {
            await db.update(bankBalance)
              .set({ balance: newBalance.toString(), updatedAt: new Date() })
              .where(eq(bankBalance.chatId, context.chatId));
          } else {
            await db.insert(bankBalance).values({
              chatId: context.chatId,
              balance: newBalance.toString(),
            });
          }
          
          return { 
            success: true, 
            message: `💳 Долги: -${context.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.\n💰 Новый баланс: ${newBalance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.${context.note ? `\n📝 Заметка: ${context.note}` : ''}${context.userName ? `\n👤 Внес: ${context.userName}` : ''}`
          };
        }

        case 'add_visyak': {
          if (!context.amount) {
            return { success: false, message: "Не указана сумма" };
          }
          
          
          const visyakNote = `📌 Висяк${context.note ? `: ${context.note}` : ''}`;
          
          await db.insert(transactions).values({
            chatId: context.chatId,
            type: 'expense',
            amount: context.amount.toString(),
            note: visyakNote,
            userName: context.userName,
          });
          
          const balance = await db.select().from(bankBalance).where(eq(bankBalance.chatId, context.chatId));
          const currentBalance = balance.length > 0 ? parseFloat(balance[0].balance) : 0;
          const newBalance = currentBalance - context.amount;
          
          if (balance.length > 0) {
            await db.update(bankBalance)
              .set({ balance: newBalance.toString(), updatedAt: new Date() })
              .where(eq(bankBalance.chatId, context.chatId));
          } else {
            await db.insert(bankBalance).values({
              chatId: context.chatId,
              balance: newBalance.toString(),
            });
          }
          
          return { 
            success: true, 
            message: `📌 Висяк: -${context.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.\n💰 Новый баланс: ${newBalance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.${context.note ? `\n📝 Заметка: ${context.note}` : ''}${context.userName ? `\n👤 Внес: ${context.userName}` : ''}`
          };
        }

        case 'get_statistics': {
          
          const balance = await db.select().from(bankBalance).where(eq(bankBalance.chatId, context.chatId));
          const currentBalance = balance.length > 0 ? parseFloat(balance[0].balance) : 0;
          
          const allTransactions = await db.select()
            .from(transactions)
            .where(eq(transactions.chatId, context.chatId))
            .orderBy(desc(transactions.createdAt));
          
          const income = allTransactions
            .filter((t: any) => t.type === 'income')
            .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
          
          const allExpenseTransactions = allTransactions.filter((t: any) => t.type === 'expense');
          
          const debts = allExpenseTransactions
            .filter((t: any) => t.note?.startsWith('💳 Долги'))
            .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
          
          const visyak = allExpenseTransactions
            .filter((t: any) => t.note?.startsWith('📌 Висяк'))
            .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
          
          const regularExpenses = allExpenseTransactions
            .filter((t: any) => !t.note?.startsWith('💳 Долги') && !t.note?.startsWith('📌 Висяк'))
            .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
          
          const expenses = allExpenseTransactions
            .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
          
          const disputes = allTransactions
            .filter((t: any) => t.type === 'dispute')
            .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
          
          const employeeZY = allTransactions
            .filter((t: any) => t.type === 'employee_expense' && t.employee === 'ZY')
            .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
          
          const employeeMIO = allTransactions
            .filter((t: any) => t.type === 'employee_expense' && t.employee === 'MIO')
            .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
          
          const employeeAO = allTransactions
            .filter((t: any) => t.type === 'employee_expense' && t.employee === 'AO')
            .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
          
          const turnover = income + currentBalance;
          const bankMinusDisputes = currentBalance - disputes;
          const bankMinusExpenses = currentBalance - expenses;
          
          const stats = `📊 ОБЩАЯ СТАТИСТИКА:

💰 Банк: ${currentBalance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.

📈 Прокручено/Прибыль: ${income.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.
💵 Оборот + банк: ${turnover.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.

🔄 Закрыто споров на сумму: ${disputes.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.
💸 Банк - споры: ${bankMinusDisputes.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.

📉 Расходы общие: ${regularExpenses.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.
  💳 Долги: ${debts.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.
  📌 Висяк: ${visyak.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.
💰 Банк - расходы: ${bankMinusExpenses.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.

👥 ЛИЧНЫЙ РАСХОД:
  • ZY: ${employeeZY.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.
  • AO: ${employeeAO.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.
  • MIO: ${employeeMIO.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.`;
          
          return { success: true, message: stats };
        }

        case 'get_statistics_income': {
          
          const incomeTransactions = await db.select()
            .from(transactions)
            .where(and(
              eq(transactions.chatId, context.chatId),
              eq(transactions.type, 'income')
            ))
            .orderBy(desc(transactions.createdAt))
            .limit(10);
          
          const totalIncome = incomeTransactions.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
          
          let stats = `📈 СТАТИСТИКА ПРИБЫЛИ:\n\n💰 Общая прибыль: ${totalIncome.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.\n📋 Последние транзакции:\n`;
          
          incomeTransactions.forEach((t: any, i: number) => {
            const date = formatDateMSK(t.createdAt);
            stats += `  ${i + 1}. ${date}: +${parseFloat(t.amount).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.${t.note ? ` (${t.note})` : ''}\n`;
          });
          
          return { success: true, message: stats || "Нет данных о прибыли" };
        }

        case 'get_statistics_expense': {
          
          const expenseTransactions = await db.select()
            .from(transactions)
            .where(and(
              eq(transactions.chatId, context.chatId),
              eq(transactions.type, 'expense')
            ))
            .orderBy(desc(transactions.createdAt))
            .limit(10);
          
          const totalExpense = expenseTransactions.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
          
          let stats = `📉 СТАТИСТИКА РАСХОДОВ:\n\n💸 Общие расходы: ${totalExpense.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.\n📋 Последние транзакции:\n`;
          
          expenseTransactions.forEach((t: any, i: number) => {
            const date = formatDateMSK(t.createdAt);
            stats += `  ${i + 1}. ${date}: -${parseFloat(t.amount).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.${t.note ? ` (${t.note})` : ''}\n`;
          });
          
          return { success: true, message: stats || "Нет данных о расходах" };
        }

        case 'get_statistics_disputes': {
          
          const disputeTransactions = await db.select()
            .from(transactions)
            .where(and(
              eq(transactions.chatId, context.chatId),
              eq(transactions.type, 'dispute')
            ))
            .orderBy(desc(transactions.createdAt))
            .limit(10);
          
          const totalDisputes = disputeTransactions.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
          
          let stats = `🔄 СТАТИСТИКА СПОРОВ:\n\n💰 Закрыто споров на сумму: ${totalDisputes.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.\n📋 Последние транзакции:\n`;
          
          disputeTransactions.forEach((t: any, i: number) => {
            const date = formatDateMSK(t.createdAt);
            stats += `  ${i + 1}. ${date}: ${parseFloat(t.amount).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.${t.note ? ` (${t.note})` : ''}\n`;
          });
          
          return { success: true, message: stats || "Нет данных о спорах" };
        }

        case 'get_statistics_employees': {
          
          const employeeTransactions = await db.select()
            .from(transactions)
            .where(and(
              eq(transactions.chatId, context.chatId),
              eq(transactions.type, 'employee_expense')
            ))
            .orderBy(desc(transactions.createdAt));
          
          const zyTransactions = employeeTransactions.filter((t: any) => t.employee === 'ZY');
          const mioTransactions = employeeTransactions.filter((t: any) => t.employee === 'MIO');
          const aoTransactions = employeeTransactions.filter((t: any) => t.employee === 'AO');
          
          const zyTotal = zyTransactions.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
          const mioTotal = mioTransactions.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
          const aoTotal = aoTransactions.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
          
          let stats = `👥 СТАТИСТИКА РАСХОДОВ СОТРУДНИКОВ:\n\n`;
          
          if (zyTransactions.length > 0) {
            stats += `👤 ZY:\n  💸 Общая сумма: ${zyTotal.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.\n  📋 Последние транзакции:\n`;
            zyTransactions.slice(0, 5).forEach((t: any, i: number) => {
              const date = formatDateMSK(t.createdAt);
              stats += `    ${i + 1}. ${date}: ${parseFloat(t.amount).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.${t.note ? ` (${t.note})` : ''}\n`;
            });
            stats += '\n';
          }
          
          if (aoTransactions.length > 0) {
            stats += `👤 AO:\n  💸 Общая сумма: ${aoTotal.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.\n  📋 Последние транзакции:\n`;
            aoTransactions.slice(0, 5).forEach((t: any, i: number) => {
              const date = formatDateMSK(t.createdAt);
              stats += `    ${i + 1}. ${date}: ${parseFloat(t.amount).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.${t.note ? ` (${t.note})` : ''}\n`;
            });
            stats += '\n';
          }
          
          if (mioTransactions.length > 0) {
            stats += `👤 MIO:\n  💸 Общая сумма: ${mioTotal.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.\n  📋 Последние транзакции:\n`;
            mioTransactions.slice(0, 5).forEach((t: any, i: number) => {
              const date = formatDateMSK(t.createdAt);
              stats += `    ${i + 1}. ${date}: ${parseFloat(t.amount).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.${t.note ? ` (${t.note})` : ''}\n`;
            });
          }
          
          return { success: true, message: stats || "Нет данных о расходах сотрудников" };
        }

        case 'get_history_24h': {
          
          const now = new Date();
          const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          
          const recentTransactions = await db.select()
            .from(transactions)
            .where(eq(transactions.chatId, context.chatId))
            .orderBy(desc(transactions.createdAt));
          
          const last24hTransactions = recentTransactions.filter((t: any) => {
            const txDate = new Date(t.createdAt);
            return txDate >= twentyFourHoursAgo;
          });
          
          if (last24hTransactions.length === 0) {
            return { 
              success: true, 
              message: `📅 ИСТОРИЯ ЗА ПОСЛЕДНИЕ 24 ЧАСА:\n\n❌ Нет транзакций за последние 24 часа` 
            };
          }
          
          let history = `📅 ИСТОРИЯ ЗА ПОСЛЕДНИЕ 24 ЧАСА:\n\n`;
          history += `📊 Всего операций: ${last24hTransactions.length}\n\n`;
          
          const typeEmojis: Record<string, string> = {
            'income': '📈',
            'expense': '📉',
            'employee_expense': '👤',
            'dispute': '🔄'
          };
          
          const typeNames: Record<string, string> = {
            'income': 'Прибыль',
            'expense': 'Расход',
            'employee_expense': 'Личный расход',
            'dispute': 'Спор'
          };
          
          last24hTransactions.forEach((t: any, i: number) => {
            const date = formatDateMSK(t.createdAt);
            const emoji = typeEmojis[t.type] || '📝';
            const typeName = typeNames[t.type] || 'Операция';
            const amount = parseFloat(t.amount);
            const sign = t.type === 'income' ? '+' : '-';
            
            history += `${i + 1}. ${emoji} ${typeName}\n`;
            history += `   💰 ${sign}${Math.abs(amount).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.\n`;
            
            if (t.employee) {
              history += `   👤 Сотрудник: ${t.employee}\n`;
            }
            
            if (t.note) {
              history += `   📝 ${t.note}\n`;
            }
            
            if (t.userName) {
              history += `   👨‍💼 Внес: ${t.userName}\n`;
            }
            
            history += `   ⏰ ${date}\n\n`;
          });
          
          return { success: true, message: history };
        }

        default:
          return { success: false, message: "Неизвестное действие" };
      }
    } catch (error) {
      return { 
        success: false, 
        message: `Ошибка: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  },
});
