-- 检查 user-upload 分离功能的数据库迁移状态

-- 1. 检查 is_user_upload 列是否存在
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'reference_images' 
  AND COLUMN_NAME = 'is_user_upload';
-- 预期结果: 应该有1行，显示列的详细信息

-- 2. 检查 user-upload 分类是否存在
SELECT 
    id,
    name,
    user_id,
    created_at,
    (SELECT COUNT(*) FROM reference_images WHERE category_id = ric.id) as image_count
FROM reference_image_categories ric
WHERE name = 'user-upload';
-- 预期结果: 如果有旧数据，会显示 user-upload 分类和其图片数量

-- 3. 检查是否有图片被标记为 is_user_upload = 1
SELECT 
    COUNT(*) as total_user_upload_images,
    COUNT(DISTINCT user_id) as affected_users
FROM reference_images 
WHERE is_user_upload = 1;
-- 预期结果: 显示有多少图片被标记为用户上传

-- 4. 检查 user-upload 分类下的图片是否已迁移
SELECT 
    ri.id,
    ri.original_name,
    ri.is_user_upload,
    ri.category_id,
    ric.name as category_name,
    ri.user_id,
    ri.created_at
FROM reference_images ri
LEFT JOIN reference_image_categories ric ON ri.category_id = ric.id
WHERE ric.name = 'user-upload' OR ri.is_user_upload = 1
ORDER BY ri.created_at DESC
LIMIT 20;
-- 预期结果: 显示所有用户上传的图片及其迁移状态

-- 5. 检查是否有未迁移的图片（在 user-upload 分类但 is_user_upload = 0）
SELECT 
    COUNT(*) as unmigrated_images
FROM reference_images ri
JOIN reference_image_categories ric ON ri.category_id = ric.id
WHERE ric.name = 'user-upload' AND (ri.is_user_upload = 0 OR ri.is_user_upload IS NULL);
-- 预期结果: 应该是 0，表示所有图片都已迁移

-- 6. 查看所有分类及其图片数量（包括 user-upload）
SELECT 
    ric.id,
    ric.name,
    ric.user_id,
    COUNT(ri.id) as total_images,
    SUM(CASE WHEN ri.is_user_upload = 1 THEN 1 ELSE 0 END) as user_upload_images,
    SUM(CASE WHEN ri.is_user_upload = 0 OR ri.is_user_upload IS NULL THEN 1 ELSE 0 END) as common_images
FROM reference_image_categories ric
LEFT JOIN reference_images ri ON ri.category_id = ric.id
GROUP BY ric.id, ric.name, ric.user_id
ORDER BY ric.name;
-- 预期结果: 显示每个分类的图片分布

-- 7. 查看用户的常用参考图（应该排除 is_user_upload = 1）
SELECT 
    ri.id,
    ri.original_name,
    ri.is_user_upload,
    ric.name as category_name,
    ri.user_id,
    ri.created_at
FROM reference_images ri
LEFT JOIN reference_image_categories ric ON ri.category_id = ric.id
WHERE ri.user_id = 1  -- 替换为你的用户ID
  AND (ri.is_prompt_reference = 0 OR ri.is_prompt_reference IS NULL)
  AND (ri.is_user_upload = 0 OR ri.is_user_upload IS NULL)
ORDER BY ri.created_at DESC
LIMIT 20;
-- 预期结果: 只显示常用参考图，不包括用户上传的图片

-- 8. 查看用户上传的图片（用于生成）
SELECT 
    ri.id,
    ri.original_name,
    ri.is_user_upload,
    ric.name as category_name,
    ri.user_id,
    ri.created_at
FROM reference_images ri
LEFT JOIN reference_image_categories ric ON ri.category_id = ric.id
WHERE ri.user_id = 1  -- 替换为你的用户ID
  AND ri.is_user_upload = 1
ORDER BY ri.created_at DESC
LIMIT 20;
-- 预期结果: 只显示用户上传的图片（用于生成的）

-- 9. 统计概览
SELECT 
    '总图片数' as metric,
    COUNT(*) as count
FROM reference_images
UNION ALL
SELECT 
    '用户上传图片' as metric,
    COUNT(*) as count
FROM reference_images
WHERE is_user_upload = 1
UNION ALL
SELECT 
    '常用参考图' as metric,
    COUNT(*) as count
FROM reference_images
WHERE (is_user_upload = 0 OR is_user_upload IS NULL)
  AND (is_prompt_reference = 0 OR is_prompt_reference IS NULL)
UNION ALL
SELECT 
    '提示词模板图' as metric,
    COUNT(*) as count
FROM reference_images
WHERE is_prompt_reference = 1
UNION ALL
SELECT 
    'user-upload分类图片数' as metric,
    COUNT(*) as count
FROM reference_images ri
JOIN reference_image_categories ric ON ri.category_id = ric.id
WHERE ric.name = 'user-upload';
-- 预期结果: 显示各类图片的统计数据

