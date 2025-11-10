# 🚀 Быстрая установка на Timeweb

## Шаг 1: Подготовка сервера

```bash
# Подключитесь к серверу Timeweb
ssh root@ваш-ip

# Создайте директорию проекта
mkdir -p /root/finance-bot
cd /root/finance-bot
```

## Шаг 2: Загрузка проекта

Загрузите все файлы проекта на сервер (через git, scp или ftp).

## Шаг 3: Установка зависимостей

```bash
# Установите Node.js 20+ и PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2

# Установите зависимости проекта
npm install
```

## Шаг 4: Настройка переменных окружения

```bash
# Создайте .env файл
nano .env
```

Добавьте:
```
TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather
NODE_ENV=development
PORT=5000
INNGEST_EVENT_KEY=dev
INNGEST_SIGNING_KEY=dev
INNGEST_DEV_SERVER=true
```

Сохраните (Ctrl+O, Enter, Ctrl+X).

## Шаг 5: Установка Cloudflare Tunnel (для HTTPS)

```bash
# Скачайте cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared-linux-amd64.deb

# Авторизуйтесь
cloudflared tunnel login

# Создайте туннель
cloudflared tunnel create finance-bot

# Создайте конфигурацию
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Добавьте:
```yaml
tunnel: finance-bot
credentials-file: /root/.cloudflared/ВАШ-UUID.json

ingress:
  - hostname: ваш-домен.com
    service: http://localhost:5000
  - service: http_status:404
```

```bash
# Создайте DNS запись
cloudflared tunnel route dns finance-bot ваш-домен.com

# Запустите как сервис
cloudflared service install
systemctl start cloudflared
systemctl enable cloudflared
```

## Шаг 6: Запуск бота

```bash
cd /root/finance-bot

# Создайте директорию для логов
mkdir -p logs

# Запустите через PM2
pm2 start ecosystem.config.cjs

# Проверьте статус
pm2 status

# Смотрите логи
pm2 logs
```

## Шаг 7: Настройка вебхука Telegram

```bash
# Замените на ваши данные
TELEGRAM_BOT_TOKEN="ваш_токен"
WEBHOOK_URL="https://ваш-домен.com/webhooks/telegram/action"

curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"${WEBHOOK_URL}\"}"
```

## ✅ Готово!

Теперь отправьте `/statistics` вашему боту в Telegram.

## 🔧 Полезные команды

```bash
# Перезапуск
pm2 restart all

# Остановка
pm2 stop all

# Логи в реальном времени
pm2 logs

# Автозапуск при перезагрузке сервера
pm2 startup
pm2 save

# Удаление из автозапуска
pm2 unstartup systemd
```

## 🐛 Решение проблем

### Бот не отвечает

```bash
# Проверьте логи
pm2 logs finance-bot

# Проверьте статус
pm2 status

# Перезапустите
pm2 restart all
```

### Ошибка 401

Проверьте, что в `.env` есть:
```
NODE_ENV=development
INNGEST_EVENT_KEY=dev
INNGEST_SIGNING_KEY=dev
```

### Нехватка памяти

Увеличьте лимит в `ecosystem.config.cjs`:
```javascript
max_memory_restart: '2048M',
node_args: '--max-old-space-size=2048',
```
