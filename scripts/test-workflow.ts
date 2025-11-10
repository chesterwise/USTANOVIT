import { financeWorkflow } from '../src/mastra/workflows/financeWorkflow';

const TEST_CHAT_ID = "test-chat-123";

async function testCommand(command: string, description: string) {
  console.log(`\n🧪 Тестирование: ${description}`);
  console.log(`📝 Команда: ${command}`);
  
  try {
    const run = await financeWorkflow.createRunAsync();
    const result = await run.start({
      inputData: {
        message: command,
        chatId: TEST_CHAT_ID,
        userId: "test-user-456",
      },
    });

    if (result.status === 'success') {
      const workflowResult = result as any;
      console.log(`✅ ${workflowResult.result.response}\n`);
    } else {
      console.log(`❌ Ошибка: ${JSON.stringify(result)}\n`);
    }
  } catch (error) {
    console.log(`❌ Исключение: ${error}\n`);
  }
}

async function runTests() {
  console.log('🚀 Начинаем тестирование финансового бота\n');
  console.log('=' .repeat(60));

  await testCommand('/start', 'Команда помощи');
  await testCommand('/bank 1000000', 'Установка баланса банка');
  await testCommand('/bank', 'Проверка баланса банка');
  await testCommand('+50000 тест прибыли', 'Добавление прибыли');
  await testCommand('/bank', 'Проверка баланса после прибыли');
  await testCommand('-10000 тест расхода', 'Общий расход');
  await testCommand('/bank', 'Проверка баланса после расхода');
  await testCommand('-Z5000 расход ZY', 'Расход сотрудника ZY');
  await testCommand('-M3000 расход MIO', 'Расход сотрудника MIO');
  await testCommand('-A2000 расход AO', 'Расход сотрудника AO');
  await testCommand('/dispute 1000 спор', 'Закрытие спора');
  await testCommand('/statistics', 'Общая статистика');
  await testCommand('/statistics_income', 'Статистика прибыли');
  await testCommand('/statistics_expense', 'Статистика расходов');
  await testCommand('/statistics_disputes', 'Статистика споров');
  await testCommand('/statistics_employees', 'Расходы сотрудников');

  console.log('=' .repeat(60));
  console.log('\n🎉 Тестирование завершено!\n');
}

runTests().catch(console.error);
