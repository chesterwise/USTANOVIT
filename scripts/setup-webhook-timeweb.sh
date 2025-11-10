#!/bin/bash

# Скрипт для настройки Telegram webhook на Timeweb VPS

echo "🔧 Настройка Telegram webhook для Timeweb VPS..."
echo ""

# Проверяем наличие .env файла
if [ ! -f .env ]; then
    echo "❌ Ошибка: Файл .env не найден"
    echo "Создайте файл .env с вашим TELEGRAM_BOT_TOKEN"
    exit 1
fi

# Загружаем переменные из .env
source .env

# Проверяем наличие TELEGRAM_BOT_TOKEN
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ Ошибка: TELEGRAM_BOT_TOKEN не установлен в .env"
    exit 1
fi

# Запрашиваем IP адрес или домен сервера
if [ -z "$1" ]; then
    echo "📍 Введите IP адрес или домен вашего сервера:"
    echo "   Например: 185.xxx.xxx.xxx или bot.example.com"
    read -p "Сервер: " SERVER_ADDRESS
else
    SERVER_ADDRESS=$1
fi

# Формируем webhook URL
# Используем HTTPS (требование Telegram)
WEBHOOK_URL="https://${SERVER_ADDRESS}/webhooks/telegram/action"

echo ""
echo "📍 Webhook URL: $WEBHOOK_URL"
echo ""

# Устанавливаем webhook
echo "📤 Отправка запроса в Telegram..."
RESPONSE=$(curl -s -X POST \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"${WEBHOOK_URL}\"}")

echo "📤 Ответ Telegram:"
echo "$RESPONSE"
echo ""

# Проверяем результат
if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Webhook успешно настроен!"
    echo ""
    
    # Получаем информацию о боте
    echo "🤖 Информация о боте:"
    BOT_INFO=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe")
    echo "$BOT_INFO"
    echo ""
    
    # Получаем имя бота
    BOT_USERNAME=$(echo "$BOT_INFO" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$BOT_USERNAME" ]; then
        echo "🎉 Готово! Ваш бот готов к работе."
        echo "📱 Найдите бота в Telegram: @${BOT_USERNAME}"
        echo "💬 Отправьте команду /start для начала работы"
    fi
else
    echo "❌ Ошибка при настройке webhook"
    echo "Проверьте правильность TELEGRAM_BOT_TOKEN"
fi

echo ""
echo "🔍 Проверка статуса webhook..."
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo" | python3 -m json.tool 2>/dev/null || echo "Установите jq для красивого вывода: apt install jq"
