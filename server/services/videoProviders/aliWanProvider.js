const axios = require('axios');

/**
 * 阿里 Wan(万相视频) Provider
 * 
 * 支持的模型类型：
 * - text-to-video: wan2.5-t2v-preview, wan2.2-t2v-plus, wanx2.1-t2v-turbo, wanx2.1-t2v-plus
 * - image-to-video-first: wan2.5-i2v-preview, wan2.2-i2v-plus, wan2.2-i2v-flash, wanx2.1-i2v-turbo, wanx2.1-i2v-plus
 * - image-to-video-both: wanx2.1-kf2v-plus
 * 
 * Wan 特有参数：
 * - size: 具体分辨率（如 "1920x1080"）
 * - negative_prompt: 负面提示词
 * - prompt_extend: 是否启用提示重写
 * - watermark: 是否添加水印
 * - template: 模板
 */
class AliWanProvider {
  /**
   * 文生视频
   */
  async generateTextToVideo(model, params) {
    try {
      const {
        prompt,
        duration = 5, // 默认 5 秒
        size = '1920x1080', // Wan 使用具体分辨率
        negative_prompt,
        prompt_extend = false,
        watermark = false,
        template,
        seed
      } = params;

      // 根据模型确定时长（wan2.5 系列支持 5-10 秒，其他固定 5 秒）
      const supportedDuration = model.model_id.startsWith('wan2.5') ? duration : 5;
      
      if (duration > 5 && !model.model_id.startsWith('wan2.5')) {
        console.warn(`[Ali Wan] 模型 ${model.model_id} 仅支持 5 秒时长，已自动调整`);
      }

      const requestData = {
        prompt,
        model: model.model_id,
        duration: supportedDuration,
        size,
        watermark,
        prompt_extend
      };

      // 可选参数
      if (negative_prompt) requestData.negative_prompt = negative_prompt;
      if (template) requestData.template = template;
      if (seed !== null && seed !== undefined) requestData.seed = seed;

      console.log('[Ali Wan] 文生视频请求:', {
        model: model.model_id,
        prompt: prompt.substring(0, 50) + '...',
        size,
        watermark,
        prompt_extend
      });

      const response = await axios.post(
        `${model.api_url}/v2/videos/generations`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${model.api_key}`
          },
          timeout: 60000
        }
      );

      if (response.data && response.data.task_id) {
        console.log('[Ali Wan] 任务已提交:', response.data.task_id);
        return response.data.task_id;
      } else {
        throw new Error('API响应格式错误');
      }
    } catch (error) {
      console.error('[Ali Wan] 文生视频失败:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.message);
    }
  }

  /**
   * 图生视频
   */
  async generateImageToVideo(model, params, images) {
    try {
      const {
        prompt,
        duration = 5, // 默认 5 秒
        resolution = '1080P', // Wan 图生视频使用 resolution
        negative_prompt,
        prompt_extend = false,
        watermark = false,
        template,
        seed
      } = params;

      // 检查图片数量
      const isBothFrames = model.model_type === 'image-to-video-both';
      if (isBothFrames && images.length !== 2) {
        throw new Error('首尾帧模式需要2张图片');
      } else if (!isBothFrames && images.length !== 1) {
        throw new Error('首帧模式需要1张图片');
      }

      // images 已经是字符串URL数组，直接使用
      const imageUrls = images;

      // 根据模型确定时长（wan2.5 系列支持 5-10 秒，其他固定 5 秒）
      const supportedDuration = model.model_id.startsWith('wan2.5') ? duration : 5;
      
      if (duration > 5 && !model.model_id.startsWith('wan2.5')) {
        console.warn(`[Ali Wan] 模型 ${model.model_id} 仅支持 5 秒时长，已自动调整`);
      }

      const requestData = {
        prompt,
        model: model.model_id,
        duration: supportedDuration,
        resolution,
        images: imageUrls,
        watermark,
        prompt_extend
      };

      // 可选参数
      if (negative_prompt) requestData.negative_prompt = negative_prompt;
      if (template) requestData.template = template;
      if (seed !== null && seed !== undefined) requestData.seed = seed;

      console.log('[Ali Wan] 图生视频请求:', {
        model: model.model_id,
        prompt: prompt.substring(0, 50) + '...',
        resolution,
        imageCount: imageUrls.length,
        watermark,
        prompt_extend
      });

      const response = await axios.post(
        `${model.api_url}/v2/videos/generations`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${model.api_key}`
          },
          timeout: 60000
        }
      );

      if (response.data && response.data.task_id) {
        console.log('[Ali Wan] 任务已提交:', response.data.task_id);
        return response.data.task_id;
      } else {
        throw new Error('API响应格式错误');
      }
    } catch (error) {
      console.error('[Ali Wan] 图生视频失败:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.message);
    }
  }

  /**
   * 查询任务状态
   */
  async queryTaskStatus(model, taskId) {
    try {
      const response = await axios.get(
        `${model.api_url}/v2/videos/generations/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${model.api_key}`
          },
          timeout: 30000
        }
      );

      return response.data;
    } catch (error) {
      console.error('[Ali Wan] 查询任务状态失败:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.message);
    }
  }

  /**
   * 轮询任务结果
   */
  async pollTaskResult(model, taskId, maxAttempts = 60, interval = 5000) {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const result = await this.queryTaskStatus(model, taskId);

        console.log('[Ali Wan] 任务状态:', {
          taskId,
          status: result.status,
          attempt: attempts + 1
        });

        // 检查任务状态
        // Wan API 状态值：NOT_START, PROCESSING, SUCCESS, FAILED
        if (result.status === 'SUCCESS' || result.status === 'succeeded' || result.status === 'completed') {
          // 成功 - 打印完整响应以便调试
          console.log('[Ali Wan] 任务成功，完整响应:', JSON.stringify(result, null, 2));
          
          // 提取视频URL - 尝试多个可能的字段
          const videoUrl = result.data?.output ||           // Wan API 返回格式
                          result.video_url || 
                          result.url || 
                          result.output_video_url || 
                          result.output?.video_url ||
                          result.result?.video_url ||
                          result.data?.video_url ||
                          result.video?.url;
          
          if (!videoUrl) {
            console.error('[Ali Wan] 任务成功但未找到视频URL，完整响应:', result);
            console.error('[Ali Wan] 可用的键:', Object.keys(result));
            throw new Error('视频生成成功但未返回视频URL');
          }
          
          console.log('[Ali Wan] 找到视频URL:', videoUrl);
          
          return {
            status: 'completed',
            videoUrl: videoUrl,
            url: videoUrl,
            duration: result.duration || 5,
            seed: result.seed
          };
        } else if (result.status === 'FAILED' || result.status === 'failed') {
          // 失败
          throw new Error(result.error || result.message || result.error_message || '视频生成失败');
        } else if (result.status === 'PROCESSING' || result.status === 'processing' || 
                   result.status === 'NOT_START' || result.status === 'pending') {
          // 处理中或未开始，继续轮询
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, interval));
          }
        } else {
          // 未知状态，也继续轮询
          console.warn('[Ali Wan] 未知任务状态:', result.status, '完整响应:', result);
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, interval));
          }
        }
      } catch (error) {
        if (attempts >= maxAttempts - 1) {
          throw error;
        }
        console.warn(`[Ali Wan] 轮询出错，重试中... (${attempts + 1}/${maxAttempts})`);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    throw new Error('视频生成超时');
  }
}

module.exports = new AliWanProvider();

