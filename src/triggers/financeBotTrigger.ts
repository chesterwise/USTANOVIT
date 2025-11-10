import { registerTelegramTrigger } from "./telegramTriggers";
import { financeWorkflow } from "../mastra/workflows/financeWorkflow";
import {
  getMainMenuKeyboard,
  getBankMenuKeyboard,
  getStatsMenuKeyboard,
  getExpenseMenuKeyboard,
  getEmployeesMenuKeyboard,
  getEmployeeActionKeyboard,
  getCancelKeyboard,
} from "../mastra/utils/telegramButtons";
import {
  getUserState,
  setUserState,
  clearUserState,
  getTempData,
} from "../mastra/utils/stateManager";
import { registerUser, subscribeUser, unsubscribeUser } from "../mastra/utils/notifications";

async function sendTelegramMessage(
  chatId: string,
  text: string,
  replyMarkup?: any
) {
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };

  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ [Telegram] Failed to send message: ${response.status} ${response.statusText}`, errorData);
    }
  } catch (error: any) {
    console.error(`❌ [Telegram] sendMessage error:`, {
      message: error.message,
      cause: error.cause,
      code: error.code,
      chatId,
      textLength: text.length
    });
    throw error;
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: text || "",
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ [Telegram] Failed to answer callback: ${response.status} ${response.statusText}`, errorData);
    }
  } catch (error: any) {
    console.error(`❌ [Telegram] answerCallbackQuery error:`, {
      message: error.message,
      cause: error.cause,
      code: error.code,
      callbackQueryId
    });
    throw error;
  }
}

export const financeBotTrigger = registerTelegramTrigger({
  triggerType: "telegram/message",
  handler: async (mastra, triggerInfo) => {
    const logger = mastra.getLogger();
    const payload = triggerInfo.payload;

    try {
      // Обработка callback_query (нажатия на кнопки)
      if (payload.callback_query) {
        await handleCallbackQuery(mastra, payload.callback_query, logger);
        return;
      }

      // Обработка обычных сообщений
      if (payload.message) {
        await handleMessage(mastra, payload.message, logger);
        return;
      }
    } catch (error) {
      logger?.error("❌ [FinanceBot] Error", { error: String(error) });
    }
  },
});

async function handleCallbackQuery(mastra: any, callbackQuery: any, logger: any) {
  const chatId = callbackQuery.message.chat.id.toString();
  const userId = callbackQuery.from.id.toString();
  const userName = callbackQuery.from.first_name || callbackQuery.from.username || "Пользователь";
  const data = callbackQuery.data;

  await registerUser(
    userId,
    chatId,
    callbackQuery.from.username,
    callbackQuery.from.first_name,
    callbackQuery.from.last_name
  );

  await answerCallbackQuery(callbackQuery.id);

  // Обработка меню
  if (data === "menu_main") {
    await clearUserState(userId);
    await sendTelegramMessage(
      chatId,
      "📋 Главное меню:\nВыберите действие:",
      getMainMenuKeyboard()
    );
  } else if (data === "menu_bank") {
    await sendTelegramMessage(
      chatId,
      "💰 Управление банком:",
      getBankMenuKeyboard()
    );
  } else if (data === "menu_stats") {
    await sendTelegramMessage(
      chatId,
      "📊 Статистика:\nВыберите тип статистики:",
      getStatsMenuKeyboard()
    );
  } else if (data === "menu_employees") {
    await sendTelegramMessage(
      chatId,
      "👥 Личные расходы:\nВыберите сотрудника:",
      getEmployeesMenuKeyboard()
    );
  } else if (data === "menu_expense") {
    await sendTelegramMessage(
      chatId,
      "📉 Расходы:\nВыберите тип расхода:",
      getExpenseMenuKeyboard()
    );
  } else if (data === "cancel") {
    await clearUserState(userId);
    await sendTelegramMessage(
      chatId,
      "❌ Операция отменена",
      getMainMenuKeyboard()
    );
  }
  // Банк
  else if (data === "bank_show") {
    await executeWorkflow(mastra, logger, "/bank", chatId, userId, userName);
  } else if (data === "bank_set") {
    await setUserState(userId, "waiting_amount", "set_bank");
    await sendTelegramMessage(
      chatId,
      "💰 Введите сумму для установки баланса банка:",
      getCancelKeyboard()
    );
  }
  // Статистика
  else if (data === "stats_general") {
    await executeWorkflow(mastra, logger, "/statistics", chatId, userId, userName);
  } else if (data === "stats_income") {
    await executeWorkflow(mastra, logger, "/statistics_income", chatId, userId, userName);
  } else if (data === "stats_expense") {
    await executeWorkflow(mastra, logger, "/statistics_expense", chatId, userId, userName);
  } else if (data === "stats_disputes") {
    await executeWorkflow(mastra, logger, "/statistics_disputes", chatId, userId, userName);
  } else if (data === "stats_employees") {
    await executeWorkflow(mastra, logger, "/statistics_employees", chatId, userId, userName);
  }
  // Действия
  else if (data === "action_income") {
    await setUserState(userId, "waiting_amount", "add_income");
    await sendTelegramMessage(
      chatId,
      "📈 Введите сумму прибыли:",
      getCancelKeyboard()
    );
  } else if (data === "action_expense") {
    await setUserState(userId, "waiting_amount", "add_expense");
    await sendTelegramMessage(
      chatId,
      "📉 Введите сумму расхода:",
      getCancelKeyboard()
    );
  } else if (data === "action_debts") {
    await setUserState(userId, "waiting_amount", "add_debts");
    await sendTelegramMessage(
      chatId,
      "💳 Введите сумму долга:",
      getCancelKeyboard()
    );
  } else if (data === "action_visyak") {
    await setUserState(userId, "waiting_amount", "add_visyak");
    await sendTelegramMessage(
      chatId,
      "📌 Введите сумму висяка:",
      getCancelKeyboard()
    );
  } else if (data === "action_dispute") {
    await setUserState(userId, "waiting_amount", "add_dispute");
    await sendTelegramMessage(
      chatId,
      "🔄 Введите сумму закрытого спора:",
      getCancelKeyboard()
    );
  }
  // Сотрудники
  else if (data.startsWith("employee_")) {
    const parts = data.split("_");
    if (parts.length === 2) {
      // employee_ZY
      const employee = parts[1];
      await sendTelegramMessage(
        chatId,
        `👤 ${employee}:\nВыберите действие:`,
        getEmployeeActionKeyboard(employee)
      );
    } else if (parts.length === 3) {
      // employee_ZY_add or employee_ZY_sub
      const employee = parts[1];
      const action = parts[2];
      const isAdd = action === "add";

      await setUserState(userId, "waiting_amount", isAdd ? "add_employee_income" : "add_employee_expense", {
        employee,
      });
      await sendTelegramMessage(
        chatId,
        `👤 ${employee}: Введите сумму${isAdd ? " (добавить)" : " (вычесть)"}:`,
        getCancelKeyboard()
      );
    }
  }
}

async function handleMessage(mastra: any, message: any, logger: any) {
  const chatId = message.chat.id.toString();
  const userId = message.from.id.toString();
  const userName = message.from.first_name || message.from.username || "Пользователь";
  const text = message.text || "";

  await registerUser(
    userId,
    chatId,
    message.from.username,
    message.from.first_name,
    message.from.last_name
  );

  // Проверяем состояние пользователя
  const userState = await getUserState(userId);

  // Если пользователь в процессе ввода данных
  if (userState && userState.state) {
    await handleStatefulMessage(mastra, logger, chatId, userId, userName, text, userState);
    return;
  }

  // Обработка команд управления уведомлениями
  if (text === "/notify_on") {
    await subscribeUser(userId);
    await sendTelegramMessage(
      chatId,
      "🔔 Уведомления включены! Вы будете получать уведомления о всех транзакциях.",
      getMainMenuKeyboard()
    );
    return;
  }

  if (text === "/notify_off") {
    await unsubscribeUser(userId);
    await sendTelegramMessage(
      chatId,
      "🔕 Уведомления отключены. Вы больше не будете получать уведомления о транзакциях.",
      getMainMenuKeyboard()
    );
    return;
  }

  // Обработка команды /start
  if (text === "/start" || text === "/menu") {
    await clearUserState(userId);
    await sendTelegramMessage(
      chatId,
      "👋 Добро пожаловать в финансового бота!\n\n📋 Выберите действие из меню:",
      getMainMenuKeyboard()
    );
    return;
  }

  // Обработка остальных команд через workflow
  await executeWorkflow(mastra, logger, text, chatId, userId, userName);
}

async function handleStatefulMessage(
  mastra: any,
  logger: any,
  chatId: string,
  userId: string,
  userName: string,
  text: string,
  userState: any
) {
  const state = userState.state;
  const action = userState.action;
  const tempData = await getTempData(userId);

  if (state === "waiting_amount") {
    // Парсим сумму
    const amount = parseFloat(text.replace(/\s/g, "").replace(",", "."));
    if (isNaN(amount)) {
      await sendTelegramMessage(
        chatId,
        "❌ Неверный формат суммы. Попробуйте еще раз:",
        getCancelKeyboard()
      );
      return;
    }

    // Сохраняем сумму и переходим к запросу заметки
    await setUserState(userId, "waiting_note", action, { ...tempData, amount });
    await sendTelegramMessage(
      chatId,
      "📝 Введите заметку (или отправьте \"-\" чтобы пропустить):",
      getCancelKeyboard()
    );
  } else if (state === "waiting_note") {
    // Получаем заметку
    const note = text === "-" ? undefined : text;
    const amount = tempData?.amount;
    const employee = tempData?.employee;

    // Формируем команду
    let command = "";
    if (action === "set_bank") {
      command = `/bank ${amount}`;
    } else if (action === "add_income") {
      command = `+${amount}${note ? ` ${note}` : ""}`;
    } else if (action === "add_expense") {
      command = `-${amount}${note ? ` ${note}` : ""}`;
    } else if (action === "add_debts") {
      command = `/debts ${amount}${note ? ` ${note}` : ""}`;
    } else if (action === "add_visyak") {
      command = `/visyak ${amount}${note ? ` ${note}` : ""}`;
    } else if (action === "add_dispute") {
      command = `/dispute ${amount}${note ? ` ${note}` : ""}`;
    } else if (action === "add_employee_expense") {
      const empCode = employee === "ZY" ? "Z" : employee === "MIO" ? "M" : "A";
      command = `-${empCode}${amount}${note ? ` ${note}` : ""}`;
    } else if (action === "add_employee_income") {
      const empCode = employee === "ZY" ? "Z" : employee === "MIO" ? "M" : "A";
      command = `+${empCode}${amount}${note ? ` ${note}` : ""}`;
    }

    await clearUserState(userId);
    await executeWorkflow(mastra, logger, command, chatId, userId, userName);
  }
}

async function executeWorkflow(
  mastra: any,
  logger: any,
  message: string,
  chatId: string,
  userId: string,
  userName?: string
) {
  const run = await financeWorkflow.createRunAsync();
  const result = await run.start({
    inputData: {
      message,
      chatId: chatId,
      userId,
      userName: userName || "Пользователь",
    },
  });

  if (result.status === "success") {
    const workflowResult = result as any;
    if (workflowResult.result && workflowResult.result.response) {
      await sendTelegramMessage(
        chatId,
        workflowResult.result.response,
        getMainMenuKeyboard()
      );
    }
  } else {
    await sendTelegramMessage(
      chatId,
      "Произошла ошибка при обработке команды.",
      getMainMenuKeyboard()
    );
  }
}
