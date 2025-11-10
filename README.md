# Telegram Finance Bot

Финансовый бот для Telegram с поддержкой групповых чатов.

## Особенности

- ✅ **Без OpenAI API** - работает на чистом парсере команд
- 👥 **Групповые чаты** - все участники видят транзакции в реальном времени
- 💾 **База данных** - PostgreSQL или SQLite
- 🚀 **Простое развертывание** - один скрипт установки

## Команды бота

```
/start - Приветствие
/help - Справка
/bank - Баланс банка

+100 примечание - Доход
-50 примечание - Расход

-Z 30 - Расход ZY
-M 20 - Расход MIO  
-A 15 - Расход AO

/statistics - Статистика
/statisticsdetail - Детальная статистика
/statisticsemployee - По сотрудникам
/statisticsdaily - За день
/statisticsweekly - За неделю
/statisticsmonthly - За месяц

/dispute - Оспорить транзакцию
```

## Установка на Timeweb

См. файл `TIMEWEB_QUICK_INSTALL.txt`

```bash
ssh root@YOUR_IP
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git
git clone https://github.com/your-username/telegram-finance-bot.git
cd telegram-finance-bot
npm install
npm install -g pm2
# Создайте .env с TELEGRAM_BOT_TOKEN
npm run build
pm2 start ecosystem.config.cjs
```

## Требования

- Node.js 20+
- PostgreSQL (или SQLite для разработки)
- Telegram Bot Token от @BotFather

## Структура

```
src/
├── mastra/
│   ├── agents/        # Минимальный агент (не используется)
│   ├── tools/         # financeTool - операции с БД
│   ├── workflows/     # financeWorkflow - обработка команд
│   └── utils/         # commandParser - парсинг команд
├── triggers/          # Telegram webhook
└── shared/            # База данных (Drizzle ORM)
```

## Лицензия

MIT
