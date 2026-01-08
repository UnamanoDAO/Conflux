const express = require('express');
const router = express.Router();
const multer = require('multer');
const ossManager = require('../utils/ossManager');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// 获取用户的所有参考图
router.get('/list', async (req, res) => {
  try {
    const userId = req.user?.id;
    const since = req.query.since; // 时间戳，仅返回此时间之后的更新

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '请先登录'
      });
    }

    // 安全：只获取用户自己的参考图，不显示公共图片
    const userImages = await req.app.locals.referenceImageService.getUserReferenceImages(userId);

    let allImages = userImages.map(img => ({ ...img, isPublic: false }));

    // 如果提供了 since 参数，只返回更新的图片
    let deletedIds = [];
    if (since) {
      const sinceDate = new Date(parseInt(since));

      // 过滤出在 since 时间之后创建或更新的图片
      const updatedImages = allImages.filter(img => {
        const createdAt = new Date(img.created_at);
        const updatedAt = img.updated_at ? new Date(img.updated_at) : createdAt;
        return updatedAt > sinceDate || createdAt > sinceDate;
      });

      // 为简化，这里只返回新增和更新的图片
      allImages = updatedImages;

      console.log(`[增量查询] since=${sinceDate.toISOString()}, 返回${allImages.length}个更新的图片`);
    }

    // 查询分类名称（通过category_id）
    const connection = await req.app.locals.referenceImageService.connection;
    const categoryIds = [...new Set(allImages.map(img => img.category_id).filter(Boolean))];
    const categoryMap = {};

    if (categoryIds.length > 0) {
      const placeholders = categoryIds.map(() => '?').join(',');
      const [categories] = await connection.execute(
        `SELECT id, name FROM reference_image_categories WHERE id IN (${placeholders})`,
        categoryIds
      );
      categories.forEach(cat => {
        categoryMap[cat.id] = cat.name;
      });
    }

    // 返回图片列表，包含OSS URL和分类名称
    res.json({
      success: true,
      images: allImages.map(img => ({
        id: img.id,
        name: img.name,
        category: categoryMap[img.category_id] || null, // 分类名称
        category_id: img.category_id, // 分类ID
        ossUrl: img.oss_url,
        thumbnailUrl: img.thumbnail_url || img.oss_url,
        originalName: img.original_name,
        size: img.size,
        mimeType: img.mime_type,
        isPublic: false, // 所有图片都是用户自己的
        createdAt: img.created_at,
        updatedAt: img.updated_at
      })),
      deletedIds: deletedIds, // 已删除的图片ID列表（如果实现了删除检测）
      timestamp: Date.now() // 当前服务器时间戳，供下次增量查询使用
    });
  } catch (error) {
    console.error('获取参考图列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取参考图列表失败'
    });
  }
});

// 获取分类列表
router.get('/categories', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '请先登录'
      });
    }

    const categories = await req.app.locals.referenceImageService.getCategories(userId);

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('获取分类失败:', error);
    res.status(500).json({
      success: false,
      error: '获取分类失败'
    });
  }
});

// 获取单个参考图详情（用于提示词卡片加载）
// 注意：这个路由必须放在具体路径（如 /list, /categories）之后，避免路由冲突
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    const imageId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '请先登录'
      });
    }

    // 从数据库获取参考图信息
    const connection = await req.app.locals.referenceImageService.connection;
    const [rows] = await connection.execute(
      `SELECT id, name, original_name, oss_url, url, oss_thumbnail_url,
              file_size, mime_type, category_id, created_at
       FROM reference_images
       WHERE id = ? AND (user_id = ? OR user_id IS NULL)`,
      [imageId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '参考图不存在'
      });
    }

    const image = rows[0];

    res.json({
      success: true,
      data: {
        id: image.id,
        name: image.name,
        original_name: image.original_name,
        oss_url: image.oss_url,
        url: image.url || image.oss_url,
        thumbnail_url: image.oss_thumbnail_url || image.oss_url,
        file_size: image.file_size,
        mime_type: image.mime_type,
        category_id: image.category_id,
        created_at: image.created_at
      }
    });
  } catch (error) {
    console.error('获取参考图详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取参考图详情失败'
    });
  }
});

// 上传新的参考图
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const userId = req.user?.id;
    const { name, category } = req.body;
    const file = req.file;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '请先登录'
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        error: '请选择要上传的图片'
      });
    }

    // 生成唯一的文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${timestamp}_${randomStr}.${fileExt}`;

    // 上传到OSS
    const ossKey = `reference-images/${userId}/${fileName}`;
    const ossUrl = await ossManager.uploadBuffer(file.buffer, ossKey, file.mimetype);

    // 生成缩略图URL（如果需要的话，可以使用OSS的图片处理功能）
    let thumbnailUrl = ossUrl;
    // 如果是阿里云OSS，可以添加图片处理参数来生成缩略图
    if (ossUrl.includes('aliyuncs.com')) {
      thumbnailUrl = `${ossUrl}?x-oss-process=image/resize,w_200,h_200,m_fill`;
    }

    // 保存到数据库
    const imageRecord = await req.app.locals.referenceImageService.addReferenceImage({
      userId,
      name: name || file.originalname,
      category: category || 'default',
      ossUrl,
      thumbnailUrl,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype
    });

    res.json({
      success: true,
      image: {
        id: imageRecord.id,
        name: imageRecord.name,
        category: imageRecord.category,
        ossUrl: imageRecord.oss_url,
        thumbnailUrl: imageRecord.thumbnail_url,
        originalName: imageRecord.original_name,
        size: imageRecord.size,
        mimeType: imageRecord.mime_type
      }
    });
  } catch (error) {
    console.error('上传参考图失败:', error);
    res.status(500).json({
      success: false,
      error: '上传参考图失败'
    });
  }
});

// 删除参考图
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    const imageId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '请先登录'
      });
    }

    await req.app.locals.referenceImageService.deleteReferenceImage(imageId, userId);

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除参考图失败:', error);
    res.status(500).json({
      success: false,
      error: '删除参考图失败'
    });
  }
});

// 获取分类列表
router.get('/categories', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '请先登录'
      });
    }

    const categories = await req.app.locals.referenceImageService.getCategories(userId);

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('获取分类失败:', error);
    res.status(500).json({
      success: false,
      error: '获取分类失败'
    });
  }
});

module.exports = router;