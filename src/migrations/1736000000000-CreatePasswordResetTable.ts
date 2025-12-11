import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreatePasswordResetTable1736000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'password_reset',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'accountId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'token',
            type: 'text',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'notifiedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'usedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'password_reset',
      new TableIndex({
        name: 'IDX_password_reset_token',
        columnNames: ['token'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'password_reset',
      new TableIndex({
        name: 'IDX_password_reset_accountId',
        columnNames: ['accountId'],
      }),
    );

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('password_reset');
  }
}




