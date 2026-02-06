import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  url: process.env.APP_URL || 'http://localhost:3000',
}));

export const databaseConfig = registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'bkash_user',
  password: process.env.DB_PASSWORD || 'bkash_pass',
  database: process.env.DB_DATABASE || 'bkash_payment',
}));

export const bkashConfig = registerAs('bkash', () => ({
  baseUrl:
    process.env.BKASH_BASE_URL ||
    'https://tokenized.pay.bka.sh/v1.2.0-beta',
  appKey: process.env.BKASH_APP_KEY || '',
  appSecret: process.env.BKASH_SECRET_KEY || '',
  username: process.env.BKASH_USERNAME || '',
  password: process.env.BKASH_PASSWORD || '',
}));
