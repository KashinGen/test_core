# 📋 Руководство по переменным окружения

## 🎯 Принципы разделения

### Локальный `.env` (Development)
- ✅ Несекретные значения для локальной разработки
- ✅ Значения по умолчанию
- ✅ Можно коммитить в git (через `.env.example`)
- ✅ Используются только локально

### YAML конфигурация (Deploy/Production)
- ✅ Секретные значения (пароли, токены, ключи)
- ✅ Значения, специфичные для окружения (dev/staging/prod)
- ✅ Значения, которые могут меняться между деплоями
- ✅ Используются в Kubernetes/Docker Compose/CI/CD

---

## 📁 Локальный `.env` файл

### Рекомендуемое содержимое `.env`:

```env
# ============================================
# DATABASE (локальные значения для dev)
# ============================================
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=core_db

# ============================================
# REDIS (локальные значения для dev)
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# ============================================
# APPLICATION (локальные настройки)
# ============================================
PORT=3000
NODE_ENV=development

# ============================================
# SECURITY (локальные значения для dev)
# ============================================
# Для локальной разработки можно использовать простой токен
GATEWAY_AUTH_TOKEN=dev-gateway-token-change-in-production

# JWT верификация отключена для локальной разработки
DISABLE_JWT_VERIFICATION=true
# JWT_PUBLIC_KEY не нужен, если DISABLE_JWT_VERIFICATION=true

# ============================================
# MIGRATIONS (только для локальной разработки)
# ============================================
# Используются только при выполнении миграций локально
ADMIN_EMAIL=admin@localhost
ADMIN_PASSWORD=ChangeMe123!
ADMIN_NAME=Local Admin
# ADMIN_ID опционален (генерируется автоматически)
```

### `.env.example` (шаблон для git):

```env
# ============================================
# DATABASE
# ============================================
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=core_db

# ============================================
# REDIS
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# ============================================
# APPLICATION
# ============================================
PORT=3000
NODE_ENV=development

# ============================================
# SECURITY
# ============================================
GATEWAY_AUTH_TOKEN=change-me-in-production
DISABLE_JWT_VERIFICATION=true
# JWT_PUBLIC_KEY=  # Не нужен для dev

# ============================================
# MIGRATIONS (опционально)
# ============================================
# ADMIN_EMAIL=admin@localhost
# ADMIN_PASSWORD=ChangeMe123!
# ADMIN_NAME=Local Admin
```

---

## 🚀 YAML конфигурация для деплоя

### Kubernetes Deployment + ConfigMap + Secret

#### `k8s/configmap.yaml` (несекретные значения):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: core-rg-config
  namespace: production
data:
  # Database (несекретные)
  DB_HOST: postgres-service
  DB_PORT: "5432"
  DB_NAME: core_db
  
  # Redis (несекретные)
  REDIS_HOST: redis-service
  REDIS_PORT: "6379"
  REDIS_DB: "0"
  
  # Application
  PORT: "3000"
  NODE_ENV: production
  
  # Security (несекретные настройки)
  DISABLE_JWT_VERIFICATION: "false"
```

#### `k8s/secret.yaml` (секретные значения):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: core-rg-secrets
  namespace: production
type: Opaque
stringData:
  # Database (секретные)
  DB_USER: postgres
  DB_PASSWORD: <strong-production-password>
  
  # Redis (секретные)
  REDIS_PASSWORD: <redis-password>
  
  # Security (секретные токены и ключи)
  GATEWAY_AUTH_TOKEN: <strong-random-token>
  JWT_PUBLIC_KEY: |
    -----BEGIN PUBLIC KEY-----
    <your-public-key-here>
    -----END PUBLIC KEY-----
```

#### `k8s/deployment.yaml` (использование):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: core-rg
  namespace: production
spec:
  template:
    spec:
      containers:
      - name: core-rg
        image: core-rg:latest
        envFrom:
        - configMapRef:
            name: core-rg-config
        - secretRef:
            name: core-rg-secrets
        # Или явно:
        env:
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: core-rg-config
              key: DB_HOST
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: core-rg-secrets
              key: DB_PASSWORD
```

### Docker Compose для production

#### `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  core-rg:
    image: core-rg:latest
    environment:
      # Из переменных окружения хоста или .env.prod
      DB_HOST: ${DB_HOST}
      DB_PORT: ${DB_PORT}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      
      REDIS_HOST: ${REDIS_HOST}
      REDIS_PORT: ${REDIS_PORT}
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      REDIS_DB: ${REDIS_DB}
      
      PORT: ${PORT:-3000}
      NODE_ENV: production
      
      GATEWAY_AUTH_TOKEN: ${GATEWAY_AUTH_TOKEN}
      JWT_PUBLIC_KEY: ${JWT_PUBLIC_KEY}
      DISABLE_JWT_VERIFICATION: "false"
    env_file:
      - .env.prod  # Секретные значения в отдельном файле
```

#### `.env.prod` (НЕ коммитить в git!):

```env
# Секретные значения для production
DB_PASSWORD=strong-production-password
REDIS_PASSWORD=redis-production-password
GATEWAY_AUTH_TOKEN=strong-random-production-token
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----
```

---

## 📊 Таблица разделения переменных

| Переменная | Локальный `.env` | YAML ConfigMap | YAML Secret | Примечание |
|-----------|------------------|----------------|------------|------------|
| **DATABASE** |
| `DB_HOST` | ✅ `localhost` | ✅ `postgres-service` | ❌ | Зависит от окружения |
| `DB_PORT` | ✅ `5432` | ✅ `5432` | ❌ | Обычно не меняется |
| `DB_USER` | ✅ `postgres` | ❌ | ✅ `postgres` | Секрет в prod |
| `DB_PASSWORD` | ✅ `postgres` | ❌ | ✅ `<strong>` | **Секрет!** |
| `DB_NAME` | ✅ `core_db` | ✅ `core_db` | ❌ | Обычно не меняется |
| **REDIS** |
| `REDIS_HOST` | ✅ `localhost` | ✅ `redis-service` | ❌ | Зависит от окружения |
| `REDIS_PORT` | ✅ `6379` | ✅ `6379` | ❌ | Обычно не меняется |
| `REDIS_PASSWORD` | ✅ `` (пусто) | ❌ | ✅ `<password>` | **Секрет в prod!** |
| `REDIS_DB` | ✅ `0` | ✅ `0` | ❌ | Обычно не меняется |
| **APPLICATION** |
| `PORT` | ✅ `3000` | ✅ `3000` | ❌ | Обычно не меняется |
| `NODE_ENV` | ✅ `development` | ✅ `production` | ❌ | Зависит от окружения |
| **SECURITY** |
| `GATEWAY_AUTH_TOKEN` | ✅ `dev-token` | ❌ | ✅ `<strong>` | **Секрет!** |
| `JWT_PUBLIC_KEY` | ❌ (не нужен) | ❌ | ✅ `<key>` | **Секрет!** |
| `DISABLE_JWT_VERIFICATION` | ✅ `true` | ✅ `false` | ❌ | Только для dev |
| **MIGRATIONS** |
| `ADMIN_EMAIL` | ✅ `admin@localhost` | ❌ | ❌ | Только для локальных миграций |
| `ADMIN_PASSWORD` | ✅ `ChangeMe123!` | ❌ | ❌ | Только для локальных миграций |
| `ADMIN_NAME` | ✅ `Local Admin` | ❌ | ❌ | Только для локальных миграций |
| `ADMIN_ID` | ✅ (опционально) | ❌ | ❌ | Только для локальных миграций |

---

## 🔐 Безопасность

### ✅ Что можно коммитить в git:

- `.env.example` - шаблон с несекретными значениями
- `k8s/configmap.yaml` - несекретные конфигурации
- `docker-compose.yml` - локальная разработка (без секретов)

### ❌ Что НЕЛЬЗЯ коммитить в git:

- `.env` - локальные значения (может содержать секреты)
- `.env.prod` - production секреты
- `k8s/secret.yaml` - секретные значения (использовать внешние секреты!)
- Любые файлы с реальными паролями, токенами, ключами

### 🔒 Рекомендации по секретам:

1. **Kubernetes:**
   - Использовать `Secret` объекты
   - Хранить секреты в внешних системах (Vault, AWS Secrets Manager, etc.)
   - Использовать `sealed-secrets` для версионирования

2. **Docker Compose:**
   - Использовать `.env.prod` файл (в `.gitignore`)
   - Или передавать через переменные окружения хоста
   - Использовать Docker Secrets в Swarm mode

3. **CI/CD:**
   - Хранить секреты в переменных окружения CI/CD системы
   - Использовать секретные переменные (GitHub Secrets, GitLab CI Variables, etc.)

---

## 📝 Примеры использования

### Локальная разработка:

```bash
# 1. Скопировать шаблон
cp .env.example .env

# 2. Отредактировать при необходимости
# (обычно не требуется, значения по умолчанию работают)

# 3. Запустить
npm run start:dev
```

### Production деплой (Kubernetes):

```bash
# 1. Создать ConfigMap
kubectl apply -f k8s/configmap.yaml

# 2. Создать Secret (из внешнего источника или вручную)
kubectl create secret generic core-rg-secrets \
  --from-literal=DB_PASSWORD='<password>' \
  --from-literal=GATEWAY_AUTH_TOKEN='<token>' \
  --from-file=JWT_PUBLIC_KEY=./keys/jwt-public.pem

# 3. Применить Deployment
kubectl apply -f k8s/deployment.yaml
```

### Production деплой (Docker Compose):

```bash
# 1. Создать .env.prod (НЕ коммитить!)
cp .env.example .env.prod
# Отредактировать .env.prod с production значениями

# 2. Запустить
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

---

## 🎯 Итоговые рекомендации

### Локальный `.env`:
- ✅ Хранить только несекретные значения для dev
- ✅ Использовать простые значения (postgres/postgres)
- ✅ Можно коммитить `.env.example` в git
- ✅ `.env` должен быть в `.gitignore`

### YAML для деплоя:
- ✅ **ConfigMap**: несекретные значения (хосты, порты, флаги)
- ✅ **Secret**: все секретные значения (пароли, токены, ключи)
- ✅ Использовать внешние системы для хранения секретов
- ✅ Не коммитить реальные секреты в git

### Безопасность:
- ✅ Всегда использовать сильные пароли/токены в production
- ✅ Регулярно ротировать секреты
- ✅ Использовать разные значения для разных окружений
- ✅ Мониторить доступ к секретам

---

**Обновлено:** 2024  
**Версия:** 1.0


