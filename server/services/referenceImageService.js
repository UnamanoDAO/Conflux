class ReferenceImageService {
  constructor(connection) {
    this.connection = connection;
  }

  // 获取用户的参考图（排除提示词参考图和user-upload分类）
  async getUserReferenceImages(userId, category = null) {
    let query = `
      SELECT r.* FROM reference_images r
      LEFT JOIN reference_image_categories c ON r.category_id = c.id
      WHERE r.user_id = ?
      AND (r.is_prompt_reference = 0 OR r.is_prompt_reference IS NULL)
      AND (c.name != 'user-upload' OR c.name IS NULL)
      ORDER BY r.created_at DESC
    `;
    const params = [userId];

    if (category) {
      query = `
        SELECT r.* FROM reference_images r
        LEFT JOIN reference_image_categories c ON r.category_id = c.id
        WHERE r.user_id = ? AND r.category = ?
        AND (r.is_prompt_reference = 0 OR r.is_prompt_reference IS NULL)
        AND (c.name != 'user-upload' OR c.name IS NULL)
        ORDER BY r.created_at DESC
      `;
      params.push(category);
    }

    const [rows] = await this.connection.execute(query, params);
    return rows;
  }

  // 获取所有公共参考图（管理员上传的）
  async getPublicReferenceImages(category = null) {
    let query = `
      SELECT * FROM reference_images
      WHERE user_id = 1
      ORDER BY created_at DESC
    `;
    const params = [];

    if (category) {
      query = `
        SELECT * FROM reference_images
        WHERE user_id = 1 AND category = ?
        ORDER BY created_at DESC
      `;
      params.push(category);
    }

    const [rows] = await this.connection.execute(query, params);
    return rows;
  }

  // 添加参考图
  async addReferenceImage(data) {
    const {
      userId,
      name,
      category,
      ossUrl,
      thumbnailUrl,
      originalName,
      size,
      mimeType
    } = data;

    const [result] = await this.connection.execute(
      `INSERT INTO reference_images
       (user_id, name, category, oss_url, thumbnail_url, original_name, size, mime_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, name, category || 'default', ossUrl, thumbnailUrl || ossUrl, originalName, size, mimeType]
    );

    return {
      id: result.insertId,
      user_id: userId,
      name,
      category: category || 'default',
      oss_url: ossUrl,
      thumbnail_url: thumbnailUrl || ossUrl,
      original_name: originalName,
      size,
      mime_type: mimeType,
      created_at: new Date()
    };
  }

  // 删除参考图（物理删除）
  async deleteReferenceImage(imageId, userId) {
    await this.connection.execute(
      `DELETE FROM reference_images
       WHERE id = ? AND user_id = ?`,
      [imageId, userId]
    );
  }

  // 通过ID获取参考图
  async getReferenceImageById(imageId, userId = null) {
    let query = `SELECT * FROM reference_images WHERE id = ?`;
    const params = [imageId];

    if (userId) {
      query += ` AND user_id = ?`;
      params.push(userId);
    }

    const [rows] = await this.connection.execute(query, params);
    return rows[0];
  }

  // 获取参考图分类（排除user-upload和提示词参考图）
  async getCategories(userId) {
    // 从 reference_image_categories 表获取分类信息（包括名称）
    const [rows] = await this.connection.execute(
      `SELECT DISTINCT c.id, c.name
       FROM reference_image_categories c
       INNER JOIN reference_images r ON r.category_id = c.id
       WHERE (r.user_id = ? OR r.user_id = 1)
       AND (r.is_prompt_reference = 0 OR r.is_prompt_reference IS NULL)
       AND c.name != 'user-upload'
       ORDER BY c.id`,
      [userId]
    );
    // 返回分类名称数组（保持向后兼容）
    return rows.map(row => row.name);
  }
}

module.exports = ReferenceImageService;