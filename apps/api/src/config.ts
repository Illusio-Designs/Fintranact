import 'dotenv/config';

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  db: {
    host: req('DB_HOST', '127.0.0.1'),
    port: Number(process.env.DB_PORT ?? 3306),
    user: req('DB_USER', 'fintranact'),
    password: req('DB_PASSWORD', ''),
    database: req('DB_NAME', 'fintranact'),
  },
  jwt: {
    secret: req('JWT_SECRET', 'dev-insecure-secret-change-me'),
    expiresIn: Number(process.env.JWT_EXPIRES_IN ?? 900),
  },
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
} as const;

export const isProd = config.env === 'production';
