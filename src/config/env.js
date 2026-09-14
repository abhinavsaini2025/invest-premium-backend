// Central place that reads and validates process.env.
// Every other file imports config from here instead of touching process.env
// directly, so there's exactly one place to check when an env var is missing.
require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const defaultCorsOrigins = [
  'http://localhost:5173',
  'https://hexagrow.netlify.app',
];

const configuredCorsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  apiBasePath: process.env.API_BASE_PATH || '/api/v1',

  mongoUri: required('MONGO_URI', 'mongodb://127.0.0.1:27017/investment_wallet'),

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: required('JWT_REFRESH_SECRET'),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  business: {
    minWithdrawalAmount: Number(process.env.MIN_WITHDRAWAL_AMOUNT || 310),
    referralRewardAmount: Number(process.env.REFERRAL_REWARD_AMOUNT || 100),
  },

  corsOrigins: [...new Set([...defaultCorsOrigins, ...configuredCorsOrigins])],

  rateLimits: {
    loginMax: Number(process.env.RATE_LIMIT_LOGIN_MAX || 10),
    authActionMax: Number(process.env.RATE_LIMIT_AUTH_ACTION_MAX || 5),
    withdrawMax: Number(process.env.RATE_LIMIT_WITHDRAW_MAX || 5),
  },

  uploads: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxMb: Number(process.env.MAX_UPLOAD_MB || 5),
  },

  rupayEx: {
    apiKey: process.env.RUPAYEX_API_KEY || '',
    apiBaseUrl: process.env.RUPAYEX_API_BASE_URL || '',
  },
};

module.exports = config;
