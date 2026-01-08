const redisService = require('./redisService');

/**
 * 图片生成缓存服务
 * 使用Redis缓存减少数据库压力和重复OSS转存
 */
class ImageCacheService {
  constructor() {
    this.redis = redisService;
    // 如果Redis不可用，使用内存缓存作为降级方案
    this.memoryCache = new Map();
  }

  /**
   * 初始化连接
   */
  async init() {
    try {
      await this.redis.connect();
      console.log('图片缓存服务初始化成功');
    } catch (error) {
      console.warn('Redis连接失败，将使用内存缓存:', error.message);
    }
  }

  /**
   * 缓存原始URL到OSS URL的映射
   * @param {string} originalUrl - 原始图片URL
   * @param {string} ossUrl - OSS URL
   * @param {Object} metadata - 元数据（ossKey, size等）
   */
  async cacheOssUrlMapping(originalUrl, ossUrl, metadata = {}) {
    try {
      const key = `oss:mapping:${this.hashUrl(originalUrl)}`;
      const value = {
        originalUrl,
        ossUrl,
        ...metadata,
        cachedAt: Date.now()
      };

      // 缓存30天，因为原始URL有效期是3天，超过后也不会再访问
      await this.redis.set(key, value, 30 * 24 * 3600);
      return true;
    } catch (error) {
      console.error('缓存OSS URL映射失败:', error);
      // 降级到内存缓存
      this.memoryCache.set(originalUrl, { ossUrl, ...metadata });
      return false;
    }
  }

  /**
   * 获取原始URL对应的OSS URL
   * @param {string} originalUrl - 原始图片URL
   * @returns {Object|null} OSS URL映射信息
   */
  async getOssUrlMapping(originalUrl) {
    try {
      const key = `oss:mapping:${this.hashUrl(originalUrl)}`;
      const cached = await this.redis.get(key);

      if (cached) {
        console.log('从Redis缓存获取OSS URL映射:', originalUrl.substring(0, 50));
        return cached;
      }

      // 尝试从内存缓存获取
      if (this.memoryCache.has(originalUrl)) {
        return this.memoryCache.get(originalUrl);
      }

      return null;
    } catch (error) {
      console.error('获取OSS URL映射失败:', error);
      return this.memoryCache.get(originalUrl) || null;
    }
  }

  /**
   * 缓存用户的常用提示词列表
   * @param {number} userId - 用户ID
   * @param {Array} prompts - 提示词列表
   */
  async cacheUserCommonPrompts(userId, prompts) {
    try {
      const key = `user:${userId}:common_prompts`;
      // 缓存1小时
      await this.redis.set(key, prompts, 3600);
      return true;
    } catch (error) {
      console.error('缓存常用提示词失败:', error);
      return false;
    }
  }

  /**
   * 获取用户的常用提示词列表
   * @param {number} userId - 用户ID
   * @returns {Array|null} 提示词列表
   */
  async getUserCommonPrompts(userId) {
    try {
      const key = `user:${userId}:common_prompts`;
      return await this.redis.get(key);
    } catch (error) {
      console.error('获取缓存的常用提示词失败:', error);
      return null;
    }
  }

  /**
   * 缓存用户的参考图列表
   * @param {number} userId - 用户ID
   * @param {Array} images - 参考图列表
   */
  async cacheUserReferenceImages(userId, images) {
    try {
      const key = `user:${userId}:reference_images`;
      // 缓存1小时
      await this.redis.set(key, images, 3600);
      return true;
    } catch (error) {
      console.error('缓存参考图列表失败:', error);
      return false;
    }
  }

  /**
   * 获取用户的参考图列表
   * @param {number} userId - 用户ID
   * @returns {Array|null} 参考图列表
   */
  async getUserReferenceImages(userId) {
    try {
      const key = `user:${userId}:reference_images`;
      return await this.redis.get(key);
    } catch (error) {
      console.error('获取缓存的参考图失败:', error);
      return null;
    }
  }

  /**
   * 缓存用户历史记录（分页）
   * @param {number} userId - 用户ID
   * @param {number} page - 页码
   * @param {number} pageSize - 每页大小
   * @param {string} contentType - 内容类型（image/video/all）
   * @param {Array} history - 历史记录
   */
  async cacheUserHistory(userId, page, pageSize, contentType, history) {
    try {
      const key = `user:${userId}:history:${contentType}:page:${page}:size:${pageSize}`;
      // 缓存5分钟，历史记录变化频繁
      await this.redis.set(key, history, 300);
      console.log(`缓存历史记录: 用户${userId}, 页码${page}, 类型${contentType}`);
      return true;
    } catch (error) {
      console.error('缓存历史记录失败:', error);
      return false;
    }
  }

  /**
   * 获取用户历史记录（分页）
   * @param {number} userId - 用户ID
   * @param {number} page - 页码
   * @param {number} pageSize - 每页大小
   * @param {string} contentType - 内容类型
   * @returns {Array|null} 历史记录
   */
  async getUserHistory(userId, page, pageSize, contentType) {
    try {
      const key = `user:${userId}:history:${contentType}:page:${page}:size:${pageSize}`;
      const cached = await this.redis.get(key);
      if (cached) {
        console.log(`从缓存获取历史记录: 用户${userId}, 页码${page}`);
      }
      return cached;
    } catch (error) {
      console.error('获取缓存的历史记录失败:', error);
      return null;
    }
  }

  /**
   * 缓存AI模型列表
   * @param {string} type - 模型类型（image/video）
   * @param {Array} models - 模型列表
   */
  async cacheModelList(type, models) {
    try {
      const key = `models:${type}`;
      // 缓存24小时，模型列表变化很少
      await this.redis.set(key, models, 86400);
      console.log(`缓存${type}模型列表:`, models.length, '个模型');
      return true;
    } catch (error) {
      console.error('缓存模型列表失败:', error);
      return false;
    }
  }

  /**
   * 获取AI模型列表
   * @param {string} type - 模型类型
   * @returns {Array|null} 模型列表
   */
  async getModelList(type) {
    try {
      const key = `models:${type}`;
      const cached = await this.redis.get(key);
      if (cached) {
        console.log(`从缓存获取${type}模型列表:`, cached.length, '个模型');
      }
      return cached;
    } catch (error) {
      console.error('获取缓存的模型列表失败:', error);
      return null;
    }
  }

  /**
   * 缓存作品列表（公开作品）
   * @param {Object} filters - 筛选条件
   * @param {number} page - 页码
   * @param {Array} works - 作品列表
   */
  async cachePublicWorks(filters, page, works) {
    try {
      const filterKey = JSON.stringify(filters);
      const key = `works:public:${this.hashUrl(filterKey)}:page:${page}`;
      // 缓存10分钟
      await this.redis.set(key, works, 600);
      console.log(`缓存公开作品: 页码${page}`);
      return true;
    } catch (error) {
      console.error('缓存公开作品失败:', error);
      return false;
    }
  }

  /**
   * 获取作品列表（公开作品）
   * @param {Object} filters - 筛选条件
   * @param {number} page - 页码
   * @returns {Array|null} 作品列表
   */
  async getPublicWorks(filters, page) {
    try {
      const filterKey = JSON.stringify(filters);
      const key = `works:public:${this.hashUrl(filterKey)}:page:${page}`;
      return await this.redis.get(key);
    } catch (error) {
      console.error('获取缓存的公开作品失败:', error);
      return null;
    }
  }

  /**
   * 缓存用户积分余额
   * @param {number} userId - 用户ID
   * @param {number} credits - 积分余额
   */
  async cacheUserCredits(userId, credits) {
    try {
      const key = `user:${userId}:credits`;
      // 缓存30秒，积分变化频繁
      await this.redis.set(key, credits, 30);
      return true;
    } catch (error) {
      console.error('缓存用户积分失败:', error);
      return false;
    }
  }

  /**
   * 获取用户积分余额
   * @param {number} userId - 用户ID
   * @returns {number|null} 积分余额
   */
  async getUserCredits(userId) {
    try {
      const key = `user:${userId}:credits`;
      return await this.redis.get(key);
    } catch (error) {
      console.error('获取缓存的用户积分失败:', error);
      return null;
    }
  }

  /**
   * 使缓存失效（当数据更新时）
   * @param {string} pattern - 键模式
   */
  async invalidateCache(pattern) {
    try {
      // 注意：KEYS命令在生产环境可能影响性能，考虑使用SCAN
      const client = this.redis.getClient();
      if (client && this.redis.isConnectedToRedis()) {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
          await Promise.all(keys.map(key => this.redis.del(key)));
          console.log(`清除缓存: ${pattern}, 共${keys.length}个键`);
        }
      }
      return true;
    } catch (error) {
      console.error('清除缓存失败:', error);
      return false;
    }
  }

  /**
   * 清除用户相关的所有缓存
   * @param {number} userId - 用户ID
   */
  async clearUserCache(userId) {
    try {
      // 清除用户相关的所有缓存
      await this.invalidateCache(`user:${userId}:*`);
      console.log(`已清除用户 ${userId} 的所有缓存`);
      return true;
    } catch (error) {
      console.error('清除用户缓存失败:', error);
      return false;
    }
  }

  /**
   * 清除历史记录缓存（当添加新历史时）
   * @param {number} userId - 用户ID
   */
  async clearHistoryCache(userId) {
    try {
      await this.invalidateCache(`user:${userId}:history:*`);
      console.log(`已清除用户 ${userId} 的历史记录缓存`);
      return true;
    } catch (error) {
      console.error('清除历史记录缓存失败:', error);
      return false;
    }
  }

  /**
   * 清除提示词缓存（当添加/修改/删除提示词时）
   * @param {number} userId - 用户ID
   */
  async clearPromptsCache(userId) {
    try {
      await this.redis.del(`user:${userId}:common_prompts`);
      console.log(`已清除用户 ${userId} 的提示词缓存`);
      return true;
    } catch (error) {
      console.error('清除提示词缓存失败:', error);
      return false;
    }
  }

  /**
   * 清除参考图缓存（当添加/删除参考图时）
   * @param {number} userId - 用户ID
   */
  async clearReferenceImagesCache(userId) {
    try {
      await this.redis.del(`user:${userId}:reference_images`);
      console.log(`已清除用户 ${userId} 的参考图缓存`);
      return true;
    } catch (error) {
      console.error('清除参考图缓存失败:', error);
      return false;
    }
  }

  /**
   * 清除模型列表缓存（当模型列表更新时）
   */
  async clearModelCache() {
    try {
      await this.invalidateCache(`models:*`);
      console.log('已清除所有模型列表缓存');
      return true;
    } catch (error) {
      console.error('清除模型缓存失败:', error);
      return false;
    }
  }

  /**
   * 清除公开作品缓存（当发布/取消发布作品时）
   */
  async clearPublicWorksCache() {
    try {
      await this.invalidateCache(`works:public:*`);
      console.log('已清除公开作品缓存');
      return true;
    } catch (error) {
      console.error('清除公开作品缓存失败:', error);
      return false;
    }
  }

  /**
   * URL哈希函数（用于生成缓存键）
   * @param {string} url - URL
   * @returns {string} 哈希值
   */
  hashUrl(url) {
    // 简单的哈希函数，将URL转换为固定长度的字符串
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 缓存图片生成任务状态
   * @param {string} taskId - 任务ID
   * @param {Object} taskData - 任务数据
   */
  async cacheImageTask(taskId, taskData) {
    try {
      const key = `image:task:${taskId}`;
      // 缓存24小时
      await this.redis.set(key, taskData, 86400);
      return true;
    } catch (error) {
      console.error('缓存图片任务失败:', error);
      return false;
    }
  }

  /**
   * 获取图片生成任务状态
   * @param {string} taskId - 任务ID
   * @returns {Object|null} 任务数据
   */
  async getImageTask(taskId) {
    try {
      const key = `image:task:${taskId}`;
      return await this.redis.get(key);
    } catch (error) {
      console.error('获取缓存的图片任务失败:', error);
      return null;
    }
  }

  /**
   * 批量缓存OSS URL映射
   * @param {Array} mappings - 映射数组 [{originalUrl, ossUrl, metadata}]
   */
  async batchCacheOssUrlMapping(mappings) {
    try {
      const promises = mappings.map(({ originalUrl, ossUrl, metadata }) =>
        this.cacheOssUrlMapping(originalUrl, ossUrl, metadata)
      );
      await Promise.all(promises);
      console.log(`批量缓存 ${mappings.length} 个OSS URL映射`);
      return true;
    } catch (error) {
      console.error('批量缓存OSS URL映射失败:', error);
      return false;
    }
  }

  /**
   * 清理过期的内存缓存
   */
  cleanupMemoryCache() {
    // 限制内存缓存大小
    if (this.memoryCache.size > 1000) {
      // 删除最早的500个条目
      const keysToDelete = Array.from(this.memoryCache.keys()).slice(0, 500);
      keysToDelete.forEach(key => this.memoryCache.delete(key));
      console.log('清理内存缓存:', keysToDelete.length, '个条目');
    }
  }
}

// 创建单例实例
const imageCacheService = new ImageCacheService();

module.exports = imageCacheService;
