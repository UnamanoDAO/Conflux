@echo off
chcp 65001 >nul
title AI Image Generation System - Quick Start

echo ========================================
echo    AI图片生成系统 - 快速启动
echo ========================================
echo.

REM 启动后端服务
echo [1/2] 启动后端服务...
cd /d "%~dp0server"
start "后端服务 - Backend" cmd /k "npm run dev"

REM 等待2秒
timeout /t 2 /nobreak >nul

REM 启动前端服务
echo [2/2] 启动前端服务...
cd /d "%~dp0frontend"
start "前端服务 - Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo   启动完成！
echo ========================================
echo.
echo   后端服务和前端服务已在新窗口中启动
echo   关闭窗口或运行 stop-all.bat 可停止服务
echo.

cd /d "%~dp0"
timeout /t 3 >nul
exit


