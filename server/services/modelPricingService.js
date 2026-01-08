/**
 * 模型价格服务 - 管理AI模型的弹珠计费
 */

const { getConnection } = require('../database');

class ModelPricingService {
  /**
   * 获取所有模型价格配置
   */
  async getAllPricing(modelType = null, isActive = true) {
    try {
      let whereClause = [];
      let params = [];

      if (modelType) {
        whereClause.push('model_type = ?');
        params.push(modelType);
      }

      if (isActive !== null) {
        whereClause.push('is_active = ?');
        params.push(isActive);
      }

      const whereSql = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

      const [rows] = await getConnection().execute(
        `SELECT * FROM model_pricing ${whereSql} ORDER BY model_type, model_name`,
        params
      );

      return rows.map(row => this.formatPricingRow(row));
    } catch (error) {
      console.error('获取模型价格失败:', error);
      throw new Error('获取模型价格失败');
    }
  }

  /**
   * 根据模型key获取价格配置
   */
  async getPricingByKey(modelKey) {
    try {
      const [rows] = await getConnection().execute(
        'SELECT * FROM model_pricing WHERE model_key = ?',
        [modelKey]
      );

      if (rows.length === 0) {
        return null;
      }

      return this.formatPricingRow(rows[0]);
    } catch (error) {
      console.error('获取模型价格失败:', error);
      throw new Error('获取模型价格失败');
    }
  }

  /**
   * 格式化价格配置数据
   */
  formatPricingRow(row) {
    return {
      id: row.id,
      model_key: row.model_key,
      model_name: row.model_name,
      model_type: row.model_type,
      pricing_type: row.pricing_type,
      base_price: row.base_price ? parseFloat(row.base_price) : null,
      price_per_second: row.price_per_second ? parseFloat(row.price_per_second) : null,
      supported_durations: row.supported_durations ? (typeof row.supported_durations === 'string' ? JSON.parse(row.supported_durations) : row.supported_durations) : null,
      resolution_pricing: row.resolution_pricing ? (typeof row.resolution_pricing === 'string' ? JSON.parse(row.resolution_pricing) : row.resolution_pricing) : null,
      is_active: Boolean(row.is_active),
      description: row.description,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * 计算生成任务的价格
   * @param {string} modelKey - 模型标识
   * @param {Object} params - 生成参数
   * @param {number} params.duration - 视频时长（秒）
   * @param {string} params.resolution - 分辨率（480p/720p/1080p）
   * @param {number} params.quantity - 生成数量（图像）
   * @returns {number} 需要消耗的弹珠数
   */
  async calculatePrice(modelKey, params = {}) {
    try {
      const pricing = await this.getPricingByKey(modelKey);

      if (!pricing) {
        throw new Error(`模型 ${modelKey} 的价格配置不存在`);
      }

      if (!pricing.is_active) {
        throw new Error(`模型 ${modelKey} 已被禁用`);
      }

      const { duration, resolution, quantity = 1 } = params;

      switch (pricing.pricing_type) {
        case 'fixed':
          // 固定价格（图像模型或固定价格视频模型）
          return pricing.base_price * quantity;

        case 'per_second':
          // 按秒计费（Sora 2系列）
          if (!duration) {
            throw new Error('视频时长参数缺失');
          }
          if (!pricing.supported_durations.includes(duration)) {
            throw new Error(`不支持的视频时长：${duration}秒，支持：${pricing.supported_durations.join(', ')}秒`);
          }
          return pricing.price_per_second * duration * quantity;

        case 'per_resolution':
          // 按分辨率和时长计费（Kling、Doubao、Wan系列）
          if (!duration && !resolution) {
            throw new Error('分辨率或时长参数缺失');
          }

          let pricingKey;
          if (resolution && duration) {
            // 格式：480p-5s
            pricingKey = `${resolution}-${duration}s`;
          } else if (duration) {
            // 仅时长：5s
            pricingKey = `${duration}s`;
          } else {
            throw new Error('无法确定计费规则');
          }

          const price = pricing.resolution_pricing[pricingKey];
          if (price === undefined) {
            throw new Error(`不支持的配置：${pricingKey}`);
          }

          return price * quantity;

        default:
          throw new Error(`未知的计费类型：${pricing.pricing_type}`);
      }
    } catch (error) {
      console.error('计算价格失败:', error);
      throw error;
    }
  }

  /**
   * 创建或更新模型价格配置（管理员）
   */
  async upsertPricing(data) {
    try {
      const {
        model_key,
        model_name,
        model_type,
        pricing_type,
        base_price = null,
        price_per_second = null,
        supported_durations = null,
        resolution_pricing = null,
        is_active = true,
        description = ''
      } = data;

      // 验证必填字段
      if (!model_key || !model_name || !model_type || !pricing_type) {
        throw new Error('缺少必填字段');
      }

      // 验证计费类型对应的价格字段
      if (pricing_type === 'fixed' && !base_price) {
        throw new Error('固定价格模型必须提供base_price');
      }
      if (pricing_type === 'per_second' && (!price_per_second || !supported_durations)) {
        throw new Error('按秒计费模型必须提供price_per_second和supported_durations');
      }
      if (pricing_type === 'per_resolution' && !resolution_pricing) {
        throw new Error('按分辨率计费模型必须提供resolution_pricing');
      }

      // 检查模型是否存在
      const existing = await this.getPricingByKey(model_key);

      if (existing) {
        // 更新
        await getConnection().execute(
          `UPDATE model_pricing
          SET model_name = ?, model_type = ?, pricing_type = ?,
              base_price = ?, price_per_second = ?, supported_durations = ?,
              resolution_pricing = ?, is_active = ?, description = ?,
              updated_at = NOW()
          WHERE model_key = ?`,
          [
            model_name,
            model_type,
            pricing_type,
            base_price,
            price_per_second,
            supported_durations ? JSON.stringify(supported_durations) : null,
            resolution_pricing ? JSON.stringify(resolution_pricing) : null,
            is_active,
            description,
            model_key
          ]
        );

        return { ...data, id: existing.id };
      } else {
        // 创建
        const [result] = await getConnection().execute(
          `INSERT INTO model_pricing
          (model_key, model_name, model_type, pricing_type, base_price, price_per_second,
           supported_durations, resolution_pricing, is_active, description)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            model_key,
            model_name,
            model_type,
            pricing_type,
            base_price,
            price_per_second,
            supported_durations ? JSON.stringify(supported_durations) : null,
            resolution_pricing ? JSON.stringify(resolution_pricing) : null,
            is_active,
            description
          ]
        );

        return { ...data, id: result.insertId };
      }
    } catch (error) {
      console.error('创建/更新模型价格失败:', error);
      throw error;
    }
  }

  /**
   * 删除模型价格配置（管理员）
   */
  async deletePricing(modelKey) {
    try {
      const [result] = await getConnection().execute(
        'DELETE FROM model_pricing WHERE model_key = ?',
        [modelKey]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('删除模型价格失败:', error);
      throw new Error('删除模型价格失败');
    }
  }

  /**
   * 启用/禁用模型（管理员）
   */
  async toggleModelStatus(modelKey, isActive) {
    try {
      await getConnection().execute(
        'UPDATE model_pricing SET is_active = ?, updated_at = NOW() WHERE model_key = ?',
        [isActive, modelKey]
      );

      return { success: true };
    } catch (error) {
      console.error('切换模型状态失败:', error);
      throw new Error('切换模型状态失败');
    }
  }

  /**
   * 获取模型价格摘要（给前端展示）
   */
  async getPricingSummary(modelKey) {
    try {
      const pricing = await this.getPricingByKey(modelKey);

      if (!pricing) {
        return null;
      }

      let summary = `${pricing.model_name} - `;

      switch (pricing.pricing_type) {
        case 'fixed':
          summary += `${pricing.base_price}弹珠/次`;
          break;
        case 'per_second':
          summary += `${pricing.price_per_second}弹珠/秒 (支持${pricing.supported_durations.join('/')}秒)`;
          break;
        case 'per_resolution':
          const prices = Object.entries(pricing.resolution_pricing)
            .map(([key, value]) => `${key}=${value}弹珠`)
            .join(', ');
          summary += prices;
          break;
      }

      return summary;
    } catch (error) {
      console.error('获取价格摘要失败:', error);
      return null;
    }
  }
}

module.exports = new ModelPricingService();
