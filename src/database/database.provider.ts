import { Provider } from '@nestjs/common';
import knex, { Knex } from 'knex';

export const KNEX_CONNECTION = 'KNEX_CONNECTION';

export const databaseProvider: Provider = {
  provide: KNEX_CONNECTION,
  useFactory: (): Knex => {
    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl) {
      return knex({
        client: 'pg',
        connection: {
          connectionString: databaseUrl,
          ssl:
            process.env.DATABASE_SSL === 'true'
              ? { rejectUnauthorized: false }
              : undefined,
        },
      });
    }

    return knex({
      client: 'pg',
      connection: {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 5432),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      },
    });
  },
};
