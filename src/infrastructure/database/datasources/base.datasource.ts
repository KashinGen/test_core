import 'dotenv/config';
import * as path from 'path';
import { DataSource } from 'typeorm';

export const baseDataSource = new DataSource({
  type: 'postgres',
  // Используем path.resolve для динамического поиска entities (как в feedback)
  entities: [
    // Для production (entities в dist после сборки)
    ...(process.env.NODE_ENV === 'production'
      ? [path.resolve(__dirname, '../../../../dist/infrastructure/**/*.entity.js')]
      : []),
    // Для development (entities в src)
    ...(process.env.NODE_ENV !== 'production'
      ? [path.resolve(__dirname, '../../../**/*.entity.ts')]
      : []),
  ],
  migrations: [path.resolve(__dirname, '../../../migrations/*.ts')],
  synchronize: false,
});

