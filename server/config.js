require('dotenv').config();

module.exports = {
  // 数据库配置
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'creatimage'
  },

  // Redis配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null
  },

  // 服务器配置
  server: {
    port: process.env.PORT || 8088,
    env: process.env.NODE_ENV || 'development'
  },

  // API配置
  api: {
    baseUrl: process.env.API_BASE_URL || 'https://api.example.com',
    key: process.env.API_KEY || ''
  },

  // OSS配置
  oss: {
    region: process.env.OSS_REGION || 'oss-cn-beijing',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
    bucket: process.env.OSS_BUCKET || '',
    endpoint: process.env.OSS_ENDPOINT || 'https://oss-cn-beijing.aliyuncs.com'
  },

  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  }
};
