<template>
  <div class="video-generator">
    <!-- 操作区域 -->
    <div class="video-control-panel">
      <div class="generator-header">
        <h2>图生视频</h2>
        <p class="header-description">上传首尾帧图片，生成高质量视频</p>
      </div>

      <div class="generator-content">
        <!-- 提示词输入 -->
        <div class="prompt-section">
          <label class="section-label">提示词</label>
          <el-input
            v-model="prompt"
            type="textarea"
            :rows="4"
            placeholder="描述您想要生成的视频内容..."
            class="prompt-input"
          />
        </div>

        <!-- 模型选择 -->
        <div class="model-section">
          <label class="section-label">选择模型</label>
          <el-select v-model="selectedModelId" placeholder="请选择模型" class="model-select">
            <el-option
              v-for="model in supportedModels"
              :key="model.id"
              :label="model.name"
              :value="model.id"
            >
              <div class="model-option">
                <div class="model-name">{{ model.name }}</div>
                <div class="model-description">{{ model.description }}</div>
              </div>
            </el-option>
          </el-select>
        </div>

        <!-- 图片上传区域 -->
        <div class="upload-section">
          <label class="section-label">上传图片</label>
          <div class="upload-grid">
            <!-- 首帧图片 -->
            <div class="upload-item">
              <div class="upload-label">首帧图片 *</div>
              <el-upload
                class="image-uploader"
                :show-file-list="false"
                :before-upload="handleFirstFrameUpload"
                :accept="'image/*'"
                drag
              >
                <div v-if="firstFramePreview" class="image-preview">
                  <img :src="firstFramePreview" alt="首帧预览" />
                  <div class="image-overlay">
                    <el-icon><Edit /></el-icon>
                    <span>重新选择</span>
                  </div>
                </div>
                <div v-else class="upload-placeholder">
                  <el-icon class="upload-icon"><Plus /></el-icon>
                  <div class="upload-text">点击或拖拽上传首帧图片</div>
                  <div class="upload-hint">支持 JPG、PNG 格式，最大 10MB</div>
                </div>
              </el-upload>
            </div>

            <!-- 尾帧图片 -->
            <div class="upload-item">
              <div class="upload-label">尾帧图片（可选）</div>
              <el-upload
                class="image-uploader"
                :show-file-list="false"
                :before-upload="handleLastFrameUpload"
                :accept="'image/*'"
                drag
              >
                <div v-if="lastFramePreview" class="image-preview">
                  <img :src="lastFramePreview" alt="尾帧预览" />
                  <div class="image-overlay">
                    <el-icon><Edit /></el-icon>
                    <span>重新选择</span>
                  </div>
                </div>
                <div v-else class="upload-placeholder">
                  <el-icon class="upload-icon"><Plus /></el-icon>
                  <div class="upload-text">点击或拖拽上传尾帧图片</div>
                  <div class="upload-hint">支持 JPG、PNG 格式，最大 10MB</div>
                </div>
              </el-upload>
            </div>
          </div>
        </div>
      </div>

      <!-- 参数配置 -->
      <div class="params-section">
        <label class="section-label">视频参数</label>
        <div class="params-grid">
          <div class="param-item">
            <label>视频时长（秒）</label>
            <el-select v-model="duration" placeholder="选择时长" class="param-select">
              <el-option label="5秒" :value="5" />
              <el-option label="10秒" :value="10" />
            </el-select>
          </div>
          
          <div class="param-item">
            <label>分辨率</label>
            <el-select v-model="resolution" placeholder="选择分辨率" class="param-select">
              <el-option label="480p" value="480p" />
              <el-option label="720p" value="720p" />
              <el-option label="1080p" value="1080p" />
            </el-select>
          </div>

          <div class="param-item">
            <label>宽高比</label>
            <el-select v-model="ratio" placeholder="选择宽高比" class="param-select">
              <el-option label="21:9" value="21:9" />
              <el-option label="16:9" value="16:9" />
              <el-option label="4:3" value="4:3" />
              <el-option label="1:1" value="1:1" />
              <el-option label="3:4" value="3:4" />
              <el-option label="9:16" value="9:16" />
              <el-option label="9:21" value="9:21" />
              <el-option label="保持原图比例" value="keep_ratio" />
              <el-option label="自适应" value="adaptive" />
            </el-select>
          </div>

          <div class="param-item">
            <label>随机种子（可选）</label>
            <el-input-number
              v-model="seed"
              :min="0"
              :max="2147483647"
              placeholder="留空则随机生成"
              class="param-input"
            />
          </div>
        </div>
        
        <!-- 高级选项 -->
        <div class="advanced-options">
          <h4>高级选项</h4>
          <div class="options-grid">
            <div class="option-item">
              <el-checkbox v-model="watermark">添加水印</el-checkbox>
              <span class="option-desc">在视频右下角添加"由人工智能生成"水印</span>
            </div>
            <div class="option-item">
              <el-checkbox v-model="camerafixed">固定摄像头</el-checkbox>
              <span class="option-desc">固定摄像头视角，减少镜头运动</span>
            </div>
            <div class="option-item">
              <el-checkbox v-model="returnLastFrame">返回尾帧图像</el-checkbox>
              <span class="option-desc">生成完成后返回视频的最后一帧图像</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 生成按钮 -->
      <div class="generate-section">
        <el-button
          type="primary"
          size="large"
          :loading="isGenerating"
          :disabled="!canGenerate"
          @click="handleGenerate"
          class="generate-btn"
        >
          <el-icon v-if="!isGenerating"><VideoPlay /></el-icon>
          {{ isGenerating ? '生成中...' : '开始生成视频' }}
        </el-button>
      </div>
    </div>

    <!-- 结果区域 -->
    <div class="video-result-panel">
      <div class="result-header">
        <h2>生成结果</h2>
        <div class="header-actions">
          <el-button 
            v-if="generatedVideos.length > 0" 
            type="success" 
            @click="downloadAllVideos" 
            :icon="Download" 
            size="small"
          >
            下载全部视频
          </el-button>
        </div>
      </div>
      
      <div class="result-content">
        <!-- 空状态 -->
        <div v-if="generatedVideos.length === 0 && !isGenerating && generationTasks.length === 0" class="empty-result">
          <div class="empty-state">
            <div class="empty-icon-container">
              <el-icon class="empty-icon"><VideoPlay /></el-icon>
              <div class="empty-decoration">
                <div class="decoration-circle circle-1"></div>
                <div class="decoration-circle circle-2"></div>
                <div class="decoration-circle circle-3"></div>
              </div>
            </div>
            <h3 class="empty-title">等待生成</h3>
            <p class="empty-description">请在左侧输入提示词并上传图片开始生成视频</p>
          </div>
        </div>
        
        <!-- 生成中状态 -->
        <div v-else-if="isGenerating || (generationTasks.length > 0 && generatedVideos.length === 0)" class="generating-result">
          <div v-for="task in generationTasks" :key="task.id" class="generating-card">
            <div class="generating-header">
              <div class="generating-info">
                <h4>正在生成视频...</h4>
                <p>任务ID: {{ task.id }}</p>
              </div>
              <div class="generating-progress">
                <el-progress 
                  :percentage="task.progress || 0" 
                  :status="task.status === 'failed' ? 'exception' : 'success'"
                  :stroke-width="6"
                />
              </div>
            </div>
            <div class="generating-details">
              <div class="detail-item">
                <span class="detail-label">模型:</span>
                <span class="detail-value">{{ task.modelName || '未知' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">状态:</span>
                <span class="detail-value status-{{ task.status }}">{{ getStatusText(task.status) }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 生成结果 -->
        <div v-else class="video-results">
          <div 
            v-for="video in generatedVideos" 
            :key="video.id" 
            class="video-result-card"
          >
            <div class="video-container">
              <video 
                :src="video.url" 
                :poster="video.thumbnail"
                controls 
                class="result-video"
                @loadstart="handleVideoLoadStart"
                @loadeddata="handleVideoLoaded"
                @error="handleVideoError"
              >
                您的浏览器不支持视频播放
              </video>
              <div v-if="video.loading" class="video-loading-overlay">
                <el-icon class="loading-icon"><Loading /></el-icon>
                <span>加载中...</span>
              </div>
            </div>
            
            <div class="video-info">
              <div class="video-meta">
                <div class="meta-item">
                  <span class="meta-label">模型:</span>
                  <span class="meta-value">{{ video.modelName }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">时长:</span>
                  <span class="meta-value">{{ video.duration }}秒</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">分辨率:</span>
                  <span class="meta-value">{{ video.resolution }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">生成时间:</span>
                  <span class="meta-value">{{ formatTime(video.createdAt) }}</span>
                </div>
              </div>
              
              <div class="video-actions">
                <el-button 
                  type="primary" 
                  size="small" 
                  :icon="Download" 
                  @click="downloadVideo(video)"
                  :loading="video.downloading"
                >
                  下载视频
                </el-button>
                <el-button 
                  type="success" 
                  size="small" 
                  :icon="View" 
                  @click="previewVideo(video)"
                >
                  预览
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Edit, VideoPlay, Download, View, Loading } from '@element-plus/icons-vue'
import { generateVideo, getVideoResult, getVideoModels } from '../api/videoApi'

// 定义事件
const emit = defineEmits(['video-generated', 'task-updated'])

// 响应式数据
const prompt = ref('')
const selectedModelId = ref('doubao-seedance-1-0-lite-i2v-250428')
const firstFrameFile = ref(null)
const firstFramePreview = ref('')
const lastFrameFile = ref(null)
const lastFramePreview = ref('')
const duration = ref(5)
const resolution = ref('720p')
const ratio = ref('16:9')
const watermark = ref(false)
const camerafixed = ref(false)
const returnLastFrame = ref(false)
const seed = ref(null)
const isGenerating = ref(false)
const generationTasks = ref([])
const generatedVideos = ref([])

// 轮询控制器 - 用于在组件卸载时取消轮询
const pollingController = ref({ cancelled: false })

// 支持的模型
const supportedModels = ref([])

// 初始化模型列表
const initModels = async () => {
  try {
    const response = await getVideoModels()
    if (response.success) {
      supportedModels.value = response.models
    } else {
      // 如果API失败，使用默认模型
      supportedModels.value = [
        {
          id: 'doubao-seedance-1-0-lite-i2v-250428',
          name: '首尾帧视频模型',
          description: '首帧或首尾帧图生视频',
          provider: '火山豆包',
          maxDuration: 10,
          is_default: true
        }
      ]
    }
  } catch (error) {
    console.error('获取模型列表失败:', error)
    // 使用默认模型
    supportedModels.value = [
      {
        id: 'doubao-seedance-1-0-lite-i2v-250428',
        name: '首尾帧视频模型',
        description: '首帧或首尾帧图生视频',
        provider: '火山豆包',
        maxDuration: 10,
        is_default: true
      }
    ]
  }
}

// 当前选中的模型
const currentModel = computed(() => {
  return supportedModels.value.find(model => model.id === selectedModelId.value)
})

// 是否可以生成
const canGenerate = computed(() => {
  return prompt.value.trim() && firstFrameFile.value && !isGenerating.value
})

// 监听模型变化，更新默认参数
watch(selectedModelId, (newModelId) => {
  const model = supportedModels.find(m => m.id === newModelId)
  if (model) {
    // 根据模型类型设置默认参数
    if (model.id === 'doubao-seedance-1-0-lite-i2v-250428') {
      // 首尾帧视频模型
      duration.value = 10
      resolution.value = '720p'
      ratio.value = '16:9'
    } else if (model.id === 'doubao-seedance-1-0-pro-250528') {
      // 文生视频模型
      duration.value = 5
      resolution.value = '720p'
      ratio.value = '16:9'
    }
  }
})

// 处理首帧图片上传
const handleFirstFrameUpload = (file) => {
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请上传图片文件')
    return false
  }

  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过10MB')
    return false
  }

  firstFrameFile.value = file
  // 释放之前的 Object URL 防止内存泄漏
  if (firstFramePreview.value && firstFramePreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(firstFramePreview.value)
  }
  // 使用 Object URL 代替 Base64，大幅减少内存占用
  firstFramePreview.value = URL.createObjectURL(file)
  return false
}

// 处理尾帧图片上传
const handleLastFrameUpload = (file) => {
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请上传图片文件')
    return false
  }

  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过10MB')
    return false
  }

  lastFrameFile.value = file
  // 释放之前的 Object URL 防止内存泄漏
  if (lastFramePreview.value && lastFramePreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(lastFramePreview.value)
  }
  // 使用 Object URL 代替 Base64，大幅减少内存占用
  lastFramePreview.value = URL.createObjectURL(file)
  return false
}

// 生成视频
const handleGenerate = async () => {
  if (!canGenerate.value) return
  
  isGenerating.value = true
  
  try {
    // 创建任务
    const task = {
      id: `video_${Date.now()}`,
      status: 'pending',
      progress: 0
    }
    
    // 发射任务创建事件
    emit('task-updated', task)
    
    // 准备参数
    const params = {
      prompt: prompt.value.trim(),
      modelId: selectedModelId.value,
      duration: duration.value,
      resolution: resolution.value,
      ratio: ratio.value,
      watermark: watermark.value,
      camerafixed: camerafixed.value,
      returnLastFrame: returnLastFrame.value,
      seed: seed.value,
      firstFrame: firstFrameFile.value,
      lastFrame: lastFrameFile.value
    }
    
    // 提交生成任务
    const result = await generateVideo(params)
    
    if (result.taskId) {
      task.status = 'processing'
      // 发射任务更新事件
      emit('task-updated', task)
      
      // 轮询查询结果
      await pollVideoResult(result.taskId)
    } else {
      throw new Error('任务提交失败')
    }
    
  } catch (error) {
    console.error('生成视频失败:', error)
    ElMessage.error('生成视频失败: ' + error.message)
    
    // 发射任务失败事件
    const failedTask = {
      id: `video_${Date.now()}`,
      status: 'failed',
      error: error.message
    }
    emit('task-updated', failedTask)
  } finally {
    isGenerating.value = false
  }
}

// 轮询查询视频生成结果
const pollVideoResult = async (taskId) => {
  const maxAttempts = 60 // 最多轮询60次
  const interval = 5000 // 每5秒查询一次

  for (let i = 0; i < maxAttempts; i++) {
    // 检查轮询是否被取消
    if (pollingController.value.cancelled) {
      console.log('[VideoGenerator] 轮询已取消')
      return
    }

    try {
      const result = await getVideoResult(taskId)
      console.log(`查询视频生成结果 (${i + 1}/${maxAttempts}):`, result)
      
      if (result.status === 'completed') {
        // 生成完成
        const video = {
          url: result.result.url,
          thumbnail: result.result.thumbnail,
          duration: result.result.duration,
          width: result.result.width,
          height: result.result.height,
          fps: result.result.fps,
          taskId: result.taskId,
          createdAt: result.result.createdAt
        }
        
        // 发射视频生成完成事件
        emit('video-generated', video)
        
        // 发射任务完成事件
        const completedTask = {
          id: taskId,
          status: 'completed',
          video: video
        }
        emit('task-updated', completedTask)
        
        ElMessage.success('视频生成完成！')
        break
      } else if (result.status === 'failed') {
        // 生成失败
        const failedTask = {
          id: taskId,
          status: 'failed',
          error: result.error || '未知错误'
        }
        emit('task-updated', failedTask)
        ElMessage.error('视频生成失败: ' + (result.error || '未知错误'))
        break
      } else if (result.status === 'processing') {
        // 仍在处理中
        const processingTask = {
          id: taskId,
          status: 'processing'
        }
        emit('task-updated', processingTask)
        await new Promise(resolve => setTimeout(resolve, interval))
        continue
      }
    } catch (error) {
      console.error(`查询视频生成结果失败 (${i + 1}/${maxAttempts}):`, error)
      if (i === maxAttempts - 1) {
        const failedTask = {
          id: taskId,
          status: 'failed',
          error: '查询超时'
        }
        emit('task-updated', failedTask)
        ElMessage.error('查询视频生成结果超时')
      } else {
        await new Promise(resolve => setTimeout(resolve, interval))
      }
    }
  }
}

// 视频相关方法
const handleVideoLoadStart = (video) => {
  video.target.loading = true
}

const handleVideoLoaded = (video) => {
  video.target.loading = false
}

const handleVideoError = (video) => {
  video.target.loading = false
  ElMessage.error('视频加载失败')
}

const downloadVideo = async (video) => {
  try {
    video.downloading = true
    const response = await fetch(video.url)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `video_${video.id}.mp4`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    ElMessage.success('视频下载成功')
  } catch (error) {
    console.error('下载视频失败:', error)
    ElMessage.error('下载视频失败')
  } finally {
    video.downloading = false
  }
}

const downloadAllVideos = async () => {
  for (const video of generatedVideos.value) {
    await downloadVideo(video)
    await new Promise(resolve => setTimeout(resolve, 500)) // 避免同时下载多个文件
  }
}

const previewVideo = (video) => {
  window.open(video.url, '_blank')
}

const getStatusText = (status) => {
  const statusMap = {
    'pending': '等待中',
    'processing': '处理中',
    'completed': '已完成',
    'failed': '失败'
  }
  return statusMap[status] || '未知'
}

const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

// 组件挂载时初始化模型
onMounted(() => {
  initModels()
})

// 组件卸载时清理资源
onUnmounted(() => {
  // 取消所有进行中的轮询
  pollingController.value.cancelled = true
  console.log('[VideoGenerator] 已取消轮询任务')

  // 释放图片预览的 Object URL 防止内存泄漏
  if (firstFramePreview.value && firstFramePreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(firstFramePreview.value)
    console.log('[VideoGenerator] 已释放首帧图片 Object URL')
  }
  if (lastFramePreview.value && lastFramePreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(lastFramePreview.value)
    console.log('[VideoGenerator] 已释放尾帧图片 Object URL')
  }

  // 清理引用
  firstFrameFile.value = null
  lastFrameFile.value = null
  firstFramePreview.value = ''
  lastFramePreview.value = ''
  generatedVideos.value = []
  generationTasks.value = []
})

</script>

<style scoped>
.video-generator {
  display: flex;
  height: 100%;
  gap: 16px;
  padding: 20px;
}

.video-control-panel {
  width: 450px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
  overflow-y: auto;
  flex-shrink: 0;
}

.video-result-panel {
  flex: 1;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.generator-header {
  text-align: center;
  margin-bottom: 30px;
}

.generator-header h2 {
  margin: 0 0 10px 0;
  color: #303133;
  font-size: 28px;
  font-weight: 600;
}

.header-description {
  margin: 0;
  color: #606266;
  font-size: 16px;
}

.generator-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-label {
  display: block;
  margin-bottom: 8px;
  color: #303133;
  font-weight: 600;
  font-size: 14px;
}

.prompt-section .prompt-input {
  width: 100%;
}

.model-section .model-select {
  width: 100%;
}

.model-option {
  padding: 8px 0;
}

.model-name {
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.model-description {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.upload-section {
  width: 100%;
}

.upload-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.upload-item {
  display: flex;
  flex-direction: column;
}

.upload-label {
  margin-bottom: 8px;
  color: #303133;
  font-weight: 600;
  font-size: 14px;
}

.image-uploader {
  width: 100%;
}

.image-preview {
  position: relative;
  width: 100%;
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px dashed #d9d9d9;
}

.image-preview img {
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
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0;
  transition: opacity 0.3s;
}

.image-preview:hover .image-overlay {
  opacity: 1;
}

.upload-placeholder {
  width: 100%;
  height: 200px;
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
  transition: border-color 0.3s;
}

.upload-placeholder:hover {
  border-color: #409eff;
}

.upload-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.upload-text {
  font-size: 14px;
  margin-bottom: 4px;
}

.upload-hint {
  font-size: 12px;
  color: #c0c4cc;
}

.params-section {
  width: 100%;
}

.params-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.advanced-options {
  margin-top: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.advanced-options h4 {
  margin: 0 0 15px 0;
  color: #495057;
  font-size: 16px;
  font-weight: 600;
}

.options-grid {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.option-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.option-item .el-checkbox {
  margin-top: 2px;
}

.option-desc {
  color: #6c757d;
  font-size: 14px;
  line-height: 1.4;
  flex: 1;
}

.param-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.param-item label {
  color: #303133;
  font-weight: 600;
  font-size: 14px;
}

.param-slider {
  width: 100%;
}

.param-select,
.param-input {
  width: 100%;
}

.generate-section {
  text-align: center;
  margin: 20px 0;
}

.generate-btn {
  padding: 12px 32px;
  font-size: 16px;
  font-weight: 600;
}

/* 结果区域样式 */
.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: #fafbfc;
}

.result-header h2 {
  margin: 0;
  color: #303133;
  font-size: 20px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.result-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* 空状态 */
.empty-result {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
}

.empty-state {
  text-align: center;
  color: #909399;
}

.empty-icon-container {
  position: relative;
  margin-bottom: 20px;
}

.empty-icon {
  font-size: 64px;
  color: #c0c4cc;
}

.empty-decoration {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.decoration-circle {
  position: absolute;
  border-radius: 50%;
  border: 2px solid #e4e7ed;
  animation: float 3s ease-in-out infinite;
}

.circle-1 {
  width: 80px;
  height: 80px;
  top: -40px;
  left: -40px;
  animation-delay: 0s;
}

.circle-2 {
  width: 60px;
  height: 60px;
  top: -30px;
  left: -30px;
  animation-delay: 1s;
}

.circle-3 {
  width: 40px;
  height: 40px;
  top: -20px;
  left: -20px;
  animation-delay: 2s;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.empty-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #606266;
}

.empty-description {
  margin: 0;
  font-size: 14px;
  color: #909399;
}

/* 生成中状态 */
.generating-result {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.generating-card {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
}

.generating-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.generating-info h4 {
  margin: 0 0 4px 0;
  color: #303133;
  font-size: 16px;
}

.generating-info p {
  margin: 0;
  color: #606266;
  font-size: 12px;
}

.generating-progress {
  width: 200px;
}

.generating-details {
  display: flex;
  gap: 20px;
}

.detail-item {
  display: flex;
  gap: 8px;
}

.detail-label {
  color: #909399;
  font-size: 12px;
}

.detail-value {
  color: #303133;
  font-size: 12px;
  font-weight: 500;
}

.status-pending { color: #909399; }
.status-processing { color: #409eff; }
.status-completed { color: #67c23a; }
.status-failed { color: #f56c6c; }

/* 视频结果 */
.video-results {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.video-result-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.video-container {
  position: relative;
  background: #000;
}

.result-video {
  width: 100%;
  height: auto;
  max-height: 400px;
  object-fit: contain;
}

.video-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
}

.loading-icon {
  font-size: 24px;
  margin-bottom: 8px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.video-info {
  padding: 16px;
}

.video-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-label {
  font-size: 12px;
  color: #909399;
  font-weight: 500;
}

.meta-value {
  font-size: 14px;
  color: #303133;
  font-weight: 600;
}

.video-actions {
  display: flex;
  gap: 12px;
}

.video-actions .el-button {
  flex: 1;
}

@media (max-width: 768px) {
  .upload-grid {
    grid-template-columns: 1fr;
  }
  
  .params-grid {
    grid-template-columns: 1fr;
  }
  
  .videos-grid {
    grid-template-columns: 1fr;
  }
}
</style>
