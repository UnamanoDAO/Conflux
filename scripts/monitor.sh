#!/bin/bash

# 监控脚本 - 实时查看服务状态

echo "================================================"
echo "CreatImage 服务监控"
echo "================================================"
echo ""

# 服务状态
echo "📊 服务状态:"
docker-compose ps
echo ""

# 健康检查
echo "🏥 健康状态:"
echo "前端: $(docker inspect creatimage-frontend --format='{{.State.Health.Status}}' 2>/dev/null || echo 'N/A')"
echo "后端: $(docker inspect creatimage-server --format='{{.State.Health.Status}}' 2>/dev/null || echo 'N/A')"
echo "Redis: $(docker inspect creatimage-redis --format='{{.State.Health.Status}}' 2>/dev/null || echo 'N/A')"
echo ""

# 资源使用
echo "💻 资源使用:"
docker stats --no-stream creatimage-frontend creatimage-server creatimage-redis
echo ""

# 网络连接
echo "🌐 网络连接:"
echo "监听端口:"
netstat -tlnp | grep -E ':80|:443|:3001|:6379' || echo "  无"
echo ""

# 磁盘使用
echo "💾 磁盘使用:"
df -h | grep -E 'Filesystem|/$|/opt'
echo ""

# Docker 镜像
echo "🖼️  Docker 镜像:"
docker images | grep creatimage
echo ""

# 最近日志
echo "📝 最近日志 (后端):"
docker-compose logs --tail=10 server
echo ""

echo "================================================"
echo "监控完成"
echo "================================================"
echo ""
echo "💡 提示:"
echo "  实时日志: docker-compose logs -f"
echo "  进入容器: docker-compose exec server sh"
echo "  重启服务: docker-compose restart"
echo ""

