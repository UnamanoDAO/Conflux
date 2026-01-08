const axios = require('axios');

class SoraProvider {
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
        duration = '10',
        aspect_ratio = '16:9',
        hd = false,
        watermark = false
      } = params;

      const requestData = {
        prompt,
        model: model.model_id, // 'sora-2' 或 'sora-2-pro'
        aspect_ratio,
        hd,
        duration: duration.toString(),
        watermark
      };

      console.log('[Sora] 文生视频请求:', {
        model: model.model_id,
        prompt: prompt.substring(0, 50) + '...',
        duration,
        aspect_ratio,
        hd,
        watermark
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
        console.log('[Sora] 任务已提交:', response.data.task_id);
        return response.data.task_id;
      } else {
        throw new Error('API响应格式错误');
      }
    } catch (error) {
      console.error('[Sora] 文生视频失败:', error.response?.data || error.message);
      
      // 提取错误信息
      let errorMessage = error.message;
      if (error.response?.data) {
        const data = error.response.data;
        if (data.error) {
          errorMessage = data.error;
        } else if (data.message) {
          errorMessage = data.message;
        }
      }
      
      throw new Error(errorMessage);
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
        duration = '10',
        aspect_ratio = '16:9',
        hd = false,
        watermark = false
      } = params;

      if (!images || images.length === 0) {
        throw new Error('图生视频需要至少一张图片');
      }

      const requestData = {
        prompt,
        model: model.model_id,
        images: images, // 数组形式，支持url或base64
        aspect_ratio,
        hd,
        duration: duration.toString(),
        watermark
      };

      console.log('[Sora] 图生视频请求:', {
        model: model.model_id,
        prompt: prompt.substring(0, 50) + '...',
        imagesCount: images.length,
        duration,
        aspect_ratio,
        hd,
        watermark
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
        console.log('[Sora] 任务已提交:', response.data.task_id);
        return response.data.task_id;
      } else {
        throw new Error('API响应格式错误');
      }
    } catch (error) {
      console.error('[Sora] 图生视频失败:', error.response?.data || error.message);
      
      // 提取错误信息
      let errorMessage = error.message;
      if (error.response?.data) {
        const data = error.response.data;
        if (data.error) {
          errorMessage = data.error;
        } else if (data.message) {
          errorMessage = data.message;
        }
      }
      
      throw new Error(errorMessage);
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

      // 标准化状态响应
      if (status === 'SUCCESS') {
        return {
          status: 'completed',
          taskId: result.task_id || taskId,
          videoUrl: result.data?.output,
          thumbnail: result.data?.thumbnail_url,
          duration: result.data?.duration,
          width: result.data?.width,
          height: result.data?.height,
          progress: result.progress || '100%'
        };
      } else if (status === 'FAILURE') {
        // 解析错误信息
        let errorMessage = '视频生成失败';
        if (result.fail_reason) {
          // 如果 fail_reason 是对象，尝试解析
          if (typeof result.fail_reason === 'object') {
            errorMessage = result.fail_reason.message || JSON.stringify(result.fail_reason);
          } else if (typeof result.fail_reason === 'string') {
            // 尝试解析JSON字符串
            try {
              const parsed = JSON.parse(result.fail_reason);
              errorMessage = parsed.message || result.fail_reason;
            } catch {
              errorMessage = result.fail_reason;
            }
          }
        }
        
        return {
          status: 'failed',
          error: errorMessage
        };
      } else if (status === 'IN_PROGRESS' || status === 'NOT_START') {
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
      console.error('[Sora] 查询任务状态失败:', error.message);
      throw new Error(error.response?.data?.error || error.message);
    }
  }

  /**
   * 轮询查询任务结果（完整流程）- 使用指数退避策略
   * @param {Object} model - 模型配置
   * @param {string} taskId - 任务ID
   * @param {number} maxAttempts - 最大轮询次数（默认120次，约15-20分钟）
   * @param {number} initialInterval - 初始轮询间隔（毫秒）
   * @returns {Promise<Object>} 最终结果
   */
  async pollTaskResult(model, taskId, maxAttempts = 120, initialInterval = 10000) {
    console.log(`[Sora] 开始轮询任务结果，最多查询 ${maxAttempts} 次`);
    console.log('[Sora] 注意：Sora2 生成时间较长 - 10s约1-3分钟，15s+2分钟，HD+8分钟，25s约5-8分钟');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.queryTaskStatus(model, taskId);

        if (result.status === 'completed') {
          console.log(`[Sora] ✅ 视频生成完成（第${attempt}次查询）`);
          return result;
        } else if (result.status === 'failed') {
          console.log(`[Sora] ❌ 视频生成失败（第${attempt}次查询）: ${result.error}`);
          throw new Error(result.error);
        } else if (result.status === 'processing') {
          // 使用指数退避策略
          // 前10次：10秒，11-30次：15秒，31次以后：20秒
          let waitTime = initialInterval;
          if (attempt > 30) {
            waitTime = initialInterval * 2; // 20秒
          } else if (attempt > 10) {
            waitTime = initialInterval * 1.5; // 15秒
          }
          
          const progress = result.progress ? ` (进度: ${result.progress})` : '';
          console.log(`[Sora] ⏳ 第${attempt}/${maxAttempts}次查询 - 生成中${progress}，${waitTime/1000}秒后重试...`);
          
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        } else {
          console.log(`[Sora] ⚠️  未知状态: ${result.status}，继续等待...`);
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, initialInterval));
          }
        }
      } catch (error) {
        console.error(`[Sora] ⚠️  第${attempt}次查询出错:`, error.message);
        
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

module.exports = new SoraProvider();

