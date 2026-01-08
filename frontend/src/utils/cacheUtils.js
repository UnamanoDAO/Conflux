/**
 * 缓存清除工具函数
 */

/**
 * 清除所有用户相关的本地存储缓存
 */
export const clearAllUserCache = () => {
  try {
    // 清除localStorage中的用户数据
    const keysToRemove = [
      'token',
      'user',
      'promptManager', // 用户提示词
      'commonPrompts', // 常用提示词
      'selectedCommonPromptIds', // 选中的常用提示词
      'uploadedImages', // 上传的图片
      'generatedImages', // 生成的图片
      'userPrompts', // 用户提示词缓存
      'referenceImages', // 参考图片缓存
      'userHistory', // 用户历史记录
      'userSettings', // 用户设置
      'lastLoginTime', // 最后登录时间
      'userPreferences' // 用户偏好设置
    ]
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
    })
    
    // 清除sessionStorage
    sessionStorage.clear()
    
    console.log('所有用户缓存已清除')
    return true
  } catch (error) {
    console.error('清除缓存失败:', error)
    return false
  }
}

/**
 * 清除特定类型的缓存
 * @param {string} type - 缓存类型 ('prompts', 'images', 'history', 'all')
 */
export const clearCacheByType = (type) => {
  try {
    switch (type) {
      case 'prompts':
        localStorage.removeItem('promptManager')
        localStorage.removeItem('commonPrompts')
        localStorage.removeItem('selectedCommonPromptIds')
        localStorage.removeItem('userPrompts')
        break
        
      case 'images':
        localStorage.removeItem('uploadedImages')
        localStorage.removeItem('generatedImages')
        localStorage.removeItem('referenceImages')
        break
        
      case 'history':
        localStorage.removeItem('userHistory')
        break
        
      case 'all':
        return clearAllUserCache()
        
      default:
        console.warn('未知的缓存类型:', type)
        return false
    }
    
    console.log(`${type} 类型缓存已清除`)
    return true
  } catch (error) {
    console.error('清除缓存失败:', error)
    return false
  }
}

/**
 * 检查是否有用户缓存数据
 */
export const hasUserCache = () => {
  try {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    const promptManager = localStorage.getItem('promptManager')
    const commonPrompts = localStorage.getItem('commonPrompts')
    
    return !!(token || user || promptManager || commonPrompts)
  } catch (error) {
    console.error('检查用户缓存失败:', error)
    return false
  }
}

/**
 * 获取缓存使用情况
 */
export const getCacheInfo = () => {
  try {
    const info = {
      localStorage: {},
      sessionStorage: {},
      totalSize: 0
    }
    
    // 检查localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      const value = localStorage.getItem(key)
      const size = new Blob([value]).size
      info.localStorage[key] = {
        size: size,
        sizeText: formatBytes(size)
      }
      info.totalSize += size
    }
    
    // 检查sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      const value = sessionStorage.getItem(key)
      const size = new Blob([value]).size
      info.sessionStorage[key] = {
        size: size,
        sizeText: formatBytes(size)
      }
      info.totalSize += size
    }
    
    info.totalSizeText = formatBytes(info.totalSize)
    return info
  } catch (error) {
    console.error('获取缓存信息失败:', error)
    return null
  }
}

/**
 * 格式化字节大小
 */
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
