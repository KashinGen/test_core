FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

# Устанавливаем postgresql-client для pg_isready (проверка готовности БД)
RUN apk add --no-cache postgresql-client

COPY package*.json ./
# Устанавливаем все зависимости (включая dev для ts-node и typeorm CLI)
RUN npm ci

# Копируем скомпилированные файлы приложения
COPY --from=builder /app/dist ./dist
# Копируем исходные файлы миграций и data-source для запуска миграций
COPY --from=builder /app/src/migrations ./src/migrations
COPY --from=builder /app/src/data-source.ts ./src/data-source.ts

EXPOSE 3000

# Ждем готовности БД, запускаем миграции, затем стартуем приложение
CMD sh -c "until pg_isready -h \${DB_HOST:-localhost} -p \${DB_PORT:-5432} -U \${DB_USER:-postgres} > /dev/null 2>&1; do echo 'Waiting for database...'; sleep 1; done && echo 'Database is ready!' && npm run migration:run && npm run start:prod"


