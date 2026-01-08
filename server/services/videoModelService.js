const { getConnection } = require('../database');

class VideoModelService {
  /**
   * 获取指定类型的活跃模型
   * @param {string} modelType - 模型类型：text-to-video, image-to-video-first, image-to-video-both
   * @returns {Promise<Array>} 模型列表
   */
  async getActiveModels(modelType = null) {
    try {
      const pool = getConnection();
      let query = 'SELECT * FROM video_models WHERE is_active = TRUE';
      const params = [];

      if (modelType) {
        query += ' AND model_type = ?';
        params.push(modelType);
      }

      query += ' ORDER BY created_at DESC';

      const [models] = await pool.execute(query, params);
      return models;
    } catch (error) {
      console.error('获取活跃视频模型失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有模型（包括禁用的）
   * @returns {Promise<Array>} 模型列表
   */
  async getAllModels() {
    try {
      const pool = getConnection();
      const [models] = await pool.execute(
        'SELECT * FROM video_models ORDER BY created_at DESC'
      );
      return models;
    } catch (error) {
      console.error('获取所有视频模型失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取模型
   * @param {number} id - 模型ID
   * @returns {Promise<Object>} 模型信息
   */
  async getModelById(id) {
    try {
      const pool = getConnection();
      const [models] = await pool.execute(
        'SELECT * FROM video_models WHERE id = ?',
        [id]
      );
      return models[0] || null;
    } catch (error) {
      console.error('获取视频模型失败:', error);
      throw error;
    }
  }

  /**
   * 添加新模型
   * @param {Object} modelData - 模型数据
   * @returns {Promise<Object>} 添加的模型信息
   */
  async addModel(modelData) {
    try {
      const { name, provider, model_type, model_id, api_url, api_key, icon_url } = modelData;

      // 验证必填字段
      if (!name || !provider || !model_type || !model_id || !api_url || !api_key) {
        throw new Error('缺少必填字段');
      }

      // 验证模型类型
      const validTypes = ['text-to-video', 'image-to-video-first', 'image-to-video-both'];
      if (!validTypes.includes(model_type)) {
        throw new Error('无效的模型类型');
      }

      const pool = getConnection();
      const [result] = await pool.execute(
        `INSERT INTO video_models (name, provider, model_type, model_id, api_url, api_key, icon_url, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [name, provider, model_type, model_id, api_url, api_key, icon_url || null]
      );

      return {
        id: result.insertId,
        ...modelData,
        is_active: true,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('添加视频模型失败:', error);
      throw error;
    }
  }

  /**
   * 更新模型
   * @param {number} id - 模型ID
   * @param {Object} modelData - 更新的模型数据
   * @returns {Promise<boolean>} 是否成功
   */
  async updateModel(id, modelData) {
    try {
      const { name, provider, model_type, model_id, api_url, api_key, icon_url, is_active } = modelData;

      const pool = getConnection();
      const [result] = await pool.execute(
        `UPDATE video_models 
         SET name = ?, provider = ?, model_type = ?, model_id = ?, api_url = ?, api_key = ?, icon_url = ?, is_active = ?
         WHERE id = ?`,
        [name, provider, model_type, model_id, api_url, api_key, icon_url, is_active, id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('更新视频模型失败:', error);
      throw error;
    }
  }

  /**
   * 删除模型
   * @param {number} id - 模型ID
   * @returns {Promise<boolean>} 是否成功
   */
  async deleteModel(id) {
    try {
      const pool = getConnection();
      const [result] = await pool.execute(
        'DELETE FROM video_models WHERE id = ?',
        [id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('删除视频模型失败:', error);
      throw error;
    }
  }

  /**
   * 启用/禁用模型
   * @param {number} id - 模型ID
   * @returns {Promise<boolean>} 是否成功
   */
  async toggleActive(id) {
    try {
      const pool = getConnection();
      const [result] = await pool.execute(
        'UPDATE video_models SET is_active = NOT is_active WHERE id = ?',
        [id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('切换视频模型状态失败:', error);
      throw error;
    }
  }

  /**
   * 根据模型类型获取模型类型的中文名称
   * @param {string} modelType - 模型类型
   * @returns {string} 中文名称
   */
  getModelTypeName(modelType) {
    const typeNames = {
      'text-to-video': '文生视频',
      'image-to-video-first': '图生视频(首帧)',
      'image-to-video-both': '图生视频(首尾帧)'
    };
    return typeNames[modelType] || modelType;
  }
}

module.exports = new VideoModelService();

