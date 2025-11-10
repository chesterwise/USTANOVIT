@echo off
REM Скрипт для настройки Telegram webhook на Windows

echo.
echo ====================================
echo   Настройка Telegram Webhook
echo ====================================
echo.

REM Проверка наличия TELEGRAM_BOT_TOKEN
if "%TELEGRAM_BOT_TOKEN%"=="" (
    echo [ERROR] TELEGRAM_BOT_TOKEN не установлен!
    echo.
    echo Установите переменную окружения:
    echo   set TELEGRAM_BOT_TOKEN=ваш_токен
    echo.
    echo Или добавьте в .env файл
    echo.
    pause
    exit /b 1
)

REM Запрос URL webhook
echo Введите публичный URL вашего сервера
echo Примеры:
echo   - https://abc123.ngrok.io
echo   - http://123.45.67.89:5000
echo.
set /p SERVER_URL="Введите URL: "

if "%SERVER_URL%"=="" (
    echo [ERROR] URL не может быть пустым!
    pause
    exit /b 1
)

REM Формирование webhook URL
set WEBHOOK_URL=%SERVER_URL%/webhooks/telegram/action

echo.
echo Webhook URL: %WEBHOOK_URL%
echo.
echo Отправка запроса в Telegram...
echo.

REM Отправка запроса на установку webhook
curl -X POST "https://api.telegram.org/bot%TELEGRAM_BOT_TOKEN%/setWebhook" ^
  -H "Content-Type: application/json" ^
  -d "{\"url\":\"%WEBHOOK_URL%\"}"

echo.
echo.
echo ====================================
echo   Проверка статуса webhook
echo ====================================
echo.

REM Получение информации о webhook
curl -s "https://api.telegram.org/bot%TELEGRAM_BOT_TOKEN%/getWebhookInfo"

echo.
echo.
echo ====================================
echo   Информация о боте
echo ====================================
echo.

REM Получение информации о боте
curl -s "https://api.telegram.org/bot%TELEGRAM_BOT_TOKEN%/getMe"

echo.
echo.
echo [OK] Настройка завершена!
echo.
echo Теперь попробуйте написать боту в Telegram:
echo   1. Найдите бота по username
echo   2. Отправьте /start
echo   3. Попробуйте команду /bank 100000
echo.
pause
