# Overview

Telegram финансовый бот на TypeScript. Полностью работает БЕЗ OpenAI API - только парсер команд.

**Особенность:** Работает в групповых чатах Telegram - все участники видят транзакции в реальном времени.

**Изоляция данных:** 
- ✅ Все данные (баланс, транзакции, статистика) изолированы по `chatId` (ID группы)
- ✅ **ВСЕ участники ОДНОЙ группы видят ОДИНАКОВЫЕ данные**
- ✅ Разные группы НЕ видят данные друг друга
- ✅ НЕ используется фильтрация по `userId` - данные общие для группы!

Развертывание: VPS (Timeweb, любой другой), PostgreSQL/SQLite, Node.js 20+

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Framework
- **Framework**: Mastra (TypeScript agent framework) - provides workflow orchestration, agents, and tools
- **Runtime**: Node.js 20+ with ES2022 modules
- **Language**: TypeScript with strict mode enabled

## Command Processing
- **Parser**: Парсер команд (`src/mastra/utils/commandParser.ts`) - БЕЗ AI/API
- **Работа**: Прямое распознавание текста
- Команды: `/bank`, `+сумма`, `-сумма`, `-Z/-M/-A`, `/dispute`, `/statistics*`

## Database Layer
- **ORM**: Drizzle ORM with dual-database support
- **Primary Storage**: PostgreSQL (for production)
- **Fallback**: LibSQL/SQLite (for development when DATABASE_URL not set)
- **Schema Strategy**: Conditional schema definition based on database type (pg-core vs sqlite-core)
- **Tables**:
  - `transactions`: Financial records with chat_id, type, amount, employee, note, user_name
  - `bank_balance`: Per-chat balance tracking
  - `user_states`: User interaction state management for multi-step flows

## Bot Interface
- **Platform**: Telegram Bot API
- **Integration**: Webhook-based (not polling)
- **Webhook Path**: `/webhooks/telegram/action`
- **Chat Types**:
  - **Групповые чаты** (основной режим работы) - все участники видят сообщения
  - Личные чаты - индивидуальное использование
  - Изоляция данных по chatId - каждая группа имеет свою базу
- **Interaction Modes**:
  - Text commands (via custom parser)
  - Interactive buttons (inline keyboards for menus)
  - Callback queries for button interactions
  - Multi-step conversations with state management
- **Real-time Notifications**: Все участники группы мгновенно видят уведомления о транзакциях

## Workflow Engine
- **Engine**: Inngest workflows via Mastra
- **Purpose**: Process financial operations as typed, validated workflows
- **Features**: 
  - Step-based execution with suspend/resume capability
  - Input/output validation with Zod schemas
  - State persistence for human-in-the-loop operations
- **Key Workflow**: `financeWorkflow` - handles all bot commands

## State Management
- **Pattern**: Database-backed user state tracking
- **Storage**: `user_states` table
- **Use Cases**: Multi-step operations (expense entry, employee management)
- **State Clearing**: Automatic cleanup after operation completion

## Application Structure
- **Entry**: `src/mastra/index.ts`
- **Agent**: `financeAgent` - минимальный (не используется, только для совместимости)
- **Tool**: `financeTool` - операции с БД
- **Trigger**: `telegramTriggers.ts` - webhook Telegram
- **Utils**: парсер команд, кнопки, состояния

## Data Validation
- **Library**: Zod for runtime type checking
- **Scope**: Workflow inputs/outputs, command parameters, database schemas

## Logging
- **Library**: Pino logger via Mastra
- **Configuration**: Production-optimized JSON logging with ISO timestamps
- **Levels**: Debug, Info, Error

## Deployment Strategy
- **Bundler**: Mastra build system (uses esbuild internally)
- **Commands**:
  - `npm run dev`: Development server with hot reload
  - `npm run build`: Production bundle generation
- **Process Management**: PM2 recommended for production (24/7 uptime)
  - Configuration file: `ecosystem.config.cjs` (CommonJS format due to ES modules in project)
- **Environment**: Requires `TELEGRAM_BOT_TOKEN` and optional `DATABASE_URL`

# External Dependencies

## Third-Party Services

### Telegram Bot API
- **Purpose**: Primary user interface
- **Authentication**: Bot token from @BotFather
- **Configuration**: `TELEGRAM_BOT_TOKEN` environment variable
- **Setup**: Webhook must be configured pointing to `/webhooks/telegram/action`
- **API Calls**: sendMessage

### PostgreSQL Database
- **Purpose**: Primary data persistence
- **Version**: 14+
- **Connection**: Via `DATABASE_URL` environment variable
- **Driver**: node-postgres (pg) package
- **Fallback**: If DATABASE_URL not set, uses local SQLite file (`finance.db`)

### LibSQL/SQLite
- **Purpose**: Development/fallback database
- **Client**: `@libsql/client`
- **Storage**: File-based (`file:./finance.db`)
- **Use Case**: Local development when PostgreSQL unavailable

## NPM Packages

### Core Framework
- `@mastra/core`: Agent and workflow framework
- `@mastra/inngest`: Inngest workflow integration
- `@mastra/pg`: PostgreSQL integration for Mastra
- `@mastra/libsql`: LibSQL/SQLite integration
- `@mastra/loggers`: Logging infrastructure
- `inngest`: Background workflow execution engine

### Database & Validation
- `drizzle-orm`: Type-safe ORM
- `drizzle-kit`: Schema migrations
- `pg`: PostgreSQL client
- `@libsql/client`: SQLite client
- `zod`: Schema validation

### Utilities
- `dotenv`: Environment variable management
- `form-data`: Multipart form handling
- `tsx`: TypeScript execution
- `typescript`: TypeScript compiler

### Development Tools
- `mastra`: CLI for development server
- `prettier`: Code formatting
- `ts-node`: TypeScript execution (dev)

## Неиспользуемые зависимости
- OpenAI SDK - НЕ нужен (агент не используется)
- Slack, Exa, MCP, PDF - не используются