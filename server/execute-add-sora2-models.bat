@echo off
chcp 65001 > nul
echo ================================================
echo 正在添加 Sora2 模型到数据库...
echo ================================================
echo.
echo 数据库: creatimage
echo 主机: rm-cn-zxu3xggvs0008eo.rwlb.rds.aliyuncs.com
echo.
echo 执行 SQL 脚本: add-sora2-models.sql
echo.

mysql -h rm-cn-zxu3xggvs0008eo.rwlb.rds.aliyuncs.com -P 3306 -u sousoujuan -p < add-sora2-models.sql

if %errorlevel% equ 0 (
    echo.
    echo ================================================
    echo ✓ Sora2 模型添加成功！
    echo ================================================
    echo.
    echo 已添加以下模型：
    echo   1. Sora2-文生视频 (sora-2)
    echo   2. Sora2 Pro-文生视频 (sora-2-pro)
    echo   3. Sora2-图生视频 (sora-2)
    echo   4. Sora2 Pro-图生视频 (sora-2-pro)
    echo.
) else (
    echo.
    echo ================================================
    echo ✗ SQL 脚本执行失败，请检查错误信息
    echo ================================================
    echo.
)

pause

