import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://grievora:grievora_dev@localhost:5432/grievora',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-sonnet-4-6',
  },

  serper: {
    apiKey: process.env.SERPER_API_KEY || '',
  },

  vultrStorage: {
    endpoint: process.env.VULTR_STORAGE_ENDPOINT || 'https://ewr1.vultrobjects.com',
    accessKey: process.env.VULTR_STORAGE_ACCESS_KEY || '',
    secretKey: process.env.VULTR_STORAGE_SECRET_KEY || '',
    bucket: process.env.VULTR_STORAGE_BUCKET || 'grievora-evidence',
    region: 'ewr1',
  },

  rateLimit: {
    grievance: parseInt(process.env.RATE_LIMIT_GRIEVANCE || '10'),
    login: parseInt(process.env.RATE_LIMIT_LOGIN || '10'),
    register: parseInt(process.env.RATE_LIMIT_REGISTER || '5'),
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};
