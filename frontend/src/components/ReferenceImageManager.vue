<template>
  <div class="reference-image-manager">
    <!-- 分类管理区域 -->
    <div class="category-section">
      <div class="category-header">
        <h4>分类管理</h4>
        <button @click="showAddCategoryDialog = true" class="add-category-btn">
          <span>+</span> 添加分类
        </button>
      </div>
      
      <!-- 分类标签 -->
      <div class="category-tabs">
        <div 
          v-for="category in categories" 
          :key="category.id"
          class="category-tab"
          :class="{ active: activeCategoryId === category.id }"
          @click="setActiveCategory(category.id)"
        >
          <span class="category-name">{{ category.name }}</span>
          <span class="category-count">({{ getCategoryImageCount(category.id) }})</span>
          <button 
            v-if="category.id !== 'all'"
            @click.stop="deleteCategory(category.id)"
            class="delete-category-btn"
            title="删除分类"
          >
            ×
          </button>
        </div>
      </div>
    </div>
    
    <div class="upload-section">
      <div class="upload-area" @click="triggerFileUpload" @dragover.prevent @drop.prevent="handleDrop">
        <input 
          ref="fileInput" 
          type="file" 
          multiple 
          accept="image/*" 
          @change="handleFileUpload"
          style="display: none"
        >
        <div class="upload-content">
          <div class="upload-icon">📁</div>
          <p>点击或拖拽上传参考图</p>
          <small>支持多张图片同时上传</small>
        </div>
      </div>
      
      <!-- 上传时选择分类 -->
      <div v-if="uploading" class="upload-category-selector">
        <label>选择分类：</label>
        <select v-model="uploadCategoryId" class="category-select">
          <option value="">无分类</option>
          <option 
            v-for="category in userCategories" 
            :key="category.id" 
            :value="category.id"
          >
            {{ category.name }}
          </option>
        </select>
      </div>
    </div>

    <div class="images-section">
      <div class="section-header">
        <h4>
          {{ activeCategoryId === 'all' ? '全部参考图' : getCategoryName(activeCategoryId) }} 
          ({{ filteredImages.length }})
        </h4>
        <div class="actions">
          <button 
            v-if="filteredImages.length > 0" 
            @click="toggleSelectMode" 
            class="select-btn"
            :class="{ active: selectMode }"
          >
            {{ selectMode ? '取消选择' : '批量管理' }}
          </button>
          <button 
            v-if="selectMode && selectedImages.length > 0" 
            @click="deleteSelected" 
            class="delete-selected-btn"
          >
            删除选中 ({{ selectedImages.length }})
          </button>
          <button 
            v-if="selectMode && selectedImages.length > 0" 
            @click="showMoveToCategoryDialog = true" 
            class="move-category-btn"
          >
            移动到分类
          </button>
          <button 
            v-if="selectMode && selectedImages.length > 0" 
            @click="removeFromCategory" 
            class="remove-category-btn"
          >
            移出分类
          </button>
          <button 
            v-if="selectMode" 
            @click="toggleSelectAll" 
            class="select-all-btn"
          >
            {{ isAllSelected ? '取消全选' : '全选' }}
          </button>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <LoadingCard 
          title="加载参考图中..." 
          subtitle="正在获取您的参考图库"
          size="medium"
        />
      </div>
      
      <!-- 上传状态 -->
      <div v-if="uploading" class="uploading-state">
        <LoadingCard
          title="上传中..."
          :subtitle="`正在上传 ${uploadQueue.length} 张图片`"
          size="small"
        />
      </div>
      
      <!-- 空状态 -->
      <div v-else-if="!loading && !uploading && referenceImages.length === 0" class="empty-state">
        <div class="empty-icon">🖼️</div>
        <p>还没有保存的参考图</p>
        <small>上传一些图片作为常用参考图吧</small>
      </div>

      <!-- 图片网格 -->
      <div v-else-if="!loading && !uploading" class="images-grid" 
           @mousedown="startBoxSelection" 
           @mousemove="updateBoxSelection" 
           @mouseup="endBoxSelection"
           @mouseleave="endBoxSelection">
        <!-- 框选区域 -->
        <div v-if="isBoxSelecting" class="box-selection" 
             :style="boxSelectionStyle"></div>
        
        <div 
          v-for="image in filteredImages" 
          :key="image.id"
          class="image-item"
          :class="{ 
            selected: selectedImages.includes(image.id),
            'box-selected': boxSelectedImages.includes(image.id)
          }"
          :data-image-id="image.id"
          @click="handleImageClick(image)"
        >
          <div class="image-container">
            <img 
              :src="image.thumbnailUrl || image.url" 
              :alt="image.originalName || image.name" 
              @load="onImageLoad"
              @error="handleImageError($event, image)"
              loading="lazy"
            />
            <div class="image-overlay">
              <button @click.stop="selectImage(image)" class="use-btn">使用</button>
              <button @click.stop="deleteImage(image.id)" class="delete-btn">删除</button>
              <button @click.stop="showSingleMoveDialog(image)" class="move-btn">移动</button>
            </div>
            <div v-if="selectMode" class="select-checkbox">
              <input 
                type="checkbox" 
                :checked="selectedImages.includes(image.id)"
                @change="toggleImageSelection(image.id)"
                @click.stop
              >
            </div>
            <!-- 分类标签 -->
            <div v-if="image.categoryId" class="category-badge">
              {{ getCategoryName(image.categoryId) }}
            </div>
          </div>
          <div class="image-info">
            <span class="image-name">{{ image.originalName || image.filename || image.name }}</span>
            <span class="image-size">{{ formatFileSize(image.fileSize) }}</span>
            <span v-if="image.compressedSize" class="compressed-size">
              压缩后: {{ formatFileSize(image.compressedSize) }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- 选择模式下的操作按钮 -->
      <div v-if="selectMode && selectedImages.length > 0" class="selection-actions">
        <button @click="useSelectedImages" class="use-selected-btn">
          使用选中的图片 ({{ selectedImages.length }})
        </button>
        <button @click="cancelSelection" class="cancel-selection-btn">
          取消选择
        </button>
      </div>
    </div>
    
    <!-- 添加分类对话框 -->
    <div v-if="showAddCategoryDialog" class="dialog-overlay" @click="showAddCategoryDialog = false">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3>添加新分类</h3>
          <button @click="showAddCategoryDialog = false" class="close-btn">×</button>
        </div>
        <div class="dialog-body">
          <input 
            v-model="newCategoryName" 
            type="text" 
            placeholder="请输入分类名称"
            class="category-input"
            @keyup.enter="addCategory"
          />
        </div>
        <div class="dialog-footer">
          <button @click="showAddCategoryDialog = false" class="cancel-btn">取消</button>
          <button @click="addCategory" class="confirm-btn" :disabled="!newCategoryName.trim()">
            添加
          </button>
        </div>
      </div>
    </div>
    
    <!-- 移动图片到分类对话框 -->
    <div v-if="showMoveToCategoryDialog" class="dialog-overlay" @click="showMoveToCategoryDialog = false">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3>移动到分类</h3>
          <button @click="showMoveToCategoryDialog = false" class="close-btn">×</button>
        </div>
        <div class="dialog-body">
          <p>将选中的 {{ selectedImages.length }} 张图片移动到：</p>
          <select v-model="targetCategoryId" class="category-select">
            <option value="">无分类</option>
            <option 
              v-for="category in userCategories" 
              :key="category.id" 
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>
        </div>
        <div class="dialog-footer">
          <button @click="showMoveToCategoryDialog = false" class="cancel-btn">取消</button>
          <button @click="moveSelectedToCategory" class="confirm-btn">移动</button>
        </div>
      </div>
    </div>
    
    <!-- 移动单张图片对话框 -->
    <div v-if="showMoveImageDialog" class="dialog-overlay" @click="showMoveImageDialog = false">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3>移动图片</h3>
          <button @click="showMoveImageDialog = false" class="close-btn">×</button>
        </div>
        <div class="dialog-body">
          <p>将图片移动到：</p>
          <select v-model="singleImageTargetCategory" class="category-select">
            <option value="">无分类</option>
            <option 
              v-for="category in userCategories" 
              :key="category.id" 
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>
        </div>
        <div class="dialog-footer">
          <button @click="showMoveImageDialog = false" class="cancel-btn">取消</button>
          <button @click="moveSingleImage" class="confirm-btn">移动</button>
        </div>
      </div>
    </div>
    
    <!-- 上传分类选择对话框 -->
    <div v-if="showUploadCategoryDialog" class="dialog-overlay" @click="cancelUpload">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3>选择分类</h3>
          <button @click="cancelUpload" class="close-btn">×</button>
        </div>
        <div class="dialog-body">
          <p>请选择要将 {{ uploadQueue.length }} 张图片添加到哪个分类：</p>
          <select v-model="uploadCategoryId" class="category-select">
            <option value="">无分类</option>
            <option 
              v-for="category in userCategories" 
              :key="category.id" 
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>
          <div class="upload-hint">
            <small>💡 提示：您也可以选择"无分类"，稍后通过批量管理功能移动图片到指定分类</small>
          </div>
        </div>
        <div class="dialog-footer">
          <button @click="cancelUpload" class="cancel-btn">取消上传</button>
          <button @click="confirmUploadCategory" class="confirm-btn">确认上传</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import LoadingCard from './LoadingCard.vue'
import { ref, onMounted, computed } from 'vue'

const emit = defineEmits(['close', 'select-images'])

const fileInput = ref(null)
const referenceImages = ref([])
const selectMode = ref(false)
const selectedImages = ref([])
const loading = ref(false)
const uploading = ref(false)
const uploadQueue = ref([])
const currentUpload = ref(null)

// 分类相关状态
const categories = ref([
  { id: 'all', name: '全部' }
])
const activeCategoryId = ref('all')
const showAddCategoryDialog = ref(false)
const newCategoryName = ref('')
const showMoveToCategoryDialog = ref(false)
const targetCategoryId = ref('')
const showMoveImageDialog = ref(false)
const singleImageTargetCategory = ref('')
const currentMovingImage = ref(null)
const uploadCategoryId = ref('')
const showUploadCategoryDialog = ref(false)

// 框选相关状态
const isBoxSelecting = ref(false)
const boxSelectionStart = ref({ x: 0, y: 0 })
const boxSelectionEnd = ref({ x: 0, y: 0 })
const boxSelectedImages = ref([])
const imagesGridRef = ref(null)

// 计算属性
const userCategories = computed(() => 
  categories.value.filter(cat => cat.id !== 'all')
)

const filteredImages = computed(() => {
  if (activeCategoryId.value === 'all') {
    return referenceImages.value
  }
  return referenceImages.value.filter(img => 
    img.categoryId === activeCategoryId.value
  )
})

// 全选状态计算属性
const isAllSelected = computed(() => {
  return filteredImages.value.length > 0 && 
         selectedImages.value.length === filteredImages.value.length &&
         filteredImages.value.every(img => selectedImages.value.includes(img.id))
})

// 框选样式计算属性
const boxSelectionStyle = computed(() => {
  if (!isBoxSelecting.value) return {}
  
  const left = Math.min(boxSelectionStart.value.x, boxSelectionEnd.value.x)
  const top = Math.min(boxSelectionStart.value.y, boxSelectionEnd.value.y)
  const width = Math.abs(boxSelectionEnd.value.x - boxSelectionStart.value.x)
  const height = Math.abs(boxSelectionEnd.value.y - boxSelectionStart.value.y)
  
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`
  }
})

// 获取参考图列表
const fetchReferenceImages = async () => {
  try {
    loading.value = true
    const token = localStorage.getItem('token')
    if (!token) {
      console.log('未登录，无法获取参考图')
      return
    }

    const response = await fetch('/api/reference-images', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    if (response.ok) {
      const data = await response.json()
      // 后端返回格式：{ images: [...] } 或直接返回数组
      referenceImages.value = Array.isArray(data) ? data : (data.images || [])
    }
  } catch (error) {
    console.error('获取参考图失败:', error)
  } finally {
    loading.value = false
  }
}

// 获取分类列表
const fetchCategories = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) return

    const response = await fetch('/api/reference-image-categories', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    if (response.ok) {
      const data = await response.json()
      const userCats = Array.isArray(data) ? data : []
      categories.value = [
        { id: 'all', name: '全部' },
        ...userCats
      ]
    }
  } catch (error) {
    console.error('获取分类失败:', error)
  }
}

// 设置活动分类
const setActiveCategory = (categoryId) => {
  activeCategoryId.value = categoryId
  selectedImages.value = []
  selectMode.value = false
}

// 获取分类名称
const getCategoryName = (categoryId) => {
  const category = categories.value.find(cat => cat.id === categoryId)
  return category ? category.name : '未知分类'
}

// 获取分类图片数量
const getCategoryImageCount = (categoryId) => {
  if (categoryId === 'all') {
    return referenceImages.value.length
  }
  return referenceImages.value.filter(img => 
    img.categoryId === categoryId
  ).length
}

// 添加分类
const addCategory = async () => {
  if (!newCategoryName.value.trim()) return

  try {
    const token = localStorage.getItem('token')
    if (!token) {
      alert('请先登录')
      return
    }

    const response = await fetch('/api/reference-image-categories', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: newCategoryName.value.trim() })
    })

    if (response.ok) {
      const data = await response.json()
      categories.value.push(data)
      newCategoryName.value = ''
      showAddCategoryDialog.value = false
      console.log('分类添加成功')
    } else {
      const error = await response.json()
      alert('添加分类失败: ' + error.message)
    }
  } catch (error) {
    console.error('添加分类失败:', error)
    alert('添加分类失败，请重试')
  }
}

// 删除分类
const deleteCategory = async (categoryId) => {
  if (!confirm('确定要删除这个分类吗？分类中的图片将移动到"全部"分类中。')) return

  try {
    const token = localStorage.getItem('token')
    if (!token) {
      alert('请先登录')
      return
    }

    const response = await fetch(`/api/reference-image-categories/${categoryId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      // 将分类中的图片移动到全部分类（移除分类）
      await moveImagesToAllCategory(categoryId)
      
      // 从分类列表中移除
      categories.value = categories.value.filter(cat => cat.id !== categoryId)
      
      // 如果当前活动分类是被删除的分类，切换到全部
      if (activeCategoryId.value === categoryId) {
        activeCategoryId.value = 'all'
      }
      
      console.log('分类删除成功')
    } else {
      const error = await response.json()
      alert('删除分类失败: ' + error.message)
    }
  } catch (error) {
    console.error('删除分类失败:', error)
    alert('删除分类失败，请重试')
  }
}

// 将分类中的图片移动到全部分类（移除分类）
const moveImagesToAllCategory = async (categoryId) => {
  try {
    const token = localStorage.getItem('token')
    const imagesToMove = referenceImages.value.filter(img => 
      img.categoryId === categoryId
    )

    if (imagesToMove.length === 0) return

    const response = await fetch('/api/reference-images/move-to-category', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        imageIds: imagesToMove.map(img => img.id),
        categoryId: null // 移除分类，图片将显示在全部中
      })
    })

    if (response.ok) {
      // 重新获取数据以确保数据一致性
      await fetchReferenceImages()
    }
  } catch (error) {
    console.error('移动图片失败:', error)
  }
}

// 触发文件上传
const triggerFileUpload = () => {
  fileInput.value?.click()
}

// 处理文件上传
const handleFileUpload = async (event) => {
  const files = Array.from(event.target.files)
  await uploadImages(files)
  // 清空input值，允许重复选择同一文件
  event.target.value = ''
}

// 处理拖拽上传
const handleDrop = async (event) => {
  const files = Array.from(event.dataTransfer.files)
  await uploadImages(files)
}

// 压缩图片函数
const compressImage = (file, maxWidth = 2048, maxHeight = 2048, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target.result
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // 计算缩放比例
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = width * ratio
          height = height * ratio
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              // 创建新的File对象
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              })
              resolve(compressedFile)
            } else {
              reject(new Error('压缩失败'))
            }
          },
          file.type,
          quality
        )
      }
      img.onerror = reject
    }
    reader.onerror = reject
  })
}

// 优化后的上传图片函数 - 支持排队上传和图片压缩
const uploadImages = async (files) => {
  if (files.length === 0) return

  const imageFiles = files.filter(file => file.type.startsWith('image/'))
  if (imageFiles.length === 0) {
    alert('请选择图片文件')
    return
  }

  // 压缩图片（如果文件大于1MB）
  const processedFiles = []
  for (const file of imageFiles) {
    if (file.size > 1024 * 1024) { // 大于1MB
      try {
        console.log(`压缩图片: ${file.name}, 原始大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
        const compressedFile = await compressImage(file)
        console.log(`压缩完成: ${compressedFile.name}, 压缩后大小: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`)
        processedFiles.push(compressedFile)
      } catch (error) {
        console.error('压缩失败，使用原图:', error)
        processedFiles.push(file)
      }
    } else {
      processedFiles.push(file)
    }
  }

  // 将文件添加到上传队列
  uploadQueue.value.push(...processedFiles)

  // 如果当前没有在上传，开始处理队列
  if (!uploading.value) {
    processUploadQueue()
  }
}

// 处理上传队列
const processUploadQueue = async () => {
  if (uploadQueue.value.length === 0) {
    uploading.value = false
    return
  }

  uploading.value = true
  const token = localStorage.getItem('token')
  
  if (!token) {
    alert('请先登录')
    uploadQueue.value = []
    uploading.value = false
    return
  }

  // 如果用户有分类且还没有选择分类，使用当前选中的分类或显示分类选择对话框
  if (userCategories.value.length > 0 && uploadCategoryId.value === '') {
    // 如果当前选中的是某个具体分类（不是"全部"），则默认使用该分类
    if (activeCategoryId.value !== 'all') {
      uploadCategoryId.value = activeCategoryId.value
      console.log(`使用当前选中的分类: ${getCategoryName(activeCategoryId.value)}`)
    } else {
      // 否则显示分类选择对话框
      showUploadCategoryDialog.value = true
      uploading.value = false
      return
    }
  }

  const batchSize = 3 // 每批最多上传3张图片
  const batch = uploadQueue.value.splice(0, batchSize)
  
  try {
    const formData = new FormData()
    batch.forEach(file => {
      formData.append('images', file)
    })
    
    // 添加上传分类
    if (uploadCategoryId.value) {
      formData.append('categoryId', uploadCategoryId.value)
    }

    console.log(`开始上传 ${batch.length} 张图片到分类: ${uploadCategoryId.value || '无分类'}...`)

    // 注意：这里不传 is_prompt_reference 参数，默认为0（常用参考图）

    const response = await fetch('/api/reference-images', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })

    if (response.ok) {
      const result = await response.json()
      console.log('上传成功:', result.message)

      // 显示上传结果
      if (result.summary) {
        const { total, success, failed, errors } = result.summary
        if (failed > 0) {
          console.warn(`上传完成！成功: ${success}张，失败: ${failed}张`)
          if (errors && errors.length > 0) {
            console.warn('失败原因:', errors.join(', '))
          }
        } else {
          console.log(`上传成功！共上传 ${success} 张图片`)
        }
      }

      // 上传成功后，重新获取完整的参考图列表
      await fetchReferenceImages()

      // 触发 images-updated 事件，通知父组件刷新外部快速使用区域
      emit('images-updated')
    } else {
      const error = await response.json()
      console.error('上传失败:', error.message)
      alert('上传失败: ' + error.message)
    }
  } catch (error) {
    console.error('上传失败:', error)
    alert('上传失败，请重试')
  }

  // 如果队列为空，重置上传分类ID
  if (uploadQueue.value.length === 0) {
    uploadCategoryId.value = ''
  }

  // 继续处理队列中的下一批
  setTimeout(() => {
    processUploadQueue()
  }, 1000) // 批次间间隔1秒
}

// 选择单张图片
const selectImage = (image) => {
  emit('select-images', [image])
  closeManager()
}

// 使用选中的多张图片
const useSelectedImages = () => {
  const selectedImageObjects = referenceImages.value.filter(img => 
    selectedImages.value.includes(img.id)
  )
  emit('select-images', selectedImageObjects)
  closeManager()
}

// 取消选择
const cancelSelection = () => {
  selectedImages.value = []
  selectMode.value = false
}

// 删除单张图片
const deleteImage = async (imageId) => {
  if (!confirm('确定要删除这张参考图吗？')) return

  try {
    const token = localStorage.getItem('token')
    if (!token) {
      alert('请先登录')
      return
    }

    const response = await fetch(`/api/reference-images/${imageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      referenceImages.value = referenceImages.value.filter(img => img.id !== imageId)
      console.log('删除成功')
    } else {
      const error = await response.json()
      alert('删除失败: ' + error.message)
    }
  } catch (error) {
    console.error('删除失败:', error)
    alert('删除失败，请重试')
  }
}

// 切换选择模式
const toggleSelectMode = () => {
  selectMode.value = !selectMode.value
  selectedImages.value = []
}

// 切换图片选择状态
const toggleImageSelection = (imageId) => {
  const index = selectedImages.value.indexOf(imageId)
  if (index > -1) {
    selectedImages.value.splice(index, 1)
  } else {
    selectedImages.value.push(imageId)
  }
}

// 全选/取消全选
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    // 取消全选
    selectedImages.value = []
  } else {
    // 全选当前分类的所有图片
    selectedImages.value = filteredImages.value.map(img => img.id)
  }
}

// 移出分类
const removeFromCategory = async () => {
  if (selectedImages.value.length === 0) return
  
  if (!confirm(`确定要将选中的 ${selectedImages.value.length} 张图片移出分类吗？`)) return
  
  try {
    const token = localStorage.getItem('token')
    const response = await fetch('/api/reference-images/remove-from-category', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ imageIds: selectedImages.value })
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('移出分类成功:', result.message)
      
      // 更新本地数据
      selectedImages.value.forEach(imageId => {
        const image = referenceImages.value.find(img => img.id === imageId)
        if (image) {
          image.categoryId = null
        }
      })
      
      selectedImages.value = []
      alert(result.message)
    } else {
      const error = await response.json()
      alert('移出分类失败: ' + error.error)
    }
  } catch (error) {
    console.error('移出分类失败:', error)
    alert('移出分类失败，请重试')
  }
}

// 处理图片点击
const handleImageClick = (image) => {
  if (selectMode.value) {
    // 选择模式下点击卡片切换选择状态
    toggleImageSelection(image.id)
  } else {
    // 非选择模式下直接使用图片
    selectImage(image)
  }
}

// 框选相关方法
const startBoxSelection = (event) => {
  if (!selectMode.value) return
  
  // 只在空白区域开始框选
  if (event.target.classList.contains('images-grid')) {
    isBoxSelecting.value = true
    const rect = event.currentTarget.getBoundingClientRect()
    boxSelectionStart.value = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
    boxSelectionEnd.value = { ...boxSelectionStart.value }
    boxSelectedImages.value = []
  }
}

const updateBoxSelection = (event) => {
  if (!isBoxSelecting.value) return
  
  const rect = event.currentTarget.getBoundingClientRect()
  boxSelectionEnd.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
  
  // 更新框选范围内的图片
  updateBoxSelectedImages()
}

const endBoxSelection = () => {
  if (!isBoxSelecting.value) return
  
  isBoxSelecting.value = false
  
  // 将框选中的图片添加到选中列表
  boxSelectedImages.value.forEach(imageId => {
    if (!selectedImages.value.includes(imageId)) {
      selectedImages.value.push(imageId)
    }
  })
  
  boxSelectedImages.value = []
}

const updateBoxSelectedImages = () => {
  if (!isBoxSelecting.value) return
  
  const left = Math.min(boxSelectionStart.value.x, boxSelectionEnd.value.x)
  const top = Math.min(boxSelectionStart.value.y, boxSelectionEnd.value.y)
  const right = Math.max(boxSelectionStart.value.x, boxSelectionEnd.value.x)
  const bottom = Math.max(boxSelectionStart.value.y, boxSelectionEnd.value.y)
  
  boxSelectedImages.value = []
  
  // 检查每个图片是否在框选范围内
  filteredImages.value.forEach(image => {
    const imageElement = document.querySelector(`[data-image-id="${image.id}"]`)
    if (imageElement) {
      const rect = imageElement.getBoundingClientRect()
      const gridRect = document.querySelector('.images-grid').getBoundingClientRect()
      
      const imageLeft = rect.left - gridRect.left
      const imageTop = rect.top - gridRect.top
      const imageRight = imageLeft + rect.width
      const imageBottom = imageTop + rect.height
      
      // 检查是否有重叠
      if (!(imageRight < left || imageLeft > right || imageBottom < top || imageTop > bottom)) {
        boxSelectedImages.value.push(image.id)
      }
    }
  })
}

// 删除选中的图片
const deleteSelected = async () => {
  if (selectedImages.value.length === 0) return
  
  if (!confirm(`确定要删除选中的 ${selectedImages.value.length} 张参考图吗？`)) return

  try {
    const token = localStorage.getItem('token')
    if (!token) {
      alert('请先登录')
      return
    }

    const response = await fetch('/api/reference-images/batch', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ imageIds: selectedImages.value })
    })

    if (response.ok) {
      referenceImages.value = referenceImages.value.filter(
        img => !selectedImages.value.includes(img.id)
      )
      selectedImages.value = []
      selectMode.value = false
      console.log('批量删除成功')
    } else {
      const error = await response.json()
      alert('删除失败: ' + error.message)
    }
  } catch (error) {
    console.error('批量删除失败:', error)
    alert('删除失败，请重试')
  }
}

// 关闭管理器
const closeManager = () => {
  emit('close')
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 图片加载完成
const onImageLoad = (event) => {
  // 可以在这里添加图片加载完成的处理逻辑
}

// 处理图片加载错误
const handleImageError = (event, image) => {
  console.warn('图片加载失败:', image.url, event)
  // 如果缩略图加载失败，尝试使用原图
  if (image.thumbnailUrl && event.target.src === image.thumbnailUrl) {
    event.target.src = image.url
  }
}

// 显示移动单张图片对话框
const showSingleMoveDialog = (image) => {
  currentMovingImage.value = image
  singleImageTargetCategory.value = image.categoryId || ''
  showMoveImageDialog.value = true
}

// 移动单张图片
const moveSingleImage = async () => {
  if (!currentMovingImage.value) return

  try {
    const token = localStorage.getItem('token')
    if (!token) {
      alert('请先登录')
      return
    }

    const response = await fetch('/api/reference-images/move-to-category', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        imageIds: [currentMovingImage.value.id],
        categoryId: singleImageTargetCategory.value || null
      })
    })

    if (response.ok) {
      // 重新获取数据以确保数据一致性
      await fetchReferenceImages()
      showMoveImageDialog.value = false
      currentMovingImage.value = null
      console.log('图片移动成功')
    } else {
      const error = await response.json()
      alert('移动图片失败: ' + error.message)
    }
  } catch (error) {
    console.error('移动图片失败:', error)
    alert('移动图片失败，请重试')
  }
}

// 移动选中的图片到分类
const moveSelectedToCategory = async () => {
  if (selectedImages.value.length === 0) return

  try {
    const token = localStorage.getItem('token')
    if (!token) {
      alert('请先登录')
      return
    }

    const response = await fetch('/api/reference-images/move-to-category', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        imageIds: selectedImages.value,
        categoryId: targetCategoryId.value || null
      })
    })

    if (response.ok) {
      // 重新获取数据以确保数据一致性
      await fetchReferenceImages()
      selectedImages.value = []
      selectMode.value = false
      showMoveToCategoryDialog.value = false
      console.log('图片移动成功')
    } else {
      const error = await response.json()
      alert('移动图片失败: ' + error.message)
    }
  } catch (error) {
    console.error('移动图片失败:', error)
    alert('移动图片失败，请重试')
  }
}

// 确认上传分类
const confirmUploadCategory = () => {
  showUploadCategoryDialog.value = false
  // 继续处理上传队列
  processUploadQueue()
}

// 取消上传
const cancelUpload = () => {
  showUploadCategoryDialog.value = false
  uploadQueue.value = []
  uploading.value = false
  uploadCategoryId.value = ''
}

// 组件挂载时获取参考图列表和分类
onMounted(() => {
  fetchReferenceImages()
  fetchCategories()
})
</script>

<style scoped>
.reference-image-manager {
  height: 100%;
  max-height: calc(90vh - 60px); /* 增加内容区域最大高度到90vh */
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 分类管理区域 */
.category-section {
  padding: 12px 20px 0;
  border-bottom: 1px solid #e4e7ed;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.category-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.add-category-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.add-category-btn:hover {
  background: #66b1ff;
}

.add-category-btn span {
  font-size: 14px;
  font-weight: bold;
}

.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.category-tab:hover {
  background: #F6F6FE;
  border-color: #D5D6F2;
}

.category-tab.active {
  background: #9F9DF3;
  border-color: #9F9DF3;
  color: white;
}

.category-name {
  font-size: 13px;
  font-weight: 500;
}

.category-count {
  font-size: 11px;
  opacity: 0.8;
}

.delete-category-btn {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  background: #f56c6c;
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.category-tab:hover .delete-category-btn {
  opacity: 1;
}

.delete-category-btn:hover {
  background: #f78989;
}

.upload-section {
  padding: 8px 20px;
}

.upload-category-selector {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.upload-category-selector label {
  font-size: 13px;
  color: #666;
}

.category-select {
  padding: 6px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  background: white;
  cursor: pointer;
}

.category-select:focus {
  outline: none;
  border-color: #409eff;
}

.upload-area {
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background-color: #fafafa;
}

.upload-area:hover {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.upload-icon {
  font-size: 2rem;
  opacity: 0.7;
}

.upload-content p {
  margin: 0;
  font-size: 1rem;
  color: #606266;
}

.upload-content small {
  color: #909399;
}

.images-section {
  flex: 1;
  padding: 0 20px 12px;
  overflow-y: auto;
  min-height: 0; /* 确保flex子元素可以收缩 */
  height: calc(90vh - 200px); /* 增加高度到90vh，减去header和分类区域的高度 */
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h4 {
  margin: 0;
  font-size: 1.2rem;
}

.actions {
  display: flex;
  gap: 10px;
}

.select-btn, .delete-selected-btn {
  padding: 8px 16px;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  color: #606266;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.select-btn:hover, .delete-selected-btn:hover {
  background-color: #f5f7fa;
  border-color: #c0c4cc;
}

.select-btn.active {
  background-color: #409eff;
  border-color: #409eff;
  color: #ffffff;
}

.delete-selected-btn {
  background-color: #f56c6c;
  border-color: #f56c6c;
  color: #ffffff;
}

.delete-selected-btn:hover {
  background-color: #f78989;
  border-color: #f78989;
}

.move-category-btn {
  padding: 8px 16px;
  border: 1px solid #67c23a;
  background: #67c23a;
  color: #ffffff;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
}

.move-category-btn:hover {
  background-color: #85ce61;
  border-color: #85ce61;
}

.remove-category-btn {
  padding: 8px 16px;
  border: 1px solid #f56c6c;
  background: #f56c6c;
  color: #ffffff;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
}

.remove-category-btn:hover {
  background-color: #f78989;
  border-color: #f78989;
}

.select-all-btn {
  padding: 8px 16px;
  border: 1px solid #409eff;
  background: #409eff;
  color: #ffffff;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
}

.select-all-btn:hover {
  background-color: #66b1ff;
  border-color: #66b1ff;
}

/* 加载状态 */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: 40px;
}

.uploading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  padding: 20px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #909399;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.empty-state p {
  margin: 0 0 10px;
  font-size: 1.1rem;
  color: #606266;
}

.empty-state small {
  color: #c0c4cc;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.image-item {
  border-radius: 8px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  transition: all 0.2s;
}

.image-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.image-item.selected {
  border: 2px solid #409eff;
}

.image-item.box-selected {
  border: 2px solid #67c23a;
  background-color: rgba(103, 194, 58, 0.1);
}

/* 框选样式 */
.box-selection {
  position: absolute;
  border: 2px dashed #409eff;
  background-color: rgba(64, 158, 255, 0.1);
  pointer-events: none;
  z-index: 10;
}

.images-grid {
  position: relative;
}

.image-container {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  opacity: 0;
  transition: opacity 0.2s;
}

.image-item:hover .image-overlay {
  opacity: 1;
}

.use-btn, .delete-btn, .move-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.use-btn {
  background-color: #67c23a;
  color: white;
}

.use-btn:hover {
  background-color: #85ce61;
}

.delete-btn {
  background-color: #f56c6c;
  color: white;
}

.delete-btn:hover {
  background-color: #f78989;
}

.move-btn {
  background-color: #409eff;
  color: white;
}

.move-btn:hover {
  background-color: #66b1ff;
}

.select-checkbox {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(255, 255, 255, 0.9);
  padding: 5px;
  border-radius: 4px;
}

.select-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.image-info {
  padding: 12px;
}

.image-name {
  display: block;
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #303133;
}

.image-size {
  font-size: 0.85rem;
  color: #909399;
}

.compressed-size {
  font-size: 0.8rem;
  color: #67c23a;
  margin-top: 2px;
}

/* 分类标签 */
.category-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(64, 158, 255, 0.9);
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
  backdrop-filter: blur(4px);
}

/* 对话框样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.dialog {
  background: white;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  min-width: 300px;
  max-width: 90vw;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e4e7ed;
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #666;
}

.dialog-body {
  padding: 20px;
}

.dialog-body p {
  margin: 0 0 12px;
  color: #666;
  font-size: 14px;
}

.category-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
}

.category-input:focus {
  outline: none;
  border-color: #409eff;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid #e4e7ed;
}

.cancel-btn, .confirm-btn {
  padding: 8px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.cancel-btn {
  background: white;
  color: #606266;
}

.cancel-btn:hover {
  background: #f5f7fa;
  border-color: #c0c4cc;
}

.confirm-btn {
  background: #409eff;
  border-color: #409eff;
  color: white;
}

.confirm-btn:hover {
  background: #66b1ff;
  border-color: #66b1ff;
}

.confirm-btn:disabled {
  background: #c0c4cc;
  border-color: #c0c4cc;
  cursor: not-allowed;
}

.upload-hint {
  margin-top: 12px;
  padding: 8px 12px;
  background: #f0f9ff;
  border: 1px solid #b3d8ff;
  border-radius: 4px;
}

.upload-hint small {
  color: #409eff;
  font-size: 12px;
  line-height: 1.4;
}

/* 选择操作按钮 */
.selection-actions {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  background: #ffffff;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  border: 1px solid #e4e7ed;
}

.use-selected-btn {
  background: #409eff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.use-selected-btn:hover {
  background: #66b1ff;
}

.cancel-selection-btn {
  background: #909399;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancel-selection-btn:hover {
  background: #a6a9ad;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .images-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 15px;
  }
  
  .manager-header {
    padding: 15px;
  }
  
  .upload-section {
    padding: 15px;
  }
  
  .images-section {
    padding: 0 15px 15px;
  }
  
  .upload-area {
    padding: 30px 20px;
  }
}
</style>
