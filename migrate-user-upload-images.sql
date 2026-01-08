-- ====================================================================
-- 手动迁移脚本：将 user-upload 分类下的图片标记为 is_user_upload = 1
-- ====================================================================
--
-- 使用方法 1 (MySQL 命令行):
--   mysql -u root -p creatimage < migrate-user-upload-images.sql
--
-- 使用方法 2 (MySQL Workbench 或其他客户端):
--   复制下面的 SQL 命令并执行
--
-- ====================================================================

-- 1. 检查当前状态
SELECT '========== 1. 当前状态检查 ==========' as '';

-- 检查 is_user_upload 列是否存在
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'reference_images' 
  AND COLUMN_NAME = 'is_user_upload';

-- 如果上面查询没有结果，说明列不存在，请先重启服务器！

-- 2. 查找 user-upload 分类
SELECT '========== 2. user-upload 分类 ==========' as '';

SELECT 
    id,
    name,
    user_id,
    created_at
FROM reference_image_categories 
WHERE name = 'user-upload';

-- 3. 统计需要迁移的图片
SELECT '========== 3. 迁移前统计 ==========' as '';

SELECT 
    ric.id as category_id,
    ric.name as category_name,
    ric.user_id,
    COUNT(ri.id) as total_images,
    SUM(CASE WHEN ri.is_user_upload = 1 THEN 1 ELSE 0 END) as already_migrated,
    SUM(CASE WHEN ri.is_user_upload = 0 OR ri.is_user_upload IS NULL THEN 1 ELSE 0 END) as need_migration
FROM reference_image_categories ric
LEFT JOIN reference_images ri ON ri.category_id = ric.id
WHERE ric.name = 'user-upload'
GROUP BY ric.id, ric.name, ric.user_id;

-- 4. 显示将要迁移的图片（示例，最多10张）
SELECT '========== 4. 需要迁移的图片示例 ==========' as '';

SELECT 
    ri.id,
    ri.original_name,
    ri.is_user_upload,
    ri.category_id,
    ric.name as category_name,
    ri.user_id,
    ri.created_at
FROM reference_images ri
JOIN reference_image_categories ric ON ri.category_id = ric.id
WHERE ric.name = 'user-upload'
  AND (ri.is_user_upload = 0 OR ri.is_user_upload IS NULL)
ORDER BY ri.created_at DESC
LIMIT 10;

-- ====================================================================
-- 5. 执行迁移（重要！）
-- ====================================================================
-- ⚠️ 下面的 UPDATE 语句会修改数据，请确认上面的查询结果正确后再执行
-- ====================================================================

SELECT '========== 5. 开始迁移 ==========' as '';

-- 将 user-upload 分类下的所有图片标记为 is_user_upload = 1
UPDATE reference_images 
SET is_user_upload = 1 
WHERE category_id IN (
    SELECT id FROM reference_image_categories WHERE name = 'user-upload'
)
AND (is_user_upload = 0 OR is_user_upload IS NULL);

-- 显示影响的行数
SELECT ROW_COUNT() as '已迁移图片数量';

-- 6. 验证迁移结果
SELECT '========== 6. 迁移后验证 ==========' as '';

SELECT 
    ric.id as category_id,
    ric.name as category_name,
    ric.user_id,
    COUNT(ri.id) as total_images,
    SUM(CASE WHEN ri.is_user_upload = 1 THEN 1 ELSE 0 END) as migrated,
    SUM(CASE WHEN ri.is_user_upload = 0 OR ri.is_user_upload IS NULL THEN 1 ELSE 0 END) as not_migrated
FROM reference_image_categories ric
LEFT JOIN reference_images ri ON ri.category_id = ric.id
WHERE ric.name = 'user-upload'
GROUP BY ric.id, ric.name, ric.user_id;

-- 预期：not_migrated 应该为 0

-- 7. 整体统计
SELECT '========== 7. 整体统计 ==========' as '';

SELECT 
    '总图片数' as metric,
    COUNT(*) as count
FROM reference_images
UNION ALL
SELECT 
    '用户上传图片 (is_user_upload=1)' as metric,
    COUNT(*) as count
FROM reference_images
WHERE is_user_upload = 1
UNION ALL
SELECT 
    '常用参考图 (is_user_upload=0)' as metric,
    COUNT(*) as count
FROM reference_images
WHERE (is_user_upload = 0 OR is_user_upload IS NULL)
  AND (is_prompt_reference = 0 OR is_prompt_reference IS NULL)
UNION ALL
SELECT 
    '提示词模板图 (is_prompt_reference=1)' as metric,
    COUNT(*) as count
FROM reference_images
WHERE is_prompt_reference = 1;

-- 8. 显示迁移后的图片分布
SELECT '========== 8. 图片分布 ==========' as '';

SELECT 
    CASE 
        WHEN is_user_upload = 1 THEN '用户上传图片'
        WHEN is_prompt_reference = 1 THEN '提示词模板图'
        ELSE '常用参考图'
    END as image_type,
    COUNT(*) as count,
    CONCAT(ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM reference_images), 2), '%') as percentage
FROM reference_images
GROUP BY image_type;

-- ====================================================================
-- 迁移完成！
-- ====================================================================
-- 
-- 下一步:
-- 1. 检查上面的验证结果，确认 not_migrated = 0
-- 2. 刷新浏览器 (Ctrl+Shift+R)
-- 3. 打开常用参考图管理器
-- 4. 确认之前的 user-upload 图片不再显示
--
-- ====================================================================

SELECT '========== ✓ 迁移完成 ==========' as '';
SELECT '请刷新浏览器查看效果！' as '';

