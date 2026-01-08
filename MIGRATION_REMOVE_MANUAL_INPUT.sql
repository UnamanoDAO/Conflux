-- ============================================
-- 数据迁移脚本：废弃 manual_input 字段
-- 执行时间：请在低峰期执行
-- 预计耗时：取决于数据量
-- ============================================

-- 步骤1：数据备份（强烈建议）
-- 在执行任何修改前，先备份整个数据库
-- mysqldump -u username -p database_name > backup_before_migration.sql

-- 步骤2：数据一致性检查
-- 检查有多少条记录的 content 和 manual_input 不一致
SELECT
    COUNT(*) as total_records,
    SUM(CASE WHEN content IS NULL OR content = '' THEN 1 ELSE 0 END) as empty_content,
    SUM(CASE WHEN manual_input IS NULL OR manual_input = '' THEN 1 ELSE 0 END) as empty_manual_input,
    SUM(CASE WHEN content != manual_input THEN 1 ELSE 0 END) as inconsistent_records
FROM prompts;

-- 步骤3：数据迁移
-- 将 manual_input 的值同步到 content（如果 content 为空或与 manual_input 不同）
UPDATE prompts
SET content = COALESCE(manual_input, content, '')
WHERE manual_input IS NOT NULL
  AND (content IS NULL OR content = '' OR content != manual_input);

-- 步骤4：验证迁移结果
-- 检查是否还有空的 content
SELECT COUNT(*) as records_with_empty_content
FROM prompts
WHERE content IS NULL OR content = '';

-- 查看前10条记录，确认数据正确
SELECT id, name,
       LEFT(content, 50) as content_preview,
       LEFT(manual_input, 50) as manual_input_preview,
       created_at, updated_at
FROM prompts
ORDER BY updated_at DESC
LIMIT 10;

-- 步骤5：删除 manual_input 字段
-- ⚠️ 警告：这是不可逆操作！请确保已备份数据
-- ⚠️ 建议先在测试环境执行，确认无误后再在生产环境执行
-- ⚠️ 执行前请确保应用代码已更新并部署

-- 取消注释下面的语句来执行删除操作
-- ALTER TABLE prompts DROP COLUMN manual_input;

-- 步骤6：验证字段已删除
-- 取消注释下面的语句来验证
-- DESCRIBE prompts;

-- ============================================
-- 回滚脚本（如果需要恢复 manual_input 字段）
-- ============================================

-- 如果需要回滚，执行以下语句：
-- ALTER TABLE prompts ADD COLUMN manual_input TEXT AFTER content;
-- UPDATE prompts SET manual_input = content;

-- ============================================
-- 执行说明
-- ============================================

/*
执行步骤：

1. 备份数据库
   mysqldump -u username -p database_name > backup_before_migration.sql

2. 连接到数据库
   mysql -u username -p database_name

3. 执行步骤2-4（数据检查和迁移）
   source MIGRATION_REMOVE_MANUAL_INPUT.sql

4. 检查迁移结果，确认数据正确

5. 部署更新后的应用代码（前端+后端）

6. 确认应用运行正常后，执行步骤5（删除字段）
   取消注释 ALTER TABLE 语句并执行

7. 验证应用功能正常

注意事项：
- 建议在测试环境先执行一遍
- 在生产环境执行前做好完整备份
- 选择低峰期执行
- 执行后监控应用日志，确保无错误
*/
