#!/bin/bash

# 在 Docker 环境中初始化数据库
# 使用方式: ./scripts/init-db-docker.sh

set -e

echo "================================================"
echo "数据库初始化脚本"
echo "================================================"
echo ""

# 检查 .env.production 是否存在
if [ ! -f ".env.production" ]; then
    echo "❌ 未找到 .env.production 文件"
    echo "请先创建并配置环境变量文件"
    exit 1
fi

# 加载环境变量
source .env.production

echo "数据库配置："
echo "  主机: ${DB_HOST}"
echo "  端口: ${DB_PORT}"
echo "  用户: ${DB_USER}"
echo "  数据库: ${DB_NAME}"
echo ""

# 检查是否已经有数据库连接
echo "🔍 检查数据库连接..."
if ! mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} -e "SELECT 1;" &>/dev/null; then
    echo "❌ 无法连接到数据库，请检查配置"
    exit 1
fi

echo "✅ 数据库连接成功"
echo ""

# 初始化数据库表
echo "📝 初始化数据库表..."
mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} < server/init-db.sql

echo "📝 初始化视频模型表..."
mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} < server/init-video-models-table.sql

echo ""
echo "✅ 数据库初始化完成"
echo ""

# 运行 Node.js 脚本添加模型
echo "📦 添加图片模型..."
cd server
node add-models-script.js

echo ""
echo "📦 添加 Sora2 模型..."
node add-sora2-models.js

echo ""
echo "📦 添加 VEO3.1 模型..."
node add-veo31-models.js

echo ""
echo "📦 迁移模型模式字段..."
node migrate-model-modes.js

cd ..

echo ""
echo "================================================"
echo "✅ 所有初始化完成！"
echo "================================================"
echo ""
echo "下一步："
echo "1. 启动 Docker 服务: docker-compose up -d"
echo "2. 查看日志: docker-compose logs -f"
echo "3. 访问: http://your-server-ip"
echo ""

