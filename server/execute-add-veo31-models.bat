@echo off
chcp 65001 > nul
echo.
echo ================================================
echo VEO3.1 模型数据库配置工具
echo ================================================
echo.
echo Google 最新的 VEO3.1 视频生成模型
echo - veo3.1-pro: 高质量模式（超高质量，价格高）
echo - veo3.1: 快速模式（性价比最高，推荐）
echo - veo3.1-components: 多图融合模式（支持1-3张图）
echo.

cd /d "%~dp0"

echo 正在执行 Node.js 脚本...
echo.

node add-veo31-models.js

if %errorlevel% equ 0 (
    echo.
    echo ================================================
    echo ✓ 配置成功完成！
    echo ================================================
    echo.
    echo 下一步：
    echo 1. 重启后端服务 (npm run dev)
    echo 2. 刷新前端浏览器 (Ctrl + Shift + R)
    echo 3. 选择 VEO3.1 模型开始使用
    echo.
    echo 💡 推荐使用 veo3.1 模型（性价比最高）
    echo.
) else (
    echo.
    echo ================================================
    echo ✗ 配置失败
    echo ================================================
    echo.
    echo 请检查：
    echo 1. 数据库配置是否正确 (server/config.js)
    echo 2. 数据库连接是否正常
    echo 3. 上方的错误信息
    echo.
)

pause

