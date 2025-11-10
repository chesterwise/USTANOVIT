import { z } from "zod";

// Схема для распарсенной команды
export const ParsedCommandSchema = z.object({
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
    'get_history_24h',
    'unknown'
  ]),
  amount: z.number().optional(),
  employee: z.enum(['ZY', 'MIO', 'AO']).optional(),
  note: z.string().optional(),
  error: z.string().optional(),
});

export type ParsedCommand = z.infer<typeof ParsedCommandSchema>;

/**
 * Парсит сумму из строки, поддерживает разные форматы:
 * - 1000
 * - 1000.50
 * - 1 000
 * - 1,000
 * - 1 000,50
 */
function parseAmount(text: string): number | null {
  // Убираем пробелы и заменяем запятую на точку
  const cleaned = text.trim().replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Парсит команды финансового бота
 */
export function parseFinanceCommand(message: string): ParsedCommand {
  const trimmed = message.trim();
  
  // Команды помощи и приветствия
  if (trimmed === '/start' || trimmed === '/help') {
    return {
      action: 'unknown',
      error: `👋 Добро пожаловать в финансового бота!

📋 ДОСТУПНЫЕ КОМАНДЫ:

💰 Управление банком:
  /bank [сумма] - установить баланс
  /bank - показать баланс

💵 Операции:
  +[сумма] [заметка] - добавить прибыль
  -[сумма] [заметка] - общий расход
  /dispute [сумма] [заметка] - закрыть спор

👤 Личные расходы:
  -Z[сумма] [заметка] - вычесть у ZY
  +Z[сумма] [заметка] - добавить к ZY
  -A[сумма] [заметка] - вычесть у AO
  +A[сумма] [заметка] - добавить к AO
  -M[сумма] [заметка] - вычесть у MIO
  +M[сумма] [заметка] - добавить к MIO

📊 Статистика:
  /statistics - общая статистика
  /statistics_income - статистика прибыли
  /statistics_expense - статистика расходов (включая долги и висяк)
  /statistics_disputes - статистика споров
  /statistics_employees - расходы сотрудников
  /history - история операций за 24 часа

Примеры:
  /bank 1000000
  +50000 оплата клиента
  -10000 аренда
  -Z5000 аванс
  +A2000 возврат`
    };
  }
  
  // Команды статистики
  if (trimmed === '/statistics' || trimmed === '/stats') {
    return { action: 'get_statistics' };
  }
  if (trimmed === '/statistics_income') {
    return { action: 'get_statistics_income' };
  }
  if (trimmed === '/statistics_expense') {
    return { action: 'get_statistics_expense' };
  }
  if (trimmed === '/statistics_disputes') {
    return { action: 'get_statistics_disputes' };
  }
  if (trimmed === '/statistics_employees') {
    return { action: 'get_statistics_employees' };
  }
  
  // Команда истории за 24 часа
  if (trimmed === '/history' || trimmed === '/history_24h') {
    return { action: 'get_history_24h' };
  }
  
  // /bank команды
  if (trimmed.startsWith('/bank')) {
    const parts = trimmed.substring(5).trim();
    
    if (!parts) {
      // Просто /bank - показать баланс
      return { action: 'get_bank' };
    }
    
    // /bank [сумма] - установить баланс
    const amount = parseAmount(parts);
    if (amount === null) {
      return { 
        action: 'unknown', 
        error: '❌ Неверный формат суммы. Используйте: /bank 1000000' 
      };
    }
    
    return { action: 'set_bank', amount };
  }
  
  // /dispute команды
  if (trimmed.startsWith('/dispute')) {
    const parts = trimmed.substring(8).trim().split(/\s+/);
    
    if (parts.length === 0 || !parts[0]) {
      return { 
        action: 'unknown', 
        error: '❌ Неверный формат. Используйте: /dispute 20000 [заметка]' 
      };
    }
    
    const amount = parseAmount(parts[0]);
    if (amount === null) {
      return { 
        action: 'unknown', 
        error: '❌ Неверный формат суммы. Используйте: /dispute 20000 [заметка]' 
      };
    }
    
    const note = parts.slice(1).join(' ') || undefined;
    return { action: 'add_dispute', amount, note };
  }
  
  // /debts команды
  if (trimmed.startsWith('/debts')) {
    const parts = trimmed.substring(6).trim().split(/\s+/);
    
    if (parts.length === 0 || !parts[0]) {
      return { 
        action: 'unknown', 
        error: '❌ Неверный формат. Используйте: /debts 10000 [заметка]' 
      };
    }
    
    const amount = parseAmount(parts[0]);
    if (amount === null) {
      return { 
        action: 'unknown', 
        error: '❌ Неверный формат суммы. Используйте: /debts 10000 [заметка]' 
      };
    }
    
    const note = parts.slice(1).join(' ') || undefined;
    return { action: 'add_debts', amount, note };
  }
  
  // /visyak команды
  if (trimmed.startsWith('/visyak')) {
    const parts = trimmed.substring(7).trim().split(/\s+/);
    
    if (parts.length === 0 || !parts[0]) {
      return { 
        action: 'unknown', 
        error: '❌ Неверный формат. Используйте: /visyak 5000 [заметка]' 
      };
    }
    
    const amount = parseAmount(parts[0]);
    if (amount === null) {
      return { 
        action: 'unknown', 
        error: '❌ Неверный формат суммы. Используйте: /visyak 5000 [заметка]' 
      };
    }
    
    const note = parts.slice(1).join(' ') || undefined;
    return { action: 'add_visyak', amount, note };
  }
  
  // +Z[сумма], +M[сумма], +A[сумма] - добавление к личному расходу сотрудника
  if (trimmed.startsWith('+Z') || trimmed.startsWith('+М') || trimmed.startsWith('+M') || trimmed.startsWith('+A') || trimmed.startsWith('+А')) {
    let employee: 'ZY' | 'MIO' | 'AO';
    const firstChar = trimmed[1].toUpperCase();
    
    if (firstChar === 'Z' || firstChar === 'З') {
      employee = 'ZY';
    } else if (firstChar === 'M' || firstChar === 'М') {
      employee = 'MIO';
    } else if (firstChar === 'A' || firstChar === 'А') {
      employee = 'AO';
    } else {
      return { 
        action: 'unknown', 
        error: '❌ Неизвестный сотрудник. Используйте: +Z, +M, или +A' 
      };
    }
    
    const parts = trimmed.substring(2).trim().split(/\s+/);
    
    if (parts.length === 0 || !parts[0]) {
      return { 
        action: 'unknown', 
        error: '❌ Неверный формат. Используйте: +Z5000 [заметка]' 
      };
    }
    
    const amount = parseAmount(parts[0]);
    if (amount === null) {
      return { 
        action: 'unknown', 
        error: '❌ Неверный формат суммы. Используйте: +Z5000 [заметка]' 
      };
    }
    
    const note = parts.slice(1).join(' ') || undefined;
    return { action: 'add_employee_income', amount, employee, note };
  }
  
  // +[сумма] [заметка] - прибыль
  if (trimmed.startsWith('+')) {
    const parts = trimmed.substring(1).trim().split(/\s+/);
    
    if (parts.length === 0 || !parts[0]) {
      return { 
        action: 'unknown', 
        error: '❌ Неверный формат. Используйте: +50000 [заметка]' 
      };
    }
    
    const amount = parseAmount(parts[0]);
    if (amount === null) {
      return { 
        action: 'unknown', 
        error: '❌ Неверный формат суммы. Используйте: +50000 [заметка]' 
      };
    }
    
    const note = parts.slice(1).join(' ') || undefined;
    return { action: 'add_income', amount, note };
  }
  
  // -Z[сумма], -M[сумма], -A[сумма] - личный расход сотрудника
  if (trimmed.startsWith('-Z') || trimmed.startsWith('-М') || trimmed.startsWith('-M') || trimmed.startsWith('-A') || trimmed.startsWith('-А')) {
    let employee: 'ZY' | 'MIO' | 'AO';
    const firstChar = trimmed[1].toUpperCase();
    
    if (firstChar === 'Z' || firstChar === 'З') {
      employee = 'ZY';
    } else if (firstChar === 'M' || firstChar === 'М') {
      employee = 'MIO';
    } else if (firstChar === 'A' || firstChar === 'А') {
      employee = 'AO';
    } else {
      return { 
        action: 'unknown', 
        error: '❌ Неизвестный сотрудник. Используйте: -Z, -M, или -A' 
      };
    }
    
    const parts = trimmed.substring(2).trim().split(/\s+/);
    
    if (parts.length === 0 || !parts[0]) {
      return { 
        action: 'unknown', 
        error: '❌ Неверный формат. Используйте: -Z5000 [заметка]' 
      };
    }
    
    const amount = parseAmount(parts[0]);
    if (amount === null) {
      return { 
        action: 'unknown', 
        error: '❌ Неверный формат суммы. Используйте: -Z5000 [заметка]' 
      };
    }
    
    const note = parts.slice(1).join(' ') || undefined;
    return { action: 'add_employee_expense', amount, employee, note };
  }
  
  // -[сумма] [заметка] - общий расход
  if (trimmed.startsWith('-')) {
    const parts = trimmed.substring(1).trim().split(/\s+/);
    
    if (parts.length === 0 || !parts[0]) {
      return { 
        action: 'unknown', 
        error: '❌ Неверный формат. Используйте: -10000 [заметка]' 
      };
    }
    
    const amount = parseAmount(parts[0]);
    if (amount === null) {
      return { 
        action: 'unknown', 
        error: '❌ Неверный формат суммы. Используйте: -10000 [заметка]' 
      };
    }
    
    const note = parts.slice(1).join(' ') || undefined;
    return { action: 'add_expense', amount, note };
  }
  
  // Неизвестная команда
  return {
    action: 'unknown',
    error: `❌ Неизвестная команда.

📋 ДОСТУПНЫЕ КОМАНДЫ:

💰 Управление банком:
  /bank [сумма] - установить баланс
  /bank - показать баланс

💵 Операции:
  +[сумма] [заметка] - добавить прибыль
  -[сумма] [заметка] - общий расход
  /dispute [сумма] [заметка] - закрыть спор

👤 Личные расходы:
  -Z[сумма] [заметка] - вычесть у ZY
  +Z[сумма] [заметка] - добавить к ZY
  -A[сумма] [заметка] - вычесть у AO
  +A[сумма] [заметка] - добавить к AO
  -M[сумма] [заметка] - вычесть у MIO
  +M[сумма] [заметка] - добавить к MIO

📊 Статистика:
  /statistics - общая статистика
  /statistics_income - статистика прибыли
  /statistics_expense - статистика расходов (включая долги и висяк)
  /statistics_disputes - статистика споров
  /statistics_employees - расходы сотрудников
  /history - история операций за 24 часа

Примеры:
  /bank 1000000
  +50000 оплата клиента
  -10000 аренда
  -Z5000 аванс
  +A2000 возврат`
  };
}
