import axios from 'axios'

// 创建专门的axios实例用于文本模型API
const textModelApi = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 添加认证头
textModelApi.interceptors.request.use(
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
textModelApi.interceptors.response.use(
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

// 获取所有文本模型（管理员）
export const getAllTextModels = () => {
  return textModelApi.get('/text-models/admin/all')
}

// 添加文本模型（管理员）
export const addTextModel = (data) => {
  return textModelApi.post('/text-models/admin', data)
}

// 更新文本模型（管理员）
export const updateTextModel = (id, data) => {
  return textModelApi.put(`/text-models/admin/${id}`, data)
}

// 删除文本模型（管理员）
export const deleteTextModel = (id) => {
  return textModelApi.delete(`/text-models/admin/${id}`)
}

// 设置默认模型（管理员）
export const setDefaultTextModel = (id) => {
  return textModelApi.put(`/text-models/admin/${id}/set-default`, {})
}
