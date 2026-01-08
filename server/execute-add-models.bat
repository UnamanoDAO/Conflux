@echo off
REM 执行添加千问和快手可灵模型的SQL脚本 (Windows版本)

REM 数据库配置
set DB_HOST=rm-2ze58tvrta52qmyz1lo.mysql.rds.aliyuncs.com
set DB_USER=sousoujuan
set DB_PASSWORD=Xj196210*
set DB_NAME=creatimage

echo 正在连接阿里云RDS数据库...
echo 执行SQL脚本: add-qwen-kling-models.sql

REM 执行SQL脚本
mysql -h %DB_HOST% -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% < add-qwen-kling-models.sql

if %errorlevel% == 0 (
    echo ✅ SQL脚本执行成功！
    echo 已添加5个模型：2个Qwen + 3个Kling
) else (
    echo ❌ SQL脚本执行失败，请检查错误信息
)

pause

