# 🚀 AI图片生成工具 - 阿里云CentOS部署包

## 📦 部署包内容

本部署包包含了将AI图片生成工具部署到阿里云CentOS服务器的完整解决方案：

### 🔧 部署脚本
- `server-setup.sh` - 服务器环境配置脚本
- `one-click-deploy.sh` - 一键部署脚本（推荐）
- `deploy.sh` - 标准部署脚本
- `update.sh` - 项目更新脚本
- `pm2-setup.sh` - PM2进程管理配置

### ⚙️ 配置文件
- `nginx.conf` - Nginx反向代理配置
- `production.env` - 生产环境变量配置
- `DEPLOYMENT_GUIDE.md` - 详细部署指南

## 🎯 快速部署（推荐）

### 1. 上传项目文件到服务器
```bash
# 使用scp上传整个项目
scp -r ./server root@your-server-ip:/var/www/creatimage/
scp -r ./frontend root@your-server-ip:/var/www/creatimage/
scp -r ./admin-system root@your-server-ip:/var/www/creatimage/
scp -r ./deploy root@your-server-ip:/var/www/creatimage/
```

### 2. 连接服务器并运行一键部署
```bash
ssh root@your-server-ip
cd /var/www/creatimage
chmod +x deploy/one-click-deploy.sh
./deploy/one-click-deploy.sh
```

### 3. 配置OSS和域名（可选）
```bash
# 编辑环境配置
vim server/.env

# 编辑Nginx配置
vim /etc/nginx/conf.d/creatimage.conf
```

## 📋 部署架构

```
阿里云CentOS服务器
├── Nginx (端口80/443)
│   ├── 业务前端 (/)
│   ├── 管理后台 (/admin)
│   └── API代理 (/api)
├── Node.js后端服务 (端口3001)
├── MySQL数据库 (阿里云RDS)
├── Redis缓存 (本地)
└── OSS对象存储 (阿里云)
```

## 🌐 访问地址

部署完成后，您可以通过以下地址访问：

- **业务前端**: `http://your-server-ip/`
- **管理后台**: `http://your-server-ip/admin/`
- **API接口**: `http://your-server-ip/api/`

## 🔧 服务管理

### PM2进程管理
```bash
pm2 status                    # 查看服务状态
pm2 restart creatimage-server # 重启服务
pm2 stop creatimage-server    # 停止服务
pm2 logs creatimage-server    # 查看日志
pm2 monit                     # 监控面板
```

### Nginx管理
```bash
systemctl status nginx        # 查看状态
systemctl restart nginx       # 重启
nginx -t                      # 测试配置
```

## 📊 监控和维护

### 查看日志
```bash
# 应用日志
tail -f /var/log/creatimage/combined.log

# Nginx日志
tail -f /var/log/nginx/creatimage_access.log
tail -f /var/log/nginx/creatimage_error.log
```

### 系统监控
```bash
htop                          # 系统资源监控
df -h                         # 磁盘使用情况
free -h                       # 内存使用情况
```

## 🔄 更新部署

### 使用更新脚本
```bash
cd /var/www/creatimage
./deploy/update.sh
```

### 手动更新
```bash
# 1. 备份
tar -czf backup-$(date +%Y%m%d).tar.gz -C /var/www creatimage

# 2. 更新代码
git pull origin main

# 3. 重新构建
cd frontend && npm run build
cd ../admin-system && npm run build

# 4. 重启服务
pm2 restart creatimage-server
```

## 🛡️ 安全配置

### SSL证书（可选）
```bash
# 安装certbot
yum install -y certbot python3-certbot-nginx

# 申请SSL证书
certbot --nginx -d your-domain.com
```

### 防火墙配置
```bash
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

## 🆘 故障排除

### 常见问题
1. **服务无法启动**: 检查端口占用和配置文件
2. **数据库连接失败**: 检查网络和凭据
3. **静态文件404**: 检查Nginx配置和文件权限
4. **上传失败**: 检查OSS配置和文件大小限制

### 日志分析
```bash
# 查看错误日志
grep -i error /var/log/creatimage/combined.log
grep -i error /var/log/nginx/creatimage_error.log
```

## 📞 技术支持

如遇到问题，请检查：
1. 服务器资源使用情况
2. 服务运行状态
3. 配置文件正确性
4. 网络连接状态
5. 日志文件内容

---

**部署包版本**: v1.0.0  
**适用系统**: CentOS 7/8  
**Node.js版本**: 18.x  
**更新时间**: $(date)
