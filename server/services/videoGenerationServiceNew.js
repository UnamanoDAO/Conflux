const videoModelService = require('./videoModelService');
const { getProvider } = require('./videoProviders');
const videoOSSService = require('./videoOSSService');
const referenceImageOSS = require('./referenceImageOSS');

class VideoGenerationService {
  /**
   * 生成视频 - 统一接口
   * @param {number} modelDbId - 数据库中的模型ID
   * @param {Object} params - 生成参数
   * @param {string} userId - 用户ID（可选）
   * @returns {Promise<Object>} 生成结果
   */
  async generateVideo(modelDbId, params, userId = 'guest') {
    try {
      // 1. 从数据库获取模型配置
      const model = await videoModelService.getModelById(modelDbId);
      if (!model) {
        throw new Error('模型不存在');
      }

      if (!model.is_active) {
        throw new Error('模型已被禁用');
      }

      console.log(`[VideoGen] 使用模型: ${model.name} (${model.provider})`);

      // 2. 处理图片上传（如果有）
      const images = await this.processImages(params.firstFrame, params.lastFrame, userId);

      // 3. 获取对应厂商的适配器
      const provider = getProvider(model.provider);

      // 4. 根据模型类型调用相应的生成方法
      let taskId;
      if (model.model_type === 'text-to-video') {
        // 文生视频
        taskId = await provider.generateTextToVideo(model, {
          prompt: params.prompt,
          duration: params.duration,
          resolution: params.resolution,
          ratio: params.ratio,
          watermark: params.watermark,
          seed: params.seed,
          camerafixed: params.camerafixed,
          return_last_frame: params.return_last_frame,
          enhance_prompt: params.enhance_prompt,
          enable_upsample: params.enable_upsample,
          negative_prompt: params.negative_prompt, // Wan专用
          prompt_extend: params.prompt_extend, // Wan专用
          size: params.size, // Wan专用
          hd: params.hd, // Sora2专用
          aspect_ratio: params.aspect_ratio // Sora2专用
        });
      } else {
        // 图生视频（首帧或首尾帧）
        if (!images || images.length === 0) {
          throw new Error('图生视频需要上传图片');
        }

        taskId = await provider.generateImageToVideo(model, {
          prompt: params.prompt,
          duration: params.duration,
          resolution: params.resolution,
          ratio: params.ratio,
          watermark: params.watermark,
          seed: params.seed,
          camerafixed: params.camerafixed,
          return_last_frame: params.return_last_frame,
          enhance_prompt: params.enhance_prompt,
          enable_upsample: params.enable_upsample,
          negative_prompt: params.negative_prompt, // Wan专用
          prompt_extend: params.prompt_extend, // Wan专用
          size: params.size, // Wan专用（图生视频用 resolution）
          hd: params.hd, // Sora2专用
          aspect_ratio: params.aspect_ratio // Sora2专用
        }, images);
      }

      console.log(`[VideoGen] 任务已提交: ${taskId}`);

      // 5. 轮询等待生成完成
      const result = await provider.pollTaskResult(model, taskId);

      // 6. 转存视频到OSS
      console.log('[VideoGen] 开始转存视频到OSS...');
      try {
        const ossResult = await videoOSSService.uploadVideoFromUrl(
          result.videoUrl,
          taskId,
          userId
        );

        // 使用OSS URL替换原始URL
        result.videoUrl = ossResult.url;
        result.ossKey = ossResult.key;
        result.originalUrl = ossResult.originalUrl;
        result.videoSize = ossResult.size;

        console.log('[VideoGen] 视频已转存到OSS');
      } catch (ossError) {
        console.error('[VideoGen] OSS转存失败，保留原始URL:', ossError.message);
        // OSS转存失败不影响整体流程，继续返回原始URL
        result.ossError = ossError.message;
      }

      return {
        taskId,
        status: 'completed',
        url: result.videoUrl,
        thumbnail: result.thumbnail,
        duration: result.duration,
        resolution: result.resolution,
        ratio: result.ratio,
        fps: result.fps,
        seed: result.seed,
        ossKey: result.ossKey,
        videoSize: result.videoSize,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('[VideoGen] 视频生成失败:', error.message);
      throw error;
    }
  }

  /**
   * 处理图片上传
   * @param {Object} firstFrame - 首帧图片
   * @param {Object} lastFrame - 尾帧图片（可选）
   * @param {string} userId - 用户ID
   * @returns {Promise<Array<string>>} 图片URL数组
   */
  async processImages(firstFrame, lastFrame, userId) {
    const sharp = require('sharp');
    const images = [];

    try {
      if (firstFrame) {
        // 验证首帧图片尺寸
        console.log('[VideoGen] 验证首帧图片尺寸...');
        const firstMetadata = await sharp(firstFrame.buffer).metadata();
        console.log(`[VideoGen] 首帧图片尺寸: ${firstMetadata.width}x${firstMetadata.height}`);
        
        if (firstMetadata.height < 300 || firstMetadata.width < 300) {
          throw new Error(`图片尺寸不符合要求：当前为 ${firstMetadata.width}x${firstMetadata.height}，最小要求 300x300 像素`);
        }
        
        console.log('[VideoGen] 上传首帧图片到OSS...');
        const firstFrameResult = await referenceImageOSS.uploadReferenceImage(
          firstFrame.buffer,
          firstFrame.originalname,
          userId,
          { 
            compress: false, // 不压缩，保持原始质量
            generateThumbnail: false // 不生成缩略图
          }
        );
        images.push(firstFrameResult.url);
        console.log('[VideoGen] 首帧图片已上传');
      }

      if (lastFrame) {
        // 验证尾帧图片尺寸
        console.log('[VideoGen] 验证尾帧图片尺寸...');
        const lastMetadata = await sharp(lastFrame.buffer).metadata();
        console.log(`[VideoGen] 尾帧图片尺寸: ${lastMetadata.width}x${lastMetadata.height}`);
        
        if (lastMetadata.height < 300 || lastMetadata.width < 300) {
          throw new Error(`图片尺寸不符合要求：当前为 ${lastMetadata.width}x${lastMetadata.height}，最小要求 300x300 像素`);
        }
        
        console.log('[VideoGen] 上传尾帧图片到OSS...');
        const lastFrameResult = await referenceImageOSS.uploadReferenceImage(
          lastFrame.buffer,
          lastFrame.originalname,
          userId,
          { 
            compress: false,
            generateThumbnail: false
          }
        );
        images.push(lastFrameResult.url);
        console.log('[VideoGen] 尾帧图片已上传');
      }

      return images;
    } catch (error) {
      console.error('[VideoGen] 图片处理失败:', error.message);
      throw error;
    }
  }

  /**
   * 查询任务状态（供轮询使用）
   * @param {number} modelDbId - 数据库中的模型ID
   * @param {string} taskId - 任务ID
   * @returns {Promise<Object>} 任务状态
   */
  async queryTaskStatus(modelDbId, taskId) {
    try {
      const model = await videoModelService.getModelById(modelDbId);
      if (!model) {
        throw new Error('模型不存在');
      }

      const provider = getProvider(model.provider);
      return await provider.queryTaskStatus(model, taskId);
    } catch (error) {
      console.error('[VideoGen] 查询任务状态失败:', error.message);
      throw error;
    }
  }
}

module.exports = new VideoGenerationService();

