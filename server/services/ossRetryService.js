/**
 * OSS转存补偿服务
 * 处理实时转存失败的图片，在后台重试
 */

const imageCacheService = require('./imageCacheService');
const ossManager = require('../utils/ossManager');
const { getConnection } = require('../database');

class OssRetryService {
  constructor() {
    this.isRunning = false;
    this.retryInterval = 60000; // 每分钟检查一次
    this.maxRetries = 10; // 最多重试10次
  }

  /**
   * 启动后台补偿服务
   */
  async start() {
    if (this.isRunning) {
      console.log('[OSS补偿服务] 已经在运行中');
      return;
    }

    this.isRunning = true;
    console.log('[OSS补偿服务] 启动成功，每隔', this.retryInterval / 1000, '秒检查一次');

    // 启动定时任务
    this.intervalId = setInterval(() => {
      this.processRetryQueue().catch(error => {
        console.error('[OSS补偿服务] 处理队列失败:', error);
      });
    }, this.retryInterval);

    // 立即执行一次
    this.processRetryQueue().catch(error => {
      console.error('[OSS补偿服务] 首次处理队列失败:', error);
    });
  }

  /**
   * 停止后台补偿服务
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[OSS补偿服务] 已停止');
  }

  /**
   * 处理重试队列
   */
  async processRetryQueue() {
    try {
      const redisClient = imageCacheService.redis.getClient();
      if (!redisClient || !imageCacheService.redis.isConnectedToRedis()) {
        console.log('[OSS补偿服务] Redis未连接，跳过本次检查');
        return;
      }

      // 获取队列长度
      const queueLength = await redisClient.lLen('oss:retry:queue');
      if (queueLength === 0) {
        console.log('[OSS补偿服务] 队列为空，无需处理');
        return;
      }

      console.log(`[OSS补偿服务] 队列中有 ${queueLength} 个待处理任务`);

      // 每次处理最多10个任务
      const batchSize = Math.min(10, queueLength);
      const processedTasks = [];

      for (let i = 0; i < batchSize; i++) {
        // 从队列右侧取出任务（FIFO）
        const taskJson = await redisClient.rPop('oss:retry:queue');
        if (!taskJson) break;

        try {
          const task = JSON.parse(taskJson);
          await this.retryOssTransfer(task);
          processedTasks.push(task);
        } catch (error) {
          console.error('[OSS补偿服务] 处理任务失败:', error);
          // 如果解析或处理失败，不重新加入队列
        }
      }

      console.log(`[OSS补偿服务] 本次处理了 ${processedTasks.length} 个任务`);

    } catch (error) {
      console.error('[OSS补偿服务] 处理队列出错:', error);
    }
  }

  /**
   * 重试OSS转存
   * @param {Object} task - 任务对象
   */
  async retryOssTransfer(task) {
    const { originalUrl, userId, historyRecordId, timestamp, retryCount = 0 } = task;

    console.log(`[OSS补偿] 重试转存图片 (第${retryCount + 1}次): ${originalUrl.substring(0, 50)}...`);

    try {
      // 检查缓存，可能已经被其他进程转存成功了
      const cachedMapping = await imageCacheService.getOssUrlMapping(originalUrl);
      if (cachedMapping && cachedMapping.ossUrl) {
        console.log('[OSS补偿] 图片已在缓存中找到，无需重新转存');

        // 更新数据库中的历史记录
        if (historyRecordId) {
          await this.updateHistoryRecordOssUrl(historyRecordId, originalUrl, cachedMapping.ossUrl);
        }

        return;
      }

      // 检查原始URL是否仍然有效（3天内）
      const urlAge = Date.now() - timestamp;
      const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;

      if (urlAge > threeDaysInMs) {
        console.error('[OSS补偿] 原始URL已过期（超过3天），无法转存:', originalUrl.substring(0, 50));
        return; // 放弃该任务
      }

      // 执行转存
      const ossResults = await ossManager.downloadAndUploadImages(
        [originalUrl],
        userId.toString(),
        'generated-images'
      );

      if (ossResults && ossResults.length > 0 && ossResults[0].url && !ossResults[0].error) {
        const ossUrl = ossResults[0].url;
        console.log('[OSS补偿] 转存成功:', ossUrl);

        // 缓存映射
        await imageCacheService.cacheOssUrlMapping(originalUrl, ossUrl, {
          ossKey: ossResults[0].key,
          size: ossResults[0].size
        });

        // 更新数据库中的历史记录
        if (historyRecordId) {
          await this.updateHistoryRecordOssUrl(historyRecordId, originalUrl, ossUrl);
        }

      } else {
        throw new Error('OSS转存返回结果无效');
      }

    } catch (error) {
      console.error(`[OSS补偿] 转存失败 (第${retryCount + 1}次):`, error.message);

      // 如果还没超过最大重试次数，重新加入队列
      if (retryCount < this.maxRetries) {
        const redisClient = imageCacheService.redis.getClient();
        if (redisClient) {
          await redisClient.lPush('oss:retry:queue', JSON.stringify({
            ...task,
            retryCount: retryCount + 1,
            lastRetryTime: Date.now()
          }));
          console.log(`[OSS补偿] 已重新加入队列，将在下次重试 (${retryCount + 1}/${this.maxRetries})`);
        }
      } else {
        console.error('[OSS补偿] 已达到最大重试次数，放弃该任务');
        // 可以选择记录到失败日志表
      }
    }
  }

  /**
   * 更新历史记录中的OSS URL
   * @param {number} historyRecordId - 历史记录ID
   * @param {string} originalUrl - 原始URL
   * @param {string} ossUrl - OSS URL
   */
  async updateHistoryRecordOssUrl(historyRecordId, originalUrl, ossUrl) {
    try {
      const connection = getConnection();

      // 查询历史记录
      const [rows] = await connection.execute(
        'SELECT generated_images FROM history_records WHERE id = ?',
        [historyRecordId]
      );

      if (rows.length === 0) {
        console.warn('[OSS补偿] 历史记录不存在:', historyRecordId);
        return;
      }

      // 解析JSON
      let generatedImages = [];
      try {
        generatedImages = typeof rows[0].generated_images === 'string'
          ? JSON.parse(rows[0].generated_images)
          : rows[0].generated_images;
      } catch (error) {
        console.error('[OSS补偿] 解析generated_images失败:', error);
        return;
      }

      // 更新匹配的图片URL
      let updated = false;
      generatedImages = generatedImages.map(img => {
        if (img.url === originalUrl || img.originalUrl === originalUrl) {
          updated = true;
          return {
            ...img,
            url: ossUrl,
            ossUrl: ossUrl,
            updatedByRetry: true,
            updatedAt: Date.now()
          };
        }
        return img;
      });

      if (updated) {
        // 保存回数据库
        await connection.execute(
          'UPDATE history_records SET generated_images = ? WHERE id = ?',
          [JSON.stringify(generatedImages), historyRecordId]
        );
        console.log(`[OSS补偿] 已更新历史记录 ${historyRecordId} 的OSS URL`);
      } else {
        console.warn('[OSS补偿] 在历史记录中未找到匹配的图片URL');
      }

    } catch (error) {
      console.error('[OSS补偿] 更新历史记录失败:', error);
    }
  }

  /**
   * 手动触发处理队列
   */
  async processNow() {
    console.log('[OSS补偿服务] 手动触发处理队列');
    return this.processRetryQueue();
  }

  /**
   * 获取队列状态
   */
  async getQueueStatus() {
    try {
      const redisClient = imageCacheService.redis.getClient();
      if (!redisClient || !imageCacheService.redis.isConnectedToRedis()) {
        return { error: 'Redis未连接' };
      }

      const queueLength = await redisClient.lLen('oss:retry:queue');

      return {
        queueLength,
        isRunning: this.isRunning,
        retryInterval: this.retryInterval,
        maxRetries: this.maxRetries
      };
    } catch (error) {
      console.error('[OSS补偿服务] 获取队列状态失败:', error);
      return { error: error.message };
    }
  }

  /**
   * 更新队列中指定URL的historyRecordId
   * @param {Array<string>} originalUrls - 原始URL列表
   * @param {number} historyRecordId - 历史记录ID
   */
  async updateQueueHistoryId(originalUrls, historyRecordId) {
    try {
      const redisClient = imageCacheService.redis.getClient();
      if (!redisClient || !imageCacheService.redis.isConnectedToRedis()) {
        console.warn('[OSS补偿服务] Redis未连接，无法更新队列');
        return;
      }

      // 获取队列中的所有任务
      const queueLength = await redisClient.lLen('oss:retry:queue');
      if (queueLength === 0) return;

      const urlSet = new Set(originalUrls);
      let updatedCount = 0;

      // 遍历队列并更新匹配的任务
      for (let i = 0; i < queueLength; i++) {
        const taskJson = await redisClient.lIndex('oss:retry:queue', i);
        if (!taskJson) continue;

        try {
          const task = JSON.parse(taskJson);

          if (urlSet.has(task.originalUrl) && !task.historyRecordId) {
            // 更新任务
            task.historyRecordId = historyRecordId;

            // 更新队列中的任务
            await redisClient.lSet('oss:retry:queue', i, JSON.stringify(task));
            updatedCount++;
          }
        } catch (error) {
          console.error('[OSS补偿服务] 解析或更新任务失败:', error);
        }
      }

      if (updatedCount > 0) {
        console.log(`[OSS补偿服务] 已更新${updatedCount}个任务的历史记录ID为${historyRecordId}`);
      }

    } catch (error) {
      console.error('[OSS补偿服务] 更新队列历史记录ID失败:', error);
    }
  }
}

// 创建单例实例
const ossRetryService = new OssRetryService();

module.exports = ossRetryService;
