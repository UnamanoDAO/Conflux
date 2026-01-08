// 图片懒加载指令
export const lazyLoad = {
  mounted(el, binding) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target
            img.src = binding.value
            img.classList.remove('lazy')
            observer.unobserve(img)
          }
        })
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.1
      }
    )
    
    observer.observe(el)
    
    // 保存observer实例以便后续清理
    el._lazyObserver = observer
  },
  
  unmounted(el) {
    if (el._lazyObserver) {
      el._lazyObserver.disconnect()
    }
  }
}

// 图片预加载工具
export const imagePreloader = {
  // 预加载单张图片
  preloadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  },
  
  // 批量预加载图片
  async preloadImages(srcs, maxConcurrent = 3) {
    const results = []
    
    for (let i = 0; i < srcs.length; i += maxConcurrent) {
      const batch = srcs.slice(i, i + maxConcurrent)
      const batchPromises = batch.map(src => 
        this.preloadImage(src).catch(error => {
          console.warn(`Failed to preload image: ${src}`, error)
          return null
        })
      )
      
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
    }
    
    return results.filter(Boolean)
  }
}

// 图片缓存工具
export const imageCache = {
  cache: new Map(),
  maxSize: 50, // 最大缓存数量
  
  // 获取缓存的图片
  get(src) {
    return this.cache.get(src)
  },
  
  // 设置缓存的图片
  set(src, blob) {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    
    this.cache.set(src, blob)
  },
  
  // 检查是否已缓存
  has(src) {
    return this.cache.has(src)
  },
  
  // 清理缓存
  clear() {
    this.cache.clear()
  },
  
  // 获取缓存统计
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      usage: `${this.cache.size}/${this.maxSize}`
    }
  }
}
