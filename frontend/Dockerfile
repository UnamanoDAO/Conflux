# 前端构建 Dockerfile
# 多阶段构建，优化镜像大小

# 阶段1: 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件（从 frontend 目录）
COPY frontend/package*.json ./

# 安装所有依赖（包括 devDependencies，因为需要 vite 构建）
RUN npm ci

# 复制源代码（从 frontend 目录）
COPY frontend/ .

# 构建生产版本
RUN npm run build

# 阶段2: 生产阶段
FROM nginx:alpine

# 删除默认的 nginx 配置
RUN rm /etc/nginx/conf.d/default.conf

# 从构建阶段复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置（将在 docker-compose 中覆盖）
# 注意：实际配置由 docker-compose 挂载

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]

