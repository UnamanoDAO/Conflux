import { reactive } from 'vue'
import { api } from '../api/index.js'

// 创建全局状态管理
const authState = reactive({
  token: localStorage.getItem('admin_token') || '',
  user: JSON.parse(localStorage.getItem('admin_user') || 'null'),
  isAuthenticated: false
})

// 检查认证状态
if (authState.token && authState.user) {
  authState.isAuthenticated = true
}

export function useAuthStore() {
  return {
    // 状态
    token: authState.token,
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    
    // 登录
    async login(username, password) {
      try {
        const response = await api.post('/login', {
          username,
          password
        })
        
        if (response.data.success) {
          authState.token = response.data.token
          authState.user = response.data.user
          authState.isAuthenticated = true
          
          localStorage.setItem('admin_token', response.data.token)
          localStorage.setItem('admin_user', JSON.stringify(response.data.user))
          
          return { success: true }
        } else {
          return { success: false, message: response.data.error || '登录失败' }
        }
      } catch (error) {
        return { 
          success: false, 
          message: error.response?.data?.error || '登录失败，请检查网络连接' 
        }
      }
    },
    
    // 登出
    logout() {
      authState.token = ''
      authState.user = null
      authState.isAuthenticated = false
      
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
    },
    
    // 获取认证头
    getAuthHeader() {
      return authState.token ? `Bearer ${authState.token}` : ''
    }
  }
}

