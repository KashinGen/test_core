import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';

/**
 * Миграция для создания первого администратора в пустой БД
 */
export class CreateInitialAdmin1735123456789 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
    const adminName = process.env.ADMIN_NAME || 'System Administrator';
    const adminId = process.env.ADMIN_ID || randomUUID();

    const tableExists = await queryRunner.hasTable('events');
    if (!tableExists) {
      throw new Error(
        'Таблица events не найдена. Убедитесь, что базовая миграция выполнена.',
      );
    }

    const existingUser = await queryRunner.query(
      `SELECT 1 FROM events WHERE "eventType" = $1 AND payload->>'email' = $2 LIMIT 1`,
      ['UserCreatedEvent', adminEmail],
    );

    if (existingUser && existingUser.length > 0) {
      console.log(
        `Пользователь с email ${adminEmail} уже существует. Пропускаем создание.`,
      );
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const payload = {
      id: adminId,
      name: adminName,
      email: adminEmail,
      hash: passwordHash,
      roles: ['ROLE_PLATFORM_ADMIN'],
      sources: [],
      createdAt: new Date().toISOString(),
    };

    const createdAt = new Date();

    await queryRunner.query(
      `INSERT INTO events ("aggregateId", "eventType", payload, version, "createdAt")
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'UserCreatedEvent', JSON.stringify(payload), 1, createdAt],
    );

    console.log('Первый администратор успешно создан!');
    console.log(`  ID: ${adminId}`);
    console.log(`  Email: ${adminEmail}`);
    console.log(`  Имя: ${adminName}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

    await queryRunner.query(
      `DELETE FROM events WHERE "eventType" = $1 AND payload->>'email' = $2`,
      ['UserCreatedEvent', adminEmail],
    );

    console.log(`Администратор с email ${adminEmail} удален из event store.`);
  }
}
