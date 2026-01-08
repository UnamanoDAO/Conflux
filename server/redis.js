const redis = require('redis');
const config = require('./config');

// 创建Redis客户端
const createRedisClient = () => {
  const client = redis.createClient({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password
  });

  client.on('error', (err) => {
    console.error('Redis连接错误:', err);
  });

  client.on('connect', () => {
    console.log('Redis连接成功');
  });

  return client;
};

// 内存缓存（当Redis不可用时使用）
const memoryCache = new Map();

// Redis服务
const redisService = {
  client: null,
  
  // 初始化Redis连接
  async init() {
    try {
      this.client = createRedisClient();
      await this.client.connect();
      console.log('Redis服务初始化成功');
    } catch (error) {
      console.error('Redis服务初始化失败，将使用内存缓存:', error.message);
      this.client = null;
    }
  },
  
  // 设置缓存
  async set(key, value, expireSeconds = 3600) {
    if (!this.client) {
      // 使用内存缓存
      memoryCache.set(key, {
        value: JSON.stringify(value),
        expire: Date.now() + expireSeconds * 1000
      });
      return true;
    }
    
    try {
      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, expireSeconds, serializedValue);
      return true;
    } catch (error) {
      console.error('Redis设置缓存失败:', error);
      return false;
    }
  },
  
  // 获取缓存
  async get(key) {
    if (!this.client) {
      // 使用内存缓存
      const cached = memoryCache.get(key);
      if (!cached) return null;
      
      if (Date.now() > cached.expire) {
        memoryCache.delete(key);
        return null;
      }
      
      return JSON.parse(cached.value);
    }
    
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis获取缓存失败:', error);
      return null;
    }
  },
  
  // 删除缓存
  async del(key) {
    if (!this.client) {
      // 使用内存缓存
      return memoryCache.delete(key);
    }
    
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis删除缓存失败:', error);
      return false;
    }
  },
  
  // 检查键是否存在
  async exists(key) {
    if (!this.client) {
      // 使用内存缓存
      const cached = memoryCache.get(key);
      if (!cached) return false;
      
      if (Date.now() > cached.expire) {
        memoryCache.delete(key);
        return false;
      }
      
      return true;
    }
    
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis检查键存在失败:', error);
      return false;
    }
  },
  
  // 设置过期时间
  async expire(key, seconds) {
    if (!this.client) {
      // 使用内存缓存
      const cached = memoryCache.get(key);
      if (cached) {
        cached.expire = Date.now() + seconds * 1000;
        return true;
      }
      return false;
    }
    
    try {
      await this.client.expire(key, seconds);
      return true;
    } catch (error) {
      console.error('Redis设置过期时间失败:', error);
      return false;
    }
  },
  
  // 获取剩余过期时间
  async ttl(key) {
    if (!this.client) {
      // 使用内存缓存
      const cached = memoryCache.get(key);
      if (!cached) return -1;
      
      const remaining = Math.floor((cached.expire - Date.now()) / 1000);
      return remaining > 0 ? remaining : -1;
    }
    
    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error('Redis获取剩余时间失败:', error);
      return -1;
    }
  },
  
  // 缓存生成任务结果
  async cacheGenerationResult(taskId, result) {
    const key = `generation:${taskId}`;
    return await this.set(key, result, 7200); // 2小时过期
  },
  
  // 获取生成任务结果
  async getGenerationResult(taskId) {
    const key = `generation:${taskId}`;
    return await this.get(key);
  },
  
  // 缓存用户会话
  async cacheUserSession(sessionId, sessionData) {
    const key = `session:${sessionId}`;
    return await this.set(key, sessionData, 1800); // 30分钟过期
  },
  
  // 获取用户会话
  async getUserSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.get(key);
  },
  
  // 关闭连接
  async close() {
    if (this.client) {
      await this.client.quit();
    }
    // 清空内存缓存
    memoryCache.clear();
  }
};

module.exports = redisService;
