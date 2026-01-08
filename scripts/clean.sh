#!/bin/bash

# 清理脚本 - 清理 Docker 资源

set -e

echo "================================================"
echo "Docker 资源清理脚本"
echo "================================================"
echo ""

echo "当前 Docker 资源使用情况:"
docker system df
echo ""

read -p "是否继续清理？(y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 0
fi

echo ""
echo "🧹 开始清理..."
echo ""

# 1. 清理停止的容器
echo "📦 清理停止的容器..."
docker container prune -f

# 2. 清理未使用的镜像
echo "🖼️  清理未使用的镜像..."
docker image prune -a -f

# 3. 清理未使用的网络
echo "🌐 清理未使用的网络..."
docker network prune -f

# 4. 清理构建缓存
echo "🗂️  清理构建缓存..."
docker builder prune -a -f

echo ""
echo "✅ 清理完成"
echo ""

echo "清理后的资源使用情况:"
docker system df
echo ""

echo "================================================"
echo "完成！"
echo "================================================"
echo ""
echo "⚠️  注意: 此脚本不会删除:"
echo "  - 正在运行的容器"
echo "  - 数据卷 (volumes)"
echo "  - 生产环境镜像"
echo ""

