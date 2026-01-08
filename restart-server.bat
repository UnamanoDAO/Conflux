@echo off
echo ========================================
echo 重启视频生成服务器
echo ========================================
echo.

echo [1/4] 停止现有的 Node.js 进程...
taskkill /F /IM node.exe 2>nul
if %errorlevel% == 0 (
    echo      成功停止所有 Node.js 进程
) else (
    echo      没有运行中的 Node.js 进程
)
echo.

echo [2/4] 等待 2 秒...
timeout /t 2 /nobreak >nul
echo.

echo [3/4] 启动服务器（增加内存限制到 4GB）...
cd /d "%~dp0server"
start "Video Server" cmd /k "npm start"
echo      服务器已在新窗口中启动
echo.

echo [4/4] 完成！
echo.
echo ========================================
echo 提示:
echo - 服务器已在新窗口中运行
echo - 内存限制: 4GB (--max-old-space-size=4096)
echo - 关闭命令窗口将停止服务器
echo ========================================
pause
