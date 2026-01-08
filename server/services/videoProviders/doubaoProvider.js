const axios = require('axios');

class DoubaoProvider {
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
        duration = 5,
        resolution = '720p',
        ratio = '16:9',
        watermark = false,
        seed = null,
        camerafixed = false,
        return_last_frame = false
      } = params;

      const requestData = {
        prompt,
        model: model.model_id,
        duration,
        resolution,
        ratio,
        watermark,
        camerafixed,
        return_last_frame,
        '01K3ZARVMSZ97JPXNWXBCJGG6K': model.api_key
      };

      if (seed) {
        requestData.seed = parseInt(seed);
      }

      console.log('[Doubao] 文生视频请求:', {
        model: model.model_id,
        prompt: prompt.substring(0, 50) + '...'
      });

      const response = await axios.post(
        `${model.api_url}/v2/videos/generations`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${model.api_key}`
          },
          timeout: 180000  // 3分钟 - 视频生成任务提交可能需要较长时间
        }
      );

      if (response.data && response.data.task_id) {
        console.log('[Doubao] 任务已提交:', response.data.task_id);
        return response.data.task_id;
      } else {
        throw new Error('API响应格式错误');
      }
    } catch (error) {
      // 详细的错误日志
      console.error('[Doubao] 文生视频失败 - 详细信息:', {
        message: error.message,
        code: error.code,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        requestUrl: error.config?.url,
        requestHeaders: error.config?.headers
      });
      throw new Error(error.response?.data?.error || error.message);
    }
  }

  /**
   * 图生视频
   * @param {Object} model - 模型配置
   * @param {Object} params - 生成参数
   * @param {Array} images - 图片URL数组 [首帧] 或 [首帧, 尾帧]
   * @returns {Promise<string>} 任务ID
   */
  async generateImageToVideo(model, params, images) {
    try {
      const {
        prompt,
        duration = 5,
        resolution = '720p',
        ratio = '16:9',
        watermark = false,
        seed = null,
        camerafixed = false,
        return_last_frame = false
      } = params;

      if (!images || images.length === 0) {
        throw new Error('图生视频需要至少一张图片');
      }

      const requestData = {
        prompt,
        model: model.model_id,
        images: images, // 数组形式
        duration,
        resolution,
        ratio,
        watermark,
        camerafixed,
        return_last_frame,
        '01K3ZARVMSZ97JPXNWXBCJGG6K': model.api_key
      };

      if (seed) {
        requestData.seed = parseInt(seed);
      }

      console.log('[Doubao] 图生视频请求:', {
        model: model.model_id,
        prompt: prompt.substring(0, 50) + '...',
        imagesCount: images.length
      });

      const response = await axios.post(
        `${model.api_url}/v2/videos/generations`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${model.api_key}`
          },
          timeout: 180000  // 3分钟 - 视频生成任务提交可能需要较长时间
        }
      );

      if (response.data && response.data.task_id) {
        console.log('[Doubao] 任务已提交:', response.data.task_id);
        return response.data.task_id;
      } else {
        throw new Error('API响应格式错误');
      }
    } catch (error) {
      // 详细的错误日志
      console.error('[Doubao] 图生视频失败 - 详细信息:', {
        message: error.message,
        code: error.code,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        requestUrl: error.config?.url,
        requestHeaders: error.config?.headers
      });
      
      // 尝试提取更有用的错误信息
      let errorMessage = error.message;
      if (error.response?.data) {
        const data = error.response.data;
        
        // 尝试从嵌套的错误信息中提取
        if (data.upsream_message) {
          try {
            const upstreamData = JSON.parse(data.upsream_message);
            if (upstreamData.message) {
              const match = upstreamData.message.match(/"message":"([^"]+)"/);
              if (match && match[1]) {
                errorMessage = match[1].replace(/\\\\/g, '');
              }
            }
          } catch (parseError) {
            // 解析失败，使用原始消息
          }
        }
        
        if (data.error) {
          errorMessage = data.error;
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
      if (status === 'COMPLETED' || status === 'SUCCESS') {
        // 调试：输出完整响应以检查最后一帧字段
        console.log('[Doubao] 完整响应数据:', JSON.stringify(result, null, 2));
        
        const completedResult = {
          status: 'completed',
          taskId: result.task_id || taskId,
          videoUrl: result.data?.output || result.video_url,
          thumbnail: result.data?.last_frame_url || result.thumbnail_url || result.data?.thumbnail_url,
          lastFrameUrl: result.data?.last_frame_url || null, // 明确提取最后一帧
          duration: result.data?.duration,
          resolution: result.data?.resolution,
          ratio: result.data?.ratio,
          fps: result.data?.framespersecond || result.fps,
          seed: result.data?.seed
        };
        
        console.log('[Doubao] 提取的结果:', {
          videoUrl: completedResult.videoUrl,
          thumbnail: completedResult.thumbnail,
          lastFrameUrl: completedResult.lastFrameUrl
        });
        
        return completedResult;
      } else if (status === 'FAILED' || status === 'ERROR') {
        return {
          status: 'failed',
          error: result.fail_reason || result.error || '视频生成失败'
        };
      } else if (status === 'PROCESSING' || status === 'PENDING' || status === 'RUNNING') {
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
      console.error('[Doubao] 查询任务状态失败:', error.message);
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
  async pollTaskResult(model, taskId, maxAttempts = 120, initialInterval = 10000) {
    console.log(`[Doubao] 开始轮询任务结果，最多查询 ${maxAttempts} 次，预计最长等待约${maxAttempts * initialInterval / 60000}分钟`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.queryTaskStatus(model, taskId);

        // 显示更详细的状态信息
        if (result.status === 'completed') {
          console.log(`[Doubao] ✅ 视频生成完成（第${attempt}次查询）`);
          return result;
        } else if (result.status === 'failed') {
          console.log(`[Doubao] ❌ 视频生成失败（第${attempt}次查询）: ${result.error}`);
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
          
          const progress = result.progress ? ` (进度: ${result.progress}%)` : '';
          console.log(`[Doubao] ⏳ 第${attempt}/${maxAttempts}次查询 - 生成中${progress}，${waitTime/1000}秒后重试...`);
          
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        } else {
          console.log(`[Doubao] ⚠️  未知状态: ${result.status}，继续等待...`);
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, initialInterval));
          }
        }
      } catch (error) {
        console.error(`[Doubao] ⚠️  第${attempt}次查询出错:`, error.message);
        
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

module.exports = new DoubaoProvider();

