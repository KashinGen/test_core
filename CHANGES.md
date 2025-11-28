# Изменения для совместимости с Gateway

## Выполненные изменения

### ✅ 1. Доменная модель User

**Изменения:**
- Добавлено поле `name: string`
- Изменено `role: Role` → `roles: string[]` (массив ролей)
- Добавлено поле `sources: string[]` (массив UUID)
- Добавлено поле `updatedAt: Date`
- Добавлено поле `deletedAt?: Date` (soft delete)
- Убраны поля `approved` и `blockedAt` (не используются в gateway)

**Файлы:**
- `src/domain/entities/user.entity.ts`

### ✅ 2. Доменные события

**Новые события:**
- `UserUpdatedEvent` - обновление аккаунта
- `UserDeletedEvent` - удаление аккаунта (soft delete)
- `PasswordChangedEvent` - изменение пароля

**Обновленные события:**
- `UserCreatedEvent` - добавлены поля name, roles[], sources[]
- `RoleGrantedEvent` - изменено на массив ролей

**Файлы:**
- `src/domain/events/user-created.event.ts`
- `src/domain/events/user-updated.event.ts`
- `src/domain/events/user-deleted.event.ts`
- `src/domain/events/password-changed.event.ts`
- `src/domain/events/role-granted.event.ts`

### ✅ 3. DTO

**Новые DTO:**
- `CreateAccountDto` - создание аккаунта (name, email, password, roles[], sources[])
- `UpdateAccountDto` - обновление аккаунта
- `AccountDto` - представление аккаунта (id, name, email, roles[], createdAt, updatedAt, sources[])
- `GetAccountsDto` - параметры запроса (page, perPage, фильтры, сортировка)
- `ResetAccountPasswordDto` - сброс пароля
- `ChangeAccountPasswordDto` - изменение пароля
- `HydraCollection`, `HydraMember` - типы для Hydra формата

**Файлы:**
- `src/presentation/dto/account.dto.ts`
- `src/presentation/dto/create-account.dto.ts`
- `src/presentation/dto/update-account.dto.ts`
- `src/presentation/dto/get-accounts.dto.ts`
- `src/presentation/dto/reset-account-password.dto.ts`
- `src/presentation/dto/change-account-password.dto.ts`
- `src/presentation/dto/hydra.dto.ts`

### ✅ 4. Команды

**Новые команды:**
- `CreateAccountCommand` - создание аккаунта
- `UpdateAccountCommand` - обновление аккаунта
- `DeleteAccountCommand` - удаление аккаунта (soft delete)
- `ResetAccountPasswordCommand` - сброс пароля
- `ChangeAccountPasswordCommand` - изменение пароля

**Обновленные команды:**
- `GrantRoleCommand` - теперь принимает массив ролей

**Файлы:**
- `src/application/commands/create-user.command.ts` (обновлен)
- `src/application/commands/update-account.command.ts`
- `src/application/commands/delete-account.command.ts`
- `src/application/commands/reset-account-password.command.ts`
- `src/application/commands/change-account-password.command.ts`
- `src/application/commands/grant-role.command.ts` (обновлен)

### ✅ 5. Queries

**Новый query:**
- `GetAccountsQuery` - получение списка с фильтрацией и сортировкой

**Параметры фильтрации:**
- `id[]` - фильтр по ID (массив)
- `name` - поиск по имени (частичное совпадение)
- `company[]` - фильтр по компаниям (через sources)
- `role[]` - фильтр по ролям (массив)
- `order` - сортировка (name, email, roles, createdAt)

**Пагинация:**
- Изменено с `limit/offset` на `page/perPage`

**Файлы:**
- `src/application/queries/get-accounts.query.ts`
- `src/application/queries/get-accounts.handler.ts`

### ✅ 6. Hydra мапперы

**Новый сервис:**
- `HydraMapper` - преобразование ответов в Hydra формат

**Методы:**
- `toMember()` - преобразование одного объекта
- `toCollection()` - преобразование коллекции с пагинацией

**Файлы:**
- `src/presentation/mappers/hydra.mapper.ts`

### ✅ 7. Read Model

**Обновления:**
- Поддержка новых полей (name, roles[], sources[], updatedAt, deletedAt)
- Индексы для фильтрации по ролям
- Фильтрация удаленных записей
- Поддержка фильтрации и сортировки в `findAll()`

**Файлы:**
- `src/infrastructure/read-model/user-read-model.repository.ts`

### ✅ 8. Проекторы

**Обновления:**
- Обработка новых событий (UserUpdated, UserDeleted, PasswordChanged)
- Обновление индексов при изменении ролей

**Файлы:**
- `src/infrastructure/read-model/user-projection.ts`

### ✅ 9. Контроллеры

**Command Controller:**
- `POST /accounts` - создание (возвращает Hydra формат)
- `PATCH /accounts/:id` - обновление (новый endpoint)
- `DELETE /accounts/:id` - удаление (новый endpoint, soft delete)
- `POST /accounts/password/reset` - сброс пароля (новый endpoint)
- `POST /accounts/password/change` - изменение пароля (новый endpoint)
- `PATCH /accounts/:id/approve` - одобрение (обновлен, возвращает Hydra)
- `PATCH /accounts/:id/block` - блокировка (обновлен, возвращает Hydra)
- `PATCH /accounts/:id/role` - выдача ролей (обновлен, принимает массив)

**Query Controller:**
- `GET /accounts/:id` - получение одного (возвращает Hydra формат)
- `GET /accounts/email/:email` - получение по email (возвращает Hydra формат)
- `GET /accounts` - список с фильтрацией (новый формат, возвращает Hydra коллекцию)

**Файлы:**
- `src/presentation/command/command.controller.ts`
- `src/presentation/query/query.controller.ts`

## API Endpoints

### Commands (Write-side)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/accounts` | Создать аккаунт |
| PATCH | `/accounts/:id` | Обновить аккаунт |
| DELETE | `/accounts/:id` | Удалить аккаунт (soft delete) |
| POST | `/accounts/password/reset` | Сброс пароля |
| POST | `/accounts/password/change` | Изменение пароля |
| PATCH | `/accounts/:id/approve` | Одобрить аккаунт |
| PATCH | `/accounts/:id/block` | Заблокировать аккаунт |
| PATCH | `/accounts/:id/role` | Выдать роли |

### Queries (Read-side)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/accounts/:id` | Получить аккаунт по ID |
| GET | `/accounts/email/:email` | Получить аккаунт по email |
| GET | `/accounts?page=1&perPage=20&...` | Список аккаунтов с фильтрацией |

## Формат ответов (Hydra)

### Один объект

```json
{
  "@context": "/api/contexts/Account",
  "@id": "/api/accounts/{id}",
  "@type": "Account",
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "roles": ["ROLE_PLATFORM_ADMIN"],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "sources": ["uuid1", "uuid2"]
}
```

### Коллекция

```json
{
  "@context": "/api/contexts/Account",
  "@id": "/api/accounts",
  "@type": "hydra:Collection",
  "hydra:member": [...],
  "hydra:totalItems": 100,
  "hydra:view": {
    "@id": "/api/accounts?page=1",
    "type": "hydra:PartialCollectionView",
    "hydra:first": "/api/accounts?page=1",
    "hydra:last": "/api/accounts?page=5",
    "hydra:previous": null,
    "hydra:next": "/api/accounts?page=2"
  }
}
```

## Обратная совместимость

Для обратной совместимости оставлены:
- `CreateUserCommand` (extends CreateAccountCommand)
- `GetUsersQuery` (конвертирует limit/offset в page/perPage)

## TODO (для будущих улучшений)

- [ ] Реализовать токен-стор для ResetPassword/ChangePassword
- [ ] Добавить валидацию ролей
- [ ] Оптимизировать фильтрацию в Read Model (использовать Redis sorted sets)
- [ ] Добавить кэширование для часто запрашиваемых данных
- [ ] Реализовать полнотекстовый поиск по имени
- [ ] Добавить метрики и мониторинг

