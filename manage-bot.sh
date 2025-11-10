#!/bin/bash

################################################################################
# УПРАВЛЕНИЕ FINANCE BOT
################################################################################

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_header() {
    echo -e "${BLUE}=========================================="
    echo -e "$1"
    echo -e "==========================================${NC}"
}

show_menu() {
    clear
    print_header "🤖 Finance Bot - Управление"
    echo ""
    echo "1) 📊 Показать статус"
    echo "2) 📝 Показать логи"
    echo "3) 🔄 Перезапустить бота"
    echo "4) 🛑 Остановить бота"
    echo "5) ▶️  Запустить бота"
    echo "6) 🔗 Настроить Telegram webhook"
    echo "7) 🔗 Показать URL Cloudflare Tunnel"
    echo "8) 📥 Обновить бота из Git"
    echo "9) ⚙️  Редактировать .env"
    echo "0) 🚪 Выход"
    echo ""
    read -p "Выберите действие: " choice
    echo ""
}

show_status() {
    print_header "📊 Статус служб"
    echo ""
    print_info "PM2 процессы:"
    pm2 list
    echo ""
    print_info "Cloudflare Tunnel:"
    systemctl status cloudflare-tunnel --no-pager | head -10
}

show_logs() {
    print_header "📝 Логи"
    echo ""
    echo "1) Логи PM2 (все процессы)"
    echo "2) Логи finance-bot"
    echo "3) Логи inngest-server"
    echo "4) Логи Cloudflare Tunnel"
    echo "0) Назад"
    echo ""
    read -p "Выберите: " log_choice
    
    case $log_choice in
        1) pm2 logs ;;
        2) pm2 logs finance-bot ;;
        3) pm2 logs inngest-server ;;
        4) journalctl -u cloudflare-tunnel -f ;;
        0) return ;;
        *) print_error "Неверный выбор" ;;
    esac
}

restart_bot() {
    print_info "Перезапуск бота..."
    pm2 restart all
    print_success "Бот перезапущен!"
    sleep 2
}

stop_bot() {
    print_info "Остановка бота..."
    pm2 stop all
    print_success "Бот остановлен!"
    sleep 2
}

start_bot() {
    print_info "Запуск бота..."
    pm2 start all
    print_success "Бот запущен!"
    sleep 2
}

setup_webhook() {
    print_info "Настройка Telegram webhook..."
    bash setup-telegram-webhook.sh
    echo ""
    read -p "Нажмите Enter для продолжения..."
}

show_tunnel_url() {
    print_header "🔗 Cloudflare Tunnel URL"
    TUNNEL_URL=$(journalctl -u cloudflare-tunnel -n 100 --no-pager 2>/dev/null | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)
    
    if [ -z "$TUNNEL_URL" ]; then
        print_error "URL не найден. Убедитесь, что Cloudflare Tunnel запущен."
    else
        print_success "Tunnel URL: $TUNNEL_URL"
        print_info "Webhook URL: ${TUNNEL_URL}/api/telegram/webhook"
    fi
    echo ""
    read -p "Нажмите Enter для продолжения..."
}

update_bot() {
    print_header "📥 Обновление бота"
    print_info "Остановка бота..."
    pm2 stop all
    
    print_info "Получение обновлений из Git..."
    git pull
    
    print_info "Установка зависимостей..."
    npm install
    
    if grep -q '"build"' package.json; then
        print_info "Сборка проекта..."
        npm run build
    fi
    
    print_info "Запуск бота..."
    pm2 start all
    
    print_success "Бот обновлён и перезапущен!"
    echo ""
    read -p "Нажмите Enter для продолжения..."
}

edit_env() {
    print_info "Открываем .env в редакторе..."
    nano .env
    print_info "После изменения .env перезапустите бота (опция 3)"
    echo ""
    read -p "Нажмите Enter для продолжения..."
}

# Основной цикл
while true; do
    show_menu
    
    case $choice in
        1) show_status ; read -p "Нажмите Enter для продолжения..." ;;
        2) show_logs ;;
        3) restart_bot ;;
        4) stop_bot ;;
        5) start_bot ;;
        6) setup_webhook ;;
        7) show_tunnel_url ;;
        8) update_bot ;;
        9) edit_env ;;
        0) print_success "До свидания!" ; exit 0 ;;
        *) print_error "Неверный выбор" ; sleep 1 ;;
    esac
done
