#!/bin/bash

# 更新部署脚本
# 用于更新已部署的服务

set -e

echo "================================================"
echo "CreatImage 更新脚本"
echo "================================================"
echo ""

# 检查是否有 .env.production
if [ ! -f ".env.production" ]; then
    echo "❌ 未找到 .env.production 文件"
    exit 1
fi

echo "🔄 开始更新流程..."
echo ""

# 1. 拉取最新代码（如果使用 Git）
if [ -d ".git" ]; then
    echo "📥 拉取最新代码..."
    git pull
    echo "✅ 代码已更新"
else
    echo "ℹ️  非 Git 仓库，跳过代码拉取"
    echo "   如果有新代码，请手动上传并覆盖文件"
fi

echo ""

# 2. 停止服务
echo "🛑 停止现有服务..."
docker-compose down

# 3. 重新构建镜像
echo ""
echo "🔨 重新构建镜像..."
docker-compose --env-file .env.production build --no-cache

# 4. 启动服务
echo ""
echo "🚀 启动服务..."
docker-compose --env-file .env.production up -d

# 5. 等待服务启动
echo ""
echo "⏳ 等待服务启动..."
sleep 15

# 6. 检查服务状态
echo ""
echo "📊 服务状态："
docker-compose ps

# 7. 查看最新日志
echo ""
echo "📝 最新日志（Ctrl+C 退出）："
echo ""
docker-compose logs --tail=50 -f

echo ""
echo "================================================"
echo "✅ 更新完成！"
echo "================================================"

