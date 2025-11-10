#!/usr/bin/env node
import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { parseFinanceCommand } from './mastra/utils/commandParser.js';
import { financeTool } from './mastra/tools/financeTool.js';
import { RuntimeContext } from '@mastra/core/runtime-context';
import {
  getUserState,
  setUserState,
  clearUserState,
  getTempData,
} from './mastra/utils/stateManager.js';
import {
  registerUser,
  subscribeUser,
  unsubscribeUser,
} from './mastra/utils/notifications.js';
import {
  getMainMenuKeyboard,
  getBankMenuKeyboard,
  getStatsMenuKeyboard,
  getExpenseMenuKeyboard,
  getEmployeesMenuKeyboard,
  getEmployeeActionKeyboard,
  getCancelKeyboard,
} from './mastra/utils/telegramButtons.js';

// Проверяем наличие токена бота
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN не установлен в переменных окружения!');
  console.error('📝 Добавьте токен в файл .env:');
  console.error('   TELEGRAM_BOT_TOKEN=your_bot_token_here');
  process.exit(1);
}

console.log('🚀 Запуск финансового бота в режиме polling...');
console.log('📡 Ожидание сообщений от Telegram...');

// Создаем бота с long polling
const bot = new TelegramBot(BOT_TOKEN, {
  polling: {
    interval: 1000, // Интервал опроса в мс
    autoStart: true,
    params: {
      timeout: 10,
    },
  },
});

// Обработчик ошибок polling
bot.on('polling_error', (error) => {
  console.error('❌ Ошибка polling:', error.message);
  if (error.message.includes('ETELEGRAM: 409')) {
    console.error('⚠️  Другой экземпляр бота уже запущен! Остановите его и попробуйте снова.');
    process.exit(1);
  }
});

// Mock mastra object для совместимости с существующим кодом
const mockMastra = {
  getLogger: () => ({
    info: (...args: any[]) => console.log('ℹ️', ...args),
    error: (...args: any[]) => console.error('❌', ...args),
    warn: (...args: any[]) => console.warn('⚠️', ...args),
    debug: (...args: any[]) => console.log('🐛', ...args),
  }),
};

// Обработка текстовых сообщений
bot.on('message', async (msg) => {
  try {
    const chatId = msg.chat.id.toString();
    const userId = msg.from?.id.toString() || chatId;
    const userName = msg.from?.first_name || msg.from?.username || 'Пользователь';
    const text = msg.text || '';

    console.log(`📨 Получено сообщение от ${userName} (${userId}): ${text}`);

    // Регистрируем пользователя
    await registerUser(
      userId,
      chatId,
      msg.from?.username,
      msg.from?.first_name,
      msg.from?.last_name
    );

    // Проверяем состояние пользователя
    const userState = await getUserState(userId);

    // Если пользователь в процессе ввода данных
    if (userState && userState.state) {
      await handleStatefulMessage(chatId, userId, userName, text, userState);
      return;
    }

    // Обработка команд управления уведомлениями
    if (text === '/notify_on') {
      await subscribeUser(userId);
      await bot.sendMessage(
        chatId,
        '🔔 Уведомления включены! Вы будете получать уведомления о всех транзакциях.',
        {
          reply_markup: getMainMenuKeyboard(),
          parse_mode: 'HTML',
        }
      );
      return;
    }

    if (text === '/notify_off') {
      await unsubscribeUser(userId);
      await bot.sendMessage(
        chatId,
        '🔕 Уведомления отключены. Вы больше не будете получать уведомления о транзакциях.',
        {
          reply_markup: getMainMenuKeyboard(),
          parse_mode: 'HTML',
        }
      );
      return;
    }

    // Обработка команды /start или /menu
    if (text === '/start' || text === '/menu') {
      await clearUserState(userId);
      await bot.sendMessage(
        chatId,
        '👋 Добро пожаловать в финансового бота!\n\n📋 Выберите действие из меню:',
        {
          reply_markup: getMainMenuKeyboard(),
          parse_mode: 'HTML',
        }
      );
      return;
    }

    // Обработка остальных команд через workflow
    await executeFinanceCommand(chatId, userId, userName, text);
  } catch (error: any) {
    console.error('❌ Ошибка обработки сообщения:', error);
    const chatId = msg.chat.id.toString();
    await bot.sendMessage(
      chatId,
      '❌ Произошла ошибка. Попробуйте еще раз.',
      {
        reply_markup: getMainMenuKeyboard(),
      }
    );
  }
});

// Обработка callback запросов (кнопки)
bot.on('callback_query', async (callbackQuery) => {
  try {
    const chatId = callbackQuery.message?.chat.id.toString();
    const userId = callbackQuery.from.id.toString();
    const userName = callbackQuery.from.first_name || callbackQuery.from.username || 'Пользователь';
    const data = callbackQuery.data || '';

    if (!chatId) return;

    console.log(`🔘 Нажата кнопка от ${userName} (${userId}): ${data}`);

    // Регистрируем пользователя
    await registerUser(
      userId,
      chatId,
      callbackQuery.from.username,
      callbackQuery.from.first_name,
      callbackQuery.from.last_name
    );

    // Отвечаем на callback query
    await bot.answerCallbackQuery(callbackQuery.id);

    // Обработка меню
    if (data === 'menu_main') {
      await clearUserState(userId);
      await bot.sendMessage(chatId, '📋 Главное меню:\nВыберите действие:', {
        reply_markup: getMainMenuKeyboard(),
        parse_mode: 'HTML',
      });
    } else if (data === 'menu_bank') {
      await bot.sendMessage(chatId, '💰 Управление банком:', {
        reply_markup: getBankMenuKeyboard(),
        parse_mode: 'HTML',
      });
    } else if (data === 'menu_stats') {
      await bot.sendMessage(chatId, '📊 Статистика:\nВыберите тип статистики:', {
        reply_markup: getStatsMenuKeyboard(),
        parse_mode: 'HTML',
      });
    } else if (data === 'menu_employees') {
      await bot.sendMessage(chatId, '👥 Личные расходы:\nВыберите сотрудника:', {
        reply_markup: getEmployeesMenuKeyboard(),
        parse_mode: 'HTML',
      });
    } else if (data === 'menu_expense') {
      await bot.sendMessage(chatId, '📉 Расходы:\nВыберите тип расхода:', {
        reply_markup: getExpenseMenuKeyboard(),
        parse_mode: 'HTML',
      });
    } else if (data === 'cancel') {
      await clearUserState(userId);
      await bot.sendMessage(chatId, '❌ Операция отменена', {
        reply_markup: getMainMenuKeyboard(),
        parse_mode: 'HTML',
      });
    }
    // Банк
    else if (data === 'bank_show') {
      await executeFinanceCommand(chatId, userId, userName, '/bank');
    } else if (data === 'bank_set') {
      await setUserState(userId, 'waiting_amount', 'set_bank');
      await bot.sendMessage(chatId, '💰 Введите сумму для установки баланса банка:', {
        reply_markup: getCancelKeyboard(),
        parse_mode: 'HTML',
      });
    }
    // Статистика
    else if (data === 'stats_general') {
      await executeFinanceCommand(chatId, userId, userName, '/statistics');
    } else if (data === 'stats_income') {
      await executeFinanceCommand(chatId, userId, userName, '/statistics_income');
    } else if (data === 'stats_expense') {
      await executeFinanceCommand(chatId, userId, userName, '/statistics_expense');
    } else if (data === 'stats_disputes') {
      await executeFinanceCommand(chatId, userId, userName, '/statistics_disputes');
    } else if (data === 'stats_employees') {
      await executeFinanceCommand(chatId, userId, userName, '/statistics_employees');
    } else if (data === 'stats_history_24h') {
      await executeFinanceCommand(chatId, userId, userName, '/history');
    }
    // Действия
    else if (data === 'action_income') {
      await setUserState(userId, 'waiting_amount', 'add_income');
      await bot.sendMessage(chatId, '📈 Введите сумму прибыли:', {
        reply_markup: getCancelKeyboard(),
        parse_mode: 'HTML',
      });
    } else if (data === 'action_expense') {
      await setUserState(userId, 'waiting_amount', 'add_expense');
      await bot.sendMessage(chatId, '📉 Введите сумму расхода:', {
        reply_markup: getCancelKeyboard(),
        parse_mode: 'HTML',
      });
    } else if (data === 'action_debts') {
      await setUserState(userId, 'waiting_amount', 'add_debts');
      await bot.sendMessage(chatId, '💳 Введите сумму долга:', {
        reply_markup: getCancelKeyboard(),
        parse_mode: 'HTML',
      });
    } else if (data === 'action_visyak') {
      await setUserState(userId, 'waiting_amount', 'add_visyak');
      await bot.sendMessage(chatId, '📌 Введите сумму висяка:', {
        reply_markup: getCancelKeyboard(),
        parse_mode: 'HTML',
      });
    } else if (data === 'action_dispute') {
      await setUserState(userId, 'waiting_amount', 'add_dispute');
      await bot.sendMessage(chatId, '🔄 Введите сумму закрытого спора:', {
        reply_markup: getCancelKeyboard(),
        parse_mode: 'HTML',
      });
    }
    // Сотрудники
    else if (data.startsWith('employee_')) {
      const parts = data.split('_');
      if (parts.length === 2) {
        // employee_ZY
        const employee = parts[1];
        await bot.sendMessage(chatId, `👤 ${employee}:\nВыберите действие:`, {
          reply_markup: getEmployeeActionKeyboard(employee),
          parse_mode: 'HTML',
        });
      } else if (parts.length === 3) {
        // employee_ZY_add or employee_ZY_sub
        const employee = parts[1];
        const action = parts[2];
        const isAdd = action === 'add';

        await setUserState(userId, 'waiting_amount', isAdd ? 'add_employee_income' : 'add_employee_expense', {
          employee,
        });
        await bot.sendMessage(chatId, `👤 ${employee}: Введите сумму${isAdd ? ' (добавить)' : ' (вычесть)'}:`, {
          reply_markup: getCancelKeyboard(),
          parse_mode: 'HTML',
        });
      }
    }
  } catch (error: any) {
    console.error('❌ Ошибка обработки callback query:', error);
    if (callbackQuery.message?.chat.id) {
      await bot.sendMessage(
        callbackQuery.message.chat.id,
        '❌ Произошла ошибка. Попробуйте еще раз.',
        {
          reply_markup: getMainMenuKeyboard(),
        }
      );
    }
  }
});

// Обработка сообщений со статусом пользователя (многошаговые операции)
async function handleStatefulMessage(
  chatId: string,
  userId: string,
  userName: string,
  text: string,
  userState: any
) {
  const state = userState.state;
  const action = userState.action;
  const tempData = await getTempData(userId);

  if (state === 'waiting_amount') {
    // Парсим сумму
    const amount = parseFloat(text.replace(/\s/g, '').replace(',', '.'));
    if (isNaN(amount)) {
      await bot.sendMessage(chatId, '❌ Неверный формат суммы. Попробуйте еще раз:', {
        reply_markup: getCancelKeyboard(),
        parse_mode: 'HTML',
      });
      return;
    }

    // Сохраняем сумму и переходим к запросу заметки
    await setUserState(userId, 'waiting_note', action, { ...tempData, amount });
    await bot.sendMessage(chatId, '📝 Введите заметку (или отправьте "-" чтобы пропустить):', {
      reply_markup: getCancelKeyboard(),
      parse_mode: 'HTML',
    });
  } else if (state === 'waiting_note') {
    // Получаем заметку
    const note = text === '-' ? undefined : text;
    const amount = tempData?.amount;
    const employee = tempData?.employee;

    // Формируем команду
    let command = '';
    if (action === 'set_bank') {
      command = `/bank ${amount}`;
    } else if (action === 'add_income') {
      command = `+${amount}${note ? ` ${note}` : ''}`;
    } else if (action === 'add_expense') {
      command = `-${amount}${note ? ` ${note}` : ''}`;
    } else if (action === 'add_debts') {
      command = `/debts ${amount}${note ? ` ${note}` : ''}`;
    } else if (action === 'add_visyak') {
      command = `/visyak ${amount}${note ? ` ${note}` : ''}`;
    } else if (action === 'add_dispute') {
      command = `/dispute ${amount}${note ? ` ${note}` : ''}`;
    } else if (action === 'add_employee_expense') {
      const empCode = employee === 'ZY' ? 'Z' : employee === 'MIO' ? 'M' : 'A';
      command = `-${empCode}${amount}${note ? ` ${note}` : ''}`;
    } else if (action === 'add_employee_income') {
      const empCode = employee === 'ZY' ? 'Z' : employee === 'MIO' ? 'M' : 'A';
      command = `+${empCode}${amount}${note ? ` ${note}` : ''}`;
    }

    await clearUserState(userId);
    await executeFinanceCommand(chatId, userId, userName, command);
  }
}

// Выполнение финансовой команды
async function executeFinanceCommand(chatId: string, userId: string, userName: string, message: string) {
  try {
    console.log(`💼 Обработка финансовой команды: ${message}`);

    const parsedCommand = parseFinanceCommand(message);

    if (parsedCommand.action === 'unknown') {
      await bot.sendMessage(chatId, parsedCommand.error || 'Неизвестная команда', {
        reply_markup: getMainMenuKeyboard(),
        parse_mode: 'HTML',
      });
      return;
    }

    const result = await financeTool.execute({
      context: {
        action: parsedCommand.action as any,
        chatId: chatId,
        amount: parsedCommand.amount,
        employee: parsedCommand.employee,
        note: parsedCommand.note,
        userName: userName || 'Пользователь',
      },
      mastra: mockMastra as any,
      runtimeContext: new RuntimeContext(),
    });

    console.log(`✅ Результат выполнения команды: ${result.success ? 'успешно' : 'ошибка'}`);

    await bot.sendMessage(chatId, result.message, {
      reply_markup: getMainMenuKeyboard(),
      parse_mode: 'HTML',
    });
  } catch (error: any) {
    console.error('❌ Ошибка выполнения команды:', error);
    await bot.sendMessage(chatId, '❌ Произошла ошибка при обработке команды. Попробуйте еще раз.', {
      reply_markup: getMainMenuKeyboard(),
    });
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Остановка бота...');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Остановка бота...');
  bot.stopPolling();
  process.exit(0);
});

console.log('✅ Финансовый бот запущен и готов к работе!');
console.log('💡 Для остановки нажмите Ctrl+C');
