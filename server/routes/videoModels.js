const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const videoModelService = require('../services/videoModelService');
const { getSupportedProviders } = require('../services/videoProviders');

const router = express.Router();

/**
 * 获取所有视频模型
 * GET /api/video-models
 * 查询参数：
 *  - model_type: 筛选模型类型
 *  - active_only: 只返回活跃的模型
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { model_type, active_only } = req.query;

    let models;
    if (active_only === 'true') {
      models = await videoModelService.getActiveModels(model_type);
    } else {
      models = await videoModelService.getAllModels();
      
      // 如果指定了类型，进行筛选
      if (model_type) {
        models = models.filter(m => m.model_type === model_type);
      }
    }

    // 添加类型的中文名称
    models = models.map(m => ({
      ...m,
      model_type_name: videoModelService.getModelTypeName(m.model_type)
    }));

    res.json({
      success: true,
      data: models
    });
  } catch (error) {
    console.error('获取视频模型列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取视频模型列表失败'
    });
  }
});

/**
 * 获取支持的厂商列表
 * GET /api/video-models/providers
 */
router.get('/providers', authenticateToken, async (req, res) => {
  try {
    const providers = getSupportedProviders();
    res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    console.error('获取厂商列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取厂商列表失败'
    });
  }
});

/**
 * 获取单个视频模型
 * GET /api/video-models/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const model = await videoModelService.getModelById(id);

    if (!model) {
      return res.status(404).json({
        success: false,
        error: '模型不存在'
      });
    }

    res.json({
      success: true,
      data: {
        ...model,
        model_type_name: videoModelService.getModelTypeName(model.model_type)
      }
    });
  } catch (error) {
    console.error('获取视频模型失败:', error);
    res.status(500).json({
      success: false,
      error: '获取视频模型失败'
    });
  }
});

/**
 * 添加视频模型
 * POST /api/video-models
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, provider, model_type, model_id, api_url, api_key, icon_url } = req.body;

    // 验证必填字段
    if (!name || !provider || !model_type || !model_id || !api_url || !api_key) {
      return res.status(400).json({
        success: false,
        error: '缺少必填字段'
      });
    }

    // 验证模型类型
    const validTypes = ['text-to-video', 'image-to-video-first', 'image-to-video-both'];
    if (!validTypes.includes(model_type)) {
      return res.status(400).json({
        success: false,
        error: '无效的模型类型'
      });
    }

    const model = await videoModelService.addModel({
      name,
      provider,
      model_type,
      model_id,
      api_url,
      api_key,
      icon_url: icon_url || null  // 新增：模型图标
    });

    res.json({
      success: true,
      message: '视频模型添加成功',
      data: model
    });
  } catch (error) {
    console.error('添加视频模型失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '添加视频模型失败'
    });
  }
});

/**
 * 更新视频模型
 * PUT /api/video-models/:id
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, provider, model_type, model_id, api_url, api_key, is_active, icon_url } = req.body;

    // 验证模型是否存在
    const existingModel = await videoModelService.getModelById(id);
    if (!existingModel) {
      return res.status(404).json({
        success: false,
        error: '模型不存在'
      });
    }

    // 更新模型
    const success = await videoModelService.updateModel(id, {
      name: name || existingModel.name,
      provider: provider || existingModel.provider,
      model_type: model_type || existingModel.model_type,
      model_id: model_id || existingModel.model_id,
      api_url: api_url || existingModel.api_url,
      api_key: api_key || existingModel.api_key,
      icon_url: icon_url !== undefined ? icon_url : existingModel.icon_url,  // 新增：支持更新icon
      is_active: is_active !== undefined ? is_active : existingModel.is_active
    });

    if (success) {
      res.json({
        success: true,
        message: '视频模型更新成功'
      });
    } else {
      res.status(500).json({
        success: false,
        error: '更新失败'
      });
    }
  } catch (error) {
    console.error('更新视频模型失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '更新视频模型失败'
    });
  }
});

/**
 * 删除视频模型
 * DELETE /api/video-models/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 验证模型是否存在
    const existingModel = await videoModelService.getModelById(id);
    if (!existingModel) {
      return res.status(404).json({
        success: false,
        error: '模型不存在'
      });
    }

    const success = await videoModelService.deleteModel(id);

    if (success) {
      res.json({
        success: true,
        message: '视频模型删除成功'
      });
    } else {
      res.status(500).json({
        success: false,
        error: '删除失败'
      });
    }
  } catch (error) {
    console.error('删除视频模型失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '删除视频模型失败'
    });
  }
});

/**
 * 切换视频模型启用状态
 * PATCH /api/video-models/:id/toggle
 */
router.patch('/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 验证模型是否存在
    const existingModel = await videoModelService.getModelById(id);
    if (!existingModel) {
      return res.status(404).json({
        success: false,
        error: '模型不存在'
      });
    }

    const success = await videoModelService.toggleActive(id);

    if (success) {
      res.json({
        success: true,
        message: '状态切换成功',
        is_active: !existingModel.is_active
      });
    } else {
      res.status(500).json({
        success: false,
        error: '切换失败'
      });
    }
  } catch (error) {
    console.error('切换视频模型状态失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '切换状态失败'
    });
  }
});

module.exports = router;

