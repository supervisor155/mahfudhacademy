require('dotenv').config();

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'supersecret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '12h',
  JWT_REFRESH_EXPIRES_DAYS: Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 14),
  JWT_ISSUER: process.env.JWT_ISSUER || 'quran-elearning-api',
  JWT_AUDIENCE: process.env.JWT_AUDIENCE || 'quran-elearning-client',
  JWT_REFRESH_AUDIENCE: process.env.JWT_REFRESH_AUDIENCE || 'quran-elearning-refresh',
  DB_URL: process.env.DB_URL || '',
};
