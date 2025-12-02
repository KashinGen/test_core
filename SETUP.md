# Инструкция по настройке

## 1. Установка зависимостей

```bash
npm install
```

## 2. Настройка переменных окружения

Создайте файл `.env` в корне проекта со следующим содержимым:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=core_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Application
PORT=3000
NODE_ENV=development
GATEWAY_AUTH_TOKEN=super-secret-token

# JWT Configuration
# JWT_PUBLIC_KEY - публичный ключ для верификации JWT (обязательно!)
# Формат: b64:<base64_encoded_key> или прямой PEM формат
# Пример: JWT_PUBLIC_KEY=b64:LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0K...
# Или: JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----
JWT_PUBLIC_KEY=

# CORS Configuration
# CORS_WHITELIST - список разрешенных origins через запятую (обязательно!)
# Если не указан, CORS будет отключен (все origins заблокированы)
# Пример: CORS_WHITELIST=http://localhost:3000,https://example.com
CORS_WHITELIST=http://localhost:3000
```

## 3. Запуск инфраструктуры через Docker

```bash
docker-compose up -d
```

Это запустит:
- PostgreSQL (порт 5432)
- Redis (порт 6379)

## 4. Запуск приложения

### Development режим:
```bash
npm run start:dev
```

### Production режим:
```bash
npm run build
npm run start:prod
```

## 5. Проверка работы

После запуска приложение будет доступно на `http://localhost:3000`

### Пример создания пользователя:

```bash
curl -X POST http://localhost:3000/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "plainPassword": "password123",
    "role": "USER"
  }'
```

### Пример получения пользователя:

```bash
curl http://localhost:3000/accounts/{id}
```

## Структура проекта

```
src/
├─ application/          # Application Layer
│  ├─ commands/         # Command handlers
│  └─ queries/          # Query handlers
├─ domain/              # Domain Layer
│  ├─ entities/         # Aggregate Roots
│  ├─ events/           # Domain Events
│  ├─ repositories/     # Repository interfaces
│  └─ services/         # Domain services
├─ infrastructure/      # Infrastructure Layer
│  ├─ repos/            # Repository implementations
│  ├─ event-store/      # Event Store
│  ├─ read-model/       # Read model projections
│  └─ adapters/         # Redis adapters
└─ presentation/        # Presentation Layer
   ├─ command-controller/
   ├─ query-controller/
   └─ dto/
```

## Особенности реализации

1. **Event Store** - все команды сохраняют события в PostgreSQL
2. **Read Model** - проекторы обновляют Redis асинхронно через EventEmitter2
3. **CQRS** - четкое разделение команд и запросов
4. **Domain-Driven Design** - бизнес-логика в доменных сущностях
5. **Event Sourcing** - полная история изменений в Event Store


