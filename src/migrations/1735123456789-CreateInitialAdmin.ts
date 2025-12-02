import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';

/**
 * Миграция для создания первого администратора в пустой БД
 * 
 * ВАЖНО: Перед выполнением миграции:
 * 1. Установите переменные окружения или отредактируйте значения ниже:
 *    - ADMIN_EMAIL - email администратора
 *    - ADMIN_PASSWORD - пароль администратора (будет захеширован автоматически)
 *    - ADMIN_NAME - имя администратора
 * 
 * 2. Или отредактируйте значения по умолчанию в коде ниже
 */
export class CreateInitialAdmin1735123456789 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Получаем значения из переменных окружения или используем дефолтные
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
    const adminName = process.env.ADMIN_NAME || 'System Administrator';
    const adminId = process.env.ADMIN_ID || randomUUID();

    // Проверяем, что таблица events существует
    const tableExists = await queryRunner.hasTable('events');
    if (!tableExists) {
      throw new Error('Таблица events не найдена. Убедитесь, что базовая миграция выполнена.');
    }

    // Проверяем, что пользователь с таким email уже не существует
    const existingUser = await queryRunner.query(
      `SELECT 1 FROM events WHERE "eventType" = $1 AND payload->>'email' = $2 LIMIT 1`,
      ['UserCreatedEvent', adminEmail],
    );

    if (existingUser && existingUser.length > 0) {
      console.log(`Пользователь с email ${adminEmail} уже существует. Пропускаем создание.`);
      return;
    }

    // Генерируем bcrypt hash для пароля
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    // Формируем JSON payload для события UserCreatedEvent
    const payload = {
      id: adminId,
      name: adminName,
      email: adminEmail,
      hash: passwordHash,
      roles: ['ROLE_PLATFORM_ADMIN'],
      sources: [],
      createdAt: new Date().toISOString(),
    };

    // Вставляем событие в event store
    // Используем имена колонок из EventEntity (camelCase)
    await queryRunner.query(
      `INSERT INTO events ("aggregateId", "eventType", payload, version, "createdAt")
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'UserCreatedEvent', JSON.stringify(payload), 1, new Date()],
    );

    console.log('✓ Первый администратор успешно создан!');
    console.log(`  ID: ${adminId}`);
    console.log(`  Email: ${adminEmail}`);
    console.log(`  Имя: ${adminName}`);
    console.log(`  Пароль: ${adminPassword} (изменен из переменной окружения или дефолтный)`);
    console.log('');
    console.log('ВАЖНО: После выполнения миграции:');
    console.log('1. Событие будет обработано проектором при следующем запуске приложения');
    console.log('2. Read model в Redis будет обновлен автоматически');
    console.log('3. Смените пароль через adminpanel после первого входа!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

    // Удаляем событие создания администратора
    await queryRunner.query(
      `DELETE FROM events WHERE "eventType" = $1 AND payload->>'email' = $2`,
      ['UserCreatedEvent', adminEmail],
    );

    console.log(`Администратор с email ${adminEmail} удален из event store.`);
    console.log('Примечание: Read model в Redis нужно очистить вручную.');
  }
}

