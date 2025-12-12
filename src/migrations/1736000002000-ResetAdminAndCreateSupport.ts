import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';

export class ResetAdminAndCreateSupport1736000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const oldAdminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

    // Удаляем старых админов из таблицы users
    await queryRunner.query(
      `UPDATE users SET "deletedAt" = NOW() WHERE email = $1`,
      [oldAdminEmail],
    );

    const adminEmail = 'support@rg.org';
    const adminPassword =
      process.env.SUPPORT_ADMIN_PASSWORD ||
      process.env.ADMIN_PASSWORD ||
      'ChangeMe123!';
    const adminName = process.env.SUPPORT_ADMIN_NAME || 'Support Administrator';
    const adminId = process.env.SUPPORT_ADMIN_ID || randomUUID();

    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const createdAt = new Date();

    // Проверяем, существует ли уже пользователь
    const existing = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1 AND "deletedAt" IS NULL`,
      [adminEmail],
    );

    if (existing && existing.length > 0) {
      console.log(`User with email ${adminEmail} already exists. Skipping creation.`);
      return;
    }

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

    console.log(
      `Support admin created: email=${adminEmail}, password=${adminPassword}, id=${adminId}`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const adminEmail = 'support@rg.org';
    await queryRunner.query(
      `UPDATE users SET "deletedAt" = NOW() WHERE email = $1`,
      [adminEmail],
    );
  }
}
