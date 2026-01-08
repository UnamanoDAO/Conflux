# AI图像生成 - 后台管理系统

## 系统概述

这是一个基于Vue3 + Element Plus的现代化后台管理系统，用于管理AI图像生成平台的各种功能。

## 功能特性

### 🎯 核心功能
- **仪表盘**: 系统概览和统计数据
- **用户管理**: 用户列表、状态管理、权限设置
- **内容管理**: 提示词管理和参考图片管理
- **模型管理**: AI模型配置和管理

### 🔐 安全特性
- JWT Token认证
- 管理员权限验证
- 路由守卫保护
- API接口权限控制

### 🎨 界面特性
- 现代化UI设计
- 响应式布局
- Element Plus组件库
- 深色侧边栏主题

## 技术栈

- **前端框架**: Vue 3
- **构建工具**: Vite
- **UI组件库**: Element Plus
- **路由管理**: Vue Router
- **HTTP客户端**: Axios
- **状态管理**: Vue Composition API

## 快速开始

### 1. 安装依赖

```bash
cd admin-system
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

系统将在 `http://localhost:3001` 启动

### 3. 构建生产版本

```bash
npm run build
```

## 系统架构

### 目录结构

```
admin-system/
├── src/
│   ├── api/           # API接口配置
│   ├── components/    # 公共组件
│   ├── router/         # 路由配置
│   ├── utils/          # 工具函数
│   ├── views/          # 页面组件
│   ├── App.vue         # 根组件
│   └── main.js         # 入口文件
├── index.html          # HTML模板
├── package.json         # 项目配置
├── vite.config.js      # Vite配置
└── start-admin.bat      # Windows启动脚本
```

### 页面组件

- **Login.vue**: 管理员登录页面
- **AdminLayout.vue**: 管理后台布局组件
- **Dashboard.vue**: 系统仪表盘
- **UserManagement.vue**: 用户管理页面
- **ContentManagement.vue**: 内容管理页面
- **ModelManagement.vue**: 模型管理页面

## API接口

### 认证接口
- `POST /api/admin/login` - 管理员登录

### 用户管理
- `GET /api/admin/users` - 获取用户列表
- `PUT /api/admin/users/:id/status` - 更新用户状态
- `PUT /api/admin/users/:id/admin` - 设置管理员权限
- `DELETE /api/admin/users/:id` - 删除用户

### 内容管理
- `GET /api/prompts` - 获取提示词列表
- `POST /api/prompts` - 添加提示词
- `PUT /api/prompts/:id` - 更新提示词
- `DELETE /api/prompts/:id` - 删除提示词

- `GET /api/reference-images` - 获取参考图片列表
- `POST /api/reference-images` - 上传参考图片
- `PUT /api/reference-images/:id` - 更新参考图片
- `DELETE /api/reference-images/:id` - 删除参考图片

### 模型管理
- `GET /api/admin/models` - 获取模型列表
- `POST /api/admin/models` - 添加模型
- `PUT /api/admin/models/:id` - 更新模型
- `PUT /api/admin/models/:id/status` - 切换模型状态
- `PUT /api/admin/models/:id/default` - 设置默认模型
- `DELETE /api/admin/models/:id` - 删除模型

### 系统统计
- `GET /api/admin/stats` - 获取系统统计数据

## 使用说明

### 1. 管理员登录

使用管理员账户登录系统：
- 用户名: admin
- 密码: 123456

### 2. 用户管理

- 查看所有注册用户
- 启用/禁用用户账户
- 设置/取消管理员权限
- 删除用户账户

### 3. 内容管理

#### 提示词管理
- 添加常用提示词
- 编辑提示词内容
- 按分类管理提示词
- 删除不需要的提示词

#### 参考图片管理
- 上传参考图片
- 编辑图片信息
- 预览和删除图片

### 4. 模型管理

- 添加新的AI模型
- 配置API密钥和地址
- 设置默认模型
- 启用/禁用模型
- 删除模型

## 配置说明

### 开发环境配置

在 `vite.config.js` 中配置代理：

```javascript
export default defineConfig({
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
```

### 生产环境部署

1. 构建项目：
```bash
npm run build
```

2. 将 `dist` 目录部署到Web服务器

3. 配置API代理或直接修改API基础URL

## 注意事项

1. **权限管理**: 只有管理员账户才能访问后台管理系统
2. **数据安全**: API密钥等敏感信息请妥善保管
3. **模型配置**: 确保AI模型API地址和密钥正确
4. **备份数据**: 定期备份数据库和上传的文件

## 故障排除

### 常见问题

1. **登录失败**
   - 检查用户名和密码是否正确
   - 确认用户具有管理员权限

2. **API请求失败**
   - 检查后端服务是否正常运行
   - 确认API代理配置正确

3. **页面无法访问**
   - 检查路由配置
   - 确认组件导入路径正确

### 调试模式

在浏览器开发者工具中查看：
- Network面板：检查API请求
- Console面板：查看错误信息
- Application面板：检查本地存储

## 更新日志

### v1.0.0 (2024-09-12)
- 初始版本发布
- 实现基础管理功能
- 支持用户、内容、模型管理

## 技术支持

如有问题或建议，请联系开发团队。

---

**AI图像生成后台管理系统** - 让管理更简单，让运营更高效！

