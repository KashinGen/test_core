import * as process from 'process';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

export const SSLConfig = (
  prefix: string,
): PostgresConnectionOptions['ssl'] | null => {
  const sslEnabled = process.env[`${prefix}_SSL_ENABLED`] === 'true';
  const cert = process.env[`${prefix}_SSL_CERT`];

  return sslEnabled
    ? cert
      ? { ca: cert }
      : { rejectUnauthorized: false }
    : false;
};



