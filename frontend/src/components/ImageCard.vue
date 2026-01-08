<template>
  <div class="image-card" @click="handleClick">
    <div class="image-container">
      <!-- 图片 -->
      <img 
        v-if="src && imageLoaded" 
        :src="src" 
        :alt="alt || 'Generated Image'"
        @load="handleImageLoad"
        @error="handleImageError"
        class="image"
      />
      
      <!-- 错误状态 -->
      <div v-else-if="src && imageError" class="image-error">
        <el-icon><Warning /></el-icon>
        <span>加载失败</span>
      </div>
      
      <!-- 加载状态 - 统一处理所有加载情况 -->
      <div v-else class="image-loading">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
    </div>
    
    <div class="image-overlay" v-if="showOverlay">
      <div class="action-buttons">
        <el-button 
          type="primary" 
          size="small" 
          :icon="Download" 
          @click.stop="handleDownload"
          class="action-btn download-btn"
          title="下载图片"
        >
          下载
        </el-button>
        <el-button 
          type="success" 
          size="small" 
          :icon="Collection" 
          @click.stop="handleAddToPrompts"
          class="action-btn add-prompt-btn"
          title="添加到提示词管理"
        >
          添加提示词
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { ElButton, ElIcon, ElMessage } from 'element-plus'
import { Picture, Download, Collection, Loading, Warning } from '@element-plus/icons-vue'

const props = defineProps({
  src: {
    type: String,
    default: ''
  },
  alt: {
    type: String,
    default: ''
  },
  prompt: {
    type: String,
    default: ''
  },
  // 添加原始提示词（仅用户输入，不包含标签映射）
  originalPrompt: {
    type: String,
    default: ''
  },
  showOverlay: {
    type: Boolean,
    default: true
  },
  // 添加 ossUrl 属性,用于保存OSS链接
  ossUrl: {
    type: String,
    default: ''
  },
  // 添加原始URL属性
  originalUrl: {
    type: String,
    default: ''
  },
  // 添加批次元数据
  batchId: {
    type: String,
    default: ''
  },
  tags: {
    type: Array,
    default: () => []
  },
  selectedCommonPrompts: {
    type: Array,
    default: () => []
  },
  selectedReferenceImages: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['click', 'download', 'add-to-prompts'])

const imageLoaded = ref(false)
const imageError = ref(false)

// 预加载图片实例引用
let preloadImgInstance = null

const hasImage = computed(() => props.src && !imageError.value)

const handleClick = () => {
  if (props.src && imageLoaded.value) {
    emit('click', { src: props.src, title: props.alt || 'Generated Image' })
  }
}

const handleDownload = async () => {
  if (!props.src) {
    ElMessage.warning('No image to download')
    return
  }
  
  try {
    ElMessage.info('正在准备下载...')
    
    // 先触发父组件的下载事件，让父组件处理originalUrl逻辑
    emit('download', { src: props.src, title: props.alt || 'Generated Image' })
    
  } catch (error) {
    console.error('下载失败:', error)
    ElMessage.error('下载失败: ' + (error.message || '未知错误'))
  }
}

const handleImageLoad = () => {
  imageLoaded.value = true
  imageError.value = false
}

const handleImageError = () => {
  imageError.value = true
  imageLoaded.value = false
}

// 预加载图片
const preloadImage = () => {
  // 清理旧的预加载实例
  if (preloadImgInstance) {
    preloadImgInstance.onload = null
    preloadImgInstance.onerror = null
    preloadImgInstance = null
  }

  if (props.src && !imageLoaded.value && !imageError.value) {
    preloadImgInstance = new Image()
    preloadImgInstance.onload = handleImageLoad
    preloadImgInstance.onerror = handleImageError
    preloadImgInstance.src = props.src
  }
}

// 监听src变化，自动预加载
watch(() => props.src, () => {
  if (props.src) {
    imageLoaded.value = false
    imageError.value = false
    preloadImage()
  }
}, { immediate: true })

// 组件卸载时清理预加载实例
onUnmounted(() => {
  if (preloadImgInstance) {
    preloadImgInstance.onload = null
    preloadImgInstance.onerror = null
    preloadImgInstance = null
  }
})

const handleAddToPrompts = () => {
  if (!props.src) {
    ElMessage.warning('没有图片可添加')
    return
  }

  console.log('[ImageCard] 添加到提示词，props信息:', {
    src: props.src,
    ossUrl: props.ossUrl,
    originalUrl: props.originalUrl,
    batchId: props.batchId,
    tags: props.tags,
    selectedCommonPrompts: props.selectedCommonPrompts,
    selectedReferenceImages: props.selectedReferenceImages,
    计算后的ossUrl: props.ossUrl || props.originalUrl || props.src
  })

  emit('add-to-prompts', {
    src: props.src,
    ossUrl: props.ossUrl || props.originalUrl || props.src, // 优先传递OSS URL
    url: props.originalUrl || props.src, // 原始URL
    title: props.alt || 'Generated Image',
    prompt: props.originalPrompt || props.prompt || '', // 优先使用原始提示词
    // 传递批次元数据
    tags: props.tags,
    selectedCommonPrompts: props.selectedCommonPrompts,
    selectedReferenceImages: props.selectedReferenceImages
  })
}
</script>

<style scoped>
.image-card {
  position: relative;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  aspect-ratio: 1;
}

.image-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: #409eff;
}

.image-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.3s ease;
}

.image-card:hover .image {
  transform: scale(1.05);
}

.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
  gap: 8px;
}

.image-placeholder .el-icon {
  font-size: 32px;
}

.image-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #409eff;
  font-size: 14px;
  gap: 8px;
}

.image-loading .loading-icon {
  font-size: 24px;
  animation: rotate 1s linear infinite;
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #f56c6c;
  font-size: 14px;
  gap: 8px;
}

.image-error .el-icon {
  font-size: 32px;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.image-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  opacity: 0;
  transition: all 0.3s ease;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  padding: 20px 12px 12px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.image-card:hover .image-overlay {
  opacity: 1;
}

.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-btn {
  height: 32px !important;
  padding: 0 12px !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  border-radius: 16px !important;
  border: none !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
  transition: all 0.3s ease !important;
  backdrop-filter: blur(8px);
}

.download-btn {
  background: rgba(64, 158, 255, 0.9) !important;
  color: white !important;
}

.download-btn:hover {
  background: rgba(64, 158, 255, 1) !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4) !important;
}

.add-prompt-btn {
  background: rgba(103, 194, 58, 0.9) !important;
  color: white !important;
}

.add-prompt-btn:hover {
  background: rgba(103, 194, 58, 1) !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.4) !important;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .action-buttons {
    flex-direction: column;
    gap: 6px;
    width: 100%;
  }
  
  .action-btn {
    width: 100% !important;
    height: 28px !important;
    font-size: 11px !important;
  }
  
  .image-overlay {
    padding: 16px 8px 8px;
  }
}
</style>



