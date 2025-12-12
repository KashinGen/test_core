import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Однократная миграция: апрувит первого администратора (ADMIN_EMAIL).
 * Если админ не найден — миграция пропускается.
 */
export class ApproveInitialAdmin1736000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

    const rows = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1 AND "deletedAt" IS NULL LIMIT 1`,
      [adminEmail],
    );

    if (!rows || rows.length === 0) {
      console.log(`Admin with email ${adminEmail} not found, skip approve`);
      return;
    }

    const { id } = rows[0];

    await queryRunner.query(
      `UPDATE users SET approved = true, "updatedAt" = NOW() WHERE id = $1`,
      [id],
    );

    console.log(`Admin ${adminEmail} (${id}) approved`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    await queryRunner.query(
      `UPDATE users SET approved = false, "updatedAt" = NOW() WHERE email = $1`,
      [adminEmail],
    );
  }
}

