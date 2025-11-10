#!/bin/bash

################################################################################
# СКРИПТ УПРАВЛЕНИЯ FINANCE BOT
# Удобное управление ботом одной командой
################################################################################

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

print_header() {
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
}

show_help() {
    print_header "Finance Bot - Управление"
    echo ""
    echo "Использование: ./bot-manager.sh [команда]"
    echo ""
    echo "Команды:"
    echo "  start       - Запустить бота"
    echo "  stop        - Остановить бота"
    echo "  restart     - Перезапустить бота"
    echo "  status      - Показать статус бота"
    echo "  logs        - Показать логи бота (Ctrl+C для выхода)"
    echo "  logs-tail   - Показать последние 100 строк логов"
    echo "  edit-env    - Редактировать файл .env"
    echo "  install     - Установить/переустановить бота"
    echo "  uninstall   - Удалить бота"
    echo "  help        - Показать эту справку"
    echo ""
}

check_service() {
    if ! systemctl list-unit-files | grep -q finance-bot.service; then
        print_error "Сервис finance-bot не установлен!"
        print_info "Запустите: ./install-simple.sh"
        exit 1
    fi
}

bot_start() {
    print_info "Запуск бота..."
    systemctl start finance-bot
    sleep 2
    if systemctl is-active --quiet finance-bot; then
        print_success "Бот запущен!"
        systemctl status finance-bot --no-pager -l | head -10
    else
        print_error "Не удалось запустить бота. Проверьте логи: ./bot-manager.sh logs"
    fi
}

bot_stop() {
    print_info "Остановка бота..."
    systemctl stop finance-bot
    sleep 1
    if systemctl is-active --quiet finance-bot; then
        print_error "Не удалось остановить бота"
    else
        print_success "Бот остановлен!"
    fi
}

bot_restart() {
    print_info "Перезапуск бота..."
    systemctl restart finance-bot
    sleep 2
    if systemctl is-active --quiet finance-bot; then
        print_success "Бот перезапущен!"
        systemctl status finance-bot --no-pager -l | head -10
    else
        print_error "Не удалось перезапустить бота. Проверьте логи: ./bot-manager.sh logs"
    fi
}

bot_status() {
    print_header "Статус бота"
    echo ""
    if systemctl is-active --quiet finance-bot; then
        print_success "Бот работает!"
    else
        print_error "Бот не работает!"
    fi
    echo ""
    systemctl status finance-bot --no-pager -l
}

bot_logs() {
    print_info "Просмотр логов бота (Ctrl+C для выхода)..."
    echo ""
    journalctl -u finance-bot -f
}

bot_logs_tail() {
    print_header "Последние 100 строк логов"
    echo ""
    journalctl -u finance-bot -n 100 --no-pager
}

bot_edit_env() {
    PROJECT_DIR="/root/finance-bot"
    if [ -f "$PROJECT_DIR/.env" ]; then
        print_info "Открываю файл .env для редактирования..."
        nano "$PROJECT_DIR/.env"
        echo ""
        read -p "Перезапустить бота для применения изменений? (y/n): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            bot_restart
        else
            print_info "Не забудьте перезапустить бота: ./bot-manager.sh restart"
        fi
    else
        print_error "Файл .env не найден в $PROJECT_DIR"
    fi
}

bot_install() {
    if [ -f "./install-simple.sh" ]; then
        print_info "Запуск установки..."
        bash ./install-simple.sh
    else
        print_error "Скрипт install-simple.sh не найден!"
    fi
}

bot_uninstall() {
    print_header "Удаление бота"
    echo ""
    print_error "⚠️  ВНИМАНИЕ: Это удалит бота и его конфигурацию!"
    read -p "Вы уверены? (введите YES для подтверждения): " confirmation
    
    if [ "$confirmation" = "YES" ]; then
        print_info "Остановка бота..."
        systemctl stop finance-bot 2>/dev/null || true
        
        print_info "Отключение автозапуска..."
        systemctl disable finance-bot 2>/dev/null || true
        
        print_info "Удаление сервиса..."
        rm -f /etc/systemd/system/finance-bot.service
        
        print_info "Перезагрузка systemd..."
        systemctl daemon-reload
        
        print_success "Бот удалён!"
        print_info "Файлы проекта остались в /root/finance-bot"
        print_info "Для полного удаления: rm -rf /root/finance-bot"
    else
        print_info "Отменено"
    fi
}

# Главная логика
case "$1" in
    start)
        check_service
        bot_start
        ;;
    stop)
        check_service
        bot_stop
        ;;
    restart)
        check_service
        bot_restart
        ;;
    status)
        check_service
        bot_status
        ;;
    logs)
        check_service
        bot_logs
        ;;
    logs-tail)
        check_service
        bot_logs_tail
        ;;
    edit-env)
        bot_edit_env
        ;;
    install)
        bot_install
        ;;
    uninstall)
        bot_uninstall
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        print_error "Неизвестная команда: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
