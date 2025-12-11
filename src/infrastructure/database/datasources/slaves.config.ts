import { PostgresConnectionCredentialsOptions } from 'typeorm/driver/postgres/PostgresConnectionCredentialsOptions';
import { SSLConfig } from './database-ssl-config';

export const getSlaveConfigs = (
  masterConfig: Partial<PostgresConnectionCredentialsOptions>,
): PostgresConnectionCredentialsOptions[] => {
  const slaves: PostgresConnectionCredentialsOptions[] = [];

  if (process.env.POSTGRES_SLAVE_1_HOST) {
    const slaveConfig: PostgresConnectionCredentialsOptions = {
      host: process.env.POSTGRES_SLAVE_1_HOST,
      port: +(
        process.env.POSTGRES_SLAVE_1_PORT ||
        process.env.POSTGRES_PORT ||
        masterConfig.port ||
        '5432'
      ),
      username:
        process.env.POSTGRES_SLAVE_1_USER ||
        process.env.POSTGRES_USER ||
        masterConfig.username ||
        'postgres',
      password:
        process.env.POSTGRES_SLAVE_1_PASSWORD ||
        process.env.POSTGRES_PASSWORD ||
        masterConfig.password ||
        'postgres',
      database:
        process.env.POSTGRES_SLAVE_1_DB ||
        process.env.POSTGRES_DB ||
        masterConfig.database ||
        'core_db',
    };

    const ssl = SSLConfig('POSTGRES_SLAVE_1') || SSLConfig('POSTGRES');
    if (ssl != null) {
      // @ts-ignore
      slaveConfig['ssl'] = ssl;
    }

    if (
      slaveConfig.host !== masterConfig.host ||
      slaveConfig.port !== masterConfig.port
    ) {
      slaves.push(slaveConfig);
    }
  }

  return slaves;
};


