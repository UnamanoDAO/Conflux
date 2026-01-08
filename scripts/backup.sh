#!/bin/bash

# 备份脚本
# 备份上传文件和 Redis 数据

set -e

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

echo "================================================"
echo "CreatImage 备份脚本"
echo "================================================"
echo ""

# 创建备份目录
mkdir -p ${BACKUP_DIR}

echo "📦 开始备份..."
echo "备份时间: ${DATE}"
echo ""

# 1. 备份上传文件
if [ -d "server/uploads" ]; then
    echo "📁 备份上传文件..."
    tar -czf "${BACKUP_DIR}/uploads-${DATE}.tar.gz" server/uploads/
    echo "✅ 上传文件备份完成: ${BACKUP_DIR}/uploads-${DATE}.tar.gz"
else
    echo "⚠️  未找到 uploads 目录"
fi

echo ""

# 2. 备份 Redis 数据
echo "💾 备份 Redis 数据..."
docker-compose exec -T redis redis-cli SAVE
docker cp creatimage-redis:/data/dump.rdb "${BACKUP_DIR}/redis-${DATE}.rdb"
echo "✅ Redis 数据备份完成: ${BACKUP_DIR}/redis-${DATE}.rdb"

echo ""

# 3. 备份配置文件
echo "⚙️  备份配置文件..."
tar -czf "${BACKUP_DIR}/config-${DATE}.tar.gz" \
    .env.production \
    nginx/ \
    server/config.js \
    docker-compose.yml
echo "✅ 配置文件备份完成: ${BACKUP_DIR}/config-${DATE}.tar.gz"

echo ""

# 4. 显示备份文件大小
echo "📊 备份文件："
ls -lh ${BACKUP_DIR}/*${DATE}*

echo ""

# 5. 清理旧备份（保留最近7天）
echo "🧹 清理旧备份（保留最近7天）..."
find ${BACKUP_DIR} -name "*.tar.gz" -mtime +7 -delete
find ${BACKUP_DIR} -name "*.rdb" -mtime +7 -delete
echo "✅ 清理完成"

echo ""
echo "================================================"
echo "✅ 备份完成！"
echo "================================================"
echo ""
echo "备份位置: ${BACKUP_DIR}"
echo "备份时间: ${DATE}"
echo ""
echo "恢复方式："
echo "  上传文件: tar -xzf ${BACKUP_DIR}/uploads-${DATE}.tar.gz"
echo "  Redis: docker cp ${BACKUP_DIR}/redis-${DATE}.rdb creatimage-redis:/data/dump.rdb"
echo "  配置: tar -xzf ${BACKUP_DIR}/config-${DATE}.tar.gz"
echo ""

