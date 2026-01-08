const axios = require('axios');
const FormData = require('form-data');

class VideoGenerationService {
  constructor() {
    this.apiKey = process.env.DOUBAO_API_KEY || 'sk-qbeSbFvt5Le7YySGK4SHCgLiJGrJD9qibjp4lNeeHJVqaDqa';
    this.baseUrl = 'https://api.bltcy.ai';
  }

  /**
   * 生成视频 - 符合Seedance API规范和Sora2规范
   * @param {Object} params - 生成参数
   * @param {string} params.prompt - 提示词
   * @param {string} params.modelId - 模型ID
   * @param {number} params.duration - 视频时长（秒）
   * @param {string} params.resolution - 分辨率 (480p, 720p, 1080p)
   * @param {string} params.ratio - 宽高比 (21:9, 16:9, 4:3, 1:1, 3:4, 9:16, 9:21, keep_ratio, adaptive)
   * @param {boolean} params.watermark - 是否添加水印
   * @param {boolean} params.camerafixed - 是否固定摄像头
   * @param {boolean} params.returnLastFrame - 是否返回尾帧图像
   * @param {number} params.seed - 随机种子
   * @param {Object} params.firstFrame - 首帧图片文件
   * @param {Object} params.lastFrame - 尾帧图片文件（可选）
   * @param {boolean} params.hd - 是否生成高清（仅sora-2-pro支持）
   * @param {boolean} params.private - 是否隐藏视频
   * @param {string} params.characterUrl - 创建角色需要的视频链接
   * @param {string} params.characterTimestamps - 视频角色出现的秒数范围
   * @returns {Promise<Object>} 生成结果
   */
  async generateVideo(params) {
    try {
      const {
        prompt,
        modelId = 'doubao-seedance-1-0-lite-i2v-250428',
        duration = 5,
        resolution = '720p',
        ratio = '16:9',
        watermark = false,
        camerafixed = false,
        returnLastFrame = false,
        seed = null,
        firstFrame,
        lastFrame,
        hd = false,
        private: isPrivate = false,
        characterUrl,
        characterTimestamps
      } = params;

      console.log('开始生成视频，参数:', {
        prompt,
        modelId,
        duration,
        resolution,
        ratio,
        watermark,
        camerafixed,
        returnLastFrame,
        seed,
        hasFirstFrame: !!firstFrame,
        hasLastFrame: !!lastFrame,
        hd,
        private: isPrivate,
        hasCharacter: !!characterUrl
      });

      // 检查是否是Sora2模型或VEO3.1模型（它们使用相似的API格式）
      const isSora2 = modelId === 'sora-2' || modelId === 'sora-2-pro';
      const isVeo31 = modelId === 'veo3.1' || modelId === 'veo3.1-pro' || modelId === 'veo3.1-components';
      const isGrokVideo = modelId === 'grok-video-3' || modelId === 'grok-video-3-pro';

      // 准备请求数据
      let requestData;
      let apiEndpoint = `${this.baseUrl}/v2/videos/generations`;

      if (isGrokVideo) {
        // Grok Video 3 使用 Chat Completions API 格式
        apiEndpoint = `${this.baseUrl}/v1/chat/completions`;

        // 构建消息内容
        let messageContent = [];

        // 处理图片（图生视频）
        if (firstFrame) {
          const firstFrameUrl = await this.uploadImage(firstFrame);
          messageContent.push({
            type: "image_url",
            image_url: {
              url: firstFrameUrl
            }
          });
        }

        if (lastFrame) {
          const lastFrameUrl = await this.uploadImage(lastFrame);
          messageContent.push({
            type: "image_url",
            image_url: {
              url: lastFrameUrl
            }
          });
        }

        // 构建提示词文本，包含视频参数
        let fullPrompt = prompt;
        if (duration) fullPrompt += `\n时长: ${duration}秒`;
        if (ratio) fullPrompt += `\n宽高比: ${ratio}`;
        if (resolution) fullPrompt += `\n分辨率: ${resolution}`;

        messageContent.push({
          type: "text",
          text: fullPrompt
        });

        requestData = {
          model: modelId,
          messages: [
            {
              role: "user",
              content: messageContent
            }
          ],
          stream: false
        };

      } else if (isSora2 || isVeo31) {
        // Sora2 和 VEO3.1 API格式 - 都使用 aspect_ratio
        requestData = {
          prompt,
          model: modelId,
          aspect_ratio: ratio,
          duration: parseInt(duration),
          watermark,
          private: isPrivate
        };

        // 仅sora-2-pro支持HD
        if (modelId === 'sora-2-pro' && hd) {
          requestData.hd = hd;
        }

        // 处理图片上传（图生视频）
        const images = [];
        if (firstFrame) {
          const firstFrameUrl = await this.uploadImage(firstFrame);
          images.push(firstFrameUrl);
        }
        if (lastFrame) {
          const lastFrameUrl = await this.uploadImage(lastFrame);
          images.push(lastFrameUrl);
        }

        if (images.length > 0) {
          requestData.images = images;
        }

        // 角色客串功能 (仅Sora2支持)
        if (isSora2 && characterUrl && characterTimestamps) {
          requestData.character_url = characterUrl;
          requestData.character_timestamps = characterTimestamps;
        }

      } else {
        // Seedance/豆包 API格式
        requestData = {
          prompt,
          model: modelId,
          duration,
          resolution,
          ratio,
          watermark,
          camerafixed,
          return_last_frame: returnLastFrame
        };

        // 添加可选参数
        if (seed) {
          requestData.seed = parseInt(seed);
        }

        // 处理图片上传
        const images = [];
        if (firstFrame) {
          const firstFrameUrl = await this.uploadImage(firstFrame);
          images.push(firstFrameUrl);
        }
        if (lastFrame) {
          const lastFrameUrl = await this.uploadImage(lastFrame);
          images.push(lastFrameUrl);
        }

        if (images.length > 0) {
          requestData.images = images;
        }

        // 添加API密钥参数（豆包特有）
        requestData['01K3ZARVMSZ97JPXNWXBCJGG6K'] = this.apiKey;
      }

      console.log('[视频生成] 发送请求到:', apiEndpoint);
      console.log('[视频生成] 请求数据:', JSON.stringify(requestData, null, 2));

      // 发送生成请求 - 增加超时时间到15分钟，因为Sora2提交任务本身可能很慢
      // 同时添加重试机制
      let response;
      let lastError;
      const maxRetries = 3;
      const requestTimeout = 900000; // 15分钟超时

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[视频生成] 第${attempt}次尝试提交任务...`);

          response = await axios.post(apiEndpoint, requestData, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`
            },
            timeout: requestTimeout
          });

          console.log(`[视频生成] 第${attempt}次尝试成功`);
          break; // 成功则跳出重试循环

        } catch (error) {
          lastError = error;
          console.error(`[视频生成] 第${attempt}次尝试失败:`, error.message);

          // 如果是最后一次尝试，抛出错误
          if (attempt === maxRetries) {
            console.error('[视频生成] 所有重试均失败，抛出错误');
            throw error;
          }

          // 等待后重试（指数退避）
          const waitTime = Math.min(5000 * Math.pow(2, attempt - 1), 30000); // 最多等待30秒
          console.log(`[视频生成] 等待${waitTime/1000}秒后重试...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      console.log('[视频生成] API原始响应:', JSON.stringify(response.data).substring(0, 500));

      // 处理 Grok Video 3 的 Chat Completions 响应格式
      if (isGrokVideo) {
        // Chat Completions API 返回格式: { choices: [{ message: { content: "video_url" } }] }
        if (response.data && response.data.choices && response.data.choices[0]) {
          const content = response.data.choices[0].message.content;
          console.log('[视频生成] Grok Video 3 返回内容:', content);

          let videoUrl = null;
          let thumbnailUrl = null;

          // 尝试解析内容，可能是JSON格式、Markdown格式或直接是URL
          try {
            // 1. 尝试作为JSON解析
            const parsedContent = JSON.parse(content);
            videoUrl = parsedContent.video_url || parsedContent.url;
            thumbnailUrl = parsedContent.thumbnail_url || parsedContent.thumbnail;
          } catch (e) {
            // 2. 不是JSON，尝试从Markdown中提取URL
            console.log('[视频生成] 内容不是JSON，尝试从Markdown提取URL');

            // 提取视频URL - 匹配 [text](url.mp4) 或 [text](url.webm) 等视频格式
            const videoLinkRegex = /\[.*?\]\((https?:\/\/[^\)]+\.(?:mp4|webm|mov|avi|flv|m4v)[^\)]*)\)/i;
            const videoMatch = content.match(videoLinkRegex);
            if (videoMatch && videoMatch[1]) {
              videoUrl = videoMatch[1];
              console.log('[视频生成] 从Markdown提取到视频URL:', videoUrl);
            }

            // 提取缩略图URL - 匹配 ![image](url)
            const imageLinkRegex = /!\[.*?\]\((https?:\/\/[^\)]+\.(?:jpg|jpeg|png|gif|webp)[^\)]*)\)/i;
            const imageMatch = content.match(imageLinkRegex);
            if (imageMatch && imageMatch[1]) {
              thumbnailUrl = imageMatch[1];
              console.log('[视频生成] 从Markdown提取到缩略图URL:', thumbnailUrl);
            }

            // 如果还是没找到视频URL，尝试直接提取任何视频URL
            if (!videoUrl) {
              const directVideoRegex = /(https?:\/\/[^\s]+\.(?:mp4|webm|mov|avi|flv|m4v))/i;
              const directMatch = content.match(directVideoRegex);
              if (directMatch && directMatch[1]) {
                videoUrl = directMatch[1];
                console.log('[视频生成] 直接提取到视频URL:', videoUrl);
              }
            }

            // 如果还是没找到，检查是否整个内容就是一个URL
            if (!videoUrl && content.trim().startsWith('http')) {
              videoUrl = content.trim();
              console.log('[视频生成] 使用整个内容作为URL:', videoUrl);
            }
          }

          if (!videoUrl) {
            console.error('[视频生成] 无法从响应中提取视频URL，原始内容:', content);
            throw new Error('无法从Grok Video 3响应中提取视频URL');
          }

          const result = {
            status: 'completed',
            url: videoUrl,
            createdAt: new Date().toISOString()
          };

          if (thumbnailUrl) {
            result.thumbnail = thumbnailUrl;
          }

          console.log('[视频生成] Grok Video 3 解析结果:', result);
          return result;
        } else {
          console.error('[视频生成] Grok Video 3 响应格式不符合预期:', response.data);
          throw new Error('Grok Video 3 API响应格式错误');
        }
      }

      // 检查响应格式（其他模型）
      if (response.data && response.data.task_id) {
        console.log('[视频生成] 收到task_id，开始轮询:', response.data.task_id);
        // 轮询查询生成结果
        return await this.pollVideoResult(response.data.task_id);
      } else if (response.data && response.data.video_url) {
        console.log('[视频生成] API直接返回视频URL (同步模式)');
        // API直接返回了结果（同步模式）
        return {
          status: 'completed',
          url: response.data.video_url,
          thumbnail: response.data.thumbnail_url,
          duration: response.data.duration,
          width: response.data.width,
          height: response.data.height,
          fps: response.data.fps,
          createdAt: new Date().toISOString()
        };
      } else {
        console.error('[视频生成] API响应格式不符合预期:', response.data);
        throw new Error('API响应格式错误');
      }

    } catch (error) {
      console.error('===== 视频生成失败详细信息 =====');
      console.error('错误类型:', error.constructor.name);
      console.error('错误消息:', error.message);
      console.error('错误代码:', error.code);

      if (error.response) {
        console.error('API错误响应:');
        console.error('- 状态码:', error.response.status);
        console.error('- 状态文本:', error.response.statusText);
        console.error('- 响应头:', JSON.stringify(error.response.headers, null, 2));
        console.error('- 响应数据:', JSON.stringify(error.response.data, null, 2));

        // 根据状态码提供更友好的错误消息
        if (error.response.status === 401) {
          throw new Error('API密钥无效或已过期');
        } else if (error.response.status === 429) {
          throw new Error('API请求频率超限，请稍后重试');
        } else if (error.response.status >= 500) {
          throw new Error(`API服务器错误(${error.response.status}): ${error.response.data?.error || error.response.statusText}`);
        } else {
          throw new Error(`API错误(${error.response.status}): ${error.response.data?.error || error.response.statusText}`);
        }
      } else if (error.request) {
        console.error('请求详情:');
        console.error('- URL:', error.config?.url);
        console.error('- 方法:', error.config?.method);
        console.error('- 超时设置:', error.config?.timeout);

        if (error.code === 'ECONNABORTED') {
          throw new Error(`请求超时（${error.config?.timeout/1000}秒）- API响应过慢，可能是服务器繁忙，请稍后重试`);
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          throw new Error('无法连接到API服务器，请检查网络连接或API地址');
        } else {
          throw new Error(`网络请求失败(${error.code}): ${error.message}`);
        }
      } else {
        console.error('其他错误:', error.stack);
        throw new Error(`视频生成失败: ${error.message}`);
      }
    }
  }

  /**
   * 上传图片到临时存储
   * @param {Object} imageFile - 图片文件
   * @returns {Promise<string>} 图片URL
   */
  async uploadImage(imageFile) {
    try {
      // 这里需要实现图片上传逻辑
      // 由于Seedance API需要图片URL，我们需要先将图片上传到某个存储服务
      // 这里暂时返回一个模拟的URL，实际项目中需要上传到云存储
      const base64 = imageFile.buffer.toString('base64');
      const dataUrl = `data:${imageFile.mimetype};base64,${base64}`;
      
      // 在实际项目中，这里应该上传到云存储并返回真实的URL
      // 现在暂时使用data URL（注意：某些API可能不支持data URL）
      return dataUrl;
    } catch (error) {
      console.error('图片上传失败:', error);
      throw new Error('图片上传失败');
    }
  }

  /**
   * 轮询查询视频生成结果
   * @param {string} taskId - 任务ID
   * @returns {Promise<Object>} 生成结果
   */
  async pollVideoResult(taskId) {
    const maxAttempts = 180; // 最多轮询180次 (30分钟) - Sora2生成时间可能超过20分钟
    const interval = 10000; // 每10秒查询一次
    let attempts = 0;

    console.log(`开始轮询视频生成结果，任务ID: ${taskId}，最大等待时间: ${(maxAttempts * interval) / 60000}分钟`);

    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`第${attempts}次查询视频生成结果...`);

        const response = await axios.get(`${this.baseUrl}/v2/videos/generations/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 10000
        });

        const result = response.data;
        console.log(`第${attempts}次查询结果:`, result);

        // 检查状态 - 支持多种状态值
        const status = result.status?.toUpperCase();

        if (status === 'COMPLETED' || status === 'SUCCESS') {
          // 生成完成
          console.log('[视频轮询] 视频生成完成！');
          return {
            taskId,
            status: 'completed',
            url: result.data?.output || result.video_url || result.data?.video_url,
            thumbnail: result.data?.thumbnail_url || result.thumbnail_url,
            duration: result.data?.duration || result.duration,
            width: result.data?.width || result.width,
            height: result.data?.height || result.height,
            fps: result.data?.framespersecond || result.fps,
            seed: result.data?.seed || result.seed,
            ratio: result.data?.ratio || result.ratio,
            resolution: result.data?.resolution || result.resolution,
            createdAt: new Date().toISOString()
          };
        } else if (status === 'FAILED' || status === 'ERROR' || status === 'FAILURE') {
          // 生成失败
          console.error('[视频轮询] 视频生成失败:', result.fail_reason || result.error);
          throw new Error(result.fail_reason || result.error || '视频生成失败');
        } else if (status === 'PROCESSING' || status === 'PENDING' || status === 'RUNNING' || status === 'NOT_START' || status === 'IN_PROGRESS') {
          // 仍在处理中，继续等待
          console.log(`[视频轮询] 视频生成中... 状态: ${result.status}, 进度: ${result.progress || 'N/A'}`);
          await new Promise(resolve => setTimeout(resolve, interval));
          continue;
        } else {
          // 未知状态 - 记录并继续等待
          console.warn(`[视频轮询] 未知状态: ${result.status}, 继续等待...`);
          await new Promise(resolve => setTimeout(resolve, interval));
          continue;
        }

      } catch (error) {
        console.error(`第${attempts}次查询失败:`, error.message);

        // 如果是视频生成失败（内容不符合规范等），立即抛出错误，不再重试
        if (error.message && (
          error.message.includes('inappropriate content') ||
          error.message.includes('视频生成失败') ||
          error.message.includes('内容违规') ||
          error.message.includes('审核不通过')
        )) {
          console.error('[视频轮询] 检测到视频生成失败，停止轮询');
          throw error;
        }

        if (attempts >= maxAttempts) {
          throw new Error('查询视频生成结果超时');
        }

        // 网络错误等其他错误，等待后重试
        console.log(`等待${interval/1000}秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    throw new Error('视频生成超时');
  }

  /**
   * 创建客串角色 (Sora2 Character功能)
   * @param {Object} params - 创建参数
   * @param {string} params.url - 包含角色的视频URL
   * @param {string} params.timestamps - 角色出现的时间范围，格式: "start,end"（秒）
   * @returns {Promise<Object>} 角色信息
   */
  async createCharacter(params) {
    try {
      const { url, timestamps } = params;

      console.log('创建客串角色，参数:', { url, timestamps });

      const requestData = {
        url,
        timestamps
      };

      console.log('[创建角色] 发送请求到:', `${this.baseUrl}/sora/v1/characters`);

      const response = await axios.post(`${this.baseUrl}/sora/v1/characters`, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 60000 // 1分钟超时
      });

      console.log('[创建角色] API响应:', response.data);

      return {
        id: response.data.id,
        username: response.data.username,
        permalink: response.data.permalink,
        profilePictureUrl: response.data.profile_picture_url
      };

    } catch (error) {
      console.error('创建客串角色失败:', error);

      if (error.response) {
        console.error('API错误响应:', error.response.data);
        throw new Error(`API错误: ${error.response.data?.error || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('网络请求失败，请检查网络连接');
      } else {
        throw new Error(`创建角色失败: ${error.message}`);
      }
    }
  }

  /**
   * 获取支持的模型列表
   * @returns {Array} 模型列表
   */
  getSupportedModels() {
    return [
      {
        id: 'doubao-seedance-1-0-lite-i2v-250428',
        name: '首尾帧视频模型',
        description: '首帧或首尾帧图生视频，根据您输入的首帧图片+尾帧图片（可选）+文本提示词（可选）+参数（可选）生成目标视频',
        provider: '火山豆包',
        maxDuration: 10,
        supportedResolutions: [
          { width: 1024, height: 576 },
          { width: 1280, height: 720 },
          { width: 1920, height: 1080 }
        ]
      },
      {
        id: 'doubao-seedance-1-0-pro-250528',
        name: '文生视频模型',
        description: '根据您输入的文本提示词+参数（可选）生成目标视频',
        provider: '火山豆包',
        maxDuration: 5,
        supportedResolutions: [
          { width: 1024, height: 576 },
          { width: 1280, height: 720 }
        ]
      },
      {
        id: 'sora-2',
        name: 'Sora 2',
        description: 'OpenAI Sora 2 - 文生视频、图生视频',
        provider: 'OpenAI',
        maxDuration: 10,
        supportedResolutions: [
          { width: 1280, height: 720 },
          { width: 1920, height: 1080 }
        ]
      },
      {
        id: 'sora-2-pro',
        name: 'Sora 2 Pro',
        description: 'OpenAI Sora 2 Pro - 支持HD、15s、25s视频生成',
        provider: 'OpenAI',
        maxDuration: 25,
        supportedResolutions: [
          { width: 1280, height: 720 },
          { width: 1920, height: 1080 }
        ]
      }
    ];
  }
}

module.exports = new VideoGenerationService();
