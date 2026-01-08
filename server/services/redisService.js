const redis = require('redis')

class RedisService {
  constructor() {
    this.client = null
    this.isConnected = false
  }

  /**
   * 连接到Redis服务器
   */
  async connect() {
    try {
      if (this.client && this.isConnected) {
        return this.client
      }

      // 创建Redis客户端
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.error('Redis服务器连接被拒绝')
            return new Error('Redis服务器连接被拒绝')
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            console.error('Redis重试时间超过1小时')
            return new Error('Redis重试时间超过1小时')
          }
          if (options.attempt > 10) {
            console.error('Redis重试次数超过10次')
            return undefined
          }
          return Math.min(options.attempt * 100, 3000)
        }
      })

      // 监听连接事件
      this.client.on('connect', () => {
        console.log('Redis客户端已连接')
        this.isConnected = true
      })

      this.client.on('ready', () => {
        console.log('Redis客户端已就绪')
      })

      this.client.on('error', (err) => {
        console.error('Redis客户端错误:', err)
        this.isConnected = false
      })

      this.client.on('end', () => {
        console.log('Redis客户端连接已关闭')
        this.isConnected = false
      })

      // 连接到Redis
      await this.client.connect()
      
      return this.client
    } catch (error) {
      console.error('Redis连接失败:', error)
      this.isConnected = false
      throw error
    }
  }

  /**
   * 断开Redis连接
   */
  async disconnect() {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit()
        this.isConnected = false
        console.log('Redis连接已断开')
      }
    } catch (error) {
      console.error('断开Redis连接失败:', error)
    }
  }

  /**
   * 设置键值对
   * @param {string} key - 键
   * @param {string|Object} value - 值
   * @param {number} expireSeconds - 过期时间（秒）
   */
  async set(key, value, expireSeconds = null) {
    try {
      await this.ensureConnected()
      
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : value
      
      if (expireSeconds) {
        await this.client.setEx(key, expireSeconds, stringValue)
      } else {
        await this.client.set(key, stringValue)
      }
      
      console.log(`Redis设置成功: ${key}`)
    } catch (error) {
      console.error('Redis设置失败:', error)
      throw error
    }
  }

  /**
   * 获取值
   * @param {string} key - 键
   * @returns {string|Object|null} 值
   */
  async get(key) {
    try {
      await this.ensureConnected()
      
      const value = await this.client.get(key)
      
      if (value === null) {
        return null
      }
      
      // 尝试解析为JSON
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    } catch (error) {
      console.error('Redis获取失败:', error)
      throw error
    }
  }

  /**
   * 删除键
   * @param {string} key - 键
   */
  async del(key) {
    try {
      await this.ensureConnected()
      
      const result = await this.client.del(key)
      console.log(`Redis删除成功: ${key}, 影响行数: ${result}`)
      return result
    } catch (error) {
      console.error('Redis删除失败:', error)
      throw error
    }
  }

  /**
   * 检查键是否存在
   * @param {string} key - 键
   * @returns {boolean} 是否存在
   */
  async exists(key) {
    try {
      await this.ensureConnected()
      
      const result = await this.client.exists(key)
      return result === 1
    } catch (error) {
      console.error('Redis检查键存在失败:', error)
      throw error
    }
  }

  /**
   * 设置过期时间
   * @param {string} key - 键
   * @param {number} seconds - 过期时间（秒）
   */
  async expire(key, seconds) {
    try {
      await this.ensureConnected()
      
      const result = await this.client.expire(key, seconds)
      console.log(`Redis设置过期时间成功: ${key}, ${seconds}秒`)
      return result
    } catch (error) {
      console.error('Redis设置过期时间失败:', error)
      throw error
    }
  }

  /**
   * 获取剩余过期时间
   * @param {string} key - 键
   * @returns {number} 剩余秒数，-1表示永不过期，-2表示键不存在
   */
  async ttl(key) {
    try {
      await this.ensureConnected()
      
      const result = await this.client.ttl(key)
      return result
    } catch (error) {
      console.error('Redis获取TTL失败:', error)
      throw error
    }
  }

  /**
   * 确保Redis连接
   */
  async ensureConnected() {
    if (!this.client || !this.isConnected) {
      await this.connect()
    }
  }

  /**
   * 获取Redis客户端实例
   * @returns {Object} Redis客户端
   */
  getClient() {
    return this.client
  }

  /**
   * 检查连接状态
   * @returns {boolean} 是否已连接
   */
  isConnectedToRedis() {
    return this.isConnected
  }
}

// 创建单例实例
const redisService = new RedisService()

module.exports = redisService


