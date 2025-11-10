#!/bin/bash

################################################################################
# АВТОМАТИЧЕСКАЯ УСТАНОВКА FINANCE BOT НА TIMEWEB С CLOUDFLARE TUNNEL
################################################################################

set -e

echo "=========================================="
echo "🚀 Начинаем установку Finance Bot"
echo "=========================================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Функции для красивого вывода
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
    print_error "Пожалуйста, запустите скрипт от root (sudo bash install-timeweb.sh)"
    exit 1
fi

print_success "Скрипт запущен от root"

# Определяем директорию проекта
PROJECT_DIR="/root/finance-bot"
print_info "Директория проекта: $PROJECT_DIR"

################################################################################
# ШАГ 1: Обновление системы
################################################################################
print_info "Обновление системы..."
apt update -y
apt upgrade -y
print_success "Система обновлена"

################################################################################
# ШАГ 2: Установка Node.js 20
################################################################################
print_info "Установка Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    print_success "Node.js установлен"
else
    NODE_VERSION=$(node -v)
    print_success "Node.js уже установлен: $NODE_VERSION"
fi

################################################################################
# ШАГ 3: Установка базовых утилит
################################################################################
print_info "Установка базовых утилит..."
apt install -y git curl wget nano
print_success "Утилиты установлены"

################################################################################
# ШАГ 4: Установка Cloudflare Tunnel
################################################################################
print_info "Установка Cloudflare Tunnel (cloudflared)..."
if ! command -v cloudflared &> /dev/null; then
    # Скачиваем и устанавливаем cloudflared
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    dpkg -i cloudflared-linux-amd64.deb
    rm cloudflared-linux-amd64.deb
    print_success "Cloudflare Tunnel установлен"
else
    print_success "Cloudflare Tunnel уже установлен"
fi

################################################################################
# ШАГ 5: Настройка директории проекта
################################################################################
if [ -d "$PROJECT_DIR" ]; then
    print_info "Директория проекта уже существует"
    read -p "Удалить и создать заново? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$PROJECT_DIR"
        print_info "Старая директория удалена"
    fi
fi

# Если мы находимся в директории с проектом, используем её
CURRENT_DIR=$(pwd)
if [ -f "$CURRENT_DIR/package.json" ] && [ -f "$CURRENT_DIR/ecosystem.config.cjs" ]; then
    print_info "Обнаружен проект в текущей директории: $CURRENT_DIR"
    if [ "$CURRENT_DIR" != "$PROJECT_DIR" ]; then
        print_info "Копируем проект в $PROJECT_DIR..."
        mkdir -p "$PROJECT_DIR"
        cp -r "$CURRENT_DIR"/* "$PROJECT_DIR/"
        print_success "Проект скопирован"
    fi
else
    # Если проекта нет, спрашиваем у пользователя
    print_info "Проект не обнаружен в текущей директории"
    read -p "Введите URL Git репозитория (или нажмите Enter, чтобы пропустить): " GIT_URL
    
    if [ ! -z "$GIT_URL" ]; then
        print_info "Клонируем репозиторий..."
        git clone "$GIT_URL" "$PROJECT_DIR"
        print_success "Репозиторий клонирован"
    else
        print_error "Репозиторий не указан. Создайте проект в $PROJECT_DIR вручную"
        exit 1
    fi
fi

cd "$PROJECT_DIR"
print_success "Перешли в директорию проекта: $PROJECT_DIR"

################################################################################
# ШАГ 6: Настройка переменных окружения
################################################################################
print_info "Настройка переменных окружения..."

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success "Создан файл .env из .env.example"
    else
        cat > .env << 'EOF'
# Telegram Bot Token
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Environment
NODE_ENV=production

# Port
PORT=5000

# Node.js Memory Limit (увеличиваем лимит памяти)
NODE_OPTIONS=--max-old-space-size=1024

# OpenAI API Key (если требуется)
OPENAI_API_KEY=your_openai_api_key_here
EOF
        print_success "Создан файл .env"
    fi
    
    print_info "============================================"
    print_info "ВАЖНО! Настройте .env файл:"
    echo ""
    read -p "Введите TELEGRAM_BOT_TOKEN: " BOT_TOKEN
    if [ ! -z "$BOT_TOKEN" ]; then
        sed -i "s/your_telegram_bot_token_here/$BOT_TOKEN/" .env
        print_success "TELEGRAM_BOT_TOKEN установлен"
    fi
    
    read -p "Введите OPENAI_API_KEY (или нажмите Enter, чтобы пропустить): " OPENAI_KEY
    if [ ! -z "$OPENAI_KEY" ]; then
        sed -i "s/your_openai_api_key_here/$OPENAI_KEY/" .env
        print_success "OPENAI_API_KEY установлен"
    fi
    
    print_info "Вы можете отредактировать .env позже: nano $PROJECT_DIR/.env"
else
    print_success "Файл .env уже существует"
fi

################################################################################
# ШАГ 7: Установка зависимостей
################################################################################
print_info "Установка npm зависимостей..."
npm install
print_success "Зависимости установлены"

print_info "Установка PM2 глобально..."
npm install -g pm2
print_success "PM2 установлен"

################################################################################
# ШАГ 8: Сборка проекта
################################################################################
print_info "Сборка проекта..."
if grep -q '"build"' package.json; then
    # Увеличиваем лимит памяти для сборки
    export NODE_OPTIONS="--max-old-space-size=2048"
    npm run build
    print_success "Проект собран"
    unset NODE_OPTIONS
else
    print_info "Команда build не найдена, пропускаем"
fi

################################################################################
# ШАГ 9: Создание директории для логов
################################################################################
mkdir -p logs
print_success "Директория logs создана"

################################################################################
# ШАГ 10: Настройка Cloudflare Tunnel
################################################################################
print_info "============================================"
print_info "Настройка Cloudflare Tunnel"
print_info "============================================"

# Создаём systemd сервис для Cloudflare Tunnel
cat > /etc/systemd/system/cloudflare-tunnel.service << 'EOF'
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/finance-bot
ExecStart=/usr/bin/cloudflared tunnel --no-autoupdate --url http://localhost:3001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

print_success "Создан systemd сервис для Cloudflare Tunnel"

# Запускаем туннель
systemctl daemon-reload
systemctl enable cloudflare-tunnel
systemctl start cloudflare-tunnel

print_success "Cloudflare Tunnel запущен"
print_info "Чтобы увидеть URL туннеля, выполните: journalctl -u cloudflare-tunnel -f"

################################################################################
# ШАГ 11: Запуск приложения с PM2
################################################################################
print_info "Запуск приложения с PM2..."

# Останавливаем существующие процессы, если они есть
pm2 delete all 2>/dev/null || true

# Запускаем приложение
if [ -f "ecosystem.config.cjs" ]; then
    pm2 start ecosystem.config.cjs
    print_success "Приложение запущено через ecosystem.config.cjs"
else
    # Fallback: запускаем напрямую
    pm2 start "npm run dev" --name "finance-bot"
    print_success "Приложение запущено напрямую"
fi

# Сохраняем список процессов PM2
pm2 save

# Настраиваем автозапуск PM2
pm2 startup systemd -u root --hp /root
print_success "PM2 настроен на автозапуск"

################################################################################
# ШАГ 12: Проверка статуса
################################################################################
print_info "============================================"
print_info "Проверка статуса служб..."
print_info "============================================"

echo ""
print_info "PM2 процессы:"
pm2 list

echo ""
print_info "Статус Cloudflare Tunnel:"
systemctl status cloudflare-tunnel --no-pager | head -10

################################################################################
# ЗАВЕРШЕНИЕ
################################################################################
echo ""
print_success "============================================"
print_success "🎉 УСТАНОВКА ЗАВЕРШЕНА!"
print_success "============================================"
echo ""
print_info "Полезные команды:"
echo ""
echo "📊 Просмотр логов PM2:"
echo "   pm2 logs"
echo ""
echo "📊 Просмотр логов Cloudflare Tunnel:"
echo "   journalctl -u cloudflare-tunnel -f"
echo ""
echo "🔄 Перезапуск бота:"
echo "   pm2 restart all"
echo ""
echo "🛑 Остановка бота:"
echo "   pm2 stop all"
echo ""
echo "📝 Редактирование .env:"
echo "   nano $PROJECT_DIR/.env"
echo ""
echo "🔗 Получение URL Cloudflare Tunnel:"
echo "   journalctl -u cloudflare-tunnel | grep trycloudflare.com"
echo ""
print_info "Cloudflare Tunnel URL будет в формате: https://xxxxx.trycloudflare.com"
print_info "Используйте этот URL для настройки вебхука Telegram"
echo ""
print_success "Готово! Ваш бот запущен 🚀"
