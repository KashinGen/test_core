import { PostgresConnectionCredentialsOptions } from 'typeorm/driver/postgres/PostgresConnectionCredentialsOptions';
import { SSLConfig } from './database-ssl-config';

export const getMasterConfig = (): PostgresConnectionCredentialsOptions => {
  const config: PostgresConnectionCredentialsOptions = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: +(process.env.POSTGRES_PORT || '5432'),
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'core_db',
  };

  const ssl = SSLConfig('POSTGRES');
  if (ssl != null) {
    // @ts-ignore
    config['ssl'] = ssl;
  }

  return config;
};



