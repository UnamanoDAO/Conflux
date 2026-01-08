// 配置文件示例
// 复制此文件为 config.js 并修改相应的配置

require('dotenv').config();

module.exports = {
  // 数据库配置
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ai_image_generator'
  },
  
  // Redis配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null
  },
  
  // 服务器配置
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development'
  },
  
  // API配置
  api: {
    baseUrl: process.env.API_BASE_URL || '',
    key: process.env.API_KEY || ''
  }
};

// 环境变量示例 (.env 文件):
/*
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=ai_image_generator

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

PORT=3001
NODE_ENV=development

API_BASE_URL=https://api.openai-hk.com
API_KEY=your_api_key
*/

