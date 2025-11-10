// Inline keyboard для Telegram бота
export function getMainMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '💰 Банк', callback_data: 'menu_bank' },
        { text: '📊 Статистика', callback_data: 'menu_stats' },
      ],
      [
        { text: '📈 Прибыль', callback_data: 'action_income' },
        { text: '📉 Расход', callback_data: 'menu_expense' },
      ],
      [
        { text: '🔄 Спор', callback_data: 'action_dispute' },
        { text: '👤 Личные', callback_data: 'menu_employees' },
      ],
    ],
  };
}

export function getExpenseMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '📉 Общий расход', callback_data: 'action_expense' }],
      [{ text: '💳 Долги', callback_data: 'action_debts' }],
      [{ text: '📌 Висяк', callback_data: 'action_visyak' }],
      [{ text: '🔙 Назад', callback_data: 'menu_main' }],
    ],
  };
}

export function getBankMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '📊 Показать баланс', callback_data: 'bank_show' }],
      [{ text: '💰 Установить баланс', callback_data: 'bank_set' }],
      [{ text: '🔙 Назад', callback_data: 'menu_main' }],
    ],
  };
}

export function getStatsMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '📊 Общая', callback_data: 'stats_general' }],
      [{ text: '📈 Прибыль', callback_data: 'stats_income' }],
      [{ text: '📉 Расходы', callback_data: 'stats_expense' }],
      [{ text: '🔄 Споры', callback_data: 'stats_disputes' }],
      [{ text: '👥 Сотрудники', callback_data: 'stats_employees' }],
      [{ text: '📅 История 24ч', callback_data: 'stats_history_24h' }],
      [{ text: '🔙 Назад', callback_data: 'menu_main' }],
    ],
  };
}

export function getEmployeesMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '👤 ZY', callback_data: 'employee_ZY' }],
      [{ text: '👤 AO', callback_data: 'employee_AO' }],
      [{ text: '👤 MIO', callback_data: 'employee_MIO' }],
      [{ text: '🔙 Назад', callback_data: 'menu_main' }],
    ],
  };
}

export function getEmployeeActionKeyboard(employee: string) {
  return {
    inline_keyboard: [
      [{ text: '➕ Добавить', callback_data: `employee_${employee}_add` }],
      [{ text: '➖ Вычесть', callback_data: `employee_${employee}_sub` }],
      [{ text: '🔙 Назад', callback_data: 'menu_employees' }],
    ],
  };
}

export function getCancelKeyboard() {
  return {
    inline_keyboard: [[{ text: '❌ Отменить', callback_data: 'cancel' }]],
  };
}
