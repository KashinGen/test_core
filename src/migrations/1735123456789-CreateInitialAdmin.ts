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

    const tableExists = await queryRunner.hasTable('users');
    if (!tableExists) {
      throw new Error(
        'Таблица users не найдена. Убедитесь, что базовая миграция выполнена.',
      );
    }

    const existingUser = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1 AND "deletedAt" IS NULL LIMIT 1`,
      [adminEmail],
    );

    if (existingUser && existingUser.length > 0) {
      console.log(
        `Пользователь с email ${adminEmail} уже существует. Пропускаем создание.`,
      );
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const createdAt = new Date();

    await queryRunner.query(
      `INSERT INTO users (id, name, email, password_hash, roles, sources, approved, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        adminId,
        adminName,
        adminEmail,
        passwordHash,
        'ROLE_PLATFORM_ADMIN',
        '',
        true,
        createdAt,
        createdAt,
      ],
    );

    // Добавляем запись в audit_logs, если таблица существует
    const auditLogsTableExists = await queryRunner.hasTable('audit_logs');
    if (auditLogsTableExists) {
      await queryRunner.query(
        `INSERT INTO audit_logs (id, "entityType", "entityId", action, "userId", "userEmail", "newValues", description, "createdAt")
         VALUES (uuid_generate_v4(), 'user', $1, 'CREATE', $1, $2, $3, $4, $5)`,
        [
          adminId,
          adminEmail,
          JSON.stringify({
            name: adminName,
            email: adminEmail,
            roles: ['ROLE_PLATFORM_ADMIN'],
            sources: [],
            approved: true,
          }),
          'Initial admin created by migration',
          createdAt,
        ],
      );
    }

    console.log('Первый администратор успешно создан!');
    console.log(`  ID: ${adminId}`);
    console.log(`  Email: ${adminEmail}`);
    console.log(`  Имя: ${adminName}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

    await queryRunner.query(
      `UPDATE users SET "deletedAt" = NOW() WHERE email = $1`,
      [adminEmail],
    );

    console.log(`Администратор с email ${adminEmail} помечен как удаленный.`);
  }
}
