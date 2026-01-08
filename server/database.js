const mysql = require('mysql2/promise');
const config = require('./config');
const imageCacheService = require('./services/imageCacheService');

// 创建数据库连接池
const pool = mysql.createPool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000
});

// 初始化数据库表
const initDatabase = async () => {
  try {
    // 创建用户表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_email (email)
      )
    `);
    
    // 创建历史记录表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS history_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        prompt TEXT NOT NULL,
        mode ENUM('text-to-image', 'image-to-image') NOT NULL,
        size VARCHAR(20) NOT NULL,
        quantity INT DEFAULT 1,
        reference_image VARCHAR(500),
        generated_images JSON,
        user_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
      )
    `);
    
    // 创建参考图表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS reference_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        name VARCHAR(200) NOT NULL,
        url VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      )
    `);
    
    // 创建提示词表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS prompts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      )
    `);

    // 创建常用提示词表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS common_prompts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'image' COMMENT '提示词类型：image（图像）或 video（视频）',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_type (type),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='常用提示词表'
    `);
    
    // 创建图像模型表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ai_models (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模型名称',
        api_key VARCHAR(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'API密钥',
        base_url VARCHAR(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'API基础URL',
        is_default TINYINT(1) DEFAULT '0' COMMENT '是否为默认模型',
        is_active TINYINT(1) DEFAULT '1' COMMENT '是否启用',
        description TEXT COLLATE utf8mb4_unicode_ci COMMENT '模型描述',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (id),
        KEY idx_name (name),
        KEY idx_is_default (is_default),
        KEY idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI图像模型管理表'
    `);

    
    
    // 检查是否有默认图像模型，如果没有则插入
    const [existingImageModels] = await pool.execute('SELECT COUNT(*) as count FROM ai_models WHERE is_default = TRUE');
    if (existingImageModels[0].count === 0) {
      await pool.execute(`
        INSERT INTO ai_models (name, description, api_key, base_url, is_active, is_default)
        VALUES ('nano-banana', '默认的AI图像生成模型', 'hk-zp1lsl1000036757b89a1f7b4898569a407c41d7acce31fb', 'https://api.openai-hk.com', TRUE, TRUE)
      `);
      console.log('默认图像模型已插入');
    }

    // 创建AI文本模型配置表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ai_text_models (
        id INT AUTO_INCREMENT PRIMARY KEY,
        display_name VARCHAR(100) NOT NULL COMMENT '前端展示名称',
        model_name VARCHAR(100) NOT NULL COMMENT '模型调用名称',
        api_url VARCHAR(500) NOT NULL COMMENT 'API地址',
        api_key VARCHAR(500) NOT NULL COMMENT 'API密钥',
        role_name VARCHAR(100) NOT NULL COMMENT 'Role名称',
        role_content TEXT NOT NULL COMMENT 'Role内容/系统提示词',
        is_active BOOLEAN DEFAULT true COMMENT '是否启用',
        is_default BOOLEAN DEFAULT false COMMENT '是否为默认模型',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_is_active (is_active),
        INDEX idx_is_default (is_default)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI文本模型配置表'
    `);

    // 创建AI生成提示词历史记录表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ai_prompt_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        model_id INT NOT NULL COMMENT '使用的模型ID',
        model_display_name VARCHAR(100) NOT NULL COMMENT '模型展示名称快照',
        user_input TEXT NOT NULL COMMENT '用户输入的原始需求',
        generated_prompts JSON NOT NULL COMMENT '生成的提示词列表',
        prompt_count INT NOT NULL COMMENT '生成的提示词数量',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_model_id (model_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI生成提示词历史记录表'
    `);

    // 创建批量输入表单历史记录表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS batch_prompt_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        name VARCHAR(200) NOT NULL COMMENT '历史记录名称',
        prompts JSON NOT NULL COMMENT '批量提示词列表(最多10个)',
        prompt_count INT NOT NULL COMMENT '提示词数量',
        source_type ENUM('manual', 'ai_generated') DEFAULT 'manual' COMMENT '来源类型',
        source_id INT NULL COMMENT '如果是AI生成的，关联ai_prompt_history的ID',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_source_type (source_type),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='批量输入表单历史记录表'
    `);

    // 检查是否有默认文本模型，如果没有则插入
    const [existingTextModels] = await pool.execute('SELECT COUNT(*) as count FROM ai_text_models WHERE is_default = TRUE');
    if (existingTextModels[0].count === 0) {
      await pool.execute(`
        INSERT INTO ai_text_models (display_name, model_name, api_url, api_key, role_name, role_content, is_active, is_default)
        VALUES ('GPT-4提示词生成器', 'gpt-4-turbo', 'https://api.openai.com/v1/chat/completions', 'sk-your-api-key-here', '提示词专家', '你是一个专业的AI图像生成提示词专家，擅长将用户的简单描述转换为详细的、适合AI图像生成的英文提示词。你需要：1. 理解用户的中文描述；2. 生成详细的英文提示词；3. 包含风格、光线、氛围、质量等细节；4. 使用逗号分隔关键词；5. 确保提示词适合Stable Diffusion、Midjourney等AI图像生成工具。', TRUE, TRUE)
      `);
      console.log('默认文本模型已插入');
    }

    console.log('数据库表初始化成功');
  } catch (error) {
    console.error('数据库初始化失败:', error);
  }
};

// 历史记录相关操作
const historyService = {
  // 添加历史记录
  async addHistory(historyData, userId = null) {
    try {
      const {
        prompt, mode, size, quantity, referenceImage, generatedImages, modelId, videoData,
        tags, selectedCommonPrompts, selectedReferenceImages
      } = historyData;

      // 确保所有参数都不是undefined
      const safeParams = [
        userId,
        prompt || '',
        mode || 'text-to-image',
        size || '1024x1024',
        quantity || 1,
        referenceImage || null,
        JSON.stringify(generatedImages || []),
        modelId || null,
        videoData ? JSON.stringify(videoData) : null,
        tags ? JSON.stringify(tags) : null,
        selectedCommonPrompts ? JSON.stringify(selectedCommonPrompts) : null,
        selectedReferenceImages ? JSON.stringify(selectedReferenceImages) : null
      ];

      const [result] = await pool.execute(
        'INSERT INTO history_records (user_id, prompt, mode, size, quantity, reference_image, generated_images, model_id, video_data, tags, selected_common_prompts, selected_reference_images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        safeParams
      );

      // 清除历史记录缓存
      if (userId) {
        await imageCacheService.clearHistoryCache(userId);
      }

      return {
        id: result.insertId,
        record: {
          id: result.insertId,
          ...historyData,
          createdAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('添加历史记录失败:', error);
      throw error;
    }
  },
  
  // 获取历史记录列表
  async getHistoryList(page = 1, pageSize = 10, searchKeyword = '', userId = null) {
    try {
      // 构建缓存键（包含搜索关键词和用户ID）
      const cacheKey = userId
        ? `user:${userId}:history:all:page:${page}:size:${pageSize}:search:${searchKeyword || 'none'}`
        : null;

      // 如果有用户ID，尝试从缓存获取
      if (cacheKey) {
        const cached = await imageCacheService.getUserHistory(userId, page, pageSize, `all:search:${searchKeyword || 'none'}`);
        if (cached) {
          console.log(`从缓存获取历史记录: 用户${userId}, 页码${page}, 搜索词"${searchKeyword}"`);
          return cached;
        }
      }

      const offset = (page - 1) * pageSize;
      let query = 'SELECT * FROM history_records';
      let params = [];

      if (searchKeyword) {
        query += ' WHERE prompt LIKE ?';
        params.push(`%${searchKeyword}%`);
      }

      query += ' ORDER BY created_at DESC LIMIT ' + parseInt(pageSize) + ' OFFSET ' + parseInt(offset);

      const [rows] = await pool.execute(query, params);

      // 解析JSON字段
      const historyList = rows.map(row => {
        let generatedImages = [];
        let videoData = null;

        try {
          if (row.generated_images) {
            generatedImages = typeof row.generated_images === 'string'
              ? JSON.parse(row.generated_images)
              : row.generated_images;
          }
        } catch (error) {
          console.error('解析generated_images失败:', error, row.generated_images);
          generatedImages = [];
        }

        try {
          if (row.video_data) {
            videoData = typeof row.video_data === 'string'
              ? JSON.parse(row.video_data)
              : row.video_data;
          }
        } catch (error) {
          console.error('解析video_data失败:', error);
          videoData = null;
        }

        return {
          id: row.id.toString(),
          prompt: row.prompt,
          mode: row.mode,
          size: row.size,
          quantity: row.quantity,
          referenceImage: row.reference_image,
          generatedImages,
          videoData,
          modelId: row.model_id,
          modelName: row.model_name || null,
          createdAt: row.created_at.toISOString()
        };
      });

      // 缓存结果（如果有用户ID）
      if (cacheKey && userId) {
        await imageCacheService.cacheUserHistory(userId, page, pageSize, `all:search:${searchKeyword || 'none'}`, historyList);
      }

      return historyList;
    } catch (error) {
      console.error('获取历史记录失败:', error);
      throw error;
    }
  },
  
  // 删除历史记录
  async deleteHistory(id, userId = null) {
    try {
      const [result] = await pool.execute(
        'DELETE FROM history_records WHERE id = ?',
        [id]
      );

      // 清除历史记录缓存
      if (userId && result.affectedRows > 0) {
        await imageCacheService.clearHistoryCache(userId);
      }

      return result.affectedRows > 0;
    } catch (error) {
      console.error('删除历史记录失败:', error);
      throw error;
    }
  },
  
  // 清空历史记录
  async clearHistory(userId = null) {
    try {
      const [result] = await pool.execute('DELETE FROM history_records');

      // 清除历史记录缓存
      if (userId && result.affectedRows > 0) {
        await imageCacheService.clearHistoryCache(userId);
      }

      return result.affectedRows;
    } catch (error) {
      console.error('清空历史记录失败:', error);
      throw error;
    }
  },
  
  // 获取历史记录总数
  async getHistoryCount(searchKeyword = '') {
    try {
      let query = 'SELECT COUNT(*) as count FROM history_records';
      let params = [];
      
      if (searchKeyword) {
        query += ' WHERE prompt LIKE ?';
        params.push(`%${searchKeyword}%`);
      }
      
      const [rows] = await pool.execute(query, params);
      return rows[0].count;
    } catch (error) {
      console.error('获取历史记录总数失败:', error);
      throw error;
    }
  }
};

// 参考图相关操作
const referenceImageService = {
  // 添加参考图
  async addReferenceImage(imageData) {
    try {
      const { filename, originalName, filePath, fileSize, mimeType } = imageData;
      
      const [result] = await pool.execute(
        'INSERT INTO reference_images (filename, original_name, file_path, file_size, mime_type) VALUES (?, ?, ?, ?, ?)',
        [filename, originalName, filePath, fileSize, mimeType]
      );
      
      return {
        id: result.insertId,
        filename,
        originalName,
        filePath,
        fileSize,
        mimeType,
        url: `/uploads/${filename}`,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('添加参考图失败:', error);
      throw error;
    }
  },
  
  // 批量添加参考图
  async addReferenceImages(imagesData) {
    try {
      const results = [];
      for (const imageData of imagesData) {
        const result = await this.addReferenceImage(imageData);
        results.push(result);
      }
      return results;
    } catch (error) {
      console.error('批量添加参考图失败:', error);
      throw error;
    }
  },
  
  // 获取参考图列表
  async getReferenceImages() {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM reference_images ORDER BY created_at DESC'
      );
      
      return rows.map(row => ({
        id: row.id.toString(),
        filename: row.filename,
        originalName: row.original_name,
        filePath: row.file_path,
        fileSize: row.file_size,
        mimeType: row.mime_type,
        url: `/uploads/${row.filename}`,
        createdAt: row.created_at.toISOString()
      }));
    } catch (error) {
      console.error('获取参考图列表失败:', error);
      throw error;
    }
  },
  
  // 根据ID获取参考图
  async getReferenceImageById(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM reference_images WHERE id = ?',
        [id]
      );
      
      if (rows.length === 0) {
        return null;
      }
      
      const row = rows[0];
      return {
        id: row.id.toString(),
        filename: row.filename,
        originalName: row.original_name,
        filePath: row.file_path,
        fileSize: row.file_size,
        mimeType: row.mime_type,
        url: `/uploads/${row.filename}`,
        createdAt: row.created_at.toISOString()
      };
    } catch (error) {
      console.error('获取参考图详情失败:', error);
      throw error;
    }
  },
  
  // 删除参考图
  async deleteReferenceImage(id) {
    try {
      const [result] = await pool.execute(
        'DELETE FROM reference_images WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('删除参考图失败:', error);
      throw error;
    }
  },
  
  // 批量删除参考图
  async batchDeleteReferenceImages(ids) {
    try {
      if (ids.length === 0) return 0;
      
      const placeholders = ids.map(() => '?').join(',');
      const [result] = await pool.execute(
        `DELETE FROM reference_images WHERE id IN (${placeholders})`,
        ids
      );
      
      return result.affectedRows;
    } catch (error) {
      console.error('批量删除参考图失败:', error);
      throw error;
    }
  }
};

// 图像模型相关操作
const aiModelService = {
  // 获取所有图像模型
  async getAllModels() {
    try {
      // 先从缓存获取
      const cached = await imageCacheService.getModelList('all');
      if (cached) {
        console.log('从缓存获取所有AI模型列表:', cached.length, '个模型');
        return cached;
      }

      // 查询数据库
      const [rows] = await pool.execute('SELECT * FROM ai_models WHERE is_active = TRUE ORDER BY is_default DESC, created_at ASC');

      // 缓存结果（24小时）
      await imageCacheService.cacheModelList('all', rows);

      return rows;
    } catch (error) {
      console.error('获取图像模型失败:', error);
      throw error;
    }
  },

  // 根据ID获取图像模型
  async getModelById(id) {
    try {
      const [rows] = await pool.execute('SELECT * FROM ai_models WHERE id = ? AND is_active = TRUE', [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('获取图像模型失败:', error);
      throw error;
    }
  },

  // 根据名称获取图像模型
  async getModelByName(name) {
    try {
      const [rows] = await pool.execute('SELECT * FROM ai_models WHERE name = ? AND is_active = TRUE', [name]);
      return rows[0] || null;
    } catch (error) {
      console.error('获取图像模型失败:', error);
      throw error;
    }
  },

  // 获取默认图像模型
  async getDefaultModel() {
    try {
      const [rows] = await pool.execute('SELECT * FROM ai_models WHERE is_default = TRUE AND is_active = TRUE LIMIT 1');
      return rows[0] || null;
    } catch (error) {
      console.error('获取默认图像模型失败:', error);
      throw error;
    }
  },

  // 添加图像模型
  async addModel(modelData) {
    try {
      const { name, description, api_key, base_url, is_default = false, is_active = true } = modelData;

      // 如果设置为默认模型，先取消其他模型的默认状态
      if (is_default) {
        await pool.execute('UPDATE ai_models SET is_default = FALSE');
      }

      const [result] = await pool.execute(
        'INSERT INTO ai_models (name, description, api_key, base_url, is_default, is_active) VALUES (?, ?, ?, ?, ?, ?)',
        [name, description, api_key, base_url, is_default, is_active]
      );

      // 清除模型列表缓存
      await imageCacheService.clearModelCache();

      return result.insertId;
    } catch (error) {
      console.error('添加图像模型失败:', error);
      throw error;
    }
  },

  // 更新图像模型
  async updateModel(id, modelData) {
    try {
      const { name, description, api_key, base_url, is_default = false, is_active = true } = modelData;

      // 如果设置为默认模型，先取消其他模型的默认状态
      if (is_default) {
        await pool.execute('UPDATE ai_models SET is_default = FALSE WHERE id != ?', [id]);
      }

      const [result] = await pool.execute(
        'UPDATE ai_models SET name = ?, description = ?, api_key = ?, base_url = ?, is_default = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, description, api_key, base_url, is_default, is_active, id]
      );

      // 清除模型列表缓存
      if (result.affectedRows > 0) {
        await imageCacheService.clearModelCache();
      }

      return result.affectedRows > 0;
    } catch (error) {
      console.error('更新图像模型失败:', error);
      throw error;
    }
  },

  // 删除图像模型
  async deleteModel(id) {
    try {
      const [result] = await pool.execute('DELETE FROM ai_models WHERE id = ?', [id]);

      // 清除模型列表缓存
      if (result.affectedRows > 0) {
        await imageCacheService.clearModelCache();
      }

      return result.affectedRows > 0;
    } catch (error) {
      console.error('删除图像模型失败:', error);
      throw error;
    }
  }
};

// 视频模型相关操作


// 获取数据库连接的便捷函数
const getConnection = () => pool;

module.exports = {
  pool,
  getConnection,
  initDatabase,
  historyService,
  referenceImageService,
  aiModelService
};
