const OSS = require('ali-oss');
const axios = require('axios');
const config = require('../config');
const path = require('path');
const stream = require('stream');
const { promisify } = require('util');

const pipeline = promisify(stream.pipeline);

class VideoOSSService {
  constructor() {
    this.client = new OSS({
      region: config.oss.region,
      accessKeyId: config.oss.accessKeyId,
      accessKeySecret: config.oss.accessKeySecret,
      bucket: config.oss.bucket,
      endpoint: config.oss.endpoint
    });
  }

  /**
   * 从URL下载视频并上传到OSS
   * @param {string} videoUrl - 原始视频URL
   * @param {string} taskId - 任务ID（用于生成文件名）
   * @param {string} userId - 用户ID（可选）
   * @returns {Promise<{url: string, key: string, size: number}>}
   */
  async uploadVideoFromUrl(videoUrl, taskId, userId = 'guest') {
    try {
      console.log('[VideoOSS] 开始下载视频:', videoUrl);

      // 下载视频
      const response = await axios({
        method: 'get',
        url: videoUrl,
        responseType: 'stream',
        timeout: 600000, // 10分钟超时（视频文件可能较大）
        maxContentLength: 500 * 1024 * 1024 // 最大500MB
      });

      // 从响应头获取内容类型和大小
      const contentType = response.headers['content-type'] || 'video/mp4';
      const contentLength = parseInt(response.headers['content-length'] || '0');

      console.log('[VideoOSS] 视频大小:', (contentLength / 1024 / 1024).toFixed(2), 'MB');

      // 生成唯一的文件名
      const timestamp = Date.now();
      const ext = this.getExtensionFromUrl(videoUrl) || '.mp4';
      const uniqueFileName = `videos/${userId}/${timestamp}_${taskId}${ext}`;

      // 使用流式上传到OSS
      console.log('[VideoOSS] 开始上传到OSS:', uniqueFileName);
      const result = await this.client.putStream(uniqueFileName, response.data, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000' // 1年缓存
        },
        timeout: 600000 // 10分钟超时
      });

      console.log('[VideoOSS] 上传成功:', result.url);

      return {
        url: result.url,
        key: uniqueFileName,
        size: contentLength,
        originalUrl: videoUrl
      };
    } catch (error) {
      console.error('[VideoOSS] 上传视频失败:', error.message);
      
      // 如果是下载失败，返回更具体的错误
      if (error.code === 'ECONNABORTED') {
        throw new Error('下载视频超时，请稍后重试');
      } else if (error.response?.status === 404) {
        throw new Error('原始视频不存在或已过期');
      } else if (error.response?.status === 403) {
        throw new Error('无权访问原始视频');
      }
      
      throw error;
    }
  }

  /**
   * 从URL提取文件扩展名
   * @param {string} url - URL
   * @returns {string} 扩展名（包含点）
   */
  getExtensionFromUrl(url) {
    try {
      const pathname = new URL(url).pathname;
      const ext = path.extname(pathname);
      
      // 如果有扩展名且是常见视频格式，返回
      const videoExts = ['.mp4', '.webm', '.avi', '.mov', '.mkv'];
      if (videoExts.includes(ext.toLowerCase())) {
        return ext;
      }
      
      // 默认返回 .mp4
      return '.mp4';
    } catch (error) {
      return '.mp4';
    }
  }

  /**
   * 删除OSS上的视频
   * @param {string} key - OSS文件key
   * @returns {Promise<boolean>}
   */
  async deleteVideo(key) {
    try {
      await this.client.delete(key);
      console.log('[VideoOSS] 删除视频成功:', key);
      return true;
    } catch (error) {
      console.error('[VideoOSS] 删除视频失败:', error.message);
      return false;
    }
  }

  /**
   * 获取视频的临时访问URL（带签名）
   * @param {string} key - OSS文件key
   * @param {number} expires - 过期时间（秒），默认1小时
   * @returns {string} 签名URL
   */
  getSignedUrl(key, expires = 3600) {
    try {
      return this.client.signatureUrl(key, {
        expires: expires
      });
    } catch (error) {
      console.error('[VideoOSS] 生成签名URL失败:', error.message);
      throw error;
    }
  }

  /**
   * 检查视频是否存在
   * @param {string} key - OSS文件key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    try {
      await this.client.head(key);
      return true;
    } catch (error) {
      if (error.code === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }

  /**
   * 批量删除视频
   * @param {Array<string>} keys - OSS文件key数组
   * @returns {Promise<{success: number, failed: number}>}
   */
  async batchDeleteVideos(keys) {
    try {
      const result = await this.client.deleteMulti(keys, {
        quiet: true
      });

      return {
        success: keys.length - (result.deleted?.length || 0),
        failed: result.deleted?.length || 0
      };
    } catch (error) {
      console.error('[VideoOSS] 批量删除视频失败:', error.message);
      throw error;
    }
  }
}

module.exports = new VideoOSSService();

