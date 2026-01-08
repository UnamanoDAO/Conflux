#!/bin/bash

# 构建 Docker 镜像并推送到镜像仓库（可选）
# 如果使用阿里云容器镜像服务，取消下面的注释并配置

set -e

echo "================================================"
echo "构建 Docker 镜像"
echo "================================================"

# 镜像标签
VERSION=${1:-latest}
REGISTRY="registry.cn-beijing.aliyuncs.com"  # 阿里云北京
NAMESPACE="your-namespace"  # 替换为你的命名空间

FRONTEND_IMAGE="${REGISTRY}/${NAMESPACE}/creatimage-frontend:${VERSION}"
SERVER_IMAGE="${REGISTRY}/${NAMESPACE}/creatimage-server:${VERSION}"

echo "前端镜像: ${FRONTEND_IMAGE}"
echo "后端镜像: ${SERVER_IMAGE}"
echo ""

# 构建前端镜像
echo "🔨 构建前端镜像..."
cd frontend
docker build -t ${FRONTEND_IMAGE} .
cd ..

# 构建后端镜像
echo "🔨 构建后端镜像..."
cd server
docker build -t ${SERVER_IMAGE} .
cd ..

echo ""
echo "✅ 镜像构建完成"
echo ""

# 询问是否推送
read -p "是否推送镜像到仓库？(y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 登录阿里云容器镜像服务
    echo "🔐 登录镜像仓库..."
    echo "请输入阿里云容器镜像服务的用户名和密码"
    docker login --username=your-username ${REGISTRY}
    
    # 推送镜像
    echo ""
    echo "📤 推送前端镜像..."
    docker push ${FRONTEND_IMAGE}
    
    echo ""
    echo "📤 推送后端镜像..."
    docker push ${SERVER_IMAGE}
    
    echo ""
    echo "✅ 镜像推送完成"
    echo ""
    echo "在服务器上拉取镜像："
    echo "  docker pull ${FRONTEND_IMAGE}"
    echo "  docker pull ${SERVER_IMAGE}"
else
    echo "跳过推送"
fi

echo ""
echo "================================================"
echo "完成！"
echo "================================================"

