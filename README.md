# Core Service - CQRS Implementation

Core сервис с полной реализацией CQRS (Command Query Responsibility Segregation).

## Архитектура

```
src/
├─ application/          # Application Layer
│  ├─ commands/         # Command handlers, DTOs
│  └─ queries/          # Query handlers, DTOs
├─ domain/              # Domain Layer (чистый, без фреймворков)
│  ├─ entities/         # Aggregate Roots
│  ├─ events/           # Domain Events
│  ├─ repositories/     # Repository interfaces
│  └─ services/         # Domain services
├─ infrastructure/      # Infrastructure Layer
│  ├─ repos/            # Repository implementations
│  ├─ event-store/      # Event Store implementation
│  ├─ read-model/       # Read model projections
│  └─ adapters/         # Redis adapters
└─ presentation/        # Presentation Layer
   ├─ command-controller/
   ├─ query-controller/
   └─ dto/
```

## Технологический стек

- **NestJS 10** - основной фреймворк
- **TypeScript** - язык программирования
- **TypeORM** - для Event Store (write-side)
- **Redis** - для Read Model (read-side + cache)
- **PostgreSQL** - Event Store storage
- **@nestjs/cqrs** - CQRS модуль
- **@nestjs/event-emitter** - внутренний Event Bus для проекций

## Установка

```bash
npm install
```

## Настройка

Скопируйте `.env.example` в `.env` и настройте переменные окружения:

```bash
cp .env.example .env
```

## Запуск

### Development

```bash
npm run start:dev
```

### Production

```bash
npm run build
npm run start:prod
```

## API Endpoints

### Commands (Write-side)

- `POST /accounts` - Создать пользователя
- `PATCH /accounts/:id/approve` - Одобрить пользователя
- `PATCH /accounts/:id/block` - Заблокировать пользователя
- `PATCH /accounts/:id/role` - Выдать роль

### Queries (Read-side)

- `GET /accounts/:id` - Получить пользователя по ID
- `GET /accounts/email/:email` - Получить пользователя по email
- `GET /accounts?limit=100&offset=0` - Список пользователей

### Internal API

- `POST /internal/access-check` - Проверка доступа

## Примеры запросов

### Создать пользователя

```bash
curl -X POST http://localhost:3000/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "plainPassword": "password123",
    "role": "USER"
  }'
```

### Получить пользователя

```bash
curl http://localhost:3000/accounts/{id}
```

## Тестирование

```bash
# Unit тесты
npm run test

# E2E тесты
npm run test:e2e

# Coverage
npm run test:cov
```

## Docker

```bash
docker-compose up -d
```

## Особенности CQRS реализации

1. **Event Store** - все команды порождают домен-события
2. **Read Model** - строится асинхронно через проекторы
3. **Разделение API** - Command и Query контроллеры
4. **Бизнес-логика** - в Aggregate Root и Domain Services
5. **Масштабируемость** - read-side можно масштабировать независимо

## Мониторинг

Метрики:
- `command_duration` - длительность выполнения команд
- `query_duration` - длительность выполнения запросов
- `event_store_lag` - задержка Event Store
- `read_model_lag` - задержка Read Model

## Безопасность

- Команды доступны только при наличии заголовка `X-Gateway-Auth` с секретом, который знает gateway
- Идемпотентность команд через `idempotencyKey`
- Event Store только append (защита от подделки)

## Инициализация первого администратора

При первом запуске с пустой БД необходимо создать первого администратора. 
Используйте TypeORM миграцию:

```bash
# 1. Установите переменные окружения (опционально)
export ADMIN_EMAIL=admin@example.com
export ADMIN_PASSWORD=YourSecurePassword123!
export ADMIN_NAME="System Administrator"

# 2. Выполните миграцию
npm run migration:run
```

Или отредактируйте значения по умолчанию в `src/migrations/1735123456789-CreateInitialAdmin.ts` и выполните миграцию.

Подробные инструкции см. в `scripts/README.md`


