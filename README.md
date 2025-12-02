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

- **Gateway Auth Guard**: Команды доступны только при наличии заголовка с gateway auth token
- **JWT Verification**: JWT верификация всегда включена (требует `JWT_PUBLIC_KEY`)
- **Role-based Authorization**: Проверка прав доступа на основе ролей пользователя
- **CORS**: Настраивается через `CORS_WHITELIST` (если не указан, CORS отключен - безопасно по умолчанию)
- Идемпотентность команд через `idempotencyKey`
- Event Store только append (защита от подделки)

### Настройка JWT верификации

Обязательно укажите `JWT_PUBLIC_KEY` для работы сервиса:

```env
# Формат 1: Base64 (рекомендуется, совместимо с gateway)
JWT_PUBLIC_KEY=b64:LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0K...

# Формат 2: Прямой PEM формат
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----
```

Без этого ключа сервис не запустится. Формат `b64:` автоматически декодируется в PEM формат.

### Настройка CORS

Обязательно укажите `CORS_WHITELIST` для работы через браузер:

```env
CORS_WHITELIST=http://localhost:3000,https://example.com
```

**Важно:** Если переменная не указана или пустая, CORS будет отключен (все origins заблокированы). Это безопасное поведение по умолчанию.

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


