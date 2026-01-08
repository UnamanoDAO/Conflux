@echo off
chcp 65001 > nul
echo ========================================
echo 执行数据库迁移：添加历史记录状态字段
echo ========================================
echo.

echo 正在执行迁移脚本...
node run-migration.js migrations/add-history-status-field.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo 迁移执行成功！
    echo ========================================
) else (
    echo.
    echo ========================================
    echo 迁移执行失败！错误代码: %ERRORLEVEL%
    echo ========================================
)

pause




























