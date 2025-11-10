#!/bin/bash

################################################################################
# АВТОМАТИЧЕСКАЯ НАСТРОЙКА TELEGRAM WEBHOOK С CLOUDFLARE TUNNEL
################################################################################

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

echo "=========================================="
echo "🔗 Настройка Telegram Webhook"
echo "=========================================="

# Загрузка переменных окружения
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    print_success "Переменные окружения загружены из .env"
else
    print_error "Файл .env не найден!"
    exit 1
fi

# Проверка TELEGRAM_BOT_TOKEN
if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ "$TELEGRAM_BOT_TOKEN" == "your_telegram_bot_token_here" ]; then
    print_error "TELEGRAM_BOT_TOKEN не настроен в .env файле"
    exit 1
fi

print_success "TELEGRAM_BOT_TOKEN найден"

# Получение URL Cloudflare Tunnel
print_info "Получение URL Cloudflare Tunnel..."

# Пробуем получить URL из логов systemd
TUNNEL_URL=$(journalctl -u cloudflare-tunnel -n 100 --no-pager 2>/dev/null | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)

if [ -z "$TUNNEL_URL" ]; then
    # Если не получилось через systemd, пробуем через pm2
    print_info "Не найден в systemd логах, проверяем PM2..."
    TUNNEL_URL=$(pm2 logs cloudflare-tunnel --nostream --lines 100 2>/dev/null | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)
fi

if [ -z "$TUNNEL_URL" ]; then
    print_error "Не удалось найти URL Cloudflare Tunnel"
    print_info "Убедитесь, что Cloudflare Tunnel запущен:"
    print_info "  systemctl status cloudflare-tunnel"
    print_info "  или"
    print_info "  pm2 logs"
    exit 1
fi

print_success "Найден Cloudflare Tunnel URL: $TUNNEL_URL"

# Формирование webhook URL
WEBHOOK_URL="${TUNNEL_URL}/api/telegram/webhook"
print_info "Webhook URL: $WEBHOOK_URL"

# Настройка webhook в Telegram
print_info "Настройка webhook в Telegram..."

RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"${WEBHOOK_URL}\"}")

# Проверка результата
if echo "$RESPONSE" | grep -q '"ok":true'; then
    print_success "Webhook успешно настроен!"
    echo ""
    print_info "Детали:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    echo ""
    print_success "Telegram бот готов к работе!"
    print_info "Отправьте сообщение вашему боту в Telegram для проверки"
else
    print_error "Ошибка при настройке webhook:"
    echo "$RESPONSE"
    exit 1
fi

# Получение информации о webhook
print_info "Информация о webhook:"
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo" | python3 -m json.tool 2>/dev/null

echo ""
print_success "Готово! 🎉"
