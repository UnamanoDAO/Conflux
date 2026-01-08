const axios = require('axios');

class GoogleVeoProvider {
  /**
   * 文生视频
   * @param {Object} model - 模型配置
   * @param {Object} params - 生成参数
   * @returns {Promise<string>} 任务ID
   */
  async generateTextToVideo(model, params) {
    try {
      const {
        prompt,
        ratio = '16:9',
        enhance_prompt = true,
        enable_upsample = false
      } = params;

      const requestData = {
        prompt,
        model: model.model_id,
        aspect_ratio: ratio, // 映射 ratio -> aspect_ratio
        enhance_prompt: enhance_prompt,
        enable_upsample: enable_upsample
      };

      console.log('[Google VEO] 文生视频请求:', {
        model: model.model_id,
        prompt: prompt.substring(0, 50) + '...',
        aspect_ratio: ratio,
        enhance_prompt,
        enable_upsample
      });

      const response = await axios.post(
        `${model.api_url}/v2/videos/generations`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${model.api_key}`
          },
          timeout: 30000
        }
      );

      if (response.data && response.data.task_id) {
        console.log('[Google VEO] 任务已提交:', response.data.task_id);
        return response.data.task_id;
      } else {
        throw new Error('API响应格式错误');
      }
    } catch (error) {
      console.error('[Google VEO] 文生视频失败:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.message);
    }
  }

  /**
   * 图生视频
   * @param {Object} model - 模型配置
   * @param {Object} params - 生成参数
   * @param {Array} images - 图片URL数组
   * @returns {Promise<string>} 任务ID
   */
  async generateImageToVideo(model, params, images) {
    try {
      const {
        prompt,
        ratio = '16:9',
        enhance_prompt = true,
        enable_upsample = false
      } = params;

      if (!images || images.length === 0) {
        throw new Error('图生视频需要至少一张图片');
      }

      // 验证图片数量限制
      const modelId = model.model_id.toLowerCase();
      if (modelId.includes('veo3-pro-frames') && images.length > 1) {
        throw new Error('veo3-pro-frames 模型最多支持1张图片（首帧）');
      }
      if (modelId.includes('veo3-fast-frames') && images.length > 2) {
        throw new Error('veo3-fast-frames 模型最多支持2张图片（首帧和尾帧）');
      }
      if (modelId.includes('veo2-fast-frames') && images.length > 2) {
        throw new Error('veo2-fast-frames 模型最多支持2张图片（首帧和尾帧）');
      }
      if (modelId.includes('veo2-fast-components') && images.length > 3) {
        throw new Error('veo2-fast-components 模型最多支持3张图片');
      }

      const requestData = {
        prompt,
        model: model.model_id,
        images: images,
        enhance_prompt: enhance_prompt
      };

      // aspect_ratio 和 enable_upsample 只在特定模型下可用
      if (ratio) {
        requestData.aspect_ratio = ratio;
      }
      if (enable_upsample !== undefined) {
        requestData.enable_upsample = enable_upsample;
      }

      console.log('[Google VEO] 图生视频请求:', {
        model: model.model_id,
        prompt: prompt.substring(0, 50) + '...',
        imagesCount: images.length,
        enhance_prompt
      });

      const response = await axios.post(
        `${model.api_url}/v2/videos/generations`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${model.api_key}`
          },
          timeout: 30000
        }
      );

      if (response.data && response.data.task_id) {
        console.log('[Google VEO] 任务已提交:', response.data.task_id);
        return response.data.task_id;
      } else {
        throw new Error('API响应格式错误');
      }
    } catch (error) {
      console.error('[Google VEO] 图生视频失败:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.message);
    }
  }

  /**
   * 查询任务状态
   * @param {Object} model - 模型配置
   * @param {string} taskId - 任务ID
   * @returns {Promise<Object>} 任务状态信息
   */
  async queryTaskStatus(model, taskId) {
    try {
      const response = await axios.get(
        `${model.api_url}/v2/videos/generations/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${model.api_key}`
          },
          timeout: 10000
        }
      );

      const result = response.data;
      const status = result.status?.toUpperCase();

      console.log('[Google VEO] 查询状态:', {
        taskId,
        status,
        progress: result.progress
      });

      // 标准化状态响应
      if (status === 'SUCCESS' || status === 'COMPLETED') {
        const completedResult = {
          status: 'completed',
          taskId: result.task_id || taskId,
          videoUrl: result.data?.output,
          platform: result.platform,
          duration: result.data?.duration,
          progress: result.progress
        };

        console.log('[Google VEO] 视频生成完成:', {
          videoUrl: completedResult.videoUrl
        });

        return completedResult;
      } else if (status === 'FAILURE' || status === 'FAILED') {
        return {
          status: 'failed',
          error: result.fail_reason || result.error || '视频生成失败'
        };
      } else if (status === 'IN_PROGRESS' || status === 'PROCESSING' || status === 'NOT_START') {
        return {
          status: 'processing',
          progress: result.progress || null
        };
      } else {
        return {
          status: 'unknown',
          rawStatus: result.status
        };
      }
    } catch (error) {
      console.error('[Google VEO] 查询任务状态失败:', error.message);
      throw new Error(error.response?.data?.error || error.message);
    }
  }

  /**
   * 轮询查询任务结果（完整流程）- 使用指数退避策略
   * @param {Object} model - 模型配置
   * @param {string} taskId - 任务ID
   * @param {number} maxAttempts - 最大轮询次数
   * @param {number} initialInterval - 初始轮询间隔（毫秒）
   * @returns {Promise<Object>} 最终结果
   */
  async pollTaskResult(model, taskId, maxAttempts = 60, initialInterval = 10000) {
    console.log(`[Google VEO] 开始轮询任务结果，最多查询 ${maxAttempts} 次`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.queryTaskStatus(model, taskId);

        if (result.status === 'completed') {
          console.log(`[Google VEO] ✅ 视频生成完成（第${attempt}次查询）`);
          return result;
        } else if (result.status === 'failed') {
          console.log(`[Google VEO] ❌ 视频生成失败（第${attempt}次查询）: ${result.error}`);
          throw new Error(result.error);
        } else if (result.status === 'processing') {
          // 使用指数退避策略计算等待时间
          // 前10次：10秒，11-20次：15秒，21次以后：20秒
          let waitTime = initialInterval;
          if (attempt > 20) {
            waitTime = initialInterval * 2; // 20秒
          } else if (attempt > 10) {
            waitTime = initialInterval * 1.5; // 15秒
          }
          
          const progress = result.progress ? ` (进度: ${result.progress})` : '';
          console.log(`[Google VEO] ⏳ 第${attempt}/${maxAttempts}次查询 - 生成中${progress}，${waitTime/1000}秒后重试...`);
          
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        } else {
          console.log(`[Google VEO] ⚠️  未知状态: ${result.status}，继续等待...`);
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, initialInterval));
          }
        }
      } catch (error) {
        console.error(`[Google VEO] ⚠️  第${attempt}次查询出错:`, error.message);
        
        if (attempt >= maxAttempts) {
          throw new Error(`视频生成超时（已查询${maxAttempts}次，约${maxAttempts * initialInterval / 60000}分钟）`);
        }
        
        // 非最后一次尝试，继续等待
        await new Promise(resolve => setTimeout(resolve, initialInterval));
      }
    }

    throw new Error(`视频生成超时（已查询${maxAttempts}次，约${maxAttempts * initialInterval / 60000}分钟）`);
  }
}

module.exports = new GoogleVeoProvider();

