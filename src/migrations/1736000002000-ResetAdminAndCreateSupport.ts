import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';

export class ResetAdminAndCreateSupport1736000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const oldAdminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

    const oldAdmins: Array<{ aggregateId: string }> = await queryRunner.query(
      `SELECT DISTINCT "aggregateId"
         FROM events
        WHERE "eventType" = 'UserCreatedEvent'
          AND payload->>'email' = $1`,
      [oldAdminEmail],
    );

    for (const row of oldAdmins) {
      await queryRunner.query(`DELETE FROM events WHERE "aggregateId" = $1`, [
        row.aggregateId,
      ]);
    }

    const adminEmail = 'support@rg.org';
    const adminPassword =
      process.env.SUPPORT_ADMIN_PASSWORD ||
      process.env.ADMIN_PASSWORD ||
      'ChangeMe123!';
    const adminName = process.env.SUPPORT_ADMIN_NAME || 'Support Administrator';
    const adminId = process.env.SUPPORT_ADMIN_ID || randomUUID();

    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const createdAt = new Date();

    const payload = {
      id: adminId,
      name: adminName,
      email: adminEmail,
      hash: passwordHash,
      roles: ['ROLE_PLATFORM_ADMIN'],
      sources: [],
      createdAt: createdAt.toISOString(),
    };

    await queryRunner.query(
      `INSERT INTO events ("aggregateId", "eventType", payload, version, "createdAt")
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'UserCreatedEvent', JSON.stringify(payload), 1, createdAt],
    );

    console.log(
      `Support admin created: email=${adminEmail}, password=${adminPassword}, id=${adminId}`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const adminEmail = 'support@rg.org';
    await queryRunner.query(
      `DELETE FROM events
        WHERE "aggregateId" IN (
          SELECT DISTINCT "aggregateId"
            FROM events
           WHERE payload->>'email' = $1
        )`,
      [adminEmail],
    );
  }
}
