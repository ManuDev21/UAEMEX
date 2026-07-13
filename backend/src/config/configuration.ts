export default () => {
  // Support DATABASE_URL (Railway/Heroku format: postgresql://user:pass@host:port/db)
  const databaseUrl = process.env.DATABASE_URL;
  let dbConfig: any;

  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      dbConfig = {
        host: url.hostname,
        port: parseInt(url.port || '5432', 10),
        username: url.username,
        password: url.password,
        database: url.pathname.replace(/^\//, ''),
        synchronize: (process.env.DB_SYNCHRONIZE ?? 'true') === 'true',
        logging: (process.env.DB_LOGGING ?? 'false') === 'true',
      };
    } catch {
      dbConfig = undefined;
    }
  }

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    database: dbConfig ?? {
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_DATABASE ?? 'asset_management',
      synchronize: (process.env.DB_SYNCHRONIZE ?? 'true') === 'true',
      logging: (process.env.DB_LOGGING ?? 'false') === 'true',
    },
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET ?? 'access_secret',
      accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
      refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'refresh_secret',
      refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
    },
    throttle: {
      ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
      limit: parseInt(process.env.THROTTLE_LIMIT ?? '120', 10),
    },
  };
};
