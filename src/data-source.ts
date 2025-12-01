import { DataSource } from 'typeorm';
import { EventEntity } from './infrastructure/event-store/event.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'core_db',
  entities: [EventEntity],
  migrations: [__dirname + '/migrations/**/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});

