import { DataSource } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { baseDataSource } from './base.datasource';
import { getMasterConfig } from './master.config';
import { getSlaveConfigs } from './slaves.config';

const masterConfig = getMasterConfig();
const slaveConfigs = getSlaveConfigs(masterConfig);

console.log('Database config:', {
  host: masterConfig.host,
  port: masterConfig.port,
  username: masterConfig.username,
  password: masterConfig.password ? '***' : 'not set',
  database: masterConfig.database,
  slaves: slaveConfigs.length,
});

export const AppDataSource = new DataSource({
  ...baseDataSource.options,
  ...(slaveConfigs.length > 0
    ? {
        replication: {
          master: masterConfig,
          slaves: slaveConfigs,
        },
      }
    : masterConfig),
  logging: process.env.NODE_ENV === 'development',
} as PostgresConnectionOptions);

