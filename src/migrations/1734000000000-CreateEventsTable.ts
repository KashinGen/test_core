import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateEventsTable1734000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'events',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'aggregateId',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'eventType',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'payload',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'version',
            type: 'bigint',
            default: 0,
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Создаем индекс для быстрого поиска по aggregateId и createdAt
    await queryRunner.createIndex(
      'events',
      new TableIndex({
        name: 'IDX_events_aggregateId_createdAt',
        columnNames: ['aggregateId', 'createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('events');
  }
}



