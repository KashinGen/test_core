FROM node:20.11.0-alpine AS builder

WORKDIR /opt/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20.11.0-alpine AS production

WORKDIR /opt/app

COPY --from=builder /opt/app/node_modules ./node_modules/
COPY --from=builder /opt/app/package.json ./
COPY --from=builder /opt/app/package-lock.json ./
COPY --from=builder /opt/app/dist ./dist/

COPY --from=builder /opt/app/src/infrastructure/database/datasources ./src/infrastructure/database/datasources
COPY --from=builder /opt/app/src/migrations ./src/migrations
# Если нужны tsconfig и nest-cli для ts-node
COPY --from=builder /opt/app/tsconfig.json ./tsconfig.json
COPY --from=builder /opt/app/nest-cli.json ./nest-cli.json

EXPOSE 3000

CMD npm run migration:run && npm run start:prod




