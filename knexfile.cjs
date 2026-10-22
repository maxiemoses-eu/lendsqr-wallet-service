const databaseUrl = process.env.DATABASE_URL;

module.exports = {
  client: 'pg',
  connection: databaseUrl
    ? {
        connectionString: databaseUrl,
        ssl: process.env.DATABASE_SSL === 'true'
          ? { rejectUnauthorized: false }
          : undefined,
      }
    : {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 5432),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      },
  migrations: {
    directory: './src/database/migrations',
    loadExtensions: ['.cjs'],
    tableName: 'knex_migrations',
  },
};
