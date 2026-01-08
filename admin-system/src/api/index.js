import axios from 'axios'

// 创建axios实例
const api = axios.create({
  baseURL: '/api/admin',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 添加认证头
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 处理认证错误
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 视频模型管理API
const videoModelApi = {
  // 获取所有视频模型
  getVideoModels: (params) => api.get('/video-models', { params, baseURL: '/api' }),
  
  // 获取支持的厂商列表
  getVideoProviders: () => api.get('/video-models/providers', { baseURL: '/api' }),
  
  // 获取单个视频模型
  getVideoModel: (id) => api.get(`/video-models/${id}`, { baseURL: '/api' }),
  
  // 添加视频模型
  addVideoModel: (data) => api.post('/video-models', data, { baseURL: '/api' }),
  
  // 更新视频模型
  updateVideoModel: (id, data) => api.put(`/video-models/${id}`, data, { baseURL: '/api' }),
  
  // 删除视频模型
  deleteVideoModel: (id) => api.delete(`/video-models/${id}`, { baseURL: '/api' }),
  
  // 切换视频模型启用状态
  toggleVideoModel: (id) => api.patch(`/video-models/${id}/toggle`, {}, { baseURL: '/api' })
}

// 导出默认API实例和视频模型API
export default {
  ...videoModelApi
}

export { api }
