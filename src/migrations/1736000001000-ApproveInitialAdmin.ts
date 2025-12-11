import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Однократная миграция: апрувит первого администратора (ADMIN_EMAIL) событием UserApprovedEvent.
 * Если админ не найден — миграция пропускается.
 */
export class ApproveInitialAdmin1736000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

    const rows = await queryRunner.query(
      `SELECT "aggregateId" as id, "version"
         FROM events
        WHERE "eventType" = 'UserCreatedEvent'
          AND payload->>'email' = $1
        ORDER BY "version" DESC
        LIMIT 1`,
      [adminEmail],
    );

    if (!rows || rows.length === 0) {
      console.log(`Admin with email ${adminEmail} not found, skip approve`);
      return;
    }

    const { id, version } = rows[0];
    const nextVersion = (Number(version) || 1) + 1;
    const approvedAt = new Date().toISOString();

    await queryRunner.query(
      `INSERT INTO events ("aggregateId","eventType",payload,version,"createdAt")
       VALUES ($1,'UserApprovedEvent',$2,$3,now())`,
      [id, JSON.stringify({ id, approvedAt }), nextVersion],
    );

    console.log(`Admin ${adminEmail} approved with version ${nextVersion}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    await queryRunner.query(
      `DELETE FROM events
        WHERE "eventType"='UserApprovedEvent'
          AND payload->>'id' IN (
            SELECT "aggregateId"
              FROM events
             WHERE "eventType"='UserCreatedEvent'
               AND payload->>'email'=$1
          )`,
      [adminEmail],
    );
  }
}

